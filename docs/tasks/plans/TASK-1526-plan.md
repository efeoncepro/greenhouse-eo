# Plan — TASK-1526 Producer Resilient Feed and Viewer (acceptance correction)

## Discovery summary

- La task estaba en `complete`, pero su Detailed Spec y Acceptance Criteria ya exigían un mapa por identidad,
  patches por revisión y ausencia de subtree replacement.
- El runtime `efeonce-globe@eac1730` cumple card inline, watcher terminal, títulos client-safe, reauth y viewer
  Image/Video/Audio, pero `renderFeed()` todavía elimina el feed y crea todas las cards en refresh/filtro/search/
  sort/watcher.
- `releaseCardPreviewCache(retainedPreviewKeys(items))` calcula retención desde el resultado filtrado. Por eso
  una card oculta revoca su Blob URL y al volver aparece rota/alt-first mientras repite retrieval.
- Search dispara refresh por cada pulsación y el filtro depende del reader remoto; falta debounce, cancelación y
  protección contra respuestas stale.
- La animación `candidate-enter ... both` puede conservar `transform` y enmascarar el hover lift.
- Evidencia humana same-tab: Todas→Video convergió tarde (12→3); Video→Todas repuso una imagen ~2,2 s después y
  cambió su Blob URL.
- Dependencias satisfechas: TASK-1525 reader live, TASK-1519 BFF/session y TASK-1503 retrieval permanecen vivos.
- No hay cambio de schema/API/auth/source of truth. ADR-005 gobierna el target aprobado; ADR-008 conserva
  derivados/Range fuera de alcance. No se requiere ADR nuevo.

## Solution quality assessment

La causa raíz es un renderer imperativo de “replace-all” que mezcla cuatro responsabilidades: reconciliación de
DTOs, visibilidad por query, lifecycle de Blob URLs y selección. Se reemplaza por un reconciler keyed + cache
acotada + coordinador de consultas. No se oculta el problema con skeletons más largos, timeouts o precarga masiva.

## Access model

- `routeGroups`: sin cambio.
- `views` / `authorizedViews`: sin cambio.
- `entitlements`: sin cambio.
- `startup policy`: sin cambio.
- Sesión y capability siguen siendo autoridad server-side existente; el browser sólo conserva intención efímera.

## Architecture decision

- ADR existente: ADR-005 `EFEONCE_GLOBE_PRODUCER_HUMAN_EXECUTION_DECISION_V1`.
- ADR complementaria fuera de scope: ADR-008 media delivery/lifecycle.
- ADR nueva: no aplica; es corrección interna del consumer contra un contrato ya aceptado.

## UI/UX decision

- Nivel: `ui-standard`.
- Dirección: `source-led`, baseline aprobado TASK-1505.
- Primitive: `extend` de la candidate card local Globe; no se heredan primitives Greenhouse.
- Motion: CSS causal sobre nodos keyed; entrance sólo al crear, hover/focus equivalentes, reduced-motion directo.
- Native View Transitions: diferida hasta estabilizar keys, foco y playback.
- GVC: desktop + 390 px, red lenta, filtros/search/sort, viewer, teclado, reduced motion y scrollWidth.

## Skills

- Gobernanza y boundaries: `greenhouse-globe`, `software-architect-2026`.
- Dirección/contrato visual: `greenhouse-ai-design-studio`.
- Browser/runtime: `greenhouse-browser-diagnostics`.
- Cierre: `greenhouse-qa-release-auditor`, `greenhouse-documentation-governor`.

## Subagent strategy

`fork`, autorizado por el operador, con ownership sin solapamiento:

- Controller/tests: `producer-controller.ts` y su test focal; reconciler keyed, cache lifecycle y query coordinator.
- CSS/UI/tests: `producer-ui.ts` y test focal; hover/focus, entrance no persistente y reduced motion.
- Docs/evidence audit: sólo archivos Greenhouse después de integrar; no edita código Globe.
- Agente raíz: contratos compartidos, consolidación, commits, CI/deploy y smoke en el Chrome existente.

## Execution order

1. Reabrir y validar el contrato documental, commit y push Greenhouse.
2. Ejecutar el task hook con goal, `--develop --subagents`.
3. Baseline local del package Studio y repositorio Globe.
4. Implementar reconciler keyed y patch por revisión; mantener el mismo nodo al mover/filtrar.
5. Separar cache de previews del subconjunto visible y definir retiro/LRU.
6. Implementar filtro/orden local inmediato y search debounce + abort/supersession.
7. Corregir la frontera entrance/hover/focus/reduced-motion sin introducir Native View Transitions.
8. Consolidar tests de DOM (`isSameNode`), request count, Blob URL, stale query, foco y playback.
9. Ejecutar tests focales, `pnpm check`, `pnpm build` y gates de QA.
10. Commit/push Globe; desplegar sólo con CI verde.
11. Validar en la pestaña Chrome autenticada del CEO Image/Video/Audio, sin accionar descarga incidental.
12. Registrar evidencia, cerrar lifecycle únicamente si todos los criterios correctivos pasan y commit/push docs.

## Files to modify

- `../efeonce-globe/apps/studio-web/src/producer-controller.ts`
- `../efeonce-globe/apps/studio-web/src/producer-controller.test.ts` (o test focal real equivalente)
- `../efeonce-globe/apps/studio-web/src/producer-ui.ts`
- `../efeonce-globe/apps/studio-web/src/producer-ui.test.ts` (o test focal real equivalente)
- Task, flow, wireframe, motion, handoff/runtime handoff e índices Greenhouse.

## Files to create

- `docs/ui/motion/TASK-1526-globe-producer-resilient-feed-viewer-motion.md`
- Evidencia GVC/runtime bajo las ubicaciones canónicas si el helper la materializa.

## Files to delete

- Ninguno. El archivo de la task cambia de lifecycle mediante movimiento gobernado.

## Risk flags

- No revocar Blob URLs activas en filtros, pero tampoco retener bytes sin límite.
- No dejar que una respuesta de query anterior reemplace el feed vigente.
- No reiniciar audio/video o perder foco al parchear metadata.
- No convertir optimistic presence en autoridad ni reejecutar un command de gasto.
- No mezclar derivados/Range de TASK-1528 ni paridad funcional completa de TASK-1505.
- No declarar comercial completo: sólo tres rutas siguen promovidas/verificadas.

## Rollback

- Revertir el commit de reconciler y volver a `eac1730`; no toca DB, assets, runs, IAM ni secrets.
- Si el deploy canario degrada retrieval o playback, detener tráfico a la revisión nueva y restaurar Studio/API
  previas mediante el workflow/rollout gobernado.
- Los runs/assets creados por smoke se preservan; nunca se corrigen con SQL o borrado manual.

## Checkpoint

P0 + Alto requiere checkpoint humano. Aprobado por el operador el 2026-07-23 con:
“Vamos, primero documenta y luego ejecuta”.
