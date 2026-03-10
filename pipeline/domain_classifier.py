"""Domain Classifier — Generates probability vector across knowledge domains.

Uses Azure OpenAI with structured JSON output, falls back to keyword-based
classification if API is unavailable.
"""
import json
import re
from config import Config

# Keyword-based fallback classifier
DOMAIN_KEYWORDS = {
    "Medical": [
        "drug", "medicine", "treatment", "diagnosis", "patient", "clinical",
        "disease", "symptom", "doctor", "hospital", "pharmaceutical", "dosage",
        "surgery", "therapy", "health", "medical", "cancer", "diabetes",
        "infection", "antibiotic", "vaccine", "prescription", "interaction",
        "side effect", "contraindication", "pathology", "anatomy", "physiology"
    ],
    "Legal": [
        "law", "court", "legal", "statute", "regulation", "contract", "liability",
        "jurisdiction", "precedent", "case law", "litigation", "compliance",
        "amendment", "constitution", "article", "section", "act", "rights",
        "prosecution", "defendant", "plaintiff", "judgment", "arbitration",
        "force majeure", "tort", "negligence", "intellectual property"
    ],
    "Finance": [
        "stock", "bond", "investment", "market", "bank", "financial",
        "interest rate", "inflation", "gdp", "revenue", "profit", "loss",
        "portfolio", "dividend", "equity", "debt", "credit", "loan",
        "capital", "ratio", "risk", "return", "valuation", "trading",
        "fiscal", "monetary", "budget", "tax", "audit", "compliance"
    ],
    "Science": [
        "physics", "chemistry", "biology", "quantum", "atom", "molecule",
        "energy", "force", "gravity", "evolution", "cell", "dna", "gene",
        "experiment", "hypothesis", "theory", "scientific", "research",
        "electron", "proton", "neutron", "temperature", "pressure",
        "mathematical", "formula", "equation", "element", "compound"
    ],
    "History": [
        "war", "century", "ancient", "medieval", "revolution", "empire",
        "dynasty", "civilization", "historical", "era", "period", "king",
        "queen", "colony", "independence", "treaty", "battle", "conquest",
        "movement", "reform", "industrial", "renaissance", "enlightenment",
        "founded", "established", "declaration", "constitution"
    ],
}

CLASSIFICATION_PROMPT = """You are a domain classifier. Given a user query, output a JSON probability vector
indicating which knowledge domains the query belongs to. The probabilities must sum to 1.0.

Domains: Medical, Legal, Finance, Science, History

Output ONLY valid JSON, no explanation. Example:
{"Medical": 0.55, "Legal": 0.40, "Finance": 0.0, "Science": 0.05, "History": 0.0}

User query: {query}"""


def classify_by_keywords(query: str) -> dict:
    """Fallback keyword-based domain classification."""
    query_lower = query.lower()
    scores = {}
    total = 0

    for domain, keywords in DOMAIN_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in query_lower)
        # Add small epsilon to avoid all-zero
        score = max(score, 0.1)
        scores[domain] = score
        total += score

    # Normalize to probabilities
    return {domain: round(score / total, 3) for domain, score in scores.items()}


async def classify_domain(query: str, openai_client=None) -> dict:
    """Classify query into domain probability vector.

    Args:
        query: User's natural language query
        openai_client: Optional Azure OpenAI async client

    Returns:
        Dict mapping domain names to probabilities (sum to 1.0)
    """
    # Try Azure OpenAI first
    if openai_client and Config.has_azure_openai():
        try:
            response = await openai_client.chat.completions.create(
                model=Config.AZURE_OPENAI_DEPLOYMENT_GPT4O,
                messages=[
                    {"role": "system", "content": "You are a precise domain classifier. Output only JSON."},
                    {"role": "user", "content": CLASSIFICATION_PROMPT.format(query=query)}
                ],
                temperature=0.1,
                max_tokens=150,
                response_format={"type": "json_object"}
            )
            result = json.loads(response.choices[0].message.content)
            # Validate structure
            if all(d in result for d in Config.DOMAINS):
                # Normalize
                total = sum(result.values())
                if total > 0:
                    return {d: round(result[d] / total, 3) for d in Config.DOMAINS}
        except Exception as e:
            print(f"[CLASSIFIER] Azure OpenAI failed, using keyword fallback: {e}")

    # Fallback to keyword classification
    return classify_by_keywords(query)
