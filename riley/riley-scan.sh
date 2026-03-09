#!/usr/bin/env bash
# riley-scan.sh — Scan project files and produce a manifest for indexing
#
# Usage: ./riley/riley-scan.sh [project_root] [output_manifest]
# Defaults: project_root=. output_manifest=.riley/manifest.txt
#
# The manifest is a newline-delimited list of file paths to be indexed.
# Edit INCLUDE_EXTS and EXCLUDE_DIRS to tune for your project.

set -euo pipefail

PROJECT_ROOT="${1:-$(pwd)}"
MANIFEST="${2:-.riley/manifest.txt}"
RILEY_DIR="$(dirname "$MANIFEST")"

# Extensions to include (space-separated)
INCLUDE_EXTS="ts tsx js jsx py rb go rs java kt swift md txt sh bash json yaml yml toml env.example"

# Directories to exclude
EXCLUDE_DIRS=".git node_modules dist build .next .nuxt __pycache__ .venv venv .riley .cache coverage"

mkdir -p "$RILEY_DIR"

echo "[riley-scan] Scanning $PROJECT_ROOT ..."

# Build find exclusions
FIND_PRUNE=""
for dir in $EXCLUDE_DIRS; do
  FIND_PRUNE="$FIND_PRUNE -path '*/$dir' -prune -o"
done

# Build extension filter
EXT_FILTER=""
first=1
for ext in $INCLUDE_EXTS; do
  if [ $first -eq 1 ]; then
    EXT_FILTER="-name \"*.$ext\""
    first=0
  else
    EXT_FILTER="$EXT_FILTER -o -name \"*.$ext\""
  fi
done

# Run find with pruning and extension filter
eval "find \"$PROJECT_ROOT\" $FIND_PRUNE \( $EXT_FILTER \) -type f -print" \
  | sort \
  > "$MANIFEST"

FILE_COUNT=$(wc -l < "$MANIFEST")
echo "[riley-scan] Found $FILE_COUNT files → $MANIFEST"
