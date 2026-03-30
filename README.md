<div align="center">
  <img src="https://raw.githubusercontent.com/microsoft/fluentui-system-icons/master/assets/Shield%20Checkmark/SVG/ic_fluent_shield_checkmark_48_filled.svg" width="120" alt="TruthMesh Logo"/>
  <h1>TruthMesh Verification Engine</h1>
  <p><strong>A Pre-Cognitive, Self-Auditing Hallucination Topography Engine for Enterprise AGI</strong></p>

  <p>
    <img src="https://img.shields.io/badge/Python-3.11+-blue.svg?style=for-the-badge&logo=python" alt="Python Version"/>
    <img src="https://img.shields.io/badge/FastAPI-0.111.0-009688.svg?style=for-the-badge&logo=fastapi" alt="FastAPI"/>
    <img src="https://img.shields.io/badge/Azure_Cosmos_DB-0078D4.svg?style=for-the-badge&logo=microsoft-azure" alt="Azure Cosmos"/>
    <img src="https://img.shields.io/badge/Azure_OpenAI-0078D4.svg?style=for-the-badge&logo=openai" alt="Azure OpenAI"/>
    <img src="https://img.shields.io/badge/React_19-61DAFB.svg?style=for-the-badge&logo=react" alt="React 19"/>
    <img src="https://img.shields.io/badge/Status-Production_Grade-success.svg?style=for-the-badge" alt="Status"/>
  </p>
</div>

---

## 🛑 The Core Problem: Why Most Enterprise AI Pilots Fail
The industry standard "Retrieval-Augmented Generation" (RAG) is fundamentally brittle. It retrieves context blindly and assumes the LLM will synthesize it perfectly. In production, this results in high-confidence hallucinations, destroying user trust and preventing operational deployment in high-stakes environments (Finance, Healthcare, Legal). 

TruthMesh is not a wrapper. It is a **deterministic constraint layer** that intercepts outputs, atomizes them, and mathematically forces convergence before a user ever sees a finalized claim.

---

## 🏗 System Architecture & Topography

TruthMesh solves latency via an event-driven Server-Sent Events (SSE) pipeline, backed by O(1) indexed caching in Cosmos DB. This means repeated queries bypass the LLM entirely, serving in `<50ms`.

### 1. The Request Lifecycle

```mermaid
graph TD
    User((Client))
    Gateway[FastAPI Gateway]
    Cache[(Cosmos DB)]
    Router[Domain Router]
    LLM_Generate[GPT-4o Generator]
    Decomposer[Atomic Decomposer]
    CrossCheck[Cross-Reference Verifier]
    Consensus[Bayesian Consensus Engine]

    User -->|POST /api/query| Gateway
    Gateway -->|Hash Lookup| Cache
    Cache -->|Hit| User
    Cache -->|Miss| Router
    
    Router -->|Contextualize| LLM_Generate
    LLM_Generate --> Decomposer
    
    Decomposer -->|Parallel Fan-Out| CrossCheck
    CrossCheck --> Consensus
    Consensus -->|Update Topography| Cache
    Consensus -->|Stream Payload| User

    style Cache fill:#111827,stroke:#3B82F6,stroke-width:2px,color:#fff;
    style Gateway fill:#111827,stroke:#10B981,stroke-width:2px,color:#fff;
    style Consensus fill:#111827,stroke:#8B5CF6,stroke-width:2px,color:#fff;
```

### 2. The Verification Pipeline (SSE Streaming)

Unlike amateur projects that block the UI while awaiting an API response, TruthMesh opens a persistent SSE connection. As the backend decomposes claims and validates them in parallel, the frontend paints a dynamic topography map—giving the user complete transparency into the audit.

```mermaid
sequenceDiagram
    autonumber
    participant Client
    participant API as FastAPI
    participant DB as Azure Cosmos DB
    participant AI as Azure OpenAI 

    Client->>API: POST /api/query {"text": "..."}
    API->>DB: Compound Index Check (O(1))
    
    alt Cache Hit
        DB-->>API: Verified Claims (Trust: 99%)
        API-->>Client: 200 OK (Instant)
    else Processing Required
        API-->>Client: 202 Accepted (query_id)
        Client->>API: GET /api/verify/{query_id} (SSE)
        
        API->>AI: generate_response()
        AI-->>API: Draft Output
        API->>Client: event: generated
        
        API->>AI: decompose_claims(Draft)
        AI-->>API: [Claim A, Claim B]
        API->>Client: event: decomposed
        
        par Parallel Verification asyncio.gather()
            API->>AI: verify(Claim A)
            API->>AI: verify(Claim B)
        end
        AI-->>API: Validation Vectors
        
        API->>DB: Upsert Topography
        API->>Client: event: complete
    end
```

---

## ⚡ Technical Differentiators (The "So What?")

1.  **Zero Artificial Latency:** Where others "fake" processing to look impressive, TruthMesh is strictly optimized. The Python backend utilizes `asyncio.gather()` to fan out multiple verification requests to Azure OpenAI simultaneously. 
2.  **O(1) Data Retrieval:** Raw MongoDB is slow at scale. TruthMesh enforces compound indexing (`user_id_1_created_at_-1`) so dashboard queries resolve mathematically in O(1) time regardless of payload size.
3.  **Strictly Typed React UI:** No `any` types. No cascading renders. The React 19 frontend is strictly controlled via `Zustand` and native `useEffect` closures to prevent memory leaks during WebSockets/SSE tearing down.
4.  **Bayesian Feedback Loop:** Every verified query updates the global trust profile. The more the system is used, the harder it becomes for hallucinations to survive.

---

## 🚀 Deployment Instructions

### Local Execution (Production Grade)

**Prerequisites:** Python 3.11+, Node.js 20+, Azure OpenAI Keys, Azure Cosmos DB Instance.

1.  **Clone & Verify**
    ```bash
    git clone https://github.com/Raakshass/TruthMesh.git
    cd TruthMesh
    ```

2.  **Environmental Parity**
    *   Create `.env` based strictly on `.env.example`. 
    *   *Do not commit your keys.*
    ```env
    AZURE_OPENAI_API_KEY="your-production-key"
    AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com"
    COSMOS_DB_CONNECTION_STRING="mongodb://..."
    ```

3.  **Backend Boot (FastAPI)**
    ```bash
    python -m venv .venv
    # Windows: .\.venv\Scripts\activate
    # Linux/Mac: source .venv/bin/activate
    pip install -r requirements.txt
    python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
    ```
    *Health Check:* Navigate to `http://localhost:8000/docs` to verify the OpenAPI schema.

4.  **Frontend Boot (React/Vite)**
    ```bash
    cd frontend
    npm install
    # Enforces strict ESLint/TypeScript validation before build
    npm run lint 
    npm run dev
    ```

---

## 🛡 Security Policy & Compliance
This software relies on Multi-Agent consensus to provide output security. 
*   **Rate Limiting:** Enforced via proxy.
*   **Data Residency:** Azure Cosmos DB ensures compliance with European GDPR routing if provisioned appropriately.
*   **Dependency Auditing:** Regularly sanitized via Dependabot.

---
*Developed for unparalleled Truth constraints in LLM topologies.*
