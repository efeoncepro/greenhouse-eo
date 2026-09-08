# TASK-1844 — Publicación y certificación de runtime

Estado: **release en ejecución; reader/gateway ON, emisor en despliegue para cohorte exacta**. La autorización del operador
«Avanza con todo lo pendiente» cubre publicación, migraciones, activación controlada, clientes y rollback.
El coordinador es Codex, sin delegación ni cambio de branch en los checkouts compartidos.

## Identidad y evidencia de publicación

| Superficie | Evidencia verificada |
| --- | --- |
| Inicio agente E2E | `2026-09-08T18:44:53Z`; incluye preparación, reparaciones, espera y cierre |
| Greenhouse candidato | `0720eb968b820ad2fc3512678a593ec3e10149f3`, todos los checks de PR verdes |
| Greenhouse producción | [PR 229](https://github.com/efeoncepro/greenhouse-eo/pull/229), squash `741e3a045cc2c98d32d4c75d46b6563c4466cac8`, fusionado `19:30:31Z`; árboles candidato/squash idénticos |
| CI del squash | [34269369796](https://github.com/efeoncepro/greenhouse-eo/actions/runs/34269369796), success |
| Deep del squash | [34269369797](https://github.com/efeoncepro/greenhouse-eo/actions/runs/34269369797), success |
| Smoke del squash | [34269383214](https://github.com/efeoncepro/greenhouse-eo/actions/runs/34269383214), dispatch explícito, success |
| Vercel producción | `dpl_sZEnysX9o2HPTNR1JAAStchLPa5T`, `greenhouse-l4ibrkx6i-efeonce-7670142f.vercel.app`, Ready y alias `greenhouse.efeoncepro.com` verificados |
| Gateway | `45ade9373b58c3a8a3d66912c5db76cbd59c5fc5`, revisión `efeonce-mcp-gateway-00049-fv7`, Ready y tráfico 100%; [deploy 34266442254](https://github.com/efeoncepro/efeonce-mcp/actions/runs/34266442254) success |
| Gateway digest | `sha256:6a85733a6cb7faeca65d8cfbc8ff2199f652f95b47c8e021d0a3bc91380e06c8` |
| Expand SQL | `20260908184942851`, aplicado; CHECK 1/2 validado, dos índices y trigger inmutable; seis filas v1 conservadas |

Preflight local final `19:30:10.794Z`: once checks `ok`; únicamente `release_batch_policy=warning`
por el acoplamiento de auth/deploy y la migración ya aplicada. El CLI salió 0 mediante la excepción
canónica documentada y autorizada (`overrideBatchPolicy` + `bypassWarnings`). El payload conserva
`overallStatus=degraded` y `readyToDeploy=false`; no se presenta como preflight sin excepción.
El cuerpo del squash abre una línea con `[release-coupled: ...]`; el dominio irreversible conserva
la necesidad del motivo auditado en el orquestador. No se omiten CI, smoke, Vercel, PostgreSQL o Sentry.

## Compatibilidad y límites

El [readback de servicios](TASK-1844_COMPATIBLE_RUNTIME_2026-09-08.json) a `19:21:53Z` verificó
gateway `00049-fv7` y auth-server `00045-t6r`, ambos Ready, tráfico 100% y v2 OFF. El auth-server
servía `0720eb968`, cuyo árbol coincide con el squash. Los gates internos previos permanecen ON.

Readback público `19:29:05Z`: Greenhouse `/api/auth/health` 200 y tres providers ready; auth-server
`/readyz` 200, PostgreSQL/KMS/activeKey ok; gateway `/health` 200 y OAuth configurado. Es evidencia
de salud antes de la promoción, no certificación de consentimiento ni de autoridad v2.

El único INSERT productivo de `authorization_contexts` vive en el store interno del auth-server,
compuesto por `createInternalAuthRuntime`. Usa `ON CONFLICT DO NOTHING` y recuperación por clave
exacta con versión. El consumer Greenhouse de binding empaqueta el runtime pero sólo resuelve.
El gateway no escribe PostgreSQL. Tras el readback de writers servidos compatibles se aplicó contract;
la revisión auth-server `00045-t6r` permanece como rollback compatible OFF.

## Clientes y activación

La cohorte exacta se revalidó por enrollment/ancla/usuario; la cuenta Microsoft corresponde al
perfil interno autorizado. La GUI del Mac estuvo bloqueada al inicio y volvió a estar disponible.
El operador completó el inicio de sesión corporativo y la UI confirmó la sesión de Efeonce ID activa.
No se solicitaron ni guardaron contraseñas en la conversación.

Codex CLI `0.153.4` completó login real base-only con CIMD `https://chatgpt.com/oauth/codex/client.json`
a `19:43Z`; el consentimiento previo al flip siguió siendo v1/uniorganización. Se conserva esa familia
como control para verificar que v2 no la eleva. Claude Code `2.1.263` tiene una configuración nueva
`efeonce-internal`, scope base y callback 18444, sin reutilizar el DCR del canary.

Claude no admite dos conectores al mismo endpoint. El operador autorizó reemplazar **sólo** su conexión
hospedada: se retiró el conector canary y se revocó su consentimiento/familia con readback cero;
el registro canary y los otros clientes permanecen activos. `Efeonce MCP` quedó creado con OAuth
obligatorio/CIMD, desconectado y pendiente de consentimiento interno v2.
[Evidencia del reemplazo](TASK-1844_CLAUDE_HOSTED_REPLACEMENT_2026-09-08.json).

Las fixtures A/B/C dedicadas ya están creadas, verificadas y con retiro propio; ver bloque de activación.
`EO-ORG-0050` y los grants del canary permanecen fuera de esta certificación interna. La llamada
externa de ChatGPT pasó después del despliegue compatible: gateway ready y SEO `no_entitlement`,
sin módulo ni gasto. [Regresión externa](TASK-1844_EXTERNAL_REGRESSION_2026-09-08.json).

Reader y gateway ya están ON; el orquestador aplica el emisor con cohorte exacta. Revocación selectiva/global, refresh tras TTL,
concurrencia, p95/error rate y rollback servido están **sin medir**, no aprobados ni contados como cero.
El cierre de la task depende de esa matriz del [runbook](../../operations/TASK-1844_INTERNAL_MULTI_ORG_ROLLOUT.md).


## Activación controlada en curso — 19:58Z

- Todos los checks CI, Deep y Playwright del main `741e3a045cc2c98d32d4c75d46b6563c4466cac8` terminaron SUCCESS.
- Contract `20260908194829159` aplicado a la instancia compartida tras verificar los writers compatibles. Readback: sólo índice único versionado, CHECK 1/2 validado, trigger activo, siete contextos v1 conservados. Archivo fresco pendiente de commit; template contract ya publicado.
- Fixtures propias `task-1844-runtime-20260908-a`: A/B resolved, C denied por el reader canónico de PG. Esto todavía no acredita dispatch servido. Operador reproducible: `scripts/identity/task-1844-runtime-fixtures.ts`; manifiesto privado en `.auth/task1844-runtime-fixtures.json`. Retiro obligatorio al terminar.
- Vercel Production reader ON: `dpl_FW2Aepwn7pWxw4AQYCaZC4MTAqpL`, READY y alias productivo; valor `IDENTITY_INTERNAL_MULTI_ORG_ENABLED=true` confirmado por env pull.
- Gateway: variable durable de environment Production activada; deploy `34271986264` SUCCESS, revisión `00050-wlk` Ready/100%/ON verificada a 19:59:15Z. Emisor en orquestador.
- Preflight local 19:58:09Z: once checks OK, únicamente batch `requires_break_glass` con override documentado. CLI exit 0 con autorización; payload `degraded`, `readyToDeploy=false` conservados honestamente.

- Orquestador único [34272151054](https://github.com/efeoncepro/greenhouse-eo/actions/runs/34272151054), dispatch 19:59:26Z, preflight SUCCESS, ambos gates Production aprobados a 20:02:28Z y 20:02:51Z. Workers en curso.
- Compatibilidad Entra: initialize/tools-list/status PASS, catálogo v2 ausente. El cliente legacy devuelve sus scopes AllPrincipals existentes aunque se pidió sólo base; el primer harness falló al asumir lo contrario. Se preservan fallo y readback de grants; no se modificó Entra. [Evidencia](TASK-1844_ENTRA_LEGACY_REGRESSION_2026-09-08.json).

## Estado confirmado 20:25Z y reparación de interoperabilidad

El orquestador `34272151054` terminó success. Manifest
`741e3a045cc2-1898ddd1-8bb1-42dc-b308-321c0dca743a`: `released`,
20:02:16.001Z → 20:12:00.831Z. El reader de manifest no hidrata URL/revisions/health
(campos vacíos); se conserva la evidencia independiente servida. Watchdog 20:24:09Z:
5/5, `drift_count=0`, `data_missing_count=0`, las tres señales `ok`, sin mensajes Teams.

Codex y Claude Code completaron consentimiento v2 con scope base, paginación, A/B concurrentes
y C/invalid deny; Codex también ejecutó `{}` y recibió `authorization_denied`. Se conservan
los eventos reales en los JSON por cliente. La primera instrucción mínima de revocación de Codex
no invocó tools; no cuenta como prueba. El cursor B revocado denegó y A pasó en ambos; una nueva
llamada directa Codex a B también denegó. La retirada B se restauró y se verifica sin reconectar.

Claude hospedado envía el CIMD incluso al elegir registro automático. El documento público
anuncia un tercer grant JWT bearer; el validador previo rechaza el documento entero. El fix
intersecta los dos grants soportados y conserva el rechazo de cualquier intercambio JWT bearer.
[Documento y regresión](TASK-1844_CLAUDE_CIMD_COMPATIBILITY_2026-09-08.json).
Pruebas OAuth: 147 passed/0 skipped; suite auth/internal: 498 passed/25 skipped
(live excluidos, no se cuentan como passed). Publicación adicional y hosted pendientes.
