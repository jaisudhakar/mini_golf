# CLAUDE.md

## gstack

gstack is installed to `~/.claude/skills/gstack` by `.claude/hooks/session-start.sh` on each Claude Code on the web session.

- Use the `/browse` skill from gstack for all web browsing. Never use `mcp__claude-in-chrome__*` tools.
- Available skills: /office-hours, /plan-ceo-review, /plan-eng-review, /plan-design-review, /design-consultation, /design-shotgun, /design-html, /review, /deslop-shared-libs, /ship, /land-and-deploy, /canary, /benchmark, /browse, /connect-chrome, /qa, /qa-only, /design-review, /scrape, /setup-browser-cookies, /setup-deploy, /setup-gbrain, /retro, /investigate, /document-release, /document-generate, /codex, /cso, /autoplan, /plan-devex-review, /devex-review, /careful, /freeze, /guard, /unfreeze, /gstack-upgrade, /learn.
- In cloud sessions the browser can't reach the public internet (the network policy blocks it). To QA this site, serve it locally (`python3 -m http.server 8000`) and point `/qa` or `/browse` at `http://localhost:8000/`.
