"""
PipeLink Backend — FastAPI entry point
All API routes are defined here.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from models.schemas import (
    LinkedInParseRequest,
    LinkedInParseResponse,
    FormSyncPayload,
    FormSyncResponse,
    MatchRequest,
    MatchResponse,
    JourneySummaryRequest,
    JourneySummaryResponse,
    ProfileEmbedRequest,
    ProfileEmbedResponse,
)
from agents.profile_parser import parse_linkedin_profile
from agents.form_sync import sync_form_to_profile
from agents.embedder import embed_profile
from agents.matcher import match_investors
from agents.recommender import generate_recommendations
from agents.journey_summary import summarise_journey

app = FastAPI(
    title="PipeLink API",
    description="Backend for PipeLink — AI-powered ecosystem profiling & investor matching.",
    version="0.1.0",
)

# ── CORS (allow the Next.js frontend) ────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health check ──────────────────────────────────────────────────────
@app.get("/")
async def health():
    return {"status": "ok", "service": "pipelink-backend"}


# ── 1. Parse LinkedIn text ────────────────────────────────────────────
@app.post("/api/parse-linkedin", response_model=LinkedInParseResponse)
async def parse_linkedin(body: LinkedInParseRequest):
    """Agent 1 — Accept raw LinkedIn copy-paste text and return structured profile fields."""
    try:
        result = await parse_linkedin_profile(body.raw_text)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── 2. Form sync webhook ─────────────────────────────────────────────
@app.post("/api/form-sync", response_model=FormSyncResponse)
async def form_sync(body: FormSyncPayload):
    """Agent 2 — Receive a Google Form / Apps Script POST and map it to our profile schema."""
    try:
        result = await sync_form_to_profile(body)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── 3. Embed a profile ───────────────────────────────────────────────
@app.post("/api/embed-profile", response_model=ProfileEmbedResponse)
async def embed(body: ProfileEmbedRequest):
    """Agent 3 — Generate an embedding vector for a user and store it."""
    try:
        result = await embed_profile(body.uid)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── 4. Investor match ────────────────────────────────────────────────
@app.post("/api/match", response_model=MatchResponse)
async def match(body: MatchRequest):
    """Agent 4 + 5 — Embed the query, vector-search for matches, then explain them."""
    try:
        matches = await match_investors(body.query, top_k=body.top_k)
        recommendations = await generate_recommendations(body.query, matches)
        return MatchResponse(matches=recommendations)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── 5. Journey summary ───────────────────────────────────────────────
@app.post("/api/journey", response_model=JourneySummaryResponse)
async def journey(body: JourneySummaryRequest):
    """Agent 6 — Generate a narrative paragraph summarising a user's ecosystem journey."""
    try:
        summary = await summarise_journey(body.uid)
        return JourneySummaryResponse(summary=summary)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
