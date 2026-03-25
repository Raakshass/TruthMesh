<#
.SYNOPSIS
    Deploys the TruthMesh Azure PaaS Architecture using Bicep.

.DESCRIPTION
    This script provisions the enterprise-grade Azure infrastructure required for TruthMesh:
    - Azure PostgreSQL Flexible Server
    - Azure Key Vault
    - Azure Web App for Containers
    - Log Analytics & Application Insights

    It assumes you are authenticated to Azure explicitly (via `az login`).

.EXAMPLE
    .\deploy.ps1 -ResourceGroupName "rg-truthmesh-prod" -Location "westus3" -DbPassword "SuperSecret123!"
#>

param (
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroupName,

    [Parameter(Mandatory=$true)]
    [string]$Location,

    [string]$DockerImage = "ghcr.io/raakshass/truthmesh:latest"
)

# Constants
$BicepFile = ".\main.bicep"

if (-not (Test-Path $BicepFile)) {
    Write-Error "Deployment script must be run from the 'infra' directory where main.bicep is located."
    exit 1
}

# 1. Target Existing Resource Group
Write-Host "Targeting Pre-Provisioned Resource Group: $ResourceGroupName in $Location..." -ForegroundColor Cyan
# az group create --name $ResourceGroupName --location $Location --output none

# 2. Deploy Resource Manager Template (Bicep)
Write-Host "Triggering Bicep Deployment..." -ForegroundColor Cyan
az deployment group create `
    --resource-group $ResourceGroupName `
    --template-file $BicepFile `
    --parameters dockerImage=$DockerImage `
    --output json

if ($LASTEXITCODE -ne 0) {
    Write-Error "Deployment Failed."
    exit 1
}

Write-Host "Deployment completed successfully! The GitHub Actions workflow will handle container deployments to the Web App." -ForegroundColor Green
