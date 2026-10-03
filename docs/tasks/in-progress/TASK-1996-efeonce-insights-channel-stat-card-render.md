# TASK-1996 — Efeonce Insights: tarjetas de cifra con isotipo de canal y glifos Trazo en PDF, deck y Think

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `layout`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1996-efeonce-insights-channel-stat-card-render.md`
- Flow: `none`
- Motion: `docs/ui/motion/TASK-1975-efeonce-insights-stat-card-motion.md`
- Backend impact: `none`
- Epic: `EPIC-045`
- Status real: `En curso 2026-10-03: AXIS v0.3.42 publicado; isotipo por celda o en el título en A4, deck (643d38846) y Think (42b45bf, 759100a, fb27adb); faltan glifos Trazo para las métricas sin uno y los 10 isotipos sin productor`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `TASK-1975` (tarjeta de cifra base en los catálogos y Think), `TASK-1990` (contrato con canal, contexto y glifo), publicación de AXIS (push + tag `v0.3.42`, `@efeoncepro/axis-brand-assets` 0.4.15 y glifos D30) con OK del operador
- Branch: `Greenhouse develop y efeonce-think main; sin worktrees ni rama por task`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Lleva a los catálogos `insights-report` (A4) e `insights-deck` (16:9) y a la vista web de Think la tarjeta de cifra con
isotipo de canal aprobada el 2026-10-03: disco blanco con el isotipo oficial de AXIS cuando la cifra es de una
plataforma (ChatGPT, Gemini, Claude, Perplexity, AI Overview, Google, Google Ads, YouTube, Reddit…), el canal una vez
en el título cuando todo el tablero es de una plataforma (Search Console, Greenhouse) y los glifos Trazo de La órbita
en lugar de los íconos Tabler. Corrige además el isotipo de AI Overview, que hoy es la G de Google, por la lupa en
color.

## Why This Task Exists

- `src/lib/artifact-composer/catalogs/insights-shared/channels.ts` asigna a `google_ai_overview` el mismo archivo que a
  Google («`google_ai_overview` es Google: mismo isotipo»); el inventario aprobado usa la lupa en color de AXIS.
- Los catálogos tienen 5 isotipos copiados a mano en `assets/channels/` y el contrato aprobado exige 19 plataformas
  desde `AXIS_PLATFORM_ASSETS`, con sello.
- La tarjeta dibuja íconos de trazo con rutas Tabler inline (`icon-set` de `report-figure-stat.html`,
  `FIGURE_ICON_KEYS` en `insights-shared/editorial-resolvers.ts`) y el mapa fijo `METRIC_ICON` en
  `src/lib/efeonce-insights/render/figure-slots.ts`; AXIS fijó el set Trazo (44 glifos, D30 para Insights).
- La tarjeta no sabe dibujar canal, contexto ni canal de tablero (contrato 0.2.0). Greenhouse consume hoy
  `@efeoncepro/axis-brand-assets` 0.4.10, `@efeoncepro/axis-graphic-line` 0.11.0, `@efeoncepro/axis-tokens` 0.3.41 y
  `@efeoncepro/axis-ui-contracts` 0.3.40.

Se decidió una task propia y no un delta de TASK-1975 porque esa task ya está code complete con rollout pendiente
(arquitectura §14.12) y sumarle alcance retrasaría su release.

## Goal

- PDF A4, deck y Think dibujan las tres colocaciones aprobadas (canal por celda, canal en el título, glifo) con los
  isotipos y valores de AXIS, sin px ni colores literales.
- AI Overview muestra la lupa en color en todas las superficies.
- Los íconos de las cifras son glifos Trazo; los frames que cambian se rebaselinan con declaración.
- Fidelidad ≤ 1 % contra las hojas `Premium-Cifras-Canal` y `Deck-Cifras-Canal` exportadas.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md` (§6.3, §6.4, §14.12, §15)
- `docs/architecture/EFEONCE_INSIGHTS_CHART_SELECTION_CRITERIA_V1.md` (§5.1, §5.2, §11)
- `docs/architecture/agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md` (Artifact Composer: render hermético, cero HEX ni fuentes literales)
- AXIS: `docs/agent-composition/insights.md` §«Tarjeta con isotipo de canal» y `docs/agent-composition/iconography.md`
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`

Reglas obligatorias:

- Ningún isotipo dibujado a mano, recoloreado ni recortado: archivos de `AXIS_PLATFORM_ASSETS` con sello verificado.
- Ningún valor de diseño literal: disco, proporción, filete y colores vienen de `efeonceInsights.statCard.channel` y
  de los roles editoriales.
- El catálogo viaja solo al worker: los isotipos se copian dentro del catálogo por script, no se leen del paquete en
  tiempo de render.
- Think imprime lo que trae el modelo web 1.5; no decide canal ni glifo.
- Gate visual a cero píxeles fuera de los frames declarados en `BASELINE_DELTAS.md`.

## Normative Docs

- `docs/tasks/in-progress/TASK-1975-efeonce-insights-new-figure-pages.md`
- `docs/tasks/to-do/TASK-1990-efeonce-insights-channel-stat-card-contract.md`
- `docs/ui/visual-directions/TASK-1975-efeonce-insights-stat-card-direction.md`
- `docs/ui/motion/TASK-1975-efeonce-insights-stat-card-motion.md`

## Dependencies & Impact

### Depends on

- `TASK-1975`: plantillas `report-figure-stat` e `insights-figure-stat`, `StatCard.astro` en Think.
- `TASK-1990`: `channel`, `context`, `metricIcon` y canal del tablero en el plan y el modelo web 1.5.
- AXIS publicado (push a `main` y tag) con `@efeoncepro/axis-brand-assets` 0.4.15, tokens y contratos 0.3.42 y la
  versión de `@efeoncepro/axis-graphic-line` con los glifos D30.

### Blocks / Impacts

- Verificación con datos reales de TASK-1991, TASK-1992 y TASK-1994 (sus tableros se ven aquí).
- `TASK-1958`: comparte las páginas de capítulo; coordinar el orden de merge en los catálogos.

### Files owned

- `src/lib/artifact-composer/catalogs/insights-shared/channels.ts`
- `src/lib/artifact-composer/catalogs/insights-shared/editorial-resolvers.ts` (`FIGURE_ICON_KEYS`)
- `src/lib/artifact-composer/catalogs/insights-report/report-figure-stat.html` y su `*.slots.json`
- `src/lib/artifact-composer/catalogs/insights-deck/insights-figure-stat.html` y su `*.slots.json`
- `src/lib/artifact-composer/catalogs/insights-report/assets/channels/**` y `insights-deck/assets/channels/**`
- `src/lib/efeonce-insights/render/figure-slots.ts` (`buildStatSlides`, retiro de `METRIC_ICON`)
- `scripts/insights/sync-platform-isotypes.ts` (nuevo)
- `scripts/insights/canvas-fixtures/{report,deck}/` (fixtures de cifras con canal)
- `package.json` (versiones AXIS)
- `efeonce-think`: `src/components/insights/StatCard.astro`, `src/lib/insights.ts`, `src/lib/insights-icons.ts`, `src/styles/insights.css`, `tests/insights.test.ts`

## Current Repo State

### Already exists

- Tarjeta de cifra en ambos catálogos y en Think (TASK-1975, code complete, rollout pendiente).
- `CHANNEL_ISOTYPES` con 6 canales y 5 archivos (`google`, `chatgpt`, `gemini`, `claude`, `perplexity`) en
  `insights-shared/channels.ts`; `channelIsotypeEffects` quita el disco si el canal no tiene isotipo.
- Harness de fidelidad `pnpm insights:canvas-fidelity` y gate `pnpm composer:visual-gate --catalog=insights`.
- En Think: `StatCard.astro`, `insights-icons.ts`, `scripts/capture-insights-report.mjs`,
  `scripts/audit-insights-a11y.mjs`.

### Gap

- AI Overview con la G de Google; 14 plataformas sin isotipo en el catálogo.
- La tarjeta no dibuja disco de canal, nombre del canal, contexto ni canal del título.
- Íconos Tabler en vez de Trazo.
- Hojas aprobadas de los tableros con canal no exportadas al repo.

## Modular Placement Contract

- Topology impact: `ui-package`
- Current home: `src/lib/artifact-composer/catalogs/insights-*` (Job artifact-worker) y `efeonce-think` (vista web pública)
- Future candidate home: `ui-package`
- Boundary: los catálogos y Think consumen el plan y el modelo web de Insights vía `statItemView`; los valores de diseño y los isotipos vienen de los paquetes de AXIS
- Server/browser split: los catálogos componen en el worker sin acceso a base ni secretos; Think renderiza en el servidor el modelo web recibido por el proxy de TASK-1848
- Build impact: `actualiza cuatro paquetes de AXIS; isotipos copiados al catálogo por script con verificación de sello`
- Extraction blocker: `none`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: cliente que lee el informe mensual (marketing o marca) en PDF, deck o enlace web; equipo de Efeonce que lo revisa antes de compartir.
- Momento del flujo: lectura de la página de cifras de cada capítulo.
- Resultado perceptible esperado: de un vistazo se sabe de qué canal es cada cifra (ChatGPT, AI Overview, YouTube) y, cuando todo el tablero es de una fuente, se dice una vez en el título.
- Fricción que debe reducir: cifras de motores distintos que sólo se distinguen leyendo el nombre; AI Overview confundido con Google; íconos genéricos ajenos a la línea gráfica.
- No-goals UX: decidir qué cifra lleva canal (TASK-1990), interacción, logos de competidores.

### Surface & system decision

- Surface: páginas `report-figure-stat` (A4), láminas `insights-figure-stat` (16:9) y `StatCard.astro` en la vista web S6.
- Nav placement: `none` — no agrega destino de navegación.
- Composition Shell: `no aplica` — documento de lienzo fijo del Artifact Composer y vista pública de Think.
- Primitive decision: `extend` — la plantilla de tarjeta de TASK-1975 suma las piezas `channel-isotype-disc`, `channel-name`, `channel-context-line` y `title-channel-isotype` del contrato 0.2.0.
- Adaptive density / The Seam: `no aplica` en PDF; en Think la retícula pasa a una columna a 390 px (sin cambio).
- Floating/Sidecar/Dialog decision: no aplica.
- Copy source: `src/lib/copy/insights.ts` (`GH_INSIGHTS`); el contexto llega en el plan.
- Access impact: `none`.

### State inventory

- Default: celda con isotipo y nombre del canal más contexto, o glifo Trazo y nombre de la métrica.
- Loading: no aplica (documento compuesto; Think renderiza en el servidor).
- Empty: sin cifras el tablero no se emite.
- Error: plan que viola el contrato 0.2.0 ⇒ el mapper rechaza con causa.
- Degraded / partial: canal sin isotipo conocido ⇒ sólo el nombre, sin disco.
- Permission denied: no aplica (permisos de la edición y del enlace).
- Long content: nombre del canal o de la métrica ≤ 3 palabras por contrato; contexto en hasta dos líneas.
- Mobile / compact: lámina 16:9 para PDF; una columna a 390 px en Think.
- Keyboard / focus: no aplica (sin controles).
- Reduced motion: la cifra muestra el estado final (contrato de motion de TASK-1975, sin cambio); el disco no se mueve.

### Interaction contract

- Primary interaction: lectura.
- Hover / focus / active: no aplica.
- Pending / disabled: no aplica.
- Escape / click-away: no aplica.
- Focus restore: no aplica.
- Latency feedback: no aplica.
- Toast / alert behavior: no aplica.

### Motion & microinteractions

- Motion primitive: `CSS` (el del contrato de TASK-1975, sin cambio)
- Enter / exit: sin cambio.
- Layout morph: ninguno.
- Stagger: sin cambio.
- Timing / easing token: los del contrato de TASK-1975.
- Reduced-motion fallback: estado final, como hoy.
- Non-goal motion: animar el isotipo o el disco. `Motion` apunta al contrato de TASK-1975 porque la tarjeta del Live sigue animando su cifra; esta task no agrega movimiento.

### Implementation mapping

- Route / surface: salidas `report_pdf` y `deck_pdf`; vista web `think.efeoncepro.com/insights/r/<token>` y `/insights/muestra`.
- Primitive / variant / kind: plantilla de tarjeta de cifra de TASK-1975 con las piezas de canal de 0.2.0.
- Component candidates: hooks de `buildStatSlides`; `channelIsotypeEffects` ampliado; `StatCard.astro`.
- Copy source: `src/lib/copy/insights.ts`.
- Data reader / command: plan congelado (`chapter.stats`) vía `statItemView`; Think lee `InsightWebModelV1` 1.5.
- API parity: sin acción de negocio; ediciones, salidas y enlaces ya tienen API/MCP.
- Access / capability: la de la edición y la del enlace compartido.
- States to implement: los del State inventory.

### GVC scenario plan

- Scenario file: PDF ⇒ `pnpm insights:canvas-fidelity` + `pnpm composer:visual-gate --catalog=insights`; Think ⇒ `scripts/capture-insights-report.mjs` de `efeonce-think`.
- Route: `/insights/r/<token>` en staging y `/insights/muestra` con fixtures 1.5.
- Viewports: A4 794×1123 y 16:9 1280×720 a tamaño físico; Think 1440 y 390.
- Quality profile: `premium`
- Required steps: exportar las hojas aprobadas; fixtures con los datos del canvas; vista previa real de Berel y Sky; captura de Think con fixtures y con el modelo real.
- Required captures: tablero mezclado y tablero de una plataforma en A4 y deck, en color y en gris; Think 1440 y 390.
- Required `data-capture` markers: `data-slot` de cada pieza nueva en los catálogos; marcador de tarjeta en Think.
- Assertions: isotipo correcto por canal (AI Overview = lupa), nunca isotipo y glifo juntos, canal del título sin repetición en celdas, cifras iguales al plan.
- Scroll-width checks: `assertSlideFitsCanvas` en PDF; `scrollWidth <= innerWidth` en Think a 390.
- Reduced-motion / focus evidence: estado final de la cifra con `prefers-reduced-motion` en Think.
- Review dossier: `docs/ui/reviews/TASK-1996-efeonce-insights-channel-stat-card-render/`
- Baseline decision / surface ID: `ReportFigureStatPage` e `InsightsFigureStatSlide` rebaselined por el cambio de iconografía, declarados en `BASELINE_DELTAS.md`; frames nuevos con canal.

### Design decision log

- Decision: colocación del isotipo por celda, en el título o ninguna, según el contrato 0.2.0 aprobado el 2026-10-03.
- Decision: AI Overview con la lupa en color en lugar de la G de Google.
- Decision: glifos Trazo de La órbita en lugar de rutas Tabler.
- Alternatives considered: isotipo siempre por celda (rechazado), isotipo y glifo juntos (rechazado por el contrato), delta de TASK-1975 (rechazado para no retrasar su release).
- Why this pattern: el canal se lee antes que el nombre cuando hay mezcla de fuentes; la línea gráfica unifica la iconografía.
- Reuse / extend / new primitive: `extend`.
- Open risks: publicación de AXIS; rebaseline de frames existentes; tamaño del isotipo de 16 px en el deck con logos de detalle fino (Gemini).

### Visual verification

- GVC scenario: harness del Composer para PDF; `capture-insights-report.mjs` para Think.
- Viewports: A4 y 16:9 a tamaño físico; Think 1440 y 390.
- Required captures: ver GVC scenario plan.
- Required `data-capture` markers: `data-slot` por pieza; marcador de tarjeta en Think.
- Scroll-width check: desborde de lienzo en el harness; `scrollWidth` en Think a 390.
- Accessibility/focus checks: isotipo `alt=""` con nombre en texto; contraste ≥ 4,5:1 de texto y ≥ 3:1 de marca; lectura en gris; `pnpm audit:insights-a11y`.
- Before/after evidence: página de cifras de Berel con íconos Tabler y AI Overview con la G, y después.
- Known visual debt: ninguna declarada al crear la task.
- Visual scorecard: `docs/ui/reviews/TASK-1996-efeonce-insights-channel-stat-card-render.scorecard.json`
- Quality threshold: `average >= 4.5; floor >= 4; fidelity/template resistance >= 4.5`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Dirección durable

- Exportar `Premium-Cifras-Canal`, `Deck-Cifras-Canal`, `Cifras-Canal-Norma` y `Cifras-Canal-Inventario` a tamaño nativo
  en `docs/ui/visual-directions/TASK-1996-efeonce-insights-channel-stat-card/paginas/` con la fuente del canvas, y
  registro `TASK-1996-efeonce-insights-channel-stat-card-direction.md` (fuente, decisión, tokens).
- Wireframe con las hojas enlazadas; `UI ready` pasa a `yes` sólo si `pnpm task:lint --task TASK-1996` queda sin
  hallazgos.

### Slice 2 — Paquetes e isotipos

- Actualizar los cuatro paquetes de AXIS publicados.
- `scripts/insights/sync-platform-isotypes.ts`: copia los 19 isotipos (más la variante mono de AI Overview) a los dos
  catálogos verificando `PLATFORM_ASSET_SEALS`; `CHANNEL_ISOTYPES` con las 19 plataformas y `google_ai_overview` a la
  lupa en color.

### Slice 3 — Catálogos A4 y deck

- Piezas de canal en `report-figure-stat` e `insights-figure-stat`, hooks en `buildStatSlides` y rechazo con causa de
  planes que violen 0.2.0; iconografía Trazo y retiro de `METRIC_ICON` y de las rutas Tabler.
- Fixtures con los datos del canvas, fidelidad ≤ 1 % en color y gris, rebaseline declarado.

### Slice 4 — Think

- `StatCard.astro` con disco, nombre del canal, contexto y canal del título desde el modelo 1.5; isotipos copiados del
  paquete; glifos Trazo en `insights-icons.ts`; `test:insights`, `verify:insights` y `audit:insights-a11y`.

### Slice 5 — Verificación real y dossier

- Vista previa real de Berel y Sky con `--editorial-v2`; capturas de Think 1440 y 390; dossier y scorecard.

## Out of Scope

- Decidir qué cifra lleva canal o glifo (TASK-1990) y producir los hechos (TASK-1991, TASK-1992, TASK-1994).
- Publicar AXIS: lo autoriza el operador.
- Tarjetas de redes y pauta (sin fuente; TASK-1995).

## Detailed Spec

Región por región, estados, tokens y copy en el wireframe
[`TASK-1996-efeonce-insights-channel-stat-card-render.md`](../../ui/wireframes/TASK-1996-efeonce-insights-channel-stat-card-render.md).
Resumen de colocación (espejo de `efeonceInsights.statCard.channel.placement`):

| Tablero | Título | Celda |
|---|---|---|
| Canales mezclados (motores de IA, AI Overview, asistentes de GA4, plataformas citadas o que rankean) | sin isotipo | disco con isotipo + nombre del canal + contexto |
| Una plataforma (Search Console; Search Console y Google Analytics; Greenhouse) | isotipo una vez | glifo Trazo + nombre de la métrica |
| Sin plataforma (keywords, competidores, enlaces, salud técnica, visibilidad por URL) | sin isotipo | glifo Trazo + nombre de la métrica |

Isotipo por canal: el archivo de `AXIS_PLATFORM_ASSETS` cuya plataforma coincide con el `channelId` del plan; sin
coincidencia, sólo el nombre.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 antes de cualquier JSX/plantilla. AXIS publicado antes del Slice 2. TASK-1990 en develop antes de los Slices
  3 y 4. Slice 5 al final.
- Think se despliega antes o junto con el release de Greenhouse que emite el modelo 1.5.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Rebaseline oculta una regresión ajena | gate visual | medium | sólo los frames declarados en `BASELINE_DELTAS.md`; el resto a 0 px | `composer:visual-gate` rojo |
| Isotipo alterado o sin sello | marca / catálogo | low | script falla cerrado si el sha256 no coincide | error del script |
| Think recibe 1.5 antes de soportarlo | Think | low | campos aditivos; Think 1.4 ignora lo desconocido | `verify:insights` |
| Logo de detalle fino ilegible a 16 px en navy | render | medium | revisión en la hoja exportada y en gris | dossier |

### Feature flags / cutover

- Sin flag propio: el render sigue al plan. Ediciones selladas antes de TASK-1990 se dibujan como hoy salvo el cambio
  de iconografía Trazo, declarado en el rebaseline.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert de docs | < 15 min | si |
| Slice 2 | revert de versiones y archivos | < 15 min | si |
| Slice 3 | revert de plantillas, hooks y baseline | < 30 min | si |
| Slice 4 | revert en `efeonce-think` + redeploy | < 30 min | si |
| Slice 5 | sin cambio de estado: es verificación | inmediato | si |

### Production verification sequence

1. Local: fidelidad, gate visual y vista previa real.
2. Think a producción (con OK del operador) antes o junto con el release de Greenhouse.
3. Greenhouse a producción por el control plane (Job `artifact-worker`); edición interna revisada antes de compartir.

### Out-of-band coordination required

- OK del operador para publicar AXIS (push + tag) y para el push de `efeonce-think` a `main`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Se declaró `Execution profile: ui-ux`, `UI impact: layout` y el wireframe existe en `docs/ui/wireframes/TASK-1996-efeonce-insights-channel-stat-card-render.md`.
- [ ] `UI ready` sigue en `no` hasta que las hojas aprobadas estén exportadas al repo y el wireframe y el contrato tengan mapping, GVC plan y decision log; si pasa a `yes`, `pnpm task:lint --task TASK-1996` queda sin hallazgos.
- [x] AI Overview se dibuja con la lupa en color en A4, deck y Think (captura). Evidencia: `CHANNEL_ISOTYPES.google_ai_overview` y `EngineMark` de Think a `google-ai-overview`; `derivada-Cifras-Canal-Celdas.png`.
- [ ] Los 19 isotipos del catálogo coinciden con `PLATFORM_ASSET_SEALS` (el script falla si uno cambia). Parcial: los 9 que hoy tienen productor (motores, Google, Search Console, GA4, Greenhouse) están copiados y verificados byte a byte por `src/config/insights-channel-isotypes.test.ts`; los otros 10 entran con TASK-1991/1992, que producen sus hechos.
- [x] Un tablero mezclado lleva isotipo por celda con nombre del canal y contexto; un tablero de una plataforma lleva el canal sólo en el título; ninguna celda tiene isotipo y glifo juntos (fixtures y captura).
- [ ] Ningún ícono de cifra usa rutas Tabler; todos son glifos Trazo. Pendiente: el set Trazo no tiene glifo para clics, impresiones, CTR ni posición; hay que dibujarlos y aprobarlos antes del cambio.
- [ ] Fidelidad ≤ 1 % contra `Premium-Cifras-Canal` y `Deck-Cifras-Canal` en color y en gris. No medible: las hojas del canvas no traen el cromo de página; revisión lado a lado en `docs/ui/visual-directions/TASK-1996-efeonce-insights-channel-stat-card-direction.md`. Las hojas aprobadas existentes siguen ≤ 1 % (cifras 0,05 % A4 y 0,53 % deck).
- [x] `composer:visual-gate` a 0 px salvo los frames declarados en `BASELINE_DELTAS.md` (secciones (w) y (x); 37 frames a 0 px).
- [x] Think sin scroll horizontal a 390 px y `audit:insights-a11y` verde (`verify:insights` y AA a 390 px).
- [x] El copy visible reusable vive en `src/lib/copy/insights.ts` (`GH_INSIGHTS.stat.channelNames` y `channelContext`).

## Verification

- `pnpm typecheck`, `pnpm lint`
- `pnpm vitest run src/lib/efeonce-insights src/lib/artifact-composer`
- `pnpm insights:canvas-fidelity` y `pnpm composer:visual-gate --catalog=insights`
- Think: `test:insights`, `verify:insights`, `audit:insights-a11y`, `build`
- `pnpm test` y `pnpm build` (con autorización del operador) al cierre
- `pnpm task:lint --task TASK-1996`, `pnpm docs:closure-check`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Skill `efeonce-insights` actualizada y espejada a `.codex/`.
- [ ] Arquitectura de Insights §6.4 y §14 con el estado del render con canal.

## Follow-ups

- Tarjetas de redes y pauta cuando TASK-1995 defina su fuente.

## Open Questions

- ¿La variante mono de AI Overview se usa en algún caso (impresión en gris)? Propuesta: no; el disco es blanco en
  todas las superficies y la prueba en gris se hace sobre la versión en color.
