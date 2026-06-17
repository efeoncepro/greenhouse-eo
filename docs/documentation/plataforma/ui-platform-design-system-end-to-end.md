# UI Platform y Design System end-to-end

> **Tipo de documento:** Documentacion funcional
> **Version:** 1.0
> **Creado:** 2026-06-15 por Codex
> **Modulo:** UI Platform / AXIS / Design System / GVC
> **Rutas principales:** `/admin/design-system`, `/admin/design-system/colors`, `/admin/design-system/composition-shell`, `/admin/design-system/card-density`, `/admin/design-system/nexa-*`
> **Arquitectura relacionada:** `docs/architecture/ui-platform/README.md`, `docs/architecture/ui-platform/PRIMITIVES.md`, `docs/architecture/GREENHOUSE_UI_PRIMITIVE_VARIANTS_DECISION_V1.md`, `docs/architecture/GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md`

## Para que sirve

UI Platform define como se construyen pantallas Greenhouse: stack Next/MUI/Vuexy, tokens AXIS, primitives, patterns, motion, forms, tables, i18n, governance y captura visual.

Design System es una superficie interna, no cliente. Sirve para descubrir, probar y validar primitives/patrones vivos.

## Evidencia revisada

Codigo y rutas:

- Rutas `/admin/design-system/**`.
- Docs `docs/architecture/ui-platform/**`.
- Primitives `src/components/greenhouse/primitives/**`.
- Design node store `src/lib/design-system/figma-nodes/**`.
- GVC `scripts/frontend/**` y comandos `pnpm fe:capture*`.

DB agregada:

- `greenhouse_core.design_system_figma_nodes`: 4.
- `design_system_figma_node_events`: 6.
- No todo el Design System vive en DB; la fuente principal es runtime code + docs + catalogo interno.

## Mapa funcional

| Capa | Source of truth |
|---|---|
| Contrato visual | `DESIGN.md` |
| Tokens | theme AXIS / `src/@core/theme/axis-tokens.ts` / docs tokens |
| Primitives | `src/components/greenhouse/primitives/**` |
| Patterns | `docs/architecture/ui-platform/PATTERNS.md` |
| UI governance | `docs/architecture/ui-platform/GOVERNANCE.md` |
| Catalogo vivo | `/admin/design-system` |
| Captura visual | GVC `pnpm fe:capture` |
| Figma linking | Figma node store + route `/admin/design-system/figma-link` |

## Reglas operativas

- Buscar primitive antes de crear componente nuevo.
- Si algo se repite, usar Primitive + Variants + Kinds.
- Pantallas nuevas deben partir del Composition Shell salvo excepcion justificada.
- Cards nuevas deben nacer adaptables con density contract cuando viven en contenedores variables.
- Usar tokens MUI/AXIS, no HEX/px crudos desde Figma.
- Breadcrumbs visibles deben usar `GreenhouseBreadcrumbs`.
- Floating UI directo no se importa en views de producto; se usa primitive.
- GSAP directo no se importa en views; se usa Motion primitive.
- UI visible requiere GVC o evidencia visual equivalente.

## Que hace automatico Greenhouse

- Lints/gates detectan drift de contrato visual, rutas y primitives.
- GVC captura frames/video/aria snapshots.
- Route reachability valida surfaces internas.
- Figma node store conserva links y eventos para nodos gobernados.

## Que hace el operador/agente

- Selecciona primitive/pattern correcto.
- Actualiza catalogo Design System si nace un primitive o lab.
- Ejecuta GVC y mira frames.
- Documenta cambios de contrato en `ui-platform/*` y ADR si aplica.
- No crea UI paralela para patterns ya canonicos.

## Preguntas que Nexa debe responder

- Como construyo una pantalla nueva?
- Cuando uso Composition Shell?
- Que es Primitive + Variants + Kinds?
- Como valido visualmente con GVC?
- Donde vive la paleta AXIS?
- Que no debo copiar literal desde Figma?
- Como agrego una primitive al catalogo?

## Documentacion relacionada

- `docs/architecture/ui-platform/README.md`
- `docs/architecture/ui-platform/PRIMITIVES.md`
- `docs/architecture/ui-platform/PATTERNS.md`
- `docs/architecture/ui-platform/GOVERNANCE.md`
- `docs/manual-de-uso/plataforma/captura-visual-playwright.md`
- `docs/manual-de-uso/plataforma/validar-contrato-visual-design-md.md`
