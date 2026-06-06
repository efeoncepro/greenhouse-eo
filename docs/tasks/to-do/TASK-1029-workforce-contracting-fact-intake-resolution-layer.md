# TASK-1029 — Workforce Contracting Studio · Fact intake & resolution layer (offer terms + canonical person/entity facts)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio-Alto`
- Type: `implementation`
- Epic: `—` (programa Workforce Contracting Studio, raíz TASK-1019)
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `hr|workforce|ai|payroll|identity|ui|api`
- Blocked by: `none` (aditivo; el AI draft ya acepta `facts`)
- Branch: `task/TASK-1029-contracting-fact-intake-resolution`
- Legacy ID: `—`
- GitHub Issue: `—`

## Summary

Hoy el Workforce Contracting Studio **abre un caso con solo Persona + Pack + Fecha de inicio y nunca captura ni resuelve los datos del documento** (sueldo/monto, moneda, período/método de pago, RUT, nacionalidad, dirección, rol). El botón "Generar borrador IA" llama al endpoint con `facts: {}` literal → Claude no recibe nada → **toda carta oferta / contrato sale con cada campo en `[POR DEFINIR]`** y la entidad sale genérica (caso real verificado: carta oferta de Maggie, 2026-06-05). Esta task agrega la **capa canónica de facts**: (1) **resuelve** los datos de persona + entidad desde las fuentes canónicas (`person_legal_profile` TASK-784, identidad, operating entity) — sin re-tipear; (2) **captura** los términos de la oferta (remuneración + rol + modalidad) que aún no existen en ninguna tabla; (3) los persiste en el caso y los **inyecta server-side** en el draft IA; (4) bloquea "Generar borrador" / aprobación cuando faltan facts requeridos por el pack. **Sin escribir payroll** (no crea `compensation_versions`).

## Why This Task Exists

El programa Workforce Contracting Studio (TASK-1019 foundation → TASK-1021 admin viewer → TASK-1022 collaborator viewer) shippeó toda la cadena **aggregate → draft IA → validación → review bilingüe → (PDF/firma EPIC-001)** pero **dejó un hueco estructural en el origen de los datos**: el `ALLOWED_FACT_CODES` allowlist existe (`input-packet.ts`), el endpoint `ai-draft` acepta `body.facts`, y `create-draft` ya persiste `captured_facts_json` en el draft — **pero nada en la UI ni en el server puebla ese objeto**. El "Flujo guiado" (builder) que debía capturarlos quedó honestamente *locked* ("Próximamente", TASK-1021). Resultado: el draft IA es estructuralmente correcto (cláusulas, paridad ES/EN, jerarquía) pero **vacío de contenido** — útil como plantilla, inservible como documento real.

Es un gap de raíz, no un bug local: el dominio de contracting **valida** la tupla `(contract_type, pay_regime, payroll_via)` y los `requiredFacts` por pack, pero no tiene de dónde leer los valores. El fix correcto separa el **origen** de cada fact (canónico-resuelto vs capturado-en-oferta) y respeta los invariantes de payroll (la oferta propone montos; NO los materializa como compensación).

## Goal

- El operador puede **capturar los términos de la oferta** (monto bruto, moneda, período, método de pago, rol, modalidad, beneficios) en una superficie clara, con prefill de lo resuelto.
- Los datos de **persona (RUT, nacionalidad, fecha nac., dirección, autorización/residencia) y entidad (razón social)** se **resuelven de fuentes canónicas** y se prellenan (read-only/masked), **nunca se re-tipean**.
- "Generar borrador IA" produce un draft con los **datos reales** del caso (cero `[POR DEFINIR]` para los facts provistos); los `[POR DEFINIR]` restantes corresponden solo a facts opcionales no provistos.
- "Generar borrador IA" y "Aprobar par bilingüe" quedan **bloqueados con mensaje honesto** cuando faltan facts **requeridos por el pack** (no se drafta/aprueba un documento incompleto en silencio).
- Cero escritura de payroll: capturar términos de oferta **no** crea/actualiza `compensation_versions` ni recalcula nómina.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_WORKFORCE_CONTRACTING_STUDIO_V1.md` (§11 input packet allowlist; advisory-only AI; bilingüe obligatorio)
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` (regímenes; compensation versions como SSOT de compensación)
- `CLAUDE.md` → "Workforce Contracting Studio invariants (TASK-1019)" + "Person Legal Profile invariants (TASK-784)" + "International Internal Contract Type Invariants (TASK-894)"
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md` (Persona = `identity_profiles`; extender por FK, no paralelo)

Reglas obligatorias (load-bearing):

- **NUNCA** escribir/mutar `greenhouse_payroll.compensation_versions`, `payroll_entries` ni recalcular nómina desde el dominio de contracting. La oferta **propone** montos; la cadena oferta→contrato→compensation-version es un paso gobernado **aparte** (fuera de scope). Gate de cierre: `pnpm vitest run src/lib/payroll` verde.
- **NUNCA** re-tipear facts de persona que ya viven en `person_legal_profile` (TASK-784). Resolverlos vía los readers canónicos (`readPersonLegalSnapshot` / `assessPersonLegalReadiness`, useCase `document_render_onboarding_contract`). Re-tipear es drift + viola TASK-784.
- **NUNCA** loggear el valor crudo de RUT/documento/dirección ni del `legalReviewReference` en outbox/Sentry/logs. Usar los masked readers; el snapshot autorizado escribe audit `export_snapshot`.
- **NUNCA** mandar a Claude facts fuera de `ALLOWED_FACT_CODES` (allowlist en `input-packet.ts`). Secrets/bank/tokens/salary-history se dropean por construcción — preservar esa propiedad.
- **NUNCA** asumir moneda CLP. La moneda es **explícita** por fact `currency`; para `international_internal` (Maggie) típicamente USD, **bruto sin** deducciones Chile, y `legalReviewReference` obligatorio (TASK-894, ya enforced en `create-case`).
- Microcopy es-CL tuteo por `src/lib/copy/workforce-contracting.ts` (NUNCA literales en JSX). UI nueva pasa por el loop product-design + GVC (greenhouse-ux / modern-ui / forms-ux / state-design / greenhouse-ux-writing).

## Normative Docs

- `docs/tasks/complete/TASK-784-person-legal-profile-identity-documents-foundation.md` (readers + readiness + useCases)
- `docs/tasks/complete/TASK-1019-workforce-contracting-studio-foundation-ai-drafting.md` (allowlist, advisory AI, validators)
- `docs/tasks/complete/TASK-1021-workforce-contracting-admin-viewer-runtime.md` ("Flujo guiado" locked — esta task lo activa)

## Dependencies & Impact

### Depends on

- `src/lib/workforce/contracting/ai/input-packet.ts` → `ALLOWED_FACT_CODES` + `buildContractingInputPacket` (existe)
- `src/lib/workforce/contracting/jurisdiction-packs/registry.ts` → `requiredPersonFacts` / `requiredCompensationFacts` / `requiredClauses` por pack (existe)
- `src/lib/workforce/contracting/commands/{create-case,create-draft}.ts` (existe; `captured_facts_json` ya es columna del draft)
- `src/app/api/hr/workforce/contracting/[caseId]/ai-draft/route.ts` (existe; hoy lee `body.facts ?? {}`)
- `src/lib/person-legal-profile/**` (TASK-784: `readPersonLegalSnapshot`, `assessPersonLegalReadiness`, masked readers)
- Operating entity identity helper (`getOperatingEntityIdentity()` / org reader) para `operating_entity_legal_name`

### Blocks / Impacts

- **Coordina con TASK-1030** (offer vs contract differentiation): el set de `requiredFacts` puede variar por `documentKind` (oferta exige menos que contrato). Esta task define la **captura/resolución**; TASK-1030 define el **shape por documentKind**. Ortogonales pero deben acordar `requiredFacts`.
- **Desbloquea contenido real** para TASK-1023 (PDF render — hoy renderiza `[POR DEFINIR]`) y TASK-1024 (firma — no se debe firmar un documento vacío).
- Toca la superficie "Flujo guiado" de `WorkforceContractingStudioView` (hoy locked) y el `BilingualReviewDesk` (gate del botón generar/aprobar).
- No impacta payroll runtime (additive, sin escritura de compensación).

### Files owned

- `src/lib/workforce/contracting/facts/` (NUEVO — resolver + tipos + merge + readiness de facts)
  - `resolve-facts.ts` (server-only): resuelve persona+entidad de fuentes canónicas
  - `facts-types.ts` (pure): shape de `ContractingFacts` + origen por fact (`resolved` | `captured`)
  - `facts-readiness.ts` (pure): faltantes requeridos por pack (blocker vs warning)
- `src/lib/workforce/contracting/commands/capture-facts.ts` (NUEVO): persiste facts capturados en el caso (atómico + audit)
- `src/app/api/hr/workforce/contracting/[caseId]/facts/route.ts` (NUEVO): GET (resueltos+capturados+faltantes) / PUT (capturar)
- `src/app/api/hr/workforce/contracting/[caseId]/ai-draft/route.ts` (MODIF): server-side compone facts (resolver + capturados) en vez de confiar `body.facts`
- `src/lib/workforce/contracting/commands/create-draft.ts` (MODIF): snapshot de los facts efectivos en `captured_facts_json`
- `src/views/greenhouse/hr/workforce-contracting/` (MODIF/NUEVO): superficie de captura de facts (activar "Flujo guiado") + gate del review desk
- `src/lib/copy/workforce-contracting.ts` (MODIF): copy de captura + faltantes + bloqueos
- migración SQL (si se decide columna dedicada en el caso — ver Open Questions)
- `scripts/frontend/scenarios/workforce-contracting-fact-capture.scenario.ts` (NUEVO — GVC)

## Current Repo State

### Already exists

- `ALLOWED_FACT_CODES` (25 códigos) + sanitización por allowlist + `buildContractingInputPacket` con `providedFactCodes`/`droppedFactCodes` (`input-packet.ts`).
- Packs con `requiredPersonFacts` / `requiredCompensationFacts` / `requiredClauses` por jurisdicción (`registry.ts`): CL dependiente, CL extranjero, international_internal.
- `ai-draft` route que **acepta** `facts` y los sanitiza (`route.ts:34`).
- `create-draft` persiste `captured_facts_json` en el draft (forward-compat ya presente).
- TASK-784 readers de persona (RUT/documento/dirección) con masked + snapshot autorizado + readiness por useCase.
- `BilingualReviewDesk.handleGenerate` → `POST ai-draft` con `body: JSON.stringify({})` (la prueba del gap).
- "Flujo guiado" mode existe en el shell pero está **locked** (copy "Próximamente").

### Gap

- **No hay capa de facts**: nada puebla el objeto `facts`. El draft IA siempre recibe `{}` → todo `[POR DEFINIR]`.
- No hay **resolución canónica** de persona/entidad hacia el documento.
- No hay **captura** de términos de oferta (remuneración/rol/modalidad).
- No hay **gate**: se puede generar/aprobar un documento sin los facts requeridos por el pack.
- La superficie de captura ("Flujo guiado") está locked.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE (no llenar al crear)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Fact model + canonical resolver (pure + server, sin UI)

- `facts-types.ts`: tipo `ContractingFacts` (subset tipado de `ALLOWED_FACT_CODES`) + `ContractingFactEntry { code, value, origin: 'resolved'|'captured', source?: string }`. Pure, testeable.
- `resolve-facts.ts` (server-only): `resolveContractingFacts(caseId) → { resolved: ContractingFacts, sources }`. Resuelve:
  - persona: `full_name`, `national_id`, `nationality`, `birth_date`, `address`, `country_of_residence`, `work_authorization`, `residence_permit` desde `person_legal_profile` (TASK-784, useCase `document_render_onboarding_contract`) + identidad.
  - entidad: `operating_entity_legal_name` desde la operating entity del caso.
  - relación: `target_start_date` desde el caso.
- `facts-readiness.ts` (pure): `assessFactReadiness(packCode, documentKind, facts) → { missingRequired: string[], missingOptional: string[], ok: boolean }` cruzando `requiredPersonFacts` + `requiredCompensationFacts` del pack.
- Tests: resolver con persona verificada/no verificada (degrada honesto), readiness por los 3 packs.

### Slice 2 — Capture command + facts API

- `capture-facts.ts`: `captureContractingFacts({ caseId, facts, actorUserId })` — valida contra `ALLOWED_FACT_CODES` + tipos, persiste **en el caso** (`metadata_json.captured_facts` o columna dedicada — ver Open Questions), atómico + appendea `case_event` `facts_captured` (sin valores crudos sensibles en el payload). Idempotente (upsert por código).
- `GET/PUT /api/hr/workforce/contracting/[caseId]/facts`: GET devuelve `{ resolved, captured, effective, missingRequired, missingOptional }`; PUT captura. Gated por la misma capability de manage del estudio (`workforce.contracting.*`). Errores es-CL canónicos.

### Slice 3 — Wire facts into AI draft (server-authoritative) + gate

- `ai-draft` route: **componer** `effectiveFacts = { ...resolved, ...captured }` server-side (ignora `body.facts` salvo override explícito de debug). Bloquea con 422 + `missingRequired` cuando faltan facts requeridos por el pack (no draftear documentos vacíos).
- `create-draft`: snapshot `captured_facts_json = effectiveFacts` (lo que produjo el draft).
- `BilingualReviewDesk`: deshabilita "Generar borrador IA" con tooltip/alert honesto cuando `missingRequired.length > 0`; deshabilita "Aprobar par bilingüe" igual. Reusa el patrón de blockers ya existente.

### Slice 4 — Capture UI (activar "Flujo guiado") + GVC enterprise

- Superficie de captura en el mode "Flujo guiado" (hoy locked): formulario con `react-hook-form` + `forms-ux` + `GreenhouseDatePicker`:
  - **Resueltos** (read-only/masked, con badge "De ficha de la persona"): RUT, nacionalidad, fecha nac., dirección, entidad.
  - **Términos de oferta** (capturar): `gross_amount` + `currency` (selector explícito), `pay_period`, `pay_method`, opcional `variable_compensation`/`benefits`, `role_title`, `area`, `work_mode`/`work_location`/`remote_setup`, `contract_term_type`.
  - Estados honestos (`state-design`): persona sin ficha completa → CTA "Completar ficha" (deep-link TASK-784) en vez de campo editable; degradado si el resolver falla.
- Loop product-design (greenhouse-ux + modern-ui + forms-ux + greenhouse-ux-writing) + GVC `fe:capture` mirado + `fe:capture:diff` si hay mockup.

## Out of Scope

- **NO** crear/actualizar `compensation_versions` ni materializar la compensación (eso es la transición oferta→contrato, task aparte gobernada).
- **NO** PDF render (TASK-1023) ni firma (TASK-1024) — esta task solo llena el contenido del draft.
- **NO** motor de retención `international_internal` (TASK-905/906/907); la oferta declara bruto + moneda, no calcula neto.
- **NO** captura de facts para honorarios/contractor (packs no soportados aún en el registry V0).

## Detailed Spec

### Sourcing matrix (decisión canónica)

| Fact code | Origen | Razón |
|---|---|---|
| `full_name`, `national_id`, `nationality`, `birth_date`, `address`, `country_of_residence`, `work_authorization`, `residence_permit` | **resolved** (`person_legal_profile` TASK-784 + identidad) | Datos legales canónicos; re-tipear = drift + viola TASK-784 |
| `operating_entity_legal_name` | **resolved** (operating entity del caso) | SSOT de la entidad pagadora |
| `target_start_date` | **resolved** (caso) | Ya capturado en intake |
| `gross_amount`, `currency`, `pay_period`, `pay_method`, `variable_compensation`, `benefits` | **captured** (términos de oferta) | En una **oferta** la compensación aún no existe en `compensation_versions` — se propone ahora |
| `role_title`, `area`, `seniority`, `manager_name` | **captured** (con prefill si existe en member) | Términos del rol ofrecido |
| `work_mode`, `work_location`, `remote_setup`, `prior_conditions`, `contract_term_type` | **captured** | Modalidad/condiciones de la oferta |

Para **employment_contract de un member ya contratado**: preferir leer la compensación vigente desde `compensation_versions` (read-only) como prefill; el operador confirma. (Slice futuro / Open Question — V1 captura siempre.)

### Mapeo legal (Chile dependiente, Art. 10 Código del Trabajo → facts)

- N°1 lugar/fecha + individualización partes → `place_and_date` (cláusula) + `full_name`/`national_id`/`nationality`/`birth_date`/`address` + `operating_entity_legal_name`
- N°3 naturaleza de los servicios + lugar → `role_title`/`area` + `work_location`
- **N°4 monto, forma y período de pago** → `gross_amount` + `currency` + `pay_period` + `pay_method` ← el gap headline
- N°5 jornada → `work_mode` (+ cláusula `working_hours`)
- N°6 plazo → `contract_term_type`
- N°7 demás pactos → `benefits` + `variable_compensation` (+ cláusula `additional_pacts_and_benefits`)

### Persistencia + flujo

```
create-case (Persona + Pack + Fecha)                      ← intake actual (sin cambio)
  → PUT /facts (captura términos de oferta)               ← NUEVO (Slice 2/4)
      persiste captured en el caso (+ case_event)
  → POST /ai-draft                                         ← MODIF (Slice 3)
      effectiveFacts = resolveContractingFacts(caseId) ⊕ captured
      if missingRequired → 422 (no draftea vacío)
      buildContractingInputPacket({ facts: effectiveFacts, ... })  ← allowlist ya dropea lo no permitido
  → create-draft snapshot captured_facts_json = effectiveFacts
```

### Invariantes payroll (gate de cierre)

- `pnpm vitest run src/lib/payroll` verde (cero impacto en nómina).
- Ninguna ruta de esta task hace INSERT/UPDATE en `compensation_versions`/`payroll_entries`.
- `international_internal`: `currency` obligatorio + sin deducciones Chile en el contenido + `legalReviewReference` ya exigido por `create-case`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (resolver + readiness, pure/server) → Slice 2 (capture command + API) → Slice 3 (wire AI draft + gate) → Slice 4 (UI).
- Slice 3 (gate) **debe** shippear junto con el wiring: una vez que el draft lee facts reales, el botón debe bloquear faltantes (sino se generan drafts a medias con datos parciales).
- Slice 4 (UI) **después** de que el API de facts (Slice 2) exista.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Escritura accidental de compensación desde el dominio contracting | payroll | low | Gate `pnpm vitest run src/lib/payroll` + revisión: cero imports de comp-version writers | `payroll` test rojo |
| Leak de RUT/dirección crudos en logs/outbox/Sentry | identity | medium | Masked readers TASK-784 + payload de `case_event` sin valores sensibles + `captureWithDomain('workforce', …)` | grep de valores crudos en logs |
| Fact fuera de allowlist llega a Claude | ai | low | `ALLOWED_FACT_CODES` ya dropea; test de `droppedFactCodes` | `droppedFactCodes` no vacío inesperado |
| Persona sin ficha completa bloquea silenciosamente | identity/ui | medium | `assessFactReadiness` + estado honesto + deep-link "Completar ficha" (TASK-784) | usuario reporta bloqueo sin causa |
| Drift moneda (asumir CLP) | payroll/finance | low | `currency` obligatorio explícito en captura; sin default CLP | revisión de PDF/draft |

### Feature flags / cutover

- El draft IA ya está detrás de `WORKFORCE_CONTRACTING_AI_ENABLED` (default OFF en prod; ON solo staging — invariante TASK-1019). La capa de facts es **aditiva** y se ejercita solo cuando la IA está habilitada. Sin flag adicional necesario; el gate (Slice 3) es seguro porque solo **agrega** una precondición a una acción ya gateada.
- Si se prefiere graduar la UI, gatear "Flujo guiado" con un flag de rollout hasta GVC verde.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (pure/server, sin consumidores) | <5 min | sí |
| Slice 2 | revert PR; si hubo migración, `migrate:down` (additive, nullable) | <10 min | sí |
| Slice 3 | revert el wiring → vuelve a `body.facts` (comportamiento previo) | <5 min | sí |
| Slice 4 | re-lock "Flujo guiado" (revert UI) | <5 min | sí |

### Production verification sequence

1. Staging con `WORKFORCE_CONTRACTING_AI_ENABLED=true`: capturar facts de un caso sintético + `GET /facts` muestra resolved+captured+missing.
2. "Generar borrador IA" con facts completos → draft con datos reales (cero `[POR DEFINIR]` para los provistos).
3. Caso con facts requeridos faltantes → botón bloqueado + mensaje honesto + 422 del endpoint.
4. Verificar `compensation_versions` **no** cambió (query antes/después).
5. `pnpm vitest run src/lib/payroll src/lib/workforce/contracting` verde.
6. Prod permanece con IA OFF (sin cambio de comportamiento) hasta decisión de habilitar.

### Out-of-band coordination required

- N/A — repo-only. (La habilitación de la IA en prod es decisión separada del operador; esta task no la cambia.)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `resolveContractingFacts(caseId)` resuelve persona+entidad de fuentes canónicas (TASK-784 + operating entity), masked, sin re-tipear, con degradación honesta si la ficha está incompleta.
- [ ] `PUT /facts` captura términos de oferta validados contra `ALLOWED_FACT_CODES`; `GET /facts` devuelve resolved+captured+effective+missing.
- [ ] "Generar borrador IA" produce un draft con los datos reales del caso (cero `[POR DEFINIR]` para facts provistos); verificado con un caso real (Maggie u otro).
- [ ] "Generar borrador IA" y "Aprobar par bilingüe" se **bloquean** con mensaje es-CL honesto cuando faltan facts requeridos por el pack; el endpoint responde 422.
- [ ] La captura corre por el server al draftear (server-authoritative); el cliente no decide los facts.
- [ ] Cero escritura en `compensation_versions`/`payroll_entries`; `pnpm vitest run src/lib/payroll` verde.
- [ ] `international_internal`: moneda explícita, bruto sin deducciones Chile, `legalReviewReference` exigido.
- [ ] UI de captura revisada en loop product-design + GVC mirado (greenhouse-ux/modern-ui/forms-ux/state-design/greenhouse-ux-writing).
- [ ] Copy 100% en `src/lib/copy/workforce-contracting.ts` (sin literales en JSX).

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test` (focal `src/lib/workforce/contracting` + `src/lib/payroll`)
- `pnpm fe:capture workforce-contracting-fact-capture --env=local` (GVC mirado)
- Manual: capturar facts → generar draft → verificar contenido real + bloqueo de faltantes.

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado (aprendizajes/deuda)
- [ ] `changelog.md` actualizado (comportamiento visible nuevo)
- [ ] chequeo de impacto cruzado: actualizar TASK-1023 (PDF) y TASK-1024 (firma) — ahora reciben contenido real
- [ ] invariante CLAUDE.md "Workforce Contracting Studio" actualizado si emerge regla nueva (p.ej. "facts server-authoritative")

## Follow-ups

- Transición **oferta aceptada → contrato → `compensation_version`** (paso gobernado, fuera de scope): materializar la compensación capturada cuando la oferta se acepta.
- Prefill de compensación desde `compensation_versions` para `employment_contract` de members ya contratados.
- Facts para packs honorarios/contractor cuando el registry los soporte.
- `reliability signal` opcional: casos `ai_drafted` cuyo `captured_facts_json` tiene `missingRequired` (no debería ocurrir post-gate).

## Open Questions

1. **Persistencia de captured facts**: ¿columna dedicada `captured_facts_json` en `workforce_contracting_cases` (simétrica con la del draft, queryable, con CHECK) **o** `metadata_json.captured_facts` (sin migración)? Recomendación: columna dedicada (mejor gobernanza + el draft ya tiene su espejo). Decidir en Plan Mode.
2. **Override de debug**: ¿permitir `body.facts` como override en `ai-draft` solo en no-prod para QA, o eliminarlo del todo (server-authoritative puro)? Recomendación: server-authoritative; override solo detrás de env no-prod.
3. **employment_contract de member existente**: ¿V1 captura siempre, o ya en V1 prefill desde `compensation_versions`? Recomendación: V1 captura; prefill como follow-up.
4. **Granularidad del gate**: ¿bloquear solo "Aprobar", o también "Generar borrador" cuando faltan requeridos? Recomendación: bloquear ambos (no draftear documentos estructuralmente vacíos), permitiendo "borrador parcial" solo si el operador lo pide explícito.
