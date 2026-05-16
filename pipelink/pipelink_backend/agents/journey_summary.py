from google import genai
from google.genai import types
import os
from firebase_client import get_user, get_engagements, get_relationships

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def generate_journey(uid: str) -> str:
    profile = get_user(uid)
    engagements = get_engagements(uid)
    relationships = get_relationships(uid)

    engagement_str = "\n".join([
        f"- {e.get('event_name')} as {e.get('role')} ({e.get('check_in_at', '')[:10]})"
        for e in engagements
    ])
    rel_str = "\n".join([
        f"- {r.get('type')} relationship (status: {r.get('status')})"
        for r in relationships
    ])
    personas_str = ", ".join(profile.get("active_personas", []))

    prompt = f"""Write a 2-3 paragraph professional narrative summary of this person's startup ecosystem journey.
Use only the data below. Mention persona evolution, events, skills growth, and relationships. Be warm but factual.

Name: {profile.get('name')}
Active personas: {personas_str}
Bio: {profile.get('bio')}
Skills: {", ".join(profile.get('skills', []))}
Events attended:
{engagement_str or "None recorded yet"}
Relationships:
{rel_str or "None recorded yet"}"""

    response = client.models.generate_content(
        model="gemini-2.5-flash-lite",
        contents=prompt,
        config=types.GenerateContentConfig(temperature=0.5)
    )
    return response.text.strip()
