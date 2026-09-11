---
name: repo-story
description: Generate an interactive GitHub-style contribution graph and a narrative history of how a repository was transformed over time, from its first commit to its most recent. Use when someone asks for a contribution/activity heatmap, a commit-history visualisation, a "what did I build here over the years" summary, or material for a resume, performance review, or project retrospective drawn from git history.
---

# repo-story

Turns a git repository into two artifacts:

1. **`contributions.html`** — an interactive GitHub-style contribution heatmap (months across
   the top, weekday rows down the side, green intensity), self-contained in one file.
2. **`REPO_STORY.md`** — a narrative of how the repo was transformed, organised into eras,
   written for a human audience (resume, cover letter, review, retrospective).

## The one rule that matters

**Do not write HTML. Do not read the raw commit log. Run the scripts.**

The graph is fully determined by git history — there is no judgment in it, so authoring it
token by token is slower, costs more, and produces a worse result than a 60-line script that
is right every time. The same applies to sifting a commit log by hand.

Your job is step 3 only: writing prose over evidence the scripts have already gathered.
This division is what lets the workflow run on a small local model as well as a large one.

## Workflow

### Step 1 — the graph (no model judgment involved)

```bash
node scripts/contrib-graph.mjs <repo-path> -o contributions.html
```

Prints a one-line summary (commits, active days, date range, authors, size). That artifact is
now finished. Do not post-process it.

### Step 2 — the evidence pack

```bash
node scripts/evidence.mjs <repo-path> -o EVIDENCE.md
```

Produces a compact, purely factual digest of the **entire** history: activity shape, collapsed
commit-subject patterns, the largest structural commits, directory lifecycles, renames,
dependency changes, tags, and a first-commit-vs-HEAD comparison.

It stays roughly the same size whether the repo has 400 commits or 400,000, because it reports
aggregates rather than commits.

### Step 3 — write the story

Read `EVIDENCE.md` and `reference/story-prompt.md`, then write `REPO_STORY.md` following that
prompt. It specifies the structure (eras → bullets → resume angles → claims to verify) and the
evidence discipline (cite hashes; never invent numbers).

If the user only wanted the graph, stop after step 1.

## Using this with a local or offline model

Nothing in step 3 is tied to a model, a provider, or a harness. The interface is two markdown
files:

```
reference/story-prompt.md  +  EVIDENCE.md   ->   your model   ->   REPO_STORY.md
```

Whatever agent is reading this skill — cloud or a local model running offline — is the thing
that writes step 3. That is why steps 1 and 2 are scripts and step 3 is not: the deterministic
work is already done, so the remaining job fits in a small model's context and its actual
strengths.

If you are driving a model by hand rather than through an agent, note that piping `ollama run`
into a file corrupts the output — see `reference/design-notes.md`.

## Options worth knowing

| Flag | Applies to | Purpose |
|---|---|---|
| `--exclude-bots` | both | Drop CI/dependabot identities |
| `--author-map "a@x.com=Name"` | graph | Merge identities that `.mailmap` doesn't cover |
| `--all` | both | Traverse all refs, not just `HEAD` |
| `--max-detail <n>` | graph | Cap per-day commit *lists* on very large repos (totals never capped) |
| `--top <n>` | evidence | Number of structural commits to report (default 25) |

`--since` / `--until` exist but are **off by default and should stay that way** — the point of
the tool is the complete history.

## Guarantees the scripts uphold

- **Full history, always.** First commit to most recent. No sampling, no default date window.
  Shallow clones are refused with instructions rather than silently under-reported.
- **Scale.** A single streaming `git log` pass; ~22,000 commits in well under a second for the
  graph. Author lists cap at 8 pills + "Other", but totals always sum to the true figure.
- **Determinism.** Same repo in, same HTML out.

## Where to write the output

Both scripts default to a `repo-story/` directory under the current working directory, and print
the absolute path they wrote. Three rules:

- **Never write into this skill's own directory.** It may be read-only (claude.ai and the
  `/v1/skills` API run skills from a sandboxed container), and it is shared across every repo.
- **Never scatter loose files into the repo being analysed.** If the user wants artifacts kept
  with the project, put them in one directory (`docs/`, or the default `repo-story/`) rather than
  dropping `EVIDENCE.md` and `contributions.html` at the root.
- **Ask when it matters.** If the target is a work repo the user may not want new untracked
  files at all — offer a path outside it. When output does land in a work tree, the scripts print
  a `.gitignore` hint; pass it on.

`EVIDENCE.md` is usually an intermediate. Unless the user wants to keep it, write it somewhere
temporary and leave only `contributions.html` and `REPO_STORY.md` behind.

## Handling the output

The scripts make no network calls. Their output, however, carries whatever the repo carries:
contributor names, commit subjects, issue keys, internal directory names. Write artifacts where
the user asks, and flag it before anything generated from a private repo gets published or
shared outside it.

## Troubleshooting

- *"Shallow clone detected"* — run `git fetch --unshallow`, then retry.
- *"Repository has no commits yet"* — nothing to render.
- Graph HTML over ~10MB — pass `--max-detail 5000`; per-day lists shrink, totals do not change.
- Every author shows as "Other" — the repo has more than 8 contributors; raise `--max-authors`.
