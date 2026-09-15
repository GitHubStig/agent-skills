# Changelog

Versioning follows [semver](https://semver.org/). The skill has no scripts to
report a version, and `SKILL.md` frontmatter supports only `name` and
`description`, so the version lives here.

## 0.4.0

Changes from the fourth trial run (Sonnet):

- A step is one user request. "Carry on" on a feature with an approved plan finishes the whole
  feature. Listing steps up front is only for big requests; a feature's plan Order is that list.
- Building straight away still writes the spec, plan and tasks before the code.
- With no test setup, the recommended one is written as a Proposed ADR and flagged in the report,
  and becomes Accepted when the user goes ahead. A bug fix starts with a test seen failing.
- Commits leave an agent's own folders out, and the report says what was left out.
- Resuming says back a fixed list: each Accepted ADR's decision and why, each gotcha by name,
  what's parked, and the tasks left.

## 0.3.0

Changes from the third trial run (Sonnet):

- Links: the "exists first" rule is stated in `SKILL.md` for `AGENTS.md` too, with no placeholder
  links, and every docs pass checks links, docs-only steps included.
- A feature becomes In progress once its spec is written, and resuming reads every feature not
  marked Done and says why the key decisions were made. Planned is gone: a feature only talked
  about goes in Open threads.
- With no test setup, the choice is asked in the step report with a recommendation and recorded
  as an ADR.
- Steps are listed at the start of the reply, before any file is written.
- A spec's Problem is written in the present tense, not as how the code used to behave.

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
