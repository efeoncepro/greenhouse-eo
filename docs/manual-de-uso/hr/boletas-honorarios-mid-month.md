# Boletas honorarios mid-month

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** 2026-05-16 por Claude Opus (TASK-893 V1.1 / TASK-895)
> **Modulo:** HR / Onboarding / Payroll
> **Documentacion relacionada:** [Honorarios mid-month](../../documentation/hr/honorarios-mid-month.md), [Periodos de nomina](../../documentation/hr/periodos-de-nomina.md)

---

## Para que sirve

Este manual te explica que comunicarle a un colaborador a honorarios chileno cuando ingresa o sale a mitad de mes, para que emita su boleta de honorarios por el monto correcto y evite inconsistencias con el SII.

---

## Antes de empezar

- Confirma que el colaborador esta clasificado como `honorarios` en su compensacion (no `indefinido` ni `plazo_fijo` ni `contractor`).
- Confirma la fecha de inicio (`effective_from` en `compensation_versions`).
- Tene listo el monto bruto proporcional calculado — lo ves en la nomina proyectada del primer mes (TASK-893) cuando el flag `PAYROLL_PARTICIPATION_WINDOW_ENABLED` este activo. Si el flag aun no esta activo, el monto sera full-month y este manual no aplica todavia.

---

## Paso a paso al onboarding del colaborador

1. Abre `/hr/payroll/projected?year=<año>&month=<mes>` en el mes de ingreso del colaborador.
2. Busca el row del colaborador. Verifica:
   - `Régimen`: `Honorarios CL`
   - `Factor de prorrateo`: < 1 (e.g. 0.59 para ingreso el dia 13 de mayo 2026).
   - `Bruto total`: monto proporcional ya calculado.
   - `Retencion SII`: 15.25% sobre el bruto proporcional.
3. Comunica al colaborador por email o Slack:
   - Periodo trabajado del primer mes (e.g. "13 al 31 de mayo").
   - Monto bruto exacto a facturar (e.g. "$384,091 CLP").
   - Instruccion: emitir la boleta de honorarios por **ese monto exacto** en sii.cl.
   - Recordatorio: el proximo mes, la boleta sera por el contrato full ($650,000 si aplica).

---

## Que verificar antes de aprobar el periodo

Cuando hagas el cierre del mes:

1. Verifica que el bruto en `payroll_entries.gross_total` para el colaborador coincida con el monto que le comunicaste.
2. Verifica que `siiRetentionAmount` sea exactamente 15.25% del bruto.
3. Antes de exportar a Previred/F29, confirma que el colaborador efectivamente emitio la boleta por ese monto.

Si el colaborador emitio por un monto distinto (e.g. contrato full), pide la **anulacion** de esa boleta y re-emision por el monto correcto antes del cierre.

---

## Que hacer si el colaborador ya emitio mal la boleta

1. El SII permite **anular** una boleta de honorarios emitida via formulario en sii.cl.
2. El colaborador anula la boleta incorrecta.
3. El colaborador emite una nueva boleta por el monto proporcional correcto.
4. Confirma con el colaborador que tiene el comprobante de anulacion + la nueva boleta.

Si el F29 de Efeonce **ya se presento** con el monto correcto pero la boleta del colaborador queda emitida por el monto mayor:

- Es posible que Efeonce reciba notificacion del SII por inconsistencia.
- El colaborador puede tener que justificar la diferencia ante SII (a su cargo, no de Efeonce).

Para evitar esto, **siempre comunicar el monto exacto en el onboarding** y confirmar la boleta antes del cierre del periodo.

---

## Que significan los estados (recordatorio)

En `/hr/payroll/projected`:

| Campo | Significado |
| --- | --- |
| `Régimen = Honorarios CL` | Colaborador chileno facturando como honorario. |
| `Factor de prorrateo = 1` | Mes completo trabajado. La boleta va por el contrato full. |
| `Factor de prorrateo < 1` | Ingreso/salida a mid-month. La boleta va por el bruto proporcional (campo `Bruto total`). |
| `Retencion SII > 0` | Lo que Efeonce va a declarar en F29 ese mes. Debe coincidir con el 15.25% del bruto del DTE 41 del colaborador. |

---

## Que no hacer

- **NO** asumir que el colaborador sabe que debe prorratear su boleta. Comunicar siempre al onboarding.
- **NO** cerrar el periodo sin confirmar que la boleta se emitio por el monto correcto.
- **NO** ajustar el `siiRetentionAmount` manualmente en `payroll_entries` para "cuadrar" con una boleta mal emitida — la solucion correcta es que el colaborador anule + re-emita.
- **NO** instruir al colaborador a emitir boleta por contrato full y "ajustar el proximo mes" — eso genera drift SII permanente y exposicion para ambas partes.

---

## Problemas comunes

| Problema | Solucion |
| --- | --- |
| Colaborador ya emitio boleta por contrato full antes del cierre | Pedir anulacion en sii.cl + re-emision por monto proporcional. |
| `/hr/payroll/projected` muestra factor de prorrateo = 1 a pesar de ingreso mid-month | Verifica que `PAYROLL_PARTICIPATION_WINDOW_ENABLED=true` en el ambiente. Si esta OFF, es comportamiento legacy (mes completo). |
| Periodo ya exportado bajo flag OFF y emerge necesidad de corregir el monto | Usar admin endpoint `/api/admin/hr/payroll/periods/[periodId]/force-recompute` con capability `payroll.period.force_recompute` + reason >= 20 chars + audit row. |

---

## Referencias tecnicas

- [Honorarios mid-month — Documentacion funcional](../../documentation/hr/honorarios-mid-month.md)
- [Periodos de nomina](../../documentation/hr/periodos-de-nomina.md)
- [GREENHOUSE_PAYROLL_PARTICIPATION_WINDOW_V1.md](../../architecture/GREENHOUSE_PAYROLL_PARTICIPATION_WINDOW_V1.md)
- SII Chile — sii.cl > Servicios online > Boletas de honorarios electronicas
