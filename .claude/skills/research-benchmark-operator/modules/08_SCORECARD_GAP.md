# 08 · Scorecard & Gap Analysis

El diseño (`06`) y los tipos (`07`) producen datos comparables. Este módulo los convierte en un **scorecard** legible y un **gap analysis** que dice qué hacer. Un benchmark que no termina en acción priorizada es un ejercicio académico.

## El scorecard

Una matriz clara: entidad + peers × métricas, con la posición relativa visible.

- **Ubica vs mediana Y top quartile**, no solo el promedio. El promedio lo distorsiona un outlier; la mediana + top quartile dice "dónde estás vs. el típico y vs. el mejor".
- **Codifica la posición** (arriba/en línea/abajo del benchmark) — pero el color/visual lo entrega `dataviz`; acá defines la rúbrica.
- **Rúbrica de scoring explícita:** cómo se puntúa cada métrica (percentil, escala 1–5, semáforo) y cómo se agrega (si agregas) — **ponderaciones declaradas**. Sin rúbrica declarada, el score es opinión disfrazada de dato.
- **Muestra el dato, no solo el score:** el número real + su fuente + `as-of`, para que sea auditable.

```
Métrica            | Efeonce | Mediana peers | Top quartile | Posición
-------------------|---------|---------------|--------------|----------
AI SoV (ChatGPT)   |   18%   |     22%       |     35%      | ▼ bajo mediana
AI SoV (Perplexity)|   24%   |     20%       |     33%      | ▲ sobre mediana
Tráfico orgánico   |  ...    |     ...       |     ...      | ...
```

## Gap analysis: del "qué" al "por qué"

El gap (la diferencia vs el benchmark) es el **síntoma**. El valor está en la **causa**:

1. **Cuantifica el gap** por métrica (vs mediana y vs top quartile — dos gaps distintos: "alcanzar lo típico" vs "alcanzar lo mejor").
2. **Descompón el gap en drivers.** Un AI SoV bajo no es una causa — es un resultado. Drivers posibles: poco contenido citable, sin datos propios, ausencia en las fuentes que la IA lee, marca débil en la categoría. Baja hasta el driver accionable.
3. **Prioriza los gaps** por impacto × esfuerzo (o ICE/RICE). No todos los gaps valen cerrarse; algunos son estructurales o no mueven la decisión.
4. **Convierte en iniciativas** con **target realista, owner y timeline**. "Subir AI SoV en Perplexity de 24% a 33% (top quartile) en 2 trimestres, produciendo N data studies citables — owner: content" es accionable; "mejorar la visibilidad IA" no.

## Fija targets con criterio

- **No target = 100%.** El objetivo suele ser **alcanzar el top quartile**, no el máximo teórico. Ser el mejor en toda métrica no es realista ni rentable.
- **Target por horizonte:** quick wins (cerrar el gap vs mediana) vs. aspiracional (top quartile).
- Ancla el target a la **decisión** y a la economía (¿cerrar este gap paga? → `commercial-expert`).

## Honestidad del benchmark (crítico)

- **Sin cherry-picking:** no elijas las métricas donde ganas para el pitch. El scorecard muestra dónde estás abajo también — eso es lo que lo hace creíble (y útil).
- **Declara limitaciones:** datos estimados, peers con información parcial, métricas no perfectamente comparables. Un benchmark honesto sobre sus límites es más fuerte, no más débil.
- **Confidence por métrica** (`05`): no todas las celdas del scorecard tienen la misma solidez.

## Checklist de salida

- [ ] Scorecard vs **mediana Y top quartile**, con dato real + fuente + `as-of`.
- [ ] **Rúbrica de scoring y ponderaciones declaradas**.
- [ ] Gaps **descompuestos en drivers** accionables (no solo el síntoma).
- [ ] Gaps **priorizados** (impacto × esfuerzo) → iniciativas con target/owner/timeline.
- [ ] Targets = top quartile realista, no 100%.
- [ ] Sin cherry-picking; limitaciones y confidence declarados.

## Cross-links

- Diseño → `06`; tipos → `07`; rigor/confidence → `05`.
- Entrega del scorecard → `09` + visual `dataviz`; priorización/economía → `commercial-expert`; para clientes → `11`.
- Artefacto → `templates/benchmark-scorecard.md`.
