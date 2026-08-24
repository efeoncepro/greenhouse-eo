> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-08-23 por Claude Opus 5 (TASK-1762)
> **Ultima actualizacion:** 2026-08-23 por Claude Opus 5
> **Documentacion tecnica:** [GREENHOUSE_HIRING_OPENING_CAPACITY_CLOSURE_DECISION_V1.md](../../architecture/GREENHOUSE_HIRING_OPENING_CAPACITY_CLOSURE_DECISION_V1.md)

# Cierre de Vacante por Capacidad

## Qué problema resuelve

Cuando una vacante se llena, las demás personas que seguían en proceso quedan esperando una
respuesta que nadie les da. Hasta ahora la única forma de cerrarlas era marcarlas una por una como
**descarte** — y eso es falso: a nadie la descartaron, la vacante se llenó.

La diferencia no es de palabras. Un descarte es un juicio sobre la persona: la deja fuera del Banco
de Talento por defecto, sesga a cualquiera que lea su historia después, y **cuenta como rechazo en
el análisis de impacto adverso**, que es el que mide si un proceso de selección discrimina. Marcar a
33 personas como rechazadas por un cupo que tomó otra infla la tasa de rechazo de su grupo
demográfico sin que nadie las haya rechazado.

## Los tres pasos

| Paso | Qué pasa | Quién lo hace |
|---|---|---|
| **Configurar capacidad** | La vacante declara que usa cierre por capacidad. Sin esto no hay automatización de ningún tipo. | Una persona con permiso de capacidad |
| **Ver el resumen** | Muestra exactamente a cuántas personas afectaría y agrupadas por cómo entrarían | Cualquiera con permiso de lectura |
| **Confirmar** | Registra la decisión de cada persona. Es irreversible | Una persona con permiso de confirmación |

## Qué muestra el resumen

Tres grupos, y sólo el primero entra por defecto:

- **Entran** — personas que siguen en proceso activo.
- **En pausa** — el equipo las dejó deliberadamente esperando una decisión. **No entran** salvo que
  lo pidas explícitamente: cerrarlas sería revertir una decisión que alguien tomó a propósito.
- **Respaldo** — se eligieron como alternativa por si la persona seleccionada no acepta. **No entran**
  salvo que lo pidas: hay un compromiso abierto con ellas.

Quien ya tiene un desenlace registrado, o está archivada, nunca entra.

## Qué significan los estados

| Estado | Qué quiere decir |
|---|---|
| **Sin gobernar** | La vacante no usa esta capacidad. No pasa nada automático |
| **En curso** | El cierre fue confirmado y se está registrando persona por persona |
| **Completado** | Todas quedaron con su desenlace registrado |
| **Parcial** | Terminó, pero algunas personas no pudieron cerrarse. **Requiere que alguien mire** |

## Qué NO hace

- **No cierra solo.** Seleccionar a alguien no cierra a nadie más. Siempre hay una confirmación humana.
- **No decide a quién cerrar por su desempeño.** No usa score, ni IA, ni ranking: la cohorte es
  «quien sigue en proceso», nada más.
- **No promete lo que no puede cumplir.** El correo dice «mantendremos tu perfil» **sólo** si esa
  persona autorizó que la contactemos en el futuro, y esa autorización se verifica en el momento de
  enviar, no antes. Sin autorización vigente, el correo no hace la promesa.
- **No revela nada interno.** El candidato nunca lee el nombre del desenlace, ni su evaluación, ni
  su puntaje.

## Problemas comunes

**«Dice que todavía hay cupos y no me deja cerrar.»** Es correcto. El cierre por capacidad exige
que la vacante esté llena, y los cupos ocupados se cuentan desde las personas efectivamente
seleccionadas. Si no seleccionaste a nadie todavía, no hay capacidad que se haya llenado.

**«El resumen cambió y no me deja confirmar.»** Alguien entró o salió de la cohorte desde que lo
miraste. Es la protección funcionando: estarías cerrando un grupo distinto del que aprobaste. Vuelve
a mirar el resumen y confirma sobre el nuevo.

**«El cierre quedó en parcial.»** Algunas personas no pudieron cerrarse después de varios intentos.
Quedan marcadas para revisión humana y el sistema emite una alerta. No se reintenta solo: alguien
tiene que ver por qué.

> Detalle técnico: [decisión de arquitectura](../../architecture/GREENHOUSE_HIRING_OPENING_CAPACITY_CLOSURE_DECISION_V1.md) ·
> [vocabulario de etapas y desenlace](../../architecture/GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_VOCABULARY_DECISION_V1.md) ·
> código en `src/lib/hiring/opening-capacity/`
