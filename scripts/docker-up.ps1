Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$composeFile = Join-Path $repoRoot "docker-compose.yml"
$rootEnv = Join-Path $repoRoot ".env.docker"
$rootEnvExample = Join-Path $repoRoot ".env.docker.example"
$webEnv = Join-Path $repoRoot "speech-coach/.env.docker"
$webEnvExample = Join-Path $repoRoot "speech-coach/.env.docker.example"
$agentEnv = Join-Path $repoRoot "backend-vision-agent/.env.docker"
$agentEnvExample = Join-Path $repoRoot "backend-vision-agent/.env.docker.example"

function Test-DockerEngine {
    & docker info --format "{{.ServerVersion}}" *> $null
    return $LASTEXITCODE -eq 0
}

function Require-Docker {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        throw "Docker CLI is not installed or not on PATH."
    }

    if (Test-DockerEngine) {
        return
    }

    $dockerDesktopPath = Join-Path $Env:ProgramFiles "Docker\Docker\Docker Desktop.exe"
    if (Test-Path $dockerDesktopPath) {
        Write-Host "Docker engine is unavailable. Launching Docker Desktop..."
        Start-Process -FilePath $dockerDesktopPath | Out-Null

        for ($attempt = 0; $attempt -lt 60; $attempt++) {
            Start-Sleep -Seconds 2

            if (Test-DockerEngine) {
                Write-Host "Docker Desktop is ready."
                return
            }
        }
    }

    throw "Docker Desktop is not running or the Docker engine is unavailable. Start Docker Desktop, wait until it shows as running, then rerun this script."
}

function Ensure-FileFromExample {
    param(
        [string]$Target,
        [string]$Example
    )

    if (-not (Test-Path $Target)) {
        Copy-Item $Example $Target
        return $true
    }

    return $false
}

function Read-EnvFile {
    param([string]$Path)

    $values = @{}
    if (-not (Test-Path $Path)) {
        return $values
    }

    foreach ($line in Get-Content $Path) {
        if ([string]::IsNullOrWhiteSpace($line)) {
            continue
        }

        if ($line.TrimStart().StartsWith("#")) {
            continue
        }

        $parts = $line.Split("=", 2)
        if ($parts.Length -eq 2) {
            $values[$parts[0].Trim()] = $parts[1]
        }
    }

    return $values
}

function Set-EnvValue {
    param(
        [string]$Path,
        [string]$Key,
        [string]$Value
    )

    $lines = if (Test-Path $Path) { Get-Content $Path } else { @() }
    $updated = $false

    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match "^$([regex]::Escape($Key))=") {
            $lines[$i] = "$Key=$Value"
            $updated = $true
        }
    }

    if (-not $updated) {
        $lines += "$Key=$Value"
    }

    Set-Content -Path $Path -Value $lines
}

function New-RandomHex {
    param([int]$Bytes = 32)

    $buffer = New-Object byte[] $Bytes
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($buffer)
    return ([System.BitConverter]::ToString($buffer)).Replace("-", "").ToLowerInvariant()
}

$createdRootEnv = Ensure-FileFromExample -Target $rootEnv -Example $rootEnvExample
$createdWebEnv = Ensure-FileFromExample -Target $webEnv -Example $webEnvExample
$createdAgentEnv = Ensure-FileFromExample -Target $agentEnv -Example $agentEnvExample

Require-Docker

if ($createdWebEnv -or $createdAgentEnv) {
    Write-Host "Created Docker env templates:"
    if ($createdWebEnv) {
        Write-Host " - speech-coach/.env.docker"
    }
    if ($createdAgentEnv) {
        Write-Host " - backend-vision-agent/.env.docker"
    }
    Write-Host ""
    Write-Host "Fill in the required secrets in those files, then rerun:"
    Write-Host "  powershell -ExecutionPolicy Bypass -File .\\scripts\\docker-up.ps1"
    exit 1
}

if ($createdRootEnv) {
    Write-Host "Created .env.docker with default ports."
}

$rootEnvValues = Read-EnvFile -Path $rootEnv
$instanceSecret = ""
if ($rootEnvValues.ContainsKey("INSTANCE_SECRET")) {
    $instanceSecret = $rootEnvValues["INSTANCE_SECRET"].Trim()
}

$expectedInngestAppUrl = "http://web:3000/api/inngest"
$inngestAppUrl = ""
if ($rootEnvValues.ContainsKey("INNGEST_APP_URL")) {
    $inngestAppUrl = $rootEnvValues["INNGEST_APP_URL"].Trim()
}

if (-not $inngestAppUrl) {
    Set-EnvValue -Path $rootEnv -Key "INNGEST_APP_URL" -Value $expectedInngestAppUrl
    Write-Host "Set INNGEST_APP_URL to $expectedInngestAppUrl for Docker service discovery."
} elseif ($inngestAppUrl -ne $expectedInngestAppUrl) {
    Write-Warning "INNGEST_APP_URL is '$inngestAppUrl'. Docker deployment should use '$expectedInngestAppUrl'."
}

if (-not $instanceSecret) {
    if ($createdRootEnv) {
        $instanceSecret = New-RandomHex
        Set-EnvValue -Path $rootEnv -Key "INSTANCE_SECRET" -Value $instanceSecret
        Write-Host "Saved a stable INSTANCE_SECRET to .env.docker"
    } else {
        throw "INSTANCE_SECRET is blank in .env.docker. Set it to a stable random value and rerun the script."
    }
}

Write-Host "Starting the full Docker stack..."
docker compose --env-file $rootEnv -f $composeFile up --build -d

Write-Host ""
Write-Host "Docker pipeline is up:"
Write-Host " - Web:              http://localhost:3000"
Write-Host " - Convex API:       http://localhost:3210"
Write-Host " - Convex Dashboard: http://localhost:6791"
Write-Host " - Inngest Dev:      http://localhost:8288"
