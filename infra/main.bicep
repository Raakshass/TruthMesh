param location string = resourceGroup().location
param appName string = 'truthmesh-${uniqueString(resourceGroup().id)}'
param sku string = 'B1' // Basic tier for economical Hackathon production

// Log Analytics Workspace
resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: '${appName}-logs'
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
  }
}

// Application Insights
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: '${appName}-ai'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalyticsWorkspace.id
  }
}

// App Service Plan
resource appServicePlan 'Microsoft.Web/serverfarms@2022-09-01' = {
  name: '${appName}-plan'
  location: location
  kind: 'linux'
  properties: {
    reserved: true
  }
  sku: {
    name: sku
    tier: 'Basic'
  }
}

// Web App
resource webApp 'Microsoft.Web/sites@2022-09-01' = {
  name: appName
  location: location
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'PYTHON|3.11'
      appCommandLine: 'gunicorn -k uvicorn.workers.UvicornWorker --bind=0.0.0.0:8000 -w 4 main:app'
      alwaysOn: true
      appSettings: [
        {
          name: 'APPINSIGHTS_INSTRUMENTATIONKEY'
          value: appInsights.properties.InstrumentationKey
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsights.properties.ConnectionString
        }
        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'true'
        }
        {
          name: 'WEBSITES_ENABLE_APP_SERVICE_STORAGE'
          value: 'true'
        }
        // Environment variables required by our application
        {
          name: 'ENVIRONMENT'
          value: 'production'
        }
        // These should ideally be in KeyVault, but for now we secure them in AppSettings
        {
          name: 'DB_PATH'
          value: '/home/data/truthmesh.db' // Persistent storage on App Service
        }
        {
          name: 'JWT_SECRET_KEY'
          value: 'REPLACE_ME_WITH_SECURE_KEY' // Will be overridden via CLI during auth setup
        }
        {
          name: 'ENCRYPTION_KEY'
          value: 'REPLACE_ME_WITH_SECURE_KEY' // Will be overridden via CLI during auth setup
        }
      ]
    }
  }
}

output webAppName string = webApp.name
output webAppHostName string = webApp.properties.defaultHostName
