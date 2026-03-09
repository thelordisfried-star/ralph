#!/usr/bin/env bash
# riley-recall.sh — Retrieve relevant chunks and prepend them to AI context
#
# Usage: ./riley/riley-recall.sh <query> [top_n] [output_file]
#   query       — keywords or phrase to search for in the index
#   top_n       — number of top chunks to return (default: 10)
#   output_file — where to write the context block (default: .riley/context.md)
#                 Pass "-" to print to stdout instead.
#
# How it works:
#   1. Searches .riley/index/*.chunk files for lines matching the query terms
#   2. Ranks chunks by number of term hits (simple tf-style scoring)
#   3. Writes the top N chunks into a markdown context block
#
# Integrate with Ralph/Amp by prepending .riley/context.md to your prompt.
# Example in ralph.sh or prompt.md:
#   RILEY_CONTEXT=$(./riley/riley-recall.sh "$TASK_DESCRIPTION")
#   FULL_PROMPT="$RILEY_CONTEXT\n\n$BASE_PROMPT"
#
# Or auto-prepend at the top of prompt.md:
#   {{RILEY_CONTEXT}}   ← filled by riley-recall.sh --inject

set -euo pipefail

QUERY="${1:-}"
TOP_N="${2:-10}"
OUTPUT="${3:-.riley/context.md}"
INDEX_DIR=".riley/index"

if [ -z "$QUERY" ]; then
  echo "Usage: $0 <query> [top_n] [output_file]"
  echo "  query:   keywords to search the Riley index"
  echo "  top_n:   number of chunks to return (default: 10)"
  echo "  output:  output file path, or - for stdout (default: .riley/context.md)"
  exit 1
fi

if [ ! -d "$INDEX_DIR" ]; then
  echo "[riley-recall] Index not found at $INDEX_DIR"
  echo "[riley-recall] Run riley-scan.sh then riley-index.sh first."
  exit 1
fi

# ── Score chunks ──────────────────────────────────────────────────────────────
# Split query into individual terms for multi-term matching
IFS=' ' read -ra TERMS <<< "$QUERY"

SCORE_FILE=$(mktemp)
trap 'rm -f "$SCORE_FILE"' EXIT

for chunk_file in "$INDEX_DIR"/*.chunk; do
  [ -f "$chunk_file" ] || continue
  score=0
  for term in "${TERMS[@]}"; do
    hits=$(grep -ic "$term" "$chunk_file" 2>/dev/null || true)
    score=$((score + hits))
  done
  if [ "$score" -gt 0 ]; then
    printf '%d\t%s\n' "$score" "$chunk_file"
  fi
done | sort -rn > "$SCORE_FILE"

total_matches=$(wc -l < "$SCORE_FILE")

if [ "$total_matches" -eq 0 ]; then
  echo "[riley-recall] No chunks matched query: \"$QUERY\""
  exit 0
fi

echo "[riley-recall] Query: \"$QUERY\" → $total_matches matching chunks, returning top $TOP_N"

# ── Build context block ───────────────────────────────────────────────────────
build_context() {
  printf '<!-- riley-recall: query="%s" chunks=%d/%d -->\n' "$QUERY" "$TOP_N" "$total_matches"
  printf '# Riley Memory Context\n\n'
  printf 'The following code chunks are the most relevant to your current task.\n'
  printf 'Use them to inform your implementation without re-reading entire files.\n\n'
  printf '---\n\n'

  rank=0
  while IFS=$'\t' read -r score chunk_file; do
    rank=$((rank + 1))
    [ "$rank" -gt "$TOP_N" ] && break

    # Parse JSON fields from chunk file (no jq dependency)
    file=$(grep -o '"file":"[^"]*"' "$chunk_file" | cut -d'"' -f4)
    start=$(grep -o '"start":[0-9]*' "$chunk_file" | cut -d: -f2)
    end=$(grep -o '"end":[0-9]*' "$chunk_file" | cut -d: -f2)
    # Decode content: unescape \n back to real newlines, unescape \"
    content=$(grep -o '"content":".*"' "$chunk_file" \
      | sed 's/^"content":"//;s/"$//' \
      | sed 's/\\n/\n/g' \
      | sed 's/\\"/"/g' \
      | sed 's/\\\\/\\/g')

    # Guess language from extension for fenced code block
    ext="${file##*.}"
    case "$ext" in
      ts|tsx) lang="typescript" ;;
      js|jsx) lang="javascript" ;;
      py)     lang="python" ;;
      rb)     lang="ruby" ;;
      go)     lang="go" ;;
      rs)     lang="rust" ;;
      sh|bash) lang="bash" ;;
      json)   lang="json" ;;
      yaml|yml) lang="yaml" ;;
      *)      lang="" ;;
    esac

    printf '### [%d/%d] `%s` (lines %s–%s) — score: %d\n\n' \
      "$rank" "$TOP_N" "$file" "$start" "$end" "$score"
    printf '```%s\n' "$lang"
    printf '%s\n' "$content"
    printf '```\n\n'
  done < "$SCORE_FILE"
}

# ── Output ────────────────────────────────────────────────────────────────────
if [ "$OUTPUT" = "-" ]; then
  build_context
else
  mkdir -p "$(dirname "$OUTPUT")"
  build_context > "$OUTPUT"
  echo "[riley-recall] Context written to: $OUTPUT"
  echo "[riley-recall] Prepend this file to your prompt for memory recall."
fi
