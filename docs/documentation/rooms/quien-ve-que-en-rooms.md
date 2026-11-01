# Rooms — Quién ve qué: cliente, equipo y agentes

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.1
> **Creado:** 2026-10-31 por Claude
> **Ultima actualizacion:** 2026-11-01 por Claude (TASK-2085)
> **Documentacion tecnica:** [ADR acceso interno durable](../../architecture/rooms/EFEONCE_ROOMS_DURABLE_INTERNAL_ACCESS_DECISION_V1.md) · [ADR carril de agentes](../../architecture/rooms/EFEONCE_ROOMS_AGENT_LANE_DECISION_V1.md) · [ADR «Vive el servicio»](../../architecture/rooms/EFEONCE_ROOMS_SERVICE_SCENES_DECISION_V1.md) · [API y acceso](../../architecture/rooms/EFEONCE_ROOMS_API_AND_ACCESS_CONTRACT_V1.md)

## Para qué sirve este documento

Rooms está en producción para el equipo de Efeonce desde el 2026-10-31. Este documento explica, en simple, qué ve y
qué puede hacer cada tipo de persona: el cliente invitado, el equipo interno y los agentes. También dice qué existe
hoy sólo por API o línea de comandos, sin pantalla.

Todavía no hay clientes reales en Rooms. Invitar al primero exige una autorización nueva.

## Cliente invitado

| Qué | Cómo funciona |
|---|---|
| Cómo entra | Con un enlace y un código que recibe por correo. No necesita cuenta de Efeonce. |
| Cuánto dura | El enlace vale lo que dure la propuesta: 30 días por defecto y hasta 90; el equipo lo puede cerrar antes. El código vence a los 10 minutos, pero desde el mismo enlace se pide uno nuevo. Una vez dentro, puede leer hasta 8 horas sin volver a pedir código. *(Cambio en PR #12, pendiente de publicar; hasta entonces la invitación dura como máximo 24 horas.)* |
| Qué ve | Sólo las ediciones **publicadas** de su sala: la órbita, las escenas «Vive el servicio» y «Qué cambió» entre ediciones. |
| Pruebas | Las ve sólo si su invitación incluye el permiso de ver pruebas. |
| Preguntas | Puede hacerlas sólo si su invitación incluye el permiso de preguntar. |
| Qué nunca ve | Borradores, la mesa de autoría, otras salas, notas internas del equipo y las señales de actividad. |

> Detalle técnico: la persona invitada entra como principal externo con rol `client`; los permisos extra son
> `evidence.read` y `questions.create`. Contrato en
> [API y acceso](../../architecture/rooms/EFEONCE_ROOMS_API_AND_ACCESS_CONTRACT_V1.md).

## Equipo interno

Para entrar, la persona usa Efeonce ID y además necesita acceso dado dentro de Rooms. Ser administrador de Greenhouse
o de Efeonce ID no basta. Si abre `/rooms` sin sesión, va directo a Efeonce ID («Entra a Rooms»), sin pantalla de
carga intermedia. Si no tiene acceso, Rooms le muestra la página «Casi.» con un código de solicitud; el detalle está
en [acceso interno](acceso-interno-rooms.md).

El encabezado muestra el nombre del espacio (por ejemplo, «Efeonce»). Si el espacio no tiene nombre todavía, dice
«Espacio de trabajo».

| Pantalla | Qué permite |
|---|---|
| `/rooms` (la casa) | Ver primero lo que hicieron los agentes en nombre del equipo y, debajo, la lista de salas del espacio. |
| «Crear sala» | Crear una sala y llegar a su mesa de autoría. |
| «Abrir autoría» | Ir a la mesa de autoría (`/rooms/:id/authoring`) de una sala, si la persona puede editar contenido. |
| Actividad de una sala (`/rooms/:id/actividad`) | Ver lo que pasó en esa sala, con accesos a «Ver como cliente», «Abrir autoría», «Invitaciones» y «Qué cambió». |
| «Abrir sala» / «Ver como cliente» | Ver la sala tal como la ve el cliente. |
| «Invitaciones» | Invitar a una persona. Hoy la pantalla sólo ofrece dos permisos: ver la sala y ver pruebas. |
| Deshacer una acción de agente | Revertir, con confirmación, una acción que salió de la mesa (publicar, invitar, dar acceso), cuando Rooms lo permite. |

> Detalle técnico: el acceso interno se administra con los comandos `members.*`; ver
> [manual de acceso interno](../../manual-de-uso/rooms/administrar-acceso-interno.md).

## Agentes

### Hoy

- Un agente trabaja con la línea de comandos `pnpm rooms` o con el MCP local, que corre en la máquina de la persona.
- Usa la sesión de esa persona (un archivo de sesión). Por eso puede hacer todo lo que ella puede hacer, incluidos los
  comandos de acceso `members.*` y el cambio de nombre del espacio.
- No hay un MCP remoto: ningún agente opera Rooms sin la sesión local de una persona o sin una herramienta
  administrativa que corre el operador.
- Rooms registra si una acción la hizo la persona o un agente, y por qué canal; la persona recibe un aviso y puede
  deshacer lo que salió de la mesa. El primer recorrido real con un agente todavía no se ha hecho.

### Lo decidido (todavía sin construir)

El [ADR del carril de agentes](../../architecture/rooms/EFEONCE_ROOMS_AGENT_LANE_DECISION_V1.md) quedó aceptado el
2026-10-31. En palabras del operador: «Los agentes son ciudadanos de primera clase, pueden dar acceso y publicar».

| Tema | Cómo será |
|---|---|
| Qué pueden hacer | Publicar, invitar y dar acceso directo, con la autoridad exacta de la persona interna que los usa. No tienen identidad propia. |
| Por dónde entran en producción | Sólo por el gateway de Efeonce, con un permiso delegado por Efeonce ID. |
| Cómo se controla | Cada acción queda registrada con quién la hizo (persona o agente y por qué canal), la persona recibe un aviso, se puede revertir con un clic y hay cuotas. |
| Datos del cliente | Leer información del cliente es un permiso aparte. |

## Lo que todavía falta en la interfaz

| Falta | Cómo se hace hoy |
|---|---|
| Todos los permisos de invitación en pantalla | La pantalla ofrece ver sala y ver pruebas; otros permisos, como preguntar, se dan por API o comandos. |
| Cambiar el nombre del espacio | Sólo por comando ([manual](../../manual-de-uso/rooms/nombrar-espacio-de-trabajo.md)). |
| Detalle completo de cada acción de agente | La casa muestra quién, qué, cuándo y por qué canal; el resumen y el detalle de cada acción todavía no llegan. |
| Consola de presentación | Sólo por API. |
| Señales de actividad | Sólo por API. |

Desde el 2026-10-31 ya existen «Crear sala», «Abrir autoría», la casa con la actividad de agentes y la vista por sala
(TASK-2085). Las demás pantallas de administración siguen en pausa.

> Detalle técnico: estado y próximos pasos en el [dossier de Rooms](../../architecture/rooms/README.md); operación de
> producción en el [manual de producción](../../manual-de-uso/rooms/operar-produccion-rooms.md).
