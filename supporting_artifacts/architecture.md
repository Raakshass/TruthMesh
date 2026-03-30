# TruthMesh System Architecture

> **WARNING:** This diagram reflects the *intended* optimal architecture. Your current implementation actively violates the O(1) state caching and async event streaming constraints shown below.

```mermaid
graph TD
    Client[React SPA] -->|HTTPS POST| Auth[Auth Layer - FastAPI]
    Auth -->|Token| Cache[(Cache Layer - O(1))]
    Client -->|SSE Stream| Router[Domain Router]
    
    Router -->|If Miss| Classifier[Domain Classifier]
    Classifier --> LLM[(Azure OpenAI GPT-4o)]
    
    LLM --> Decomposer[Claim Decomposer]
    Decomposer --> Verifier[Parallel Verifier]
    Verifier --> Consensus[Consensus Engine]
    
    Consensus --> Profiler[Trust Profiler]
    Profiler --> DB[(Cosmos DB MongoDB API)]
    
    %% Current bottlenecks in your code
    style DB fill:#ffcccb,stroke:#ff0000,stroke-width:2px;
    style Router fill:#ffcccb,stroke:#ff0000,stroke-width:2px;
```
