# Phase 7: Verification Engine V2 (Backend)

## Objective
Rewrite the verification pipeline to replace brittle keyword-matching with robust NLI semantic entailment, integrating high-quality external APIs.

## Tasks
1. Setup API keys for PubMed, FactCheck, Wikidata in `config.py`
2. Rewrite `verifier.py` to use NLI semantic entailment (Azure OpenAI)
3. Integrate PubMed E-utilities API for Medical claims
4. Integrate Google Fact Check API for General/News claims
5. Integrate Wikidata SPARQL for History/Science claims
6. Replace mocked Wolfram Alpha source with live API
7. Reconfigure `router.py` to use new domain-specific sources
