# Integrar Claude Design con Rooms en local

Este entorno usa el backend real de Rooms con datos y autoridad sintéticos. No es un staging cloud ni
un nuevo canary de Efeonce ID. Auth permanece en PR y ningún acceso productivo se habilita.

## Arranque y recursos

En `/Users/jreye/Documents/efeonce-rooms`, rama `codex/rooms-design-integration`, con Node24, pnpm12.15.0
y PostgreSQL18 de Homebrew disponibles:

```sh
pnpm integration:up
pnpm integration:status
pnpm integration:check
pnpm integration:stop
```

- Aplicación Next: `http://127.0.0.1:3216`.
- Launcher de personas fixture: `http://127.0.0.1:19338`.
- PostgreSQL propio55433, DB `rooms_local`; no comparte cluster con el55432 de las pruebas anteriores.
- Datos, medios, caché y estado: `.local/design-integration/`, ignorados. Estado/credenciales0600 y
  carpeta0700. No copiar su contenido a frontend, documentación, conversaciones o repositorios.
- Ocho migraciones actuales. `up` conserva salas/ediciones y renueva sólo autoridad de los fixtures
  declarados; `stop` termina únicamente sus procesos/cluster, confirma puertos libres y conserva datos.
- Worker local finito cada2s, con un trabajo a la vez; sin sweep destructivo, GCS ni Scheduler cloud.

El launcher permite administrador/operador de Lumbre, administrador de Bruma y cliente limitado a la
sala Lumbre. Son organizaciones y nombres sintéticos. Internos usan el consumer OAuth/OIDC canónico
contra issuer fixture local con PKCE/nonce; cliente usa una sesión fixture offline HttpOnly limitada.
No simula recepción de correo ni prueba una identidad corporativa real. Para renovar, volver al launcher.
Sesión interna hasta5min y guest59min; la UI debe manejar expiración y denegación del servidor.

El tooling rechaza Vercel, perfiles cloud, dotenv de aplicación y rutas inseguras/symlinks; sus children
reciben una allowlist de entorno sin credenciales GCP/Resend/migrator. No borra ni modifica dotenv del
operador. El caché Next separado sólo funciona con opt-in local/development y falla cerrado en hosted.
Next puede regenerar `next-env.d.ts`/includes de tsconfig al usar ese caché: revisar y excluir exclusivamente
esos cambios generados antes de un commit, conservando cualquier edición real de otra persona.

## Conectores para la interfaz

Importar desde `src/client` dentro del mismo runtime Rooms. La UI recibe DTOs y permisos calculados por
el servidor; ningún rol, `organizationId` o bandera del navegador concede autoridad.

```ts
import { createRoomsClient, RoomsClientError } from '@/client'

const rooms = createRoomsClient({ organizationId: selectedOrganizationId })
const { data: workspace } = await rooms.rooms()
const { data: authoring } = await rooms.authoring(selectedRoomId)

// Conservar esta clave para reintentar la MISMA intención si la respuesta fue incierta.
const intentionKey = crypto.randomUUID()
await rooms.command('content.upsertBlock', {
  roomId: selectedRoomId,
  expectedRevision: authoring.revision,
  block: editedBlock,
}, { idempotencyKey: intentionKey, signal: abortController.signal })
```

API del cliente: `rooms/room/draft/authoring/preview/validation/editions/edition/media/upload/transfer`,
`invitations/invitationManagement`, `session/selectContext/operations`, `command` y `renditionPath`.
Resultados `{data,correlationId}`; `RoomsClientError` expone code/status/correlationId/retryAfter saneados.
Abort y timeout terminan la espera; no se repite ningún write automáticamente. Ante409 releer/reconciliar.

Tipos de DTO derivados de las fuentes canónicas mediante imports type-only; el bundle browser no contiene
módulos server, PG, crypto Node ni fixtures. Este es un módulo del repo Rooms, no un paquete SDK externo
publicado. No usar URLs productivas como origen del cliente de la interfaz local.

## Imágenes

`sha256Blob(file)` calcula SHA; `uploads.initiate` crea intención con revisión/tamaño/tipo/procedencia.
Obtener descriptor por `transfer`, ejecutar `putMediaTransfer(descriptor, blob)`, confirmar con
`uploads.complete`, consultar `upload/media` hasta ready y usar `content.attachAsset` con revisión nueva.
Finalmente validar y publicar. Un PUT200 no acredita ready, attach ni publicación.

El helper sólo acepta el destino local de transferencia o el namespace GCS exacto del contrato. En GCS
omite credenciales; no copia Cookie/Authorization ni escribe Content-Length desde JS. Nunca persistir,
loggear o incluir descriptors/URLs firmadas en reportes, props, analytics o errores. El perfil de este
entorno usa almacenamiento local; no prueba una nueva transferencia física GCS ni su CORS productivo.

Leer derivados mediante `renditionPath` con editionId o draft, no ambos; usar sesión del mismo origen,
`private/no-store` y el renderer privado. No optimizador público `next/image` ni originales descargables.

## Comprobación y entrega

`integration:check` usa un navegador aislado y el SDK contra las APIs reales. Modifica únicamente el
bloque `image` de la sala sintética reservada para verificar la secuencia de imagen, crea una edición y
reabre borrador para continuar integrando. Las ediciones publicadas anteriores permanecen inmutables.
No ejecutarlo sobre salas reales ni sobre la sala cloud archivada del canary anterior.

Evidencia local privada: `.local/design-integration/check.json`; reporte público saneado en Greenhouse.
Pruebas de conectores/guardas se incluyen en `pnpm test`. El nuevo diseño, componentes visuales y aceptación
humana siguen con Claude Design; este corte prepara infraestructura y transporte, no una UI aceptada.

Producción mantiene sus flags humanos OFF y Auth PR263/264 retenidas. Publicación de esta rama, activación
cloud, envío a clientes y cierre del recovery ampliado son acciones separadas, sin autorización implícita.
