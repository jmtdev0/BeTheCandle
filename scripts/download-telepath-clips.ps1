# Download Telepath video clips from YouTube using yt-dlp
# Requires: yt-dlp, ffmpeg (both must be in PATH)
#
# Usage: powershell -ExecutionPolicy Bypass -File scripts/download-telepath-clips.ps1

$OutputDir = "public/telepath-clips"
$FormatNormal = "bv*[height<=1080]+ba/b[height<=1080]"
$FormatHighFPS = "bv*[height<=1080][fps>=60]+ba/bv*[height<=1080]+ba/b[height<=1080]"

if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

function Download-Clip {
    param(
        [string]$VideoId,
        [string]$Start,
        [string]$End,
        [string]$OutputName,
        [string]$Format = $FormatNormal
    )

    $url = "https://www.youtube.com/watch?v=$VideoId"
    $section = "*${Start}-${End}"
    $output = "$OutputDir/$OutputName.%(ext)s"

    Write-Host "Downloading: $OutputName ($Start - $End)" -ForegroundColor Cyan

    yt-dlp `
        --download-sections $section `
        -f $Format `
        --merge-output-format mp4 `
        --force-keyframes-at-cuts `
        -o $output `
        --no-playlist `
        $url

    if ($LASTEXITCODE -ne 0) {
        Write-Host "  FAILED: $OutputName" -ForegroundColor Red
    } else {
        Write-Host "  OK: $OutputName" -ForegroundColor Green
    }
}

# ============================================================
# CLIP DEFINITIONS
# Format: VideoId, Start, End, OutputName, [Format override]
# ============================================================

# 1. "Phantom of the Raptor 8K" 0:30 - 0:41
Download-Clip -VideoId "JzUw4ZDOAl8" -Start "0:30" -End "0:41" -OutputName "phantom-raptor-8k_0m30s-0m41s"

# 2. Norrland 3:53 - 4:20
Download-Clip -VideoId "6AWGW2jFPKc" -Start "3:53" -End "4:20" -OutputName "norrland_3m53s-4m20s"

# 3. [Summer Vlog] June. July. Summer rain. Sweet berries fields. Forest dancing. 17:10 - 17:22
Download-Clip -VideoId "kveitTpYWZs" -Start "17:10" -End "17:22" -OutputName "summer-vlog_17m10s-17m22s"

# 4. WOLVES 8K Video Ultra HD 60FPS HDR 0:52 - 1:09
Download-Clip -VideoId "VZ_yglPWrzs" -Start "0:52" -End "1:09" -OutputName "wolves-8k_0m52s-1m09s"

# 5. WOLVES 8K Video Ultra HD 60FPS HDR 1:44 - 1:53
Download-Clip -VideoId "VZ_yglPWrzs" -Start "1:44" -End "1:53" -OutputName "wolves-8k_1m44s-1m53s"

# 6. Total Solar Eclipse @Western Australia 1:40 - 2:14 [Corte seco]
Download-Clip -VideoId "EuYBwbcDhQ0" -Start "1:40" -End "2:14" -OutputName "total-solar-eclipse_1m40s-2m14s"

# 7. Iris van Herpen ~ Carte Blanche 2:30 - 2:42
Download-Clip -VideoId "RSzVJGRwZi8" -Start "2:30" -End "2:42" -OutputName "iris-van-herpen_2m30s-2m42s"

# 8. AQUABALLET 4:20 - 4:43
Download-Clip -VideoId "P_UivO1kmRE" -Start "4:20" -End "4:43" -OutputName "aquaballet_4m20s-4m43s"

# 9. Synthetic Serenity III 1:26:54 - 1:27:15 [Sonido]
Download-Clip -VideoId "et8J6xpmuh4" -Start "1:26:54" -End "1:27:15" -OutputName "synthetic-serenity-iii_1h26m54s-1h27m15s"

# 10. Charlotte de Witte b2b Amelie Lens 18:00 - 18:30 [0.65x - needs 60fps]
Download-Clip -VideoId "zES6_jNyUnU" -Start "18:00" -End "18:30" -OutputName "charlotte-de-witte-amelie-lens_18m00s-18m30s" -Format $FormatHighFPS

# 11. Death Stranding | Cinematic Ambience | 4K 21:19 - 22:00 [Sonido]
Download-Clip -VideoId "7ZWSdWxHAzY" -Start "21:19" -End "22:00" -OutputName "death-stranding_21m19s-22m00s"

# 12. FIREFLIES IN KYOTO (4K) 00:04 - 00:28 [Sonido]
Download-Clip -VideoId "CiB4BdZCduE" -Start "0:04" -End "0:28" -OutputName "fireflies-kyoto_0m04s-0m28s"

# 13. Salar de Uyuni, Bolivia - Drone Video 0:10 to end
Download-Clip -VideoId "_cGAuU8Dwso" -Start "0:10" -End "inf" -OutputName "salar-de-uyuni_0m10s-end"

# 14. fireflies of the night: a dance of bioluminescence 00:46 - 01:01
Download-Clip -VideoId "YdGmfh_jMEw" -Start "0:46" -End "1:01" -OutputName "fireflies-bioluminescence_0m46s-1m01s"

# 15. Yayoi Kusama Infinity Mirrors 4K | A7SIII 00:38 - 01:00
Download-Clip -VideoId "-7mTJVyTR-w" -Start "0:38" -End "1:00" -OutputName "yayoi-kusama_0m38s-1m00s"

# 16. Colour 0:19 - 0:35
Download-Clip -VideoId "VvjbxGij4UY" -Start "0:19" -End "0:35" -OutputName "colour_0m19s-0m35s"

# 17. Best Air to Air Video On Youtube? - full download for random clip extraction
Write-Host "`nDownloading full 'Best Air to Air' video for random clip extraction..." -ForegroundColor Yellow
$airToAirPath = "$OutputDir/air-to-air-full.mp4"
yt-dlp `
    -f $FormatNormal `
    --merge-output-format mp4 `
    -o "$OutputDir/air-to-air-full.%(ext)s" `
    --no-playlist `
    "https://www.youtube.com/watch?v=HIVLrTSNP6s"

if (Test-Path $airToAirPath) {
    # Get duration using ffmpeg
    $durationOutput = & ffmpeg -i $airToAirPath 2>&1 | Select-String "Duration"
    if ($durationOutput -match "Duration: (\d+):(\d+):(\d+)") {
        $totalSeconds = [int]$Matches[1] * 3600 + [int]$Matches[2] * 60 + [int]$Matches[3]
        $maxStart = $totalSeconds - 25  # Leave buffer for 20s clip

        # Generate 5 random clips
        $random = New-Object System.Random
        $usedStarts = @()

        for ($i = 1; $i -le 5; $i++) {
            do {
                $startSec = $random.Next(5, $maxStart)
                $tooClose = $false
                foreach ($used in $usedStarts) {
                    if ([Math]::Abs($startSec - $used) -lt 30) {
                        $tooClose = $true
                        break
                    }
                }
            } while ($tooClose -and $usedStarts.Count -lt 50)

            $usedStarts += $startSec
            $clipName = "air-to-air_clip${i}.mp4"

            Write-Host "  Extracting clip $i at ${startSec}s -> $clipName" -ForegroundColor Cyan
            ffmpeg -ss $startSec -i $airToAirPath -t 20 -c copy -y "$OutputDir/$clipName"
        }

        # Remove full video
        Remove-Item $airToAirPath -Force
        Write-Host "  Removed full video, kept 5 clips" -ForegroundColor Green
    } else {
        Write-Host "  Could not determine video duration" -ForegroundColor Red
    }
} else {
    Write-Host "  Failed to download Air to Air video" -ForegroundColor Red
}

# 18. Little Looper Outdoor Figure Skating 01:52 - 2:13
Download-Clip -VideoId "oiWIN8IoTBI" -Start "1:52" -End "2:13" -OutputName "little-looper_1m52s-2m13s"

# 19. THE SIMULACRUM 00:01 - 0:22
Download-Clip -VideoId "AqeF38Ecrm4" -Start "0:01" -End "0:22" -OutputName "simulacrum_0m01s-0m22s"

# 20. Anna Freestyle skydive 2021 2:17 - 2:40 [0.65x - needs 60fps]
Download-Clip -VideoId "r3Qc9YtdYCk" -Start "2:17" -End "2:40" -OutputName "anna-skydive_2m17s-2m40s" -Format $FormatHighFPS

# 21. Vertigo On 0:52 - 1:02 [0.65x - needs 60fps]
Download-Clip -VideoId "uaZtEQIZi04" -Start "0:52" -End "1:02" -OutputName "vertigo-on_0m52s-1m02s" -Format $FormatHighFPS

# 22. FREE FALL | Skydiving in 4K 1:32 - 2:02
Download-Clip -VideoId "8omdqyOqk1Q" -Start "1:32" -End "2:02" -OutputName "free-fall-skydiving_1m32s-2m02s"

# 23. JUN CHA : CAPO MARBLE SCULPTURE 0:01 - 0:29
Download-Clip -VideoId "0iaJddzEaow" -Start "0:01" -End "0:29" -OutputName "jun-cha-marble_0m01s-0m29s"

# 24. Max Cooper - Repetition 00:03 - 00:57
Download-Clip -VideoId "nO9aot9RgQc" -Start "0:03" -End "0:57" -OutputName "max-cooper-repetition_0m03s-0m57s"

# 25. Max Cooper - Repetition 01:40 - 02:34
Download-Clip -VideoId "nO9aot9RgQc" -Start "1:40" -End "2:34" -OutputName "max-cooper-repetition_1m40s-2m34s"

# 26. Max Cooper - Repetition 03:07 - 03:24
Download-Clip -VideoId "nO9aot9RgQc" -Start "3:07" -End "3:24" -OutputName "max-cooper-repetition_3m07s-3m24s"

# 27. Shibuya Sky 21:38 - 22:06 [0.65x - needs 60fps]
Download-Clip -VideoId "7SC048KTLmk" -Start "21:38" -End "22:06" -OutputName "shibuya-sky_21m38s-22m06s" -Format $FormatHighFPS

# 28. Shibuya Sky 25:02 - 25:21 [0.65x - needs 60fps]
Download-Clip -VideoId "7SC048KTLmk" -Start "25:02" -End "25:21" -OutputName "shibuya-sky_25m02s-25m21s" -Format $FormatHighFPS

# 29. Tokyo 4K - Skyline Expressway Sunrise 10:01 - 10:56 [Sonido]
Download-Clip -VideoId "B8Yyf6WKgaM" -Start "10:01" -End "10:56" -OutputName "tokyo-skyline_10m01s-10m56s"

# 30. Harbin Ice & Snow Festival 0:57 - 1:11
Download-Clip -VideoId "M9kFju61xSY" -Start "0:57" -End "1:11" -OutputName "harbin-ice-festival_0m57s-1m11s"

# 31. Nazca Lines, Peru 1:23 - 1:43
Download-Clip -VideoId "ROrrCkxR2tY" -Start "1:23" -End "1:43" -OutputName "nazca-lines_1m23s-1m43s"

# 32. Nazca Lines, Peru 2:01 - 2:13
Download-Clip -VideoId "ROrrCkxR2tY" -Start "2:01" -End "2:13" -OutputName "nazca-lines_2m01s-2m13s"

# 33. WIDE WHITE 0:10 - 0:18
Download-Clip -VideoId "iXcRPMRjeOs" -Start "0:10" -End "0:18" -OutputName "wide-white_0m10s-0m18s"

# 34. WIDE WHITE 1:03 - 1:14
Download-Clip -VideoId "iXcRPMRjeOs" -Start "1:03" -End "1:14" -OutputName "wide-white_1m03s-1m14s"

# 35. MIST - Touching the fog 1:05 - 1:33
Download-Clip -VideoId "7NZOzVD_4QM" -Start "1:05" -End "1:33" -OutputName "mist_1m05s-1m33s"

# 36. Japan is beautiful 00:00 - 00:19
Download-Clip -VideoId "uibW9U03tQ4" -Start "0:00" -End "0:19" -OutputName "japan-beautiful_0m00s-0m19s"

# 37. Japan is beautiful 1:36 - 1:42
Download-Clip -VideoId "uibW9U03tQ4" -Start "1:36" -End "1:42" -OutputName "japan-beautiful_1m36s-1m42s"

# 38. Tangled in Real Life - Lantern Fest 1:11 - 1:33
Download-Clip -VideoId "leTdaF3bsB4" -Start "1:11" -End "1:33" -OutputName "tangled-lantern-fest_1m11s-1m33s"

# 39. Yi Peng Lanna Festival 2024 3:37 - 4:00
Download-Clip -VideoId "im4F2BXRQx0" -Start "3:37" -End "4:00" -OutputName "yi-peng-lanna_3m37s-4m00s"

# 40. Kingdom Hearts III - The Final World 32:00 - 33:04 [Sonido]
Download-Clip -VideoId "-K_1DEWXc_k" -Start "32:00" -End "33:04" -OutputName "kingdom-hearts-iii_32m00s-33m04s"

# 41. Asmr watch this if you need sleep 11:10 - 11:43
Download-Clip -VideoId "YTmWUZQ7MhM" -Start "11:10" -End "11:43" -OutputName "asmr-sleep_11m10s-11m43s"

# 42. Malibu - Atlantic Diva 2:24 - 2:57
Download-Clip -VideoId "qa_NkpWk2T8" -Start "2:24" -End "2:57" -OutputName "malibu-atlantic-diva_2m24s-2m57s"

# 43. Malibu - Atlantic Diva 3:28 - 3:46
Download-Clip -VideoId "qa_NkpWk2T8" -Start "3:28" -End "3:46" -OutputName "malibu-atlantic-diva_3m28s-3m46s"

# 44. SQUEEZE TEAM MANHATTAN TAKEOVER 2:05 - 2:27
Download-Clip -VideoId "9SozN4GDFck" -Start "2:05" -End "2:27" -OutputName "squeeze-team-manhattan_2m05s-2m27s"

# 45. Kite Flying in Night - Rio de Janeiro 12:46 - 13:11
Download-Clip -VideoId "mHzAD4LsYlE" -Start "12:46" -End "13:11" -OutputName "kite-flying-rio_12m46s-13m11s"

# 46. De La Tierra by Lolo & Sosaku 2:54 - 3:50 [Sonido]
Download-Clip -VideoId "QqkC3NQ-aKc" -Start "2:54" -End "3:50" -OutputName "de-la-tierra_2m54s-3m50s"

# 47. Vilnius Light Festival 2024 3:28 - 3:45
Download-Clip -VideoId "sDEY85peKH4" -Start "3:28" -End "3:45" -OutputName "vilnius-light-festival_3m28s-3m45s"

# 48. What does the house with 500,000 likes on Instagram look like? 0:05 - 0:40
Download-Clip -VideoId "EBEXIVmEBos" -Start "0:05" -End "0:40" -OutputName "house-500k-likes_0m05s-0m40s"

# 49. Glass Taxi - Take It 1:38 - 2:00
Download-Clip -VideoId "7BX705vBkwU" -Start "1:38" -End "2:00" -OutputName "glass-taxi-take-it_1m38s-2m00s"

# 50. NONOTAK - DUAL 9:12 - 10:00
Download-Clip -VideoId "r7S1PvfDb2E" -Start "9:12" -End "10:00" -OutputName "nonotak-dual_9m12s-10m00s"

# 51. NONOTAK TOUR 2025 part02 21:37 - 23:05 [Sonido] (NOT in playlist, separate URL)
Download-Clip -VideoId "9ncoqMpTw4s" -Start "21:37" -End "23:05" -OutputName "nonotak-tour-2025_21m37s-23m05s"

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Download complete!" -ForegroundColor Green
Write-Host "Clips saved to: $OutputDir" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
