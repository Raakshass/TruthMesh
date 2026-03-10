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

    # App
    DEMO_MODE = os.getenv("DEMO_MODE", "true").lower() == "true"
    DB_PATH = os.getenv("DB_PATH", "truthmesh.db")

    # Domains
    DOMAINS = ["Medical", "Legal", "Finance", "Science", "History"]
    MODELS = ["GPT-4o", "GPT-4o-mini", "Claude-3.5-Sonnet"]

    @classmethod
    def has_azure_openai(cls) -> bool:
        return bool(cls.AZURE_OPENAI_API_KEY and cls.AZURE_OPENAI_ENDPOINT)

    @classmethod
    def has_bing(cls) -> bool:
        return bool(cls.BING_SEARCH_API_KEY)

    @classmethod
    def has_content_safety(cls) -> bool:
        return bool(cls.AZURE_CONTENT_SAFETY_KEY and cls.AZURE_CONTENT_SAFETY_ENDPOINT)
