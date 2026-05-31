# TASK-976 — Contractor Onboarding / Create Engagement Surface

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-013`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `hr|people|ui`
- Blocked by: `none`
- Branch: `task/TASK-976-contractor-onboarding-create-engagement`
- Legacy ID: `none`

## Summary

Construye la superficie de **onboarding** para crear un contractor desde el portal. Hoy un engagement solo se crea por API/script: `POST /api/hr/contractors` (`createContractorEngagement`, contractor nuevo) y `POST /api/hr/contractors/transition-from-offboarding` (`transitionEmployeeToContractorEngagement`, empleado→contractor). **Ninguno tiene UI** — Valentina Hoyos se creó ejecutando un script (TASK-956). Esta task da la pantalla HR/People-first para los dos caminos.

## Why This Task Exists

Auditoría 2026-05-31 del EPIC contractors: el dominio puede crear engagements por dos caminos backend (creación directa + transición atómica empleado→contractor TASK-956), pero **no existe ningún botón "Crear contractor"** en el portal. Consecuencia: cada onboarding de contractor requiere un agente corriendo un script — no es operable por HR. Esta superficie se solapa conceptualmente con **TASK-965 (Unified Worker Create/Edit Workflow)**: hay que decidir en Plan Mode si esta task es (a) el carril contractor-scoped que TASK-965 absorbe a futuro, o (b) un step independiente. Mientras TASK-965 no exista, esta es la única forma de onboardear un contractor sin script.

## Goal

- Superficie HR/People-first para crear un contractor engagement desde el portal.
- Camino A — **contractor nuevo**: resolver la relación legal de contractor en Person 360 (o exigir que exista) + crear el engagement (`createContractorEngagement`).
- Camino B — **empleado→contractor**: entry point para `transitionEmployeeToContractorEngagement` desde un offboarding `executed` (el camino de Valentina), sin script.
- Respetar el boundary duro: la transición es read-only/append-only sobre finiquito + offboarding + member; NUNCA muta `contract_type`/`final_settlements`/status del offboarding.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Mandatory Skills (OBLIGATORIO — no negociable)

Esta task **DEBE** ejecutarse invocando **las skills de product design** en loop con GVC, igual que TASK-968. NO se permite escribir runtime sin haber pasado por el loop de product design + mockup aprobado. Las skills de product design canónicas a invocar:

1. **`greenhouse-mockup-builder`** — mockup como ruta real (`src/app/(dashboard)/hr/contractors/new/mockup/page.tsx` + `src/views/greenhouse/contractors/mockup/*`), mock data tipada, Vuexy/MUI wrappers, primitives del repo. NO HTML aparte.
2. **`greenhouse-ux`** + **`modern-ui`** — arquitectura del wizard (pasos, branching A vs B), jerarquía, selección de componentes, tokens 2026.
3. **`forms-ux`** — wizard multi-paso canónico (Lane C de forms-ux): progress indicator, validación per-step, back preserva datos, branching declarativo A/B, autosave si aplica. Cumplir el 17-row floor + la anatomía de wizard.
4. **`greenhouse-microinteractions-auditor`** — transiciones de paso, feedback de validación.
5. **`greenhouse-ux-writing`** — copy es-CL antes de escribirlo (labels, helper text, errores, estados, aria); extender `src/lib/copy/*`.
6. **`greenhouse-payroll-auditor`** — clasificación del worker + boundary honorarios/Deel/contractor; invocar para validar que el onboarding no rompe la matriz contractual ni el boundary payroll.

**Loop GVC obligatorio**: `pnpm fe:capture` en loop con las skills de product design hasta enterprise 2026 + aprobación del operador del mockup + verificación runtime GVC.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_LEGAL_RELATIONSHIP_RECONCILIATION_V1.md` (relaciones legales)
- `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` + `DESIGN.md`
- `docs/tasks/to-do/TASK-965-unified-worker-create-edit-workflow.md` (decidir solapamiento)

Reglas obligatorias:

- **NO** crear endpoints nuevos: `POST /api/hr/contractors` y `POST /api/hr/contractors/transition-from-offboarding` ya existen. UI-only (salvo que Plan Mode detecte que falta un endpoint de "resolver relación legal" — entonces se evalúa).
- **`createContractorEngagement` NO crea la relación legal**: requiere `profileId` + `personLegalEntityRelationshipId` + `legalEntityOrganizationId` existentes. El camino A debe resolver/exigir esa relación (o derivar a la transición si la persona era empleada).
- **Camino B boundary duro (TASK-956)**: la transición compone cierre de relación empleo + apertura contractor + creación del engagement en una tx atómica; es read-only/append-only sobre finiquito + offboarding; NUNCA muta `member.contract_type` / `final_settlements` / status del offboarding. La UI no debe ofrecer atajos que violen esto.
- **Matriz contractual canónica**: respetar `international_internal`/honorarios/contractor invariants (CLAUDE.md). El onboarding no debe permitir tuplas inválidas.
- **Boundary EPIC-013/TASK-957**: gate de cierre `pnpm vitest run src/lib/payroll` + `pnpm vitest run src/lib/workforce/offboarding` verde.

## Normative Docs

- `CLAUDE.md` → "Employee→Contractor connected command invariants (TASK-956)" + "Contractor Engagements invariants (TASK-790)" + "Contractor domain ↔ Finiquito/Offboarding non-regression boundary".

## Dependencies & Impact

### Depends on

- `createContractorEngagement` (`POST /api/hr/contractors`) + `transitionEmployeeToContractorEngagement` (`POST /api/hr/contractors/transition-from-offboarding`).
- Resolución de relaciones legales (Person 360): `resolveActivePersonLegalEntityRelationships`, `account-360/person-legal-entity-relationships.ts`.
- Offboarding cases `executed` (camino B).

### Blocks / Impacts

- Desbloquea onboardear contractors sin script.
- Se solapa con TASK-965 (Unified Worker Workflow) — coordinar alcance.
- Complementa TASK-974 + TASK-975 — los 3 cierran el set de superficies del EPIC.

### Files owned

- `src/app/(dashboard)/hr/contractors/new/page.tsx` (+ `/mockup/`)
- `src/views/greenhouse/contractors/ContractorOnboardingWizard.tsx`
- `src/views/greenhouse/contractors/mockup/*`
- `src/lib/copy/contractor-compensation.ts` (extender) o nuevo
- `scripts/frontend/scenarios/contractor-onboarding.scenario.ts`

## Current Repo State

### Already exists

- 2 endpoints de creación (directa + transición), backend completo + atómico.
- Resolución de relaciones legales Person 360.
- Valentina creada por el camino B vía script (referencia del flujo).

### Gap

- Ningún botón "Crear contractor". Ningún wizard. Cero UI de onboarding.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 0 — Plan Mode: alcance vs TASK-965 + Mockup aprobado

- Decidir con greenhouse-ux + arch si esta task es el carril contractor-scoped (absorbible por TASK-965) o independiente.
- Mockup del wizard (branching A contractor nuevo / B empleado→contractor) con loop GVC + skills de product design + aprobación del operador.

### Slice 1 — Camino B (empleado→contractor)

- Wizard que parte de un offboarding `executed`: selecciona la persona/caso → confirma términos del engagement (subtype, payroll_via, rate, etc.) → `POST transition-from-offboarding`.
- Surface honesto del resultado (idempotente: `transitioned` / `engagement_created_on_existing_relationship` / `already_complete`).

### Slice 2 — Camino A (contractor nuevo)

- Wizard que resuelve/exige la relación legal de contractor (profileId + personLegalEntityRelationshipId + legalEntityOrganizationId) → crea el engagement (`POST /api/hr/contractors`).
- Si la persona era empleada, derivar al camino B.

### Slice 3 — Cierre

- Docs (funcional + manual). GVC runtime. CLAUDE.md invariants + arch Delta si emerge regla.

## Out of Scope

- Pagos/payables → TASK-974.
- Lifecycle/edición/clasificación post-creación → TASK-975.
- Crear la relación legal desde cero si no existe (eso es Person 360 / TASK-965); esta task la resuelve/exige, no la fabrica, salvo que Plan Mode decida lo contrario.

## Detailed Spec

**Camino B (recomendado primero)** — `transitionEmployeeToContractorEngagement(input)`: atómico, keyed en offboarding `executed`, decoupled de la ratificación del finiquito. Mapea subtype de relación → subtype de engagement (honorarios→honorarios_cl, contractor+CL→freelance, contractor+non-CL→international_contractor). Idempotente.

**Camino A** — `createContractorEngagement(input)`: requiere relación contractor activa preexistente. Payload: profileId, memberId?, personLegalEntityRelationshipId, legalEntityOrganizationId, countryCode, relationshipSubtype, payrollVia, currency, paymentModel, rateType, rateAmount?, paymentCadence, requiresInvoice?, requiresWorkApproval?, taxComplianceOwner?, etc. (ver `POST /api/hr/contractors` route).

**Riesgo de clasificación**: el engagement nace con riesgo computado fresco (`needs_review`), nunca auto-clear — la revisión vive en TASK-975.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 0 (plan + mockup) → 1 (camino B) → 2 (camino A) → 3 (cierre). Camino B primero porque es el caso real más frecuente (empleado que pasa a contractor, como Valentina) y tiene el comando atómico ya probado.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Onboarding crea engagement que rompe boundary (muta contract_type/finiquito) | payroll/identity | low | El comando backend es read-only/append-only por construcción (TASK-956); UI no ofrece atajos; gate `pnpm vitest run src/lib/payroll` + offboarding | `hr.contractor.transition_orphan` |
| Tupla contractual inválida desde el wizard | payroll | medium | Validar contra la matriz canónica; backend rechaza; forms-ux validación per-step | `payroll.contract_taxonomy.invalid_tuple_drift` |
| Engagement huérfano (relación sin engagement o viceversa) | identity | low | El comando es atómico/idempotente; signal `hr.contractor.transition_orphan` steady=0 | `hr.contractor.transition_orphan` |
| Duplicar esfuerzo con TASK-965 | platform | medium | Slice 0 decide alcance antes de construir | n/a |

### Feature flags / cutover

Sin flag — superficie UI nueva gateada por capability (`hr.contractor_engagement:create`/`:manage`) + viewCode. Additive. Si Plan Mode lo amerita, considerar flag para el camino A hasta validar la resolución de relación legal.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 0-3 | revert PR (UI additive). Los engagements creados por la UI quedan en `draft`/`pending_review` y se cancelan vía TASK-975 si fueron error | <10 min (revert) | sí |

### Production verification sequence

1. Deploy staging + verify el wizard carga.
2. Camino B en staging: tomar un offboarding `executed` de prueba → transicionar → verify engagement creado + member/finiquito/offboarding intactos.
3. Camino A en staging: crear un contractor nuevo con relación preexistente → verify engagement `draft`/`pending_review`.
4. Verify signals `hr.contractor.transition_orphan` = 0.
5. Repetir en prod con cooldown.

### Out-of-band coordination required

Coordinar con HR el proceso de onboarding (quién crea, qué datos se exigen) antes de exponer el wizard. Confirmar con Plan Mode el solapamiento con TASK-965.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Mockup aprobado por el operador (loop GVC + skills de product design).
- [ ] HR puede onboardear un contractor desde el portal por ambos caminos (empleado→contractor + contractor nuevo) sin script.
- [ ] El camino B respeta el boundary duro (member/finiquito/offboarding intactos; signal `transition_orphan`=0).
- [ ] El wizard valida la matriz contractual; tuplas inválidas se rechazan.
- [ ] Copy es-CL tokenizado; wizard cumple la anatomía forms-ux.
- [ ] Decisión documentada sobre el solapamiento con TASK-965.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- `pnpm vitest run src/lib/payroll src/lib/workforce/offboarding src/lib/contractor-engagements` (no-regresión EPIC-013)
- `pnpm design:lint`
- GVC runtime de ambos caminos.

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (TASK-965, TASK-974, TASK-975)
- [ ] CLAUDE.md invariants + arch Delta + doc funcional + manual

## Follow-ups

- Si TASK-965 (Unified Worker Workflow) avanza, evaluar fusionar/absorber esta superficie.
- Crear la relación legal desde cero (cuando la persona no existe en Person 360) si emerge la necesidad.

## Open Questions

- ¿Esta task es independiente o el carril contractor de TASK-965? (resolver en Slice 0 con arch + greenhouse-ux).
- ¿El camino A debe poder crear la relación legal, o exigir que exista? (decidir en Plan Mode).
