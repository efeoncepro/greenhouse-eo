# Operar la primera experiencia local de Rooms

Fecha: 2026-10-25. Owners: Platform/Product. [Dossier](../../architecture/rooms/README.md) · [Superficie implementada](../../documentation/rooms/primera-experiencia-local.md).

## Arranque

Runtime en `/Users/jreye/Documents/efeonce-rooms`, rama `main`. La documentación sigue en Greenhouse. Node24.x y pnpm12.15.0; paquetes privados AXIS se instalan desde GitHub Packages con el acceso existente. No copiar `.npmrc`, tokens o credenciales al repo ni al navegador. Usar la [política privada AXIS](../../operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md).

```sh
cd /Users/jreye/Documents/efeonce-rooms
pnpm install --frozen-lockfile
pnpm brand:sync
pnpm dev
```

`brand:sync` copia cuatro SVG oficiales exactos desde el paquete instalado a `public/brand` y genera checksums; esa carpeta es derivada e ignorada. Para comprobar el build de producción, detener el dev de este producto, ejecutar `pnpm verify` y después `pnpm start`. Ambos sirven sólo loopback3210. No detener otros productos.

La primera instalación resolvió379 paquetes con peers estrictos. En esta máquina el bootstrap gestionado de pnpm12 tenía un wrapper sin shebang; ejecutar el instalador oficial del paquete ya descargado reparó el enlace al binario nativo. No se debilitó el gate ni se cambió el package manager de Greenhouse.

## Recorrido

1. Abrir `http://127.0.0.1:3210/demo`. El aviso de demostración permanece visible.
2. «Explorar propuesta» enfoca los capítulos. «Abrir pieza» muestra el archivo íntegro; Escape vuelve al disparador.
3. «Contenido SEO/AEO» contiene el artículo. «Ver radiografía» abre origen, método, cobertura y límites de la evidencia de ejemplo. No hay resultados comerciales medidos.
4. «Operador» abre `/demo/workspace?persona=operator`: salas autorizadas, notas internas y capacidades efectivas.
5. «Administrador» añade la consulta de accesos. La demo permanece de lectura: los commands durables de TASK-2060 existen en un carril separado y no se ejecutan mediante el selector de persona.
6. `/demo/workspace?persona=client` muestra acceso restringido sin datos internos. El selector usa exclusivamente personajes sintéticos; no crea una sesión real.

## API y CLI de demostración

```sh
pnpm rooms room --demo --persona client
pnpm rooms workspace --demo --persona operator
pnpm rooms permissions --demo --persona administrator
pnpm rooms operations --demo
```

La CLI usa HTTP contra loopback3210 por defecto. `--base-url` admite un origen explícito sin credenciales, ruta, query ni hash; fuera de loopback exige HTTPS. `--demo` selecciona exclusivamente el carril de muestra. Los GET `/api/demo/room`, `/api/demo/workspace`, `/api/demo/permissions` comparten readers y devuelven `private, no-store`; un cliente recibe403 en workspace. Persona desconocida devuelve400; POST no existe. `/api/demo/operations` conserva el catálogo de tres readers de la muestra; el catálogo durable pertenece a `/api/v1/operations`.

## Persistencia local y recuperación

TASK-2060 incorpora PostgreSQL18.6 propio en loopback55432, base `rooms_local` y schema `rooms`. El script usa `/opt/homebrew/opt/postgresql@18/bin`; no arranca ni consulta servicios remotos. Ejecutar desde el runtime:

```sh
pnpm db:local up
pnpm db:migrate status
pnpm db:migrate up
pnpm db:smoke
pnpm test:persistence
pnpm db:recovery
pnpm db:local status
```

`db:smoke` crea una organización y autoridad **sintéticas propias**, crea/publica una sala y relee su edición. Es una herramienta de verificación local, no una sesión HTTP ni una invitación real. Las pruebas y smokes retienen fixtures en la base local; no borran registros por nombre/prefijo.

`db:local up` guarda las credenciales de runtime/migrador en `.local/db-config.json`0600; cluster, socket, logs y backups viven bajo `.local/` ignorado. Las variables opcionales `ROOMS_DATABASE_URL` y `ROOMS_MIGRATION_DATABASE_URL` sustituyen ese archivo, pero el guard de este corte sólo admite la base, host, puerto y usuarios Rooms previstos. No imprimir ni copiar las cadenas de conexión a mensajes, commits o Vercel.

`pnpm db:recovery --restart` añade el reinicio del cluster exclusivo antes del dump/restore. Ejecutarlo cuando no haya pruebas o escrituras locales de Rooms activas. El restore usa una base temporal creada para esa corrida, compara conteos y hashes de ediciones y elimina esa base y el dump. `pnpm db:local stop` detiene sólo este cluster. `pnpm db:migrate down` elimina el schema y sus datos: se verificó down/up con la base vacía, y no es el procedimiento para preservar salas ya creadas.

## Contrato durable HTTP y CLI

Las rutas están implementadas, pero **todas las solicitudes válidas al carril real reciben401 hasta integrar Efeonce ID**. Un bearer inventado, `ROOMS_ACCESS_TOKEN`, el selector demo o una organización enviada por el navegador no crean autoridad. La CLI sin token termina antes de llamar HTTP. Con una futura sesión válida, estos son los comandos del contrato:

```sh
pnpm rooms operations
pnpm rooms list --organization ORGANIZATION_ID --limit 25
pnpm rooms room --organization ORGANIZATION_ID --room ROOM_ID
pnpm rooms draft --organization ORGANIZATION_ID --room ROOM_ID
pnpm rooms editions --organization ORGANIZATION_ID --room ROOM_ID
pnpm rooms edition --organization ORGANIZATION_ID --room ROOM_ID --edition EDITION_ID
pnpm rooms execute --organization ORGANIZATION_ID --operation rooms.updateDraft --input draft.json --idempotency-key revision:00000001
```

La CLI toma `ROOMS_ACCESS_TOKEN` del entorno y no lo imprime; la integración que verificará ese token aún está pendiente. No usar los readers demo como fallback. El archivo de `--input` es sólo el payload del command; la CLI construye el envelope con organización y operación.

| Ruta | Función |
|---|---|
| `GET /api/v1/operations` | Registro durable |
| `GET /api/v1/rooms?organizationId=…` | Lista paginada con permisos por sala |
| `GET /api/v1/rooms/:roomId?organizationId=…` | Publicación vigente autorizada |
| `GET /api/v1/rooms/:roomId/draft?organizationId=…` | Borrador, sólo con permiso de edición |
| `GET /api/v1/rooms/:roomId/editions?organizationId=…` | Ediciones autorizadas |
| `GET /api/v1/rooms/:roomId/editions/:editionId?organizationId=…` | Snapshot exacto |
| `POST /api/v1/commands` | Command JSON con `Idempotency-Key` |

Commands implementados: `rooms.create`, `rooms.updateDraft`, `editions.publish`, `editions.reopen`, `rooms.archive`, `access.grant` y `access.revoke`. Crear recibe `{roomId, content}`; actualizar recibe `{roomId, expectedRevision, content}`; publicar/archivar reciben `{roomId, expectedRevision}`; reabrir añade `sourceEditionId`. El contrato estricto de grants y contenido vive en `src/domain/persistence-contracts.ts`; el contenido sigue siendo sintético. Ningún command acepta notas internas dentro del snapshot.

Guardar exige la revisión leída: conflicto409 no pisa cambios concurrentes. La clave de idempotencia admite8–200 caracteres alfanuméricos, punto, guion, guion bajo y dos puntos; debe empezar por alfanumérico. Repetir clave/payload devuelve el recibo anterior sólo si la autoridad continúa vigente; cambiar el payload produce409. Publicar fija una edición inmutable; reabrir crea otro borrador y conserva la publicación. Recursos ajenos o no disponibles devuelven404; errores de configuración/disponibilidad503 están sanitizados. Lecturas y respuestas llevan `private, no-store` y correlationId.

## Verificar

- `pnpm verify`: ESLint sin warnings, tres casos negativos, tipos Next+TS7, tests de dominio/transporte y build optimizado. TASK-2060 cerró39 pruebas conjuntas, incluidas9 de dominio PostgreSQL; las pruebas de DB se omiten explícitamente si la base no está configurada, por lo que ese resultado no acredita persistencia.
- `ROOMS_EXTERNAL_SERVER=1 pnpm test:e2e`: tests sobre el servidor3210 ya iniciado.
- GVC desde Greenhouse: `AGENT_AUTH_BASE_URL=http://127.0.0.1:3210 pnpm fe:capture rooms-first-experience --env=local`; escenario anónimo, sólo contenido sintético.
- Evidencia y límites: [auditoría de primera entrega](../../audits/rooms/2026-10-25-first-local-delivery.md) y [TASK-2060](../../tasks/complete/TASK-2060-rooms-persistence-and-lifecycle.md).

## Límites y continuidad

La demo visual y el ciclo durable local son entregas distintas. Persistencia, publicación, auditoría y outbox están verificadas con fixtures locales; no hay base de datos cloud ni identidad federada acreditadas por esta task. Efeonce ID/invitaciones, medios, editor visual, entrega de outbox a sistemas externos, MCP y piloto con clientes siguen pendientes en EPIC-052. GitHub/Vercel pertenecen a TASK-2061; un preview no convierte la demo en sala privada ni traslada la base local. Rollback de código conserva DB; cualquier rollback de schema requiere preservar previamente las salas y verificar recuperación.

## Abrir la demo publicada — TASK-2061

https://efeonce-rooms.vercel.app/demo · [Repo privado](https://github.com/efeoncepro/efeonce-rooms). Publicación del SHA `bd4b802acbbe1db1b0089c9dc0d558c67c41d111`, deployment `dpl_8vJ75Cbn1q75JNe7FEa7LkUccigc`. Vistas cliente, operador y administrador son personas sintéticas de revisión. Las rutas `/api/v1` requieren sesión real y siguen401. No introducir datos reales ni asumir que la DB local se subió.

GitHub/main está vinculado a Vercel; asignación automática de dominios desactivada. Para un nuevo release, verificar candidato de producción y promover su ID explícitamente, luego comprobar alias/HTTP. Primer release sin anterior aceptado: retirada sólo por ID exacto mediante `vercel remove <deploymentId> --yes --scope efeonce-7670142f` y readback del alias, nunca usar nombre del proyecto para borrar todos los deployments. [Evidencia de release](../../audits/rooms/2026-10-25-persistence-motion-release.md).


## Autoría de contenido versionado — TASK-2062

Implementación local; sin editor visible ni identidad real activada. `rooms.create` y `rooms.updateDraft`
aceptan contenido V1 o un manifiesto `rooms.content.v2`. Un borrador V2 permite campos aún vacíos y perfiles
`creative` / `seo-aeo` independientes; la publicación valida requisitos adicionales. No se permite degradar
un borrador V2 a V1. Las ediciones publicadas V1 conservan bytes y hashes.

```sh
pnpm rooms validate-import --organization ORGANIZATION_ID --room ROOM_ID --input manifest.json
pnpm rooms validate --organization ORGANIZATION_ID --room ROOM_ID
pnpm rooms execute --organization ORGANIZATION_ID --operation content.importManifest --input import.json --idempotency-key import:00000001
```

`validate-import` hace POST de lectura a `/api/v1/rooms/:roomId/content/validate-import`: no necesita clave
de idempotencia y no escribe. `validate` usa GET `/api/v1/rooms/:roomId/validation?organizationId=…`.
Ambos devuelven revisión, hash del manifiesto y coverage por elemento con códigos/path estables.
`valid` significa que puede guardarse como borrador; `publicable` exige cobertura completa. Un HTTP200
con `publicable:false` es un diagnóstico correcto, no permiso para publicar.

Payload de importación: `{roomId, expectedRevision, manifest}`. `content.upsertBlock` recibe `block`,
`content.arrange` recibe `orderedBlockIds` (lista exacta, completa y sin duplicados) y
`content.linkEvidence` recibe `relation`, siempre con sala y revisión esperada. Se aplican desde el mismo
endpoint de commands. Releer la revisión después de cualquier escritura; preview no congela autoridad.
Los tipos desconocidos se reportan y el apply completo se rechaza, sin descartar elementos.

El manifiesto tiene bloques editorial/media/diagnostic/plan, evidencia declarada, relaciones evidence/lineage
y referencias AssetVersion. Campos y límites: `src/domain/content-contracts.ts`. IDs y anclas se preservan;
fuentes son `author-declared` / `unverified`, no verificación de hechos. El corte mantiene `dataOrigin:synthetic`.
Sin pipeline R05, cualquier AssetVersion referenciada permanece unresolved y bloquea publicación si se incluye;
una exclusión opcional requiere motivo explícito. No importar `ready`, deliveryURL, rol ni verificación.

`editions.publish` recalcula coverage dentro de la transacción. Snapshot V2 lleva
`rooms.room.v2` / `rooms.renderer.v2`, manifiesto y coverage congelados. Audiencia recibe proyección por
permisos, sin evidencia/relaciones restringidas; la edición conserva su versión histórica. La UI demo sigue V1.
Auth del browser y las credenciales de CLI son contratos distintos: un handle OIDC del issuer no será bearer
API de negocio. Las pruebas CLI usan identidad sintética exclusivamente en harness aislado; no existe bypass
por variable de entorno en la composición de producción.

[Auditoría TASK-2062](../../audits/rooms/2026-10-25-versioned-content-authoring.md).

## Consumidor Efeonce ID — TASK-2065

Backend local verificado con issuer1834 real y Chrome. Por defecto `ROOMS_FIRST_PARTY_AUTH_ENABLED=false`;
`/login` y readers de sesión responden503 disabled sin consultar DB/red. Con flag activo, `/login` crea
transacción y redirige al issuer, `/auth/callback` verifica código/iss/state/nonce/PKCE y crea sesión local.
`GET /api/auth/session` devuelve estado/contextos propios mínimos; `GET/POST /auth/context` permite escoger
organización mediante JSON `{organizationId}` y Origin exacto. `POST /auth/logout` cierra sólo Rooms.
Contexto/recovery aún no tienen pantallas de producto; este corte no se activa para humanos en producción.

Config server-only documentada en `.env.example`: ROOMS_AUTH_ISSUER, ORIGIN, CLIENT_ID, CLIENT_SECRET y
ENCRYPTION_KEY (32bytes base64). HTTP sólo con ALLOW_LOCAL_DEVELOPMENT explícito y loopback. No copiar
credenciales del harness a Vercel. El registro RP del issuer fija redirect exacto `/auth/callback`.

Un binding issuer/sub previamente administrado liga al principal Rooms existente. Sin binding no hay acceso;
varios espacios requieren selección. El callback nunca crea personas/memberships/roles. Sesión y grants se
revalidan en cada operación; un fallo del issuer no permite usar permisos viejos. Cookies/handle/verifier
no se exportan; el handle OIDC no sirve como ROOMS_ACCESS_TOKEN para la CLI.

`pnpm auth:integration --issuer-fixture <PRIVATE_FIXTURE_JSON>` ejecuta Chrome contra los dos runtimes locales
y sus bases reales; el archivo0600 lo entrega el harness del issuer. Script no opera contra producción ni
imprime secretos. Para rollback normal apagar flag y revocar sesiones propias; migración down sólo clon
vacío descartable. [Evidencia y límites](../../audits/rooms/2026-10-25-efeonce-id-consumer.md).
