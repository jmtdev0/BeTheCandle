#!/bin/bash
# Compress videos with HandBrake CLI (x265, CRF 22, slow preset)
# Processes telepath-clips first, then SoloClips

set -euo pipefail

compress_dir() {
  local src_dir="$1"
  local out_dir="$src_dir/compressed"
  mkdir -p "$out_dir"

  local files=("$src_dir"/*.mp4)
  local total=${#files[@]}
  local i=0

  echo ""
  echo "=========================================="
  echo "Processing: $src_dir"
  echo "Total files: $total"
  echo "=========================================="

  for f in "${files[@]}"; do
    i=$((i + 1))
    local basename=$(basename "$f")
    local outfile="$out_dir/$basename"

    if [[ -f "$outfile" ]]; then
      echo "[$i/$total] SKIP (already exists): $basename"
      continue
    fi

    echo "[$i/$total] Encoding: $basename"

    HandBrakeCLI \
      -i "$f" \
      -o "$outfile" \
      --encoder x265 \
      --quality 22 \
      --encoder-preset slow \
      --aencoder copy:aac \
      --optimize \
      2>&1 | tail -1

    # Size comparison
    local orig_size=$(stat -c%s "$f" 2>/dev/null || stat -f%z "$f")
    local new_size=$(stat -c%s "$outfile" 2>/dev/null || stat -f%z "$outfile")
    local orig_mb=$(echo "scale=1; $orig_size / 1048576" | bc)
    local new_mb=$(echo "scale=1; $new_size / 1048576" | bc)
    local pct=$(echo "scale=0; 100 - ($new_size * 100 / $orig_size)" | bc)
    echo "  >> ${orig_mb}MB -> ${new_mb}MB (${pct}% smaller)"
  done
}

# Process telepath-clips first
compress_dir "E:/Software/Coding/BeTheCandle/public/telepath-clips"

# Then SoloClips
compress_dir "E:/Vídeos/Actual/Anerzmi/SoloClips"

echo ""
echo "=========================================="
echo "ALL DONE!"
echo "=========================================="
