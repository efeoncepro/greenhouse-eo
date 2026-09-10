# Habilitación de servicios por organización

Dueño: Client Experience / Platform. TASK-1852, EPIC-046.

Estado verificado 2026-09-10: código servido en Production, SHA `5726ce9d90`, con altas nuevas OFF. El mapping
comercial de ambas cuentas está declarado (`engagement_commercial_terms.bundled_modules`), las tres personas Berel
existen como usuarios Greenhouse con invitación diferida (sin token ni correo) y el preview de Sky es limpio en el
runtime productivo. El apply sigue pendiente de una sesión humana administrativa y del flag; la certificación de
login/canales sigue abierta. [Readback](../audits/client-portal/TASK-1852_MAPPING_PROVISIONING_READBACK_2026-09-10.json).
[Evidencia del rollout y rollback](../audits/client-portal/TASK-1852_ROLLOUT_2026-09-09.md).
[Dossier de continuación para Claude](../audits/client-portal/TASK-1852_CLAUDE_DISCOVERY_2026-09-09.md).

## Contrato y límites

La unidad es una organización canónica, una lista explícita de pares servicio/módulo y personas de
esa cuenta. La misma implementación sirve otras organizaciones; los nombres de Berel y Sky no forman
parte de sus reglas. Servicios y términos comerciales permanecen en sus dominios; los módulos y sus
transiciones conservan el catálogo, commands, auditoría y outbox del portal.

`preview` lee un snapshot PostgreSQL consistente, sin escrituras de negocio ni llamadas a proveedores.
`canApply` significa que las precondiciones de configuración pasan. **No certifica apertura operativa**:
login humano, rutas autenticadas, cobertura del productor y entrega/cadencia permanecen en `readiness`.
Los datos de preferencias ausentes no son consentimiento. Un canal configurado no demuestra entrega.

## Declarar el mapping comercial (servicio → módulos)

El preview exige exactamente un término vigente del servicio que incluya el módulo. El mapping vive en
`engagement_commercial_terms.bundled_modules` y se declara con el writer canónico de Commercial, nunca con SQL:

- API: `GET|POST /api/platform/app/commercial/services/{serviceId}/terms` (`commercial.engagement.read` /
  `commercial.engagement.declare`; sesión humana interna). Body: `{kind, effectiveFrom, monthlyAmountClp?,
  successCriteria?, bundledModules[], reason}`. El actor es la persona autenticada; `declaredBy` nunca va en el body.
- CLI HTTP: `pnpm exec tsx scripts/commercial/declare-commercial-terms.ts --service-id <SVC> --base-url <url>
  --operation declare --input terms.json --token-env GREENHOUSE_APP_ACCESS_TOKEN` (`--operation read` por defecto).
- El writer valida cada `module_key` contra el catálogo ACTIVO del portal (`modules.effective_to IS NULL`) y falla
  cerrado ante claves desconocidas, repetidas o deprecadas; cierra el término anterior y abre el nuevo en la misma
  transacción con audit `declared` y outbox `service.engagement.declared`. Importes ausentes se declaran `null`,
  nunca `0`. Un servicio inactivo, `legacy_seed_archived` o `unmapped` no acepta términos.
- Un servicio sin módulo en el catálogo (p. ej. marketing de contenidos) queda declarado en el término sin
  `bundled_modules` para esa prestación: es una decisión de Commercial/Product, no un dato que el preview invente.

## Preparar y revisar

1. Resuelve IDs canónicos; no selecciones cuentas por coincidencia de nombre. Usa el manifiesto de la
   [primera cohorte](client-service-enablement/berel-sky.v1.json) como entrada de inventario, nunca como contrato.
2. Envía `organizationId`, `targets: [{serviceId, moduleKey}]` y `personIds` a
   `POST /api/platform/app/client-services/enablement/preview`. Para un servicio todavía ausente,
   `serviceId: null` permite documentar el bloqueo; no permite asignar.
3. Revisa `inventory`, `changes`, `people`, `routes`, `blockers` y `readiness`. Confirma el servicio vigente,
   un único término vigente que incluya el módulo, catálogo vigente, pertenencia y vetos por persona.
4. Conserva el JSON completo y su `fingerprint`. Un nuevo snapshot no sustituye la aprobación del anterior.
5. Antes de rollout, prueba las rutas con la persona autorizada, fuente/objeto y canal concretos. La
   convergencia de identidad consume TASK-1834; los destinos del catálogo consumen sus dueños (TASK-1687).

## CLI y API

La CLI usa HTTP y valida el mismo esquema; necesita una sesión app autenticada en la variable indicada,
sin tokens en argumentos, archivos de evidencia ni logs. `preview` es la operación predeterminada:

```sh
pnpm exec tsx scripts/client-portal/service-enablement.ts \
  --base-url https://greenhouse.efeoncepro.com --input preview-request.json \
  --output preview-result.json --token-env GREENHOUSE_APP_ACCESS_TOKEN
```

Para el lane ecosystem usa `--lane ecosystem`, token de consumer y ambos
`--external-scope-type` / `--external-scope-id`. Sólo el binding `internal` puede leer este inventario
administrativo. Una organización/space cliente no obtiene datos administrativos.

## Aplicar y compensar

Cada apply cliente requiere instrucción explícita del operador y verificación de las precondiciones de la
cuenta. El 2026-09-09 el operador autorizó el rollout técnico de TASK-1852 y su excepción de promoción;
esa autorización no cubrió apply cliente, invitaciones o envíos, ni sustituye términos, pertenencia, login
o readiness. La confirmación de seis personas resolvió la selección, no la provisión ni la activación.

`CLIENT_SERVICE_ENABLEMENT_WRITES_ENABLED` es `false` por defecto. La administración app revalida usuario
activo, estado activo, tenant interno, route group admin y capability de lectura; apply exige
`client_portal.module.enable:create`, rollback `client_portal.module.pause:update`. Sesiones `authMode=agent` no pueden aprobar writes en App/Nexa.
La autoridad humana llega por dos canales del mismo primitive y queda registrada como `authority` en el recibo:
`app_session` (cookie/token first-party de la persona) o `delegated_oauth` (bearer sister-platform emitido PARA la
persona con la capability `client_services.enablement.write`, con `oauthClientId`/`oauthAccessTokenId` durables y
sesión humana, o el cliente de exchange `efeonce-mcp-client-services`, que sólo mintea para un humano interno
verificado por Entra que ya puede habilitar módulos). El scope responde si ese cliente puede pedir esta clase de
acción; los derechos de la persona se releen dentro de la transacción. Para operar el canal delegado en un
runtime: incluir `efeonce-mcp-client-services` en `GREENHOUSE_SISTER_PLATFORM_OAUTH_ALLOWED_CONSUMERS`, exponer el
scope de entrada `efeonce.mcp.client_services.write` en la app Entra del MCP (clase propia, nunca en un cliente
público/compartido) y federar la tool en el gateway. El cliente OAuth ya está sembrado (migración
`20260910005222927`); mientras falte cualquiera de los tres pasos, el canal falla cerrado. El rol EFEONCE_ADMIN incluye compensación conforme al contrato canónico del portal; no se conceden nuevos roles a personas.
**La presencia de la capability en catálogo no garantiza su concesión**: certifícala para el operador
de alta y compensación antes de activar. TASK-1852 corrige la omisión de `module.pause:update` en el default de EFEONCE_ADMIN y prueba alta/compensación con el mismo rol. El rollout debe verificarlo en la sesión vigente.

- Apply: `POST .../apply` con `{proposal: <request revisado>, fingerprint, idempotencyKey}`.
- Compensación: `POST .../rollback` con `{organizationId, operationId, idempotencyKey}`.
- La CLI selecciona esas operaciones mediante `--operation apply|rollback`, con el mismo body en `--input`.
- Usa la misma clave y el mismo payload al reintentar tras una respuesta perdida. Un payload diferente
  con la misma clave produce conflicto; un preview desactualizado exige nueva lectura y revisión.
- Apply es atómico por organización. No hay atomicidad entre cuentas. No reanuda pausas existentes,
  cambia overrides ni toca identidades, contratos, preferencias, proveedores o mensajes.
- El recibo enumera altas propias y asignaciones conservadas. Queda en el command store y, cuando hay
  altas, en el audit inmutable de asignaciones, para sobrevivir la retención del transporte.
- Compensación sólo pausa altas propias que conserven su revisión. Si otra persona modificó una, rechaza
  todo el lote. No usa churn/expire para un rollback técnico ni cierra una fecha el mismo día.
- Después de compensar, relee estado/audit/outbox antes de apagar el flag. Apagarlo bloquea ambos writes.

## API/MCP/Nexa y autoridad

MCP interno: `preview_client_service_enablement`, `apply_client_service_enablement`,
`rollback_client_service_enablement`. El preview comparte semántica con API app y CLI.
Los comandos ecosystem/MCP devuelven `403 invalid_delegated_context`: su consumer acredita una máquina,
no la aprobación humana que exige `approved_by_user_id`. No se ha federado ninguna tool nueva.
La paridad de escritura delegada queda bloqueada hasta que exista autoridad atribuible, sin actor en el body.
Las rutas ecosystem mutantes todavía usan el wrapper de lectura porque permanecen fail-closed; antes de abrirlas
deben adoptar un command lane que conserve reautorización e idempotencia sin duplicar el command store. Después
se sincroniza/federa el manifest en el gateway o se registra una exclusión formal; no basta con que la tool exista
en el servidor interno Greenhouse.

Nexa registra las acciones de alta y compensación detrás del runtime existente y del flag de writes.
La propuesta prepara el input en servidor y lo valida antes de mostrarse; confirmación lo vuelve a validar
y reautoriza antes de replay. Se reutiliza la tarjeta existente; no cambia layout, tokens ni navegación.

## Registrar el destino Teams del cliente (chat grupal)

Las notificaciones salen por el Teams bot (Bot Framework). El chat grupal compartido con el cliente se registra como
destino `recipient_kind='chat_group'` en `teams_notification_channels`, scopeado al Space, con
`POST /api/admin/clients/{organizationId}/lifecycle/teams/chat` (`client.lifecycle.case.advance`) y body
`{chatId: '19:…@thread.v2', displayName}`. El writer `writeTeamsGroupChatForSpace` sólo LEE Graph
(`GET /chats/{id}` + `installedApps`): marca `ready` únicamente si el bot de Greenhouse está instalado en el chat; si no,
`pending_setup` con la razón persistida. Registrar un destino no envía nada; el preview lo consume como readiness
(`teams_destination_unverified` desaparece). La migración `20260910013234351` relajó el CHECK legado que exigía
`team_id`/`channel_id` a todo `teams_bot`; la consistencia por `recipient_kind` la gobierna el CHECK de TASK-671.
Berel y Sky quedaron registrados `ready` el 2026-09-10 con pertenencia del bot verificada.

## Preferencias y cadencia de notificación (política explícita)

`preferences_not_explicit` se resuelve declarando preferencias por persona, nunca infiriéndolas. La política canónica
`client_service_default_v1` (`src/lib/notifications/client-preference-policy.ts`) se aplica con
`POST /api/admin/clients/{organizationId}/lifecycle/portal-users/notification-preferences`
(`client.lifecycle.portal_user.invite`, body `{userIds, policy}`) sólo a personas `client` del cliente de la
organización: `report_ready` y `feedback_requested` in-app + email; `sprint_milestone` y `delivery_update` sólo in-app.
Cadencia: por evento (el Hub V1 no agrega; digest en TASK-387); el destino Teams del cliente recibe únicamente avisos de
clase reporte/feedback cuando Insights los emita (TASK-1848). La persona puede cambiar sus preferencias desde el portal
y su elección prevalece. Aplicada a las seis personas de Berel y Sky el 2026-09-10 por decisión del operador.

## Provisionar personas sin enviar mensajes

`inviteClientPortalUser` admite `delivery: 'deferred'`: crea `client_users` (`status='invited'`,
`auth_mode='invited'`) y roles con audit/outbox, sin mintear token ni enviar correo. La ruta
`POST /api/admin/clients/{organizationId}/lifecycle/portal-users/invite` acepta `delivery` en el body; la entrega
posterior es `POST .../portal-users/deliver` con `{userIds}` (misma capability, envía correo: sólo con instrucción
explícita del operador). El preview reporta a esas personas como `person_invitation_pending` (Identity), distinto de
`person_not_authorized_in_organization`; un runtime anterior al release colapsa ambos en el segundo código.
**Decisión del operador 2026-09-10:** las invitaciones de Berel NO se entregan hasta que las interfaces de cliente estén
listas; ninguna sesión debe ejecutar `portal-users/deliver` sin una nueva instrucción explícita.

## Verificación

Tests de dominio/autoridad/adapters y protocolo MCP están junto al código. La suite
`local-postgres.test.ts` exige `TASK1852_LOCAL_PG_SOCKET` terminado en `/.captures/task-1852/pg-socket`,
puerto 55452, database `task_1852_test` y conexión UNIX local. Usa el cliente DB canónico, fixtures
sintéticos y nunca carga `.env.local`. Prueba FK, aislamiento, concurrencia, atomicidad y compensación.
Primera preparación local (requiere PostgreSQL instalado, sin usar el servicio de Cloud SQL):

```sh
TASK1852_PG_BIN="$(brew --prefix postgresql@18)/bin"
mkdir -p .captures/task-1852/pg-socket
"$TASK1852_PG_BIN/initdb" -D .captures/task-1852/pg-data --auth=trust
"$TASK1852_PG_BIN/pg_ctl" -D .captures/task-1852/pg-data \
  -l .captures/task-1852/pg-server.log \
  -o "-k $PWD/.captures/task-1852/pg-socket -p 55452 -h ''" start
"$TASK1852_PG_BIN/createdb" -h "$PWD/.captures/task-1852/pg-socket" -p 55452 task_1852_test
TASK1852_LOCAL_PG_SOCKET="$PWD/.captures/task-1852/pg-socket" pnpm exec vitest run --project unit \
  src/lib/client-portal/enablement/local-postgres.test.ts
"$TASK1852_PG_BIN/pg_ctl" -D .captures/task-1852/pg-data stop
```

`initdb`/`createdb` se ejecutan una sola vez. Reusar únicamente este cluster técnico; la suite trunca
sus fixtures y exige socket privado, nombre de base exacto y `inet_server_addr() IS NULL`.
Sin esa variable queda omitida: **omisión no es evidencia de aprobación**. Para verificaciones contra el
PostgreSQL compartido usa el runner de sólo lectura o `pnpm test:live`, sin exportar toda `.env.local`.

Consulta la [auditoría de discovery](../audits/client-portal/TASK-1852_SERVICE_ENABLEMENT_DISCOVERY_2026-09-09.md)
y el registro de implementación de TASK-1852 para resultados y blockers fechados. Los códigos 409 separan `service_enablement_preview_stale`, `service_enablement_blocked`,
`service_enablement_compensation_conflict`, `service_enablement_concurrent_change` e `idempotency_conflict`: nuevo preview, resolver datos, revisar cambios posteriores, retry con la misma clave y corregir el reuse, respectivamente.

Código local no demuestra
deploy, asignación o entrega a un cliente.
