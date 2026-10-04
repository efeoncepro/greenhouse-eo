# Efeonce Insights — criterio de selección de gráficos V1

- Status: **Accepted** — criterio aprobado y canonizado por el operador el 2026-10-03; **code complete, rollout
  pendiente** en [TASK-1974](../tasks/in-progress/TASK-1974-efeonce-insights-figure-selection-planner.md) (planner,
  contrato y modelo web) y [TASK-1975](../tasks/in-progress/TASK-1975-efeonce-insights-new-figure-pages.md) (render y
  diseño). Hasta el release, producción sigue eligiendo figuras con la lógica anterior (ver §2 y arquitectura §14.12).
- Date: 2026-10-03
- Owner: Platform / Architecture + Client Experience; Julio Reyes como autoridad de producto.
- Scope: planificador editorial de Insights (contrato editorial v2), matriz familia × evidencia, catálogos PDF
  `insights-report` e `insights-deck` y vista web en `efeonce-think`.
- Reversibility: two-way; cambia cómo se planifican las ediciones nuevas. Las ediciones ya emitidas son snapshots
  congelados y no se reescriben.
- Validated as of: 2026-10-03 — caso de referencia medido con el código en producción (septiembre 2026 contra agosto,
  Berel y Sky) y vista previa real con el criterio implementado en local (`scripts/insights/preview-edition.ts
  --editorial-v2`).
- Program: [EPIC-045](../epics/in-progress/EPIC-045-efeonce-insights-multiformat-intelligence.md).
- Technical contract: [arquitectura](EFEONCE_INSIGHTS_ARCHITECTURE_V1.md) §15 («Familias de gráfico (matriz v2)») ·
  [ADR del dominio](EFEONCE_INSIGHTS_PLATFORM_DECISION_V1.md).
- Skills: `efeonce-insights` (operación del dominio) y `dataviz-design` (dueña de las reglas duras de visualización
  que este criterio hereda).

## 1. Propósito

Fijar cómo elige Insights la figura de cada dato de una edición. Hasta hoy el planificador decide por la forma del
dato y por costumbre, y el resultado es un informe dominado por barras y con métricas repetidas en dos figuras. Este
documento es el criterio canónico: lo aplica el planificador determinista, lo respeta la autoría asistida y lo
consultan los catálogos de render cuando tienen que dibujar una familia.

No reemplaza la matriz familia × evidencia (`editorial/family-evidence-matrix.ts`): la matriz dice **qué familias
puede dibujar** un productor con la evidencia que existe; este criterio dice **cuál de ellas conviene** para la
pregunta que responde el dato.

## 2. Producción vs. código del criterio

| Aspecto | En producción (2026-10-03) | Código del criterio (TASK-1974 + TASK-1975, local, rollout pendiente) |
|---|---|---|
| Contrato de familias | 15 familias en `CHART_FAMILIES` (`contracts/chart-spec.ts`) | Igual, más `ChartSpecV1.question` y la **tarjeta de cifra** (`PlanStatFigureV1`, `chapter.stats`), que es figura y no familia de gráfico |
| Familias con evidencia | Matriz `family_evidence_matrix_v2`: barras, barras agrupadas, línea, bullet, cascada y waffle | `family_evidence_matrix_v3`: suma dona (visitas desde IA por asistente de GA4) y barras apiladas (visitas orgánicas con y sin interacción de GA4) como `producer_now` |
| Figuras con página PDF | 4: barras, barras agrupadas, línea y bullet (`PDF_FIGURE_FAMILIES`) | 8 familias (`bar`, `bar_grouped`, `line`, `bullet`, `waterfall`, `waffle`, `donut`, `bar_stacked`) más la tarjeta de cifra, en A4 y deck |
| Cómo se elige la figura | Por la forma del dato; una métrica con meta puede aparecer a la vez contra la meta y contra el período anterior | Por la pregunta del lector (§4), sin duplicar hechos y con la variedad sólo como desempate |

## 3. El principio

Un gráfico es un argumento: responde **una** pregunta del lector sobre el dato. La familia se elige por la
**pregunta**, no por la forma del dato ni por costumbre.

La riqueza del data storytelling está en elegir, por cada dato, la figura que mejor lo explica: si la barra
funciona para explicar el dato, se queda; si otro gráfico funciona igual o mejor, se cambia. **Nunca se elige un
gráfico peor para variar.**

## 4. Las tres reglas (en este orden)

1. **La pregunta decide la familia** (tabla de §5).
2. **Un dato no se muestra dos veces.** Si una métrica tiene meta, gana el bullet contra la meta y sobra la barra
   contra el período anterior de la misma métrica. Un mismo hecho no alimenta dos figuras.
3. **La variedad sólo desempata.** Cuando dos familias explican el dato igual de bien, se elige la que **no** usó la
   figura anterior del capítulo. La variedad nunca justifica una figura peor.

El orden importa: la regla 3 nunca pasa por encima de la 1 ni de la 2.

## 5. Tabla pregunta → familia

| Pregunta del lector sobre el dato | Familia | Familia en el contrato | Notas |
|---|---|---|---|
| ¿Cuánto es y cómo cambió? (un valor solo, o varias métricas cada una en su escala) | **Tarjeta de cifra** (KPI card / stat card) | tipo de figura nuevo (no está en `CHART_FAMILIES`) | Anatomía en §5.1 |
| ¿Cómo evolucionó en el tiempo? (≥ 3 puntos) | **Línea** | `line` | |
| ¿Cumplimos la meta? | **Bullet** | `bullet` | Varias metas del mismo capítulo van en **una** figura (small multiples), no una figura por meta |
| ¿Qué explica el cambio? | **Cascada** | `waterfall` | Anterior → aporte de cada parte → resto → actual; debe cuadrar |
| ¿De qué se compone? 2–3 partes | **Dona** | `donut` | Más de 3 partes: nunca dona ni torta |
| ¿De qué se compone? Unidades contables, pocas categorías (≤ 4) | **Waffle** | `waffle` | Cada cuadro es una unidad (p. ej., una respuesta del motor) |
| ¿De qué se compone? Más de 4 categorías | **Barras horizontales ordenadas** | `bar` | |
| ¿Cuánto del total es un subconjunto, en dos períodos? | **Barras apiladas** | `bar_stacked` | P. ej., visitas con y sin interacción, este mes y el anterior. ≤ 4 segmentos |
| Comparar elementos ordenados (páginas, consultas, competidores) | **Barras** (horizontales si las etiquetas son largas) | `bar` | |

### 5.1 Anatomía de la tarjeta de cifra

- **Nombre** de la métrica, de 3 palabras como máximo.
- **Valor** grande, con cifras tabulares, y su **unidad**.
- **Variación** con flecha + color + texto; nunca sólo color.
- **Período de comparación explícito** («vs agosto»).
- **Dirección declarada** cuando subir es malo (posición, rondas de revisión).
- Un valor estimado lleva su marca **«estimado»**.
- Sin dato: **«—»**, nunca 0.
- La variación usa **tonos semánticos**: verde si el cambio es mejor, rojo si es peor y gris si es neutro (sin
  dirección declarada o sin cambio). El triángulo sigue al valor y el tono sigue a la dirección de la métrica. La
  píldora es la misma en la tarjeta, bajo las columnas y en las tablas.
- El período se escribe con el valor anterior: «vs {valor} en {período}». Con valor y sin período anterior, la tarjeta
  dice **«Primer período medido»** en vez de una variación.
- **Tono por fondo** (aprobado 2026-10-03, tras medir la saturación): sobre **papel** (variante A) la variación va en
  píldora teñida; sobre **navy** (variante C) no hay píldora rellena: el tono va sólo en el triángulo y la cifra en
  tinta suave (`navyLead`). Razón: en navy el rojo de «empeoró» era el mismo coral de la serie «oportunidad» (#ff7063).
- **Triángulo de puntas redondeadas** en todas las superficies (PDF A4, deck y web).
- Dirección visual aprobada (2026-10-03):
  [`TASK-1975-efeonce-insights-stat-card-direction.md`](../ui/visual-directions/TASK-1975-efeonce-insights-stat-card-direction.md).

### 5.2 Tarjetas y gráficos en un capítulo

Aprobado por el operador el 2026-10-03, junto con la tarjeta de cifra.

1. **Orden del capítulo:** cifras → metas → evolución → explicación → composición → comparación (el subconjunto de
   las barras apiladas va entre composición y comparación). La familia que no aplica se salta; el orden no se invierte.
   En código es el orden de `FIGURE_QUESTIONS` (`value_change`, `target`, `evolution`, `explain_change`,
   `composition`, `subset`, `compare`).
2. **Una sola página de cifras por capítulo**, al inicio: hasta 6 cifras en A4 y en deck (3×2). Con más, páginas
   equilibradas una tras otra, nunca separadas por gráficos.
3. **Una métrica con meta va sólo en bullet, sin tarjeta** (regla 2 de §4).
4. **La tarjeta da el total; el gráfico, el porqué.** Cuando una tarjeta y un gráfico hablan de la misma métrica, el
   gráfico no repite el total:
   - si la métrica de una dona ya tiene tarjeta, el centro muestra la participación de la parte principal, no el
     total;
   - excepción declarada: los totales de una cascada son anclas de la explicación y conviven con la tarjeta de la
     misma métrica sin contar como segunda figura de esos hechos (el gate de §9 la acepta).
5. **Dos barras no son un gráfico:** una métrica contra su período anterior es una tarjeta.
6. **Dos sistemas de color:** las series usan roles de dato (actual, anterior, oportunidad, paso, ausencia) y la
   variación usa tonos semánticos. Una serie nunca se pinta de rojo o verde porque bajó o subió.
7. En Think rige el mismo orden: la retícula de tarjetas va al inicio del capítulo y los gráficos debajo.

## 6. Reglas duras heredadas

Vienen de la skill `dataviz-design` y aplican a toda figura de Insights, con o sin este criterio:

- Barras siempre desde 0.
- Nunca torta con más de 3 porciones.
- Nunca 3D.
- Nunca doble eje.
- Nunca el color como única codificación.
- El **embudo** sólo si las etapas son estrictamente ordenadas y cada una pierde gente.

**Por qué clics de Search Console → sesiones de GA4 no es un embudo.** Las sesiones orgánicas de GA4 incluyen todos
los buscadores, no sólo Google, y pueden superar a los clics de Google: la segunda «etapa» no es un subconjunto de la
primera. En Berel, septiembre 2026: 13.606 clics contra 43.949 sesiones. Esto es coherente con §15 de la
arquitectura, que ya dibuja las sesiones orgánicas de GA4 en una figura propia que no comparte eje con los clics de
Search Console.

## 7. Caso de referencia: Berel y Sky

Medido el 2026-10-03 con el código en producción, septiembre 2026 contra agosto.

- **Berel (SEO + AEO):** 10 figuras, 6 de ellas de barras agrupadas; el PDF muestra 7, porque la cascada y los dos
  waffles son sólo web.
- **Sky (edición de ICO):** 6 figuras; 3 de barras agrupadas contra el mes anterior que **repiten** las mismas
  métricas de los 3 bullets contra la meta.

| Figura de hoy | Pregunta | Con el criterio | Por qué |
|---|---|---|---|
| Clics, impresiones y keywords (barras agrupadas) | ¿Cómo cambió cada una? | 3 tarjetas de cifra | Cada métrica en su escala; las barras no las comparan |
| CTR (barras) | Valor y cambio | Tarjeta | Valor solo |
| Tráfico orgánico estimado (barras) | Valor y cambio | Tarjeta con marca «estimado» | Valor solo |
| Visitas orgánicas al sitio y con interacción (barras) | ¿Cuántas y cuántas interactuaron? | Barras apiladas | Subconjunto dentro del total |
| Clics por semana (línea) | Evolución | Línea (se queda) | Correcta |
| Qué consultas explican el cambio (cascada) | Qué explica | Cascada (se queda; con página PDF desde TASK-1975) | Correcta |
| Páginas que más movieron los clics (barras) | Comparar ordenados | Barras horizontales (se queda) | Correcta |
| Visitas desde asistentes de IA (barras) | Cuántas y de dónde | Tarjeta + dona (ChatGPT, Gemini, otros) | Valor + composición de 3 partes |
| Tono de las respuestas (waffle) | Cómo hablan de la marca | Waffle (se queda) | 8 respuestas, cada cuadro una |
| Tipo de fuente citada (waffle) | Qué sitios citan | Barras horizontales ordenadas | 6 categorías no se leen en waffle |
| Sky: 3 barras contra el mes anterior + 3 bullets | ¿Cumplimos las metas? | 1 figura de bullets (las 3 metas) + tarjeta de piezas entregadas | Cada métrica aparecía dos veces |

**Resultado esperado:** Berel pasa de 7 de 10 figuras en barras a 6 familias distintas; Sky queda más corto y sin
datos repetidos.

## 8. Estado de implementación: dónde vive cada regla

Code complete en local (TASK-1974 + TASK-1975); rollout pendiente (arquitectura §14.12). Rutas bajo
`src/lib/efeonce-insights/` salvo que se indique otra.

| Regla del criterio | Dónde vive en el código |
|---|---|
| Pregunta → familia (§5) | `contracts/chart-spec.ts`: `FIGURE_QUESTIONS`, `QUESTION_FAMILIES` y `ChartSpecV1.question` (un spec con pregunta y familia incoherentes no valida, `question_family`); `editorial/figure-selection.ts`: `familiesForQuestion`, `chooseFigureFamily` (desempate por variedad, regla 3) y los límites `DONUT_MAX_PARTS`, `WAFFLE_MAX_PARTS`, `WAFFLE_MAX_UNITS`, `STACKED_MAX_SEGMENTS`, `EVOLUTION_MIN_POINTS` |
| Orden del capítulo (§5.2.1) | `orderByQuestion` en `editorial/figure-selection.ts`; en el PDF, `chapterFigureSlides` en `render/figure-slots.ts` (cifras primero, compartido por los dos mappers) |
| Un dato, una figura (regla 2) | `duplicatedFigureFacts` y `chartFactUse` en `editorial/figure-selection.ts`; `plan-validation.ts` rechaza con `duplicated_fact` (los totales de la cascada son la excepción de ancla) |
| Tarjeta de cifra (§5.1) | Contrato `PlanStatFigureV1` / `PlanStatItemV1` en `contracts/plan.ts` (nombre de 3 palabras / 24 caracteres); productor `statFigureFor` en `editorial/criterion-figures.ts` (una métrica con meta no va en tarjeta); resolución única `statItemView` en `presentation/stat-card.ts` para PDF, deck y web; páginas en `render/figure-slots.ts` (`buildStatSlides`) |
| Dirección y tono de la variación (§5.1) | `METRIC_DIRECTIONS`, `metricDirectionOf` y `changeToneOf` en `editorial/figure-selection.ts`; roles `deltaBetter*`/`deltaWorse*` en `src/lib/artifact-composer/brand-packs/axis/editorial-roles.json` |
| Composición y subconjunto | `compositionChartsFor` (dona, waffle o barras) y `subsetChartsFor` (barras apiladas) en `editorial/criterion-figures.ts`; `withQuestion` declara la pregunta de los gráficos que ya producía el planner |
| Orquestación | `editorial/deterministic-planner.ts`: arma la tarjeta, la figura de bullets con todas las metas del capítulo (dirección por fila), composiciones y subconjunto, y ordena por pregunta, todo bajo el contrato editorial v2 |
| Evidencia de las familias nuevas | `editorial/family-evidence-matrix.ts` (`family_evidence_matrix_v3`: dona y barras apiladas `producer_now`, desde el adapter GA4) |
| Reglas de dibujo (cascada que cuadra, waffle por unidad, centro de la dona, suma de las apiladas, nombre de la cifra) | `render/figure-slots.ts` (`buildFigureSlides`, `buildStatSlides`, `FIGURE_CAPACITY`, `PDF_FIGURE_FAMILIES`); geometría del waffle `waffleUnitGeometry` en `src/lib/artifact-composer/chart-geometry.ts` |

Reglas del render y modelo web 1.4: arquitectura §15.

## 9. Gate de pruebas

`editorial/editorial-v2-producers.test.ts` («gate del criterio») comprueba, sobre los planes de los fixtures de ICO y
AEO, que **ningún hecho del período alimenta dos figuras**, que **cada gráfico declara su pregunta** y que el capítulo
respeta el orden. `editorial/figure-selection.test.ts` cubre la tabla de §5, el desempate, el orden, la dirección por
métrica y los casos de Sky (OTD en barras y en bullet es duplicado) y de la cascada (sus totales conviven con la tarjeta
de clics). El gate se suma a los existentes del dominio (consistencia del contrato de contenido y de la matriz familia
× evidencia); no los reemplaza.

## 10. Dónde vive

- **Canon técnico:** este documento + puntero en [`EFEONCE_INSIGHTS_ARCHITECTURE_V1.md`](EFEONCE_INSIGHTS_ARCHITECTURE_V1.md)
  §15 + fila en [`DECISIONS_INDEX.md`](DECISIONS_INDEX.md).
- **Sistema de diseño:** AXIS es su casa (decisión del operador, 2026-10-03): tokens `efeonceInsights`
  (`@efeoncepro/axis-tokens`), contrato `efeonce.insights-stat-card` (`@efeoncepro/axis-ui-contracts`) y la referencia
  del Lab `/references/insights/`. Versión 0.3.42 publicada (tag verificado 04/10) (arquitectura §6.4 y §14.12).
- **Dirección visual y motion de la tarjeta:**
  [`TASK-1975-efeonce-insights-stat-card-direction.md`](../ui/visual-directions/TASK-1975-efeonce-insights-stat-card-direction.md)
  y [`TASK-1975-efeonce-insights-stat-card-motion.md`](../ui/motion/TASK-1975-efeonce-insights-stat-card-motion.md)
  (sólo el Live anima; PDF y deck son estáticos).
- **Skill `efeonce-insights`:** `references/contracts.md`, `references/lessons.md` y el router en `SKILL.md`.
- **Documentación funcional:** `docs/documentation/insights/efeonce-insights-dominio-ediciones.md`.
- **Manual de uso:** `docs/manual-de-uso/insights/operar-efeonce-insights-api-mcp.md`.

## 11. Tarjetas con isotipo de canal (vigente desde 2026-10-03)

**Aprobada por el operador el 2026-10-03** (canvas de la tarjeta, tableros `Premium-Cifras-Canal`, `Deck-Cifras-Canal`,
`Cifras-Canal-Norma` y `Cifras-Canal-Inventario`) y **en producción** desde el release `36a73e7b7e19` (TASK-1990 contrato,
TASK-1996 render). Contrato de AXIS: `efeonce.insights-stat-card` 0.2.0; isotipos: `AXIS_PLATFORM_ASSETS` de
`@efeoncepro/axis-brand-assets` (19 plataformas, el mismo vocabulario que `INSIGHT_CHANNEL_IDS`).

- **De dónde sale la plataforma.** Del hecho sellado, nunca de un autor: la fuente manda sobre el canal (Search Console,
  GA4 e ICO tienen su isotipo aunque midan Google); si no, el `channelId` del hecho. Una sola resolución para PDF, deck y
  web: `presentation/stat-card.ts` (`statPlatformOf`, `statBoardChannelsOf`, `statItemView`).
- **Dónde va.** Si todas las cifras del tablero salen de las mismas plataformas (hasta 3), los isotipos van una vez junto
  al título (Search Console primero) y cada celda conserva su ícono. Si el tablero mezcla motores de respuesta, cada
  celda lleva el isotipo de su canal, se nombra por el canal y la métrica va debajo de la cifra. Si alguna cifra no tiene
  plataforma conocida, no se dibuja ningún isotipo: el título no afirma una fuente que no es.
- **Nunca los dos.** Una celda lleva isotipo o ícono; el canal va en el título o en las celdas. Estas reglas se cumplen
  por construcción y se prueban sobre el resolver con todas las mezclas de fuentes (`stat-card-channels.test.ts`) y sobre
  las páginas (`figure-slots.test.ts`).
- **Visitas por asistente de IA (GA4).** Hoy salen en dona cuando son 2–3 partes (pregunta de composición, §5) y el mismo
  hecho no se repite en tarjetas (`duplicated_fact`). La alternativa aprobada en el canvas, una tarjeta por asistente con
  su isotipo, existe en el contrato pero el planificador todavía no la elige: qué gana por defecto cuando las dos explican
  igual es una decisión abierta del operador (propuesta: tarjetas cuando hay período anterior, dona en el primer período
  medido; TASK-1990, Open Questions).

Pendiente de decisión: el color por orden de las partes en waffle y dona cuando la parte no declara rol (el plan aún no
declara `role`). En la dona real de Berel (septiembre 2026) Gemini queda pintado con el color de «oportunidad».
