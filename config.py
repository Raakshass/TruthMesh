"""Centralized configuration for TruthMesh prototype."""
import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    # Azure OpenAI
    AZURE_OPENAI_API_KEY = os.getenv("AZURE_OPENAI_API_KEY", "")
    AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT", "")
    AZURE_OPENAI_DEPLOYMENT_GPT4O = os.getenv("AZURE_OPENAI_DEPLOYMENT_GPT4O", "gpt-4o")
    AZURE_OPENAI_DEPLOYMENT_GPT4O_MINI = os.getenv("AZURE_OPENAI_DEPLOYMENT_GPT4O_MINI", "gpt-4o-mini")
    AZURE_OPENAI_API_VERSION = os.getenv("AZURE_OPENAI_API_VERSION", "2024-12-01-preview")

    # Bing Search
    BING_SEARCH_API_KEY = os.getenv("BING_SEARCH_API_KEY", "")

    # Content Safety
    AZURE_CONTENT_SAFETY_KEY = os.getenv("AZURE_CONTENT_SAFETY_KEY", "")
    AZURE_CONTENT_SAFETY_ENDPOINT = os.getenv("AZURE_CONTENT_SAFETY_ENDPOINT", "")

    # TruthMesh New Verification Integrations
    GOOGLE_FACTCHECK_API_KEY = os.getenv("GOOGLE_FACTCHECK_API_KEY", "")
    WOLFRAM_APP_ID = os.getenv("WOLFRAM_APP_ID", "")

    # App
    FIELD_ENCRYPTION_KEY = os.getenv("FIELD_ENCRYPTION_KEY", "")
    DEMO_MODE = os.getenv("DEMO_MODE", "true").lower() == "true"

    # Secure first-boot: admin/demo passwords from env vars (no hardcoded defaults)
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "")
    DEMO_PASSWORD = os.getenv("DEMO_PASSWORD", "")

    # Domains
    DOMAINS = ["Medical", "Legal", "Finance", "Science", "History", "Technology", "Policy"]
    MODELS = ["GPT-4o", "GPT-4o-mini", "Claude-3.5-Sonnet"]

    # ── Source Weights (Single Source of Truth) ──────────────────────────
    # Used by both verifier.py (source selection) and consensus.py (aggregation).
    SOURCE_WEIGHTS = {
        "Medical":    {"ai_search": 0.50, "pubmed": 0.15, "bing": 0.15, "cross_model": 0.10, "wolfram": 0.10},
        "Legal":      {"bing": 0.40, "factcheck": 0.30, "cross_model": 0.30},
        "Finance":    {"bing": 0.30, "wolfram": 0.30, "factcheck": 0.20, "cross_model": 0.20},
        "Science":    {"wikidata": 0.30, "ai_search": 0.25, "bing": 0.20, "wolfram": 0.15, "cross_model": 0.10},
        "History":    {"wikidata": 0.40, "bing": 0.30, "factcheck": 0.20, "cross_model": 0.10},
        "Technology": {"bing": 0.30, "ai_search": 0.25, "cross_model": 0.25, "wikidata": 0.20},
        "Policy":     {"factcheck": 0.35, "bing": 0.30, "cross_model": 0.20, "wikidata": 0.15},
        "General":    {"factcheck": 0.35, "bing": 0.35, "cross_model": 0.20, "wikidata": 0.10},
    }
    DEFAULT_WEIGHTS = {"bing": 0.30, "factcheck": 0.25, "cross_model": 0.25, "wikidata": 0.20}

    @classmethod
    def has_azure_openai(cls) -> bool:
        return bool(cls.AZURE_OPENAI_API_KEY and cls.AZURE_OPENAI_ENDPOINT)

    @classmethod
    def has_bing(cls) -> bool:
        return bool(cls.BING_SEARCH_API_KEY)

    @classmethod
    def has_content_safety(cls) -> bool:
        return bool(cls.AZURE_CONTENT_SAFETY_KEY and cls.AZURE_CONTENT_SAFETY_ENDPOINT)

    @classmethod
    def get_azure_openai_client(cls):
        """Return an AsyncAzureOpenAI client, or None if keys are missing."""
        if not cls.has_azure_openai():
            return None
        try:
            from openai import AsyncAzureOpenAI
            return AsyncAzureOpenAI(
                api_key=cls.AZURE_OPENAI_API_KEY,
                azure_endpoint=cls.AZURE_OPENAI_ENDPOINT,
                api_version=cls.AZURE_OPENAI_API_VERSION,
            )
        except Exception:
            return None
