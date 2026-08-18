# Plan — TASK-1743 Provisional Assessment AI Operator Experience

## Estado del plan

- Fecha: `2026-08-18`
- Mode: `standard`
- Checkpoint: `human` (`P0`, esfuerzo `Alto`)
- Branch: `develop`; checkout compartido, sin worktrees.
- Estado: `aprobado por el operador el 2026-08-18`; ejecución posterior al DTO de TASK-1742.

## Discovery summary

- `AssessmentAiRunWorkbench` de TASK-1738 ya resuelve cola de excepciones, muestra ciega, cobertura, confirm/cancel y anti-anchoring.
- Barras/radar actuales consumen score efectivo y no deben reutilizarse como si una proposal fuera confirmada.
- La causa del “pendiente” observado por el operador es ausencia de proyección provisional, no ausencia del motor ni necesidad de crear otro dashboard.
- Solución: extender el workbench con una franja provisional integrada, cobertura y desglose por competencia, manteniendo effective y provisional como autoridades visuales distintas.
- Dirección visual, wireframe, flow y motion contracts están versionados y pasan `task:lint` con `UI ready: yes`.

## Access model

- No cambia rutas, navegación, views ni startup policy.
- La page server existente conserva sesión/capability; el browser recibe solo `ProvisionalAssessmentAiProjection` allowlisted.
- Denied no renderiza score, rationale, confidence ni evidencia.

## Architecture decision

- Consume el delta ADR de TASK-1742; no requiere ADR UI adicional.
- Reuse/extend: `AssessmentAiRunWorkbench` + primitives existentes; no primitive, chart, dashboard ni destino nuevo.

## UI/UX decision

- Nivel: `ui-standard`; dirección `repo-native-benchmark`.
- Desktop 1440×1100 y mobile 390×844; ready/loading/empty/partial/error/denied/stale/effective.
- Provisional usa tono info/neutral y disclaimer inseparable; efectivo conserva su jerarquía.
- Copy estable en `src/lib/copy/hiring.ts`; sin animación de score ni motion esencial.
- GVC premium con assertions de anti-leak, foco, reduced motion, wrap y `scrollWidth === clientWidth`.

## Skills

- `greenhouse-ai-design-studio`: dirección y decisión de extensión.
- `greenhouse-product-ui-architect`: composición y primitive mapping.
- `greenhouse-portal-ui-implementer` + `greenhouse-vuexy-ui-expert`: implementación server/browser y base MUI/Vuexy.
- `greenhouse-ux-content-accessibility`: copy, estados, teclado y autoridad semántica.
- `greenhouse-browser-diagnostics`: GVC/capturas.
- `greenhouse-qa-release-auditor` + `greenhouse-documentation-governor`: cierre.

## Subagent strategy

Secuencial: el consumer comparte workbench, copy y escenarios con el contrato backend; evitar ediciones concurrentes en el checkout compartido.

## Execution order

1. Cargar skills UI y ejecutar gates de wireframe/flow/motion.
2. Añadir copy y summary provisional operator-only sobre el DTO de TASK-1742.
3. Añadir competencias, cobertura, evidencia y excepciones sin romper muestra ciega.
4. Completar estados responsive/accesibles y tests de candidate payload/DOM.
5. Capturar desktop/mobile, corregir scorecard premium y verificar coexistencia con score efectivo.
6. Desplegar junto a TASK-1742 y verificar la Application 360 exacta de Lucero.

## Risk flags

- Confundir propuesta con score confirmado por color, copy o posición.
- Mostrar rationale antes de que la muestra ciega sea calificada.
- Filtrar DTO interno al candidato o a cliente.
- Densidad/overflow con nueve competencias y evidencia larga.

## Checkpoint humano

El operador aprobó explícitamente la ejecución end-to-end. El resultado permanece exclusivamente interno y no habilita ranking, decisión, stage move, test assignment ni email.
