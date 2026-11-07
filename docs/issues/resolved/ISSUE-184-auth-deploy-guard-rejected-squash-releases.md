# ISSUE-184 — El guard de deploy de Auth rechazaba los releases por squash

## Ambiente

production — Cloud Run `auth-server` (`auth.efeonce.org`, `us-east4`), desplegado por
`.github/workflows/auth-server-deploy.yml` dentro del orquestador `production-release.yml`.

## Detectado

2026-11-01, durante el release `develop`→`main` (PR #262, commit squash `5f2e69806`): el orquestador run `41274930062`
(manifest `5f2e69806eee…`) terminó `aborted` en el job de despliegue de Auth.

## Síntoma

El paso de guard del workflow de Auth se negó a desplegar y abortó todo el release, aunque el objetivo era un commit
legítimo de `main` que contenía exactamente el código que ya servía Auth y más.

## Causa raíz

El guard exigía que el commit servido por la revisión activa (`GIT_SHA`) fuera **ancestro** del SHA objetivo
(`git merge-base --is-ancestor`). La revisión activa venía de `develop`, y la promoción `develop`→`main` es por
**squash**: el commit de `main` tiene el mismo árbol que un commit de `develop`, pero ninguna relación de ancestría con
él. Con squash, la condición nunca se cumple. El diseño del guard (preparado en PR #263/#264) asumía merge con historia.

## Impacto

- Primer intento del release del 2026-11-01 abortado; nada llegó a producción en ese intento.
- Auth siguió sirviendo `auth-server-00169-4pq` sin cambios: sin caída ni pérdida de login para MCP ni Rooms.
- Costo: un intento del orquestador y el tiempo del fix.

## Solución

PR #265 (commits `9c5fe96a1` y `a05f4025d`); con el fix, el guard pasó en los intentos siguientes:

- Si el commit servido no es ancestro del objetivo, el guard busca en `origin/develop` el commit **más antiguo** cuyo
  árbol es idéntico al del objetivo. Usa `git log --format='%H %T' origin/develop | awk …`, que lee toda la salida sin
  cortar el pipe (sin SIGPIPE).
- Exige que el commit servido sea ancestro de ese commit.
- Sigue rechazando un runtime servido **más nuevo** que el objetivo.
- Rechaza el caso **revert** A→B→R, donde el árbol del objetivo se repite más tarde: por eso usa la coincidencia más
  antigua.
- La revisión de Copilot levantó el caso revert y el riesgo de SIGPIPE; ambos quedaron atendidos.

## Verificación

- `scripts/auth-server/test_deploy_contract.py`: 3 tests nuevos (squash aceptado, servido más nuevo rechazado,
  revert rechazado); 12 OK.
- Release `935583f88db0-544b3943-a041-4fe6-9e62-03aca45c6c8f`: el guard pasó (ya en el intento run `41282851247`) y
  el release cerró `released` en el run `41284120477`.

## Estado

resolved (2026-11-01).

Riesgo residual: el guard depende de que `origin/develop` contenga el commit de origen del squash. Si alguna vez se
promueve a `main` algo que no salió de `develop`, el guard lo rechazará. Ese rechazo es el comportamiento deseado y se
diagnostica comparando el `GIT_SHA` servido con el objetivo.

## Relacionado

- PR #262 (release), PR #265 (fix), PR #263/#264 (guard original, cerradas el 2026-11-01 como superadas).
- Runs `41274930062` (abortado), `41282851247` (abortado por [ISSUE-185](ISSUE-185-auth-governed-deploy-revision-without-traffic.md)),
  `41284120477` (`released`).
- `.github/workflows/auth-server-deploy.yml`; [ADR nativo §Control de despliegue vigente](../../architecture/EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md);
  [runbook de release §2.3 gotcha 10](../../operations/runbooks/production-release.md).
