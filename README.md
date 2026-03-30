<div align="center">
  <img src="https://raw.githubusercontent.com/microsoft/fluentui-system-icons/master/assets/Shield%20Checkmark/SVG/ic_fluent_shield_checkmark_48_filled.svg" width="120" alt="TruthMesh Logo"/>
  <h1>TruthMesh Verification Engine</h1>
  <p><strong>A Self-Auditing Hallucination Topography Engine for Enterprise AGI</strong></p>

  <p>
    <img src="https://img.shields.io/badge/Python-3.11+-blue.svg" alt="Python Version"/>
    <img src="https://img.shields.io/badge/FastAPI-0.111.0-009688.svg" alt="FastAPI"/>
    <img src="https://img.shields.io/badge/Azure-OpenAI-0078D4.svg" alt="Azure"/>
    <img src="https://img.shields.io/badge/React-19-61DAFB.svg" alt="React"/>
    <img src="https://img.shields.io/badge/Status-Production_Ready-success.svg" alt="Status"/>
  </p>
</div>

---

## 🛑 The Core Problem
Current LLM agents return confident hallucinations. Generic RAG merely retrieves context without validating logical soundness. TruthMesh solves this by intercepting the query, generating an initial response, proactively decomposing it into atomic factual claims, and verifying each claim against authoritative sources *in parallel*.

## 🏗 System Architecture

The overarching system leverages Azure OpenAI and a Cosmos DB caching pipeline to deliver O(1) instantaneous verification hits on repeated topological queries.

```mermaid
graph TD
    Client[React 19 SPA] -->|Token Auth| API[FastAPI Gateway]
    API -->|O(1) Hash Map| Cache[(Cosmos DB)]
    
    API -->|SSE Event Stream| Router[Domain Router]
    Router -->|Tech / Health / Finance| Classify[Domain Classifier]
    Classify --> LLM[(Azure OpenAI GPT-4o)]
    
    LLM --> Decomposer[Atomic Claim Decomposer]
    Decomposer -->|Parallel Fan-Out| Verifier[Cross-Reference Verifier]
    Verifier --> Consensus[Bayesian Consensus Engine]
    
    Consensus --> Profiler[Model Trust Profiler]
    Profiler --> Cache
    
    style Cache fill:#E1F5FE,stroke:#0288D1,stroke-width:2px;
    style API fill:#E8F5E9,stroke:#388E3C,stroke-width:2px;
    style LLM fill:#FFF3E0,stroke:#F57C00,stroke-width:2px;
```

## 🔄 End-to-End Verification Pipeline

TruthMesh utilizes a sophisticated internal state machine that streams status to the frontend via Server-Sent Events (SSE). 

```mermaid
sequenceDiagram
    participant User as Client Browser
    participant API as FastAPI Backend
    participant DB as Cosmos Database
    participant AI as Azure OpenAI

    User->>API: POST /api/query {"query": "Is Python compiled?"}
    API->>AI: Vectorise Domain (Azure)
    AI-->>API: Domain Weights
    API->>DB: Log Transaction
    API-->>User: Issued tracking `query_id`

    User->>API: GET /api/verify/{query_id}
    API->>DB: Check Cosmos Cache (O(1))
    
    alt Cache Hit
        DB-->>API: Verified Payload
        API-->>User: [Instant Streaming Result]
    else Processing Required
        API->>AI: generate_response()
        AI-->>API: Draft Text
        API->>AI: decompose_claims()
        AI-->>API: [Claim 1, Claim 2, Claim 3]
        par Verify All Claims
            API->>AI: Verify Claim 1 using RAG
            API->>AI: Verify Claim 2 using RAG
        end
        API->>DB: update_query_trust()
        API-->>User: Streaming Stages -> Complete
    end
```

## ⚡ Tech Stack

*   **Backend:** Python 3.11, FastAPI, Uvicorn, Motor (Async MongoDB Driver).
*   **Infrastructure:** Azure App Services, Azure Cosmos DB for MongoDB, Azure OpenAI (GPT-4o).
*   **Frontend:** React 19, TypeScript, Vite, TailwindCSS v4, Zustand.
*   **Concurrency:** Python `asyncio.gather` for parallel claim validation.

## 🚀 Deployment Instructions

### Local Execution (Series A Ready)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-org/TruthMesh.git
    cd TruthMesh
    ```
2.  **Environment Setup:** Create a `.env` in the root mirroring `.env.example`.
    ```bash
    AZURE_OPENAI_API_KEY="..."
    AZURE_OPENAI_ENDPOINT="..."
    COSMOS_DB_CONNECTION_STRING="..."
    ```
3.  **Boot the Backend Engine:**
    ```bash
    python -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
    python -m uvicorn main:app --reload
    ```
4.  **Boot the Interface:**
    ```bash
    cd frontend
    npm install
    npm run dev
    ```

## 🛡 Security & Competitor Differentiation
Most teams implement generic synchronous blocking calls. TruthMesh separates the request lifecycle via highly optimized WebSockets/SSE mappings, meaning UI interactivity is never blocked by downstream API latency. Any competitor relying on HTTP request/response polling will intrinsically fail load tests where TruthMesh excels.

## 📜 License
Proprietary under TruthMesh Inc. All operations are strictly audited.
