# Periodos de Nomina

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** 2026-04-30 por Codex
> **Ultima actualizacion:** 2026-05-01 por Codex
> **Modulo:** HR / Nomina
> **Ruta en portal:** `/hr/payroll`
> **Documentacion relacionada:** [GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md), [Periodos de nomina](../../documentation/hr/periodos-de-nomina.md)

## Para que sirve

Esta vista te permite crear, corregir y calcular el periodo mensual de nomina oficial.

Cada periodo representa el **mes imputable** de la nomina, no necesariamente el mes en que se paga.

## Antes de empezar

- Debes tener permisos para operar el modulo de nomina.
- Deben existir colaboradores activos y compensaciones configuradas si quieres calcular.
- Si el periodo incluye colaboradores Chile, Greenhouse necesita tener sincronizada la tabla tributaria de ese mes antes del calculo.

## Crear un periodo nuevo

1. Entra a `Personas y HR > Nomina > Nomina mensual`.
2. Haz clic en `Nuevo periodo`.
3. Completa `Año` y `Mes`.
4. Revisa el campo informativo `Version tributaria Chile esperada`.
5. Haz clic en `Crear`.

### Importante

- No necesitas escribir manualmente una version tipo `gael-YYYY-MM` para crear el borrador.
- Greenhouse intenta resolver esa tabla automaticamente al crear el periodo.
- Si la tabla de ese mes todavia no existe, igual puedes crear el borrador.

## Que significa el campo tributario

El campo `Version tributaria Chile esperada` es solo una referencia del identificador que Greenhouse buscara para ese mes.

Ejemplo:

- Abril 2026 -> `gael-2026-04`

No hace falta memorizarlo ni inventarlo. El sistema lo usa para buscar la tabla tributaria sincronizada de ese mes.

## Cuando el sistema resuelve la tabla solo

Greenhouse intenta resolver la tabla tributaria Chile en estos momentos:

- al crear un periodo
- al editar un periodo y dejar vacio el override manual
- al revisar readiness del periodo
- al calcular o recalcular nomina Chile
- al cotizar compensaciones que dependen de esa tabla

## Cuando necesitas intervenir manualmente

Solo deberias tocar `Version tabla impositiva` en `Editar periodo` si:

- estas corrigiendo un caso historico excepcional
- necesitas apuntar a una version sincronizada distinta de la canonica del mes
- soporte o el equipo tecnico te lo pidio explicitamente

Si no tienes una instruccion clara, dejalo vacio para que Greenhouse resuelva la version correcta.

## Que significan los estados

- `Borrador`: el periodo existe pero aun no se calcula.
- `Calculado`: ya se generaron las entries del periodo.
- `Aprobado`: el periodo fue revisado y aprobado para cierre.
- `Exportado`: el periodo ya fue cerrado/exportado.

### Importante sobre `Borrador`

Un periodo en borrador puede mostrar colaboradores elegibles aunque todavia no tenga entries.

Eso significa:

- el roster del periodo ya fue resuelto
- pero la nomina oficial aun no se materializa
- las entries apareceran solo despues de `Calcular`

## Problemas comunes

### Pude crear el periodo, pero no calcular

Esto suele significar que falta sincronizar la tabla tributaria Chile del mes imputable.

Que hacer:

1. Confirma que el mes del periodo sea correcto.
2. Revisa si el sistema muestra alerta de tabla tributaria faltante.
3. Pide sincronizar la base previsional/tributaria del mes antes de recalcular.

### Veo colaboradores elegibles, pero aun no aparece la tabla de nomina

Eso es esperado si el periodo sigue en `Borrador`.

Que significa:

- Greenhouse ya sabe quienes entrarian al calculo
- todavia no existen entries materializadas
- primero debes resolver blockers del readiness y luego usar `Calcular`

### El readiness dice que faltan KPI ICO

Ese blocker solo aplica si el colaborador depende de bono variable real en ese periodo.

Que hacer:

1. Revisa si la compensacion del colaborador usa `OTD` o `RpA`.
2. Si si usa bono KPI, valida que el colaborador tenga metricas ICO para ese mes.
3. Si no usa bono KPI, no deberia quedar bloqueado por esta causa; reportalo como inconsistencia del readiness.

### El readiness dice que faltan senales de asistencia/licencias

Ese blocker solo aplica cuando la asistencia puede cambiar el monto pagado en ese periodo.

Que hacer:

1. Confirma si el colaborador realmente requiere control de asistencia en nomina.
2. Si si lo requiere, valida que exista senal de asistencia o licencia para el mes.
3. Si el colaborador es `honorarios` o se procesa via `Deel`, ese bloqueo no deberia aplicar.

### El readiness dice que hay regimenes incompatibles

Ese blocker significa que ya existe una liquidacion calculada con campos que no corresponden al regimen del colaborador.

Ejemplos:

- `honorarios` con AFP, salud, cesantia o Impuesto Unico.
- `Deel` o internacional con retencion SII o deducciones Chile.

Que hacer:

1. No apruebes ni exportes el periodo.
2. Si el periodo no esta exportado, usa `Calcular` para regenerar las entries con el motor corregido.
3. Si el periodo ya esta exportado, usa reapertura/reliquidacion formal y deja trazabilidad del motivo.
4. Si afecta a Melkin, Daniela o Andres, confirma que sigan como internacionales/Deel y que solo usen KPI ICO para bonos variables.

### Veo un valor esperado como `gael-2026-04` y no se si debo escribirlo

No. Ese valor es informativo. En el flujo normal no debes escribirlo manualmente.

### Cambie mes o año del periodo y el sistema volvio a borrador

Es esperado. Si cambias la base de calculo del periodo, Greenhouse elimina las entries calculadas para obligar un recalculo limpio con los valores correctos del nuevo mes.

## Que no hacer

- No inventes una version tributaria solo para destrabar el flujo.
- No uses overrides manuales como rutina operativa.
- No calcules una nomina Chile si el sistema avisa que falta la tabla del mes.

## Referencias tecnicas

- [GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md)
- [Periodos de nomina](../../documentation/hr/periodos-de-nomina.md)
