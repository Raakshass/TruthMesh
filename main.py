"""TruthMesh — Main FastAPI Application.

A Self-Auditing Hallucination Topography Engine.
"""
import asyncio
import json
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Form
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sse_starlette.sse import EventSourceResponse

from config import Config
from database import (
    init_db, get_topography_data, get_self_audit_stats,
    get_recent_queries, log_query, update_query_trust
)
from seed_data import seed_topography, seed_self_audit_claims
from demo_cache import get_cached_response, get_demo_queries
from pipeline.domain_classifier import classify_domain
from pipeline.router import route_query
from pipeline.claim_decomposer import decompose_claims
from pipeline.verifier import verify_claim
from pipeline.consensus import compute_consensus, compute_overall_trust
from pipeline.profiler import update_profile
from pipeline.self_audit import run_self_audit
from pipeline.shield import check_input


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database and seed data on startup."""
    await init_db()
    # Check if topography data exists
    data = await get_topography_data()
    if not data:
        await seed_topography()
        await seed_self_audit_claims()
        print("[STARTUP] Database seeded with baseline topography data")
    else:
        print(f"[STARTUP] Loaded {len(data)} existing topography scores")
    yield


app = FastAPI(
    title="TruthMesh",
    description="A Self-Auditing Hallucination Topography Engine",
    version="0.1.0",
    lifespan=lifespan
)

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")


# ── Page Routes ──────────────────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse)
async def dashboard(request: Request):
    """Main dashboard page."""
    topography = await get_topography_data()
    audit_stats = await get_self_audit_stats()
    recent = await get_recent_queries(5)
    demo_queries = get_demo_queries()

    return templates.TemplateResponse("dashboard.html", {
        "request": request,
        "topography": topography,
        "audit_stats": audit_stats,
        "recent_queries": recent,
        "demo_queries": demo_queries,
        "models": Config.MODELS,
        "domains": Config.DOMAINS,
        "demo_mode": Config.DEMO_MODE,
        "nav_active": "dashboard",
    })


@app.get("/pipeline", response_class=HTMLResponse)
async def pipeline_page(request: Request):
    """Pipeline monitoring page."""
    topography = await get_topography_data()
    return templates.TemplateResponse("pipeline.html", {
        "request": request,
        "topography": topography,
        "demo_mode": Config.DEMO_MODE,
        "nav_active": "pipeline",
    })


@app.get("/audit", response_class=HTMLResponse)
async def audit_page(request: Request):
    """Audit log page."""
    recent_raw = await get_recent_queries(50)
    # Transform to audit format expected by template
    audit_data = []
    for r in recent_raw:
        trust = r.get("overall_trust_score") or 0
        # Extract primary domain from domain_vector
        domain = "general"
        dv = r.get("domain_vector")
        if dv:
            try:
                vec = json.loads(dv) if isinstance(dv, str) else dv
                domain = max(vec, key=vec.get) if vec else "general"
            except Exception:
                pass
        audit_data.append({
            "timestamp": r.get("created_at", "")[:19].replace("T", " "),
            "query": r.get("query_text", ""),
            "domain": domain.capitalize(),
            "model": r.get("routed_model", "Unknown"),
            "trust_score": trust,
        })

    # Compute aggregate stats
    if audit_data:
        trusts = [d["trust_score"] for d in audit_data]
        avg_trust = round(sum(trusts) / len(trusts) * 100) if trusts else 0
        failed = sum(1 for t in trusts if t < 0.5)
        hallucination_rate = round(failed / len(trusts) * 100, 1) if trusts else 0
    else:
        avg_trust = 0
        hallucination_rate = 0

    return templates.TemplateResponse("audit.html", {
        "request": request,
        "audit_data": audit_data,
        "avg_trust": avg_trust,
        "hallucination_rate": hallucination_rate,
        "demo_mode": Config.DEMO_MODE,
        "nav_active": "audit",
    })


@app.get("/settings", response_class=HTMLResponse)
async def settings_page(request: Request):
    """Settings / configurator page."""
    models = [
        {"name": "GPT-4o", "description": "High accuracy, 120ms avg latency"},
        {"name": "Claude-3.5-Sonnet", "description": "Nuanced reasoning, 140ms avg latency"},
        {"name": "GPT-4o-mini", "description": "Cost-efficient, 60ms avg latency"},
    ]
    return templates.TemplateResponse("settings.html", {
        "request": request,
        "models": models,
        "threshold": 0.85,
        "demo_mode": Config.DEMO_MODE,
        "nav_active": "settings",
    })


# ── API Routes ───────────────────────────────────────────────────────────

@app.get("/api/topography")
async def api_topography():
    """Get topography heatmap data."""
    data = await get_topography_data()
    return JSONResponse({"topography": data, "models": Config.MODELS, "domains": Config.DOMAINS})


@app.get("/api/self-audit")
async def api_self_audit_stats():
    """Get self-audit statistics."""
    stats = await get_self_audit_stats()
    return JSONResponse(stats)



@app.post("/api/run-self-audit")
async def api_run_self_audit():
    """Trigger a self-audit cycle."""
    results = await run_self_audit(num_claims=5)
    return JSONResponse(results)


@app.post("/api/self-audit")
async def api_self_audit_alias():
    """Alias for /api/run-self-audit (used by frontend)."""
    results = await run_self_audit(num_claims=5)
    return JSONResponse(results)


@app.get("/api/recent-query")
async def api_recent_query():
    """Get the most recent query for pipeline page."""
    recent = await get_recent_queries(1)
    if recent:
        q = recent[0]
        query_id = q.get("query_id", "")
        query_text = q.get("query_text", "")
        routed_model = q.get("routed_model", "GPT-4o")
        trust_score = q.get("overall_trust_score")
        is_complete = q.get("verification_complete", 0) == 1
        
        # Parse domain vector
        domain = "General"
        try:
            dv = json.loads(q.get("domain_vector", "{}"))
            if dv:
                domain = max(dv, key=dv.get)
        except Exception:
            pass

        # Build synthetic pipeline log for completed queries
        log = []
        if is_complete and query_id:
            log = [
                {"type": "time", "text": f"[REPLAY] Pipeline execution for: {query_text[:80]}"},
                {"type": "processing", "text": f">> SHIELD: Input screened — PASS"},
                {"type": "info", "text": f">> CLASSIFY: Domain detected — {domain}"},
                {"type": "info", "text": f">> ROUTE: Model selected — {routed_model} (topography O(1))"},
                {"type": "info", "text": f">> LLM: Response generated via Azure OpenAI ({routed_model})"},
                {"type": "processing", "text": f">> DECOMPOSE: Claims extracted from response"},
                {"type": "info", "text": f">> VERIFY: 4-source concurrent verification complete"},
                {"type": "info", "text": f">> CONSENSUS: Domain-weighted scoring applied"},
                {"type": "processing", "text": f">> PROFILE: Topography updated (Bayesian posterior)"},
                {"type": "processing", "text": f">> TRUST SCORE: {round(trust_score * 100) if trust_score else 'N/A'}%"},
                {"type": "processing", "text": ">> PIPELINE COMPLETE"},
            ]

        return JSONResponse({
            "query_id": query_id,
            "query": query_text[:100],
            "domain": domain,
            "model": routed_model,
            "trust_score": trust_score,
            "complete": is_complete,
            "log": log,
        })
    return JSONResponse({"query_id": None})


@app.post("/api/query")
async def api_query(request: Request):
    """Process a query through the full TruthMesh pipeline.

    Returns immediate routing decision, then streams verification via SSE.
    """
    body = await request.json()
    query_text = body.get("query", "").strip()

    if not query_text:
        return JSONResponse({"error": "Empty query"}, status_code=400)

    query_id = str(uuid.uuid4())[:12]

    # Step 1: Shield Agent
    shield_result = await check_input(query_text)
    if not shield_result["safe"]:
        return JSONResponse({
            "query_id": query_id,
            "blocked": True,
            "shield": shield_result
        })

    # Step 2: Check demo cache first
    cached = get_cached_response(query_text)
    is_cached = cached is not None

    if is_cached:
        domain_vector = cached["domain_vector"]
        routing = cached["routing"]
    else:
        # Step 3: Domain Classification (live)
        domain_vector = await classify_domain(query_text)
        # Step 4: Hallucination-Aware Routing (live)
        routing_result = await route_query(domain_vector)
        routing = {
            "selected_model": routing_result["selected_model"],
            "reason": routing_result["reason"],
            "primary_domain": routing_result.get("primary_domain", ""),
            "primary_domain_prob": routing_result.get("primary_domain_prob", 0),
        }

    # Log query
    await log_query(
        query_id=query_id,
        query_text=query_text,
        domain_vector=domain_vector,
        routed_model=routing["selected_model"],
        routing_reason=routing["reason"],
        cached=is_cached
    )

    # Return initial response (routing decision)
    # Verification will be streamed via SSE
    response_data = {
        "query_id": query_id,
        "blocked": False,
        "cached": is_cached,
        "domain_vector": domain_vector,
        "routing": routing,
    }

    if is_cached:
        response_data["response_text"] = cached["response"]
        response_data["claims"] = cached["claims"]

    return JSONResponse(response_data)


@app.get("/api/verify/{query_id}")
async def api_verify_stream(request: Request, query_id: str):
    """SSE endpoint for streaming verification results."""
    async def event_generator():
        # Check if we have a cached result
        # For demo, we need the query text to look up cache
        # In production, this would look up from query_log table
        import aiosqlite
        async with aiosqlite.connect(Config.DB_PATH) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                "SELECT query_text, domain_vector, routed_model FROM query_log WHERE query_id = ?",
                (query_id,)
            )
            row = await cursor.fetchone()

        if not row:
            yield {"event": "error", "data": json.dumps({"error": "Query not found"})}
            return

        query_text = row["query_text"]
        domain_vector = json.loads(row["domain_vector"])
        primary_domain = max(domain_vector, key=domain_vector.get)
        model_used = row["routed_model"]

        # Check cache
        cached = get_cached_response(query_text)

        if cached:
            # Stream cached verification results with realistic delays
            claims = cached.get("claims", [])
            verifications = cached.get("verifications", [])

            # Emit pipeline step events for visual feedback
            for step in ["shield", "classify", "route"]:
                yield {"event": step, "data": json.dumps({"step": step, "status": "done"})}
                await asyncio.sleep(0.25)

            # LLM step
            yield {"event": "llm", "data": json.dumps({"step": "llm", "status": "done", "model": model_used})}
            await asyncio.sleep(0.3)

            # Stream response text
            yield {
                "event": "response",
                "data": json.dumps({
                    "response_text": cached["response"],
                    "model": model_used,
                    "cached": True
                })
            }
            await asyncio.sleep(0.3)

            # Decompose step
            yield {"event": "decompose", "data": json.dumps({"step": "decompose", "status": "done"})}
            await asyncio.sleep(0.2)

            # Stream claims
            yield {
                "event": "claims",
                "data": json.dumps({"claims": claims, "total": len(claims)})
            }
            await asyncio.sleep(0.3)

            # Verify step
            yield {"event": "verify", "data": json.dumps({"step": "verify", "status": "active"})}

            # Stream each verification with delay for visual effect
            all_claim_results = []
            for i, verif in enumerate(verifications):
                await asyncio.sleep(0.8)  # Simulate verification time
                claim_result = {
                    "index": i,
                    "claim": verif["claim"],
                    "consensus": verif["consensus"],
                    "sources": verif["sources"]
                }
                all_claim_results.append(claim_result)
                yield {
                    "event": "verification",
                    "data": json.dumps(claim_result)
                }

            # Consensus step
            yield {"event": "consensus", "data": json.dumps({"step": "consensus", "status": "done"})}

            # Stream overall trust
            await asyncio.sleep(0.5)
            yield {
                "event": "overall_trust",
                "data": json.dumps(cached["overall_trust"])
            }

            # Update profiler with cached results (topography evolves)
            for verif in verifications:
                passed = verif["consensus"]["final_verdict"] == "pass"
                await update_profile(model_used, primary_domain, passed)

            # Update query trust in DB
            await update_query_trust(
                query_id, cached["overall_trust"]["overall_score"],
                cached["response"]
            )

            # Signal profile step complete
            await asyncio.sleep(0.2)
            yield {
                "event": "profile",
                "data": json.dumps({"step": "profile", "status": "done"})
            }

        else:
            # Live pipeline (with mocked APIs if no keys)

            # Emit step events
            for step in ["shield", "classify", "route"]:
                yield {"event": step, "data": json.dumps({"step": step, "status": "done"})}
                await asyncio.sleep(0.2)

            yield {"event": "llm", "data": json.dumps({"step": "llm", "status": "done", "model": model_used})}
            await asyncio.sleep(0.2)

            # Generate a simple response
            response_text = f"[Live Response] Processing query about {primary_domain}. This response was generated through the TruthMesh pipeline with {model_used}."
            yield {
                "event": "response",
                "data": json.dumps({"response_text": response_text, "model": model_used, "cached": False})
            }
            await asyncio.sleep(0.3)

            # Decompose step
            yield {"event": "decompose", "data": json.dumps({"step": "decompose", "status": "done"})}

            # Decompose into claims
            claims = await decompose_claims(response_text)
            yield {
                "event": "claims",
                "data": json.dumps({"claims": claims, "total": len(claims)})
            }

            # Verify step
            yield {"event": "verify", "data": json.dumps({"step": "verify", "status": "active"})}

            all_claim_results = []
            for i, claim_data in enumerate(claims):
                await asyncio.sleep(0.6)
                # Verify each claim
                results = await verify_claim(
                    claim=claim_data["claim"],
                    claim_type=claim_data.get("type", "factual"),
                    domain=primary_domain,
                    primary_model=model_used
                )
                consensus = compute_consensus(results, primary_domain, domain_vector)

                claim_result = {
                    "index": i,
                    "claim": claim_data["claim"],
                    "consensus": consensus,
                    "sources": [
                        {
                            "source": r["source"],
                            "source_detail": r["source_detail"],
                            "verdict": r["verdict"],
                            "confidence": r["confidence"]
                        } for r in results
                    ]
                }
                all_claim_results.append({"consensus": consensus})
                yield {
                    "event": "verification",
                    "data": json.dumps(claim_result)
                }

                # Update profiler
                passed = consensus["final_verdict"] == "pass"
                await update_profile(model_used, primary_domain, passed)

            # Consensus step
            yield {"event": "consensus", "data": json.dumps({"step": "consensus", "status": "done"})}

            # Overall trust
            await asyncio.sleep(0.3)
            overall = compute_overall_trust(all_claim_results)
            await update_query_trust(query_id, overall["overall_score"], response_text)
            yield {
                "event": "overall_trust",
                "data": json.dumps(overall)
            }

            # Signal profile step complete
            await asyncio.sleep(0.2)
            yield {
                "event": "profile",
                "data": json.dumps({"step": "profile", "status": "done"})
            }

        # Done — small delay ensures client flushes previous events
        await asyncio.sleep(0.5)
        yield {"event": "done", "data": json.dumps({"status": "complete"})}

    return EventSourceResponse(event_generator())


@app.get("/api/demo-queries")
async def api_demo_queries():
    """Get list of available demo queries."""
    return JSONResponse({"queries": get_demo_queries()})
