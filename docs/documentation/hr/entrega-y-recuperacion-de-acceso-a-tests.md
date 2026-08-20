# Entrega y recuperación de acceso a tests

> **Tipo de documento:** Documentación funcional
> **Versión:** 1.1
> **Creado:** 2026-08-19 por Codex (TASK-1745, TASK-1746, ISSUE-160)
> **Última actualización:** 2026-08-20 por Claude (TASK-1747, TASK-1757)
> **Estado operativo:** la recuperación (comando, permisos y correo al candidato) está en producción
> desde el 2026-08-19. La superficie del operador en Application 360 y el aviso de rotación al
> candidato están en `develop`/staging; su promoción a producción es un paso aparte. La sesión pública
> nueva sigue apagada.

## El problema que resuelve

Asignar una evaluación, pedirle al proveedor que envíe un correo y lograr que el candidato reciba y abra
el acceso son hechos distintos. Greenhouse conserva esa diferencia para no mostrar “entregado” cuando sólo
existe aceptación técnica del despacho y para recuperar el acceso sin crear otra evaluación.

| Hecho | Qué prueba | Qué no prueba |
|---|---|---|
| Assessment `assigned` | Existe una instancia para esa postulación | Que se haya enviado o recibido un correo |
| Delivery `sent` | Resend aceptó el despacho | Entrega en el buzón, apertura o lectura |
| Provider `delivered` | Un webhook firmado confirmó entrega | Que la persona lo haya leído |
| Provider `bounced`, `complained` o `suppressed` | El canal email está bloqueado o degradado | Que el assessment haya dejado de ser válido |
| Provider `opened` o `clicked` | Señal de interacción | Sustituto de `delivered` |

El webhook de Resend es observador: registra hechos posteriores al envío y nunca participa en el camino
crítico del correo saliente. Si el webhook falla, los demás correos deben seguir enviándose. Su lifecycle
quedó operativo en producción con el cierre de TASK-1745.

## Credenciales sensibles

Los accesos de assessment se tratan como credenciales. Antes de emitir o rotar un token, Greenhouse reserva
un intent durable con identificadores y metadata segura. El token, la URL completa, el nombre y los datos de
contacto no se guardan en payloads genéricos, auditoría ni logs.

Estos envíos no usan retry genérico. Si el proveedor aceptó el correo pero no fue posible cerrar la evidencia
local, el resultado es `unknown`: no se inventa `sent` ni se reenvía a ciegas. Un intent pendiente o incierto
queda visible para recuperación explícita.

## Recuperar acceso sin duplicar la evaluación

La recuperación actúa sobre el mismo `hiring_assessment`. No cancela ni crea otra instancia, no cambia etapa,
puntaje, respuestas ni decisión. Un token nuevo invalida el anterior.

Hay dos canales excluyentes:

- **Email:** rota el acceso y solicita un nuevo correo. Tiene vigencia de inicio de 14 días. Se bloquea cuando
  el proveedor registra `bounced`, `complained` o `suppressed` para ese destinatario.
- **Enlace seguro:** rota el acceso y revela una URL una sola vez al operador autorizado para compartirla por
  un canal verificado. Tiene vigencia de inicio de 24 horas. Repetir el command devuelve el recibo, nunca la URL.

El bloqueo del email no bloquea el enlace seguro. La recuperación exige sesión humana, capability específica,
aplicación activa, razón estructurada y trazabilidad sólo con IDs.

**Cuota y espera son por canal, no compartidas:** hasta tres rotaciones exitosas por canal en 24 horas y
60 segundos entre intentos del mismo canal. Compartirlas hacía que un correo recién enviado apagara el
enlace seguro durante un minuto, que es exactamente ocultarle al candidato la única salida que le quedaba.

Los dos canales tienen **capabilities distintas**, y se otorgan por separado:
`hiring.assessment.recover_access_email` para reenviar por correo y `hiring.assessment.reveal_access_link`
para revelar el enlace. Tener una no implica la otra.

## Qué ve el operador (Application 360)

La tarjeta del assessment **no muestra ninguna credencial**. Antes exhibía en claro el enlace tokenizado;
como el correo al candidato rotaba ese mismo token minutos después, copiarlo y entregarlo en mano entregaba
un acceso ya muerto. La superficie ofrece la acción, nunca el valor.

- **Asignar** pasa por una vista previa: el servidor resuelve qué test corresponde según la política de la
  vacante — el operador ya no elige plantilla — y muestra el bloqueo, con su causa, **antes** de confirmar.
- **Recuperar** es una acción explícita con canal y motivo declarados. El motivo no es papeleo: un
  assessment `expired` sólo se habilita declarando `token_expired_before_start`, porque es el único motivo
  que prueba que el acceso caducó antes de que la persona empezara.
- **Cada bloqueo declara su causa y su remedio.** El DTO expone por canal *por qué* está cerrado — test no
  recuperable, sin correo registrado, buzón bloqueado por el proveedor, cuota agotada, espera de 60 s — en
  lugar de un booleano único. Colapsarlas mandaba las cinco al mismo mensaje, y el operador terminaba
  pidiéndole a Admin un permiso que ya tenía.
- **La revelación del enlace es única**: se muestra una sola vez, no sobrevive al cierre de la ventana ni a
  una recarga, y la ventana no se cierra con Escape para que un reflejo de teclado no destruya una
  credencial irrepetible.

## Aviso de rotación al candidato

Emitir un enlace seguro **mata la credencial anterior del candidato** y se la entrega en mano al operador.
Si esa entrega falla, la persona queda sin acceso, sin saber por qué y con su plazo corriendo — y como la
elegibilidad permite recuperar en `in_progress`, puede ser expulsada de una evaluación que estaba
respondiendo. El aviso cubre ese hueco.

- **Nunca lleva el enlace ni el token.** Ponerlo ahí anularía la verificación de identidad que es la razón
  de existir del canal. Sólo dice que el acceso anterior dejó de servir, hasta cuándo vale el nuevo, que se
  entrega por otra vía, y que puede responder ese correo para pedir ayuda.
- **No se envía** cuando el canal fue correo (ese mensaje ya lleva el aviso y la credencial juntos), cuando
  no hay correo registrado, cuando el proveedor bloquea esa dirección, cuando el operador declaró que el
  envío falló, o cuando la credencial nueva ya estaría vencida.
- **El operador ve la predicción antes de confirmar.** La misma decisión que ejecuta el envío se evalúa en
  la pantalla, para que nadie avise «te llegó un correo» cuando ningún correo salió.
- **Las respuestas del candidato llegan a un buzón atendido.** Los ocho tipos candidate-facing del ciclo
  ahora declaran `Reply-To` hacia `people@efeoncepro.com` (`HIRING_CANDIDATE_REPLY_TO_EMAIL`). Antes no
  existía: una respuesta caía en la dirección de envío verificada del proveedor, que nadie lee — y varios de
  esos correos le piden explícitamente responder.
- **Una recuperación por enlace no deja rastro de entrega**, por diseño: no produce fila de `email_deliveries`.
  Por eso existe la señal `hiring.assessment.access_recovery.rotation_unnotified` (estado normal 0), que
  vigila las rotaciones con credencial todavía viva donde el aviso debía salir y no hay evidencia de que
  saliera. Las omisiones legítimas quedan fuera de su población: son decisiones del dominio, no fallas.

## Estados y continuidad del candidato

- `assigned` o `sent`: recuperable si el test no comenzó.
- `in_progress`: recuperable sólo mientras el plazo de respuestas siga vigente. Recuperar acceso no reinicia
  ni extiende el reloj.
- `expired`: recuperable únicamente si nunca comenzó y se puede demostrar que expiró el acceso.
- `submitted`, `scored`, `cancelled`, plazo total vencido, postulación retirada o terminal: no recuperable.

Antes de comenzar, la vigencia corresponde al acceso. Al comenzar, el plazo de respuestas se calcula desde
`started_at` con el tiempo efectivo y accommodations. Después existe una gracia de 30 minutos que congela
respuestas nuevas pero permite enviar las ya guardadas. Un assessment sin límite usa una ventana operativa de
24 horas desde el inicio. El reloj canónico es el de base de datos.

## Sesión pública y corte gradual

La superficie nueva intercambia el token desde el fragmento `#access=...` por una cookie de sesión
`HttpOnly`, `Secure` y `SameSite=Lax`. Después, cargar, iniciar, guardar, enviar y resolver identidad funcionan
sin bearer en la URL. El fragmento no viaja al servidor y una recarga continúa la sesión.

El flag `HIRING_ASSESSMENT_PUBLIC_SESSION_LINKS_ENABLED` nace **OFF**. Mientras siga apagado, el sender conserva
el enlace legacy. Activarlo requiere migración, índice de intents, deploy de rutas/worker, smokes consentidos,
UI operativa y monitoreo. Código listo no equivale a capacidad activa.

## Límites

- “Enviado” no debe traducirse como “recibido”.
- Nunca se recupera un token desde SQL, logs o historial.
- Nunca se crea un segundo assessment para resolver un problema de acceso.
- El enlace seguro se entrega sólo después de verificar identidad y canal del destinatario.
- Ninguna superficie del operador muestra una credencial: ofrece la acción, nunca el valor.
- Despachar no es entregar. Aceptación del proveedor y revelación al operador son promesas de entrega,
  no entregas.
- Con el buzón bloqueado por el proveedor no se insiste por correo: es un control activo, y forzarlo
  degrada la entregabilidad del dominio para el resto de los candidatos.
- Recuperar acceso nunca agrega tiempo. Extender es el flujo gobernado de accommodations.
- Los estados y errores públicos son genéricos; los detalles permanecen en la operación autorizada.

## Referencias

- Manual: [Recuperar acceso al test de un candidato](../../manual-de-uso/hr/recuperar-acceso-a-test-de-candidato.md)
- Emails: [Emails del Ciclo de Hiring](emails-ciclo-hiring.md)
- Asignación: [Asignación de Tests por Etapa](asignacion-de-tests-por-etapa.md)
- Arquitectura: [GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1](../../architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md)
