$ErrorActionPreference = "Stop"

$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$outputRoot = [IO.Path]::GetFullPath((Join-Path $repoRoot "dist\kongregate"))
$gameDir = [IO.Path]::GetFullPath((Join-Path $outputRoot "game"))
$submissionDir = [IO.Path]::GetFullPath((Join-Path $outputRoot "submission"))
$zipPath = [IO.Path]::GetFullPath((Join-Path $outputRoot "cauldron-rumble-kongregate-assets.zip"))
$uploadIndexPath = [IO.Path]::GetFullPath((Join-Path $outputRoot "index.html"))
$outDir = [IO.Path]::GetFullPath((Join-Path $repoRoot "out"))
$platformDir = [IO.Path]::GetFullPath((Join-Path $repoRoot "platforms\kongregate"))
$repoPrefix = $repoRoot.TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar

if (-not $outputRoot.StartsWith($repoPrefix, [StringComparison]::OrdinalIgnoreCase)) {
  throw "Refusing to manage an output path outside the repository: $outputRoot"
}

if (Test-Path -LiteralPath $outputRoot) {
  Remove-Item -LiteralPath $outputRoot -Recurse -Force
}
New-Item -ItemType Directory -Path $gameDir -Force | Out-Null
New-Item -ItemType Directory -Path $submissionDir -Force | Out-Null

Push-Location $repoRoot
try {
  $env:KONGREGATE_BUILD = "true"
  $env:STATIC_EXPORT = "true"
  & npm.cmd run build:pages
  if ($LASTEXITCODE -ne 0) {
    throw "The Kongregate static build failed with exit code $LASTEXITCODE."
  }
}
finally {
  Remove-Item Env:KONGREGATE_BUILD -ErrorAction SilentlyContinue
  Remove-Item Env:STATIC_EXPORT -ErrorAction SilentlyContinue
  Pop-Location
}

if (-not (Test-Path -LiteralPath (Join-Path $outDir "index.html"))) {
  throw "The static export did not create out\index.html."
}

Get-ChildItem -LiteralPath $outDir -Force | Copy-Item -Destination $gameDir -Recurse -Force

foreach ($relativePath in @(
  "404.html",
  "_not-found.html",
  "_not-found.txt",
  "_not-found",
  "og.png",
  ".nojekyll",
  "animationsprobe",
  "animationsprobe.html",
  "animationsprobe.txt",
  "arenaprobe",
  "arenaprobe.html",
  "arenaprobe.txt"
)) {
  $target = [IO.Path]::GetFullPath((Join-Path $gameDir $relativePath))
  $gamePrefix = $gameDir.TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
  if (-not $target.StartsWith($gamePrefix, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to remove an unexpected package path: $target"
  }
  if (Test-Path -LiteralPath $target) {
    Remove-Item -LiteralPath $target -Recurse -Force
  }
}

# These source assets support local animation studies, not the released game.
Get-ChildItem -LiteralPath (Join-Path $gameDir "assets\animation") -File -Filter "spectator-*" | Remove-Item -Force
foreach ($name in @("tournament-arena-clean-v1.webp", "tournament-arena-motion-v1.webp")) {
  Remove-Item -LiteralPath (Join-Path $gameDir "assets\backgrounds\$name") -Force
}

Copy-Item -LiteralPath (Join-Path $platformDir "CREDITS.txt") -Destination (Join-Path $gameDir "CREDITS.txt") -Force

$indexPath = Join-Path $gameDir "index.html"
$indexContent = Get-Content -LiteralPath $indexPath -Raw
if ($indexContent -notmatch "Cauldron Rumble") {
  throw "index.html does not contain the English game title."
}
if ($indexContent -notmatch '<html\b[^>]*\blang="en"') {
  throw "index.html does not declare English as its initial language."
}
if ($indexContent -match '(?i)(?:src|href)=["'']/((?!/)[^"'']*)') {
  throw "index.html contains a root-relative resource reference: $($Matches[0])"
}

$resourceViolations = @()
Get-ChildItem -LiteralPath $gameDir -File -Recurse | ForEach-Object {
  if ($_.Extension -eq ".html") {
    $content = Get-Content -LiteralPath $_.FullName -Raw
    if ($content -match '(?i)(?:src|href)=["'']/((?!/)[^"'']*)') {
      $resourceViolations += "$($_.FullName.Substring($gameDir.Length + 1)): $($Matches[0])"
    }
  }
  elseif ($_.Extension -eq ".css") {
    $content = Get-Content -LiteralPath $_.FullName -Raw
    if ($content -match '(?i)url\(["'']?/((?!/)[^)]+)') {
      $resourceViolations += "$($_.FullName.Substring($gameDir.Length + 1)): $($Matches[0])"
    }
  }
}
if ($resourceViolations.Count -gt 0) {
  throw "Root-relative resource references found: $($resourceViolations -join ', ')"
}

$files = @(Get-ChildItem -LiteralPath $gameDir -File -Recurse)
$fileCount = $files.Count
$totalBytes = ($files | Measure-Object -Property Length -Sum).Sum
$maxUploadBytes = 1GB

if ($totalBytes -gt $maxUploadBytes) {
  throw "Package is $totalBytes bytes; Kongregate permits at most 1 GB."
}

Copy-Item -LiteralPath $indexPath -Destination $uploadIndexPath -Force
$additionalFiles = @(Get-ChildItem -LiteralPath $gameDir -Force | Where-Object Name -ne "index.html" | ForEach-Object FullName)
Compress-Archive -Path $additionalFiles -DestinationPath $zipPath -CompressionLevel Optimal

Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [IO.Compression.ZipFile]::OpenRead($zipPath)
try {
  $entryNames = @($archive.Entries | ForEach-Object FullName)
  if ($entryNames -contains "index.html") {
    throw "The additional-files ZIP must not contain the separately uploaded index.html."
  }
  if ($entryNames | Where-Object { $_ -match '^game/' }) {
    throw "The ZIP incorrectly contains a game/ wrapper directory."
  }
  if ($entryNames | Where-Object { $_.Contains('\') }) {
    throw "The ZIP must use portable forward-slash paths."
  }
  $entryByName = @{}
  foreach ($entry in $archive.Entries) { $entryByName[$entry.FullName] = $entry }
  foreach ($file in $files) {
    if ($file.FullName -eq $indexPath) { continue }
    $relativeName = $file.FullName.Substring($gameDir.Length + 1).Replace('\', '/')
    if (-not $entryByName.ContainsKey($relativeName) -or $entryByName[$relativeName].Length -ne $file.Length) {
      throw "The additional-files ZIP is missing or has truncated: $relativeName"
    }
  }
}
finally {
  $archive.Dispose()
}

Copy-Item -LiteralPath (Join-Path $platformDir "submission-en.md") -Destination $submissionDir -Force
Copy-Item -LiteralPath (Join-Path $platformDir "UPLOAD-CHECKLIST.md") -Destination $submissionDir -Force
Copy-Item -LiteralPath (Join-Path $platformDir "CREDITS.txt") -Destination $submissionDir -Force

$mediaDir = Join-Path $platformDir "media"
if (Test-Path -LiteralPath $mediaDir) {
  Get-ChildItem -LiteralPath $mediaDir -Force | Copy-Item -Destination $submissionDir -Recurse -Force
}

$unpackedMiB = [Math]::Round($totalBytes / 1MB, 2)
$zipMiB = [Math]::Round((Get-Item -LiteralPath $zipPath).Length / 1MB, 2)
$sha256Algorithm = [Security.Cryptography.SHA256]::Create()
try {
  $zipStream = [IO.File]::OpenRead($zipPath)
  try {
    $sha256 = [BitConverter]::ToString(
      $sha256Algorithm.ComputeHash($zipStream)
    ).Replace("-", "")
  }
  finally {
    $zipStream.Dispose()
  }
}
finally {
  $sha256Algorithm.Dispose()
}

Write-Host ""
Write-Host "Kongregate package verified successfully."
Write-Host "Files:        $fileCount"
Write-Host "Unpacked:     $unpackedMiB MiB / 1024 MiB"
Write-Host "ZIP size:     $zipMiB MiB"
Write-Host "SHA-256:      $sha256"
Write-Host "Game file:    $uploadIndexPath"
Write-Host "Extra files:  $zipPath"
Write-Host "Portal files: $submissionDir"
Write-Host "Local game:   $gameDir"
