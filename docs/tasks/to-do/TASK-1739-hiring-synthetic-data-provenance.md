# TASK-1739 — Procedencia de datos sintéticos en Hiring (marca canónica, readers limpios, purga gobernada)

## Delta 2026-08-18

**Primer objetivo concreto para el lane de purga, generado por el canary de `TASK-1736`.** Al ejecutar
el canary del runbook `docs/operations/runbooks/candidate-identity-rollout.md` (Paso 2) con el flag ya
ON en producción, quedó un sujeto 100% sintético que **el perfil runtime no puede retirar**:

| Objeto | Id |
|---|---|
| Person sintética (`@live-test.invalid`) | `identity-public-careers-candidate-canary-t1736-1787066079713-live-test-invalid` |
| Application (`source='public_careers'`, consent `granted`) | `happ-ffebd53b-a76d-435a-95bd-538838a52db4` |
| Opening + demand sintéticos (`EO-OPN-0101`, **ya despublicado** a `internal_only`) | `opng-ef6e58c2-7b63-4549-9e31-4239edaaac2e` |
| Evidencia / audit de identidad | 2 filas / 3 filas de esa Person |

Tres hechos que esta task ya anticipaba y que ahora están **verificados en vivo**, no inferidos:

1. `greenhouse_runtime` responde `permission denied` sobre `candidate_identity_intake_evidence` y
   `candidate_identity_display_audit` (append-only **por grant**, no sólo por trigger). Confirmado
   ejecutando el DELETE.
2. Esas 2 filas de evidencia **pinnean por FK toda la cadena**: application → candidate_facet →
   Person → opening → talent_demand. Ninguno de los cinco se puede borrar mientras la evidencia
   exista. Es el escenario exacto del §Lane de archivado: hay historia auditable, así que la
   respuesta correcta NO es borrar sino **marcar procedencia y archivar** — que es justamente lo que
   esta task instala.
3. `pnpm hiring:candidates:purge-test-facets` **no cubre este caso** por diseño propio: exige cero
   postulaciones y consentimiento `not_captured`, y este sujeto tiene una postulación con
   consentimiento `granted`. Refuerza que la purga de `TASK-1739` no es un superset cosmético del
   script de fichas, sino otro lane.

**Consecuencia de diseño nueva**: los canaries/smokes de rollout son ellos mismos **productores de
datos sintéticos no purgables** una vez que el flag que ejercitan está ON. Mientras `data_origin` no
exista, el mitigante es el que aplicó el canary de 1736: vacante desechable propia (nunca una vacante
real), despublicación en el teardown y reporte ruidoso del residuo. Cuando esta task aterrice, el
canary debería nacer marcando `data_origin='synthetic'` en el momento de creación.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `migration`
- Epic: `EPIC-011`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Hoy un dato sintético de Hiring (seed, smoke, demo) es indistinguible de un candidato real: dev,
staging y producción comparten la misma Cloud SQL, y la única forma de identificarlos es adivinar por
regex sobre el nombre. Esta task instala **procedencia declarada en el momento de creación**
(`data_origin`, default `real`), hace que los readers que duelen filtren sintéticos por defecto,
marca retroactivamente lo existente con allowlist humana, y abre una purga gobernada que respeta el
carácter append-only del dominio (archivar lo que tiene historia auditable, borrar sólo huérfanos).

## Why This Task Exists

El problema no es la suciedad acumulada: es que **no existe el hecho "esto es sintético"** en ningún
lado del modelo. Se infiere. Y una inferencia por regex sobre el nombre falla en las dos direcciones,
lo que la vuelve inservible para automatizar cualquier cosa:

- **Falso positivo demostrable, no hipotético.** El caso 5 del gold set generado el 2026-08-16
  (`arsp-61c6579f-a7be-4557-81cb-f6244827f912`, 1206 caracteres, banda alta) contiene
  *"Propondría pequeñas **pruebas** o pilotos que permitan validar estas oportunidades con bajo
  riesgo"*. Es una respuesta real, sustantiva, de un candidato real — y hace match con
  `SMOKE|PRUEBA|TEST`. Un barrido por regex la habría marcado como basura y borrado evidencia de
  evaluación humana.
- **Falso negativo estructural.** El footprint sintético del repo usa **cinco convenciones distintas
  y ninguna compartida**: `SMOKE TASK-356` (`scripts/hiring/_sanity-handoff-reactive.ts`),
  `SMOKE TASK-770` (`scripts/hiring/_sanity-hiring-activation.ts`),
  `task-1689-rollout@efeonce.org` + `NO CONTACTAR`
  (`scripts/hiring/_sanity-task1689-lifecycle-emails-e2e.ts`, `…-rollout-e2e-submit.mjs`),
  `task-1378-scan-{clean,eicar}@efeonce.org` (`scripts/hiring/purge-task-1378-test-applications.ts`)
  y `qa.seed.task1738@efeonce.test`
  (`scripts/frontend/scenarios/task1738-assessment-run-workbench.scenario.ts`). Más los seeds sin
  marca alguna (`scripts/hiring/_seed-task-1422-gvc.ts`, `scripts/hiring/_smoke-task-1385-vacancy-ai.ts`,
  `scripts/hiring/verify-*-smoke.ts`). Cualquier regex que cubra las cinco es tan ancha que arrasa
  con candidatos reales; cualquiera que no arrase, deja seeds vivos.

Y el problema **escala con cada task del módulo**: EPIC-011 tiene hoy carriles abiertos
(`1719/1720/1721/1722`, `1727…1733`) que van a seguir pariendo candidatos y vacantes fantasma con
la sexta, séptima y octava convención de nombre.

Consecuencias ya materializadas o a un paso de materializarse:

1. **Calibración de la IA contra basura (el más grave).** `scripts/hiring/build-gold-set-sample.ts`
   lee `hiring_assessment_response` con un `WHERE` que filtra por tipo de pregunta y por texto no
   nulo — **cero filtro de procedencia**. Su única protección es accidental:
   `gold-set-sampling.ts:365` estratifica sólo lo que tiene `priorHumanScore != null`, y los seeds
   no se califican a mano. La muestra del 2026-08-16 salió limpia **por suerte, no por
   construcción**: 11 casos de 24 elegibles, todos `atpl-account-manager-l2`, 363–1762 caracteres,
   contenido sustantivo. El día que alguien califique un seed para probar el flujo de corrección
   humana — que es exactamente el flujo que las tasks 1734/1738 construyeron —, entra al gold set y
   calibramos el scoring de candidatos reales contra una respuesta inventada.
2. **Métricas, desk y talent pool cuentan gente que no existe.** `getHiringDeskSnapshot`
   (`src/lib/hiring/desk.ts:74`) y los readers de `src/lib/hiring/talent-pool/readers.ts` no
   distinguen procedencia.
3. **La limpieza no es repetible.** `purge-task-1378-test-applications.ts` resolvió *un* caso
   hardcodeando dos correos y abortando si el nombre no contiene `TASK-1378`. Funciona, pero no
   escala: cada seed nuevo pide un script nuevo.

## Goal

- Que "sintético" sea un **hecho declarado en el nacimiento del dato**, no una inferencia sobre el
  nombre, con default `real` para que ningún candidato real desaparezca por omisión.
- Que los readers que alimentan decisiones (desk, talent pool, métricas) y la evidencia de promoción
  de IA (gold set) dejen de contar datos sintéticos, con opt-in explícito donde tenga sentido y sin
  opt-in donde no lo tenga.
- Que exista una purga gobernada, repetible y auditable, que **no destruya evidencia**: archivar lo
  que tiene historia, borrar sólo lo que no dejó rastro auditable.
- Que un script/seed/smoke nuevo **no pueda** crear datos de Hiring sin declarar procedencia, con
  gate mecánico que lo verifique.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md`
- `docs/architecture/GREENHOUSE_CANDIDATE_IDENTITY_INTAKE_CANONICALIZATION_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_ASSESSMENT_AI_SCORING_RUN_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`

Reglas obligatorias:

- **Person-first.** `greenhouse_core.identity_profiles` es la raíz canónica de la persona; la
  procedencia de una persona vive ahí, no en una tabla paralela del dominio Hiring.
- **La dimensión de procedencia es ORTOGONAL a la de origen comercial.** `candidate_facet.source` /
  `hiring_application.source` (`public_careers|manual|referral|bench_internal|partner|hubspot|import`)
  responden *por qué canal llegó*; `data_origin` responde *si el dato representa a una persona/vacante
  del mundo real*. Es el mismo patrón que Finance ya resolvió separando `economic_category` de
  `expense_type` (`GREENHOUSE_FINANCE_ECONOMIC_CATEGORY_DIMENSION_V1.md`). **NUNCA** agregar un valor
  `synthetic`/`test` al CHECK de `source`: colapsaría dos preguntas distintas en una columna y haría
  imposible saber por qué canal llegó un seed.
- **Append-only del dominio.** `candidate_identity_display_audit`, `candidate_identity_intake_evidence`,
  `hiring_application_intake_events`, `hiring_handoff_audit` y `asset_scan_results` (con trigger
  `asset_scan_results_append_only` que hace `RAISE EXCEPTION` en DELETE) son irrepudiables por diseño.
  Ninguna limpieza de datos de prueba justifica desactivar un guardrail de auditoría.
- **Backfill mutante = acto humano.** El patrón canónico del dominio es
  `dry-run → allowlist humana revisada → apply con actor+reason+audit → rollback per-record`
  (`GREENHOUSE_CANDIDATE_IDENTITY_INTAKE_CANONICALIZATION_DECISION_V1.md` §D4). Un flag por sí solo
  jamás autoriza un backfill.
- **Full API Parity.** La marca, el archivado y la purga son capabilities: viven en `src/lib/**` como
  commands con autorización fina + audit, no como scripts sueltos con SQL inline. El CLI es un
  consumer más.

## Normative Docs

- `docs/tasks/complete/TASK-1736-candidate-identity-intake-canonicalization.md` — patrón
  `dry-run/allowlist/apply/rollback` que esta task replica.
- `scripts/hiring/purge-task-1378-test-applications.ts` — precedente real de purga: descubrió el
  choque con el trigger append-only y resolvió con soft-delete. Su lógica se generaliza aquí.
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`

## Dependencies & Impact

### Depends on

- `greenhouse_core.identity_profiles` (raíz de persona) — existe.
- `greenhouse_hiring.{talent_demand,hiring_opening,candidate_facet,hiring_application}` —
  `migrations/20260707235655376_task-353-hiring-ats-domain-foundation.sql`.
- `greenhouse_hiring.hiring_assessment` (FK `application_id … ON DELETE CASCADE`) —
  `migrations/20260708113233408_task-1360-assessment-engine.sql:73`.
- Módulo `hiring` del reliability registry — `src/lib/reliability/registry.ts:556-578`.

### Blocks / Impacts

- **`TASK-1734` (gold set / promoción de scoring IA)** — el sampler pasa a excluir sintéticos siempre.
  La muestra vigente no se invalida (se verificó limpia), pero toda muestra futura queda protegida por
  construcción y no por suerte.
- **`TASK-1719/1720/1721/1722`, `TASK-1727…1733`** — todo carril abierto de EPIC-011 que cree
  candidatos/aplicaciones/vacantes debe declarar `dataOrigin` en sus seeds y smokes.
- `scripts/hiring/purge-task-1378-test-applications.ts` queda superado por la purga genérica; se
  conserva como referencia histórica y su nota de contexto se enlaza desde el nuevo CLI.
- `/agency/hiring` (desk) y talent pool muestran menos filas tras el backfill: es el efecto buscado,
  pero requiere aviso a HR antes del apply.

### Files owned

- `migrations/<timestamp>_task-1739-hiring-data-origin.sql`
- `src/lib/hiring/data-origin/` (`index.ts`, `contracts.ts`, `mark.ts`, `purge.ts`, `plan.ts` + tests)
- `src/lib/hiring/desk.ts`
- `src/lib/hiring/talent-pool/readers.ts`
- `src/lib/hiring/talent-pool/projection.ts`
- `src/lib/hiring/store.ts`
- `src/lib/hiring/public-careers/submit-application.ts`
- `src/lib/hiring/assessment/ai/eval/gold-set-sampling.ts`
- `scripts/hiring/build-gold-set-sample.ts`
- `scripts/hiring/mark-synthetic-hiring-data.ts`
- `scripts/hiring/purge-synthetic-hiring-data.ts`
- `scripts/ci/hiring-data-origin-gate.mjs`
- `src/lib/reliability/queries/hiring-synthetic-records-aging.ts`
- `src/lib/reliability/registry.ts`
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/documentation/hr/procedencia-de-datos-hiring.md`
- `docs/manual-de-uso/hr/operar-purga-de-datos-sinteticos.md`

## Current Repo State

### Already exists

- Modelo Person-first con `candidate_facet.identity_profile_id` **UNIQUE** hacia
  `identity_profiles.profile_id` (1:1 estricto) y `hiring_application` apuntando a ambos con
  `ON DELETE RESTRICT`.
- `candidate_facet.status` con CHECK `('active','archived')` — **la palanca de archivado ya existe**,
  nadie la está usando para esto.
- `hiring_opening.status` con CHECK que incluye `cancelled` y `closed`.
- Patrón `dry-run → allowlist → apply → rollback` implementado y en producción:
  `src/lib/hiring/candidate-intake/remediate.ts` + `scripts/hiring/remediate-candidate-display-names.ts`
  (`pnpm hiring:candidates:remediate-display`).
- Precedente de purga con detección de blockers y soft-delete de assets:
  `scripts/hiring/purge-task-1378-test-applications.ts`.
- Módulo `hiring` en el reliability registry con 6 señales vivas
  (`hiring.talent_pool.integrity`, `hiring.candidate_identity.needs_review_backlog`,
  `hiring.handoff_blocked_stale`, `hiring.candidate_document.retention_overdue`,
  `hiring.internal_hire_awaiting_onboarding`, familia `hiring.assessment_ai.*`).

### Gap

- **No existe ninguna columna, tabla ni evento que registre procedencia** en ninguna entidad del
  dominio. El hecho no está modelado.
- `build-gold-set-sample.ts` (líneas 74-108) no filtra procedencia; `gold-set-sampling.ts:365` sólo
  filtra por `priorHumanScore != null`.
- `getHiringDeskSnapshot` (`src/lib/hiring/desk.ts:74`) y los readers de talent pool no filtran.
- Los seeds/smokes no tienen forma de declarar procedencia ni gate que se los exija.
- No hay señal de reliability que exponga acumulación de datos sintéticos.

## Modular Placement Contract

- Topology impact: `portal`
- Current home: `src/lib/hiring/**` + `migrations/` + `scripts/hiring/**`, ejecutado en el runtime
  Next.js de Vercel y en CLIs locales contra Cloud SQL vía proxy.
- Future candidate home: `domain-package`
- Boundary: el primitive canónico es `src/lib/hiring/data-origin/` — expone el tipo `HiringDataOrigin`,
  el predicado de filtro para readers y los commands `markHiringDataOrigin`,
  `archiveSyntheticHiringRecords` y `deleteOrphanSyntheticHiringRecords`. Consumers autorizados:
  readers de `src/lib/hiring/**`, el sampler del gold set, los dos CLIs de `scripts/hiring/**` y la
  query de reliability. Ningún consumer escribe `data_origin` con SQL propio.
- Server/browser split: el módulo es `server-only`; no cruza al bundle de cliente. Las columnas nuevas
  no se exponen crudas al portal cliente ni al portal público de careers.
- Build impact: `none` — sin dependencias nuevas, sin filesystem inputs, sin entrypoints globales.
- Extraction blocker: la marca cruza el boundary `greenhouse_core` (persona) ↔ `greenhouse_hiring`
  (dominio) dentro de una misma transacción, y el invariante de derivación de `hiring_application`
  necesita leer ambos. Mientras Person viva en el core compartido, el paquete no se extrae solo.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `migration`
- Source of truth afectado: `greenhouse_core.identity_profiles` (procedencia de personas) y
  `greenhouse_hiring.{talent_demand,hiring_opening}` (procedencia de la demanda). El
  `hiring_application` porta una copia derivada, no una verdad propia.
- Consumidores afectados: readers del desk y talent pool, sampler del gold set, CLIs de marcado y
  purga, query de reliability, y todo seed/smoke del repo que cree datos de Hiring.
- Runtime target: `local` (CLIs) + `production` (readers y señal; base compartida con staging/dev)

### Contract surface

- Contrato existente a respetar: `src/lib/hiring/store.ts` (`createTalentDemand:655`,
  `createHiringOpening:800`, `createHiringApplication:1064`),
  `src/lib/hiring/public-careers/submit-application.ts:121` (`submitPublicHiringApplication`),
  `src/lib/hiring/candidate-intake/remediate.ts` (patrón de remediación gobernada).
- Contrato nuevo o modificado: columna `data_origin` en cuatro tablas; módulo
  `src/lib/hiring/data-origin/`; parámetro `includeSynthetic` en readers; commands de marcado,
  archivado y borrado; señal `hiring.data_quality.synthetic_records_aging`.
- Backward compatibility: `compatible`. La columna nace con `DEFAULT 'real'` y `NOT NULL`, así que
  todo INSERT existente sigue funcionando sin cambios. El filtro de readers es el único cambio de
  comportamiento observable y llega detrás de flag.
- Full API parity: la procedencia se lee por el reader canónico y se escribe por command con
  capability + audit. El CLI, la UI futura, Nexa y MCP consumen el mismo primitive. El command de
  purga es apto para `propose → confirm → execute` sin trabajo adicional: `planSyntheticPurge`
  produce el plan, la confirmación humana (allowlist + reason + actor) es la puerta, y `apply` es el
  único punto de mutación.

### Data model and invariants

Entidades/tablas/views afectadas:

- `greenhouse_core.identity_profiles` — `data_origin` (raíz para personas)
- `greenhouse_hiring.talent_demand` — `data_origin` (raíz para demanda)
- `greenhouse_hiring.hiring_opening` — `data_origin` (raíz para vacante)
- `greenhouse_hiring.hiring_application` — `data_origin` **derivado** (copia denormalizada)

Invariantes que no se pueden romper:

- **Enum cerrado.** `data_origin TEXT NOT NULL DEFAULT 'real' CHECK (data_origin IN
  ('real','synthetic_seed','smoke_test','demo'))`. `synthetic_seed` = fixture persistente para
  desarrollo; `smoke_test` = dato de un flujo de verificación puntual; `demo` = dato para mostrar la
  plataforma. Los tres son "no real"; se distinguen porque el ciclo de vida y la política de purga
  difieren (un `demo` puede tener que sobrevivir; un `smoke_test` no).
- **`real` es el default y eso es la mitigación principal.** Omitir la declaración deja el dato
  visible (suciedad, molesto) en vez de ocultarlo (pérdida de un candidato real, grave). El default
  inverso es inaceptable y no se discute.
- **Derivación de `hiring_application`.** Una aplicación es no-real si su `identity_profile_id`
  **o** su `opening_id` es no-real. La columna se denormaliza porque el desk y las métricas filtran
  sobre `hiring_application` en cada lectura y un JOIN obligatorio a `identity_profiles` es un
  invariante que se olvida. Se enforcea con trigger `BEFORE INSERT OR UPDATE` que deriva el valor
  desde las dos raíces; **el command nunca lo escribe a mano**. Si las dos raíces difieren, gana la
  que no es `real` (una aplicación de persona real a una vacante inventada no es evidencia real).
- **`candidate_facet` NO lleva columna.** Su FK a `identity_profiles` es `UNIQUE` (1:1 estricto):
  darle columna propia crearía una segunda verdad para la misma entidad y con ella la posibilidad de
  drift. Se resuelve por JOIN.
- **`hiring_assessment` y `hiring_assessment_response` NO llevan columna.** Cuelgan de
  `hiring_application` por un único camino de FK; heredan por JOIN.
- **La marca no es reversible en silencio.** Cambiar `data_origin` de una fila existente exige
  actor + reason + fila de audit, igual que el display name en TASK-1736.
- **`data_origin` no se expone al candidato ni al portal público.** No entra en el payload de
  careers, ni en el portal cliente, ni en emails.
- Tenant/space boundary: sin cambios. Las columnas no alteran la derivación de `space_id`/
  `organization_id` de `hiring_opening` ni el gating por capability existente del desk.
- Idempotency/concurrency: el apply del marcado opera **en lotes de 1 con CAS** sobre el valor
  esperado (mismo contrato que `applyCandidateIdentityRemediation`): si la fila cambió entre el
  dry-run y el apply, esa fila se salta y se reporta, no se pisa. Reejecutar el mismo allowlist es
  idempotente.
- Audit/outbox/history: tabla nueva `greenhouse_hiring.hiring_data_origin_audit` append-only
  (`record_type`, `record_id`, `before_value`, `after_value`, `action` ∈
  `mark|archive|delete|rollback`, `actor_user_id`, `reason`, `created_at`), sin UPDATE ni DELETE.
  Es lo que permite el rollback per-record y lo que hace defendible el borrado de cualquier fila.

### Migration, backfill and rollout

- Migration posture: `additive` en Slice 1 (columnas con DEFAULT + tabla de audit nueva);
  `backfill` en Slice 4; `destructive` acotado y gobernado en Slice 5.
- Default state: `read-only` — Slices 1-2 no cambian ninguna lectura. El filtro de readers
  (Slice 3) llega detrás del flag `HIRING_SYNTHETIC_DATA_FILTER_ENABLED` con default `false`.
- Backfill plan: `pnpm hiring:data:mark-synthetic` con tres modos —
  (1) **dry-run** (default, read-only): lista candidatos a marcar con la **evidencia por la que se
  proponen**, nunca sólo el veredicto: email `@efeonce.test` / `+test`, correo del script
  (`task-1689-rollout@efeonce.org`, `task-1378-scan-*@efeonce.org`), `created_by` de una persona
  agente (`user-agent-e2e-001`, `user-agent-collaborator-001`, `user-agent-client-001`), y match de
  nombre — **este último marcado explícitamente como señal débil** por el falso positivo del gold
  set; (2) **`--emit-allowlist <file>.synthetic-origin-allowlist.json`** para poda humana línea a
  línea (archivo gitignoreado, lleva PII); (3) **`--apply --allowlist <file> --actor <id> --reason
  "…"`** que sólo toca lo aprobado, en lotes de 1, con audit. Más `--rollback <auditId>`.
  El universo esperado es de ~3 a 8 personas (los casos conocidos: SMOKE TASK-354, PRUEBA TASK-1378,
  TASK-356, TASK-770, TASK-1689, `qa.seed.task1738@efeonce.test`, más lo que revele el dry-run).
- Rollback path: Slice 1-3 → flag a `false` + revert PR (las columnas quedan, inertes). Slice 4 →
  `--rollback <auditId>` per-record desde el `before_value` del audit. Slice 5 → el archivado se
  revierte devolviendo `status` a `active`; **el borrado no se revierte**, y por eso su lane es
  estrecho (ver Detailed Spec §5).
- External coordination: aviso a HR/People Ops antes del apply del filtro en producción — el desk
  va a mostrar menos filas y eso no puede parecer una pérdida de datos. Registrar
  `HIRING_SYNTHETIC_DATA_FILTER_ENABLED` en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` en el
  mismo PR que lo declara.

### Security and access

- Auth/access gate: dos capabilities nuevas en `capabilities_registry` + catálogo TS +
  grant a ≥1 rol real en `src/lib/entitlements/runtime.ts`, **en el mismo PR** (guard
  `capability-grant-coverage.test.ts`): `hiring.data_origin.mark` (grant `efeonce_admin`, `hr_manager`)
  y `hiring.data_origin.purge` (grant `efeonce_admin` únicamente). Ver `data_origin` no requiere
  capability propia: viaja en el reader que el operador ya puede leer.
- Sensitive data posture: `PII`. El dry-run y el allowlist imprimen nombres y correos de candidatos
  **reales** (los que el algoritmo propone y el humano descarta). Ese output es exclusivamente stdout
  local y archivo gitignoreado; jamás va a logs compartidos, issues, Sentry ni chat. La tabla de
  audit guarda `record_id` + valores de `data_origin`, **nunca el nombre ni el correo**.
- Error contract: `canonicalErrorResponse` con códigos nuevos si se expone ruta API; los CLIs fallan
  loud con mensaje es-CL y `captureWithDomain(err, 'hr.hiring', …)`.
- Abuse/rate-limit posture: `none` — superficie no expuesta a internet; el gate es capability +
  allowlist humana.

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/hiring` (incluye los tests nuevos del módulo `data-origin`,
  del trigger de derivación y del filtro de readers), `pnpm hiring:data-origin-gate`,
  `pnpm local:check`.
- DB/runtime checks: tras `pnpm pg:connect:migrate`, verificar contra `information_schema.columns`
  que las 4 columnas existen con default `'real'` y `NOT NULL`; ejercitar el trigger de derivación
  con un INSERT real dentro de una transacción con ROLLBACK; correr el dry-run del marcado y comparar
  su salida con el footprint conocido; correr `pnpm hiring:ai:gold-set-sample --dry-run` y confirmar
  que `poolAvailable` baja exactamente en la cantidad de respuestas sintéticas marcadas.
- Integration checks: `n/a` — no hay provider externo en el camino.
- Reliability signals/logs: `hiring.data_quality.synthetic_records_aging` visible en
  `/admin/operations` con steady `0`.
- Production verification sequence: ver §`Production verification sequence`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE (no se llena al crear la task)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Fundación: columna `data_origin` + audit + contrato TS

- Migración additive: `data_origin` en `greenhouse_core.identity_profiles`,
  `greenhouse_hiring.talent_demand`, `greenhouse_hiring.hiring_opening` y
  `greenhouse_hiring.hiring_application`, con `NOT NULL DEFAULT 'real'` + CHECK del enum cerrado.
- Índices parciales `WHERE data_origin <> 'real'` en las cuatro tablas (el universo no-real es
  chico; un índice completo sería desperdicio).
- Tabla `greenhouse_hiring.hiring_data_origin_audit` append-only, con trigger que hace
  `RAISE EXCEPTION` en UPDATE y DELETE.
- Bloque `DO` de verificación anti pre-up-marker que aborta si las 4 columnas o la tabla de audit no
  quedaron creadas.
- `GRANT` a `greenhouse_runtime`; regenerar tipos con `pnpm db:generate-types`.
- Módulo `src/lib/hiring/data-origin/contracts.ts` con el tipo `HiringDataOrigin`, el predicado de
  filtro y el helper de derivación, con tests unitarios.

### Slice 2 — Write path: declarar procedencia en el nacimiento

- `createTalentDemand`, `createHiringOpening`, `createHiringApplication` y
  `submitPublicHiringApplication` aceptan `dataOrigin` en su input.
- El intake público (`submitPublicHiringApplication`) **fija `real` sin permitir override**: nadie
  debe poder inyectar un dato marcado como sintético desde internet.
- Trigger `BEFORE INSERT OR UPDATE` en `hiring_application` que deriva `data_origin` desde
  `identity_profiles` + `hiring_opening` (gana el no-real). El command no escribe la columna.
- Los seeds/smokes/scenarios existentes del repo declaran su `dataOrigin` explícito: los 8 archivos
  enumerados en §`Why This Task Exists`.

### Slice 3 — Read path: los readers dejan de contar fantasmas

- `getHiringDeskSnapshot` (`src/lib/hiring/desk.ts`) filtra `data_origin = 'real'` por defecto,
  con parámetro `includeSynthetic?: boolean` explícito.
- Readers y projection de `src/lib/hiring/talent-pool/` con el mismo contrato.
- `build-gold-set-sample.ts` + `gold-set-sampling.ts` excluyen sintéticos **siempre y sin opt-in**:
  es evidencia de un gate de promoción; no existe razón legítima para calibrar contra un seed. El
  `_meta.notes` del instrumento declara la exclusión.
- El filtro de desk y talent pool vive detrás de `HIRING_SYNTHETIC_DATA_FILTER_ENABLED`
  (default `false`); la exclusión del gold set **no lleva flag** (es corrección de un defecto).
- Fila del flag en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` en este mismo commit.

### Slice 4 — Backfill gobernado de lo ya existente

- `src/lib/hiring/data-origin/mark.ts`: `planSyntheticOriginMarking`, `applySyntheticOriginMarking`
  (CAS lote de 1 + audit), `rollbackSyntheticOriginMarking`.
- CLI `scripts/hiring/mark-synthetic-hiring-data.ts` + script npm `hiring:data:mark-synthetic` con
  los modos dry-run / emit-allowlist / apply / rollback.
- Las heurísticas del dry-run son **propuestas con evidencia citada**, nunca veredictos: cada fila
  del plan dice por qué señal entró y con qué confianza.
- Apply del allowlist podado por el operador sobre el universo real.

### Slice 5 — Purga gobernada: archivar por defecto, borrar por excepción

- `src/lib/hiring/data-origin/purge.ts` con dos lanes explícitos y separados
  (contrato detallado en §`Detailed Spec`).
- CLI `scripts/hiring/purge-synthetic-hiring-data.ts` + script npm `hiring:data:purge-synthetic`,
  mismo protocolo dry-run → allowlist → apply.
- El lane de borrado corre una query de blockers **antes** de intentar el DELETE, con el patrón de
  `purge-task-1378-test-applications.ts`, y aborta la corrida entera si una sola fila no califica.

### Slice 6 — Guardrail preventivo + señal de reliability

- `scripts/ci/hiring-data-origin-gate.mjs`: recorre `scripts/**` y `tests/e2e/**` y falla si un
  archivo invoca un command de creación de Hiring sin pasar `dataOrigin` explícito. Se agrega a
  `pnpm qa:gates` y al workflow de CI.
- Los tipos de input de los commands hacen `dataOrigin` **requerido** (no opcional con default) en
  la firma que consumen scripts y tests, de modo que el compilador atrape el olvido antes que el gate.
- `src/lib/reliability/queries/hiring-synthetic-records-aging.ts` →
  `hiring.data_quality.synthetic_records_aging` (`kind: data_quality`, steady `0`, `warning` si hay
  1-10 registros no-real con más de 30 días sin archivar, `error` si más de 10), registrada en el
  módulo `hiring` de `src/lib/reliability/registry.ts`.
- Triple documentación: técnica (delta en `GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`), funcional
  (`docs/documentation/hr/procedencia-de-datos-hiring.md`) y manual
  (`docs/manual-de-uso/hr/operar-purga-de-datos-sinteticos.md`).

## Out of Scope

- **Separar bases de datos por ambiente.** Que dev/staging/prod compartan una Cloud SQL es el
  problema de fondo y es **otro proyecto**, con su propio costo, su propia migración y su propio
  riesgo. Esta task hace que el dato sintético sea identificable y removible dentro de la base
  compartida; no cambia la topología. No proponer, diseñar ni empezar ese trabajo aquí.
- **Growth Forms.** No se toca `src/lib/growth/**` salvo el hand-off declarado: si un formulario de
  Growth desemboca en una `hiring_application` (careers nativo), esa ruta hereda `data_origin` por el
  command de Hiring y nada más cambia del lado de Growth. Cualquier necesidad de procedencia propia
  en Growth es task aparte.
- **Extender `data_origin` a otros dominios** (payroll, finance, CRM, delivery). El patrón queda
  documentado y es replicable, pero esta task sólo cubre Hiring. Marcar personas sintéticas que
  además son `members` toca payroll y exige su propio análisis.
- **UI visible.** No se agrega toggle "incluir sintéticos", ni badge en el desk, ni pantalla de
  administración de procedencia. Los readers filtran; la operación es por CLI. La superficie visible
  es follow-up con su propio wireframe.
- **Purga de `asset_scan_results` o de cualquier tabla append-only.** Explícitamente prohibido.
- **Borrar los datos sintéticos ya identificados sin pasar por el protocolo.** Aunque sean
  "obviamente" de prueba.

## Detailed Spec

### 1. Por qué la persona es la raíz y la aplicación es una copia derivada

La alternativa era anclar la procedencia sólo en `hiring_application`. Se descarta por tres razones:

1. **Una persona sintética lo es en todas sus facetas.** Si mañana un smoke de activación laboral
   convierte a "SMOKE TASK-770" en `member`, la marca tiene que viajar con la persona, no quedarse
   en la aplicación. Anclar en `identity_profiles` hace que Person 360, People y cualquier consumer
   futuro puedan verlo sin conocer el dominio Hiring.
2. **La demanda no tiene persona.** Una `talent_demand` o un `hiring_opening` fantasma —el otro
   fantasma que el CEO reporta— no tiene `identity_profile_id`. Si la procedencia viviera sólo en la
   persona, las vacantes inventadas quedarían fuera del modelo. Por eso hay **dos raíces**: persona y
   demanda.
3. **Pero el desk filtra sobre la aplicación.** Obligar a un JOIN a `identity_profiles` +
   `hiring_opening` en cada lectura es el tipo de invariante que se olvida en el reader número once.
   La copia denormalizada en `hiring_application`, mantenida por trigger, hace que olvidarlo sea
   imposible: el filtro es una columna local.

`candidate_facet` no lleva columna porque su relación con `identity_profiles` es 1:1 con FK `UNIQUE`:
sería una segunda verdad del mismo hecho, y dos verdades del mismo hecho terminan en drift.

### 2. Por qué archivar y no borrar (y cuándo sí borrar)

La hipótesis de partida —archivar lo que tiene historia, borrar los huérfanos— es correcta, y el
código la respalda con evidencia dura:

- `hiring_assessment.application_id` es **`ON DELETE CASCADE`**. Un `DELETE` de una aplicación
  sintética parece limpio y en realidad se lleva por delante, **en silencio**, sus assessments,
  respuestas, runs de scoring y items. Si alguna de esas respuestas fue calificada por una persona,
  se destruye trabajo humano irrecuperable. Esto por sí solo descalifica el DELETE como lane
  por defecto.
- `asset_scan_results` tiene trigger `RAISE EXCEPTION` en DELETE, y cascadea desde `assets`. El
  precedente TASK-1378 chocó con esto y lo resolvió bien: marcó los assets `deleted` (soft-delete del
  dominio) en vez de borrarlos. Se generaliza ese criterio.
- `candidate_identity_display_audit`, `candidate_identity_intake_evidence`,
  `hiring_application_intake_events` y `hiring_handoff_audit` son append-only. Un candidato sintético
  que pasó por el flujo de identidad ya dejó rastro irrepudiable.
- Las FKs de `hiring_application` hacia `identity_profiles` y `candidate_facet` son
  `ON DELETE RESTRICT`: el borrado de una persona con aplicaciones falla en la base, como debe ser.

**Lane A — Archivado (default, cubre casi todo).** `candidate_facet.status = 'archived'`,
`hiring_opening.status = 'cancelled'`, `hiring_application.stage = 'closed'`, más exclusión por
`data_origin` en los readers. Reversible. Preserva toda la auditoría. Es lo que se aplica a cualquier
registro con dependientes auditables.

**Lane B — Borrado (excepción estrecha).** Sólo se autoriza para una fila que cumpla **todas**:
(a) `data_origin <> 'real'`; (b) `stage = 'sourced'` o equivalente inicial, es decir nadie la trabajó;
(c) cero filas en las tablas de audit/evidencia asociadas; (d) cero `hiring_assessment` colgando
(no hay nada que cascadear); (e) cero `hiring_handoff` ni `hiring_activation_request`. La query de
blockers se corre **antes** y, si una sola fila del allowlist falla cualquiera de las cinco
condiciones, **se aborta la corrida completa** — nunca "casi todo", exactamente como hace hoy
`purge-task-1378-test-applications.ts`. El borrado deja fila en `hiring_data_origin_audit` con el
snapshot de lo borrado, para que quede constancia de que existió.

### 3. Contrato del filtro en readers

```ts
// src/lib/hiring/data-origin/contracts.ts
export type HiringDataOrigin = 'real' | 'synthetic_seed' | 'smoke_test' | 'demo'

/** Fragmento SQL canónico. Ningún reader escribe su propio WHERE de procedencia. */
export const realOnlyPredicate = (alias: string): string => `${alias}.data_origin = 'real'`
```

Los readers reciben `includeSynthetic?: boolean` (default `false`). El gold set **no recibe el
parámetro**: su exclusión es incondicional y así queda documentada en el `_meta` del instrumento.

### 4. Heurísticas del dry-run (propuestas, jamás veredictos)

| Señal | Confianza | Nota |
|---|---|---|
| `canonical_email` termina en `@efeonce.test` | alta | dominio reservado, nunca real |
| `canonical_email` en la lista de correos de script conocidos | alta | enumerada desde el repo |
| `canonical_email` con sufijo `+test`/`+smoke` | media | podría ser un alias legítimo |
| `created_by` es una persona agente (`user-agent-*-001`) | media | un operador humano pudo usar la sesión agente |
| Nombre hace match de `SMOKE|PRUEBA|TEST|NO CONTACTAR` | **baja** | **falso positivo demostrado**; nunca suficiente por sí sola |

Ninguna combinación auto-aplica. El plan se imprime, el humano poda, el apply toca sólo lo aprobado.

### 5. Notas de implementación del gate

El gate barre `git ls-files`, así que es ciego a lo untracked: correrlo **después** de `git add`.
Y no escribir dentro del propio gate el patrón literal que persigue (ni en comentarios): se
encontraría a sí mismo.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- `Slice 1 (fundación)` → `Slice 2 (write path)` → `Slice 3 (read path)`. Sin columna no hay nada que
  declarar; sin declaración no hay nada que filtrar.
- `Slice 4 (backfill)` **DEBE** shipear **después** de `Slice 3` y **antes** de `Slice 5`. Después de
  3 porque el operador tiene que poder ver el efecto del filtro sobre lo que marcó, con el flag,
  antes de tocar nada de forma permanente. Antes de 5 porque **no se puede purgar lo que no está
  marcado**: una purga que infiera por regex es exactamente el bug que esta task existe para matar.
- `Slice 5 (purga)` es el único con mutación irreversible y va al final, con su propio sign-off.
- `Slice 6 (guardrail + señal)` puede correr en paralelo con `Slice 4` una vez cerrado `Slice 2`.
- **Prohibido** ejecutar `Slice 5` sin `Slice 4` aplicado y verificado en producción.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| **Un candidato REAL se marca sintético y desaparece del pipeline** (el riesgo grave: nadie lo revisa, nadie lo contacta, se pierde una contratación) | identity / hiring | medium | default `real` (omitir nunca oculta) + allowlist humana obligatoria + heurística de nombre declarada de confianza baja + apply en lotes de 1 con CAS + `--rollback` per-record desde el audit | `hiring.data_quality.synthetic_records_aging` + caída anómala del conteo del desk tras el apply |
| Un DELETE cascadea y destruye respuestas calificadas por humanos | hiring / assessment | medium | Lane B exige cero `hiring_assessment` colgando; query de blockers previa; abort total si una fila falla | fallo del check de blockers; el CLI aborta loud |
| El filtro se prende en producción y HR cree que perdió candidatos | hiring / UI | high | aviso a HR antes del flip + flag reversible en menos de 5 min + el manual explica exactamente qué desaparece y por qué | reporte de HR; revert por flag |
| El trigger de derivación de `hiring_application` marca mal por una raíz mal marcada | hiring | low | el trigger sólo propaga; la corrección se hace en la raíz y el rollback per-record repara ambas | discrepancia entre `data_origin` de la aplicación y de sus raíces (assert en test live) |
| El gate rompe CI de tasks en vuelo de EPIC-011 que crean datos | tooling / CI | medium | el gate nace advisory (`warn`) una semana y promueve a `error` tras avisar a los carriles activos | falla del job en PRs ajenos |
| El dry-run imprime PII de candidatos reales en un log compartido | privacidad | medium | output sólo a stdout local + allowlist gitignoreado + audit sin nombre ni correo + advertencia en el header del CLI | revisión de artefactos de CI |
| Migración additive sobre `identity_profiles` (tabla caliente, core) bloquea escrituras | identity / core | low | `ADD COLUMN … DEFAULT` es metadata-only en PG 16 (no reescribe la tabla); índices con `CONCURRENTLY` fuera de transacción si el volumen lo pide | latencia de escritura en el apply de la migración |

### Feature flags / cutover

- `HIRING_SYNTHETIC_DATA_FILTER_ENABLED` (env var, default `false`) controla **sólo** el filtro de
  desk y talent pool. Flip a `true` tras verificar el backfill en producción. Revert: var a `false` +
  redeploy (menos de 5 min en Vercel).
- **Runtime:** el flag se lee únicamente en el runtime Next.js de Vercel (readers server-side del
  portal). No lo lee el `ops-worker` ni ningún Cloud Run, porque la señal de reliability no depende
  de él: cuenta filas marcadas, no filas filtradas. Declarar esto en la fila del ledger y verificarlo
  con `grep -rn "HIRING_SYNTHETIC_DATA_FILTER_ENABLED" src/ services/` antes de prender.
- **Sin flag:** la exclusión de sintéticos en el sampler del gold set. Es la corrección de un defecto
  que puede contaminar la calibración de la IA; no se le da un interruptor para volver al estado roto.
- **Sin flag:** los commands de marcado y purga. Su puerta es capability + allowlist humana, no un
  flag; un flag encendido jamás autoriza un backfill.
- Registrar la fila en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` en el mismo PR que declara el
  flag (`pnpm docs:closure-check` bloquea el cierre si falta).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | `pnpm migrate:down` (drop de columnas y tabla de audit) o dejar inerte y revert PR | < 10 min | sí |
| Slice 2 | revert PR; las columnas quedan con su default `real` | < 10 min | sí |
| Slice 3 | `HIRING_SYNTHETIC_DATA_FILTER_ENABLED=false` + redeploy | < 5 min | sí |
| Slice 4 | `pnpm hiring:data:mark-synthetic --rollback <auditId> --actor <id> --reason "…"` per-record desde el `before_value` del audit | < 5 min por registro | sí |
| Slice 5 lane A (archivado) | devolver `status`/`stage` al valor del audit | < 5 min por registro | sí |
| Slice 5 lane B (borrado) | **no reversible** — por eso el lane exige cero dependientes auditables y aborta la corrida completa ante cualquier fila dudosa | n/a | **no** |
| Slice 6 | gate a `warn` o removerlo del job; señal se desregistra del registry | < 10 min | sí |

### Production verification sequence

1. `pnpm migrate:up` (Slice 1) y verificar contra `information_schema.columns` que las 4 columnas
   existen con `NOT NULL DEFAULT 'real'`, y que `hiring_data_origin_audit` existe con su trigger.
2. Verificar que ningún dato cambió: `SELECT data_origin, COUNT(*)` en las 4 tablas debe dar
   100 % `real`.
3. Deploy de Slices 2-3 con `HIRING_SYNTHETIC_DATA_FILTER_ENABLED=false`; confirmar que el desk y el
   talent pool muestran exactamente el mismo conteo que antes del deploy.
4. Ejercitar el trigger de derivación con un INSERT dentro de una transacción con `ROLLBACK`.
5. `pnpm hiring:ai:gold-set-sample --dry-run` y confirmar que `poolAvailable` no cambió todavía
   (aún no hay nada marcado) — establece la línea base.
6. Dry-run del marcado (Slice 4) y **revisión humana del plan completo**, fila por fila, con HR.
   Contrastar contra el footprint conocido de 8 scripts.
7. Apply del allowlist podado. Verificar el conteo por `data_origin` y que la tabla de audit tiene
   una fila por registro tocado.
8. `pnpm hiring:ai:gold-set-sample --dry-run` de nuevo: `poolAvailable` debe bajar exactamente en la
   cantidad de respuestas sintéticas marcadas, ni una más.
9. Aviso a HR. Flip de `HIRING_SYNTHETIC_DATA_FILTER_ENABLED=true`. Verificar el desk: el delta de
   filas debe coincidir exactamente con lo marcado.
10. Monitorear `hiring.data_quality.synthetic_records_aging` durante 7 días.
11. Sólo entonces, dry-run de la purga (Slice 5), sign-off explícito del operador humano, y apply
    con el lane que corresponda a cada fila.

### Out-of-band coordination required

- **Aviso a HR / People Ops** antes del flip del filtro en producción: el desk va a mostrar menos
  candidatos y sin contexto eso se lee como pérdida de datos.
- **Sign-off humano explícito** antes del apply del Slice 5 lane B (borrado): es la única mutación
  irreversible de la task.
- **Aviso a los carriles activos de EPIC-011** (`1719/1720/1721/1722`, `1727…1733`) antes de promover
  el gate de `warn` a `error`, para que sus seeds declaren `dataOrigin` sin romper su CI.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Las 4 tablas (`identity_profiles`, `talent_demand`, `hiring_opening`, `hiring_application`)
      tienen `data_origin TEXT NOT NULL DEFAULT 'real'` con CHECK del enum cerrado de 4 valores,
      verificado contra `information_schema.columns` en producción.
- [ ] `greenhouse_hiring.hiring_data_origin_audit` existe y rechaza UPDATE y DELETE con excepción.
- [ ] `candidate_facet`, `hiring_assessment` y `hiring_assessment_response` **no** tienen columna
      propia de procedencia: heredan por JOIN (verificable por ausencia en el schema).
- [ ] El trigger de derivación marca no-real toda `hiring_application` cuya persona **o** cuya
      vacante es no-real, y hay test que cubre las cuatro combinaciones.
- [ ] `submitPublicHiringApplication` fija `data_origin = 'real'` sin permitir override desde el
      payload público, con test que lo prueba.
- [ ] `getHiringDeskSnapshot` y los readers de talent pool excluyen no-real por defecto y aceptan
      `includeSynthetic`, con test para ambos caminos.
- [ ] `build-gold-set-sample.ts` excluye no-real **sin parámetro que lo desactive**, y el `_meta` del
      instrumento lo declara.
- [ ] `pnpm hiring:data:mark-synthetic` sin flags es read-only y no muta nada.
- [ ] El apply del marcado exige `--allowlist`, `--actor` y `--reason` (mínimo 10 caracteres), opera
      en lotes de 1 con CAS y escribe una fila de audit por registro.
- [ ] `--rollback <auditId>` restaura el `data_origin` previo desde el audit.
- [ ] El lane de borrado aborta la corrida **completa** si cualquier fila del allowlist tiene un
      dependiente auditable, con test que cubre el abort.
- [ ] Ninguna tabla append-only (`asset_scan_results`, `*_audit`, `*_intake_events`) es borrada ni ve
      su trigger desactivado por esta task.
- [ ] `pnpm hiring:data-origin-gate` falla ante un script que crea datos de Hiring sin `dataOrigin`
      explícito, y pasa cuando lo declara.
- [ ] Las 2 capabilities nuevas están en `capabilities_registry` + catálogo TS + grant a ≥1 rol real
      en el mismo PR (`capability-grant-coverage.test.ts` verde).
- [ ] `hiring.data_quality.synthetic_records_aging` está registrada en el módulo `hiring` del
      reliability registry y visible en `/admin/operations`.
- [ ] `HIRING_SYNTHETIC_DATA_FILTER_ENABLED` tiene fila en
      `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` con su runtime declarado.
- [ ] Ni el dry-run ni el audit filtran nombre o correo de candidatos a logs compartidos, Sentry o CI.
- [ ] Triple documentación cerrada: delta técnico en `GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`,
      funcional en `docs/documentation/hr/`, manual en `docs/manual-de-uso/hr/`.

## Verification

- `pnpm local:check`
- `pnpm vitest run src/lib/hiring src/lib/reliability`
- `pnpm test` (suite completa, gate de cierre)
- `pnpm build` (producción — pedir autorización al operador antes de correrlo)
- `pnpm hiring:data-origin-gate`
- `pnpm task:lint --task TASK-1739` y `pnpm ops:lint --changed`
- `pnpm docs:closure-check`
- Verificación en DB real vía `pnpm pg:connect:shell` según la §`Production verification sequence`.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` quedó sincronizado con el cierre
- [ ] `Handoff.md` quedó actualizado
- [ ] `changelog.md` quedó actualizado
- [ ] se ejecutó chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `EPIC-011` registra el cierre y la secuencia actualizada
- [ ] `TASK-1734` recibe un `## Delta` indicando que el sampler del gold set ya excluye sintéticos
      por construcción
- [ ] `scripts/hiring/purge-task-1378-test-applications.ts` queda anotado como superado por el CLI
      genérico

## Clasificación verificada por el operador (2026-08-17)

Censo real contra la DB compartida, con la **verdad de origen confirmada por el CEO** en sesión.
Esto es el input humano del backfill del Slice de remediación: quien ejecute la task NO debe
re-derivar esta clasificación por heurística ni volver a preguntar.

### Vacantes (`hiring_opening`) — 10 totales

**REALES (2) — jamás tocar:**

| public_id | Título | Estado | Apps |
|---|---|---|---|
| `EO-OPN-0009` | Account Manager / Especialista en Marketing | active/published | 15 |
| `EO-OPN-0061` | Content Creator — SEO/AEO & Editorial | active/published | 32 |

**SINTÉTICAS (8) — `data_origin='smoke_test'`, purgables:** `EO-OPN-0050`, `EO-OPN-0051`,
`EO-OPN-0052`, `EO-OPN-0053`, `EO-OPN-0054`, `EO-OPN-0055`, `EO-OPN-0056`, `EO-OPN-0057` —
todas `TASK-1372 SMOKE opening <timestamp>`, `created_by='task-1372-smoke'`, `status=closed`,
creadas en ~5 minutos por la misma corrida. Arrastran 8 postulaciones sintéticas.

### Candidatos sospechosos (10 de 52) — confirmar uno a uno antes de marcar

`EO-ID0240` (QA Careers DomainSubmit), `EO-ID0272`–`EO-ID0276` (Task Smoke, TASK-1372),
`EO-ID0277` (Http Smoke), `EO-ID0280` (SMOKE TASK-354 QA), `EO-ID0312` (PRUEBA TASK-1378),
`EO-ID0313` (Prueba TASK-1689). Más el seed `qa.seed.task1738@efeonce.test` creado el 2026-08-16
para la evidencia visual del workbench.

### 🔴 Los DOS falsos positivos que prueban por qué no se infiere

1. **Por creador:** `EO-OPN-0009` (Account Manager, **real**, 15 postulaciones, proceso vivo)
   fue marcada 🚩 por la heurística `created_by ~ 'system:|agent'` — las vacantes reales de este
   portal también las crea un agente (`system:codex`). Purgar por esa señal habría borrado la
   vacante del proceso en curso.
2. **Por nombre:** la respuesta real `arsp-61c6579f…` (candidata real, banda alta, dentro de la
   muestra del gold set) dice *"Propondría pequeñas **pruebas** o pilotos…"* y hace match con
   `SMOKE|PRUEBA|TEST`. Purgar por esa señal habría destruido evidencia de evaluación humana —
   de las 11 únicas que existen.

**Invariante que se deriva:** ninguna señal heurística (nombre, email, creador) auto-aplica jamás.
Se usan sólo para *proponer* en el dry-run, con confianza declarada, y un humano aprueba la
allowlist línea por línea. La marca `data_origin` se escribe **al crear**, nunca se infiere después.

## Follow-ups

- Superficie UI de procedencia (badge en el desk, toggle "incluir sintéticos" gateado por capability,
  vista de administración): task `ui-ux` propia con wireframe.
- Extender `data_origin` a otros dominios que compartan la base (payroll, CRM, delivery) reusando el
  patrón, empezando por el caso en que una persona sintética llega a ser `member`.
- Evaluar si la separación de bases por ambiente entra al roadmap: esta task la vuelve menos urgente,
  no innecesaria.
- Retención automática: política que archive un `smoke_test` a los N días sin intervención humana,
  una vez que la señal demuestre que el universo es estable.

## Open Questions

- ¿`demo` debe quedar exento de la purga automática por defecto? La hipótesis es que sí (un dato de
  demo puede necesitar sobrevivir para mostrar la plataforma), pero requiere confirmación del
  operador antes de implementar el lane.
- ¿El umbral de la señal (30 días) es el correcto, o HR prefiere una ventana más corta para los
  `smoke_test`? Ajustable sin cambio de contrato.
