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
    active_personas: list[str] = Field(default_factory=list)
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


# ── 1. Parse LinkedIn ─────────────────────────────────────────────────
class ParseLinkedInRequest(BaseModel):
    text: str = Field(..., description="Raw LinkedIn profile text pasted by the user.")

class ParseLinkedInResponse(BaseModel):
    name: str = ""
    bio: str = ""
    skills: list[str] = Field(default_factory=list)
    education: list[str] = Field(default_factory=list)
    experience: list[str] = Field(default_factory=list)


# ── 2. Form sync ──────────────────────────────────────────────────────
class FormSyncRequest(BaseModel):
    """Payload sent from a Google Apps Script on form submit."""
    user_email: str
    event_name: str
    form_id: str
    fields: dict = Field(..., description="Arbitrary key-value pairs from the form.")


# ── 3. Embed profile ──────────────────────────────────────────────────
class EmbedProfileRequest(BaseModel):
    uid: str


# ── 4. Investor match ─────────────────────────────────────────────────
class MatchRequest(BaseModel):
    query: str = Field(..., description="Natural-language search query.")

class MatchResult(BaseModel):
    uid: str
    name: str = ""
    match_score: float = 0.0
    explanation: str = ""
    skills: list[str] = Field(default_factory=list)
    engagement_count: int = 0

class MatchResponse(BaseModel):
    results: list[MatchResult]


# ── 5. Journey summary ────────────────────────────────────────────────
class JourneyRequest(BaseModel):
    uid: str

class JourneyResponse(BaseModel):
    summary: str
