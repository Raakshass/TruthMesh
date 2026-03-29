"""Domain-Weighted Consensus Engine — Aggregates verification results.

Applies domain-specific source weights to produce a final confidence score
and pass/partial/fail verdict per claim.
"""
from config import Config

# Import from single source of truth
SOURCE_WEIGHTS = Config.SOURCE_WEIGHTS
DEFAULT_WEIGHTS = Config.DEFAULT_WEIGHTS


async def compute_consensus(verification_results: list, domain: str,
                       domain_vector: dict = None,
                       settings: dict = None) -> dict:
    """Compute domain-weighted consensus from multiple verification sources.

    Args:
        verification_results: List of dicts from verifier.verify_claim()
        domain: Primary domain for weight selection
        domain_vector: Optional probability vector for cross-domain weighting
        settings: Optional pre-fetched settings dict to avoid DB round-trip

    Returns:
        Dict with final confidence, verdict, and per-source breakdown
    """
    if not settings:
        from database import get_settings
        settings = await get_settings()
    source_weights = settings.get("source_weights") if settings else None
    if not source_weights:
        source_weights = Config.SOURCE_WEIGHTS
        
    weights = source_weights.get(domain, Config.DEFAULT_WEIGHTS)

    # If we have a domain vector with multiple significant domains,
    # blend the weights proportionally
    if domain_vector:
        # Dynamically derive all source keys from all domain weights
        all_sources = set()
        for dw in source_weights.values():
            all_sources.update(dw.keys())
        blended_weights = {s: 0.0 for s in all_sources}

        for d, prob in domain_vector.items():
            if prob > 0.1:  # Only blend domains with >10% probability
                dw = source_weights.get(d, Config.DEFAULT_WEIGHTS)
                for source in blended_weights:
                    blended_weights[source] += prob * dw.get(source, 0.0)
        # Normalize
        total = sum(blended_weights.values())
        if total > 0:
            weights = {s: w / total for s, w in blended_weights.items()}

    if not verification_results:
        return {
            "final_confidence": 0.0,
            "final_verdict": "fail",
            "source_breakdown": [],
            "weights_used": {k: round(v, 3) for k, v in weights.items()},
            "verdict_distribution": {}
        }
    
    # Aggregate
    weighted_confidence = 0.0
    total_weight = 0.0
    source_breakdown = []
    verdict_votes = {"supported": 0, "refuted": 0, "inconclusive": 0, "not_applicable": 0}

    for result in verification_results:
        source = result["source"]
        weight = weights.get(source, 0.1)
        verdict = result["verdict"]
        if verdict == "neutral":
            verdict = "inconclusive"
        confidence = result["confidence"]

        # Skip not_applicable sources
        if verdict == "not_applicable":
            source_breakdown.append({
                **result,
                "weight": 0,
                "weighted_contribution": 0.0
            })
            continue

        # Convert verdict to numeric
        verdict_score = {"supported": 1.0, "refuted": 0.0, "inconclusive": 0.5}.get(verdict, 0.5)
        contribution = weight * confidence * verdict_score
        weighted_confidence += contribution
        total_weight += weight
        verdict_votes[verdict] += weight

        source_breakdown.append({
            **result,
            "weight": round(weight, 3),
            "weighted_contribution": round(contribution, 4)
        })

    # Final score
    final_confidence = weighted_confidence / total_weight if total_weight > 0 else 0.5

    # Determine verdict
    if final_confidence >= 0.70:
        final_verdict = "pass"
    elif final_confidence >= 0.40:
        final_verdict = "partial"
    else:
        final_verdict = "fail"

    return {
        "final_confidence": round(final_confidence, 3),
        "final_verdict": final_verdict,
        "source_breakdown": source_breakdown,
        "weights_used": {k: round(v, 3) for k, v in weights.items()},
        "verdict_distribution": {k: round(v, 3) for k, v in verdict_votes.items() if v > 0}
    }


def compute_overall_trust(claim_results: list) -> dict:
    """Compute overall trust score across all claims in a response.

    Args:
        claim_results: List of claim consensus results

    Returns:
        Overall trust score and breakdown
    """
    if not claim_results:
        return {"overall_score": 0.5, "verdict": "partial", "claim_count": 0}

    scores = [cr["consensus"]["final_confidence"] for cr in claim_results
              if "consensus" in cr]

    if not scores:
        return {"overall_score": 0.5, "verdict": "partial", "claim_count": 0}

    avg_score = sum(scores) / len(scores)

    # Count verdicts
    verdicts = [cr["consensus"]["final_verdict"] for cr in claim_results
                if "consensus" in cr]
    pass_count = verdicts.count("pass")
    fail_count = verdicts.count("fail")
    partial_count = verdicts.count("partial")

    if avg_score >= 0.70:
        overall_verdict = "pass"
    elif avg_score >= 0.40:
        overall_verdict = "partial"
    else:
        overall_verdict = "fail"

    return {
        "overall_score": round(avg_score, 3),
        "verdict": overall_verdict,
        "claim_count": len(scores),
        "pass_count": pass_count,
        "partial_count": partial_count,
        "fail_count": fail_count
    }
