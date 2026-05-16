"""
Event Broadcaster Agent
-----------------------
• Embeds the event, ranks users by AI cosine similarity.
• Sends the EXACT email body the host typed during event creation.
  Only {{name}} is substituted with the recipient's real name.
• Sends a join confirmation when someone joins via PipeLink UI.
• Gmail SMTP — set GMAIL_USER + GMAIL_APP_PASSWORD in .env.
  If not set → DRY_RUN mode (logs but doesn't send).
"""
import os, smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timezone

import numpy as np
from google import genai
from firebase_client import (
    get_all_users_with_embeddings, create_invitation,
    get_event, update_event
)

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

GMAIL_USER = os.getenv("GMAIL_USER", "")
GMAIL_PASS = os.getenv("GMAIL_APP_PASSWORD", "")
DRY_RUN    = not (GMAIL_USER and GMAIL_PASS)


# ── helpers ──────────────────────────────────────────────────────────────────

def _embed(text: str) -> list[float]:
    result = client.models.embed_content(
        model="gemini-embedding-001",
        contents=text,
    )
    return result.embeddings[0].values


def _cosine(a: list[float], b: list[float]) -> float:
    a, b = np.array(a), np.array(b)
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-10))


def _personalise(body: str, name: str) -> str:
    """Replace only {{name}} — everything else is exactly what the host wrote."""
    return body.replace("{{name}}", name)


def _send_email(to_email: str, subject: str, body: str) -> bool:
    """Send plain-text email via Gmail SMTP. Returns True if actually sent."""
    if DRY_RUN:
        print(f"[DRY-RUN] -> {to_email}")
        print(f"  Subject : {subject}")
        print(f"  Body    : {body[:100]}...")
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = GMAIL_USER
        msg["To"]      = to_email
        # utf-8 ensures non-ASCII characters in the body don't crash on Windows
        msg.attach(MIMEText(body, "plain", "utf-8"))
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as srv:
            srv.login(GMAIL_USER, GMAIL_PASS)
            srv.sendmail(GMAIL_USER, to_email, msg.as_string())
        print(f"[EMAIL SENT] -> {to_email}")
        return True
    except Exception as e:
        print(f"[EMAIL FAIL] {to_email}: {e}")
        return False


# ── join confirmation ─────────────────────────────────────────────────────────

def send_join_confirmation(user_name: str, user_email: str, event: dict, role: str) -> bool:
    """
    Send a fixed congratulations email when a user joins via the PipeLink UI.
    Always uses the PipeLink confirmation template — not the host's email body.
    """
    if not user_email:
        return False

    title    = event.get("title", "the event")
    date_raw = event.get("event_date", "")
    role_label = "Sponsor" if role in ("sponsor", "investor") else "Participant"
    form_url = (
        event.get("investor_form_url", "") if role in ("sponsor", "investor")
        else event.get("participant_form_url", "")
    )

    # Format date nicely: "2026-06-15" → "15 June 2026"
    if date_raw:
        try:
            from datetime import datetime
            date_str = datetime.strptime(date_raw, "%Y-%m-%d").strftime("%d %B %Y")
        except Exception:
            date_str = date_raw
    else:
        date_str = "TBA"

    subject = f"Congratulations! You have joined {title}"

    body = (
        f"Congratulations {user_name},\n\n"
        f"You have successfully joined {title} as a {role_label}!\n\n"
        f"Event Date : {date_str}\n"
        f"Your Role  : {role_label}\n"
    )
    if form_url:
        body += f"Next Step  : Complete your registration at {form_url}\n"

    body += (
        f"\nWe look forward to seeing you there!\n\n"
        f"Best regards,\n"
        f"The PipeLink Team\n"
        f"https://pipelink.dev"
    )

    return _send_email(user_email, subject, body)

# ── main broadcast ────────────────────────────────────────────────────────────

def broadcast_event(
    event_id: str,
    top_investors: int = 5,
    top_participants: int = 20,
) -> dict:
    """
    1. Fetch and embed the hosted event.
    2. Rank all users by cosine similarity.
    3. Split into investors vs participants.
    4. Send host's exact email body (only {{name}} personalised) to top-N each.
    5. Save invitation records to Firestore.
    6. Write email delivery report back onto the event document.
    """
    event = get_event(event_id)
    if not event:
        raise ValueError(f"Event {event_id} not found")

    title = event.get("title", "Untitled")

    # ── embed event ──
    event_text  = f"{title}. {event.get('description', '')}. Industry: {event.get('industry', '')}."
    event_vector = _embed(event_text)
    update_event(event_id, {"embedding_vector": event_vector})

    # ── rank users ──
    all_users: list[dict] = get_all_users_with_embeddings()
    investors:    list[dict] = []
    participants: list[dict] = []

    for user in all_users:
        ev = user.get("embedding_vector")
        if not ev:
            continue
        score   = _cosine(event_vector, ev)
        personas = user.get("active_personas", [])
        entry   = {"user": user, "score": score}
        if "investor" in personas:
            investors.append({**entry, "role": "investor"})
        else:
            participants.append({**entry, "role": "participant"})

    investors.sort(key=lambda x: x["score"],    reverse=True)
    participants.sort(key=lambda x: x["score"], reverse=True)
    selected = investors[:top_investors] + participants[:top_participants]

    # ── email templates — exactly what the host wrote ──
    p_subject = event.get("participant_email_subject") or f"You're invited to {title}"
    p_body    = event.get("participant_email_body")    or (
        f"Hi {{{{name}}}},\n\nYou've been matched to {title}.\n\n"
        f"Register: {event.get('participant_form_url','')}\n\nPipeLink Team"
    )
    i_subject = event.get("investor_email_subject")    or f"Sponsorship Opportunity — {title}"
    i_body    = event.get("investor_email_body")       or (
        f"Dear {{{{name}}}},\n\nWe invite you to support {title}.\n\n"
        f"Express interest: {event.get('investor_form_url','')}\n\nPipeLink Team"
    )

    now   = datetime.now(timezone.utc).isoformat()
    count = {"investor": 0, "participant": 0, "emails_sent": 0, "emails_failed": 0}

    print(f"\n[BROADCAST] {title}")
    print(f"  Mode : {'LIVE' if not DRY_RUN else 'DRY-RUN (set GMAIL_USER + GMAIL_APP_PASSWORD)'}")
    print(f"  Pool : {len(investors)} investors, {len(participants)} participants")
    print(f"  Sending to top {top_investors} investors + {top_participants} participants\n")

    for item in selected:
        user  = item["user"]
        role  = item["role"]
        name  = user.get("name", "there")
        email = user.get("email", "")
        score = item["score"]

        subject = _personalise(i_subject if role == "investor" else p_subject, name)
        body    = _personalise(i_body    if role == "investor" else p_body,    name)

        sent = _send_email(email, subject, body) if email else False
        if sent:
            count["emails_sent"]  += 1
        elif email:
            count["emails_failed"] += 1

        create_invitation({
            "event_id":            event_id,
            "event_title":         title,
            "user_uid":            user["uid"],
            "user_name":           name,
            "user_email":          email,
            "compatibility_score": round(score * 100, 1),
            "role_matched":        role,
            "status":              "sent" if sent else ("dry_run" if DRY_RUN else "pending"),
            "email_subject":       subject,
            "created_at":          now,
        })
        count[role] += 1
        print(f"  [{role.upper():12}] {name:<28} score={score:.3f}  email={email}")

    print(f"\n  OK: {count['investor']} investors + {count['participant']} participants ranked")
    print(f"  OK: {count['emails_sent']} emails sent | {count['emails_failed']} failed | dry_run={DRY_RUN}")

    # ── write delivery report back onto the event document ──
    update_event(event_id, {
        "email_report": {
            "sent":     count["emails_sent"],
            "failed":   count["emails_failed"],
            "dry_run":  DRY_RUN,
            "total":    count["investor"] + count["participant"],
            "sent_at":  now,
        }
    })

    return {
        "event_id":            event_id,
        "investors_invited":   count["investor"],
        "participants_invited":count["participant"],
        "total_invited":       count["investor"] + count["participant"],
        "emails_sent":         count["emails_sent"],
        "dry_run":             DRY_RUN,
    }
