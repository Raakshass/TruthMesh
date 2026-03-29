"""Tests for consensus.py — domain-weighted aggregation logic."""
import pytest
from pipeline.consensus import compute_consensus, compute_overall_trust


class TestComputeConsensus:
    """Test domain-weighted consensus aggregation."""

    @pytest.mark.asyncio
    async def test_all_supported_yields_pass(self):
        results = [
            {"source": "pubmed", "verdict": "supported", "confidence": 0.9},
            {"source": "bing", "verdict": "supported", "confidence": 0.85},
            {"source": "factcheck", "verdict": "supported", "confidence": 0.95},
        ]
        consensus = await compute_consensus(results, "Medical")

        assert consensus["final_verdict"] == "pass"
        assert consensus["final_confidence"] >= 0.7

    @pytest.mark.asyncio
    async def test_all_refuted_yields_fail(self):
        results = [
            {"source": "pubmed", "verdict": "refuted", "confidence": 0.9},
            {"source": "bing", "verdict": "refuted", "confidence": 0.85},
            {"source": "factcheck", "verdict": "refuted", "confidence": 0.9},
        ]
        consensus = await compute_consensus(results, "Medical")

        assert consensus["final_verdict"] == "fail"

    @pytest.mark.asyncio
    async def test_mixed_yields_partial(self):
        results = [
            {"source": "pubmed", "verdict": "supported", "confidence": 0.9},
            {"source": "bing", "verdict": "refuted", "confidence": 0.7},
            {"source": "factcheck", "verdict": "neutral", "confidence": 0.5},
        ]
        consensus = await compute_consensus(results, "Medical")

        # Mixed results should not yield "pass"
        assert consensus["final_verdict"] in ("partial", "fail")

    @pytest.mark.asyncio
    async def test_empty_results(self):
        consensus = await compute_consensus([], "Medical")

        assert consensus["final_verdict"] == "fail"
        assert consensus["final_confidence"] == 0.0

    @pytest.mark.asyncio
    async def test_unknown_domain_uses_defaults(self):
        results = [
            {"source": "bing", "verdict": "supported", "confidence": 0.8},
        ]
        consensus = await compute_consensus(results, "Unknown_Domain_XYZ")
        # Should not crash — falls back to General/DEFAULT_WEIGHTS
        assert "final_verdict" in consensus

    @pytest.mark.asyncio
    async def test_cross_domain_blending(self):
        """When domain_vector spans multiple domains, weights should blend."""
        results = [
            {"source": "bing", "verdict": "supported", "confidence": 0.85},
            {"source": "factcheck", "verdict": "supported", "confidence": 0.9},
        ]
        domain_vector = {"Medical": 0.6, "Legal": 0.3, "Finance": 0.1}
        consensus = await compute_consensus(results, "Medical", domain_vector=domain_vector)

        assert consensus["final_verdict"] in ("pass", "partial")


class TestComputeOverallTrust:
    """Test overall trust score computation."""

    def test_single_claim_pass(self):
        claims = [
            {"consensus": {"final_confidence": 0.9, "final_verdict": "pass"}},
        ]
        result = compute_overall_trust(claims)
        assert result["overall_score"] >= 0.8
        assert result["verdict"] == "pass"

    def test_mixed_claims(self):
        claims = [
            {"consensus": {"final_confidence": 0.95, "final_verdict": "pass"}},
            {"consensus": {"final_confidence": 0.3, "final_verdict": "fail"}},
        ]
        result = compute_overall_trust(claims)
        assert 0.3 < result["overall_score"] < 0.95

    def test_empty_claims(self):
        result = compute_overall_trust([])
        assert result["overall_score"] == 0.5
        assert result["claim_count"] == 0
