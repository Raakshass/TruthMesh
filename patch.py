import re

with open('d:/Microsoft_AI_Unlocked/main.py', 'r', encoding='utf-8') as f:
    text = f.read()

import base64

new_code = """            all_claim_results = []
            
            async def _verify_single(claim_data, idx):
                # Verify one claim and compute consensus
                results = await verify_claim(
                    claim=claim_data["claim"],
                    claim_type=claim_data.get("type", "factual"),
                    domain=primary_domain,
                    primary_model=model_used
                )
                consensus = compute_consensus(results, primary_domain, domain_vector)
                return {
                    "index": idx,
                    "claim": claim_data["claim"],
                    "consensus": consensus,
                    "sources": [
                        {
                            "source": r["source"],
                            "source_detail": r["source_detail"],
                            "verdict": r["verdict"],
                            "confidence": r["confidence"]
                        } for r in results
                    ]
                }

            # Fire all claims concurrently
            verification_tasks = [
                _verify_single(cd, i) for i, cd in enumerate(claims)
            ]
            parallel_results = await asyncio.gather(*verification_tasks, return_exceptions=True)

            # Stream results to client in order
            for result in parallel_results:
                if isinstance(result, Exception):
                    print(f"[PIPELINE] Claim verification error: {result}")
                    continue
                await asyncio.sleep(0.3)
                all_claim_results.append({"consensus": result["consensus"]})
                yield {
                    "event": "verification",
                    "data": json.dumps(result)
                }

                # Update profiler
                passed = result["consensus"]["final_verdict"] == "pass"
                await update_profile(model_used, primary_domain, passed)"""


pattern = re.compile(r"            all_claim_results = \[\]\n            for i, claim_data in enumerate\(claims\):.*?await update_profile\(model_used, primary_domain, passed\)", re.DOTALL)

if pattern.search(text):
    text = pattern.sub(new_code, text)
    with open('d:/Microsoft_AI_Unlocked/main.py', 'w', encoding='utf-8') as f:
        f.write(text)
    print("PATCH APPLIED SUCCESSFULLY")
else:
    print("PATTERN NOT FOUND")
