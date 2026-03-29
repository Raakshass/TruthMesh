import subprocess
import json

try:
    print("Fetching connection string...")
    cs_out = subprocess.check_output('az cosmosdb keys list --name truthmesh-db-jam6l --resource-group Siddhant-Jain-RG --type connection-strings --output json', shell=True)
    cs_data = json.loads(cs_out)
    cs = cs_data['connectionStrings'][0]['connectionString']

    print("Setting App Service configuration...")
    cmd = f'az webapp config appsettings set --name truthmesh-api-zam6l --resource-group Siddhant-Jain-RG --settings "COSMOS_DB_CONNECTION_STRING={cs}" --output json'
    set_out = subprocess.check_output(cmd, shell=True)
    print("Successfully set COSMOS_DB_CONNECTION_STRING.")
except Exception as e:
    print("Error:", e)
    if hasattr(e, 'output'):
        print("Output:", e.output)
