import google.generativeai as genai
import json, os
from firebase_client import get_user_by_email, update_user, create_engagement
from datetime import datetime, timezone

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-3.1-flash-lite")

def sync_form(user_email: str, event_name: str, form_id: str, fields: dict) -> dict:
    prompt = f"""Map these Google Form fields to this profile schema.
Target schema keys: name, bio, skills (array), role (string: participant/mentor/speaker)
Form fields: {json.dumps(fields)}
Return ONLY valid JSON with matching keys. Ignore unmappable fields.
No markdown, no explanation."""

    response = model.generate_content(
        prompt,
        generation_config=genai.GenerationConfig(temperature=0.1)
    )
    raw = response.text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    mapped = json.loads(raw.strip())

    # Find user and merge profile update
    user = get_user_by_email(user_email)
    if not user:
        return {"success": False, "error": "User not found"}

    uid = user["uid"]
    profile_update = {k: v for k, v in mapped.items() if k in ["name", "bio", "skills"]}
    if profile_update:
        update_user(uid, profile_update)

    # Create engagement doc
    create_engagement({
        "user_id": uid,
        "event_id": event_name,  # ideally resolve to event doc ID
        "role": mapped.get("role", "participant"),
        "check_in_at": datetime.now(timezone.utc).isoformat(),
        "outcomes": "",
        "source_form_id": form_id
    })

    return {"success": True, "uid": uid, "merged": profile_update}
