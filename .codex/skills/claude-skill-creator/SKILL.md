---
name: claude-skill-creator
description: Create or update Claude Code skills under `.claude/skills/` or `~/.claude/skills/` using the official Anthropic skills format and this repo's local conventions. Use when a human asks to create a Claude skill, migrate a legacy Claude skill, choose frontmatter, or scaffold supporting files for Claude.
---

# Claude Skill Creator

Use this skill when the task is to create, update, migrate, or review a Claude Code skill.

## First reads

Read only what the task needs, in this order:

- `<repo>/AGENTS.md`
- `<repo>/CLAUDE.md`
- `<repo>/project_context.md`
- `<repo>/Handoff.md`
- `references/official-claude-skills-reference.md`
- existing local examples, if present:
  - `<repo>/.claude/skills/greenhouse-email/skill.md`
  - `<repo>/.claude/skills/greenhouse-task-planner/skill.md`

## What this skill covers

- creating a new Claude skill in:
  - project scope: `.claude/skills/<skill-name>/`
  - personal scope: `~/.claude/skills/<skill-name>/`
- choosing the right frontmatter for the skill
- deciding whether the skill should auto-load or be manual-only
- adding supporting files like references, examples, or scripts
- reconciling official Anthropic guidance with repo-local legacy patterns

## Core rules

- Anthropic’s current official convention is:
  - `.claude/skills/<skill-name>/SKILL.md`
  - `SKILL.md` is the canonical entrypoint
- This repo currently has legacy lowercase examples:
  - `.claude/skills/greenhouse-email/skill.md`
  - `.claude/skills/greenhouse-task-planner/skill.md`
- For new Claude skills in this repo:
  - prefer the official `SKILL.md` entrypoint
  - if you are touching an existing lowercase `skill.md`, preserve or migrate intentionally, and call out the decision explicitly
- Keep the main `SKILL.md` concise. Anthropic recommends keeping it under 500 lines and moving heavy detail to supporting files.
- Do not invent frontmatter fields. Use only fields documented in the official Claude skills docs unless the user explicitly wants an experimental pattern.

## Default design decisions

Choose the invocation mode deliberately:

- reference or background knowledge:
  - let Claude auto-load it
  - do not set `disable-model-invocation: true`
- manual workflow with side effects:
  - set `disable-model-invocation: true`
- background-only knowledge not meant for `/menu` use:
  - set `user-invocable: false`

Useful frontmatter fields from the official docs:

- `name`
- `description`
- `argument-hint`
- `disable-model-invocation`
- `user-invocable`
- `allowed-tools`
- `model`
- `effort`
- `context`

## Workflow

1. Determine scope

- project-local skill → `.claude/skills/<skill-name>/`
- personal skill → `~/.claude/skills/<skill-name>/`

2. Inspect local precedent

- read existing `.claude/skills/*` examples in the repo
- detect whether the repo is using official `SKILL.md` or legacy lowercase `skill.md`
- if there is drift, prefer official `SKILL.md` for new skills and document the compatibility note

3. Decide the skill type

- knowledge/reference skill
- task/workflow skill
- hybrid skill with both background knowledge and direct invocation

4. Scaffold the directory

Minimum:

```text
.claude/skills/<skill-name>/
└── SKILL.md
```

Optional:

```text
.claude/skills/<skill-name>/
├── SKILL.md
├── reference.md
├── examples.md
└── scripts/
    └── helper.sh
```

5. Write frontmatter first

Use the smallest valid set that fits the job:

```yaml
---
name: skill-name
description: What the skill does and when to use it.
---
```

Add `argument-hint`, `disable-model-invocation`, `user-invocable`, or `allowed-tools` only when they materially improve invocation behavior.

6. Write the body for standing guidance

- write instructions that remain valid for the whole task
- avoid one-shot advice that becomes stale after the first response
- if arguments matter, use `$ARGUMENTS`, `$0`, `$1`, or `${CLAUDE_SKILL_DIR}` only when the skill truly benefits from them

7. Add supporting files when needed

- move detailed specs, long examples, or templates into side files
- reference those files from `SKILL.md` so Claude knows when to load them

8. Close the loop

If the skill is being added to this repo:

- update `Handoff.md` if the new capability matters to the next agent
- update `changelog.md` if repo workflow or operating capability changed
- update `project_context.md` if the new skill changes the working contract for agents

## Output expectations

When using this skill, produce:

- the chosen Claude skill path
- the frontmatter strategy and why
- the `SKILL.md` contents
- any supporting files, only if needed
- a short note if you detected drift between official Claude docs and local repo conventions
