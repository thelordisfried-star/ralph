#!/bin/bash
# Ralph Wiggum - Long-running AI agent loop
# Usage: ./ralph.sh [--chrome [url]] [max_iterations]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PRD_FILE="$SCRIPT_DIR/prd.json"
PROGRESS_FILE="$SCRIPT_DIR/progress.txt"
ARCHIVE_DIR="$SCRIPT_DIR/archive"
LAST_BRANCH_FILE="$SCRIPT_DIR/.last-branch"

# Parse arguments
USE_CHROME=false
CHROME_URL=""
MAX_ITERATIONS=10

while [[ $# -gt 0 ]]; do
  case "$1" in
    --chrome)
      USE_CHROME=true
      # Check if next arg is a URL (not a number or flag)
      if [[ -n "$2" && ! "$2" =~ ^[0-9]+$ && ! "$2" =~ ^-- ]]; then
        CHROME_URL="$2"
        shift
      fi
      shift
      ;;
    --chrome-port)
      export RALPH_CHROME_PORT="$2"
      shift 2
      ;;
    [0-9]*)
      MAX_ITERATIONS="$1"
      shift
      ;;
    *)
      echo "Usage: ./ralph.sh [--chrome [url]] [--chrome-port port] [max_iterations]"
      echo ""
      echo "Options:"
      echo "  --chrome [url]       Launch Chrome with remote debugging for browser testing"
      echo "  --chrome-port port   Chrome DevTools Protocol port (default: 9222)"
      echo "  max_iterations       Maximum loop iterations (default: 10)"
      exit 1
      ;;
  esac
done

# Chrome lifecycle management
cleanup_chrome() {
  if [ "$USE_CHROME" = true ]; then
    echo "Stopping Chrome..."
    "$SCRIPT_DIR/chrome.sh" stop 2>/dev/null || true
  fi
}

if [ "$USE_CHROME" = true ]; then
  trap cleanup_chrome EXIT

  echo "Starting Chrome for browser testing..."
  if ! "$SCRIPT_DIR/chrome.sh" launch "${CHROME_URL:-about:blank}"; then
    echo "Warning: Chrome failed to start. Continuing without browser testing."
    USE_CHROME=false
  else
    export RALPH_CHROME=true
    export RALPH_CHROME_PORT="${RALPH_CHROME_PORT:-9222}"
    echo "Chrome available at http://localhost:$RALPH_CHROME_PORT"
    echo ""
  fi
fi

# Archive previous run if branch changed
if [ -f "$PRD_FILE" ] && [ -f "$LAST_BRANCH_FILE" ]; then
  CURRENT_BRANCH=$(jq -r '.branchName // empty' "$PRD_FILE" 2>/dev/null || echo "")
  LAST_BRANCH=$(cat "$LAST_BRANCH_FILE" 2>/dev/null || echo "")

  if [ -n "$CURRENT_BRANCH" ] && [ -n "$LAST_BRANCH" ] && [ "$CURRENT_BRANCH" != "$LAST_BRANCH" ]; then
    # Archive the previous run
    DATE=$(date +%Y-%m-%d)
    # Strip "ralph/" prefix from branch name for folder
    FOLDER_NAME=$(echo "$LAST_BRANCH" | sed 's|^ralph/||')
    ARCHIVE_FOLDER="$ARCHIVE_DIR/$DATE-$FOLDER_NAME"

    echo "Archiving previous run: $LAST_BRANCH"
    mkdir -p "$ARCHIVE_FOLDER"
    [ -f "$PRD_FILE" ] && cp "$PRD_FILE" "$ARCHIVE_FOLDER/"
    [ -f "$PROGRESS_FILE" ] && cp "$PROGRESS_FILE" "$ARCHIVE_FOLDER/"
    echo "   Archived to: $ARCHIVE_FOLDER"

    # Reset progress file for new run
    echo "# Ralph Progress Log" > "$PROGRESS_FILE"
    echo "Started: $(date)" >> "$PROGRESS_FILE"
    echo "---" >> "$PROGRESS_FILE"
  fi
fi

# Track current branch
if [ -f "$PRD_FILE" ]; then
  CURRENT_BRANCH=$(jq -r '.branchName // empty' "$PRD_FILE" 2>/dev/null || echo "")
  if [ -n "$CURRENT_BRANCH" ]; then
    echo "$CURRENT_BRANCH" > "$LAST_BRANCH_FILE"
  fi
fi

# Initialize progress file if it doesn't exist
if [ ! -f "$PROGRESS_FILE" ]; then
  echo "# Ralph Progress Log" > "$PROGRESS_FILE"
  echo "Started: $(date)" >> "$PROGRESS_FILE"
  echo "---" >> "$PROGRESS_FILE"
fi

echo "Starting Ralph - Max iterations: $MAX_ITERATIONS"
if [ "$USE_CHROME" = true ]; then
  echo "Chrome: enabled (port $RALPH_CHROME_PORT)"
fi

for i in $(seq 1 $MAX_ITERATIONS); do
  echo ""
  echo "═══════════════════════════════════════════════════════"
  echo "  Ralph Iteration $i of $MAX_ITERATIONS"
  echo "═══════════════════════════════════════════════════════"

  # Run amp with the ralph prompt
  OUTPUT=$(cat "$SCRIPT_DIR/prompt.md" | amp --dangerously-allow-all 2>&1 | tee /dev/stderr) || true

  # Check for completion signal
  if echo "$OUTPUT" | grep -q "<promise>COMPLETE</promise>"; then
    echo ""
    echo "Ralph completed all tasks!"
    echo "Completed at iteration $i of $MAX_ITERATIONS"
    exit 0
  fi

  echo "Iteration $i complete. Continuing..."
  sleep 2
done

echo ""
echo "Ralph reached max iterations ($MAX_ITERATIONS) without completing all tasks."
echo "Check $PROGRESS_FILE for status."
exit 1
