<div align="center">

# 🔬 TruthMesh

### A Self-Auditing Hallucination Topography Engine

*Maps where AI lies — and routes around the danger zones.*

[![Python 3.11+](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Azure OpenAI](https://img.shields.io/badge/Azure_OpenAI-GPT--4o-0078D4?logo=microsoftazure&logoColor=white)](https://azure.microsoft.com/en-us/products/ai-services/openai-service)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Microsoft AI Unlocked 2026 · Track 5: Trustworthy AI · Team I-chan · IIT Roorkee**

</div>

---

## 🎯 The Problem

Large Language Models hallucinate silently in high-stakes domains. A doctor asking about drug interactions, a lawyer checking case precedent, or a financial analyst verifying market data — they all receive outputs that **sound authoritative but may contain lethal inaccuracies**.

Existing solutions offer binary "hallucinated / not hallucinated" verdicts. They don't reveal:
- **Which domain** a model is weak in
- **Which model** to route to instead
- **Whether the verifier itself** is trustworthy (the recursive trust paradox)

## 💡 The Solution

TruthMesh builds a **hallucination topography** — a reliability map across 3 models × 5 domains — and uses it to:

1. **Route** every query to the safest model for that domain in O(1) time
2. **Decompose** LLM responses into atomic claims
3. **Verify** each claim against 4 independent sources with domain-weighted consensus
4. **Self-audit** by injecting ground-truth claims to measure verifier accuracy (solving the trust paradox)

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                     TRUTHMESH PIPELINE                          │
│                                                                  │
│  User Query                                                      │
│      │                                                           │
│      ▼                                                           │
│  ┌─────────┐   ┌───────────┐   ┌────────┐   ┌───────────────┐  │
│  │  Shield  │──▶│ Classify  │──▶│ Route  │──▶│  Azure OpenAI │  │
│  │  Agent   │   │ (5 Domain)│   │ O(1)   │   │  (GPT-4o)     │  │
│  └─────────┘   └───────────┘   └────────┘   └───────┬───────┘  │
│                                                       │          │
│                                                       ▼          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              CLAIM DECOMPOSITION ENGINE                   │   │
│  │         Response → Atomic Verifiable Claims               │   │
│  └──────────────────────────┬───────────────────────────────┘   │
│                              │                                   │
│              ┌───────────────┼───────────────┐                  │
│              ▼               ▼               ▼                  │
│      ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│      │ Bing Search │ │  Wikipedia  │ │ Cross-Model │          │
│      │ (PubMed,    │ │    API      │ │ Verification│          │
│      │  Domain)    │ │             │ │             │          │
│      └──────┬──────┘ └──────┬──────┘ └──────┬──────┘          │
│             └───────────────┼───────────────┘                  │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │           DOMAIN-WEIGHTED CONSENSUS ENGINE                │   │
│  │     Source weights calibrated per domain (not uniform)     │   │
│  └──────────────────────────┬───────────────────────────────┘   │
│                              │                                   │
│              ┌───────────────┼───────────────┐                  │
│              ▼               ▼               ▼                  │
│     ┌──────────────┐ ┌─────────────┐ ┌──────────────┐         │
│     │ Trust Score  │ │  Topography │ │  Self-Audit  │         │
│     │ + Verdicts   │ │   Update    │ │   Engine     │         │
│     └──────────────┘ └─────────────┘ └──────────────┘         │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## 🛡️ Key Features

| Feature | Description |
|---|---|
| **Hallucination Topography** | 3 models × 5 domains heatmap with Bayesian posterior updates and Wilson confidence intervals |
| **4-Source Verification** | Bing Search (domain-scoped), Wikipedia, Cross-Model, Wolfram Alpha — concurrent per claim |
| **Domain-Weighted Consensus** | Source weights differ by domain (Bing: 0.35 for Medical, 0.20 for History) — calibrated, not uniform |
| **Self-Audit Engine** | Ground-truth injection from MMLU/TruthfulQA benchmarks — measures and reports verifier accuracy |
| **Real-Time SSE Streaming** | 8-step animated pipeline with progressive verification streamed live to the dashboard |
| **Shield Agent** | Input screening for prompt injection attempts and PII detection before processing |

## 🖥️ Dashboard Pages

| Page | Purpose |
|---|---|
| **Analysis** | Submit queries, view heatmap, see verification results with per-claim verdicts |
| **Pipeline** | Monitor the 8-step verification pipeline in real-time with SSE streaming |
| **Audit Log** | Browse all verification history, self-audit results, and accuracy metrics |
| **Settings** | Configure model priorities, API keys, and domain weight profiles |

---

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Azure OpenAI API key (GPT-4o and/or GPT-4o-mini deployments)
- Bing Search API key (for web verification)
- Azure Content Safety key (optional — regex fallback available)

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/TruthMesh.git
cd TruthMesh

# Create virtual environment
python -m venv venv
venv\Scripts\activate      # Windows
# source venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your Azure credentials
```

### Running

```bash
# Start the server (Demo Mode — uses pre-cached responses, no API keys needed)
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Open dashboard
# http://localhost:8000
```

### Demo Mode

TruthMesh ships with **5 pre-built demo scenarios** across all domains:

| # | Query | Domain |
|---|---|---|
| 1 | "What are the symptoms and treatment for Type 2 diabetes?" | Medical |
| 2 | "What are the key principles of contract law?" | Legal |
| 3 | "How does compound interest affect long-term investments?" | Finance |
| 4 | "Explain the process of photosynthesis" | Science |
| 5 | "What caused the fall of the Roman Empire?" | History |

Demo mode uses cached Azure OpenAI responses so the prototype works **without API keys** for evaluation.

---

## 📁 Project Structure

```
TruthMesh/
├── main.py                 # FastAPI app — 17 endpoints (pages + API)
├── config.py               # Centralized configuration (env vars)
├── database.py             # SQLite async layer — 4 tables
├── demo_cache.py           # 5 pre-built demo scenarios
├── seed_data.py            # Initial topography scores (MMLU/TruthfulQA)
├── requirements.txt        # Python dependencies
├── .env.example            # Environment variable template
│
├── pipeline/               # 8-Step Verification Pipeline
│   ├── __init__.py
│   ├── shield.py           # Input safety screening (PII, injection)
│   ├── domain_classifier.py# 5-domain classification vector
│   ├── router.py           # O(1) topography-based model routing
│   ├── claim_decomposer.py # LLM response → atomic claims
│   ├── verifier.py         # 4-source concurrent verification
│   ├── consensus.py        # Domain-weighted consensus scoring
│   ├── profiler.py         # Bayesian topography profile update
│   └── self_audit.py       # Ground-truth verifier accuracy measurement
│
├── templates/              # Jinja2 HTML Templates
│   ├── _base.html          # Base layout (navigation, header)
│   ├── dashboard.html      # Main analysis page
│   ├── pipeline.html       # Real-time pipeline monitor
│   ├── audit.html          # Verification audit log
│   └── settings.html       # Configuration page
│
└── static/                 # Frontend Assets
    ├── css/                # Tailwind + custom styles
    ├── js/                 # Dashboard, pipeline, audit JS
    └── images/             # Static images
```

## 🔧 Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Backend** | FastAPI + Python 3.11 | Async-native, SSE support, type-safe |
| **Database** | SQLite + aiosqlite | Zero-config, embedded, async layer handles demo-scale |
| **Frontend** | Jinja2 + Tailwind CSS | Server-rendered, fast iteration, no build step |
| **Heatmap** | Chart.js Matrix Plugin | Interactive topography visualization |
| **Streaming** | SSE (sse-starlette) | Lightweight real-time pipeline updates |
| **AI Models** | Azure OpenAI (GPT-4o, GPT-4o-mini) | Enterprise-grade, multi-model routing |
| **Search** | Bing Search API | Domain-scoped web verification |
| **Safety** | Azure Content Safety | Input screening with regex fallback |

## 📊 Self-Audit Results

TruthMesh's self-audit engine achieves **85% measured verifier accuracy** by injecting known ground-truth claims from MMLU and TruthfulQA benchmarks. This solves the recursive trust paradox — the system doesn't just verify LLM outputs; it **verifies its own verification accuracy** and reports it transparently.

---

## 📄 License

This project is submitted as part of the Microsoft AI Unlocked 2026 competition (Track 5: Trustworthy AI) by **Team I-chan, IIT Roorkee**.

---

<div align="center">

**Built with ❤️ using Azure AI Services**

*"Every hallucination detector claims accuracy. We're the only one that measures and reports our own."*

</div>
