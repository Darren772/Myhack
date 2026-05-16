from google import genai
from google.genai import types
import json, os

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def parse_linkedin(text: str) -> dict:
    prompt = f"""You are a profile parser. Extract structured data from this LinkedIn profile text.
Return ONLY valid JSON with these exact keys: name, bio, skills, education, experience.
- skills: array of skill strings (e.g. ["Python", "React", "Machine Learning"])
- education: array of strings (e.g. ["BSc Computer Science, Universiti Malaya, 2022"])
- experience: array of strings (e.g. ["Software Engineer at Grab, 2022-2024"])
No markdown, no explanation, no code blocks. Pure JSON only.

LinkedIn text:
{text}"""

    response = client.models.generate_content(
        model="gemini-2.5-flash-lite",
        contents=prompt,
        config=types.GenerateContentConfig(temperature=0.1)
    )

    raw = response.text.strip()
    # Strip markdown code blocks if model ignores instructions
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw.strip())
