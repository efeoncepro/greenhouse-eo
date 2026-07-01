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

## AEO WordPress Bridge

La landing publica `/aeo-2/` usa temporalmente un host bridge HTML con Turnstile invisible. Desde TASK-1294 el renderer portable `<greenhouse-form>` ya puede emitir `captchaToken`, desde TASK-1296 AEO declara `security.captcha` en el contrato publico, y desde TASK-1298 pre-live parity la version publicada vigente es v5 con placeholders es-CL alineados al bridge. Aun asi esta landing sigue en bridge hasta una migracion WordPress gobernada con backup Elementor, Kinsta purge y Playwright/GVC desktop/mobile 390.

Identificadores vigentes:

- WordPress page: `postId=250265`, slug `aeo-2`, status `publish`.
- Elementor widget host: `convers`, classes `gh-aeo-form-card gh-aeo-growth-form-host`.
- Form slug: `efeonce-aeo-diagnostic`.
- **Form key (identidad estable, TASK-1297):** `b120566a-dd1a-43c8-956a-4e0121e805b8` (AEO). El del AI Visibility Grader es `69cd5269-5f97-4d32-99c4-0b23f41aa2f5` (distinto). Embed/resolución preferida por `form-key`; `slug` queda como alias backward-compatible.
- Form definition/current published version: `fdef-efeonce-aeo-diagnostic` / `fver-70c365c1-ea3b-4e84-b4b3-4fd852f951f4` (v5, expone `copy.submit="Solicitar diagnóstico gratis →"`, placeholders `Selecciona país` / `Selecciona tamaño` y `security.captcha`; v4 `fver-dbdd6a02-7e89-4d65-b29e-7228b7475a94` deprecada 2026-06-30 por TASK-1298 pre-live parity; v3 `fver-9507f6a7-431d-4215-a699-9c713328b69b` deprecada 2026-06-30 por TASK-1297; v2 `fver-bc5a1cfe-76eb-4658-9fe9-ab0c8fb0a657` y v1 `fver-efeonce-aeo-diagnostic-v1` deprecadas).
- Host surface: `fhsf-efeonce-aeo-diagnostic`.
- API base: `https://greenhouse.efeoncepro.com`.
- Turnstile site key in WordPress: `0x4AAAAAADqwX2R7v-k9pItv`.
- HubSpot secure-submit destination: portal `48713323`, form GUID `8649e76c-8b01-41f3-9b0c-5713d7b4dba6` (`AEO - Lead Form`).

Field contract:

| Public field | Greenhouse persistence | HubSpot mapping |
| --- | --- | --- |
| `firstName` | yes | `firstname` |
| `email` | yes; `validator=corporate_email` | `email` |
| `brandWebsite` | yes | not mapped until HubSpot form/property exists |
| `country` | yes | `pais_gh` |
| `companySize` | yes | `tamano_de_la_empresa` |
| `mainCompetitor` | yes | `marca_de_competencia` |

Runtime guardrails:

- WordPress must never know HubSpot mapping, portal credentials, destination secrets or Turnstile secret.
- The AEO form requires corporate email: the published field uses `validator=corporate_email` and `validation_schema.emailPolicy={mode:"block_field",field:"email"}`. Gmail/free/disposable addresses must be rejected before accepted submission.
- The current AEO published form declares `ui_policy_json.security.captcha` with public Turnstile site key `0x4AAAAAADqwX2R7v-k9pItv`, `required:true`, `mode:"invisible"` and `execution:"submit"`. Production public `GET` now serializes `render_contract.security.captcha`; public `POST` remains fail-closed without a token.
- The temporary WordPress bridge must mirror the Growth Forms reactive validation contract: field-level errors close to the input, `aria-invalid`/`aria-describedby`, debounced `/verify-email` for corporate email, and no `/submit` while field validation blocks. Do not regress to status-only/global validation.
- A submit without Turnstile token must fail as `403 captcha_failed/missing_token` and must not create a lead.
- The browser origin must pass CORS before the public API response is consumable, but CORS does not replace form/surface/origin validation in the engine.
- Do not revert this surface to the old `ai-visibility-grader` slug or a meeting-link fallback unless explicitly rolling back.

Contrato renderer desde TASK-1294:

- `render_contract.security.captcha` puede declarar `provider:"turnstile"`, `mode:"invisible"`, `execution:"submit"`, `required:true` y `siteKey` publico.
- `<greenhouse-form>` carga `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit`, renderiza un widget invisible idempotente y envia `captchaToken` en el body de `POST /submit`.
- El server sigue siendo autoridad: `TURNSTILE_SECRET` nunca sale al browser y `submitForm` verifica/falla cerrado.

Cuando se ejecute la migracion AEO:

- migrar WordPress de vuelta a `<greenhouse-form form-key="b120566a-dd1a-43c8-956a-4e0121e805b8" surface="fhsf-efeonce-aeo-diagnostic" locale="es-CL" color-scheme="light" appearance="bare">`;
- conservar el mismo backend contract y surface;
- no mover mapping HubSpot ni consent policy a WordPress.
- no ejecutar el cutover mientras `pnpm codex:task-hook TASK-1298 --develop` siga bloqueando por `live_cutover_pending_after_pre_live_parity`; primero debe existir evidencia pre-save y post-save de frames desktop/mobile 390, `heroans` estable y fallback/Turnstile/email/dataLayer verificados.
