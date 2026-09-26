# TASK-1889 — Dossier de revisión: catálogos premium de Efeonce Insights

> **Estado: complete, en producción (2026-09-26).** Releases `0e87c7a443a2` (PR #240) y `f9257b9c94af`; ver
> §Evidencia en producción.
>
> Revisado 2026-09-25. Evidencia versionada: hojas lado a lado (canvas | render) en `fidelity/`, en color y en
> gris (`*.gris.png`); tabla en `fidelity/fidelity.json`; scorecard en
> `../TASK-1889-efeonce-insights-premium-catalogs.scorecard.json`.

## Cómo se midió

`pnpm insights:canvas-fidelity [--gray]` compone cada plantilla por el camino real (validación de slots,
`fillSlide` de Chromium, `assertSlideFitsCanvas`) con los datos de ejemplo de su página del canvas y la compara
contra `docs/ui/visual-directions/TASK-1889-efeonce-insights-premium-catalogs/paginas/<Board>.png`
(`pixelmatch`, umbral 0,1). Criterio: ≤ 1 % de píxeles distintos. Resultado: 20 de 21 páginas dentro; una
excepción aprobada (abajo). Una excepción nueva exige aprobación del operador.

Gates complementarios: `pnpm composer:visual-gate --catalog=insights` (27 frames a 0 px, deltas g–k en
`scripts/frontend/baselines/artifact-composer/BASELINE_DELTAS.md`) y `ui:quality` PASS 4,59 (piso 4,2).

## Fidelidad por página

| Página del canvas | Plantilla | Diferencia | Veredicto |
|---|---|---|---|
| Deck-Agrupadas | `InsightsFigureColumnsSlide` | 2.225 % | excepción aprobada |
| Deck-Comparacion | `InsightsFigureComparisonSlide` | 0.006 % | ✓ |
| Deck-Lectura | `InsightsReadingSlide` | 0.000 % | ✓ |
| Deck-Lineas | `InsightsFigureTrendSlide` | 0.008 % | ✓ |
| Deck-Metas | `InsightsFigureTargetsSlide` | 0.161 % | ✓ |
| Deck-Plan | `InsightsPlanSlide` | 0.000 % | ✓ |
| Deck-Resumen | `InsightsSummarySlide` | 0.000 % | ✓ |
| Premium-Agrupadas | `ReportFigureColumnsPage` | 0.028 % | ✓ |
| Premium-Capitulo | `ReportChapterPage` | 0.000 % | ✓ |
| Premium-Capitulo-02 | `ReportChapterPage` | 0.000 % | ✓ |
| Premium-Capitulo-03 | `ReportChapterPage` | 0.000 % | ✓ |
| Premium-Contraportada | `ReportBackCoverPage` | 0.000 % | ✓ |
| Premium-Evidencia | `ReportFigureComparisonPage` | 0.037 % | ✓ |
| Premium-Lectura | `ReportReadingPage` | 0.027 % | ✓ |
| Premium-Lineas | `ReportFigureTrendPage` | 0.027 % | ✓ |
| Premium-Metas | `ReportFigureTargetsPage` | 0.132 % | ✓ |
| Premium-Plan | `ReportPlanPage` | 0.026 % | ✓ |
| Premium-Portada | `ReportCoverPage` | 0.048 % | ✓ |
| Premium-Portada-Clara | `ReportCoverLightPage` | 0.052 % | ✓ |
| Premium-Portada-Clara-Creativo | `ReportCoverLightPage` | 0.186 % | ✓ |
| Premium-Resumen | `ReportSummaryPage` | 0.029 % | ✓ |

**Excepción aprobada (operador, 2026-09-25):** `Deck-Agrupadas` corre su contenido 3 px (top 97) respecto de las
otras tres láminas de figura (top 100). La plantilla queda alineada con ellas para que las láminas no salten al
pasarlas; con 97 mediría 0,008 %. El fixture la declara con techo 2,5 %: si se aleja más, el gate vuelve a fallar.

## Piezas sin página en el canvas (derivadas)

Se renderizan para revisión como `fidelity/derivada-*.png`: portada, aperturas y contraportada del deck; índice,
tabla, narrada y límites del informe; narrada y límites del deck. El operador aprobó el 2026-09-25 la estructura
del deck (portada, aperturas y contraportada derivadas de A4) junto con los PDFs internos de Berel y Sky.

## Ediciones reales

Compuestas localmente con `scripts/insights/preview-edition.ts --editorial-v2` (lectura de datos reales, logo
privado por el lector acotado del worker): Berel SEO + AEO (`EO-INS-000019`, informe 16 páginas, deck 13
láminas) y Sky ICO (`EO-INS-000022`, 12 y 9). Los PDFs NO se versionan (datos de cliente); quedan en
`.captures/insights-preview/`. Defectos que revelaron y se corrigieron (`198ce883a` (antes `b88fd447c`)):

1. Métricas SEO en un eje común (todas con canal `google`): ahora comparación, cada una en su escala.
2. Capitular suelta en narradas de afirmaciones cortas: sólo con primer párrafo de ≥ 3 líneas.
3. Presupuestos cortos para datos reales: cabecera del A4, pestaña y título de figura del deck.
4. Etiquetas largas en columnas: corte por palabra en hasta tres líneas; la figura crece.
5. Vista previa sin logo privado: resuelto con el mismo lector del worker.

## Regla de variación (tablas y figuras)

- El **triángulo** sigue al valor: ▲ subió, ▼ bajó.
- El **tono** dice si el cambio es mejor o peor para esa métrica.
- Dirección de la métrica, en este orden: la que declara el propio hecho (`dimension.direction`); la posición siempre
  es «menor es mejor»; la de un hecho de referencia (meta/banda) de la misma métrica (`target.<métrica>` /
  `band.<métrica>`, que nombran su métrica en `dimension.metric`). Sin dirección conocida, tono neutro: nunca se
  adivina.
- API en `src/lib/efeonce-insights/render/figure-slots.ts`: `directionOf`, `higherIsBetterOf`, `trendOf` →
  `'<up|down|flat>:<better|worse|neutral>'`. CSS: `delta--better` / `delta--plain` (reemplazan a
  `delta--up/down/flat`) y `fig-delta--plain`.

## Evidencia en producción

- El operador aprobó el 2026-09-25 los PDFs internos de Berel (`EO-INS-000019`) y Sky (`EO-INS-000022`).
- 2026-09-26, con autorización explícita del operador, se crearon por el lane ecosystem y se renderizaron en
  producción dos ediciones internas: Berel `insed-7d470d9f-7119-4a84-b8af-c3fb584ceb92` (A4 16 páginas + deck 15
  láminas) y Sky `insed-9370d0cc-eb60-43c5-a547-70f10e011309` (A4 12 + deck 10). Los cuatro PDF salieron al primer
  intento (Job `artifact-worker`). Emitir y compartir siguen OFF en producción: nada llegó a clientes.
- Regla de variación verificada en el PDF de Sky: RpA «▼ 7,6 %» y entregas a tiempo «▲ 1,8 pp» en tono mejor;
  primera entrega correcta «▼ 5,6 pp» en tono peor. Berel: posición «▲ 0,8 pos.» en tono peor.
- Tiempos: un PDF 6–7 s; el dispatcher toma un output por ciclo de 2 min; un informe completo (deck + A4) ≈ 4–5 min.

## Deuda visual conocida

- Una figura ICO de un solo espacio deja media página vacía antes del cierre (Sky, pp. 5–8). No se rellena con
  contenido inventado.
- Coral sobre papel 2,94:1 (advisory): la oportunidad siempre lleva rótulo y forma, nunca sólo color.
