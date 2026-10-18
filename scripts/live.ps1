# The live shop on AWS (Stage 1): start / stop / check with one command.
#
#   .\scripts\live.ps1 status    # box state, URL, live web version, shop + API up?
#   .\scripts\live.ps1 start     # ~3-6 min: box on, then waits until the shop AND the API answer
#   .\scripts\live.ps1 stop      # compute stops; data, certificates and the DNS name stay
#   .\scripts\live.ps1 open      # open the shop in the browser
#
# One EC2 box runs everything (backend + this web app), so this is the same box as
# `.\scripts\demo.ps1 stage1 start|stop` in the backend repo. Needs the AWS CLI
# profile "shopflow" (the same one the backend scripts use).
param(
  [Parameter(Position = 0)] [ValidateSet("status", "start", "stop", "open")] [string]$Action = "status",
  [string]$Profile = "shopflow",
  [string]$Region = "ap-southeast-2"
)
$ErrorActionPreference = "Stop"
$env:AWS_PROFILE = $Profile
$aws = @("--region", $Region)

function Say($m, $c = "Cyan") { Write-Host "[live] $m" -ForegroundColor $c }
function BoxId {
  $id = aws ec2 describe-instances @aws --filters "Name=tag:Name,Values=shopflow-stage1" `
    "Name=instance-state-name,Values=pending,running,stopping,stopped" `
    --query "Reservations[0].Instances[0].InstanceId" --output text
  if (-not $id -or $id -eq "None") { throw "Stage 1 box not found (backend repo: infra/terraform/stage1)" }
  return $id
}
function BoxState($id) {
  aws ec2 describe-instances --instance-ids $id @aws --query "Reservations[0].Instances[0].State.Name" --output text
}
function SsmValue($name) {
  aws ssm get-parameter --name "/shopflow/prod/$name" --with-decryption @aws --query Parameter.Value --output text
}
function Domain { "https://$(SsmValue DUCKDNS_SUBDOMAIN).duckdns.org" }
function ShopUp($url) {
  try { Invoke-WebRequest "$url/mfe-manifest.json" -UseBasicParsing -TimeoutSec 10 | Out-Null; return $true } catch { return $false }
}
function ApiUp($url) {
  try { return (Invoke-RestMethod "$url/health/ready" -TimeoutSec 10).status -eq "ok" } catch { return $false }
}

switch ($Action) {
  "status" {
    $id = BoxId; $state = BoxState $id; $url = Domain
    Say "box $id : $state"
    Say "url $url"
    $tag = SsmValue WEB_IMAGE_TAG
    if ($tag -and $tag -ne "none") { $tag = $tag.Substring(0, [Math]::Min(7, $tag.Length)) }
    Say "web version (frontend commit): $tag"
    if ($state -eq "running") {
      if (ShopUp $url) { Say "shop: UP" "Green" } else { Say "shop: DOWN" "Yellow" }
      if (ApiUp $url) { Say "API:  UP" "Green" } else { Say "API:  DOWN" "Yellow" }
    }
  }
  "start" {
    $id = BoxId; $url = Domain
    if ((BoxState $id) -ne "running") {
      aws ec2 start-instances --instance-ids $id @aws | Out-Null
      Say "starting $id ..."
      aws ec2 wait instance-running --instance-ids $id @aws
      Say "box running (new public IP; DuckDNS follows in ~1 min, containers start by themselves)"
    } else { Say "box already running" }
    Say "waiting for the shop and the API (up to 8 min)..."
    $deadline = (Get-Date).AddMinutes(8)
    while ((Get-Date) -lt $deadline) {
      $shop = ShopUp $url; $api = ApiUp $url
      if ($shop -and $api) { Say "LIVE: $url" "Green"; return }
      Say "  shop: $(if ($shop) {'up'} else {'not yet'})  API: $(if ($api) {'up'} else {'not yet'})  $(Get-Date -Format T)"
      Start-Sleep 20
    }
    Say "not up after 8 min. Shell on the box: aws ssm start-session --target $id --region $Region --profile $Profile" "Yellow"
  }
  "stop" {
    $id = BoxId
    aws ec2 stop-instances --instance-ids $id @aws | Out-Null
    Say "stopping $id (data, certificates and the DNS name are kept). Start again: .\scripts\live.ps1 start" "Green"
  }
  "open" { Start-Process (Domain) }
}
