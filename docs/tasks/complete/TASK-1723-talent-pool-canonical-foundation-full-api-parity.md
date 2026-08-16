# TASK-1723 — Talent Pool Canonical Foundation and Full API Parity

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `migration|reader|command|api|sync`
- Epic: `EPIC-011`
- Status real: `Complete y operativo en producción interna; projection/search/App API/Desk/MCP ON, recontacto externo fail-closed hasta aprobación People + Legal/Privacy`
- Rank: `TBD`
- Domain: `hr|identity|data|platform|ops`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crea la fundación canónica del banco de talento sobre `identity_profile`, `candidate_facet` y la historia real de
Hiring. Entrega membership/consentimiento versionado, evidencia buscable, disponibilidad, readers y commands con
Full API Parity para UI, Nexa, App API y el adapter MCP dependiente, sin duplicar personas ni automatizar selección.

## Execution Evidence — 2026-08-16

- ADR Talent Pool aceptado y registrado; policy, DTO allowlist, capabilities y separación
  `discoverable | contactable | retained | withdrawn` materializadas.
- Siete migraciones aplicadas en PostgreSQL productivo y cero pendientes; backfill/reconciler idempotente dejó 52
  memberships, 50 `active_process`, 2 `needs_reconsent`, sin copiar CV/contacto ni inventar consentimiento futuro.
- Readers/commands, Product API y App API comparten contratos server-side; tests focales, TypeScript y lint pasan.
- Release `a369165dfb2d`/run `31941320983` terminó `success`; reconciler productivo cada cinco minutos, Desk live y
  canary MCP allow `200`/deny `403` prueban los consumers. Invitación/self-service externos permanecen OFF hasta
  sign-off People + Legal/Privacy: es un gate operativo explícito, no consentimiento implícito ni deuda del foundation.

## Why This Task Exists

Greenhouse conserva postulaciones, assessments, documentos y decisiones, pero hoy cada búsqueda comienza desde una
vacante o una aplicación. No existe un recurso person-first que permita redescubrir talento evaluado, distinguir si
puede ser contactado para otra oportunidad, explicar por qué coincide ni retirar el perfil de forma propagable.

Usar `candidate_facet.consent_status` como un booleano universal sería incorrecto: el copy público vigente autoriza
tratamiento “para este proceso de selección”, mientras la política pública declara retención de postulantes por 12
meses. El backfill puede hacer visibles los registros dentro del purpose original, pero no convertirlos silenciosamente
en permiso de recontacto futuro. La base debe separar `descubrible`, `contactable`, `retained` y `withdrawn`.

## Goal

- Proyectar una sola ficha de Talent Pool por persona, con aplicaciones/evidencia referenciadas y sin copiar CV crudo.
- Ofrecer búsqueda determinística, paginada y explicable por capabilities, rol, seniority, idioma, país autodeclarado,
  disponibilidad, coverage y freshness; nunca por atributos protegidos inferidos.
- Crear commands canónicos para consentimiento, retiro, disponibilidad e invitación a una opening, aptos para
  `propose → confirm → execute`, idempotentes, auditados y reutilizables por todos los consumers.
- Incorporar incrementalmente a la cohorte histórica mediante dry-run/backfill con estado de contacto fail-closed.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_BUILD_UNIT_DECOMPOSITION_DECISION_V1.md`
- `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md`
- `docs/architecture/agent-invariants/INTEGRATIONS_INFRA_AGENT_INVARIANTS.md`

Reglas obligatorias:

- `greenhouse_core.identity_profiles` sigue siendo la raíz. Talent Pool es facet/membership/proyección, nunca otra Persona.
- Una persona aparece una vez en resultados aunque tenga muchas aplicaciones; cada evidencia conserva application/source/version.
- `describible/searchable` no equivale a `contactable`; el reader devuelve ambas decisiones y sus reason codes.
- La cohorte existente se importa como `active_process` o `needs_reconsent` según evidencia, nunca como opt-in futuro inventado.
- Ningún CV, respuesta abierta, email, teléfono, expectativa económica o nota libre se copia al índice de búsqueda.
- No hay auto-ranking, auto-reject, auto-hire ni inferencia de edad, género, nacionalidad, etnia, salud, discapacidad o clase protegida.
- Una invitación crea o reutiliza `HiringApplication` por el aggregate canónico; no salta opening, pipeline, assessment ni decisión humana.
- Toda fuente parcial o stale se declara; ausencia de datos no se representa como resultado negativo ni como cero.

## Normative Docs

- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`
- `docs/operations/GREENHOUSE_OPERATING_LOOP_V1.md`
- `docs/operations/hiring/2026-08-12-revision-privacidad-contacto-careers.md`
- `docs/tasks/to-do/TASK-352-hiring-ats-canonical-program.md`
- `docs/tasks/complete/TASK-353-hiring-ats-domain-foundation.md`
- `docs/tasks/complete/TASK-355-hiring-desk-internal-workspaces-publication-governance.md`
- `docs/tasks/complete/TASK-356-hiring-handoff-reactive-signals-downstream-bridges.md`
- `docs/tasks/complete/TASK-1362-candidate-document-capture.md`
- `docs/tasks/to-do/TASK-1718-hiring-candidate-review-packet-delegated-mcp-reader.md`
- `docs/tasks/to-do/TASK-1719-hiring-opening-assessment-policy-stage-triggered-assignment.md`
- `docs/epics/to-do/EPIC-011-hiring-ats-end-to-end-program.md`
- `https://efeoncepro.com/politica-de-privacidad/`

## Dependencies & Impact

### Depends on

- `greenhouse_core.identity_profiles`, `greenhouse_hiring.candidate_facet`, `hiring_application` y stores de `src/lib/hiring/`.
- `src/lib/hiring/public-careers/**` para el purpose/consentimiento del intake vigente.
- Assessments, documentos, decisiones y eventos existentes sólo como referencias/evidencia; esta task no cambia sus owners.
- Aceptación de un ADR Talent Pool en Slice 0 antes de fijar schema, retention policy o capabilities.

### Blocks / Impacts

- `TASK-1724`: consume consent/self-service commands y DTO público de esta fundación.
- `TASK-1725`: consume search/profile/invite y no implementa lógica paralela en la UI.
- `TASK-1726`: federa los readers mediante el provider `greenhouse-hiring` de TASK-1718.
- `TASK-1719`: una aplicación invitada sólo dispara assessment si la opening tiene policy canónica aplicable.
- `TASK-1608`/`TASK-1610`: pueden consumir referencias de evidencia, pero no reinterpretar membership como claim Talent Assurance.

### Files owned

- `docs/architecture/GREENHOUSE_TALENT_POOL_FULL_API_PARITY_DECISION_V1.md` *(nuevo; nombre sujeto al ADR index)*
- `src/lib/hiring/talent-pool/**` *(nuevo; contracts, readers, commands, stores, policy y events)*
- `src/app/api/hiring/talent-pool/**` *(nuevo; Product API interna)*
- `src/app/api/platform/app/hiring/talent-pool/**` *(nuevo; App API delegada)*
- `src/lib/api-platform/resources/app-hiring-talent-pool.ts` *(nuevo)*
- `src/lib/sync/projections/**` *(consumer incremental; path final en Plan Mode)*
- `scripts/hiring/backfill-talent-pool.ts` *(nuevo; dry-run por defecto)*
- `migrations/*talent_pool*.sql` *(nombres finales después del ADR/Discovery)*
- catálogo/seeds de capabilities, event catalog, reliability queries y documentación Hiring afectada

## Current Repo State

### Already exists

- `candidate_facet` es único por `identity_profile_id` y ya conserva source, readiness, availability, seniority,
  `consent_status`, policy version, captured-at, retention, links y campos de contacto.
- `hiring_application` conserva el grain por opening, etapa, score advisory, explainability e historia; el pipeline mueve aplicaciones.
- Application 360 y TASK-1714/1715 ya dan lectura humana gobernada de contacto/documentos.
- TASK-1718 ya define la lectura agent-safe de una aplicación/CV exactos, sin búsqueda global.
- TASK-1397/1398 son Career Alerts y excluyen explícitamente el Talent Pool interno.

### Gap

- No existe membership/lifecycle de banco separado del consentimiento acotado a una postulación.
- No existe reader person-first con dedupe, coverage, freshness, reason codes ni filtros gobernados.
- No existe command de invitación que preserve source application, purpose, idempotencia y el pipeline canónico.
- No existe backfill reconciliable ni propagación de withdrawal/expiry hacia índices/caches.
- No existen capabilities específicas de lectura, administración e invitación del banco.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/lib/hiring/**, rutas Next.js gobernadas, PostgreSQL existente y ops-worker para proyección/reconciliation`
- Future candidate home: `domain-package`
- Boundary: `searchTalentPool, getTalentPoolProfile, recordTalentPoolConsent, withdrawTalentPoolConsent, updateTalentAvailability e inviteTalentToOpening; Product/App API, UI, Nexa y MCP son consumers`
- Server/browser split: `contracts/DTO allowlisted pueden ser browser-safe; stores, DB, consent policy, PII, audit, commands y eventos son server-only`
- Build impact: `sin SDK pesado; cualquier extractor/embedding queda fuera de V1 y requiere task propia`
- Extraction blocker: `transacción Person↔candidate facet↔application, autorización Greenhouse, outbox y lifecycle de retención permanecen en el dominio Hiring`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `migration|reader|command|api|sync`
- Source of truth afectado: `greenhouse_core.identity_profiles + greenhouse_hiring.candidate_facet/hiring_application; membership y evidencia derivada aditivas`
- Consumidores afectados: `Hiring Desk, Careers self-service, App API, Nexa, MCP, ops-worker y runbooks`
- Runtime target: `local|staging|production|worker|external`

### Contract surface

- Contrato existente a respetar: `src/lib/hiring/**, Application 360, public apply, API Platform app lane y Full API Parity ADR`
- Contrato nuevo o modificado: `membership/purpose policy, evidence projection, search/profile readers, consent/availability/invite commands, Product/App API y events`
- Backward compatibility: `gated; schema aditivo, readers read-only y commands nuevos detrás de flags/capabilities`
- Full API parity: `un primitive por capability; UI/Nexa/App API/MCP/CLI/E2E consumen los mismos readers/commands y nunca tablas/botones ad hoc`

### Data model and invariants

- Entidades/tablas/views afectadas: `candidate_facet e hiring_application existentes; talent_pool_membership, talent_pool_evidence_projection y audit append-only propuestos, sujetos a reuse-check/ADR`
- Invariantes que no se pueden romper:
  - `identity_profile_id` es la identidad; membership no duplica nombre/contacto ni sustituye aplicaciones.
  - Consentimiento/purpose/provenance/policy-version/captured-at/expiry/withdrawal son campos independientes y reconstruibles.
  - Una retirada o expiry deja de servir el perfil y propaga invalidación a proyección/cache sin borrar audit obligatorio.
  - Evidencia conserva source type/id/version/as-of/coverage; no se persiste texto crudo de CV ni respuesta abierta.
  - Search ordering es determinístico y versionado; reasons son evidence-backed y no constituyen decisión adversa.
- Tenant/space boundary: `V1 internal-only; actor y tenant se derivan de session/App API, nunca del filtro; cada recurso revalida capability y purpose`
- Idempotency/concurrency: `commands con idempotency key; invitación dedupe por identity+opening+purpose; projection at-least-once con version/checkpoint; withdrawal gana sobre updates concurrentes`
- Audit/outbox/history: `append-only para consent/request/withdraw/availability/invite/read-sensitive; eventos sin PII y correlation id en cada consumer`

### Migration, backfill and rollout

- Migration posture: `additive + backfill reconciliable; sin mutation destructiva ni grant automático`
- Default state: `read-only/shadow; flags de projection, search e invite OFF; cohorte histórica no contactable por defecto`
- Backfill plan: `dry-run obligatorio, clasificación por purpose/evidencia, batch/checkpoint, allowlist de openings y reporte sin PII; apply sólo con Legal/Privacy y People sign-off`
- Rollback path: `flags OFF, detener consumer/reconciler, revocar capabilities y conservar schema/audit; no revertir por DELETE masivo`
- External coordination: `Legal/Privacy + abogado habilitado, People, Identity/Platform, Vercel/worker flags y actualización del aviso público mediante TASK-1724`

### Security and access

- Auth/access gate: `hiring.talent_pool.read | hiring.talent_pool.manage | hiring.talent_pool.invite, con grant a roles reales en el mismo PR y resource authorization por request`
- Sensitive data posture: `PII de candidatos; search/profile minimizados, contacto y CV fuera del DTO; purpose obligatorio para lecturas sensibles`
- Error contract: `invalid_request | unauthorized | forbidden | not_found | purpose_not_allowed | consent_required | consent_withdrawn | retention_expired | stale_evidence | conflict | rate_limited | dependency_unavailable`
- Abuse/rate-limit posture: `cursor/limit allowlisted, máximo de filtros/rows, rate limit por actor, anti-enumeration, no query libre SQL/vectorial y circuit breaker de dependencias`

### Runtime evidence

- Local checks: `unit/contract/property tests de lifecycle, dedupe, reason codes, filters, DTO anti-leak, idempotencia y concurrency`
- DB/runtime checks: `migration verify con rol no-owner, backfill dry-run/apply fixture, readback, withdrawal/expiry propagation y reconciliation`
- Integration checks: `Product/App API allow/deny, invite→HiringApplication, policy 1719 cuando exista, outbox y no-contact negativos`
- Reliability signals/logs: `hiring.talent_pool_projection_lag | hiring.talent_pool_consent_violation | hiring.talent_pool_duplicate_membership | hiring.talent_pool_access_denied | hiring.talent_pool_invite_reconciliation_failed`
- Production verification sequence: `shadow projection → internal read-only allowlist → legacy cohort sample → consent self-service → invitation canary; detener ante cualquier leak/contact violation`

### Acceptance criteria additions

- [x] Source of truth, contract surface y consumers usan Person/Candidate/Application existentes; no nace identidad paralela.
- [x] Invariantes, tenant/access, purpose, idempotencia, migration/backfill/rollback y runtime evidence están implementados y probados.
- [x] Capabilities y grants reales viajan en el mismo PR, con coverage test verde.
- [x] Todos los DTOs son allowlisted y los tests PII-sentinel prueban ausencia de contacto/CV/notas/economics.
- [x] Full API Parity se demuestra con un primitive compartido por UI, App API, Nexa y el adapter MCP dependiente.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

## Execution Audit — 2026-08-16

- Runtime verificado: `52` candidate facets, `52` applications y `51` personas; una persona ya prueba que el
  dedupe debe ocurrir por Person/facet, no por application.
- Los `52` facets dicen `consent_status='granted'`, pero `retention_policy` es nulo y el consentimiento corresponde
  al proceso de postulación. No es evidencia de `future_opportunities`.
- `candidate_facet` ya es único por `identity_profile_id`; crear otro root fue descartado.
- Assessments ya exponen resultados estructurados por competency; CV/documentos, respuesta abierta, contacto y
  notas permanecen fuera de la proyección.
- La App API ya tiene el patrón `runAppReadRoute → resource → primitive`; Hiring todavía no tiene Talent Pool ni
  provider MCP. El gateway no recibirá acceso DB.
- Decisión: ADR aceptado con activación de recontacto externo gated por Legal/Privacy. El foundation interno y el
  backfill fail-closed no dependen de inventar ese permiso.

## Execution Plan — slices aprobados por el objetivo activo

1. Aceptar ADR, field matrix, lifecycle, capabilities y taxonomías.
2. Crear migración aditiva de membership, consent ledger, evidence projection e idempotency/audit.
3. Implementar policy, stores y commands transaccionales; backfill siempre dry-run por defecto.
4. Implementar readers determinísticos, DTO allowlist, Product/App API y capability grants.
5. Implementar invitación canónica con confirmación/idempotencia, sin stage/test/email.
6. Probar migración, lifecycle/concurrency/PII/allow-deny, ejecutar shadow/backfill y cerrar señales/docs.

Checkpoint de riesgo: cualquier recontacto real queda deshabilitado hasta que Legal/Privacy valide el aviso, la
versión de política y el TTL; esta limitación no impide construir ni verificar la fundación interna.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — ADR, policy y schema acceptance

- Ejecutar reuse-check sobre `candidate_facet` y aceptar el ADR con membership grain, purposes, estados, TTL,
  retention, withdrawal, appeal/correction, evidencia permitida, owners y límites de automatización.
- Fijar capabilities, DTOs, reason/error taxonomy y matriz de campos por consumer antes de migrar.

### Slice 2 — Membership, consent ledger y migración aditiva

- Materializar aggregate/ledger sin duplicar Person ni contacto, con constraints y audit append-only.
- Implementar commands de consentimiento, retiro y disponibilidad con concurrency/idempotency tests.

### Slice 3 — Evidence projection y búsqueda read-only

- Proyectar referencias estructuradas de aplicaciones, assessments, decisiones e historia con coverage/freshness.
- Implementar `searchTalentPool` y `getTalentPoolProfile`, cursor estable, filtros allowlisted y reason codes.

### Slice 4 — Full API Parity y autorización

- Exponer Product API y App API sobre los primitives; registrar OpenAPI/contracts y capabilities/grants.
- Probar UI/Nexa/app/CLI harness sin acceso directo a stores ni lógica duplicada.

### Slice 5 — Invitación gobernada

- Implementar propose/confirm `inviteTalentToOpening`, dedupe y creación/reuse de `HiringApplication` canónica.
- Emitir audit/outbox y readback; coordinar con TASK-1719 sin asignar test desde esta task.

### Slice 6 — Backfill, reconciliation y rollout

- Ejecutar dry-run, revisar cohortes con People/Privacy, aplicar allowlist y reconciliar incrementos/withdrawals.
- Habilitar read-only antes de consent UI e invite; ejercitar rollback y señales antes de ampliar.

## Out of Scope

- UI pública o interna (TASK-1724/1725) y provider/tools MCP (TASK-1726).
- Lectura/chunking de CV, portfolio o respuestas abiertas (TASK-1718).
- Career Alerts/newsletters (TASK-1397/1398), sourcing externo, scraping o compra de bases.
- Auto-ranking, recommendation-to-reject, contratación, rechazo, stage move o assignment de assessment.
- Talent Assurance claims/outcomes, workforce placement, payroll, pricing o acceso de clientes externos.
- Embeddings/semantic search sobre PII o documentos; requiere threat model y task posterior.

## Detailed Spec

El lifecycle mínimo distingue `active_process`, `pool_eligible`, `needs_reconsent`, `paused`, `withdrawn` y
`expired`. El reader devuelve `discoverability`, `contactability`, `allowedActions`, `reasonCodes`, `policyVersion`,
`evidenceCoverage`, `freshness` y referencias opacas a aplicaciones. Un perfil histórico puede ser descubrible para
cerrar su proceso vigente y a la vez negar `invite/contact` por `needs_reconsent`.

La búsqueda V1 es estructurada y determinística. No indexa texto libre ni usa un LLM para ordenar. Si una capability,
idioma, seniority o disponibilidad no tienen evidencia gobernada, se informa `unknown`; nunca se infieren desde nombre,
foto, IP, prefijo telefónico o metadatos. El invite recibe sólo `talentProfileId`, `openingId`, purpose, proposal/authority
e idempotency; email, template, stage y assessment se derivan server-side.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3 → Slice 4 → Slice 5 → Slice 6.
- Search sólo puede servir tras policy/DTO/access; invite sólo tras search/readback y consent gate.
- Ningún backfill apply ni recontacto ocurre antes de revisión People + Legal/Privacy y smoke de withdrawal.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Recontactar sin purpose válido | privacy/hiring | medium | contactability fail-closed + confirm server-side | `hiring.talent_pool_consent_violation` |
| Duplicar persona o mezclar aplicaciones | identity/data | medium | unique identity grain + source refs + reconciliation | `hiring.talent_pool_duplicate_membership` |
| Exponer PII en búsqueda | API/UI/MCP | medium | DTO allowlist + sentinel/adversarial tests | `hiring.talent_pool_access_denied` + security capture |
| Evidencia stale presentada como verdad | hiring | medium | coverage/freshness y `unknown` explícitos | `hiring.talent_pool_projection_lag` |
| Invite crea aplicación duplicada | hiring/outbox | low | idempotency + unique semantic key + readback | `hiring.talent_pool_invite_reconciliation_failed` |

### Feature flags / cutover

- Flags separados para projection, search y invite; todos default `false` y registrados en el ledger.
- Retiro/contactability nunca se desactiva por flag. Rollback funcional = search/invite OFF, audit/retention siguen activos.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | Rechazar/revisar ADR antes de DDL | inmediato | sí |
| 2 | Flag OFF + revert code; conservar schema/ledger | <15 min | parcial, audit se conserva |
| 3 | Search/projection OFF + detener consumer | <10 min | sí |
| 4 | Deshabilitar routes/capabilities | <10 min | sí |
| 5 | Invite OFF; reconciliar propuestas incompletas | <10 min | parcial para aplicaciones ya creadas |
| 6 | Detener backfill/reconciler por checkpoint | <10 min | parcial; sin DELETE masivo |

### Production verification sequence

1. Aceptar ADR/policy y aprobar privacy field matrix.
2. Aplicar migración en staging, verificar constraints/audit con rol no-owner y flag OFF.
3. Ejecutar projection/backfill dry-run; revisar cohort counts y cero PII en reporte.
4. Habilitar shadow, comparar contra aplicaciones reales allowlisted y probar withdrawal/expiry.
5. Habilitar search a People allowlisted; ejecutar allow/deny/IDOR/PII/freshness.
6. Habilitar self-service TASK-1724 y verificar opt-in/withdrawal antes de invitation.
7. Habilitar invite a una opening sintética; verificar una sola application, outbox y readback.
8. Ampliar gradualmente y observar signals durante una ventana acordada.

### Out-of-band coordination required

- People define owner operativo y cohortes; Legal/Privacy y abogado habilitado validan purpose/retención/recontacto.
- Platform/Identity aprueban capabilities; Ops registra flags/worker; no hay correo masivo como parte del rollout.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] ADR Talent Pool aceptado antes de schema/API y registrado en `DECISIONS_INDEX.md`.
- [x] Una persona produce un solo perfil, con múltiples application/evidence refs sin copiar contacto ni CV.
- [x] Cohorte histórica queda clasificada por purpose y nadie recibe `pool_eligible` por backfill sin evidencia válida.
- [x] Consent, withdrawal, expiry y availability son versionados, idempotentes, auditados y propagables.
- [x] Search/profile entregan coverage/freshness/reasons y resultados determinísticos, paginados y anti-enumeration.
- [x] No se infieren ni filtran atributos protegidos; unknown/stale permanecen explícitos.
- [x] Product API y App API delegan a los mismos readers/commands y sus contratos/OpenAPI están versionados.
- [x] `hiring.talent_pool.read/manage/invite` tienen registry, grants de desarrollo y coverage tests en el mismo cambio.
- [x] Invite propose/confirm crea o reusa exactamente una `HiringApplication` y no asigna test por fuera de TASK-1719.
- [x] Audit/outbox no contienen PII; DTO/log/trace/cache pasan PII-sentinel y deletion/withdrawal propagation.
- [x] Backfill dry-run/apply/checkpoint/reconciliation y rollback fueron ejercitados en desarrollo.
- [x] Signals están registradas, visibles y steady=0 antes del rollout interno.
- [ ] Legal/Privacy + People sign-off y validación con abogado habilitado quedan registrados antes de recontacto productivo.
- [x] `pnpm task:lint --task TASK-1723` y gates backend/QA/docs aplicables pasan sin findings bloqueantes.

## Verification

- `pnpm task:lint --task TASK-1723`
- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- `pnpm qa:gates --changed`
- `pnpm docs:closure-check`
- migration/readback/backfill/reconciliation con PostgreSQL real y rol no-owner
- Product/App API contract + allow/deny/IDOR/PII/idempotency/concurrency smokes

## Closing Protocol

- [x] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [x] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [x] `docs/tasks/README.md` quedo sincronizado con el cierre
- [x] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [x] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [x] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [x] Arquitectura Hiring, API reference, manuales People y flag ledger reflejan runtime real.

## Follow-ups

- `TASK-1724` — consentimiento/autogestión del candidato.
- `TASK-1725` — Talent Pool Desk interno.
- `TASK-1726` — búsqueda/profile MCP delegada.
- Fuentes internas/bench/freelancers/partners se agregan por adapters posteriores; V1 cubre candidatos externos/históricos.

## Open Questions

- El ADR debe confirmar si `candidate_facet` puede alojar el lifecycle o si membership merece aggregate separado; no duplicar ambos.
- TTL V1 parte del baseline público de 12 meses, sujeto a validación jurídica y policy versionada antes del apply.
