$ErrorActionPreference = "Stop"

function Kill-Port3000 {
    $conns = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
    if ($conns) {
        $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($p in $pids) {
            try { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue } catch {}
        }
        Start-Sleep -Seconds 2
    }
}

Kill-Port3000

# Part 1: Normal Production Build
Write-Output "Starting normal production build..."
Remove-Item env:NEXT_PUBLIC_BIYOO_TEST -ErrorAction SilentlyContinue
& npm.cmd run build
if ($LASTEXITCODE -ne 0) { throw "Build failed" }

Write-Output "Starting normal production server on port 3000..."
$proc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npx.cmd next start -p 3000" -PassThru -NoNewWindow
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 1
    try {
        $resp = Invoke-WebRequest -Uri "http://localhost:3000/robots.txt" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($resp.StatusCode -eq 200) { $ready = $true; break }
    } catch {}
}
if (!$ready) {
    Kill-Port3000
    throw "Server failed to start on port 3000"
}

Write-Output "Querying HTTP statuses for normal production..."
$statusLines = [System.Collections.Generic.List[string]]::new()
$statusLines.Add("--- Normal Production Build (NEXT_PUBLIC_BIYOO_TEST unset) ---")
$routes = @("/", "/biyoo-test", "/dev/mode", "/style-test", "/skip", "/robots.txt")
foreach ($r in $routes) {
    $out = python scripts/check_http.py $r
    $statusLines.Add($out)
}

Write-Output "Verifying / on normal production with Playwright..."
$rootLines = python scripts/verify_prod_root.py

Kill-Port3000

# Part 2: Build with NEXT_PUBLIC_BIYOO_TEST=1
Write-Output "Building with NEXT_PUBLIC_BIYOO_TEST=1..."
$env:NEXT_PUBLIC_BIYOO_TEST = "1"
& npm.cmd run build
if ($LASTEXITCODE -ne 0) { throw "Build with NEXT_PUBLIC_BIYOO_TEST=1 failed" }

Write-Output "Starting server with NEXT_PUBLIC_BIYOO_TEST=1..."
$proc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npx.cmd next start -p 3000" -PassThru -NoNewWindow
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 1
    try {
        $resp = Invoke-WebRequest -Uri "http://localhost:3000/robots.txt" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($resp.StatusCode -eq 200) { $ready = $true; break }
    } catch {}
}
if (!$ready) {
    Kill-Port3000
    throw "Gated server failed to start on port 3000"
}

Write-Output "Querying HTTP statuses for gated routes under NEXT_PUBLIC_BIYOO_TEST=1..."
$statusLines.Add("")
$statusLines.Add("--- Gated Production Build (NEXT_PUBLIC_BIYOO_TEST=1) ---")
$gatedRoutes = @("/biyoo-test", "/dev/mode", "/style-test")
foreach ($r in $gatedRoutes) {
    $out = python scripts/check_http.py $r
    $statusLines.Add($out)
}

Kill-Port3000
Remove-Item env:NEXT_PUBLIC_BIYOO_TEST -ErrorAction SilentlyContinue

# Write outputs to files
$statusLines | Set-Content -Path logs/r18/03-http-status.txt -Encoding utf8
$rootLines | Set-Content -Path logs/r18/04-prod-root.txt -Encoding utf8

Write-Output "Rebuilding normal production build..."
& npm.cmd run build
if ($LASTEXITCODE -ne 0) { throw "Final normal production build failed" }
Write-Output "All builds and checks complete."
