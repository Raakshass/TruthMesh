
# pyre-ignore-all-errors
"""TruthMesh — Main FastAPI Application.

A Self-Auditing Hallucination Topography Engine.
"""
import sys
import os
import pathlib
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import asyncio
import json
import uuid
from datetime import datetime, date
from contextlib import asynccontextmanager


class SafeJSONEncoder(json.JSONEncoder):
    """Handles datetime, date, set, bytes in JSON serialization."""
    def default(self, o: object) -> object:  # type: ignore[override]
        if isinstance(o, (datetime, date)):
            return o.isoformat()
        if isinstance(o, set):
            return list(o)
        if isinstance(o, bytes):
            return o.decode('utf-8', errors='replace')
        return super().default(o)



def safe_json(obj):
    """Shorthand for JSON serialization with SafeJSONEncoder."""
    return json.dumps(obj, cls=SafeJSONEncoder, default=str)

from fastapi import FastAPI, Request, Form, Depends, HTTPException, status
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse  # type: ignore
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
# Jinja2Templates removed — React SPA is the sole frontend
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from sse_starlette.sse import EventSourceResponse # type: ignore
from slowapi import Limiter, _rate_limit_exceeded_handler # type: ignore
from slowapi.util import get_remote_address # type: ignore
from slowapi.errors import RateLimitExceeded # type: ignore

from config import Config
from database import (
    init_db, get_topography_data, get_self_audit_stats,
    get_recent_queries, log_query, update_query_trust,
    get_user_by_username, create_user,
    save_refresh_token, revoke_refresh_token, validate_refresh_token
)
from auth import (
    get_current_user, require_role, get_password_hash,
    create_access_token, create_refresh_token, verify_password, 
    ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_DAYS, timedelta,
    SECRET_KEY, ALGORITHM, jwt, JWTError
)
from jobs import scheduler # type: ignore
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
        logger.info("[STARTUP] Database seeded with baseline topography data")
    else:
        logger.info(f"[STARTUP] Loaded {len(data)} existing topography scores")
        
    # Secure first-boot: create admin/demo users ONLY if passwords are set in env vars
    admin = await get_user_by_username("admin")
    if not admin and Config.ADMIN_PASSWORD:
        hashed = get_password_hash(Config.ADMIN_PASSWORD)
        await create_user("admin", hashed, role="Admin")
        logger.info("[STARTUP] Admin user created from ADMIN_PASSWORD env var")
    elif not admin:
        logger.warning("[STARTUP] No admin user and ADMIN_PASSWORD not set — skipping")
        
    viewer = await get_user_by_username("demo")
    if not viewer and Config.DEMO_PASSWORD:
        hashed = get_password_hash(Config.DEMO_PASSWORD)
        await create_user("demo", hashed, role="Viewer")
        logger.info("[STARTUP] Demo user created from DEMO_PASSWORD env var")
    elif not viewer:
        logger.warning("[STARTUP] No demo user and DEMO_PASSWORD not set — skipping")
        
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

limiter = Limiter(
    key_func=get_remote_address, 
    storage_uri="memory://"
)
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
        "https://truthmesh-api.onrender.com",
    ],
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
    allow_credentials=True,
)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=[
    "localhost", "127.0.0.1",
    "truthmeshsjain.azurewebsites.net",
    "*.azurewebsites.net",  # Azure health probes and SCM
    "*.onrender.com",       # Render domains
])

@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    # Tightened CSP — React SPA uses bundled scripts, no need for unsafe-eval
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' cdn.jsdelivr.net cdnjs.cloudflare.com; "
        "style-src 'self' 'unsafe-inline' fonts.googleapis.com; "
        "font-src 'self' fonts.gstatic.com; "
        "img-src 'self' data: blob:; "
        "connect-src 'self' ws: wss:;"
    )
    return response

# Serve React production build if available
_react_dist = pathlib.Path(__file__).parent / "frontend" / "dist"
if _react_dist.exists():
    app.mount("/assets", StaticFiles(directory=str(_react_dist / "assets")), name="react-assets")


# ── Auth Routes ──────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    """Lightweight health endpoint for deployment smoke tests."""
    return JSONResponse({"status": "ok", "demo_mode": Config.DEMO_MODE})


@app.post("/token")
@limiter.limit("5/minute")
async def login_for_access_token(request: Request, form_data: OAuth2PasswordRequestForm = Depends()):
    user = await get_user_by_username(form_data.username)
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["username"], "role": user["role"], "uid": user.get("id", str(user.get("_id")))},
        expires_delta=access_token_expires
    )
    
    refresh_token_expires = timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    refresh_token = create_refresh_token(
        data={"sub": user["username"], "role": user["role"], "uid": user.get("id", str(user.get("_id")))},
        expires_delta=refresh_token_expires
    )
    
    await save_refresh_token(user["username"], refresh_token)
    
    response = JSONResponse({
        "access_token": access_token, 
        "refresh_token": refresh_token,
        "token_type": "bearer"
    })
    _is_production = os.getenv("ENVIRONMENT", "development") == "production"
    response.set_cookie(
        key="access_token",
        value=f"Bearer {access_token}",
        httponly=True,
        secure=_is_production,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=_is_production,
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        samesite="lax",
    )
    return response

@app.post("/refresh")
@limiter.limit("10/minute")
async def refresh_token_endpoint(request: Request):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="Refresh token missing")
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        username = payload.get("sub")
        role = payload.get("role")
        uid = payload.get("uid")
        if not username:
            raise HTTPException(status_code=401, detail="Invalid payload")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
        
    is_valid = await validate_refresh_token(username, token)
    if not is_valid:
        raise HTTPException(status_code=401, detail="Refresh token revoked or invalid")
        
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    new_access_token = create_access_token(
        data={"sub": username, "role": role, "uid": uid},
        expires_delta=access_token_expires
    )
    
    response = JSONResponse({"access_token": new_access_token, "token_type": "bearer"})
    _is_production = os.getenv("ENVIRONMENT", "development") == "production"
    response.set_cookie(
        key="access_token",
        value=f"Bearer {new_access_token}",
        httponly=True,
        secure=_is_production,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
    )
    return response


@app.get("/logout")
async def logout(request: Request):
    token = request.cookies.get("refresh_token")
    if token:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            username = payload.get("sub")
            if username:
                await revoke_refresh_token(username)
        except JWTError:
            pass

    response = JSONResponse({"status": "logged_out"})
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return response


# Duplicate /api/me removed — canonical version is below at the JSON API section

# ── JSON API Routes (for React SPA) ──────────────────────────────────────

# ── Health Checks ────────────────────────────────────────────────────────

# /health is defined above at L150 — single liveness probe


@app.get("/health/ready")
async def health_readiness():
    """Deep readiness probe — verifies DB connectivity and API key presence."""
    from database import check_connection
    db_status = await check_connection()
    openai_ok = bool(Config.AZURE_OPENAI_API_KEY)
    bing_ok = bool(Config.BING_SEARCH_API_KEY)
    all_ok = db_status.get("status") == "connected" and openai_ok

    return JSONResponse(
        content={
            "ready": all_ok,
            "checks": {
                "database": db_status,
                "openai_key": "present" if openai_ok else "MISSING",
                "bing_key": "present" if bing_ok else "MISSING",
                "demo_mode": Config.DEMO_MODE,
            },
        },
        status_code=200 if all_ok else 503,
    )


@app.get("/api/me")
async def api_me(user: dict = Depends(get_current_user)):
    """Get current user info and system configuration."""
    models = [
        {"name": "GPT-4o", "description": "Flagship reasoning, 120ms avg latency"},
        {"name": "GPT-4o-mini", "description": "Cost-efficient, 60ms avg latency"},
    ]
    return JSONResponse({
        "username": user.get("username", "unknown"),
        "role": user.get("role", "Viewer"),
        "models": models,
        "domains": Config.DOMAINS,
        "threshold": 0.85,
        "demo_mode": Config.DEMO_MODE,
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

from pydantic import BaseModel
from database import get_settings, update_settings
from typing import Optional as Opt

class SettingsUpdate(BaseModel):
    trust_threshold: Opt[float] = None
    components: Opt[dict] = None
    source_weights: Opt[dict] = None

@app.get("/api/settings")
async def api_get_settings(user: dict = Depends(get_current_user)):
    """Get dynamically configurable settings from database."""
    settings = await get_settings()
    return JSONResponse(settings)

@app.post("/api/settings")
async def api_update_settings(payload: SettingsUpdate, user: dict = Depends(require_role(["Admin"]))):
    """Update dynamic settings (Admin only)."""
    update_data = payload.model_dump(exclude_unset=True)
    if not update_data:
        return JSONResponse({"status": "no_changes"})
    await update_settings(update_data)
    return JSONResponse({"status": "success", "updated": len(update_data)})

class QueryRequest(BaseModel):
    query: str

@app.post("/api/query")
@limiter.limit("20/minute")
async def process_query(request: Request, payload: QueryRequest, user: dict = Depends(get_current_user)):
    """Accepts a query, routes it, and returns a unique stream ID for SSE tracking."""
    import uuid
    from pipeline.router import route_query
    from database import log_query
    
    query_id = str(uuid.uuid4())
    
    # Step 1: Classify query into domain probability vector
    domain_vector = await classify_domain(payload.query, Config.get_azure_openai_client())
    
    # Step 2: Route to best model using domain vector
    route_decision = await route_query(domain_vector)
    
    # Pre-log the query so the SSE endpoint can find it immediately
    await log_query(
        query_id=query_id,
        query_text=payload.query,
        domain_vector=domain_vector,
        routed_model=route_decision["selected_model"],
        routing_reason=route_decision["reason"],
        cached=False,
        user_id=user.get("user_id")
    )
    
    return JSONResponse({
        "query_id": query_id,
        "model": route_decision["selected_model"],
        "domain_vector": domain_vector
    })

@app.get("/api/verify/{query_id}")
async def api_verify_stream(request: Request, query_id: str, user: dict = Depends(get_current_user)):
    """SSE endpoint for streaming verification results."""
    last_event_id = request.headers.get("Last-Event-ID")
    last_id = int(last_event_id) if last_event_id and last_event_id.isdigit() else 0

    async def event_generator():
        current_event_id = [0]
        
        async def _sleep(seconds):
            if current_event_id[0] < last_id:
                return
            import asyncio
            await asyncio.sleep(seconds)

        async def _generate_raw():
            import json
            # Look up from Cosmos DB query_log collection
            from database import get_query_by_id
            row = await get_query_by_id(query_id)

            if not row:
                yield {"event": "error", "data": json.dumps({"error": "Query not found"})}
                return

            query_text = row["query_text"]
            domain_vector = row.get("domain_vector", {})
            if isinstance(domain_vector, str):
                import json
                domain_vector = json.loads(domain_vector)
            primary_domain = max(domain_vector, key=domain_vector.get) if domain_vector else "General"
            model_used = row["routed_model"]

            # Check cache
            cached = get_cached_response(query_text)

            if cached:
                claims = cached.get("claims", [])
                verifications = cached.get("verifications", [])

                for step in ["shield", "classify", "route"]:
                    yield {"event": step, "data": json.dumps({"step": step, "status": "done"})}
                    await _sleep(0.25)

                yield {"event": "llm", "data": json.dumps({"step": "llm", "status": "done", "model": model_used})}
                await _sleep(0.3)

                yield {
                    "event": "response",
                    "data": json.dumps({
                        "response_text": cached["response"],
                        "model": model_used,
                        "cached": True
                    })
                }
                await _sleep(0.3)

                yield {"event": "decompose", "data": json.dumps({"step": "decompose", "status": "done"})}
                await _sleep(0.2)

                yield {
                    "event": "claims",
                    "data": json.dumps({"claims": claims, "total": len(claims)})
                }
                await _sleep(0.3)

                yield {"event": "verify", "data": json.dumps({"step": "verify", "status": "active"})}

                all_claim_results = []
                for i, verif in enumerate(verifications):
                    await _sleep(0.8)
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

                yield {"event": "consensus", "data": json.dumps({"step": "consensus", "status": "done"})}

                await _sleep(0.5)
                yield {
                    "event": "overall_trust",
                    "data": json.dumps(cached["overall_trust"])
                }

                for verif in verifications:
                    passed = verif["consensus"]["final_verdict"] == "pass"
                    await update_profile(model_used, primary_domain, passed)

                await update_query_trust(
                    query_id, cached["overall_trust"]["overall_score"],
                    cached["response"]
                )

                await _sleep(0.2)
                yield {
                    "event": "profile",
                    "data": json.dumps({"step": "profile", "status": "done"})
                }

            else:
                for step in ["shield", "classify", "route"]:
                    yield {"event": step, "data": json.dumps({"step": step, "status": "done"})}
                    await _sleep(0.2)

                yield {"event": "llm", "data": json.dumps({"step": "llm", "status": "active", "model": model_used})}
                
                from pipeline.generator import generate_response # type: ignore
                response_text = await generate_response(query_text, primary_domain, model_used, Config.get_azure_openai_client())
                
                yield {"event": "llm", "data": json.dumps({"step": "llm", "status": "done", "model": model_used})}
                await _sleep(0.2)

                yield {
                    "event": "response",
                    "data": json.dumps({"response_text": response_text, "model": model_used, "cached": False})
                }
                await _sleep(0.3)

                yield {"event": "decompose", "data": json.dumps({"step": "decompose", "status": "done"})}

                claims = await decompose_claims(response_text)
                yield {
                    "event": "claims",
                    "data": json.dumps({"claims": claims, "total": len(list(claims))})
                }

                yield {"event": "verify", "data": json.dumps({"step": "verify", "status": "active"})}

                all_claim_results = []
                
                async def _verify_single(claim_data, idx):
                    results = await verify_claim(
                        claim=claim_data["claim"],
                        claim_type=claim_data.get("type", "factual"),
                        domain=primary_domain,
                        primary_model=model_used,
                        openai_client=Config.get_azure_openai_client()
                    )
                    consensus = await compute_consensus(results, primary_domain, domain_vector)
                    return {
                        "index": idx,
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

                verification_tasks = [
                    _verify_single(cd, i) for i, cd in enumerate(claims)
                ]
                import asyncio
                parallel_results = await asyncio.gather(*verification_tasks, return_exceptions=True)

                for res in parallel_results:
                    if isinstance(res, Exception):
                        print(f"[PIPELINE] Claim verification error: {res}")
                        continue
                    
                    res_dict = dict(res) # type: ignore
                    await _sleep(0.3)
                    all_claim_results.append({"consensus": res_dict["consensus"]})
                    yield {
                        "event": "verification",
                        "data": safe_json(res_dict)
                    }

                    passed = res_dict["consensus"]["final_verdict"] == "pass"  # type: ignore
                    await update_profile(model_used, primary_domain, passed)

                yield {"event": "consensus", "data": json.dumps({"step": "consensus", "status": "done"})}

                await _sleep(0.3)
                overall = compute_overall_trust(all_claim_results)
                await update_query_trust(query_id, overall["overall_score"], response_text)
                yield {
                    "event": "overall_trust",
                    "data": safe_json(overall)
                }

                await _sleep(0.2)
                yield {
                    "event": "profile",
                    "data": json.dumps({"step": "profile", "status": "done"})
                }

            await _sleep(0.5)
            yield {"event": "done", "data": json.dumps({"status": "complete"})}

        async for r_event in _generate_raw():
            current_event_id[0] += 1
            if current_event_id[0] <= last_id:
                continue
            r_event["id"] = str(current_event_id[0])
            yield r_event

    return EventSourceResponse(event_generator())


from fastapi import BackgroundTasks

@app.post("/api/run-self-audit")
async def api_run_self_audit(background_tasks: BackgroundTasks, user: dict = Depends(get_current_user)):
    """Trigger a self-audit cycle manually."""
    from jobs import run_self_audit
    background_tasks.add_task(run_self_audit)
    return JSONResponse({"status": "Self-audit cycle queued"})

@app.get("/api/audit")
async def api_audit(user: dict = Depends(get_current_user)):
    """Get audit log data for the Audit page."""
    is_admin = user.get("role") == "Admin"
    user_id = user.get("user_id")
    queries = await get_recent_queries(user_id=user_id, limit=200, is_admin=is_admin)
    audit_entries = []
    for q in queries:
        audit_entries.append({
            "query_id": q.get("query_id", ""),
            "query": q.get("query_text", ""),
            "model": q.get("routed_model", "Unknown"),
            "domain": max(q.get("domain_vector", {"General": 1}), key=lambda k: q.get("domain_vector", {"General": 1}).get(k, 0)) if q.get("domain_vector") else "General",
            "trust_score": q.get("overall_trust_score", 0),
            "timestamp": q.get("created_at", "").isoformat() if hasattr(q.get("created_at", ""), "isoformat") else str(q.get("created_at", "")),
            "verification_complete": q.get("verification_complete", False),
            "routing_reason": q.get("routing_reason", ""),
        })
    return JSONResponse({"audit_data": audit_entries})


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
    # No React build — return a simple fallback
    return JSONResponse(
        {"error": "Frontend not built. Run: cd frontend && npm run build"},
        status_code=503,
    )
