"""
PipeLink Event Seed Script
Seeds Firestore with:
- 8 realistic hosted events (feed data)
- Fake join counts (event_joins)
- 2 sample presets

Run from pipelink_backend/:  python seed_events.py
"""
import os, random, uuid
from pathlib import Path
from datetime import datetime, timezone, timedelta
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

now = datetime.now(timezone.utc)
FAKE_HOST_UID = "seed_host_001"

EVENTS = [
    {
        "title": "MyHack 2025 — AI for Social Good",
        "description": (
            "Malaysia's biggest student hackathon returns! Build AI-powered solutions that address "
            "real social challenges — from digital health to financial inclusion. Mentors from "
            "Google, Grab, and Cradle Fund will guide you through 36 hours of hacking. "
            "Prizes worth RM 50,000 up for grabs."
        ),
        "industry": "AI / Tech",
        "event_date": (now + timedelta(days=14)).strftime("%Y-%m-%d"),
        "needed_participants": 200,
        "participant_form_url": "https://forms.gle/example_participant",
        "investor_form_url": "https://forms.gle/example_sponsor",
        "status": "launched",
        "join_count_fake": 87,
    },
    {
        "title": "KL Fintech Summit 2025",
        "description": (
            "Two days of talks, panels, and networking with Southeast Asia's leading fintech "
            "builders and investors. Topics include DeFi regulation, embedded finance, "
            "Islamic fintech, and cross-border payments. Hosted at Menara TM, Kuala Lumpur."
        ),
        "industry": "Fintech",
        "event_date": (now + timedelta(days=21)).strftime("%Y-%m-%d"),
        "needed_participants": 300,
        "participant_form_url": "https://forms.gle/example_fintech",
        "investor_form_url": "https://forms.gle/example_fintech_sponsor",
        "status": "launched",
        "join_count_fake": 142,
    },
    {
        "title": "HealthTech Founders Bootcamp",
        "description": (
            "A 3-day intensive programme for early-stage healthcare technology founders. "
            "Learn from doctors-turned-founders, hospital CIOs, and MOH digital health leads. "
            "Sessions on regulatory compliance, hospital procurement, and patient privacy (PDPA)."
        ),
        "industry": "HealthTech",
        "event_date": (now + timedelta(days=30)).strftime("%Y-%m-%d"),
        "needed_participants": 40,
        "participant_form_url": "https://forms.gle/example_healthtech",
        "investor_form_url": "",
        "status": "launched",
        "join_count_fake": 29,
    },
    {
        "title": "Green Tech Pitch Day — Climate Solutions",
        "description": (
            "Pitch your climate tech startup to a panel of impact investors, corporate VCs, "
            "and government grant officers. Categories include clean energy, sustainable agriculture, "
            "carbon credits, and circular economy. 6 startups will be selected for follow-on meetings."
        ),
        "industry": "Climate Tech",
        "event_date": (now + timedelta(days=7)).strftime("%Y-%m-%d"),
        "needed_participants": 50,
        "participant_form_url": "https://forms.gle/example_climate",
        "investor_form_url": "https://forms.gle/example_climate_sponsor",
        "status": "launched",
        "join_count_fake": 38,
    },
    {
        "title": "EdTech Innovators Meetup — Kuala Lumpur",
        "description": (
            "Monthly meetup for educators, edtech founders, and learning designers. "
            "This month's theme: AI tutors and personalised learning paths. "
            "Lightning talks, open discussion, and networking dinner included. "
            "Hosted at Kolej Universiti Poly-Tech MARA."
        ),
        "industry": "EdTech",
        "event_date": (now + timedelta(days=5)).strftime("%Y-%m-%d"),
        "needed_participants": 80,
        "participant_form_url": "https://forms.gle/example_edtech",
        "investor_form_url": "",
        "status": "launched",
        "join_count_fake": 51,
    },
    {
        "title": "Agri-Tech Demo Day — Smart Farming",
        "description": (
            "Showcase of the latest precision agriculture technologies for Malaysian farmers. "
            "See live demos of IoT soil sensors, drone mapping, and AI crop disease detection. "
            "Open to farmers, agri-corporations, and rural development agencies."
        ),
        "industry": "Agri-Tech",
        "event_date": (now + timedelta(days=45)).strftime("%Y-%m-%d"),
        "needed_participants": 60,
        "participant_form_url": "https://forms.gle/example_agri",
        "investor_form_url": "https://forms.gle/example_agri_sponsor",
        "status": "launched",
        "join_count_fake": 19,
    },
    {
        "title": "Startup Grind KL — Founder Fireside Chat",
        "description": (
            "A candid conversation with 3 Malaysian founders who raised their Series A in 2024. "
            "Topics: what VCs really look for, building in a downturn, co-founder conflicts, "
            "and knowing when to pivot. Free entry, limited seats."
        ),
        "industry": "AI / Tech",
        "event_date": (now - timedelta(days=5)).strftime("%Y-%m-%d"),  # Past event
        "needed_participants": 100,
        "participant_form_url": "https://forms.gle/example_grind",
        "investor_form_url": "",
        "status": "launched",
        "join_count_fake": 93,
    },
    {
        "title": "F&B Tech Night — Restaurant Automation",
        "description": (
            "Explore how QR ordering, kitchen display systems, and AI inventory management "
            "are transforming Malaysia's food and beverage industry. "
            "Panel of F&B operators, POS vendors, and investors. Post-event networking with food sampling."
        ),
        "industry": "F&B",
        "event_date": (now - timedelta(days=12)).strftime("%Y-%m-%d"),  # Past event
        "needed_participants": 75,
        "participant_form_url": "https://forms.gle/example_fb",
        "investor_form_url": "https://forms.gle/example_fb_sponsor",
        "status": "launched",
        "join_count_fake": 67,
    },
]

FAKE_PARTICIPANTS = [
    {"name": "Aisha Razak", "email": "aisha@example.com"},
    {"name": "Darren Loh", "email": "darren@example.com"},
    {"name": "Priya Nair", "email": "priya@example.com"},
    {"name": "Hafiz Zulkifli", "email": "hafiz@example.com"},
    {"name": "Izzat Fauzi", "email": "izzat@example.com"},
    {"name": "Mei Ling Tan", "email": "meiling@example.com"},
    {"name": "Rajan Krishnan", "email": "rajan@example.com"},
    {"name": "Nurul Ain Hassan", "email": "nurul@example.com"},
    {"name": "David Yeoh", "email": "david@example.com"},
    {"name": "Sarah Abdullah", "email": "sarah@example.com"},
]

SAMPLE_PRESETS = [
    {
        "host_uid": FAKE_HOST_UID,
        "name": "Hackathon Standard Setup",
        "industry": "AI / Tech",
        "needed_participants": 200,
        "participant_form_url": "https://forms.gle/example_participant",
        "investor_form_url": "https://forms.gle/example_sponsor",
        "participant_email_subject": "You're invited to {{event_title}}!",
        "participant_email_body": "Hi {{name}},\n\nWe're excited to invite you to {{event_title}} — an event tailored for your background in {{industry}}.\n\nDate: {{event_date}}\n\nRegister here: {{form_url}}\n\nSee you there,\nThe PipeLink Team",
        "investor_email_subject": "Sponsorship Opportunity — {{event_title}}",
        "investor_email_body": "Dear {{name}},\n\nBased on your investment profile, we believe {{event_title}} is a great opportunity for brand visibility and deal flow.\n\nExpress your interest here: {{form_url}}\n\nBest regards,\nThe PipeLink Team",
        "use_count": 3,
        "is_default": True,
        "created_at": (now - timedelta(days=30)).isoformat(),
        "last_used_at": (now - timedelta(days=5)).isoformat(),
    },
    {
        "host_uid": FAKE_HOST_UID,
        "name": "Investor Pitch Day",
        "industry": "Fintech",
        "needed_participants": 50,
        "participant_form_url": "https://forms.gle/example_pitch",
        "investor_form_url": "https://forms.gle/example_vc",
        "participant_email_subject": "Pitch at {{event_title}} — You've Been Selected",
        "participant_email_body": "Congratulations {{name}},\n\nYour startup has been shortlisted for {{event_title}}.\n\nPitch slot registration: {{form_url}}\n\nGood luck!\nPipeLink",
        "investor_email_subject": "Investor Access — {{event_title}}",
        "investor_email_body": "Dear {{name}},\n\nJoin us as a registered investor at {{event_title}} for exclusive early access to pitching startups.\n\nRegister: {{form_url}}\n\nPipeLink Team",
        "use_count": 1,
        "is_default": False,
        "created_at": (now - timedelta(days=15)).isoformat(),
        "last_used_at": (now - timedelta(days=15)).isoformat(),
    },
]

def seed():
    print("[*] Seeding PipeLink hosted_events + joins + presets...\n")

    # 1. Seed hosted_events
    seeded_event_ids = []
    for ev in EVENTS:
        join_count = ev.pop("join_count_fake")
        event_id = f"seed_{uuid.uuid4().hex[:8]}"
        db.collection("hosted_events").document(event_id).set({
            **ev,
            "event_id": event_id,
            "host_uid": FAKE_HOST_UID,
            "host_name": "PipeLink Demo Host",
            "host_email": "demo@pipelink.dev",
            "created_at": (now - timedelta(days=random.randint(1, 20))).isoformat(),
        })
        seeded_event_ids.append((event_id, ev["title"], join_count))
        print(f"  [EVENT] {ev['title']}")

    # 2. Seed event_joins
    print("\n[*] Seeding event_joins...")
    for event_id, title, join_count in seeded_event_ids:
        # Pick random participants (up to join_count, max 10 fake users)
        participants = random.sample(FAKE_PARTICIPANTS, min(join_count, len(FAKE_PARTICIPANTS)))
        for p in participants:
            fake_uid = f"seed_user_{p['name'].lower().replace(' ','_')}"
            db.collection("event_joins").add({
                "uid": fake_uid,
                "display_name": p["name"],
                "email": p["email"],
                "event_id": event_id,
                "event_title": title,
                "role": random.choice(["participant", "participant", "participant", "sponsor"]),
                "joined_at": (now - timedelta(days=random.randint(0, 10))).isoformat(),
                "host_uid": FAKE_HOST_UID,
                "form_url_opened": True,
            })
        print(f"  [JOINS] {title[:40]} — {len(participants)} joins")

    # 3. Seed presets
    print("\n[*] Seeding event_presets...")
    for preset in SAMPLE_PRESETS:
        db.collection("event_presets").add(preset)
        print(f"  [PRESET] {preset['name']}")

    print(f"\n[DONE] Seeded {len(EVENTS)} events, joins, and {len(SAMPLE_PRESETS)} presets!")
    print("Open http://localhost:3000/feed to see the events.")

if __name__ == "__main__":
    seed()
