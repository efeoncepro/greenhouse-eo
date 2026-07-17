# SOURCES — Fuentes canónicas + protocolo de frescura

> Este dominio se mueve cada trimestre. Esta skill sella su núcleo **as-of
> 2026-06**. Antes de afirmar un dato volátil, reverifica con WebSearch. Aquí:
> (1) niveles de volatilidad por tema, (2) fuentes canónicas, (3) protocolo de
> refresh, (4) datos clave verificados con su fecha.

## 1. Niveles de volatilidad (qué reverificar y cada cuánto)

| Nivel | Significado | Ejemplos | Reverificar |
|---|---|---|---|
| 🟢 **Estable** | cambia en años; principios de fondo | intención de búsqueda, topical authority, qué es E-E-A-T, RAG/embeddings, valor de calidad/enlaces relevantes | rara vez |
| 🟡 **Semi-estable** | cambia en ~1 año | umbrales CWV, tipos de schema con rich result, mecánica general de fan-out, qué bots IA existen | cada ~trimestre o antes de un entregable importante |
| 🔴 **Volátil** | cambia en semanas/meses; cifras y features | cobertura % de AI Overviews, cuotas de citación por motor, líder de herramientas SoV, precios, qué features tiene AI Mode hoy, últimos Google updates | **siempre** antes de afirmarlo como hecho |

**Regla:** todo dato 🔴 va con WebSearch + fecha. Nunca cites una cifra 🔴 de
memoria en un entregable.

## 2. Fuentes canónicas por tema

**Oficiales / primarias (máxima confianza):**
- Google Search Central (`developers.google.com/search`) — docs + "AI features"
  + "AI optimization guide" + Core Web Vitals.
- Google Search Status Dashboard — ranking updates confirmados.
- Search Quality Rater Guidelines (PDF oficial) — E-E-A-T.
- `web.dev` / Chrome — Core Web Vitals, CrUX.
- Bing Webmaster + IndexNow docs.
- Schema.org — tipos y propiedades.
- Documentación de cada motor (OpenAI, Perplexity, Anthropic) sobre sus bots.

**Investigación (alta confianza para tácticas):**
- Paper **GEO** (Princeton, Georgia Tech, Allen Institute for AI, IIT Delhi), KDD
  2024 — lift de tácticas de citabilidad.
- Estudios de clickstream (SparkToro/Datos), Pew Research (CTR + AIO), BrightEdge
  (cobertura AIO), Ahrefs/Amsive/Seer (CTR), Rutgers/Wharton (bloqueo de bots).

**Industria (buena para tendencias, verificar cifras):**
- Search Engine Journal, Search Engine Land, Search Engine Roundtable, Aleyda
  Solis (AI search), Ahrefs/Semrush blogs, Profound/Peec/Otterly (AEO data).

## 3. Protocolo de refresh de la skill
1. Antes de cualquier entregable, reverifica los datos 🔴 que vayas a usar.
2. Cada ~trimestre (o cuando haya un Google update grande): revisar módulos
   `01` (CWV/bots), `04` (motores/fan-out/llms.txt) y `07` (herramientas SoV).
3. Al detectar un cambio material, actualiza el módulo + el sello `as-of` + esta
   lista de datos clave. Registra qué cambió.
4. Mantén el GLOSSARY al día cuando aparezcan/mueran términos (p.ej. SGE → AIO).

## 4. Datos clave verificados (as-of 2026-06, con fuente)

> Todos 🔴/🟡 — reverificar antes de citarlos en un entregable.

- **AI Overviews:** presentes en ~**48–50%** de queries (Mar 2026; BrightEdge /
  disclosures Google).
- **Zero-click:** ~**65%** de búsquedas sin click; **83%** con AI Overview
  (SparkToro/Datos 2026).
- **CTR con AIO:** Pew Research (68k queries) → **−46.7%** relativo en clicks
  cuando aparece AIO. Marcas **citadas** en AIO: **+35%** clicks orgánicos.
- **Query Fan-Out:** **8–12** sub-queries típicas; ~**59%** de prompts disparan
  5–11; "Scatter-Gather with Planning" (Google).
- **GEO tácticas (KDD 2024):** quotations **+41%**, statistics **+32%**, cite
  sources **+30%**, fluency **+28%**.
  ⚠️ **TRES ADVERTENCIAS QUE HAY QUE DECIR SIEMPRE que se cite este paper** (se pagó caro no
  decirlas — ver `ANTIPATTERNS.md` §"Prevalencia ≠ lift"):
  1. **El motor no es un motor de 2026.** El paper mide contra un generative engine armado con
     **GPT-3.5-turbo + top-5 de Google**, sobre GEO-BENCH. No es ChatGPT Search, ni AI Overviews,
     ni Perplexity de hoy.
  2. **La métrica NO es "citas".** Es *Position-Adjusted Word Count*: la **proporción de palabras
     de la respuesta atribuibles a tu fuente**, ponderada por posición.
  3. **El lift VARÍA POR DOMINIO**, y el paper lo dice: *Statistics Addition* rinde sobre todo en
     **Law & Government** y **Opinion**. Aplicar un lift de un dominio a otro es sobre-declarar.
  🔴 **`Quotation Addition` = citar FUENTES O EXPERTOS entre comillas.** NO es "poner una cita
  destacada propia". Confundirlo es el error más caro y más fácil de cometer.
- **Citabilidad — CIFRAS CORREGIDAS (auditadas 2026-07-14; la versión anterior de este archivo
  sobre-declaraba las tres):**
  - **Answer capsule:** el **72.4%** de las *entradas citadas por ChatGPT* tienen una cápsula de
    respuesta identificable (**Search Engine Land**, 15 dominios, ~7.500 referidos).
    ⚠️ Es un **base rate SIN grupo de control**: mide las citadas, no las NO citadas — **describe
    el patrón, no prueba el lift**. Y SEL define la cápsula como **~120-150 caracteres (20-25
    palabras)**, no 40-60: si escribes 40-60, es una decisión de craft tuya, **no la respalda ese
    número**.
  - **Tablas:** el **30%** de las páginas que ChatGPT cita **contienen** una tabla, contra el
    **13%** de las que rankean en Google (**Nectiv**, ~8.800 URLs citadas vs ~25.000 rankeadas).
    🔴 Eso es una **razón de PREVALENCIA entre dos corpus**, **NO un lift de 2,3× por agregar una
    tabla** — y **la lista numerada NO aparece en el hallazgo**. Decir "tabla+lista → 2,3× más
    citas" es exactamente el error del `+41%`, con otro número.
  - **Freshness:** el **"<2 meses → +28% citas"** **NO tiene fuente localizable**: se retiró. Lo
    verificable: el contenido citado por IA es **~25,7% más fresco** que el que rankea en Google
    (Ahrefs, 17M de citas) y **~50% de lo citado tiene menos de 13 semanas**. Y fuera de queries
    de noticias, Ahrefs encuentra que las páginas citadas son **más viejas** (~500 días) que las
    recuperadas-no-citadas: **la metadata de fecha es señal poco fiable**.
  - **Brand mentions:** correlacionan **~3×** más que los backlinks con la visibilidad en IA
    (**Ahrefs**, 75.000 marcas: menciones sin enlace **0,664** vs backlinks **0,218**).
    ✅ Bien atribuido — y **los propios autores advierten que es correlación, no causalidad**.
    Matiz: Ahrefs midió sobre **AI Overviews de Google**, no "citas en IA" en general.
- **🟢 LA EVIDENCIA PRIMARIA MÁS FUERTE que existe hoy, y que casi nadie cita** (Ahrefs, **1,4
  millones de prompts de ChatGPT**): lo que más separa a una página **citada** de una
  **recuperada-y-no-citada** es la **relevancia semántica del TÍTULO** frente a la sub-pregunta
  (**0,656** vs **0,484**) y la claridad del slug (**89,8%** vs **81,1%**).
  ⚠️ Y en ese mismo estudio **la cápsula de respuesta NO aparece entre los predictores**.
  → **Consecuencia operativa:** escribir cada H2 como **la pregunta literal del fan-out** es la
  palanca con mejor evidencia. La cápsula se sostiene por **mecanismo** (el motor recupera
  pasajes), no por una cifra.
- **Solapamiento de fuentes:** solo **~11%** de dominios citados coinciden entre
  ChatGPT y Perplexity (680M citas).
- **Preferencias de cita:** ChatGPT ↦ Wikipedia (**47.9%**); Perplexity ↦ Reddit
  (**~46.7%**); Reddit #1 across engines; **YouTube superó a Reddit** como social
  más citada (inicios 2026).
- **llms.txt:** Google no lo usa/endorsa (Mueller/Illyes); **97%** recibieron 0
  requests (Ahrefs, may-2026); ~28% de dominios lo publican.
- **AI crawlers:** training (GPTBot/ClaudeBot/Google-Extended/CCBot) vs retrieval
  (OAI-SearchBot/ChatGPT-User/PerplexityBot); bloquear bots IA → **−23.1%**
  tráfico sin reducir citas de forma fiable (Rutgers/Wharton, dic-2025).
- **Core Web Vitals:** LCP ≤2.5s (posible afinamiento a 2.0 — verificar) · INP
  ≤200ms · CLS ≤0.1; update 2026 equiparó pesos; **55.9%** orígenes pasan los 3
  (CrUX may-2026).
- **Herramientas SoV IA:** Profound (G2 AEO Leader, $1B val), Peec, Otterly, Akii,
  Promptmonitor; pricing $19–$1.499+/mes.
