# Operar Comunicaciones y Notificaciones

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** 2026-06-15 por Codex
> **Modulo:** Comunicaciones / Email / Notificaciones / Teams
> **Rutas:** `/notifications`, `/notifications/preferences`, `/admin/email-delivery`, `/admin/emails/preview`, `/admin/notifications`
> **Documentacion relacionada:** `docs/documentation/plataforma/comunicaciones-notificaciones-end-to-end.md`, `docs/documentation/plataforma/sistema-email-templates.md`, `docs/documentation/admin-center/preview-de-correos.md`

## Para que sirve

Este manual explica como revisar comunicaciones Greenhouse: emails, notificaciones in-app y mensajes Teams. Sirve para diagnosticar fallas, probar templates y entender cuando un mensaje fue omitido por preferencias o politicas.

## Antes de empezar

Necesitas acceso admin para revisar entregas, previews y configuracion de tipos de correo. Para anuncios Teams manuales, usa el runbook/script autorizado y confirma destino antes de enviar.

## Revisar email delivery

1. Abre `/admin/email-delivery`.
2. Filtra por destinatario, tipo, estado o fecha.
3. Revisa KPIs: enviados hoy, fallidos, pendientes de retry y tasa de entrega.
4. Abre la entrega afectada si la UI lo permite.
5. Lee `error_class`, provider id y metadata.
6. Si el estado es bounced/complained, revisa si el destinatario quedo bloqueado o unsubscribed.

## Probar un template de email

1. Abre `/admin/emails/preview`.
2. Elige template.
3. Revisa idioma y viewport.
4. Verifica contenido, links y datos dinamicos.
5. Envia prueba solo a destinatario aprobado.
6. Confirma que aparece en email deliveries.

## Usar kill switch por tipo de correo

1. Identifica el `email_type` problematico.
2. Confirma que la falla afecta solo ese tipo.
3. Apaga ese tipo desde configuracion/runbook disponible.
4. Verifica que nuevos intentos queden skipped o bloqueados por politica.
5. No apagues todo Resend salvo incidente mayor.

## Revisar notificaciones in-app

1. Abre `/notifications` como usuario afectado o panel admin si aplica.
2. Filtra por unread/categoria.
3. Revisa preferencias en `/notifications/preferences`.
4. Si no aparece, revisa recipient resolver y notification log.
5. Confirma que la categoria permite ese canal.

## Enviar o revisar Teams

1. Identifica el `channel_code` o destino aprobado.
2. Confirma que `teams_notification_channels` esta listo.
3. Si usas `pnpm teams:announce`, prepara mensaje, CTA y menciones.
4. Para menciones, usa Entra Object ID/UPN validado por helper.
5. Ejecuta envio.
6. Revisa run log o resultado del script.

## Que significan los estados

- **pending:** entrega creada y pendiente.
- **sent:** proveedor acepto el envio.
- **delivered:** proveedor reporto entrega.
- **failed:** fallo al enviar.
- **dead_letter:** agotado o bloqueado por politica.
- **bounced:** rebote del destinatario.
- **complained:** queja/spam reportada.
- **skipped:** omitido por preferencia, kill switch, unsubscribe o destinatario invalido.

## Problemas comunes

### El email esta sent pero la persona dice que no llego

Revisa delivered/bounce/complaint y carpeta de spam. Sent no prueba lectura ni entrega final.

### Un usuario no recibe una categoria

Revisa preferencias y subscription. Puede estar skipped correctamente.

### El preview se ve bien pero el envio falla

Preview no prueba provider, rate limit ni destinatario. Revisa email delivery.

### TeamBot no responde como chat

Es esperado. TeamBot actual soporta notificaciones y acciones acotadas, no conversacion general.

## Que no hacer

- No reenviar desde Resend manualmente sin trazabilidad.
- No editar estados de delivery para ocultar fallas.
- No usar listas broadcast para marketing automation no gobernado.
- No mandar Teams a canales no aprobados.
- No incluir secretos, tokens o datos sensibles en emails/pruebas.

## Referencias tecnicas

- `src/lib/email/delivery.ts`
- `src/lib/notifications/notification-service.ts`
- `src/lib/integrations/teams/sender.ts`
- `src/lib/integrations/teams/bot-framework/sender.ts`
- `greenhouse_notifications.email_deliveries`
- `greenhouse_notifications.notifications`
- `greenhouse_core.teams_notification_channels`
