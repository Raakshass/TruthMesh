import subprocess
import json
import sys

def run(cmd):
    return subprocess.check_output(cmd, shell=True).decode('utf-8').strip()

print("Fetching Static Web App Name...")
output = run("az staticwebapp list --resource-group Siddhant-Jain-RG")
apps = json.loads(output)
if not apps:
    print("No static web apps found.")
    sys.exit(0)

app_name = apps[0]['name']
print(f"Found SWA: {app_name}")

print("Updating VITE_API_URL...")
run(f'az staticwebapp appsettings set --name {app_name} --resource-group Siddhant-Jain-RG --setting-names VITE_API_URL="https://truthmesh-qktpe5frtvy5w.azurewebsites.net"')
print("Updated successfully.")
