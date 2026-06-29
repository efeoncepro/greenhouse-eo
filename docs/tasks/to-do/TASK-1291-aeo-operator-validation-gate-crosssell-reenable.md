# TASK-1291 — AEO: gate de validación pre-run del operador + reabilitación segura del cross-sell

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `command`
- Epic: `EPIC-021`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth`
- Blocked by: `TASK-1290`
- Branch: `task/TASK-1291-aeo-operator-validation-gate-crosssell-reenable`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Cierra el loop de seguridad: el cross-sell operador (TASK-1279) **rechaza correr o enviar** un diagnóstico si la marca no tiene categoría canónica resuelta (`category_node_id != unknown`) ni modelo de negocio confirmado. Reabilita TASK-1279 con un gate que impide repetir el falso-0 de SKY. Incluye el contrato programático del "confirmar antes de correr sobre un prospecto" (la superficie visible de review queda como follow-up `ui-ux`). Último eslabón funcional de EPIC-021.

## Why This Task Exists

TASK-1279 (cross-sell) se **gateó OFF** porque podía enviar un diagnóstico falso (SKY 0). Una vez que el motor genera prompts correctos (TASK-1288/1289/1290), falta el **guard** que garantice que nadie corra/envíe sobre una marca sin categoría+arquetipo validados — especialmente prospectos, donde un informe falso destruye credibilidad. Es defense-in-depth: el motor mide bien, y el gate impide los casos sin resolver.

## Goal

- Guard en el chokepoint de run operador + en el command de envío (`sendAeoReportAndCreateLead`): bloquear si `category_node_id = unknown` o `business_model` no confirmado, con error canónico.
- Reabilitar `GROWTH_AI_VISIBILITY_OPERATOR_SEND_ENABLED` (revertir el gate OFF de ISSUE-110) tras verificar el motor end-to-end.
- Contrato programático del "validar/confirmar categoría+arquetipo" (reader + command de confirmación); la superficie visible de review = follow-up `ui-ux`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`
- `docs/tasks/complete/TASK-1279-aeo-operator-send-report-open-opportunity.md` (el cross-sell que se reabilita)
- `docs/epics/to-do/EPIC-021-aeo-brand-aware-prompt-generation-engine.md`

Reglas obligatorias:

- El gate vive en el chokepoint canónico (`request-run` operador + `sendAeoReportAndCreateLead`), NO parcheado por-callsite.
- Reabilitar el flag SOLO tras evidencia end-to-end del motor (run SKY realista + eval verde).
- Para un **prospecto**, el gate exige categoría resuelta + arquetipo confirmado; para un cliente contratado, al menos categoría resuelta.

## Normative Docs

- `docs/issues/open/ISSUE-110-aeo-grader-false-zero-non-agency-brands-taxonomy-bypass.md`
- `docs/tasks/to-do/TASK-1288-aeo-canonical-category-resolution.md` (guard de categoría)
- `docs/tasks/to-do/TASK-1289-aeo-business-model-classification.md` (arquetipo)

## Dependencies & Impact

### Depende de

- **TASK-1290** (motor de prompts por arquetipo) — el gate solo tiene sentido cuando el motor mide bien. Bloqueante.
- TASK-1288 (categoría) + TASK-1289 (arquetipo) — el gate los consume.

### Impacta a

- **TASK-1279** (cross-sell) — se reabilita con el gate.
- Follow-up `ui-ux` de la superficie de review operador.

### Files owned

- `src/lib/growth/ai-visibility/request-run.ts` (guard operador) `[verificar]`
- `src/lib/growth/ai-visibility/operator/send-report-and-create-lead.ts` (guard de envío)
- `src/lib/growth/ai-visibility/operator/validate-subject.ts` (reader/command de confirmación) `[verificar naming]`
- `src/lib/api/canonical-error-response.ts` (códigos `aeo_category_unresolved`, `aeo_business_model_unconfirmed`)

## Current Repo State

### Already exists

- Cross-sell operador (TASK-1279) gateado OFF (ISSUE-110).
- (Tras TASK-1288/1289/1290) categoría canónica + arquetipo + motor de prompts correcto.

### Gap

- No hay guard de validación en el run/envío operador; el flag está OFF sin un criterio de reabilitación.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical` (outbound a prospectos reales + reabilita un flag gateado por incidente)
- Impacto principal: `command` (guard) (+ reader de validación)
- Source of truth afectado: el estado de validación del perfil (categoría resuelta + arquetipo confirmado) + el flag del cross-sell
- Consumidores afectados: cross-sell operador (TASK-1279) · vista operador (follow-up UI)
- Runtime target: `staging|production`

### Contract surface

- Contrato nuevo: `assertSubjectGradeable({ organizationId, audience: 'prospect'|'client' }) → ok | blocked(reason)`; command de confirmación de arquetipo (si needs-review).
- Backward compatibility: `gated` (el cross-sell vuelve a estar disponible, con guard).
- Full API parity: el guard es parte del chokepoint; UI/Nexa lo heredan por construcción.

### Data model and invariants

- Entidades: lee `grader_profiles.category_node_id`/`business_model` (TASK-1288/1289); sin tabla nueva (o una marca de "validado por operador" si se requiere).
- Invariantes:
  - Run/envío operador sobre prospecto: `category_node_id != unknown` **y** `business_model` confirmado, sino bloqueo.
  - El flag `OPERATOR_SEND_ENABLED` no se reabilita sin evidencia del motor (run realista + eval).
- Tenant/space boundary: capability operador (reuse).
- Idempotency/concurrency: guard puro (lectura) antes del write.
- Audit/outbox/history: el bloqueo se observa (signal); la confirmación de arquetipo se audita (TASK-1289).

### Migration, backfill and rollout

- Migration posture: `additive` (o repo-only si no hay columna nueva).
- Default state: guard ON por construcción; el flag del cross-sell se reabilita explícitamente tras verificación.
- Backfill plan: ninguno.
- Rollback path: flag OFF de nuevo (vuelve a gatear el cross-sell) + revert.
- External coordination: sign-off comercial/legal del cross-sell (heredado de TASK-1279).

### Security and access

- Auth/access gate: capability operador del grader (reuse).
- Sensitive data posture: sin PII nueva.
- Error contract: `aeo_category_unresolved` / `aeo_business_model_unconfirmed` canónicos es-CL.
- Abuse/rate-limit posture: heredado de TASK-1279.

### Runtime evidence

- Local checks: tests del guard (unknown → bloqueo; resuelto+confirmado → pasa; prospecto vs cliente).
- DB/runtime checks: smoke staging — run/envío sobre una marca `unknown` bloqueado; sobre SKY (resuelto + consumer_b2c) permitido.
- Integration checks: cross-sell reabilitado end-to-end con score realista.
- Reliability signals/logs: signal de runs/envíos bloqueados por validación.
- Production verification sequence: motor verde (TASK-1290 + eval TASK-1292) → flip flag staging → smoke → prod.

### Acceptance criteria additions

- [ ] Guard en chokepoint (no por-callsite); SoT de validación nombrado.
- [ ] Criterio de reabilitación del flag explícito (evidencia del motor).
- [ ] Errores canónicos; signal de bloqueos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Guard de validación

- `assertSubjectGradeable` + códigos canónicos + wiring en `request-run` operador y `sendAeoReportAndCreateLead`. Tests.

### Slice 2 — Reabilitación + signal

- Reabilitar `OPERATOR_SEND_ENABLED` (staging) tras evidencia del motor; reliability signal de bloqueos por validación.

## Out of Scope

- La superficie visible de review operador (follow-up `ui-ux` dentro de EPIC-021).
- El motor de prompts (TASK-1288/1289/1290).
- La eval (TASK-1292).

## Detailed Spec

Defense-in-depth: aunque el motor genere prompts correctos, el gate garantiza que no se corra/envíe sobre una marca sin categoría+arquetipo resueltos (el caso que produjo el falso-0). El flag del cross-sell se reabilita solo cuando el motor está verde end-to-end. La UI de review (confirmar categoría/arquetipo + preview de prompts antes de un prospecto) es follow-up `ui-ux` con su propio wireframe robusto.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- S1 (guard) → S2 (reabilitación + signal). Bloqueada por TASK-1290 (+1288/1289). El flag NO se reabilita hasta TASK-1292 verde.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Reabilitar el cross-sell antes de que el motor mida bien | growth/commercial | medium | criterio duro de evidencia (run realista + eval) antes del flip | falso-0 reaparece |
| Guard demasiado estricto bloquea casos válidos | growth | low | distinguir prospecto (estricto) vs cliente (categoría basta) + override | bloqueos legítimos altos |

### Feature flags / cutover

- Reusa `GROWTH_AI_VISIBILITY_OPERATOR_SEND_ENABLED` (hoy OFF por ISSUE-110). Reabilitar staging tras evidencia; prod con sign-off.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR | <10 min | sí |
| Slice 2 | flag OFF | <5 min | sí |

### Production verification sequence

1. Motor verde (TASK-1290 + eval TASK-1292).
2. Guard ON: run/envío sobre marca `unknown` bloqueado; sobre SKY permitido + score realista.
3. Flip `OPERATOR_SEND_ENABLED` staging → smoke E2E con score realista.
4. prod con sign-off comercial/legal.

### Out-of-band coordination required

- Sign-off comercial/legal del cross-sell (heredado de TASK-1279).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `assertSubjectGradeable` bloquea run/envío operador si `category_node_id = unknown` o `business_model` no confirmado (prospecto); cliente exige al menos categoría resuelta. Wired en el chokepoint, errores canónicos.
- [ ] `GROWTH_AI_VISIBILITY_OPERATOR_SEND_ENABLED` reabilitado en staging SOLO tras evidencia del motor (run SKY realista + eval verde); prod gated por sign-off.
- [ ] Reliability signal de bloqueos por validación; smoke staging (bloqueo de `unknown`, paso de SKY) verde.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- smoke staging del guard + reabilitación del cross-sell con score realista

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (EPIC-021, TASK-1279, ISSUE-110) — marcar ISSUE-110 resuelto si el motor + gate cierran el caso
- [ ] Delta en `GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`

## Follow-ups

- **UI de review operador** (`ui-ux`): confirmar categoría/arquetipo + preview de prompts antes de correr sobre un prospecto (wireframe robusto, dentro de EPIC-021).

## Open Questions

- ¿El "arquetipo confirmado" requiere una marca explícita en DB (operator-confirmed) o basta `business_model != unknown`? (definir en Discovery con comercial).
