# TASK-1895 — Marketing Studio: edición, revisión y métricas en la UI

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Delta 2026-09-26 — ADR de fuente de verdad e ingreso (Accepted)

- **Gobierna esta task:**
  [`EFEONCE_MARKETING_STUDIO_SSOT_AND_INGEST_DECISION_V1.md`](../../architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_SSOT_AND_INGEST_DECISION_V1.md).
  Studio + el bucket de originales son la fuente de verdad; OneDrive es taller. La UI es **la tercera puerta** del
  mismo command que usan la CLI (`pnpm studio:upload`) y las tools MCP (TASK-1899): no tiene camino propio de
  escritura, ni de subida, ni de aprobación.
- **Subida = los commands de TASK-1894 (Entregable A), no de TASK-1893:** `requestAssetVersionUpload`
  (`POST /api/v1/campaigns/{campaignId}/uploads`, lleva nombre, sha256, tamaño, tipo, pieza y **derechos**) → `PUT`
  directo a la URL firmada (reanudable para video o > 32 MiB) → `createAssetVersion`
  (`POST /api/v1/campaigns/{campaignId}/asset-versions`), que responde `202 pending_verification` mientras el worker
  recalcula el sha256 y `201` cuando la versión existe. La versión nace **`pending_review`**; nunca es la vigente
  hasta que una persona la aprueba.
- **El navegador calcula el sha256 siempre** (el command lo exige al pedir la subida); ya no es «si el contrato lo
  pide». `crypto.subtle.digest` no es incremental, así que un video de hasta 1 GiB no se puede hashear de una vez:
  esta task lo resuelve con un SHA-256 incremental propio en un Web Worker (Detailed Spec §«Subida»).
- **Derechos al subir son obligatorios** (tipo de licencia; referencia para `client_supplied`, `stock`, `talent`,
  `music`, `mixed`): el diálogo de subida los pide antes de firmar, no después.
- **Inferencia desde el nombre:** la respuesta de la solicitud trae `inference` (campaña, concepto, pieza,
  proporción, versión siguiente, `missing`); el diálogo muestra lo deducido y **pregunta sólo lo que falta**.
- **Revisión de versiones:** `approveAssetVersion` (clase `approve`, persona, capability
  `marketing_studio.campaign.approve`) y `requestAssetVersionChanges` (nota obligatoria). `designer` sube pero no
  aprueba: la UI lee `permissions.canApprove` del reader y nunca lo deduce del rol.
- **Qué hay que conciliar en el Slice 1** porque los contratos UI se escribieron antes del ADR (no se editan en este
  delta; los concilia quien tome la task): el flow
  `docs/ui/flows/TASK-1895-marketing-studio-editing-review-metrics-flow.md` atribuye la subida a TASK-1893 (paso 3–4
  y §Commands) y trata el sha256 del cliente como opcional; el wireframe
  `docs/ui/wireframes/TASK-1895-marketing-studio-editing-review-metrics.md` tiene la misma atribución en su
  «Data reader / command» y le faltan las claves de copy de verificación, rechazo, derechos obligatorios, inferencia
  y revisión de versión (propuesta en Detailed Spec §«Copy nuevo de la subida y la revisión»).

## Delta 2026-09-26

- TASK-1893 complete: descarga firmada (`GET /api/v1/assets/{assetId}/versions/{versionNo}/download`, API 1.2.0),
  `rights.status` en cada versión, `poster` y `crop_*` (rotulados como vista previa de colocación) y evidencia de
  publicación (`post_observation`) ya existen en producción. Se quita de `Blocked by`; siguen TASK-1892 y TASK-1894.

## Delta 2026-09-25

- TASK-1899: el diálogo de aprobación llama `dryRun`, muestra el diff y envía el `proposalDigest` al confirmar.
- Decisiones del operador: el brief es entidad estructurada (objetivo, problema, insight, mensaje, audiencias, presupuesto envolvente, KPIs con metas, canales, ventana, mandatorios, aprobadores — ver TASK-1894 «Brief como entidad»), así que esta UI suma una superficie de edición del brief y la comparación KPI meta vs resultado en el panel de métricas. Escriben `efeonce_admin`, `efeonce_operations`, `efeonce_account` y `designer`. El flujo maestro del programa vive en `docs/ui/flows/EPIC-049-marketing-studio-UI-FLOW.md`.
- Hallazgo del flujo maestro: `/library` no es alcanzable a 390 px (la barra inferior no incluye «Piezas» y ⌘K no tiene «Ir a piezas»); esta task lo corrige. La subida firmada la entrega TASK-1894.

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1895-marketing-studio-editing-review-metrics.md`
- Flow: `docs/ui/flows/TASK-1895-marketing-studio-editing-review-metrics-flow.md`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-049`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `TASK-1892, TASK-1894` (los Slices 2 y 4 sólo necesitan el Entregable A de TASK-1894 —puerta de ingreso— desplegado en staging; el resto, sus Entregables A y B)
- Branch: `efeonce-marketing-studio main (código) · Greenhouse develop (docs, wireframe, flow, scorecard); sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Convierte el espacio de campaña de Efeonce Marketing Studio (`studio.efeonce.org`, hoy de solo lectura) en un lugar
donde se trabaja: editar campaña y brief, subir versiones nuevas de una pieza por la puerta de ingreso única (URL firmada, verificación en el servidor, versión pendiente de revisión) y revisarlas, editar copys sin
alterar su literalidad, crear y editar anuncios, editar la propuesta de medios y registrar su aprobación, mover
cada uno de los tres estados con confirmación, resolver conflictos de edición y leer los resultados de la campaña
desde Greenhouse. La UI es un cliente más de `/api/v1`: consume los commands de TASK-1894 (los mismos que usan la CLI y
las tools MCP), la descarga de TASK-1893 y las métricas de TASK-1892, y en modo `open` muestra la edición deshabilitada con una razón honesta hasta el login (TASK-1898).

## Why This Task Exists

TASK-1887 dejó Studio en producción con todas sus vistas de lectura, aprobadas por el operador el 2026-09-25. La
campaña todavía se mantiene en OneDrive y en el HTML del Campaign Manager porque Studio no permite cambiar nada.
Las fundaciones de escritura, originales y métricas nacen en tasks `backend-data` separadas (TASK-1892, TASK-1893,
TASK-1894), como exige la disciplina de split: contrato primero, cliente visual después. Falta la superficie humana
que las usa, y esa superficie tiene riesgos propios que ningún contrato resuelve solo:

- Un copy editado en un `<textarea>` común pierde menciones `@[urn:li:…]`, normaliza comillas o recorta espacios: el invariante de copy literal se rompe en el navegador aunque el command lo respete.
- Una pantalla de presupuesto que muestre «total» invita a sumar propuesto con aprobado o con gasto real.
- Una edición concurrente sin manejo del 412 termina en sobrescritura ciega o en borradores perdidos.
- Un botón de aprobar genérico colapsa los tres estados independientes (creatividad, autorización de medios, lanzamiento).
- Una métrica ausente dibujada como `0` hace creer que la campaña no rinde, cuando la fuente no está conectada.
- En modo `open` cualquiera ve Studio: la edición no puede aparecer como disponible ni como un botón muerto sin explicación.

## Goal

- Toda capacidad de escritura que TASK-1894 publique en el OpenAPI tiene su entrada en el espacio de campaña, con estados limpio, sucio, enviando, conflicto, error y sin permiso; la subida y la revisión de versiones usan exactamente los mismos commands que la CLI y MCP.
- El espacio de campaña gana la pestaña Resultados con fuente, ventana y frescura por fuente, y distingue degradado y ausente de cero.
- La edición se ve deshabilitada con razón en modo `open`, sin capability o con autoridad aún en OneDrive, y queda lista para prenderse con TASK-1898 sin cambios de UI.
- Evidencia visual premium en 1440 y 390 px, tema claro y oscuro, con accesibilidad por teclado verificada.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_SSOT_AND_INGEST_DECISION_V1.md` (**gobernante** para subida, revisión y aprobación de versiones; §4.2 un command, tres puertas; §4.4 aprobación humana; §8 invariantes)
- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md` (§3 invariantes, §4 contrato, §5 acceso, §7 corte de autoridad, §8 interfaz)
- `docs/architecture/EFEONCE_STUDIO_API_FIRST_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/epics/in-progress/EPIC-049-efeonce-marketing-studio-platform.md`

Reglas obligatorias:

- La UI escribe **sólo** por `/api/v1` del mismo deployment, con el mismo contrato que usan la CLI y Efeonce MCP. Nada de Server Actions ni rutas propias de la UI; ninguna regla de negocio en un componente.
- Los tres estados son independientes y la UI no conoce su máquina: muestra sólo los cambios que el reader declare permitidos. `live_observed` nunca es una acción manual.
- Propuesto, aprobado y real son registros distintos: nunca se suman ni se funden en una cifra; ausencia de gasto real ≠ cero.
- El copy se envía exactamente como se escribió (saltos de línea, menciones, espacios y comillas); el editor no corrige, no recorta y no autocompleta.
- Permisos, autoridad de la campaña y umbrales de derechos se resuelven en el servidor; el navegador sólo los muestra.
- Los bytes van del navegador directo a GCS por la URL firmada; nunca a una ruta de Studio. Una versión subida se muestra «Pendiente de revisión» y nunca como vigente; sólo `permissions.canApprove` habilita «Aprobar versión».
- Tokens del tema salen de `@efeoncepro/axis-tokens` vía `apps/web/scripts/generate-theme.mjs`; ningún hex nuevo en `app.css`.

## Normative Docs

- `docs/ui/wireframes/TASK-1895-marketing-studio-editing-review-metrics.md` y `docs/ui/flows/TASK-1895-marketing-studio-editing-review-metrics-flow.md` (contratos de esta task).
- Canvas de Claude Design «Efeonce Marketing Studio», página `v2 · Claro y oscuro` (https://claude.ai/artifact/D6uwRFMzvnaHzGDtDLvxBi), dirección aprobada 2026-09-25.
- `docs/manual-de-uso/marketing-studio/operar-marketing-studio.md` y `docs/documentation/marketing-studio/efeonce-marketing-studio.md` (se actualizan al cierre).
- `docs/operations/marketing-studio/MARKETING_STUDIO_RUNTIME_HANDOFF.md`.
- AGENTS.md del repo `efeonce-marketing-studio` (router; `pnpm check`).

## Dependencies & Impact

### Depends on

- `TASK-1887` (complete): vistas de lectura, tema claro/oscuro, `Shell`, `Pipeline`, `PiecesWorkspace`, `MediaPlanView`, `CommandPalette`.
- `TASK-1890`: `GET /api/v1/assets/{assetId}` (detalle de pieza con versiones) y organización canónica.
- `TASK-1892`: `GET /api/v1/campaigns/{id}/metrics` con estados degradado/ausente distintos de cero.
- `TASK-1893` (complete): originales en GCS, descarga firmada, renditions y derechos por versión (`rights.status`).
- `TASK-1894`: Entregable A — `requestAssetVersionUpload`, `createAssetVersion` (`202 pending_verification` / `201`), dedup por sha256, derechos obligatorios, inferencia desde el nombre, `reviewState`/`pendingVersionNo` en los DTO; Entregable B — `approveAssetVersion`, `requestAssetVersionChanges`, commands de campaña, brief, copy, anuncio, plan y tres estados con `Idempotency-Key`, `If-Match` y auditoría; `permissions` en `getCampaign` (`writable`, `lockReason`, `allowedTransitions`, `canApprove`, `revision`); campaña sandbox `CMP-900` y `api_client` de pruebas en staging.
- ADR `EFEONCE_MARKETING_STUDIO_SSOT_AND_INGEST_DECISION_V1.md` (Accepted 2026-09-26).
- `TASK-1898`: login con Efeonce ID; condición para que la edición se use en producción (no bloquea el code complete).

### Blocks / Impacts

- `TASK-1898`: al activar `STUDIO_ACCESS_MODE=efeonce_id`, la edición de esta task se habilita sin cambio de UI.
- Corte de autoridad OneDrive → Studio (CDR/ADR de EPIC-049): esta UI es la condición visible para declararlo por campaña.
- `TASK-1891`: sin impacto directo; comparte los commands que el gateway federará.

### Files owned

- Repo `efeonce-marketing-studio`: `apps/web/src/app/campaigns/[campaignId]/page.tsx`, `apps/web/src/components/Shell.tsx`, `apps/web/src/components/Pipeline.tsx`, `apps/web/src/components/PiecesWorkspace.tsx`, `apps/web/src/components/MediaPlanView.tsx`, `apps/web/src/components/{Sheet,ConfirmDialog,ConflictDialog,WriteGateNotice,CampaignHeroActions,EditCampaignSheet,VersionHistory,UploadVersionDialog,RightsStatus,CopyEditorSheet,AdEditorSheet,BudgetProposalSheet,BudgetApprovalDialog,ReviewSheet,CampaignResults,MetricSeries}.tsx`, `apps/web/src/client/studio-api.ts`, `apps/web/src/client/sha256-worker.ts` [nuevo], `apps/web/src/copy.ts`, `apps/web/src/copy.test.ts`, `apps/web/src/styles/app.css`, `apps/web/e2e/**`, `apps/web/playwright.config.ts`, `apps/web/package.json` (Playwright y axe como dependencias de desarrollo)
- Greenhouse: `docs/ui/wireframes/TASK-1895-marketing-studio-editing-review-metrics.md`, `docs/ui/flows/TASK-1895-marketing-studio-editing-review-metrics-flow.md`, `docs/ui/reviews/TASK-1895-marketing-studio-editing-review-metrics.scorecard.json`, `docs/manual-de-uso/marketing-studio/operar-marketing-studio.md`, `docs/documentation/marketing-studio/efeonce-marketing-studio.md`

## Current Repo State

### Already exists

- Repo `efeonce-marketing-studio`, `apps/web` (Next.js 16, React 19, puerto de desarrollo 3100): páginas `/`, `/campaigns`, `/campaigns/[campaignId]` con pestañas `pieces|copies|ads|media|calendar`, `/calendar`, `/media`, `/library`.
- Componentes `Shell` (topbar con píldora «Solo lectura» en modo `open`), `Nav` (rail y navegación inferior bajo 860 px), `ThemeToggle` (cookie `studio-theme`), `CommandPalette` (⌘K), `PiecesWorkspace` (tablero concepto × formato + inspector con vista en el feed y URL con UTM), `MediaPlanView` (tres tarjetas separadas Propuesto · Aprobado · Gasto real), `Pipeline` (tres estados, `steps.ts`).
- `apps/web/src/copy.ts` como fuente única de textos; `styles/app.css` + `theme.generated.css` desde AXIS 0.2.5 con `theme:check` en el typecheck; `prefers-reduced-*` global ya anulando transiciones.
- `apps/web/src/server/runtime.ts`: `accessMode()` (`open`|`efeonce_id`) y `resolveActor()` (actor anónimo en `open`); `packages/contracts` con DTOs (`CampaignDetail.revision`, `BudgetKind`, `CampaignStates`) y catálogo de errores canónico `{ error, code, actionable }`.
- Canvas de diseño con artboards v2 aprobados (Home, Campaigns, Campaign, Calendar, Plan, Command, Mobile).

### Gap

- No existe ninguna superficie de escritura, ni hoja, ni diálogo de confirmación, ni manejo de 412, ni cliente HTTP con `Idempotency-Key`/`If-Match`.
- No hay pestaña de resultados ni representación de métricas degradadas o ausentes.
- El inspector de pieza no muestra versiones, derechos ni descarga de original.
- La píldora «Solo lectura» no explica por qué; no hay proyección de permisos por acción en la página.
- No hay artboards aprobados para la edición: el canvas v2 cubre sólo lectura.
- Studio no tiene Playwright ni axe; no hay evidencia visual automatizada.

## Modular Placement Contract

- Topology impact: `public`
- Current home: `repo efeonce-marketing-studio, apps/web (Next.js en Vercel, proyecto efeonce-marketing-studio)`
- Future candidate home: `remain-shared`
- Boundary: `la UI consume sólo /api/v1 (OpenAPI de packages/contracts) mediante apps/web/src/client/studio-api.ts; la proyección de permisos y autoridad llega resuelta desde el reader de campaña; los componentes no importan packages/domain ni packages/database`
- Server/browser split: `las páginas siguen siendo Server Components que leen con el actor del servidor; hojas, diálogos, subida y resultados son Client Components que reciben DTOs de packages/contracts y hablan con /api/v1; nada de server-only, secretos, SDK de GCS ni base de datos en el navegador; la subida va directo a la URL firmada`
- Build impact: `dos dependencias de desarrollo en apps/web (@playwright/test y @axe-core/playwright); ninguna dependencia de runtime nueva ni librería de gráficos (series en SVG nativo; SHA-256 incremental propio en un Web Worker); sin impacto en el build de greenhouse-eo`
- Extraction blocker: `none`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: operador de marketing de Efeonce con `marketing_studio.campaign.write`; responsable de medios y revisor creativo para los cambios de estado. En modo `open`, cualquier visitante (sólo lectura).
- Momento del flujo: la campaña ya existe en Studio y la persona necesita corregirla, versionarla, aprobarla o medirla desde su espacio de campaña, a menudo llegando desde una decisión de Hoy.
- Resultado perceptible esperado: el cambio se guarda una sola vez, la vista muestra el dato del servidor y un anuncio confirma qué cambió; ninguna aprobación ocurre sin confirmación explícita.
- Friccion que debe reducir: ir a OneDrive y regenerar el HTML para cambiar un copy o una pieza; dudar si un presupuesto está aprobado; perder cambios por edición concurrente.
- No-goals UX: crear campañas; lanzar pauta; programar posts; editar definiciones de audiencia; métricas de pauta pagada; persistir borradores en el navegador.

### Surface & system decision

- Surface: `/campaigns/[campaignId]` (hero, pestañas existentes y nueva `?tab=results`), `Shell` (píldora «Solo lectura» como botón con razón). Sin rutas nuevas.
- Nav placement: `none` — la task no agrega destinos de navegación; Resultados es una pestaña dentro de la campaña y las hojas no tienen URL.
- Composition Shell: `no aplica` — Studio no es el portal Greenhouse ni usa su Composition Shell; se respeta la composición propia aprobada (`Shell` + hero + pestañas + inspector).
- Primitive decision: `extend` — extiende `Pipeline` (pasos como botones), `PiecesWorkspace`, `MediaPlanView` y `Shell`; nacen `Sheet`, `ConfirmDialog` y `ConflictDialog` como primitives locales de Studio sobre `<dialog>` y tokens vigentes.
- Adaptive density / The Seam: `no aplica` — contrato de Greenhouse; Studio usa sus puntos de quiebre vigentes (1180 y 860 px).
- Floating/Sidecar/Dialog decision: `Sheet` modal lateral de 560 px (pantalla completa bajo 860 px) para editar; `ConfirmDialog` para consecuencias; una sola superficie superpuesta a la vez.
- Copy source: `apps/web/src/copy.ts` (objeto `COPY`) del repo de Studio; ledger en el wireframe.
- Access impact: `entitlements` — la UI muestra u oculta affordances según `permissions` del reader (derivado de `marketing_studio.asset.write`, `marketing_studio.campaign.write`, `marketing_studio.campaign.approve`, modo de acceso y autoridad de la campaña), resuelto en el servidor por TASK-1894/1898/1899.

### State inventory

- Default: vista de lectura vigente + acciones de edición habilitadas con permiso.
- Loading: páginas server-rendered sin cambios; hojas con esqueleto `piece-ghost`; Resultados con tarjetas vacías y «Cargando…» anunciado.
- Empty: textos vigentes (`copiesEmpty`, `adsEmpty`, `postsEmpty`) + «Sin datos de {fuente}» en Resultados; vacío nunca como cero.
- Error: el `error` es-CL del contrato canónico tal cual; «Reintentar» sólo con `actionable: true`.
- Degraded / partial: «Datos parciales» con fecha del último dato; «Generando miniaturas…» tras una versión nueva.
- Permission denied: acciones `aria-disabled` con razón (modo `open`, sin capability, autoridad OneDrive).
- Long content: copys largos con `white-space: pre-wrap` y contador; nombres de campaña con elipsis en migas; lista de versiones con scroll interno sobre 6 filas.
- Mobile / compact: hojas y diálogos a pantalla completa; grilla de presupuesto como lista por mes; acciones del hero en fila propia.
- Keyboard / focus: foco atrapado en superficies modales, `Esc`, retorno de foco al disparador, pista y pestañas recorribles con Tab.
- Reduced motion: sin movimiento nuevo; la preferencia global de Studio ya anula transiciones y las hojas aparecen sin desplazamiento.

### Interaction contract

- Primary interaction: abrir una hoja desde una acción explícita, editar, guardar; confirmar cambios de estado en diálogo con resumen de consecuencias.
- Hover / focus / active: `.btn:hover` y `:focus-visible` con `--action` vigentes; pasos de la pista con el mismo foco visible.
- Pending / disabled: «Guardando…» con `aria-busy`, cierre bloqueado durante el envío; permisos faltantes como `aria-disabled` enfocable que explica al activarse.
- Escape / click-away: cierra si está limpio, pide confirmación si está sucio, no actúa durante envío o subida.
- Focus restore: al disparador; si desapareció tras el refresco, al `h2` de la pestaña.
- Latency feedback: etapas de subida con bytes; «Guardando…» inmediato; nada optimista.
- Toast / alert behavior: una región `aria-live="polite"` en `Shell` para éxito, duplicado, conflicto y error; los errores también quedan visibles dentro de la superficie.

### Motion & microinteractions

- Motion primitive: `none`
- Enter / exit: aparición y cierre sin desplazamiento; las hojas usan `<dialog>` sin coreografía.
- Layout morph: ninguno.
- Stagger: ninguno.
- Timing / easing token: no se usa; si la aprobación de artboards pidiera entrada lateral, se abre un contrato de motion y se usan `--motion-fast`/`--motion-standard`.
- Reduced-motion fallback: la regla global de Studio (`prefers-reduced-motion: reduce`) sigue cubriendo todo.
- Non-goal motion: contadores animados, barras de progreso animadas (el progreso es un valor), celebraciones al aprobar.

### Implementation mapping

- Route / surface: `apps/web/src/app/campaigns/[campaignId]/page.tsx` (+ `tab=results`, `review=`), `apps/web/src/components/Shell.tsx`.
- Primitive / variant / kind: `Sheet` (`md` 560 px, pantalla completa < 860 px), `ConfirmDialog` (`default`|`danger`), `ConflictDialog`, `Pipeline` `interactive`.
- Component candidates: `CampaignHeroActions`, `WriteGateNotice`, `EditCampaignSheet`, `VersionHistory`, `UploadVersionDialog`, `RightsStatus`, `CopyEditorSheet`, `AdEditorSheet`, `BudgetProposalSheet`, `BudgetApprovalDialog`, `ReviewSheet`, `CampaignResults`, `MetricSeries`.
- Copy source: `apps/web/src/copy.ts` (namespaces `write`, `edit`, `conflict`, `piece`, `upload`, `rights`, `copyEdit`, `ad`, `plan`, `review`, `results`).
- Data reader / command: readers vigentes + `GET /api/v1/assets/{assetId}` (TASK-1890/1893, con `reviewState` y `pendingVersionNo` de TASK-1894) + `GET /api/v1/campaigns/{id}/metrics` (TASK-1892) + commands de TASK-1894: `requestAssetVersionUpload`, `createAssetVersion`, `approveAssetVersion`, `requestAssetVersionChanges`, `setAssetVersionRights` y los del Entregable B según su OpenAPI desplegado.
- API parity: la UI es un cliente de `/api/v1`; si un command no existe en el OpenAPI, su affordance no se construye y se registra follow-up.
- Access / capability: `marketing_studio.asset.write` (subir), `marketing_studio.campaign.write` (editar) y `marketing_studio.campaign.approve` (aprobar) + modo de acceso + autoridad de campaña, proyectados por el servidor en `permissions`.
- States to implement: los de «State inventory» y la máquina del flow contract (closed, locked, opening, open, loading, dirty, submitting, hashing, uploading, verifying, conflict, error, rejected, expired, complete, duplicate); la versión suma `pending_review` y `changes_requested` como estados visibles del historial.

### GVC scenario plan

- Scenario file: `apps/web/e2e/task-1895-editing.visual.ts` en el repo de Studio. Studio es una app Next.js separada: `pnpm fe:capture` de Greenhouse no la alcanza, así que la evidencia equivalente se toma con Playwright contra `http://localhost:3100`.
- Route: `/campaigns/CMP-001` (lectura y solo lectura) y la campaña sandbox de staging que fije TASK-1894 (escrituras).
- Viewports: 1440×1000 y 390×844, tema claro y oscuro.
- Quality profile: `premium`
- Required steps: recorrido del flow contract (solo lectura → edición → conflicto → subida y duplicado → copy literal → anuncio → propuesta y aprobación → revisión por cada estado → resultados completos, parciales y ausentes).
- Required captures: cada estado del inventario en ambos viewports y temas.
- Required `data-capture` markers: `campaign-hero`, `review-sheet`, `edit-campaign-sheet`, `piece-inspector`, `piece-versions`, `upload-dialog`, `rights-status`, `copy-editor`, `ad-editor`, `plan-cards`, `budget-approval`, `conflict-dialog`, `results`, `write-gate`.
- Assertions: copy guardado igual byte a byte; un solo registro por doble clic; propuesto/aprobado/real nunca sumados; «Activa» ausente como acción; «0» ausente en fuentes sin datos.
- Scroll-width checks: `document.documentElement.scrollWidth <= clientWidth` en todas las capturas.
- Reduced-motion / focus evidence: una pasada con `reducedMotion: 'reduce'`; foco atrapado, `Esc` y retorno de foco verificados por teclado; axe sin violaciones serias.
- Review dossier: capturas + video corto de subida y conflicto + scorecard en Greenhouse.
- Baseline decision / surface ID: línea base tras aprobar los artboards `v3 · Edición`; surface ID `marketing-studio-campaign-editing`.

### Design decision log

- Decision: edición en hojas modales sobre el espacio de campaña; la pista de tres estados como puerta de la revisión; Resultados como sexta pestaña; escritura sólo por `/api/v1`; sin actualizaciones optimistas.
- Alternatives considered: edición en línea (descartada: copy literal y 412 necesitan diff y pie de acciones); rutas `/edit` (descartada: rompe el contexto aprobado); pantalla global de aprobaciones (descartada por ahora: Hoy ya dirige a la decisión); Server Actions (descartadas: segundo camino de escritura fuera del contrato de CLI y MCP).
- Why this pattern: preserva la dirección aprobada, concentra la escritura en superficies con estado explícito y mantiene Full API Parity.
- Reuse / extend / new primitive: extend (`Pipeline`, `PiecesWorkspace`, `MediaPlanView`, `Shell`) + new local (`Sheet`, `ConfirmDialog`, `ConflictDialog`).
- Open risks: commands y DTOs de TASK-1892/1893/1894 aún sin OpenAPI; artboards de edición sin aprobar; escrituras en runtime antes del login dependen del actor local de TASK-1894.

### Visual verification

- GVC scenario: `task-1895-editing` (Playwright en Studio, equivalente premium de GVC).
- Viewports: 1440×1000 y 390×844, claro y oscuro.
- Required captures: todos los estados del inventario; hoja con pie fijo en 390 px.
- Required `data-capture` markers: los de «Implementation mapping».
- Scroll-width check: sin scroll horizontal de página en ninguna captura.
- Accessibility/focus checks: axe + recorrido por teclado de pista, hojas, diálogos y grilla de presupuesto.
- Before/after evidence: capturas de TASK-1887 (lectura) vs. esta task en las mismas rutas y viewports.
- Known visual debt: `feed-card` fija en blanco en ambos temas (decisión de TASK-1887: simula el feed real).
- Visual scorecard: `docs/ui/reviews/TASK-1895-marketing-studio-editing-review-metrics.scorecard.json`
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

### Slice 1 — Dirección visual de edición aprobada

- Página `v3 · Edición` en el canvas «Efeonce Marketing Studio» con los artboards `Edit-Campaign`, `Edit-Piece-Upload`, `Edit-Copy`, `Edit-Plan-Approve`, `Review-Sheet`, `Conflict`, `Results` y `Edit-Mobile`, en claro y oscuro, sobre datos reales de CMP-001 a CMP-005.
- Aprobación explícita del operador; wireframe y flow conciliados con lo aprobado; `UI ready: yes` sólo con `pnpm task:lint --task TASK-1895` sin hallazgos.
- Conciliación de contratos: lista de commands, DTOs y códigos de error reales del OpenAPI de TASK-1892/1894 contra el Implementation Mapping; cualquier capacidad sin command queda fuera y con follow-up.
- Conciliación con el ADR de fuente de verdad e ingreso (ver Delta 2026-09-26): en el flow, la subida pasa a los commands de TASK-1894, el sha256 del navegador es obligatorio y se agregan los estados `pending_verification`, `rejected` (con motivo), `expired` y `pending_review`; en el wireframe, «Data reader / command» apunta a TASK-1894 y el ledger de copy suma las claves de §«Copy nuevo de la subida y la revisión», validadas con `greenhouse-ux-writing`. El artboard `Edit-Piece-Upload` muestra inferencia, derechos obligatorios, verificación y el resultado «Pendiente de revisión»; se agrega un artboard `Version-Review` (versión pendiente con Aprobar / Pedir cambios).

### Slice 2 — Base de escritura

- `apps/web/src/client/studio-api.ts`: cliente único que agrega `Idempotency-Key` (estable por intento, reutilizada al reintentar), `If-Match` con la revisión leída, `X-Correlation-Id`, y parsea el error canónico `{ error, code, actionable }` (412 como resultado tipado de conflicto; `202` con `Retry-After` como resultado tipado «en verificación» que el llamador repite con la misma llave).
- Primitives `Sheet`, `ConfirmDialog`, `ConflictDialog` (diff por campo: versión guardada vs tu versión; sin «sobrescribir»).
- `WriteGateNotice` y proyección de permisos en la página: acciones `aria-disabled` con razón para modo `open`, sin capability y autoridad OneDrive; píldora «Solo lectura» como botón con la razón.
- Región `aria-live` en `Shell`; namespaces de copy nuevos en `copy.ts` con su test.

### Slice 3 — Campaña y brief

- `CampaignHeroActions` (`Editar campaña`, `Revisión`) y `EditCampaignSheet` con los campos que el command de TASK-1894 acepte (nombre, servicio, fase, audiencia resumida, URL de destino, referencia de brief, decisiones, nota interna).
- Salida con cambios → confirmación de descarte; `beforeunload` mientras hay cambios.

### Slice 4 — Piezas: versiones, subida, revisión y derechos

- `VersionHistory` en el inspector: versión vigente marcada (la última `imported` o `approved`), versiones `pending_review` con la etiqueta «Pendiente de revisión», `changes_requested` con su nota; datos ausentes omitidos; `Descargar original` por la URL firmada de TASK-1893; versiones con procedencia OneDrive muestran su ruta sin descarga.
- `UploadVersionDialog` — cliente de la puerta de ingreso de TASK-1894, sin lógica propia de negocio:
  1. Selección por arrastre o `<input type=file>`; rechazo inmediato de extensiones de trabajo con el texto del contrato (la decisión final es del servidor).
  2. «Calculando huella…»: SHA-256 incremental en un Web Worker (bloques de 8 MiB, progreso en bytes, cancelable).
  3. `requestAssetVersionUpload` con nombre, sha256, tamaño, tipo, `assetId` de la pieza abierta y los derechos del formulario (tipo de licencia obligatorio; referencia cuando el contrato la exige) — la respuesta trae `inference`: el diálogo muestra lo deducido («CMP-002 · concepto 06 · 4x5 · será la v4») y pide sólo lo de `inference.missing`. `duplicate` ⇒ «Este archivo ya está registrado · idéntico a v{n}» sin subir. `awaiting_confirmation` (el contenido ya está almacenado) ⇒ salta al paso 5.
  4. `PUT` (o sesión reanudable) a la URL firmada con XHR para tener progreso de bytes; `Cancelar subida` aborta; un `412` del PUT significa que el objeto ya existe y se sigue igual; salir de la página muestra la advertencia nativa.
  5. `createAssetVersion` con la misma `Idempotency-Key` repetida mientras responda `202` (respetando `Retry-After`): «Verificando el archivo en Studio…». `201` ⇒ «Versión v{n} registrada · pendiente de revisión»; `422 upload_rejected` ⇒ el motivo en lenguaje llano (huella distinta, tipo no permitido, proporción distinta); `410 upload_expired` ⇒ pedir una subida nueva.
- Revisión de la versión (en el inspector, sólo si hay `pendingVersionNo`): `Aprobar versión` (visible sólo con `permissions.canApprove`; confirmación con consecuencias; `dryRun` → `proposalDigest` cuando TASK-1899 lo exija) y `Pedir cambios` (nota obligatoria); un `designer` ve «Pendiente de revisión» sin acción de aprobar.
- `RightsStatus` en el inspector y punto de estado en el tablero con etiqueta accesible; el estado (vigente, por vencer, vencido, sin datos) llega calculado del servidor. Editar derechos de una versión existente usa `setAssetVersionRights`.

### Slice 5 — Copys

- `CopyEditorSheet` con `<textarea>` sin corrección ni autocompletado (`spellCheck={false}`, `autoCorrect="off"`, `autoCapitalize="off"`), envío sin `trim` ni normalización, contador igual al del reader y «Ver cambios» con saltos de línea visibles.
- Si el contrato devuelve el copy a revisión al editarlo, la hoja lo anuncia antes de guardar.

### Slice 6 — Anuncios

- `AdEditorSheet` para crear y editar configuración: pieza (con miniatura y estado de derechos), copy, canal, placement, audiencia (del plan), objetivo, URL de destino y UTM; «URL final» calculada por la función pura del contrato si TASK-1894 la exporta, o mostrada tras guardar.
- Aviso permanente «Guardar no lanza el anuncio»; pieza con derechos vencidos avisada, con la regla decidida por el command.

### Slice 7 — Plan de medios

- `BudgetProposalSheet`: flight (fechas, países, moneda, alcance, responsables) y grilla mes × canal sólo para líneas `proposed`; moneda bloqueada con líneas registradas; lista por mes en móvil.
- `BudgetApprovalDialog`: montos aprobados por mes y canal con «Copiar montos de la propuesta» explícito, referencia obligatoria, resumen previo y confirmación.
- Tarjeta Gasto real sin acción, con la explicación vigente.

### Slice 8 — Revisión de tres estados

- `Pipeline` interactivo: cada paso abre `ReviewSheet` enfocada en su estado; deep link `?review=creative|media|launch` consumido con `replaceState`.
- `ReviewSheet`: estado actual, nota, historial y sólo los cambios permitidos por el reader; motivo obligatorio para bloquear o retroceder; `ConfirmDialog` con consecuencias; precondiciones incumplidas mostradas con el error del contrato; nota fija de que «Activa» sólo se registra por lectura de plataforma.
- Enlaces de Hoy («Revisar plan», «Verificar», «Ver campaña») apuntando a la pestaña y revisión correctas.

### Slice 9 — Resultados

- Pestaña `?tab=results` con `CampaignResults`: una tarjeta por fuente (Search Console, GA4, SEO, Pauta) con fuente, ventana, frescura y estado (`ok`, parcial, ausente, error, sin permiso) según el DTO de TASK-1892; ventanas sólo las que el contrato acepte.
- `MetricSeries` en SVG nativo con resumen textual y tabla alternativa; sin librería de gráficos.

### Slice 10 — Evidencia y documentación

- Playwright + axe en `apps/web` (dependencias de desarrollo), escenario `task-1895-editing` con capturas, video corto y chequeos de scroll horizontal; scorecard en Greenhouse.
- Manual de uso y documentación funcional de Marketing Studio actualizados (editar, versionar, aprobar, leer resultados, qué significa cada razón de solo lectura).

## Out of Scope

- Commands, DTOs, migraciones, auditoría, dedup y cálculo de estados o umbrales: son de TASK-1892, TASK-1893 y TASK-1894.
- Login con Efeonce ID y cambio de `STUDIO_ACCESS_MODE`: TASK-1898.
- Crear campañas, conceptos o audiencias; borrar piezas, versiones, copys o anuncios.
- Lanzar pauta, programar posts en Metricool o leer métricas de pauta pagada y social orgánico.
- Registrar gasto real a mano.
- Federación MCP de los commands (TASK-1891 y sucesoras).
- Cambios al portal Greenhouse fuera de los documentos listados.

## Detailed Spec

### Proyección de permisos que la página espera del servidor

La página no deduce permisos. Espera del reader de campaña (TASK-1894) una proyección con esta forma lógica, cuyo
nombre final fija el OpenAPI:

| Campo | Significado | Uso en la UI |
|---|---|---|
| `writable` | el actor puede escribir en esta campaña | habilita las acciones |
| `lockReason` | `open_mode` \| `missing_capability` \| `authority_onedrive` \| `null` | elige `studio.write.reason.*` |
| cambios permitidos por estado | lista de destinos permitidos para creatividad, medios y lanzamiento, para este actor | botones de `ReviewSheet` |
| `revision` | revisión vigente de la campaña (o del recurso) | `If-Match` |

Si TASK-1894 no entrega esta proyección, la UI no la reconstruye con reglas propias: la task se detiene en Slice 1
y abre el gap en TASK-1894.

### Reglas del editor de copy

- Valor controlado sin transformación: lo que se envía es `event.target.value` tal cual.
- El diff compara cadenas exactas y marca saltos de línea con «↵» decorativo (`aria-hidden`).
- La prueba de igualdad byte a byte usa un fixture con `\n\n`, una mención `@[urn:li:organization:…]`, comillas rectas y un espacio final.

### Subida (cliente de la puerta de ingreso de TASK-1894)

- Secuencia fija, igual a la de la CLI y MCP: huella → `requestAssetVersionUpload` → `PUT`/sesión reanudable →
  `createAssetVersion` repetida con la misma `Idempotency-Key` mientras responda `202 pending_verification`
  (respetando `Retry-After`, tope 10 min; al vencer, el diálogo muestra «Seguimos verificando; aparecerá en el
  historial» y cierra sin error). La UI no decide dedup, ni tipo final, ni proporción: los lee de la respuesta.
- **Huella SHA-256:** `apps/web/src/client/sha256-worker.ts` (Web Worker) con una implementación incremental propia
  (bloques de 8 MiB leídos con `Blob.slice`), porque `crypto.subtle.digest` exige el archivo completo en memoria. Un
  test compara su salida con `crypto.subtle.digest` sobre fixtures pequeños y con la huella de un final real de
  OneDrive. Si en Slice 1 se mide más de 20 s por GiB en el equipo de referencia, se evalúa `hash-wasm` como
  dependencia (y se corrige `Build impact`).
- La subida a GCS usa XHR para tener progreso de bytes; el cliente sólo ve la URL firmada de un objeto y sus cabeceras
  (`content-type`, `x-goog-if-generation-match: 0`, `x-goog-meta-sha256`); nunca credenciales ni el nombre del bucket.
  Un `412` del PUT es «ya existía» y se continúa con la confirmación.
- **Derechos antes de firmar:** el formulario del diálogo exige el tipo de licencia (`LICENSE_KINDS` del contrato) y
  la referencia cuando el contrato la marca obligatoria; `422 rights_required` se muestra junto a los campos.
- **Inferencia:** lo deducido se muestra como resumen editable sólo en lo que `inference.missing` declara; una pieza
  nueva (`inference.status = new_asset`) exige una confirmación explícita («Crear la pieza {assetId}»).
- **Motivos de rechazo** (`upload_rejected.reason`): `sha256_mismatch` y `size_mismatch` ⇒ «El archivo cambió durante
  la subida. Vuelve a intentarlo.»; `type_rejected` ⇒ «Este tipo de archivo no es un final aceptado.»;
  `aspect_ratio_mismatch` ⇒ «La proporción no coincide con la pieza {proporción}.»; `revision_conflict` ⇒ abre
  `ConflictDialog` sobre la pieza.

### Copy nuevo de la subida y la revisión (propuesta para el ledger del wireframe; se valida con `greenhouse-ux-writing`)

| id | Texto propuesto |
|---|---|
| `studio.upload.hashing` | Calculando la huella del archivo… {porcentaje} |
| `studio.upload.inferred` | Detectamos: {campaña} · concepto {concepto} · {proporción} · será la v{n} |
| `studio.upload.newAsset` | Crear la pieza {assetId} |
| `studio.upload.rightsRequired` | Indica el tipo de licencia antes de subir. |
| `studio.upload.rightsReference` | Referencia de la licencia (número de licencia, contrato o correo) |
| `studio.upload.verifying` | Verificando el archivo en Studio… |
| `studio.upload.verifyingSlow` | Seguimos verificando; la versión aparecerá en el historial. |
| `studio.upload.createdPending` | Versión v{n} registrada · pendiente de revisión |
| `studio.upload.rejected.changed` | El archivo cambió durante la subida. Vuelve a intentarlo. |
| `studio.upload.rejected.type` | Este tipo de archivo no es un final aceptado. |
| `studio.upload.rejected.ratio` | La proporción no coincide con la pieza {proporción}. |
| `studio.version.pendingReview` | Pendiente de revisión |
| `studio.version.changesRequested` | Cambios pedidos |
| `studio.version.approve` | Aprobar versión |
| `studio.version.approveConfirm` | La v{n} pasará a ser la versión vigente de {pieza}. |
| `studio.version.requestChanges` | Pedir cambios |
| `studio.version.requestChangesNote` | ¿Qué hay que cambiar? |
| `studio.version.noApprovePermission` | Tu rol sube versiones, pero no las aprueba. |

### Resultados

- Cada fuente se representa por separado; no hay «total» entre fuentes.
- Frescura en tiempo relativo con fecha absoluta en `title` y en la tabla alternativa.
- Posición media de Search Console se muestra sólo con la advertencia que el contrato marque para pocas impresiones.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → todo lo demás: sin artboards aprobados y contratos conciliados no se escribe JSX.
- Slice 2 → Slices 3 a 9: toda escritura pasa por el cliente único y las primitives.
- Slices 3 a 9 pueden ir en cualquier orden entre sí, cada una sólo cuando su command o reader exista en el OpenAPI desplegado en staging.
- Slice 10 cierra: evidencia sobre el conjunto y documentación.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Edición disponible en producción antes del login | UI | low | proyección de permisos del servidor; en `open` todo `aria-disabled` | escenario de solo lectura en la evidencia |
| Copy alterado por el navegador | UI | medium | textarea sin corrección + prueba byte a byte | test del escenario falla |
| Doble envío crea registros duplicados | UI | medium | `Idempotency-Key` estable por intento + botón bloqueado | aserción de un solo registro |
| Sobrescritura por edición concurrente | UI | medium | `If-Match` + `ConflictDialog` sin «sobrescribir» | escenario de 412 |
| Edición en una campaña aún gobernada por OneDrive y reimportada después | data | medium | `lockReason = authority_onedrive` hasta el corte por campaña | aviso visible en la campaña |
| Métrica ausente leída como cero | UI | low | estados del DTO de TASK-1892 + aserción de ausencia de «0» | escenario de Resultados |
| Commands de TASK-1894 cambian de forma | UI | medium | Slice 1 concilia contra el OpenAPI; tipos desde `packages/contracts` | typecheck de Studio |
| El hash de un video grande congela o agota la pestaña | UI | medium | SHA-256 incremental en Web Worker por bloques; nunca el archivo completo en memoria | medición en Slice 1 (> 20 s/GiB) y prueba con un video real de 1 GiB |
| Se muestra como vigente una versión sin aprobar | UI | low | la UI usa la vigente y `pendingVersionNo` del reader; nunca ordena versiones por su cuenta | aserción del escenario de subida |

### Feature flags / cutover

- Sin flag nuevo: la edición queda condicionada por el modo de acceso vigente (`STUDIO_ACCESS_MODE`) y por la proyección de permisos. En producción, con `open`, la UI de edición se despliega visible y deshabilitada con razón; se habilita sola cuando TASK-1898 cambie el modo y el actor tenga la capability.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revertir cambios del canvas y de los contratos | minutos | sí |
| Slice 2 | revert del commit en Studio + redeploy Vercel | < 10 min | sí |
| Slices 3–9 | revert del commit del slice + redeploy; los datos escritos quedan auditados por TASK-1894 | < 10 min | sí (código); las escrituras hechas se corrigen con otro command |
| Slice 10 | revert de dependencias de desarrollo y docs | minutos | sí |

### Production verification sequence

1. `pnpm check` verde en Studio (gates, typecheck con `theme:check`, tests).
2. Escenario `task-1895-editing` verde en local contra staging con el actor local de TASK-1894.
3. Preview de Vercel de Studio: rutas de lectura sin regresión; edición deshabilitada con razón en `open`.
4. Producción de Studio: mismas comprobaciones de lectura y solo lectura; ninguna escritura posible.
5. Tras TASK-1898: una edición real por tipo en una campaña con autoridad cortada, verificada en la auditoría.

### Out-of-band coordination required

- Aprobación del operador de los artboards `v3 · Edición` (Slice 1).
- Declaración del corte de autoridad OneDrive → Studio por campaña (CDR/ADR de EPIC-049) antes de editar campañas reales.
- Campaña sandbox en staging y actor local de pruebas provistos por TASK-1894.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Se declaró `Execution profile: ui-ux` y `UI impact: flow`; `Backend impact: none` se mantiene porque toda escritura pasa por commands de TASK-1894 (los mismos de la CLI y MCP, ADR de fuente de verdad e ingreso).
- [ ] `UI ready` permanece `no` hasta que los artboards `v3 · Edición` estén aprobados y el wireframe y el flow estén conciliados; al pasar a `yes`, `pnpm task:lint --task TASK-1895` queda sin hallazgos.
- [ ] El wireframe y el flow contract declarados existen, reflejan lo implementado y quedaron conciliados con el ADR de fuente de verdad e ingreso (subida por TASK-1894, sha256 obligatorio en el navegador, estados `pending_verification`/`pending_review`, copy de §«Copy nuevo de la subida y la revisión»).
- [ ] Ningún componente de `apps/web` importa `packages/domain`, `packages/database` ni módulos `server-only`; toda escritura sale de `apps/web/src/client/studio-api.ts` hacia `/api/v1`.
- [ ] En modo `open`, cada acción de edición es `aria-disabled`, enfocable y muestra la razón; la píldora «Solo lectura» explica por qué.
- [ ] Con `lockReason = authority_onedrive`, la campaña muestra la razón de OneDrive y no permite escribir.
- [ ] Guardar dos veces seguidas con la misma intención produce un solo registro (misma `Idempotency-Key`).
- [ ] Un 412 abre `ConflictDialog` con el borrador intacto y el diff por campo; no existe opción de sobrescritura ciega.
- [ ] Un copy con saltos de línea dobles, una mención, comillas rectas y un espacio final se relee igual byte a byte tras guardar.
- [ ] La subida calcula el SHA-256 en un Web Worker con progreso, pide la URL con los derechos obligatorios ya completos, muestra progreso en bytes, se puede cancelar, espera la verificación (`202`) sin bloquear la página y muestra «Este archivo ya está registrado» ante un sha256 repetido.
- [ ] Una versión recién subida aparece «Pendiente de revisión» y nunca como la vigente; `Aprobar versión` sólo aparece con `permissions.canApprove` (un `designer` ve el estado sin la acción) y `Pedir cambios` exige nota.
- [ ] Cada motivo de `upload_rejected` y `upload_expired` tiene su texto y su acción; ninguno muestra el código crudo.
- [ ] Lo deducido del nombre se muestra antes de subir y el diálogo pide sólo lo que `inference.missing` declara.
- [ ] El inspector muestra versiones, descarga de original (o la ruta OneDrive sin descarga) y el estado de derechos con texto; las piezas con derechos por vencer o vencidos se distinguen en el tablero con etiqueta accesible.
- [ ] La edición de presupuesto escribe sólo líneas propuestas; la aprobación exige referencia y confirmación; Propuesto, Aprobado y Gasto real nunca se suman ni se muestran como una cifra.
- [ ] `ReviewSheet` muestra sólo los cambios permitidos por el reader, pide motivo para bloquear o retroceder y nunca ofrece «Activa» como acción.
- [ ] Resultados muestra fuente, ventana y frescura por fuente; parcial con fecha del último dato; ausente como «Sin datos», nunca «0».
- [ ] Todo texto visible nuevo vive en `apps/web/src/copy.ts` y pasa `copy.test.ts`.
- [ ] Ningún hex nuevo en `app.css`; los roles faltantes se generan desde AXIS y `theme:check` pasa.
- [ ] Evidencia en 1440×1000 y 390×844, tema claro y oscuro, sin scroll horizontal de página, axe sin violaciones serias y recorrido por teclado completo.
- [ ] Scorecard con promedio ≥ 4,5, piso ≥ 4 y fidelidad/resistencia a plantilla ≥ 4,5.
- [ ] Manual de uso y documentación funcional de Marketing Studio actualizados.

## Verification

- `pnpm check` en el repo `efeonce-marketing-studio`
- `pnpm --filter @studio/web exec playwright test e2e/task-1895-editing.visual.ts` contra `http://localhost:3100`
- Revisión humana de las capturas y del video del dossier
- `pnpm task:lint --task TASK-1895` y `pnpm docs:closure-check` en Greenhouse

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] EPIC-049 actualizado con el estado de la edición (code complete vs. habilitada tras TASK-1898)
- [ ] Si el cierre ocurre antes de TASK-1898, el estado se reporta como `code complete, rollout pendiente` (edición visible y deshabilitada en producción)

## Follow-ups

- Master UI flow de EPIC-049 (`docs/ui/flows/EPIC-049-…-UI-FLOW.md`) con los nodos MS-N1…MS-N7 declarados en el flow contract de esta task.
- Capacidades de escritura que el OpenAPI de TASK-1894 no exponga al conciliar (p. ej. edición de derechos fuera de la subida): task propia, sin affordance falsa mientras tanto.
- Decisiones de derechos por vencer en Hoy, si el reader de atención las incorpora.

## Open Questions

- ~~¿Aprobar presupuesto y autorizar medios requieren una capability distinta de `marketing_studio.campaign.write`?~~ Resuelto 2026-09-26 (ADR + TASK-1894/1899): sí, `marketing_studio.campaign.approve`, sólo para personas; la UI sólo lee `permissions.canApprove`.
- ~~¿La UI calcula el sha256?~~ Resuelto 2026-09-26: sí, siempre (el command lo exige al pedir la subida); el servidor lo recalcula en el worker.
- ¿El diálogo de subida admite varios archivos a la vez (la CLI sí)? Esta task asume uno por vez; confirmar en los artboards del Slice 1.
- ¿Editar un copy aprobado lo devuelve a revisión? Regla de dominio de TASK-1894; la hoja la anuncia si el contrato la declara.
- ¿Qué ventanas acepta el endpoint de métricas (vuelo de la campaña, últimos 28 días, otras)? Lo fija TASK-1892.
