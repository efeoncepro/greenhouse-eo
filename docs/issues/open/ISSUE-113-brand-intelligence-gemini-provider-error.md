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

## Pendiente (raíz de Gemini)

- **Arreglar la credencial/config de Vertex** del provider Gemini en el ops-worker (y ADC local), o
- decidir si Gemini se **desprioriza/deshabilita** para brand-intelligence (reordenar `BRAND_INTELLIGENCE_PROVIDER_IDS` o gate por flag) mientras Vertex no esté sano — hoy se paga la latencia de intentar Gemini primero en cada lectura antes de caer a OpenAI.
- Confirmar el error exacto de Vertex (auth vs modelo vs región) revisando Sentry (`domain=growth`, `source=growth_ai_visibility_brand_intelligence`, `provider=gemini`).

## Verificación de cierre

- [ ] Gemini `extract()` resuelve OK (o queda deshabilitado/despriorizado con decisión documentada).
- [ ] Smoke E2E de `/aeo-2/` en staging: submit → categoría resuelta → run encolado → informe → correo con PDF → contacto HubSpot único.
