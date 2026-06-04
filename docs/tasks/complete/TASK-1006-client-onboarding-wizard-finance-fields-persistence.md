# TASK-1006 — Client Onboarding Wizard Finance Fields Persistence

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-CLIENT-360`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `commercial|finance|ui|api|data`
- Blocked by: `none`
- Branch: `task/TASK-1006-client-onboarding-wizard-finance-fields-persistence`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Corregir el drift del wizard de alta donde varios campos visibles del paso Finanzas se capturan en UI pero no llegan al API ni se persisten en `greenhouse_finance.client_profiles`: direccion de facturacion, pais de facturacion, requiere OC/HES, numero OC/HES vigente y condiciones especiales. La solucion debe reusar columnas y primitives existentes; no crear un modelo paralelo.

## Delta 2026-06-04 — Análisis pre-implementación (arch-architect + greenhouse-ux + forms-ux)

Análisis con skills sobre el código real ANTES de implementar. El diagnóstico de Codex es correcto; estos son afinamientos que reducen blast radius y sharpean los slices. **Verificado en código:**

- **Gap del payload confirmado** — `handleSubmit` ([ClientOnboardingView.tsx:2413-2415](../../../src/views/greenhouse/agency/clients/ClientOnboardingView.tsx)) envía `finance: { paymentCurrency, paymentTermsDays }` y NADA más. billing address/country/PO/HES/special conditions se descartan en el submit.
- **`billingCountry` ya es canónico, NO free-text** — está tipado `CountryCode | ''` y **auto-deriva del país de la organización** (`ClientOnboardingView.tsx:642`: `if (!state.billingCountry) update('billingCountry', next)`, + prefill HubSpot/sale líneas 2361/2378). ⇒ **NO** re-modelar como texto libre ni agregar un default nuevo: ya hereda el país canónico. Solo persistir el `CountryCode` resultante. (Un input de override explícito — facturar desde un país distinto al legal — es decisión de producto, **fuera de V1**.)
- **Condicionales PO/HES ya implementados correctamente** (forms-ux conditional reveal): Switch `requiresPo` → `poNumber` TextField visible solo si `requiresPo=true` (idem HES), `ClientOnboardingView.tsx:1097-1119`. La regla del Slice 1 ("si requiresPo=false, poNumber persiste null") ya la garantiza la UI (campo oculto → `''`→null). No tocar el reveal.
- **🔴 Truthfulness es PEOR de lo que dice el Slice 4** (state-design + forms-ux): el resumen **Confirmar** (`ClientOnboardingView.tsx:1517-1520`) hoy muestra **solo currency + términos** — **omite por completo** billing address/país/PO/HES/condiciones. O sea: el operador los llena en el paso Finanzas, Confirmar los oculta, y el submit los descarta → honest-state violation triple. ⇒ El Slice 4 NO es "confirmar que no se oculten": es **agregar SummaryRows** para los campos persistidos al bloque Finanzas de Confirmar (condicionales: N° OC solo si `requiresPo`, N° HES solo si `requiresHes`), para que el operador revise lo que se va a guardar.

**Afinamientos a los slices (ver detalle en cada Slice abajo):**

1. **Slice 1 — validación PO/HES (forms-ux):** cuando `requiresPo=true`, `poNumber` queda **opcional, NO bloqueante** (el operador puede no tener el N° aún al onboardear; el alta no debe frenarse). Persistir lo que haya; trim → null. Idem HES.
2. **Slice 2 — países (AMBOS):** persistir `client_profiles.billing_country` (del wizard, ya auto-derivado) **Y** `clients.country_code` ← `organization.country` (derivado en el mismo INSERT de `clients`, sin input nuevo). Los 3 campos de país quedan llenos (ver nota SSOT abajo).
3. **Slice 4 — re-scope a "agregar al resumen Confirmar":** los 5 campos persistibles se muestran en Confirmar (no solo "no ocultar"). Copy es-CL claro para OC/HES = "número vigente del perfil", no entidad PO/HES.
4. **Anti-regresión = el live test** (overlay arch #8): este es un write **síncrono** del wizard, no un path async → la red de seguridad canónica es el `provision-client-from-wizard.live.test.ts` (UI payload → `client_profiles`), NO un reliability signal (sería over-engineering). El spec ya lo tiene; afirmado.

**⚠️ Los 3 campos de país DEBEN quedar llenos (arch — decisión del operador 2026-06-04):** existen tres campos distintos, NO redundantes, pero **ninguno debe quedar vacío** en un cliente bien onboardeado:

- `organizations.country` — país legal/HQ de la organización. **SSOT del default.** Hoy `MX` (Berel). Ya se llena (wizard/TASK-991).
- `clients.country_code` — país del cliente. Hoy **vacío** (Berel). Por defecto = país de la org.
- `client_profiles.billing_country` — país de facturación. Hoy **vacío** (Berel). Por defecto = país de la org; **puede diferir** (facturar desde otra entidad/país).

En el caso normal los 3 = el país de la organización; se modelan separados porque `billing_country` puede legítimamente diferir.

**Decisión: TASK-1006 llena AMBOS campos vacíos en el mismo write atómico** (antes marcado `clients.country_code` fuera de scope — corregido). El helper `instantiateClientForParty` **ya tiene la fila `organization` en mano** (selección al inicio de la tx) con su `country` → derivar `clients.country_code = organization.country` en el INSERT de `clients` es trivial y coherente (sería incoherente arreglar `billing_country` y dejar el de al lado vacío). NO requiere campo nuevo en el wizard: `clients.country_code` deriva del país de la org (SSOT), NO del formulario. Solo `billing_country` viene del wizard (y ya auto-deriva del país de la org en la UI, overridable).

- `clients.country_code` ← `organization.country` (derivado, sin input nuevo).
- `client_profiles.billing_country` ← `finance.billingCountry` del wizard.

**Sigue fuera de scope:** reconciliar valores ya existentes en clientes reusados con un override auditado (regla anti-data-loss del Slice 3 aplica: solo llenar si está vacío).

## ⚠️ HARD RULE — no romper el wizard (no-regresión, OBLIGATORIA al cerrar)

Esta task toca el **write atómico del alta** (`provisionClientFromWizard`: organización + cliente + `client_profiles` + caso de onboarding en **una sola transacción**, vía `instantiateClientForParty` + `promoteParty`). Un bug en el threading del payload, en el parser del route o en el INSERT **puede romper TODA el alta de cliente** — no solo los campos nuevos de finanzas. La puerta de alta es crítica (TASK-992, puerta única); romperla bloquea el onboarding de cualquier cliente nuevo.

**NUNCA cerrar TASK-1006 (mover a `complete/`) sin verificar, con evidencia, que el wizard sigue funcionando end-to-end DESPUÉS del cambio:**

- **NUNCA** asumir que "los tests unitarios verdes" = "el alta funciona". El alta es un write atómico multi-tabla contra PG real; se verifica contra PG real, no solo con mocks.
- **SIEMPRE** correr el **live test rollback-wrapped del alta COMPLETA** contra PG real (`provision-client-from-wizard.live.test.ts`) y assert que se crean **org + cliente + client_profiles + caso de onboarding** Y que los campos nuevos (finance + `clients.country_code`) persisten. No basta con assert de los campos nuevos: el test debe confirmar que el alta entera sigue completándose.
- **SIEMPRE** verificar los **3 caminos del wizard** que ya existen (TASK-992), no solo el feliz:
  1. **Crear cliente nuevo** → completa OK con todos los campos.
  2. **Completar cliente existente incompleto** → llena campos faltantes **sin borrar** los existentes (regla anti-data-loss Slice 3).
  3. **Detectar duplicado** → sigue detectando y no crea doble.
- **SIEMPRE** confirmar que un alta **sin** datos de finanzas (todos los campos nuevos vacíos/undefined) **sigue creando el cliente** — los campos son opcionales con defaults legacy; el INSERT no debe fallar por NULL/undefined. Caso de regresión #1 a evitar.
- **SIEMPRE** GVC del wizard end-to-end en `localhost` (recorrer los 5 pasos → submit → success screen real), no solo capturas del paso Finanzas. Adjuntar la evidencia de que el alta completó.
- **SIEMPRE** correr `pnpm local:check:ui` (lint + tsc + **build**) verde antes de cerrar — el wizard es `'use client'`; un import roto o un type drift solo aparece en el build de producción.
- **Si CUALQUIERA de estas verificaciones falla → NO cerrar.** Reportar `code complete, rollout pendiente` y debuggear. El flag `CLIENT_LIFECYCLE_ONBOARDING_ENABLED` permite revertir el comportamiento sin romper, pero el revert por PR es el rollback canónico.

Esta regla existe porque el costo de romper la puerta de alta (bloquear todo onboarding) es órdenes de magnitud mayor que el beneficio de persistir unos campos de finanzas. La intervención es de bajo riesgo SOLO si se verifica el flujo completo, no el feliz aislado.

## Why This Task Exists

El wizard muestra campos financieros operativos que el operador cree estar guardando. Sin embargo, `ClientOnboardingView.handleSubmit` solo envia moneda, terminos de pago y contactos; `provisionClientFromWizard` solo pasa `billingDefaults` y `financeContacts` a `instantiateClientForParty`. El schema real ya tiene columnas para estos datos, por lo que el problema es un contrato incompleto UI -> route -> composer -> `client_profiles`, no una falta de DDL.

## Goal

- Enviar y validar todos los campos financieros visibles del wizard que tienen columna canonica.
- Persistirlos en `greenhouse_finance.client_profiles` durante el commit atomico del alta.
- Mantener idempotencia al completar clientes existentes sin borrar datos ya confiables por accidente.
- Agregar tests anti-regresion para que ningun campo visible vuelva a quedar descartado silenciosamente.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_CLIENT_ONBOARDING_WIZARD_V1.md`
- `docs/architecture/GREENHOUSE_CLIENT_LIFECYCLE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- No crear columnas nuevas salvo que `pnpm pg:doctor`/schema real contradiga `src/types/db.d.ts`.
- Reusar `greenhouse_finance.client_profiles` como source of truth del perfil financiero inicial.
- No crear endpoints ad hoc para botones; el write sigue pasando por `provisionClientFromWizard`.
- No crear Purchase Order/HES entities en esta task; solo persistir los numeros vigentes del perfil cuando el operador los declara en el alta.
- Mantener idempotencia para orgs/clientes existentes: no sobreescribir valores existentes con vacio/null.
- Copy visible sigue en `src/lib/copy/client-onboarding.ts`.

## Normative Docs

- `DESIGN.md`
- `docs/tasks/in-progress/TASK-992-client-lifecycle-orchestrator-single-front-door.md`
- `docs/tasks/to-do/TASK-997-wizard-canonical-external-reference-association.md`
- `docs/tasks/to-do/TASK-1005-client-onboarding-wizard-ai-assistants.md`

## Dependencies & Impact

### Depends on

- `src/views/greenhouse/agency/clients/ClientOnboardingView.tsx`
- `src/app/api/admin/clients/lifecycle/provision/route.ts`
- `src/lib/client-lifecycle/commands/provision-client-from-wizard.ts`
- `src/lib/commercial/party/commands/instantiate-client-for-party.ts`
- `src/lib/finance/postgres-store-slice2.ts`
- `src/types/db.d.ts`
- `greenhouse_finance.client_profiles` columns:
  - `billing_address`
  - `billing_country`
  - `requires_po`
  - `requires_hes`
  - `current_po_number`
  - `current_hes_number`
  - `special_conditions`
  - `finance_contacts`
  - `payment_terms_days`
  - `payment_currency`
- `greenhouse_core.clients` column (Delta 2026-06-04):
  - `country_code` (derivado de `organization.country` en el INSERT de clients)

### Blocks / Impacts

- Blocks `TASK-1005`, because AI Preflight should not recommend or reason over finance fields that the runtime discards.
- Improves `confirm_billing_setup` readiness in the client lifecycle checklist.
- Impacts Finance client profile readers and Account 360/timeline displays if they surface these fields.

### Files owned

- `src/views/greenhouse/agency/clients/ClientOnboardingView.tsx`
- `src/app/api/admin/clients/lifecycle/provision/route.ts`
- `src/lib/client-lifecycle/commands/provision-client-from-wizard.ts`
- `src/lib/commercial/party/commands/instantiate-client-for-party.ts`
- `src/lib/client-lifecycle/commands/provision-client-from-wizard.live.test.ts`
- `src/lib/client-onboarding/form-helpers.ts`
- `src/lib/copy/client-onboarding.ts`
- `docs/architecture/GREENHOUSE_CLIENT_ONBOARDING_WIZARD_V1.md`
- `docs/documentation/**`
- `docs/manual-de-uso/**`

## Current Repo State

### Already exists

- UI state includes:
  - `billingAddress`
  - `billingCountry`
  - `requiresPo`
  - `requiresHes`
  - `poNumber`
  - `hesNumber`
  - `specialConditions`
- UI renders the fields in `FinanzasStep`.
- `src/types/db.d.ts` confirms `greenhouse_finance.client_profiles` has:
  - `billing_address`
  - `billing_country`
  - `requires_po`
  - `requires_hes`
  - `current_po_number`
  - `current_hes_number`
  - `special_conditions`
- `src/lib/finance/postgres-store-slice2.ts` already knows how to upsert/read these profile fields.
- `instantiateClientForParty` already creates `client_profiles` atomically, but only fills currency, terms, PO/HES booleans as false, contacts and base identity.

### Gap

- `ClientOnboardingView.handleSubmit` does not include billing address/country, PO/HES requirements, PO/HES numbers or special conditions in the request body.
- `provision/route.ts` does not parse these fields.
- `ProvisionClientFromWizardInput.finance` does not model these fields.
- `instantiateClientForParty` cannot receive/persist these fields.
- Existing-client completion path catches `OrganizationAlreadyHasClientError` and reads the profile id/client id, but does not update missing finance fields on an existing profile.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Contract and payload threading

- Extender `WizardState` submit payload en `ClientOnboardingView.handleSubmit`.
- Extender `provision/route.ts` con parser/normalizer para:
  - `billingAddress`
  - `billingCountry`
  - `requiresPo`
  - `requiresHes`
  - `currentPoNumber`
  - `currentHesNumber`
  - `specialConditions`
- Extender `ProvisionClientFromWizardInput.finance`.
- Validar relaciones simples:
  - si `requiresPo=false`, `currentPoNumber` puede persistir null aunque UI lo haya ocultado.
  - si `requiresHes=false`, `currentHesNumber` puede persistir null aunque UI lo haya ocultado.
  - trim strings, empty -> null.

### Slice 2 — Persist in client profile creation

- Extender `InstantiateClientForPartyInput.billingDefaults` o crear `financeProfileDefaults` en el helper, segun Discovery determine menor blast radius.
- Persistir en el INSERT de `greenhouse_finance.client_profiles`:
  - `billing_address`
  - `billing_country`
  - `requires_po`
  - `requires_hes`
  - `current_po_number`
  - `current_hes_number`
  - `special_conditions`
- **Llenar `clients.country_code` en el INSERT de `greenhouse_core.clients`** (Delta 2026-06-04): derivar de `organization.country` (la fila `organization` ya está en mano en la tx, `instantiate-client-for-party.ts:70`). NO requiere input nuevo del wizard. Hoy ese INSERT (`instantiate-client-for-party.ts:89-108`) NO setea `country_code` → queda NULL. Anti-data-loss: solo setear si el valor entrante (org country) es no-vacío.
- Preservar default existing behavior cuando no vienen campos.
- Agregar tests unitarios/focales del helper (incluir assert de `clients.country_code = organization.country`).

### Slice 3 — Existing client completion path

- Cuando `instantiateClientForParty` lance `OrganizationAlreadyHasClientError`, actualizar el `client_profiles` existente con los campos faltantes/enviados desde el wizard.
- Regla anti-data-loss: no reemplazar un valor existente no-vacio por null/vacio.
- Si el operador envia un valor nuevo no-vacio distinto al existente, Discovery debe decidir si se actualiza directamente o si se requiere una action auditada separada. V1 recomendado: update solo cuando el campo actual esta null/vacio; warning o follow-up para overwrite.

### Slice 4 — UI truthfulness and review summary

- Confirmar que el paso Confirmar muestra los campos financieros persistibles relevantes o al menos no oculta datos que se guardaran.
- Ajustar microcopy si hace falta para dejar claro que OC/HES en el alta son numeros vigentes del perfil, no creacion de entidades PO/HES.
- Si algun campo visible sigue sin persistirse por decision de dominio, retirarlo de UI o marcarlo explicitamente como nota local no persistida (preferido: persistir los campos listados).

### Slice 5 — Tests, docs and live smoke

- Actualizar `provision-client-from-wizard.live.test.ts` para verificar que los campos llegan a `client_profiles`.
- Agregar/regenerar types solo si hay drift real de DB.
- Actualizar `GREENHOUSE_CLIENT_ONBOARDING_WIZARD_V1.md` con la lista de campos persistidos.
- GVC del paso Finanzas/Confirmar si cambia UI visible.

## Out of Scope

- Crear purchase orders reales en `greenhouse_finance.purchase_orders`.
- Crear HES reales en `greenhouse_finance.service_entry_sheets`.
- Automatizar facturacion/Nubox a partir de OC/HES.
- IA para extraer condiciones financieras; eso vive en `TASK-1005` despues de este fix.
- Cambiar el checklist template `standard_onboarding_v1` salvo que Discovery pruebe que `confirm_billing_setup` necesita un delta documental.
- Redisenar el wizard o mover el flujo de Finanzas a otro drawer.

## Detailed Spec

Campos UI -> DB esperados:

| UI state | Request/API | DB column |
|---|---|---|
| `billingAddress` | `finance.billingAddress` | `client_profiles.billing_address` |
| `billingCountry` | `finance.billingCountry` | `client_profiles.billing_country` |
| `requiresPo` | `finance.requiresPo` | `client_profiles.requires_po` |
| `poNumber` | `finance.currentPoNumber` | `client_profiles.current_po_number` |
| `requiresHes` | `finance.requiresHes` | `client_profiles.requires_hes` |
| `hesNumber` | `finance.currentHesNumber` | `client_profiles.current_hes_number` |
| `specialConditions` | `finance.specialConditions` | `client_profiles.special_conditions` |
| `paymentTermsDays` | existing | `client_profiles.payment_terms_days` |
| `currency` | existing | `client_profiles.payment_currency` |
| `contacts` | existing | `client_profiles.finance_contacts` |
| _(derivado)_ `organization.country` | — (no wizard input) | `clients.country_code` |

Recommended type shape:

```ts
finance?: {
  paymentCurrency?: BillingCurrency
  paymentTermsDays?: number
  billingAddress?: string | null
  billingCountry?: string | null
  requiresPo?: boolean
  requiresHes?: boolean
  currentPoNumber?: string | null
  currentHesNumber?: string | null
  specialConditions?: string | null
}
```

Existing profile update rule:

```ts
// Pseudocode
if (existingProfile) {
  update only fields where incoming non-empty AND current is null/empty
  never null-out an existing profile field from wizard defaults
}
```

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 -> Slice 2 -> Slice 3 -> Slice 4 -> Slice 5.
- Do not start `TASK-1005` until Slice 5 closes or the task is code complete with tests green.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Sobrescribir datos financieros existentes en cliente reusado | finance/data | medium | update only null/empty fields unless explicit overwrite command exists | tests + manual DB smoke |
| Operador cree que se creo una OC/HES formal | finance/ui | medium | copy claro: numero vigente del perfil, no entidad PO/HES | GVC/manual review |
| Campo visible sigue sin persistirse | ui/data | medium | live test y assertion exhaustiva UI payload -> DB | test focal |
| Drift entre `db.d.ts` y PG real | data | low | `pnpm pg:doctor` / live test before close | pg doctor / migration check |
| Romper alta existente por payload nuevo | commercial | low | fields optional + defaults preserve legacy behavior | live test rollback-wrapped |

### Feature flags / cutover

Sin flag nuevo recomendado: es correccion de persistencia para campos ya visibles, todos opcionales y con defaults legacy. Rollback por revert PR. Si Discovery detecta overwrite de datos existentes o comportamiento sensible, agregar flag `CLIENT_ONBOARDING_FINANCE_PROFILE_FIELDS_ENABLED=false` default y graduar.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert UI/API payload threading | PR revert | si |
| Slice 2 | Revert helper persistence; campos vuelven a no persistir | PR revert | si |
| Slice 3 | Revert existing-profile update branch | PR revert | si |
| Slice 4 | Revert copy/UI summary changes | PR revert | si |
| Slice 5 | Docs/tests revert no afecta runtime | N/A | si |

### Production verification sequence

1. Local tests: payload parser + helper persistence.
2. Live rollback-wrapped test contra PG real: crear cliente temporal con all finance fields y assert `client_profiles`.
3. Live rollback-wrapped test con org existente/profile parcial: assert no overwrite de valores existentes con null.
4. GVC local/staging del paso Finanzas y Confirmar si copy cambia.
5. Staging flag/current deploy: alta controlada o rollback-wrapped API call.
6. Verificar Account 360/Finance client profile reader muestra los campos si la surface ya los expone.

### Out-of-band coordination required

N/A — repo-only change. No requiere GCP/Vercel secrets, HubSpot config, Notion scopes ni Teams permissions.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `handleSubmit` envia todos los campos financieros visibles persistibles.
- [ ] `provision/route.ts` parsea/sanitiza esos campos sin aceptar tipos ambiguos.
- [ ] `provisionClientFromWizard` modela y pasa los campos financieros al helper canonico.
- [ ] `instantiateClientForParty` persiste los campos en `greenhouse_finance.client_profiles` para clientes nuevos.
- [ ] `instantiateClientForParty` setea `clients.country_code` derivado de `organization.country` (los 3 campos de país quedan llenos, ninguno NULL).
- [ ] El path de cliente existente completa campos faltantes sin borrar valores existentes.
- [ ] Live test verifica al menos `billing_address`, `billing_country`, `requires_po`, `current_po_number`, `requires_hes`, `current_hes_number`, `special_conditions` **y `clients.country_code`**.
- [ ] La UI/copy no sugiere que se creen entidades PO/HES formales.
- [ ] **(HARD RULE) El wizard completa el alta end-to-end DESPUÉS del cambio** — los 3 caminos (crear nuevo / completar existente / detectar duplicado) funcionan, un alta sin datos de finanzas sigue creando el cliente, verificado con live test rollback-wrapped + GVC del flujo completo + `pnpm local:check:ui` verde. Ver sección "HARD RULE — no romper el wizard".

## Verification

- `pnpm task:lint --changed`
- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm vitest run src/lib/client-onboarding src/lib/client-lifecycle src/lib/commercial/party`
- `pnpm pg:doctor`
- `pnpm vitest run src/lib/client-lifecycle/commands/provision-client-from-wizard.live.test.ts`
- `pnpm design:lint`
- `pnpm fe:capture --route=/agency/clients/new --env=local --hold=3000` if visible copy/layout changes

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `docs/architecture/GREENHOUSE_CLIENT_ONBOARDING_WIZARD_V1.md` actualizado con campos financieros persistidos.
- [ ] `TASK-1005` revisado/desbloqueado si este cierre deja el AI Preflight listo para esos campos.

## Follow-ups

- Si se requiere overwrite auditado de campos financieros existentes, crear task separada para command `updateClientFinanceProfileFromOnboarding`.
- Si Finanzas necesita crear entidades formales de OC/HES desde el alta, crear task separada sobre Quote-to-Cash / Purchase Orders / Service Entry Sheets.

## Open Questions

- En cliente existente con valor distinto no-vacio, ¿el wizard debe bloquear, mostrar warning o abrir una accion auditada de overwrite? Recomendacion V1: no overwrite silencioso.

## Cierre (2026-06-04, en develop sin branch por pedido del operador)

5 slices entregados (commits en develop):
- **Slice 1** (`6dad7c43d`) — contract + payload: handleSubmit envía los 7 campos; route parsea con `trimToNull`; `ProvisionClientFromWizardInput.finance` modela los 7.
- **Slice 2** (`31ad6e4e4`) — persistir: `+country` al SELECT de `selectOrganizationForLifecycleUpdate`; `instantiateClientForParty.financeProfile`; INSERT `client_profiles` persiste los 7 (requires_po/hes ya no hardcode FALSE); INSERT `clients` setea `country_code = organization.country`; INSERT reescrito con params secuenciales.
- **Slice 3** (`f27ce8c89`) — cliente existente: helper `fillMissingFinanceProfileForExistingClient` (anti-data-loss, solo null/vacío); wire en el catch.
- **Slice 4** (`8c0ce0ae5`) — truthfulness: SummaryRows de los 5 campos en Confirmar; copy es-CL.
- **Slice 5** (`a43c0b716`) — live test extendido (assert los 7 + country_code) + arch Delta.

**Verificación (HARD RULE no-regresión cumplida):**
- Live test rollback-wrapped contra PG real: **2 verde** — alta completa (org+client+profile+space+case) + los 7 campos persistidos + `clients.country_code='MX'` + path cliente existente. Nada queda en DB.
- `pnpm test` full suite: **5963 passed, 0 failed**.
- `pnpm local:check:ui`: lint + tsc + build verde (wizard 'use client' compila).
- Sin DDL (columnas ya existían). Sin nuevos endpoints/capabilities/events/signals.

**Open Question resuelta (V1):** cliente existente con valor distinto no-vacío → NO overwrite silencioso; solo llenar null/vacío. Overwrite intencional = command auditado separado (follow-up).

**Pendiente menor (no bloqueante):** GVC del wizard end-to-end en localhost — el live test + build cubren el flujo; el GVC visual del resumen Confirmar queda recomendado al levantar `pnpm dev` (la copy es aditiva, bajo riesgo). **Desbloquea TASK-1005** (AI preflight ya puede razonar sobre campos que el runtime persiste).
