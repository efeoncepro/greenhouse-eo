# TASK-835 — Sample Sprints Runtime Projection Hardening

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-014`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `commercial / agency / ui`
- Blocked by: `none`
- Branch: `task/TASK-835-sample-sprints-runtime-projection-hardening`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Endurece la surface runtime de `/agency/sample-sprints` para que deje de depender de heuristicas client-side para progreso, costos reales, equipo/capacidad y señales operativas. La task crea una proyeccion server-side reusable para el command center y los wizards, conectada a readers canonicos de Sample Sprints, Commercial Health y cost attribution, preservando el mockup aprobado sin mezclar datos reales con placeholders silenciosos.

## Why This Task Exists

TASK-809 conecto la UI real y los wizards, pero la capa visual todavia traduce datos reales a un view model con derivaciones locales: `progressPct` fijo por estado, `actualClp = 0`, equipo mostrado como placeholder del cliente, señales calculadas en el cliente y capacity risk inferido desde disponibilidad mockeada. Eso fue aceptable para cerrar la primera surface, pero ahora es deuda de robustez: puede mostrar salud, costo, progreso o aprobacion de forma distinta a los helpers canonicos que gobiernan backend, Ops Health y audit.

La causa raiz no es copy ni estilo: falta una proyeccion runtime canonica para la experiencia de Sample Sprints. Sin esa capa, cualquier mejora visual futura seguira duplicando reglas en React y aumentara el riesgo de drift.

## Goal

- Crear una proyeccion server-side canonica para el view model de Sample Sprints runtime.
- Sustituir heuristicas client-side por datos derivados desde primitives existentes.
- Alinear señales de la surface con Commercial Health, preservando descripciones operables para la UI.
- Mostrar equipo/capacidad/progreso/costo real con degraded states honestos cuando falte dato.
- Mantener la experiencia visual aprobada de `/agency/sample-sprints/mockup` sin volver a una UI paralela.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_PILOT_ENGAGEMENT_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_COST_ATTRIBUTION_V1.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/ui/GREENHOUSE_UI_ORCHESTRATION_V1.md`
- `DESIGN.md`

Reglas obligatorias:

- Un Sample Sprint sigue siendo `greenhouse_core.services.engagement_kind != 'regular'`; no crear tabla `sample_sprints`.
- No duplicar reglas de Commercial Health en componentes React cuando exista reader canonico en `src/lib/commercial/sample-sprints/health.ts` o `src/lib/reliability/queries/engagement-*.ts`.
- No computar costos reales desde JSX; usar `greenhouse_serving.commercial_cost_attribution_v2` mediante helper server-side.
- No hardcodear copy reutilizable en componentes; usar `src/lib/copy/agency.ts` o crear entrada canonica si falta.
- Preservar el shell visual aprobado y el guardrail anti-import mockup runtime (`greenhouse/no-runtime-mockup-import`).
- Access model no cambia salvo que Discovery demuestre un gap: `views` = `gestion.sample_sprints`; entitlements = `commercial.engagement.*`; startup policy y routeGroups sin cambios por defecto.

## Normative Docs

- `docs/documentation/comercial/sample-sprints.md`
- `docs/manual-de-uso/comercial/sample-sprints.md`
- `docs/operations/runbooks/engagement-zombie-handling.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/tasks/complete/TASK-809-sample-sprints-ui-wizards.md`
- `docs/tasks/complete/TASK-807-commercial-health-reliability-subsystem.md`
- `docs/tasks/complete/TASK-815-direct-service-expense-allocation-primitive.md`

## Dependencies & Impact

### Depends on

- `TASK-801` a `TASK-810` completos.
- `TASK-815` para costos directos anclados a service cuando existan.
- `src/lib/commercial/sample-sprints/store.ts`
- `src/lib/commercial/sample-sprints/approvals.ts`
- `src/lib/commercial/sample-sprints/progress-recorder.ts`
- `src/lib/commercial/sample-sprints/outcomes.ts`
- `src/lib/commercial/sample-sprints/health.ts`
- `src/views/greenhouse/agency/sample-sprints/SampleSprintsWorkspace.tsx`
- `src/views/greenhouse/agency/sample-sprints/SampleSprintsExperienceView.tsx`
- `src/app/api/agency/sample-sprints/*`

### Blocks / Impacts

- Mejora la confiabilidad visible de `/agency/sample-sprints`.
- Reduce drift entre `/agency/sample-sprints`, `/admin/ops-health` y helpers backend.
- Habilita futuras visual regression/E2E con datos deterministas sin depender de placeholders.

### Files owned

- `src/lib/commercial/sample-sprints/store.ts`
- `src/lib/commercial/sample-sprints/health.ts`
- `src/lib/commercial/sample-sprints/runtime-projection.ts` (nuevo, si Discovery confirma nombre)
- `src/app/api/agency/sample-sprints/route.ts`
- `src/app/api/agency/sample-sprints/[serviceId]/route.ts`
- `src/views/greenhouse/agency/sample-sprints/SampleSprintsWorkspace.tsx`
- `src/views/greenhouse/agency/sample-sprints/SampleSprintsExperienceView.tsx`
- `src/views/greenhouse/agency/sample-sprints/SampleSprintsExperienceView.test.tsx`
- `src/lib/copy/agency.ts`
- `docs/documentation/comercial/sample-sprints.md`
- `docs/manual-de-uso/comercial/sample-sprints.md`

## Current Repo State

### Already exists

- Runtime real `/agency/sample-sprints` y rutas hijas `new`, `[serviceId]`, `approve`, `progress`, `outcome`.
- API list/detail/mutations bajo `src/app/api/agency/sample-sprints/**`.
- Store server-side que lista y declara Sample Sprints usando `services`, `engagement_approvals`, `engagement_progress_snapshots`, `engagement_outcomes` y audit log.
- Helpers canonicos para approval, progress, outcome, conversion, audit/outbox, eligibility y Commercial Health.
- UI runtime reutiliza el shell visual aprobado en `SampleSprintsExperienceView`.

### Gap

- `SampleSprintsWorkspace` deriva `progressPct`, `actualClp`, `team`, `signal` y health cards localmente.
- El command center no consume una proyeccion server-side única; cada pieza interpreta estado parcial.
- `actualClp` aparece como `0` aunque `commercial_cost_attribution_v2` ya puede agrupar costos por `service_id`.
- La tabla de approval muestra equipo/capacidad desde un placeholder visual, no desde `proposedTeam` + capacity checker real.
- Las señales visibles del workspace son parecidas, pero no identicas, a Commercial Health: falta source-of-truth explicito y degraded state si los readers fallan.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Server-side runtime projection

- Crear una primitive server-only para construir el view model runtime de Sample Sprints desde datos canonicos.
- Reutilizar `listSampleSprints`, `getSampleSprintDetail`, `getApprovalForService`, `listSnapshotsForService`, `getOutcomeForService` y readers de cost attribution en vez de duplicar SQL en componentes.
- Definir tipos explicitos para:
  - item resumido del command center
  - detalle de selected sprint
  - health/signal summary
  - degraded reasons cuando un reader falla
- Mantener compat API para consumers actuales o versionar el payload de forma backward-compatible.

### Slice 2 — Real metrics: progress, cost and conversion

- Reemplazar `progressPct` heuristico por regla canonica:
  - si hay outcome terminal, `100`
  - si el ultimo snapshot trae `deliveryProgressPct` valido, usarlo
  - si falta snapshot, mostrar estado `sin progreso registrado`, no porcentaje inventado
- Poblar `actualClp` desde `greenhouse_serving.commercial_cost_attribution_v2` agrupado por `service_id` y lanes con `attribution_intent IN ('pilot','trial','poc','discovery')`.
- Exponer `budgetUsagePct` server-side para UI, con manejo de division por cero.
- Recalcular conversion rate desde outcomes reales del payload o desde reader canonico; no mantener tasa hardcodeada en el componente runtime.

### Slice 3 — Team and capacity projection

- Mostrar equipo desde `commitment_terms_json.proposedTeam` enriquecido con `members.display_name` y `role_title`.
- Para approval, usar capacity checker real cuando el Sprint tenga fechas/equipo suficiente.
- Si no hay equipo propuesto o no se puede calcular capacidad, mostrar degraded/empty state honesto en vez de avatar placeholder del cliente.
- Evitar que `hasCapacityRisk` en UI dependa de disponibilidad mockeada.

### Slice 4 — Commercial Health alignment

- Reconciliar las señales del command center con `src/lib/commercial/sample-sprints/health.ts` y `src/lib/reliability/queries/engagement-*.ts`.
- Decidir en Discovery si la surface consume:
  - conteos globales de Commercial Health, o
  - conteos scoped por tenant/space via nueva variant del helper.
- Si se requiere scope por tenant, agregarlo al helper server-side sin romper `/admin/ops-health`.
- Agregar degraded state visible cuando los readers fallen, con copy canonico y sin ocultar error operacional.

### Slice 5 — UI adoption and copy hygiene

- Reducir `SampleSprintsWorkspace` a loader + render del payload proyectado; remover reglas de negocio client-side.
- Mantener `SampleSprintsExperienceView` como shell visual, pero mover labels reutilizables a `src/lib/copy/agency.ts`.
- Revisar empty/loading/error/degraded states para command, approval, progress y outcome.
- Asegurar que tabs internas y rutas directas (`/new`, `/[serviceId]/approve`, `/progress`, `/outcome`) renderizan datos coherentes despues de mutaciones.

### Slice 6 — Tests and verification fixtures

- Agregar tests unitarios para la proyeccion runtime.
- Agregar/actualizar tests de `SampleSprintsExperienceView` para:
  - costo real distinto de cero
  - sprint sin snapshots muestra estado honesto
  - equipo propuesto real aparece en approval
  - degraded health no se renderiza como estable
- Agregar test focal para que el API list/detail exponga payload compatible.
- Ejecutar smoke manual o Playwright sobre `/agency/sample-sprints` si hay sesión local/staging disponible.

## Out of Scope

- No crear nuevas tablas Sample Sprints.
- No cambiar el state machine de `engagement_approvals`.
- No automatizar emails o notificaciones cliente V2.
- No escribir a HubSpot al declarar o cerrar Sample Sprints.
- No rediseñar visualmente el mockup aprobado salvo ajustes mínimos necesarios para estados degraded/empty.
- No cambiar routeGroups, startup policy ni el access model base salvo hallazgo bloqueante en Discovery.

## Detailed Spec

La proyeccion debe vivir server-side y ser la unica capa que traduzca datos de dominio a los campos que la UI necesita. Nombre sugerido: `src/lib/commercial/sample-sprints/runtime-projection.ts`, pero el agente debe confirmar si conviene integrarlo dentro de `store.ts` o separarlo.

Shape minimo esperado:

```ts
type SampleSprintRuntimeProjection = {
  items: SampleSprintRuntimeItem[]
  selected: SampleSprintRuntimeDetail | null
  signals: SampleSprintRuntimeSignal[]
  options?: SampleSprintOptions
  degraded: Array<{
    code: string
    message: string
    source: 'cost_attribution' | 'commercial_health' | 'capacity' | 'progress'
  }>
}
```

Reglas de derivacion:

- `actualClp`: sumar `amount_clp` desde `greenhouse_serving.commercial_cost_attribution_v2` por `service_id`; si falla, no usar `0` silencioso.
- `progressPct`: usar `latestSnapshots[0].metrics.deliveryProgressPct` si es numero `0..100`; si no existe, `null` y UI muestra sin snapshot.
- `team`: resolver `proposedTeam.memberId` contra `greenhouse_core.members`; si no resuelve, mantener memberId con warning/degraded menor.
- `health`: no inventar codigos nuevos si existe equivalente `commercial.engagement.*`.

La API puede exponer esta proyeccion en el payload existente para evitar endpoint nuevo. Si el payload crece mucho, se permite endpoint read-only nuevo bajo `/api/agency/sample-sprints/runtime`, protegido por `commercial.engagement.read`, siempre que no duplique write paths.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `/agency/sample-sprints` ya no depende de heuristicas client-side para `progressPct`, `actualClp`, team/capacity ni health signals.
- [ ] Existe una primitive server-side reusable para construir el payload runtime de la surface.
- [ ] Costo real por Sample Sprint viene de `commercial_cost_attribution_v2` o muestra degraded state; nunca se fuerza `0` como placeholder silencioso.
- [ ] Progreso viene de snapshots reales o muestra estado honesto de ausencia de snapshot.
- [ ] Approval muestra equipo propuesto real y capacity risk calculado por helper canonico cuando hay datos suficientes.
- [ ] Señales visibles quedan alineadas con Commercial Health o documentan explicitamente su scope tenant/space.
- [ ] Copy reusable nuevo vive en `src/lib/copy/agency.ts`.
- [ ] Tests focales cubren projection, UI states y API payload.

## Verification

- `pnpm exec tsc --noEmit --pretty false`
- `pnpm lint`
- `pnpm test src/views/greenhouse/agency/sample-sprints/SampleSprintsExperienceView.test.tsx`
- `pnpm test src/lib/commercial/sample-sprints`
- `pnpm design:lint`
- Smoke manual o Playwright autenticado en `/agency/sample-sprints`, `/agency/sample-sprints/new`, `/agency/sample-sprints/[serviceId]/approve`, `/progress`, `/outcome` cuando haya dataset/sesion disponible.

## Closing Protocol

Cerrar una task es obligatorio y forma parte de Definition of Done. Si la implementacion termino pero estos items no se ejecutaron, la task sigue abierta.

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] `docs/documentation/comercial/sample-sprints.md` y `docs/manual-de-uso/comercial/sample-sprints.md` quedaron sincronizados si cambia el comportamiento visible
- [ ] se ejecuto chequeo de impacto cruzado sobre `TASK-807`, `TASK-809`, `TASK-810` y `TASK-815`

## Follow-ups

- Crear fixture E2E dedicada que declare, apruebe, registre progreso y cierre un Sample Sprint con cleanup transaccional si esta task descubre que falta dataset estable.
- Evaluar reporte final auto-generado V2 desde snapshots + outcome metrics; fuera de alcance de este hardening.

## Delta 2026-05-08

Task creada desde revision de runtime solicitada por el usuario. Gap principal observado: la foundation backend esta completa, pero la surface todavia mezcla payload real con derivaciones locales para progress/cost/team/health; esta task documenta el hardening para hacerlo mas robusto, seguro, resiliente y escalable.
