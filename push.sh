#!/usr/bin/env bash
# push.sh — bulletproof GitHub upload using a Personal Access Token.
# No gh CLI, no browser device flow, no set -e silent exits.
# Every step prints what it's doing and what it got back.

# Colors
G='\033[1;32m'; C='\033[1;36m'; Y='\033[1;33m'; R='\033[1;31m'; B='\033[1;35m'; N='\033[0m'
say()   { echo -e "${C}❯${N} $*"; }
ok()    { echo -e "${G}✓${N} $*"; }
warn()  { echo -e "${Y}!${N} $*"; }
fail()  { echo -e "${R}✗${N} $*"; exit 1; }
step()  { echo -e "\n${B}── $* ──${N}"; }

clear
echo -e "${B}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${N}"
echo -e "${B}  🌌  Infiniteworlds · GitHub Push${N}"
echo -e "${B}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${N}\n"

# ── 0. Sanity ────────────────────────────────────────────────────────
step "0. Sanity check"
if [ ! -f package.json ] || [ ! -d server ] || [ ! -d client ]; then
  fail "Run from the Infiniteworlds project root (need package.json + server/ + client/)."
fi
ok "In project root"

command -v git >/dev/null 2>&1 || { warn "Installing git…"; pkg install -y git || apt install -y git || fail "Install git manually."; }
command -v curl >/dev/null 2>&1 || { warn "Installing curl…"; pkg install -y curl || apt install -y curl || fail "Install curl manually."; }
ok "git + curl present"

# ── 1. Inputs ────────────────────────────────────────────────────────
step "1. Repo info"

echo -en "${C}❯${N} GitHub username: "
read -r GH_USER
[ -z "$GH_USER" ] && fail "Username required."

echo -en "${C}❯${N} Repo name [Infiniteworlds]: "
read -r REPO_NAME
REPO_NAME="${REPO_NAME:-Infiniteworlds}"

echo -en "${C}❯${N} Commit message [chore: fresh sync]: "
read -r COMMIT_MSG
COMMIT_MSG="${COMMIT_MSG:-chore: fresh sync}"

echo
warn "Need a GitHub Personal Access Token (PAT) with 'repo' scope."
warn "Create one: https://github.com/settings/tokens/new"
warn "  → Note: 'Infiniteworlds push'"
warn "  → Expiration: 90 days (or longer)"
warn "  → Scopes: tick the 'repo' checkbox (top of list)"
warn "  → Click 'Generate token' at bottom, COPY the ghp_... string"
echo
echo -en "${C}❯${N} Paste your PAT (input hidden, just paste + Enter): "
stty -echo
read -r GH_TOKEN
stty echo
echo
[ -z "$GH_TOKEN" ] && fail "Token required."
ok "Token received (${#GH_TOKEN} chars)"

# ── 2. Verify the token works ────────────────────────────────────────
step "2. Verify token"
AUTH_TEST=$(curl -sS -o /dev/null -w "%{http_code}" -H "Authorization: token ${GH_TOKEN}" https://api.github.com/user)
if [ "$AUTH_TEST" = "200" ]; then
  ok "Token valid. Authenticated as $(curl -sS -H "Authorization: token ${GH_TOKEN}" https://api.github.com/user | grep -o '"login":"[^"]*' | cut -d'"' -f4)"
elif [ "$AUTH_TEST" = "401" ]; then
  fail "Token rejected (401). Re-generate with 'repo' scope at https://github.com/settings/tokens/new"
else
  fail "GitHub API returned HTTP ${AUTH_TEST}. Check network."
fi

# ── 3. Replace YOUR_USERNAME placeholders ────────────────────────────
step "3. Replace placeholders"
for f in README.md CITATION.cff .github/FUNDING.yml; do
  if [ -f "$f" ]; then
    if [ "$(uname)" = "Darwin" ]; then sed -i '' "s|YOUR_USERNAME|${GH_USER}|g" "$f" 2>/dev/null
    else sed -i "s|YOUR_USERNAME|${GH_USER}|g" "$f" 2>/dev/null; fi
    ok "Patched $f"
  fi
done

# ── 4. Create repo if it doesn't exist ───────────────────────────────
step "4. Repo check / create"
REPO_CHECK=$(curl -sS -o /dev/null -w "%{http_code}" -H "Authorization: token ${GH_TOKEN}" "https://api.github.com/repos/${GH_USER}/${REPO_NAME}")

if [ "$REPO_CHECK" = "200" ]; then
  warn "Repo ${GH_USER}/${REPO_NAME} exists — will FORCE-PUSH and overwrite."
  echo -en "${Y}!${N} Type 'overwrite' to confirm: "
  read -r CONF
  [ "$CONF" != "overwrite" ] && fail "Cancelled."
elif [ "$REPO_CHECK" = "404" ]; then
  echo -en "${C}❯${N} Visibility public/private [public]: "
  read -r VIS
  VIS="${VIS:-public}"
  PRIVATE=$([ "$VIS" = "private" ] && echo "true" || echo "false")
  say "Creating ${VIS} repo…"
  CREATE_RES=$(curl -sS -X POST -H "Authorization: token ${GH_TOKEN}" -H "Accept: application/vnd.github+json" \
    -d "{\"name\":\"${REPO_NAME}\",\"private\":${PRIVATE},\"description\":\"Voice-interactive AI-driven 3D world engine — Whispers-tier visuals.\"}" \
    https://api.github.com/user/repos)
  if echo "$CREATE_RES" | grep -q '"clone_url"'; then
    ok "Repo created: https://github.com/${GH_USER}/${REPO_NAME}"
  else
    echo "$CREATE_RES" | head -20
    fail "Repo creation failed (see response above)."
  fi
else
  fail "Repo check failed (HTTP ${REPO_CHECK})."
fi

# ── 5. Git init / commit ─────────────────────────────────────────────
step "5. Local git"
rm -rf .git
git init -b main 2>&1 | tail -1
git config user.name  "${GH_USER}"
git config user.email "${GH_USER}@users.noreply.github.com"
ok "Git initialized"

git add -A
COMMIT_OUT=$(git commit -m "$COMMIT_MSG" 2>&1)
if echo "$COMMIT_OUT" | grep -qE "(nothing to commit|main)"; then
  ok "Commit created"
else
  echo "$COMMIT_OUT"
  fail "Commit failed (see above)."
fi

# ── 6. Push using token-in-URL ───────────────────────────────────────
step "6. Push to GitHub"
REMOTE_URL="https://${GH_USER}:${GH_TOKEN}@github.com/${GH_USER}/${REPO_NAME}.git"
git remote remove origin 2>/dev/null
git remote add origin "$REMOTE_URL"

say "Pushing… (this is where it'll print the real error if any)"
PUSH_OUT=$(git push --force --set-upstream origin main 2>&1)
PUSH_RC=$?
echo "$PUSH_OUT"

if [ $PUSH_RC -eq 0 ]; then
  ok "🎉 Pushed → https://github.com/${GH_USER}/${REPO_NAME}"
  # Scrub the token from origin so it doesn't sit in .git/config
  git remote set-url origin "https://github.com/${GH_USER}/${REPO_NAME}.git"
  ok "Token scrubbed from .git/config"
  echo
  echo -e "${G}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${N}"
  echo -e "${G}  ✓ DONE  → https://github.com/${GH_USER}/${REPO_NAME}${N}"
  echo -e "${G}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${N}"
else
  fail "Push failed (rc=${PUSH_RC}). See output above."
fi
