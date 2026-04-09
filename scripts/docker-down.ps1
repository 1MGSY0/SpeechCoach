Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$composeFile = Join-Path $repoRoot "docker-compose.yml"
$rootEnv = Join-Path $repoRoot ".env.docker"

docker compose --env-file $rootEnv -f $composeFile down
