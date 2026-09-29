# AGENTS.md

Instructions for AI coding agents working on the Serika Streaming desktop app.

## Always bump the version

`version.txt` holds this repo's version: one line, `MAJOR.MINOR.PATCH` (for example `1.0.30`).

**Every change you make here must raise it, in the same commit as the change.**

- **Patch** (`1.0.30` → `1.0.31`): fixes, tweaks and anything small. This is the default.
- **Minor** (`1.0.31` → `1.1.0`): a new feature users will notice.
- **Major** (`1.1.0` → `2.0.0`): only when you are asked to.

Bump once per task, not once per commit. If a task takes several commits, raise it in the first one and leave it there. Never lower it or reuse a number.

Keep these in step with `version.txt` whenever you bump it:

- `package.json` → `version` (the release workflow tags builds `v<version>-<timestamp>-<sha>` from it)

## Why it matters

Raising `version.txt` on `main` is what releases this to users.
[SerikaChangelog](https://github.com/serika-dev/SerikaChangelog) checks it every
15 minutes. When the number goes up, it turns every commit since the previous
version into a short, plain-language announcement in the Serika Discord. Other
Serika Streaming repos bumped around the same time go into the same post. Commit
messages are the raw material, so say in them what changed for users.
