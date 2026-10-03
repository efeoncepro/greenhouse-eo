# Efeonce Insights — criterio de selección de gráficos V1

- Status: **Accepted** — criterio aprobado y canonizado por el operador el 2026-10-03; **implementación pendiente**
  (task de implementación de EPIC-045, por crear). Hasta que esa task cierre, el runtime sigue eligiendo figuras con
  la lógica actual (ver §2).
- Date: 2026-10-03
- Owner: Platform / Architecture + Client Experience; Julio Reyes como autoridad de producto.
- Scope: planificador editorial de Insights (contrato editorial v2), matriz familia × evidencia, catálogos PDF
  `insights-report` e `insights-deck` y vista web en `efeonce-think`.
- Reversibility: two-way; cambia cómo se planifican las ediciones nuevas. Las ediciones ya emitidas son snapshots
  congelados y no se reescriben.
- Validated as of: 2026-10-03 — caso de referencia medido con el código en producción (septiembre 2026 contra agosto,
  Berel y Sky). El criterio en sí no tiene código todavía.
- Program: [EPIC-045](../epics/to-do/EPIC-045-efeonce-insights-multiformat-intelligence.md).
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

## 2. Estado actual del runtime vs. estado objetivo

| Aspecto | Estado actual (código en producción, 2026-10-03) | Estado objetivo (este criterio) |
|---|---|---|
| Contrato de familias | 15 familias en `CHART_FAMILIES` (`contracts/chart-spec.ts`) | Igual; se suma la **tarjeta de cifra** como tipo de figura nuevo, que no es una familia de gráfico |
| Familias con evidencia | Matriz `family_evidence_matrix_v2`: barras, barras agrupadas, línea, bullet, cascada y waffle | Se amplía para habilitar las familias que el criterio pide y hoy figuran sin evidencia (dona, barras apiladas), cada una con su evidencia en el adapter dueño |
| Familias con página PDF | 4: barras, barras agrupadas, línea y bullet (`PDF_FIGURE_FAMILIES` en `render/figure-slots.ts`); las demás se omiten del PDF y quedan sólo en la web | Plantillas PDF y deck también para cascada, waffle, dona y barras apiladas, más la tarjeta de cifra |
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
- El período se escribe con el valor anterior: «vs {valor} en {período}».
- Dirección visual aprobada (2026-10-03):
  [`TASK-1975-efeonce-insights-stat-card-direction.md`](../ui/visual-directions/TASK-1975-efeonce-insights-stat-card-direction.md).

### 5.2 Tarjetas y gráficos en un capítulo

Aprobado por el operador el 2026-10-03, junto con la tarjeta de cifra.

1. **Orden del capítulo:** cifras → evolución → explicación → composición → comparación. La familia que no aplica se
   salta; el orden no se invierte.
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
| Qué consultas explican el cambio (cascada) | Qué explica | Cascada (se queda; falta su página PDF) | Correcta |
| Páginas que más movieron los clics (barras) | Comparar ordenados | Barras horizontales (se queda) | Correcta |
| Visitas desde asistentes de IA (barras) | Cuántas y de dónde | Tarjeta + dona (ChatGPT, Gemini, otros) | Valor + composición de 3 partes |
| Tono de las respuestas (waffle) | Cómo hablan de la marca | Waffle (se queda) | 8 respuestas, cada cuadro una |
| Tipo de fuente citada (waffle) | Qué sitios citan | Barras horizontales ordenadas | 6 categorías no se leen en waffle |
| Sky: 3 barras contra el mes anterior + 3 bullets | ¿Cumplimos las metas? | 1 figura de bullets (las 3 metas) + tarjeta de piezas entregadas | Cada métrica aparecía dos veces |

**Resultado esperado:** Berel pasa de 7 de 10 figuras en barras a 6 familias distintas; Sky queda más corto y sin
datos repetidos.

## 8. Lo que exige implementarlo

Nada de esto está hecho. Es el alcance de la task de implementación de EPIC-045, por crear.

1. **Tarjeta de cifra** como tipo de figura nuevo en el contrato del plan editorial. No es una de las 15 familias de
   gráfico: es una figura de cifra. Necesita su página o slot en el informe PDF (`insights-report`), su versión en el
   deck (`insights-deck`) y su render en Think (`efeonce-think`).
2. **Plantillas PDF y deck** para cascada, waffle, dona y barras apiladas. Hoy `PDF_FIGURE_FAMILIES`
   (`src/lib/efeonce-insights/render/figure-slots.ts`) contiene barras, barras agrupadas, línea y bullet; las demás se
   omiten del PDF y quedan en la web. Sumar una familia al PDF sigue la regla de §15 de la arquitectura: plantilla en
   el catálogo y alta en ese conjunto.
3. **El criterio en el planificador** (`src/lib/efeonce-insights/editorial/deterministic-planner.ts`) como regla con
   pruebas: pregunta → familia, deduplicación (la meta gana al período anterior) y desempate por variedad.
4. **Ampliar la matriz familia × evidencia** (`src/lib/efeonce-insights/editorial/family-evidence-matrix.ts`, hermana
   del contrato de contenido `src/lib/efeonce-insights/presentation/content-contract.ts`). Hoy dona y barras apiladas
   figuran como `no_evidence`; habilitarlas exige el procedimiento que la propia matriz declara: evidencia en el
   adapter dueño, productor, test y subir `FAMILY_EVIDENCE_MATRIX_VERSION`.

## 9. Gate de pruebas

Un test que compruebe, sobre un plan real (fixtures de Berel y Sky), que:

- **ningún hecho alimenta dos figuras**, y
- **cada figura declara la pregunta que responde**.

El gate se suma a los existentes del dominio (consistencia del contrato de contenido y de la matriz familia ×
evidencia); no los reemplaza.

## 10. Dónde vive

- **Canon técnico:** este documento + puntero en [`EFEONCE_INSIGHTS_ARCHITECTURE_V1.md`](EFEONCE_INSIGHTS_ARCHITECTURE_V1.md)
  §15 + fila en [`DECISIONS_INDEX.md`](DECISIONS_INDEX.md).
- **Skill `efeonce-insights`:** `references/contracts.md`, `references/lessons.md` y el router en `SKILL.md`.
- **Documentación funcional:** `docs/documentation/insights/efeonce-insights-dominio-ediciones.md`.
- **Manual de uso:** `docs/manual-de-uso/insights/operar-efeonce-insights-api-mcp.md`.
