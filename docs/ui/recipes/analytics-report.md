# Recipe: Analytics/report

## Intent

Contar una historia ejecutiva verificable: qué cambió, por qué importa y dónde mirar después.

## Composition

- Shell: `single` para reporte lineal; `leadPlusContext` si existe narrativa lateral persistente.
- Header: `WorkbenchHeader kind='report'` con periodo y export secundario.
- Señales: `SignalStrip variant='narrative'`, máximo tres insights.
- Cuerpo: métricas con jerarquía desigual, una narrativa dominante y evidencia en `OperationalSection variant='open'`; el plot puede tener fondo propio sin convertir toda la sección en otra card.
- Primer fold: conclusión legible, métrica protagonista y contexto temporal.
- Mobile: una conclusión por bloque; charts con contenedor `minWidth: 0` y datos accesibles.

## States and motion

- Métricas entran con stagger semántico; chart animation nunca demora el primer dato.
- Sin datos explica cobertura y cómo recuperarla; no muestra `$0` ni chart vacío decorativo.
- Partial distingue dato observado de inferido.

## Anti-patterns

- Grilla de cards clonadas.
- Color como única codificación.
- Títulos genéricos tipo “Resumen” sin conclusión.
