# ISSUE-134 — Payroll UI ofrece revertir en periodo exportado y trata ausencia self-service como error

## Ambiente

Dev/staging; `/hr/payroll` y `/my/payroll`.

## Detectado

2026-08-01, auditoría Playwright/Chrome autenticada.

## Síntoma

En un periodo exportado la UI todavía puede mostrar “Revertir”, aunque el backend lo bloquea. Para un agente sin payroll vinculado, `/my/payroll` responde 422/error operativo en vez de un estado vacío esperado. Esto agrega ruido y hace difícil distinguir un bug real de una condición normal.

## Causa raíz

La visibilidad de acciones no está derivada del estado/capability reader canónico y el self-service no modela “sin nómina asignada” como estado de dominio.

## Impacto

El operador recibe una acción imposible y el usuario ve un error cuando no existe un registro que mostrar; aumenta reintentos y soporte, y puede ocultar errores reales.

## Solución

Exponer `availableActions` y estado de payroll desde el reader server-side; ocultar/deshabilitar con razón las acciones incompatibles con exportado/capability. Convertir ausencia de vínculo en `200` con empty state seguro, manteniendo 4xx sólo para auth o contrato inválido.

## Verificación

GVC/Playwright en periodos draft/calculated/exported y con/sin capability; `/my/payroll` para agente vinculado y no vinculado; cero errores de consola/API inesperados y accesibilidad conservada.

## Estado

open

## Relacionado

- `TASK-1625`
- `.captures/2026-08-01-payroll-audit/`
- `src/app/api/my/payroll/**`
