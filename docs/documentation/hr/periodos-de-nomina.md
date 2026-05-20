# Periodos de Nomina

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.2
> **Creado:** 2026-04-30 por Codex
> **Ultima actualizacion:** 2026-05-16 por Claude Opus (TASK-893 — payroll participation window V1 SHIPPED Slices 1-5)
> **Documentacion tecnica:** [GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md)
> **ADR relacionado:** [GREENHOUSE_WORKFORCE_EXIT_PAYROLL_ELIGIBILITY_V1.md](../../architecture/GREENHOUSE_WORKFORCE_EXIT_PAYROLL_ELIGIBILITY_V1.md)

---

## Que es un periodo de nomina

Un periodo de nomina es el objeto que representa el **mes imputable** sobre el cual Greenhouse calcula la nomina oficial.

Incluye, entre otros, estos datos base:

- `year`
- `month`
- `ufValue`
- `taxTableVersion`
- `status`

El sistema usa esos valores para determinar indicadores economicos, reglas de impuesto y calculo de entries.

---

## Regla funcional importante

`year` y `month` representan el mes imputable real del periodo. No son solo una etiqueta visual.

Por eso, cuando se corrige el mes o el año de un periodo no exportado, Greenhouse reinicia el periodo a borrador y obliga a recalcular.

---

## Como se resuelve la tabla tributaria Chile

Si el periodo incluye colaboradores Chile, Greenhouse necesita una `taxTableVersion` valida para el mes imputable.

### Comportamiento actual

- La version canonica esperada sigue el patron `gael-YYYY-MM`.
- El operador ya no necesita escribirla manualmente al crear el periodo.
- Greenhouse intenta resolver automaticamente la tabla sincronizada de ese mes.
- Si no encuentra la version canonica pero existe una unica version sincronizada para ese mes, puede reutilizar esa version.
- Si no existe ninguna tabla sincronizada para ese mes, el periodo igual puede crearse como borrador, pero el calculo Chile se bloquea despues con un error explicito.

### Por que existe ese bloqueo

El sistema no debe “adivinar” impuestos Chile ni degradar el calculo a `0`. Si falta la tabla del mes, el bloqueo protege el cierre de nomina y evita resultados contables incorrectos.

---

## Que hace Greenhouse automaticamente

Greenhouse intenta resolver la tabla tributaria:

- al crear el periodo
- al editar metadatos del periodo si no se define un override manual
- al construir el readiness
- al calcular o recalcular nomina Chile
- al cotizar compensacion reversa con dependencias tributarias Chile

Esto hace que el campo tributario pase de ser una exigencia de memoria del operador a una dependencia tecnica resuelta por el sistema cuando hay datos sincronizados.

---

## Override manual

`taxTableVersion` sigue existiendo porque hay casos avanzados donde un operador tecnico necesita fijar una version especifica.

Ese override no es el camino normal. Debe usarse solo si:

- hay una razon operativa excepcional
- existe una version sincronizada conocida
- el equipo tecnico pidio usarla explicitamente

Si el override apunta a una version que no existe para el mes, Greenhouse rechaza el cambio.

---

## Relacion con UF y UTM

- `UF` se sigue resolviendo automaticamente para el mes imputable.
- `UTM` se resuelve en el calculo usando el mismo mes tributario validado.
- `taxTableVersion`, `UF` y `UTM` deben corresponder al mismo periodo imputable para que el calculo Chile sea consistente.

---

## Efecto en la experiencia operativa

Antes:

- el operador veia un input ambiguo
- el placeholder sugeria un formato viejo (`SII-*`)
- podia parecer obligatorio conocer un identificador interno

Ahora:

- el modal de creacion muestra una version esperada informativa
- el backend intenta resolver la tabla automaticamente
- el sistema avisa con claridad si falta sincronizacion antes del calculo
- el override manual queda confinado a edicion avanzada del periodo

---

## Elegibilidad, readiness y entries materializadas

Un punto importante del modulo es que **elegibilidad de calculo** y **entries ya generadas** no son la misma cosa.

- Un periodo en `borrador` puede tener colaboradores elegibles aunque todavia no existan `payroll_entries`.
- El readiness calcula ese roster elegible usando compensaciones vigentes del mes.
- Las `entries` aparecen solo despues de ejecutar `Calcular`.

Por eso, ver un periodo en borrador con roster elegible no significa que la nomina ya exista; significa que Greenhouse ya sabe a quien incluir cuando el periodo quede listo para calcular.

---

## Cuando KPI ICO realmente bloquea

Greenhouse ya no trata los KPI faltantes como una alerta generica para todos.

Ahora los KPI ICO solo son obligatorios cuando:

- la compensacion del colaborador usa bono variable real (`OTD` o `RpA`)
- y ese bono forma parte del calculo de nomina del periodo

Esto evita falsos positivos en casos como:

- honorarios sin bono KPI
- compensaciones sin exposicion a `OTD` ni `RpA`

Si falta KPI para un colaborador que **si depende** de bono variable, el periodo queda bloqueado antes del calculo oficial.

Los colaboradores internacionales/Deel tambien pueden requerir KPI ICO si tienen bono `OTD` o `RpA`. Ese KPI solo alimenta el bono operativo registrado en Greenhouse; no convierte la entry en payroll estatutario Chile.

---

## Cuando asistencia o licencias realmente bloquean

Las senales de asistencia/licencias tampoco se revisan ya como si aplicaran a todos por igual.

Solo se consideran requeridas cuando la asistencia puede cambiar el monto calculado de la nomina, por ejemplo en colaboraciones internas donde:

- no es `honorarios`
- no se procesa via `Deel`
- y la compensacion requiere control de asistencia

Esto evita marcar como faltantes casos donde el propio motor no prorratea por asistencia.

Si la asistencia o licencias son requeridas para el calculo y no existe senal confiable del periodo, Greenhouse bloquea el calculo oficial en vez de asumir una nomina optimista.

---

## Fronteras de regimen Payroll

Greenhouse separa cuatro familias de calculo:

- `Chile dependiente`: aplica AFP, salud, Seguro de Cesantia, SIS, mutual, APV e Impuesto Unico cuando corresponde.
- `Honorarios`: aplica retencion SII del anio de emision y no aplica descuentos de trabajador dependiente.
- `Internacional/Deel`: registra compensacion y bonos operativos, pero no aplica payroll estatutario Chile.
- `Internacional interno`: registra compensacion y bonos operativos en nómina interna, sin Deel ID y sin descuentos Chile. Es un perfil operacional controlado por capability y requiere referencia de revisión legal por colaborador.

Desde `TASK-744`, cada entry guarda un `contract_type_snapshot` para auditar que el calculo no cambie de regimen despues de materializarse.

Si el readiness detecta que una entry ya calculada mezcla regimenes incompatibles, bloquea aprobacion/export y pide recalcular. Esto evita aprobar una nomina que combine, por ejemplo, retencion SII de honorarios con AFP/salud/cesantia de trabajador dependiente.

Melkin Hernandez, Daniela Ferreira y Andres Carlosama deben mantenerse como internacionales/Deel salvo que exista allowlist y revisión HR/Finance/Legal explícita para migrarlos a `international_internal`. Si tienen bono variable, siguen requiriendo KPI ICO, pero no deben recibir deducciones Chile.

## Como se ve el recibo segun el regimen (TASK-758)

Desde `RECEIPT_TEMPLATE_VERSION = '4'` (2026-05-04) Greenhouse emite el recibo individual con un contrato visual canonico distinto por regimen. Tanto la vista previa que ve el operador como el PDF descargable que recibe el colaborador renderizan exactamente el mismo layout.

| Regimen | Que ve el colaborador |
| --- | --- |
| Chile dependiente (`indefinido`/`plazo_fijo`) | Bloque "Descuentos legales" completo: AFP con cotizacion + comision separadas, salud obligatoria 7% + voluntaria si la hay, seguro cesantia, impuesto unico, APV cuando aplica. Si la compensacion incluye gratificacion legal, aparece como haber explicito. |
| Honorarios | Bloque "Retencion honorarios" con Tasa SII + monto retenido. Nota informativa "Boleta de honorarios Chile · Art. 74 N°2 LIR". No aparecen filas de AFP, salud, cesantia ni impuesto unico. |
| Contractor o EOR via Deel | Sin bloque de descuentos legales. Aparece la nota "Pago administrado por Deel" explicando que el liquido legal lo emite Deel en la jurisdiccion del trabajador, mas el `Contrato Deel` cuando esta registrado. Hero dice "Monto bruto registrado". |
| Internacional interno (sin Deel) | Sin bloque de descuentos legales. Aparece la nota "Regimen internacional · Sin descuentos previsionales Chile". El tipo se selecciona solo si el operador tiene capability `payroll.contract.use_international_internal` y registra una referencia legal válida. |
| Excluido del periodo | El recibo se emite igual con un banner rojo explicando la causa, omite haberes/asistencia/descuentos, y el hero pasa a estado "Sin pago este periodo · $0" en gris. |

Cualquier nuevo tipo de contrato debe declarar primero su comportamiento de recibo en `src/lib/payroll/receipt-presenter.ts` antes de mergear codigo — el helper canonico tiene un `never`-check que rompe build sin esa rama.

## Reporte mensual y export Excel para el operador (TASK-782)

El PDF del reporte mensual y el archivo Excel que descarga el operador despues de aprobar el periodo separan las cuatro familias de regimen en grupos independientes con subtotales no mezclados.

| Que aparece | Donde |
| --- | --- |
| Contadores `# CL-DEP / # HON / # DEEL / # INT` con la cantidad de colaboradores por regimen | summary strip del PDF + hoja `Resumen` del Excel |
| Columnas separadas `Desc. previs.` y `Retencion SII` | tabla del PDF + hoja `Chile` del Excel |
| Subtotales `Total descuentos previsionales` (solo dependientes) y `Total retencion SII honorarios` (solo honorarios) | PDF + Excel |
| Hoja `Chile` con dos secciones internas (Chile dependiente + Honorarios) cuando ambos regimenes existen en el periodo | Excel |
| Hoja `Internacional` con dos secciones internas (Deel + interno) cuando ambos existen | Excel |
| Estado `excluido` visible en el PDF como fila con `$0` y chip `(excluido)` | PDF |

Para el operador esto significa que:

- al reconciliar el archivo contra Previred, mira el subtotal `Total descuentos previsionales` y solo encuentra cotizaciones reales (AFP, salud, cesantia, IUSC, APV).
- al reconciliar contra el F29 retenciones honorarios, mira el subtotal `Total retencion SII honorarios` y solo encuentra retenciones de boletas.
- los pagos Deel quedan en su propia hoja con el `Contrato Deel` cuando esta registrado, sin mezclar con retenciones Chile.

Si un regimen no tiene ningun colaborador en el periodo, su grupo y su contador se omiten completamente en lugar de aparecer con `0` (lectura mas limpia).

---

## Ventana de elegibilidad payroll por salida (TASK-890, desde 2026-05-15)

Cuando un colaborador tiene un caso de offboarding abierto, su inclusion en la nomina proyectada depende del lane del caso y del threshold canonico declarado en el resolver `resolveExitEligibilityForMembers`:

| Lane del caso (rule_lane) | Threshold de exclusion | Que ve el operador en nomina |
| --- | --- | --- |
| `internal_payroll` / `relationship_transition` | `status='executed'` AND cutoff `<` periodo | Excluido del periodo siguiente |
| `internal_payroll` / `relationship_transition` | `status='executed'` AND cutoff en periodo | Prorrateado hasta el ultimo dia laboral |
| `external_payroll` / `non_payroll` | `status IN ('approved','scheduled','executed')` AND cutoff en periodo | Excluido de nomina interna (proveedor maneja el cierre afuera) |
| `external_payroll` / `non_payroll` | `status IN ('approved','scheduled','executed')` AND cutoff `<` periodo | Excluido completo |
| `identity_only` | N/A | Sigue full_period (identity no gobierna payroll) |
| `unknown` | conservador | Sigue full_period + warning de clasificacion |

El **cutoff canonico** = `COALESCE(last_working_day, effective_date)`. Esto respeta los CHECK constraints de schema TASK-760: `effective_date` esta poblado desde `approved+` y `last_working_day` desde `scheduled+`.

**Por que internal_payroll exige `executed`**: el finiquito Chile dependiente (TASK-862/863) requiere documento emitido + ratificado antes de cerrar formalmente. Greenhouse paga hasta el ultimo dia. Mantener el threshold en `executed` preserva el contract legal.

**Por que external_payroll alcanza con `approved`**: Greenhouse NO paga la nomina — la paga el proveedor externo (Deel, EOR). Esperar `executed` para un evento que vive afuera del runtime Greenhouse es deuda operativa permanente sin ganancia.

### Feature flag para cutover staged

Esta logica vive detras de `PAYROLL_EXIT_ELIGIBILITY_WINDOW_ENABLED` (default `false` V1.0):

- `false` (default): el reader `pgGetApplicableCompensationVersionsForPeriod` mantiene el gate legacy bit-for-bit (`status='executed' AND last_working_day < periodStart`). El comportamiento es identico al pre-TASK-890.
- `true` (post staging shadow compare ≥7d con Maria-fixture verde + signal `payroll.exit_window.full_month_projection_drift` count=0 sostenido): el reader post-filtra via el resolver canonico aplicando la matriz completa.

Patron heredado de `PAYROLL_WORKFORCE_INTAKE_GATE_ENABLED` (TASK-872).

### Caso fuente disparador

Maria Camila Hoyos, caso `EO-OFF-2026-0609A520`, lane `external_payroll`/Deel `last_working_day=2026-05-14`. Pre-TASK-890 aparecia full-month USD 530 en nomina proyectada mayo 2026 porque el gate inline solo excluia `executed`. Post-TASK-890 (con flag activo + case en `approved`): excluida del periodo via `projectionPolicy='exclude_from_cutoff'`.

## Ventana de participacion payroll por ingreso/vigencia (TASK-893, V1 SHIPPED 2026-05-16)

**Estado**: V1 SHIPPED a `develop` con flag `PAYROLL_PARTICIPATION_WINDOW_ENABLED=false` default en todos los ambientes. Comportamiento legacy preservado bit-for-bit hasta que el operador flippee el flag.

### Que resuelve

Antes de TASK-893: Greenhouse descubria el roster mensual por solape de compensacion (`effective_from <= fin de mes` y `effective_to >= inicio de mes`), pero NO prorrateaba automaticamente a colaboradores que ingresaban a mitad del periodo. En `projected_month_end`, el factor de prorrateo legacy era `1` salvo que existieran ajustes de asistencia.

Eso explicaba casos como Felipe Zurita: compensacion inicia dia 13, sistema legacy mostraba mes completo en nomina proyectada.

Despues de TASK-893: cuando el operador active el flag, Greenhouse calcula una **ventana de participacion canonica** por colaborador y periodo:

```text
eligibleFrom = max(periodStart, compensation.effective_from)
eligibleTo   = min(periodEnd, compensation.effective_to, TASK-890 exit cutoff si aplica)
```

Y aplica un `prorationFactor = countWeekdays(eligibleFrom, eligibleTo) / countWeekdays(periodStart, periodEnd)` que se inyecta en la compensacion ANTES del calculo de nomina (no como rescale post-hoc). Esto asegura que deducciones Chile + gratificacion legal + retencion SII se recomputan correctamente desde el bruto prorrateado.

### Que cubre el calculo

V1 cubre los 4 regimenes canonicos:

| Régimen | Que escala con el factor | Que NO escala (preservado contractual) |
| --- | --- | --- |
| `chile_dependent` | base salary + remote allowance + bono fijo + caps bonos KPI + APV. Deducciones AFP/salud/cesantia/IUSC se recomputan desde gross prorrateado. Gratificacion legal cap mensual respetada. | Colacion + movilizacion (asignaciones no imponibles fijas, jurisprudencia chilena Art 50 CT) |
| `honorarios` | base honorarios. Retencion SII Art 74 N°2 LIR se recomputa desde gross prorrateado | (mismo) |
| `international_deel` | base USD; Deel reconcilia el pago real | (mismo) |
| `international_internal` | base salary + componentes; sin deducciones Chile | (mismo) |

### Politica legal explicita

- **Gratificacion legal Art 50 CT mes parcial**: cap MENSUAL (4.75 × IMM ÷ 12, aprox. $213,354 en 2026) NO se prorratea. El calculator canonico clampea al cap monthly sobre el gross prorrateado (validado por payroll-auditor 2026-05-16 contra fixtures sintéticos high/low salary). Si HR decide que entry month = `$0` gratificacion (Dictamen DT 2937/050), debe setear `gratificacionLegalMode='ninguna'` en la compensacion (override manual).
- **Asignaciones no imponibles**: colacion y movilizacion son montos fijos mensuales pactados contractualmente. NO se prorratean automaticamente al ingreso/salida — la decision de prorratear es contractual del operador HR.
- **IMM piso legal**: Greenhouse respeta IMM mensual completo en el contrato. Para mes parcial (entry/exit mid-month), la base prorrateada puede caer bajo IMM full pero NO viola IMM proporcional por dias trabajados (DT 4423/156 2001).
- **Boleta honorarios mid-month**: el colaborador honorarios debe emitir su boleta por el bruto **prorrateado** (no el contrato full) para que la retencion SII declarada en F29 cuadre con el DTE 41. Comunicar a colaboradores afectados.

### Regla importante

Los dias previos al ingreso no son ausencia. No alimentan `days_absent`, licencias ni readiness de asistencia. Son **no-participacion payroll** y se prorratean via la primitive canonica `PayrollParticipationWindow`.

### Estado del flag y pre-flag-ON gates

- `PAYROLL_PARTICIPATION_WINDOW_ENABLED=false` default en cualquier ambiente.
- Requiere `PAYROLL_EXIT_ELIGIBILITY_WINDOW_ENABLED=true` (TASK-890) en el mismo ambiente. Sin esa pre-condicion, la ventana emite warning `exit_resolver_disabled` por miembro afectado.
- Activacion productiva requiere: capability `payroll.period.force_recompute` shippeada, 5 Open Questions resueltas con HR/Finance/Legal signoff, staging shadow compare >=7d verde, allowlist explicita de members documentada en `Handoff.md`.

### Observabilidad canonica (Slice 5)

3 reliability signals bajo subsystem `Finance Data Quality` (visibles en `/admin/operations`):

- `payroll.participation_window.full_month_entry_drift`: detecta members con effective_from mid-period que pagaron full month gross. Bajo flag OFF = informativo; bajo flag ON = regresion real.
- `payroll.participation_window.source_date_disagreement`: detecta drift > 7 dias entre `compensation.effective_from` y `onboarding.start_date`. Data-driven trigger para V1.1 onboarding-source decision.
- `payroll.participation_window.projection_delta_anomaly`: V1.0 honest degradation (severity=unknown). V1.1 wireara shadow compare.

> Detalle tecnico: `docs/architecture/GREENHOUSE_PAYROLL_PARTICIPATION_WINDOW_V1.md` + `src/lib/payroll/participation-window/`.

## Referencias

- [GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md)
- [GREENHOUSE_WORKFORCE_EXIT_PAYROLL_ELIGIBILITY_V1.md](../../architecture/GREENHOUSE_WORKFORCE_EXIT_PAYROLL_ELIGIBILITY_V1.md)
- [GREENHOUSE_PAYROLL_PARTICIPATION_WINDOW_V1.md](../../architecture/GREENHOUSE_PAYROLL_PARTICIPATION_WINDOW_V1.md)
- [Manual de uso — Periodos de nomina](../../manual-de-uso/hr/periodos-de-nomina.md)
- [Documentacion — Offboarding](./offboarding.md)
