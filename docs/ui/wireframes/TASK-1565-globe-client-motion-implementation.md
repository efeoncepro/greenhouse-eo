# TASK-1565 — Motion del payload cliente de Globe · Wireframe

## Meta

- Owner task: `TASK-1565 — Motion del payload cliente de Globe (feed + composer)`
- Visual direction mode: `approved-prototype` — 11 keyframes medidos de `Globe Creative Producer.dc.html`
- Product Design asset: `~/Documents/Globe/Producer/Suite de IA Generativa Creativa/Globe Creative Producer.dc.html`
- Related motion: `docs/ui/motion/TASK-1565-globe-client-motion-implementation-motion.md`
- Contrato SSOT: `docs/architecture/creative-studio/GLOBE_CLIENT_MOTION_CONTRACT_V1.md`

> **Este wireframe no dibuja pantallas nuevas: mapea DÓNDE se ancla cada animación** en superficies que ya
> existen. Es el documento que evita que "agregar el motion" se convierta en pegar animaciones donde caigan.

## Mapa de anclajes — feed (`/producer/feed`)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ░░░ AURORA — 3 capas, z-index bajo todo, position: fixed ░░░                 │
│ ░░  auroraA 24s · auroraB 28s · auroraA 32s · alternate                    ░ │
│ ░                                                                          ░ │
│  Mis generaciones  7 ITEMS  (● 2 generando)      [toolbar]                   │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ HERO                                                    ①candIn        │  │
│  │  ┌──────────┐                                                          │  │
│  │  │ ✳ ISOTIPO│ ← ②GlobeGeneratingMark kind="stage"                      │  │
│  │  │  gBreathe│    sólo si la pieza es una corrida ACTIVA                │  │
│  │  │  +gHalo  │    (una pieza terminada no respira)                      │  │
│  │  │  +gFlame │                                                          │  │
│  │  │  +gSpark×4                                                          │  │
│  │  └──────────┘                                                          │  │
│  │  ▓▓▓▓▓░░░░░ ← ③barra de progreso, width --duration-progress linear     │  │
│  │  [Recrear] [👁] [⬇] [★]  ← siempre visibles (no dependen de hover)     │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐                     │
│  │ ①candIn       │  │ ①candIn       │  │ ①candIn       │  .42s both,         │
│  │               │  │  ✳ isotipo    │  │               │  UNA VEZ por        │
│  │  [+]      12cr│  │  kind="inline"│  │               │  stableKey          │
│  │               │  │  ②            │  │               │                     │
│  │        ┌─────┐│  │               │  │               │                     │
│  │        │④    ││  │               │  │               │                     │
│  │        │acc- ││  │               │  │               │                     │
│  │        │iones││  │               │  │               │                     │
│  │        └─────┘│  │               │  │               │                     │
│  │  Título       │  │  Título       │  │  Título       │                     │
│  └───────────────┘  └───────────────┘  └───────────────┘                     │
│   ⑤hover: lift 2px + borde de acento                                         │
│                                                                              │
│  ┌───────────────┐ ← ⑥SKELETON con skel 1.3s linear (estado loading)         │
│  │ ▒▒▒▒▒▒▒▒▒▒▒▒▒ │    hoy es una CAJA ESTÁTICA: no se distingue de roto       │
│  └───────────────┘                                                           │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Mapa de anclajes — composer (`/producer/compose`, si `TASK-1564` está entregada)

```
┌───────────────────────────────┐
│ COMPOSER                      │
│  [prompt]                     │
│  [Ruta ▾] ← ⑦overlayIn .2s    │
│  ┌─────────────────────────┐  │
│  │ RIEL DE ESTIMADO        │  │
│  │ Total estimado  1̶2̶ ̶c̶r̶   │  │ ← ⑧atenuado a opacity .45 EN EL ACTO
│  │ Recalculando…           │  │    + texto (los dos portadores)
│  │ [ Generar (deshab.) ]   │  │
│  │  ✳ isotipo kind="stage" │  │ ← ② el MISMO que el feed
│  └─────────────────────────┘  │
└───────────────────────────────┘
```

## Los ocho anclajes, con su dueño

| # | Anclaje | Elemento | Animación | Alcance |
|---|---|---|---|---|
| ① | entrada de card | `.pf__item`, `.pf__hero` | `candIn` .42s `both` | **una vez por `stableKey`**, no por render |
| ② | isotipo generando | `GlobeGeneratingMark` | `gBreathe`+`gHalo`+`gFlame`+`gSpark`×4 | sólo en `kind === 'active-run'` |
| ③ | barra de progreso | `.pf__progress` (nueva) | `width` `--duration-progress` `linear` | sólo con `coarseProgress` |
| ④ | acciones de card | `.pf__actions` | `opacity`+`transform` `--duration-short` | ⚠️ **contraparte de reduce obligatoria** |
| ⑤ | lift de card | `.pf__item:hover`, `:focus-within` | `transform`+`border`+`shadow` | ya implementado |
| ⑥ | skeleton | `.pf__skeleton` | `skel` 1.3s `linear` | estado `loading` |
| ⑦ | popovers | selectores del composer | `overlayIn` .2s | `TASK-1564` |
| ⑧ | estimado no vigente | riel del composer | `opacity` `--duration-short` | ⚠️ **NO se apaga con reduce** |

## Los dos anclajes que se comportan distinto al resto

Todo el motion de esta task se apaga o se acorta bajo `prefers-reduced-motion`. **Dos no**, y son justamente
los que llevan información:

**④ Las acciones de la card.** Bajo `reduce` no se acorta la transición: pasan a `opacity: 1` +
`pointer-events: auto` **permanente**. Un affordance revelado por movimiento, sin movimiento, deja de existir —
no se pierde una animación, se pierden cinco acciones por card. **Es un defecto vigente hoy**, no una mejora.

**⑧ El estimado atenuado.** Bajo `reduce` la transición se acorta, pero **el estado atenuado se conserva**:
no es decoración, es información sobre plata. El portador redundante es el texto `estimateStale`, y los dos se
mantienen.

## Jerarquía de anclajes

Si hubiera que apagar motion por presupuesto de frames, este es el orden de sacrificio:

1. **Aurora** — puro ambiente, cero información.
2. **`candIn`** — agradable, no informa.
3. **Shimmer del skeleton** — informa poco (el skeleton ya comunica por forma).
4. **Barra de progreso** — informa; su valor puede saltar sin transición.
5. **Isotipo generando** — el último. Es el momento de marca y el que responde «¿está pasando?».

## Fidelity mapping

| Valor del prototipo | Token del SSOT |
|---|---|
| `cubic-bezier(.2,.8,.2,1)` | `--ease-enter` — **ya coincide**, sin conversión |
| `3.2s` (breathe + halo) | `--duration-breathe` — **un token para los dos**, es el mecanismo de la fase |
| `.85s` (flame) | `--duration-flame` |
| `1.5/1.8/2+.9/1.6s` (sparks) | **sin token, a propósito** — lo que importa es que sean distintas |
| `.42s` (candIn) | `--duration-long` |
| `.2s` (overlayIn) | `--duration-overlay` |
| `.3s` (sheetIn) | `--duration-sheet` |
| `1.3s` (skel) | `--duration-skeleton` |
| `.18s` (progreso) | `--duration-progress` |
| `24s/28s/32s` (aurora) | **sin token** — un token invitaría a unificarlas, que es el defecto |
| `linear` | `--ease-linear` — token para que el gate no lo lea como literal |
| `ease-in-out` (flame) | `--ease-pulse` |

## Verificación visual

Cinco capturas, en **dos modos** cada una (normal y `prefers-reduced-motion` emulado):

| Captura | Qué prueba |
|---|---|
| `reposo` | aurora presente; cards sin acciones visibles (modo normal) |
| `hover-acciones` | acciones reveladas por hover |
| `generando` | isotipo animado en una corrida activa + progreso textual |
| `reduce-acciones` | ⚠️ acciones **visibles sin hover** y clickeables |
| `reduce-generando` | ⚠️ isotipo **presente y quieto** + progreso textual presente |

Las dos últimas son la mitad del valor de la task. Un canary que sólo captura el modo normal no verifica nada
del contrato de accesibilidad.
