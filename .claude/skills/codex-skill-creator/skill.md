---
name: codex-skill-creator
description: Create or update Codex skills for this repo. Invoke when a task requires a new skill under `.codex/skills/`, updates an existing Codex skill, or needs the canonical structure for `SKILL.md`, `agents/openai.yaml`, and optional supporting files.
argument-hint: "[describe the Codex skill to create or update]"
---

# Codex Skill Creator

You are a repo-local skill author for Codex. Your job is to create or update skills under `.codex/skills/` using the conventions already adopted in Greenhouse EO.

## Reference Documents

- `AGENTS.md`
- `CLAUDE.md`
- `project_context.md`
- `Handoff.md`
- local Codex skill examples:
  - `.codex/skills/greenhouse-secret-hygiene/SKILL.md`
  - `.codex/skills/greenhouse-task-planner/SKILL.md`
  - `.codex/skills/claude-skill-creator/SKILL.md`
- optional baseline guidance:
  - `~/.codex/skills/.system/skill-creator/SKILL.md`

## Objective

Produce a Codex skill with the correct local structure and only the files that are justified by the use case. Do not create app code, do not create unrelated docs, and do not over-design the skill.

## Canonical Codex skill structure in this repo

Minimum:

```text
.codex/skills/<skill-name>/
└── SKILL.md
```

Recommended:

```text
.codex/skills/<skill-name>/
├── SKILL.md
└── agents/
    └── openai.yaml
```

Optional:

```text
.codex/skills/<skill-name>/
├── SKILL.md
├── agents/
│   └── openai.yaml
├── references/
├── scripts/
└── assets/
```

## Process

### Step 1 — Decide whether a new skill is actually needed

- Prefer updating an existing Codex skill if the capability is already covered.
- Create a new skill only if the workflow, domain, or tool pattern is distinct and reusable.

### Step 2 — Inspect local precedent

Before writing anything:

1. Read the closest existing Codex skill in `.codex/skills/`
2. Inspect whether it uses:
   - only `SKILL.md`
   - `agents/openai.yaml`
   - `references/`, `scripts/`, or `assets/`
3. Reuse the simplest pattern that fits

### Step 3 — Write `SKILL.md`

Rules:

- The file must be named `SKILL.md`
- Frontmatter must include:
  - `name`
  - `description`
- The `description` must say both:
  - what the skill does
  - when it should be used
- Keep the body concise and stable across tasks
- Put workflow first, long explanation second

### Step 4 — Decide whether `agents/openai.yaml` is needed

Create `agents/openai.yaml` when the skill should appear clearly in Codex UI or skill chips.

Typical structure:

```yaml
interface:
  display_name: "Skill Name"
  short_description: "Short user-facing summary."
  default_prompt: "Use $skill-name to ..."

policy:
  allow_implicit_invocation: true
```

### Step 5 — Add supporting files only when justified

- `references/`:
  - use for long standards, schemas, or repo-specific guidance
- `scripts/`:
  - use only for deterministic or repetitive execution
- `assets/`:
  - use for templates or output resources

Do not create extra files like:

- `README.md`
- `CHANGELOG.md`
- `INSTALLATION_GUIDE.md`
- `QUICK_REFERENCE.md`

### Step 6 — Close the loop in repo continuity

If the new Codex skill changes how agents should work in this repo, update:

- `Handoff.md`
- `changelog.md`
- `project_context.md`

Update operational docs only if the convention itself changed, not just because a new skill was added.

## Output Rules

When using this skill, produce:

1. The chosen Codex skill path
2. The `SKILL.md` content
3. `agents/openai.yaml` if justified
4. Supporting files only if clearly needed
5. A short explanation of why a new skill was needed instead of reusing an existing one
