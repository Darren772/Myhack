import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv
from pathlib import Path
import os

load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")


cred_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")
if not cred_path:
    raise ValueError("FIREBASE_SERVICE_ACCOUNT_PATH environment variable is not set")

# Resolve relative path from backend directory (works whether .env is local or in parent)
if not Path(cred_path).is_absolute():
    cred_path = str(Path(__file__).parent / cred_path)
    if not Path(cred_path).exists():
        # Also try resolving from pipelink root
        cred_path = str(Path(__file__).parent.parent / os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", ""))


cred = credentials.Certificate(cred_path)
firebase_admin.initialize_app(cred)
db = firestore.client()

def get_user(uid: str) -> dict | None:
    doc = db.collection("users").document(uid).get()
    return doc.to_dict() if doc.exists else None

def get_user_by_email(email: str) -> dict | None:
    results = db.collection("users").where("email", "==", email).limit(1).stream()
    for doc in results:
        return {"uid": doc.id, **doc.to_dict()}
    return None

def update_user(uid: str, data: dict):
    db.collection("users").document(uid).set(data, merge=True)

def create_engagement(data: dict):
    db.collection("engagements").add(data)

def get_engagements(uid: str) -> list[dict]:
    docs = db.collection("engagements").where("user_id", "==", uid).stream()
    return [doc.to_dict() for doc in docs]

def get_relationships(uid: str) -> list[dict]:
    docs = db.collection("relationships").where("participants", "array_contains", uid).stream()
    return [doc.to_dict() for doc in docs]

def get_all_founders() -> list[dict]:
    docs = db.collection("users").where("active_personas", "array_contains", "founder").stream()
    return [{"uid": doc.id, **doc.to_dict()} for doc in docs]

def get_all_users_with_embeddings() -> list[dict]:
    """Returns all users that have a stored embedding_vector."""
    docs = db.collection("users").stream()
    return [{"uid": doc.id, **doc.to_dict()} for doc in docs if doc.to_dict().get("embedding_vector")]

# ── Event hosting ─────────────────────────────────────────
def create_event(data: dict) -> str:
    doc_ref = db.collection("hosted_events").document(data["event_id"])
    doc_ref.set(data)
    return data["event_id"]

def get_event(event_id: str) -> dict | None:
    doc = db.collection("hosted_events").document(event_id).get()
    return doc.to_dict() if doc.exists else None

def update_event(event_id: str, data: dict):
    db.collection("hosted_events").document(event_id).set(data, merge=True)

def get_host_events(host_uid: str) -> list[dict]:
    docs = db.collection("hosted_events").where("host_uid", "==", host_uid).stream()
    return [{"event_id": doc.id, **doc.to_dict()} for doc in docs]

# ── Event Registrations (from Google Form submissions) ─────
def create_event_registration(data: dict) -> str:
    """Store a form submission (participant or sponsor) for an event."""
    doc_ref = db.collection("event_registrations").add(data)
    return doc_ref[1].id

def get_event_registrations(event_id: str, form_type: str | None = None) -> list[dict]:
    """Get all registrations for an event, optionally filtered by form_type."""
    q = db.collection("event_registrations").where("event_id", "==", event_id)
    if form_type:
        q = q.where("form_type", "==", form_type)
    docs = q.stream()
    return [{"reg_id": doc.id, **doc.to_dict()} for doc in docs]

def update_registration(reg_id: str, data: dict):
    db.collection("event_registrations").document(reg_id).set(data, merge=True)

# ── Invitations ───────────────────────────────────────────
def create_invitation(data: dict):
    db.collection("invitations").add(data)

def get_invitations_for_event(event_id: str) -> list[dict]:
    docs = db.collection("invitations").where("event_id", "==", event_id).stream()
    return [doc.to_dict() for doc in docs]

def get_invitations_for_user(uid: str) -> list[dict]:
    docs = db.collection("invitations").where("user_uid", "==", uid).stream()
    return [doc.to_dict() for doc in docs]

# ── Event Joins (user clicks Join / Sponsor on feed) ──────
def has_user_joined(uid: str, event_id: str) -> dict | None:
    """Returns the join doc if the user already joined this event, else None."""
    docs = (db.collection("event_joins")
              .where("uid", "==", uid)
              .where("event_id", "==", event_id)
              .limit(1).stream())
    for doc in docs:
        return {"join_id": doc.id, **doc.to_dict()}
    return None

def create_event_join(data: dict) -> str:
    """Record a user joining an event. Returns the new document ID."""
    ref = db.collection("event_joins").add(data)
    return ref[1].id

def get_user_joins(uid: str) -> list[dict]:
    """Get all events a user has joined, sorted newest first."""
    docs = db.collection("event_joins").where("uid", "==", uid).stream()
    results = [{"join_id": doc.id, **doc.to_dict()} for doc in docs]
    results.sort(key=lambda x: x.get("joined_at", ""), reverse=True)
    return results

def get_event_joins(event_id: str) -> list[dict]:
    """Get all PipeLink users who joined a specific event."""
    docs = db.collection("event_joins").where("event_id", "==", event_id).stream()
    results = [{"join_id": doc.id, **doc.to_dict()} for doc in docs]
    results.sort(key=lambda x: x.get("joined_at", ""), reverse=True)
    return results

def get_event_join_count(event_id: str) -> int:
    """Return number of PipeLink users who joined this event."""
    docs = db.collection("event_joins").where("event_id", "==", event_id).stream()
    return sum(1 for _ in docs)

# ── Event Presets ──────────────────────────────────────────
def get_user_presets(host_uid: str) -> list[dict]:
    docs = db.collection("event_presets").where("host_uid", "==", host_uid).stream()
    results = [{"preset_id": doc.id, **doc.to_dict()} for doc in docs]
    results.sort(key=lambda x: x.get("use_count", 0), reverse=True)
    return results

def create_preset(data: dict) -> str:
    ref = db.collection("event_presets").add(data)
    return ref[1].id

def update_preset(preset_id: str, data: dict):
    db.collection("event_presets").document(preset_id).set(data, merge=True)

def delete_preset(preset_id: str):
    db.collection("event_presets").document(preset_id).delete()

def get_preset(preset_id: str) -> dict | None:
    doc = db.collection("event_presets").document(preset_id).get()
    return {"preset_id": doc.id, **doc.to_dict()} if doc.exists else None
