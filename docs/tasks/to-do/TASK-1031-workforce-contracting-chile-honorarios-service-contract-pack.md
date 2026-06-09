# TASK-1031 — Workforce Contracting Studio · Chile honorarios service-contract jurisdiction pack (prestación de servicios a honorarios)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `—` (programa Workforce Contracting Studio, raíz TASK-1019)
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `hr|workforce|ai|payroll|documents|compliance`
- Blocked by: `none`
- Branch: `task/TASK-1031-contracting-chile-honorarios-service-pack`
- Legacy ID: `—`
- GitHub Issue: `—`

## Summary

El registry de jurisdiction packs del Workforce Contracting Studio cubre hoy solo **trabajador dependiente** (CL dependiente, CL extranjero) y **international_internal**. Falta el **contrato de prestación de servicios a honorarios profesionales de Chile** (régimen `honorarios`: boleta de honorarios + retención SII Art. 74 N°2 LIR, **NO** nómina dependiente). Esta task agrega el pack `CL_HONORARIOS_PROFESSIONAL_SERVICES_V1`: un **contrato civil de prestación de servicios** (no laboral), con cláusulas correctas (objeto, honorarios + retención SII, **independencia / no subordinación**, emisión de boleta), facts requeridos (RUT, honorarios brutos, moneda, período), retention class propia, y **prohibición dura de cláusulas de subordinación** (que lo reclasificarían como vínculo laboral encubierto — el riesgo legal/tributario central de honorarios). Sin tocar nómina: el documento no aplica AFP/salud/cesantía/IUSC; la retención SII se declara en el contrato pero el cálculo/pago vive en el dominio de Contractor Payables (TASK-790/794).

## Why This Task Exists

`honorarios` es un `ContractType` canónico (`src/types/hr-contracts.ts`: `{ payRegime: 'chile', payrollVia: 'internal' }`) y Greenhouse ya tiene toda la cadena de **pago** de honorarios (TASK-790 Contractor Engagements + TASK-794 Chile Honorarios Compliance: retención SII, riesgo de clasificación, payables → Finance). **Pero falta el instrumento legal** que formaliza esa relación: el **contrato de prestación de servicios a honorarios**. Hoy el estudio no puede redactarlo porque no existe el pack ni el `documentKind` apropiado.

Modelarlo bien importa por dos razones de raíz:

1. **No es un contrato de trabajo.** Es un contrato **civil** (prestación de servicios, Código Civil / honorarios), entre la empresa y un prestador independiente que emite boleta de honorarios. Forzarlo bajo `documentKind='employment_contract'` con el pack dependiente es **semánticamente erróneo y jurídicamente peligroso**: implicaría una relación laboral donde no la hay.
2. **Riesgo de clasificación (el invariante payroll central).** Un contrato a honorarios con marcadores de **subordinación/dependencia** (horario fijo, supervisión directa, exclusividad, control disciplinario) puede ser reclasificado por la Dirección del Trabajo / SII como relación laboral encubierta → contingencia de cotizaciones + multas. El pack debe **prohibir** esas cláusulas por construcción y exigir la cláusula de **independencia / no subordinación**.

## Goal

- Nuevo pack `CL_HONORARIOS_PROFESSIONAL_SERVICES_V1` en el registry, con tupla `{ contractType: 'honorarios', payRegime: 'chile', payrollVia: 'internal' }`.
- Cláusulas de **contrato civil de servicios** (objeto, honorarios + retención SII, independencia/no subordinación, plazo/proyecto, confidencialidad, PI, término, ley aplicable, emisión de boleta).
- **Cláusulas prohibidas** de subordinación + `chile_statutory_deductions` (enforced en validator) → previene el contrato laboral encubierto.
- Facts requeridos del régimen honorarios (RUT, honorarios brutos, moneda CLP, período, método) + disclosure de retención SII (tasa del año, SSOT `getSiiRetentionRate`).
- Retention class propia (`honorarios_service_contract_cl`), `requiresLegalReviewReference=TRUE` (alto riesgo de clasificación).
- Cero nómina: el documento no aplica deducciones dependientes; la retención SII y el pago viven en TASK-790/794. `pnpm vitest run src/lib/payroll` verde.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_WORKFORCE_CONTRACTING_STUDIO_V1.md` (registry de packs extensible; bilingüe; advisory AI)
- `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md` (lado pago de honorarios — TASK-790/794)
- `CLAUDE.md` → "Chile Honorarios Compliance invariants (TASK-794)" + "Contractor Engagements invariants (TASK-790)" + "Workforce Contracting Studio invariants (TASK-1019)"
- Skill `greenhouse-payroll-auditor` → `references/chile-payroll-law.md` (honorarios: SII retention, no deducciones dependientes, riesgo de clasificación)

Reglas obligatorias (load-bearing):

- **NUNCA** aplicar AFP/Fonasa/Isapre/cesantía/SIS/mutual/IUSC/gratificación legal a honorarios — ni en el contenido del documento ni en cálculo. Solo **retención SII** (Art. 74 N°2 LIR, tasa del año vía `getSiiRetentionRate` — SSOT, **NUNCA** hardcodear).
- **NUNCA** redactar el honorarios como contrato laboral. Es **civil** (prestación de servicios). Documento, tono y cláusulas reflejan independencia.
- **NUNCA** incluir cláusulas de subordinación (horario fijo impuesto, supervisión disciplinaria, exclusividad, dependencia económica como obligación) — el validator las marca `prohibited`. La cláusula de **independencia/no subordinación** es **obligatoria**.
- **NUNCA** disparar nómina ni `compensation_versions` desde este documento. El pago de honorarios fluye por Contractor Payables (TASK-790/794); el documento es el instrumento legal, no el pago.
- **NUNCA** sembrar el pack sin que el `documentKind` lo soporte correctamente (ver Open Question del enum) — un honorarios bajo `employment_contract` es el bug que esta task evita.
- Advisory-only AI; aprobación humana; legal review obligatorio dado el riesgo de clasificación.

## Normative Docs

- `docs/tasks/complete/TASK-794-chile-honorarios-compliance-sii-retention.md` (SII retention, classification gates — el lado pago)
- `docs/tasks/complete/TASK-790-contractor-engagements-runtime-classification-risk.md` (engagement subtype `honorarios_cl` + classification risk)
- `docs/tasks/to-do/TASK-1030-workforce-contracting-offer-vs-contract-document-differentiation.md` (forma del documento por kind — coordinar)
- `docs/tasks/to-do/TASK-1029-workforce-contracting-fact-intake-resolution-layer.md` (facts por pack)

## Dependencies & Impact

### Depends on

- `src/lib/workforce/contracting/jurisdiction-packs/{registry.ts,types.ts,validate.ts}` (extensión del registry)
- `src/types/hr-contracts.ts` → `ContractType='honorarios'` + `SII_RETENTION_RATES` + `getSiiRetentionRate` (existe)
- `src/lib/workforce/contracting/ai/input-packet.ts` (allowlist de facts + prompt)
- retention dictionaries (`src/types/assets.ts` / contexts) — nueva clase `honorarios_service_contract_cl`

### Blocks / Impacts

- **Coordina con TASK-1030** (document differentiation): el honorarios introduce un tercer "documento" — decidir si es un `documentKind` nuevo (`service_contract`) o se modela aparte. Ver Open Questions.
- **Coordina con TASK-1029** (facts): los `requiredFacts` de honorarios (RUT, honorarios, retención SII) entran al mismo sistema de captura/resolución.
- **Cross-link TASK-790/794**: el documento honorarios es el instrumento legal de un `contractor_engagement` subtype `honorarios_cl`; el pago/retención ya existen ahí. Esta task NO duplica el cálculo SII — lo referencia.
- Habilita que el estudio drafte el contrato a honorarios (hoy imposible).

### Files owned

- `src/lib/workforce/contracting/jurisdiction-packs/registry.ts` (MODIF — nuevo pack)
- `src/lib/workforce/contracting/jurisdiction-packs/types.ts` (MODIF — si requiere nuevos clause codes / prohibited)
- `src/lib/workforce/contracting/jurisdiction-packs/validate.ts` (MODIF — enforce prohibited subordination + SII disclosure)
- `src/lib/workforce/contracting/ai/input-packet.ts` (MODIF — facts/clauses honorarios + instrucción de prompt civil)
- `src/lib/workforce/contracting/ai/config.ts` (MODIF — prompt version bump)
- `src/types/assets.ts` / retention dictionaries (MODIF — `honorarios_service_contract_cl`)
- migración/seed si el `documentKind` se amplía (ver Open Questions) — CHECK + state machine
- tests: `validate.test.ts`, `registry` tests, `input-packet.test.ts`, `eval-fixtures.ts`
- `src/lib/copy/workforce-contracting.ts` (MODIF — labels honorarios)

## Current Repo State

### Already exists

- `honorarios` ContractType + tupla canónica + `SII_RETENTION_RATES` (15.25% 2026) + `getSiiRetentionRate` (`hr-contracts.ts`).
- Lado **pago** completo de honorarios: TASK-790 engagements (subtype `honorarios_cl`), TASK-794 SII retention + classification gates + payables.
- Registry extensible con 3 packs (dependiente, extranjero, international_internal).
- Validators de pack + prohibited clauses + bilingüe + structured content schema.

### Gap

- **No existe pack honorarios** en el registry → el estudio no puede redactar el contrato de prestación de servicios.
- `documentKind` no contempla un contrato **civil** de servicios (solo `offer_letter`/`employment_contract`).
- No hay retention class de honorarios para el documento.
- No hay enforcement de cláusulas de subordinación prohibidas a nivel del documento honorarios.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Resolver el modelado de documentKind (decisión + foundation)

- Decidir y aplicar el modelado del documento honorarios (ver Open Question #1): preferible **nuevo `documentKind='service_contract'`** con su estado inicial + CHECK + state machine mínima, **o** modelarlo bajo el kind existente con discriminación por pack. Foundation + migración si aplica.
- Actualizar `WorkforceContractingCaseKind` + `INITIAL_STATUS_BY_KIND` + CHECK DB + state-machine si se agrega kind.

### Slice 2 — Pack `CL_HONORARIOS_PROFESSIONAL_SERVICES_V1` + validators

- Registry: nuevo pack con tupla honorarios, cláusulas civiles, prohibited (subordinación + `chile_statutory_deductions`), `requiresLegalReviewReference=TRUE`, retention `honorarios_service_contract_cl`, `externalRegistrationRequired=FALSE`.
- Validator: enforce cláusula obligatoria de independencia + rechaza prohibited; SII disclosure presente.
- Tests del pack + validator (incluye un caso que intenta colar subordinación → rechazado).

### Slice 3 — AI prompt civil + facts + version bump

- Prompt: instrucción de **contrato civil de prestación de servicios a honorarios** (tono civil/comercial, no laboral; declara independencia; menciona retención SII del año sin calcularla). Bilingüe ES/EN (ver Open Question #2 sobre EN).
- Facts honorarios (RUT, honorarios brutos, moneda CLP, período, método, objeto del servicio) — coordinar con TASK-1029.
- Bump `WORKFORCE_CONTRACTING_PROMPT_VERSION`; eval-fixture honorarios que asserta independencia + ausencia de deducciones dependientes.

### Slice 4 — Cross-link payables + docs

- Documentar que el contrato honorarios es el instrumento legal de un `contractor_engagement` subtype `honorarios_cl` (TASK-790); el pago/retención viven ahí (no se recalculan aquí).
- Actualizar `GREENHOUSE_WORKFORCE_CONTRACTING_STUDIO_V1.md` con el pack honorarios + el invariante de no subordinación.

## Out of Scope

- **NO** cálculo/pago de la retención SII (vive en TASK-794) — el documento solo la **declara**.
- **NO** packs de otros regímenes (contractor internacional Deel/EOR, otros países).
- **NO** la transición honorarios → dependiente (reclasificación) — eso es TASK-957/dominio payroll.
- **NO** emisión real de boleta de honorarios (es acto del prestador en el SII).

## Detailed Spec

### Pack propuesto (shape)

```
CL_HONORARIOS_PROFESSIONAL_SERVICES_V1:
  label: 'Chile — Prestador de servicios a honorarios (boleta de honorarios)'
  documentKinds: ['service_contract']            # (o el kind decidido en Slice 1)
  supportedTuples: [{ contractType: 'honorarios', payRegime: 'chile', payrollVia: 'internal' }]
  authoritativeLanguage: 'es-CL'
  requiredLanguages: ['es-CL', 'en-US']          # (Open Question #2: ¿EN obligatorio para honorarios doméstico?)
  requiredPersonFacts: ['full_name', 'national_id', 'nationality', 'address']
  requiredCompensationFacts: ['gross_amount', 'currency', 'pay_period', 'pay_method']
  requiredClauses:
    - place_and_date
    - parties_identification
    - services_object_and_scope            # objeto del servicio (no "naturaleza laboral")
    - honorarios_and_sii_retention         # honorarios brutos + retención SII Art. 74 N°2 LIR (tasa del año)
    - independence_no_subordination        # OBLIGATORIA — declara independencia, sin vínculo laboral
    - boleta_de_honorarios_issuance        # el prestador emite boleta
    - contract_term_or_project             # plazo / por proyecto
    - confidentiality
    - intellectual_property
    - termination
    - governing_law_and_jurisdiction
  prohibitedClauses:
    - chile_statutory_deductions           # NO AFP/salud/cesantía/etc.
    - fixed_schedule_subordination         # NO horario impuesto/control disciplinario
    - exclusivity_dependency               # NO exclusividad/dependencia económica obligatoria
  requiresLegalReviewReference: true       # alto riesgo de clasificación
  externalRegistrationRequired: false      # honorarios no se registra en DT como contrato laboral
  retentionClass: 'honorarios_service_contract_cl'
  signableFormat: 'pdf'
  signatureProvider: 'zapsign'
  missingRequirementSeverity: 'blocking'
```

### Invariantes payroll/legal (de la skill payroll)

- Honorarios = SII retention del año de emisión (15.25% 2026, `getSiiRetentionRate` — SSOT). El documento **declara** la retención; **no** la calcula ni la paga (TASK-794).
- Cero deducciones dependientes (AFP/Fonasa/Isapre/cesantía/SIS/mutual/IUSC/gratificación).
- Riesgo de clasificación: la cláusula de independencia + las prohibidas son la defensa documental. Si el caso real tiene subordinación, escalar a revisión legal (no draftear honorarios sobre una relación que es laboral de hecho).
- `requiresLegalReviewReference=TRUE` → fail-closed (mismo patrón que international_internal / TASK-894): sin referencia legal (>=10 chars) no se aprueba.

### Relación con el lado pago (TASK-790/794)

- El contrato honorarios (este pack) = **instrumento legal**. El `contractor_engagement` subtype `honorarios_cl` (TASK-790) = **relación operativa**; los `contractor_payables` (TASK-793/794) = **pago + retención SII**. Esta task **no duplica** ninguno: documenta el cross-link y reusa `getSiiRetentionRate`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (documentKind) → Slice 2 (pack + validators) → Slice 3 (prompt + facts + version) → Slice 4 (cross-link + docs).
- Si Slice 1 agrega un `documentKind` nuevo, su migración (CHECK + state machine) **debe** shippear antes del pack (Slice 2), sino el caso no puede existir con ese kind.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal |
|---|---|---|---|---|
| Contrato honorarios con subordinación → laboral encubierto | workforce/legal/payroll | medium | Prohibited clauses enforced + cláusula independencia obligatoria + legal review fail-closed | review humano + validator |
| Aplicar deducciones dependientes a honorarios | payroll | low | Pack sin deducciones + `chile_statutory_deductions` prohibida + `pnpm vitest run src/lib/payroll` | payroll test |
| Hardcodear tasa SII | payroll/finance | low | `getSiiRetentionRate` SSOT (NUNCA literal) | revisión |
| Modelar honorarios bajo `employment_contract` (bug semántico) | workforce | medium | Slice 1 decide documentKind correcto antes del pack | review de diseño |
| Disparar pago/nómina desde el documento | payroll/finance | low | Documento ≠ pago; pago vive en TASK-790/794 | sin write de comp/payables |

### Feature flags / cutover

- Detrás de `WORKFORCE_CONTRACTING_AI_ENABLED` (OFF prod). El pack es aditivo al registry. Si Slice 1 agrega `documentKind`, la migración es aditiva (CHECK extendido). Sin flag adicional salvo que se quiera graduar el kind nuevo.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | `migrate:down` (CHECK aditivo) + revert enum | <10 min | sí |
| Slice 2 | revert PR (pack aditivo) | <5 min | sí |
| Slice 3 | revert prompt + version previo | <5 min | sí |

### Production verification sequence

1. Staging IA ON: crear caso honorarios → generar draft → verificar contrato **civil** (independencia explícita, retención SII declarada, sin deducciones dependientes, sin subordinación).
2. Validator rechaza un draft con cláusula de subordinación.
3. `requiresLegalReviewReference` bloquea aprobación sin referencia.
4. `pnpm vitest run src/lib/payroll src/lib/workforce/contracting` verde.
5. Verificar cross-link: el caso honorarios referencia el engagement `honorarios_cl` (si existe).

### Out-of-band coordination required

- Sign-off legal del contenido del contrato a honorarios (independencia, retención SII, boleta) — recomendado dado el riesgo de clasificación. V0 advisory marca "legal counsel sign-off pending".

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Pack `CL_HONORARIOS_PROFESSIONAL_SERVICES_V1` en el registry con tupla honorarios + cláusulas civiles + prohibited (subordinación + deducciones) + retention propia + legal review obligatorio.
- [ ] El estudio drafta un **contrato civil de prestación de servicios a honorarios** (no laboral): independencia explícita, retención SII declarada (tasa del año vía SSOT), emisión de boleta.
- [ ] Validator rechaza cláusulas de subordinación + exige la de independencia.
- [ ] Cero deducciones dependientes; `pnpm vitest run src/lib/payroll` verde; sin write de `compensation_versions`/payables.
- [ ] `documentKind` modelado correctamente (no honorarios bajo `employment_contract`).
- [ ] Prompt honorarios + version bump + eval-fixture; cross-link documentado con TASK-790/794.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test` (focal `src/lib/workforce/contracting` + `src/lib/payroll`)
- Manual (staging IA ON): generar honorarios, verificar contenido civil + rechazo de subordinación.

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] chequeo de impacto cruzado: TASK-1029 (facts honorarios), TASK-1030 (documentKind/forma), TASK-790/794 (cross-link pago)
- [ ] `GREENHOUSE_WORKFORCE_CONTRACTING_STUDIO_V1.md` actualizado con el pack + invariante no-subordinación

## Follow-ups

- Packs de otros regímenes (contractor internacional Deel/EOR) si emerge necesidad.
- Auto-vínculo documento honorarios ↔ `contractor_engagement` `honorarios_cl` (crear/enlazar el engagement al aprobar el contrato).

## Open Questions

1. **documentKind**: ¿agregar `service_contract` (o `honorarios_service_contract`) al enum `WorkforceContractingCaseKind` (con CHECK + state machine + estados iniciales), o modelar honorarios bajo un kind existente discriminando por pack? Recomendación: **nuevo `documentKind`** — un honorarios bajo `employment_contract` es semánticamente erróneo y refuerza el riesgo de clasificación. Decidir en Plan Mode (impacta state machine + migración).
2. **Bilingüe**: el estudio exige ES+EN para ofertas/contratos. Un honorarios **doméstico** chileno puede no necesitar EN. ¿`requiredLanguages: ['es-CL']` solo para honorarios, o mantener bilingüe? Recomendación: es-CL obligatorio; EN opcional para honorarios doméstico (revisar el invariante bilingüe del studio para este kind).
3. **¿La carta oferta aplica a honorarios?** ¿Se puede "ofertar" una prestación de servicios a honorarios (offer → service_contract), o el honorarios entra directo como contrato? Recomendación: V1 directo como contrato; oferta de honorarios como follow-up.
4. **Auto-engagement**: ¿al aprobar el contrato honorarios se crea/enlaza automáticamente el `contractor_engagement` `honorarios_cl` (TASK-790), o queda manual? Recomendación: manual V1, auto como follow-up.
