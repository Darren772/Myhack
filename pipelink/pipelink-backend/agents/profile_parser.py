"""
Agent 1 — Profile Parser
Accepts raw LinkedIn copy-paste text and uses Gemini to extract structured profile fields.
Output aligns with the `users` Firestore collection schema.
"""

import os
import json
import google.generativeai as genai
from models.schemas import UserProfile, LinkedInParseResponse
from firebase_client import update_user

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

SYSTEM_PROMPT = """\
You are a profile-parsing assistant. Given raw text copied from a LinkedIn profile page,
extract the following structured JSON fields:

{
  "name": "",
  "bio": "",
  "skills": [],
  "experience": [{"title": "", "company": "", "duration": ""}],
  "education": [{"school": "", "degree": "", "field": ""}],
  "active_personas": ["founder | investor | tech_talent | mentor"]
}

Rules:
- active_personas is a list — a person can be more than one (e.g. ["founder", "mentor"]).
  Choose from: founder, investor, tech_talent, mentor.
- bio should be a concise summary of who this person is.
- If a field is missing, leave it as an empty string or empty list.
- Return ONLY valid JSON — no markdown fences, no commentary.
"""


async def parse_linkedin_profile(raw_text: str) -> LinkedInParseResponse:
    """Call Gemini to parse LinkedIn text into structured user profile fields."""
    model = genai.GenerativeModel(
        "gemini-2.0-flash",
        generation_config={"response_mime_type": "application/json"},
    )
    response = model.generate_content(
        [SYSTEM_PROMPT, f"LinkedIn text:\n\n{raw_text}"]
    )

    data = json.loads(response.text)
    profile = UserProfile(**data)
    return LinkedInParseResponse(profile=profile)
