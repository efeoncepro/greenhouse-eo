# TASK-1715 — Application 360 · panel de Documentos real (abrir el CV, revelar solo la identidad)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-1715-application-360-documents-panel.md`
- Flow: `docs/ui/flows/TASK-1715-application-360-documents-flow.md`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-011`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `agency|hr|ui`
- Blocked by: `TASK-1714 (Slice 4 unicamente; Slices 1-3 no dependen)`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El tab Documentos de la Application 360 muestra tres filas hardcodeadas y un botón "Revelar"
que solo cambia un `useState` local: el CV nunca se puede abrir, el motivo que el operador
escribe se descarta y la auditoría que el banner promete no se escribe. Esta task lo conecta
al reader real de TASK-1362, abre el CV en el visor del browser, expresa los estados honestos
del escáner y deja el reveal auditado solo donde corresponde: el documento de identidad.

## Why This Task Exists

`Application360View.tsx:1144-1147` construye la lista de documentos con literales:
`'Currículum (CV)'` con `href: null` y `sensitive: true`. `Application360View.tsx:355-368`
implementa el reveal como `setRevealedDocs(...)` — sin fetch, sin endpoint, sin persistencia.
El banner de `Application360View.tsx:1141` afirma *"Revelar exige un motivo y deja una entrada
de auditoría"*. No hay tal entrada. Es copy que promete una garantía de cumplimiento
inexistente, sobre un documento que ni siquiera necesita esa garantía.

El sustrato real existe desde TASK-1362 y nadie lo enchufó: `resolveCandidateDocuments`
devuelve archivos con `downloadUrl`, enlaces saneados y la identidad enmascarada;
`GET /api/hiring/candidate-facets/[id]/documents` lo expone; y
`GET /api/assets/private/[assetId]?inline=1` ya sirve PDFs con `Content-Disposition: inline`
autorizando por `canAccessHiringCandidateDocument`. TASK-1362 se cerró con `UI impact: none`
declarando explícitamente fuera de alcance *"la UI de subir/ver documentos… desk TASK-355"*, y
TASK-355 ya estaba cerrada. El cable quedó en el aire y ninguna task abierta lo recoge.

El efecto operativo es doble. Primero, el reclutador no puede leer el CV desde el portal —el
trabajo central del ATS— y lo consigue por fuera. Segundo, y más caro a largo plazo: un
candado que no protege nada le enseña al operador a ignorar los candados. Cuando el reveal
real llegue (TASK-1714), lo va a tratar como otro trámite decorativo.

También hay pérdida de información honesta: el reader distingue `available`, `quarantined`,
`legacy_unscanned` y `pending`, y la UI los aplasta todos en "Enmascarado". Un archivo que el
escáner bloqueó y un candidato que nunca adjuntó CV se ven exactamente igual, así que el
reclutador culpa al candidato por un bloqueo del sistema.

## Goal

- El CV y el portafolio se abren en un visor con un clic, sin pedir motivo.
- El panel refleja el paquete documental real: archivos, enlaces e identidad, con sus estados.
- Cuarentena, pendiente de escaneo, sin adjunto y fallo del reader se distinguen entre sí.
- El reveal queda reservado al documento de identidad, consumiendo el command auditado de
  TASK-1714 — y el copy deja de prometer lo que no ocurre.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` (§Delta 2026-07-10)
- `docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md`
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`
- `docs/ui/flows/EPIC-011-hiring-ats-UI-FLOW.md` (nodo N5)
- `DESIGN.md`

Reglas obligatorias:

- **NUNCA** resolver documentos de candidato en un componente: el reader canónico es
  `resolveCandidateDocuments` y es `server-only`.
- **NUNCA** degradar en silencio: si el reader falla, el panel dice que falló; jamás muestra
  "sin documentos".
- **NUNCA** mostrar un affordance de reveal a quien no tiene la capability.
- **NUNCA** escribir strings visibles en JSX: van a `src/lib/copy/dictionaries/{es-CL,en-US}/hiringDesk.ts`.
- **NUNCA** dejar un botón deshabilitado sin explicar la causa junto a él.
- **NUNCA** persistir el valor revelado fuera del estado del componente.

## Normative Docs

- `docs/ui/wireframes/TASK-1715-application-360-documents-panel.md`
- `docs/ui/flows/TASK-1715-application-360-documents-flow.md`
- `docs/tasks/complete/TASK-1362-candidate-document-capture.md`
- `docs/tasks/complete/TASK-1714-candidate-identity-document-reveal.md`

## Dependencies & Impact

### Depends on

- `resolveCandidateDocuments` + tipos — `src/lib/hiring/documents/`
- `canAccessHiringCandidateDocument` — `src/lib/hiring/documents/access.ts`
- `GET /api/assets/private/[assetId]` — `src/app/api/assets/private/[assetId]/route.ts`
- `HiringApplication.candidateFacetId` — `src/lib/hiring/store.ts:426`
- `TASK-1714` para el reveal de identidad (Slice 4)

### Blocks / Impacts

- `TASK-355` — su superficie Application 360 queda materialmente cambiada en el tab Documentos.
- `EPIC-011-hiring-ats-UI-FLOW.md` — el nodo N5 pasa de "docs mockup" a docs reales.
- Nada downstream: el panel es hoja del grafo (consume, no expone).

### Files owned

- `src/views/greenhouse/hiring/CandidateDocumentsPanel.tsx` (nuevo)
- `src/views/greenhouse/hiring/Application360View.tsx` (reemplazo del panel mock)
- `src/app/(dashboard)/agency/hiring/applications/[applicationId]/page.tsx` (carga del reader)
- `src/lib/copy/dictionaries/es-CL/hiringDesk.ts` + `en-US/hiringDesk.ts` + `src/lib/copy/types.ts`
- `scripts/frontend/scenarios/task1712-application-documents.yaml` (nuevo)
- `docs/ui/wireframes/TASK-1715-*.md`, `docs/ui/flows/TASK-1715-*.md`

## Current Repo State

### Already exists

- Reader completo con estados y cuarentena — `src/lib/hiring/documents/resolve.ts`.
- Tipos que separan archivo (`downloadUrl`) de identidad (`displayMask`) — `types.ts`.
- Ruta de bytes con `inline` y autorización por capability hiring — `assets/private/[assetId]`.
- Panel mock con la composición visual aprobada — `Application360View.tsx:1136-1157`.
- Copy parcial (`documentsTitle`, `revealConfirm`) — `hiringDesk.ts`.

### Gap

- El panel no consume ningún reader: las tres filas son literales en JSX.
- El reveal es `useState`; el motivo se descarta y no hay auditoría pese al copy que la promete.
- No hay forma de abrir ni descargar el CV desde el portal.
- Los cuatro estados del escáner no tienen representación visual.
- El copy del panel vive en JSX, no en los diccionarios (viola la regla de tokenización).

## Modular Placement Contract

- Topology impact: `portal`
- Current home: `src/views/greenhouse/hiring/` y la page de detalle de postulación bajo `src/app/(dashboard)/agency/hiring/applications/`
- Future candidate home: `portal`
- Boundary: consume `resolveCandidateDocuments` y la ruta de reveal de TASK-1714; no expone contrato propio
- Server/browser split: el reader corre en la page server; el panel cliente recibe un view-model serializable y jamás importa `src/lib/hiring/documents/**`
- Build impact: `none`
- Extraction blocker: `none`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: reclutador, hiring manager y People Ops con `hiring.application.read`
- Momento del flujo: nodo N5 (Ficha candidato), tab Documentos, antes de evaluar o de preparar la contratación
- Resultado perceptible esperado: el CV se abre en un clic y el panel dice la verdad sobre cada documento
- Friccion que debe reducir: hoy la lectura del CV es imposible dentro del portal y el operador la resuelve por canales externos
- No-goals UX: subir documentos, resolver cuarentenas, editar el perfil legal, visor propio con anotaciones

### Surface & system decision

- Surface: tab Documentos de `/agency/hiring/applications/[applicationId]`
- Nav placement: `none` — no agrega destino de navegación; es un tab existente de una ruta existente
- Composition Shell: `no aplica` — la vista ya vive dentro del shell del Hiring Desk (TASK-355)
- Primitive decision: `reuse` — `Paper variant='outlined'`, `Stack`, `GreenhouseChip kind='status'`, `GreenhouseButton`, `Dialog`, `CustomTextField`
- Adaptive density / The Seam: `no aplica` — lista de filas de ancho fijo dentro del canvas del tab
- Floating/Sidecar/Dialog decision: `Dialog` centrado para el reveal (acto puntual con confirmación), no drawer
- Copy source: `src/lib/copy/dictionaries/{es-CL,en-US}/hiringDesk.ts` → `application.documents.*`
- Access impact: `entitlements` — el affordance de reveal depende de `hiring.candidate.reveal_identity`

### State inventory

- Default: dos grupos (archivos/enlaces, identidad) con sus filas reales
- Loading: skeleton de tres filas mientras el segmento server resuelve
- Empty: filas presentes con copy de "no adjuntó" — la sección no desaparece
- Error: `loadError` con Reintentar; jamás se confunde con vacío
- Degraded / partial: `quarantined`, `pending` y `legacy_unscanned` con chip + causa
- Permission denied: sin capability de reveal, el botón no se dibuja y queda la explicación
- Long content: nombres de archivo largos con `overflowWrap: anywhere`; varios CV listados por fecha
- Mobile / compact: fila en columna, acciones full-width, sin scroll horizontal en 390px
- Keyboard / focus: foco visible por acción, focus trap del dialog, restauración al disparador
- Reduced motion: dialog sin transición

### Interaction contract

- Primary interaction: abrir un documento (un clic, pestaña nueva)
- Hover / focus / active: estados por defecto de `GreenhouseButton`; fila sin hover propio para no sugerir clic en toda la fila
- Pending / disabled: acciones de cuarentena y pending deshabilitadas con `aria-describedby` a la causa
- Escape / click-away: cierran el dialog salvo durante el POST de reveal
- Focus restore: al botón "Revelar" que abrió el dialog
- Latency feedback: spinner dentro del CTA del dialog + `aria-busy`
- Toast / alert behavior: Snackbar para "Copiado"; los errores del reveal viven dentro del dialog, no en toast

### Motion & microinteractions

- Motion primitive: `none` — solo la transición por defecto del `Dialog` MUI
- Enter / exit: `Dialog` estándar del desk
- Layout morph: ninguno
- Stagger: ninguno
- Timing / easing token: los del tema
- Reduced-motion fallback: guard existente del frame desactiva la transición
- Non-goal motion: animar la revelación del valor sensible sería teatro sobre un dato serio

### Implementation mapping

- Route / surface: `/agency/hiring/applications/[applicationId]`, tab `documents`
- Primitive / variant / kind: `GreenhouseButton kind='secondaryAction'`, `GreenhouseChip kind='status' variant='label'`, sin kinds nuevos
- Component candidates: `CandidateDocumentsPanel` (client, route-local) invocado desde `Application360View`
- Copy source: `getMicrocopy(locale).hiringDesk.application.documents`
- Data reader / command: `resolveCandidateDocuments({ candidateFacetId })` en la page; `POST …/identity-documents/[documentId]/reveal` (TASK-1714) desde el cliente
- API parity: la UI es cliente delgado; cero endpoints nuevos en esta task
- Access / capability: `hiring.application.read` (page) + `hiring.candidate.reveal_identity` (prop booleana resuelta en servidor)
- States to implement: default, empty por fila, quarantined, pending, legacy, reader-error, identity-empty, permission-denied, revealing, revealed

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/task1712-application-documents.yaml`
- Route: `/agency/hiring/applications/[applicationId]` con seed determinista
- Viewports: 1440×900 y 390×844
- Quality profile: `premium`
- Required steps: tab Documentos → panel → dialog motivo inválido → motivo válido → Esc → foco restaurado → mobile
- Required captures: `documents-panel`, `documents-quarantine-row`, `reveal-dialog-invalid`, `reveal-dialog-valid`, `focus-restore`, `mobile-panel`
- Required `data-capture` markers: `hiring-documents-panel`, `hiring-documents-files`, `hiring-documents-identity`, `hiring-documents-reveal-dialog`
- Assertions: la fila del CV expone `<a href>` real a `/api/assets/private/`; ninguna fila de archivo dice "Enmascarado"; sin errores de consola; `scrollWidth == clientWidth`
- Scroll-width checks: panel base y dialog abierto, ambos viewports
- Reduced-motion / focus evidence: captura con `prefers-reduced-motion: reduce` + ciclo abrir→Esc→foco
- Review dossier: `pnpm fe:capture:review task1712-application-documents`
- Baseline decision / surface ID: baseline nuevo para el tab Documentos; el resto de la Application 360 conserva el de TASK-355

### Design decision log

- Decision: dos grupos semánticos (archivos sin candado, identidad con reveal auditado) dentro de la composición de filas ya aprobada en TASK-355
- Alternatives considered: construir reveal también para el CV (descartado: el modelo de dominio no lo tiene y encarece el trabajo diario); visor PDF embebido (descartado en V1: el browser ya renderiza inline); fetch cliente del paquete documental (descartado: el reader es `server-only` y no debe degradar en silencio)
- Why this pattern: reusa el vocabulario visual del desk y el patrón de reveal del Person 360; el operador no aprende nada nuevo, solo deja de encontrarse con un candado falso
- Reuse / extend / new primitive: `reuse` total; `CandidateDocumentsPanel` es composición route-local fuera del registry
- Open risks: un candidato con varias postulaciones acumula varios CV (se listan por fecha, no se ocultan); confirmar en Discovery si `downloadUrl` del reader es estable o conviene componer la ruta por `assetId`

### Visual verification

- GVC scenario: `task1712-application-documents`
- Viewports: 1440×900 y 390×844
- Required captures: los seis del plan
- Required `data-capture` markers: los cuatro del plan
- Scroll-width check: panel y dialog, ambos viewports
- Accessibility/focus checks: focus trap, restauración, nombres accesibles únicos por acción, `aria-describedby` en acciones deshabilitadas
- Before/after evidence: captura del panel mock actual vs el panel cableado
- Known visual debt: los warnings axe del chrome global documentados en TASK-355 siguen vigentes
- Visual scorecard: `docs/ui/reviews/TASK-1715-application-360-documents-panel.scorecard.json`
- Quality threshold: `average >= 4.2; floor >= 3; fidelity/template resistance >= 4`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Copy tokenizado

- Namespace `application.documents.*` en `es-CL` y `en-US` + tipo en `src/lib/copy/types.ts`.
- Migrar los literales del panel mock a los diccionarios.
- Reemplazar el subtítulo que promete auditoría sobre el CV por el copy honesto del ledger.

### Slice 2 — Carga server-side del paquete documental

- La page resuelve `canAccessHiringCandidateDocument` + `resolveCandidateDocuments` y arma el
  view-model serializable (sin `value_full`, sin objetos de dominio).
- Fallo del reader capturado con `captureWithDomain` y expresado como estado `loadError`.
- Se pasa `canRevealIdentity` como booleano resuelto en servidor.

### Slice 3 — Panel real con estados honestos

- `CandidateDocumentsPanel` con los dos grupos, las filas por `kind` y los cuatro estados.
- Acciones "Abrir"/"Descargar" contra `/api/assets/private/[assetId]`.
- Enlaces de portafolio y LinkedIn.
- Identidad enmascarada real o estado `identity-empty` explicativo.
- Reemplazo del bloque mock en `Application360View` y borrado del `useState` de reveal falso.

### Slice 4 — Reveal auditado (requiere TASK-1714)

- Dialog con motivo real, validación ≥5, POST al endpoint de TASK-1714.
- Valor revelado solo en memoria, con Copiar y Ocultar.
- Manejo de `403` con `actionable=false` (sin Reintentar) según el contrato canónico.

### Slice 5 — GVC y evidencia

- Scenario file + seed determinista.
- Loop capturar→mirar→ajustar hasta scorecard en umbral.
- Capturas desktop, mobile, reduced-motion y ciclo de foco.

## Out of Scope

- Subir, reemplazar o borrar documentos desde el desk.
- Triage o resolución de cuarentenas (superficie de storage).
- Visor PDF propio con anotaciones.
- Deep link por tab en la Application 360 (aplica a los cuatro tabs; no es de esta task).
- Cualquier endpoint nuevo: el único que falta lo entrega TASK-1714.
- Retención/purga de documentos de candidatos no contratados (ya vive en `retention.ts`).

## Detailed Spec

El detalle de layout, ledger de copy, contrato de accesibilidad y máquina de estados vive en
los dos documentos normativos y no se duplica aquí:

- Layout, ledger de copy y estados: `docs/ui/wireframes/TASK-1715-application-360-documents-panel.md`
- Flujo, foco, fronteras de datos y failure paths: `docs/ui/flows/TASK-1715-application-360-documents-flow.md`

Nota de implementación sobre el view-model: la page debe mapear `CandidateDocuments` a un DTO
plano antes de cruzar a cliente. El panel no recibe el objeto del reader porque arrastra
semántica de dominio que el cliente no debe interpretar; recibe filas ya decididas
(`label`, `detail`, `status`, `href`, `downloadHref`, `documentId`).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (copy) → Slice 2 (datos) → Slice 3 (panel) → Slice 5 (GVC).
- Slice 4 (reveal) requiere `TASK-1714` mergeada; **puede diferirse** sin bloquear el resto:
  mientras no exista, el panel muestra la identidad enmascarada sin botón de reveal, que es un
  estado honesto y ya mejor que el actual.
- Slice 3 no puede shippear antes que Slice 2: sin el view-model real, el panel volvería a
  inventar datos, que es exactamente el defecto que la task corrige.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El reader falla y el panel lo muestra como "sin documentos" | UI / hiring | medium | estado `loadError` explícito + `captureWithDomain`; test que cubre el camino de error | Sentry dominio `hiring` |
| Se expone el `href` de un asset en cuarentena | identity / storage | low | la UI omite la acción por `status`, y `downloadPrivateAsset` rechaza el asset aunque la UI se equivocara | `storage.asset_scan.open_quarantine` |
| El valor revelado queda en un store cliente o en el DOM antes del reveal | identity / PII | low | el valor solo entra al estado del componente tras el POST; revisión del diff en el PR | revisión de código |
| Regresión visual en la Application 360 | UI | medium | GVC con baseline nuevo solo para el tab; el resto conserva el baseline de TASK-355 | `pnpm ui:visual-gate` |
| Copy nuevo sin tokenizar reintroduce literales en JSX | UI | medium | lint `greenhouse/no-untokenized-copy` + ledger completo en el wireframe | `pnpm ui:code-lint` |

### Feature flags / cutover

Sin flag — el cambio es aditivo sobre una superficie que hoy no funciona; no hay
comportamiento previo que preservar ni usuarios que dependan del mock. El reveal (Slice 4)
tiene su interruptor natural en la capability de TASK-1714.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert del PR (solo diccionarios) | <5 min | sí |
| Slice 2 | revert del PR; la page vuelve a no cargar documentos | <5 min | sí |
| Slice 3 | revert del PR; vuelve el panel mock | <5 min | sí |
| Slice 4 | revocar la capability de TASK-1714 apaga el affordance sin desplegar | <10 min | sí |
| Slice 5 | n/a (evidencia) | — | sí |

### Production verification sequence

1. Local: `pnpm dev`, abrir una postulación real con CV, confirmar que el PDF abre inline.
2. Local: postulación sin CV y postulación con archivo en cuarentena — confirmar copy distinto.
3. `pnpm local:check:ui` verde.
4. GVC desktop + mobile + reduced-motion, mirar los frames.
5. Staging: repetir 1-2 contra el deployment, con bypass y persona agente.
6. Producción tras la promoción: abrir un CV real y confirmar que no hay error de consola.

### Out-of-band coordination required

`N/A — repo-only change`. Conviene avisar al equipo de Hiring que el CV ya se abre desde el
portal, para retirar el flujo manual actual.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El panel renderiza el resultado de `resolveCandidateDocuments`, no literales en JSX.
- [ ] El CV de un candidato que adjuntó CV se abre en un visor con un clic y sin pedir motivo.
- [ ] Las cuatro situaciones —`available`, `quarantined`, `pending`/`legacy_unscanned`, sin archivo— muestran copy distinto y acción distinta.
- [ ] Un fallo del reader se muestra como error con Reintentar, nunca como "sin documentos".
- [ ] La sección de identidad muestra `displayMask` real, o el estado explicativo cuando aún no hay documento capturado.
- [ ] Sin `hiring.candidate.reveal_identity`, el botón de reveal no se renderiza.
- [ ] Con la capability, el reveal llama al endpoint de TASK-1714 y el valor aparece solo tras la respuesta.
- [ ] El `useState` de reveal falso y el copy que prometía auditoría sobre el CV ya no existen en el repo.
- [ ] Todo string visible del panel vive en `src/lib/copy/dictionaries/{es-CL,en-US}/hiringDesk.ts`.
- [ ] Sin scroll horizontal de página en 1440 y 390.
- [ ] GVC desktop + mobile capturado y mirado; scorecard en umbral.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm vitest run src/lib/copy src/views/greenhouse/hiring`
- `pnpm design:lint`
- `pnpm fe:capture task1712-application-documents`
- `pnpm dev` + revisión manual con una postulación real

## Closing Protocol

- [ ] `Lifecycle` sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado ejecutado (mínimo: `TASK-355`, `TASK-1714`, master UI flow)
- [ ] Delta en `docs/ui/flows/EPIC-011-hiring-ats-UI-FLOW.md` declarando N5 con docs reales

## Follow-ups

- Subir/reemplazar documentos del candidato desde el desk.
- Superficie de triage de cuarentena (dominio storage, no hiring).
- Visor con anotaciones sobre el CV, si aparece la necesidad de comentar en el documento.
- Deep link por tab en la Application 360.

## Delta 2026-08-15 — cierre

**Estado: complete.** El panel consume el reader real, el CV se lee dentro del portal y el copy que
prometía una auditoría inexistente ya no está en el repo.

Cambio de decisión respecto del contrato original, hecho durante la implementación y a pedido del
operador: **DDL-2 decía "el visor es el del browser, en pestaña nueva" y estaba mal.** Mandar el CV
fuera del portal rompe el contexto de evaluación y delega los 12 estados al visor del sistema. La
decisión vigente es un diálogo dentro del portal; el wireframe, el flow y el contrato de dirección
visual quedaron corregidos con la razón, no reescritos como si nunca hubiera pasado.

Se descartó `react-pdf` con evidencia: no arranca bajo `pnpm dev` (`next dev --webpack`) porque
`pdfjs-dist` v5 rompe el interop ESM de webpack, y aun funcionando cuesta ~400 KB para hacer lo que el
navegador ya hace. El hueco de móvil se cierra por capacidad (`navigator.pdfViewerEnabled`), no por
viewport. El alcance real de ese fallo —y la unificación de las tres implementaciones de visor que hay
en el repo— viven en `TASK-1716`.

Evidencia:

- **GVC premium verde en desktop 1440 y mobile 390**: `exit 0`, cero findings de error, rubric `pass`.
  Scorecard `docs/ui/reviews/TASK-1715-application-360-documents-panel.scorecard.json` (promedio 4.47,
  piso 4.3).
- Suite focal 330 verde (`src/lib/hiring`, `src/lib/copy`, `src/lib/entitlements`); `lint` y
  `typecheck` limpios.
- Verificado contra una postulación **real** con dos CV adjuntos, portafolio y LinkedIn.

Cuatro defectos que destapó el loop de captura y que ni los tests ni el build veían:

1. PG entrega `Date` donde el tipo dice `string`: el sort del view-model reventaba en runtime con los
   mocks en verde. Normalizado en la frontera + test con fixture `Date`.
2. `variant='tonal'` rendía 3.69:1 (axe), bajo el piso AA.
3. `sx` no mapea `outlineColor` a la paleta: emitía CSS inválido y el anillo de foco no se dibujaba.
4. El diálogo mostraba **dos** "Abrir en pestaña nueva" — lo vio el árbol de accesibilidad.

Pendiente declarado: el Slice 4 (reveal de identidad en la UI) está implementado y cableado a
`TASK-1714`, pero **no se pudo ejercitar** porque ningún candidato tiene documento de identidad
capturado todavía — ver el Delta de cierre de `TASK-1714`.

## Open Questions

- ¿El panel debe listar los CV de postulaciones anteriores del mismo candidato, o solo el de
  esta postulación? La propuesta los lista todos por fecha (son evidencia del proceso y el
  reader ya los devuelve); Hiring puede preferir acotarlo a la postulación actual.
