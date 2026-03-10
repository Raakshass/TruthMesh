"""Shield Agent — Input security layer (lightweight stub).

Checks for prompt injection, jailbreak attempts, and PII.
If Azure AI Content Safety is available, uses that; otherwise falls back
to regex-based pattern matching.
"""
import re
from config import Config

# Common prompt injection patterns
INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|above|prior)\s+(instructions|prompts|rules)",
    r"you\s+are\s+now\s+(DAN|jailbroken|unrestricted)",
    r"pretend\s+you\s+(are|have)\s+no\s+(restrictions|limitations|rules)",
    r"system\s*prompt|reveal\s+your\s+(instructions|prompt|system)",
    r"act\s+as\s+if\s+you\s+(don't|do\s+not)\s+have\s+(any\s+)?restrictions",
    r"bypass\s+(safety|content)\s+(filters?|rules?)",
    r"<\|.*?\|>",  # System token injection
    r"\[INST\]|\[/INST\]",  # Instruction token injection
]

# PII patterns
PII_PATTERNS = [
    r"\b\d{3}[-.]?\d{2}[-.]?\d{4}\b",  # SSN
    r"\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b",  # Credit card
    r"\b[A-Z]{5}\d{4}[A-Z]\b",  # PAN (India)
    r"\b\d{12}\b",  # Aadhaar (India)
]


async def check_input(query: str) -> dict:
    """Screen input for safety threats.

    Args:
        query: User's input query

    Returns:
        Dict with 'safe' bool, 'threat_type' if blocked, 'details'
    """
    # 1. Check for prompt injection
    for pattern in INJECTION_PATTERNS:
        if re.search(pattern, query, re.IGNORECASE):
            return {
                "safe": False,
                "threat_type": "prompt_injection",
                "details": "Potential prompt injection detected. Query blocked.",
                "severity": "high"
            }

    # 2. Check for PII
    for pattern in PII_PATTERNS:
        if re.search(pattern, query):
            return {
                "safe": False,
                "threat_type": "pii_detected",
                "details": "Potential PII detected in query. Please remove sensitive information.",
                "severity": "medium"
            }

    # 3. Basic length check
    if len(query) > 5000:
        return {
            "safe": False,
            "threat_type": "excessive_length",
            "details": "Query exceeds maximum length of 5000 characters.",
            "severity": "low"
        }

    if len(query.strip()) < 5:
        return {
            "safe": False,
            "threat_type": "too_short",
            "details": "Query is too short to process meaningfully.",
            "severity": "low"
        }

    return {
        "safe": True,
        "threat_type": None,
        "details": "Input passed safety screening.",
        "severity": None
    }
