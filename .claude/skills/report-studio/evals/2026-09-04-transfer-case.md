# Evaluación de transferencia: Acme

Fecha: 2026-09-04. Evaluador report_market_pdf; independencia parcial conservada: redactó el módulo PDF, no los módulos de evidencia/visualización usados aquí.

Entrada suministrada de prueba: Acme; 91 piezas acumuladas; septiembre 80 tareas cerradas, de las cuales 10 canceladas no aplican a puntualidad; 70 elegibles, 61 cierres dentro de plazo; 63 tienen fecha del primer envío, 59 a tiempo. No se verifica un sistema externo ni se inventa año o corte del acumulado.

## Resumen para el cliente

**Producción y puntualidad de Acme**

El programa registra **91 piezas acumuladas**. Esta cifra corresponde al trabajo acumulado y se presenta por separado de las tareas de septiembre.

En septiembre se registraron **80 tareas cerradas**. Para evaluar puntualidad excluimos 10 cancelaciones documentadas: la base es de **70 tareas elegibles**. De ellas, **61 se cerraron dentro del plazo, un 87,1%**. Las 9 restantes no figuran como cierres dentro del plazo en la información disponible.

En los primeros envíos, **59 de los 63 casos con fecha registrada se realizaron a tiempo: 93,7%**. La cobertura del registro es de **63 de 70 tareas elegibles, un 90,0%**; faltan fechas en 7 tareas. Otros 4 casos tienen fecha, pero no están identificados como envíos a tiempo. No atribuimos retrasos a los registros sin fecha ni extendemos el 93,7% a las 70 tareas.

Las cancelaciones se mantienen visibles, pero no cuentan como incumplimientos. Estas cifras describen producción y puntualidad; por sí solas no prueban resultados comerciales.

## Cálculos reproducibles

| Indicador | Fórmula | Resultado de presentación |
|---|---|---|
| Tareas elegibles | 80 − 10 | 70 |
| Puntualidad del cierre | 61 / 70 × 100 | 87,1% |
| Cierres elegibles no identificados dentro de plazo | 70 − 61 | 9 |
| Puntualidad del primer envío documentado | 59 / 63 × 100 | 93,7% |
| Cobertura de fecha de primer envío | 63 / 70 × 100 | 90,0% |
| Tareas elegibles sin fecha de primer envío | 70 − 63 | 7 |
| Casos con fecha no identificados como envío a tiempo | 63 − 59 | 4 |

## Decisiones aplicadas

- 91 piezas acumuladas no se suman ni comparan como tasa con 80 tareas mensuales.
- 10 cancelaciones documentadas son no aplicables; no se convierten en fallos ni se ocultan.
- Puntualidad de cierre usa 70, no 80; puntualidad de envío documentado usa 63, no 70 ni 80.
- Cobertura usa 63/70 y muestra 7 ausentes; no mide puntualidad.
- No se inventa causa, duración de retraso, fecha o estado adicional de los 9 cierres restantes ni de los 4 envíos no identificados a tiempo.
- Si se graficara: tres relaciones separadas —elegibilidad 70/80, cierre 61/70 y cobertura 63/70— y envío 59/63 con su cobertura junto al dato. No un embudo.

## Resultado

| Criterio | Estado |
|---|---|
| Separación acumulado/mes/unidades | passed |
| Exclusión documentada de canceladas sin penalizar puntualidad | passed |
| Cierre calculado con base elegible 70 | passed |
| Envío calculado con base documentada 63 | passed |
| Cobertura 63/70 y 7 ausentes visibles | passed |
| Sin inventar estados ni resultados comerciales | passed |

**6/6 criterios de esta prueba de transferencia cumplidos.** Es evaluación editorial y aritmética de un escenario suministrado; no prueba renderizado ni accesibilidad de un artefacto. Los números y exclusiones difieren del ejemplo explícito de la skill; no se modificó la skill durante la prueba.
