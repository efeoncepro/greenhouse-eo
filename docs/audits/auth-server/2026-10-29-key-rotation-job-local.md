# TASK-1833 — Job aislado de rotación de llaves, corte local 2026-10-29

## Alcance y estado

El operador aceptó implementar localmente un Cloud Run Job dedicado para la
rotación de la llave de firma de Efeonce Auth. Este corte modifica código,
migración, build y documentación en `codex/auth-pr-develop-stack`. No aplicó
ningún recurso cloud, secreto, IAM, flag ni migración productiva. La retención
del release Auth/Rooms sigue vigente.

El Job se define con `AUTH_KEY_MAINTENANCE_ENABLED=false` y
`AUTH_KEY_MAINTENANCE_DRY_RUN=true`. No tiene trigger de push ni dispatch
independiente; el workflow `workflow_call` sólo es elegible dentro del release
aprobado cuando `AUTH_KEY_MAINTENANCE_PROVISIONED=true`. El deploy no ejecuta
el Job. El Scheduler todavía no está creado.

## Garantías ejercitadas localmente

- La intención `creating` se confirma en PostgreSQL antes de llamar a KMS.
  Una respuesta perdida o lease vencida bloquea otro create con
  `create_uncertain`; una recuperación requiere versión exacta y evidencia.
- Claim, lease y fencing impiden que dos ticks avancen la misma operación.
  El registry, ledger y audit de activación comparten una transacción.
- La versión candidata debe firmar y verificar antes de activar. Después,
  `readyz` y JWKS deben publicar los dos kids; un fallo no retira la anterior.
- La revisión del adaptador KMS detectó que el cliente protobuf puede devolver
  `state` como enum numérico. El clasificador ahora acepta los valores numéricos
  oficiales y sus nombres de texto; la prueba focal cubre ENABLED, PENDING,
  DISABLED y estados no elegibles.
- El rol PostgreSQL dedicado carece de acceso a clientes OAuth y refresh
  tokens en el ensayo de permisos. El Job no retira, deshabilita ni destruye
  versiones KMS. El baseline se ancla sólo con llave anterior retirada y
  evidencia de operador.

## Comandos y resultados

| Gate | Resultado |
|---|---|
| `bash scripts/auth-server/key-rotation-postgres-local-smoke.sh` | 4/4 PASS, PostgreSQL 16 desechable por socket privado, TCP OFF |
| Vitest focal de args, registry, command, adaptador KMS y allowlist | 44/44 PASS |
| `pnpm exec tsc --noEmit --pretty false` | PASS |
| ESLint de archivos TS modificados | PASS |
| `pnpm worker:build-contract-gate`, `worker:runtime-deps-gate`, `worker:deploy-path-gate` | PASS |
| `pnpm task:lint --task TASK-1833`, `pnpm ops:lint --changed`, `pnpm skills:mirrors`, `git diff --check` | PASS; ops lint conserva 14 warnings de paridad de epics ajenos |

## Límites y siguiente gate

Scan Codex Security del diff `137c976ec..987044d9d`:
`b7cde4ec-c166-409f-aeaa-c1bfaf9a4a9d`, sellado 2026-10-29 UTC,
22 archivos del inventario más Dockerfile y dos gates de build revisados,
0 hallazgos reportables. Lo hizo el mismo agente, sin revisión externa.
El reporte sellado queda en el estado local de Codex Security bajo ese ID.

No se construyó imagen ni se corrió CI del nuevo HEAD. No se probó un KMS
real, Cloud Run Job, login/SA/secretos productivos, emisión del issuer tras
activar, recuperación de una respuesta KMS incierta en cloud, Scheduler ni
steady de siete días. El scan no sustituye el assurance completo de TASK-1833.
El plan y [runbook](../../operations/runbooks/auth-server-key-rotation.md) describen el
orden de provisión y ensayo. Rooms sigue esperando la UI de Claude Design
para el QA del flujo final.
