"""Hallucination-Aware Router — O(1) topography lookup for model selection.

Routes queries to the most reliable model for each specific topic,
with full explainability data (reliability bars, sample sizes, confidence intervals).
"""
from config import Config
from database import get_topography_data, get_topography_score


async def route_query(domain_vector: dict) -> dict:
    """Route query to the most reliable model based on domain vector.

    Args:
        domain_vector: Probability distribution across domains

    Returns:
        Dict with routing decision + explainability data
    """
    topography = await get_topography_data()

    if not topography:
        return {
            "selected_model": "GPT-4o",
            "reason": "Default routing — no topography data available",
            "confidence": 0.5,
            "model_scores": {},
            "domain_breakdown": {}
        }

    # Build model → domain → score lookup
    model_data = {}
    for entry in topography:
        model = entry["model"]
        domain = entry["domain"]
        if model not in model_data:
            model_data[model] = {}
        model_data[model][domain] = {
            "score": entry["reliability_score"],
            "lower": entry["confidence_lower"],
            "upper": entry["confidence_upper"],
            "samples": entry["sample_count"],
            "label": entry["source_label"]
        }

    # Calculate weighted reliability score per model
    model_scores = {}
    for model in Config.MODELS:
        if model not in model_data:
            continue
        weighted_score = 0.0
        for domain, prob in domain_vector.items():
            if domain in model_data[model]:
                weighted_score += prob * model_data[model][domain]["score"]
        model_scores[model] = round(weighted_score, 4)

    if not model_scores:
        return {
            "selected_model": "GPT-4o",
            "reason": "Fallback — no model scores computed",
            "confidence": 0.5,
            "model_scores": {},
            "domain_breakdown": {}
        }

    # Select best model
    selected_model = max(model_scores, key=model_scores.get)
    best_score = model_scores[selected_model]

    # Build detailed explainability data
    primary_domain = max(domain_vector, key=domain_vector.get)
    primary_prob = domain_vector[primary_domain]

    # Per-model breakdown for the UI
    explainability = []
    for model in Config.MODELS:
        if model not in model_data:
            continue
        model_info = {
            "model": model,
            "weighted_score": model_scores.get(model, 0),
            "is_selected": model == selected_model,
            "domains": {}
        }
        for domain in Config.DOMAINS:
            if domain in model_data.get(model, {}):
                d = model_data[model][domain]
                model_info["domains"][domain] = {
                    "score": d["score"],
                    "lower": d["lower"],
                    "upper": d["upper"],
                    "samples": d["samples"],
                    "label": d["label"],
                    "contribution": round(domain_vector.get(domain, 0) * d["score"], 4)
                }
        explainability.append(model_info)

    # Sort by weighted score descending
    explainability.sort(key=lambda x: x["weighted_score"], reverse=True)

    # Build human-readable reason
    if selected_model in model_data and primary_domain in model_data[selected_model]:
        pd = model_data[selected_model][primary_domain]
        reason = (
            f"Selected {selected_model} for this query because it has "
            f"{pd['score']*100:.0f}% reliability on {primary_domain} "
            f"({pd['lower']*100:.0f}%–{pd['upper']*100:.0f}% CI, "
            f"n={pd['samples']}) — the primary domain detected with "
            f"{primary_prob*100:.0f}% probability."
        )
    else:
        reason = f"Selected {selected_model} with highest weighted reliability score."

    return {
        "selected_model": selected_model,
        "reason": reason,
        "confidence": best_score,
        "primary_domain": primary_domain,
        "primary_domain_prob": primary_prob,
        "model_scores": model_scores,
        "explainability": explainability,
        "domain_vector": domain_vector
    }
