# AXIS / Greenhouse Lab — parity audit V1

**Estado:** auditoría abierta; ninguna ruta Greenhouse está autorizada para retiro 2026-08-01  
**Fuente de verdad:** runtime Greenhouse en `src/app/(dashboard)/design-system/**` y sus views  
**Destino evaluado:** `axis-design-system/apps/lab` (Astro 7, static, público)  
**Regla:** una ruta cuenta como migrada únicamente cuando conserva contrato, estados, funcionalidad,
accesibilidad, estética, motion y evidencia comparable. Una fixture HTML/CSS o un contrato de datos aislado
es una **skeleton reference**, no paridad.

## Hallazgo ejecutivo

La extracción previa confundió tres capas distintas:

1. **Contrato portable:** anatomía, estados, accesibilidad, responsive y motion declarados.
2. **Referencia del Lab:** una implementación visual y funcional que permite estudiar el contrato.
3. **Canary de consumidor:** evidencia MUI/Vuexy, Tailwind u otro adapter comparada contra la referencia.

AXIS tiene actualmente 21 contratos y fixtures de referencia, pero no tiene parity probada con las 43 páginas
del Lab Greenhouse. Las fixtures actuales son válidas como punto de partida técnico, no como reemplazo del Lab.
`/design-system` permanece íntegro y es el fallback obligatorio.

## Gate de paridad

| Dimensión | Evidencia mínima exigida |
|---|---|
| Ruta | Correspondencia explícita Greenhouse → ruta Astro y deep link estable |
| Contrato | SSOT AXIS con anatomy, estados, copy, owners, consumers y lifecycle |
| Funcionalidad | Cada control, transición, estado vacío/error/loading y flujo verificable en el Lab |
| Estética | Capturas 1440 px y 390 px, comparación contra Greenhouse y valores computados relevantes |
| Motion | Entrada, interacción, salida, replay/loop si aplica y `prefers-reduced-motion` |
| Accesibilidad | Semántica, teclado, foco, labels, lectura de estado y contraste |
| Consumidor | Canary MUI/Vuexy o Tailwind con diff y decisión `reuse | extend | new` |
| Seguridad/boundary | Sin imports Greenhouse/Globe, auth, APIs privadas, secretos o datos reales en AXIS |

## Matriz ruta por ruta

| Ruta Greenhouse | Naturaleza observada | AXIS actual | Estado de parity | Bloqueador principal |
|---|---|---|---|---|
| `/` | catálogo con filtros de categoría/kind, búsqueda, motion y metadata | `/` catálogo simple | 🔴 no probada | faltan categorías, filtros, copy, motion y evidencia |
| `/colors` | foundation token-backed | `/references/colors/` | 🟡 skeleton | falta compare visual, estados del Lab y canary |
| `/typography` | foundation con roles/familias | `/references/typography/` | 🟡 skeleton | falta parity de specimens, copy, wrapping y captura |
| `/typography/mockup` | mockup editorial de tipografía | ninguna | ⚪ pendiente | artefacto visual, no contrato aislado |
| `/geometry` | spacing/radius con explicación y specimens | `/references/geometry/` | 🟡 skeleton | falta parity de layout, copy y evidencia |
| `/elevation` | roles de sombra y escenarios | `/references/elevation/` | 🟡 skeleton | falta parity de composición, forced-colors y captura |
| `/gradients` | presets, intensidad, selector y animación | `efeonce.gradients` | 🟡 skeleton | faltan presets reales, controles, motion y reduced-motion comparable |
| `/border-beam` | kinds, variants, intensity y replay | `efeonce.border-beam` | 🟡 skeleton | falta interacción completa y coreografía de beam |
| `/motion` | escala, replay y diagnóstico de motion | `efeonce.motion` | 🟡 candidate parity | AXIS reproduce seis duraciones, cuatro easings, las cuatro variantes oficiales, replay y estado manual sin motion; falta compare visual/computed y canary del consumidor |
| `/buttons` | variantes, estados y acciones | `efeonce.button` | 🟡 candidate parity | AXIS ya reproduce las dos boards y 152 controles; falta compare visual/computed contra canary MUI/Vuexy |
| `/chips` | tonos, kinds, avatar y delete action | `efeonce.chip` | 🟡 candidate parity | AXIS reproduce boards light/dark, 72 especímenes, feedback atoms, chips animados y reduced-motion; faltan compare visual/computed y provenance del avatar |
| `/breadcrumbs` | jerarquía, overflow y motion | `efeonce.breadcrumbs` | 🟡 candidate parity | AXIS reproduce cuatro ports, overflow nativo, variantes, cuatro kinds, hit area cómoda y reduced-motion; falta compare visual/computed contra Greenhouse |
| `/disclosure` | disclosure/modal con estado y guardrails | `efeonce.disclosure` | 🟡 candidate parity | AXIS reproduce cuatro triggers, contextualEditor, actionMenu, focus return, Escape, outside press, dirty guard, quickPeek fuera de scope documentado y reduced-motion; falta compare visual/computed y canary del consumer |
| `/loaders` | loading section con variantes y estados | `efeonce.loaders` | 🟡 skeleton | faltan escenas, anuncios, skeletons y motion real |
| `/floating-surfaces` | tooltip/popover/menu y focus return | `efeonce.floating-surface` | 🟡 candidate parity | AXIS reproduce seis variantes, roles, menú/editor, motion y reduced-motion; falta compare visual/computed y focus return real del consumer |
| `/composition-shell` | composiciones y morph de layout | `efeonce.composition-shell` | 🟡 skeleton | fixture no reproduce regiones ni View Transitions |
| `/surface-recipes` | workbench/report/config con recetas compuestas | `efeonce.surface-recipes` | 🟡 skeleton | falta la experiencia multi-escena completa |
| `/card-density` | driver de ancho, composiciones y replay | `efeonce.card-density` | 🟡 skeleton | falta driver interactivo, morph y charts |
| `/charts` | charts con engine, tooltip y fallback | `efeonce.charts` | 🟡 candidate parity | AXIS reproduce las cinco composiciones reales, selección de etapas, tabs, add-metric, estados, tabla accesible, motion y reduced-motion; falta compare visual/computed contra Greenhouse y canary del consumidor |
| `/roadmap-timeline` | secuencia con variants y estados | `efeonce.roadmap-timeline` | 🟡 skeleton | falta matriz de estados, overflow y motion |
| `/team-avatar-group` | avatars, overflow y labels | `efeonce.team-avatar-group` | 🟡 skeleton | faltan assets/variants/overflow semantics |
| `/utilities` | activity/evidence utilities compuestas | `efeonce.activity-timeline` | 🟡 skeleton | falta la suite de utilities; timeline no equivale a toda la ruta |
| `/brand-logos` | governance + assets reales + provenance | `efeonce.brand-logos` | 🟡 gate parcial | faltan assets aprobados, checksum, variants y compare visual |
| `/efeonce-brand` | wordmark orbital, SVG semántico y replay | `efeonce.brand-motion` | 🟡 skeleton | no se trasladó asset, SVG nodes, variantes ni motion real |
| `/gamification` | leaderboard card, podium, variants y paginación | `efeonce.leaderboard` | 🟡 skeleton | falta card completa, variants, current user y paginación |
| `/microinteractions` | suite de transiciones y feedback | ninguna | ⚪ pendiente | múltiples primitives, estados y timelines |
| `/axis-adapters` | comparación de consumidores | ninguna | ⚪ pendiente | debe consumir canaries; no debe mudarse como fixture |
| `/handoff` | workflow con API/readers/write paths | ninguna | ⚪ pendiente | auth, API, readers, mutations, Figma y estado durable |
| `/growth-forms-renderer` | renderer schema/API | ninguna | ⚪ pendiente | contrato server-side, validación y estados de formulario |
| `/native-meeting-scheduler` | scheduler con disponibilidad y booking | ninguna | ⚪ pendiente | integración externa, estados async y datos de agenda |
| `/talent-profile` | superficie workforce | ninguna | ⚪ pendiente | dominio, permisos, datos y flujo de edición |
| `/nexa-answers-experience` | experiencia end-to-end conversacional | ninguna | ⚪ pendiente | composición, chart draw, citations y next-step |
| `/nexa-brand` | branding y chrome Nexa | ninguna | ⚪ pendiente | producto Nexa, assets y motion específico |
| `/nexa-chat` | composer, streaming y states | ninguna | ⚪ pendiente | interacción, streaming, telemetry y product runtime |
| `/nexa-insights` | insights con charts y transitions | ninguna | ⚪ pendiente | datos, charts, states y motion compuesto |
| `/nexa-moment-composition` | composición in-place host/answer | ninguna | ⚪ pendiente | morph, anchoring, citations y view transitions |
| `/nexa-provenance` | trust cue, reasoning y evidence | ninguna | ⚪ pendiente | disclosure/panel real y semantics de grounding |
| `/nexa-response-toolbar` | feedback/copy/share/regenerate | ninguna | ⚪ pendiente | acciones reales, feedback y variants |
| `/nexa-streaming-text` | reveal/stream/caret | ninguna | ⚪ pendiente | timing, replay, never-hidden y reduced-motion |
| `/mockup/brand-color-comparison` | artefacto de propuesta | ninguna | ⚪ pendiente | mockup visual, no primitive portable |
| `/mockup/brand-color-proposal` | artefacto de propuesta | ninguna | ⚪ pendiente | mockup visual, no primitive portable |
| `/mockup/brand-color-system` | artefacto de propuesta | ninguna | ⚪ pendiente | mockup visual, no primitive portable |
| `/figma-link/mockup` | mockup con integración Figma | ninguna | ⚪ pendiente | API privada, preview y link state |

## Decisiones de ejecución

- No crear otra fixture “representativa” sin leer primero la view completa, sus primitives, fixtures, copy,
  estados y escenarios de captura.
- Las 21 entradas AXIS existentes se renombran operativamente como `skeleton reference` hasta que pasen el gate;
  no se retira ni se redirige ninguna ruta Greenhouse.
- La próxima implementación debe cerrar una ruta completa, incluyendo su catálogo, interacción, motion,
  responsive, a11y, capturas y al menos un canary consumidor. El tamaño de la unidad se decide por dominio,
  no por cantidad de líneas.
- Las superficies con API, auth, Figma, Nexa, workforce o scheduler requieren ADR/contrato de frontera antes
  de intentar una versión pública estática. AXIS no debe fingir que una fixture sin backend tiene esa paridad.

## Estado de los cambios publicados

`axis-design-system` tiene publicados `4b661db` y `708a515`, pero esos commits deben considerarse
**reference skeletons**, no cierre de migración. El dominio público `https://axis.efeonce.org` queda como
preview del estado actual; `/design-system` sigue siendo el fallback canónico hasta que la matriz tenga evidencia
verde ruta por ruta.
