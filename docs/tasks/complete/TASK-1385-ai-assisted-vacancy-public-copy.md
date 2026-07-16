# TASK-1385 — AI-Assisted Vacancy Public Copy (propose→confirm)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Backend impact: `api`
- Epic: `EPIC-011`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `agency|hr|ai`
- Blocked by: `none`
- Branch: `task/TASK-1385-ai-assisted-vacancy-public-copy`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Extender el patrón propose→confirm de TASK-1361 a la **redacción del payload público de una vacante**: la IA propone los campos `public_*` del opening desde inputs allowlist-safe (demanda + competencias del template de assessment + voz de marca es-CL), el operador edita/confirma en el desk, y el publish sigue siendo la acción gobernada existente. El aviso publicado queda coherente con lo que el assessment realmente evalúa.

## Why This Task Exists

Redactar la vacante pública hoy es manual y desde cero (el publish exige copy público completo — 422 sin él). El input ya es estructurado (demanda, skills, seniority, competencias con pesos del template 1384) y la arquitectura ya separa verdad interna vs payload público allowlist. Riesgos que esto gobierna: filtración de campos internos al aviso (presupuesto/rate/riesgo), lenguaje sesgado en avisos (riesgo legal — códigos de género/edad), y drift de voz de marca.

## Goal

- `proposeOpeningPublicCopy(openingId)`: la IA redacta los campos `public_*` desde inputs allowlist-safe SOLAMENTE (NUNCA recibe presupuesto/rate/notas internas).
- Confirm humano reusa el writer existente (`updateHiringOpening`) — el LLM nunca escribe el opening.
- Ledger de propuestas auditado (reusar `hiring_assessment_ai_proposal` con kind nuevo `opening_public_copy` o generalizar).
- Prompt con checklist anti-sesgo de avisos (género/edad/proxies) + voz Efeonce es-CL (context pack 05/09).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` (opening interno vs payload público allowlist; publish gobernado; patrón propose→confirm 1361)
- `docs/context/05_voz-tono-estilo.md` + `09_marca-agencia.md` (voz del aviso)
- Reglas: la IA NUNCA ve verdad interna (input allowlist-safe, no el objeto opening completo); el publish sigue siendo acción humana explícita (TASK-355/1371); flag default OFF (reusar `HIRING_ASSESSMENT_AI_ENABLED` o hermano `HIRING_VACANCY_AI_ENABLED` — decidir en Discovery); confirm humano SIEMPRE.

## Normative Docs

- `docs/tasks/complete/TASK-1361-assessment-ai-assist.md` (patrón + ledger + eval discipline)
- `docs/tasks/to-do/TASK-1371-hiring-vacancy-publication-operator-command.md` (complemento: publicación estructurada)
- `docs/tasks/complete/TASK-1384-assessment-question-bank-sme-v1.md` (competencias del template como input)

## Dependencies & Impact

### Depends on

- Patrón 1361 (complete) + writers de opening (TASK-353, complete). Sin blockers.

### Blocks / Impacts

- TASK-1371 (publicación operator command — se complementan, no se bloquean).
- TASK-354/careers (mejor copy público → mejor conversión del funnel).

### Files owned

- `src/lib/hiring/vacancy-ai/**` (propose + prompt + sanitizer allowlist-safe)
- `src/app/api/hiring/openings/[id]/ai/propose-public-copy/**`
- `migrations/<ts>_task-1385-*.sql` (kind nuevo del ledger si se reusa)
- Delta en arch doc + ledger de flags

## Current Repo State

### Already exists

- Payload público allowlist separado en `hiring_opening` (columnas `public_*`) + publish gate 422 sin copy (TASK-353/355).
- Patrón propose→confirm completo: ledger auditado, state machine terminal-once, confirm que reusa writers canónicos, flag + eval discipline (TASK-1361).
- Competencias con pesos por template (1360/1384) + brief de demanda (rol/skills/seniority).
- Providers LLM canónicos en `src/lib/ai/` (NUNCA SDK paralelo).

### Gap

- No hay drafting asistido del copy público; no hay kind de proposal para vacantes; no hay prompt con checklist anti-sesgo de avisos ni binding de voz de marca.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/hiring/vacancy-ai/** (server-only, junto al dominio hiring existente)`
- Future candidate home: `remain-shared`
- Boundary: `dominio hiring; la IA propone TEXTO, el confirm escribe vía updateHiringOpening existente; publish intacto`
- Server/browser split: `server-only`
- Build impact: `nulo (providers LLM existentes)`
- Extraction blocker: `ninguno`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `api` (+ migración menor de kind del ledger)
- Source of truth afectado: propuestas en ledger IA (append); `hiring_opening.public_*` solo vía confirm humano (writer existente)
- Consumidores: desk 355 (UI del confirm — puede ser follow-up ui), Nexa por parity
- Runtime target: Vercel, flag-gated

### Contract surface

- Nuevo: `proposeOpeningPublicCopy(openingId, actor)` → proposal en ledger; confirm = `updateHiringOpening` existente con el payload editado por el humano.
- Respetar: allowlist del opening público; `buildPublicOpeningPayload`; publish gate; contrato de errores hiring.
- Backward compatibility: additive; flag OFF.

### Data model and invariants

- **La IA nunca recibe verdad interna** (budget/rate/risk/notes) — el builder del prompt consume una proyección allowlist-safe + competencias del template; test negativo que lo garantiza.
- El LLM nunca escribe `hiring_opening` — solo el confirm humano vía writer canónico.
- Propuestas append-only en el ledger con provider/modelo/prompt_version/digest (dedupe por digest como 1383).
- Checklist anti-sesgo en el prompt + en la revisión humana (códigos de género/edad, proxies, requisitos no job-related).
- Tenant: interno; capability `hiring.opening.write` (confirm) + `hiring.assessment.ai_assist` o hermana para el propose — decidir en Discovery sin proliferar (≤1 nueva).

### Migration, backfill and rollout

- Migration: additive menor (CHECK del kind del ledger + seed capability si aplica). Backfill: none.
- Flag default OFF + fila en `FEATURE_FLAG_STATE_LEDGER.md`; flip tras smoke con una vacante real en staging.
- Rollback: flag OFF / revert PR.

### Security and access

- Sin PII de candidatos involucrada. Errores canónicos es-CL + `captureWithDomain(err,'hiring')`.
- El prompt no incluye secretos ni datos internos; providers vía `src/lib/ai/` (secreto server-side).

### Runtime evidence

- Tests: builder del prompt allowlist-safe (negativo: budget/rate NUNCA en el prompt), propose→ledger, confirm escribe vía writer.
- Smoke live: proponer copy para un opening real (dry-run provider o provider real si flag staging ON) → confirm → publish gate pasa.

### Acceptance criteria additions

- [x] La IA propone `public_*` completos desde inputs allowlist-safe; test negativo de no-filtración de verdad interna (`vacancy-ai/prompt.test.ts` con sentinels en TODOS los campos internos; smoke provider real sin filtración).
- [x] Confirm humano escribe vía `updateHiringOpening`; el LLM no tiene write path al opening (live E2E: propose no muta; solo el confirm aplica, misma tx).
- [x] Propuesta auditada en ledger (kind `opening_public_copy`) con dedupe por digest (reusa UNIQUE parcial 1383).
- [x] Prompt incluye checklist anti-sesgo + voz es-CL; salida en español (smoke real claude-sonnet-5 verificado).
- [x] Flag `HIRING_VACANCY_AI_ENABLED` OFF + fila en el ledger; publish sigue siendo acción humana explícita (gate 422 intacto).

## Capability Definition of Done — Full API Parity gate

- [x] Lógica en `src/lib/hiring/vacancy-ai/**`; API `/api/hiring/openings/[id]/ai/propose-public-copy`.
- [x] Command propose gobernado por capability (`hiring.opening.ai_assist`); confirm reusa `hiring.opening.write`.
- [x] ≤1 capability nueva con grant + coverage mismo PR (guard verde).
- [x] Nexa por parity (propose→confirm ya es su forma nativa; el actionKey es follow-up delgado, mismo criterio que 1361).
- [x] Parity check = SÍ.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — EXECUTION LOG (lo llena el agente que toma la task)
     ═══════════════════════════════════════════════════════════ -->

## Execution Log — 2026-07-16 (Claude, develop local-first)

### Open Questions resueltas en Discovery

- **Flag**: hermano dedicado `HIRING_VACANCY_AI_ENABLED` (NO reusar `HIRING_ASSESSMENT_AI_ENABLED`) —
  el flip prod del assessment está gateado por sign-off HR/Legal EU AI Act (scoring de candidatos);
  el copy de vacante no decide sobre personas y no debe heredar ni backdoorear ese gate.
- **Capability**: 1 nueva `hiring.opening.ai_assist` (execute/tenant, grant tier operador hiring);
  el confirm reusa `hiring.opening.write:update` (mismo gate que el PATCH del opening).
- **Ledger**: reuso de `hiring_assessment_ai_proposal` con kind `opening_public_copy` (CHECK
  ampliado); eventos `hiring.assessment.ai_proposed/confirmed` reusados (payload lleva `kind`).
- **Modelo**: `claude-sonnet-5` vía `generateStructuredAnthropic` (copy de marca público = tier
  calidad), seam `HIRING_VACANCY_AI_COPY_MODEL`; prompt `hiring_vacancy_ai_public_copy.v1`.
- **La IA propone COPY, no hechos**: ubicación/modalidad entran al prompt solo si ya existen como
  `public_*`; compensación JAMÁS se propone.
- **Drift detectado**: TASK-1371 ya está complete (spec la citaba to-do) — complementaria, sin
  cambio de contrato. El opening NO tiene FK a template: `templateId` es input opcional del operador.

### Slices ejecutados

- **Slice 1** (`93080ac5a`): migración `20260716131741263` (CHECK kind + seed capability + DO
  guards, aplicada y verificada live en PG dev), catálogo TS + grant runtime (coverage guard verde),
  tipos (`OpeningPublicCopyProposal`, `publicCopyOverride`).
- **Slice 2**: módulo `src/lib/hiring/vacancy-ai/**` — `VacancyPromptInput` allowlist-safe (copia
  explícita campo a campo), prompt voz Efeonce + checklist anti-sesgo, sanitizer frontera, adapter
  honest-degrade con deps inyectables, `proposeOpeningPublicCopy` (flag + digest + ledger);
  `updateHiringOpening` acepta `PoolClient` externo (backward-compatible).
- **Slice 3**: rama `opening_public_copy` en `confirmAiProposal` → `applyOpeningPublicCopy`
  (misma tx; `note` nunca se escribe), capability por kind en el confirm route, ruta
  `POST /api/hiring/openings/[id]/ai/propose-public-copy`.

### Evidencia

- Tests unit: no-filtración con sentinels (todos los campos internos), sanitizer, honest-degrade.
- Live E2E PG real VERDE: propose no muta el opening → confirm aplica `public_*` + override humano
  + verdad interna intacta → doble confirm idempotente → decisión contraria 409 terminal-once.
- `pnpm vitest run src/lib/hiring/` 254 passed; typecheck + lint 0 errores; flags:audit strict verde.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Ledger kind + capability (migración menor)

CHECK del kind `opening_public_copy` en el ledger de proposals + capability del propose (o reuso justificado) con grant + seed.

### Slice 2 — Prompt + builder allowlist-safe + propose

`buildVacancyPromptInput(openingId)` (proyección SIN verdad interna: demanda, skills, seniority, modalidad, competencias+pesos del template, voz de marca) → `proposeOpeningPublicCopy` (provider canónico, sanitizer del output, ledger, dedupe).

### Slice 3 — Confirm + API + tests + smoke

Confirm que aplica el payload editado vía `updateHiringOpening`; ruta API; tests (no-filtración, ledger, confirm-via-writer); smoke live con un opening real.

## Out of Scope

- UI del desk para editar/confirmar (follow-up ui o TASK-1371).
- Publicación automática (el publish sigue humano).
- Traducciones en-US del aviso (follow-up).

## Detailed Spec

Replicar 1361 al pie: propose persiste, confirm aplica vía writer canónico, humano SIEMPRE en el medio. La proyección allowlist-safe del input es la pieza de seguridad central (mismo principio que `buildPublicOpeningPayload` — pero aplicado al INPUT del LLM). Voz: context pack 05 (tuteo es-CL cercano-profesional) + 09 (marca Efeonce); checklist anti-sesgo de avisos integrada al prompt y documentada para el revisor.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

S1 (ledger/capability) → S2 (propose) → S3 (confirm/API). Flag OFF hasta smoke staging.

### Risk matrix

| Riesgo | Sistema | Prob | Mitigación | Signal |
|---|---|---|---|---|
| Filtración de verdad interna al aviso | legal/comercial | Media | input allowlist-safe + test negativo | review del confirm |
| Lenguaje sesgado en aviso publicado | legal | Media | checklist en prompt + confirm humano | review |
| LLM escribe el opening | arch | Baja | confirm-only vía writer; test | boundary test |

### Feature flags / cutover

Flag default OFF (decidir en Discovery: reusar `HIRING_ASSESSMENT_AI_ENABLED` vs hermano dedicado) + fila en ledger. Flip staging tras smoke; prod tras revisión del primer aviso real.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1-3 | flag OFF / revert PR (ledger additive) | ~min | Sí |

### Production verification sequence

Smoke staging (propose → confirm → publish gate OK, aviso sin campos internos ni sesgos) → flip prod.

### Out-of-band coordination required

Ninguna (providers LLM ya configurados).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Los 5 criterios binarios del Backend/Data Contract verdes.
- [x] `pnpm test` full 9592/0 + lint 0 + typecheck 0 + build prod; smoke live documentado (E2E PG + provider real, ver Execution Log).

## Verification

- `pnpm lint` · `pnpm typecheck` · `pnpm test` · smoke live del propose→confirm→publish.

## Closing Protocol

- [ ] Lifecycle/carpeta; README + registry; Handoff + changelog; arch delta; ledger de flags; delta a TASK-1371.

## Follow-ups

- UI de edición/confirmación en el desk (ui-ux).
- Versión en-US del aviso para roles internacionales.
