# TASK-1844 — Rollout de autoridad interna multiorganización

Estado final 2026-09-08: **complete; producción verificada para una identidad interna**. El operador autorizó todos los pendientes
(«Avanza con todo lo pendiente»): publicación, promoción, apply, activación controlada, certificación y rollback.
Se mantienen los límites del [plan](../tasks/plans/TASK-1844-plan.md).
[Contrato D8–D11](../architecture/EFEONCE_INTERNAL_NATIVE_AUTHORITY_DECISION_V1.md#d8--actor-y-objetivo-tienen-autoridad-distinta)
· [QA y evidencia productiva](../audits/mcp/TASK-1844_INTERNAL_MULTI_ORG_QA_2026-09-08.md).

PR 230/main `45f6910e3`, orquestador `34281143424` success y manifest released. Flags durables/servidos ON para el perfil exacto; Preview reader OFF. Codex, Claude Code y Claude hospedado/Desktop certificados; fixtures retiradas, familias definitivas conservadas. [Runtime final](../audits/mcp/TASK-1844_FINAL_RUNTIME_2026-09-08.json) · [clientes](../audits/mcp/TASK-1844_FINAL_CLIENTS_2026-09-08.json) · [retiro](../audits/mcp/TASK-1844_FIXTURES_RETIRED_2026-09-08.json). Claude Code requiere login tras rollback OFF; receta abajo. Antes de ampliar la cohorte, medir latencia/error rate del reader. Las secciones de avance siguientes conservan la cronología; no son pendientes actuales.

## Entrada operativa y mantenimiento

Para uso diario, conexión y nuevas organizaciones, seguir el [manual interno](../manual-de-uso/identity/usar-mcp-interno-multiorganizacion.md) y la [documentación funcional](../documentation/identity/acceso-mcp-interno-multiorganizacion.md). Este runbook conserva el orden de rollout y sus pruebas históricas; no se repite por cada organización nueva. Las organizaciones elegibles se descubren de forma dinámica. Otro colaborador o nueva capability requiere permisos/cohorte y su verificación propios.

La [auditoría documental](../audits/mcp/TASK-1844_DOCUMENTATION_SKILLS_CLOSURE_2026-09-08.md) registra contratos, manuales, APIs, runbooks y skills sincronizados después del cierre.

## Avance verificado

- Inicio del cronómetro de release: **2026-09-08T18:44:53Z**.
- Expansión aplicada mediante `pnpm migrate:up`: [`20260908184942851`](../../migrations/20260908184942851_task-1844-internal-context-version-expand.sql). Readback 18:50:19Z: CHECK validado 1/2, ambos índices únicos, trigger habilitado y las seis filas existentes conservadas en v1. Tipos regenerados sin diff.
- Template expand/contract validado con PostgreSQL TEMP después de añadir guards DDL: 1 passed, 0 skipped. Contract `20260908194829159` aplicado tras readback de writers compatibles; índice viejo retirado y siete contextos v1 conservados.
- Cloud Run previo: `auth-server-00043-ndg` y `efeonce-mcp-gateway-00047-8b5`, 100% de tráfico. Gates internos/canary previos ON; multiorganización ausente/OFF. Vercel Production leído por env pull: reader multiorganización ausente/OFF.
- Preflight local inicial **blocked** por configuración del observador local y staging CANCELED; se corrige la configuración y se produce evidencia nueva antes de promoción. No se considera verde.

## Correcciones encontradas durante la publicación

- Gateway PR [6](https://github.com/efeoncepro/efeonce-mcp/pull/6) fusionado (`53a14b7`), CI verde. El deploy `34265724918` creó `00048-ctb` pero dejó el tráfico fijado 100% en `00047-8b5`; Ready del servicio no probaba promoción. PR [7](https://github.com/efeoncepro/efeonce-mcp/pull/7) (`45ade93`) incorpora creación sin tráfico, verificación del SHA/digest de candidata, promoción exacta y readback; 164 pruebas locales passed, CI verde, nuevo deploy `34266442254` en ejecución. Ningún gate v2 activado.
- Greenhouse PR [229](https://github.com/efeoncepro/greenhouse-eo/pull/229), candidato inicial `aafac28a2b`: staging Vercel `dpl_7NNrEK9vZP5xtxe2QoMiVgc5sbpq` READY, smoke general `34265943671` verde. El check Reliability `34266002612` falló porque el registry señalaba `auth-providers.spec.ts`, archivo inexistente. El mapping ahora usa el smoke vigente `login-session.spec.ts`: 2 pruebas Playwright passed contra staging y 15 pruebas de affected-modules passed; se publica el fix antes de promover.
- Readback de cohorte 18:59:47Z: ancla/enrollment/source link vigentes, única capability `growth.seo.observation.read`, discovery local de 14 targets. La certificación cliente sigue pendiente: Codex CLI `0.153.4` / Claude Code `2.1.263` tienen servidor configurado sin sesión; el Mac está bloqueado y se solicitó desbloqueo al operador. Esto no bloquea la publicación compatible con gates OFF.

## Paquete y fronteras

- Greenhouse: checkout compartido `develop`; reader, emisor, consentimiento, writer compatible y dos migraciones aplicadas; no reaplicar.
- Gateway: checkout compartido `../efeonce-mcp`, branch `main`, versión de paquete `1.3.0`; reader v2,
  autorización por objetivo y `efeonce.organizations.list`. Publicación según su workflow y revisión del diff.
- Capability inicial única: `growth.seo.observation.read`; scope único: `efeonce.mcp.read`.
- No se modifican permisos de clientes, Entra, redirects ni grants externos. Excepción precisa aprobada por el operador: sustituir únicamente la conexión hospedada Claude del canary TASK-1832 y revocar su familia; registro/grants/otros clientes/ventana global se conservan. No se usa EO-ORG-0050.
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

Cohorte aprobada y activa: `identity-greenhouse-auth-client-user-user-efeonce-admin-julio-reyes`.
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
Sólo entonces se puede cerrar formalmente TASK-1844; el dossier registra el último estado verificado.


## Ensayo controlado de rollback de flags — plan 2026-09-08

Este ensayo de TASK-1844 revierte sólo los tres gates de autoridad y luego restaura los artefactos del release.
No revierte el release completo ni toca los demás workers. Se ejecuta una vez terminado el orquestador y todos los deploys actuales,
con familia v2 vigente y evidencia A/B/C previa. El ensayo del 2026-09-08 ocurre entre el primer release
y la promoción de PR 230: todos los deploys de develop terminaron y se mantiene la PR sin fusionar durante el ensayo. La autorización «Avanza con todo lo pendiente» cubre este ensayo.
El mecanismo combina configuración durable de los owners de flags y revisiones inmutables compatibles;
no se despacha un deploy individual Greenhouse ni se crea un binario fuera del orquestador.

1. Capturar revisión/digest/cohorte ON del emisor y confirmar que el orquestador terminó. Guardar el plan exacto.
2. Emisor OFF: variable GitHub del emisor `false`; eliminar la variable de cohorte para que el workflow resuelva vacío (GitHub rechaza un valor vacío); tráfico a `auth-server-00045-t6r`.
   Su árbol `0720eb968` es idéntico al main `741e3a045`; writer compatible con contract, gate v2 OFF.
3. Gateway OFF: variable GitHub de environment OFF; tráfico a `efeonce-mcp-gateway-00049-fv7`,
   SHA `45ade9373`, mismo digest compatible, gate v2 OFF. Medir denegación de la conexión v2 vigente.
4. Reader OFF: `vercel env update IDENTITY_INTERNAL_MULTI_ORG_ENABLED production --value false --yes --scope efeonce-7670142f`;
   rollback al deployment compatible `dpl_sZEnysX9o2HPTNR1JAAStchLPa5T` (main `741e3a045`, flag ausente/OFF).
5. Leer tráfico, flags de las revisiones efectivamente servidas, health y contexto PG. No recrear índices ni borrar filas.
6. Restaurar en orden inverso: reader durable ON y `vercel promote dpl_FW2Aepwn7pWxw4AQYCaZC4MTAqpL --scope efeonce-7670142f --yes`;
   gateway durable ON/tráfico `00050-wlk`; emisor durable ON/cohorte exacta y tráfico a la revisión ON
   capturada en el paso 1. Verificar A/B otra vez. Codex conserva su familia; Claude Code puede conservar `needs-auth` después del OFF y necesita `claude mcp login efeonce-internal`, aunque el contexto/familia del servidor siga vigente. En ese caso registrar la nueva familia, retirar sólo la anterior y verificar los payloads reales.
7. Registrar tiempos, estados y límites. Si aparece una revisión ajena o un nuevo release activo, no cambiar tráfico
   hasta reconciliar ownership; nunca asumir que `latestReadyRevisionName` es la revisión servida.

Plan exacto del ensayo 21:01Z: emisor ON `00048-4vq`/SHA `76ed9ca20`, OFF `00045-t6r`; gateway ON `00050-wlk`, OFF `00049-fv7`; reader ON `dpl_FW2Aepwn7pWxw4AQYCaZC4MTAqpL`, OFF `dpl_sZEnysX9o2HPTNR1JAAStchLPa5T`. El segundo release se ejecutará después de restaurar y verificar.


## Resultado del ensayo 21:03–21:12Z

[Readback y eventos](../audits/mcp/TASK-1844_ROLLBACK_RESTORE_2026-09-08.json): OFF emisor → gateway → reader; ambas llamadas Claude rechazadas con JWT aún vigente y Codex detenido en initialize/refresh. Restore reader → gateway → emisor confirmado en tráfico 100%, flags durables y cohorte exacta. Codex renovó con la misma familia y discovery/A/B pasaron. Claude Code retuvo `needs-auth` incluso al reiniciar; el login OAuth estándar reutilizó la sesión corporativa y contexto v2, emitió una nueva familia y A/B pasaron. No se declara recuperación sin reconexión para ese cliente.

PG conservó siete contextos v1 y cinco v2, CHECK 1/2, trigger y único índice versionado; las tres superficies públicas respondieron saludables. La conexión externa TASK-1832 siguió lista y con `no_entitlement` sin gasto. Las fases SQL anteriores documentan el orden ya ejecutado: **no recrear ni reaplicar** las migraciones `20260908184942851` y `20260908194829159`.
