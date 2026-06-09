# ADR — UI Platform doc se reestructura en `ui-platform/` (vigente temático + HISTORIAL)

> **Status:** Accepted
> **Fecha:** 2026-06-07
> **Scope:** Documentación / UI platform / arquitectura / multi-agente
> **Regla canónica de ADRs:** [ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md](../operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md)
> **Indexado en:** [DECISIONS_INDEX.md](DECISIONS_INDEX.md)

## Contexto

`GREENHOUSE_UI_PLATFORM_V1.md` creció a **~3.014 líneas / ~70 secciones `##`**, de las cuales **~50 eran entradas `Delta YYYY-MM-DD`**: era un **changelog append-only disfrazado de spec**. El estado vigente y estructurado (Stack, Librerías, Vuexy Component System, View Governance, State, Forms, Tables, i18n, Patterns, Anti-Patterns) quedaba **enterrado bajo ~2.200 líneas de historial**.

Además ya existía **fragmentación por tópico** en docs dedicados (`GREENHOUSE_MOTION_PRIMITIVE_V1`, `MOTION_SYSTEM_V1`, `DESIGN_TOKENS_V1`, `THEME_TOKEN_CONTRACT_V1`, `ADAPTIVE_SIDECAR_*`, `FLOATING_SURFACE_DECISION_V1`, `UI_PRIMITIVE_VARIANTS_DECISION_V1`, `OPERATIONAL_TABLE_PLATFORM_V1`, `I18N_ARCHITECTURE_V1`, `PRODUCT_UI_OPERATING_MODEL_V1`), y el monolito **repetía deltas de esos mismos temas** → drift (dos lugares contando la misma historia). El doc estaba referenciado por cientos de archivos (blast radius alto) y era editado por múltiples sesiones a la vez (colisión).

## Decisión

1. **Carpeta `docs/architecture/ui-platform/`** con docs temáticos de **estado vigente**: `README.md` (índice + mapa "dónde vive X" + modelo de fuentes de verdad), `STACK.md`, `PRIMITIVES.md`, `STATE.md`, `FORMS.md`, `TABLES.md`, `MOTION.md`, `I18N.md`, `PATTERNS.md`, `GOVERNANCE.md`.
2. **`HISTORIAL.md`** = todas las entradas `Delta` datadas (verbatim) + el version-log del front-matter (v1.0→v1.29), append-only. Espeja el patrón `Handoff.md` / `Handoff.archive.md` (vigente vs caja negra).
3. **`GREENHOUSE_UI_PLATFORM_V1.md` queda como router stub** (no se borra) → preserva las referencias existentes y redirige a `ui-platform/README.md`. No se agrega contenido nuevo ahí.
4. **Nombre `ui-platform/` (neutro), NO `axis/`.** "AXIS" ya tiene significado específico en el repo (design system de Figma + sistema de tokens de color: `axis-tokens.ts`, `axisSemanticHex`, museo `/admin/design-system`). Reservar AXIS para el **lenguaje visual** (color/tokens/tipografía/motion-as-language); la **plataforma de ingeniería UI** (primitives, state, forms, tables, i18n, governance) es `ui-platform/`.
5. **No se crea una 4ª fuente de verdad.** El modelo de 3 capas existente (DESIGN.md contrato → tokens V1 → `mergedTheme` runtime) + las ADR `*_DECISION_V1` siguen siendo la autoridad por tema; los docs temáticos **linkean** a ellas y declaran que el runtime gana en conflicto.

## Consecuencias

- Estado vigente legible sin atravesar el historial; cada cambio futuro edita el doc temático (no append un delta al monolito) + registra la cronología en `HISTORIAL.md`.
- Cero pérdida de contenido: split determinístico verificado por conservación de líneas (head 38 + 2977 de secciones = 3015; 61 secciones ruteadas, 0 sin rutear).
- Punteros actualizados: `CLAUDE.md`, `AGENTS.md`, skills de UI (Claude `greenhouse-product-ui-architect`/`modern-ui` overlay; Codex `greenhouse-portal-ui-implementer`/`greenhouse-vuexy-ui-expert`/`greenhouse-product-ui-architect`).
- Las referencias viejas a `GREENHOUSE_UI_PLATFORM_V1.md` siguen resolviendo (router stub).

## Regla anti-monolito (gobernanza vigente)

1. Cambio de estado vigente → edita el doc temático correspondiente.
2. Entrada cronológica (qué/cuándo/qué TASK) → append a `HISTORIAL.md`.
3. Contrato compartido → su ADR dedicada + `DECISIONS_INDEX.md`.
4. Nunca volver a un único archivo monolito que mezcle vigente + historial.

## Alternativas consideradas

- **Dejar el monolito** y solo podar deltas viejas → no resuelve la mezcla vigente/historial ni el drift con los docs dedicados. Rechazado.
- **Carpeta `axis/` como paraguas de todo** → conflación de marca (AXIS = lenguaje visual, no la plataforma de ingeniería). Rechazado; se reserva AXIS para lo visual.
- **Borrar el monolito** → rompería cientos de referencias. Rechazado a favor del router stub.

## No-goals

- No reescribe el contenido vigente (se relocaliza verbatim); no cambia contratos de runtime; no toca código.
- No migra las ADR dedicadas existentes (siguen siendo autoridad por tema).
