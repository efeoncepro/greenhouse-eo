# TASK-1552 — Globe Producer Composer Focused Creation

## Meta

- Status: `ready-for-implementation`
- Owner task: `TASK-1552`
- Product Design asset: `docs/ui/visual-directions/TASK-1552-globe-producer-composer-focused-creation.md`
- Visual direction mode: `repo-native-benchmark`
- Intended consumers: Globe Producer operators on desktop and mobile
- Copy source: `../efeonce-globe/apps/studio-web/src/producer-copy.ts`
- Primitive decision: `extend` — existing Producer Console/composer patterns
- UI ready target: `no`

## Brief

Reducir la carga visual del composer sin eliminar capacidades existentes. La experiencia debe priorizar `prompt → output shape → generar`, relegando modelo, seed, provenance y controles avanzados a progressive disclosure. El costo no se oculta ni se duplica: TASK-1532 conserva el estimate dentro del CTA único.

## Desktop target — 1440×1000

```text
┌──────────────────────────────┬────────────────────────────────────┐
│ Crear imagen                 │ Mis generaciones                   │
│                              │                                    │
│ ¿Qué quieres crear?         │ Filtros · Buscar · Ordenar          │
│ [ prompt grande           ]  │                                    │
│   Mejorar · referencias     │ Feed / resultados                   │
│                              │                                    │
│ Explorar dirección           │                                    │
│ [Editorial] [Producto]      │                                    │
│                              │                                    │
│ Formato                      │                                    │
│ [1:1] [4:5] [16:9] [9:16]  │                                    │
│                              │                                    │
│ Ajustes avanzados            │                                    │
│ Modelo recomendado · Seed   │                                    │
│                              │                                    │
│ [ Generar · 10 créditos ]   │                                    │
└──────────────────────────────┴────────────────────────────────────┘
```

## Mobile target — 390×844

- Header y modalidad permanecen accesibles.
- Prompt ocupa el primer bloque.
- Dirección, formato y CTA siguen en una columna.
- Ajustes avanzados se abren inline o como sheet temporal sólo si el patrón existente lo exige.
- CTA tiene target mínimo 44 px y no genera overflow horizontal.

## State and copy inventory

- Default: `¿Qué quieres crear?` con prompt vacío y dirección disponible.
- Prompt entered: acciones `Mejorar` y referencias sólo si la ruta las admite.
- Ready estimate: reutiliza TASK-1532, `Generar · {credits} créditos`.
- Stale estimate: `Generar`; el mismo CTA resuelve el estimate.
- Estimating/preparing/running: reutiliza estados de TASK-1532.
- Invalid: causa concreta junto al campo afectado.
- Gated modality: capacidad visible con estado honesto, sin controles falsamente activos.
- No references: no renderizar un panel vacío dominante; mostrar ayuda contextual cerca de la selección de ruta.
- Advanced open: disclosure persistente durante la sesión, sin convertirlo en modo obligatorio.

## Implementation Mapping

- Route/surface: `/producer` en `../efeonce-globe/apps/studio-web`.
- Pattern: existing Producer Console/composer; no new Greenhouse primitive.
- Components: `producer-ui.ts`, `producer-controller.ts`, `producer-copy.ts`, `producer-client.ts` y estilos existentes del Producer.
- Readers/commands: contratos actuales de catálogo, estimate, prepare/generate y provenance; no endpoint nuevo.
- API parity: browser sólo presenta DTOs y consume comandos/readers gobernados.
- Access: capabilities y grants actuales; no cambio de autorización.
- Copy: `producer-copy.ts`; no copy reusable nueva en el componente.
- Data-capture: `producer-composer`, `producer-prompt`, `producer-direction`, `producer-output-shape`, `producer-advanced-settings`, `producer-generate-primary`.

## GVC Scenario Plan

- Scenario file: `../efeonce-globe/apps/studio-web/scripts/producer-gvc-fixture.mjs` y scenario Producer existente.
- Route: `/producer?gvc=task-1552-focused-composer`.
- Viewports: `1440×1000`, `390×844`.
- Quality profile: `premium`.
- Required steps: initial Image, Video and Audio modality; prompt entered; direction selection; advanced disclosure; route without references; stale estimate; one-click generate; keyboard; reduced motion.
- Required captures: first fold, advanced collapsed/open, each modality, invalid/gated, ready/stale CTA and mobile recomposition.
- Assertions: one primary action, no manual estimate action, no duplicated cost line, no empty references panel as dominant content, no provider slug/vendor cost/margin in DOM, no horizontal overflow.
- Scroll-width checks: `document.documentElement.scrollWidth === document.documentElement.clientWidth` at both viewports.
- Reduced-motion/focus evidence: focus remains deterministic through disclosure and CTA state transitions.
- Review dossier: `.captures/<run>/review/`.
- Baseline decision / surface ID: `globe.creative-producer-surface`, delta after first-fold acceptance.

## Design Decision Log

- Decision: Focus + Context sidecar with progressive disclosure.
- Alternatives: technical compact composer; centered modal composer.
- Why this pattern: preserves the approved prompt-first Producer loop while reducing visual competition and retaining advanced capability access.
- Reuse/extend/new primitive: extend existing Globe Producer patterns; no parallel design system or Greenhouse primitive.
- Cost decision: TASK-1532 remains authoritative; cost is visible only through the existing CTA/status contract, never hidden or duplicated as a separate section.
- Open risks: the approved source-led baseline may contain controls that need honest gated states; mobile sheet behavior must reuse the existing Globe pattern if advanced settings exceed the fold.

## Visual Verification

- Before/after evidence: current Producer composer versus focused composer at desktop/mobile.
- Required captures: first fold and state matrix above.
- Accessibility: labels, focus ring, keyboard disclosure, live state announcements and 44 px targets.
- Visual scorecard: `docs/ui/reviews/TASK-1552-globe-producer-composer-focused-creation.scorecard.json`.
- Threshold: `average >= 4.5; floor >= 4; hierarchy/surface economy/visual impact/generic-template resistance >= 4.5`.


---

# Anexo — Composer sobre el payload cliente (migrado de TASK-1564, retirada)

> **Migrado 2026-07-25.** `TASK-1564` se creó sin ver que esta task era la dueña del composer. Este anexo trae
> la geometría medida del prototipo aprobado, la matriz de campos por capability, el copy ledger y el contrato de
> accesibilidad. Donde diga "TASK-1564", el dueño es **TASK-1552**.

## Meta

- Owner task: `TASK-1564 — Globe Composer sobre el payload cliente`
- Visual direction mode: `approved-prototype` — la forma sale de `Globe Creative Producer.dc.html`, medida
- Product Design asset:
  - `~/Documents/Globe/Producer/Suite de IA Generativa Creativa/Globe Creative Producer.dc.html` (fuente aprobada)
  - geometría medida: panel `minmax(24rem, 27.5rem)`, `max-height: calc(100svh - 6.4rem)`, riel de estimado
    fijo al pie con `border-top`
- Route: `/producer/compose` (payload cliente); `/producer` sigue siendo el vanilla
- Related flow: `docs/ui/flows/TASK-1564-globe-composer-client-port-flow.md`
- Related motion: `docs/ui/motion/TASK-1564-globe-composer-client-port-motion.md`
- Contrato de motion SSOT: `docs/architecture/creative-studio/GLOBE_CLIENT_MOTION_CONTRACT_V1.md`

## Desktop target (1440)

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ [header — fuera de scope de esta task]                                               │
├───────────────────────────────┬──────────────────────────────────────────────────────┤
│ COMPOSER  (24–27.5rem, fijo)  │  FEED  (1fr) — TASK-1559, ya construido              │
│ ┌───────────────────────────┐ │                                                      │
│ │ COMPOSER            ·eyebrow                                                       │
│ │ Escribir un prompt   ·h1  │ │   El composer y el feed comparten pantalla: lo que   │
│ ├───────────────────────────┤ │   se genera acá aparece allá por el ciclo de         │
│ │ ▸ PROMPT                  │ │   reanudación del feed, sin acoplamiento directo.    │
│ │   [textarea, 6rem min]    │ │                                                      │
│ │   [Mejorar] [Recientes ▾] │ │                                                      │
│ │   [+ Prompt negativo]     │ │                                                      │
│ ├───────────────────────────┤ │                                                      │
│ │ ▸ REFERENCIAS             │ │                                                      │
│ │   (vacío → borde punteado)│ │                                                      │
│ │   Origen · Hash · Derechos│ │                                                      │
│ │   [Verificar derechos]    │ │                                                      │
│ ├───────────────────────────┤ │                                                      │
│ │ ▸ RUTA Y MODELO           │ │                                                      │
│ │   [Estilo ▾] [Modo ▾]     │ │                                                      │
│ │   [Ruta ▾ ] ← readiness   │ │                                                      │
│ │   Seed [····] 🎲 🔒       │ │                                                      │
│ ├───────────────────────────┤ │                                                      │
│ │ ▸ SALIDA (por capability) │ │                                                      │
│ │   image: formato/calidad/ │ │                                                      │
│ │     proporción/cantidad/  │ │                                                      │
│ │     resolución            │ │                                                      │
│ │   video: + duración       │ │                                                      │
│ │   audio: voz/frecuencia/  │ │                                                      │
│ │     formato/velocidad/    │ │                                                      │
│ │     volumen/tono          │ │                                                      │
│ ├───────────────────────────┤ │                                                      │
│ │ RIEL DE ESTIMADO (fijo)   │ │                                                      │
│ │ Total estimado    12 cr   │ │                                                      │
│ │ Disp. 340 · Reserv. 24    │ │                                                      │
│ │ [    Generar    ] [Canc.] │ │                                                      │
│ └───────────────────────────┘ │                                                      │
└───────────────────────────────┴──────────────────────────────────────────────────────┘
```

**Por qué el riel de estimado va fijo al pie y no dentro del scroll:** es la información que decide el gasto.
Un estimado que se pierde al scrollear obliga a subir para confirmar cuánto cuesta lo que estás por apretar, y
ese es exactamente el momento en que no se debe adivinar.

## Mobile target (390)

El panel pasa a ancho completo y el feed va **abajo**, no al costado. El riel de estimado se mantiene
`position: sticky` al pie del viewport: en angosto es lo único que no puede quedar fuera de vista.

A **320** los campos de la sección Salida pasan a una columna. Medición obligatoria: en el feed ya pasó que un
chip decidiera el ancho de la página a 320 y a 390 no se vio.

## Regiones y su responsabilidad

| Región | Qué decide el usuario | Capability |
|---|---|---|
| Prompt | qué quiere | `lab.prompt.enhance` · `lab.prompt.history` |
| Referencias | de qué partir | private-ingest (**fuera de scope**, deshabilitado con razón) |
| Ruta y modelo | con qué inteligencia | `producer.catalog.list` · `producer.fleet.list` · `producer.style.list` · `producer.style.materialize` |
| Salida | en qué forma | ninguna — es forma de la recipe |
| Riel de estimado | si vale la pena | `lab.experiment.estimate` · `credits.*` |
| Generar | ejecutar | `lab.experiment.prepare` → `lab.experiment.execute` |

## Campos por capability — la matriz real

Los campos **no son fijos**: dependen de la capability de la ruta elegida. Renderizar todos y deshabilitar los
que no aplican sería ruido; el prototipo cambia el set.

| Capability | Campos |
|---|---|
| `image-generate` / `image-edit` | formato de salida · calidad · proporción · cantidad · resolución · seed |
| `image-vectorize` / `image-upscale` | formato · resolución (sin cantidad ni seed: derivan de la fuente) |
| `video-generate` / `video-extend` | + duración · fps |
| `audio-generate` / `speech-synthesize` | voz · frecuencia · formato · velocidad · volumen · tono |
| `model-3d-generate` | formato · resolución |

⚠️ La matriz se deriva del **catálogo**, no de un `switch` en el componente. Un `switch` sobre `capability` en
el render es la forma #1 del ejercicio del segundo consumidor: una capability nueva server-side generaría un
composer sin campos, en silencio.

## Action hierarchy

1. **Generar** — primario, ancho completo, el único con relleno de acento.
2. **Mejorar** — secundario, dentro del bloque de prompt.
3. **Cancelar** — texto, y sólo visible cuando hay una corrida en vuelo.
4. Selectores (ruta, estilo, modo, voz) — controles, no acciones.
5. **Verificar derechos** — secundario, sólo con referencias cargadas.

Un solo botón primario en la superficie. El prototipo lo respeta y hay que conservarlo.

## Visual fidelity mapping

| Elemento del prototipo | Token / primitive del payload cliente |
|---|---|
| panel `border + radius + surface` | `--line`, `--radius-lg`, `--surface`, `--shadow` |
| eyebrow `.65rem / .14em / uppercase` | `--text-2xs`, `--tracking-eyebrow`, `--weight-semibold` |
| h1 `700 1.2rem Poppins` | `--font-display`, `--text-xl`, `--weight-display` |
| campo `rgba(0,0,0,.14)` + `--line-strong` | `--surface-soft`, `--line-strong`, `--radius-md` |
| botón primario `linear-gradient(135deg, action, action-strong)` | `--cta-fill`, `--cta-lift` |
| riel `rgba(3,12,38,.72)` + `border-top` | `--surface-strong`, `--line` |
| total en `--warm` | `--warm` |
| isotipo generando | `GlobeGeneratingMark` (primitive nueva) |

**Cero HEX y cero px de fuente literales.** El gate de color y el de tipografía ya muerden.

## Copy ledger

Todo en el namespace nuevo `producerComposer` de `apps/studio-client/src/copy/index.ts`. Nada inline.

| Clave | es-CL |
|---|---|
| `eyebrow` | `Composer` |
| `heading` | `Escribir un prompt` |
| `promptLabel` | `Prompt` |
| `promptPlaceholder` | `Describe la pieza que necesitas` |
| `enhance` | `Mejorar` |
| `recentPrompts` | `Prompts recientes` |
| `negativePrompt` | `Prompt negativo` |
| `references` | `Referencias` |
| `referencesEmpty` | `Sin referencias. La pieza se genera sólo desde el prompt.` |
| `verifyRights` | `Verificar derechos` |
| `route` / `style` / `mode` / `seed` | `Ruta` / `Estilo` / `Modo` / `Seed` |
| `estimateTotal` | `Total estimado` |
| `estimateStale` | `Recalculando el estimado…` |
| `generate` | `Generar` |
| `cancel` | `Cancelar` |
| `noEstimateYet` | `Escribe un prompt para ver el estimado` |
| `blockedNoEstimate` | `No podemos estimar el costo. Revisa la ruta elegida.` |
| `blockedNoGrant` | `No tienes permiso para ejecutar generaciones. Pídeselo a un administrador.` |
| `routeNotReady` | `Este modelo no está disponible ahora` |
| `pendingContract` | `Todavía no tiene contrato gobernado: se habilita cuando exista su capability.` |

## State copy

| Estado | Qué se ve | `role` | ¿Reintentar? |
|---|---|---|---|
| Default | campos vacíos, estimado `—` con `noEstimateYet` | — | — |
| Loading catálogo | campos con skeleton, **no** spinner global | `status` | — |
| Estimado no vigente | valor anterior atenuado + `estimateStale`, Generar deshabilitado | `status` | — |
| Estimado imposible | `blockedNoEstimate`, Generar deshabilitado | `alert` | sí |
| Sin grant de execute | `blockedNoGrant`, Generar deshabilitado, el resto usable | `status` | no |
| Ruta no lista | opción deshabilitada con `routeNotReady` | — | no |
| Ejecutando | `GlobeGeneratingMark` + progreso textual, Generar en pendiente | `status` | — |
| Sin rutas elegibles | bloque de estado que nombra la capability faltante | `alert` | no |
| Sesión expirada | bloque de estado; el prompt escrito **no se pierde** | `alert` | no |

⚠️ **El prompt escrito no se pierde ante ningún error.** Un operador que redactó un prompt largo y ve la
sesión expirar no puede perder el texto: es el activo de la sesión.

## Accessibility contract

- Cada campo con `<label>` real, no placeholder-como-label.
- El estimado vive en una live region `polite`: cambia solo y el usuario tiene que enterarse sin perder foco.
- `Cmd/Ctrl+Enter` genera desde cualquier campo. Documentado en el `title` del botón.
- Los popovers de ruta/estilo/voz: `Esc` cierra, foco vuelve al trigger, `aria-expanded` en el trigger.
- Ninguna opción deshabilitada sin `title` que diga por qué. Un `disabled` sin razón es una pared muda.
- Contraste ≥ 4.5:1 en el estimado atenuado — es texto informativo, no decoración. **Se mide con muestreo de
  píxeles**, no con axe: el fondo es un gradiente y axe reporta `incomplete`, no `pass`.
