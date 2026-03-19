#!/bin/bash
# ═══════════════════════════════════════════════════════
#  OLLAMA FULL SETUP — Install, Configure, Serve, Pull
# ═══════════════════════════════════════════════════════
# No set -e: we handle errors per-step so one failure doesn't kill the script

# ── Environment Variables ──────────────────────────────
# Change these as needed before running

export OLLAMA_HOST="${OLLAMA_HOST:-0.0.0.0:11434}"
export OLLAMA_MODELS="${OLLAMA_MODELS:-$HOME/.ollama/models}"
export OLLAMA_KEEP_ALIVE="${OLLAMA_KEEP_ALIVE:-5m}"
export OLLAMA_NUM_GPU="${OLLAMA_NUM_GPU:-999}"
export OLLAMA_MAX_LOADED_MODELS="${OLLAMA_MAX_LOADED_MODELS:-1}"
# export OLLAMA_DEBUG=1  # Uncomment for debug logging

# Default model to pull
MODEL="${1:-llama3}"

# ── Colors ─────────────────────────────────────────────
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

status()  { echo -e "${GREEN}[OK]${NC} $1"; }
warn()    { echo -e "${YELLOW}[!!]${NC} $1"; }
fail()    { echo -e "${RED}[FAIL]${NC} $1"; }

echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║       OLLAMA SETUP & STATUS          ║"
echo "  ╚══════════════════════════════════════╝"
echo ""

# ── Step 1: Install prerequisites & Ollama ─────────────
echo "── Step 1: Checking installation ──"

# Install required system dependencies first
if ! command -v curl &>/dev/null; then
  warn "Installing curl..."
  if command -v apt-get &>/dev/null; then
    while sudo fuser /var/lib/apt/lists/lock /var/lib/dpkg/lock /var/lib/dpkg/lock-frontend &>/dev/null 2>&1; do
      echo "    Waiting for apt lock to release..."
      sleep 2
    done
    sudo apt-get update -qq && sudo apt-get install -y -qq curl
  elif command -v dnf &>/dev/null; then
    sudo dnf install -y curl
  elif command -v pacman &>/dev/null; then
    sudo pacman -S --noconfirm curl
  elif command -v brew &>/dev/null; then
    brew install curl
  fi
fi

if ! command -v zstd &>/dev/null; then
  warn "zstd not found. Installing..."
  # Try system package manager first
  if command -v apt-get &>/dev/null; then
    while sudo fuser /var/lib/apt/lists/lock /var/lib/dpkg/lock /var/lib/dpkg/lock-frontend &>/dev/null 2>&1; do
      echo "    Waiting for apt lock to release..."
      sleep 2
    done
    sudo apt-get install -y -qq zstd 2>/dev/null || true
  elif command -v dnf &>/dev/null; then
    sudo dnf install -y zstd 2>/dev/null || true
  elif command -v pacman &>/dev/null; then
    sudo pacman -S --noconfirm zstd 2>/dev/null || true
  elif command -v brew &>/dev/null; then
    brew install zstd 2>/dev/null || true
  fi

  # Fallback: create a Python-based zstd shim if system install failed
  if ! command -v zstd &>/dev/null; then
    warn "System zstd unavailable, creating Python fallback..."
    pip3 install zstandard -q 2>/dev/null || pip install zstandard -q 2>/dev/null
    cat > /usr/local/bin/zstd << 'ZSTD_SHIM'
#!/usr/bin/env python3
import sys, zstandard
def main():
    decompress = '-d' in sys.argv
    args = [a for a in sys.argv[1:] if not a.startswith('-')]
    if decompress:
        dctx = zstandard.ZstdDecompressor()
        if args:
            for f in args:
                outf = f.replace('.zst', '')
                with open(f, 'rb') as inf, open(outf, 'wb') as of:
                    dctx.copy_stream(inf, of)
        else:
            dctx.copy_stream(sys.stdin.buffer, sys.stdout.buffer)
    else:
        cctx = zstandard.ZstdCompressor()
        cctx.copy_stream(sys.stdin.buffer, sys.stdout.buffer)
if __name__ == '__main__':
    main()
ZSTD_SHIM
    chmod +x /usr/local/bin/zstd
  fi

  if command -v zstd &>/dev/null; then
    status "zstd ready"
  else
    fail "Could not install zstd. Please install manually."
    exit 1
  fi
fi

if command -v ollama &>/dev/null; then
  status "Ollama is installed: $(ollama --version 2>/dev/null || echo 'unknown version')"
else
  warn "Ollama not found. Installing..."
  curl -fsSL https://ollama.com/install.sh | sh
  if command -v ollama &>/dev/null; then
    status "Ollama installed successfully"
  else
    fail "Installation failed. Visit https://ollama.com/download"
    exit 1
  fi
fi
echo ""

# ── Step 2: Check if Ollama is running ─────────────────
echo "── Step 2: Checking server status ──"

# Parse just the port from OLLAMA_HOST
OLLAMA_PORT=$(echo "$OLLAMA_HOST" | grep -oP ':\K[0-9]+$' || echo "11434")
OLLAMA_URL="http://localhost:${OLLAMA_PORT}"

if curl -s "$OLLAMA_URL" --max-time 3 &>/dev/null; then
  status "Ollama server is already running at $OLLAMA_URL"
  SERVER_STARTED=false
else
  warn "Ollama server is not running. Starting it..."
  ollama serve > /tmp/ollama-serve.log 2>&1 &
  OLLAMA_PID=$!
  echo "    PID: $OLLAMA_PID (log: /tmp/ollama-serve.log)"

  # Wait for it to come up
  for i in 1 2 3 4 5; do
    sleep 1
    if curl -s "$OLLAMA_URL" --max-time 2 &>/dev/null; then
      status "Server started successfully"
      SERVER_STARTED=true
      break
    fi
    echo "    Waiting... ($i/5)"
  done

  if ! curl -s "$OLLAMA_URL" --max-time 2 &>/dev/null; then
    fail "Server failed to start. Check /tmp/ollama-serve.log"
    exit 1
  fi
fi
echo ""

# ── Step 3: Show environment config ───────────────────
echo "── Step 3: Active environment config ──"
echo "    OLLAMA_HOST=$OLLAMA_HOST"
echo "    OLLAMA_MODELS=$OLLAMA_MODELS"
echo "    OLLAMA_KEEP_ALIVE=$OLLAMA_KEEP_ALIVE"
echo "    OLLAMA_NUM_GPU=$OLLAMA_NUM_GPU"
echo "    OLLAMA_MAX_LOADED_MODELS=$OLLAMA_MAX_LOADED_MODELS"
echo ""

# ── Step 4: List existing models ──────────────────────
echo "── Step 4: Installed models ──"
MODELS=$(ollama list 2>/dev/null)
if [ -n "$MODELS" ] && [ "$(echo "$MODELS" | wc -l)" -gt 1 ]; then
  echo "$MODELS"
else
  warn "No models installed yet"
fi
echo ""

# ── Step 5: Pull model if not present ─────────────────
echo "── Step 5: Ensuring model '$MODEL' is available ──"
if ollama list 2>/dev/null | grep -q "$MODEL"; then
  status "Model '$MODEL' is already downloaded"
else
  warn "Pulling '$MODEL'... (this may take a few minutes)"
  if ollama pull "$MODEL" 2>&1; then
    status "Model '$MODEL' ready"
  else
    warn "Could not pull '$MODEL' (network issue?). Pull it manually later:"
    echo "    ollama pull $MODEL"
  fi
fi
echo ""

# ── Step 6: Quick test ────────────────────────────────
echo "── Step 6: Quick API test ──"
if ollama list 2>/dev/null | grep -q "$MODEL"; then
  RESPONSE=$(curl -s "$OLLAMA_URL/api/generate" \
    -d "{\"model\": \"$MODEL\", \"prompt\": \"Say hello in 5 words\", \"stream\": false}" \
    --max-time 60 2>/dev/null)

  if echo "$RESPONSE" | grep -q "response"; then
    ANSWER=$(echo "$RESPONSE" | grep -oP '"response"\s*:\s*"\K[^"]+' | head -1)
    status "API working! Response: $ANSWER"
  else
    warn "API test failed (model may still be loading). Try manually:"
    echo "    curl $OLLAMA_URL/api/generate -d '{\"model\":\"$MODEL\",\"prompt\":\"hi\",\"stream\":false}'"
  fi
else
  warn "No model available to test. Pull one first: ollama pull $MODEL"
fi
echo ""

# ── Summary ───────────────────────────────────────────
echo "  ╔══════════════════════════════════════╗"
echo "  ║           ALL GOOD!                  ║"
echo "  ╠══════════════════════════════════════╣"
echo "  ║  Server: $OLLAMA_URL            ║"
echo "  ║  Model:  $MODEL                      ║"
echo "  ║  No API key needed (local)           ║"
echo "  ╚══════════════════════════════════════╝"
echo ""
echo "  Usage:"
echo "    curl $OLLAMA_URL/api/generate -d '{\"model\":\"$MODEL\",\"prompt\":\"hi\"}'"
echo ""
echo "  To stop:  pkill ollama"
echo "  To check: curl $OLLAMA_URL"
echo ""
