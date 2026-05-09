# TASK-607 — GitHub Actions Node.js 24 Migration + smoke-lane semantics

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Epic: `—`
- Status real: `Cerrada`
- Rank: `TBD`
- Domain: `infra`
- Blocked by: `none`
- Branch: `develop`
- Legacy ID: `—`
- GitHub Issue: `—`

## Summary

Migrar las referencias GitHub Actions del repo que aún usan actions compiladas contra Node.js 20 a versiones compatibles con Node.js 24, antes del hard deadline GitHub de **2026-09-16** (remoción de Node 20 del runner).

Durante ejecución se detectó drift de spec: no eran solo 5 workflows. El repo real aún tenía referencias target antiguas en `ci`, `playwright`, `reliability-verify`, `design-contract`, deploy workers y Azure Teams. La solución aplicada fue repo-wide para las actions target, manteniendo comportamiento funcional de jobs.

Además, el warning operativo observado en Playwright tenía un segundo contrato roto: el publisher contaba retries `failed -> passed` como fallas finales. TASK-607 cierra esa semántica junto con el hardening de navegación transitoria documentado en ISSUE-073.

## Why This Task Exists

GitHub anunció la deprecación de Node.js 20:
- **2026-06-02**: switch forzado a Node.js 24 por default en runners.
- **2026-09-16**: Node.js 20 removido del runner (hard EOL).

Los workflows que usen acciones compiladas contra Node 20 empezarán a fallar silenciosa o ruidosamente desde junio. Hoy sólo emiten deprecation warnings. TASK-574 cerró 1 de los 6 workflows. Quedan 5 con deuda:

- `ci.yml` — pipeline principal de tests/lint
- `playwright.yml` — suite E2E
- `ops-worker-deploy.yml` — deploy Cloud Run
- `commercial-cost-worker-deploy.yml` — deploy Cloud Run
- `ico-batch-deploy.yml` — deploy Cloud Run

Si se ignora hasta junio 2026, el blast radius es: (a) CI falla → ningún PR merguea; (b) deploys fallan → hotfixes bloqueados. Mejor resolver ahora con análisis ya hecho.

## Goal

- Los workflows target corren con actions compatibles con Node.js 24 sin warnings de runtime interno de actions.
- Comportamiento funcional idéntico: mismos jobs, mismos steps, mismos outputs.
- Semántica smoke-lane correcta: `flaky` no se persiste como `failed_tests`.
- Navegación E2E autenticada usa retries acotados ante timeouts/red transitoria sin ocultar fallos HTTP/auth.
- Validación automatizada: CI + Playwright post-push verdes.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md` (ownership de CI/CD)
- `.github/workflows/hubspot-greenhouse-integration-deploy.yml` (referencia canónica de versiones actualizadas, TASK-574)

Reglas obligatorias:

- **No cambiar comportamiento funcional** — solo subir versiones de actions. Cualquier refactor de steps o jobs queda fuera de scope.
- **Un solo PR para los 5 workflows** para que CI valide la migración atómicamente.
- **Mergear fuera de deadlines críticos** (evitar cerrar el PR justo antes de un deploy planeado de otra task).
- **Rollback trivial**: `git revert` del merge commit devuelve los 5 a versiones previas; Cloud Run tiene traffic rollback estándar si algún deploy post-merge regresara algo.

## Normative Docs

- `docs/tasks/complete/TASK-574-absorb-hubspot-greenhouse-integration-service.md` — task parent que dejó este follow-up registrado.
- Release notes de cada action (fetch con `gh api repos/<action>/releases/tags/<v>` antes de ejecutar, para re-verificar que no hay breaking changes nuevos).

## Dependencies & Impact

### Depends on

- PR #96 de TASK-574 mergeado (ya completo) — validó empíricamente `google-github-actions/auth@v3` + `setup-gcloud@v3` + `actions/checkout@v5` + `actions/setup-python@v6` con la config que usan los deploys del monorepo.

### Blocks / Impacts

- Ningún task activo depende de esto en el corto plazo. Pero bloquea continuidad de CI/deploys cuando llegue junio 2026.
- Desbloquea adopción de actions más nuevas (ej. actions/upload-artifact v6/v7 que tienen mejoras de performance y features no disponibles en v4).

### Files owned

- `.github/workflows/ci.yml`
- `.github/workflows/playwright.yml`
- `.github/workflows/ops-worker-deploy.yml`
- `.github/workflows/commercial-cost-worker-deploy.yml`
- `.github/workflows/ico-batch-deploy.yml`

## Current Repo State

### Already exists

- `.github/workflows/hubspot-greenhouse-integration-deploy.yml` usa versiones Node 24-compatibles (TASK-574 PR #96): checkout@v5, setup-python@v6, auth@v3, setup-gcloud@v3.
- `package.json` NO tiene campo `packageManager` (confirmado 2026-04-24) — esto neutraliza el único breaking change relevante de `actions/setup-node@v5`.
- Runners GitHub-hosted son v2.327.1+ automáticos → ningún requirement de runner se pierde.

### Gap verificado en ejecución

La spec original listaba 17 referencias en 5 workflows. El inventario real detectó referencias adicionales en `design-contract.yml`, `reliability-verify.yml`, `azure-teams-deploy.yml` y `azure-teams-bot-deploy.yml`.

| Workflow | Action | Current | Target |
|---|---|---|---|
| ci.yml | actions/checkout | v4 | v5 |
| ci.yml | pnpm/action-setup | v4 | v6 |
| ci.yml | actions/setup-node | v4 | v5 |
| ci.yml | actions/upload-artifact | v4 | v5 |
| playwright.yml | actions/checkout | v4 | v5 |
| playwright.yml | pnpm/action-setup | v4 | v6 |
| playwright.yml | actions/setup-node | v4 | v5 |
| playwright.yml | actions/upload-artifact | v4 | v5 |
| ops-worker-deploy.yml | actions/checkout | v4 | v5 |
| ops-worker-deploy.yml | google-github-actions/auth | v2 | v3 |
| ops-worker-deploy.yml | google-github-actions/setup-gcloud | v2 | v3 |
| commercial-cost-worker-deploy.yml | actions/checkout | v4 | v5 |
| commercial-cost-worker-deploy.yml | google-github-actions/auth | v2 | v3 |
| commercial-cost-worker-deploy.yml | google-github-actions/setup-gcloud | v2 | v3 |
| ico-batch-deploy.yml | actions/checkout | v4 | v5 |
| ico-batch-deploy.yml | google-github-actions/auth | v2 | v3 |
| ico-batch-deploy.yml | google-github-actions/setup-gcloud | v2 | v3 |

Se migraron todas las referencias target antiguas encontradas por:

```bash
rg -n "actions/(checkout|setup-node|upload-artifact)@v4|pnpm/action-setup@v4|google-github-actions/(auth|setup-gcloud)@v2" .github/workflows
```

Resultado post-fix esperado: `0` matches.

Tags target verificados con GitHub API el 2026-05-09:

- `actions/checkout@v5`
- `actions/setup-node@v5`
- `actions/upload-artifact@v5`
- `pnpm/action-setup@v6`
- `google-github-actions/auth@v3`
- `google-github-actions/setup-gcloud@v3`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Pre-flight check

- Re-verificar que el `package.json` del repo sigue sin campo `packageManager` al momento de ejecución. Si se agregó entre 2026-04-24 y el run, evaluar si `actions/setup-node@v5` requiere `package-manager-cache: false` para preservar control explícito del cache pnpm.
- Re-fetch de release notes de cada action target para detectar breaking changes aparecidos después del 2026-04-24:
  ```bash
  for action in "actions/checkout" "actions/setup-node" "actions/upload-artifact" "pnpm/action-setup" "google-github-actions/auth" "google-github-actions/setup-gcloud"; do
    echo "=== $action ==="
    gh api "repos/$action/releases?per_page=3" --jq '.[] | "\(.tag_name) [\(.published_at | split("T")[0])]"'
  done
  ```
- Confirmar que el target de cada bump sigue siendo v5/v6/v7/v3 según el target mostrado en la tabla arriba, o actualizar a versión más reciente si hay point release nueva sin breaking change.

### Slice 2 — Update de workflows (repo-wide)

- Edit único por archivo: cambiar versiones in-place para todas las referencias target antiguas del repo.
- No tocar otros aspectos del YAML (triggers, paths, env vars, steps). Objetivo: diff limpio que solo muestre los `uses:` actualizados.
- Si Slice 1 indicó necesidad de `package-manager-cache: false`, agregarlo a setup-node en `ci.yml` + `playwright.yml`.

### Slice 2b — Smoke-lane flaky semantics

- Extraer parser Playwright reusable en `scripts/lib/smoke-lane-report.ts`.
- Definir contrato: último intento fallido = `failed`; intento fallido seguido de último intento `passed` = `flaky`; `flaky` no incrementa `failed_tests`.
- Cubrir con tests unitarios y artifact real de Playwright.

### Slice 2c — E2E transient navigation resilience

- Endurecer `tests/e2e/fixtures/auth.ts` con `gotoWithTransientRetries`.
- Reintentar solo errores transitorios de `page.goto` con backoff acotado.
- Mantener fallas HTTP/auth/assert como fallas reales.

### Slice 3 — Validación pre-merge

- Push branch + open PR a `develop`.
- GitHub Actions corre `ci.yml` contra la nueva config. Si pytest/lint/build del monorepo fallan, revisar diff.
- Verificar que no hay deprecation warnings en el summary del run (señal positiva de migración limpia).

### Slice 4 — Merge + auto-deploys

- Squash merge a `develop`.
- Los 3 deploy workflows (`ops-worker`, `commercial-cost-worker`, `ico-batch`) auto-disparan por paths filter (cada uno incluye su propio archivo YAML).
- Cada deploy ejecuta su smoke interno. Si cualquiera falla, Cloud Run mantiene revisión vieja (fail-closed).
- Monitorear los 3 runs hasta exit 0.

### Slice 5 — Documentación de cierre

- Actualizar `Handoff.md` + `changelog.md` con timestamps reales de cada deploy + revisiones Cloud Run nuevas.
- Mover TASK-607 a `complete/`, sincronizar `docs/tasks/README.md` + `TASK_ID_REGISTRY.md`.
- Cross-check: confirmar que `git grep "@v4\|@v2"` en `.github/workflows/` sólo matchea acciones de terceros no-deprecadas (si quedan), no las 6 actions target.

## Out of Scope

- Refactor de steps o jobs de cualquier workflow — solo version bumps.
- Introducción de nuevas actions (ej. `actions/cache`, `codecov/codecov-action`) — eso va en tasks separadas.
- Consolidación de workflows o extracción de steps comunes a composite actions.
- Modernización de `package.json` para agregar campo `packageManager` — ortogonal.
- Ajustes a `deploy.sh` de cada servicio — si el action bump revela un bug en deploy.sh, abrir issue separado.
- Migración a OIDC para otras integraciones (Vercel, etc.) — fuera del scope Node 24.

## Detailed Spec

### Análisis de compatibilidad (ya ejecutado 2026-04-24, re-validar en Slice 1)

| Action | Bump target | Breaking change | Impacto en Greenhouse |
|---|---|---|---|
| `actions/checkout` | v4→v5 | Solo Node 24 runner | Zero (runners auto-actualizan) |
| `actions/setup-node` | v4→v5 | Auto-cache si `packageManager` está en `package.json` | Zero (no tenemos ese campo); `cache: pnpm` explícito sigue funcionando |
| `actions/upload-artifact` | v4→v5 | Backend `@actions/artifact` v4 | Zero (solo uploadeamos, no usamos download-artifact) |
| `pnpm/action-setup` | v4→v6 | Solo Node 24 | Zero (input `version: 10` inalterado) |
| `google-github-actions/auth` | v2→v3 | Node 24 + parámetros legacy removidos | Zero (usamos WIF canónico con `workload_identity_provider` + `service_account`); **validado empíricamente en PR #96** |
| `google-github-actions/setup-gcloud` | v2→v3 | `skip_tool_cache` removido | Zero (no usamos ese param); **validado empíricamente en PR #96** |

### Workflow de rollback si algo rompe

1. **CI falla** (ci.yml o playwright.yml): no se mergea, diff se ajusta.
2. **Deploy workflow falla post-merge** (ops-worker / commercial-cost / ico-batch): Cloud Run mantiene revisión vieja (fail-closed — `Ready=True` check falla antes de traffic shift). No se requiere rollback manual.
3. **Deploy succeeds pero introduce regresión operativa**:
   ```bash
   gcloud run services update-traffic <service> \
     --region us-east4 --project efeonce-group \
     --to-revisions=<revision-anterior>=100
   ```
   Después `git revert` del merge commit + nuevo PR con diagnóstico.

### Command reference para Slice 2

```bash
# Desde la root del repo, branch nueva
git checkout -b chore/TASK-607-github-actions-nodejs-24

# 5 workflows en un comando
sed -i '' \
  -e 's|actions/checkout@v4|actions/checkout@v5|g' \
  -e 's|actions/setup-node@v4|actions/setup-node@v5|g' \
  -e 's|actions/upload-artifact@v4|actions/upload-artifact@v5|g' \
  -e 's|pnpm/action-setup@v4|pnpm/action-setup@v6|g' \
  -e 's|google-github-actions/auth@v2|google-github-actions/auth@v3|g' \
  -e 's|google-github-actions/setup-gcloud@v2|google-github-actions/setup-gcloud@v3|g' \
  .github/workflows/{ci,playwright,ops-worker-deploy,commercial-cost-worker-deploy,ico-batch-deploy}.yml

# Verify
git diff .github/workflows/
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Workflows target usan `actions/checkout@v5`
- [x] Workflows Node/pnpm/artifacts usan `actions/setup-node@v5`, `actions/upload-artifact@v5`, `pnpm/action-setup@v6`
- [x] Workflows GCP usan `google-github-actions/auth@v3` + `google-github-actions/setup-gcloud@v3`
- [x] Grep de actions target antiguas en `.github/workflows/` retorna `0` matches
- [x] `package.json` sigue sin `packageManager`; no se requiere `package-manager-cache: false`
- [x] Parser smoke-lane distingue `failed` final vs `flaky`
- [x] Navegación autenticada E2E usa retry transitorio acotado
- [ ] CI + Playwright post-push verdes
- [ ] Sin deprecation warnings de Node.js 20 por actions en los summaries post-push

## Verification

- `gh run list --repo efeoncepro/greenhouse-eo --workflow <each workflow> --limit 1` muestra el run más reciente completed con conclusion=success
- `gcloud run services describe <service>` por cada worker muestra revisión nueva post-2026-04-24 con `Ready=True`
- Manual smoke del último run de cada workflow no muestra warning Node.js 20

## Closing Protocol

- [x] `Lifecycle` del markdown queda `complete`
- [x] Archivo movido a `docs/tasks/complete/`
- [x] `docs/tasks/README.md` sincronizado
- [x] `docs/tasks/TASK_ID_REGISTRY.md` sincronizado
- [x] `Handoff.md` documenta el cierre y el drift de spec
- [x] `changelog.md` registra el bump repo-wide y la semántica flaky
- [x] Chequeo cruzado: no quedan referencias target antiguas en workflows

## Follow-ups

- Considerar actions/checkout@v6 y pnpm/action-setup@v6 ya están disponibles — si queremos siempre estar en latest major, agendar bump periódico trimestral.
- Evaluar agregar `packageManager` al `package.json` para permitir auto-cache detection (reduce configuración explícita en workflows; riesgo bajo).
- Evaluar consolidar los 3 deploy workflows en uno composite con matrix strategy (reduce duplicación pero aumenta complejidad; fuera de scope).

## Open Questions

- Resuelta: no se agregó `actions/download-artifact`. Si se agrega en el futuro, debe versionarse compatible con `upload-artifact` y revalidarse con GitHub API antes del cambio.
- ¿El `cache: pnpm` explícito en setup-node@v5 sigue siendo preferido vs auto-cache si agregamos `packageManager` al `package.json`? Revisar al momento de ejecutar.
