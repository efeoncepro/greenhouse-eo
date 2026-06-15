# People, Workforce, Payroll y Contractors end-to-end

> **Tipo de documento:** Documentacion funcional
> **Version:** 1.0
> **Creado:** 2026-06-15 por Codex
> **Ultima actualizacion:** 2026-06-15
> **Modulo:** HR / Workforce / Payroll / Contractors
> **Rutas principales:** `/hr/workforce/activation`, `/hr/payroll`, `/hr/contractors`, `/my/contractor`, `/finance/contractor-payments`, `/finance/payment-orders`
> **Arquitectura relacionada:** `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`, `docs/architecture/GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_V1.md`, `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md`

## Para que sirve

Este documento explica como se conectan los dominios People, Workforce, HR, Payroll y Contractors en Greenhouse, desde el alta de una persona hasta la nomina mensual, el pago de contractors, la salida laboral y el puente con Finance.

El objetivo es que una persona, operador o agente como Nexa pueda responder preguntas operativas sin mezclar conceptos que en el runtime estan separados:

- `members` y People 360 describen identidad operativa y relacion laboral visible.
- Workforce Activation valida que una persona este lista para operar.
- Payroll calcula y cierra periodos de nomina para trabajadores internos y regimenes soportados.
- Contractors viven en `contractor_engagements`, work submissions y payables; no son nomina dependiente.
- Finance paga obligaciones y ordenes de pago; Payroll/Contractors generan obligaciones, pero no sustituyen Banco ni conciliacion.

## Evidencia revisada

Este documento fue reconciliado contra codigo y DB read-only el 2026-06-15. Se revisaron, entre otros:

- APIs `src/app/api/hr/payroll/**`, `src/app/api/admin/workforce/**`, `src/app/api/hr/contractors/**`, `src/app/api/finance/contractor-payables/**`.
- Runtime payroll en `src/lib/payroll/**`: calculo, readiness, cierre, compliance exports, recibos, reliquidacion, final settlement y materializacion de pagos.
- Runtime workforce en `src/lib/workforce/**`: activation readiness, intake completion, onboarding/offboarding y transiciones de relacion.
- Runtime contractors en `src/lib/contractor-engagements/**`: engagement store, state machine, risk classification, work submissions, payables, monthly run, remittance y transition-from-employee.
- DB schemas `greenhouse_payroll`, `greenhouse_hr`, `greenhouse_core` y `greenhouse_serving`.

Hallazgos de datos actuales, sin PII:

- Hay 4 periodos de payroll, todos en estado `exported`.
- Hay 21 entradas de payroll historicas, con combinaciones de Chile dependiente, honorarios, Deel/internacional y contractor/international.
- Hay 15 compensation versions, 3 payroll adjustments, 23 payroll receipts, 4 export packages y 13 compliance export artifacts.
- Hay 2 final settlements, 16 documentos de final settlement y casos de offboarding en lanes `internal_payroll`, `external_payroll`, `non_payroll` e `identity_only`.
- Hay 1 contractor engagement activo, 3 work submissions y 1 contractor payable en estado `payment_order_created`, ya enlazado a `payment_obligation`, `payment_order` y payment profile.
- Hay 176 members; `workforce_intake_status` muestra `pending_intake`, `in_review` y `completed`.
- `person_legal_entity_relationships` ya existe como raiz candidata para WorkRelationship, pero la arquitectura Workforce Foundation sigue marcada como target/draft donde aplica.
- `greenhouse_serving.member_capacity_economics` existe como serving layer; no debe confundirse con un modelo futuro completo de costos cargados por member si la UI/operacion aun no lo expone end-to-end.

## Mapa funcional

| Dominio | Runtime principal | Que responde | Que no debe absorber |
|---|---|---|---|
| People / HR Core | `members`, People 360, jerarquia, leave, goals, evaluations | Quien es la persona, rol, supervisor, estado operativo, permisos, ficha visible | Calculo de nomina, pago bancario o obligacion financiera |
| Workforce Activation | `members.workforce_intake_status`, readiness lanes, onboarding case | Si un colaborador puede completar intake y quedar habilitado | Saltarse compensation, legal profile o payment profile incompletos |
| Payroll | `payroll_periods`, `payroll_entries`, `compensation_versions`, receipts, exports | Calculo mensual, aprobacion, cierre, recibos, compliance Chile, reliquidacion | Pagar directamente en Banco, conciliar cartolas o tratar contractors como dependientes |
| Offboarding / Finiquito | `work_relationship_offboarding_cases`, `final_settlements`, documents | Salida laboral y final settlement separado de nomina mensual | Ajustar la salida como gasto suelto o payroll adjustment comun |
| Contractors HR | `contractor_engagements`, work submissions, invoice assets | Contratacion, riesgo, evidencia, entrega, aprobacion HR | Nomina dependiente, finiquito, pago bancario |
| Contractor Payables / Finance | `contractor_payables`, `payment_obligations`, `payment_orders` | Readiness financiera, corrida mensual, orden de pago, estado pagado | Aprobar entregas HR, modificar legal relationship o saltarse ordenes |

## Flujo end-to-end de un colaborador interno

1. Una identidad entra al sistema por provisioning, creacion operativa o flujo autorizado.
2. Greenhouse representa a la persona en `members` y, cuando aplica, en relaciones legales/persona-entidad.
3. Workforce Activation evalua readiness por lanes:
   - identidad/acceso;
   - relacion laboral;
   - employment;
   - rol y cargo;
   - compensation;
   - perfil legal;
   - payment profile;
   - integraciones operativas;
   - onboarding;
   - contractor engagement si el caso pertenece a contractor.
4. Un operador resuelve blockers y completa la ficha. El cierre de intake puede ser idempotente si ya estaba completo.
5. Payroll toma miembros compensables y compensation versions vigentes dentro del periodo.
6. Payroll calcula el periodo, aplica reglas por regimen, genera entries y bloquea aprobacion si la readiness tiene blockers.
7. Un operador aprueba y cierra el periodo. El cierre produce exports/reportes/recibos y deja el periodo en estado exportado.
8. Finance gestiona obligaciones/pagos, ordenes y conciliacion segun el puente correspondiente. El pago bancario no reabre ni recalcula por si solo la nomina.

## Flujo end-to-end de Payroll

Payroll tiene un ciclo controlado por periodo:

1. **Crear periodo:** define anio, mes imputable, UF/tax table cuando aplica y estado inicial.
2. **Readiness:** valida que existan miembros compensables y datos obligatorios. Puede bloquear por falta de UF, tax table, UTM, KPI, attendance, compensation, onboarding abierto o mismatch de regimen.
3. **Calcular:** `calculatePayroll` compone compensation, bonus config, KPI, attendance, participation window, ajustes y reglas por contrato.
4. **Revisar entradas:** el operador revisa gross, deductions, net, attendance, KPI, bonus y ajustes.
5. **Aprobar:** solo si el periodo esta `calculated`, hay entries, bonus limits validan y readiness permite approval.
6. **Cerrar/exportar:** `closePayrollPeriod` solo cierra periodos aprobados, es idempotente si ya estaban exportados y dispara outputs/notifications donde aplica.
7. **Recibos y reportes:** PDFs, Excel, CSV y compliance exports son proyecciones del payroll cerrado, no source of truth independiente.

## Regimenes y fronteras de calculo

Payroll no aplica una sola formula a todos. La clasificacion del worker determina el calculo:

| Regimen | Campos esperados | Que calcula Greenhouse | Que no aplica |
|---|---|---|---|
| Chile dependiente (`indefinido`, `plazo_fijo`) | `pay_regime=chile`, `payroll_via=internal` | Haberes, descuentos previsionales, IUSC, cesantia, salud, Previred/LRE cuando aplica | Reglas de honorarios o Deel |
| Honorarios Chile | `contract_type=honorarios`, `pay_regime=chile`, `payroll_via=internal` | Bruto, retencion SII vigente del snapshot, neto | AFP, salud, cesantia, IUSC dependiente, finiquito |
| Deel / EOR / contractor internacional | `pay_regime=international`, `payroll_via=deel` u operador externo | Monto operativo y snapshot para seguimiento interno | Descuentos legales Chile, Previred, pago directo si el proveedor lo ejecuta |
| Internacional interno | `contract_type=international_internal`, `pay_regime=international` | Compensacion interna controlada segun policy | Deducciones Chile por defecto |
| Contractor engagement | `contractor_engagements` y `contractor_payables` | Entregas, payable, withholding si policy lo define, puente a Finance | Nomina dependiente, finiquito, payroll entries dependientes |

Regla critica: no se deben aplicar descuentos dependientes Chile a honorarios, contractors o internacional. El readiness tiene guardrails de `payroll_regime_mismatch` para detectar combinaciones que producirian calculos incorrectos.

## Que hace automatico Greenhouse

Greenhouse automatiza piezas deterministicas cuando tiene datos suficientes:

- lee compensation versions vigentes del periodo;
- determina readiness de payroll y activation;
- calcula entries segun clasificacion, regime y snapshots;
- aplica participation window y attendance/KPI cuando corresponde;
- genera recibos, reportes y compliance artifacts desde el periodo cerrado;
- mantiene eventos/auditoria para contractor engagements, payables y payroll adjustments;
- crea obligaciones financieras desde contractor payables cuando pasan a `ready_for_finance`;
- arma corridas mensuales de contractors agrupando obligaciones elegibles;
- crea payment orders `pending_approval` desde la corrida mensual de contractors;
- evita aprobar/cerrar cuando faltan datos criticos.

## Que hace el operador

El operador sigue siendo responsable de decisiones de negocio y datos que requieren criterio:

- completar ficha laboral y resolver blockers de Workforce Activation;
- revisar compensation, legal profile y payment profile;
- decidir overrides permitidos con motivo auditable;
- revisar y aprobar payroll calculado;
- cerrar/exportar payroll;
- descargar/reportar Previred/LRE y subirlos a sistemas externos cuando corresponda;
- revisar submissions de contractors y aprobar/observar/rechazar;
- marcar contractor payable listo para Finance o corregir readiness;
- aprobar, programar, enviar, marcar pagada y conciliar payment orders desde Finance;
- revisar offboarding/finiquito cuando la salida es laboral.

## Workforce Activation

Workforce Activation es el control previo a operar una persona como colaborador. La UI central es `/hr/workforce/activation`.

La readiness se expresa en lanes. Cada lane puede estar `ready`, `warning` o `blocked`, con owner y accion sugerida. El cierre de intake no debe hacerse por SQL ni saltando la UI/API gobernada.

Cuando el guard esta activo, `complete-intake` bloquea si la persona no esta ready. Un override requiere capability especifica y motivo suficiente. El sistema actualiza `members.workforce_intake_status`, asegura onboarding case y publica evento con readiness snapshot.

## Contractors

Contractors no son una variante liviana de payroll. Tienen su propio aggregate:

1. HR crea o resuelve el contractor engagement.
2. El sistema calcula riesgo de clasificacion y puede bloquear activacion si el riesgo es incompatible.
3. El contractor sube soportes, boleta/factura y evidencia desde self-service.
4. HR revisa work submissions y las aprueba, observa, rechaza, disputa o cancela.
5. Una submission aprobada puede originar contractor payable.
6. El payable calcula gross, withholding, net, currency, tax owner, payment route y due date.
7. Finance marca el payable `ready_for_finance` cuando readiness permite.
8. Greenhouse crea una `payment_obligation` de tipo provider/contractor segun el puente.
9. La corrida mensual prepara payment orders pendientes de aprobacion. No aprueba ni paga automaticamente.
10. Finance opera la orden de pago y el banco/conciliacion.
11. El remittance advice se emite cuando corresponde.

Regla critica: aprobar una entrega HR no significa pagar. Crear payable tampoco significa pago. Crear payment order tampoco significa conciliacion bancaria.

## Employee to contractor

Si una persona sale como empleado y luego queda como contractor, no se debe editar manualmente el member como si fuera el mismo contrato con otro label.

El camino gobernado es una transicion de relacion:

- se parte desde un offboarding ejecutado o una relacion compatible;
- se crea/activa un contractor engagement;
- se mantiene trazabilidad entre relacion anterior y nueva;
- payroll dependiente, finiquito y contractor payable quedan separados.

Esto evita mezclar antiguedad, descuentos, final settlement, payment route y tax owner.

## Offboarding y finiquito

Offboarding laboral usa `work_relationship_offboarding_cases`. Para Chile dependiente, el finiquito vive en `final_settlements` y documentos asociados.

Finiquito no es:

- un payroll adjustment comun;
- un contractor closure;
- una orden de pago aislada;
- una baja de acceso SCIM.

Puede impactar Finance, pero el calculo y la aprobacion legal viven en HR/Payroll final settlement.

## Relacion con Finance

Payroll y Contractors producen obligaciones o evidencia de pago; Finance controla caja, Banco, ordenes y conciliacion.

- El sueldo de un periodo N normalmente se paga en los primeros dias del mes N+1. El movimiento bancario N+1 no debe crear un gasto nuevo si la obligacion payroll ya existe para N.
- Contractor payable `ready_for_finance` puede crear obligacion financiera.
- Corrida mensual de contractors crea payment orders en estado pendiente; Finanzas decide aprobacion/envio/pago.
- Conciliacion bancaria confirma el movimiento real contra cartola; marcar pagado no equivale a conciliado.

## Preguntas que Nexa debe poder responder con este paquete

- Como habilito un colaborador en Workforce Activation?
- Que bloquea completar la ficha de un colaborador?
- Como se crea y calcula un periodo de nomina?
- Que hace automatico Greenhouse al calcular payroll?
- Que debe revisar un operador antes de aprobar payroll?
- Como se tratan honorarios y por que no tienen AFP/salud/cesantia?
- Que diferencia hay entre trabajador interno, Deel/EOR, internacional interno y contractor?
- Como se sube y aprueba una entrega de contractor?
- Aprobar una entrega de contractor paga automaticamente?
- Como llega un contractor payable a Finance?
- Como se maneja employee to contractor?
- Cuando corresponde finiquito y cuando no?
- Que parte hace Payroll y que parte hace Finance?

## Anti-patrones

- Cambiar `contract_type` de un member para forzar un calculo.
- Tratar honorarios como dependiente Chile.
- Meter un contractor al payroll dependiente para "pagar mas rapido".
- Crear una orden de pago manual duplicada si ya existe contractor payable u obligacion.
- Usar payroll adjustment para resolver un finiquito laboral.
- Asumir que un periodo exportado se puede editar sin reliquidacion/reopen audit.
- Asumir que un payment order pagado esta conciliado.
- Usar datos sensibles de payment profiles en respuestas de Nexa.

## Documentacion relacionada

- `docs/documentation/hr/workforce-activation-readiness.md`
- `docs/manual-de-uso/hr/habilitar-colaborador-workforce.md`
- `docs/manual-de-uso/hr/completar-ficha-laboral.md`
- `docs/documentation/hr/periodos-de-nomina.md`
- `docs/manual-de-uso/hr/periodos-de-nomina.md`
- `docs/documentation/hr/recibos-y-reporte-mensual.md`
- `docs/manual-de-uso/hr/descargar-y-reconciliar-nomina.md`
- `docs/documentation/hr/payroll-compliance-exports-chile.md`
- `docs/manual-de-uso/hr/payroll-compliance-exports-chile.md`
- `docs/documentation/hr/reliquidacion-de-nomina.md`
- `docs/documentation/hr/finiquitos.md`
- `docs/manual-de-uso/hr/finiquitos.md`
- `docs/documentation/hr/contratistas-self-service.md`
- `docs/documentation/hr/contratistas-engagement-ciclo-de-vida.md`
- `docs/documentation/hr/contratistas-onboarding.md`
- `docs/manual-de-uso/hr/contratistas.md`
- `docs/manual-de-uso/finance/pagos-a-contractors.md`
- `docs/documentation/finance/pagos-a-contractors.md`
- `docs/documentation/finance/operacion-finance-end-to-end.md`
