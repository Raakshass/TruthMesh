"""Bayesian Profiler — Updates topography map via posterior updating.

Implements Wilson confidence interval calculation and Bayesian updating
of per-model, per-domain reliability scores after verification.
"""
import math
from database import get_topography_score, update_topography_score


def wilson_confidence_interval(successes: int, total: int, z: float = 1.96) -> tuple:
    """Calculate Wilson score confidence interval.

    Args:
        successes: Number of successful verifications
        total: Total number of verifications
        z: Z-score for confidence level (1.96 = 95% CI)

    Returns:
        (lower_bound, upper_bound) tuple
    """
    if total == 0:
        return (0.0, 1.0)

    p_hat = successes / total
    denominator = 1 + z * z / total

    center = (p_hat + z * z / (2 * total)) / denominator
    margin = (z / denominator) * math.sqrt(
        (p_hat * (1 - p_hat) + z * z / (4 * total)) / total
    )

    return (max(0.0, round(center - margin, 4)),
            min(1.0, round(center + margin, 4)))


async def update_profile(model: str, domain: str, verification_passed: bool):
    """Update the topography profile for a model-domain pair.

    Uses Bayesian posterior updating: the reliability score is updated
    as a weighted average of prior and new observation.

    Args:
        model: Model name (e.g., "GPT-4o")
        domain: Domain name (e.g., "Medical")
        verification_passed: Whether the claim was verified as true
    """
    current = await get_topography_score(model, domain)

    if current is None:
        # Cold start
        new_score = 1.0 if verification_passed else 0.0
        sample_count = 1
        lower, upper = wilson_confidence_interval(
            int(verification_passed), sample_count
        )
        await update_topography_score(model, domain, new_score, lower, upper, sample_count)
        return

    # Bayesian update: weighted combination of prior and observation
    prior_score = current["reliability_score"]
    prior_samples = current["sample_count"]
    new_samples = prior_samples + 1

    # Prior successes (approximate from score and sample count)
    prior_successes = round(prior_score * prior_samples)
    new_successes = prior_successes + (1 if verification_passed else 0)

    # Updated score
    new_score = round(new_successes / new_samples, 4)

    # Updated Wilson CI
    lower, upper = wilson_confidence_interval(new_successes, new_samples)

    await update_topography_score(model, domain, new_score, lower, upper, new_samples)

    print(f"[PROFILER] {model}/{domain}: {prior_score:.3f} → {new_score:.3f} "
          f"(n={new_samples}, CI=[{lower:.3f}, {upper:.3f}])")
