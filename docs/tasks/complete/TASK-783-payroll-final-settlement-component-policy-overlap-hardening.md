# TASK-783 — Payroll Final Settlement Component Policy + Overlap Hardening

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-010`
- Status real: `Complete`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `none` — `TASK-784` completada el 2026-05-05; ver `docs/tasks/complete/TASK-784-person-legal-profile-identity-documents-foundation.md`.
- Branch: `develop` — instruccion explicita del usuario: mantenerse en `develop`.
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Endurecer el motor de finiquitos Chile para que cada componente declare tratamiento legal/previsional/tributario explicito y para que el calculo reconcilie contra la nomina mensual ya exportada antes de aplicar descuentos. El objetivo es impedir dobles descuentos como Isapre/AFC/AFP en un finiquito de renuncia que solo paga feriado proporcional, bloquear netos negativos sin respaldo y permitir remediacion auditada de settlements ya aprobados.

## Why This Task Exists

El caso runtime de Valentina Hoyos expuso una falla estructural: el settlement aprobado de renuncia 30/04/2026 calculo `proportional_vacation = 121.963`, pero tambien cargo `statutory_deductions = 162.475` por Isapre ya descontada en payroll abril exportado, dejando `net_payable = -40.512`.

La causa raiz no es UI ni un caso puntual. El motor V1 de `TASK-761` separo el finiquito de la nomina mensual, pero todavia permite que componentes de naturaleza distinta se traten como una base mensual generica y que la evidencia de overlap con payroll exportado no sea un gate fuerte. Para que el sistema sea seguro, robusto, resiliente y escalable, el finiquito debe operar con politicas por componente, ledger de solapamiento y readiness fail-closed.

## Goal

- Introducir un policy engine canonico por componente de finiquito.
- Reconciliar cada settlement contra payroll mensual exportado antes de calcular cotizaciones, impuesto o descuentos.
- Aplicar AFC/AFP/salud/IUSC solo sobre componentes realmente imponibles/tributables pendientes y no cubiertos previamente.
- Bloquear aprobacion/emision si el neto es negativo sin deduccion autorizada y evidencia estructurada.
- Reemitir el settlement de Valentina por flujo auditado, cancelando el calculo anterior sin mutarlo silenciosamente.
- Garantizar que un offboarding laboral ejecutado cierre la elegibilidad de payroll mensual posterior sin depender exclusivamente de `member.active`.
- Formalizar la frontera multi-regimen: dependientes Chile usan finiquito laboral; honorarios/contractors/Deel usan cierre contractual/proveedor sin calcular finiquito laboral.

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
- `docs/architecture/GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/tasks/complete/TASK-760-workforce-offboarding-runtime-foundation.md`
- `docs/tasks/complete/TASK-761-payroll-final-settlement-finiquito-engine-chile.md`
- `docs/tasks/complete/TASK-762-finiquito-document-generation-approval-flow.md`
- `docs/tasks/complete/TASK-784-person-legal-profile-identity-documents-foundation.md`

Reglas obligatorias:

- El finiquito sigue siendo un aggregate separado de `payroll_entries`; no se debe convertir en ajuste mensual ni mutar entries exportadas.
- Cada linea de settlement debe declarar `component_code`, `policy_code`, `legal_treatment`, `tax_treatment`, `previsional_treatment`, `basis`, `formula_ref` y `source_ref`.
- `proportional_vacation` no debe pasar por el motor mensual como sueldo ordinario ni disparar AFC/AFP/salud/IUSC por defecto.
- AFC del trabajador se calcula solo sobre remuneracion imponible pendiente en contratos indefinidos; no se descuenta sobre feriado proporcional ni se duplica si el mes ya fue exportado.
- Payroll mensual exportado prevalece como evidencia de lo ya pagado/descontado; el settlement solo calcula delta pendiente.
- Un settlement aprobado no se corrige in-place. La salida canonica es cancelacion/reemision versionada.
- `member.active` no es source of truth suficiente para payroll eligibility post-offboarding; puede servir para acceso/admin, pero payroll debe respetar `WorkRelationshipOffboardingCase.executed` y `last_working_day`.
- Un colaborador con offboarding `executed` y `last_working_day < payroll_period.period_start` no puede entrar al roster mensual aunque siga `members.active = TRUE`.
- El cutoff de elegibilidad de pago aplica a todos los regimenes, pero el calculo de cierre es regimen-specific:
  - Chile dependiente interno: `internal_payroll` + final settlement/finiquito.
  - Honorarios: cierre contractual + ultimo pago/boleta si corresponde + retencion SII honorarios; no finiquito laboral.
  - Deel/EOR/contractor internacional: cierre proveedor/operacional; Greenhouse no calcula payroll legal local salvo motor especifico futuro.
- Si un honorario exhibe señales de subordinacion/dependencia, marcar `legal_review_required` y no resolverlo con un calculo automatico de finiquito.
- La UI debe conversar con esta frontera: no mostrar CTA de `Calcular finiquito` para honorarios/proveedores; debe mostrar `Cerrar contrato`, `Revisar pago pendiente` o `Cierre proveedor` segun regimen/lane.
- No crear `new Pool()`, no leer secrets DB desde codigo nuevo y usar primitives canonicas del repo.
- Access model no cambia salvo que la UI agregue acciones nuevas; si cambia, documentar `routeGroups`, `views`, `entitlements` y `startup policy`.

## Normative Docs

- `.codex/skills/greenhouse-payroll-auditor/SKILL.md`
- `docs/documentation/hr/finiquitos.md`
- `docs/manual-de-uso/hr/finiquitos.md`
- `mockups/finiquito-document-v1/index.html` — mockup aprobado por usuario el 2026-05-04 para documento/cierre de salida. Es contrato visual y de contenido para implementar el nuevo PDF/surface; no es referencia opcional.
- `docs/documentation/hr/periodos-de-nomina.md`
- `docs/manual-de-uso/hr/periodos-de-nomina.md`
- Direccion del Trabajo — renuncia y finiquito: `https://www.dt.gob.cl/portal/1628/w3-article-120673.html`
- Direccion del Trabajo — feriado proporcional Art. 73: `https://www.dt.gob.cl/portal/1628/w3-article-60200.html`
- Direccion del Trabajo — gratificacion no entra a base de feriado proporcional: `https://www.dt.gob.cl/portal/1628/w3-article-60204.html`
- Direccion del Trabajo — acreditar cotizaciones para ratificacion: `https://www.dt.gob.cl/portal/1628/w3-article-60614.html`
- Direccion del Trabajo — actuacion ministro de fe: `https://www.dt.gob.cl/portal/1628/w3-article-60615.html`
- SII — vacaciones pagadas en finiquito no constituyen renta afecta a Impuesto Unico: `https://www.sii.cl/preguntas_frecuentes/declaracion_renta/001_140_5683.htm`
- AFC — cotizaciones Seguro de Cesantia: `https://www.afc.cl/empleadores/pagos-y-dudas-sobre-cotizaciones/cotizaciones-cuanto-y-como-se-paga/`
- Superintendencia de Pensiones — cotizaciones Seguro de Cesantia: `https://www.spensiones.cl/portal/institucional/594/w3-propertyvalue-9902.html`

## Dependencies & Impact

### Depends on

- `src/lib/payroll/final-settlement/types.ts`
- `src/lib/payroll/final-settlement/calculator.ts`
- `src/lib/payroll/final-settlement/store.ts`
- `src/lib/payroll/final-settlement/document-store.ts`
- `src/lib/payroll/calculate-payroll.ts`
- `src/lib/payroll/calculate-chile-deductions.ts`
- `src/lib/payroll/chile-previsional-helpers.ts`
- `src/lib/payroll/postgres-store.ts`
- `src/lib/workforce/offboarding/store.ts`
- `src/app/api/hr/offboarding/cases/[caseId]/final-settlement/**`
- `src/views/greenhouse/hr-core/offboarding/HrOffboardingView.tsx`
- `greenhouse_payroll.final_settlements`
- `greenhouse_payroll.final_settlement_events`
- `greenhouse_payroll.final_settlement_documents`
- `greenhouse_payroll.payroll_periods`
- `greenhouse_payroll.payroll_entries`
- `greenhouse_hr.work_relationship_offboarding_cases`

### Blocks / Impacts

- Corrige el riesgo de finiquitos Chile dependientes con doble descuento previsional.
- Impacta emision documental de finiquito porque endurece el gate previo a render/issue.
- Impacta `/hr/offboarding` al mostrar blockers/evidencia de overlap si la UI requiere surfacing.
- Habilita futuras causales de termino con politicas por componente, sin duplicar logica por causal.
- Reduce riesgo de pagos negativos o descuentos no autorizados.

### Files owned

- `src/lib/payroll/final-settlement/**`
- `src/lib/payroll/calculate-chile-deductions.ts`
- `src/lib/payroll/chile-previsional-helpers.ts`
- `src/lib/workforce/offboarding/store.ts`
- `src/app/api/hr/offboarding/cases/[caseId]/final-settlement/**`
- `src/views/greenhouse/hr-core/offboarding/HrOffboardingView.tsx`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/documentation/hr/finiquitos.md`
- `docs/manual-de-uso/hr/finiquitos.md`
- `changelog.md`
- `Handoff.md`
- `mockups/finiquito-document-v1/index.html` como referencia aprobada; puede moverse a docs/ui o docs/design durante implementacion, pero no se debe perder la trazabilidad.

## Current Repo State

### Already exists

- `TASK-760` creo `WorkRelationshipOffboardingCase` como aggregate canonico de salida.
- `TASK-761` creo `greenhouse_payroll.final_settlements`, events y APIs de calculate/approve/cancel.
- `TASK-762` creo aggregate documental `final_settlement_documents`, hashes, workflow de render/review/approve/issue/sign-or-ratify.
- `TASK-763` expuso el lane UI de offboarding y la tabla de casos.
- Hotfix 2026-05-04 mantiene visibles casos `executed` no cancelados y bloquea nuevas transiciones `internal_payroll -> executed` sin settlement/documento valido.
- Valentina Hoyos tiene caso real de renuncia `30/04/2026`, payroll abril exportado y settlement aprobado con neto negativo por doble descuento de Isapre.

### Gap

- No existe policy engine formal por componente de finiquito.
- `statutory_deductions` puede aplicar logica mensual completa aun cuando el componente pagado no sea remuneracion imponible pendiente.
- `payroll_period_overlap_checked` existe como concepto de readiness, pero no opera como ledger de delta fuerte contra payroll exportado.
- `net_payable < 0` no es blocker duro salvo deducciones autorizadas con evidencia.
- Payroll mensual aun arma roster por `members.active = TRUE` + compensacion aplicable; no existe guard canonico que excluya offboarding `executed` con `last_working_day` anterior al periodo.
- `transitionOffboardingCase(... executed ...)` no cierra de forma explicita la elegibilidad payroll futura ni trunca `compensation_versions.effective_to`.
- Honorarios queda bloqueado para el engine laboral de `final_settlement`, pero la task todavia no documenta/asegura suficientemente su cierre contractual: corte de pagos futuros, ultimo pago/boleta, retencion SII y evidencia operativa.
- La UI/document flow no muestra con suficiente granularidad por que un settlement esta bloqueado o que payroll mensual fue usado como evidencia.
- El PDF actual de finiquito no cumple el contrato aprobado: no muestra logo, no presenta entidad legal con robustez suficiente, no trae RUT trabajador desde snapshot, hardcodea la causal, no diferencia lanes y no expone politica/evidencia por componente.
- No existe remediacion operativa versionada para settlements ya aprobados con calculo incorrecto detectado post-aprobacion.

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

### Slice 1 — Component policy contract

- Agregar tipos canonicos para `FinalSettlementComponentPolicy`, `FinalSettlementLegalTreatment`, `FinalSettlementTaxTreatment`, `FinalSettlementPrevisionalTreatment` y `AuthorizedDeductionEvidence`.
- Definir registry exhaustivo V1 para `pending_salary`, `pending_fixed_allowances`, `monthly_gratification_due`, `proportional_vacation`, `used_or_advanced_vacation_adjustment`, `statutory_deductions`, `authorized_deduction` y `payroll_overlap_adjustment`.
- Persistir o serializar en `breakdown_json` el `policy_code` y la evidencia usada por cada componente.
- Falla cerrada si un componente nuevo no tiene policy explicita.

### Slice 2 — Payroll overlap ledger

- Crear reader/helper canonico que resuelva payroll mensual exportado para el miembro y periodo de termino.
- Construir `PayrollOverlapLedger` con sueldo, haberes, AFP, salud/Isapre, AFC, impuesto, APV y otros descuentos ya cubiertos.
- Marcar como `covered_by_monthly_payroll` cualquier deduccion que ya exista en un `payroll_entry` exportado.
- Exponer en `readiness_json` evidencia concreta: `period_id`, `entry_id`, `period_status`, montos cubiertos y delta pendiente.
- Evitar SQL ad hoc en routes; el calculator consume el helper.

### Slice 3 — Deduction engine hardening

- Reemplazar el calculo de `statutory_deductions` del settlement para que opere sobre bases por componente y no sobre una "nomina mensual cero" que igual cobra Isapre.
- Aplicar AFP/salud/AFC/IUSC solo sobre `pending_salary` y otros componentes marcados como imponibles/tributables y no cubiertos previamente.
- Asegurar que `proportional_vacation` no dispare AFC/AFP/salud/IUSC en V1.
- Separar cotizaciones de trabajador vs costo empleador; el finiquito no debe restar aportes empleador del neto.
- Agregar blocker si la politica de un componente es ambigua o depende de revision legal.

### Slice 4 — Readiness, approval and document guards

- Convertir `net_payable < 0` en blocker si no existen `authorized_deduction` estructuradas con evidencia suficiente.
- Bloquear `approveFinalSettlement` si hay overlap no resuelto, componente sin policy, cotizacion duplicada o PREVIRED/document evidence faltante para emision formal.
- Bloquear render/issue documental si el settlement aprobado proviene de una version marcada como `superseded`, `cancelled`, con `readiness_status!='ready'`, con `document_readiness!='ready'`, con `net_payable < 0` no autorizado o con identidad legal/trabajador incompleta.
- La identidad legal del trabajador debe venir del reader canonico de TASK-784. No resolver RUT/documento personal desde `organizations.tax_id`; ese campo permanece reservado para organizaciones, entidades legales empleadoras, clientes, proveedores empresa y facturacion.
- Separar explicitamente `render_draft` de `issue_formal`: un borrador interno puede existir con watermark/estado bloqueado; emision formal debe fallar cerrado.
- Mantener `needs_review` para advertencias reales, no para blockers.

### Slice 5 — Payroll roster cutoff after executed offboarding

- Endurecer `getApplicableCompensationVersionsForPeriod` / `pgGetApplicableCompensationVersionsForPeriod` para excluir miembros con `work_relationship_offboarding_cases.status='executed'` y `last_working_day < periodStart`.
- Al ejecutar un offboarding de cualquier regimen con pago operativo en Greenhouse, cerrar la elegibilidad futura de pago de forma auditada:
  - setear `compensation_versions.effective_to = last_working_day` para versiones abiertas del miembro cuando sea seguro y transaccional.
  - registrar en evento del caso que se aplico payroll cutoff.
  - no depender de `members.active = FALSE` como unica compuerta.
- Mantener payroll del mes de salida calculable si `last_working_day` cae dentro del periodo; ese mes se resuelve por overlap ledger/finiquito, no por excluir retroactivamente al colaborador.
- Agregar tests para que renuncia 30/04 excluya mayo, pero no rompa abril ni historicos exportados.

### Slice 6 — Honorarios / provider contractual closure boundary

- Formalizar en runtime/readiness que `contract_type='honorarios'` no habilita `final_settlement` laboral ni documento de finiquito.
- Para honorarios ejecutados:
  - cerrar elegibilidad futura de pagos igual que dependientes.
  - si existe pago pendiente dentro del periodo de salida, derivarlo al motor de honorarios/boleta con retencion SII, no al finiquito laboral.
  - exponer estado de cierre contractual y checklist operativo/documental separado.
  - no calcular AFC, AFP, Isapre, Seguro de Cesantia, feriado proporcional ni IUSC dependiente.
- Para `contractor`, `eor` o `payroll_via='deel'`, dejar cierre proveedor/operacional sin payroll legal Greenhouse salvo contrato futuro especifico.
- Agregar guardrail `legal_review_required` si honorarios trae señales de subordinacion/dependencia o si HR intenta forzar finiquito laboral.

### Slice 7 — Offboarding UI evidence and operator recovery

- Hacer que `/hr/offboarding` derive la presentacion desde `ruleLane`, `contractTypeSnapshot`, `payRegimeSnapshot`, `payrollViaSnapshot` y readiness:
  - Dependiente Chile interno: mostrar carril `Finiquito laboral`, acciones `Calcular`, `Aprobar calculo`, `Generar documento`, blockers y overlap ledger.
  - Honorarios: mostrar carril `Cierre contractual`, acciones `Revisar pago pendiente`, `Cerrar elegibilidad de pagos`, `Registrar evidencia`; ocultar/deshabilitar `Calcular finiquito` y explicar que no aplica finiquito laboral.
  - Deel/EOR/contractor internacional: mostrar carril `Cierre proveedor`, acciones operacionales/documentales y mensaje de que el proveedor es owner de payroll legal.
  - Regimen ambiguo o señales de subordinacion: mostrar `Requiere revision legal` y bloquear acciones automaticas de calculo.
- Mostrar en `/hr/offboarding` estado de calculo con blockers accionables: overlap, deduccion duplicada, neto negativo, evidencia previsional/documental.
- Mostrar resumen de `PayrollOverlapLedger` cuando exista payroll mensual exportado.
- Mantener acciones seguras: calcular, aprobar, cancelar/reemitir, renderizar documento solo si los gates lo permiten y solo para lanes que soportan finiquito.
- Copy user-facing debe dejar claro que AFC/AFP/salud se aplican sobre remuneracion imponible pendiente, no sobre todo finiquito; y que honorarios se cierran como contrato/servicio, no como finiquito laboral.
- La tabla/listado debe mostrar una columna o chip de `Lane`/`Tipo de cierre` para evitar que todos los casos parezcan finiquitos laborales.
- Empty states y banners deben hablar de `salida laboral o contractual` en general, y de `finiquito` solo cuando el caso sea dependiente Chile.

### Slice 7b — Approved final settlement document mockup contract

Implementar el documento/PDF y la surface de revision respetando el mockup aprobado en `mockups/finiquito-document-v1/index.html`.

Reglas duras:

- El documento formal debe incluir logo Efeonce/Greenhouse desde assets canonicos (`public/branding/logo-full.png` o primitive PDF equivalente), entidad legal, RUT entidad, domicilio legal, trabajador/a, RUT trabajador/a, cargo, fechas, causal, regimen/lane, numero/document id, version/snapshot hash y timestamp de generacion.
- El header/footer del documento debe seguir el lenguaje aprobado: marca + entidad legal arriba, footer confidencial con entidad/RUT/template/paginacion. No volver al PDF minimalista sin branding.
- El documento dependiente Chile debe titularse `Finiquito de contrato de trabajo` solo para `internal_payroll` + contrato dependiente Chile. Para `honorarios` debe titularse `Cierre contractual de prestacion de servicios`; para Deel/EOR/proveedor debe usar `Cierre proveedor` o equivalente operacional.
- El documento debe mostrar un estado visible y no solo color: `Listo para emitir`, `Bloqueado`, `Borrador interno`, `Cierre contractual`, etc.
- La tabla de lineas debe tener al menos: `Concepto`, `Tratamiento`, `Evidencia`, `Monto`. Cada linea debe mostrar policy/evidencia suficiente (`policy_code`, tratamiento legal/tributario/previsional, overlap/source ref) para explicar por que suma, descuenta o no aplica.
- Los totales deben distinguir `Total haberes`, `Total descuentos / retenciones` y `Liquido / pago neto`; un liquido negativo no puede verse como emitible.
- El caso bloqueado tipo Valentina debe mostrar causa accionable: descuento duplicado/overlap no resuelto/neto negativo, y CTA de emision deshabilitado. El siguiente paso visible es cancelar/reemitir o solicitar revision, no emitir.
- El caso honorarios tipo Luis no debe mostrar `Calcular finiquito`; debe mostrar `Cerrar contrato`, `Revisar pago pendiente`, `Registrar evidencia` y/o `Cerrar elegibilidad`, con retencion SII si hay pago pendiente.
- La surface de revision debe mostrar readiness lateral o seccion equivalente con identidad, calculo, policy por componente y overlap. Los blockers criticos no pueden quedar escondidos dentro del PDF.
- Microinteracciones: los cambios de estado deben tener feedback persistente inline; errores criticos no son toast-only; el CTA primario se deshabilita con causa visible; estados no dependen solo del color; debe existir path keyboard/focus visible.
- Accessibility/UX: labels claros, copy operacional, sin placeholder como label, no hover-only para acciones importantes, contraste AA y soporte de reduced motion si se implementa motion.
- Cualquier divergencia del mockup aprobado debe quedar documentada en `Handoff.md` con rationale y aprobacion humana antes de implementarse.

### Slice 8 — Valentina remediation

- Cancelar el settlement aprobado incorrecto de Valentina mediante API/command canonico de cancelacion, con reason auditable.
- Recalcular una nueva version con el motor corregido.
- Verificar que abril exportado impide doble Isapre/AFC/AFP y que el neto preliminar queda positivo salvo deducciones autorizadas adicionales.
- Verificar que Valentina no entra al roster de payroll mayo 2026 despues del cutoff, aunque `member.active` se mantenga temporalmente para self-service/documentos.
- Documentar antes/despues en `Handoff.md` sin exponer datos sensibles innecesarios.

### Slice 9 — Tests and docs

- Tests unitarios para policy exhaustiveness, overlap ledger, feriado proporcional sin IUSC/AFC/AFP/salud y deducciones solo sobre remuneracion pendiente.
- Tests de approval/document guards para neto negativo, duplicidad de cotizaciones y settlement superseded/cancelled.
- Regression test Valentina-like: renuncia 30/04, payroll abril exportado, solo feriado proporcional, neto positivo.
- Regression test roster cutoff: offboarding ejecutado con `last_working_day=2026-04-30` no aparece en payroll mayo 2026; sigue preservando entries historicas/exportadas de abril.
- Regression test Luis-like: honorarios ejecutado no habilita final settlement laboral, no calcula feriado/cotizaciones dependientes y queda excluido de pagos futuros; si hay pago pendiente, se deriva a honorarios/retencion SII.
- UI tests para lanes:
  - Valentina/dependiente muestra `Finiquito laboral` y CTA de calculo.
  - Luis/honorarios muestra `Cierre contractual`, no muestra CTA de finiquito y ofrece revisar pago pendiente/evidencia.
  - Deel/EOR muestra `Cierre proveedor`, no promete calculo Greenhouse.
- Actualizar arquitectura, documentacion funcional, manual de uso, changelog y Handoff.

## Out of Scope

- Implementar nuevas causales de termino distintas de `resignation`.
- Implementar indemnizacion por años de servicio, sustitutiva de aviso previo o recargos por despido.
- Crear payment orders o marcar finiquitos como pagados.
- Cambiar formulas de payroll mensual exportado salvo que un bug de base sea descubierto y documentado como blocker.
- Resolver firma electronica full o integracion Zapsign/EPIC-001.
- Recalcular masivamente finiquitos historicos sin una lista de casos y aprobacion operativa.

## Detailed Spec

### Component policy V1

Cada componente debe resolverse contra una policy declarativa:

```ts
type FinalSettlementComponentPolicy = {
  componentCode: FinalSettlementComponentCode
  policyCode: string
  legalTreatment: 'remuneration' | 'legal_indemnity' | 'authorized_deduction' | 'employer_cost' | 'informational'
  taxTreatment: 'taxable_monthly' | 'non_income' | 'not_applicable' | 'needs_review'
  previsionalTreatment: 'contribution_base' | 'not_contribution_base' | 'employer_only' | 'needs_review'
  overlapBehavior: 'deduct_delta_only' | 'never_duplicate_monthly' | 'not_applicable'
  requiresSourceRef: boolean
  blocksApprovalWhenAmbiguous: boolean
}
```

Policy inicial esperada:

- `pending_salary`: `remuneration`, `taxable_monthly`, `contribution_base`, `deduct_delta_only`.
- `pending_fixed_allowances`: resolver subcomponentes imponibles/no imponibles; si no hay clasificacion, `needs_review`.
- `monthly_gratification_due`: remuneracion si existe devengo pendiente; no usar como base de feriado proporcional.
- `proportional_vacation`: `legal_indemnity`, `non_income`, `not_contribution_base`, `never_duplicate_monthly`.
- `authorized_deduction`: exige `source_ref`, actor, reason, monto, fecha y evidencia.
- `payroll_overlap_adjustment`: informativo/ajuste tecnico para explicar montos ya cubiertos; no puede ocultar descuentos sin evidencia.

### Payroll overlap ledger V1

El ledger debe responder:

- Existe payroll period del mes de `last_working_day`.
- Estado del periodo: `draft`, `calculated`, `approved`, `exported`, `reopened`.
- Existe entry del miembro para ese periodo.
- Que remuneraciones y descuentos ya se materializaron.
- Que componentes del settlement quedan pendientes como delta.

Regla dura:

- Si periodo mensual esta `exported`, no duplicar deducciones trabajador ya materializadas.
- Si periodo mensual no existe o esta incompleto, readiness debe declarar si el settlement calcula los dias pendientes o bloquea por falta de fuente.

### Payroll eligibility cutoff V1

La elegibilidad mensual debe derivarse de la relacion laboral y no solo de `members.active`:

- Para periodos con `periodEnd <= last_working_day`, el colaborador puede seguir en nomina si tiene compensacion aplicable.
- Para periodos con `periodStart > last_working_day` y offboarding `executed`, el colaborador queda excluido.
- Para periodos que contienen `last_working_day`, el payroll mensual puede calcular la porcion ordinaria si aun no fue exportada; el finiquito usa overlap ledger para no duplicar.
- `members.active = TRUE` puede permanecer por necesidades de acceso a documentos/self-service, pero no debe mantener payroll activo despues del termino laboral.
- `compensation_versions.effective_to` debe cerrarse cuando la transicion a `executed` es valida y el cierre no rompe historicos. Si hay conflicto con periodos exportados/reabiertos, el reader defensivo de payroll sigue excluyendo por offboarding ejecutado.

### Contractual closure V1 for honorarios/providers

El cierre de honorarios/proveedores no debe simular una relacion laboral:

- `honorarios`:
  - no `final_settlement` laboral.
  - no documento de finiquito laboral.
  - no feriado proporcional.
  - no AFC/AFP/Isapre/Seguro de Cesantia/IUSC dependiente.
  - si hay monto pendiente por servicios dentro del periodo, calcularlo como honorarios con retencion SII vigente.
  - cerrar elegibilidad futura de pagos con `effective_to = last_working_day` y guard defensivo por offboarding ejecutado.
- `contractor` / `eor` / `payroll_via='deel'`:
  - Greenhouse registra cierre operacional/proveedor.
  - no calcula payroll legal local ni finiquito laboral Chile.
  - pagos finales dependen del proveedor/contrato y quedan fuera del engine laboral V1.
- Cualquier intento de forzar un honorario al lane laboral debe bloquearse o pedir revision legal, no degradarse a calculo automatico.

### UI lane contract V1

La UI no debe usar un lenguaje unico de `finiquito` para todos los casos de offboarding. Debe proyectar el lane operativo:

- `internal_payroll` + Chile dependiente:
  - etiqueta primaria: `Finiquito laboral`.
  - CTA permitido: `Calcular finiquito`.
  - evidencia visible: overlap payroll mensual, readiness legal/previsional, documento de finiquito.
- `honorarios_contractual_closure` o equivalente:
  - etiqueta primaria: `Cierre contractual`.
  - CTA permitido: `Revisar pago pendiente` / `Registrar evidencia` / `Cerrar elegibilidad`.
  - CTA prohibido: `Calcular finiquito`.
  - copy: "No aplica finiquito laboral; si hay pago pendiente se procesa como honorarios con retencion SII."
- `provider_closure` / `deel_provider_closure`:
  - etiqueta primaria: `Cierre proveedor`.
  - CTA permitido: seguimiento operacional/documental.
  - copy: "El proveedor gestiona el payroll legal; Greenhouse registra el cierre operativo."
- `legal_review_required`:
  - etiqueta primaria: `Revision legal requerida`.
  - acciones automaticas de calculo bloqueadas.
  - copy orientado a regularizar clasificacion antes de cerrar pagos/documentos.

### Valentina expected behavior

Con los datos observados al crear esta task:

- `separation_type = resignation`
- `effective_date = 2026-04-30`
- `last_working_day = 2026-04-30`
- payroll abril 2026 exportado
- `proportional_vacation = 121.963`
- Isapre abril ya materializada en payroll mensual

Resultado esperado preliminar:

- AFC adicional: `$0` salvo remuneracion imponible pendiente no pagada.
- AFP adicional: `$0` salvo remuneracion imponible pendiente no pagada.
- Salud/Isapre adicional: `$0` salvo remuneracion imponible pendiente no pagada.
- IUSC sobre feriado proporcional: `$0`.
- Neto preliminar: positivo y cercano a `$121.963`, salvo deducciones autorizadas adicionales con evidencia.
- Payroll mayo 2026: no debe incluir a Valentina si el offboarding queda `executed` con `last_working_day=2026-04-30`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Cada componente de finiquito V1 tiene policy explicita y serializada en `breakdown_json`/`explanation_json`.
- [x] El calculator falla cerrado si aparece un componente sin policy o con tratamiento legal/previsional ambiguo.
- [x] Existe `PayrollOverlapLedger` reusable y testeado que lee payroll mensual exportado antes de calcular descuentos del settlement.
- [x] Finiquito de renuncia con solo feriado proporcional no descuenta AFC/AFP/salud/IUSC.
- [x] Si hay remuneracion imponible pendiente, AFC trabajador se descuenta solo sobre ese delta y solo cuando el contrato lo exige.
- [x] El sistema no duplica Isapre/AFP/AFC/IUSC ya materializados en un payroll mensual exportado.
- [x] Payroll mensual excluye miembros con offboarding `executed` y `last_working_day < periodStart`, aunque `members.active` siga `TRUE`.
- [x] La transicion `offboarding_case -> executed` cierra elegibilidad payroll futura de forma auditada y no rompe historicos/exportados.
- [x] Honorarios ejecutado no habilita `final_settlement` laboral ni documento de finiquito.
- [x] Honorarios con pago pendiente se deriva al tratamiento honorarios/retencion SII, sin AFC/AFP/salud/cesantia/feriado proporcional/IUSC dependiente.
- [x] Contractor/EOR/Deel quedan en cierre proveedor/operacional sin calculo legal local automatico.
- [x] `net_payable < 0` bloquea aprobacion/emision salvo deducciones autorizadas con evidencia estructurada.
- [x] Document render/issue falla cerrado para settlements cancelados/superseded/bloqueados, `readiness_status!='ready'`, identidad legal/trabajador incompleta o liquido negativo no autorizado.
- [x] El documento/PDF implementado respeta el mockup aprobado `mockups/finiquito-document-v1/index.html`: logo, entidad legal, RUTs, header/footer, estado visible, tabla Concepto/Tratamiento/Evidencia/Monto, totales y snapshot hash.
- [x] El flujo distingue borrador interno de emision formal; borradores bloqueados llevan estado/watermark/copia clara y no habilitan emision.
- [x] El caso Valentina-like muestra bloqueo accionable y CTA de emision deshabilitado cuando hay descuento duplicado, overlap no resuelto o liquido negativo.
- [x] El caso Luis-like usa documento/surface de `Cierre contractual de prestacion de servicios`, no `Finiquito de contrato de trabajo`.
- [x] La UI de `/hr/offboarding` muestra blockers/evidencia de overlap de forma accionable.
- [x] La UI distingue `Finiquito laboral`, `Cierre contractual`, `Cierre proveedor` y `Revision legal requerida` segun regimen/lane.
- [x] Para honorarios/proveedores la UI no muestra ni permite `Calcular finiquito`; ofrece acciones de cierre contractual/proveedor y pago pendiente cuando aplique.
- [x] El caso Valentina queda remediado por cancelacion/reemision auditada y el nuevo calculo no duplica cotizaciones de abril.
- [x] Docs vivas quedan sincronizadas.

## Verification

- `pnpm pg:doctor`
- `pnpm exec vitest run src/lib/payroll/final-settlement src/lib/workforce/offboarding src/views/greenhouse/hr-core/offboarding`
- `pnpm exec eslint src/lib/payroll/final-settlement src/lib/workforce/offboarding src/views/greenhouse/hr-core/offboarding`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm test`
- `pnpm build`
- `pnpm design:lint` si cambia UI visible
- Verificacion visual/manual contra `mockups/finiquito-document-v1/index.html` en los tres escenarios aprobados: finiquito laboral listo, Valentina bloqueado, Luis honorarios/cierre contractual
- Verificacion runtime de Valentina via API canonica de cancelacion/recalculo y lectura posterior del settlement

## Closing Protocol

- [x] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [x] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [x] `docs/tasks/README.md` quedo sincronizado con el cierre
- [x] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [x] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [x] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [x] `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` documenta policy engine, overlap ledger y gates nuevos
- [x] `docs/documentation/hr/finiquitos.md` y `docs/manual-de-uso/hr/finiquitos.md` explican cuando se descuentan AFC/AFP/salud, como opera el cutoff de payroll mensual, como se diferencia honorarios/cierre contractual y como operar remediaciones
- [x] La remediacion de Valentina queda registrada como evidencia operacional, no como mutacion silenciosa

## Completion Evidence

- Runtime Valentina remediado por cancelacion/reemision versionada: settlement v1 negativo cancelado, nueva v2 aprobada con gross `121963`, deductions `0`, net `121963`.
- Render formal de Valentina queda fail-closed por falta de RUT/documento verificado del trabajador (`worker_legal_identity_verified`), sin inventar identidad legal.
- PDF validado contra contrato visual del mockup aprobado mediante test de landmarks: logo/header, entidad legal, estado, tabla `Concepto / Tratamiento / Evidencia / Monto`, totales, snapshot hash y tratamientos por componente.
- Validaciones ejecutadas: `pnpm exec eslint src/lib/payroll/final-settlement src/lib/workforce/offboarding src/views/greenhouse/hr-core/offboarding`, `pnpm exec tsc --noEmit --pretty false`, `pnpm exec vitest run src/lib/payroll/final-settlement src/lib/workforce/offboarding src/views/greenhouse/hr-core/offboarding --reporter=dot`, `pnpm design:lint`, `pnpm pg:doctor`, `pnpm build`.

## Follow-ups

- Nuevas causales Chile (`needs_company`, `mutual_agreement`, `fixed_term_end`, despido disciplinario) sobre el mismo policy engine.
- Payment Order integration para pagar finiquitos aprobados sin mezclar calculo con tesoreria.
- Reliability signal dedicado a `final_settlement.negative_net_blocked` y `final_settlement.monthly_overlap_drift` si el primer corte no los incluye.
- Soporte de convenios de pago/cuotas si Legal/HR lo requiere.

## Delta 2026-05-04

Task creada como follow-up P0 del incidente Valentina Hoyos detectado despues de `TASK-761`/`TASK-762`/`TASK-763`: settlement de renuncia aprobado con neto negativo por doble descuento de Isapre de abril exportado. Decision ratificada con `greenhouse-payroll-auditor`: resolver causa raiz mediante policy engine por componente, overlap ledger, gates fail-closed y remediacion auditada.
