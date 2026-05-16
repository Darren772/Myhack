"""
Agent 3 — Embedder
Takes a user document from Firestore, builds a text representation,
and generates an embedding vector via Gemini's embedding model.
Stores the result in the user's `embedding_vector` field.
"""

import os
import google.generativeai as genai
from models.schemas import ProfileEmbedResponse
from firebase_client import get_user, update_user

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

EMBEDDING_MODEL = "models/text-embedding-004"


def _user_to_text(user: dict) -> str:
    """Flatten a user dict into a single descriptive string for embedding."""
    parts = []
    if user.get("name"):
        parts.append(f"Name: {user['name']}")
    if user.get("active_personas"):
        parts.append(f"Roles: {', '.join(user['active_personas'])}")
    if user.get("bio"):
        parts.append(user["bio"])
    if user.get("skills"):
        parts.append(f"Skills: {', '.join(user['skills'])}")
    for exp in user.get("experience", []):
        parts.append(f"{exp.get('title', '')} at {exp.get('company', '')} ({exp.get('duration', '')})")
    for edu in user.get("education", []):
        parts.append(f"{edu.get('degree', '')} in {edu.get('field', '')} from {edu.get('school', '')}")
    return "\n".join(parts)


async def embed_profile(uid: str) -> ProfileEmbedResponse:
    """Generate and store an embedding vector for the given user."""
    user = get_user(uid)
    if not user:
        raise ValueError(f"User {uid} not found.")

    text = _user_to_text(user)
    result = genai.embed_content(model=EMBEDDING_MODEL, content=text)
    vector = result["embedding"]

    update_user(uid, {"embedding_vector": vector})

    return ProfileEmbedResponse(
        uid=uid,
        embedding_dim=len(vector),
        stored=True,
    )
