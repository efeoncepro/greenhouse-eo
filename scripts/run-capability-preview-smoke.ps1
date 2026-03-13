param(
  [switch]$SkipScreenshots
)

$ErrorActionPreference = 'Stop'

$workdir = Split-Path -Parent $PSScriptRoot
Set-Location $workdir
$envLocalPath = Join-Path $workdir '.env.local'
$envLocalBackupPath = Join-Path $env:TEMP 'gh-capability-smoke\\.env.local.backup'
$smokeSucceeded = $false

if (Test-Path $envLocalPath) {
  Copy-Item $envLocalPath $envLocalBackupPath -Force
}

Copy-Item '.env.production.local' $envLocalPath -Force

Get-Content '.env.production.local' | ForEach-Object {
  if ($_ -match '^[ ]*#' -or $_ -match '^[ ]*$') {
    return
  }

  $parts = $_ -split '=', 2

  if ($parts.Length -eq 2) {
    $rawValue = $parts[1].Trim()
    $normalizedValue = if ($rawValue.StartsWith('"') -and $rawValue.EndsWith('"')) {
      $rawValue.Substring(1, $rawValue.Length - 2)
    }
    else {
      $rawValue
    }

    [System.Environment]::SetEnvironmentVariable($parts[0].Trim(), $normalizedValue, 'Process')
  }
}

$tempDir = Join-Path $env:TEMP 'gh-capability-smoke'
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null
$runId = Get-Date -Format 'yyyyMMddHHmmss'
$smokeDistDir = ".next-local/smoke-$runId"
[System.IO.Directory]::CreateDirectory((Join-Path $workdir $smokeDistDir)) | Out-Null
[System.Environment]::SetEnvironmentVariable('NEXT_DIST_DIR', $smokeDistDir, 'Process')

$stdout = Join-Path $tempDir 'next-stdout.log'
$stderr = Join-Path $tempDir 'next-stderr.log'
$storage = Join-Path $tempDir 'storage.json'
$dashShot = Join-Path $tempDir 'dashboard.png'
$capShot = Join-Path $tempDir 'creative-hub.png'
$dashHtml = Join-Path $tempDir 'dashboard-response.html'
$capHtml = Join-Path $tempDir 'creative-hub-response.html'
$mintJwtScript = Join-Path $PSScriptRoot 'mint-local-admin-jwt.js'
$requestTimeoutSec = 180

$serverCommand = "Set-Location '$workdir'; `$env:NEXT_DIST_DIR='$smokeDistDir'; npx next dev --webpack --port 3100"
$proc = Start-Process -FilePath 'powershell' -ArgumentList '-NoProfile', '-Command', $serverCommand -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru

try {
  $ready = $false

  for ($i = 0; $i -lt 90; $i++) {
    try {
      $response = Invoke-WebRequest -Uri 'http://127.0.0.1:3100/login' -UseBasicParsing -TimeoutSec 5

      if ($response.StatusCode -eq 200) {
        $ready = $true
        break
      }
    } catch {
      Start-Sleep -Seconds 2
    }
  }

  if (-not $ready) {
    throw 'Next dev server did not become ready on port 3100.'
  }

  $jwt = node $mintJwtScript
  $jwt = $jwt.Trim()

  if (-not $jwt) {
    throw 'Unable to mint JWT.'
  }

  $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  $cookie = New-Object System.Net.Cookie
  $cookie.Name = 'next-auth.session-token'
  $cookie.Value = $jwt
  $cookie.Domain = '127.0.0.1'
  $cookie.Path = '/'
  $cookie.HttpOnly = $true
  $session.Cookies.Add($cookie)

  $dashboardUrl = 'http://127.0.0.1:3100/admin/tenants/space-efeonce/view-as/dashboard'
  $capabilityUrl = 'http://127.0.0.1:3100/admin/tenants/space-efeonce/capability-preview/creative-hub'

  $dashResponse = Invoke-WebRequest -Uri $dashboardUrl -WebSession $session -UseBasicParsing -TimeoutSec $requestTimeoutSec
  $capResponse = Invoke-WebRequest -Uri $capabilityUrl -WebSession $session -UseBasicParsing -TimeoutSec $requestTimeoutSec
  Set-Content -Path $dashHtml -Value $dashResponse.Content
  Set-Content -Path $capHtml -Value $capResponse.Content

  if ($dashResponse.StatusCode -ne 200 -or $dashResponse.Content -notmatch 'Ver como cliente') {
    throw "Dashboard preview failed. Saved response to $dashHtml"
  }

  if ($capResponse.StatusCode -ne 200 -or $capResponse.Content -notmatch 'Creative Hub') {
    throw "Capability preview failed. Saved response to $capHtml"
  }

  $result = [ordered]@{
    dashboardHttpOk = $true
    capabilityHttpOk = $true
    screenshotsSkipped = [bool]$SkipScreenshots
    dashboardPreview = $false
    capabilityPreview = $false
    dashboardBytes = 0
    capabilityBytes = 0
    dashboardUrl = $dashboardUrl
    capabilityUrl = $capabilityUrl
  }

  if (-not $SkipScreenshots) {
    @{
      cookies = @(
        @{
          name = 'next-auth.session-token'
          value = $jwt
          domain = '127.0.0.1'
          path = '/'
          expires = -1
          httpOnly = $true
          secure = $false
          sameSite = 'Lax'
        }
      )
      origins = @()
    } | ConvertTo-Json -Depth 5 | Set-Content -Path $storage

    npx playwright screenshot --browser chromium --full-page --timeout 120000 --wait-for-timeout 8000 --load-storage $storage $dashboardUrl $dashShot | Out-Null
    npx playwright screenshot --browser chromium --full-page --timeout 120000 --wait-for-timeout 8000 --load-storage $storage $capabilityUrl $capShot | Out-Null

    $result.dashboardPreview = Test-Path $dashShot
    $result.capabilityPreview = Test-Path $capShot
    $result.dashboardBytes = if (Test-Path $dashShot) { (Get-Item $dashShot).Length } else { 0 }
    $result.capabilityBytes = if (Test-Path $capShot) { (Get-Item $capShot).Length } else { 0 }
  }

  $result | ConvertTo-Json -Depth 5

  $smokeSucceeded = $true
}
finally {
  if ($proc -and -not $proc.HasExited) {
    taskkill /PID $proc.Id /T /F | Out-Null
  }

  if (Test-Path $envLocalBackupPath) {
    Copy-Item $envLocalBackupPath $envLocalPath -Force
    Remove-Item $envLocalBackupPath -ErrorAction SilentlyContinue
  }

  if ($smokeSucceeded) {
    Remove-Item $storage, $dashShot, $capShot, $dashHtml, $capHtml -ErrorAction SilentlyContinue
  }
}
