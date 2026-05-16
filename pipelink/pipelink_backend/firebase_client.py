import firebase_admin
from firebase_admin import credentials, firestore
import os

cred_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")
if not cred_path:
    raise ValueError("FIREBASE_SERVICE_ACCOUNT_PATH environment variable is not set")

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
