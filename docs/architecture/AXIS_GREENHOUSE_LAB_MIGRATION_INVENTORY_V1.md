# AXIS / Greenhouse Lab migration inventory

**Estado:** 21 reference skeletons publicados · parity pendiente · migración en curso 2026-08-01
**Dueño:** AXIS Design System + Greenhouse UI Platform
**Fuente:** `src/app/(dashboard)/design-system/**` en `greenhouse-eo`
**Destino:** `axis-design-system/apps/lab` (Astro 7, static, público)

## Decisión

El catálogo de Greenhouse no se copia como una aplicación Next/MUI dentro de AXIS. Se migra por contrato:

1. El Lab AXIS publica la referencia HTML/CSS y la documentación de uso.
2. Los consumidores siguen siendo responsables de sus adapters MUI/Vuexy o Tailwind.
3. Auth, API, dominio, filesystem, Figma privado, Nexa y cliente quedan fuera del primer slice.
4. `/design-system` permanece como fallback hasta que cada ruta tenga parity de contrato, estados, copy,
   accesibilidad y evidencia.

## Triage inicial

La clasificación es de elegibilidad, no una afirmación de que la página ya tenga un contrato AXIS suficiente.
Cada candidato requiere auditoría transitive de imports antes de migrarse.

| Ruta Greenhouse | Triage | Próximo destino |
|---|---|---|
| `colors` | skeleton reference | `/references/colors/`; parity visual/consumer pendiente |
| `typography` | skeleton reference | `/references/typography/`; parity de specimens/copy pendiente |
| `geometry` | skeleton reference | `/references/geometry/`; parity de layout/evidencia pendiente |
| `elevation` | skeleton reference | `/references/elevation/`; parity de escenarios pendiente |
| `gradients` | skeleton reference | contract + fixture mínima; faltan presets/controles/motion real |
| `utilities` | skeleton reference | `efeonce.activity-timeline`; no equivale a toda la suite Utilities |
| `buttons` | candidate parity | dos boards, matrices y 152 controles en AXIS; falta canary visual/computed |
| `chips` | candidate parity | boards light/dark, 72 especímenes, avatar/closable, feedback atoms y motion; faltan canary visual/computed y provenance del avatar |
| `breadcrumbs` | skeleton reference | faltan matrices de estados, overflow real, acciones y canaries |
| `disclosure`, `loaders`, `floating-surfaces` | skeleton reference | faltan flujos, focus management y estados completos |
| `card-density`, `composition-shell` | skeleton reference | faltan drivers, morph y composición real |
| `motion`, `border-beam` | skeleton reference | faltan replay, escenas y medición de motion |
| `microinteractions` | excluded first slice | composite product feedback; extract per primitive |
| `team-avatar-group`, `surface-recipes`, `roadmap-timeline`, `charts` | skeleton reference | contracts + fixtures mínimas; parity pendiente |
| `brand-logos` | gate parcial | `efeonce.brand-logos`; assets reales y compare pendientes |
| `axis-adapters` | excluded from reference | stays in consumers; compare by evidence |
| `efeonce-brand` | skeleton reference | `efeonce.brand-motion`; asset experimental, SVG nodes y GSAP siguen fuera |
| `gamification` | skeleton reference | `efeonce.leaderboard`; faltan card, variants, current user y paginación |
| `handoff` | excluded first slice | workflow/product surface; requiere parity de API/readers |
| `growth-forms-renderer`, `native-meeting-scheduler`, `talent-profile` | excluded first slice | API/workforce/product surface |
| `nexa-*` | excluded first slice | Nexa product/runtime surface |
| `mockup/*` and `typography/mockup` | excluded first slice | proposal/mockup artifacts |
| `figma-link/mockup` | excluded first slice | private Figma integration |

## Reference skeletons publicados (no parity)

`colors` renders at `https://axis-design-system-lab.vercel.app/references/colors/`.
The page reads `axisRamp` from `@efeoncepro/axis-tokens`; it does not copy Greenhouse theme values or import
`AxisColorLabView`. It is a reference slice, not a claim of complete parity with the old internal page. Its
E2E smoke verifies the public route and a published token value.

`typography` now renders at `https://axis-design-system-lab.vercel.app/references/typography/`.
Its semantic scale, families, weights and line-heights are published by `axisTypography`; the page does not
import `CanonicalTypographyView` or Greenhouse typography runtime.

`geometry` and `elevation` now render at `/references/geometry/` and `/references/elevation/`. Geometry publishes
the 4px spacing scale and radius roles; elevation publishes semantic roles (`none` through `modal`, plus reserved
`overflow`). Both are static and token-backed. The raw Greenhouse MUI theme remains outside AXIS.

The first pure-UI block now publishes `efeonce.button`, `efeonce.chip`, `efeonce.breadcrumbs`,
`efeonce.disclosure`, `efeonce.loaders` and `efeonce.floating-surface` through the AXIS Content Loader. Their
routes are framework-agnostic HTML/CSS fixtures and include keyboard, responsive and reduced-motion evidence;
the Greenhouse primitives remain the fallback implementation until consumer parity is recorded.

The motion block additionally publishes `efeonce.motion` and `efeonce.border-beam`. Motion values come from the
dependency-free scale; the beam is represented as a framework-agnostic surface-boundary fixture with a static
reduced-motion mode. Greenhouse's Nexa-specific beam palettes and GSAP runtime are not copied into AXIS.

`efeonce.composition-shell` and `efeonce.card-density` now expose layout-only fixtures. They preserve landmark
order, responsive composition and content priority without copying Greenhouse Portal context, telemetry or MUI
components.

The catalog block now also publishes `efeonce.charts`, `efeonce.roadmap-timeline`, `efeonce.team-avatar-group`
and `efeonce.surface-recipes`. These are reference fixtures for data shape, sequence, overflow and surface roles;
they do not copy chart engines, product data, Portal state or consumer adapters.

`efeonce.gradients` completes the portable token/reference group with intensity and static-mode semantics. The
Greenhouse `utilities` is represented by `efeonce.activity-timeline`: an operational evidence primitive with
ordered events, people, timestamps and attachments, but no product data or audit records.

`efeonce.brand-logos` migrates the governance surface before the assets: every logo must expose accessible name,
source/provenance and approval status. The public fixture intentionally renders status-only specimens until each
third-party asset has an approved source, license and versioned checksum.

`efeonce.brand-motion` publishes the portable motion contract behind `efeonce-brand`: AXIS renders a static
HTML/CSS orbital reference with idle, single-orbit, ambient and reduced-motion semantics. The Greenhouse SVG
experiment, GSAP runtime and private asset copy remain consumer-side and are not imported by AXIS.

`efeonce.leaderboard` publishes the portable gamification shape: period, run status, podium, ordered ranking and
score formatting. Its AXIS fixture uses synthetic names and values only; the Greenhouse leaderboard remains the
fallback until consumer state, pagination and capture evidence are compared.

La auditoría completa y la definición de “migrada” viven en
[`AXIS_GREENHOUSE_LAB_PARITY_AUDIT_V1.md`](AXIS_GREENHOUSE_LAB_PARITY_AUDIT_V1.md). Hasta que una fila tenga
evidencia verde en todas sus dimensiones, el destino se considera una reference skeleton y Greenhouse conserva
la implementación canónica del Lab.

## Gate for each next route

- A published AXIS contract or token source exists.
- No transitive Greenhouse/Globe/auth/API/domain import exists.
- A static route and responsive/reference fixture exist.
- Keyboard, reduced-motion and contrast evidence exists.
- Consumer comparison is recorded before the Greenhouse route is retired.

`TASK-1382` remains independent: it must choose another internal Greenhouse build unit to prove the affected
build matrix; it does not govern this cross-repo catalog migration.
