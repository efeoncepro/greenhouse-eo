# Leadership Rounds per Asset — Context Spec V1

| Campo | Valor |
|---|---|
| Metric name | Rounds per Asset — Leadership context |
| Metric ID propuesto | `leadership_rpa_avg` |
| Method version propuesto | `leadership_rpa_v1.0` |
| Status | In design — ADR Proposed; sin implementación |
| Owner domain | Delivery/Ops + ICO/Data |
| Created / Last updated | 2026-09-19 |
| Base metric | [RpA existente](RPA_V1.md), sin sustitución ni modificación |
| Writeback | Ninguno; no Payroll ni writeback Notion de liderazgo |

Esta especificación ICO gobierna sólo el **contexto de liderazgo**: cohorte, atribución, cobertura y consumo. No redefine qué cuenta como ronda, no cambia `rpa`/`rpa_avg`, crédito individual, bandas salariales ni helpers existentes. Separa el nuevo método de agregación del cálculo base. Prevalece el [contrato compartido](../GREENHOUSE_OPERATIONAL_LEADERSHIP_MEASUREMENT_V1.md); [ADR](../GREENHOUSE_OPERATIONAL_LEADERSHIP_MEASUREMENT_DECISION_V1.md) Proposed.

## 1. Definición canonical

**Rounds per Asset (RpA)** responde: ¿cuántas rondas de cambios requiere el equipo para completar una entrega al cliente? Menor valor es favorable **a igualdad de alcance, complejidad y evidencia**. No mide horas de retrabajo, gravedad del error, satisfacción ni culpabilidad: un cambio puede provenir de un brief ambiguo, una decisión nueva del cliente o una ejecución defectuosa.

Para Daniela se espera mejor preparación del brief, revisión interna útil, feedback consolidado, detección temprana de patrones y coaching. No se busca reducir la participación del cliente, esconder cambios o aprobar entregas deficientes. Su cartera es toda cuenta asignada durante la vigencia correspondiente, no cuatro nombres fijos ni sólo tareas propias.

RpA mide **número de rondas**, no velocidad en días/horas. Menos rondas no implica respuesta más rápida ni menos esfuerzo; conservar indicadores de entrega, antigüedad y capacidad.

## 2. Fórmula canonical

Método de contexto propuesto `leadership_rpa_v1.0`, key propuesto `leadership_rpa_avg`; **no registrados aún**. Dependencia explícita `rpa_v2.0`. Sea r_i el número entero no negativo de transiciones correctivas certificadas de i en K:

```text
n = |K|
roundsTotal = Σ r_i
RpA = roundsTotal / n                         si n > 0; de otro modo null
correctedCount = count(i en K donde r_i > 0)
correctedRoundsMean = roundsTotal / correctedCount
                                             si correctedCount > 0; si no null/no_corrected_assets
distribution = count(r_i=0), count(r_i=1), count(r_i=2), count(r_i>=3)
knownCoverage = n / |E|                       sólo si E es conocido y |E| > 0
```

El agregado usa **sumas de rondas / sumas de assets conocidos**, nunca promedio de promedios de cuentas, personas o meses. Conservar enteros y precisión del cociente; redondear a dos decimales sólo al presentar. Los buckets 0/1/2/3+ son distribución, no semáforos ni thresholds de remuneración.

Para distinguir repetición excepcional de problema general, servir p50/p90 por nearest-rank: ordenar K ascendente, posición 1-based `ceil(p*n)`, p=0.5/0.9; n=0 produce null. Un p90 de muestra pequeña es descriptivo, no evidencia estadística sólida. No eliminar extremos ni winsorizar silenciosamente.

Opcionalmente, una policy aprobada define k para `highRoundShare=count(r_i>=k)/n`; persistir k/version/vigencia. No asumir que tres rondas ameritan penalización. La distribución base no requiere ese umbral.

### Relación con FTR

FTR mide **incidencia** de entregas sin cambios; RpA añade **intensidad** de las correcciones. Deben compartir K, exclusiones, corte, manifest y revisión para compararse. Con correctedCount > 0:

```text
RpA = (1 - FTR/100) × correctedRoundsMean
```

Si todas las entregas pasan a la primera: FTR=100%, RpA=0 y correctedRoundsMean=null; no ejecutar aritmética con null. Si las cohortes/coberturas difieren, no afirmar esta identidad y explicar la diferencia.

| Caso conocido | FTR | RpA | Interpretación |
|---|---:|---:|---|
| Rondas [0,0,1,1] | 50% | 0.50 | La mitad requiere un ajuste |
| Rondas [0,0,4,4] | 50% | 2.00 | Misma incidencia; cuatro veces las rondas totales |
| Rondas [0,0,0,4] | 75% | 1.00 | Retrabajo concentrado en un caso |
| Rondas [1,1,1,1] | 0% | 1.00 | Mismo promedio; todos necesitan ajuste |
| Cuenta A: 1 ronda/2 assets; B: 18/6 | — | 19/8 = 2.375 | Presentar 2.38; no (0.5+3)/2=1.75 |

La complementariedad diagnóstica no justifica sumarlos como dos incentivos independientes: comparten eventos. Una futura política salarial debe gobernar correlación, elegibilidad y equidad separadamente; EPIC-048 no la implementa.

## 3. Inputs canonical

Unidad V1: una tarea/asset elegible con identidad canónica y ciclo de entrega gobernado. Una tarea que agrupa diez piezas sigue siendo una unidad bajo el modelo actual; no dividir por diez ni presentarlo como diez observaciones. Cualquier normalización por complejidad/unidades necesita metodología futura y evidencia.

Para un líder L y período P:
- E: tareas completadas elegibles del período según clasificación canónica y responsabilidad temporal.
- K: subconjunto de E con identidad, atribución e historia de revisión/correcciones certificadas hasta el corte. Incluye tareas con cero rondas demostrado.
- U: E menos K, excluidas del valor por falta de evidencia; conservar conteos/reasons. Si el universo E tampoco se conoce completamente, declarar population unknown; no publicar cobertura total inventada.
- La selección del mes usa finalización en [start,end), con calendario/zone explícitos. El conteo de cada tarea abarca su historia relevante completa hasta el corte, incluidas rondas de meses previos.
- Atribuir al líder vigente en la primera revisión cliente del ciclo elegible, igual que FTR §14. Si falta ese evento, atribución desconocida. No usar al líder actual como sustituto ni cargarle automáticamente rondas anteriores a su responsabilidad.
- Una transferencia se muestra con vigencias y contexto de intervención. Este resultado describe una cohorte bajo accountability; no prueba quién causó cada cambio. Evitar doble conteo dentro del rollup; responsabilidades solapadas requieren precedencia aprobada.
- Reabrir no crea otro asset ni borra rondas. Antes de publicación, TASK-1880 debe resolver reaperturas contra la identidad de ciclo y cierre canónicos; si la fuente no puede distinguirlos, no generar otra observación. Correcciones a períodos locked producen revisión auditada, no sobrescritura.

## 4. Helper canonical y evidencia

TASK-1879 debe entregar identidad unívoca source/workspace/task, primera revisión y finalización confiables, vigencias de responsabilidad, procedencia de eventos, deduplicación por identidad del evento y cobertura temporal verificable. El helper actual consulta por task_source_id: antes de reusarlo se debe probar unicidad entre fuentes/workspaces o resolver la ambigüedad; no basta concatenar cuentas en un join.

Normalizar a los estados canónicos antes de contar. Redelivery de un webhook no suma otra ronda; dos eventos reales con igual timestamp no se deduplican por hora. No reconstruir cambios inexistentes desde el valor actual de Estado ni desde un rollup legacy.

El contador existente puede devolver valid/cero con una sola transición no correctiva. El wrapper de liderazgo debe exigir cobertura de todo el tramo pertinente, continuidad de captura, política de eventos tardíos y consistencia de revisión/cierre. `sourceMode=canonical` no es certificado de completitud. Primera revisión anterior al inicio de captura deja historia incompleta salvo backfill verificable.

Aplicar contrato compartido:
- `unavailable`: sin cohorte conocida computable, identidad/atribución irresoluble o límites inválidos; null, no cero.
- `low_confidence`: cociente diagnóstico sobre K, pero captura parcial, muestra insuficiente, policy pendiente o población incompleta. Mostrar U y motivo; no premiar el subconjunto visible.
- `valid`: cobertura, mínimo de muestra, freshness y policy aprobados satisfechos; no basta que n>0.
- Lifecycle working/locked/superseded y freshness fresh/stale son ejes independientes. Lock no mejora confianza.
- Acceso denegado/suppressed no revela agregados, denominadores ni cuentas ocultas.

La lógica del período es semiabierta, mientras el helper actual admite límite superior inclusivo. TASK-1880 debe resolver esa diferencia explícitamente en la primitive común y probar el evento exactamente en end; no restar un epsilon arbitrario ni descartar rondas de meses anteriores mediante windowStart mensual.

Alineación técnica observada 2026-09-19: `calculateRpaV2` en `src/lib/notion-metrics/calculate-rpa-v2.ts`, versión `rpa_v2.0`, delega a `countCorrectionTransitions`; par persistido `Listo para revisión → Cambios solicitados`. Los campos futuros Frame.io son ignorados. No se cuenta cantidad de comentarios/versiones ni revisión interna. Esto documenta la dependencia observada de liderazgo, **no actualiza la spec base Accepted ni certifica runtime**. El drift documental detectado en la spec base debe conciliarse por separado por ICO; TASK-1880 verifica paridad antes de reutilizarla, sin introducir un contador paralelo.

## 5. Agregado canonical y persistencia

Snapshot/revisión propuestos conservan: cohort ID/digest, leader ID, período/timezone/asOf, manifest/binding versions, methodVersion/dependencyVersions, coverage policy, n/eligibleKnownCount/unknownCount, roundsTotal, correctedCount, distribution, p50/p90, confidence/reasons/freshness, exclusiones y provenance. Persistir también numerador/denominador, no sólo valor redondeado. Cuando el total elegible es desconocido, marcarlo nullable con populationKnown=false.

Las señales abiertas tienen su propio scope/asOf/conteos/evidencia; no esconderlas dentro del payload de cerrados. Los readers/API de ICO sirven el mismo DTO a Person 360 y demás consumidores autorizados. UI no suma comentarios, no recalcula RpA/FTR y no deriva confianza local. BQ analítica y PG serving siguen las fronteras del contrato compartido; ningún cambio físico se aplica en esta documentación.

## 6. Semántica edge y pruebas

TASK-1880 debe probar numéricamente todos los ejemplos de §2; n=0; todos cero; un extremo; cuentas con tamaños diferentes; eventos previos al mes; evento en end; webhook duplicado; dos eventos con timestamp igual; captura incompleta con cero; identidad multifuente ambigua; transferencia; reapertura; cuenta quinta y 51/201 cuentas; dos líderes y permisos parciales. Probar semántica y valores, no presencia de strings SQL.

Pendiente antes de evaluación: aprobar policy temporal/ciclo/reapertura, pruebas de cobertura y backfill posible por fuente, mínimos, calendario y metas. No afirmar que un API fuente ofrece historia si no se ha demostrado. Sin estas decisiones se mantiene diagnóstico/shadow, no evaluación formal.

## 7. Estados / dataStatus

La política de §4 y el contrato compartido distinguen valid, low_confidence y unavailable; lifecycle/freshness son independientes. Historia parcial no equivale a cero, una entrega abierta no gana pass y un agregado sin población conocida no certifica la cartera completa. Los estados de disputa/revisión no borran hechos ni sustituyen la confianza técnica.

## 8. Thresholds, uso y cadencia

Working diario para corregir captura y detectar casos; revisión semanal de cola y causas; mensual conciliado/locked para resultado; STI trimestral compara RpA en **rondas por asset**, menor favorable, nunca en puntos porcentuales. El baseline se agrega por sumas y exige método, captura, mix y cohortes comparables.

No copiar bandas salariales individuales de RPA_V1 §13 al contexto de liderazgo. Metas, muestra mínima, cobertura y k requieren calibración shadow y aprobación prospectiva. Menor RpA junto a peor POTD, más backlog abierto o mayor carga interna no demuestra mejora.

Motivos de cambios (brief, calidad, alcance nuevo, preferencia u otro) pueden registrarse con autor/evidencia y audit trail. Son contexto: no descontar rondas por una etiqueta editable. Una versión ajustada por causa requeriría ADR/método separado y conservar siempre la métrica bruta.

Prohibido mejorar la cifra ocultando feedback, cerrando sin aprobación, retrasando cierres difíciles, dividiendo tareas artificialmente o reiniciando el contador al reabrir. Revisiones internas numerosas pueden bajar RpA cliente sin mejorar eficiencia; mostrar guardrails de entrega/capacidad y no inferir ahorro de horas.

## 9. Writeback y consumidores

Sin writeback nuevo ni modificación de Payroll. TASK-1880 calcula/expone en ICO y TASK-1881 consume en Person 360/API autorizada. Estadísticas abiertas son diagnóstico, no nuevas métricas salariales ni sustitutos del resultado cerrado.

## 10. Histórico de decisiones

2026-09-19: extensión de liderazgo documentada inicialmente dentro de RPA_V1 §14. A solicitud del operador se separa aquí y se restaura RPA_V1 byte-for-byte al commit base. Cambios técnicos de la spec original quedan fuera de este commit. Fórmula individual, código, runtime y bonos sin cambios.

## 11. Cross-refs

- [RpA base](RPA_V1.md), fuente de semántica individual, no sustituida.
- [FTR §14](FTR_V1.md#14-contexto-de-liderazgo-operativo--proposed-2026-09-19), cohorte compartida.
- [STI](STI_V1.md), comparabilidad longitudinal.
- [Catálogo ICO](METRICS_INDEX.md).
- [EPIC-048](../../epics/to-do/EPIC-048-operational-leadership-performance-ico-person-360.md).

## 12. Decisiones de activación pendientes

El diseño fija responsabilidades/protocolo en el contrato compartido §11. Antes de evaluación real, Ops debe nombrar titulares/suplentes y aprobar el calendario; ICO debe certificar captura/baseline y resolver paridad con el canon base. No inventar umbrales sin datos: mínimos/metas se registran con vigencia prospectiva tras shadow. Si no se aprueban, permanece diagnóstico sin calificación. Esto no bloquea documentar o implementar las salvaguardas autorizadas, pero sí usar el resultado para evaluar.

## 13. Trabajo abierto y flujo de rondas

El promedio de cerrados tiene sesgo si los casos difíciles nunca se cierran. Por eso servir además una población de **assets abiertos al corte** en la cartera vigente, separada del denominador de cerrados:
- `openKnownCount`, `openUnknownCount`, `openObservedRoundsTotal` y distribución observada.
- Lista autorizada de casos con rondas, tiempo desde primera revisión y desde última corrección, estado, cuenta y exposición de responsabilidad.
- Los casos bloqueados siguen visibles como riesgo abierto; no aplicar automáticamente las exclusiones del KPI de completados a esta cola.
- Las rondas observadas de un abierto son un **límite inferior del resultado final**, no un RpA final aprobado. Cero observado abierto nunca significa FTR ganado.
- Los conteos abiertos son stocks a una fecha: no sumar cortes diarios como assets únicos ni mezclar rondas abiertas con el numerador cerrado.

Un flujo opcional `roundsOccurredInPeriod` cuenta eventos del período [start,end), con responsabilidad al evento. Es otra perspectiva de los mismos hechos, claramente rotulada; no sustituye RpA por cohorte de finalización. Permite ver trabajo actual sin transferir retrospectivamente toda la historia a un nuevo líder.
