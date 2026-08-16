# TASK-1738 — Assessment AI · Workbench de revisión del run Flow Contract

## Meta

- Status: `contract-ready` (dirección visual pendiente; `UI ready: no` en la task)
- Owner task: `TASK-1738 — Workbench de revisión del scoring IA (consumer UI del run aggregate de TASK-1734)`
- Related wireframe: [docs/ui/wireframes/TASK-1738-assessment-ai-review-workbench.md](../wireframes/TASK-1738-assessment-ai-review-workbench.md)
- Master UI flow: [EPIC-011-hiring-ats-UI-FLOW.md](EPIC-011-hiring-ats-UI-FLOW.md) — este flujo **extiende el nodo N8 (Review scorecard)** con el carril de run: junto al per-response "IA sugerida (confirmar/editar)" existente aparece la revisión gobernada del run completo (excepciones + muestra ciega + confirm por lote). No crea nodo nuevo, ruta nueva ni superficie candidate-facing; N7 (rendición) queda intacto por contrato anti-leak.
- Intended route / surface: `/agency/hiring/applications/[applicationId]` `?tab=assessment` + workbench como diálogo + dialog de cancelación.
- Flow type: `single-surface` (entrada contextual + diálogo command-backed con cola interna)
- Primary primitives: `Dialog`, `Paper variant='outlined'`, `GreenhouseChip`, `GreenhouseButton`, `CustomTextField`, `Collapse`/`Accordion`, `Alert`, `Snackbar`
- Copy source: `hiringAssessment.scoringRun.*` (es-CL + en-US, namespace nuevo)

## Flow Brief

- Primary user: operador interno con `hiring.assessment.score` (misma autoridad que aplica scores; tier del confirm de TASK-1734).
- Entry moment: el run asíncrono propuso scores para el assessment enviado y quedó `awaiting_review` (o `confirmable`); el operador entra desde la card del assessment en la Application 360.
- Successful outcome: excepciones resueltas una a una, muestra ciega puntuada sin ver propuestas, run confirmado con manifest veraz — o cancelado con las respuestas de vuelta en la cola manual, sin perder ninguna.
- Primary decision/action: **resolver items** (`confirmed` | `overridden` | `rejected_to_manual`) y **confirmar/cancelar el run**.
- Non-goals: iniciar runs desde la UI (los crea el consumer del evento); mostrar resultado alguno al candidato; rankear/decidir/mover etapa; editar rúbricas; retirar el drawer per-response (convive como fallback).

## Surfaces Involved

| Surface | Role | Desktop behavior | Mobile / compact behavior | Primitive |
|---|---|---|---|---|
| Card del assessment (tab Evaluación) | entrada: chip de estado del run + abrir | fila adicional en la card existente | chip + botón apilados | `GreenhouseChip` + `GreenhouseButton` |
| Workbench (diálogo) | cobertura + cola + confirm | `maxWidth='lg'` 90vh, header/cobertura sticky arriba, confirm sticky abajo, scroll interno | `fullScreen`, sin sticky inferior | `Dialog` |
| Item mandatory_review | resolver con evidencia; propuesta colapsada | card con Collapse | acciones apiladas full-width | `Paper` + `Collapse` |
| Item quality_sample | puntuar a ciegas (proposal omitido por el reader) | card sin bloque de propuesta | idem | `Paper` |
| Dialog "Cancelar run" | rollback con confirmación | `maxWidth='sm'` | fullWidth | `Dialog` |
| Snackbar | resoluciones/confirm/cancel | bottom | idem | `Snackbar` |

## Flow Map

```
 Application 360 · tab Evaluación
        │ (GET /scoring-runs?assessmentId= al montar la card — ruta colección nueva)
        ▼
 ¿hay run? ──no──► card exactamente como hoy (fin)
        │sí
        ▼
 [chip Run IA: {status} · n excepciones]  [Abrir revisión del run]
        │ click
        ▼
 ┌──────────────────────────────────────────────────────────────┐
 │ Workbench (GET /scoring-runs/[runId] → run+items+coverage)   │
 └───┬──────────────────┬──────────────────────┬────────────────┘
     │                  │                      │
 item mandatory     item quality_sample     REGION 3
     │              (proposal AUSENTE        │
 ▸ propuesta         del payload)            │
 colapsada              │                    │
     │ expandir      puntaje humano      ┌───┴────────┐
     │ (sawProposal      │            gates cerrados  gates abiertos
     │  =true)           ▼            + flag ON       │
     ▼            POST resolve_item       │           ▼
 puntaje/decisión  {overridden,           ▼      CTA disabled
     │              finalScore,      [Confirmar run]  + causa visible
     ▼              sawProposal=false}    │
 POST resolve_item      │                 ▼
 {confirmed|overridden| ▼           POST confirm_run
  rejected_to_manual,  item resuelto      │
  sawProposal veraz}   (muestra revela ┌──┴─────────┐
     │                  contraste Δ)  200          409 (gate/estado)
     ▼                                 │            │
 item resuelto → coverage re-fetch     ▼            ▼
                              run confirmed    re-fetch GET
                              (manifest        (coverage real
                               read-only)       + causa)

 [Cancelar run] → Dialog → POST cancel_run → run cancelled
                            (respuestas vuelven a la cola manual; NO flag-gated)
```

## Interaction Triggers

| Trigger | Origen | Efecto | Guarda |
|---|---|---|---|
| Montar card del assessment | tab Evaluación | `GET /scoring-runs?assessmentId=` → dibuja entrada solo si hay runs | capability `hiring.assessment.score` (server → prop) |
| Click "Abrir revisión del run" | card | abre workbench; `GET /scoring-runs/[runId]` | — |
| Click "Ver propuesta IA (queda registrado)" | item mandatory | expande `Collapse`; marca `sawProposalBeforeScoring=true` local e irreversible hasta resolver; muestra caption `proposalSeen` | proposal presente |
| Escribir puntaje 0–100 | item | habilita "Corregir con mi puntaje" / "Registrar mi puntaje" | rango validado cliente+server |
| Click "Confirmar propuesta" | item mandatory | `POST resolve_item {resolution:'confirmed', sawProposalBeforeScoring:true}` | SOLO con propuesta expandida |
| Click "Corregir con mi puntaje" | item | `POST resolve_item {resolution:'overridden', finalScore, sawProposalBeforeScoring}` | `finalScore` presente |
| Click "Devolver a manual" | item | `POST resolve_item {resolution:'rejected_to_manual', sawProposalBeforeScoring}` | siempre disponible |
| Click "Registrar mi puntaje" | item muestra ciega | `POST resolve_item {resolution:'overridden', finalScore, sawProposalBeforeScoring:false}` | la propuesta no existe en el payload → false estructural |
| Resolución 200 | item | re-fetch del GET (coverage + item con contraste Δ) | terminal-once; 409 en doble click es inofensivo |
| Click "Confirmar run" | REGION 3 | `POST confirm_run` con `aria-busy` | gates cerrados + flag `HIRING_ASSESSMENT_AI_RUN_CONFIRM_ENABLED` ON |
| Click "Cancelar run" | REGION 3 | abre dialog de confirmación | NO flag-gated (camino de rollback) |
| Confirmar cancelación | dialog | `POST cancel_run {reasonCode?}` | no hay request en vuelo |
| Botón refrescar | header | re-fetch del GET | visible mientras `status='scoring'` (V1 sin polling) |
| `Esc` / ✕ | workbench | cierra; foco restaurado a "Abrir revisión del run" | bloqueado durante confirm/cancel en vuelo |

## State Machine

```
                 ┌─────────┐
   GET colección │ no-run  │ → card intacta (fin)
        ────────►└─────────┘
        │hay run
        ▼
   ┌─────────┐ abrir  ┌──────────┐ GET items ┌──────────────────┐
   │  entry  ├───────►│ loading  ├──────────►│ awaiting_review  │◄─┐
   └─────────┘        └────┬─────┘           └──┬───┬───┬───────┘  │ resolve 200
                       error│                   │   │   │          │ (re-fetch)
                           ▼                    │   │   └──────────┘
                     Alert loadError            │   │
                     (retry actionable)         │   │ coverage.digestStale
                                                │   ▼
                                                │  stale (confirm bloqueado;
                                                │         cancel disponible)
                          gates cerrados+flag ON│
                                                ▼
                                        ┌──────────────┐ confirm_run 200
                                        │ confirmable  ├────────► confirmed
                                        └──────┬───────┘          (read-only)
                                     flag OFF  │ 409 gate/estado
                                               ▼        └──► re-fetch (causa visible)
                                        flag-off (resolver items
                                        + carril individual siguen)

   cancel_run 200 (desde cualquier estado no terminal) ──► cancelled (read-only)
   run.status='failed' ──► failed (read-only; statusReason + "nada se pierde")
```

Estados por item: `pending/claimed` (aún puntuando — solo contador) · `proposed+mandatory`
(colapsada→expandida→resuelta) · `proposed+quality_sample` (ciega→resuelta con Δ) ·
`proposed+batch_eligible` (agrupado, inspeccionable) · `abstained/failed/rejected_to_manual`
(devuelto a manual, read-only) · `stale/superseded_by_manual/cancelled` (cerrado sin propuesta).

## Routing Contract

- El workbench **no cambia la ruta**: vive como diálogo del tab `assessment` (`?tab=assessment` existente). Sin destino nuevo de navegación (`Nav placement: none`; presupuesto del sidebar intacto).
- Sin deep link al run en V1: el run se alcanza siempre por su candidatura (lineage exacto); un query param `?run=` es follow-up si la operación diaria lo pide.
- El dialog de cancelación no empuja historia; `Esc` cierra sin afectar el back del browser.
- Cerrar el workbench conserva el estado del tab (no hay pérdida de trabajo: cada resolución ya se persistió al responder 200).

## Focus & Accessibility

- Abrir el workbench: foco al título del diálogo; trap activo; `Esc` cierra (salvo request en vuelo) y restaura el foco a "Abrir revisión del run".
- Expandir la propuesta: `aria-expanded` en el trigger; el caption `proposalSeen` se anuncia `role='status'`.
- Resolver un item: resultado anunciado `aria-live='polite'`; el foco pasa al siguiente item pendiente de la cola (flujo de trabajo en serie sin re-orientarse).
- CTA "Confirmar run" disabled con `aria-describedby` a las causas de gate abierto (texto visible, no tooltip).
- Item de muestra ciega: la ausencia de propuesta se declara en texto (`sampleHint`) — igual honestidad para lector de pantalla.
- Dialog de cancelación: focus trap, foco inicial en el botón Cancelar (acción segura), restore al disparador.
- Inputs numéricos con label visible, min/max y error `role='alert'`.

## Data & Command Boundaries

| Pieza | Contrato | Dónde corre | Nota |
|---|---|---|---|
| Descubrir runs del assessment | `GET /api/hiring/assessments/ai/scoring-runs?assessmentId=` — **ruta colección delgada NUEVA** (única pieza backend de esta task) | route handler nuevo | adapter fino sobre `listAssessmentAiScoringRuns` (`scoring-run/commands.ts:287`, primitive existente); capability `hiring.assessment.score` |
| Revisión del run | `GET /api/hiring/assessments/ai/scoring-runs/[runId]` → `listAssessmentAiReviewItems` | ruta existente (TASK-1734) | exact-scoped; ceguera de muestra estructural en el reader; `coverage.digestStale` recomputado |
| Resolver item | `POST … {action:'resolve_item', runItemId, resolution, finalScore?, decisionNote?, sawProposalBeforeScoring}` → `resolveScoringRunItem` | ruta existente | `sawProposalBeforeScoring` OBLIGATORIO y veraz (evidencia del manifest) |
| Confirmar run | `POST … {action:'confirm_run', decisionNote?}` → `confirmAssessmentAiScoringRun` | ruta existente | flag `HIRING_ASSESSMENT_AI_RUN_CONFIRM_ENABLED` + gates server-side; la UI solo refleja |
| Cancelar run | `POST … {action:'cancel_run', reasonCode?}` → `cancelAssessmentAiScoringRun` | ruta existente | NO flag-gated (rollback); terminal-once |
| Permiso | `can(tenant,'hiring.assessment.score','execute','tenant')` | server (page) → prop | sin capability ni la entrada se dibuja |
| Anti-leak candidato | rutas públicas `/api/public/assessment/**` y emails jamás tocados | — | esta task no agrega ni modifica superficie pública; tests negativos de TASK-1734 permanecen verdes |

**Full API Parity:** la UI no reimplementa routing, gates ni manifest — todo vive en
`src/lib/hiring/assessment/ai/scoring-run/**` (TASK-1734). La ruta colección nueva es un consumer
delgado del reader existente, disponible por construcción para Nexa/MCP/scripts.

## Failure Paths

| Falla | Detección | Comportamiento de UI | Recuperación |
|---|---|---|---|
| GET colección falla | error canónico | la card del assessment muestra caption de error discreto (sin bloquear el tab) | Reintentar |
| GET del run falla | error canónico | Alert `loadError` en el workbench | Reintentar (`actionable=true`) |
| Lineage inconsistente | 409 `assessment_ai_run_lineage_mismatch` | Alert `lineageError`; workbench read-only | escalar a Plataforma (integridad) |
| Run no existe | 404 `assessment_ai_run_not_found` | Alert + cierre; re-fetch de la colección | — |
| Doble resolución del mismo item | 409 terminal-once | re-fetch; el item aparece resuelto por quien ganó | — |
| Confirm con gate abierto (carrera) | 409 del command | re-fetch; causa visible junto al CTA | resolver lo pendiente |
| Flag confirm OFF | estado `confirmFlagOff` | CTA no operativo con explicación; resolver items y carril individual siguen | prender flag (runbook, fuera de la UI) |
| Digest stale detectado | `coverage.digestStale` | banner + confirm bloqueado; cancel disponible | cancelar run / cola manual |
| Provider dejó items `pending` eternos | `scoringPending > 0` sostenido | contador visible + botón refrescar; el confirm no cierra | reconciliación (ops, fuera de la UI) |
| Capability revocada entre render y POST | 403 canónico | Alert `permissionDenied` sin Reintentar (`actionable=false`) | pedir permiso |
| Red caída durante resolve | error de fetch | Alert con Reintentar; puntaje/nota escritos se conservan en el estado local | Reintentar |
| Cierre del diálogo con trabajo a medias | — | inofensivo: cada resolución ya persistió; lo no resuelto sigue pendiente al reabrir | reabrir |

## GVC Scenario Plan

- Scenario file: `scripts/frontend/scenarios/task1738-assessment-run-workbench.yaml`
- Route: `/agency/hiring/applications/[applicationId]?tab=assessment` (seed determinista del wireframe: run `awaiting_review` + variantes stale y flag OFF)
- Viewports: 1440×900 + 390×844 · Quality profile `premium`
- Required steps: card con entrada → workbench → cobertura → item ciego (assert DOM sin proposal) → expandir propuesta mandatory (assert caption) → resolver override → confirm disabled con causa → variante stale → Esc → foco restaurado → mobile fullScreen
- Required captures: `run-entry`, `run-coverage`, `blind-sample-item`, `proposal-revealed`, `confirm-gates-open`, `stale-banner`, `mobile-workbench`
- Required `data-capture` markers: `assessment-run-entry`, `assessment-run-workbench`, `assessment-run-coverage`, `assessment-run-blind-item`, `assessment-run-confirm`
- Assertions: item de muestra ciega sin resolver NO contiene score/rationale en el DOM; CTA confirm `disabled` + `aria-describedby` con gates abiertos; cero strings del namespace `scoringRun` en la ruta pública `/assessment/[token]`; sin errores de consola; `scrollWidth == clientWidth` en ambos viewports
- Reduced-motion / focus evidence: captura con `prefers-reduced-motion: reduce` + ciclo abrir→Esc→foco

## Design Decision Log

- **DDL-1 — La cobertura es el techo permanente.** El header sticky muestra SIEMPRE pendientes/abstenciones/devoluciones: un run parcial nunca se presenta como completo (lección ISSUE-159 heredada vía TASK-1734: "honest provisional coverage").
- **DDL-2 — La ceguera no es de esta UI.** El reader omite la propuesta de `quality_sample` sin resolver (`review-reader.ts:90-97`); la UI solo declara la ausencia con honestidad. Assertion de GVC sobre el DOM, no sobre estilos.
- **DDL-3 — Ver la propuesta cuesta un gesto registrado.** En `mandatory_review` la propuesta llega colapsada y el label del trigger lleva la consecuencia ("queda registrado"); `sawProposalBeforeScoring` deja de ser autodeclaración y pasa a ser telemetría de un gesto real. Es la corrección del anclaje vigente (el score IA precargado en el input humano, `Application360View.tsx:459`).
- **DDL-4 — Confirmar propuesta exige haberla leído.** "Confirmar propuesta" sin expandir sería rubber-stamp con evidencia falsa de supervisión; el botón no existe hasta expandir. Corregir y devolver a manual no lo requieren (el juicio propio no necesita ver la propuesta).
- **DDL-5 — Cancelar nunca se gatea por flag.** El rollback es camino de recuperación (contrato de TASK-1734): con el confirm apagado o el run degradado, cancelar y volver a manual siempre está a un clic, con la promesa explícita "ninguna respuesta se pierde".
- **DDL-6 — Convivencia declarada con el drawer per-response.** El carril individual es el fallback contractual del run; esta task no lo toca. El retiro es follow-up con evidencia de producción.
- **DDL-7 — Refresh manual en V1.** El estado `scoring` cambia por un worker async; polling/streaming agrega complejidad sin evidencia de necesidad — botón de refresco + contador visible.

## Acceptance Checklist

- [x] Cada superficie del flujo tiene su comportamiento desktop y mobile declarado.
- [x] La máquina de estados cubre éxito, error recuperable y error estructural (incluidos terminales del run).
- [x] El contrato de foco cubre apertura, cierre, restauración y bloqueo durante commands.
- [x] Las fronteras de datos nombran reader, command, capability y dónde corre cada uno.
- [x] Los failure paths distinguen `actionable=true` de `actionable=false` según el contrato canónico de errores.
- [x] El flujo referencia el master UI flow del programa y declara qué nodo extiende (N8).
- [x] El GVC plan es ejecutable sin re-decidir arquitectura.
