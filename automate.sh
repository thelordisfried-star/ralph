#!/bin/bash
# Ralph Build Automation Agent
# A single entry point for all development automation tasks.
#
# Usage: ./automate.sh <command> [options]
#
# Commands:
#   status      Show PRD progress, branch info, and project health
#   validate    Validate prd.json format and story structure
#   lint        Run shellcheck on bash scripts + eslint on flowchart
#   typecheck   Run TypeScript type checking on flowchart
#   build       Build the flowchart for production
#   install     Install all project dependencies
#   preflight   Run all checks before a ralph run (validate + lint + typecheck + build)
#   ci          Full CI pipeline (install + lint + typecheck + build)
#   clean       Remove build artifacts and node_modules
#   archive     Archive current prd.json + progress.txt to archive/
#   setup-hooks Install git pre-commit hook
#   help        Show this help message

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FLOWCHART_DIR="$SCRIPT_DIR/flowchart"
PRD_FILE="$SCRIPT_DIR/prd.json"
PROGRESS_FILE="$SCRIPT_DIR/progress.txt"
ARCHIVE_DIR="$SCRIPT_DIR/archive"

# Colors (disable if not a terminal)
if [ -t 1 ]; then
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[0;33m'
  BLUE='\033[0;34m'
  BOLD='\033[1m'
  RESET='\033[0m'
else
  RED='' GREEN='' YELLOW='' BLUE='' BOLD='' RESET=''
fi

# ─── Helpers ──────────────────────────────────────────────────────────────────

info()  { echo -e "${BLUE}[INFO]${RESET}  $*"; }
ok()    { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
fail()  { echo -e "${RED}[FAIL]${RESET}  $*"; }
header() {
  echo ""
  echo -e "${BOLD}═══════════════════════════════════════════════════════${RESET}"
  echo -e "${BOLD}  $*${RESET}"
  echo -e "${BOLD}═══════════════════════════════════════════════════════${RESET}"
}

check_dependency() {
  if ! command -v "$1" &>/dev/null; then
    fail "$1 is not installed. $2"
    return 1
  fi
}

# ─── Commands ─────────────────────────────────────────────────────────────────

cmd_status() {
  header "Ralph Project Status"

  # Git info
  local branch
  branch=$(git -C "$SCRIPT_DIR" branch --show-current 2>/dev/null || echo "unknown")
  info "Branch: ${BOLD}$branch${RESET}"

  local dirty
  dirty=$(git -C "$SCRIPT_DIR" status --porcelain 2>/dev/null | wc -l | tr -d ' ')
  if [ "$dirty" -gt 0 ]; then
    warn "Working tree has $dirty uncommitted change(s)"
  else
    ok "Working tree is clean"
  fi

  # PRD status
  echo ""
  if [ -f "$PRD_FILE" ]; then
    local project description total passing failing
    project=$(jq -r '.project // "unknown"' "$PRD_FILE")
    description=$(jq -r '.description // "none"' "$PRD_FILE")
    total=$(jq '.userStories | length' "$PRD_FILE")
    passing=$(jq '[.userStories[] | select(.passes == true)] | length' "$PRD_FILE")
    failing=$((total - passing))

    info "Project: ${BOLD}$project${RESET}"
    info "Description: $description"
    echo ""

    if [ "$failing" -eq 0 ] && [ "$total" -gt 0 ]; then
      ok "All $total stories passing"
    else
      info "Stories: $passing/$total passing, $failing remaining"
    fi

    echo ""
    info "Story breakdown:"
    jq -r '.userStories[] | "  \(if .passes then "✓" else "✗" end)  [\(.id)] \(.title)"' "$PRD_FILE"
  else
    warn "No prd.json found — create one to start a Ralph run"
  fi

  # Progress file
  echo ""
  if [ -f "$PROGRESS_FILE" ]; then
    local lines
    lines=$(wc -l < "$PROGRESS_FILE" | tr -d ' ')
    info "Progress log: $lines lines"
  else
    info "Progress log: not started"
  fi

  # Flowchart
  echo ""
  if [ -d "$FLOWCHART_DIR/node_modules" ]; then
    ok "Flowchart dependencies installed"
  else
    warn "Flowchart dependencies not installed (run: ./automate.sh install)"
  fi
}

cmd_validate() {
  header "Validating prd.json"

  if [ ! -f "$PRD_FILE" ]; then
    warn "No prd.json found — nothing to validate"
    return 0
  fi

  local errors=0

  # Valid JSON
  if ! jq empty "$PRD_FILE" 2>/dev/null; then
    fail "prd.json is not valid JSON"
    return 1
  fi
  ok "Valid JSON"

  # Required top-level fields
  for field in project branchName description userStories; do
    if [ "$(jq "has(\"$field\")" "$PRD_FILE")" = "true" ]; then
      ok "Has required field: $field"
    else
      fail "Missing required field: $field"
      errors=$((errors + 1))
    fi
  done

  # Branch name format
  local branch_name
  branch_name=$(jq -r '.branchName // ""' "$PRD_FILE")
  if [[ "$branch_name" == ralph/* ]]; then
    ok "Branch name has ralph/ prefix"
  else
    warn "Branch name '$branch_name' does not start with ralph/"
  fi

  # User stories validation
  local story_count
  story_count=$(jq '.userStories | length' "$PRD_FILE")
  if [ "$story_count" -eq 0 ]; then
    fail "No user stories defined"
    errors=$((errors + 1))
  else
    info "Found $story_count user stories"
  fi

  # Validate each story
  for i in $(seq 0 $((story_count - 1))); do
    local story_id title criteria_count
    story_id=$(jq -r ".userStories[$i].id" "$PRD_FILE")
    title=$(jq -r ".userStories[$i].title" "$PRD_FILE")
    criteria_count=$(jq ".userStories[$i].acceptanceCriteria | length" "$PRD_FILE")

    # Check required story fields
    for field in id title description acceptanceCriteria priority passes; do
      if [ "$(jq ".userStories[$i] | has(\"$field\")" "$PRD_FILE")" != "true" ]; then
        fail "Story $story_id missing field: $field"
        errors=$((errors + 1))
      fi
    done

    # Check acceptance criteria not empty
    if [ "$criteria_count" -eq 0 ]; then
      fail "Story $story_id ($title) has no acceptance criteria"
      errors=$((errors + 1))
    fi

    # Check for typecheck criterion
    if ! jq -e ".userStories[$i].acceptanceCriteria | any(test(\"[Tt]ypecheck\"))" "$PRD_FILE" &>/dev/null; then
      warn "Story $story_id ($title) missing 'Typecheck passes' criterion"
    fi
  done

  # Check priority ordering (no duplicates)
  local unique_priorities total_stories
  unique_priorities=$(jq '[.userStories[].priority] | unique | length' "$PRD_FILE")
  total_stories=$(jq '.userStories | length' "$PRD_FILE")
  if [ "$unique_priorities" -ne "$total_stories" ]; then
    warn "Duplicate priority values detected — stories may execute in unexpected order"
  fi

  echo ""
  if [ "$errors" -eq 0 ]; then
    ok "prd.json validation passed"
  else
    fail "Validation found $errors error(s)"
    return 1
  fi
}

cmd_lint() {
  header "Linting"
  local errors=0

  # Shellcheck
  if command -v shellcheck &>/dev/null; then
    info "Running shellcheck on bash scripts..."
    local bash_files=()
    while IFS= read -r -d '' f; do
      bash_files+=("$f")
    done < <(find "$SCRIPT_DIR" -maxdepth 1 -name "*.sh" -print0)

    for f in "${bash_files[@]}"; do
      local name
      name=$(basename "$f")
      if shellcheck "$f" 2>/dev/null; then
        ok "shellcheck: $name"
      else
        fail "shellcheck: $name"
        errors=$((errors + 1))
      fi
    done
  else
    warn "shellcheck not installed — skipping bash lint (install: apt-get install shellcheck)"
  fi

  # ESLint (flowchart)
  if [ -d "$FLOWCHART_DIR/node_modules" ]; then
    info "Running eslint on flowchart..."
    if (cd "$FLOWCHART_DIR" && npx eslint . 2>&1); then
      ok "eslint: flowchart"
    else
      fail "eslint: flowchart"
      errors=$((errors + 1))
    fi
  else
    warn "Flowchart node_modules not found — skipping eslint (run: ./automate.sh install)"
  fi

  echo ""
  if [ "$errors" -eq 0 ]; then
    ok "All lint checks passed"
  else
    fail "Lint found $errors error(s)"
    return 1
  fi
}

cmd_typecheck() {
  header "Type Checking"

  if [ ! -d "$FLOWCHART_DIR/node_modules" ]; then
    fail "Flowchart node_modules not found (run: ./automate.sh install)"
    return 1
  fi

  info "Running TypeScript type check on flowchart..."
  if (cd "$FLOWCHART_DIR" && npx tsc -b --noEmit 2>&1); then
    ok "TypeScript type check passed"
  else
    fail "TypeScript type check failed"
    return 1
  fi
}

cmd_build() {
  header "Building Flowchart"

  if [ ! -d "$FLOWCHART_DIR/node_modules" ]; then
    fail "Flowchart node_modules not found (run: ./automate.sh install)"
    return 1
  fi

  info "Building flowchart for production..."
  if (cd "$FLOWCHART_DIR" && npm run build 2>&1); then
    ok "Flowchart build successful"
    local size
    size=$(du -sh "$FLOWCHART_DIR/dist" 2>/dev/null | cut -f1)
    info "Output: flowchart/dist ($size)"
  else
    fail "Flowchart build failed"
    return 1
  fi
}

cmd_install() {
  header "Installing Dependencies"

  check_dependency "node" "Install Node.js: https://nodejs.org" || return 1
  check_dependency "npm" "npm should come with Node.js" || return 1
  check_dependency "jq" "Install jq: apt-get install jq" || return 1

  info "Installing flowchart dependencies..."
  if (cd "$FLOWCHART_DIR" && npm ci 2>&1); then
    ok "Flowchart dependencies installed"
  else
    warn "npm ci failed, trying npm install..."
    if (cd "$FLOWCHART_DIR" && npm install 2>&1); then
      ok "Flowchart dependencies installed (via npm install)"
    else
      fail "Failed to install flowchart dependencies"
      return 1
    fi
  fi
}

cmd_preflight() {
  header "Pre-flight Checks"
  info "Running all checks before a Ralph run..."
  echo ""

  local errors=0

  # Check ralph dependencies
  check_dependency "jq" "Required by ralph.sh" || errors=$((errors + 1))

  # Validate PRD
  cmd_validate || errors=$((errors + 1))

  # Lint
  cmd_lint || errors=$((errors + 1))

  # Typecheck
  cmd_typecheck || errors=$((errors + 1))

  echo ""
  header "Pre-flight Summary"
  if [ "$errors" -eq 0 ]; then
    ok "All pre-flight checks passed — ready to run ralph.sh"
  else
    fail "$errors check(s) failed — fix issues before running ralph.sh"
    return 1
  fi
}

cmd_ci() {
  header "CI Pipeline"
  info "Running full CI: install -> lint -> typecheck -> build"
  echo ""

  cmd_install
  cmd_lint
  cmd_typecheck
  cmd_build

  echo ""
  ok "CI pipeline completed successfully"
}

cmd_clean() {
  header "Cleaning Build Artifacts"

  if [ -d "$FLOWCHART_DIR/dist" ]; then
    rm -rf "$FLOWCHART_DIR/dist"
    ok "Removed flowchart/dist"
  fi

  if [ -d "$FLOWCHART_DIR/node_modules" ]; then
    rm -rf "$FLOWCHART_DIR/node_modules"
    ok "Removed flowchart/node_modules"
  fi

  ok "Clean complete"
}

cmd_archive() {
  header "Archiving Current Run"

  if [ ! -f "$PRD_FILE" ]; then
    warn "No prd.json to archive"
    return 0
  fi

  local branch_name date folder_name archive_folder
  branch_name=$(jq -r '.branchName // "unknown"' "$PRD_FILE")
  date=$(date +%Y-%m-%d)
  folder_name=$(echo "$branch_name" | sed 's|^ralph/||')
  archive_folder="$ARCHIVE_DIR/$date-$folder_name"

  if [ -d "$archive_folder" ]; then
    warn "Archive already exists: $archive_folder"
    info "Use a different date or remove the existing archive"
    return 1
  fi

  mkdir -p "$archive_folder"

  cp "$PRD_FILE" "$archive_folder/"
  ok "Archived prd.json"

  if [ -f "$PROGRESS_FILE" ]; then
    cp "$PROGRESS_FILE" "$archive_folder/"
    ok "Archived progress.txt"
  fi

  info "Archived to: $archive_folder"

  # Reset for next run
  echo "# Ralph Progress Log" > "$PROGRESS_FILE"
  echo "Started: $(date)" >> "$PROGRESS_FILE"
  echo "---" >> "$PROGRESS_FILE"
  ok "Reset progress.txt for next run"
}

cmd_setup_hooks() {
  header "Setting Up Git Hooks"

  local hooks_dir="$SCRIPT_DIR/.git/hooks"

  if [ ! -d "$hooks_dir" ]; then
    fail "Not a git repository or .git/hooks not found"
    return 1
  fi

  # Write pre-commit hook
  cat > "$hooks_dir/pre-commit" << 'HOOK'
#!/bin/bash
# Ralph pre-commit hook — runs lint checks on staged files
set -e

REPO_ROOT="$(git rev-parse --show-toplevel)"

echo "Running pre-commit checks..."

# Shellcheck on staged .sh files
STAGED_SH=$(git diff --cached --name-only --diff-filter=ACM | grep '\.sh$' || true)
if [ -n "$STAGED_SH" ] && command -v shellcheck &>/dev/null; then
  echo "  shellcheck..."
  echo "$STAGED_SH" | while read -r f; do
    shellcheck "$REPO_ROOT/$f"
  done
  echo "  shellcheck passed"
fi

# ESLint on staged flowchart files
STAGED_TS=$(git diff --cached --name-only --diff-filter=ACM | grep '^flowchart/.*\.\(ts\|tsx\)$' || true)
if [ -n "$STAGED_TS" ] && [ -d "$REPO_ROOT/flowchart/node_modules" ]; then
  echo "  eslint..."
  (cd "$REPO_ROOT/flowchart" && npx eslint $STAGED_TS)
  echo "  eslint passed"
fi

echo "Pre-commit checks passed."
HOOK

  chmod +x "$hooks_dir/pre-commit"
  ok "Installed pre-commit hook"
  info "Hook runs: shellcheck on .sh files, eslint on flowchart .ts/.tsx files"
}

cmd_help() {
  echo ""
  echo -e "${BOLD}Ralph Build Automation Agent${RESET}"
  echo ""
  echo "Usage: ./automate.sh <command>"
  echo ""
  echo "Commands:"
  echo "  status       Show PRD progress, branch info, and project health"
  echo "  validate     Validate prd.json format and story structure"
  echo "  lint         Run shellcheck on bash + eslint on flowchart"
  echo "  typecheck    Run TypeScript type checking"
  echo "  build        Build the flowchart for production"
  echo "  install      Install project dependencies"
  echo "  preflight    Run all checks before a ralph run"
  echo "  ci           Full CI pipeline (install + lint + typecheck + build)"
  echo "  clean        Remove build artifacts and node_modules"
  echo "  archive      Archive current prd.json + progress.txt"
  echo "  setup-hooks  Install git pre-commit hook"
  echo "  help         Show this help message"
  echo ""
  echo "Examples:"
  echo "  ./automate.sh status          # See where things stand"
  echo "  ./automate.sh preflight       # Check everything before running ralph"
  echo "  ./automate.sh ci              # Full CI build from scratch"
  echo "  ./automate.sh lint            # Quick lint pass"
  echo ""
}

# ─── Main ─────────────────────────────────────────────────────────────────────

main() {
  local cmd="${1:-help}"

  case "$cmd" in
    status)      cmd_status ;;
    validate)    cmd_validate ;;
    lint)        cmd_lint ;;
    typecheck)   cmd_typecheck ;;
    build)       cmd_build ;;
    install)     cmd_install ;;
    preflight)   cmd_preflight ;;
    ci)          cmd_ci ;;
    clean)       cmd_clean ;;
    archive)     cmd_archive ;;
    setup-hooks) cmd_setup_hooks ;;
    help|--help|-h) cmd_help ;;
    *)
      fail "Unknown command: $cmd"
      cmd_help
      exit 1
      ;;
  esac
}

main "$@"
