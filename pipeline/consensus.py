"""Domain-Weighted Consensus Engine — Aggregates verification results.

Applies domain-specific source weights to produce a final confidence score
and pass/partial/fail verdict per claim.
"""

# Domain-specific source weights
SOURCE_WEIGHTS = {
    "Medical": {"bing": 0.35, "wikipedia": 0.20, "cross_model": 0.25, "wolfram": 0.20},
    "Legal": {"bing": 0.40, "wikipedia": 0.15, "cross_model": 0.30, "wolfram": 0.15},
    "Finance": {"bing": 0.30, "wikipedia": 0.15, "cross_model": 0.25, "wolfram": 0.30},
    "Science": {"bing": 0.25, "wikipedia": 0.25, "cross_model": 0.25, "wolfram": 0.25},
    "History": {"bing": 0.25, "wikipedia": 0.35, "cross_model": 0.30, "wolfram": 0.10},
}

# Default weights if domain not found
DEFAULT_WEIGHTS = {"bing": 0.30, "wikipedia": 0.25, "cross_model": 0.25, "wolfram": 0.20}


def compute_consensus(verification_results: list, domain: str,
                       domain_vector: dict = None) -> dict:
    """Compute domain-weighted consensus from multiple verification sources.

    Args:
        verification_results: List of dicts from verifier.verify_claim()
        domain: Primary domain for weight selection
        domain_vector: Optional probability vector for cross-domain weighting

    Returns:
        Dict with final confidence, verdict, and per-source breakdown
    """
    weights = SOURCE_WEIGHTS.get(domain, DEFAULT_WEIGHTS)

    # If we have a domain vector with multiple significant domains,
    # blend the weights proportionally
    if domain_vector:
        blended_weights = {"bing": 0, "wikipedia": 0, "cross_model": 0, "wolfram": 0}
        for d, prob in domain_vector.items():
            if prob > 0.1:  # Only blend domains with >10% probability
                dw = SOURCE_WEIGHTS.get(d, DEFAULT_WEIGHTS)
                for source in blended_weights:
                    blended_weights[source] += prob * dw[source]
        # Normalize
        total = sum(blended_weights.values())
        if total > 0:
            weights = {s: w / total for s, w in blended_weights.items()}

    # Aggregate
    weighted_confidence = 0.0
    total_weight = 0.0
    source_breakdown = []
    verdict_votes = {"supported": 0, "refuted": 0, "inconclusive": 0, "not_applicable": 0}

    for result in verification_results:
        source = result["source"]
        weight = weights.get(source, 0.1)
        verdict = result["verdict"]
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
