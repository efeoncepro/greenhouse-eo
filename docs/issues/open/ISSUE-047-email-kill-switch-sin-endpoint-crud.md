# ISSUE-047 — Kill switch de email sin endpoint CRUD — solo operable por SQL directo

## Ambiente

production + staging

## Detectado

2026-04-13, audit E2E del sistema de email post-TASK-382

## Síntoma

La tabla `email_type_config` existe y el código la consulta en cada envío (`checkEmailTypeEnabled()` en `delivery.ts`). Sin embargo, no existe ningún endpoint en `/api/admin/` para insertar, actualizar o consultar registros en esa tabla. Para pausar un tipo de email en producción hoy habría que ejecutar SQL directo en la base de datos — lo cual requiere acceso de `greenhouse_ops` y rompe el flujo operativo.

## Causa raíz

TASK-382 implementó la lectura del kill switch (`checkEmailTypeEnabled()`) y creó la tabla vía migración, pero no implementó el endpoint de gestión. El scope de la task no incluyó el CRUD admin.

## Impacto

- El kill switch existe técnicamente pero es inoperable sin acceso a la DB
- En un incidente donde se necesite pausar urgentemente `payroll_export` o `notification`, no hay mecanismo rápido
- El feature está completo en la mitad — leer sin escribir no tiene utilidad operativa

## Solución propuesta

Crear endpoint `src/app/api/admin/email-type-config/route.ts`:

```
GET  /api/admin/email-type-config          → listar todos los tipos con su estado
POST /api/admin/email-type-config          → { emailType, enabled, pausedReason } → upsert
```

Requiere `requireAdminTenantContext()`. El POST con `enabled: false` y `pausedReason` obligatorio al pausar.

## Archivos afectados

- Faltante: `src/app/api/admin/email-type-config/route.ts`
- `src/lib/email/delivery.ts:35-45` — `checkEmailTypeEnabled()` ya consulta la tabla correctamente

## Estado

open

## Relacionado

- TASK-382 — creó la tabla y el read-path pero no el endpoint de escritura
- TASK-383 — puede absorber la creación del endpoint en su scope, o derivarse como task propia
