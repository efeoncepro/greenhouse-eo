# TASK-1552 — dossier visual local

Fecha: 2026-07-27  
Runtime: `efeonce-globe` · canary local `http://127.0.0.1:4324/producer`

## Evidencia

El browser canary registrado en `apps/studio-client/package.json` ejecuta:

```text
pnpm --filter @efeonce-globe/studio-client test
```

La corrida vigente pasó build, 113 tests del client y la matriz visual:

- 1440×1000: rail y CTA contenidos; un CTA primario; 28 iconos; sin overflow.
- 390×844: rail/CTA visibles; dock `negative/style/seed` abre sin overflow.
- 320×844: misma contención y disclosures operables.
- 390×844 con reduced motion: transición informativa del estado stale en 0.16 s.

Capturas generadas por el canary:

- `efeonce-globe/apps/studio-client/.captures/task-1552-composer/first-fold-1440.png`
- `efeonce-globe/apps/studio-client/.captures/task-1552-composer/first-fold-390.png`
- `efeonce-globe/apps/studio-client/.captures/task-1552-composer/first-fold-320.png`
- `efeonce-globe/apps/studio-client/.captures/task-1552-composer/first-fold-390-reduce.png`

## Revisión

La captura desktop muestra la jerarquía `prompt → dock → referencias → modo/modelo/forma → gasto`. La captura
mobile conserva la misma lectura, transforma la navegación a una columna y mantiene el riel alcanzable. El dock
reemplaza el cajón `advanced-controls`; las referencias tienen presencia visible y no dependen de un disclosure.

Este dossier no declara cierre: el scorecard queda en `PENDING_FUNCTIONAL_CLOSURE` porque todavía faltan la
derivación completa del dock desde capabilities, el panel lateral para herramientas con lienzo, la extracción CSS
verificable y la coordinación de `TASK-1555`.
