# 07 · Benchmark Types

No todos los benchmarks se hacen igual. Elige el tipo por la decisión, y aplica el diseño de `06` a cada uno. El más moderno y relevante para Efeonce en 2026 es el de **presencia digital / AI Share of Voice** — por eso va con detalle.

## Panorama de tipos

| Tipo | Compara | Métricas típicas | Fuente |
|---|---|---|---|
| **Competitivo** | Efeonce/cliente vs pares | posicionamiento, oferta, pricing, presencia | observable + `10` |
| **Performance / KPI** | métricas propias vs benchmark de industria | CTR, CPL, conversión, engagement, ROAS | reportes de industria + first-party |
| **Presencia digital / AI SoV** | visibilidad en buscadores y **motores IA** | Share of Voice IA, SEO, social, web | Semrush, herramientas de visibilidad IA |
| **Marca** | percepción/equity vs pares | awareness, sentiment, share of search | social listening, encuestas |
| **Operacional** | procesos/eficiencia vs estándar | velocidad de entrega, costo por unidad, OTD | first-party + best-practice |
| **Best-practice** | tú vs un estándar/ideal | cumplimiento de un checklist/madurez | frameworks de referencia |

## Benchmark de presencia digital / AI Share of Voice (2026 — el clave)

En 2026 la búsqueda migró a **motores de respuesta IA**. Benchmarkear visibilidad ya no es solo SEO: es también **cuánto te menciona/cita la IA vs. tus competidores**. Es el terreno del **AI Visibility Grader** de Efeonce (`efeonce/EFEONCE_OVERLAY`) y sinergia directa con `seo-aeo`.

**AI Share of Voice (SoV)** — la métrica headline:
```
AI SoV = (citas/menciones de la marca ÷ total de citas de la categoría) × 100
```
Tres subtipos que hay que distinguir (as-of 2026-07):
- **Share of answer** — apareces en el cuerpo de la respuesta.
- **Share of citation** — tu URL queda **enlazada** como fuente.
- **Share of mention** — tu nombre aparece en cualquier parte.

**Por qué importa medir por motor** (no promediar): los motores difieren enormemente. En un tracker de 8.400 prompts (as-of 2026-07), un motor citó una marca en el 84% de respuestas y otro en el 58%; la **misma marca** tuvo 22% de share en un motor y 6% en otro la misma semana. **Benchmarkea por motor** (ChatGPT, Perplexity, Gemini, Google AI Mode/AI Overviews) y reporta la dispersión, no un número único.

**Peer set + método:** los competidores que el cliente realmente enfrenta (`06`) × un set de **prompts representativos** de la categoría (los que su ICP realmente pregunta) × cada motor. La cobertura mínima 2026: ChatGPT + Perplexity + Gemini. Complementa con SEO clásico (rankings, tráfico orgánico → `seo-aeo`) y social.

**Impacto de negocio (para el pitch):** ganar una cita en AI Overview/LLM se asoció a un ~23% de lift en búsqueda de marca en los 30 días siguientes (as-of 2026-07) — conecta el benchmark con revenue, no lo dejes en vanity.

> **Reverifica siempre** estas cifras y herramientas con el paso 2026 (WebSearch + `as-of`): la visibilidad IA es de lo que más rápido cambia.

## Performance / KPI benchmark

Compara tus métricas de marketing vs. el benchmark de la industria (CTR, CPL, conversión, engagement, ROAS). Cuidado:
- Los benchmarks de industria son **estimaciones con fecha** — corre el paso 2026, no cites un benchmark de 2023.
- Normaliza por vertical, geografía y canal (`06`) — el CTR "promedio" no existe sin contexto.
- Ubica vs **mediana y top quartile** (`08`), no solo el promedio (que un outlier distorsiona).
- Los benchmarks de canal específicos son de `digital-marketing`; acá el **método** de compararlos.

## Marca / operacional / best-practice

- **Marca:** awareness, sentiment, share of search/voice — social listening + encuestas (VoC `04`).
- **Operacional:** para Efeonce, delivery/eficiencia vs estándar — cruza con `greenhouse-ico` (métricas de delivery: RpA/OTD/FTR).
- **Best-practice:** tú vs un modelo de madurez/checklist ideal — útil para auditorías (ej. madurez AEO de un cliente).

## Checklist de salida

- [ ] Tipo elegido por la **decisión**.
- [ ] Si es AI SoV: **por motor** (no promediado), 3 subtipos distinguidos, peer set + prompts representativos, cobertura ≥ ChatGPT/Perplexity/Gemini.
- [ ] Benchmarks de industria **con `as-of`** (paso 2026 corrido), normalizados.
- [ ] Conectado a impacto de negocio, no vanity.

## Cross-links

- Diseño (peer set/métricas/normalización) → `06`; scoring/gap → `08`.
- AI SoV / SEO técnico → `seo-aeo` + AI Visibility Grader (`efeonce/EFEONCE_OVERLAY`); canal/performance → `digital-marketing`; delivery → `greenhouse-ico`; visual → `dataviz`.
