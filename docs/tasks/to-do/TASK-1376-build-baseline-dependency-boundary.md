# TASK-1376 — Build Baseline, Dependency Graph & Extraction Boundary

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-026`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform|ops`
- Blocked by: `none`
- Branch: `task/TASK-1376-build-baseline-dependency-boundary`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construir el baseline reproducible del costo y peso del build de Greenhouse, mapear el dependency graph real y recomendar la primera frontera de extracción con un veredicto `go | conditional-go | no-go`. Esta task genera evidencia y tooling; no reorganiza todavía el workspace ni cambia runtime productivo.

## Why This Task Exists

Greenhouse presenta señales estructurales —1.225 entrypoints preliminares, heap de build de 8 GB, OOM remoto y congelamiento local mitigados— pero todavía no existe una medición p50/p95 ni un mapa de fanout suficiente para decidir qué extraer primero. Implementar el target monorepo sin esta evidencia arriesga una migración cosmética que agregue proyectos y releases sin reducir el build global.

## Goal

- Medir build remoto/local, memoria, cache, output y frecuencia de cambio con una metodología repetible.
- Producir un dependency/build graph que identifique high-fanout imports, route clusters y contaminación browser/server.
- Comparar fronteras candidatas y seleccionar una primera extracción reversible o emitir `no-go`.
- Entregar objetivos cuantificados y child-task split para `EPIC-026`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_MODULAR_BUILD_RUNTIME_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_MODULAR_BUILD_RUNTIME_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`

Reglas obligatorias:

- No mover carpetas de producción ni cambiar Vercel projects durante esta task.
- No inferir una frontera por naming; debe surgir del grafo y de mediciones.
- No exponer env vars, secrets, source maps privados ni payloads de billing en artifacts versionados.
- Distinguir clean/cached/local/Vercel; no mezclar muestras heterogéneas.
- Preservar el working tree del usuario y no correr builds destructivos o concurrentes con trabajo activo sin preflight.

## Normative Docs

- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/GREENHOUSE_OPERATING_LOOP_V1.md`
- `docs/epics/to-do/EPIC-026-greenhouse-modular-build-runtime-decoupling.md`
- `project_context.md`
- `Handoff.md`

## Dependencies & Impact

### Depends on

- `package.json`, `pnpm-lock.yaml`, `next.config.ts`, `tsconfig.json` y configuración ESLint vigentes.
- `scripts/run-next-build.mjs`, `scripts/next-dist-dir.mjs` y `scripts/ci/vercel-ignore-build.mjs`.
- Acceso read-only ya configurado a Vercel Billing/deployments cuando esté disponible.
- Historial Git local suficiente para calcular frecuencia de cambio por ruta/carpeta.

### Blocks / Impacts

- Bloquea todas las tasks de implementación posteriores de `EPIC-026`.
- Puede recomendar cambios posteriores sobre Roadmap docs tracing, scripts/tooling, workspaces, Vercel projects y release control plane.
- Informa si el ADR modular pasa de `Proposed` a `Accepted`, `Rejected` o permanece condicionado.

### Files owned

- `scripts/architecture/build-baseline/**`
- `artifacts/architecture/build-baseline/**` (solo output local/gitignored)
- `docs/audits/platform/2026-07-XX-greenhouse-build-dependency-baseline.md`
- `docs/architecture/GREENHOUSE_MODULAR_BUILD_RUNTIME_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_MODULAR_BUILD_RUNTIME_DECISION_V1.md`
- `docs/epics/to-do/EPIC-026-greenhouse-modular-build-runtime-decoupling.md`
- `docs/tasks/to-do/TASK-1376-build-baseline-dependency-boundary.md`
- `Handoff.md`
- `changelog.md`

## Current Repo State

### Already exists

- `next.config.ts` limita static-generation workers a 4 y documenta OOM/flaky builds cerca del límite estándar de Vercel.
- `scripts/run-next-build.mjs` reserva 8 GB de heap para `next build`.
- `scripts/ci/vercel-ignore-build.mjs` evita builds staging/docs-only, pero production sigue buildable por el release orchestrator.
- `src/lib/cloud/vercel-billing.ts` y `/api/admin/cloud/vercel-billing` entregan observabilidad FOCUS read-only.
- `pnpm actions:cost:audit` mide hotspots de GitHub Actions.
- Next.js 16.1+ incluye `next experimental-analyze` para inspección del grafo Turbopack.

### Gap

- No hay baseline p50/p95 comparable de build local/Vercel ni peak RSS versionado como metodología.
- No existe dependency graph gobernado por aplicación/dominio/runtime.
- No se conoce qué entrypoints o paquetes dominan el build.
- No hay una matriz cuantificada de fronteras candidatas ni objetivo mínimo de ahorro.
- El peso de `docs/`, `scripts/` y `full-version/` no está separado entre contexto inerte y dependencia runtime real.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `scripts/architecture/build-baseline/** + docs/audits/platform/**`
- Future candidate home: `remain-shared`
- Boundary: `baseline JSON sanitizado + audit Markdown; no runtime productivo lo consume`
- Server/browser split: `n/a — tooling local/read-only`
- Build impact: `agrega medición/análisis on-demand; no entra al bundle Next.js`
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: `repo/build graph + Vercel billing/deployment metadata read-only`
- Consumidores afectados: `Platform`, `CI/CD`, `Vercel`, `local developer workflow`, `release control plane`
- Runtime target: `tooling`

### Contract surface

- Contrato existente a respetar: `pnpm build`, `scripts/run-next-build.mjs`, Vercel FOCUS reader y deployment metadata.
- Contrato nuevo o modificado: comando reproducible bajo `scripts/architecture/build-baseline/**` que emite JSON sanitizado + audit Markdown.
- Backward compatibility: `compatible`; el comando es aditivo y no sustituye gates existentes.
- Full API parity: `N/A` para una herramienta de arquitectura local/read-only; cualquier futura capacidad visible de costos seguirá consumiendo los readers canónicos existentes.

### Data model and invariants

- Entidades/tablas/views afectadas: `none`; no DB migration ni persistencia productiva.
- Invariantes que no se pueden romper:
  - no registrar secretos, env values, PII ni source code sensible en artifacts;
  - no representar datos faltantes como cero;
  - etiquetar cada muestra con cache state, commit SHA, Node/pnpm/Next version, máquina y timestamp;
  - separar medición observada de estimación.
- Tenant/space boundary: `N/A`; metadata de build no contiene payload de tenants.
- Idempotency/concurrency: múltiples runs generan directorios/run IDs distintos; no pisan baseline aprobado sin comando/promoción explícita.
- Audit/outbox/history: audit Markdown conserva método, muestras, exclusiones y links/IDs redacted; sin outbox.

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `disabled`; tooling on-demand, no hook automático inicialmente.
- Backfill plan: consultar ventana histórica de 14–30 días cuando Vercel entregue datos; documentar ausencia si no está disponible.
- Rollback path: revertir scripts/docs; artifacts locales permanecen gitignored.
- External coordination: no requerida para lecturas ya autorizadas; habilitar APIs/tokens nuevos requiere aprobación separada.

### Security and access

- Auth/access gate: CLIs/readers autenticados read-only; no mutar Vercel settings ni deployments.
- Sensitive data posture: allowlist de campos de salida; URLs privadas, emails, env y tokens redactados.
- Error contract: `baseline_unavailable`, `build_failed`, `billing_unavailable`, `history_insufficient`, `graph_incomplete`, sin raw vendor body.
- Abuse/rate-limit posture: llamadas históricas acotadas, con cache local y sin polling continuo.

### Runtime evidence

- Local checks: al menos 3 muestras clean y 5 cached cuando el costo/tiempo sea razonable; si no, justificar muestra menor y confidence.
- DB/runtime checks: `N/A` para DB; Vercel/deployment evidence read-only con IDs sanitizados.
- Integration checks: comparar output del script con `next experimental-analyze`, inventario App Router y billing/deployment metadata.
- Reliability signals/logs: salida estructurada con `status`, `confidence`, `missingEvidence[]` y errores canónicos.
- Production verification sequence: no hay rollout; solo lectura y recomendación.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Measurement contract and inventory

- Definir schema JSON de cada muestra: commit, timestamp, environment, cache state, versions, duration, peak RSS, exit status, route counts y output sizes.
- Inventariar entrypoints App Router, dependencies, workspaces inexistentes/existentes, build inputs y output tracing.
- Clasificar `docs/`, `scripts/`, `services/`, `full-version/`, assets y config como runtime input, build input, service-only o local-only.
- Agregar guards de redacción y artifact path gitignored.

### Slice 2 — Local and remote baseline

- Medir build local clean/cached con metodología y muestra explícitas.
- Medir lint, typecheck, test discovery/dev cold-start si son reproducibles sin perturbar trabajo activo.
- Obtener 14–30 días de Vercel build/billing/deployment metadata read-only, o declarar `billing_unavailable` con evidencia.
- Calcular p50/p95 solo cuando el tamaño de muestra lo permita; de lo contrario reportar rango/mediana y confidence honesta.

### Slice 3 — Build/dependency graph

- Ejecutar `next experimental-analyze --output` o alternativa oficial compatible.
- Construir un grafo resumido de import fanout por route cluster, package y runtime.
- Detectar imports browser→server, barrels de alto fanout, SDKs pesados, duplicación de entrypoints y filesystem runtime dependencies.
- Identificar qué parte de Roadmap fuerza `docs/**` en output tracing.

### Slice 4 — Boundary matrix and recommendation

- Evaluar al menos: optimizar monolito, package/workspace foundation, public surfaces, API Platform y admin/control-plane.
- Puntuar build reduction, change independence, auth/data risk, routing reversibility, operational burden, DX benefit y ownership.
- Recomendar una sola primera frontera o emitir `no-go`.
- Definir targets before/after, rollback, risks, version-skew contract y child tasks siguientes.

### Slice 5 — Architecture decision closure

- Publicar audit en `docs/audits/platform/` con método reproducible y evidencia sanitizada.
- Actualizar ADR/arquitectura/EPIC con `go | conditional-go | no-go` y confidence.
- Si `go`, reservar/proponer las siguientes tasks sin implementarlas.
- Sincronizar `Handoff.md`, `changelog.md` y lifecycle documental.

## Out of Scope

- Crear `apps/` o `packages/` productivos.
- Mover rutas, imports, services o documentación.
- Crear proyectos Vercel o modificar build machine/settings.
- Cambiar auth, cookies, OAuth callbacks, routing o dominios.
- Migrar PostgreSQL, separar schemas o introducir APIs de red nuevas.
- Optimizar bundles durante la medición salvo instrumentation estrictamente necesaria.
- Ejecutar release, staging deploy o production deploy.

## Detailed Spec

### Minimum evidence schema

Cada run debe registrar al menos:

- `runId`, `commitSha`, `dirtyWorktree`, `startedAt`, `environment`;
- versiones Node, pnpm, Next y OS/arquitectura;
- `cacheState: clean|warm|unknown`;
- wall time, exit code y peak RSS cuando sea observable;
- route/page/handler counts;
- tamaños de build output/function traces relevantes;
- flags no sensibles que cambian el build, por nombre y presencia, nunca valor;
- `missingEvidence[]`, `warnings[]`, `confidence`.

### Boundary verdict

- `go`: evidencia suficiente, ahorro esperado material, seam reversible y ningún dealbreaker de auth/data/release.
- `conditional-go`: frontera prometedora, pero falta una prueba acotada identificada antes de mover runtime.
- `no-go`: ahorro insuficiente, dependencia/transacción inseparable o TCO operacional mayor; se recomiendan optimizaciones internas.

### Target setting

No inventar porcentajes antes de medir. El audit debe proponer targets basados en el baseline y declarar por separado:

- reducción de p95 del build afectado;
- reducción de peak RSS;
- porcentaje de cambios que evitan rebuild global;
- costo Vercel estimado/observado;
- overhead aceptable de release y operación.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 debe cerrar antes de ejecutar mediciones comparables.
- Slice 2 y Slice 3 pueden iterar, pero no se emite frontera antes de ambas.
- Slice 4 debe distinguir hechos, inferencias y estimaciones.
- Slice 5 no acepta el ADR si faltan baseline o rollback.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
| --- | --- | --- | --- | --- |
| Medición perturba máquina/trabajo activo | local DX | medium | preflight, serializar builds, documentar hardware/cache | swap alto, UI congelada, build abortado |
| Baseline sesgado por cache | build economics | high | etiquetar clean/warm y separar distribuciones | tiempos sin cache state |
| Artifact filtra secretos | security | low/medium | allowlist de salida + redaction test | env/url/token en diff |
| Grafo incompleto induce frontera errónea | architecture | medium | cruzar analyzer, imports y git change history | imports dinámicos/unresolved altos |
| Optimización cosmética | EPIC-026 | medium | targets cuantificados + no-go permitido | misma p95/RSS tras propuesta |
| Vendor data no disponible | cost baseline | medium | estado unavailable, no cero; usar deployment logs como evidencia secundaria | ventana/muestras insuficientes |

### Feature flags / cutover

- N/A — tooling read-only y documentos; no cambia runtime.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
| --- | --- | --- | --- |
| Slice 1 | Revertir schema/scripts de medición | <30 min | si |
| Slice 2 | Eliminar artifacts locales y revertir instrumentation | <30 min | si |
| Slice 3 | Revertir analyzer/graph tooling | <30 min | si |
| Slice 4 | Cambiar recomendación con nueva evidencia, preservando audit histórico | <1 h | si |
| Slice 5 | Revertir docs/indexes; no hubo runtime cutover | <30 min | si |

### Production verification sequence

1. N/A para rollout: no se despliega código productivo.
2. Validar scripts localmente con output sanitizado.
3. Contrastar metadata remota en modo read-only.
4. Ejecutar lint/tests focales del tooling.
5. Revisar audit y decisión antes de abrir tasks de migración.

### Out-of-band coordination required

N/A — repo/tooling + lecturas autorizadas. Si falta acceso a billing/build metadata, registrar `billing_unavailable`; no crear ni rotar credenciales dentro de esta task.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe un comando reproducible que emite baseline JSON sanitizado y falla con errores canónicos.
- [ ] Cada muestra declara commit, dirty state, versiones, máquina, cache state, duración y confidence.
- [ ] El audit separa local clean, local cached y Vercel; ausencia de vendor data no aparece como costo cero.
- [ ] El inventario confirma páginas, route handlers, build inputs y filesystem/output-tracing dependencies.
- [ ] Existe build/import graph con high-fanout dependencies y clasificación browser/server.
- [ ] Se compara al menos monolito optimizado, workspace foundation, public, API y admin/control-plane.
- [ ] La recomendación contiene una sola primera frontera o un `no-go`, con rollback y TCO.
- [ ] Los targets de ahorro derivan del baseline y no son porcentajes inventados previamente.
- [ ] El ADR queda actualizado con evidencia y estado apropiado.
- [ ] No se movieron rutas, no se cambió Vercel y no hubo deployment.
- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Verification

- `pnpm task:lint --task TASK-1376`
- `pnpm ops:lint --changed`
- `pnpm qa:gates --changed`
- focal lint/tests for `scripts/architecture/build-baseline/**`
- redaction test over generated JSON/Markdown
- manual architecture review of audit + ADR verdict

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `docs/epics/to-do/EPIC-026-greenhouse-modular-build-runtime-decoupling.md` refleja el veredicto y child-task split.
- [ ] `docs/architecture/GREENHOUSE_MODULAR_BUILD_RUNTIME_DECISION_V1.md` refleja evidencia, confidence y estado real.
- [ ] Se invoco `greenhouse-qa-release-auditor` y `greenhouse-documentation-governor` antes del cierre.

## Follow-ups

- Task de higiene de build context / Roadmap projection, si la evidencia la prioriza.
- Task de workspace foundation y dependency boundaries, solo con veredicto `go` o `conditional-go` satisfecho.
- Task de primera extracción piloto, definida por la matriz y no preasignada.
- Task de release/observability multi-app antes del primer cutover productivo.

## Open Questions

- ¿Qué porcentaje mínimo de reducción p95/RSS/TCO justifica el overhead operacional? Se fija después del baseline.
- ¿La primera frontera será public, API, admin o ninguna? La task debe decidirlo con evidencia.
- ¿El índice Roadmap debe materializarse en build, DB o artifact estático? Discovery debe comparar opciones sin implementarlas.
