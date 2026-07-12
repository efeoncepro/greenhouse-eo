# TASK-1386 — Surround Discovery Ebook: Existing Growth Form Configuration & Publication

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Bajo`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `command`
- Epic: `EPIC-019`
- Status real: `Live en Think desde main; falta smoke humano de submit, descarga, correo y generate_lead para cierre operativo`
- Rank: `TBD`
- Domain: `content|data`
- Blocked by: `none`
- Branch: `task/TASK-1386-surround-discovery-ebook-growth-form`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Publicar el ebook **Surround Discovery™** como un lead magnet gobernado de Growth Forms: configuración idempotente, surface de Think, asset privado ya cargado y entrega tokenizada. La tarea no construye una landing; entrega el `form_key` y contrato browser-safe que consumirá TASK-1387.

## Why This Task Exists

El PDF ya está en ambos buckets privados, pero todavía no existe un `form_definition`, `form_host_surface` ni `form_asset` que lo entregue de forma controlada. Un enlace estático al objeto GCS rompería la captura de consentimiento, la entrega gated, los límites de abuso y la atribución. El primitive config-driven de TASK-1375 ya resuelve el problema: esta tarea debe configurarlo, no reimplementarlo.

## Goal

- Registrar y publicar `efeonce-surround-discovery-ebook` con identidad pública opaca (`form_key`) y fields/corporate-email policy estándar.
- Vincular el asset privado `ebooks/surround-discovery/surround-discovery-final.pdf` a la publicación mediante el primitive `form_asset` y la ruta gated existente.
- Activar la surface Think mínima, registrar medición y entregar evidencia real de `GET`, submit, descarga y CORS antes de desbloquear el embed visual.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_DOMAIN_ARCHITECTURE_V1.md`
- `docs/reference/ebook-lead-magnet-playbook.md`
- `docs/reference/measurement-gtm-ga4/04-greenhouse-gh-event-convention.md`
- `docs/manual-de-uso/growth/alta-surface-growth-form-checklist.md`

Reglas obligatorias:

- Reusar `scripts/growth/ebook-forms.registry.ts` y `scripts/growth/publish-ebook-form.ts`; no crear formulario, submit ni entrega paralela.
- El objeto GCS es privado y nunca aparece en el render contract, el HTML o `dataLayer`; sólo se entrega tras `submission_accepted` mediante `download_url` tokenizado.
- `form_key` es la identidad pública; `formGuid`, mapeos HubSpot y datos de otra submission nunca cruzan al browser.
- El submit permanece fail-closed por Turnstile, policy de correo corporativo y rate limits; la entrega de PDF no es una destination.
- No publicar GTM ni una versión de contenedor manualmente: el pipeline genérico ya deriva `generate_lead` desde `gh_form_submission_accepted`; confirmar su cobertura y registrar la nueva fila.

## Normative Docs

- `.codex/skills/greenhouse-growth-forms/SKILL.md`
- `docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md`
- `docs/think/README.md`
- `docs/think/brand-visibility-landing.md`
- `docs/context/05_voz-tono-estilo.md`
- `docs/context/06_glosario-metricas.md`

## Dependencies & Impact

### Depends on

- Asset verificado: `gs://efeonce-group-greenhouse-private-assets-{staging,prod}/ebooks/surround-discovery/surround-discovery-final.pdf`.
- `src/lib/growth/forms/**`, `greenhouse_growth.form_definition`, `form_version`, `form_host_surface` y `form_asset`.
- Precedente config-driven: `TASK-1375` y la entrada `efeonce-web-agentica-ebook` de `scripts/growth/ebook-forms.registry.ts`.

### Blocks / Impacts

- Desbloquea el `<greenhouse-form>` de `TASK-1387`; la landing no debe inventar un `form_key` ni publicar HTML de formulario local.
- Añade un nuevo lead magnet de Think y una fila gobernada del tracking plan; no altera los formularios existentes.

### Files owned

- `scripts/growth/ebook-forms.registry.ts`
- `docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md`
- `docs/reference/ebook-lead-magnet-playbook.md` si el inventario/estado requiere delta.
- `docs/tasks/**`, `Handoff.md` y `changelog.md` sólo para cierre y rollout real.

## Current Repo State

### Already exists

- Publisher idempotente `pnpm growth:forms:publish-ebook -- --slug <slug> --apply` que crea surface, form asset y versión publicada desde `EBOOK_FORMS`.
- Ruta gated `GET /api/public/growth/forms/[formSlug]/asset/[handle]`, handoff `download_url` y consumer de email reusable de TASK-1375.
- Pipeline GTM genérico en producción: `gh_form_submission_accepted → generate_lead`, con `form_slug`, `form_kind` y `surface_id`.
- El bucket staging y prod ya contienen el PDF correcto con `application/pdf`.

### Gap

- Falta una entrada de configuración, publicación por ambiente, `form_key` verificado, surface de Think validada y evidencia de runtime para Surround Discovery.
- El lead magnet todavía no tiene fila en `TRACKING-PLAN.md`; por tanto no puede declararse medible ni ser consumido por una landing.

## Modular Placement Contract

- Topology impact: `public`
- Current home: `scripts/growth/ebook-forms.registry.ts` y `src/lib/growth/forms/**` dentro del runtime Greenhouse actual.
- Future candidate home: `public`
- Boundary: Growth Forms es el primitive dueño de definición, submit, asset delivery y handoff; Think sólo consume el `form_key`, `surface` y evento browser-safe.
- Server/browser split: el registry, DB, bucket y email permanecen server-only; el browser recibe sólo el render contract y `download_url` posterior a submit aceptado.
- Build impact: `none`; no se añaden SDKs ni inputs de filesystem al bundle de Think.
- Extraction blocker: la publicación depende de la DB Greenhouse, bucket privado, Turnstile y el renderer compartido; no se duplica en el host público.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `command`
- Source of truth afectado: `greenhouse_growth.form_definition`, `form_version`, `form_host_surface` y `form_asset`.
- Consumidores afectados: Think (`TASK-1387`), renderer Growth Forms, route gated, email consumer, GTM/GA4 y HubSpot follow-up futuro.
- Runtime target: `staging` y `production` (Vercel + ops-worker donde corresponda).

### Contract surface

- Contrato existente a respetar: `EBOOK_FORMS`, `publish-ebook-form.ts`, `GET/POST /api/public/growth/forms/[formSlug]`, asset route y evento `gh_form_submission_accepted`.
- Contrato nuevo o modificado: entrada `EbookFormConfig` con slug, surface, origin, objeto, copy de success card, consentimiento y bridge; instancia DB publicada derivada por el publisher.
- Backward compatibility: `compatible`; añade una instancia y no cambia ninguna versión publicada existente.
- Full API parity: la landing, un host futuro y un agente consumen el mismo render contract y primitive de submit; no hay UI-only path.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.form_definition`, `form_version`, `form_host_surface`, `form_asset`, `form_submission` y sus ledgers existentes.
- Invariantes que no se pueden romper:
  - slug humano `efeonce-surround-discovery-ebook`; `form_key` UUID estable/opaco.
  - asset: `ebooks/surround-discovery/surround-discovery-final.pdf`, `fileName` de descarga estable, tipo PDF, TTL explícito.
  - origin allowlist sólo `https://think.efeoncepro.com` para esta surface; CORS nunca se hardcodea en route code.
  - `success_behavior.kind='asset_access'`; descarga sólo luego de submission aceptada y nunca como URL pública estable.
  - los campos estándar y consentimiento se obtienen de registry; no duplicar schemas ni copy de validación.
- Tenant/space boundary: superficie pública; autorización fina por origin + slug + surface dentro de `submitForm`.
- Idempotency/concurrency: dry-run por defecto; `--apply` es idempotente; re-run sin `--force` sincroniza asset/surface sin version spam.
- Audit/outbox/history: `form_submission`, consent snapshot, outbox `submission_accepted`, asset access y attempt ledgers existentes.

### Migration, backfill and rollout

- Migration posture: `none`; schema y primitive `form_asset` ya existen.
- Default state: publicado sólo después del dry-run y la confirmación de asset/surface; flags existentes se verifican, no se agregan flags.
- Backfill plan: `N/A`; no existen submissions históricas para esta instancia.
- Rollback path: deprecar la versión/form y desactivar/remover surface por commands gobernados; no borrar el PDF ni submissions como rollback.
- External coordination: confirmar hostname Turnstile de Think, bundle `renderer-latest.js` en Think y estado real de email delivery/HubSpot antes de prometerlos en copy.

### Security and access

- Auth/access gate: author/review/publish/surface commands existentes; submit público protegido por Turnstile, corporate-email policy y rate limits.
- Sensitive data posture: nombre/email/empresa/rol son PII; encriptación, reveal con reason y telemetry sin PII se heredan del engine.
- Error contract: renderer y routes devuelven errores sanitizados; no logs de valores/captcha token, rutas internas ni bucket.
- Abuse/rate-limit posture: controles existentes del motor; verificar fail-closed con captcha faltante y origin no permitido.

### Runtime evidence

- Local checks: `pnpm growth:forms:publish-ebook -- --slug efeonce-surround-discovery-ebook` (dry-run), vitest focal de forms/asset delivery y type-check del script si cambia.
- DB/runtime checks: GET por `form_key` sin leak; `form_asset`/surface sólo se validan mediante readers o consulta autorizada.
- Integration checks: browser real Think con Turnstile+CORS, descarga gated y email de respaldo sólo si flag/runtime lo confirma.
- Reliability signals/logs: `growth.forms.submission_rejection_rate`, `growth.forms.dead_letter_count`, `growth.forms.destination_failure_rate`; revisar log del reactive consumer si se promete email.
- Production verification sequence: asset prod → dry-run → publish prod → GET contract → browser submit real → `generate_lead` realtime → asset access → revisar email/HubSpot únicamente si fueron habilitados.

### Acceptance criteria additions

- [ ] La entrada usa objetos, copy, consent y policy estándar del registry sin bifurcar el engine.
- [ ] Dry-run y `--apply` devuelven el `form_key` y la surface correctos; re-run idempotente no publica versión nueva.
- [ ] El PDF sigue privado; sin submit aceptado no existe descarga recuperable.
- [ ] La fila de `TRACKING-PLAN.md` declara surface, `gh_form_submission_accepted → generate_lead` y estado real de tagging.
- [ ] CORS, Turnstile, corporate-email, no-leak y la descarga se verifican en browser real antes de desbloquear live.

### Capability Definition of Done — Full API Parity gate

- [ ] La capability ya existe y se reutiliza: commands/readers del engine, asset route y renderer; no nace un endpoint o submit local.
- [ ] La landing es un consumer de `form_key` y el mismo contract puede usarlo cualquier host/Nexa/automatización autorizada.
- [ ] Parity check = SÍ; el lead magnet sigue siendo un primitive gobernado, no un botón/archivo aislado.

<!-- ZONE 2 — PLAN MODE -->

## Plan

### Audit

- 2026-07-12 — Publicación completada por el publisher gobernado: `form_key`
  `e8d2bfcc-c4fe-4396-8f3b-08f5ac190409`, surface
  `fhsf-surround-discovery-ebook`, slug
  `efeonce-surround-discovery-ebook`. Un segundo `--apply` confirmó que no se
  publica una versión nueva cuando la instancia ya está sincronizada.
- 2026-07-12 — Asset privado confirmado en staging y producción con object
  `ebooks/surround-discovery/surround-discovery-final.pdf` (PDF, 24,605,096
  bytes, mismo checksum). El GET público entregó sólo el contrato browser-safe:
  `fullName`, `email`, `company`, `role` y Turnstile invisible required; el
  scan de campos sensibles no encontró portal/mapping/bucket/secret.
- 2026-07-12 — Preflight contra submit respondió `204`, con
  `Access-Control-Allow-Origin: https://think.efeoncepro.com` y
  `POST, OPTIONS`. No se envió PII ni se simuló Turnstile: el submit real debe
  ocurrir desde Think desplegado.
- 2026-07-12 — Se publicó `fver-00476c2f-ddd1-4c6d-8c8d-4df864d524fa` (v2), sin cambiar el `form_key`, asset ni surface. La `success_card` ahora declara el enlace de respaldo por correo. Verificado en el contract público: `asset_access`, template tokenizado y `supportingNote`. El consumer reusable `growth_ebook_delivery_from_submission`, `GROWTH_EBOOK_EMAIL_DELIVERY_ENABLED=true` y el Scheduler `ops-reactive-growth` (dominio `growth`, cada 5 min) están activos en `ops-worker-00480-lhj`; todavía falta el submit humano que pruebe entrega real de correo, descarga y analítica.
- 2026-07-12 — QA release audit: `BLOCK` sólo para cierre/live, no para el código/configuración. La ruta pública, version v2, flag, worker y scheduler están verificados; Think aún no está desplegado con el dock actualizado y no se puede validar Turnstile, correo ni `generate_lead` sin un submit humano real.
- 2026-07-12 — Rollout de Think aplicado desde `main`: commit `3a52256160a9aa808e45a1dc15e44fcfc2794356`, deployment Vercel `dpl_Cw5AExrqsyFxViPtUFHUSGrVEqPd` `Ready` y `https://think.efeoncepro.com/seo-surround-discovery` sirviendo ese SHA. El verifier productivo comprobó 1440, 390 y reduced-motion sin errores de consola ni overflow; no envió PII ni resolvió Turnstile, por lo que descarga, correo y `generate_lead` siguen pendientes de un submit humano.

- Supuesto confirmado: `scripts/growth/ebook-forms.registry.ts` y
  `scripts/growth/publish-ebook-form.ts` ya materializan el ciclo completo
  idempotente usado por `efeonce-web-agentica-ebook`; TASK-1386 sólo añade una
  configuración al registry y usa ese publisher.
- Supuesto confirmado: la entrega usa `kind=asset_access` con
  `assetDownload.downloadPathTemplate`; la landing sólo recibe el
  `download_url` browser-safe después de `gh_form_submission_accepted`.
- Supuesto confirmado: `think.efeoncepro.com` es una surface existente de
  Growth Forms y el pipeline GTM genérico traduce
  `gh_form_submission_accepted` a `generate_lead`; no se crea tag por ebook.
- Riesgo de rollout: la evidencia de navegador real requiere que Think tenga el
  embed de TASK-1387 y que Turnstile acepte el host. No se declarará live hasta
  completar ese smoke.
- Branch/worktree: el checkout compartido ya está en `develop`; por objetivo
  del operador no se cambia de rama, no se crea worktree y no se hace push.
  Se preserva el WIP ajeno y sólo se tocan los paths declarados de esta task.
- Subagentes: `sequential`; registry → publicación → smoke → consumer Think
  son dependientes y comparten el contrato de una misma instancia.

### Slices

1. Añadir `efeonce-surround-discovery-ebook` al registry, reutilizando fields,
   validation, Turnstile, policy, success card y publisher existentes; registrar
   la fila del form en el tracking plan.
2. Verificar el asset privado en staging y production y ejecutar el publisher
   idempotente primero en dry-run y luego por ambiente con `--apply`; registrar
   `form_key` y `surface_id` obtenidos sin exponer configuración de destino.
3. Validar contrato público por `form_key` y slug, CORS/preflight, límites
   fail-closed de captcha y la telemetría genérica sin PII. La prueba de submit
   real queda coordinada con el embed Think de TASK-1387.
4. Entregar a TASK-1387 el `form_key`, `surface_id` y el contrato de
   `download_url`; después de su embed, completar browser smoke, descarga
   tokenizada y `generate_lead` antes de cualquier declaración live.

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Configuración editorial y dry-run

- Añadir `efeonce-surround-discovery-ebook` al registry con nombre, purpose, asset, success card, bridge al grader, consentimiento y origin Think.
- Usar copy que describa el método sin prometer ranking, resultados ni email si la evidencia no lo confirma.
- Ejecutar publisher sin `--apply`; resolver cualquier drift de objeto/slug/surface antes de mutar datos.

### Slice 2 — Publicación y contrato público

- Publicar en staging y producción con el publisher gobernado; capturar `form_key` estable y surface para TASK-1387.
- Verificar render contract por `form_key`, policy de corporate email, captcha declarada y ausencia de secretos/mapping.
- Registrar el lead magnet en el tracking plan sin crear un tag por formulario.

### Slice 3 — Entrega y cierre operativo

- Ejecutar submit controlado desde la surface real; comprobar CORS, Turnstile, accepted handoff y descarga gated.
- Verificar el estado real de email de respaldo y HubSpot: si están OFF/no configurados, ajustar copy/documentar `rollout pendiente`; no simular éxito.
- Documentar el form key, evidence, flags/runtime y cualquier pendiente en handoff de cierre.

## Out of Scope

- Ruta, layout, SEO, copy de landing y microinteracciones de Think (TASK-1387).
- Cambios de schema, renderer, asset delivery route, CORS engine o tags GTM genéricos ya existentes.
- Crear un HubSpot destination si no existe el mapeo/product decision aprobado; es follow-up explícito, no condición para descarga on-screen.

## Detailed Spec

La configuración debe reflejar el ebook real: **Surround Discovery™** es visibilidad en SEO, AEO, video, social y marketplaces, operada por S⁴ (`SENSE → SHAPE → SURFACE → SOLVE`). `SOLVE` no se presenta como metodología independiente. El success card confirma la descarga, explica recuperación y ofrece un único puente al AI Visibility Grader; no intenta vender una reunión antes de entregar el valor prometido.

## Rollout Plan & Risk Matrix

| Riesgo | Mitigación | Gate |
| --- | --- | --- |
| El form apunta a un objeto equivocado o no existe en producción | Verificar URI y size antes de publicar; dry-run por ambiente | Asset path + GET gated posterior |
| Host Think queda sin CORS/Turnstile | Surface data + hostname antes del browser smoke | Submit real, no curl aislado |
| Copy promete email no activo | Confirmar consumer/flag/runtime antes de publicar | Success copy honesto |
| Version spam / asset drift | Publisher idempotente; `--force` sólo para cambios intencionales | Re-run controlado |

- Rollback path: deprecar/desactivar instancia por commands gobernados; revertir únicamente el registry si la publicación no llegó a prod.
- External coordination: Turnstile y, si se habilita, ops-worker para email/HubSpot.

## Verification

- `pnpm growth:forms:publish-ebook -- --slug efeonce-surround-discovery-ebook`
- Publicación aplicada por ambiente + GET render contract por `form_key`.
- Browser smoke desde `https://think.efeoncepro.com/<ruta-final>` con submit real, captura de `generate_lead` y descarga gated.
- `pnpm docs:closure-check` y actualización del tracking plan/handoff según evidencia.

<!-- ZONE 4 — ACCEPTANCE & HANDOFF -->

## Acceptance Criteria

- [x] El form `efeonce-surround-discovery-ebook` está registrado en el publisher y puede dry-run sin mutar.
- [x] Staging y producción poseen el asset privado, form publicado, surface Think autorizada y `form_key` verificable.
- [ ] La descarga sólo se concede a una submission aceptada; no hay URL pública estable del PDF.
- [x] El tracking plan describe el evento de lead y el estado de tagging real.
- [x] El handoff registra la evidencia de browser/rollout y separa email/HubSpot pendiente de la descarga on-screen aún no ejercitada.

## Handoff Notes

- Entregar a TASK-1387: `form_key`, `surface`, route gated esperada, copy/flags confirmados y evidencia de CORS/Turnstile.
- No iniciar implementación visual si el contrato no está publicado o la descarga no tiene evidencia real.

## Closing Protocol

1. Registrar `form_key`, surface, ambiente y evidencia de submit/asset access en la task y Handoff.md.
2. Actualizar `TRACKING-PLAN.md`, `docs/reference/ebook-lead-magnet-playbook.md` si cambia el inventario y `changelog.md` sólo si el lead magnet queda disponible.
3. Ejecutar `pnpm docs:closure-check`, verificar flags/runtime involucrados y mover la task a `complete/` únicamente tras smoke real productivo.
