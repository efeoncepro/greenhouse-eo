# EPIC-011 — Hiring / ATS End-to-End Program

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `cross-domain`
- Owner: `unassigned`
- Branch: `epic/EPIC-011-hiring-ats-end-to-end-program`
- GitHub Issue: `none`

## Summary

Coordina el programa end-to-end de `Hiring / ATS`: desde una demanda de talento (`TalentDemand`) hasta una postulación/candidato operado en pipeline, handoff aprobado y, para `internal_hire`, activación final como colaborador vía HRIS/People + onboarding readiness.

## Why This Epic Exists

Hiring cruza `Agency`, `People`, `HRIS`, `Staff Augmentation`, Identity/Access, storage privado y surfaces públicas. Si se implementa como tasks aisladas, el riesgo es alto: candidatos como identidades paralelas, vacantes públicas como pipeline separado, UI sin foundation, o seleccionados que nunca pasan a colaborador activo.

Este epic fija la secuencia obligatoria y los gates entre tasks para que el módulo nazca robusto, seguro, resiliente y escalable.

## Outcome

- Hiring queda modelado como dominio canónico `greenhouse_hiring`, no como extensión informal de HRIS o Staff Aug.
- La landing pública de careers alimenta el mismo pipeline interno, sin pipeline paralelo.
- El Hiring Desk opera `HiringApplication` como unidad visual/transaccional.
- El handoff downstream es explícito, versionado, auditable e idempotente.
- El caso `internal_hire` cierra el loop: seleccionado -> HRIS activation queue -> member/onboarding -> collaborator active.
- People 360 conserva el journey longitudinal sin duplicar identidad humana.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_IDENTITY_CONSUMPTION_V1.md`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
- `docs/architecture/GREENHOUSE_WORKFORCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/architecture/GREENHOUSE_CANDIDATE_ACCOUNT_LONGITUDINAL_MY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_CANDIDATE_SELF_SERVICE_LONGITUDINAL_MY_ARCHITECTURE_V1.md`

## Execution Sequence

### Phase 0 — Program Coordination

- `TASK-352` — mantiene la umbrella del programa y verifica que las child tasks sigan alineadas.
- No implementa runtime directo.
- Gate para avanzar: child tasks tienen ownership, dependencias y scopes no solapados.

### Phase 1 — Foundation First

- `TASK-353` — crea foundation transaccional: `TalentDemand`, `HiringOpening`, `CandidateFacet`, `HiringApplication`, publication contract y APIs internas base.
- Debe ejecutarse antes de cualquier UI pública o interna.
- Gate para avanzar: schema `greenhouse_hiring`, service/API baseline y publication allowlist existen; `CandidateFacet` referencia `identity_profile_id`.

### Phase 2 — Public Entry + Internal Desk

- `TASK-354` — careers público, detalle de openings y formulario de apply. **✓ complete**; no reabrir por campos de intake.
- `TASK-355` — Hiring Desk interno, Demand Desk, Pipeline Board, Application 360 y Publication Desk. **✓ complete**.
- `TASK-1688` — corrección vertical de contacto: teléfono opcional, país de residencia explícito y mensaje persistido; paridad Careers/Growth Forms + lectura autorizada en Application 360.
- Gate para avanzar: apply público crea/reconcilia `Person` + `CandidateFacet` + `HiringApplication`; desk interno opera `HiringApplication`, no personas sueltas. `TASK-1688` no crea un pipeline nuevo ni infiere datos históricos.

### Phase 3 — Handoff + Reactive Bridges

- `TASK-356` — crea `HiringHandoff`, eventos `hiring.*`, señales y bridges downstream hacia People/HRIS/Staff Aug.
- Debe ejecutarse después de `TASK-353`; puede integrar outputs de `TASK-354`/`TASK-355`.
- Gate para avanzar: `internal_hire` aprobado llega a cola/read-model para HRIS/People, pero Hiring no crea `member`, payroll truth, access ni placement por side effect.

### Phase 4 — Collaborator Activation Closure

- `TASK-770` — consume handoffs `internal_hire` aprobados y cierra el loop con HRIS/People: member facet sobre el mismo `identity_profile_id`, onboarding, readiness y activación final.
- Debe ejecutarse después de `TASK-356` y requiere `TASK-030`.
- Gate final: selected candidate puede terminar como collaborator active sin duplicar persona, saltarse onboarding ni activar payroll/access prematuramente.

### Phase 5 — Candidate Identity and Professional Profile

- `TASK-1727` crea el principal/login candidato longitudinal, account claim y sesión/capabilities own-resource.
- `TASK-1728` migra el perfil profesional desde owner `member` hacia owner persona con provenance/versiones y
  projections legacy.
- Gate: un candidato autenticado existe sin `member`, sin tenant/rol cliente inventado y puede mantener el mismo
  perfil que leerá después de una activación laboral.

### Phase 6 — Candidate Application Self-Service + `/my`

- `TASK-1729` crea status candidato, actions, CV snapshots, role answers, economic expectation y withdrawal por
  aplicación exacta.
- `TASK-1730` entrega `/my` como workbench personal capability-composed sobre los contratos 1728/1729.
- Gate: una persona con dos aplicaciones ve y edita sólo los recursos permitidos de cada una; estado público no
  filtra stages, notas, scores ni decisiones no comunicadas.

### Phase 7 — Account Continuity at Workforce Activation

- `TASK-1731` extiende TASK-770 para vincular el `member` al mismo principal, refrescar audiences/capabilities y
  reconciliar parciales sin conceder workforce desde la decisión Hiring.
- Gate: selected→activated conserva `user_id` e `identity_profile_id`; session refresh/revocation y retries no crean
  una segunda cuenta o member.

### Phase 8 — Longitudinal People 360 Closure

- `TASK-1732` entrega el reader identity-first pre/post-member con historia completa y DTOs por audiencia.
- `TASK-1733` hace visible esa historia en People 360 con timeline/detail capability-aware.
- Gate final longitudinal: `/my` candidato y People 360 consumen proyecciones distintas sobre los mismos hechos;
  ninguna copia CV, perfil o aplicaciones hacia una ficha paralela.

### Phase 9 — Assessment AI Scoring at Scale

- `TASK-1734` extiende la propuesta individual de TASK-1361 con un run asíncrono exacto por assessment,
  abstención/routing por riesgo, muestra de calidad y confirmación humana gobernada del conjunto elegible.
- Gate: la IA solo propone; un operador autorizado confirma antes del rollup. Puntaje, resultado, rationale,
  confianza y estado de revisión nunca se exponen al postulante, que solo recibe confirmación de envío.
- Boundary: no rankea candidatos, no decide contratación, no mueve etapas, no asigna tests y no envía correos.

### Phase 10 — Candidate Identity Intake Canonicalization

- `TASK-1736` separa evidencia submitted por aplicación, display person-first normalizado/corregible y search key
  versionada; ambas entradas públicas ejecutan la misma policy antes de Person/Hiring.
- Gate: ninguna corrección culturalmente ambigua muta identidad; el histórico sólo cambia mediante dry-run,
  allowlist humana, compare-and-set, audit y rollback ensayado. Mensajes y respuestas abiertas se preservan.
- Boundary: no crea perfil profesional paralelo, no fusiona por nombre, no rankea, puntúa, mueve etapas, asigna
  tests, envía email ni muestra resultados internos al postulante.

### Phase 11 — Public Vacancy Truth and Editorial Detail

- `TASK-1740` convierte el copy público de cada opening en una proyección estructurada allowlist-safe y emite
  canonical/`JobPosting` desde el mismo contenido visible. Conserva el lifecycle published → unpublished, no
  toca el formulario y no incorpora Indexing API sin autorización externa.
- `TASK-1741` consume ese contrato para evolucionar incrementalmente la página individual a un renderer editorial;
  conserva URL, formulario y exactamente los dos CTA existentes, con legacy fallback y rollout reversible.
- Gate: ninguna condición remota, país elegible, salario, beneficio ni mensaje de aplicación se inventa para
  completar el render o el schema. Primero foundation de 1740, después consumer UI de 1741.
- Nota 2026-08-17 (TASK-1740): la foundation quedó **code complete, rollout pendiente** — existe
  `PublicOpeningContent` v1 (`public_content_json` validado) + `public_remote_eligible_countries`
  (ISO alpha-2), canonical explícito siempre en la leaf publicada y JSON-LD `JobPosting` fail-closed
  detrás de `HIRING_PUBLIC_JOBPOSTING_SCHEMA_ENABLED` (default OFF). El write viaja por
  `updateHiringOpening`/`PATCH /api/hiring/openings/{id}` (`publicContent`,
  `publicRemoteEligibleCountries`); el parser de texto del view-model queda como fallback legacy.
  Países elegibles ya seteados en las 2 vacantes publicadas. El release a producción está retenido
  hasta TASK-1741. ADR: `GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` (Delta 2026-08-17).

### Phase 12 — Global Provisional Assessment AI

- `TASK-1742` extiende TASK-1734 con un modo `global_provisional` para todos los assessments enviados: sanitiza
  texto antes del provider, enruta señales deterministas de riesgo y publica una proyección/App API provisional
  separada del score efectivo, con cost cap, kill switch, audit y rollback.
- `TASK-1743` consume esa proyección dentro del workbench de TASK-1738 con cobertura, evidencia y excepciones
  operator-only, sin presentar la propuesta como confirmada.
- Gate: comenzar por la assessment exacta de Lucero, verificar no mutación de `human_score`/rollup y ausencia en
  payloads candidate-facing; después habilitar todas las vacantes con concurrencia controlada y backlog acotado.
- Boundary: no ranking, decisión, stage move, test assignment, email, resultado al postulante ni aprendizaje
  online autónomo. La evidencia acumulada puede alimentar calibración futura, pero no reentrena el runtime.
- Estado 2026-08-18: `global_provisional` está activo en producción para assessments elegibles de todas las
  vacantes, con scheduler cada 2 minutos, concurrencia 1 y tope diario 1000. `TASK-1742` permanece en observación
  hasta documentar cooldown, rollback residual-cero y firmas/risk acceptance. `TASK-1743` está code complete con
  GVC 4,82/5; su compactación visual final viaja en el siguiente release ordinario.

## Child Tasks

- `TASK-352` — Program umbrella and coordination for Hiring / ATS.
- `TASK-353` — Domain foundation: aggregates, schema, services, API baseline and publication contract. **✓ complete (2026-07-07).**
- `TASK-354` — Public careers landing and apply intake. **✓ complete; residual de datos absorbido por TASK-1688 (2026-08-11).**
- `TASK-355` — Internal Hiring Desk, pipeline and publication governance. **✓ complete.**
- `TASK-1688` — Careers application contact completeness: persistencia/lectura de teléfono, residencia y mensaje con un único command de Hiring.
- `TASK-1714` — Reveal auditado del documento de identidad de un **candidato** (no existía: el de TASK-784 se ancla a `memberId`). **✓ complete (2026-08-15).**
- `TASK-1715` — Application 360 · panel de Documentos real: cablea el reader, el CV se lee dentro del portal y el candado queda sólo en la identidad. **✓ complete (2026-08-15).**
- `TASK-1718` — Candidate Review Packet + reader MCP delegado: lectura interna agent-safe de postulación/CV sobre App API, con identidad humana delegada, minimización, audit y provider read-only OFF por defecto.
- `TASK-1719` — Opening Assessment Policy + Stage-Triggered Assignment: binding operativo opening→template,
  assignment manual/automático, cancelación y correo único sobre commands Hiring.
- `TASK-1745` — Activar y reconciliar el lifecycle de entrega de Resend: handler firmado, webhook productivo,
  estados de proveedor honestos y reconciliación acotada (`ISSUE-160`).
- `TASK-1746` — Recovery command de acceso a assessment: capability, token nuevo atómico, email o enlace
  temporal de una sola revelación, sin token crudo durable (`ISSUE-160`; bloqueada por ADR/Privacy-Security).
- `TASK-1747` — Application 360 assessment access recovery: consumer de policy assignment, lifecycle y recovery;
  no usa el endpoint legacy ni afirma inbox delivery (`ISSUE-160`).
- `TASK-1720` — Delegated MCP Candidate Test Assignment: proposal/confirm/cancel MCP sobre TASK-1719, con write
  scope separado y fail-closed hasta grant revocable TASK-1631.
- `TASK-1721` — Governed Hiring Selection Journey Orchestrator: proposal/confirm y saga durable que coordina la
  decisión atómica con handoff, email y activation sin saltarse gates ni duplicar commands.
- `TASK-1722` — Delegated MCP Candidate Selection Journey: tools start/status/advance/cancel sobre TASK-1721, con
  authority por step y write fail-closed hasta grant revocable TASK-1631.
- `TASK-1723` — Talent Pool Canonical Foundation + Full API Parity: membership/purpose/evidence/search/commands/API.
- `TASK-1724` — Talent Pool Consent + Candidate Self-Service: opt-in independiente, status/renew/withdrawal público.
- `TASK-1725` — Talent Pool Desk: workbench interno person-first y invitation proposal/confirm.
- `TASK-1726` — Delegated MCP Talent Pool Search/Profile: reader interno multi-host sobre App API.
- `TASK-1367` — Careers Apply Intake Service: unifica el submit público hacia el command canónico. **✓ complete.**
- `TASK-1368` — Hiring Activation Lane UI: consumer de cola/readiness de activación. **✓ complete.**
- `TASK-1383` — Assessment Engine hardening previo a la taking surface. **✓ complete.**
- `TASK-1384` — Assessment Question Bank SME V1. **✓ complete.**
- `TASK-1385` — AI-assisted vacancy public copy sobre propose→confirm. **✓ complete.**
- `TASK-1397` — Talent Pool and Careers Vacancy Alerts Foundation: alertas primarias para miembros `pool_eligible` con `future_opportunities` vigente + `opening_alerts` explícito, y carril secundario de suscripción anónima Careers; sin crear identidad desde el home.
- `TASK-1398` — Careers Vacancy Alerts UI Host: banda pública secundaria y empty state sobre Growth Forms; no administra el Banco de Talento ni duplica su self-service.
- `TASK-1400` — Hiring Activation Blocker Resolution API. **✓ complete.**
- `TASK-1422` — Vacancy AI Draft UI. **✓ complete.**
- `TASK-1727` — Candidate Portal Principal + Session Foundation: claim post-apply, audiencia/capabilities propias,
  anti-IDOR/anti-oracle y principal longitudinal sin `member` ficticio.
- `TASK-1728` — Person-Scoped Professional Profile: skills/tools/languages/certifications/links/CV versions con
  provenance y migración/projections desde `member_*`.
- `TASK-1729` — Candidate Application Self-Service Contract: status publicado, acciones, CV snapshot, preguntas,
  expectativa económica y retiro por aplicación exacta.
- `TASK-1730` — Longitudinal `/my` Candidate Experience: workbench candidato→preboarding→workforce compuesto por
  capabilities y consumidores canónicos.
- `TASK-1731` — Selection-to-Workforce Account Continuity Bridge: mismo principal/persona, member additive,
  sessionVersion y reconciliation sobre TASK-770.
- `TASK-1732` — Identity-First People 360 Hiring Journey Reader: historia pre/post-member, paginada y allowlisted.
- `TASK-1733` — People 360 Longitudinal Hiring History UI: timeline/detail interno sobre TASK-1732.
- `TASK-1734` — Assessment AI Scoring at Scale + Operator-Only Exception Review: run asíncrono por assessment,
  revisión humana gobernada y resultado exclusivamente interno; el postulante no ve score ni resultado.
  **✓ complete (code complete, rollout gated 2026-08-16; delta correctivo 2026-08-17).** El delta cerró el
  contrato de `perCriterion` (escala declarada `weighted_contribution` + prompt `...scoring.v2` + policy
  `...risk_policy.v1_1`: `per_criterion_contradictory` bajó de 11/14 a 2/14 en el replay real, resucitando
  `batch_eligible`) y entregó el **instrumento del gold set** (`pnpm hiring:ai:gold-set-sample` + rúbrica BARS
  + protocolo en ciego + gate consciente de ruta). **Hallazgo que manda el plan:** la DB tiene 11 respuestas
  humanas calificadas contra un piso de 49 — la ruta A no es ejecutable hoy **por falta de DATOS, no de
  personas**, así que el carril uno-a-uno es el modo correcto y es el que genera esa materia prima. El
  instrumento se entrega vacío: ningún agente fabrica ratings.
- `TASK-1735` — Hiring Application Evaluation Dossier: expediente de evaluación append-only per-application
  (`hiring_application_note` tipada + command/reader + API + capability `hiring.application.annotate`),
  internal-only y fuera del review packet MCP; el consumer UI de Application 360 es follow-up (`TASK-1737`).
  **✓ complete (code complete 2026-08-16; flag ON en staging 2026-08-16, OFF en producción).** Dos fixes
  posteriores (2026-08-17) forman parte del contrato: el cuerpo de la nota pasó de 8000 a **20000** y el write
  path **falla loud** en vez de truncar (el primer confirm real quedó cortado a mitad de frase sin que ningún
  test lo viera, porque el panel renderiza desde `proposedJson`), y la nota reparada se muestra como historia
  con chip **"Versión superada"**, derivando el supersede en el reader desde la nota posterior.
- `TASK-1736` — Candidate Identity Intake Canonicalization + Governed Remediation: raw/display/search person-first,
  parity Careers/Growth Forms, reconciliación identity-safe y remediación histórica allowlisted/reversible.
  **✓ complete (Slices 1-4 code complete 2026-08-16).** Flag `HIRING_CANDIDATE_IDENTITY_NORMALIZATION_ENABLED`
  creada **ON en staging** 2026-08-16 (OFF en producción hasta el canary del runbook). **Remediación histórica
  EJECUTADA** el 2026-08-16 con autorización del CEO: 3 personas reales corregidas (Valentina Villa, Stana
  Medina, Aldo Romano) con actor + razón en `candidate_identity_display_audit`, y 2 perfiles QA podados a mano
  de la allowlist. La cifra "4 propuestas = 2 humanos" del Slice 0 quedó superada por el lote real.
- `TASK-1737` — Application 360: tab Expediente — **consumer UI de `TASK-1735`** (su follow-up declarado): el tab
  `activity` sintético se convierte en el Expediente real (timeline de notas + eventos de etapa, composer, flujo
  propose → editar → confirmar/rechazar) y resuelve el gate BLOQUEANTE anti-anclaje del Delta (3) de 1735 con
  ceguera server-enforced en el reader (viewer con scorecard propio abierto no ve análisis con scores). `ui-ux`
  con híbrido justificado (`reader`); sin bloqueo técnico (backend listo).
  **✓ complete (code complete, rollout gated 2026-08-16).** Gate anti-anclaje CERRADO con predicado único
  compartido con `listResponses` + `GET /dossier` devolviendo `proposal: null`. `UI ready: yes` (dirección visual
  versionada, scorecard 4,54, GVC premium 1440+390 con rubric enterprise `pass`). Gated: flag
  `HIRING_EVALUATION_DOSSIER_AI_ENABLED` OFF en producción (dueño 1735) + evidencia visual del panel de propuesta
  con datos reales pendiente de staging.
- `TASK-1738` ✅ **complete (2026-08-17, code complete; smoke staging pendiente)** — Workbench de revisión del
  scoring IA — **consumer UI de `TASK-1734`** (su follow-up declarado: workbench con anti-anchoring + honest
  provisional coverage): cobertura honesta **sticky**, cola de excepciones con evidencia por criterio, muestra
  ciega estructural verificada sobre el DOM, `sawProposalBeforeScoring` por gesto real y confirm/cancel con
  manifest. Montado en la card del assessment de la Application 360; convive con el drawer per-response; cero
  superficie candidate-facing; el rollout de flags de 1734 sigue su runbook aparte. `UI ready: yes` (dirección
  visual versionada + scorecard 4,46). El GVC premium sobre un run REAL destapó `manifestSummary` mintiendo 100%
  y el bug del risk router cerrado en el delta 2026-08-17 de `TASK-1734`.
- `TASK-1739` — **Procedencia de datos sintéticos en Hiring**: `data_origin`
  (`real|synthetic_seed|smoke_test|demo`, default `real`) declarado en el nacimiento del dato, con dos
  raíces (persona en `identity_profiles`, demanda en `talent_demand`/`hiring_opening`) y copia derivada
  por trigger en `hiring_application`. Readers de desk/talent-pool filtran por defecto con opt-in
  `includeSynthetic` detrás de flag; el sampler del gold set excluye **siempre y sin opt-in**. Backfill
  con allowlist humana (nunca regex en producción), purga gobernada archive-first, gate que impide
  crear datos sin declarar procedencia y señal `hiring.data_quality.synthetic_records_aging`.
  `backend-data`/`backend-critical`. Paralelizable con todos los carriles; `Blocked by: none`.
- `TASK-1740` — Public Vacancy Content and Google JobPosting Foundation: proyección pública estructurada,
  allowlist, lifecycle y SEO técnico de la URL leaf; no toca formulario ni implementa Indexing API.
- `TASK-1741` — Public Careers Editorial Detail Renderer: consumer UI incremental de 1740, con wireframe,
  fallback legacy, GVC premium y exactamente los dos CTA existentes; no agrega un CTA final.
- `TASK-1742` — Global Provisional Assessment AI Foundation: modo global operator-only, sanitizer, riesgo
  determinista, projection/App API, worker, observabilidad, canary y rollback sin mutar score efectivo.
- `TASK-1743` — Provisional Assessment AI Operator Experience: consumer UI dentro del workbench existente,
  con autoridad provisional explícita, cobertura, evidencia, excepciones y cero superficie candidate-facing.
- `TASK-1744` — Borrado gobernado de documentos de candidato vencidos (Ley 21.719): cierra el follow-up que
  `TASK-1362` dejó sin dueño. Plan read-only → allowlist humana → apply con actor, justificación y audit append-only;
  soft-delete siempre (`asset_scan_results` es append-only y cascadea desde `assets`); lane aparte para el documento
  de identidad; ciego a `data_origin`. Urgencia baja verificada (1 postulación con decisión, vence agosto 2027).
- `TASK-356` — Handoff, reactive events/signals and downstream bridges.
- `TASK-770` — HRIS/People activation closure for `internal_hire`.

### Assessment + Candidate Intake extension (Delta 2026-07-08)

- `TASK-1360` — **Assessment Engine foundation**: competency catalog + question bank + assessment templates + candidate test instances + interviewer scorecards, objective + human scoring, competency-result rollup into `hiring_application`. Seeds the real competencies (SEO, copywriting, project management, community management, leadership, vendor management + attitudinal + aptitude) and the first Account Manager template. `backend-data`. Blocked by `TASK-353`.
- `TASK-1361` — **Assessment AI Assist**: governed AI question generation + AI-proposed scoring of open/situational answers (propose → confirm, human confirms; eval baseline). `backend-data`. Blocked by `TASK-1360`.
- `TASK-1362` — **Candidate Document Capture**: hiring asset contexts (CV/portfolio) on the private assets platform + candidate identity-document linking (reuse `person_identity_documents` masked/reveal) + upload quarantine/scan for public uploads. `backend-data`. Blocked by `TASK-353`.
- `TASK-1363` — **Assessment Taking + Review Surface**: candidate-facing remote tokenized test-taking + internal rating/review surface in the desk. `ui-ux`. Blocked by `TASK-1360` (+ product-design loop).
- `TASK-1364` — **Assessment Validity Feedback Loop**: link assessment score → real hire outcome (quality-of-hire 90d/6m) to measure predictive validity; read-only, advisory, feeds EU AI-Act technical documentation. `backend-data`. Blocked by `TASK-1360`. (From the `greenhouse-talent-people-operator` review of TASK-1360 — validity gap.)
- `TASK-1365` — **Adverse-Impact & Fairness Monitoring**: privacy-safe aggregate monitoring of selection rates across groups (4/5ths) + drift; voluntary self-ID separated from the decision; observes, never adjusts; required for EU AI-Act bias testing. `backend-data`. Blocked by `TASK-1360`. (From the `greenhouse-talent-people-operator` review — fairness gap.)
- `TASK-1734` — **Assessment AI Scoring at Scale + Operator-Only Exception Review**: completa el follow-up de
  TASK-1361 con run durable/asíncrono, policy calibrada de abstención y riesgo, muestra de calidad y confirmación
  humana del conjunto. Todo score/resultado/rationale/revisión es interno y candidate-facing permanece sin resultados.

### Publication + Growth Forms apply extension (Delta 2026-07-09)

- `TASK-1371` — **Hiring Vacancy Publication Operator Command**: structured backend-data operator `dryRun|execute|publish` for publishing openings from approved briefs without release/SQL/UI-only flow. Adds structured public fields (`public_work_mode`, `public_hiring_region`, location, `public_area`, `public_skill_tags`, optional compensation band), publish guards, CLI/API internal surface and idempotency via the API Platform command ledger. **✓ complete/released (PR #152, 2026-07-09).**
- `TASK-1372` — **Growth Forms Application Upload + ATS Projection Foundation**: complete local; Growth Forms is now the application-form source of truth for CV/private upload and the `growth_hiring_application_from_submission` projection into Hiring/ATS.
- `TASK-1373` — **Careers Apply Native Growth Form Migration**: complete/staging live; `/public/careers/[publicId]/apply` renders the native `<greenhouse-form>` behind `CAREERS_NATIVE_GROWTH_FORM_ENABLED`, with production still OFF pending explicit release sign-off.

### Contact completeness correction (Delta 2026-08-11)

- `TASK-1688` — corrección del contrato que detectó la auditoría de postulaciones reales: teléfono y mensaje alcanzaban el schema pero el command no los persistía, y país de residencia no existía. Exige ADR antes de migrar, no permite inferencia/backfill histórico y gobierna ambas entradas públicas hacia el mismo command/reader.

### Candidate identity intake canonicalization (Delta 2026-08-16)

- `TASK-1736` continúa TASK-1367/1688 sin duplicarlas: conserva la Person canónica y agrega un contrato
  raw/display/search versionado para nombres, parity de las dos entradas públicas y reconciliación conflict-safe
  cuando el email ya resolvió una identidad existente.
- La remediación histórica es backend-critical: ADR y sign-offs previos, detector read-only, dry-run vigente,
  allowlist humana, compare-and-set, lotes de uno, audit sin PII y rollback exacto ensayado en staging.
- La policy nunca aplica Title Case global ni reescribe mensajes/respuestas abiertas; phone calling-country es
  explícito y distinto de residencia. UI de corrección, hardening genérico Growth Forms, assessment IDs y
  filename CV quedan fuera.

### Agent-safe candidate review extension (Delta 2026-08-15)

- `TASK-1718` agrega la fundación programática para que un agente interno autorizado revise una aplicación y
  su CV sin automatizar la UI. Greenhouse conserva source of truth, autorización por usuario/recurso, texto
  derivado y audit; `mcp.efeonce.org` conserva sólo transporte/routing.
- La task es read-only e internal-only: no asigna assessments, no envía correos, no mueve etapas, no rankea y
  no decide. `TASK-1608`/`TASK-1610` pueden consumirla después, pero sus claims y gates de Talent Assurance no
  se adelantan ni se reinterpretan aquí.
- Gate: provider, reader y worker nacen deshabilitados; no se habilita una opening real sin ADR, revisión
  Security/Privacy, identidad humana delegada, allow/deny/revocation y pruebas de IDOR/prompt-injection/PII.

### Candidate test policy, automation and MCP write extension (Delta 2026-08-15)

- `TASK-1719` extrae el binding operativo opening→assessment template a EPIC-011, donde pertenece el runtime de
  Hiring. Manual propose→confirm y entrada a etapa ejecutan el mismo command; el ops-worker reusa el email live de
  `TASK-1689`, con idempotencia, hold/accommodation, cancelación y reconciliation.
- `TASK-1603` conserva el quality gate de Talent Assurance y consume esa policy para completeness/evidence; no
  crea una segunda tabla o binding.
- `TASK-1720` federa assignment/cancellation en MCP con tools propose→confirm. Reader y writes tienen flags/scopes
  separados; el write nunca se concede al PKCE público y permanece fail-closed hasta el grant de `TASK-1631`.

### Governed selection journey and MCP extension (Delta 2026-08-15)

- `TASK-1721` agrega coordinación durable sobre los owners existentes: TASK-355 conserva la decisión atómica,
  TASK-356 materializa/aprueba handoff, TASK-1689 entrega correo y TASK-770 activa internal-hire. El journey usa
  checkpoints/readback/reconciliation y se detiene ante cada gate; nunca simula una transacción distribuida.
- `TASK-1722` federa ese primitive en MCP con start/status/advance/cancel propose→confirm. La confirmación inicial
  no autoriza handoff ni activation; cada boundary recibe una authority/capability nueva.
- Gate: TASK-1603 debe gobernar evidence completeness antes del confirm productivo; MCP permanece fail-closed hasta
  TASK-1631 y nunca agrega write scope al cliente PKCE público compartido.

### Talent Pool Full API Parity extension (Delta 2026-08-16)

- `TASK-1723` convierte el follow-up histórico de búsqueda global en un recurso person-first sin identidad paralela:
  separa discoverability/contactability, importa cohortes existentes fail-closed y entrega readers/commands/API únicos.
- `TASK-1724` obtiene consentimiento futuro independiente y withdrawal self-service; el consentimiento actual del apply
  sigue limitado al proceso y no se reinterpreta. Corrige además el enlace público de privacidad.
- `TASK-1725` entrega el consumer humano como evidence workbench; `TASK-1726` entrega el mismo read contract a cualquier
  host MCP estándar autorizado mediante el provider Hiring de TASK-1718. El gateway no posee datos ni policy.
- V1 cubre candidatos externos/históricos. Internal bench/freelancers/partners requieren adapters posteriores; no se
  representan como implementados. Ningún slice rankea, auto-decide, expone contacto/CV en búsqueda o habilita B2B.

### Candidate account + longitudinal `/my` extension (Delta 2026-08-16)

- ADR y arquitectura aceptan una sola persona y un solo principal durante candidatura, selección y workforce.
- El apply inicial permanece público; el login se reclama después mediante verificación. `/my` deja de significar
  “member workspace” y se compone por audiences/capabilities sin abrir endpoints laborales al candidato.
- El perfil profesional reusable pasa a ser person-scoped. Cada aplicación conserva status publicado, CV snapshot,
  role answers y expectativa económica propios; actualizar el perfil nunca reescribe evidencia histórica.
- TASK-1727–1733 separan identidad, data migration, Hiring API, UI candidata, activation bridge, reader People 360 y
  UI People 360. Esta partición evita tasks híbridas y copy-on-hire.
- Referencias/recomendaciones, agenda y passkeys quedan post-MVP; no bloquean status/CV/perfil/preguntas.

### Procedencia de datos sintéticos (Delta 2026-08-17)

`TASK-1739` cierra un defecto transversal del programa: dev, staging y producción comparten una sola
Cloud SQL, así que **cada task de este EPIC que crea un seed o un smoke deja candidatos y vacantes
fantasma junto a los reales**, y hoy no existe ningún hecho en el modelo que diga "esto es sintético".
La inferencia disponible —regex sobre el nombre— falla en los dos sentidos, con evidencia dura de
ambos: un falso positivo demostrado en el gold set del 2026-08-16 (una respuesta real de 1206
caracteres que menciona "pequeñas pruebas o pilotos") y un falso negativo estructural (cinco
convenciones distintas de marcado repartidas en ocho scripts, ninguna compartida).

- La procedencia (`data_origin`) es **ortogonal** a `source` (`public_careers|manual|referral|…`):
  `source` responde por qué canal llegó, `data_origin` si el dato representa a alguien del mundo real.
  **Nunca** se colapsan en una columna.
- **Dos raíces**: `identity_profiles` para personas y `talent_demand`/`hiring_opening` para la demanda
  (una vacante fantasma no tiene persona). `hiring_application` porta una copia derivada por trigger.
- El sampler del gold set (`TASK-1734`) pasa a excluir sintéticos **siempre**, sin opt-in: la muestra
  vigente salió limpia por suerte —los seeds no se califican a mano—, no por construcción.
- La limpieza es **archive-first**: `hiring_assessment` cascadea desde `hiring_application`, así que
  un DELETE se llevaría, en silencio, respuestas calificadas por personas.
- **Obligación para todo carril activo del EPIC** (`1719/1720/1721/1722`, `1727…1733`): sus seeds,
  smokes y scenarios declaran `dataOrigin` explícito. Un gate mecánico lo exige una vez que
  `TASK-1739` cierre su Slice 6.

Es paralelizable con todos los carriles: no bloquea ni es bloqueada por ninguno, y cuanto antes
cierre, menos fantasmas hay que remediar después.

## Existing Related Work

- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/research/RESEARCH-003-hiring-desk-reactive-ecosystem.md`
- `docs/tasks/to-do/TASK-030-hris-onboarding-offboarding.md`
- `docs/tasks/to-do/TASK-763-lifecycle-onboarding-offboarding-ui-mockup-adoption.md`
- `src/lib/person-360/person-complete-360.ts`
- `src/lib/people/get-person-detail.ts`
- `src/lib/staff-augmentation/store.ts`
- `src/lib/storage/greenhouse-assets.ts`
- `src/app/api/assets/private/route.ts`

## Agent Execution Rules

- Do not start `TASK-354`, `TASK-355`, `TASK-356` or `TASK-770` before `TASK-353` is complete unless the task is explicitly limited to read-only design refresh.
- Do not create a root `candidate` identity. Use `identity_profile_id` as human root and `CandidateFacet` as recruiting facet.
- Do not create `member`, `assignment`, `placement`, payroll truth or access from `TASK-353`, `TASK-354`, `TASK-355` or the Hiring side of `TASK-356`.
- Use the shared private assets platform for CV/portfolio files: `GREENHOUSE_PRIVATE_ASSETS_BUCKET`, `greenhouse_core.assets`, `/api/assets/private`.
- The public apply flow must be rate-limited, consent-gated, sanitized, idempotent and must not leak dedupe/internal status.
- The pipeline board moves `HiringApplication`, not `Person` and not `HiringOpening`.
- `TASK-770` is the only child task that closes `internal_hire` as collaborator active, and it does so under HRIS/People ownership.
- Candidate login never creates `member`; TASK-1731 only extends the downstream TASK-770 activation boundary.
- `/my` access is capability-composed. Never grant the whole existing `my` route group or member-scoped APIs to a
  candidate principal.
- Professional profile completeness, economic expectation and optional answers never become automated ranking or
  adverse-decision inputs.

## Exit Criteria

- [ ] `TASK-353` delivered foundation and no downstream task uses mocks or parallel schema.
- [x] `TASK-354` delivered public careers/apply without exposing internal opening metadata or unsafe assets; contact persistence residual is owned by `TASK-1688`.
- [x] `TASK-355` delivered internal desk with `HiringApplication` as board unit and capability-aware PII handling.
- [ ] `TASK-356` delivered auditable `HiringHandoff`, versioned events and downstream signals.
- [ ] `TASK-770` delivered selected candidate -> collaborator active closure for `internal_hire`.
- [ ] People 360 shows the journey from candidate/application to member/onboarding/active without duplicate identities.
- [ ] Event catalog, architecture docs, functional docs and user manuals are updated where behavior changed.
- [x] `TASK-1723`–`TASK-1726` entregan Talent Pool person-first, consentimiento/withdrawal, Desk y MCP read-only con
      Full API Parity, sin duplicar identidad, policy, documentos ni lógica entre consumers.
- [ ] `TASK-1727`–`TASK-1730` entregan cuenta candidata, perfil profesional person-scoped, application self-service y
      `/my` longitudinal sin abrir superficies workforce ni copiar datos al contratar.
- [ ] `TASK-1731` demuestra selección→activación con el mismo principal/persona y revocación/refresh de sesión.
- [ ] `TASK-1732`–`TASK-1733` muestran People 360 identity-first antes/después de member, con todas las aplicaciones
      autorizadas y sin mezclar evidencia entre procesos.

## Non-goals

- No AI scoring/evaluation automation in the first pass.
- No semantic/embedding search, opaque fit ranking, automated shortlist or Talent Pool access for external clients in V1.
- No client-branded microsites in V1.
- No automatic member/placement/payroll/access creation directly from Hiring.
- No replacement of HRIS onboarding runtime in this epic.

## Delta 2026-05-03

- Epic created to make the execution sequence explicit after `TASK-770` was added as the missing closure from selected candidate to active collaborator.

## Delta 2026-07-08 — Assessment (candidate testing) + Document Capture design

Operator requirement: el dominio necesita (1) **tests que rinde el candidato** — actitudinales, de aptitud/capacidad, y de conocimiento por skill (SEO, project management, community management, copywriting, liderazgo, vendor management) — y (2) **carga de documentos** (CV, enlace de portafolio, documento de identidad). Caso vivo que fuerza el diseño: vacante de **Account Manager** que exige nociones de SEO + copywriting + liderazgo + vendor management.

### El "Assessment" son dos mecanismos, un modelo de competencias

- **Test que rinde el candidato** (nuevo): un cuestionario versionado con answer-key + scoring + mapeo a competencias, que el candidato responde remoto (link tokenizado single-use + tiempo límite).
- **Scorecard humano de entrevista** (`HiringEvaluation`, ya anticipado en la arquitectura): un entrevistador registra ratings por competencia tras la entrevista.
- Ambos producen **resultados por competencia** que ruedan hacia `hiring_application.score` / `match_score` / `explainability_json` (SSOT del número headline sigue en la postulación).

### Modelo por competencias (composición, no tests hardcodeados)

- **Catálogo de competencias** reutilizable, con dos ejes **ortogonales** (nunca en un solo enum): `category` (`attitudinal` | `aptitude` | `skill`) × `level` (`nociones` | `intermedio` | `avanzado`).
- **Banco de preguntas** por competencia+nivel, con `type` (`single_choice` | `multi_choice` | `likert` | `situational` | `open_text`). `single/multi` y `likert` = auto-corregidas; `situational`/`open_text` = corrección humana (o IA-propuesta, TASK-1361). La `answer_key` es sensible: se guarda separada y NUNCA viaja en el payload que ve el candidato (misma disciplina allowlist que el opening público de TASK-353).
- **Plantilla de test** = composición de módulos `competencia + nivel objetivo + peso`. Ejemplo Account Manager: SEO@nociones(15%) + Copywriting@intermedio(25%) + Liderazgo@intermedio(25%) + Vendor@nociones(15%) + Actitudinal(20%). Reutilizable en cada vacante equivalente.
- **Instancia de test** = plantilla enganchada a una `hiring_application` → candidato rinde → auto-score objetivo + cola de corrección humana → scorecard por competencia.

### Carga de documentos — reutilizar, no crear buckets

- **CV / portafolio (archivo)** → plataforma de assets privados existente (`greenhouse_core.assets` + `GREENHOUSE_PRIVATE_ASSETS_BUCKET`), con **contextos hiring nuevos** anclados por `application_id`/`candidate_facet_id`/`identity_profile_id` (el candidato NO tiene `member`). Portafolio como enlace = campo en `candidate_facet`.
- **Documento de identidad (cédula/RUT/pasaporte)** → **reutiliza `greenhouse_core.person_identity_documents`** (TASK-784), anclado al `identity_profile_id` del candidato, con el patrón enmascarado/revelar + capability HR `person.legal_profile.reveal_sensitive` + auditoría. Un reclutador ve enmascarado; revelar exige capability + razón + audit (mismo rigor que la PII de un empleado). La imagen escaneada va a assets como `evidence_asset_id`.
- **Timing/compliance:** identity docs se capturan **post-decisión** (cerca de la oferta/handoff), NO en el apply público. CV/portafolio sí en el apply.
- **Gap:** la plataforma de assets **no tiene quarantine/scan** hoy → net-new para uploads públicos (TASK-1362).

### Boundaries duros (arch + payroll)

- El score de assessment es **hiring-interno y ortogonal a payroll/ICO/bonus**: mide al candidato, NUNCA es KPI de delivery ni elegibilidad de bono.
- Los tests son **input a una decisión humana, NUNCA deciden solos** (no auto-rechazan) — defensibilidad legal + fairness.
- IA en scoring/generación: **propone, un humano confirma** (governed action runtime), con eval baseline. Nunca puntúa como verdad final.

### Secuencia actualizada

`353 (✓) → 354 + 355 + 1360 + 1362 (paralelo tras foundation) → 1361 (tras 1360) → 1363 (tras 1360 + product-design) → 356 → 770`

#### Delta 2026-08-16 — secuencia de las extensiones 2026-08-15/16

Las extensiones no viven en las fases numeradas originales; su orden real es por cadena de blockers:

- Carril assignment/selection: `1719 → 1603 (EPIC-038, consume la policy de 1719) → 1721`; `1720`/`1722` son
  adapters MCP de sus dueñas y viajan después de cada foundation.
- Carril scoring: **`1734` es paralelizable con `1719`/`1721`** — corre sobre `hiring.assessment.submitted` exista o
  no la policy de asignación (`Blocked by: none` es correcto, no significa "última"). Su matriz de sign-offs quedó
  resuelta por autorización ejecutiva del CEO (2026-08-16, ver Delta en la task); los gates técnicos (eval de
  promoción, shadow, canary) se mantienen.
- Carril expediente: `1735` (foundation backend del Evaluation Dossier) es independiente y paralelizable; su
  consumer UI es follow-up. Frontera 1734↔1735: manifest estructurado vs nota narrativa (declarada en ambas).
- Carril consumers UI (delta 2026-08-16): los dos follow-ups declarados ya tienen dueño — `1737` (tab Expediente,
  consumer de 1735, incluye el gate anti-anclaje BLOQUEANTE) y `1738` (workbench del run, consumer de 1734).
  Ambos sin bloqueo técnico: el backend está complete y el rollout de flags corre por sus runbooks; son
  paralelizables entre sí y con el resto de los carriles.
- Carril cuenta candidata: `1727 → 1728/1729 → 1730 → 1731 → 1732 → 1733` según sus blockers declarados.

### Supersede de non-goal

El non-goal "No AI scoring/evaluation automation in the first pass" se **refina**: la evaluación (assessment) entra como capability propia; el scoring IA es gobernado (propose→confirm + eval), no automatización que decide. No se relaja el boundary de "no auto-reject".
