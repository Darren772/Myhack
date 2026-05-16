"""
Form Sync Agent
Processes Google Form webhook submissions. Extracts name, email, LinkedIn URL,
tags as 'participant' or 'sponsor' based on which form the submission came from,
and writes to the event_registrations collection.
"""
from google import genai
from google.genai import types
import json, os, re
from firebase_client import (
    get_user_by_email, update_user, create_engagement,
    create_event_registration, db
)
from datetime import datetime, timezone

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


def _extract_linkedin(fields: dict) -> str:
    """Try to find a LinkedIn URL in any form field value."""
    for v in fields.values():
        if isinstance(v, str) and "linkedin.com" in v.lower():
            return v.strip()
    return ""


def _detect_form_type(form_id: str) -> str:
    """
    Detect whether this submission is for a participant or sponsor form
    by checking the form_id against known event form URLs in Firestore.
    Returns 'participant' or 'sponsor'.
    """
    try:
        # Search hosted_events for an event that has this form_id
        docs = db.collection("hosted_events").stream()
        for doc in docs:
            data = doc.to_dict()
            pfurl = data.get("participant_form_url", "")
            sfurl = data.get("sponsor_form_url", "") or data.get("investor_form_url", "")
            if form_id and (form_id in pfurl or form_id in pfurl.split("/")[-1]):
                return "participant", doc.id
            if form_id and (form_id in sfurl or form_id in sfurl.split("/")[-1]):
                return "sponsor", doc.id
    except Exception:
        pass
    return "participant", None


def sync_form(user_email: str, event_name: str, form_id: str, fields: dict) -> dict:
    prompt = f"""Extract these fields from a Google Form submission.
Fields: {json.dumps(fields)}
Return ONLY valid JSON with: name, bio, skills (array), linkedin_url (string or empty)
No markdown, no explanation."""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=prompt,
            config=types.GenerateContentConfig(temperature=0.1)
        )
        raw = response.text.strip()
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
        mapped = json.loads(raw.strip())
    except Exception:
        mapped = {}

    # Extract LinkedIn URL from fields directly as fallback
    linkedin_url = mapped.get("linkedin_url") or _extract_linkedin(fields)
    name = mapped.get("name", fields.get("name", fields.get("Name", "")))

    # Detect form type and event_id
    form_type, event_id = _detect_form_type(form_id)

    # Store in event_registrations (always, even if user not in system)
    reg_data = {
        "event_id": event_id or event_name,
        "event_name": event_name,
        "form_id": form_id,
        "form_type": form_type,  # "participant" or "sponsor"
        "name": name,
        "email": user_email,
        "linkedin_url": linkedin_url,
        "registered_at": datetime.now(timezone.utc).isoformat(),
        "sponsor_badge_assigned": False,
    }
    create_event_registration(reg_data)

    # If user exists in PipeLink, merge profile + create engagement
    user = get_user_by_email(user_email)
    if user:
        uid = user["uid"]
        profile_update = {k: v for k, v in mapped.items() if k in ["name", "bio", "skills"]}
        if linkedin_url:
            profile_update["linkedin_url"] = linkedin_url
        if profile_update:
            update_user(uid, profile_update)

        create_engagement({
            "user_id": uid,
            "event_id": event_id or event_name,
            "event_name": event_name,
            "role": form_type,
            "check_in_at": datetime.now(timezone.utc).isoformat(),
            "outcomes": "",
            "source_form_id": form_id
        })
        return {"success": True, "uid": uid, "form_type": form_type, "merged": profile_update}

    return {"success": True, "uid": None, "form_type": form_type, "note": "User not yet in PipeLink — registration recorded"}
