# Greenhouse EO — UI Platform Architecture V1 (reestructurado)

> **Version:** 2.0 · **Updated:** 2026-06-07
> **⚠️ Este doc se dividió.** El monolito (~3.000 líneas, mayormente changelog `Delta` append-only) se reestructuró en docs temáticos de **estado vigente** + un **HISTORIAL** cronológico, bajo:
>
> ### → [`docs/architecture/ui-platform/`](./ui-platform/README.md) ← empezá por el README (índice + mapa "dónde vive X")
>
> Este archivo queda como **router** para no romper las referencias existentes. No agregar contenido nuevo acá.

## Dónde está cada cosa ahora

| Tema | Doc |
|---|---|
| Índice + Overview + mapa + modelo de fuentes de verdad | [ui-platform/README.md](./ui-platform/README.md) |
| Stack, librerías, Vuexy component system, convenciones, anti-patterns | [ui-platform/STACK.md](./ui-platform/STACK.md) |
| Primitives (metodología + catálogo) | [ui-platform/PRIMITIVES.md](./ui-platform/PRIMITIVES.md) |
| State management (React Query) | [ui-platform/STATE.md](./ui-platform/STATE.md) |
| Forms / calendar / date / upload | [ui-platform/FORMS.md](./ui-platform/FORMS.md) |
| Tables & data density | [ui-platform/TABLES.md](./ui-platform/TABLES.md) |
| Motion (CSS / framer-motion / GSAP) | [ui-platform/MOTION.md](./ui-platform/MOTION.md) |
| i18n | [ui-platform/I18N.md](./ui-platform/I18N.md) |
| UX patterns (errors/feedback, breadcrumbs, progressive disclosure) | [ui-platform/PATTERNS.md](./ui-platform/PATTERNS.md) |
| View governance | [ui-platform/GOVERNANCE.md](./ui-platform/GOVERNANCE.md) |
| **Historial completo** (todas las `Delta YYYY-MM-DD` + version log v1.0→v1.29) | [ui-platform/HISTORIAL.md](./ui-platform/HISTORIAL.md) |

**ADR de la reestructuración:** [GREENHOUSE_UI_PLATFORM_RESTRUCTURE_DECISION_V1.md](./GREENHOUSE_UI_PLATFORM_RESTRUCTURE_DECISION_V1.md).
