# TASK-1735 — Hiring Application Evaluation Dossier (expediente de evaluación append-only)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `db`
- Epic: `EPIC-011`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crea el **Expediente de Evaluación** per-application en Hiring: tabla append-only
`greenhouse_hiring.hiring_application_note` con notas tipadas (`cv_analysis`,
`assessment_review`, `interview_note`, `general`), autor y cuerpo markdown, más su contrato
programático gobernado (`GET/POST /api/hiring/applications/[id]/notes`, command + reader
canónicos, capability nueva, evento outbox). Los análisis de evaluación (CV vs assessment,
notas de entrevista) dejan de vivir en chats efímeros y quedan persistidos, auditados y
disponibles para entrevista y decisión.

## Why This Task Exists

Caso real 2026-08-16 (EO-APP-0078): un análisis completo CV-vs-assessment producido durante
la corrección de un candidate test no tuvo dónde persistirse. El dominio hoy solo ofrece:
un campo escalar mutable `hiring_application.notes` (TASK-353) sin PATCH ni UI, el rationale
IA por respuesta en `hiring_assessment_ai_proposal` (TASK-1361, per-response, no
per-application), la razón de la decisión formal (`decide.ts`, solo al final del pipeline) y
el review packet del CV (TASK-1718, read-only, sin notas de analista). No existe una capa de
notas de evaluación estructuradas que acompañe a la application por el pipeline. El gap hace
que el criterio de evaluación se pierda entre etapas y que la entrevista/decisión no herede
el análisis previo.

## Goal

- Tabla append-only `greenhouse_hiring.hiring_application_note` operativa con trigger
  anti-mutación, tipos de nota con CHECK y grants sin UPDATE/DELETE.
- Primitive canónico server-side (`recordHiringApplicationNote` + `listHiringApplicationNotes`)
  con evento outbox sin PII, consumible por UI, Nexa y MCP por construcción (Full API Parity).
- API interna `GET/POST /api/hiring/applications/[id]/notes` gateada por capability, con
  contrato de errores canónico.
- Boundaries de privacidad declarados y verificados: internal-only, nunca candidate-facing,
  nunca dentro del review packet MCP de TASK-1718, sin atributos demográficos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` (dominio + §Candidate document capture)
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`

Reglas obligatorias:

- Append-only real: sin UPDATE/DELETE en grants ni en código; corrección = nota nueva que
  referencia la anterior.
- Internal-only por diseño: ninguna nota llega a superficie candidate-facing (TASK-1729/1730
  lo exigen para el estado público) ni al review packet MCP (TASK-1718 excluye "notas
  internas libres" de su allowlist — esta task preserva esa exclusión).
- Payload de outbox sin PII: solo IDs (patrón TASK-1689); el consumer re-lee de PG si necesita.
- Las notas son narrativa, no score: no tocan `score`/`match_score`/`explainability_json`
  (rollup de TASK-1360) ni duplican el rationale del proposal ledger de TASK-1361 (si una
  nota nace de una sugerencia IA, referencia el `proposal_id` en `context_json`).
- Errores API vía `canonicalErrorResponse`/`toHiringErrorResponse`; nada de prose en inglés.

## Normative Docs

- `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md` (patrón outbox + capability⇒grant+coverage)
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `greenhouse_hiring.hiring_application` (TASK-353, `migrations/20260707235655376_task-353-hiring-ats-domain-foundation.sql`)
- Patrón seed de capability: `migrations/20260815175034133_task-1714-candidate-identity-reveal-capability.sql`
- Patrón tabla append-only del dominio: `migrations/20260816084127971_task-1726-talent-pool-access-audit.sql` (trigger guard + grants) y `migrations/20260816123000000_task-1718-candidate-review-packet.sql`
- Catálogo de eventos: `src/lib/sync/event-catalog.ts` (bloque hiring)

### Blocks / Impacts

- Follow-up UI (`ui-ux`): tab/sección "Expediente" en `Application360View.tsx` — se crea como
  task consumer cuando exista dirección de diseño (esta task deja el contrato listo).
- TASK-1718 (in-progress): NO se modifica su packet; el test de allowlist debe seguir verde
  demostrando que las notas quedan fuera.
- TASK-1721 (to-do, selection journey): podrá leer el expediente como insumo del debrief; no
  se adelantan sus gates.
- TASK-1734 (to-do, AI scoring at scale): comparte el principio "resultado/rationale nunca
  candidate-facing"; sin archivos compartidos.

### Files owned

- `migrations/` (nueva migración TASK-1735)
- `src/lib/hiring/application-notes.ts` (nuevo) + `src/lib/hiring/index.ts` (delta export)
- `src/app/api/hiring/applications/[id]/notes/route.ts` (nuevo)
- `src/types/hiring.ts` (delta: tipos de nota)
- `src/config/entitlements-catalog.ts` (delta: capability nueva)
- `src/lib/entitlements/runtime.ts` (delta: grant)
- `src/lib/sync/event-catalog.ts` (delta: evento nuevo)
- `docs/documentation/hr/` (delta funcional) + `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` (delta §Expediente)

## Current Repo State

### Already exists

- Store del dominio con patrón tx + outbox: `src/lib/hiring/store.ts` (`runQuery` :42,
  `publishOutboxEvent` dentro de la misma tx, p.ej. :712-716; catch `23505` para carreras).
- Campo escalar mutable `hiring_application.notes` (TASK-353) — nota simple, sin autor, sin
  historia; coexiste, no se migra.
- Rationale IA per-response: `greenhouse_hiring.hiring_assessment_ai_proposal` (TASK-1361,
  append-only, flag `HIRING_ASSESSMENT_AI_ENABLED`).
- Razón de decisión formal replay-safe: `src/lib/hiring/decide.ts` (snapshot en la application).
- Patrón API canónico: `src/app/api/hiring/applications/[id]/route.ts`
  (`requireInternalTenantContext` → `can()` → `canonicalErrorResponse`/`toHiringErrorResponse`).
- 20 capabilities `hiring.*` en `src/config/entitlements-catalog.ts:2205-2242` con grants en
  `src/lib/entitlements/runtime.ts` (tier operador :525-588; tier gobernanza role-only :594-655)
  y coverage test `src/lib/entitlements/capability-grant-coverage.test.ts`.
- Tablas append-only gemelas con trigger guard en el mismo schema:
  `talent_pool_access_audit` (función `greenhouse_hiring.prevent_talent_pool_history_mutation`)
  y `candidate_review_access_audit`.
- Vista `src/views/greenhouse/hiring/Application360View.tsx` con tabs
  (`overview|assessment|documents|decision|activity`); el tab `activity` es un timeline
  sintético sin persistencia — superficie natural del futuro consumer UI.
- Review packet agent-safe TASK-1718: `src/lib/hiring/candidate-review/` + lane
  `src/app/api/platform/app/hiring/.../review-packet/route.ts` (excluye notas internas).
- Copy dictionaries del dominio: `src/lib/copy/dictionaries/es-CL/{hiringDesk,hiringAssessment}.ts`.

### Gap

- No existe tabla de notas de evaluación per-application, ni endpoint `notes`, ni evento
  `hiring.application.note_*`, ni capability de anotación: el expediente es greenfield sobre
  patrones ya establecidos.

## Modular Placement Contract

- Topology impact: `portal`
- Current home: `src/lib/hiring/** + src/app/api/hiring/** (runtime portal Vercel)`
- Future candidate home: `domain-package`
- Boundary: `command recordHiringApplicationNote + reader listHiringApplicationNotes; consumers autorizados: API interna hiring, futura UI Application 360 y lane MCP gobernado`
- Server/browser split: `dominio y stores server-only ('server-only' en src/lib/hiring); el browser consume la API route`
- Build impact: `none`
- Extraction blocker: `transaccion PG compartida con hiring_application y outbox en la misma tx`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `db`
- Source of truth afectado: `greenhouse_hiring.hiring_application_note` (nueva tabla)
- Consumidores afectados: `API interna hiring; futura UI Application 360; Nexa/MCP vía contrato gobernado (follow-up)`
- Runtime target: `local → staging → production (portal Vercel)`

### Contract surface

- Contrato existente a respetar: `src/app/api/hiring/applications/[id]/route.ts` (auth/capability/error pattern) + `src/lib/hiring/error-response.ts`
- Contrato nuevo o modificado: `GET/POST /api/hiring/applications/[id]/notes` + command `recordHiringApplicationNote` + reader `listHiringApplicationNotes` + evento `hiring.application.note_recorded`
- Backward compatibility: `compatible` (aditivo; el campo escalar `notes` de TASK-353 no se toca)
- Full API parity: `la lógica vive en src/lib/hiring/application-notes.ts; la ruta API es un consumer delgado; la futura UI y el lane MCP consumen el mismo primitive`

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_hiring.hiring_application_note` (nueva); FK a `greenhouse_hiring.hiring_application`
- Invariantes que no se pueden romper:
  - Append-only: trigger `BEFORE UPDATE OR DELETE` que aborta; grants solo `SELECT, INSERT`.
  - `kind` restringido por CHECK a `('cv_analysis','assessment_review','interview_note','general')`.
  - `body_md` no vacío y ≤ 8000 chars (CHECK).
  - `author_user_id` obligatorio; `source` CHECK `('human','agent')`.
  - Internal-only: ninguna ruta pública/candidate-facing ni el review packet de TASK-1718 exponen filas de esta tabla.
  - Sin atributos demográficos en el cuerpo (boundary de fairness TASK-1365 — regla documental + copy del manual; no hay parser).
  - No duplica rationale IA: nota derivada de una sugerencia referencia `proposal_id` en `context_json`.
- Tenant/space boundary: `requireInternalTenantContext` + validación de que la application existe; sin scoping adicional (dominio interno single-tenant operador)
- Idempotency/concurrency: `INSERT único en una tx corta; un reintento crea una segunda nota visible (benigno: narrativa append-only, sin side effects financieros ni de estado); sin idempotency key por diseño declarado`
- Audit/outbox/history: `evento outbox hiring.application.note_recorded con payload {noteId, applicationId, kind, actorUserId} — IDs only, sin cuerpo`

### Migration, backfill and rollout

- Migration posture: `additive` (una tabla nueva + seed de capability; sin backfill)
- Default state: `enabled con rationale: superficie interna gateada por capability; sin flag porque es aditiva y sin consumers previos`
- Backfill plan: `none — tabla nace vacía`
- Rollback path: `revert PR + down migration (DROP TABLE + deprecate capability)`
- External coordination: `none — repo + Cloud SQL únicamente`

### Security and access

- Auth/access gate: `lectura: capability hiring.application.read; escritura: capability nueva hiring.application.annotate (execute) granteada en el mismo PR al tier gobernanza (EFEONCE_ADMIN, HR_MANAGER, EFEONCE_OPERATIONS)`
- Sensitive data posture: `las notas son datos personales de evaluación del candidato: internal-only, sin demográficos, sin exposición pública ni MCP; sin valores de identidad legal`
- Error contract: `canonicalErrorResponse + toHiringErrorResponse; HiringValidationError con codes estables; captureWithDomain para fallas`
- Abuse/rate-limit posture: `sin rate limit dedicado — superficie interna capability-gated de bajo volumen; CHECK de longitud acota el payload`

### Runtime evidence

- Local checks: `vitest focal de application-notes (command/reader/validaciones) + capability-grant-coverage.test.ts verde`
- DB/runtime checks: `bloque DO anti pre-up-marker en la migración + SELECT post-migrate contra information_schema + pnpm db:generate-types`
- Integration checks: `pnpm staging:request POST /api/hiring/applications/<id>/notes + GET de vuelta con la persona agente superadmin`
- Reliability signals/logs: `sin signal nuevo — el evento outbox queda observable vía sync.outbox.* existentes; rationale: superficie interna sin SLA propio`
- Production verification sequence: `ver Rollout Plan`

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] **Lógica en el primitive, no en la UI.** Command/reader en `src/lib/hiring/application-notes.ts`.
- [ ] **Modelada como aggregate/recurso/command**, no como click-handler.
- [ ] **Read** como reader canónico; **write** como command con capability fina, errores canónicos y outbox.
- [ ] **Capability + grant en el MISMO PR**: registry + catalog TS + grant a ≥1 rol real + coverage test (TASK-873/935).
- [ ] **Camino programático declarado:** API interna ahora; lane `api/platform/app`/MCP como follow-up explícito con boundary de privacidad.
- [ ] **Write apto para `propose → confirm → execute`** (una nota propuesta por agente la confirma un humano; el command es el punto único de mutación).
- [ ] **Un primitive, muchos consumers:** cero lógica duplicada por consumer.
- [ ] **Parity check = SÍ** al cierre.

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

### Slice 1 — Migración + capability

- Migración `pnpm migrate:create task-1735-hiring-application-note`: tabla
  `greenhouse_hiring.hiring_application_note` (`note_id` `'hnote-' || gen_random_uuid()`,
  `application_id` FK, `kind` CHECK, `body_md` CHECK no vacío ≤8000, `author_user_id`,
  `source` CHECK `('human','agent')`, `context_json JSONB DEFAULT '{}'`, `created_at`),
  índice `(application_id, created_at DESC)`, trigger append-only (mirror del patrón
  `talent_pool_access_audit`), `OWNER TO greenhouse_ops`, `GRANT SELECT, INSERT` a runtime,
  bloque DO anti pre-up-marker; Down = DROP.
- Seed de capability `hiring.application.annotate` en `capabilities_registry`
  (patrón TASK-1714) + entry en `entitlements-catalog.ts` + grant tier gobernanza en
  `runtime.ts` + `capability-grant-coverage.test.ts` verde.
- `pnpm db:generate-types` y commit conjunto.

### Slice 2 — Primitive de dominio + evento

- `src/lib/hiring/application-notes.ts` (`import 'server-only'`): command
  `recordHiringApplicationNote({applicationId, kind, bodyMd, authorUserId, source, contextJson?})`
  con validaciones (`HiringValidationError` codes estables), verificación de application
  existente, INSERT + `publishOutboxEvent` en la misma tx; reader
  `listHiringApplicationNotes(applicationId)` ordenado `created_at DESC`.
- Evento `hiringApplicationNoteRecorded: 'hiring.application.note_recorded'` en
  `src/lib/sync/event-catalog.ts` (no reactivo: sin consumer, sin email).
- Tipos en `src/types/hiring.ts` + tests unitarios focales.

### Slice 3 — API routes

- `src/app/api/hiring/applications/[id]/notes/route.ts`: GET (capability
  `hiring.application.read`) → lista; POST (capability `hiring.application.annotate`) →
  crea y retorna la nota; body inválido → `hiringInvalidBodyResponse`; errores →
  `toHiringErrorResponse`.
- Test del route handler + verificación de que el review packet de TASK-1718 sigue sin
  exponer notas (su test de allowlist permanece verde sin modificación).

### Slice 4 — Documentación y cierre

- Delta §Expediente de Evaluación en `GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`;
  delta funcional en `docs/documentation/hr/`; nota de manual breve (cómo registrar/leer
  notas vía API) en `docs/manual-de-uso/hr/` o delta al manual de Hiring existente.
- Registry/README/EPIC-011/Handoff/changelog sincronizados; chequeo de impacto cruzado
  (delta en TASK-1721 si aplica).

## Out of Scope

- La UI del expediente (tab/sección en Application 360) — task consumer `ui-ux` follow-up
  con su wireframe robusto y dirección de diseño.
- Exponer notas en el review packet MCP de TASK-1718 o en cualquier lane
  `api/platform/app|ecosystem` — decisión futura con audit content-free propio.
- Edición o borrado de notas (append-only; corrección = nota nueva).
- Cualquier superficie candidate-facing, email o notificación derivada de notas.
- Migrar o deprecar el campo escalar `hiring_application.notes` de TASK-353.
- Generación automática de notas por IA (el command acepta `source='agent'`, pero el flujo
  agéntico gobernado es follow-up).

## Detailed Spec

Modelo de datos (referencia para el agente; el DDL final vive en la migración):

```sql
CREATE TABLE greenhouse_hiring.hiring_application_note (
  note_id         TEXT PRIMARY KEY DEFAULT ('hnote-' || gen_random_uuid()::text),
  application_id  TEXT NOT NULL REFERENCES greenhouse_hiring.hiring_application(application_id) ON DELETE RESTRICT,
  kind            TEXT NOT NULL CHECK (kind IN ('cv_analysis','assessment_review','interview_note','general')),
  body_md         TEXT NOT NULL CHECK (length(body_md) BETWEEN 1 AND 8000),
  author_user_id  TEXT NOT NULL,
  source          TEXT NOT NULL DEFAULT 'human' CHECK (source IN ('human','agent')),
  context_json    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

`context_json` transporta referencias opcionales (`{"assessmentId": "asmt-…"}`,
`{"proposalId": "aip-…"}`, `{"supersedesNoteId": "hnote-…"}`) — nunca cuerpos duplicados.

Relación con superficies vecinas (sinergias EPIC-011):

| Vecino | Relación |
|---|---|
| Scorecard entrevistador (TASK-1360) | Las notas `interview_note` son narrativa; los ratings viven en `hiring_assessment_response`. El invariante anti-anclaje del scorecard no se debilita: una nota no expone ratings ajenos pre-submit (ver Open Questions). |
| Proposal ledger IA (TASK-1361) | Nota derivada de IA referencia `proposalId`; no copia rationale. |
| Review packet MCP (TASK-1718) | Exclusión preservada: notas jamás en el packet. |
| Decisión formal (`decide.ts`) | La razón de decisión no es una nota; el expediente puede mostrarla read-only en la UI futura. |
| Talent Pool (TASK-1723) | Las notas no alimentan búsqueda ni evidencia del pool. |
| Fairness (TASK-1365) | Prohibido capturar atributos demográficos en notas (regla documental + manual). |
| Cuenta candidata (TASK-1729/1730) | El estado público nunca filtra notas — la tabla nace internal-only. |

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (migración + capability) → Slice 2 (primitive + evento) → Slice 3 (API) → Slice 4 (docs/cierre).
- Slice 3 no puede mergearse sin el coverage test de capability verde de Slice 1 (una ruta
  gateada por capability sin grant es una ruta muerta).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Notas se filtran a superficie agéntica (review packet / lane app) | identity | low | No se toca el packet; test de allowlist TASK-1718 permanece verde; Out of Scope explícito | no signal — emerge en review del PR y test de allowlist |
| PII en payload de outbox | outbox | low | Payload IDs-only por contrato (patrón TASK-1689) + test del command | no signal — emerge en test focal |
| Capability sin grant (ruta muerta) o grant demasiado amplio | identity | low | `capability-grant-coverage.test.ts` + grant tier gobernanza explícito en el PR | test rojo en CI |
| Nota `interview_note` debilita anti-anclaje del scorecard | UI | medium | Notas no renderizan ratings ajenos; Open Question para el consumer UI antes de exponer notas cross-evaluador pre-submit | no signal — gate documental en la task UI |
| Migración registrada sin ejecutar (pre-up-marker bug) | migration | low | Bloque DO con RAISE EXCEPTION + SELECT post-migrate | migración falla loud en apply |

### Feature flags / cutover

Sin flag — additive, immediate cutover: tabla nueva sin consumers previos, superficie
interna gateada por capability. El "flag" efectivo es el grant de la capability
`hiring.application.annotate` (revocable vía entitlements governance sin deploy).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | `pnpm migrate:down` (DROP TABLE) + revert PR + deprecate capability en registry | <15 min | si |
| Slice 2 | revert PR (primitive sin consumers aún) | <10 min | si |
| Slice 3 | revert PR (ruta aditiva gateada) | <10 min | si |
| Slice 4 | revert de docs | <5 min | si |

### Production verification sequence

1. `pnpm pg:connect:migrate` en staging + SELECT contra `information_schema.tables` y
   `pg_trigger` verificando tabla + trigger append-only.
2. Deploy a staging + `pnpm staging:request POST /api/hiring/applications/<id-test>/notes`
   con la persona agente superadmin → 200 con nota; GET → la lista; intento UPDATE/DELETE
   directo por SQL (sesión ops) → rechazado por trigger.
3. Verificar con la persona `agent-collaborator` (sin capability) → 403 canónico.
4. Verificar que `GET /api/platform/app/hiring/applications/[id]/review-packet` NO incluye
   notas (allowlist TASK-1718 intacta).
5. Promoción a producción vía release control plane; repetir smoke 2-4 en prod con una
   application de prueba.

### Out-of-band coordination required

N/A — repo-only change (migración Cloud SQL vía carril canónico incluida; sin secrets,
sin providers externos, sin coordinación de operadores más allá del manual nuevo).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `greenhouse_hiring.hiring_application_note` existe con CHECKs de `kind`/`body_md`/`source`, trigger append-only activo y grants sin UPDATE/DELETE (verificado por SELECT a catálogos PG).
- [ ] Capability `hiring.application.annotate` seedeada en registry + catalog TS + grant al tier gobernanza en el mismo PR, con `capability-grant-coverage.test.ts` verde.
- [ ] `recordHiringApplicationNote` inserta y publica `hiring.application.note_recorded` (payload IDs-only) en la misma transacción; test focal lo demuestra.
- [ ] `POST /api/hiring/applications/[id]/notes` retorna 403 canónico sin capability, 400 canónico con body inválido, 200 con nota creada; `GET` lista ordenada `created_at DESC`.
- [ ] El review packet de TASK-1718 sigue sin exponer notas (test de allowlist verde sin modificación).
- [ ] Smoke staging ejecutado con evidencia (`staging:request` POST + GET + 403 de persona sin capability).
- [ ] Documentación triple proporcional actualizada (delta arquitectura + funcional + manual).

## Verification

- `pnpm local:check` (lint + tsc)
- `pnpm vitest run src/lib/hiring src/lib/entitlements` (focal)
- `pnpm migrate:status` + SELECT de verificación post-migrate
- `pnpm test` + `pnpm build` como gate final de cierre (TASK_CLOSING_QUALITY_GATE_V1)
- Smoke staging vía `pnpm staging:request` (secuencia del Rollout Plan)

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] EPIC-011 actualizado con el estado de esta task y el follow-up UI declarado
- [ ] Migración verificada aplicada en staging y producción (no solo "Migrations complete!")

## Follow-ups

- Task consumer `ui-ux`: tab/sección "Expediente" en Application 360 (wireframe robusto +
  dirección de diseño + GVC; el tab `activity` sintético existente es el punto de anclaje).
- Decisión gobernada sobre exponer notas read-only en lane `api/platform/app`/MCP con audit
  content-free (hoy excluido por diseño).
- Flujo agéntico `propose → confirm → execute` para notas generadas por Nexa/agentes
  (`source='agent'` ya soportado por el command).

## Delta 2026-08-16

- Frontera con `TASK-1734` (AI Scoring at Scale) declarada en ambas direcciones tras su auditoría cross-task: el
  manifest/audit del run de 1734 registra HECHOS estructurados (IDs, digests, reason codes, actor); la narrativa del
  revisor al resolver un `mandatory_review` vive como nota `kind=assessment_review` de ESTE expediente con
  `context_json.{runId,proposalId}`. Un solo hábitat por tipo de contenido — el expediente no duplica el manifest y
  el manifest no acumula prosa. 1734 referencia esta task en sus Normative Docs y Blocks/Impacts.

## Open Questions

- Visibilidad de `interview_note` entre evaluadores antes del submit del scorecard propio:
  el invariante anti-anclaje de TASK-1360 aplica a ratings; decidir en la task UI si las
  notas de entrevista se ocultan cross-evaluador hasta el debrief para no debilitar su
  espíritu.
- Retención/redacción: si el candidato ejerce derechos de privacidad, definir con
  `legal-privacy-ip-operator` el tratamiento del expediente (fuera de alcance aquí; las
  notas no guardan identidad legal ni demográficos).
