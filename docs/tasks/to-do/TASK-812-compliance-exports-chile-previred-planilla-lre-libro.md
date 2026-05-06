# TASK-812 — Compliance Exports Chile: Planilla Previred + LRE Libro de Remuneraciones Electrónico

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `TASK-784` (hard blocker para Slice 1 — RUT canonico verificado por member)
- Branch: `task/TASK-812-compliance-exports-chile-previred-planilla-lre-libro`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Greenhouse calcula correctamente todas las cotizaciones previsionales Chile y la retencion SII honorarios, pero NO genera los archivos oficiales que las autoridades aceptan para upload directo. El cierre mensual depende hoy de Nubox para producir la **Planilla Previred** (TXT posicional ASCII Latin-1 que `previred.cl` acepta) y el **LRE** (XML obligatorio mensual ante la Direccion del Trabajo desde Decreto N°9 / Res. Ex. 1.110 de 2021). Esta task agrega la capa de proyeccion: read-only sobre `payroll_entries`, formatos exactos, paridad financiera con `payment_order` social_security canonico (TASK-707a/TASK-765), y reemplaza la dependencia de Nubox para compliance.

## Why This Task Exists

Hoy el motor de payroll Chile esta completo aguas arriba (calculo correcto + tasas Previred sincronizadas + materializacion canonica del pago al banco), pero aguas abajo se rompe la cadena: el operador exporta Excel/CSV genericos y debe re-cargarlos manualmente en Nubox para que Nubox produzca el archivo de upload. Esto crea cuatro problemas reales:

1. **Dependencia de licencia externa** para una proyeccion deterministica de datos que ya viven en Greenhouse.
2. **Riesgo de drift** entre lo que Greenhouse calculo y lo que Nubox declaro (no hay test paridad).
3. **Compliance trail fragmentado** — la verdad legal del periodo vive en Nubox, no en Greenhouse.
4. **Multas DT por LRE incorrecto** (5-20 UTM, Art. 506 CT) — el archivo mal generado es PEOR que no entregarlo, queda fijado en sistema DT y requiere rectificacion formal.

La solucion robusta no es seguir exportando Excel "para Nubox", es generar los archivos oficiales canonicamente desde Greenhouse, validados contra schema XSD oficial DT y con paridad financiera asegurada contra el `payment_order` social_security ya canonizado por TASK-707a y TASK-765.

## Goal

- Operador descarga **Planilla Previred TXT** lista para upload directo en `previred.cl` desde el periodo `exported`, sin intermediario.
- Operador genera **LRE XML** validado contra XSD oficial DT, listo para declaracion mensual.
- **Paridad financiera asegurada**: `SUM(planilla.previred_total) === calculatePreviredEntryBreakdown.total === payment_order.amount_clp` para el mismo periodo.
- **Honorarios excluidos explicitamente** de LRE/Previred (Art. 22 CT solo cubre dependientes); declarados como follow-up SII DJ 1879 anual.
- **Reliability signal** `payroll.lre.export_drift` cubre regresion silenciosa.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` — contrato canonico Payroll Chile, motor de calculo, tasas Previred, exports actuales (Excel/CSV/PDF).
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` — `payment_order` social_security materializacion, reconciliacion con `account_balances` (TASK-765).
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` — outbox events nuevos `payroll.export.previred_generated` v1 + `payroll.export.lre_generated` v1.
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` — registro del signal `payroll.lre.export_drift`.
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` — endpoints HR lane `/api/hr/payroll/periods/[id]/export/...`.

Reglas obligatorias:

- **NUNCA** generar archivo Previred/LRE sin paridad financiera contra `payment_order` social_security del mismo periodo. El test es no-negociable.
- **NUNCA** emitir LRE sin validar contra XSD oficial DT pre-emit. Multa DT por archivo incorrecto > 5-20 UTM.
- **NUNCA** mezclar honorarios en Planilla Previred ni en LRE. Honorarios = retencion SII Art. 74 N°2 LIR, no payroll dependiente.
- **NUNCA** asumir RUT desde `members` legacy. Fuente unica = `greenhouse_core.person_identity_documents` (TASK-784) con `verification_status='verified'` y `documentType='CL_RUT'`.
- **NUNCA** mapear codigos AFP/Isapre inline en el generador. Lookup obligatorio via tabla seed `previred_institution_codes`.
- **NUNCA** introducir codigos LRE inline. Mapping `payroll_entries.column → lre_concept_code` vive en tabla declarativa `lre_concept_codes`.

## Normative Docs

- `docs/audits/payroll/PAYROLL_COMPLIANCE_AUDIT_2026-05-01.md` — auditoria payroll compliance reciente, fuentes oficiales DT/SII.
- `src/lib/payroll/chile-previsional-helpers.ts` — helpers existentes para AFP/AFC/SIS/Mutual.
- `src/lib/finance/payment-obligations/calculate-previred-total.ts` — formula canonica del total Previred (TASK-759 V2).
- Layout oficial Previred: documentar URL fuente en `Detailed Spec` durante Discovery (lo provee Previred S.A. via `previred.cl/wp/biblioteca-virtual/`).
- Schema XSD LRE oficial DT: descargar de `https://lre.dt.gob.cl` durante Discovery, commitear a `docs/compliance/dt/lre-schema-vNN.xsd` `[verificar]` ruta canonica.

## Dependencies & Impact

### Depends on

- **`TASK-784` (Person Legal Profile + Identity Documents Foundation)** — provee RUT canonico verificado. **Hard blocker Slice 1**: sin RUT verificado por member chile_dependent activo, no se puede emitir Planilla Previred valida.
- **`TASK-707a` (Previred Detection + Canonical State Runtime)** — provee `payment_order` social_security para test paridad. Estado actual `to-do`, pero coordinacion verificada en Delta 2026-04-28.
- **`TASK-765` (Payment Order ↔ Bank Settlement Resilience)** — `complete`. Provee invariante atomica del settlement contra el cual reconciliar.
- **`TASK-758` (Payroll Receipt Render Contract Hardening)** — `complete`. Provee `groupEntriesByRegime` + clasificacion canonica de regimen (separar chile_dependent vs honorarios vs international).
- Tabla `greenhouse_payroll.payroll_entries` con 7 columnas previsionales canonicas + `chile_afp_name` + `chile_health_system` + `contract_type_snapshot`.
- Tabla `greenhouse_payroll.chile_previred_indicators` con UF/UTM/IMM/SIS/topes del periodo.
- Tabla `greenhouse_payroll.chile_afp_rates` con tasa AFP por administradora del periodo.

### Blocks / Impacts

- **Cierre mensual Payroll Chile** queda canonizado dentro de Greenhouse (deja de depender de Nubox para compliance).
- **TASK-414** (Payroll Reopen Policy) — el flag `previred_declared_check` cobra significado real una vez que TASK-812 emite el archivo declarado. Considerar al cerrar.
- **Audit log compliance** — reliability signal `payroll.lre.export_drift` se vuelve preflight obligatorio para cierre de periodo.
- **Follow-up DJ 1879 SII honorarios** (anual) — task derivada al cerrar TASK-812.
- **Follow-up Horas Extras** — el motor actual no computa HE; Slice 2 emite `0` con warning, abre task para incorporar HE al calculo.

### Files owned

- `src/lib/payroll/exports/chile-previred-planilla.ts` — generador puro Slice 1 [crear]
- `src/lib/payroll/exports/chile-previred-planilla.test.ts` — tests paridad + 7 AFPs fixture [crear]
- `src/lib/payroll/exports/chile-lre-libro.ts` — generador puro Slice 2 [crear]
- `src/lib/payroll/exports/chile-lre-libro.test.ts` — tests XSD + paridad [crear]
- `src/lib/payroll/exports/previred-institution-codes.ts` — helpers de lookup AFP/Isapre/FONASA [crear]
- `src/lib/payroll/exports/lre-concept-mapping.ts` — mapping declarativo `payroll_entries → lre_concept_codes` [crear]
- `src/app/api/hr/payroll/periods/[periodId]/export/previred/route.ts` — endpoint Slice 1 [crear]
- `src/app/api/hr/payroll/periods/[periodId]/export/lre/route.ts` — endpoint Slice 2 [crear]
- `migrations/AAAAMMDDHHMMSSXXX_task-812-previred-institution-codes-and-lre-concept-codes.sql` — tabla seed Previred + LRE concepts [crear]
- `src/lib/reliability/queries/payroll-lre-export-drift.ts` — reliability signal Slice 2 [crear]
- `src/lib/sync/event-catalog.ts` — agregar `payroll.export.previred_generated` v1 + `payroll.export.lre_generated` v1 [modificar]
- `src/views/greenhouse/hr/PayrollPeriodView.tsx` `[verificar]` ruta exacta — boton "Descargar Planilla Previred" + "Generar LRE" [modificar]
- `src/lib/auth/capabilities.ts` `[verificar]` ruta exacta — agregar `hr.payroll.export_previred` + `hr.payroll.export_lre` [modificar]
- `docs/compliance/dt/lre-schema-v3.xsd` `[verificar]` ruta canonica — schema XSD oficial commiteado [crear]
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` — agregar §26 "Compliance Exports Chile" [modificar]
- `docs/documentation/hr/exports-compliance-chile.md` — doc funcional [crear]
- `docs/manual-de-uso/hr/exportar-planilla-previred-y-lre.md` — manual operador [crear]

## Current Repo State

### Already exists

- **Calculo Previred completo** en `src/lib/payroll/calculate-chile-deductions.ts` y `src/lib/payroll/chile-previsional-helpers.ts`: AFP, Salud, AFC empleado/empleador, SIS, Mutual, APV.
- **Persistencia canonica** en `payroll_entries` con 7 columnas previsionales: `chile_afp_amount`, `chile_health_amount`, `chile_unemployment_amount`, `chile_apv_amount`, `chile_employer_cesantia_amount`, `chile_employer_mutual_amount`, `chile_employer_sis_amount`.
- **Total Previred canonico** computado por `calculatePreviredEntryBreakdown` en `src/lib/finance/payment-obligations/calculate-previred-total.ts` (TASK-759 V2).
- **Sync de tasas Previred** via `/api/cron/sync-previred` (Gael Cloud) materializa `chile_previred_indicators` + `chile_afp_rates` por periodo.
- **`payment_order` social_security** canonizado por TASK-707a/TASK-765 con bank settlement atomico.
- **Excel multi-sheet** con sheet `Chile` (13 columnas, 2 secciones internas chile_dependent/honorarios) en `src/lib/payroll/generate-payroll-excel.ts` — tiene los datos, NO el formato Previred/LRE.
- **CSV generico** de 33 columnas en `src/lib/payroll/export-payroll.ts` — summary, NO Previred upload format.
- **Helper canonico de regimen** `resolveReceiptRegime` + `groupEntriesByRegime` en `src/lib/payroll/receipt-presenter.ts` (TASK-758) — separa chile_dependent vs honorarios vs international.
- **Capabilities Payroll existentes**: HR route_group + FINANCE_ADMIN + EFEONCE_ADMIN como modelo de gating.

### Gap

- **No existe generador Planilla Previred TXT**. Layout posicional 105 columnas Latin-1 CRLF no implementado.
- **No existe generador LRE XML**. Schema oficial DT con ~50 conceptos canonicos no implementado.
- **No existe tabla `previred_institution_codes`** — `chile_afp_name` es string libre, no esta mapeado a codigo Previred numerico (03 Capital, 05 Cuprum, 06 Habitat, 08 Planvital, 11 Provida, 33 Modelo, 34 Uno).
- **No existe tabla `lre_concept_codes`** — los ~50 conceptos LRE (2101 Sueldo base, 2126 bonificacion variable, 2161 colacion, 2162 movilizacion, 2191 gratificacion legal, 3141 AFP, 3143 Salud, 3151 Cesantia empleado, 3171 IUSC, 3181 APV, etc.) no estan declarados.
- **No hay mapeo codigo Isapre/FONASA** — `chile_health_system` es string libre, no esta mapeado a codigo Previred (FONASA=07; Banmedica=02, Consalud=03, Vida Tres=04, Colmena=05, etc.).
- **No hay codigo movement type** (1=ingreso, 2=egreso, 3=subsidio licencia, 11=licencia medica) — derivable de `members.start_date`/`end_date` cruzado con periodo + `days_on_leave`, pero no implementado.
- **No hay calculo de Horas Extras** en el motor (`chile_horas_extras_*_amount` no existe en `payroll_entries`). Slice 2 emite `0` con warning explicito al operador.
- **No existe XSD oficial DT** commiteado en el repo.
- **No existe reliability signal** que detecte drift entre archivo emitido y `payment_order` materializado.
- **Endpoint export actual no separa por formato compliance** — solo Excel/CSV/PDF, sin TXT Previred ni XML LRE.
- **Capabilities `hr.payroll.export_previred` + `hr.payroll.export_lre` no existen.**

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE (no llenar al crear la task)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Planilla Previred TXT

**Objetivo**: operador descarga `previred-AAAAMM.txt` listo para upload directo en `previred.cl` para todos los `chile_dependent` del periodo `exported`.

Entregables:

- Migration `task-812-previred-institution-codes`:
  - Tabla `greenhouse_payroll.previred_institution_codes` con columnas `(institution_kind, internal_name, previred_code, display_name, active)`.
  - `institution_kind` ∈ `'afp' | 'isapre' | 'fonasa'`.
  - Seed: 7 AFPs (Capital=33, Cuprum=03, Habitat=05, Modelo=34, Planvital=29, Provida=08, Uno=35) `[verificar codigos exactos contra Previred]` + 8 isapres + FONASA=07.
  - Owner `greenhouse_ops`, grants `greenhouse_runtime` SELECT.
- `src/lib/payroll/exports/previred-institution-codes.ts`:
  - Helper `getPreviredAfpCode(afpName: string): string` con fallback explicit error si no mapea.
  - Helper `getPreviredHealthCode(healthSystem: string): string`.
  - Tests cubren las 7 AFPs + FONASA + 3 isapres principales.
- `src/lib/payroll/exports/chile-previred-planilla.ts`:
  - Funcion pura `generatePreviredPlanilla(periodId): Promise<{ filename: string; content: string; encoding: 'latin1'; recordCount: number; totalClp: number }>`.
  - Lee `payroll_entries` (filter `pay_regime='chile' AND payroll_via='internal' AND contract_type_snapshot IN ('indefinido','plazo_fijo')`).
  - Para cada entry resuelve RUT via `readPersonLegalSnapshot({useCase:'payroll_chile_dependent'})` (TASK-784).
  - Emite TXT posicional segun layout oficial Previred (`[verificar layout exacto durante Discovery]`).
  - Codifica ASCII Latin-1 (no UTF-8) con CRLF como line separator.
  - Calcula `recordCount` y `totalClp` para audit.
- `src/lib/payroll/exports/chile-previred-planilla.test.ts`:
  - Test paridad: `SUM(planilla.previred_total_per_row) === calculatePreviredEntryBreakdown.total` para fixture conocido.
  - Test paridad financiera vs `payment_order` social_security del mismo periodo.
  - Test regresion por AFP: las 7 AFPs producen su codigo numerico correcto.
  - Test edge case `honorarios` excluidos (no aparecen en planilla).
  - Test edge case `international` excluidos.
  - Test edge case sin RUT verificado: el generador throw con error claro.
  - Test encoding ASCII Latin-1: caracteres tildados se preservan (`á`, `ñ`, `ü`).
- Endpoint `GET /api/hr/payroll/periods/[periodId]/export/previred`:
  - Capability `hr.payroll.export_previred` (HR route_group + FINANCE_ADMIN + EFEONCE_ADMIN).
  - Solo permite cuando `period.status IN ('approved','exported')`.
  - Emite `Content-Type: text/plain; charset=ISO-8859-1`, `Content-Disposition: attachment; filename="previred-AAAAMM.txt"`.
  - Errores sanitizados via `redactErrorForResponse`.
- Outbox event `payroll.export.previred_generated` v1 con payload `{ periodId, periodYear, periodMonth, recordCount, totalClp, generatedBy, sha256 }`.
- UI: boton "Descargar Planilla Previred" en `PayrollPeriodView` (`[verificar ruta exacta]`) junto al boton Excel/CSV existente. Disabled cuando `period.status !== 'exported'` con tooltip canonico.
- Doc funcional `docs/documentation/hr/exports-compliance-chile.md` (Slice 1 only).
- Manual operador `docs/manual-de-uso/hr/exportar-planilla-previred-y-lre.md` (Slice 1 only).

### Slice 2 — LRE XML Direccion del Trabajo

**Objetivo**: operador genera `lre-AAAAMM-spaceXX.xml` validado contra XSD oficial DT, listo para declaracion mensual en `lre.dt.gob.cl`.

Entregables:

- Schema XSD oficial DT commiteado en `docs/compliance/dt/lre-schema-v3.xsd` `[verificar version vigente al cierre de Slice 2]`.
- Migration `task-812-lre-concept-codes`:
  - Tabla `greenhouse_payroll.lre_concept_codes` con columnas `(concept_code, concept_kind, concept_label, active)`.
  - `concept_kind` ∈ `'haber_imponible' | 'haber_no_imponible' | 'descuento_legal' | 'descuento_voluntario' | 'aporte_empleador'`.
  - Seed inicial ~50 conceptos canonicos `[verificar listado oficial DT vigente]`:
    - **Haberes imponibles**: 2101 Sueldo base, 2102 Horas extras 50%, 2103 HE 100%, 2104 Comision, 2105 Sobresueldo, 2126 Bonificacion variable, 2191 Gratificacion legal Art. 50.
    - **Haberes no imponibles**: 2161 Colacion, 2162 Movilizacion, 2199 Otros no imponibles.
    - **Descuentos legales**: 3141 Cotizacion AFP, 3143 Cotizacion Salud (FONASA/Isapre), 3144 Cotizacion adicional voluntaria salud, 3151 Cotizacion Seguro de Cesantia trabajador, 3171 Impuesto unico segunda categoria, 3181 APV.
    - **Aportes empleador**: 4151 SIS empleador, 4152 AFC empleador, 4153 Mutual.
  - Owner `greenhouse_ops`, grants `greenhouse_runtime` SELECT.
- `src/lib/payroll/exports/lre-concept-mapping.ts`:
  - Tabla declarativa que mapea cada columna de `payroll_entries` a su `concept_code` LRE.
  - Ejemplos: `base_salary → 2101`, `chile_colacion_amount → 2161`, `chile_gratificacion_legal → 2191`, `chile_afp_amount → 3141`, `chile_health_amount → 3143`, `chile_unemployment_amount → 3151`, `chile_tax_amount → 3171`, `chile_apv_amount → 3181`, `chile_employer_sis_amount → 4151`, `chile_employer_cesantia_amount → 4152`, `chile_employer_mutual_amount → 4153`.
  - **NO inline branching** en el generador. Todo via la tabla.
- `src/lib/payroll/exports/chile-lre-libro.ts`:
  - Funcion pura `generateLreXml(periodId): Promise<{ filename: string; content: string; encoding: 'utf8'; recordCount: number; totalImponibleClp: number; totalDescuentosClp: number }>`.
  - Lee `payroll_entries` chile_dependent del periodo.
  - Para cada entry construye un `<Trabajador>` con sus `<Haberes>` + `<Descuentos>` mapeados via `lre-concept-mapping.ts`.
  - **Horas Extras emite `0`** con `<!-- WARNING: motor de calculo no computa HE — TASK follow-up requerida -->`.
  - **Vacaciones proporcionales en finiquito** se mapean a concepto 2192 cuando aplique (cruzado contra `final_settlement_documents`).
  - Encoding UTF-8 con declaracion XML estandar.
- Validacion XSD pre-emit:
  - Helper `validateLreXmlAgainstXsd(xml: string, xsdPath: string): ValidationResult` usando `xmllint` (build-time) o libreria pure-JS `[verificar opcion canonica durante Discovery]`.
  - Si validacion falla, throw error claro con linea + columna.
- `src/lib/payroll/exports/chile-lre-libro.test.ts`:
  - Test XSD validation: archivo emitido pasa schema oficial.
  - Test paridad financiera: `SUM(LRE.totalImponible)` vs `SUM(payroll_entries.chile_taxable_base)` para chile_dependent.
  - Test paridad descuentos: `SUM(LRE.descuentos_previsionales)` vs `payment_order.amount_clp` social_security.
  - Test edge case licencia medica: dias se reflejan en `<DiasLicencia>` correctamente.
  - Test edge case ingreso/egreso parcial: dias trabajados < dias periodo.
  - Test edge case finiquito en el periodo: vacaciones proporcionales aparecen como 2192.
  - Test edge case honorarios excluidos.
- Endpoint `POST /api/hr/payroll/periods/[periodId]/export/lre`:
  - Capability `hr.payroll.export_lre` (mismo allowedFor que Previred).
  - Solo cuando `period.status='exported'`.
  - Genera XML, valida XSD, persiste como asset privado (`assets.retention_class='hr_compliance_export'`), retorna asset id + download URL firmado.
  - Errores sanitizados.
- Reliability signal `payroll.lre.export_drift` en `src/lib/reliability/queries/payroll-lre-export-drift.ts`:
  - Detecta drift entre el ultimo XML LRE emitido por periodo y el `payment_order` social_security del mismo periodo.
  - Tolerancia $1 CLP (anti FP-noise).
  - Severity `error` cuando count > 0, steady = 0.
  - Subsystem rollup: `Payroll Compliance` (crear si no existe).
- Outbox event `payroll.export.lre_generated` v1 con payload `{ periodId, periodYear, periodMonth, assetId, recordCount, totalImponibleClp, totalDescuentosClp, sha256, xsdVersion }`.
- UI: boton "Generar LRE (DT)" en `PayrollPeriodView` con dialog que muestra resumen pre-emit (record count, total imponible, total descuentos) + warning explicito sobre Horas Extras = 0.
- Doc funcional + manual operador extendidos para Slice 2.
- Update `GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` §26 "Compliance Exports Chile" con contrato canonico de ambos exports.

## Out of Scope

- **DJ 1879 SII honorarios anual** — declaracion anual de pagos a honorarios. Queda como TASK separada follow-up. NO se mezcla aqui.
- **Integracion API directa con `previred.cl` o `lre.dt.gob.cl`** (upload programatico). El archivo se descarga manual y el operador hace el upload. Razon: APIs de upload no estan publicamente documentadas y requieren convenio formal previred/DT que excede el alcance.
- **Rectificacion / correccion de periodos ya declarados** ante DT/Previred. Si emerge necesidad, abre TASK separada con flujo de retraccion canonico.
- **Calculo de Horas Extras en el motor**. Slice 2 emite `0` con warning. La incorporacion de HE al motor de calculo es TASK follow-up explicita.
- **Otros formatos compliance** (LRE F30-1 finiquitos masivos, F1907 isapres, etc.). Solo Planilla Previred (cotizaciones) + LRE (libro mensual dependientes).
- **Migracion historica** de periodos pre-TASK-812 a estos formatos. Solo aplica a periodos `exported` futuros.
- **Reemplazo del Excel/CSV existentes**. Estos siguen vivos como exports operativos internos; los nuevos archivos son additivos para compliance externo.

## Detailed Spec

### Layout Planilla Previred (referencia)

**Formato**: TXT posicional ASCII Latin-1 (ISO-8859-1), CRLF line separator.
**Estructura por linea** (`[verificar layout exacto vigente al ejecutar la task — Previred publica updates]`):

```
Posiciones 1-11   : RUT trabajador con DV (sin guion ni puntos, padded zeros)
Posiciones 12-41  : Apellido paterno (30 chars, padded espacios derecha)
Posiciones 42-71  : Apellido materno (30 chars)
Posiciones 72-91  : Nombres (20 chars)
Posicion  92      : Sexo (M/F)
Posiciones 93-94  : Nacionalidad codigo (00=chilena)
Posiciones 95-96  : Tipo movimiento (00=sin mov, 01=ingreso, 02=retiro, ...)
Posiciones 97-104 : Fecha movimiento DDMMAAAA
Posiciones 105-106: Codigo AFP (03/05/06/08/11/33/34)
Posiciones 107-114: Renta imponible AFP (8 chars padded zeros izq)
Posiciones 115-122: Cotizacion AFP
Posiciones 123-130: SIS empleador
Posiciones 131-132: Codigo Isapre/FONASA
Posiciones 133-140: Renta imponible salud
Posiciones 141-148: Cotizacion salud (7%)
Posiciones 149-156: Cotizacion salud adicional
Posiciones 157-158: Codigo AFC
Posiciones 159-166: Renta imponible cesantia
Posiciones 167-174: Cotizacion AFC trabajador
Posiciones 175-182: Cotizacion AFC empleador
[... hasta 105 campos posicionales totales]
```

**Discovery requerido**: bajar el spec oficial vigente desde `https://www.previred.com/wp/biblioteca-virtual/` y commitearlo en `docs/compliance/previred/planilla-spec-vNN.pdf` para audit trail.

### Schema LRE (referencia)

**Formato**: XML UTF-8 contra XSD oficial DT. Estructura raiz aproximada:

```xml
<LRE xmlns="http://www.dt.gob.cl/lre" version="3">
  <Empleador>
    <RutEmpleador>...</RutEmpleador>
    <RazonSocial>...</RazonSocial>
    <Periodo>AAAAMM</Periodo>
  </Empleador>
  <Trabajadores>
    <Trabajador>
      <RutTrabajador>...</RutTrabajador>
      <Apellidos>...</Apellidos>
      <Nombres>...</Nombres>
      <DiasTrabajados>30</DiasTrabajados>
      <DiasLicencia>0</DiasLicencia>
      <Haberes>
        <Haber>
          <Codigo>2101</Codigo>
          <Monto>1500000</Monto>
        </Haber>
        <Haber>
          <Codigo>2191</Codigo>
          <Monto>96000</Monto>
        </Haber>
        <!-- ... -->
      </Haberes>
      <Descuentos>
        <Descuento>
          <Codigo>3141</Codigo>
          <Monto>165000</Monto>
        </Descuento>
        <!-- ... -->
      </Descuentos>
      <AportesEmpleador>
        <Aporte>
          <Codigo>4151</Codigo>
          <Monto>2100</Monto>
        </Aporte>
        <!-- ... -->
      </AportesEmpleador>
    </Trabajador>
  </Trabajadores>
</LRE>
```

**Discovery requerido**: bajar el XSD oficial vigente desde `https://www.dt.gob.cl/portal/1626/articles-122926_recurso_1.xsd` `[verificar URL vigente]` y commitearlo. Versionar (`lre-schema-v3.xsd`) para que cambios futuros queden trazables.

### Mapping payroll_entries → conceptos LRE (declarativo)

```ts
export const LRE_CONCEPT_MAPPING = [
  { sourceColumn: 'base_salary', conceptCode: '2101', kind: 'haber_imponible' },
  { sourceColumn: 'bonus_otd_amount', conceptCode: '2126', kind: 'haber_imponible' },
  { sourceColumn: 'bonus_rpa_amount', conceptCode: '2126', kind: 'haber_imponible' },
  { sourceColumn: 'bonus_other_amount', conceptCode: '2126', kind: 'haber_imponible' },
  { sourceColumn: 'chile_gratificacion_legal', conceptCode: '2191', kind: 'haber_imponible' },
  { sourceColumn: 'chile_colacion_amount', conceptCode: '2161', kind: 'haber_no_imponible' },
  { sourceColumn: 'chile_movilizacion_amount', conceptCode: '2162', kind: 'haber_no_imponible' },
  { sourceColumn: 'remote_allowance', conceptCode: '2199', kind: 'haber_no_imponible' },
  { sourceColumn: 'chile_afp_amount', conceptCode: '3141', kind: 'descuento_legal' },
  { sourceColumn: 'chile_health_obligatoria_amount', conceptCode: '3143', kind: 'descuento_legal' },
  { sourceColumn: 'chile_health_voluntaria_amount', conceptCode: '3144', kind: 'descuento_legal' },
  { sourceColumn: 'chile_unemployment_amount', conceptCode: '3151', kind: 'descuento_legal' },
  { sourceColumn: 'chile_tax_amount', conceptCode: '3171', kind: 'descuento_legal' },
  { sourceColumn: 'chile_apv_amount', conceptCode: '3181', kind: 'descuento_voluntario' },
  { sourceColumn: 'chile_employer_sis_amount', conceptCode: '4151', kind: 'aporte_empleador' },
  { sourceColumn: 'chile_employer_cesantia_amount', conceptCode: '4152', kind: 'aporte_empleador' },
  { sourceColumn: 'chile_employer_mutual_amount', conceptCode: '4153', kind: 'aporte_empleador' }
] as const
```

### Edge cases canonizados (cobertura de tests obligatoria)

1. **Honorarios excluidos**: `pay_regime='chile' AND contract_type_snapshot='honorarios'` → no aparecen en Previred ni LRE. Tests assert.
2. **International excluidos**: `pay_regime='international'` → no aparecen.
3. **Sin RUT verificado**: TASK-784 readiness gate falla → endpoint devuelve 412 con lista de members afectados, no genera archivo parcial.
4. **Licencia medica con subsidio Isapre/Compin**: dias `days_on_leave` se reflejan en `<DiasLicencia>`. El subsidio NO va en Previred (lo paga la entidad pagadora separada). Test verifica `chile_taxable_base` ya descontada proporcionalmente por motor.
5. **Ingreso del periodo** (`members.start_date` dentro del periodo): `tipo_movimiento=01` en Previred + `<DiasTrabajados>` parcial en LRE.
6. **Egreso del periodo** (`members.end_date` dentro del periodo, finiquito): `tipo_movimiento=02` en Previred + concepto LRE 2192 vacaciones proporcionales si aplica.
7. **Vacaciones**: dias `days_present` cubren tanto trabajados como vacaciones legales. No requieren concepto LRE separado.
8. **Gratificacion legal Art. 50**: ya computada en `chile_gratificacion_legal`, mapea directo a 2191.
9. **APV opcional**: separado en `chile_apv_amount`, mapea a 3181. Test cubre member con/sin APV.
10. **Horas Extras**: emite `0` con warning explicito + abre follow-up TASK.

### Reliability signal `payroll.lre.export_drift`

```ts
// src/lib/reliability/queries/payroll-lre-export-drift.ts
export async function getPayrollLreExportDrift(): Promise<ReliabilitySignal> {
  // Para cada periodo exported con LRE asset emitido en los ultimos 90 dias:
  //   1. Lee el ultimo XML LRE del periodo
  //   2. Suma sus descuentos previsionales (3141 + 3143 + 3144 + 3151 + 3181)
  //   3. Compara contra payment_order.amount_clp social_security del mismo periodo
  //   4. Drift > $1 CLP cuenta como issue
  // Subsystem: Payroll Compliance
  // Severity: error si count > 0
  // Steady: 0
}
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Migration `task-812-previred-institution-codes-and-lre-concept-codes` aplicada en PG dev + tipos regenerados via `pnpm db:generate-types`.
- [ ] Tabla `previred_institution_codes` poblada con 7 AFPs + 8 isapres + FONASA (16 filas activas minimo).
- [ ] Tabla `lre_concept_codes` poblada con ~50 conceptos canonicos vigentes a la fecha de cierre.
- [ ] XSD oficial DT commiteado en `docs/compliance/dt/lre-schema-v3.xsd` (o version vigente).
- [ ] Spec Previred commiteado en `docs/compliance/previred/planilla-spec-vNN.pdf`.
- [ ] Generador `generatePreviredPlanilla(periodId)` emite TXT ASCII Latin-1 con CRLF, layout posicional valido.
- [ ] Generador `generateLreXml(periodId)` emite XML UTF-8 que pasa validacion XSD oficial DT.
- [ ] Test paridad financiera Previred: `SUM(planilla.previred_total_per_row) === payment_order.amount_clp` para fixture conocido (delta = 0).
- [ ] Test paridad financiera LRE: `SUM(LRE.descuentos_previsionales)` matches `payment_order.amount_clp` social_security (delta < $1 CLP).
- [ ] Test regresion 7 AFPs: cada AFP genera el codigo Previred numerico correcto.
- [ ] Test edge cases (10 escenarios) cubiertos en `chile-previred-planilla.test.ts` + `chile-lre-libro.test.ts`.
- [ ] Endpoint `GET /api/hr/payroll/periods/[id]/export/previred` responde 200 con TXT correcto + 412 cuando RUT readiness falla + 403 sin capability.
- [ ] Endpoint `POST /api/hr/payroll/periods/[id]/export/lre` responde 200 con asset id + download URL firmado.
- [ ] Capabilities `hr.payroll.export_previred` + `hr.payroll.export_lre` agregadas a `src/lib/auth/capabilities.ts` y gated por route_group=hr / FINANCE_ADMIN / EFEONCE_ADMIN.
- [ ] UI `PayrollPeriodView` muestra botones "Descargar Planilla Previred" y "Generar LRE (DT)" — disabled fuera de `status='exported'` con tooltip canonico.
- [ ] Outbox events `payroll.export.previred_generated` v1 + `payroll.export.lre_generated` v1 documentados en `GREENHOUSE_EVENT_CATALOG_V1.md` y emitidos por los endpoints.
- [ ] Reliability signal `payroll.lre.export_drift` registrado en `RELIABILITY_REGISTRY` y visible en `/admin/operations` con steady=0.
- [ ] Subsystem `Payroll Compliance` creado (o atado a uno existente) con rollup correcto.
- [ ] Doc funcional `docs/documentation/hr/exports-compliance-chile.md` creado.
- [ ] Manual operador `docs/manual-de-uso/hr/exportar-planilla-previred-y-lre.md` creado con pasos + permisos + troubleshooting.
- [ ] Update `GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` §26 con contrato canonico Compliance Exports.
- [ ] Honorarios y `pay_regime='international'` excluidos verificadamente de ambos archivos (tests assert).
- [ ] Horas Extras emiten `0` en LRE con warning explicito visible al operador y follow-up TASK creada.
- [ ] No hay regresion en `pnpm test` sobre `src/lib/payroll/**` ni en exports existentes Excel/CSV/PDF.

## Verification

- `pnpm migrate:up` aplica migration nueva sin errores.
- `pnpm db:generate-types` regenera tipos limpio.
- `pnpm vitest run src/lib/payroll/exports` — todos los tests pasan.
- `pnpm exec eslint src/lib/payroll/exports src/app/api/hr/payroll/periods/[periodId]/export` — lint limpio.
- `pnpm exec tsc --noEmit --pretty false` — typecheck limpio.
- `xmllint --schema docs/compliance/dt/lre-schema-v3.xsd <archivo-emitido>.xml --noout` — validacion XSD pasa contra fixture.
- `pnpm staging:request /api/hr/payroll/periods/<periodId>/export/previred --output previred.txt` y verificar primer linea cumple layout.
- `pnpm staging:request POST /api/hr/payroll/periods/<periodId>/export/lre '{}' --pretty` y descargar asset emitido.
- Test reconciliacion manual: `SUM(planilla)` vs `payment_order.amount_clp` social_security del mismo periodo (delta esperado = 0).
- `pnpm pg:doctor` verde post-migration.
- `pnpm build` sin errores.
- `pnpm design:lint` 0 errors / 0 warnings (UI changes).

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado con estado real (`in-progress` al tomarla, `complete` al cerrarla).
- [ ] Archivo en carpeta correcta (`to-do/` → `in-progress/` → `complete/`).
- [ ] `docs/tasks/README.md` sincronizado con cierre.
- [ ] `Handoff.md` actualizado con sesion + decisiones materiales.
- [ ] `changelog.md` actualizado (cambia comportamiento operativo + agrega capabilities + rutas API).
- [ ] Chequeo de impacto cruzado:
  - [ ] TASK-784 referenciada como blocker resuelto.
  - [ ] TASK-707a actualizada con nota delta sobre paridad asegurada via TASK-812.
  - [ ] TASK-414 actualizada (`previred_declared_check` cobra significado real).
- [ ] `GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` §26 escrito y referenciado desde CLAUDE.md "Reglas duras" Compliance Exports Chile.
- [ ] Follow-up TASK creada para incorporar Horas Extras al motor de calculo.
- [ ] Follow-up TASK creada para DJ 1879 SII honorarios anual (out of scope explicito).

## Follow-ups

- **TASK-### — Payroll Chile Horas Extras Calculation** (motor agrega columnas `chile_horas_extras_50_amount` + `chile_horas_extras_100_amount` + atajos en `payroll_entries`; LRE empieza a emitir conceptos 2102/2103 con valor real).
- **TASK-### — DJ 1879 SII Retencion Honorarios Anual** (declaracion anual de pagos honorarios al SII; out of scope de TASK-812 por escala temporal distinta).
- **TASK-### — Upload programatico Previred/DT** (si emerge convenio formal con previred.cl o DT que permita upload via API; hoy fuera de alcance por falta de API publica documentada).
- **TASK-### — Audit log compliance exports + retraccion canonica** (flujo formal cuando un periodo declarado deba ser rectificado; vincula con `payroll_period_reopen_audit`).
- **TASK-### — F30-1 finiquitos masivos DT** (declaracion electronica de finiquitos cuando aplique; complementa TASK-761/762).

## Open Questions

- **Layout Previred vigente**: confirmar si la posicion 95-96 movimiento sigue activa en spec 2026 o cambio a otro rango. Discovery requerido bajando el PDF oficial.
- **Schema LRE version**: confirmar si la version vigente es v3 (2021) o si la DT publico v4 actualizada. Verificar en `lre.dt.gob.cl` durante Discovery.
- **Codigo Planvital**: registry interno mostro 29 vs 08 en distintas fuentes. Confirmar contra `previred.com` oficial al cerrar Slice 1.
- **XSD validation library**: decidir entre invocar `xmllint` shell-out (depende de `libxml2` en runtime) vs libreria pure-JS (`fast-xml-parser` + manual schema asserts vs `libxmljs2`). Recomendado: `xmllint` build-time + `fast-xml-parser` runtime para emit, dado que el archivo se genera y descarga (no necesita validar XSD en cada request).
- **Subsystem `Payroll Compliance`**: confirmar si crear nuevo subsystem en `RELIABILITY_REGISTRY` o si rolea bajo `Payroll Operations` existente.
- **Asset retention class**: confirmar si `hr_compliance_export` ya existe o crear nueva en `assets.retention_class` enum (vinculado a TASK-721 evidence canonical uploader patron).
