import asyncio
import os
import sys

# Ensure project root is in path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from pipeline.verifier import verify_pubmed, verify_wolfram

async def test_tenacity():
    print("Testing external pipeline fetch with Tenacity backoff...")
    
    # Minimal Mock for OpenAI
    class MockOpenAI:
        class chat:
            class completions:
                @staticmethod
                async def create(*args, **kwargs):
                    class Msg:
                        content = "Heart AND Attack"
                    class Choice:
                        message = Msg()
                    class Resp:
                        choices = [Choice()]
                    return Resp()
                    
    try:
        res1 = await verify_pubmed("Aspirin prevents heart attacks", MockOpenAI())
        print("PubMed result:", res1)
        
        res2 = await verify_wolfram("Distance to the moon")
        print("Wolfram result:", res2)
        
        print("Tenacity wrappers executed successfully.")
    except Exception as e:
        print("Test failed:", str(e))

if __name__ == "__main__":
    asyncio.run(test_tenacity())
