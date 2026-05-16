"""
Agent 5 — Recommender
Takes the top-N matched profiles from the Matcher and asks Gemini
to produce a plain-English explanation of why each is a good fit.
"""

import os
import json
import google.generativeai as genai
from models.schemas import MatchedProfile

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

SYSTEM_PROMPT = """\
You are an ecosystem matchmaking assistant.
Given a user's search query and a list of matched profiles,
write a concise 1–2 sentence explanation for EACH match explaining
why this person is relevant.

Return a JSON array of objects:
[
  {"uid": "...", "explanation": "..."},
  ...
]

Return ONLY valid JSON — no markdown fences.
"""


async def generate_recommendations(
    query: str, matches: list[MatchedProfile]
) -> list[MatchedProfile]:
    """Enrich each MatchedProfile with a Gemini-generated explanation."""
    if not matches:
        return matches

    profiles_summary = []
    for m in matches:
        profiles_summary.append({
            "uid": m.uid,
            "name": m.name,
            "bio": m.bio,
            "active_personas": m.active_personas,
            "similarity_score": m.similarity_score,
        })

    model = genai.GenerativeModel(
        "gemini-2.0-flash",
        generation_config={"response_mime_type": "application/json"},
    )
    prompt = (
        f"Search query: {query}\n\n"
        f"Matched profiles:\n{json.dumps(profiles_summary, indent=2)}"
    )
    response = model.generate_content([SYSTEM_PROMPT, prompt])

    explanations: list[dict] = json.loads(response.text)
    explanation_map = {e["uid"]: e["explanation"] for e in explanations}

    # Merge explanations back into the match objects
    enriched = []
    for m in matches:
        enriched.append(
            m.model_copy(update={"explanation": explanation_map.get(m.uid, "")})
        )
    return enriched
