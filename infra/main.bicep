@description('Location for all resources.')
param location string = resourceGroup().location

@description('Base name for resources.')
param appName string = 'truthmesh-${uniqueString(resourceGroup().id)}'

@description('The GitHub Container Registry image to deploy.')
param dockerImage string = 'ghcr.io/raakshass/truthmesh:latest'

var keyVaultName = 'kv-${substring(uniqueString(resourceGroup().id), 0, 10)}'

// 1. Log Analytics Workspace
resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: '${appName}-logs'
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
  }
}

// 2. Application Insights
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: '${appName}-ai'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalyticsWorkspace.id
  }
}

// 3. Azure Key Vault
resource keyVault 'Microsoft.KeyVault/vaults@2023-02-01' = {
  name: keyVaultName
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
  }
}

// 4. App Service Plan (Linux)
resource appServicePlan 'Microsoft.Web/serverfarms@2022-09-01' = {
  name: '${appName}-plan'
  location: location
  kind: 'linux'
  properties: {
    reserved: true
  }
  sku: {
    name: 'B1'
    tier: 'Basic' // Economical for student credits
  }
}

// 5. Azure Cosmos DB (Serverless MongoDB API)
resource cosmosDbAccount 'Microsoft.DocumentDB/databaseAccounts@2023-04-15' = {
  name: 'db-${substring(uniqueString(resourceGroup().id), 0, 10)}'
  location: location
  kind: 'MongoDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    locations: [
      {
        locationName: location
        failoverPriority: 0
      }
    ]
    capabilities: [
      {
        name: 'EnableServerless'
      }
    ]
    apiProperties: {
      serverVersion: '4.2'
    }
  }
}

// 6. Azure AI Search
resource aiSearch 'Microsoft.Search/searchServices@2022-09-01' = {
  name: 'search-${substring(uniqueString(resourceGroup().id), 0, 10)}'
  location: location
  sku: {
    name: 'basic'
  }
  properties: {
    replicaCount: 1
    partitionCount: 1
  }
}

// 7. Web App for Containers
resource webApp 'Microsoft.Web/sites@2022-09-01' = {
  name: appName
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'DOCKER|${dockerImage}'
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
          name: 'AZURE_KEY_VAULT_URL'
          value: keyVault.properties.vaultUri
        }
        {
          name: 'ENVIRONMENT'
          value: 'production'
        }
        {
          name: 'COSMOS_DB_CONNECTION_STRING'
          value: cosmosDbAccount.listConnectionStrings().connectionStrings[0].connectionString
        }
        {
          name: 'AI_SEARCH_ENDPOINT'
          value: 'https://${aiSearch.name}.search.windows.net'
        }
        {
          name: 'AI_SEARCH_KEY'
          value: aiSearch.listAdminKeys().primaryKey
        }
        {
          name: 'JWT_SECRET_KEY'
          value: guid(resourceGroup().id, deployment().name, 'JWT_SECRET_KEY')
        }
      ]
    }
  }
}

// 8. Key Vault Native Access Policy (Bypass RBAC Restrictions)
resource kvAccessPolicy 'Microsoft.KeyVault/vaults/accessPolicies@2023-02-01' = {
  name: 'add'
  parent: keyVault
  properties: {
    accessPolicies: [
      {
        tenantId: subscription().tenantId
        objectId: webApp.identity.principalId
        permissions: {
          secrets: [
            'get'
            'list'
          ]
        }
      }
    ]
  }
}

output webAppName string = webApp.name
output webAppHostName string = webApp.properties.defaultHostName
output keyVaultUri string = keyVault.properties.vaultUri
