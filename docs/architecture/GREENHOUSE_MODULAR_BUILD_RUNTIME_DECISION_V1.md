# Greenhouse Modular Build & Runtime Decision V1

## Status

- Status: `Superseded`
- Superseded by: `docs/architecture/GREENHOUSE_BUILD_UNIT_DECOMPOSITION_DECISION_V1.md`
- Date proposed: `2026-07-10`
- Decision owner: `Platform / Architecture`
- Epic: `EPIC-026`
- First evidence task: `TASK-1376`
- Reversibility: `two-way-but-slow`
- Confidence: `medium`
- Validated as of: `2026-07-10`
- Evidence verdict: `no-go` after TASK-1379

> Historical scope: TASK-1379's Roadmap materialization remains a valid `no-go`. The broader conclusion to stop physical decomposition was superseded on 2026-07-10 after operator invoice evidence showed an approximately USD 20 -> USD 530 Elastic escalation, Standard builds up to 45 minutes/incomplete, and USD 250 current Elastic spend despite local-first work.

## Context

Greenhouse opera hoy como una gran aplicación Next.js que reúne portal autenticado, superficies públicas, API/BFF, administración, crons HTTP, documentación runtime, tooling y una porción importante de la operación de plataforma. El baseline medido del 10 de julio de 2026 confirma 1.269 entrypoints de App Router (279 páginas y 946 route handlers), 6.140 archivos bajo `src/` y un p95 warm RSS de 7,51 GB, cerca del heap ceiling de 8 GB.

El build actual ya requirió limitar workers de static generation, reservar un heap Node de 8 GB, desactivar sourcemaps fuera de producción y crear guards para builds docs-only. Estas medidas reducen síntomas, pero no reducen el grafo que debe comprender, compilar y desplegar cada cambio. A la vez, Greenhouse ya cuenta con límites de dominio, workers Cloud Run y contratos server-side suficientemente maduros para iniciar un desacople incremental.

La decisión debe optimizar tres resultados a la vez: costo remoto, ergonomía local y reducción de acoplamiento cognitivo, sin perder transacciones, authz, Full API Parity, audit/outbox ni la capacidad de hacer cambios atómicos entre dominios.

## Decision

**Resultado final 2026-07-10:** la propuesta queda rechazada en este evidence gate. TASK-1379 mejoró clean p50 19,9% y redujo 88,6–96,2% los artifacts Roadmap, pero warm RSS p95 empeoró 9,8% hasta 8,25 GB. Como el gate exigía reducir RSS al menos 10%, no se autoriza workspace foundation, `apps/*`, `packages/*` ni nuevos deployables. El cutover experimental fue revertido.

**Delta 2026-07-15:** el operador decidió apagar el cockpit Roadmap por bajo uso y fricción recurrente de Turbopack. `/roadmap` queda fuera del menú/runtime, `GET /api/roadmap/work-items*` responde `410 roadmap_disabled` y se retira `outputFileTracingIncludes` para `docs/{epics,tasks,mini-tasks,issues}/**/*.md`. Esto no acepta el artifact gzip de TASK-1379 ni habilita multi-deployable; solo elimina el hotspot runtime actual. Cualquier reactivación debe diseñar una proyección fuera del runtime del portal.

Si `TASK-1376` confirma el baseline y una primera frontera con beneficio neto, Greenhouse evolucionará incrementalmente desde una única aplicación Next.js hacia un **modular monorepo con múltiples unidades desplegables**, manteniendo por defecto un **modular monolith de dominio y datos**.

La migración seguirá un patrón strangler y estas reglas:

1. No habrá reescritura big-bang.
2. El primer paso será hacer explícito el dependency graph mediante workspaces y paquetes con ownership claro.
3. Los contratos compartidos serán pequeños y estables: capabilities, commands/readers, DTOs, events, auth, DB y observabilidad; no un paquete `shared` catch-all.
4. PostgreSQL y los sources of truth de dominio no se dividirán como parte de esta decisión.
5. `@/lib/db` seguirá siendo el chokepoint lógico de conexión, aunque su ubicación física evolucione a un paquete server-only.
6. Las escrituras seguirán pasando por primitives canónicos con authz, idempotencia, audit/outbox y errores sanitizados.
7. Las aplicaciones desplegables deberán tolerar version skew durante rollouts.
8. Cada extracción tendrá routing reversible, observabilidad cross-runtime y rollback probado.
9. Vercel seguirá siendo el host del portal durante la primera fase; una migración de cloud/host requerirá otro ADR.
10. El programa podrá detenerse tras cualquier slice si el ahorro observado no compensa el costo operacional.
11. Mientras el programa avanza, el producto seguirá construyéndose en la topología actual bajo el contrato extraction-ready de `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`; ninguna feature aislada anticipará `apps/*` o `packages/*`.

## Target shape

```text
apps/
  portal/              # UI autenticada + BFF de presentación
  public/              # solo si TASK-1376 valida esta frontera
  api/                 # solo si TASK-1376 valida esta frontera
services/
  ops-worker/
  commercial-cost-worker/
  ico-batch-worker/
  hubspot-integration/
packages/
  contracts/
  db/
  auth/
  observability/
  domain-*/
  ui/
tooling/
docs/
```

La forma es orientativa. `TASK-1376` decide la primera extracción; no autoriza crear todas las carpetas de una vez.

## Evidence decision — TASK-1376 / TASK-1379

El veredicto es `conditional-go`, no aceptación general de la topología objetivo. Baseline: local clean p50 138 s (n=3, sin p95); warm p50/p95 102/124 s y RSS p50/p95 6,56/7,51 GB (n=5); Vercel Ready p50/p95 4/7 min sobre ventana CLI corta. Billing FOCUS quedó `not_configured` y no se interpreta como costo cero.

TASK-1379 ejecutó esa prueba: cero Markdown en traces, reducción de analyzer ≥88,6% y clean p50 -19,9%, pero warm RSS p95 pasó de 7,51 a 8,25 GB (+9,8%). Los targets eran conjuntivos; el resultado es `no-go`. El reader filesystem fue restaurado y este ADR queda `Rejected` hasta que una hipótesis arquitectónica distinta aporte evidencia nueva.

## Alternatives considered

| Alternativa | Evaluación | Decisión |
| --- | --- | --- |
| Mantener una sola app y optimizar el build | Menor riesgo inmediato, pero conserva el grafo de 1.225 entrypoints y posterga el límite estructural | Útil como fase cero, insuficiente como target |
| Modular monorepo con unidades desplegables | Permite builds afectados, contratos atómicos y migración incremental; agrega disciplina de releases y version skew | Propuesta |
| Multirepo por dominio | Aislamiento fuerte, pero multiplica releases, package publishing, coordinación y drift de contratos | Rechazada para esta etapa |
| Microservicios por dominio | Aumenta latencia, observabilidad y fallos distribuidos sin que el problema actual sea de escala runtime | Rechazada |
| Microfrontends | Añade routing/composición y costo de plataforma; Vercel cobra soporte adicional más allá de proyectos incluidos | Rechazada salvo evidencia futura |
| Migrar todo fuera de Vercel | Podría cambiar costos, pero mezcla desacople de software con migración de hosting | Fuera de esta decisión |

## Consequences

### Positive

- Builds y verificaciones podrán ejecutarse por unidad afectada.
- Portal, API, superficies públicas y tooling podrán evolucionar con ciclos distintos.
- El dependency graph quedará gobernado y verificable.
- La experiencia local podrá levantar y validar solo lo necesario.
- La arquitectura ganará seams explícitos para futuras extracciones.

### Negative

- Más manifests, env vars, deployment identities y estados de release.
- Riesgo de duplicar auth, pools, observabilidad o lógica si los límites no se hacen cumplir.
- Rollouts entre aplicaciones pueden observar versiones diferentes del contrato.
- Un paquete compartido demasiado amplio puede recrear el monolito a nivel de build.
- La migración competirá con trabajo de producto y requerirá disciplina de cierre.

## Hard constraints

- No romper el release orchestration vigente ni el mapping real Vercel/Cloud Run/Cloud SQL.
- No cambiar source of truth, multi-tenancy por `space_id`, ni semántica de dominios como efecto lateral.
- No exponer secretos, sesiones o SDKs server-only al browser.
- No dividir una transacción de negocio solo para conseguir una frontera de deployment.
- No hacer que Nexa, MCP, UI y workers consuman implementaciones paralelas.
- Mantener compatibilidad de URLs, cookies, OAuth callbacks y deep links durante cada cutover.

## Evidence gate before acceptance

Este ADR no pasa a `Accepted` hasta que `TASK-1376` entregue:

- baseline p50/p95 y costo atribuible;
- build/import graph reproducible;
- matriz de fronteras candidatas;
- primera extracción recomendada con rollback;
- objetivos cuantificados;
- veredicto `go | conditional-go | no-go`.

Un resultado `no-go` mantiene la optimización dentro de la app actual y deja este ADR en `Rejected` o `Deprecated`, sin reorganización cosmética.

## Self-critique

- **12 meses:** el mayor riesgo es crear workspaces sin reducir imports compartidos, obteniendo más complejidad con builds todavía globales.
- **36 meses:** una sola base y un único paquete de dominio podrían convertirse en el siguiente límite; solo se reconsiderará con evidencia de escala, aislamiento o autonomía operacional.
- **Cognitive debt:** paquetes genéricos y excepciones temporales pueden ocultar ownership. Cada boundary deberá tener reglas mecanizadas y documentación breve.
- **Lock-in:** Next.js/Vercel siguen siendo un lock-in relevante, pero esta decisión reduce el lock-in estructural al separar contratos de adapters de hosting.
- **Observability gap:** un request cross-app podría fallar sin correlación. Trace/correlation ID y release manifest son condiciones de extracción.
- **AI risk:** Nexa y otros agentes deben seguir consumiendo contracts gobernados; separar apps no autoriza writes directos ni tools duplicados.
- **Regional/compliance:** PII no debe replicarse entre apps ni logs. Ley 21.719/LGPD siguen aplicando a cada nuevo runtime y store temporal.

## Current-reality validation

- Vercel documenta soporte de monorepos con skip de proyectos no afectados y workspaces npm/yarn/pnpm/Bun; validado 2026-07-10: <https://vercel.com/docs/monorepos>.
- Vercel publica Build CPU Minutes por tipo de máquina; validado 2026-07-10: <https://vercel.com/pricing>.
- Next.js 16.1+ ofrece análisis experimental del grafo Turbopack; validado 2026-07-10: <https://nextjs.org/docs/pages/guides/package-bundling>.

## Related documents

- `docs/architecture/GREENHOUSE_MODULAR_BUILD_RUNTIME_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/epics/complete/EPIC-026-greenhouse-modular-build-runtime-decoupling.md`
- `docs/tasks/in-progress/TASK-1376-build-baseline-dependency-boundary.md`
- `docs/audits/platform/2026-07-10-greenhouse-build-dependency-baseline.md`
- `docs/audits/platform/2026-07-10-roadmap-materialized-index-ab.md`
