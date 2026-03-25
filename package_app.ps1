$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$buildDir = Join-Path $repoRoot "build"
$zipPath = Join-Path $repoRoot "app.zip"

$filesToCopy = @(
    "auth.py",
    "config.py",
    "database.py",
    "demo_cache.py",
    "jobs.py",
    "main.py",
    "monitoring.py",
    "requirements.txt",
    "seed_data.py",
    "startup.sh"
)

$dirsToCopy = @(
    "pipeline",
    "static",
    "templates"
)

if (Test-Path $buildDir) {
    Remove-Item -Recurse -Force $buildDir
}

New-Item -ItemType Directory -Path $buildDir | Out-Null

foreach ($file in $filesToCopy) {
    Copy-Item -Path (Join-Path $repoRoot $file) -Destination $buildDir
}

foreach ($dir in $dirsToCopy) {
    Copy-Item -Path (Join-Path $repoRoot $dir) -Destination $buildDir -Recurse
}

if (Test-Path $zipPath) {
    Remove-Item -Force $zipPath
}

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::Open(
    $zipPath,
    [System.IO.Compression.ZipArchiveMode]::Create
)

try {
    Get-ChildItem -Path $buildDir -Recurse -File |
        Where-Object {
            $_.FullName -notlike "*\__pycache__\*" -and
            $_.Extension -ne ".pyc"
        } |
        ForEach-Object {
            $relativePath = $_.FullName.Substring($buildDir.Length + 1).Replace("\", "/")
            [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
                $archive,
                $_.FullName,
                $relativePath,
                [System.IO.Compression.CompressionLevel]::Optimal
            ) | Out-Null
        }
}
finally {
    $archive.Dispose()
}

Write-Host "Build directory refreshed at $buildDir"
Write-Host "Deployment archive created at $zipPath"
