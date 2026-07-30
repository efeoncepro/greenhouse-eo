# Wireframe — TASK-1611 Talent Assurance Operator Cockpit

Estado: discovery only · no JSX aprobado.

## Intent

Una superficie interna para responder, con evidencia, tres preguntas: qué está verificado, qué riesgo
requiere atención y cuál es la siguiente acción humana. No existe un score único que sustituya el juicio.

## Desktop

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Talent Assurance · filtros: rol · cuenta · etapa · freshness         │
├───────────────┬──────────────────────────────┬───────────────────────┤
│ Casos          │ Estado del caso              │ Acción / propuesta    │
│ - abiertos     │ claim / evidencia / riesgo   │ diff exacto            │
│ - stale        │ lineage + owner + freshness  │ confirmar / abstener   │
│ - continuity   │ quality gate + outcomes      │ escalar + receipt      │
├───────────────┴──────────────────────────────┴───────────────────────┤
│ Timeline auditable: fuente · versión · cambio · actor · expiración    │
└──────────────────────────────────────────────────────────────────────┘
```

## Required states

Default, loading, empty, error, degraded, denied, stale evidence, long evidence, keyboard/focus and
reduced-motion. Every claim must be visibly distinguishable from inference and recommendation.

## Boundaries

- Internal operator surface only; no client or collaborator self-service in this task.
- Reuse Application 360, Talent Ops Dashboard, evidence rail, status and proposal-review primitives.
- Data arrives through TASK-1610 readers; no raw database access or business rules in the UI.
- Route, exact composition and visual tokens remain subject to design checkpoint before implementation.

## Approval gate

Approve this wireframe and its access matrix before JSX. Then produce a GVC scenario for desktop and 390px,
keyboard, reduced motion, scope denial and `scrollWidth === clientWidth`.
