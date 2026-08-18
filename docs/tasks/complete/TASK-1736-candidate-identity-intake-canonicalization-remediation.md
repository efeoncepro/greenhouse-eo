# TASK-1736 — Candidate Identity Intake Canonicalization + Governed Remediation

## Delta 2026-08-16 (2) — Correcciones de auditoría doble aplicadas

- **A1 (PASS):** el apply histórico persiste actor + motivo en el audit del reconcile
  (`reconcileCandidateIdentityDisplayName` acepta `{actorUserId?, reasonNote?}`; el apply los pasa siempre).
- **A2 (PASS):** `rollbackCandidateIdentityRemediation({auditId, actorUserId, reason})` implementado
  (CAS del before-value del audit `reconcile/applied`; mismatch ⇒ `needs_review` sin mutar; reversión
  registrada como corrección humana) + subcomando CLI `--rollback <auditId>`; runbook y manual actualizados.
- **A4:** evidencia trunca a 400 pre-INSERT (edge 401 del parser 200+200) y el capture a Sentry de la capa
  de gobernanza viaja sanitizado (code/constraint PG, jamás DETAIL con PII).
- **A5:** display vacío post-estructural ⇒ placeholder neutro `Candidato` + `needs_review` (jamás display
  invisible desde el submitted crudo).
- **A6:** `countMatchesExpected = (applied + skippedAlreadyCanonical) === expected` — retry de apply
  exitoso idempotente (exit 0); CLI reporta el desglose.
- **A7/A8/A3 (docs):** delta de enmiendas en el ADR (D5 availability tolerante, residual plan→apply
  procedimental, nota CAS-vs-dry-run) + nota en `GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` del cambio de
  semántica `COALESCE` de `createIdentityProfile` para TODOS los consumers 360; `--apply` valida el sufijo
  gitignoreado de la allowlist.
- Suite `pnpm vitest run src/lib/hiring/candidate-intake` verde con los tests nuevos de cada fix.

## Delta 2026-08-16

- Slice 0 ejecutado — ADR **Proposed** en
  `docs/architecture/GREENHOUSE_CANDIDATE_IDENTITY_INTAKE_CANONICALIZATION_DECISION_V1.md`
  (modelo de 3 capas evidencia/display/search, policy de casing culturalmente segura, fix del sticky
  name vía `reconcileCandidateIdentityDisplayName`, remediación histórica dry-run → allowlist → apply
  CAS → rollback, field policy matrix §D5) + fila en `docs/architecture/DECISIONS_INDEX.md`.
- Sign-offs Talent/Identity/Privacy/Security/Data **resueltos por autorización ejecutiva del CEO
  2026-08-16** (misma figura que `TASK-1734`; ver ADR §D6): ninguna firma adicional bloquea; los gates
  técnicos no se rebajan y las obligaciones regulatorias de privacidad siguen intactas como actividades.
- Siguiente: Slice 1 según spec (primitive canónico de intake + entry parity).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
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
- Status real: `Diseno — defecto verificado read-only en DB configurada; ADR y ejecución pendientes`
- Rank: `TBD`
- Domain: `hr|identity|data|growth`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Canonicaliza los datos estructurados del intake de candidatos —con foco en el nombre person-first— sin
destruir lo que la persona escribió: evidencia original application-scoped, display normalizado/corregible y
clave de búsqueda separada. Cierra además el nombre inicial “sticky” de `identity_profiles`, endurece teléfono,
URLs y disponibilidad en el command común de Hiring, y remedia los registros existentes sólo mediante
`dry-run → allowlist revisada → apply → rollback`.

## Why This Task Exists

La auditoría read-only del 2026-08-16 encontró 53 perfiles candidatos y 53 aplicaciones: 4/53 nombres (7,5 %)
tenían casing anómalo —dos completamente en minúsculas y dos en mayúsculas—, incluido el caso reportado de
Valentina Villa. No hubo duplicados normalizados; 53/53 correos estaban canonicalizados, 12 teléfonos tenían
estructura E.164 y 13 países eran ISO alpha-2. La causa no es el formulario visual: `schema.ts` sólo aplica
`trim`, concatena `fullName`, `submit-application.ts` lo entrega a `createIdentityProfile`, y ese primitive
persiste `full_name` verbatim; si el correo ya existe, devuelve el perfil previo sin reconciliar el nombre, por
lo que una entrada inicial defectuosa queda pegada. Ambas entradas públicas convergen en ese mismo recorrido.

Un `Title Case` global sería una segunda falla: dañaría nombres como “María de los Ángeles”, “van der Meer”,
“McDonald” u “O’Neill”. La solución necesita separar evidencia, representación y matching; preservar tildes y
autoría; y hacer cualquier reparación de PII exacta, explicable, reversible y auditada.

## Goal

- Introducir un contrato canónico y versionado para nombre original, nombre de display y search key, compartido
  por Careers y Growth Forms antes de escribir Person/Hiring.
- Reconciliar de forma idempotente el display name de una identidad existente sin confundir personas ni perder
  evidencia histórica por aplicación.
- Endurecer los demás campos estructurados del intake de Hiring y remediar exclusivamente los casos históricos
  revisados, con flag, señales, dry-run y rollback verificado.

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
- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_IDENTITY_CONSUMPTION_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md`

Reglas obligatorias:

- `greenhouse_core.identity_profiles` sigue siendo la Person canónica; no crear un root candidato ni copiar
  identidad hacia una ficha paralela.
- El valor original es evidencia del postulante y es inmutable; el display normalizado y la search key son
  representaciones derivadas, versionadas y nunca sustituyen silenciosamente esa evidencia.
- Structural normalization segura (`Unicode NFC`, whitespace Unicode, controles/bidi) puede ser determinista;
  el casing sólo se aplica automáticamente si la policy lo clasifica `high_confidence`. Ambigüedad =
  `needs_review`, no adivinanza.
- Preservar diacríticos, partículas, apóstrofes y guiones. Prohibido un `Title Case` ciego o reglas
  anglocéntricas como fuente de verdad.
- Teléfono y residencia son conceptos distintos: el calling code sale de una selección explícita del campo de
  teléfono, nunca se infiere del país de residencia.
- Mensaje y respuestas abiertas permanecen candidate-authored: sólo límites/seguridad, sin reescritura de
  ortografía, casing, saltos de línea o estilo.
- Ningún evento, log, métrica o error incluye nombres, correos, teléfonos, URLs o payloads crudos.
- La task requiere ADR aceptada antes de cambiar schema/source of truth o ejecutar remediación.

## Normative Docs

- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`
- `docs/tasks/complete/TASK-1367-careers-apply-intake-service.md`
- `docs/tasks/complete/TASK-1688-careers-application-contact-completeness.md`
- `docs/tasks/complete/TASK-1318-growth-forms-full-name-destination-split.md`
- `docs/tasks/to-do/TASK-1728-person-professional-profile-canonical-foundation.md`

## Dependencies & Impact

### Depends on

- Parser canónico del intake: `src/lib/hiring/public-careers/schema.ts`.
- Command común de postulación: `src/lib/hiring/public-careers/submit-application.ts`.
- Entrada Careers desde Growth Forms: `src/lib/hiring/public-careers/growth-form-contract.ts` y
  `src/lib/growth/forms/validators/core.ts`.
- Primitive Person existente: `src/lib/account-360/organization-store.ts` (`createIdentityProfile`).
- Aggregate Hiring: `greenhouse_hiring.candidate_facet` y `greenhouse_hiring.hiring_application`, fundados por
  `migrations/20260707235655376_task-353-hiring-ats-domain-foundation.sql`.
- Contact completeness: `migrations/20260812094000000_task-1688-careers-contact-completeness.sql`.

### Blocks / Impacts

- Mejora la calidad de los readers de Hiring, Talent Pool, Candidate Review y People 360 que consumen
  `identity_profiles.full_name`; no cambia sus DTOs sin discovery explícito.
- Coordina con `TASK-1728`: esta task posee core identity intake/display/search; TASK-1728 conserva skills,
  tools, languages, certifications, links, bio, evidence y CV versions person-scoped.
- Puede derivar una task `ui-ux` para corrección manual si se necesita affordance en Application/People 360;
  esta foundation no agrega UI.
- El hardening genérico de Growth Forms, objective IDs de assessment y nombres de archivo CV se registran como
  follow-ups separados si el discovery confirma gaps; no se absorben aquí.

### Files owned

- `migrations/` (migración aditiva TASK-1736 para evidencia/representaciones y audit de corrección).
- `src/lib/hiring/candidate-intake/` (nuevo: policy, normalizers, detector, commands y readers).
- `src/lib/hiring/public-careers/schema.ts` (delta de integración).
- `src/lib/hiring/public-careers/submit-application.ts` (delta de integración).
- `src/lib/hiring/public-careers/growth-form-contract.ts` (delta sólo si la policy de opciones lo exige).
- `src/lib/account-360/organization-store.ts` (delta mínimo para estrangular el write verbatim).
- `scripts/` (nuevo CLI dry-run/apply/rollback allowlisted, si discovery confirma CLI como adapter correcto).
- `src/config/entitlements-catalog.ts` y `src/lib/entitlements/runtime.ts` (delta sólo si la corrección humana
  requiere capability nueva; capability + grant + coverage en el mismo PR).
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` y ADR nueva.
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`.
- `docs/documentation/hr/` (contrato funcional y runbook de remediación).

## Current Repo State

### Already exists

- `parsePublicHiringApplication` valida el payload, normaliza correo, estructura teléfono E.164 y país ISO-2;
  también limita `message` y exige HTTPS en URLs.
- Careers custom y Growth Forms nativo convergen en `submitPublicHiringApplication`, que reconcilia
  Person → `candidate_facet` → `hiring_application`.
- `createIdentityProfile` deduplica email-first y `candidate_facet` es UNIQUE por `identity_profile_id`;
  estas invariantes evitan una raíz de candidato paralela.
- TASK-1688 ya posee completitud/persistencia de teléfono, residencia y mensaje. Esta task no reabre su modelo
  ni inventa valores para historia sin evidencia.

### Gap

- Nombres sólo reciben outer trim; no hay NFC, colapso de whitespace interno, control de bidi/controles,
  representación raw/display/search ni policy multicultural de casing.
- `identity_profiles.full_name` recibe el nombre concatenado verbatim y el path de identidad preexistente no
  reconcilia display name; el primer valor puede quedar sticky.
- URLs se validan como HTTPS pero no tienen canonicalización host/trailing slash/fragment/tracking declarada.
- `availability` acepta texto acotado, pero no se valida server-side contra el catálogo estable publicado.
- El contrato teléfono/calling-country necesita comprobar que ambas entradas públicas entreguen selección
  explícita y no conserven un prefijo por defecto incoherente con lo que la persona eligió.
- No existe detector, ledger ni workflow gobernado para reparar representaciones históricas.

## Modular Placement Contract

- Topology impact: `domain-package`
- Current home: `src/lib/hiring/public-careers/** + src/lib/account-360/organization-store.ts + PostgreSQL compartido`
- Future candidate home: `domain-package`
- Boundary: `normalizeCandidateIdentityInput + reconcileCandidateIdentityDisplayName + plan/apply/rollbackCandidateIdentityRemediation; consumers autorizados: public Careers adapter, Growth Forms Hiring projection, App API/CLI interno gobernado y readers Person/Hiring`
- Server/browser split: `normalización authoritative, DB, flags, capability y remediación son server-only; el browser sólo entrega raw input y opciones explícitas`
- Build impact: `none`
- Extraction blocker: `transacción y dedupe email-first compartidos entre greenhouse_core.identity_profiles y greenhouse_hiring.candidate_facet/application`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `migration`
- Source of truth afectado: `greenhouse_core.identity_profiles.full_name` + nueva evidencia/representación application-scoped definida por la ADR TASK-1736
- Consumidores afectados: `Careers público; Growth Forms Hiring projection; Hiring Desk; Talent Pool; Candidate Review; People 360; App API/CLI interno`
- Runtime target: `local → staging → production (portal Vercel + PostgreSQL)`

### Contract surface

- Contrato existente a respetar: `parsePublicHiringApplication` → `submitPublicHiringApplication` →
  `createIdentityProfile`; schemas `greenhouse_core.identity_profiles`, `greenhouse_hiring.candidate_facet` y
  `greenhouse_hiring.hiring_application`.
- Contrato nuevo o modificado: `CandidateIdentityIntake` versionado (`submitted`, `display`, `searchKey`,
  `normalizationVersion`, `reviewState`) + commands `reconcileCandidateIdentityDisplayName` y
  `applyCandidateIdentityRemediation` + reader/report `planCandidateIdentityRemediation`.
- Backward compatibility: `gated y aditiva; readers actuales pueden seguir leyendo full_name mientras la nueva escritura está OFF/shadow`.
- Full API parity: `la policy y writes viven en primitives server-side; Careers, Growth Forms, CLI, App API y
  futuros agentes consumen el mismo contrato. La corrección no vive en un submit handler ni en SQL manual`.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_core.identity_profiles`;
  `greenhouse_hiring.hiring_application`; nueva tabla exacta a fijar en ADR para evidencia de nombre por
  application y audit append-only de reconciliación.
- Invariantes que no se pueden romper:
  - Una Person conserva un solo `identity_profile_id`; casing o whitespace jamás crean otra identidad.
  - La evidencia submitted es append-only/inmutable y mantiene Unicode/diacríticos del input tras saneamiento
    de controles peligrosos; display/search son derivados versionados.
  - Un display correction exige application/identity exactas, before-value conocido, reason/purpose y actor;
    jamás usa nombre solo como selector.
  - `high_confidence` puede materializar display; `needs_review` no muta `identity_profiles.full_name`.
  - Email continúa lowercase/canonical; phone continúa E.164; país continúa ISO alpha-2; null no se infiere.
  - Texto libre no se canonicaliza semánticamente.
- Tenant/space boundary: `Hiring interno single-tenant; cualquier write operador exige sesión interna y
  capability fina. El submit público sólo ejecuta la policy determinista allowlisted sobre su propia application`.
- Idempotency/concurrency: `dedupe por applicationId + identityProfileId + normalizationVersion + input digest;
  compare-and-set sobre before-value para reconciliación; retry del mismo command es no-op; conflicto deriva a
  needs_review, nunca last-write-wins`.
- Audit/outbox/history: `audit append-only con IDs, versión, clasificación, actor/purpose y hashes; outbox/logs
  sin PII. La ADR decide si corresponde evento IDs-only o sólo audit local`.

### Migration, backfill and rollout

- Migration posture: `additive + backfill allowlisted; ninguna columna destructiva ni rewrite global`.
- Default state: `shadow/read-only; flag HIRING_CANDIDATE_IDENTITY_NORMALIZATION_ENABLED default OFF`.
- Backfill plan: `query detectora read-only → reporte con IDs/hashes y métricas → snapshot cifrado/restringido de
  before-values → allowlist humana de los 4 casos observados → apply en lotes de 1 → readback → cooldown. Cualquier
  delta de cardinalidad o ambigüedad detiene el apply`.
- Rollback path: `flag OFF; compare-and-set de cada identidad aplicada hacia su before-value exacto usando el
  ledger/snapshot; las evidencias raw y el audit no se borran. Rollback ensayado en staging antes de producción`.
- External coordination: `ADR + sign-off Talent/Identity/Privacy/Security/Data; flag en Vercel; ventana de apply
  de PII aprobada por operador. Sin provider ni secret nuevo`.

### Security and access

- Auth/access gate: `submit público limitado a su command y anti-abuse existentes; detector/dry-run requiere
  acceso DB read-only gobernado; apply/rollback exige capability fina o CLI operator-authenticated decidida en
  discovery, con actor y purpose obligatorios`.
- Sensitive data posture: `PII de candidato; no nombres/correos/teléfonos/URLs en logs, eventos, fixtures,
  métricas o reportes compartidos. Evidencia y snapshots siguen retención Hiring/Privacy`.
- Error contract: `codes estables y sanitizados (invalid_candidate_name, candidate_name_needs_review,
  identity_reconciliation_conflict, remediation_precondition_failed); nunca raw DB/provider errors`.
- Abuse/rate-limit posture: `reusa rate limit/anti-abuse del submit público; apply sólo allowlist exacta, bounded,
  compare-and-set y kill switch; sin endpoint masivo público`.

### Runtime evidence

- Local checks: `unit/property tests Unicode y multiculturales; parity tests de Careers/Growth Forms; regression
  de email/phone/country/message; idempotency/concurrency y no-PII tests`.
- DB/runtime checks: `migration up/down en DB efímera; detector read-only; dry-run/apply/rollback con fixtures;
  constraints, grants y audit verificados por query`.
- Integration checks: `dos submissions sintéticas en staging — Careers y Growth Forms— con el mismo input;
  readback de raw/display/search y caso identity preexistente`.
- Reliability signals/logs: `hiring_candidate_identity_normalization_needs_review`,
  `hiring_candidate_identity_reconciliation_conflict`, `hiring_candidate_identity_remediation_failed`; sólo
  conteos/IDs internos permitidos, nunca valores PII`.
- Production verification sequence: `deploy flag OFF → shadow canary → comparar métricas/cardinalidad → habilitar
  writes nuevos low-volume → cooldown → dry-run histórico → allowlist de 1 → readback/rollback rehearsal → resto
  uno a uno → monitoreo 7 días`.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] La normalización y reconciliación viven en primitives server-side, no en componentes ni route handlers.
- [ ] Read/dry-run y write/apply/rollback tienen contratos programáticos separados y errores canónicos.
- [ ] Si se introduce capability, registry + grants a roles reales + coverage test llegan en el mismo PR.
- [ ] El write reintentable tiene idempotencia, compare-and-set, audit y observabilidad sin PII.
- [ ] Careers, Growth Forms, CLI/App API y futuros agentes no duplican reglas de nombres o matching.
- [ ] El command de corrección es compatible con `propose → confirm → execute`; no existe bypass SQL operativo.
- [ ] Parity check = SÍ antes de declarar completa la task.

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

### Slice 0 — ADR + field policy matrix

- Aprobar representación raw/display/search, ownership entre Person y application, retención, correction
  authority, audit/event posture y cutover.
- Publicar matriz por campo (`name`, `email`, `phone`, `phoneCountry`, `residenceCountry`, `portfolioUrl`,
  `linkedinUrl`, `availability`, `message`) con `validate | normalize | preserve | reject | needs_review`.
- Fijar corpus multicultural y thresholds high-confidence/needs-review antes de migrar o escribir datos.

### Slice 1 — Canonical candidate intake primitive + entry parity

- Implementar normalización estructural versionada y clasificación de casing con fixtures/property tests.
- Estrangular ambas entradas públicas para que invoquen el mismo primitive antes de Person/Hiring.
- Mantener email/phone/country/message compatibles y cerrar canonicalización server-side de URLs/opciones Hiring.

### Slice 2 — Additive evidence model + identity reconciliation

- Crear migración aditiva aprobada por ADR para evidencia application-scoped y audit de reconciliación.
- Implementar write idempotente del intake y command compare-and-set para identidad nueva/existente.
- Exponer reader/command gobernados con Full API Parity, capability/grant si corresponde y eventos IDs-only si
  la ADR los exige.

### Slice 3 — Detector + governed historical remediation

- Construir detector read-only con métricas y hashes, sin PII en output compartido.
- Ejecutar dry-run y generar allowlist humana exacta; no asumir que siguen siendo cuatro casos al momento del
  apply.
- Ensayar apply y rollback en staging; ejecutar producción uno a uno sólo con sign-offs y precondiciones verdes.

### Slice 4 — Canary, signals and operational closure

- Registrar flag default OFF, señales y runbook; validar canary de ambas entradas y caso identity preexistente.
- Verificar no-PII, anti-IDOR/capability, idempotencia, concurrencia y rollback.
- Actualizar arquitectura, documentación funcional, manual y estado runtime honesto.

## Out of Scope

- Ranking, scoring, selección, decisión, stage moves, asignación de tests o envío de correos.
- Mostrar al postulante resultados, scores, rationale, notas internas o correcciones operativas.
- Reescribir mensajes, respuestas abiertas de assessment, cartas, CV o cualquier texto libre authored.
- Perfil profesional person-scoped de `TASK-1728` (skills, tools, languages, certifications, links, bio, CV).
- Motor genérico de validación de Growth Forms fuera de los campos consumidos por Hiring.
- Objective IDs/respuestas del assessment y hardening del display filename del CV; tasks follow-up si aplican.
- UI de corrección manual en Application 360/People 360; requiere task `ui-ux` consumer separada.
- Backfill global por casing, matching por nombre o inferencia de país/calling code desde otra propiedad.

## Detailed Spec

### Name representation

- `submitted`: evidencia por aplicación; conserva el contenido authored después de rechazar/remover sólo
  controles no representables/peligrosos según ADR.
- `display`: NFC + whitespace Unicode colapsado + casing high-confidence; corregible con actor/reason.
- `searchKey`: derivada, no visible, con algoritmo/version explícitos; nunca se usa sola para fusionar Person.
- `reviewState`: `normalized | needs_review | corrected`, con provenance y versión.

La policy debe demostrar casos de partículas, nombres compuestos, apóstrofes rectos/curvos, guiones, casing
mixto intencional, alfabetos no latinos, emoji/control chars, whitespace Unicode y nombres de una letra. Los
tests no pueden imponer “primera letra mayúscula” como criterio universal.

### Other structured fields

- Email: conservar el contrato lowercase/canonical existente y agregar sólo regresión.
- Phone: E.164 authoritative generado desde calling-country explícito; residencia no cambia el prefijo.
- Country: ISO alpha-2 uppercase; no derivar país por IP, teléfono o correo.
- URLs: HTTPS, hostname canonical, sin credenciales; la ADR/policy decide fragmentos, tracking params y slash sin
  alterar paths significativos.
- Availability: valor server-side en catálogo estable/versionado; unknown falla con code canónico.
- Message/open text: trim exterior y límite de seguridad compatibles; saltos internos y estilo se preservan.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 0 MUST close before Slice 1 or any schema/data write.
- Slice 1 → Slice 2 → Slice 3 → Slice 4.
- Migration and shadow reader MUST ship before enabling the new writer.
- Rollback rehearsal in staging MUST pass before the first production remediation apply.
- Historical remediation MUST NOT begin until new writes are stable, or the defect can reintroduce itself.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Casing incorrecto o pérdida cultural del nombre | identity | medium | high-confidence only + corpus multicultural + raw preserved + needs_review | `hiring_candidate_identity_normalization_needs_review` |
| Dos personas se fusionan por representación | identity | low | email/person ID authoritative; searchKey nunca fusiona; compare-and-set | `hiring_candidate_identity_reconciliation_conflict` |
| PII aparece en logs/reportes | identity/data | medium | redaction tests + IDs/hashes only + restricted snapshot | no-PII gate / security review |
| Backfill pisa corrección reciente | migration | medium | before-value CAS + lotes de 1 + cooldown + abort on conflict | `hiring_candidate_identity_remediation_failed` |
| Drift entre Careers y Growth Forms | API | medium | contract tests sobre mismo fixture/input digest | parity test failure |
| Teléfono válido con calling code no elegido | Hiring intake | medium | selector explícito + server recomputation + no inferencia por residencia | validation/error metrics |

### Feature flags / cutover

- `HIRING_CANDIDATE_IDENTITY_NORMALIZATION_ENABLED` default `false` controla materialización de display/search y
  reconciliación; flag OFF mantiene validación compatible y puede conservar shadow metrics sin PII.
- El historical apply requiere además allowlist explícita generada desde un dry-run vigente; el flag por sí solo
  nunca autoriza backfill.
- Revert inmediato: flag OFF + redeploy. Las filas aditivas quedan inertes y auditables.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 0 | superseder ADR/policy antes de runtime | mismo día | sí |
| Slice 1 | flag OFF + revert adapters al parser compatible | <15 min tras deploy | sí |
| Slice 2 | flag OFF; reader legacy sobre `full_name`; conservar tabla/audit inerte | <30 min | sí |
| Slice 3 | compare-and-set al before-value exacto desde ledger/snapshot | 1 registro por vez | sí, verificado en staging |
| Slice 4 | flag OFF + detener canary/apply; mantener señales para investigación | <15 min | sí |

### Production verification sequence

1. ADR y sign-offs Talent/Identity/Privacy/Security/Data aprobados.
2. Migración staging + verify constraints/grants/audit; deploy con flag OFF.
3. Canary Careers y Growth Forms con fixtures multiculturales; verificar raw/display/search y no-PII.
4. Caso staging de email existente: no duplica Person y reconciliación conflict-safe.
5. Apply/rollback staging allowlisted; comparar before/after y audit.
6. Deploy producción flag OFF; shadow 24 h y confirmar cardinalidad/error budget.
7. Habilitar nuevo writer low-volume; cooldown y readback.
8. Regenerar dry-run histórico; aprobación humana de allowlist; aplicar un registro, verificar y continuar uno a uno.
9. Monitorear señales 7 días; detener/revert ante conflicto, PII leak o drift de parity.

### Out-of-band coordination required

- Aprobación explícita de ADR y field policy por Talent, Identity, Privacy, Security y Data.
- Ventana autorizada para apply/rollback de PII histórica y custodia del snapshot restringido.
- Flip del flag en Vercel staging/production; no hay proveedores, credenciales ni infraestructura nueva.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] ADR aceptada define raw/display/search, ownership, retención, correction authority, audit y rollout.
- [ ] Careers y Growth Forms Hiring producen el mismo `CandidateIdentityIntake` para inputs equivalentes.
- [ ] El nombre authored se conserva por aplicación y el display/search son derivados versionados.
- [ ] Corpus multicultural/Unicode prueba que no existe `Title Case` global ni pérdida de diacríticos.
- [ ] Identidad preexistente se reconcilia idempotentemente por ID/email authoritative, sin duplicar Person; una
  discrepancia ambigua queda `needs_review` y no muta `full_name`.
- [ ] Email, phone/calling-country, residence ISO-2, URLs y availability tienen contrato server-side y regresión;
  message/open text conserva authored content.
- [ ] Detector read-only reporta cardinalidad/anomalías sin PII; dry-run no escribe.
- [ ] Apply histórico sólo acepta applicationId/identityProfileId exactos, allowlist revisada, before-value CAS,
  actor/purpose y lote bounded; rollback exacto pasa en staging.
- [ ] Flag default OFF, señales, grants/capability, ledger y runbook están registrados y verificados.
- [ ] Logs/eventos/métricas/errores no exponen PII; tests negativos y revisión Privacy/Security pasan.
- [ ] Canary staging y producción demuestran ambas entradas, identity existente, no duplicados y rollback.
- [ ] Ninguna superficie candidate-facing muestra resultados, scores, rationale o datos internos como efecto de
  esta task.

## Verification

- `pnpm task:lint --task TASK-1736`
- `pnpm ops:lint --changed`
- `pnpm lint`
- `pnpm tsc --noEmit`
- Tests unit/property/contract focales de `src/lib/hiring/candidate-intake/**` y public careers.
- Migration up/down + constraints/grants/audit sobre DB efímera.
- Staging smoke de Careers + Growth Forms + identity existente + dry-run/apply/rollback.
- Queries read-only de cardinalidad, parity y duplicados antes/después; outputs sanitizados.
- `pnpm qa:gates --changed`
- `pnpm docs:closure-check`
- `pnpm docs:context-check:strict` como último gate documental.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla).
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`).
- [ ] `docs/tasks/README.md` quedó sincronizado con el cierre.
- [ ] `Handoff.md` quedó actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes.
- [ ] `changelog.md` quedó actualizado si cambió comportamiento, estructura o protocolo visible.
- [ ] se ejecutó chequeo de impacto cruzado sobre otras tasks afectadas.
- [ ] ADR, sign-offs, flag ledger, remediación/rollback evidence y estado runtime quedaron enlazados desde la task.

## Follow-ups

- Consumer `ui-ux` de corrección manual en Application 360/People 360, sólo si el workflow operador lo requiere.
- Hardening genérico de maxLength/options en Growth Forms si el gap excede los campos Hiring.
- Canonicalización/membership de objective IDs del assessment, sin tocar respuestas abiertas.
- Sanitización Unicode/control/bidi del display filename de CV, separada del contenido/document pipeline.

## Open Questions

- La ADR debe decidir si la evidencia/representación vive en tabla application-scoped dedicada o en un contrato
  aditivo equivalente; no reutilizar un JSON genérico ni duplicar Person.
- Discovery debe resolver si la corrección operador reusa una capability existente de identidad o necesita una
  capability fina nueva; nunca usar un rol admin-coarse como contrato.
