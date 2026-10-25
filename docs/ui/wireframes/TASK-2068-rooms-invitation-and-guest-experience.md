# TASK-2068 — Entrada, invitaciones y lectura real

Diseño de implementación, 2026-10-25. No es captura ni aceptación visual. Readiness permanece no por contratos pendientes descritos en la task. Fuente: runtime Rooms main checkpoint 8308077 y canon de experiencia; no nuevo scaffold.

## Visual Direction Contract

- Mode: `source-led`.
- Source durable: `docs/ui/visual-directions/EFEONCE_ROOMS_VISUAL_DIRECTION_V1.md`, `TASK-2059-rooms-first-experience-direction.md` y dirección TASK-2068.
- Desktop target: 1440×900 y1024×768. Entrada con marco navy, marca oficial y área de lectura/formulario en papel; ancho funcional acotado, sin dashboard o mosaico. Gestión es lista editorial continua con encabezado de sala.
- Mobile target:390×844/320×740; una columna, logo176px máximo sujeto a espacio real, formulario completo visible con teclado, scroll natural sin ocultar overflow. No comprimir fuente para salvar layout.
- Action hierarchy: una acción primaria por estado (entrar/enviar/reintentar cuando corresponde), secundarias recuperar/salir/cancelar. Revoke es destructive y explícita; reissue explica invalidación del acceso anterior.
- Visual fidelity mapping: lockup oficial224desktop/176mobile heredado, Bricolage editorial/Poppins funcional, papel/navy/Growth por roles AXIS; botones y badges oficiales, sin copiar CSS de Lab. Arte del cliente conserva dimensiones y ratio.
- Quality profile: `premium`, dossier TASK-2068, baseline candidata hasta revisión real.

## Layout — /invite

1. Header Rooms oficial enlaza a destino seguro contextual; no /demo, selector de rol ni correo visible.
2. Encabezado “Entra a la sala”; texto “Ingresa el código de seis dígitos que recibiste junto al enlace.” No nombre de room/recipient antes de autorización salvo DTO explícito aprobado.
3. Field “Código de acceso”: un input, texto/numeric, one-time-code, seis dígitos, sin autoverificar. Pegar y Enter funcionan.
4. CTA “Entrar a la sala”. Pending conserva ancho, anuncia verificación. Error bajo input y foco sin borrar lo pegado arbitrariamente.
5. Recovery discreto: nuevo código sólo al pedirlo y permitido por servidor. Cooldown visible sin anunciar cada segundo. Solicitud pending/accepted/failed se mantiene contextual; accepted no dice entregado.
6. Enlace ausente/no válido: explicación genérica y “Vuelve al enlace del correo”; nunca formulario libre para enumerar otro destinatario.

La lectura del fragmento se hace una vez y se limpia antes de fetch. Reload usa estado seguro de transacción server-side. No conservar token en storage por conveniencia visual.

## Layout — gestión contextual

`/rooms`: lista de salas obtenidas del contexto real; fila con título, publicación/estado y acciones efectivas. No reutilizar persona de demo ni inventar permisos.

`/rooms/[roomId]/invitations`: breadcrumb a sala, título, descripción breve del acceso limitado; botón “Invitar” sólo con permiso y disponibilidad. Lista semántica con destinatario autorizado, estado de acceso, expiración y estado de envío separados. Acciones secundarias reemitir/revocar por fila. Identificar por correo/label autorizado, nunca por orden de una lista de IDs opacos.

Diálogo crear: email del destinatario, expiración dentro del techo del servidor, acceso de lectura fijo y evidencia opcional sólo delegable. Resumen del efecto y CTA “Enviar invitación”. La acción manda el único correo con link+código. Misma intención conserva idempotencyKey si la respuesta es incierta. No generar pantalla “copiar enlace” que exponga un token secreto.

Diálogo reemitir/revocar: destinatario y sala reconocibles, consecuencias y cancelación. No modal anidado. Reemitir invalida versión anterior, revoke elimina acceso; mostrar éxito sólo tras lectura del resultado.409 conserva form y explica necesidad de actualizar contexto.

## Layout — lector real

`/rooms/[roomId]/editions/[editionId]`: chrome guest/internal explícito, edición publicada, contenido dominante, capítulos derivados del contenido presente. Sin capítulos vacíos ni assets Nómada implícitos.

- V1: adapter del renderer existente elimina copy/asset assumptions de demo.
- V2: editorial fragments, media assets autorizados, diagnostic con hallazgo/ámbito/propuesta, plan con pasos/entregable/medición. Perfiles creative/seo-aeo independientes.
- Evidencia: anclas y relaciones reales; conservar autor declarado/unverified y tipo hipótesis/propuesta/simulación. Si no can, no serialized evidence ni controles vacíos.
- Visor: imagen contain, tamaño útil y cierre superior; focus/Escape/pager existentes. No link original sin permiso/contrato de entrega.
- Sesión expirada/revocada: retirar contenido y diálogos, mostrar recuperación; no renderizar screenshot de la sala como fondo.

## Implementation Mapping

| Región | Componente | Fuente | Comportamiento |
|---|---|---|---|
| Marca/header | extracción de RoomHeader | AXIS brand assets | demo/guest/internal explícitos |
| Código | InvitationEntry + Field/Input/Button | invitation HTTP | entrada/verify/resend/recovery |
| Lista | InvitationList + Badge/Button | listInvitations + management DTO | access y delivery separados |
| Formulario | InvitationCreateDialog + Dialog/Field/Input/Checkbox | commands canónicos | revisión/idempotencia/409 |
| Lectura | RoomReader + V1 adapter/V2 blocks | getEdition audience DTO | sin fixtures ni notas privadas |
| Pérdida de sesión | GuestSessionBoundary + StateSurface | status/reader fresh | limpiar y navegar sin transición |

## GVC Scenario Plan

Escenario `scripts/frontend/scenarios/rooms-invitations.scenario.ts`, qualityProfile premium. Fixtures de PG + issuer controlado y edición publicada V1/V2; no mock de autoridad para el happy path.

Anchos 1440/1024/390/320, texto 200%, teclado, reduced motion y API de transición ausente. Capturas: entrada inicial/código/error/cooldown/servicioOFF, lectura4 tipos/evidencia, logout/revoke, lista vacía/poblada, formulario/review 409/delivery failed. Marcadores invitation-entry/code/recovery/management/create,guest-room/session-state. Medir document.scrollWidth<=viewport, contain de assets, focus restore, contraste final+transitorio; revisar DOM/network no secrets/email guest. Dossier `docs/ui/reviews/TASK-2068-rooms-invitation-and-guest-experience/`; surfaceID rooms-invitations-v1, baseline nueva pendiente revisión, no autoaceptación.

## Design Decision Log

- Una entrada de código mejora pegar/autocomplete/teclado frente a seis casillas; no formulario de email en entrada porque destinatario ya está fijado.
- Gestión contextual evita duplicar navegación y mantiene alcance de la sala visible.
- Dialog para una acción corta; no sidecar persistente ni layout portal Vuexy.
- Reader separado del demo permite reusar interacción sin mentir sobre contenido.
- Auth boundaries usan navegación de documento; las transiciones sólo ayudan a orientarse dentro de contenido ya autorizado.
- Recovery transactionStatus resuelto por TASK-2066 (GET /api/invitations/transaction); DTO de gestión/destinatario/continuación/selección de sesión y entrega media requieren congelación con root. No se cambian scopes desde UI.
