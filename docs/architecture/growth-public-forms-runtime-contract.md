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
- **Secreto y mapping:** el browser nunca recibe destination mapping, portalId, formGuid, HubSpot property names ni secretos.

Allowlist productivo vigente:

- `https://efeoncepro.com`
- `https://www.efeoncepro.com`

Smoke live de referencia del primer rollout WordPress AEO:

- `OPTIONS /api/public/growth/forms/efeonce-aeo-diagnostic/submit` -> 204 con ACAO.
- `GET /api/public/growth/forms/efeonce-aeo-diagnostic?surfaceId=fhsf-efeonce-aeo-diagnostic` -> 200 con ACAO.
- `POST /api/public/growth/forms/efeonce-aeo-diagnostic/submit` sin token -> `403 captcha_failed/missing_token` con ACAO y sin persistir submission.

Deploy que introdujo CORS en produccion: `greenhouse-qbxqrrzpm`.

## AEO WordPress Bridge

La landing publica `/aeo-2/` usa temporalmente un host bridge HTML con Turnstile invisible porque el renderer portable `<greenhouse-form>` aun no emite `captchaToken`.

Identificadores vigentes:

- WordPress page: `postId=250265`, slug `aeo-2`, status `publish`.
- Elementor widget host: `convers`, classes `gh-aeo-form-card gh-aeo-growth-form-host`.
- Form slug: `efeonce-aeo-diagnostic`.
- Form definition/current published version: `fdef-efeonce-aeo-diagnostic` / `fver-bc5a1cfe-76eb-4658-9fe9-ab0c8fb0a657` (v2; v1 `fver-efeonce-aeo-diagnostic-v1` deprecated 2026-06-30).
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
- A submit without Turnstile token must fail as `403 captcha_failed/missing_token` and must not create a lead.
- The browser origin must pass CORS before the public API response is consumable, but CORS does not replace form/surface/origin validation in the engine.
- Do not revert this surface to the old `ai-visibility-grader` slug or a meeting-link fallback unless explicitly rolling back.

Cuando el renderer soporte Turnstile:

- migrar WordPress de vuelta a `<greenhouse-form form="efeonce-aeo-diagnostic" surface="fhsf-efeonce-aeo-diagnostic" locale="es-CL">`;
- conservar el mismo backend contract y surface;
- no mover mapping HubSpot ni consent policy a WordPress.
