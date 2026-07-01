#!/usr/bin/env node
// claude-md-lint — an instruction-budget linter for CLAUDE.md / agent system files.
// Why this exists: model instruction-following degrades NON-LINEARLY with rule count.
// Frontier models reliably hold ~150–200 instructions, and the tool's own system prompt
// already eats a chunk of that budget. As a CLAUDE.md grows, adherence quietly drops —
// the model silently ignores rules rather than erroring. This linter measures your file
// against that budget and flags the patterns that waste it.
//
// Zero dependencies. Usage:
//   npx claude-md-lint <path>            # default ./CLAUDE.md
//   node index.mjs CLAUDE.md --json      # machine-readable output
//
// MIT licensed. Built by Penloom — https://penloomstudio.com
// Free field guide (7 reliability rules + paste-ready guardrails): https://penloomstudio.com/field-guide.html

import fs from "fs";

const BUDGET_SOFT = 150;   // adherence visibly drops past here
const BUDGET_HARD = 200;   // frontier ceiling; beyond this rules are routinely dropped

const args = process.argv.slice(2);
const json = args.includes("--json");
const file = args.find(a => !a.startsWith("--")) || "CLAUDE.md";

if (!fs.existsSync(file)) {
  console.error(`claude-md-lint: file not found: ${file}\nUsage: npx claude-md-lint <path-to-CLAUDE.md>`);
  process.exit(2);
}

const raw = fs.readFileSync(file, "utf8");
const lines = raw.split(/\r?\n/);

// --- Identify "instructions": bullets, numbered items, and imperative directive lines.
// Skip code fences, headings, blank lines, and pure prose without a directive verb.
const IMPERATIVE = /\b(always|never|must|do not|don't|use|avoid|ensure|prefer|require|only|follow|include|write|run|check|read|keep|set|add|remove|return|treat|obey|respect|stop|refuse)\b/i;
// Reason heuristic (line-level, imperfect): a connective word, OR an em-dash / colon
// that introduces an explanatory clause on the same line.
const REASON = /(\b(because|so that|so it|to avoid|to prevent|otherwise|which|since|in order to|that way|protects?|risks?)\b)|[—–:]\s+\S/i;
const MUST_HAPPEN = /\b(always|never|must|every time|on every|each time|without exception)\b/i;

let inFence = false;
const rules = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (/^```/.test(line.trim())) { inFence = !inFence; continue; }
  if (inFence) continue;
  const t = line.trim();
  if (!t) continue;
  if (/^#{1,6}\s/.test(t)) continue;            // heading
  if (/^>/.test(t)) continue;                   // blockquote
  const isList = /^([-*+]|\d+[.)])\s+/.test(t);
  const isImperative = IMPERATIVE.test(t);
  if (isList || isImperative) {
    rules.push({ n: i + 1, text: t.replace(/^([-*+]|\d+[.)])\s+/, "") });
  }
}

const count = rules.length;
const noReason = rules.filter(r => !REASON.test(r.text));
const mustHappen = rules.filter(r => MUST_HAPPEN.test(r.text));
const longRules = rules.filter(r => r.text.split(/\s+/).length > 40);

// --- Score: start at 100, subtract for budget overrun and waste patterns.
let score = 100;
if (count > BUDGET_HARD) score -= 40;
else if (count > BUDGET_SOFT) score -= 20;
score -= Math.min(20, Math.round((noReason.length / Math.max(1, count)) * 20));
score -= Math.min(10, Math.round((longRules.length / Math.max(1, count)) * 10));
score = Math.max(0, score);

const findings = [];
if (count > BUDGET_HARD)
  findings.push(`OVER HARD BUDGET: ${count} instructions (> ${BUDGET_HARD}). Past this, models routinely drop rules. Split the file and load detail on demand (progressive disclosure).`);
else if (count > BUDGET_SOFT)
  findings.push(`Over soft budget: ${count} instructions (> ${BUDGET_SOFT}). Adherence drops as the file grows — trim or graduate rules into hooks.`);
else
  findings.push(`Within budget: ${count} instructions (target ≤ ${BUDGET_SOFT}).`);

if (noReason.length)
  findings.push(`${noReason.length} rule(s) appear to give no REASON (heuristic). A rule with a "why" generalizes to unseen cases; a bare command doesn't. Add "— so that …".`);
if (mustHappen.length)
  findings.push(`${mustHappen.length} "must-happen" rule(s) (always/never/must). A prose rule lands ~80% of the time; a deterministic hook fires ~100%. Graduate the critical ones into hooks.`);
if (longRules.length)
  findings.push(`${longRules.length} rule(s) over 40 words. Long rules bury the directive — tighten to one clear instruction each.`);

if (json) {
  console.log(JSON.stringify({ file, count, score, budget: { soft: BUDGET_SOFT, hard: BUDGET_HARD },
    noReason: noReason.length, mustHappen: mustHappen.length, longRules: longRules.length, findings }, null, 2));
  process.exit(0);
}

const bar = score >= 80 ? "🟢" : score >= 60 ? "🟡" : "🔴";
console.log(`\nclaude-md-lint  ${file}`);
console.log(`${"─".repeat(48)}`);
console.log(`Instruction budget score: ${bar} ${score}/100`);
console.log(`Instructions counted: ${count}  (soft ${BUDGET_SOFT} / hard ${BUDGET_HARD})\n`);
for (const f of findings) console.log(` • ${f}`);
if (mustHappen.length) {
  console.log(`\nTop must-happen rules to consider moving into hooks:`);
  for (const r of mustHappen.slice(0, 5)) console.log(`   L${r.n}: ${r.text.slice(0, 90)}${r.text.length > 90 ? "…" : ""}`);
}
console.log(`\nWant the exact fixes for what this flagged? The CLAUDE.md Optimizer Pack ($2.99) — a 60-sec scorecard, 5 before→after rewrites + paste-ready templates: https://buy.stripe.com/aFa6oGcJk2zQ5HtdP13F607`);
console.log(`Free first: the reliability field guide (rules + paste-ready guardrails): https://penloomstudio.com/field-guide.html\n`);
process.exit(score >= 60 ? 0 : 1);
