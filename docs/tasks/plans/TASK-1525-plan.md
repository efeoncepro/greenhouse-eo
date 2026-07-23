# Plan — TASK-1525 Globe Producer Live Generation Projection

## Discovery summary

- La causa raíz del feed roto es read-side incompleto: `requestGenerate()` recibe un run `running`, pero el
  controller sólo refresca `globe.producer.library.asset.list`; ese reader lista assets retenidos, no runs activos
  ni transiciones `completion_received/reconciling/terminal`.
- Autoridades existentes confirmadas:
  - `../efeonce-globe/packages/contracts/src/governed-runs.ts` expone `globe.run.get|list|status` con
    `runId`, `experimentId`, `state`, `revision`, `coarseProgress`, `updatedAt`.
  - `../efeonce-globe/packages/contracts/src/asset-library.ts` expone
    `globe.producer.library.asset.list` para outputs retenidos.
  - `../efeonce-globe/packages/database/src/stores/experiment-store.ts` y
    `../efeonce-globe/packages/database/src/stores/asset-library-store.ts` ya leen experiments/assets sin exponer
    bytes, URLs ni provider refs.
- Discrepancias contra la spec:
  - `../efeonce-globe/apps/studio-web/src/producer-api.ts` no existe; el BFF/registry vive hoy en
    `../efeonce-globe/apps/studio-web/src/app.ts`.
  - El repo Globe tiene cambios locales ajenos en `apps/studio-web/src/app.ts`, `packages/contracts/src/index.ts`,
    `packages/domain/src/index.ts`, `packages/database/src/index.ts`, `package.json` y más. La ejecución debe usar
    archivos nuevos y wiring mínimo, con staging selectivo; no se debe absorber el trabajo de promoción/recovery.
- Estado UI relacionado, fuera de scope de esta task:
  - `producer-controller.ts` reconstruye todo el grid con `renderFeed(state.feed)`, usa una barra global
    `[data-capture="producer-state-generating"]`, y crea media tags sin `src`, generando el texto gigante
    “Vista previa de UUID”.
  - Esto pertenece a `TASK-1526`, que queda desbloqueada sólo cuando este reader exista.

## Access model

- `routeGroups`: no aplica.
- `views` / `authorizedViews`: no cambia.
- `entitlements`: no cambia desde Greenhouse; el reader reutiliza grants/capabilities existentes del Producer.
- `startup policy`: no cambia.
- Decisión: registrar un reader transport-neutral en el API Contract Spine con trusted context server-side. El
  workspace se deriva de la sesión/BFF; el browser nunca manda autoridad.

## Architecture decision

- ADR existente: `ADR-005 — Globe Producer Human Execution + Approved Product Target`.
- Delta requerido antes del contrato: agregar un delta fechado 2026-07-23 que establezca que el run activo es
  parte del feed durable, que sesión expirada se expresa como `reauth_required` en la experiencia consumidora, y
  que `permission_denied/not_found/dependency_unavailable` no se colapsan en “media faltante”.
- ADR nuevo: no requerido para `TASK-1525`; `ADR-008` cubre derivados/Range/GC y queda para `TASK-1528/1529`.
- Status requerido: delta aceptado en docs antes de cambiar el contrato runtime.

## Backend/data contract

- Nivel: `backend-critical`.
- Source of truth: `governed_runs + governed_run_attempts + experiments + producer library/asset state`.
- Contract surface nuevo:
  - `GLOBE_PRODUCER_LIVE_FEED_READERS.list = globe.producer.feed.live.list`
  - `GLOBE_PRODUCER_LIVE_FEED_READERS.changes = globe.producer.feed.live.changes`
  - `UnifiedProducerFeedItemV1 = active-run | terminal-run | retained-asset`.
- Invariantes:
  - `(workspaceId, runId, experimentId)` permanece estable durante el lifecycle.
  - Un asset retenido reemplaza visualmente su run completado; no duplica el candidato.
  - El cursor/revision de feed es monotónico por workspace mediante watermark server-side opaco, no reloj del
    navegador.
  - `displayTitle` se deriva de metadata client-safe de ruta/modelo/modalidad/fecha; nunca del prompt crudo.
  - El reader no invoca prepare/execute ni reserva créditos.
- Migración/backfill:
  - Postura inicial: sin migración; derivar con SQL/ports existentes.
  - Si el `EXPLAIN` o tests demuestran necesidad de índice/materialización, se detiene para delta de plan y
    checkpoint humano.
- Rollback:
  - Flag/coverage `GLOBE_PRODUCER_LIVE_FEED_ENABLED` default OFF o reader registrado fail-closed si la store no
    está cableada; UI vuelve a readers actuales.
- Errores:
  - `invalid_request`, `access_denied`, `not_found`, `dependency_unavailable`; sin raw provider errors.
  - `reauth_required` queda como semántica consumidora en `TASK-1526`, mapeada desde `authentication_required`.
- Evidencia requerida:
  - Tests de contrato/domain/database para cursor, dedupe run→asset, dos runs simultáneos y tenant isolation.
  - Typecheck/build de paquetes tocados.
  - Smoke runtime interno queda posterior al deploy/canary; no promueve rutas comerciales.

## Skills

- `greenhouse-task-execution-hook`: ownership, goal, checkpoint humano.
- `greenhouse-globe`: boundary Globe/Greenhouse, Full API Parity, no provider/secret leaks.
- `software-architect-2026`: ADR/boundary modular y causa raíz.
- `greenhouse-documentation-governor`: plan/handoff/docs de cierre.

## Subagent strategy

- `sequential`.
- Motivo: el hook de `TASK-1525` reportó `Subagents authorized: no`; además hay solape de archivos sucios en Globe,
  así que paralelizar código aumentaría riesgo de pisar cambios ajenos.

## Execution order

1. Documentar delta 2026-07-23 en ADR-005 y actualizar índices sólo si el delta necesita referencia explícita.
2. Crear contrato `producer-live-feed` en `packages/contracts` con readers, queries, DTOs, cursor opaco y tests.
3. Crear dominio `producer-live-feed` en `packages/domain`:
   - parseo bounded de queries;
   - dedupe `run -> asset`;
   - `displayTitle` seguro;
   - coarse states;
   - registration con coverage y capability de lectura.
4. Crear store durable en `packages/database` con una lectura batch sobre autoridades existentes; sin SQL mutante.
5. Cablear `createStudioApp`/`main` con dependencia opcional y flag fail-closed; no tocar UI visible aún.
6. Ejecutar tests focales, `pnpm --filter` typecheck/build y, si el árbol lo permite, `pnpm check`.
7. Actualizar `Handoff.md`, `GLOBE_RUNTIME_HANDOFF.md` y la task con evidencia real y estado honesto.

## Files to create

- `../efeonce-globe/packages/contracts/src/producer-live-feed.ts`
- `../efeonce-globe/packages/contracts/src/producer-live-feed.test.ts`
- `../efeonce-globe/packages/domain/src/producer-live-feed.ts`
- `../efeonce-globe/packages/domain/src/producer-live-feed.test.ts`
- `../efeonce-globe/packages/database/src/stores/producer-live-feed-store.ts`
- `../efeonce-globe/packages/database/src/producer-live-feed-store.test.ts`

## Files to modify

- `docs/architecture/creative-studio/EFEONCE_GLOBE_PRODUCER_HUMAN_EXECUTION_DECISION_V1.md` — delta ADR-005.
- `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md` — estado real tras implementación/verificación.
- `docs/tasks/in-progress/TASK-1525-globe-producer-live-generation-projection.md` — plan/evidencia.
- `Handoff.md` — continuidad activa.
- `../efeonce-globe/packages/contracts/package.json` — export/script test focal.
- `../efeonce-globe/packages/contracts/src/index.ts` — export mínimo si se requiere por consumers existentes.
- `../efeonce-globe/packages/domain/package.json` — export/script test focal.
- `../efeonce-globe/packages/domain/src/index.ts` — export mínimo si se requiere por app.
- `../efeonce-globe/packages/database/src/index.ts` — export del store durable.
- `../efeonce-globe/apps/studio-web/src/app.ts` — registrar reader con dependencia opcional y flag.
- `../efeonce-globe/apps/studio-web/src/main.ts` — cablear store durable cuando hay Cloud SQL.

## Files to delete

- Ninguno.

## Risk flags

- Hay cambios locales ajenos en Globe sobre varios archivos que esta task debe tocar para wiring. Se mitigará con
  patches mínimos y revisión de diff antes de staging/commit. Si el solape impide aislar el cambio, se solicitará
  permiso explícito para worktree o se dejará bloqueado con evidencia.
- `pnpm check` puede fallar por cambios ajenos actuales; los errores preexistentes se registrarán y no se mezclarán
  con `TASK-1525`.
- No se despliega automáticamente hasta tener tests verdes y diff aislable.

## Open questions

- Ninguna de producto bloquea el plan. La decisión de UI exacta, skeletons/cards/viewer y comparación contra el
  Claude Design aprobado queda en `TASK-1526`.
