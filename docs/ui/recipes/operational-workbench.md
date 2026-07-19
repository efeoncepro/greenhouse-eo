# Recipe: Operational workbench

## Intent

Operar una cola o inventario sin perder contexto. El usuario escanea, selecciona y ejecuta una decisión sobre el detalle activo.

## Composition

- Shell: `masterDetail`, `fluidity='rich'`.
- Header: `WorkbenchHeader` puede integrar `SignalStrip variant='integrated'`; no crear una KPI card hermana.
- `aside`: `InventoryList variant='rail'` con búsqueda/filtros y `SelectionRow`; sólo la selección activa se contiene/eleva.
- `primary`: identidad + evidencia + recomendación comparten un `OperationalSection variant='open'`; `ContextCommandBar` y, si aporta evidencia, `PreviewStage` son capas con roles distintos.
- Reading planes: `aside` y `primary` deben pertenecer a planos de trabajo explícitos del recipe. El canvas `background.default` sólo separa regiones; nunca recibe directamente títulos, listas, metadata o decisiones.
- Primer fold: contexto/título/status + señal integrada; rail/decisión conectados por seam; una acción primaria y un solo momento visual dominante.
- Mobile: inventario primero; detalle en drawer del Composition Shell, no dos columnas comprimidas.

## States and motion

- La selección usa cambio tonal + indicador lateral; no depende solo del borde.
- El detalle morfea in-place y preserva scroll/foco cuando cambia el ítem.
- Empty mantiene filtros y explica la recuperación. Partial identifica qué dato falta. Error conserva la última selección segura.

## Anti-patterns

- Cards idénticas para cada fila.
- `DetailHero` contenido seguido por otra decision card y otra preview card sin cambiar de plano.
- Tres botones primarios compitiendo.
- Inspector custom fuera de `CompositionShell`.
- Metadata crítica escondida en chips o tooltips.
- Encabezados, filas o copy operativa flotando sobre el canvas gris.
