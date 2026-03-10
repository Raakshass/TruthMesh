"""Claim Decomposer — Breaks LLM responses into atomic verifiable claims.

Uses Azure OpenAI for structured decomposition, falls back to
sentence-level splitting if API is unavailable.
"""
import json
import re
from config import Config

DECOMPOSE_PROMPT = """You are a claim decomposer. Break the following text into atomic, independently verifiable claims.
Each claim should be a single factual statement that can be checked against external sources.

Rules:
- Extract only factual/numerical claims, skip opinions and hedging language
- Each claim should be self-contained
- Classify each claim as: "factual", "numerical", or "procedural"

Output ONLY valid JSON array. Example:
[
  {"claim": "Metformin is a first-line treatment for type 2 diabetes", "type": "factual"},
  {"claim": "The recommended starting dose is 500mg twice daily", "type": "numerical"}
]

Text to decompose:
{text}"""


def decompose_by_sentences(text: str) -> list:
    """Fallback: split text into sentence-level claims."""
    # Split on sentence boundaries
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    claims = []
    for sent in sentences:
        sent = sent.strip()
        if len(sent) > 20 and not sent.startswith(("I think", "Perhaps", "Maybe", "It seems")):
            # Guess type
            claim_type = "factual"
            if any(c.isdigit() for c in sent) and any(w in sent.lower() for w in
                    ["percent", "%", "ratio", "rate", "number", "million", "billion"]):
                claim_type = "numerical"
            claims.append({"claim": sent, "type": claim_type})
    return claims[:8]  # Cap at 8 claims for demo


async def decompose_claims(text: str, openai_client=None) -> list:
    """Decompose text into atomic verifiable claims.

    Args:
        text: LLM response text to decompose
        openai_client: Optional Azure OpenAI async client

    Returns:
        List of dicts with 'claim' and 'type' keys
    """
    if openai_client and Config.has_azure_openai():
        try:
            response = await openai_client.chat.completions.create(
                model=Config.AZURE_OPENAI_DEPLOYMENT_GPT4O,
                messages=[
                    {"role": "system", "content": "You decompose text into verifiable claims. Output only JSON."},
                    {"role": "user", "content": DECOMPOSE_PROMPT.format(text=text)}
                ],
                temperature=0.1,
                max_tokens=800,
                response_format={"type": "json_object"}
            )
            content = response.choices[0].message.content
            result = json.loads(content)
            if isinstance(result, dict) and "claims" in result:
                result = result["claims"]
            if isinstance(result, list) and len(result) > 0:
                return result[:8]
        except Exception as e:
            print(f"[DECOMPOSER] Azure OpenAI failed, using sentence fallback: {e}")

    return decompose_by_sentences(text)
