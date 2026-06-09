# GVC durable baselines

Home durable (SSOT) de los mockups aprobados para el contrato visual mockup → runtime de
Greenhouse Visual Capture (`GVC`, TASK-1018).

A diferencia de `.captures/` (gitignored, timestamped, purgado por `fe:capture:gc` >30d), este
directorio **se commitea**: es el contrato compartido cross-máquina / cross-agente contra el que
`fe:capture` compara cada captura runtime.

## Estructura

```
scripts/frontend/baselines/
  <surfaceId>/
    <viewport>__<frameLabel>.png        # frame aprobado (masked, idealmente clipped)
    <viewport>__<frameLabel>.mask.json  # { rects: FrameMaskRect[] } regiones dinámicas
```

- `surfaceId` = identidad estable de la superficie (e.g. `agency.organizations.list`), declarada en
  `scenario.baseline.surfaceId`.
- `viewport` = `scenario.viewportName` (o `default`).
- `frameLabel` = el `label` del `mark`.

## Promover un mockup aprobado

```bash
# 1. Capturá el mockup aprobado (un leaf dir con frames/, p.ej. una variante)
pnpm fe:capture <scenario> --env=local

# 2. Promové esa captura al home durable (keyed por baseline.surfaceId)
pnpm fe:capture:diff --promote .captures/<ISO>_<scenario>

# 3. Commiteá scripts/frontend/baselines/<surfaceId>/
```

El runtime luego declara el mismo `baseline.surfaceId` + thresholds (`maxDiffRatio` /
`maxChangedPixels`) y `fe:capture` corre el diff automáticamente, degradando honesto a
`baseline_stale` (warning) si el home durable falta.

> El diff sólo es válido bajo captura determinista (animaciones off, caret oculto,
> `deviceScaleFactor` fijo, fonts settled, reduced-motion) — GVC lo aplica automáticamente
> cuando el scenario declara `baseline.surfaceId`.
