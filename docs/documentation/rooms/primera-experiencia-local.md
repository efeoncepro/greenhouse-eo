# Rooms — primera experiencia implementada

Base local: 2026-10-25 · Continuidad documental: 2026-10-29 · TASK-2058/2059/2060/2072 · [EPIC-052](../../epics/in-progress/EPIC-052-efeonce-rooms-sales-enablement-platform.md).

Esta guía conserva el alcance de la primera experiencia y del corte cloud26Oct. El backend local vigente
es `codex/rooms-design-integration@3c7bcb5`: colaboración, presentación/notas, referencias X-ray/CRM con
puertos externos OFF, V4 mixto y MCP stdio. Sus 13 migraciones/43 tablas y verificaciones locales pertenecen al
[recibo29Oct](../../audits/rooms/2026-10-29-backend-local-completion.md), no al despliegue cloud.
Para operarlo, usar el [manual backend actual](../../manual-de-uso/rooms/operar-backend-local.md).

Rooms dispone de una primera experiencia local con una propuesta ficticia de Nómada: tres piezas en sus formatos originales, artículo SEO/AEO estructurado, radiografía de evidencia y plan de trabajo. El entorno consume el logo oficial, La órbita y primitives AXIS publicados. La muestra y las imágenes generadas se identifican como sintéticas; no son un cliente ni un resultado medido.

Hay vistas cliente, operador y administrador. El servidor decide las capacidades por actor y recurso antes de construir la respuesta; ocultar controles no concede ni retira autoridad. La sala del cliente excluye notas internas, personas y grants. La evidencia tiene permiso independiente. El workspace filtra salas y notas por ámbito; sólo el administrador autorizado consulta accesos.

`can` incorpora roles como techo de capacidades, grants específicos, organización/sala/edición, estados y vigencia. El administrador tampoco evita estas restricciones. TASK-2060 añade autoridad persistida y la consulta de permisos dentro de cada operación durable; cambiar el rol en una solicitud no concede autoridad. El operador puede crear y preparar borradores y reabrir una edición como nueva revisión; publicar, conceder/revocar acceso y archivar exigen capacidades del administrador dentro de su ámbito.

El ciclo local permite crear una sala, guardar su borrador, publicar una edición, reabrirla para preparar otra y archivar la sala. Cada publicación conserva su contenido y evidencia: los cambios posteriores generan otra edición. Si dos personas guardan la misma revisión, una recibe conflicto y debe volver a leer; no se sobrescribe silenciosamente. Los reintentos no duplican publicaciones y vuelven a comprobar permisos, incluida la revocación.

PostgreSQL propio conserva salas, borradores, ediciones, autoridad y recibos. Cada cambio registra auditoría y un evento outbox en la misma transacción; no se afirma entrega a sistemas externos. El ciclo, aislamiento, conflictos, recuperación tras reinicio y restore están verificados con contenido sintético local. La lectura del cliente omite notas internas y grants; cuando falta permiso de evidencia también elimina sus referencias. Una edición publicada puede seguir siendo visible aunque un nuevo borrador quede fuera del permiso de esa persona.

La API y CLI incluyen el carril durable `/api/v1` y comparten commands/readers. Efeonce ID, invitación por correo único enlace+código y sesión guest ya se verificaron en un canary real acotado. Terminó con invitación revocada, sala archivada y flags humanos OFF; la denegación actual no significa que el mecanismo siga sin implementarse. El selector de persona pertenece sólo a la demo de lectura y nunca habilita escrituras. No acredita adopción por clientes ni autoría visual completa. [Canary y límites](../../audits/rooms/2026-10-26-auth-rooms-real-image-canary.md).

El corte cloud documentado26Oct de [efeonce-rooms.vercel.app](https://efeonce-rooms.vercel.app/demo) publicó main `e4b2e890`,
con ocho migraciones/26 tablas cloud, GCS privado y worker automático por demanda. Sólo dispatch de
máquina está ON; acceso/invitaciones/medios web siguen OFF. Backend234PASS y Playwright53PASS/3skip
son verificaciones técnicas, no aceptación de la nueva interfaz. [Estado y evidencias](../../architecture/rooms/README.md).

[Contrato de conexión para Claude Design](backend-api-for-claude-design.md) · [Manual local](../../manual-de-uso/rooms/operar-primera-experiencia-local.md)
· [Persistencia TASK-2060](../../tasks/complete/TASK-2060-rooms-persistence-and-lifecycle.md)
· [QA inicial25Oct](../../audits/rooms/2026-10-25-first-local-delivery.md).
El deploy inicial `bd4b802` corresponde a la demo histórica. Este documento no revalida el deployment activo.

## Contenido editable V2 (TASK-2062, local)

La base permite guardar un borrador incompleto, importar contenido estructurado, editar y ordenar bloques,
y relacionar fragmentos con evidencia. Antes de publicar calcula un reporte que identifica faltantes,
referencias rotas, elementos no soportados y exclusiones. La publicación textual V2 está probada. V3 añadió medios privados con verificación de bytes, dos derivados WebP y referencias resueltas; un identificador por sí solo nunca acredita readiness.

Este avance es backend/API/CLI: no añade todavía un editor visual. Dos marcas sintéticas verifican perfiles
creativo, SEO/AEO y combinado. Los lectores mantienen las ediciones V1 originales. La conexión del nuevo renderer/editor y la aceptación visual siguen pendientes. Identidad, invitaciones y medios cuentan con evidencia acotada; activación general y demás unidades de la épica no se dan por cerradas. [Manual](../../manual-de-uso/rooms/operar-primera-experiencia-local.md)
y [evidencia](../../audits/rooms/2026-10-25-versioned-content-authoring.md).

## Medios e interfaz — continuidad 2026-10-26

El corte cloud26Oct admite PNG/JPEG/WebP estáticos. Una imagen física
ya completó PUT GCS→verificación→Job→dos WebP→lectura privada y revocación. Scheduler OIDC comprueba
cada minuto y no inicia contenedor en vacío; el transporte automático tuvo su propia prueba sintética.
Ninguna de esas pruebas acredita la nueva interfaz de Claude Design.

El entorno de integración aislado con datos/permisos y SDK ya está preparado; el candidato29Oct añade
V4 local para combinar imágenes, PDF, audio y video. [Arranque de diseño](../../manual-de-uso/rooms/integrar-claude-design-local.md).
Pendiente: conectar pantallas a DTO/commands y probar el recorrido completo con la nueva UI; el perfil
local no prueba de nuevo GCS ni habilita multimedia cloud. Auth PR263/264 se
mantienen sin fusionar/desplegar por instrucción del operador; no activar flags ni repetir correo por
conectar diseño. [Contrato y owners](backend-api-for-claude-design.md).
