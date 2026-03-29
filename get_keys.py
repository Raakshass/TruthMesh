import subprocess, json

print("Fetching subscriptions...")
subs_json = subprocess.check_output(['az', 'account', 'list', '--output', 'json'], shell=True)
subs = json.loads(subs_json)

found_accounts = []

for sub in subs:
    sub_id = sub['id']
    sub_name = sub['name']
    print(f"Checking subscription: {sub_name} ({sub_id})")
    try:
        acc_json = subprocess.check_output(['az', 'cognitiveservices', 'account', 'list', '--subscription', sub_id, '--output', 'json'], shell=True)
        accounts = json.loads(acc_json)
        for acc in accounts:
            name = acc['name']
            kind = acc['kind']
            rg = acc['resourceGroup']
            endpoint = acc['properties'].get('endpoint', '')
            print(f"  Found {kind}: {name} in {rg}")
            found_accounts.append((sub_id, rg, name, kind, endpoint))
    except Exception as e:
        print(f"  Error checking subscription {sub_id}: {e}")

print("\n--- EXTRACTING KEYS ---")
with open(".env", "a") as env_file:
    for sub_id, rg, name, kind, endpoint in found_accounts:
        try:
            keys_json = subprocess.check_output(['az', 'cognitiveservices', 'account', 'keys', 'list', '--name', name, '--resource-group', rg, '--subscription', sub_id, '--output', 'json'], shell=True)
            keys = json.loads(keys_json)
            key1 = keys.get('key1')
            
            if kind == 'OpenAI':
                env_file.write(f"\nAZURE_OPENAI_ENDPOINT={endpoint}\n")
                env_file.write(f"AZURE_OPENAI_API_KEY={key1}\n")
                print(f"Extracted OpenAI keys for {name}")
            elif kind == 'CognitiveServices' or kind == 'ContentSafety':
                env_file.write(f"\nAZURE_CONTENT_SAFETY_ENDPOINT={endpoint}\n")
                env_file.write(f"AZURE_CONTENT_SAFETY_KEY={key1}\n")
                print(f"Extracted Content Safety keys for {name}")
            elif 'Bing' in kind:
                # Bing search could be Bing.Search.v7
                env_file.write(f"\nBING_SEARCH_API_KEY={key1}\n")
                print(f"Extracted Bing Search keys for {name}")
        except Exception as e:
            print(f"  Failed to get keys for {name}: {e}")

print("\nAPI Discovery Complete.")
