# TASK-1975 — Dossier de revisión: páginas de cifras, cascada, waffle, dona y apiladas de Efeonce Insights

> **Estado: en producción desde el 2026-10-03** (release `36a73e7b7e19`, orquestador `37158679961`; Think `0c5701a`;
> AXIS `v0.3.42`). TASK-1974 (planificador y contrato) y TASK-1975 (render y diseño) salieron en el mismo release.
>
> Revisado 2026-10-03. Evidencia versionada en esta carpeta: cuatro hojas lado a lado (canvas | render) copiadas de
> `../TASK-1889-efeonce-insights-premium-catalogs/fidelity/`, donde viven las 31 hojas en color y en gris y la tabla
> `fidelity.json`. Scorecard: `../TASK-1975-efeonce-insights-new-figure-pages.scorecard.json`.

## Qué se revisó

Diez plantillas nuevas, cinco por catálogo, sobre la anatomía de figura de TASK-1889:

| Figura | A4 (`insights-report`) | Deck (`insights-deck`) |
|---|---|---|
| Cifras | `report-figure-stat` | `insights-figure-stat` |
| Cascada | `report-figure-waterfall` | `insights-figure-waterfall` |
| Waffle | `report-figure-waffle` | `insights-figure-waffle` |
| Dona | `report-figure-donut` | `insights-figure-donut` |
| Barras apiladas | `report-figure-stacked` | `insights-figure-stacked` |

Más el cambio transversal de la variación (tono semántico y triángulo redondeado) en las plantillas que ya existían, y
la tarjeta de cifra con su motion en la página web de Think (modelo web 1.4).

Dirección y decisiones: [`TASK-1975-efeonce-insights-stat-card-direction.md`](../../visual-directions/TASK-1975-efeonce-insights-stat-card-direction.md);
wireframe [`TASK-1975-efeonce-insights-new-figure-pages.md`](../../wireframes/TASK-1975-efeonce-insights-new-figure-pages.md);
motion [`TASK-1975-efeonce-insights-stat-card-motion.md`](../../motion/TASK-1975-efeonce-insights-stat-card-motion.md).

## Cómo se midió

`pnpm insights:canvas-fidelity` compone cada plantilla por el camino real (validación de slots, `fillSlide` de
Chromium, `assertSlideFitsCanvas`) con los datos de su hoja del canvas y la compara contra
`docs/ui/visual-directions/TASK-1889-efeonce-insights-premium-catalogs/paginas/<Hoja>.png` (`pixelmatch`, umbral
0,1). Criterio: ≤ 1 % de píxeles distintos.

## Fidelidad por hoja

Valores de `fidelity.json` tal como quedaron en el commit `0b0233de3` (2026-10-03 11:41), la última corrida de la
herramienta.

| Hoja del canvas | Plantilla | | Diferencia | Veredicto |
|---|---|---|---|---|
| Premium-Cifras | `ReportFigureStatPage` | nueva | 0,050 % | ✓ |
| Deck-Cifras | `InsightsFigureStatSlide` | nueva | 0,529 % | ✓ |
| Premium-Cascada | `ReportFigureWaterfallPage` | nueva | 0,590 % | ✓ |
| Deck-Cascada | `InsightsFigureWaterfallSlide` | nueva | 0,539 % | ✓ |
| Premium-Waffle | `ReportFigureWafflePage` | nueva | 0,032 % | ✓ |
| Deck-Waffle | `InsightsFigureWaffleSlide` | nueva | 0,008 % | ✓ |
| Premium-Donut | `ReportFigureDonutPage` | nueva | 0,113 % | ✓ |
| Deck-Donut | `InsightsFigureDonutSlide` | nueva | 0,017 % | ✓ |
| Premium-Apiladas | `ReportFigureStackedPage` | nueva | 0,091 % | ✓ |
| Deck-Apiladas | `InsightsFigureStackedSlide` | nueva | 0,155 % | ✓ |
| Deck-Agrupadas | `InsightsFigureColumnsSlide` | existente | 2,227 % | excepción aprobada (2026-09-25, techo 2,5 %) |
| Deck-Comparacion | `InsightsFigureComparisonSlide` | existente | 0,094 % | ✓ |
| Deck-Lectura | `InsightsReadingSlide` | existente | 0,000 % | ✓ |
| Deck-Lineas | `InsightsFigureTrendSlide` | existente | 0,008 % | ✓ |
| Deck-Metas | `InsightsFigureTargetsSlide` | existente | 0,192 % | ✓ |
| Deck-Plan | `InsightsPlanSlide` | existente | 0,000 % | ✓ |
| Deck-Resumen | `InsightsSummarySlide` | existente | 0,000 % | ✓ |
| Premium-Agrupadas | `ReportFigureColumnsPage` | existente | 0,036 % | ✓ |
| Premium-Capitulo | `ReportChapterPage` | existente | 0,000 % | ✓ |
| Premium-Capitulo-02 | `ReportChapterPage` | existente | 0,000 % | ✓ |
| Premium-Capitulo-03 | `ReportChapterPage` | existente | 0,000 % | ✓ |
| Premium-Contraportada | `ReportBackCoverPage` | existente | 0,000 % | ✓ |
| Premium-Evidencia | `ReportFigureComparisonPage` | existente | 0,439 % | ✓ |
| Premium-Lectura | `ReportReadingPage` | existente | 0,027 % | ✓ |
| Premium-Lineas | `ReportFigureTrendPage` | existente | 0,027 % | ✓ |
| Premium-Metas | `ReportFigureTargetsPage` | existente | 0,336 % | ✓ |
| Premium-Plan | `ReportPlanPage` | existente | 0,026 % | ✓ |
| Premium-Portada | `ReportCoverPage` | existente | 0,048 % | ✓ |
| Premium-Portada-Clara | `ReportCoverLightPage` | existente | 0,052 % | ✓ |
| Premium-Portada-Clara-Creativo | `ReportCoverLightPage` | existente | 0,186 % | ✓ |
| Premium-Resumen | `ReportSummaryPage` | existente | 0,029 % | ✓ |

**31 hojas dentro del umbral**, con la excepción ya aprobada de Deck-Agrupadas. Las diez nuevas quedan entre 0,008 % y
0,590 %. Varias existentes subieron respecto de TASK-1889 (Premium-Evidencia de 0,037 % a 0,439 %, Premium-Metas de
0,132 % a 0,336 %). Inferido, no medido por separado: coincide con el commit que llevó el triángulo redondeado y el
tono semántico a todas las figuras (`0b0233de3`), mientras esas hojas del canvas conservan la píldora de TASK-1889.
Siguen bajo 1 %.

Hojas versionadas en esta carpeta (izquierda canvas, derecha render):

- [`Premium-Cifras.png`](Premium-Cifras.png) — retícula de 6 cifras en A4.
- [`Deck-Cifras.png`](Deck-Cifras.png) — retícula 3 × 2 sobre azul marino, variación sin píldora rellena.
- [`Premium-Cascada.png`](Premium-Cascada.png) — cascada desde cero con el signo siempre impreso.
- [`Deck-Waffle.png`](Deck-Waffle.png) — waffle de un cuadro por unidad en el deck.

**Diferencias de registro que hay que alinear (no de diseño):**

- `BASELINE_DELTAS.md` §(v) cita las cifras del deck en 0,17 %; `fidelity.json` dice 0,529 % (y 0,096 % en el commit
  anterior, `dc2a92f62`). Ninguno de los dos coincide con 0,17 %. Manda `fidelity.json`; la frase de §(v) queda por
  corregir.
- La fidelidad **no se volvió a correr** después de `1ed956d44`, `592fbde4b` y `45fecefe2` (motion del modelo web,
  correcciones de la vista previa real y «Primer período medido»). El gate visual sí (abajo). Correrla de nuevo
  reescribe la carpeta de TASK-1889, por eso no se hizo en esta revisión.

## Gate visual del compositor

`pnpm composer:visual-gate --catalog=insights`, corrido de nuevo en esta revisión (2026-10-03, árbol en `256547db9`):

```
✓ 37 frame(s) idénticos al baseline para insights (0 píxeles de diferencia).
```

Diez frames nuevos y ocho que cambian, declarados y sellados en
`scripts/frontend/baselines/artifact-composer/BASELINE_DELTAS.md` §(v).

## Ediciones reales (septiembre 2026 contra agosto)

Compuestas en local con `scripts/insights/preview-edition.ts --editorial-v2 --output=both` (datos de producción en sólo
lectura). Los archivos quedan en `.captures/insights-preview/`, que no se versiona: datos de cliente. Lo que sigue es lo
verificado mirando las páginas.

**Berel, visibilidad orgánica y en IA (`EO-INS-000027`): informe de 22 páginas y deck de 18 láminas.**

- p. 5: cifras de SEO (6): clics, impresiones, CTR, posición media («Menor es mejor»), primera página y tráfico
  estimado («Estimado»). Bajas de clics e impresiones en rojo; la posición media sube y va en rojo con «Menor es mejor».
- p. 6: línea de clics por semana. p. 7: cascada de clics por consulta, de 16.390 a 13.606; los seis aportes
  (−622, −267, −114, −89, −49, −1.643) cuadran con el cambio, y la lectura propia dice qué consulta restó más.
- p. 8: barras de páginas que más cambiaron. p. 14: cifras de IA (Share of Model y respuestas con cita).
- p. 15: waffle del tono de las respuestas (8 cuadros, 4 positivas y 4 mixtas). p. 16: tipo de fuente citada en
  columnas ordenadas, con «Sin clasificar» al final.

**Sky, entrega (`EO-INS-000029`): informe de 10 páginas y deck de 8 láminas.**

- p. 5: una sola cifra a todo el ancho (piezas entregadas, 157 vs 328), con variación en gris porque la métrica no
  declara dirección.
- p. 6: una sola figura con las tres metas (entregas a tiempo, primera entrega correcta y rondas por pieza), cada una
  con su tono según su dirección. Ya no hay barras contra el mes anterior para las mismas métricas.

**Defectos que encontró la vista previa real y se corrigieron (commit `592fbde4b`):** leyenda de composición de 36
caracteres; una nota que imprimía «[object Object]»; fuente del deck de cifras de 76 caracteres; cascada sin lectura
propia y con «Sumó» en la leyenda sin pasos que sumen; metas con «menos es mejor» que mostraban «▲ 67 %»; nombre de
meta de 28 caracteres en el deck.

**Verificado con datos reales de GA4 (2026-10-03, después del release).** Vista previa de Berel `EO-INS-000027`
(26 páginas + 20 láminas) con la conexión GA4 activa de la organización:

- p. 8: barras apiladas de sesiones (35.118 → 29.972) con la parte con interacción. Captura:
  [`berel-2026-09-a4-apiladas-ga4-real.png`](berel-2026-09-a4-apiladas-ga4-real.png).
- p. 17: dona de sesiones desde asistentes de IA, ChatGPT 1.648 de 1.686 (98 %). Captura:
  [`berel-2026-09-a4-dona-ga4-real.png`](berel-2026-09-a4-dona-ga4-real.png).

Defecto que destapó: una parte con valor que redondea a 0 % se leía «0 %». Ahora se lee «<1 %» (`shareLabel` en
`figure-slots.ts`, commit `8e4fbac7b`). Queda una decisión abierta: el color de las partes de waffle y dona sin rol
declarado se asigna por orden, y en esta dona Gemini queda pintado con el color de «oportunidad».

**Observaciones de esta revisión, no corregidas:**

- ~~Berel p. 7: el lead «(−17,0 %)» corta la línea entre «17,0» y «%».~~ Corregido el 2026-10-03: los mappers unen la
  cifra a «%» y «pp» con espacio duro en todos los slots (`bindUnitSpaces`, test en `composition-helpers.test.ts`).
- Sky p. 1: la portada se titula «Insights ico 2026-08-01–2026-09-01», que es el título crudo del encargo. No es de esta
  task, pero conviene corregirlo en el encargo antes de compartir.

## Página web en Think (fuera del repo, no versionada aquí)

Capturas en `/Users/jreye/Documents/efeonce-think/.captures/task-1975-slice5/` (25 vistas en escritorio y 25 en móvil,
datos de ejemplo del modelo 1.4). Lo que muestran:

- **Retícula de cifras** con 1, 4 y 6 cifras (`*-stats-one`, `*-stats-four`, `*-stats-six`): en escritorio, 3 columnas
  con filetes, píldora teñida (rojo en las bajas, «Menor es mejor» bajo la posición media, «Estimado» en el tráfico); en
  móvil, una columna.
- **Motion** en tres tiempos (`*-stats-motion-500ms`, `-1400ms`, `-2600ms`): a 500 ms la cifra va a mitad de recorrido,
  la píldora todavía vacía y la cifra de «vs …» resaltada; al final, la variación ya tiene su tono.
- **Sección oscura** (`*-stats-finding-dark`): variación sin píldora rellena, tono sólo en el triángulo.
- **Waffle por unidad** (`*-waffle-units`): 8 cuadros para 8 respuestas, con la nota «Cada cuadro es una unidad; el
  total es 8».
- Más el resto del informe (portada, capítulos, tabla, límites, estados de error del enlace) para comprobar que no hubo
  regresiones.

Gates de Think corridos de nuevo el 2026-10-03 sobre `0c5701a` (producción): `pnpm test:insights` 25/25,
`verify:insights` verde (sin desborde) y `audit:insights-a11y` AA en 1440 y 390 (67 y 64 paradas de teclado, todas con
foco visible).

## Decisiones del operador (2026-10-03)

- **Criterio de selección de figuras** (`EFEONCE_INSIGHTS_CHART_SELECTION_CRITERIA_V1.md`): la pregunta decide la
  familia; un dato no se muestra dos veces (los totales de la cascada son la excepción de ancla); la variedad sólo
  desempata; orden del capítulo cifras → metas → evolución → explicación → composición → comparación.
- **Tarjeta de cifra en retícula**, en A4 y deck (canvas <https://claude.ai/artifact/9q7nThMhdphN5j8f3K3cbB>); deck con
  capacidad 6 (3 × 2); «vs {valor} en {período}».
- **Tonos semánticos** de la variación: mejor verde, peor rojo, neutro gris, con dirección declarada por métrica
  (`METRIC_DIRECTIONS`), en todas las figuras.
- **Tono por fondo**: sobre papel, píldora teñida; sobre azul marino, sin píldora rellena, tono sólo en el triángulo y
  cifra en tinta suave (en navy el rojo de «empeoró» era igual al coral de «oportunidad»). Triángulo de puntas
  redondeadas en todas las superficies.
- **Motion sólo en el Live**: la cifra recorre del valor anterior al actual y luego la variación toma su tono. PDF y deck
  estáticos.
- **AXIS es la casa del sistema de diseño de Insights** (tokens `efeonceInsights`, contrato
  `efeonce.insights-stat-card` 0.1.0 candidate).

**Pendientes de decisión:** tarjetas con isotipo de canal (AI Overview, ChatGPT, Gemini, Perplexity), propuestas en el
canvas y no implementadas; color por orden en waffle y dona cuyas partes no declaran papel.

## Estado del cierre (2026-10-03)

1. ~~Publicar AXIS, desplegar Think y hacer el release de Greenhouse.~~ Hecho: AXIS `v0.3.42`, Think `0c5701a`, release
   `36a73e7b7e19`.
2. ~~Verificar la dona y las apiladas con datos reales de GA4.~~ Hecho (arriba).
3. **Pendiente del operador:** revisar las ediciones internas de Berel y Sky antes de compartirlas (la emisión sigue
   apagada en producción).
4. ~~Gate de cierre.~~ CI y CI Deep del SHA del release verdes (suite completa y build de producción).
5. ~~Alinear la cifra de §(v) y volver a medir la fidelidad.~~ `pnpm insights:canvas-fidelity` corrido de nuevo el
   2026-10-03: mismos valores (30 hojas dentro del 1 %, Deck-Agrupadas con su excepción); §(v) corregida a 0,53 %.
