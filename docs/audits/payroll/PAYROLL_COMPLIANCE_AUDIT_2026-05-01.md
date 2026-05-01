# PAYROLL_COMPLIANCE_AUDIT_2026-05-01

## Status

- Date: 2026-05-01
- Scope: auditoria read-only del sistema Payroll Efeonce/Greenhouse
- Auditor: Codex usando `$greenhouse-payroll-auditor`
- Criticality: critica
- Business sensitivity: alta
- Runtime checked: staging via `pnpm staging:request`
- Mutation policy: auditoria original read-only; cierre posterior de `TASK-744` recalculo abril 2026 en staging antes de aprobacion/export.
- Remediation status: `TASK-744` cerrada 2026-05-01. Motor corregido, constraints DB `NOT VALID`, readiness blocker y tests aplicados; abril 2026 recalculado en staging a `2026-05-01T10:22:26.440Z` con entries coherentes por regimen.

## Executive Summary

La auditoria concluyo originalmente que **Payroll Chile no debia aprobarse ni exportarse como legalmente confiable hasta corregir formulas estructurales**. Esa remediacion quedo aplicada por `TASK-744` y validada en staging para abril 2026 antes de aprobacion/export.

El problema no es solo un bug puntual de UI. Hay drift entre:

- reglas legales Chile vigentes
- clasificacion contractual (`indefinido`, `plazo_fijo`, `honorarios`, `contractor`, `eor`)
- formulas del runtime
- entries ya calculadas en staging para abril 2026

El estado staging de abril 2026 esta `calculated` y la readiness reporta `ready: true`, pero las entries muestran riesgos materiales:

- honorarios 2026 con retencion SII desactualizada
- honorarios mezclando retencion SII con deducciones propias de trabajador dependiente
- seguro de cesantia `plazo_fijo` con split trabajador/empleador incorrecto en codigo
- formulas visibles sin aplicacion clara de topes imponibles AFP/salud/cesantia/SIS/mutual
- gratificacion legal calculada sobre `baseSalary` y no sobre remuneracion mensual devengada elegible

Conclusion practica:

- **Block** para aprobacion/export de Payroll Chile hasta corregir y reliquidar/recalcular de forma auditable.
- KPI ICO para trabajadores internacionales con bono variable si esta entrando correctamente en staging y debe preservarse.
- International/Deel debe seguir separado de payroll estatutario Chile, pero requiere saneamiento de clasificacion en algunos casos.

## Audit Scope

### Code paths reviewed

- `src/types/hr-contracts.ts`
- `src/types/payroll.ts`
- `src/lib/payroll/calculate-payroll.ts`
- `src/lib/payroll/calculate-chile-deductions.ts`
- `src/lib/payroll/calculate-honorarios.ts`
- `src/lib/payroll/chile-previsional-helpers.ts`
- `src/lib/payroll/compute-chile-tax.ts`
- `src/lib/payroll/compensation-requirements.ts`
- `src/lib/payroll/payroll-readiness.ts`

### Runtime endpoints reviewed read-only

- `GET /api/hr/payroll/periods`
- `GET /api/hr/payroll/periods/2026-04/readiness`
- `GET /api/hr/payroll/compensation/eligible-members`
- `GET /api/hr/payroll/periods/2026-04/entries`
- `GET /api/hr/payroll/compensation`

### Official sources checked

- Direccion del Trabajo, gratificacion legal: https://www.dt.gob.cl/portal/1626/w3-article-99034.html
- Direccion del Trabajo, contrato individual/subordinacion: https://www.dt.gob.cl/portal/1626/w3-article-100172.html
- Direccion del Trabajo, colacion/movilizacion: https://www.dt.gob.cl/portal/1628/w3-article-60235.html
- Direccion del Trabajo, feriado anual: https://www.dt.gob.cl/portal/1628/w3-article-60183.html
- Direccion del Trabajo, derecho a desconexion: https://www.dt.gob.cl/portal/1628/w3-article-118665.html
- SII, Impuesto Unico Segunda Categoria 2026: https://www.sii.cl/valores_y_fechas/impuesto_2da_categoria/impuesto2026.htm
- SII, boletas de honorarios 2026: https://www.sii.cl/destacados/boletas_honorarios/index.html
- Superintendencia de Pensiones, seguro de cesantia: https://www.spensiones.cl/portal/institucional/594/w3-propertyvalue-9902.html
- Superintendencia de Pensiones, cotizacion previsional obligatoria: https://www.spensiones.cl/portal/institucional/594/w3-propertyvalue-9908.html
- AFC, financiamiento seguro de cesantia: https://www.afc.cl/que-es-el-seguro-de-cesantia/como-se-financia/
- PREVIRED, indicadores previsionales: https://www.previred.com/

## Runtime Snapshot: Staging 2026-04

### Period

`GET /api/hr/payroll/periods`:

- `periodId`: `2026-04`
- `status`: `calculated`
- `calculatedAt`: `2026-05-01T08:10:57.298Z`
- `calculatedBy`: `user-agent-e2e-001`
- `ufValue`: `40120.2`
- `taxTableVersion`: `null`

### Readiness

`GET /api/hr/payroll/periods/2026-04/readiness`:

- `ready`: `true`
- `includedMemberIds`: 6
- `missingCompensationMemberIds`: `julio-reyes`
- `missingKpiMemberIds`: none
- `missingAttendanceMemberIds`: none
- `blockingIssues`: none
- warning: 1 active collaborator excluded for missing compensation

### Entries

`GET /api/hr/payroll/periods/2026-04/entries`:

- 6 entries
- mixed currency: `USD` + `CLP`
- 3 international/Deel entries with KPI ICO
- 2 Chile honorarios entries
- 1 Chile dependent entry

Important observed rows:

- `humberly-henriquez`: `contractType = honorarios`, `siiRetentionRate = 0.145`, but also health, cesantia, SIS/mutual-like amounts present.
- `luis-reyes`: `contractType = honorarios`, `siiRetentionRate = 0.145`, but also health, cesantia, SIS/mutual-like amounts present.
- `valentina-hoyos`: `contractType = indefinido`, `payRegime = chile`, Isapre in UF, AFP Uno, gratificacion mensual.
- `andres-carlosama`, `daniela-ferreira`, `melkin-hernandez`: international/Deel entries with `kpiDataSource = ico`.

## Findings

### PAYROLL-CHILE-001 — Honorarios 2026 usa retencion SII desactualizada

Severity: Critical

`src/types/hr-contracts.ts` define:

```ts
2026: 0.145
```

Pero SII publica retencion de 15,25% vigente desde el 1 de enero de 2026 para boletas de honorarios.

Impact:

- Las entries de honorarios 2026 quedan con retencion insuficiente.
- En staging, `humberly-henriquez` y `luis-reyes` ya muestran `siiRetentionRate = 0.145`.
- Cualquier neto calculado para honorarios 2026 queda materialmente incorrecto.

Evidence:

- `src/types/hr-contracts.ts`
- `src/lib/payroll/calculate-honorarios.ts`
- Staging `GET /api/hr/payroll/periods/2026-04/entries`
- SII boletas honorarios 2026

Required fix direction:

- Centralizar la tabla de retenciones por periodo/anio con fuente oficial auditable.
- Corregir 2026 a `0.1525`.
- Agregar tests por anio 2024-2028.
- Recalcular/reliquidar periodos afectados con trazabilidad.

### PAYROLL-CHILE-002 — Seguro de Cesantia `plazo_fijo` esta invertido

Severity: Critical

El helper actual devuelve 3% como tasa del trabajador para `plazo_fijo`:

```ts
contractType === 'plazo_fijo' ? 0.03 : 0.006
```

Y el costo empleador usa 0% para `plazo_fijo`:

```ts
const cesantiaRate = contractType === 'plazo_fijo' ? 0 : 0.024
```

AFC y Superintendencia de Pensiones indican:

- indefinido: trabajador 0,6%, empleador 2,4%
- plazo fijo / obra / servicio: trabajador 0%, empleador 3%

Impact:

- Para trabajadores `plazo_fijo`, el neto queda subpagado si se descuenta 3% al trabajador.
- El costo empleador queda subestimado.
- La base imponible/tributaria puede quedar alterada.

Evidence:

- `src/lib/payroll/chile-previsional-helpers.ts`
- AFC financiamiento seguro de cesantia
- Superintendencia de Pensiones, seguro de cesantia

Required fix direction:

- Separar explicitamente `workerCesantiaRate` y `employerCesantiaRate`.
- No reutilizar una unica `unemploymentRate` como si sirviera para ambos lados.
- Agregar tests para `indefinido`, `plazo_fijo`, `obra/faena` cuando exista en modelo.

### PAYROLL-CHILE-003 — Honorarios mezcla retencion SII con deducciones de trabajador dependiente

Severity: Critical

En staging, las entries de `humberly-henriquez` y `luis-reyes` aparecen como `contractType = honorarios`, pero incluyen:

- `siiRetentionRate`
- `siiRetentionAmount`
- `chileHealthAmount`
- `chileEmployerSisAmount`
- `chileEmployerCesantiaAmount`
- `chileEmployerMutualAmount`
- `chileUnemploymentRate`
- `chileUnemploymentAmount`

Esto no corresponde al modelo de honorarios descrito por la skill ni al comportamiento esperado del codigo local actual, donde `honorariosTotals` deberia poner deducciones Chile dependiente en `null`.

Impact:

- Neto y costo empleador quedan conceptualmente incorrectos.
- La entry no es auditable: combina dos regimenes incompatibles.
- La readiness puede reportar `ready: true` mientras la entry calculada es legalmente riesgosa.

Evidence:

- Staging `GET /api/hr/payroll/periods/2026-04/entries`
- `src/lib/payroll/calculate-payroll.ts`
- `src/lib/payroll/calculate-honorarios.ts`

Required fix direction:

- Determinar si staging corre un build anterior, si las entries vienen de una corrida previa, o si existe otro path de recalculo/persistencia contaminando campos.
- Agregar invariant test: si `contractType = honorarios`, AFP/salud/cesantia/SIS/mutual/IUSC deben ser `null` o `0` segun contrato definido, pero no coexistir con dependent payroll.
- Reliquidar/recalcular entries afectadas despues del fix.

### PAYROLL-CHILE-004 — Topes imponibles no se aplican en la formula visible

Severity: High

El runtime tiene helpers para topes:

- `getTopeAfpForPeriod()`
- `getTopeCesantiaForPeriod()`

Pero `calculatePayrollTotals()` calcula AFP, salud, cesantia, SIS y mutual directamente sobre `imponibleBase`.

Impact:

- En sueldos bajo tope, el bug puede no ser visible.
- En sueldos altos, descuentos, costo empleador y base tributaria pueden quedar mal.
- Riesgo alto para escalabilidad: al subir salarios o agregar ejecutivos, el motor falla silenciosamente.

Evidence:

- `src/lib/payroll/chile-previsional-helpers.ts`
- `src/lib/payroll/calculate-chile-deductions.ts`
- PREVIRED indicadores previsionales
- Superintendencia de Pensiones topes imponibles

Required fix direction:

- Introducir bases imponibles separadas:
  - `pensionHealthAccidentBase = min(imponibleBase, topeAfpUf * UF)`
  - `cesantiaBase = min(imponibleBase, topeCesantiaUf * UF)`
  - `taxableBase` con deducciones legalmente aceptadas y topes aplicados
- Persistir los topes usados en entry o explanation/audit metadata.
- Agregar tests de sueldo bajo tope y sobre tope.

### PAYROLL-CHILE-005 — Gratificacion legal se calcula solo sobre `baseSalary`

Severity: High

`calculatePayrollTotals()` usa:

```ts
Math.min(baseSalary * 0.25, (immValue * 4.75) / 12)
```

Direccion del Trabajo describe el sistema del articulo 50 como 25% de remuneraciones mensuales devengadas, con tope anual de 4,75 ingresos minimos mensuales.

Impact:

- Si existen bonos o remuneraciones imponibles mensuales elegibles, la gratificacion puede quedar subcalculada.
- Si Efeonce define contractualmente una base menor, debe quedar explicitado; si no, el motor deberia usar remuneracion elegible.

Evidence:

- `src/lib/payroll/calculate-chile-deductions.ts`
- Direccion del Trabajo, gratificacion legal

Required fix direction:

- Definir `gratificationEligibleRemuneration`.
- Separar base legal, base contractual y modo de anticipo.
- Agregar tests con fixed bonus / variable bonus.

### PAYROLL-DATA-006 — Clasificacion contractual inconsistente en staging

Severity: Medium

Observaciones:

- `humberly-henriquez` y `luis-reyes`: `contractType = honorarios`, pero `scheduleRequired = true`.
- `melkin-hernandez`: `contractType = indefinido`, `payRegime = international`, `payrollVia = deel`.
- `andres-carlosama` y `daniela-ferreira`: `contractor` + `payrollVia = deel`, pero `scheduleRequired = true`.

Estas combinaciones pueden ser intencionales, pero deben revisarse porque la clasificacion define si aplica payroll laboral Chile, boleta honorarios, Deel contractor/EOR o excepcion internacional.

Impact:

- Riesgo de aplicar reglas correctas al regimen equivocado.
- Riesgo de subordinacion/dependencia si un contractor/honorarios opera como dependiente.

Evidence:

- Staging `GET /api/hr/payroll/compensation`
- `src/types/hr-contracts.ts`
- Direccion del Trabajo, contrato individual/subordinacion

Required fix direction:

- Agregar auditoria de coherencia de compensaciones:
  - `contractType -> payRegime/payrollVia`
  - `contractType -> scheduleRequired`
  - `payrollVia = deel -> deelContractId requerido` para ciertos tipos
- Separar warnings operacionales de blockers legales.

### PAYROLL-KPI-007 — KPI ICO esta correctamente preservado para internacionales con bono variable

Severity: Positive control

Las entries internacionales con bono variable tienen `kpiDataSource = ico` y valores OTD/RPA materializados.

Impact:

- Esto preserva una regla vital: los bonos fuera de Chile dependen de ICO y no deben calcularse manualmente.

Evidence:

- Staging entries de `andres-carlosama`, `daniela-ferreira`, `melkin-hernandez`
- `src/lib/payroll/compensation-requirements.ts`
- `src/lib/payroll/fetch-kpis-for-period.ts`

Required preservation:

- Cualquier fix de honorarios/Chile no debe relajar el gating de KPI para internacionales con `bonusOtdMax` o `bonusRpaMax`.

## Data Quality Notes

- Abril 2026 esta calculado, no aprobado ni exportado.
- `taxTableVersion` del periodo aparece `null` aun cuando la entry dependiente Chile calculo impuesto cero. Esto puede ser aceptable si el resolver encontro tabla en runtime, pero conviene persistir o exponer la version resuelta para auditoria.
- `julio-reyes` esta activo y sin compensacion vigente; hoy aparece como warning y queda fuera del calculo.
- No se observo `manualOverride` en entries de abril 2026.

## Recommended Remediation Plan

Orden recomendado:

1. Corregir retencion honorarios 2026 y tests por anio.
2. Separar tasas de cesantia trabajador/empleador por tipo de contrato.
3. Arreglar honorarios para que nunca combine retencion SII con deducciones dependientes.
4. Aplicar topes imponibles por base separada.
5. Replantear gratificacion legal sobre base elegible documentada.
6. Agregar auditor de coherencia contractual para compensaciones.
7. Recalcular/reliquidar abril 2026 en staging con evidencia antes de aprobar/exportar.
8. Actualizar docs de arquitectura y manual si cambia el flujo visible.

## Verification Executed

Commands read-only:

```bash
pnpm staging:request /api/hr/payroll/periods --pretty
pnpm staging:request /api/hr/payroll/periods/2026-04/readiness --pretty
pnpm staging:request /api/hr/payroll/compensation/eligible-members --pretty
pnpm staging:request /api/hr/payroll/periods/2026-04/entries --pretty
pnpm staging:request /api/hr/payroll/compensation --pretty
```

Static reads:

```bash
nl -ba src/types/hr-contracts.ts
nl -ba src/lib/payroll/chile-previsional-helpers.ts
nl -ba src/lib/payroll/calculate-chile-deductions.ts
nl -ba src/lib/payroll/calculate-payroll.ts
nl -ba src/lib/payroll/calculate-honorarios.ts
nl -ba src/lib/payroll/compute-chile-tax.ts
nl -ba src/lib/payroll/compensation-requirements.ts
```

## Non-Actions

No se ejecuto:

- `POST /calculate`
- approve/export/close/reopen
- migraciones
- escritura DB
- cambios de codigo runtime
- cambios de compensaciones

## Freshness And Revalidation

Esta auditoria refleja el estado observado el 2026-05-01.

Antes de usarla como base para un fix, revalidar:

- SII honorarios vigente del anio a calcular.
- PREVIRED/SP topes y tasas del periodo.
- staging/prod deploy SHA.
- entries actuales del periodo afectado.
- si las entries de honorarios siguen mezclando campos despues de cualquier redeploy.
