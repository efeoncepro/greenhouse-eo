# Valentina Hoyos — recuperación de acceso y pendientes de reingreso

- Fecha: 2026-09-03.
- Estado: acceso recuperado y etapas contractuales separadas; payable agosto creado por 12/31, pendiente de boleta.
- Autorización: Julio Reyes, instrucción explícita en Codex «Haz eso sin romper nada» tras discovery de identidad, contratación y pago parcial.
- Alcance aplicado: recuperación puntual de datos, sin cambios de schema, código de producto, permisos, flags ni despliegues.

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

Estado al preparar esta corrección: **código completo local; despliegue del consumidor y aplicación de la compensación pendientes**. La compensación no debe aplicarse hasta verificar que la revisión activa del consumidor contiene la guarda contra resurrección de la relación employee terminada.
