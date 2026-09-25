# TASK-1895 / Marketing Studio — Edición, revisión y resultados en el espacio de campaña

## Meta

- Status: `draft`
- Owner task: `TASK-1895 — Marketing Studio: edición, revisión y métricas en la UI`
- Product Design asset: canvas de Claude Design «Efeonce Marketing Studio», página `v2 · Claro y oscuro` (https://claude.ai/artifact/D6uwRFMzvnaHzGDtDLvxBi), artboards `Studio-Home`, `Studio-Campaigns`, `Studio-Campaign`, `Studio-Calendar`, `Studio-Plan`, `Studio-Command` y `Studio-Mobile`, aprobados por el operador el 2026-09-25 e implementados para las vistas de lectura en TASK-1887.
- Visual direction mode: `source-led`
- Intended consumers: operador de marketing de Efeonce (dueño de campaña), responsable de medios, revisor creativo; en producción sólo tras el login de TASK-1898.
- Copy source: `apps/web/src/copy.ts` del repo `efeonce-marketing-studio` (objeto `COPY`, único lugar de textos de Studio; test `apps/web/src/copy.test.ts`).
- Primitive decision: `extend` — se extienden las piezas existentes de Studio (`.card`, `.btn`, `.btn-primary`, `.seg`, `.pill`, `.chip`, `.callout-*`, `.kpi`, `.inspector`, `.palette-backdrop`, `Pipeline`, `MediaPlanView`, `PiecesWorkspace`). Nacen dos primitives locales nuevas: `Sheet` (panel lateral modal, pantalla completa bajo 860 px) y `ConfirmDialog`; no hay MUI ni Vuexy en Studio.
- UI ready target: `no` — falta que el operador apruebe los artboards de edición (ver «Brecha de dirección visual»).

### Brecha de dirección visual (declarada, no inventada)

El canvas v2 aprobado cubre sólo lectura: no hay artboards de hoja de edición, subida de versión, diálogo de
conflicto, aprobación de presupuesto ni pestaña de resultados. Este wireframe extiende la dirección aprobada con
sus mismas regiones, tokens y jerarquía, pero **no es la dirección aprobada de la edición**. Antes de `UI ready:
yes`, el Slice 1 de la task agrega al mismo canvas una página `v3 · Edición` con, como mínimo, los artboards
`Edit-Campaign`, `Edit-Piece-Upload`, `Edit-Copy`, `Edit-Plan-Approve`, `Review-Sheet`, `Conflict`, `Results` y
`Edit-Mobile` (claro y oscuro), y el operador los aprueba. Si la aprobación cambia algo de este documento, gana el
canvas y este wireframe se actualiza.

## Brief

- Primary user: operador de marketing de Efeonce que hoy mantiene la campaña en OneDrive y en el HTML del Campaign Manager, y que después del corte de autoridad la mantiene en Studio.
- User moment: la campaña ya existe y se ve en `/campaigns/[campaignId]`; la persona necesita corregir el brief, reemplazar una pieza por una versión nueva, ajustar un copy, armar o corregir un anuncio, proponer o aprobar presupuesto, mover uno de los tres estados y ver si la campaña está trayendo tráfico.
- Job to be done: «Cambiar la campaña donde la estoy mirando, con la seguridad de que no pisé el trabajo de otro, de que el copy quedó literal y de que ninguna aprobación se registró sin querer.»
- Primary decision signal: la pista de tres estados del hero (`Pipeline`) — Creatividad, Autorización de medios y Lanzamiento — sigue siendo el centro de la página; cada estado se vuelve la puerta de su propia revisión.
- Non-goals: crear campañas nuevas desde cero; lanzar pauta en Meta o LinkedIn; programar posts en Metricool; editar audiencias por definición jsonb; métricas de pauta pagada (no hay cuentas conectadas); cualquier cálculo de negocio en el navegador.

## Desktop Target — 1440×1000

Se conserva el `Shell` actual: `rail` de 76 px a la izquierda, `topbar` con logo, migas, disparador ⌘K, píldora
«Solo lectura» y el `ThemeToggle`. El hero de campaña (`.ws-hero`) conserva el orden aprobado: código · servicio ·
dominio, título en Poppins, botón «Brief y decisiones», `Pipeline` y las pestañas.

Orden de lectura del primer pliegue en `/campaigns/CMP-001`:

1. **Hero** con dos cambios: (a) a la derecha del título, el grupo de acciones pasa a ser `Brief y decisiones` (secundario, ya existe) + `Editar campaña` (secundario) + `Revisión` (primario `.btn-primary`, abre la hoja de revisión); (b) cada paso del `Pipeline` es un botón que abre la hoja de revisión enfocada en ese estado. La pista sigue siendo la señal dominante; las acciones no compiten con ella en tamaño.
2. **Pestañas**: `Piezas · Copys · Anuncios · Medios · Calendario · Resultados`. «Resultados» es la pestaña nueva, al final, porque es lectura derivada y no parte del armado.
3. **Cuerpo por pestaña** (la región dominante no cambia respecto de v2):
   - *Piezas*: tablero concepto × formato real a la izquierda, `inspector` de 430 px a la derecha. El inspector agrega, bajo la vista en el feed, tres bloques en este orden: **Versiones** (lista compacta v4…v1, la vigente marcada, acción `Subir nueva versión`), **Derechos de uso** (estado con fecha y fuente) y los bloques existentes de anuncios, UTM y «Antes de lanzar». Las piezas del tablero con derechos por vencer o vencidos muestran un punto de estado en la esquina con etiqueta textual en su `aria-label`.
   - *Copys*: la grilla de tarjetas por concepto se mantiene; cada tarjeta suma en su cabecera un botón icono `Editar copy` y, si el contrato lo trae, el estado del copy como `.pill`.
   - *Anuncios*: la lista se mantiene; cada fila suma `Editar anuncio` y la cabecera de la lista suma `Nuevo anuncio`.
   - *Medios*: las tres tarjetas KPI (Propuesto · Aprobado · Gasto real) se mantienen separadas. `Editar propuesta` vive dentro de la tarjeta Propuesto; `Registrar aprobación` dentro de la tarjeta Aprobado (vacía con borde punteado mientras no existe); Gasto real no tiene acción y explica por qué.
   - *Resultados*: fila de fuentes (Search Console, GA4, SEO, Pauta) como tarjetas `.kpi`, cada una con su fuente, ventana y frescura; debajo, una serie diaria por fuente en SVG nativo con su tabla alternativa.
4. **Superficies superpuestas**: la edición ocurre en un `Sheet` lateral derecho de 560 px sobre `--backdrop`, que deja visible el hero y la pestaña de origen; las acciones consecuentes (aprobar, bloquear, descartar cambios, conflicto) son `ConfirmDialog` centrados de 480 px. Nunca hay dos hojas abiertas a la vez.

Densidad: la hoja usa el ritmo de `.side-panel` (padding 20, gap 14); los campos se agrupan en secciones con
`.eyebrow`. El pie de la hoja es fijo con `Cancelar` a la izquierda y la acción primaria a la derecha.

## Mobile Target — 390×844

La composición se transforma, no se encoge:

- `rail` oculto y `bottom-nav` fijo de 68 px (comportamiento vigente bajo 860 px). La píldora «Solo lectura» desaparece de la `topbar` (regla actual); su explicación se mueve a un aviso `.callout` al inicio del cuerpo de la campaña cuando la edición no está disponible.
- Hero: las acciones `Editar campaña` y `Revisión` bajan a una fila propia bajo el título, de ancho completo, `Revisión` primero. El `Pipeline` se mantiene horizontal con scroll interno contenido; las pestañas son desplazables dentro de su propia fila (sin scroll de página).
- El inspector de Piezas ya pasa bajo el tablero a 1180 px; Versiones y Derechos quedan en el mismo orden.
- `Sheet` y `ConfirmDialog` pasan a pantalla completa con cabecera fija (título + cerrar) y pie fijo con la acción primaria a ancho completo; cubren el `bottom-nav` porque son modales. El teclado virtual no tapa el pie: el pie se ubica sobre el viewport visual.
- La grilla de edición del presupuesto (mes × canal) se convierte en una lista por mes con un campo por canal apilado y el total del mes al pie de cada grupo.
- Resultados: tarjetas de fuente apiladas a una columna; cada serie diaria ocupa el ancho y su tabla alternativa se abre con un botón «Ver tabla».
- Objetivos táctiles ≥ 44 px (los botones icono pasan de 38 a 44 px en la hoja y en las tarjetas de copy).

## Action Hierarchy

- Primary: `Revisión` en el hero (abre la hoja de revisión); dentro de cada hoja, la acción de guardar o confirmar (`Guardar cambios`, `Registrar versión`, `Aprobar presupuesto`, `Confirmar`).
- Secondary: `Editar campaña`, `Brief y decisiones`, `Subir nueva versión`, `Editar copy`, `Editar anuncio`, `Nuevo anuncio`, `Editar propuesta`, `Descargar original`, `Ver cambios`, `Ver tabla`.
- Destructive: `Descartar cambios` (en el diálogo de salida sucia y en el de conflicto) y `Bloquear pauta`; ambos con `ConfirmDialog` y botón en tono `--err`. No hay borrado de piezas, versiones, copys ni anuncios en esta task.
- Selection vs action: elegir pieza en el tablero, canal y variante en el inspector y la ventana de Resultados son **selección** (`aria-pressed` en `.seg`, sin escritura). Toda escritura requiere un botón explícito dentro de una hoja o diálogo; nada se guarda al perder el foco.
- Pending / disabled: durante el envío la acción primaria muestra «Guardando…» con `aria-busy` y se desactiva; la hoja no se puede cerrar mientras hay un envío en curso (el cierre pide esperar). Las entradas de edición sin permiso usan `aria-disabled="true"` (enfocables) y al activarse abren el aviso con la razón, nunca un botón muerto sin explicación.

## Visual Fidelity Mapping

| Source cue | Greenhouse token / primitive / recipe | Intent preserved | Literal value rejected |
|---|---|---|---|
| Hero de campaña con imagen y pista de tres estados (`Studio-Campaign`) | `.ws-hero` + `Pipeline` existentes; paso de pista como `<button>` con `:focus-visible` de `--action` | la pista es la señal dominante y cada estado es independiente | un botón «Aprobar» genérico o un solo estado global |
| Inspector derecho con vista en el feed | `.inspector` + bloques nuevos con `.eyebrow` y borde superior `var(--line)` | el inspector es la ficha de la pieza; versiones y derechos son parte de ella | un modal aparte para ver versiones |
| Tarjetas Propuesto / Aprobado / Gasto real (`Studio-Plan`) | `.kpi`, `.kpi-empty` (borde punteado), `tone-warn` en propuesto | las tres cifras nunca se suman ni se funden | una cifra total o una barra apilada propuesto+real |
| Panel de búsqueda ⌘K sobre fondo atenuado (`Studio-Command`) | `.palette-backdrop` (`--backdrop`) + superficie `--elev` + `--shadow-lg` para `Sheet` y `ConfirmDialog` | una sola familia de superficies superpuestas en toda la app | sombras o radios nuevos inventados para la hoja |
| Claro y oscuro con switch | roles `--app`, `--chrome`, `--card`, `--elev`, `--inset`, `--selected`, `--line`, `--line2`, `--t1..t3` desde `theme.generated.css` (AXIS 0.2.5) | la edición se ve igual de nítida en ambos temas | hex en `app.css`; si falta un rol (p. ej. fondo de éxito), se agrega en `scripts/generate-theme.mjs` desde AXIS, no a mano |
| Avisos de estado (`callout-warn`, `callout-err`) | `.callout-warn` para derechos por vencer y datos parciales; `.callout-err` para derechos vencidos y errores | el color acompaña a un texto que dice el estado | estados sólo por color o iconos sin etiqueta |
| Tipografía Poppins (display) + Geist (texto) | `next/font` vigente; cifras con `.num` (tabular) | jerarquía editorial de la dirección aprobada | tamaños sueltos fuera de la escala existente |
| Móvil `Studio-Mobile` con navegación inferior | `.bottom-nav` + `Sheet` a pantalla completa | la edición en móvil es una tarea enfocada | hojas laterales angostas en 390 px |

## Layout Skeleton

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| 0 | Topbar | contexto, búsqueda, tema, modo de acceso | `Shell` (+ `WriteGateNotice` al activar «Solo lectura») | `accessMode()` + permisos del actor resueltos en el servidor |
| 1 | Hero · acciones | `Brief y decisiones`, `Editar campaña`, `Revisión` | `CampaignHeroActions` | `CampaignDetail` + `viewerPermissions` |
| 1 | Hero · pista | tres estados, cada uno abre su revisión | `Pipeline` extendido (`interactive`) | `CampaignDetail.states` |
| 1 | Hero · pestañas | seis pestañas incluida Resultados | `nav.tabs` existente | `?tab=` |
| 2 | Piezas · tablero | selección de pieza; punto de derechos | `PiecesWorkspace` | `GET /campaigns/{id}/assets` |
| 2 | Piezas · inspector · Versiones | historial y subida | `VersionHistory` + `UploadVersionDialog` | `GET /assets/{assetId}` (TASK-1890/1893) |
| 2 | Piezas · inspector · Derechos | estado de derechos con fecha y fuente | `RightsStatus` | `asset.rights` (TASK-1893) |
| 2 | Copys · tarjeta | editar copy literal | `CopyCard` + `CopyEditorSheet` | `GET /campaigns/{id}/copies` |
| 2 | Anuncios · lista | crear y editar configuración | `AdList` + `AdEditorSheet` | `GET /campaigns/{id}/ads` + plan (audiencias) |
| 2 | Medios · tarjetas | propuesta, aprobación, gasto real | `MediaPlanView` + `BudgetProposalSheet` + `BudgetApprovalDialog` | `GET /campaigns/{id}/plan` |
| 2 | Resultados | fuentes, frescura, series | `CampaignResults` | `GET /campaigns/{id}/metrics` (TASK-1892) |
| 3 | Superpuesta | edición | `Sheet` | — |
| 3 | Superpuesta | confirmación, conflicto, salida sucia | `ConfirmDialog`, `ConflictDialog` | respuesta 412 del command |
| 3 | Superpuesta | revisión de tres estados | `ReviewSheet` | `CampaignDetail.states` + transiciones permitidas del reader |
| 4 | Aviso vivo | anuncios de resultado | región `aria-live="polite"` única en `Shell` | resultado del command |

## Copy Ledger

Los ids se materializan como claves del objeto `COPY` en `apps/web/src/copy.ts` (p. ej. `studio.edit.campaign.title`
→ `COPY.edit.campaign.title`). Texto en español neutro con tuteo, igual que el copy vigente de Studio.

| Copy id | Region | Text | Dynamic values | Notes |
|---|---|---|---|---|
| `studio.write.readOnlyAction` | topbar | Solo lectura | — | la píldora actual pasa a ser botón que abre la razón |
| `studio.write.reason.open` | aviso | La edición llega con el inicio de sesión de Efeonce ID. Por ahora Studio es de solo lectura. | — | modo `open` |
| `studio.write.reason.noCapability` | aviso | Tu cuenta puede ver esta campaña, pero no editarla. Pide acceso de edición a quien administra Studio. | — | sin `marketing_studio.campaign.write` |
| `studio.write.reason.onedrive` | aviso | Esta campaña todavía se gestiona desde OneDrive. Podrás editarla aquí cuando se declare el corte a Studio. | — | autoridad no cortada |
| `studio.edit.campaign.cta` | hero | Editar campaña | — | secundario |
| `studio.edit.campaign.title` | hoja | Editar campaña | — | — |
| `studio.edit.campaign.subtitle` | hoja | {campaignId} · cada cambio queda en el historial | `campaignId` | — |
| `studio.edit.campaign.fields` | hoja | Nombre · Servicio · Fase del embudo · Audiencia · URL de destino · Brief · Decisiones · Nota interna | — | etiquetas de campo |
| `studio.edit.campaign.urlHelp` | hoja | Incluye https://. Las UTM se agregan en cada anuncio. | — | — |
| `studio.edit.save` | pie de hoja | Guardar cambios | — | primario |
| `studio.edit.saving` | pie de hoja | Guardando… | — | `aria-busy` |
| `studio.edit.cancel` | pie de hoja | Cancelar | — | — |
| `studio.edit.saved` | aviso vivo | Cambios guardados. | — | también toast breve |
| `studio.edit.dirty.title` | diálogo | ¿Descartar los cambios? | — | — |
| `studio.edit.dirty.body` | diálogo | Tienes cambios sin guardar. Si sales ahora, se pierden. | — | — |
| `studio.edit.dirty.keep` / `.discard` | diálogo | Seguir editando / Descartar | — | foco inicial en «Seguir editando» |
| `studio.conflict.title` | diálogo | Esta campaña cambió mientras editabas | — | 412 |
| `studio.conflict.body` | diálogo | Alguien guardó una versión más reciente{by}. Tus cambios siguen aquí: revísalos antes de volver a guardar. | `by` = « ({actor}, {hace 2 min})» si el contrato lo trae | nunca culpa al usuario |
| `studio.conflict.review` / `.discard` | diálogo | Revisar diferencias / Descartar mis cambios | — | sin «sobrescribir» |
| `studio.conflict.theirs` / `.mine` | diálogo | Versión guardada / Tu versión | — | columnas del diff por campo |
| `studio.piece.versions.title` | inspector | Versiones · {n} | `n` | — |
| `studio.piece.versions.current` | inspector | Vigente | — | `.pill tone-ok` |
| `studio.piece.versions.row` | inspector | v{no} · {ancho}×{alto} · {MB} · {fecha} | versión | ausentes se omiten, no se ponen en cero |
| `studio.piece.download` | inspector | Descargar original | — | URL firmada de TASK-1893 |
| `studio.piece.download.onedrive` | inspector | El original de esta versión vive en OneDrive: {ruta} | `ruta` relativa | sin descarga |
| `studio.upload.cta` | inspector | Subir nueva versión | — | — |
| `studio.upload.title` | diálogo | Nueva versión · {pieza} {proporción} | título, ratio | — |
| `studio.upload.drop` | diálogo | Arrastra el archivo aquí o elige uno | — | la zona es también un `<input type=file>` con etiqueta |
| `studio.upload.choose` | diálogo | Elegir archivo | — | — |
| `studio.upload.hint` | diálogo | Misma proporción {proporción}. Formatos: {formatos}. | del contrato | nunca una lista inventada |
| `studio.upload.hashing` | diálogo | Verificando el archivo… | — | — |
| `studio.upload.progress` | diálogo | Subiendo {enviado} de {total} MB | bytes | `<progress>` con valor |
| `studio.upload.finalizing` | diálogo | Registrando la versión… | — | — |
| `studio.upload.duplicate.title` | diálogo | Este archivo ya está registrado | — | dedup por sha256 |
| `studio.upload.duplicate.body` | diálogo | Es idéntico a la versión v{no}. No se creó una versión nueva. | `no` | no es error |
| `studio.upload.created` | aviso vivo | Versión v{no} registrada. La miniatura aparece en unos segundos. | `no` | — |
| `studio.upload.renditionsPending` | inspector | Generando miniaturas… | — | placeholder `piece-ghost` |
| `studio.upload.failed` | diálogo | La subida se interrumpió. La pieza no cambió. | — | CTA Reintentar |
| `studio.upload.expired` | diálogo | El enlace de subida venció. Vuelve a intentarlo. | — | pide intención nueva |
| `studio.upload.cancel` | diálogo | Cancelar subida | — | — |
| `studio.upload.rights` | diálogo | Derechos de uso · Origen · Titular · Uso permitido · Vencen el · Sin vencimiento | — | opcionales si el contrato los acepta |
| `studio.rights.title` | inspector | Derechos de uso | — | — |
| `studio.rights.valid` | inspector | Vigentes hasta el {fecha} | fecha | fuente al lado |
| `studio.rights.expiring` | inspector y tablero | Vencen en {n} días | `n` | `.callout-warn` |
| `studio.rights.expired` | inspector y tablero | Vencieron el {fecha}. No uses esta pieza en anuncios nuevos. | fecha | `.callout-err` |
| `studio.rights.unknown` | inspector | Sin datos de derechos | — | ausente ≠ vigente |
| `studio.copy.edit.cta` | tarjeta | Editar copy | — | botón icono con `aria-label` «Editar copy {canal} {variante}» |
| `studio.copy.edit.title` | hoja | Editar copy · {canal} {variante} | — | — |
| `studio.copy.edit.primaryHelp` | hoja | Se guarda exactamente como lo escribes: saltos de línea y menciones incluidos. | — | — |
| `studio.copy.edit.fields` | hoja | Texto principal · Titular · Descripción · CTA nativo · Nota editorial | — | — |
| `studio.copy.edit.diff` | hoja | Ver cambios | — | antes / después con saltos visibles |
| `studio.ad.new` / `.edit` | lista | Nuevo anuncio / Editar anuncio | — | — |
| `studio.ad.fields` | hoja | Pieza · Copy · Canal · Placement · Audiencia · Objetivo · URL de destino · UTM | — | — |
| `studio.ad.utmPreview` | hoja | URL final | — | calculada por el contrato |
| `studio.ad.notLaunch` | hoja | Guardar no lanza el anuncio. El lanzamiento se registra aparte. | — | — |
| `studio.ad.rightsBlock` | hoja | Esta pieza tiene derechos vencidos. | — | aviso; la regla la decide el command |
| `studio.plan.editProposal` | medios | Editar propuesta | — | dentro de la tarjeta Propuesto |
| `studio.plan.proposalHelp` | hoja | Editas solo la propuesta. La aprobación y el gasto real son registros aparte y nunca se suman. | — | — |
| `studio.plan.currencyLocked` | hoja | La moneda no se puede cambiar mientras haya líneas registradas. | — | — |
| `studio.plan.approve.cta` | medios | Registrar aprobación | — | dentro de la tarjeta Aprobado |
| `studio.plan.approve.title` | diálogo | Aprobar presupuesto de medios · {campaignId} | — | — |
| `studio.plan.approve.copyFrom` | diálogo | Copiar montos de la propuesta | — | acción explícita, nunca por defecto |
| `studio.plan.approve.summary` | diálogo | Aprobarás {monto} para {período} en {países}. | montos | resumen antes de confirmar |
| `studio.plan.approve.reference` | diálogo | Referencia de la aprobación (CDR, correo o acta) | — | obligatoria |
| `studio.plan.approve.confirm` | diálogo | Aprobar presupuesto | — | — |
| `studio.plan.actualLocked` | medios | El gasto real llega desde las cuentas publicitarias. Aún no hay cuentas conectadas. | — | sin acción |
| `studio.review.cta` | hero | Revisión | — | primario |
| `studio.review.title` | hoja | Revisión y aprobación | — | — |
| `studio.review.sections` | hoja | Creatividad · Autorización de medios · Lanzamiento | — | reutiliza `COPY.states.*` |
| `studio.review.history` | hoja | Historial | — | desde la auditoría |
| `studio.review.noActions` | hoja | No hay cambios de estado disponibles desde aquí. | — | lista vacía del reader |
| `studio.review.liveNote` | hoja | «Activa» solo se marca con lectura de la plataforma, nunca a mano. | — | invariante 4 |
| `studio.review.reason` | diálogo | Motivo o referencia | — | obligatoria para bloquear o retroceder |
| `studio.review.confirm` | diálogo | Confirmar | — | — |
| `studio.results.tab` | pestañas | Resultados | — | — |
| `studio.results.lead` | resultados | Datos de Greenhouse · {ventana} | ventana | — |
| `studio.results.window` | resultados | Vuelo de la campaña · Últimos 28 días | — | sólo ventanas que el contrato acepte |
| `studio.results.freshness` | tarjeta | Actualizado {hace} · {fuente} | `hace`, `fuente` | `observedAt` del contrato |
| `studio.results.partial.title` | tarjeta | Datos parciales | — | `.callout-warn` |
| `studio.results.partial.body` | tarjeta | {fuente} no respondió en la última lectura. Mostramos los datos del {fecha}. | — | — |
| `studio.results.absent.title` | tarjeta | Sin datos de {fuente} | — | tarjeta `.kpi-empty` |
| `studio.results.absent.body` | tarjeta | No es cero: la fuente no está conectada o no hay lecturas para este período. | — | — |
| `studio.results.paid` | tarjeta | Pauta · sin cuentas conectadas | — | igual criterio que Medios |
| `studio.results.table` | serie | Ver tabla | — | alternativa de la serie |

## State Copy

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| ready | (sin título) | la vista de lectura vigente más las acciones de edición habilitadas | acciones de la jerarquía | con actor autenticado y permiso |
| loading | — | hoja: esqueleto de campos con `.piece-ghost`; Resultados: tarjetas `.kpi` con valor en blanco y «Cargando…» visible para lectores de pantalla | — | las páginas siguen siendo Server Components; sólo las hojas y Resultados cargan en cliente |
| empty | Sin datos de {fuente} / Esta campaña no tiene anuncios configurados. | textos vigentes de `COPY.workspace.*Empty` + `studio.results.absent.body` | `Nuevo anuncio` si hay permiso | vacío nunca se dibuja como cero |
| partial | Datos parciales | `studio.results.partial.body`; en Piezas, `Generando miniaturas…` | ninguna; se refresca al volver | degradado honesto con fecha |
| error | No pudimos guardar | el `error` es-CL del contrato canónico, tal cual | `Reintentar` sólo si `actionable: true`; si no, cerrar | nunca prosa inventada ni detalle técnico |
| denied | Solo lectura | `studio.write.reason.open` / `.noCapability` / `.onedrive` | cerrar el aviso | la acción se ve `aria-disabled` y explica al activarla |
| conflict | Esta campaña cambió mientras editabas | `studio.conflict.body` | `Revisar diferencias` / `Descartar mis cambios` | 412; nunca sobrescritura ciega |
| duplicate | Este archivo ya está registrado | `studio.upload.duplicate.body` | `Cerrar` | resultado válido, no error |
| rights | Vencen en {n} días / Vencieron el {fecha} | `studio.rights.*` | — | estado calculado por el servidor |

## Accessibility Contract

- Heading order: `h1` = nombre de la campaña (vigente); cada pestaña tiene su `h2`; en una hoja, el título es el nombre accesible del diálogo (`aria-labelledby`) y sus secciones usan `h3`.
- Chart/table alternatives: cada serie de Resultados tiene `role="img"` con resumen textual (mínimo, máximo y total de la ventana) y un botón «Ver tabla» que abre una `<table>` con fecha y valor; la grilla del presupuesto es una `<table>` real con encabezados de fila (mes) y columna (canal).
- Aria labels: botones icono con `aria-label` completo («Editar copy LinkedIn A», «Subir nueva versión de Portada 4:5»); pasos de la pista con «Creatividad: Piezas finales. Abrir revisión»; punto de derechos del tablero con «Derechos vencidos» en el `aria-label` de la pieza.
- Focus notes: `Sheet` y `ConfirmDialog` son `<dialog>` modales (o `role="dialog" aria-modal="true"`) con foco atrapado; foco inicial en el primer campo (hoja) o en la acción no destructiva (diálogo); `Esc` cierra salvo con envío en curso; al cerrar, el foco vuelve al botón que abrió. Errores de validación: resumen al inicio del formulario con enlaces a cada campo y `aria-describedby` en el campo.
- Color-independent state labels: estados de revisión, derechos, frescura y degradación llevan siempre texto; los tonos `--ok/--warn/--err/--info` sólo acompañan. El texto literal del copy se muestra en `.copy-block` con `white-space: pre-wrap`; en el diff, un salto de línea visible se marca con «↵» con `aria-hidden` y el texto accesible dice «salto de línea».
- Progreso: `<progress>` con `aria-valuetext` («12,4 de 48,0 MB»); los cambios de etapa se anuncian una vez por etapa, no por cada byte.

## Implementation Mapping

- Route / surface: `apps/web/src/app/campaigns/[campaignId]/page.tsx` (hero, pestañas, nueva `tab=results`); `apps/web/src/components/Shell.tsx` (píldora como botón + región `aria-live`); sin rutas nuevas de navegación.
- Primitives: `Sheet` y `ConfirmDialog` nuevas en `apps/web/src/components/`, construidas sobre `<dialog>` nativo, `--elev`, `--shadow-lg`, `--backdrop`, `--radius-lg`; reusan `.btn`, `.btn-primary`, `.seg`, `.pill`, `.chip`, `.callout-*`, `.kpi`, `.kpi-empty`.
- Variants / kinds: `Sheet` `size='md'` (560 px) y pantalla completa bajo 860 px; `ConfirmDialog` `tone='default'|'danger'`; `Pipeline` prop `interactive` que convierte cada paso en botón sin cambiar su dibujo.
- Component candidates: `CampaignHeroActions`, `WriteGateNotice`, `EditCampaignSheet`, `VersionHistory`, `UploadVersionDialog`, `RightsStatus`, `CopyEditorSheet`, `AdEditorSheet`, `BudgetProposalSheet`, `BudgetApprovalDialog`, `ReviewSheet`, `ConflictDialog`, `CampaignResults`, `MetricSeries`.
- Copy source: `apps/web/src/copy.ts` (namespaces nuevos `write`, `edit`, `conflict`, `piece`, `upload`, `rights`, `copyEdit`, `ad`, `plan`, `review`, `results`); `copy.test.ts` extendido para que ningún texto quede fuera.
- Data reader / command: lecturas vigentes (`getCampaign`, `listCampaignAssets`, `listCampaignCopies`, `listCampaignAds`, `getCampaignPlan`) + `GET /api/v1/assets/{assetId}` (TASK-1890) + métricas `GET /api/v1/campaigns/{id}/metrics` (TASK-1892) + commands de TASK-1893 (intención de subida firmada, registro de versión, descarga firmada) y de TASK-1894 (edición de campaña, copy, anuncio, líneas de presupuesto, aprobación y cambios de estado). Los nombres exactos se toman del OpenAPI de esas tasks; la UI llama a `/api/v1` por HTTP desde un cliente único (`apps/web/src/client/studio-api.ts`) que agrega `Idempotency-Key`, `If-Match` y parsea el error canónico.
- API parity: la web escribe **por la misma API** que usarán la CLI y Efeonce MCP; no hay Server Actions ni rutas propias de la UI. Si un command no existe en el OpenAPI, su affordance no se construye.
- Access / capability: `marketing_studio.campaign.write` resuelto en el servidor junto con el modo de acceso y la autoridad de la campaña, y entregado a la página como una proyección de permisos; el cliente nunca decide permisos.
- Runtime consumers: web de Studio; ningún consumer de Greenhouse.
- Print/email/PDF considerations: ninguna.
- GVC markers: `data-capture="campaign-hero"`, `"review-sheet"`, `"edit-campaign-sheet"`, `"piece-inspector"`, `"piece-versions"`, `"upload-dialog"`, `"rights-status"`, `"copy-editor"`, `"ad-editor"`, `"plan-cards"`, `"budget-approval"`, `"conflict-dialog"`, `"results"`, `"write-gate"`.

## GVC Scenario Plan

Studio es una app Next.js separada (repo `efeonce-marketing-studio`, no el portal Greenhouse): `pnpm fe:capture` y el
agente de Greenhouse no la alcanzan. La evidencia equivalente se produce con Playwright contra `http://localhost:3100`
(`pnpm --filter @studio/web dev`) apuntando a la base de staging, con el mismo nivel de rigor que GVC premium.

- Scenario file: `apps/web/e2e/task-1895-editing.visual.ts` en el repo de Studio (Playwright como dependencia de desarrollo).
- Route: `/campaigns/CMP-001` (lectura real y modo sin permiso) y la campaña sandbox de staging que fije TASK-1894 para escrituras; `?tab=pieces|copies|ads|media|results`.
- Viewports: 1440×1000 y 390×844, cada uno en tema claro y oscuro (cookie `studio-theme`).
- Quality profile: `premium`
- Required steps: abrir la campaña sin permiso → activar «Solo lectura» → abrir `Editar campaña` con permiso, editar, guardar → provocar 412 con una segunda pestaña y resolver → subir versión nueva (archivo fixture) hasta miniatura → subir el mismo archivo (duplicado) → editar copy con saltos de línea y mención y ver cambios → crear anuncio → editar propuesta → registrar aprobación → abrir la revisión desde cada paso de la pista → Resultados con datos, parciales y ausentes (fixtures de TASK-1892).
- Required captures: cada estado de la tabla «State Copy» en ambos viewports y temas; la hoja abierta y su pie en 390 px con teclado virtual simulado.
- Required `data-capture` markers: los listados en Implementation Mapping.
- Assertions: el texto del copy guardado es byte a byte igual al tecleado; Propuesto, Aprobado y Gasto real muestran cifras distintas y ninguna suma; «Activa» no aparece como acción; ninguna tarjeta de Resultados dibuja «0» cuando la fuente está ausente; la píldora y las acciones deshabilitadas explican la razón.
- Scroll-width checks: `document.documentElement.scrollWidth <= clientWidth` en todas las capturas; pista y pestañas con scroll interno contenido.
- Accessibility/focus checks: `@axe-core/playwright` sin violaciones serias; foco atrapado en hoja y diálogo; `Esc` y retorno de foco verificados por teclado.
- Reduced-motion evidence: captura con `reducedMotion: 'reduce'`; Studio ya anula transiciones bajo esa preferencia y esta task no agrega movimiento.
- Review dossier: `required` — capturas, video corto del recorrido de subida y conflicto, y scorecard en `docs/ui/reviews/TASK-1895-marketing-studio-editing-review-metrics.scorecard.json` de Greenhouse.
- Baseline: `required after direction approval` — la línea base se toma tras aprobar los artboards `v3 · Edición`.

## Design Decision Log

- Decision: editar en hojas laterales sobre el espacio de campaña, con la pista de tres estados como puerta de la revisión, y resultados como sexta pestaña.
- Alternatives considered: (a) edición en línea dentro de cada tarjeta — descartada: el copy literal y el conflicto 412 necesitan un espacio con diff y pie de acciones, y la edición en línea invita a guardar al perder foco; (b) rutas de edición propias (`/campaigns/[id]/edit`) — descartada: rompe el contexto visual aprobado y obliga a duplicar el hero; (c) una pantalla «Aprobaciones» global — descartada por ahora: Hoy ya lleva a la decisión y la revisión vive donde está la evidencia; (d) métricas en Hoy — descartado: Hoy es de decisiones, no de lectura de rendimiento.
- Why this pattern: mantiene la dirección aprobada intacta, concentra toda escritura en superficies con estado explícito (limpio, sucio, enviando, conflicto) y hace imposible escribir por accidente.
- Reuse / extend / new primitive: se extiende `Pipeline`, `PiecesWorkspace`, `MediaPlanView` y `Shell`; nacen `Sheet` y `ConfirmDialog` como primitives locales de Studio, sobre `<dialog>` y tokens vigentes.
- Open risks: los nombres y formas finales de los commands dependen de TASK-1893/1894; la dirección de edición aún no está aprobada; el ejercicio de escritura en runtime requiere un actor con permiso antes de TASK-1898.
- Follow-up: artboards `v3 · Edición` (Slice 1); master flow del programa EPIC-049 (ver flow contract).

## Acceptance Checklist

- [x] All visible strings are in the copy ledger.
- [x] Dynamic values are named and bounded.
- [x] Partial/degraded states are explicit.
- [x] No copy implies a guarantee when data is estimated.
- [x] Charts have table/text alternatives.
- [x] State and aria copy is ready for implementation.
- [x] Implementation mapping names primitive, copy source, data contract and route/surface.
- [x] GVC scenario plan is specific enough for `pnpm fe:capture` or a new scenario file.
- [x] Design decision log explains reuse/extend/new before JSX starts.
- [ ] Artboards `v3 · Edición` aprobados por el operador y este wireframe conciliado con ellos.
