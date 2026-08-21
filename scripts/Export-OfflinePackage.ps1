[CmdletBinding()]
param(
    [string]$OutputDirectory = (Join-Path (Split-Path -Parent $PSScriptRoot) 'release\digitalhuman-offline')
)

$projectRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $projectRoot '.env'
$composeFile = Join-Path $projectRoot 'compose.yaml'
$buildComposeFile = Join-Path $projectRoot 'compose.build.yaml'

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw 'Docker was not found. Start Docker Desktop, then open a new PowerShell window and try again.'
}
if (-not (Test-Path $envFile)) {
    throw 'Missing .env. Run .\scripts\Initialize-DeploymentEnv.ps1 first.'
}
if (Test-Path $OutputDirectory) {
    throw "Output directory already exists: $OutputDirectory. Choose a new empty path."
}

Push-Location $projectRoot
try {
    docker compose -f $composeFile -f $buildComposeFile build
    if ($LASTEXITCODE -ne 0) { throw 'Docker image build failed.' }

    docker pull mysql:8.4
    if ($LASTEXITCODE -ne 0) { throw 'MySQL image download failed.' }

    New-Item -ItemType Directory -Path $OutputDirectory | Out-Null
    Copy-Item $composeFile (Join-Path $OutputDirectory 'compose.yaml')
    Copy-Item $envFile (Join-Path $OutputDirectory '.env')
    Copy-Item (Join-Path $projectRoot 'database') (Join-Path $OutputDirectory 'database') -Recurse
    Copy-Item (Join-Path $PSScriptRoot 'Start-Offline.ps1') (Join-Path $OutputDirectory 'Start-Offline.ps1')

    $mysqlContainer = docker compose -f $composeFile ps -q mysql
    if ($mysqlContainer) {
        $databaseSnapshot = Join-Path $OutputDirectory 'database-backup.sql'
        & docker compose -f $composeFile exec -T mysql sh -c 'exec mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction --routines --events "$MYSQL_DATABASE"' |
            Set-Content -Path $databaseSnapshot -Encoding utf8
        if ($LASTEXITCODE -ne 0) { throw 'Database snapshot export failed.' }
        Write-Host 'Included the current Compose MySQL data in database-backup.sql.' -ForegroundColor Green
    } else {
        Write-Warning 'The Compose MySQL service is not running, so this package has no database data snapshot. It will start with the initialization schema only.'
    }

    docker save --output (Join-Path $OutputDirectory 'images.tar') digitalhuman-backend:1.0 digitalhuman-frontend:1.0 mysql:8.4
    if ($LASTEXITCODE -ne 0) { throw 'Docker image export failed.' }

    @"
Digital Human offline deployment package
========================================

1. Copy this entire folder to the target Windows machine.
2. Install and start Docker Desktop (Linux containers / WSL 2 mode).
3. In PowerShell in this folder, run:

   Set-ExecutionPolicy -Scope Process Bypass
   .\Start-Offline.ps1

Open http://localhost (or http://<target-machine-IP>) afterwards.

This package contains .env with real passwords and secrets. Store and transfer it securely.
If database-backup.sql is present, Start-Offline.ps1 restores it on first startup.
"@ | Set-Content -Path (Join-Path $OutputDirectory 'README.txt') -Encoding utf8

    Write-Host "Offline package created: $OutputDirectory" -ForegroundColor Green
} finally {
    Pop-Location
}
