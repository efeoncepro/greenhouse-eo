# Rooms — Nombrar el espacio de trabajo

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** 2026-11-01 por Claude (TASK-2085)
> **Ultima actualizacion:** 2026-11-01 por Claude
> **Documentacion tecnica:** [API y acceso: espacio de trabajo](../../architecture/rooms/EFEONCE_ROOMS_API_AND_ACCESS_CONTRACT_V1.md#acceso-interno-y-espacio-de-trabajo--vigente-al-2026-11-01) · [ADR acceso interno durable](../../architecture/rooms/EFEONCE_ROOMS_DURABLE_INTERNAL_ACCESS_DECISION_V1.md)

## Para qué sirve

Ponerle o cambiarle el nombre legible a una organización de Rooms, por ejemplo «Efeonce». Ese nombre aparece en el
encabezado de la casa del equipo (`/rooms`), en la actividad de cada sala y en el selector de espacio. Sin nombre,
Rooms muestra «Espacio de trabajo» y el selector muestra el identificador técnico.

El 2026-11-01 el espacio del piloto quedó con el nombre «Efeonce» en producción.

## Antes de empezar

- El identificador de la organización (`ORG`, con la forma `org-…`). Lo conoce quien administra Rooms; el del piloto
  está en el ledger de la skill `efeonce-rooms`.
- Quien hace el cambio necesita la capacidad `members.manage` en esa organización (sólo administradores). Sin ella,
  Rooms responde que la organización no existe.
- Elige el camino:
  - **Con tu sesión** (lo normal): una sesión de Rooms en archivo privado (`--session-file`, permisos `0600`).
  - **Herramienta administrativa** (sin sesión de navegador): un checkout de `efeoncepro/efeonce-rooms`. En
    producción, además, `cloud-sql-proxy` y `gcloud` con acceso al proyecto `efeonce-group`: el wrapper resuelve la
    credencial de la base sin imprimirla.
- En producción, **autorización explícita del operador** antes de cada `--apply`.
- El nombre: de 1 a 80 caracteres. Los espacios al inicio y al final se quitan solos.

## Paso a paso

### Opción A — Con tu sesión

1. Crea `nombre.json`:

   ```json
   { "displayName": "Efeonce" }
   ```

2. Ejecuta el comando con una clave de idempotencia que puedas reconocer:

   ```bash
   pnpm rooms execute --session-file /ruta/privada/sesion.json --organization ORG \
     --operation organization.rename --idempotency-key nombre-espacio-2026-11 \
     --input nombre.json --base-url https://efeonce-rooms.vercel.app
   ```

3. Recarga `/rooms`: el encabezado muestra el nombre nuevo.

El mismo comando existe por API (`POST /api/v1/commands`), SDK y MCP stdio local (toolset `members`). El recibo
registra quién lo ejecutó y por qué canal.

### Opción B — Herramienta administrativa, en local

Sirve para la PG local del checkout de Rooms. Corre el mismo comando como un principal interno que ya administra la
organización (su permiso se relee de la base; la herramienta no lo inventa) y lo atribuye al agente que declares.

1. En seco, para ver el nombre actual y el que vas a poner:

   ```bash
   pnpm access:rename-organization --organization ORG --principal PRINCIPAL \
     --name "Efeonce" --agent claude-code
   ```

   Respuesta: `{ "command": "rename-organization", "apply": false, "organizationId": "…", "current": null, "next": "Efeonce" }`.
   `current: null` significa que todavía no tiene nombre.

2. Si es lo que esperas, aplica:

   ```bash
   pnpm access:rename-organization --organization ORG --principal PRINCIPAL \
     --name "Efeonce" --agent claude-code --apply
   ```

- `PRINCIPAL`: el identificador del principal interno con `members.manage`. En el piloto es el principal interno del
  piloto (el del dueño).
- `--agent`: el identificador del agente que hace el cambio, en minúsculas (`claude-code`, `codex`). Si lo hace una
  persona a mano, igual se declara la herramienta que usó.

### Opción C — Herramienta administrativa, en producción

Igual que la opción B, pero contra `rooms_production` a través del proxy de Cloud SQL:

```bash
pnpm access:production rename-organization --organization ORG --principal PRINCIPAL \
  --name "Efeonce" --agent claude-code
```

Revisa la corrida en seco y, con la autorización del operador, repite con `--apply`. Después:

1. Vuelve a correr la corrida en seco: `current` debe decir el nombre nuevo.
2. Anota en el ledger de la skill `efeonce-rooms` qué se cambió, cuándo y con qué autorización.

## Qué significan los resultados

| Resultado | Qué significa |
|---|---|
| `apply: false` con `current` y `next` | Corrida en seco: no cambió nada. |
| `apply: true`, `replayed: false` | El nombre se guardó y quedó un recibo con quién lo hizo. `previous` dice el nombre anterior. |
| `replayed: true` | Ya se había hecho con esa misma clave y ese mismo nombre (opción A). No se repite nada. |
| `conflict` | Usaste una clave que ya se había usado con **otro** nombre. Usa una clave nueva. |
| `not_found` | Quien hace el cambio no tiene `members.manage` en esa organización, o el identificador no existe. |
| `invalid_input` | Nombre vacío o de más de 80 caracteres (opción A). |
| `unauthenticated` | La sesión venció o falta el archivo de sesión. |
| Texto «Uso: pnpm access:…» | En las opciones B y C: falta un argumento o tiene un formato inválido (`ORG`, `PRINCIPAL`, `--agent`, o un nombre vacío o de más de 80 caracteres). Nada se escribió. |

La herramienta administrativa genera una clave nueva en cada corrida: dos `--apply` seguidos con el mismo nombre
dejan dos recibos, no un `replayed`.

## Qué no hacer

- No escribir el nombre con SQL en `rooms.organization_profiles`: se pierde el recibo y la atribución.
- No usar el nombre para decidir permisos ni como identificador: el identificador sigue siendo `ORG`.
- No correr `--apply` en producción sin autorización explícita del operador.
- No poner datos personales ni de clientes en el nombre de un espacio interno.
- No correr `pnpm db:migrate down` para «borrar» nombres: la migración se niega si hay nombres guardados.

## Problemas comunes

| Problema | Causa probable | Qué hacer |
|---|---|---|
| El encabezado sigue diciendo «Espacio de trabajo» | El espacio no tiene nombre, o Rooms no pudo leer la base en ese momento | Corre la opción B o C en seco y mira `current`; si está bien, recarga la página. |
| `not_found` siendo administrador | El principal o la organización no son los correctos, o tu acceso venció | Revisa con `pnpm rooms members` o `pnpm access:production health`. |
| La herramienta de producción no conecta | `cloud-sql-proxy` o `gcloud` sin sesión | Renueva la sesión de `gcloud` y reintenta; nada se escribió. |
| La PG local responde que la tabla no existe | Falta aplicar la migración `1793267000000_rooms-organization-profile` | `pnpm db:migrate up` (sin `up` sólo muestra el estado). |

## Referencias técnicas

- Runtime: `efeonce-rooms` `scripts/access.ts` (subcomando `rename-organization`), `scripts/production-access.sh`,
  `src/server/access/service.ts` (`executeOrganizationCommand`), `src/server/access/organization-names.ts`,
  `migrations/1793267000000_rooms-organization-profile.sql`, `tests/access-organization.test.ts`.
- [Administrar el acceso interno](administrar-acceso-interno.md) · [Operar Rooms en producción](operar-produccion-rooms.md)
- [Acceso interno del equipo (funcional)](../../documentation/rooms/acceso-interno-rooms.md)
- [TASK-2085](../../tasks/in-progress/TASK-2085-rooms-agent-activity-surface.md)
