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
- **Ogilvy (fuerte global): 0/6** — no apareció en prompts Chile-scoped → la referencia "fuerte" global no calibra el techo en mercado local. → reemplazada por fuerte LOCAL.

**Escala techo→piso completa (brand-set v2, agencia fuerte local = BBDO Chile, débil = Peras y Manzanas; SoV de categoría sobre las mismas respuestas, sin costo extra):**

| Marca | Rol | Apariciones (de 6 prompts × 2 motores) |
|---|---|---|
| **BBDO Chile** | fuerte (local) | **5** — techo |
| **Cebra** | competidor | **4** |
| **Efeonce** | sujeto | **0** |
| **Revops Latam** | competidor | **0** |
| **Peras y Manzanas** | débil | **0** — piso |
| Ogilvy | fuerte (global) | 0 (no calibró — global) |

**Hallazgo más duro:** en descubrimiento, **la AI Visibility de Efeonce es indistinguible de una agencia deliberadamente débil (Peras y Manzanas) y de Revops Latam — todas en 0**, mientras BBDO Chile (5) y Cebra (4) ocupan el espacio. La dimensión **AI Visibility discrimina limpio** (techo 5 → piso 0) y Efeonce está en el piso. Esto da una escala real para anclar el peso/score de la dimensión.

## 5. Costo y latencia (input para cost ceiling)

- **OpenAI:** ~5-11s/run. **Anthropic:** ~17-34s/run (**3-4× más lento**) y más web searches → **Anthropic domina el costo** en modo con grounding.
- Tokens de input por run con web search: OpenAI ~17-35k, Anthropic ~20-35k.
- **Recomendación preliminar:** `light` mode público debería evitar Anthropic con web_search por costo/latencia, o limitar prompts. Cost ceiling por-run a fijar con la corrida de varianza. (Pendiente: N≥3 + medición de costo agregado.)

## 5.bis Varianza run-to-run (N=3, p03 + p14 subject, 12 llamadas, 2026-06-24)

Misma pregunta repetida 3 veces por motor, para definir el modelo de muestreo del score:

- **SoV de categoría (p03): ESTABLE.** OpenAI → Cebra en 3/3; Anthropic → BBDO en 3/3; **Efeonce ausente en 3/3** en ambos. La presencia/ausencia NO es ruido — es consistente. Nota: cada motor es estable pero **difieren entre sí** (Cebra vs BBDO) → refuerza "cada motor = un canal".
- **Narrativa de Efeonce (p14): ESTABLE por motor.** OpenAI "Growth OS / Nested Loops" en 3/3 (preciso); Claude "Inbound" en 3/3 (genérico/drift). El drift es sistemático del motor, no aleatorio.
- **Colisión `f11.es`: INTERMITENTE** — aparece en 1/3 (OpenAI) y 2/3 (Anthropic). Señal real pero no determinista.

**Recomendación de muestreo para el score (cierra la pregunta "¿determinista sobre input ruidoso?"):**
- Para **presencia/ausencia y narrativa core** (AI Visibility, Message Alignment): N=1 es razonablemente confiable (estable run-to-run).
- Para **señales intermitentes** (colisión de entidad, menciones de borde): **N≥3** — un solo run las pierde (1/3).
- El score debe reportar cada finding como **`consistente` / `intermitente` / `ausente`** con **confianza = fracción de runs que coinciden**, NO un punto único. Esto es el "agregación determinista sobre evidencia muestreada" del Delta de TASK-1227.

## 6. Hallazgos para el motor (TASK-1226/1227)

- **Extracción brand-mention NO es name-match ingenuo:** la colisión `Efeonce`↔`f11.es` haría que un match por nombre **sobrecuente**. La extracción debe **desambiguar por dominio** (`efeoncepro.com`) — hallazgo directo para el normalizer de `TASK-1227` (refuerza "preservar `unknown`/ambiguous").
- **Citations viven por-provider:** OpenAI en `output[].content[].annotations` (`url_citation`); Anthropic en content blocks (`web_search_tool_result` + citations de text blocks). No hay campo `citations` top-level uniforme → el adapter de `TASK-1226` debe parsear por-provider (ya validado en el harness).
- **Texto OpenAI:** viene en `output[]` (no en `output_text` simple) cuando hay tool calls.

## 7. Bugs/refinamientos del prompt pack (para v2)

- **p06** (`¿Qué alternativas hay a {{competitor}}...?`) está marcado `namesBrand:false` pero contiene `{{competitor}}` → corrió con el literal `{{competitor}}` (Anthropic devolvió cites=0 / respuesta degradada). **Fix v2:** gatear p06 a que exista competidor o marcarlo dependiente de competidor.

## 8. Nota de alcance: Anthropic fuera del arch V1

El arch V1 define providers OpenAI/Perplexity/Gemini. Este spike incluyó **Anthropic (Claude)** por decisión de producto (Claude entre los answer engines más usados). El run confirma que Claude es una fuente de observación válida (web search real, citas ricas) pero **más lento/caro**. **Recomendación: retroalimentar al `GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`** la decisión de si Anthropic entra al provider set V1 (ADR delta).

## 9. Estado y pendiente

**Hecho:** pipeline validado (OpenAI + Anthropic); subject-only + discriminación techo→piso (brand-set v2: BBDO Chile fuerte local, Peras y Manzanas débil); accuracy confirmada; **varianza N=3 medida + modelo de muestreo recomendado** (§5.bis). Las dimensiones discriminan limpio (5→0). Evidencia direccional, no estadística (N pequeño, un mercado, sin Gemini/Perplexity).

**Hecho (cont.):** **`golden-set.v1.json` curado** (Slice 5) — 8 casos {input, expectedFinding} fundados en evidencia real (presente/ausente/ambiguo/drift/trust + regla de desambiguación por dominio), listo para que `TASK-1227` lo promueva a `src/lib/growth/ai-visibility/evals/**`.

**Pendiente para cerrar (follow-ups):**
1. **Recalibrar pesos** del score con esta evidencia (hasta entonces se mantienen los del arch V1 como hipótesis; ahora hay escala real 5→0 + modelo de confianza + golden set para anclarlos).
2. **Gemini/Perplexity** cuando haya credenciales (completar el provider set arch V1).
3. **ADR delta**: decidir si Anthropic entra al provider set V1.
4. **Prompt pack v2**: fix p12 ("aerolínea/banca" contamina controles); p06 ya corregido en el harness.

## Delta 2026-06-27 — TASK-1249 (provider completion + decisión de pesos)

Cierra los follow-ups #2 y #4 y resuelve formalmente el #1 como **decisión documentada**, no como fit.

### a) Perplexity completado (follow-up #2)

- Secret `greenhouse-perplexity-api-key` (v1) provisionado + grant `secretAccessor` al SA runtime `greenhouse-portal@`; flag `GROWTH_AI_VISIBILITY_PERPLEXITY_ENABLED` ON en staging (ledger). Gemini ya lo había cerrado `TASK-1233`. **El provider set arch V1 (OpenAI/Perplexity/Gemini) queda completo y operativo.**
- **Smoke real low-volume** (aislado a Perplexity, modo `light`, 2 marcas fixture): **6/6 prompts `succeeded` por marca**, cada observación con texto acotado + **9-10 citations** parseadas, `source=secret_manager`, sin errores. Perplexity (Sonar) es una fuente search-grounded válida y barata (~US$0.004/marca en `light`), más rápida/barata que Anthropic+web_search (§5). El parser del cliente canónico maneja el payload real (`citations` como array de URLs) — bloqueado con test de fixture.

### b) Efecto del nuevo mix de providers sobre la reproducibilidad

- El **provider set es parte de la provenance** y ya se persiste por run (`grader_runs.requested_providers` + `prompt_pack_version` + `provider_policy_version`; `grader_scores.score_version`; `provider_observations.provider/model`). Los snapshots **pre/post-Perplexity quedan version-tagged y comparables, no mezclados en silencio** — un score publicado es reproducible/explicable por construcción (¿cambió por pesos, prompt o mix de providers?).
- Medición del **efecto agregado** de sumar Perplexity sobre la distribución de scores: requiere una corrida multi-provider scoreada pre/post (gasto de budget mayor) → **follow-up** (no se ejecutó en esta task; decisión de budget mínimo del operador 2026-06-27).

### c) Decisión de pesos del score (follow-up #1) — **MANTENER V1**

`score_version = ai_visibility_score_v1` se **mantiene intacto**. Rationale (anti-overfitting honesto):

- **El golden set son 8 casos** → estadísticamente **demasiado chico para un split calibration/holdout o cross-validation** que generalice. Tunear pesos contra esos 8 casos y medir sobre los mismos sería overfitting puro ("siempre mejora sobre lo que ajustaste").
- La evidencia del spike (escala de discriminación **5→0**, §4.bis) **respalda el ordenamiento de pesos de V1** — AI Visibility (peso 25, el más alto) es justo la dimensión que discrimina limpio techo→piso. No hay señal que contradiga el orden hipótesis; sí falta **volumen productivo** para un fit defendible.
- Por lo tanto **no se recalibran pesos por fit**. Un eventual `ai_visibility_score_v1_1` queda como **follow-up que requiere (i) volumen productivo real, (ii) split o cross-validation con holdout, y (iii) product sign-off** (cambiar pesos mueve scores publicados). Sería additive (V1 intacto, nuevo `score_version`), nunca un recompute retroactivo de snapshots.

### d) Prompt pack v2 (follow-up #4)

- Creado `prompt-pack.v2` (additive, V1 intacto/reproducible, **opt-in** vía `promptPackVersion`). Fix único: **p12** deja de nombrar sectores ("aerolínea o banca") que contaminaban los controles. p06 ya estaba resuelto por `resolvePromptInputs` (gating de `{{competitor}}`).
- **Default de runtime sigue siendo V1.** Promover v2 a default cambia outputs → requiere **golden eval real (baseline + regresión)** por la regla eval-driven (decisión arch #10). Como el golden eval determinista es *observation-based* (no *prompt-based*), validar v2 exige una corrida real v1-vs-v2 cacheando observaciones por input determinista → **follow-up** (budget mínimo esta task).

### Estado de follow-ups tras esta task

| # | Follow-up | Estado |
|---|---|---|
| 1 | Recalibrar pesos | **Decisión: mantener V1** (set muy chico para fit; evidencia respalda el orden). V1.1 difere a volumen + sign-off. |
| 2 | Gemini/Perplexity | **HECHO** (Gemini TASK-1233; Perplexity TASK-1249, smoke real verde). |
| 3 | ADR delta Anthropic | Abierto (decisión de producto). |
| 4 | Prompt pack v2 | **HECHO como artefacto opt-in**; activación a default difiere a eval real. |
| 5 | Eval real v1-vs-v2 + efecto agregado del mix + cost ceiling N≥3 | Abierto (requiere budget de provider). |
