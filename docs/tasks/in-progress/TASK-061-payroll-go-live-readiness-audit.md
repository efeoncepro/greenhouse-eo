# TASK-061 - Payroll Go-Live Readiness Audit

## Delta 2026-03-27

- El gap de “bonos fijos y variables por colaborador” quedó parcialmente cerrado por `TASK-062`: `Payroll` ahora soporta un bono fijo recurrente versionado además de `baseSalary`, `remoteAllowance` y bonos variables.
- El cálculo, snapshot y exports ya consideran `fixedBonusAmount` / `fixedBonusLabel`; la auditoría de go-live ya no debe tratar ese punto como pendiente estructural.

## Status

- Lifecycle: `in-progress`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Medio`
- Status real: `Auditoría y hardening en curso`
- Rank: `1`
- Domain: `hr`
- GitHub Project: `Greenhouse Delivery`

## Summary

Auditar end-to-end el módulo `Payroll` para confirmar si está listo para uso real inmediato en una corrida de nómina con colaboradores nacionales e internacionales, incluyendo períodos mixtos `CLP/USD`, cálculo, edición, aprobación y exportables.

La lane también debe cerrar los gaps críticos encontrados y agregar test unitarios donde falten garantías para cálculo, mixed currency y comportamiento operativo previo a go-live.

## Why This Task Exists

El módulo `Payroll` ya está materializado y cerca de primer uso real, pero la ventana de operación es inmediata: la nómina debe montarse entre mañana y pasado.

Eso vuelve insuficiente una confianza basada solo en que el módulo “compila” o “ya existe”. Necesitamos confirmar si hoy soporta sin fricción:

- salarios base en `CLP` y `USD`
- nóminas mixtas con entries en monedas distintas
- bonos fijos y variables por colaborador
- cálculo Chile con `UF` y `UTM`
- períodos calculables, recalculables y exportables sin incoherencias
- reporting/UX suficiente para operar el período sin sorpresas de último minuto

## Goal

- Verificar si el módulo `Payroll` está listo para una corrida real de nómina mixta `CLP/USD`
- Identificar y corregir los gaps críticos que bloqueen operación inmediata
- Agregar tests unitarios en los puntos donde el cálculo o el runtime operativo sigan débiles
- Dejar recomendación explícita de go/no-go con riesgos residuales claros

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/architecture/FINANCE_CANONICAL_360_V1.md`

Reglas obligatorias:

- `Payroll` sigue siendo `Postgres-first`
- la identidad canónica del colaborador sigue siendo `member_id`
- mixed currency debe preservarse por entry; no convertir por conveniencia un período completo a una sola moneda
- el cálculo Chile debe seguir apoyándose en snapshots reproducibles de `UF`/`UTM`
- la lane no debe mezclar rediseños grandes de UI ni expansiones de producto no requeridas para el go-live

## Dependencies & Impact

### Depends on

- `docs/tasks/in-progress/TASK-001-hr-payroll-operational-hardening.md`
- `docs/tasks/in-progress/TASK-058-economic-indicators-runtime-layer.md`
- `src/lib/payroll/*`
- `src/app/api/hr/payroll/*`
- `src/views/greenhouse/payroll/*`

### Impacts to

- `HR > Payroll`
- `People > Payroll`
- `Finance > expenses` vía gasto de personal derivado
- exports PDF / Excel / CSV de nómina
- readiness de operación manual del primer período real

### Files owned

- `src/lib/payroll/*`
- `src/app/api/hr/payroll/*`
- `src/views/greenhouse/payroll/*`
- `src/types/payroll.ts`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/tasks/in-progress/TASK-001-hr-payroll-operational-hardening.md`
- `project_context.md`
- `Handoff.md`
- `changelog.md`

## Current Repo State

### Ya existe

- compensación versionada por colaborador y vigencia
- períodos imputables mensuales con lifecycle `draft -> calculated -> approved -> exported`
- cálculo de entries con soporte para monedas por colaborador
- soporte Chile para AFP, salud, APV, cesantía e impuesto
- exportables PDF, Excel y CSV
- `UF` autohidratada desde indicadores económicos para el período
- `UTM` integrada al cálculo Chile

### Gap actual

- no existe todavía una verificación integral explícita de readiness para una nómina mixta real `CLP/USD`
- no está formalmente confirmado que los exports y el dashboard operen bien con entries de monedas mezcladas
- faltan garantías explícitas en tests para algunos paths críticos de cálculo y operación real
- no existe aún una decisión documentada de go/no-go para la primera corrida productiva del módulo

## Scope

### Slice 1 - Auditoría funcional end-to-end

- revisar creación/edición de compensaciones
- revisar creación/edición de períodos
- revisar cálculo de nómina mixta `CLP/USD`
- revisar recálculo, aprobación y exportables

### Slice 2 - Cálculo y mixed currency

- validar salario base, bonos fijos y variables por moneda
- validar períodos solo `CLP`, solo `USD` y mixtos
- validar que el runtime no mezcle ni agregue erróneamente montos de monedas distintas

### Slice 3 - Payroll Chile

- validar `UF` e `UTM` históricas en cálculo real
- validar descuentos Isapre / Fonasa y tabla tributaria
- validar snapshots reproducibles por período y entry

### Slice 4 - Hardening y tests

- corregir gaps críticos encontrados
- agregar tests unitarios donde falten garantías reales
- dejar evidencia de validación manual y técnica

### Slice 5 - Go-live recommendation

- documentar si el módulo está listo o no para la corrida inmediata
- listar riesgos residuales y mitigaciones operativas

## Out of Scope

- rediseño amplio de UX de Payroll
- nuevas features de HR fuera de nómina
- automatizaciones futuras no necesarias para el go-live inmediato
- refactors amplios de dominio si no corrigen un riesgo real de operación

## Acceptance Criteria

- [ ] Existe una verificación explícita del flujo completo de nómina para colaboradores `CLP`, `USD` y períodos mixtos
- [ ] Cualquier bloqueo crítico encontrado para operar la nómina inmediata queda corregido o documentado como `no-go`
- [ ] Los cálculos de salario base, bonos y descuentos no mezclan monedas indebidamente
- [ ] Los exports y superficies operativas clave fueron revisados respecto a mixed currency
- [ ] Se agregaron tests unitarios para los paths críticos que hoy no estaban suficientemente cubiertos
- [ ] Queda una recomendación clara de `go/no-go` con riesgos residuales y próximos pasos

## Verification

- `pnpm exec eslint src/lib/payroll src/app/api/hr/payroll src/views/greenhouse/payroll`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm test`
- validación manual del flujo `/hr/payroll`
- revisión explícita de mixed currency, cálculo Chile y exportables

## Open Questions

- Si el export CSV actual debe seguir siendo plano por entry aun cuando el período mezcle monedas
- Si para operación inmediata basta con mixed currency por entry o si existe un consumer externo que espere consolidación por moneda

## Delta 2026-03-27

### Hallazgos iniciales - wiring reactivo / outbox / projections

- `Payroll` sí publica eventos outbox en runtime PostgreSQL para:
  - `compensation_version.created`
  - `compensation_version.updated`
  - `payroll_period.created`
  - `payroll_period.updated`
  - `payroll_period.calculated`
  - `payroll_period.approved`
  - `payroll_entry.upserted`
- Fuente actual:
  - `src/lib/payroll/postgres-store.ts`
- Projections downstream efectivamente conectadas hoy:
  - `member_capacity_economics`
  - `person_intelligence`
  - `client_economics`
- Hallazgo crítico 1:
  - `person_intelligence` declara escuchar eventos `payroll_period.*`, pero su `extractScope` solo resuelve `memberId`; como los payloads de `payroll_period.*` no traen `memberId`, esos triggers hoy son no-op.
- Hallazgo crítico 2:
  - exportación de nómina cambia el período a `exported`, pero hoy no publica evento outbox y tampoco existe `payroll_period.exported` en `event-catalog`.
  - fuente actual: `src/lib/payroll/export-payroll.ts`
- Hallazgo crítico 3:
  - el wiring reactivo de `Payroll` depende del path `Postgres-first`; los fallbacks BigQuery mantienen compatibilidad funcional, pero no publican outbox equivalente.
- Hallazgo parcial:
  - `member_capacity_economics` sí sabe reaccionar a eventos scoped por período completo (`finance_period`) y refrescar todos los miembros del período.
  - `person_intelligence` no tiene path equivalente para refresh por período completo.

### Enfoque de solución a aplicar

- agregar evento canónico para exportación de período y publicar outbox al exportar
- corregir el wiring de `person_intelligence` para que los eventos de período sean realmente efectivos o dejar de declararlos si no aportan
- verificar si hace falta fanout o refresh por período para `person_intelligence` cuando cambia estado del período
- mantener el hardening centrado en PostgreSQL runtime, evitando ampliar el fallback BigQuery salvo que aparezca un riesgo real de go-live

### Hallazgos iniciales - mixed currency / operación

- Hallazgo crítico 4:
  - el dashboard principal de `Payroll` agrega `totalGross` y `totalNet` de todas las entries del período y los formatea en la moneda de la primera entry.
  - esto produce un total engañoso en períodos mixtos `CLP/USD`.
  - fuente actual: `src/views/greenhouse/payroll/PayrollDashboard.tsx`
- Hallazgo parcial:
  - `PayrollPeriodTab` sí evita mostrar la fila de totales cuando detecta período mixto, lo que confirma que el módulo ya reconoce implícitamente que no debe sumar cross-currency sin separación.
  - fuente actual: `src/views/greenhouse/payroll/PayrollPeriodTab.tsx`
- Hallazgo positivo:
  - los exportables ricos (`PDF` / `Excel`) ya separan totales por moneda en mixed currency, al menos en su baseline actual.
  - fuentes principales:
    - `src/lib/payroll/generate-payroll-pdf.tsx`
    - `src/lib/payroll/generate-payroll-excel.ts`

### Enfoque de solución a aplicar - mixed currency

- corregir el dashboard principal para no consolidar montos mixtos bajo una sola moneda
- agregar test UI o unitario que cubra el caso de período mixto en `PayrollDashboard`
- contrastar CSV con la necesidad operativa real: mantenerlo por entry puede ser suficiente si no se promete total consolidado cross-currency

### Solución aplicada - wiring reactivo / mixed currency

- Se agregó el evento canónico `payroll_period.exported` al catálogo de eventos y a `REACTIVE_EVENT_TYPES`.
- Se materializó `pgSetPeriodExported()` para el path PostgreSQL y la exportación CSV ya publica outbox al exportar.
- Se extendieron los projections trigger lists que sí corresponden al cierre/exportación del período:
  - `client_economics`
  - `member_capacity_economics`
  - `person_intelligence`
- `person_intelligence` dejó de ser solo “current-month implicit” para refresh reactivo:
  - ahora extrae período desde payload (`periodId`, `payrollPeriodId`, `rateDate`, `effectiveFrom`, etc.)
  - puede refrescar un `member` específico o hacer fanout por `finance_period`
  - con esto los eventos `payroll_period.*`, `payroll_entry.upserted` y `finance.exchange_rate.upserted` ya pueden impactar el período correcto
- `PayrollDashboard` dejó de mostrar un total bruto/neto engañoso en períodos mixtos:
  - ahora detecta mixed currency
  - muestra estado `Mixto`
  - separa subtotales por `CLP` y `USD` en vez de sumar cross-currency

### Tests agregados / ajustados

- `src/lib/sync/projections/person-intelligence.test.ts`
  - cobertura de extraction por período y refresh fanout por `finance_period`
- `src/lib/sync/event-catalog.test.ts`
  - cobertura explícita de `payroll_period.exported`
- `src/views/greenhouse/payroll/helpers.test.ts`
  - cobertura de resumen monetario single-currency y mixed currency
- `src/lib/payroll/export-payroll.test.ts`
  - cobertura del path PostgreSQL al exportar período aprobado y delegar a `pgSetPeriodExported`

### Verificación ejecutada hasta ahora

- `pnpm exec eslint src/lib/sync/projections/person-intelligence.ts src/lib/sync/projections/person-intelligence.test.ts src/lib/sync/event-catalog.test.ts src/views/greenhouse/payroll/helpers.ts src/views/greenhouse/payroll/helpers.test.ts src/views/greenhouse/payroll/PayrollDashboard.tsx src/lib/payroll/export-payroll.ts src/lib/payroll/postgres-store.ts src/lib/sync/projections/client-economics.ts src/lib/sync/projections/member-capacity-economics.ts src/lib/sync/event-catalog.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm test src/lib/sync/projections/person-intelligence.test.ts src/lib/sync/event-catalog.test.ts src/views/greenhouse/payroll/helpers.test.ts`
- `pnpm test src/lib/payroll/export-payroll.test.ts src/lib/sync/projections/person-intelligence.test.ts src/views/greenhouse/payroll/helpers.test.ts`
- `pnpm test src/lib/payroll src/views/greenhouse/payroll`
- `pnpm test src/lib/sync/projections/member-capacity-economics.test.ts src/lib/sync/projections/client-economics.test.ts src/lib/sync/projections/person-intelligence.test.ts`
- `pnpm build`

## Delta 2026-03-27

### Hallazgos iniciales - exports y mixed currency

- `PayrollDashboard` mezcla montos cuando el período actual tiene entries `CLP` y `USD`:
  - suma `gross` y `net` de todas las entries
  - elige `primaryCurrency` desde la primera entry
  - muestra ambos totales en esa sola moneda visual
  - archivo: `src/views/greenhouse/payroll/PayrollDashboard.tsx`

### Hallazgos adicionales - cálculo Chile / go-live

- Hallazgo crítico 5:
  - para colaboradores `Chile`, la ausencia de `taxTableVersion` no bloqueaba el cálculo; el sistema seguía adelante y dejaba `chileTaxAmount = 0`.
  - eso es riesgoso para go-live porque produce netos incorrectos sin un bloqueo explícito.
  - fuentes principales:
    - `src/lib/payroll/calculate-payroll.ts`
    - `src/lib/payroll/recalculate-entry.ts`
    - `src/lib/payroll/payroll-readiness.ts`
- Hallazgo crítico 6:
  - aunque `UTM` histórica ya está integrada, el runtime no trataba la falta de `UTM` como bloqueo formal para cálculo/recálculo Chile.
  - en ese escenario el impuesto también podía degradar silenciosamente a `0`.

### Solución aplicada - cálculo Chile / go-live

- `Payroll` ahora bloquea cálculo y recálculo de entries `Chile` si falta `taxTableVersion`.
- `Payroll` ahora bloquea cálculo y recálculo de entries `Chile` si no se puede resolver la `UTM` histórica del período.
- `Readiness` ya no trata la tabla tributaria como warning:
  - la ausencia de `taxTableVersion` en períodos con colaboradores `Chile` pasa a `blocking`
  - la ausencia de `UTM` histórica también pasa a `blocking`

### Tests agregados / ajustados - cálculo Chile

- `src/lib/payroll/payroll-readiness.test.ts`
  - `missing_tax_table_version` ahora cubierto como bloqueo
  - nueva cobertura para `missing_utm_value` como bloqueo operativo

### Hallazgos y cierre operativo adicional

- `PayrollPersonnelExpense` ya quedó corregido para períodos mixtos:
  - backend separa totales y promedios por `currency`
  - UI muestra breakdown `CLP/USD` y deja de graficar una serie engañosa cuando el período es mixto
  - archivos:
    - `src/lib/payroll/personnel-expense.ts`
    - `src/views/greenhouse/payroll/PayrollPersonnelExpenseTab.tsx`
- `PayrollDashboard` ahora permite cargar `taxTableVersion` al crear el período:
  - reduce fricción operativa para la primera corrida Chile/mixta
  - mantiene `UF` autohidratada
  - archivo:
    - `src/views/greenhouse/payroll/PayrollDashboard.tsx`
- `PayrollPeriodTab` ya venía evitando mostrar totales agregados cross-currency cuando detecta período mixto; ese guardrail se mantiene y queda alineado con el dashboard principal.
- `generate-payroll-pdf.tsx` y `generate-payroll-excel.ts` fueron revisados y el baseline actual separa totales `CLP` y `USD` de forma operativa suficiente para go-live.
- `export-payroll.ts` sigue siendo CSV plano por entry:
  - esto es aceptable para go-live inmediato porque no promete total consolidado cross-currency
  - queda como deuda menor si después se requiere resumen por moneda aguas abajo

### Cobertura técnica acumulada

- Suite focalizada de hardening:
  - `8` archivos de test
  - `32/32` tests pasando
- Suite amplia de `Payroll` y UI de nómina:
  - `15` archivos de test
  - `77/77` tests pasando
- Build global:
  - `pnpm build` pasando

### Hallazgos funcionales confirmados - componentes del cálculo

- El cálculo actual de nómina sí considera:
  - `baseSalary`
  - `remoteAllowance` como componente fijo recurrente
  - bono variable `OTD` prorrateado desde `bonusOtdMax`
  - bono variable `RpA` prorrateado desde `bonusRpaMax`
  - `bonusOtherAmount` como bono adicional manual por entry
- El cálculo actual no modela todavía un catálogo genérico de “bonos fijos” recurrentes aparte de `remoteAllowance`.
- Los campos `bonusOtdMin` y `bonusRpaMin` existen como límites/configuración, pero no son un pago fijo automático del período; la lógica de cálculo usa `bonusOtdMax` y `bonusRpaMax` como target variable.
- Semántica actual de asistencia/permisos/licencias:
  - descuenta por `daysAbsent`
  - descuenta por `daysOnUnpaidLeave`
  - no descuenta por `daysOnLeave` pagadas
  - trata `late` y `excused` como presencia para snapshot operativo
- Implicación operativa:
  - si la empresa necesita pagar otros bonos fijos mensuales además de conectividad, hoy eso no entra automáticamente en el cálculo base
  - hoy esos casos solo pueden resolverse como ajuste manual por entry vía `bonusOtherAmount`

### Enfoque de solución propuesto

- corregir primero las superficies que hoy inducen error operativo:
  - `PayrollDashboard`
  - `PayrollPersonnelExpense`
- mantener `CSV` como export plano por entry si no existe un consumer externo que requiera consolidación, pero explicitar que no es un resumen multi-moneda
- agregar tests unitarios para mixed currency en:
  - aggregations del dashboard
  - aggregations de personnel expense
  - exports PDF/Excel/CSV

### Hallazgos iniciales - wiring reactivo / outbox

- `Payroll` sí publica outbox events para:
  - `compensation_version.created`
  - `compensation_version.updated`
  - `payroll_period.created`
  - `payroll_period.updated`
  - `payroll_period.calculated`
  - `payroll_period.approved`
  - `payroll_entry.upserted`
  - archivo: `src/lib/payroll/postgres-store.ts`
- projections activas que ya reaccionan a eventos de `Payroll`:
  - `client_economics`
  - `member_capacity_economics`
  - `person_intelligence`
  - archivos:
    - `src/lib/sync/projections/client-economics.ts`
    - `src/lib/sync/projections/member-capacity-economics.ts`
    - `src/lib/sync/projections/person-intelligence.ts`
- gap crítico: no existe evento `payroll_period.exported`
  - `exportPayrollCsv()` cambia el estado a `exported` por query directa
  - no pasa por store mutante que publique outbox
  - archivo: `src/lib/payroll/export-payroll.ts`
- consecuencia:
  - cualquier consumer reactivo que deba distinguir `approved` vs `exported` no recibe señal canónica del cierre final del período
  - hoy los projections listados escuchan hasta `payroll_period.approved`, pero no el cierre final
- hallazgo adicional de robustez:
  - el `event catalog` no contempla `payroll_period.exported`
  - archivo: `src/lib/sync/event-catalog.ts`
- no identifiqué una proyección dedicada para `member_payroll_360`; la arquitectura la trata como serving view, por lo que el gap reactivo principal hoy está en consumers cross-module y no en una projection faltante específica de nómina

### Enfoque de solución propuesto - reactividad

- introducir mutación canónica de export para PostgreSQL que:
  - marque el período `exported`
  - persista `exported_at`
  - publique `payroll_period.exported`
- extender `event-catalog` y `REACTIVE_EVENT_TYPES` con ese evento
- decidir qué projections deben reaccionar al export final; baseline mínimo:
  - `client_economics`
  - `member_capacity_economics`
  - `person_intelligence`
- agregar tests unitarios que verifiquen el wiring del nuevo evento en catalog/registry donde corresponda

## Delta 2026-03-27

- Hallazgo 1:
  - `Personnel Expense` agrega `gross/net/deductions/bonuses` a nivel período y total sin preservar moneda.
  - Riesgo: una nómina mixta `CLP/USD` puede exponer KPIs agregados inválidos al sumar montos heterogéneos como si fueran la misma unidad.
  - Zona detectada:
    - `src/lib/payroll/personnel-expense.ts`
    - `src/views/greenhouse/payroll/PayrollPersonnelExpenseTab.tsx`
- Hallazgo 1b:
  - la API de entries del período también expone `summary.totalGross` y `summary.totalNet` sin separación por moneda.
  - Riesgo: cualquier consumer futuro puede reutilizar un resumen ambiguo y volver a mezclar montos cross-currency.
  - Zona detectada:
    - `src/app/api/hr/payroll/periods/[periodId]/entries/route.ts`
- Hallazgo 2:
  - el flujo de `export` de período cambia estado a `exported` fuera del store canónico de Payroll y no parece emitir evento outbox específico de exportación.
  - Riesgo: consumers reactivos y proyecciones downstream no reciben una señal explícita del cierre/export del período.
  - Zonas detectadas:
    - `src/lib/payroll/export-payroll.ts`
    - `src/lib/sync/event-catalog.ts`
    - projections que hoy escuchan solo `payroll_period.created|updated|calculated|approved`
- Enfoque de solución a aplicar:
  - preservar mixed currency explícitamente en reportes agregados de Payroll y evitar totales cross-currency ambiguos
  - introducir mutación canónica `payroll_period.exported` con outbox y conectar projections/consumers donde corresponda
