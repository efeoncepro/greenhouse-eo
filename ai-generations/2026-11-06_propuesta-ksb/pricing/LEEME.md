# KSB Chile — cotizaciones V3 (06/11/2026)

Simulaciones del Cotizador V3 (`--current`, catálogo v14), en revisión: no son precio aprobado ni cotización
emitida. CLP neto, más IVA; UF a 41.263,57. 12 meses, `on_going`, mercado CL. Medios **fuera** del fee: los paga KSB
directo o se refacturan al costo, sin comisión (pack de Performance).

Cada nivel son dos cotizaciones, una por práctica: `performance-commerce-distribution` (objetivo 55 % y piso 45 %,
**estimados**) para pauta, lead gen, medición y cuenta, y `creative-managed-service` (45 % / 45 %) para contenidos y
redes.

| Nivel | Performance | Creative | Fee mes | Fee mes (UF) | Fee año (UF) | + medios 40 UF/mes = año (UF) | Margen |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Mínimo (sólo pauta acotada, sin contenidos) | 2.560.000 | — | 2.560.000 | ≈ 62 | ≈ 744 | ≈ 1.224 | 55,3 % |
| Esencial (7 roles, frecuencia mínima de las bases) | 4.990.000 | 2.980.000 | 7.970.000 | ≈ 193 | ≈ 2.318 | ≈ 2.798 | 55,2 % / 45,5 % |
| Recomendado (sistema completo) | 8.000.000 | 4.510.000 | 12.510.000 | ≈ 303 | ≈ 3.638 | ≈ 4.118 | 55,1 % / 45,2 % |

Ninguna fila queda bajo el piso. **Más del 98 % del costo es estimado**: todas las dedicaciones son estimaciones de la
práctica, sin persona asignada, y las herramientas compartidas (Zapier, Metricool, Frame.io) van con precio histórico
y el supuesto conservador de que KSB carga el plan entero.

**Dentro de las 720 UF no cabe ningún alcance sobre el piso**: sólo el mínimo de pauta ya cuesta ≈ 744 UF al año sin
medios. Con 40 UF/mes de medios, a la agencia le quedan 20 UF/mes (≈ 825 mil), un tercio del mínimo.

## Dedicaciones (FTE)

| Rol (bases) | Perfil | Mínimo | Esencial | Recomendado |
| --- | --- | --- | --- | --- |
| Account manager | ECG-016 | 0,08 | 0,15 | 0,30 |
| Estratega digital | ECG-022 | — | 0,08 | 0,15 |
| Paid media | ECG-008 | 0,15 | 0,20 | 0,30 |
| Paid media (ejecución) | ECG-009 | — | 0,15 | 0,25 |
| Lead generation | ECG-021 | 0,08 | 0,15 | 0,25 |
| Analista | ECG-031 | 0,05 | 0,10 | 0,20 |
| Content manager | ECG-010 | — | 0,15 | 0,30 |
| Redes | ECG-006 | — | 0,25 | 0,35 |
| Diseño | ECG-003 | — | 0,25 | 0,35 |
| Copy | ECG-011 | — | 0,10 | 0,20 |
| Video | ECG-018 | — | 0,12 | 0,20 |

El estratega va con ECG-022 y la ejecución de pauta con ECG-009 porque ECG-035 y ECG-033 no tienen costo en Chile en
el catálogo vigente.

## Archivos

`gen.py` (briefs) → `compose scaffold` → `demand.py` (asignaciones) → `compose quote`; `run.sh <clave> <sufijo>` hace
todo. Vigentes: `base-performance.v2`, `ese-performance.v1`, `ese-creative.v1`, `rec-performance.v1`,
`rec-creative.v2` (`.demand.json`, `.summary.json`, `.artifact.json`). Los `.summary.json` sin sufijo y
`rec-creative.v1` son corridas que no calcularon.
