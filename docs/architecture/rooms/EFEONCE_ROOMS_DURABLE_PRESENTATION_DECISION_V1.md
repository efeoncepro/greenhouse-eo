# Rooms — presentación durable, tours y notas propias

- Status: **Accepted para implementación LOCAL** por la instrucción humana del2026-10-29 de terminar backend independiente de la UI. Sin autorización de producción.
- Owner: Platform; EPIC-052 R09; TASK-2075. Claude Design conserva el consumer visual R10.

## Decisión y límites

Extender el módulo Presentation del runtime hermano `efeonce-rooms`, sin servicio nuevo. La edición publicada es inmutable y se referencia por FK/hash. Un tour editable sólo admite escenas que existen en esa edición; una sesión copia el tour al prepararse y no cambia cuando el tour se edita después. Tours y sesiones pertenecen a organización/sala/edición; las notas propias se guardan separadas y nunca entran en snapshot de edición, audiencia, receipt, audit ni outbox.

`notes.own.read/write` exige ownership incluso a un administrador. El rol es techo y no concede grants; un cliente champion necesita un grant explícito de presentación/notas. `tours.manage` es sólo interno. Todas las operaciones recargan autoridad persistida y estado de sala; archivo, expiración o revocación deniegan también replay y reconexión. La autoridad del dueño de una sesión se revalida para sus lectores, para que un lector válido no prolongue una presentación revocada.

## Consistencia y control

`tours.upsert`, `notes.upsert/delete`, `presentation.prepare/start/end` usan expectedRevision de sala, transaction/advisory lock canónico y receipts/audit/outbox. Los identificadores y metadata de evento son suficientes: jamás body de notas.

`presentation.control/ack` son protocolo durable con secuencia propia, bajo la MISMA transacción/lock. No incrementan revisión de autoría ni outbox de contenido por cada avance: guardan receipt y audit con revisión actual. Cada control exige owner+instanceId+expectedSequence exactos y avanza monotónicamente; ninguna toma de control implícita. Ack exige secuencia/escena actuales y grant de lectura; registra sólo reporte declarado del actor y nunca prueba reproducción efectiva, atención ni intención comercial. Una reconexión relee el estado actual y nunca reaplica órdenes antiguas.

Prepare fija owner/instance, edición/hash, copia del tour y expiración mínima entre dos horas, TTL solicitado, sesión del actor y grants efectivos de rooms.read/presentation.manage. Renovar identidad o ampliar grants no extiende esa sesión. Start/end vuelven a validar estado/secuencia/instancia. Sólo una sesión activa por dueño/organización/sala; expiradas no bloquean nueva preparación. La audiencia obtiene escena/secuencia/estado/expiración y tour fijado, nunca instanceId, notas, grants ni datos de consola.

## Modelo y evolución

Migración10 aditiva: `presentation_tours`, `presentation_notes`, `presentation_sessions`, `presentation_acks`, constraints/FKs compuestas y privilegios runtime mínimos. Campos fijados de sesión son inmutables por trigger; las filas con datos impiden down destructivo. No backfill ni grants automáticos. Publicación existente V1/V2/V3 permanece intacta. V1 admite sus anclas estables creative/editorial/plan; V2/V3 usan block IDs publicados.

Readers/commands se exportan del primitive canónico para HTTP/CLI/client; no lógica en UI. Sin WebSocket, control remoto, BroadcastChannel implementado, fullscreen, sonido, aceptación visual ni rollout. El transporte de ventanas futuro consumirá este estado con su propio QA. Sin cambio Auth ni correo/canary adicional.

## Verificación

Schemas estrictos y tests PostgreSQL efímero: ownership/admin, grants explícitos, aislamiento, rechazo de draft/anclas ausentes, snapshot fijo, CAS/replay/race, exclusividad de instancia, secuencia y ack stale, revocación/archivo/expiry, proyección sin notas/instance y down protegido. Las pruebas locales no acreditan staging cloud ni interfaz nueva.

Candidato local verificado3c7bcb5 y fronteras de release: [recibo29Oct](../../audits/rooms/2026-10-29-backend-local-completion.md).
El cierre de la task local no certifica interfaz, proveedores reales ni producción.
