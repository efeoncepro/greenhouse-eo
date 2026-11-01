# TASK-2068 — Plan de implementación propuesto

> Estado posterior26Oct: consultar la [task vigente](../in-progress/TASK-2068-rooms-invitation-and-guest-experience.md) y sus criterios/evidencias. Este plan conserva la secuencia e hipótesis de su fecha; sus pendientes históricos no sustituyen el estado actual. Auth retenido en PR; interfaz Claude Design y activación general separadas.

Estado 2026-10-25: contratos backend implementados y pruebas focalizadas65PASS; goal/subagentes autorizados. UI ready yes para OTP+textoV2, sin visual acceptance. Hook/readiness de root antes de JSX. MediaR05 se mantiene fuera de este slice.

## Discovery summary

Rooms runtime 8308077 conserva demo TASK-2059 y backend TASK-2066 con132 tests, build e issuer real PASS reportados por root. `/invite` y UI real no existen. Reader actualV1 depende de arte/copy Nómada; V2 proyecta4 tipos y assets porID, sin entrega. Header/StateSurface apuntan a demo. TASK-2066 sigue in-progress con criterios browser/provider pendientes; no bloquear por lifecycle si contratos necesarios están demostrados, pero no cerrar gates sin evidencia.

## Access model

Invitado: cookie guest virtual limitada a room y expira/revoca; sin principal global. Interno: consumer OIDC TASK-2065 y contexto explícito. `access.read/manage` se evalúan sobre recurso room, no sobre el DTO edition. Techo de operador actual no incluye gestión de accesos; UI no lo amplía. El browser recibe sólo datos de audiencia/gestión autorizados y nunca configura grants.

## Architecture decision

Reusar ADR invitaciones/consumer y canon Rooms. Separar chrome/renderer de demo; guest auth sin snapshots entre actores. Si falta reader, contrato de entrega o selección de contexto, root acuerda delta backend primero. No introducir store/browser auth, mailer ni URLs de assets fabricadas.

## Backend/data contract

Hardening2066 fec6d32: emisión/reemisión máximo24h desde relojDB y dentro de grants; la UI debe derivar su maximumexpiry de este techo. No sugerir invitaciones permanentes ni presentar el correo único como MFA.

Gates con owners:

1. Resuelto, TASK-2066: GET `/api/invitations/transaction` implementado y validado por root (137 tests PASS). Cookie HttpOnly → state code_required/expiresAt/retryAt/deliveryStatus, sin PII, correo, issuer ni writes. La prueba browser reload queda en esta UI.
2. Root/backend: DTO gestión room-resource con can, delegable capabilities, maximumexpiry y disponibilidad de create/reissue separada de list/revoke; recipientdisplay autorizado.
3. Root/auth: continuación con edición/room válidos y UX explícita para cookie interna coexistente; no alterar precedencia desde UI.
4. Root/content: entrega autorizada de assetVersionId con bytes/URL/dimensiones/MIME y permiso de original; V1/V2 no pueden usar mappingdemo como sustituto. Foundation separada si deja de ser delta acotado.

No confundir datos durables con datos reales de cliente: V2 actual sigue synthetic.

## Skills

Product Design index/get-context/audit/critical-overrides (ya invocada por usuario); greenhouse-ai-design-studio orquesta contratos/QA; axis-design-system/ui-primitives para consumo; greenhouse-task-planner para esta documentación. Rooms stack canónico prevalece sobre recipes Vuexy/Geist específicos de Greenhouse.

## Subagent strategy

Autorización de Julio vigente. Root coordina contratos/backend y hooks. UI agent posee componentes/styles/pages nuevos; QA independiente posee fixtures/tests/GVC y revisa sesiones/foco/contraste. No modificar simultáneamente los mismos archivos ni tocar servicios/issuer por conveniencia de UI. QA inicia harness sólo cuando root confirma no recoveryclone concurrente.

## Execution order

1. Congelar gates backend y evidencia; actualizar task/wireframe; root ejecuta task-hook --subagents y ui:readiness-check antes de JSX.
2. Extraer header y reader demo/real; compilar consumerV1/V2. Implementar estado privado/no-store y render soportado.
3. Implementar entrada OTP + reload/resend/logout + recovery; navegación de documento a edición verificada.
4. Gestión contextual: list/create/reissue/revoke, idempotency y409, operaciónOFF distinguida de can.
5. Integración real local con mail capturado, tests negativos y regresión demo; GVC premium4 anchos/200%/foco/reduced/noAPI y revisión IAB.
6. Presentar build/capturas concretos a Julio. Registrar respuesta humana; rollout externo separado.

## Files to create

`src/app/invite/page.tsx`; `/rooms/page.tsx`; `/rooms/[roomId]/invitations/page.tsx`; `/rooms/[roomId]/editions/[editionId]/page.tsx`; estados de rutas; `src/components/invitations/*`; `guest-session-boundary.tsx`; `room-reader.tsx`; `content/*`; `src/lib/copy/invitations.ts`; `src/styles/invitations.css`; adapterpresentationserver sin SQL; tests UI/scenario/dossierTASK2068.

## Files to modify

`brand.tsx`, `state-surface.tsx`, `room-experience.tsx` mediante extracción reversible; `room-motion.tsx` sólo si necesario para aislamiento de autoridad; layoutmetadata y imports acotados con ownerroot. No `page.tsx` en `/auth/context` mientras exista routehandler.

## Files to delete

None. Preservar demo, assets aprobados y pruebas anteriores.

## Risk flags

- Media V2 no tiene entrega hoy; no dibujar placeholder y declararlo pieza final.
- Estado cookie interna tiene precedencia: la UX debe reconocerlo antes de verificar como guest.
- Consumir el reader transaction ya implementado para reload tras limpiar fragmento; no persistir secreto como parche.
- Revocación debe retirar contenido incluso diálogo/bfcache; servidor sigue autoridad en cada request.
- Lifecycle2066/2067 abiertos no implica APIs inexistentes; usar evidencialocal, no activar flags live por inferencia.

## Open questions

Ninguna decisión de producto pendiente de Julio para comenzar: ya confirmó correo único+código en Rooms. Root debe resolver los gates técnicos anteriores. La aceptación visual humana se obtiene sobre implementación revisable; autorización de tests/envíos reales y rollout conservan sus límites existentes.

## Contratos congelados para ejecución

Management en `/api/v1/rooms/:roomId/invitations/management` con organizationId intersectado por servidor, canRead/canManage, límites por capability y destinatario autorizado; lista/acciones quedan en `InvitationManagement`. start/transaction añaden entryGate continue/internal_session_present; verify409 antes del issuer. Guest session añade initialEditionId; logout interno explícito sigue disponible OFF y reporta fallo durable. UI consume contratos del runtime, no las formas preliminares de discovery.

Media sin entrega protegida muestra estado explícito; texto editorial/diagnóstico/plan y evidenciaV2 son funcionales. R05 conserva pipeline/visores reales. Este recorte no declara R05 completo.
