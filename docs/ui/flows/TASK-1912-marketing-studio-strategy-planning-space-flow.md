# TASK-1912 — Marketing Studio: espacio de planificación estratégica · Flow Contract

## Meta

- Status: `draft`
- Owner task: `TASK-1912 — Marketing Studio: UI del espacio de planificación estratégica`
- Related wireframe: [`docs/ui/wireframes/TASK-1912-marketing-studio-strategy-planning-space.md`](../wireframes/TASK-1912-marketing-studio-strategy-planning-space.md)
- Intended route / surface: `studio.efeonce.org/campaigns/[campaignId]?tab=strategy&section=…`, `/learnings`, `/programs`, `/programs/[programId]` (repo `efeonce-marketing-studio`, `apps/web`), con entradas desde Hoy, el hero de campaña (chip de programa), ⌘K y enlaces contextuales.
- Flow type: `command-backed`
- Primary primitives: `Sheet`, `ConfirmDialog`, `ConflictDialog`, `WriteGateNotice` (TASK-1895); `SectionRail`, `MatrixGrid`, `ReadinessList`, `ProvenanceBadge` (nuevas, locales de Studio); `CommandPalette` (vigente).
- Copy source: `apps/web/src/copy.ts` (`COPY`) del repo de Studio.

### Lugar en el programa (EPIC-049)

Master flow del programa: [`EPIC-049-marketing-studio-UI-FLOW.md`](EPIC-049-marketing-studio-UI-FLOW.md). Este contrato
agrega nodos nuevos sin renombrar los existentes; ante una diferencia de nodos, rutas o actores, gana el master flow.

| Nodo | Superficie | Ruta | Dueña | Rol en este flujo |
|---|---|---|---|---|
| `MS-N3.10` | **Estrategia** (pestaña del espacio de campaña, con secciones) | `?tab=strategy&section=summary\|goals\|audiences\|messages\|content\|seo\|measurement\|experiments` | TASK-1912 sobre TASK-1905/1907/1908/1909/1910/1911 | nodo central de este flujo |
| `MS-N11` | **Aprendizajes** (biblioteca de la organización) | `/learnings?channel=&persona=&stage=&status=` | TASK-1912 sobre TASK-1911 | destino suplementario (⌘K y enlaces) |
| `MS-N12` | **Programas** (lista y detalle) | `/programs`, `/programs/[programId]` | TASK-1912 sobre TASK-1907 | destino suplementario (chip del hero y ⌘K) |
| `MS-N3.2` | Brief | `?tab=brief` | TASK-1895 | entrada: el plan responde al brief; «Ver brief» desde Metas |
| `MS-N3.3…MS-N3.5` | Piezas, Copys, Anuncios | `?tab=pieces\|copies\|ads` | TASK-1895 | destino de «Vincular» y de los enlaces del hueco |
| `MS-N3.8` | Resultados | `?tab=results` | TASK-1895 sobre TASK-1892/1910 | destino de «Ver resultados» desde Metas |
| `MS-N1` | Hoy | `/` | TASK-1887/1895 | entrada: ítems de atención «N ítems del plan vencidos», «Plan listo para aprobar» |
| `MS-N7` | Agentes por MCP | `mcp.efeonce.org/mcp` | TASK-1899 y tasks de la capa | consumidor paralelo de las mismas operaciones; no es superficie visual |

## Flow Brief

- Primary user: dueño de campaña con `marketing_studio.campaign.write`; aprobador con `marketing_studio.campaign.approve`.
- Entry moment: la campaña tiene brief (TASK-1894/1895) y necesita estrategia; o ya corre y hay que revisar metas, hueco, hipótesis y aprendizajes.
- Successful outcome: una versión aprobada del plan, con faltantes resueltos, contra la que se mide la campaña; el hueco de contenidos visible hasta cubrirse; hipótesis con resultado y aprendizajes validados con evidencia.
- Primary decision/action: aprobar el plan (`T2`); en segundo lugar, concluir un experimento y validar un aprendizaje (`T2`).
- Non-goals: escribir el brief o el plan de medios desde aquí; editar catálogos (canales, voz), conexiones publicitarias o el modelo de cliente; ejecutar rastreos de palabras clave; calcular metas, huecos o comparaciones en el navegador.

## Surfaces Involved

| Surface | Role | Desktop behavior | Mobile / compact behavior | Primitive |
|---|---|---|---|---|
| Pestaña Estrategia | contexto y navegación de secciones | encabezado + `SectionRail` 220 px + sección | encabezado apilado + selector de sección | Server Component + `SectionRail` |
| Hoja de edición de sección | editar metas, matriz, mensajes, medición, SEO/AEO | `Sheet` 560 px modal | pantalla completa, pie fijo | `Sheet` |
| Hoja de ítem de contenido | editar ítem y vincular pieza/copy/anuncio/post | `Sheet` 560 px con selector de vínculo | pantalla completa | `Sheet` |
| Lista de faltantes | qué falta para aprobar | popover anclado al contador + dentro del diálogo de aprobación | hoja a pantalla completa | `ReadinessList` |
| Diálogo de aprobación | `dryRun` → diff → confirmación | `ConfirmDialog` 560 px | pantalla completa | `ConfirmDialog` |
| Diálogos `T2` secundarios | concluir, abandonar, validar, retirar, descartar borrador | `ConfirmDialog` 480 px | pantalla completa | `ConfirmDialog` |
| Hoja de procedencia | modelo, instrucción, fuentes, aceptación | `Sheet` 480 px de sólo lectura con `Aceptar`/`Rechazar` | pantalla completa | `Sheet` |
| Conflicto | resolver 412 | `ConflictDialog` de TASK-1895 | igual | `ConflictDialog` |
| Aviso de permiso | explicar por qué no se puede editar o aprobar | popover no modal | `.callout` al inicio de la sección | `WriteGateNotice` |
| Biblioteca de aprendizajes | explorar, validar, retirar | página con filtros `.seg` y tarjetas | una columna, filtros en hoja | página + `Sheet` |
| Programa | tesis, pilares, metas por periodo y campañas | página con tabla de campañas | tarjetas por campaña | página |

## Flow Map

1. Entry: la persona llega a `?tab=strategy` (pestaña, Hoy, ⌘K); el servidor resuelve actor, modo de acceso, autoridad y la proyección de permisos (`writable`, `lockReason`, `canApprove`, `revision`) junto con el plan (borrador y aprobada), la cobertura y el progreso.
2. Primary action: sin plan, `Crear borrador`; con borrador, editar secciones en hojas; con faltantes en cero, `Aprobar plan`. Sin permiso, `WriteGateNotice` con la razón y el flujo termina ahí.
3. Transition: la hoja se inicializa con los datos del reader y la `revision` de la versión en borrador (viaja en `If-Match`).
4. User decision: guardar la sección (`T1`, sin confirmación extra) o, en aprobación, revisar faltantes y diff y confirmar.
5. Completion: el cliente envía el command a `/api/v1` con `Idempotency-Key` estable por intento e `If-Match`; en `T2`, primero `dryRun`, luego la llamada con `confirmation.proposalDigest`; con 2xx cierra, `router.refresh()` y anuncia.
6. Recovery / exit: `422 strategy_plan_not_ready` ⇒ el diálogo muestra la lista con enlaces; `412` ⇒ `ConflictDialog`; `409 confirmation_mismatch` ⇒ el diálogo vuelve a pedir el `dryRun` y muestra el diff nuevo; error con `actionable: true` ⇒ `Reintentar` con la misma clave.

### Sub-flujo A — Aprobar el plan (`T2`, TASK-1907)

1. `Aprobar plan` abre el diálogo y llama `approveStrategyPlan` con `dryRun=true`.
2. Si `readiness[]` no está vacío: título «Todavía no se puede aprobar», lista con un enlace por faltante que cierra el diálogo y lleva a la sección y al campo; la acción primaria no aparece.
3. Si está vacío: resumen «{a} agregados · {c} cambiados · {q} quitados respecto de la versión aprobada» (expandible), texto de consecuencia y `Aprobar versión v{n}`.
4. Confirmar envía la misma `Idempotency-Key` con `confirmation.proposalDigest`; éxito ⇒ la pill pasa a «Aprobada v{n}», el anuncio vivo lo confirma y el borrador desaparece.
5. Contenido redactado con IA sin aceptar aparece como faltante («Acepta o rechaza el contenido redactado con IA en Mensajes») por la guarda de TASK-1909.

### Sub-flujo B — Cubrir el hueco de contenidos (TASK-1907)

1. En Contenidos, el filtro «Hueco: Sin pieza» muestra lo pendiente; una fila abre la hoja del ítem.
2. `Vincular` ofrece piezas, copys, anuncios y posts **de la misma campaña** (búsqueda por `GET /api/v1/search` acotada a la campaña); elegir y guardar llama `setContentPlanItemProgress` (`T1`, fuera de la versión).
3. El hueco se recalcula en el servidor tras `router.refresh()`; una pieza sin versión aprobada queda «Pieza sin aprobar» con enlace a su revisión (`?tab=pieces&piece=`).

### Sub-flujo C — Contenido redactado con IA (TASK-1909)

1. Un bloque con `ProvenanceBadge` «Redactado con IA · sin aceptar» muestra `Ver procedencia`, `Aceptar` y `Rechazar`.
2. `Ver procedencia` abre la hoja con modelo, proveedor, instrucción, fuentes (ids y versiones, `contextDigest`), persona que ejecutó el agente y eventos.
3. `Aceptar` / `Rechazar` son `T1` con persona (sin diálogo de digest); el badge cambia a «aceptado por {persona}».

### Sub-flujo D — SEO/AEO (TASK-1908)

1. La sección muestra objetivos con «Snapshot de planificación · {fecha}» y «Actual · datos hasta {fecha}» en columnas separadas y la comparación calculada por el servidor.
2. `Tomar snapshot` (`T1`) llama `captureSeoSnapshots`; el resultado aparece como snapshot nuevo, nunca reemplaza al anterior.
3. `Proponer rastreo` (`T1`) registra la propuesta; la UI no ejecuta el rastreo: muestra el texto de ejecución y `Copiar referencia`; el estado cambia sólo cuando el readback de Greenhouse lo confirma.

### Sub-flujo E — Experimento y aprendizaje (TASK-1911)

1. `Nuevo experimento` (hoja) exige una hipótesis del plan aprobado y variantes de la campaña.
2. `Capturar resultado` (`T1`) guarda un snapshot desde los readers de Studio.
3. `Concluir experimento` (`T2`): `dryRun` con veredicto y efecto en la hipótesis → confirmación.
4. `Proponer aprendizaje` (hoja, evidencia obligatoria) → en `/learnings`, `Validar` o `Retirar` (`T2`).

## Interaction Triggers

| Trigger | Source | Target state/surface | Keyboard equivalent | Notes |
|---|---|---|---|---|
| pestaña «Estrategia» | `nav.tabs` | `?tab=strategy&section=summary` | Tab + Enter | — |
| entrada de `SectionRail` | rail / selector | `?section=…` | flechas en el `nav` + Enter | `replaceState`; no empuja historial |
| `Crear borrador` | encabezado | `submitting` → borrador | Enter/Espacio | sin permiso → aviso |
| contador de faltantes | encabezado | `ReadinessList` | Enter/Espacio | — |
| `Editar {sección}` | sección | hoja `open` | Enter/Espacio | — |
| celda de la matriz | `MatrixGrid` | hoja de celda | Enter en la celda | la celda es botón dentro de la tabla |
| fila de contenidos | tabla | hoja del ítem | Enter en la fila | — |
| `Aprobar plan` | encabezado | diálogo `dry-run` | Enter/Espacio | — |
| `Aprobar versión v{n}` | diálogo | `confirming` | Enter/Espacio | foco inicial en «Cancelar» |
| `Ver procedencia` | badge | hoja de procedencia | Enter/Espacio | — |
| `Aceptar` / `Rechazar` | badge u hoja | `submitting` | Enter/Espacio | — |
| `Tomar snapshot` / `Proponer rastreo` | SEO/AEO | `submitting` / hoja | Enter/Espacio | — |
| `Concluir experimento` | hoja de experimento | diálogo `dry-run` | Enter/Espacio | — |
| chip «Programa» | hero | `/programs/[programId]` | Enter | navegación de página |
| «Ir a aprendizajes» / «Ir a programas» | ⌘K | `/learnings` / `/programs` | ⌘K / Ctrl+K | destinos sin lugar en el rail |
| `Esc` / clic en el fondo | hoja o diálogo | `closing` o `dirty-confirm` | Esc | bloqueado en `submitting` |

## State Machine

| State | Meaning | Entry trigger | Exit trigger | UI requirements |
|---|---|---|---|---|
| no-plan | la campaña no tiene plan | carga | `Crear borrador` | estado vacío con acción (si hay permiso) |
| draft-clean | borrador sin cambios locales | carga, éxito | abrir hoja | pill «Borrador v{n}»; contador de faltantes |
| locked | sin permiso de escribir o aprobar | acción sin permiso | cerrar aviso | razón textual (`open_mode`, `missing_capability`, `authority_onedrive`, `noApprove`) |
| editing | hoja abierta sin cambios | abrir hoja | editar, cerrar | foco en primer campo |
| dirty | cambios sin guardar | edición | guardar, descartar | confirmación de salida; `beforeunload` |
| submitting | command enviado | guardar/aceptar | respuesta | «Guardando…», `aria-busy`, cierre bloqueado |
| dry-run | `T2` calculando propuesta | `Aprobar plan`, `Concluir`, `Validar`, `Retirar`, `Descartar borrador` | respuesta | «Calculando…»; sin acción primaria hasta tener digest |
| not-ready | faltantes para aprobar | `422 strategy_plan_not_ready` o `readiness[]` con ítems | resolver faltantes | lista con enlaces |
| confirming | digest listo, espera confirmación | `dryRun` sin faltantes | confirmar o cancelar | diff y consecuencia visibles |
| conflict | 412 | respuesta 412 | revisar o descartar | borrador local intacto |
| digest-stale | 409 `confirmation_mismatch` | respuesta 409 | nuevo `dryRun` | diff nuevo antes de volver a confirmar |
| approved | versión aprobada vigente sin borrador | éxito de aprobar | `Crear borrador` | secciones en lectura; «Crear borrador para cambiarla» |
| error | error canónico | respuesta de error | reintentar (`actionable`) o cerrar | texto del contrato tal cual |

## Routing Contract

- Route changes: `query` dentro de la campaña; `page` para `/learnings`, `/programs` y `/programs/[programId]`.
- Canonical URL: `/campaigns/{campaignId}?tab=strategy&section={section}` (`section` por defecto `summary`; valor inválido ⇒ `summary`); `&version={n}` para ver una versión aprobada anterior en lectura.
- Deep-link behavior: `tab`, `section` y `version` son compartibles; las hojas y diálogos no tienen URL (un enlace nunca abre un formulario ni una aprobación).
- Back button behavior: cambiar de sección usa `replaceState` (atrás sale de la campaña); con cambios sin guardar, `beforeunload` y la confirmación de descarte.
- Reload behavior: recargar cierra hojas y diálogos y relee el servidor; un `dryRun` en curso se descarta (el digest no se persiste en el navegador).
- Shareability: la vista respeta los permisos de quien abre el enlace; filas `internal_competitive` no aparecen para un actor no interno.

## Focus & Accessibility

- Initial focus: primer campo de la hoja; en diálogos `T2`, «Cancelar»; en `not-ready`, el primer enlace de la lista.
- Escape behavior: cierra en `editing`/`draft-clean`; confirmación en `dirty`; sin efecto en `submitting` y `dry-run`.
- Click-away behavior: igual que `Esc`.
- Focus restore: al disparador; si desapareció tras el refresco (p. ej. `Aprobar plan` tras aprobar), al `h2` «Estrategia».
- Modal vs non-modal semantics: hojas y diálogos modales con foco atrapado; `ReadinessList` desde el contador es popover no modal; dentro del diálogo es parte del diálogo.
- Screen reader announcement: región `aria-live="polite"` del `Shell`: «Cambios guardados», «Plan aprobado. La versión v{n} queda fija.», «Experimento concluido», «Aprendizaje validado», conflicto y errores.
- Keyboard traversal: `SectionRail` con flechas; `MatrixGrid` con Tab por celda-botón; tablas con Tab por acción de fila.
- Reduced motion: se respeta `prefers-reduced-motion`; esta task no agrega movimiento propio y hereda las superficies de TASK-1895.

## Data & Command Boundaries

- Readers: `getCampaign` (proyección de permisos), `getStrategyPlan`, `listStrategyPlanVersions`, `listContentPlanGaps`, `getCustomerModel`, `listChannels`, `getSeoPlan`, `getSeoFollowUp`, `listSeoTrackingProposals`, `getProvenance`, `getKpiProgress`, `listLandingChecks`, `listExperiments`, `listLearnings`, `listPrograms`, `getProgram`, `GET /api/v1/search` (vincular).
- Commands: TASK-1907 (`createStrategyPlanDraft`, `setPlanStrategy`, `setPlanAudienceMatrix`, `setPlanMessageHouse`, `upsertContentPlanItem`, `removeContentPlanItem`, `setPlanMeasurement`, `setContentPlanItemProgress`, `approveStrategyPlan`, `discardStrategyPlanDraft`, `setCampaignProgram`); TASK-1905 (`setCampaignCustomerModelVersion`); TASK-1908 (`setPlanSeoAeo`, `captureSeoSnapshots`, `proposeSeoKeywordTracking`, `withdrawSeoKeywordTracking`); TASK-1909 (`acceptAiDraft`, `rejectAiDraft`); TASK-1910 (`runLandingCheck`); TASK-1911 (`upsertExperimentDesign`, `startExperiment`, `captureExperimentResult`, `concludeExperiment`, `abandonExperiment`, `proposeLearning`, `validateLearning`, `retireLearning`).
- API routes: sólo `/api/v1/**` desde `apps/web/src/client/studio-api.ts`; ninguna Server Action.
- Optimistic updates: ninguno.
- Cache / invalidation: `router.refresh()` tras cada escritura; lecturas en vivo de SEO/AEO y métricas con la caché del adapter del servidor.
- Audit / signals: cada command audita con la persona como actor; la UI envía `X-Correlation-Id`.
- Tenant / access boundary: el servidor resuelve organización, permisos y clasificación competitiva; el navegador nunca decide.

## Failure Paths

| Failure | Detection | User-facing recovery | Data safety |
|---|---|---|---|
| Faltantes para aprobar | `readiness[]` / `422 strategy_plan_not_ready` | lista con enlaces | nada se escribe |
| Conflicto de revisión | 412 | `ConflictDialog` con diff | borrador local intacto |
| Digest desactualizado | 409 `confirmation_mismatch` | nuevo `dryRun` y diff | nada se escribe |
| Modelo de cliente no disponible | `503 customer_model_unavailable` / estado degradado | aviso y referencias por id | referencias intactas |
| SEO/AEO actual no disponible | estado `seo_source_unavailable` | snapshot visible, «Datos actuales no disponibles» | snapshot intacto |
| Sin permiso de aprobar | `canApprove=false` | `WriteGateNotice` «noApprove» | nada se escribe |
| Contenido de IA sin aceptar al aprobar | `422 ai_draft_not_accepted` | faltante con enlace al bloque | nada se escribe |
| Referencia pendiente en la matriz | faltante de readiness | celda marcada «Referencia pendiente» | nada se escribe |
| Error genérico | error canónico | `Reintentar` sólo si `actionable` | idempotencia por clave |

## GVC Scenario Plan

- Scenario file: `apps/web/e2e/task-1912-strategy.visual.ts` (repo de Studio; Playwright + `@axe-core/playwright`).
- Route: `/campaigns/CMP-900?tab=strategy&section=…`, `/learnings`, `/programs`, `/programs/{programId}` sobre staging.
- Viewports: 1440×1000 y 390×844, claro y oscuro.
- Required steps: los del wireframe (sin plan → borrador → faltantes → aprobación → borrador nuevo → hueco → SEO/AEO → medición → experimento → aprendizaje → IA aceptada → biblioteca → programa), más un 412 provocado con una segunda pestaña y un 409 por digest alterado.
- Required captures: cada estado de la máquina en ambos viewports y temas; diálogo de aprobación en `not-ready` y `confirming`; matriz como tabla y como lista.
- Required `data-capture` markers: los del wireframe.
- Assertions: aprobar siempre pasa por `dry-run`; ninguna hoja o diálogo tiene URL; el digest no se guarda en `localStorage`; «0» nunca representa ausencia; filas internas sólo para actores internos.
- Scroll-width checks: `scrollWidth <= clientWidth` en todas las capturas.
- Reduced-motion evidence: pasada con `reducedMotion: 'reduce'`.

## Design Decision Log

- Decision: flujo `command-backed` con aprobación `T2` en diálogo de dos pasos (`dryRun` → confirmación) y edición `T1` en hojas; aprendizajes y programas como destinos suplementarios.
- Alternatives considered: aprobar desde Hoy con un botón directo (descartado: salta el diff y los faltantes); aprobar sección por sección (descartado: el ADR aprueba la versión completa); guardar al perder foco (descartado: rompe idempotencia y conflicto explícito).
- Why this pattern: la fricción es la del riesgo (ADR §5): `T1` fluye, `T2` muestra qué cambia y qué falta antes de fijar la versión.
- Reuse / extend / new primitive: superficies de TASK-1895 reusadas; `ReadinessList` nueva porque la lista de faltantes con enlaces no existe en Studio.
- Open risks: dirección `v4 · Estrategia` pendiente; nombres finales de operaciones de las tasks backend.

## Acceptance Checklist

- [x] Nodos nuevos (`MS-N3.10`, `MS-N11`, `MS-N12`) declarados y enlazados al master flow de EPIC-049.
- [x] Toda acción visible nombra su operación `/api/v1` y su nivel de riesgo.
- [x] Estados, faltantes, conflicto y digest desactualizado tienen recuperación explícita.
- [x] Ninguna hoja ni diálogo tiene URL; secciones y versión sí.
- [x] Foco, anuncio vivo y teclado definidos por superficie.
- [x] Master flow de EPIC-049 actualizado con los nodos nuevos (Delta 2026-09-26 registrado al crear esta task).
- [ ] Artboards `v4 · Estrategia` aprobados y este contrato conciliado.
