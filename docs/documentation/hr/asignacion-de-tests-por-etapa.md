# Asignación de tests por etapa

> **Tipo de documento:** Documentación funcional (lenguaje simple)
> **Versión:** 1.1
> **Creado:** 2026-08-17 por Claude (TASK-1719)
> **Última actualización:** 2026-08-17 por Claude (TASK-1719 — ajustes razonables)
> **Documentación técnica:** [`GREENHOUSE_HIRING_ASSESSMENT_ASSIGNMENT_POLICY_DECISION_V1.md`](../../architecture/GREENHOUSE_HIRING_ASSESSMENT_ASSIGNMENT_POLICY_DECISION_V1.md)
> **Manual de uso:** [`operar-asignacion-de-tests.md`](../../manual-de-uso/hr/operar-asignacion-de-tests.md)

## Qué problema resuelve

Antes, cada vez que alguien quería mandarle la prueba a un candidato tenía que elegir a mano
qué plantilla corresponde. Nada en la plataforma decía cuál es la prueba de esa vacante, así
que dos personas podían elegir distinto para el mismo cargo — y comparar dos candidatos que
rindieron exámenes diferentes no significa nada.

Ahora **la vacante declara su prueba una sola vez**, y a partir de ahí la plataforma la resuelve
sola. Quien asigna ya no elige plantilla: confirma.

## En qué etapa se manda la prueba

**En Preselección.** Es la etapa canónica recomendada, y la razón no es de eficiencia:

**La prueba es la evidencia con la que se arma la entrevista, no un paso posterior.** Lo que mejor
predice desempeño es la combinación de entrevista estructurada + muestra de trabajo — pero esa
ganancia no aparece por tener las dos cosas: aparece cuando la entrevista puede ir a buscar
justamente lo que la prueba dejó abierto. Mandarla al entrar a Entrevista entrega los dos métodos
sin la combinación: se entrevista a ciegas y el resultado llega cuando ya no puede cambiar ninguna
pregunta.

**Y el momento del filtro es una decisión de equidad.** Una prueba de 45 minutos no pagada,
aplicada temprano, no sesga por el puntaje: sesga por **quién logra completarla** — quien tiene
trabajo actual, personas a cargo, conexión limitada o menos margen económico abandona más. Ese
sesgo es invisible en las métricas de calificación, porque esas personas nunca llegan a tener una.
En Preselección la población ya está acotada, el pedido tiene contrapartida para el candidato
("avanzaste, este es el siguiente paso"), y si la tasa de completación cae, esa señal sí se puede
interpretar.

Entrevista sigue siendo una opción válida —por ejemplo, una prueba después de una primera
conversación— pero elegirla debería ser deliberado.

**Screening no está disponible a propósito**: no es una etapa que le comunique nada al candidato,
así que si la asignación se bloqueara ahí, la persona no recibiría nada. Habilitarla exige decidir
primero qué se le dice.

> **Qué vigilar desde el primer día:** la tasa de completación por cohorte. Es donde aparecería un
> sesgo por abandono, y no se ve mirando puntajes.

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

## Ajustes razonables (tiempo extra)

A veces una persona necesita más tiempo para rendir: una condición de salud, una discapacidad, una
situación temporal. Eso se llama **ajuste razonable**, y ahora se puede conceder de verdad.

**Cómo llega el pedido.** Los correos del proceso incluyen una línea que lo invita: *"si necesitas
más tiempo o algún ajuste, respóndenos este correo"*. El candidato pide por ese canal humano; nadie
tiene que declarar una condición en un formulario público antes de ser evaluado.

**Qué se concede.** Minutos adicionales sobre el límite de la prueba (entre 1 y 180). Se puede
otorgar mientras la prueba esté asignada, enviada o incluso **mientras la persona la está
rindiendo** — el contador se le alarga en el momento. Una vez entregada, corregida o vencida ya no:
no queda tiempo que extender.

**Qué NO se guarda: el motivo.** Y no es un olvido. Un ajuste revela, por su naturaleza, una
condición de discapacidad o de salud: un dato protegido. Si la plataforma guardara "dislexia" o
"post-operatorio" junto al expediente, estaría creando exactamente el registro con el que después
se discrimina. Se guarda **sólo el arreglo**: cuántos minutos, quién los otorgó y cuándo. Si el
equipo necesita dejar constancia de la conversación, va al **expediente de evaluación**, que tiene
sus propias reglas de acceso.

**Qué ve el candidato.** Un aviso en su pantalla: *"Tiempo extendido aplicado (+30 min)"*. Ve el
tiempo que efectivamente tiene, nunca quién se lo dio ni por qué.

**Otras reglas:**

- **Volver a otorgar reemplaza, no suma.** Si se puso 15 y correspondían 45, se otorga 45 y queda
  45 — así se corrige un monto mal puesto.
- **Otorgar el mismo monto que ya está no cambia nada** (ni siquiera el registro de quién lo dio),
  para que un doble clic no ensucie la trazabilidad.
- **Solo lo puede hacer People**, no cualquier persona con acceso al portal.
- **No depende de ninguna configuración encendida.** Acomodar a alguien tiene que poder hacerse
  siempre.
- **La plataforma no le avisa sola al candidato** que se le concedió. Eso lo escribe una persona,
  igual que en una cancelación.

## Reglas que la plataforma no rompe

- **Quien asigna nunca elige la plantilla.** La resuelve la vacante. Esto vale igual para una
  persona, para un agente y para cualquier integración futura.
- **El disparador es la etapa, jamás un puntaje.** Ninguna nota, coincidencia o inferencia mueve
  una postulación ni dispara una prueba. Es lo que mantiene esta automatización fuera de la
  categoría de sistemas que deciden sobre personas.
- **Nunca se asigna dos veces por reintentar.** Si el sistema procesa el mismo evento otra vez,
  no se crea una segunda prueba ni sale un segundo correo.
- **Asignado, despachado y entregado son hechos distintos.** `sent` sólo significa que el proveedor aceptó
  el despacho. Si se pierde el acceso, la recuperación gobernada actúa sobre la misma instancia; su rollout
  todavía está pendiente. Ver [Entrega y recuperación de acceso a tests](entrega-y-recuperacion-de-acceso-a-tests.md).
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
