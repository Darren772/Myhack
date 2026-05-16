from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

from models.schemas import (
    ParseLinkedInRequest, ParseLinkedInResponse,
    FormSyncRequest,
    EmbedProfileRequest,
    MatchRequest, MatchResponse, MatchResult,
    JourneyRequest, JourneyResponse
)
from agents.profile_parser import parse_linkedin
from agents.form_sync import sync_form
from agents.embedder import embed_profile
from agents.matcher import match_founders
from agents.recommender import explain_match
from agents.journey_summary import generate_journey
from firebase_client import get_engagements

app = FastAPI(title="PipeLink Agent API")

# ── CORS (allow frontend) ────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET", "pipelink-webhook-secret")

@app.post("/parse-linkedin", response_model=ParseLinkedInResponse)
async def parse_linkedin_route(req: ParseLinkedInRequest):
    try:
        result = parse_linkedin(req.text)
        return ParseLinkedInResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Parse failed: {str(e)}")

@app.post("/form-sync")
async def form_sync_route(req: FormSyncRequest, x_webhook_secret: str = Header(None)):
    if x_webhook_secret != WEBHOOK_SECRET:
        raise HTTPException(status_code=401, detail="Invalid webhook secret")
    result = sync_form(req.user_email, req.event_name, req.form_id, req.fields)
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result.get("error"))
    # Re-embed after profile update
    embed_profile(result["uid"])
    return result

@app.post("/embed-profile")
async def embed_profile_route(req: EmbedProfileRequest):
    embedding = embed_profile(req.uid)
    return {"uid": req.uid, "embedding_length": len(embedding)}

@app.post("/match", response_model=MatchResponse)
async def match_route(req: MatchRequest):
    matches = match_founders(req.query, top_n=5)
    results = []
    for m in matches:
        profile = m["profile"]
        explanation = explain_match(req.query, profile, m["score"])
        engagements = get_engagements(profile["uid"])
        results.append(MatchResult(
            uid=profile["uid"],
            name=profile.get("name", ""),
            match_score=round(m["score"] * 100, 1),
            explanation=explanation,
            skills=profile.get("skills", []),
            engagement_count=len(engagements)
        ))
    return MatchResponse(results=results)

@app.post("/journey", response_model=JourneyResponse)
async def journey_route(req: JourneyRequest):
    summary = generate_journey(req.uid)
    return JourneyResponse(summary=summary)

@app.get("/health")
async def health():
    return {"status": "ok"}
