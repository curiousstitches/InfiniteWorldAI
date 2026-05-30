#!/usr/bin/env bash
# install.sh — one-line installer for Infiniteworlds.
# Usage:  curl -fsSL https://raw.githubusercontent.com/curiousstitches/InfiniteWorldAI/main/install.sh | bash
#
# Detects Termux / macOS / Linux, installs deps, clones the repo (if not in one),
# runs npm install on both packages, copies .env.example → .env, then prints the
# next-steps to boot both servers.

set -e

G='\033[1;32m'; C='\033[1;36m'; Y='\033[1;33m'; R='\033[1;31m'; B='\033[1;35m'; N='\033[0m'
say()  { echo -e "${C}❯${N} $*"; }
ok()   { echo -e "${G}✓${N} $*"; }
warn() { echo -e "${Y}!${N} $*"; }
fail() { echo -e "${R}✗${N} $*"; exit 1; }
step() { echo -e "\n${B}── $* ──${N}"; }

REPO_URL="${REPO_URL:-https://github.com/curiousstitches/InfiniteWorldAI.git}"
TARGET_DIR="${TARGET_DIR:-$HOME/Infiniteworlds}"

clear
echo -e "${B}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${N}"
echo -e "${B}  🌌  Infiniteworlds · Installer${N}"
echo -e "${B}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${N}"

# ── 1. Detect platform & install runtime deps ──────────────────────
step "1. Platform detection"
if [ -n "$PREFIX" ] && [ -d "/data/data/com.termux" ]; then
  PLATFORM="termux"
elif [ "$(uname)" = "Darwin" ]; then
  PLATFORM="macos"
elif [ -f /etc/debian_version ]; then
  PLATFORM="debian"
elif [ -f /etc/redhat-release ]; then
  PLATFORM="redhat"
else
  PLATFORM="unknown"
fi
ok "Platform: $PLATFORM"

install_deps() {
  case "$PLATFORM" in
    termux)
      pkg update -y >/dev/null 2>&1 || true
      pkg install -y git curl unzip nodejs-lts python make clang
      ;;
    macos)
      command -v brew >/dev/null || fail "Install Homebrew first: https://brew.sh"
      brew install git node@22 python make 2>/dev/null || true
      ;;
    debian)
      sudo apt update && sudo apt install -y git curl unzip nodejs npm python3 make build-essential
      ;;
    redhat)
      sudo dnf install -y git curl unzip nodejs npm python3 make gcc-c++
      ;;
    *)
      warn "Unknown platform — assuming git + node are already installed"
      ;;
  esac
}

step "2. Installing runtime deps"
if command -v node >/dev/null && command -v git >/dev/null && command -v npm >/dev/null; then
  ok "Node + git + npm already installed"
else
  install_deps
fi

node -v >/dev/null 2>&1 || fail "Node install failed — install Node.js 22+ manually"
NODE_MAJOR=$(node -v | sed 's/v//' | cut -d. -f1)
[ "$NODE_MAJOR" -ge 22 ] || warn "Node $NODE_MAJOR detected — Node 22+ recommended"
ok "Node $(node -v) · npm $(npm -v) · git $(git --version | awk '{print $3}')"

# ── 3. Clone or update ──────────────────────────────────────────────
step "3. Fetch project"
if [ -d "$TARGET_DIR/.git" ]; then
  cd "$TARGET_DIR"
  git pull origin main || warn "Pull failed — continuing with local copy"
  ok "Updated existing clone at $TARGET_DIR"
elif [ -f "$TARGET_DIR/package.json" ] && [ -d "$TARGET_DIR/server" ]; then
  cd "$TARGET_DIR"
  ok "Using existing extracted copy at $TARGET_DIR"
else
  git clone "$REPO_URL" "$TARGET_DIR"
  cd "$TARGET_DIR"
  ok "Cloned to $TARGET_DIR"
fi

# ── 4. Install package deps ────────────────────────────────────────
step "4. Install npm dependencies (this takes 2-5 min)"
say "Installing server deps…"
npm install --prefix server --no-audit --no-fund --loglevel=error
ok "Server installed"

say "Installing client deps…"
npm install --prefix client --no-audit --no-fund --loglevel=error
ok "Client installed"

# ── 5. .env scaffold ───────────────────────────────────────────────
step "5. Environment file"
if [ ! -f .env ]; then
  cp .env.example .env
  ok ".env created from .env.example (all keys optional)"
else
  ok ".env already exists — left as-is"
fi

# ── 6. Done ────────────────────────────────────────────────────────
echo
echo -e "${G}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${N}"
echo -e "${G}  ✓ Installed at: $TARGET_DIR${N}"
echo -e "${G}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${N}"
echo
echo -e "${C}Next:${N}"
echo
echo "  # Boot the backend (keep this running)"
echo "  cd $TARGET_DIR && node server/index.js"
echo
echo "  # In a new terminal, boot the frontend"
echo "  cd $TARGET_DIR && npm run dev --prefix client -- --host"
echo
echo "  # Open the URL Vite prints (usually http://localhost:5173 or http://192.168.x.x:5173)"
echo
echo -e "${C}Optional:${N} edit .env to add API keys (Groq for free Whisper, ElevenLabs for lifelike TTS, etc)"
echo -e "${C}Demo:${N} no live-demo URL yet? See README → Deploy a live demo"
