#!/usr/bin/env node
/**
 * contrib-graph.mjs — GitHub-style contribution heatmap for any git repo.
 *
 * ZERO LLM. This output is fully determined by git history; an agent must run
 * this script rather than authoring HTML, which is both slower and wrong.
 *
 * Usage:
 *   node scripts/contrib-graph.mjs [repoPath] [-o out.html] [options]
 *
 * Options:
 *   -o, --out <file>       output path (default: ./contributions.html)
 *   --all                  traverse all refs, not just HEAD
 *   --since <YYYY-MM-DD>   explicit override; off by default (full history)
 *   --until <YYYY-MM-DD>   explicit override; off by default
 *   --exclude-bots         drop bot/CI identities
 *   --author-map <spec>    merge identities: "a@x.com=Real Name,b@y.com=Real Name"
 *   --max-authors <n>      author pills before folding into "Other" (default 8)
 *   --max-detail <n>       commit-count above which per-day commit lists are
 *                          capped (default 20000). Totals are NEVER capped.
 *   --detail-per-day <n>   commits kept per day when capped (default 20)
 */

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { assertUsableRepo, repoName, repoRoot, streamLog, isBot, parseAuthorMap, git } from './lib/git.mjs';
import { renderHtml, makeBuckets } from './lib/render.mjs';
import { resolveOut, gitignoreHint, OUT_DIR } from './lib/outpath.mjs';
import { VERSION } from './lib/version.mjs';

function parseArgs(argv) {
  const o = {
    repo: '.', out: null, all: false, since: null, until: null,
    excludeBots: false, authorMap: '', maxAuthors: 8,
    maxDetail: 20000, detailPerDay: 20,
  };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case '-o': case '--out': o.out = next(); break;
      case '--all': o.all = true; break;
      case '--since': o.since = next(); break;
      case '--until': o.until = next(); break;
      case '--exclude-bots': o.excludeBots = true; break;
      case '--author-map': o.authorMap = next(); break;
      case '--max-authors': o.maxAuthors = +next(); break;
      case '--max-detail': o.maxDetail = +next(); break;
      case '--detail-per-day': o.detailPerDay = +next(); break;
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

const HELP = `contrib-graph — GitHub-style contribution heatmap for any git repo

  node scripts/contrib-graph.mjs [repoPath] [-o out.html] [options]

  -o, --out <file>        output path (default ./repo-story/contributions.html)
  --all                   traverse all refs, not just HEAD
  --since / --until       explicit date overrides (default: FULL history)
  --exclude-bots          drop bot/CI identities
  --author-map <spec>     "a@x.com=Real Name,b@y.com=Real Name"
  --max-authors <n>       author pills before folding to "Other" (default 8)
  --max-detail <n>        cap per-day commit lists above n commits (default 20000)
  --detail-per-day <n>    commits kept per day when capped (default 20)
  -v, --version           print version
`;

async function main() {
  const opt = parseArgs(process.argv.slice(2));
  if (opt.version) { console.log(`contrib-graph ${VERSION}`); return; }
  if (opt.help) { console.log(HELP); return; }

  const given = resolve(opt.repo);
  assertUsableRepo(given);
  const repo = repoRoot(given);

  const warnings = [];
  if (opt.since || opt.until) {
    warnings.push(
      `Filtered view: ${opt.since ? 'since ' + opt.since : ''}${opt.since && opt.until ? ', ' : ''}${opt.until ? 'until ' + opt.until : ''}. This is not the full history.`
    );
  }

  const amap = parseAuthorMap(opt.authorMap);

  // ---- pass 1: stream the entire history once ----
  const commits = [];
  const authorTotals = new Map();
  await streamLog(repo, {
    all: opt.all, since: opt.since, until: opt.until,
    onCommit: c => {
      if (opt.excludeBots && isBot(c)) return;
      const name = amap.get((c.email || '').toLowerCase()) || c.name || '(unknown)';
      commits.push({ short: c.short, date: c.date, name, subject: c.subject });
      authorTotals.set(name, (authorTotals.get(name) || 0) + 1);
    },
  });

  if (!commits.length) {
    console.error('No commits matched. Nothing to render.');
    process.exit(1);
  }

  // ---- G1 check: we really did reach the root commit ----
  if (!opt.since && !opt.until) {
    const rootHash = git(repo, ['rev-list', '--max-parents=0', opt.all ? '--all' : 'HEAD'], { allowFail: true })
      .split('\n').filter(Boolean).pop();
    if (rootHash) {
      const rootDate = git(repo, ['log', '-1', '--format=%ad', '--date=short', rootHash], { allowFail: true });
      const earliest = commits.reduce((m, c) => (c.date < m ? c.date : m), commits[0].date);
      if (rootDate && rootDate < earliest) {
        warnings.push(`History may be incomplete: root commit dated ${rootDate}, earliest rendered ${earliest}.`);
      }
    }
  }

  // ---- author capping: top N pills + "Other", where Other keeps the true remainder ----
  const ranked = [...authorTotals.entries()].sort((a, b) => b[1] - a[1]);
  const kept = ranked.slice(0, opt.maxAuthors).map(([n]) => n);
  const keptIdx = new Map(kept.map((n, i) => [n, i]));
  const overflow = ranked.length - kept.length;
  const authors = kept.slice();
  if (overflow > 0) authors.push(`Other (${overflow} author${overflow === 1 ? '' : 's'})`);
  const otherIdx = overflow > 0 ? authors.length - 1 : -1;
  const authorIndex = n => (keptIdx.has(n) ? keptIdx.get(n) : otherIdx);

  // ---- bucket days ----
  const detailTruncated = commits.length > opt.maxDetail;
  const days = Object.create(null);
  for (const c of commits) {
    let e = days[c.date];
    if (!e) e = days[c.date] = { n: 0, a: Object.create(null), c: [] };
    e.n++;
    const ai = authorIndex(c.name);
    if (ai >= 0) e.a[ai] = (e.a[ai] || 0) + 1;
    if (!detailTruncated || e.c.length < opt.detailPerDay) {
      e.c.push([c.short, ai, c.subject]);
    }
  }
  // Oldest-first within a day so detail lists read chronologically
  for (const d in days) days[d].c.reverse();

  const dates = Object.keys(days).sort();
  const firstDate = dates[0];
  const lastDate = dates[dates.length - 1];
  const years = [];
  for (let y = +firstDate.slice(0, 4); y <= +lastDate.slice(0, 4); y++) years.push(String(y));

  const buckets = makeBuckets(dates.map(d => days[d].n));

  const html = renderHtml({
    repo: repoName(repo),
    totalCommits: commits.length,
    activeDays: dates.length,
    firstDate, lastDate, years, authors, days, buckets,
    detailCap: opt.detailPerDay,
    detailTruncated,
    generatedAt: new Date().toISOString().slice(0, 10),
    version: VERSION,
    warnings,
  });

  const out = resolveOut(opt.out, 'contributions.html');
  writeFileSync(out, html);

  const mb = html.length / 1048576;
  console.log(`${out}`);
  console.log(
    `  ${commits.length.toLocaleString()} commits · ${dates.length.toLocaleString()} active days · ` +
    `${firstDate} → ${lastDate} · ${ranked.length.toLocaleString()} authors · ${mb.toFixed(2)} MB`
  );
  if (detailTruncated) {
    console.log(`  note: per-day commit lists capped at ${opt.detailPerDay} (totals unaffected)`);
  }
  if (mb > 10) {
    console.warn(`  warning: output is ${mb.toFixed(1)} MB. Consider --max-detail ${Math.floor(commits.length / 2)}.`);
  }
  const hint = gitignoreHint(out);
  if (hint) console.log(`  note: ${hint}`);
  for (const w of warnings) console.warn(`  warning: ${w}`);
}

main().catch(err => { console.error(String(err.message || err)); process.exit(1); });
