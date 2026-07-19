# Recipe: Command center

## Intent

Priorizar señales operativas, anomalías y acciones con lectura de situación en segundos.

## Composition

- Shell: `leadPlusContext`.
- `lead`: `WorkbenchHeader kind='commandCenter'` + `SignalStrip variant='exception'`.
- `primary`: cola priorizada y `OperationalSection` con señales explicadas.
- `aside`: contexto, responsables o actividad; nunca otro dashboard completo.
- Primer fold: estado global, tres señales como máximo y una acción de mitigación.
- Mobile: señales en carrusel/stack compacto y contexto después de la cola crítica.

## States and motion

- Cambios de severidad usan transición tonal breve y anuncio accesible.
- Nuevas excepciones se revelan con stagger corto; no pulso infinito.
- Estado degradado explica alcance, impacto y siguiente acción.

## Anti-patterns

- Semáforo de chips sin explicación.
- KPI wallpaper uniforme.
- Alertas rojas usadas como decoración.
