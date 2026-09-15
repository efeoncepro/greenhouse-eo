# TASK-1874 / Application 360 — Wireframe: aviso de enlace no legible en «Perfil del candidato»

## Meta

- Status: `draft` (v1 2026-09-12; dirección visual heredada, sin exploración nueva)
- Owner task: `TASK-1874 — Application 360: aviso de enlace no legible en «Perfil del candidato» (consumer de TASK-1873)`
- Product Design asset: la superficie ya tiene dirección aprobada y capturada — Application 360 (`TASK-355`, GVC
  `task355-hiring-application-360`) con la tarjeta «Perfil del candidato» extendida por `TASK-1688`
  (`docs/ui/wireframes/TASK-1688-careers-application-contact-completeness.md`, scorecard
  `docs/ui/reviews/TASK-1688-careers-application-contact-completeness.scorecard.json`). Esta task agrega un aviso de
  copy dentro de esa tarjeta y corrige un empty state; no abre una dirección visual nueva.
- Visual direction mode: `repo-native-benchmark`
- Direction rationale: el aviso hereda el patrón de `Alert severity='info'` ya usado en el mismo overview («Datos
  personales enmascarados por defecto…», `Application360View.tsx` L1036) y el vocabulario de filas etiqueta/valor de la
  tarjeta. Cero primitives nuevas; cero cambios de layout fuera de la tarjeta.
- Intended consumers: reclutador / hiring manager / People Ops con `gestion.hiring_application_detail` +
  `hiring.application.read` en `/agency/hiring/applications/[applicationId]` (tab Resumen).
- Copy source: `src/lib/copy/dictionaries/es-CL/hiringDesk.ts` y `en-US/hiringDesk.ts` → namespace existente
  `application.*` (claves nuevas listadas abajo). Tono validado con `greenhouse-ux-writing` (es-CL, tuteo al operador;
  el candidato en tercera persona, como «Mensaje del candidato»).
- Primitive decision: `reuse` — MUI `Alert` (`severity='info'`, `variant='outlined'`, icono Tabler `tabler-link-off`,
  ya usado en 6 lugares del portal) dentro del `Stack` de `CandidateContextCard`; `Typography body2` para el empty state
  del bloque «Portafolio y enlaces». Sin componente nuevo.
- UI ready target: `no` (el contrato de datos `HiringApplication.intakeWarnings` lo entrega `TASK-1873`; sin él no hay
  nada que renderizar).

## Brief

- Primary user: la persona de Hiring que abre una postulación para decidir el primer contacto.
- User moment: acaba de entrar a la Application 360 (tab Resumen) y lee la tarjeta «Perfil del candidato» para saber
  cómo contactar y qué material tiene (CV, LinkedIn, portafolio).
- Job to be done: saber que el candidato SÍ envió un enlace que el intake no pudo leer, para pedirlo en el primer
  contacto en vez de asumir que no lo tiene.
- Primary decision signal: «¿le pido el LinkedIn/portafolio o ya lo tengo?». Hoy la tarjeta contesta mal: «Sin enlaces
  públicos informados» cuando el candidato informó uno ilegible (`ISSUE-172`, follow-up de la revisión de talento).
- Non-goals: mostrar el enlace crudo (nunca existe en el contrato: `TASK-1873` persiste sólo `{ code, field }`);
  permitir corregir el enlace desde el portal (`TASK-1729`, self-service del candidato); rediseñar la tarjeta o el
  overview; tocar otros tabs.

## Desktop Target — 1440×1000 (tab Resumen, columna izquierda)

```text
┌ Alert info: «Datos personales enmascarados por defecto — se revelan con motivo y quedan auditados.» ┐
┌ Paper outlined · CandidateContextCard · data-capture="application-contact-summary" ────────────────┐
│ Perfil del candidato                                                                                │
│ Vacante ................................................ Product Designer Senior                     │
│ Fuente ................................................. Careers público                             │
│ Postulación ............................................ 12 sept 2026                                │
│ Email .................................................. c•••••@•••••.com                            │
│ Teléfono ............................................... +56 9 •••• ••••                             │
│ País de residencia ..................................... Chile                                       │
│ ┌ Alert severity="info" variant="outlined" · icono tabler-link-off ─────────────────────────────┐   │
│ │ Enlace que no pudimos leer                                                       (AlertTitle)  │   │
│ │ Envió un enlace de LinkedIn que no pudimos leer; pídelo en el primer contacto.                 │   │
│ └────────────────────────────────────────────────────────────────────────────────────────────────┘   │
│   data-capture="application-intake-warning"                                                         │
│ ── Mensaje del candidato ─────────────────────────────────────────────────────────────────────────  │
│ «Hola, adjunto mi CV…» (bloque existente, sin cambios)                                              │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

Columna derecha (sin cambios de estructura): «Afinidad con el rol» y el bloque «Portafolio y enlaces».

```text
┌ Paper outlined · «Portafolio y enlaces» ───────────────────────────────┐
│ [Portafolio ↗]  [LinkedIn ↗]            ← botones sólo si hay url       │
│ Sin enlaces públicos informados.        ← hoy, si no hay ninguno        │
│ Informó enlaces, pero no pudimos leerlos.  ← NUEVO: si no hay url y hay │
│                                              warnings `url_discarded`   │
└─────────────────────────────────────────────────────────────────────────┘
```

Reglas de composición:

- El aviso va DESPUÉS de las filas de contacto y ANTES del bloque «Mensaje del candidato», separado por el mismo
  `borderBlockStart: 1 / divider` que usa el mensaje (`pt: 2.25`). Es una fila más de la tarjeta, no una segunda tarjeta
  (card-on-card es `BLOCK` por el estándar premium).
- El aviso se renderiza SÓLO si `item.application.intakeWarnings` contiene al menos un `url_discarded`. Sin warnings, la
  tarjeta queda byte a byte como hoy (baseline `TASK-1688`).
- El empty state del bloque «Portafolio y enlaces» cambia de copy SÓLO cuando no hay ninguna url y hay warnings; si hay
  al menos una url legible, se muestran los botones que correspondan y el aviso de la izquierda cubre el resto.
- Densidad: la tarjeta ya usa `useContainerDensity('auto')` (`condensed` reduce paddings); el aviso hereda el
  `spacing` del `Stack` y no fija anchos. Texto con `overflowWrap: 'anywhere'`.

## Mobile Target — 390×844

```text
┌ Alert info (enmascarado) ─────────────────────────┐
┌ Perfil del candidato ─────────────────────────────┐
│ filas etiqueta/valor apiladas (como hoy)          │
│ ┌ Alert info · tabler-link-off ─────────────────┐ │
│ │ Enlace que no pudimos leer                    │ │
│ │ Envió un enlace de LinkedIn que no pudimos    │ │
│ │ leer; pídelo en el primer contacto.           │ │
│ └───────────────────────────────────────────────┘ │
│ Mensaje del candidato …                           │
└───────────────────────────────────────────────────┘
┌ Afinidad con el rol ──────────────────────────────┐
┌ Portafolio y enlaces ─────────────────────────────┐
│ Informó enlaces, pero no pudimos leerlos.         │
└───────────────────────────────────────────────────┘
```

Una columna (`Grid xs=12`), el aviso ocupa el ancho de la tarjeta; el icono no se oculta (16px). Sin scroll
horizontal de página: `scrollWidth === clientWidth` en 390.

## Action Hierarchy

- Primary: ninguna. El aviso es informativo y NO tiene botón (no hay acción posible: el enlace no existe en el
  sistema; la acción real ocurre fuera —pedirlo en el primer contacto—).
- Secondary: los botones existentes «Portafolio»/«LinkedIn» cuando hay url legible.
- Destructive: ninguna.
- Pending / disabled: no aplica; la página es server-rendered y el aviso llega con el snapshot.

## Copy Ledger (claves nuevas en `application.*`, es-CL / en-US)

| Clave | es-CL | en-US | Uso |
|---|---|---|---|
| `application.intakeWarningTitle` | Enlace que no pudimos leer | Link we could not read | `AlertTitle` |
| `application.intakeWarningLinkedin` | Envió un enlace de LinkedIn que no pudimos leer; pídelo en el primer contacto. | They sent a LinkedIn link we could not read; ask for it at first contact. | 1 warning `linkedinUrl` |
| `application.intakeWarningPortfolio` | Envió un enlace de portafolio que no pudimos leer; pídelo en el primer contacto. | They sent a portfolio link we could not read; ask for it at first contact. | 1 warning `portfolioUrl` |
| `application.intakeWarningBoth` | Envió enlaces de LinkedIn y portafolio que no pudimos leer; pídelos en el primer contacto. | They sent LinkedIn and portfolio links we could not read; ask for them at first contact. | 2 warnings |
| `application.linksNotReadable` | Informó enlaces, pero no pudimos leerlos. | Links were provided, but we could not read them. | empty state del bloque «Portafolio y enlaces» con warnings |
| `application.noPublicLinks` | Sin enlaces públicos informados. | No public links provided. | empty state actual, tokenizado al tocarlo (hoy literal en JSX L1059) |

Reglas de copy (`greenhouse-ux-writing`): sujeto = el candidato en tercera persona («Envió»), operador en tuteo
(«pídelo»); sin culpa ni tecnicismos («ilegible», «scheme», «javascript:» NO aparecen); una sola frase con la acción
al final; `AlertTitle` sin punto final; en-US redefine todas las claves (paridad `hiring-desk-stage-locale-parity`).

## State Inventory

| Estado | Render |
|---|---|
| Sin warnings (legacy y actual) | tarjeta idéntica a hoy; empty state «Sin enlaces públicos informados.» |
| 1 warning `linkedinUrl`, sin urls | aviso con copy LinkedIn; empty state «Informó enlaces, pero no pudimos leerlos.» |
| 1 warning `portfolioUrl`, sin urls | aviso con copy portafolio; mismo empty state |
| 2 warnings, sin urls | aviso con copy «ambos»; mismo empty state |
| 1 warning + la otra url legible | aviso del campo descartado; botón de la url legible; sin empty state |
| Warnings con código desconocido | el reader (`TASK-1873`) ya los filtró: no llegan al view model; nada se renderiza |
| Loading | no aplica (server component + view con `initialItem`); no hay skeleton nuevo |
| Error del reader | comportamiento de página existente (`notFound`/error boundary); sin cambio |
| Permission denied | guard de página existente (`/401`); sin cambio |
| Long content | el copy es fijo y corto; `overflowWrap: 'anywhere'` por consistencia con las filas |
| Mobile / compact | una columna; aviso a ancho completo; densidad `condensed` hereda paddings |
| Keyboard / focus | sin elementos interactivos nuevos; el orden de tabulación no cambia |
| Reduced motion | sin animación agregada; el `Alert` no anima |

## Accessibility Contract

- `Alert` de MUI expone `role="alert"` por defecto; para un aviso estático usar `role="status"` (no interrumpe al
  lector de pantalla al montar) — decisión: `role='status'` + `aria-live` implícito polite.
- Icono `aria-hidden`; el significado va en el texto.
- Contraste: `severity='info'` `variant='outlined'` sobre `Paper` usa tokens del theme (`info.main` texto/borde); sin
  colores literales.
- No se añade un enlace ni botón: nada que enfocar; nada que anunciar dos veces.

## Implementation Mapping

| Surface | Reuse | Cambio |
|---|---|---|
| `src/views/greenhouse/hiring/Application360View.tsx` → `CandidateContextCard` (L200-247) | `Stack`, `Typography`, divider pattern del mensaje | render condicional del `Alert` con `data-capture='application-intake-warning'` entre las filas de contacto y el mensaje |
| `Application360View.tsx` → bloque «Portafolio y enlaces» (L1054-1060) | `Typography body2 color='text.secondary'` | empty state elige `linksNotReadable` vs `noPublicLinks` según `intakeWarnings.length > 0`; literal actual tokenizado |
| `src/lib/copy/dictionaries/es-CL/hiringDesk.ts` + `en-US/hiringDesk.ts` | namespace `application.*` | 6 claves nuevas (tabla arriba) |
| Reader | `getHiringApplicationById` → `HiringApplication.intakeWarnings` (`TASK-1873`) | ninguno; la vista sólo lee |
| Helper de copy | función pura `resolveIntakeWarningCopy(warnings, copy)` junto al componente (o en `src/lib/hiring/view-model` si ya existe uno para la desk) | devuelve `{ title, body } \| null`; testeable sin DOM |
| Tests | `src/views/greenhouse/hiring/*.test.tsx` (patrón `application-dossier-panel.test.tsx`) | `application-intake-warning.test.tsx`: 5 estados de la tabla |
| GVC | `scripts/frontend/scenarios/task355-hiring-application-360.scenario.ts` | nuevo escenario focal `task1874-application-intake-warning.scenario.ts` con marker `application-intake-warning` |

## GVC Scenario Plan

- Scenario file: `scripts/frontend/scenarios/task1874-application-intake-warning.scenario.ts` (focal; no se altera el
  baseline de `task355`).
- Route: `/agency/hiring/applications/[applicationId]?tab=overview` con una postulación de prueba que tenga
  `intake_warnings` no vacío (creada por la ruta pública de apply con `linkedinUrl` ilegible sobre una vacante de prueba
  con `data_origin` no real; nunca una persona real).
- Viewports: 1440×900 y 390×844.
- Quality profile: `premium` (aunque el rigor sea `ui-lite`, la superficie ya tiene dossier premium y se compara contra
  su baseline).
- Required steps: `press Escape`, `sleep 1000`, `mark application-overview`, `mark application-intake-warning`
  (`clipSelector='[data-capture="application-intake-warning"]'`), `mark application-links-empty`
  (`clipSelector` del bloque «Portafolio y enlaces»; agregar `data-capture='application-public-links'` al Paper).
- Required captures: overview completo (desktop + mobile), aviso recortado, bloque de enlaces recortado.
- Required `data-capture` markers: `application-contact-summary` (existente), `application-intake-warning` (nuevo),
  `application-public-links` (nuevo).
- Assertions: `noLoginRedirect`, `noErrorBoundary`, `runtime.failOnConsoleError`, layout sin scroll horizontal
  (`scrollWidth === clientWidth` en ambos viewports), rubric enterprise sobre `[data-capture="hiring-application"]`.
- Scroll-width checks: página y tarjeta.
- Reduced-motion / focus evidence: captura con `prefers-reduced-motion: reduce` idéntica a la normal (no hay animación);
  recorrido con Tab confirma que el orden no cambió.
- Review dossier: `.captures/<ISO>_task1874-application-intake-warning/` + `pnpm fe:capture:review`; scorecard en
  `docs/ui/reviews/TASK-1874-application-360-discarded-link-notice.scorecard.json`.
- Baseline decision / surface ID: comparar contra `hiring-application-360-v1` (dossier de `TASK-1688`); se acepta sólo
  el delta del aviso y del empty state, ningún cambio incidental de layout.

## Design Decision Log

- Decision: aviso informativo dentro de «Perfil del candidato» (la tarjeta donde el operador decide el primer contacto)
  + empty state coherente en «Portafolio y enlaces». Sin botón: no hay acción in-app posible.
- Alternatives considered: (a) sólo cambiar el empty state de «Portafolio y enlaces» — rechazado: queda a la derecha,
  fuera de la lectura de contacto, y no dice qué pedir; (b) chip de estado junto al título — rechazado: un chip
  «Enlace ilegible» suena a defecto del candidato y no cabe en móvil; (c) mostrar el raw «para que el operador lo
  arregle» — rechazado por contrato (`TASK-1873`: el raw nunca se persiste; un `javascript:` renderizado es un vector).
- Why this pattern: `Alert info outlined` ya es el vocabulario del overview para avisos que explican una ausencia
  (enmascarado por defecto); una fila más en la tarjeta mantiene un solo momento visual dominante.
- Reuse / extend / new primitive: `reuse` total.
- Open risks: el copy del `AlertTitle` es nuevo en la desk (no había títulos en avisos); si en revisión se percibe
  ruido, se deja sólo el cuerpo. La tokenización de `noPublicLinks` toca un literal que hoy no tiene test: cubrirlo.

## What this contract does NOT cover

- Ninguna captura GVC ejecutada todavía (la evidencia se produce en la task, después de `TASK-1873`).
- Paridad con People 360 (`TASK-1733`) o con el packet MCP (`TASK-1718`): esos consumers deciden su propio render.
- Un rediseño de la tarjeta o del overview.
