# Issue Tracker

Pipeline de incidentes operativos del portal.

## Convención

- Los issues usan `ISSUE-###` como ID estable.
- Los archivos viven en `docs/issues/{open,resolved}/`.
- Un issue se mueve a `resolved/` cuando se confirma la solución en el ambiente afectado.
- A diferencia de las tasks (`TASK-###`), los issues son reactivos: documentan un problema encontrado en runtime, no trabajo planificado.

## Estados

- `open`: incidente detectado, en diagnóstico o pendiente de solución.
- `resolved`: solución aplicada y verificada en el ambiente afectado.

## Protocolo operativo

- El modelo operativo canónico de issues vive en `docs/operations/ISSUE_OPERATING_MODEL_V1.md`.
- Un issue puede resolverse directamente sin task si el fix es localizado y verificable.
- Al resolverse, el archivo debe moverse de `docs/issues/open/` a `docs/issues/resolved/` y el tracker debe actualizarse en el mismo lote.

## Plantilla

```markdown
# ISSUE-### — Título breve

## Ambiente

production | staging | preview

## Detectado

Fecha, canal de detección (Slack alert, Sentry, Admin Center, usuario)

## Síntoma

Qué se observa desde fuera.

## Causa raíz

Qué lo provoca a nivel técnico.

## Impacto

Qué funcionalidad está afectada y para quién.

## Solución

Qué se hizo o hay que hacer para resolverlo.

## Verificación

Cómo confirmar que se resolvió.

## Estado

open | resolved

## Relacionado

Tasks, docs de arquitectura, o commits relacionados.
```

## Siguiente ID disponible

`ISSUE-011`

## Open

| ID          | Título                                                                                                                             | Ambiente             | Detectado  | Estado   |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ---------- | -------- |
| `ISSUE-005` | [Payroll close route drains global notification backlog](open/ISSUE-005-payroll-close-route-drains-global-notification-backlog.md) | preview + production | 2026-04-05 | open     |
| `ISSUE-006` | [Payroll leave fallback silently zeroes unpaid leave](open/ISSUE-006-payroll-leave-fallback-silently-zeroes-unpaid-leave.md)       | preview + production | 2026-04-05 | open     |
| `ISSUE-002` | [Nubox sync conformed: data integrity (period mixing, identity loss)](open/ISSUE-002-nubox-sync-conformed-data-integrity.md)       | staging + production | 2026-03-30 | open     |
| `ISSUE-003` | [Permission denied for schema greenhouse_notifications](open/ISSUE-003-notification-schema-permission-denied.md)                   | preview              | 2026-04-01 | resolved |
| `ISSUE-004` | [column "organization_id" does not exist en finance route](resolved/ISSUE-004-finance-organization-id-column-missing.md)           | preview              | 2026-04-02 | resolved |

## Resolved

| ID          | Título                                                                                                                                             | Ambiente             | Detectado  | Resuelto   | Causa                                                                                  |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ---------- | ---------- | -------------------------------------------------------------------------------------- |
| `ISSUE-009` | [Reactive event backlog can accumulate without Ops visibility](resolved/ISSUE-009-reactive-event-backlog-can-accumulate-without-ops-visibility.md) | develop runtime      | 2026-04-05 | 2026-04-05 | Admin Ops no contaba backlog reactivo oculto entre `published` y `outbox_reactive_log` |
| `ISSUE-010` | [Finance schema drift logger type mismatch](resolved/ISSUE-010-finance-schema-drift-logger-type-mismatch.md)                                       | staging + production | 2026-04-05 | 2026-04-05 | `logFinanceSchemaDrift` tipaba `Error` pero catch da `unknown`                         |
| `ISSUE-007` | [Finance fallback writes can duplicate income and expenses](resolved/ISSUE-007-finance-fallback-writes-can-duplicate-income-and-expenses.md)       | preview + production | 2026-04-05 | 2026-04-05 | Fallback recalculaba un segundo ID en `income` y `expenses`                            |
| `ISSUE-008` | [Finance routes mask schema drift as empty success](resolved/ISSUE-008-finance-routes-mask-schema-drift-as-empty-success.md)                       | preview + production | 2026-04-05 | 2026-04-05 | Routes devolvían vacío ambiguo ante drift de schema                                    |
| `ISSUE-001` | [SSL bad certificate en webhook-dispatch](resolved/ISSUE-001-ssl-bad-certificate-production.md)                                                    | production           | 2026-03-30 | 2026-03-30 | `GREENHOUSE_POSTGRES_IP_TYPE` faltante en production                                   |
