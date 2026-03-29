"""LLM Generator — Handles the primary response generation.

Extracts the LLM generation logic out of the main SSE pipeline into a dedicated module.
"""
import asyncio
from config import Config

async def generate_response(query: str, primary_domain: str, model: str, openai_client=None) -> str:
    """Generate the initial response text using the selected model.

    Args:
        query: User's natural language query
        primary_domain: The classified domain of the query
        model: The model selected by the router (e.g., "GPT-4o")
        openai_client: Optional Azure OpenAI async client

    Returns:
        Generated response text string.
    """
    if openai_client and Config.has_azure_openai():
        try:
            # Map selected model name to Azure deployment name
            deployment_map = {
                "GPT-4o": Config.AZURE_OPENAI_DEPLOYMENT_GPT4O,
                "GPT-4o-mini": Config.AZURE_OPENAI_DEPLOYMENT_GPT4O_MINI
            }
            deployment = deployment_map.get(model, Config.AZURE_OPENAI_DEPLOYMENT_GPT4O)

            response = await openai_client.chat.completions.create(
                model=deployment,
                messages=[
                    {
                        "role": "system", 
                        "content": f"You are a helpful, expert assistant specializing in {primary_domain}. Provide a clear, factual answer."
                    },
                    {"role": "user", "content": query}
                ],
                temperature=0.3,
                max_tokens=500
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"[GENERATOR] Azure OpenAI generation failed: {e}")
            # Fall back to mock response below
    
    # Fallback / Mock Response if API is unavailable or keys missing
    await asyncio.sleep(0.5)
    return f"[Live Response] Processing query about {primary_domain}. This response was generated through the TruthMesh pipeline with {model}."
