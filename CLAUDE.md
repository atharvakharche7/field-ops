# FieldOps: rules for Claude

The spec for this project is [FieldOps Project Requirements Document.md](FieldOps%20Project%20Requirements%20Document.md). Follow its names, endpoints and folder structure.

## Identity and accounts (hard rules)

- **Git identity:** `atharvakharche7 <101042361+atharvakharche7@users.noreply.github.com>`, set in this repo's local git config so commits link to the GitHub profile. Never pass `-c user.name` / `-c user.email` overrides.
- **No AI attribution in git:** never add `Co-Authored-By: Claude …` (or any other AI co-author line) to commit messages, and never add "Generated with Claude Code" to PR descriptions.
- **Never use the email of the Claude account this session is logged into**, and never use that organisation's name in any form. That account belongs to a different organisation. Neither may appear in commits, commit messages, code, configs, READMEs, `package.json`, `app.json` or any other file. Check for both before every commit and push.
- **Never use the claude.ai connectors or MCP tools that come with the logged-in account.** That covers Gmail, Google Drive, Google Calendar, Google Sheets, Atlassian (Jira/Confluence), Figma, Claude Docs, Sanity, Shopify and any other `claude.ai` connector. They are authenticated with someone else's account.
- **Don't use the account's bundled skills** (for example the organisation's QA test suites), and don't publish to its claude.ai Artifacts.
- **If a connector is needed**, say so and stop. The user installs it locally and authenticates it with their own account first.

## Workflow

- **Package manager:** use pnpm only, never npm or npx. `pnpm add`, `pnpm expo install`, `pnpm expo start`, `pnpm dlx <tool>`, `pnpm exec <bin>`. Keep `mobile/.npmrc` (`node-linker=hoisted`).
- **Git:** one branch per work chunk, off `main`. Use conventional prefixes (`feat/`, `fix/`, `chore/`, `docs/`, `test/`) and never put "day" in a branch name.
- **Explanations:** after every step, explain what was done and every new tool or term in simple, beginner-friendly language.
