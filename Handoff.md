# Handoff activo

## 2026-07-29 — PR #164: release hardening y promoción pendiente

`develop` está en `9a39d27c2c4e13dfecdcc646cdf326624e1fb5de` con el fix de autenticación privada AXIS. Los
workflows de GitHub usan `GITHUB_TOKEN` + `packages: read` y un `.npmrc` efímero en `$RUNNER_TEMP`; Vercel usa el
proyecto `efeonce-7670142f/greenhouse-eo` y `NPM_RC` cifrado en `staging`, Preview de `develop` y Production.

Validación local: instalación privada, lint, typecheck, build, route-reachability (225/225), CLAUDE budget/audit,
task tests, `ops:lint --changed`, `qa:gates --changed` y `git diff --check`. El PR debe volver a verificar CI,
context-governance, task-contract, Playwright y Vercel antes del release. La rotación documental preservó el handoff
anterior en [`2026-07-pre-release.md`](docs/operations/agent-context-history/handoff/2026-07-pre-release.md).

Los cambios locales ajenos siguen fuera del commit: `.vercel/project.json` y los dos artefactos SKY Blog. No se han
implementado trabajos nuevos de AXIS/Globe; el release debe promover todo `develop` como unidad.

## AXIS/Globe — continuidad sin implementación

Globe sigue siendo producto comercial Efeonce; su estadio técnico permanece `internal-only`/`internal_smoke`.
Revisar TASK-1480, TASK-1485, TASK-1552, TASK-1591, ADR-010, ADR-016, la arquitectura Creative Studio, el runtime
handoff, el runbook de paquetes privados y el estado de la flota de modelos. El siguiente task recomendado se
define sólo después del cierre de este release y debe separar lo ya incluido de lo pendiente para Globe/AXIS.

La historia anterior y los índices archivados viven en [Handoff.archive.md](Handoff.archive.md) y
`docs/operations/agent-context-history/`; no cargar esos shards completos al inicio.
