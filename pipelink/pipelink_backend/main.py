from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pathlib import Path
import os

# Load shared .env from pipelink root (one level above pipelink_backend)
load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")


from models.schemas import (
    ParseLinkedInRequest, ParseLinkedInResponse,
    FormSyncRequest,
    EmbedProfileRequest,
    MatchRequest, MatchResponse, MatchResult,
    JourneyRequest, JourneyResponse,
    CreateEventRequest, CreateEventResponse,
    BroadcastRequest, BroadcastResult,
    EventInvitesResponse, UserInvitesResponse, InvitationItem,
    LaunchEventRequest,
)
from agents.profile_parser import parse_linkedin
from agents.form_sync import sync_form
from agents.embedder import embed_profile
from agents.matcher import match_founders
from agents.recommender import explain_match
from agents.journey_summary import generate_journey
from agents.event_broadcaster import broadcast_event as do_broadcast
from firebase_client import (
    get_engagements, create_event,
    get_invitations_for_event, get_invitations_for_user
)

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

@app.get("/user/{uid}/profile")
async def get_user_profile(uid: str):
    from firebase_client import get_user
    profile = get_user(uid)
    if not profile:
        return {"exists": False}
    profile.pop("embedding_vector", None)
    return {"exists": True, "profile": profile}

@app.post("/user/profile")
async def save_user_profile(req: dict):
    from firebase_client import update_user
    uid = req.get("uid")
    if not uid:
        raise HTTPException(status_code=400, detail="uid is required")
    data = {k: v for k, v in req.items() if k != "uid"}
    update_user(uid, data)
    return {"success": True}

@app.post("/parse-linkedin-url")
async def parse_linkedin_url_route(req: dict):
    """Scrape a LinkedIn profile URL and parse it with AI."""
    url = req.get("url", "").strip()
    if not url:
        raise HTTPException(status_code=400, detail="url is required")
    if "linkedin.com" not in url:
        raise HTTPException(status_code=400, detail="Please provide a valid LinkedIn URL")
    from agents.linkedin_scraper import parse_linkedin_url
    result = parse_linkedin_url(url)
    return result


@app.get("/events/counts")
async def get_event_join_counts():
    """Return join counts for all events (used by feed)."""
    from firebase_client import db
    docs = db.collection("event_joins").stream()
    counts: dict[str, int] = {}
    for doc in docs:
        eid = doc.to_dict().get("event_id", "")
        if eid:
            counts[eid] = counts.get(eid, 0) + 1
    return {"counts": counts}

@app.get("/events")
async def list_events():
    from firebase_client import db
    docs = db.collection("hosted_events").stream()
    events = []
    for doc in docs:
        d = {"event_id": doc.id, **doc.to_dict()}
        d.pop("embedding_vector", None)
        events.append(d)
    events.sort(key=lambda e: e.get("created_at", ""), reverse=True)
    return {"events": events}


# ── Event Hosting ────────────────────────────────────────────────────
import uuid
from datetime import datetime, timezone

@app.post("/event/create", response_model=CreateEventResponse)
async def create_event_route(req: CreateEventRequest):
    event_id = str(uuid.uuid4())
    data = {
        "event_id": event_id,
        "host_uid": req.host_uid,
        "title": req.title,
        "description": req.description,
        "industry": req.industry,
        "event_date": req.event_date,
        "needed_investors": req.needed_investors,
        "needed_participants": req.needed_participants,
        "participant_form_url": req.participant_form_url,
        "investor_form_url": req.investor_form_url,
        "participant_email_subject": req.participant_email_subject,
        "participant_email_body": req.participant_email_body,
        "investor_email_subject": req.investor_email_subject,
        "investor_email_body": req.investor_email_body,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "draft",
    }
    create_event(data)
    return CreateEventResponse(
        event_id=event_id,
        title=req.title,
        message="Event saved as preset."
    )

@app.post("/event/{event_id}/launch")
async def launch_event(event_id: str, req: LaunchEventRequest):
    """Run AI matching and save outreach plan as preset."""
    try:
        result = do_broadcast(event_id, req.top_investors, req.top_participants)
        from firebase_client import db
        db.collection("hosted_events").document(event_id).update({"status": "launched"})
        return {**result, "status": "launched"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Launch failed: {str(e)}")

@app.get("/event/{event_id}/invitations")
async def get_invitations(event_id: str):
    """Get AI-ranked invitations for an event, sorted by compatibility score."""
    from firebase_client import db, get_event
    event = get_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    docs = db.collection("invitations").where("event_id", "==", event_id).stream()
    invites = [{"invitation_id": doc.id, **doc.to_dict()} for doc in docs]
    invites.sort(key=lambda x: x.get("compatibility_score", 0), reverse=True)
    investors = [i for i in invites if i.get("role_matched") == "investor"]
    participants = [i for i in invites if i.get("role_matched") == "participant"]
    return {
        "event_id": event_id,
        "event_title": event.get("title", ""),
        "total": len(invites),
        "investors": investors,
        "participants": participants,
        "emails_sent": sum(1 for i in invites if i.get("status") == "sent"),
        "dry_run": sum(1 for i in invites if i.get("status") == "dry_run"),
    }

@app.delete("/event/{event_id}")
async def delete_event(event_id: str, uid: str):
    """Delete an event. Only the host who created it can delete it."""
    from firebase_client import db, get_event
    event = get_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.get("host_uid") != uid:
        raise HTTPException(status_code=403, detail="Only the event host can delete this event")

    # Delete the event document
    db.collection("hosted_events").document(event_id).delete()

    # Clean up related joins
    joins = db.collection("event_joins").where("event_id", "==", event_id).stream()
    for j in joins:
        j.reference.delete()

    # Clean up related invitations
    invites = db.collection("invitations").where("event_id", "==", event_id).stream()
    for inv in invites:
        inv.reference.delete()

    return {"success": True, "message": f"Event '{event.get('title')}' deleted successfully"}

@app.get("/event/{event_id}/registrations")
async def get_registrations(event_id: str, form_type: str | None = None):
    """Get all form registrations for an event (participant or sponsor)."""
    from firebase_client import get_event_registrations, get_event
    event = get_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    regs = get_event_registrations(event_id, form_type)
    return {"event_id": event_id, "registrations": regs}

@app.get("/event/{event_id}/attendees")
async def get_attendees(event_id: str, uid: str | None = None):
    """
    Unified attendee list merging event_joins + event_registrations + user profiles.
    - Host (uid == host_uid): full details (email, LinkedIn, bio, form data)
    - Others: names and roles only
    """
    from firebase_client import get_event, get_event_joins, get_event_registrations, get_user, db

    event = get_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    is_host = uid and uid == event.get("host_uid")
    is_active = not event.get("event_date") or event.get("event_date") > str(__import__("datetime").date.today())

    # Load both sources
    joins = get_event_joins(event_id)           # PipeLink UI joins
    regs  = get_event_registrations(event_id)   # Google Form submissions

    # Build a merged dict keyed by email (lowercase)
    merged: dict[str, dict] = {}

    # First pass: process PipeLink joins
    for j in joins:
        profile = get_user(j.get("uid", "")) or {}
        email = (profile.get("email") or j.get("email") or "").lower()
        key = email or j.get("uid", j.get("join_id", ""))
        uid_short = j.get("uid", "")[-6:] if j.get("uid") else "?"
        merged[key] = {
            "name":      profile.get("name") or j.get("name") or f"PipeLink User ···{uid_short}",
            "role":      j.get("role", "participant"),
            "source":    "pipelink",
            "uid":       j.get("uid"),
            "email":     email if is_host else "",
            "linkedin":  profile.get("linkedin_url", "") if is_host else "",
            "bio":       profile.get("bio", "") if is_host else "",
            "skills":    profile.get("skills", []) if is_host else [],
            "form_data": None,
            "joined_at": j.get("joined_at", ""),
        }

    # Second pass: overlay / add form registrations
    for r in regs:
        email = (r.get("user_email") or r.get("email") or "").lower()
        key = email or r.get("reg_id", "")
        existing = merged.get(key, {})
        merged[key] = {
            "name":      r.get("name") or existing.get("name") or "Unknown",
            "role":      r.get("form_type", existing.get("role", "participant")),
            "source":    "form" if not existing else "both",
            "uid":       existing.get("uid"),
            "email":     email if is_host else "",
            "linkedin":  (r.get("linkedin_url") or existing.get("linkedin", "")) if is_host else "",
            "bio":       (r.get("bio") or existing.get("bio", "")) if is_host else "",
            "skills":    (r.get("skills") or existing.get("skills", [])) if is_host else [],
            "form_data": {k: v for k, v in r.items()
                          if k not in ("event_id", "form_type", "user_email", "reg_id")} if is_host else None,
            "joined_at": existing.get("joined_at", r.get("submitted_at", "")),
        }

    attendees = list(merged.values())
    participants = [a for a in attendees if a["role"] in ("participant",)]
    sponsors     = [a for a in attendees if a["role"] in ("sponsor", "investor")]

    return {
        "event_id":    event_id,
        "event_title": event.get("title"),
        "is_host":     bool(is_host),
        "is_active":   is_active,
        "total":       len(attendees),
        "participants": sorted(participants, key=lambda x: x["name"]),
        "sponsors":     sorted(sponsors,     key=lambda x: x["name"]),
    }


@app.post("/event/{event_id}/assign-sponsor")
async def assign_sponsor_badge(event_id: str, req: dict):
    """Host manually assigns Sponsor badge to a registrant by reg_id or email."""
    from firebase_client import (
        get_event, get_user_by_email, update_user,
        update_registration, db
    )
    host_uid = req.get("host_uid")
    reg_id = req.get("reg_id")
    email = req.get("email")
    name = req.get("name", "")

    event = get_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.get("host_uid") != host_uid:
        raise HTTPException(status_code=403, detail="Only the event host can assign badges")

    # Mark registration as badge assigned
    if reg_id:
        update_registration(reg_id, {"sponsor_badge_assigned": True})

    # Find user by email and grant sponsor badge
    user = get_user_by_email(email) if email else None
    if user:
        from firebase_client import get_user
        profile = get_user(user["uid"]) or {}
        new_count = profile.get("events_sponsored", 0) + 1
        update_user(user["uid"], {
            "is_sponsor": True,
            "events_sponsored": new_count,
        })
        # Record in sponsorships collection
        db.collection("sponsorships").add({
            "uid": user["uid"],
            "event_id": event_id,
            "event_title": event.get("title", ""),
            "assigned_by": host_uid,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        return {"success": True, "user_found": True, "message": f"Sponsor badge assigned to {name or email}"}
    else:
        # User hasn't signed up on PipeLink yet — record pending badge
        db.collection("pending_sponsor_badges").add({
            "email": email,
            "name": name,
            "event_id": event_id,
            "event_title": event.get("title", ""),
            "assigned_by": host_uid,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        return {"success": True, "user_found": False, "message": f"Badge recorded for {name or email}. Will be applied when they sign up."}

@app.get("/user/{uid}/events")
async def get_host_events_route(uid: str):
    """Get all events hosted by a user."""
    from firebase_client import get_host_events
    events = get_host_events(uid)
    return {"events": events}

@app.get("/user/{uid}/events-summary")
async def get_host_events_summary(uid: str):
    """Get all hosted events with attendee counts for the host dashboard."""
    from firebase_client import get_host_events, get_event_join_count, db
    events = get_host_events(uid)
    summary = []
    for ev in events:
        eid = ev.get("event_id", "")
        # Count joins by role
        joins = list(db.collection("event_joins").where("event_id", "==", eid).stream())
        p_count = sum(1 for j in joins if j.to_dict().get("role") == "participant")
        s_count = sum(1 for j in joins if j.to_dict().get("role") in ("sponsor", "investor"))
        # Count form registrations
        regs = list(db.collection("event_registrations").where("event_id", "==", eid).stream())
        r_count = len(regs)
        event_date = ev.get("event_date", "")
        import datetime
        is_active = not event_date or event_date > str(datetime.date.today())
        summary.append({
            "event_id":          eid,
            "title":             ev.get("title", "Untitled"),
            "industry":          ev.get("industry", ""),
            "event_date":        event_date,
            "is_active":         is_active,
            "participants":      p_count,
            "sponsors":          s_count,
            "form_submissions":  r_count,
            "total_attendees":   p_count + s_count,
            "needed_participants": ev.get("needed_participants", 0),
        })
    # Sort: active first, then by date desc
    summary.sort(key=lambda x: (not x["is_active"], x["event_date"] or ""), reverse=False)
    return {"uid": uid, "total_events": len(summary), "events": summary}

@app.get("/user/{uid}/sponsor-status")
async def get_sponsor_status(uid: str):
    from firebase_client import get_user
    profile = get_user(uid) or {}
    return {
        "is_sponsor": profile.get("is_sponsor", False),
        "is_host": profile.get("is_host", False),
        "events_sponsored": profile.get("events_sponsored", 0),
    }

@app.post("/user/{uid}/upgrade")
async def upgrade_to_host(uid: str):
    """Grant host tier to a user (demo: instant, no payment needed)."""
    from firebase_client import update_user
    update_user(uid, {"is_host": True})
    return {"success": True, "message": "Host tier activated!"}


@app.post("/event/broadcast", response_model=BroadcastResult)
async def broadcast_route(req: BroadcastRequest):
    try:
        result = do_broadcast(req.event_id, req.top_investors, req.top_participants)
        return BroadcastResult(**result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Broadcast failed: {str(e)}")

@app.get("/event/{event_id}/invites", response_model=EventInvitesResponse)
async def get_event_invites(event_id: str):
    invites = get_invitations_for_event(event_id)
    return EventInvitesResponse(
        event_id=event_id,
        invitations=[InvitationItem(**i) for i in invites]
    )

@app.get("/user/{uid}/invites", response_model=UserInvitesResponse)
async def get_user_invites(uid: str):
    invites = get_invitations_for_user(uid)
    return UserInvitesResponse(
        uid=uid,
        invitations=[InvitationItem(**i) for i in invites]
    )



@app.post("/event/{event_id}/join")
async def join_event(event_id: str, req: dict):
    """Record a user joining an event. Idempotent — ignores duplicate joins."""
    from firebase_client import (
        get_event, has_user_joined, create_event_join, get_user
    )
    from datetime import datetime, timezone

    uid = req.get("uid")
    role = req.get("role", "participant")  # "participant" or "sponsor"
    if not uid:
        raise HTTPException(status_code=400, detail="uid is required")

    event = get_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Idempotency — ignore duplicate joins
    existing = has_user_joined(uid, event_id)
    if existing:
        return {"success": True, "already_joined": True, "join_id": existing["join_id"]}

    # Get user profile for display info
    profile = get_user(uid) or {}

    join_doc = {
        "uid": uid,
        "display_name": profile.get("name", req.get("display_name", "Unknown")),
        "email": profile.get("email", req.get("email", "")),
        "event_id": event_id,
        "event_title": event.get("title", ""),
        "event_date": event.get("event_date", ""),
        "event_industry": event.get("industry", ""),
        "host_uid": event.get("host_uid", ""),
        "role": role,
        "joined_at": datetime.now(timezone.utc).isoformat(),
        "form_url_opened": True,
    }
    join_id = create_event_join(join_doc)
    return {"success": True, "already_joined": False, "join_id": join_id}

@app.get("/user/{uid}/history")
async def get_user_history(uid: str):
    """Get all events a user has joined, with past/upcoming classification."""
    from firebase_client import get_user_joins
    from datetime import datetime, timezone

    joins = get_user_joins(uid)
    now = datetime.now(timezone.utc).isoformat()

    for j in joins:
        event_date = j.get("event_date", "")
        j["is_past"] = bool(event_date and event_date < now[:10])

    return {
        "uid": uid,
        "total": len(joins),
        "upcoming": [j for j in joins if not j.get("is_past")],
        "past": [j for j in joins if j.get("is_past")],
    }

@app.get("/event/{event_id}/joins")
async def get_event_join_list(event_id: str):
    """Get all PipeLink users who joined a specific event (host view)."""
    from firebase_client import get_event_joins, get_event
    event = get_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    joins = get_event_joins(event_id)
    return {
        "event_id": event_id,
        "event_title": event.get("title", ""),
        "total_joins": len(joins),
        "joins": joins,
    }


# ── Event Presets ─────────────────────────────────────────────────────────────

@app.get("/user/{uid}/presets")
async def list_presets(uid: str):
    """Get all event presets for a host, sorted by most-used."""
    from firebase_client import get_user_presets
    return {"presets": get_user_presets(uid)}

@app.post("/user/{uid}/presets")
async def save_preset(uid: str, req: dict):
    """Save a new event preset."""
    from firebase_client import create_preset
    from datetime import datetime, timezone
    import uuid
    name = req.get("name", "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Preset name is required")
    data = {
        "preset_id": "",  # will be overwritten below
        "host_uid": uid,
        "name": name,
        "industry": req.get("industry", ""),
        "needed_participants": req.get("needed_participants", 50),
        "participant_form_url": req.get("participant_form_url", ""),
        "investor_form_url": req.get("investor_form_url", ""),
        "participant_email_subject": req.get("participant_email_subject", ""),
        "participant_email_body": req.get("participant_email_body", ""),
        "investor_email_subject": req.get("investor_email_subject", ""),
        "investor_email_body": req.get("investor_email_body", ""),
        "use_count": 0,
        "is_default": req.get("is_default", False),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_used_at": None,
    }
    preset_id = create_preset(data)
    return {"success": True, "preset_id": preset_id}

@app.put("/user/{uid}/presets/{preset_id}")
async def update_preset_route(uid: str, preset_id: str, req: dict):
    """Update an existing preset. Also handles marking as default."""
    from firebase_client import update_preset, get_user_presets, db
    from datetime import datetime, timezone
    # If setting as default, clear default on all others first
    if req.get("is_default"):
        existing = get_user_presets(uid)
        for p in existing:
            if p.get("is_default") and p["preset_id"] != preset_id:
                db.collection("event_presets").document(p["preset_id"]).update({"is_default": False})
    req["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_preset(preset_id, req)
    return {"success": True}

@app.delete("/user/{uid}/presets/{preset_id}")
async def delete_preset_route(uid: str, preset_id: str):
    """Delete a preset."""
    from firebase_client import delete_preset
    delete_preset(preset_id)
    return {"success": True}

@app.post("/user/{uid}/presets/{preset_id}/use")
async def record_preset_use(uid: str, preset_id: str):
    """Increment use_count and update last_used_at when a preset is applied."""
    from firebase_client import get_preset, update_preset
    from datetime import datetime, timezone
    preset = get_preset(preset_id)
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")
    update_preset(preset_id, {
        "use_count": preset.get("use_count", 0) + 1,
        "last_used_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"success": True}
