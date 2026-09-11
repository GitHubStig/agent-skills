# Why This Skill Exists

A git repository contains a detailed record of how a project changed over time, but that history is difficult to understand from the raw commit log alone.

This skill turns that history into two useful outputs:

1. **An interactive GitHub-style contribution graph** showing activity across the complete repository history.
2. **A narrative project history** explaining how the repository evolved, era by era.

The result can be useful for understanding a project, preparing a resume or performance review, or writing a project retrospective.

The skill is designed to work on repositories of almost any size, from a few commits to large monorepos, while preserving the complete history from the first commit to the most recent.

## What It Does

The skill separates deterministic work from work that benefits from an LLM.

The contribution graph is generated directly from git history and requires no model at all.

The repository history is first compressed into a factual evidence pack. An LLM then uses that evidence to write the narrative rather than reasoning over a raw, potentially enormous commit log.

This makes the process faster, cheaper, and much more practical for smaller local models.

| Task                          | Done by             |
| ----------------------------- | ------------------- |
| Contribution graph            | `contrib-graph.mjs` |
| History analysis and evidence | `evidence.mjs`      |
| Narrative writing             | Any LLM             |

The graph is deterministic: the same repository produces the same result.

The narrative step can use any model and any agent harness, including a local model.

## Quick Start

From the skill directory:

```bash
# Generate the contribution graph
node scripts/contrib-graph.mjs ~/code/my-repo -o contributions.html

# Generate the factual evidence pack
node scripts/evidence.mjs ~/code/my-repo -o EVIDENCE.md
```

Then give `EVIDENCE.md` together with `reference/story-prompt.md` to an LLM and ask it to produce the repository story.

The LLM is only needed for the final writing step.

The skill itself can also drive the complete process when installed as an Agent Skill.

```text
"a contribution graph and story for this repo"
```

The scripts require only **git and Node.js**. There is no npm install and no external package dependency.

## How It Works

### 1. Contribution graph

`contrib-graph.mjs` reads the repository history and produces a self-contained HTML contribution graph.

The graph works offline and includes:

* GitHub-style activity heatmap
* Light and dark themes
* Keyboard navigation
* Per-day commit details
* Author filtering

The graph covers the complete history by default rather than imposing a fixed date range.

### 2. Evidence pack

`evidence.mjs` turns a potentially huge commit history into a compact factual summary.

It identifies things such as:

* overall repository activity
* activity eras and gaps
* recurring commit patterns
* major structural commits
* directory lifecycles
* renames
* dependency changes
* commit types
* tags
* differences between earlier and later versions of the repository
* claims that cannot reliably be established from git history alone

Commit subjects are normalised and grouped by their shape, while churn and structural changes are ranked separately.

This means a repository with tens of thousands of commits can often be represented by only a few thousand tokens of evidence.

### 3. Narrative

The LLM receives the prepared evidence rather than the entire commit log.

The story prompt requires the model to cite commit hashes when making claims and finish with a **Claims to Verify** section for anything that cannot be established confidently from the history.

This keeps the model focused on interpretation and writing rather than mechanical log processing.

## Design Principles

### Complete history

The skill does not silently sample commits or restrict itself to a default date window.

Shallow clones are detected and refused rather than producing an incomplete history.

### Deterministic tooling

Anything that can be derived mechanically from git is handled by scripts rather than delegated to an LLM.

This makes the graph reproducible and avoids wasting model context on work that does not require judgment.

### Compact evidence

The evidence step compresses repetitive commit history into patterns, structural changes, lifecycles, and other higher-value signals.

This keeps the narrative step practical even when using smaller local models.

### Honest uncertainty

Git history cannot prove everything about a project.

The generated story is therefore expected to distinguish between what the history demonstrates and what would require verification from other sources.

## Scale

The scripts are designed to handle large repositories without creating one subprocess per commit.

For example, in testing on a 22,495-commit repository:

```text
Contribution graph: ~0.4s
Evidence pack:      ~3s
```

The graph's totals and heatmap are never capped.

For very active days, the detailed per-commit list in the HTML can be capped with `--max-detail` so that the generated page remains manageable.

## CLI

### `contrib-graph.mjs`

```text
node scripts/contrib-graph.mjs [repoPath] [-o out.html] [options]

  -o, --out <file>       output path
  --all                  traverse all refs, not just HEAD
  --since / --until      explicit date overrides
  --exclude-bots         drop bot/CI identities
  --author-map <spec>    "a@x.com=Real Name,b@y.com=Real Name"
  --max-authors <n>      author pills before folding to "Other"
  --max-detail <n>       cap detailed commits for very active days
  --detail-per-day <n>   commits kept per day when capped
```

### `evidence.mjs`

```text
node scripts/evidence.mjs [repoPath] [-o EVIDENCE.md] [options]

  --all                  traverse all refs
  --top <n>              structural commits to report
  --patterns <n>         subject patterns to report
  --exclude-bots         drop bot/CI identities
```

Both scripts support `--version`.

## Output

By default, generated files are written to a `repo-story/` directory under the current working directory.

This keeps generated artifacts together and makes them easy to remove or ignore as a group.

Output paths can be overridden with `-o`.

The scripts never write into the installed skill directory, which may be read-only.

## Privacy

The scripts read only the git repository you point them at.

They make **no network calls** and send nothing anywhere.

Generated files can still contain information from the repository, including contributor names, commit subjects, issue keys, directory names, and other history-derived information.

Treat `EVIDENCE.md`, `REPO_STORY.md`, and `contributions.html` as sensitive whenever the source repository itself is sensitive.

No sample output is included in this repository for that reason.

## Versioning

The scripts report their version with `--version`.

That version is also recorded in generated artifacts so that an exported graph or evidence pack can be traced back to the version of the tool that produced it.

See [CHANGELOG.md](CHANGELOG.md).

The version is kept in `scripts/lib/version.mjs` rather than the Agent Skill frontmatter. The frontmatter remains limited to the fields required by the Agent Skills specification:

```yaml
---
name: repo-story
description: ...
---
```
