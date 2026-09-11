/**
 * outpath.mjs — where generated artifacts go.
 *
 * Rules, in order of importance:
 *
 * 1. NEVER write into the skill's own directory. It may be read-only (claude.ai
 *    zip uploads and the /v1/skills API run a skill from a sandboxed container;
 *    a shared plugin install may be non-writable), and it is global — one repo's
 *    output would sit beside another's.
 * 2. NEVER scatter loose files into the repo being analysed. Writing untracked
 *    files into someone's work tree is a side effect they did not ask for.
 * 3. Default to ONE named directory under the caller's cwd, so output is easy to
 *    find, easy to delete, and easy to gitignore as a unit.
 *
 * An explicit -o always wins; its parent directory is created if missing.
 */

import { mkdirSync } from 'node:fs';
import { resolve, dirname, join, relative } from 'node:path';
import { git } from './git.mjs';

export const OUT_DIR = 'repo-story';

/** Resolve the output path, creating the parent directory. */
export function resolveOut(explicit, defaultName) {
  const out = explicit ? resolve(explicit) : resolve(join(OUT_DIR, defaultName));
  mkdirSync(dirname(out), { recursive: true });
  return out;
}

/**
 * If the artifact landed inside a git work tree and is not already ignored,
 * return a one-line hint. Users generally want these ignored rather than
 * accidentally committed — especially since an evidence pack carries commit
 * subjects and contributor names.
 */
export function gitignoreHint(outPath) {
  const dir = dirname(outPath);
  const top = git(dir, ['rev-parse', '--show-toplevel'], { allowFail: true });
  if (!top) return null;

  // `git check-ignore <path>` echoes the path when it is ignored and prints
  // nothing when it is not, so non-empty output means "already handled".
  if (git(dir, ['check-ignore', outPath], { allowFail: true })) return null;

  const rel = relative(top, dir) || '.';
  return `written inside a git work tree — add "${rel}/" to .gitignore to keep it out of commits`;
}
