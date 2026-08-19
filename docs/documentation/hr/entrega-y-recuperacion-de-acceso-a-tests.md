# Entrega y recuperación de acceso a tests

> **Tipo de documento:** Documentación funcional
> **Versión:** 1.0
> **Última actualización:** 2026-08-19 por Codex (TASK-1745, TASK-1746, ISSUE-160)
> **Estado operativo:** código implementado y validado localmente; rollout pendiente. La recuperación,
> la sesión pública nueva y el lifecycle de Resend descritos aquí todavía no están habilitados en producción.

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
crítico del correo saliente. Si el webhook falla, los demás correos deben seguir enviándose. Su registro,
secreto, reconciliación y canary live siguen pendientes de rollout; mientras tanto, la UI actual no puede
afirmar entrega confirmada por proveedor.

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
aplicación activa, razón estructurada y trazabilidad sólo con IDs. Aplica un cooldown global de 60 segundos y
un máximo de tres rotaciones exitosas por assessment en 24 horas, sumando ambos canales.

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
- Los estados y errores públicos son genéricos; los detalles permanecen en la operación autorizada.

## Referencias

- Manual: [Recuperar acceso al test de un candidato](../../manual-de-uso/hr/recuperar-acceso-a-test-de-candidato.md)
- Emails: [Emails del Ciclo de Hiring](emails-ciclo-hiring.md)
- Asignación: [Asignación de Tests por Etapa](asignacion-de-tests-por-etapa.md)
- Arquitectura: [GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1](../../architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md)
