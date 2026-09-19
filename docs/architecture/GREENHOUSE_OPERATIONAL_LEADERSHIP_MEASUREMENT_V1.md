# Operational Leadership Measurement — V1

- Status: **In design**; contrato propuesto, no métricas implementadas.
- Fecha: 2026-09-19.
- Owners: Delivery/Ops (significado y revisión), ICO/Data (cálculo y evidencia), People/Product (acceso y presentación).
- Programa: [EPIC-048](../epics/to-do/EPIC-048-operational-leadership-performance-ico-person-360.md).
- Decisión: [ADR](GREENHOUSE_OPERATIONAL_LEADERSHIP_MEASUREMENT_DECISION_V1.md), **Proposed**.
- Código existente contrastado: materialize.ts, calculate-ftr.ts, operational-responsibility/readers.ts. Fuentes y bindings productivos no certificados en esta sesión.

## 1. Propósito funcional

Medir si una persona responsable de operaciones crea condiciones para que su cartera entregue a tiempo, con calidad, asignación clara y problemas atendidos. El objeto no es cuánto produce personalmente Daniela, sino el resultado observable de las cuentas que dirige durante su vigencia.

Las métricas son evidencia para una conversación de gestión, no prueba automática de causalidad ni evaluación laboral automatizada. Factores del cliente, ventas, capacidad disponible, cambios de alcance y calidad de datos se muestran junto al resultado. No hay score compuesto, ranking, consecuencias salariales ni recálculo de bonos.

## 2. Catálogo y responsabilidades

Una definición por métrica; este documento gobierna únicamente contratos compartidos. Las fórmulas viven en:

| Indicador | Pregunta de gestión | Especificación |
|---|---|---|
| Portfolio On-Time Delivery (POTD) | ¿Cumple el equipo los compromisos de entrega de la cartera? | [POTD_V1](metrics/POTD_V1.md) |
| First-Time Right (FTR) | ¿Llegan las entregas al cliente sin necesitar correcciones? | [FTR_V1, extensión de liderazgo](metrics/FTR_V1.md#14-contexto-de-liderazgo-operativo--proposed-2026-09-19) |
| Assignment & Capacity Coverage (ACC) | ¿Está el trabajo asignado y la carga cabe en la capacidad? | [ACC_V1](metrics/ACC_V1.md) |
| Flow Risk Management (FRM) | ¿Se detectan y atienden riesgos a tiempo con evidencia? | [FRM_V1](metrics/FRM_V1.md) |
| Sustained Team Improvement (STI) | ¿Mejora el sistema de trabajo de forma sostenida y comparable? | [STI_V1](metrics/STI_V1.md) |

ACC/FRM son familias con componentes explícitos; STI es un vector de cambios. No convertirlos en porcentajes únicos para completar cinco tarjetas.

## 3. Universo, identidad y tiempo

Unidad base: leader_member_id × account_scope_id × período × revisión. Cuenta es unidad operativa canónica, no nombre comercial ni workspace Notion. TASK-1879 resuelve mapping de organización/space/source y conflictos antes de publicar.
Cartera = unión de cuentas con responsabilidad elegible y vigencia intersectando el período; estado actual activo no sirve para reconstruir historia. En período abierto limitar hechos a asOf. Vigencias [from,to), UTC persistido, calendario America/Santiago y DST probado; fechas sin hora usan reglas de fecha de negocio del bucket canónico, no medianoche UTC arbitraria.

V1: responsabilidad explícita por cuenta/space, con tipos delivery_lead/operations_lead sujetos a política de precedencia y primary; sin expansión implícita desde cargo, department, permisos o tareas de subordinados. Un registro por scope no garantiza responsabilidad si la vigencia o mapping es inválido. Conflicto entre tipos/co-leads debe resolverse por policy aprobada, no por orden SQL.
Manifest derivado completo guarda cuentas, intervalos, responsabilidad/versiones, source refs, estados y digest. No segunda lista editable por líder. Quinta cuenta de fuente soportada se incorpora al siguiente ciclo exitoso sin código, seed por cliente ni redeploy. Fuentes no soportadas requieren adapter; mientras tanto se conserva la cuenta no medible.

### Atribución temporal propuesta para el ADR

- POTD: líder vigente en el compromiso de vencimiento congelado por la política canónica, no el dueño actual del task.
- FTR: líder vigente en la primera entrega a revisión de cliente del ciclo elegible; finalización selecciona el mes. Si ese evento no es fiable, estado de atribución desconocida, sin fallback silencioso al líder actual.
- ACC: líder vigente en instante de cada observación; capacidad operacional no duplica personas por multi-asignación.
- FRM: líder responsable cuando se detecta el episodio; transferencias conservan episodio y plazo, con intervalos de responsabilidad y acciones delegadas. No reiniciar reloj.
- STI: consume snapshots comparables, no reatribuye tareas.
Son reglas propuestas a aprobar con Ops en TASK-1879 antes de schema; completar esta documentación no certifica esos timestamps.

## 4. Conjunto de hechos y exclusiones

Identidad estable de tarea = fuente/workspace + task_source_id (no título). Las múltiples relaciones de proyecto/source no multiplican entregables. Declarar precedencia de fuente y clave de deduplicación; conflictos no se arbitran por última fila.
Aplicar taxonomía canónica y exclusiones POR MÉTRICA. No filtrar bloqueadas globalmente: si se excluyen de un KPI canónico de calidad/entrega, siguen visibles en las colas de ACC/FRM y en counts de exclusión, sin permitir limpiar una nota ocultando el problema.
No inferir tarea inexistente de una fuente desconectada; el volumen faltante puede ser desconocido. Incluir tareas sin owner cuando pertenecen al universo de cuenta. Tareas ejecutadas por el líder cuentan una vez en resultado de cuenta, pero conservan exclusivamente su crédito individual vigente.

## 5. Contrato de evidencia y confianza

DTO propuesto por métrica/cuenta:
metricKey, methodVersion, dependencyVersions, policyVersion, manifestVersion, periodStart/end, asOf, revision, sourceWatermark, numerator, denominator, value nullable, unit, eligibleKnown, measuredCount, missingKnown, excludedCountByReason, populationKnown, coverage, sampleSize, confidence, reasonCodes y evidenceCursor.

- confidence: valid | low_confidence | unavailable.
- lifecycle: working | locked | superseded, separado de confidence.
- freshness: fresh | stale; computedAt no reemplaza watermark de fuente.
- Publication/access: suppressed no viaja como dato sensible; una política de acceso puede omitirlo o denegar la respuesta sin revelar su existencia.
- value=null si denominador cero o faltan inputs para calcular; reason diferencia no_eligible_work, no_portfolio, missing_source, missing_history, invalid_binding, insufficient_sample, policy_unconfigured, non_comparable y ambiguous_source.

Cobertura de cuentas y cobertura de tareas son medidas distintas. known coverage=measuredCount/eligibleKnown sólo describe el universo observado; si populationKnown=false, globalTaskCoverage=null. Cada KPI tiene readiness distinto.
Con datos parciales puede publicarse observedSubset con low_confidence y fracción visible, nunca como resultado pleno. Menor población conocida no es mejor rendimiento.
No emitir salud/evaluación formal sin minSample, minCoverage, freshnessBudget y policy vigentes aprobados. Shadow permite diagnóstico sin metas; policy faltante queda explícita. Valores de muestra/SLA/meta no se inventan ni se heredan de Payroll. Tests usan configuraciones sintéticas rotuladas.
Cálculo con precisión completa; presentar tasas a un decimal, pp a un decimal; nunca sumar valores redondeados. Guardar enteros del numerador/denominador y unidad. No promedio simple de tasas.

## 6. Persistencia, API y permisos

Sources/bindings/historia: PostgreSQL operativo. Snapshots analíticos: BigQuery ICO; serving PG de liderazgo separado del individual. Propuestas de tablas/grants/migración están en TASK-1880; ninguna existe por escribir este documento.
Run fija manifest/asOf y produce revisión coherente BQ/PG mediante staging/publication marker; publicación parcial no mezcla versiones. Lock/CAS por líder-período, retries idempotentes, audit y source digest. Cierre locked conserva inputs/lineage necesarios; corrección crea revisión con supersedes, motivo y aprobador, no force overwrite.
Una fuente degradada no destruye snapshot sano: último resultado se rotula stale/previousScope y la cartera actual pendiente sigue visible, no reemplazar desconocido por resultado viejo.

Reader server-side compartido session/app/ecosystem/MCP, sin fórmulas frontend. Paginación de detalle no cambia agregado. Intersección de permisos se aplica también a counts, nombres y sumas; fullPortfolio, authorizedSubset y filteredSubset explícitos. Responsabilidad no concede acceso. Cliente externo no accede a evaluación personal.
Commands para intervención/cierre/corrección: capability fina + grant real, idempotencia, revisión esperada, actor/motivo/audit. No datos salariales, motivos médicos, ni costos privados en DTO de capacidad.

## 7. Cadencia y acciones

| Cadencia | Operación | Resultado |
|---|---|---|
| Diaria | Captura + materialización encadenada a ICO con freshness | Working, cartera actual y excepciones; no nota definitiva |
| Semanal | Revisión Ops de toda cartera y decisiones con owner/fecha/evidencia | Ajustes de asignación, desbloqueo, escalamiento y seguimiento |
| Mensual | Día posterior al fin de mes inicia conciliación, no lock automático | Reviewer autorizado distinto del sujeto aprueba evidencia/lock o deja pending_reconciliation |
| Trimestral | Comparar tres meses locked vs baseline anterior comparable | STI y plan de mejora con hipótesis verificables |

Shadow mínimo dos cierres para calibración; STI trimestral completo necesita baseline comparable y trimestre actual. Con baseline de tres meses no existente, seis meses observados totales; no afirmar que tres cierres nuevos bastan para comparar dos trimestres.
No atribuir a Daniela una métrica peor sólo porque mejoró el registro de problemas; cambios de cobertura/método se declaran como ruptura de comparabilidad.

## 8. Invariantes y pruebas de aceptación

- 8/10 y 1/2 se agregan a 9/12, no promedio de tasas.
- Cuenta nueva sin fuente permanece pendiente; no 0/100 inventado.
- 0/1/4/5/51/201 cuentas, dos líderes, multi-source y quinto cliente sin deploy.
- Timestamps límite, DST, altas/bajas/reingreso, responsabilidades retroactivas, cambio de cuenta y períodos históricos.
- Corrección registrada en mes anterior afecta FTR del cierre, no se pierde por windowStart mensual.
- Reasignar/reabrir riesgo no borra fallos ni reinicia SLA; intervención sin evidencia no satisface respuesta.
- Eventos duplicados/fuera de orden, pérdida de outbox y corrida concurrente convergen o reportan gap.
- Misma página, distinta página y filtro conservan semántica declarada y ningún agregado filtra scopes prohibidos.
- Ninguna escritura a Payroll ni cambio del cálculo individual.

## 9. Gates pendientes y ownership

TASK-1879 aprueba ADR/política temporal, mapping/fuentes, garantías de captura y capacidad; TASK-1880 implementa métodos/versiones, compara evidencia, habilita shadow y certifica runtime; TASK-1881 presenta sin reinterpretar fórmulas.
Pendientes deliberados: bindings reales, calendario/SLA de riesgo, minSample/minCoverage, metas por mix, baseline y retención. Cada uno es gate de su consumer, no permiso para usar un default arbitrario.
Los documentos hoy están en diseño; no hay implementación, GVC ni datos evaluativos de Daniela producidos por este trabajo.
