# pyre-ignore-all-errors
"""Bayesian Profiler — Updates topography map via posterior updating.

Implements Wilson confidence interval calculation and Bayesian updating
of per-model, per-domain reliability scores after verification.

Includes exponential time-decay to address model drift: recent observations
carry significantly more weight than historical data, ensuring the topography
map reacts quickly to silent API degradation or model quality changes.
"""
import math
from datetime import datetime, timezone
from database import get_topography_score, update_topography_score  # type: ignore

# ── Time-Decay Configuration ────────────────────────────────────────────
DECAY_HALF_LIFE_DAYS = 7       # After 7 days, old data loses half its weight
DECAY_LAMBDA = math.log(2) / DECAY_HALF_LIFE_DAYS  # ≈ 0.099
MAX_EFFECTIVE_SAMPLES = 200    # Cap to prevent stale score inertia


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

    return (max(0.0, round(center - margin, 4)),  # type: ignore
            min(1.0, round(center + margin, 4)))  # type: ignore


def _compute_decay_weight(updated_at) -> float:
    """Compute exponential decay weight based on age of last update.

    Recent data (< 1 day old) has weight ≈ 1.0.
    7-day-old data has weight ≈ 0.5.
    30-day-old data has weight ≈ 0.12.
    """
    if updated_at is None:
        return 0.5  # Unknown age — use moderate weight

    now = datetime.now(timezone.utc)
    if isinstance(updated_at, str):
        try:
            updated_at = datetime.fromisoformat(updated_at.replace('Z', '+00:00'))
        except (ValueError, AttributeError):
            return 0.5
    elif isinstance(updated_at, datetime):
        if updated_at.tzinfo is None:
            updated_at = updated_at.replace(tzinfo=timezone.utc)

    age_days = (now - updated_at).total_seconds() / 86400
    return math.exp(-DECAY_LAMBDA * max(0.0, float(age_days)))  # type: ignore


async def update_profile(model: str, domain: str, verification_passed: bool):
    """Update the topography profile for a model-domain pair.

    Uses Bayesian posterior updating WITH exponential time-decay:
    - Recent observations carry up to 4× more weight than 14-day-old data
    - Prior sample count is decayed to prevent stale score inertia
    - MAX_EFFECTIVE_SAMPLES caps the denominator to ensure responsiveness

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

    # ── Time-Decay: discount historical weight ──────────────────────────
    prior_score = current["reliability_score"]
    prior_samples = current["sample_count"]
    decay_weight = _compute_decay_weight(current.get("updated_at"))

    # Decay the effective sample count — stale data "forgets"
    decayed_samples = min(
        round(prior_samples * decay_weight),
        MAX_EFFECTIVE_SAMPLES
    )
    decayed_samples = max(decayed_samples, 1)  # Floor at 1

    new_samples = decayed_samples + 1

    # Decayed prior successes + new observation
    decayed_successes = round(prior_score * decayed_samples)
    new_successes = decayed_successes + (1 if verification_passed else 0)

    # Updated score
    new_score = round(new_successes / new_samples, 4)

    # Updated Wilson CI
    lower, upper = wilson_confidence_interval(new_successes, new_samples)

    await update_topography_score(model, domain, new_score, lower, upper, new_samples)

    drift_indicator = "↗" if new_score > prior_score else ("↘" if new_score < prior_score else "→")
    print(f"[PROFILER] {model}/{domain}: {prior_score:.3f} {drift_indicator} {new_score:.3f} "
          f"(n={new_samples}, decay={decay_weight:.2f}, CI=[{lower:.3f}, {upper:.3f}])")
