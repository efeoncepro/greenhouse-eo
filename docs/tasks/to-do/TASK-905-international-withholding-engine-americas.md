# TASK-905 — International Withholding Engine V1 (Americas)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `payroll|finance|hr|data|reliability`
- Blocked by: `external tax/legal validation of approved rates before production cutover`
- Branch: `task/TASK-905-international-withholding-engine-americas`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Delta 2026-05-27

- **Linkage de programa.** Se rastrea junto a EPIC-013 (contractor engagements, TASK-790→798) como parte del cuerpo "pagos a fuerza laboral internacional". Pero ⚠️ **`international_internal` NO es contractor**: es régimen de Payroll interno (`payroll_via='internal'`) para un residente fiscal no-Chile pagado directo por Efeonce. El contractor program cubre `contractor`/`honorarios`/EOR vía Engagements→Payables→Finance; 905/906 viven **dentro del motor de Payroll**. No confundir con `international_contractor`/`direct_international` (TASK-795). Se mantiene `Epic: optional` a propósito (flippear a EPIC-013 sería category error).
- **Guardrails de no-regresión payroll** consolidados abajo (ya distribuidos en Reglas obligatorias + Slice 4; cristalizados en el formato escaneable del programa). Auditado con `greenhouse-payroll-auditor`.

## Summary

Crear el motor canónico de retenciones internacionales para `international_internal`: Payroll calcula bruto, retención, neto y evidencia; Finance/Tesorería consume el resultado para pagar, declarar/registrar obligación y conciliar. V1 debe ser agnóstico al colaborador y resolver por país de residencia fiscal, tipo de servicio, convenio/evidencia y vigencia.

El catálogo inicial cubre **América completa** para pagador `CL`: cada país/territorio americano debe quedar con una regla aprobada o con fallback explícito `needs_tax_review`. Europa, España incluida, queda fuera del seed V1 y debe bloquear como revisión manual hasta `TASK-906` / `TASK-907`.

## Why This Task Exists

TASK-894 creó `international_internal` como contrato first-class, pero su V1 lo dejó sin descuentos Chile y con revisión legal manual por persona. La conversación operativa posterior cerró un gap: colaboradores fuera de Chile pagados directo por Efeonce no deben recibir cotizaciones/Payroll Chile, pero pueden requerir **retención de Impuesto Adicional o trato de convenio**.

No basta guardar excepciones por persona como "Daniela retiene X" o "Andrés retiene Y". La solución robusta es un catálogo versionado de reglas por país/tipo de servicio/evidencia, consumido por Payroll igual que hoy consume retención de honorarios Chile, y con snapshots auditables en `payroll_entries`.

## Goal

- Modelar reglas de retención internacional como catálogo versionado y no como atributos hardcoded por colaborador.
- Hacer que Payroll calcule `international_internal` como bruto - retención internacional aplicable = neto, sin aplicar AFP/salud/AFC/SIS/Mutual/IUSC ni retención SII honorarios.
- Cubrir América completa desde V1 con filas explícitas por país/territorio: `approved_*` cuando haya policy validada y `needs_tax_review` cuando no.
- Persistir snapshots por entry: residencia fiscal, tipo de servicio, regla, tasa, monto retenido, evidencia y estado.
- Emitir obligaciones separadas para Finance/Payment Orders: neto al contractor y componente retenido/impuesto cuando corresponda.
- Bloquear cálculo/cierre/pago cuando falta evidencia requerida o regla aprobada.

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
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PAYROLL_PERIOD_OUTPUTS_V1.md`
- `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ECONOMIC_CATEGORY_DIMENSION_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/architecture/DECISIONS_INDEX.md`

Reglas obligatorias:

- Payroll calcula retenciones; Finance/Tesorería no recalcula, solo consume obligaciones, paga, declara/registra y concilia.
- `international_internal` nunca puede caer en descuentos previsionales Chile ni en retención honorarios SII.
- No se puede aplicar tasa 0% por convenio sin evidencia explícita: residencia fiscal, no establecimiento permanente/base fija cuando aplique, invoice/contrato y clasificación de servicio.
- No se puede aplicar tasa reducida por convenio solo por país. La regla debe matchear país fiscal + tipo de servicio + payee type + artículo/base legal + evidencia + vigencia.
- Todo resultado debe ser snapshot: no recalcular periodos cerrados con reglas nuevas sin reliquidación/reapertura formal.
- El catálogo debe ser versionado por `effective_from/effective_to`, fuente oficial, aprobador y estado.
- Si la regla o evidencia faltan, el estado correcto es bloqueo/revisión, no asumir pago bruto.
- `EU`/`European Union` no es residencia fiscal válida. Si llega desde vendor data, resolver debe retornar `blocked_invalid_tax_residency` o equivalente y exigir país/jurisdicción fiscal.

## Normative Docs

- `docs/tasks/complete/TASK-894-international-internal-contract-type.md`
- `docs/documentation/hr/periodos-de-nomina.md`
- `docs/manual-de-uso/hr/periodos-de-nomina.md`
- `docs/documentation/hr/pagos-de-nomina.md` `[verificar si existe]`
- `docs/documentation/finance/ordenes-de-pago.md`
- `docs/documentation/finance/categoria-economica-de-pagos.md`
- `docs/manual-de-uso/hr/descargar-y-reconciliar-nomina.md`
- `docs/audits/payroll/TASK-905_INTERNATIONAL_WITHHOLDING_AMERICAS_SII_DISCOVERY_2026-05-17.md`
- `docs/audits/payroll/TASK-905_INTERNATIONAL_WITHHOLDING_EUROPE_SII_DISCOVERY_2026-05-17.md` — referencia de investigacion futura; Europa sigue fuera del seed aprobado Americas V1.
- `docs/tasks/to-do/TASK-906-international-withholding-engine-europe.md` — follow-up europeo que reutiliza la foundation de esta task.
- `docs/tasks/to-do/TASK-907-spain-international-withholding-rule-pack.md` — vertical slice Espana/Daniela sobre TASK-906.
- SII convenios internacionales vigentes: `https://www.sii.cl/normativa_legislacion/convenios_internacionales.html`
- SII Ley sobre Impuesto a la Renta / Impuesto Adicional Art. 59: fuente oficial vigente a congelar en Discovery.
- Fuentes oficiales por país americano cuando aplique certificado de residencia fiscal o requisitos locales.

## Discovery Conclusions Now Canonical

Estas conclusiones de las auditorias SII 2026-05-17 deben quedar reflejadas en el plan/ADR antes de implementar schema:

- El baseline sin convenio para servicios profesionales/tecnicos de no residentes es LIR Art. 59 N°2: candidato `15%`, o `20%` si concurren circunstancias de regimen fiscal preferencial / Art. 41 H. No promoverlo a `approved_with_withholding` sin aprobacion Tax/Legal.
- Otros buckets no son intercambiables: royalties/IP, software estandar, reembolsos, servicios no tecnicos, servicios personales desarrollados en Chile y export-related exemptions requieren categorias separadas y pueden bloquear como `needs_tax_review`.
- Convenio vigente no equivale a tasa 0. Antes de aplicar tasa cero/reducida se requiere certificado de residencia fiscal, declaracion no EP/base fija, elegibilidad de convenio, servicio/contrato/invoice, beneficiario efectivo y snapshot de periodo.
- Transporte-only e intercambio de informacion no reducen retencion para payroll services. En Americas esto afecta Panama/Venezuela/Bermuda; en Europa afecta Alemania/Guernesey/Jersey, entre otros.
- Territorios y dependencias no heredan automaticamente el convenio del Estado relacionado: PR/VI vs US, GF/GP/MQ/BL/MF/PM vs Francia, BQ/CW/SX vs Paises Bajos, GL/FO vs Dinamarca, y Crown dependencies/territorios britanicos vs Reino Unido.
- El motor debe poder distinguir persona natural independiente, entidad/empresa, posible empleo/subordinacion y proveedor Deel/EOR. Si hay senales de empleo, el estado correcto es `needs_legal_classification_review`.
- Europa queda fuera del seed aprobado V1, pero su investigacion deja guardrails obligatorios: Espana/Europa deben bloquear `needs_tax_review`; un futuro seed Europa debe incluir MLI/PPT, circulares MFN SII y cobertura territorial.

## Dependencies & Impact

### Depends on

- `TASK-894` completo: `international_internal` existe como `ContractType`.
- `src/types/hr-contracts.ts` — derivación contractual y capability `payroll.contract.use_international_internal`.
- `src/lib/payroll/calculate-payroll.ts` — motor oficial donde se calcula entry.
- `src/lib/payroll/calculate-honorarios.ts` — referencia de patrón bruto/retención/neto.
- `src/lib/payroll/postgres-store.ts` — persistencia de compensation/entry snapshots.
- `src/lib/payroll/receipt-presenter.ts` — clasificación de recibos/reportes.
- `src/types/payroll.ts` — contratos TS de entries/periods.
- `greenhouse_payroll.payroll_entries` — snapshot final por periodo.
- `greenhouse_payroll.compensation_versions` — fuente contractual actual.
- `greenhouse_core.members` — `contract_type/pay_regime/payroll_via`.
- `greenhouse_core.person_identity_documents` y `greenhouse_core.person_addresses` — referencias Person 360 existentes para identidad/dirección.
- `greenhouse_core.assets` `[verificar columns/owner model]` — evidencia privada de certificados/contratos/invoices.
- `greenhouse_finance.payment_obligations` — salida hacia pagos y componente retenido.

### Blocks / Impacts

- Migración real de Andrés/Colombia a `international_internal` con cálculo automático de retención.
- Cualquier uso productivo de `international_internal` sin revisión manual por persona.
- `TASK-906`: seed Europa fail-closed sobre la foundation de esta task.
- `TASK-907`: rule pack Espana/Daniela sobre TASK-906.
- Futuro seed Europa: España/Daniela queda fuera del catálogo aprobado V1 y debe quedar como `needs_tax_review` hasta que `TASK-906` y, para Espana, `TASK-907` cierren con aprobacion Tax/Legal.
- Payment Orders: debe recibir `employee_net_pay` y `employee_withheld_component` para retención internacional cuando exista.
- Recibos/reportes mensuales: deben mostrar subtotal separado de retención internacional, no mezclarlo con Previred ni F29 honorarios.

### Files owned

- `src/lib/payroll/international-withholding/types.ts` — NEW.
- `src/lib/payroll/international-withholding/rules.ts` — NEW resolver/catalog access.
- `src/lib/payroll/international-withholding/resolve.ts` — NEW pure resolver.
- `src/lib/payroll/international-withholding/resolve.test.ts` — NEW.
- `src/lib/payroll/international-withholding/americas-catalog.test.ts` — NEW coverage catalog.
- `src/lib/payroll/calculate-payroll.ts` — MODIFY.
- `src/lib/payroll/postgres-store.ts` — MODIFY.
- `src/lib/payroll/payroll-readiness.ts` — MODIFY.
- `src/lib/payroll/receipt-presenter.ts` — MODIFY.
- `src/types/payroll.ts` — MODIFY.
- `src/types/db.d.ts` — regenerate after migrations.
- `src/lib/finance/payment-obligations/` — MODIFY materializer from payroll export if needed.
- `src/lib/reliability/queries/payroll-international-withholding-*.ts` — NEW signals.
- `src/lib/reliability/get-reliability-overview.ts` — MODIFY wiring.
- `migrations/<timestamp>_task-905-international-withholding-foundation.sql` — NEW.
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` — MODIFY ADR delta.
- `docs/architecture/GREENHOUSE_PAYROLL_PERIOD_OUTPUTS_V1.md` — MODIFY report contract.
- `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md` — MODIFY obligation mapping.
- `docs/architecture/DECISIONS_INDEX.md` — MODIFY.
- `docs/documentation/hr/periodos-de-nomina.md` — MODIFY.
- `docs/manual-de-uso/hr/periodos-de-nomina.md` — MODIFY.
- `docs/manual-de-uso/hr/descargar-y-reconciliar-nomina.md` — MODIFY.
- `changelog.md` — MODIFY.
- `Handoff.md` — MODIFY on execution.

## Current Repo State

### Already exists

- `international_internal` es first-class en `src/types/hr-contracts.ts`.
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` declara que `international_internal` no aplica payroll estatutario Chile.
- `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md` ya declara que Payroll calcula/exporta obligaciones y Finance paga.
- `greenhouse_finance.payment_obligations` soporta `employee_net_pay` y `employee_withheld_component`.
- `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md` ya modela `tax_residency_country_code`, `tax_withholding_policy_code` y `direct_international`, pero indica que el runtime no está implementado.
- `calculate-honorarios` ya ofrece patrón de retención determinística para un régimen no dependiente.

### Gap

- No existe catálogo de reglas de retención internacional.
- No existe perfil de residencia fiscal verificada reutilizable por Payroll.
- No existe clasificación canónica de tipo de servicio para `international_internal`.
- `international_internal` hoy se renderiza como sin descuentos legales; eso es incompleto para pagos directos al exterior.
- No existen campos snapshot en `payroll_entries` para tasa/monto/regla/evidencia de retención internacional.
- No existe readiness blocker para `international_internal` sin regla/evidencia.
- No existen subtotales separados de retención internacional en recibos/reportes.
- No hay reliability signal para reglas faltantes, evidencia vencida o entry internacional pagable sin tax treatment.

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

### Slice 0 — Discovery oficial + ADR delta

- Congelar lista ISO de países/territorios de América que V1 debe cubrir.
- Verificar lista SII de convenios vigentes y fuentes Art. 59/Impuesto Adicional aplicables al pagador Chile.
- Definir matriz de estados: `approved_no_withholding`, `approved_with_withholding`, `needs_tax_review`, `blocked_missing_evidence`, `manual_override_approved`.
- Escribir ADR/delta en Payroll Architecture antes de implementar schema.
- Confirmar si el perfil fiscal vive en `greenhouse_core` o `greenhouse_payroll` según runtime real y Person 360 vigente.

### Slice 1 — Schema foundation

- Crear tablas versionadas:
  - `greenhouse_payroll.international_withholding_rules`
  - `greenhouse_payroll.international_withholding_rule_sources`
  - `greenhouse_payroll.international_withholding_overrides` append-only o evented
  - perfil fiscal/evidencia según Discovery: `greenhouse_core.person_tax_residency_profiles` o alternativa canónica validada.
- El catalogo de reglas debe modelar como columnas/JSON validado, no texto libre opaco:
  - `payer_country_code`
  - `tax_residence_country_code`
  - `service_category`
  - `payee_type`
  - `treaty_applicability`
  - `legal_basis`
  - `rate`
  - `rate_basis`
  - evidence requirements: residencia, no EP/base fija, beneficiario efectivo, ubicacion de servicio, day-count, Art. 41 H, territorial coverage
  - `source_url`, `source_reference`, `source_validated_at`, `approved_by_actor`, `approval_expires_at`
- Extender `greenhouse_payroll.payroll_entries` con snapshot nullable:
  - `international_service_category`
  - `tax_residence_country_code`
  - `international_payee_type`
  - `international_withholding_rule_id`
  - `international_withholding_status`
  - `international_withholding_rate`
  - `international_withholding_amount`
  - `international_withholding_currency`
  - `international_withholding_rate_basis`
  - `international_withholding_tax_borne_by`
  - `international_withholding_evidence_snapshot_json`
  - `international_withholding_evidence_hash`
  - `international_withholding_legal_basis`
- Agregar CHECKs conservadores y GRANTs canónicos.

### Slice 2 — Americas catalog seed

- Seed obligatorio para América completa: cada país/territorio debe tener al menos una regla fallback `needs_tax_review` para `payer_country='CL'`.
- Seed aprobado solo donde existan fuentes oficiales verificadas y decisión tax/legal documentada.
- Las reglas candidatas derivadas de discovery deben nacer como `draft_tax_review` o estado equivalente; el paso a `approved_*` debe ser una mutacion auditada con actor, fuente, evidencia y expiracion.
- Colombia debe tener reglas diferenciables por `service_category`, incluyendo caso técnico/consultoría si se aprueba como retención reducida por convenio.
- Brasil y Uruguay deben permitir reglas tecnicas diferenciadas si Tax/Legal aprueba: Brasil por protocolo Art. 12 servicios tecnicos/asistencia tecnica; Uruguay por Art. 14bis servicios gerenciales/tecnicos/consultoria.
- Canada, Mexico y Peru deben diferenciar persona natural con servicios llevados a cabo en Chile y cap de convenio vs servicio remoto/no base fija que requiere revision.
- Estados Unidos, Ecuador, Paraguay y otros convenios con Art. 14 base fija/183 dias deben exigir day-count antes de cualquier candidato `approved_no_withholding`.
- Nicaragua debe quedar explícita como sin convenio/fallback revisión si no hay policy aprobada.
- Panama y Venezuela deben quedar `needs_tax_review` aunque existan convenios de transporte SII; transporte no aplica a payroll services.
- Países con convenio o reglas claras deben incluir `source_url`, `source_reference`, `effective_from`, `reviewed_at`, `approved_by_actor`.
- Europa, España incluida, no se seed-ea como aprobada en V1; si aparece `tax_residence_country_code='ES'`, resolver debe retornar `needs_tax_review` hasta task Europa.

### Slice 3 — Resolver determinístico

- Crear `resolveInternationalWithholding(input)` server-only/pure:
  - `grossAmount`, `currency`, `payerCountry`, `taxResidenceCountry`, `payeeType`, `serviceCategory`, `relationshipType`, `servicePerformedCountry`, `chilePhysicalDaysIn12m`, `hasPermanentEstablishmentOrFixedBase`, `evidence`, `period`, `tax_borne_by`.
- Resolver devuelve status, tasa, monto retenido, neto, regla, evidencia faltante y legal basis.
- Reglas de cálculo:
  - si `contractType !== international_internal`, no aplica.
  - si `taxResidenceCountry` es `EU` o jurisdiccion agregada no fiscal, bloquear como residencia invalida.
  - si falta país fiscal, tipo de servicio o regla, bloquear.
  - si falta evidencia requerida para tasa 0/reducida, bloquear o usar fallback explícito si existe.
  - no convertir moneda silenciosamente; si se requiere CLP para obligación tributaria, registrar FX requirement como pendiente de Payment Orders/Finance policy.
  - si hay senales de empleo/subordinacion en un `international_internal`, devolver `needs_legal_classification_review` antes de resolver tasa.
- Tests mínimos: Colombia técnico, Colombia profesional no técnico con evidencia, Brasil técnico, Uruguay Art. 14bis técnico, Nicaragua fallback, Panamá/Venezuela transporte-only fallback, país americano sin regla aprobada, España fuera de scope, `EU` residencia inválida, evidencia vencida, override aprobado, gross-up.

### Slice 4 — Payroll calculation integration

- Integrar el resolver en `calculate-payroll.ts` solo para `contractTypeSnapshot='international_internal'`.
- Feature flag `PAYROLL_INTERNATIONAL_WITHHOLDING_ENABLED=false` default:
  - OFF: comportamiento TASK-894 preservado, pero readiness puede emitir warning si hay `international_internal`.
  - ON: cálculo oficial falla cerrado si resolver retorna blocker.
- Persistir snapshot en `payroll_entries`.
- Mantener intactos Chile dependiente, honorarios y Deel.
- Tests de regresión para asegurar que `contractor/eor/payrollVia=deel` no reciben retención calculada por Greenhouse.

### Slice 5 — Readiness, receipts and reports

- Extender `payroll-readiness` con blockers específicos:
  - missing tax residence
  - missing service category
  - missing required evidence
  - missing approved Americas rule
  - rule outside effective dates
- Extender receipt/report presenter:
  - subtotales separados `Total retención internacional` y `Total internacional interno neto`.
  - nota clara: "Retención internacional" distinta de Previred y F29 honorarios.
  - si estado es `needs_tax_review`, no permitir export/aprobación oficial.
- Actualizar Excel/PDF monthly report sin mezclar monedas.

### Slice 6 — Payment obligations bridge

- Extender materializer de obligations desde payroll export:
  - `employee_net_pay` = neto al contractor.
  - `employee_withheld_component` = retención internacional si `international_withholding_amount > 0`, beneficiary `tax_authority` o placeholder fiscal definido por Discovery.
- Incluir metadata: rule id, legal basis, country, service category, evidence snapshot hash, currency, FX requirement.
- No marcar como paid ni declarar impuesto; Payment Orders/Finance sigue owner de pago/declaración/conciliación.

### Slice 7 — UI/API minimal

- Agregar write/read paths auditados para perfil fiscal, tipo de servicio y evidencia requerida.
- Capabilities propuestas:
  - `payroll.international_withholding.rules.read`
  - `payroll.international_withholding.rules.manage`
  - `payroll.international_withholding.profile.update`
  - `payroll.international_withholding.override`
- UI mínima en Payroll/Workforce activation:
  - mostrar país fiscal, tipo de servicio, tasa/estado, evidencia faltante.
  - bloquear selección productiva de `international_internal` si falta tax profile cuando flag ON.
- Si se crea admin catalog page, documentar access model completo (`routeGroups`, `views`, `entitlements`, startup policy).

### Slice 8 — Reliability, audit and docs

- Signals:
  - `payroll.international_withholding.rule_missing`
  - `payroll.international_withholding.evidence_missing`
  - `payroll.international_withholding.evidence_expired`
  - `payroll.international_withholding.manual_override_active`
  - `payroll.international_withholding.payment_obligation_drift`
- Audit log append-only para overrides y rule status changes.
- Docs vivas:
  - Payroll architecture
  - Payment Orders architecture
  - Payroll period outputs
  - manual HR Payroll
  - documentation HR Payroll
  - changelog

### Slice 9 — Controlled data readiness dry-run

- Crear script dry-run para colaboradores actuales:
  - Andrés/Colombia debe resolver contra catálogo Americas según servicio/evidencia.
  - Melkin/Nicaragua debe permanecer Deel si realmente es Deel; si no, mostrar fallback review.
  - Daniela/España debe quedar `needs_tax_review` por estar fuera de scope Europa V1.
- No mutar colaboradores reales sin allowlist escrita HR/Finance/Legal y autorización explícita.

## Payroll Non-Regression Guardrails (hard rules)

905 extiende el motor de Payroll para `international_internal`. Regla central: agregar el cálculo de retención internacional **sin romper los otros 4 regímenes** (Chile dependiente, honorarios, contractor/Deel, EOR) y sin que `international_internal` caiga jamás en payroll estatutario Chile.

- **NUNCA** aplicar a `international_internal` deducciones Chile dependientes (AFP/Fonasa/Isapre/AFC/SIS/mutual/IUSC) ni retención honorarios SII. Es `bruto − retención internacional aplicable = neto`.
- **NUNCA** alterar el cálculo de Chile dependiente, honorarios, contractor/Deel ni EOR al integrar el resolver. Los tests de regresión (Slice 4) deben quedar verde antes de cerrar.
- **NUNCA** activar el cálculo productivo sin `PAYROLL_INTERNATIONAL_WITHHOLDING_ENABLED` default OFF + signoff Tax/Legal del catálogo aprobado.
- **NUNCA** aplicar tasa 0%/reducida por convenio sin evidencia completa (residencia fiscal + no EP/base fija cuando aplique + invoice/contrato + categoría de servicio + beneficiario efectivo + vigencia). Fail-closed.
- **NUNCA** pagar bruto cuando falta regla aprobada o evidencia → estado `needs_tax_review`/`blocked_*`, nunca asumir 0%.
- **NUNCA** recalcular periodos cerrados con reglas nuevas. Snapshots inmutables en `payroll_entries`; cambios requieren reliquidación/reapertura formal.
- **NUNCA** mezclar la retención internacional con Previred ni F29 honorarios en recibos/reportes; subtotal separado.
- **NUNCA** mutar colaboradores reales a `international_internal` en esta task (Slice 9 es dry-run, con allowlist HR/Finance/Legal).
- **SIEMPRE** correr la suite completa `pnpm vitest run src/lib/payroll` (no solo `international-withholding`) como gate de cierre; cero deltas en los otros regímenes.

## Out of Scope

- Seed aprobado para Europa, España incluida. Europa vive en `TASK-906`; Espana/Daniela vive en `TASK-907`, ambos después de estabilizar Americas y con aprobacion Tax/Legal.
- Motor global de impuestos locales del país del contractor. Greenhouse calcula retención del pagador Chile; no reemplaza cumplimiento tributario local del contractor.
- Mutar colaboradores reales a `international_internal`.
- Crear Contractor Engagements completo si el runtime aún no existe.
- Automatizar declaración/pago de Impuesto Adicional. Finance/Payment Orders consume la obligación; declaración/pago queda fuera.
- Cálculo automático de FX fiscal si no existe policy canónica; puede quedar como `fx_required`.

## Detailed Spec

### Service categories V1

Usar enum cerrado inicial:

- `professional_service`
- `technical_service`
- `consulting_service`
- `management_service`
- `software_standard_use`
- `software_license_or_exploitation`
- `royalty_ip`
- `equipment_royalty`
- `creative_service`
- `reimbursement`
- `other`

Cada regla debe declarar si aplica por categoría exacta o por grupo. `other`, `reimbursement`, `software_standard_use` y `software_license_or_exploitation` nunca pueden aprobar tasa 0 automática sin override y evidencia especifica.

### Rule status semantics

- `draft_tax_review`: regla candidata documentada por discovery, pero no aprobada para calculo productivo.
- `approved_no_withholding`: tasa 0; requiere evidencia y legal basis.
- `approved_with_withholding`: tasa > 0; requiere legal basis.
- `needs_tax_review`: no hay policy aprobada; bloquea cálculo oficial si flag ON.
- `blocked_invalid_tax_residency`: residencia fiscal no usable para resolver, por ejemplo `EU` o jurisdiccion agregada.
- `blocked_missing_evidence`: hay regla potencial, pero falta evidencia.
- `manual_override_approved`: excepción auditada con expiración.

### Gross-up semantics

El resolver debe modelar:

- `tax_borne_by='contractor'`: neto = bruto - retención.
- `tax_borne_by='efeonce'`: neto contractual preservado; costo bruto/gross-up calculado y marcado como costo adicional.
- `tax_borne_by='unknown'`: blocker.

V1 puede soportar `contractor` primero y dejar `efeonce` como warning/needs review si no hay decisión de Finance.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 0 debe cerrar ADR/fuentes oficiales antes de schema.
- Slice 1 -> Slice 2 -> Slice 3: schema/catalog/resolver.
- Slice 4 depende de Slice 3 y debe ir detrás de flag OFF.
- Slice 5 y Slice 6 dependen de snapshots de Slice 4.
- Slice 7 puede avanzar después de Slice 3, pero no debe activar write path productivo hasta Slice 4/5.
- Slice 8 puede correr en paralelo después de Slice 4.
- Slice 9 siempre al final y solo dry-run.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Aplicar retención errónea por país/servicio | payroll/tax | medium | catálogo aprobado + fuentes oficiales + feature flag + manual review fallback | `payroll.international_withholding.rule_missing` |
| Pagar bruto sin evidencia de convenio | payroll/finance | high | readiness blocker + Payment Orders drift check | `payroll.international_withholding.evidence_missing` |
| Mezclar retención internacional con Previred/F29 honorarios | payroll/reporting | medium | subtotales separados + tests receipt/report | tests + `payment_obligation_drift` |
| Recalcular periodos cerrados con regla nueva | payroll/period close | medium | snapshots inmutables + reliquidación/reopen only | audit/reliquidation checks |
| España/Daniela queda sin cálculo automático V1 | payroll/ops | medium | estado `needs_tax_review` explícito + `TASK-906` Europa + `TASK-907` Espana | readiness blocker honesto |
| Catálogo Americas incompleto | data/reliability | medium | test de coverage ISO Americas | `americas-catalog.test.ts` |

### Feature flags / cutover

- `PAYROLL_INTERNATIONAL_WITHHOLDING_ENABLED=false` default.
- `PAYROLL_INTERNATIONAL_WITHHOLDING_READINESS_BLOCKERS_ENABLED=false` default si se requiere shadow.
- Cutover recomendado:
  1. Deploy schema/catalog/resolver con flags OFF.
  2. Ejecutar dry-run Americas y fixtures actuales.
  3. Activar readiness blockers en staging.
  4. Activar cálculo en staging para allowlist sintética.
  5. Monitorear signals 14 días.
  6. Activar producción solo con legal/tax signoff de catálogo.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert migration if no prod data; otherwise leave additive columns/tables unused | 30-60 min | parcial |
| Slice 2 | Mark rules `inactive`/`needs_tax_review`; no code rollback needed | <10 min | si |
| Slice 3 | Revert helper or disable consumers via flags | <10 min | si |
| Slice 4 | Set `PAYROLL_INTERNATIONAL_WITHHOLDING_ENABLED=false` + redeploy | <5 min | si |
| Slice 5 | Disable readiness blockers flag; reports fall back to TASK-894 behavior | <5 min | si |
| Slice 6 | Disable payment obligation materializer branch via flag or revert projection | <15 min | si |
| Slice 7 | Remove capability grants or hide view | <10 min | si |
| Slice 8 | Disable signals in registry only if noisy after issue filed | <10 min | si |
| Slice 9 | Dry-run only; no rollback | N/A | si |

### Production verification sequence

1. `pnpm pg:doctor`.
2. `pnpm migrate:create task-905-international-withholding-foundation` and apply in staging.
3. Verify tables, constraints and seed coverage for Americas.
4. Run resolver tests and catalog coverage tests.
5. Run payroll regression suite with flags OFF: legacy TASK-894 behavior unchanged.
6. Enable readiness blockers in staging with synthetic `international_internal` fixtures.
7. Enable calculation flag in staging and verify entries/receipts/payment obligations.
8. Run dry-run for current collaborators; do not mutate real data.
9. Legal/Tax approves Americas catalog.
10. Repeat in production with flags OFF, then staged flag activation.

### Out-of-band coordination required

- Legal/Tax must approve any `approved_*` rule before production cutover.
- HR/People Ops must define source of truth for `serviceCategory` per collaborator/contract.
- Finance must define whether gross-up is allowed and how retained amounts are declared/paid.
- If evidence assets are used, confirm retention/privacy policy for tax certificates and contracts.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `international_internal` entries can calculate international withholding through a deterministic resolver when flag is ON.
- [ ] Chile dependent, honorarios, contractor Deel and EOR behavior remains unchanged with explicit regression tests.
- [ ] Americas catalog coverage test proves every Americas country/territory returns an approved treatment or `needs_tax_review`.
- [ ] Missing tax residence, service category, rule or evidence blocks official approval/export when blockers flag is ON.
- [ ] `payroll_entries` persist international withholding snapshots and do not depend on live rules after close.
- [ ] Payroll receipt/monthly report shows international withholding separately from Previred and F29 honorarios.
- [ ] Payment obligations separate net pay from withheld component.
- [ ] España/Europe returns `needs_tax_review` in V1, not accidental zero withholding.
- [ ] Reliability signals cover missing rule/evidence/expired evidence/override/payment obligation drift.
- [ ] Docs and architecture explicitly state: Payroll calculates; Finance pays/declares/conciles.

## Verification

- `pnpm pg:doctor`
- `pnpm migrate:create task-905-international-withholding-foundation`
- `pnpm pg:connect:migrate`
- `pnpm vitest run src/lib/payroll/international-withholding`
- `pnpm vitest run src/lib/payroll src/types/hr-contracts.test.ts`
- `pnpm vitest run src/lib/reliability`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm lint`
- `pnpm test`
- `pnpm build`

## Closing Requirements

- Move task to `docs/tasks/complete/`.
- Set `Lifecycle: complete`.
- Sync `docs/tasks/README.md`.
- Update `Handoff.md`, `changelog.md`, architecture docs, functional docs and manuals.
- Document which Americas rules are approved vs `needs_tax_review`.
- Document any country/service pair deferred to external Tax/Legal.
