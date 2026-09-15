# Why This Skill Exists

Vibe-coding prompt by prompt works well when you already know what you want, both the requirements and the technical approach. The weak spot is where the decisions live. They get made in conversation, and a conversation doesn't last. Context fills up and gets summarised, sessions end, and a new session (or a different agent, or another developer) starts with none of it.

The usual fix is to write docs at the end. By then the details that got summarised away are gone, and docs written after the build tend to read like a history lesson rather than a description.

This skill writes the docs **while** you build, in a fixed structure, in the same step each decision is made. It also keeps the working rhythm that makes that possible: small steps, a review after each one, and a commit when you ask for it.

## What It Does

Once you start it, the agent:

- Keeps a `docs/` folder and an `AGENTS.md` up to date as you work.
- Notices decisions you make in passing (picking an option, rejecting an approach, setting a rule) and records them as ADRs.
- Writes a feature's spec, plan and tasks as soon as the feature is agreed, and ticks tasks as they're verified.
- Parks anything you say "later" to in Open threads, with enough to pick it up again.
- Does a docs pass at the end of every step, and straight away when the conversation gets long.
- Works one step at a time: verify, report what changed and what was checked, then stop for your review.
- Commits only when asked: stages everything, writes a Conventional Commits message with bullets for separate changes, and adds no AI attribution line.

The structure it writes:

```
AGENTS.md
docs/
  README.md                   index with ADR and feature tables
  product.md
  architecture/overview.md
  adr/NNNN-short-title.md
  features/NNN-name/{spec.md, plan.md, tasks.md}
  development.md
  proposals/
```

## How to Use It

Install it, then ask for it by name at the start of a session:

```text
"start docs-as-you-go"
"let's build this with docs-as-you-go"
```

In a later session, or after the conversation has been summarised:

```text
"resume docs-as-you-go"
```

It never starts on its own. Once started, carry on prompting as usual.

## Design Decisions

**Only when called.** Some sessions are throwaway experiments that shouldn't grow a docs folder. The skill's description says to start only on request.

**Agent-neutral.** It uses nothing but files, the project's own commands and git. Instructions go in `AGENTS.md`, and any agent-specific instruction file just points to it. It doesn't depend on a particular model, harness, hooks, language or package manager.

**Full templates, files that grow.** Each template lists every heading its doc can have. A new file only holds the sections there's real content for, and others are added in order as content arrives. So there are no "TBD" placeholders, and every doc still ends up in the same shape.

**Docs read as if written before the build.** Present tense, what and why. No "we tried X first" or dated update notes. History belongs in git and in ADRs. When something changes, every doc outside the ADRs changes with it, including the specs of features finished long ago.

**Decisions are superseded, not edited.** Each ADR is Proposed, Accepted, Rejected or Superseded. An accepted ADR's decision stays as it was, so the record shows what was decided and when. A change of mind gets a new ADR that points back to it, and the old one's status is the only line that changes.

**The docs are the memory.** The test the agent applies at every step: if the conversation vanished now, could a fresh session continue from the repo alone?

**Commits without attribution.** The commit is yours. Messages follow Conventional Commits and never end with a co-author or "generated with" line, even when the agent would add one by default.

**Just a skill file.** No scripts, CLI, git hooks or pre-commit gates. The skill is a set of working habits that any agent can follow.

## Files

| File | What's there |
| ---- | ------------ |
| [`skills/docs-as-you-go/SKILL.md`](../../skills/docs-as-you-go/SKILL.md) | The skill: starting, resuming, triggers, writing rules, steps and commits |
| [`skills/docs-as-you-go/reference/templates.md`](../../skills/docs-as-you-go/reference/templates.md) | A template for every doc |
| [`trial-script.md`](trial-script.md) | Prompts to paste one at a time to test the skill on a tiny app, with a scorecard |
