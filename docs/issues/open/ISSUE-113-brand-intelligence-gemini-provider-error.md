# ISSUE-113 — Brand-intelligence: el provider Gemini errora (Vertex) y bloqueaba toda la lectura

> **Estado:** Open (mitigado por router fallthrough; falta arreglar Gemini de raíz)
> **Detectado:** 2026-07-02 (smoke E2E de TASK-1321 en staging)
> **Ambiente:** local + staging (ops-worker Cloud Run)
> **Severidad:** alta (bloqueaba la resolución de categoría → el grader-on-submit y toda clasificación grounded)

## Síntoma

Un submit corporativo de `/aeo-2/` en staging disparaba la projection `growth_aeo_diagnostic_grader_run_from_submission` **sin error** (`0 failed`), pero **saltaba** (skip) sin encolar run — porque la categoría nunca resolvía. El `runBrandIntelligence` devolvía `provider_error`.

## Causa raíz

`resolveConfiguredProvider` elegía el **primer provider `isConfigured()=true`** en orden cheap-first (`gemini → openai → anthropic`). **Gemini** (Vertex) se auto-declara configurado (hay GCP project) pero su `extract()` **tira error** (credencial/config Vertex rota) — verificado local y en el ops-worker. El router **NO caía al siguiente provider** cuando el `extract()` fallaba (solo cuando `isConfigured()=false`), así que devolvía `provider_error` y nunca probaba OpenAI/Anthropic, **ambos sanos**:

- OpenAI → `industry:retail` conf 0.8
- Anthropic → `industry:manufacturing` conf 0.92
- Gemini → `provider_error`

Impacto: **toda** clasificación grounded (categoría + business_model) quedaba `unknown` → runs saltados / prompts sin arquetipo. No solo `/aeo-2/`: cualquier consumidor de `runBrandIntelligence`.

## Mitigación aplicada (2026-07-02) — router resiliente

`runBrandIntelligence` ahora **itera** los providers en orden y **cae al siguiente** cuando uno no está configurado **O** su `extract()` falla **O** devuelve shape inválido. Sólo un all-providers-down real devuelve `provider_error`. Un provider caído (Gemini) ya no tumba a los sanos.

- Fix: `src/lib/growth/ai-visibility/brand-intelligence/router.ts`
- Tests: `__tests__/router-fallthrough.test.ts` (gemini-throws→openai, unconfigured, all-throw, no-signals)
- Verificado live: `resolvePublicBrandCategory('Grupo Berel')` resuelve vía OpenAI tras el error de Gemini.

## Delta 2026-07-02 (2) — el smoke reveló un 2.º provider caído: Perplexity `missing_secret`

Al investigar por qué el informe salió `insufficient_data` (run `EO-GRUN-00032`), las observaciones mostraron que **solo OpenAI produjo datos**; los otros del set `light` (`[openai, perplexity, gemini, google_ai_overview]`):

- `openai` → **succeeded** (6 respuestas reales, prompt pack `archetype-retail_ecommerce.v1`).
- `gemini` → **failed** `provider_error` (este issue, Vertex).
- `perplexity` → **skipped `missing_secret`** ← nuevo hallazgo.
- `google_ai_overview` → **skipped `no_ai_overview_block`** (legítimo: Google no mostró AIO para esas queries).

Con 1 solo provider, el gate de calidad no computa score → no hay informe → `unavailable`. **Root cause de Perplexity (patrón DUAL-LOCATION):** el flag `GROWTH_AI_VISIBILITY_PERPLEXITY_ENABLED` estaba ON en el ops-worker, y el secret `greenhouse-perplexity-api-key` existe en Secret Manager + `PERPLEXITY_API_KEY_SECRET_REF` estaba wireado en **Vercel** — pero **NO en `services/ops-worker/deploy.sh`** (declaraba OpenAI/Anthropic, nunca Perplexity). El run async corre en el ops-worker → `resolveSecret('PERPLEXITY_API_KEY')` no encontraba el ref → `missing_secret` → skip.

**Fix aplicado (2026-07-02):** `deploy.sh` ahora declara + appendea + bindea `PERPLEXITY_API_KEY_SECRET_REF=greenhouse-perplexity-api-key` (espejo de OpenAI/Anthropic; el `ensure_secret_accessor_binding` da secretAccessor a la SA del ops-worker). Toma efecto en el próximo deploy (push develop). Post-deploy: el run tendrá OpenAI + Perplexity (+ Gemini cuando se arregle Vertex) → suficiente para score + informe.

## Raíz de Gemini CONFIRMADA (2026-07-02) — billing/dunning de GCP, NO código

El error crudo de Vertex (capturado corriendo `generateStructuredGemini` directo):

```text
403 PERMISSION_DENIED: "Lightning dunning decision is deny for project: projects/183008134038"
```

**"Dunning" = cobranza.** El sistema de riesgo/facturación de Google (`Lightning`) **denegó el acceso a Vertex AI / Generative AI** del proyecto `efeonce-group`. NO es credencial ni región ni modelo — es la **cuenta de billing**:

- La cuenta `billingAccounts/013340-4C7071-668441` figura `open: true` + `billingEnabled: true` en el proyecto → **NO es suspensión total** (Cloud Run, Cloud SQL, Secret Manager, BigQuery siguen sanos).
- Es un **hold de dunning ESPECÍFICO de Generative AI** (Google gatea la IA generativa más estricto por riesgo de billing): pago vencido / tarjeta rechazada / factura impaga → `deny` solo para Vertex/Gemini.
- OpenAI + Anthropic no se afectan (usan su propia API key + billing, no el de GCP).

**Acción (operador / finanzas):** revisar la consola **GCP Billing** de la cuenta `013340-4C7071-668441` — facturas vencidas, método de pago (tarjeta vencida/rechazada), alertas de dunning. Resolver el pago desbloquea Vertex/Gemini. No hay fix de código posible.

**Mitigación vigente:** el fallthrough del router (arriba) + Perplexity wireado hacen que brand-intelligence y el grader funcionen sin Gemini (OpenAI/Anthropic/Perplexity). Opcional mientras dure el hold: **despriorizar Gemini** en `BRAND_INTELLIGENCE_PROVIDER_IDS` / requested providers para no pagar la latencia de intentarlo primero y fallar en cada lectura.

## Verificación de cierre

- [ ] Gemini `extract()` resuelve OK (o queda deshabilitado/despriorizado con decisión documentada).
- [ ] Smoke E2E de `/aeo-2/` en staging: submit → categoría resuelta → run encolado → informe → correo con PDF → contacto HubSpot único.
