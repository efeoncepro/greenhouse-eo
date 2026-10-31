# Revertir en Rooms: comandos, orden y aviso

Todo lo que llega al cliente tiene una reversa con la misma paridad que la acción
([ADR del carril de agentes](../../../../docs/architecture/rooms/EFEONCE_ROOMS_AGENT_LANE_DECISION_V1.md), D4).
Revertir es un comando más: queda registrado, se atribuye a quien lo hizo y avisa. **Nunca** se borra ni se edita
a mano en la base.

## La reversa de cada acción

| Hiciste | Revierte con | Payload mínimo | Comprueba con |
| --- | --- | --- | --- |
| `editions.publish` | `editions.republish` de la edición anterior: vuelve a publicarla como edición nueva, sin borrador abierto | `{ roomId, expectedRevision, sourceEditionId }` | `pnpm rooms editions` (la vigente es la nueva y su contenido es el anterior) |
| Primera publicación equivocada (no hay edición anterior) | Revoca las invitaciones, corrige el borrador y publica una edición corregida. Si la sala no debía existir, `rooms.archive` | `{ roomId, expectedRevision }` | `pnpm rooms invitation-management` y `pnpm rooms room` |
| `invitations.create` o `invitations.reissue` | `invitations.revoke`, efectivo de inmediato | `{ roomId, expectedRevision, invitationId }` | `pnpm rooms invitation-management`: `status: revoked` |
| `access.grant` | `access.revoke` | `{ roomId, expectedRevision, grantId }` (el `resourceId` del recibo del grant) | Lectura de la sala con el rol afectado |
| `members.grantInternal` o `members.renewInternal` | `members.revokeInternal` | `{ principalId }` | `pnpm rooms members` |
| `questions.answer` o `questions.resolve` | Una respuesta nueva que corrige, o reabrir; nunca borrar la anterior | según `questions.*` | `pnpm rooms questions` |

El lector `agents.activity` (`pnpm rooms agents-activity --organization ORG [--scope organization]`) devuelve, por
cada acción de un agente, `reversal { operation, payload, state, reason }`. Si `state` es `available`, ese
`payload` es la reversa exacta: úsalo tal cual, con una clave de idempotencia nueva
(`<roomId>:revert:<acción>:v1`). Si es `done`, ya se revirtió; si es `unavailable`, `reason` dice por qué y la
alternativa sale de la tabla.

## Orden cuando algo salió mal

1. **Primero corta la exposición.** Si un correo equivocado recibió acceso, `invitations.revoke` antes que
   cualquier otra cosa: cada minuto con la invitación viva es un minuto en que alguien puede leer.
2. **Después el contenido.** Republica la edición anterior o publica la corregida, con cobertura limpia y «Ver
   como» revisado otra vez: una reversa apurada no es excusa para saltarse el oficio.
3. **Comprueba con una lectura**, no con el recibo del comando: el recibo dice que el comando corrió, la lectura
   dice cómo quedó la sala.
4. **Avisa** (siguiente sección) y deja el error registrado donde la persona lo vea.

## Cómo avisar

Un aviso de reversa dice, en este orden:

- qué se revirtió y en qué sala (título y `roomId`);
- por qué: el error concreto, sin minimizarlo («invité a un correo que no estaba en el deal»);
- qué ve ahora el cliente;
- qué queda pendiente y quién lo decide.

> Revoqué la invitación de `jperez@…` en «Que te encuentren cuando preguntan» (sala `sala-andina-2027`): ese
> correo no estaba en el deal y lo había tomado de la firma de un mensaje. La invitación quedó revocada a las
> 15:42; no registra accesos. Las otras tres siguen activas. Si Juan Pérez debe entrar, agrégalo al deal y lo invito.

## Qué no hacer

- **No borrar.** Ni SQL, ni «limpiar» filas, ni reescribir el historial. El rastro es parte del control.
- **No ocultar un error con otro cambio.** Publicar una edición nueva encima de una equivocada sin decirlo deja
  al cliente con una versión que nadie le explicó.
- **No revertir la acción de otra persona o de otro agente sin avisar a su responsable**, salvo para cortar una
  exposición evidente (invitación a un tercero, dato de otro cliente). En ese caso revierte primero y avisa de
  inmediato.
- **No reintentar una reversa con una clave distinta** si no sabes si la primera corrió: lee el estado primero.
- **No reabrir el borrador (`editions.reopen`) para «arreglar rápido» la edición publicada.** Reabrir crea un
  borrador desde una edición; la publicada no cambia hasta que publiques otra.
