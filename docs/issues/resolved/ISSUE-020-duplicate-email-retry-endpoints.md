# ISSUE-020 — 3 endpoints duplicados de retry batch de email sin error handling

## Ambiente

staging + production

## Detectado

2026-04-06, revision de codigo end-to-end del modulo de emails

## Sintoma

Existen 3 endpoints admin que hacen lo mismo (`processFailedEmailDeliveries()`), dos de ellos sin `try-catch`. Si el proceso falla, el usuario ve un 500 generico en la UI de Admin Ops Health.

## Causa raiz

Acumulacion incremental de endpoints sin consolidacion:

| Endpoint | Error handling | Usado por |
|----------|---------------|-----------|
| `/api/admin/operations/email-delivery-retry` | Si | Nada activo |
| `/api/admin/ops/email-delivery/retry-failed` | **No** | AdminOpsHealthView linea 838 |
| `/api/admin/ops/email-delivery-retry` | **No** | AdminOpsHealthView linea 1058 |

Adicionalmente existe el cron canonico `/api/cron/email-delivery-retry` que SI tiene error handling.

## Impacto

- Superficie de API innecesariamente grande (3 endpoints para 1 funcion)
- 2 endpoints sin error handling expuestos en la UI admin
- Confusion para futuros desarrolladores sobre cual es el canonico

## Solucion

Verificacion realizada 2026-04-13: los dos endpoints duplicados (`/api/admin/operations/email-delivery-retry` y `/api/admin/ops/email-delivery/retry-failed`) ya no existen en el codebase. Solo existe el canonico `/api/admin/ops/email-delivery-retry` con `try-catch` apropiado. El issue se cierra como STALE — la consolidacion ya habia ocurrido antes de la auditoria de TASK-382.

## Verificacion

- `find src/app/api -name "route.ts" | xargs grep -l "processFailedEmailDeliveries"` retorna 2 archivos: el admin canonico y el cron. No hay duplicados.
- `/api/admin/ops/email-delivery-retry` tiene try-catch que devuelve `{ error: message }` con status 502.

## Estado

resolved

## Resuelto

2026-04-13 (STALE — duplicados ya habian sido removidos; verificado en auditoria TASK-382)

## Relacionado

- `src/app/api/admin/ops/email-delivery-retry/route.ts`
- `src/app/api/cron/email-delivery-retry/route.ts`
- TASK-382 (auditoria que detecto el estado real)
