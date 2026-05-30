# TASK-956 — Employee → Contractor Engagement Transition (connected command + entry point)

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-013`
- Domain: `hr | identity | contractor`
- Blocked by: `none` (TASK-789, TASK-790, TASK-791..796 ya complete)
- Branch: `task/TASK-956-employee-to-contractor-transition-connected-command`

## Summary

Conectar el seam huérfano del dominio Contractor Engagements: hoy una persona que sale como `employee` (offboarding executed) y debe quedar como **contractor honorarios** NO tiene un camino canónico, conectado y operable. Esta task crea un **comando conectado atómico** que cierra la relación `employee` + abre la `contractor` (vía la primitiva canónica TASK-789, hoy sin cablear) **+ crea el `ContractorEngagement`** (TASK-790), y lo expone por un entry point de operador (offboarding lane `relationship_transition` + comando HR en `/hr/contractors`). Caso fundacional: **Valentina Hoyos** (renunció 30/04, contractor honorarios desde 01/06).

## Why This Task Exists

Auditoría de conectividad 2026-05-30 (arch-architect + payroll-auditor + greenhouse-ux) detectó **4 desconexiones** entre el dominio contractor (790-796) y el resto:

1. **Offboarding NO cierra la relación legal** — un caso `executed` deja el `person_legal_entity_relationship` activo (verificado: Valentina offboarding `EO-OFF-2026-45EC8688` executed pero relación `employee` activa). Por diseño la relación y el offboarding están desacoplados; nadie llama `endPersonLegalEntityRelationship` desde offboarding.
2. **Offboarding NO conecta con el dominio contractor** — cero código que cree engagement/relación contractor desde el offboarding.
3. **`transitionEmployeeToContractor` (TASK-789) es una primitiva huérfana** — 0 callers en `src` (solo barrel + test). Es la primitiva canónica correcta (cierra employee + abre contractor atómico, audit + outbox, keyed sobre el offboarding case), pero nunca se cableó a API/UI.
4. **`createContractorEngagement` (TASK-790) solo tiene 1 entry**: `POST /api/hr/contractors` (sin superficie de creación conectada al ciclo de salida).

Resultado: el dominio 790-796 asume que un engagement EXISTE, pero no hay camino robusto y escalable desde "empleado que sale" → "contractor honorarios con engagement activo". La UI de TASK-796 (`/my/contractor`) muestra "sin engagement" porque el engagement nunca se crea.

`reconcileMemberContractDrift` (TASK-891, `/admin/identity/drift-reconciliation`) NO es la vía: es para el caso **inverso** (member ya = contractor, relación sigue employee) y no crea engagement ni reclasifica member.

## Goal

- Comando de dominio server-only `transitionEmployeeToContractorEngagement` que compone, en UNA transacción: (1) `transitionEmployeeToContractor` (TASK-789) + (2) `createContractorEngagement` (TASK-790), con outbox + audit, idempotente, fail-closed.
- Entry point de operador: completar el lane `relationship_transition` del offboarding **dispara** el comando; y un comando HR en `/hr/contractors` ("Nuevo engagement desde colaborador saliente") para casos como Valentina (offboarding ya executed por otra causal).
- Reliability signal que detecte transiciones huérfanas (offboarding con intención de transición sin relación/engagement contractor abierto).
- Ejecutar el caso canónico Valentina (no forzado) y verificar que enciende `/my/contractor` + `/hr/contractors` (GVC).

## Architecture Alignment

- `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md` (§Non-Negotiable Distinctions: misma persona, relación nueva; Member facet creation; classification risk first-class)
- `docs/architecture/GREENHOUSE_PERSON_LEGAL_ENTITY_RELATIONSHIPS_V1.md`
- `docs/architecture/GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` (boundary payroll vs contractor)
- CLAUDE.md: Contractor Self-Service Hub invariants (TASK-796), International Internal Contract Type Invariants (helpers canónicos + `member.contract_type.changed`), Workforce Exit Payroll Eligibility (TASK-890)

## Dependencies & Impact

### Depende de (todas complete)
- `TASK-789` — `transitionEmployeeToContractor` (la primitiva a cablear) — `src/lib/workforce/relationship-transition/employee-to-contractor.ts`
- `TASK-790` — `createContractorEngagement` — `src/lib/contractor-engagements/store.ts`
- `TASK-796` — superficies `/my/contractor` + `/hr/contractors` (consumen el engagement resultante)

### Impacta
- Dominio contractor (790-796): le da su entry point real.
- Offboarding (lane `relationship_transition`): pasa de clasificación a acción.
- Person 360 / drift signals (TASK-890/891): nuevo flujo de relación.

### Files owned
- `src/lib/contractor-engagements/transition-from-employee.ts` (NUEVO — comando conectado)
- `src/app/api/hr/contractors/transition-from-offboarding/route.ts` (NUEVO — entry HR) `[verificar nombre canónico]`
- `src/lib/workforce/offboarding/**` (wiring del lane `relationship_transition` → comando)
- `src/lib/reliability/queries/contractor-transition-orphan.ts` (NUEVO — signal)
- `src/views/greenhouse/contractors/**` + `src/views/greenhouse/hr-core/offboarding/**` (superficie operador)
- `src/config/entitlements-catalog.ts` + `src/lib/entitlements/runtime.ts` (capability del comando)

## Current Repo State

### Already exists
- `transitionEmployeeToContractor(input: {offboardingCaseId, contractorEffectiveFrom, contractorSubtype, actorUserId, reason, ...})` — atómico, keyed sobre offboarding case executed, cierra employee (effective_to=last_working_day) + abre contractor + appendea evento `offboarding_case.relationship_transition_completed`. **NO toca member. NO crea engagement.**
- `createContractorEngagement(input)` — TASK-790, vía `POST /api/hr/contractors`.
- `member-contract-type-audit.ts` + evento `member.contract_type.changed v1` (helper canónico para mutar la tupla member).
- Offboarding lane resolver con `separation_type='relationship_transition'` (`src/lib/workforce/offboarding/lane.ts`).

### Gap
- No hay comando que componga transición + engagement.
- El lane `relationship_transition` no dispara nada (clasifica, no actúa).
- `transitionEmployeeToContractor` sin entry point (API/UI).
- No hay signal de transición huérfana.

## Scope

### Slice 1 — Comando conectado (dominio)
`transitionEmployeeToContractorEngagement({ offboardingCaseId, contractorEffectiveFrom, contractorSubtype, engagement: {payrollVia, paymentModel, paymentCadence, currency, requiresInvoice, rateType, rateAmount?, taxComplianceOwner?}, actorUserId, reason })` server-only:
1. Invoca `transitionEmployeeToContractor` (cierra employee + abre contractor) en la tx.
2. Con la `openedContractorRelationship.relationshipId`, invoca `createContractorEngagement` anclado a ella (mismo `legalEntityOrganizationId`, `profileId`, `countryCode`, subtype mapeado: relación `honorarios` → engagement `honorarios_cl`; `contractor` → `international_contractor`/`freelance` según país), `classificationRiskFactors.immediateEmployeeContinuity=true` (nace `needs_review`).
3. Outbox + audit. Idempotente (si ya hay relación/engagement activo, no duplica). **NO muta `member.contract_type`** (ver Open Question — riesgo doble-pago payroll).
- Tests puros del mapper subtype + tests de composición (atomicidad/rollback).

### Slice 2 — Entry point operador
- Wire del lane `relationship_transition` del offboarding: al completar la transición desde el work-queue de offboarding, dispara el comando.
- Comando HR en `/hr/contractors` ("Transición desde colaborador saliente"): formulario que toma un offboarding case `executed` + parámetros del engagement → POST → comando. Capability HR + classification-risk gate.
- greenhouse-ux: NO wizard aislado; extender la IA existente de offboarding + workbench contractor.

### Slice 3 — Reliability signal
`hr.contractor.transition_orphan` (kind=drift, steady=0): offboarding case con `separation_type='relationship_transition'` executed SIN relación contractor activa abierta, o relación contractor abierta SIN engagement. Detecta el seam que sufrió Valentina.

### Slice 4 — Caso canónico Valentina + GVC
- Ejecutar el comando sobre Valentina (datos verificados): `offboardingCaseId=offboarding-case-1acd3d2b-bbdd-402a-8aab-a0900affb24a`, `contractorEffectiveFrom='2026-06-01'`, `contractorSubtype='honorarios'`, engagement honorarios_cl/internal/payg_invoice/CLP/requiresInvoice=true. Gated por capability + classification review.
- **GVC de las rutas runtime TASK-796 ahora con data real**: `/my/contractor` (su engagement honorarios) + `/hr/contractors` (cola con su caso). Cierra el gap GVC de TASK-796.

## Out of Scope
- Reclasificación de `member.contract_type` (ver Open Question — payroll double-pay risk; follow-up con payroll-auditor).
- Contractor closure (TASK-797).
- Provider/EOR settlement split (TASK-955).
- Migrar honorarios payroll legacy a contractor (cutover gradual, fuera de aquí).
- Cerrar la desconexión #1 genérica (offboarding executed → relación) para TODOS los casos no-transición — esta task solo cubre el carril `relationship_transition`. La integridad genérica (relación colgante en offboardings `resignation`/`internal_payroll`) es follow-up.

## Detailed Spec

### Subtype mapping relación → engagement
| Relación (`ContractorRelationshipSubtype`) | País | Engagement (`relationshipSubtype`) |
|---|---|---|
| `honorarios` | CL | `honorarios_cl` |
| `contractor` | CL | `freelance` / `independent_professional` |
| `contractor` | ≠CL | `international_contractor` |

### Boundary payroll (payroll-auditor)
- La exclusión de payroll post-salida la da el offboarding case `executed` + `last_working_day` (TASK-890 exit-eligibility), NO `member.contract_type`. Por eso el comando V1 **no muta member** → cero riesgo de re-inclusión en payroll honorarios legacy (doble pago).
- El payout del contractor fluye SOLO por el dominio contractor (engagement → payable → Finance), nunca `payroll_entries`.
- El finiquito (ratificación notarial pendiente) está **desacoplado** del cierre de relación: el comando cierra la relación canónicamente sin requerir ratificación (caso Valentina). El documento de finiquito sigue su ciclo TASK-863 aparte.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule
1 (comando + tests) → 2 (entry point) → 3 (signal) → 4 (Valentina + GVC). NO ejecutar Slice 4 sobre Valentina antes de Slices 1-3 verdes + fixture staging + OK operador.

### Risk matrix
| Riesgo | Sistema | Prob | Mitigación | Signal |
|---|---|---|---|---|
| Doble pago (member reclasificado → payroll honorarios legacy) | payroll | Media | V1 NO muta member; exclusión por offboarding | `payroll.exit_eligibility.*` |
| Transición parcial (relación abierta sin engagement) | contractor | Media | Comando atómico (1 tx, rollback total) | `hr.contractor.transition_orphan` |
| Relación contractor duplicada | identity | Baja | Guard `existingContractor` en TASK-789 + idempotencia | drift TASK-891 |
| Classification risk bypass | legal/compliance | Baja | Engagement nace `needs_review` (immediateEmployeeContinuity) | `hr.contractor_engagement.classification_risk_open` |
| Mutar Valentina sin aprobación | data integrity | Media | Gated: capability + fixture staging + OK operador explícito | — |

### Feature flags / cutover
Comando aditivo; entry point gated por capability nueva. Sin flag global (cada ejecución es operador-initiated + auditada).

### Rollback plan per slice
| Slice | Rollback | Reversible? |
|---|---|---|
| 1 comando | revert PR | Sí |
| 2 entry point | revert PR + capability revoke | Sí |
| 3 signal | revert PR | Sí |
| 4 Valentina | supersede relación contractor (append-only) + cancelar engagement (`cancelled`) | Sí (append-only, no DELETE) |

### Production verification sequence
1. Slices 1-3 a develop, gates verdes.
2. Fixture staging: member sintético con offboarding executed → ejecutar comando → verificar relación cerrada + contractor abierta + engagement `needs_review`.
3. OK operador + fixture verde → ejecutar Valentina.
4. GVC `/my/contractor` + `/hr/contractors` con su data.

### Out-of-band coordination required
- OK operador/HR para mutar Valentina (CLAUDE.md TASK-891 invariant).
- Resolver el classification review de su engagement (needs_review → clear/legal_review) antes de que su payable llegue a Finance.

## Acceptance Criteria
- [ ] `transitionEmployeeToContractorEngagement` cierra employee + abre contractor + crea engagement en una tx, idempotente, con outbox + audit.
- [ ] El comando NO muta `member.contract_type` (verificable: member sin cambios post-comando).
- [ ] Entry point operador (offboarding lane + comando HR) gated por capability + classification gate.
- [ ] Signal `hr.contractor.transition_orphan` steady=0 en estado sano.
- [ ] Valentina: relación employee cerrada (effective_to=2026-04-30), contractor honorarios activa (2026-06-01), engagement honorarios_cl `needs_review`, member sin cambios, excluida de payroll.
- [ ] `/my/contractor` muestra su engagement (no "sin engagement") y `/hr/contractors` la lista — con evidencia GVC.
- [ ] tsc 0 · lint 0 · `pnpm test` verde · `pnpm vitest run src/lib/payroll src/lib/contractor-engagements` verde (non-regression).

## Verification
- `pnpm exec tsc --noEmit` · `pnpm lint` · `pnpm test`
- `pnpm vitest run src/lib/payroll src/lib/contractor-engagements`
- `pnpm fe:capture --route=/my/contractor --env=staging` + `pnpm fe:capture contractor-admin-workbench --env=staging` (post-ejecución Valentina)
- Live verify PG: relación cerrada/abierta + engagement + member sin cambios.

## Open Questions
1. **¿Reclasificar `member.contract_type` indefinido→honorarios?** Payroll-safety: hoy member=indefinido + offboarding executed → excluida de payroll (TASK-890). Reclasificar a `honorarios` podría re-incluirla en payroll honorarios legacy (`calculate-honorarios.ts`) = doble pago. V1 NO la toca. Decidir con payroll-auditor si se necesita reclasificación + cómo evitar doble inclusión (¿deactivar member como sujeto payroll? ¿flag `is_contractor`?). **Bloqueante para cualquier reclasificación de member; NO bloqueante para el comando V1.**
2. **Entry point canónico**: ¿offboarding lane `relationship_transition`, comando HR en `/hr/contractors`, o ambos? (Recomendación: ambos — el lane para salidas planificadas como transición; el comando HR para casos como Valentina que salieron por otra causal).
3. **Desconexión #1 genérica** (offboarding executed no cierra relación en casos no-transición): ¿se aborda aquí o en task separada? (Recomendación: separada — es un cambio de contrato del offboarding con blast radius propio).

## Closing Protocol
- [ ] Lifecycle + folder sincronizados.
- [ ] README + TASK_ID_REGISTRY sincronizados.
- [ ] Handoff + changelog.
- [ ] Arch Delta en `GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1`.
- [ ] CLAUDE.md invariants si emergen reglas reusables.
- [ ] GVC evidence de las rutas runtime TASK-796 (cierra el gap GVC de 796).
