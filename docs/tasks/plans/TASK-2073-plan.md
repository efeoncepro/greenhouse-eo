# Plan — TASK-2073: comparación local del bridge operativo

## Discovery summary

Intake autorizado el 2026-10-27: formalizar ADR/primera task y ejecutar prototipo local sin producción ni historia
de Diseño. Es una unidad nueva; el pedido no referencia un TASK existente ni solicita un goal persistente.
P2/Medio se refiere al sandbox acotado, no a la criticidad del futuro cutover. Plan auto-aprobable y dentro del
alcance expresamente autorizado. La confirmación de registro del planner queda cubierta por ese pedido directo.

Discovery `4be89a9d4` contrastado con código del checkout. Los paths existen. TASK-195 cerró modelo conceptual;
1852 habilita servicio/persona; 1853/1854 son métricas/portal; 1960 informe por servicio y 2033 URLs. Ninguna posee
esta comparación del bridge. Registro/notas/filesystem: 2073 era siguiente libre (la mención al pie no era reserva).
WIP comercial ajeno se conserva. No se crean branches/worktrees/repositorios.

Causa raíz: consumers infieren un único contexto por client/org. La primitive futura necesita contexto autorizado
y routing explícito; dos nombres de cuenta no cambian esas inferencias. El sandbox modela ambas alternativas,
incluidos sus fallos, y mantiene owners productivos; no agrega otro framework de acceso o attribution.

## Access model

- `routeGroups`, views/authorizedViews y startup policy: sin cambios; no conceden datos de otra cuenta.
- Entitlements: sólo modelo sintético intersectado con membership/Space actual, sin tabla/seed nueva.
- Refresh conserva selección explícita; revocación se evalúa antes del cache y de leer/reintentar una edición.
- Consolidado org requiere permiso propio, no se infiere de dos memberships.

## Architecture decision

- ADR nuevo Proposed: `GREENHOUSE_OPERATIONAL_ACCOUNTS_UNDER_ORGANIZATION_DECISION_V1.md`.
- Puede avanzarse con prueba local reversible; no con contrato persistido o migración irreversible.
- A′/B se comparan sin puntajes de esfuerzo inventados. Recomendación no implica aceptación/rollout.

## Backend/data contract

Fixtures sintéticos y funciones puras; Node builtin únicamente. El runner lee sólo anchors locales declarados,
sin imports de `src`, `.env`, DB, SDKs ni red. Resultados por stdout; export explícito sólo a archivo local.
Una intención idempotente se sella por org/Space/Service, separada del mapping mutable. Finance compara
candidatos antes/después de normalizar owner. Historia se compara por digest sin cambiar hechos.

No hay migraciones/backfill/rollback externos ni outbox. Errores enumerados y datos ficticios. Concurrencia SQL,
latencia, autorización real, transacciones, driver/caches y sync desplegado quedan fuera de evidencia.

## Skills

- Slice 1: greenhouse-task-planner (registro), software-architect-2026 (ADR/alternativas).
- Slices 2–3: software-architect-2026 (assurance), greenhouse-documentation-governor (estado/continuidad).
- Task hook antes del código como preflight formal; sin flags develop/subagents no solicitados para esta unidad.

## Subagent strategy

`sequential`: el agente principal ejecuta sandbox y evaluación. Se reutiliza el discovery previo consolidado;
no se necesita nueva delegación para la unidad local ni se altera el trabajo de otros agentes.

## Execution order

1. ADR Proposed + task canónica + registro/índices + este plan; lint template y task hook.
2. Fixtures, núcleo puro, anchors legacy y runner local; pruebas allow/deny, drift y contraejemplos.
3. Comparación JSON reproducible, recomendación y gates, estado/criterios y Handoff.

## Files to create

- `scripts/experiments/operational-account-bridge/{fixtures,prototype,scenarios,source-anchors,evaluate,prototype.test}.mjs`
- ADR/task/plan y `docs/audits/client-portal/2026-10-27-sky-operational-bridge-prototype/{README.md,results.json}`.

## Files to modify

- Entradas propias en índices de tasks/decisiones y `Handoff.md`.
- Ningún archivo `src`, migration, provider, secret o dato productivo.

## Files to delete

Ninguno; sólo movimiento lifecycle de esta task al cumplir sus criterios.

## Risk flags

- A′ preserva filtros client-only, pero introduce owner Finance y command hijo; no existe alta real certificada.
- B requiere Space en todos los consumers client-only; todos los resultados deben señalar este costo.
- Incluso Space inactivo puede participar en Company→Space actual. No insertar fixtures en DB compartida.
- Probar simulación no prueba código desplegado. Anchors detectan cambios del código, no certifican semántica SQL.
- La secuencia real exige U01/U02/U02F antes de U03; rollback debe mantener writers compatibles.

## Open questions

Schema canónico del owner/rol de bridge, política definitiva de acceso consolidado, vigencias y stakeholders
reales se resuelven en aceptación/foundations; no bloquean el experimento sintético.
