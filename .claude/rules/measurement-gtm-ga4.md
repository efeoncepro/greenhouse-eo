---
paths:
  - "src/lib/growth/gtm/**"
  - "src/lib/growth/ga4/**"
  - "src/lib/growth/measurement/**"
  - "src/growth-measurement-context/**"
  - "scripts/measurement/**"
  - "scripts/gtm/**"
  - ".github/workflows/gtm-drift.yml"
  - "docs/reference/measurement-gtm-ga4/*container-snapshot.json"
---

# Medición / tagging GTM + GA4 — invariantes (auto-load por path)

Al tocar `src/lib/growth/{gtm,ga4,measurement}/**`, `src/growth-measurement-context/**`, `scripts/measurement/**`, `scripts/gtm/**` o los snapshots de containers (eventos `gh_*`, tags/triggers/variables, custom dimensions, key events), carga la **skill `greenhouse-gtm-ga4-operator`** + el reference canónico **`docs/reference/measurement-gtm-ga4/`** (README + `01`-`10` + `TRACKING-PLAN.md` + `LEARNINGS.md`). Naming/estrategia: `growth-marketing-cro`.

Reglas duras (detalle en la skill + doc `04`/`05`):

- **NUNCA** publicar a `GTM-NGHPGRLZ` sin preview + confirmación humana explícita (acción gobernada `propose → confirm → execute`; build en workspace es seguro, publish es la única mutación live).
- **NUNCA** hand-writear el bloque `gaawe` de memoria: usar doc `05` (`measurementIdOverride` con el G-ID, NO `measurementId` tagReference).
- **NUNCA** marcar como key event un click/scroll/view/paso de funnel — solo conversiones reales de negocio (`generate_lead`/`sign_up`/`purchase`; criterio doc `04 §3b`; GA4 limita a 30/propiedad).
- **NUNCA** taggear el contenedor equivocado (web: `GTM-NGHPGRLZ` 218104216; servidor CAPI: `usageContext=server`, inventariar `GTM-K2X4ZTTK`; `GTM-NS3RNNCD` es duplicado web huérfano) ni PII/valores crudos en parámetros (allowlist en `contracts.ts`).
- **NUNCA** pegar un token/secreto literal en un parámetro GTM nuevo (web o servidor): el snapshot lo tapa en git, pero queda visible en el container. Pendiente conocido (no ejecutado por decisión del operador): token Meta CAPI literal en el tag del servidor → rotar + Secret Manager vía «Firestore Lookup» del sGTM.
- **SIEMPRE** tras cualquier publish (script o UI de GTM, web o servidor) → `pnpm gtm:snapshot` y commitear **ambos** JSON (`container-snapshot.json` web + `server-container-snapshot.json` sGTM) con el cambio. `pnpm gtm:snapshot --check` = drift (exit 1); `.github/workflows/gtm-drift.yml` lo corre diario 12:00 UTC desde `main` (WIF directa, SA `greenhouse-gtm-publisher`, sólo lectura; activo tras el próximo release). Si falla: cambio intencional → regenerar y commitear; no intencional → revertir en GTM. Nunca editar el JSON a mano.
- **SIEMPRE** un evento genérico + parámetro de identidad (`form_slug`/`cta_id`), NO un tag por superficie; y registrar el form/CTA en `TRACKING-PLAN.md`.
- **SIEMPRE que se sume un host/sitio nuevo** (subdominio, Astro/WP, microsite) → instalar el tag GA4 (snippet `GTM-NGHPGRLZ` + GA4 Config gateado por hostname si no hay otra fuente de page_view), **misma propiedad `486264460`**, registrar en Tracking Engine §19.5, verificar sin doble conteo. Un host sin tag = superficie incompleta (mandato §19.2). Cross-repo = rama+PR.
- **Coordenadas:** GTM `GTM-NGHPGRLZ` (account `6291647045`, container `218104216`) · GA4 propiedad `486264460` / `G-KYPPY57M14` · hosts medidos: `efeoncepro.com` + `think.efeoncepro.com` (misma propiedad).

- **Meta CAPI:** cargar docs `08` y `09` (HubSpot categorías/evnid) + ADR `GREENHOUSE_META_CAPI_SERVER_GTM_DECISION_V1.md`. Recuperar Server existente antes de crear otro; Pixel web no instala CAPI. Lead sale de aceptación comercial persistida a ingreso validado sGTM, no de clic/submit frontend.
- **Servidor:** consentimiento Meta explícito, token sólo servidor, sin PII/hash en eventos GA4 ordinarios/dataLayer (Google UPD dedicado es la excepción gobernada, 08 §4.2), exports redactados, nombre/ID estables y readback Server/dedupe en Meta. Snapshot web y GA4 smoke no certifican CAPI; server publish requiere preview + aprobación.

- **Matching vigente:** canon `10-growth-lead-matching-runtime.md`; Meta Lead backend único,
  Client31 autenticado y forwarding restringido a GA4 Client. Google user_data MP sin events
  no duplica generate_lead. No reactivar triggers12/17 retirados como fallback.
- **Alta de fuentes:** policy server-only publicada por fuente/versión/surface/origen y mapping
  tipado; GA4 genérico no autoriza matching. API/panel/CLI comparten contrato, permisos y
  comandos. Usar `pnpm --silent growth:measurement discover|validate|apply|verify`; alta
  compatible por datos, sin release/publish GTM. Cambio de contrato/host/destino requiere su
  cambio gobernado. Canon: `GREENHOUSE_GROWTH_MEASUREMENT_POLICY_DECISION_V1.md` + manual. No
  reintroducir listas de slugs ni editar SQL; validar y verificar cada mutación con recibo.
- **Evidencia:** http_accepted/Processed no prueban atribución, match quality o serving; primera
  conversión real consentida post-flip sigue pendiente. No crear negocio/CRM sintético para QA.
