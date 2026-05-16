from google import genai
from google.genai import types
import os
from firebase_client import get_user, update_user

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def embed_profile(uid: str) -> list[float]:
    profile = get_user(uid)
    if not profile:
        raise ValueError(f"User {uid} not found")

    # Build text summary for embedding
    skills_str = ", ".join(profile.get("skills", []))
    experience_str = " | ".join([str(e) for e in profile.get("experience", [])])
    text = f"{profile.get('name', '')}. {profile.get('bio', '')}. Skills: {skills_str}. Experience: {experience_str}"

    result = client.models.embed_content(
        model="gemini-embedding-001",
        contents=text,
    )
    embedding = result.embeddings[0].values

    # Save back to Firestore
    update_user(uid, {"embedding_vector": embedding})
    return embedding

def embed_query(query: str) -> list[float]:
    result = client.models.embed_content(
        model="gemini-embedding-001",
        contents=query,
    )
    return result.embeddings[0].values
