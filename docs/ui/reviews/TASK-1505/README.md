# Enterprise UI Review — Globe Creative Producer

## Verdict

`PASS` para el alcance UI local de TASK-1505. La corrida rica final reemplaza el `BLOCK` del fixture vacío:
demuestra estimate pre-spend, seed, negative constraint, autoridad fail-closed, feed editorial, presupuesto,
viewer con medio real, teclado, reduced motion y recomposición exacta a 390 px.

El resultado no declara staging ni producción operativos. Migrations, IAM, grants, flags, workers, proveedores y
canarios siguen en sus tasks dueñas; TASK-1505 permanece `code complete, rollout pendiente`.

## Evidencia final

- Captura: `.captures/2026-07-22T23-03-58_globe-creative-producer/`.
- Dossier: `.captures/2026-07-22T23-03-58_globe-creative-producer/review-dossier.md`.
- Cobertura: 2 variantes, 38 frames, desktop 1440 × 1000 y mobile 390 × 844.
- Runtime/layout: 0 errores de consola, página o HTTP; sin overflow ni clipping bloqueante.
- Interacción: foco visible, teclado, Escape/restore, estados seleccionados y reduced motion equivalentes.
- Performance local: FCP 160 ms desktop y 64 ms mobile.

## Score enterprise

Promedio **4.72/5**, mínimo **4.6/5**, sin dimensiones bajo el umbral y sin `BLOCK`. Las dimensiones críticas de
jerarquía, economía de superficies, impacto visual, fidelidad y resistencia a template genérico quedan todas en
`>=4.7`. Matriz machine-readable:
`docs/ui/reviews/TASK-1505-globe-creative-producer-surface.scorecard.json`.

## Decisiones verificadas

- `Generate` queda inhabilitado hasta recibir una cotización server-side vigente; cambiar prompt, shape, seed o
  constraint invalida la estimación.
- Seed lock/input/reroll y negative prompt producen conditioning gobernado sin exponer campos vendor.
- Los seis modos dependientes de assets consultan `globe.asset.provenance.list` y fallan cerrados.
- El viewer usa medio recuperado mediante grant gobernado; el fixture no otorga autoridad browser-side.
- La regla exacta de 390 px recompone composer, feed y viewer sin convertir mobile en desktop comprimido.

## Límites y seguimientos

- El fixture HTTP es contract-backed, determinístico y sin gasto; no prueba provider execution ni rollout vivo.
- El warning `baseline_stale` es esperado: la fuente aprobada sigue canónica y no se promovió un baseline nuevo sin
  autorización explícita.
- Tras el rollout de dependencias debe repetirse el escenario contra el runtime desplegado antes de declarar la
  capacidad operativa end-to-end.

La auditoría previa permanece como historia en
`approved-source-parity-audit-2026-07-22.md`; sus blockers visuales quedan supersedidos por esta evidencia, no sus
gates de rollout.
