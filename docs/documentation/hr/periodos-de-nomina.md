# Periodos de Nomina

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-04-30 por Codex
> **Ultima actualizacion:** 2026-05-01 por Codex
> **Documentacion tecnica:** [GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md)

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

Greenhouse separa tres familias de calculo:

- `Chile dependiente`: aplica AFP, salud, Seguro de Cesantia, SIS, mutual, APV e Impuesto Unico cuando corresponde.
- `Honorarios`: aplica retencion SII del anio de emision y no aplica descuentos de trabajador dependiente.
- `Internacional/Deel`: registra compensacion y bonos operativos, pero no aplica payroll estatutario Chile.

Desde `TASK-744`, cada entry guarda un `contract_type_snapshot` para auditar que el calculo no cambie de regimen despues de materializarse.

Si el readiness detecta que una entry ya calculada mezcla regimenes incompatibles, bloquea aprobacion/export y pide recalcular. Esto evita aprobar una nomina que combine, por ejemplo, retencion SII de honorarios con AFP/salud/cesantia de trabajador dependiente.

Melkin Hernandez, Daniela Ferreira y Andres Carlosama deben mantenerse como internacionales/Deel. Si tienen bono variable, siguen requiriendo KPI ICO, pero no deben recibir deducciones Chile.

## Como se ve el recibo segun el regimen (TASK-758)

Desde `RECEIPT_TEMPLATE_VERSION = '4'` (2026-05-04) Greenhouse emite el recibo individual con un contrato visual canonico distinto por regimen. Tanto la vista previa que ve el operador como el PDF descargable que recibe el colaborador renderizan exactamente el mismo layout.

| Regimen | Que ve el colaborador |
| --- | --- |
| Chile dependiente (`indefinido`/`plazo_fijo`) | Bloque "Descuentos legales" completo: AFP con cotizacion + comision separadas, salud obligatoria 7% + voluntaria si la hay, seguro cesantia, impuesto unico, APV cuando aplica. Si la compensacion incluye gratificacion legal, aparece como haber explicito. |
| Honorarios | Bloque "Retencion honorarios" con Tasa SII + monto retenido. Nota informativa "Boleta de honorarios Chile · Art. 74 N°2 LIR". No aparecen filas de AFP, salud, cesantia ni impuesto unico. |
| Contractor o EOR via Deel | Sin bloque de descuentos legales. Aparece la nota "Pago administrado por Deel" explicando que el liquido legal lo emite Deel en la jurisdiccion del trabajador, mas el `Contrato Deel` cuando esta registrado. Hero dice "Monto bruto registrado". |
| Internacional interno (sin Deel) | Sin bloque de descuentos legales. Aparece la nota "Regimen internacional · Sin descuentos previsionales Chile". |
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

## Referencias

- [GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md)
- [Manual de uso — Periodos de nomina](../../manual-de-uso/hr/periodos-de-nomina.md)
