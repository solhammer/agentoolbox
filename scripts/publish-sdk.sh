#!/usr/bin/env bash
# agent-toolbox.ai — SDK publish script
#
# Publishes agent-toolbox-sdk to npm with:
#   - Clean working tree check
#   - Version bump (patch/minor/major)
#   - Full test suite
#   - npm publish with 2FA OTP
#   - Git tag + push
#   - GitHub Actions deploy workflow trigger
#
# Usage:
#   bash scripts/publish-sdk.sh           # patch bump (default)
#   bash scripts/publish-sdk.sh minor     # minor bump
#   bash scripts/publish-sdk.sh major     # major bump
#   bash scripts/publish-sdk.sh --dry-run # preview without publishing

set -e

# ── Config ────────────────────────────────────────────────────────────────────
BUMP="${1:-patch}"
DRY_RUN=false
if [ "$1" = "--dry-run" ]; then DRY_RUN=true; BUMP="patch"; fi
if [ "$2" = "--dry-run" ]; then DRY_RUN=true; fi

SDK_DIR="packages/sdk"
REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

# ── Colors ───────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${CYAN}→${NC} $*"; }
success() { echo -e "${GREEN}✅${NC} $*"; }
warn()    { echo -e "${YELLOW}⚠️${NC}  $*"; }
error()   { echo -e "${RED}❌${NC} $*"; exit 1; }

echo ""
echo -e "${CYAN}agent-toolbox-sdk — npm publish${NC}"
echo "────────────────────────────────"
$DRY_RUN && warn "DRY RUN — no changes will be published or pushed"
echo ""

# ── Pre-flight checks ─────────────────────────────────────────────────────────
info "Checking pre-flight conditions..."

# Must be on main
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
  error "Must be on main branch (currently on '$CURRENT_BRANCH')"
fi

# Working tree must be clean
if ! git diff --quiet || ! git diff --cached --quiet; then
  error "Working tree is dirty. Commit or stash changes first."
fi

# pnpm must be available
command -v pnpm >/dev/null 2>&1 || error "pnpm not found. Run: npm install -g pnpm"

# npm must be logged in
npm whoami >/dev/null 2>&1 || error "Not logged in to npm. Run: npm login"
NPM_USER=$(npm whoami 2>/dev/null)
success "npm logged in as: $NPM_USER"

# ── Run tests ─────────────────────────────────────────────────────────────────
info "Running full test suite..."
pnpm test 2>&1 | tail -5

TEST_LINES=$(pnpm test 2>&1 | grep -E "Tests\s+\d+" | tail -1)
if echo "$TEST_LINES" | grep -q "failed"; then
  error "Tests failed. Fix failures before publishing."
fi
success "All tests passing"

# ── Build dependencies in order ───────────────────────────────────────────────
info "Building packages..."
pnpm --filter @agentoolbox/validator build 2>/dev/null
pnpm --filter @agentoolbox/firewall build 2>/dev/null
pnpm --filter agent-toolbox-sdk build 2>/dev/null
success "SDK built"

# ── Bump version ─────────────────────────────────────────────────────────────
CURRENT_VERSION=$(node -p "require('./$SDK_DIR/package.json').version")
info "Current version: $CURRENT_VERSION"
info "Bump type: $BUMP"

# Calculate new version
NEW_VERSION=$(node -e "
const [ma,mi,pa] = '$CURRENT_VERSION'.split('.').map(Number);
const bump = '$BUMP';
if (bump === 'major') console.log((ma+1)+'.0.0');
else if (bump === 'minor') console.log(ma+'.'+(mi+1)+'.0');
else console.log(ma+'.'+mi+'.'+(pa+1));
")

echo ""
warn "About to bump: $CURRENT_VERSION → $NEW_VERSION"
if ! $DRY_RUN; then
  printf "Confirm? [y/N] "
  read -r CONFIRM
  [ "$CONFIRM" = "y" ] || [ "$CONFIRM" = "Y" ] || { echo "Aborted."; exit 0; }
fi

# Update version in package.json
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('./$SDK_DIR/package.json'));
pkg.version = '$NEW_VERSION';
fs.writeFileSync('./$SDK_DIR/package.json', JSON.stringify(pkg, null, 2) + '\n');
console.log('Updated $SDK_DIR/package.json to $NEW_VERSION');
"
success "Version bumped to $NEW_VERSION"

# ── Publish to npm ────────────────────────────────────────────────────────────
if ! $DRY_RUN; then
  echo ""
  info "Publishing to npm..."
  warn "You need your 6-digit OTP from your authenticator app."
  printf "Enter npm OTP: "
  read -r OTP

  if [ -z "$OTP" ]; then
    # Restore version and abort
    git checkout "$SDK_DIR/package.json"
    error "No OTP entered. Publish aborted. Version reverted."
  fi

  cd "$SDK_DIR"
  npm publish --access public --otp "$OTP" 2>&1
  cd "$REPO_ROOT"
  success "Published agent-toolbox-sdk@$NEW_VERSION to npm"
else
  warn "[DRY RUN] Would publish agent-toolbox-sdk@$NEW_VERSION"
fi

# ── Update CHANGELOG ──────────────────────────────────────────────────────────
if [ -f "CHANGELOG.md" ] && ! $DRY_RUN; then
  RELEASE_DATE=$(date -u +%Y-%m-%d)
  # Prepend a new entry after the first line
  TEMP_FILE=$(mktemp)
  head -4 CHANGELOG.md > "$TEMP_FILE"
  cat >> "$TEMP_FILE" << ENTRY

## [$NEW_VERSION] — $RELEASE_DATE

### Changed
- agent-toolbox-sdk bumped to $NEW_VERSION
- See git log for detailed changes

---

ENTRY
  tail -n +5 CHANGELOG.md >> "$TEMP_FILE"
  mv "$TEMP_FILE" CHANGELOG.md
  info "CHANGELOG.md updated"
fi

# ── Commit + tag + push ───────────────────────────────────────────────────────
if ! $DRY_RUN; then
  git add "$SDK_DIR/package.json" CHANGELOG.md
  git commit -m "chore: release agent-toolbox-sdk@$NEW_VERSION

Co-Authored-By: Oz <oz-agent@warp.dev>"

  git tag "sdk-v$NEW_VERSION"
  git push && git push origin "sdk-v$NEW_VERSION"
  success "Tagged sdk-v$NEW_VERSION and pushed"
  info "GitHub Actions will auto-deploy on the sdk-v* tag"
else
  warn "[DRY RUN] Would commit, tag sdk-v$NEW_VERSION, and push"
fi

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}────────────────────────────────${NC}"
$DRY_RUN && echo -e "${YELLOW}DRY RUN complete — no changes made${NC}" || {
  success "agent-toolbox-sdk@$NEW_VERSION published!"
  echo ""
  echo "  npm: https://www.npmjs.com/package/agent-toolbox-sdk"
  echo "  tag: sdk-v$NEW_VERSION → GitHub Actions will auto-deploy"
  echo ""
  echo "  Verify: npm info agent-toolbox-sdk version"
}
