# Local dev: start / stop the web app (shell + 3 remotes) in its own window.
#
#   .\scripts\dev.ps1 start     # "shopflow web" window, npm run dev -> http://localhost:5000
#   .\scripts\dev.ps1 stop      # closes that window and its node processes
#   .\scripts\dev.ps1 status
#
# The backend runs separately: in the shopflow folder, .\scripts\start-all.ps1
# (start-all.ps1 -Web ..\shopflow-frontend starts both; stop-all.ps1 stops both).
param(
  [Parameter(Position = 0)] [ValidateSet("start", "stop", "status")] [string]$Action = "status",
  [string]$Api = "http://localhost:3000"   # the gateway the dev server proxies /v1 to
)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$app = "http://localhost:5000"

function Say($m, $c = "Cyan") { Write-Host "[web] $m" -ForegroundColor $c }
function WebWindows {
  Get-Process powershell, pwsh -ErrorAction SilentlyContinue |
    Where-Object { $_.MainWindowTitle -like 'shopflow web*' }
}
function Up($url) {
  try { Invoke-WebRequest $url -UseBasicParsing -TimeoutSec 3 | Out-Null; return $true } catch { return $false }
}

switch ($Action) {
  "start" {
    if (WebWindows) { Say "already running: $app" "Yellow"; return }
    if (-not (Test-Path (Join-Path $root "node_modules"))) {
      Say "first run: npm install"
      Push-Location $root; try { npm install } finally { Pop-Location }
    }
    if (-not (Up "$Api/health/ready")) {
      Say "backend not answering on $Api (start it: ..\shopflow\scripts\start-all.ps1). Starting the web app anyway." "Yellow"
    }
    Start-Process powershell -WorkingDirectory $root -ArgumentList '-NoExit', '-Command',
      "`$Host.UI.RawUI.WindowTitle = 'shopflow web'; `$env:SHOPFLOW_API = '$Api'; npm run dev"
    Say "starting the 4 dev servers (ports 5000-5003)..."
    $deadline = (Get-Date).AddSeconds(90)
    while ((Get-Date) -lt $deadline) {
      if (Up $app) { Say "READY: $app" "Green"; return }
      Start-Sleep 2
    }
    Say "not ready after 90 s: look at the 'shopflow web' window" "Yellow"
  }
  "stop" {
    $w = WebWindows
    if (-not $w) { Say "not running" "Yellow"; return }
    $w | ForEach-Object { taskkill /PID $_.Id /T /F | Out-Null }
    Say "stopped. Start again: .\scripts\dev.ps1 start" "Green"
  }
  "status" {
    if (WebWindows) { Say "window 'shopflow web': running" } else { Say "window 'shopflow web': not running" }
    if (Up $app) { Say "web app  $app  UP" "Green" } else { Say "web app  $app  DOWN" "Yellow" }
    if (Up "$Api/health/ready") { Say "backend  $Api  UP" "Green" } else { Say "backend  $Api  DOWN" "Yellow" }
  }
}
