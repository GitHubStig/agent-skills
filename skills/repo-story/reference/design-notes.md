# Design notes

Why the tool makes the choices it makes. Written down so they don't get "fixed" later.

## Contents

- The colour ramp is sequential, not categorical
- Buckets are fixed, not quartiles
- Author dates, not committer dates
- Performance: paths are cheap, line counts are expensive
- Merge commits must be diffed against their first parent
- Two portability traps worth remembering
- Subject normalisation uses parked sentinels
- What the tool deliberately does not do
- Ollama output must come from the API, not the CLI
- Step 3 is deliberately not a script
- The grid must be a fixed-layout table, not an auto one
- A model cannot report which model it is

## The colour ramp is sequential, not categorical

A day's commit count is a **magnitude**, so it takes a single-hue ramp running light→dark, not a
palette of distinct hues. Rainbow heatmaps fail here because hue carries no ordering — the reader
cannot tell which of two colours means "more".

The ramp is validated for **OKLab lightness monotonicity** against both surfaces, which is the
correct check for a sequential scale (adjacent-pair CVD separation is the check for *categorical*
palettes, and running that check on a sequential ramp fails by design — the steps are meant to sit
close together).

| Step | Light | OKLab L | vs surface | Dark | OKLab L | vs surface |
|---|---|---:|---:|---|---|---:|
| 0 (empty) | `#ebedef` | 0.945 | 1.14:1 | `#26282b` | 0.276 | 1.18:1 |
| 1 | `#b7e4c0` | 0.877 | 1.38:1 | `#0d4a26` | 0.362 | 1.68:1 |
| 2 | `#6fce89` | 0.775 | 1.88:1 | `#16803c` | 0.527 | 3.47:1 |
| 3 | `#2fa44f` | 0.635 | 3.13:1 | `#29b352` | 0.674 | 6.36:1 |
| 4 | `#14682c` | 0.455 | 6.72:1 | `#59e07f` | 0.809 | 10.28:1 |

Both directions are strictly monotonic with even spacing. The lightest active step is allowed to
recede toward the surface — that is correct for sequential encoding, where "near zero" should be
quiet.

Colour is never the only channel: every cell carries an `aria-label` with its exact count, and the
tooltip states it in words.

## Buckets are fixed, not quartiles

Commit-per-day distributions are extremely skewed. On the repo this was built against: busiest day
73 commits, median active day 2. Linear quartiles or an even split across the observed range would
put nearly every active day in the palest bucket and waste the scale on a handful of outliers.

The ladder is therefore fixed at `1–2 / 3–5 / 6–15 / 16+`, which matches how people actually read
these graphs, and it **scales by order of magnitude** when a repo's 90th-percentile day exceeds
the top of the ladder — so a busy monorepo doesn't render as a solid block of the darkest shade.

## Author dates, not committer dates

GitHub's own contribution graph counts author dates, so the graph matches what people expect from
their profile. A side effect: rebased or cherry-picked commits appear on their original date, which
occasionally makes commits look out of order relative to the log. That's correct behaviour, not a bug.

## Performance: paths are cheap, line counts are expensive

Measured on a 22,495-commit repository:

| git invocation | Time |
|---|---:|
| `log --name-only` | 0.63s |
| `log --numstat` | 16.9s |
| `log --shortstat` | 16.5s |

A 26× difference, because `--numstat`/`--shortstat` must read blob contents to count lines, while
`--name-only` only compares trees. So the tool ranks churn using **file counts from `--name-only`**
across the whole history, then fetches exact insertion/deletion counts for **only the ~25 commits it
actually reports** (`statsFor()`). Same output, 6.5× faster end to end.

The other rule: **one subprocess, not one per commit.** A `git show --stat` loop over 22k commits
spawns 22,000 processes and takes minutes. Everything streams from a single `git log`.

## Merge commits must be diffed against their first parent

Git shows **no diff at all** for a merge commit by default. On any repo that merges pull requests,
that silently blanks out the most significant commits — the tool was initially missing a 676-file
refactor for exactly this reason. `--diff-merges=first-parent` attributes a merge's whole change to
the merge, which is the right frame for "what changed here".

## Two portability traps worth remembering

- **BSD `awk` has no `mktime`.** Any date arithmetic done in shell breaks on macOS. All date math
  lives in Node.
- **You cannot pass a NUL byte as a process argument.** `execve` terminates arguments at the first
  NUL, so `--format=\0%h` reaches git as `--format=` and every field comes back empty. Use git's own
  `%x00`/`%x1e` escapes and let git emit the control character.

## Subject normalisation uses parked sentinels

Replacing parts of a commit subject with placeholders like `<PATH>` creates a second problem: the
placeholder is itself an ALL-CAPS word, so a later rule rewrites it to `<<CODE>>`. And a numeric
sentinel index gets caught by the "standalone number" rule.

So each replacement is parked behind a sentinel whose index is encoded in **lowercase letters** —
invisible to the number rule, the caps rule, and (being short) the hex rule — then restored at the
end. Grouping is case-folded so `add X Map` and `add X map` are one pattern.

## What the tool deliberately does not do

- **No default date filtering.** The whole point is complete history.
- **No commit sampling on large repos.** Totals are always exact; only per-day *detail lists* in the
  HTML are capped, and the page says so when they are.
- **No inferred narrative in `evidence.mjs`.** It reports facts and refuses to interpret. All
  interpretation happens in the model step, where it can be reviewed and challenged.

## Ollama output must come from the API, not the CLI

Only relevant if you drive a model by hand instead of through an agent.

`ollama run model < input > out.md` produces corrupted markdown. Ollama renders for a terminal
even when its output is redirected, and its line-wrapping rewrites the tail of each wrapped line
using cursor-movement escapes (`ESC[12D`, `ESC[K`). Stripping the escape sequences afterwards
does not recover the text — it leaves both copies of the rewritten fragment:

```
...make the subsequent mechanical conversion tractable in
in small, reviewable batches
```

Use an HTTP endpoint instead (`/v1/chat/completions` on ollama, LM Studio, llama.cpp, vLLM),
which returns the completion unrendered — and, on reasoning models, separates
`message.reasoning` from `message.content` so the scratchpad never reaches the document.

## Step 3 is deliberately not a script

An earlier version shipped a wrapper that posted the prompt to a local model. It was removed:
anything using this skill is already an agent, and an agent does not need a script to call a
model — it *is* the model. The wrapper only served a scenario that cannot occur.

Keeping step 3 as "two markdown files in, one out" also keeps the tool honest about where the
boundary sits: everything deterministic is a script, and the single step requiring judgment has
no code at all.

## The grid must be a fixed-layout table, not an auto one

A `<table>` under the default `table-layout: auto` treats `width` on a cell as a *suggestion*
and redistributes space to fit its container. For a heatmap that is fatal in two ways, both of
which shipped in the first version:

- **Cells stop being square.** Measured on a real page at 1150px: nine distinct cell widths
  between 12.00px and 20.78px, because month-label columns pushed wider than the rest.
- **Cells collapse instead of the grid scrolling.** At a 520px viewport the same cells rendered
  **0.72px** wide — the table crushed itself into the container rather than overflowing it.

Separately, row heights were uneven (12.00px vs 16.50px, two different row pitches) because the
`Mon`/`Wed`/`Fri` labels inherited `line-height: 1.5` on 11px text — 16.5px, taller than the
12px cells beside them. Every second row was visibly fatter.

The fix is three rules working together:

```css
table.grid { table-layout: fixed; width: max-content; }  /* never compress to fit */
table.grid tr { height: 12px; }
th.dow { font-size: 10px; line-height: 1; }              /* label ≤ cell height */
```

`table-layout: fixed` takes column widths from the first row, so the month-header cells must
declare the same 12px width as the data cells — and their labels are then absolutely positioned
(`bottom: 1px`) so the text neither widens its column nor drifts down into the grid where the
cells would paint over it.

Verified by measurement, not by eye: at 1150 / 700 / 520 / 380px viewports every cell reports
exactly 12.00 × 12.00 with a uniform 15.00px row pitch, the grid scrolls horizontally below
~700px, and the page body never scrolls horizontally at any width.


## A model cannot report which model it is

Worth knowing if you ever consider stamping the generating model into the output: it can't be
done reliably. Asked directly, a locally-hosted `qwen3.8:27b-mlx` replied *"I'm Qwen (Tongyi
Qianwen)… no specific version number is provided to me."* That is the honest case; models more
often state a wrong version confidently, and fine-tunes report their base model, because
self-identity comes from training data rather than runtime introspection.

Nor does the harness help: Claude Code sets `CLAUDECODE`, `AI_AGENT` and `CLAUDE_CODE_SESSION_ID`
in a skill's environment, but nothing naming the model, and there is no cross-harness convention
for it. So provenance records only what is actually knowable — the tool version and the
generation date, both stamped automatically.
