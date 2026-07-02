# 04 · Experimentation & A/B Testing

> Un experimento sin honestidad estadística no es evidencia: es teatro caro.
> Aquí decides si se puede testear, cómo, y cómo no engañarte.

## 1. ¿Se puede testear? (gate de tráfico primero)

Antes de proponer un A/B, estima el sample size (§4). Si no alcanzas significancia en
**≤4 semanas**, NO recomiendes A/B clásico como primer paso. Alternativas para bajo
tráfico:
- Cambios de **alta confianza** respaldados por research + heurísticas (LIFT/MECLABS)
  — implementar, no testear.
- **CUPED** (§5) para reducir la muestra necesaria.
- **Research cualitativo** (session replay, encuestas, tests de usabilidad).
- Testear más arriba en el funnel (más volumen) o agrupar micro-conversiones.
- Métodos **secuenciales/bayesianos** que permiten decidir antes con control de riesgo.

Nunca corras un test sub-potenciado y llames "sin diferencia" a la falta de poder.

## 2. Diseñar el experimento (declara ANTES de correr)

Toda prueba nace con esto escrito (→ `templates/experiment-brief.md`):

- **Hipótesis** en forma causal: *"Porque [research], creemos que [cambio] hará que
  [métrica] [suba/baje] para [segmento]. Lo sabremos si [criterio]."*
- **Métrica primaria** (una sola, la que decide).
- **Guardrail metrics** (salud que NO debe degradarse: churn, latencia, calidad de
  lead, margen, revenue por sesión).
- **MDE** (efecto mínimo que vale la pena detectar) + **α** (0.05) + **power** (0.8).
- **Sample size** y **duración** (cubre ≥1–2 ciclos semanales completos para no sesgar
  por día de semana).
- **Unidad de aleatorización** (usuario, sesión, cuenta) — consistente con la métrica.
- **Regla de decisión** definida por adelantado (ship / no-ship / iterar).

## 3. Frecuentista vs bayesiano (elige por contexto)

| | Frecuentista | Bayesiano |
|---|---|---|
| Output | p-value, intervalo de confianza | P(variante mejor), distribución posterior |
| Requiere | sample size fijo por adelantado | prior + umbral de decisión (90/95/99%) |
| Fuerte en | rigor, control estricto de falso-positivo, reporting estándar | interpretabilidad ("87% de ser mejor"), decisiones con costo/beneficio, tráfico bajo/medio |
| Riesgo | rígido; tentación de *peeking* | dependencia del prior; falsa sensación de poder monitorear libremente |

Práctica común 2026: **bayesiano para velocidad/decisión de producto**, **frecuentista
para rigor/reporting**. Muchos equipos combinan. Lo que **no** se hace: correr un test
de sample fijo frecuentista y pararlo al ver 95% de paso (eso es peeking → §6).

## 4. Sample size y MDE (la matemática que evita el autoengaño)

Intuición: **muestra necesaria ∝ varianza / MDE²**. Detectar un efecto pequeño exige
mucha más muestra que uno grande (relación cuadrática). Determinantes:
- **Baseline conversion rate** (más extremo → distinto n).
- **MDE** (más chico → n crece rápidamente, ~cuadrático).
- **α** (falso-positivo, 5%) y **power** (80% típico).

Usa una calculadora (Evan Miller, o la de tu tool) — no estimes a ojo. Regla de negocio:
si el MDE realista es minúsculo y no hay tráfico, el test no vale la pena; busca cambios
de mayor efecto o usa CUPED.

## 5. Técnicas que aceleran o protegen

- **CUPED** (Controlled experiment Using Pre-Experiment Data): usa una covariable
  pre-experimento (ej. engagement previo) para reducir varianza → **misma potencia con
  30–40% menos muestra** (ej. 2000→1200/variante). El acelerador #1 para tráfico
  limitado si tienes datos históricos por usuario.
- **Sequential testing** (confidence sequences / always-valid p-values): permite
  monitorear y parar temprano **sin** inflar el falso-positivo. Es la respuesta
  correcta al deseo de "mirar el test": no prohíbas mirar, usa un método diseñado para
  ello.
- **Stratification / variance reduction** y **mutual exclusion (layers)** para correr
  muchos tests sin interferencia (Optimizely/Statsig/GrowthBook soportan mutex).
- **Guardrails automáticos**: detén el test si un guardrail cae más allá de un umbral.

## 6. Pitfalls (los que arruinan programas)

- **Peeking / early stopping** en test de sample fijo → falso-positivo disparado. Usa
  fixed-N o secuencial, nunca fixed-N parado a ojo.
- **HARKing / p-hacking:** hipótesis inventada post-hoc; segmentar hasta hallar p<0.05.
  Declara hipótesis y primaria antes; segmentos son *exploratorios*, no confirmatorios.
- **Sin guardrails:** ganar la primaria degradando la salud (calidad de lead, churn).
- **Sample ratio mismatch (SRM):** si el split real ≠ diseñado (50/50), hay un bug;
  invalida el test — chequéalo siempre.
- **Novelty / primacy effects:** el efecto inicial puede no sostenerse; corre el tiempo
  suficiente y mira cohortes.
- **Interferencia entre tests / cross-contamination:** sin mutex, los tests se pisan.
- **Significancia ≠ impacto:** p<0.05 en una métrica que no mueve la NSM no es victoria.
- **Métricas del tool ≠ del negocio:** dos fuentes de verdad. Prefiere warehouse-native
  o reconcilia.

## 7. Tooling (landscape 2026 — reverificar, hay M&A frecuente)

Madurez del equipo → herramienta:
- **Etapa 1 (marketing-led):** VWO, AB Tasty, Convert, Unbounce (para landings).
- **Etapa 2 (cross-funcional):** Kameleoon, Optimizely.
- **Etapa 3 (data-native / warehouse):** **Eppo**, **GrowthBook** (warehouse-native,
  una sola fuente de verdad con tu warehouse), Statsig (nota: absorbido por Amplitude
  en 2026; reverificar estado).

**El cuello real casi nunca es el tool** — es el *bandwidth de ejecución* (idear,
correr, analizar, shippear ganadores). Prioriza resolver el gap de ejecución y la
velocidad de experimentación sobre elegir la plataforma perfecta.

## 8. Programa de experimentación (cultura)

- **Velocidad > perfección de un test.** Más tests bien diseñados > un test perfecto
  al trimestre. Mide **experiment velocity** (tests/mes) y **win rate** (esperado ~10–30%;
  win rate muy alto = MDE demasiado chico o hipótesis triviales).
- **Documenta todo** (incluidos los perdedores — el aprendizaje es el activo).
- **Nunca celebres un lift sin verificar guardrails ni durabilidad.**

## Checklist de salida

- [ ] Gate de tráfico pasado (o alternativa a A/B elegida).
- [ ] Brief con hipótesis causal, primaria, guardrails, MDE, sample size, duración,
      unidad de aleatorización y regla de decisión — **antes** de correr.
- [ ] Método (frecuentista/bayesiano/secuencial) justificado; CUPED si aplica.
- [ ] SRM chequeado; sin peeking en fixed-N; guardrails monitoreados.
- [ ] Decisión atada a impacto de negocio, no solo a p<0.05.

## Cross-links

- Qué testear en la web → `03_CRO.md`; instrumentar/medir → `07`
- Priorizar el backlog de tests → `01` (ICE/RICE) y `03` (PXL)
- Errores → `ANTIPATTERNS.md`; artefacto → `templates/experiment-brief.md`
- En el repo NO existe aún un motor A/B propio → ver `efeonce/MEASUREMENT_IN_GREENHOUSE.md`
