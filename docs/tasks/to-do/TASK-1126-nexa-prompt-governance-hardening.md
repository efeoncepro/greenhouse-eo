# TASK-1126 — Nexa prompt governance hardening (golden snapshot + version/changelog gate)

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Domain: `nexa|platform|dx`

## Por qué existe

Follow-up de TASK-1124 (Nexa Intelligence). El system prompt ya es un artefacto versionado con
governance, pero dos huecos quedan abiertos:

1. Los tests del prompt asertan **substrings/anclas**, no el texto completo → un cambio de prompt
   puede colarse sin que el diff del test lo haga visible.
2. El doc-gate (`pnpm nexa:doc-gate`) exige que el **doc de capa** cambie cuando cambia el prompt,
   pero NO exige bumpear `version` ni agregar entrada al `changelog` de `NEXA_PROMPT_GOVERNANCE`.
   Se puede cambiar el prompt + tocar el doc, pero dejar la versión vieja.

## Qué hacer

1. **Golden snapshot del prompt V2 completo** con `now` fijo (determinista) en
   `nexa-system-prompt.test.ts` → cualquier cambio de prompt aparece en el diff del test y exige
   revisión consciente. (V1 también, como red de rollback.)
2. **Extender el doc-gate**: cuando cambia `src/lib/nexa/nexa-system-prompt.ts`, exigir que
   `NEXA_PROMPT_GOVERNANCE.changelog` tenga una entrada cuya `version` === `activeVersion` y que la
   `activeVersion` sea distinta a la del `HEAD` base (o que el changelog crezca). Cierra el caso
   "cambié el prompt pero no bumpeé la versión".
3. **Mirror Codex**: puntero explícito a `docs/architecture/nexa-intelligence/` desde la skill
   `.codex/skills/greenhouse-nexa-conversational/` (y `.claude/`) para que ambos agentes traten estos
   docs como SSOT.

## Aceptación

- Snapshot golden del prompt V1+V2 en CI (determinista, falla loud ante cualquier cambio de texto).
- El doc-gate falla si cambia el prompt sin bump de `version` + entrada de changelog.
- Skills (Claude + Codex) apuntan a `nexa-intelligence/`.

## Referencias

- Governance: `docs/architecture/nexa-intelligence/01-system-prompt-versioning.md` + `GREENHOUSE_NEXA_SYSTEM_PROMPT_GOVERNANCE_V1.md`.
- Gate: `scripts/ci/nexa-intelligence-doc-gate.mjs`.
- Procedencia: TASK-1124.
