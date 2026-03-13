# PUSH_AAN.ps1
# Pushes AAN site files to GitHub → triggers Vercel auto-deploy
# Place this file in: C:\Users\kmplu\Cowork\AAN\

$GITHUB_TOKEN = $env:GITHUB_TOKEN"
$REPO         = "anchoradvisorsnorth/aanclaude"
$BRANCH       = "main"

$headers = @{
    Authorization = "Bearer $GITHUB_TOKEN"
    Accept        = "application/vnd.github+json"
}

function Push-File($localPath, $repoPath) {
    $content = [Convert]::ToBase64String([IO.File]::ReadAllBytes($localPath))
    $apiUrl  = "https://api.github.com/repos/$REPO/contents/$repoPath"

    # Get current SHA if file exists
    $sha = $null
    try {
        $existing = Invoke-RestMethod -Uri $apiUrl -Headers $headers -Method Get
        $sha = $existing.sha
    } catch {}

    $body = @{
        message = "deploy: update $repoPath"
        content = $content
        branch  = $BRANCH
    }
    if ($sha) { $body.sha = $sha }

    Invoke-RestMethod -Uri $apiUrl -Headers $headers -Method Put `
        -Body ($body | ConvertTo-Json) -ContentType "application/json" | Out-Null

    Write-Host "  pushed: $repoPath"
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ""
Write-Host "Pushing AAN files to GitHub..."
Write-Host ""

Push-File "$scriptDir\index.html"                          "index.html"
Push-File "$scriptDir\about.html"                          "about.html"
Push-File "$scriptDir\how-it-works.html"                   "how-it-works.html"
Push-File "$scriptDir\inquire.html"                        "inquire.html"
Push-File "$scriptDir\who-we-serve.html"                   "who-we-serve.html"
Push-File "$scriptDir\shared.css"                          "shared.css"
Push-File "$scriptDir\api\claude.js"                       "api/claude.js"
Push-File "$scriptDir\api\log.js"                          "api/log.js"
Push-File "$scriptDir\tracker\index.html"                  "tracker/index.html"

Write-Host ""
Write-Host "Done. Vercel will redeploy in ~60 seconds."
Write-Host "Site: https://aanclaude.vercel.app"
Write-Host "Tracker: https://aanclaude.vercel.app/tracker"
Write-Host ""
