# Atender a un candidato que perdió su respuesta o no puede enviar

> **Tipo de documento:** Manual de uso
> **Versión:** 1.0
> **Creado:** 2026-08-26 por Claude (TASK-1751)
> **Última actualización:** 2026-08-26 por Claude (TASK-1751)
> **Documentación funcional:** [Rendición del test por el candidato](../../documentation/hr/rendicion-del-test-por-el-candidato.md)

## Para qué sirve

Un candidato te escribe: "escribí toda la respuesta y se borró", "el campo se bloqueó", "no me deja
enviar", "me dice que pruebe de nuevo y no pasa nada". Este manual te sirve para **saber en qué caso
estás en menos de dos minutos** y qué puedes hacer en cada uno.

Los tres casos se parecen desde afuera y tienen soluciones **distintas**:

1. **Le faltan respuestas guardadas** → enviar es imposible por diseño; hay que retomar la prueba.
2. **Se le acabó el tiempo** → nada que reintentar; el camino es tiempo extra o prueba nueva.
3. **Falló el sistema** → reintentar sí sirve.

Confundirlos cuesta caro: si le dices "vuelve a intentar" a alguien del caso 1 o 2, lo mandas a un
callejón sin salida mientras su reloj corre.

## Antes de empezar

- Este manual **no** cubre "no me llegó el correo" ni "el enlace no funciona". Eso es acceso, y va en
  [Recuperar acceso al test de un candidato](recuperar-acceso-a-test-de-candidato.md).
- **Recuperar el acceso no devuelve tiempo.** Si el problema es el reloj, rotar el enlace no ayuda.
- La única forma legítima de darle más tiempo a una persona es el **ajuste razonable**, documentado en
  [Operar la Asignación de Tests por Etapa](operar-asignacion-de-tests.md#paso-a-paso--otorgar-un-ajuste-razonable-tiempo-extra).
  Necesitas la capability `hiring.assessment.grant_accommodation`.
- **La plataforma no puede rescatar un texto que nunca se guardó.** No hay borrador escondido en la
  base. Si la persona todavía tiene la pantalla abierta, lo primero es pedirle que **copie el texto**
  antes de cerrar o recargar.

## Paso 1 — Pídele la frase exacta

Pídele que te copie **textualmente** el mensaje que ve, o una captura. La frase te da el caso casi
solo. Estas son las que puede ver:

| Lo que ve el candidato | Qué significa | Caso |
|---|---|---|
| "El tiempo para responder terminó. Las respuestas ya no se pueden editar." + "**Quedaron respuestas sin guardar**, así que la evaluación no se puede enviar." | Está en la gracia y le faltan respuestas. El botón de enviar **no le aparece**, y eso es correcto. | 1 |
| "El tiempo para responder terminó…" + "**Todas tus respuestas quedaron guardadas**: todavía puedes enviar la evaluación." | Está en la gracia y sí puede enviar. Si no lo hace, es que no vio el botón. | ninguno: acompáñalo a enviar |
| "Guardadas: 3 de 5." | El conteo real de lo que el servidor confirmó. **Es el dato más útil que te puede dar.** | ayuda a decidir |
| "Se cumplió el plazo para responder, así que esta respuesta no alcanzó a guardarse. Tu texto sigue en pantalla: cópialo antes de salir." | Su último guardado llegó justo después del plazo. El texto está vivo **sólo en su pantalla**. | 2 (urgente) |
| "Quedaron respuestas sin guardar, así que la evaluación no se puede enviar. Escríbele a quien te la envió." | Intentó enviar y el servidor lo rechazó por incompleta. | 1 |
| "Se acabó el tiempo. Guardamos lo que alcanzaste a responder." | Se cerró la ventana completa (plazo + 30 minutos de gracia). Ya no hay nada que hacer en esa prueba. | 2 |
| "Prueba de nuevo en unos minutos. Si el problema sigue, avisa a quien te contactó." | Falla real de red o de sistema. **Este es el único caso donde reintentar sirve.** | 3 |

> Si te dice que el campo "se bloqueó" pero **el texto sigue visible en gris con borde punteado**, eso
> no es un error: es la fase de gracia. El campo queda de solo lectura a propósito para que pueda
> copiar lo que escribió.

## Paso 2 — Mira la tarjeta del assessment

Abre la Application 360 de la persona → pestaña de evaluaciones. La tarjeta te da dos datos:

- **El estado** (Asignado, Enviado, En curso, Enviado por el candidato, Corregido, Vencido, Cancelado).
- **El límite de tiempo** declarado, junto al identificador (`EO-ASM-0128 · 45 minutos`).

Dos cosas que **no** vas a ver, y conviene saberlo antes de buscarlas:

- **No ves cuántas respuestas lleva guardadas.** Mientras está en curso, la revisión dice "El candidato
  aún no completa la evaluación". Ese conteo sólo aparece en la pantalla del candidato: pídeselo.
- **No ves a qué hora empezó ni cuándo vence.** Y el estado **no cambia solo** al acabarse el tiempo:
  pasa a "Vencido" recién la próxima vez que el candidato intenta guardar o enviar. Una tarjeta que
  dice "En curso" no prueba que todavía tenga tiempo.

## Paso 3 — Actúa según el caso

### Caso 1 — Le faltan respuestas guardadas

Enviar es imposible: el servidor exige la evaluación completa. No hay permiso ni acción que lo salte,
y está bien que sea así.

**Si todavía está dentro de los 30 minutos de gracia** y quieres que termine hoy:

1. Otórgale un ajuste razonable con los minutos que corresponda
   ([procedimiento](operar-asignacion-de-tests.md#paso-a-paso--otorgar-un-ajuste-razonable-tiempo-extra)).
   Se puede otorgar mientras está en curso: le alarga el plazo para responder en el momento y lo saca
   de la gracia.
2. **Pídele que recargue la página.** Su pantalla no se entera sola del tiempo nuevo.
3. Confírmale que el texto que ya tenía en pantalla **no viaja** con la recarga: si no lo copió, se
   pierde. Que lo copie primero.

**Si ya pasaron los 30 minutos**, la prueba está cerrada. No se extiende: se
[asigna una nueva](operar-asignacion-de-tests.md), y eso es una decisión de proceso, no un arreglo
técnico — deja constancia de por qué en el
[Expediente de Evaluación](operar-expediente-de-evaluacion.md).

### Caso 2 — Se le acabó el tiempo

**Prioridad número uno: que copie el texto que sigue en pantalla.** Es lo único que se puede rescatar,
y desaparece si cierra la pestaña o recarga.

Después decide entre las dos únicas salidas reales:

- **Ajuste razonable**, si corresponde y la prueba sigue en curso (no vencida ni entregada).
- **Prueba nueva**, si la ventana ya se cerró.

Nunca le ofrezcas "vuelve a intentar": en este caso no puede funcionar nunca.

### Caso 3 — Falló el sistema

Es el único mensaje que invita a reintentar de forma legítima. Pídele que espere un momento y vuelva
a guardar.

Si se repite, no lo dejes reintentando con el reloj corriendo: otórgale tiempo extra mientras revisas,
y escala con evidencia (hora exacta, identificador de la prueba `EO-ASM-####`, captura del mensaje).

## Qué no hacer

- **No le digas "vuelve a intentar" sin leer el mensaje exacto.** Dos de los tres casos no se
  resuelven reintentando.
- **No rotes el acceso para "arreglar" un problema de tiempo.** Recuperar acceso no devuelve minutos,
  y si la persona está rindiendo, el enlace nuevo mata el que tiene abierto.
- **No le pidas que recargue antes de que copie su texto.** Lo que no se guardó vive sólo en esa
  pantalla.
- **No prometas que "el sistema guardó todo".** El único dato confiable es el conteo `Guardadas: X de Y`
  que él ve, o la evaluación ya entregada.
- **No otorgues tiempo extra "por si acaso" a toda la cohorte.** El ajuste es individual y existe para
  eso; extenderlo a todos rompe la comparabilidad del proceso.
- **No registres el motivo médico o personal del ajuste en ningún campo.** El endpoint no acepta uno a
  propósito: revela una condición protegida.

## Problemas comunes

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| "Se me borró todo al cambiar de pregunta" | Comportamiento antiguo, ya corregido: hoy el borrador se conserva al navegar entre preguntas | Confirma la fecha del incidente. Si es reciente, pide captura y escala |
| "No me aparece el botón de enviar" | Está en la gracia y le faltan respuestas: el botón se oculta a propósito | Caso 1 |
| "El campo está gris y no puedo escribir" | Fase de gracia, campo en solo lectura | Explícale que puede copiar; caso 1 o 2 según el conteo |
| La tarjeta dice "En curso" pero la persona dice que se le acabó el tiempo | El estado se actualiza recién cuando el sistema vuelve a tocar la prueba | Créele a la persona, no a la tarjeta. Verifica con el mensaje que ve |
| Escribió sin parar y perdió todo, con tiempo de sobra | El guardado espera una pausa al escribir. Fuera de los últimos 30 segundos, escribir de corrido no guarda | Explica que conviene pausar; reporta el caso — es la clase de problema que sigue abierta |
| Pide más tiempo y la respuesta dice `409` | La prueba ya está entregada, corregida, vencida o cancelada | No hay tiempo que extender: corresponde prueba nueva |

## Referencias

- Funcional: [Rendición del test por el candidato](../../documentation/hr/rendicion-del-test-por-el-candidato.md)
- Manual: [Recuperar acceso al test de un candidato](recuperar-acceso-a-test-de-candidato.md)
- Manual: [Operar la Asignación de Tests por Etapa](operar-asignacion-de-tests.md) — incluye el ajuste razonable
- Manual: [Operar el Expediente de Evaluación](operar-expediente-de-evaluacion.md)
- Arquitectura: [GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1](../../architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md)
