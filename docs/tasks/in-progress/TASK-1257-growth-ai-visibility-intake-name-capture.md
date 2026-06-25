# TASK-1257 — Growth AI Visibility: captura de Nombre + Apellido en el intake

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `copy`
- Backend impact: `migration`
- Epic: `EPIC-020`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth`
- Blocked by: `none`
- Branch: `task/TASK-1257-growth-ai-visibility-intake-name-capture`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El intake público del AI Visibility Grader captura hoy `email` + `brand_name` pero **NO el nombre y apellido** del lead. El HubSpot lead handoff (TASK-1242, complete) ya mapea `firstname`/`lastname` a las propiedades **nativas** de HubSpot cuando existen, pero hoy van vacíos. Esta task agrega la captura de **Nombre** y **Apellido** en el form del grader, los persiste en `grader_leads`, y los propaga por el pipeline hasta el handoff — sin lo cual el contacto entra a ventas sin nombre.

## Why This Task Exists

Decisión del operador (2026-06-25, durante TASK-1242): la captura de nombre/apellido se separó como sub-task propia para no acoplar el handoff (1242) con la superficie del intake (TASK-1240/1251, ya completas). Un contacto de ventas sin nombre es de baja calidad para el equipo comercial; el handoff ya está listo para consumir `firstname`/`lastname` nativos en cuanto existan.

## Goal

- Agregar campos **Nombre** (`firstName`) y **Apellido** (`lastName`) al form del grader (`fdef-ai-visibility-grader`) y al path a-medida.
- Persistir `first_name`/`last_name` en `greenhouse_growth.grader_leads` (columnas additive nullable).
- Propagarlos por el pipeline: contracts → forms-engine binding → reactive consumer (`growth_grader_run_from_submission`) → `insertGraderLead`.
- Exponerlos en `getGraderLeadForHandoff` para que el mapper de TASK-1242 los mande a HubSpot (`firstname`/`lastname` nativos).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — intake + lead.
- `docs/architecture/agent-invariants/INTEGRATIONS_INFRA_AGENT_INVARIANTS.md` — submission + reactive consumer (no inline).
- Skills: `notion-platform` no aplica; sí `greenhouse-backend` (migración/store/reader) + `greenhouse-ux-writing` (labels visibles es-CL) + `forms-ux` (campos de nombre + autocomplete) + el motor Growth Forms (TASK-1229/1231).

Reglas obligatorias:

- **NUNCA** el email/nombre/apellido (PII) viaja a los providers IA — vive en el submission/lead con consent. El reactive consumer separa marca/categoría/mercado del PII al encolar el run.
- Migración additive: columnas nullable primero (los leads existentes no tienen nombre); sin backfill obligatorio.
- Respetar el contrato HTTP estable del intake (ambos paths: a-medida `createPublicGraderRun` + forms-engine `GROWTH_GRADER_INTAKE_ON_FORMS_ENGINE_ENABLED`).

## Normative Docs

- `docs/tasks/complete/TASK-1242-growth-ai-visibility-hubspot-lead-handoff.md` — el handoff que consume `firstname`/`lastname` (mapper ya listo; `getGraderLeadForHandoff` hoy devuelve nombre vacío).
- `docs/tasks/complete/TASK-1240-growth-ai-visibility-public-run-intake-abuse-cost-controls.md` — `grader_leads` + `insertGraderLead`.
- `docs/tasks/complete/TASK-1251-growth-ai-visibility-grader-forms-engine-convergence.md` — el grader-form gobernado + el reactive consumer + binding `submission_id`.
- `docs/tasks/complete/TASK-1231-growth-forms-renderer-host-surfaces.md` — el renderer portable (data-driven; render automático de los campos del form definition).

## Dependencies & Impact

### Depends on

- `TASK-1240` (complete) — `grader_leads` + `insertGraderLead`.
- `TASK-1251` (complete) — grader-form gobernado + reactive consumer `growth_grader_run_from_submission`.
- `TASK-1242` (complete) — el handoff que consume los campos (no se modifica su mapper; solo `getGraderLeadForHandoff` para SELECT-ear las columnas nuevas).

### Blocks / Impacts

- Mejora la calidad del lead en HubSpot (contacto con nombre real).
- No bloquea otras tasks; es additive sobre superficies completas.

### Files owned

- `migrations/` — columnas `first_name`/`last_name` en `grader_leads` (additive nullable). [verificar nombre del archivo via `pnpm migrate:create`]
- `src/lib/growth/ai-visibility/public-intake/contracts.ts` — input del intake (+ firstName/lastName).
- `src/lib/growth/ai-visibility/public-intake/forms-engine-binding.ts` — `buildGraderSubmission` (+ campos al `normalized_fields_json`).
- `src/lib/growth/ai-visibility/public-intake/store.ts` — `InsertGraderLeadInput` + `insertGraderLead` + `getGraderLeadForHandoff` (SELECT/return de los campos nuevos).
- `src/lib/sync/projections/growth-grader-run-from-submission.ts` — mapear `firstName`/`lastName` del submission al `insertGraderLead`.
- `src/lib/growth/ai-visibility/public-intake/create-public-run.ts` [verificar] — path a-medida.
- El form definition `fdef-ai-visibility-grader` (seed/migración) — agregar los campos `firstName`/`lastName` al render_contract. [verificar estructura del seed en `migrations/20260625115608144_task-1251-grader-forms-engine-convergence.sql`]

## Current Repo State

### Already exists

- `grader_leads` con `email`/`consent`/`brand_name`/`run_id`/`hubspot_synced_at` (sin nombre).
- `getGraderLeadForHandoff` (TASK-1242) devuelve `firstName: null`/`lastName: null` hardcodeado (placeholder a la espera de esta task).
- El mapper del handoff (`buildHubSpotLeadHandoffPayload`) ya consume `firstName`/`lastName` y los manda a `firstname`/`lastname` nativos cuando no son null.
- El grader-form gobernado + el reactive consumer que materializa el lead desde el submission.

### Gap

- No hay columnas `first_name`/`last_name` en `grader_leads`.
- El form del grader no pide nombre/apellido.
- El binding + el consumer + `insertGraderLead` no transportan los campos.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `migration` (columnas additive) + reader update.
- Source of truth afectado: `greenhouse_growth.grader_leads`.
- Consumidores afectados: el handoff TASK-1242 (`getGraderLeadForHandoff`).
- Runtime target: `staging` + `production` gated (EPIC-020).

### Contract surface

- Contrato existente a respetar: `InsertGraderLeadInput`, `GraderLeadForHandoff`, el submission `normalized_fields_json`, el contrato HTTP del intake.
- Contrato nuevo: 2 columnas additive + 2 campos en el form definition + 2 campos en el input/binding.
- Backward compatibility: `additive` (nullable; leads viejos sin nombre siguen válidos).
- Full API parity: el intake ya es un command gobernado (TASK-1251); esta task extiende su input, no crea superficie nueva.

### Data model and invariants

- Entidades afectadas: `grader_leads` (ADD COLUMN `first_name`, `last_name` TEXT nullable).
- Invariantes:
  - **NUNCA** nombre/apellido (PII) a los providers IA — solo al submission/lead con consent.
  - Nullable: un lead sin nombre (legacy o si el form lo deja opcional) es válido; el handoff mapea vacío.
  - Trim + normalización mínima; sin validación de formato agresiva (nombres internacionales).
- Tenant/space boundary: lead público/pre-tenant.
- Migration posture: `additive` (nullable, sin backfill).

### Migration, backfill and rollout

- Migration posture: `additive` — `ALTER TABLE ... ADD COLUMN first_name TEXT, ADD COLUMN last_name TEXT` (nullable). Marker `-- Up Migration` + bloque DO de verificación post-DDL.
- Default state: el form pide los campos en cuanto se despliega; leads previos quedan sin nombre (esperado).
- Backfill plan: ninguno (no hay forma de derivar nombre de leads históricos).
- Rollback path: revert PR + las columnas nullable quedan inertes (o DROP COLUMN en down).
- External coordination: ninguna (HubSpot ya tiene `firstname`/`lastname` nativos).

### Security and access

- Sensitive data posture: nombre/apellido = PII con consent (Ley 21.719); mismo tratamiento que el email (vive en el lead, no en providers).
- Error contract: `captureWithDomain('growth', …)`.

### Runtime evidence

- Local checks: tests del binding (campos al submission), del consumer (mapea al insert), de `getGraderLeadForHandoff` (devuelve los campos).
- DB/runtime checks: migración aplicada + `information_schema.columns` confirma las columnas.
- Integration checks: submit con nombre → lead con `first_name`/`last_name` → `getGraderLeadForHandoff` los devuelve → handoff los manda a HubSpot.

### Acceptance criteria additions

- [ ] Columnas `first_name`/`last_name` additive nullable en `grader_leads` (migración verificada).
- [ ] El form del grader pide Nombre + Apellido (ambos paths: a-medida + forms-engine).
- [ ] El pipeline transporta los campos hasta `insertGraderLead`.
- [ ] `getGraderLeadForHandoff` devuelve `firstName`/`lastName` reales (no el placeholder null).
- [ ] PII (nombre/apellido) nunca viaja a providers; tests lo cubren.

## UI/UX Contract

- **Superficie:** el form público del grader (renderizado por el generic renderer data-driven, TASK-1231 — NO JSX nuevo; los campos se agregan al form definition).
- **Copy visible (es-CL, validar con `greenhouse-ux-writing`):** labels "Nombre" y "Apellido" (o el copy canónico del intake); placeholders opcionales.
- **forms-ux:** campos de texto con `autocomplete="given-name"` / `family-name`, label-above, en el orden natural (nombre antes que apellido), antes o junto al email. Decidir si son requeridos u opcionales (recomendado: requeridos, para que el lead llegue con nombre; confirmar con commercial).
- **GVC:** como el render es data-driven y ya existe el preview `/design-system/growth-forms-renderer`, verificar el form con los campos nuevos (desktop+mobile) en ese preview; no requiere GVC de una ruta nueva.
- **a11y:** IDREF label↔input, `role=alert` para errores en el mismo árbol (piso del renderer TASK-1231).

## Hybrid Execution Justification

Task vertical híbrida (backend-data + copy visible) justificada porque es **pequeña, reversible y additive**: migración nullable sin riesgo, los campos del form son config del form definition (render automático, sin JSX), y el copy son 2 labels. No amerita partirla en dos tasks. Orden interno: (1) migración + store/binding/consumer/reader (backend-data), (2) campos + copy en el form definition (config/copy validada con `greenhouse-ux-writing`).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Migración + pipeline backend (columnas + binding + consumer + reader)

- Migración additive: `first_name`/`last_name` TEXT nullable en `grader_leads` (+ marker `-- Up Migration` + bloque DO de verificación + GRANT preservado). Regenerar `db.d.ts`.
- `InsertGraderLeadInput` + `insertGraderLead` (+ los 2 campos); `buildGraderSubmission` (campos al `normalized_fields_json`, PII-safe); `growth_grader_run_from_submission` (mapear del submission al insert); path a-medida `createPublicGraderRun` [verificar].
- `getGraderLeadForHandoff` (SELECT + return `firstName`/`lastName` reales).
- Tests: binding, consumer, reader, no-PII-a-providers.

### Slice 2 — Campos + copy en el form del grader

- Agregar los campos `firstName`/`lastName` al form definition `fdef-ai-visibility-grader` (seed/migración) + el input del path a-medida.
- Copy es-CL (validar con `greenhouse-ux-writing`) + `autocomplete` + orden. Verificar en el preview del renderer (desktop+mobile).

## Out of Scope

- Cambiar el mapper del handoff (TASK-1242 ya consume los campos).
- Validación de formato de nombre internacional compleja (solo trim + nullable).
- Backfill de nombre para leads históricos (no hay fuente).
- Capturar otros campos nuevos (teléfono, cargo, etc.) — fuera de alcance.

## Detailed Spec

Additive end-to-end: la migración agrega 2 columnas nullable; el form pide los 2 campos; el binding los mete al `normalized_fields_json` del submission (PII junto al email, nunca a providers); el reactive consumer los lee y los pasa a `insertGraderLead`; el path a-medida hace lo análogo; `getGraderLeadForHandoff` los devuelve y el mapper del handoff (sin cambios) los manda a `firstname`/`lastname` nativos de HubSpot. El handoff existente queda operativo con nombre real en cuanto esta task despliega.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (backend: columnas + pipeline + reader) → Slice 2 (form fields + copy). El form no debe pedir campos que el pipeline aún no persiste.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| PII (nombre) llega a un provider IA | legal (Ley 21.719) | low | mismo path que el email (separado al encolar); test de no-PII | code review + test |
| Migración rompe el insert existente | data quality | low | columnas nullable additive; tests del insert | `pnpm migrate:status` + tests |
| Drift cliente↔servidor del form (campos solo en un path) | growth | medium | agregar a AMBOS paths (a-medida + forms-engine) + test | submit real ambos paths |

### Feature flags / cutover

- Sin flag nuevo. Gateado de facto por el intake (los campos aparecen cuando se despliega). Prod = junto a EPIC-020.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (columnas nullable quedan inertes) o DROP COLUMN en down | <10 min | si |
| Slice 2 | revert PR (form vuelve a no pedir nombre) | <5 min | si |

### Production verification sequence

1. Migración aplicada en staging (`information_schema.columns`).
2. Submit real con nombre → `grader_leads` con `first_name`/`last_name`.
3. `getGraderLeadForHandoff` devuelve los campos → handoff manda `firstname`/`lastname` a HubSpot (smoke como TASK-1242).
4. Prod vía release control plane junto a EPIC-020.

### Out-of-band coordination required

- Ninguna (HubSpot ya tiene `firstname`/`lastname` nativos; no requiere crear properties).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Columnas `first_name`/`last_name` additive nullable en `grader_leads`, migración aplicada + verificada.
- [ ] El form del grader pide Nombre + Apellido en ambos paths (a-medida + forms-engine), con copy es-CL validada.
- [ ] El pipeline (binding → consumer → insert) transporta los campos; PII nunca a providers (test).
- [ ] `getGraderLeadForHandoff` devuelve `firstName`/`lastName` reales (no placeholder null).
- [ ] Smoke: submit con nombre → lead → handoff manda `firstname`/`lastname` a HubSpot.

## Verification

- `pnpm lint` · `pnpm typecheck` · `pnpm test`
- `pnpm migrate:up` + verificación `information_schema.columns`
- Verificación del form en el preview del renderer (desktop+mobile)
- `pnpm docs:closure-check` al cerrar

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress`/`complete`)
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] chequeo de impacto cruzado (TASK-1242: quitar la nota "nombre vacío por ahora")

## Follow-ups

- Si commercial pide más campos del lead (teléfono, cargo), task aparte.

## Open Questions

1. ¿Nombre/apellido **requeridos** u **opcionales** en el form? Recomendado requeridos (lead con nombre); confirmar con `commercial-expert`. Si opcionales, el handoff ya tolera vacío.
2. ¿Un solo campo "Nombre completo" o dos campos separados? Recomendado dos (mapea limpio a `firstname`/`lastname` nativos de HubSpot).
