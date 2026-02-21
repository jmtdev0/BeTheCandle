# Re-encode stock videos to broadly compatible web MP4 (H.264 + AAC).
#
# Why:
# Some laptops/Brave setups fail with HEVC/H.265 clips and throw:
# "NotSupportedError: Failed to load because no supported source was found."
#
# Usage (from repo root):
#   powershell -ExecutionPolicy Bypass -File scripts/reencode-stock-videos-h264.ps1
#   powershell -ExecutionPolicy Bypass -File scripts/reencode-stock-videos-h264.ps1 -Force
#
# Optional args:
#   -InputDir  "public/I LOVE FREE 4K STOCK VIDEOS"
#   -OutputDir "public/I LOVE FREE 4K STOCK VIDEOS/compressed-h264"
#   -HandBrakePath "C:/path/to/HandBrakeCLI.exe"

param(
    [string]$InputDir = "public/I LOVE FREE 4K STOCK VIDEOS",
    [string]$OutputDir = "public/I LOVE FREE 4K STOCK VIDEOS/compressed-h264",
    [string]$HandBrakePath = "",
    [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Resolve-HandBrakeCli {
    param([string]$ExplicitPath)

    if ($ExplicitPath -and (Test-Path $ExplicitPath)) {
        return (Resolve-Path $ExplicitPath).Path
    }

    $cmd = Get-Command HandBrakeCLI -ErrorAction SilentlyContinue
    if ($cmd) {
        return $cmd.Source
    }

    $candidates = @(
        "C:\Users\jmart\AppData\Local\Microsoft\WinGet\Packages\HandBrake.HandBrake.CLI_Microsoft.Winget.Source_8wekyb3d8bbwe\HandBrakeCLI.exe",
        "C:\Program Files\HandBrakeCLI\HandBrakeCLI.exe",
        "C:\Program Files\HandBrake\HandBrakeCLI.exe"
    )

    foreach ($candidate in $candidates) {
        if (Test-Path $candidate) {
            return $candidate
        }
    }

    return $null
}

if (-not (Test-Path $InputDir)) {
    Write-Host "ERROR: Input directory not found: $InputDir" -ForegroundColor Red
    exit 1
}

$resolvedHandBrake = Resolve-HandBrakeCli -ExplicitPath $HandBrakePath
if (-not $resolvedHandBrake) {
    Write-Host "ERROR: HandBrakeCLI not found. Install it or pass -HandBrakePath." -ForegroundColor Red
    exit 1
}

New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

$files = Get-ChildItem -Path $InputDir -File | Where-Object {
    $_.Extension -match "^\.(mp4|mov)$"
}

if ($files.Count -eq 0) {
    Write-Host "No .mp4/.mov files found in $InputDir" -ForegroundColor Yellow
    exit 0
}

$processed = 0
$succeeded = 0
$failed = 0

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "H.264 Compatibility Re-encode" -ForegroundColor Cyan
Write-Host "Input:      $InputDir"
Write-Host "Output:     $OutputDir"
Write-Host "HandBrake:  $resolvedHandBrake"
Write-Host "Files:      $($files.Count)"
Write-Host "Force:      $($Force.IsPresent)"
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

foreach ($file in $files) {
    $processed++
    $outputName = [System.IO.Path]::GetFileNameWithoutExtension($file.Name) + ".mp4"
    $outputPath = Join-Path $OutputDir $outputName

    if ((-not $Force) -and (Test-Path $outputPath)) {
        Write-Host "[$processed/$($files.Count)] SKIP (exists): $($file.Name)" -ForegroundColor Yellow
        continue
    }

    Write-Host "[$processed/$($files.Count)] Encoding: $($file.Name)" -ForegroundColor Cyan

    $args = @(
        "--input", $file.FullName,
        "--output", $outputPath,
        "--encoder", "x264",
        "--encoder-profile", "high",
        "--encoder-level", "4.1",
        "--encoder-preset", "slow",
        "--quality", "24",
        "--maxWidth", "1920",
        "--maxHeight", "1080",
        "--keep-display-aspect",
        "--cfr",
        "--aencoder", "av_aac",
        "--ab", "128",
        "--format", "av_mp4",
        "--optimize"
    )

    & $resolvedHandBrake @args
    if ($LASTEXITCODE -ne 0) {
        $failed++
        Write-Host "  FAILED: $($file.Name)" -ForegroundColor Red
        continue
    }

    if (-not (Test-Path $outputPath)) {
        $failed++
        Write-Host "  FAILED: output not found for $($file.Name)" -ForegroundColor Red
        continue
    }

    $succeeded++
    $inputSizeMB = [math]::Round($file.Length / 1MB, 2)
    $outputFile = Get-Item $outputPath
    $outputSizeMB = [math]::Round($outputFile.Length / 1MB, 2)
    $reduction = if ($file.Length -gt 0) {
        [math]::Round((1 - ($outputFile.Length / $file.Length)) * 100, 1)
    } else {
        0
    }
    Write-Host "  OK: ${inputSizeMB}MB -> ${outputSizeMB}MB (${reduction}% reduction)" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Done"
Write-Host "Succeeded: $succeeded"
Write-Host "Failed:    $failed"
Write-Host "========================================" -ForegroundColor Cyan
