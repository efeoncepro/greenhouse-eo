# TASK-2002 — Flujo del calendario de activaciones

- Programa: [`EPIC-049-marketing-studio-UI-FLOW.md`](EPIC-049-marketing-studio-UI-FLOW.md). Esta superficie es el nodo
  **`MS-N4` Calendario** (global, `/calendar`) y la pestaña Calendario del nodo **`MS-N3`** (espacio de campaña); alimenta
  el nodo **`MS-N1` Hoy** con los ítems «Ejecución sin activación», «Vencida» y «Fuera de plan».
- Wireframe: [`TASK-2002-marketing-studio-activations-calendar.md`](../wireframes/TASK-2002-marketing-studio-activations-calendar.md)
  (dirección aprobada el 2026-10-04: canvas «Efeonce Marketing Studio», páginas v3, v3.1 y v3.2; renders en
  `docs/ui/visual-sources/TASK-2002-marketing-studio-activations-calendar/approved-v3-*.webp`).
- Contrato: TASK-2001 (activaciones, evidencia de ejecución, descubrimiento de Metricool, reader del calendario).
- Siguiente iteración (trimestre, historial, comentarios, lote, exportar, vista de cliente, propuesta por agente):
  TASK-2005 (contrato) y TASK-2006 (UI).
- Estado (2026-10-05, Claude): en producción en solo lectura; ver [Flujos implementados](#flujos-implementados-2026-10-05).

## Rutas y estado en la URL

| Estado | URL |
|---|---|
| Mes | `/calendar?view=month&month=YYYY-MM` (por defecto) |
| Semana | `/calendar?view=week&week=YYYY-Www` |
| Día | `/calendar?view=day&day=YYYY-MM-DD` |
| Línea de tiempo por plataforma | `/calendar?view=timeline&scale=day\|week\|month&active=1` |
| Filtros | `&modality=paid,organic&family=social&platform=instagram&account=<id>&market=CL&campaign=CMP-###&status=overdue` |
| Activación abierta | `&activation=<activationId>` (deep link; la hoja se abre al cargar) |
| Formulario | `&plan=1` (nueva) · `&activation=<id>&edit=1` · `&execution=<executionId>&create=1` (desde ejecución) |
| Pestaña de campaña | `/campaigns/CMP-###?tab=calendar` + los mismos parámetros, con la campaña fijada |

## Flujos implementados (2026-10-05)

La tabla anterior es el diseño. Lo implementado (en producción en solo lectura, Studio `main` `d0ec7e0`) usa esta URL:

| Estado | URL real |
|---|---|
| Vista | `/calendar?view=month\|week\|day\|timeline\|paid` + `date` / `month` (`view=paid` es alias del filtro `modality=paid` sobre el mes) |
| Línea de tiempo | `&scale=day\|week\|month`; `&rows=all` muestra todas las filas (por defecto «Sólo filas con actividad») |
| Filtros | `&modality=…&family=…&platform=…&account=…&market=…&campaign=…&status=…` |
| Paid: línea elegida | `&line=<id>` (abre su «Evidencia de ejecución» en el costado) |
| Detalle del día | `&pop=YYYY-MM-DD` |
| Hoja de activación | `&activation=<id>` |
| Acción de escritura | `&action=plan\|edit\|reschedule\|cancel\|link\|from` + `activation` o `record` según la acción |

**Detalle del día.** El número del día o «+N más» abren `?pop=`; con el foco en el día, Entrar lo abre. Muestra la
lista del día, los flights en curso y «Abrir vista Día». Esc o ✕ lo cierran y el foco vuelve a la celda.

**Acciones de escritura.** La acción vive en la URL. `ActionLayer` (servidor) carga catálogo publicado, cuentas,
campañas y candidatas y **sólo se monta si el actor puede escribir**. En producción (modo `open`) no se monta: los
botones quedan `aria-disabled` con su motivo y la API responde 403 `write_not_allowed`. Cuando se monta:

1. El formulario o diálogo envía primero una **vista previa** (`dryRun`, con `Idempotency-Key` nueva e `If-Match` con
   la revisión) y muestra los hallazgos del catálogo con texto legible.
2. **Aplicar** envía la misma operación con otra clave de idempotencia.
3. Después de aplicar, la UI **navega a la hoja de la activación** (plantilla de URL con `__ID__`) y hace
   `router.refresh()`.

**Estado de cada recorrido.**

| Recorrido | Estado |
|---|---|
| A. Revisar la semana | En producción (lectura) |
| B. Resolver una ejecución sin activación | Diálogos `LinkDialog` y «Crear desde ejecución» code complete y verificados en local (la bandeja bajó de 3 a 1); deshabilitados en producción hasta TASK-1898 |
| C. Atender una vencida o fuera de plan | `RescheduleDialog` (dice en qué estado quedará y que Studio no mueve la herramienta) y `CancelDialog` verificados en local; deshabilitados en producción |
| D. Planificar | `PlanDrawer` verificado en local (vista previa 200 → 201 y apertura de la hoja nueva); deshabilitado en producción |
| E. Revisar la pauta | En producción (lectura) como filtro Paid; «Editar» deshabilitado en producción |
| F. Revisar un día cargado | En producción |
| G. Ver por plataforma | En producción |
| H. Email, blogpost o landing | Pendiente: email y landing esperan el contrato owned del reader; blog espera TASK-1667/1669 |

Paridad: `write/client.ts` hace un `fetch` literal por operación del registro y `operations-parity.test.ts` lo exige.
Las escrituras por MCP dependen de TASK-2003.

## Recorridos

**A. Revisar la semana.** Calendario → filtro Organic + Instagram → tarjeta «Programada» (isotipo de Metricool) → hoja
con pieza (video, carrusel u otro formato), copy literal, fecha planificada, evidencia y tracking URL → Esc vuelve a la
grilla con el foco en la tarjeta.

**B. Resolver una ejecución sin activación.** Hoy o lateral del calendario → «Ejecución sin activación» (post de Metricool
del sáb 10 oct, 09:00, LinkedIn, Julio Reyes) → dos salidas:
- «Vincular» → diálogo con las candidatas (misma plataforma y cuenta primero, con la razón) → «Vincular» → la tarjeta toma
  la evidencia (si la fecha difiere, «Fuera de plan») y la bandeja baja en uno.
- «Crear activación» → formulario precargado con lo que trae la herramienta (marcado «De Metricool»: plataforma,
  placement, cuenta, fecha, copy) → la persona elige campaña (obligatoria, puede ser Always On), pieza y versión →
  «Crear y vincular» (deshabilitado hasta completar) → queda vinculada.

**C. Atender una vencida o una fuera de plan.** Hoy («N activaciones vencidas») → calendario `status=overdue` → hoja →
«Reprogramar» (diálogo con fecha y hora; si la herramienta ya tiene otra fecha, aviso «Pasará a «Fuera de plan · {diff}»»)
o «Cancelar activación» (confirmación; la evidencia se conserva).

**D. Planificar.** «Planificar activación» → formulario en cinco pasos: campaña y canal (modality, family, platform,
placement, account con su hora local, mercado) · pieza, versión, formato y copy por canal · fecha (punto para organic y
owned; inicio y fin para paid) · tracking URL generada · validación del catálogo → «Planificar activación» → tarjeta
«Planificada» con el foco.

**E. Revisar la pauta.** Filtro Paid o vista de pauta → cada línea de compra con plan, fechas en la herramienta y entrega
observada → «Editar» (flight; plataforma y pieza bloqueadas si ya hay entrega; tracking congelada).

**F. Revisar un día cargado.** Tocar el número del día o «+N más» → detalle del día (popover) → «Abrir vista Día» →
horas con sus tarjetas y aviso si dos salen a la misma hora.

**G. Ver por plataforma.** `Línea de tiempo` → grupos por platform con accounts plegables, sólo filas con actividad →
«Mostrar todas» o cambiar la escala.

**H. Revisar un email, un blogpost o una landing.** Tarjeta owned → hoja con vista previa (email en claro con bandeja,
escritorio y móvil; blog y landing en navegador) y su evidencia (HubSpot; web según TASK-2001). En blog, la hoja abre en «Antes de publicar»
(gate, dossier SEO/AEO) y pasa a «Después de publicar» al observarse la publicación; «Borrador en Content Hub» abre
Notion en otra pestaña y la hoja queda abierta.

## Superficies superpuestas

- Una sola hoja o formulario a la vez; sobre ellos, `LinkExecutionDialog`, `ReprogramDialog` o `ConfirmDialog`.
- Salida con cambios sin guardar ⇒ diálogo de descartar. Conflicto de revisión (412) ⇒ diálogo de conflicto de TASK-1895.
- El detalle del día es un popover no modal: Esc o clic fuera lo cierra y el foco vuelve al día.

## Paridad

Cada acción del flujo es un command de TASK-2001 (`planActivation`, `updateActivation`, `rescheduleActivation`,
`cancelActivation`, `linkExecution`, `unlinkExecution`, `createActivationFromExecution`) disponible por `/api/v1` y como
tool MCP; un agente recorre B, C y D con la identidad delegada de la persona (TASK-2003). La UI no calcula estados ni
avisos: los pinta desde el reader.

## Motion

Sin motion propio: la hoja y los diálogos usan la transición vigente de Studio y se anulan con
`prefers-reduced-motion`; el esqueleto de carga no anima con movimiento reducido.

## GVC Scenario Plan

Escenario Playwright (Chrome) contra `http://localhost:3100` sobre staging, `qualityProfile: premium`, que recorre los
flujos en este orden y captura cada paso en 1440×1100 y 390×844, claro y oscuro:

1. A — `/calendar?month=2026-10` → filtro Organic + Instagram → abrir una «Programada» → Esc; aserción: el foco vuelve a la tarjeta.
2. B — abrir «Ejecución sin activación» → «Vincular» → elegir candidata → confirmar; aserción: la bandeja baja en uno.
3. B — «Crear activación» → «Crear y vincular» deshabilitado hasta elegir campaña y pieza → crear; aserción: la tarjeta aparece vinculada.
4. C — `status=overdue` → «Reprogramar» con fecha distinta a la de Metricool; aserción: aviso «Pasará a «Fuera de plan…»».
5. C — «Cancelar activación» → «No, mantener» y luego confirmar; aserción: la evidencia sigue visible en la hoja.
6. D — «Planificar activación» → completar los cinco pasos → guardar; aserción: tarjeta «Planificada» con el foco.
7. E, F, G, H — vista de pauta, detalle del día y vista Día, línea de tiempo con «Mostrar todas», hoja de un email.

Capturas `after-flow-*` junto a las `after-*` del wireframe; `scrollWidth <= clientWidth` en cada paso; recorrido por
teclado con `reducedMotion: 'reduce'`. Línea base: `approved-v3-*`, surface ID `studio-calendar-activations`.

## Design Decision Log

- Decision: todas las escrituras pasan por una superficie superpuesta (hoja, formulario o diálogo) y el estado de la
  grilla vive en la URL, de modo que cada recorrido se puede enlazar y repetir.
- Alternatives considered: edición en línea dentro de la tarjeta (descartada: no cabe la evidencia ni la validación);
  arrastrar para reprogramar (follow-up: necesita el mismo aviso de «Fuera de plan» que el diálogo); una página aparte
  por activación (descartada: se pierde el contexto del calendario).
- Why this pattern: una sola capa superpuesta a la vez mantiene el foco predecible y el deep link
  (`?activation=`, `?plan=1`, `?execution=…&create=1`) permite abrir cualquier paso desde Hoy, un agente o un enlace.
- Reuse / extend / new primitive: reusa `Sheet`, `ConfirmDialog` y el diálogo de conflicto de TASK-1895; el popover del
  día y el formulario son componentes de Studio sobre esas primitives.
- Open risks: reprogramar no mueve la herramienta (Studio no publica), por eso el aviso es obligatorio; si TASK-2003 no
  está vivo, la paridad MCP de las escrituras se prueba cuando lo esté.
