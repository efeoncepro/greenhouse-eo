# Rooms — sala en vivo: transporte en tiempo real

- Status: **Proposed** (2026-10-30). Espera aprobación del operador antes de cualquier código de TASK-2081.
- Owner: Platform; EPIC-052; TASK-2081. Interfaz: pantalla «Sala en vivo» del canvas aprobado el 2026-10-29.

## Contexto

La pantalla «Sala en vivo» muestra a varias personas en la misma sala al mismo tiempo: un cursor con nombre por
persona, la pieza que cada una seleccionó (con sus 8 tiradores) y una burbuja cuando alguien hace una pregunta.
Rooms hoy es durable pero asíncrono:

- las preguntas se crean con `questions.create` y se leen por API;
- la presentación sincroniza por `sequence`/`ack`, con la coordinación entre ventanas del lado del cliente;
- el runtime web corre en Vercel (funciones, sin servidor WebSocket propio) contra PostgreSQL en Cloud SQL.

Lo que hay que transmitir es poco y efímero: presencia (quién está), posición del cursor (hasta ~10 por segundo
por persona), selección y el aviso de una pregunta nueva. Una sala típica tiene de 2 a 8 personas a la vez.

## Decisión propuesta

**Server-Sent Events same-origin desde las funciones de Rooms, con estado efímero en PostgreSQL y reconexión
del navegador. Sin proveedor externo.**

1. **Escritura.** `POST /api/v1/rooms/:roomId/live/events` recibe `presence.heartbeat`, `cursor.move`
   `{x, y, chapterId}` y `selection.set {blockId, assetRefId?}`. Cada llamada se autoriza con `can(rooms.read)` sobre
   la edición, igual que hoy. Límite: 10 eventos de cursor por segundo por persona; el exceso se descarta, no se encola.
2. **Estado efímero.** Tabla `rooms.live_presence` (una fila por sala, edición y persona, con posición, selección y
   `seen_at`), sobrescrita en cada evento. Una persona sin latido en 15 s deja de estar presente. Nada de esto es
   historial ni evidencia de atención: el recorrido y las señales siguen saliendo solo de `progress.mark`.
3. **Lectura.** `GET /api/v1/rooms/:roomId/live?editionId=` abre un stream SSE. El servidor consulta el estado cada
   250 ms con una lectura breve (sin mantener una conexión de base abierta entre ciclos) y envía solo los cambios.
   Cada 5 s revalida la autoridad del lector: si se revocó su invitación o sesión, cierra el stream con un evento
   `closed {reason}`. El stream dura como máximo lo que permita el límite de duración de la función, y el navegador
   reconecta solo (`EventSource`).
4. **Preguntas en vivo.** Siguen siendo `questions.create`; el stream solo avisa `question.created {questionId}` y la
   UI lee la pregunta por su reader normal, con su propia autorización.
5. **Privacidad.** El stream lleva nombre visible, posición y selección. Nunca correos, notas internas ni
   `controllerInstance`. Un invitado ve a las demás personas de su sala; no ve salas ni ediciones ajenas.
6. **Degradación.** Si el stream no está disponible, la UI muestra la sala sin presencia y las preguntas siguen
   funcionando por API. El MCP solo lee la presencia actual (`live.presence`); no transmite cursores.

## Alternativas consideradas

| Opción | A favor | En contra |
|---|---|---|
| **SSE en funciones + PostgreSQL (propuesta)** | Sin proveedor ni datos fuera; misma autorización `can`; revocación en ≤ 5 s | Una función abierta por lector; consultas cada 250 ms; reconexión al vencer la duración máxima |
| Servicio gestionado (Ably, Pusher, Liveblocks) | Baja latencia, presencia y cursores ya resueltos | Nombres y posiciones salen a un tercero; nueva cuenta, secreto y costo; la autorización se duplica en tokens del proveedor |
| Polling corto desde el navegador (1–2 s) | Lo más simple; sin streams | Cursores a saltos, poco fieles al canvas; más peticiones por persona |
| WebSocket en un servicio aparte (Cloud Run) | Bidireccional y eficiente | Un servicio nuevo que operar, desplegar y asegurar; rompe el «sin servicio nuevo» del dossier |

## Consecuencias

- Costo: una invocación larga por lector conectado. Con 2–8 personas por sala y pocas salas en vivo a la vez es
  aceptable; si crece, se revisa la opción gestionada o un servicio WebSocket.
- Carga en la base: una lectura breve cada 250 ms por stream. Hay que medirla con la carga real antes de publicar.
- La tabla efímera necesita limpieza periódica de filas viejas (sin historial).

## Pendiente de verificar antes de implementar

- La duración máxima real de una función con streaming en el plan de Vercel de Efeonce y el comportamiento de
  reconexión (no se asume un valor).
- Que el pool de Cloud SQL del perfil cloud soporte los streams concurrentes sin agotar conexiones.

## Gates

ADR aceptado → código local (TASK-2081) con tests de autorización, revocación ≤ 30 s (meta 5 s), límite de frecuencia
y ausencia de campos prohibidos → medición de carga local → autorización de producción aparte, con flag `ROOMS_*` nuevo
registrado en el ledger.
