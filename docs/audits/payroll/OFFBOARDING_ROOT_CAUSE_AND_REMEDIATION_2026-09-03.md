# Offboarding — causa raíz y propuesta de solución

Fecha: 2026-09-03. Estado: **investigación terminada; propuesta, sin implementación ni rollout**.

Origen: [reproducción UI de Felipe](FELIPE_OFFBOARDING_UI_AUDIT_2026-09-03.md), [ISSUE-117](../../issues/open/ISSUE-117-offboarding-executed-never-deactivates-member-canonical.md), [TASK-1349](../../tasks/to-do/TASK-1349-offboarding-member-lifecycle-writeback.md).

## Alcance y conclusión

Tres subagentes revisaron independientemente UI/API, PostgreSQL/payroll y Git/pruebas. El agente principal contrastó arquitectura, eventos, controles y secuencia de recuperación. Esta ampliación fue solo lectura sobre código y runtime; únicamente se escribieron resultados de auditoría. No se ejecutaron tests live ni escrituras de negocio.

La causa sistémica es un circuito incompleto: SCIM abre un caso que exige revisión humana, pero falta el command para resolver esa revisión y convertirla en una decisión contractual. UI, estado del caso, vigencia del member y elegibilidad de nómina no comparten una decisión consistente. Las correcciones anteriores atendieron prorrateos, documentos o ajustes de un mes, sin cerrar ese recorrido.

## Evidencia principal

| Hallazgo | Mecanismo verificado | Consecuencia |
| --- | --- | --- |
| Revisión no implementada | `TransitionOffboardingCaseInput` no admite reclasificación; no existe command/endpoint de revisión de caso existente | El stub `identity_only` queda atrapado pese a conocer la salida real |
| Fecha inventada | `HrOffboardingView.tsx:260–261,484–485`: transición toma el estado de “Nuevo caso”, inicialmente hoy | Se aprueba sin capturar la fecha; editar otro formulario puede contaminarla |
| Acción sin implementación | `runQueueAction`, `HrOffboardingView.tsx:645`: `classify_case` no tiene handler, cae en default | “Clasificar caso” puede no hacer nada |
| Clasificación visual distinta | `work-queue/derivation.ts:50`: honorarios implica `contractual_close`, incluso si el lane persistido es identity_only | La UI aparenta cierre contractual; payroll sigue leyendo solo acceso |
| Progreso falso | `derivation.ts:268`: 2/2 fijo para lanes sin finiquito, sin recibir estado/fechas | Incompleto o bloqueado aparece “Listo” |
| Recuperación no expuesta | `deriveSecondaryActions`: solo aprobar/programar/ejecutar; FSM sí permite contener/volver a revisión | El inspector no permite corregir, reclasificar ni recuperar un blocked |
| Baja sin protección de payroll | `exit-eligibility/policy.ts:147–196`: blocked y identity_only devuelven full_period; readiness no bloquea la salida sin resolver | La fecha correcta y el bloqueo del caso no excluyen de nómina |
| Riesgo inverso del executor | `offboarding/store.ts:934–936`: cualquier executed llama al cierre de compensaciones | Ejecutar una baja verdaderamente solo de acceso puede cortar su compensación |
| Lifecycle sin writeback | Executor no desactiva member; eventos del caso no tienen consumidor que cierre ese lifecycle | Casos ejecutados permanecen en rosters activos |

La señal `hr.offboarding.completeness_partial` solo cuenta casos terminales con drift de relación legal employee. No detecta el pendiente SCIM de Felipe. Su mensaje de cero resultados (“4 capas alineadas”) excede la cobertura de la consulta. El agregado también permite interpretar una capa desconocida como ausencia de pasos pendientes.

## Por qué sobrevivió a las entregas anteriores

| Fecha | Evidencia Git | Alcance real |
| --- | --- | --- |
| 04/05 | `87a4363461`, foundation TASK-760 | Introduce fechas compartidas/default de hoy; esas líneas siguen intactas |
| 11/05 | `f11e938a1`, `355e4c278` | Introduce lane visual y progreso 2/2 por contrato |
| 15/05 | TASK-890 | Agrega resolver de elegibilidad/cierre externo; no revisión del stub SCIM |
| 15/05 | TASK-892, `1b2855175`; fixes `4ba7dd9c9`, `4dc2ddd95` | Agrega agregado/CTA de cierre, pero conserva progreso anterior y falta de revisión |
| 16/05 | TASK-893 | Corrige prorrateo de ingreso; depende de salida ya resuelta por TASK-890 |
| 06/07 | `41e9ae5c3`, `099001605` | ISSUE-117 y TASK-1349 documentan el fallo; cambios posteriores del día son documentación/prioridad |
| 31/07 | `859fe1138`, `59f451ad3` | Corrige international_internal y ajustes puntuales; no salida de Felipe |
| 03/09 | Backlog verificado | TASK-1349 sigue to-do/Diseno, con UI expresamente fuera de alcance |

No hay evidencia de que TASK-1349 se haya implementado y luego perdido en un deploy. Hay evidencia de trabajo pendiente y de un defecto presente desde el origen. Implementar literalmente su alcance backend, sin unidad UI dependiente, mantendría el bloqueo operativo.

Además, TASK-1349 presupone independencia del resolver respecto de `members.active`, pero el código actual hace lo contrario. El plan necesita corregirse antes de implementar. TASK-892 figura completa con acceptance criteria sin marcar y TASK-893 conserva `Status real: Diseno` pese a figurar completa; esos rótulos no sustituyen evidencia de runtime.

## Base real y límites de lo demostrado

Felipe conserva `member.active=true`, compensación CLP 650.000 sin término y caso `blocked/identity_only`, con último día y fecha efectiva **02/06/2026**, confirmados por el operador. El resolver vivo devuelve full_period sin warnings para mayo, junio y agosto. Las fechas fueron reparadas en la sesión UI previa; esta ampliación no cambió esos datos.

Cohorte examinada: members con `is_demo=false`, sin asumir que todo member es empleado Efeonce:

- 3 casos executed con member todavía activo: un internal_payroll, un external_payroll y un non_payroll.
- 1 caso de identidad pendiente con compensación abierta: Felipe.
- 2 casos con cutoff pasado, sin decisión terminal y compensación abierta.
- Otros 3 casos identity_only needs_review sin cutoff. No se propone darlos de baja automáticamente.

**Confirmación del operador, 03/09/2026: a Felipe se le pagó absolutamente todo y no se le debe nada.** Este es el estado de negocio informado; no se debe interpretar ningún registro pendiente como autorización para otro pago.

Junio de Felipe mantiene simultáneamente: período exported, entry activa gross 650.000/net 550.875, ajuste exclude activo, obligación employee_net_pay generated por 550.875 y gasto payroll_generated pending por 550.875. El ajuste se creó 35 segundos después del último update de la entry. La obligación y el gasto son representaciones del mismo importe: **no se suman**. Esos estados persistidos no reflejan el cierre financiero confirmado por el operador. Se debe conciliar el pago ya realizado con sus registros y resolver cualquier generación improcedente sin duplicar pagos ni inventar movimientos bancarios. La consulta no verificó qué registro acredita ese pago ni si este importe generado corresponde a él. Julio sí tiene entry/gasto cero.

PG tiene checks de fechas/estados y touch_updated_at del caso, pero no guards de consistencia member/compensación/caso. No se recomienda sustituir decisiones de dominio por triggers que deduzcan una baja laboral a partir de SCIM.

## Riesgos que debe evitar la solución

1. **No limitarse a `active=false`.** El roster SQL exige m.active=TRUE y el resolver excluye inactive antes de considerar fechas. Una simulación pura con facts reales mostró que ese cambio excluiría a Felipe también de los recálculos de mayo y junio; no borra entries existentes, pero rompe elegibilidad histórica.
2. **No ejecutar todos los identity_only.** Hoy el executor podría cortar compensación aunque el contrato declare que es solo acceso. La solución debe probar ambos sentidos: terminar relación y mantener relación ante una baja de acceso.
3. **No tratar honorarios como “sin pago”.** Ausencia de finiquito laboral no implica inexistencia de remuneración pendiente. La política debe preservar obligaciones hasta el cutoff y separar régimen de pago de naturaleza contractual.
4. **No usar el último caso de la persona como historia completa.** La consulta prioriza executed sobre casos recientes, sin scope de relación/episodio/período. Reingresos y transiciones de relación requieren selección temporal correcta.
5. **No permitir reactivaciones por proyecciones obsoletas.** SCIM tiene un path de reactivación por OID; el backfill `backfill-postgres-canonical-360.ts:452–461` puede sobrescribir active/contract_end_date desde BQ. Es un script invocable; no se verificó un sync periódico ejecutándolo.
6. **No olvidar versiones futuras.** El cierre actual solo afecta compensaciones con effective_from <= último día. No hay versiones futuras conflictivas en la cohorte actual, pero deben detectarse/resolverse expresamente.
7. **Corregir facts incompletos.** El SELECT exterior de exit-eligibility omite contract_type_snapshot; el probe devuelve null aunque PG tiene honorarios. La rama especial international_internal también depende de ese dato. Verificar comportamiento del reader, no el texto SQL.

## Propuesta de solución, en orden

### 1. Controles inmediatos de la operación

- Fechas ausentes permanecen ausentes: la aprobación requiere revisión explícita del caso y un resumen de impacto. Separar estado del formulario de creación y transición, ligado a caseId.
- Añadir al reader/command canónico de payroll un resultado de revisión requerida ante inconsistencias de salida que afecten el período. Reutilizarlo en pre-nómina y los comandos que crean/aprueban obligaciones; no resolver solo con un banner.
- Una señal de Entra por sí sola no autoriza excluir ni quitar pago. El bloqueo debe solicitar clasificación y permitir resolución/override gobernado cuando corresponda; no convertir todos los casos abiertos o salidas futuras en impago automático.
- Una falla del resolver no debe volver silenciosamente a incluir a todos. Distinguir previsualización degradada de autorización para nuevos cálculos/pagos.

### 2. Command de revisión del caso existente

Proponer una operación canónica de revisión/corrección con dos decisiones explícitas: **solo acceso** o **terminó la relación**. Debe conservar source SCIM, identificar la relación afectada, capturar causal respaldada y fechas, y recalcular lane/requisitos con la matriz canónica. No inferir renuncia ni otra causal legal del único dato “dejó de trabajar”.

Requisitos: autorización fina, motivo, bloqueo de fila/control de versión, historial before/after, invalidación de aprobación cuando cambia una decisión material y outbox en la misma transacción. UI y API consumen el mismo command. No cancelar y crear otro caso para eludir unicidad ni introducir un UPDATE operativo suelto.

### 3. Separar vigencia actual de elegibilidad histórica

- La relación y su ventana temporal gobiernan la participación por período; `member.active` sirve a disponibilidad actual, sin borrar elegibilidad anterior.
- La ejecución consume la decisión revisada. Solo acceso no cambia relación, compensación ni elegibilidad; término real coordina relación, vigencia de compensaciones, member y eventos auditados según la matriz.
- Cierre laboral/contractual y cierre financiero deben quedar distinguibles: una persona puede haber salido y conservar un saldo legítimo por pagar. No mantenerla como vigente para pagar ese saldo ni borrarlo para ocultarla del roster.
- Usar el agregado y relación existentes; diseñar la selección de episodios/reingresos antes de añadir otro source of truth. Definir ownership de BQ/SCIM/proyecciones para impedir resurrecciones.

### 4. UI completa sobre esos contratos

Extender el inspector existente con revisar, corregir y recuperar bloqueos; conectar realmente “Clasificar caso”. Mostrar claramente origen de la señal, decisión laboral, fechas, efecto sobre nómina y pendientes. Clasificación, progreso y acción siguiente deben derivar de los mismos requisitos: desconocido/incompleto no puede contar como completo. Esta unidad UI depende del backend; debe incorporarse como trabajo explícito asociado a TASK-1349, que hoy la excluye.

### 5. Recuperación operativa y verificación final

Tras desplegar y verificar los commands/UI, dry-run por sujetos explícitos. Para Felipe: conservar 02/06, resolver la causal/clasificación pendiente, aplicar el cierre auditado y verificar ausencia en períodos posteriores. **El resultado financiero debe reflejar saldo pendiente cero, conforme a la confirmación del operador.** Mayo se conserva; junio se concilia como período histórico con los ajustes, exports, obligación/gasto y el pago ya realizado, usando versionado/reapertura gobernados si hacen falta. Vincular el pago a los registros que corresponda y corregir/anular generaciones improcedentes según su trazabilidad; no marcar indiscriminadamente como pagada una obligación que pudo generarse por error. No emitir otro pago ni recalcular automáticamente por conocer la fecha.

Después revisar los otros casos con drift; aprobación por caso, sin bajas masivas inferidas. Los readbacks de UI, base, nómina oficial/proyectada, obligaciones y señales forman parte del cierre. Un flag off o un deploy pendiente no se reporta como reparación operativa.

## Validación proporcional requerida

La investigación ejecutó cuatro archivos unitarios existentes: state-machine, work-queue derivation, closure-completeness y HrOffboardingView: **40 tests passed con el bug presente**. No se ejecutaron pruebas live.

Vacíos concretos: la prueba de fecha obligatoria solo llama al backend sin fecha; los fixtures de honorarios ya usan non_payroll; la suite UI se centra en casos ejecutados/documentos; un test acepta complete con memberRuntimeAligned=null; el test de la señal compara texto SQL y mocks de count.

La corrección debe demostrar, con fixtures sintéticos y después smoke operativo autorizado:

- SCIM + honorarios + fechas nulas → revisión obligatoria, sin POST de aprobación con hoy.
- Modificar “Nuevo caso” no contamina otra transición.
- Clasificar/corregir/recuperar blocked funcionan; stale revision se rechaza, fallo intermedio revierte la transacción y reintento no duplica efectos.
- Solo acceso no cierra compensación/member; término al 02/06 preserva mayo y elegibilidad legítima hasta cutoff, excluyendo después.
- Reingreso no hereda salida del episodio anterior; compensación futura conflictiva se detecta.
- Progreso, acción siguiente y señal distinguen completo, incompleto y desconocido.
- Ajustes y obligaciones históricas se concilian sin confundir exportado/generado con pagado.
- Readbacks UI + PG + readers oficial/proyectado + señales después del rollout.

## Entrega propuesta

Actualizar el diseño de TASK-1349 y su ADR dueña para corregir las premisas temporales/identity_only. Separar unidad backend-data y unidad UI dependiente, con recuperación y rollout como aceptación común. No se asignan nuevos IDs ni se declara ADR Accepted en esta auditoría. El resultado actual es un diagnóstico y plan revisable; no código implementado.

## Registro autorizado posterior, 2026-09-03

El operador pidió crear el trabajo y estimarlo. Se actualizó TASK-1349 y se registró
[TASK-1814](../../tasks/to-do/TASK-1814-offboarding-case-review-recovery-ui.md) para la UI dependiente,
con contratos de wireframe/flow/motion y criterios de cierre conjunto. Se mantiene implementación pendiente.
Estimación conjunta: 20–32 horas efectivas, aproximadamente 3–5 jornadas; sin esperas de aprobación/release
ni una migración financiera adicional. Fecha/saldo de Felipe ya confirmados: 02/06/2026 y cero deuda.
