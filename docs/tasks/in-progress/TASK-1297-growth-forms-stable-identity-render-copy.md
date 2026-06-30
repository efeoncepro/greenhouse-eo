# TASK-1297 — Growth Forms stable identity + render copy contract

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
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
- Backend impact: `migration`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|public-site`
- Blocked by: `none`
- Branch: `task/TASK-1297-growth-forms-stable-identity-render-copy`

## Summary

Dar a Growth Forms una identidad estable, opaca e inmutable: un UUID `form_key` en `form_definition`, separado de `slug`, `form_version_id` y `surface_id`. En la misma base, cerrar el hueco de copy renderizable (`copyRefs`) para que el swap de AEO a `<greenhouse-form>` no dependa de HTML custom ni de nombres ambiguos.

> **Decisión de naming (F1, operador 2026-06-30):** la identidad pública/opaca se llama **`form_key`** (DB) / **`formKey`** (contrato) / **`form-key`** (atributo del renderer). NO se llama `form_guid`/`formGuid`: en este repo `formGuid` YA significa el GUID de destino de HubSpot (`mapping.formGuid`, `hubspot_form_guid`) y los docs declaran que *"el browser nunca recibe formGuid"*. Reusar ese nombre re-importaría exactamente la ambigüedad que esta task existe para eliminar. El `formGuid` de HubSpot queda intacto y server-only.

## Why This Task Exists

Hoy un agente puede confundir `efeonce-aeo-diagnostic` (lead comercial de la landing de servicio AEO) con `ai-visibility-grader` (intake del AI Visibility Grader), porque ambos usan lenguaje AEO/diagnostico y los IDs visibles dependen de slug/surface/version, y el `form_id` actual es semántico (`fdef-efeonce-aeo-diagnostic`). Ese modelo no es tan robusto como un handle opaco estable que identifique el formulario sin filtrar la convención interna de nombres.

AEO v3 ya serializa `security.captcha`, pero el contrato publico devuelve `copy:{}`. Si se reemplaza el bridge HTML por `<greenhouse-form>` ahora, el CTA visible puede caer al default per-`formKind` del renderer en vez del copy aprobado. Resolverlo solo en WordPress seria otro parche por landing; el fix correcto es identidad estable + copy visible como contrato publicado, reusable y **validado browser-safe**.

## Goal

- Agregar `form_key` estable, opaco y unico a `greenhouse_growth.form_definition`.
- Exponer `formKey` en readers, render contract, catalogo y telemetry browser-safe.
- Permitir resolver/embeber forms por `formKey`, dejando `slug` como alias humano/backward-compatible, **vía el segmento `[formSlug]` existente** (slug-or-uuid disambiguado server-side), SIN ruta ni superficie CORS nueva.
- Exponer/preservar `copyRefs` en `authorDraftForm` para publicar copy renderizable, **con un gate de validación browser-safe** (`copyDisplaySchema`) en el borde de serialización.
- Aplicar AEO con copy aprobado (desde SoT, validado con `greenhouse-ux-writing`) y documentar el `formKey` real antes de ejecutar la migracion WordPress (`TASK-1298`).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/growth-public-forms-runtime-contract.md`
- `docs/documentation/growth/motor-formularios-publicos.md`
- `docs/manual-de-uso/growth/operar-motor-formularios.md`

Reglas obligatorias:

- `form_key` identifica el formulario (opaco, inmutable); `slug` es alias/API legacy; `form_id` (PK `fdef-*`) es el surrogate técnico; `form_version_id` identifica una version; `surface_id` identifica donde se muestra.
- No volver a identificar un form solo por "AEO", "grader", pagina, screenshot, slug ni `form_id` si existe `form_key`.
- **NUNCA** nombrar la identidad de Growth Forms `form_guid`/`formGuid`: ese nombre está reservado al GUID de destino de HubSpot (`mapping.formGuid`, `hubspot_form_guid`), que es secreto y server-only. `form_key` ≠ HubSpot form GUID ≠ destination ID.
- Nunca modificar una version `published` in-place; clonar, publicar y deprecar.
- No mover copy visible reusable al HTML de WordPress cuando el renderer puede consumirlo desde `render_contract.copy`.
- No exponer HubSpot mapping, portal, GUIDs de destino, secretos ni PII en `copyRefs`. El copy publicado pasa por `copyDisplaySchema` (record string→string, key-allowlist, max length, sin nested) antes de llegar al contrato público.
- Mantener AEO `/aeo-2/` en bridge HTML hasta `TASK-1298`.

## Normative Docs

- `docs/tasks/complete/TASK-1294-growth-forms-renderer-turnstile-captcha-token.md`
- `docs/tasks/complete/TASK-1296-aeo-growth-form-turnstile-security-contract.md`
- `docs/documentation/public-site/aeo-landing-elementor.md`
- `docs/manual-de-uso/growth/incrustar-formulario-wordpress-astro.md`

## Dependencies & Impact

### Depends on

- `TASK-1294` complete: renderer consume `contract.copy['submit']`.
- `TASK-1296` complete: AEO v3 serializa `security.captcha`.
- `migrations/20260625081014196_task-1229-growth-forms-engine-schema.sql`: `form_definition` actual (PK `form_id TEXT` = `fdef-<uuid>`; `form_version.copy_refs_json JSONB NOT NULL DEFAULT '{}'` ya existe).
- `src/lib/growth/forms/store.ts`, `readers.ts`, `policy-compiler.ts`, `contracts.ts`, `commands.ts`.
- `src/growth-forms-renderer/element.ts`, `api-client.ts`, `contract.ts`.

### Blocks / Impacts

- Bloquea `TASK-1298`, la migracion WordPress/AEO del bridge HTML a `<greenhouse-form>`. **TASK-1298 debe actualizar su atributo de `form-guid` a `form-key`** (cross-impact, ver Closing Protocol).
- Impacta cualquier form futuro: agentes/scripts deben preferir `form_key` para mutaciones/embeds y `slug` solo como alias humano/backward-compatible.
- Impacta catalogo/editor externo, renderer portable y telemetry allowlist (SoT `TELEMETRY_ALLOWED_PAYLOAD_KEYS` + mirror `RENDERER_ALLOWED_PAYLOAD_KEYS`).
- Toca el drift-guard `renderer-contract-parity.test.ts`: agregar `formKey` al `form` block obliga a actualizar `contracts.ts` Y `contract.ts` juntos o `tsc` rompe.

### Files owned

- `migrations/*_task-1297-growth-forms-stable-form-key.sql`
- `src/lib/growth/forms/store.ts`
- `src/lib/growth/forms/readers.ts`
- `src/lib/growth/forms/commands.ts`
- `src/lib/growth/forms/contracts.ts`
- `src/lib/growth/forms/policy-compiler.ts`
- `src/growth-forms-renderer/contract.ts`
- `src/growth-forms-renderer/api-client.ts`
- `src/growth-forms-renderer/element.ts`
- `src/app/api/public/growth/forms/**`
- `scripts/growth/activate-aeo-render-copy-contract.ts`
- `docs/architecture/growth-public-forms-runtime-contract.md`
- `docs/documentation/growth/motor-formularios-publicos.md`
- `docs/manual-de-uso/growth/operar-motor-formularios.md`
- `docs/manual-de-uso/growth/incrustar-formulario-wordpress-astro.md`
- `docs/tasks/README.md`
- `docs/tasks/TASK_ID_REGISTRY.md`
- `Handoff.md`
- `changelog.md`

## Current Repo State

### Already exists

- `form_definition.form_id` es la PK `TEXT` (`fdef-<uuid>`), estable e inmutable entre versiones, pero **semántica** (`fdef-efeonce-aeo-diagnostic`) → confusable y filtra la convención interna. NO está modelado como handle opaco.
- `form_version_id` cambia en cada publish y no sirve como identidad estable del form.
- `surface_id` identifica host/pagina, no el form.
- `<greenhouse-form>` acepta `form="slug"` y `surface="surfaceId"`; `observedAttributes = ['form','surface','locale','base-url','embed-key']` (NO hay `form-key`/`form-guid`).
- Las 3 rutas públicas (`GET [formSlug]`, `submit`, `verify-email`) resuelven SOLO por slug; `api-client` arma la URL por slug.
- **Copy contract ya existe end-to-end**: `form_version.copy_refs_json` (columna + immutable trigger), `insertFormVersion` acepta `copyRefs` ([store.ts:194,227](../../../src/lib/growth/forms/store.ts)), `RenderContract.copy` ([contracts.ts:282](../../../src/lib/growth/forms/contracts.ts)) compilado desde `copy_refs_json.copy`, renderer consume `contract.copy['submit']` ([renderer.ts](../../../src/growth-forms-renderer/renderer.ts)).
- `form.formId` YA se expone en el render contract público ([contracts.ts:269](../../../src/lib/growth/forms/contracts.ts)).
- AEO v3 vigente: `fver-9507f6a7-431d-4215-a699-9c713328b69b`, con Turnstile y destination HubSpot preservados.

### Gap

- Falta `form_key` estable/opaco para distinguir forms con nombres parecidos sin filtrar `form_id` semántico.
- Falta exponer `formKey` en contratos/catálogo/telemetry y permitir resolución por `formKey` para embeds/scripts.
- **Gap real de authoring**: `authorDraftForm`/`AuthorDraftFormInput` NO aceptan ni pasan `copyRefs` ([commands.ts:68-118](../../../src/lib/growth/forms/commands.ts)) — el store sí puede persistirlo, pero el command no lo thread-ea.
- **Gap de validación (F3)**: el copy se serializa al contrato público con un **cast crudo** `as Record<string,string>` ([policy-compiler.ts:182](../../../src/lib/growth/forms/policy-compiler.ts)), mientras sus hermanos `consentDisplay` (línea 141) y `security` (línea 156) usan `safeParse`. Abrir authoring de copy SIN un `copyDisplaySchema` deja el copy público como el único sub-objeto del render contract sin validar (riesgo PII/secret/no-string).
- Falta `copy.submit` aprobado en el contrato AEO.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `migration`
- Source of truth afectado: `greenhouse_growth.form_definition.form_key` + `greenhouse_growth.form_version.copy_refs_json`
- Consumidores afectados: public render API, `<greenhouse-form>`, WordPress/Astro hosts, catalogo externo, admin/API authoring scripts, telemetry/dataLayer
- Runtime target: `production`

### Contract surface

- Contrato existente a respetar: public Growth Forms API por `slug`, `RenderContract.form`, `RendererApiConfig`, `authorDraftForm`, `copy_refs_json`.
- Contrato nuevo o modificado:
  - `form_definition.form_key UUID NOT NULL UNIQUE DEFAULT gen_random_uuid()`;
  - `RenderContract.form.formKey` (+ mirror en renderer `contract.ts`, gate parity);
  - catalogo/editor-safe incluye `formKey`;
  - **resolución por `formKey` vía el segmento `[formSlug]` existente**: el path param acepta slug O uuid; un disambiguador server-side (regex UUID estricto → `getFormDefinitionByKey`, si no → `getFormDefinitionBySlug`) decide. Cero ruta nueva, cero superficie CORS/OPTIONS nueva. El renderer pone el `formKey` donde hoy va el slug;
  - `<greenhouse-form>` acepta `form-key="<uuid>"` además de `form="<slug>"` backward-compatible;
  - commands/readers/scripts pueden resolver por `formKey`;
  - `authorDraftForm(input.copyRefs)` preserva/escribe `copy_refs_json` tras validar `copyDisplaySchema`.
- Backward compatibility: compatible; slugs y rutas existentes siguen funcionando.
- Full API parity: UI/WordPress/Astro/Nexa/scripts identifican el form por contrato gobernado (`formKey`), no por pagina, slug ni nombre visible.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.form_definition`, `greenhouse_growth.form_version`.
- Invariantes que no se pueden romper:
  - `form_key` no cambia por version nueva, rename de slug o nuevo surface;
  - `form_key` nunca es HubSpot form GUID ni destination ID; nunca se llama `formGuid`;
  - `form_id` (PK `fdef-*`) sigue siendo el surrogate técnico y **sigue siendo público** en `form.formId` (el `form_key` no lo oculta — añade un handle opaco, no remueve el existente);
  - `form_version_id` sigue identificando version inmutable;
  - `surface_id` sigue identificando host/pagina;
  - versiones publicadas son inmutables;
  - fields, validation, `ui_policy_json.security`, destinations y consent se preservan al clonar;
  - `copy_refs_json` solo contiene strings browser-safe, **enforced por `copyDisplaySchema` en el borde de serialización** (no por convención).
- **SSOT (F4)**: el row de `form_definition` queda con 3 identificadores (`form_id` surrogate semántico + `slug` alias público + `form_key` handle opaco público). Es el patrón surrogate-PK + public-opaque-handle; defendible porque los `form_id` existentes son semánticos y confusables. Decisión explícita: NO se remueve `formId` del contrato (backward-compat), por lo que el opaco coexiste, no reemplaza.
- Tenant/space boundary: public surfaces/origins vigentes; no cambia modelo de auth/admin.
- Idempotency/concurrency: migration additive con default unico (`gen_random_uuid()` rellena filas existentes en el mismo DDL en PG16); scripts no-op si `formKey`/copy ya estan correctos.
- Audit/outbox/history: lifecycle de version existente; no outbox nuevo.

### Migration, backfill and rollout

- Migration posture: additive migration + data rollout. Seguir el marker contract (`-- Up Migration` + bloque DO de verificación post-DDL que aborta si `form_key` no quedó NOT NULL/UNIQUE).
- Default state: backward-compatible; slug sigue operativo.
- Backfill plan: `form_key` se llena con `gen_random_uuid()` para forms existentes; registrar los `formKey` resultantes de AEO y grader en docs runtime.
- Rollback path: revert PR antes de depender de `form-key`; una vez usado en WordPress, rollback de embed a slug o bridge + revert version.
- External coordination: ninguna; no tocar WordPress en esta task.

### Security and access

- Auth/access gate: mismos gates public/admin existentes.
- Sensitive data posture: `form_key` es publico/opaco, no secreto; no PII. El `formGuid` de HubSpot permanece en `mapping_json` server-only y en `TELEMETRY_FORBIDDEN_PAYLOAD_KEYS`.
- Error contract: canonical unavailable/not-found; no raw DB errors.
- Abuse/rate-limit posture: no cambia submit/rate-limit.

### Runtime evidence

- Local checks: tests focales de store/readers/contracts/renderer api-client + `renderer-contract-parity.test.ts` verde tras agregar `formKey`.
- DB/runtime checks: migration apply/verify contra Cloud SQL; query de `form_key` para AEO y grader.
- Integration checks: public GET por slug y por `formKey`; catalogo muestra `formKey`; AEO GET muestra `copy.submit` y `security.captcha`; copy rechazado por `copyDisplaySchema` no aparece en el contrato.
- Reliability signals/logs: N/A, cambio de identidad/contract.
- Production verification sequence:
  1. Migration apply + verify `form_key` unique/not null (vía bloque DO + query).
  2. Confirmar `formKey` de `efeonce-aeo-diagnostic` y `ai-visibility-grader` (distintos).
  3. Dry-run script AEO por `formKey`.
  4. Apply script AEO por `formKey`.
  5. Public GET por slug y por `formKey` confirma misma version, `formKey`, `copy.submit`, `security.captcha` y ACAO.
  6. POST sin token sigue `403 captcha_failed/missing_token`.
  7. No WordPress mutation.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

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

### Slice 1 — Stable form key foundation

- Agregar migration additive `form_key UUID NOT NULL UNIQUE DEFAULT gen_random_uuid()` en `greenhouse_growth.form_definition` (con marker `-- Up Migration` + bloque DO de verificación post-DDL).
- Actualizar row types/store/readers para leer `form_key`.
- Agregar reader `getFormDefinitionByKey` y published-version resolver por `formKey` (espejo de `getPublishedVersionBySlug`).
- Actualizar types/tests relevantes.

### Slice 2 — Public/API/renderer contract

- Exponer `formKey` en `RenderContract.form` (`contracts.ts`) y en el mirror del renderer (`contract.ts`) en el MISMO cambio (gate `renderer-contract-parity.test.ts`).
- Exponer `formKey` en el catalogo editor-safe (`InsertableFormCatalogEntryVm` en `readers.ts`).
- Agregar `form_key` a AMBAS allowlists de telemetry (`TELEMETRY_ALLOWED_PAYLOAD_KEYS` + `RENDERER_ALLOWED_PAYLOAD_KEYS`) solo si el renderer/dataLayer lo emite.
- **Resolución por `formKey` sin ruta nueva**: hacer que el segmento `[formSlug]` (GET/submit/verify-email) acepte slug O uuid; agregar un disambiguador determinista (regex UUID v4 estricto) que rutee a `getFormDefinitionByKey` vs `getFormDefinitionBySlug`. NO crear ruta `by-key/` ni superficie CORS/OPTIONS nueva; el CORS compartido (`cors.ts`) ya cubre el segmento.
- Actualizar `<greenhouse-form>` para aceptar `form-key` además de `form` (agregar a `observedAttributes`); `api-client` usa `formKey` como path segment cuando está presente.
- Mantener rutas/atributo por slug backward-compatible.
- **Affordance chromeless transversal (todos los hosts, no AEO-only):** hoy "quitar la card" del renderer es un truco implícito (`--ghf-bg: transparent`) — abstracción con fuga que cada host re-deriva. Agregar al renderer un atributo de primera clase `appearance` (`surface` por defecto = comportamiento actual; `bare`/chromeless = fondo transparente sin chrome) en `observedAttributes`, mapeado al token interno. Browser-safe, sin lógica de negocio. Objetivo: que cualquier landing/host opte por chromeless de forma consistente sin escribir CSS scoped propio. Documentar el contrato de tematización (`--ghf-*` + `appearance` + `color-scheme="light"` + composición de card) en el manual canónico `incrustar-formulario-wordpress-astro.md` como receta reusable. Es el primer consumidor real `TASK-1298` (AEO), pero la capacidad es de plataforma.

### Slice 3 — Render copy command + validation gate

- Agregar `copyRefs?: unknown` a `AuthorDraftFormInput` y pasarlo a `insertFormVersion` (consistente con el resto de policy fields `unknown`).
- **Agregar `copyDisplaySchema`** (zod: `z.record(z.string(), z.string())` con key-allowlist p.ej. `['submit', ...]`, max length por valor, sin nested) y aplicarlo con `safeParse` en el borde de serialización de `policy-compiler.ts` (reemplazar el cast crudo `as Record<string,string>` de la línea ~182, alineándolo con `consentDisplay`/`security`).
- Agregar test focal que demuestre: (a) un draft versionado preserva copy refs; (b) un copy con valor no-string/nested/secret-shaped es rechazado/saneado y NO llega al contrato público.

### Slice 4 — AEO apply by formKey

- Crear script dry-run/apply que resuelva el target por `formKey` (no por etiqueta "AEO" ni slug).
- El copy aprobado (`copy.submit`) se toma de un SoT de copy validado con `greenhouse-ux-writing`, no se inventa inline en el script.
- Clonar la version publicada AEO, preservar policies/destinations/captcha y setear `copy_refs_json.copy.submit`.
- El script debe ser idempotente y no escribir si el copy vigente ya matchea.
- Copiar destinations y deprecar la version anterior solo despues de publish exitoso.

### Slice 5 — Production apply and docs

- Ejecutar migration/dry-run/apply.
- Verificar GET/POST por slug y por `formKey`.
- **Reescribir `docs/architecture/growth-public-forms-runtime-contract.md`** donde dice *"el browser nunca recibe ... formGuid"* (línea ~16) para desambiguar: el browser nunca recibe el **HubSpot destination formGuid**; el `formKey` Greenhouse SÍ es público/opaco. (F5)
- Actualizar docs/manuales/ledger/task lifecycle con el `formKey` real de AEO, el `formKey` real del grader y la nueva version publicada AEO.

## Out of Scope

- Reemplazar el bridge HTML de AEO.
- Mutar WordPress/Elementor/Kinsta.
- Cambiar estilos del renderer o copy de otros forms.
- Cambiar el HubSpot mapping o destination.
- Renombrar el `formGuid` de HubSpot (queda como está, server-only).
- Usar el HubSpot form GUID como identidad de Growth Forms; son IDs distintos.
- Remover `formId` del contrato público (se conserva por backward-compat).

## Detailed Spec

Modelo de identidad objetivo:

```txt
form_key         = identidad estable del form, opaca (UUID), pública, browser-safe
slug             = alias humano/API legacy (público)
form_id          = surrogate PK técnico (fdef-*), público en form.formId, NO usar como identidad de negocio
form_version_id  = version publicada/inmutable
surface_id       = host/pagina/canal donde se muestra
destination      = HubSpot/email/webhook/etc.; su HubSpot `formGuid` es secreto/server-only; no define identidad del form
```

Copy esperado para AEO:

```json
{
  "copy": {
    "submit": "Solicitar diagnóstico gratis →"
  }
}
```

Embed objetivo posterior para `TASK-1298`:

```html
<greenhouse-form form-key="<AEO_FORM_KEY>" surface="fhsf-efeonce-aeo-diagnostic" locale="es-CL"></greenhouse-form>
```

`<AEO_FORM_KEY>` debe salir del runtime verificado de esta task, no inventarse en docs.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (migration/store) -> Slice 2 (public/renderer contract + disambiguador) -> Slice 3 (copy command + validation) -> Slice 4 (AEO dry-run/apply) -> Slice 5 (docs).
- No ejecutar `--apply` de AEO si no hay `formKey` verificado para `efeonce-aeo-diagnostic`.
- No ejecutar `TASK-1298` hasta que el GET por `formKey` y slug devuelvan el mismo AEO form/version.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Public API por slug regresa | growth/public-site | low | mantener backward compatibility + tests | GET slug falla |
| `formKey` equivocado muta otro form | growth/public-site | medium | script resuelve y muestra slug/form_id/surface antes de apply | version nueva en slug incorrecto |
| Disambiguador slug/uuid clasifica mal | growth/public-site | low | regex UUID v4 estricto; slugs son kebab humano; test focal de ambas ramas | GET por slug devuelve 404 / GET por key devuelve otro form |
| Copy no browser-safe llega al contrato público | growth/public-site | medium | `copyDisplaySchema` safeParse en serialización + test de rechazo | PII/secret/no-string en `render_contract.copy` |
| Se pierde `security.captcha` al clonar version | growth/public-site | medium | preservar `ui_policy_json` completo y verificar GET | GET sin `security.captcha` |
| Se pierde destination HubSpot | HubSpot delivery | low | copiar destinations y verificar count | submissions accepted sin delivery |
| Drift parity renderer↔contract | growth | medium | actualizar `contracts.ts` + `contract.ts` juntos; `renderer-contract-parity.test.ts` | tsc/test rojo |

### Feature flags / cutover

Sin flag nuevo. La identidad por `formKey` es additive/backward-compatible; el cutover de AEO WordPress ocurre en `TASK-1298`.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert migration before consumers depend on `form_key` | <15 min | parcial si ya hay consumers |
| Slice 2 | keep slug path; revert renderer/API `formKey` support + disambiguador | <10 min | si |
| Slice 3 | revert command/schema/script | <10 min | si |
| Slice 4 | publicar version nueva basada en previa o deprecar nueva version | <15 min | si |
| Slice 5 | revert docs | <10 min | si |

### Production verification sequence

1. Migration apply + query `form_key` not null/unique.
2. Query AEO and AI Visibility Grader `formKey` (distintos).
3. Dry-run AEO script by `formKey`.
4. Apply AEO script by `formKey`.
5. Public GET by slug and by `formKey` return same `formKey`, form/version, `copy.submit`, `security.captcha` and ACAO.
6. Confirm `POST /submit` without token remains `captcha_failed/missing_token`.

### Out-of-band coordination required

N/A — repo + DB/version rollout; WordPress queda para `TASK-1298`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## 4-Pillar Score

### Safety

- **What can go wrong**: copy/identity públicos filtran PII/secret, o el embed resuelve el form equivocado.
- **Gates**: `copyDisplaySchema` (browser-safe), `form_key` opaco no-secreto, `formGuid` HubSpot intacto server-only + en `TELEMETRY_FORBIDDEN_PAYLOAD_KEYS`, disambiguador determinista.
- **Blast radius**: público (cualquier embed/landing). Mitigado por additive + backward-compat.
- **Residual risk**: `form.formId` (semántico) sigue público por backward-compat — aceptado.

### Robustness

- **Idempotency**: migration additive con default; script AEO no-op si copy ya matchea.
- **Atomicity**: clone+publish+deprecate de version en el lifecycle existente.
- **Race protection**: `UNIQUE(form_key)` a nivel DB.
- **Constraint coverage**: `NOT NULL UNIQUE` + bloque DO post-DDL; `copyDisplaySchema` en serialización.
- **Verified by**: tests focales (resolver por key, rechazo de copy no-safe, parity).

### Resilience

- **Retry/dead-letter**: N/A (sin path async nuevo).
- **Audit trail**: lifecycle de version existente (append/deprecate).
- **Recovery**: script dry-run/apply idempotente; rollback por slice arriba.
- **Degradation**: error canónico unavailable/not-found; copy inválido degrada a `{}` honesto, no rompe el render.

### Scalability

- **Hot path Big-O**: lookup por `form_key` O(log n) por índice UNIQUE.
- **Index coverage**: `UNIQUE(form_key)` cubre el resolver por key.
- **Async paths**: ninguno nuevo.
- **Cost at 10x**: lineal; sin redesign.

## Acceptance Criteria

- [ ] `greenhouse_growth.form_definition` tiene `form_key` UUID not-null unique para todos los forms existentes.
- [ ] AEO service diagnostic y AI Visibility Grader intake tienen `formKey` distintos, verificados y documentados.
- [ ] Public/render contracts exponen `formKey` sin exponer destination IDs/secrets; `formId` permanece (backward-compat).
- [ ] La identidad NO se llama `form_guid`/`formGuid` en ningún punto nuevo; el `formGuid` de HubSpot quedó intacto/server-only.
- [ ] `<greenhouse-form>` puede cargar por `form-key` y el path por `form`/slug sigue funcionando, vía el segmento `[formSlug]` con disambiguador (sin ruta/CORS nueva).
- [ ] El renderer acepta `appearance="bare"` (chromeless) además del default `surface`, como capacidad transversal de plataforma; el contrato de tematización (`--ghf-*` + `appearance` + `color-scheme="light"` + composición de card) queda documentado en `incrustar-formulario-wordpress-astro.md` como receta reusable por cualquier host.
- [ ] `authorDraftForm` acepta `copyRefs` y los pasa a `insertFormVersion`.
- [ ] El copy del render contract pasa por `copyDisplaySchema` (`safeParse`) en serialización; un copy no-string/nested/secret-shaped es rechazado y no aparece en el contrato público.
- [ ] Existe script idempotente dry-run/apply por `formKey` para publicar copy renderizable AEO sin editar version publicada in-place; el copy proviene de un SoT validado con `greenhouse-ux-writing`.
- [ ] La version publicada AEO posterior al apply preserva fields, validation, `security.captcha`, success behavior, consent y destinations.
- [ ] Public GET expone `copy.submit = "Solicitar diagnóstico gratis →"` y `security.captcha`.
- [ ] Public POST sin token sigue fallando cerrado.
- [ ] `renderer-contract-parity.test.ts` verde con `formKey` en ambos lados.
- [ ] `docs/architecture/growth-public-forms-runtime-contract.md` desambigua HubSpot `formGuid` vs `formKey` Greenhouse.
- [ ] No hay mutacion WordPress/Elementor/Kinsta.
- [ ] Docs/manuales/ledger/task lifecycle quedan sincronizados.

## Verification

- `pnpm task:lint --task TASK-1297`
- `pnpm ops:lint --changed`
- `pnpm docs:closure-check`
- Migration apply/verify query.
- Tests focales de store/readers/API/renderer + `renderer-contract-parity.test.ts`.
- Dry-run/apply script by `formKey`.
- Public GET/POST smoke by slug and by `formKey`.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `docs/tasks/TASK_ID_REGISTRY.md` quedo sincronizado
- [ ] `Handoff.md` quedo actualizado
- [ ] `changelog.md` quedo actualizado
- [ ] se ejecuto chequeo de impacto cruzado sobre `TASK-1298` (debe pasar de `form-guid` a `form-key` en embed/atributo/wireframe/acceptance + usar el `formKey` real de AEO)

## Follow-ups

- `TASK-1298` — migrar AEO `/aeo-2/` del bridge HTML a `<greenhouse-form form-key="...">`.

## Open Questions

- **Resuelto (F1)**: naming = `form_key`/`formKey`/`form-key` (decisión operador 2026-06-30); no `form_guid`/`formGuid`.
- **Resuelto (F2)**: transporte de resolución por key = segmento `[formSlug]` slug-or-uuid disambiguado server-side; sin ruta/CORS nueva.
- **Pendiente de runtime, no de diseño**: el `formKey` real de AEO y del grader se obtiene al ejecutar/verificar la migration; no se inventa en la task.
- **Residual aceptado**: `form.formId` (semántico) sigue público por backward-compat; si más adelante se quiere ocultar, es una task aparte (rompe consumers que leen `formId`).
