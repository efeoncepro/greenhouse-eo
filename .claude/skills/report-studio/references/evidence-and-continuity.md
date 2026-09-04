# Evidencia, comparabilidad y continuidad

Este contrato es diseño operativo de Efeonce informado por las fuentes de
[SOURCES.md](../SOURCES.md). No redefine métricas de dominio ni certifica una
metodología. Se aplica antes de escribir conclusiones y diseñar gráficos.

## 1. Un manifiesto por métrica

Conserva una fuente de datos para todas sus apariciones en texto, tabla y figura.
Registra, proporcionalmente al informe:

| Campo | Contenido mínimo |
|---|---|
| Identidad | ID, etiqueta comprensible, definición y pregunta que responde |
| Naturaleza | Observado, calculado o estimado; producción, comportamiento o impacto |
| Unidad | Conteo, moneda, tiempo, proporción; precisión y redondeo |
| Base | Numerador, denominador, población, exclusiones y cobertura |
| Tiempo | Período, comparación, zona horaria, corte y fecha de extracción |
| Fuente | Sistema, propiedad, consulta/export, filtros y enlace de evidencia |
| Método | Fórmula, versión, ponderación, deduplicación y tratamiento de ausentes |
| Calidad | Limitaciones, incertidumbre, revisión y responsable de validación |

Una cifra sin evidencia suficiente puede ser una pregunta pendiente; no la
rellenes para completar una tarjeta. No conviertas estimaciones en observaciones.
No publiques datos sensibles del ledger que el lector no necesita recibir.

## 2. Comprobar equivalencia antes de calcular variaciones

Compara definición, población, período, filtros y método. Declara la comparación
como equivalente, con ruptura metodológica o no comparable según la evidencia.
La consistencia de formato no vuelve equivalentes dos mediciones distintas.

No sumes clics, sesiones, usuarios, impresiones y entregables entre sí. No dibujes
un embudo sin población y recorrido vinculables. Separa acumulado, flujo del mes
y estado al corte. Una comprobación posterior no reconstruye todo el mes anterior.

Expresa tasas con su base cuando pueda cambiar la interpretación. «63 de 63 casos
con fecha» no significa «todos los casos» si hay otros sin fecha. Muestra cobertura
sobre el universo elegible. Ausente, no aplicable y cero son valores diferentes.

Distingue variación relativa (%) de diferencia entre tasas (puntos porcentuales).
Una tasa también puede tener variación relativa si se etiqueta y se muestran ambas bases.
Explica bases cero y no calcules crecimiento infinito. Calcula con precisión
completa y redondea al presentar. Una media ponderada exige pesos apropiados al
concepto; no promedies promedios indiscriminadamente.

## 3. Separar lo entregado del efecto

Producción acredita actividad o entregables. Resultados de audiencia describen
cambios observados. Impacto comercial requiere evidencia del resultado de negocio.
No convertir publicaciones en ventas ni eventos de navegación en contactos.

Una relación temporal puede justificar investigar, pero no probar atribución.
Registra fechas de implementación y explicaciones alternativas. Si no existe
contrafactual o método causal adecuado, limita la conclusión a asociación o
contribución plausible y explica su sustento.

## 4. Validar el instrumento y la afirmación

Un cálculo reproducible puede proceder de un instrumento que no mide la pregunta
correcta. Inspecciona entradas, cobertura y evidencia original antes de interpretar
scores, clasificaciones o resúmenes generados por IA.

En graders revisa preguntas realmente ejecutadas, categoría, competidores,
mercado, motores, respuestas y versión. Separa menciones espontáneas de inducidas.
Un HTTP 200 con HTML de fallback no prueba API ni MCP. Si falla nuestra medición,
asume la corrección del instrumento; no conviertas su defecto en una carencia del
cliente ni inventes un score corregido. Aplica la skill especializada del dominio.

Conserva para afirmaciones materiales: texto, clase de afirmación, evidencia,
límite, posibles explicaciones alternativas y comprobación pendiente. Una falla
de cobertura o validez no se resuelve inventando un intervalo estadístico.

## 5. Mantener el registro histórico

Lee informes anteriores completos y conserva identidad/origen de cada hallazgo.
Por registro incluye estado anterior, evidencia anterior, evidencia actual con
fecha, estado actual, alcance residual, responsable y criterio de cierre.

Usa el vocabulario canónico del dominio. Para auditorías SEO/AEO: corregido,
parcial, persiste y no comparable; nuevo o regresión pueden describir la evolución.
La ausencia del hallazgo en una muestra menor no acredita corrección.

Un estado antiguo de una tarea no demuestra retraso del cliente. Contrasta tareas,
aprobaciones y superficie publicada. Una corrección ejecutada y verificada no
acredita por sí sola mejora de tráfico, ventas o experiencia medida.

## 6. Convertir hallazgos en acciones verificables

Cada acción declara ID, cambio concreto, motivo de prioridad, ejecutor, coordinación,
próximo hito, dependencia y criterio de cierre. Usa una fecha confirmada o indica
que está por acordar; no inventes compromisos para llenar la tabla.

Separa acciones con distintos responsables o cierres. «Mejorar sitio y medición»
no permite verificar nada; corregir una ruta y validar un evento son acciones
separables. El plan no desaparece los pendientes de menor prioridad del registro.

## 7. Preservar evidencia al entregar

Recalcula totales y tasas, revisa exclusiones y compara cada afirmación material
con su fuente. Comprueba secuencia y multiplicidad de tablas, no sólo que un valor
aparezca en alguna parte. Conserva IDs, relaciones y fecha de revisión.

Lee de vuelta el archivo final y cada sistema actualizado. Registra versión,
fuente editable y evidencia de QA; separa generado, verificado, guardado y enviado.
Si sólo un destino fue verificado, no declares completa la sincronización.
