# CONCERNS

## Technical Debt & Fragility
1.  **Testing Deficit:** As noted in `TESTING.md`, the lack of unit tests makes modifying `verifier.py` extremely risky due to brittle LLM-based logic loops. This must be addressed securely.
2.  **Linting Issues in DB:** `database.py` has multiple reported type and structural linting bugs from rapid iteration in recent phases.
3.  **API Rate Limits:** Integration with Wikidata, PubMed, and Fact Check currently lack robust long-term caching and back-off retry logic, making the verification pipeline susceptible to 429 timeouts.
4.  **Security:** JWT relies purely on local custom logic with weak hash/base64 checking. We should consider replacing it with standard OAuth tools or `bcrypt`.

## Phase 8 Transition
*   The newly added `ground_truth_repository` requires aggressive backend validation to ensure automated ingestion processes don't poison the self-audit database.
