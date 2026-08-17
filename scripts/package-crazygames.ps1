$ErrorActionPreference = "Stop"

$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$outputRoot = [IO.Path]::GetFullPath((Join-Path $repoRoot "dist\crazygames"))
$gameDir = [IO.Path]::GetFullPath((Join-Path $outputRoot "game"))
$zipPath = [IO.Path]::GetFullPath((Join-Path $outputRoot "cauldron-rumble-crazygames-basic.zip"))
$outDir = [IO.Path]::GetFullPath((Join-Path $repoRoot "out"))
$repoPrefix = $repoRoot.TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar

if (-not $outputRoot.StartsWith($repoPrefix, [StringComparison]::OrdinalIgnoreCase)) {
  throw "Refusing to manage an output path outside the repository: $outputRoot"
}

if (Test-Path -LiteralPath $outputRoot) {
  Remove-Item -LiteralPath $outputRoot -Recurse -Force
}
New-Item -ItemType Directory -Path $gameDir -Force | Out-Null

Push-Location $repoRoot
try {
  $env:CRAZYGAMES_BUILD = "true"
  $env:STATIC_EXPORT = "true"
  & npm.cmd run build:pages
  if ($LASTEXITCODE -ne 0) {
    throw "The CrazyGames static build failed with exit code $LASTEXITCODE."
  }
}
finally {
  Remove-Item Env:CRAZYGAMES_BUILD -ErrorAction SilentlyContinue
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
  ".nojekyll"
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

Copy-Item -LiteralPath (Join-Path $repoRoot "platforms\crazygames\CREDITS.txt") -Destination (Join-Path $gameDir "CREDITS.txt") -Force

$indexPath = Join-Path $gameDir "index.html"
$indexContent = Get-Content -LiteralPath $indexPath -Raw
if ($indexContent -notmatch "Cauldron Rumble") {
  throw "index.html does not contain the CrazyGames title."
}
if ($indexContent -match '(?i)(?:src|href)=["'']/((?!/)[^"'']*)') {
  throw "index.html contains a root-relative resource reference: $($Matches[0])"
}

$resourceViolations = @()
Get-ChildItem -LiteralPath $gameDir -File -Recurse | ForEach-Object {
  $content = $null
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
$maxFiles = 1500
$mobileHomeLimitBytes = 20 * 1024 * 1024

if ($fileCount -gt $maxFiles) {
  throw "Package has $fileCount files; CrazyGames permits at most $maxFiles."
}
if ($totalBytes -gt $mobileHomeLimitBytes) {
  throw "Package is $totalBytes bytes; the 20 MiB mobile-home initial-download target is exceeded."
}

if (Test-Path -LiteralPath $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}
Compress-Archive -Path (Join-Path $gameDir "*") -DestinationPath $zipPath -CompressionLevel Optimal

Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [IO.Compression.ZipFile]::OpenRead($zipPath)
try {
  $entryNames = @($archive.Entries | ForEach-Object FullName)
  if ($entryNames -notcontains "index.html") {
    throw "The ZIP does not contain index.html at its root."
  }
  if ($entryNames | Where-Object { $_ -match '^game/' }) {
    throw "The ZIP incorrectly contains a game/ wrapper directory."
  }
}
finally {
  $archive.Dispose()
}

$unpackedMiB = [Math]::Round($totalBytes / 1MB, 2)
$zipMiB = [Math]::Round((Get-Item -LiteralPath $zipPath).Length / 1MB, 2)

Write-Host ""
Write-Host "CrazyGames package verified successfully."
Write-Host "Files:        $fileCount / $maxFiles"
Write-Host "Unpacked:     $unpackedMiB MiB / 20 MiB mobile-home target"
Write-Host "ZIP size:     $zipMiB MiB"
Write-Host "Upload ZIP:   $zipPath"
Write-Host "Local game:   $gameDir"
