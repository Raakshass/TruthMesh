import os
import subprocess

def set_env():
    env_vars = []
    with open(".env", "r") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#"):
                key, val = line.split("=", 1)
                env_vars.append(f"{key}={val}")

    # Add CORS origin specifically for the new truthmesh-ui domain
    env_vars.append('CORS_ORIGINS=["http://localhost:5173", "https://lively-bay-038b5640f.6.azurestaticapps.net"]')

    # Disable buffering for Python stdout in Azure logging temporarily
    env_vars.append("PYTHONUNBUFFERED=1")

    cmd = ["az", "webapp", "config", "appsettings", "set", "-g", "Siddhant-Jain-RG", "-n", "truthmesh-qktpe5frtvy5w", "--settings"] + env_vars
    print("Running az webapp config appsettings set...")
    subprocess.run(cmd, check=True, shell=True)
    print("Done configuring environment variables for truthmesh-qktpe5frtvy5w.")

if __name__ == "__main__":
    set_env()
