# Changelog

Versioning follows [semver](https://semver.org/). The version lives in
`scripts/lib/version.mjs` — deliberately not in `SKILL.md` frontmatter, which
supports only `name` and `description`.

Both CLIs report it (`--version`), and it is stamped into what they produce:
the graph's footer and the evidence pack's header. That gives any artifact you
share provenance about which version generated it.

## 1.0.3

- Added a `## Contents` table of contents to both `reference/` files. The Skills authoring
  checklist calls for one on any reference file over 100 lines, because an agent may preview a
  referenced file with a partial read (`head -100`) and silently miss the rest — which for
  `story-prompt.md` would have cut exactly the evidence and honesty rules.

## 1.0.2

- Output now defaults to a `repo-story/` directory under the caller's cwd instead of loose files
  in the current folder. `-o` still wins and now creates parent directories.
- Artifacts written inside a git work tree print a one-line `.gitignore` hint, suppressed when
  the path is already ignored.

## 1.0.1

- Fix: pointing the tool at a **subdirectory** of a repo silently reported "No recognised
  dependency manifests" and a wrong file tree. Git pathspecs resolve against the process's cwd,
  not the repo root, so `git log -- package.json` looked in the subdirectory. All paths are now
  normalised to the repo top level via `repoRoot()`.
- Fix: the evidence pack carried no generation date, so a model writing the story had nothing to
  copy and invented one. The pack header now stamps the date alongside the version.
- The story prompt now requires a **Provenance** block, and forbids the model from guessing its
  own identity — see `reference/design-notes.md`.

## 1.0.0

First release.

- `contrib-graph.mjs` — interactive GitHub-style contribution heatmap as one
  self-contained HTML file. No LLM involved; deterministic.
- `evidence.mjs` — compact factual digest of a repo's full history: activity
  shape, collapsed subject patterns, structural commits, directory lifecycles,
  renames, dependency changes, tags, then-vs-now.
- `reference/story-prompt.md` — model-agnostic prompt for the narrative step,
  requiring hash citations and a mandatory "Claims to Verify" section.
- Guarantees: full history (first commit → HEAD, shallow clones refused);
  one streaming `git log` pass; totals never capped.
- Verified across repos from 1 to 22,495 commits.
