# TASK-1643 — Globe Producer Feed-to-Composer Action Continuity

## Source & Direction

- Direction mode: `source-led`.
- Source: [benchmark autenticado Higgsfield/Magnific](../../audits/competitive-ui/GLOBE_COMPETITIVE_BENCHMARK_HIGGSFIELD_MAGNIFIC_2026-08-05.md),
  [Producer feed existente](TASK-1559-globe-feed-viewer-client-port.md) y [composer existente](TASK-1552-globe-producer-composer-focused-creation.md).
- Intent versus literal: adoptar continuidad y affordances honestas; no copiar marcas, layouts ni claims de los
  competidores.
- Desktop target: feed con action rail contextual y composer como destino visible del handoff.
- Mobile target: action rail táctil compacta, foco y copy persistentes en 390 px.

## First Fold & Action Hierarchy

1. Asset/card y estado de retención/rights.
2. Acción primaria de continuidad: `Usar como referencia` o `Recrear`.
3. Acciones secundarias: `Favorito` y `Descargar` cuando el contrato las autoriza.
4. Resultado persistente en el composer/card; nunca un toast como única evidencia.

La composición conserva el feed y el composer actuales. No se introduce una página intermedia ni un muro nuevo.

## Visual Fidelity Mapping

| Señal competitiva | Traducción Globe | Token/primitive |
|---|---|---|
| Card accionable | action rail con estados reales | `CardAction`, `CapabilityButton` |
| Continuidad de intención | handoff al composer con contexto | `ProducerWorkspace`, `ProducerComposer` |
| Feedback inmediato | pending/success/error localizado | copy y status primitives existentes |
| Acción condicionada | disabled + razón, no control muerto | capability/action state existente |

## State, Copy & Accessibility Inventory

- States: available, pending, completed, disabled-reason, denied, degraded, command-failed, session-expired.
- Copy: sentence case, español neutral de Chile, sin prometer una operación no confirmada.
- Accessibility: labels explícitos, hit target táctil, keyboard, focus restore, announcements y reduced-motion
  equivalence.
- Data rule: el estado de rights, retención y disponibilidad proviene del payload gobernado; no se infiere del
  nombre del archivo o de la card.

## Implementation Mapping

- Feed route: `efeonce-globe/apps/studio-client/src/surfaces/producer/feed/ProducerFeedRoute.tsx`.
- Card actions: `ProducerFeed.tsx` y primitives de action rail existentes.
- Composer handoff: `apps/studio-client/src/surfaces/producer/composer/ProducerComposer.tsx`.
- Commands/readers: `TASK-1503` y contratos consumidos por `TASK-1552`; sin endpoint nuevo.
- Copy: `apps/studio-client/src/copy/index.ts`.
- Ownership: `TASK-1643` posee sólo action wiring/feedback; `TASK-1559` posee feed transport/render/reconciliation.

## GVC Scenario Plan

- Scenario: `producer-feed-actions-canary.mjs`.
- Quality profile: `premium`.
- Viewports: 1440 px y 390 px.
- Steps: abrir card retained → Reference → verificar composer → Recreate → verificar recipe/stale estimate →
  Favorite → Download → denied/degraded/error → keyboard → reduced motion.
- Captures: first fold, action rail, Reference handoff, Recreate handoff, pending, disabled reason, error y mobile.
- Markers: `producer-feed-action-card`, `producer-feed-action-rail`, `producer-feed-reference-handoff`,
  `producer-feed-recreate-handoff`, `producer-feed-action-state`.
- Assertions: no-op guard, command observed, zero-spend before confirmation, focus restore y
  `scrollWidth === clientWidth`.

## Design Decision Log

- Decision: extender la action rail y llevar continuidad directamente al composer.
- Rejected: handlers temporales, action rail duplicada en viewer, nueva gallery y página intermedia.
- Rationale: la continuidad es la brecha P0 y el contrato ya existe; el cambio debe reducir incertidumbre sin
  apropiarse de media review, library o promotion.
- Primitive decision: `extend`, sin primitive nueva en el primer slice.
