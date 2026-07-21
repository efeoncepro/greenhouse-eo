---
name: research-benchmark-operator
description: Diseña research y benchmarks rigurosos con evidencia fechada, triangulación, peer sets, normalización, scorecards y confidence levels. Use for market research, competitive intelligence, TAM/SAM/SOM, VoC/JTBD, tendencias y comparación de modelos o créditos creativos.
type: skill
user-invocable: true
argument-hint: "[pregunta de research o benchmark concreto]"
---

# research-benchmark-operator — Research + Benchmark (2026)

> **UNA skill, DOS carriles.** *Research* responde "¿qué es verdad / qué está pasando / qué deberíamos saber?" (inquiry abierta → insight). *Benchmark* responde "¿cómo comparamos vs. pares o un estándar, y dónde está el gap?" (comparación estructurada → scorecard). Benchmark es research **comparativo**: comparten fuentes, rigor, motor de ejecución y output. Por eso viven juntos, con carriles claros.

> **DOBLE audiencia.** Esta skill sirve para research/benchmark **de Efeonce** (interno: pitch, GTM, inteligencia competitiva, decisiones) **Y como servicio entregable para clientes** (Efeonce es agencia: el research/benchmark es un deliverable billable, con confidencialidad, metodología transparente y presentación de nivel). Cuando el trabajo es para un cliente, carga `11_RESEARCH_AS_A_SERVICE`. La **inteligencia competitiva** tiene su módulo profundo dedicado (`10`).

> **Skill de MÉTODO + orquestación, no de ejecución cruda ni de dominio.** La **ejecución** (fan-out de búsquedas, verificación, síntesis con citas) se delega a la harness **`deep-research`**. El **research de dominio** se delega a su skill dueña (búsqueda/keywords/visibilidad IA → `seo-aeo`; competitivo comercial/win-loss/ICP → `commercial-expert`). Esta skill aporta la **capa de rigor** + el **diseño** + la **orquestación**.

## Regla #0 — evidencia con fecha, nunca memoria

Toda afirmación load-bearing sale con **fuente + `as-of AAAA-MM`**, no de memoria. El research y el benchmarking envejecen rápido; **el paso de "revisar internet por tendencias vigentes" es obligatorio** (ver Paso 2 del método). Las herramientas de IA **alucinan 17–33% de las citas** (as-of 2026-07); la verificación es un requisito **estructural**, no opcional.

## Método (orden obligatorio)

1. **Enmarca** — pregunta de research o objeto de benchmark, decisión que habilita, entregable, alcance, deadline (`01` / `06`).
2. **Revisa el estado del arte vigente (paso 2026, obligatorio)** — antes de opinar, corre **WebSearch/WebFetch** para (a) las **bases fundacionales** del método y (b) las **tendencias 2026 verificadas** del tema. Cita fuente + `as-of`. No dependas de conocimiento entrenado para datos, cifras, herramientas o "lo último".
3. **Carga solo** el/los módulos de la etapa (árbol de decisión).
4. **Ejecuta con rigor** — delega la corrida a `deep-research`; aplica triangulación + credibilidad de fuente + confidence levels (`02`, `05`).
5. **Sintetiza / puntúa** — insight con confianza (research) o scorecard + gap (benchmark).
6. **Entrega** un artefacto (`templates/`) con hand-off a `dataviz` para el visual, y nombra el siguiente owner.

## Árbol de decisión — qué módulo cargar

```
¿En qué estás?
── CARRIL RESEARCH
│  ├─ Enmarcar la pregunta, método, alcance, entregable ......... 01_RESEARCH_DESIGN
│  ├─ Elegir/validar fuentes y su credibilidad (2026) .......... 02_SOURCES_CREDIBILITY
│  ├─ Tamaño de mercado, oportunidad, tendencias (TAM/PESTEL) ... 03_MARKET_OPPORTUNITY
│  ├─ Landscape competitivo, VoC, JTBD, personas ............... 04_COMPETITIVE_AUDIENCE
│  └─ Sintetizar con rigor anti-alucinación + confianza ........ 05_SYNTHESIS_RIGOR
── CARRIL BENCHMARK
│  ├─ Diseñar el benchmark (peer set, métricas, normalización) . 06_BENCHMARK_DESIGN
│  ├─ Elegir el tipo (competitivo/performance/AI SoV/marca…) ... 07_BENCHMARK_TYPES
│  └─ Scorecard + gap analysis + recomendaciones priorizadas ... 08_SCORECARD_GAP
── INTELIGENCIA COMPETITIVA (deep-dive)
│  └─ CI: ciclo, señales/fuentes, win-loss, battlecards, ética . 10_COMPETITIVE_INTELLIGENCE
── SERVICIO A CLIENTES
│  └─ Research/benchmark COMO deliverable para un cliente ...... 11_RESEARCH_AS_A_SERVICE
── CROSS
   ├─ Estructurar y entregar el reporte/artefacto ............. 09_OUTPUT_DELIVERY
   ├─ Qué NO hacer ........................................... ANTIPATTERNS
   ├─ Vocabulario ........................................... GLOSSARY
   ├─ Fuentes + tendencias 2026 (reverificar) ............... SOURCES
   ├─ Caso Efeonce (Grader, ICO, Semrush/HubSpot/BigQuery) ... efeonce/EFEONCE_OVERLAY
   └─ Artefacto de salida ................................... templates/
```

## Reglas duras (hard rules)

1. **Evidencia con fecha, no memoria** (Regla #0). Fuente + `as-of` en todo claim load-bearing.
2. **Revisar internet por tendencias vigentes es un paso, no opcional** (Paso 2). Bases fundacionales **y** estado del arte 2026 verificado.
3. **Triangula.** Todo claim load-bearing se apoya en **≥2 fuentes independientes**; una sola fuente = hipótesis, no hecho. Marca **confidence** (alto/medio/bajo).
4. **Verificación estructural anti-alucinación.** La IA alucina citas (17–33%, as-of 2026-07). Verifica cada cita/dato contra la fuente primaria; nunca cites lo que no abriste. Usa el harness `deep-research` (verificación adversarial) para claims críticos.
5. **Benchmark JUSTO.** Declara el **peer set** y por qué (pares que el cliente realmente compara + best-in-class), las **métricas** y la **normalización** (moneda, estacionalidad, mix, definiciones). Sin cherry-picking. Ubica vs **mediana y top quartile**, no solo el promedio.
6. **Synthetic ≠ real.** El research sintético / synthetic users / entrevistas AI-moderadas escala lo cualitativo, pero **no reemplaza** la señal humana/real; valídalo contra datos reales y decláralo.
7. **No reimplementes el harness.** La ejecución (fan-out/verificar/sintetizar) es de `deep-research`; esta skill diseña y orquesta.
8. **Delega el research de dominio** a su skill dueña; aporta la capa de rigor, no una versión paralela.
9. **Privacidad.** Si el research recolecta datos personales (prospección B2B, scraping), cumple `legal-privacy-ip-operator` (GDPR Art. 14 al obtener de terceros).
10. **es-CL neutro, tuteo.**

## Tabla de sinergias (nombra y encadena)

| Necesitas… | Delega en | Frontera |
|---|---|---|
| **Ejecutar** el research (fan-out, verificar, sintetizar con citas) | **`deep-research`** (harness) | La skill diseña/orquesta; el harness corre |
| Research de búsqueda/keywords + **AI Visibility Grader** (benchmark AEO) | **`seo-aeo`** | Search/GEO es de seo-aeo; acá la metodología general |
| Competitivo comercial, win-loss, battlecards, ICP, sizing GTM | **`commercial-expert`** | La inteligencia comercial es suya; acá el método de research |
| Trend/topic research que se vuelve contenido / data study | **`content-marketing-studio`** | El research alimenta editorial; ellos producen la pieza |
| Benchmarks de canal/performance de marketing | **`digital-marketing`** | Benchmarks de canal son suyos; acá el diseño del benchmark |
| Visualizar scorecards, comparaciones, hallazgos | **`dataviz`** / `dataviz-design` | El insight es de esta skill; el gráfico de dataviz |
| Contexto de negocio, ICP/segmentos, qué importa, casos | **`efeonce-agency`** | Doctrina de negocio; acá se aterriza en research |
| Datos internos (delivery/ICO) y externos (Semrush/HubSpot/BigQuery) | `greenhouse-ico` · `gcp-bigquery` · Semrush/HubSpot MCP | Fuentes; la skill decide qué y cómo usarlas |
| Cumplimiento al recolectar datos personales | **`legal-privacy-ip-operator`** | Legal fija el deber; acá el método de research |
| Productizar un benchmark como runtime (estilo Grader) | `arch-architect` + `greenhouse-backend` | Solo si se productiza; esta skill es método |

**Regla de oro:** si la pregunta es *cómo investigar/comparar con rigor, qué fuentes, cómo sintetizar/puntuar* → es esta skill. Si es *ejecutar la corrida*, *el dominio específico* (SEO, comercial), *el visual* o *el runtime* → es la skill/harness dueña. Cuando cruza, **nómbralo y encadena**.

## Herramientas

- **WebSearch / WebFetch** — el paso 2026 obligatorio: bases fundacionales + tendencias vigentes, con `as-of`.
- **`deep-research` (harness)** — ejecución multi-fuente con verificación adversarial para research/benchmark de peso.
- **MCP (si el entorno los expone):** Semrush (keyword/tráfico/competencia/AI Visibility Index), HubSpot (CRM/pipeline), BigQuery (first-party/analytics), Notion (knowledge). Si no hay tool callable, decláralo.
- **Honestidad de datos:** si no puedes verificar, dilo y marca confidence bajo. Nunca presentes un benchmark de mercado como resultado propio ni una sola fuente como hecho triangulado.

## Postura y salida

- **Rigurosa y con confianza explícita.** Cada hallazgo trae fuente, `as-of` y nivel de confianza.
- **Benchmark declarado** (peer set + métricas + normalización visibles) — la transparencia del método ES la credibilidad.
- **Cierra con artefacto + hand-off** (dataviz para el visual; la skill dueña para la acción).

## Mapa de módulos

| Archivo | Contenido |
|---|---|
| `modules/01_RESEARCH_DESIGN.md` | Enmarcar pregunta/decisión, hipótesis, elegir método (cuali/cuanti, primario/secundario), alcance, entregable |
| `modules/02_SOURCES_CREDIBILITY.md` | Estrategia de fuentes 2026 (web, motores IA, comunidades, first-party, expert networks), scoring de credibilidad, recencia, triangulación |
| `modules/03_MARKET_OPPORTUNITY.md` | Market sizing (TAM/SAM/SOM), tendencias, PESTEL, technology scouting, oportunidad |
| `modules/04_COMPETITIVE_AUDIENCE.md` | Landscape competitivo, VoC, JTBD, personas, social listening |
| `modules/05_SYNTHESIS_RIGOR.md` | Anti-alucinación, verificación estructural, confidence levels, control de sesgo, citación con as-of, uso del harness |
| `modules/06_BENCHMARK_DESIGN.md` | Peer set (6–12 + best-in-class), definición de métricas, normalización, comparación justa |
| `modules/07_BENCHMARK_TYPES.md` | Competitivo · performance/KPI por industria · presencia digital / **AI Share of Voice** / SEO / social · marca · operacional · best-practice |
| `modules/08_SCORECARD_GAP.md` | Rúbrica de scoring, ubicación vs mediana/top quartile, gap map, descomposición en drivers, recomendaciones priorizadas |
| `modules/09_OUTPUT_DELIVERY.md` | Estructura del reporte, exec summary, confidence/limitaciones, hand-off a dataviz, artefacto |
| `modules/10_COMPETITIVE_INTELLIGENCE.md` | **CI deep-dive:** ciclo de CI, señales/fuentes (pricing, job posts, patentes, sentiment, releases), real-time CI, win-loss, battlecards, ética/legal de CI, CI para Efeonce vs para clientes |
| `modules/11_RESEARCH_AS_A_SERVICE.md` | Research/benchmark **como deliverable de agencia**: encuadre del engagement, confidencialidad/NDA, estándar de entregable, transparencia de método, presentación al cliente, billability |
| `ANTIPATTERNS` · `GLOSSARY` · `SOURCES` | Antipatrones, vocabulario, fuentes + tendencias 2026 con `as-of` |
| `efeonce/EFEONCE_OVERLAY.md` | AI Visibility Grader como benchmark, ICO como fuente interna, benchmarks para pitch, Semrush/HubSpot/BigQuery, casos |
| `templates/` | research-brief, source-log, competitive-matrix, benchmark-scorecard, exec-summary |
