import os
import subprocess
import sys

def run_cmd(cmd):
    print(f"Executing: {cmd}")
    result = subprocess.run(cmd, shell=True, text=True, capture_output=True)
    if result.returncode != 0:
        print(f"Error executing command: {result.stderr}")
        sys.exit(1)
    return result.stdout.strip()

def main():
    print("=== TruthMesh Immutable Cloud Binder ===")
    print("This script will transition your Azure App Service from Native Python to a GHCR Docker Container.")
    print("Ensure your code has been pushed to GitHub and the 'CI - Test & Build' Action has SUCCESSFULLy completed.")
    
    confirm = input("Has the GitHub Action completed and published to GHCR? (y/N): ")
    if confirm.lower() != 'y':
        print("Aborting. Please push to GitHub and wait for the workflow to complete.")
        sys.exit(0)

    # Repository name extraction
    remote_url = run_cmd("git config --get remote.origin.url")
    if not remote_url or 'github.com' not in remote_url:
        print("Could not detect GitHub origin. Are you in the valid repository?")
        sys.exit(1)
        
    repo_path = remote_url.split("github.com/")[-1].replace(".git", "").lower()
    ghcr_image = f"ghcr.io/{repo_path}:latest"

    print(f"\n[1] Extracted Target Image: {ghcr_image}")
    print("[2] Requesting GHCR Public Access via Azure Container Binding...")
    
    # Configure the Azure Web App to use the Docker container
    run_cmd(f'az webapp config container set --resource-group Siddhant-Jain-RG --name truthmesh-api-zam6l --docker-custom-image-name "{ghcr_image}"')

    # Remove the legacy Python startup file to prevent boot conflicts
    print("[3] Stripping native Python boot directives...")
    run_cmd('az webapp config set --resource-group Siddhant-Jain-RG --name truthmesh-api-zam6l --startup-file ""')

    # Re-inject the port binding natively into App Settings for Docker integration
    print("[4] Injecting explicit Docker Edge Port mapping...")
    run_cmd('az webapp config appsettings set --resource-group Siddhant-Jain-RG --name truthmesh-api-zam6l --settings WEBSITES_PORT=8000')

    print("\nSUCCESS: Architecture transitioned to Immutable Docker Pipeline.")
    print("Please allow 1-3 minutes for the Azure Edge router to pull the new container and begin routing traffic to https://truthmesh-api-zam6l.azurewebsites.net")
    
if __name__ == "__main__":
    main()
