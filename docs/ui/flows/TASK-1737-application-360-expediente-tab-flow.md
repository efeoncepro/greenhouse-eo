# TASK-1737 — Application 360 · Tab Expediente Flow Contract

## Meta

- Status: `contract-ready` (dirección visual pendiente; `UI ready: no` en la task)
- Owner task: `TASK-1737 — Application 360: tab Expediente (consumer UI del Evaluation Dossier de TASK-1735)`
- Related wireframe: [docs/ui/wireframes/TASK-1737-application-360-expediente-tab.md](../wireframes/TASK-1737-application-360-expediente-tab.md)
- Master UI flow: [EPIC-011-hiring-ats-UI-FLOW.md](EPIC-011-hiring-ats-UI-FLOW.md) — este flujo **extiende el nodo N5 (Ficha candidato)**: el tab sintético `activity` se convierte en el Expediente real (notas persistidas de TASK-1735 + eventos de etapa) y el momento smart propose→confirm queda operable dentro de N5, alimentando N8 (review) y N9 (decisión) como lectura. No crea nodo nuevo ni ruta nueva.
- Intended route / surface: `/agency/hiring/applications/[applicationId]` `?tab=expediente` (alias `?tab=activity`) + panel de propuesta + dialog de rechazo.
- Flow type: `single-surface` (tab server-fed + composer command-backed + panel propose/confirm + dialog)
- Primary primitives: `Paper variant='outlined'`, `Stack`, `GreenhouseChip`, `GreenhouseButton`, `CustomTextField`, MUI `Dialog`/`Alert`/`Snackbar`
- Copy source: `hiringDesk.application.expediente.*` (es-CL + en-US, namespace nuevo)

## Flow Brief

- Primary user: reclutador / hiring manager / People Ops con `hiring.application.read`; anotar/proponer/confirmar exige `hiring.application.annotate` (tier gobernanza, TASK-1735).
- Entry moment: assessment corregido (o entrevista por preparar): el operador necesita leer el expediente acumulado, registrar criterio y disparar/confirmar el análisis agéntico.
- Successful outcome: el análisis CV↔assessment queda confirmado y persistido en el expediente; la entrevista/decisión lo hereda sin re-armarlo a mano.
- Primary decision/action: **confirmar/editar/rechazar** el borrador agéntico (write gobernado) o **agregar nota manual** (write directo append-only).
- Non-goals: editar/borrar notas; superficie candidate-facing; scoring de respuestas; trigger automático del propose; deep link a una nota individual.

## Surfaces Involved

| Surface | Role | Desktop behavior | Mobile / compact behavior | Primitive |
|---|---|---|---|---|
| Tab Expediente | timeline + composer + header con CTA propose | tres regiones apiladas | header apilado, composer con `Select`, cards full-width | `Stack` + `Paper` (patrón decisionHistory) |
| Panel de propuesta (REGION 1) | revisar/editar el borrador agéntico | `Paper` destacado sobre el timeline | mismo panel, acciones apiladas full-width | `Paper` + `GreenhouseChip` + `CustomTextField` |
| Dialog "Rechazar borrador" | decisión terminal con nota opcional | `Dialog maxWidth='sm'` | fullWidth con márgenes | MUI `Dialog` |
| Estado blind-locked | anti-anclaje server-enforced | `Alert` + timeline filtrado (solo notas propias + eventos) | idem | `Alert` |
| Snackbar | feedback de nota agregada / confirmado / rechazado | bottom | idem | `Snackbar` existente del view |

## Flow Map

```
 Application 360 (cualquier tab)
        │ click tab "Expediente" (o deep link ?tab=expediente / ?tab=activity)
        ▼
 ┌──────────────────────────────────────────────────────────────┐
 │ Tab Expediente (notas server-fed + GET /dossier al montar)   │
 └───┬───────────────┬──────────────────────┬───────────────────┘
     │               │                      │
 [viewer con     [Agregar nota]      [Generar análisis]
  scorecard          │                      │ (flag ON + capability)
  abierto]           ▼                      ▼
     │        POST /notes            POST /dossier {propose}
     ▼         (source='human')             │
 blind-locked        │              ┌───────┼──────────────┬──────────────┐
 (reader filtra;     ▼            201/200  409             409            5xx/502
  composer sí     nota entra    proposal  cv_not_ready   ai_disabled    error
  opera)        al timeline        │         │              │             │
                                   ▼         ▼              ▼             ▼
                          REGION 1 visible  Alert         caption      Alert error
                                   │        cvNotReady    aiDisabled   (retry si
                       ┌───────────┼───────────┐                       actionable)
                  [Editar]    [Confirmar]  [Rechazar]
                       │           │           │
                       ▼           │           ▼
                modo edición       │     Dialog rechazo
                (cuerpo local)     │           │
                       └─────►─────┤     [Rechazar borrador]
                                   ▼           ▼
                      POST /dossier        POST /dossier
                      {confirm,            {reject, decisionNote?}
                       editedBodyMd?}          │
                                   │           ▼
                                   ▼      proposal rejected
                      nota source='agent'  (panel desaparece;
                      entra al timeline;    decisión en el ledger)
                      panel desaparece
```

## Interaction Triggers

| Trigger | Origen | Efecto | Guarda |
|---|---|---|---|
| Click tab "Expediente" | tabs del view | muestra timeline (notas server-fed) + dispara `GET /dossier` | `hiring.application.read` ya gateó la page |
| Deep link `?tab=activity` | URL guardada | alias → tab Expediente | mapeo en `TAB_KEYS` |
| Seleccionar tipo + escribir | composer | habilita `Agregar nota` con cuerpo 1–8000 | contador espeja CHECK backend |
| Click "Agregar nota" | composer | `POST /notes`; optimista NO — la nota se agrega al confirmar 200 | capability annotate + cuerpo válido |
| Click "Generar análisis" | header | `POST /dossier {action:'propose'}`; CTA `aria-busy` | flag ON (`aiEnabled`) + capability annotate |
| Reintento de propose | header | mismo digest → misma propuesta (idempotente, sin costo LLM extra) | — |
| Click "Editar antes de confirmar" | panel | textarea precargada con `renderEvaluationDossierMarkdown` | proposal `proposed` |
| Click "Confirmar y agregar" | panel | `POST /dossier {action:'confirm', proposalId, editedBodyMd?}` | proposal `proposed`; doble click → 409 idempotente inofensivo |
| Click "Rechazar borrador" | panel | abre dialog; foco al Motivo | — |
| Click "Rechazar borrador" (dialog) | dialog | `POST /dossier {action:'reject', proposalId, decisionNote?}` | no hay request en vuelo |
| `Esc` / click-away | dialog | cierra sin decidir; foco al disparador | bloqueado durante request |
| Click "Ir a mi scorecard" | blind-locked | `setApplicationTab('assessment')` | — |
| Click "Ver más" | nota larga | expande colapso (`aria-expanded`) | — |

## State Machine

```
                       ┌─────────┐
        GET dossier ──►│  ready  │◄─────────── nota agregada / decisión aplicada
                       └──┬───┬──┘
        "Generar análisis"│   │ viewer con scorecard propio abierto (server)
                          ▼   ▼
                  ┌──────────┐ ┌──────────────┐
                  │ proposing│ │ blind-locked │ → submit del scorecard propio
                  └──┬───┬───┘ └──────────────┘   (en tab assessment) → ready
              201/200│   │ 409/5xx                 (al re-fetch)
                     ▼   ▼
        ┌────────────────┐ cv_not_ready → Alert cvNotReady (ready)
        │ proposal-active│ ai_disabled  → caption aiDisabled (ready)
        └──┬─────┬─────┬─┘ provider/schema error → Alert (retry si actionable)
     Editar│ Confirmar │Rechazar
           ▼     │     ▼
      ┌───────┐  │  ┌────────────┐
      │editing│──┘  │reject-dialog│─Esc→ proposal-active
      └───────┘     └─────┬──────┘
                          │ decidir (confirm/reject) → deciding (busy, terminal-once)
                          ▼
                    200 → ready (confirm: nota agent en timeline · reject: panel fuera)
                    409 hiring_dossier_invalid_transition → re-fetch GET (otro operador decidió)
```

Estados del timeline (independientes): `ready` · `empty` (composer visible) · `loading` (skeleton) ·
`error` (Alert + Reintentar; **nunca** "sin notas" si el reader falló) · `stale-proposal` (banner
`staleProposal` cuando el digest de la propuesta no coincide con el estado actual de fuentes).

## Routing Contract

- El tab Expediente **no cambia la ruta**: usa el estado de tabs existente con query param `?tab=` que la vista ya lee (`Application360View.tsx:348-350`). `expediente` reemplaza a `activity` en `TAB_KEYS`; `activity` queda como alias aceptado que selecciona `expediente` (links guardados no se rompen).
- El panel de propuesta y el dialog no empujan historia; `Esc` no afecta el back del browser.
- Sin deep link a una nota individual (el expediente se lee entero; anclas por nota son follow-up).
- "Ir a mi scorecard" es cambio de tab local (`setApplicationTab('assessment')`), no navegación.

## Focus & Accessibility

- Al entrar al tab: el foco permanece en el tab activo (patrón existente de la vista); el título del tab es el primer heading.
- Composer: label visible del tipo; `aria-describedby` al contador; error de validación `role='alert'`.
- "Generar análisis" con `aria-busy='true'` durante propose; el resultado (panel nuevo o Alert) se anuncia en `role='status' aria-live='polite'`.
- Dialog de rechazo: focus trap, foco inicial en Motivo, `Esc` cierra salvo request en vuelo, foco restaurado al botón "Rechazar borrador" del panel.
- Modo edición: el textarea recibe foco al entrar; "Cancelar edición" restaura el foco a "Editar antes de confirmar".
- Blind-locked: el `Alert` es `role='status'`; el contenido oculto NO existe en el DOM (viene filtrado del server), no hay nada que un lector de pantalla pueda filtrar.
- Notas colapsadas fuera del orden de tabulación hasta expandir.

## Data & Command Boundaries

| Pieza | Contrato | Dónde corre | Nota |
|---|---|---|---|
| Notas del expediente | `listHiringApplicationNotes(applicationId, viewerUserId)` — extensión viewer-aware de esta task | server (page) | `server-only`; el filtro anti-anclaje vive AQUÍ, no en la UI |
| Propuesta vigente + flag | `GET /api/hiring/applications/[id]/dossier` → `{aiEnabled, proposal, viewerBlindUntilScorecardSubmitted?, hiddenNoteCount?}` | ruta existente (TASK-1735) + delta viewer-aware | capability `hiring.application.read` |
| Propose | `POST .../dossier {action:'propose'}` → `proposeEvaluationDossier` | ruta existente | flag `HIRING_EVALUATION_DOSSIER_AI_ENABLED` + capability `hiring.application.annotate`; idempotente por digest |
| Confirm/Reject | `POST .../dossier {action:'confirm'\|'reject', proposalId, editedBodyMd?, decisionNote?}` → `confirmEvaluationDossier` | ruta existente | terminal-once FOR UPDATE; confirm materializa nota `source='agent'` en la MISMA tx |
| Nota manual | `POST .../notes` → `recordHiringApplicationNote` (fuerza `source='human'`) | ruta existente | capability annotate; append-only |
| Predicado anti-anclaje | mismo predicado de `listResponses`/`listPeerScorecardResults` (`src/lib/hiring/assessment/instances.ts:485-560`): scorecard propio ∉ {submitted, scored} | server (reader + GET dossier) | un solo predicado compartido, no dos implementaciones |
| Permiso de anotar | `can(tenant,'hiring.application.annotate','execute','tenant')` | server (page) → prop | la UI solo decide si dibuja affordances |

**Full API Parity:** la UI es un cliente más de los primitives de TASK-1735 (`src/lib/hiring/application-notes.ts` + `src/lib/hiring/dossier-ai/`). Nexa/MCP operan los mismos contratos por construcción; el delta viewer-aware del reader los protege igual (el filtro no es de esta pantalla, es del contrato).

## Failure Paths

| Falla | Detección | Comportamiento de UI | Recuperación |
|---|---|---|---|
| Reader de notas falla | excepción en la page | Alert `loadError` en el tab; el resto de la ficha sigue usable | Reintentar (reload del segmento) |
| Flag OFF | `aiEnabled=false` del GET | CTA propose no se dibuja; caption `aiDisabled`; notas manuales operan | prender flag (fuera de esta UI) |
| CV no listo | 409 `hiring_dossier_cv_not_ready` | Alert info `cvNotReady`; composer sigue operable | reintentar cuando el CV procese |
| Provider no configurado | 503 `hiring_dossier_provider_not_configured` | Alert error canónico | coordinar env (fuera de la UI) |
| Provider falla / output inválido | 502 `hiring_dossier_provider_error` / `hiring_dossier_output_invalid` | Alert error con Reintentar (`actionable=true`) | reintentar propose |
| Doble decisión (otro operador confirmó antes) | 409 `hiring_dossier_invalid_transition` | re-fetch del GET; el panel refleja el estado terminal + toast informativo | — |
| Propuesta ajena a la application | 404 `hiring_dossier_proposal_not_found` | Alert error; re-fetch | — |
| Capability revocada entre render y POST | 403 canónico | Alert `permissionDenied` sin Reintentar (`actionable=false`) | pedir permiso |
| Cuerpo de nota >8000 / vacío | validación cliente + backend (`hiring_note_invalid_body`) | contador en error + CTA disabled; backend re-valida | acortar |
| Red caída durante POST | error de fetch | Alert con Reintentar; **el texto escrito se conserva** en el estado local | Reintentar |
| Evaluador envía su scorecard en otra pestaña | estado blind obsoleto | el CTA "Ir a mi scorecard" + re-fetch al volver al tab muestran el expediente completo | — |

## GVC Scenario Plan

- Scenario file: `scripts/frontend/scenarios/task1737-application-expediente.yaml`
- Route: `/agency/hiring/applications/[applicationId]?tab=expediente` (seed determinista del wireframe)
- Viewports: 1440×900 + 390×844 · Quality profile `premium`
- Required steps: tab → timeline+panel → edición → cancelar → dialog rechazo → Esc → foco restaurado → composer → sesión evaluador blind-locked → mobile
- Required captures: `expediente-full`, `proposal-panel`, `proposal-edit`, `reject-dialog`, `composer`, `blind-lock`, `mobile-expediente`
- Required `data-capture` markers: `hiring-expediente-tab`, `hiring-expediente-proposal`, `hiring-expediente-composer`, `hiring-expediente-timeline`, `hiring-expediente-blind-lock`
- Assertions: en la sesión blind-locked el DOM NO contiene notas ajenas score-bearing ni el bloque proposal; `?tab=activity` renderiza el Expediente; sin errores de consola; `scrollWidth == clientWidth` en ambos viewports
- Reduced-motion / focus evidence: captura con `prefers-reduced-motion: reduce` + ciclo dialog abrir→Esc→foco

## Design Decision Log

- **DDL-1 — El expediente absorbe `activity`, no lo duplica.** Dos timelines en la misma ficha contarían la misma historia dos veces; los eventos sintéticos pasan a ser el contexto entre notas persistidas.
- **DDL-2 — La ceguera anti-anclaje es del reader.** Espejo estructural del blind sample de TASK-1734 (`review-reader.ts:90-97`): el server omite el contenido score-bearing para el evaluador con scorecard abierto; la UI solo renderiza el estado honesto con la salida ("Ir a mi scorecard"). Un filtro client-side sería anclaje con pasos extra.
- **DDL-3 — El bloqueo es fino, no total.** El evaluador bloqueado puede ANOTAR (su propio criterio no lo ancla) y ve eventos de etapa + notas propias + `general` ajenas; solo el juicio evaluativo ajeno y el análisis IA esperan su scorecard.
- **DDL-4 — Confirmar edita, no re-genera.** El humano edita el cuerpo ANTES de confirmar (`editedBodyMd`); la propuesta original queda inmutable en el ledger para medir drift (follow-up de TASK-1735). Regenerar es otra propuesta (digest nuevo) — la UI no mezcla ambos gestos.
- **DDL-5 — Estados del carril LLM con causa distinta, copy distinto.** `ai-off` (flag), `cv-not-ready` (fuente), `provider error` (transitorio) y `output invalid` (contrato) no se aplastan en un "no se pudo": cada uno dice qué hacer, y solo los transitorios ofrecen Reintentar.
- **DDL-6 — Sin optimistic UI en writes gobernados.** La nota y la confirmación aparecen cuando el server responde: en un expediente auditado, mostrar contenido no persistido sería mentirle al operador sobre qué existe.

## Acceptance Checklist

- [x] Cada superficie del flujo tiene su comportamiento desktop y mobile declarado.
- [x] La máquina de estados cubre éxito, error recuperable y error estructural.
- [x] El contrato de foco cubre apertura, cierre, restauración y bloqueo durante el command.
- [x] Las fronteras de datos nombran reader, command, capability y dónde corre cada uno.
- [x] Los failure paths distinguen `actionable=true` de `actionable=false` según el contrato canónico de errores.
- [x] El flujo referencia el master UI flow del programa y declara qué nodo extiende (N5).
- [x] El GVC plan es ejecutable sin re-decidir arquitectura.
