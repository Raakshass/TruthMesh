"""Database layer for TruthMesh - Azure Cosmos DB (MongoDB API) with async Motor access."""
import os
import json
import logging
from typing import Optional
from cryptography.fernet import Fernet
from config import Config
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone

# Cosmos DB Mongo Connection string injected via App Settings
COSMOS_URI = os.getenv("COSMOS_DB_CONNECTION_STRING")
DB_NAME = "truthmesh"

try:
    cipher_suite = Fernet(Config.FIELD_ENCRYPTION_KEY) if Config.FIELD_ENCRYPTION_KEY else None
    if not cipher_suite:
        logging.warning("FIELD_ENCRYPTION_KEY not set. Storing data in PLAINTEXT.")
except Exception as e:
    logging.error(f"Failed to initialize encryption: {e}")
    cipher_suite = None

def encrypt_val(val: str) -> str:
    if not val or not cipher_suite: return val
    try: return cipher_suite.encrypt(val.encode('utf-8')).decode('utf-8')
    except: return val

def decrypt_val(val: str) -> str:
    if not val or not cipher_suite: return val
    try: return cipher_suite.decrypt(val.encode('utf-8')).decode('utf-8')
    except: return val

client = None
db = None

async def init_db():
    """Initialize Cosmos DB connection and core indexes."""
    global client, db
    if not COSMOS_URI:
        logging.warning("COSMOS_DB_CONNECTION_STRING missing. Cosmos DB logic is disabled.")
        return
    client = AsyncIOMotorClient(COSMOS_URI)
    db = client[DB_NAME]
    
    # Create necessary unique indexes
    await db.topography_scores.create_index([("model", 1), ("domain", 1)], unique=True)
    await db.query_log.create_index("query_id", unique=True)
    await db.users.create_index("username", unique=True)
    await db.ground_truth_repository.create_index("claim", unique=True)
    logging.info("Cosmos DB Engine initialized successfully.")

async def get_topography_data():
    cursor = db.topography_scores.find().sort([("model", 1), ("domain", 1)])
    return [doc async for doc in cursor]

async def get_topography_score(model: str, domain: str):
    return await db.topography_scores.find_one({"model": model, "domain": domain})

async def update_topography_score(model: str, domain: str, new_score: float, new_lower: float, new_upper: float, sample_count: int):
    await db.topography_scores.update_one(
        {"model": model, "domain": domain},
        {"$set": {
            "reliability_score": new_score, 
            "confidence_lower": new_lower, 
            "confidence_upper": new_upper,
            "sample_count": sample_count,
            "source_label": "PRODUCTION",
            "updated_at": datetime.now(timezone.utc)
        }},
        upsert=True
    )

async def log_verification(query_id: str, query_text: str, claim: str, claim_type: str, source: str, source_detail: str, verdict: str, confidence: float, domain: str, model_used: str):
    doc = {
        "query_id": query_id,
        "query_text": encrypt_val(query_text) if query_text else None,
        "claim": encrypt_val(claim),
        "claim_type": claim_type,
        "source": source,
        "source_detail": source_detail,
        "verdict": verdict,
        "confidence": confidence,
        "domain": domain,
        "model_used": model_used,
        "created_at": datetime.now(timezone.utc)
    }
    await db.verification_history.insert_one(doc)

async def log_query(query_id: str, query_text: str, domain_vector: dict, routed_model: str, routing_reason: str, cached: bool = False, user_id: Optional[int] = None):
    doc = {
        "query_id": query_id,
        "query_text": encrypt_val(query_text),
        "domain_vector": domain_vector,
        "routed_model": routed_model,
        "routing_reason": routing_reason,
        "cached": cached,
        "user_id": user_id,
        "verification_complete": False,
        "created_at": datetime.now(timezone.utc)
    }
    await db.query_log.insert_one(doc)

async def update_query_trust(query_id: str, trust_score: float, response_text: str):
    await db.query_log.update_one(
        {"query_id": query_id},
        {"$set": {"overall_trust_score": trust_score, "response_text": response_text, "verification_complete": True}}
    )

async def log_self_audit(audit_id: str, claim: str, expected: str, actual: str, correct: bool, domain: str):
    await db.self_audit_results.insert_one({
        "audit_id": audit_id, "injected_claim": claim, "expected_verdict": expected,
        "actual_verdict": actual, "correct": correct, "domain": domain, "created_at": datetime.now(timezone.utc)
    })

async def get_self_audit_stats():
    total = await db.self_audit_results.count_documents({})
    correct = await db.self_audit_results.count_documents({"correct": True})
    acc = (correct / total * 100) if total > 0 else 0
    return {"total": total, "correct_count": correct, "accuracy": round(acc, 1)}

async def ingest_ground_truth(claims: list) -> int:
    inserted = 0
    for c in claims:
        try:
            doc = {**c, "created_at": datetime.now(timezone.utc), "last_validated_at": None}
            res = await db.ground_truth_repository.update_one({"claim": c["claim"]}, {"$setOnInsert": doc}, upsert=True)
            if res.upserted_id: inserted += 1
        except Exception:
            pass
    return inserted

async def get_ground_truth_claim(claim: str) -> Optional[dict]:
    return await db.ground_truth_repository.find_one({"claim": claim})

async def get_due_ground_truth_claims(limit: int = 50) -> list:
    cursor = db.ground_truth_repository.find({"$or": [{"last_validated_at": None}]}).limit(limit)
    return [doc async for doc in cursor]

async def update_ground_truth_validation(claim_id):
    await db.ground_truth_repository.update_one({"_id": claim_id}, {"$set": {"last_validated_at": datetime.now(timezone.utc)}})

async def get_recent_queries(user_id: Optional[int] = None, limit: int = 10, is_admin: bool = False):
    query = {}
    if not is_admin and user_id:
        query["user_id"] = user_id
    cursor = db.query_log.find(query).sort("created_at", -1).limit(limit)
    res = []
    async for row in cursor:
        row["query_text"] = decrypt_val(row.get("query_text", ""))
        row["_id"] = str(row["_id"])
        res.append(row)
    return res

async def get_user_by_username(username: str):
    return await db.users.find_one({"username": username})

async def create_user(username: str, hashed_password: str, role: str = "Viewer"):
    res = await db.users.insert_one({"username": username, "hashed_password": hashed_password, "role": role})
    return str(res.inserted_id)
