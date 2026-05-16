"""
Agent 2 — Form Sync
Receives arbitrary key-value pairs from a Google Form (via Apps Script webhook)
and uses Gemini to map them to our canonical user profile schema.
"""

import os
import json
import google.generativeai as genai
from models.schemas import FormSyncPayload, FormSyncResponse, UserProfile
from firebase_client import update_user, get_user_by_email

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

SYSTEM_PROMPT = """\
You are a data-mapping assistant. You receive a dictionary of form field answers
submitted at a startup/tech event. Map them to this schema:

{
  "name": "",
  "bio": "",
  "skills": [],
  "experience": [{"title": "", "company": "", "duration": ""}],
  "education": [{"school": "", "degree": "", "field": ""}],
  "active_personas": ["founder | investor | tech_talent | mentor"]
}

Rules:
- active_personas is a list. Choose from: founder, investor, tech_talent, mentor.
- If a field cannot be inferred, leave it empty.
- Return ONLY valid JSON.
"""


async def sync_form_to_profile(payload: FormSyncPayload) -> FormSyncResponse:
    """Map form fields to user schema using Gemini, then upsert to Firestore."""
    model = genai.GenerativeModel(
        "gemini-2.0-flash",
        generation_config={"response_mime_type": "application/json"},
    )
    prompt = f"Form fields:\n{json.dumps(payload.form_fields, indent=2)}"
    if payload.event_name:
        prompt += f"\nEvent: {payload.event_name}"

    response = model.generate_content([SYSTEM_PROMPT, prompt])
    data = json.loads(response.text)
    profile = UserProfile(**data)

    # Check if user already exists by email (if provided in form)
    email = payload.form_fields.get("email") or payload.form_fields.get("Email")
    existing = get_user_by_email(email) if email else None
    uid = existing["uid"] if existing else None

    # Persist to Firestore
    profile_data = profile.model_dump(exclude={"embedding_vector"})
    if uid:
        profile_data["uid"] = uid
    update_user(uid or profile_data.get("uid", ""), profile_data)
    uid = uid or profile_data.get("uid", "")

    return FormSyncResponse(uid=uid, profile=profile)
