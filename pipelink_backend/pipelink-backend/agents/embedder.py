import google.generativeai as genai
import os
from firebase_client import get_user, update_user

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

def embed_profile(uid: str) -> list[float]:
    profile = get_user(uid)
    if not profile:
        raise ValueError(f"User {uid} not found")

    # Build text summary for embedding
    skills_str = ", ".join(profile.get("skills", []))
    experience_str = " | ".join([str(e) for e in profile.get("experience", [])])
    text = f"{profile.get('name', '')}. {profile.get('bio', '')}. Skills: {skills_str}. Experience: {experience_str}"

    result = genai.embed_content(
        model="models/text-embedding-004",
        content=text,
        task_type="RETRIEVAL_DOCUMENT"
    )
    embedding = result["embedding"]

    # Save back to Firestore
    update_user(uid, {"embedding_vector": embedding})
    return embedding

def embed_query(query: str) -> list[float]:
    result = genai.embed_content(
        model="models/text-embedding-004",
        content=query,
        task_type="RETRIEVAL_QUERY"
    )
    return result["embedding"]
