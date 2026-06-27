# TASK-1274 — Limpiar deuda de marca "Efeonce Greenhouse" en los emails del portal

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `content|platform`
- Blocked by: `none`
- Branch: `task/TASK-1274-portal-email-brand-debt`
- Legacy ID: `none`
- GitHub Issue: `none`

> Nota UI: la task cambia VALORES de strings de marca (display name del remitente, tagline del masthead, alt text) en templates de email ya existentes. No introduce ni reestructura ninguna superficie, layout ni primitive → `UI impact: none` con rationale. El copy visible se valida con `greenhouse-ux-writing` en implementación.

## Summary

Hoy todos los emails del portal salen con la marca **"Efeonce Greenhouse"** — un nombre que **no existe**: existe **Efeonce** (la agencia) y existe **Greenhouse** (la plataforma de Efeonce). Esta task formaliza la decisión de marca para los emails del portal y limpia los 3 sitios donde vive el string compuesto (remitente, tagline del masthead, alt/copy de invitación), sin tocar el lead magnet de Efeonce (ya resuelto por TASK-1250).

## Why This Task Exists

Deuda histórica de marca. El operador la señaló al revisar el email del AI Visibility Grader (TASK-1250): "Efeonce Greenhouse no existe". TASK-1250 resolvió la superficie de agencia (el lead magnet envía como **Efeonce** vía el resolver `AGENCY_BRANDED_EMAIL_TYPES`), pero los **18 emails del portal** siguen mostrando "Efeonce Greenhouse" como remitente (`DEFAULT_EMAIL_FROM`) y en el tagline del masthead. Los emails del portal son de la **plataforma Greenhouse** (la app a la que el usuario entra) — su marca debe ser coherente con esa arquitectura, no un nombre compuesto inventado.

## Goal

- Decidir la marca canónica de los emails del portal (Open Question — brand owner).
- Reemplazar "Efeonce Greenhouse" por la marca decidida en los 3 sitios de código + copy.
- Actualizar el valor live de `EMAIL_FROM` en todos los environments (Vercel + ops-worker) sin romper el envío.
- No tocar el lead magnet de Efeonce (TASK-1250) ni los PDFs/portal cliente.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `src/config/efeonce-brand.ts` — SSOT de marca Efeonce (arquitectura Efeonce agencia vs Greenhouse plataforma, eslogan).
- `DESIGN.md` — contrato de marca agent-facing.
- `.claude/skills/greenhouse-email/` + `docs/tasks/complete/TASK-1250-growth-ai-visibility-email-report-delivery.md` (el resolver `AGENCY_BRANDED_EMAIL_TYPES` que NO se debe romper).

Reglas obligatorias:

- **NUNCA** usar el string compuesto "Efeonce Greenhouse" (no es una marca). Es Efeonce (agencia) O Greenhouse (plataforma).
- **NO** tocar el path del lead magnet (TASK-1250): los `AGENCY_BRANDED_EMAIL_TYPES` deben seguir enviando como **Efeonce** vía `resolveEmailFromAddress`. Esta task cambia SOLO el sender de **plataforma** (`getEmailFromAddress()` / `DEFAULT_EMAIL_FROM`) y el masthead/tagline por defecto.
- Todo copy visible nuevo pasa por `greenhouse-ux-writing` (tono es-CL).

## Normative Docs

- `docs/documentation/` (no hay doc funcional específico; la marca de emails se documenta inline).

## Dependencies & Impact

### Depends on

- Decisión del brand owner sobre el wording (ver Open Questions). Sin esa decisión la task no puede ejecutarse.

### Blocks / Impacts

- Los 18 emails del portal (todos los `EmailType` que NO están en `AGENCY_BRANDED_EMAIL_TYPES`): cambia su remitente + tagline del masthead.
- No impacta TASK-1250 (lead magnet Efeonce) ni los PDFs de marca.

### Files owned

- `src/lib/resend.ts` (`DEFAULT_EMAIL_FROM`)
- `src/lib/copy/dictionaries/es-CL/emails.ts` (`layout.logoAlt`, `layout.tagline`, `auth.invitation.bodySuffix`)
- `services/ops-worker/deploy.sh` (`DEFAULT_EMAIL_FROM`)
- `src/emails/components/EmailLayout.tsx` (`LEGACY_EN_LAYOUT_COPY` si aplica al tagline en-US)

## Current Repo State

### Already exists

- `src/lib/resend.ts:12` — `const DEFAULT_EMAIL_FROM = 'Efeonce Greenhouse <greenhouse@efeoncepro.com>'`.
- `src/lib/copy/dictionaries/es-CL/emails.ts:5-6` — `logoAlt: 'Efeonce Greenhouse — Plataforma de gestión'`, `tagline: 'Efeonce Greenhouse™ · Empower your Growth'`.
- `src/lib/copy/dictionaries/es-CL/emails.ts:53` — invitación `bodySuffix: ' en Efeonce Greenhouse™, la plataforma…'`.
- `services/ops-worker/deploy.sh:77` — `DEFAULT_EMAIL_FROM="Efeonce Greenhouse <greenhouse@efeoncepro.com>"`.
- `EMAIL_FROM` env var en Vercel (Production, staging, Preview) + ops-worker — valor live encriptado, presumiblemente "Efeonce Greenhouse" (verificar `vercel env pull`).
- **Ya resuelto (NO tocar):** `AGENCY_BRANDED_EMAIL_TYPES` + `AGENCY_FROM_ADDRESS = 'Efeonce <…>'` en `src/lib/email/types.ts` + `resolveEmailFromAddress` en `src/lib/email/delivery.ts` (TASK-1250) — el lead magnet ya envía como Efeonce.

### Gap

- No hay decisión formal de qué deben decir los emails de plataforma.
- El string compuesto "Efeonce Greenhouse" persiste en code defaults + copy + env vars live.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Decisión de marca + code defaults

- Resolver la Open Question (wording canónico de los emails de plataforma).
- Reemplazar el string en `src/lib/resend.ts` (`DEFAULT_EMAIL_FROM`) + `services/ops-worker/deploy.sh` (`DEFAULT_EMAIL_FROM`).
- Reemplazar `layout.logoAlt`, `layout.tagline` y `auth.invitation.bodySuffix` en `emails.ts` (validar copy con `greenhouse-ux-writing`). Revisar `LEGACY_EN_LAYOUT_COPY` en `EmailLayout.tsx`.
- Actualizar el baseline test de algún portal email si asienta el string viejo.

### Slice 2 — Env vars live + verificación

- Actualizar `EMAIL_FROM` en Vercel (Production, staging, Preview) + ops-worker (`gcloud run services update`) al nuevo valor.
- Smoke: enviar un email de portal (ej. preview/test) en staging y confirmar el nuevo remitente + masthead; confirmar que el lead magnet (TASK-1250) sigue saliendo como **Efeonce** (no regresión del resolver).

## Out of Scope

- El lead magnet de Efeonce (TASK-1250) — ya resuelto, NO tocar.
- PDFs de marca, portal cliente, login, footers institucionales.
- Rediseño del masthead/layout del email (solo cambian valores de strings).
- Cambiar la dirección de correo (`greenhouse@efeoncepro.com`) — solo el display name/tagline, salvo que el brand owner decida un buzón dedicado (entonces es out-of-band).

## Detailed Spec

El cambio es de **valores de strings** + env vars. El resolver de TASK-1250 (`resolveEmailFromAddress`) ya separa el sender de agencia (lead magnet → Efeonce) del de plataforma (`getEmailFromAddress()`); esta task solo redefine el sender de plataforma + el masthead/tagline por defecto. No hay schema, API ni migración.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (code defaults + copy) → Slice 2 (env vars live). El código nuevo debe estar desplegado antes de actualizar `EMAIL_FROM` live para que el default y el env var converjan al mismo wording.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Romper el envío al editar `EMAIL_FROM` (formato `Display <addr>` inválido) | email delivery | low | Mantener el address verificado en Resend (`greenhouse@efeoncepro.com`); cambiar solo el display name; smoke en staging antes de prod | `email_deliveries.status='failed'` / Resend error |
| Regresión del lead magnet (que vuelva a salir como plataforma) | communications | low | NO tocar `AGENCY_BRANDED_EMAIL_TYPES`/`resolveEmailFromAddress`; test de TASK-1250 verde | baseline test del lead magnet |
| Drift entre code default y env var live | email delivery | medium | Actualizar ambos en el mismo rollout + documentar en el ledger | sender visible incorrecto |

### Feature flags / cutover

Sin flag — cambio de strings/config aditivo, cutover inmediato. Revert = revertir strings + restaurar `EMAIL_FROM` env vars.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR + redeploy | <10 min | si |
| Slice 2 | `vercel env` + `gcloud run services update` al valor previo + redeploy | <10 min | si |

### Production verification sequence

1. Slice 1 a staging → enviar un portal email de prueba (admin preview/test send) → verificar nuevo remitente + masthead.
2. Confirmar lead magnet (TASK-1250) sigue como Efeonce en staging.
3. Slice 2: actualizar `EMAIL_FROM` staging → re-verificar.
4. Repetir en producción (vía release control plane si aplica) + monitorear `email_deliveries` 24-48h.

### Out-of-band coordination required

- Decisión del brand owner sobre el wording (Open Question).
- Si se decide un buzón dedicado (ej. `hola@efeoncepro.com`), verificar/verificar dominio en Resend antes del cutover.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Ningún email del portal muestra el string "Efeonce Greenhouse" (remitente, masthead, tagline, copy de invitación).
- [ ] El remitente de los emails de plataforma usa la marca decidida; el address sigue verificado en Resend.
- [ ] El lead magnet (TASK-1250) sigue saliendo como **Efeonce** (resolver intacto, test verde).
- [ ] `EMAIL_FROM` actualizado en Vercel (Production/staging/Preview) + ops-worker, consistente con el code default.
- [ ] Copy validado con `greenhouse-ux-writing`.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test -- src/emails src/lib/email`
- Smoke real en staging: portal email + lead magnet, ambos con el remitente correcto.

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] `FEATURE_FLAG_STATE_LEDGER` no aplica (sin flag); documentar el valor de `EMAIL_FROM` por environment si se desea
- [ ] chequeo de impacto cruzado (TASK-1250 resolver intacto)

## Follow-ups

- Si el brand owner decide un buzón dedicado, verificar dominio en Resend (out-of-band).

## Open Questions

1. **¿Qué marca deben llevar los emails del portal?** El portal es la plataforma **Greenhouse** (de Efeonce). Opciones: (a) **"Greenhouse"** (solo la plataforma); (b) **"Greenhouse · by Efeonce"** / "Greenhouse de Efeonce" (plataforma + atribución a la agencia); (c) otra. Recomendación: (b) para mantener la atribución sin inventar el nombre compuesto "Efeonce Greenhouse". Decide el brand owner. Lo mismo aplica al tagline del masthead (hoy "Efeonce Greenhouse™ · Empower your Growth" → ej. "Greenhouse · Empower your Growth" o el eslogan del SSOT).
2. ¿El address sigue siendo `greenhouse@efeoncepro.com` o se quiere un buzón distinto? (Cambiar el address es out-of-band: verificación de dominio en Resend.)
