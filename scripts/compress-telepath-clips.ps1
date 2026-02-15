# Compress Telepath video clips using HandBrakeCLI
# Preserves original framerate (critical for 60fps slow-mo clips)
# Outputs web-optimized MP4 files at max 720p
#
# Usage: powershell -ExecutionPolicy Bypass -File scripts/compress-telepath-clips.ps1

$InputDir = "public/telepath-clips"
$OutputDir = "public/telepath-clips-compressed"

if (-not (Test-Path $InputDir)) {
    Write-Host "ERROR: Input directory '$InputDir' not found. Run download script first." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

$clips = Get-ChildItem -Path $InputDir -Filter "*.mp4"
$total = $clips.Count
$current = 0

Write-Host "Found $total clips to compress" -ForegroundColor Cyan
Write-Host ""

foreach ($clip in $clips) {
    $current++
    $inputPath = $clip.FullName
    $outputPath = Join-Path $OutputDir $clip.Name

    if (Test-Path $outputPath) {
        Write-Host "[$current/$total] SKIP (already exists): $($clip.Name)" -ForegroundColor Yellow
        continue
    }

    Write-Host "[$current/$total] Compressing: $($clip.Name)" -ForegroundColor Cyan

    # HandBrakeCLI parameters:
    # --encoder x264        : H.264 codec (max browser compatibility)
    # --quality 26          : RF 26 (good compression for background video)
    # --aencoder av_aac     : AAC audio
    # --ab 96               : 96kbps audio (low, fine for background)
    # --maxHeight 720       : Scale to max 720p height
    # --maxWidth 1280       : Scale to max 720p width
    # --keep-display-aspect : Preserve aspect ratio
    # --cfr                 : Constant frame rate
    # --optimize            : Web optimization (faststart / moov atom at front)
    # --format av_mp4       : MP4 container
    # No --rate flag        : Preserves original framerate (important for 60fps clips)

    HandBrakeCLI `
        --input $inputPath `
        --output $outputPath `
        --encoder x264 `
        --quality 26 `
        --encoder-preset slow `
        --aencoder av_aac `
        --ab 96 `
        --maxHeight 720 `
        --maxWidth 1280 `
        --keep-display-aspect `
        --optimize `
        --format av_mp4

    if ($LASTEXITCODE -ne 0) {
        Write-Host "  FAILED: $($clip.Name)" -ForegroundColor Red
    } else {
        $inputSize = [math]::Round($clip.Length / 1MB, 2)
        $outputFile = Get-Item $outputPath
        $outputSize = [math]::Round($outputFile.Length / 1MB, 2)
        $reduction = [math]::Round((1 - $outputFile.Length / $clip.Length) * 100, 1)
        Write-Host "  OK: ${inputSize}MB -> ${outputSize}MB (${reduction}% reduction)" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Compression complete!" -ForegroundColor Green
Write-Host "Compressed clips saved to: $OutputDir" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

# Summary
$totalInputSize = ($clips | Measure-Object -Property Length -Sum).Sum / 1MB
$compressedClips = Get-ChildItem -Path $OutputDir -Filter "*.mp4"
$totalOutputSize = ($compressedClips | Measure-Object -Property Length -Sum).Sum / 1MB
Write-Host "Total input:  $([math]::Round($totalInputSize, 1)) MB"
Write-Host "Total output: $([math]::Round($totalOutputSize, 1)) MB"
Write-Host "Overall reduction: $([math]::Round((1 - $totalOutputSize / $totalInputSize) * 100, 1))%"
