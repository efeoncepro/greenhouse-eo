# EPIC-011 — Hiring / ATS Master UI Flow

## Meta

- Epic: `EPIC-011` (Hiring / ATS Canonical Program)
- Tipo: **Master UI flow** (program-level; las superficies son nodos de este flujo, no pantallas aisladas)
- Owner de diseño: info-architecture (lead) + `greenhouse-ux` + `state-design` + `greenhouse-ux-writing`
- Estado: `draft` (vivo — se amplía a medida que cada surface se autora)
- Creado: 2026-07-08
- Superficies participantes (una por task): `TASK-354` (careers pública) · `TASK-355` (hiring desk interno) · `TASK-1363` (assessment taking + review) · `TASK-1362` (doc capture) · `TASK-356` (handoff/decision) · `TASK-770` (bridge backend de activación HRIS) · `TASK-1368` (Activation Lane People Ops)
- Contratos de datos backend: `TASK-353` (foundation), `TASK-1360` (assessment engine), `TASK-1361` (assessment AI assist), `TASK-1367` (careers apply intake service)

## Un solo modelo → muchas superficies

El dominio `Hiring / ATS` (schema `greenhouse_hiring`) es **un solo modelo canónico** que se renderiza en superficies distintas según el actor. Ninguna superficie inventa su propio pipeline de candidatos. La cadena de agregados (TASK-353) es la espina dorsal:

```
talent_demand ──▶ hiring_opening ──(publish)──▶ [público] ──apply──▶ candidate_facet ──▶ hiring_application
                                                                                              │
                                             assessment (TASK-1360/1361) ◀────────────────────┤
                                                                                              │
                                             hiring_evaluation / scorecard ◀──────────────────┤
                                                                                              ▼
                                                                        decision/handoff (TASK-356) ──▶ member (TASK-770) ──▶ Activation Lane (TASK-1368)
```

- **Person-first:** un candidato es una `Person` (`greenhouse_core.identity_profiles`) con una `candidate_facet` (UNIQUE por persona). Una persona = una faceta; nunca un pipeline paralelo.
- **Full API Parity:** cada superficie es un **cliente delgado** de commands/readers server-side. La UI no es source of truth; consume el contrato gobernado. Nexa opera lo mismo por construcción.

## Actores y su puerta

| Actor | Superficie | Route group | Qué hace | Task |
|---|---|---|---|---|
| **Candidato** (público, sin sesión) | Careers pública | público (sin auth) | Ve vacantes, postula, rinde el test tokenizado | 354 · 1363 (taking) |
| **Reclutador / Hiring manager** (interno) | Hiring desk | `internal` | Publica vacante, revisa postulantes, asigna test, corrige/confirma puntaje, decide | 355 · 1363 (review) · 356 |
| **SME** (interno) | Desk (banco de preguntas) | `internal` | Aprueba preguntas del banco (gate `draft→active`) incl. borradores IA | 355 · 1361 |
| **People Ops / HRIS** (interno) | Activación lane ("Contrataciones listas") | `internal` | Convierte el hire en colaborador activo (UI = 1368, cliente delgado del bridge backend 770) | 1368 / 770 |
| **Nexa** (agente) | Conversational | — | Opera los mismos commands por parity (propose→confirm) | transversal |

## Flow map cross-surface (el journey completo)

```
[INTERNO] Desk: crear demanda ▶ crear opening ▶ PUBLICAR (355)
                                                      │
                                                      ▼
[PÚBLICO]  Careers: listing ▶ detalle de vacante ▶ apply form ▶ confirmación genérica (354)
                                                      │  (crea Person→facet→application, source=public_careers)
                                                      ▼
[INTERNO] Desk: bandeja de postulantes ▶ ficha del candidato (355)
                                                      │  reclutador asigna assessment (TASK-1360)
                                                      ▼
[PÚBLICO]  Assessment taking: link tokenizado single-use ▶ rinde el test (1363 taking)
                                                      │  submit → auto-score objetivo + cola humana
                                                      ▼
[INTERNO] Desk/Review: scorecard por competencia ▶ (IA sugiere puntaje, humano confirma — 1361) ▶ decisión (1363 review · 356)
                                                      │
                                                      ▼
[INTERNO] Activación: hire → colaborador activo vía HRIS/People (770 backend · 1368 UI)
```

## Nodos y su contrato de UI (resumen; el detalle vive en el flow de cada task)

| Nodo | Superficie | Estados clave | Reader/Command | Task |
|---|---|---|---|---|
| **N1 Listing público** | Careers | loading · lista · vacía (sin vacantes) · error | `listPublicOpenings()` | 354 |
| **N2 Detalle vacante** | Careers | detalle · 404 (opening no publicado) | `getPublicOpeningByPublicId` | 354 |
| **N3 Apply form** | Careers | idle · validación inline · enviando · confirmación genérica · rate-limited · error | `submitPublicHiringApplication` (1367) | 354 |
| **N4 Bandeja postulantes** | Desk | loading · lista+filtros · vacía · error | readers de applications (355) | 355 |
| **N5 Ficha candidato** | Desk | detalle · tabs (perfil/assessment/docs/decisión) | readers 360 + assessment | 355 |
| **N6 Asignar test** | Desk | picker plantilla · asignado (token generado) | `assignCandidateTest` (1360) | 355/1363 |
| **N7 Rendición test** | Assessment taking (público) | token válido/expirado/consumido · en progreso · enviado | `resolveAssessmentByToken` + `saveResponse` + `submitAssessment` (1360) | 1363 |
| **N8 Review scorecard** | Desk | pendiente corrección · IA sugerida (confirmar/editar) · scored | `finalizeAssessment` + `confirmAiProposal` (1361) | 1363/1361 |
| **N9 Decisión** | Desk | decisión · reason estructurado · `hiring.application.decided` emitido | `decideHiringApplication` (**355**) | 355 |
| **N10 Handoff/downstream** | Desk → bridge | handoff materializado · approval · señales · bridges · cola internal_hire | reactive consumer + `HiringHandoff` (**356**) | 356 |
| **N11 Activation Lane** | HR > Onboarding & Offboarding | cola approved internal_hire · journey/readiness · resolver blockers · member/onboarding/complete | readers/commands de `hiring-activation` (**770**) + resolver `resolve-blocker` (**1400**) | 1368/770/1400 |

## Reglas transversales del sistema (heredadas por cada superficie)

- **Público nunca ve interno:** el candidato solo ve el payload allowlist (`PublicOpeningPayload`); NUNCA scores, estado interno, dedupe, ni si ya existía la persona. La confirmación de apply es genérica y segura.
- **Sensibles nunca cruzan al público:** `answer_key`/`rubric` del banco nunca viajan al candidato (allowlist `buildPublicQuestion`); el token de assessment es single-use.
- **Consentimiento + attribution:** todo apply persiste consentimiento explícito + `source='public_careers'` + versión de copy/legal.
- **IA propone, humano confirma:** las sugerencias de la IA (preguntas / puntajes, TASK-1361) nunca se aplican solas; el humano confirma en el desk.
- **es-CL + a11y:** copy es-CL desde `src/lib/copy/*`; WCAG 2.2 AA; `scrollWidth==clientWidth` en desktop + 390px; reduced-motion.
- **Shell tokenizado reusable:** el shell público sin sesión que construye TASK-354 (para el apply) es el mismo patrón que 1363 reusa para `/assessment/[token]`. Diseñarlo reusable.

## Design Decision Log (nivel programa)

- **DDL-1 (backend antes que UI):** cada superficie se parte en su contrato backend-data (foundation) + su consumer ui-ux. 354 = careers UI, consume el service backend TASK-1367. Razón: Full API Parity + Task Authoring Contract.
- **DDL-2 (un shell público, dos usos):** el shell público sin sesión se diseña una vez (careers apply) y se reusa (assessment taking). Evita dos sistemas de layout público paralelos.
- **DDL-3 (person-first en toda superficie):** ninguna surface crea identidad paralela; toda entrada de candidato reconcilia `Person → candidate_facet → application`.
- **DDL-4 (Nexa por construcción):** no se diseña UI "Nexa-específica"; si el command existe (parity), Nexa lo opera con su propio loop.
- **DDL-5 (la decisión y el handoff son dos nodos, unidos por un evento):** el reclutador **decide** en el desk (N9, command síncrono `decideHiringApplication` de **355**, que escribe las columnas snapshot + emite `hiring.application.decided` v1). La **reacción downstream** (materializar `HiringHandoff`, señales, bridges, cola internal_hire) es un nodo reactivo separado (N10, **356**), disparado por ese evento — NO por `hiring.application.stage_changed`. Frontera CQRS: 355 escribe, 356 reacciona. El evento `hiring.application.decided` es el **contrato compartido**: lo registra 356 en `event-catalog.ts` (dueño del dominio reactivo de decisión/handoff), lo emite 355. El consumer de 356 puede shippear dormido (no hay eventos hasta que 355 emita) → sin hard-dependency de runtime.

## Delta 2026-07-08 — N9/N10 split (review TASK-356)

- El antiguo N9 "Decisión/handoff (356)" se partió en **N9 Decisión (355)** + **N10 Handoff/downstream (356)**. Razón: la decisión es un write síncrono con UI (desk, 355); el handoff es reactivo sin UI propia (356 es `backend-data`, `UI impact: none`; su read-model de cola internal_hire lo consume la UI de **770**, no 356). El seam es el evento `hiring.application.decided` (ver DDL-5).

## Delta 2026-07-13 — N10→N11 visible seam (TASK-1368)

- Application 360 ya no deja la selección como callejón sin salida: si la decisión es `selected` + `internal_hire`, la pestaña **Decisión** muestra el bridge card de handoff real y enlaza a `/hr/onboarding?lane=hiring-activation&applicationId=<id>&handoffId=<id>` cuando existe handoff.
- Si el handoff está `pending`, el desk puede aprobarlo con el command real `POST /api/hiring/handoffs/[handoffId]/approve` cuando el actor tiene `hiring.handoff.approve`; cuando está `approved|in_setup|completed`, la CTA abre la Activation Lane.
- La Activation Lane soporta deep link por `applicationId`/`handoffId`, selecciona el caso correcto si ya está en la cola de N11 y muestra un estado honesto de "aún no está en la cola" si N10 no materializó/aprobó el handoff. Desde el detalle vuelve a Application 360.
- `Resolver blocker` en N11 consume `POST /api/hr/hiring-activation/[id]/resolve-blocker` de TASK-1400; no hay simulación client-side.

## Delta 2026-07-16 — N-publish gana redacción asistida IA (TASK-1385 backend · TASK-1422 UI)

- El nodo de publicación (Publication Desk, 355 Surface 4) ahora tiene el sub-flujo **"Redactar con IA"**: CTA en la columna pública del diff (variantes ready/locked por flag/pending por ledger) → drawer propose→confirm (`docs/ui/flows/TASK-1422-vacancy-ai-draft-flow.md`). La IA propone COPY desde inputs allowlist-safe (nunca presupuesto/notas internas); el confirm humano escribe vía `updateHiringOpening`; el publish sigue siendo la acción humana existente con su gate 422.
- Regla transversal reafirmada: "IA propone, humano confirma" ahora cubre preguntas (1361), puntajes (1361/1363) y el aviso público (1385/1422) — mismo ledger `hiring_assessment_ai_proposal`, misma cola de proposals.
- El Publication Desk ganó selector de vacante (antes fijaba `openings[0]`).

## Cómo se amplía este doc

Cada task de superficie (354/355/1363/356/770/1368) declara en su `Flow` qué nodo(s) de este master implementa, y deja un `## Delta` acá si agrega/cambia un nodo o una regla transversal. Este flow NO reemplaza el flow por-surface; es el mapa del sistema que los conecta.
