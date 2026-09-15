# Agent Skills

A collection of reusable skills that can be used for any AI agents.

## Skills

| Skill |	Description |
|-------|-------------|
| [career-biographer](skills/career-biographer/) | [Reconstructing career history through conversational interviewing, memory retrieval, fact-checking, and storytelling—turning fragmented experiences into a structured career knowledge base for interviews, resumes, LinkedIn, and other professional materials.](docs/career-biographer/) |
| [docs-as-you-go](skills/docs-as-you-go/) | [Write a project's docs folder, decision records and feature specs step by step while vibe-coding, so nothing important lives only in the conversation, with reviewed steps and commits on request.](docs/docs-as-you-go/) |
| [repo-story](skills/repo-story/) | [Visualize repository activity and summarize how a project evolved over time for retrospectives, reviews, or resumes.](docs/repo-story/) |

## Installation

Install a specific skill with:
```bash
npx skills add githubstig/agent-skills --skill <skill-name>
```

For example:
```bash
npx skills add githubstig/agent-skills --skill career-biographer
```

Or just manually copy & paste a specific skill somewhere if you know what you are doing ☺️

## Contributing
Contributions and improvements are welcome. Please see the individual skill's documentation for any skill-specific guidance.
