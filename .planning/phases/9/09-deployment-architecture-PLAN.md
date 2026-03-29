# Phase 9: Deployment Architecture Refactor

## Objective
The current deployment strategy relies on naive, blocking terminal scripts (`deploy_ghcr_to_azure.py`) and manual undocumented steps (e.g., Cosmos DB provisioning). The goal of Phase 9 is to solidify the pipeline to enterprise standards, fulfilling the "zero-trust / zero-validation" criteria for high-stakes competition.

## Critical Flaws Identified
1.  **Deployment Attrition:** Local python wrapper scripts are fragile.
2.  **Blind Container Routing:** `docker-release.yml` doesn't enforce the `latest` tag used by Azure App Service container mode.
3.  **Fragile Cloud Dependencies:** `az cosmosdb create` was executed manually and resulted in CLI errors. No connection string pipeline exists.

## Execution Plan
1.  **Update GitHub Actions (`docker-release.yml`):**
    *   Add explicitly the `type=raw,value=latest,enable={{is_default_branch}}` to `docker/metadata-action` tags.
2.  **Infrastructure Orchestration (`infra/provision.ps1`):**
    *   Write a robust PowerShell script to provision Cosmos DB properly.
    *   Retrieve the primary connection string dynamically.
    *   Inject the `MONGO_URI` securely into Azure App Service environment variables.
3.  **Frontend/Backend Linking:**
    *   Inject the backend URL into Azure Static Web Apps config or simply verify the static app correctly resolves to the API gateway.
