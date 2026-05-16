"""
test_broadcast.py  — Test the AI ranking + email pipeline

Usage:
    python test_broadcast.py              # ranks first seeded event, dry-run
    python test_broadcast.py <event_id>   # ranks a specific event

What it tests:
  1. Fetches all users with embedding vectors from Firestore
  2. Embeds the event description with Gemini
  3. Ranks users by cosine similarity
  4. Prints ranked table (investors + participants)
  5. Sends emails IF GMAIL_USER + GMAIL_APP_PASSWORD are set in .env
     (otherwise prints what the email WOULD look like — dry-run)
"""
import os, sys
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")

import firebase_admin
from firebase_admin import credentials, firestore

cred_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", "")
if not Path(cred_path).is_absolute():
    resolved = Path(__file__).parent / cred_path
    if not resolved.exists():
        resolved = Path(__file__).parent.parent / cred_path
    cred_path = str(resolved)

if not firebase_admin._apps:
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)

db = firestore.client()

# ── Pick event ────────────────────────────────────────────────────────────────
def pick_event(event_id: str | None) -> dict:
    if event_id:
        doc = db.collection("hosted_events").document(event_id).get()
        if not doc.exists:
            print(f"[ERROR] Event '{event_id}' not found.")
            sys.exit(1)
        return {"event_id": doc.id, **doc.to_dict()}
    # Pick first available event
    docs = list(db.collection("hosted_events").limit(1).stream())
    if not docs:
        print("[ERROR] No events found in Firestore. Run: python seed_events.py first.")
        sys.exit(1)
    return {"event_id": docs[0].id, **docs[0].to_dict()}


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    arg_event_id = sys.argv[1] if len(sys.argv) > 1 else None
    event = pick_event(arg_event_id)

    print("=" * 65)
    print(f"  PipeLink — AI Ranking + Email Test")
    print("=" * 65)
    print(f"  Event  : {event['title']}")
    print(f"  ID     : {event['event_id']}")
    print(f"  Industry: {event.get('industry','N/A')}")
    print(f"  Date   : {event.get('event_date','TBA')}")
    print()

    # Check email mode
    gmail_user = os.getenv("GMAIL_USER","")
    gmail_pass = os.getenv("GMAIL_APP_PASSWORD","")
    if gmail_user and gmail_pass and not gmail_user.startswith("your_"):
        print(f"  Email  : LIVE MODE — sending from {gmail_user}")
    else:
        print("  Email  : DRY-RUN (no emails sent)")
        print("           → Set GMAIL_USER + GMAIL_APP_PASSWORD in .env to send real emails")
    print("=" * 65)

    # Check user pool
    from firebase_client import get_all_users_with_embeddings
    users = get_all_users_with_embeddings()
    print(f"\n  User pool: {len(users)} users with embedding vectors")
    if len(users) == 0:
        print("\n  [WARNING] No users with embeddings found.")
        print("  Run: python seed.py   (to seed 15 fake users with AI embeddings)")
        return

    # Run broadcast
    print("\n  Running AI ranking (this embeds the event + computes scores)...\n")
    from agents.event_broadcaster import broadcast_event
    result = broadcast_event(
        event_id=event["event_id"],
        top_investors=5,
        top_participants=10,
    )

    print("\n" + "=" * 65)
    print(f"  RESULT SUMMARY")
    print("=" * 65)
    print(f"  Investors invited  : {result['investors_invited']}")
    print(f"  Participants invited: {result['participants_invited']}")
    print(f"  Total              : {result['total_invited']}")
    print(f"  Emails sent        : {result['emails_sent']}")
    print(f"  Mode               : {'DRY-RUN' if result['dry_run'] else 'LIVE'}")
    print()

    # Show stored invitations
    invites = list(
        db.collection("invitations")
          .where("event_id", "==", event["event_id"])
          .stream()
    )
    print(f"  Invitations stored in Firestore: {len(invites)}")
    print()
    print(f"  {'ROLE':<12} {'NAME':<26} {'SCORE':>6}  {'EMAIL'}")
    print("  " + "-" * 62)
    for doc in sorted(invites, key=lambda d: d.to_dict().get("compatibility_score",0), reverse=True):
        d = doc.to_dict()
        print(f"  {d.get('role_matched','?'):<12} {d.get('user_name','?'):<26} {d.get('compatibility_score',0):>5.1f}%  {d.get('user_email','')}")

    print()
    print("  Done! Check Firestore → invitations collection for full records.")
    print("=" * 65)


if __name__ == "__main__":
    main()
