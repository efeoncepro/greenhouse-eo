# TASK-1636 — Globe Deployable Promotion Bundle and Runtime Consumer Symmetry

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-028`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ops|globe|tooling`
- Blocked by: `TASK-1635`
- Branch: `Greenhouse develop; Globe main; sin worktrees`
- GitHub Issue: `optional`

## Summary

Un cambio verificado en el entorno de desarrollo de Globe (`TASK-1635`) todavía puede romperse al desplegarse,
porque Globe se despliega con **tres `workflow_dispatch` independientes** y desplegar dos y olvidar el tercero
no produce ninguna señal. Esta task cierra ese hueco: deriva los **consumidores runtime** de un slice —Studio,
API, producer worker, creative runner, asset governance, media derivatives, jobs, migraciones, flags,
env/secrets, IAM y observabilidad—, verifica su simetría antes y después del despliegue, y emite un reporte de
promoción legible por humano y por máquina.

No introduce un camino de despliegue nuevo ni una segunda noción de promoción: compone
`scripts/globe-runtime-drift.mjs`, `scripts/globe-migration-status.mjs` y la saga de ADR-009
(`scripts/production-promotion-cli.mjs`), que ya existen.

## Why This Task Exists

Caso fuente 2026-08-03, documentado en el propio `globe-runtime-drift.mjs`: la API y el worker avanzaron cuatro
SHAs mientras el Studio seguía en `0418a7d`. El desajuste resultó benigno, pero **nadie lo supo hasta que un
humano preguntó** si la UI se había probado. Misma clase de drift invisible que `ISSUE-126`.

`globe-runtime-drift.mjs` ya detecta la asimetría **después** de que ocurrió. Lo que falta es el derivador
**antes**: dado un cambio, qué consumidores runtime tiene y qué evidencia exige cada uno. Hoy esa lista vive en
la cabeza de quien despliega.

## Goal

- Derivar automáticamente los consumidores runtime de un slice y la evidencia que cada uno exige.
- Detener el despliegue si imagen, driver, secret accessor, worker, migración, flag o policy no es simétrica.
- Emitir un reporte de promoción machine-readable y humano, sin secretos.
- Ejecutar un lote real internal-only y documentar su estado honesto.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/README.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_ROUTE_PROMOTION_OPERATION_DECISION_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_COMMERCIAL_PROMOTION_ATTESTATION_DECISION_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_DURABLE_PERSISTENCE_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_ASSET_GOVERNANCE_WORKER_DECISION_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_MEDIA_DERIVATIVES_V1.md`
- `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md`
- `docs/operations/creative-studio/EFEONCE_GLOBE_IAC_RUNBOOK_V1.md`
- `docs/operations/RELEASE_CHANNELS_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- Globe sigue siendo un producto comercial; `internal-only` es estadio de rollout y no autoriza degradar
  seguridad, derechos, calidad ni arquitectura.
- El despliegue continúa sobre `main` mediante el workflow keyless y sus gates de SHA, imagen, revisión,
  tráfico y rollback. **No se agrega bypass** de GitHub, Cloud Build ni Cloud Run.
- El reporte de promoción es un **lector** sobre la saga de ADR-009: nunca declara promovida una ruta ni
  fabrica evidencia. Promoción ≠ entrega.
- La ruta, modelo, rate, rights policy y atestación son identidades gobernadas; esta task no crea una allowlist
  paralela.

## Normative Docs

- `docs/architecture/creative-studio/DECISIONS_INDEX.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md` (SPEC-001)
- `docs/operations/creative-studio/GLOBE_MODEL_FLEET_STATUS.md`
- `docs/operations/creative-studio/EPIC-028_WIP_SWEEP_2026-07-30.md`
- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-1635` — entorno de desarrollo y loop de generación real. Bloqueante: sólo se despliega lo que ya
  generó de verdad en desarrollo.
- `TASK-1527` — saga de promoción ADR-009 y `production-promotion-cli.mjs`; esta task **lee** sobre ella.
- `TASK-1504`, `TASK-1528`, `TASK-1552`, `TASK-1633` — dueñas de las capabilities cuyo despliegue se orquesta.

### Blocks / Impacts

- Impacta la preparación de canarios y evidencia de toda task de Globe que llegue a rollout.
- No cambia la autoridad de créditos, routing, rights, governance, identidad ni tenancy.

### Files owned

- `../efeonce-globe/scripts/**` para el derivador de consumidores y el reporte de promoción.
- `../efeonce-globe/package.json` para el entrypoint `globe:internal-verify`.
- `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md` para estado y límites al cierre.
- `docs/tasks/**` y `Handoff.md` para contrato, continuidad y cierre.
- No toca `apps/**` ni `packages/**` salvo para leer contratos ya exportados.

## Current Repo State

### Already exists

- `scripts/globe-runtime-drift.mjs` (`pnpm globe:runtime-drift`, `--expect <sha>`): compara la **revisión
  activa** de los tres runtimes resolviendo el digest del Job contra Artifact Registry. Compara lo que sirve
  tráfico, no lo que el workflow reportó verde.
- `scripts/production-promotion-cli.mjs` (TASK-1527 / ADR-009): saga completa como cliente delgado del spine.
- `scripts/globe-migration-status.mjs`, `scripts/globe-governed-run-diagnostic.mjs`,
  `scripts/smoke-private-api.mjs`, `scripts/smoke-human-federation.mjs`, `scripts/evidence/`.
- Workflows keyless de deploy para Studio/API, workers, asset governance y derivados.

### Gap

- No existe el **derivador**: dado un cambio, qué consumidores runtime tiene y qué evidencia exige cada uno.
  `globe-runtime-drift` detecta la asimetría después; falta la lista antes.
- No existe un entrypoint único que componga drift + migration status + saga en un reporte.
- No existe reporte de promoción machine-readable con commit/SHA, imagen/digest/revisión, correlation,
  governance y resultado de rollback.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `../efeonce-globe/scripts/**` y `../efeonce-globe/package.json`; documentación en Greenhouse.
- Future candidate home: `remain-shared`
- Nota: es tooling de operación del checkout de Globe; no crea workspace nuevo ni lo pre-autoriza.
- Boundary: consume contratos públicos y scripts existentes; no implementa commands, readers, policies, stores
  ni adapters alternativos.
- Server/browser split: enteramente server-side/CLI; nada entra al bundle del cliente.
- Build impact: agrega entrypoints de scripts; no agrega dependencia pesada ni cambia el bundle productivo.
- Extraction blocker: la verificación depende de la autoridad desplegada de Globe (Cloud Run, Artifact
  Registry, Cloud SQL, IAM); no puede declarar evidencia live sin ella.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: los runtimes desplegados y la saga de ADR-009; no se crea un ledger paralelo.
- Consumidores afectados: operador humano, workflows keyless, Cloud Build/Cloud Run.
- Runtime target: `internal-only`, `worker`, `production verification`.

### Contract surface

- Contrato existente a respetar: `scripts/globe-runtime-drift.mjs`, `scripts/production-promotion-cli.mjs`,
  `scripts/globe-migration-status.mjs`, `.github/workflows/deploy-*.yml`.
- Contrato nuevo o modificado: comando `globe:internal-verify` y el shape del reporte de promoción.
- Backward compatibility: `gated`; producción conserva sus workflows y flags.
- Full API parity: `N/A — no introduce capability de negocio`; sólo compone primitives existentes.

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna migración nueva. Cuando una capability dependiente exija una
  migración existente, el reporte debe nombrarla y su verify correspondiente.
- Invariantes que no se pueden romper:
  - el reporte **lee**, nunca promueve ni fabrica evidencia;
  - la verificación compara la **revisión activa**, no el resultado del workflow;
  - cualquier config/flag/secreto usado por un consumidor se verifica **en ese consumidor**;
  - un mismatch detiene el proceso; nunca se continúa "porque probablemente esté bien".
- Tenant/space boundary: workspace interno y la identidad/capability que ya gobierna Globe.
- Idempotency/concurrency: el reporte es de sólo lectura y repetible sin efecto.
- Audit/outbox/history: usa audit, outbox, run/attempt y señales canónicas del runtime real.

### Migration, backfill and rollout

- Migration posture: `none`. Las migraciones existentes se ejecutan por el procedimiento del runtime consumidor.
- Default state: comando opt-in; flags de producción sin cambios.
- Backfill plan: `N/A — no backfill`.
- Rollback path: baseline de rollback del workflow y reversión de flags/configuración según runbook; nunca
  limpiar SQL a mano.
- External coordination: Cloud Build, Cloud Run services/jobs, Cloud SQL migrations, Secret Manager accessors,
  IAM y canarios requieren coordinación y evidencia explícita.

### Security and access

- Auth/access gate: ADC con impersonación del service account autorizado; nunca tokens crudos ni
  service-account JSON en `.env` o logs.
- Sensitive data posture: el reporte no contiene secretos, URLs firmadas ni bytes privados.
- Error contract: códigos curados y reportes sanitizados; no mensajes upstream, cuerpos, stacks ni tokens.
- Abuse/rate-limit posture: sólo lectura; el despliegue conserva sus gates existentes.

### Runtime evidence

- Local checks: `pnpm check` en Globe; suites focales de los scripts nuevos.
- DB/runtime checks: `globe-migration-status` contra el runtime requerido; readbacks sin SQL manual.
- Integration checks: `globe-runtime-drift --expect <sha>` post-deploy; canario humano desde Producer
  autenticado.
- Reliability signals/logs: señales y códigos existentes de Globe; el reporte conserva correlation, route,
  workspace, run/attempt, idempotency y estado, sin secretos.
- Production verification sequence: ver Zone 4.

### Acceptance criteria additions

- [ ] Source of truth, contratos consumidos y consumidores runtime están nombrados con paths reales.
- [ ] La task no introduce migración, ledger, auth, provider adapter ni policy paralela.
- [ ] El reporte identifica cada consumidor runtime y su evidencia, o declara por qué no aplica.
- [ ] No se imprimen secretos, tokens, cuerpos upstream, URLs firmadas ni errores raw.

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

### Slice 1 — Derivador de consumidores runtime

- Dado un rango de commits o un conjunto de paths, derivar qué consumidores runtime toca: Studio, API,
  producer worker, creative runner, asset governance, media derivatives, jobs, migraciones, flags,
  env/secrets, IAM y observabilidad.
- La derivación sale del grafo real del monorepo (workspaces y sus dependencias), **no de una lista literal**
  mantenida a mano: un paquete nuevo entra a la derivación sin editar el script (regla R2).
- Declarar por consumidor qué evidencia exige y cuál es su comando de verificación.

### Slice 2 — `globe:internal-verify`

- Entrypoint único que compone lo existente: `globe-runtime-drift.mjs` para simetría de revisión activa,
  `globe-migration-status.mjs` para schema, y los readers de la saga de ADR-009 para promoción.
- Detenerse ante cualquier mismatch de imagen, driver, secret accessor, worker, migración, flag o policy.
- **No reimplementa** ninguna de esas comparaciones.

### Slice 3 — Reporte de promoción

- Machine-readable y humano. Incluye commit/SHA, modalidad, routeId, workspace, environment, correlation,
  run/attempt, idempotency, imagen/digest/revisión, evidencia de governance y resultado de rollback.
- Sin secretos, sin URLs firmadas, sin bytes privados innecesarios.
- Es un **lector** sobre la saga de ADR-009, nunca una segunda noción de promoción.

### Slice 4 — Lote real internal-only y documentación

- Ejecutar un lote real internal-only con canarios autenticados y readbacks.
- Documentar qué quedó `complete`, `code complete, rollout pendiente` u `operativamente bloqueado`.
- Actualizar runbook técnico, `GLOBE_RUNTIME_HANDOFF.md` y Greenhouse `Handoff.md`.

## Out of Scope

- Crear el entorno de desarrollo ni el loop local — eso es `TASK-1635`.
- Sustituir Cloud Run, Cloud SQL, GCS, Secret Manager, IAM, Cloud Build o el release control plane.
- Promover modelos, alterar atestaciones/rights o habilitar clientes externos.
- Autorizar un `tofu apply`, un cambio de IAM o un flip externo automáticamente.
- Declarar readiness comercial/externa.

## Detailed Spec

El comando debe distinguir dos preguntas que hoy se confunden:

```text
¿el pipeline terminó?      → lo responde el workflow, y no basta
¿qué está sirviendo?       → lo responde la revisión activa, y es lo único que cuenta
```

`globe-runtime-drift.mjs` ya eligió la segunda, y esa elección se conserva verbatim: un deploy en verde prueba
que el pipeline terminó, no que el tráfico esté servido por esa imagen.

**Invariantes:**

1. **Composición, no reimplementación.** Cada verificación invoca el script que ya la hace. Un `globe:internal-verify`
   que reimplemente la comparación de revisiones es un defecto de diseño, no una decisión de alcance.
2. **La lista de consumidores se deriva del grafo del monorepo**, nunca de un literal mantenido a mano
   (regla R2): un paquete o app nuevo entra a la derivación solo, y un consumidor que deja de existir sale.
3. **El reporte lee; no promueve.** Toda su evidencia proviene de readers gobernados.
4. **Un mismatch detiene.** No hay modo "continuar igual"; si hace falta, es una decisión humana registrada
   fuera del comando.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 MUST precede Slice 2: sin derivador no hay nada que verificar.
- Slice 2 MUST precede Slice 3: el reporte informa lo que la verificación midió.
- Slice 4 MUST verify every runtime consumer before any flag flip or migration apply.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---:|---|---|
| API despliega sin worker/secret/config compatible | Cloud Run/worker | medium | derivador de consumidores + simetría verificada antes y después | route binding/driver/secret accessor mismatch |
| El derivador se queda corto y omite un consumidor nuevo | tooling | medium | derivación desde el grafo del monorepo, no lista literal; test de cobertura | consumidor desplegado que el reporte no nombra |
| El reporte se toma como evidencia de promoción | governance | low | el reporte es lector; promoción ≠ entrega, declarado en el propio output | una ruta declarada disponible sin saga de ADR-009 |
| Un mismatch se ignora "porque probablemente esté bien" | proceso | medium | el comando se detiene; continuar exige decisión humana registrada | despliegue con drift conocido |

### Feature flags / cutover

- `globe:internal-verify` es opt-in por comando y no cambia flags productivos.
- El rollout de código/flags/migraciones/secrets sigue los workflows y runbooks existentes.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---:|---|
| 1 | revertir el script; nada del runtime cambia | <5 min | sí |
| 2 | revertir el entrypoint; los scripts existentes siguen usables por separado | <5 min | sí |
| 3 | revertir el reporte; la evidencia sigue disponible en sus readers | <5 min | sí |
| 4 | baseline de rollback del workflow, revertir flags/config y restaurar revisión; migrations sólo con rollback aprobado por su task dueña | <30 min inicial | parcial, según consumidor |

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

### Production verification sequence

1. Verificar que el cambio ya generó de verdad en el entorno de desarrollo (`TASK-1635`).
2. Derivar la lista de consumidores runtime del slice.
3. Verificar imagen/digest/config/secret/IAM/worker/migration por consumidor.
4. Construir y desplegar desde `main` mediante los workflows keyless que correspondan.
5. Verificar SHA, digest, revisión Ready, tráfico, flags, migrations, secrets, accessors y señales.
6. Ejecutar `globe-runtime-drift --expect <sha>` y exigir simetría de los tres runtimes.
7. Ejecutar canario humano desde Producer autenticado para cada modalidad/ruta exigida.
8. Ejecutar readback/recovery y confirmar que no hay segundo submit, attempt, settlement ni cobro.
9. Documentar evidencia, rollback disponible y estado honesto; detenerse ante cualquier mismatch.

### Out-of-band coordination required

- Secret Manager/IAM/accessors y configuración por cada consumidor runtime.
- Cloud SQL migrations, GCS buckets, Cloud Run services/jobs, Cloud Build y workflows de promoción.
- Revisión Legal/rights cuando una ruta nueva requiera atestación o policy distinta.

## Acceptance Criteria

- [ ] `globe:internal-verify` existe, está documentado y compone `globe-runtime-drift`,
  `globe-migration-status` y los readers de la saga de ADR-009 **sin reimplementar** ninguno.
- [ ] El derivador lista los consumidores runtime de un slice desde el grafo del monorepo; un workspace nuevo
  entra a la derivación sin editar el script, probado con un caso.
- [ ] El comando se **detiene** ante mismatch de imagen, driver, secret accessor, worker, migración, flag o
  policy; se prueba rojo.
- [ ] El reporte de promoción es machine-readable y humano, incluye commit/SHA, imagen/digest/revisión,
  correlation, run/attempt, governance y resultado de rollback, y no contiene secretos ni URLs firmadas.
- [ ] El reporte declara explícitamente que **lee** y no promueve; ninguna ruta queda declarada disponible por
  su output.
- [ ] Se ejecutó un lote real internal-only con canarios autenticados y readbacks, con estado honesto
  documentado; no se declara readiness comercial/externa.
- [ ] El deploy real usa el SHA exacto de `main`, con imagen/digest/revisión/tráfico verificados y baseline de
  rollback; no introduce bypass de GitHub, Cloud Build o Cloud Run.
- [ ] `pnpm task:lint --task TASK-1636`, `pnpm ops:lint --changed` y los gates proporcionales de Globe pasan.
- [ ] `Handoff.md`, `GLOBE_RUNTIME_HANDOFF.md`, README de tasks y evidencia técnica quedan sincronizados.

## Verification

- `pnpm task:lint --task TASK-1636`
- `pnpm ops:lint --changed`
- En Globe: `pnpm check`, `pnpm build`, suites focales de los scripts nuevos.
- `pnpm globe:internal-verify` sobre un slice real.
- `pnpm globe:runtime-drift --expect <sha>` post-deploy con los tres runtimes simétricos.
- Canario humano Producer + readback de run/attempt/output/credits/governance/feed/viewer.
- Verificación de rollback/revisión baseline proporcional al lote desplegado.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real.
- [ ] El archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`).
- [ ] `docs/tasks/README.md` quedó sincronizado con el cierre.
- [ ] `Handoff.md` quedó actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes.
- [ ] `changelog.md` quedó actualizado si cambió comportamiento, estructura o protocolo visible.
- [ ] Se ejecutó chequeo de impacto cruzado sobre las tasks dueñas de Producer, fleet, lifecycle, governance,
  derivatives y deployment.

## Follow-ups

- Alcance por workspace en el claim de las colas (`governed-run-store`, `asset-governance-job-store`,
  `media-derivative-store`, `asset-library-store`, `credit-reservation-expiry-store`,
  `production-promotion-operation-store`), hoy sin filtro de `workspace_id`. Dejó de ser bloqueante al aislar
  el entorno de desarrollo por base propia (`TASK-1635`), pero sigue siendo higiene pendiente.
- Convertir `WorkspaceKindV1` de union type a array `as const` + test de cobertura (regla R1) y derivar la
  copia literal de `ConfigWorkspaceKindResolver` (regla R2).

## Open Questions

- ¿El derivador debe correr como gate en CI sobre cada PR de Globe, o sólo a demanda antes de un despliegue?
  Correrlo en CI da señal temprana pero exige acceso a la revisión activa desde el runner.
