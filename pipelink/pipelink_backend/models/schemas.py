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


# ── 6. Event Hosting & Broadcasting ───────────────────────────────────
class CreateEventRequest(BaseModel):
    host_uid: str = Field(..., description="UID of the user hosting the event.")
    title: str = Field(..., description="Event title.")
    description: str = Field(..., description="Full event description used for AI matching.")
    industry: str = Field("", description="Industry/domain e.g. Fintech, EdTech, HealthTech.")
    event_date: Optional[str] = Field(None, description="ISO date string e.g. 2025-09-01")
    needed_investors: int = Field(5, description="How many investors to invite.")
    needed_participants: int = Field(20, description="How many participants to invite.")
    # Preset fields
    participant_form_url: str = Field("", description="Google Form URL for participants.")
    investor_form_url: str = Field("", description="Google Form URL for investors/companies.")
    participant_email_subject: str = Field("", description="Email subject for participant outreach.")
    participant_email_body: str = Field("", description="Email body template for participants.")
    investor_email_subject: str = Field("", description="Email subject for investor outreach.")
    investor_email_body: str = Field("", description="Email body template for investors.")

class LaunchEventRequest(BaseModel):
    top_investors: int = Field(5)
    top_participants: int = Field(20)


class CreateEventResponse(BaseModel):
    event_id: str
    title: str
    message: str = ""

class BroadcastRequest(BaseModel):
    event_id: str = Field(..., description="ID of the hosted event to broadcast.")
    top_investors: int = Field(5, description="Max number of investors to invite.")
    top_participants: int = Field(20, description="Max number of participants to invite.")

class BroadcastResult(BaseModel):
    event_id: str
    investors_invited: int
    participants_invited: int
    total_invited: int

class InvitationItem(BaseModel):
    event_id: str = ""
    event_title: str = ""
    user_uid: str = ""
    user_name: str = ""
    user_email: str = ""
    compatibility_score: float = 0.0
    role_matched: str = ""
    status: str = "pending"
    created_at: str = ""

class EventInvitesResponse(BaseModel):
    event_id: str
    invitations: list[InvitationItem]

class UserInvitesResponse(BaseModel):
    uid: str
    invitations: list[InvitationItem]
