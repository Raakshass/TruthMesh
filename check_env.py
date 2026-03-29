import subprocess
import json

try:
    o = subprocess.check_output(['az', 'webapp', 'config', 'appsettings', 'list', '--name', 'truthmesh-api-zam6l', '--resource-group', 'Siddhant-Jain-RG', '--output', 'json'])
    d = json.loads(o)
    found = {x['name']: x['value'] for x in d if x['name'] in ['ADMIN_PASSWORD', 'DEMO_PASSWORD', 'COSMOS_DB_CONNECTION_STRING']}
    print("KEYS FOUND:", list(found.keys()))
    if 'COSMOS_DB_CONNECTION_STRING' in found:
        print("COSMOS DB STRING starts with:", found['COSMOS_DB_CONNECTION_STRING'][:20])
except Exception as e:
    print("Error:", e)
