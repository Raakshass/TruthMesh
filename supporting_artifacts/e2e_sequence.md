# End-to-End Verification Sequence

> **WARNING:** Your current SSE stream loop (`main.py`) introduces artificial 0.8s `await _sleep()` delays per cached component. The competitor's team streams their interface instantly.

```mermaid
sequenceDiagram
    participant U as User (React SPA)
    participant API as FastAPI Boundary
    participant C as Cache & DB
    participant AI as Azure OpenAI

    U->>API: POST /api/query { "query": "..." }
    API->>AI: Classify Domain
    AI-->>API: Vector [Tech: 0.9, Health: 0.1]
    API->>C: log_query (Awaiting O(1) DB Index)
    API-->>U: Return query_id

    U->>API: GET /api/verify/{query_id} (SSE)
    API->>C: Check Cache
    alt Cache Hit
        C-->>API: Pre-verified Result
        API-->>U: [INSTANT STREAM - You are failing this] Results
    else Cache Miss
        API->>AI: generate_response
        AI-->>API: Raw Text
        API->>AI: decompose_claims
        AI-->>API: Claims Array
        par Verify Claims
            API->>AI: Verify Claim 1
            API->>AI: Verify Claim 2
        end
        API->>C: update_query_trust
        API-->>U: Stream Analysis Events
    end
```
