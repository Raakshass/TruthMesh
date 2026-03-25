# Phase 8: Dynamic Ground Truth & Self-Audit

## Objective
Formalize the Ground Truth Engine architecture. Move away from simply querying external APIs on-the-fly to a localized, structured Ground Truth repository that ingests benchmark datasets (TruthfulQA, MMLU, MedQA) for continuous self-auditing and immediate cache hits.

## Tasks

<task>
<read_first>
- `database.py`
- `pipeline/verifier.py`
</read_first>
<action>
Add `ground_truth_repository` table to `database.py` with columns: `id`, `domain`, `claim`, `ground_truth`, `source_dataset`, `confidence_score`, `last_updated`.

**Critical Flaw Addressed:** Current system has no memory. Another team will beat us on latency because they cache ground truth.
</action>
<acceptance_criteria>
- `database.py` contains `CREATE TABLE IF NOT EXISTS ground_truth_repository`
</acceptance_criteria>
</task>

<task>
<read_first>
- `database.py`
</read_first>
<action>
Create ingestion scripts (`pipeline/ingest_ground_truth.py`) to scrape/load MedQA and TruthfulQA subsets into `ground_truth_repository`.
</action>
<acceptance_criteria>
- `pipeline/ingest_ground_truth.py` exists and contains SQL inserts to `ground_truth_repository`
</acceptance_criteria>
</task>

<task>
<read_first>
- `jobs.py`
- `pipeline/verifier.py`
</read_first>
<action>
Implement an automated cron job (`jobs.py`) for continuous self-auditing. The engine must query against the `ground_truth_repository` internally to validate its own NLI logic accuracy and flag instances where API results contradict the static ground truth.
</action>
<acceptance_criteria>
- `jobs.py` contains `def run_self_audit():` that queries `ground_truth_repository`
</acceptance_criteria>
</task>
