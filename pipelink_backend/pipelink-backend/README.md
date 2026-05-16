# PipeLink Backend

FastAPI backend for PipeLink — AI-powered ecosystem profiling & investor matching.

## Architecture

The backend is organised around **6 AI agents**, each handling one step of the pipeline:

| # | Agent | File | Purpose |
|---|-------|------|---------|
| 1 | Profile Parser | `agents/profile_parser.py` | LinkedIn text → structured fields |
| 2 | Form Sync | `agents/form_sync.py` | Google Form payload → profile schema |
| 3 | Embedder | `agents/embedder.py` | Profile text → embedding vector |
| 4 | Matcher | `agents/matcher.py` | Query embedding → cosine similarity search |
| 5 | Recommender | `agents/recommender.py` | Matched profiles → plain-English explanations |
| 6 | Journey Summary | `agents/journey_summary.py` | Full profile → narrative paragraph |

## Setup

```bash
# 1. Create a virtual environment
python -m venv venv
source venv/bin/activate   # or .\venv\Scripts\activate on Windows

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env
# Edit .env with your GEMINI_API_KEY and GOOGLE_APPLICATION_CREDENTIALS

# 4. Run the server
uvicorn main:app --reload --port 8000
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Health check |
| `POST` | `/api/parse-linkedin` | Parse LinkedIn text into structured profile |
| `POST` | `/api/form-sync` | Webhook for Google Forms / Apps Script |
| `POST` | `/api/embed-profile` | Generate & store embedding for a profile |
| `POST` | `/api/match` | Search for matching investors / mentors |
| `POST` | `/api/journey` | Generate ecosystem journey summary |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Google Gemini API key |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to Firebase service account JSON |
