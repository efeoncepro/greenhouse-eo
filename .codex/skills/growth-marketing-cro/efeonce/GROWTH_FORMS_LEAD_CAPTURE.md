# Growth Forms & Lead Capture (runtime real)

> Fuente: `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
> + `docs/architecture/growth/growth-public-forms-runtime-contract.md`. Código:
> `src/lib/growth/forms/**` y `src/lib/growth/public-submission/**`.
> **El ledger de submissions es la verdad de conversión autoritativa** (tracking engine
> lo trata así — ver `MEASUREMENT_IN_GREENHOUSE.md`).

## Qué es

El motor de formularios públicos de Greenhouse: renderer portable, validación,
compilación de políticas, submit gobernado a HubSpot, protección anti-abuso. Es la
superficie de captura de leads del dominio `growth` (con el grader como caso estrella).

## Piezas reales (código)

- **Core:** `forms/commands.ts`, `contracts.ts`, `readers.ts`, `store.ts`,
  `dispatch.ts`, `policy-compiler.ts`, `embed-key.ts`, `flags.ts`.
- **Validación:** `forms/validators/`.
- **Submit a HubSpot:** `forms/destinations/hubspot/adapter.ts` (+ index, tests).
- **Gate de email corporativo:** `forms/email-verification/` (`email-domain-data.ts`,
  `comprehensive-free-domains.ts`).
- **PII / Ley 21.719:** `forms/pii/boundary.ts`, `pii/types.ts`.
- **Anti-abuso / captcha:** `public-submission/captcha.ts` (Turnstile),
  `public-submission/abuse-guard.ts`.
- **Rutas:** `api/public/growth/forms/[formSlug]`, `.../forms/catalog`; admin
  `api/admin/growth/forms/{dispatch,[formId],submissions,surfaces}`.

## Cómo aplicar la skill de CRO aquí

- **Form CRO (`../modules/03 §6`):** mínimo de campos (4→3 ≈ +50%), pide solo lo que
  usarás hoy, autofill/máscaras/validación inline no agresiva, micro-copy de privacidad.
  El **gate de email corporativo** es una fricción deliberada: úsalo solo cuando el
  negocio lo requiere (calidad de lead), no como default — mide su costo en conversión.
- **Confianza:** trust signals junto al form; nada de dark patterns (opt-out oculto,
  casillas pre-marcadas → `../ANTIPATTERNS.md`).
- **Medición:** cada submit es un evento de conversión canónico; instrúmentalo en el
  tracking plan (`../modules/07`) y trátalo como verdad de conversión (no lo dupliques
  en otra fuente).
- **Privacidad por diseño:** respeta `pii/boundary.ts` y la base legal (Ley 21.719 en
  Chile). No captures PII sin consentimiento ni la loggees cruda.

## Reglas de integración (repo)

- **Escritura a HubSpot** vía el adapter canónico (`destinations/hubspot/adapter.ts`) y
  el cliente in-app directo — **no** agregar un endpoint al bridge Cloud Run legacy
  (memoria del repo: HubSpot write path = in-app directo). Al tocar esto, carga
  `hubspot-greenhouse-bridge` y `greenhouse-growth-forms`.
- **Turnstile / captcha:** flujo por `public-submission/captcha.ts`; no reinventes
  protección anti-abuso por formulario.
- **Implementación de UI** del form → skill `forms-ux` + `greenhouse-growth-forms` + GVC.
