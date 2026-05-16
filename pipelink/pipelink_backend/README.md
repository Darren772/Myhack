# PipeLink 🔗

> AI-powered event ecosystem platform — connect founders, investors, and participants using semantic matching.

PipeLink lets event hosts find and invite the most compatible attendees using AI. Participants browse events, join as a participant or sponsor, and get matched based on their LinkedIn profile.

---

## What You'll Need Before Starting

Before running PipeLink, you need to collect a few things. Here's exactly where to get each one:

### 1. Python 3.11+
Download from: https://www.python.org/downloads/
- During install, tick **"Add Python to PATH"**
- Verify: open a terminal and run `python --version`

### 2. Node.js 18+
Download from: https://nodejs.org/en/download
- Choose the **LTS** version
- Verify: `node --version`

### 3. Google Gemini API Key
1. Go to: https://aistudio.google.com/app/apikey
2. Click **"Create API Key"**
3. Copy the key — looks like `AIzaSy...`

### 4. Firebase Project (Firestore + Auth)
1. Go to: https://console.firebase.google.com
2. Click **"Add project"** → give it a name → create
3. In the left sidebar → **Firestore Database** → **Create database** → choose **Production mode** → pick a region
4. In the left sidebar → **Authentication** → **Get started** → enable **Google** sign-in provider

**Get the Web App Config:**
- Go to: Project Settings (gear icon) → **Your apps** → click **Web** icon `</>`
- Register your app → copy the config block (you'll need all 6 values)

**Get the Service Account Key (for backend):**
- Go to: Project Settings → **Service accounts** → **Generate new private key**
- Download the JSON file → rename it `serviceAccountKey.json`
- Place it inside the `pipelink_backend/` folder

### 5. Gmail App Password (for sending emails)
This lets PipeLink email matched attendees automatically.

1. Sign in to the Gmail account you want to send from
2. Enable 2-Step Verification: https://myaccount.google.com/security
3. Go to: https://myaccount.google.com/apppasswords
4. Type `PipeLink` in the app name box → click **Create**
5. Copy the **16-character code** shown (e.g. `abcdefghijklmnop`)

> ⚠️ If you skip this, emails won't send but everything else still works (dry-run mode).

---

## Installation

### Step 1 — Clone the repo

```bash
git clone https://github.com/your-username/pipelink.git
cd pipelink
```

### Step 2 — Set up environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in all the values:

```
GEMINI_API_KEY=AIzaSy...                    ← from step 3 above
FIREBASE_SERVICE_ACCOUNT_PATH=./pipelink_backend/serviceAccountKey.json

NEXT_PUBLIC_FIREBASE_API_KEY=...            ← from Firebase web app config
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

GMAIL_USER=your_gmail@gmail.com             ← optional, for email sending
GMAIL_APP_PASSWORD=abcdefghijklmnop         ← optional, 16-char App Password
```

### Step 3 — Install backend dependencies

```bash
cd pipelink_backend
python -m venv venv

# Windows:
.\\venv\\Scripts\\activate

# macOS / Linux:
source venv/bin/activate

pip install -r requirements.txt
cd ..
```

### Step 4 — Install frontend dependencies

```bash
cd pipelink_frontend
npm install
cd ..
```

### Step 5 — Place your Firebase service account key

Copy the downloaded `serviceAccountKey.json` into the `pipelink_backend/` folder:
```
pipelink_backend/serviceAccountKey.json    ← must be here
```

---

## Running Locally

### Windows (easiest)

From the `pipelink/` directory, run:
```powershell
.\\start.ps1
```

This automatically starts both the backend and frontend in separate windows and opens your browser.

### Manual (macOS / Linux / Windows)

Open **two terminals**:

**Terminal 1 — Backend:**
```bash
cd pipelink_backend
source venv/bin/activate    # or .\\venv\\Scripts\\activate on Windows
uvicorn main:app --reload --port 8000
```

**Terminal 2 — Frontend:**
```bash
cd pipelink_frontend
npm run dev
```

Then open: **http://localhost:3000**

---

## How to Use PipeLink

### As a Participant / Sponsor

1. **Sign up** — go to http://localhost:3000 → click **Get Started** → sign in with Google
2. **Set up your profile** — paste your LinkedIn URL or text → AI extracts your skills and experience
3. **Browse events** — go to the **Feed** → filter by industry or search by name
4. **Join an event** — click **Join →** on any event → choose your role (Participant or Sponsor)
5. **View your history** — click **My Events** to see all events you've joined

### As an Event Host

1. **Activate Host account** — click **+ Post Event** → click **"Activate Host Account"** (free)
2. **Create your event** — fill in:
   - Event title & description
   - Industry (click the pill to select)
   - Event date
   - Google Form links for participants and sponsors
   - Email subject & body for each group
3. **Save a preset** — reuse your form links and email templates next time
4. **Find Matches** — click **Find Matches** on Step 3 → AI ranks all users by compatibility → emails are sent automatically
5. **Manage attendees** — go to **Manage →** on your event card to see who joined, their profiles, and email delivery stats

---

## Project Structure

```
pipelink/
├── pipelink_backend/        # Python FastAPI backend
│   ├── main.py              # All API routes
│   ├── firebase_client.py   # Firestore read/write helpers
│   ├── agents/
│   │   ├── profile_parser.py    # LinkedIn → structured JSON (Gemini)
│   │   ├── embedder.py          # Profile text → vector (Gemini Embedding)
│   │   ├── event_broadcaster.py # AI match + Gmail email dispatch
│   │   ├── matcher.py           # Cosine similarity search
│   │   ├── recommender.py       # Match explanation generator
│   │   ├── form_sync.py         # Google Forms webhook handler
│   │   ├── journey_summary.py   # AI narrative journey generator
│   │   └── linkedin_scraper.py  # LinkedIn URL scraper
│   ├── seed.py              # Seed demo user profiles
│   ├── seed_events.py       # Seed demo events
│   └── requirements.txt
│
├── pipelink_frontend/       # Next.js 14 frontend
│   └── src/app/
│       ├── page.tsx         # Landing page
│       ├── feed/            # Event discovery feed
│       ├── setup/           # Profile onboarding
│       ├── events/new/      # Create event (3-step wizard)
│       ├── events/[id]/     # Event detail + manage page
│       ├── presets/         # Reusable event templates
│       ├── my-events/       # Dashboard (hosted + joined)
│       └── journey/         # AI career narrative
│
├── .env.example             # Environment variable template
├── .env                     # Your local secrets (git-ignored)
└── start.ps1                # One-command launcher (Windows)
```

---

## How the AI Matching Works

1. **User profile** → Gemini reads LinkedIn text → extracts name, bio, skills, experience
2. **Profile embedding** → Gemini converts the profile into a 3,072-number vector
3. **Event embedding** → when host launches, Gemini converts the event description into a vector
4. **Cosine similarity** → each user's vector is compared to the event vector → score 0–1
5. **Ranked & split** → users with `investor` persona → sponsor email; everyone else → participant email
6. **Email sent** → host's exact email body is sent, only `{{name}}` is personalised

---

## Environment Variables Reference

| Variable | Required | Where to get it |
|---|---|---|
| `GEMINI_API_KEY` | ✅ | https://aistudio.google.com/app/apikey |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | ✅ | Firebase Console → Service Accounts |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | ✅ | Firebase Console → Project Settings → Web App |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | ✅ | Same |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | ✅ | Same |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | ✅ | Same |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | ✅ | Same |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | ✅ | Same |
| `NEXT_PUBLIC_API_URL` | ✅ | `http://localhost:8000` for local dev |
| `GMAIL_USER` | Optional | Your Gmail address |
| `GMAIL_APP_PASSWORD` | Optional | https://myaccount.google.com/apppasswords |
| `WEBHOOK_SECRET` | Optional | Any random string |
