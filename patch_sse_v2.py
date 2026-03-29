import sys
import os

with open("d:/Microsoft_AI_Unlocked/main.py", "r", encoding="utf-8") as f:
    text = f.read()

start_idx = text.find('async def api_verify_stream(request: Request, query_id: str):')
end_idx = text.find('@app.get("/api/demo-queries")')

if start_idx == -1 or end_idx == -1:
    print("Could not find bounds")
    sys.exit(1)

prefix = text[:start_idx]
suffix = text[end_idx:]

new_func = """@app.get("/api/verify/{query_id}")
async def api_verify_stream(request: Request, query_id: str):
    \"\"\"SSE endpoint for streaming verification results.\"\"\"
    last_event_id = request.headers.get("Last-Event-ID")
    last_id = int(last_event_id) if last_event_id and last_event_id.isdigit() else 0

    async def event_generator():
        current_event_id = [0]
        
        async def _sleep(seconds):
            if current_event_id[0] < last_id:
                return
            import asyncio
            await asyncio.sleep(seconds)

        async def _generate_raw():
            # Look up from Cosmos DB query_log collection
            from database import get_query_by_id
            row = await get_query_by_id(query_id)

            if not row:
                yield {"event": "error", "data": json.dumps({"error": "Query not found"})}
                return

            query_text = row["query_text"]
            domain_vector = row.get("domain_vector", {})
            if isinstance(domain_vector, str):
                import json
                domain_vector = json.loads(domain_vector)
            primary_domain = max(domain_vector, key=domain_vector.get)
            model_used = row["routed_model"]

            # Check cache
            cached = get_cached_response(query_text)

            if cached:
                claims = cached.get("claims", [])
                verifications = cached.get("verifications", [])

                for step in ["shield", "classify", "route"]:
                    yield {"event": step, "data": json.dumps({"step": step, "status": "done"})}
                    await _sleep(0.25)

                yield {"event": "llm", "data": json.dumps({"step": "llm", "status": "done", "model": model_used})}
                await _sleep(0.3)

                yield {
                    "event": "response",
                    "data": json.dumps({
                        "response_text": cached["response"],
                        "model": model_used,
                        "cached": True
                    })
                }
                await _sleep(0.3)

                yield {"event": "decompose", "data": json.dumps({"step": "decompose", "status": "done"})}
                await _sleep(0.2)

                yield {
                    "event": "claims",
                    "data": json.dumps({"claims": claims, "total": len(claims)})
                }
                await _sleep(0.3)

                yield {"event": "verify", "data": json.dumps({"step": "verify", "status": "active"})}

                all_claim_results = []
                for i, verif in enumerate(verifications):
                    await _sleep(0.8)
                    claim_result = {
                        "index": i,
                        "claim": verif["claim"],
                        "consensus": verif["consensus"],
                        "sources": verif["sources"]
                    }
                    all_claim_results.append(claim_result)
                    yield {
                        "event": "verification",
                        "data": json.dumps(claim_result)
                    }

                yield {"event": "consensus", "data": json.dumps({"step": "consensus", "status": "done"})}

                await _sleep(0.5)
                yield {
                    "event": "overall_trust",
                    "data": json.dumps(cached["overall_trust"])
                }

                for verif in verifications:
                    passed = verif["consensus"]["final_verdict"] == "pass"
                    await update_profile(model_used, primary_domain, passed)

                await update_query_trust(
                    query_id, cached["overall_trust"]["overall_score"],
                    cached["response"]
                )

                await _sleep(0.2)
                yield {
                    "event": "profile",
                    "data": json.dumps({"step": "profile", "status": "done"})
                }

            else:
                for step in ["shield", "classify", "route"]:
                    yield {"event": step, "data": json.dumps({"step": step, "status": "done"})}
                    await _sleep(0.2)

                yield {"event": "llm", "data": json.dumps({"step": "llm", "status": "active", "model": model_used})}
                
                from pipeline.generator import generate_response
                response_text = await generate_response(query_text, primary_domain, model_used, Config.get_azure_openai_client())
                
                yield {"event": "llm", "data": json.dumps({"step": "llm", "status": "done", "model": model_used})}
                await _sleep(0.2)

                yield {
                    "event": "response",
                    "data": json.dumps({"response_text": response_text, "model": model_used, "cached": False})
                }
                await _sleep(0.3)

                yield {"event": "decompose", "data": json.dumps({"step": "decompose", "status": "done"})}

                claims = await decompose_claims(response_text)
                yield {
                    "event": "claims",
                    "data": json.dumps({"claims": claims, "total": len(claims)})
                }

                yield {"event": "verify", "data": json.dumps({"step": "verify", "status": "active"})}

                all_claim_results = []
                
                async def _verify_single(claim_data, idx):
                    results = await verify_claim(
                        claim=claim_data["claim"],
                        claim_type=claim_data.get("type", "factual"),
                        domain=primary_domain,
                        primary_model=model_used
                    )
                    consensus = await compute_consensus(results, primary_domain, domain_vector)
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

                verification_tasks = [
                    _verify_single(cd, i) for i, cd in enumerate(claims)
                ]
                import asyncio
                parallel_results = await asyncio.gather(*verification_tasks, return_exceptions=True)

                for result in parallel_results:
                    if isinstance(result, Exception):
                        print(f"[PIPELINE] Claim verification error: {result}")
                        continue
                    await _sleep(0.3)
                    all_claim_results.append({"consensus": result["consensus"]})
                    yield {
                        "event": "verification",
                        "data": json.dumps(result)
                    }

                    passed = result["consensus"]["final_verdict"] == "pass"
                    await update_profile(model_used, primary_domain, passed)

                yield {"event": "consensus", "data": json.dumps({"step": "consensus", "status": "done"})}

                await _sleep(0.3)
                overall = compute_overall_trust(all_claim_results)
                await update_query_trust(query_id, overall["overall_score"], response_text)
                yield {
                    "event": "overall_trust",
                    "data": json.dumps(overall)
                }

                await _sleep(0.2)
                yield {
                    "event": "profile",
                    "data": json.dumps({"step": "profile", "status": "done"})
                }

            await _sleep(0.5)
            yield {"event": "done", "data": json.dumps({"status": "complete"})}

        async for r_event in _generate_raw():
            current_event_id[0] += 1
            if current_event_id[0] <= last_id:
                continue
            r_event["id"] = str(current_event_id[0])
            yield r_event

    return EventSourceResponse(event_generator())


"""

with open("d:/Microsoft_AI_Unlocked/main.py", "w", encoding="utf-8") as f:
    f.write(prefix + new_func + suffix)

print("Patch applied successfully")
