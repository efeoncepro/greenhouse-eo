# Honorarios mid-month — Boletas prorrateadas

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-05-16 por Claude Opus (TASK-893 V1.1 / TASK-895)
> **Documentacion tecnica:** [GREENHOUSE_PAYROLL_PARTICIPATION_WINDOW_V1.md](../../architecture/GREENHOUSE_PAYROLL_PARTICIPATION_WINDOW_V1.md), [GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md)

---

## Que es esto

Cuando un colaborador a honorarios chileno **ingresa o sale a mitad de mes**, Greenhouse calcula el monto del mes proporcional a los dias habiles efectivamente trabajados (TASK-893 — Payroll Participation Window).

Este documento explica el procedimiento canonico para la emision de la boleta de honorarios cuando esto ocurre, para evitar drift entre el DTE 41 (boleta de honorarios electronica emitida al SII) y el Formulario F29 (declaracion mensual de retenciones SII por parte de Efeonce).

---

## Por que importa

El SII cruza electronicamente cada mes:

- **DTE 41**: la boleta de honorarios que emite el colaborador.
- **F29**: la declaracion de retenciones que emite Efeonce (15.25% sobre honorarios 2026).

Si el monto bruto de la boleta NO coincide con el monto sobre el que Efeonce declaro la retencion, el SII genera una **notificacion de inconsistencia** automatica.

---

## Regla canonica

Cuando un colaborador a honorarios ingresa o sale a mitad de mes:

- Greenhouse paga **proporcional a los dias habiles trabajados** del mes.
- El colaborador debe emitir la boleta de honorarios por **ese mismo monto proporcional**, NO por el contrato full-month.
- La retencion SII de Efeonce se calcula sobre el bruto proporcional.

---

## Ejemplo concreto

Felipe Zurita inicia el 13 de mayo 2026.

- Contrato: honorarios CL, $650,000 CLP mensual.
- Dias habiles del periodo (mayo 2026): 22.
- Dias habiles efectivamente trabajados (13-31 mayo): 13.
- Factor de prorrateo: 13/22 = 0.5909.

| Concepto | Monto |
| --- | --- |
| Bruto proporcional (calculado por Greenhouse) | $384,091 CLP |
| Retencion SII Efeonce (15.25%) | $58,574 CLP |
| Liquido pagado al colaborador | $325,517 CLP |

**Boleta que debe emitir Felipe en el SII**:

- Monto bruto: **$384,091 CLP** (NO $650,000).
- Concepto: "Servicios prestados periodo 13 al 31 de mayo 2026".
- Retencion SII: $58,574 CLP (la calcula el SII automaticamente al ingresar el bruto).

Asi, el DTE 41 de Felipe ($384,091 declarado) cuadra con el F29 de Efeonce ($58,574 retenido sobre $384,091).

---

## Que pasa si la boleta se emite por el monto full ($650,000)

Tres consecuencias:

1. **Drift SII**: el F29 de Efeonce declara retencion sobre $384,091, pero el DTE 41 emite por $650,000 → el SII detecta la inconsistencia y emite notificacion.
2. **Sobredeclaracion del colaborador**: el SII registra que Felipe percibio $650,000 ese mes para efectos de declaracion anual (DDJJ 1879), cuando en realidad recibio menos.
3. **Posible re-emision**: SII puede exigir que Felipe anule la boleta y emita una nueva por el monto correcto.

---

## Que comunicar al colaborador al onboarding

Cuando un colaborador a honorarios inicia mid-month, People Ops debe comunicar:

1. El **periodo trabajado real** (e.g. "13 al 31 de mayo").
2. El **monto bruto proporcional** que recibira ese mes.
3. Que debe emitir la boleta por **ese monto exacto**, no el contrato full.
4. Que el calculo automatico del SII de la retencion sobre ese monto va a coincidir con lo que Efeonce declara en F29.

El proximo mes y siguientes, la boleta se emite por el monto completo del contrato (asumiendo trabajo full-month sin cambios).

---

## Lo mismo aplica al exit mid-month

Si el colaborador termina su relacion a mitad de mes (con o sin finiquito formal):

- Greenhouse paga proporcional a los dias trabajados.
- La boleta del ultimo mes debe emitirse por el monto proporcional, NO contrato full.
- Misma logica DTE 41 vs F29 para evitar inconsistencia.

---

## Cuando este documento NO aplica

- Colaborador a honorarios trabaja el mes completo: emite boleta por el monto contrato full. Sin prorrateo.
- Colaborador a Chile dependiente (no honorarios): no emite boleta. La logica de prorrateo aplica al pago pero NO al SII directamente (las cotizaciones Previred + IUSC siguen otro camino).
- Colaborador internacional Deel: emite su propio comprobante en la jurisdiccion del trabajador. No aplica boleta SII Chile.

---

## Referencias

- [Periodos de nomina (TASK-893)](./periodos-de-nomina.md)
- [GREENHOUSE_PAYROLL_PARTICIPATION_WINDOW_V1.md](../../architecture/GREENHOUSE_PAYROLL_PARTICIPATION_WINDOW_V1.md)
- [Manual de uso — Boletas honorarios mid-month](../../manual-de-uso/hr/boletas-honorarios-mid-month.md)
- SII Chile — Art 74 N°2 LIR (retencion 15.25% honorarios 2026)
