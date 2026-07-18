---
paths:
  - "src/lib/growth/ctas/**"
  - "src/growth-cta-renderer/**"
  - "src/app/api/public/growth/ctas/**"
  - "src/app/api/admin/growth/ctas/**"
  - "src/app/(dashboard)/growth/ctas/**"
---

# Growth CTA engine — invariantes (auto-load por path)

Al tocar el motor de CTAs, cargá la **skill `greenhouse-growth-ctas`** (dominio completo: schema,
arbiter, renderer, telemetría, gobernanza, rollout) + la arquitectura
`docs/architecture/GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_ARCHITECTURE_V1.md` (§20 hard rules).

Reglas duras load-bearing (detalle en la skill): **NUNCA** arbitrar/decidir política en el browser
(el renderer recibe el resultado resuelto). **NUNCA** tratar un evento browser como conversión
(solo `server_confirmed`). **NUNCA** duplicar schema/validación/consent de Growth Forms
(`open_growth_form` monta el form gobernado). **NUNCA** editar una `cta_version` published
(versión nueva; publish atómico deprecia la anterior). **NUNCA** un selector CSS del renderer
fuera de `:is(greenhouse-cta, .ghc-scope)` (paridad preview↔público por construcción). **NUNCA**
emitir eventos/params fuera del SoT (`CTA_GTM_EVENT_NAMES`/allowlist en
`src/lib/growth/ctas/contracts.ts` + espejo renderer + TRACKING-PLAN §CTAs). La skill se
actualiza en el MISMO change set que cualquier cambio de flujo crítico (contrato de mantenimiento).
