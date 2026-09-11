# Prompt — write a repository's story from its evidence pack

You are writing `REPO_STORY.md`: a narrative of how a software repository was transformed over
its lifetime, for a human who wants to describe this work on a resume, in a cover letter, in a
performance review, or in a project retrospective.

Your input is an **evidence pack** generated from the repository's complete git history. Every
figure in it is real. Everything you write must trace back to it.

## Contents

- What makes this hard, and what to ignore
- Structure — 1. Header · 2. Eras · 3. Where it ended up · 4. Story angles ·
  5. Claims to verify · 6. Provenance
- Evidence rules — citation and honesty requirements. **Read these; they are not optional.**
- Tone

Read this file in full before writing. The rules at the end are what keep the output
trustworthy, and they are the easiest part to miss on a partial read.

---

## What makes this hard, and what to ignore

A commit log is mostly noise. Typos, formatting, "wip", "fix build" — none of it belongs in a
story. **A bullet earns its place only if it names a capability, an architectural change, or a
change in how the work was done.** If you cannot say what became possible, or what got better,
cut the bullet.

Equally: a long run of near-identical commits is *one* event, not hundreds. The evidence pack
has already collapsed these into patterns with counts and date ranges.

---

## Structure

### 1. Header

Repository name, the full date range, total commits, contributor count. One short paragraph
saying what the repository is *for*, inferred from its directory names, manifests and subjects.
If you cannot tell, say so plainly rather than guessing.

### 2. Eras

Group the history into **4–9 named eras**. Give each a name and a date range:

```
## Era 3 · The great expansion — Dec 2022 – Jan 2023
```

Derive boundaries from the evidence, in rough order of reliability:

- **Directory lifecycle** — a top-level directory first appearing is usually a new capability;
  last appearing is usually a retirement. This is the strongest signal in the pack.
- **Large structural commits** — rewrites, migrations, mass refactors.
- **Renames and moves** — directory restructures mark reorganisations.
- **Subject-pattern date ranges** — a pattern concentrated in a window is a campaign.
- **Inactivity gaps** — a long idle stretch often separates two chapters of work.
- **Dependency/manifest changes** — toolchain or runtime shifts.

Under each era, 2–6 bullets. Every bullet cites its evidence inline:

```
- Removed a heavyweight external dependency, folding its work into a single tool
  [`8309e1d`, 676 files, +1,341/−4,820].
- Rolled the migration out in alphabetical batches over ~6 weeks rather than one
  change, keeping each batch independently verifiable [18 commits matching
  `migrate <PATH>* off the legacy client`, 2023-03-06 → 2023-04-13].
```

### 3. Where it ended up

A short table or list: the repo's shape at HEAD versus its first commit, drawn from the
"Then vs now" section.

### 4. Story angles

4–6 condensed, quantified statements the person can lift more or less directly into a resume
or cover letter. Vary the altitude — ownership/scale, a throughput or efficiency win,
an architecture change, a judgment call. Write them as achievements, not duties:

> Cut a two-tool build pipeline down to one, removing a heavyweight external dependency and
> rolling the change across 676 files in verifiable batches.

### 5. CLAIMS TO VERIFY

**Mandatory. Never omit this section.**

List every statement you made that the evidence pack does not directly prove, with what to
check. This is what makes the document trustworthy enough to put your name on:

```
## Claims to verify

- [ ] "~33% faster" — this comes from commit 757adce's *message*, not a measurement.
      Attribute it as a claim made at the time, or drop it.
- [ ] "271 artifacts shipped" — a working-tree fact, not in git history. Count it directly.
- [ ] Era 6 framing assumes that work was externally driven — not stated in any commit.
```

### 6. Provenance

Close with a one-line provenance note, copying the version and date from the top of the
evidence pack (you have no reliable clock — never invent a date):

```
---
*Evidence: `evidence.mjs` v1.0.1, generated 2026-08-17 — deterministic, derived from git history.
Narrative written from that evidence; unverified claims are listed above.*
```

---

## Evidence rules

1. **Cite hashes.** Every factual claim carries `[hash]` or `[N commits, date → date]`.
2. **Never invent numbers.** If a figure isn't in the pack, don't state it. The pack's
   "NOT IN GIT" section lists what you specifically must not assert.
3. **A commit message is testimony, not proof.** If a message claims a speedup, report it as
   *"the commit message records ~33% faster"* and add it to Claims to Verify.
4. **Describe repetitive campaigns by their method, not their volume.** "Added 240 maps" is a
   weak line. "Built a scaffolding generator and a verification scraper so 240 maps could be
   added in six weeks with consistent documentation" is the real accomplishment. If the pack
   shows tooling commits *during* a campaign, that is the story.
5. **Flag partial work honestly.** If a migration touched some of the codebase and not the
   rest, say so. An incremental migration that never broke the build is a strength when framed
   correctly and a liability when overclaimed.
6. **Don't infer intent.** Git records what changed, rarely why. Where you infer motive, mark
   it as inference.
7. **Attribute honestly on multi-author repos.** The pack gives per-contributor counts; don't
   write a solo narrative for a team effort.

## Tone

Plain and concrete. No "leveraged", "spearheaded", "robust solutions". Let the numbers and the
specifics carry the weight — they are more impressive than adjectives.
