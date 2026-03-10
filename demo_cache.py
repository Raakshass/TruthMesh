"""Demo Cache — Pre-cached responses for reliable demo scenarios.

Each scenario includes the full pipeline output: domain vector, routing
decision, LLM response, claim decomposition, and verification results.
Fallback engaged on API timeout (>3s) with visible CACHED badge.
"""

DEMO_SCENARIOS = {
    "What are the drug interactions between metformin and lisinopril?": {
        "domain_vector": {"Medical": 0.85, "Legal": 0.02, "Finance": 0.01, "Science": 0.10, "History": 0.02},
        "routing": {
            "selected_model": "Claude-3.5-Sonnet",
            "reason": "Selected Claude-3.5-Sonnet for this query because it has 89% reliability on Medical (84%–94% CI, n=1102) — the primary domain detected with 85% probability. GPT-4o has only 72% reliability on Medical topics.",
            "primary_domain": "Medical",
            "primary_domain_prob": 0.85,
        },
        "response": """Metformin and lisinopril can be used together, and this combination is actually common in patients with type 2 diabetes and hypertension. However, there are important interactions to be aware of:

1. **Hypoglycemia Risk**: Lisinopril (an ACE inhibitor) may enhance the hypoglycemic effect of metformin. Blood glucose levels should be monitored when initiating or adjusting either medication.

2. **Lactic Acidosis**: Both drugs carry a rare risk of lactic acidosis, particularly in patients with renal impairment. ACE inhibitors like lisinopril can affect renal function, which may impair metformin clearance.

3. **Renal Function Monitoring**: Since metformin is renally cleared and lisinopril affects renal perfusion, regular monitoring of eGFR (estimated glomerular filtration rate) is recommended.

4. **Potassium Levels**: Lisinopril can increase potassium levels (hyperkalemia), while metformin generally does not affect potassium. However, in patients with compromised renal function, the combination warrants electrolyte monitoring.

5. **Dosage Adjustments**: No routine dosage adjustment is typically required, but dose modifications may be necessary if renal function declines below eGFR 30 mL/min/1.73m².""",
        "claims": [
            {"claim": "Lisinopril is an ACE inhibitor", "type": "factual"},
            {"claim": "Lisinopril may enhance the hypoglycemic effect of metformin", "type": "factual"},
            {"claim": "Both drugs carry a rare risk of lactic acidosis", "type": "factual"},
            {"claim": "Metformin is renally cleared", "type": "factual"},
            {"claim": "Lisinopril can increase potassium levels causing hyperkalemia", "type": "factual"},
            {"claim": "Dose modifications may be necessary if renal function declines below eGFR 30 mL/min/1.73m²", "type": "numerical"},
        ],
        "verifications": [
            {"claim": "Lisinopril is an ACE inhibitor", "consensus": {"final_confidence": 0.94, "final_verdict": "pass"},
             "sources": [
                 {"source": "bing", "source_detail": "Bing Search (Medical-scoped: PubMed, WHO)", "verdict": "supported", "confidence": 0.95},
                 {"source": "wikipedia", "source_detail": "Wikipedia MediaWiki API", "verdict": "supported", "confidence": 0.92},
                 {"source": "cross_model", "source_detail": "Cross-Model (GPT-4o-mini)", "verdict": "supported", "confidence": 0.96},
             ]},
            {"claim": "Lisinopril may enhance the hypoglycemic effect of metformin", "consensus": {"final_confidence": 0.72, "final_verdict": "pass"},
             "sources": [
                 {"source": "bing", "source_detail": "Bing Search (Medical-scoped: PubMed, WHO)", "verdict": "supported", "confidence": 0.78},
                 {"source": "wikipedia", "source_detail": "Wikipedia MediaWiki API", "verdict": "inconclusive", "confidence": 0.45},
                 {"source": "cross_model", "source_detail": "Cross-Model (GPT-4o-mini)", "verdict": "supported", "confidence": 0.71},
             ]},
            {"claim": "Both drugs carry a rare risk of lactic acidosis", "consensus": {"final_confidence": 0.68, "final_verdict": "partial"},
             "sources": [
                 {"source": "bing", "source_detail": "Bing Search (Medical-scoped: PubMed, WHO)", "verdict": "supported", "confidence": 0.82},
                 {"source": "wikipedia", "source_detail": "Wikipedia MediaWiki API", "verdict": "inconclusive", "confidence": 0.40},
                 {"source": "cross_model", "source_detail": "Cross-Model (GPT-4o-mini)", "verdict": "supported", "confidence": 0.65},
             ]},
            {"claim": "Metformin is renally cleared", "consensus": {"final_confidence": 0.91, "final_verdict": "pass"},
             "sources": [
                 {"source": "bing", "source_detail": "Bing Search (Medical-scoped: PubMed, WHO)", "verdict": "supported", "confidence": 0.93},
                 {"source": "wikipedia", "source_detail": "Wikipedia MediaWiki API", "verdict": "supported", "confidence": 0.88},
                 {"source": "cross_model", "source_detail": "Cross-Model (GPT-4o-mini)", "verdict": "supported", "confidence": 0.90},
             ]},
            {"claim": "Lisinopril can increase potassium levels causing hyperkalemia", "consensus": {"final_confidence": 0.89, "final_verdict": "pass"},
             "sources": [
                 {"source": "bing", "source_detail": "Bing Search (Medical-scoped: PubMed, WHO)", "verdict": "supported", "confidence": 0.91},
                 {"source": "wikipedia", "source_detail": "Wikipedia MediaWiki API", "verdict": "supported", "confidence": 0.85},
                 {"source": "cross_model", "source_detail": "Cross-Model (GPT-4o-mini)", "verdict": "supported", "confidence": 0.88},
             ]},
            {"claim": "Dose modifications may be necessary if renal function declines below eGFR 30 mL/min/1.73m²", "consensus": {"final_confidence": 0.76, "final_verdict": "pass"},
             "sources": [
                 {"source": "bing", "source_detail": "Bing Search (Medical-scoped: PubMed, WHO)", "verdict": "supported", "confidence": 0.80},
                 {"source": "wikipedia", "source_detail": "Wikipedia MediaWiki API", "verdict": "inconclusive", "confidence": 0.50},
                 {"source": "cross_model", "source_detail": "Cross-Model (GPT-4o-mini)", "verdict": "supported", "confidence": 0.75},
                 {"source": "wolfram", "source_detail": "Wolfram Alpha (Numerical Validation)", "verdict": "supported", "confidence": 0.82},
             ]},
        ],
        "overall_trust": {"overall_score": 0.817, "verdict": "pass", "claim_count": 6, "pass_count": 5, "partial_count": 1, "fail_count": 0}
    },

    "What are the key precedents in Indian contract law for force majeure?": {
        "domain_vector": {"Medical": 0.01, "Legal": 0.88, "Finance": 0.05, "Science": 0.01, "History": 0.05},
        "routing": {
            "selected_model": "Claude-3.5-Sonnet",
            "reason": "Selected Claude-3.5-Sonnet for this query because it has 84% reliability on Legal (78%–90% CI, n=876) — the primary domain detected with 88% probability. GPT-4o has only 58% reliability on Legal topics, making it the WORST model for this domain.",
            "primary_domain": "Legal",
            "primary_domain_prob": 0.88,
        },
        "response": """Key precedents in Indian contract law for force majeure include:

1. **Satyabrata Ghose v. Mugneeram Bangur (1954)**: The Supreme Court held that Section 56 of the Indian Contract Act covers force majeure situations where performance becomes impossible due to unforeseen events. This is the foundational case for the doctrine of frustration in India.

2. **Energy Watchdog v. CERC (2017)**: The Supreme Court clarified that if a contract contains a force majeure clause, the terms of that clause will govern. Section 56 applies as a residual provision only when the contract is silent on force majeure.

3. **Industrial Finance Corporation v. Cannanore (1991)**: The Kerala High Court established that mere difficulty or commercial hardship does not constitute force majeure — the event must make performance truly impossible, not just more expensive.

4. **Naihati Jute Mills v. Khyaliram Jagannath (1968)**: The Supreme Court ruled that a party claiming force majeure must demonstrate that the event was beyond their control and that they took reasonable steps to mitigate the impact.

5. **Section 56, Indian Contract Act, 1872**: While not a case, this statutory provision codifies the doctrine — "An agreement to do an act impossible in itself is void." Post-contractual impossibility renders the contract void.""",
        "claims": [
            {"claim": "Satyabrata Ghose v. Mugneeram Bangur is a 1954 Supreme Court case about force majeure", "type": "factual"},
            {"claim": "Section 56 of the Indian Contract Act covers force majeure situations", "type": "factual"},
            {"claim": "Energy Watchdog v. CERC is a 2017 Supreme Court case", "type": "factual"},
            {"claim": "Industrial Finance Corporation v. Cannanore is a 1991 Kerala High Court case", "type": "factual"},
            {"claim": "Mere commercial hardship does not constitute force majeure", "type": "factual"},
        ],
        "verifications": [
            {"claim": "Satyabrata Ghose v. Mugneeram Bangur is a 1954 Supreme Court case about force majeure", "consensus": {"final_confidence": 0.82, "final_verdict": "pass"},
             "sources": [
                 {"source": "bing", "source_detail": "Bing Search (Legal-scoped: IndianKanoon)", "verdict": "supported", "confidence": 0.88},
                 {"source": "wikipedia", "source_detail": "Wikipedia MediaWiki API", "verdict": "inconclusive", "confidence": 0.45},
                 {"source": "cross_model", "source_detail": "Cross-Model (GPT-4o-mini)", "verdict": "supported", "confidence": 0.80},
             ]},
            {"claim": "Section 56 of the Indian Contract Act covers force majeure situations", "consensus": {"final_confidence": 0.90, "final_verdict": "pass"},
             "sources": [
                 {"source": "bing", "source_detail": "Bing Search (Legal-scoped: IndianKanoon)", "verdict": "supported", "confidence": 0.92},
                 {"source": "wikipedia", "source_detail": "Wikipedia MediaWiki API", "verdict": "supported", "confidence": 0.85},
                 {"source": "cross_model", "source_detail": "Cross-Model (GPT-4o-mini)", "verdict": "supported", "confidence": 0.88},
             ]},
            {"claim": "Energy Watchdog v. CERC is a 2017 Supreme Court case", "consensus": {"final_confidence": 0.78, "final_verdict": "pass"},
             "sources": [
                 {"source": "bing", "source_detail": "Bing Search (Legal-scoped: IndianKanoon)", "verdict": "supported", "confidence": 0.85},
                 {"source": "wikipedia", "source_detail": "Wikipedia MediaWiki API", "verdict": "inconclusive", "confidence": 0.40},
                 {"source": "cross_model", "source_detail": "Cross-Model (GPT-4o-mini)", "verdict": "supported", "confidence": 0.72},
             ]},
            {"claim": "Industrial Finance Corporation v. Cannanore is a 1991 Kerala High Court case", "consensus": {"final_confidence": 0.48, "final_verdict": "partial"},
             "sources": [
                 {"source": "bing", "source_detail": "Bing Search (Legal-scoped: IndianKanoon)", "verdict": "inconclusive", "confidence": 0.45},
                 {"source": "wikipedia", "source_detail": "Wikipedia MediaWiki API", "verdict": "inconclusive", "confidence": 0.30},
                 {"source": "cross_model", "source_detail": "Cross-Model (GPT-4o-mini)", "verdict": "inconclusive", "confidence": 0.55},
             ]},
            {"claim": "Mere commercial hardship does not constitute force majeure", "consensus": {"final_confidence": 0.88, "final_verdict": "pass"},
             "sources": [
                 {"source": "bing", "source_detail": "Bing Search (Legal-scoped: IndianKanoon)", "verdict": "supported", "confidence": 0.90},
                 {"source": "wikipedia", "source_detail": "Wikipedia MediaWiki API", "verdict": "supported", "confidence": 0.82},
                 {"source": "cross_model", "source_detail": "Cross-Model (GPT-4o-mini)", "verdict": "supported", "confidence": 0.85},
             ]},
        ],
        "overall_trust": {"overall_score": 0.772, "verdict": "pass", "claim_count": 5, "pass_count": 4, "partial_count": 1, "fail_count": 0}
    },

    "What is the current Basel III capital adequacy ratio requirement?": {
        "domain_vector": {"Medical": 0.0, "Legal": 0.15, "Finance": 0.80, "Science": 0.0, "History": 0.05},
        "routing": {
            "selected_model": "GPT-4o",
            "reason": "Selected GPT-4o for this query because it has 81% reliability on Finance (75%–87% CI, n=692) — the primary domain detected with 80% probability. Claude-3.5-Sonnet has only 53% reliability on Finance topics.",
            "primary_domain": "Finance",
            "primary_domain_prob": 0.80,
        },
        "response": """The Basel III capital adequacy framework requires banks to maintain several capital ratios:

1. **Common Equity Tier 1 (CET1)**: Minimum 4.5% of risk-weighted assets (RWA). This is the highest quality capital — common shares and retained earnings.

2. **Tier 1 Capital**: Minimum 6.0% of RWA, including CET1 plus Additional Tier 1 instruments.

3. **Total Capital**: Minimum 8.0% of RWA, including Tier 1 plus Tier 2 capital.

4. **Capital Conservation Buffer**: An additional 2.5% CET1 buffer, bringing the effective CET1 minimum to 7.0%.

5. **Countercyclical Buffer**: 0%–2.5% at national discretion, activated during periods of excessive credit growth.

6. **G-SIB Surcharge**: Additional 1.0%–3.5% for Global Systemically Important Banks, based on their systemic significance score.

For most large international banks, the practical total requirement is approximately 10.5%–13.0% of RWA when all buffers are included.""",
        "claims": [
            {"claim": "Basel III requires minimum CET1 of 4.5% of risk-weighted assets", "type": "numerical"},
            {"claim": "Tier 1 Capital minimum is 6.0% of RWA", "type": "numerical"},
            {"claim": "Total Capital minimum is 8.0% of RWA", "type": "numerical"},
            {"claim": "Capital Conservation Buffer is an additional 2.5% CET1", "type": "numerical"},
            {"claim": "Countercyclical Buffer ranges from 0% to 2.5%", "type": "numerical"},
        ],
        "verifications": [
            {"claim": "Basel III requires minimum CET1 of 4.5% of risk-weighted assets", "consensus": {"final_confidence": 0.95, "final_verdict": "pass"},
             "sources": [
                 {"source": "bing", "source_detail": "Bing Search (Finance-scoped: BIS, IMF)", "verdict": "supported", "confidence": 0.97},
                 {"source": "wikipedia", "source_detail": "Wikipedia MediaWiki API", "verdict": "supported", "confidence": 0.93},
                 {"source": "cross_model", "source_detail": "Cross-Model (GPT-4o-mini)", "verdict": "supported", "confidence": 0.94},
                 {"source": "wolfram", "source_detail": "Wolfram Alpha (Numerical Validation)", "verdict": "supported", "confidence": 0.90},
             ]},
            {"claim": "Tier 1 Capital minimum is 6.0% of RWA", "consensus": {"final_confidence": 0.93, "final_verdict": "pass"},
             "sources": [
                 {"source": "bing", "source_detail": "Bing Search (Finance-scoped: BIS, IMF)", "verdict": "supported", "confidence": 0.95},
                 {"source": "wikipedia", "source_detail": "Wikipedia MediaWiki API", "verdict": "supported", "confidence": 0.90},
                 {"source": "cross_model", "source_detail": "Cross-Model (GPT-4o-mini)", "verdict": "supported", "confidence": 0.92},
                 {"source": "wolfram", "source_detail": "Wolfram Alpha (Numerical Validation)", "verdict": "supported", "confidence": 0.88},
             ]},
            {"claim": "Total Capital minimum is 8.0% of RWA", "consensus": {"final_confidence": 0.94, "final_verdict": "pass"},
             "sources": [
                 {"source": "bing", "source_detail": "Bing Search (Finance-scoped: BIS, IMF)", "verdict": "supported", "confidence": 0.96},
                 {"source": "wikipedia", "source_detail": "Wikipedia MediaWiki API", "verdict": "supported", "confidence": 0.91},
                 {"source": "cross_model", "source_detail": "Cross-Model (GPT-4o-mini)", "verdict": "supported", "confidence": 0.93},
                 {"source": "wolfram", "source_detail": "Wolfram Alpha (Numerical Validation)", "verdict": "supported", "confidence": 0.89},
             ]},
            {"claim": "Capital Conservation Buffer is an additional 2.5% CET1", "consensus": {"final_confidence": 0.91, "final_verdict": "pass"},
             "sources": [
                 {"source": "bing", "source_detail": "Bing Search (Finance-scoped: BIS, IMF)", "verdict": "supported", "confidence": 0.93},
                 {"source": "wikipedia", "source_detail": "Wikipedia MediaWiki API", "verdict": "supported", "confidence": 0.88},
                 {"source": "cross_model", "source_detail": "Cross-Model (GPT-4o-mini)", "verdict": "supported", "confidence": 0.90},
                 {"source": "wolfram", "source_detail": "Wolfram Alpha (Numerical Validation)", "verdict": "supported", "confidence": 0.85},
             ]},
            {"claim": "Countercyclical Buffer ranges from 0% to 2.5%", "consensus": {"final_confidence": 0.89, "final_verdict": "pass"},
             "sources": [
                 {"source": "bing", "source_detail": "Bing Search (Finance-scoped: BIS, IMF)", "verdict": "supported", "confidence": 0.91},
                 {"source": "wikipedia", "source_detail": "Wikipedia MediaWiki API", "verdict": "supported", "confidence": 0.85},
                 {"source": "cross_model", "source_detail": "Cross-Model (GPT-4o-mini)", "verdict": "supported", "confidence": 0.88},
                 {"source": "wolfram", "source_detail": "Wolfram Alpha (Numerical Validation)", "verdict": "supported", "confidence": 0.84},
             ]},
        ],
        "overall_trust": {"overall_score": 0.924, "verdict": "pass", "claim_count": 5, "pass_count": 5, "partial_count": 0, "fail_count": 0}
    },

    "What are the legal implications of AI-generated medical diagnoses in India?": {
        "domain_vector": {"Medical": 0.40, "Legal": 0.45, "Finance": 0.02, "Science": 0.10, "History": 0.03},
        "routing": {
            "selected_model": "Claude-3.5-Sonnet",
            "reason": "Selected Claude-3.5-Sonnet for this cross-domain query (Legal 45%, Medical 40%) because it has the highest weighted reliability: 84% on Legal + 89% on Medical. GPT-4o scores only 58% on Legal, making it risky for the dominant domain.",
            "primary_domain": "Legal",
            "primary_domain_prob": 0.45,
        },
        "response": """AI-generated medical diagnoses in India operate in a complex legal landscape:

1. **Indian Medical Council Act, 1956**: Only registered medical practitioners can practice medicine. AI systems cannot independently diagnose; they must function as clinical decision support tools under physician supervision.

2. **Consumer Protection Act, 2019**: Patients can file complaints against healthcare providers for deficiency in service. If an AI-generated diagnosis leads to patient harm, liability may extend to the deploying hospital, the software vendor, or both.

3. **IT Act, 2000 (Section 43A)**: Organizations handling sensitive personal health data must implement reasonable security practices. AI systems processing patient data must comply with data protection requirements.

4. **No Specific AI Regulation**: India currently lacks dedicated AI healthcare regulation. The NITI Aayog's 2021 AI framework provides principles but not enforceable rules. The Digital Personal Data Protection Act, 2023 adds data governance requirements.

5. **Medical Negligence Standard**: Under Indian tort law, if a physician relies on an AI diagnosis without independent clinical judgment, they may be held liable for medical negligence under the Bolam test standard adopted by Indian courts.""",
        "claims": [
            {"claim": "Only registered medical practitioners can practice medicine under the Indian Medical Council Act 1956", "type": "factual"},
            {"claim": "Consumer Protection Act 2019 allows patients to file complaints for deficiency in service", "type": "factual"},
            {"claim": "IT Act 2000 Section 43A requires organizations to implement reasonable security for sensitive data", "type": "factual"},
            {"claim": "India currently lacks dedicated AI healthcare regulation", "type": "factual"},
            {"claim": "The Digital Personal Data Protection Act was passed in 2023", "type": "factual"},
        ],
        "verifications": [
            {"claim": "Only registered medical practitioners can practice medicine under the Indian Medical Council Act 1956", "consensus": {"final_confidence": 0.85, "final_verdict": "pass"},
             "sources": [
                 {"source": "bing", "source_detail": "Bing Search (Legal-scoped: IndianKanoon)", "verdict": "supported", "confidence": 0.88},
                 {"source": "wikipedia", "source_detail": "Wikipedia MediaWiki API", "verdict": "supported", "confidence": 0.82},
                 {"source": "cross_model", "source_detail": "Cross-Model (GPT-4o-mini)", "verdict": "supported", "confidence": 0.85},
             ]},
            {"claim": "Consumer Protection Act 2019 allows patients to file complaints for deficiency in service", "consensus": {"final_confidence": 0.87, "final_verdict": "pass"},
             "sources": [
                 {"source": "bing", "source_detail": "Bing Search (Legal-scoped: IndianKanoon)", "verdict": "supported", "confidence": 0.90},
                 {"source": "wikipedia", "source_detail": "Wikipedia MediaWiki API", "verdict": "supported", "confidence": 0.80},
                 {"source": "cross_model", "source_detail": "Cross-Model (GPT-4o-mini)", "verdict": "supported", "confidence": 0.86},
             ]},
            {"claim": "IT Act 2000 Section 43A requires organizations to implement reasonable security for sensitive data", "consensus": {"final_confidence": 0.80, "final_verdict": "pass"},
             "sources": [
                 {"source": "bing", "source_detail": "Bing Search (Legal-scoped: IndianKanoon)", "verdict": "supported", "confidence": 0.84},
                 {"source": "wikipedia", "source_detail": "Wikipedia MediaWiki API", "verdict": "supported", "confidence": 0.75},
                 {"source": "cross_model", "source_detail": "Cross-Model (GPT-4o-mini)", "verdict": "supported", "confidence": 0.78},
             ]},
            {"claim": "India currently lacks dedicated AI healthcare regulation", "consensus": {"final_confidence": 0.73, "final_verdict": "pass"},
             "sources": [
                 {"source": "bing", "source_detail": "Bing Search (Legal-scoped: IndianKanoon)", "verdict": "supported", "confidence": 0.78},
                 {"source": "wikipedia", "source_detail": "Wikipedia MediaWiki API", "verdict": "inconclusive", "confidence": 0.50},
                 {"source": "cross_model", "source_detail": "Cross-Model (GPT-4o-mini)", "verdict": "supported", "confidence": 0.75},
             ]},
            {"claim": "The Digital Personal Data Protection Act was passed in 2023", "consensus": {"final_confidence": 0.90, "final_verdict": "pass"},
             "sources": [
                 {"source": "bing", "source_detail": "Bing Search (Legal-scoped: IndianKanoon)", "verdict": "supported", "confidence": 0.92},
                 {"source": "wikipedia", "source_detail": "Wikipedia MediaWiki API", "verdict": "supported", "confidence": 0.88},
                 {"source": "cross_model", "source_detail": "Cross-Model (GPT-4o-mini)", "verdict": "supported", "confidence": 0.89},
             ]},
        ],
        "overall_trust": {"overall_score": 0.830, "verdict": "pass", "claim_count": 5, "pass_count": 5, "partial_count": 0, "fail_count": 0}
    },

    "Is GPT-4 reliable for generating differential diagnoses in rare diseases?": {
        "domain_vector": {"Medical": 0.75, "Legal": 0.02, "Finance": 0.0, "Science": 0.20, "History": 0.03},
        "routing": {
            "selected_model": "Claude-3.5-Sonnet",
            "reason": "Selected Claude-3.5-Sonnet for this query because it has 89% reliability on Medical (84%–94% CI, n=1102). ⚠️ DANGER ZONE: GPT-4o has only 72% reliability on Medical topics — it was considered but REJECTED due to elevated hallucination risk in this domain.",
            "primary_domain": "Medical",
            "primary_domain_prob": 0.75,
        },
        "response": """GPT-4's reliability for rare disease differential diagnosis is MIXED and warrants caution:

1. **Common Rare Diseases**: For well-documented rare diseases (e.g., Marfan syndrome, cystic fibrosis), GPT-4 shows reasonable performance, correctly identifying the condition in approximately 60-70% of cases in benchmark studies.

2. **Ultra-Rare Diseases**: For conditions with fewer than 1 in 100,000 prevalence, GPT-4's accuracy drops significantly. A 2024 study in Nature Medicine found GPT-4 correctly identified ultra-rare diseases in only 30-40% of cases.

3. **Hallucination Risk**: GPT-4 may fabricate plausible-sounding but entirely fictional rare diseases, cite non-existent case studies, or incorrectly associate symptoms with conditions. This is particularly dangerous because clinicians may not be familiar enough with rare diseases to identify errors.

4. **Training Data Bias**: Rare diseases are underrepresented in GPT-4's training data. The model may over-index on common diseases that share some symptoms with rare conditions.

5. **Recommendation**: GPT-4 should NEVER be used as the sole diagnostic tool for rare diseases. It may serve as a hypothesis generator alongside established diagnostic databases like Orphanet and OMIM, under expert supervision.""",
        "claims": [
            {"claim": "GPT-4 correctly identifies well-documented rare diseases in approximately 60-70% of cases", "type": "numerical"},
            {"claim": "A 2024 study in Nature Medicine found GPT-4 correctly identified ultra-rare diseases in only 30-40% of cases", "type": "factual"},
            {"claim": "GPT-4 may fabricate fictional rare diseases and cite non-existent case studies", "type": "factual"},
            {"claim": "Rare diseases are underrepresented in GPT-4's training data", "type": "factual"},
            {"claim": "Orphanet and OMIM are established diagnostic databases for rare diseases", "type": "factual"},
        ],
        "verifications": [
            {"claim": "GPT-4 correctly identifies well-documented rare diseases in approximately 60-70% of cases", "consensus": {"final_confidence": 0.52, "final_verdict": "partial"},
             "sources": [
                 {"source": "bing", "source_detail": "Bing Search (Medical-scoped: PubMed, WHO)", "verdict": "inconclusive", "confidence": 0.55},
                 {"source": "wikipedia", "source_detail": "Wikipedia MediaWiki API", "verdict": "inconclusive", "confidence": 0.35},
                 {"source": "cross_model", "source_detail": "Cross-Model (GPT-4o-mini)", "verdict": "supported", "confidence": 0.60},
                 {"source": "wolfram", "source_detail": "Wolfram Alpha (Numerical Validation)", "verdict": "supported", "confidence": 0.70},
             ]},
            {"claim": "A 2024 study in Nature Medicine found GPT-4 correctly identified ultra-rare diseases in only 30-40% of cases", "consensus": {"final_confidence": 0.35, "final_verdict": "fail"},
             "sources": [
                 {"source": "bing", "source_detail": "Bing Search (Medical-scoped: PubMed, WHO)", "verdict": "inconclusive", "confidence": 0.30},
                 {"source": "wikipedia", "source_detail": "Wikipedia MediaWiki API", "verdict": "inconclusive", "confidence": 0.20},
                 {"source": "cross_model", "source_detail": "Cross-Model (GPT-4o-mini)", "verdict": "refuted", "confidence": 0.55},
             ]},
            {"claim": "GPT-4 may fabricate fictional rare diseases and cite non-existent case studies", "consensus": {"final_confidence": 0.82, "final_verdict": "pass"},
             "sources": [
                 {"source": "bing", "source_detail": "Bing Search (Medical-scoped: PubMed, WHO)", "verdict": "supported", "confidence": 0.85},
                 {"source": "wikipedia", "source_detail": "Wikipedia MediaWiki API", "verdict": "supported", "confidence": 0.78},
                 {"source": "cross_model", "source_detail": "Cross-Model (GPT-4o-mini)", "verdict": "supported", "confidence": 0.80},
             ]},
            {"claim": "Rare diseases are underrepresented in GPT-4's training data", "consensus": {"final_confidence": 0.75, "final_verdict": "pass"},
             "sources": [
                 {"source": "bing", "source_detail": "Bing Search (Medical-scoped: PubMed, WHO)", "verdict": "supported", "confidence": 0.80},
                 {"source": "wikipedia", "source_detail": "Wikipedia MediaWiki API", "verdict": "inconclusive", "confidence": 0.50},
                 {"source": "cross_model", "source_detail": "Cross-Model (GPT-4o-mini)", "verdict": "supported", "confidence": 0.78},
             ]},
            {"claim": "Orphanet and OMIM are established diagnostic databases for rare diseases", "consensus": {"final_confidence": 0.92, "final_verdict": "pass"},
             "sources": [
                 {"source": "bing", "source_detail": "Bing Search (Medical-scoped: PubMed, WHO)", "verdict": "supported", "confidence": 0.95},
                 {"source": "wikipedia", "source_detail": "Wikipedia MediaWiki API", "verdict": "supported", "confidence": 0.90},
                 {"source": "cross_model", "source_detail": "Cross-Model (GPT-4o-mini)", "verdict": "supported", "confidence": 0.88},
             ]},
        ],
        "overall_trust": {"overall_score": 0.672, "verdict": "partial", "claim_count": 5, "pass_count": 3, "partial_count": 1, "fail_count": 1}
    },
}


def get_cached_response(query: str) -> dict | None:
    """Check if query matches a cached demo scenario."""
    # Exact match
    if query in DEMO_SCENARIOS:
        return DEMO_SCENARIOS[query]

    # Fuzzy match — check for significant keyword overlap
    query_words = set(query.lower().split())
    best_match = None
    best_overlap = 0

    for cached_query, data in DEMO_SCENARIOS.items():
        cached_words = set(cached_query.lower().split())
        overlap = len(query_words & cached_words) / max(len(query_words), 1)
        if overlap > best_overlap and overlap > 0.5:
            best_overlap = overlap
            best_match = data

    return best_match


def get_demo_queries() -> list:
    """Return list of demo query strings for the UI."""
    return list(DEMO_SCENARIOS.keys())
