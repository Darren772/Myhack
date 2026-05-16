import google.generativeai as genai
import os

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-3.1-flash-lite")

def explain_match(query: str, profile: dict, score: float) -> str:
    """Generate a plain-English explanation of why a single profile matches the query."""
    skills_str = ", ".join(profile.get("skills", []))
    experience_str = " | ".join([str(e) for e in profile.get("experience", [])])
    personas_str = ", ".join(profile.get("active_personas", []))

    prompt = f"""You are an ecosystem matchmaking assistant.
Explain in 1-2 sentences why this person is a good match for the search query.
Be specific about relevant skills, experience, or persona alignment.

Search query: {query}
Match score: {round(score * 100, 1)}%

Profile:
- Name: {profile.get('name', 'Unknown')}
- Personas: {personas_str}
- Bio: {profile.get('bio', '')}
- Skills: {skills_str}
- Experience: {experience_str}

Return ONLY the explanation text, no JSON, no markdown."""

    response = model.generate_content(
        prompt,
        generation_config=genai.GenerationConfig(temperature=0.3)
    )
    return response.text.strip()
