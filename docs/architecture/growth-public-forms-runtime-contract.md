# Growth Public Forms Runtime Contract

> **Tipo:** arquitectura vigente
> **Creado:** 2026-06-30
> **Dominio:** Growth / Public Forms / Public Site
> **Doc base:** [GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md](./GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md)

Este documento captura contratos runtime vigentes que no deben crecer como deltas dentro del monolito de arquitectura base.

## Public Host CORS

La autorizacion de surface por `origin_allowlist_json` no reemplaza el contrato CORS del navegador. Para hosts browser cross-origin, el motor debe cumplir ambas capas:

- **Transporte browser:** las rutas publicas que consume el browser (`GET /api/public/growth/forms/{slug}`, `POST /api/public/growth/forms/{slug}/submit`, `POST /api/public/growth/forms/{slug}/verify-email` y sus `OPTIONS`) reflejan `Access-Control-Allow-Origin` solo para origins publicos aprobados.
- **Autoridad del engine:** form publicado, surface activa, slug permitido, `originAllowed`, consent, honeypot, Turnstile, server validation, rate-limit y destination plan server-only siguen siendo obligatorios.
- **Secreto y mapping:** el browser nunca recibe destination mapping, portalId, el **HubSpot destination form GUID** (`form_destination.mapping_json.formGuid`), HubSpot property names ni secretos. (Desde TASK-1297, el render contract SÍ expone `form.formKey`: esa es la identidad **pública/opaca de Growth Forms** — NO el HubSpot GUID. Son cosas distintas: `formKey` ≠ HubSpot `formGuid`.)

### CORS gobernado — sin literal hardcodeado (TASK-1335)

Desde TASK-1335 el transporte CORS **no** tiene un set de origins hardcodeado en el route helper.
El resolver (`src/app/api/public/growth/forms/cors.ts`) computa el allowlist de transporte como la
**UNIÓN de `origin_allowlist_json` de las surfaces `active`** de `greenhouse_growth.form_host_surface`
(SoT único = la DB). Consecuencias:

- **Agregar/quitar un origin permitido = cambio de DATA (una fila en la DB), NUNCA de código.** Sumar
  un origin a una surface `active` lo mete automáticamente en la unión de transporte. Esto mata el drift
  entre el transporte CORS y la autoridad real del motor (que era el bug: `GET` respondía `200` pero el
  browser no recibía ACAO).
- **Cache in-memory (TTL ~90s) + stale-while-revalidate + stale-on-error.** El hot path público no
  bloquea en la DB por-request; ante DB caída se sirve el last-known-good. Cold start + DB no disponible
  → unión vacía (fail-closed) — pero en ese instante el render/submit ya están rotos igual (necesitan la
  DB), así que degradar a sin-ACAO es honesto, no una regresión nueva.
- **Invariante de fallo:** fail-CLOSED para el origin desconocido (unknown → sin ACAO); fail-SAFE para
  el data source (cache last-known-good, nunca unión vacía por un blip de DB).
- **El transporte es surface-agnóstico (unión), no surface-aware.** El preflight `OPTIONS /submit` no
  lleva `surfaceId`, así que el transporte no puede depender de una surface puntual; la autoridad fina
  por-surface (origin + slug + surface) sigue server-side en `submitForm` (doble defensa intacta). Una
  variante "surface-aware por request" rompería el preflight de TODOS los origins (incluido `/aeo-2`).
- **Filtro `.local` en producción:** pseudo-origins gobernados en la DB (`shadow.local`) no reciben ACAO
  bajo `NODE_ENV=production` (inocuo; un browser real nunca los tiene como origin).

Origins gobernados vigentes (derivados de la unión de surfaces `active`, NO de un literal):

- `https://efeoncepro.com`, `https://www.efeoncepro.com` — surfaces `fhsf-efeonce-aeo-diagnostic` (`/aeo-2`) + `fhsf-efeonce-lead-gen-web`.
- `https://think.efeoncepro.com` — surface `fhsf-ai-visibility-grader` (TASK-1335, habilita el embed del grader en Think).
- `https://greenhouse-eo-env-staging-efeonce-7670142f.vercel.app`, `https://shadow.local` — surface `fhsf-efeonce-lead-gen-web` (staging/dev; `.local` filtrado en prod).

Smoke live de referencia del primer rollout WordPress AEO:

- `OPTIONS /api/public/growth/forms/efeonce-aeo-diagnostic/submit` -> 204 con ACAO.
- `GET /api/public/growth/forms/efeonce-aeo-diagnostic?surfaceId=fhsf-efeonce-aeo-diagnostic` -> 200 con ACAO y `render_contract.security.captcha`.
- `POST /api/public/growth/forms/efeonce-aeo-diagnostic/submit` sin token -> `403 captcha_failed/missing_token` con ACAO y sin persistir submission.

Deploy que introdujo CORS en produccion: `greenhouse-qbxqrrzpm`.
Deploy que serializa `security.captcha` en produccion: `greenhouse-drl142ckj`.

## AEO WordPress Renderer

La landing publica `/aeo-2/` usa el renderer portable `<greenhouse-form>` en WordPress desde el cutover gobernado de TASK-1298 (2026-07-01). El bridge HTML temporal quedo reemplazado en el widget `convers`; el submit, la validacion, Turnstile, telemetry y destinos vuelven al contrato Growth Forms.

Identificadores vigentes:

- WordPress page: `postId=250265`, slug `aeo-2`, status `publish`.
- Elementor widget host: `convers`, wrapper `.gh-aeo-growth-form-card`.
- Form slug: `efeonce-aeo-diagnostic`.
- **Form key (identidad estable, TASK-1297):** `b120566a-dd1a-43c8-956a-4e0121e805b8` (AEO). El del AI Visibility Grader es `69cd5269-5f97-4d32-99c4-0b23f41aa2f5` (distinto). Embed/resolución preferida por `form-key`; `slug` queda como alias backward-compatible.
- WordPress embed: `<greenhouse-form form-key="b120566a-dd1a-43c8-956a-4e0121e805b8" surface="fhsf-efeonce-aeo-diagnostic" locale="es-CL" color-scheme="light" appearance="bare">` + `https://greenhouse.efeoncepro.com/growth-forms/renderer-latest.js`.
- Form definition/current published version: `fdef-efeonce-aeo-diagnostic` / `fver-bfc40c59-8d95-4d38-8ae5-0da7dc4ab468` (v16, `style_variant=diagnostic_premium`, expone `copy.submit="Empezar con mi diagnóstico →"`, campo visible `fullName` label `Nombre completo` con placeholder `ej. María González`, `validation_schema.namePolicy.split_full_name`, placeholders `Selecciona tu país` / `Selecciona un rango`, `security.captcha` y `successBehavior.presentation="success_card"` con `steps=[]`, CTA `Agenda una reunión` y copy `Tu informe de visibilidad va en camino.`; v15 `fver-1139a7f7-4e62-4fb7-8e5c-be024652d217`, v14 `fver-2cc79ff4-6dcc-404e-b79b-094bd0a81e29`, v13 `fver-1f727049-6600-4d68-8089-1718b9edd54e`, v12 `fver-f933f877-c1ff-4e76-9832-2078ca64c6dd`, v7 `fver-f2f8abde-3b11-42b3-bf78-a309ef7678ad`, v6 `fver-9ec43a66-5372-45b7-829d-2c9e6381e27d`, v5 `fver-70c365c1-ea3b-4e84-b4b3-4fd852f951f4`, v4 `fver-dbdd6a02-7e89-4d65-b29e-7228b7475a94`, v3 `fver-9507f6a7-431d-4215-a699-9c713328b69b`, v2 `fver-bc5a1cfe-76eb-4658-9fe9-ab0c8fb0a657` y v1 `fver-efeonce-aeo-diagnostic-v1` deprecadas).
- Host surface: `fhsf-efeonce-aeo-diagnostic`.
- API base: `https://greenhouse.efeoncepro.com`.
- Turnstile site key in render contract: `0x4AAAAAADqwX2R7v-k9pItv`.
- HubSpot secure-submit destination: portal `48713323`, form GUID `8649e76c-8b01-41f3-9b0c-5713d7b4dba6` (`AEO - Lead Form`).

Premium modernization contract (live):

- `style_variant=diagnostic_premium` is the governed renderer path for the AEO premium pass. It keeps the look in the Growth Forms render contract + renderer tokens, not in WordPress page CSS.
- Script: `pnpm growth:forms:activate-aeo-reference-copy` dry-runs and `pnpm growth:forms:activate-aeo-reference-copy -- --apply` publishes a new AEO form version by `form_key=b120566a-dd1a-43c8-956a-4e0121e805b8` with the current reference copy. `pnpm growth:forms:activate-aeo-premium` remains the older premium-style activation helper.
- The script updates labels/placeholders/help/errors/submit/success copy, preserves fields, validation, Turnstile, destinations and policies, publishes vNext and deprecates the previous version.
- Applied production data: v16 `fver-bfc40c59-8d95-4d38-8ae5-0da7dc4ab468`.
- WordPress cutover backup meta: `_gh_backup_before_aeo_1298_premium_renderer_20260701T065707Z`.
- Live verification command: `pnpm public-website:verify-aeo-live-contract`.

## Success Card Renderer Contract

`successBehavior.presentation="success_card"` es un contrato transversal del renderer portable, no un snippet local de AEO. Cuando un form publicado lo declara, el browser debe recibir la card desde el render contract y `buildSuccessCard` la pinta dentro de `<greenhouse-form>`.

Queda transversal en `src/growth-forms-renderer/**`: la estructura `.ghf-success-card`, el mark SVG inline de celebración tipo party popper (`buildSuccessMarkGraphic`), el icono calendario para acciones `kind="schedule"`, la entrada con motion respetando `prefers-reduced-motion`, y la telemetry allowlisted sin PII.

Queda acotado a la variante premium: `style_variant=diagnostic_premium` renderiza la Success Card sin marco interno, sin línea superior, sin sombra propia y sin focus frame persistente; el host conserva la card exterior como única superficie visible. Si otra variante necesita ese tratamiento, debe promoverse a token/variant del renderer, no copiar CSS de AEO.

Queda AEO-only y temporal: los markers WordPress `gh-aeo-success-card-polish-v1`, `gh-aeo-success-card-compact-steps-v1`, `gh-aeo-success-card-recraft-popper-v1`, `gh-aeo-success-card-borderless-v1` y `gh-aeo-readiness-centered-v1` son bridge CSS live para `/aeo-2/` hasta que el bundle productivo sirva la fuente actualizada. No son patrón para otros forms.

## Tokenized Report Handoff (TASK-1336)

`successBehavior.kind="tokenized_report"` es una etiqueta de resultado cuyo comportamiento gobernado es un **handoff auto-descriptivo** hacia un reporte servido por token (el lead magnet AI/Brand Visibility). El submit aceptado NO significa reporte listo: entrega al host el punto de partida para hacer poll y navegar cuando esté `ready`, sin que el host hardcodee la ruta ni conozca el dominio del grader (Full API Parity).

Contrato (SoT `successBehaviorSchema` en `src/lib/growth/forms/contracts.ts`, espejo `RendererSuccessBehavior`):

- **Config (render contract, browser-safe):** `successBehavior.tokenizedReport.statusPathTemplate` — una ruta **relativa** acotada a la superficie pública (`/api/public/...`), con el placeholder `{handle}`. El schema es el leak boundary: valida que sea relativa bajo `/api/public/`, no protocol-relative y con `{handle}` (nunca una URL absoluta ni un endpoint privado). Para el grader su valor canónico es `/api/public/growth/ai-visibility/run/{handle}` (status reader de TASK-1245).
- **Handoff de entrada (evento `gh_form_submission_accepted`):** al aceptar el submit, el renderer sustituye `{handle}` por el `submissionId` (ya devuelto por `/submit`, válido como handle público async-safe) y emite `run_handle` + `status_url` (absoluta contra `api.baseUrl`) en el `CustomEvent`. Son claves **escalares allowlisted** (telemetry allowlist dura); NUNCA un objeto anidado, PII, `reportToken` ni ids internos. Si el behavior no declara `tokenizedReport` (tokenized_report legacy) o no hay `submissionId`, no se emite handoff (compat).
- **Status/report (polling `GET /api/public/growth/ai-visibility/run/[handle]`):** read-only, bounded (`queued|processing|ready|in_review|unavailable|not_found`). Devuelve `reportToken` SÓLO cuando existe snapshot publicable; el host arma la URL pública del reporte con ese token (`/brand-visibility/r/<token>`). El submit NUNCA trae status/token: el run no existe todavía al aceptar.

Reglas duras: **NUNCA** hardcodear la ruta de status en el renderer genérico (viene de la config `statusPathTemplate`, self-describing). **NUNCA** meter el `reportToken` ni status en la respuesta del submit ni en el handoff (sólo aparece al hacer poll cuando `ready`). **NUNCA** publicar el handoff mutando la versión publicada in-place: `pnpm growth:forms:activate-grader-tokenized-report` (dry-run) clona → publica → deprecara, con guard de runtime.

### Delta 2026-07-05 — Think Brand Visibility production handoff (TASK-1327)

El primer rollout real de `tokenized_report` en Think confirmó que el contrato tiene dos commits
separados:

1. `POST /api/public/growth/forms/{formKey}/submit` acepta la submission, verifica Turnstile y emite
   el handoff browser-safe (`run_handle`/`status_url`).
2. El dominio del grader procesa el outbox `growth.forms.submission_accepted` por
   `growth_grader_run_from_submission` y crea `grader_lead` + `grader_run`; sólo después el status
   puede avanzar hacia `ready` + `reportToken`.

Por eso `form_destination` no es el mecanismo correcto para crear un grader run. Una versión del form
con `DESTINATIONS: []` puede ser válida para `fdef-ai-visibility-grader`: el destination entrega leads
a sistemas externos; el run es trabajo de proyección de dominio. El síntoma "submit delivered pero el
loader poll-ea para siempre" se diagnostica en este orden: network/Turnstile/CORS del submit →
`form_submission` → outbox `growth.forms.submission_accepted` → consumer reactivo → `grader_lead` /
`grader_run` → status route CORS.

La causa raíz TASK-1327 post-Turnstile fue que el consumer fallaba con `category unresolved
(node=unknown)` para una categoría pública no mapeada. Regla de arquitectura: un intake público
aceptado no puede terminar en dead-end por clasificación de dominio. La proyección debe resolver con
taxonomy/fallback grounded o degradar explícitamente y dejar evidencia recuperable.

## WordPress Ohio Host Layer

El tema Ohio es un host CSS agresivo para controles nativos. El contrato vigente para
evitar una nueva pelea por landing es una capa compartida en el child theme, no CSS
pegado en cada pagina:

- Runtime repo: `efeonce-public-site-runtime`.
- CSS gobernado: `wp-content/themes/ohio-child/assets/css/growth-forms-host.css`.
- Enqueue gobernado: `wp-content/themes/ohio-child/inc/enqueue-and-layout.php`
  (`ohio-child-growth-forms-host`, versionado por `filemtime`).
- Estado live: desplegado en Kinsta el 2026-07-01 por rollout acotado de esos dos archivos
  (backup remoto `/tmp/greenhouse-growth-forms-host-layer-20260701T103729Z`), con hashes
  repo/live sincronizados y `pnpm public-website:verify-aeo-live-contract` verde.
- Scope unico: `.eo-growth-form`, `.gh-growth-form-host`,
  `.gh-aeo-growth-form-host`, `.gh-aeo-growth-form-card` + `<greenhouse-form>`.

Responsabilidad de la capa:

- contencion (`max-width:100%`, `min-width:0`, `overflow-x`);
- default tokens seguros para hosts genericos;
- hardening scoped de `.ghf-input`, `.ghf-textarea`, `.ghf-select`,
  `.ghf-select-trigger`, `.ghf-select-list` y `.ghf-btn` frente a reglas globales
  `input/select/button` de Ohio;
- reduced-motion defensivo solo dentro del host.

### Premium select/listbox overlay contract (TASK-1343)

Los selects premium (`style_variant=diagnostic_premium` y variantes equivalentes) resuelven el
stacking del listbox dentro del renderer portable, no en la landing. Cuando el usuario abre un
select, `src/growth-forms-renderer/renderer.ts` marca el `.ghf-field` activo con
`data-overlay-open="true"`; `styles.ts` eleva `.ghf-field:focus-within`,
`.ghf-field[data-overlay-open="true"]` y `.ghf-select-list` para que el menu quede por encima de las
filas siguientes del grid, incluso dentro de cards WordPress/Ohio.

Reglas de contrato:

- el host puede proveer chrome, layout, sticky lanes o tokens, pero no debe reconstruir el listbox ni
  resolver este bug con CSS page-scoped;
- el estado activo conserva `aria-expanded`, `role="listbox"`/`role="option"` y foco de teclado;
- las opciones selected/hover usan texto oscuro (`--ghf-fg`) sobre el fondo mint/premium; no usar
  `--ghf-accent-contrast` porque puede producir blanco sobre claro;
- el gate visual de cualquier host real debe abrir al menos un dropdown y comprobar que la opcion
  superior sea el elemento bajo el punto de prueba (`elementFromPoint`), que no haya overflow
  horizontal y que reduced-motion siga degradando honestamente.

No responsabilidad de la capa:

- identidad, version, fields, validacion, condiciones, copy, Turnstile, submit,
  telemetry, HubSpot mapping o dispatch. Eso sigue en Greenhouse + renderer.

Rollout guard:

- El deploy del child theme no debe mezclar automaticamente el plugin
  `eo-elementor-widgets` salvo que el diff gobernado lo declare sincronizado o el release
  incluya explicitamente el plugin. Desde 2026-07-01 el export live y el binding incluyen
  `eo-elementor-widgets`; el reporte vigente
  `docs/operations/public-site-drift/drift-2026-07-01T10-54-46-557Z.json` muestra
  `releaseSafety.fullRepoDeploySafe=true`, `repo_pending_release=0`, `content_drift=0` y
  `live_untracked_file=0` despues de la reconciliacion acotada.
- Antes de aplicar a Kinsta, refrescar snapshot con `pnpm public-website:export-live-code`
  y verificar `pnpm public-website:diff-runtime`. Despues de aplicar, purgar Kinsta y
  correr el gate especifico de la landing; para AEO, `pnpm public-website:verify-aeo-live-contract`.

Field contract:

| Public field | Greenhouse persistence | HubSpot mapping |
| --- | --- | --- |
| `fullName` | yes; raw visible field preserved in Greenhouse | not mapped to HubSpot |
| derived `firstName` | yes; derived server-side from `fullName` when `namePolicy.mode="split_full_name"` | `firstname` |
| derived `lastName` | yes when derivable; never fabricated for one-token names | `lastname` |
| `email` | yes; `validator=corporate_email` | `email` |
| `brandWebsite` | yes | not mapped until HubSpot form/property exists |
| `country` | yes | `pais_gh` |
| `companySize` | yes | `tamano_de_la_empresa` |
| `mainCompetitor` | yes | `marca_de_competencia` |

## HubSpot Form Definition Upsert

HubSpot Forms secure-submit validates against the destination form definition. When a new
Greenhouse field is added to `form_destination.mapping_json.fieldMapping`, the HubSpot form may also
need the matching field in `fieldGroups`.

- Governed tool: `pnpm hubspot:forms:upsert-fields -- --config <json> [--apply]`.
- Implementation: `scripts/hubspot/upsert-form-fields.ts`.
- API used: HubSpot Forms API `2026-09-beta`, `PATCH /marketing/forms/2026-09-beta/{formId}`,
  scope `forms`.
- Dry-run is default. `--apply` reads the form, verifies CRM properties, creates missing properties
  only when the config includes `createProperty`, ensures `formField=true` when possible, and patches
  `fieldGroups` while preserving unrelated form settings.
- The tool does not replace Growth Forms as source of truth: after a HubSpot field addition, update
  the Greenhouse destination mapping server-side and run secure-submit smoke.
- AEO example config: `scripts/hubspot/examples/upsert-aeo-brand-website-field.json` plans
  `brandWebsite -> companies.domain` for the HubSpot destination form.

Runtime guardrails:

- WordPress must never know HubSpot mapping, portal credentials, destination secrets or Turnstile secret.
- The AEO form requires corporate email: the published field uses `validator=corporate_email` and `validation_schema.emailPolicy={mode:"block_field",field:"email"}`. Gmail/free/disposable addresses must be rejected before accepted submission.
- The AEO form captures one visible `fullName` field (`Nombre completo`). Server-side `submitForm` applies `validation_schema.namePolicy={mode:"split_full_name",sourceField:"fullName",firstNameField:"firstName",lastNameField:"lastName"}` before persistence/delivery. HubSpot receives native contact `firstname`/`lastname` from derived fields; the browser never sees this mapping.
- The current AEO published form declares `ui_policy_json.security.captcha` with public Turnstile site key `0x4AAAAAADqwX2R7v-k9pItv`, `required:true`, `mode:"invisible"` and `execution:"submit"`. Production public `GET` now serializes `render_contract.security.captcha`; public `POST` remains fail-closed without a token.
- The WordPress embed must keep validation in Growth Forms: field-level errors close to the input, `aria-invalid`/`aria-describedby`, debounced `/verify-email` for corporate email, and no `/submit` while field validation blocks. Do not regress to status-only/global validation or a landing-local submit bridge.
- A submit without Turnstile token must fail as `403 captcha_failed/missing_token` and must not create a lead.
- The browser origin must pass CORS before the public API response is consumable, but CORS does not replace form/surface/origin validation in the engine.
- Do not revert this surface to the old `ai-visibility-grader` slug or a meeting-link fallback unless explicitly rolling back.

Contrato renderer desde TASK-1294:

- `render_contract.security.captcha` puede declarar `provider:"turnstile"`, `mode:"invisible"`, `execution:"submit"`, `required:true` y `siteKey` publico.
- `<greenhouse-form>` carga `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit`, renderiza un widget invisible idempotente y envia `captchaToken` en el body de `POST /submit`.
- El server sigue siendo autoridad: `TURNSTILE_SECRET` nunca sale al browser y `submitForm` verifica/falla cerrado.

Post-cutover guardrails:

- conservar el mismo backend contract y surface;
- no mover mapping HubSpot ni consent policy a WordPress;
- no volver al bridge HTML salvo rollback explicito usando el backup meta;
- antes de declarar cambios futuros en este form, correr `pnpm public-website:verify-aeo-live-contract` y confirmar `heroans` estable.
