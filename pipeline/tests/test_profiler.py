"""Tests for profiler.py — Wilson CI and Bayesian posterior updating."""
import pytest
from pipeline.profiler import wilson_confidence_interval


class TestWilsonConfidenceInterval:
    """Test Wilson score confidence interval calculation."""

    def test_zero_total_returns_full_range(self):
        lower, upper = wilson_confidence_interval(0, 0)
        assert lower == 0.0
        assert upper == 1.0

    def test_all_successes(self):
        lower, upper = wilson_confidence_interval(100, 100)
        assert lower > 0.9
        assert upper == 1.0

    def test_no_successes(self):
        lower, upper = wilson_confidence_interval(0, 100)
        assert lower == 0.0
        assert upper < 0.1

    def test_half_successes(self):
        lower, upper = wilson_confidence_interval(50, 100)
        assert 0.35 < lower < 0.5
        assert 0.5 < upper < 0.65

    def test_small_sample_wide_interval(self):
        lower, upper = wilson_confidence_interval(1, 2)
        # With only 2 samples, interval should be wide
        assert (upper - lower) > 0.3

    def test_large_sample_narrow_interval(self):
        lower, upper = wilson_confidence_interval(800, 1000)
        # With 1000 samples, interval should be tight
        assert (upper - lower) < 0.05

    def test_bounds_never_exceed_zero_one(self):
        for s in range(0, 20):
            for t in range(max(s, 1), 21):
                lower, upper = wilson_confidence_interval(s, t)
                assert 0.0 <= lower <= upper <= 1.0, f"Violation at s={s}, t={t}"


class TestBayesianLabels:
    """Verify seed data benchmark labels are used correctly."""

    def test_seed_data_format(self):
        from seed_data import SEED_DATA
        for model, domain, score, lower, upper, count in SEED_DATA:
            assert isinstance(model, str)
            assert isinstance(domain, str)
            assert 0.0 <= score <= 1.0
            assert 0.0 <= lower <= upper <= 1.0
            assert count > 0

    def test_ground_truth_claims_format(self):
        from seed_data import GROUND_TRUTH_CLAIMS
        for gt in GROUND_TRUTH_CLAIMS:
            assert "claim" in gt
            assert "expected" in gt
            assert "domain" in gt
            assert gt["expected"] in ("pass", "fail")
