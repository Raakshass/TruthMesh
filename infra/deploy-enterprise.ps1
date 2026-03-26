$ErrorActionPreference = "Stop"

$RG = "TruthMesh-AI-Prod"
$Location = "centralindia"

Write-Host "----------------------------------------" -ForegroundColor Cyan
Write-Host "TruthMesh Enterprise Deployment Protocol" -ForegroundColor Cyan
Write-Host "----------------------------------------" -ForegroundColor Cyan

Write-Host "`n[1/3] Creating Enterprise Resource Group: $RG..."
az group create --name $RG --location $Location --output none
Write-Host "Resource Group ready." -ForegroundColor Green

Write-Host "`n[2/3] Executing Bicep Engine (Provisioning Cosmos DB, AI Search, Web App)..."
Write-Host "This will take ~5-15 minutes depending on Cosmos DB and App Service allocation." -ForegroundColor Yellow
az deployment group create `
    --resource-group $RG `
    --template-file ./infra/main.bicep `
    --output none
Write-Host "Infrastructure convergence complete." -ForegroundColor Green

Write-Host "`n[3/3] Fetching Deployment Telemetry..."
$outputs = az deployment group show --resource-group $RG --name main --query properties.outputs | ConvertFrom-Json
$webAppName = $outputs.webAppName.value
$hostName = $outputs.webAppHostName.value

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "ENTERPRISE DEPLOYMENT SUCCESSFUL" -ForegroundColor Green
Write-Host "Live URL: https://$hostName" -ForegroundColor Yellow
Write-Host "Cosmos DB Connection and AI Search Keys configured automatically." -ForegroundColor DarkGray
Write-Host "========================================" -ForegroundColor Cyan
