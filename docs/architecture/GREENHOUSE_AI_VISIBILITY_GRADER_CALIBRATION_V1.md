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
- **Message drift (Message Alignment bajo):** OpenAI describe a Efeonce como *"Growth Operating System"* con metodología *"Nested Loops™"*; Anthropic la describe como *"agencia de Inbound Marketing líder"*. **Accuracy confirmada por el operador (2026-06-24):** "Growth Operating System" y "Nested Loops™" SON messaging real de Efeonce → **OpenAI representó el posicionamiento con precisión; Claude derivó a un genérico ("agencia Inbound") que NO refleja el ASaaS real.** Es decir, el problema no es alucinación de OpenAI sino **drift/dilución en Claude** + narrativa inconsistente entre motores.
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

## 4.bis Discriminación (brand-set completo, 24 llamadas, 2026-06-24)

Corrida acotada (`ONLY_PROMPTS=p01,p03,p04,p11,p12,p16,p14`) con el set: Efeonce (subject), Revops Latam + Cebra (competidores), Ogilvy (fuerte), LATAM Airlines + Banco de Chile (controles). Marca presente en la respuesta del prompt de **categoría** (descubrimiento sin nombrar marca):

| Prompt categoría | OpenAI | Anthropic |
|---|---|---|
| p01 (¿qué agencias en Chile?) | — | **Cebra** |
| p03 (mejores agencias) | **Cebra** | — |
| p04 (recomienda proveedores) | — | — |
| p11 (mejor agencia en Santiago) | — | **Cebra** |
| p12 (enterprise aerolínea/banca) | — | LATAM Airlines, Banco de Chile* |
| p16 (líderes 2026) | — | **Cebra** |

**Hallazgos de discriminación (las dimensiones SÍ separan):**
- **Efeonce: 0/6 — invisible en descubrimiento**, confirmado contra un set comparativo.
- **Cebra: 4 apariciones** (única marca del set con SoV de categoría real) → entre tus competidores, **Cebra te está ganando la visibilidad en IA**.
- **Revops Latam: 0/6** — también invisible en descubrimiento (igual que Efeonce). El gap AEO no es solo tuyo; es del segmento, y Cebra es la excepción.
- `*` **LATAM Airlines / Banco de Chile aparecen solo en p12** — pero porque el prompt **menciona "aerolínea o banca"** (contamina el control). El control hizo su trabajo: detectó ruido del prompt, no presencia genuina. → refinamiento p12 en v2.
- **Ogilvy (fuerte): 0/6** — no apareció en prompts Chile-scoped → la referencia "fuerte" global no calibra el techo en mercado local. → v2 debe usar una **agencia fuerte LOCAL**.

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

## 9. Estado y pendiente

**Hecho:** pipeline validado (OpenAI + Anthropic); subject-only + discriminación (brand-set completo salvo weak); accuracy confirmada. Las dimensiones discriminan (Cebra vs Efeonce/Revops). Evidencia direccional, no estadística.

**Pendiente para cerrar:**
1. **Brand-set v2** (refinamientos descubiertos): agencia **fuerte LOCAL** (Ogilvy global no calibró el techo en Chile), **marca débil real** (`weak_reference` sigue sin llenar), y fix de **p12** (menciona "aerolínea/banca" → contamina los controles).
2. **Corrida de varianza** N≥3 sobre un subset → modelo de muestreo/confianza (Slice 4).
3. **Recalibrar pesos** con el brand-set v2 + varianza (hasta entonces se mantienen los del arch V1 como hipótesis).
4. **Curar `golden-set.v1.json`** (inputs + expected findings, desambiguando `efeoncepro.com` del homónimo `f11.es`) para `TASK-1227` (Slice 5).
5. **Gemini/Perplexity** cuando haya credenciales (completar el provider set arch V1).
6. **ADR delta**: decidir si Anthropic entra al provider set V1.
