import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from pipeline.verifier import (
    evaluate_entailment, verify_pubmed, verify_factcheck, 
    verify_wikidata, verify_claim, verify_wolfram
)

@pytest.fixture
def mock_openai_client():
    client = MagicMock()
    # Deep mock the async chat completions create
    mock_create = AsyncMock()
    # Setup default mock response
    mock_message = MagicMock()
    mock_message.message.content = '{"verdict": "supported", "confidence": 0.9, "reasoning": "Mocked NLI reason"}'
    mock_create.return_value.choices = [mock_message]
    
    client.chat.completions.create = mock_create
    return client

@pytest.mark.asyncio
async def test_evaluate_entailment(mock_openai_client):
    result = await evaluate_entailment("Claim A", "Evidence A entails Claim A", mock_openai_client)
    
    assert result["verdict"] == "supported"
    assert result["confidence"] == 0.9
    mock_openai_client.chat.completions.create.assert_called_once()
    call_kwargs = mock_openai_client.chat.completions.create.call_args.kwargs
    assert "Evidence A entails Claim A" in call_kwargs["messages"][1]["content"]

@pytest.mark.asyncio
@patch("pipeline.verifier.httpx.AsyncClient.get", new_callable=AsyncMock)
async def test_verify_pubmed(mock_get, mock_openai_client):
    # Mocking E-Search response
    mock_search_resp = MagicMock()
    mock_search_resp.json.return_value = {"esearchresult": {"idlist": ["123", "456"]}}
    
    # Mocking E-Fetch response
    mock_fetch_resp = MagicMock()
    mock_fetch_resp.text = "Abstract text covering the claim."
    
    mock_get.side_effect = [mock_search_resp, mock_fetch_resp]
    
    result = await verify_pubmed("Aspirin cures headaches", mock_openai_client)
    
    assert result["source"] == "pubmed"
    assert result["verdict"] == "supported"
    assert mock_get.call_count == 2
    assert mock_openai_client.chat.completions.create.call_count == 2 # 1 for terms, 1 for NLI

@pytest.mark.asyncio
@patch("pipeline.verifier.Config")
@patch("pipeline.verifier.httpx.AsyncClient.get", new_callable=AsyncMock)
async def test_verify_factcheck(mock_get, mock_config, mock_openai_client):
    mock_config.GOOGLE_FACTCHECK_API_KEY = "dummy_key"
    
    mock_resp = MagicMock()
    mock_resp.json.return_value = {
        "claims": [{
            "claimReview": [{
                "textualRating": "Pants on Fire",
                "publisher": {"name": "PolitiFact"}
            }]
        }]
    }
    mock_get.return_value = mock_resp
    
    result = await verify_factcheck("Fake news claim", mock_openai_client)
    
    assert result["source"] == "factcheck"
    assert result["verdict"] == "refuted"
    assert result["confidence"] == 0.95
    assert "PolitiFact" in result["source_detail"]

@pytest.mark.asyncio
@patch("pipeline.verifier.httpx.AsyncClient.get", new_callable=AsyncMock)
async def test_verify_wikidata(mock_get, mock_openai_client):
    mock_resp = MagicMock()
    mock_resp.json.return_value = {
        "search": [{"id": "Q937", "description": "physicist born in Germany"}]
    }
    mock_get.return_value = mock_resp
    
    result = await verify_wikidata("Albert Einstein was a physicist", mock_openai_client)
    
    assert result["source"] == "wikidata"
    assert "Q937" in result["source_detail"]
    assert result["verdict"] == "supported"

@pytest.mark.asyncio
@patch("pipeline.verifier.verify_pubmed", new_callable=AsyncMock)
@patch("pipeline.verifier.verify_factcheck", new_callable=AsyncMock)
@patch("pipeline.verifier.verify_wikidata", new_callable=AsyncMock)
@patch("pipeline.verifier.verify_with_bing", new_callable=AsyncMock)
@patch("pipeline.verifier.verify_wolfram", new_callable=AsyncMock)
@patch("pipeline.verifier.verify_cross_model", new_callable=AsyncMock)
async def test_verify_claim_routing(mock_cross, mock_wolfram, mock_bing, mock_wikidata, mock_factcheck, mock_pubmed, mock_openai_client):
    # Medical domain should hit pubmed, bing, factcheck, cross_model, wolfram
    mock_pubmed.return_value = {"source": "pubmed", "verdict": "supported"}
    mock_bing.return_value = {"source": "bing", "verdict": "supported"}
    
    results = await verify_claim("Aspirin helps", "medical", "Medical", "gpt-4o-mini", mock_openai_client)
    
    mock_pubmed.assert_called_once()
    mock_bing.assert_called_once()
    # Wikidata is not in Medical weights
    mock_wikidata.assert_not_called()
    
    assert len(results) == 5 # pubmed, bing, factcheck, cross_model, wolfram
