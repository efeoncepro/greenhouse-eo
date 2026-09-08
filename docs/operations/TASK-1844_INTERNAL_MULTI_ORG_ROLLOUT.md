# TASK-1844 — Rollout de autoridad interna multiorganización

Estado 2026-09-08: **code complete, rollout en ejecución**. El operador autorizó todos los pendientes
(«Avanza con todo lo pendiente»): publicación, promoción, apply, activación controlada, certificación y rollback.
Se mantienen los límites del [plan](../tasks/plans/TASK-1844-plan.md).
[Contrato D8–D11](../architecture/EFEONCE_INTERNAL_NATIVE_AUTHORITY_DECISION_V1.md#d8--actor-y-objetivo-tienen-autoridad-distinta)
· [QA y evidencia local](../audits/mcp/TASK-1844_INTERNAL_MULTI_ORG_QA_2026-09-08.md).

## Avance verificado

- Inicio del cronómetro de release: **2026-09-08T18:44:53Z**.
- Expansión aplicada mediante `pnpm migrate:up`: [`20260908184942851`](../../migrations/20260908184942851_task-1844-internal-context-version-expand.sql). Readback 18:50:19Z: CHECK validado 1/2, ambos índices únicos, trigger habilitado y las seis filas existentes conservadas en v1. Tipos regenerados sin diff.
- Template expand/contract validado con PostgreSQL TEMP después de añadir guards DDL: 1 passed, 0 skipped. Contract aún pendiente de todos los writers servidos compatibles.
- Cloud Run previo: `auth-server-00043-ndg` y `efeonce-mcp-gateway-00047-8b5`, 100% de tráfico. Gates internos/canary previos ON; multiorganización ausente/OFF. Vercel Production leído por env pull: reader multiorganización ausente/OFF.
- Preflight local inicial **blocked** por configuración del observador local y staging CANCELED; se corrige la configuración y se produce evidencia nueva antes de promoción. No se considera verde.

## Correcciones encontradas durante la publicación

- Gateway PR [6](https://github.com/efeoncepro/efeonce-mcp/pull/6) fusionado (`53a14b7`), CI verde. El deploy `34265724918` creó `00048-ctb` pero dejó el tráfico fijado 100% en `00047-8b5`; Ready del servicio no probaba promoción. PR [7](https://github.com/efeoncepro/efeonce-mcp/pull/7) (`45ade93`) incorpora creación sin tráfico, verificación del SHA/digest de candidata, promoción exacta y readback; 164 pruebas locales passed, CI verde, nuevo deploy `34266442254` en ejecución. Ningún gate v2 activado.
- Greenhouse PR [229](https://github.com/efeoncepro/greenhouse-eo/pull/229), candidato inicial `aafac28a2b`: staging Vercel `dpl_7NNrEK9vZP5xtxe2QoMiVgc5sbpq` READY, smoke general `34265943671` verde. El check Reliability `34266002612` falló porque el registry señalaba `auth-providers.spec.ts`, archivo inexistente. El mapping ahora usa el smoke vigente `login-session.spec.ts`: 2 pruebas Playwright passed contra staging y 15 pruebas de affected-modules passed; se publica el fix antes de promover.
- Readback de cohorte 18:59:47Z: ancla/enrollment/source link vigentes, única capability `growth.seo.observation.read`, discovery local de 14 targets. La certificación cliente sigue pendiente: Codex CLI `0.153.4` / Claude Code `2.1.263` tienen servidor configurado sin sesión; el Mac está bloqueado y se solicitó desbloqueo al operador. Esto no bloquea la publicación compatible con gates OFF.

## Paquete y fronteras

- Greenhouse: checkout compartido `develop`; reader, emisor, consentimiento, writer compatible y dos SQL pendientes.
- Gateway: checkout compartido `../efeonce-mcp`, branch `main`, versión de paquete `1.3.0`; reader v2,
  autorización por objetivo y `efeonce.organizations.list`. Publicación según su workflow y revisión del diff.
- Capability inicial única: `growth.seo.observation.read`; scope único: `efeonce.mcp.read`.
- No se modifican permisos de clientes, Entra, redirects, grants externos ni el canary TASK-1832/EO-ORG-0050.
- No se crean tokens, contextos ni consentimientos v2 por migración. El consentimiento nuevo es por cliente.
- Los cambios ajenos de EPIC-045 en el checkout Greenhouse pertenecen a su owner; no se reescriben.

## Configuración deseada y orden

| Variable | Dueño/configuración durable | Primer despliegue | Activación controlada |
| --- | --- | --- | --- |
| `AUTH_SERVER_INTERNAL_MULTI_ORG_ENABLED` | Variables de repositorio GitHub consumidas por `auth-server-deploy.yml`; Cloud Run compartido | `false` | `true`, último gate |
| `AUTH_SERVER_INTERNAL_MULTI_ORG_PROFILE_IDS` | Mismo repositorio; CSV de IDs exactos, sin wildcard | vacío | cohorte verificada y registrada antes del flip |
| `IDENTITY_INTERNAL_MULTI_ORG_ENABLED` | Vercel, environments de cada reader | `false` | `true`, primer gate |
| `MCP_NATIVE_INTERNAL_MULTI_ORG_ENABLED` | Environment GitHub del gateway; Cloud Run | `false` | `true`, segundo gate |

El emisor también consulta autoridad al consentir/emitir/refrescar: usa su gate y cohorte. El reader usa
su gate independiente. Los gates internos previos siguen siendo obligatorios. No copiar variables de staging
sobre el auth-server compartido. `deploy.sh` transporta CSV mediante delimitador `::`; el change-gate compara
SHA, gates previos, nuevo gate y cohorte, incluso cuando sólo cambia configuración. El test
`src/lib/auth-server/internal/deploy-config.test.ts` ejecuta el shell real del workflow con un CLI simulado.

Antes de cada promoción, releer [playbook](PRODUCTION_RELEASE_INCIDENT_PLAYBOOK_V1.md),
[runbook](runbooks/production-release.md), [control plane](../architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md),
[ledger de flags](FEATURE_FLAG_STATE_LEDGER.md) y [timings](PRODUCTION_RELEASE_TIMING_LEDGER.md).
Greenhouse se promueve por el orquestador canónico. Este documento no autoriza dispatch de workers aislados.
Resolver los SHAs exactos y revisiones compatibles del release aprobado; un nombre de branch no es evidencia servida.

Cohorte propuesta para el primer flip: `identity-greenhouse-auth-client-user-user-efeonce-admin-julio-reyes`.
Read-only 2026-09-08: usuario interno activo y un único perfil en contextos no revocados; el reader local
resolvió 14 targets. La asociación canónica usa la cuenta histórica `jreyes@efeoncepro.com`, no la dirección
operativa de Gcloud. Revalidar enrollment/ancla/fechas por ID antes de activar; esta lectura no concede permisos.

## Fase 1 — Expansión y servicios compatibles, gates OFF

1. Revisar diff/commits y release preflight; registrar aprobación del paquete. Refrescar schema/flags/revisiones
   reales. La captura previa de Cloud Run es `auth-server-00043-ndg` / `efeonce-mcp-00047-8b5`; no reutilizarla
   como lectura del día del apply. La instancia PG es compartida por entornos.
2. Reactivar sólo [expand.sql.pending](../tasks/pending-migrations/TASK-1844-internal-context-version-expand.sql.pending)
   mediante `pnpm migrate:create` con timestamp fresco y el tooling de
   [base de datos](../architecture/GREENHOUSE_DATABASE_TOOLING_V1.md). Revisar el SQL generado antes del migrador.
   CHECK admite 1/2, índice versionado aditivo y trigger de inmutabilidad; se conserva el índice previo.
3. Aplicar expansión, registrar migration ID y releer CHECK, ambos índices, trigger y conteos por versión.
   No ejecutar todavía el SQL contract ni migraciones pendientes de otras tasks.
4. Publicar Greenhouse/auth-server compatibles con gates OFF y gateway `1.3.0` OFF. Verificar cada revision,
   digest/SHA y tráfico servido, además de configuración durable y efectiva. Repetir lectura v1 y negativas
   v2; conservar las certificaciones externas existentes y realizar smoke proporcional sin ampliar el canary.
5. Registrar el inventario de todos los writers servidos de `authorization_contexts`: auth-server y consumers
   Greenhouse que lo empaquetan. El writer compatible usa `ON CONFLICT DO NOTHING` y recuperación por clave
   exacta incluyendo versión. No avanzar mientras alguna revisión con tráfico dependa del índice antiguo.

## Fase 2 — Contracción de unicidad y cohorte

1. Confirmar el readback anterior y fijar una revisión de rollback que ya tenga writer compatible.
2. Reactivar sólo [contract.sql.pending](../tasks/pending-migrations/TASK-1844-internal-context-version-contract.sql.pending)
   con timestamp fresco. Aplicar y releer ausencia del índice no versionado, presencia del versionado,
   CHECK/trigger y conservación de filas. No borrar historia ni consentimientos.
3. Registrar la cohorte exacta y comprobar enrollment, perfil/usuario/member activos, ancla vigente y autoridad
   por target usando readers canónicos. Una coincidencia de email sirve para buscar, nunca para autorizar.
   Si falta enrollment o fixture de certificación, mantener gates OFF; no inventar un profile ID ni conceder
   permisos de negocio para hacer pasar el smoke.
4. Para la matriz A/B/C y revocación, inventariar recursos de prueba propios de TASK-1844: IDs, owner,
   vencimiento, estado anterior, mutaciones precisas y cleanup. Usar datos sintéticos dedicados con capacidad
   de lectura sin gasto. No usar clientes como testers ni reutilizar el fixture TASK-1832. Las fixtures TEMP
   de las pruebas locales no existen en el runtime OAuth y no sustituyen este manifiesto.
5. Activar reader → gateway → issuer/cohorte; verificar las tres configuraciones servidas. Completar
   consentimiento fresco v2 desde la sesión corporativa de cada cliente. Nunca promover una familia v1.

## Certificación de runtime y clientes

| Caso | Evidencia requerida |
| --- | --- |
| Codex, Claude Code y Claude hospedado | Fecha/versión del cliente, consentimiento v2, `tools/list`, discovery y dispatch con familia propia; sin tokens en evidencias |
| Mismo token A/B/C | A y B permitidas; C, target ausente e IDs inválidos denegados antes del provider; A vuelve a funcionar después del deny |
| Paginación | IDs/nombres/capabilities autorizados; sin total global ni cursor de candidato oculto; cursor revocado deniega |
| Revocación selectiva | Commit de retiro B, request nuevo denegado ≤60 s; A sigue permitida, sin reconectar |
| Revocación global/familia | Requests nuevos A/B denegados con JWT aún vigente; reader comprueba ledger/contexto actuales |
| Concurrencia | A/B en paralelo no mezclan argumentos, resultados ni contexto; provider recibe el target autorizado |
| Refresh | Después del TTL del access token, misma versión/contexto/clase y familia; ninguna elevación v1→v2 |
| Timeout/gates | Reader caído/DTO inválido/gate OFF deniegan sin fallback ni caché positiva |
| Rollback/restore | Secuencia OFF/restore con token vigente y readback de revisión, SHA, tráfico, flags y PG |

Medir `internal_target_denied`, `internal_reader_unavailable` e `internal_context_version_drift` sin PII.
`internal_revoked_still_dispatching` requiere observar llamadas al provider durante la certificación;
su estado actual es **no medido**, no cero. Una resolución de snapshot ya autorizada antes de un commit de
revocación no promete cancelación retroactiva. El snapshot tiene 4 s de presupuesto y el gateway 5 s por
defecto; medir p95/error rate en runtime antes de ampliar la cohorte.

## Rollback y cierre

Apagar issuer/emisión-refresh → gateway/consumo → reader. Releer que un token v2 vigente deniega. Conservar
schema, contextos y auditoría. Tras contract, **no volver al binario anterior al writer compatible** ni recrear
el índice antiguo: dos contextos v1/v2 pueden compartir la clave anterior. El down contractual rechaza esa
operación deliberadamente. Restore: reader → gateway → issuer; sólo restaurar la cohorte acordada.

Revocar familias y retirar fixtures run-owned mediante sus commands y manifiesto, con readback. Registrar
SHAs/revisiones, resultados cliente, latencia de revocación, rollback real y estado final de flags. Actualizar
TASK-1831/1836, TASK-1844, EPIC-044 y timings sin reinterpretar la certificación histórica de TASK-1813.
Sólo entonces se puede cerrar formalmente TASK-1844; hoy esos pasos siguen pendientes.
