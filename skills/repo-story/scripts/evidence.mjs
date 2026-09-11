#!/usr/bin/env node
/**
 * evidence.mjs — compress a repo's full history into a compact, purely factual
 * evidence pack for an LLM to write a narrative from.
 *
 * ZERO LLM. Every line is derived from git.
 *
 * Why this exists: handing a model a raw commit log asks it to do two hard things
 * at once — find the signal, and write the story. This script does the first job
 * deterministically, so the model only does the second. The pack stays roughly
 * constant in size whether the repo has 400 commits or 400,000, because it reports
 * aggregates rather than commits. That is what makes small/local models viable.
 *
 * Usage:
 *   node scripts/evidence.mjs [repoPath] [-o EVIDENCE.md] [--all] [--top N]
 */

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { assertUsableRepo, repoName, repoRoot, streamLog, git, isBot, statsFor } from './lib/git.mjs';
import { collapse, splitConventional } from './lib/collapse.mjs';
import { resolveOut, gitignoreHint } from './lib/outpath.mjs';
import { VERSION } from './lib/version.mjs';

const MANIFESTS = [
  'package.json', 'requirements.txt', 'pyproject.toml', 'go.mod', 'Cargo.toml',
  'Gemfile', 'pom.xml', 'build.gradle', 'composer.json', 'Dockerfile', 'flake.nix',
];

function parseArgs(argv) {
  const o = { repo: '.', out: null, all: false, top: 25, patterns: 30, excludeBots: false };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case '-o': case '--out': o.out = next(); break;
      case '--all': o.all = true; break;
      case '--top': o.top = +next(); break;
      case '--patterns': o.patterns = +next(); break;
      case '--exclude-bots': o.excludeBots = true; break;
      case '-h': case '--help': o.help = true; break;
      case '-v': case '--version': o.version = true; break;
      default:
        if (a.startsWith('-')) throw new Error(`Unknown option: ${a}`);
        rest.push(a);
    }
  }
  if (rest[0]) o.repo = rest[0];
  return o;
}

const fmtInt = n => n.toLocaleString('en-US');
const md = s => String(s).replace(/\|/g, '\\|');

/** Longest run of consecutive calendar days with at least one commit. */
function longestStreak(dates) {
  let best = 0, run = 0, prev = null;
  for (const d of dates) {
    const t = Date.parse(d + 'T00:00:00Z');
    run = prev !== null && t - prev === 86400000 ? run + 1 : 1;
    if (run > best) best = run;
    prev = t;
  }
  return best;
}

/** Inactivity gaps -- candidate era boundaries. Computed in Node: BSD awk lacks mktime. */
function gaps(dates, minDays = 21) {
  const out = [];
  for (let i = 1; i < dates.length; i++) {
    const a = Date.parse(dates[i - 1] + 'T00:00:00Z');
    const b = Date.parse(dates[i] + 'T00:00:00Z');
    const days = Math.round((b - a) / 86400000);
    if (days >= minDays) out.push({ from: dates[i - 1], to: dates[i], days });
  }
  return out.sort((x, y) => y.days - x.days);
}

async function main() {
  const opt = parseArgs(process.argv.slice(2));
  if (opt.version) { console.log(`evidence ${VERSION}`); return; }
  if (opt.help) {
    console.log('evidence — compact factual pack from a repo\'s full git history\n\n' +
      '  node scripts/evidence.mjs [repoPath] [-o EVIDENCE.md] [--all] [--top N] [--exclude-bots]\n');
    return;
  }

  const given = resolve(opt.repo);
  assertUsableRepo(given);
  // pathspec lookups below are cwd-relative, so operate from the repo root
  const repo = repoRoot(given);
  const name = repoName(repo);

  // ---- single streaming pass with --numstat for churn ----
  const commits = [];
  const authors = new Map();
  const dirFirst = new Map(), dirLast = new Map(), dirTouch = new Map();
  const types = new Map();
  let breaking = [], prNums = 0, merges = 0;

  await streamLog(repo, {
    stat: 'names', all: opt.all,
    onCommit: c => {
      if (opt.excludeBots && isBot(c)) return;
      commits.push(c);
      authors.set(c.name, (authors.get(c.name) || 0) + 1);
      if (c.parents.length > 1) merges++;
      if (/\(#\d+\)/.test(c.subject)) prNums++;
      const { type, breaking: brk } = splitConventional(c.subject);
      if (type) types.set(type, (types.get(type) || 0) + 1);
      if (brk) breaking.push(c);
      if (c.paths) {
        for (const p of c.paths) {
          if (!dirFirst.has(p) || c.date < dirFirst.get(p)) dirFirst.set(p, c.date);
          if (!dirLast.has(p) || c.date > dirLast.get(p)) dirLast.set(p, c.date);
          dirTouch.set(p, (dirTouch.get(p) || 0) + 1);
        }
      }
    },
  });

  if (!commits.length) { console.error('No commits found.'); process.exit(1); }

  // ---- derived aggregates ----
  const byDay = new Map();
  for (const c of commits) byDay.set(c.date, (byDay.get(c.date) || 0) + 1);
  const dates = [...byDay.keys()].sort();
  const firstDate = dates[0], lastDate = dates[dates.length - 1];
  const busiest = [...byDay.entries()].sort((a, b) => b[1] - a[1])[0];

  const perYear = new Map();
  const perQuarter = new Map();
  for (const c of commits) {
    const y = c.date.slice(0, 4);
    const q = `${y}-Q${Math.floor((+c.date.slice(5, 7) - 1) / 3) + 1}`;
    perYear.set(y, (perYear.get(y) || 0) + 1);
    perQuarter.set(q, (perQuarter.get(q) || 0) + 1);
  }

  // Rank on file counts (cheap), then fetch exact line stats for only these commits.
  const churn = commits.slice().sort((a, b) => b.files - a.files).slice(0, opt.top);
  const exact = statsFor(repo, churn.map(c => c.short));
  for (const c of churn) {
    const e = exact.get(c.short);
    if (e) { c.files = e.files || c.files; c.ins = e.ins; c.del = e.del; }
  }
  const pat = collapse(commits, { limit: opt.patterns });

  // Renames: a separate cheap call; --numstat above runs with --no-renames for speed.
  const renameRaw = git(repo, [
    'log', opt.all ? '--all' : 'HEAD', '--diff-filter=R', '--summary', '--format=%x00%h%x1f%ad', '--date=short',
  ], { allowFail: true });
  const renames = [];
  {
    let cur = null;
    for (const line of renameRaw.split('\n')) {
      if (line.startsWith('\x00')) {
        const [h, d] = line.slice(1).split('\x1f');
        cur = { hash: h, date: d };
      } else if (cur && / rename /.test(line)) {
        const r = line.trim().replace(/^rename\s+/, '').replace(/\s+\(\d+%\)$/, '');
        // Keep only directory-level restructures; file-level churn is noise here.
        if (/[{}]|\//.test(r)) renames.push({ ...cur, r });
      }
    }
  }
  // Dedupe by shape so a 200-file move is one line, not 200.
  const renameShapes = new Map();
  for (const x of renames) {
    const shape = x.r.replace(/\/[^/{}]+$/, '/*');
    if (!renameShapes.has(shape)) renameShapes.set(shape, { ...x, shape, count: 0 });
    renameShapes.get(shape).count++;
  }
  const topRenames = [...renameShapes.values()].sort((a, b) => b.count - a.count).slice(0, 15);

  // Manifest-touching commits
  const manifestCommits = [];
  for (const m of MANIFESTS) {
    const raw = git(repo, ['log', opt.all ? '--all' : 'HEAD', '--format=%h%x1f%ad%x1f%s', '--date=short', '--', m], { allowFail: true });
    if (!raw) continue;
    const lines = raw.split('\n').filter(Boolean);
    manifestCommits.push({ file: m, count: lines.length, recent: lines.slice(0, 5).map(l => l.split('\x1f')) });
  }

  const tags = git(repo, ['tag', '--sort=-creatordate', '--format=%(refname:short)%09%(creatordate:short)'], { allowFail: true })
    .split('\n').filter(Boolean).slice(0, 15);

  const rootHash = git(repo, ['rev-list', '--max-parents=0', opt.all ? '--all' : 'HEAD'], { allowFail: true })
    .split('\n').filter(Boolean).pop();
  const treeThen = rootHash
    ? git(repo, ['ls-tree', '--name-only', rootHash], { allowFail: true }).split('\n').filter(Boolean)
    : [];
  const treeNow = git(repo, ['ls-tree', '--name-only', 'HEAD'], { allowFail: true }).split('\n').filter(Boolean);

  const rankedAuthors = [...authors.entries()].sort((a, b) => b[1] - a[1]);
  const g = gaps(dates);

  // ---------------- render the pack ----------------
  const L = [];
  const P = s => L.push(s);

  P(`# Evidence pack — ${name}`);
  P('');
  P(`> Generated ${new Date().toISOString().slice(0, 10)} from git history by \`evidence.mjs\` v${VERSION}.`);
  P('> Every figure below is derived');
  P('> directly from the repository. Nothing here is inferred or estimated.');
  P('');
  P('## 1. Overview');
  P('');
  P(`- **Repository**: ${name}`);
  P(`- **History covered**: ${firstDate} → ${lastDate} (first commit to most recent, full history)`);
  P(`- **Commits**: ${fmtInt(commits.length)}`);
  P(`- **Active days**: ${fmtInt(dates.length)}`);
  P(`- **Longest streak**: ${longestStreak(dates)} consecutive days`);
  P(`- **Busiest day**: ${busiest[0]} with ${fmtInt(busiest[1])} commits`);
  P(`- **Contributors**: ${fmtInt(rankedAuthors.length)}`);
  P(`- **Merge commits**: ${fmtInt(merges)} · **subjects referencing a PR**: ${fmtInt(prNums)}`);
  P('');
  P('| Contributor | Commits | Share |');
  P('|---|---:|---:|');
  for (const [a, n] of rankedAuthors.slice(0, 10)) {
    P(`| ${md(a)} | ${fmtInt(n)} | ${((n / commits.length) * 100).toFixed(1)}% |`);
  }
  if (rankedAuthors.length > 10) P(`| _${rankedAuthors.length - 10} more_ | | |`);
  P('');

  P('## 2. Activity shape');
  P('');
  P('| Year | Commits |');
  P('|---|---:|');
  for (const y of [...perYear.keys()].sort()) P(`| ${y} | ${fmtInt(perYear.get(y))} |`);
  P('');
  P('Quarters with activity (commit counts):');
  P('');
  P('```');
  const qs = [...perQuarter.keys()].sort();
  const qmax = Math.max(...perQuarter.values());
  for (const q of qs) {
    const n = perQuarter.get(q);
    P(`${q}  ${String(fmtInt(n)).padStart(6)}  ${'#'.repeat(Math.max(1, Math.round((n / qmax) * 40)))}`);
  }
  P('```');
  P('');
  if (g.length) {
    P(`**Inactivity gaps ≥21 days** — candidate era boundaries (${g.length} found, longest first):`);
    P('');
    for (const x of g.slice(0, 10)) P(`- ${x.days} days idle: ${x.from} → ${x.to}`);
  } else {
    P('**Inactivity gaps ≥21 days**: none — activity is continuous.');
  }
  P('');

  P('## 3. Commit-subject patterns (collapsed)');
  P('');
  P(`${fmtInt(commits.length)} subjects reduce to ${fmtInt(pat.distinct)} distinct shapes.`);
  P(`The ${pat.patterns.length} most common cover ${fmtInt(pat.covered)} commits ` +
    `(${Math.round((pat.covered / commits.length) * 100)}% of history).`);
  P('');
  P('Placeholders: `<CODE>` an identifier, `<PATH>` a path tail, `<N>` a number, `<VER>` a version, `[TICKET]` an issue key.');
  P('');
  P('| Count | First | Last | Pattern |');
  P('|---:|---|---|---|');
  for (const p of pat.patterns) P(`| ${fmtInt(p.count)} | ${p.first} | ${p.last} | \`${md(p.pattern)}\` |`);
  if (pat.truncated) P(`| _+${fmtInt(pat.truncated)} rarer shapes_ | | | |`);
  P('');
  P('> A pattern with a high count over a short window is a campaign of repetitive work.');
  P('> Describe the *tooling and discipline* behind it, not the commit count.');
  P('');

  P(`## 4. Largest commits by files changed (top ${churn.length})`);
  P('');
  P('These are the structural events: rewrites, migrations, restructures, mass refactors.');
  P('');
  P('| Hash | Date | Files | +/− | Subject |');
  P('|---|---|---:|---:|---|');
  for (const c of churn) {
    P(`| \`${c.short}\` | ${c.date} | ${fmtInt(c.files)} | +${fmtInt(c.ins)}/−${fmtInt(c.del)} | ${md(c.subject).slice(0, 90)} |`);
  }
  P('');

  P('## 5. Top-level directory lifecycle');
  P('');
  P('When each top-level path first and last received a commit — a strong signal for');
  P('when a capability was introduced or retired.');
  P('');
  P('| Path | First | Last | Commits touching |');
  P('|---|---|---|---:|');
  const dirs = [...dirTouch.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25);
  for (const [d, n] of dirs) P(`| \`${md(d)}\` | ${dirFirst.get(d)} | ${dirLast.get(d)} | ${fmtInt(n)} |`);
  P('');

  P('## 6. Renames and moves');
  P('');
  if (topRenames.length) {
    P('Directory-level restructures (deduped by shape; count = files moved in that shape):');
    P('');
    P('| Hash | Date | Files | Move |');
    P('|---|---|---:|---|');
    for (const r of topRenames) P(`| \`${r.hash}\` | ${r.date} | ${fmtInt(r.count)} | \`${md(r.shape)}\` |`);
  } else {
    P('None detected.');
  }
  P('');

  P('## 7. Dependency / manifest changes');
  P('');
  if (manifestCommits.length) {
    for (const m of manifestCommits) {
      P(`**\`${m.file}\`** — ${fmtInt(m.count)} commits. Most recent:`);
      P('');
      for (const [h, d, s] of m.recent) P(`- \`${h}\` ${d} — ${md(s).slice(0, 100)}`);
      P('');
    }
  } else {
    P('No recognised dependency manifests in this repository.');
    P('');
  }

  P('## 8. Commit types');
  P('');
  if (types.size) {
    const total = [...types.values()].reduce((a, b) => a + b, 0);
    P(`Conventional-commit prefixes detected on ${fmtInt(total)} of ${fmtInt(commits.length)} commits.`);
    P('');
    P('| Type | Count |');
    P('|---|---:|');
    for (const [t, n] of [...types.entries()].sort((a, b) => b[1] - a[1])) P(`| ${t} | ${fmtInt(n)} |`);
    P('');
    if (breaking.length) {
      P(`**Breaking changes** (\`!\` marker) — ${breaking.length}:`);
      P('');
      for (const c of breaking.slice(0, 10)) P(`- \`${c.short}\` ${c.date} — ${md(c.subject).slice(0, 100)}`);
      P('');
    }
  } else {
    P('No conventional-commit prefixes detected; this repo uses free-form subjects.');
    P('');
  }

  P('## 9. Tags / releases');
  P('');
  if (tags.length) {
    P('| Tag | Date |');
    P('|---|---|');
    for (const t of tags) { const [n, d] = t.split('\t'); P(`| ${md(n)} | ${d || ''} |`); }
  } else {
    P('No tags in this repository.');
  }
  P('');

  P('## 10. Then vs now');
  P('');
  P(`**At the first commit** (\`${rootHash ? rootHash.slice(0, 7) : '?'}\`, ${firstDate}) the top level held:`);
  P('');
  P('```');
  P(treeThen.length ? treeThen.slice(0, 40).join('\n') : '(empty)');
  P('```');
  P('');
  P(`**At HEAD** (${lastDate}):`);
  P('');
  P('```');
  P(treeNow.length ? treeNow.slice(0, 40).join('\n') : '(empty)');
  P('```');
  P('');

  P('## 11. NOT IN GIT — do not assert these');
  P('');
  P('The following cannot be derived from this pack. If a narrative needs them, they must be');
  P('marked as claims to verify, never stated as fact:');
  P('');
  P('- Runtime performance, build times, or speedups (unless a commit *message* claims it — cite the message, and attribute it)');
  P('- Business impact, revenue, user counts, adoption');
  P('- Team size, your role/title, who reviewed what');
  P('- Why a decision was made, unless the commit message says so');
  P('- Counts of things in the working tree (files shipped, tests passing) — this pack describes *history*, not the current tree');
  P('');

  const out = resolveOut(opt.out, 'EVIDENCE.md');
  const text = L.join('\n');
  writeFileSync(out, text);
  console.log(out);
  console.log(`  ${fmtInt(commits.length)} commits → ${fmtInt(text.length)} chars (~${fmtInt(Math.round(text.length / 4))} tokens)`);
  const hint = gitignoreHint(out);
  if (hint) console.log(`  note: ${hint}`);
}

main().catch(err => { console.error(String(err.message || err)); process.exit(1); });
