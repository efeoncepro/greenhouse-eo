# CLI HTTP de Marketing Studio en Greenhouse — verificación 2026-10-04

## Alcance autorizado y decisión

Solicitud del operador: crear aquí una CLI para operar Marketing Studio por API (piezas, copys, canales y
capacidades disponibles). Implementación local en `scripts/marketing-studio/`, comandos `pnpm studio` y
`pnpm studio:test`. ADR dueño: [API-first](../../architecture/EFEONCE_STUDIO_API_FIRST_DECISION_V1.md#delta-2026-10-04--cliente-cli-http-en-greenhouse).
No se abre otra task ni se cambia el cierre de TASK-1905/TASK-1899. No se modificó el runtime de Studio,
identidad, permisos, base de datos ni gateway para construir este cliente.

## Resultado

**PASS focal del cliente local.** 18 tests y ESLint pasan. Descubrimiento vivo, lectura autenticada y dryRun
real de carga pasan. Las escrituras aplicadas y la transferencia GCS se probaron con un servidor HTTP local
y fetch de almacenamiento controlado; no se hizo una carga/escritura aplicada en producción en esta entrega.
En el cierre inicial quedaron excesos de contexto, registrados abajo como historia. La consolidación
posterior de esta misma sesión los resolvió: [cierre documental](2026-10-04-session-documentation-closure.md).

- Descubrimiento dinámico OpenAPI + manifiesto: 59 tools de negocio, 64 operaciones HTTP, API 1.6.0,
  manifestHash `2302c683cd1eee0d96d89f85b72ded73a50ff30152c8f0f34fa9279b739390e6`.
- CLI genérica por operationId/nombre `studio.*`; cuerpos JSON en archivo/stdin; params path/query; lectura
  de revisiones y cursor manual; errores seguros, credenciales fuera de argv, sin redirecciones con bearer.
- Escritura dryRun por defecto, `--apply`, idempotencia y If-Match; T2 también exige `--confirm`. No hay
  reintento de mutaciones con nueva llave o revisión; la autoridad y validación semántica quedan en Studio.
- Carga: SHA-256 streaming, derechos, nueva pieza o pieza existente/inferencia, ticket, PUT/POST reanudable,
  confirmación 202→201 con llave estable, duplicate, resume de confirmación y salida 2 para pending.
- Descarga: URL obtenida por API, GCS sin bearer, integridad tamaño/SHA-256, limpieza de original incompleto,
  sin sobreescribir; preview binario mediante call. Recibos privados y redactados.

## Evidencia ejecutada

| Verificación | Resultado |
| --- | --- |
| `pnpm studio:test` | 18/18 PASS: ejecutable con HTTP local, stdin Unicode, dryRun/apply, idempotencia, T2/revisión/412, 401/403, contratos inconsistentes, rutas/argumentos, permisos de token, salidas binarias/redacción/no sobrescritura, cargas PUT/POST/poll/duplicate y descarga/hash |
| `pnpm exec eslint scripts/marketing-studio/*.mjs` | PASS |
| `pnpm studio doctor` / entrada Node equivalente | HTTP real: `status=ok`, `database=reachable`, `accessMode=open`, versión 1.6.0, 59 tools/64 operaciones |
| `call studio.channels.list` | HTTP 200, catálogo publicado versión 1, 52 canales |
| `call studio.campaign.assets.list --param campaignId=CMP-004 --param limit=1` con `--token-secret marketing-studio-upload-cli-token --project efeonce-group` | HTTP 200; lectura autenticada, primer asset `CMP004-BF1-imagen-191x100`; no token en salida |
| `upload <fixture.png> --campaign CMP-004 --asset CMP004-BF1-imagen-191x100 --license owned` con el mismo cliente, **sin `--apply`** | HTTP 200, `status=dry_run`, inferencia `matched`, revisión 3, `uploadId=null`, sin ticket/bytes transferidos |
| `pnpm skills:mirrors` | PASS tras enlazar el manual desde referencias operativas Codex/Claude |
| `pnpm qa:gates --changed --agent codex` | Ejecución correcta; advisory incluyó WIP ajeno (987 archivos), por eso QA focal por paths propios |

La verificación no depende de credenciales guardadas en el repo, una copia estática del contrato ni el
checkout hermano. Los tests usan credenciales sintéticas. No se modificaron secrets ni scopes. La prueba
real de carga sólo validó metadata: no dejó una pieza, versión o upload nuevo.

## Documentación y pendientes — corte inicial de la CLI

[Manual](../../manual-de-uso/marketing-studio/operar-por-cli-api.md), delta técnico en ADR, delta funcional y
punteros en manual general, Handoff/changelog y skills espejo. `project_context.md` revisado: su router
existente de Marketing Studio sigue vigente; no se altera la distribución de autoridad.

`docs:context-check:strict` global: 0 errores estructurales, 3 warnings por tamaño: project_context ~12.081
(12.000), Handoff ~12.196 (12.000), changelog 61 entradas (60). El worktree ya excedía budgets antes de este
cliente; contiene documentación en curso de otras tareas. El dry-run de `docs:context-rotate` propone
archivar una entrada de changelog, pero no resuelve los tokens de Handoff/project_context. No se ejecutó
una rotación global ni se reescribió contenido ajeno para presentar este gate como verde. Pendiente del
mantenedor de contexto: consolidar/rotar con preservación de historia y repetir strict. No bloquea la CLI local.

El closure-check focal terminó con dos avisos heurísticos (`missing_project_context_check` y
`skill_registration_check`): el router de `project_context.md` fue revisado sin editarlo; las referencias de
la skill ya registrada sí se actualizaron en ambos espejos. `git diff --check` focal y la ayuda del
comando pnpm también pasan.

Límites runtime que permanecen:

- El cliente de cargas existente no otorga `studio:write`. Las operaciones generales requieren su scope.
- Gestión global del catálogo: autoridad API delegada aún pendiente; mostrar la operación no concede permiso.
- Aprobaciones T2 requieren persona; `--confirm` no suplanta identidad.
- Campañas con fuente OneDrive mantienen sus restricciones; ICP conserva dependencias/flag del servidor.
- No hay nueva publicación/deploy ni habilitación MCP por entregar la CLI. El programa puede operarse
  localmente con las credenciales autorizadas existentes y capacidades que permita el servidor.

## Cierre documental posterior de la sesión

Se consolidaron los routers, manuales, arquitectura, tasks y skills con tres subagentes. El contexto previo
quedó preservado byte-for-byte con hashes; Handoff/project_context se compactaron y changelog se rotó.
Los avisos de contexto y registro descritos arriba corresponden al corte inicial; consultar el [cierre
y gates finales](2026-10-04-session-documentation-closure.md) para el resultado consolidado. La cobertura
runtime y los límites de permisos de esta CLI no se amplían por actualizar documentación.
