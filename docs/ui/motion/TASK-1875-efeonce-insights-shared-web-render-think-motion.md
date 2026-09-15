# TASK-1875 — motion de la vista web compartida de Insights (Think)

Diseño inicial 2026-09-15. Reusar el patrón self-contained del hub (`MaturityLadder`, `StatusScreen`):
motion que «arma» lo que ya está en el HTML; nunca condiciona el primer paint.

## Triggers and Targets

- Entrada al viewport: reveal suave de cada sección (masthead no anima); claims del resumen con stagger corto.
- Figuras: dibujo progresivo una sola vez (barras crecen desde 0, líneas se trazan); count-up en `FactCallout`.
- Índice/anchors: scroll suave; `<details>` sin animación (nativo).
- No anima: tablas, metodología, descargas, footer, estados `StatusScreen` (ya traen su propio hero ambiental).

## Timing and Ownership

Tokens de duración/easing de `efeonce-think/src/lib/report-tokens.ts` (los mismos del Grader); sin literales nuevos.
Cada primitiva (`FactCallout`, `ChartFigure`) posee su motion; la página no orquesta timelines globales.
Fail-safe: si el JS no corre, el contenido es idéntico y completo.

## Reduced Motion

`prefers-reduced-motion: reduce` desactiva reveal, stagger, count-up y dibujo progresivo; las figuras se pintan
en su estado final; sin transición de scroll. Evidencia GVC con la preferencia activada.

## GVC Scenario Plan

Captura de `summary` y `chapter-<module>` con motion terminado y con reduced motion; comparación visual entre
ambas debe ser idéntica en contenido y layout.

## Design Decision Log

Motion mínimo y de lectura (no de deleite): la pieza es un informe que se reenvía; el count-up y el dibujo de
barras sostienen la percepción de «dato que se arma», ya validada en el informe del Grader.
