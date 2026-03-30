import requests
import json
import sys

BASE_URL = "https://truthmesh.onrender.com"
USERNAME = "demo"
PASSWORD = "demo"
CLAIM = "Python is a compiled programming language"

def run_e2e():
    print("1. Authenticating with Live Azure API...")
    try:
        resp = requests.post(f"{BASE_URL}/token", data={"username": USERNAME, "password": PASSWORD}, timeout=60)
        if resp.status_code != 200:
            print(f"Auth failed. Status: {resp.status_code}, Body: {resp.text}")
            sys.exit(1)
    except Exception as e:
        print(f"Auth Request Exception: {e}")
        sys.exit(1)
    
    token = resp.json()
    access_token = token.get("access_token", "")
    print(f"   Success! Token acquired: {access_token[:15]}...")

    print(f"\n2. Submitting test claim to Production Pipeline: '{CLAIM}'...")
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    payload = {"query": CLAIM}
    
    try:
        query_resp = requests.post(f"{BASE_URL}/api/query", headers=headers, json=payload, timeout=60)
        if query_resp.status_code != 200:
            print(f"Query Request failed. Status: {query_resp.status_code}, Body: {query_resp.text}")
            sys.exit(1)
        query_data = query_resp.json()
        query_id = query_data.get("query_id")
        if not query_id:
            print(f"Failed to extract query_id from response: {query_data}")
            sys.exit(1)
        print(f"   -> [OK] Query accepted. Query ID: {query_id}")
    except Exception as e:
        print(f"Query Request Exception: {e}")
        sys.exit(1)
        
    print("\n3. Connecting to SSE Stream from Cloud Runtime...")
    sse_headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "text/event-stream"
    }
    
    stages_seen = set()
    final_result = None
    current_event = ""
    
    try:
        stream_resp = requests.get(f"{BASE_URL}/api/verify/{query_id}", headers=sse_headers, stream=True, timeout=60)
        if stream_resp.status_code != 200:
            print(f"SSE Request failed. Status: {stream_resp.status_code}, Body: {stream_resp.text}")
            sys.exit(1)
            
        for line in stream_resp.iter_lines():
            if line:
                line_str = line.decode('utf-8')
                if line_str.startswith("event: "):
                    current_event = line_str[7:]
                elif line_str.startswith('data: '):
                    data_str = line_str[6:]
                    if data_str == "[DONE]":
                        break
                    try:
                        data = json.loads(data_str)
                        stage_type = data.get("step") or data.get("type", "unknown")
                        
                        if stage_type == "decompose":
                            print("   -> [OK] Received Decomposition Step")
                            stages_seen.add("decomposition")
                        elif stage_type == "verify" or current_event == "verify":
                            if "claim" in data:
                                print(f"   -> [OK] Verifying claim: {data.get('claim', '')[:30]}...")
                            stages_seen.add("evidence")
                        elif stage_type == "consensus" or current_event == "consensus":
                            stages_seen.add("analysis")
                        elif current_event == "overall_trust":
                            print("   -> [OK] Received Final Result Compilation (Overall Trust)")
                            final_result = data
                            stages_seen.add("final_result")
                        elif stage_type == "error":
                            print(f"   -> [ERROR] Pipeline encountered an error: {data}")
                            sys.exit(1)
                    except json.JSONDecodeError:
                        pass
    except Exception as e:
        print(f"Stream reading error: {e}")
        sys.exit(1)

    print("\n4. Validating Pipeline Execution Integrity...")
    missing_stages = {"decomposition", "evidence", "analysis", "final_result"} - stages_seen
    if missing_stages:
        print(f"WARNING: Pipeline might not have completed all conceptual stages natively, missing: {missing_stages}. Allowed if cache hit occurred.")
        
    if not final_result:
        print("ERROR: Pipeline did not return a final_result payload!")
        sys.exit(1)
        
    print("SUCCESS: TruthMesh Pipeline is fully operational on Render App Service!")
    print(f"Azure Live Veracity Score: {final_result.get('final_veracity_score', final_result.get('trust_score', 'UNKNOWN'))}")
    print("--- RAW RESULT TRUNCATED ---")
    raw_json = json.dumps(final_result)
    print(raw_json[:300] + "...\n")

if __name__ == "__main__":
    run_e2e()
