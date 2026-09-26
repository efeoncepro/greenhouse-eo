# TASK-1912 / Marketing Studio — Espacio de planificación: estrategia, audiencias, mensajes, contenidos, SEO/AEO, medición y aprendizajes

## Meta

- Status: `draft`
- Owner task: `TASK-1912 — Marketing Studio: UI del espacio de planificación estratégica`
- Product Design asset: canvas de Claude Design «Efeonce Marketing Studio», página `v2 · Claro y oscuro` (https://claude.ai/artifact/D6uwRFMzvnaHzGDtDLvxBi), artboards `Studio-Campaign`, `Studio-Plan`, `Studio-Command` y `Studio-Mobile` (aprobados por el operador el 2026-09-25, implementados en lectura por TASK-1887), más la página `v3 · Edición` que agrega TASK-1895 (hoja lateral `Sheet`, `ConfirmDialog`, `WriteGateNotice`).
- Visual direction mode: `source-led`
- Intended consumers: dueño de campaña de Efeonce (planifica y pide aprobación), aprobador (`efeonce_admin`, `efeonce_account`, `efeonce_operations`), diseñador (ve qué falta producir), agente por MCP (no usa esta UI; usa las mismas operaciones).
- Copy source: `apps/web/src/copy.ts` del repo `efeonce-marketing-studio` (objeto `COPY`, único lugar de textos; `apps/web/src/copy.test.ts`).
- Primitive decision: `extend` — reusa `Sheet`, `ConfirmDialog`, `ConflictDialog` y `WriteGateNotice` de TASK-1895 y las piezas vigentes (`.card`, `.kpi`, `.kpi-empty`, `.pill`, `.chip`, `.seg`, `.callout-*`, `.eyebrow`, `.inspector`, `nav.tabs`). Nacen cuatro primitives locales: `SectionRail` (navegación de secciones dentro de la pestaña), `MatrixGrid` (tabla persona × etapa con celdas de canal), `ReadinessList` (lista de faltantes para aprobar con enlaces) y `ProvenanceBadge` (origen del contenido y su aceptación).
- UI ready target: `no` — la dirección aprobada no tiene artboards de planificación (ver «Brecha de dirección visual»).

### Brecha de dirección visual (declarada, no inventada)

El canvas v2 cubre las vistas de lectura y `v3 · Edición` (TASK-1895) cubre edición de brief, piezas, copys, anuncios,
medios, revisión y resultados. **Ninguna página tiene la capa de estrategia.** Este wireframe extiende la dirección con
sus mismas regiones, roles de color AXIS y jerarquía, pero no es la dirección aprobada de la planificación. Antes de
`UI ready: yes`, el Slice 1 de la task agrega al mismo canvas una página `v4 · Estrategia` con, como mínimo, los
artboards `Strategy-Summary`, `Strategy-Goals`, `Strategy-AudienceMatrix`, `Strategy-MessageHouse`,
`Strategy-ContentPlan`, `Strategy-SEO`, `Strategy-Measurement`, `Strategy-Experiments`, `Strategy-Approve`,
`Learnings-Library`, `Program` y `Strategy-Mobile`, en claro y oscuro, y el operador los aprueba. Si la aprobación
cambia algo de este documento, gana el canvas y este wireframe se concilia.

## Brief

- Primary user: el dueño de una campaña que hoy arma la estrategia en un documento suelto (o con la skill `efeonce-campaign-planning`) y la pierde de vista cuando empieza la producción.
- User moment: la campaña ya existe con su brief; hay que decidir objetivo y metas, a quién se le habla en cada etapa y por qué canal, qué se dice y con qué pruebas, qué piezas hacen falta y para cuándo, cómo se mide, y — ya lanzada — si las hipótesis se sostuvieron.
- Job to be done: «Tener en un solo lugar la estrategia aprobada de la campaña, ver de un vistazo qué falta producir y qué falta para aprobarla, y aprender de lo que ya corrió.»
- Primary decision signal: el encabezado de la pestaña con el **estado de la versión** (borrador o aprobada, con fecha y quién) y el contador de **faltantes para aprobar**; en Contenidos, el **hueco** por ítem.
- Non-goals: editar el catálogo de canales, las reglas de voz o las conexiones de cuentas publicitarias (se operan por CLI y agentes; follow-up); ejecutar rastreos de palabras clave desde Studio (se ejecutan en Greenhouse o por agente, TASK-1908); lanzar o pausar pauta; calcular métricas en el navegador.

## Desktop Target — 1440×1000

Se conserva el `Shell` (rail de 76 px, topbar con migas, ⌘K, modo de acceso y tema) y el hero de campaña aprobado
(`.ws-hero`: código · servicio · dominio, título, `Pipeline`). Las pestañas pasan a
`Brief · Estrategia · Piezas · Copys · Anuncios · Medios · Calendario · Resultados`; «Estrategia» va después de «Brief»
porque es la respuesta al brief y antes de la ejecución. «Piezas» sigue siendo la pestaña por defecto.

Orden de lectura del primer pliegue en `/campaigns/CMP-001?tab=strategy`:

1. **Encabezado de la pestaña** (ancho completo, bajo las pestañas): a la izquierda, `h2` «Estrategia» + `.pill` de
   versión («Borrador v3 · editado hace 2 h» o «Aprobada v2 · 14 sep · Julio Reyes»); si hay borrador sobre una
   aprobada, un enlace secundario «Ver versión aprobada». A la derecha, la acción primaria según estado:
   `Crear borrador` (sin borrador), `Aprobar plan` (borrador, `.btn-primary`), y un contador de faltantes
   («Faltan 3 cosas para aprobar») que abre la `ReadinessList`. Si el plan está aprobado y la campaña lanzada, a la
   derecha aparece además el resumen de metas («2 de 3 metas en camino · datos hasta 24 sep»).
2. **Cuerpo en dos columnas**: `SectionRail` de 220 px a la izquierda (Resumen · Metas · Audiencias · Mensajes ·
   Contenidos · SEO/AEO · Medición · Experimentos), cada entrada con su estado textual («Completa», «Falta 1»,
   «Sin datos»); a la derecha, la sección activa en tarjetas `.card`.
3. **Secciones** (región dominante a la derecha):
   - *Resumen*: objetivo en una frase grande (Poppins, escala `h3`), tres tarjetas `.kpi` con las metas primarias
     (meta, unidad, ventana, fuente; si la campaña corre, el progreso con estado «En camino / En riesgo / Fuera de
     camino / Sin datos»), el conteo del hueco de contenidos por estado y las hipótesis abiertas.
   - *Metas*: tabla de KPIs (etiqueta, meta, unidad, ventana, fuente, línea base, KPI del brief que responde) y lista de
     hipótesis «Si … entonces … porque …» con sus KPIs y su resultado (`Sin probar`, `Se sostuvo`, `No se sostuvo`,
     `No concluyente`). Editar abre `Sheet`.
   - *Audiencias*: `MatrixGrid` — filas = personas del modelo de cliente (nombre + `.chip` de evidencia `Validada`,
     `Documentada` o `Hipótesis`), columnas = etapas del bow-tie de la versión fijada, celdas = chips de canal con la
     prioridad (`Principal`/`Secundaria`); una celda vacía se ve como «—» con borde punteado. Encima, la versión del
     modelo de cliente («Modelo de cliente v1 · Efeonce») y, si hay versión nueva publicada, un `.callout-info`
     «Hay una versión nueva del modelo de cliente. Revisar referencias» que abre el `dryRun` de cambio de versión.
   - *Mensajes*: bloque del mensaje paraguas (texto literal, `white-space: pre-wrap`), pilares como tarjetas con sus
     pruebas; una prueba sin fuente lleva `.callout-warn` «Sin fuente: bloquea la aprobación»; mensajes por persona en
     acordeón por pilar.
   - *Contenidos*: filtros `.seg` (Canal · Persona · Etapa · Hueco) y una tabla con Título · Canal/formato · Persona y
     etapa · Responsable · Fecha comprometida · Vínculo (pieza/copy/anuncio/post, con miniatura si es pieza) · Hueco
     (`Sin pieza`, `Pieza sin aprobar`, `Vencido`, `Cubierto`, `Descartado`) · procedencia. Una fila abre `Sheet` con
     el ítem y el selector de vínculo.
   - *SEO/AEO*: tabla de objetivos (Objetivo · Tipo · URL o ítem · Snapshot de planificación con fecha · Actual con
     «datos hasta» · Comparación) — las dos columnas de datos nunca comparten estilo ni encabezado; filas con dato
     competitivo llevan `.chip` «Interno»; debajo, propuestas de rastreo con estado leído de Greenhouse y el texto «Se
     ejecuta desde un agente o desde Greenhouse», con botón `Copiar referencia`.
   - *Medición*: convención UTM por canal (tabla), eventos de conversión (GA4 y formulario), cadencia y responsable;
     resultado del último chequeo de destino por URL (`Listo`, `Con advertencias`, `Bloqueado`, con fecha).
   - *Experimentos*: lista (nombre · hipótesis · variantes · ventana · estado · veredicto); aprendizajes validados que
     aplican a la campaña (por alcance) con su evidencia; `Proponer aprendizaje`.
4. **Superficies superpuestas**: edición en `Sheet` lateral de 560 px (una a la vez); aprobaciones, conclusiones,
   validaciones y descartes en `ConfirmDialog` de 480 px con el resumen del `dryRun`; conflicto 412 en
   `ConflictDialog` (heredado de TASK-1895).

Densidad: tablas con altura de fila de la escala vigente; la `MatrixGrid` limita a 8 columnas visibles con scroll
horizontal **contenido** en su propio contenedor (nunca en la página).

## Mobile Target — 390×844

- `bottom-nav` vigente; la fila de pestañas es desplazable dentro de sí misma.
- El encabezado de la pestaña apila: `.pill` de versión, contador de faltantes y la acción primaria a ancho completo.
- `SectionRail` se transforma en un selector `.seg` desplazable horizontalmente dentro de su fila (o un `<select>`
  nativo si hay más de 8 secciones), fijo bajo el encabezado de la pestaña.
- *Audiencias*: `MatrixGrid` se transforma en una lista por persona; dentro de cada persona, una fila por etapa con sus
  chips de canal. La tabla se conserva como alternativa «Ver como tabla» con scroll contenido.
- *Contenidos*: la tabla pasa a tarjetas por ítem con título, canal/formato, fecha y el estado del hueco como `.pill`
  textual; filtros en una hoja.
- `Sheet` y `ConfirmDialog` a pantalla completa con cabecera y pie fijos (comportamiento de TASK-1895).

## Action Hierarchy

- Primary: `Aprobar plan` (con borrador) o `Crear borrador` (sin borrador); dentro de hojas y diálogos, `Guardar cambios`, `Aprobar versión v{n}`, `Concluir experimento`, `Validar aprendizaje`.
- Secondary: `Editar metas`, `Editar matriz`, `Editar mensajes`, `Nuevo ítem`, `Vincular`, `Editar SEO/AEO`, `Tomar snapshot`, `Proponer rastreo`, `Editar medición`, `Ejecutar chequeo de destino`, `Nuevo experimento`, `Capturar resultado`, `Proponer aprendizaje`, `Ver procedencia`, `Aceptar` y `Rechazar` (contenido redactado con IA), `Ver versión aprobada`, `Copiar referencia`.
- Destructive: `Descartar borrador`, `Quitar ítem` (baja reversible dentro del borrador; se confirma en diálogo corto), `Abandonar experimento`, `Retirar aprendizaje`; todos con `ConfirmDialog` en tono `--err`.
- Selection vs action: elegir sección, filtros, persona o celda es selección (sin escritura); toda escritura pasa por un botón explícito en hoja o diálogo; nada se guarda al perder foco.
- Pending / disabled: acción primaria con «Guardando…»/«Aprobando…» y `aria-busy`; sin permiso, las acciones se ven con `aria-disabled="true"` y abren `WriteGateNotice` con la razón (`open_mode`, `missing_capability`, `authority_onedrive`, o `approval_requires_capability` para aprobar sin `.campaign.approve`).

## Visual Fidelity Mapping

| Source cue | Greenhouse token / primitive / recipe | Intent preserved | Literal value rejected |
|---|---|---|---|
| Hero de campaña y pestañas (`Studio-Campaign`) | `.ws-hero` + `nav.tabs` con la pestaña nueva | la campaña sigue siendo el hub; la estrategia es una pestaña, no otra app | una ruta aparte `/campaigns/[id]/strategy` |
| Tarjetas del plan de medios (`Studio-Plan`) | `.kpi` / `.kpi-empty` para metas y progreso | meta, observado y «sin dato» separados y etiquetados | barras de progreso que inventen un porcentaje sin dato |
| Inspector derecho (`Studio-Campaign`) | `Sheet` de TASK-1895 | una sola familia de superficies de edición | paneles nuevos con otra sombra o radio |
| Paleta ⌘K (`Studio-Command`) | `CommandPalette` + entradas «Ir a aprendizajes», «Ir a programas» | navegación suplementaria para destinos sin lugar en el rail | un sexto destino en el rail |
| Claro/oscuro AXIS 0.2.5 | roles `--card`, `--elev`, `--inset`, `--selected`, `--line`, `--t1..t3`, tonos `--ok/--warn/--err/--info` desde `theme.generated.css` | nitidez igual en ambos temas | hex en CSS; un rol faltante se agrega en `scripts/generate-theme.mjs` desde AXIS |
| Móvil con navegación inferior (`Studio-Mobile`) | `.bottom-nav` + `Sheet` a pantalla completa + selector de sección | planificar en el teléfono es leer y ajustar, no rediseñar | una matriz de 8 columnas encogida a 390 px |

## Layout Skeleton

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| 0 | Topbar | contexto, ⌘K, tema, modo | `Shell` | `accessMode()` + proyección de permisos |
| 1 | Hero | campaña, pista, pestañas (+ `Estrategia`) | `.ws-hero`, `Pipeline`, `nav.tabs` | `getCampaign` |
| 1 | Hero · programa | chip «Programa: {nombre}» que lleva a `/programs/[programId]` | `.chip` enlace | `getCampaign.programId` + `getProgram` |
| 2 | Encabezado de pestaña | versión, faltantes, acción primaria, progreso de metas | `StrategyHeader` + `ReadinessList` | `getStrategyPlan` (TASK-1907) + `getKpiProgress` (TASK-1910) |
| 2 | Navegación de secciones | secciones con estado | `SectionRail` | `getStrategyPlan.sections[].status` |
| 3 | Resumen | objetivo, metas, hueco, hipótesis | `StrategySummary` | `getStrategyPlan`, `listContentPlanGaps`, `getKpiProgress` |
| 3 | Metas | KPIs e hipótesis | `GoalsTable`, `HypothesisList` | `getStrategyPlan` + `hypothesis_outcome` (TASK-1911) |
| 3 | Audiencias | matriz persona × etapa × canal | `MatrixGrid` | `getStrategyPlan.audienceMatrix` + `getCustomerModel` (TASK-1905) |
| 3 | Mensajes | paraguas, pilares, pruebas, mensajes por persona | `MessageHouse` | `getStrategyPlan.messageHouse` |
| 3 | Contenidos | ítems y hueco | `ContentPlanTable` + `ContentItemSheet` | `getStrategyPlan.contentItems` + `listContentPlanGaps` |
| 3 | SEO/AEO | objetivos, snapshot vs actual, propuestas | `SeoPlanTable`, `TrackingProposals` | `getSeoPlan`, `getSeoFollowUp`, `listSeoTrackingProposals` (TASK-1908) |
| 3 | Medición | UTM, eventos, chequeo de destino | `MeasurementPanel` | `getStrategyPlan.measurement` + `listLandingChecks` (TASK-1910) |
| 3 | Experimentos | experimentos y aprendizajes aplicables | `ExperimentList`, `LearningCards` | `listExperiments`, `listLearnings` (TASK-1911) |
| 4 | Superpuestas | edición, aprobación, conflicto, procedencia | `Sheet`, `ConfirmDialog`, `ConflictDialog`, `ProvenanceSheet` | `dryRun` de cada command; `getProvenance` (TASK-1909) |
| 5 | Destinos suplementarios | biblioteca y programas | `/learnings`, `/programs`, `/programs/[programId]` | `listLearnings`, `listPrograms`, `getProgram` |

## Copy Ledger

Ids como claves de `COPY` en `apps/web/src/copy.ts` (`studio.strategy.header.title` → `COPY.strategy.header.title`).
Español neutro con tuteo. Nombres fijos de las cuatro cifras de dinero del master flow; aquí no aparecen montos.

| Copy id | Region | Text | Dynamic values | Notes |
|---|---|---|---|---|
| `studio.tabs.strategy` | pestañas | Estrategia | — | después de «Brief» |
| `studio.strategy.header.title` | encabezado | Estrategia | — | `h2` |
| `studio.strategy.version.draft` | encabezado | Borrador v{n} · editado {hace} | `n`, `hace` | `.pill` |
| `studio.strategy.version.approved` | encabezado | Aprobada v{n} · {fecha} · {persona} | `n`, `fecha`, `persona` | `.pill` tono ok |
| `studio.strategy.version.viewApproved` | encabezado | Ver versión aprobada | — | enlace |
| `studio.strategy.create` | encabezado | Crear borrador | — | primario sin borrador |
| `studio.strategy.approve` | encabezado | Aprobar plan | — | primario con borrador |
| `studio.strategy.readiness.count` | encabezado | Faltan {n} cosas para aprobar | `n` (1 ⇒ «Falta 1 cosa para aprobar») | abre la lista |
| `studio.strategy.readiness.ready` | encabezado | Listo para aprobar | — | — |
| `studio.strategy.progress.summary` | encabezado | {k} de {n} metas en camino · datos hasta {fecha} | `k`, `n`, `fecha` | sólo con plan aprobado y campaña lanzada |
| `studio.strategy.sections` | rail | Resumen · Metas · Audiencias · Mensajes · Contenidos · SEO/AEO · Medición · Experimentos | — | etiquetas |
| `studio.strategy.section.complete` / `.missing` / `.noData` | rail | Completa / Falta {n} / Sin datos | `n` | estado textual |
| `studio.strategy.kpi.baselineMissing` | metas | Sin línea base | — | nunca «0» |
| `studio.strategy.kpi.state` | metas | En camino / En riesgo / Fuera de camino / Sin datos / Fuente no conectada | — | desde el reader |
| `studio.strategy.hypothesis.state` | metas | Sin probar / Se sostuvo / No se sostuvo / No concluyente | — | `hypothesis_outcome` |
| `studio.strategy.matrix.evidence` | audiencias | Validada / Documentada / Hipótesis | — | `.chip` de evidencia |
| `studio.strategy.matrix.empty` | audiencias | Sin canal para esta etapa | — | celda vacía, `aria-label` |
| `studio.strategy.matrix.newModel` | audiencias | Hay una versión nueva del modelo de cliente. Revisar referencias | — | `.callout-info` |
| `studio.strategy.matrix.pending` | audiencias | Referencia pendiente: {nota} | `nota` | bloquea aprobar |
| `studio.strategy.proof.noSource` | mensajes | Sin fuente: bloquea la aprobación | — | `.callout-warn` |
| `studio.strategy.gap` | contenidos | Sin pieza / Pieza sin aprobar / Vencido / Cubierto / Descartado | — | estado del hueco |
| `studio.strategy.gap.summary` | resumen | {n} ítems sin pieza · {m} vencidos | `n`, `m` | — |
| `studio.strategy.seo.snapshot` | SEO/AEO | Snapshot de planificación · {fecha} | `fecha` | encabezado de columna |
| `studio.strategy.seo.current` | SEO/AEO | Actual · datos hasta {fecha} | `fecha` | encabezado de columna |
| `studio.strategy.seo.notComparable` | SEO/AEO | No comparable: cambió la metodología | — | — |
| `studio.strategy.seo.internal` | SEO/AEO | Interno | — | `.chip`; nunca en superficie de cliente |
| `studio.strategy.seo.executeHint` | SEO/AEO | Se ejecuta desde un agente o desde Greenhouse. Studio guarda la propuesta y lee el resultado. | — | — |
| `studio.strategy.seo.copyRef` | SEO/AEO | Copiar referencia | — | copia `proposalRef` |
| `studio.strategy.landing.state` | medición | Listo / Con advertencias / Bloqueado · {fecha} | `fecha` | chequeo de destino |
| `studio.strategy.provenance.ai` | global | Redactado con IA · sin aceptar | — | `ProvenanceBadge` |
| `studio.strategy.provenance.accepted` | global | Redactado con IA · aceptado por {persona} | `persona` | — |
| `studio.strategy.provenance.view` | global | Ver procedencia | — | abre hoja |
| `studio.strategy.approve.title` | diálogo | Aprobar la versión v{n} del plan | `n` | — |
| `studio.strategy.approve.body` | diálogo | Esta versión queda fija y la campaña se medirá contra ella. Para cambiarla después, se crea un borrador nuevo. | — | — |
| `studio.strategy.approve.diff` | diálogo | {a} agregados · {c} cambiados · {q} quitados respecto de la versión aprobada | `a`, `c`, `q` | expandible |
| `studio.strategy.approve.blocked` | diálogo | Todavía no se puede aprobar. Resuelve estos puntos: | — | seguido de `ReadinessList` |
| `studio.strategy.approve.cta` | diálogo | Aprobar versión v{n} | `n` | primario |
| `studio.strategy.approved` | aviso vivo | Plan aprobado. La versión v{n} queda fija. | `n` | — |
| `studio.strategy.discard.title` | diálogo | ¿Descartar el borrador v{n}? | `n` | destructivo |
| `studio.learnings.title` | biblioteca | Aprendizajes | — | `h1` de `/learnings` |
| `studio.learnings.evidenceRequired` | hoja | Agrega al menos una evidencia: un experimento, una observación o un snapshot. | — | validación |
| `studio.programs.title` | programas | Programas | — | `h1` de `/programs` |
| `studio.write.reason.noApprove` | aviso | Puedes editar este plan, pero aprobarlo requiere permiso de aprobación. | — | `approval_requires_capability` |

## State Copy

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| ready | (sin título) | pestaña con secciones y acciones según proyección | acciones de la jerarquía | — |
| empty (sin plan) | Esta campaña todavía no tiene estrategia | Crea un borrador para definir objetivo, metas, audiencias, mensajes y contenidos. | `Crear borrador` (si hay permiso) | nunca un plan vacío fingido |
| empty (sección) | Sin {sección} todavía | texto de ayuda por sección | `Editar {sección}` | — |
| loading | — | esqueleto de encabezado y de la sección activa; «Cargando…» para lectores de pantalla | — | la página es Server Component; hojas cargan en cliente |
| degraded (modelo de cliente) | No pudimos leer el modelo de cliente | Las referencias se muestran por id hasta que vuelva la conexión con Greenhouse. | `Reintentar` si `actionable` | `customer_model_unavailable` |
| degraded (SEO/AEO) | Datos actuales no disponibles | Se muestra el snapshot de planificación; la lectura en vivo volverá cuando responda la fuente. | — | nunca «0» |
| no data (metas) | Sin datos | La fuente de esta meta todavía no tiene datos para la ventana. | — | `no_data` / `not_connected` distintos |
| not ready (aprobar) | Todavía no se puede aprobar | `studio.strategy.approve.blocked` + lista | enlaces a cada sección | `422 strategy_plan_not_ready` |
| conflict | Este plan cambió mientras editabas | texto de TASK-1895 | `Revisar diferencias` / `Descartar mis cambios` | 412 |
| error | No pudimos guardar | `error` es-CL del contrato | `Reintentar` sólo si `actionable: true` | — |
| denied | Solo lectura | razones de `WriteGateNotice` (+ `noApprove`) | cerrar | acción visible y `aria-disabled` |

## Accessibility Contract

- Heading order: `h1` = campaña (vigente); `h2` = «Estrategia»; cada sección `h3`; en hojas y diálogos el título es el nombre accesible (`aria-labelledby`).
- `MatrixGrid` es una `<table>` real con `<th scope="row">` (persona) y `<th scope="col">` (etapa); cada celda anuncia «{persona}, {etapa}: {canales} » o «Sin canal para esta etapa»; en móvil, la lista conserva el mismo orden de lectura.
- `SectionRail` es `nav` con `aria-label="Secciones de la estrategia"` y `aria-current="true"` en la activa; el estado de cada sección está en texto.
- Tablas de contenidos, SEO/AEO y metas con encabezados reales; el hueco y los estados siempre en texto, el color sólo acompaña.
- `ReadinessList` es una lista con enlaces que mueven el foco al campo o sección con el faltante.
- `ProvenanceBadge` tiene texto visible; «Ver procedencia» abre una hoja con modelo, instrucción, fuentes y aceptación.
- Foco: hojas y diálogos modales con foco atrapado, foco inicial en el primer campo (hoja) o en la acción no destructiva (diálogo), `Esc` cierra salvo envío en curso, retorno al disparador.
- Texto literal (mensajes, pruebas, enunciados de aprendizaje) con `white-space: pre-wrap`.

## Implementation Mapping

- Route / surface: `apps/web/src/app/campaigns/[campaignId]/page.tsx` (`tab=strategy`, `section=`), `apps/web/src/app/learnings/page.tsx` [nuevo], `apps/web/src/app/programs/page.tsx` [nuevo], `apps/web/src/app/programs/[programId]/page.tsx` [nuevo]; entradas nuevas en `CommandPalette` («Ir a aprendizajes», «Ir a programas»).
- Primitives: reuse `Sheet`, `ConfirmDialog`, `ConflictDialog`, `WriteGateNotice` (TASK-1895); new `SectionRail`, `MatrixGrid`, `ReadinessList`, `ProvenanceBadge` en `apps/web/src/components/`.
- Variants / kinds: `SectionRail` `layout='rail'|'seg'` (bajo 860 px); `MatrixGrid` `layout='table'|'list'`; `ProvenanceBadge` `state='ai_pending'|'ai_accepted'|'human'`.
- Component candidates: `StrategyHeader`, `StrategySummary`, `GoalsTable`, `HypothesisList`, `GoalsSheet`, `MatrixGrid`, `AudienceCellSheet`, `MessageHouse`, `MessageHouseSheet`, `ContentPlanTable`, `ContentItemSheet`, `SeoPlanTable`, `TrackingProposals`, `MeasurementPanel`, `ExperimentList`, `ExperimentSheet`, `LearningCards`, `LearningSheet`, `ApprovePlanDialog`, `ProvenanceSheet`, `LearningsLibrary`, `ProgramView`.
- Copy source: `apps/web/src/copy.ts` namespaces `strategy`, `learnings`, `programs` (+ `write.reason.noApprove`); `copy.test.ts` extendido.
- Data reader / command: TASK-1907 (`getStrategyPlan`, `listStrategyPlanVersions`, `listContentPlanGaps`, `createStrategyPlanDraft`, `setPlanStrategy`, `setPlanAudienceMatrix`, `setPlanMessageHouse`, `upsertContentPlanItem`, `removeContentPlanItem`, `setPlanMeasurement`, `setContentPlanItemProgress`, `approveStrategyPlan`, `discardStrategyPlanDraft`, `listPrograms`, `getProgram`, `setCampaignProgram`); TASK-1905 (`getCustomerModel`, `listChannels`, `setCampaignCustomerModelVersion`); TASK-1908 (`getSeoPlan`, `getSeoFollowUp`, `setPlanSeoAeo`, `captureSeoSnapshots`, `proposeSeoKeywordTracking`, `listSeoTrackingProposals`); TASK-1909 (`getProvenance`, `acceptAiDraft`, `rejectAiDraft`); TASK-1910 (`getKpiProgress`, `listLandingChecks`, `runLandingCheck`); TASK-1911 (`listExperiments`, `upsertExperimentDesign`, `captureExperimentResult`, `concludeExperiment`, `listLearnings`, `proposeLearning`, `validateLearning`, `retireLearning`).
- API parity: la web escribe por `/api/v1` desde el cliente único `apps/web/src/client/studio-api.ts` (TASK-1895) con `Idempotency-Key`, `If-Match` y el flujo `dryRun` → digest → confirmación para `T2`; si una operación no está en el OpenAPI, su affordance no se construye.
- Access / capability: proyección de permisos del reader (`writable`, `lockReason`, `canApprove`, `revision`) calculada en el servidor; la UI nunca lee roles.
- Runtime consumers: web de Studio.
- Print/email/PDF considerations: ninguna.
- GVC markers: `data-capture="strategy-header"`, `"strategy-rail"`, `"strategy-summary"`, `"strategy-goals"`, `"strategy-matrix"`, `"strategy-messages"`, `"strategy-content"`, `"strategy-seo"`, `"strategy-measurement"`, `"strategy-experiments"`, `"approve-plan-dialog"`, `"readiness-list"`, `"provenance-sheet"`, `"learnings-library"`, `"program-view"`.

## GVC Scenario Plan

Studio es una app separada: `pnpm fe:capture` de Greenhouse no la alcanza. La evidencia equivalente se produce con
Playwright + axe contra `http://localhost:3100` y la base de staging, con rigor de GVC premium.

- Scenario file: `apps/web/e2e/task-1912-strategy.visual.ts` (repo de Studio).
- Route: `/campaigns/CMP-900?tab=strategy&section=…` (campaña sandbox de staging con plan completo, plan con faltantes y plan aprobado con campaña lanzada), `/learnings`, `/programs`, `/programs/{programId}`.
- Viewports: 1440×1000 y 390×844, tema claro y oscuro.
- Quality profile: `premium`
- Required steps: sin plan → crear borrador → completar metas → matriz (celda nueva) → mensajes con una prueba sin fuente → intentar aprobar (bloqueado, lista de faltantes) → agregar fuente → aprobar con diálogo y diff → editar (borrador nuevo) → contenidos con vínculo a pieza y ver hueco → SEO/AEO con snapshot vs actual y propuesta → medición con chequeo de destino → experimento concluido → aprendizaje validado → bloque redactado con IA aceptado → biblioteca y programa.
- Required captures: cada estado de «State Copy» en ambos viewports y temas; matriz en tabla y en lista; diálogo de aprobación bloqueado y listo.
- Required `data-capture` markers: los de Implementation Mapping.
- Assertions: la versión aprobada no ofrece edición directa; snapshot y actual nunca comparten encabezado; ninguna meta sin dato muestra «0»; el chip «Interno» existe sólo en filas competitivas; aprobar exige el diálogo; `aria-disabled` explica la razón.
- Scroll-width checks: `document.documentElement.scrollWidth <= clientWidth` en todas las capturas; `MatrixGrid` y rail de secciones con scroll contenido.
- Accessibility/focus checks: `@axe-core/playwright` sin violaciones serias; tabla de la matriz con encabezados; foco atrapado y devuelto.
- Reduced-motion evidence: captura con `reducedMotion: 'reduce'`; la task no agrega movimiento propio.
- Review dossier: `required` — capturas, video corto del recorrido de aprobación y scorecard en `docs/ui/reviews/TASK-1912-marketing-studio-strategy-planning-space.scorecard.json` de Greenhouse.
- Baseline: `required after direction approval` (tras aprobar `v4 · Estrategia`).

## Design Decision Log

- Decision: la estrategia vive como pestaña «Estrategia» del espacio de campaña con navegación de secciones propia; aprendizajes y programas son destinos suplementarios por ⌘K y enlaces contextuales.
- Alternatives considered: (a) un destino global «Estrategia» en el rail — descartado: el rail tiene 5 destinos (límite del master flow) y el plan pertenece a una campaña; (b) una ruta propia `/campaigns/[id]/strategy` — descartada: rompe el hub y duplica el hero; (c) todas las secciones en una sola página larga — descartada: 8 bloques con tablas hacen inmanejable el scroll y esconden los faltantes; (d) editar el catálogo de canales y las reglas de voz aquí — descartado: son gobierno de catálogo con capability restringida; se operan por CLI y agentes hasta un follow-up.
- Why this pattern: conserva la dirección aprobada, pone la aprobación y sus faltantes en el primer pliegue, y reutiliza las superficies de edición de TASK-1895 para que toda escritura tenga un estado explícito.
- Reuse / extend / new primitive: reusa `Sheet`, `ConfirmDialog`, `ConflictDialog`, `WriteGateNotice`, `.kpi`, `.chip`; crea `SectionRail`, `MatrixGrid`, `ReadinessList`, `ProvenanceBadge` como primitives locales de Studio.
- Open risks: dirección `v4 · Estrategia` sin aprobar; nombres finales de operaciones dependen de TASK-1905/1907/1908/1909/1910/1911; la escritura en runtime exige actor con permiso (TASK-1898 o actor de prueba de TASK-1894).
- Follow-up: UI de catálogo de canales, reglas de voz y conexiones publicitarias.

## Acceptance Checklist

- [x] All visible strings are in the copy ledger.
- [x] Dynamic values are named and bounded.
- [x] Partial/degraded states are explicit.
- [x] No copy implies a guarantee when data is estimated.
- [x] Charts have table/text alternatives.
- [x] State and aria copy is ready for implementation.
- [x] Implementation mapping names primitive, copy source, data contract and route/surface.
- [x] GVC scenario plan is specific enough for a new scenario file.
- [x] Design decision log explains reuse/extend/new before JSX starts.
- [ ] Artboards `v4 · Estrategia` aprobados por el operador y este wireframe conciliado con ellos.
