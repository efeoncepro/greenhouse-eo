# Chile Payroll Law Reference

This reference summarizes the Chile payroll/legal concepts most relevant for Greenhouse audits. Always verify current rates, caps, tax tables, and legal interpretation against official sources before calculating or approving payroll.

## Primary Sources To Check

- Direccion del Trabajo, gratificacion legal: https://www.dt.gob.cl/portal/1626/w3-article-99034.html
- Direccion del Trabajo, contrato individual/subordinacion: https://www.dt.gob.cl/portal/1626/w3-article-100172.html
- Direccion del Trabajo, colacion/movilizacion: https://www.dt.gob.cl/portal/1628/w3-article-60235.html
- Direccion del Trabajo, vacaciones: https://www.dt.gob.cl/portal/1628/w3-article-60183.html
- Direccion del Trabajo, derecho a desconexion: https://www.dt.gob.cl/portal/1628/w3-article-118665.html
- SII, Impuesto Unico de Segunda Categoria 2026: https://www.sii.cl/valores_y_fechas/impuesto_2da_categoria/impuesto2026.htm
- SII, boletas de honorarios 2026: https://www.sii.cl/destacados/boletas_honorarios/index.html
- Superintendencia de Pensiones, cotizantes seguro de cesantia: https://www.spensiones.cl/portal/institucional/594/w3-propertyvalue-9902.html
- Superintendencia de Pensiones, cotizacion previsional obligatoria: https://www.spensiones.cl/portal/institucional/594/w3-propertyvalue-9908.html
- AFC, financiamiento seguro de cesantia: https://www.afc.cl/que-es-el-seguro-de-cesantia/como-se-financia/
- PREVIRED indicadores previsionales: https://www.previred.com/

## Worker Classification

Chile dependent employment exists when services are personal, remunerated, and performed under subordination/dependency. The label chosen by the parties is not decisive if the factual relationship behaves like employment.

Audit implications:

- `indefinido` and `plazo_fijo` are Chile dependent payroll.
- `honorarios` is a civil/service arrangement, not a dependent payroll regime.
- Remote/telework is a work modality, not a separate payroll regime.
- If a contractor has schedule control, hierarchy, mandatory attendance, tools/process control, or exclusivity similar to employment, escalate as classification risk.

## Monthly Chile Dependent Payroll Formula

Typical monthly flow:

1. Determine imponible remuneration: base salary, fixed taxable bonuses, variable taxable bonuses, and legal/conventional gratificacion when taxable.
2. Exclude reasonable non-imponible allowances: colacion, movilizacion, reimbursements/viaticos only if they compensate real work expenses and are reasonable.
3. Apply caps where legally required: AFP/pension and health cap in UF, accident insurance cap in UF, cesantia cap in UF.
4. Calculate worker deductions: AFP mandatory 10 percent plus AFP commission, health 7 percent or Isapre plan handling, Seguro de Cesantia worker share only when applicable, APV if configured, and Impuesto Unico Segunda Categoria.
5. Calculate employer costs: SIS/employer social security components, Seguro de Cesantia employer share by contract type, mutual/accident insurance rate.
6. Net pay: taxable remuneration + non-imponible allowances - worker deductions - tax.

## Gratificacion Legal

Direccion del Trabajo explains two legal systems: article 47 profit-sharing and article 50 payment of 25 percent of remunerations with a cap of 4.75 monthly minimum wages annually.

For a monthly article 50 advance, the operational approximation is:

```text
monthly_gratificacion = min(monthly_eligible_remuneration * 0.25, IMM * 4.75 / 12)
```

Audit caveats:

- The annual cap uses the minimum wage at December 31 of the commercial year.
- Annual true-up may be needed if monthly advances were used.
- Gratificacion is remuneration and follows the contribution/tax treatment of remuneration.
- For partial-year service, legal treatment can require proportional annual analysis.

## AFP And Pension Contributions

For Chile dependent workers:

- Mandatory worker pension contribution is 10 percent of imponible remuneration subject to cap.
- AFP commission is additional and varies by AFP.
- Greenhouse should preserve the split between cotizacion and commission when available.
- The taxable base for IUSC subtracts eligible previsional deductions, respecting legal caps.

Audit questions:

- Is the AFP rate from compensation stale, or resolved from PREVIRED for the period?
- Is the total rate split into 10 percent contribution plus commission?
- Was the legal cap applied before calculating amount?

## Health

For Chile dependent workers:

- Fonasa is 7 percent of imponible remuneration, subject to legal cap.
- Isapre plans may be expressed in UF and may exceed the mandatory 7 percent.
- Greenhouse should split Isapre into obligatory amount and voluntary/excess amount.
- UF must be the historical value for the payroll period/cut date required by the business rule.

Audit questions:

- Was UF resolved for the period?
- Is the Isapre plan value in UF and converted to CLP correctly?
- Was only the legally deductible portion treated as tax/previsional deduction where applicable?

## Seguro De Cesantia

AFC and Superintendencia de Pensiones describe different funding by contract type:

- Indefinido: worker 0.6 percent, employer 2.4 percent.
- Plazo fijo / obra / servicio: worker 0 percent, employer 3 percent.
- Contributions are subject to the cesantia cap in UF for the applicable period.

Audit questions:

- Is fixed-term cesantia being charged to the worker? If yes, block and fix.
- Is employer cesantia missing for fixed-term workers? If yes, employer cost is understated.
- Was the cesantia cap applied?

## Impuesto Unico De Segunda Categoria

SII publishes monthly IUSC tables. The formula in UTM terms is:

```text
tax_utm = max(0, taxable_base_utm * bracket_rate - deduction_utm)
tax_clp = round(tax_utm * utm_value)
```

Audit questions:

- Does `taxTableVersion` match the period month?
- Are brackets non-empty and sourced from SII/ImpUnico sync?
- Is UTM the value for the period being calculated?
- Is the taxable base after allowed deductions and caps, not gross salary?

## Honorarios

Honorarios are not dependent payroll. They generally use SII boleta retention rather than payroll deductions.

As of 2026, SII states that the retention is 15.25 percent from January 1, 2026.

Audit questions:

- Does the code/table use the current SII retention rate for the year?
- Is Greenhouse avoiding AFP/health/cesantia/SIS/mutual/IUSC dependent payroll deductions?
- Is the relationship truly honorarios and not disguised employment?
- Are bonus terms and tax handling explicit?

## Non-Imponible Allowances

Colacion and movilizacion are not mandatory by law and are non-imponible only when they compensate reasonable work-related expenses. If the amount exceeds reasonable expense, it can be treated as remuneration.

Audit questions:

- Is the amount reasonable for the worker/context?
- Is there a written agreement or compensation version trail?
- Is the allowance prorated when attendance/unpaid leave affects it?

## Vacation, Leave, And Telework

- Annual vacation is 15 business days after more than one year of service, with full remuneration.
- Telework/right-to-disconnect rules require at least 12 continuous hours of disconnection in a 24-hour period for covered workers.
- Approved leave can affect payroll only through the legal/business rule that applies to the leave type.

Audit questions:

- Is leave approved in HR before payroll consumes it?
- Are exported periods protected from silent mutation?
- Is the payroll cut date aligned with the operational calendar?
