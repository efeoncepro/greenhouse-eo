# Convertir horarios de un equipo distribuido

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** 2026-09-08 por Codex
> **Ultima actualizacion:** 2026-09-08 por Codex
> **Modulo:** HR / Workforce / Payroll
> **Documentacion funcional:** `docs/documentation/hr/jornadas-y-horarios-distribuidos.md`
> **Referencia operativa:** `docs/operations/EFEONCE_DISTRIBUTED_WORKING_HOURS_REFERENCE_V1.md`

## Antes de empezar

Confirma por cada persona:

- pais y zona horaria IANA contractual;
- tipo de relacion y jurisdiccion aplicable;
- horas semanales pactadas;
- duracion de colacion y si se computa como trabajada;
- fecha desde la cual se propone el cambio.

No uses `full-time` o `part-time` como sustituto de las horas pactadas.

## Procedimiento

1. Define la jornada efectiva en su zona contractual. Para el escenario chileno revisado, las alternativas son 08:30 o 09:30 en `America/Santiago`.
2. Resta la colacion no trabajada antes de sumar la semana.
3. Verifica que la suma coincida con 42, 30, 20 o las horas exactas del contrato.
4. Convierte inicio, colacion y termino usando una libreria de zonas IANA y la fecha efectiva.
5. Si interviene `Europe/Madrid`, calcula por separado los periodos anterior y posterior al ultimo domingo de octubre y marzo.
6. Entrega la tabla con pais, zona, periodo de vigencia y cualquier termino que cruce al dia siguiente.
7. People/Payroll revisa la legislacion y el contrato aplicables antes de comunicar o formalizar el cambio.

## Lectura rapida para el escenario 08:30 Chile

| Pais/periodo | Full-time lunes-jueves | Full-time viernes |
|---|---|---|
| Chile | 08:30-18:15 | 08:30-16:30 |
| Colombia | 06:30-16:15 | 06:30-14:30 |
| Nicaragua | 05:30-15:15 | 05:30-13:30 |
| España peninsular, hasta 2026-10-24 | 13:30-23:15 | 13:30-21:30 |
| España peninsular, 2026-10-25 a 2027-03-27 | 12:30-22:15 | 12:30-20:30 |

Para jornadas parciales y el escenario 09:30, consulta la referencia operativa.

## Verificacion

- Suma horas efectivas de cada dia, excluyendo la colacion no trabajada.
- Confirma que no se aplico una diferencia fija a España durante todo el periodo.
- Confirma que el dia de termino sea correcto cuando España llega a 00:15.
- Identifica expresamente si la tabla usa España peninsular o Canarias.
- Revisa nuevamente las fuentes oficiales cuando cambie el año o un gobierno modifique las reglas horarias.

## Que no hacer

- No cambies contratos, registros de asistencia o compensation versions solo porque una tabla de conversion cambie.
- No presentes la equivalencia como aprobacion legal local.
- No cuentes la colacion dos veces ni la incluyas como trabajo sin evidencia contractual.
- No guardes `España = Chile +4/+5` sin fecha ni zona IANA.
