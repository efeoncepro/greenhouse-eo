# AI Visibility Grader — Calibración V1 (hallazgos del spike)

> Tipo de documento: hallazgos de calibración empírica (TASK-1228)
> Status: parcial — subject-only (Efeonce); discriminación/pesos pendientes de brand-set
> Versión: V1 · Fecha: 2026-06-24
> Spec: `GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` · Task: `TASK-1228`
> Artefactos: `growth/ai-visibility/prompt-pack.v1.json` + `brand-set.v1.json` · harness `scripts/growth/ai-visibility-spike/`

## 1. Método

- **Prompt pack:** `prompt-pack.v1.json` (16 prompts es-CL, mercado Chile, categoría "marketing y diseño").
- **Sujeto:** Efeonce (`efeoncepro.com`). Brand-set comparativo aún sin completar → esta pasada es **subject-only**.
- **Providers:** OpenAI `gpt-4.1` + web_search (Responses API) · Anthropic `claude-sonnet-4-6` + web_search (Messages API). N=1.
- **Volumen:** 30 observaciones (15 runs × 2 providers), 30/30 OK. 2026-06-24.
- **Límite de muestra:** N=1, 2 providers, un mercado, un sujeto → hallazgos **direccionales**, no estadísticos. La varianza (N≥3) y la discriminación (vs competidores) quedan pendientes.

## 2. Hallazgo headline: Efeonce es invisible en descubrimiento

En los **9 prompts de categoría/consideración/comparación/local/enterprise** (los que NO nombran a Efeonce — que son los que un comprador realmente usa para descubrir proveedores), Efeonce aparece en **0/9 en ambos motores**. Los motores sí citan competidores reales (BBDO Chile, Wunderman Thompson, Doscraneos, etc.).

| Tipo de prompt | ¿Efeonce aparece? (OpenAI / Anthropic) |
|---|---|
| Descubrimiento de categoría (p01,p03) | ❌ / ❌ |
| Recomendación de proveedor (p04) | ❌ / ❌ |
| Comparación / líderes (p06,p16) | ❌ / ❌ |
| Precio / readiness (p09) | ❌ / ❌ |
| Local / enterprise (p11,p12) | ❌ / ❌ |
| **Recall de marca** (p07,p08,p10,p13,p14,p15 — nombran "Efeonce") | ✅ / ✅ (porque el prompt la nombra) |

**Lectura:** Efeonce solo "aparece" cuando el usuario ya escribió su nombre (recall), nunca en descubrimiento. Esa es exactamente la brecha AEO que el producto existe para medir y cerrar.

## 3. Hallazgos cualitativos (cuando los motores SÍ hablan de Efeonce)

- **Colisión de entidad (Entity Clarity baja):** Anthropic detecta explícitamente **dos "Efeonce"** — la agencia LATAM (`efeoncepro.com`) y un **estudio español de fotografía publicitaria (`f11.es`)**. La marca compite con un homónimo → ambigüedad de entidad real.
- **Message drift (Message Alignment bajo):** OpenAI describe a Efeonce como *"Growth Operating System"* con metodología *"Nested Loops™"*; Anthropic la describe como *"agencia de Inbound Marketing líder"*. **Narrativas divergentes entre motores** y ninguna aterriza el posicionamiento ASaaS real. ⚠️ *Verificar con el operador si "Growth Operating System / Nested Loops™" es messaging real de Efeonce o alucinación* (clasifica accuracy).
- **Trust gap:** OpenAI afirma *"No se ha encontrado evidencia pública ni reseñas independientes confiables"* sobre Efeonce. No hay señales de reputación de terceros que la IA pueda citar.
- **Citation Quality:** los prompts de categoría son ricos en citas (OpenAI hasta 26, Anthropic hasta 31) — pero esas citas van a **competidores**, no a Efeonce. En recall, citan el sitio propio + el homónimo `f11.es`.

## 4. Mapeo preliminar a las 7 dimensiones (subject-only, direccional)

| Dimensión (peso arch) | Lectura preliminar Efeonce |
|---|---|
| AI Visibility (25) | **Muy baja** — 0/9 en descubrimiento |
| Entity Clarity (15) | **Baja** — colisión con homónimo `f11.es` |
| Category Ownership (15) | **Nula** — no asociada a la categoría sin nombrarla |
| Competitive SoV (15) | **Baja** — competidores citados, Efeonce no |
| Citation Quality (15) | **Baja** — sin earned media citable |
| Message Alignment (10) | **Baja** — narrativa divergente entre motores |
| Revenue Intent Coverage (5) | **Nula** — ausente en precio/comparación/enterprise |

**Pesos:** se mantienen los del arch V1 como hipótesis. **No se recalibran aún** — la calibración de pesos requiere el contraste con el brand-set (marca fuerte vs débil vs competidores) que está pendiente.

## 5. Costo y latencia (input para cost ceiling)

- **OpenAI:** ~5-11s/run. **Anthropic:** ~17-34s/run (**3-4× más lento**) y más web searches → **Anthropic domina el costo** en modo con grounding.
- Tokens de input por run con web search: OpenAI ~17-35k, Anthropic ~20-35k.
- **Recomendación preliminar:** `light` mode público debería evitar Anthropic con web_search por costo/latencia, o limitar prompts. Cost ceiling por-run a fijar con la corrida de varianza. (Pendiente: N≥3 + medición de costo agregado.)

## 6. Hallazgos para el motor (TASK-1226/1227)

- **Extracción brand-mention NO es name-match ingenuo:** la colisión `Efeonce`↔`f11.es` haría que un match por nombre **sobrecuente**. La extracción debe **desambiguar por dominio** (`efeoncepro.com`) — hallazgo directo para el normalizer de `TASK-1227` (refuerza "preservar `unknown`/ambiguous").
- **Citations viven por-provider:** OpenAI en `output[].content[].annotations` (`url_citation`); Anthropic en content blocks (`web_search_tool_result` + citations de text blocks). No hay campo `citations` top-level uniforme → el adapter de `TASK-1226` debe parsear por-provider (ya validado en el harness).
- **Texto OpenAI:** viene en `output[]` (no en `output_text` simple) cuando hay tool calls.

## 7. Bugs/refinamientos del prompt pack (para v2)

- **p06** (`¿Qué alternativas hay a {{competitor}}...?`) está marcado `namesBrand:false` pero contiene `{{competitor}}` → corrió con el literal `{{competitor}}` (Anthropic devolvió cites=0 / respuesta degradada). **Fix v2:** gatear p06 a que exista competidor o marcarlo dependiente de competidor.

## 8. Nota de alcance: Anthropic fuera del arch V1

El arch V1 define providers OpenAI/Perplexity/Gemini. Este spike incluyó **Anthropic (Claude)** por decisión de producto (Claude entre los answer engines más usados). El run confirma que Claude es una fuente de observación válida (web search real, citas ricas) pero **más lento/caro**. **Recomendación: retroalimentar al `GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`** la decisión de si Anthropic entra al provider set V1 (ADR delta).

## 9. Pendiente para cerrar la calibración

1. **Completar `brand-set.v1.json`** (competidores, fuerte, débil, neutrales) → correr **discriminación** (Slice 3) y recalibrar pesos con evidencia comparativa.
2. **Corrida de varianza** N≥3 sobre un subset → modelo de muestreo/confianza (Slice 4).
3. **Confirmar accuracy** del messaging ("Growth OS / Nested Loops™") con el operador.
4. **Curar `golden-set.v1.json`** (inputs + expected findings) para `TASK-1227` (Slice 5).
5. **Gemini/Perplexity** cuando haya credenciales (completar el provider set arch V1).
