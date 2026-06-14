# Greenhouse Composition Shell — UI Platform V1

> **Tipo:** Arquitectura UI Platform (companion de decisión)
> **Versión:** 1.0 (2026-06-13)
> **Status:** Draft de implementación (TASK-1114 Slice 1)
> **Decisión que la gobierna:** [`GREENHOUSE_COMPOSITION_SHELL_DECISION_V1.md`](GREENHOUSE_COMPOSITION_SHELL_DECISION_V1.md) (`Accepted`)
> **Autoridad final:** el runtime (`src/components/greenhouse/primitives/composition-shell/**`). Si este doc difiere del runtime, gana el runtime y el doc se actualiza.
> **Skill operativa:** `greenhouse-product-ui-architect` + `design-system-governance` + `arch-architect`.

Este doc es el **contrato de implementación** del Composition Shell: el modelo de datos (regiones + composiciones + estados), la API del consumer, el contrato de fluidez (qué se hornea), la adaptación por breakpoint, la a11y y la degradación honesta. El **por qué** + los alternatives vive en el ADR; acá vive el **cómo**.

---

## 1. Qué es (recordatorio)

Substrato de coreografía de layout **domain-neutral, aditivo y opt-in**. El shell deja de ser una caja estática (`LayoutContent`/`StyledMain`) y pasa a ser un director: una superficie **declara una composición** y el substrato aporta el grid de regiones, el morph in-place (View Transitions), el reflow adaptativo (container queries) y el gobierno del estado. **No reemplaza `LayoutContent`** — una superficie que no opta queda igual.

Sigue **Primitive + Variants + Kinds**:
- **Primitive** = `CompositionShell` (dueña de layout/a11y/motion/shell/state/GVC).
- **Variants** = las composiciones nombradas (modos funcionales, no skins).
- **Kinds** = casos semánticos de dominio que resuelven a una composición existente.

---

## 2. Regiones (la estructura)

Roles **singleton** (uno por página — constraint duro de View Transitions: ≤1 elemento por `view-transition-name`). Cada región es un **query container válido** (`container-type: inline-size`) para que su contenido (Adaptive Card, TASK-1115) se adapte a su ancho.

| Región | Rol | `view-transition-name` | `min-inline-size` (propuesto, tunable) | Query container |
|---|---|---|---|---|
| `primary` | Contenido operativo principal (siempre presente; condensa, nunca desaparece) | `gh-region-primary` | `480px` | ✅ |
| `aside` | Panel companion in-flow (reserva espacio, reflowea) | `gh-region-aside` | `360px` | ✅ |
| `lead` | Bloque protagonista que lidera arriba (respuesta/insight) | `gh-region-lead` | full | ✅ |
| `dock` | Composer / action dock anclado | `gh-region-dock` | full | ✅ |
| `overlay` | Fallback excepcional desktop / drawer temporal mobile | `gh-region-overlay` | full | ✅ (temporal) |

> Los `min-inline-size` se afinan en Slice 2 contra los consumers reales. `480/360` salen del precedente `resolveAdaptiveSidecarMode` (`mainMinWidth=760`, `sidecarWidth=420`) ajustado al modelo de regiones; se valida con GVC.
>
> **`view-transition-name` es por-instancia** (TASK-1114 gate finding): la tabla muestra el nombre **base** (`gh-region-primary`); el componente lo escopa con un id único de instancia (`useId`) vía `regionViewTransitionName(region, instanceId)`. Así el morph entre composiciones de UNA instancia funciona (nombre estable por región) Y dos shells en la misma página NO colisionan (constraint VT: ≤1 elemento por nombre). Mismo patrón que `NexaMomentComposition`. Surfaced por el Lab del Composition Shell consumiendo 2 instancias.

---

## 3. Composiciones (los variants)

Presets nombrados — los *canonical layouts de Greenhouse* (framing M3, ADR §Delta). Cada composición declara qué regiones monta + el layout.

| Composición | Regiones | Layout | Análogo M3 | Caso |
|---|---|---|---|---|
| `single` | `primary` (+ `dock` opcional) | stack | — | dashboard/list estándar (default) |
| `leadPlusContext` | `lead` (lidera) + `primary` (condensa debajo) (+ `dock`) | stack | — | respuesta Nexa in-place (AI Overviews) |
| `split` | `primary` + `aside` | split | list-detail / supporting-pane | cola+inspector, workspace shell |
| `focused` | `primary` (expandido), resto oculto | stack | — | distraction-free / lectura |

`overlay` es **transversal a cualquier composición** (fallback desktop / temporal mobile), no una composición propia. `dock` también es aditivo a cualquier composición.

### Resolver `kind → composición`

Mirror de `resolveAdaptiveSidecarMode` / `resolveNexaMomentCompositionVariant` (precedencia: explícito > kind > default).

```ts
export type CompositionShellComposition = 'single' | 'leadPlusContext' | 'split' | 'focused'
export type CompositionShellRegion = 'primary' | 'aside' | 'lead' | 'dock' | 'overlay'

// Kinds semánticos de dominio → resuelven a una composición EXISTENTE (nunca una nueva por dominio)
export type CompositionShellKind =
  | 'dashboard'        // → single
  | 'nexaMoment'       // → leadPlusContext   (AI Overviews in-place)
  | 'queueInspector'   // → split             (cola + inspector)
  | 'workspaceDetail'  // → split             (org workspace shell)
  | 'reader'           // → focused
  | 'custom'

export const resolveComposition = (input?: {
  composition?: CompositionShellComposition
  kind?: CompositionShellKind
}): CompositionShellComposition => { /* explícito > kind > 'single' */ }
```

---

## 4. Máquina de estados

Espejo del shape que `NexaMomentComposition` ya usa + el reducer/dirty-guard de `reduceAdaptiveSidecarState`.

```
dormant ──compose──▶ composing ──settle──▶ composed
   ▲                                          │
   └──────────────── reset ◀──────────────────┘
```

- `dormant` = composición base (típicamente `single`), sin morph en curso.
- `composing` = morph en vuelo (View Transition activa).
- `composed` = composición destino asentada.

Transiciones **enumeradas** (controller); el **host conduce el estado** (igual que la lente y el sidecar). `reduceCompositionShellState` (mirror `reduceAdaptiveSidecarState`) maneja open/replace/dirty + **collision/arbitration** (quién ocupa el `aside`: replace con dirty-guard).

---

## 5. Contrato de fluidez (lo que el shell hornea más allá de nombrar zonas)

Capacidades **neutrales** horneadas en la primitive. El consumer solo declara *qué composición + qué contenido*.

### A. Movimiento
| Capacidad | Mecanismo | Token/helper |
|---|---|---|
| Morph FLIP entre composiciones | regiones persistentes conservan su `view-transition-name` → el browser interpola pos+size | `startViewTransition` (`src/lib/motion/view-transition.ts`) |
| Promoción shared-element (card → `lead`) | el card adopta el `view-transition-name` de `lead` al promoverse (singleton handoff) | idem |
| Orquestación enter/exit/reorder (stagger) | `::view-transition-*` keyframes + stagger | motion tokens (`motion/core/tokens.ts`: `standard 200`/`long 400` + `emphasized`) |
| Transiciones interrumpibles (buttery) | framer-motion `layout` para lo que VT no puede redirigir (drag, cambio a media animación) | framer-motion (dep existente) |

> **Tradeoff horneado:** `startViewTransition`, si se dispara una nueva mientras corre otra, **salta-y-reinicia** (no redirige el interpolado). Para interrupción buttery → framer-motion `layout`. El substrato consume **ambas** capas (VT para morph estructural + framer-motion para lo interrumpible).

### B. Adaptación
| Capacidad | Mecanismo |
|---|---|
| Regiones size-aware | cada región es query container (`container-type: inline-size`); su contenido reflowea a su ancho (Adaptive Card, TASK-1115) |
| Condensación honesta | `primary` muestra versión real más chica al ceder espacio, **nunca** clipea (state-design) |
| Resolución adaptativa por breakpoint | M3 size classes (§7) — `aside`/`lead` → `overlay`/`temporary` en compact |
| Scroll anchoring + scroll-driven entrance | preservar scroll/foco al reflowear; revelar al entrar en viewport (degrada honesto) |

### C. Continuidad de atención
| Capacidad | Mecanismo |
|---|---|
| Anchoring cita↔host | highlight + `scrollIntoView` del ítem del host (`data-nexa-anchor` ya en `NexaMomentComposition`) |
| Focus / announce routing | foco al contenido nuevo tras `transition.finished` (una vez, sin robar foco en re-render); **un solo** live region |
| Skeleton-to-content | skeleton dimensionado al contenido final → CLS=0 |

### D. Gobierno del estado
| Capacidad | Mecanismo |
|---|---|
| Máquina de estados de composición | transiciones enumeradas (§4) |
| Collision / arbitration | `reduceCompositionShellState` con dirty-guard (mirror sidecar reducer) |
| Persistencia/restore sin flash | route-local (V1); broad (V2) |

---

## 6. API del consumer (propuesta — se afina en Slice 2)

Una superficie **opta** envolviendo su contenido. Slots por región; el shell aporta grid + morph + a11y.

```tsx
<CompositionShell
  composition="leadPlusContext"   // o kind="nexaMoment"
  state={state}                   // dormant | composing | composed (host-driven)
  regions={{
    primary: <DashboardGrid />,   // host (condensa, no desaparece)
    lead:    <NexaAnswer />,       // bloque protagonista
    dock:    <NexaComposer />,
  }}
  sizeClass={sizeClass}           // compact | medium | expanded (o auto vía container)
  onCompositionChange={...}
/>
```

- El shell **no conoce el dominio**: `regions` son ReactNode slots; el contenido + la política (qué composición) vienen del consumer.
- El card adentro de cada región es **dueño de su adaptación intrínseca** (Adaptive Card / TASK-1115). El shell solo garantiza que la región es query container. **El seam es la container query.**

---

## 7. Adaptación por breakpoint (M3 size classes)

Mismo modelo que `resolveAdaptiveSidecarMode` generalizado a composiciones.

| Size class | Ancho | `split` | `leadPlusContext` | `single`/`focused` |
|---|---|---|---|---|
| **expanded** | ≥ 1200px | `primary` + `aside` lado a lado | `lead` arriba + `primary` debajo | tal cual |
| **medium** | 840–1200px | `aside` más angosto; → `overlay` si `primary.min + aside.min` no entra | igual (stack) | tal cual |
| **compact** | < 840px | → stacked; `aside` → drawer `temporary` | stacked; `lead` arriba | tal cual |

La resolución es por **container** (no viewport) donde sea posible (container queries) → el shell adapta aunque viva dentro de otra región.

---

## 8. Contrato a11y

- Regiones in-flow = `role="region"` / `complementary` con label; **nunca** `aria-modal` para reflow in-place (solo el `overlay`/`temporary` mobile usa semántica modal con focus trap).
- **Un solo live region** (lo lleva la identidad/host, no cada región) → un anuncio del cambio de composición.
- Focus routing: al contenido nuevo tras `transition.finished` (mandatory, modern-web `same-document-transitions`); restaurar al cerrar.
- `prefers-reduced-motion` → swap instantáneo (sin morph), horneado vía `startViewTransition` (ya gatea) + guard local.
- Contenido **never-hidden** durante el morph.

---

## 9. Degradación honesta

| Condición | Comportamiento |
|---|---|
| Sin View Transitions (Firefox actual) | `startViewTransition` corre el update directo → swap instantáneo, layout correcto |
| `prefers-reduced-motion` | swap instantáneo |
| Sin container queries (legacy) | layout base de la composición (sin reflow fino) — Baseline 2023, raro |
| Composición/kind inválido | resuelve a `single` (default), no crashea |

---

## 10. Frontera

- **V1 = transform in-place** (modelo AI Overviews). **V2 = cross-route / "mover a interfaz nueva"** (modelo AI Mode; cross-document View Transitions + App Router) — diferido.
- **Seam a Adaptive Card (TASK-1115):** el shell garantiza que las regiones son query containers; el card es dueño de su adaptación. No acoplar (el card responde a su ancho, no al shell).
- **`LayoutContent`/`StyledMain` quedan intactos** — el substrato es opt-in. El `compactContentWidth: 1440` se respeta (no se flipea a `wide`).
- **`GreenhouseFloatingSurface` NO es consumer de regiones** (anclado-transitorio); puede compartir motion tokens/VT, no entra al grid.
- **Chrome del layout (navbar + footer) NO son regiones.** La estructura real es `VerticalLayout → StyledContentWrapper → [navbar · LayoutContent · footer]`: el navbar y el **footer institucional de Efeonce** son hermanos de `LayoutContent`, persistentes y globales, que **envuelven** el contenido. El Composition Shell compone SOLO el contenido de la página (lo que va dentro de `LayoutContent`/`children`); el navbar/footer quedan **intactos, afuera del substrato**. **Nunca** modelar el footer/navbar como una región. Distinción crítica: **`dock` ≠ footer** — `dock` es un composer/action dock *per-surface, dentro* del contenido (parte de la composición); el footer es el chrome global *afuera*.

---

## 11. Disciplina de tokens (design-system-governance)

- Motion: solo `motion/core/tokens.ts` (durations `200/300/400`, eases `emphasized`/`standard`). Cero `ms`/`cubic-bezier` inline.
- Spacing `4n`; radius `theme.shape.customBorderRadius.*` (como px string en `sx`); color `theme.palette.*`/`theme.axis.*`. Cero HEX/px inline.
- Tipografía: variantes/SoT, nunca `fontSize` inline.
- Sin librería de animación nueva (VT + framer-motion + CSS grid + container queries ya cubren).

---

## 12. Protocolo de primitive nueva (P+V+K completo — Slice 2/3)

- Vive en `src/components/greenhouse/primitives/composition-shell/` + export en el barrel + resolver `kind→composición` + reducer.
- a11y/responsive/reduced-motion **horneados**; cero hardcode (tokens).
- **Lab interno** `/admin/design-system/composition-shell` (gate `administracion.design_system`) + page + entrada en `route-reachability-manifest.ts` + entrada en `DesignSystemCatalogView`.
- **GVC** desktop+mobile por composición (`single/leadPlusContext/split/focused` + morph + breakpoints + keyboard).
- Entrada en `docs/architecture/ui-platform/PRIMITIVES.md` (fila Composition Shell).
- Nodo AXIS Figma referenciado (cuando exista).

---

## 13. Hard rules

- **NUNCA** dominio/política en el shell (mecanismo neutral; el dominio entra por `regions` + `composition`).
- **NUNCA** reemplazar `LayoutContent` (aditivo + opt-in + flag default OFF).
- **NUNCA** composición nueva por dominio (kind → composición existente).
- **NUNCA** forkear View Transitions ni motion (reusar `startViewTransition` + motion tokens).
- **NUNCA** región repetible (singleton — constraint VT).
- **NUNCA** modelar el navbar o el footer (chrome global del layout) como una región del Composition Shell. Viven en `VerticalLayout`, fuera de `LayoutContent`, persistentes; el substrato solo compone el contenido. `dock` (per-surface, dentro del contenido) ≠ footer (global, afuera).
- **NUNCA** ocultar contenido durante el morph; degradar honesto a swap.
- **NUNCA** flipear `compactContentWidth` a `wide` por una composición.
- **NUNCA** acoplar el card al shell — el card se adapta a su ancho (container query), no al shell.
- **NUNCA** declarar la primitive completa sin: un consumer existente re-expresado que **se simplifique** (gate) + GVC desktop+mobile + tests del controller + reducer.
- **SIEMPRE** flag default OFF hasta GVC verde + sign-off; rollout staged (piloto → ampliar).

## 14. Open questions (a resolver en Slice 2)

- `min-inline-size` exacto por región (validar contra consumers + GVC).
- ¿`OrganizationWorkspaceShell` es consumer o queda separado? (depende de si su frontera mapea a `split`).
- Mecánica exacta de la persistencia route-local (V1) vs broad (V2).

## 15. 4-pillar

Heredado del ADR (`GREENHOUSE_COMPOSITION_SHELL_DECISION_V1.md` §4-Pillar Score). Resumen: **Safety** = mecanismo de layout, sin auth/datos; aditivo+opt-in+flag; a11y horneada. **Robustness** = máquina de estados + degradación honesta + never-hidden. **Resilience** = sin signal runtime (honesto); red = GVC + tests + layout-integrity gates (TASK-1018); rollback = flag OFF. **Scalability** = render-time O(1) por surface; VT GPU-compositadas; container queries nativas.

---

## Procedencia

TASK-1114 (substrato). Decisión: `GREENHOUSE_COMPOSITION_SHELL_DECISION_V1.md`. Precedentes: TASK-1028 (Adaptive Sidecar — `resolveAdaptiveSidecarMode` + `reduceAdaptiveSidecarState`), TASK-1045 (Motion primitive + tokens), TASK-525/1102 (`startViewTransition`), TASK-743 (container-query density precedent), TASK-1110 (`NexaMomentComposition` — gate/piloto), TASK-1115 (Adaptive Card — seam). Referencias de mercado: M3 Canonical Layouts, Google AI Overviews/AI Mode.
