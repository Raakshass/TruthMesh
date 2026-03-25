"""TruthMesh — Main FastAPI Application.

A Self-Auditing Hallucination Topography Engine.
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import asyncio
import json
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Form, Depends, HTTPException, status
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from sse_starlette.sse import EventSourceResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from config import Config
from database import (
    init_db, get_topography_data, get_self_audit_stats,
    get_recent_queries, log_query, update_query_trust,
    get_user_by_username, create_user
)
from auth import (
    get_current_user, require_role, get_password_hash,
    create_access_token, verify_password, ACCESS_TOKEN_EXPIRE_MINUTES, timedelta
)
from jobs import scheduler
from monitoring import logger
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
        
    # Check if admin user exists, else create default
    admin = await get_user_by_username("admin")
    if not admin:
        hashed = get_password_hash("truthmesh123")
        await create_user("admin", hashed, role="Admin")
        print("[STARTUP] Default admin user created (admin / truthmesh123)")
        
    viewer = await get_user_by_username("demo")
    if not viewer:
        hashed = get_password_hash("demo123")
        await create_user("demo", hashed, role="Viewer")
        logger.info("[STARTUP] Default demo user created (demo / demo123)")
        
    scheduler.start()
    logger.info("[STARTUP] Background data governance scheduler started")
    yield
    scheduler.shutdown()


app = FastAPI(
    title="TruthMesh",
    description="A Self-Auditing Hallucination Topography Engine",
    version="0.1.0",
    lifespan=lifespan
)

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://truthmeshsjain.azurewebsites.net",
    ],
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
    allow_credentials=True,
)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=[
    "localhost", "127.0.0.1",
    "truthmeshsjain.azurewebsites.net",
    "*.azurewebsites.net",  # Azure health probes and SCM
])

@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    # Basic CSP to allow tailwind CDN and inline styles/scripts for demo purposes
    response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' cdn.tailwindcss.com cdn.jsdelivr.net cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' cdnjs.cloudflare.com fonts.googleapis.com; font-src 'self' cdnjs.cloudflare.com fonts.gstatic.com; connect-src 'self' ws: wss:;"
    return response

app.mount("/static", StaticFiles(directory="static"), name="static")

# Serve React production build if available
import pathlib
_react_dist = pathlib.Path(__file__).parent / "frontend" / "dist"
if _react_dist.exists():
    app.mount("/assets", StaticFiles(directory=str(_react_dist / "assets")), name="react-assets")

templates = Jinja2Templates(directory="templates")


# ── Auth Routes ──────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    """Lightweight health endpoint for deployment smoke tests."""
    return JSONResponse({"status": "ok", "demo_mode": Config.DEMO_MODE})


@app.post("/token")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await get_user_by_username(form_data.username)
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["username"], "role": user["role"], "uid": user["id"]},
        expires_delta=access_token_expires
    )
    
    response = JSONResponse({"access_token": access_token, "token_type": "bearer"})
    response.set_cookie(
        key="access_token",
        value=f"Bearer {access_token}",
        httponly=True,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
    )
    return response

@app.get("/logout")
async def logout():
    response = JSONResponse({"status": "logged_out"})
    response.delete_cookie("access_token")
    return response


# ── JSON API Routes (for React SPA) ──────────────────────────────────────

@app.get("/api/me")
async def api_me(user: dict = Depends(get_current_user)):
    """Get current user info."""
    return JSONResponse({
        "username": user["username"],
        "role": user["role"],
        "user_id": user["user_id"],
    })

@app.get("/api/dashboard")
async def api_dashboard(user: dict = Depends(get_current_user)):
    """Dashboard data as JSON."""
    topography = await get_topography_data()
    audit_stats = await get_self_audit_stats()
    recent = await get_recent_queries(5)
    demo_queries = get_demo_queries()
    return JSONResponse({
        "topography": topography,
        "audit_stats": audit_stats,
        "recent_queries": recent,
        "demo_queries": demo_queries,
        "models": Config.MODELS,
        "domains": Config.DOMAINS,
        "demo_mode": Config.DEMO_MODE,
    })

@app.get("/api/audit")
async def api_audit(user: dict = Depends(get_current_user)):
    """Audit log data as JSON."""
    recent_raw = await get_recent_queries(user_id=user["user_id"], limit=50, is_admin=user["role"] == "Admin" or user["role"] == "Auditor")
    audit_data = []
    for r in recent_raw:
        trust = r.get("overall_trust_score") or 0
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
    if audit_data:
        trusts = [d["trust_score"] for d in audit_data]
        avg_trust = sum(trusts) / len(trusts) if trusts else 0
        failed = sum(1 for t in trusts if t < 0.5)
        hallucination_rate = failed / len(trusts) if trusts else 0
    else:
        avg_trust = 0
        hallucination_rate = 0
    return JSONResponse({
        "audit_data": audit_data,
        "avg_trust": avg_trust,
        "hallucination_rate": hallucination_rate,
    })

@app.get("/api/settings")
async def api_settings(user: dict = Depends(get_current_user)):
    """Settings data as JSON."""
    models = [
        {"name": "GPT-4o", "description": "High accuracy, 120ms avg latency"},
        {"name": "Claude-3.5-Sonnet", "description": "Nuanced reasoning, 140ms avg latency"},
        {"name": "GPT-4o-mini", "description": "Cost-efficient, 60ms avg latency"},
    ]
    return JSONResponse({
        "models": models,
        "threshold": 0.85,
    })


# ── API Routes ───────────────────────────────────────────────────────────

@app.get("/api/topography")
async def api_topography(user: dict = Depends(get_current_user)):
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
async def api_recent_query(user: dict = Depends(get_current_user)):
    """Get the most recent query for pipeline page."""
    recent = await get_recent_queries(user_id=user["user_id"], limit=1, is_admin=user["role"] == "Admin")
    if recent:
        q = recent[0]
        query_id = q.get("query_id", "")
        query_text = q.get("query_text", "")
        routed_model = q.get("routed_model", "GPT-4o")
        trust_score = q.get("overall_trust_score")
        is_complete = q.get("verification_complete", 0) == 1 or trust_score is not None
        
        # Parse domain vector
        domain = "General"
        try:
            dv = json.loads(q.get("domain_vector", "{}"))
            if dv:
                domain = max(dv, key=dv.get)
        except Exception:
            pass

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
        cached=is_cached,
        user_id=user["user_id"]
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


# ── SPA Catch-All (must be LAST) ─────────────────────────────────────────

from fastapi.responses import FileResponse

@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    """Serve React SPA for all non-API routes."""
    react_index = _react_dist / "index.html"
    if _react_dist.exists() and react_index.exists():
        # Check if request is for a static asset in dist/
        asset = _react_dist / full_path
        if asset.exists() and asset.is_file():
            return FileResponse(str(asset))
        return FileResponse(str(react_index))
    # Fallback to Jinja2 templates during transition
    return templates.TemplateResponse("login.html", {"request": {}})
