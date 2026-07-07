---
paths:
  - "src/lib/growth/gtm/**"
  - "src/lib/growth/ga4/**"
---

# Medición / tagging GTM + GA4 — invariantes (auto-load por path)

Al tocar `src/lib/growth/{gtm,ga4}/**` (eventos `gh_*`, tags/triggers/variables, custom dimensions, key events), cargá la **skill `greenhouse-gtm-ga4-operator`** + el reference canónico **`docs/reference/measurement-gtm-ga4/`** (README + `01`-`07` + `TRACKING-PLAN.md` + `LEARNINGS.md`). Naming/estrategia: `growth-marketing-cro`.

Reglas duras (detalle en la skill + doc `04`/`05`):

- **NUNCA** publicar a `GTM-NGHPGRLZ` sin preview + confirmación humana explícita (acción gobernada `propose → confirm → execute`; build en workspace es seguro, publish es la única mutación live).
- **NUNCA** hand-writear el bloque `gaawe` de memoria: usar doc `05` (`measurementIdOverride` con el G-ID, NO `measurementId` tagReference).
- **NUNCA** marcar como key event un click/scroll/view/paso de funnel — solo conversiones reales de negocio (`generate_lead`/`sign_up`/`purchase`; criterio doc `04 §3b`; GA4 limita a 30/propiedad).
- **NUNCA** taggear el contenedor equivocado (solo `GTM-NGHPGRLZ` 218104216 dispara; `GTM-NS3RNNCD` es duplicado huérfano) ni PII/valores crudos en parámetros (allowlist en `contracts.ts`).
- **SIEMPRE** un evento genérico + parámetro de identidad (`form_slug`/`cta_id`), NO un tag por superficie; y registrar el form/CTA en `TRACKING-PLAN.md`.
- **Coordenadas:** GTM `GTM-NGHPGRLZ` (account `6291647045`, container `218104216`) · GA4 propiedad `486264460` / `G-KYPPY57M14` · hosts medidos: `efeoncepro.com` + `think.efeoncepro.com` (misma propiedad).
