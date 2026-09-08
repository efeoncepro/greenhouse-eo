# QA Release Audit - TASK-1844

## Verdict

BLOCK para cierre operativo: faltan rollout y clientes reales. Implementación local lista para revisión de release.

Closure state: **code complete, rollout pendiente**

## Scope

- Changed files reviewed: contexto/consentimiento/emisión/refresh, reader canónico, permisos efectivos,
  resolver de relación, API Platform, gateway `1.3.0`, deployment config y SQL expand/contract pendientes.
- Runtime or environment reviewed: checkouts compartidos Greenhouse `develop` y efeonce-mcp `main`;
  PostgreSQL real con pruebas TEMP serializadas; renderer local y lecturas Cloud Run de baseline.
- Out of scope / unrelated worktree changes: no worktrees. Se preservó el commit concurrente
  `2ce2167aa` de EPIC-045, incluidos Handoff/changelog. No se operó sobre sus features.

## Risk Classification

| Risk | Level | Why |
| --- | ---: | --- |
| Auth / aislamiento organizacional | Alto | El mismo actor selecciona targets distintos por llamada |
| Consentimiento y refresh | Alto | Una familia anterior nunca puede elevarse a v2 por flags |
| Schema / deploy parcial | Alto | El writer anterior depende del índice que retira contract |
| UI | Bajo | Copy/DTO sobre renderer existente, sin nuevo layout |

## Injected Skills

- `efeonce-mcp-platform`, `mcp-craft`: contrato reader/tool y continuidad base-only.
- `software-architect-2026`, `greenhouse-secret-hygiene`: límites, snapshot, DB y config.
- `greenhouse-ai-design-studio`, `greenhouse-ux-content-accessibility`, `copywriting`: delta ui-lite.
- `greenhouse-browser-diagnostics`, `greenhouse-gvc-playwright`, `greenhouse-ui-enterprise-review`: renderer/GVC.
- `greenhouse-production-release`, `vercel-operations`: config durable, orquestador y estado servido.
- `greenhouse-qa-release-auditor`, `greenhouse-documentation-governor`: evidencia y cierre honesto.

## Evidence

| Gate | Result | Evidence |
| --- | --- | --- |
| Greenhouse unit/integration | PASS | 528 pruebas, 42 archivos; comando focal de la task. 25 pruebas live de otras suites quedan skipped en este modo y no se cuentan como verificadas |
| PG live TASK-1844 | PASS | `pnpm test:live src/lib/auth-server/internal/multi-org-migration.live.test.ts src/lib/identity/internal-access/target-authority.live.test.ts`: 2 archivos, 2 passed, 0 skipped, 60.58 s |
| SQL real | PASS limitado | Los dos SQL pendientes se ejecutaron sobre tablas TEMP con shape real: expansión, colisión entre versiones, writer compatible, contract, trigger inmutable y down rechazado. El esquema compartido no se modificó |
| Autoridad real sin mutación | PASS limitado | Snapshot read-only: 14 organizaciones autorizadas, 2807 ms. No prueba el endpoint desplegado ni el token v2 completo |
| Gateway | PASS | `pnpm check`: 158 passed, 0 skipped; formato, typecheck, build y baseline de superficie `1.3.0` correctos |
| Greenhouse types/build | PASS | `pnpm exec tsc --noEmit` y `pnpm build`; bundle real de auth-server validado también por runtime-deps gate |
| Lint | PASS con baseline | 0 errores, 26 warnings previos `greenhouse/no-opacity-on-text`; no warnings propios añadidos |
| Config-only deploy | PASS | Test ejecuta el step real `worker-drift`: mismo SHA con cambio de gate/cohorte solicita deploy; estado idéntico lo omite; CSV preservado |
| Manifest / workers / rutas | PASS | `mcp:manifest:check`, `worker:build-contract-gate`, `worker:runtime-deps-gate`; route reachability 233 rutas, 0 huérfanas |
| Consentimiento visual | PASS local | [Revisión y cuatro PNG](../../ui/reviews/TASK-1844/review.md); 1440 y 390 px, teclado/reduced motion, 0 findings GVC |
| Higiene local de secrets | Diagnóstico | Loader canónico: 6 configuraciones healthy y 2 unconfigured (`NEXTAUTH_URL`, `CRON_SECRET`) en el entorno de tooling local. No se interpreta como estado productivo ni exige cambios ajenos; ningún secreto nuevo |
| Readback PG posterior | PASS | CHECK sigue versión 1, índice no versionado original, 6 contextos v1. TEMP rollback no alteró la base compartida |
| Runtime baseline Cloud Run | Verificado al inicio | Auth `00043-ndg` SHA `fb5fc082aa92`; gateway `00047-8b5` SHA `cd229069ee9e`; Ready/100 %, gates multiorg ausentes. No acredita las revisiones nuevas |
| Reader Vercel / clientes v2 / rollback servido | PENDIENTE | No se desplegó, activó ni reautorizó. Ningún resultado local se atribuye a Codex/Claude reales |
| Task / ops / docs | PASS local | TASK-1844 0 errores/0 warnings; ops 0 errores y 13 advertencias preexistentes de otros epics. docs:closure-check, flag audit (0 sin registrar), cron gate y cobertura deploy de los cuatro workers correctos |

Las pruebas incluyen roles futuros/vencidos/revocados y scopes acotados, todos los spaces de un target,
defaults y overrides aprobados/vigentes, A/B/C, cursor revocado, revocación selectiva/global, expiración durante
snapshot, aislamiento concurrente del wrapper SDK, errores de reader y JWT ES256 con continuidad v1/v2.
Las comprobaciones de SQL ejecutan PostgreSQL; no se usa una comparación textual de consultas como prueba.

Gateway guardado en commit local `b2bcddb`; sin push ni deploy. Los cambios Greenhouse se guardan en el commit
que contiene esta auditoría. `docs:context-check:strict` es el último gate antes del commit; el handoff conserva
sólo continuidad y enlaces a la evidencia, sin eliminar historia ajena.

## Blockers

1. Aplicar las dos fases de migración y servir writers/readers/gateway compatibles mediante rollout aprobado.
2. Preparar manifiesto de fixtures runtime propio de TASK-1844 y verificar cohorte exacta antes de activar.
3. Consentimiento, dispatch, refresh post-TTL, revocación ≤60 s y rollback/restore en Codex/Claude reales.

## Conditional Follow-Ups

1. Medir latencia/error rate del snapshot en runtime antes de ampliar la cohorte; presupuesto 4 s / reader 5 s.
2. Mantener rollback sólo hacia writer compatible después de contract; conservar historia v1/v2.

## False-Closure Traps Checked

- tests green but runtime missing: estado explícito `code complete, rollout pendiente` y task in-progress.
- UI screenshot/capture absent: cuatro PNG versionados con revisión visual local.
- env/flag/redeploy/backfill pending: tres gates default OFF, cohorte vacía; no backfill de consentimiento.
- docs/task lifecycle drift: acceptance criteria distinguen prueba local de certificación runtime.
- Sentry/observability not verified: señales implementadas; `internal_revoked_still_dispatching` no medido.
  El audit local de secrets no prueba Sentry ni configuración de producción.

## Final Call

El código local implementa el contrato aprobado y sus pruebas proporcionales pasan. El cierre operativo queda
bloqueado por evidencia productiva aún no ejecutada, no por un defecto local pendiente conocido. El
[runbook](../../operations/TASK-1844_INTERNAL_MULTI_ORG_ROLLOUT.md) define la siguiente unidad revisable:
expansión y despliegue compatible OFF, readbacks, contract, cohorte/fixtures, activación y certificación real.
