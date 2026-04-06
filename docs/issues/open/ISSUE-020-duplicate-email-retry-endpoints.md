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

1. Consolidar a un solo endpoint admin: `/api/admin/ops/email-delivery-retry`
2. Agregar `try-catch` con respuesta de error estructurada
3. Eliminar los otros 2 endpoints
4. Actualizar AdminOpsHealthView para usar el endpoint canonico
5. Mantener `/api/cron/email-delivery-retry` como endpoint separado (auth diferente)

## Verificacion

1. Solo existe 1 endpoint admin de retry batch
2. El boton en Admin Ops Health funciona y muestra errores correctamente
3. El cron sigue funcionando independientemente

## Estado

open

## Relacionado

- `src/app/api/admin/operations/email-delivery-retry/route.ts`
- `src/app/api/admin/ops/email-delivery/retry-failed/route.ts`
- `src/app/api/admin/ops/email-delivery-retry/route.ts`
- `src/app/api/cron/email-delivery-retry/route.ts`
- `src/views/greenhouse/admin/AdminOpsHealthView.tsx`
