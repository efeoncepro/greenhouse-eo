# Rooms — Quién ve qué: cliente, equipo y agentes

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-10-31 por Claude
> **Ultima actualizacion:** 2026-10-31 por Claude
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
| Qué ve | Sólo las ediciones **publicadas** de su sala: la órbita, las escenas «Vive el servicio» y «Qué cambió» entre ediciones. |
| Pruebas | Las ve sólo si su invitación incluye el permiso de ver pruebas. |
| Preguntas | Puede hacerlas sólo si su invitación incluye el permiso de preguntar. |
| Qué nunca ve | Borradores, la mesa de autoría, otras salas, notas internas del equipo y las señales de actividad. |

> Detalle técnico: la persona invitada entra como principal externo con rol `client`; los permisos extra son
> `evidence.read` y `questions.create`. Contrato en
> [API y acceso](../../architecture/rooms/EFEONCE_ROOMS_API_AND_ACCESS_CONTRACT_V1.md).

## Equipo interno

Para entrar, la persona usa Efeonce ID y además necesita acceso dado dentro de Rooms. Ser administrador de Greenhouse
o de Efeonce ID no basta. Si no tiene acceso, Rooms le muestra la página «Casi.» con un código de solicitud; el
detalle está en [acceso interno](acceso-interno-rooms.md).

| Pantalla | Qué permite |
|---|---|
| `/rooms` | Ver la lista de salas del espacio. |
| «Abrir sala» | Ver la sala tal como la ve el cliente. |
| «Invitaciones» | Invitar a una persona. Hoy la pantalla sólo ofrece dos permisos: ver la sala y ver pruebas. |
| Mesa de autoría (`/rooms/:id/authoring`) | Crear y editar el contenido, incluidas las escenas. Existe, pero **ningún botón lleva a ella**: hay que escribir la dirección. |

> Detalle técnico: el acceso interno se administra con los comandos `members.*`; ver
> [manual de acceso interno](../../manual-de-uso/rooms/administrar-acceso-interno.md).

## Agentes

### Hoy

- Un agente trabaja con la línea de comandos `pnpm rooms` o con el MCP local, que corre en la máquina de la persona.
- Usa la sesión de esa persona (un archivo de sesión). Por eso puede hacer todo lo que ella puede hacer, incluidos los
  comandos de acceso `members.*`.
- No hay un MCP remoto: ningún agente opera Rooms sin la sesión local de una persona.
- Rooms todavía no distingue si una acción la hizo la persona o un agente en su nombre.

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
| Botón para crear una sala | Sólo por API o con la línea de comandos. |
| Enlace a la mesa de autoría | Escribir la dirección `/rooms/:id/authoring`. |
| Todos los permisos de invitación en pantalla | La pantalla ofrece ver sala y ver pruebas; otros permisos, como preguntar, se dan por API o comandos. |
| Consola de presentación | Sólo por API. |
| Señales de actividad | Sólo por API. |

Las pantallas de administración que faltan están en pausa: se van a rediseñar pensando primero en los agentes, con
una vista de «Actividad de agentes» y una vista por sala.

> Detalle técnico: estado y próximos pasos en el [dossier de Rooms](../../architecture/rooms/README.md); operación de
> producción en el [manual de producción](../../manual-de-uso/rooms/operar-produccion-rooms.md).
