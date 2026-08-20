# Recuperar acceso al test de un candidato

> **Tipo de documento:** Manual de uso
> **Versión:** 2.0
> **Creado:** 2026-08-19 por Codex (TASK-1745, TASK-1746, ISSUE-160)
> **Última actualización:** 2026-08-20 por Claude (TASK-1747, TASK-1757)
> **Documentación funcional:** [Entrega y recuperación de acceso a tests](../../documentation/hr/entrega-y-recuperacion-de-acceso-a-tests.md)

## Para qué sirve

Cuando un candidato te dice que no le llegó el correo del test, que el enlace no le funciona o que
se le venció antes de empezar, esta acción le emite un acceso nuevo **al mismo test**. No crea una
segunda prueba, no cambia su etapa, no toca su puntaje ni sus respuestas, y **nunca le devuelve
tiempo** a quien ya empezó.

No la uses para cambiar la prueba, dar tiempo adicional ni reabrir una evaluación terminada.

## Antes de empezar

- Necesitas tener abierta la **postulación correcta** (Application 360 → tarjeta *Assessment y
  scorecard*). No operes desde la vacante: la vacante no tiene el test de esa persona.
- Hay **dos permisos distintos**, y se otorgan por separado:
  - reenviar por correo → `hiring.assessment.recover_access_email`
  - obtener el enlace temporal → `hiring.assessment.reveal_access_link`
  Si te falta uno, verás sólo el otro canal. Si te faltan los dos, la tarjeta te dice que no tienes
  permiso y a quién pedírselo.
- **La pantalla ya no muestra ninguna credencial.** Antes había un enlace visible en la ficha; ese
  enlace era el mismo que el correo al candidato rotaba dos minutos y medio después, así que
  copiarlo y pasárselo entregaba un acceso muerto. Pasó con una candidata real el 2026-08-19. Hoy la
  ficha ofrece la **acción**, no el enlace.
- **«Enviado» no es «recibido».** `sent` significa que el proveedor de correo aceptó el despacho. No
  prueba que el mensaje llegó al buzón. No se lo presentes al candidato como prueba de entrega.

### Dónde está disponible hoy

| Pieza | Estado |
|---|---|
| Recuperación por correo y por enlace (backend, permisos, correo del candidato) | En producción |
| La pantalla nueva de Application 360 y el aviso de rotación al candidato | En `develop` (staging); su promoción a producción es un paso aparte |

Si operas en producción y no ves el bloque de recuperación en la ficha, es porque esa promoción
todavía no ocurre — no porque te falte un permiso.

## Asignar un test (lo que cambió al lado)

En la misma tarjeta, cuando la persona **no tiene** test asignado, el botón *Asignar test* abre una
**vista previa** antes de confirmar:

- **Tú ya no eliges la plantilla.** La vacante define qué test corresponde; el servidor lo resuelve y
  te lo muestra con su tiempo límite.
- Si hay algo que impide asignar, lo ves **antes** de confirmar, con su causa: la vacante no tiene
  política habilitada, la vacante asigna a mano, el test que define ya no está activo, la
  candidatura ya tiene decisión, la persona no tiene correo registrado, o ya hay un test abierto.
- **Sin correo registrado el test no se crea.** Registra el correo de la persona primero.
- Si la persona ya tiene un test abierto, no se asigna otro: ahí es donde entra *Recuperar acceso*.

## Recuperar el acceso, paso a paso

### 1. Abre la acción

En la tarjeta del test, botón **Recuperar acceso**. Al lado ves cuántos envíos por correo te quedan
en las últimas 24 horas.

Si la tarjeta muestra en cambio un aviso de *No se puede recuperar el acceso*, léelo: cada causa
tiene su propio texto y su propio remedio (ver la tabla más abajo).

### 2. Elige el canal

| Canal | Cuándo | Qué hace |
|---|---|---|
| **Por correo** | El correo de la persona es correcto y el proveedor no lo bloquea | Le manda un acceso nuevo a su buzón. Vigencia para empezar: 14 días |
| **Enlace de acceso temporal** | El correo está bloqueado, no sirve, o la persona pide otra vía | Te entrega **a ti** un enlace para que se lo hagas llegar por otro canal, después de verificar su identidad. Vigencia: 24 horas |

Un canal que no se puede usar aparece deshabilitado. El bloqueo del correo **no** bloquea el enlace
temporal: son puertas independientes, con cuota y espera propias.

### 3. Elige el motivo

| Motivo | Cuándo usarlo |
|---|---|
| Dice que no le llegó el correo | La persona reporta que no lo ve |
| Dice que el enlace no le funcionó | La persona reporta un enlace roto o vencido |
| Pidió recibirlo por otro canal | Te lo pidió explícitamente |
| El correo rebotó o falló el envío | **Tú** viste la falla de envío, no es un reporte del candidato |
| Se le venció antes de empezar | El test figura vencido y la persona nunca lo empezó |

El motivo no es papeleo: **cambia la respuesta del sistema**. Un test vencido sólo se puede recuperar
declarando *«Se le venció antes de empezar»* — es la única forma de probar que el acceso caducó antes
de que la persona empezara. Si la tarjeta te dice que el test figura vencido pero no se puede probar
cuándo caducó, ése es el motivo que tienes que elegir.

Los motivos que dicen «Dice que…» lo dicen a propósito: nadie puede afirmar que un correo **no**
llegó, y esto queda escrito en un registro que no se edita.

### 4. Lee si el candidato se va a enterar

Antes de confirmar, cuando eliges **enlace temporal**, el diálogo te dice una de dos cosas:

- **«Le avisaremos por correo que su acceso anterior dejó de servir»** — el enlace **no** va en ese
  correo. Sólo le dice que el anterior murió y que puede responder para pedir ayuda.
- **«No le vamos a avisar»**, con la razón: no hay correo registrado, el proveedor bloquea esa
  dirección, declaraste tú que el envío falló, o el acceso nuevo ya estaría vencido.

Esto importa porque emitir el enlace **mata la credencial anterior de la persona**. Si le escribes
por WhatsApp «te llegó un correo» cuando ningún correo salió, la dejas esperando algo que no existe.
Cuando la pantalla dice que no se le va a avisar, **la entrega en mano es su única vía**.

Por el canal **correo** no hay aviso aparte: el propio correo de recuperación ya le dice que el
enlace anterior dejó de servir.

### 5. Confirma y lee el resultado

| Resultado | Qué significa | Qué haces |
|---|---|---|
| Correo despachado | El proveedor aceptó el envío. **No** confirma que llegó | Si la persona insiste en que no lo ve, recupera de nuevo o usa el enlace temporal |
| El envío está en curso | Todavía no hay desenlace | Actualiza en unos segundos |
| No pudimos confirmar el despacho | La credencial sí se renovó, pero no se cerró la evidencia del envío | Revisa el estado antes de reintentar; no reenvíes a ciegas |
| El proveedor rechazó el envío | El correo no salió | Usa el enlace temporal |
| Esta misma recuperación ya se había hecho | Es un repetido, no salió un correo nuevo | Cierra y vuelve a empezar si de verdad necesitas otro envío |
| Enlace listo | Se abre la ventana de revelación | Ver la sección siguiente **antes de cerrarla** |

## El enlace temporal se muestra UNA vez

Cuando el resultado es un enlace, se abre una ventana que dice *«Enlace listo — se muestra una sola
vez»*. Es literal:

1. **Verifica primero con quién estás hablando**, por un canal que ya tengas confirmado. Ésa es la
   razón de existir de este canal; el enlace no viaja por correo justamente para que esa
   verificación ocurra.
2. **Copia el enlace ahora.** El botón *Copiar enlace* te confirma cuando quedó copiado. Si te dice
   que no pudo copiarlo, selecciónalo y cópialo a mano **antes de cerrar**.
3. **No cierres la ventana sin haberlo copiado.** No vuelve. Ni recargando, ni volviendo a entrar a
   la ficha. La única forma de conseguir otro es recuperar el acceso de nuevo, y eso consume otro de
   tus tres intentos del día.
4. La ventana **no se cierra con Escape ni haciendo clic afuera**, a propósito: un reflejo destruía
   una credencial que no se vuelve a mostrar. Ciérrala con su botón, cuando ya lo tengas.
5. Mándaselo **sólo a esa persona**. No lo pegues en tickets, notas, chats de equipo ni correos
   internos.
6. Dile que el acceso nuevo invalida cualquier enlace anterior, y que **si ya había empezado, el
   reloj no se reinicia**.

«Una sola vez» se refiere a la revelación **a ti**. El candidato sí puede abrir, recargar, guardar y
enviar mientras su sesión y su plazo sigan vigentes.

## Cuándo NO se puede, y qué hacer

### El test entero no es recuperable

| Lo que dice la pantalla | Qué hacer |
|---|---|
| Esta evaluación no se rinde con enlace | Nada: no hay acceso que recuperar (es un scorecard de entrevistador) |
| Esta candidatura ya tiene una decisión registrada | Revísala en la pestaña *Decisión*. Aplica con **cualquier** decisión, incluida una favorable |
| La persona retiró su consentimiento | No insistas por ningún canal |
| Ya se le acabó el tiempo para responder | El plazo venció; no se recupera |
| Empezó el test y se le venció el plazo | No se recupera. Si corresponde una accommodation, usa su flujo |
| El test ya se rindió | No hay acceso que recuperar |
| **Este test se canceló** | Sí tiene salida: **asígnale un test otra vez** |
| Este test figura vencido, pero no podemos probar cuándo caducó | Si nunca lo empezó, elige el motivo *«Se le venció antes de empezar»* y vuelve a intentar |
| Los datos de este test quedaron inconsistentes | Repórtalo a plataforma con el ID de la postulación |

### El test sí es recuperable, pero un canal está cerrado

| Lo que dice la pantalla | Qué significa | Qué hacer |
|---|---|---|
| No tenemos un correo registrado para esta persona | No hay a quién escribirle | Usa el enlace temporal; el candidato **no** recibirá aviso |
| El proveedor está bloqueando los envíos a esta dirección | Rebote, marca de spam o supresión | Usa el enlace temporal. **No insistas por correo**: no va a salir y desgasta la reputación de envío del dominio para todos los demás candidatos |
| El correo agotó sus 3 intentos de 24 horas | Cuota del canal correo | Todavía puedes usar el enlace temporal |
| Este test agotó las recuperaciones de las últimas 24 horas por los dos canales | Ambas cuotas | Vuelve mañana |
| Espera N s antes de recuperar de nuevo | Espera de 60 segundos **de ese canal** | Espera; el otro canal no está esperando |
| No tienes permiso para recuperar acceso | Te falta la capability | Pídesela a Admin o a People Ops |

**Cuota y espera son por canal, no compartidas**: 3 recuperaciones exitosas por canal en 24 horas y
60 segundos entre intentos del mismo canal. Un correo recién enviado **no** apaga el enlace temporal.

## Qué le llega al candidato

| Situación | Qué recibe |
|---|---|
| Recuperaste **por correo** | Un correo con su **acceso nuevo**, diciendo que cualquier enlace anterior dejó de ser válido. Si ya había empezado, le recuerda que el reloj sigue corriendo y cuál es su plazo original |
| Recuperaste **por enlace temporal**, con correo válido | Un aviso **sin el enlace**: le dice que reemplazamos su acceso, hasta cuándo vale el nuevo, que ese acceso se le entrega por otra vía, y que si no le llega o le llega vencido **responda ese correo**. Si estaba rindiendo, le aclara que el tiempo no se reinicia |
| Recuperaste **por enlace temporal**, sin correo o con el buzón bloqueado | **Nada.** No se entera de que su acceso cambió. Tu entrega en mano es lo único que tiene |

Las respuestas del candidato a cualquiera de estos correos llegan a **`people@efeoncepro.com`**. Ese
buzón tiene que estar atendido: el aviso de rotación le promete explícitamente que responder sirve.
Un correo que ofrece ayuda que nadie contesta deja a la persona peor que el silencio.

## Tiempos que debes explicar

- **Antes de empezar:** 14 días si recuperaste por correo, 24 horas si fue por enlace temporal.
- **Después de empezar:** el tiempo efectivo corre desde que empezó, incluidas accommodations.
- **Al vencer las respuestas:** 30 minutos de gracia para enviar lo ya guardado; no admite respuestas
  nuevas.
- **Sin límite de tiempo declarado:** ventana operativa de 24 horas desde el inicio.

**Recuperar acceso nunca agrega tiempo.** Si corresponde extender, usa el flujo gobernado de
accommodations antes de explicarle el plazo final a la persona.

## Qué no hacer

- **No cierres la ventana del enlace sin copiarlo.** No vuelve.
- **No canceles ni reasignes** el test para conseguir otro enlace. Eso crea una segunda prueba y
  rompe la evidencia de la primera.
- **No busques ni copies tokens** desde SQL, logs, auditoría ni payloads. Ese camino no existe.
- **No armes la URL a mano** ni improvises un enlace.
- **No insistas por correo cuando el proveedor bloqueó esa dirección.** No es preferencia del
  candidato: es un control activo, y forzarlo daña la entregabilidad de todos los demás.
- **No pegues el enlace** en tickets, notas, Teams, historiales ni correos internos.
- **No le digas al candidato «te llegó un correo»** sin haber leído antes la predicción del aviso. Si
  la pantalla dijo que no se le iba a avisar, no le llegó nada.
- **No presentes «Enviado» como prueba de entrega.**

## Problemas comunes

| Síntoma | Causa probable | Acción |
|---|---|---|
| No veo el bloque de recuperación en la ficha | La pantalla nueva todavía no está promovida a ese entorno, o te faltan **ambos** permisos | Verifica el entorno; si es producción, la promoción está pendiente |
| Sólo veo un canal | Tienes uno de los dos permisos, o el otro canal está bloqueado | El texto al lado te dice cuál de las dos cosas es |
| Copié el enlace y ya no está | Es el comportamiento correcto: se muestra una sola vez | Recupera de nuevo si lo perdiste; consume un intento |
| Dice que el estado del test cambió mientras confirmaba | Alguien más movió la postulación al mismo tiempo | Cierra, revisa la tarjeta y decide de nuevo |
| Dice que esta confirmación ya se usó | Reintentaste una confirmación ya consumida | Cierra y vuelve a empezar la recuperación |
| Dice que el correo de la persona cambió mientras confirmabas | El contacto se editó en paralelo | Revisa el contacto y vuelve a intentar |
| No pudimos leer si se puede recuperar | Falla nuestra al consultar, **no** un cambio en su evaluación | El test sigue como estaba; reintenta |
| Rotaste por enlace y la persona nunca apareció | La entrega en mano pudo fallar | Existe la señal `hiring.assessment.access_recovery.rotation_unnotified` en `/admin/operations`, que vigila justamente las rotaciones donde ni el aviso salió. Su valor normal es 0 |

## Referencias

- Funcional: [Entrega y recuperación de acceso a tests](../../documentation/hr/entrega-y-recuperacion-de-acceso-a-tests.md)
- Emails: [Operar los Emails del Ciclo de Hiring](operar-emails-ciclo-hiring.md)
- Assessments: [Operar la Asignación de Tests por Etapa](operar-asignacion-de-tests.md)
- Arquitectura: [GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1](../../architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md)
