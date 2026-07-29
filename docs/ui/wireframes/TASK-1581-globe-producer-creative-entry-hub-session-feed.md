# TASK-1581 — Creative Entry Hub and Session Feed Wireframe

## Direction

`repo-native-benchmark`: Editorial Creative Desk. The first fold reads `intention → active context → recent sessions → existing work`; it does not read as a model marketplace or equal-weight card wall.

## Targets

- Desktop: `1440×1000`, split composer/context and session-aware feed.
- Mobile: `390×844`, one-column intent → context → recent work; filters in sheet.

## Wireframe

```text
┌ workspace · project · credits · account ┐
│ ¿Qué quieres hacer?                     │
│ Crear  Editar  Variar  Mejorar  Revisar │
│ Proyecto / Colección / Nueva sesión     │
│ Continuar: sesiones · proyectos · review│
│ Sesiones recientes                      │
│  Session title · status · variants      │
│ Actividad reciente / assets             │
└─────────────────────────────────────────┘
```

## Action hierarchy

1. Choose intent.
2. Confirm project/collection/session context.
3. Continue a recent session or create a new one.
4. Explore session results.

## State/copy inventory

Loading, empty project, no sessions, dirty session, stale estimate, running, partial, failed, denied and expired session. Copy lives in `apps/studio-client/src/copy/index.ts`; no visible string is embedded in JSX.

## Implementation Mapping

- Shell: existing `ProducerWorkspace`.
- Context: `TASK-1580` context bundle.
- Feed: existing `ProducerFeed`/reconciler; session grouping only.
- Collections: `TASK-1520` readers.
- Model availability: `TASK-1554`/`TASK-1555`.
- Motion: `docs/ui/motion/EPIC-028-globe-creative-studio-master-motion.md`.

## GVC Scenario Plan

Scenario `globe-producer-entry-session-feed`; capture desktop/mobile, keyboard, reduced motion and new-session insertion. Assert no duplicate feed, focus retention, live announcement and `scrollWidth === clientWidth`.

## Design Decision Log

- Intent precedes model.
- Session is the grouping unit; the feed remains the data authority.
- Live updates use a user-controlled “Nuevos resultados” anchor.
- No public discovery or free canvas in this surface.
