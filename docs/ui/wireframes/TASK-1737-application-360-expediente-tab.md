# TASK-1737 / Application 360 — Tab Expediente (timeline de notas + análisis agéntico confirmable)

## Meta

- Status: `contract-ready` (dirección visual del design studio pendiente — `UI ready: no` en la task)
- Owner task: `TASK-1737 — Application 360: tab Expediente (consumer UI del Evaluation Dossier de TASK-1735)`
- Product Design asset: **pendiente** — no existe todavía una dirección visual versionada del design studio para esta superficie. Este wireframe fija el contrato de regiones/estados/copy/datos; la task mantiene `UI ready: no` hasta que `greenhouse-ai-design-studio` persista la dirección (2–3 direcciones comparadas + asset duradero) y se complete el Visual Direction Contract.
- Visual direction mode: `repo-native-benchmark` (propuesto): la composición hereda el vocabulario aprobado de la Application 360 (TASK-355/1422/1715 — frame, tabs, filas con icon-tile, chips de estado) y el timeline vertical ya usado en `decisionHistory`; el panel de propuesta IA hereda el patrón "Sugerencia de IA · revísala antes de confirmar" del drawer de corrección (TASK-1363/1361).
- Intended consumers: reclutador / hiring manager / People Ops con `hiring.application.read` (leer) y tier gobernanza con `hiring.application.annotate` (anotar/proponer/confirmar) en `/agency/hiring/applications/[applicationId]`.
- Copy source: `src/lib/copy/dictionaries/{es-CL,en-US}/hiringDesk.ts` → namespace **nuevo** `application.expediente.*` + reuso de `common.*`. Tono validado con `greenhouse-ux-writing`.
- Primitive decision: **reuse total** — MUI `Timeline`-like con `Stack` + `Paper variant='outlined'` (patrón decisionHistory), `GreenhouseChip kind='status'`, `GreenhouseButton`, `CustomTextField` (composer), `Dialog` (rechazo con nota), `Alert`, `Skeleton`, `Snackbar`. CERO primitives nuevas.
- UI ready target: `no` (sube a `yes` solo con dirección visual persistida + GVC plan ejecutado en seco)

## Brief

- Primary user: el operador de Hiring que evalúa a UNA candidatura y necesita que el criterio de evaluación (análisis CV↔assessment, notas de entrevista, correcciones) viva en la ficha y no en chats efímeros.
- User moment: entró a la Application 360 después de que el candidato rindió el assessment (o antes de una entrevista) y quiere (a) leer el expediente acumulado, (b) registrar una nota tipada, (c) disparar el análisis agéntico y confirmarlo/edítarlo/rechazarlo.
- Job to be done: convertir el tab `activity` sintético (timeline derivado sin persistencia, `Application360View.tsx:1253-1268`) en el **Expediente real**: notas persistidas (`listHiringApplicationNotes`) intercaladas con los eventos de etapa, más el flujo `propose → confirm` del dossier (TASK-1735) operable sin salir de la ficha.
- Primary decision signal: el operador llega a la entrevista/decisión con el análisis confirmado visible en la ficha; ninguna evaluación vuelve a armarse a mano en un chat.
- Non-goals: editar/borrar notas (append-only; corrección = nota nueva con `supersedesNoteId`); exponer notas al candidato o al review packet MCP (excluidas por contrato TASK-1718); scoring de respuestas (dueño TASK-1361/1734 — el dossier LEE scores); trigger automático del propose (V1 on-demand); proyección person-scoped (People 360 es TASK-1732/1733).

## Decisión de anclaje (la que TASK-1735 dejó abierta)

TASK-1735 §Superficie UI declaró dos opciones: (a) tab nuevo "Expediente" o (b) convertir `activity` en el expediente real. **Este contrato elige (b): el tab `activity` se convierte en `expediente`** (label visible "Expediente"), por tres razones:

1. La vista ya tiene 5 tabs; un sexto agrega chrome para separar dos cosas que el operador lee juntas (qué pasó + qué se concluyó).
2. El `activity` actual es un timeline SINTÉTICO sin persistencia (derivado de createdAt/stage/decisionHistory) — no hay contenido que preservar, solo eventos que se re-renderizan como contexto entre notas.
3. El expediente ES un timeline: notas con timestamp intercaladas con los hitos de etapa cuentan una sola historia evaluativa.

Compatibilidad de deep-link: `?tab=activity` se mapea a `expediente` (alias en `TAB_KEYS`); los links guardados no se rompen.

## Layout Skeleton

### Tab Expediente — tres regiones apiladas

```
┌ Application 360 · tab Expediente ──────────────────────────────────────────┐
│ Expediente de evaluación                       [✦ Generar análisis]        │
│ Notas tipadas y análisis confirmado por humanos.                           │
│ Nada de esto llega al candidato.                                           │
│                                                                            │
│ {si el viewer tiene scorecard propio abierto → REGION LOCK, ver abajo}     │
│                                                                            │
│ ┌ REGION 1 · Borrador del análisis (solo si proposal status='proposed') ─┐ │
│ │ [chip IA] Borrador del análisis · pendiente de tu confirmación         │ │
│ │ claude-sonnet-5 · hiring_evaluation_dossier.v1 · propuesto 16 ago      │ │
│ │ ── Resumen ejecutivo ──────────────────────────────────────────────    │ │
│ │ ── Coherencias CV ↔ assessment (con evidencia citada por afirmación)   │ │
│ │ ── Gaps y red flags (con evidencia) ────────────────────────────────   │ │
│ │ ── Focos sugeridos para la entrevista ──────────────────────────────   │ │
│ │ ── No verificable con las fuentes ──────────────────────────────────   │ │
│ │ [Editar antes de confirmar] [Rechazar borrador] [Confirmar y agregar]  │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│ ┌ REGION 2 · Composer de nota manual ───────────────────────────────────┐  │
│ │ Tipo: (Análisis de CV | Revisión de assessment | Nota de entrevista |  │  │
│ │        General)   ← ToggleButtonGroup / Select                         │  │
│ │ [CustomTextField multiline rows=4  ·  contador {count}/8000]           │  │
│ │                                              [Agregar nota]            │  │
│ └────────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│ REGION 3 · Timeline (más reciente primero)                                 │
│  ●  [chip Revisión de assessment] [chip IA·confirmada]  16 ago · Julio R.  │
│  │   ## Resumen ejecutivo … (markdown render, colapsable si >600 chars)    │
│  │   ⓘ provenance: claude-sonnet-5 · digest a1b2… · confirmada por J.R.    │
│  ●  [evento de etapa] Pasó a "Entrevista" · 15 ago            ← sintético  │
│  ●  [chip Nota de entrevista]  14 ago · M. Borralles                       │
│  │   texto de la nota…                                                     │
│  ●  [evento] Postulación recibida · 12 ago                    ← sintético  │
└────────────────────────────────────────────────────────────────────────────┘
```

- Las notas persistidas y los eventos sintéticos de etapa se distinguen tipográficamente: nota = `Paper variant='outlined'` con cuerpo markdown; evento = línea ligera `body2 text.secondary` sin card. El evento nunca simula ser una nota.
- REGION 1 solo existe con una propuesta `proposed` vigente (`GET /api/hiring/applications/[id]/dossier` → `proposal.status === 'proposed'`). Una propuesta `rejected` no renderiza panel (la decisión quedó en el ledger); una `confirmed` ya vive como nota en el timeline.
- El botón `Generar análisis` usa la marca IA del patrón existente (ícono sparkle del drawer TASK-1363), NUNCA promete automatismo: el subtítulo del panel dice explícito que un humano confirma.

### Region LOCK — anti-anclaje (gate BLOQUEANTE del Delta (3) de TASK-1735)

Cuando el viewer es evaluador con **scorecard propio abierto** para esta application (existe `hiring_assessment` `method='interviewer_scorecard'` con `evaluator_user_id = viewer` y status ∉ {`submitted`,`scored`} — el MISMO predicado de `listResponses`/`listPeerScorecardResults` en `src/lib/hiring/assessment/instances.ts:485-560`), el servidor NO entrega el contenido score-bearing y la UI muestra:

```
┌ REGION LOCK ───────────────────────────────────────────────────────────────┐
│ [🔒] Expediente parcialmente bloqueado                                     │
│ Para no anclar tu evaluación, el análisis IA y las notas con puntajes      │
│ se muestran cuando envíes tu propio scorecard.                             │
│ {n} notas quedarán visibles al enviar.        [Ir a mi scorecard →]        │
└────────────────────────────────────────────────────────────────────────────┘
  (debajo: composer operativo + timeline SOLO con las notas propias del
   viewer + eventos sintéticos de etapa — puede anotar, no puede leer juicio ajeno)
```

- **La ceguera la garantiza el reader, no la UI** (lección estructural del blind sample de TASK-1734, `review-reader.ts:90-97`): `listHiringApplicationNotes` gana un parámetro `viewerUserId` y, bajo el predicado, omite del payload las notas con `kind ∈ {cv_analysis, assessment_review, interview_note}` de OTROS autores y toda nota `source='agent'`; `GET /dossier` responde `proposal: null` + `viewerBlindUntilScorecardSubmitted: true` con contador `hiddenNoteCount`. Las notas propias del viewer y las `general` ajenas siempre pasan.
- Esto resuelve también la Open Question de TASK-1735 sobre `interview_note` cross-evaluador pre-submit: conservador, ocultas hasta cerrar el scorecard propio.
- El operador sin scorecard asignado (reclutador/People Ops) no activa el predicado: ve el expediente completo.

### Panel de edición del borrador (Editar antes de confirmar)

```
┌ REGION 1 en modo edición ────────────────────────────────────┐
│ [CustomTextField multiline — markdown render del borrador     │
│  precargado (renderEvaluationDossierMarkdown), editable,      │
│  contador {count}/8000]                                       │
│ caption: "La propuesta original queda inmutable en el ledger; │
│           lo que confirmes es lo que entra al expediente."    │
│ [Cancelar edición]                [Confirmar y agregar]       │
└───────────────────────────────────────────────────────────────┘
```

### Dialog de rechazo

```
┌ Dialog "Rechazar borrador" ──────────────────────┐
│ El borrador no se agregará al expediente.        │
│ Motivo (opcional)                                │
│ [CustomTextField multiline rows=3]               │
│              [Cancelar]  [Rechazar borrador]     │
└──────────────────────────────────────────────────┘
```

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| 0 | Header del tab | título + promesa internal-only + CTA propose | `Typography` + `GreenhouseButton` | copy `application.expediente.*` |
| 1 | Panel de propuesta | borrador estructurado + provenance + acciones | `Paper variant='outlined'` + `GreenhouseChip` | `GET /api/hiring/applications/[id]/dossier` |
| 1b | Modo edición | editar cuerpo antes de confirmar | `CustomTextField multiline` | `renderEvaluationDossierMarkdown(draft)` precargado |
| 1c | Dialog rechazo | decisión terminal con nota opcional | `Dialog` + `CustomTextField` | `POST .../dossier {action:'reject'}` |
| 2 | Composer | nota manual tipada | `Select`/`ToggleButtonGroup` + `CustomTextField` | `POST /api/hiring/applications/[id]/notes` |
| 3 | Timeline | notas + eventos de etapa intercalados | `Stack` timeline (patrón decisionHistory) | `listHiringApplicationNotes` (page server) + item.application (etapas) |
| 3b | Provenance de nota agent | modelo/prompt/digest/confirmador | `Tooltip`/`Popover` + `body2` | `note.contextJson.{model,promptVersion,inputDigest,dossierProposalId}` |
| LOCK | Estado anti-anclaje | bloqueo honesto + salida a scorecard | `Alert` + `GreenhouseButton` | `viewerBlindUntilScorecardSubmitted` + `hiddenNoteCount` |
| 4 | Errores | fallo de reader/command | `Alert severity='error'` | `CanonicalApiError` (`code` + `actionable`) |

## Desktop Target

A **1440×900** el tab hereda el canvas del frame de la Application 360 (sin card-on-card). El header
de región usa `Typography variant='h5'` + subtítulo `body2 text.secondary`; el CTA `Generar análisis`
vive alineado a la derecha del header (única acción primaria del tab). REGION 1 (cuando existe) es un
`Paper variant='outlined'` con `borderLeft` acentuado en el token de IA ya usado por el drawer de
sugerencias — un solo momento visual dominante. El composer es compacto (una fila de tipo + textarea);
el timeline ocupa el resto con línea vertical `divider` y nodos de 8px. Ancho de contenido heredado
del tab (sin `maxInlineSize` propio).

## Mobile Target

A **390×844** el header apila título arriba y CTA `fullWidth` debajo; el selector de tipo del composer
pasa a `Select` (los toggles no caben); las cards de nota van a ancho completo con metadatos apilados
(chips arriba, autor/fecha debajo — nunca en la misma línea que el chip, overlap ya visto en TASK-1422).
Las acciones del panel de propuesta se apilan `fullWidth` con `Confirmar` al final (posición terminal =
acción principal). `scrollWidth == clientWidth` es assertion del GVC en este viewport.

## Action Hierarchy

| Nivel | Acción | Peso visual | Ubicación | Razón |
|---|---|---|---|---|
| 1 — primaria | **Generar análisis** | `GreenhouseButton` primario + sparkle | header del tab | el momento smart de TASK-1735; visible solo con `hiring.application.annotate` |
| 1 — primaria (contextual) | **Confirmar y agregar** | botón primario del panel | REGION 1 | es el único write que materializa el borrador (confirm gobernado) |
| 2 — secundaria | **Editar antes de confirmar** | `variant='outlined'` | REGION 1 | edición humana esperada; no compite con confirmar |
| 2 — secundaria | **Agregar nota** | `variant='outlined'` | composer | trabajo frecuente pero silencioso |
| 3 — excepcional | **Rechazar borrador** | `variant='text'` + `color='error'` | REGION 1 | decisión terminal; el dialog agrega la fricción |
| 0 — sin acción | eventos sintéticos de etapa | texto plano | timeline | contexto, no contenido operable |

## Visual Fidelity Mapping

| Intención de diseño | Implementación tokenizada | Prohibido |
|---|---|---|
| Panel de propuesta IA | `Paper variant='outlined'` + acento con token del patrón IA existente | HEX literal; gradiente "mágico" nuevo |
| Chips de kind | `GreenhouseChip kind='status' variant='label'` — cv_analysis `info` · assessment_review `primary` · interview_note `warning` · general `default` | `Chip` MUI crudo con `sx bgcolor` |
| Chip fuente agent | `GreenhouseChip … tone='secondary'` + ícono sparkle + texto "IA · confirmada" | color como único portador (siempre ícono+texto) |
| Cuerpo markdown de nota | render markdown sanitizado con estilos de `Typography` del tema | `dangerouslySetInnerHTML` sin sanitizar; `fontSize` inline |
| Línea del timeline | `borderInlineStart: 1` + `borderColor: 'divider'` + nodo 8px con token | `<hr>`/HEX; librería de timeline nueva |
| Colapso de nota larga | clamp + "Ver más" accesible (`aria-expanded`) | truncado con `…` sin expansión |
| Lock anti-anclaje | `Alert severity='info'` + ícono candado + CTA de salida | esconder el tab completo sin explicación (degradación deshonesta) |
| Espaciado | escala `4n` del tema | píxeles arbitrarios |
| Motion | transiciones por defecto de Dialog/Collapse; `prefers-reduced-motion` las desactiva | animar la aparición del borrador IA |

## Copy Ledger (`hiringDesk.application.expediente.*`, bilingüe es-CL + en-US)

| Copy id | Region | Text es-CL | Dynamic values | Notes |
|---|---|---|---|---|
| `expediente.tabLabel` | tabs | Expediente | — | reemplaza el label "Actividad" |
| `expediente.title` | 0 | Expediente de evaluación | — | |
| `expediente.subtitle` | 0 | Notas tipadas y análisis confirmado por humanos. Nada de esto llega al candidato. | — | promesa internal-only honesta |
| `expediente.generate` | 0 | Generar análisis | — | sparkle; solo con capability annotate |
| `expediente.generating` | 0 | Generando el borrador… | — | CTA `aria-busy` |
| `expediente.aiDisabled` | 0 | La generación con IA está apagada en este entorno. Puedes registrar notas manuales. | — | `aiEnabled=false` del GET; CTA no se dibuja |
| `expediente.cvNotReady` | 0 | El análisis necesita el CV procesado y aún no está listo. Puedes registrar notas manuales mientras tanto. | — | 409 `hiring_dossier_cv_not_ready` |
| `expediente.proposalTitle` | 1 | Borrador del análisis · pendiente de tu confirmación | — | chip IA adyacente |
| `expediente.proposalProvenance` | 1 | {model} · {promptVersion} · propuesto {date} | `model`,`promptVersion`,`date` | |
| `expediente.sectionSummary` | 1 | Resumen ejecutivo | — | heading del draft |
| `expediente.sectionCoherences` | 1 | Coherencias CV ↔ assessment | — | |
| `expediente.sectionGaps` | 1 | Gaps y red flags | — | |
| `expediente.sectionInterviewFocus` | 1 | Focos sugeridos para la entrevista | — | |
| `expediente.sectionUnverifiable` | 1 | No verificable con las fuentes | — | sección de honestidad del draft |
| `expediente.evidenceLabel` | 1 | Evidencia: {quote} | `quote` | por afirmación |
| `expediente.edit` | 1 | Editar antes de confirmar | — | |
| `expediente.editCaption` | 1b | La propuesta original queda inmutable en el ledger; lo que confirmes es lo que entra al expediente. | — | |
| `expediente.cancelEdit` | 1b | Cancelar edición | — | descarta cambios locales, no el borrador |
| `expediente.confirm` | 1 | Confirmar y agregar al expediente | — | write gobernado |
| `expediente.confirming` | 1 | Confirmando… | — | |
| `expediente.confirmed` | 1 | Análisis agregado al expediente. | — | toast |
| `expediente.reject` | 1 | Rechazar borrador | — | abre dialog |
| `expediente.rejectDialogTitle` | 1c | Rechazar borrador | — | |
| `expediente.rejectDialogBody` | 1c | El borrador no se agregará al expediente. La propuesta queda registrada como rechazada. | — | |
| `expediente.rejectReasonLabel` | 1c | Motivo (opcional) | — | `decisionNote` |
| `expediente.rejectConfirm` | 1c | Rechazar borrador | — | |
| `expediente.rejected` | 1c | Borrador rechazado. | — | toast |
| `expediente.composerKindLabel` | 2 | Tipo de nota | — | |
| `expediente.kindCvAnalysis` | 2/3 | Análisis de CV | — | chip + opción |
| `expediente.kindAssessmentReview` | 2/3 | Revisión de assessment | — | |
| `expediente.kindInterviewNote` | 2/3 | Nota de entrevista | — | |
| `expediente.kindGeneral` | 2/3 | General | — | |
| `expediente.composerPlaceholder` | 2 | Registra el criterio con el contexto necesario para quien decida después… | — | |
| `expediente.composerCount` | 2 | {count}/8000 | `count` | espeja CHECK del backend |
| `expediente.addNote` | 2 | Agregar nota | — | |
| `expediente.addingNote` | 2 | Guardando… | — | |
| `expediente.noteAdded` | 2 | Nota agregada al expediente. | — | toast |
| `expediente.agentBadge` | 3 | IA · confirmada | — | chip de `source='agent'` |
| `expediente.agentProvenance` | 3b | Generada con {model} y confirmada por {name}. Digest {digest}. | `model`,`name`,`digest` | popover |
| `expediente.stageEvent` | 3 | Pasó a "{stage}" | `stage` | evento sintético |
| `expediente.receivedEvent` | 3 | Postulación recibida | — | evento sintético |
| `expediente.decisionEvent` | 3 | Decisión registrada: {decision} | `decision` | evento sintético read-only |
| `expediente.empty` | 3 | Aún no hay notas en el expediente. | — | + composer visible |
| `expediente.emptyReadOnly` | 3 | Aún no hay notas en el expediente. | — | sin capability annotate: sin CTA |
| `expediente.showMore` | 3 | Ver más | — | colapso accesible |
| `expediente.showLess` | 3 | Ver menos | — | |
| `expediente.blindTitle` | LOCK | Expediente parcialmente bloqueado | — | |
| `expediente.blindBody` | LOCK | Para no anclar tu evaluación, el análisis IA y las notas con puntajes se muestran cuando envíes tu propio scorecard. | — | |
| `expediente.blindCount` | LOCK | {count} notas quedarán visibles al enviar. | `count` | `hiddenNoteCount` |
| `expediente.blindCta` | LOCK | Ir a mi scorecard | — | salta al tab assessment |
| `expediente.loadError` | 4 | No pudimos cargar el expediente. | — | + Reintentar (`actionable=true`) |
| `expediente.permissionDenied` | 4 | No tienes permiso para anotar este expediente. Pídeselo a Admin o a People Ops. | — | `actionable=false` → sin Reintentar |
| `expediente.staleProposal` | 1 | Este borrador quedó desactualizado (las fuentes cambiaron). Genera un análisis nuevo. | — | digest de la propuesta ≠ digest actual |

(en-US mirror con las mismas keys.)

## State Copy

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| ready | Expediente de evaluación | timeline + composer (+ panel si hay proposal `proposed`) | Generar análisis / Agregar nota | default |
| loading | — | `Skeleton` con forma de 3 cards de nota | — | server render + Suspense del tab |
| empty | — | `empty` + composer | Agregar nota / Generar análisis | primera nota del expediente |
| ai-off | — | `aiDisabled` como caption bajo el header | solo notas manuales | el CTA propose NO se dibuja (`aiEnabled=false`) |
| cv-not-ready | — | `cvNotReady` como Alert info tras intentar propose | notas manuales | 409 canónico `hiring_dossier_cv_not_ready` |
| proposing | — | CTA en `aria-busy`, panel skeleton | — | idempotente: reintento devuelve la misma propuesta |
| proposal-active | Borrador del análisis | panel REGION 1 completo | Editar / Rechazar / Confirmar | `proposal.status='proposed'` |
| confirming/rejecting | — | CTA busy, panel bloqueado | — | terminal-once; doble click inofensivo (409 idempotente) |
| blind-locked | Expediente parcialmente bloqueado | LOCK region; composer + notas propias visibles | Ir a mi scorecard | server-enforced; ver Region LOCK |
| permission-denied (annotate) | — | composer y CTAs no se dibujan; caption `emptyReadOnly` | — | lectura sigue operando con `hiring.application.read` |
| error | — | `loadError` / error canónico del command | Reintentar si `actionable=true` | nunca "sin notas" cuando el reader falló |
| long content | — | notas colapsadas con Ver más | — | clamp accesible |
| mobile | — | header apilado, composer Select, cards full-width | — | 390px sin scroll horizontal |
| keyboard / focus | — | foco visible; dialog con focus trap y restore | — | ver Accessibility Contract |
| reduced motion | — | sin transiciones de Collapse/Dialog | — | guard existente del frame |

## Accessibility Contract

- Heading order: h1 del frame → `h5` "Expediente de evaluación" → headings del draft como `h6`/`subtitle`.
- El timeline es `<ol role='list'>` con `<li>` por entrada; cada nota tiene nombre accesible "{kind} de {autor}, {fecha}".
- El chip de kind y el badge IA siempre acompañados de texto (nunca solo color/ícono).
- `Generar análisis` con `aria-busy` durante propose; resultado anunciado en `role='status' aria-live='polite'`.
- Dialog de rechazo: focus trap, foco inicial en el campo Motivo, `Esc` cierra salvo request en vuelo, foco restaurado al disparador.
- El colapso "Ver más" usa `aria-expanded` + `aria-controls`; el contenido colapsado no queda en el orden de tabulación.
- Estado LOCK: `Alert` con `role='status'`; el contador de notas ocultas es texto, no solo badge.
- Composer: label visible para el tipo, `aria-describedby` al contador; error de longitud con `role='alert'`.
- Targets ≥24px; `scrollWidth == clientWidth` en 1440 y 390.

## Implementation Mapping

- Route / surface: `/agency/hiring/applications/[applicationId]` tab `expediente` (rename de `activity`; alias `?tab=activity` → `expediente`) — page `src/app/(dashboard)/agency/hiring/applications/[applicationId]/page.tsx` + `src/views/greenhouse/hiring/Application360View.tsx` (extraer `ApplicationDossierPanel` route-local en `src/views/greenhouse/hiring/`, patrón `CandidateDocumentsPanel` de TASK-1715 — el view ya supera 1.400 líneas).
- Primitive / variant / kind: reuse (`Paper variant='outlined'`, `GreenhouseChip kind='status'`, `GreenhouseButton`, `CustomTextField`, `Dialog`, `Alert`, `Snackbar`, `Skeleton`). Sin kinds nuevos.
- Component candidates: `ApplicationDossierPanel` (client, estado de composer/propose/confirm) + render markdown sanitizado reutilizando el helper markdown existente del repo si lo hay (confirmar en Discovery; si no, render minimal propio sin dependencia nueva).
- Copy source: `getMicrocopy(locale).hiringDesk.application.expediente` (namespace nuevo es-CL + en-US + delta en `HiringDeskCopy`).
- Data reader / command: notas server-side en la page vía `listHiringApplicationNotes(applicationId, viewerUserId)` (extensión viewer-aware de esta task, `src/lib/hiring/application-notes.ts`); dossier vía `GET /api/hiring/applications/[id]/dossier`; propose/confirm/reject vía `POST .../dossier` (`proposeEvaluationDossier`/`confirmEvaluationDossier`, TASK-1735); nota manual vía `POST .../notes` (`recordHiringApplicationNote`, fuerza `source='human'`).
- API parity: la UI es cliente delgado de los primitives de TASK-1735; cero lógica de negocio en el componente. El gate anti-anclaje vive en el reader (server), no en el cliente.
- Access / capability: viewCode `gestion.hiring_application_detail` + `hiring.application.read` (leer) ya gatean la page; `hiring.application.annotate` (tier gobernanza) resuelta server-side y pasada como prop booleana — sin capability, composer y CTAs no se dibujan.
- States to implement: ready · loading · empty · ai-off · cv-not-ready · proposing · proposal-active · stale-proposal · confirming/rejecting · blind-locked · permission-denied · error · long content · mobile · keyboard · reduced-motion.
- GVC markers: `data-capture='hiring-expediente-tab'`, `data-capture='hiring-expediente-proposal'`, `data-capture='hiring-expediente-composer'`, `data-capture='hiring-expediente-timeline'`, `data-capture='hiring-expediente-blind-lock'`.

## GVC Scenario Plan

- Scenario file: `scripts/frontend/scenarios/task1737-application-expediente.yaml` (nuevo).
- Route: `/agency/hiring/applications/[applicationId]` `?tab=expediente`, seed determinista: application con CV ready, assessment corregido, 2 notas humanas (interview_note + general), 1 nota agent confirmada con provenance, 1 propuesta `proposed` vigente, y una segunda sesión con persona evaluadora de scorecard abierto para el estado blind-locked.
- Viewports: desktop 1440×900 + mobile 390×844.
- Quality profile: `premium`.
- Required steps: entrar al tab → capturar timeline+panel → abrir modo edición → cancelar → abrir dialog de rechazo → cerrar con Esc (foco restaurado) → capturar composer con contador → sesión evaluador: capturar blind-locked → mobile.
- Required captures: `expediente-full`, `proposal-panel`, `proposal-edit`, `reject-dialog`, `composer`, `blind-lock`, `mobile-expediente`.
- Required `data-capture` markers: los 5 de Implementation Mapping.
- Assertions: el tab se llama "Expediente"; el panel muestra la sección "No verificable con las fuentes"; en la sesión blind-locked NO existe en el DOM ninguna nota ajena score-bearing (assertion sobre el HTML, no sobre CSS); sin errores de consola; `scrollWidth == clientWidth` en ambos viewports.
- Scroll-width checks: tab base, panel en edición y dialog abierto (desktop + 390px).
- Reduced-motion / focus evidence: captura con `prefers-reduced-motion: reduce`; ciclo abrir dialog→Esc→foco restaurado.
- Review dossier: `pnpm fe:capture:review task1737-application-expediente`.
- Baseline decision / surface ID: superficie renombrada dentro de vista existente → baseline nuevo para el tab Expediente; el resto de la Application 360 conserva su baseline vigente.

## Design Decision Log

- Decision: **convertir `activity` en el Expediente real** (timeline persistido + eventos sintéticos como contexto) en vez de un sexto tab.
- Alternatives considered:
  - (a) *Tab nuevo "Expediente" conservando "Actividad"* — descartado: dos timelines paralelos en la misma ficha cuentan la misma historia dos veces y suben el chrome a 6 tabs; el `activity` actual no persiste nada que haya que preservar.
  - (b) *Drawer lateral de notas sobre cualquier tab* — descartado: el expediente es lectura larga (análisis con evidencia citada); un drawer lo degrada a chat y pierde el intercalado con etapas.
  - (c) *Ocultar el expediente completo bajo el gate anti-anclaje* — descartado: bloquear TODO impide al evaluador anotar su propia entrevista; el bloqueo fino (score-bearing ajeno + agent) preserva el trabajo propio sin filtrar juicio ajeno.
  - (d) *Enforzar el anti-anclaje solo en la UI* — descartado por la lección estructural del blind sample de TASK-1734: la ceguera la garantiza el reader; una UI futura (o Nexa/MCP) no puede re-filtrarla mal.
- Why this pattern: el timeline con cards outlined es el vocabulario ya aprobado del decisionHistory y del desk; el panel propose→confirm hereda el patrón "Sugerencia de IA · revísala antes de confirmar" que el operador ya conoce del drawer de corrección.
- Reuse / extend / new primitive: **reuse total**; `ApplicationDossierPanel` es composición route-local.
- Open risks: (1) resolución de nombre del autor (`author_user_id` → display name) — confirmar en Discovery qué reader de identidad ya usa la page; fallback honesto al id nunca un "Usuario desconocido" mudo. (2) El render markdown debe sanitizar (cuerpo puede citar texto del CV = texto no confiable). (3) El alias `?tab=activity` debe cubrirse con test para no romper links guardados.
- Follow-up: proyección person-scoped del expediente para People 360 (TASK-1732/1733); trigger reactivo del propose post-assessment (follow-up declarado en TASK-1735).

## Acceptance Checklist

- [x] All visible strings are in the copy ledger.
- [x] Dynamic values are named and bounded (`count`, `model`, `promptVersion`, `date`, `name`, `digest`, `stage`, `decision`, `quote`).
- [x] Partial/degraded states are explicit (ai-off / cv-not-ready / blind-locked / stale / permission denied / error).
- [x] No copy implies a guarantee when data is estimated — la sección "No verificable" del draft se renderiza SIEMPRE que exista.
- [x] Charts have table/text alternatives (n/a — sin charts).
- [x] State and aria copy is ready for implementation.
- [x] Implementation mapping names primitive, copy source, data contract and route/surface.
- [x] GVC scenario plan is specific enough for `pnpm fe:capture`.
- [x] Design decision log explains reuse/extend/new before JSX starts.
