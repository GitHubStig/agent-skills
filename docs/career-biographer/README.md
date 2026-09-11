# Why This Skill Exists

Reconstructing a career history sounds simple until you actually try to do it.

Over the years, we accumulate a huge number of projects, features, technical problems, decisions, successes, failures, and lessons. The difficulty is often not that the information doesn't exist—it is that it is scattered across memory, old code, conversations, documents, and half-remembered stories.

Remembering the details can also be surprisingly difficult. A project that felt important at the time may be hard to recall years later. You might remember how something worked but not why it was built. You might remember the problem but forget who you worked with. You might remember the outcome but not the path that led there.

And when trying to document all of this, the natural instinct is to organise everything into a resume, a timeline, or STAR format.

That can be the wrong place to start.

## The approach

This skill treats career reconstruction as an **interview and biography-writing process**, rather than a writing exercise.

The user can talk naturally about their experiences, including jumping between projects, years, people, and technical details.

The AI's job is to listen, make sense of the fragments, and ask useful questions that help recover the missing pieces.

For example:

* What problem were you actually trying to solve?
* What did users experience before this?
* What did you personally own?
* Who did you work with?
* Was this cross-team?
* How did the feature actually work?
* What alternatives did you consider?
* Why did you choose that approach?
* What went wrong?
* What happened after it shipped?
* What did you learn?
* When did this actually happen?

Sometimes simply explaining how a feature worked can trigger memories about the problem, the people involved, or the decisions that were made.

The goal is to make the AI do the organising and interviewing rather than requiring the user to do all of that work up front.

## Non-linear memories, chronological story

The interview process does not need to be chronological.

People rarely remember their careers that way.

A conversation might move from a project in one year to something from several years earlier, then back again. That is fine.

The skill separates the **process of remembering** from the **process of organising**:

> **Non-linear recollection → investigation → verification → structured stories → chronological career narrative**

This allows the user to focus on remembering and explaining rather than constantly worrying about where each piece belongs.

## From one career history to many useful outputs

The goal is not to create a resume and stop there.

The underlying career knowledge should be much richer than any single professional document.

Once that knowledge exists, it can be used to create:

* a long-form career story
* structured STAR stories
* interview answers
* general resumes
* targeted resumes
* networking material
* LinkedIn profiles
* professional biographies
* portfolio content
* other career-related material

For example, an experience that is not particularly useful on a resume might still be an excellent answer to:

> "Tell me about a time you failed."

Another experience might be a stronger answer to:

> "What's the most impactful thing you've built?"

The same underlying experience can also be framed differently for a technical, leadership, collaboration, or product-focused question without changing the underlying facts.

## Why preserve so much detail?

Because you don't always know what will become useful later.

A technical detail that seems irrelevant today may become important when applying for a particular role six months from now.

A failed project may be more valuable in an interview than a successful one.

A disagreement may demonstrate more leadership than a straightforward project delivery.

A small feature may contain a great example of product thinking, technical judgment, or collaboration.

For that reason, the career knowledge base should preserve the richer history first and selectively derive shorter outputs from it later.

## Accuracy matters

Career documents have a strong temptation to become increasingly polished until they stop being accurate.

This skill is designed to work in the opposite direction.

It should distinguish between:

* what the user remembers
* what is verified
* what is inferred
* what is uncertain
* what is simply unknown

Where evidence is available, it can be used to verify dates, names, timelines, contributions, and technical history.

For software projects, version-control history can sometimes be particularly useful for this. However, tools such as Git are optional; the workflow is intended to remain useful even when no historical artifacts are available.

The skill should never invent metrics, responsibilities, outcomes, dates, or achievements simply because they would make a story or resume stronger.

## Why the writing voice is separate

A career history should sound like the person who lived it.

At the same time, the AI needs to know how to turn a natural, sometimes messy conversation into readable professional writing without making it sound generic or artificially polished.

The optional `MY_WRITING_VOICE.md` file exists for that purpose.

It is built from actual user-authored writing over time rather than being treated as a personality or psychological profile.

It should only be created once there is enough evidence to identify genuine recurring patterns, and the user can choose whether to create or maintain it.

## The bigger idea

The end goal is a durable **personal career knowledge base**.

Instead of repeatedly reconstructing the same career history every time you need a resume, prepare for an interview, update LinkedIn, or tell someone about an old project, the information can be captured once and reused many times.

The architecture is intentionally simple:

```text
                    Career experiences
                           │
                           ▼
                Career knowledge base
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
     Career story      Story bank      Experience index
          │                │                │
          └────────────────┼────────────────┘
                           ▼
                    Derived outputs
              ┌────────────┼────────────┐
              ▼            ▼            ▼
          Interview      Resume       LinkedIn
            answers       / CV          / Bio
```

The important part is the middle.

**The career knowledge is the source of truth.**

Everything else is a view of it.
