# TASK-1359 — Growth Forms multi-step funnel instrumentation (step-level events → GA4)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-020`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|public-site|data`
- Blocked by: `none`
- Branch: `task/TASK-1359-growth-forms-multistep-funnel-instrumentation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El renderer portable de Growth Forms (`multi_step_light`, p.ej. el form del AI Visibility Grader, 5 pasos) hoy solo emite el submit final (`gh_form_submission_accepted` → `generate_lead`). Eso mide *cuántos convierten*, pero NO *dónde se caen*. Esta task instrumenta el **funnel por paso** — eventos `gh_form_step_viewed` / `gh_form_step_completed` / `gh_form_step_back` (evento genérico + `step_index` como parámetro) + enriquecer el `gh_form_field_validation_failed` existente con `step_index`+`field_key` — para detectar el **stuck step** y qué campo lo traba, y cablearlo end-to-end a GA4 (allowlist SoT + custom dimensions + tags GTM genéricos, sin key events nuevos).

## Why This Task Exists

El form del grader es el lead magnet (la superficie que convierte). Sin instrumentación por paso, el equipo CRO no puede responder la pregunta operativa básica: *¿en qué paso abandonan y por qué?*. Hoy `renderer.ts` avanza `currentStep` y bloquea por validación sin emitir señal de progreso; el único evento útil es el submit final, que es el fondo del funnel. La consecuencia es que cualquier optimización del form (reducir campos, reescribir copy de un paso, dividir un paso) es a ciegas. Un funnel de pasos + error-rate por campo convierte esa decisión en dato (regla CRO: atacar el paso con mayor `drop-off × tráfico`).

## Goal

- El renderer emite eventos de progreso por paso (`viewed`/`completed`/`back`) con `step_index`/`step_id`/`step_count` como parámetros browser-safe (nunca PII/valores).
- El `gh_form_field_validation_failed` existente carga `step_index` + `field_key` (la clave del campo, no el valor) para atribuir el "por qué se traban" a un paso/campo.
- GA4 recibe los eventos (allowlist SoT extendida + custom dimensions registradas + tags GTM genéricos) y se puede armar un Funnel Exploration ordenado por `step_index`; ningún evento de paso es key event (solo `generate_lead`).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_TRACKING_ENGINE_ARCHITECTURE_V1.md` (§19 mandato de medición + §19.5 hosts)
- `docs/reference/measurement-gtm-ga4/` (reference canónico de medición — 04 house style, 05 shapes API v2, 07 GA4 Admin API, TRACKING-PLAN, LEARNINGS)

Reglas obligatorias:

- **Evento genérico + parámetro de identidad, NUNCA evento por número de paso.** `gh_form_step_viewed` con `step_index` param — NUNCA `gh_form_step1_viewed`/`gh_form_step2_viewed` (explosión de eventos). Distinguir pasos por `step_index`, forms por `form_slug`.
- **NUNCA PII ni valores crudos en parámetros.** `field_key` = la CLAVE del campo (`email`, `firstName`), NUNCA el valor. Todo param nuevo pasa por la allowlist dura (`TELEMETRY_ALLOWED_PAYLOAD_KEYS` en `contracts.ts` + su espejo en `telemetry.ts`); un param que no esté en la allowlist se descarta silenciosamente.
- **NUNCA marcar como key event un evento de paso/progreso** (`gh_form_step_*`, `gh_form_field_validation_failed`). Key event SOLO para conversiones reales de negocio (`generate_lead`). GA4 topa a 30 key events/propiedad. Criterio: `docs/reference/measurement-gtm-ga4/04 §3b`.
- **NUNCA publicar a `GTM-NGHPGRLZ` sin preview + confirmación humana explícita** (acción gobernada `propose → confirm → publish`). Construir en el workspace (id=2) es seguro; `create_version`+`publish` es la única mutación live.
- **SoT del vocabulario de eventos = `GTM_EVENT_NAMES` en `contracts.ts`**, espejado en `RENDERER_GTM_EVENTS` (`telemetry.ts`). Agregar un evento nuevo SIEMPRE actualiza ambos (el test de espejo debe seguir verde).

## Normative Docs

- `docs/reference/measurement-gtm-ga4/04-greenhouse-gh-event-convention.md` — house style `gh_<object>_<action>` + regla GA4-recomendado vs custom + §3b criterio event vs key event.
- `docs/reference/measurement-gtm-ga4/05-gtm-api-v2-tag-shapes.md` — JSON exacto `gaawe`/`customEvent`/`v` (DLV) para construir tags/triggers/variables.
- `docs/reference/measurement-gtm-ga4/07-ga4-admin-api-ops.md` — registrar custom dimensions.
- `docs/reference/measurement-gtm-ga4/LEARNINGS.md` — gotchas verificados (leer ANTES de construir tags: `measurementIdOverride`, scope `quick_preview`, branch-from-version, consent en verificación).
- `docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md` — registro obligatorio; marcar el form como funnel-tagged al cerrar.

## Dependencies & Impact

### Depends on

- Renderer portable Growth Forms ya emite `gh_form_*` al `dataLayer` (default true): `src/growth-forms-renderer/telemetry.ts`, `src/growth-forms-renderer/renderer.ts` (composición `multi_step_light`).
- Pipeline de medición ya conectado y live (TASK previa de esta sesión): container `GTM-NGHPGRLZ` + GA4 `486264460`/`G-KYPPY57M14`, clientes `src/lib/growth/gtm/api-client.ts` + `src/lib/growth/ga4/api-client.ts`.
- `generate_lead` ya publicado como key event genérico por `form_slug`.

### Blocks / Impacts

- Habilita el Funnel Exploration del grader en GA4 (diagnóstico CRO de stuck step).
- Modelo replicable para cualquier otro form `multi_step_light` (todos quedan medidos por construcción, sin tocar GTM por form).
- No bloquea ninguna task; es aditivo.

### Files owned

- `src/lib/growth/forms/contracts.ts` (SoT: `GTM_EVENT_NAMES` + `TELEMETRY_ALLOWED_PAYLOAD_KEYS`)
- `src/growth-forms-renderer/telemetry.ts` (espejo `RENDERER_GTM_EVENTS` + `RENDERER_ALLOWED_PAYLOAD_KEYS`)
- `src/growth-forms-renderer/renderer.ts` (emisión en los hooks de paso)
- `src/growth-forms-renderer/__tests__/` (tests de emisión de eventos de paso)
- `docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md` (fila funnel-tagged) + `LEARNINGS.md` (gotchas nuevos)
- `docs/reference/measurement-gtm-ga4/container-snapshot.json` (post-publish `pnpm gtm:snapshot`)
- `docs/architecture/GREENHOUSE_TRACKING_ENGINE_ARCHITECTURE_V1.md` (§19 delta: eventos de funnel)

## Current Repo State

### Already exists

- Emisión de eventos: `renderer.ts` emite `gh_form_viewed` (L204), `gh_form_started` (L1379, 1.ª interacción), `gh_form_field_validation_failed` (L1405, con `reason_class: field.type`), `gh_form_submission_accepted` (L1734 → `generate_lead`). *(líneas aproximadas, `[verificar]` al tomar.)*
- Maquinaria de pasos: `multi_step_light` con `currentStep`, `steps[].fieldKeys`, avance en el submit-handler (validación OK → `currentStep += 1`, ~L1660), botón atrás (`currentStep -= 1`, ~L1306), `stepProgress(currentStep+1, steps.length)`.
- Allowlist browser-safe: `TELEMETRY_ALLOWED_PAYLOAD_KEYS` (`contracts.ts`) + espejo `RENDERER_ALLOWED_PAYLOAD_KEYS` (`telemetry.ts`) — incluye `form_slug`/`form_kind`/`surface_id`, NO incluye `step_index`/`step_id`/`step_count`/`field_key`.
- Emisor: `createTelemetryEmitter` (CustomEvent + `dataLayer.push`, saneado contra allowlist).
- Pipeline GTM/GA4 live + capa de robustez (`pnpm gtm:snapshot`, `pnpm measurement:smoke`, `pnpm growth:forms-tracking-audit`).

### Gap

- No existe `gh_form_step_viewed` / `gh_form_step_completed` / `gh_form_step_back` → falta el backbone del funnel.
- `gh_form_field_validation_failed` no carga `step_index` ni `field_key` → no se puede atribuir el error a un paso/campo.
- La allowlist bloquea `step_index`/`step_id`/`step_count`/`field_key` → aunque se emitieran, se descartarían.
- GA4 no tiene registradas esas custom dimensions ni existen los triggers/tags GTM para los eventos de paso.
- `step_id` estable: `[verificar]` si `RendererStep` expone un id/key estable; si no, derivar de `step_index` y documentarlo.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: `GTM_EVENT_NAMES` + `TELEMETRY_ALLOWED_PAYLOAD_KEYS` (`src/lib/growth/forms/contracts.ts`); config GTM/GA4 (container `GTM-NGHPGRLZ`, propiedad `486264460`).
- Consumidores afectados: GA4 (reporting/funnel), `dataLayer` consumers, `pnpm measurement:smoke`.
- Runtime target: `local` (renderer/tests) + `external` (GTM/GA4 governed publish) + `production` (bundle del renderer sirve el form live).

### Contract surface

- Contrato existente a respetar: allowlist de telemetría (`contracts.ts` ↔ `telemetry.ts` mirror + test de espejo), house style `gh_<object>_<action>` (`docs/reference/measurement-gtm-ga4/04`), shapes API v2 (`05`).
- Contrato nuevo o modificado: 3 eventos `gh_form_step_*` en el SoT + 4 params nuevos en la allowlist + enriquecer el payload de `gh_form_field_validation_failed`; en GTM: 4 DLV + 4 triggers + 4 GA4 Event tags; en GA4: 4 custom dimensions.
- Backward compatibility: `compatible` (aditivo — eventos/params nuevos; los consumers existentes ignoran lo que no leen; `generate_lead` intacto).
- Full API parity: `N/A — instrumentación, no capability de negocio`. El write path a GTM/GA4 YA es contrato gobernado (`src/lib/growth/{gtm,ga4}`, `propose → confirm → publish`); esta task lo consume, no crea una capability nueva.

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna DB. Config externa: container GTM `218104216` workspace id=2 + propiedad GA4 `486264460`.
- Invariantes que no se pueden romper:
  - Ningún parámetro fuera de la allowlist cruza al browser (PII-safe por construcción).
  - `field_key` = clave del campo, NUNCA el valor ingresado.
  - Ningún evento de paso es key event (solo `generate_lead`).
  - Evento genérico + `step_index` param — nunca un evento por número de paso.
  - `GTM_EVENT_NAMES` y `RENDERER_GTM_EVENTS` quedan idénticos (test de espejo verde).
- Tenant/space boundary: `N/A` — telemetría pública anónima; no hay tenant/session en el evento.
- Idempotency/concurrency: `N/A` — eventos fire-and-forget al `dataLayer`; duplicados tolerados por GA4.
- Audit/outbox/history: `N/A` — no persiste en Greenhouse; GA4 es el sink. La config GTM queda auditada por `container-snapshot.json` (drift en git).

### Migration, backfill and rollout

- Migration posture: `none` (sin DB).
- Default state: `enabled` para la emisión del renderer (aditivo, browser-safe); el efecto en GA4 requiere el publish gobernado de GTM (paso explícito con confirmación).
- Backfill plan: `N/A` — no hay data histórica que rellenar; el funnel arranca desde el go-live.
- Rollback path: renderer = `revert PR + rebuild bundle`; GTM = republish de la versión anterior del container (`create_version` previa) — reversible en minutos.
- External coordination: publish gobernado a `GTM-NGHPGRLZ` + registro de custom dimensions en GA4 (ambos con confirmación humana en el turno).

### Security and access

- Auth/access gate: `N/A` — telemetría pública; el publish GTM/GA4 corre bajo el service account `greenhouse-gtm-publisher@` con confirmación humana.
- Sensitive data posture: `no sensitive data` — allowlist dura garantiza cero PII/valores.
- Error contract: `N/A` — emisión defensiva (try/catch en SSR ya existe); no cruza al contrato de error canónico.
- Abuse/rate-limit posture: `N/A` — sin endpoint nuevo.

### Runtime evidence

- Local checks: `pnpm local:check` + test focal del renderer (emisión de `step_viewed[1..n]`, `step_completed`, `step_back`, y `field_validation_failed` con `step_index`+`field_key`) + test de espejo `GTM_EVENT_NAMES` ↔ `RENDERER_GTM_EVENTS`.
- DB/runtime checks: `N/A` (sin DB).
- Integration checks: Playwright que camina los 5 pasos del form live y asserta los eventos en `dataLayer`/`/g/collect`; extender `pnpm measurement:smoke` o un smoke dedicado. `scripts/ga4/realtime-events.ts 486264460` para confirmar en realtime.
- Reliability signals/logs: reusar `pnpm gtm:snapshot --check` (drift) — no se agrega signal nuevo.
- Production verification sequence: ver Rollout §Production verification sequence.

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumers nombrados con paths reales (`contracts.ts`, `telemetry.ts`, `renderer.ts`, container/propiedad GTM/GA4).
- [ ] Invariantes (allowlist PII, no key event de paso, evento genérico + param, mirror idéntico) explícitos y testeados.
- [ ] Rollback posture explícito (revert PR + republish versión previa del container).
- [ ] Evidencia runtime listada (test focal + Playwright dataLayer/`/g/collect` + realtime GA4).
- [ ] `field_key` verificado que es la CLAVE del campo, nunca el valor (no leak).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Renderer emite el funnel (SoT + emisión + tests)

- Agregar `gh_form_step_viewed`, `gh_form_step_completed`, `gh_form_step_back` a `GTM_EVENT_NAMES` (`contracts.ts`) + espejo `RENDERER_GTM_EVENTS` (`telemetry.ts`).
- Agregar `step_index`, `step_id`, `step_count`, `field_key` a `TELEMETRY_ALLOWED_PAYLOAD_KEYS` (`contracts.ts`) + espejo `RENDERER_ALLOWED_PAYLOAD_KEYS` (`telemetry.ts`). Tipos numéricos donde corresponda.
- Emitir en `renderer.ts`:
  - `gh_form_step_viewed` en el render de cada paso (initial + tras avance + tras back) con `step_index` (1-based), `step_id` (o `step_index` si no hay id estable, `[verificar]`), `step_count`.
  - `gh_form_step_completed` cuando la validación pasa y `currentStep += 1` (el paso que se dejó atrás), con `step_index`.
  - `gh_form_step_back` en el botón atrás, con `step_index`.
  - Enriquecer el `gh_form_field_validation_failed` existente con `step_index` (`this.currentStep`) + `field_key` (`field.key`).
- Tests focales: emisión de la secuencia `step_viewed[1..n]`, `step_completed[k]`, `step_back`, y `field_validation_failed` con `step_index`+`field_key`; test de espejo `GTM_EVENT_NAMES` ↔ `RENDERER_GTM_EVENTS` verde; sanitizer descarta un `field_key` con valor no permitido.
- `pnpm local:check` + focal verdes. **Sin push** (local-first).

### Slice 2 — GA4 custom dimensions

- Registrar `step_index`, `step_id`, `step_count`, `field_key` como custom dimensions event-scoped en la propiedad `486264460` vía `Ga4AdminClient` (shapes en `07-ga4-admin-api-ops.md`).
- Verificar con `GET` de vuelta que quedaron registradas.

### Slice 3 — GTM tags genéricos (workspace → preview → confirm → publish)

- En el workspace id=2 de `GTM-NGHPGRLZ`, construir con `GtmApiClient` (shapes en `05-gtm-api-v2-tag-shapes.md`), en orden: 4 DLV (`dlv - step_index`/`step_id`/`step_count`/`field_key`) → 4 triggers `customEvent` (`CE - gh_form_step_viewed`/`step_completed`/`step_back`/`gh_form_field_validation_failed`) → 4 GA4 Event tags (`gaawe`, `measurementIdOverride=G-KYPPY57M14`) con `eventSettingsTable`: form_slug, form_kind, surface_id, step_index, step_id, step_count (+ field_key en el de validación).
- `GET` de vuelta cada recurso + Preview (Tag Assistant). **Confirmación humana explícita** del diff → `create_version` + `publish`.
- `pnpm gtm:snapshot` post-publish (commit del snapshot). Ningún tag marcado como key event.

### Slice 4 — Verificar funnel end-to-end + cerrar docs

- Playwright que camina los 5 pasos del form live (fuerza un error de validación en un paso para disparar `gh_form_field_validation_failed` con `step_index`+`field_key`) y asserta los eventos en `/g/collect`; integrar al `pnpm measurement:smoke` o smoke dedicado.
- Confirmar en `scripts/ga4/realtime-events.ts 486264460` que llegan con los params.
- Armar el Funnel Exploration en GA4 (`gh_form_step_viewed` ordenado por `step_index`).
- Actualizar `TRACKING-PLAN.md` (form marcado funnel-tagged + filas de eventos), `LEARNINGS.md` (gotchas), Tracking Engine §19 (delta funnel).

## Out of Scope

- Familia `gh_cta_*` (CTAs/botones) — es su propia task (mencionada como pendiente en el reference).
- Cambios visibles del form (layout, copy, número de pasos) — esta task es solo instrumentación (`UI impact: none`).
- `gh_form_resumed` (medir el "Recuperamos lo que habías escrito") — opcional; queda como follow-up si el equipo lo pide.
- Persistir el funnel en Greenhouse (PG/BQ) — el sink es GA4; una proyección propia sería otra task.
- Google Ads conversion import de `generate_lead` — pendiente separado.
- Marcar cualquier evento de paso como key event — prohibido por diseño.

## Detailed Spec

Modelo de funnel (CRO) y mapeo a eventos:

| Métrica de funnel | Fórmula | Evento(s) |
|---|---|---|
| View rate (backbone) | `step_viewed[k]` | `gh_form_step_viewed` |
| Completion rate | `step_completed[k] / step_viewed[k]` | `gh_form_step_completed` |
| **Drop-off (stuck step)** | `1 − step_viewed[k+1]/step_viewed[k]` | `gh_form_step_viewed` |
| **Error rate + qué campo** | `field_validation_failed[k] / step_viewed[k]` | `gh_form_field_validation_failed` (+`field_key`) |
| Back rate | `step_back[k] / step_viewed[k]` | `gh_form_step_back` |
| Overall completion | `generate_lead / gh_form_started` | existentes |

Parámetros nuevos (todos browser-safe, en la allowlist):

| Param | Tipo | Origen | Nota |
|---|---|---|---|
| `step_index` | number (1-based) | `this.currentStep + 1` | — |
| `step_id` | string | `RendererStep.id` `[verificar]`; fallback `step_index` | id estable del paso |
| `step_count` | number | `steps.length` | — |
| `field_key` | string | `field.key` | **clave**, NUNCA el valor |

Nota de implementación (matiz CRO): el `gh_form_field_validation_failed` load-bearing para el funnel es el que **bloquea el avance** (validación al click en "Continuar", ~L1648), distinto de un error inline transitorio onBlur. Al enriquecer con `step_index` ambos quedan atribuibles; si se quiere separar "bloqueó avance" de "error transitorio", usar `reason_class` (ya presente) — decidirlo en Discovery.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (renderer emite) → Slice 2 (GA4 dimensions) → Slice 3 (GTM tags publish) → Slice 4 (verify + docs).
- Slice 3 (publish GTM) NO debe correr antes de Slice 1 (sin emisión, los tags no reciben nada) ni sin confirmación humana.
- Slice 2 puede correr en paralelo con Slice 1 (registrar dimensions no depende del código), pero antes de Slice 4 (verify) para que los params se reporten.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un param nuevo filtra PII/valor al `dataLayer` | UI / privacidad | low | allowlist dura + test que descarta claves no permitidas + `field_key`=clave no valor | code review + test de sanitizer |
| Publish GTM rompe la medición existente (`generate_lead`) | integration (GTM) | low | construir en workspace + preview + `pnpm measurement:smoke` post-publish + republish versión previa | `pnpm gtm:snapshot --check` (drift) + smoke rojo |
| Evento de paso marcado key event por error | integration (GA4) | low | regla dura + review; key events se cuentan (topa 30) | auditoría GA4 Admin |
| `GTM_EVENT_NAMES` y el mirror divergen | contract | medium | test de espejo obligatorio en Slice 1 | test rojo en CI |
| Doble conteo por emitir `step_viewed` en re-render no-transición | GA4 data quality | medium | emitir solo en transición real de paso (no en cada `renderForm`) | inspección realtime + funnel con counts inflados |

### Feature flags / cutover

- Sin flag env nuevo: la emisión del renderer es aditiva y browser-safe (default ON). El **cutover real** es el `publish` gobernado del container GTM (paso manual con confirmación) — antes del publish, los eventos viven solo en el `dataLayer` sin llegar a GA4. Revert: republish de la versión previa del container (minutos). La policy por-form `analytics_policy_json.gtmDataLayer=false` sigue permitiendo apagar la emisión por form si hiciera falta.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR + rebuild bundle renderer | <15 min | sí |
| Slice 2 | archivar/eliminar las custom dimensions en GA4 Admin (no rompen nada si quedan) | <5 min | sí |
| Slice 3 | `create_version`/`publish` de la versión previa del container | <10 min | sí |
| Slice 4 | doc-only + config de exploration GA4 (sin runtime) | — | sí |

### Production verification sequence

1. Slice 1 mergeado → bundle del renderer sirve el form live → abrir el form, avanzar pasos, confirmar `gh_form_step_*` en `window.dataLayer` (sin PII).
2. Slice 2 → `GET` de las 4 custom dimensions en GA4 Admin.
3. Slice 3 → preview (Tag Assistant) sobre el sitio → confirmar que los 4 tags disparan con los params → confirmación humana → publish → `pnpm gtm:snapshot`.
4. `pnpm measurement:smoke` verde (no regresión de `generate_lead`/page_view).
5. Playwright camina 5 pasos + fuerza error → `/g/collect` muestra `step_viewed[1..5]` + `field_validation_failed` con `step_index`+`field_key`.
6. `scripts/ga4/realtime-events.ts 486264460` confirma en realtime → armar Funnel Exploration.

### Out-of-band coordination required

- Publish gobernado a `GTM-NGHPGRLZ` (confirmación humana en el turno) + registro de custom dimensions en GA4 (service account `greenhouse-gtm-publisher@`). No toca Azure/HubSpot/secrets.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `GTM_EVENT_NAMES` (`contracts.ts`) y `RENDERER_GTM_EVENTS` (`telemetry.ts`) incluyen `gh_form_step_viewed`/`gh_form_step_completed`/`gh_form_step_back` y son idénticos (test de espejo verde).
- [ ] `TELEMETRY_ALLOWED_PAYLOAD_KEYS` + espejo incluyen `step_index`/`step_id`/`step_count`/`field_key`; el sanitizer descarta cualquier otra clave.
- [ ] El renderer emite `step_viewed` en cada transición de paso (no en re-renders no-transición), `step_completed` al avanzar, `step_back` al retroceder, todos con `step_index`.
- [ ] `gh_form_field_validation_failed` carga `step_index` + `field_key` (clave, no valor).
- [ ] GA4 tiene registradas las 4 custom dimensions event-scoped.
- [ ] GTM tiene 4 DLV + 4 triggers + 4 GA4 Event tags genéricos publicados; ninguno es key event; `container-snapshot.json` commiteado post-publish.
- [ ] Playwright confirma la secuencia de eventos en `/g/collect` caminando los 5 pasos + un error de validación; `pnpm measurement:smoke` verde (sin regresión de `generate_lead`).
- [ ] `TRACKING-PLAN.md` marca el form como funnel-tagged con las filas de eventos; `LEARNINGS.md` y Tracking Engine §19 actualizados.

## Verification

- `pnpm local:check`
- `pnpm test` (focal renderer + espejo de eventos)
- `pnpm measurement:smoke` + `pnpm gtm:snapshot --check`
- `scripts/ga4/realtime-events.ts 486264460` (realtime) + Funnel Exploration armado en GA4

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/` → `in-progress/` → `complete/`)
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado (rollout: renderer emite + tags publicados + verificado)
- [ ] `changelog.md` actualizado (nueva capa de funnel measurement)
- [ ] chequeo de impacto cruzado (forms `multi_step_light`, reference measurement)
- [ ] fila del form marcada funnel-tagged en `TRACKING-PLAN.md` + snapshot GTM commiteado

## Follow-ups

- **Gobernanza:** canonizar la dimensión `Measurement impact: none|event|funnel|dimension|cta|host` + addendum `docs/tasks/TASK_MEASUREMENT_ADDENDUM.md` en el Task Authoring Contract (esta task es la evidencia viva de que la medición cabalga sobre backend/ui y merece su propia dimensión, no un execution profile). Task separada.
- `gh_cta_*` (CTAs/botones) con el mismo patrón genérico (evento + `cta_id`/`cta_location`).
- `gh_form_resumed` opcional (medir el resume del form).
- Google Ads conversion import de `generate_lead`.

## Open Questions

- ¿`RendererStep` expone un id/key estable para `step_id`, o se deriva de `step_index`? (`[verificar]` en Discovery.)
- ¿Separar "error que bloquea avance" de "error inline transitorio" via `reason_class`, o basta con `step_index`? Decidir en Discovery según cómo se lea el funnel en GA4.
