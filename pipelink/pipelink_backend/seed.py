import os, asyncio
from dotenv import load_dotenv
load_dotenv()

import firebase_admin
from firebase_admin import credentials, firestore
import google.generativeai as genai

cred = credentials.Certificate(os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH"))
firebase_admin.initialize_app(cred)
db = firestore.client()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

PROFILES = [
    {"name": "Aisha Razak", "bio": "Founder of a fintech startup automating SME payroll in Malaysia.", "skills": ["Python", "Django", "Stripe API", "Fintech"], "education": ["BSc Computer Science, UM, 2021"], "experience": ["SWE at CIMB 2021-2023", "Founder at PayEasy 2023-present"], "active_personas": ["founder"]},
    {"name": "Darren Loh", "bio": "EdTech founder building AI tutoring for Bahasa Malaysia students.", "skills": ["React", "Node.js", "Gemini API", "EdTech"], "education": ["BSc Software Eng, UTM, 2020"], "experience": ["Frontend Dev at Axiata 2020-2022", "Founder at TutorAI 2022-present"], "active_personas": ["founder", "tech_talent"]},
    {"name": "Priya Nair", "bio": "Healthtech founder connecting rural patients with telemedicine in Sabah.", "skills": ["Flutter", "Firebase", "Healthcare", "UX Design"], "education": ["MBBS, UPM, 2019"], "experience": ["Doctor at KKM 2019-2022", "Founder at TeleHealth Sabah 2022-present"], "active_personas": ["founder"]},
    {"name": "Hafiz Zulkifli", "bio": "Food-tech founder building a cloud kitchen OS for Malaysian F&B operators.", "skills": ["Python", "Machine Learning", "IoT", "F&B Operations"], "education": ["BSc Electrical Eng, UiTM, 2020"], "experience": ["Engineer at Maxis 2020-2022", "Founder at KitchenOS 2022-present"], "active_personas": ["founder"]},
    {"name": "Mei Ling Tan", "bio": "Full-stack developer passionate about open source and developer tooling.", "skills": ["TypeScript", "Go", "Docker", "Kubernetes"], "education": ["BSc CS, Sunway University, 2022"], "experience": ["SWE at Ninja Van 2022-present"], "active_personas": ["tech_talent"]},
    {"name": "Rajan Krishnan", "bio": "Backend engineer specialising in distributed systems and real-time data.", "skills": ["Java", "Kafka", "AWS", "PostgreSQL"], "education": ["BSc CS, Multimedia University, 2021"], "experience": ["Backend Dev at Shopee 2021-present"], "active_personas": ["tech_talent"]},
    {"name": "Nurul Ain", "bio": "ML engineer focused on NLP for Bahasa Malaysia and low-resource languages.", "skills": ["Python", "HuggingFace", "PyTorch", "NLP"], "education": ["MSc AI, UM, 2023"], "experience": ["Research Intern at MIMOS 2022", "ML Engineer at Carsome 2023-present"], "active_personas": ["tech_talent"]},
    {"name": "David Yeoh", "bio": "Angel investor focused on early-stage B2B SaaS and fintech in SEA.", "skills": ["Due Diligence", "Term Sheets", "SaaS Metrics", "Corporate Finance"], "education": ["MBA, INSEAD, 2015"], "experience": ["VP at Maybank IB 2010-2018", "Angel Investor 2018-present"], "active_personas": ["investor"]},
    {"name": "Sarah Abdullah", "bio": "VC associate at a KL-based fund investing in climate tech and agri-tech.", "skills": ["Climate Tech", "Agri-Tech", "Venture Capital", "Impact Investing"], "education": ["BSc Environmental Eng, UM, 2018"], "experience": ["Analyst at MAVCAP 2018-2021", "VC Associate at GreenVC 2021-present"], "active_personas": ["investor"]},
    {"name": "Uncle Raj Pillai", "bio": "Serial entrepreneur turned mentor. Built and exited two SaaS companies.", "skills": ["Startup Strategy", "GTM", "Fundraising", "Product Market Fit"], "education": ["BBA, UPM, 2005"], "experience": ["Founder at WorkflowApp (exited 2017)", "Mentor at MaGIC 2018-present"], "active_personas": ["mentor"]},
    {"name": "Puan Zalina Hassan", "bio": "Ecosystem builder and mentor specialising in women-led startups in Malaysia.", "skills": ["Leadership", "Community Building", "Pitch Coaching", "Business Development"], "education": ["MBA, UUM, 2010"], "experience": ["Programme Manager at Cradle 2010-2020", "Independent Mentor 2020-present"], "active_personas": ["mentor"]},
    # Rich cross-persona profile — the hero demo profile
    {"name": "Izzat Fauzi", "bio": "Started as a hackathon developer, now building an AI recruitment platform. Mentors junior devs on weekends.", "skills": ["Python", "Next.js", "Gemini API", "Firebase", "Recruiting Tech"], "education": ["BSc CS, UTP, 2022"], "experience": ["SWE at Grab 2022-2023", "Founder at HireAI 2023-present", "Mentor at GDG KL 2024-present"], "active_personas": ["founder", "tech_talent", "mentor"]},
]

EVENTS = [
    {"event_id": "gdg-devfest-2024", "name": "GDG KL DevFest 2024", "organiser": "GDG KL", "type": "conference"},
    {"event_id": "myhack-2025", "name": "MyHack 2025", "organiser": "Cradle Fund", "type": "hackathon"},
    {"event_id": "magic-accelerator-2024", "name": "MaGIC Accelerator Cohort 7", "organiser": "MaGIC", "type": "cohort"},
]

def build_embedding_text(p):
    return f"{p['name']}. {p['bio']} Skills: {', '.join(p['skills'])}. Experience: {' | '.join(p['experience'])}"

def embed(text):
    result = genai.embed_content(model="models/text-embedding-004", content=text, task_type="RETRIEVAL_DOCUMENT")
    return result["embedding"]

def seed():
    # Seed events
    for event in EVENTS:
        db.collection("events").document(event["event_id"]).set(event)
    print("✅ Events seeded")

    # Seed profiles
    for i, p in enumerate(PROFILES):
        doc_ref = db.collection("users").document()
        uid = doc_ref.id
        embedding = embed(build_embedding_text(p))
        doc_ref.set({**p, "uid": uid, "email": f"demo_{i}@pipelink.dev", "embedding_vector": embedding})

        # Give each profile 1-2 engagements
        import random
        for event in random.sample(EVENTS, k=random.randint(1, 2)):
            db.collection("engagements").add({
                "user_id": uid,
                "event_name": event["name"],
                "form_id": event["event_id"],
                "role": random.choice(["participant", "mentor", "speaker"]),
                "check_in_at": "2024-11-01T09:00:00",
                "outcomes": "Completed project submission"
            })
        print(f"✅ Seeded: {p['name']}")

    print("\n🎉 All profiles seeded with embeddings!")

if __name__ == "__main__":
    seed()
