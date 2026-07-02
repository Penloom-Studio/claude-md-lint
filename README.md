# claude-md-lint

**An instruction-budget linter for `CLAUDE.md` and agent system files.**

Your `CLAUDE.md` keeps growing, and at some point Claude Code starts quietly ignoring parts of it. That's not a bug — it's a budget. Instruction-following degrades **non-linearly** with rule count: frontier models reliably hold roughly **150–200 instructions**, and the tool's own system prompt already spends a chunk of that. Past the budget, rules don't error — they just silently stop landing.

`claude-md-lint` measures your file against that budget and flags the patterns that waste it.

```bash
npx github:Penloom-Studio/claude-md-lint CLAUDE.md
```

No install, no dependencies, nothing leaves your machine.

> **Heads-up:** the `claude-md-lint` package on the npm registry is an unrelated project by a
> different author. Use the `github:` form above (or clone this repo) to get this tool.

## What it checks

- **Instruction count vs. budget** — soft limit 150, hard limit 200. Over the hard limit, models routinely drop rules.
- **Rules with no reason** — a rule that says *why* generalizes to cases you didn't anticipate; a bare command doesn't. (Heuristic, line-level.)
- **"Must-happen" rules in prose** — `always` / `never` / `must` rules land ~80% of the time as prose, but a deterministic **hook** fires ~100%. The linter lists the critical ones to graduate into hooks.
- **Overlong rules** — rules over 40 words bury the actual directive.

It prints a 0–100 budget score and an actionable summary. Use `--json` for CI.

```bash
node index.mjs CLAUDE.md --json
```

Exit code is `0` when the score is healthy (≥ 60) and `1` when it isn't — drop it in a pre-commit hook to keep your instruction file lean over time.

## Example

```
claude-md-lint  CLAUDE.md
────────────────────────────────────────────────
Instruction budget score: 🟡 72/100
Instructions counted: 168  (soft 150 / hard 200)

 • Over soft budget: 168 instructions (> 150). Adherence drops as the file grows — trim or graduate rules into hooks.
 • 41 "must-happen" rule(s). A prose rule lands ~80% of the time; a deterministic hook fires ~100%. Graduate the critical ones.
```

## Why these numbers?

The budget framing comes from how adherence actually falls off as instruction count climbs, and from the gap between a *prose* rule and a *deterministic* rule. We wrote up the full reasoning here:

- **Why your CLAUDE.md is too long — and that's why Claude Code ignores it** → https://penloomstudio.com/claude-md-budget.html

## Going further

This linter tells you *where* your instruction file leaks. If you want the fixes:

- **The CLAUDE.md Optimizer Pack ($2.99)** — the exact fixes for what this linter flags: a 60-second scorecard, the mechanism in plain English, five real before→after rewrites, and drop-in templates you can paste today (works for Claude Code, the API, or Cursor): **[get it →](https://buy.stripe.com/aFa6oGcJk2zQ5HtdP13F607)**
- **Free field guide** — 7 reliability rules + paste-ready Claude Code guardrails + a pre-ship checklist: **https://penloomstudio.com/field-guide.html**
- **The Claude Code Power-User Pack ($17)** — going deeper: lean `CLAUDE.md` templates, ready-made subagents, and the deterministic **hooks** this linter keeps telling you to write: **https://penloomstudio.com**

Built by [Penloom](https://penloomstudio.com). MIT licensed — fork it, ship it, send a PR.
