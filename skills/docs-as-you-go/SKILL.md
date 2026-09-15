---
name: docs-as-you-go
description: Write and maintain a project's docs folder (product, architecture, decision records, feature spec/plan/tasks, development notes) and an AGENTS.md step by step while the project is being built prompt by prompt, so decisions and requirements live in the repo instead of only in the conversation. Also works in small reviewed steps and makes conventional commits on request. Use only when someone explicitly asks for it, e.g. "start docs-as-you-go", "document this as we build", "resume docs-as-you-go"; never start it on your own.
---

# Docs as you go

The user builds by prompting, one idea at a time. They usually know what they
want, both the requirements and the technical approach, and they make decisions
in conversation. This skill makes sure every one of those decisions ends up in
the repo, in a fixed docs structure, **in the same step it was made**.

Two reasons this matters:

- **Conversations get lost.** Context runs out, gets summarised or the session
  ends. Anything that exists only in the chat is gone. The docs are the memory.
- **The next session starts cold.** A new session, a different agent or another
  developer should be able to continue from the repo alone.

The skill is agent-neutral. It needs only reading and writing files, running the
project's own commands, and git. Nothing here depends on a particular model,
agent, harness or language.

## Contents

- [Starting](#starting)
- [Resuming](#resuming)
- [The docs](#the-docs)
- [When to write what](#when-to-write-what)
- [Nothing lives only in the chat](#nothing-lives-only-in-the-chat)
- [Noticing decisions](#noticing-decisions)
- [How the docs are written](#how-the-docs-are-written)
- [Working in steps](#working-in-steps)
- [Commits](#commits)
- [Stopping](#stopping)

## Starting

Start only when the user asks. Then:

1. **Look before writing.** Read the README, any existing `docs/` and
   `AGENTS.md`, and the build or package files to learn the language and the
   commands. Check whether it's a git repo.
2. **Existing docs win.** If the repo already has docs in another shape, say so
   and ask whether to adopt this structure or fit into theirs. Never restructure
   without a yes.
3. **Create only what there's content for.** Usually that's `AGENTS.md` and
   `docs/README.md` at first. Other files appear when their trigger is hit (see
   [When to write what](#when-to-write-what)). An empty repo with one sentence of
   intent gets a two-line `AGENTS.md`, not ten empty files. Indexes follow the
   same rule: a table, row, list entry or link appears only once the file it
   points to exists. That includes the links under "What this is" in
   `AGENTS.md`. Never write a placeholder link or a "pending" note.
4. **Other instruction files point here.** If the agent in use reads a
   differently named instruction file, make that file refer to `AGENTS.md`
   instead of copying its content, so there's one set of rules.
5. **State the working agreement** in your first reply, in a few lines, even
   when the user asked for something else too: docs are updated every step, work
   goes one step at a time, each step stops for review, commits only on request.
   Then continue with whatever the user asked for.

Templates for every file are in [reference/templates.md](reference/templates.md).

## Resuming

At the start of every new session, and whenever earlier conversation may have
been summarised or lost, before doing anything else:

1. Read `AGENTS.md`, then `docs/README.md`.
2. Read `spec.md` and `tasks.md` for every feature not marked Done.
3. Read the Open threads in `AGENTS.md`.
4. Say back, without being asked, even when some of it doesn't seem to matter
   for the next step:
   - each Accepted ADR's decision and why, one line each (the language, storage
     and so on);
   - each entry in "Things that will bite you", by name;
   - what's parked;
   - the tasks left in any unfinished feature.

   Then wait for the go-ahead.

Trust the docs over what you think you remember from the conversation. If they
disagree with what the user is now asking, point out the difference and ask.

## The docs

```
AGENTS.md                     rules and gotchas for anyone (or any agent) working here
docs/
  README.md                   index: reading order, ADR table, feature table
  product.md                  the problem, who it's for, goals and non-goals
  architecture/overview.md    the parts and how data moves between them
  adr/NNNN-short-title.md     one file per significant decision
  features/NNN-name/
    spec.md                   what and why: problem, stories, requirements, acceptance
    plan.md                   how: approach, modules or files, order
    tasks.md                  small checkable steps
  development.md              running, checks, local data, dependencies, workarounds
  proposals/                  drafts for other projects (feature requests upstream)
```

Numbers are zero-padded and never reused: ADRs `0001`, features `001`.

## When to write what

| Trigger in the conversation                                             | Write                                                        |
| ----------------------------------------------------------------------- | ------------------------------------------------------------ |
| The user explains what the project is, who it's for or what it won't do | `docs/product.md`, and "What this is" in `AGENTS.md`         |
| A choice between real alternatives is made (see below)                  | A new ADR, and a row in the `docs/README.md` table           |
| A feature is agreed, before its code                                    | `features/NNN-name/spec.md`, `plan.md`, `tasks.md`, table row |
| Two or more parts start to talk to each other, or data gets a shape     | `docs/architecture/overview.md`                              |
| Commands to run, check, test or build settle                            | "Commands" in `AGENTS.md`; details in `docs/development.md`  |
| A rule is set ("always…", "never…")                                     | "Rules" in `AGENTS.md`; an ADR if it needed weighing up      |
| Something surprising breaks and gets worked around                      | "Things that will bite you" in `AGENTS.md`                   |
| The user parks something ("later", "park it", "not now")                | "Open threads" in `AGENTS.md`, with enough to resume it      |
| An idea needs another project to change                                 | A draft in `docs/proposals/`; the user posts it              |
| A task in a feature is finished and verified                            | Tick it in that feature's `tasks.md`                         |
| A feature's spec is written                                             | Its row in the `docs/README.md` table says In progress       |
| A feature's last task is ticked                                         | Its status in the `docs/README.md` table becomes Done        |
| A bug is fixed                                                          | A test that fails without the fix; a gotcha if it could recur |
| The user reverses an earlier decision                                   | A superseding ADR, and every doc that mentions the old choice |

Update the index tables in `docs/README.md` in the same step as the file they
list.

## Nothing lives only in the chat

This is the rule the skill exists for.

- **Every step ends with a docs pass.** Before reporting a step as done, update
  every doc the step affected, and check that every link in those docs resolves.
  Docs-only steps included. Code and its docs are one change.
- **Decisions are written when they're made,** not at the end of the feature.
- **Before anything long** (a big refactor, a long run, a research dive), write
  down where things stand: tick tasks, add open questions to `tasks.md` or Open
  threads.
- **When the conversation is getting long,** or the agent shows any sign that
  earlier context is being summarised, do a docs pass straight away, even
  mid-step, and say so.
- **The test:** if this conversation disappeared right now, could a fresh session
  continue from the repo alone, without asking the user to repeat themselves? If
  not, something is still only in the chat. Write it down.

Chat-only details that matter and have no home yet (a half-agreed idea, a
question the user hasn't answered) go in Open threads, marked as such.

## Noticing decisions

Watch for decisions the user doesn't announce as decisions. Signs:

- They pick one of the options you offered.
- They reject an approach ("no, don't use X", "keep it simple").
- They set a constraint ("no cloud", "exact versions only", "never npm").
- Something was tried and dropped for a reason.
- A library, service, storage or file format is chosen.
- They change their mind about an earlier decision.

Write an ADR when someone could reasonably have chosen differently. Record the
options that were on the table and why the chosen one won, in the user's
reasoning where they gave it. Mention it in the step report ("recorded as ADR
0007"). A small preference that needed no weighing up goes into Rules in
`AGENTS.md` instead. When unsure whether it's worth an ADR, ask in one line.

Every ADR has a status:

- **Proposed:** written while the choice is still being discussed, or when you
  suggest a decision the user hasn't agreed to yet. Say so in the step report.
- **Accepted:** the user agreed. Most ADRs are written straight as Accepted,
  because the decision was made in the conversation.
- **Rejected:** a Proposed ADR the user turned down. Delete it instead, unless
  the reasons are worth remembering.
- **Superseded by NNNN:** a later ADR replaced it.

Once an ADR is Accepted, never edit its decision. When the user changes their
mind, write a new ADR that supersedes it: its Context names the old ADR and what
changed. In the old ADR, change only the status line. In the `docs/README.md`
table, add "(superseded by NNNN)" to the old row and add the new one. Fixing a
typo or a broken link is fine; changing what was decided is not.

Then clean up everything else. Search every doc outside `docs/adr/` for the old
choice: its name, file names, commands and formats. That includes the spec, plan
and tasks of features finished long ago. Rewrite each mention to describe the new
choice, in the present tense.

## How the docs are written

- **The templates list every heading; files only hold the ones with content.**
  Create a doc with just the sections there's something real to say about. When
  new content arrives, add its section in the template's order. No "TBD", no
  empty headings, no placeholder text.
- **Docs read as if written before the build.** Present tense, describing what
  the project does and why. No "we first tried…", "update:", dated change notes
  or "how it went" sections. History lives in git and ADRs. (ADR Context sections
  are the exception: they explain the situation at the time.) A spec's Problem
  says what's missing, in the present tense ("there's no way to…"), not how the
  code used to behave.
- **Everything outside the ADRs describes the project as it is now.** That
  includes finished features' spec, plan and tasks. When something changes, they
  change with it.
- **Plain words, short sentences.** Explain why, not just what. Name files and
  commands exactly.
- **`AGENTS.md` stays short.** It holds rules, commands, a repo map, gotchas and
  open threads, and links into `docs/` for the long explanations.
- **A new feature's spec, plan and tasks are their own step.** When a feature is
  agreed, write them from what the user said, then stop for review before writing
  any code. Only when the user says to build straight away ("no need to show me
  the spec", "just build it") write the docs and the code in one step, still in
  that order: spec, plan and tasks first, then the code.
- **Tasks are ticked when verified:** after an automated check passes, or after a
  manual check the user agreed to. Never just because the code is written.
- **Keep the user's words for decisions.** If they gave a reason, use it.

## Working in steps

- **One step at a time.** A step is one request from the user: finish all of
  it, then stop. "Carry on" on a feature whose plan is approved means the whole
  feature, not just the next task; stop early only for a real question. When a
  request is big, say the steps before starting (for a feature, its plan's Order
  is that list), and suggest splitting it so each part makes sense as one commit.
- **Tests.** If the project has no automated tests yet, don't pick a setup
  silently, and never decide on your own that it doesn't need tests. Write the
  setup you recommend (the language's built-in test runner where there is one)
  as an ADR marked Proposed, and flag it in that step's report. It becomes
  Accepted when the user goes ahead. Every bug fix starts with a test: run it,
  see it fail, then fix.
- **Verify with the project's own checks.** Formatting, linting, tests and build,
  whatever the project uses. For anything visible, look at it (run it, take a
  screenshot if you can). Check that links in changed docs resolve.
- **Stop and report** at the end of each step, in three short parts:
  - **Changed:** code and docs touched.
  - **Checked:** what was verified, and what wasn't and why.
  - **Next:** the next step, and any question for the user.

  Then offer a review and a commit, and wait. Don't start the next step until the
  user says so. "Carry on", "continue", "next" and "looks good" are a go-ahead
  for the next step, never a request to commit.
- **Offer options with a recommendation** when there's a real choice. Don't pick
  silently, and don't list options without saying which you'd take.
- **Ask when something is genuinely unclear** rather than guessing.
- **Spikes before building.** When an approach is uncertain, try it in a
  throwaway location first. Spike code is never committed; what it showed goes in
  the plan or an ADR.
- **Temporary files** go outside the repo or are deleted before the step ends.
- **Match the surrounding code:** its naming, comment density and idioms.

## Commits

Only commit when the user explicitly asks for a commit ("commit", "commit it",
"make a commit"). When they do:

1. **Look at what's changed first.** Stage everything except an agent's own
   folders (its local settings or skills), which stay out unless the user says
   otherwise. If anything else looks like it shouldn't be committed (secrets,
   large binaries, data or build output), leave it out and ask. Say in your
   report what was left out and why.
2. **Write a Conventional Commits message.** A one-line subject:
   `type: summary` or `type(scope): summary`, imperative, lowercase start, no
   full stop, about 72 characters at most. Types: `feat`, `fix`, `docs`,
   `refactor`, `test`, `chore`, `build`, `ci`, `perf`, `style`.
3. **Several separate changes get bullets.** After a blank line, one short bullet
   per change. A single change needs only the subject.
4. **No attribution.** Never end with `Co-authored-by`, "Generated with", or any
   line crediting an AI, agent or tool, even if the agent in use adds one by
   default.
5. **Docs go in the same commit** as the code they describe.
6. **Never push, amend, rebase or force-push** unless the user asks.

```
fix: keep the filter panel open after saving
```

```
feat: add CSV export for reports

- export button on the report screen
- dates and numbers written in the user's locale
- docs: feature 004 spec and plan, ADR 0006 for the CSV library
```

## Stopping

When the user says they're done for now, or the session is ending:

1. Do a final docs pass: tasks ticked, feature statuses right, Open threads
   current, including anything half-discussed.
2. Report what's uncommitted, if anything, and offer a commit.
