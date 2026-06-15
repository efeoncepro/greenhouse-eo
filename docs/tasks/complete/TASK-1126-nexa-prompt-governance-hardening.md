# TASK-1126 — Nexa prompt governance hardening (golden snapshot + version/changelog gate)

## Status

- Lifecycle: `complete`
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

- Governance: `docs/architecture/nexa-intelligence/system-prompt/versioning.md` + `GREENHOUSE_NEXA_SYSTEM_PROMPT_GOVERNANCE_V1.md`.
- Gate: `scripts/ci/nexa-intelligence-doc-gate.mjs`.
- Procedencia: TASK-1124.

## Resultado (2026-06-15, completo en `develop` — local-first, sin push)

1. **Golden snapshot** ✓ — `src/lib/nexa/nexa-system-prompt.test.ts` agrega 2 goldens deterministas (V2 activo + V1 rollback) vía `toMatchSnapshot()` (convención del repo, mismo patrón que `EmailTemplateBaseline`). `.snap` committeado en `src/lib/nexa/__snapshots__/`. `FIXED_NOW` pinea la fecha `America/Santiago` → byte-estable. Cualquier cambio de texto del prompt aparece en el diff del `.snap`.
2. **Doc-gate de version/changelog** ✓ — `scripts/ci/nexa-intelligence-doc-gate.mjs` (`--changed`): cuando cambia `nexa-system-prompt.ts`, parsea `NEXA_PROMPT_GOVERNANCE` por regex (resuelve los consts `NEXA_SYSTEM_PROMPT_V*_VERSION`; el `.mjs` no importa TS) y exige (A) changelog con entrada == `activeVersion` **y** (B) `activeVersion` bumpeada vs base **o** changelog que creció. Verificado live: edit-sin-bump → FALLA (exit 1); edit+changelog-grow → PASA; prompt intacto → skip.
3. **Mirror Codex** ✓ — el puntero a `docs/architecture/nexa-intelligence/` ya existía en ambas skills (TASK-1131); reforzado el bullet del prompt para nombrar el gate + golden + `versioning.md`. `.claude/` y `.codex/` byte-idénticas.

Doc de capa actualizada: `system-prompt/versioning.md` (checklist + freeze-on-bump del changelog append-only + shape canónica que el gate parsea). Gates: lint 0 · tsc 0 · 14/14 focales · doc-gate audit+changed verde. Sin migración / capability / outbox / UI / rollout runtime → estado **completo**.

Cross-impact: `## Delta 2026-06-15` agregado a TASK-1138 (prompt-policy, debe regenerar el golden + bump satisface el gate) y TASK-1132 (si toca voz/emoji del prompt).
