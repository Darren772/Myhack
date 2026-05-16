"""
Agent 6 — Journey Summary
Reads a user's full profile + engagement history from Firestore
and generates a narrative paragraph summarising their ecosystem journey.
"""

import os
import json
import google.generativeai as genai
from firebase_client import get_user, get_engagements, get_relationships

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

SYSTEM_PROMPT = """\
You are a storytelling assistant for a startup ecosystem platform.
Given a user's profile data, event engagements, and relationships,
write a compelling 3–5 sentence narrative paragraph about their journey
in the ecosystem. Highlight key milestones, growth, and connections made.

Return ONLY the paragraph text — no JSON, no markdown.
"""


async def summarise_journey(uid: str) -> str:
    """Generate a narrative summary of the user's ecosystem journey."""
    user = get_user(uid)
    if not user:
        raise ValueError(f"User {uid} not found.")

    engagements = get_engagements(uid)
    relationships = get_relationships(uid)

    model = genai.GenerativeModel("gemini-2.0-flash")
    prompt = (
        f"Profile:\n{json.dumps(user, indent=2, default=str)}\n\n"
        f"Engagements:\n{json.dumps(engagements, indent=2, default=str)}\n\n"
        f"Relationships:\n{json.dumps(relationships, indent=2, default=str)}"
    )
    response = model.generate_content([SYSTEM_PROMPT, prompt])
    return response.text.strip()
