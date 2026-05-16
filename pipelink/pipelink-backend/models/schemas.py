"""
Pydantic request / response models for every PipeLink API endpoint.
Aligned with existing Firestore collections: users, events, engagements, relationships.
"""

from pydantic import BaseModel, Field
from typing import Optional


# ── Persona enum-like ─────────────────────────────────────────────────
PERSONA_CHOICES = ["founder", "investor", "tech_talent", "mentor"]


# ── Firestore document mirrors ────────────────────────────────────────

class UserProfile(BaseModel):
    """Mirrors the `users` collection in Firestore."""
    uid: str = ""
    name: str = ""
    bio: str = ""
    skills: list[str] = Field(default_factory=list)
    education: list[dict] = Field(default_factory=list)
    experience: list[dict] = Field(default_factory=list)
    active_personas: list[str] = Field(default_factory=list)   # subset of PERSONA_CHOICES
    embedding_vector: list[float] = Field(default_factory=list)


class Event(BaseModel):
    """Mirrors the `events` collection."""
    event_id: str = ""
    name: str = ""
    organiser: str = ""
    type: str = ""
    start_date: Optional[str] = None
    end_date: Optional[str] = None


class Engagement(BaseModel):
    """Mirrors the `engagements` collection."""
    user_id: str = ""
    event_id: str = ""
    role: str = ""
    check_in_at: Optional[str] = None
    outcomes: str = ""
    source_form_id: str = ""


class Relationship(BaseModel):
    """Mirrors the `relationships` collection."""
    rel_id: str = ""
    type: str = ""
    participants: list[str] = Field(default_factory=list)
    start_date: Optional[str] = None
    status: str = ""
    source_event: str = ""
    notes: str = ""


class MatchedProfile(BaseModel):
    """A single investor / mentor match returned by the matcher."""
    uid: str
    name: str
    bio: str = ""
    active_personas: list[str] = Field(default_factory=list)
    similarity_score: float = 0.0
    explanation: str = ""                   # plain-English from the recommender


# ── 1. LinkedIn parse ─────────────────────────────────────────────────
class LinkedInParseRequest(BaseModel):
    raw_text: str = Field(..., description="Raw LinkedIn profile text pasted by the user.")

class LinkedInParseResponse(BaseModel):
    profile: UserProfile


# ── 2. Form sync ──────────────────────────────────────────────────────
class FormSyncPayload(BaseModel):
    """Payload sent from a Google Apps Script on form submit."""
    form_fields: dict = Field(..., description="Arbitrary key-value pairs from the form.")
    event_name: Optional[str] = None
    timestamp: Optional[str] = None

class FormSyncResponse(BaseModel):
    uid: str
    profile: UserProfile


# ── 3. Embed profile ──────────────────────────────────────────────────
class ProfileEmbedRequest(BaseModel):
    uid: str

class ProfileEmbedResponse(BaseModel):
    uid: str
    embedding_dim: int
    stored: bool = True


# ── 4. Investor match ─────────────────────────────────────────────────
class MatchRequest(BaseModel):
    query: str = Field(..., description="Natural-language search query.")
    top_k: int = Field(default=5, ge=1, le=20)

class MatchResponse(BaseModel):
    matches: list[MatchedProfile]


# ── 5. Journey summary ────────────────────────────────────────────────
class JourneySummaryRequest(BaseModel):
    uid: str

class JourneySummaryResponse(BaseModel):
    summary: str
