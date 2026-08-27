# Rendición del test por el candidato

> **Tipo de documento:** Documentación funcional (lenguaje simple)
> **Versión:** 1.0
> **Creado:** 2026-08-26 por Claude (TASK-1751)
> **Última actualización:** 2026-08-26 por Claude (TASK-1751)
> **Documentación técnica:** [GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1](../../architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md)

## El problema que resuelve

Este documento describe qué le pasa al candidato **mientras rinde**: cómo se guarda lo que escribe,
qué ocurre cuando se le acaba el tiempo y qué mensaje recibe cuando algo no se puede hacer.

El 2026-08-19 una candidata real perdió una respuesta escrita completa y quedó sin poder enviar,
**teniendo 26 minutos de gracia disponibles**. No fue una caída ni un error de servidor: el guardado
automático nunca alcanzó a dispararse, la pantalla congeló el campo sin avisar por qué, y el mensaje
final le pedía "prueba de nuevo en unos minutos" — algo que en su caso no podía funcionar nunca.

Lo que cambió no relaja ningún plazo. Cambia **cuándo se guarda**, **qué se conserva** y **qué se
le dice a la persona**.

## Las dos fases del reloj

Desde que el candidato aprieta *Empezar evaluación*, la plataforma maneja dos plazos distintos:

| Fase | Qué se puede hacer | Cuánto dura |
|---|---|---|
| **Responder** | Escribir, cambiar respuestas, guardar y enviar | El tiempo del test + la adaptación otorgada, si la hay |
| **Enviar** (gracia) | Ya no se puede editar; sí se puede enviar lo guardado | 30 minutos después de que termina el plazo para responder |
| **Cerrado** | Nada. La pantalla muestra "Se acabó el tiempo" | — |

Un test **sin límite de tiempo declarado** no tiene fase de gracia: tiene una sola ventana de 24 horas
desde que la persona empieza, y esa ventana es a la vez el plazo para responder y para enviar.

El reloj que se muestra siempre es el de la base de datos, no el del computador del candidato.
Cambiar la hora del equipo no da tiempo extra.

## Cómo se guarda una respuesta

El guardado es automático y silencioso. En las preguntas de texto abierto espera **450 milisegundos
sin escribir** antes de mandar; en las de selección, 150.

Ese temporizador **se reinicia con cada tecla**. Es la parte importante y la que causó el caso fuente:
quien escribe de corrido, sin pausar, nunca lo dispara. No pierde los últimos segundos de tipeo —
puede perder la respuesta entera.

Por eso existe el **guardado preventivo**: dentro de los **30 segundos previos al plazo para
responder**, la plataforma deja de esperar la pausa y guarda de inmediato, y después cada 5 segundos
hasta que el plazo se cumple.

- Guarda **antes** del plazo, texto escrito a tiempo. **No extiende nada.**
- Sólo aplica cuando el test tiene un límite declarado. Sin límite no hay un plazo de respuesta que
  proteger: el contador va hacia el cierre de 24 horas.
- Un guardado disparado *al cruzar* el plazo sería inútil: el navegador siempre va atrás del servidor,
  y el corte del guardado no tiene margen. Llegaría tarde y sería rechazado. Por eso es preventivo.

**Cambiar de pregunta ya no destruye el borrador.** Antes, abrir otra pregunta y volver pisaba lo
escrito con el valor guardado en el servidor — que estaba vacío si nunca se había alcanzado a guardar.
Hoy el borrador de la pregunta que se abandona se conserva en la sesión y vuelve tal cual.

## Qué pasa cuando termina el plazo para responder

Al entrar en la fase de gracia:

- El campo de texto pasa a **solo lectura**, no se vacía ni desaparece. El candidato puede leer,
  seleccionar y **copiar** lo que escribió. Antes quedaba deshabilitado, y ese estado dependía del
  estilo gris que pone el navegador, que en esta pantalla no se veía.
- El campo se muestra **visiblemente congelado** (borde punteado, fondo distinto): que sea de solo
  lectura tiene que notarse, no adivinarse.
- Aparece una banda que dice qué pasó y **cuántas respuestas quedaron guardadas**: `Guardadas: 3 de 5`.
  Ese conteo se calcula con lo que el servidor confirmó, no con lo que hay en pantalla.

### La banda es condicional, y por una razón

El servidor **exige la evaluación completa** para aceptar un envío. Si falta aunque sea una respuesta,
enviar es imposible — y prometerlo sería repetir la misma mentira que este trabajo vino a corregir.

| Situación en la gracia | Qué dice la banda | Botón de envío |
|---|---|---|
| Todas las respuestas guardadas | "Todas tus respuestas quedaron guardadas: todavía puedes enviar la evaluación." | Se muestra y funciona |
| Falta alguna | "Quedaron respuestas sin guardar, así que la evaluación no se puede enviar. Escríbele a quien te la envió para retomarla." | **No se muestra** |

Cuando falta una respuesta, la única salida real es humana. Por eso la banda deriva al contacto en
vez de ofrecer un botón que devolvería un error.

El aviso para lectores de pantalla sigue existiendo aparte y no se duplica: la banda visible no compite
con él.

## Los mensajes que puede ver el candidato

Los mensajes están agrupados **por lo que la persona puede hacer**, no por código de error. El servidor
sigue respondiendo con un texto genérico a propósito — es una pantalla pública sin sesión — y la
pantalla construye el mensaje honesto a partir del código.

| Cuándo aparece | Qué dice | Por qué |
|---|---|---|
| Falta responder la pregunta abierta | "Responde para continuar" | No hay nada que guardar todavía |
| El guardado llegó justo después del plazo | "Se cumplió el plazo para responder, así que esta respuesta no alcanzó a guardarse. Tu texto sigue en pantalla: cópialo antes de salir." | Reintentar no puede funcionar; lo único que sirve es rescatar el texto |
| El envío se rechaza por respuestas faltantes | "Quedaron respuestas sin guardar, así que la evaluación no se puede enviar. Escríbele a quien te la envió." | Tampoco se resuelve reintentando |
| Falla real de red o de sistema | "Prueba de nuevo en unos minutos. Si el problema sigue, avisa a quien te contactó." | Acá reintentar **sí** sirve: es su caso legítimo |

Los dos caminos que pueden fallar —el guardado automático y el envío— usan el mismo criterio. Antes
ambos terminaban en el mensaje genérico, incluso cuando reintentar era imposible.

No hay botón de "Reintentar" en esta pantalla: el error se muestra como texto. Eso es deliberado —
no se ofrece una acción donde no puede funcionar.

## Lo que no cambió

- **El plazo para responder sigue cerrando el guardado.** Ninguna de estas mejoras lo relaja. Si una
  solución necesitara relajarlo, la solución estaría mal.
- La duración del test y los 30 minutos de gracia son los mismos.
- Recuperar el acceso al test nunca devuelve tiempo: es un problema de acceso, no de reloj. Ver
  [Entrega y recuperación de acceso a tests](entrega-y-recuperacion-de-acceso-a-tests.md).
- El candidato no ve puntajes, ni datos del proceso interno, ni nada del operador. La pantalla es
  pública y su superficie es mínima a propósito.

## Límites

- **No existe autoguardado continuo mientras se escribe.** El guardado preventivo dispara una vez al
  entrar en la ventana de 30 segundos y después a intervalo fijo; fuera de esa ventana el guardado
  sigue esperando una pausa. Eliminar la clase de problema de raíz cambia el contrato de guardado y
  está declarado como trabajo aparte.
- **La plataforma no puede rescatar un texto que nunca se guardó.** Lo que no llegó al servidor sólo
  existe en la pantalla del candidato: por eso el mensaje le pide copiarlo antes de salir.
- **Un test sin límite declarado no muestra fase de gracia.** No es una omisión: no hay dos plazos
  que separar.
- **El estado de la prueba no cambia solo cuando se acaba el tiempo.** Pasa a vencida la próxima vez
  que el sistema la toca — un intento de guardar o de enviar del candidato. Hasta entonces el operador
  puede seguir viéndola "En curso".
- **El conteo `Guardadas: X de Y` sólo lo ve el candidato.** Mientras la prueba está en curso, la
  revisión interna dice "El candidato aún no completa la evaluación" y no muestra respuesta por
  respuesta.

## Referencias

- Manual: [Atender a un candidato que perdió su respuesta o no puede enviar](../../manual-de-uso/hr/atender-a-un-candidato-que-perdio-su-respuesta.md)
- Manual: [Recuperar acceso al test de un candidato](../../manual-de-uso/hr/recuperar-acceso-a-test-de-candidato.md)
- Funcional: [Entrega y recuperación de acceso a tests](entrega-y-recuperacion-de-acceso-a-tests.md)
- Funcional: [Asignación de Tests por Etapa](asignacion-de-tests-por-etapa.md)
- Arquitectura: [GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1](../../architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md)
