# ARCHITECTURE

## System Pattern
Client-Server architecture with a decoupled React SPA frontend and a FastAPI JSON API backend. The system heavily leverages external APIs for retrieving ground truth and evaluating entailment via LLM-based NLI.

## Core Layers
1.  **Frontend (React SPA):** Handles UI components, networking visualisations (3D graph), client-side routing, and real-time Server-Sent Events (SSE) updates via `useEventStream`.
2.  **API Routing (`router.py`):** Exposes JSON endpoints (`/verify`, `/auth`, `/ground_truth/*`).
3.  **Verification Engine (`pipeline/verifier.py`):** Multi-source retrieval augmented generation logic. Decides based on claim topics whether to route to domain-specific APIs (PubMed, FactCheck, Wikidata, Wolfram) or fallback APIs (Bing). It uses Azure OpenAI to judge entailment.
4.  **Database (`database.py`):** SQLite data layer mapping tables for queries, topologies, verification history, users, and the new ground truth engine.
5.  **Job Scheduler (`jobs.py`):** Runs chron tasks for automated data cleanup, schema self-audits, etc.

## Data Flow (Verification)
1.  Client submits claim via `/verify` (POST).
2.  `router.py` passes the request to `verifier.py:evaluate_entailment()`.
3.  `verifier.py` routes the claim to the appropriate API source.
4.  Retrieved evidence is sent to Azure OpenAI for NLI Entailment.
5.  Results are stored in `verification_history` and `query_log`.
6.  The result is streamed back to the client via SSE.
