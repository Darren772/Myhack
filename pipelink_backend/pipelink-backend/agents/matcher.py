import numpy as np
from firebase_client import get_all_founders
from agents.embedder import embed_query

def cosine_similarity(a: list[float], b: list[float]) -> float:
    a, b = np.array(a), np.array(b)
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-10))

def match_founders(query: str, top_n: int = 5) -> list[dict]:
    query_embedding = embed_query(query)
    founders = get_all_founders()

    scored = []
    for founder in founders:
        ev = founder.get("embedding_vector")
        if not ev:
            continue
        score = cosine_similarity(query_embedding, ev)
        scored.append({"profile": founder, "score": score})

    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:top_n]

# NOTE: If Firestore vector search (findNearest) is available in your plan,
# replace the above with a native Firestore vector query for better performance.
# For the hackathon demo, cosine similarity in Python is fast enough for 50-100 profiles.
