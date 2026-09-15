# Changelog

Versioning follows [semver](https://semver.org/). The skill has no scripts to
report a version, and `SKILL.md` frontmatter supports only `name` and
`description`, so the version lives here.

## 0.2.0

Changes from the first trial run of `trial-script.md`:

- A new feature's spec, plan and tasks are their own step, reviewed before any code, unless the
  user says to build straight away.
- Only an explicit request commits. "Carry on" or "looks good" is a go-ahead, not a commit.
- Tests: offer a test setup when a project has none, give every bug fix a test, and tick tasks
  only after a check.
- Superseding an ADR marks the old row in the index and rewrites every doc outside the ADRs that
  still mentions the old choice. Feature docs describe the project as it is now.
- Indexes and links appear only once their file exists, and the first reply states the working
  agreement.
- Resuming says back the key decisions and what's next, then waits.
- Trial script: copy the skill instead of linking it, a go-ahead step after the first spec, and
  checks for all of the above.

## 0.1.0

- First draft: `SKILL.md` covering starting, resuming, when to write each doc, keeping nothing
  only in the chat, noticing decisions (with ADR statuses and superseding), writing rules,
  reviewed steps and commits.
- `reference/templates.md` with a template for `AGENTS.md`, the docs index, product, architecture,
  ADRs, feature spec/plan/tasks, development and proposals.
