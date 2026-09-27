#!/bin/bash
# Installs gstack (https://github.com/garrytan/gstack) for Claude Code on the web.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

GSTACK_DIR="$HOME/.claude/skills/gstack"

if [ ! -d "$GSTACK_DIR/.git" ]; then
  mkdir -p "$HOME/.claude/skills"
  git clone --quiet --single-branch --depth 1 https://github.com/garrytan/gstack.git "$GSTACK_DIR"
fi

cd "$GSTACK_DIR"
bun install --silent >/dev/null

# The network policy blocks Playwright's browser CDN, so alias the Chromium
# revision gstack's Playwright expects to the one preinstalled in the image.
PW_PATH="${PLAYWRIGHT_BROWSERS_PATH:-/opt/pw-browsers}"
want=$(bun -e 'const b=require("./node_modules/playwright-core/browsers.json").browsers; console.log(b.find(x=>x.name==="chromium").revision)')
have=$(ls -d "$PW_PATH"/chromium-[0-9]* 2>/dev/null | sed 's/.*chromium-//' | sort -n | tail -1)
if [ -n "$want" ] && [ -n "$have" ] && [ "$want" != "$have" ]; then
  full="$PW_PATH/chromium-$want/chrome-linux64"
  shell="$PW_PATH/chromium_headless_shell-$want/chrome-headless-shell-linux64"
  mkdir -p "$full" "$shell"
  for f in "$PW_PATH/chromium-$have/chrome-linux/"*; do ln -sfn "$f" "$full/"; done
  for f in "$PW_PATH/chromium_headless_shell-$have/chrome-linux/"*; do ln -sfn "$f" "$shell/"; done
  ln -sfn "$PW_PATH/chromium_headless_shell-$have/chrome-linux/headless_shell" "$shell/chrome-headless-shell"
  touch "$PW_PATH/chromium-$want/INSTALLATION_COMPLETE" "$PW_PATH/chromium-$want/DEPENDENCIES_VALIDATED" \
        "$PW_PATH/chromium_headless_shell-$want/INSTALLATION_COMPLETE" "$PW_PATH/chromium_headless_shell-$want/DEPENDENCIES_VALIDATED"
fi

./setup --quiet --no-plan-tune-hooks >/dev/null 2>&1 || ./setup --no-plan-tune-hooks
