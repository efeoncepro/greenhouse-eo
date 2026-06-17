# Capacidades Kortex logradas desde Greenhouse — 2026-06-17

## En simple

Greenhouse ya puede operar Kortex como plataforma hermana: observar su estado, confirmar el portal conectado, ejecutar comandos gobernados y auditar cada intento sin saltarse a Kortex ni escribir HubSpot directo.

## Capacidades listas

### 1. Observar Kortex desde Greenhouse

Greenhouse puede consultar el control-plane Kortex para saber:

- que repo/commit Kortex esta corriendo;
- que OpenAPI expone;
- que portal HubSpot esta conectado;
- que binding Greenhouse/Kortex esta activo;
- cual fue el ultimo audit;
- que fuentes estan degradadas.

Endpoint Greenhouse:

`GET /api/admin/kortex/control-plane`

### 2. Ejecutar auditorias Kortex

Greenhouse puede pedirle a Kortex que corra una auditoria de portal y recibir una respuesta redacted con audit trail.

Comando:

`kortex.audit.run`

Smoke validado:

- `commandExecutionId=EO-APC-F75FD63E`
- `kortexOperationId=d8b4b769-4c33-4193-bb15-9545253ac521`
- status `completed`

### 3. Usar strategy ops de Kortex

Greenhouse puede iniciar y operar el ciclo strategy de Kortex:

- normalizar una estrategia;
- crear intake/workspace;
- seed desde auditoria;
- actualizar workspace;
- registrar compilation run;
- compilar workspace;
- registrar approval decision;
- crear conversaciones strategy;
- enviar chat strategy;
- extraer estrategia estructurada desde una conversacion.

Smoke validado:

- `kortex.strategy.normalize` -> `200 completed`
- `commandExecutionId=EO-APC-0D842212`

### 4. Preparar despliegues programaticos

Greenhouse puede ejecutar dry-runs de release candidates y tiene los comandos para ejecutar:

- schema release;
- workflow candidates;
- custom object candidates.

Pero los comandos live quedan bloqueados hasta que el operador apruebe activar el flag live y exista confirmacion humana.

Estado staging vigente:

- `KORTEX_COMMAND_LIVE_EXECUTE_ENABLED=true` por aprobacion del operador.
- `kortex.strategy.release_candidate.execute_workflows` con release candidate dummy -> `409 kortex_preview_required`; esto valida que el bloqueo por flag ya no aplica y que el guard de dry-run sigue activo antes de cualquier write real.

### 5. Operar hub profile

Greenhouse puede pedir a Kortex que declare o ajuste el perfil de hubs del portal conectado.

Comando:

`kortex.portal.hub_profile.put`

### 6. Operar comandos admin/breakglass

Greenhouse tiene el contrato para comandos admin Kortex:

- trigger snapshots;
- verify auth;
- seed users;
- bootstrap E2E agent;
- execute internal strategy operation.

Quedan bloqueados por defecto y requieren flag admin + frase + token server-only.

Estado staging vigente:

- `KORTEX_COMMAND_ADMIN_ENABLED=true` por aprobacion del operador.
- `KORTEX_COMMAND_ADMIN_TOKEN` provisionado server-only.
- `kortex.admin.users.bootstrap_e2e_agent` -> `200 completed`, `commandExecutionId=EO-APC-E138ACF4`; valida admin flag + token bootstrap sin tocar HubSpot.

## Que todavia no significa

Esto no significa que production live/admin este abierto. Significa que el contrato esta listo y probado en staging, donde live/admin quedaron prendidos para pruebas controladas por aprobacion explicita del operador. Production sigue cerrado.

Para habilitar escrituras reales en production hace falta:

1. aprobacion explicita del operador;
2. dry-run vigente cuando aplique;
3. activar `KORTEX_COMMAND_LIVE_EXECUTE_ENABLED=true` o `KORTEX_COMMAND_ADMIN_ENABLED=true`;
4. confirmar frase humana;
5. monitorear command execution + Kortex runtime.
