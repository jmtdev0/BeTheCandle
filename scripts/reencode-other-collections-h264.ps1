# Re-encode remaining Video Gallery collections to broadly compatible web MP4.
#
# Targets:
# - telepath (from public/telepath-clips)
# - anerzmi  (from public/anerzmi-clips/SoloClips)
#
# Output folders:
# - public/telepath-clips-compressed-h264
# - public/anerzmi-clips-compressed-h264
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts/reencode-other-collections-h264.ps1
#   powershell -ExecutionPolicy Bypass -File scripts/reencode-other-collections-h264.ps1 -Collections telepath
#   powershell -ExecutionPolicy Bypass -File scripts/reencode-other-collections-h264.ps1 -Force

param(
    [string[]]$Collections = @("telepath", "anerzmi"),
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

function Encode-Collection {
    param(
        [string]$Name,
        [string]$InputDir,
        [string]$OutputDir,
        [string]$HandBrakeCli,
        [bool]$Overwrite
    )

    if (-not (Test-Path $InputDir)) {
        Write-Host "[$Name] SKIP: Input directory not found: $InputDir" -ForegroundColor Yellow
        return [pscustomobject]@{ name = $Name; processed = 0; ok = 0; failed = 0; skipped = 0 }
    }

    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

    $files = Get-ChildItem -Path $InputDir -File | Where-Object {
        $_.Extension -match "^\.(mp4|mov)$"
    }

    if ($files.Count -eq 0) {
        Write-Host "[$Name] SKIP: No .mp4/.mov files in $InputDir" -ForegroundColor Yellow
        return [pscustomobject]@{ name = $Name; processed = 0; ok = 0; failed = 0; skipped = 0 }
    }

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Collection: $Name" -ForegroundColor Cyan
    Write-Host "Input:      $InputDir"
    Write-Host "Output:     $OutputDir"
    Write-Host "Files:      $($files.Count)"
    Write-Host "========================================" -ForegroundColor Cyan

    $processed = 0
    $ok = 0
    $failed = 0
    $skipped = 0

    foreach ($file in $files) {
        $processed++
        $outputName = [System.IO.Path]::GetFileNameWithoutExtension($file.Name) + ".mp4"
        $outputPath = Join-Path $OutputDir $outputName

        if ((-not $Overwrite) -and (Test-Path $outputPath)) {
            $skipped++
            Write-Host "[$Name][$processed/$($files.Count)] SKIP (exists): $($file.Name)" -ForegroundColor Yellow
            continue
        }

        Write-Host "[$Name][$processed/$($files.Count)] Encoding: $($file.Name)" -ForegroundColor Cyan

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

        & $HandBrakeCli @args
        if ($LASTEXITCODE -ne 0) {
            $failed++
            Write-Host "  FAILED: $($file.Name)" -ForegroundColor Red
            continue
        }

        if (-not (Test-Path $outputPath)) {
            $failed++
            Write-Host "  FAILED: output missing for $($file.Name)" -ForegroundColor Red
            continue
        }

        $ok++
        $inMB = [math]::Round($file.Length / 1MB, 2)
        $outFile = Get-Item $outputPath
        $outMB = [math]::Round($outFile.Length / 1MB, 2)
        $reduction = if ($file.Length -gt 0) {
            [math]::Round((1 - ($outFile.Length / $file.Length)) * 100, 1)
        } else {
            0
        }
        Write-Host "  OK: ${inMB}MB -> ${outMB}MB (${reduction}% reduction)" -ForegroundColor Green
    }

    return [pscustomobject]@{
        name = $Name
        processed = $processed
        ok = $ok
        failed = $failed
        skipped = $skipped
    }
}

$resolvedHandBrake = Resolve-HandBrakeCli -ExplicitPath $HandBrakePath
if (-not $resolvedHandBrake) {
    Write-Host "ERROR: HandBrakeCLI not found. Install it or pass -HandBrakePath." -ForegroundColor Red
    exit 1
}

$valid = @("telepath", "anerzmi")
$selected = @()
foreach ($item in $Collections) {
    $lower = $item.ToLowerInvariant()
    if ($lower -eq "all") {
        $selected = $valid
        break
    }
    if ($valid -contains $lower) {
        $selected += $lower
    } else {
        Write-Host "WARN: Unknown collection '$item'. Valid: telepath, anerzmi, all" -ForegroundColor Yellow
    }
}

$selected = $selected | Select-Object -Unique
if ($selected.Count -eq 0) {
    Write-Host "Nothing to do. Choose at least one collection." -ForegroundColor Yellow
    exit 0
}

$collectionMap = @{
    telepath = @{
        InputDir = "public/telepath-clips"
        OutputDir = "public/telepath-clips-compressed-h264"
    }
    anerzmi = @{
        InputDir = "public/anerzmi-clips/SoloClips"
        OutputDir = "public/anerzmi-clips-compressed-h264"
    }
}

Write-Host "HandBrake: $resolvedHandBrake"
Write-Host "Selected collections: $($selected -join ', ')"
Write-Host "Overwrite existing: $($Force.IsPresent)"

$results = @()
foreach ($name in $selected) {
    $cfg = $collectionMap[$name]
    $results += Encode-Collection `
        -Name $name `
        -InputDir $cfg.InputDir `
        -OutputDir $cfg.OutputDir `
        -HandBrakeCli $resolvedHandBrake `
        -Overwrite $Force.IsPresent
}

$totalProcessed = ($results | Measure-Object -Property processed -Sum).Sum
$totalOk = ($results | Measure-Object -Property ok -Sum).Sum
$totalFailed = ($results | Measure-Object -Property failed -Sum).Sum
$totalSkipped = ($results | Measure-Object -Property skipped -Sum).Sum

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Finished"
Write-Host "Processed: $totalProcessed"
Write-Host "OK:        $totalOk"
Write-Host "Failed:    $totalFailed"
Write-Host "Skipped:   $totalSkipped"
Write-Host "========================================" -ForegroundColor Cyan
