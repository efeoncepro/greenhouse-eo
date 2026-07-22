# Enterprise UI Review — Globe Creative Producer

## Verdict

`BLOCK` para aceptación visual final. La reauditoría posterior confirma que el source cerró los gaps principales
de viewer, inpaint, presupuesto, command palette, cuenta y modos avanzados, y que el halo aprobado de hover,
foco y edición sí funciona. La nueva GVC del fixture local muestra SVG Globe/Efeonce, glifos Tabler y fuentes
correctamente cargados. El `BLOCK` permanece porque el fixture vacío no demuestra todavía los estados ricos ni
la generación real por los commands de la UI. La matriz vigente está en
`approved-source-parity-audit-2026-07-22.md`.

Este verdict no invalida las mejoras ya demostradas: tokens y marcas oficiales, iconografía Tabler same-origin,
halo reactivo/persistente del composer, hover editorial, reduced motion y corrección del overflow móvil. Tampoco
autoriza degradar autoridad server-side para imitar fixtures del prototipo.

## Baseline y alcance

- Source-led baseline: `docs/ui/visual-sources/TASK-1505/approved-prototype.dc.html`.
- SHA-256 verificado: `7d0d689b7daeb6e409ae01c1bf478d700ea09059e0f20f7da3c85a53bb10e93f`.
- Runtime revisado: renderer, controller y client reales de `efeonce-globe/apps/studio-web`, alimentados por un
  fixture HTTP tipado. No se fabricó autoridad de negocio en el browser.
- Assets: wordmark/isotype Globe, logo Efeonce, CSS Tabler y fuentes se sirven desde los artefactos reales del
  runtime; el fixture local vigente verifica MIME, `nosniff`, unknown 404 y render visible.

## Evidencia inspeccionada

| Estado | Archivo | Resultado |
| --- | --- | --- |
| Desktop completo | `runtime-desktop-1440-full.png` | Composer + hero editorial + masonry + footer sin clipping |
| Presupuesto | `runtime-desktop-budget-popover.png` | Popover por encima del main, saldo/ledger honestos |
| Comparación | `runtime-desktop-compare.png` | 2 candidatos durables, diálogo real y medios adaptables |
| Mobile | `runtime-mobile-390-full.png` | Recomposition en una columna; header de 66 px; ancho sin overflow |
| Reduced motion | `runtime-mobile-390-reduced-motion.png` | Captura estable; 0 animaciones o transiciones computadas |
| Árbol accesible | `runtime-mobile-390.aria.md` | Tabs, headings, dialogs, labels, live regions y targets observables |

Hashes de los PNG y del baseline se verificaron con `shasum -a 256` el 2026-07-22.

## Scores

El scorecard machine-readable vive en
`docs/ui/reviews/TASK-1505-globe-creative-producer-surface.scorecard.json`. Promedio vigente: **4.39/5**. El
promedio no revierte el gate: fidelidad permanece bajo el mínimo porque faltan estados ricos observables y una
prueba de generación real por la UI.

## Hallazgos cerrados durante el gate

1. El logo Efeonce del footer era una aproximación tipográfica: fue reemplazado por el SVG oficial y validado
   en el fixture vigente como imagen cargada junto con Globe y Tabler.
2. El popover de créditos quedaba bajo el main por una regla de stacking más específica: el header ahora gana
   con un stacking context explícito y `z-index: 40`.
3. El header mobile repartía mal el ancho entre marca, tabs y presupuesto: recompuesto como grid de tres zonas;
   cada control no-inline conserva al menos 24 × 24 px.
4. El input numérico visualmente oculto seguía en el recorrido de foco: salió del tab order y el stepper visible
   quedó como grupo nombrado con output `aria-live`.
5. El botón de comparar estaba gateado contra `experiment.children` aunque su implementación consume
   `experiment.get`: el gate se alineó al reader real; la prueba de browser abre 2 candidatos.
6. Una regla tardía reactivaba transiciones con reduced motion: el override final ahora tiene especificidad
   suficiente y conserva transforms estructurales como el skip link.

## Microinteracciones y accesibilidad

- Hover/press/focus usan feedback breve; acciones esenciales no dependen de hover.
- Loading, generating, degraded, failed, blocked, ready y recovery conservan texto/icono además de color.
- Viewer y compare son diálogos nativos; Escape cierra y devuelve foco al trigger.
- `prefers-reduced-motion: reduce` produce cero animaciones/transiciones activas, sin mover el skip link a una
  posición visible accidental.
- Desktop y 390 px cumplen `scrollWidth === clientWidth` en el documento capturado.

## Reauditoría GVC del fixture local

- `.captures/2026-07-22T18-10-21_globe-creative-producer/` demuestra el halo reactivo, el foco luminoso, el halo
  persistente de `Editar`, teclado, reduced motion y ausencia de overflow en 1440 y 390 px.
- La misma evidencia muestra Globe, Efeonce, Tabler y las fuentes cargados. El fixture sirve `readPublicAsset`
  real, rechaza rutas desconocidas con `404` y sus pruebas MIME/`nosniff` pasan 3/3.
- Aunque el manifest conserva `env: staging`, esta ejecución usa un servidor local contract-backed; no es
  evidencia de staging live ni permite inferir su estado.
- No hay candidatos ni ledger en el fixture capturado, por lo que viewer, inpaint, reservas, palette, cuenta y
  modos avanzados requieren una segunda suite de estados ricos antes de promover baseline.

## Enterprise bar

La composición, paleta y sistema de motion base están alineados, pero la evidencia no sostiene todavía una
declaración de fidelidad premium. No se debe promover el runtime actual como baseline de sí mismo: primero hay
que capturar los estados ricos aprobados y ejecutar generaciones reales por la UI.

## Límite del verdict

La UI local no pasa todavía el gate de fidelidad visual final. Además de cerrar la matriz visual, el QA release
global debe aplicar y verificar migraciones, secretos, IAM, buckets, flags, scheduler/worker y canarios reales de
proveedores antes de declarar el Producer operativo end-to-end.
