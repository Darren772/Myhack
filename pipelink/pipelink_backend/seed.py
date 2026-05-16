"""
PipeLink Seed Script
Seeds Firestore with 15 realistic Malaysian startup ecosystem profiles
(founders, investors, tech talent, mentors) + their embedding vectors.
Run from pipelink_backend/:  python seed.py
"""
import os, random
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")

import firebase_admin
from firebase_admin import credentials, firestore
from google import genai

# ── Resolve service account path ─────────────────────────────────────
cred_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", "")
if not Path(cred_path).is_absolute():
    # Try relative to backend dir first
    resolved = Path(__file__).parent / cred_path
    if not resolved.exists():
        # Try relative to pipelink root
        resolved = Path(__file__).parent.parent / cred_path
    cred_path = str(resolved)

cred = credentials.Certificate(cred_path)
firebase_admin.initialize_app(cred)
db = firestore.client()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# ── Fake Profiles ─────────────────────────────────────────────────────
PROFILES = [
    # FOUNDERS
    {
        "name": "Aisha Razak", "age": 27,
        "bio": "Founder of a fintech startup automating SME payroll in Malaysia. Ex-CIMB engineer.",
        "headline": "Founder & CEO @ PayEasy | Fintech | Ex-CIMB",
        "location": "Kuala Lumpur, Malaysia",
        "skills": ["Python", "Django", "Stripe API", "Fintech", "Product Strategy"],
        "education": ["BSc Computer Science, UM, 2021"],
        "experience": ["SWE at CIMB 2021-2023", "Founder & CEO at PayEasy 2023-present"],
        "active_personas": ["founder"], "industry": "Fintech",
    },
    {
        "name": "Darren Loh", "age": 26,
        "bio": "EdTech founder building AI tutoring platform for Bahasa Malaysia students in rural areas.",
        "headline": "Founder @ TutorAI | EdTech | AI Engineer",
        "location": "Petaling Jaya, Malaysia",
        "skills": ["React", "Node.js", "Gemini API", "EdTech", "LLMs", "Firebase"],
        "education": ["BSc Software Engineering, UTM, 2020"],
        "experience": ["Frontend Dev at Axiata 2020-2022", "Founder at TutorAI 2022-present"],
        "active_personas": ["founder", "tech_talent"], "industry": "EdTech",
    },
    {
        "name": "Priya Nair", "age": 30,
        "bio": "Doctor-turned-founder connecting rural patients with telemedicine services in Sabah and Sarawak.",
        "headline": "Founder @ TeleHealth Sabah | HealthTech | MBBS",
        "location": "Kota Kinabalu, Malaysia",
        "skills": ["Flutter", "Firebase", "Healthcare", "UX Design", "Telemedicine"],
        "education": ["MBBS, UPM, 2019"],
        "experience": ["Doctor at KKM 2019-2022", "Founder at TeleHealth Sabah 2022-present"],
        "active_personas": ["founder"], "industry": "HealthTech",
    },
    {
        "name": "Hafiz Zulkifli", "age": 28,
        "bio": "Building a cloud kitchen OS for Malaysian F&B operators. Combines IoT and ML to optimise kitchen ops.",
        "headline": "Founder @ KitchenOS | FoodTech | IoT Engineer",
        "location": "Shah Alam, Malaysia",
        "skills": ["Python", "Machine Learning", "IoT", "F&B Operations", "TensorFlow"],
        "education": ["BSc Electrical Engineering, UiTM, 2020"],
        "experience": ["Engineer at Maxis 2020-2022", "Founder at KitchenOS 2022-present"],
        "active_personas": ["founder"], "industry": "F&B",
    },
    {
        "name": "Izzat Fauzi", "age": 24,
        "bio": "Hackathon-turned-founder building an AI recruitment platform. Mentors junior devs at GDG KL.",
        "headline": "Founder @ HireAI | AI/Tech | Mentor @ GDG KL",
        "location": "Kuala Lumpur, Malaysia",
        "skills": ["Python", "Next.js", "Gemini API", "Firebase", "Recruiting Tech", "FastAPI"],
        "education": ["BSc Computer Science, UTP, 2022"],
        "experience": ["SWE at Grab 2022-2023", "Founder at HireAI 2023-present", "Mentor at GDG KL 2024-present"],
        "active_personas": ["founder", "tech_talent", "mentor"], "industry": "AI / Tech",
    },
    {
        "name": "Siti Aisyah Binti Aziz", "age": 29,
        "bio": "Agri-tech founder digitising smallholder farmers in Kedah with IoT soil sensors and AI crop advisory.",
        "headline": "Founder @ FarmSense | Agri-Tech | IoT",
        "location": "Alor Setar, Malaysia",
        "skills": ["IoT", "Python", "Data Analytics", "Agriculture", "Hardware Prototyping"],
        "education": ["BSc Agricultural Science, UPM, 2019"],
        "experience": ["Research Officer at MARDI 2019-2022", "Founder at FarmSense 2022-present"],
        "active_personas": ["founder"], "industry": "Agri-Tech",
    },

    # INVESTORS
    {
        "name": "David Yeoh", "age": 42,
        "bio": "Angel investor focused on early-stage B2B SaaS and fintech in SEA. Backed 12 startups since 2018.",
        "headline": "Angel Investor | Ex-Maybank IB | Fintech & SaaS",
        "location": "Kuala Lumpur, Malaysia",
        "skills": ["Due Diligence", "Term Sheets", "SaaS Metrics", "Corporate Finance", "Fintech"],
        "education": ["MBA, INSEAD, 2015", "BEng, Monash, 2005"],
        "experience": ["VP at Maybank Investment Banking 2010-2018", "Angel Investor 2018-present"],
        "active_personas": ["investor"], "industry": "Fintech",
    },
    {
        "name": "Sarah Abdullah", "age": 33,
        "bio": "VC associate at a KL-based fund investing in climate tech, agri-tech, and sustainable supply chains.",
        "headline": "VC Associate @ GreenVC | Climate Tech | Impact Investing",
        "location": "Kuala Lumpur, Malaysia",
        "skills": ["Climate Tech", "Agri-Tech", "Venture Capital", "Impact Investing", "ESG"],
        "education": ["BSc Environmental Engineering, UM, 2018"],
        "experience": ["Analyst at MAVCAP 2018-2021", "VC Associate at GreenVC 2021-present"],
        "active_personas": ["investor"], "industry": "Climate Tech",
    },
    {
        "name": "Tan Boon Kiat", "age": 50,
        "bio": "Corporate VC director at a Malaysian conglomerate investing in healthtech and digital health startups.",
        "headline": "Corporate VC Director | HealthTech | Digital Health",
        "location": "Kuala Lumpur, Malaysia",
        "skills": ["Corporate VC", "M&A", "Digital Health", "Healthcare Investments", "Portfolio Management"],
        "education": ["MBA, Harvard Business School, 2005", "MBBS, UM, 1999"],
        "experience": ["Doctor 1999-2005", "Director at KPJ Ventures 2005-2015", "Corporate VC Director at YTL Digital Health 2015-present"],
        "active_personas": ["investor"], "industry": "HealthTech",
    },
    {
        "name": "Farhan Ismail", "age": 38,
        "bio": "Partner at a Series A fund in Malaysia. Thesis: AI-native B2B tools for SMEs in Southeast Asia.",
        "headline": "Partner @ TechVentures MY | AI/Tech | B2B SaaS",
        "location": "Cyberjaya, Malaysia",
        "skills": ["AI Investments", "B2B SaaS", "Series A", "Term Sheet Negotiation", "Startup Due Diligence"],
        "education": ["BSc CS, UM, 2008", "MBA, NUS Business School, 2013"],
        "experience": ["Product Manager at Telekom Malaysia 2008-2013", "Principal at Axiata Digital Innovation Fund 2013-2020", "Partner at TechVentures MY 2020-present"],
        "active_personas": ["investor"], "industry": "AI / Tech",
    },

    # TECH TALENT
    {
        "name": "Mei Ling Tan", "age": 25,
        "bio": "Full-stack developer passionate about open source and developer tooling. Contributes to OSS projects.",
        "headline": "Full-Stack Dev @ Ninja Van | TypeScript | Go | Docker",
        "location": "Petaling Jaya, Malaysia",
        "skills": ["TypeScript", "Go", "Docker", "Kubernetes", "Next.js", "PostgreSQL"],
        "education": ["BSc Computer Science, Sunway University, 2022"],
        "experience": ["Intern at Grab 2021", "SWE at Ninja Van 2022-present"],
        "active_personas": ["tech_talent"], "industry": "AI / Tech",
    },
    {
        "name": "Rajan Krishnan", "age": 27,
        "bio": "Backend engineer specialising in distributed systems and real-time data pipelines at scale.",
        "headline": "Backend Engineer @ Shopee | Kafka | AWS | Java",
        "location": "Kuala Lumpur, Malaysia",
        "skills": ["Java", "Kafka", "AWS", "PostgreSQL", "Spring Boot", "Redis"],
        "education": ["BSc Computer Science, Multimedia University, 2021"],
        "experience": ["SWE at Maxis 2021-2022", "Backend Engineer at Shopee 2022-present"],
        "active_personas": ["tech_talent"], "industry": "AI / Tech",
    },
    {
        "name": "Nurul Ain Binti Hassan", "age": 26,
        "bio": "ML engineer focused on NLP for low-resource languages including Bahasa Malaysia and Malay dialects.",
        "headline": "ML Engineer @ Carsome | NLP | HuggingFace | PyTorch",
        "location": "Kuala Lumpur, Malaysia",
        "skills": ["Python", "HuggingFace", "PyTorch", "NLP", "LLMs", "Fine-tuning"],
        "education": ["MSc AI, UM, 2023"],
        "experience": ["Research Intern at MIMOS 2022", "ML Engineer at Carsome 2023-present"],
        "active_personas": ["tech_talent"], "industry": "AI / Tech",
    },

    # MENTORS
    {
        "name": "Uncle Raj Pillai", "age": 55,
        "bio": "Serial entrepreneur turned mentor. Built and successfully exited two SaaS companies in Malaysia.",
        "headline": "Mentor @ MaGIC | Serial Entrepreneur | 2x Exit",
        "location": "Kuala Lumpur, Malaysia",
        "skills": ["Startup Strategy", "Go-To-Market", "Fundraising", "Product Market Fit", "SaaS"],
        "education": ["BBA, UPM, 2005"],
        "experience": ["Founder at WorkflowApp (exited 2017)", "Founder at FormFlow (exited 2020)", "Mentor at MaGIC 2018-present"],
        "active_personas": ["mentor"], "industry": "AI / Tech",
    },
    {
        "name": "Puan Zalina Hassan", "age": 48,
        "bio": "Ecosystem builder and coach specialising in women-led startups. Ran 3 cohorts of Cradle's accelerator.",
        "headline": "Mentor & Ecosystem Builder | Women in Tech | Cradle Alumna",
        "location": "Putrajaya, Malaysia",
        "skills": ["Leadership", "Community Building", "Pitch Coaching", "Business Development", "Grant Writing"],
        "education": ["MBA, UUM, 2010"],
        "experience": ["Programme Manager at Cradle Fund 2010-2020", "Independent Startup Mentor 2020-present"],
        "active_personas": ["mentor"], "industry": "EdTech",
    },
]

LEGACY_EVENTS = [
    {"event_id": "gdg-devfest-2024", "name": "GDG KL DevFest 2024", "organiser": "GDG KL", "type": "conference"},
    {"event_id": "myhack-2025", "name": "MyHack 2025", "organiser": "Cradle Fund", "type": "hackathon"},
    {"event_id": "magic-accelerator-2024", "name": "MaGIC Accelerator Cohort 7", "organiser": "MaGIC", "type": "cohort"},
]

def build_embedding_text(p):
    return (
        f"{p['name']}. {p['bio']} "
        f"Skills: {', '.join(p['skills'])}. "
        f"Experience: {' | '.join(p['experience'])}. "
        f"Industry: {p.get('industry', '')}. "
        f"Personas: {', '.join(p['active_personas'])}."
    )

def embed(text):
    result = client.models.embed_content(model="gemini-embedding-001", contents=text)
    return result.embeddings[0].values

def seed():
    print("[*] Seeding PipeLink Firestore...\n")

    # Seed legacy events
    for event in LEGACY_EVENTS:
        db.collection("events").document(event["event_id"]).set(event)
    print("[OK] Legacy events seeded")

    # Seed user profiles with embeddings
    for i, p in enumerate(PROFILES):
        doc_ref = db.collection("users").document()
        uid = doc_ref.id
        embedding = embed(build_embedding_text(p))
        doc_ref.set({
            **p,
            "uid": uid,
            "email": f"{p['name'].lower().replace(' ', '.')}@pipelink.dev",
            "embedding_vector": embedding,
        })
        # Give each user 1-2 event engagements
        for event in random.sample(LEGACY_EVENTS, k=random.randint(1, 2)):
            db.collection("engagements").add({
                "user_id": uid,
                "event_name": event["name"],
                "form_id": event["event_id"],
                "role": random.choice(["participant", "speaker", "mentor"]),
                "check_in_at": "2025-01-15T09:00:00",
                "outcomes": "Completed project submission",
            })
        print(f"  [OK] Seeded: {p['name']} ({', '.join(p['active_personas'])})")

    print(f"\n[DONE] {len(PROFILES)} users seeded with embeddings and engagement data.")
    print("You can now run the event broadcast -- it will find real matches!")

if __name__ == "__main__":
    seed()
