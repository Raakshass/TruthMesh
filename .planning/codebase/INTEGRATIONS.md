# INTEGRATIONS

## Core AI & Verification
*   **Azure OpenAI (`gpt-4o-mini`):** Used for domain classification, claim decomposition, and NLI semantic entailment.
*   **Bing Search API:** Fallback verification layer for unstructured retrieval.
*   **PubMed / NCBI E-utilities:** Domain-specific source for medical/clinical claims.
*   **Google Fact Check API:** Domain-specific source for news/general claims.
*   **Wikidata SPARQL:** Structured knowledge graph source for entity relationships and historical/science facts.
*   **Wolfram Alpha API:** Domain-specific source for numerical and computational queries.

## Authentication
*   **Custom JWT:** Local JWT verification, currently not relying on external IDPs (e.g., OAuth2).
