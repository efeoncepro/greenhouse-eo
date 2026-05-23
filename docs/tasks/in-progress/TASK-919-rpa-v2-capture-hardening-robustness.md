# TASK-919 — RpA V2 capture hardening (robustez prod + demo)

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Pausado 2026-05-21 — #3 (detección) + #4 (flag por-cliente) SHIPPED; auto-repair + #2 + #5 NO se ejecutan ahora (decisión operador). Retomar desde el auto-repair command.`
- Domain: `delivery|ico|integrations|reliability`
- Branch: `develop` (sesión 2026-05-21, implementación directa por instrucción del operador)
- Parent: `TASK-915 (umbrella RpA V2 cutover)`

## Summary

Endurecer el pipeline de captura RpA V2 (prod TASK-916 + demo TASK-913/914) para que sea **robusto para todo uso real** + **auto-detecte y repare el residual**. Cierra los techos de fragilidad identificados live 2026-05-21: muestreo (BUG-CLASS-003), off-by-one al inicio, flag global, escala writeback.

## Why This Task Exists

Tras activar Flip A (writeback prod), el demo live expuso que la captura es un **sistema de muestreo** (BUG-CLASS-003): transiciones más rápidas que la cadencia del cron (~5 min) o ida-y-vuelta dentro de un batch se colapsan (Notion no manda valores → re-fetch da solo estado actual; el dispatcher coalescia por página/batch). Aceptable para RpA (correcciones lentas) pero el operador requiere robustez explícita antes de escalar / antes del bono. Esta task cierra los gaps cerrables y agrega una red de reconciliación para el residual.

## Decisión de diseño (arch-architect + ICO, 2026-05-21)

**El límite de muestreo NO se elimina al 100%** dentro de webhook+re-fetch (Notion no expone property-history → estados nunca muestreados son irreconstruibles). Target honesto: **robusto para toda cadencia real de correcciones (segundos+ de diferencia) + detección/reparación del residual de drift.**

**#1 (lane dedicado 60s / de-coalescing del dispatcher) — SUPERSEDED por #3.** Análisis de implementación: el cron de 5 min YA captura una corrección simple bien (verificado live: demo espaciado → RpA=1). Un lane de 60s 5x-ea el procesamiento de TODAS las projections de delivery (costo/riesgo alto en infra compartida) y solo ayuda al caso raro "2+ transiciones en 5 min". La **reconciliación (#3)** es superior: detecta+repara drift comparando lo registrado vs el estado actual ya sincronizado en `greenhouse_delivery.tasks.task_status` (CERO llamadas extra a Notion), cubriendo el residual dominante. Por eso #1 se descarta a favor de #3.

## Scope (slices)

1. **#2 Baseline en `page.created`** — los handlers (`notion-status-transitions` prod + `notion-tasks-demo`) forward-ean `page.created` para que el consumer re-fetchee y registre el estado inicial (`Sin empezar → <estado creación>`). Garantiza que el `from` de la primera transición real sea correcto (cierra off-by-one). Tests anti-regresión.
2. **#4 Flag por-cliente** — `isNotionRpaWritebackEnabled(workspaceId?)` lee `NOTION_RPA_WRITEBACK_ENABLED_<EFEONCE|SKY>` con fallback al global `NOTION_RPA_WRITEBACK_ENABLED`. El writeback prod pasa el `workspace_id` del snapshot. Backward-compat: el global sigue funcionando. Cumple el stop-gate canónico ICO (flag per-cliente). Tests.
3. **#3 Reconciliación (signal + repair)** — reliability signal `notion.task_status_transitions.recorded_vs_current_drift` (delivery): cuenta tareas Efeonce/Sky donde `tasks.task_status` normalizado != último `to_status` registrado en `task_status_transitions`. Steady≈0 (capture al día). Sostenido >0 = captura perdiendo transiciones. + Repair primitive: registra la transición faltante (`last_to → current`, `source_quality='reconciled'`) para tareas drifteadas, idempotente, sin golpear Notion. Recupera el NET de transiciones perdidas (residual dominante). Tests.
4. **#5 Escala writeback — DIFERIDA con detección.** No se implementa Cloud Tasks ahora (volumen bajo). Se agrega nota + el signal `writeback_lag` existente cubre la detección si el rate-limit empieza a morder. Documentado como follow-up cuando emerja 10x o pre-bono.

## Out of Scope

- Eliminación 100% del residual de round-trip sub-cadencia (imposible — Notion no expone property-history). Cubierto por reconciliación (NET) + gate de paridad (bono).
- Flip B (bono usa V2) — sigue gated por paridad ≥95% + HR sign-off (TASK-917).

## Acceptance Criteria

- [x] **#4 Flag por-cliente** funcional + backward-compat global + tests (23 verde).
- [x] **#3 Signal `recorded_vs_current_drift`** wired (subsystem delivery) + steady≈0 + tests (7 verde). Gated en `source_updated_at > transitioned_at`.
- [ ] `pnpm test` (full) + tsc 0 + lint 0 + build ✓.
- [ ] Deploy ops-worker verde + signals steady.

## Delta 2026-05-21 — shipped #3 (detección) + #4; #2 + auto-repair + #5 diferidos (con rationale)

**Shipped V1.0 en `develop`**:

- **#4 Flag por-cliente**: override `NOTION_RPA_WRITEBACK_ENABLED_<EFEONCE|SKY>` gana sobre el global. Cumple stop-gate canónico ICO. Backward-compat total.
- **#3 Reconciliación DETECCIÓN**: signal `notion.task_status_transitions.recorded_vs_current_drift`. Compara último `to_status` registrado vs `tasks.task_status` (synced), gated en `source_updated_at > transitioned_at` (evita falso-positivo del sync stale 24h). CERO llamadas a Notion. Convierte el modo de falla silencioso (captura perdiendo transiciones) en observable.

**Diferido con rationale (signal-then-command canónico, patrón TASK-877/891)**:

- **#3 Auto-repair (fase 2)**: el comando que registra la transición faltante + recomputa RpA toca el write-path de RpA → no se apura. Diseño claro: para tareas drifteadas, INSERT transición (`source_quality='reconciled'`) + emit `notion.task.status_transitioned` → compute/writeback existentes recalculan. Próxima slice.
- **#2 Baseline `page.created`**: la suscripción es amplia y el payload de `page.created` no trae `data_source_id` → forward-ear todas las creaciones re-fetchearía CADA página nueva del workspace (mayoría no-Tareas) = desperdicio de rate-limit por un edge raro. Bajo ROI vs costo. Diferido.
- **#1 Lane 60s / de-coalescing**: superseded por #3. No se toca el dispatcher compartido.
- **#5 Cloud Tasks**: diferido; el signal `writeback_lag` (TASK-916) cubre la detección a 10x.

**Robustez resultante**: el pipeline ya era robusto para uso real (correcciones lentas). Esta task agrega kill-switch por-cliente (safety) + detección del residual de muestreo (observabilidad). Auto-repair + #2 quedan trackeadas.

## Rollback

Aditivo. Cada slice revertible por PR revert. Flags default preservan comportamiento previo. Reconciliación repair gated/conservador (solo registra transiciones reales observadas vía estado sincronizado).
