# Rooms — Administrar el acceso interno

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** 2026-10-31 por Claude (TASK-2082)
> **Ultima actualizacion:** 2026-10-31 por Claude
> **Documentacion tecnica:** [ADR acceso interno durable](../../architecture/rooms/EFEONCE_ROOMS_DURABLE_INTERNAL_ACCESS_DECISION_V1.md)

## Para qué sirve

Decidir quién del equipo de Efeonce trabaja en Rooms: darle acceso a una persona, renovarlo antes de que venza y
quitarlo. Efeonce ID sólo confirma quién es la persona; el acceso a Rooms se da aquí. Ser administrador de
Greenhouse o de Efeonce ID **no** da acceso a Rooms.

## Antes de empezar

- Necesitas la capacidad `members.manage` en la organización (sólo el rol administrador la puede tener).
- Una sesión de Rooms (navegador, `--session-file` para la CLI o el MCP local).
- La persona que recibirá acceso debe haber entrado una vez con Efeonce ID: Rooms le mostró «Casi.» y un **código de
  solicitud** (`XXXX-XXXX`). Pídele ese código. Vence en 7 días; si vuelve a entrar, recibe uno nuevo.

## Paso a paso

### Dar acceso a una persona

```bash
pnpm rooms execute --session-file /ruta/privada/sesion.json --organization ORG \
  --operation members.grantInternal --idempotency-key acceso-ana-2026-10 \
  --input acceso-ana.json
```

`acceso-ana.json`:

```json
{ "principalId": "member-ana", "role": "operator", "capabilities": ["workspace.read", "rooms.read", "content.edit"],
  "expiresAt": "2027-10-30T00:00:00.000Z", "accessRequestCode": "K7M2-9QXA" }
```

- `principalId`: un identificador estable y legible para la persona dentro de Rooms.
- `role`: `operator` o `administrator`. Sólo un administrador puede recibir `members.manage`.
- `capabilities`: no puedes dar una capacidad que tú no tengas para toda la organización.
- `expiresAt`: como máximo un año desde hoy.

Cuando el comando responde, la persona vuelve a entrar y llega a su espacio.

### Ver quién tiene acceso

```bash
pnpm rooms members --session-file /ruta/privada/sesion.json --organization ORG
```

Muestra rol, vigencia, si vence en los próximos 30 días (`expiring`), si administra miembros y los últimos seis
caracteres de su identidad de Efeonce ID. El identificador completo nunca se muestra.

### Renovar

`members.renewInternal` con `{ "principalId": "member-ana", "expiresAt": "<nueva fecha>" }`. Extiende persona,
pertenencia, vínculo de identidad y permisos de organización a la misma fecha.

### Quitar acceso

`members.revokeInternal` con `{ "principalId": "member-ana" }`. Sus sesiones en esa organización se cierran de inmediato.

## Primer administrador (bootstrap)

Sólo cuando la organización no tiene a nadie que administre miembros. Corre fuera de la app con la credencial de la
base y una referencia de autorización humana:

```bash
pnpm access:production bootstrap-owner --organization ORG --principal member-julio \
  --issuer https://auth.efeonce.org --subject SUB --authorization "Autorización de Julio, 2026-10-31, chat"
```

Sin `--apply` es una corrida en seco. Con `--apply` escribe. Si ya hay un administrador, no hace nada y lo informa.
Si la identidad ya estaba vinculada (por ejemplo, el acceso restaurado a mano el 2026-10-31), la adopta sin reescribirla.

## Qué significan los estados y señales

| Señal | Qué significa | Qué hacer |
|---|---|---|
| `rooms.access.no_owner` (error) | Nadie puede administrar miembros | Bootstrap del primer administrador |
| `rooms.access.owner_expiring` (warning ≤30 días, error ≤7) | El acceso de administración más largo vence pronto | `members.renewInternal` |
| `last_administrator` (respuesta 409) | Tu cambio dejaría la organización sin administrador | Da acceso a otra persona primero |

`pnpm access:health --organization ORG` (o `pnpm access:production health …`) imprime las señales y quién vence pronto.

## Qué no hacer

- No crear ni extender acceso con SQL manual ni con `bootstrap-production-pilot.ts`.
- No dar acceso por el correo o el rol que la persona tenga en otro producto.
- No compartir el identificador completo de Efeonce ID; usa el código de solicitud.

## Emergencia: revocar una cuenta comprometida que es la única administradora

La base impide dejar la organización sin administrador. Primero haz bootstrap o da acceso a otra persona. Si no es
posible, con credencial administrativa y en una sola transacción:
`SET LOCAL rooms.allow_member_manager_gap = 'on';` y luego la revocación. Después, bootstrap.

## Problemas comunes

- **`not_found` al usar el código:** venció, ya se usó o la persona volvió a entrar (hay uno nuevo).
- **`forbidden`:** pediste una capacidad que tu rol o tus permisos no cubren.
- **`invalid_input`:** vigencia mayor a un año, o el emisor no es Efeonce ID.

## Referencias técnicas

- Runtime: `efeonce-rooms` `src/server/access/**`, `migrations/1793260000000_rooms-internal-access.sql`, `scripts/access.ts`.
- [TASK-2082](../../tasks/in-progress/TASK-2082-rooms-durable-internal-access.md) y [TASK-2083](../../tasks/in-progress/TASK-2083-rooms-access-issue-page.md).
