/**
 * git.mjs — git history reader.
 *
 * Design constraint (G2): ONE git subprocess for the whole history, streamed.
 * A per-commit `git show --stat` loop spawns N subprocesses; on a 22k-commit
 * repo that is ~22,000 processes and minutes of wall time. Everything here is
 * built around a single `git log` pass whose output is reduced incrementally.
 *
 * Design constraint (G1): the full history, root commit to HEAD, always.
 * No -n, no default --since, no sampling.
 */

import { spawn, execFileSync } from 'node:child_process';
import { createInterface } from 'node:readline';

const US = '\x1f'; // unit separator — safe inside commit subjects
const RS = '\x1e'; // record separator

/** Run a short git command that returns a small result. Throws on failure. */
export function git(repo, args, { allowFail = false } = {}) {
  try {
    return execFileSync('git', ['-C', repo, ...args], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch (err) {
    if (allowFail) return '';
    throw new Error(`git ${args.join(' ')} failed: ${err.stderr || err.message}`);
  }
}

/** Validate the repo up front, with actionable errors rather than silent wrong answers. */
export function assertUsableRepo(repo) {
  let inside;
  try {
    inside = git(repo, ['rev-parse', '--is-inside-work-tree']);
  } catch {
    throw new Error(
      `Not a git repository: ${repo}\n` +
      `Pass a path to a git repo, e.g.  node scripts/contrib-graph.mjs ~/code/myrepo`
    );
  }
  if (inside !== 'true' && git(repo, ['rev-parse', '--is-bare-repository'], { allowFail: true }) !== 'true') {
    throw new Error(`Not a git work tree or bare repo: ${repo}`);
  }

  // G1: a shallow clone silently truncates history. Refuse rather than under-report.
  const shallow = git(repo, ['rev-parse', '--is-shallow-repository'], { allowFail: true });
  if (shallow === 'true') {
    throw new Error(
      `Shallow clone detected: ${repo}\n` +
      `This tool guarantees full history (first commit -> HEAD), which a shallow\n` +
      `clone cannot provide. Run:   git -C "${repo}" fetch --unshallow`
    );
  }

  // An empty repo has no HEAD to walk.
  if (!git(repo, ['rev-parse', '--verify', 'HEAD'], { allowFail: true })) {
    throw new Error(`Repository has no commits yet: ${repo}`);
  }
}

/**
 * Normalise any path inside a repo to the repo's top level.
 *
 * Required for correctness, not tidiness: git pathspecs (`git log -- package.json`)
 * resolve against the process's cwd, not the repository root. Pointed at a
 * subdirectory, manifest and tree lookups silently return nothing while commit
 * history still returns everything — a half-wrong pack with no error.
 */
export function repoRoot(repo) {
  return git(repo, ['rev-parse', '--show-toplevel'], { allowFail: true }) || repo;
}

export function repoName(repo) {
  const top = git(repo, ['rev-parse', '--show-toplevel'], { allowFail: true });
  if (top) return top.split('/').filter(Boolean).pop();
  return repo.replace(/\/+$/, '').split('/').filter(Boolean).pop() || 'repo';
}

/**
 * Stream the full commit history in ONE subprocess.
 *
 * onCommit({hash, date, name, email, subject, parents, files, ins, del})
 * is called once per commit, in git's default (newest-first) order.
 *
 * `stat` selects how much diff detail to collect:
 *   'none'   — subjects only. Fastest.
 *   'names'  — --name-only: file count + top-level paths per commit.
 *   'lines'  — --numstat: additionally insertions/deletions.
 *
 * Measured on a 22,495-commit repo: 'names' costs 0.6s, 'lines' costs 16.9s.
 * The 26x gap is because --numstat must read blob contents to count lines, while
 * --name-only only compares trees. Rank churn with 'names', then fetch exact
 * line counts for the handful of commits that actually get reported (see
 * statsFor()) rather than paying for all of them.
 */
export function streamLog(repo, { stat = 'none', all = false, since, until, onCommit }) {
  // %aN/%aE (capitals) apply the repo's .mailmap, so identity merges the project
  // already declares are honoured for free — matching `git shortlog` behaviour.
  const fmt = ['%H', '%h', '%ad', '%aN', '%aE', '%P', '%s'].join(US);
  const args = [
    '-C', repo,
    // -c diff.renames: rename detection stays on for the rename signal
    'log',
    all ? '--all' : 'HEAD',
    `--format=${RS}${fmt}`,
    '--date=short',
  ];
  if (stat !== 'none') {
    // Without this, git shows NO diff for merge commits, so a squash/merge-heavy
    // repo reports zero churn for its most significant commits. first-parent is
    // the right frame: it attributes a merge's whole change to the merge.
    args.push('--diff-merges=first-parent');
  }
  if (stat === 'lines') args.push('--numstat', '--no-renames');
  else if (stat === 'names') args.push('--name-only', '--no-renames');
  if (since) args.push(`--since=${since}`);
  if (until) args.push(`--until=${until}`);
  // NOTE: deliberately no -n / --max-count. G1.

  return new Promise((resolve, reject) => {
    const proc = spawn('git', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    proc.stderr.on('data', d => { stderr += d; });

    const rl = createInterface({ input: proc.stdout, crlfDelay: Infinity });
    let cur = null;
    let count = 0;

    const flush = () => { if (cur) { onCommit(cur); count++; cur = null; } };

    rl.on('line', line => {
      if (line.startsWith(RS)) {
        flush();
        const [hash, short, date, name, email, parents, subject] = line.slice(1).split(US);
        cur = {
          hash, short, date, name, email,
          parents: parents ? parents.split(' ').filter(Boolean) : [],
          subject: subject ?? '',
          files: 0, ins: 0, del: 0,
          paths: null,
        };
        return;
      }
      if (!cur || !line.trim()) return;

      let path;
      const tab1 = line.indexOf('\t');
      if (stat === 'lines' && tab1 !== -1) {
        // numstat line: "<ins>\t<del>\t<path>"   ('-' for binary files)
        const tab2 = line.indexOf('\t', tab1 + 1);
        if (tab2 === -1) return;
        const a = line.slice(0, tab1);
        const b = line.slice(tab1 + 1, tab2);
        path = line.slice(tab2 + 1);
        if (a !== '-') cur.ins += +a || 0;
        if (b !== '-') cur.del += +b || 0;
      } else {
        // --name-only line: just the path
        path = line;
      }
      cur.files++;
      // Keep only the top-level segment; full path lists on 22k commits are pure memory waste.
      const slash = path.indexOf('/');
      const seg = slash === -1 ? path : path.slice(0, slash);
      if (seg) (cur.paths ??= new Set()).add(seg);
    });

    rl.on('close', () => {
      flush();
      if (proc.exitCode && proc.exitCode !== 0) {
        reject(new Error(`git log failed: ${stderr}`));
      } else {
        resolve(count);
      }
    });
    proc.on('error', reject);
  });
}

/**
 * Exact insertion/deletion counts for a specific, small set of commits.
 *
 * Computing line stats for an entire history is the expensive path (see streamLog).
 * The evidence pack only ever *reports* ~25 commits, so rank cheaply on file counts
 * and pay the diff cost for that handful here. One subprocess, --no-walk.
 *
 * Returns Map<shortHash, {files, ins, del}>.
 */
export function statsFor(repo, hashes) {
  const out = new Map();
  if (!hashes.length) return out;
  // NOTE: the record marker must be git's own %x1e escape, not a literal control
  // byte in the argument -- execve terminates arguments at a NUL, so '--format=\0%h'
  // silently reaches git as '--format=' and every stat comes back zero.
  // --root makes the initial commit report its stats instead of nothing.
  const raw = git(repo, [
    'log', '--no-walk', '--root', '--shortstat', '--diff-merges=first-parent',
    `--format=${RS}%h`, ...hashes,
  ], { allowFail: true });
  let cur = null;
  for (const line of raw.split('\n')) {
    if (line.startsWith(RS)) {
      cur = line.slice(1).trim();
      out.set(cur, { files: 0, ins: 0, del: 0 });
      continue;
    }
    if (!cur || !line.trim()) continue;
    const f = /(\d+) files? changed/.exec(line);
    const i = /(\d+) insertions?\(\+\)/.exec(line);
    const d = /(\d+) deletions?\(-\)/.exec(line);
    const e = out.get(cur);
    if (f) e.files = +f[1];
    if (i) e.ins = +i[1];
    if (d) e.del = +d[1];
  }
  return out;
}

/** Bot identities that inflate contribution graphs. Opt-in filter. */
export function isBot({ name, email }) {
  const n = (name || '').toLowerCase();
  const e = (email || '').toLowerCase();
  return (
    /\[bot\]|(^|\W)bot$|dependabot|renovate|greenkeeper|github-actions|semantic-release/.test(n) ||
    /\[bot\]|noreply@github\.com$|dependabot|renovate/.test(e)
  );
}

/** Parse "email=Name,email2=Name" identity merges. */
export function parseAuthorMap(spec) {
  const map = new Map();
  if (!spec) return map;
  for (const pair of spec.split(',')) {
    const i = pair.indexOf('=');
    if (i > 0) map.set(pair.slice(0, i).trim().toLowerCase(), pair.slice(i + 1).trim());
  }
  return map;
}
