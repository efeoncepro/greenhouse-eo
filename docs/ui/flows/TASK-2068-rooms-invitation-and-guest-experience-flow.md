# TASK-2068 — Flujo de acceso y gestión de invitaciones

Diseño 2026-10-25; depende de contratos congelados, no describe UI implementada.

## Journey guest

Correo único con enlace `/invite#token=...` y código → GET /invite (no correo ni autenticación) → capturar fragmento en memoria y limpiar history → POST start → cookie transacción HttpOnly → campo código → POST verify → cookie guest + resultado room/edition → navegación de documento a edición publicada autorizada.

Nunca incluir token/código en query, analytics, logs, clipboard automático o almacenamiento persistente. No aparece un selector de proveedor ni redirect visible al issuer para pegar OTP. No denominarlo MFA/2FA: ambos datos llegaron por el mismo correo.

## Estados y transiciones

| Estado | Evento | Resultado/acción |
|---|---|---|
| Sin link | Abrir /invite | Consultar sólo estado seguro; transacción vigente recupera código, guest vigente permite continuar, resto pide reabrir correo |
| Link presente | start | Limpiar URL antes de request; respuesta code_required; no nuevo correo |
| Link no disponible |404 | Mensaje genérico sin distinguir existencia/revocación/destinatario |
| Código pendiente | Submit6 dígitos | Deshabilitar sólo submit pendiente; verificar una vez |
| Código inválido |400 | Error campo, conservar foco e intención; no revelar presupuestos internos |
| Código expirado | Error+transacción vigente | Permitir solicitar nuevo bajo cooldown; no enviar automáticamente |
| Resend pendiente | Usuario pide nuevo | Respetar retryAt/Retry-After; pending/accepted/failed reales; reintento incierto mantiene requestId en servicio |
| Rate limited |429 | Próximo intento permitido visible; sin bucle ni autorretry |
| Verificado | verifyOK | Navegación documento a room/edition devueltos; eliminar código de estado browser |
| Transacción expirada | Error/status | Reabrir enlace del correo; no pedir email libre |
| Lectura activa | Logout | POST logout, limpiar reader/modales y salir sin snapshot |
| Lectura activa | Expiración/revoke/visibility | Reader/session fresh deniega; retirar contenido, explicar recuperación |
| ServicioOFF/fallo |503 | Estado honesto, reintentar acción sólo explícita, no afirmar envío |

Reload consume GET `/api/invitations/transaction`, implementado en TASK-2066: state code_required/expiresAt/retryAt/deliveryStatus, cookie HttpOnly, sin PII ni envío. GET guest session no lo reemplaza. La continuación debe conservar edición permitida o resolverla server-side; no inferir de URL libre.

## Sesiones coexistentes

El resolver actual da precedencia a cookie interna, incluso si ya no sirve. Antes de implementar, root fija contrato explícito para abrir invitación teniendo sesión interna: detectar contexto, ofrecer continuar con autoridad interna válida o salir de esa sesión antes de redimir como guest. No borrar silenciosamente sesión interna, no usar cookie guest como fallback de auth interna fallida, no inventar switch browser-only. Cada cambio de actor es navegación documento y nueva lectura server-side.

## Journey interno

/login de TASK-2065 → contexto real (0/1/N orgs) → /rooms → invitaciones de sala → crear con email/expiry/evidence delegables → revisión de destinatario+scope → command(create,expectedRevision,idempotencyKey) → lista fresca y receipt.

Reissue/revoke abre confirmación con destinatario y versión esperada. Conflicto409 mantiene formulario, relee room/list y pide revisar acción otra vez; no reutilizar idempotencyKey con payload cambiado. Respuesta incierta conserva key y payload exactos. Accepted expresa aceptación del servicio, nunca entrega o lectura. El operador sin access.manage no ve creación; sólo permiso fresco room-resource concede esa acción.

## Navigation, overlays y foco

- Invitaciones es shortcut contextual de room, no sidebar global.
- Un solo Dialog a la vez; cierre superior, Escape, foco inicial al encabezado/campo adecuado y restore al trigger estable.
- Descarta edición sólo tras confirmación inline dentro del mismo diálogo; evitar confirmaciones anidadas.
- En readback/revoke que elimina el trigger, foco al encabezado/lista; no body.
- Gallery/evidence reutiliza focus/pager del renderer actual; pérdida de autoridad cierra ambos inmediatamente.
- /auth/context ya es route handler JSON: UI de selección usa ruta distinta o adapter coordinado, nunca page.tsx conflictiva en mismo segmento.

## Test journeys

Happy path local real con correo capturado1 vez, código erróneo/correcto, código expirado → resend, doble pestaña/reload, link revocado, issuer unavailable, mismatch room/edition, evidence false, sesión interna coexistente, return from bfcache tras revoke y409 admin. No convertir una ruta sólo mock en evidencia de acceso real.

## GVC Scenario Plan

Escenario rooms-invitations: entrada desde fragmento, scrubURL, reload vía transaction, código inválido/correcto, resend/cooldown, logout, sesión interna coexistente yrevocación. Gestión: listar/create/reissue/revoke/409 y entrega pendiente/fallida. Lectura textualV2 con perfiles independientes y media parcial explícita. Capturas a1440/1024/390/320 ytexto200%; inspeccionar foco, mensajes y ausencia de datos privados en payload. Dossier docs/ui/reviews/TASK-2068-rooms-invitation-and-guest-experience/.

## Design Decision Log

Se conserva la precedencia de sesión interna y se exige salida explícita antes de consumirOTP. El backend decide can/TTL y estado; UI sólo guía. MediaR05 no bloquea OTP ni textoV2: una explicación de disponibilidad conserva la lectura sin fingir pieza. Confirmaciones de gestión en un diálogo, con conflicto recuperable, nunca autorización por rol nominal.
