# TASK-2002 / Marketing Studio — Calendario de activaciones

## Meta

- Status: `approved`
- Owner task: `TASK-2002 — Marketing Studio: calendario de activaciones y ejecución en la UI`
- Product Design asset: docs/ui/visual-sources/TASK-2002-marketing-studio-activations-calendar/approved-v3-month.webp — dirección aprobada por el operador el 2026-10-04 en el canvas de Claude Design «Efeonce Marketing Studio» (https://claude.ai/artifact/D6uwRFMzvnaHzGDtDLvxBi, versión `1791147930-57cf`), páginas `v3 · Calendario de activaciones`, `v3.1 · Línea de tiempo por plataforma` y `v3.2 · Planificar y operar`. Cada artboard aprobado está renderizado en la misma carpeta como `approved-v3-<artboard>.webp` (claro; `month-dark` como referencia del oscuro). El «antes» sigue en `before-*.png`.
- Visual direction mode: `source-led`
- Intended consumers: operador de marketing de Efeonce (dueño de campaña), responsable de medios, community manager; en lectura, el equipo que revisa la semana.
- Copy source: `apps/web/src/copy.ts` del repo `efeonce-marketing-studio` (namespaces `activations`, `execution`, `channels`, `calendar`), cubierto por `copy.test.ts`.
- Primitive decision: `extend` — se extienden el calendario mensual vigente, `.chip`, `.seg`, `.pill`, `.callout-*`, el `Shell` (rail, topbar, ⌘K, switch de tema); `Sheet` y `ConfirmDialog` de TASK-1895 (si no existen, esta task los crea con su contrato).
- UI ready target: `yes` — dirección aprobada y conciliada con este documento.
- Implementation status (2026-10-05, Claude): en producción en solo lectura; escrituras code complete y verificadas en local, deshabilitadas hasta TASK-1898. Ver [Conciliación con lo implementado](#conciliación-con-lo-implementado-2026-10-05).

### Fuentes visuales aprobadas (`docs/ui/visual-sources/TASK-2002-marketing-studio-activations-calendar/`)

| Archivo | Artboard del canvas | Qué fija |
|---|---|---|
| `approved-v3-month.webp` · `approved-v3-month-dark.webp` | `V3-Month` | grilla del mes, franjas paid, tarjetas con pieza y estado, bandeja «Ejecución sin activación», «Sin fechas», leyenda, barra de estado |
| `approved-v3-week.webp` | `V3-Week` | semana por día en franjas mañana · tarde · noche, línea de «ahora» |
| `approved-v3-gantt.webp` | `V3-Gantt` | alternativa por plataforma (reemplazada por la línea de tiempo de v3.1) |
| `approved-v3-timeline.webp` | `V3-Timeline` | línea de tiempo por plataforma con ejes fijos, escala Día · Semana · Mes, grupos plegables |
| `approved-v3-sheet.webp` | `V3-Sheet` | hoja de activación (560 px) con video, copy literal, evidencia y tracking URL |
| `approved-v3-unlinked.webp` | `V3-Unlinked` | diálogo «Vincular ejecución» con candidatas |
| `approved-v3-states.webp` | `V3-States` | vacío con filtros, error, parcial, sin permiso, cancelar, catálogo de estados y tracking |
| `approved-v3-paid.webp` | `V3-Paid` | pauta: plan · herramienta · entrega por línea de compra, resumen del mes |
| `approved-v3-formats.webp` · `approved-v3-ownedformats.webp` | `V3-Formats` · `V3-OwnedFormats` | preview por formato (reel, carrusel, horizontal, varios tamaños) y owned (email, blogpost, landing) |
| `approved-v3-plan.webp` · `approved-v3-editpaid.webp` | `V3-Plan` · `V3-EditPaid` | formulario «Planificar activación» y edición de una paid |
| `approved-v3-reprogram.webp` · `approved-v3-fromexec.webp` | `V3-Reprogram` · `V3-FromExec` | diálogo «Reprogramar» y «Crear activación» desde una ejecución |
| `approved-v3-day.webp` · `approved-v3-popover.webp` | `V3-Day` · `V3-Popover` | vista Día y detalle del día |
| `approved-v3-states32.webp` · `approved-v3-a11y.webp` | `V3-States32` · `V3-A11y` | carga, primer uso, pieza no lista, mercado y hora local; contrato de teclado y lector |
| `approved-v3-sheetemail.webp` | `V3-SheetEmail` | hoja de una activación de email |
| `approved-v32-blogpre.webp` · `approved-v32-blogpre-dark.webp` | `V3-BlogPre` (1440×3020) | hoja de blog «Antes de publicar»: gate, búsqueda, metadata, fan-out, E-E-A-T, enlaces; CMS, Sitio y «Borrador en Content Hub» |
| `approved-v32-blogpost.webp` · `approved-v32-blogpost-dark.webp` | `V3-BlogPost` (1440×1840) | hoja de blog «Después de publicar»: publicación e indexación, Search Console, motores de IA, tráfico, frescura |
| `approved-v3-mob*.webp` | `V3-MobWeek`, `V3-MobFilters`, `V3-MobSheet`, `V3-MobPaid`, `V3-MobSheetEmail` | móvil 390×844 |

## Brief

- Primary user: quien planifica y ejecuta la campaña y necesita ver qué sale, dónde y cuándo, con la seguridad de que lo programado en las herramientas coincide con el plan.
- User moment: revisa la semana o el mes; detecta lo fuera de plan, lo vencido y lo que se programó en una herramienta sin pasar por Studio; planifica, reprograma o cancela.
- Job to be done: «Ver el plan de salida de todas mis campañas por canal y plataforma, y saber de un vistazo si cada salida está programada, salió o se atrasó.»
- Primary decision signal: el estado de ejecución de cada tarjeta, siempre en texto.
- Non-goals: programar o publicar en Metricool, HubSpot, la web o las plataformas de ads (Studio no publica); métricas de desempeño (TASK-1892/1910); editar piezas o copys (se editan en la pieza, TASK-1895).

## Desktop Target — 1440×1100

Se conserva el `Shell` de v2 (rail de 80 px con Hoy · Campañas · Calendario · Piezas · Medios, topbar con logo, ⌘K y switch de tema) y se agrega una **barra de estado** inferior de 30 px: «Plan de Studio · Evidencia de ejecución:» con la frescura por herramienta y la hora de Santiago.

1. **Fila de título** (40 px): `h1` «Octubre de 2026» (Poppins 28/600), flechas de período, «Hoy», conteo («17 activaciones»), segmentado de vista (`Mes · Semana`, y `Día`/`Trimestre` donde aplica) y el CTA primario «Planificar activación».
2. **Barra de filtros** (34 px): chips con ícono para **Modality**, **Family**, **Platform**, **Account**, **Mercado**, separador, **Campaña** y **Estado**; un chip activo se pinta en `info` y aparece «Limpiar filtros». Los filtros viajan en la URL.
3. **Grilla mensual** (`role="grid"`, 7 columnas, celdas de 150 px): cada semana abre con un carril de 16 px para las franjas paid (rayada = propuesta sin aprobar, sólida = aprobada; resumen del peor estado de sus líneas en texto). Cada día muestra hasta **2 tarjetas** y «+N más» desde la tercera. Tarjeta: miniatura de la **pieza** (20 px), hora, isotipo de plataforma, cuenta y chip de estado a todo el ancho (pasa a dos líneas antes que desbordar). Hoy con el número en círculo `info`. «1 sin activación» en el día que corresponde.
4. **Columna derecha** (360 px): «Ejecución sin activación» con conteo, ayuda y por ejecución su herramienta, plataforma, cuenta, fecha y texto, con «Vincular» y «Crear activación»; «Sin fechas»; leyenda de franjas y tarjetas.
5. **Semana**: columnas por día (186 px) y filas **mañana 06–12 · tarde 12–18 · noche 18–24**, tarjetas con pieza 44×55, campaña, pieza, cuenta, estado y evidencia; línea de «ahora» en `info`; aviso «2 ejecuciones sin activación» en la fila del título.
6. **Línea de tiempo por plataforma** (v3.1): ejes fijos (fechas arriba con horas 0-6-12-18, filas a la izquierda de 270 px), escala `Día · Semana · Mes`, grupos por platform con accounts plegables y conteo, «Sólo filas con actividad», «Plegar todo», «N grupos sin actividad ocultos · Mostrar todas», scroll vertical y horizontal, filas virtualizadas.
7. **Pauta**: por línea de compra, tres capas — plan (contorno), fechas en la herramienta (rayado), entrega observada (sólido) — con marca de diferencia («+1 d») y estado; resumen «Así se resume en la vista Mes».
8. **Vista Día**: horas 06–24 en filas de 40 px, tarjetas de 104 px, aviso de coincidencia de hora y resumen lateral.
9. **Superpuestas**: hoja de activación (560 px), formulario «Planificar»/«Editar» (640 px), diálogos «Vincular» (640), «Reprogramar» (520), confirmación de cancelar (420), detalle del día (popover 300).

## Mobile Target — 390×844

- **Semana como lista por día** (no grilla): título «5 – 11 oct» con flechas de 44 px, segmentado `Mes · Semana`, botón «Filtros · N», callout «2 ejecuciones sin activación · Revisar», franja paid como fila propia y, por día, tarjetas de 44×55 con hora, isotipo, plataforma y placement, pieza, campaña · cuenta y estado. Navegación inferior de v2 con Calendario activo.
- **Filtros** en una hoja que sube sobre la lista: grupos Modality, Family, Platform (con isotipos), Account, Campaña (select) y Estado, chips de 44 px con `aria-pressed`; pie con «Limpiar filtros» y «Ver N activaciones».
- **Hoja de activación** a pantalla completa con «Volver», pieza, estado, fechas plan/herramienta, copy literal y avisos; acciones al pie de 48 px y «Más acciones» (vincular, cancelar).
- **Pauta** como tarjetas por línea de compra con una mini línea de tiempo del mes a todo el ancho (mismas tres capas).
- **Email** con bandeja y vista previa móvil.
- Sin scroll horizontal; objetivos táctiles de 44 px como mínimo.

## Action Hierarchy

- Primary: abrir la hoja de una activación; en el encabezado, «Planificar activación»; en formularios, el botón que guarda («Planificar activación», «Guardar cambios», «Reprogramar», «Crear y vincular», «Vincular»).
- Secondary: «Editar», «Reprogramar», «Vincular ejecución», «Crear activación», filtros, cambio de vista, «Copiar» la tracking URL, «Abrir vista Día».
- Destructive: «Cancelar activación» (tono `err`, con diálogo «¿Cancelar esta activación? La evidencia de la herramienta se conserva.» y «No, mantener»).
- Selection vs action: filtros, vista, período y día son selección y viven en la URL; toda escritura es explícita en hoja, formulario o diálogo.
- Pending / disabled: sin permiso, las acciones quedan visibles y deshabilitadas con «Este acceso es de sólo lectura»; «Crear y vincular» deshabilitado mientras falten campaña o pieza.

## Visual Fidelity Mapping

| Source cue | Greenhouse token / primitive / recipe | Intent preserved | Literal value rejected |
|---|---|---|---|
| Franja rayada «propuesto, sin aprobar» (`approved-v3-month.webp`) | franja vigente con `--info-bg`/`--info-bg2` rayado y borde `--info-line` | la pauta es un período y su aprobación se ve | convertir la franja en tarjetas diarias |
| Tarjeta con miniatura de la pieza y chip a todo el ancho | `.chip` de estado con glifo + texto, `--paper`, `--line` | la salida se reconoce por su pieza y su estado se lee | la portada de la campaña como miniatura; estado sólo por color |
| Isotipos de plataforma en color y en negativo | archivos de `@efeoncepro/axis-brand-assets` (TASK-2004), variante por tema | la plataforma se reconoce por su marca | redibujar logos o usar una baldosa blanca |
| Hoja lateral de 560 px con bloques separados por línea | `Sheet` `md`, `--paper`, `--shadow-lg` | detalle sin perder el calendario | modal centrado que tapa la grilla |
| Tres capas de la pauta (contorno · rayado · sólido) | `--line2`, `--info-line` rayado, `--info`/`--ok` sólido | plan, herramienta y entrega se comparan de un vistazo | una sola barra con color por estado |
| Bloque de copy literal | `pre-wrap`, fuente con respaldo de emojis, alto máximo 220 px | el copy se ve tal como se publica | recortar saltos de línea o emojis |
| Preview del email y de la web en claro | superficie blanca fija de contenido | se ve como lo recibe la persona | teñir el email con el tema oscuro |
| Claro y oscuro AXIS de v2 | roles de `theme.generated.css` (`--app`, `--base`, `--paper`, `--t1…t3`, tonos `ok/warn/err/info`) | mismo calendario en ambos temas | hex nuevos fuera de los roles |

## Layout Skeleton

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| 0 | Shell | rail, topbar, barra de estado | `Shell`, `ExecutionFreshnessBar` | sesión + frescura del reader |
| 1 | Encabezado | período, vista, «Planificar activación» | `CalendarHeader` | URL |
| 1 | Filtros | dimensiones, mercado, campaña, estado | `ActivationFilters` | catálogo de canales (TASK-1905) |
| 2 | Grilla / semana / día / línea de tiempo | activaciones en el tiempo | `CalendarGrid`, `WeekBands`, `DayView`, `PlatformTimeline`, `ActivationCard`, `SpanBar` | `GET /api/v1/calendar` (TASK-2001) |
| 2 | Pauta | plan · herramienta · entrega | `PaidLines`, `PaidSummary` | reader de TASK-2001 (`delivering`/`ended`) |
| 2 | Lateral | ejecución sin activación, sin fechas, leyenda | `UnlinkedExecutions`, `UndatedList`, `CalendarLegend` | `listUnlinkedExecutions` + calendario |
| 3 | Superpuesta | detalle, formularios, diálogos | `ActivationSheet`, `ActivationForm`, `ReprogramDialog`, `LinkExecutionDialog`, `ConfirmDialog`, `DayPopover` | `getActivation` + commands de TASK-2001 |
| 3 | Preview | pieza por formato y owned | `PiecePreview` (video, carrusel, horizontal, grupo de recursos, email, blog, landing) | pieza y versión (TASK-1998/1999) |

## Copy Ledger

| Id | Texto | Uso |
|---|---|---|
| `execution.planned` | «Planificada» | chip |
| `execution.scheduled` | «Programada» + isotipo de la herramienta (nombre en `aria-label`) | chip |
| `execution.scheduledOffPlan(diff)` | «Fuera de plan · {diff}» | chip (ej. «+2 h», «inicio +2 d») |
| `execution.published(time)` | «Publicada · {hora}» | chip; nunca sin fecha observada |
| `execution.delivering(date)` | «En curso · desde {fecha}» | chip paid |
| `execution.ended(range)` | «Finalizada · {rango}» | chip paid |
| `execution.overdue` | «Vencida» | chip; «Sin entrega observada» en paid |
| `execution.cancelled` | «Cancelada» | chip |
| `blog.tab.before` · `blog.tab.after` | «Antes de publicar» · «Después de publicar» | pestañas de la hoja de blog |
| `blog.draftLink` | «Borrador en Content Hub» + isotipo de Notion | enlace externo en la cabecera |
| `blog.dim.cms` · `blog.dim.site` | «CMS» · «Sitio» | dimensiones de la cabecera |
| `blog.gate.progress(ok,total)` | «{ok} de {total}» · «controles en verde · {n} avisos» | gate |
| `blog.gate.warnOnly` | «El gate avisa, no bloquea: se puede autorizar con avisos y quedan registrados en la autorización.» | gate |
| `blog.ai.panel(cluster)` | «Medido · panel del clúster {nombre}» | motores de IA |
| `blog.fanout.covered` · `blog.fanout.missing` | «Cubierta» · «Falta H2» | chips del fan-out |
| `blog.data.estimated` · `blog.data.measured` · `blog.data.none` | «Estimado · tercero» · «Medido» · «no medido» | honestidad del dato |
| `blog.ai.cited` · `blog.ai.mentioned` · `blog.ai.absent` · `blog.ai.unmeasured` | «Citada» · «Mencionada» · «No aparece» · «Sin medir» | estado por motor de IA |
| `blog.cms.noReader` | «Si no tiene lector conectado, la evidencia sale de la URL pública y una persona confirma la fecha.» | «Cómo se obtiene» |
| `activations.unlinkedTitle` | «Ejecución sin activación» | lateral |
| `activations.unlinkedHint` | «Programado en una herramienta sin plan en Studio. Vincúlalo a una activación o crea una.» | lateral |
| `activations.plan` | «Planificar activación» | CTA y título del formulario |
| `activations.planHint` | «Studio planifica la salida; la publica la herramienta.» | subtítulo del formulario |
| `activations.savedAsPlanned` | «Se guarda como «Planificada». Programarla en Metricool es un paso aparte.» | pie del formulario |
| `activations.edit` | «Editar activación» / «Guardar cambios» | formulario |
| `activations.reprogram` | «Reprogramar activación» / «Reprogramar» | diálogo |
| `activations.reprogramOffPlan(diff)` | «Pasará a «Fuera de plan · {diff}»» + «Studio no cambia {herramienta}: para que vuelva a «Programada», mueve también la publicación allá.» | aviso del diálogo |
| `activations.link` | «Vincular ejecución» / «Vincular» | CTA y diálogo |
| `activations.createFromExecution` | «Crear activación» / «Crear y vincular» | CTA y formulario precargado |
| `activations.fromTool(tool)` | «De {herramienta}» | marca de campo precargado |
| `activations.cancelConfirm` | «¿Cancelar esta activación? La evidencia de la herramienta se conserva.» | diálogo |
| `activations.pieceNotApproved` | «La pieza no está aprobada» | aviso |
| `activations.versionMismatch(tool)` | «La versión programada en {herramienta} no es la planificada» | aviso |
| `activations.sameTime` | «Sin otra activación de esta cuenta a la misma hora» / aviso si la hay | validación |
| `activations.trackingFrozen` | «Congelada: ya hay evidencia de entrega» | tracking |
| `tracking.missing` / `tracking.mismatch` | «Sin UTM en lo publicado» / «UTM distinta» | avisos |
| `calendar.empty` | «No hay activaciones en este período con estos filtros.» | vacío con filtros |
| `calendar.firstUse` | «Todavía no hay activaciones» + «Una activación es la salida de una pieza en un canal y una fecha. Planifica la primera desde una campaña.» | primer uso |
| `calendar.error` | «No pudimos cargar el calendario.» + «Reintentar» | error |
| `calendar.partial(tool, ago)` | «La ejecución de {herramienta} no está al día (última lectura {hace N})» | parcial |
| `calendar.readOnly` | «Este acceso es de sólo lectura» | permisos |
| `calendar.clearFilters` | «Limpiar filtros» | filtros |
| `calendar.localTime(local, santiago)` | «{hora} {ciudad} · {hora} Santiago» | mercado distinto de Chile |
| `channels.modality.*` | «Paid», «Organic», «Owned», «Earned» | filtros (spanglish por decisión del operador) |
| `channels.family.*` | «Social», «Search», «Display», «Video», «Email», «Messaging», «Web & Content», «Community», «Creators & Influencers», «PR & Media», «Audio», «OOH/DOOH» | filtros |
| `activations.alwaysOn` | «Always On» | etiqueta de campaña |

## State Copy

| State | Copy visible | Recovery behavior |
|---|---|---|
| ready | grilla con activaciones y chips de estado en texto | — |
| loading | esqueleto con la forma de la grilla; a los 10 s «Sigue cargando…» | se resuelve solo; sin animación con movimiento reducido |
| empty | «No hay activaciones en este período con estos filtros.» + «Limpiar filtros»; sin activaciones nunca: «Todavía no hay activaciones» + «Planificar activación» | limpiar filtros o planificar |
| partial | «La ejecución de {herramienta} no está al día (última lectura {hace N})» en la barra de estado y sobre la grilla | se recupera con la próxima lectura; ninguna tarjeta pasa a «Publicada» sin fecha observada |
| error | «No pudimos cargar el calendario.» + «Reintentar»; los filtros se conservan | reintento; si persiste, `/api/v1/health` |
| denied | acciones visibles y deshabilitadas con «Este acceso es de sólo lectura» (o `permissions.lockReason`) | pedir acceso |

## Accessibility Contract

- Heading order: `h1` período; `h2` por bloque lateral y en la hoja (título como nombre accesible del diálogo); `h3` por sección del formulario.
- Grilla: `role="grid"` con roving tabindex (un solo punto de tabulación); celdas con nombre «Martes 13 de octubre, 2 activaciones»; tarjetas como enlaces con «11:00, LinkedIn, Efeonce, Grader No te leyó, Programada en Metricool».
- Teclado: ← → ↑ ↓ entre días; Inicio/Fin de la semana; Re Pág/Av Pág cambia de mes conservando el día; Entrar abre el día o la tarjeta; Tab recorre las tarjetas de un día por hora; T vuelve a hoy; Esc cierra popover, hoja o diálogo.
- Foco: al abrir la hoja va a su título y el resto queda inerte; al cerrar vuelve a la tarjeta de origen; diálogos con foco atrapado que vuelve al botón que los abrió; tras guardar, la tarjeta nueva o movida recibe el foco.
- Lector: región en vivo única («Mostrando 6 activaciones», estado parcial); isotipos decorativos con el nombre en texto o `aria-label`.
- Estados siempre con texto; contraste 4,5:1; usable al 200 % sin scroll horizontal; 44 px mínimo en móvil; sin animación con `prefers-reduced-motion`.

## Implementation Mapping

- Route / surface: `apps/web/src/app/calendar/page.tsx` (`?view=month|week|day|timeline`, `?month=`, `?week=`, `?day=`, filtros y `?activation=` en la URL) y la pestaña Calendario de `apps/web/src/app/campaigns/[campaignId]/page.tsx` (mismo componente con la campaña fijada).
- Primitives: grilla y tarjetas vigentes extendidas; `Sheet`/`ConfirmDialog` de TASK-1895; isotipos desde `@efeoncepro/axis-brand-assets` (TASK-2004; mientras tanto, los archivos en color ya publicados).
- Component candidates: `CalendarHeader`, `ActivationFilters`, `CalendarGrid`, `WeekBands`, `DayView`, `DayPopover`, `PlatformTimeline`, `SpanBar`, `PaidLines`, `ActivationCard`, `ActivationSheet`, `PiecePreview`, `ActivationForm`, `ReprogramDialog`, `LinkExecutionDialog`, `UnlinkedExecutions`, `ExecutionFreshnessBar`.
- Copy source: `apps/web/src/copy.ts` (`execution`, `activations`, `channels`, `calendar`, `tracking`).
- Data reader / command: `GET /api/v1/calendar` con filtros (incluye `market`), `listCampaignActivations`, `getActivation` (con evidencia, avisos y eventos), `listUnlinkedExecutions`; commands `planActivation`, `updateActivation`, `rescheduleActivation`, `cancelActivation`, `linkExecution`, `unlinkExecution`, `createActivationFromExecution` (TASK-2001).
- API parity: la UI escribe sólo por esos commands vía `/api/v1`; cada uno tiene tool MCP (TASK-2001/2003).
- Access / capability: `marketing_studio.campaign.write` resuelto en el servidor; `permissions` del reader decide qué se deshabilita.
- GVC markers: `data-capture="calendar-filters"`, `"calendar-grid"`, `"activation-card"`, `"activation-sheet"`, `"unlinked-executions"`, `"activation-form"`, `"platform-timeline"`.

## GVC Scenario Plan

Studio es una app aparte: la evidencia se produce con Playwright (Chrome) contra `http://localhost:3100` sobre staging, con el rigor de GVC premium.

- Route: `/calendar?month=2026-10`, `?view=week`, `?view=day&day=2026-10-16`, `?view=timeline`, filtros por modality, platform y mercado; `/calendar?activation=<id>`; `/campaigns/CMP-001?tab=calendar`.
- Viewports: 1440×1100 desktop y 390×844 mobile, claro y oscuro.
- Quality profile: `premium`
- Required steps: aplicar y limpiar filtros; abrir una programada, una vencida, una paid en curso y un email; planificar una activación; reprogramar con aviso de fuera de plan; vincular y crear desde una ejecución; cancelar con confirmación; recorrer la grilla con teclado.
- Required captures: `after-month`, `after-month-dark`, `after-week`, `after-day`, `after-timeline`, `after-paid`, `after-sheet`, `after-sheet-email`, `after-plan`, `after-reprogram`, `after-unlinked`, `after-from-execution`, `after-mobile-week`, `after-mobile-sheet`, `after-mobile-filters`.
- Assertions: cada chip coincide con el estado del reader; ninguna «Publicada» sin `publishedAt`; miniatura de la pieza; isotipo de la plataforma correcta; tracking URL igual a la del reader.
- Scroll-width checks: `scrollWidth <= clientWidth` en 1440 y 390 (la fuente aprobada ya mide 1440/1440 y 390/390).
- Reduced-motion / focus evidence: hoja y diálogos con `reducedMotion: 'reduce'`; recorrido por teclado con foco visible y retorno del foco.
- Review dossier: capturas `after-*` junto a las `approved-v3-*` en `docs/ui/visual-sources/TASK-2002-marketing-studio-activations-calendar/` y scorecard `docs/ui/reviews/TASK-2002-marketing-studio-activations-calendar.scorecard.json`.
- Baseline decision / surface ID: `studio-calendar-activations`; la línea base es `approved-v3-*` (canvas `1791147930-57cf`).

## Design Decision Log

- Decision: el calendario vigente pasa a ser el calendario de activaciones de Studio, con filtros por dimensión y mercado, estado de ejecución en cada tarjeta, hoja con evidencia y tracking, bandeja de ejecución sin activación, formulario de planificación, vista Día y línea de tiempo por plataforma.
- Alternatives considered: (a) espejo de Metricool — descartado (el calendario es de Studio); (b) Gantt por plataforma en la semana — reemplazado por la línea de tiempo de v3.1 (ejes fijos, escala, grupos plegables); (c) canvas libre con pan/zoom — descartado (pierde el eje de tiempo, cuesta con teclado y no se enlaza a una fecha); (d) baldosa blanca para los isotipos en oscuro — reemplazada por negativos; (e) tres tarjetas por día en el mes — se muestran dos y «+N» desde la tercera.
- Why this pattern: plan y ejecución se leen juntos sin abrir las herramientas; la densidad se controla con filtros, «+N», vista Día y línea de tiempo.
- Reuse / extend / new primitive: extiende grilla, tarjetas, lateral y `Shell`; reusa `Sheet`/`ConfirmDialog`; `PiecePreview` y `PlatformTimeline` nacen como componentes de Studio.
- Blog (2026-10-04): hoja con pestañas «Antes / Después de publicar», tarjetas de indicador en vez de pares etiqueta-texto, chips de estado y método plegado; CMS del cliente y borrador en Notion en la cabecera. Alternativa descartada: lista de etiqueta y texto (densa, difícil de escanear).
- Open risks: depende de TASK-2001 (reader con `delivering`/`ended`, avisos, eventos y mercado) y TASK-1905 (catálogo); la evidencia de la web necesita el lector de WordPress decidido en TASK-2001; isotipos en negativo hasta TASK-2004.

## Conciliación con lo implementado (2026-10-05)

Estado: **en producción en solo lectura** (`studio.efeonce.org/calendar`, Studio `main` `d0ec7e0`). Se revisó tablero por
tablero (`V3-*`) contra lo implementado y se corrigió hasta coincidir; el generador del canvas (`gen.py`) fue la
fuente exacta de medidas. Detalle técnico en el
[Delta TASK-2002 de la arquitectura](../../architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md#delta-2026-10-05--task-2002-calendario-de-activaciones).

### Desvíos resueltos (ahora coinciden con el tablero)

| Tablero | Qué se ajustó |
|---|---|
| `V3-Month` | Fila de título única (H1, ‹ ›, Hoy, «N activaciones», selector, «+ Planificar activación»); chips «Dimensión» sin valor y «Dimensión: valor» en azul, separador antes de Campaña y Estado («Campaña: Todas» / «Estado: Todos»); franja paid encima de los números de día desde el flight del plan de medios (rayada «propuesto, sin aprobar», sólida «aprobado», sin frase si no hay presupuesto), texto completo en su primera semana y corto en las demás; hoy en círculo azul + «Hoy»; «N sin activación» por día local de Santiago; tarjeta compacta con miniatura 20, hora, isotipo, cuenta y chip a lo ancho con el isotipo de la herramienta junto a «Programada»; «Sin fechas» con candado en «Pauta bloqueada»; leyenda. |
| Barra de estado | El calendario reemplaza la barra del portal (`Shell statusBar`): «Plan de Studio · Evidencia de ejecución:» + herramientas (atrasadas en amarillo; varias atrasadas en una frase; más de dos al día se resumen) + «Hora de Santiago · …». «Solo lectura» pasa al encabezado (`Shell readOnly`). En móvil, la frescura va sobre la grilla. |
| `V3-Week` / `V3-MobWeek` | Número grande y «JUE · HOY», carril PAID, franjas 06–12 · 12–18 · 18–24, línea «HH:MM · ahora», tarjeta rica con línea de evidencia («Metricool · publicada 11:00» / «Sin evidencia en X» / «Aún sin programar»). Móvil: «5 – 11 oct», selector + «Filtros · N», banner «N ejecuciones sin activación · Revisar», franja y lista por día. |
| `V3-Day` | Grilla 06:00–23:00, franja paid arriba, tarjetas lado a lado si se tocan, aviso de misma hora (misma cuenta en rojo), «Resumen del día» y «Horas por cuenta». |
| `V3-Timeline` | Grupos plegables (orgánico/owned por cuenta; paid por plataforma de compra y línea), columna de hoy y línea de ahora, pauta como barras por estado, ejecución sin activación en su fila, escala Día/Semana/Mes, «Sólo filas con actividad» (`rows=all` muestra todas), «Plegar todo», pie con grupos sin actividad. |
| `V3-Paid` / `V3-MobPaid` | Paid es el filtro Modality: Paid sobre el mes (`view=paid` queda como alias); resumen por campaña (peor estado primero); por línea plan «Plan · 1–7 oct», herramienta rayada, entrega sólida (terminada en verde), «+1 d», «Sin entrega observada»; costado de evidencia de la línea elegida (`line`) y «Cómo se lee». Móvil: tarjetas con nota y mini línea del mes. |
| `V3-Sheet` / `V3-MobSheet` | Campaña + ACT, «Pieza · Plataforma Placement», chips de dimensión (Mercado sólo si no es CL), pieza con estado/fecha/versión, copy literal con conteo contra `copyLimits` del catálogo, avisos con título y qué hacer, evidencia con logotipo y «leído hace X», tracking URL, historial. Móvil: «‹ Activación ⋯», «Programada en la herramienta», pie Editar/Reprogramar. |
| `V3-Popover` | Número del día y «+N más» abren `?pop=YYYY-MM-DD`; lista, flights en curso, «Abrir vista Día»; Esc/✕ devuelven el foco a la celda. |
| `V3-States` / `V3-States32` | Vacío con filtros; error con «Tus filtros se conservan» + Reintentar; primer uso con Planificar; carga con esqueleto y «Sigue cargando…» a los 10 s; «Pieza sin aprobar» junto al estado; ciudad + hora de Santiago si la cuenta opera en otra zona. |
| `V3-A11y` | Entrar abre el popover del día (antes el atajo buscaba una clase vieja y no hacía nada); anuncio en vivo «Mostrando N activaciones» al filtrar. |
| `V3-MobFilters` | «Ver N activaciones» cuenta con el mismo reader (`GET /api/v1/calendar` con el borrador). |
| `V3-Formats` | Escenario de 320 px: video con controles y póster, carrusel (flechas, «2 / 4», siguiente asomando, miniaturas, «Cada diapositiva con su versión»), horizontal a todo el ancho, grupo por proporción («Horizontal 16:9 · N»); vertical al costado de los datos. |
| `V3-Plan` · `V3-EditPaid` · `V3-FromExec` · `V3-Reprogram` · `V3-Unlinked` · cancelar | `PlanDrawer` (plan/edit/from), `RescheduleDialog`, `CancelDialog` (alertdialog), `LinkDialog`; código y verificación local completos, deshabilitados en producción (ver abajo). |
| Isotipos | Metricool sobre círculo negro; sitio web con el isotipo de Efeonce; `@efeoncepro/axis-brand-assets` 0.4.20. |

### Diferencias con la sección «Implementation Mapping» de arriba

- **URL real:** `view` (`month|week|day|timeline|paid`), `date`, `month`, `scale`, `rows`, `line`, `pop`, `action`
  (`plan|edit|reschedule|cancel|link|from`), `record`, `activation` y filtros `modality|family|platform|account|market|campaign|status`.
  No se usan `?week=` ni `?day=`.
- **Componentes reales:** `MonthGrid`, `WeekView`, `DayView`, `TimelineView`, `PaidView`, `ActivationCard`,
  `ExecutionChip`, `SidePanels`, `ActivationSheet` + `SheetFrame`, `DayPopover`, `PieceStage`, `ActivationFilters`,
  `GridKeys`, `LockedAction` y `write/*`. La hoja y los diálogos son de Studio; no dependen de un `Sheet`/`ConfirmDialog`
  de TASK-1895.
- **Permisos:** en modo `open` las acciones quedan visibles y `aria-disabled` con su motivo; `ActionLayer` sólo se
  monta si el actor puede escribir.
- La pestaña Calendario de la campaña (`/campaigns/CMP-###?tab=calendar`) no formó parte de lo verificado en esta
  etapa.

### Desvíos que quedan

| Qué | Depende de |
|---|---|
| Escrituras en producción | Login Efeonce ID TASK-1898 (bloqueada por TASK-1834 y TASK-1895) |
| Escrituras por MCP | TASK-2003 |
| `V3-SheetEmail` / `V3-MobSheetEmail` (De, Asunto, Preheader, Audiencia, Escritorio/Móvil/Bandeja, después del envío) | Contrato de email owned en el reader (encargado a Codex el 2026-10-05) |
| `V3-OwnedFormats` (landing: destino de N activaciones, formulario conectado) | Mismo encargo |
| `V3-BlogPre` / `V3-BlogPost` (dossier SEO/AEO) | TASK-1667/1669; hoy «no medido» |
| «Línea de tiempo» como tercera opción del selector en Semana | Desvío deliberado: `V3-Week` no daba entrada; decide el operador |
| Encabezado global (lockup y riel) | Fuera de TASK-2002 |
| `V3-Gantt` (reemplazado por la línea de tiempo v3.1), `V3-Later`, `V3-Quarter`, `V3-SheetMore`, `V3-Bulk` | TASK-2005/2006 |

## Acceptance Checklist

- [x] All visible strings are in the copy ledger.
- [x] Dynamic values are named and bounded.
- [x] Partial/degraded states are explicit.
- [x] No copy implies a guarantee when data is estimated.
- [x] Charts have table/text alternatives (la pauta y la línea de tiempo tienen la lista equivalente en la hoja y el móvil).
- [x] State and aria copy is ready for implementation.
- [x] Implementation mapping names primitive, copy source, data contract and route/surface.
- [x] GVC scenario plan is specific enough for a scenario file.
- [x] Design decision log explains reuse/extend/new before JSX starts.
- [x] Artboards `v3`, `v3.1` y `v3.2` aprobados por el operador (2026-10-04) y este wireframe conciliado con ellos.
