# TASK-2071 — Rooms: autoría mínima y lectura de imágenes privadas

## Delta 2026-10-31 — autoría de escenas «Vive el servicio»

- La mesa crea y edita las cuatro escenas (`showcase`, `cycle`, `answers`, `team`) con vista en vivo del borrador y
  guardado por `content.upsertBlock`. `efeonce-rooms` `claude/rooms-approved-ui` `95d3ac2`; ADR Proposed
  `EFEONCE_ROOMS_SERVICE_SCENES_DECISION_V1.md`.
- Evidencia `local`: `pnpm verify` 376/376; GVC PASS `rooms-authoring-scenes` y `rooms-authoring`; recorrido real en
  la integración (crear, editar, guardar y abrir la vista previa de una escena en la sala sintética Lumbre).
- Pendiente: aprobación del ADR y aceptación humana. `UI ready` sigue en `no`.

## Delta 2026-10-30 — canvas aprobado; base y backend primero

- El operador aprobó el 2026-10-29 el canvas de Claude Design «la sala es una órbita» (artifact
  `https://claude.ai/code/artifact/6562987e-d882-44ba-a929-a6ab7863771d`), registrado en
  `docs/ui/visual-directions/EFEONCE_ROOMS_VISUAL_DIRECTION_V1.md` § «Aprobación 2026-10-29». Reemplaza la
  composición del scaffold anterior para esta superficie.
- Orden: TASK-2079 (base visual: órbita, halo, cámara, iris, motion) y TASK-2080 (contrato backend) van primero.
- Esta task implementa Explorar pieza (marco que cambia de proporción, capas Vista limpia/En contexto/Detalle,
  pestañas Fundamento/Evidencia/Preguntar) y Autoría (inventario, cobertura, «Ver como»).
- Huecos backend (2026-10-30): un bloque de medio admite un asset y nada agrupa adaptaciones; las preguntas no
  traen nombre visible; «Ver como» no tiene proyección por rol. Adaptaciones y nombres en TASK-2080 slice 5; la
  vista por rol queda como follow-up de la Fase 2.

## Delta 2026-10-29 — backend de imagen disponible; UI nueva pendiente

El [canary interno del 26-10](../../audits/rooms/2026-10-26-auth-rooms-real-image-canary.md)
acreditó procesamiento y lectura privada de una imagen real por la ruta
existente. La sesión Rooms conserva conectores para que Claude Design integre
la nueva UI, aún no entregada al último intercambio. Falta verificar como un
solo flujo crear sala → cargar/procesar → adjuntar → publicar → invitado, con
conflicto, revocación y aceptación visual humana. El scaffold anterior y los
deltas del 25-10 no acreditan esa experiencia nueva.

> Estado actual26Oct: ver `Status real` y «Conciliación vigente» abajo. El delta25Oct se conserva como historia del corte y sus pendientes no describen el estado actual.

## Delta 2026-10-25 — estado al corte de Codex

- **Rescate 2026-10-25 (Claude):** el WIP quedó commiteado en la rama local `task/2070-2071-private-media` de `efeonce-rooms` (`c0facfd` backend, `2626921` UI; sin push). Se corrigió el TS2322 y los tests de medios entraron a `pnpm test`: `pnpm verify` PASS con 205/205 tests (incluye 9 de persistencia en la PG local) y build OK. `main` sigue en `20f9fe9` (candidato del canary). Lo de abajo describe el estado previo al rescate.
- UI implementada en WIP sin commitear (autoría, preview, inspector con zoom y teclado, seis `data-capture`), pero comparte el typecheck rojo de 2070. Sin escenario GVC, capturas, scorecard ni aceptación humana. Hay alcance fuera del mapa congelado (`/rooms/new`, conversión V2→V3 desde UI) que hay que validar. Corte en [registro de estado](../../audits/rooms/2026-10-25-rooms-auth-status-after-codex-stop.md).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Ownership 2026-10-26

El operador asigna diseño e interfaz a **Claude Design** y backend a Codex. Codex conserva el scaffold
histórico de esta task y no lo rediseña ni lo considera aceptado. Contratos/backend e integración:
[TASK-2072](TASK-2072-rooms-cloud-media-backend.md) y [guía para Claude Design](../../documentation/rooms/backend-api-for-claude-design.md).

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-2071-rooms-private-image-authoring-and-viewer.md`
- Flow: `docs/ui/flows/TASK-2071-rooms-private-image-authoring-and-viewer-flow.md`
- Motion: `docs/ui/motion/TASK-2071-rooms-private-image-authoring-and-viewer-motion.md`
- Backend impact: `integration`
- Epic: `EPIC-052`
- Status real: `2026-10-31: autoría y ediciones del canvas implementadas en local (efeonce-rooms claude/rooms-approved-ui, sin push). Mesa de autoría /rooms/:roomId/authoring con inventario, cobertura, escenario compartido con «Ver como» (comprador/champion/audiencia sobre content.previewAudience), propiedades (incluir/excluir, capítulo, título, fundamento, vincular evidencia) y publicar con confirmación; vista previa por rol; «Qué cambió» /editions/:editionId/cambios con línea de tiempo, lista y detalle (comparador deslizante de pieza y diff de texto). GVC local PASS: rooms-authoring (1440/1280/390) y rooms-edition-changes (1440/390). Contra el backend real (integración 3216, admin interno): renombrar persistió (revisión 36→37), se publicó la edición 6 y «Qué cambió» mostró el cambio. «Añadir imagen» también implementada (uploads.initiate → PUT → uploads.complete → «Usar en la sala» crea la pieza, adjunta y ubica en el capítulo) y, sin borrador abierto tras publicar, la mesa ofrece editions.reopen; ambos probados en la integración local. Falta: adaptaciones desde la mesa, medios V4 en la mesa, aceptación humana y UI ready.`
- Rank: `R07A/R08A inmediatamente después del contrato TASK-2070`
- Domain: `ui|content`
- Blocked by: `none`
- Branch: `Greenhouse develop para docs; efeonce-rooms main para runtime; sin worktrees`

## Conciliación vigente — 2026-10-26

Entrega cloud y canary: [canary real cerrado](../../audits/rooms/2026-10-26-auth-rooms-real-image-canary.md); coordinación posterior: [disparo automático](../../audits/rooms/2026-10-26-automatic-media-dispatch.json). El único correo ya recibido no se repite. Persisten como trabajo nuevo la integración del consumidor de Claude Design y sus gates; el disparo del Job ya no es un pendiente.

El estado consolidado vigente y el siguiente bloque están en [contrato para Claude Design](../../documentation/rooms/backend-api-for-claude-design.md). Producción conserva los flags humanos OFF; conectar el diseño no autoriza activarlos ni repetir el correo único. Auth permanece en PR por decisión expresa del operador.

## Delta 2026-10-31 — autoría y ediciones del canvas aprobado

- Implementación: `src/components/authoring/{authoring-model,authoring-studio,authoring-client,authoring-demo}.tsx`,
  `src/server/presentation/authoring.ts`, páginas `src/app/rooms/[roomId]/authoring/{page,vista-previa/page}.tsx`;
  `src/components/editions/{changes-model,edition-changes}.tsx`, `src/server/presentation/edition-changes.ts`, página
  `src/app/rooms/[roomId]/editions/[editionId]/cambios/page.tsx`; estilos `src/styles/{authoring,editions}.css`;
  demos sintéticas `/demo/autoria` y `/demo/ediciones` (volta ficticia).
- Cada acción usa los comandos canónicos (`content.upsertBlock`, `content.arrange`, `content.linkEvidence`,
  `editions.publish`) con la revisión esperada; un conflicto recarga el modelo del servidor, nunca una copia local.
  Excluir una pieza también la saca de su capítulo declarado, porque la cobertura no permite publicar con un bloque
  excluido dentro de un capítulo.
- El escenario es una imagen fiel y no interactiva de la escena del cliente (`inert` + `aria-hidden`, con texto
  para lectores de pantalla que remite a «Abrir vista previa»).
- «Añadir imagen» (commit `58287fb`): hash SHA-256 en el navegador, `uploads.initiate`, PUT único al transfer privado,
  `uploads.complete`; la imagen procesada espera en «Usar en la sala», que crea la pieza (`content.upsertBlock`),
  adjunta (`content.attachAsset`) y la ubica en el capítulo en pantalla. Tras publicar no queda borrador: la mesa
  ofrece `editions.reopen` en vez de un acceso denegado.

## Summary

Permitir que un autor agregue una imagen real a un bloque de la propuesta, conserve su estado de carga, edite título/texto alternativo/pie y revise la lectura antes de publicar. El invitado inspecciona el derivado autorizado de esa edición con proporción intacta. Este corte usa los servicios de TASK-2070 y no equivale al editor completo ni a todo R05/R07/R08.

## Why This Task Exists

El lector 20f9fe9 sirve texto V1/V2 y muestra indisponibilidad para media. El manifest sólo admite procedencia sintética, las referencias no se resuelven y aún no existe una interfaz de autoría. Inventar previews o readiness en el cliente eludiría la cobertura y el acceso ya construidos.

## Goal

- Completar imagen seleccionada → transferencia → verificación → adjuntar a borrador → preview → validar/publicar → lectura guest.
- Separar carga de bytes, incorporación al borrador y publicación; conservar un resultado incierto sin duplicar originales.
- Reutilizar La órbita/AXIS y el mismo renderer; preservar texto V1/V2 y origen real/sintético explícito.


<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/rooms/EFEONCE_ROOMS_ARCHITECTURE_V1.md` §§3–5.
- `docs/architecture/rooms/EFEONCE_ROOMS_API_AND_ACCESS_CONTRACT_V1.md`.
- `docs/architecture/rooms/EFEONCE_ROOMS_EXPERIENCE_V1.md` §§3,9,10.
- `docs/architecture/rooms/EFEONCE_ROOMS_EXPERIENCE_PROFILES_V1.md`.
- `docs/architecture/rooms/EFEONCE_ROOMS_PRIVATE_IMAGE_MEDIA_AND_PROVENANCE_DECISION_V1.md` — dueño TASK-2070, debe estar aceptado antes del hook.
- `docs/architecture/EFEONCE_SHARED_PRODUCT_UI_PLATFORM_DECISION_V1.md`.

## Normative Docs

- `docs/ui/visual-directions/EFEONCE_ROOMS_VISUAL_DIRECTION_V1.md`.
- `docs/operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md`.
- `docs/tasks/TASK_UI_UX_ADDENDUM.md`; `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`.
- Product Design invocada: reutilizar target existente, get-context/critical-overrides/design-qa; no scaffold ni logo nuevo.

## Dependencies & Impact

### Depends on

- `docs/tasks/complete/TASK-2070-rooms-private-image-media.md`: V3/provenance, upload, trabajo de medios, proyección autorizada, attach, publish y bytes.
- TASK-2062: comandos de borrador/coverage; TASK-2065/2066: sesión verificada y permisos; TASK-2068: lector 20f9fe9.
- Nombres/DTOs, rutas y límites congelados el 2026-10-25; integración local depende de servicios 2070, sin bloquear trabajo de presentación.

### Blocks / Impacts

- Primera lectura de imágenes privadas y primer bloque media editable; R05B y autoría completa quedan separados.
- Candidata remota20f9fe9/canary Auth no se modifica por inferencia; sólo implementación local posterior al hook.

### Files owned

- Nuevos `../efeonce-rooms/src/app/rooms/[roomId]/edit/**` y `preview/**`.
- Nuevos `../efeonce-rooms/src/components/authoring/**`, `src/components/media/**`, `src/lib/copy/media.ts`, `src/styles/media.css`.
- Existentes `../efeonce-rooms/src/components/room-reader.tsx`, `src/components/content/reader-contract.ts`, `src/server/presentation/content.ts`; nuevo adapter `src/server/presentation/authoring.ts`.
- Enlaces contextuales de `src/app/rooms/page.tsx` y rutas de sala, coordinados con raíz; tests UI propios.
- Esta task, wireframe, flow, motion y plan. API/domain/DB/worker/proxy/secrets/registry de operaciones pertenecen a2070 o raíz.

## Current Repo State

> Snapshot del discovery original. El estado actual y los pendientes posteriores están en `Status real` y «Conciliación vigente — 2026-10-26»; no ejecutar otra vez un canary ya completado por leer esta fotografía inicial.

### Already exists

- `../efeonce-rooms/src/domain/permissions.ts`: content.edit sólo draft; editions.publish separado. Operator puede editar con grant, no publicar; administrator tampoco recibe grant implícito.
- `../efeonce-rooms/src/server/presentation/content.ts` y `src/components/room-reader.tsx`: DTO audiencia, evidencia y mediaCount sin URLs.
- AXIS instalado exporta Button, Badge, FileField, Field, Input, Textarea, Dialog y Tabs; viewer demo2059 y estilos Rooms sirven de referencia, no de fuente de assets privados.

### Gap

- Media siempre unresolved y UI sin carga/inspección privada. La UI necesita DTO2070 y metadatos alt/caption, nunca afirmaciones ready del navegador.
- El badge actual de ejemplo requiere proveniencia V3 autoritativa; V1/V2 históricos permanecen sintéticos.

## Modular Placement Contract

- Topology impact: `ui-package`
- Current home: `../efeonce-rooms/src/components`, `src/app/rooms`, `src/server/presentation`.
- Future candidate home: `ui-package`
- Boundary: adapter de presentación de contratos2070; reglas y readiness siguen en servicios canónicos.
- Server/browser split: RSC verifica contexto y proyecta DTO; cliente conserva interacción/archivo efímero, sin stores, GCS SDK, secretos ni lógica de grants.
- Build impact: sin paquetes ni worker en browser; dependencias y lockfile pertenecen al dueño backend TASK-2070; no se amplían desde esta UI.
- Extraction blocker: no extraer hasta estabilizar contrato de medios y consumidor; producto no se muda a AXIS.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`.
- Usuario / rol: autor interno con content.edit; publicador con editions.publish; invitado sólo edición publicada autorizada.
- Momento del flujo: construir una pieza y revisarla antes de compartir; inspeccionar imagen al leer.
- Resultado perceptible esperado: imagen íntegra, estado entendible y publicación explícita.
- Friccion que debe reducir: archivos cargados sin incorporación, procesos inciertos y medios inaccesibles sin recuperación.
- No-goals UX: editor universal, batch masivo, tours, crop, descargas originales, PDF/audio/video.

### Surface & system decision

- Surface: editor contextual de una sala y visor dentro del lector.
- Nav placement: `shortcuts` — acción contextual Editar propuesta desde sala autorizada; sin nuevo rail ni duplicación global.
- Composition Shell: no aplica Vuexy; composición propia Rooms usa tipografía/semántica AXIS existente.
- Primitive decision: `reuse` FileField/Field/Input/Textarea/Button/Badge/Dialog/Tabs; progress nativo como adapter semántico si export AXIS no existe.
- Adaptive density / The Seam: no aplica; escenario editorial dominante, sin grilla de widgets.
- Floating/Sidecar/Dialog decision: propiedades inline desktop; panel móvil por Tabs; Dialog sólo inspección/conflicto de salida, nunca modales anidados.
- Copy source: `../efeonce-rooms/src/lib/copy/media.ts`.
- Access impact: `views` — capacidades ya resueltas por servidor; ningún switch de rol concede acceso.

### State inventory

- Default: imagen de bloque seleccionado y propiedades; badge Borrador/Preview sin confusión con edición publicada.
- Loading: Cargando con progreso real cuando existe; Verificando sin porcentaje fabricado.
- Empty: Añade una imagen a esta propuesta; formatos/límites proceden del contrato.
- Error: carga interrumpida/archivo rechazado/permiso perdido; acción específica sólo si el DTO la permite.
- Degraded / partial: imagen lista sin adjuntar o medios no disponibles; texto existente permanece legible.
- Permission denied: retirar pieza/inspector al perder autoridad; no mostrar detalles privados en error.
- Long content: nombres/envíos/alt largos envuelven; imagen vertical nunca recortada para caber.
- Mobile / compact: Contenido/Imagen/Vista de lectura; controles al alcance, no tres columnas estrechas.
- Keyboard / focus: entrada nativa de archivo, botones de zoom/pan/reset, Escape y retorno al disparador/título si desaparece.
- Reduced motion: sin desplazamiento; mismo estado/foco y sin snapshots al cambiar autoridad.

### Interaction contract

- Primary interaction: Añadir imagen → guardar propiedades → revisar → publicar, cada acción según permiso/estado.
- Hover / focus / active: tokens AXIS; foco visible y objetivos24px mínimo,44px recomendado táctil.
- Pending / disabled: bloquear sólo duplicación de la intención actual; conservar command key/payload si resultado incierto.
- Escape / click-away: cierra inspección; cambios sin guardar requieren decisión explícita; cierre no equivale a cancelar upload servidor.
- Focus restore: vuelve a la pieza o al título del editor si desapareció.
- Latency feedback: recibida no significa verificada; Lista no significa publicada.
- Toast / alert behavior: error inline por archivo; aria-live anuncia cambios de fase una vez, no cada porcentaje.

### Motion & microinteractions

- Motion primitive: `CSS` AXIS y helper existente room-motion sólo dentro de contexto autorizado estable.
- Enter / exit: transición breve del inspector, sin pérdida de contraste por opacidad del texto.
- Layout morph: sólo selección/preview estable; sin snapshot de archivos privados en cambio de sesión.
- Stagger: ninguno.
- Timing / easing token: semantic adapter Rooms/AXIS; ningún tiempo decorativo nuevo.
- Reduced-motion fallback: commit inmediato/foco conservado; zoom sigue funcional sin animación espacial.
- Non-goal motion: spinner permanente, fake progreso, animación del arte/branding del cliente.

### Implementation mapping

- Route / surface: /rooms/:roomId/edit y /rooms/:roomId/preview; mismo lector published para guest.
- Primitive / variant / kind: AXIS FileField, fields, Buttons, Badge, Tabs, Dialog.
- Component candidates: ImageAuthoring, UploadStatus, ImageProperties, ProtectedImage, ImageInspector.
- Copy source: media.ts; nombres/codecs/límites desde DTO2070.
- Data reader / command: autoría, upload status/retry/cancel/complete, attach y validate/publish definidos por2070; nombres congelados en el mapa técnico de abajo.
- API parity: UI consume registry/HTTP; ningún writer alterno, SDK proveedor ni SQL desde la UI.
- Access / capability: content.edit en draft, editions.publish por separado, rooms.read en publicación; bytes revalidados por backend.
- States to implement: seis estados del wireframe y fallos de red/409/revocación.

### GVC scenario plan

- Scenario file: futuro `scripts/frontend/scenarios/rooms-private-images.scenario.ts`; focused harness local para auth/upload que el DSL no exprese.
- Route: editor, preview y lector de fixture propia autorizada.
- Viewports:1440x900,1024x768,390x844,320x740; texto200%.
- Quality profile: `premium`.
- Required steps: elegir imagen→carga→verificación→attach→propiedades→preview→coverage→publicar→guest→inspector→revocar.
- Required captures: empty/loading/ready/rejected/conflict/partial/denied; imagen retrato, paisaje, alpha y larga.
- Required data-capture markers: media-authoring, media-transfer, media-properties, media-preview, media-inspector, media-recovery.
- Assertions: integridad/ratio/contain, bytes protegidos, ausencia de payload privado en usuario no autorizado, axe0 y foco estable.
- Scroll-width checks: document.scrollWidth<=innerWidth en todas las vistas, sin ocultar overflow.
- Reduced-motion / focus evidence: zoom/reset/teclado/Escape, noAPI ViewTransition y reduce.
- Review dossier: `docs/ui/reviews/TASK-2071-rooms-private-image-authoring-and-viewer/`.
- Baseline decision / surface ID: nueva surface rooms-private-images-v1, referencia Rooms20f9fe9 y galería 2059; aceptación humana pendiente.

### Design decision log

- Decision: una pieza real y su ciclo completo; propiedades alrededor del mismo renderer.
- Alternatives considered: galería demo o importador completo; no resuelven el ciclo mínimo o amplían innecesariamente el editor.
- Why this pattern: preserva narrativa, inventario y estado localizable junto al archivo.
- Reuse / extend / new primitive: reusar AXIS; composición de producto, no nueva primitive distribuida.
- Open risks: servicios 2070 en implementación local, transferencia interrumpida y revocación durante inspección.

### Visual verification

- GVC scenario: rooms-private-images; autenticación local efímera sin trace/video secretos.
- Viewports: los cuatro anteriores, más200%.
- Required captures: estados y ratios descritos; archivos de prueba permitidos, jamás logos recreados.
- Required data-capture markers: los seis anteriores.
- Scroll-width check: obligatorio por viewport.
- Accessibility/focus checks: inputs etiquetados, alt útil/decorativa explícita, zoom y pan con teclado, contraste y retorno.
- Before/after evidence: comparación con lector/visor existentes a mismo viewport.
- Known visual debt: nada aceptado por inferencia; arte nuevo conserva su fuente.
- Visual scorecard: `docs/ui/reviews/TASK-2071-rooms-private-image-authoring-and-viewer.scorecard.json`.
- Quality threshold: average>=4.2, floor>=3, fidelity/template resistance>=4.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical` por consumo de medios privados.
- Impacto principal: `integration`; Source of truth: servicios2070 y lifecycle2062, sin schema propio de UI.
- Consumidores afectados: SSR/cliente; Runtime target: local primero.

### Contract surface

- Contrato existente a respetar: src/domain/content-contracts.ts, permissions.ts y registry canónico.
- Contrato nuevo o modificado: sólo adapter de presentación al contrato 2070; nombres y DTO congelados por su dueño antes de JSX.
- Backward compatibility: V1/V2 intactos, V3 opt-in; Full API parity por servicios/HTTP/CLI2070.

### Data model and invariants

- Entidades/tablas/views afectadas: lectura indirecta de rooms/editions y medios2070; ninguna tabla nueva aquí.
- Invariantes: original inmutable, ready sólo servidor, pertenencia exacta a edición, dataOrigin explícito; notas/grants/URLs de transferencia fuera del DTO de audiencia.
- Write-target allowlist: no escrituras directas; owners2070 poseen los destinos de cada command.
- Tenant/space boundary: sesión verificada y recurso; organizationId del browser sólo intersecta.
- Idempotency/concurrency: expectedRevision y key estable por intención; attach409 conserva archivo listo y propiedades.
- Audit/outbox/history: comandos canónicos; no emitir eventos de éxito por click ni inferir lectura de imagen.

### Migration, backfill and rollout

- Migration posture: none en esta unidad. Default state: preparación/UI no habilitada hasta2070; canary20f9fe9 intacto.
- Backfill plan: ninguno; Rollback path: revertir UI a entrega no disponible, preservar originales y ediciones.
- External coordination: raíz/2070 poseen storage, worker, flags, CSP y permisos; no cambios de secretos ni cloud aquí.

### Security and access

- Auth/access gate: content.edit/editions.publish/rooms.read y realm vigentes; ningún permiso por rol visual.
- Sensitive data posture: archivo y descriptor efímeros, sin localStorage/sessionStorage/logs/URL de navegación; no Next optimizer sobre bytes privados.
- Error contract: estados/códigos saneados de2070; no paths bucket ni errores de codec al usuario.
- Abuse/rate-limit posture: cuotas/límites del backend; UI muestra recuperación, no reintenta publicación automáticamente.

### Runtime evidence

- Local checks: lint/types/build, e2e de carga/preview/guest con archivos reales permitidos.
- DB/runtime checks:2070 certifica storage/DB; aquí comparar readback de command y representación.
- Integration checks: carga local real, cancelación, retry, errores,404 entre tenants, revocación y no-store.
- Reliability signals/logs: correlationId saneado; sin telemetry de archivos privados.
- Production verification sequence: sólo tras validación local y release coordinado; esta preparación no activa ni despliega.

## Hybrid Execution Justification

- Why not split: foundation ya separada en TASK-2070; este integration impact es consumo SSR/browser de esos contratos, sin política nueva.
- Primary execution profile: ui-ux.
- Contract boundary: cambios a permisos/schema/bytes requieren2070; adapter no sustituye validación.
- Risk controls: readiness por contrato congelado, hook, flags/rollout de raíz y QA de audiencia.


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

### Slice 1 — Readiness del consumidor

Congelar DTO/copy/estados/rutas2070; mapear campos y permisos; ejecutar readiness/hook antes de JSX. No modificar package/lock/node_modules durante canary.

### Slice 2 — Autoría mínima de una imagen

Añadir un bloque de imagen o modificar ese bloque, cargar un archivo por intención, editar título/alt/pie y guardar mediante commands. Mantener los otros bloques sin pérdida; no ofrecer edición ficticia de tipos no incluidos.

### Slice 3 — Preview, publicación y lectura

Proyección de audiencia del borrador, revisión de coverage y publicación con permiso separado. Reader recibe media V3; imágenes protegidas intactas, inspector y recuperación. No descarga original.

### Slice 4 — Calidad y handoff

Probar fixtures reales de formatos autorizados, fallos, revocación, móvil/teclado/reduce, evidencia premium y revisión humana. El canary remoto26Oct ya está cerrado; no reabrirlo para QA de la nueva UI. Usar el entorno aislado.

## Out of Scope

PDF, audio, video, importación de URLs, SVG arbitrario, tiles, crop/editor gráfico, batch masivo, templates/tours/escenarios, analytics, grants nuevos, logos, cloud/proveedores, publicación automática, editor completo R08.

## Detailed Spec

El wireframe, flow y motion son el contrato visual. La carga puede terminar sin incorporarse al borrador: se muestran estados diferentes. El usuario puede reconciliar un resultado incierto por lectura; no crea otro archivo/versión por timeout. Una publicación fija assetVersion y rendition; sustituir la imagen produce una edición posterior. La vista de borrador requiere content.edit y se etiqueta como preview, sin impersonar sesión invitada.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Contrato2070 y ADR aceptado → readiness/hook2071 → autoría → preview/lectura → QA. Ningún client ready flag adelanta bytes verificados. Sólo código local en el entorno aislado; canary26Oct cerrado y Auth retenido en PR, sin reactivación por esta task.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Transferencia interrumpida duplica originales | Media | medium | reader y key estable; cancelar explícito | dos versiones para la misma intención |
| Adjuntar sobre revisión vieja pierde contenido | Content | medium |409+readback, conservar borrador local | revisión cambió sin conflicto |
| Preview mezcla autoridad con guest | Access | high | audience projection servidor, no snapshots al salir | datos no autorizados enDOM/red |
| Ratio o color del arte se altera | UI | medium | metadata derivada/contain/QA original | recorte/deformación/alpha perdido |

### Feature flags / cutover

Consumir disponibilidad2070 del servidor. UI no activa storage ni habilita cloud. La candidata remota permanece20f9fe9 hasta release separado; no modificar env/secretos/bootstrap.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
|1–2 | retirar enlace/consumidor mediante revert scoped, conservar bytes | un ciclo build/deploy medido al release | sí |
|3–4 | volver a lector textual con indisponibilidad explícita, sin borrar versiones | mismo ciclo | sí |

### Production verification sequence

1. Gates locales de2070 y UI con transferencia real.
2. Revisión visual humana y seguridad del acceso.
3. Release coordinado por raíz, con permiso de storage/worker y smoke del SHA exacto; no forma parte del discovery actual.

### Out-of-band coordination required

Raíz coordina canary Auth, worker/storage/CSP y release. No enviar archivos a terceros ni alterar cloud por esta task UI.


<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] UI ready del nuevo diseño permanece no hasta mapping/GVC/decision log completos y contrato backend consumido; hook y readiness pasan antes de JSX. El DTO backend ya existe; no confundir ese avance con aceptación de la interfaz.
- [ ] Wireframe/flow/motion existentes pasan sus gates focales; fuente visual y reuse AXIS comprobados.
- [ ] Una imagen con bytes reales recorre upload→verificar→attach→preview→publish→guest; Lista no se confunde con publicada.
- [ ] Título/alt/pie preservan cambios ante409, y retry de resultado incierto no duplica archivo/command.
- [ ] JPG/PNG/WebP admitidos según2070; rechazo y límites se muestran sin confianza en extensión o metadata browser.
- [ ] V3 real/synthetic se muestra con exactitud; V1/V2 no se relabelan ni pierden texto/relaciones.
- [ ] content.edit y editions.publish se respetan por separado; invitado no recibe borrador, originales ni notas.
- [ ] Preview/inspector preservan ratio, alpha y arte; zoom/pan/reset tienen teclado y foco estable.
- [ ] Loading/empty/partial/error/denied están implementados con copy central; no almacenar token/descriptor en browser persistente.
- [ ] Revocación/expiry niega bytes nuevos y retira DOM/inspector; caché privada no usa optimizador público ni snapshots entre autoridades.
- [ ] GVC premium4anchos,200%, axe y reduced motion pasan, document.scrollWidth<=innerWidth sin ocultar overflow; comparación visual observada.
- [ ] API/CLI2070 y UI comparten commands/readers; sin rutas write paralelas ni cambios deDB/proveedor en cliente.
- [ ] Revisión humana registrada sin confundir QA técnica con aceptación; no declarar R05/R07/R08 completos.

## Verification

- Runtime: `pnpm lint`, `pnpm exec tsc --noEmit`, tests UI afectados y `pnpm build` coordinado.
- Greenhouse: `pnpm task:lint --task TASK-2071`, `pnpm ui:wireframe-check --task TASK-2071`, `pnpm ui:flow-check --task TASK-2071`, `pnpm ui:motion-check --task TASK-2071`, `pnpm ui:readiness-check --task TASK-2071`.
- GVC canónico y harness local autenticado cuando transferencia no quepa enDSL; sin traces/videos/URLs secretas.

## Closing Protocol

- [ ] Lifecycle y carpeta reflejan ejecución/aceptación real; README/registry coordinados por raíz.
- [ ] Handoff/changelog y epic actualizados por raíz, sin mezclar WIP de canary.
- [ ] Gates, capturas y scorecard enlazados; pendiente humano permanece explícito.
- [ ] Chequeo cruzado2070/2068, V1/V2 y demo; no activos huérfanos por perder cambios.

## Follow-ups

R05B PDF/audio/video y resto R07/R08 conservan alcance propio. Descarga original requiere capability/policy específica. Ningún ID adicional reservado.


## Mapa técnico congelado — 2026-10-25

- `AuthoringRoom` / `MediaAssetView` / `MEDIA_LIMITS`: `src/domain/media-contracts.ts`; contenido `StoredContentV3` en `content-v3.ts`. V1/V2 autoría responde 409 y no convierte por inferencia.
- GET `/api/v1/rooms/:roomId/authoring?organizationId`: borrador, revisión, capacidades, coverage y assets. GET `/preview?organizationId`: DTO audiencia del borrador con `content.edit`, sin notas internas.
- GET `/api/v1/rooms/:roomId/media?organizationId` y `/uploads/:uploadId?organizationId`: readback. PUT a la ruta de upload: bytes con sesión fresca, Origin y Content-Type; nunca multipart inventado ni proveedor desde UI.
- POST `/api/v1/commands`: `uploads.initiate/complete/cancel`, `media.retry/cancel`; attach `content.attachAsset {roomId,expectedRevision,blockId,assetRefId,assetVersionId}`. `content.upsertBlock` admite media schemaVersion2 con título, alt, caption y hasta una referencia.
- Bytes GET/HEAD `/api/v1/rooms/:roomId/media/:assetVersionId/:renditionId?organizationId&editionId=:id`, o `&draft=true` sólo con content.edit. Sin signed URL de lectura ni caché público.
- Límites constantes seguros para browser: JPEG/PNG/WebP, 20 MiB de original, 40 megapíxeles; los controles previos orientan, servidor verifica bytes.
- Repetir Añadir imagen crea otro bloque; jamás reemplaza inventario ni limita la sala a una pieza. Publicar requiere su permiso independiente.
