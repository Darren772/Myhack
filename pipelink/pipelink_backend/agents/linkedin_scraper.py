"""
LinkedIn URL Scraper + AI Parser

Strategy:
1. Try direct scraping with browser-like headers
2. Try Google Cache version (webcache.googleusercontent.com)
3. Fallback: use Gemini AI with URL context to generate profile structure
"""
import os, re, requests, json
from bs4 import BeautifulSoup
from google import genai

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
MODEL = "gemini-2.5-flash-lite"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Referer": "https://www.google.com/",
    "DNT": "1",
    "Connection": "keep-alive",
}

def _fetch_text(url: str) -> str:
    """Fetch visible text from a URL. Returns empty string on failure."""
    try:
        r = requests.get(url, headers=HEADERS, timeout=12, allow_redirects=True)
        if r.status_code != 200:
            return ""
        soup = BeautifulSoup(r.text, "lxml")
        for tag in soup(["script", "style", "meta", "link", "noscript", "header", "footer", "nav"]):
            tag.decompose()
        text = soup.get_text(separator=" ", strip=True)
        text = re.sub(r"\s+", " ", text).strip()
        return text[:4000]
    except Exception:
        return ""

def scrape_linkedin(url: str) -> str:
    """Try direct scrape, then Google Cache."""
    # 1. Direct scrape
    text = _fetch_text(url)
    if text and len(text) > 300 and "linkedin" in text.lower():
        return text

    # 2. Google Cache fallback
    cache_url = f"https://webcache.googleusercontent.com/search?q=cache:{url}"
    text = _fetch_text(cache_url)
    if text and len(text) > 300:
        return text

    return ""

def parse_linkedin_url(url: str) -> dict:
    """Scrape LinkedIn URL and parse with Gemini AI."""
    m = re.search(r"linkedin\.com/in/([^/?#]+)", url)
    username = m.group(1) if m else "user"
    display_name = re.sub(r"-\d+$", "", username).replace("-", " ").title()

    raw_text = scrape_linkedin(url)
    scraped = bool(raw_text and len(raw_text) > 300)

    if scraped:
        prompt = f"""Extract professional profile info from this LinkedIn page content.

LinkedIn URL: {url}
Page text: {raw_text}

Return ONLY valid JSON with exactly these fields:
{{
  "name": "Full Name",
  "headline": "Job title or professional headline",
  "location": "City, Country",
  "skills": ["skill1", "skill2"],
  "experience": ["Job Title at Company (Year)", "..."],
  "education": ["Degree, University (Year)"],
  "summary": "1-2 sentence professional bio",
  "scraped": true
}}

If a field cannot be found, use empty string or empty array. Return only the JSON object."""
    else:
        # Use AI to intelligently infer from URL + name only
        prompt = f"""A user submitted this LinkedIn URL to create their profile: {url}
Inferred name from URL: {display_name}

The LinkedIn page could not be fetched (login required). 
Create a minimal but realistic profile structure for the user to review and confirm.

Return ONLY valid JSON:
{{
  "name": "{display_name}",
  "headline": "",
  "location": "",
  "skills": [],
  "experience": [],
  "education": [],
  "summary": "",
  "scraped": false,
  "note": "LinkedIn requires login to view this profile. We captured your name from the URL. Please complete your profile details."
}}

Return only the JSON."""

    try:
        response = client.models.generate_content(
            model=MODEL,
            contents=prompt,
        )
        text = response.text.strip()
        # Strip markdown code fences if present
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.MULTILINE)
        text = re.sub(r"\s*```\s*$", "", text, flags=re.MULTILINE)
        return json.loads(text)
    except json.JSONDecodeError:
        # Try to extract JSON from response
        match = re.search(r"\{[\s\S]+\}", response.text if 'response' in dir() else "")
        if match:
            try:
                return json.loads(match.group())
            except Exception:
                pass
        return {
            "name": display_name,
            "headline": "",
            "skills": [],
            "experience": [],
            "education": [],
            "summary": "",
            "scraped": False,
            "note": "Could not auto-parse profile. Your name was inferred from the URL."
        }
    except Exception as e:
        return {
            "name": display_name,
            "headline": "",
            "skills": [],
            "experience": [],
            "education": [],
            "summary": "",
            "scraped": False,
            "note": f"Profile fetch error: {str(e)[:120]}"
        }
