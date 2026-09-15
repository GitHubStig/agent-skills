# Trial script

A quick way to test the skill without building a real project. You paste the
prompts below one at a time into an agent, and they walk through vibe-coding a
tiny app. Each prompt is there to trigger one part of the skill, and under it is
what should happen.

The app is **lab-log**: a small command-line tool that keeps blood test results
in a local file and shows which are out of range. It has no packages, no UI and
no network, so a cheap model can build it quickly.

## Setup

1. Make an empty folder and `git init` it, e.g. `~/code/lab-log-trial`.
2. Copy the skill into the agent's skills folder, e.g.
   `cp -R ~/github/agent-skills/skills/docs-as-you-go <agent's skills folder>/`.
   Copy it again before each run so it matches the branch. A symlink works too,
   but some agents refuse to read files through a link that points outside the
   project.
3. Open the agent in that folder, on a cheap model.

## How to run it

- Paste one prompt, then let the agent finish its step. It should stop and wait.
- When it stops for review, glance at the checks and tick them in the
  [scorecard](#scorecard). Then paste the next prompt. That prompt counts as
  your go-ahead.
- If it asks you something the script doesn't cover, answer briefly in any way.
  The checks are about how it keeps the docs, not what it builds.
- If it starts the next step without stopping, that's a failed check. Note it
  and carry on.

## Session 1

### 1. Start

```text
start docs-as-you-go. I want to build a tiny command-line tool called lab-log that keeps my blood test results in a local file and tells me which ones are out of range. It's just for me, runs on my laptop, and nothing goes online. No web UI.
```

- States the working agreement in a few lines.
- Creates `AGENTS.md` and `docs/README.md`, and probably `docs/product.md` (the
  goals and non-goals are known).
- No empty files, no empty headings, no "TBD".
- `docs/README.md` lists and links only files that exist, with no empty tables.
- Stops and waits.

### 2. Options

```text
I'm torn between Deno and Python for this. No third-party packages either way. What would you pick?
```

- Gives both options with a recommendation, and doesn't pick silently.
- Either writes nothing yet, or writes an ADR marked **Proposed** and says so.

### 3. A decision made in passing

```text
go with your pick
```

- An ADR is **Accepted**, with Options considered filled in, and a row in the
  `docs/README.md` table.
- "No third-party packages" is a rule in `AGENTS.md`.
- Commands (run, test) are in `AGENTS.md` once they exist.

### 4. A feature, plus decisions nobody announced

```text
first feature: `lab-log add` takes a test name, value, unit, low and high range and a date, and saves it. `lab-log list` shows everything by date. Don't bother with a database, one JSON file is plenty. Keep my real results out of git; put a few made-up ones in a samples file.
```

- Writes `features/001-…/spec.md`, `plan.md` and `tasks.md` **before** the code,
  and the feature row shows In progress.
- Records the storage choice (JSON, not a database) as an ADR, even though you
  didn't call it a decision.
- Adds the real-data rule to `AGENTS.md`, puts the data file in `.gitignore`,
  and uses made-up samples.
- If there's no test setup yet, proposes one as an ADR marked **Proposed** and
  flags it in the report, rather than picking one silently or skipping tests.
- Stops after the spec, plan and tasks, **before any code**, because the prompt
  didn't say to build straight away.

### 4b. Go ahead

```text
spec looks right, build it
```

- Builds feature 001 and runs the tests. Tasks are ticked only after they pass.
- The Proposed test setup ADR is now Accepted.

### 5. Commit

```text
looks good, commit it
```

- Stages everything except the agent's own folder (the copied skill), and says
  in its report what it left out.
- Conventional subject line, with bullets for separate changes.
- **No** `Co-authored-by` or "Generated with" line. Check with `git log -1`.
- Docs and code are in the same commit. Nothing is pushed.

### 6. Something vague

```text
make the out-of-range stuff nicer
```

- Asks what you mean, or offers options with a recommendation. It doesn't just
  guess and build.

### 7. A second feature

```text
put ↑ next to high values and ↓ next to low ones, and add `lab-log flagged` that only shows out-of-range results. no need to show me a spec first, just build it
```

- Builds straight away, in one step, but still writes the spec, plan and tasks
  before the code.
- A new `features/002-…` folder, or a clear reason it belongs in 001.
- Feature 001 is marked Done in the table if all its tasks are ticked.

### 8. Something that bites

```text
some results are written like "<5" instead of a number, and add crashes on them. treat "<5" as below 5, and only flag it if the range says so
```

- Fixed, with a test it ran and saw fail before the fix.
- The gotcha is in "Things that will bite you" in `AGENTS.md` (or the rule is in
  the spec), in plain words.

### 9. Parking something

```text
one day I'd like a chart of each test over time in the browser, but park that. commit what we have
```

- The browser chart is in Open threads in `AGENTS.md`, marked parked, with
  enough to pick it up.
- Commit checks as in step 5.

### 10. Stop mid-feature

```text
next: `lab-log trend <test>` prints a text sparkline like ▁▃▅▇ of that test's values over time
```

It should stop after the spec, plan and tasks, before any code, with the
feature's row showing In progress. Then end the session (close it, or start a
new conversation). This stands in for the conversation being lost or summarised.

## Session 2

### 11. Resume

```text
resume docs-as-you-go
```

- Reads `AGENTS.md`, `docs/README.md`, and the trend feature's spec and tasks
  before doing anything else.
- Says back, without asking you to repeat anything: the language and why, JSON
  storage and why, the test setup, the "<5" gotcha by name, the parked browser
  chart, and the trend feature's tasks left.
- Waits for your go-ahead before starting work.

### 12. Finish

```text
carry on
```

- Finishes the whole trend feature without stopping between tasks, ticks the
  tasks after the tests pass, and marks it Done.
- **Doesn't commit.** "Carry on" isn't a commit request.

### 13. A change of mind

```text
actually, switch storage from JSON to CSV so I can open it in a spreadsheet
```

- A new ADR supersedes the JSON one, and its Context names the old ADR and what
  changed.
- In the old ADR, **only the status line** changed ("Superseded by …").
- In the `docs/README.md` table, the old row says "(superseded by …)" and the
  new row is added.
- Every doc outside `docs/adr/` now just says CSV, including feature 001's spec,
  plan and tasks and file names like `sample-results.json`. Search the docs for
  "JSON": only the ADRs should mention it, with no "we used to…", "previously" or
  "update:" wording anywhere.

### 14. Commit and stop

```text
commit it, and that's it for today
```

- Commit checks as in step 5.
- A final docs pass: tasks, statuses and Open threads current.
- Says whether anything is left uncommitted.

## Optional: the cold-start test

In a brand new session **without** the skill, paste:

```text
Read this repo and tell me: what language it uses and why, where data is stored and why, what's parked, and how to run the tests. Don't open any source code.
```

If it answers all four from the docs alone, the docs did their job.

## Scorecard

| Step | Check | Pass |
| ---- | ----- | ---- |
| 1 | Only files with content; index links only existing files; stated the agreement; stopped | |
| 2 | Options with a recommendation | |
| 3 | ADR Accepted with options; rule in AGENTS.md | |
| 4 | Stopped after spec, before code; unannounced storage ADR; data kept out of git; test setup as a Proposed ADR | |
| 4b | Tests run; tasks ticked only after they pass; test ADR Accepted | |
| 5 | Agent folder left out and mentioned; conventional message, bullets, no attribution, not pushed | |
| 6 | Asked or offered options instead of guessing | |
| 7 | Built straight away when told, docs before code; new feature folder; 001 marked Done | |
| 8 | Gotcha recorded in plain words; test seen failing before the fix | |
| 9 | Parked item in Open threads | |
| 10 | Stopped after the spec, before code; row says In progress | |
| 11 | Resumed from the docs; said back decisions with reasons, gotchas, parked items, tasks left; waited | |
| 12 | Whole feature finished in one go; tasks ticked after tests; didn't commit | |
| 13 | Old row marked superseded; no JSON outside the ADRs; no history wording | |
| 14 | Final docs pass; commit clean | |
| Any | Stopped for review at the end of every step | |

Not covered by this script: proposals, Rejected ADRs, and the architecture
overview (a tool this small may never need one).
