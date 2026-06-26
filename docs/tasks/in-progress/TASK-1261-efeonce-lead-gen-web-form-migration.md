# TASK-1261 — Primera migración comercial real: form HubSpot "Lead Gen - Web" → Growth Form gobernado

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `migration`
- Epic: `none`
- Status real: `En ejecución`
- Rank: `TBD`
- Domain: `growth|public-site|hubspot`
- Blocked by: `none`
- Branch: `develop`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Recrea el form HubSpot **"Lead Gen - Web"** (GUID `de4593c3-00ee-481b-a35a-06fcb5022046`, embed en `/diseno-de-sitios-web/`) como **Growth Form gobernado de Greenhouse** — primera migración comercial real al motor (TASK-1229..1232). Campos + textos de ayuda + consent FIELES a HubSpot (autoridad: HubSpot Marketing Forms API). El destino HubSpot se conserva vía el adapter seguro (TASK-1230). Sembrado durable (ids estables, patrón grader-form), **sin tocar el sitio en vivo** (el swap del embed es el apply coordinado de TASK-1258). Sirve de **vehículo del shadow de TASK-1253** (autoridad de validación server-side).

## Why This Task Exists

El pipeline de Growth Forms está 100% cableado y ON en staging (`PUBLIC_API`, `DISPATCH`, `HUBSPOT_SECURE_SUBMIT`), pero le falta **un form real publicado** para encenderse — y para poder correr el shadow de TASK-1253 (la validación server-side nace OFF y necesita observarse con un form real antes de flipear). TASK-1232 (cockpit UI) quedó con su mitad "First Migration" abierta. Este es el primer form comercial real: mejor caso que el grader (tiene selects, teléfono con país y consent → ejercita los validators a fondo).

## Goal

- Publicar "Lead Gen - Web" como Growth Form gobernado (definición + versión + surface + destino HubSpot) con fidelidad total a HubSpot.
- Conectar el destino HubSpot seguro (`hubspot_forms_secure_submit`) — leads siguen llegando al CRM. `delivery_mode='disabled'` durante el shadow (no ensucia el CRM); cutover → `direct`.
- Correr el shadow de TASK-1253 sobre este form y, con sign-off, flipear `GROWTH_FORMS_SERVER_VALIDATION_ENABLED`.
- Dejar el form como insumo del cockpit (TASK-1232) y del apply del embed (TASK-1258).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- Patrón grader-form (TASK-1251/1257): seed durable de `form_version` published con id estable.

Reglas obligatorias:

- Fidelidad a HubSpot (campos/textos/consent) — la migración conserva comportamiento (regla TASK-1258).
- Versión publicada inmutable (trigger TASK-1229): cambios = versión nueva.
- Destino HubSpot vía el adapter seguro (TASK-1230), NUNCA embed directo `hbspt.forms.create`.
- NO tocar el WordPress en vivo (eso es el apply de TASK-1258, coordinado).
- `consent_policy_version` obligatorio (el policy-compiler bloquea publicación sin él).

## Normative Docs

- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md` — contrato del motor.
- `migrations/20260625214335998_task-1257-grader-form-name-fields.sql` — patrón de seed de `form_version` published (grader-form).
- `src/lib/growth/forms/destinations/hubspot/adapter.ts` — shape de `mapping_json` (portalId/formGuid/fieldMapping/consentText).
- HubSpot Marketing Forms API (form `de4593c3-…`) — autoridad de campos/textos/consent.

## Dependencies & Impact

### Depends on

- `TASK-1229` (motor), `TASK-1230` (adapter HubSpot seguro), `TASK-1231` (renderer/surfaces) — todas complete.
- `TASK-1253` (validator registry) — code-complete; este form es su vehículo de shadow.

### Blocks / Impacts

- Desbloquea el **shadow + flip de TASK-1253** (faltaba un form real).
- Provee el primer form comercial real al cockpit de **TASK-1232** y al apply de **TASK-1258**.

### Files owned

- `migrations/20260626102401767_task-1261-efeonce-lead-gen-web-form.sql`

## Current Repo State

### Already exists

- Motor Growth Forms (TASK-1229): contracts, commands (`authorDraftForm`/`publishForm`/`submitForm`), policy-compiler, readers, dispatcher.
- Adapter HubSpot seguro (TASK-1230, `hubspot_forms_secure_submit`), renderer portable + host surfaces (TASK-1231).
- Validator registry + autoridad server (TASK-1253, flag OFF) — este form es su vehículo de shadow.
- Pipeline staging ON (`PUBLIC_API`/`DISPATCH`/`HUBSPOT_SECURE_SUBMIT`); faltaba un form real publicado.

### Gap

- No existía ningún form comercial real migrado al motor (solo el grader + smoke tests).
- TASK-1232 dejó su mitad "First Migration" abierta (solo cockpit UI).

## Backend/Data Contract

- Source of truth: `greenhouse_growth.form_definition` / `form_version` / `form_host_surface` / `form_destination` (seed additive).
- Contrato: `greenhouse-growth-public-forms.v1` (render contract + submit contract).
- Backward compatibility: `additive`.
- Migration posture: `additive`, reversible (down: archiva versión + borra destino/surface/definición).
- Security: destino con `delivery_mode='disabled'` durante shadow; el adapter HubSpot solo entrega vía dispatcher async flag-gated.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Seed del form gobernado + verificación + shadow

- Migración: form_definition + form_version (published, 10 campos fieles + helper texts + consent) + host_surface + form_destination HubSpot (`disabled`).
- Verificar render contract completo (campos/validators/helper/consent/opciones).
- Correr shadow de TASK-1253 (batería de envíos reales + borde) → confirmar 0 falsos rechazos.

## Out of Scope

- Swap del embed en el WordPress en vivo (TASK-1258 apply, coordinado).
- Cockpit UI (TASK-1232).
- Flip del flag en prod (solo staging tras sign-off).
- `delivery_mode='direct'` (cutover, no shadow).

## Detailed Spec

El form se siembra con ids estables (`fdef-efeonce-lead-gen-web` / `fver-efeonce-lead-gen-web-v1` / `fhsf-efeonce-lead-gen-web`), patrón grader-form. `field_schema_json` = 10 campos con `key` semántico limpio (firstName/lastName/email/phone/companyName/website/city/role/objective/annualRevenue), tipos del registry (text/email/tel/url/select), validators `email_syntax`/`e164_phone` (country=CL)/`url`, autocomplete WHATWG. Los textos de ayuda viven en `copy_refs_json.copy['<key>.help']` (el renderer los pinta como `ghf-help` con `aria-describedby`); el consent (aviso + checkbox required + privacy URL) en el bloque `copy_refs_json` top-level. `delivery_mode='disabled'` aísla el shadow del CRM; el cutover lo pasa a `direct`. El destino mapea `key → HubSpot property name` en `fieldMapping`.

## Rollout Plan & Risk Matrix

| Riesgo | Probabilidad | Mitigation |
|---|---|---|
| Validación server rechaza submissions legítimas | medium | shadow con batería real+borde ANTES de flipear (0 falsos rechazos verificado) |
| Submissions de shadow ensucian el CRM HubSpot | medium | `delivery_mode='disabled'` durante shadow (no entrega); cutover lo cambia a `direct` |
| Pisar la "first migration" de TASK-1232 | low | TASK-1232 = cockpit UI; este form es additive, no toca su código |
| Drift de fidelidad vs el form HubSpot | low | campos/textos/consent extraídos de la HubSpot Forms API (autoridad), no del screenshot |

- **Cutover (fuera de esta task):** flip prod del flag + `delivery_mode='direct'` + swap del embed en WordPress (TASK-1258 apply).
- **Rollback:** down migration (archiva versión + borra destino/surface/definición); flag a false (<5 min).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Form "Lead Gen - Web" publicado como Growth Form gobernado con fidelidad total (10 campos + helper texts + consent + opciones).
- [x] Destino HubSpot seguro cableado (GUID real + fieldMapping + consentText), `delivery_mode='disabled'` para el shadow.
- [x] Render contract verificado completo contra PG real.
- [x] Shadow de TASK-1253: 0 falsos rechazos (normaliza phone/email/url, rechaza solo basura).
- [ ] Flip de `GROWTH_FORMS_SERVER_VALIDATION_ENABLED` en staging (sign-off del operador).

## Verification

- `pnpm lint` · `pnpm typecheck` · `pnpm test`
- `pnpm migrate:up` + verify (anti pre-up-marker)
- Render contract reader + shadow battery contra PG real

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en carpeta correcta
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] cross-impact a TASK-1232 / TASK-1253 / TASK-1258

## Follow-ups

- Flip de `GROWTH_FORMS_SERVER_VALIDATION_ENABLED` (staging → prod) post sign-off.
- Cutover del embed en vivo (`delivery_mode='direct'` + swap WordPress) → TASK-1258 apply.
- "ventas anuales" como select de rangos (data-quality) en una v2, si el negocio lo aprueba.
- Mapear la subscription de marketing HubSpot (535702717) en el adapter si la entrega secure-submit lo exige.

## Open Questions

- Ninguna bloqueante. El flip del flag y el cutover del embed son decisiones de rollout del operador.
