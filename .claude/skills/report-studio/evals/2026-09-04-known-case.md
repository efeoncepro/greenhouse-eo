# Evaluación independiente parcial: mixed-cohorts

Fecha: 2026-09-04.
Evaluador: subagente report_market_pdf.
Independencia parcial: redacté `pdf-production.md`; no redacté `SKILL.md`, `evidence-and-continuity.md`, `data-visualization.md` ni el caso evaluado. Esta ejecución revisa exclusivamente contenido, cálculo y decisión de visualización; no certifica un PDF ni una investigación de mercado nueva.

## Material leído y ejecución

Leídos completos: `SKILL.md`, `references/evidence-and-continuity.md`, `references/data-visualization.md`, `evals/cases.json`.
Entrada exacta del caso: «Muestra 58 contenidos acumulados, 74 tareas del mes, 55 cierres a tiempo y 63 envíos a tiempo de 63 con fecha; faltan 11 fechas.»
La entrada es la evidencia de prueba; no se consultó Notion ni se afirma verificación live. No se inventó mes, fecha de corte ni resultados de tráfico/ventas.
Cálculos: 55/74×100 = 74,324324…%; 63/63×100 = 100%; 63/74×100 = 85,135135…%; 74−55 = 19; 74−63 = 11.
Redondeo de presentación: un decimal para proporciones no enteras.

## Salida cliente producida

**Producción y cumplimiento de plazos**

Hemos desarrollado **58 contenidos acumulados**. Esta cifra corresponde al programa completo y no debe confundirse con las **74 tareas registradas en el mes**.

De esas 74 tareas, **55 se cerraron dentro del plazo: 74,3%**. En las 19 restantes, esta información no permite confirmar un cierre dentro del plazo ni distinguir entre tareas abiertas y cierres posteriores. El cierre de una tarea y su envío a revisión son momentos diferentes.

Los **63 envíos con fecha registrada se realizaron a tiempo: 63 de 63**. Tenemos fecha de envío para el **85,1% de las tareas del mes —63 de 74—**; faltan fechas en 11 tareas. Por ello, no podemos extender ese cumplimiento al conjunto del equipo ni interpretar las 19 tareas restantes como 19 entregas tardías.

Estas cifras describen producción y cumplimiento. Por sí solas no permiten concluir que aumentaron las visitas o las ventas.

## Decisiones de visualización tomadas

- Presentar 58 en un bloque «Acumulado del programa», separado de métricas del mes; no una barra comparable con 74.
- Barra mensual de cierres, base 74: 55 a tiempo (74,3%) y 19 sin cierre en plazo confirmado (25,7%), con etiquetas directas; no afirmar que todas las 19 estén cerradas tarde.
- Barra de cobertura de fechas, también base 74: 63 con fecha (85,1%) y 11 sin fecha (14,9%). No colorear «sin fecha» como fracaso de entrega.
- Debajo, dato textual «63 de 63 envíos documentados a tiempo»; no gran medidor de 100% que oculte la cobertura.
- No embudo, no sumar 58+74, no comparación de áreas entre contenidos y tareas, no atribución a ventas.
- La figura propuesta debe llevar el mes/corte real antes de producción; el caso no los proporciona. No se inventan para esta prueba.
- No se renderizó gráfico: esta evaluación comprueba decisión y texto, no geometría ni contraste final.

## Resultado por criterio

| Criterio del caso | Resultado | Evidencia de esta ejecución |
|---|---|---|
| Separates accumulated and monthly populations | passed | Primer párrafo distingue 58 acumulados y 74 tareas mensuales; visualización separada. |
| Shows 55/74 and 63/63 separately | passed | Cierre 55 de 74 = 74,3%; envío 63 de 63 descrito en párrafo independiente. |
| Shows 63/74 coverage and 11 missing | passed | Cobertura explícita 85,1%, 63 de 74, 11 ausentes. |
| No 100% team-wide claim | passed | No aparece 100% destacado; se limita a envíos con fecha y se rechaza extrapolación al equipo. |
| No causal claim from output volume | passed | Último párrafo excluye inferir visitas o ventas de producción. |

Resultado: **5/5 criterios passed en esta prueba editorial**. No es un puntaje de diseño del informe ni evidencia de otros casos.

## Fallos concretos de instrucciones

No encontré contradicción ni instrucción que indujera un fallo de los cinco criterios. Los módulos explican denominador, cobertura, ausencia y separación entre producción e impacto con suficiente precisión.

Limitación del caso de evaluación: los módulos incluyen prácticamente las mismas cifras y el mismo ejemplo Berel. Por ello, el passed demuestra aplicación coherente al caso conocido, pero ofrece poca evidencia de generalización a otros universos. Recomendación para evaluación futura: agregar un caso oculto con otras bases (incluidos no aplicables) y unidades distintas; no alterar esta prueba retroactivamente.

Otra limitación de entrada: no identifica si 74 son tareas cerradas o todas las tareas del mes. El criterio y el ejemplo de visualización presuponen denominador de cierre 74. En producción real el ledger debe comprobar elegibilidad y estado antes de afirmar «las otras 19 se cerraron después». Para evitar ampliar hechos en una entrada aislada, la salida producida limita correctamente el estado de las 19 restantes hasta resolverlo. El caso actual debería declarar «74 tareas cerradas del mes» si espera el desglose a cierres posteriores. Esto es una ambigüedad concreta del escenario, no un fallo de las reglas de evidencia.
