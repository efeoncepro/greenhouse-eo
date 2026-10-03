# TASK-1969 — Chrome del portal y saludo con Elio · Wireframe

## Meta

- Task: `TASK-1969` · Flow: `docs/ui/flows/TASK-1969-portal-chrome-and-greeting-elio-flow.md` · Motion: `docs/ui/motion/TASK-1969-portal-chrome-and-greeting-elio-motion.md`
- Dirección aprobada por el operador el 2026-10-02 en el canvas Design «Greenhouse Home renovada» (https://claude.ai/artifact/4Qbk74gjXBkBddx1fjQgQU). Fuente principal: artboard `Main.dc.html` (Home interna); el mismo chrome y saludo están en `Cliente.dc.html` y `Colaborador.dc.html`.
- Programa: `TASK-1967` (hija B). Consumers: `TASK-1971` (interna), `TASK-1854` (clientes), `TASK-1972` (colaboradores).
- Personaje: **Elio** = el Spark rig 2.5D de AXIS (`<efeonce-spark-rig>`, capas v2.2, línea Engine). Asistente del composer: **Nexa**. Elio nunca se rotula «Nexa».
- Modo de dirección: `source-led` (canvas aprobado). Targets: desktop 1440 × 900 y mobile 390 × 844.

## Desktop (≥ 1024 px)

```
┌──────── sidebar 248 px (#001a33) ────────┬──────────────────────── contenido (papel #f7f8f6, max 1240) ────────────────────────┐
│ [logo Efeonce 26 px]          [⧉ colapsar]│ ╭── topbar: tarjeta blanca flotante, radio 12, sombra 1 ─────────────────────────╮ │
│                                            │ │ 🔍 Buscar ⌘K ........................   ☀  ⊞+  🔔•   (JR●)                  │ │
│ ▣ Home · subtítulo           (activo)      │ ╰──────────────────────────────────────────────────────────────────────────────╯ │
│ OPERACIÓN                                  │ ╭── saludo (#001a33, radio 16, padding 40/48) ─────────────────────────────────╮ │
│   ⌂ Agencia · subtítulo              ›     │ │ VIERNES 2 DE OCTUBRE │ ☁ Santiago · 18 °C · Parcial      ╭─ halo azul ─╮     │ │
│   …                                        │ │ Arranca el mes, Julio.   (Bricolage 52/700)              │   [ELIO]    │     │ │
│ ADMINISTRACIÓN …                           │ │ Tienes un cierre crítico y 4 aprobaciones esperando.     │  rig 190 px │     │ │
│ RECURSOS …                                 │ │ ╭──────────────────────────────────────────────╮[→]       │   • • •     │     │ │
│                                            │ │ │ Pregúntale a Nexa sobre tu operación… Enter ↵ │          │ ELIO · EN   │     │ │
│                                            │ │ ╰──────────────────────────────────────────────╯          │   ESPERA    │     │ │
│                                            │ │ (¿Qué falta para el cierre?) (¿Cómo va el OTD…?) (…)     ╰─────────────╯     │ │
│                                            │ │ ┌ conversación con Nexa (se abre aquí al enviar) ┐                          │ │
│                                            │ ╰──────────────────────────────────────────────────────────────────────────────╯ │
│                                            │   … bloques del rol (TASK-1971 / TASK-1854 / TASK-1972) …                        │
│                                            │ ── footer ────────────────────────────────────────────────────────────────────── │
│                                            │ [Greenhouse color] │ Greenhouse™ es una plataforma de Efeonce Group   Enlaces…  │
│                                            │ © 2026 Efeonce Group · Santiago, Chile        (● Todos los sistemas · 6 de 6) v… │
└────────────────────────────────────────────┴──────────────────────────────────────────────────────────────────────────────────┘
```

- **Sidebar**: logo Efeonce negativo arriba (reemplaza el wordmark Greenhouse); al colapsar (71 px) muestra el isotipo Efeonce y los ítems sólo con ícono y tooltip. El ítem activo usa fondo `rgba(207,228,250,.10)`, sin borde lateral. Etiquetas de grupo en mayúsculas `#6f89a2`.
- **Topbar**: tarjeta blanca flotante alineada al ancho del contenido, igual al portal en vivo: búsqueda «Buscar ⌘K» a la izquierda; tema, accesos rápidos, notificaciones con punto rojo y avatar con punto verde «en línea» a la derecha (sin nombre ni cargo).
- **Saludo**: dos columnas que se apilan: texto (flex 999, mín. 420 px) y columna fija de 320 px con Elio centrado sobre un halo radial azul (sin anillo; el anillo existe sólo como opción de diseño apagada). Bajo Elio, el indicador de pensamiento (tres esferas) y la etiqueta «ELIO · <ESTADO>» en una línea.
- **Composer**: campo blanco de 60 px, sin lupa, placeholder «Pregúntale a Nexa sobre tu operación…», indicación «Enter ↵» y botón navy de 44 px. Debajo, tres sugerencias como burbujas de 34 px (esquinas 4/16/16/16: superior izquierda casi recta) que vienen del bloque del rol.
- **Conversación**: al enviar, un panel `#091951` se abre debajo del campo dentro del saludo (ver flow). Las sugerencias se ocultan mientras está abierto y el placeholder pasa a «Sigue la conversación con Nexa…».
- **Footer**: wordmark Greenhouse a todo color con divisor y «Greenhouse™ es una plataforma de Efeonce Group»; enlaces por audiencia (internos: Centro de ayuda, Knowledge, Novedades, Privacidad, Términos; clientes: Pulse, Proyectos, Ciclos, Novedades, Centro de ayuda, Privacidad). Segunda fila: «© 2026 Efeonce Group · Santiago, Chile», píldora de estado de plataforma con punto que late y versión.
- **Novedades** (componente compartido): tarjeta con foto 16:9 en registro cine, etiqueta de línea (Engine/Brand), kicker, título Bricolage, bajada, enlace y tres pestañas con progreso; rota cada 7 s. El texto va bajo la foto, nunca encima con velo.

## Mobile (< 760 px)

```
┌──────────── 390 ────────────┐
│ [Efeonce]              [☰]  │  barra superior fija (#001a33)
│ ╭ Buscar ⌘K ........ ☀ … ╮   │
│ ╭── saludo ──────────────╮  │
│ │      [ELIO 130 px]     │  │  Elio arriba, escala 0,68
│ │        • • •           │  │
│ │    ELIO · EN ESPERA    │  │
│ │ VIERNES 2 DE OCTUBRE   │  │
│ │ ☁ Santiago · 18 °C     │  │  fecha y clima en dos líneas, sin divisor
│ │ Arranca el mes, Julio. │  │  34 px
│ │ Tienes un cierre…      │  │  19 px
│ │ [Pregúntale a Nexa… →] │  │
│ │ (burbuja) (burbuja)    │  │  burbujas que hacen wrap
│ ╰────────────────────────╯  │
│ … bloques del rol …         │
│ footer apilado              │
└─────────────────────────────┘
```

- El botón ☰ abre y cierra las secciones del menú bajo la barra (no es drawer); la barra queda fija arriba.
- Márgenes de 16 px; sin scroll horizontal de página.

## Regiones y datos

| Región | Dato | Fuente (TASK-1970 salvo indicación) |
|---|---|---|
| Fecha y clima | fecha local, ciudad, °C, condición | bloque `weather` (oculto si falla) |
| Título y bajada | saludo por hora y resumen del día | `load-hero-ai.ts` + bloque de foco del rol |
| Sugerencias | 3 preguntas del rol | bloque del rol (`SUGGESTIONS_BY_AUDIENCE` se reemplaza por sugerencias por bloque) |
| Conversación | pregunta, respuesta, fuente, acciones | runtime Nexa existente (`POST /api/home/nexa`) |
| Estado de Elio | expresión y etiqueta | estado local del composer (no de la API) |
| Novedades | foto, línea, kicker, título, bajada, enlace | bloque `announcements` |
| Estado de plataforma y versión | rollup y versión | bloque `platform-status` |

## Accesibilidad

- Elio: `role="img"` con `aria-label` «Elio · <estado>»; el indicador de pensamiento tiene `role="status"` y `aria-live="polite"` con la palabra del estado (el estado nunca depende sólo del movimiento).
- Composer: `<form>` con `<label>` oculto «Pregúntale a Nexa»; Enter envía; el botón tiene `aria-label` «Enviar pregunta a Nexa».
- Conversación: `role="log"`, `aria-live="polite"`; botón cerrar con `aria-label`; el foco vuelve al campo al cerrar.
- Menú colapsado: cada enlace conserva nombre accesible (`title`/`aria-label`). Botón ☰ con `aria-expanded`.
- Contraste: texto sobre `#001a33` ≥ 4,5:1 (`#cfe4fa`, blanco); foco visible `#2fb8ff` en oscuro y `#0375db` en papel.

## Implementation Mapping

- Chrome: `src/components/layout/vertical/Navigation.tsx` + `src/components/layout/shared/Logo.tsx` (variante `sidebar` pasa a los assets Efeonce de `resolveBrandAssets('efeonce')`, con el isotipo que ya conmuta al colapsar); `src/components/layout/vertical/FooterContent.tsx` (wordmark Greenhouse desde el SSOT de marca, estado y versión); `src/components/layout/vertical/Navbar.tsx` (tarjeta flotante con tokens de elevación, preservando el reflow del sidecar).
- Saludo: primitive nueva `GreenhouseGreetingHero` en `src/components/greenhouse/primitives/` con props `title`, `subtitle`, `eyebrow`, `weather`, `suggestions`, `composer`; reemplaza `HomeHeroAi.tsx` en Home v2 y se monta en `/my`.
- Elio: `<SparkRig line="engine">` de `@efeoncepro/axis-graphic-line/react` (≥ 0.14.0) con capas servidas como estáticos versionados (`sparkRigBase('engine', '/static/sparks-rig/v2.2/')`).
- Conversación: `NexaMomentComposition` (`src/components/greenhouse/primitives/nexa-moment-composition/`) + `useNexaPersistentRuntime`; burbujas `nexa-conversation-bubble` / `nexa-answer-bubble`.
- Novedades: componente `GreenhouseAnnouncementCard` (nuevo) que consume el DTO del bloque `announcements`.
- Copy: `src/lib/copy/home.ts` [crear si no existe] + `GH_NEXA` en `src/lib/copy/nexa.ts`.

## GVC Scenario Plan

- Escenario: `scripts/frontend/scenarios/home-greeting-elio.scenario.ts`
- Ruta: `/home` (admin) y `/my` (colaborador) con flag de la variante encendida para el usuario agente.
- Viewports: 1440 × 900 y 390 × 844; `qualityProfile: premium`.
- Pasos: cargar → mark `greeting-idle` → foco en el campo → mark `greeting-listening` → clic en una sugerencia → mark `greeting-working` → esperar respuesta → mark `greeting-answer` → cerrar → colapsar menú → mark `chrome-collapsed` → scroll al footer → mark `footer`.
- `data-capture`: `portal-vertical-nav`, `home-greeting`, `home-conversation`, `home-announcements`, `portal-footer`.
- Assertions: Elio visible con capas cargadas; etiqueta «Elio · …» presente; no aparece el texto «Nexa» en la etiqueta de Elio; scroll-width = viewport en ambos tamaños.
- Reduced motion: captura con `prefers-reduced-motion: reduce` (esferas quietas, sólo ojos de Elio).

## Design Decision Log

- Elio en vez de la ilustración de Nexa: el operador pidió el rig 2.5D de AXIS y luego aclaró que el Spark se llama Elio y no es Nexa.
- Halo sin anillo: el operador probó quitar el anillo (2026-10-02) y lo aprobó; el anillo competía con el anillo propio del Spark.
- Conversación in-place: el operador pidió que Enter abra Nexa debajo, no que navegue; coherente con `CONVERSATIONAL_EXPERIENCE.md` (TASK-1110).
- Burbujas pequeñas con esquina recta: pedido explícito del operador; reemplazan la grilla de prompts.
- Logo Efeonce arriba y Greenhouse al footer: pedido del operador; el footer se reconstruyó desde `FooterContent.tsx` real.
- Sin aviso de IA generativa en la portada: el operador lo pidió fuera; si se exige, va dentro de la conversación junto a la fuente.
