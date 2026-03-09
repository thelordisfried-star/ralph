#!/usr/bin/env bash
# riley-index.sh — Chunk and index files from the Riley manifest
#
# Usage: ./riley/riley-index.sh [manifest] [index_dir] [chunk_lines]
# Defaults: manifest=.riley/manifest.txt  index_dir=.riley/index  chunk_lines=80
#
# Skips indexing if on battery power and battery < BATTERY_THRESHOLD (default 30%).
# Set RILEY_FORCE=1 to skip battery check.
#
# Output: .riley/index/<hash>.chunk — one file per chunk, JSON lines format
#   Each chunk: {"file":"...", "start":N, "end":N, "content":"..."}
# Also writes .riley/index.json — master index of all chunks with metadata.

set -euo pipefail

MANIFEST="${1:-.riley/manifest.txt}"
INDEX_DIR="${2:-.riley/index}"
CHUNK_LINES="${3:-80}"
BATTERY_THRESHOLD="${BATTERY_THRESHOLD:-30}"
RILEY_FORCE="${RILEY_FORCE:-0}"

# ── Battery check ────────────────────────────────────────────────────────────
check_battery() {
  # Linux: /sys/class/power_supply
  if [ -d /sys/class/power_supply ]; then
    # Check if we're on AC power first
    for ac in /sys/class/power_supply/AC*/online /sys/class/power_supply/ADP*/online; do
      [ -f "$ac" ] && [ "$(cat "$ac")" = "1" ] && return 0  # on AC, ok
    done
    # Check battery level
    for bat in /sys/class/power_supply/BAT*/capacity; do
      if [ -f "$bat" ]; then
        level=$(cat "$bat")
        if [ "$level" -lt "$BATTERY_THRESHOLD" ]; then
          echo "[riley-index] Battery at ${level}% (< ${BATTERY_THRESHOLD}%). Skipping index."
          echo "[riley-index] Set RILEY_FORCE=1 or plug in to override."
          exit 0
        fi
        echo "[riley-index] Battery at ${level}% — OK."
        return 0
      fi
    done
  fi

  # macOS: pmset
  if command -v pmset &>/dev/null; then
    local info
    info=$(pmset -g batt 2>/dev/null)
    if echo "$info" | grep -q "AC Power"; then return 0; fi
    local pct
    pct=$(echo "$info" | grep -oE '[0-9]+%' | tr -d '%' | head -1)
    if [ -n "$pct" ] && [ "$pct" -lt "$BATTERY_THRESHOLD" ]; then
      echo "[riley-index] Battery at ${pct}% (< ${BATTERY_THRESHOLD}%). Skipping index."
      echo "[riley-index] Set RILEY_FORCE=1 or plug in to override."
      exit 0
    fi
    [ -n "$pct" ] && echo "[riley-index] Battery at ${pct}% — OK."
  fi
  # No battery info found — assume desktop/ok
}

if [ "$RILEY_FORCE" != "1" ]; then
  check_battery
fi

# ── Validate manifest ─────────────────────────────────────────────────────────
if [ ! -f "$MANIFEST" ]; then
  echo "[riley-index] Manifest not found: $MANIFEST"
  echo "[riley-index] Run riley-scan.sh first."
  exit 1
fi

mkdir -p "$INDEX_DIR"

MASTER_INDEX="$INDEX_DIR/../index.json"
CHUNK_COUNT=0
FILE_COUNT=0

echo "[riley-index] Chunking files (${CHUNK_LINES} lines/chunk) ..."
echo "[" > "$MASTER_INDEX.tmp"
FIRST_ENTRY=1

while IFS= read -r filepath; do
  [ -z "$filepath" ] && continue
  [ ! -f "$filepath" ] && continue

  FILE_COUNT=$((FILE_COUNT + 1))
  total_lines=$(wc -l < "$filepath")

  line=1
  while [ "$line" -le "$((total_lines + 1))" ]; do
    end=$((line + CHUNK_LINES - 1))
    [ "$end" -gt "$total_lines" ] && end=$total_lines

    # Extract chunk content
    content=$(sed -n "${line},${end}p" "$filepath" 2>/dev/null || true)
    [ -z "$content" ] && break

    # Stable hash for this chunk: file path + start line
    chunk_id=$(printf '%s:%d' "$filepath" "$line" | sha256sum 2>/dev/null | cut -c1-16 \
              || printf '%s:%d' "$filepath" "$line" | md5sum | cut -c1-16)

    chunk_file="$INDEX_DIR/${chunk_id}.chunk"

    # Escape content for JSON (basic: escape backslashes, quotes, newlines)
    json_content=$(printf '%s' "$content" \
      | sed 's/\\/\\\\/g' \
      | sed 's/"/\\"/g' \
      | awk '{printf "%s\\n", $0}' \
      | sed '$ s/\\n$//')

    json_entry=$(printf '{"id":"%s","file":"%s","start":%d,"end":%d,"lines":%d,"content":"%s"}' \
      "$chunk_id" "$filepath" "$line" "$end" "$((end - line + 1))" "$json_content")

    # Write individual chunk file
    printf '%s\n' "$json_entry" > "$chunk_file"

    # Append to master index
    if [ "$FIRST_ENTRY" -eq 1 ]; then
      FIRST_ENTRY=0
    else
      printf ',\n' >> "$MASTER_INDEX.tmp"
    fi
    printf '  %s' "$json_entry" >> "$MASTER_INDEX.tmp"

    CHUNK_COUNT=$((CHUNK_COUNT + 1))
    line=$((end + 1))
  done

done < "$MANIFEST"

printf '\n]\n' >> "$MASTER_INDEX.tmp"
mv "$MASTER_INDEX.tmp" "$MASTER_INDEX"

echo "[riley-index] Indexed $FILE_COUNT files → $CHUNK_COUNT chunks"
echo "[riley-index] Master index: $MASTER_INDEX"
echo "[riley-index] Chunk files:  $INDEX_DIR/"
