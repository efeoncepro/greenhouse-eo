# UI Platform y Design System end-to-end

> **Tipo de documento:** Documentacion funcional
> **Version:** 1.2
> **Creado:** 2026-06-15 por Codex
> **Modulo:** UI Platform / AXIS / Design System / GVC
> **Rutas principales:** `/admin/design-system`, `/design-system/surface-recipes`, `/admin/design-system/colors`, `/admin/design-system/composition-shell`, `/admin/design-system/card-density`, `/admin/design-system/nexa-*`
> **Arquitectura relacionada:** `docs/architecture/ui-platform/README.md`, `docs/architecture/ui-platform/PRIMITIVES.md`, `docs/architecture/GREENHOUSE_PREMIUM_AGENTIC_UI_DELIVERY_DECISION_V1.md`, `docs/architecture/GREENHOUSE_UI_PRIMITIVE_VARIANTS_DECISION_V1.md`, `docs/architecture/GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md`

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
| Dirección y aceptación premium | `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md` |
| Recipes de superficie | `docs/ui/recipes/**` + `/design-system/surface-recipes` |
| Catalogo vivo | `/admin/design-system` |
| Captura visual | GVC `pnpm fe:capture` |
| Figma linking | Figma node store + route `/admin/design-system/figma-link` |
| Handoff producto -> DEV | `docs/documentation/plataforma/design-handoff-control-plane.md` + `/design-system/handoff` |

## Contrato funcional del color secondary

Greenhouse usa **Tidal Teal** como color secondary para acciones de apoyo, selección contextual y énfasis de marca subordinado. No comunica éxito: los resultados positivos y estados saludables siguen usando `success` emerald. Tampoco reemplaza Core Blue como acción primaria ni `info` para mensajes informativos.

El color cambia de intensidad por modo para conservar jerarquía y contraste: en superficies claras se presenta como petrol profundo; en dark mode usa un teal más luminoso con tinta Midnight. Los componentes no eligen esos pasos manualmente: Buttons, Chips y cualquier consumer de producto reciben la decisión desde `theme.palette.secondary.*`.

La referencia viva es `/admin/design-system/colors`, complementada por los labs de Buttons y Chips. La decisión y sus límites viven en `GREENHOUSE_SECONDARY_TEAL_COLOR_DECISION_V1.md`; AXIS Figma permanece pendiente de reconciliación y no puede sobrescribir este override durante una regeneración.

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

## Cómo nace una superficie premium

El flujo ya no comienza eligiendo cards. Comienza con una tesis visual y termina con evidencia:

1. La Visual Direction define tono, jerarquía, ritmo, densidad, contraste espacial, responsive y momento dominante.
2. `SurfaceRecipe` traduce esa intención a regiones del Composition Shell y primitives compuestas; sus work planes sostienen inventarios, detalle, metadata y decisiones para que el canvas gris funcione como gutter, no como superficie de lectura.
3. Las superficies se declaran por función: `open`, `contained`, `band`, `immersive`, `stage`, `selected` o `floating`.
4. El first fold normal admite como máximo tres superficies `contained`. Una card necesita una frontera semántica; no se usa como wrapper por defecto.
5. Mobile recompone la jerarquía y la acción principal; no serializa el desktop en una columna de cards.
6. GVC premium y el scorecard de catorce dimensiones deciden la aceptación. Tokens correctos o build verde no bastan.

Los pisos visuales son media `≥4.5/5`, ninguna dimensión `<4/5` y `≥4.5` en jerarquía, economía de superficies, impacto visual, fidelidad y resistencia genérica. Card wallpaper, ausencia de un momento visual dominante o una captura mobile convertida en stack uniforme son bloqueantes.

## Que hace automatico Greenhouse

- Lints/gates detectan drift de contrato visual, rutas y primitives.
- GVC captura frames/video/aria snapshots.
- GVC cuenta superficies `contained`, detecta nesting semántico y geometría repetitiva, y produce un dossier de catorce dimensiones.
- Route reachability valida surfaces internas.
- Figma node store conserva links y eventos para nodos gobernados.
- Design Handoff crea el primer snapshot Figma cuando registra un handoff de producto allowlisted.

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
- Que diferencia secondary Tidal Teal de primary, info y success?
- Que no debo copiar literal desde Figma?
- Como agrego una primitive al catalogo?
- Como paso un nodo Figma de producto a DEV con evidencia?

## Documentacion relacionada

- `docs/documentation/plataforma/design-handoff-control-plane.md`
- `docs/architecture/ui-platform/README.md`
- `docs/architecture/ui-platform/PRIMITIVES.md`
- `docs/architecture/ui-platform/PATTERNS.md`
- `docs/architecture/ui-platform/GOVERNANCE.md`
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`
- `docs/ui/recipes/README.md`
- `docs/ui/reviews/README.md`
- `docs/manual-de-uso/plataforma/captura-visual-playwright.md`
- `docs/manual-de-uso/plataforma/operar-ui-platform-design-system.md`
- `docs/manual-de-uso/plataforma/validar-contrato-visual-design-md.md`
