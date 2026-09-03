# Valentina Hoyos — reingreso y recuperación verificados

- Fecha: 2026-09-03.
- Estado: acceso, disponibilidad y asignación recuperados; etapas contractuales separadas; payable agosto creado por 12/31, pendiente de boleta. Guardas correctivas desplegadas y eventos de recuperación procesados; release cerrado y verificado; detalle y límites al final.
- Autorización: Julio Reyes, instrucción explícita en Codex «Haz eso sin romper nada» tras discovery de identidad, contratación y pago parcial.
- Alcance inicial: recuperación puntual de identidad y contratación. El incidente posterior, documentado al final, requirió guardas de producto y despliegue antes de restaurar disponibilidad. Sin cambios de schema, roles ni flags.

## Evidencia previa

La cuenta Microsoft nueva `valentina.hoyos@efeonce.org` existe, está habilitada y fue creada el 20/08/2026. Microsoft Graph no encontró el OID antiguo. En Greenhouse existía una única persona `EO-ID0053`, con correo principal antiguo `vhoyos@efeoncepro.com`; su usuario tenía el correo nuevo, pero seguía `deactivated` y vinculado al OID antiguo. La fecha técnica de desactivación era 14/08/2026; **no prueba último día contractual**.

La contratación `EO-CENG-0001` seguía activa desde 01/05/2026, con tarifa fija mensual CLP 530.973. Los tres envíos encontrados correspondían a mayo. El único payable, `EO-CPAY-0001`, conservaba bruto 707.965, retención 107.964,66 y neto 600.000,34, con obligación y orden de pago ya creadas. No había envío ni payable de agosto.

## Recuperación aplicada

Se utilizó la conexión Postgres canónica, perfil runtime y una única transacción con lock, precondiciones exactas y comprobación de colisiones. Se siguió la recuperación administrativa documentada en [runbook SCIM, escenario 3](../../operations/runbooks/scim-internal-collaborator-recovery.md), conservando la identidad longitudinal del [modelo de identidad](../../architecture/GREENHOUSE_INTERNAL_IDENTITY_V1.md). No hay una nueva decisión de arquitectura ni un nuevo flujo de producto.

1. Usuario existente: OID y correo Microsoft nuevos, `active=true`, `status=active`, limpieza de `deactivated_at`.
2. Person 360: correo canónico nuevo sobre el mismo profile.
3. Member: correo principal y OID nuevos sobre la misma ficha.
4. Source links: vínculo Microsoft antiguo preservado e inactivo; vínculo nuevo agregado al mismo profile; correos de los vínculos internos alineados. HubSpot y Notion históricos no se alteraron.
5. Auditoría before/after y motivo en outbox transaccional, con `source=authorized_admin_recovery` y actor Julio Reyes. No se simuló un provisioning Entra.

Identificadores preservados:

- Profile: `identity-hubspot-crm-owner-82653513` / `EO-ID0053`.
- Usuario: `user-efeonce-internal-valentina-hoyos`.
- Member: `valentina-hoyos`.
- SCIM ID: `55b27a90-f32d-4bb4-ad3e-33a1853e0bc7`.

Recovery ID: `valentina-rehire-identity-2026-09-03`.

Eventos durables:

- `outbox-f9ae6116-ef7b-44e2-b431-4c613298f001` — `scim.user.updated`, contiene before/after y motivo.
- `outbox-f7674f83-67df-4481-92eb-6b5054f1e1b7` — `user.reactivated`.

Ambos estaban `pending` en el primer readback posterior; no se afirma procesamiento del dispatcher. Los readers de acceso y búsqueda leen directamente el estado canónico y ya reflejaban el cambio.

## Verificación

- Preflight de solo lectura aprobado; usuario/profile/member enlazados y ninguna colisión con el OID/correo nuevo.
- Transacción confirmada tras comparar hash idéntico de roles, permission sets, view overrides, relaciones legales, engagements, submissions y payables.
- Hash protegido: `a093cc657cf2d8034c5148885b93a3d67dc709319377d23f8aeda7978e3cc8e1`.
- `getTenantAccessRecordByMicrosoftOid` resuelve el usuario original, activo y elegible por `isEligibleForExternalSSOSignIn`, solo rol efectivo `collaborator`.
- `searchProfiles('valentina.hoyos@efeonce.org')` devuelve la persona original Valentina Hoyos, con correo nuevo.
- El rol histórico `efeonce_account` continúa inactivo. No se ampliaron permisos.
- No se ejercitó login interactivo como Valentina; debe comprobarlo con su sesión Microsoft nueva.
- No se ejecutaron tests con fixtures de base ni se crearon pagos.

## Pendientes y siguiente paso

El operador confirmó el último día de la etapa anterior **30/05/2026** y luego confirmó explícitamente **12/31** para agosto: «Así es, crealo sin forzar nada, por el camino canónico». Se aplicaron la separación y creación descritas abajo.

Siguiente paso: adjuntar la boleta correspondiente al nuevo **EO-CENG-0002** y volver a evaluar readiness de **EO-CPAY-0002** en Finanzas. No duplicar ni anular pagos históricos.

El error off-cycle «engagement no existe» proviene de que el formulario exige PK interna y no resuelve `EO-CENG-0001`. El prorrateo automático tampoco existe en la pantalla actual. Ninguno de estos dos gaps de producto fue implementado en esta recuperación.

## Separación contractual aplicada tras confirmar el 30/05/2026

Recovery key: `valentina-contractor-reengagement-2026-08-20`. Actor: `user-efeonce-admin-julio-reyes`.

- `updateContractorEngagement` restituyó en **EO-CENG-0001** el bruto mensual anterior de 707.965. Evidencia: captura del operador con ese monto acordado y envío/payable aprobado de mayo. El cambio a 530.973 correspondía al nuevo acuerdo; before/after y razón quedaron en `metadata.episodeRecovery`, con evento de actualización.
- `initiateContractorClosure` registró renuncia, fin de servicio y fecha efectiva **2026-05-30**. Estado **ending**: no se forzó cierre definitivo ni se reconocieron automáticamente sus pendientes.
- Una transacción cerró la relación **EO-PLR-0012** al 30/05 mediante `endPersonLegalEntityRelationship` y creó **EO-PLR-0015** desde **2026-08-20** con `createContractorLegalEntityRelationship`. Se preservó la nota histórica de la relación anterior; el motivo nuevo está en `metadata.episodeRecovery` (el evento de desactivación conserva la nota anterior).
- En esa misma transacción, `createContractorEngagement` creó **EO-CENG-0002** (`ceng-40307c7f-122b-48b0-bd99-0286d0d3e806`), fijo mensual CLP **530.973**, desde **2026-08-20**, misma persona y entidad. La política canónica snapshot es 15,25%; el acuerdo neto mensual de 450.000 queda documentado en metadata. No se generó envío ni pago de agosto.
- Activación canónica con `activateWhenClassificationNotBlocking`: **active**, clasificación **needs_review**, `classificationReviewed=false`. No se copió una revisión legal como si hubiera ocurrido para la nueva etapa.
- El helper de relación tiene un marcador legado `createdByCommand=employee_to_contractor_transition`. Se corrigió exclusivamente esa metadata de la fila nueva dentro de la misma transacción a `authorized_contractor_reengagement_recovery`, con motivo y actor; `sourceOfTruth=operator_reconciliation` y `sourceRecordType=contractor_reengagement`. No se modificó código ni se ejecutó transición de empleado.
- Preflight y comprobación transaccional preservaron exactamente los tres envíos, único payable, obligación, orden y relación histórica employee. Hash SHA-256 protegido: `996e0e8dfdbcc8d92a31599438a26a6755741ea0ad20c7e885d00337b9102732`.

Las operaciones de restituir tarifa e iniciar cierre usan transacciones propias del writer. Relación antigua/nueva y engagement nuevo se confirmaron juntos en una tercera transacción. No se presenta toda la recuperación como una única transacción. Los comandos generaron sus eventos canónicos.

Readback independiente posterior al commit: `getActiveContractorEngagementForProfile` selecciona **EO-CENG-0002**; las fechas, estados y tarifas de ambas etapas coinciden con lo anterior. Comparación exacta contra el backup: envíos, payable, obligación, orden y relación employee **idénticos**, cero pagos nuevos. Una consulta auxiliar a outbox usó inicialmente la columna inexistente `created_at` y falló en solo lectura; se corrigió a `occurred_at`, sin invalidar las comprobaciones anteriores ni producir mutaciones.

## Agosto: prorrateo confirmado y payable creado

- Clave de ejecución: `valentina-august-2026-proration-12-of-31`. Misma persona, **EO-CENG-0002**, período inclusivo **20/08/2026–31/08/2026**.
- Acuerdo líquido: 450.000 × 12 / 31 = **174.193,55 CLP** con dos decimales del motor. Gross-up del líquido proporcional con snapshot 0,1525: **205.538,11 bruto**, **31.344,56 retención**, **174.193,55 líquido**. Se parte del acuerdo líquido confirmado para evitar acumular el redondeo de la tarifa bruta mensual. Fórmula, fechas, fracción y autorización quedan en metadata del envío.
- Tasa contrastada con [SII, retención 2026](https://www.sii.cl/preguntas_frecuentes/declaracion_renta/001_140_8398.htm); el cálculo persistido usa `computeChileHonorariosPayout` y el snapshot de la contratación.
- Preflight verificó actor activo y capabilities canónicas `hr.contractor_work_submission:create/update`, `hr.contractor_work_submission.review:approve`, `finance.contractor_payable:create`; no existían envíos ni payables en la nueva contratación.
- Commands: `createContractorWorkSubmission` → `submitContractorWorkSubmission` → `reviewContractorWorkSubmission(approve)` → `createContractorPayableFromSubmission`. Aprobación del trabajo/período y monto sustentada por la confirmación explícita de Julio Reyes en esta conversación, sin afirmar recepción de boleta.
- Envío **EO-CWS-0004** (`cws-fd406ec8-6a83-401e-bbf5-59662491b175`), tipo `project_fee`, **approved**. Payable **EO-CPAY-0002** (`cpay-4a70e0ff-fe07-4c83-b32f-f65c7b8dbc57`), **pending_readiness**, consumo exclusivo del envío mediante el writer canónico.
- Vencimiento por política canónica: **07/09/2026**. Ruta de pago resuelta por el resolver existente, sin waiver ni perfil inventado.
- `assessPayableReadiness`: `ready=false`, único blocker **invoice_asset_missing**. Falta boleta/invoice en el nuevo engagement. No se adjuntó la boleta histórica de mayo ni se cambió `requiresInvoice`.
- No se generó obligación Finance, orden bancaria ni transferencia. No se usó off-cycle, override de monto, aprobación de clasificación ni SQL de escritura directa.
- Comparación antes/después: envíos, payable, obligación y orden de mayo **idénticos** al backup previo. La tarifa mensual de la nueva contratación permanece 530.973; el proporcional vive en el envío y payable de agosto.

## Recuperación inversa de identidad

El evento auditado conserva los campos before/after para una reversión puntual con comparación del estado vigente. No ejecutar un UPDATE amplio ni borrar el vínculo nuevo: cualquier reversión debe preservar auditoría y verificar qué cambios ocurrieron después. La cuenta Microsoft antigua no fue encontrada por Graph, por lo que volver a ese vínculo restablecería un estado sin acceso; no es un rollback funcional.

## Incidente posterior: salida histórica aplicada sobre el reingreso

Después de las recuperaciones anteriores, el writeback del caso histórico employee **EO-OFF-2026-45EC8688** volvió a aplicarse sobre la ficha actual. La cuenta y la contratación nueva continuaron activas, pero el member quedó con `status=inactive`, `assignable=false` y `contract_end_date=2026-04-30`; la asignación `assignment-space-efeonce-valentina-hoyos` quedó inactiva con esa misma fecha. Una reactivación genérica posterior solo restituyó `active=true` y dejó un estado internamente discordante.

La corrección se diseñó como una compensación gobernada por persona, descrita en la [decisión de reingreso](../../architecture/GREENHOUSE_WORKFORCE_REENTRY_RECOVERY_DECISION_V1.md) y el [runbook operativo](../../operations/runbooks/workforce-reentry-recovery.md). El cambio impide que una salida anterior desactive a alguien con episodio vigente posterior, impide que `member.updated` reabra la relación employee terminada y vuelve atómica la mutación de member, vínculos de identidad y evento durable.

El plan privado revisado para Valentina tiene hash `e04cad36c968086a1928289d28d394662e4bf0075f477427634d23a0cfe58568` y pasó en modo `preview` contra el estado real. Solo puede restaurar el member a `active/status=active/assignable=true/contract_end_date=null` y esa asignación a `active=true/end_date=null`; exige el reingreso vigente desde 20/08, administrador vigente, snapshot exacto e idempotencia. Relaciones legales, engagements, usuario, envíos, payables, obligación y orden están fuera de su write set y cuentan con snapshot protegido independiente.

La recuperación de disponibilidad se aplicó a las **18:38:48Z del 03/09/2026** con resultado `restored`, después de verificar el alias `greenhouse.efeoncepro.com` hacia `dpl_827gG56uPpLohEsmwAVRqK57btWa` (`a824d073a5fb01b916386312f6ae61c0082b67c9`, Production READY) y el 100% del tráfico del worker hacia `ops-worker-00641-dl2` (`203fa04ec`, árbol idéntico al squash productivo). Ambas superficies ya ejecutaban las guardas; el cierre del orquestador continúa por separado conforme al orden canónico deploy → verificación → recovery → verificación → release.

- Member: `active=true`, `status=active`, `assignable=true`, `contract_end_date=null`.
- Asignación existente: `active=true`, `end_date=null`; inicio histórico preservado.
- Auditoría: `offboarding-case-event-41c1c44a-6e65-4abf-bcb2-656c38059e50`.
- Eventos: `outbox-900825ee-43e3-477e-951f-41e1efe48afd` (`member.updated`) y `outbox-d1aad94b-3c52-4f2a-8b8d-33181c589728` (`assignment.updated`). Ambos publicados a las 18:40:03Z; `operating_entity_legal_relationship` y `operating_entity_membership` completaron el evento de member a las 18:42:05Z, y `assignment_membership_sync` completó el de asignación. Canary de contrato real: tras procesarlos, la relación employee sigue terminada y las siete categorías protegidas permanecen idénticas.
- Comparación independiente exacta: las tres relaciones, dos engagements, cuatro envíos, dos payables, usuario, obligación y orden **idénticos** a sus snapshots protegidos.
- El reader SSO resuelve el mismo usuario, correo `valentina.hoyos@efeonce.org`, activo/status activo, rol `collaborator`, elegibilidad `true`. No se simuló login interactivo.

### Incidente independiente del control de release

El run `33793141529` (18:52:58Z) completó todos los deploys y health, pero falló al transicionar el manifest. Una segunda ejecución del mismo SHA, `33793232779`, quedó en cola y fue cancelada a las 19:04:34Z, sin jobs. Su webhook abortó a las 19:04:35Z el manifest activo `a824d073a5fb-41320325-2fc5-4296-96cc-c3f3eae6ec51` del primer run. Actor auditado: `system:github-release-webhook`; motivo: `GitHub webhook Production Release Orchestrator reported cancelled`.

Causa en `github-webhook-reconciler.ts`: el matching prioriza SHA sobre run ID; la cancelación de un duplicado puede afectar otro intento activo. El estado terminal no se fuerza por SQL ni se vuelve a aplicar la recuperación de datos. Reintento completo canónico después de confirmar el drenaje de esos eventos. Readback posterior a los deploys: disponibilidad restaurada y las siete categorías protegidas siguen idénticas.

Los webhooks terminales del primer intento y del duplicado se verificaron procesados, con cero inbox pendientes. Otra sesión inició el reintento `33794622145` a las 19:07:58Z, ocho segundos antes de un dispatch de Codex; Codex canceló inmediatamente su duplicado `33794635945` cuando seguía sin jobs ni manifest. Su webhook quedó `matched`, sin transición, a las 19:08:23Z, antes del nuevo manifest. Se sigue únicamente `33794622145`.

### Estado antes del cierre bajo un único operador

La recuperación de Valentina está aplicada y verificada, incluso después de la cancelación del segundo intento: member y asignación permanecen activos, employee histórica terminada, contractor vigente activo y las siete categorías protegidas idénticas. El pago de agosto continúa pendiente de boleta; no se generaron nuevas transferencias.

El segundo manifest `a824d073a5fb-4306ff12-75d3-4452-a101-e729e8cbf172` quedó **aborted** a las 19:11:53Z. Un evento `workflow_job` del propio run `33794622145`, job `100780469269` (Validate Bicep template), reportó `cancelled`; la lectura final del run muestra **workers y health cancelados**, no aprobados. Los health Azure anteriores también se cancelaron sin runner; no se identificó un fallo de Bicep ni un grupo de concurrencia Azure. Codex no canceló ese run. GitHub confirma en las anotaciones del check `100780409856`: «The run was canceled by @cesargrowth11.» La cuenta está identificada; qué agente/proceso la usó debe aclararse antes de otro intento; se pausaron los reintentos hasta resolver la coordinación.

Los cuatro workers se verificaron Ready después del primer intento, tres en `a824d073` y ops-worker en `203fa04ec` con diff completo vacío. El watchdog final reporta `worker_revision_drift` respecto del último manifest released `62356c9b7fd4`; no equivale a reversión de datos, pero impide declarar el release cerrado. Owner de continuidad: Platform/DevOps, un único operador del release, investigar cancelación y asociación por run ID antes de reintentar. Sin cambios de flags ni env durante esta reparación; ningún SQL de reversión ejecutado.

La coordinación se resolvió posteriormente mediante el commit `587179533`: Claude dejó constancia de su retiro y del ownership de Codex sobre el cierre. Tras verificar ambos webhooks terminales nuevos y cero inbox pendientes, con preflight 19:17:21Z verde salvo la excepción payroll autorizada, Codex lanzó el intento único `33795564223` a las 19:17:30Z. No se cambiaron datos de Valentina.

### Cierre verificado a las 19:30:49Z

El intento `33795564223` terminó **success**, con manifest `a824d073a5fb-c2cf99e9-1ba1-40b3-9d85-76ad0a8e8372` **released** (19:20:51.833Z → 19:30:49.381Z), health **success** a las 19:29:40Z y watchdog **ok**, 4/4 workers sincronizados. Los workers están Ready; tres ejecutan `a824d073` y ops-worker `203fa04ec` con diff de árbol completo vacío. El readback posterior a este release vuelve a confirmar disponibilidad restaurada, contractor vigente y siete categorías protegidas intactas. Acceso elegible con el correo nuevo; login interactivo no ejercitado. Agosto sigue pendiente de boleta.

La recuperación de Valentina y su protección de reingreso quedan cerradas. El defecto independiente de asociación de eventos de release por SHA queda documentado para Platform/DevOps; no se cambió ese control plane en este lote. Los intentos fallidos se conservaron como historia auditable, sin forzar estados terminales ni repetir la recuperación.

## Cierre de documentación y skills

La [matriz de cobertura](VALENTINA_DOCUMENTATION_SKILLS_CLOSURE_2026-09-03.md) registra los dueños actualizados,
verificación documental y capacidades pendientes. No añade otro apply ni otra prueba de login.
