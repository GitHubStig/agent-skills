# Templates

Each template lists every heading its doc can have, in order. A new file holds
only the headings there's real content for; add the others, in this order, when
their content arrives. Text in angle brackets says what goes there and is never
copied as is.

Links, list entries, tables and rows follow the same rule: add each one only
once the file it points to exists. A new `docs/README.md` might list only
`product.md`, with no ADR or feature table yet.

## Contents

- [AGENTS.md](#agentsmd)
- [docs/README.md](#docsreadmemd)
- [docs/product.md](#docsproductmd)
- [docs/architecture/overview.md](#docsarchitectureoverviewmd)
- [docs/adr/NNNN-short-title.md](#docsadrnnnn-short-titlemd)
- [docs/features/NNN-name/spec.md](#docsfeaturesnnn-namespecmd)
- [docs/features/NNN-name/plan.md](#docsfeaturesnnn-nameplanmd)
- [docs/features/NNN-name/tasks.md](#docsfeaturesnnn-nametasksmd)
- [docs/development.md](#docsdevelopmentmd)
- [docs/proposals/name.md](#docsproposalsnamemd)

## AGENTS.md

```markdown
# <Project name>: notes for AI agents

Read this first. It's the shortest path to working on this repo without undoing
decisions that were made on purpose. Longer explanations live in `docs/`.

## What this is

<Two or three sentences: what it does, for whom, the one constraint that shapes
everything.>

<One link per doc that exists; add the others as their files are created.>

- **Why it exists:** [docs/product.md](docs/product.md)
- **How it fits together:** [docs/architecture/overview.md](docs/architecture/overview.md)
- **Why it's built this way:** [docs/adr/](docs/adr/)
- **Each feature's spec, plan and tasks:** [docs/features/](docs/features/)
- **Running, checks and dependencies:** [docs/development.md](docs/development.md)

**Status (<month year>):** <where the project is>. Open threads are listed at
the end.

## Commands

<The exact commands to install, run, test, build, format and lint, one per line
with a short comment.>

## Repo map

| Path | What's there |
| ---- | ------------ |
| <path> | <what lives there> |

## Rules

### <Group, e.g. Dependencies> ([ADR NNNN](docs/adr/NNNN-title.md))

- <A rule, stated plainly, with the reason if it isn't obvious.>

### How work is done here

- **One step at a time.** Finish a step, verify it, then stop and summarise what
  changed, what was checked and what's next. The owner reviews and commits.
- **Never commit** unless asked. Never push.
- **Docs are updated in every step.** Nothing important lives only in the chat.
- **Ask when something is genuinely unclear** instead of guessing.

## Verifying changes

- <The checks that must pass.>
- <How to check anything visible or hard to test.>

## Things that will bite you

- **<Short name>:** <what goes wrong, and what to do instead.>

## Open threads

- <Topic>: <parked by the owner / proposed, not built / half-discussed>. <What's
  known, and the first step when it's picked up.>
```

## docs/README.md

```markdown
# Docs

<One sentence: what these docs cover.>

## Start here

1. [product.md](product.md): the problem, who it's for, goals and non-goals.
2. [architecture/overview.md](architecture/overview.md): the parts and how data
   moves between them.
3. [adr/](adr/): one file per significant decision.
4. [features/](features/): one folder per feature, in the order they're built.
5. [development.md](development.md): running, checks and dependencies.

## Architecture decision records

| #    | Decision |
| ---- | -------- |
| 0001 | [<Decision as a short statement>](adr/0001-short-title.md) |
| 0002 | [<Replaced decision>](adr/0002-short-title.md) (superseded by 0003) |

## Features

| #   | Feature | Status |
| --- | ------- | ------ |
| 001 | [<Feature name>](features/001-name/spec.md) | In progress |

## Proposals

| Proposal | For | Status |
| -------- | --- | ------ |
| [<Title>](proposals/name.md) | <other project> | Draft |

## Writing new docs

- **A new feature:** add `features/NNN-name/` with `spec.md` (what and why),
  `plan.md` (how, and which files) and `tasks.md` (small, checkable steps).
  Write the spec before code.
- **A decision someone could reasonably have made differently:** add an ADR.
  Never edit an accepted ADR's decision; supersede it with a new one.
```

List and table entries appear only once their file exists. Feature statuses:
In progress (spec written, tasks not all ticked), Done (every task ticked) and
Parked (spec written, work stopped by the user). A feature that has only been
talked about has no row; it goes in Open threads in `AGENTS.md`. Proposal statuses: Draft,
Posted, Accepted, Declined.

## docs/product.md

```markdown
# Product: <Project name>

## The problem

<What's hard or missing today, and for whom.>

## What it does

<The shape of the solution in a few sentences or bullets.>

## Who it's for

<The people who use it, and what they know or have.>

## Goals

- <Outcome the project must achieve.>

## Non-goals

- <Something it deliberately won't do, and why.>

## Principles

- <A value that settles trade-offs, e.g. "local first".>

## Constraints

- <Fixed limits: platforms, budget, hardware, law.>

## Success looks like

- <How you'd know it works.>

## Later, maybe

- <Ideas kept out of scope for now.>
```

## docs/architecture/overview.md

```markdown
# Architecture overview

<A few sentences, or a small diagram, of the main parts and how data moves
between them.>

## Data model

<The main entities or files and how they relate.>

## <Part, e.g. The server (`server/`)>

<What it's responsible for, what it talks to, anything non-obvious.>

### <Sub-part>

<Detail that someone changing this part needs.>

## Testing

<How the parts are tested and what's deliberately not.>
```

Add one `##` section per part as parts appear.

## docs/adr/NNNN-short-title.md

```markdown
# NNNN. <Decision as a short statement>

- **Status:** Accepted
- **Date:** <YYYY-MM-DD>
- **Decided by:** <Owner, or who>

## Context

<The situation and the forces at play when this was decided.>

## Decision

<What was decided, stated plainly.>

## Options considered

- **<Option>:** <why it was or wasn't chosen.>
- **<Option>:** <why it was or wasn't chosen.>

## Consequences

- <What becomes easier, harder, or now needs doing.>
```

Statuses: Proposed, Accepted, Rejected, Superseded by NNNN. Superseding
changes only the old ADR's status line, linked to the new ADR:

```markdown
- **Status:** Superseded by [NNNN](NNNN-short-title.md)
```

The new ADR's Context names the one it replaces and what changed.

## docs/features/NNN-name/spec.md

```markdown
# NNN. <Feature name>: spec

## Problem

<What the user can't do today, or does badly.>

## User stories

- As a <kind of user>, I want <something> so that <reason>.

## Requirements

- <What it must do, testable where possible.>

## Acceptance criteria

- <A concrete check that shows the feature works.>

## Out of scope

- <What this feature deliberately leaves out.>
```

## docs/features/NNN-name/plan.md

```markdown
# NNN. <Feature name>: plan

## Approach

<How it'll be built, and why this way.>

## Spikes before building

- <An uncertainty to try out first, and what would change the plan.>

## Modules

| File or module | Change |
| -------------- | ------ |
| <path> | <new / what changes> |

## Data decisions

- <Shapes, formats, storage choices for this feature.>

## Order

1. <Step that makes sense as one commit.>

## Testing

<What gets tested and how.>

## Risks planned for

- <What could go wrong, and what's in place for it.>
```

## docs/features/NNN-name/tasks.md

```markdown
# NNN. <Feature name>: tasks

- [ ] <Small, checkable step>
- [ ] <Small, checkable step>
- [ ] Docs: <which docs this feature adds or changes>
```

Tick a task only once it's verified.

## docs/development.md

```markdown
# Development

<One sentence: what's needed to work on this project.>

## Running

<How to install and run, including any variants (e.g. with sample data).>

## Checks

<Every check, what it catches, and when it must pass.>

## Local data

<Where local or private data lives, what's ignored by git, how to reset it.>

## Dependencies

<How dependencies are added and updated, and any rules on versions.>

## Known workarounds

### <Short name>

<What the workaround is, why it's needed, and when it can go.>
```

Add `##` sections for any other procedure someone will need to repeat.

## docs/proposals/name.md

```markdown
# <Project> feature request: <short title>

## Summary

<One paragraph a maintainer can read in a minute.>

## Why

<The use case, with a small example.>

## Proposal

<What the change could look like, e.g. an API sketch.>

## What we do today

<The current workaround and what it costs.>
```

Proposals are drafts. The owner decides whether and where to post them.
