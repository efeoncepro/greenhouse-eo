# Recuperar disponibilidad tras una salida histórica aplicada a un reingreso

Este runbook aplica cuando un caso de salida ejecutado cerró por error la disponibilidad de una persona que ya tiene un episodio laboral posterior vigente. No crea contrataciones, no reabre relaciones legales y no modifica pagos.

Canon: [decisión de recuperación](../../architecture/GREENHOUSE_WORKFORCE_REENTRY_RECOVERY_DECISION_V1.md). Implementación: `src/lib/workforce/offboarding/lifecycle-recovery.ts`. La recuperación se ejecuta por persona; no es una operación en lote.

## Antes de aplicar

1. Verifica el alias/deployment **activo de Vercel** y la revisión/porcentaje de tráfico **activo de Cloud Run**: ambas superficies pueden ejecutar consumidores reactivos. Verifica la revisión **activa** del consumidor `operating_entity_legal_relationship`: debe incluir la prohibición de reabrir relaciones terminadas desde `member.updated`. Verifica también la guarda del executor que respeta episodios posteriores. El código local no prueba despliegue.
2. Distingue el diagnóstico `reentry_preserved` de `pnpm workforce:offboarding:recovery` (evitar otra baja) de esta compensación (restaurar una baja incorrecta ya aplicada). No ejecutan la misma operación. Lee el caso ejecutado, member, relaciones, engagements, asignaciones y eventos. Conserva un snapshot independiente de contratos, envíos, payables, obligaciones, órdenes y acceso. No derives fechas laborales desde desactivación de cuenta.
3. Construye un plan con `actorUserId`, `offboardingCaseId`, `memberId`, `profileId`, `idempotencyKey`, `reason` (mínimo 20 caracteres), `evidence`, `expectedSnapshot`, `expectedSnapshotHash` y `desired`. Los campos esperados son estado observado actual; los deseados son el target explícitamente autorizado. No llames evidencia histórica a un valor inferido.
4. `expectedSnapshot` contiene `caseUpdatedAt`, member (`active`, `status`, `assignable`, `contractEndDate`, `updatedAt`) y asignaciones ordenadas por `assignmentId` (`active`, `endDate`, `updatedAt`). Normaliza timestamps a ISO UTC y fechas a `YYYY-MM-DD`/null; usa `hashLifecycleRecoverySnapshot` para el SHA-256 estable, no un hash del texto JSON formateado. Mantén el archivo fuera de git y con permisos 0600.

## Alcance que debe respaldar el plan

El actor debe ser un usuario `active=true`, `status=active`, con grant `efeonce_admin` activo y vigente. El command comprueba esos hechos en base; declarar un rol en el plan no autoriza. El caso debe seguir ejecutado, ser una salida real y apuntar exactamente al member/profile. Exige una relación `employee|contractor|executive` activa, posterior al LWD, ya iniciada y vigente hoy **en la misma entidad legal del caso**. Un engagement activo puede proteger contra la baja en el executor, pero por sí solo no autoriza esta restauración.

El objetivo permite `active=true`, `status=active`, `assignable` booleano explícito y `contractEndDate` ISO real o null. Las asignaciones deben ser las mismas de ambos conjuntos, sin duplicados, propias del member y con `active=true`; su fin no puede preceder su inicio existente. No crea asignaciones, no altera el inicio histórico y no reabre contratos. Las filas se bloquean y el estado observado se compara nuevamente dentro de la transacción; el modo preview no reserva el estado para una ejecución futura.

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

Relee los campos restaurados, receipt de `offboarding_case.lifecycle_writeback_reverted`, eventos `member.updated` y `assignment.updated` y su procesamiento **completado para esos mismos IDs** por `operating_entity_legal_relationship`, `operating_entity_membership` y `assignment_membership_sync`, según corresponda. Publicado no equivale a procesado. Compara los objetos protegidos con el snapshot: employee antiguo sigue terminado, contractor vigente sigue activo y dinero/documentos no cambian. Comprueba readers de acceso y pertenencia además de las filas base.

Si falla una validación, conserva el estado y explica el bloqueo. No repitas `updateMember(active=true)`, no reabras contratos ni omitas eventos. La retirada de un bloqueo requiere resolver su causa, no alterar controles.


## Qué no se considera terminado

- `restored` confirma el commit, no la convergencia de consumidores ni el cierre del release.
- Un reader SSO elegible verifica la configuración de acceso; no prueba un login interactivo de la persona.
- Una boleta faltante sigue siendo un bloqueo Finance; no se elimina con esta reparación ni se reutiliza la de otra etapa.
- Una cancelación/fallo del orquestador no autoriza repetir la reparación ni forzar el manifest: relee los datos y resuelve el control de release por su carril propio.

Registra plan/hash, actor, razón, receipt, eventos, comparación protegida, deployment/worker y estado del release en una auditoría fechada. Conserva el material privado fuera de git. El caso de referencia es [Valentina 2026-09-03](../../audits/payroll/VALENTINA_REHIRE_IDENTITY_RECOVERY_2026-09-03.md): no es una plantilla para repetir sus IDs o montos en otra persona. El SQL específico retirado `restore-valentina-hoyos-2026-09-03.sql` no es un camino de recuperación.
