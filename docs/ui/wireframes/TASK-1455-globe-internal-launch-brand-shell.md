# TASK-1455 — Globe internal launch wireframe

## Meta

- Product Design asset: `docs/ui/visual-directions/TASK-1455-globe-internal-launch-direction.md`
- Visual direction mode: `repo-native-benchmark`
- Selected direction: `Orbital Threshold`
- Canonical brand assets: `public/branding/SVG/globe-full.svg`, `public/branding/SVG/globe-negativo.svg`, `public/branding/SVG/isotipo-globe-negativo.svg`, `public/branding/SVG/isotipo-goble-full.svg`

## Desktop Target — 1440×1000

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Globe full lockup]                                      INTERNAL PILOT      │
│                                                                              │
│  GREENHOUSE CONNECTED                         ╭ oversized canonical globe ╮  │
│  Creative operations,                        /  mark crosses right/fold    \ │
│  ready to scale.                             │                             │ │
│  A governed foundation for Efeonce's          \                           /  │
│  creative production system.                  ╰──────────────────────────╯   │
│                                                                              │
│  [ Entrar con Greenhouse → ]                                              │
│                                                                              │
│──────────────── status rail: identity · connection · environment ───────────│
└──────────────────────────────────────────────────────────────────────────────┘
```

Authenticated replaces the entry copy/CTA with identity summary, “Foundation active”, revalidate and logout; the dominant mark and shell do not jump.

## Mobile Target — 390×844

```text
┌─────────────────────────────┐
│ [compact Globe lockup]      │
│                [mark crop]  │
│ GREENHOUSE CONNECTED        │
│ Creative operations,       │
│ ready to scale.             │
│ concise foundation copy     │
│ [ Entrar con Greenhouse ]   │
│                             │
│ INTERNAL PILOT              │
│ connection · environment    │
└─────────────────────────────┘
```

## Action Hierarchy

1. Primary: enter with Greenhouse / enter Studio foundation.
2. Secondary authenticated only: revalidate session.
3. Tertiary: sign out.

## Visual Fidelity Mapping

| Direction cue | Globe implementation | Forbidden |
| --- | --- | --- |
| Immersive threshold | open midnight plane with canonical mark crossing the fold | boxed logo card |
| Product seriousness | operational status rail and restrained copy | fake dashboard/projects |
| Creative energy | supplied blue/orange/magenta brand art | invented rainbow gradient |
| Scale | asymmetry and cropped architectural mark | centered tiny logo |
| Speed | one direct CTA and short causal reveal | ambient loops/particles |

## Copy Ledger

| Copy id | Visible text | State / purpose |
| --- | --- | --- |
| `launch.eyebrow` | GREENHOUSE CONNECTED | governance signal |
| `launch.title` | Creative operations, ready to scale. | anonymous ready |
| `launch.body` | A governed foundation for Efeonce's creative production system. | honest scope |
| `launch.enter` | Entrar con Greenhouse | primary action |
| `launch.internal` | Piloto interno | environment disclosure |
| `studio.title` | Foundation active | authenticated ready |
| `studio.revalidate` | Verificar acceso | secondary recovery |
| `studio.logout` | Cerrar sesión | tertiary action |

## State Copy

| State | Title | Body | CTA / recovery |
| --- | --- | --- | --- |
| ready | Creative operations, ready to scale. | Greenhouse is connected to the Globe foundation. | Entrar con Greenhouse |
| loading | Conectando con Greenhouse… | Estamos abriendo una sesión segura. | Esperar; retry after timeout |
| empty | Aún no hay una sesión Globe | La foundation está disponible para colaboradores autorizados. | Entrar con Greenhouse |
| partial | Foundation active | La identidad está conectada; projects y runs llegan en las próximas slices. | Verificar acceso |
| error | No pudimos completar el acceso | Usa el correlation ID para soporte sin compartir credenciales. | Reintentar |
| denied | Acceso interno no disponible | Tu sesión no cumple la política interna de Globe. | Volver a Greenhouse |

## Accessibility Contract

- Heading hierarchy: one `h1`; logo has accessible product name; decorative mark is hidden from AT.
- A skip link reaches `main`; focus-visible is never suppressed; all targets are at least 44 CSS px.
- Status/pending copy uses `role=status`; error/denied uses an alert heading without exposing policy details.
- Color is never the only state signal. Text remains AA in initial/intermediate/settled frames.
- Reduced motion reaches the same final state immediately. Keyboard order is logo context → heading → primary → status actions.

## Implementation Mapping

- `../efeonce-globe/apps/studio-web/src/ui.ts`: pure escaped HTML renderers.
- `../efeonce-globe/apps/studio-web/src/app.ts`: routes and same-origin redirect only.
- `../efeonce-globe/apps/studio-web/public/branding/`: copied canonical SVGs plus provenance note.
- `/v1/session` remains the API contract; no token is serialized into HTML.

## GVC Scenario Plan

- Scenario file: `scripts/frontend/scenarios/globe-internal-launch.scenario.ts`.
- Live/local routes: `/`, `/studio`, denied/revoked state.
- Viewports: 1440×1000 and 390×844.
- Quality profile: premium.
- Markers: `globe-launch`, `globe-brand-stage`, `globe-primary-action`, `globe-session-status`.
- Capture first fold and authenticated fold; assert one primary, no raw errors, DOM scroll width, keyboard and reduced motion.
- Review dossier: required under the versioned TASK-1455 capture/evidence path before acceptance.
- Baseline decision: repo-native baseline is promoted only after first-fold acceptance and scorecard pass.
- Scroll-width evidence: record `scrollWidth <= clientWidth` at desktop and 390px mobile; full-page screenshots are insufficient.

## Design Decision Log

- Selected Orbital Threshold over Studio Console and Gallery Field.
- Composition is a route-local Globe shell, not a new Greenhouse primitive.
- No CompositionShell import across products; preserve the sister-platform boundary.
- Full SVG text rendering is a verification item because its source uses live Poppins text.
