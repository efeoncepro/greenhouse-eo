# TASK-1491 — Globe GitHub Actions Runtime Compatibility Hardening

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-028`
- Status real: `Advertencia no bloqueante verificada; upgrade y guard anti-regresion pendientes`
- Rank: `TBD`
- Domain: `platform|ops`
- Blocked by: `none`
- Branch: `task/TASK-1491-globe-github-actions-runtime-hardening`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Actualizar coordinadamente las actions Google del deploy interno de Efeonce Globe desde `v2` a `v3` y
añadir una verificación automatizada que impida reintroducir majors con runtime Node obsoleto. El cambio debe
preservar exactamente el flujo keyless OIDC → WIF → deployer, Cloud Build, Cloud Run privado y readiness.

## Why This Task Exists

El workflow `../efeonce-globe/.github/workflows/deploy-internal.yml` funciona y su último deploy quedó verde,
pero GitHub fuerza hoy las actions `google-github-actions/auth@v2` y `setup-gcloud@v2`, orientadas a Node 20,
sobre Node 24 y emite advertencias de compatibilidad. Las versiones estables `v3` eliminan esa deuda. Un bump
aislado cerraría el warning actual, pero no evitaría que otro workflow vuelva a incorporar majors obsoletos;
por eso el alcance incluye un gate versionado y ejecutado por el CI canónico.

## Goal

- Migrar juntas las dos actions Google al major compatible vigente sin alterar inputs ni permisos.
- Probar que autenticación keyless, build, deploy privado y readiness continúan funcionando.
- Incorporar un gate repo-wide que falle si los targets Google `@v2` reaparecen en workflows de Globe.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

Revisar y respetar:

- `docs/epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md`
- `docs/tasks/complete/TASK-1464-globe-iac-keyless-platform-foundation.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/architecture/creative-studio/PLATFORM_FOUNDATION_V1.md`
- `docs/operations/creative-studio/EPIC_028_PARALLEL_EXECUTION_PLAN_V1.md`
- `docs/operations/creative-studio/EFEONCE_GLOBE_IAC_RUNBOOK_V1.md`

Reglas obligatorias:

- Conservar `permissions: contents: read` e `id-token: write`; no introducir service-account keys.
- Conservar `GCP_WORKLOAD_IDENTITY_PROVIDER`, la service account deployer y los límites internal-only.
- Verificar releases y notas de migración contra repos oficiales antes del cambio; no copiar tags por memoria.
- El upgrade no autoriza cambios de IAM, Terraform, proyecto, región, servicio o exposición de Cloud Run.
- El ADR/decisión vigente de plataforma e IaC continúa siendo suficiente: esta task mantiene el contrato
  aceptado y no crea una decisión arquitectónica nueva.

## Normative Docs

- `AGENTS.md`
- `docs/tasks/TASK_PROCESS.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `../efeonce-globe/.github/workflows/ci.yml`
- `../efeonce-globe/.github/workflows/deploy-internal.yml`

## Dependencies & Impact

### Depends on

- Foundation WIF/IAM y deploy keyless de `TASK-1464`, ya operativa.
- Releases estables oficiales de `google-github-actions/auth` y `google-github-actions/setup-gcloud`.
- Autorización humana para ejecutar el workflow manual de deploy interno como smoke final.

### Blocks / Impacts

- Reduce el riesgo de que una futura retirada del runtime Node 20 bloquee deploys internos de Globe.
- Impacta sólo tooling CI/CD de `efeoncepro/efeonce-globe`; no cambia capacidades creativas ni clientes.

### Files owned

- `../efeonce-globe/.github/workflows/deploy-internal.yml`
- `../efeonce-globe/.github/workflows/ci.yml`
- `../efeonce-globe/scripts/ci/` para el audit reusable y sus pruebas, si discovery confirma ese home.
- `../efeonce-globe/package.json` sólo para integrar el gate en `pnpm check`.

## Current Repo State

### Already exists

- `actions/checkout@v7`, `actions/setup-node@v7` y `pnpm/action-setup@v6` ya usan runtime moderno.
- El deploy keyless exitoso más reciente prueba que WIF, Cloud Build, Artifact Registry, Cloud Run e IAM están
  operativos con el contrato actual.
- Greenhouse ya declara `google-github-actions/auth@v3` y `setup-gcloud@v3` como baseline del reliability
  control plane.

### Gap

- `deploy-internal.yml` todavía referencia `google-github-actions/auth@v2` y `setup-gcloud@v2`.
- Globe no tiene un check repo-wide que bloquee esos majors obsoletos antes del merge.
- Falta evidencia de un deploy manual completo después del upgrade coordinado.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `../efeonce-globe/.github/workflows/` y tooling CI del repositorio Globe
- Future candidate home: `remain-shared`
- Boundary: `audit de versiones de actions + workflows CI/deploy; no posee IAM, IaC ni runtime de producto`
- Server/browser split: `n/a; configuración y scripts de CI no entran al browser bundle`
- Build impact: `gate local/CI liviano sobre YAML; sin dependencias runtime ni cambio de Docker inputs`
- Extraction blocker: `ninguno; permanece como tooling repo-local mientras Globe tenga un solo control plane CI`

<!-- ZONE 2 — PLAN MODE: completar al tomar la task, no al crearla. -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Upgrade coordinado y revisión del contrato

- Verificar releases estables y breaking changes oficiales de ambas actions Google.
- Cambiar `auth@v2` y `setup-gcloud@v2` a `@v3` en el mismo commit, preservando inputs, permisos y orden.
- Validar sintaxis YAML y confirmar que no quedan targets Google `@v2` en `.github/workflows/`.

### Slice 2 — Gate escalable contra regresiones

- Añadir un audit determinístico que inspeccione todos los workflows y rechace majors explícitamente
  obsoletos, con fixture/test negativo que demuestre que `auth@v2` o `setup-gcloud@v2` fallan.
- Integrar el audit en `pnpm check` o en el gate CI canónico sin duplicar instalaciones ni crear otro workflow
  equivalente.

### Slice 3 — Evidencia runtime y cierre

- Ejecutar checks locales y CI de push/PR.
- Ejecutar un único deploy manual internal-only con los defaults canónicos y verificar build, revisión lista,
  service account esperada, privacidad y tráfico.
- Registrar run URL, SHA, imagen/revisión y resultado sanitizado en la task antes de cerrarla.

## Out of Scope

- Cambiar IAM, WIF provider, service accounts, secretos, Terraform o backend de state.
- Actualizar indiscriminadamente todas las actions o dependencias del monorepo.
- Cambiar scripts de Cloud Build, Dockerfiles, límites de Cloud Run o la estrategia async+poll.
- Habilitar Production, acceso público, clientes externos o despliegue automático.
- Introducir service-account keys, credenciales persistidas o nuevos proveedores cloud.

## Detailed Spec

El audit debe leer los YAML bajo `.github/workflows/` y mantener una allowlist/denylist explícita de targets
load-bearing. Debe fallar con un mensaje que nombre archivo, action encontrada y major requerido; no debe
depender de red para el gate normal. La consulta de releases oficiales ocurre durante discovery/upgrade y su
resultado se fija en código/workflow. El smoke manual prueba el mismo flujo que ya está operativo; no amplía
permisos para hacer pasar el deploy.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (releases + bump coordinado) → Slice 2 (gate anti-regresión) → Slice 3 (CI + deploy interno).
- No ejecutar el deploy manual antes de que el audit y los checks locales estén verdes.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Breaking change entre majors impide autenticar | GitHub Actions/WIF | low | leer release notes, migrar ambas actions juntas, no cambiar inputs | fallo en step `auth` sin credenciales GCP |
| Upgrade altera el entorno de `gcloud` | Cloud Build/Run | low | preservar setup/order y smoke internal-only | submit/describe falla tras auth exitosa |
| Gate se vuelve frágil o bloquea actions válidas | CI | low | parser/audit determinístico + fixtures positivos y negativos | `pnpm check` falla sobre workflow canónico |
| Smoke despliega código no deseado | Cloud Run internal | low | usar SHA revisado y servicio internal-only; verificar imagen/revisión | revisión o imagen no coincide con SHA |

### Feature flags / cutover

Sin flag: cambio de tooling aditivo y reversible. El cutover ocurre al merge del workflow; no cambia flags de
producto ni exposición del servicio.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Upgrade actions | revertir el commit coordinado si el major nuevo falla por una incompatibilidad confirmada | <15 min | sí |
| Gate CI | corregir/revertir sólo el audit conservando el upgrade si produce falso positivo | <15 min | sí |
| Deploy smoke | redirigir tráfico a la revisión interna anterior mediante el runbook | <15 min | sí |

### Production verification sequence

1. Verificar releases oficiales y ausencia de breaking inputs aplicables.
2. Ejecutar audit, tests, `pnpm check` y `pnpm build` localmente.
3. Confirmar CI remoto verde sobre el SHA del cambio.
4. Disparar `Deploy Internal (keyless)` para un servicio interno y Dockerfile canónico.
5. Confirmar Cloud Build `SUCCESS`, revisión `Ready=True`, imagen/SHA esperado, service account correcta,
   `--no-allow-unauthenticated` y tráfico esperado.
6. Stop & escalate ante cualquier ampliación de permisos, exposición o divergencia de imagen.

### Out-of-band coordination required

- Aprobación del operador para el `workflow_dispatch` que realiza el smoke internal-only.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] No existen referencias a `google-github-actions/auth@v2` ni `google-github-actions/setup-gcloud@v2` en los workflows de Globe.
- [ ] `auth@v3` y `setup-gcloud@v3` se actualizan juntas y conservan OIDC/WIF, service account e inputs existentes.
- [ ] Un audit repo-wide corre en el CI canónico y tiene tests positivos y negativos determinísticos.
- [ ] El audit falla señalando archivo/action cuando un fixture reintroduce cualquiera de los targets prohibidos.
- [ ] `pnpm check` y `pnpm build` pasan con el cambio.
- [ ] El CI remoto del SHA de implementación termina verde.
- [ ] Un deploy manual internal-only termina verde y registra run URL, SHA, imagen/revisión y `Ready=True`.
- [ ] La verificación confirma que Cloud Run continúa privado y usa la runtime service account esperada.
- [ ] No cambian IAM, Terraform, secretos, Production ni capacidades de producto.

## Verification

- `cd ../efeonce-globe && pnpm check`
- `cd ../efeonce-globe && pnpm build`
- `cd ../efeonce-globe && rg -n 'google-github-actions/(auth|setup-gcloud)@v2' .github/workflows`
- Comando del audit CI definido durante Slice 2.
- CI remoto del SHA de implementación.
- `Deploy Internal (keyless)` + verificación read-only de Cloud Build y Cloud Run.
- `pnpm task:lint --task TASK-1491`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real.
- [ ] El archivo vive en la carpeta correcta y `docs/tasks/README.md`/registry están sincronizados.
- [ ] La evidencia del run remoto y del deploy sanitizado quedó enlazada en esta task.
- [ ] `Handoff.md` y `changelog.md` se actualizaron sólo si la implementación cambió el contrato operativo.
- [ ] Se ejecutó chequeo de impacto cruzado sobre `TASK-1464` y EPIC-028.
- [ ] `greenhouse-qa-release-auditor` y `greenhouse-documentation-governor` cerraron los gates aplicables.

## Follow-ups

- Ninguno al crear la task. Hallazgos sobre otras actions se registran por separado y no amplían este scope.

## Open Questions

- Ninguna. El deploy smoke requiere aprobación humana en ejecución, no una decisión de diseño pendiente.
