"""Self-Audit Engine — Breaks the recursive trust paradox.

Injects ground-truth claims with known verdicts into the verification
pipeline to measure verifier accuracy. This quantifies the trustworthiness
of the verification process itself.
"""
import uuid
import random
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from database import log_self_audit, get_self_audit_stats
from pipeline.verifier import verify_claim
from pipeline.consensus import compute_consensus
from seed_data import GROUND_TRUTH_CLAIMS


async def run_self_audit(num_claims: int = 5, openai_client=None) -> dict:
    """Run a self-audit cycle by injecting ground-truth claims.

    Args:
        num_claims: Number of ground-truth claims to inject
        openai_client: Optional Azure OpenAI client

    Returns:
        Audit results including accuracy percentage
    """
    audit_id = str(uuid.uuid4())[:8]

    # Sample random ground-truth claims
    claims_to_test = random.sample(
        GROUND_TRUTH_CLAIMS,
        min(num_claims, len(GROUND_TRUTH_CLAIMS))
    )

    results = []
    correct: int = 0

    for gt_claim in claims_to_test:
        claim = gt_claim["claim"]
        expected = gt_claim["expected"]
        domain = gt_claim["domain"]

        # Run through actual verification pipeline
        verification_results = await verify_claim(
            claim=claim,
            claim_type="factual",
            domain=domain,
            primary_model="GPT-4o",
            openai_client=openai_client
        )

        # Get consensus
        consensus = await compute_consensus(verification_results, domain)
        actual_verdict = consensus["final_verdict"]

        # Map consensus verdict to expected format
        # Only strict "pass" counts as verified true
        # "partial" is NOT treated as pass — that inflates accuracy
        actual_mapped = actual_verdict  # pass, partial, or fail

        is_correct = (
            (actual_mapped == "pass" and expected == "pass") or
            (actual_mapped == "fail" and expected == "fail")
        )
        if is_correct:
            correct += 1  # pyre-ignore

        # Log to database
        await log_self_audit(
            audit_id=audit_id,
            claim=claim,
            expected=expected,
            actual=actual_mapped,
            correct=is_correct,
            domain=domain
        )

        results.append({
            "claim": claim,
            "domain": domain,
            "expected": expected,
            "actual": actual_mapped,
            "consensus_confidence": consensus["final_confidence"],
            "correct": is_correct
        })

    accuracy: float = (correct / len(results) * 100.0) if results else 0.0  # pyre-ignore

    return {
        "audit_id": audit_id,
        "claims_tested": len(results),
        "correct": correct,
        "accuracy": round(accuracy, 1),  # pyre-ignore
        "results": results,
        "cumulative_stats": await get_self_audit_stats()
    }
