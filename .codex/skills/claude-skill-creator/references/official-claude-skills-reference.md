# Official Claude Skills Reference

Source checked: Anthropic Claude Code docs

- Official docs: https://code.claude.com/docs/en/skills

## Canonical structure

Anthropic documents skills as directories with `SKILL.md` as the required entrypoint.

Canonical locations:

- personal: `~/.claude/skills/<skill-name>/SKILL.md`
- project: `.claude/skills/<skill-name>/SKILL.md`
- plugin: `<plugin>/skills/<skill-name>/SKILL.md`

## Key official points

- `SKILL.md` has YAML frontmatter plus markdown instructions.
- `description` is the most important frontmatter field because Claude uses it to decide when to load the skill.
- `name` becomes the slash command.
- Skills can include supporting files like references, examples, templates, and scripts.
- `SKILL.md` should stay focused; heavy detail belongs in supporting files.
- `disable-model-invocation: true` is for manual-only workflows with side effects.
- `user-invocable: false` is for background-only knowledge.
- Official docs recommend keeping `SKILL.md` under 500 lines.

## Repo-specific note

This repo currently contains legacy Claude skill examples using lowercase `skill.md`:

- `.claude/skills/greenhouse-email/skill.md`
- `.claude/skills/greenhouse-task-planner/skill.md`

When creating new skills, prefer the official `SKILL.md` path unless the task is explicitly about preserving or migrating that legacy convention.
