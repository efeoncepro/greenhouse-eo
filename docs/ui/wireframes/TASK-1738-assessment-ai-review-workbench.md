# TASK-1738 / Assessment AI — Workbench de revisión del run de scoring (coverage honesto + muestra ciega)

## Meta

- Status: `contract-ready` (dirección visual del design studio pendiente — `UI ready: no` en la task)
- Owner task: `TASK-1738 — Workbench de revisión del scoring IA (consumer UI del run aggregate de TASK-1734)`
- Product Design asset: **pendiente** — no existe dirección visual versionada para esta superficie. Este wireframe fija el contrato de regiones/estados/copy/datos; la task mantiene `UI ready: no` hasta que `greenhouse-ai-design-studio` persista la dirección comparada y se complete el Visual Direction Contract.
- Visual direction mode: `repo-native-benchmark` (propuesto): hereda el frame de la Application 360 (TASK-355/1363), el patrón de cola de corrección existente ("Respuestas por corregir") y el vocabulario "Sugerencia de IA · revísala antes de confirmar" del drawer per-response (TASK-1361/1363), elevado a nivel de run.
- Intended consumers: operador interno con `hiring.assessment.score` (la autoridad que aplica scores es la que revisa la cola — mismo tier del confirm, `scoring-runs/[runId]/route.ts`). CERO superficie candidate-facing.
- Copy source: `src/lib/copy/dictionaries/{es-CL,en-US}/hiringAssessment.ts` → namespace **nuevo** `scoringRun.*` + reuso de `review.*` y `common.*`. Tono validado con `greenhouse-ux-writing`.
- Primitive decision: **reuse total** — `Dialog fullScreen`-like (`maxWidth='lg'` alto 90vh, patrón visor TASK-1715), `Paper variant='outlined'`, `GreenhouseChip kind='status'`, `GreenhouseButton`, `CustomTextField`, `Alert`, `Skeleton`, `Snackbar`, `Accordion`/`Collapse` para evidencia por criterio. CERO primitives nuevas. La cola es lista de filas (patrón queue existente), no tabla >8 columnas — `DataTableShell` no aplica.
- UI ready target: `no`

## Brief

- Primary user: el operador que antes corregía 700 respuestas a mano y hoy debe revisar un run IA: cerrar excepciones obligatorias, puntuar la muestra ciega y confirmar el conjunto elegible con evidencia — sin rubber-stamp.
- User moment: el assessment de un candidato fue enviado y el run asíncrono (TASK-1734) propuso scores con routing de riesgo. El operador abre el workbench desde el tab Evaluación de la Application 360 para revisar ese run exacto.
- Job to be done: (1) entender de un vistazo la cobertura HONESTA del run (qué está propuesto, qué abstuvo, qué volvió a manual, si el digest quedó stale); (2) resolver excepciones `mandatory_review` una a una con la evidencia por criterio; (3) puntuar la muestra `quality_sample` A CIEGAS; (4) confirmar el run cuando los gates cierran — o cancelarlo.
- Primary decision signal: el manifest de confirmación registra revisión real (excepciones resueltas, muestra puntuada, `sawProposalBeforeScoring` veraz), no un "aceptar todo" ciego.
- Non-goals: mostrar cualquier resultado al candidato (contrato anti-leak de TASK-1734); rankear/decidir/mover etapa; editar preguntas/rúbricas; iniciar runs (los crea el consumer del evento `hiring.assessment.submitted`); reemplazar de inmediato el drawer per-response (convive — ver Design Decision Log).

## Layout Skeleton

### Entrada — tab Evaluación de la Application 360

```
┌ Card del assessment (tab Evaluación, existente) ───────────────────────────┐
│ Test del candidato · Corregido parcial                                     │
│ … (contenido existente sin cambios) …                                      │
│ [chip ✦ Run IA: en revisión · 3 excepciones]   [Abrir revisión del run →]  │
└────────────────────────────────────────────────────────────────────────────┘
```

- El chip + botón solo se dibujan si `GET /api/hiring/assessments/ai/scoring-runs?assessmentId=` retorna runs (ruta colección delgada nueva sobre `listAssessmentAiScoringRuns`) y el viewer tiene `hiring.assessment.score`. Sin run → el tab queda EXACTAMENTE como hoy.

### Workbench — diálogo de revisión del run (maxWidth='lg', 90vh)

```
┌ Revisión del run IA · EO-ASM-#### ────────────────────────────── [✕] ──────┐
│ run `awaiting_review` · modelo claude-sonnet-5 · policy v1 · 16 ago        │
│                                                                            │
│ ┌ REGION 1 · Cobertura honesta ────────────────────────────────────────┐   │
│ │ [4 propuestos por confirmar]  [3 excepciones: 1 resuelta / 2 pend.]  │   │
│ │ [1 muestra ciega pendiente]   [2 devueltos a corrección manual]      │   │
│ │ [0 aún puntuando]             [1 cerrado sin propuesta]              │   │
│ │ {si digestStale} ⚠ Banner: "Las fuentes cambiaron después del run.   │   │
│ │  Este run no se puede confirmar; las respuestas siguen en la cola     │   │
│ │  manual."                                                             │   │
│ └──────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│ REGION 2 · Cola de revisión (orden: mandatory → sample → batch)            │
│ ┌ item mandatory_review ───────────────────────────────────────────────┐   │
│ │ [chip Excepción obligatoria] [chip razón: evidencia_insuficiente]    │   │
│ │ Pregunta: …prompt…                                                    │   │
│ │ Respuesta del candidato (texto, clamp + Ver más)                      │   │
│ │ ▸ Propuesta IA (COLAPSADA por defecto — expandir queda registrado)    │   │
│ │ Tu puntaje: [input 0–100]  Nota (opcional): [text]                    │   │
│ │ [Devolver a manual] [Corregir con mi puntaje] [Confirmar propuesta*]  │   │
│ │  (*Confirmar propuesta solo existe si la propuesta fue expandida)     │   │
│ └───────────────────────────────────────────────────────────────────────┘  │
│ ┌ item quality_sample (SIN resolver) ──────────────────────────────────┐   │
│ │ [chip Muestra ciega] "Puntúa sin ver la propuesta — así medimos       │   │
│ │  la calidad del run."                                                 │   │
│ │ Pregunta + respuesta (la propuesta NO VIENE en el payload)            │   │
│ │ Tu puntaje: [input 0–100]  Nota: [text]     [Registrar mi puntaje]    │   │
│ └───────────────────────────────────────────────────────────────────────┘  │
│ ┌ item quality_sample (resuelto) ──────────────────────────────────────┐   │
│ │ [chip Muestra · resuelta] Tu puntaje: 72 · Propuesta IA: 70 (Δ 2)     │   │
│ └───────────────────────────────────────────────────────────────────────┘  │
│ ┌ item batch_eligible (colapsado, agrupados) ──────────────────────────┐   │
│ │ ▸ 4 propuestas elegibles para lote (expandir para inspección)         │   │
│ └───────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│ ┌ REGION 3 · Confirmación del run ─────────────────────────────────────┐   │
│ │ Resumen del manifest: cubre {n} propuestas · excepciones {a}/{a} ·    │   │
│ │ muestra {b}/{b} · digest vigente · policy v1 · tú como actor          │   │
│ │ {gates abiertos} → causa explícita por gate, CTA disabled             │   │
│ │ {flag OFF} → "La confirmación por lote está apagada; puedes resolver  │   │
│ │  ítems y confirmar respuesta por respuesta."                          │   │
│ │ [Cancelar run]                        [Confirmar run]                 │   │
│ └───────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘
```

- **La muestra ciega es estructural**: el DTO del reader OMITE el bloque `proposal` para `quality_sample` sin resolver (`review-reader.ts:90-97`) — la UI no puede filtrar mal lo que no recibe. Tras resolver, el item muestra el contraste puntaje humano vs propuesta.
- **`sawProposalBeforeScoring` se registra de verdad** en `mandatory_review`: la propuesta llega COLAPSADA; expandirla marca `sawProposalBeforeScoring=true` para la resolución de ese item (estado local irreversible hasta resolver). Resolver sin expandir envía `false`. "Confirmar propuesta" exige haberla visto (no se puede confirmar lo que no se leyó); "Corregir con mi puntaje" y "Devolver a manual" operan en ambos casos.
- `batch_eligible` se agrupa colapsado: inspeccionarlos es legítimo (y no altera su clase), pero el trabajo obligatorio (excepciones + muestra) va primero y arriba.

### Estados terminales del run

```
confirmed   [chip Run confirmado] resumen del manifest read-only (quién, cuándo, cobertura)
cancelled   [chip Run cancelado] razón (reasonCode) + "las respuestas siguen en la cola manual"
failed      [chip Run fallido] statusReason + "ninguna respuesta se pierde: siguen en manual"
```

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| E | Entrada en tab Evaluación | chip de estado del run + abrir workbench | `GreenhouseChip` + `GreenhouseButton` | `GET /scoring-runs?assessmentId=` (ruta colección nueva) |
| 0 | Header del workbench | run id/status/modelo/policy/fecha | `Typography` + `GreenhouseChip` | `AssessmentAiRunReview.run` |
| 1 | Cobertura honesta | contadores + banner stale | `Stack` de stat chips + `Alert` | `AssessmentAiRunReview.coverage` |
| 2 | Cola de revisión | items por risk class con evidencia | `Paper` rows + `Collapse` | `AssessmentAiRunReview.items` |
| 2a | Propuesta colapsada | score + rationale + perCriterion + provenance | `Collapse` + `Accordion` per-criterion | `item.proposal` (null si muestra ciega sin resolver) |
| 2b | Resolución de item | puntaje humano + nota + 3 resoluciones | inputs + `GreenhouseButton` | `POST {action:'resolve_item'}` |
| 3 | Confirmación / cancelación | manifest + gates + CTAs | `Paper` + `Alert` | `POST {action:'confirm_run'\|'cancel_run'}` |
| 4 | Errores | fallos canónicos | `Alert severity='error'` | `CanonicalApiError` (`code`+`actionable`) |

## Desktop Target

A **1440×900** el workbench es un `Dialog maxWidth='lg'` de 90vh con scroll interno propio
(`overflow-y: auto` en REGION 2; header y REGION 1 sticky arriba, REGION 3 sticky abajo — el
operador siempre ve la cobertura y el estado del confirm mientras recorre la cola). Los stat
chips de cobertura usan la fila de KPis compacta del patrón queue; el banner stale ocupa el
ancho completo bajo los chips. Cada item de la cola es un `Paper variant='outlined'` con
`p: 2.5`; la propuesta colapsada indenta con `borderInlineStart` en token `divider`. Sin
card-on-card: el item es la única card, la evidencia por criterio vive en `Accordion` plano.

## Mobile Target

A **390×844** el diálogo va `fullScreen`; los stat chips envuelven en 2 columnas (`flexWrap`);
las acciones de resolución se apilan `fullWidth` (Devolver a manual → Corregir → Confirmar, la
más comprometida al final); REGION 3 pierde el sticky y cierra el scroll. El texto de respuesta
del candidato rompe con `overflowWrap: 'anywhere'`. `scrollWidth == clientWidth` es assertion
del GVC en este viewport (scroll SOLO vertical, dentro del diálogo).

## Action Hierarchy

| Nivel | Acción | Peso visual | Ubicación | Razón |
|---|---|---|---|---|
| 1 — primaria | **Confirmar run** | `GreenhouseButton` primario | REGION 3 | disabled con causa mientras un gate esté abierto; flag-gated |
| 2 — secundaria | **Registrar mi puntaje** (muestra) / **Corregir con mi puntaje** | `variant='outlined'` | por item | el trabajo de revisión real |
| 2 — secundaria | **Confirmar propuesta** (item) | `variant='outlined'` | por item mandatory | solo existe con la propuesta expandida |
| 3 — excepcional | **Devolver a manual** | `variant='text'` | por item | siempre disponible; el camino de escape honesto |
| 3 — excepcional | **Cancelar run** | `variant='text' color='error'` + dialog de confirmación | REGION 3 | rollback; NO flag-gated (camino de recuperación) |
| 4 — contextual | **▸ Ver propuesta IA (queda registrado)** | link-button con ícono ojo | item mandatory | la consecuencia (registro) está EN el label |
| 0 — sin acción | items terminales / batch agrupado | chips + texto | cola | evidencia, no trabajo |

## Visual Fidelity Mapping

| Intención de diseño | Implementación tokenizada | Prohibido |
|---|---|---|
| Stat chips de cobertura | `GreenhouseChip kind='status' variant='label'` + número | inventar KPI cards nuevas; colores literales |
| Chip Excepción obligatoria | `GreenhouseChip … tone='warning'` + ícono | solo color sin texto |
| Chip Muestra ciega | `GreenhouseChip … tone='info'` + ícono ojo tachado | animación de "misterio" |
| Chip razón de routing | `GreenhouseChip … variant='outlined'` con reason code legible | mostrar el code crudo `evidence_missing` sin traducción |
| Banner stale | `Alert severity='warning'` ancho completo | esconder el stale y dejar confirmar |
| Propuesta colapsada | `Collapse` + `borderInlineStart` token `divider` | render precargado oculto con CSS (el registro debe ser veraz: expandir = ver) |
| Evidencia per-criterion | `Accordion` plano dentro del Collapse | tabla ancha con scroll horizontal |
| Contraste muestra resuelta | `Typography` + chip Δ | gráfico decorativo |
| Input de puntaje | `CustomTextField type='number'` 0–100 | slider (precisión requerida) |
| CTA disabled por gate | `disabled` + `aria-describedby` a la causa visible | disabled mudo sin explicación |
| Espaciado | escala `4n` del tema | píxeles arbitrarios |
| Motion | `Collapse` por defecto; `prefers-reduced-motion` lo desactiva | stagger/celebración al confirmar |

## Copy Ledger (`hiringAssessment.scoringRun.*`, bilingüe es-CL + en-US)

| Copy id | Region | Text es-CL | Dynamic values | Notes |
|---|---|---|---|---|
| `scoringRun.entryChip` | E | Run IA: {status} | `status` | chip en la card del assessment |
| `scoringRun.entryExceptions` | E | {count} excepciones | `count` | sufijo del chip si > 0 |
| `scoringRun.open` | E | Abrir revisión del run | — | |
| `scoringRun.title` | 0 | Revisión del run IA | — | + id del assessment |
| `scoringRun.provenance` | 0 | run {status} · modelo {model} · policy {policyVersion} · {date} | `status`,`model`,`policyVersion`,`date` | |
| `scoringRun.statuses.created` | 0/E | Creado | — | map completo de `AiScoringRunStatus` |
| `scoringRun.statuses.enumerating` | 0/E | Enumerando respuestas | — | |
| `scoringRun.statuses.scoring` | 0/E | Puntuando | — | |
| `scoringRun.statuses.awaiting_review` | 0/E | En revisión | — | |
| `scoringRun.statuses.confirmable` | 0/E | Listo para confirmar | — | |
| `scoringRun.statuses.confirmed` | 0/E | Confirmado | — | |
| `scoringRun.statuses.cancelled` | 0/E | Cancelado | — | |
| `scoringRun.statuses.failed` | 0/E | Fallido | — | |
| `scoringRun.coverPending` | 1 | {count} aún puntuando | `count` | `scoringPending` |
| `scoringRun.coverMandatory` | 1 | Excepciones: {resolved} de {total} resueltas | `resolved`,`total` | |
| `scoringRun.coverSample` | 1 | Muestra ciega: {resolved} de {total} puntuadas | `resolved`,`total` | |
| `scoringRun.coverBatch` | 1 | {count} propuestas elegibles para lote | `count` | |
| `scoringRun.coverManual` | 1 | {count} devueltas a corrección manual | `count` | abstained/failed/rejected |
| `scoringRun.coverClosed` | 1 | {count} cerradas sin propuesta | `count` | stale/superseded/cancelled |
| `scoringRun.staleBanner` | 1 | Las fuentes cambiaron después del run (respuestas, rúbrica o modelo). Este run no se puede confirmar; las respuestas siguen disponibles en la cola manual. | — | `coverage.digestStale` |
| `scoringRun.mandatoryChip` | 2 | Excepción obligatoria | — | |
| `scoringRun.sampleChip` | 2 | Muestra ciega | — | |
| `scoringRun.sampleResolvedChip` | 2 | Muestra · resuelta | — | |
| `scoringRun.batchGroup` | 2 | {count} propuestas elegibles para lote | `count` | grupo colapsado |
| `scoringRun.sampleHint` | 2 | Puntúa sin ver la propuesta — así medimos la calidad del run. | — | |
| `scoringRun.sampleContrast` | 2 | Tu puntaje: {human} · Propuesta IA: {ai} (Δ {delta}) | `human`,`ai`,`delta` | post-resolución |
| `scoringRun.questionLabel` | 2 | Pregunta | — | reusa `review.question` |
| `scoringRun.answerLabel` | 2 | Respuesta del candidato | — | reusa `review.answer` |
| `scoringRun.revealProposal` | 2a | Ver propuesta IA (queda registrado) | — | expandir marca `sawProposalBeforeScoring` |
| `scoringRun.proposalSeen` | 2a | Viste esta propuesta antes de puntuar — quedará en el manifest. | — | caption tras expandir |
| `scoringRun.proposalScore` | 2a | Puntaje propuesto: {score} | `score` | |
| `scoringRun.proposalProvenance` | 2a | {model} · {promptVersion} | `model`,`promptVersion` | |
| `scoringRun.perCriterion` | 2a | Evidencia por criterio | — | accordion |
| `scoringRun.routingReasons` | 2 | Por qué requiere revisión | — | lista de reason codes legibles |
| `scoringRun.reason.low_confidence` | 2 | Confianza baja para esta pregunta | — | mapa extensible de reason codes; fallback al code |
| `scoringRun.reason.evidence_missing` | 2 | Evidencia insuficiente en la respuesta | — | |
| `scoringRun.reason.answer_malformed` | 2 | Respuesta fuera de formato | — | |
| `scoringRun.myScoreLabel` | 2b | Tu puntaje | — | 0–100 |
| `scoringRun.noteLabel` | 2b | Nota (opcional) | — | `decisionNote` |
| `scoringRun.resolveConfirm` | 2b | Confirmar propuesta | — | solo con propuesta expandida |
| `scoringRun.resolveOverride` | 2b | Corregir con mi puntaje | — | `finalScore` obligatorio |
| `scoringRun.resolveReject` | 2b | Devolver a manual | — | |
| `scoringRun.resolveSample` | 2b | Registrar mi puntaje | — | muestra ciega |
| `scoringRun.resolving` | 2b | Guardando… | — | |
| `scoringRun.resolved` | 2b | Resolución registrada. | — | toast |
| `scoringRun.confirmTitle` | 3 | Confirmación del run | — | |
| `scoringRun.manifestSummary` | 3 | Cubre {batch} propuestas · excepciones {a}/{a} · muestra {b}/{b} · digest vigente · policy {policyVersion} | `batch`,`a`,`b`,`policyVersion` | |
| `scoringRun.gateOpenMandatory` | 3 | Faltan {count} excepciones por resolver. | `count` | causa del disabled |
| `scoringRun.gateOpenSample` | 3 | Falta puntuar {count} de la muestra ciega. | `count` | |
| `scoringRun.gateOpenScoring` | 3 | El run aún está puntuando {count} respuestas. | `count` | |
| `scoringRun.gateStale` | 3 | El digest quedó desactualizado: este run ya no es confirmable. | — | |
| `scoringRun.confirmFlagOff` | 3 | La confirmación por lote está apagada en este entorno. Puedes resolver ítems y confirmar respuesta por respuesta en la cola manual. | — | flag `HIRING_ASSESSMENT_AI_RUN_CONFIRM_ENABLED` OFF |
| `scoringRun.confirmRun` | 3 | Confirmar run | — | |
| `scoringRun.confirming` | 3 | Confirmando… | — | |
| `scoringRun.confirmed` | 3 | Run confirmado. Los puntajes cubiertos entraron al scorecard. | — | toast |
| `scoringRun.cancelRun` | 3 | Cancelar run | — | abre dialog |
| `scoringRun.cancelDialogTitle` | 3 | Cancelar run | — | |
| `scoringRun.cancelDialogBody` | 3 | Ninguna respuesta se pierde: las pendientes vuelven a la cola de corrección manual. | — | |
| `scoringRun.cancelConfirm` | 3 | Cancelar run | — | |
| `scoringRun.cancelled` | 3 | Run cancelado. Las respuestas siguen en la cola manual. | — | toast + estado terminal |
| `scoringRun.terminalConfirmed` | 0 | Run confirmado por {name} el {date}. | `name`,`date` | vista read-only |
| `scoringRun.terminalFailed` | 0 | El run falló: {reason}. Ninguna respuesta se pierde: siguen en la cola manual. | `reason` | statusReason |
| `scoringRun.noRuns` | E | — | — | sin run NO se dibuja nada (tab intacto) |
| `scoringRun.loadError` | 4 | No pudimos cargar la revisión del run. | — | + Reintentar (`actionable=true`) |
| `scoringRun.permissionDenied` | 4 | No tienes permiso para revisar runs de scoring. Pídeselo a Admin o a People Ops. | — | `actionable=false` |
| `scoringRun.lineageError` | 4 | Este run no es consistente con el assessment registrado. Avisa a Plataforma. | — | 409 `assessment_ai_run_lineage_mismatch` |
| `scoringRun.candidateNever` | — | — | — | NO existe copy candidate-facing en este namespace: contrato anti-leak |

(en-US mirror con las mismas keys.)

## State Copy

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| no-run | — | el tab Evaluación queda exactamente como hoy | — | la ruta colección retorna vacío |
| entry | — | chip de estado + excepciones pendientes | Abrir revisión del run | |
| loading | — | `Skeleton` de cobertura + 3 items | — | al abrir el workbench |
| awaiting_review | Revisión del run IA | cobertura + cola ordenada mandatory→sample→batch | resolver items | default de trabajo |
| blind-sample | — | item sin bloque proposal (estructural) + `sampleHint` | Registrar mi puntaje | el DOM nunca contiene la propuesta |
| proposal-collapsed | — | propuesta colapsada con label de consecuencia | Ver propuesta IA (queda registrado) | mandatory_review |
| resolving | — | acciones del item en busy | — | terminal-once por item; doble click → 409 inofensivo |
| confirmable | — | gates cerrados, manifest resumido | Confirmar run | flag ON |
| gates-open | — | causa por gate visible junto al CTA disabled | resolver lo pendiente | `aria-describedby` |
| flag-off | — | `confirmFlagOff` | resolver items / carril individual | cancel sigue disponible |
| stale | — | `staleBanner` + `gateStale`; confirm bloqueado | Cancelar run / cola manual | `coverage.digestStale` |
| confirmed / cancelled / failed | chip terminal | resumen read-only del manifest / razón | cerrar | nunca se re-abre trabajo |
| permission-denied | — | `permissionDenied` | sin Reintentar | capability `hiring.assessment.score` |
| error | — | `loadError` / error canónico | Reintentar si `actionable=true` | |
| long content | — | respuesta con clamp + Ver más | — | |
| mobile | — | diálogo fullScreen; acciones apiladas | — | 390px sin scroll horizontal |
| keyboard / focus | — | foco visible; dialogs con trap y restore | — | ver Accessibility Contract |
| reduced motion | — | `Collapse` sin transición | — | |

## Accessibility Contract

- El workbench es `Dialog` con `aria-labelledby` al título "Revisión del run IA"; focus trap; `Esc` cierra (salvo request en vuelo) y restaura el foco al botón "Abrir revisión del run".
- La cobertura (REGION 1) es un `role='group'` con `aria-label` "Cobertura del run"; cada contador es texto (no solo chip de color).
- Cada item de la cola es `<li>` de `<ol role='list'>` (el orden ES semántico: mandatory primero); nombre accesible "Excepción obligatoria, pregunta {n}".
- "Ver propuesta IA (queda registrado)" usa `aria-expanded` y su consecuencia está en el label visible, no en un tooltip.
- El item de muestra ciega declara en texto que la propuesta no está disponible a propósito (`sampleHint`) — un lector de pantalla recibe la misma honestidad que el ojo.
- CTA "Confirmar run" disabled lleva `aria-describedby` a las causas visibles de gate abierto.
- Inputs de puntaje: label visible, `type='number'` con min/max, error `role='alert'`.
- Toasts en `Snackbar` con `role='status'`; resultado de confirm/cancel anunciado `aria-live='polite'`.
- Targets ≥24px; `scrollWidth == clientWidth` en 1440 y 390 (scroll vertical interno del diálogo permitido).

## Implementation Mapping

- Route / surface: `/agency/hiring/applications/[applicationId]` tab `assessment` (sin ruta nueva, sin destino de navegación nuevo) — entrada en la card del assessment + workbench como diálogo. Componente nuevo route-local `AssessmentAiRunWorkbench` en `src/views/greenhouse/hiring/` (patrón `CandidateDocumentsPanel`).
- Primitive / variant / kind: reuse (`Dialog`, `Paper variant='outlined'`, `GreenhouseChip kind='status'`, `GreenhouseButton`, `CustomTextField`, `Alert`, `Collapse`/`Accordion`, `Snackbar`, `Skeleton`). Sin kinds nuevos; cola como lista, no `DataTableShell`.
- Component candidates: `AssessmentAiRunWorkbench` (client; estado de expansión/resolución/confirmación) + subcomponentes de item por risk class.
- Copy source: `getMicrocopy(locale).hiringAssessment.scoringRun` (namespace nuevo es-CL + en-US + delta en `HiringAssessmentCopy`).
- Data reader / command: descubrimiento del run vía **ruta colección delgada nueva** `GET /api/hiring/assessments/ai/scoring-runs?assessmentId=` (adapter fino sobre el primitive existente `listAssessmentAiScoringRuns`, `scoring-run/commands.ts:287` — hoy solo existe `[runId]`); revisión vía `GET /api/hiring/assessments/ai/scoring-runs/[runId]` (`listAssessmentAiReviewItems`); acciones vía `POST` del mismo route: `resolve_item` (con `sawProposalBeforeScoring` veraz), `confirm_run`, `cancel_run` (TASK-1734 Slice 4).
- API parity: cero lógica en la UI — el routing de riesgo, la ceguera de la muestra, los gates de confirm y el manifest viven en `src/lib/hiring/assessment/ai/scoring-run/**`; la UI es un cliente más (Nexa/MCP operarían los mismos contratos).
- Access / capability: viewCode `gestion.hiring_application_detail` + `hiring.assessment.score` (`execute`) — resuelta server-side y pasada como prop; sin capability, ni el chip de entrada se dibuja.
- States to implement: no-run · entry · loading · awaiting_review · blind-sample · proposal-collapsed · resolving · confirmable · gates-open · flag-off · stale · confirmed · cancelled · failed · permission-denied · error · long content · mobile · keyboard · reduced-motion.
- GVC markers: `data-capture='assessment-run-entry'`, `data-capture='assessment-run-workbench'`, `data-capture='assessment-run-coverage'`, `data-capture='assessment-run-blind-item'`, `data-capture='assessment-run-confirm'`.

## GVC Scenario Plan

- Scenario file: `scripts/frontend/scenarios/task1738-assessment-run-workbench.yaml` (nuevo).
- Route: `/agency/hiring/applications/[applicationId]?tab=assessment`, seed determinista: run `awaiting_review` con 2 `mandatory_review` (1 resuelta), 1 `quality_sample` sin resolver, 4 `batch_eligible`, 1 `abstained`; variante stale (digest divergente) y variante flag OFF.
- Viewports: desktop 1440×900 + mobile 390×844.
- Quality profile: `premium`.
- Required steps: tab assessment → capturar entrada → abrir workbench → capturar cobertura → item muestra ciega (assert: sin bloque proposal en DOM) → expandir propuesta de mandatory (assert: caption `proposalSeen`) → resolver override → capturar confirm con gate abierto (disabled + causa) → variante stale → cerrar con Esc (foco restaurado) → mobile fullScreen.
- Required captures: `run-entry`, `run-coverage`, `blind-sample-item`, `proposal-revealed`, `confirm-gates-open`, `stale-banner`, `mobile-workbench`.
- Required `data-capture` markers: los 5 de Implementation Mapping.
- Assertions: en el item de muestra ciega sin resolver el DOM NO contiene score/rationale de la propuesta (assertion sobre HTML — la ceguera es estructural); el CTA Confirmar run está `disabled` con `aria-describedby` mientras hay gates abiertos; ningún texto del workbench aparece en la ruta pública `/assessment/[token]`; sin errores de consola; `scrollWidth == clientWidth` en ambos viewports.
- Scroll-width checks: workbench base, propuesta expandida y confirm section (desktop + 390px fullScreen).
- Reduced-motion / focus evidence: captura con `prefers-reduced-motion: reduce`; ciclo abrir→Esc→foco restaurado.
- Review dossier: `pnpm fe:capture:review task1738-assessment-run-workbench`.
- Baseline decision / surface ID: superficie nueva (diálogo) dentro de vista existente → baseline nuevo para el workbench; la card del assessment suma la fila de entrada al baseline del tab.

## Design Decision Log

- Decision: **workbench como diálogo del tab Evaluación**, entrada contextual por assessment, con cola ordenada mandatory → sample → batch y confirm sticky con manifest.
- Alternatives considered:
  - (a) *Ruta dedicada `/agency/hiring/scoring-runs/[runId]`* — descartada: agrega un destino de navegación (presupuesto `pnpm nav:budget`) para un objeto que SIEMPRE se revisa en el contexto de su candidatura; el lineage exacto run→assessment→application ya vive en la ficha.
  - (b) *Reemplazar de inmediato el drawer per-response* — descartada: el carril individual (TASK-1361) es el fallback contractual del run (rollback plan de TASK-1734); el workbench CONVIVE y el drawer se retira en un follow-up cuando el run demuestre cobertura en producción.
  - (c) *Mostrar la propuesta de mandatory_review abierta por defecto* — descartada: replicaría el anclaje real de hoy (`Application360View.tsx:459` precarga el score IA en el input humano — Delta punto 7 de TASK-1734); colapsada por defecto + registro al expandir convierte el anti-anclaje en dato del manifest en vez de disciplina.
  - (d) *Tabla `DataTableShell` para la cola* — descartada: cada item necesita cuerpo largo (pregunta+respuesta+evidencia), no celdas; la lista de cards es el patrón de la cola de corrección existente.
- Why this pattern: el operador ya conoce el frame, la cola y el lenguaje "propuesta IA que tú confirmas"; el workbench solo eleva el mismo vocabulario del per-response al nivel del run, con la cobertura honesta como techo permanente.
- Reuse / extend / new primitive: **reuse total**; `AssessmentAiRunWorkbench` es composición route-local.
- Open risks: (1) traducción de reason codes: el mapa `scoringRun.reason.*` cubre los codes conocidos con fallback legible al code crudo — confirmar el inventario real de codes en Discovery contra `risk-router.ts`; (2) el contraste Δ de la muestra resuelta requiere que el reader entregue la propuesta post-resolución (ya lo hace); (3) polling/refresh mientras `scoring` está activo — refresco manual en V1 (botón), sin websockets.
- Follow-up: retiro del drawer per-response cuando el run cubra el flujo en producción; adapter App API/Nexa para `start`/`reconcile` manual (ya declarado en TASK-1734 Follow-ups).

## Acceptance Checklist

- [x] All visible strings are in the copy ledger.
- [x] Dynamic values are named and bounded (`count`, `status`, `model`, `policyVersion`, `date`, `score`, `human`, `ai`, `delta`, `reason`, `name`, `batch`, `a`, `b`).
- [x] Partial/degraded states are explicit (gates-open / flag-off / stale / failed / cancelled / permission denied / error).
- [x] No copy implies a guarantee when data is estimated — la cobertura muestra devoluciones a manual y cierres sin propuesta, nunca un "100% listo" parcial (lección ISSUE-159).
- [x] Charts have table/text alternatives (n/a — contadores como texto).
- [x] State and aria copy is ready for implementation.
- [x] Implementation mapping names primitive, copy source, data contract and route/surface.
- [x] GVC scenario plan is specific enough for `pnpm fe:capture`.
- [x] Design decision log explains reuse/extend/new before JSX starts.
