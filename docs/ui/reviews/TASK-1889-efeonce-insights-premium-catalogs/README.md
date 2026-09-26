# TASK-1889 — Dossier de revisión: catálogos premium de Efeonce Insights

> Revisado 2026-09-25. Evidencia versionada: hojas lado a lado (canvas | render) en `fidelity/`, en color y en
> gris (`*.gris.png`); tabla en `fidelity/fidelity.json`; scorecard en
> `../TASK-1889-efeonce-insights-premium-catalogs.scorecard.json`.

## Cómo se midió

`pnpm insights:canvas-fidelity [--gray]` compone cada plantilla por el camino real (validación de slots,
`fillSlide` de Chromium, `assertSlideFitsCanvas`) con los datos de ejemplo de su página del canvas y la compara
contra `docs/ui/visual-directions/TASK-1889-efeonce-insights-premium-catalogs/paginas/<Board>.png`
(`pixelmatch`, umbral 0,1). Criterio: ≤ 1 % de píxeles distintos.

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
tabla, narrada y límites del informe; narrada y límites del deck. Pendientes de aprobación explícita del
operador.

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

## Deuda visual conocida

- Una figura ICO de un solo espacio deja media página vacía antes del cierre (Sky, pp. 5–8). No se rellena con
  contenido inventado.
- Coral sobre papel 2,94:1 (advisory): la oportunidad siempre lleva rótulo y forma, nunca sólo color.
