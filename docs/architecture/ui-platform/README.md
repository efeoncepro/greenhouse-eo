# Greenhouse UI Platform — Índice

> **Version:** 2.0 (2026-06-07 — reestructuración del monolito `GREENHOUSE_UI_PLATFORM_V1.md` en docs temáticos `vigente` + `HISTORIAL`)
> **Audience:** Frontend engineers, UI/UX architects, agents implementing views
> **ADR de la reestructuración:** [GREENHOUSE_UI_PLATFORM_RESTRUCTURE_DECISION_V1.md](../GREENHOUSE_UI_PLATFORM_RESTRUCTURE_DECISION_V1.md)

## Overview

Greenhouse EO es un portal Next.js 16 App Router con MUI 7.x envuelto por el starter-kit Vuexy. Esta carpeta es la referencia canónica de la **plataforma UI**: stack, librerías disponibles, primitives, patrones de componentes, convenciones de estado, formularios, tablas, motion, i18n y gobernanza de vistas.

El monolito anterior (`GREENHOUSE_UI_PLATFORM_V1.md`, ~3.000 líneas, mayormente un changelog `Delta` append-only) se dividió en **docs temáticos de estado vigente** + un **HISTORIAL** cronológico. El path viejo queda como **router stub** que apunta acá (las referencias existentes no se rompen).

## Modelo de fuentes de verdad (no duplicar)

Esta carpeta describe la **plataforma de ingeniería UI**. El **lenguaje visual (AXIS)** vive aparte y manda sobre color/tokens/tipografía:

| Capa | Autoridad |
|---|---|
| **Contrato agente (visual)** | `DESIGN.md` (raíz, lint-gated TASK-764) |
| **Tokens visuales (extendido)** | [GREENHOUSE_DESIGN_TOKENS_V1.md](../GREENHOUSE_DESIGN_TOKENS_V1.md) · [GREENHOUSE_THEME_TOKEN_CONTRACT_V1.md](../GREENHOUSE_THEME_TOKEN_CONTRACT_V1.md) |
| **Tipografía** | skill `typography-design` + `src/components/theme/typography-tokens.ts` (SoT) |
| **Runtime (autoridad final)** | `src/components/theme/mergedTheme.ts` + `src/components/greenhouse/primitives/**` |
| **Gobernanza de tokens (lifecycle)** | skill `design-system-governance` |

Regla: cuando un doc temático difiera del runtime, **gana el runtime** y el doc se actualiza.

## Mapa "¿dónde vive X?"

| Necesito… | Doc |
|---|---|
| Stack, librerías disponibles, sistema de componentes Vuexy, convenciones, anti-patrones | [STACK.md](./STACK.md) |
| Metodología Primitive+Variants+Kinds + catálogo de primitives (Sidecar, Floating Surface, Buttons, Chips, Chart cards, Loading, Microinteraction, Timeline, Summary docks…) | [PRIMITIVES.md](./PRIMITIVES.md) |
| Estado de servidor (React Query) y de cliente | [STATE.md](./STATE.md) |
| Formularios, calendario, fechas, rich text, drag&drop, file upload | [FORMS.md](./FORMS.md) |
| Tablas operativas + densidad + TanStack | [TABLES.md](./TABLES.md) |
| Motion (CSS Tier 1 / framer-motion / GSAP Motion Primitive) | [MOTION.md](./MOTION.md) |
| i18n (next-intl, locales, RTL-ready) | [I18N.md](./I18N.md) |
| Error handling & feedback, breadcrumbs, progressive disclosure | [PATTERNS.md](./PATTERNS.md) |
| Gobernanza de vistas (route groups + authorizedViews + entitlements) | [GOVERNANCE.md](./GOVERNANCE.md) |
| Historial cronológico (todas las deltas datadas + version log) | [HISTORIAL.md](./HISTORIAL.md) |

## ADRs / specs dedicadas relacionadas (autoridad por tema)

- Primitives: [UI_PRIMITIVE_VARIANTS_DECISION_V1](../GREENHOUSE_UI_PRIMITIVE_VARIANTS_DECISION_V1.md) · [ADAPTIVE_SIDECAR_DECISION_V1](../GREENHOUSE_ADAPTIVE_SIDECAR_DECISION_V1.md) / [ADAPTIVE_SIDECAR_UI_PLATFORM_V1](../GREENHOUSE_ADAPTIVE_SIDECAR_UI_PLATFORM_V1.md) · [FLOATING_SURFACE_DECISION_V1](../GREENHOUSE_FLOATING_SURFACE_DECISION_V1.md)
- Motion: [MOTION_PRIMITIVE_V1](../GREENHOUSE_MOTION_PRIMITIVE_V1.md) · [MOTION_SYSTEM_V1](../GREENHOUSE_MOTION_SYSTEM_V1.md)
- Tablas: [OPERATIONAL_TABLE_PLATFORM_V1](../GREENHOUSE_OPERATIONAL_TABLE_PLATFORM_V1.md)
- i18n: [I18N_ARCHITECTURE_V1](../GREENHOUSE_I18N_ARCHITECTURE_V1.md)
- Operating model: [PRODUCT_UI_OPERATING_MODEL_V1](../GREENHOUSE_PRODUCT_UI_OPERATING_MODEL_V1.md)

## Cómo evoluciona esta carpeta (regla anti-monolito)

1. Un cambio de estado **vigente** edita el doc temático correspondiente (no append un delta al final).
2. La **entrada cronológica** (qué cambió, cuándo, qué TASK) va a [HISTORIAL.md](./HISTORIAL.md) (append-only).
3. Si el cambio toca un contrato compartido, va a su ADR dedicada + `DECISIONS_INDEX.md`.
4. Nunca volver a un único archivo monolito de N-mil líneas que mezcla vigente + historial.
