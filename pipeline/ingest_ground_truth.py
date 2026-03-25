"""Seed the Ground Truth Repository with benchmark datasets.

This script ingests samples from TruthfulQA (General/Science) and
MedQA (Medical) to populate the local database for self-auditing
and O(1) latency cache hits.
"""
import asyncio
import os
import sys
import json
import argparse

# Add parent to path so we can import database
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import database

async def ingest_from_jsonl_stream(filepath: str, batch_size: int = 1000) -> int:
    """Production stream ingestion for large benchmark datasets.
    
    Reads from a JSONL file and streams batches of 1000 records to the DB
    to prevent memory bloat and SQLite lock contention.
    """
    if not os.path.exists(filepath):
        print(f"[INGEST] Warning: File {filepath} not found. Cannot stream.")
        return 0
        
    inserted = 0
    batch = []
    print(f"[INGEST] Starting bulk stream from {filepath} (batch_size={batch_size})")
    
    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                record = json.loads(line)
                batch.append({
                    "claim": record["claim"],
                    "expected_verdict": record["expected_verdict"],
                    "domain": record.get("domain", "General"),
                    "source_dataset": record.get("source_dataset", "BulkImport")
                })
            except (json.JSONDecodeError, KeyError) as e:
                print(f"[INGEST] Skipping malformed line. Error: {e}")
                
            if len(batch) >= batch_size:
                inserted += await database.ingest_ground_truth(batch)
                batch = []
                print(f"[INGEST] Progress: {inserted} records inserted...")
                
    if batch:
        inserted += await database.ingest_ground_truth(batch)
        print(f"[INGEST] Final batch inserted. Total: {inserted}")
        
    return inserted

async def ingest_mocks_if_empty():
    """Fallback for hackathon/demo environments without datasets."""
    MEDQA_SAMPLES = [
        {"claim": "Insulin regulates blood sugar.", "expected_verdict": "supported", "domain": "Medical", "source_dataset": "MedQA_Demo"},
        {"claim": "Vaccines cause autism.", "expected_verdict": "refuted", "domain": "Medical", "source_dataset": "MedQA_Demo"}
    ]
    await database.ingest_ground_truth(MEDQA_SAMPLES)

async def run_ingestion(filepath: str = None):
    print("[INGEST] Initialize database if not exists...")
    await database.init_db()
    
    if filepath:
        await ingest_from_jsonl_stream(filepath)
    else:
        print("[INGEST] No dataset specified. Loading fallback mocks...")
        await ingest_mocks_if_empty()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="TruthMesh Ground Truth Bulk Ingester")
    parser.add_argument("--file", type=str, help="Path to JSONL dataset file", default=None)
    args = parser.parse_args()
    
    asyncio.run(run_ingestion(args.file))
