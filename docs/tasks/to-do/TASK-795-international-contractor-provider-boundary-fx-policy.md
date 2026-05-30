# TASK-795 — International Contractor + Provider Boundary + FX Policy

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-013`
- Status real: `Diseno — Open Questions resueltas pre-ejecución (2026-05-30)`
- Rank: `TBD`
- Domain: `cross-domain`
- Blocked by: `TASK-790, TASK-793`
- Branch: `task/TASK-795-international-contractor-provider-fx`
- Legacy ID: `none`
- GitHub Issue: `none`

## Decisiones Pre-Ejecución (Open Questions resueltas — 2026-05-30)

> Resueltas con skills `arch-architect` (4-pilar + reversibilidad) + `greenhouse-payroll-auditor`, **grounded contra el código real** (no contra el "Gap" del spec, que está sobre-dimensionado). Igual que en TASK-794, gran parte de la fundación ya existe: TASK-790 modeló las dimensiones internacionales (`payrollVia`, `taxComplianceOwner`, `providerContractId/WorkerId`, `fxPolicyCode`, `currency`, `paymentCurrency`, `countryCode`, `taxResidencyCountryCode`) y TASK-793 ya gatea `fxNeeded/fxSupported`, `currency_unsupported` (CLP/USD) y `provider_split_missing`. **Verificado en código**: `SUPPORTED_OBLIGATION_CURRENCIES = {CLP, USD}`, `computeContractorWithholding` retorna 0 para lanes no-honorarios, NO existe gate de `tax_compliance_owner`, NO existe split provider fee/FX, NO hay registro provider-org parallel.

### D-795-1 — Moneda de liquidación: NO se expande Finance a multi-moneda (anti-bandaid honesto)

**Decisión.** El payable distingue dos campos ya existentes: `currency` (moneda **contractual/nativa** del contractor — libre, p.ej. EUR/MXN/COP) y `payment_currency` (moneda de **liquidación** — la que mueve el rail de Finance). En V1 la moneda de liquidación ∈ **{CLP, USD}** (la capacidad real de `payment_obligations` hoy). Casos:

- **Provider-owned (Deel/Remote/Oyster)** → Greenhouse liquida al provider en **USD**; el provider hace el payout local en la moneda nativa del worker. La moneda nativa queda informativa en `currency`.
- **Direct international** con moneda de liquidación CLP/USD → flujo normal con FX gate.
- **Direct international** con moneda de liquidación exótica (no CLP/USD) → `currency_unsupported` (gate existente) + ruteo a `manual_review_required`; el operador liquida off-rail y registra. **NUNCA** liquidación silenciosa en la moneda equivocada.

**Por qué (no es bandaid).** El rail de Greenhouse genuinamente es CLP/USD hoy; *fingir* multi-moneda sería el bandaid. Esto es honesto (declara la capacidad real), fail-closed (lo exótico bloquea, no se paga mal) y forward-compatible (cuando Finance shipee multi-moneda real, se amplía el set `{CLP, USD}` en un solo lugar). **Esto DES-bloquea la task**: la respuesta a "¿expandir Finance?" es NO en EPIC-013 — la expansión multi-moneda de `payment_obligations`/`account_balances`/FX P&L es una **task de Finance separada**, fuera de este epic.

**Confirmación requerida con Finanzas (no bloqueante para diseñar, sí antes de cerrar):** validar que liquidar a Deel en USD es operacionalmente correcto para los contratos vigentes y que no hay un contractor directo en moneda exótica que requiera el rail YA. Si lo hubiera, ese caso entra por `manual_review` en V1 (no se rediseña Finance por él).

### D-795-2 — Provider fee + FX spread: obligaciones/clasificación SEPARADAS (honra hard rule TASK-793)

**Decisión.** El `net_payable` del payable del worker **NUNCA** absorbe provider fee ni FX spread (invariante TASK-793 intacto). Se modela:

- **Worker payout** = el `net_payable` del payable existente (dinero al worker, o a Deel que lo reenvía). Sin cambios al invariante `net = gross − withholding`. `economic_category='labor_cost_external'`.
- **Provider fee** = obligación **separada** cuando es un egreso real al provider: nuevo `payable_source_kind='provider_fee'` (enum additivo) + `beneficiary_type='provider'` (ver D-795-3). **`economic_category='vendor_cost_professional_services'`** — la categoría canónica YA existe (review finanzas 2026-05-30; es costo operativo de plataforma, NO labor). NUNCA agregar enum nuevo: usar `resolveExpenseEconomicCategory` (TASK-768).
- **FX spread/fee** = **NO es un payee separado** → se registra como metadata. **`economic_category='financial_cost'`** (categoría canónica existente — es **costo financiero**, va a la línea P&L de resultado financiero, NO opex). El **FX realizado en settlement** (rate documento vs rate pago) ya lo captura el layer canónico de pagos (`expense_payments.fx_gain_loss_clp` → "Resultado cambiario" del Banco, TASK-699/766) cuando Finance paga la obligación — el contractor payable NO recomputa FX.
- **Provider-withheld tax** (lo que Deel retiene de impuesto local del país del worker) = **informativo/reconciliación**, NUNCA una retención de Efeonce. No es `economic_category='tax'` de Efeonce (esa categoría es para remesas SII propias).
- **Reconciliación**: breakdown persistido `provider_settlement_breakdown_json` (charge / worker_payout / provider_fee / provider_withheld_tax / fx_spread) + **assertion de reconciliación con tolerancia** (espejo del CHECK `net = gross − withholding`): `charge ≈ worker_payout + provider_fee + provider_withheld_tax + fx_spread`. Nuevo gate readiness `provider_settlement_unreconciled` si no cuadra.

**Por qué.** Separa movimientos de dinero (auditable), preserva la semántica de CHECK de TASK-793, y le da a Finance clasificación de costo limpia con las categorías canónicas correctas: **worker = labor (opex), provider fee = servicio profesional (opex), FX spread = costo financiero (resultado financiero)** — tres líneas P&L distintas, no una mezcla. Es el patrón canónico "state machine + CHECK + audit trio" + clasificación económica TASK-768.

### D-795-3 — El contractor NUNCA es un Proveedor. Separar "quién recibe el dinero" de "de quién es el costo laboral"

**Aclaración crítica (objeción del operador 2026-05-30).** El **contractor (la persona que trabaja)** NO se modela como `greenhouse_core.providers`. Eso sería conflación grave: los Proveedores son **contrapartes comerciales** (vendors: SaaS, factoring Xepelin, etc.). El contractor es una **Persona** (`identity_profiles`) / **Colaborador** (`team_members`), anclado por el `ContractorEngagement` (TASK-790) — eso queda **intacto**.

**Decisión.** Hay que separar **dos dimensiones ortogonales** que la pregunta del operador deja al descubierto:

1. **Beneficiario de la obligación** = a quién le paga el banco de Greenhouse. Depende del lane:
   - **Direct international** (Greenhouse paga al worker directo) → `beneficiary_type='member'` / la persona del engagement.
   - **Provider-owned / EOR** (Greenhouse le paga a Deel, y Deel reenvía/es el empleador legal) → `beneficiary_type='provider'` (additivo al enum member/other) + `beneficiary_id = providers.provider_id`. **El proveedor acá es SOLO la plataforma/EOR (Deel/Remote/Oyster), que SÍ es una contraparte comercial legítima** (te factura, le pagas fee/invoice). No el worker.
2. **Sujeto de atribución del costo laboral** = de quién es el costo (para member loaded cost / client economics) = **SIEMPRE la persona contractor**, sin importar a quién le pague el banco. Ya lo captura el engagement (`profileId`/`memberId`). En EOR, el banco paga a Deel, pero el costo laboral se atribuye al worker.
   - **Loaded cost en EOR (review finanzas 2026-05-30):** el costo a atribuir al worker es el **invoice EOR completo** (worker pay + employer burden local + margen Deel), NO solo el worker payout. Para member loaded cost / client economics, attribuir el loaded cost total (el `charge` del breakdown D-795-2), no el `worker_payout`. Subatribuir solo el payout subestima el costo del colaborador en client economics.

**Por qué.** (a) Regla dura de arquitectura: extender el 360 canónico, no parallelizar — Deel-plataforma es genuinamente un Proveedor comercial (incluso el catálogo TASK-701 ya contempla `provider_type='payroll_processor'/'payment_platform'`); pero el contractor-persona jamás es Proveedor. (b) La distinción payee≠atribución evita el bug de que un pago a Deel "pierda" la atribución del costo al worker (rompe member loaded cost / client economics). Deel queda como una sola fila de Proveedor (contraparte de las facturas EOR/fee), y la persona contractor sigue siendo Persona/Colaborador.

### D-795-4 — Frontera dura vs `international_internal` / TASK-905/906/907 (lo más importante)

**Decisión.** TASK-795 cubre **solo** `tax_compliance_owner ∈ {provider_owned, manual_review_required}` para los lanes contractor/EOR/provider. **NUNCA** computa retención Chile→no-residente (treaty rates, certificados de residencia, LIR Art. 59/74). Ese motor es el régimen `international_internal` + TASK-905 (Americas) / TASK-906 (Europe) / TASK-907 (España). Si un engagement direct-international resulta ser un caso Chile-payer-a-no-residente real, en 795 es `manual_review_required` y **escala** a la línea 905+; 795 jamás aplica una tasa de withholding por su cuenta.

**Por qué.** Sin esta frontera explícita, 795 y 905+ se solapan y generan deuda + riesgo tributario. El payroll-auditor lo marca como decisión nº1. Invariante dura a documentar en el arch doc + CLAUDE.md al cierre.

### D-795-5 — La "entidad contratante" es la dimensión raíz (ya modelada como `legal_entity_organization_id`); el grueso = Efeonce SpA directo

**Decisión.** La dimensión que gobierna todo es **quién es la entidad legal contratante**, ya modelada en `contractor_engagements.legal_entity_organization_id` (**NOT NULL** en TASK-790). El `beneficiary` (D-795-3) y el `tax_compliance_owner` (D-795-4) son **consecuencias** de esta dimensión, no la raíz. Reusar la entidad canónica **Operating Entity** (`greenhouse_core.organizations.is_operating_entity=TRUE`), donde hoy vive `Efeonce Group SpA` (empleador, emisor DTE, entidad payroll). **NUNCA** parallelizar ni hardcodear "Efeonce = el pagador".

Matriz canónica (la entidad contratante × país del contractor determina el régimen tributario):

| Entidad contratante (`legal_entity_organization_id`) | Contractor | Régimen tributario | Owner |
|---|---|---|---|
| Efeonce Group SpA (Chile) | honorario CL residente | retención SII | TASK-794 ✅ |
| Efeonce Group SpA (Chile) | no-residente (directo internacional, **el grueso internacional**) | Chile→no-residente (LIR Art. 59/74) | TASK-905/906/907 |
| Deel (entidad legal externa, EOR) | worker en su país | payroll/tax local del provider | `provider_owned` |
| **Efeonce US Inc (futuro)** | persona en EEUU | US doméstico (1099/W-9, no retención chilena) | **futura task multi-entidad** |

**Estado HOY (operador 2026-05-30):** la **única** entidad contratante es **`Efeonce Group SpA` (casa matriz, Santiago, Chile)**. Todo engagement directo apunta su `legal_entity_organization_id` a esa Operating Entity. Por lo tanto el régimen hoy es siempre "entidad chilena paga" → honorarios (794) o Chile→no-residente (905).

**Roadmap declarado:** Efeonce abrirá entidades legales en varios países; **la primera será EEUU** (`Efeonce US Inc`). Cuando exista, es **una nueva fila `organizations` (is_operating_entity=TRUE, country=US)** — un nuevo valor de `legal_entity_organization_id`, sin rediseño del engagement. Pero **cambia el régimen tributario**: un contractor US contratado por `Efeonce US Inc` deja de ser "Chile→no-residente (905)" y pasa a "US doméstico" (otro motor). Eso es una **task futura multi-entidad/multi-jurisdicción**, NO 795 ni 905.

**Por qué (4-pilar — Scalability paga).** El que la entidad contratante sea una FK (`legal_entity_organization_id`) y no un hardcode es exactamente lo que permite que EEUU (y los siguientes países) entren como datos, no como rediseño. La regla dura: **795 debe leer la entidad contratante del campo y derivar de ahí el tax owner; NUNCA asumir "Efeonce SpA / Chile" en código.** Hoy es un valor único, pero el código no debe pin-earlo.

**Open Question diferida (no se decide en 795):** cuando haya >1 Operating Entity del grupo (Chile + US + …), (a) el modelo de "operating entity única" actual debe volverse multi-entidad, y (b) el resolver de tax owner debe convertirse en una matriz `(país_entidad_contratante × país_contractor)`. Eso es la task futura multi-entidad; 795 solo deja la dimensión lista (no la hardcodea).

### Reestructuración de scope en 2 fases (separables)

Dado el tamaño real, el Scope de abajo se reorganiza en **Fase A** (acotada, bajo riesgo, reusa 790/793) y **Fase B** (la pesada, toca Finance). **Fase B puede promoverse a una task derivada** (p.ej. TASK-799) si se quiere PR separado — decisión del operador al arrancar.

## Summary

Implementar frontera internacional para contractors directos, provider contractors via Deel/Remote/Oyster y EOR/provider, con tax owner, provider refs, charge/payout split y FX policy explicita.

## Why This Task Exists

Greenhouse trabaja internacionalmente, pero no debe fingir que tiene un motor tributario global. Para contractors fuera de Chile, el sistema debe distinguir quien posee compliance/tax/payout: Greenhouse policy, provider, country engine o manual review.

## Goal

- Modelar direct international vs provider-owned vs EOR/provider.
- Declarar tax/compliance owner and FX policy before readiness.
- Store provider invoice/payout/contract refs and provider fee split.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ECONOMIC_CATEGORY_DIMENSION_V1.md`

Reglas obligatorias:

- Do not apply Chile statutory deductions to international/provider contractors by default.
- Currency and payment currency must be explicit.
- Missing reliable FX policy blocks `ready_for_finance`.
- Provider fees and FX spreads are separate from worker gross/net.

## Dependencies & Impact

### Depends on

- `TASK-790`
- `TASK-793`
- `TASK-752` and `TASK-753` where payment profile coverage/self-service is needed.

### Blocks / Impacts

- Impacts Finance cost classification, provider reconciliation and payment routing.

### Files owned

- `src/lib/contractor-engagements/international/**`
- `src/lib/finance/payment-routing/**`
- `src/lib/finance/expense-taxonomy.ts`
- `migrations/**`

## Current Repo State

> **Recalibrado 2026-05-30** contra el código real (el "Gap" original sobre-dimensionaba — ~60% de la fundación ya existe, igual que pasó en TASK-794).

### Already exists (verificado en código — NO rehacer)

- **Engagement (TASK-790)** ya guarda como first-class: `payrollVia` (deel/remote/oyster/direct_international/manual_provider), `taxComplianceOwner` (greenhouse_policy/provider_owned/manual_review_required/country_engine_owned), `providerContractId`, `providerWorkerId`, `fxPolicyCode`, `currency`, `paymentCurrency`, `countryCode`, `taxResidencyCountryCode`.
- **`resolveDefaultTaxComplianceOwner` (tax-policy.ts)** ya devuelve `provider_owned` para deel/remote/oyster y `manual_review_required` para direct_international.
- **Readiness (TASK-793)** ya gatea `fxNeeded/fxSupported`, `currency_unsupported` (`SUPPORTED_OBLIGATION_CURRENCIES={CLP,USD}`), `provider_split_missing` (providerOwned ⇒ requiere provider ref).
- **`computeContractorWithholding`** ya retorna **0** para lanes no-honorarios → cero deducciones Chile a internacionales, automático.
- **`greenhouse_core.providers`** (Proveedor 360) existe → reusable como payee de EOR/provider-fee (ver D-795-3). El contractor-persona NO es Proveedor.
- **`economic_category` (TASK-768)** existe con `labor_cost_external` + enum extensible vía `resolveExpenseEconomicCategory`.

### Gap real (lo genuinamente nuevo)

- **NO existe gate de readiness sobre `tax_compliance_owner`**: `manual_review_required` / `direct_international` no bloquean hoy (AC#1 incumplida). [Fase A]
- **FX policy es pobre**: solo verifica que exista un rate (`getLatestStoredExchangeRatePair`), sin source + date policy + spread owner. [Fase A]
- **NO existe el split charge/payout/fee/FX-spread** ni su reconciliación: el payable tiene un solo `net_payable`. [Fase B]
- **NO existe `beneficiary_type='provider'`** ni el seed de Deel/Remote/Oyster como `greenhouse_core.providers`. [Fase B]
- **NO existen reliability signals** del dominio internacional/provider (el spec original los omitía). [Fase A+B]

## Scope (reestructurado en 2 fases — ver Decisiones Pre-Ejecución)

### Fase A — Frontera + tax-owner gate + FX policy (acotada, bajo riesgo, reusa 790/793)

Cierra AC#1, #3, #4 y entrega valor sin tocar el split de Finance.

- **A1 — Tax-owner readiness gate**: nuevo blocker `tax_owner_review_required` fail-closed cuando `tax_compliance_owner ∈ {manual_review_required}` (y `direct_international` sin policy de país) → no llega a `ready_for_finance` sin revisión humana. Frontera dura D-795-4 vs `international_internal`/TASK-905 (795 nunca aplica withholding Chile→no-residente; escala).
- **A2 — FX policy rica**: extender la FX readiness con `fx_rate_source` + `fx_rate_date` policy + spread owner; `payment_currency` debe ser explícita y ∈ {CLP,USD} (D-795-1, lo exótico → `currency_unsupported` + `manual_review`). Bloquea `ready` si el path cross-currency no está explícito.
- **A3 — Reliability signals**: `commercial`/`finance` signals nuevos: `contractor_payable.fx_unresolved_overdue` (lag) + `contractor_payable.manual_review_overdue` (drift), steady=0. Patrón canónico TASK-793/794.

### Fase B — Provider settlement split + reconciliación + EOR (la pesada, toca Finance; promovible a TASK derivada)

- **B1 — Provider data contract**: persistir provider contract/worker/invoice/payout IDs en el payable (hoy solo viven en el engagement); `beneficiary_type='provider'` (additivo) + `beneficiary_id = providers.provider_id`; seed Deel/Remote/Oyster como providers canónicos (D-795-3).
- **B2 — Settlement split + reconciliación**: `provider_settlement_breakdown_json` (charge/worker_payout/provider_fee/provider_withheld_tax/fx_spread) + assertion de reconciliación con tolerancia (espejo `net=gross−withholding`) + nuevo blocker `provider_settlement_unreconciled`. `net_payable` del worker NUNCA absorbe fee/spread (D-795-2). Provider fee = obligación separada (`payable_source_kind='provider_fee'`); FX spread = metadata + clasificación, no payee.
- **B3 — Finance classification**: mapear worker payout / provider fee / FX spread a su `economic_category` canónica (resolver TASK-768; si falta una categoría, agregarla al enum TASK-768, NUNCA string libre) + metadata de obligación. Atribución de costo laboral SIEMPRE a la persona contractor, sin importar el payee (D-795-3).
- **B4 — Reliability**: `finance.contractor_payable.provider_reconciliation_drift` (drift, steady=0).

## Payroll Non-Regression Guardrails (hard rules)

795 modela contractors internacionales/provider; el motor de nómina dependiente Chile no participa. Auditado con `greenhouse-payroll-auditor`.

- **NUNCA** aplicar deducciones estatutarias Chile (AFP/Fonasa/Isapre/AFC/SIS/mutual/IUSC) a contractors internacionales o provider-owned. Default sin deducciones; tax owner = provider / manual_review / country_engine.
- **NUNCA** mutar `members.{pay_regime,payroll_via,contract_type}` al modelar el canal internacional del engagement. `payRegime='international'` y `payrollVia='deel'` del member siguen siendo del dominio payroll/member, no del engagement.
- **NUNCA** clasificar payout/charge/fee de provider como remuneración dependiente. Economic category = `labor_cost_external`/provider; fees y FX spread a sus categorías propias.
- **NUNCA** generar `payroll_entries` desde un payable internacional.
- **SIEMPRE** correr `pnpm vitest run src/lib/payroll` al cierre (la task ya declara aplicar el payroll auditor checklist).

## Out of Scope

- Full Deel/Remote/Oyster API sync.
- Country-specific tax engines beyond Chile honorarios.
- Stablecoin/crypto rails.

## Acceptance Criteria

**Fase A:**

- [ ] Direct international / `manual_review_required` contractor no alcanza `ready_for_finance` sin revisión humana (gate `tax_owner_review_required` fail-closed).
- [ ] Cross-currency payable no alcanza `ready` sin FX policy explícita (source + date + spread owner); `payment_currency` exótica (no CLP/USD) bloquea (`currency_unsupported`) y rutea a `manual_review` (D-795-1).
- [ ] Chile deductions nunca se aplican a payables internacionales/provider (ya garantizado por `computeContractorWithholding`; verificado con test).
- [ ] 795 nunca aplica withholding Chile→no-residente: ese caso escala a `international_internal`/TASK-905 (frontera D-795-4).

**Fase B:**

- [ ] El contractor-persona NUNCA se persiste como `greenhouse_core.providers`; el payee `provider` es solo la plataforma/EOR (Deel) (D-795-3).
- [ ] Provider-owned/EOR payable almacena provider refs + `beneficiary_type='provider'`; el split charge/payout/fee/FX-spread reconcilia (`charge ≈ payout + fee + provider_withheld_tax + fx_spread`) o bloquea (`provider_settlement_unreconciled`).
- [ ] `net_payable` del worker nunca absorbe provider fee ni FX spread (invariante TASK-793 intacto).
- [ ] La atribución de costo laboral apunta SIEMPRE a la persona contractor, sin importar el payee de la obligación (D-795-3).

## Verification

- `pnpm exec tsc --noEmit --pretty false`
- Unit tests for policy resolver and FX readiness.
- Payroll auditor checklist applied in task audit.
- `pnpm vitest run src/lib/payroll` — payroll non-regression gate.

## Closing Protocol

- [ ] Lifecycle and folder synchronized.
- [ ] `docs/tasks/README.md` synchronized.
- [ ] `Handoff.md` updated.
