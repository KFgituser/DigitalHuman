[CmdletBinding()]
param(
    [switch]$Force
)

$projectRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $projectRoot '.env'

if ((Test-Path $envFile) -and -not $Force) {
    throw ".env already exists: $envFile. Use -Force only when you intend to replace it."
}

function New-SafeSecret([int]$Length) {
    $bytes = New-Object byte[] $Length
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $rng.GetBytes($bytes)
    } finally {
        $rng.Dispose()
    }
    return ([Convert]::ToBase64String($bytes)).Replace('+', 'A').Replace('/', 'B').Replace('=', '')
}

$adminUsername = Read-Host 'Initial administrator username (default: admin)'
if ([string]::IsNullOrWhiteSpace($adminUsername)) {
    $adminUsername = 'admin'
}

do {
    $adminPassword = Read-Host 'Initial administrator password'
    if ([string]::IsNullOrWhiteSpace($adminPassword)) {
        Write-Host 'Administrator password cannot be empty.' -ForegroundColor Yellow
    }
} while ([string]::IsNullOrWhiteSpace($adminPassword))

if ($adminUsername -match '[\s=#]' -or $adminPassword -match '[\r\n]') {
    throw 'The username cannot contain spaces, =, or #; the password cannot contain line breaks.'
}

@"
MYSQL_DATABASE=digitalhuman
MYSQL_APP_USERNAME=digitalhuman
DB_PASSWORD=$(New-SafeSecret 24)
MYSQL_ROOT_PASSWORD=$(New-SafeSecret 32)
JWT_SECRET=$(New-SafeSecret 48)
INIT_ADMIN_ENABLED=true
INIT_ADMIN_USERNAME=$adminUsername
INIT_ADMIN_PASSWORD=$adminPassword
HOST_PORT=80
"@ | Set-Content -Path $envFile -Encoding utf8 -NoNewline

Write-Host ".env created at $envFile" -ForegroundColor Green
Write-Host 'Keep this file private. It is required to restore this deployment on another machine.' -ForegroundColor Yellow
