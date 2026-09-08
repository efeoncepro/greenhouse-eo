# Jornadas y horarios distribuidos

> **Tipo de documento:** Documentacion funcional
> **Version:** 1.0
> **Creado:** 2026-09-08 por Codex
> **Ultima actualizacion:** 2026-09-08 por Codex
> **Modulo:** HR / Workforce / Payroll
> **Referencia operativa:** `docs/operations/EFEONCE_DISTRIBUTED_WORKING_HOURS_REFERENCE_V1.md`
> **Manual:** `docs/manual-de-uso/hr/convertir-horarios-equipo-distribuido.md`

## Para que sirve

Esta referencia explica como leer una jornada coordinada desde Chile cuando integrantes del equipo trabajan en España, Colombia o Nicaragua. Separa cuatro hechos que no deben confundirse:

1. horas efectivamente trabajadas;
2. tiempo de colacion no trabajado;
3. zona horaria contractual;
4. equivalencia visible en el pais donde se encuentra la persona.

Una tabla de equivalencias no cambia contratos ni aprueba una jornada en otra jurisdiccion. People/Payroll debe confirmar el regimen de cada persona y formalizar cualquier cambio que corresponda.

## Jornada chilena usada para el calculo

Desde el 26 de abril de 2026, la jornada ordinaria general en Chile no puede exceder 42 horas semanales. Para esta referencia se consideran dos alternativas que producen exactamente 42 horas efectivas con una hora diaria de colacion:

| Alternativa | Lunes a jueves | Viernes | Colacion | Trabajo semanal |
|---|---|---|---|---:|
| Inicio 08:30 | 08:30-18:15 | 08:30-16:30 | 1 hora diaria | 42 horas |
| Inicio 09:30 | 09:30-19:15 | 09:30-17:30 | 1 hora diaria | 42 horas |

El horario historico 08:30-18:20 de lunes a jueves y 08:30-16:30 el viernes suma 42 horas 20 minutos efectivos si se descuenta una hora diaria de colacion. No corresponde a la referencia exacta de 42 horas.

## Jornadas parciales de referencia

`Part-time` no determina por si solo una jornada. Deben leerse las horas pactadas. Para comparar escenarios se conservaron:

| Horas pactadas | Inicio 08:30 | Inicio 09:30 | Colacion |
|---:|---|---|---|
| 30 horas semanales | 08:30-15:30, lunes a viernes | 09:30-16:30, lunes a viernes | 1 hora diaria |
| 20 horas semanales | 08:30-13:00, lunes a viernes | 09:30-14:00, lunes a viernes | 30 minutos diarios |

La jornada parcial chilena especial alcanza hasta 30 horas semanales. Una persona contratada bajo otra jurisdiccion requiere validacion local independiente.

## Equivalencias internacionales

Durante el horario de verano de Santiago, Chile opera en UTC-3 para el periodo citado. Colombia queda dos horas atras y Nicaragua tres horas atras. España peninsular queda cinco horas adelante mientras usa UTC+2 y cuatro horas adelante cuando vuelve a UTC+1.

Por eso España no puede vivir en una columna fija durante todo el verano chileno:

- hasta el 24 de octubre de 2026: España peninsular = Chile +5;
- desde el 25 de octubre de 2026 hasta el 27 de marzo de 2027: España peninsular = Chile +4;
- desde el 28 de marzo de 2027 hasta el fin del horario de verano chileno: España peninsular = Chile +5.

Las tablas completas para inicio 08:30 y 09:30 viven en la referencia operativa enlazada arriba. Canarias se calcula una hora antes que España peninsular.

## Reglas funcionales

- La zona base se registra con identificador IANA, por ejemplo `America/Santiago`, no como diferencia fija `GMT-3`.
- La fecha efectiva forma parte del calculo porque España cambia de hora dentro del verano chileno.
- La colacion no se suma a las horas efectivamente trabajadas salvo pacto aplicable que la haga imputable.
- La equivalencia horaria no prueba cumplimiento de la legislacion laboral del pais de residencia.
- Un cambio de hora oficial no cambia automaticamente la jornada pactada: cambia la equivalencia frente a otras zonas.

## Fuentes

Fuentes oficiales y fecha de verificacion: `docs/operations/EFEONCE_DISTRIBUTED_WORKING_HOURS_REFERENCE_V1.md`.
