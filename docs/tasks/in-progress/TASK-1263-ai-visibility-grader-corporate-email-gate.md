# TASK-1263 — AI Visibility Grader: activar el gate de correo corporativo en el form

## Baseline recalibration 2026-06-28 (pre-ejecución — premisa corregida)

Discovery encontró que la **premisa original de la task era incompleta**. El gate de email de TASK-1254 vive **exclusivamente dentro de `submitForm`** (`src/lib/growth/forms/commands.ts`), pero el intake real del grader **nunca pasa por `submitForm`**:

- El route `POST /api/public/growth/ai-visibility/run` despacha entre `createPublicGraderRun` (a-medida, prod) y `createPublicGraderRunViaFormsEngine` (forms-engine, staging ON) según `GROWTH_GRADER_INTAKE_ON_FORMS_ENGINE_ENABLED`.
- **Ninguno** llama `submitForm`; la fachada de convergencia persiste con `persistAcceptedSubmission` directo. El único caller de `submitForm` es el route genérico `/api/public/growth/forms/[slug]/submit`, que el grader no usa.

→ Publicar una versión del form con `emailPolicy.block_field` (lo que pedía la task) habría sido **configuración inerte**: nadie la lee en el path del grader. Cumple los AC literales pero **no el Goal** (gmail rechazado antes de gastar AI).

**Decisiones del operador (2026-06-28):**

1. **Cablear el gate en la fachada** (reusando el primitive), además de publicar la versión gobernada — único camino que cumple el Goal.
2. **Ambos paths** (forms-engine de staging + a-medida de prod), para que el gate proteja el grader sin importar el estado del flag de convergencia (cubre el cutover de TASK-1246).

**Impacto en el alcance:** sube de "config/data only" a **command real** (consistente con el header `Backend impact: command`). Diseño: un helper canónico `evaluateFormEmailGate` en `email-verification/` = **un primitive, 3 consumers** (`submitForm` + ambas fachadas del grader). Sin migración (`outcome` de `grader_intake_events` es `TEXT` libre). Detalle en Scope (abajo, Slices recalibrados).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `command`
- Epic: `EPIC-020`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth`
- Blocked by: `TASK-1254`
- Branch: `task/TASK-1263-ai-visibility-grader-corporate-email-gate`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Aplica el gate de correo corporativo (`emailPolicy.mode=block_field`) de TASK-1254 al formulario del **AEO / AI Visibility Grader** (`ai-visibility-grader`), por la vía gobernada (nueva versión publicada). Hoy ese form acepta cualquier correo; Efeonce solo atiende Enterprise + empresa mid-market, así que un lead con gmail/yahoo/hotmail (o temporal) no interesa — y además gastaría providers AI del grader.

## Why This Task Exists

TASK-1254 dejó el gate de correo corporativo **code-complete + live en staging** (validador `corporate_email`, orquestador `verifyEmail`, lista comprensiva de ~4.5k proveedores públicos, `emailPolicy` por form en `validation_schema_json`, autoridad en `submitForm`, flag `GROWTH_FORMS_EMAIL_VERIFICATION_ENABLED`), pero **no lo activó en ningún form real** (decisión de negocio por form). El operador eligió el AEO grader.

El grader form `ai-visibility-grader` **fue sembrado directamente** (seed, no por el flujo de autoría) → su versión publicada v2 tiene `validation_schema_json={}`, **0 destinations**, y le faltan `destination_policy` + `retention_policy` que el compilador exige para publicar. Por eso no se puede simplemente "editar y publicar": hay que crear una versión nueva (las publicadas son inmutables) que pase el compilador, lo que obliga a **definir esas 2 políticas de datos del grader** (decisión de gobernanza). Esta task gobierna ese paso.

## Goal

- Publicar una versión nueva del form `ai-visibility-grader` con `emailPolicy.mode=block_field` (campo `email`), por el flujo de autoría gobernado (`authorDraftForm` + `publishForm`), deprecando la versión actual.
- Definir las políticas faltantes del grader que el compilador exige (`destination_policy` greenhouse-only + `retention_policy`), alineadas con cómo el grader entrega (pipeline propio + handoff HubSpot TASK-1242, NO un `form_destination` del motor).
- Verificar end-to-end: gmail/yahoo/público/temporal → rechazado; correo de empresa → aceptado y el flujo del grader sigue corriendo. Bonus: el rechazo ocurre ANTES de gastar providers AI (el junk lead no dispara el grader).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md` (§§8-21 + Delta 2026-06-26 TASK-1254 — email verification + corporate gate)
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`
- `docs/tasks/in-progress/TASK-1254-growth-forms-email-verification-corporate-gate.md` (el primitive del gate)

Reglas obligatorias:

- **Vía gobernada, NO raw-SQL.** Las versiones publicadas de `form_version` son inmutables (trigger `block_published_form_version_mutation`: bloquea edición de contenido/policy; permite INSERT + cambios de status). Crear versión nueva vía `authorDraftForm` (que ya acepta `validationSchema` desde TASK-1254) + `publishForm`, NO editar la publicada in-place ni hacer INSERT crudo de una versión `published` (lo segundo salta el compilador y fue bloqueado correctamente por el safety classifier).
- **No inventar políticas de datos PII sin sign-off.** `destination_policy` + `retention_policy` del grader son decisión de gobernanza (captura PII de prospectos). Confirmar valores con el owner antes de publicar (ver Open Questions).
- **El gate corre ANTES de la aceptación** → un correo no corporativo se rechaza sin disparar el pipeline del grader (ahorra costo AI) ni el handoff HubSpot. Verificar que un corporativo legítimo SÍ sigue fluyendo (grader + handoff intactos).
- **Default OFF / cutover gradual** (patrón TASK-1254): activar en staging, smoke, y recién prod (bundle con el launch del grader, TASK-1246).

## Normative Docs

- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` (fila `GROWTH_FORMS_EMAIL_VERIFICATION_ENABLED`)
- `CLAUDE.md` §"Full API Parity Principle" + §"ICP" (Enterprise + mid-market, no freelancers/Pyme)

## Dependencies & Impact

### Depends on

- **TASK-1254** — el gate primitive (validador `corporate_email`, `verifyEmail`, lista comprensiva, `emailPolicy`, `submitForm` gate, flag, `authorDraftForm` acepta `validationSchema`). Code-complete + staging ON.
- Form `ai-visibility-grader` publicado (`fdef-ai-visibility-grader` / `fver-ai-visibility-grader-v2`).

### Blocks / Impacts

- Mejora la calidad de lead del lead magnet del grader (EPIC-020) + ahorra costo AI en junk leads.
- Se coordina con **TASK-1246** (launch público del grader) para el cutover a prod.
- **TASK-1256** (admin authoring / masking cockpit) — cuando exista, esta activación se hará por UI; esta task es el camino interino gobernado por comando/script.

### Files owned

- `docs/tasks/...TASK-1263-*.md`
- (operativo) script gobernado de activación, p.ej. `scripts/growth/activate-grader-email-gate.mjs` [crear si se decide dejarlo committeado]
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` (nota de activación por form)
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` (delta)

## Current Repo State

### Already exists

- Gate primitive completo (TASK-1254): `src/lib/growth/forms/email-verification/**`, `validators/core.ts` (`corporate_email`), `emailPolicy` en `contracts.ts` (`resolveEmailPolicy`), gate en `submitForm` (`commands.ts`), flag.
- `authorDraftForm` acepta `validationSchema` (TASK-1254) → camino gobernado para setear `emailPolicy`.
- Form `ai-visibility-grader` published v2 (seeded), `validation_schema_json={}`, 0 destinations, `consent_policy_version=ai-visibility-grader-consent-v1`, `form_kind=diagnostic_intake`.

### Gap

- El grader form NO tiene `emailPolicy` (acepta cualquier correo).
- El grader form NO tiene `destination_policy` ni `retention_policy` → el compilador de publicación los exige; hay que definirlos para poder publicar una versión nueva.
- No hay aún superficie de admin (TASK-1256) para setear `emailPolicy` por UI → activación interina por comando/script gobernado.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `command`
- Source of truth afectado: `greenhouse_growth.form_version` (nueva versión publicada del grader)
- Consumidores afectados: `submitForm (autoridad del gate), público del grader (EPIC-020), pipeline del grader + handoff HubSpot`
- Runtime target: `staging` (luego `production` via cutover TASK-1246)

### Contract surface

- Contrato existente a respetar: `greenhouse-growth-public-forms.v1`, `emailPolicy` (TASK-1254), compilador de publicación (`policy-compiler.ts`), inmutabilidad de `form_version` publicada.
- Contrato nuevo o modificado: una versión nueva del form `ai-visibility-grader` con `emailPolicy.mode=block_field` + `destination_policy`/`retention_policy` poblados.
- Backward compatibility: `gated` (sin el flag `GROWTH_FORMS_EMAIL_VERIFICATION_ENABLED`, el gate no aplica; el form se comporta como hoy).
- Full API parity: el gate ya es primitive canónico (TASK-1254); esta task solo lo activa en un form por la configuración gobernada del form definition.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.form_version` (INSERT versión nueva + UPDATE status de la anterior a `deprecated`).
- Invariantes que no se pueden romper:
  - La versión nueva es clon FIEL de la actual + solo `validation_schema_json` (emailPolicy) + las 2 políticas faltantes — sin perder fields/copy/consent/success_behavior.
  - El gate corre ANTES de la aceptación → no dispara grader/handoff en un rechazo.
  - Un correo corporativo legítimo sigue siendo aceptado y el flujo del grader corre igual.
  - NUNCA editar la versión publicada in-place (inmutable); NUNCA INSERT crudo de una versión `published` (salta el compilador).
- Tenant/space boundary: form público sin sesión; el gate es server-side.
- Idempotency/concurrency: la activación es one-shot; re-correrla debe ser segura (detectar si ya hay versión con emailPolicy y no duplicar).
- Audit/outbox/history: el versionado del form es el audit (append-only de versiones); sin outbox nuevo.

### Migration, backfill and rollout

- Migration posture: `none` (no schema change; es data/config vía comando gobernado).
- Default state: `flag OFF` en prod (el gate no aplica hasta `GROWTH_FORMS_EMAIL_VERIFICATION_ENABLED=true` + form con emailPolicy). En staging el flag ya está ON (TASK-1254).
- Backfill plan: `none`.
- Rollback path: re-publicar la versión anterior (o publicar una versión sin emailPolicy) + deprecar la nueva (status-only, permitido por el trigger); o flag OFF (revert global del gate).
- External coordination: sign-off del owner del grader sobre `destination_policy`/`retention_policy`; coordinación con TASK-1246 para el cutover a prod.

### Security and access

- Auth/access gate: la activación la corre un operador/agente con acceso al comando gobernado (no público).
- Sensitive data posture: `PII` (el grader captura datos de prospectos); el gate reduce captura de leads no deseados.
- Error contract: el rechazo usa el mensaje canónico es-CL de TASK-1254 ("Usa el correo de tu empresa para continuar."); sin leaks.
- Abuse/rate-limit posture: heredada del motor (captcha + rate-limit); el gate además reduce gasto AI por junk.

### Runtime evidence

- Local checks: `pnpm test` (gate de TASK-1254 ya cubierto); el cambio es config/data, no código nuevo de dominio salvo el script de activación.
- DB/runtime checks: verificar que la versión publicada vigente del grader tiene `validation_schema_json.emailPolicy.mode=block_field` + las 2 políticas; smoke de `submitForm` (gmail→rechazado, corporativo→aceptado) contra PG real.
- Integration checks: confirmar que un corporativo aceptado dispara el pipeline del grader + handoff HubSpot como antes (gate no rompe el flujo feliz).
- Reliability signals/logs: `growth.forms.email_rejection_rate` (sube cuando llega junk), `growth.forms.email_suspect_lead_rate`.
- Production verification sequence: ver Rollout.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] N/A nueva capability — el gate ya es primitive gobernado (TASK-1254). Esta task **activa** la capability existente en un form por su configuración gobernada (`emailPolicy` en el form definition), vía el comando de autoría (`authorDraftForm`), NO una lógica nueva. La superficie de admin (UI) para configurarlo es TASK-1256.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Definir las políticas de datos faltantes del grader

- Confirmar con el owner los valores de `destination_policy` (greenhouse-only: el grader entrega por su pipeline propio + handoff HubSpot TASK-1242, no por un `form_destination`) y `retention_policy` (retención de la PII del lead) que el compilador exige.
- Documentar la decisión (valores + razón) en la task / arch delta.

### Slice 2 — Publicar versión nueva con el gate + verificar

- Vía gobernada (`authorDraftForm` con `validationSchema={emailPolicy:{mode:'block_field',field:'email'}}` + las políticas de Slice 1, clonando fielmente fields/copy/consent/success_behavior de la versión actual) → `publishForm` → deprecar la anterior.
- Verificar end-to-end en staging: gmail/yahoo/público/temporal → `invalid` (rechazo es-CL); corporativo → `accepted` + pipeline del grader + handoff HubSpot corren igual.
- Actualizar `FEATURE_FLAG_STATE_LEDGER.md` (nota: grader activado en `block_field`) + arch delta.

## Out of Scope

- Construir la superficie de admin para configurar `emailPolicy` por UI → **TASK-1256**.
- Cambiar el primitive del gate, la lista de dominios o el provider Tier 2 → **TASK-1254**.
- Activar el gate en otros forms (este task es solo el grader).
- Cutover a producción del grader público → **TASK-1246** (esta task deja staging listo; el flip prod va con ese launch).

## Detailed Spec

El grader form fue sembrado fuera del flujo de autoría, por eso le faltan políticas que el compilador (`src/lib/growth/forms/policy-compiler.ts`) exige para publicar (`consent_policy_version` ✓ ya lo tiene, `destination_policy` ✗, `retention_policy` ✗, fields ✓, success_behavior ✓). La activación del gate obliga a crear una versión nueva (las publicadas son inmutables salvo status), y publicarla pasa por el compilador → hay que poblar esas 2 políticas. Como el grader maneja PII, sus valores son decisión de gobernanza (Open Questions). El camino técnico ya está habilitado por TASK-1254 (`authorDraftForm` acepta `validationSchema`). El patrón quedó probado end-to-end en la demo de TASK-1254 (form de prueba gobernado → gmail rechazado, corporativo aceptado).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (definir políticas) → Slice 2 (publicar + verificar). No publicar la versión nueva sin las políticas confirmadas (el compilador la rechaza, y publicar con políticas inventadas en un form PII es riesgo de gobernanza).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Gate bloquea un lead enterprise legítimo (falso positivo de dominio corporativo) | growth | low | Lista de gratis es curada (bajo FP); dominio desconocido = corporativo (pasa); observar rejection rate | `growth.forms.email_rejection_rate` (spike anómalo) |
| Versión nueva pierde fidelidad (fields/copy/consent) del grader | growth | medium | Clonar TODAS las columnas de la versión actual; verificar render_contract idéntico + smoke del grader feliz | render del grader roto / campos faltantes |
| `destination_policy`/`retention_policy` mal definidas para un form PII | legal/data | medium | Sign-off del owner antes de publicar; valores documentados | review humano |
| Rechazo rompe el flujo del grader o el handoff | growth/crm | low | El gate corre ANTES de aceptar; un corporativo aceptado dispara grader+handoff igual (verificar en smoke) | handoff failures / grader no corre para corporativo |

### Feature flags / cutover

- Reusa `GROWTH_FORMS_EMAIL_VERIFICATION_ENABLED` (TASK-1254): staging ya ON; prod OFF (diferido a TASK-1246). El gate del grader solo aplica con el flag ON + el form con `emailPolicy`. Sin flag nuevo.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | N/A (decisión documental) | inmediato | sí |
| Slice 2 | re-publicar versión sin emailPolicy + deprecar la nueva (status-only, permitido por trigger); o flag OFF global | <10 min | sí |

### Production verification sequence

1. Slice 1 + 2 en staging (flag ya ON): publicar versión nueva + verificar `emailPolicy` vigente.
2. Smoke `submitForm`: gmail→rechazado, corporativo→aceptado + grader+handoff corren.
3. Confirmar render_contract del grader intacto (campos/copy/consent).
4. Prod: cutover junto con TASK-1246 (launch del grader) — flip flag prod + republicar la versión con gate + smoke low-volume.
5. Monitor `email_rejection_rate` / `email_suspect_lead_rate` 7d.

### Out-of-band coordination required

- Sign-off del owner del grader sobre `destination_policy` + `retention_policy`.
- Coordinación con TASK-1246 para el cutover a producción.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] La versión publicada vigente del form `ai-visibility-grader` tiene `validation_schema_json.emailPolicy.mode=block_field` (campo `email`).
- [ ] Se creó por la vía gobernada (`authorDraftForm` + `publishForm`), NO por raw-SQL ni edición in-place; la versión anterior quedó `deprecated`.
- [ ] `destination_policy` + `retention_policy` definidas con sign-off y documentadas.
- [ ] Smoke staging: gmail/yahoo/público/temporal → `invalid`; correo de empresa → `accepted`.
- [ ] Un corporativo aceptado dispara el pipeline del grader + handoff HubSpot como antes (flujo feliz intacto).
- [ ] El render_contract del grader (campos/copy/consent) quedó idéntico salvo el gate.
- [ ] `FEATURE_FLAG_STATE_LEDGER.md` + arch delta actualizados con la activación.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- Smoke `submitForm` contra PG real (gmail→invalid / corporativo→accepted) + verificación del render_contract del grader

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress`/`complete`)
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] ledger + arch delta actualizados
- [ ] chequeo de impacto cruzado (TASK-1246, TASK-1256)

## Follow-ups

- Cuando TASK-1256 entregue la UI de admin, migrar esta activación a la superficie gobernada visual.
- Evaluar aplicar el mismo gate a otros forms de captura B2B (cotizador, contacto) — decisión por form.

## Open Questions

1. ¿Qué `destination_policy` y `retention_policy` exactas para el grader? Propuesta: `destination_policy` greenhouse-only (entrega por pipeline propio + handoff HubSpot TASK-1242, no por `form_destination`); `retention_policy` alineada con la retención de PII de leads vigente. Requiere sign-off del owner antes de publicar.
2. ¿El cutover a prod va bundle con TASK-1246 (launch del grader) o independiente? Propuesta: bundle con TASK-1246 (el grader público no está live en prod todavía; activar el gate solo es útil con tráfico real).
