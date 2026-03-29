import requests
import json
import sys

BASE_URL = "https://truthmesh-api-zam6l.azurewebsites.net"
USERNAME = "admin"
PASSWORD = "admin"
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
        "Content-Type": "application/json",
        "Accept": "text/event-stream"
    }
    payload = {"query": CLAIM}
    
    try:
        stream_resp = requests.post(f"{BASE_URL}/api/v1/verify_stream", headers=headers, json=payload, stream=True, timeout=60)
        if stream_resp.status_code != 200:
            print(f"Stream Request failed. Status: {stream_resp.status_code}, Body: {stream_resp.text}")
            sys.exit(1)
    except Exception as e:
        print(f"Stream Request Exception: {e}")
        sys.exit(1)
        
    print("   Connection established. Reading SSE Stream from Cloud Runtime...")
    
    stages_seen = set()
    final_result = None
    
    try:
        for line in stream_resp.iter_lines():
            if line:
                line_str = line.decode('utf-8')
                if line_str.startswith('data: '):
                    data_str = line_str[6:]
                    if data_str == "[DONE]":
                        break
                    try:
                        data = json.loads(data_str)
                        stage_type = data.get("type")
                        if stage_type == "decomposition":
                            print("   -> [OK] Received Decomposition Step")
                            stages_seen.add("decomposition")
                        elif stage_type == "evidence":
                            print("   -> [OK] Received Evidence Retrieval Step")
                            stages_seen.add("evidence")
                        elif stage_type == "analysis":
                            print("   -> [OK] Received Core Analysis Step")
                            stages_seen.add("analysis")
                        elif stage_type == "final_result":
                            print("   -> [OK] Received Final Result Compilation")
                            final_result = data.get("result", {})
                            stages_seen.add("final_result")
                    except json.JSONDecodeError:
                        pass
    except Exception as e:
        print(f"Stream reading error: {e}")
        sys.exit(1)

    print("\n3. Validating Pipeline Execution Integrity...")
    missing_stages = {"decomposition", "evidence", "analysis", "final_result"} - stages_seen
    if missing_stages:
        print(f"ERROR: Pipeline did not complete all stages! Missing: {missing_stages}")
        sys.exit(1)
        
    print("SUCCESS: TruthMesh Pipeline is fully operational on Azure App Service!")
    print(f"Azure Live Veracity Score: {final_result.get('final_veracity_score', 'UNKNOWN')}/100")
    print("--- RAW RESULT TRUNCATED ---")
    raw_json = json.dumps(final_result)
    print(raw_json[:300] + "...\n")

if __name__ == "__main__":
    run_e2e()
