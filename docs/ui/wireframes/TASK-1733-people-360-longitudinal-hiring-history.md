# TASK-1733 — Wireframe · historia Hiring longitudinal en People 360

## Product-design source

- Direction: `docs/ui/visual-directions/TASK-1733-people-360-longitudinal-hiring-history.md`.
- Recipe: list-detail dentro del People 360 shell existente.
- Primitive decision: reuse timeline + AdaptiveSidecar si corresponde.

## Desktop first fold

```text
People 360 · Persona
[Resumen] [HR] [Asignaciones] …

Trayectoria de selección                         [Tipo ▾] [Periodo ▾]
│
● Postulación · Diseñador/a UX            2026-08
│ En evaluación · última comunicación …        [Ver detalle]
│
● Postulación · Account Manager            2026-03
│ Proceso cerrado
│
● Handoff aprobado                          2025-11
│
● Activación como colaborador               2025-11

                                    ┌ Detail contextual de la selección ┐
                                    │ evidencia permitida + deep link   │
                                    └────────────────────────────────────┘
```

## Mobile · 390 px

La lista ocupa todo el ancho. Al abrir un evento, el detalle usa el patrón responsive canónico y vuelve al mismo
evento/foco. Filtros se reducen a un control compacto sin truncar el valor activo.

## State/copy/accessibility inventory

- Candidate-only: timeline válido sin placeholder de member.
- Multiple apps: cada entry muestra rol, fecha y status allowlisted.
- Empty real: “Aún no hay eventos de selección asociados”.
- Error/degraded: explicación + Reintentar; no mostrar empty.
- Denied detail: el evento puede conservar metadata allowlisted sin confirmar documento restringido.
- Keyboard: seleccionar, cerrar detail, restore; timeline tiene estructura semántica.

## Implementation Mapping

- Surface: tab HR de People 360.
- Reader: TASK-1732; exact application deep link/packet según capabilities existentes.
- Primitives: timeline, state surfaces, filters, AdaptiveSidecar; confirmar exports reales.
- Copy: `src/lib/copy/*`.
- No commands: UI read-only.

## GVC Scenario Plan

- Scenario: `task-1733-people-360-journey`; premium 1440×1000 y 390×844.
- Capturas: candidate-only, multi-app+member, selected detail, denied document, error/degraded, mobile detail.
- Assertions: application exacta, no raw notes/scores, focus restore, active tab visible, no overflow.
- Dossier: `docs/ui/reviews/TASK-1733-people-360-longitudinal-hiring-history/`.

## Design Decision Log

- Timeline/list-detail seleccionada por secuencia y pluralidad.
- Shell/tab existente se conserva; no agrega navegación global.
- Detail es contextual y reautoriza; no duplica Application 360.
- Mobile recompone a single plane.
