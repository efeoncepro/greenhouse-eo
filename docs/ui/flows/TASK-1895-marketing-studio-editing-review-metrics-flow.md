# TASK-1895 — Marketing Studio: edición, revisión y resultados · Flow Contract

## Delta 2026-09-25

- Los nodos `MS-N1…MS-N7` que este contrato declaró ahora son propiedad del master flow del programa:
  [`EPIC-049-marketing-studio-UI-FLOW.md`](EPIC-049-marketing-studio-UI-FLOW.md). Allí se conservan sus nombres, se
  descompone `MS-N3` en subnodos (`MS-N3.1…MS-N3.9`) y se agregan `MS-N8…MS-N10`. Este archivo sigue siendo el
  contrato detallado de `MS-N3`; ante una diferencia de nodos, rutas o actores, gana el master flow.
- El master flow pide a esta task (§17 de ese documento): la pestaña **Brief** (`MS-N3.2`, `?tab=brief`) con edición
  por sección y su artboard en `v3 · Edición`; el control de cuenta y el estado «sin acceso» de TASK-1898; y «Ir a
  piezas» en ⌘K, porque `/library` no es alcanzable en 390 px.

## Meta

- Status: `draft`
- Owner task: `TASK-1895 — Marketing Studio: edición, revisión y métricas en la UI`
- Related wireframe: [`docs/ui/wireframes/TASK-1895-marketing-studio-editing-review-metrics.md`](../wireframes/TASK-1895-marketing-studio-editing-review-metrics.md)
- Intended route / surface: `studio.efeonce.org/campaigns/[campaignId]` (repo `efeonce-marketing-studio`, `apps/web`), con entradas desde `/` (Hoy), `/calendar`, `/media`, `/library` y la búsqueda ⌘K.
- Flow type: `command-backed`
- Primary primitives: `Sheet`, `ConfirmDialog`, `ConflictDialog` (nuevas, locales de Studio), `Pipeline` interactivo, `PiecesWorkspace`, `MediaPlanView`, `CommandPalette` (vigente).
- Copy source: `apps/web/src/copy.ts` (`COPY`) del repo de Studio.

### Lugar en el programa (EPIC-049)

EPIC-049 no tiene todavía un master UI flow (`docs/ui/flows/EPIC-049-…-UI-FLOW.md` no existe al 2026-09-25). Hasta
que exista, este contrato declara los nodos del programa que toca, para que el master flow los adopte sin
renombrarlos:

| Nodo | Superficie | Dueña | Rol en este flujo |
|---|---|---|---|
| MS-N1 | Hoy (`/`) — decisiones pendientes | TASK-1887 (lectura) | entrada: «Revisar plan», «Verificar», «Ver campaña» llevan a la pestaña y a la revisión correctas |
| MS-N2 | Campañas (`/campaigns`) | TASK-1887 | entrada por tarjeta; sin escritura aquí |
| MS-N3 | Espacio de campaña (`/campaigns/[id]`) | TASK-1887 + **TASK-1895** | nodo central: edición, revisión, versiones, resultados |
| MS-N4 | Calendario, Medios y Piezas globales | TASK-1887 | entradas por evento, plan o pieza |
| MS-N5 | Búsqueda ⌘K | TASK-1887 | entrada directa a pieza (`?piece=`) o copy (`?tab=copies#copyId`) |
| MS-N6 | Login Efeonce ID | TASK-1898 | condición para que MS-N3 permita escribir en producción |
| MS-N7 | Agentes por Efeonce MCP | TASK-1890/1891 | consumidor paralelo de los mismos commands; no es superficie visual |

Follow-up declarado: crear el master flow de EPIC-049 con estos nodos y dejar un `## Delta` en las tasks hijas.

## Flow Brief

- Primary user: operador de marketing de Efeonce con `marketing_studio.campaign.write`, sobre una campaña cuya autoridad ya se cortó de OneDrive a Studio.
- Entry moment: una decisión de Hoy, una búsqueda o la navegación normal lo dejan en la campaña; algo está desactualizado (brief, pieza, copy, anuncio, presupuesto o un estado).
- Successful outcome: el cambio queda registrado una sola vez, con auditoría, sin pisar un cambio ajeno; la vista se actualiza con el dato del servidor y el anuncio `aria-live` confirma qué cambió.
- Primary decision/action: guardar un cambio o registrar un cambio de estado de uno de los tres estados independientes.
- Non-goals: crear campañas, lanzar pauta, programar publicaciones, calcular estados o umbrales en el navegador, escribir fuera de `/api/v1`.

## Surfaces Involved

| Surface | Role | Desktop behavior | Mobile / compact behavior | Primitive |
|---|---|---|---|---|
| Base page `/campaigns/[id]?tab=…` | contexto y entrada | hero + pestañas; acciones del hero; inspector de pieza a la derecha | acciones en fila propia; inspector bajo el tablero | Server Component + `PiecesWorkspace` |
| Aviso de solo lectura | explicar por qué no se puede editar | popover anclado a la píldora «Solo lectura» o a la acción `aria-disabled` | `.callout` al inicio del cuerpo | `WriteGateNotice` |
| Hoja de edición (campaña, copy, anuncio, propuesta) | editar un recurso | `Sheet` lateral derecha 560 px, modal | pantalla completa, pie fijo | `Sheet` |
| Diálogo de subida | versión nueva de una pieza | `ConfirmDialog` ampliado 520 px | pantalla completa | `UploadVersionDialog` |
| Hoja de revisión | tres estados, historial y cambios permitidos | `Sheet` 560 px con tres secciones; abre enfocada en el estado pedido | pantalla completa, secciones colapsables | `ReviewSheet` |
| Diálogo de confirmación | aprobar, bloquear, retroceder, descartar | `ConfirmDialog` 480 px centrado | pantalla completa | `ConfirmDialog` |
| Diálogo de conflicto | resolver 412 | `ConfirmDialog` 640 px con diff por campo | pantalla completa, diff apilado | `ConflictDialog` |
| Pestaña Resultados | lectura de métricas | tarjetas por fuente + series | una columna, tabla bajo botón | `CampaignResults` |

## Flow Map

1. Entry: la persona llega a `/campaigns/[id]` (directo, desde Hoy con `?tab=media&review=media`, desde ⌘K con `?piece=`) y el servidor resuelve actor, modo de acceso, autoridad de la campaña y permisos en una sola proyección.
2. Primary action: activa una acción de edición (`Editar campaña`, `Subir nueva versión`, `Editar copy`, `Nuevo anuncio`/`Editar anuncio`, `Editar propuesta`, `Registrar aprobación`, `Revisión` o un paso de la pista). Sin permiso, se abre el aviso con la razón y el flujo termina ahí.
3. Transition: se abre la hoja o diálogo; el formulario se inicializa con el dato del reader y con la `revision` de la campaña (o la del recurso, según el contrato) que viajará en `If-Match`.
4. User decision: edita y guarda, o confirma un cambio de estado en `ConfirmDialog` con resumen de consecuencias y motivo cuando corresponde.
5. Completion: el cliente envía el command a `/api/v1` con `Idempotency-Key` estable por intento y `If-Match`; con 2xx cierra la superficie, llama `router.refresh()` para releer los Server Components y anuncia el resultado.
6. Recovery / exit: 412 → `ConflictDialog` sin perder el borrador; error con `actionable: true` → `Reintentar` con la misma clave; con `actionable: false` → el mensaje del contrato y cerrar; salida con cambios → confirmación de descarte.

### Sub-flujo A — Versión nueva de una pieza (TASK-1893)

1. `Subir nueva versión` en el inspector abre el diálogo con la proporción esperada.
2. Selección por arrastre o `<input type=file>`; el cliente sólo verifica tipo y tamaño declarados por el contrato.
3. «Verificando el archivo…»: el cliente calcula sha256 (Web Crypto, por bloques) si el contrato de intención lo pide; si no, lo calcula el servidor al registrar.
4. Pide la intención de subida firmada. Si el servidor ya conoce ese sha256 para la pieza, responde duplicado y el flujo salta al paso 8 sin subir bytes.
5. Sube directo a GCS con la URL firmada (XHR para tener progreso de bytes); `Cancelar subida` aborta; salir de la página muestra la advertencia nativa del navegador.
6. «Registrando la versión…»: command de registro con `Idempotency-Key` y los metadatos de derechos opcionales.
7. Resultado creado: cierra, anuncia «Versión v{n} registrada», el inspector muestra la versión nueva como vigente con «Generando miniaturas…» hasta que la rendition exista (se revisa al volver al foco de la pestaña o con un refresco acotado; sin sondeo indefinido).
8. Resultado duplicado: el diálogo muestra «Este archivo ya está registrado · idéntico a v{n}» y ofrece cerrar. No es un error.

### Sub-flujo B — Presupuesto (TASK-1894)

- `Editar propuesta` sólo escribe líneas `proposed`. `Registrar aprobación` crea líneas `approved` con referencia obligatoria; «Copiar montos de la propuesta» es un botón explícito. Gasto real no tiene entrada en esta UI.
- Las tres tarjetas se releen del servidor después de cada escritura; nunca se suman ni se recalculan en el cliente.

### Sub-flujo C — Revisión de tres estados (TASK-1894)

- Cada sección muestra estado actual, nota, historial y **sólo** los cambios que el reader declare permitidos para ese actor. La UI no conoce la máquina de estados.
- `live_observed` («Activa») nunca aparece como acción: sólo lo registra una lectura de plataforma.
- Bloquear o retroceder pide motivo. Una precondición incumplida (p. ej. autorizar medios sin presupuesto aprobado) vuelve como error canónico y se muestra en la sección, sin cerrar la hoja.

### Sub-flujo D — Resultados (TASK-1892)

- La pestaña pide `GET /api/v1/campaigns/{id}/metrics` para la ventana elegida. Cada fuente se pinta por separado con su fuente, ventana y frescura; `degraded` muestra el último dato con fecha; `absent` muestra «Sin datos», nunca cero.

## Interaction Triggers

| Trigger | Source | Target state/surface | Keyboard equivalent | Notes |
|---|---|---|---|---|
| `Editar campaña` | hero | hoja de campaña `open` | Enter/Espacio | sin permiso → aviso |
| paso de la pista | hero (`Pipeline`) | hoja de revisión enfocada en el estado | Enter/Espacio; Tab recorre los tres | el paso es `<button>` |
| `Revisión` | hero | hoja de revisión en Creatividad | Enter/Espacio | — |
| `?review=creative|media|launch` | enlace desde Hoy | hoja de revisión enfocada | — | se consume con `replaceState` |
| `Subir nueva versión` | inspector | diálogo de subida | Enter/Espacio | — |
| arrastrar archivo | zona de subida | etapa «Verificando» | el `<input type=file>` etiquetado | arrastre no es el único camino |
| `Editar copy` | tarjeta de copy | hoja de copy | Enter/Espacio | — |
| `Nuevo anuncio` / `Editar anuncio` | lista de anuncios | hoja de anuncio | Enter/Espacio | — |
| `Editar propuesta` | tarjeta Propuesto | hoja de propuesta | Enter/Espacio | — |
| `Registrar aprobación` | tarjeta Aprobado | diálogo de aprobación | Enter/Espacio | — |
| `Guardar cambios` | pie de hoja | `submitting` | Enter en el último campo no envía; `Ctrl/Cmd+Enter` envía | evita envíos accidentales en textarea |
| `Esc` / clic en el fondo | hoja o diálogo | `closing` o `dirty-confirm` | Esc | bloqueado en `submitting` |
| respuesta 412 | command | `conflict` | — | — |
| `Solo lectura` | topbar | aviso con la razón | Enter/Espacio | — |
| `Ver tabla` | serie de Resultados | tabla alternativa | Enter/Espacio | — |
| ⌘K | cualquier página | búsqueda vigente | ⌘K / Ctrl+K | sin cambio; la hoja abierta tiene prioridad sobre ⌘K |

## State Machine

| State | Meaning | Entry trigger | Exit trigger | UI requirements |
|---|---|---|---|---|
| closed | sin superficie superpuesta | carga de página, cierre, éxito | acción de edición o `?review=` | foco en la página |
| locked | el actor no puede escribir | acción de edición sin permiso | cerrar el aviso | razón textual: modo `open`, sin capability o autoridad OneDrive |
| opening | hoja montándose con datos del reader | acción de edición permitida | datos listos | foco al primer campo al quedar lista |
| open | formulario limpio | datos listos | edición de un campo, cierre | pie con `Guardar cambios` desactivado hasta que haya cambios válidos |
| loading | Resultados o historial de revisión en curso | cambio de pestaña o ventana | respuesta | «Cargando…» anunciado una vez |
| dirty | hay cambios sin guardar | edición | guardar, descartar | cierre pide confirmación; `beforeunload` activo |
| submitting | command enviado | `Guardar cambios` / `Confirmar` | respuesta | botón «Guardando…», `aria-busy`, cierre bloqueado, misma `Idempotency-Key` si se reintenta |
| uploading | bytes en tránsito a GCS | intención firmada lista | fin, error, cancelación | `<progress>` con bytes; `Cancelar subida` |
| conflict | 412 por `If-Match` | respuesta 412 | revisar y reenviar con la revisión nueva, o descartar | borrador intacto; diff por campo |
| error | error canónico | respuesta de error | reintentar (`actionable`) o cerrar | texto `error` del contrato tal cual |
| complete | el servidor aceptó | 2xx | cierre automático | `router.refresh()` + anuncio en `aria-live` |
| duplicate | la versión ya existía | respuesta de duplicado | cerrar | mensaje neutro, no error |

## Routing Contract

- Route changes: `query`
- Canonical URL: `/campaigns/{campaignId}?tab=pieces|copies|ads|media|calendar|results` (vigente + `results`), `&piece={assetId}` (vigente) y `&review=creative|media|launch` (nuevo).
- Deep-link behavior: `review` abre la hoja de revisión enfocada si el actor puede verla; se elimina de la URL con `history.replaceState` al abrir, igual que hoy se sincroniza `piece`. Las hojas de edición **no** tienen URL: un enlace compartido nunca abre un formulario con cambios.
- Back button behavior: como las hojas no empujan historial, «atrás» sale de la campaña; si hay cambios sin guardar, el navegador muestra su advertencia (`beforeunload`) y la navegación interna de Next pasa por la confirmación de descarte.
- Reload behavior: recargar con una hoja abierta la cierra y relee el servidor; el borrador no se persiste en el navegador (evita reenviar datos viejos contra una revisión nueva).
- Shareability: pestaña, pieza y revisión son compartibles; la vista respeta los permisos del que abre el enlace.

## Focus & Accessibility

- Initial focus: primer campo editable de la hoja; en `ConfirmDialog`, el botón no destructivo; en `ConflictDialog`, el título del diálogo.
- Escape behavior: cierra si está `open`; pasa a confirmación si está `dirty`; no hace nada en `submitting` o `uploading` (el pie explica que hay un envío en curso).
- Click-away behavior: igual que `Esc`.
- Focus restore: al botón que abrió la superficie; si el botón desapareció tras el refresco (p. ej. la tarjeta Aprobado ya no está vacía), al `h2` de la pestaña.
- Modal vs non-modal semantics: todas las superficies superpuestas son modales (`<dialog>` con `showModal()` o `aria-modal="true"` con foco atrapado); el aviso de solo lectura es un popover no modal que se cierra con `Esc`.
- Screen reader announcement: una región `aria-live="polite"` en `Shell` anuncia «Cambios guardados», «Versión v4 registrada», «Presupuesto aprobado», el conflicto y los errores; el progreso de subida se anuncia por etapa.
- Keyboard traversal: pista, pestañas, tablero de piezas y acciones del inspector alcanzables con Tab en orden visual; la grilla de presupuesto se recorre con Tab por celda editable.
- Reduced motion: Studio anula transiciones con `prefers-reduced-motion: reduce`; las hojas aparecen sin desplazamiento en ese modo y el progreso es un valor, no una animación.

## Data & Command Boundaries

- Readers: `getCampaign` (con `revision`, estados, autoridad y proyección de permisos), `listCampaignAssets`, `listCampaignCopies`, `listCampaignAds`, `getCampaignPlan`, `listCampaignPosts`; `GET /api/v1/assets/{assetId}` (TASK-1890, versiones y derechos de TASK-1893); `GET /api/v1/campaigns/{id}/metrics` (TASK-1892); historial de revisión desde la auditoría expuesta por TASK-1894.
- Commands: los de TASK-1893 (intención de subida firmada, registro de versión con dedup por sha256, descarga firmada del original, metadatos de derechos) y los de TASK-1894 (actualizar campaña/brief, actualizar copy, crear/actualizar configuración de anuncio, actualizar flight y líneas `proposed`, registrar aprobación con líneas `approved`, cambiar cada uno de los tres estados). Nombres y cuerpos exactos: los del OpenAPI de esas tasks; esta UI no define endpoints.
- API routes: sólo `/api/v1/**` del mismo deployment, llamadas desde `apps/web/src/client/studio-api.ts`; ninguna Server Action ni ruta exclusiva de la UI.
- Optimistic updates: ninguno. Montos, estados, copy literal y versiones se muestran siempre como los devuelve el servidor.
- Cache / invalidation: `router.refresh()` tras cada escritura exitosa; renditions con `Cache-Control: immutable` (el id cambia con la versión), así que la miniatura nueva llega por id nuevo.
- Audit / signals: cada command audita en `studio.audit_event` (dueño TASK-1894/1893); la UI envía `X-Correlation-Id` por intento para cruzar logs.
- Tenant / access boundary: el servidor resuelve actor, organización y autoridad; la UI recibe permisos ya resueltos. Una organización o permiso en el request del navegador nunca concede acceso.

## Failure Paths

| Failure | User-facing behavior | Recovery | Notes |
|---|---|---|---|
| denied | acción `aria-disabled`; al activarla, aviso con la razón (modo `open`, sin capability, autoridad OneDrive); un 403 inesperado muestra el `error` del contrato y cierra la hoja | pedir acceso o esperar el login (TASK-1898) | el cliente nunca decide permisos |
| not found / empty | 404 de campaña → página `notFound` vigente; pestañas vacías con su texto vigente; Resultados «Sin datos de {fuente}» | — | vacío ≠ cero |
| partial / degraded | Resultados «Datos parciales» con fecha del último dato; pieza con «Generando miniaturas…» | se refresca al volver al foco | degradado honesto |
| stale data | 412 → `ConflictDialog` con diff por campo (versión guardada vs tu versión) | revisar y reenviar con la revisión nueva, o descartar | nunca sobrescritura ciega |
| timeout / API error | `actionable: true` → «Reintentar» con la misma `Idempotency-Key`; `actionable: false` → mensaje y cerrar | reintento idempotente | un doble clic no duplica |
| upload interrupted | «La subida se interrumpió. La pieza no cambió.» | `Reintentar` (reanuda si la sesión firmada lo permite, si no reinicia) | la versión sólo existe tras el registro |
| signed URL expired | «El enlace de subida venció. Vuelve a intentarlo.» | pide intención nueva | — |
| duplicate upload | «Este archivo ya está registrado · idéntico a v{n}» | cerrar | no crea versión |
| precondition | el `error` del command en la sección de revisión o en la hoja | corregir lo que falte (p. ej. registrar aprobación) | la regla vive en el dominio |
| dirty exit | confirmación «¿Descartar los cambios?» | seguir editando o descartar | también `beforeunload` |

## GVC Scenario Plan

- Scenario: `task-1895-editing` — recorrido de edición, subida, conflicto, presupuesto, revisión y resultados en Studio.
- Scenario file: `apps/web/e2e/task-1895-editing.visual.ts` en el repo `efeonce-marketing-studio` (Playwright contra `http://localhost:3100`; `pnpm fe:capture` de Greenhouse no alcanza esta app).
- Route: `/campaigns/CMP-001` para lectura y solo lectura; la campaña sandbox de staging de TASK-1894 para escrituras.
- Viewports: 1440×1000 y 390×844, tema claro y oscuro.
- Required steps: (1) solo lectura: activar la píldora y una acción `aria-disabled`; (2) con actor con permiso: `Editar campaña` → editar → cerrar sucio → seguir editando → guardar; (3) segunda pestaña guarda antes → primera recibe 412 → revisar diferencias → reenviar; (4) subir fixture → progreso → registro → miniatura; subir el mismo fixture → duplicado; (5) editar copy con dos saltos de línea y una mención → ver cambios → guardar → releer y comparar; (6) nuevo anuncio con UTM; (7) editar propuesta → registrar aprobación con referencia; (8) abrir la revisión desde cada paso de la pista y desde `?review=media`; bloquear pauta con motivo; (9) Resultados con fixture completo, parcial y ausente.
- Required captures: cada estado de la máquina en ambos viewports y temas; foco visible en pista, hoja y diálogo.
- Required `data-capture` markers: `campaign-hero`, `review-sheet`, `edit-campaign-sheet`, `piece-inspector`, `piece-versions`, `upload-dialog`, `rights-status`, `copy-editor`, `ad-editor`, `plan-cards`, `budget-approval`, `conflict-dialog`, `results`, `write-gate`.
- Assertions: igualdad byte a byte del copy guardado; un solo registro por doble clic (misma clave); ninguna suma entre propuesto, aprobado y real; «Activa» ausente de las acciones; «0» ausente en fuentes sin datos; URL sin `review` tras abrir la hoja.
- Scroll-width checks: `scrollWidth <= clientWidth` en todas las capturas.
- Accessibility/focus checks: axe sin violaciones serias; foco atrapado; `Esc`; retorno de foco al disparador.
- Reduced-motion evidence: una pasada con `reducedMotion: 'reduce'`.

## Design Decision Log

- Decision: flujo basado en commands de `/api/v1`, hojas modales sin URL para editar, revisión deep-linkable, sin actualizaciones optimistas.
- Alternatives considered: Server Actions (descartadas: crearían un segundo camino de escritura fuera del contrato que usan CLI y MCP); edición optimista (descartada: montos, estados y copy literal deben verse como los guardó el servidor); hojas con URL propia (descartadas: un enlace compartido no debe abrir un borrador); persistir borradores en el navegador (descartado: reenviaría datos viejos contra una revisión nueva).
- Why this pattern: la UI es un cliente más del mismo contrato (Full API Parity); el conflicto, la idempotencia y los permisos se resuelven una vez, en el servidor.
- Reuse / extend / new primitive: extiende `Pipeline`, `PiecesWorkspace`, `MediaPlanView`, `Shell`; nuevas `Sheet`, `ConfirmDialog`, `ConflictDialog` locales.
- Open risks: dependencias de contrato (TASK-1892/1893/1894) aún sin OpenAPI publicado; ejercicio de escritura antes del login; corte de autoridad por campaña aún no modelado en el DTO.
- Follow-up: master flow de EPIC-049; artboards `v3 · Edición`.

## Acceptance Checklist

- [x] The owning task declares this file in `Flow`.
- [x] Every surface has desktop and compact behavior.
- [x] Opening, closing, escape and focus restore are specified.
- [x] Route/deep-link/back-button behavior is explicit.
- [x] Data readers/commands are named and UI-only business logic is avoided.
- [x] Failure paths are user-safe and do not expose internals.
- [x] GVC sequence captures prove the flow, not only static screens.
- [x] Design decision log explains why the flow uses these surfaces/routes.
- [ ] Master flow de EPIC-049 creado y este contrato enlazado como nodo MS-N3.
