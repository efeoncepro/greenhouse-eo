# Recuperar disponibilidad tras una salida histórica aplicada a un reingreso

Este runbook aplica cuando un caso de salida ejecutado cerró por error la disponibilidad de una persona que ya tiene un episodio laboral posterior vigente. No crea contrataciones, no reabre relaciones legales y no modifica pagos.

Canon: [decisión de recuperación](../../architecture/GREENHOUSE_WORKFORCE_REENTRY_RECOVERY_DECISION_V1.md). Implementación: `src/lib/workforce/offboarding/lifecycle-recovery.ts`. La recuperación se ejecuta por persona; no es una operación en lote.

## Antes de aplicar

1. Verifica la revisión **activa** del consumidor `operating_entity_legal_relationship`: debe incluir la prohibición de reabrir relaciones terminadas desde `member.updated`. Verifica también la guarda del executor que respeta episodios posteriores. El código local no prueba despliegue.
2. Lee el caso ejecutado, member, relaciones, engagements, asignaciones y eventos. Conserva un snapshot independiente de contratos, envíos, payables, obligaciones, órdenes y acceso. No derives fechas laborales desde desactivación de cuenta.
3. Construye un plan con `actorUserId`, `offboardingCaseId`, `memberId`, `profileId`, `idempotencyKey`, `reason` (mínimo 20 caracteres), `evidence`, `expectedSnapshot`, `expectedSnapshotHash` y `desired`. Los campos esperados son estado observado actual; los deseados son el target explícitamente autorizado. No llames evidencia histórica a un valor inferido.
4. `expectedSnapshot` contiene `caseUpdatedAt`, member (`active`, `status`, `assignable`, `contractEndDate`, `updatedAt`) y asignaciones ordenadas por `assignmentId` (`active`, `endDate`, `updatedAt`). Usa `hashLifecycleRecoverySnapshot` para el hash. Mantén el archivo fuera de git y con permisos 0600.

## Comprobar y ejecutar

El CLI usa el loader y perfil Postgres runtime canónicos; no importa credenciales arbitrarias ni cambia permisos.

```sh
NODE_OPTIONS=--conditions=react-server pnpm exec tsx scripts/workforce/restore-offboarding-lifecycle.ts --plan-file /ruta/plan.json
```

Debe devolver `preview`. El plan se rechaza si cambió el snapshot, no existe reingreso vigente posterior en la misma entidad, hay asignaciones de otra persona o el actor no es admin vigente.

Después de revisar ese resultado y verificar el consumidor desplegado:

```sh
NODE_OPTIONS=--conditions=react-server pnpm exec tsx scripts/workforce/restore-offboarding-lifecycle.ts --plan-file /ruta/plan.json --apply
```

Member, asignaciones explícitas, auditoría y eventos se confirman juntos. La misma clave y contenido devuelven `already_applied`; otra solicitud con esa clave se rechaza. No cambies el snapshot para vencer un conflicto sin investigar qué ocurrió.

## Verificación y cierre

Relee los campos restaurados, receipt de `offboarding_case.lifecycle_writeback_reverted`, eventos `member.updated` y `assignment.updated` y su procesamiento. Compara los objetos protegidos con el snapshot: employee antiguo sigue terminado, contractor vigente sigue activo y dinero/documentos no cambian. Comprueba readers de acceso y pertenencia además de las filas base.

Si falla una validación, conserva el estado y explica el bloqueo. No repitas `updateMember(active=true)`, no reabras contratos ni omitas eventos. La retirada de un bloqueo requiere resolver su causa, no alterar controles.
