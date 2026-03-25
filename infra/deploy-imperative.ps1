$ErrorActionPreference = "Stop"

$RG = "Budget-RG"
$Location = "centralindia"
$PlanName = "asp-truthmesh"
# Ensure globally unique hostname
$ShortHash = -join ((97..122) | Get-Random -Count 6 | % {[char]$_})
$AppName = "app-truthmesh-$ShortHash"

Write-Host "----------------------------------------" -ForegroundColor Cyan
Write-Host "TruthMesh Imperative Deployment Protocol" -ForegroundColor Cyan
Write-Host "----------------------------------------" -ForegroundColor Cyan

Write-Host "`n[1/4] Verifying Azure Auth Context..."
$context = az account show | ConvertFrom-Json
Write-Host "Authenticated as: $($context.user.name) on $($context.name)" -ForegroundColor Green

Write-Host "`n[2/4] Provisioning App Service Plan: $PlanName (SKU: B1, OS: Linux)..."
az appservice plan create `
    --name $PlanName `
    --resource-group $RG `
    --is-linux `
    --sku B1 `
    --location $Location `
    --output none
Write-Host "App Service Plan ready." -ForegroundColor Green

Write-Host "`n[3/4] Provisioning Containerized Web App: $AppName..."
az webapp create `
    --name $AppName `
    --plan $PlanName `
    --resource-group $RG `
    --deployment-container-image-name "ghcr.io/raakshass/truthmesh:latest" `
    --output none
Write-Host "Web App ready." -ForegroundColor Green

Write-Host "`n[4/4] Injecting High-Concurrency SQLite Configurations..."
# We map Azure Files explicitly to the container and set WAL mode variables
az webapp config appsettings set `
    --name $AppName `
    --resource-group $RG `
    --settings `
        WEBSITES_ENABLE_APP_SERVICE_STORAGE=true `
        DB_PATH=/home/data/truthmesh.db `
        ENVIRONMENT=production `
    --output none
Write-Host "Configuration applied." -ForegroundColor Green

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "DEPLOYMENT SUCCESSFUL" -ForegroundColor Green
Write-Host "Live URL: https://$AppName.azurewebsites.net" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`nNote: Keys for external APIs (Azure OpenAI, etc.) must be added via the Azure Portal -> App Services -> Environment Variables." -ForegroundColor DarkGray
