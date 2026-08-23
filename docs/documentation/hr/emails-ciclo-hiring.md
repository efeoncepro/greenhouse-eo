# Emails del Ciclo de Hiring — Notificaciones a Candidatos y People

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.4
> **Creado:** 2026-08-12 por Claude (TASK-1689)
> **Ultima actualizacion:** 2026-08-21 por Codex (correo de persona seleccionada)
> **Documentacion tecnica:** [GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md) (Delta 2026-08-12)

## Qué hace

Cuando el proceso de contratación avanza, Greenhouse envía correos automáticos — sin que nadie
tenga que acordarse de escribirlos:

| Momento | Quién lo recibe | Qué dice |
|---|---|---|
| Llega una postulación nueva | Buzón de People (`people@efeoncepro.com`) | Datos completos del postulante (nombre, correo, teléfono, país de residencia, portafolio/LinkedIn, mensaje, vacante, origen) + link para revisarla en el Hiring Desk. Sin dato = "No informado" |
| Llega una postulación nueva | El candidato | Acuse de recibo: "recibimos tu postulación, esto es lo que sigue" |
| Se le asigna un test al candidato | El candidato | Link de acceso a su evaluación, tiempo estimado y vigencia del link |
| El candidato completa el test | Buzón de People (`people@efeoncepro.com`) | Aviso de que las respuestas están listas, fecha de envío, vacante, postulación y link directo para revisar la evaluación |
| La postulación avanza a Preselección o Entrevista | El candidato | **Una sola cosa**: si la vacante tiene declarado un test para esa etapa, le llega el correo del test; si no, le llega "Tu postulación avanzó" con el nombre de la etapa |
| El candidato queda seleccionado | El candidato | Confirmación personalizada de que fue elegido + secuencia carta oferta → aceptación → contrato; no afirma que ya se incorporó |
| El candidato queda **descartado** (desenlace «Descarte») | El candidato | Agradecimiento genuino, decisión clara y puerta abierta a futuras vacantes |
| El candidato cierra con **Sin selección**, **Reserva** o **Retiro** | Nadie | **Hoy no sale ningún correo.** Están diseñados y sin plantilla; si necesitas avisarle, hazlo por fuera |
| Se recupera su acceso al test **por correo** | El candidato | Acceso nuevo + aviso de que el enlace anterior dejó de ser válido; si ya había empezado, su plazo original |
| Se recupera su acceso al test **por enlace temporal** | El candidato | Aviso **sin el enlace**: su acceso anterior murió, el nuevo se le entrega por otra vía, y puede responder ese correo si no le llega |

## Reglas de comportamiento

- **Sólo etapas pensadas para el candidato notifican.** Los movimientos internos del pipeline
  (Sourced, Screening, Decisión y Cerrado) NO generan correo y sus nombres
  internos jamás aparecen en un email.
- **Un avance de etapa produce UNA comunicación: ni cero ni dos.** Quien decide es uno solo.
  Si la vacante declara un test para esa etapa y el test se asigna, la comunicación es el
  correo del test — el aviso genérico de avance NO se manda además. Si la asignación no se
  puede hacer (falta el correo del candidato, la política está apagada, se alcanzó el tope de
  envíos, la etapa ya cambió), se manda el aviso genérico en ese mismo momento, para que
  nadie quede esperando algo que no va a llegar. **Nunca se le promete un test que no existe.**
- **La etapa que se comunica es la que la plataforma tiene ahora, no la del momento del clic.**
  Si alguien mueve una postulación dos veces seguidas, el candidato recibe una comunicación por
  la etapa donde efectivamente quedó.
- **Un cambio de etapa viejo no comunica nada.** Si por alguna razón un movimiento queda sin
  procesar más de 24 horas, no se envía el correo tarde: pasa a una lista para que una persona
  decida. Decirle a alguien "avanzaste" por algo de la semana pasada es peor que no decir nada.
- **Un scorecard de entrevistador no le escribe al candidato.** Sólo los tests asignados al
  candidato generan el correo de evaluación.
- **Completar un test no decide al candidato.** El aviso interno no incluye un veredicto ni dispara
  un avance de etapa; sólo informa que existe evidencia lista para revisión humana.
- **Sin duplicados.** Si el sistema reintenta procesar el mismo evento, el correo no se envía
  dos veces.
- **El correo de «Descarte» se puede pausar aparte** (kill-switch propio) sin apagar el resto —
  útil si Talent quiere controlar el momento del envío. Ojo: es el correo del desenlace **Descarte**,
  no el de **Sin selección**, que todavía no tiene plantilla.
- **Los correos al candidato salen a nombre de Efeonce** (la agencia); el aviso interno usa el
  remitente de la plataforma.
- **Si el candidato responde, su respuesta llega a `people@efeoncepro.com`.** Los ocho tipos
  dirigidos a candidatos declaran ese buzón como destino de respuesta. Antes no existía y una
  respuesta caía en la dirección de envío del proveedor, que nadie lee — aunque varios de esos
  correos le piden explícitamente responder. Ese buzón tiene que estar atendido.
- **Los correos se sienten personales**: el asunto y el saludo usan el nombre del candidato y el
  nombre de la vacante (p. ej. "María, recibimos tu postulación a «Content Creator»").
- **El correo de selección distingue asunto, preencabezado y título visible.** El asunto identifica persona y
  vacante; el título celebra `¡Te elegimos, {nombre}!`; el preencabezado anticipa la carta oferta. Incluye una
  ilustración pequeña de reconocimiento con texto alternativo vacío, por lo que bloquear imágenes no elimina
  ninguna información ni desplaza el nombre de la persona como foco principal. La decisión, la carta oferta y la
  firma del contrato usan negritas visibles sobre frases completas para guiar la lectura. Los correos de decisión
  firman institucionalmente como `Equipo de Talento · Efeonce`; no inventan el nombre de un recruiter. Las respuestas
  llegan al mismo equipo.
- Todo el sistema está detrás de un interruptor general (`HIRING_LIFECYCLE_EMAILS_ENABLED`),
  prendido en producción desde el 2026-08-12; el interruptor y los kill-switch por tipo siguen
  disponibles para pausar el sistema completo o un correo específico.

## Despacho no es entrega

El estado histórico `sent` significa que el proveedor aceptó el despacho. No demuestra que el mensaje llegó
al buzón. La confirmación técnica de entrega requiere un evento firmado `delivered`; `bounced`, `complained`
y `suppressed` indican que el canal email está bloqueado o degradado. `opened` y `clicked` son interacción,
no sustitutos de entrega.

El receptor global de lifecycle de Resend y su reconciliación quedaron operativos en producción con el
cierre de TASK-1745. El webhook es observador y nunca puede bloquear el envío de los demás correos.

Los emails que transportan acceso se procesan como credenciales: reservan evidencia durable antes de emitir
el token, no persisten la URL o bearer en payloads genéricos y no usan retry ciego. Si el proveedor pudo
aceptar el correo pero el cierre local quedó incierto, el resultado es `unknown`, no un falso `sent`.

La recuperación gobernada del mismo assessment —por email o enlace seguro de una sola revelación— está
habilitada en producción desde el 2026-08-19. La superficie del operador y el aviso de rotación al
candidato están en `develop`/staging. Detalle funcional:
[Entrega y recuperación de acceso a tests](entrega-y-recuperacion-de-acceso-a-tests.md).

> Estado de rollout: el aviso interno de test completado está desplegado y configurado en el
> ops-worker desde 2026-08-15, igual que los otros seis correos. Aún falta confirmar su primera
> entrega real: el único test completado antes del despliegue no se reenvía por diseño. People/Operations
> debe comprobar la siguiente entrega en el correo y en el registro de envíos; no se reintenta ese
> evento histórico ni se altera la postulación para forzarlo.

> Detalle técnico: consumers en `src/lib/sync/projections/hiring-lifecycle-emails.ts`, política en
> `src/lib/hiring/notifications/`, templates en `src/emails/Hiring*.tsx`.
