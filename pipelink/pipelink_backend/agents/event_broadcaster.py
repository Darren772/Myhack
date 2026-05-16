"""
Event Broadcaster Agent
Embeds an event description, then finds the most compatible
investors and participants from the user pool.
- investor  = user whose active_personas contains "investor"
- participant = everyone else (founder, tech_talent, mentor, etc.)
Emails are sent via Gmail SMTP. Set GMAIL_USER + GMAIL_APP_PASSWORD in .env.
If not set, runs in DRY_RUN mode (logs to console, still saves to Firestore).
"""
from google import genai
import os, smtplib, textwrap
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import numpy as np
from datetime import datetime, timezone
from firebase_client import (
    get_all_users_with_embeddings, create_invitation,
    get_event, update_event
)

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

GMAIL_USER = os.getenv("GMAIL_USER", "")
GMAIL_PASS = os.getenv("GMAIL_APP_PASSWORD", "")
DRY_RUN = not (GMAIL_USER and GMAIL_PASS)


def _embed(text: str) -> list[float]:
    result = client.models.embed_content(
        model="gemini-embedding-001",
        contents=text,
    )
    return result.embeddings[0].values


def _cosine(a: list[float], b: list[float]) -> float:
    a, b = np.array(a), np.array(b)
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-10))


def _fill_template(template: str, name: str, event_title: str, form_url: str, industry: str = "") -> str:
    return (
        template
        .replace("{{name}}", name)
        .replace("{{event_title}}", event_title)
        .replace("{{form_url}}", form_url)
        .replace("{{industry}}", industry)
    )


def _send_email(to_email: str, subject: str, body: str) -> bool:
    """Send a plain-text email via Gmail SMTP. Returns True if sent."""
    if DRY_RUN:
        print(f"[DRY-RUN] Would email: {to_email}")
        print(f"  Subject: {subject}")
        print(f"  Body: {body[:120]}...")
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = GMAIL_USER
        msg["To"] = to_email
        msg.attach(MIMEText(body, "plain"))
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(GMAIL_USER, GMAIL_PASS)
            server.sendmail(GMAIL_USER, to_email, msg.as_string())
        print(f"[EMAIL SENT] → {to_email}")
        return True
    except Exception as e:
        print(f"[EMAIL FAIL] {to_email}: {e}")
        return False


def broadcast_event(
    event_id: str,
    top_investors: int = 5,
    top_participants: int = 20,
) -> dict:
    """
    1. Fetch and embed the hosted event.
    2. Compare against every user's embedding_vector (cosine similarity).
    3. Rank and split: investors vs participants.
    4. Send personalised emails to top-N from each group.
    5. Save invitation records to Firestore.
    """
    event = get_event(event_id)
    if not event:
        raise ValueError(f"Event {event_id} not found")

    event_text = (
        f"{event['title']}. {event['description']}. "
        f"Industry: {event.get('industry', '')}."
    )
    event_vector = _embed(event_text)
    update_event(event_id, {"embedding_vector": event_vector})

    all_users = get_all_users_with_embeddings()

    investors: list[dict] = []
    participants: list[dict] = []

    for user in all_users:
        ev = user.get("embedding_vector")
        if not ev:
            continue
        score = _cosine(event_vector, ev)
        personas = user.get("active_personas", [])

        entry = {"user": user, "score": score}
        if "investor" in personas:
            investors.append({**entry, "role": "investor"})
        else:
            participants.append({**entry, "role": "participant"})

    investors.sort(key=lambda x: x["score"], reverse=True)
    participants.sort(key=lambda x: x["score"], reverse=True)

    selected = investors[:top_investors] + participants[:top_participants]

    # Email templates from event (with fallbacks)
    p_subject = event.get("participant_email_subject") or f"You're invited to {event['title']}"
    p_body    = event.get("participant_email_body")    or f"Hi {{{{name}}}},\n\nYou've been matched to {event['title']}.\n\nRegister: {{{{form_url}}}}\n\nPipeLink Team"
    i_subject = event.get("investor_email_subject")    or f"Sponsorship Opportunity — {event['title']}"
    i_body    = event.get("investor_email_body")       or f"Dear {{{{name}}}},\n\nWe invite you to support {event['title']}.\n\nExpress interest: {{{{form_url}}}}\n\nPipeLink Team"

    now = datetime.now(timezone.utc).isoformat()
    count = {"investor": 0, "participant": 0, "emails_sent": 0}

    print(f"\n[BROADCAST] Event: {event['title']}")
    print(f"  Ranked {len(investors)} investors, {len(participants)} participants")
    print(f"  Sending to top {top_investors} investors + {top_participants} participants")
    print(f"  Email mode: {'LIVE' if not DRY_RUN else 'DRY-RUN (set GMAIL_USER + GMAIL_APP_PASSWORD to send real emails)'}\n")

    for item in selected:
        user = item["user"]
        role = item["role"]
        name = user.get("name", "there")
        email = user.get("email", "")
        score = item["score"]
        form_url = (
            event.get("investor_form_url", "") if role == "investor"
            else event.get("participant_form_url", "")
        ) or "https://pipelink.dev"

        subject = _fill_template(
            i_subject if role == "investor" else p_subject,
            name, event["title"], form_url, event.get("industry", "")
        )
        body = _fill_template(
            i_body if role == "investor" else p_body,
            name, event["title"], form_url, event.get("industry", "")
        )

        sent = _send_email(email, subject, body) if email else False
        if sent:
            count["emails_sent"] += 1

        create_invitation({
            "event_id": event_id,
            "event_title": event.get("title", ""),
            "user_uid": user["uid"],
            "user_name": name,
            "user_email": email,
            "compatibility_score": round(score * 100, 1),
            "role_matched": role,
            "status": "sent" if sent else ("dry_run" if DRY_RUN else "pending"),
            "email_subject": subject,
            "created_at": now,
        })
        count[role] += 1
        print(f"  [{role.upper():12}] {name:<28} score={score:.3f}  email={email}")

    print(f"\n  ✓ {count['investor']} investors + {count['participant']} participants ranked")
    print(f"  ✓ {count['emails_sent']} emails sent ({len(selected) - count['emails_sent']} dry-run)")

    return {
        "event_id": event_id,
        "investors_invited": count["investor"],
        "participants_invited": count["participant"],
        "total_invited": count["investor"] + count["participant"],
        "emails_sent": count["emails_sent"],
        "dry_run": DRY_RUN,
    }
