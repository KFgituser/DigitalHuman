[CmdletBinding()]
param()

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw 'Docker was not found. Start Docker Desktop, then open a new PowerShell window and try again.'
}

Set-Location $PSScriptRoot
if (-not (Test-Path '.\images.tar') -or -not (Test-Path '.\compose.yaml') -or -not (Test-Path '.\.env')) {
    throw 'This folder is incomplete. It must contain images.tar, compose.yaml, and .env.'
}

docker load --input .\images.tar
if ($LASTEXITCODE -ne 0) { throw 'Docker image import failed.' }

docker compose -f .\compose.yaml up -d mysql
if ($LASTEXITCODE -ne 0) { throw 'MySQL startup failed.' }

$snapshot = '.\database-backup.sql'
$restoreMarker = '.\.database-restored'
if ((Test-Path $snapshot) -and -not (Test-Path $restoreMarker)) {
    Write-Host 'Waiting for MySQL before restoring the database snapshot...'
    $ready = $false
    for ($attempt = 1; $attempt -le 36; $attempt++) {
        & docker compose -f .\compose.yaml exec -T mysql sh -c 'mysqladmin ping -h localhost -uroot -p"$MYSQL_ROOT_PASSWORD" --silent' | Out-Null
        if ($LASTEXITCODE -eq 0) {
            $ready = $true
            break
        }
        Start-Sleep -Seconds 5
    }
    if (-not $ready) { throw 'MySQL did not become ready in three minutes.' }

    Get-Content $snapshot -Raw | & docker compose -f .\compose.yaml exec -T mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"'
    if ($LASTEXITCODE -ne 0) { throw 'Database snapshot restore failed.' }
    New-Item -ItemType File -Path $restoreMarker | Out-Null
    Write-Host 'Database snapshot restored.' -ForegroundColor Green
}

docker compose -f .\compose.yaml up -d backend frontend
if ($LASTEXITCODE -ne 0) { throw 'Application startup failed.' }

docker compose -f .\compose.yaml ps
Write-Host 'Deployment started. Open http://localhost or http://<this-machine-IP>.' -ForegroundColor Green
