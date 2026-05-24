# TASK-930 — ops-worker comparte servicio entre staging/prod: config staging sobre el worker reactivo productivo

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno (deuda técnica de infraestructura detectada 2026-05-24)`
- Rank: `TBD`
- Domain: `ops|platform|cloud`
- Blocked by: `none`
- Branch: `task/TASK-930-ops-worker-staging-prod-config-coupling`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Hay **un solo** servicio Cloud Run `ops-worker` (efeonce-group/us-east4) que corre **todos** los Cloud Scheduler jobs reactivos de producción (`ops-reactive-*`, `ops-nubox-sync`, `ops-hubspot-companies-sync`, `ops-email-delivery-retry`, etc.) contra la **única** Cloud SQL compartida (`greenhouse-pg-dev`). Como `services/ops-worker/deploy.sh` usa el **mismo `SERVICE_NAME="ops-worker"`** para `ENV=staging` y `ENV=production`, y el push a develop deploya staging mientras el release `develop→main` deploya prod, **gana el último deploy**: entre un push a develop y el siguiente release prod, el worker que procesa datos productivos corre con **config de staging** (base URL `dev-greenhouse`, secret refs `...-staging`: Resend, NextAuth, Azure, Nubox).

Investigar la severidad real (¿efectos outbound mal-ruteados: emails vía Resend staging, Nubox sync al ambiente equivocado, links a dev-greenhouse?) y aplicar el fix canónico (servicio prod dedicado o desacople de config del último deploy).

## Why This Task Exists

Detectado el 2026-05-24 verificando la activación shadow de TASK-921/922: el `ops-worker` quedó en config staging tras un push a develop, pero es el mismo servicio que ejecuta los jobs reactivos productivos. Los **datos** están bien (una sola DB → reads/writes correctos sin importar el config). El riesgo es en los **efectos outbound** durante las ventanas en que el worker corre config staging: emails productivos con la Resend key de staging, `ops-nubox-sync` con tokens Nubox de staging, links generados apuntando a `dev-greenhouse`.

No es un bug nuevo ni una emergencia: `deploy.sh` lo **documenta como deuda temporal asumida** (*"Production currently shares the canonical Cloud SQL instance and app password with the rest of the portal runtime... move to dedicated prod infrastructure without another refactor"*). Esta task lo formaliza para investigar + resolver, en vez de dejarlo como conocimiento tribal.

## Goal

- **Investigar y cuantificar la severidad real**: qué jobs reactivos tienen efectos outbound (email/Nubox/HubSpot/links), si la Resend key de staging entrega a destinatarios reales, si `ops-nubox-sync` con tokens staging pega al ambiente correcto o falla, y con qué frecuencia el worker está en config staging vs prod (ratio push-develop / release-prod).
- **Decidir el fix canónico** entre las opciones (ver Detailed Spec) y aplicarlo: servicio prod dedicado (`ops-worker-production`) **o** garantizar que prod sea siempre el último deploy / config no dependa del último deploy.
- Documentar el contrato de topología en `GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` (qué worker corre qué, con qué config, en qué ambiente).
- Reliability signal o check que detecte si el worker reactivo productivo quedó en config staging (si se decide mantener el modelo de servicio compartido).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` — §4.9/§5 ops-worker Cloud Run + Cloud Scheduler (actualizar con el contrato de topología resultante)
- `docs/architecture/GREENHOUSE_VERCEL_CRON_CLASSIFICATION_V1.md` — clasificación de crons (async_critical viven en ops-worker)
- `GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md` — `production-release.yml` deploya el ops-worker prod vía workflow_call

Reglas obligatorias:

- **NUNCA** cambiar la topología de deploy sin verificar primero la severidad real (no asumir daño ni inocuidad).
- **NUNCA** romper el contrato del release orchestrator (`production-release.yml` deploya ops-worker prod) ni el auto-deploy staging en push a develop.
- **NUNCA** mover secret refs a config sin pasar por `resolveSecretByRef` / el contrato canónico de secrets.
- Acción sobre infra compartida (Cloud Run, Cloud Scheduler) = **confirmar antes** de aplicar cambios destructivos.

## Dependencies & Impact

### Depends on
- `services/ops-worker/deploy.sh` (SERVICE_NAME + ramas ENV staging/prod)
- `.github/workflows/ops-worker-deploy.yml` (develop → staging) + `production-release.yml` (release → prod)
- Cloud Scheduler jobs apuntando al worker

### Blocks / Impacts
- Correctitud de efectos outbound de los jobs reactivos productivos (emails, Nubox sync) durante ventanas con config staging.
- Cualquier task que active flags en el ops-worker (TASK-921/922 shadow, TASK-916 RpA writeback) hereda esta topología.

### Files owned (estimado)
- `services/ops-worker/deploy.sh` — MODIFY (service name por env o config decoupling)
- `.github/workflows/ops-worker-deploy.yml` + posible cambio en `production-release.yml` — MODIFY
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` — Delta
- posible `src/lib/reliability/queries/ops-worker-config-drift.ts` — NEW (si se mantiene servicio compartido)

## Current Repo State

### Already exists
- `services/ops-worker/deploy.sh` con ramas `ENV=staging|production` (mismo SERVICE_NAME) + comentario documentando la deuda de infra compartida.
- Un solo `ops-worker` Cloud Run; Cloud SQL `greenhouse-pg-dev` compartida.

### Gap
- No hay separación real staging/prod del worker reactivo.
- No hay detección de "worker productivo corriendo config staging".
- Topología no documentada en arch docs (es conocimiento tribal + comentario en deploy.sh).

## Out of Scope
- Separar la Cloud SQL en instancias staging/prod dedicadas (decisión mayor de infra; evaluar aparte si emerge).
- Cualquier cambio al flujo de flags shadow de TASK-921/922 (esos están bien; solo heredan la topología).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Investigación + cuantificación de severidad (read-only)
- Inventariar qué jobs reactivos tienen efectos outbound reales (email vía Resend, Nubox sync, HubSpot, links generados) y cuáles son solo DB (outbox/materialización/projections — inocuos al config).
- Verificar si la Resend key de staging entrega a destinatarios reales (o test-mode), y si `ops-nubox-sync` con tokens staging pega al ambiente correcto/falla.
- Medir el ratio de tiempo en config staging vs prod (frecuencia push-develop vs release-prod).
- **Entregable**: reporte de severidad real (alta/media/baja) + recomendación de fix. Si severidad alta → escalar.

### Slice 2 — Fix canónico (según Slice 1)
- Aplicar la opción elegida (ver Detailed Spec).

### Slice 3 — Documentación + detección
- Delta en `GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` con el contrato de topología.
- Reliability signal de config drift (si se mantiene servicio compartido).

## Out of Scope
- (ver arriba)

## Detailed Spec

**Opciones de fix (decidir en Slice 1 con evidencia)**:

1. **Servicio prod dedicado** `ops-worker-production` (+ `ops-worker-staging`): cada uno con su config + sus Cloud Scheduler jobs. Push a develop deploya staging; release prod deploya prod. Cero acoplamiento. **Más limpio, más costo** (2 servicios + 2 sets de jobs). Requiere mover los Cloud Scheduler jobs productivos al servicio prod.
2. **Config no depende del último deploy**: el worker resuelve su config (base URL, secret refs) en runtime según una env var de ambiente fija o según el contexto, no según qué deploy.sh corrió último. Menos servicios, pero más lógica runtime.
3. **Garantizar prod siempre último**: que el auto-deploy de develop NO deploye el worker compartido (solo build/test), y que solo el release prod lo deploye. Pierde el auto-deploy staging del worker (trade-off).

La elección depende de la severidad (Slice 1) + costo aceptable. Si los efectos outbound resultan inocuos en config staging (e.g. Resend staging entrega bien, Nubox sync es idempotente al ambiente correcto), la opción 2/3 (barata) basta. Si hay daño real, la opción 1 (servicio dedicado) es la robusta.

## Rollout Plan & Risk Matrix

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal |
|---|---|---|---|---|
| Email productivo vía Resend staging (sender/dominio equivocado o no entregado) | email | medium | Slice 1 confirma; fix desacopla config | logs Resend + ops-email-delivery-retry |
| Nubox sync productivo con tokens staging (ambiente equivocado) | finance/nubox | medium | Slice 1 confirma | source_sync_runs nubox + reliability |
| Cambio de topología rompe el auto-deploy staging o el release prod | cloud/release | low | tests + dry-run, no destructivo | ops-worker-deploy run status |

### Feature flags / cutover
- Sin flag — cambio de topología de infra. Cutover: aplicar en ventana de bajo tráfico, verificar jobs reactivos post-cambio.

### Out-of-band coordination required
- Cloud Run + Cloud Scheduler (gcloud, project efeonce-group). Si se crea servicio prod dedicado, mover los jobs es coordinación con el deploy.sh + verificación.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria
- [ ] Slice 1: reporte de severidad real (qué jobs outbound afectados, evidencia Resend/Nubox, ratio staging/prod) + recomendación
- [ ] Slice 2: fix canónico aplicado + verificado (jobs reactivos productivos corren con config prod siempre, o config desacoplada del último deploy)
- [ ] Topología documentada en `GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- [ ] (si aplica) reliability signal de config drift, steady=0
- [ ] `pnpm build` + `pnpm lint` + `pnpm tsc --noEmit` verdes

## Verification
- `gcloud run services describe ops-worker(-production)` → config esperada
- Cloud Scheduler jobs apuntan al servicio correcto
- Smoke: un email/Nubox sync productivo sale con config prod

## Closing Protocol
- [ ] `Lifecycle: complete` + mover a `complete/`
- [ ] Sync `README.md` + `TASK_ID_REGISTRY.md`
- [ ] `Handoff.md` + `changelog.md`
- [ ] Delta en `GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- [ ] chequeo de impacto cruzado (TASK-921/922/916 heredan topología)

## Follow-ups
- Si la severidad es alta, considerar ISSUE-### paralelo para el incident tracking.
- Evaluar Cloud SQL dedicada staging/prod (decisión mayor, separada).

## Open Questions
- ¿Cuál opción de fix (1/2/3) según la severidad de Slice 1? Se resuelve con evidencia, no a priori.
- ¿Hay otros consumidores de la config del worker además de email/Nubox/links? (Slice 1 lo inventaria.)
