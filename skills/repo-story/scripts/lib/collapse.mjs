/**
 * collapse.mjs — subject-line normalization.
 *
 * This is the compression that makes the evidence pack viable for small models.
 * A repo built by repetition ("add country X", "bump dep Y", "fix flake Z") spends
 * most of its log restating one template. Collapsing many near-identical subjects
 * into a single line with a count preserves the *fact* ("172 commits of this shape,
 * Dec 2022 - Jan 2023") while costing ~1 line instead of ~172.
 *
 * Measured on a real 394-commit repo: 394 subjects -> 182 distinct shapes, the
 * largest covering 172 commits. Repos with genuinely varied subjects collapse
 * little, which is correct: there is nothing to compress, and the evidence pack
 * leans on its other (churn, directory, rename) signals instead.
 */

const SENT_OPEN = '';
const SENT_CLOSE = '';

/** Strip a conventional-commit prefix. Returns {type, scope, breaking, rest}. */
export function splitConventional(subject) {
  const m = /^([a-z]+)(\(([^)]+)\))?(!)?:\s*(.*)$/i.exec(subject);
  if (!m) return { type: null, scope: null, breaking: false, rest: subject };
  return { type: m[1].toLowerCase(), scope: m[3] || null, breaking: !!m[4], rest: m[5] };
}

// Acronyms that carry real meaning and should survive the ALL-CAPS rule verbatim.
const KEEP_CAPS = new Set([
  'API', 'CI', 'CD', 'UI', 'UX', 'DB', 'SDK', 'CLI', 'HTTP', 'HTTPS',
  'JSON', 'HTML', 'CSS', 'SQL', 'AWS', 'GCP', 'PR', 'QA', 'TS', 'JS',
]);

/**
 * Reduce a subject to its shape. Order matters: the most specific patterns are
 * replaced first so a later, broader rule cannot eat their distinguishing parts.
 *
 * Placeholders are parked behind sentinels while the rules run. Without that, a
 * token like <PATH> is itself an ALL-CAPS word and gets re-matched into <<CODE>>;
 * likewise a numeric sentinel index would be re-parked by the number rule.
 */
export function normalize(subject) {
  let s = String(subject || '').trim();
  const parked = [];

  // Sentinel indices are lowercase letters: invisible to the number rule and to
  // the ALL-CAPS rule, and too short to trip the hex rule.
  const enc = n => {
    let o = '';
    do { o = String.fromCharCode(97 + (n % 26)) + o; n = Math.floor(n / 26); } while (n > 0);
    return o;
  };
  const dec = t => [...t].reduce((a, ch) => a * 26 + (ch.charCodeAt(0) - 97), 0);
  const park = tok => {
    parked.push(tok);
    return SENT_OPEN + enc(parked.length - 1) + SENT_CLOSE;
  };

  // PR/issue refs and ticket keys
  s = s.replace(/\(#\d+\)/g, () => park('(#N)'));
  s = s.replace(/#\d+\b/g, () => park('#N'));
  s = s.replace(/\[?\b[A-Z][A-Z0-9]+-\d+\b\]?/g, () => park('[TICKET]'));

  // Quoted fragments and versions
  s = s.replace(/["'`][^"'`]{1,60}["'`]/g, () => park('<STR>'));
  s = s.replace(/\bv?\d+\.\d+(\.\d+)?(-[\w.]+)?\b/g, () => park('<VER>'));

  // Long hex (commit shas)
  s = s.replace(/\b[0-9a-f]{7,40}\b/g, () => park('<HASH>'));

  // Paths: keep the leading directory, generalize the tail. Handles both
  // "packages/core/build.sh" and "src/components/Foo.tsx".
  s = s.replace(/\b([\w.-]+)\/(?:[\w.@-]+\/)*[\w.@-]+/g, (full, head) => {
    const ext = /\.([a-z0-9]{1,6})$/i.exec(full);
    return park(head + '/<PATH>' + (ext ? '.' + ext[1] : ''));
  });

  // Bare ALL-CAPS identifiers (ISO codes, module keys, env names) of 2-6 chars
  s = s.replace(/\b[A-Z]{2,6}\d?\b/g, m => (KEEP_CAPS.has(m) ? m : park('<CODE>')));

  // Remaining standalone numbers
  s = s.replace(/\b\d+\b/g, () => park('<N>'));

  // Restore
  const restore = new RegExp(SENT_OPEN + '([a-z]+)' + SENT_CLOSE, 'g');
  s = s.replace(restore, (_, t) => parked[dec(t)]);

  // Collapse runs of the same placeholder ("AF SA OC" -> one <CODE>)
  s = s.replace(/(<CODE>)(\s*[,/+&-]?\s*<CODE>)+/g, '$1');
  s = s.replace(/\s+/g, ' ').trim();

  return s;
}

/** Grouping key: shape plus case-folding, so "add X Map" and "add X map" are one pattern. */
export function patternKey(subject) {
  return normalize(subject).toLowerCase();
}

/**
 * Group commits by normalized subject.
 * Returns {patterns, distinct, truncated, covered} with patterns sorted count-desc.
 */
export function collapse(commits, { limit = 30 } = {}) {
  const groups = new Map();
  for (const c of commits) {
    const key = patternKey(c.subject);
    let g = groups.get(key);
    if (!g) {
      g = { pattern: normalize(c.subject), count: 0, first: c.date, last: c.date, examples: [] };
      groups.set(key, g);
    }
    g.count++;
    if (c.date < g.first) g.first = c.date;
    if (c.date > g.last) g.last = c.date;
    if (g.examples.length < 2) g.examples.push(c.short);
  }
  const all = [...groups.values()].sort(
    (a, b) => b.count - a.count || a.first.localeCompare(b.first)
  );
  const shown = all.slice(0, limit);
  return {
    patterns: shown,
    distinct: all.length,
    truncated: Math.max(0, all.length - limit),
    covered: shown.reduce((n, g) => n + g.count, 0),
  };
}
