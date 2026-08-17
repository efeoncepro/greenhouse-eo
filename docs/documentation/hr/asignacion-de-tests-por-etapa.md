# Asignación de tests por etapa

> **Tipo de documento:** Documentación funcional (lenguaje simple)
> **Versión:** 1.0
> **Creado:** 2026-08-17 por Claude (TASK-1719)
> **Última actualización:** 2026-08-17 por Claude (TASK-1719)
> **Documentación técnica:** [`GREENHOUSE_HIRING_ASSESSMENT_ASSIGNMENT_POLICY_DECISION_V1.md`](../../architecture/GREENHOUSE_HIRING_ASSESSMENT_ASSIGNMENT_POLICY_DECISION_V1.md)
> **Manual de uso:** [`operar-asignacion-de-tests.md`](../../manual-de-uso/hr/operar-asignacion-de-tests.md)

## Qué problema resuelve

Antes, cada vez que alguien quería mandarle la prueba a un candidato tenía que elegir a mano
qué plantilla corresponde. Nada en la plataforma decía cuál es la prueba de esa vacante, así
que dos personas podían elegir distinto para el mismo cargo — y comparar dos candidatos que
rindieron exámenes diferentes no significa nada.

Ahora **la vacante declara su prueba una sola vez**, y a partir de ahí la plataforma la resuelve
sola. Quien asigna ya no elige plantilla: confirma.

## Las dos formas de asignar

Ambas terminan en el mismo lugar y dejan el mismo rastro.

| Forma | Quién la dispara | Cuándo conviene |
|---|---|---|
| **Manual** | Una persona, desde la postulación | Siempre disponible. Es el camino por defecto y el único mientras la automática esté apagada |
| **Automática** | La plataforma, al entrar la postulación a la etapa declarada | Cuando el volumen justifica no hacerlo a mano y la vacante ya rodó al menos un ciclo completo |

La automática **no decide a quién contratar ni a quién descartar**. Sólo entrega un instrumento
cuando alguien mueve la postulación de etapa. La decisión de moverla sigue siendo humana, y la
de contratar también.

## Cómo funciona la forma manual (proponer → confirmar)

No es un botón que ejecuta. Son dos pasos a propósito:

1. **Proponer** genera una vista previa: qué plantilla se va a usar, de qué versión, cuánto
   tiempo tendrá el candidato, y si hay algo que lo impida (por ejemplo, que no tengamos su
   correo). Esta vista previa no manda nada.
2. **Confirmar** ejecuta lo que la vista previa mostró.

Entre ambos pasos la plataforma guarda una "huella" de lo que se mostró. Si algo cambia en el
medio —se edita la política de la vacante, se archiva una pregunta, el candidato avanza de
etapa— **el confirmar se rechaza** en lugar de ejecutar algo distinto de lo que la persona
aprobó. Y una propuesta caduca a los 30 minutos: si alguien abre la pantalla, se va, y vuelve
más tarde, tiene que volver a mirar antes de mandarle un correo a un candidato.

Confirmar dos veces no manda dos pruebas. La segunda vez responde que ya estaba hecho.

## Qué recibe el candidato

**Una sola comunicación por movimiento. Ni cero ni dos.**

- Si la vacante tiene prueba declarada para esa etapa y la prueba se asigna → recibe **el correo
  de la prueba**, con su enlace. El aviso genérico de "avanzaste" no se manda además.
- Si la asignación no se puede hacer → recibe **el aviso genérico de avance**, en ese mismo
  momento. Nunca se le promete una prueba que no existe.

Razones por las que una asignación no se puede hacer, todas visibles en la plataforma: no
tenemos su correo, la política está apagada, la plantilla quedó inactiva, se alcanzó el tope de
envíos de la ventana, la postulación ya tiene una prueba abierta, o la etapa cambió mientras
se procesaba.

## Cancelar una prueba

Se puede cancelar **sólo si el candidato todavía no empezó**. Una vez que abrió la prueba, ya no:
cancelarla borraría trabajo suyo.

Al cancelar:

- El enlace queda muerto de inmediato. Quien lo abra ve la misma pantalla genérica que vería con
  cualquier enlace inválido — nada revela que existió y se canceló.
- La cancelación **libera el cupo**: se le puede volver a asignar la misma prueba. Eso es lo que
  la convierte en una recuperación de verdad y no sólo en un cierre.
- Queda registrada con quién la canceló y por qué. El registro nunca se borra.
- **Si el correo con el enlace ya había salido**, la plataforma lo declara explícitamente: hay
  que avisarle a la persona. No se manda una corrección automática — no existe un texto
  aprobado para eso, y mandar algo improvisado a un candidato es peor que pedirle a un humano
  que escriba.

Una prueba cancelada **no entra al expediente de evaluación**. Cancelar es un acto administrativo
nuestro y esa instancia nunca tuvo respuestas; dejarla aparecer invitaría a leerla como "no
completó la evaluación", que es exactamente lo contrario de lo que pasó.

## Reglas que la plataforma no rompe

- **Quien asigna nunca elige la plantilla.** La resuelve la vacante. Esto vale igual para una
  persona, para un agente y para cualquier integración futura.
- **El disparador es la etapa, jamás un puntaje.** Ninguna nota, coincidencia o inferencia mueve
  una postulación ni dispara una prueba. Es lo que mantiene esta automatización fuera de la
  categoría de sistemas que deciden sobre personas.
- **Nunca se asigna dos veces por reintentar.** Si el sistema procesa el mismo evento otra vez,
  no se crea una segunda prueba ni sale un segundo correo.
- **Un reintento automático nunca cuenta como segundo intento.** Volver a tomar una prueba es
  siempre una decisión humana explícita, con su razón registrada.
- **La etapa que se comunica es la vigente**, no la del momento en que se hizo clic. Si alguien
  mueve una postulación dos veces seguidas, el candidato recibe una comunicación por donde
  efectivamente quedó.
- **Un movimiento de hace más de 24 horas no comunica nada.** Pasa a una lista para que una
  persona decida. Avisarle a alguien "avanzaste" por algo de la semana pasada es peor que
  callar.

## Qué mirar cuando algo se ve raro

La plataforma vigila sola tres cosas y las muestra en el panel de operaciones:

| Señal | Qué significa | Qué hacer |
|---|---|---|
| Asignaciones a medio registrar | Un proceso murió a mitad de camino. **Nunca debería pasar** | Escalar: es un error de la plataforma, no de operación |
| Postulaciones esperando su prueba | Llegaron a la etapa y no se les asignó nada | Revisar la lista de recuperación y asignar a mano |
| Propuestas vencidas sin cerrar | Alguien abre la pantalla y no confirma | Fricción en la experiencia, no corrupción de datos |

> Detalle técnico: política y ledger en `src/lib/hiring/assessment/assignment-policy/**`;
> cancelación en `src/lib/hiring/assessment/cancel.ts`; decisión de comunicación en
> `src/lib/hiring/stage-comms/**`; señal `hiring.assessment.assignment_health`.
