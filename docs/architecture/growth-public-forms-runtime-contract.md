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

Allowlist productivo vigente:

- `https://efeoncepro.com`
- `https://www.efeoncepro.com`

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
- Form definition/current published version: `fdef-efeonce-aeo-diagnostic` / `fver-9ec43a66-5372-45b7-829d-2c9e6381e27d` (v6, `style_variant=diagnostic_premium`, expone `copy.submit="Solicitar diagnóstico gratis →"`, placeholders `Selecciona país` / `Selecciona tamaño`, helper/error/success copy premium y `security.captcha`; v5 `fver-70c365c1-ea3b-4e84-b4b3-4fd852f951f4` deprecada 2026-07-01; v4 `fver-dbdd6a02-7e89-4d65-b29e-7228b7475a94`, v3 `fver-9507f6a7-431d-4215-a699-9c713328b69b`, v2 `fver-bc5a1cfe-76eb-4658-9fe9-ab0c8fb0a657` y v1 `fver-efeonce-aeo-diagnostic-v1` deprecadas).
- Host surface: `fhsf-efeonce-aeo-diagnostic`.
- API base: `https://greenhouse.efeoncepro.com`.
- Turnstile site key in render contract: `0x4AAAAAADqwX2R7v-k9pItv`.
- HubSpot secure-submit destination: portal `48713323`, form GUID `8649e76c-8b01-41f3-9b0c-5713d7b4dba6` (`AEO - Lead Form`).

Premium modernization contract (live):

- `style_variant=diagnostic_premium` is the governed renderer path for the AEO premium pass. It keeps the look in the Growth Forms render contract + renderer tokens, not in WordPress page CSS.
- Script: `pnpm growth:forms:activate-aeo-premium` dry-runs and `pnpm growth:forms:activate-aeo-premium -- --apply` publishes a new AEO form version by `form_key=b120566a-dd1a-43c8-956a-4e0121e805b8`.
- The script updates labels/placeholders/help/errors/submit/success copy, preserves fields, validation, Turnstile, destinations and policies, publishes vNext and deprecates the previous version.
- Applied production data: v6 `fver-9ec43a66-5372-45b7-829d-2c9e6381e27d`.
- WordPress cutover backup meta: `_gh_backup_before_aeo_1298_premium_renderer_20260701T065707Z`.
- Live verification command: `pnpm public-website:verify-aeo-live-contract`.

## WordPress Ohio Host Layer

El tema Ohio es un host CSS agresivo para controles nativos. El contrato vigente para
evitar una nueva pelea por landing es una capa compartida en el child theme, no CSS
pegado en cada pagina:

- Runtime repo: `efeonce-public-site-runtime`.
- CSS gobernado: `wp-content/themes/ohio-child/assets/css/growth-forms-host.css`.
- Enqueue gobernado: `wp-content/themes/ohio-child/inc/enqueue-and-layout.php`
  (`ohio-child-growth-forms-host`, versionado por `filemtime`).
- Scope unico: `.eo-growth-form`, `.gh-growth-form-host`,
  `.gh-aeo-growth-form-host`, `.gh-aeo-growth-form-card` + `<greenhouse-form>`.

Responsabilidad de la capa:

- contencion (`max-width:100%`, `min-width:0`, `overflow-x`);
- default tokens seguros para hosts genericos;
- hardening scoped de `.ghf-input`, `.ghf-textarea`, `.ghf-select`,
  `.ghf-select-trigger`, `.ghf-select-list` y `.ghf-btn` frente a reglas globales
  `input/select/button` de Ohio;
- reduced-motion defensivo solo dentro del host.

No responsabilidad de la capa:

- identidad, version, fields, validacion, condiciones, copy, Turnstile, submit,
  telemetry, HubSpot mapping o dispatch. Eso sigue en Greenhouse + renderer.

Rollout guard:

- El deploy del child theme no debe mezclar automaticamente el plugin
  `eo-elementor-widgets` si produccion no lo tiene en el export live. El diff fresco
  `docs/operations/public-site-drift/drift-2026-07-01T07-32-13-512Z.json` mostro
  `eo-elementor-widgets` como `repo_extra`; por eso el rollout de esta capa debe ser
  acotado al child theme o esperar un release explicito del plugin.
- Antes de aplicar a Kinsta, refrescar snapshot con `pnpm public-website:export-live-code`
  y verificar `pnpm public-website:diff-runtime`. Despues de aplicar, purgar Kinsta y
  correr el gate especifico de la landing; para AEO, `pnpm public-website:verify-aeo-live-contract`.

Field contract:

| Public field | Greenhouse persistence | HubSpot mapping |
| --- | --- | --- |
| `firstName` | yes | `firstname` |
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
