# TASK-1873 — Intake de postulaciones: el enlace descartado queda visible como `intakeWarnings` application-scoped

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `migration`
- Epic: `EPIC-011`
- Status real: `Diseño — el parser tolerante (ISSUE-172, release 586a8627568a) descarta el enlace en silencio; nada implementado de la transparencia`
- Rank: `TBD`
- Domain: `hr|growth|data`
- Blocked by: `none`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Desde `ISSUE-172`, `normalizeOptionalHttpsUrl` (`src/lib/hiring/public-careers/schema.ts`) descarta un
`linkedinUrl`/`portfolioUrl` peligroso o ilegible (`javascript:`, `data:`, sin host con punto) y la postulación sigue —
correcto— pero el descarte no deja rastro: la application nace con el campo en `null` y Application 360 muestra «Sin
enlaces públicos informados» aunque el candidato SÍ informó uno. Esta task hace que el normalizador devuelva
`{ url, discarded? }`, que el parser exponga `intakeWarnings` (códigos cerrados, NUNCA el raw: un `javascript:`
guardado es un vector si alguna vez se renderiza), que `submitPublicHiringApplication` lo persista application-scoped
en `greenhouse_hiring.hiring_application.intake_warnings` (mismo criterio que `candidate_message`: es contexto de ESTA
postulación, no del perfil) y que el reader canónico (`getHiringApplicationById` → `HiringApplication.intakeWarnings`)
lo exponga para todos los consumers. Migración expand-only. La superficie visible la construye `TASK-1874`.

## Why This Task Exists

- Dos personas reales perdieron su postulación el 2026-09-11 por un `linkedin.com/in/x` sin `https://`. La capa 3 del
  fix (`ISSUE-172`) resolvió la pérdida —el enlace ya no tumba la postulación— pero creó un silencio nuevo: cuando el
  enlace no puede volverse seguro, se descarta y nadie se entera. El reclutador lee «Sin enlaces públicos informados» y
  no pide el enlace en el primer contacto porque cree que no existió.
- La revisión de dominio (talento) y la de arquitectura del 2026-09-12 lo marcaron como follow-up IMPORTANTE con
  diseño: `{ url, discarded? }` + `intakeWarnings` sin raw + persistencia application-scoped + Application 360 lo dice
  (`ISSUE-172` §Follow-ups de la revisión).
- En el carril Growth Forms el raw sobrevive en `greenhouse_growth.form_submission.normalized_fields_json`; en el carril
  Careers estándar no sobrevive en ninguna parte (`hiring_application_intake_events` sólo guarda hashes y `outcome`).
  La verdad que necesita el operador no es el raw —que no debe renderizarse— sino el hecho «informó un enlace y no
  pudimos leerlo».
- Full API Parity: la transparencia es un dato del contrato de lectura de la postulación, no un adorno de la vista.
  Nexa, MCP (`TASK-1718`), People 360 (`TASK-1732`) y la UI deben leer el mismo campo del mismo reader.

## Goal

- `normalizeOptionalHttpsUrl(raw)` devuelve `{ url: string | null; discarded?: true }` y distingue «vacío» de
  «informado y descartado».
- `parsePublicHiringApplication` expone `intakeWarnings: HiringIntakeWarning[]` con códigos cerrados
  (`url_discarded` × `linkedinUrl` | `portfolioUrl`) y sin el valor crudo; ambas entradas públicas (Careers estándar y
  Growth Forms) lo producen por construcción.
- `hiring_application.intake_warnings` (JSONB, nullable, expand-only) persiste el arreglo sólo cuando no está vacío;
  `HiringApplication.intakeWarnings` lo expone en el reader canónico con parse defensivo.
- La aplicación nunca deja de aceptarse por un warning; el warning nunca contiene PII ni el raw; un scheme inseguro
  jamás llega a la base.
- Entry parity intacta: los tests de paridad entre entradas siguen verdes con el campo nuevo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md` — la postulación extiende Persona/facet, no crea identidad
  paralela.
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` — §Candidate document capture, §Delta 2026-08-18
  (`data_origin` ⊥ `source`), contrato público de Careers y privacidad del candidato.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — el reader es el primitive; UI/Nexa/MCP son consumers.
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md` — `pnpm migrate:create`, expand antes del deploy, markers.
- `docs/architecture/agent-invariants/SQL_DATE_MATH_AGENT_INVARIANTS.md` — ejercitar el SQL nuevo contra PG real.

Reglas obligatorias:

- **NUNCA** persistir ni exponer el valor crudo del enlace descartado en ningún campo, log, señal o evidencia: sólo
  `code` + `field`. El raw del carril Growth sigue donde está (`normalized_fields_json`) y no se copia.
- **NUNCA** rechazar la postulación por un warning; `intakeWarnings` es informativo, no bloqueante.
- **NUNCA** persistir un scheme distinto de `https:` (invariante de `ISSUE-172`); el warning no cambia eso.
- **NUNCA** escribir en `candidate_facet` desde esta task: el warning es de la postulación (application-scoped), igual
  que `candidate_message` (TASK-1688); el facet conserva `portfolio_url`/`linkedin_url` como hoy.
- **NUNCA** escribir `hiring_application` fuera de `createHiringApplication` (`src/lib/hiring/store.ts`); el command
  público pasa el campo por su input, no por SQL propio.
- **SIEMPRE** `pnpm migrate:create` para el archivo; `-- Up Migration` primero; bloque `DO` anti pre-up-marker;
  `pnpm db:generate-types` después de aplicar.
- **SIEMPRE** aplicar la migración (expand) en la única instancia ANTES de pushear el código que inserta la columna:
  el push a `develop` despliega el `ops-worker`, y `growth_hiring_application_from_submission` insertaría contra una
  columna inexistente.

## Normative Docs

- `docs/issues/resolved/ISSUE-172-talent-pool-public-id-lpad-truncation-collision.md` — §Las tres capas del rechazo por
  URL, §Fix capa 3, §Follow-ups de la revisión de dominio y de arquitectura (diseño de esta task).
- `docs/tasks/complete/TASK-1688-careers-application-contact-completeness.md` — precedente de campo application-scoped
  (`candidate_message`) y de expand/contract en el parser.
- `migrations/20260708161236367_task-1367-careers-apply-intake.sql` — command canónico del apply público y ledger
  `hiring_application_intake_events` (sin PII).
- `docs/documentation/hr/careers-publicas.md` y `docs/manual-de-uso/hr/operar-careers-publicas.md` — reciben el delta
  funcional.
- `docs/operations/TASK_CLOSING_QUALITY_GATE_V1.md`.

## Dependencies & Impact

### Depends on

- `src/lib/hiring/public-careers/schema.ts` (`normalizeOptionalHttpsUrl`, `parsePublicHiringApplication`,
  `NormalizedApplicationInput`).
- `src/lib/hiring/public-careers/submit-application.ts` (`submitPublicHiringApplication` → `createHiringApplication`).
- `src/lib/hiring/store.ts` (`HiringApplicationRow`, `HIRING_APPLICATION_COLUMNS` L483, `normalizeHiringApplication`
  L432, `createHiringApplication` INSERT L1268-1285, `getHiringApplicationById` L647).
- `src/types/hiring.ts` (`HiringApplication` L335, `HiringDeskApplicationSummary` L413).
- `greenhouse_hiring.hiring_application` (TASK-353 foundation; `candidate_message` desde
  `migrations/20260812094000000_task-1688-careers-contact-completeness.sql`).
- `src/lib/sync/projections/growth-hiring-application-from-submission.ts` (segunda entrada: llama al MISMO parser y
  command con `normalized_fields_json`).
- Allowlist de escritura del dominio en `src/lib/hiring/boundary-domain.test.ts` (`greenhouse_hiring.hiring_application`
  ya declarada; sin tabla nueva).

### Blocks / Impacts

- `TASK-1874` (ui-ux, consumer): Application 360 renderiza el aviso desde `item.application.intakeWarnings`; bloqueada
  por esta task.
- `TASK-1718` (MCP candidate review packet, `in-progress`): su reader no expone enlaces hoy; si los expone, debe
  exponer también `intakeWarnings` (Delta informativo, sin cambio acá).
- `TASK-1729` (candidate self-service, `to-do`): el candidato podría ver su propio warning y corregir el enlace; queda
  como Delta, fuera de este alcance.
- `TASK-1732`/`TASK-1733` (People 360 longitudinal): consumen `HiringApplication` y heredan el campo sin trabajo extra.
- `docs/documentation/hr/careers-publicas.md`, `docs/manual-de-uso/hr/operar-careers-publicas.md`,
  `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`: delta funcional/técnico.

### Files owned

- `src/lib/hiring/public-careers/schema.ts` + `schema.test.ts`
- `src/lib/hiring/public-careers/submit-application.ts` + `submit-application.test.ts` +
  `submit-application.live.test.ts`
- `src/lib/hiring/public-careers/migration.live.test.ts` (caso de la columna nueva)
- `src/lib/hiring/store.ts`
- `src/types/hiring.ts` (`HiringIntakeWarning`, `HIRING_INTAKE_WARNING_CODES`, `HiringApplication.intakeWarnings`)
- `migrations/<timestamp>_task-1873-hiring-application-intake-warnings.sql` (generada con `pnpm migrate:create`)
- `src/types/db.d.ts` (regenerado con `pnpm db:generate-types`)
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` (delta)
- `docs/documentation/hr/careers-publicas.md`, `docs/manual-de-uso/hr/operar-careers-publicas.md` (delta)

## Current Repo State

### Already exists

- `normalizeOptionalHttpsUrl(raw): string | null` (`schema.ts` L54-78): sin scheme → https; `http://` → https;
  `isSafeHttpUrl` exige `https:`; host sin punto → `null`; href canónico sin barra final en origen pelado. Devuelve
  `null` tanto para «vacío» como para «descartado».
- `parsePublicHiringApplication` (L100-170) llama al normalizador para `portfolioUrl` y `linkedinUrl` (L125-126) y
  nunca rechaza por ellos; `NormalizedApplicationInput` (L86-100) no tiene campo de warnings.
- `submitPublicHiringApplication` (`submit-application.ts` L121-254): Person → facet (`reconcileCandidateFacet` con
  `portfolioUrl`/`linkedinUrl`) → `ensureTalentPoolMembership` → `createHiringApplication` con `candidateMessage:
  input.message ?? null` (L212-222); en duplicado (409) NO actualiza la application existente (L237-252).
- `createHiringApplication` (`store.ts` L1268-1285) inserta 14 columnas incluida `candidate_message`;
  `normalizeHiringApplication` (L432) mapea `candidate_message` → `candidateMessage`; `explainability_json` es el
  precedente JSONB de la tabla.
- `growth-hiring-application-from-submission.ts` L95-114: mismo parser + mismo command (entry parity por construcción).
- Tests: `schema.test.ts` (peligrosas descartadas sin rechazar, `linkedin.com/in/ada`, http elevado),
  `submit-application.test.ts`, `submit-application.live.test.ts` y `migration.live.test.ts` (gated por
  `GREENHOUSE_POSTGRES_*`).
- `hiring_application_intake_events` (TASK-1367): ledger sin PII (hashes + `outcome`), sin FK a la application; no es
  el hogar del warning.

### Gap

- No hay forma de distinguir «no informó» de «informó y no pudimos leerlo» en ningún contrato.
- No hay columna ni campo de tipo para el warning; el reader no lo expone; las dos entradas lo pierden.
- No hay test que fije que el raw NO se persiste.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/hiring/public-careers/**` (parser + command) y `src/lib/hiring/store.ts` (persistencia y reader), ambos ejecutados en Vercel (ruta pública de apply) y en el `ops-worker` (projection de Growth Forms)
- Future candidate home: `domain-package`
- Boundary: contrato `NormalizedApplicationInput.intakeWarnings` producido por `parsePublicHiringApplication` y consumido sólo por `submitPublicHiringApplication`; contrato de lectura `HiringApplication.intakeWarnings` expuesto por `getHiringApplicationById`/`getHiringDeskSnapshot` y consumido por Application 360, People 360 y cualquier reader MCP de la postulación
- Server/browser split: parser, command y store son server-only; el browser sólo recibe el arreglo de warnings serializado dentro del view model de la postulación
- Build impact: none — sin dependencias nuevas; migración SQL + tipos regenerados
- Extraction blocker: none — el dominio Hiring ya tiene boundary test propio y la columna vive en su schema

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `migration`
- Source of truth afectado: `greenhouse_hiring.hiring_application` (columna nueva `intake_warnings`) y el parser público
  de postulaciones (`schema.ts`)
- Consumidores afectados: ruta pública de apply (Careers estándar), projection
  `growth_hiring_application_from_submission` (Growth Forms), reader de Application 360 / Hiring Desk, People 360,
  readers MCP de la postulación
- Runtime target: `production` (Vercel) + `worker` (`ops-worker`) + `local` (migración vía `pnpm pg:connect:migrate`)

### Contract surface

- Contrato existente a respetar: `normalizeOptionalHttpsUrl`, `parsePublicHiringApplication` (nunca revela cuál campo
  falló al público), `submitPublicHiringApplication` (multi-step idempotente; 409 → `accepted` genérico),
  `createHiringApplication`, `HiringApplication`, allowlist de escritura del dominio
- Contrato nuevo o modificado: (a) `normalizeOptionalHttpsUrl(raw): { url: string | null; discarded?: true }`;
  (b) `NormalizedApplicationInput.intakeWarnings: HiringIntakeWarning[]`; (c) tipo `HiringIntakeWarning = { code:
  'url_discarded'; field: 'linkedinUrl' | 'portfolioUrl' }` con `HIRING_INTAKE_WARNING_CODES` cerrado; (d) columna
  `hiring_application.intake_warnings JSONB NULL` con `CHECK (intake_warnings IS NULL OR jsonb_typeof(intake_warnings) =
  'array')`; (e) `createHiringApplication` input `intakeWarnings?: HiringIntakeWarning[] | null`; (f)
  `HiringApplication.intakeWarnings: HiringIntakeWarning[]` (vacío cuando `NULL`)
- Backward compatibility: `compatible` — el único caller de `normalizeOptionalHttpsUrl` es el parser; las filas
  existentes leen `[]`; `HiringDeskApplicationSummary` no cambia de forma (el campo viaja dentro de `application`)
- Full API parity: sin capability nueva; el warning es parte del contrato de lectura de la postulación
  (`hiring.application.read`) y se escribe dentro del command público existente. Nexa/MCP/UI lo leen del mismo reader

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_hiring.hiring_application` (columna `intake_warnings`)
- Invariantes que no se pueden romper:
  - `intake_warnings` nunca contiene el valor crudo del enlace ni PII: sólo objetos `{ code, field }` de un enum
    cerrado; el parse de lectura descarta cualquier objeto fuera del enum y acota a 8 elementos.
  - Un warning nunca impide aceptar la postulación ni cambia el `outcome` público.
  - `discarded` sólo es `true` cuando el raw NO estaba vacío y `url` es `null`; un raw vacío devuelve `{ url: null }`.
  - Un scheme distinto de `https:` jamás se persiste (invariante de `ISSUE-172`).
  - El warning es application-scoped: se escribe en el INSERT de `createHiringApplication`; en duplicado (409) la
    application existente NO se modifica (mismo criterio que `candidate_message`; queda documentado como límite).
  - Ambas entradas públicas producen el mismo arreglo para el mismo payload (entry parity).
- Write-target allowlist: sin tabla nueva; `greenhouse_hiring.hiring_application` ya está en
  `src/lib/hiring/boundary-domain.test.ts` L44
- Tenant/space boundary: sin cambio — la application se resuelve por `opening_id` publicado + `identity_profile_id`
  email-first; lectura gateada por `gestion.hiring_application_detail` + `hiring.application.read`
- Idempotency/concurrency: sin cambio — dedupe estructural `UNIQUE (opening_id, identity_profile_id)` + fingerprint;
  el campo viaja en el mismo INSERT
- Audit/outbox/history: ninguno adicional — el campo es un hecho del intake, no una decisión; sin evento nuevo

### Migration, backfill and rollout

- Migration posture: `additive` — `ALTER TABLE … ADD COLUMN IF NOT EXISTS intake_warnings JSONB` + `CHECK … NOT VALID`
  + `VALIDATE CONSTRAINT` + `COMMENT` + bloque `DO` que aborta si la columna no existe (patrón de
  `20260812094000000_task-1688-careers-contact-completeness.sql`)
- Default state: `enabled with rationale` — sin flag: es un dato aditivo nullable; las filas históricas leen `[]`
- Backfill plan: sin backfill — las postulaciones ya creadas con enlace descartado (las 2 del 2026-09-11 y cualquier
  otra) no se reconstruyen: el raw no existe en el carril Careers y en el carril Growth reconstruirlo exigiría releer
  `normalized_fields_json` con reglas nuevas (sin evidencia de que valga la pena; queda como Open Question)
- Rollback path: revert del PR (el código deja de escribir/leer la columna); la columna nullable se conserva sin
  daño; `-- Down Migration` la elimina sólo si ningún consumer la lee
- External coordination: aplicar la migración con `pnpm pg:connect:migrate` en la única instancia ANTES del push;
  `pnpm db:generate-types` en el mismo PR

### Security and access

- Auth/access gate: sin cambio (lectura bajo `hiring.application.read`; el apply público no expone el warning en su
  respuesta genérica)
- Sensitive data posture: sin PII en el campo por diseño; el raw descartado no se loggea (ni en `console`, ni en
  Sentry, ni en `hiring_application_intake_events`)
- Error contract: sin cambio — el parser sigue devolviendo `null` sólo por campos obligatorios; `throwIfNotOk`/
  `canonicalErrorResponse` no se tocan
- Abuse/rate-limit posture: sin cambio (abuse guard y rate-limit de TASK-1367 intactos)

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/hiring/public-careers` (schema, submit, contract, view-model);
  `pnpm vitest run src/lib/hiring/boundary-domain.test.ts`
- DB/runtime checks: `pnpm pg:connect:migrate` + `SELECT column_name, data_type FROM information_schema.columns WHERE
  table_schema='greenhouse_hiring' AND table_name='hiring_application' AND column_name='intake_warnings'`; `pg_constraint`
  con el CHECK; `migration.live.test.ts` extendido
- Integration checks: `submit-application.live.test.ts` extendido con un payload que trae `linkedinUrl:
  'javascript:alert(1)'` → `accepted` + `getHiringApplicationById` devuelve `[{ code: 'url_discarded', field:
  'linkedinUrl' }]` y `linkedinUrl === null`; sin escribir sobre personas reales (fixtures propios del live test)
- Reliability signals/logs: ninguna señal nueva; `console.info` del command con `applicationId` + códigos (sin raw) es
  opcional y se decide en Discovery
- Production verification sequence: ver `## Rollout Plan & Risk Matrix`

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Sin tabla nueva; la columna nueva vive en una tabla ya declarada en el allowlist del dominio.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] N/A — no capability nueva: el warning es un dato del contrato de lectura existente (`hiring.application.read`)
      y se escribe dentro del command público ya gobernado (`submitPublicHiringApplication`).
- [ ] Un primitive, muchos consumers: `HiringApplication.intakeWarnings` sale de `normalizeHiringApplication`; ningún
      consumer recalcula el warning desde `linkedinUrl === null`.

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

### Slice 1 — Parser: `{ url, discarded? }` + `intakeWarnings`

- `normalizeOptionalHttpsUrl(raw): { url: string | null; discarded?: true }`; toda la lógica actual se conserva;
  `discarded: true` sólo cuando `raw.trim() !== ''` y `url === null`.
- `HiringIntakeWarning` + `HIRING_INTAKE_WARNING_CODES = ['url_discarded'] as const` +
  `HIRING_INTAKE_WARNING_FIELDS = ['linkedinUrl', 'portfolioUrl'] as const` en `src/types/hiring.ts`.
- `parsePublicHiringApplication` arma `intakeWarnings` (orden estable: `linkedinUrl`, `portfolioUrl`) y lo agrega a
  `NormalizedApplicationInput`.
- Tests en `schema.test.ts`: vacío → sin warning ni `discarded`; `linkedin.com/in/ada` → url https y sin warning;
  `javascript:alert(1)` → `url: null`, `discarded: true`, warning `url_discarded/linkedinUrl`; `data:` y `https://no-url`
  ídem; el raw no aparece en ningún campo del resultado (assert por serialización).

### Slice 2 — Migración expand `intake_warnings`

- `pnpm migrate:create task-1873-hiring-application-intake-warnings`; Up: `ADD COLUMN IF NOT EXISTS intake_warnings
  JSONB`, `CHECK (intake_warnings IS NULL OR jsonb_typeof(intake_warnings) = 'array') NOT VALID` + `VALIDATE`,
  `COMMENT ON COLUMN` («códigos cerrados; NUNCA el raw»), bloque `DO` con `RAISE EXCEPTION` si la columna no existe;
  Down: `DROP CONSTRAINT IF EXISTS` + `DROP COLUMN IF EXISTS`.
- `pnpm pg:connect:migrate` en la única instancia; `pnpm db:generate-types`; `migration.live.test.ts` con el caso de la
  columna y el CHECK.

### Slice 3 — Store + command

- `HiringApplicationRow.intake_warnings`, `HIRING_APPLICATION_COLUMNS` incluye `intake_warnings`;
  `normalizeHiringApplication` parsea defensivamente (`toIntakeWarnings`: sólo objetos con `code` y `field` del enum;
  máximo 8; cualquier otra cosa → `[]`).
- `createHiringApplication` acepta `intakeWarnings?: HiringIntakeWarning[] | null` y lo inserta como `$15`
  (`JSON.stringify` cuando el arreglo no está vacío; `NULL` si vacío o ausente).
- `submitPublicHiringApplication` pasa `intakeWarnings: input.intakeWarnings.length ? input.intakeWarnings : null`; en
  duplicado no se toca la application existente (documentado en el comentario del catch).
- Tests: `submit-application.test.ts` (persiste el arreglo; no persiste raw; duplicado no actualiza);
  `submit-application.live.test.ts` (round-trip real contra PG con fixtures del propio test).

### Slice 4 — Contrato de lectura y docs

- `HiringApplication.intakeWarnings` documentado con JSDoc (application-scoped, sin raw, lo consumen Application 360 /
  People 360 / MCP); `HiringDeskApplicationSummary` sin cambio de forma.
- Delta en `GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` (§Candidate intake: warnings de intake, invariantes) y en la doc
  funcional + manual de Careers (qué significa el aviso y qué hacer: pedir el enlace en el primer contacto).
- `## Delta` informativo en `TASK-1718` y `TASK-1729`.

## Out of Scope

- La superficie visible en Application 360 (`TASK-1874`).
- Reconstruir warnings para postulaciones anteriores (sin raw en Careers; Open Question).
- Mostrar el warning al candidato o permitirle corregir el enlace (`TASK-1729`).
- Nuevos códigos de warning (teléfono, disponibilidad fuera de catálogo): el enum nace con `url_discarded` y crece con
  su propia task cuando exista el caso.
- Prender/verificar `GROWTH_FORMS_SERVER_VALIDATION_ENABLED` (follow-up 3 del inventario del 2026-09-12; decisión
  aparte con fila en el ledger).
- Cambios en `candidate_facet`, `hiring_application_intake_events` o el abuse guard.

## Detailed Spec

### Tipos (`src/types/hiring.ts`)

```ts
export const HIRING_INTAKE_WARNING_CODES = ['url_discarded'] as const
export const HIRING_INTAKE_WARNING_FIELDS = ['linkedinUrl', 'portfolioUrl'] as const

/** TASK-1873 — hecho del intake, application-scoped. NUNCA lleva el valor crudo (un `javascript:` guardado es un vector). */
export interface HiringIntakeWarning {
  code: (typeof HIRING_INTAKE_WARNING_CODES)[number]
  field: (typeof HIRING_INTAKE_WARNING_FIELDS)[number]
}
```

### Parser (`schema.ts`)

```ts
export interface OptionalHttpsUrlResult { url: string | null; discarded?: true }

export const normalizeOptionalHttpsUrl = (raw: string): OptionalHttpsUrlResult => {
  const value = raw.trim()
  if (!value) return { url: null }
  const url = normalizeToSafeHttps(value) // lógica actual, extraída sin cambios
  return url ? { url } : { url: null, discarded: true }
}
```

- `parsePublicHiringApplication`: `const linkedin = normalizeOptionalHttpsUrl(asTrimmed(body.linkedinUrl, MAX_URL))`
  → `linkedinUrl: linkedin.url`; `intakeWarnings.push({ code: 'url_discarded', field: 'linkedinUrl' })` si
  `linkedin.discarded`. Igual para `portfolioUrl`. Orden estable.

### Migración (Up)

```sql
-- Up Migration
ALTER TABLE greenhouse_hiring.hiring_application
  ADD COLUMN IF NOT EXISTS intake_warnings JSONB;

ALTER TABLE greenhouse_hiring.hiring_application
  DROP CONSTRAINT IF EXISTS hiring_application_intake_warnings_array_check;
ALTER TABLE greenhouse_hiring.hiring_application
  ADD CONSTRAINT hiring_application_intake_warnings_array_check
  CHECK (intake_warnings IS NULL OR jsonb_typeof(intake_warnings) = 'array') NOT VALID;
ALTER TABLE greenhouse_hiring.hiring_application
  VALIDATE CONSTRAINT hiring_application_intake_warnings_array_check;

COMMENT ON COLUMN greenhouse_hiring.hiring_application.intake_warnings IS
  'TASK-1873: warnings del intake público, application-scoped. Arreglo de {code, field} con códigos cerrados; NUNCA el valor crudo.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'greenhouse_hiring' AND table_name = 'hiring_application' AND column_name = 'intake_warnings'
  ) THEN
    RAISE EXCEPTION 'TASK-1873 anti pre-up-marker check: hiring_application.intake_warnings was NOT created.';
  END IF;
END
$$;
```

### Lectura defensiva (`store.ts`)

```ts
const toIntakeWarnings = (value: unknown): HiringIntakeWarning[] => {
  if (!Array.isArray(value)) return []
  return value
    .filter(isHiringIntakeWarning) // code ∈ CODES && field ∈ FIELDS
    .slice(0, 8)
}
```

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (parser) → Slice 2 (migración aplicada en la instancia) → Slice 3 (store + command) → Slice 4 (docs).
- Slice 2 DEBE estar aplicada en la única instancia Cloud SQL ANTES del push de Slice 3 a `develop`: el push despliega
  el `ops-worker` y la projection de Growth Forms insertaría contra una columna inexistente (breaker abierto + residuo,
  exactamente el escenario de ISSUE-172/173).
- Slice 1 y Slice 2 pueden mergearse antes que Slice 3 (aditivos; nadie escribe la columna todavía).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Código que inserta `intake_warnings` llega al `ops-worker`/Vercel antes que la migración | migration / outbox | medium | orden de slices; migración aplicada y verificada por `information_schema` antes del push; live test de migración | `sync.reactive.circuit_open` + `handler_health` de `growth_hiring_application_from_submission` |
| Se persiste el raw por error (log, evidencia, campo) | data / privacidad | low | tipo cerrado `{ code, field }`; test que serializa el resultado del parser y afirma ausencia del raw; revisión de `console.*` del command | revisión de código; sin señal runtime |
| Fila histórica con JSON inesperado rompe el reader de Application 360 | UI / reader | low | `toIntakeWarnings` defensivo (enum + cap 8; cualquier forma inválida → `[]`) + CHECK de tipo `array` | error 500 en `/agency/hiring/applications/[id]` (Sentry `hiring`) |
| Entry parity se rompe (Growth Forms produce warnings distintos que Careers) | intake | low | mismo parser + mismo command por construcción; test de paridad existente extendido con el campo | test de paridad rojo |
| Migración registrada sin ejecutar (pre-up-marker) | migration | low | `pnpm migrate:create`, marker verbatim, bloque `DO` con `RAISE EXCEPTION`, `pnpm migration-marker-gate` | `migration.live.test.ts` rojo |

### Feature flags / cutover

- Sin flag — additive: columna nullable + campo con `[]` por defecto; ningún comportamiento visible cambia hasta
  `TASK-1874`. Cutover inmediato tras aplicar la migración.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert del PR (sin runtime persistente) | minutos | si |
| Slice 2 | `pnpm migrate:down` (Down elimina CHECK + columna) sólo si Slice 3 no está desplegado; si lo está, dejar la columna y revertir el código | 10 min | si |
| Slice 3 | revert del PR + redeploy Vercel + deploy del `ops-worker`; la columna queda nullable sin daño | 15–20 min | si |
| Slice 4 | revert de docs | minutos | si |

### Production verification sequence

1. Slice 2: `pnpm pg:connect:migrate` → verificar columna y CHECK por `information_schema.columns` / `pg_constraint`;
   `pnpm db:generate-types` sin diff inesperado; `migration.live.test.ts` verde.
2. Slice 3 en `develop`: workflow del `ops-worker` en `success`; `submit-application.live.test.ts` verde contra la
   base (fixtures propios, sin personas reales).
3. Postulación de prueba por la ruta pública de apply con `linkedinUrl` ilegible sobre una vacante de prueba con
   `data_origin` no real (nunca sobre una vacante real ni una persona real): `accepted`; leer la application con
   `getHiringApplicationById` y confirmar `intakeWarnings` + `linkedinUrl === null`.
4. Misma postulación por el carril Growth Forms (`efeonce-careers-application` en la vacante de prueba): mismo arreglo.
5. Release a `main` por el control plane; smoke de `/api/auth/health` y Careers 200.
6. `TASK-1874` toma el contrato desde acá.

### Out-of-band coordination required

- Autorización del operador para aplicar la migración en la única instancia (dev/staging/prod comparten Cloud SQL).
- Ninguna variable de entorno, secreto ni job externo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `normalizeOptionalHttpsUrl` devuelve `{ url, discarded? }`; `discarded` es `true` sólo con raw no vacío y `url`
      nulo; toda la lógica de ISSUE-172 (https, host con punto, href canónico) sigue verde en `schema.test.ts`.
- [ ] `parsePublicHiringApplication` expone `intakeWarnings` con códigos del enum cerrado y orden estable; un test
      serializa el resultado y afirma que el raw descartado no aparece.
- [ ] Migración creada con `pnpm migrate:create`, con `-- Up Migration` verbatim, CHECK de tipo `array`, `COMMENT` y
      bloque `DO`; aplicada en la instancia y verificada por `information_schema` + `migration.live.test.ts`.
- [ ] `src/types/db.d.ts` regenerado en el mismo PR.
- [ ] `createHiringApplication` inserta `intake_warnings` (`NULL` cuando vacío) y `normalizeHiringApplication` devuelve
      `intakeWarnings: []` para filas históricas y para JSON inválido (test).
- [ ] `submitPublicHiringApplication` persiste los warnings de ESTA postulación y no modifica la existente en
      duplicado (test).
- [ ] `submit-application.live.test.ts` hace round-trip real: payload con `javascript:` → `accepted` +
      `getHiringApplicationById` con `[{ code: 'url_discarded', field: 'linkedinUrl' }]` y `linkedinUrl === null`.
- [ ] Entry parity: el carril Growth Forms produce el mismo arreglo para el mismo payload (test o evidencia runtime).
- [ ] Ninguna escritura en `candidate_facet` ni tabla nueva; `boundary-domain.test.ts` verde.
- [ ] `HiringApplication.intakeWarnings` documentado; delta en `GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`,
      `docs/documentation/hr/careers-publicas.md` y `docs/manual-de-uso/hr/operar-careers-publicas.md`.
- [ ] `TASK-1874` desbloqueada (su `Blocked by` pasa a `none` con la fecha) y `TASK-1718`/`TASK-1729` con `## Delta`.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm vitest run src/lib/hiring/public-careers src/lib/hiring/boundary-domain.test.ts`
- `pnpm vitest run src/lib/hiring/public-careers/migration.live.test.ts src/lib/hiring/public-careers/submit-application.live.test.ts` con proxy PG (`pnpm pg:connect`)
- `pnpm migration-marker-gate`
- `pnpm local:check`
- `pnpm test` completo + `pnpm build` (autorización del operador: el build consume ~30 GB) antes de mover a `complete/`
- `pnpm qa:gates --changed` y `pnpm docs:closure-check`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] `TASK-1874` desbloqueada con fecha; `TASK-1718` y `TASK-1729` con `## Delta`
- [ ] Migración aplicada en la instancia y registrada en `pgmigrations` ANTES del push del código que escribe la columna

## Follow-ups

- Reconstrucción opcional de warnings para postulaciones del carril Growth anteriores a esta task (releer
  `normalized_fields_json`): sólo si el operador la pide; hoy no hay evidencia de volumen.
- Nuevos códigos de warning cuando exista el caso (teléfono no normalizable, disponibilidad fuera de catálogo).
- Verificar el valor live de `GROWTH_FORMS_SERVER_VALIDATION_ENABLED` y por qué la normalización `url` del validador no
  aterrizó en `normalized_fields_json` (follow-up 3 del inventario 2026-09-12; task aparte).

## Open Questions

- ¿Reconstruir los warnings de las 2 postulaciones recuperadas el 2026-09-12 (carril Growth, raw disponible)? Decisión
  del operador; por defecto no, porque esas dos ya fueron contactadas durante la recuperación.
