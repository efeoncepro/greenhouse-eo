# TASK-1030 — Workforce Contracting Studio · Offer letter vs employment contract — document-kind differentiation

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
- Domain: `hr|workforce|ai|documents|content`
- Blocked by: `none`
- Branch: `task/TASK-1030-contracting-offer-vs-contract-differentiation`
- Legacy ID: `—`
- GitHub Issue: `—`

## Summary

La **carta oferta** (`offer_letter`) y el **contrato de trabajo** (`employment_contract`) generan hoy **el mismo documento**: ambos drafts se redactan contra el **mismo set de cláusulas** del jurisdiction pack (un solo `requiredClauses` por pack, sin variar por `documentKind`). Resultado verificado (Maggie, 2026-06-05): la "Carta de Oferta" produce un instrumento completo tipo contrato (Confidencialidad, Propiedad intelectual, Exclusividad, Ley aplicable, término, etc.) — cuando una **oferta** debe ser un documento **propuesta**: rol, compensación, fecha de inicio, condiciones clave, y la **invitación a aceptar**, con lenguaje **no vinculante** ("esta oferta no constituye contrato hasta su aceptación y firma"). Esta task **diferencia el documento por tipo**: cláusulas, tono, estructura, lenguaje vinculante/no-vinculante y retention class distintos para oferta vs contrato.

## Why This Task Exists

El programa Workforce Contracting Studio modela `WorkforceContractingCaseKind = 'offer_letter' | 'employment_contract'` como dos productos distintos del dominio (aggregate, estados, validators), **pero la capa de redacción no los diferencia**:

- El registry (`jurisdiction-packs/registry.ts`) declara `documentKinds: ['offer_letter','employment_contract']` y **un único `requiredClauses`** por pack — el mismo para ambos.
- El prompt (`buildContractingDraftingPrompt(packet, pack)`) recibe `documentKind` en el packet pero **no cambia la estructura/tono esperado** del documento.
- `retentionClass` es `employment_contract_*` **incluso para ofertas** (smell: una oferta retenida bajo la clase de contrato).

Consecuencia: la oferta sale sobre-construida (contrato disfrazado de oferta), lo que es **jurídicamente confuso** (una oferta no debe leerse como un contrato firmado) y **operativamente erróneo** (el PDF firmable de una oferta ≠ el del contrato). El usuario lo detectó directo: *"lo que agrega a la carta oferta parece más bien un contrato de trabajo, ese es el pdf [del contrato]"*.

Es un gap de raíz en la dimensión **forma del documento**, ortogonal al gap de **origen de los datos** (TASK-1029). Mezclarlos violaría responsabilidad única.

## Goal

- `offer_letter` genera un documento **propuesta**: identificación de partes, rol/área, compensación ofrecida, fecha de inicio, modalidad, condiciones clave, **invitación a aceptar** + lenguaje **no vinculante** explícito. Conciso.
- `employment_contract` genera el **instrumento legal completo** (todas las cláusulas DT del pack), vinculante.
- La diferenciación es **declarativa por pack × documentKind** (no hardcodeada en el prompt): cada pack declara su set de cláusulas para oferta y para contrato.
- El prompt instruye a Claude con la **estructura + tono** correctos por tipo (oferta = invitación/propuesta; contrato = instrumento vinculante), bilingüe ES/EN, es-CL prevalente.
- `retentionClass` y validators respetan el `documentKind`.
- La conversión `offer_letter` → `employment_contract` (TASK-1019 `convert_to_contract`) sigue coherente: el contrato derivado expande el set de la oferta al set completo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_WORKFORCE_CONTRACTING_STUDIO_V1.md` (§3.2/§14 clause checklist DT; bilingüe; advisory AI; documentKind como producto)
- `CLAUDE.md` → "Workforce Contracting Studio invariants (TASK-1019)" + "International Internal Contract Type Invariants (TASK-894)"
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` (la oferta NO es contrato vigente; no dispara payroll)

Reglas obligatorias:

- **NUNCA** colapsar oferta y contrato en el mismo set de cláusulas. La diferenciación es **declarativa por pack × documentKind**, no un `if` en el prompt.
- **NUNCA** redactar una oferta con lenguaje vinculante de contrato firmado. La oferta declara explícito que **no constituye contrato** hasta aceptación + firma (la e-firma de la oferta es la aceptación, no la relación laboral).
- **NUNCA** romper la validación bilingüe (ES+EN obligatorio, es-CL prevalente) ni la paridad estructural al cambiar los sets de cláusulas.
- **NUNCA** cambiar el `retentionClass` de contratos existentes ni mezclar clases (oferta → `offer_letter_*`, contrato → `employment_contract_*`). Sólo agregar la clase de oferta.
- Advisory-only: la diferenciación cambia QUÉ se le pide a Claude, no le da autoridad de aprobar/firmar.
- Bump de `WORKFORCE_CONTRACTING_PROMPT_VERSION` al cambiar la estructura del prompt (audit de `ai_run`).

## Normative Docs

- `docs/tasks/complete/TASK-1019-workforce-contracting-studio-foundation-ai-drafting.md` (packs, prompt, validators, documentKind)
- `docs/tasks/to-do/TASK-1029-workforce-contracting-fact-intake-resolution-layer.md` (origen de los datos — ortogonal; coordinar el shape de facts por documentKind)
- `docs/tasks/to-do/TASK-1023-workforce-contracting-pdf-signable-render-consumer.md` (el PDF firmable consume el structuredContent diferenciado)

## Dependencies & Impact

### Depends on

- `src/lib/workforce/contracting/jurisdiction-packs/registry.ts` + `types.ts` (estructura del pack — se extiende a clauses por documentKind)
- `src/lib/workforce/contracting/jurisdiction-packs/validate.ts` (valida contra el set correcto)
- `src/lib/workforce/contracting/ai/input-packet.ts` (`buildContractingDraftingPrompt` — instrucción por documentKind)
- `src/lib/workforce/contracting/ai/draft-adapter.ts` (pasa documentKind + pack al prompt)

### Blocks / Impacts

- **TASK-1023 (PDF)**: el render firmable de una oferta vs contrato debe diferir (título, lenguaje, cláusulas). Esta task define el contenido; TASK-1023 lo renderiza.
- **TASK-1029 (facts)**: coordinar — una oferta requiere menos facts obligatorios que un contrato (p.ej. el contrato exige todos los Art. 10; la oferta exige rol+comp+fecha). El `requiredFacts` puede variar por documentKind (cross-link).
- Conversión `convert_to_contract` (TASK-1019): el contrato derivado hereda los facts de la oferta + expande cláusulas.

### Files owned

- `src/lib/workforce/contracting/jurisdiction-packs/types.ts` (MODIF — `requiredClauses` por documentKind)
- `src/lib/workforce/contracting/jurisdiction-packs/registry.ts` (MODIF — sets oferta vs contrato por pack)
- `src/lib/workforce/contracting/jurisdiction-packs/validate.ts` (MODIF — validar por documentKind)
- `src/lib/workforce/contracting/ai/input-packet.ts` (MODIF — prompt diferenciado por documentKind)
- `src/lib/workforce/contracting/ai/config.ts` (MODIF — `WORKFORCE_CONTRACTING_PROMPT_VERSION` bump)
- `src/types/assets.ts` / retention dictionaries (MODIF — retention class `offer_letter_*`)
- `src/lib/copy/workforce-contracting.ts` (MODIF — copy si cambia algún label visible)
- tests: `validate.test.ts`, `input-packet.test.ts`, `draft-adapter.test.ts`, `eval-fixtures.ts`

## Current Repo State

### Already exists

- `documentKind` modelado y propagado al packet/prompt (`draft-adapter.ts`, `input-packet.ts`).
- Packs con `documentKinds: ['offer_letter','employment_contract']` + un `requiredClauses` único por pack (`registry.ts`).
- Validators de pack + paridad bilingüe + structured content schema.
- `convert_to_contract` como transición de estado (TASK-1019).

### Gap

- `requiredClauses` **no varía** por documentKind → oferta = contrato.
- El prompt **no instruye** estructura/tono distinto por documentKind.
- `retentionClass` de oferta usa la clase de contrato.
- No hay lenguaje **no vinculante** específico de oferta.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Pack model: clauses por documentKind (declarativo)

- `types.ts`: cambiar `requiredClauses: string[]` por una forma por documentKind, p.ej. `clausesByDocumentKind: Record<WorkforceContractingCaseKind, { required: string[]; optional?: string[] }>` (back-compat: helper que resuelve el set por kind).
- `registry.ts`: declarar, por cada pack, el set **oferta** (proposal: `place_and_date`, `parties_identification`, `services_nature_and_location` condensada, `remuneration`, `contract_term` resumido, `additional_pacts_and_benefits` opcional, + **cláusula de no-vinculación/aceptación**) vs **contrato** (set DT completo actual).
- Mantener invariantes: international_internal sigue exigiendo `legalReviewReference` y prohibiendo `chile_statutory_deductions` en ambos kinds.
- Tests del registry: oferta ⊊ contrato (la oferta es un subconjunto + cláusula de aceptación).

### Slice 2 — Validators + retention por documentKind

- `validate.ts`: validar el draft contra el set del `documentKind` del caso (no el set único).
- Retention: agregar `offer_letter_cl`, `offer_letter_cl_foreigner`, `offer_letter_international_internal` (o un esquema `offer_letter_*` paralelo a `employment_contract_*`); el caso usa la clase según su kind. No tocar las clases de contrato existentes.

### Slice 3 — Prompt diferenciado por documentKind + version bump

- `buildContractingDraftingPrompt`: instrucción explícita por `documentKind`:
  - `offer_letter`: "redacta una **carta oferta** (propuesta/invitación), concisa, con lenguaje **no vinculante**; declara que no constituye contrato hasta aceptación+firma; estructura: encabezado, partes, rol, compensación ofrecida, fecha de inicio, modalidad, condiciones clave, invitación a aceptar". Tono cordial-formal.
  - `employment_contract`: "redacta el **contrato de trabajo** completo, vinculante, con todas las cláusulas DT del pack". Tono legal.
- Bump `WORKFORCE_CONTRACTING_PROMPT_VERSION` (audit `ai_run`).
- Actualizar `eval-fixtures.ts` con un caso de cada kind; aserciones de que la oferta NO incluye las cláusulas exclusivas de contrato y SÍ la de no-vinculación.

### Slice 4 — Coordinación facts (cross-link TASK-1029) + docs

- Definir `requiredFacts` por documentKind (oferta: rol+comp+fecha; contrato: + persona completa Art. 10) — coordinar con TASK-1029 (si ya tomada) o dejar el contrato como hoy y la oferta más laxa.
- Actualizar `GREENHOUSE_WORKFORCE_CONTRACTING_STUDIO_V1.md` con la diferenciación oferta/contrato.

## Out of Scope

- PDF render (TASK-1023) — esta task define contenido, no render.
- Captura/resolución de facts (TASK-1029) — ortogonal; sólo se coordina `requiredFacts` por kind.
- Nuevos packs (honorarios/contractor).
- Firma/conversión legal — `convert_to_contract` ya existe; sólo se asegura coherencia de cláusulas.

## Detailed Spec

### Oferta vs Contrato — qué cambia

| Dimensión | `offer_letter` (propuesta) | `employment_contract` (instrumento) |
|---|---|---|
| Propósito | Invitar a aceptar términos | Formalizar la relación laboral |
| Cláusulas | Subset condensado + **cláusula de aceptación/no-vinculación** | Set DT completo del pack |
| Lenguaje | No vinculante ("no constituye contrato hasta aceptación+firma") | Vinculante |
| Confidencialidad/IP/Exclusividad/Ley aplicable boilerplate | Omitir o condensar a "se regirán por el contrato" | Completas |
| Tono | Cordial-formal (invitación) | Legal |
| Retention class | `offer_letter_*` | `employment_contract_*` |
| Firma (EPIC-001) | e-firma = **aceptación de la oferta** | e-firma = formalización del contrato |
| requiredFacts | rol + compensación + fecha (+ persona mínima) | + persona completa Art. 10 |

### Cláusula nueva de oferta (ejemplo es-CL / en-US)

- `offer_acceptance_non_binding`: "La presente Carta de Oferta constituye una propuesta y **no genera relación laboral ni obligación** hasta su aceptación expresa y firma por el/la candidato/a. La aceptación se efectúa mediante firma electrónica…" / "This Offer Letter is a proposal and **does not create an employment relationship or obligation** until expressly accepted and signed…".

### Invariantes preservados

- Bilingüe ES+EN obligatorio + paridad estructural (mismos `sectionCode` ES/EN) en **ambos** kinds.
- international_internal: `legalReviewReference` + sin deducciones Chile, en oferta y contrato.
- Advisory AI; aprobación humana; sin autoridad de firma para Claude.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (model) → Slice 2 (validators/retention) → Slice 3 (prompt + version bump) → Slice 4 (coordinación facts + docs).
- Slice 3 depende de Slice 1 (el prompt instruye sobre el set declarado).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal |
|---|---|---|---|---|
| Romper paridad bilingüe al cambiar sets | workforce/ai | medium | Tests de paridad + validators por kind | `bilingual_parity_failed` |
| Drift retention (oferta bajo clase de contrato) | documents | low | Clases `offer_letter_*` separadas + caso usa la suya | revisión assets |
| Oferta con lenguaje vinculante (riesgo legal) | workforce/legal | medium | Cláusula de no-vinculación obligatoria + eval-fixture que lo asserta | review humano |
| Drafts viejos con prompt anterior | ai | low | `promptVersion` versionado; drafts son inmutables por versión | audit `ai_run` |

### Feature flags / cutover

- Detrás de `WORKFORCE_CONTRACTING_AI_ENABLED` (OFF prod). Cambio aditivo en la estructura de packs (helper back-compat). Sin flag adicional.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (helper back-compat preserva el set único) | <10 min | sí |
| Slice 2 | revert; retention nueva es aditiva | <10 min | sí |
| Slice 3 | revert prompt + version bump previo | <5 min | sí |

### Production verification sequence

1. Staging IA ON: generar `offer_letter` → verificar documento propuesta (conciso, cláusula de no-vinculación, sin boilerplate de contrato).
2. Generar `employment_contract` mismo pack → verificar instrumento completo.
3. Validar paridad ES/EN en ambos.
4. Verificar retention class correcta por kind.
5. `convert_to_contract` de la oferta → contrato expande cláusulas coherente.

### Out-of-band coordination required

- N/A — repo-only. (Sign-off legal del contenido de oferta vs contrato recomendado pero no bloqueante para V0 advisory; el pack ya marca "legal counsel sign-off pending V0".)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El pack declara cláusulas por `documentKind`; la oferta es un subset condensado + cláusula de aceptación/no-vinculación; el contrato es el set DT completo.
- [ ] `offer_letter` genera un documento propuesta (conciso, no vinculante) — verificado con un caso real; ya no se lee como contrato completo.
- [ ] `employment_contract` genera el instrumento completo.
- [ ] Validators validan contra el set del documentKind; paridad bilingüe verde en ambos.
- [ ] Retention class `offer_letter_*` para ofertas; clases de contrato intactas.
- [ ] `WORKFORCE_CONTRACTING_PROMPT_VERSION` bumpeado; eval-fixtures cubren oferta vs contrato.
- [ ] international_internal preserva `legalReviewReference` + sin deducciones Chile en ambos kinds.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test` (focal `src/lib/workforce/contracting`)
- Manual (staging IA ON): generar oferta y contrato del mismo pack, comparar.

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] chequeo de impacto cruzado: TASK-1023 (PDF por kind) + TASK-1029 (requiredFacts por kind)
- [ ] `GREENHOUSE_WORKFORCE_CONTRACTING_STUDIO_V1.md` actualizado con la diferenciación

## Follow-ups

- TASK-1023: render PDF diferenciado oferta vs contrato (título, lenguaje, layout).
- Sign-off legal del contenido de la oferta (no vinculación) cuando el programa salga de V0.

## Open Questions

1. ¿La oferta omite del todo Confidencialidad/IP/Exclusividad, o las condensa en una cláusula "se regirán por el contrato definitivo"? Recomendación: condensar (la oferta menciona que existirán, sin el texto completo).
2. ¿`requiredFacts` por documentKind se define aquí o en TASK-1029? Recomendación: el **shape** (qué facts por kind) aquí; la **captura/resolución** en TASK-1029. Coordinar.
3. ¿La firma de la oferta (aceptación) cambia el estado a `accepted` y habilita `convert_to_contract` automáticamente, o queda manual? (Coordinar con TASK-1024 firma.) Recomendación: manual en V1.
