"""Tests for claim_decomposer.py — claim extraction and classification."""
import pytest
from pipeline.claim_decomposer import decompose_by_sentences


class TestDecomposeBySentences:
    """Test fallback sentence-level claim decomposition."""

    def test_extracts_factual_claims(self):
        text = "The Earth orbits the Sun. Water boils at 100 degrees Celsius."
        claims = decompose_by_sentences(text)

        assert len(claims) >= 1
        assert all("claim" in c and "type" in c for c in claims)

    def test_skips_hedging_language(self):
        text = "I think the sky is blue. Perhaps it rains tomorrow. The boiling point of water is 100°C."
        claims = decompose_by_sentences(text)

        # Should skip "I think" and "Perhaps" prefixes
        for c in claims:
            assert not c["claim"].startswith("I think")
            assert not c["claim"].startswith("Perhaps")

    def test_numerical_classification(self):
        text = "The unemployment rate is 5.2 percent. The population is 1.4 billion people."
        claims = decompose_by_sentences(text)

        numerical_claims = [c for c in claims if c["type"] == "numerical"]
        assert len(numerical_claims) >= 1

    def test_short_text_skipped(self):
        text = "Yes. No. OK."
        claims = decompose_by_sentences(text)

        # Very short sentences (<20 chars) should be filtered out
        assert len(claims) == 0

    def test_cap_at_eight_claims(self):
        # Build text with 15+ sentences
        text = ". ".join([f"Factual claim number {i} is a real thing that happened" for i in range(15)]) + "."
        claims = decompose_by_sentences(text)

        assert len(claims) <= 8

    def test_empty_text(self):
        claims = decompose_by_sentences("")
        assert claims == []


class TestDecomposeClaimsAsync:
    """Test async decomposition (without OpenAI, tests fallback path)."""

    @pytest.mark.asyncio
    async def test_fallback_without_client(self):
        from pipeline.claim_decomposer import decompose_claims

        text = "Metformin is a first-line treatment for type 2 diabetes. The recommended starting dose is 500mg twice daily."
        claims = await decompose_claims(text, openai_client=None)

        assert len(claims) >= 1
        assert all("claim" in c for c in claims)
