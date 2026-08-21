[CmdletBinding()]
param(
    [string]$OutputDirectory = (Join-Path (Split-Path -Parent $PSScriptRoot) 'backups')
)

$projectRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $projectRoot '.env'
if (-not (Test-Path $envFile)) { throw 'Missing .env.' }

$values = @{}
foreach ($line in Get-Content $envFile) {
    if ($line -match '^([^#=]+)=(.*)$') {
        $values[$matches[1]] = $matches[2]
    }
}
foreach ($key in 'MYSQL_ROOT_PASSWORD', 'MYSQL_DATABASE') {
    if (-not $values.ContainsKey($key)) { throw "Missing $key in .env." }
}

New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$backupFile = Join-Path $OutputDirectory ("digitalhuman-{0}.sql" -f (Get-Date -Format 'yyyyMMdd-HHmmss'))

Push-Location $projectRoot
try {
    & docker compose exec -T -e "MYSQL_PWD=$($values['MYSQL_ROOT_PASSWORD'])" mysql mysqldump -u root --single-transaction --routines --events $values['MYSQL_DATABASE'] |
        Set-Content -Path $backupFile -Encoding utf8
    if ($LASTEXITCODE -ne 0) { throw 'Database backup failed.' }
} finally {
    Pop-Location
}

Write-Host "Database backup created: $backupFile" -ForegroundColor Green
