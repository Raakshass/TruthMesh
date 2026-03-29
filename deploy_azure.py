import subprocess
import json
import random
import string
import sys
import os

def run_cmd(cmd):
    print(f"Running: {cmd}")
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error: {result.stderr}")
    return result.stdout.strip()

def main():
    suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=5))
    rg = "TruthMesh-RG"
    loc = "eastus"
    cosmos = f"truthmesh-db-{suffix}"
    plan = f"TruthMesh-Plan-{suffix}"
    api = f"truthmesh-api-{suffix}"

    print("=== TruthMesh Azure Zero-Cost Deployment ===")
    
    print("\n1. Creating Resource Group...")
    run_cmd(f"az group create --name {rg} --location {loc}")

    print("\n2. Creating Cosmos DB MongoDB (Free Tier)...")
    print("   Note: This can take 5-10 minutes. Please be patient.")
    # Attempt free tier. If it fails (due to 1 free tier per sub limit), do not block, just fallback or report.
    res = run_cmd(f"az cosmosdb create --name {cosmos} --resource-group {rg} --kind MongoDB --server-version 4.2 --enable-free-tier true")

    print("\n3. Getting Cosmos DB Connection String...")
    conn_str_json = run_cmd(f"az cosmosdb keys list --name {cosmos} --resource-group {rg} --type connection-strings --output json")
    conn_str = ""
    try:
        keys = json.loads(conn_str_json)
        conn_str = keys["connectionStrings"][0]["connectionString"]
    except Exception as e:
        print(f"Failed to parse connection string: {e}")

    print("\n4. Creating App Service Plan (F1 Linux)...")
    run_cmd(f"az appservice plan create --name {plan} --resource-group {rg} --sku F1 --is-linux")

    print("\n5. Creating Web App (API)...")
    run_cmd(f"az webapp create --resource-group {rg} --plan {plan} --name {api} --runtime \"PYTHON|3.11\"")

    print("\n6. Configuring Web App Settings...")
    env_vars = []
    if os.path.exists(".env"):
        with open(".env", "r") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#"):
                    env_vars.append(line)
    
    if conn_str:
        env_vars.append(f"COSMOS_DB_CONNECTION_STRING={conn_str}")
    
    # Add start command since FastAPI uses uvicorn
    env_args = " ".join([f'"{e}"' for e in env_vars])
    run_cmd(f"az webapp config appsettings set --resource-group {rg} --name {api} --settings {env_args} SCM_DO_BUILD_DURING_DEPLOYMENT=true")
    run_cmd(f"az webapp config set --resource-group {rg} --name {api} --startup-file \"python -m uvicorn main:app --host 0.0.0.0 --port 8000\"")

    print("\n7. Deploying Code to Web App (zipping project)...")
    # This will ZIP the current folder and deploy it
    run_cmd(f"az webapp up --resource-group {rg} --name {api} --plan {plan} --runtime \"PYTHON|3.11\"")

    print(f"\n=== DEPLOYMENT COMPLETE ===")
    print(f"Backend API URL: https://{api}.azurewebsites.net")
    
    # Update frontend .env to point to new API
    print("\n8. Updating Frontend Configuration...")
    frontend_env = f"VITE_API_URL=https://{api}.azurewebsites.net\n"
    with open("frontend/.env", "w") as f:
        f.write(frontend_env)
        
    print("\nNext step: Build and deploy the frontend using Azure Static Web Apps.")

if __name__ == '__main__':
    main()
