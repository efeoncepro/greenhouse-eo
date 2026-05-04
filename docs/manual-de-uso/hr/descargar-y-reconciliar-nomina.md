# Manual de uso — Descargar y reconciliar la nomina mensual

> **Tipo de documento:** Manual operativo (paso a paso)
> **Version:** 1.0
> **Creado:** 2026-05-04 por TASK-758 + TASK-782 closing
> **Audiencia:** Operador HR / compliance / contabilidad

## Para que sirve

Despues de calcular y aprobar un periodo de nomina, Greenhouse genera tres tipos de archivos que se usan en distintos momentos:

- **Recibos individuales** (PDF por colaborador) — para enviar al colaborador y para auditoria interna.
- **Reporte mensual** (PDF landscape) — vista ejecutiva para gerencia/contabilidad con totales por regimen.
- **Excel del periodo** — el archivo que se comparte con contabilidad/SII/PREVIRED para reconciliar.

Este manual explica como obtenerlos, que esperar de cada uno, y como leer los totales para reconciliar contra Previred (cotizaciones) y F29 (retencion honorarios) sin manipular el archivo.

## Antes de empezar

Necesitas:

- Acceso a `HR > Nomina mensual` (rol `hr_payroll` o `efeonce_admin`).
- Un periodo en estado `Aprobado` o `Exportado`. Los periodos en `Borrador` o `Calculado` NO permiten descargar reporte ni Excel oficiales.
- Si vas a reconciliar contra Previred/F29, necesitas tu cuenta de operador en esos sistemas (no se hace dentro de Greenhouse).

## Paso a paso — Descargar el recibo de un colaborador

1. Entra a `HR > Nomina mensual`.
2. Selecciona el periodo del mes que necesitas (debe estar `Aprobado` o `Exportado`).
3. Busca al colaborador en la tabla del periodo.
4. Click en el icono de recibo de la fila del colaborador.
5. Se abre el dialog con la vista previa del recibo.
6. Click en `Descargar PDF`. El archivo se descarga inmediatamente.

Si es la primera vez que se descarga ese recibo despues del 4 de mayo de 2026, puede tardar uno o dos segundos extra mientras el portal regenera el PDF con la plantilla nueva (`v4`). Las descargas siguientes son instantaneas.

### Que esperar segun el regimen del colaborador

| Si el colaborador es | El recibo muestra |
| --- | --- |
| Indefinido o Plazo fijo | Bloque `Descuentos legales` con AFP (cotizacion + comision separadas), salud obligatoria 7% + voluntaria, seguro cesantia, impuesto unico, APV, gratificacion legal cuando aplica. |
| Honorarios | Bloque `Retencion honorarios` con tasa SII vigente y monto retenido. Nota "Boleta de honorarios Chile · Art. 74 N°2 LIR". |
| Contractor / EOR (Deel) | Sin bloque de descuentos. Nota "Pago administrado por Deel" + Contrato Deel cuando lo tenemos. Hero dice "Monto bruto registrado". |
| Internacional interno (sin Deel) | Sin bloque de descuentos. Nota "Regimen internacional · Sin descuentos previsionales Chile". |
| Excluido del periodo | Banner rojo con la causa, sin bloques de haberes/asistencia, hero gris "Sin pago este periodo · $0". |

## Paso a paso — Descargar el reporte mensual (PDF)

1. Entra a `HR > Nomina mensual`.
2. Selecciona el periodo aprobado.
3. Click en `Descargar reporte mensual` (boton del header del periodo, no de una fila).
4. Espera 2-5 segundos mientras se genera. El archivo se descarga con nombre `reporte-nomina-<mes>-<año>.pdf`.

### Que aparece en el reporte mensual

- **Cabecera**: logo + razon social + RUT + direccion + mes/año + ID periodo.
- **Strip de KPIs**: 8 indicadores — total colaboradores, estado, contadores per-regimen (`# CL-DEP`, `# HON`, `# DEEL`, `# INT`), bruto/neto CLP, bruto USD. Los contadores de regimenes con `0` colaboradores no aparecen.
- **Meta**: UF, UTM, fecha de aprobacion, version de tabla tributaria.
- **Tabla detallada**: 10 columnas (Nombre, Regimen, Moneda, Base, OTD, RpA, Bruto, Desc. previs., Retencion SII, Neto). Los colaboradores aparecen agrupados por regimen, con un divider entre cada grupo.
- **Subtotales por grupo**: uno por regimen presente (`Total Chile dependiente`, `Total Honorarios`, `Total Internacional Deel`, `Total Internacional interno`).

## Paso a paso — Descargar el Excel del periodo

1. Entra a `HR > Nomina mensual`.
2. Selecciona el periodo aprobado.
3. Click en `Descargar Excel` (boton del header del periodo).
4. Espera 2-5 segundos. Se descarga el archivo `nomina-<mes>-<año>.xlsx`.

### Que pestañas vas a ver

| Pestaña | Cuando aparece | Para que sirve |
| --- | --- | --- |
| `Resumen` | Siempre | Vista ejecutiva con metadata + contadores per-regimen + 4 subtotales separados + totales por moneda. |
| `Chile` 🆕 | Solo si hay al menos un Chile dependiente o un honorario | Detalle 13 columnas con dos secciones internas (Seccion 1 Chile dependiente + Seccion 2 Honorarios). Subtotales separados con notas explicativas en celda. |
| `Internacional` 🆕 | Solo si hay al menos un Deel o un internacional interno | Detalle con dos secciones internas (Seccion 1 Deel con Contrato Deel + Seccion 2 internacional interno). |
| `Detalle` | Siempre | Audit raw — todas las columnas (incluyendo adjustments, override manual, exclusiones), todos los entries unificados, autoFilter habilitado para auditoria fina. |
| `Asistencia & Bonos` | Siempre | Dias habiles, presentes, ausentes, licencias, factores OTD/RpA, fuente del KPI (manual/ICO/Notion). |

## Como reconciliar contra Previred y F29

Esta es la lectura clave para el operador de compliance. **NO sumes celdas a mano** — el portal ya tiene los subtotales correctos.

### Reconciliacion mensual con Previred

Previred recibe las cotizaciones previsionales reales: AFP (cotizacion + comision), salud (Fonasa o Isapre obligatoria + voluntaria), seguro cesantia, impuesto unico, APV.

| Donde lo lees | Que valor leer |
| --- | --- |
| PDF reporte mensual | Subtotal `Total Chile dependiente` → columna `Desc. previs.` |
| Excel hoja `Resumen` | Fila `Total descuentos previsionales CLP` |
| Excel hoja `Chile` Seccion 1 | Fila `Total descuentos previsionales` |

Ese numero debe coincidir 1:1 con el archivo que sube Previred. Si difieren, escala a HR + Finanzas — el motor o la integracion Previred tienen un drift.

### Reconciliacion mensual con F29 retenciones honorarios

El SII recibe la retencion del 15.25% (2026) sobre las boletas de honorarios.

| Donde lo lees | Que valor leer |
| --- | --- |
| PDF reporte mensual | Subtotal `Total Honorarios` → columna `Retención SII` |
| Excel hoja `Resumen` | Fila `Total retencion SII honorarios CLP` |
| Excel hoja `Chile` Seccion 2 | Fila `Total retencion SII honorarios` |

Ese numero va en la linea de retenciones honorarios del F29. Tampoco se mezcla con cotizaciones — son boletas, no liquidaciones de sueldo.

### Reconciliacion con Deel

Greenhouse registra el bruto que se le envia a Deel. El liquido legal del trabajador en su pais lo emite Deel — no nosotros.

| Donde lo lees | Que valor leer |
| --- | --- |
| PDF reporte mensual | Subtotal `Total Internacional Deel` → columna `Bruto` (USD) |
| Excel hoja `Resumen` | Fila `Total bruto Internacional Deel USD` |
| Excel hoja `Internacional` Seccion 1 | Fila `Total Internacional Deel` |

Ese numero es lo que enviamos a Deel para que ellos procesen. La reconciliacion final con la jurisdiccion del trabajador es responsabilidad de Deel.

## Que significan los simbolos del archivo

- **`$0`** en una celda: aplica al regimen del colaborador pero el monto fue cero en este periodo (ej. APV de un colaborador que no tiene plan APV activo, o un bono OTD que no califico).
- **`—`** (em-dash gris) en una celda: la columna NO aplica a ese regimen (ej. AFP en un honorario, Tasa SII en un Chile dependiente). NO confundir con `$0`.
- **Chip rojo `(excluido)`** en la columna Nombre: el colaborador estuvo excluido del periodo (licencia medica completa o adjustment manual) — su fila aparece igual con `$0` en bruto/neto, pero no contribuye a los subtotales monetarios. Si que cuenta en el contador del regimen.
- **`▼ Sección N · ...`** en la hoja Chile o Internacional: divider visual entre las dos sub-secciones canonicas del regimen.

## Que NO hacer

- **No sumes celdas a mano** para crear "tu propio total". Los subtotales del PDF y el Excel ya estan calculados con la separacion canonica (previsional vs SII).
- **No mezcles `$0` con `—`** al transcribir a otros sistemas. Son distintos: `$0` = aplica pero cero; `—` = no aplica al regimen.
- **No edites el Excel** y lo subas al SII / Previred. Si necesitas modificar algo, reabre el periodo en Greenhouse via reliquidacion (TASK-409) y deja trazabilidad.
- **No descartes la hoja `Detalle`** pensando que las hojas `Chile` e `Internacional` la reemplazan. `Detalle` tiene auditoria fina con adjustments y override manual; las otras son agregados operativos. Las dos sirven para casos distintos.
- **No conviertas el PDF reporte mensual en Excel manualmente** copiando filas. Descarga el Excel directo desde el portal — tiene formato numerico correcto, autoFilter, comentarios en celda.

## Problemas comunes

### El recibo de un honorario muestra filas de AFP/Salud en blanco

Es un recibo legacy de plantilla `v3` (antes del 4 de mayo de 2026). El portal lo regenera automaticamente cuando el colaborador o el operador acceden al PDF la siguiente vez. Si urge, pidele al equipo de Payroll que lo re-genere desde el dialog del recibo (boton `Descargar PDF` ya dispara la regeneracion).

### El reporte mensual o el Excel muestra `Total descuentos CLP` (sin la palabra "previsionales")

Es un archivo legacy descargado antes del 4 de mayo de 2026. Re-aprueba o re-exporta el periodo y descarga de nuevo — el archivo nuevo tendra subtotales separados.

### Veo un colaborador que esperaba en el periodo pero no aparece

Verifica:

1. Su compensacion esta vigente en el mes del periodo (`compensation effective dates`).
2. No esta en estado `terminated` o `inactive` antes del primer dia del periodo.
3. No esta excluido del periodo via adjustment (`Excluido = Sí` en hoja `Detalle`).

Si las tres se cumplen y aun asi no aparece, escala — puede ser un bug del roster.

### Los subtotales del Excel no cuadran con la suma manual

Verifica que estas sumando solo las filas de la **misma seccion** dentro de la pestaña. La hoja `Chile` tiene dos secciones (dependientes + honorarios) con subtotales independientes. Sumar todas las filas de la hoja `Chile` mezclaria los dos regimenes — es el error que precisamente el archivo TASK-782 evita.

### Quiero pestañas separadas Chile dependiente / Honorarios en lugar de dos secciones internas

La decision canonica fue dos secciones en una sola pestaña Chile para preservar la lectura mensual unificada del operador. Si tu use case justifica pestañas separadas (compliance externo lo pide formalmente), abre un ticket — el refactor es trivial porque el helper canonico ya las separa.

### El recibo de un Deel dice "Monto bruto registrado" en vez de "Liquido a pagar"

Es intencional. El liquido legal en la jurisdiccion del trabajador (Colombia, España, etc.) lo emite Deel despues de aplicar las retenciones del pais — no Greenhouse. El recibo Greenhouse refleja el monto bruto registrado de nuestro lado, lo dice explicito en la nota "Pago administrado por Deel" y ofrece el `Contrato Deel` para trazabilidad.

## Referencias tecnicas

- [Documentacion funcional: recibos y reporte mensual](../../documentation/hr/recibos-y-reporte-mensual.md)
- [Documentacion funcional: periodos de nomina](../../documentation/hr/periodos-de-nomina.md)
- [Manual de uso: periodos de nomina](./periodos-de-nomina.md)
- [Spec de arquitectura: Payroll Period Outputs V1](../../architecture/GREENHOUSE_PAYROLL_PERIOD_OUTPUTS_V1.md)
- TASK-758 (recibo individual canonico): `docs/tasks/complete/TASK-758-payroll-honorarios-receipt-render-contract-hardening.md`
- TASK-782 (reporte mensual + Excel disaggregation): `docs/tasks/complete/TASK-782-payroll-period-report-excel-honorarios-disaggregation.md`
