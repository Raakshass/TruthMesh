"""Domain Classifier — Generates probability vector across knowledge domains.

Uses Azure OpenAI with structured JSON output, falls back to keyword-based
classification if API is unavailable.
"""
import json
import re
from config import Config  # type: ignore

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
    "Technology": [
        "software", "hardware", "computer", "algorithm", "artificial intelligence",
        "code", "programming", "cloud", "data", "cybersecurity", "encryption",
        "network", "server", "internet", "web", "mobile", "app", "device",
        "machine learning", "database", "api", "framework", "system"
    ],
    "Policy": [
        "government", "election", "vote", "congress", "senate", "parliament",
        "legislation", "policy", "diplomacy", "international", "relations",
        "treaty", "campaign", "candidate", "president", "minister", "mayor",
        "regulation", "public", "welfare", "subsidy", "bipartisan", "debate"
    ]
}

CLASSIFICATION_PROMPT = """You are a domain classifier. Given a user query, output a JSON probability vector
indicating which knowledge domains the query belongs to. The probabilities must sum to 1.0.

Domains: {domains}

Output ONLY valid JSON, no explanation. Example:
{example}

User query: {query}"""


def classify_by_keywords(query: str) -> dict:
    """Fallback keyword-based domain classification."""
    query_lower = query.lower()
    scores = {}
    total = 0

    for domain, keywords in DOMAIN_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in query_lower)
        # Add small epsilon to avoid all-zero
        score = max(float(score), 0.1)
        scores[domain] = score
        total += score

    # Normalize to probabilities
    return {domain: round(score / total, 3) for domain, score in scores.items()}  # type: ignore


async def classify_domain(query: str, openai_client=None) -> dict:
    """Classify query into domain probability vector.

    Args:
        query: User's natural language query
        openai_client: Optional Azure OpenAI async client

    Returns:
        Dict mapping domain names to probabilities (sum to 1.0)
    """
    if openai_client and Config.has_azure_openai():
        try:
            domains_str = ", ".join(Config.DOMAINS)
            example_dict = {d: 0.0 for d in Config.DOMAINS}
            if len(Config.DOMAINS) >= 4:
                example_dict[Config.DOMAINS[0]] = 0.55
                example_dict[Config.DOMAINS[1]] = 0.40
                example_dict[Config.DOMAINS[3]] = 0.05
            else:
                example_dict[Config.DOMAINS[0]] = 1.0

            prompt = CLASSIFICATION_PROMPT.format(
                domains=domains_str,
                example=json.dumps(example_dict),
                query=query
            )

            response = await openai_client.chat.completions.create(
                model=Config.AZURE_OPENAI_DEPLOYMENT_GPT4O_MINI,
                messages=[
                    {"role": "system", "content": "You are a precise domain classifier. Output only JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=150,
                response_format={"type": "json_object"}
            )
            result = json.loads(response.choices[0].message.content)
            
            if isinstance(result, dict):
                # Normalize missing domains to 0.0
                clean_result = {k: float(v) for k, v in result.items() if isinstance(v, (int, float))}
                total = sum(clean_result.values())
                if total > 0:
                    return {d: round(float(clean_result.get(d, 0.0) / total), 3) for d in Config.DOMAINS}  # type: ignore
        except Exception as e:
            print(f"[CLASSIFIER] Azure OpenAI failed, using keyword fallback: {e}")

    # Fallback to keyword classification
    return classify_by_keywords(query)
