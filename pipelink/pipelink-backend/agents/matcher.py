"""
Agent 4 — Matcher
Embeds a natural-language query, then performs cosine-similarity search
against stored user embedding_vectors in Firestore.
"""

import os
import google.generativeai as genai
from models.schemas import MatchedProfile
from firebase_client import get_all_founders, db

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

EMBEDDING_MODEL = "models/text-embedding-004"


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    """Compute cosine similarity between two vectors (pure Python, no numpy)."""
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = sum(x * x for x in a) ** 0.5
    norm_b = sum(x * x for x in b) ** 0.5
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def _get_all_users_with_embeddings() -> list[dict]:
    """Return all users that have a non-empty embedding_vector."""
    docs = db.collection("users").stream()
    results = []
    for d in docs:
        data = {"uid": d.id, **d.to_dict()}
        if data.get("embedding_vector"):
            results.append(data)
    return results


async def match_investors(query: str, top_k: int = 5) -> list[MatchedProfile]:
    """Embed the query and rank all stored users by cosine similarity."""
    # 1. Embed the query
    result = genai.embed_content(model=EMBEDDING_MODEL, content=query)
    query_vec = result["embedding"]

    # 2. Fetch all users with embeddings
    users = _get_all_users_with_embeddings()

    # 3. Score & rank
    scored: list[tuple[float, dict]] = []
    for u in users:
        vec = u.get("embedding_vector")
        if not vec:
            continue
        sim = _cosine_similarity(query_vec, vec)
        scored.append((sim, u))

    scored.sort(key=lambda x: x[0], reverse=True)

    # 4. Build response (no explanations yet — the recommender adds those)
    matches = []
    for score, u in scored[:top_k]:
        matches.append(
            MatchedProfile(
                uid=u.get("uid", ""),
                name=u.get("name", ""),
                bio=u.get("bio", ""),
                active_personas=u.get("active_personas", []),
                similarity_score=round(score, 4),
                explanation="",
            )
        )
    return matches
