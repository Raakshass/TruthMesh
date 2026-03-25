# Thread: ground-truth-engine-pivot

## Status: IN PROGRESS

## Goal
Implement a localized Ground Truth Engine to provide O(1) cache lookups, mitigate API rate limits, and provide a persistent anchor for NLI entailment validation. This addresses a critical flaw in Phase 7 where the system relied entirely on live API fetching without a robust caching or memory layer.

## Context
*Created from conversation on 2026-03-26.*
The verification engine was hammering PubMed and Fact Check APIs on the fly, making it extremely brittle under load (a fatal flaw for a demo). We are pivoting to ingest benchmark datasets (TruthfulQA, MedQA) into a `ground_truth_repository` table.

## Next Steps
- Add `ground_truth_repository` to `database.py` schema.
- Create `pipeline/ingest_ground_truth.py` to seed the database.
- Implement automated cron job in `jobs.py` to continuously self-audit against this ground truth.
