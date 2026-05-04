# Recibos y reporte mensual de nomina

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-05-04 por TASK-758 + TASK-782 closing
> **Ultima actualizacion:** 2026-05-04
> **Documentacion tecnica:** [GREENHOUSE_PAYROLL_PERIOD_OUTPUTS_V1.md](../../architecture/GREENHOUSE_PAYROLL_PERIOD_OUTPUTS_V1.md)

## Que cubre este documento

Greenhouse genera tres artefactos visibles cuando un periodo de nomina se calcula y aprueba:

1. **El recibo individual** — lo que ve cada colaborador en `Mi Nomina` y lo que descarga como PDF.
2. **El PDF reporte mensual** — lo que descarga el operador HR / compliance al cierre de cada mes.
3. **El Excel del periodo** — el archivo que el operador comparte con contabilidad / SII / PREVIRED para reconciliar.

Los tres se construyen desde el mismo motor de calculo y respetan el mismo contrato visual canonico de cuatro regimenes.

## Los cuatro regimenes canonicos

Greenhouse separa a las personas que pagamos en cuatro familias. Cada regimen genera un recibo con bloques distintos porque la legislacion y la practica fiscal son distintas:

| Regimen | Quienes | Como se ve el recibo | Que ve compliance |
| --- | --- | --- | --- |
| Chile dependiente | `indefinido` + `plazo_fijo` | Bloque `Descuentos legales` con AFP (cotizacion + comision separadas), salud obligatoria 7% + voluntaria, seguro cesantia, impuesto unico, APV. Si la compensacion incluye gratificacion legal, aparece como haber explicito. | Reconcilia contra Previred mensual (cotizaciones reales). |
| Honorarios | `honorarios` (boleta SII Art. 74 N°2 LIR) | Bloque `Retencion honorarios` con tasa SII vigente y monto retenido. Nota informativa "Boleta de honorarios Chile". No aparecen filas de AFP/salud/cesantia. | Reconcilia contra F29 retenciones honorarios. |
| Internacional Deel | `contractor` + `eor` (cualquier `payrollVia=deel`) | Sin bloque de descuentos. Nota "Pago administrado por Deel" + Contrato Deel cuando lo tenemos. Hero dice "Monto bruto registrado" porque el liquido legal lo emite Deel en la jurisdiccion del trabajador. | Pago se delega a Deel — Greenhouse solo registra el bruto. |
| Internacional interno | `payRegime='international'` sin Deel (caso excepcional) | Sin bloque de descuentos. Nota "Regimen internacional · Sin descuentos previsionales Chile". | Pago se procesa segun terminos del contrato internacional. |

Existe un quinto estado **terminal** que no es un regimen sino una situacion de un colaborador en un periodo:

- **Excluido del periodo**: el colaborador no acumulo dias imponibles (licencia medica completa, vacaciones sin goce que ocupan todo el mes, etc.). El recibo se emite igual con un banner rojo explicando la causa, omite haberes/asistencia/descuentos, y el hero pasa a estado "Sin pago este periodo · $0" en gris. En el reporte mensual aparece como una fila visible con chip `(excluido)` y monto `$0`.

## Como funciona el recibo individual

Cuando el colaborador entra a `Mi Nomina` o cuando el operador descarga el PDF de un recibo, el portal:

1. Lee el `PayrollEntry` ya calculado por el motor (no recalcula nada).
2. Resuelve el regimen del colaborador desde `contractTypeSnapshot` (con fallbacks defensivos para data legacy).
3. Construye una vista previa o un PDF con el bloque correspondiente al regimen.

La vista previa que ve el operador y el PDF que descarga el colaborador comparten exactamente la misma estructura — son consumidores del mismo contrato canonico. Si una columna esta presente en uno y ausente en otro, es un bug.

> Detalle tecnico: el helper canonico vive en `src/lib/payroll/receipt-presenter.ts` (`resolveReceiptRegime` + `buildReceiptPresentation`). El componente preview es `PayrollReceiptCard.tsx` y el PDF es `ReceiptDocument` dentro de `generate-payroll-pdf.tsx`. Cualquier cambio visual del PDF requiere bump del `RECEIPT_TEMPLATE_VERSION` y se regenera lazy en el proximo acceso.

### Que cambia respecto al recibo legacy

Antes de mayo 2026 el recibo de un honorario mostraba un bloque "Descuentos legales" con filas de AFP/Salud/Cesantia/IUSC en blanco — confuso para el colaborador y para el operador. Tambien los recibos Deel no aclaraban que el liquido lo emite Deel, y los chile dependientes no mostraban gratificacion legal o el split obligatoria/voluntaria de salud aunque el motor ya los calculaba.

Desde el 4 de mayo de 2026 (TASK-758) el contrato visual quedo canonizado por regimen y el `RECEIPT_TEMPLATE_VERSION` paso a `'4'`. Los recibos en cache se regeneran automaticamente en el proximo acceso.

## Como funciona el reporte mensual del operador

El reporte mensual es un PDF en orientacion landscape que el operador HR / compliance descarga despues de aprobar el periodo. Lo usa para:

- Verificar el universo del mes (cuantos colaboradores por regimen).
- Reconciliar totales contra Previred y F29.
- Compartir un agregado limpio con contabilidad sin entregar el detalle individual.

### Que aparece en el reporte mensual

```
Cabecera: logo + razon social + RUT + direccion
Periodo:  Mes Año
Title:    REPORTE DE NOMINA
Strip:    8 KPIs — colaboradores totales, estado del periodo, contadores
          per-regimen (# CL-DEP, # HON, # DEEL, # INT), bruto/neto CLP, bruto USD
Meta:     UF · UTM · Aprobado · Tabla tributaria
Tabla:    10 columnas — Nombre, Regimen, Moneda, Base, OTD, RpA, Bruto,
          Desc. previs., Retencion SII, Neto
Grupos:   Chile dependiente → Honorarios → Internacional Deel → Internacional interno
Totales:  un subtotal por regimen, mutuamente excluyente
```

Para cada regimen aparece una fila divider con el nombre del regimen + cantidad de colaboradores, las filas de cada persona, y al final el subtotal del grupo. Los grupos sin colaboradores se omiten completos (no aparecen como "0 colaboradores", desaparecen).

### Por que los subtotales estan separados

El motor de calculo asigna `chileTotalDeductions = siiRetentionAmount` para los honorarios. Esto es correcto a nivel motor (el "total descontado" de la liquidacion del honorario es la retencion SII), pero si el reporte sumara todo bajo un unico subtotal "Total descuentos Chile" mezclaria:

- Cotizaciones previsionales reales de Chile dependientes (lo que va a Previred).
- Retencion SII de boletas de honorarios (lo que va al SII via F29).

Por eso desde TASK-782 el reporte mensual emite **subtotales mutuamente excluyentes**:

- `Total descuentos previsionales` (solo Chile dependiente) → reconciliable 1:1 contra Previred.
- `Total retencion SII honorarios` (solo honorarios) → reconciliable 1:1 contra F29 retenciones honorarios.
- `Total Internacional Deel` (solo Deel, sin descuentos Chile).
- `Total Internacional interno` (solo internacional sin Deel).

Una columna que no aplica al regimen del entry se rellena con `—` en gris (no con `$0`) — la diferencia es importante: `$0` significa "aplica pero el monto es cero", `—` significa "no aplica al regimen".

## Como funciona el Excel del periodo

El Excel es el archivo que el operador comparte con contabilidad. Tiene cinco hojas canonicas:

| Hoja | Que contiene |
| --- | --- |
| `Resumen` | Metadata del periodo (mes, estado, UF) + contadores per-regimen + subtotales separados (`Total descuentos previsionales CLP`, `Total retencion SII honorarios CLP`) + totales por moneda. |
| `Chile` 🆕 | 13 columnas. Dos secciones internas: Seccion 1 Chile dependiente + Seccion 2 Honorarios. Cada seccion tiene su propio subtotal con un comentario (cell.note) explicando contra que se reconcilia. |
| `Internacional` 🆕 | 7 columnas. Dos secciones internas: Seccion 1 Internacional Deel (con columna `Contrato Deel`) + Seccion 2 Internacional interno (con columna `Jurisdiccion`). |
| `Detalle` | Audit raw — todas las columnas, todos los entries unificados, autoFilter habilitado. Sirve para auditoria fina y siempre esta disponible. |
| `Asistencia & Bonos` | Dias habiles, presentes, ausentes, licencias, factores OTD/RpA, montos de bonos, fuente del KPI. |

Las hojas `Chile` e `Internacional` se omiten **completas** del workbook si no hay colaboradores en ninguna de sus dos secciones internas. Esto mantiene el archivo limpio para periodos que solo contienen un regimen.

### Por que dos secciones en lugar de dos hojas separadas

Compliance lee el mes completo de Chile (dependientes + honorarios) en un solo flujo de scroll. Separarlo en dos hojas distintas fragmenta la lectura mensual sin ganar nada operativo. Las dos secciones internas con subtotales propios cumplen la misma funcion canonica (no mezclar) sin romper el use case de lectura.

Si compliance pide en el futuro pestañas separadas, el refactor es trivial — la separacion viene del helper canonico, no del layout.

## Lo que NO debe pasar (anti-patrones)

- **Subtotal unico "Total descuentos Chile"** mezclando cotizaciones con retencion SII. Si lo ves en un archivo, viene del periodo legacy `v3` (antes del 4 de mayo de 2026). Re-aprueba o re-exporta el periodo para regenerarlo.
- **Recibo de un honorario con filas de AFP/Salud en blanco**. Mismo motivo — re-genera el recibo (el portal lo hace automaticamente al proximo acceso).
- **Recibo Deel sin nota explicativa** del rol de Deel. Mismo motivo — regenerar.
- **Una columna `0` cuando deberia ser `—`** (o viceversa). Es un bug — reportalo.
- **Un colaborador excluido del periodo que no aparece en el reporte mensual**. Es un bug — el operador debe contar el universo completo, los excluidos se renderizan con $0 y chip warning.

## Por que los recibos legacy se regeneran solos

Cuando bump-eamos `RECEIPT_TEMPLATE_VERSION` (de `v3` a `v4` el 4 de mayo de 2026), los PDFs cacheados en GCS quedan etiquetados con la version vieja. La proxima vez que alguien accede a uno de esos PDFs, el portal compara la version cacheada contra la version vigente, y si difieren, regenera el PDF en background y entrega el nuevo. El colaborador no necesita hacer nada.

Para el reporte mensual y el Excel no hay version (se regeneran cada vez que el operador descarga), entonces el archivo siempre esta al dia.

## Como reconcilia el operador en la practica

| Reconciliacion | Donde leer | Pestaña/Bloque |
| --- | --- | --- |
| Previred (cotizaciones AFP/salud/cesantia/IUSC/APV) | PDF reporte mensual: subtotal `Total Chile dependiente` columna `Desc. previs.` · Excel: `Chile` Seccion 1 fila `Total descuentos previsionales` · Excel `Resumen`: `Total descuentos previsionales CLP` | Solo Chile dependiente |
| F29 retenciones honorarios | PDF reporte mensual: subtotal `Total Honorarios` columna `Retención SII` · Excel: `Chile` Seccion 2 fila `Total retencion SII honorarios` · Excel `Resumen`: `Total retencion SII honorarios CLP` | Solo Honorarios |
| Pagos Deel (compliance externo a Greenhouse) | PDF reporte mensual: subtotal `Total Internacional Deel` · Excel: `Internacional` Seccion 1 con `Contrato Deel` | Solo Deel |
| Pagos internacionales internos | PDF reporte mensual: subtotal `Total Internacional interno` · Excel: `Internacional` Seccion 2 | Solo internacional sin Deel |

> Detalle tecnico: la primitiva canonica que clasifica cada entry vive en `src/lib/payroll/receipt-presenter.ts` (`resolveReceiptRegime` + `groupEntriesByRegime`). El PDF reporte mensual la consume en `PeriodReportDocument` dentro de `generate-payroll-pdf.tsx`; el Excel la consume en `buildResumenSheet` + `buildChileSheet` + `buildInternationalSheet` dentro de `generate-payroll-excel.ts`. Cualquier surface nueva que muestre agregaciones de payroll por regimen debe consumir el mismo helper.

## Referencias

- [Periodos de nomina (documentacion funcional)](./periodos-de-nomina.md)
- [Manual de uso: descargar y reconciliar nomina](../../manual-de-uso/hr/descargar-y-reconciliar-nomina.md)
- [Manual de uso: periodos de nomina](../../manual-de-uso/hr/periodos-de-nomina.md)
- [Spec de arquitectura: Period Outputs V1](../../architecture/GREENHOUSE_PAYROLL_PERIOD_OUTPUTS_V1.md)
- [Spec padre: HR Payroll Architecture V1](../../architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md)
