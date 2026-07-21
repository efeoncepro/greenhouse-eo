# Efeonce Globe — API Contract Spine (TASK-1481) — Runbook V1

- Estado: vigente para el pilot interno no productivo (`internal_smoke`)
- Alcance: cómo **extender**, **llamar** y **verificar** la costilla de contrato de API (API Contract Spine)
- Audiencia: el ingeniero/operador/agente que va a construir sobre la costilla, en particular quien ejecute **TASK-1457** (primer proveedor con paridad de API)
- No autoriza: Producción, clientes externos, llamadas reales a proveedores creativos, almacenamiento de assets, base de datos ni una superficie pública de marca. Eso llega con sus propias tasks.

Este runbook está anclado al código real. Cuando algo es una recomendación (patrón todavía no presente en el repo), se marca explícitamente como **[recomendado / aún no en el repo]**.

---

## 1. Para qué sirve el spine y quién lo opera

El spine es el **único camino gobernado** por el que cualquier transporte (HTTP privado, SDK publicado, adaptador MCP, CLI, workers, plataforma hermana, harness E2E) llega a la lógica de negocio de Globe. Existe para que la Paridad Total de API (Full API Parity) sea una propiedad estructural y no una promesa: una capability se **autora una vez** en el registro y se **despacha idéntica** desde todas las superficies, con la misma autoridad derivada en servidor, los mismos errores canónicos y la misma auditoría correlacionada.

Tres piezas lo componen:

| Pieza | Archivo | Responsabilidad |
|---|---|---|
| Contratos versionados | `packages/contracts/src/index.ts` | Vocabulario de capabilities, sobres de request, resultados, errores, estados de coverage. Sin lógica. |
| Registro + despacho + autoridad | `packages/domain/src/index.ts` | `CapabilityRegistry`, `deriveTrustedContext` (autoridad marcada `__globeTrusted`), mapeo de denegaciones a errores canónicos, y las fixtures inertes del spine. |
| Transporte HTTP + auth planes + auditoría | `apps/studio-web/src/dispatch.ts` + `apps/studio-web/src/app.ts` | Parseo de sobres, resolución del principal (web/api), respuesta JSON canónica, sink de auditoría. |
| SDK tipado | `packages/sdk/src/index.ts` | `GlobeClient`: cliente del API HTTP privado; no reimplementa autoridad. |

Quién lo opera hoy: Efeonce internamente (`environment: 'internal_smoke'`), con dos planos de identidad — sesión humana (web mode) y service principal con IAM (api mode). No hay tenencia externa ni credenciales de proveedor en runtime.

Contrato de despacho, en una frase: **el llamador solo aporta el nombre de la capability y un payload; el actor, el workspace y las capabilities se derivan en servidor y nunca se leen del body ni de headers.**

---

## 2. Cómo agregar una capability nueva al `CapabilityRegistry` (el flujo de TASK-1457)

Este es el flujo que ejercerá TASK-1457 para promover `globe.run.prepare` de reservada (policy-blocked, sin handler) a ejecutable. Son siete pasos; todos son load-bearing.

### Paso 0 — Entender el punto de partida (la fixture inerte)

`createGlobeSpineRegistry()` (en `packages/domain/src/index.ts`) siembra tres entradas:

- `globe.spine.echo` — command inerte, handler que hace eco del payload. Prueba la costura de comandos.
- `globe.spine.status` — reader inerte, devuelve `{ status: 'ok', workspaceId }`. Prueba la costura de lecturas.
- `globe.run.prepare` — command **reservado**: `coverage` en `policy-blocked` en cada superficie ejecutable y **sin `handler`**. No es "missing": es "declarada pero todavía no implementada".

Las constantes están exportadas desde el domain: `GLOBE_SPINE_ECHO_COMMAND`, `GLOBE_SPINE_STATUS_READER`, `GLOBE_SPINE_RESERVED_COMMAND`.

### Paso 1 — Schemas en `contracts`

El payload/query y el outcome/data de la capability nueva son **tipos versionados** que viven en `packages/contracts/src/index.ts`, junto a `CommandRequestEnvelopeV1<TPayload>` y `ReaderResultV1<TData>`. Hoy el repo solo define los sobres genéricos; los tipos por-capability **[recomendado / aún no en el repo]** deben agregarse aquí para que todas las superficies compartan la misma forma:

```ts
// packages/contracts/src/index.ts  — [recomendado / aún no en el repo]
export type PrepareRunRequestV1 = Readonly<{
  schemaVersion: '1';
  compositionId: string;
  modality: 'image' | 'video' | 'audio' | 'document' | 'vector';
}>;

export type PrepareRunResultV1 = Readonly<{
  schemaVersion: '1';
  estimatedCredits: number;
  reservationExpiresAt: string;
}>;
```

Regla: los tipos son inmutables por versión. Un cambio incompatible es un `V2`, no una edición del `V1`.

Si además necesitas un **grant de capability nuevo** (no reusar uno existente), agrégalo al tuple `GLOBE_CAPABILITIES`. Para TASK-1457 esto no hace falta: `globe.run.prepare` ya existe en el vocabulario.

### Paso 2 — Describir la capability y promover el coverage

Un `CapabilityDescriptorV1` declara `coverage` como un `Record` sobre las 8 superficies (`ui`, `http`, `sdk`, `mcp`, `cli`, `worker`, `sister-platform`, `e2e`). Omitir una superficie **no compila** — esa es la garantía de paridad. Los estados válidos son solo tres: `available`, `policy-blocked`, `not-applicable` (`missing` no es representable a propósito).

Para **promover de policy-blocked a available**, cambias el estado únicamente en las superficies que realmente implementas, y dejas el resto honesto:

```ts
// TASK-1457 — descriptor promovido para el command real
import { GLOBE_SPINE_RESERVED_COMMAND } from '@efeonce-globe/domain';
import type { CapabilityDescriptorV1 } from '@efeonce-globe/contracts';

const prepareRunDescriptor: CapabilityDescriptorV1 = {
  capability: GLOBE_SPINE_RESERVED_COMMAND, // 'globe.run.prepare'
  kind: 'command',
  summary: 'Reserva y estima un run creativo gobernado antes de cualquier gasto en proveedor.',
  coverage: {
    ui: 'available',
    http: 'available',
    sdk: 'available',
    mcp: 'available',
    cli: 'not-applicable',
    worker: 'not-applicable',
    'sister-platform': 'not-applicable',
    e2e: 'available',
  },
};
```

El coverage es un **contrato verificable**: el harness lo cruza contra el comportamiento en runtime (ver Paso 7). Declarar `available` sin handler no rinde: el registro **falla cerrado** (`surface_policy_blocked`).

### Paso 3 — Handler que llama al port de proveedor, NUNCA al SDK del proveedor

La firma del handler está fijada por el domain:

```ts
export type CommandHandler = (context: TrustedCommandContextV1, payload: unknown) => unknown | Promise<unknown>;
```

El `context` es la autoridad ya derivada (actor, `workspaceId`, capabilities, `correlationId`), marcado con `__globeTrusted`. El `payload` es lo único que aporta el llamador y **debe validarse/estrecharse** dentro del handler.

Un handler que gasta o toca un proveedor **jamás** llama a Vertex/OpenAI/fal directo: pasa por el port `CreativeProviderAdapter` de `@efeonce-globe/provider-contract` (`estimate` / `submit` / `poll` / `supports`), que es lo que ejecuta el `creative-runner`.

```ts
// TASK-1457 — handler real  ([recomendado] el port exacto de run-lab aún no está en el repo)
import type { CommandHandler } from '@efeonce-globe/domain';

// Inyectado; nunca un SDK de proveedor importado dentro del handler.
type RunLabPort = Readonly<{
  estimate: (context: TrustedCommandContextV1, payload: unknown) => Promise<{ estimatedCredits: number; reservationExpiresAt: string }>;
}>;

const makePrepareRun = (runLab: RunLabPort): CommandHandler => async (context, payload) => {
  // 1) validar/estrechar payload -> PrepareRunRequestV1 (schema de contracts)
  // 2) delegar en el port gobernado, no en un vendor SDK
  const estimate = await runLab.estimate(context, payload);
  // 3) devolver un outcome serializable; la autoridad (workspaceId) sale del context
  return { schemaVersion: '1', ...estimate, workspaceId: context.workspaceId };
};
```

`TrustedCommandContextV1` se importa como tipo desde `@efeonce-globe/domain`.

### Paso 4 — Registrar (o sobrescribir la reservada)

`registry.registerCommand(...)` guarda la entrada en un `Map` keyeado por el nombre de la capability (`this.#commands.set(capability, entry)`). Registrar `globe.run.prepare` con handler + coverage promovido **sobrescribe** la entrada reservada inerte. Ese es el mecanismo canónico para TASK-1457:

```ts
import { CapabilityRegistry, createGlobeSpineRegistry } from '@efeonce-globe/domain';

export function createRunLabRegistry(runLab: RunLabPort): CapabilityRegistry {
  const registry = createGlobeSpineRegistry(); // trae echo + status + la reservada inerte

  registry.registerCommand({
    descriptor: prepareRunDescriptor,          // coverage promovido del Paso 2
    requiredCapability: 'globe.run.prepare',   // el grant que exige el despacho
    handler: makePrepareRun(runLab),           // el handler del Paso 3
  });

  return registry;
}
```

Para readers, `registry.registerReader(...)` con `descriptor.kind === 'reader'` (el registro rechaza `globe_registry_expected_reader` / `globe_registry_expected_command` si el `kind` no coincide con el método).

Luego, el transporte debe usar este registro en vez del spine puro. En `apps/studio-web/src/app.ts`, `createStudioApp` hoy hace `const registry = createGlobeSpineRegistry();` — TASK-1457 lo reemplaza por `createRunLabRegistry(runLab)` (inyectando el port).

### Paso 5 — Método SDK tipado

El command ya es alcanzable por el método genérico del SDK sin tocar el cliente:

```ts
await globe.dispatchCommand<PrepareRunResultV1>('globe.run.prepare', request, {
  idempotencyKey: crypto.randomUUID(),
  correlationId: crypto.randomUUID(),
});
```

Opcional pero recomendado: agregar un wrapper nombrado y tipado en `GlobeClient` (`packages/sdk/src/index.ts`) que fije `command`, `TPayload` y `TOutcome`, de modo que el consumidor no maneje strings sueltos. Es azúcar sobre `dispatchCommand`; no reimplementa autoridad.

### Paso 6 — Grant de `requiredCapability` al principal

El despacho deniega con `access_denied` si el principal no porta `requiredCapability`. El grant depende del plano:

- **web mode**: las capabilities vienen del broker Greenhouse, no se hardcodean — `parseGlobeCapabilities(identity.capabilities)` en `app.ts` estrecha la lista del broker al vocabulario Globe. Para que un humano pueda ejecutar `globe.run.prepare`, el broker debe emitir ese grant.
- **api mode**: hoy `internalServicePrincipal()` hardcodea `capabilities: ['globe.studio.access']` y `workspaceBindings: ['greenhouse-org:efeonce']`. Mientras eso no incluya `globe.run.prepare`, el command promovido responderá `403 access_denied` en api mode. TASK-1457 reemplaza este hardcode por el mapeo real ID-token → principal por identidad (ver el comentario de `resolveDispatchPrincipal`).

### Paso 7 — El harness manifest-driven la ejercita sola

No hace falta editar el test de conformance para "agregar" la capability nueva. El test `drives conformance from the published coverage manifest, not a hardcoded list` (`apps/studio-web/src/conformance.test.ts`) lee `sdk.capabilities()`, recorre cada command y afirma que su comportamiento en runtime coincide con el coverage declarado: `available → 200`, `policy-blocked → 403 policy_blocked`, `not-applicable → 404`. Tu trabajo es hacer el coverage **honesto**; el harness lo verifica.

---

## 3. Cómo llamar la API

Endpoints privados versionados (todos bajo auth, salvo health):

| Método + ruta | Body | Respuesta OK |
|---|---|---|
| `GET /v1/health` | — | `GlobeHealthV1` (sin auth; liveness) |
| `GET /v1/capabilities` | — | `CapabilityCoverageManifestV1` |
| `POST /v1/commands` | `CommandRequestEnvelopeV1` | `CommandResultV1` |
| `POST /v1/readers` | `ReaderRequestEnvelopeV1` | `ReaderResultV1` |

Error en cualquiera: `GlobeApiErrorV1` → `{ "schemaVersion": "1", "error": { "code", "message", "retryable", "correlationId" } }`.

### 3.1 Por HTTP (curl)

La autoridad se resuelve por plano:

- **api mode**: el request llegó a un Cloud Run con IAM (primer gate, el perímetro), pero la app **no confía sólo en ese borde**: en defense in depth verifica el ID token del caller **en la propia app** (`verifyWorkloadCaller` en `app.ts`) — `verifyIdToken` local contra las claves públicas de Google **cacheadas** (sin round-trip por request), `audience` explícito y allowlist de service accounts. Ambos controles son **fail-closed**: sin `GLOBE_API_EXPECTED_AUDIENCE` o sin `GLOBE_API_CALLER_SERVICE_ACCOUNTS` declarados, el servicio **no acepta a nadie** (el motivo: un Cloud Run puede tener `invokerIamDisabled=true` y saltarse el gate de invoker del perímetro por completo). Recién con el token válido devuelve el `internalServicePrincipal()`. Para invocar directo se manda un ID token de Google en `Authorization: Bearer <id-token>`. **Va en `Authorization`, no en `X-Serverless-Authorization`**: Cloud Run **reenvía** `Authorization` al contenedor —a diferencia de `X-Serverless-Authorization`, que **consume** para su propio check de invoker y no reenvía—, y la app necesita **leer** el token para esa segunda verificación (verificado en vivo 2026-07-20: con X-Serverless el perímetro pasaba y la app rechazaba al caller legítimo con 401). El SDK, cuando el material es `cloud-run-id-token`, lo envía en `Authorization`.
- **web mode**: se manda la cookie de sesión humana `__Host-globe_session`.

Comando (echo) — api mode:

```bash
CORR="corr-$(uuidgen)"
curl -sS -X POST "$GLOBE_API_BASE_URL/v1/commands" \
  -H "authorization: Bearer $(gcloud auth print-identity-token)" \
  -H "content-type: application/json" \
  -H "x-globe-correlation-id: $CORR" \
  -d "{
    \"schemaVersion\": \"1\",
    \"apiVersion\": \"v1\",
    \"command\": \"globe.spine.echo\",
    \"idempotencyKey\": \"idem-$(uuidgen)\",
    \"correlationId\": \"$CORR\",
    \"payload\": { \"note\": \"parity\" }
  }"
```

Resultado esperado (`200`, `CommandResultV1`):

```json
{
  "schemaVersion": "1",
  "command": "globe.spine.echo",
  "status": "completed",
  "correlationId": "corr-...",
  "idempotencyKey": "idem-...",
  "workspaceId": "greenhouse-org:efeonce",
  "outcome": { "echoed": { "note": "parity" }, "workspaceId": "greenhouse-org:efeonce" }
}
```

Lectura (status):

```bash
CORR="corr-$(uuidgen)"
curl -sS -X POST "$GLOBE_API_BASE_URL/v1/readers" \
  -H "authorization: Bearer $(gcloud auth print-identity-token)" \
  -H "content-type: application/json" \
  -H "x-globe-correlation-id: $CORR" \
  -d "{
    \"schemaVersion\": \"1\",
    \"apiVersion\": \"v1\",
    \"reader\": \"globe.spine.status\",
    \"correlationId\": \"$CORR\",
    \"query\": {}
  }"
```

Resultado esperado (`200`, `ReaderResultV1`):

```json
{
  "schemaVersion": "1",
  "reader": "globe.spine.status",
  "correlationId": "corr-...",
  "workspaceId": "greenhouse-org:efeonce",
  "data": { "status": "ok", "workspaceId": "greenhouse-org:efeonce" }
}
```

Manifiesto de coverage:

```bash
curl -sS "$GLOBE_API_BASE_URL/v1/capabilities" \
  -H "authorization: Bearer $(gcloud auth print-identity-token)"
```

Caso de denegación por selección de workspace no bindeada — agregar `"workspaceSelection": "ws-victim"` al sobre del comando devuelve `403` con `error.code = "access_denied"` y `retryable = false`.

Notas de contrato que evitan sorpresas:

- El **correlation id autoritativo** para la respuesta y la auditoría es el header `x-globe-correlation-id` (normalizado con el regex `^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$`; si falta o es inválido, el servidor genera uno). El campo `correlationId` del **body** es requerido por el parser pero **no** se usa para la respuesta. Mantén ambos iguales para no confundirte.
- El servidor deriva `workspaceSelection` **del body**, no del header `X-Globe-Workspace-Id`. Ese header (y `Idempotency-Key`) que emite el SDK son informativos; la autoridad sale del sobre parseado + el principal.

### 3.2 Por SDK (`@efeonce-globe/sdk`, `GlobeClient`)

```ts
import { createCallbackAuth, GlobeClient, GlobeSdkError } from '@efeonce-globe/sdk';
import {
  GLOBE_SPINE_ECHO_COMMAND,
  GLOBE_SPINE_STATUS_READER,
  GLOBE_SPINE_RESERVED_COMMAND,
} from '@efeonce-globe/domain'; // o usar los strings literales si no dependes de domain

const globe = new GlobeClient({
  baseUrl: process.env.GLOBE_API_BASE_URL!, // https:// (o localhost); sin user/pass/query/hash
  auth: createCallbackAuth(async () => ({
    kind: 'cloud-run-id-token',            // -> header Authorization (Cloud Run lo reenvía; la app lo re-verifica)
    token: await mintCloudRunIdToken(),    // ID token para el audience exacto del servicio (GLOBE_API_EXPECTED_AUDIENCE)
  })),
});

// 1) Descubrir coverage antes de despachar
const manifest = await globe.capabilities();

// 2) Command — idempotencyKey es OBLIGATORIO (el SDK lanza globe_sdk_idempotency_key_required si falta)
const result = await globe.dispatchCommand(GLOBE_SPINE_ECHO_COMMAND, { note: 'parity' }, {
  idempotencyKey: crypto.randomUUID(),
  correlationId: crypto.randomUUID(),
});
// result.workspaceId === 'greenhouse-org:efeonce', result.outcome.echoed === { note: 'parity' }

// 3) Reader — sin idempotencyKey
const status = await globe.dispatchReader(GLOBE_SPINE_STATUS_READER, {}, {
  correlationId: crypto.randomUUID(),
});
// status.data === { status: 'ok', workspaceId: 'greenhouse-org:efeonce' }

// 4) Capability reservada -> policy_blocked hasta TASK-1457
try {
  await globe.dispatchCommand(GLOBE_SPINE_RESERVED_COMMAND, {}, { idempotencyKey: crypto.randomUUID() });
} catch (error) {
  if (error instanceof GlobeSdkError && error.code === 'policy_blocked') {
    // esperado: el handler y la promoción de coverage llegan con TASK-1457
  }
}
```

`context.workspaceId` del SDK viaja como `workspaceSelection` en el sobre (selección **no** confiable, validada contra los bindings del principal) y como header `X-Globe-Workspace-Id`. No es autoridad.

Auth: `GlobeAuthMaterial` tiene dos kinds — `bearer` y `cloud-run-id-token` — y **ambos** viajan en el header `Authorization` (`applyAuthMaterial`, `packages/sdk/src/index.ts`). El ID token va en `Authorization` porque Cloud Run lo **reenvía** al contenedor (consume `X-Serverless-Authorization` para su propio check de invoker y no lo reenvía), y la app lo **re-verifica** en api mode; `X-Serverless-Authorization` queda sólo como fallback defensivo para el caso `invokerIamDisabled`. El token no puede contener `\r`/`\n` (`globe_sdk_auth_material_invalid`).

---

## 4. Qué significan los estados y los errores

### 4.1 Estados de coverage por superficie (`SurfaceCoverageState`)

| Estado | Significado | HTTP al despachar esa superficie |
|---|---|---|
| `available` | Implementada y ejecutable en esta superficie. | `200` (o el error de autoridad que aplique) |
| `policy-blocked` | Declarada pero **intencionalmente no ejecutable todavía** (o bloqueada por política). Es "reservada", no "inexistente". | `403 policy_blocked` |
| `not-applicable` | La capability no tiene sentido en esta superficie (ej. un command server-only en `ui`). | `404 not_found` |

`missing` no existe: una capability que omita una superficie no compila, y el harness rechaza cualquier coverage fuera de estos tres estados.

### 4.2 Errores canónicos (`GlobeApiErrorCode`) y su origen

El código interno de denegación **nunca** se filtra crudo; se mapea a un código canónico:

| Denegación interna | Origen | Código canónico | HTTP |
|---|---|---|---|
| `capability_not_found` | command/reader desconocido | `not_found` | 404 |
| `surface_not_applicable` | coverage `not-applicable` | `not_found` | 404 |
| `surface_policy_blocked` | coverage `policy-blocked` **o handler ausente bajo `available`** (falla cerrado) | `policy_blocked` | 403 |
| `capability_denied` | el principal no porta `requiredCapability` | `access_denied` | 403 |
| `TrustedContextError` (cualquier razón) | selección de workspace no bindeada / ambigua / sin workspace | `access_denied` | 403 |
| sobre malformado | parser de envelope | `invalid_request` | 400 |

`policy_blocked` vs `access_denied` vs `not_found`:

- `policy_blocked` (403): la capability **existe** pero esa superficie está reservada/bloqueada por política. Cambia con una promoción de coverage + handler (TASK-1457), no con más permisos del llamador.
- `access_denied` (403): la capability es ejecutable, pero **este** llamador no tiene el grant, o pidió un workspace al que no está bindeado. Una selección de workspace denegada **siempre** es `access_denied` — nunca una pista sobre qué workspaces existen.
- `not_found` (404): la capability no existe, o no aplica a esa superficie. No revela si "existe pero no la puedes ver".

### 4.3 `retryable`

En el spine, el body de error deriva `retryable` puramente de `status >= 500`:

- `retryable: false` → `access_denied`, `policy_blocked`, `not_found`, `invalid_request`, `conflict` (403/404/400/409). Reintentar no cambia el resultado; la acción real es otra (obtener el grant, esperar a TASK-1457, corregir el sobre).
- `retryable: true` → `dependency_unavailable` (503), `internal_error` (500). Un fallo transitorio o de dependencia; reintentar con backoff es razonable.

Discrepancia latente a tener presente: el spine calcula `retryable = status >= 500`, así que un `rate_limited` (429) llevaría `retryable: false` en el body, mientras que el fallback del SDK (cuando no hay body) trata 429 como retryable. El spine hoy **no** emite `rate_limited`, así que es un caso latente; documentado para quien introduzca rate limiting.

### 4.4 Denegación por selección de workspace no bindeada

`deriveTrustedContext` toma el `workspaceSelection` no confiable del llamador y solo **elige** entre los `workspaceBindings` del principal:

- selección presente pero fuera de bindings → `workspace_selection_not_bound`;
- sin selección y varios bindings → `workspace_ambiguous`;
- sin selección y cero bindings → `no_authorized_workspace`.

Las tres colapsan a `access_denied` (403, no retryable). La selección **nunca** amplía bindings; a lo sumo elige uno propio.

---

## 5. Cómo verificar (gate de cierre)

Node 24, TypeScript nativo (`node --test`), tsc `NodeNext` strict. Los dos gates canónicos deben quedar verdes:

```bash
cd /Users/jreye/Documents/efeonce-globe
pnpm check   # = pnpm typecheck && pnpm test  (recorre todos los paquetes/apps)
pnpm build   # tsc -p en cada paquete/app
```

`pnpm check` es end-to-end porque el `typecheck` de `studio-web` **construye** primero `contracts`, `domain` y `sdk` (sus `dist/*.js`), que es lo que importan los tests en runtime. Por eso un `pnpm test` "pelado" tras un checkout limpio puede fallar la resolución de `@efeonce-globe/domain`: corre `pnpm install` + `pnpm build` (o simplemente `pnpm check`) antes.

Tests focales del spine:

```bash
# Contexto de autoridad, transiciones de run, spoofing negativo
node --test packages/domain/src/index.test.ts

# Despacho, coverage policy-blocked, auditoría correlacionada, invalid_request
node --test apps/studio-web/src/dispatch.test.ts

# Paridad cross-surface (HTTP == SDK), harness manifest-driven
node --test apps/studio-web/src/conformance.test.ts
```

(Los tests importan los `dist/*.js` de los paquetes; construye primero, o usa `pnpm --filter @efeonce-globe/studio-web test` que corre tras el typecheck que ya los construyó.)

Evidencia que debes esperar:

- **Paridad**: HTTP y SDK alcanzan la **misma** primitive con `command`, `workspaceId` y `outcome` idénticos, y **una** entrada de auditoría por llamada, cada una con su `correlationId` (`corr-http`, `corr-sdk`).
- **No-spoofing**: `actorId`/`workspaceId` puestos en body o headers se **ignoran**; el `workspaceId` resuelto es `greenhouse-org:efeonce` y el `actorId` auditado es `globe:service:internal-caller`.
- **Workspace no bindeado** → `403 access_denied`, `retryable: false`.
- **Reservada** (`globe.run.prepare`) → `policy_blocked` (403), no `not_found`.
- **Manifest-driven**: el loop lee `sdk.capabilities()` y para cada command verifica `available → 200`, `policy-blocked → 403 policy_blocked`, `not-applicable → 404`. Si tu coverage miente, este test falla.

Lectura del manifiesto como chequeo rápido (`GET /v1/capabilities` o `sdk.capabilities()`): `globe.spine.echo` y `globe.spine.status` con `http`/`sdk` en `available`; `globe.run.prepare` con las superficies ejecutables en `policy-blocked`.

Al cerrar TASK-1457, además de los gates: correr el harness de conformance con el nuevo coverage promovido y confirmar que sigue verde (el descriptor real reemplaza al reservado y el loop lo ejercita automáticamente).

---

## 6. Qué NO hacer (los NUNCA)

- **NUNCA** llames a un SDK/endpoint de proveedor (Vertex, OpenAI, fal, etc.) directo desde un handler. Todo gasto/creatividad pasa por el port `CreativeProviderAdapter` de `@efeonce-globe/provider-contract`, que ejecuta el `creative-runner`. Un `import` de vendor dentro de un handler del registro es un defecto.
- **NUNCA** leas actor, workspace o capabilities desde el body o desde headers como **autoridad**. El sobre (`CommandRequestEnvelopeV1`) no tiene campo de actor; la autoridad la produce solo `deriveTrustedContext` (marcada `__globeTrusted`, no falsificable estructuralmente). Los tests prueban que `actorId`/`workspaceId` inyectados se ignoran.
- **NUNCA** crees un endpoint genérico que reciba JSON arbitrario y lo ejecute. Todo pasa por una capability **nombrada** con su descriptor, su coverage y el parseo estricto del sobre. Sin capability declarada, no hay despacho.
- **NUNCA** elimines ni promuevas `workspaceSelection` a campo confiable. Sigue siendo una selección no confiable validada contra los bindings del principal; a lo sumo elige uno de los propios, nunca agrega uno.
- **NUNCA** declares coverage `available` sin `handler`. El registro falla cerrado (`surface_policy_blocked`), pero además miente el manifiesto y el harness te reprobará.
- **NUNCA** introduzcas un estado de coverage `missing` ni un cuarto estado. Una superficie no lista es `policy-blocked` (reservada) o `not-applicable`.
- **NUNCA** filtres el motivo interno crudo (`DispatchDenialCode`, `TrustedContextDenialReason`) al cliente. Mapea siempre con `dispatchErrorToApiCode` / `trustedContextErrorToApiCode`.
- **NUNCA** hagas del body `correlationId` la fuente de la respuesta/auditoría. El header `x-globe-correlation-id` es el autoritativo (el SDK lo setea por ti).

---

## 7. Problemas comunes / troubleshooting

**`exactOptionalPropertyTypes` al construir sobres.** La base tsconfig activa `exactOptionalPropertyTypes: true`, así que `workspaceSelection: undefined` **no** es lo mismo que la propiedad ausente y no compila contra `workspaceSelection?: string`. Usa el spread condicional que ya usan `dispatch.ts` y el SDK:

```ts
const envelope: CommandRequestEnvelopeV1 = {
  schemaVersion: '1',
  apiVersion: GLOBE_API_VERSION,
  command,
  idempotencyKey,
  correlationId,
  ...(workspaceSelection !== undefined ? { workspaceSelection } : {}),
  payload,
};
```

Nunca `{ workspaceSelection: maybeUndefined }`.

**`@efeonce-globe/domain` no resuelve / falta `dist`.** Los paquetes exponen `exports: "./dist/index.js"`; los tests importan el build, no el fuente. Tras un checkout limpio o un cambio de deps: `pnpm install` y luego `pnpm build` (o `pnpm check`, cuyo `typecheck` construye contracts/domain/sdk antes de test). Un `pnpm test` aislado sobre paquetes sin construir falla con módulo no encontrado.

**Convención de extensiones en imports.** `module: NodeNext` + `verbatimModuleSyntax: true`:

- En los **paquetes** (`contracts`, `domain`, `sdk`) los imports relativos usan `.js` (extensión del archivo emitido). Ejemplo real: `packages/sdk/src/google-auth.ts` → `import type { GlobeAuthStrategy } from './index.js';`.
- En **`apps/studio-web`** (fuente **y** tests) los imports relativos usan `.ts`, porque su tsconfig activa `allowImportingTsExtensions` + `rewriteRelativeImportExtensions`. Ejemplo: `app.ts` → `import { ... } from './dispatch.ts';`; los tests → `from './index.ts'`, `from './app.ts'`.
- Los imports **cross-package** siempre por el nombre del paquete (`@efeonce-globe/contracts`), nunca por ruta relativa.
- Con `verbatimModuleSyntax`, importa tipos con `import type { ... }` (o `import { type X }`), o tsc falla.

**El SDK lanza `globe_sdk_idempotency_key_required`.** `dispatchCommand` **exige** `idempotencyKey` en el context (los readers no). Pásalo siempre para comandos.

**`globe_sdk_base_url_insecure` / `globe_origin_invalid`.** El `baseUrl` del cliente y los orígenes de config deben ser `https://` (o `localhost`/`127.0.0.1`/`::1`), sin `user:pass`, sin query, sin hash.

**`globe_sdk_<field>_invalid` (correlation/workspace/idempotency).** Esos valores deben matchear `^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$`. Un UUID o `corr-<uuid>` cumplen; espacios, `/`, `@` o strings vacíos no.

**Config de runtime en web vs api.** `readStudioRuntimeConfig` exige `GLOBE_ENVIRONMENT=internal_smoke` (si no, `globe_environment_not_internal_smoke`) y, en **web mode**, `GREENHOUSE_OAUTH_CLIENT_ID`/`_SECRET` válidos (si no, `globe_greenhouse_oauth_config_invalid`; el secret no puede tener `\r`/`\n`). Para probar despacho localmente sin el broker, **api mode** es lo más simple (no requiere OAuth) y resuelve al `internalServicePrincipal()` — pero desde el hardening de auth de api mode también exige **`GLOBE_API_EXPECTED_AUDIENCE`** (audience esperado del ID token, multi-valor) y **`GLOBE_API_CALLER_SERVICE_ACCOUNTS`** (allowlist de SAs). Ambos son **fail-closed**: si cualquiera queda vacío, `verifyWorkloadCaller` responde `403 access_denied` a **todos** los callers, aun con IAM válido. En tests se inyecta un `idTokenVerifier` doble.

**Sale `access_denied` en api mode al despachar la capability nueva.** `internalServicePrincipal()` hardcodea `capabilities: ['globe.studio.access']`. Hasta que el principal porte el `requiredCapability` del command (o TASK-1457 introduzca el mapeo por-identidad), el despacho responderá `403 access_denied` aunque el coverage esté en `available`.

**El correlation id de la respuesta no es el que puse en el body.** Es esperado: la respuesta y la auditoría usan el header `x-globe-correlation-id`. Setéalo (el SDK lo hace automáticamente y lo mantiene igual al del sobre).

---

## 7-bis. Model Lab — correr un experimento (TASK-1457)

El **Model Lab** es la primera capability de negocio montada sobre el spine: prueba una ruta de proveedor bajo
un cap de gasto duro, inputs privados y un manifest por intento. El **default** sigue siendo un proveedor fake
determinístico (cero red, cero gasto), pero los adapters reales existen y están verificados en vivo
(Vertex/Fal/composite, TASK-1486/1487/1488), igual que el refinamiento cross-model (TASK-1490).
Lo que queda pendiente NO es el código sino el **rollout del servicio desplegado**:
`globe-studio-internal` corre con `GLOBE_LAB_PROVIDER=fake` y sin `GLOBE_LAB_INPUT_BUCKET`. Estado vigente
siempre en `Handoff.md`, nunca en este párrafo.

**Habilitar (fail-closed por defecto):** el kill switch `GLOBE_LAB_ENABLED` default OFF → todo experiment command
responde `policy_blocked`. Para el piloto interno se prende con `GLOBE_LAB_ENABLED=true`; el cap diario por
workspace es `GLOBE_LAB_DAILY_CAP_CREDITS` (default 500). El caller interno (service principal en modo `api`)
ya tiene la capability `globe.lab.experiment.run`.

**Flujo (SDK):**

```ts
// 1. Preparar: valida capability, ruta de referencia, inputs autorizados (hash + rights) y cap duro.
const prepared = await client.prepareExperiment({
  capability: 'image-generate',
  referenceRoute: 'ref/still/v1',
  authorizedInputs: [{ inputId: 'in-1', sha256: 'sha256:…', mediaType: 'image', rights: 'test-fixture' }],
  hardCapCredits: 50,
  prompt: 'a calm horizon',
}, { idempotencyKey: 'idem-p', correlationId: 'corr-p' })

// 2. Ejecutar: estimate → chequeo de cap → fence.reserve → runner.run → settle. Emite manifest por intento.
const executed = await client.executeExperiment(prepared.outcome.experimentId, { idempotencyKey: 'idem-e' })
//    executed.outcome.state === 'candidate_ready' | 'failed'   (failed lleva failureReason)

// 3. Evidencia: los manifests por intento (ruta propuesta vs real, costo, hashes, lineage).
const evidence = await client.getExperimentEvidence(prepared.outcome.experimentId)
```

**Guardrails que verás en acción:** si el estimate supera `hardCapCredits` → `failed` con `run_cap_exceeded`
(aborta ANTES de gastar); si el workspace superó su cap diario → `day_cap_exceeded`; si el runner falla → se
libera la reserva y queda `failed`. `candidate_ready` es un candidato técnico, **no** una aprobación.

**Agregar una ruta de proveedor real:** implementá un `CreativeProviderAdapter` real
(Vertex/OpenAI/Fal según la política de soberanía), inyectalo en el `LabRunner` en lugar del `FakeReferenceAdapter`,
y prendé el flag sólo cuando existan credenciales WIF/ADC, bucket privado y budget alerts. El adapter real NUNCA
se llama desde script/CLI/UI/MCP — sólo por el runner detrás del command.

---

## 7-bis-2. Model Lab — refinar un candidato (generate → edit, TASK-1490)

Refinar un candidato **no es un command aparte**: un edit **es un experimento**, con la misma autoridad
(`globe.lab.experiment.run`), el mismo spend fence, la misma state machine y el mismo manifest. Lo único que
cambia en el payload de `prepare` es `editFrom`.

### Los env vars que hacen falta (y el que se olvida)

| Variable | Default | Qué hace |
|---|---|---|
| `GLOBE_LAB_ENABLED` | `false` | Kill switch fail-closed. En OFF, **todo** command y reader del Lab responde `policy_blocked`. Sin esto no corre nada, edit incluido. |
| `GLOBE_LAB_PROVIDER` | `fake` | `fake` \| `vertex` \| `fal` \| `composite`. El path `fake` es **storage-free a propósito**: no retiene nada, así que un edit por referencia sobre un candidato fake se rechaza de entrada en vez de medio funcionar. Para ejercitar edit real: `composite`. |
| **`GLOBE_LAB_INPUT_BUCKET`** | *(sin default)* | **El más importante de esta sección.** Es el bucket content-addressed que se lee **y** se escribe. **Sin esta variable no se construye el `OutputIngestPort`: no hay retención de outputs, cada intento registra `outputsRetained: false`, y TODO edit por referencia se rechaza en `prepare`.** No es un fallo raro: es la degradación honesta por diseño. Bucket real: `efeonce-globe-lab-evidence`. |
| `GLOBE_LAB_OMNI_EDITABLE` | `false` | Habilita el carril **stateful** de Omni (`store` + `previous_interaction_id`). **No es un switch gratis:** un generate editable debe correr en la superficie Gemini (un id keyless no es encadenable en ninguna parte), así que prenderlo **saca TODO generate de Omni del path keyless** y lo pasa a facturación por API key. Default OFF es seguro **porque** los outputs se retienen: el candidato sigue refinable por referencia igual. |

Reglas de flip que se derivan de lo anterior: `GLOBE_LAB_INPUT_BUCKET` va **en el mismo flip** que
`GLOBE_LAB_ENABLED=true` + `GLOBE_LAB_PROVIDER=composite` — prender el Lab con proveedor real y sin bucket deja el
edit por referencia muerto en `prepare`. Y la SA de runtime necesita **`storage.objectCreator`** sobre ese bucket
para que el ingest escriba (el canary corrió con ADC humana; verifica el grant antes del flip).

### Permisos

El caller interno (service principal en modo `api`) ya porta `globe.lab.experiment.run`; **no hay capability
nueva** que grantear para editar. Un edit cross-workspace no se resuelve por permisos: el padre se lee scopeado y
un id de otro workspace (o inexistente) es `capability_not_found` → `not_found`, sin revelar existencia.

### Flujo generate → edit (SDK)

```ts
// 1. Generate: el padre. Su candidato es lo que después se refina.
const parent = await client.prepareExperiment({
  capability: 'image-generate',
  referenceRoute: 'ref/still/v1',
  authorizedInputs: [],
  hardCapCredits: 50,
  prompt: 'a calm horizon',
}, { idempotencyKey: 'idem-gen', correlationId: 'corr-gen' })
const generated = await client.executeExperiment(parent.outcome.experimentId, { idempotencyKey: 'idem-gen-x' })
//    generated.outcome.state === 'candidate_ready'

// 2. Edit: `editFrom` es lo ÚNICO que nombra el padre. No se nombra paradigma, sesión ni modelo.
//    capability / referenceRoute / hardCapCredits se declaran DE NUEVO — eso es lo que habilita el
//    edit CROSS-MODEL (refinar un candidato de un motor con otro motor distinto).
const edit = await client.prepareExperiment({
  capability: 'image-edit',
  referenceRoute: 'ref/still/v1',
  authorizedInputs: [],
  hardCapCredits: 50,
  prompt: 'same horizon, at night',
  editFrom: { experimentId: parent.outcome.experimentId },
}, { idempotencyKey: 'idem-edit', correlationId: 'corr-edit' })
const edited = await client.executeExperiment(edit.outcome.experimentId, { idempotencyKey: 'idem-edit-x' })

// 3. Evidencia: el manifest declara qué mecanismo se usó y si el output quedó retenido.
const evidence = await client.getExperimentEvidence(edit.outcome.experimentId)
```

`previousInteractionId` queda **deprecado** (era vocabulario de un modelo en una superficie) y es **mutuamente
excluyente** con `editFrom`: mandar ambos es `invalid_request`, nunca se resuelve por precedencia.

### Qué se rechaza en `prepare` (antes de que el fence reserve)

Un edit imposible se rechaza **antes** de reservar crédito, nunca a mitad de un run pagado:

| Caso | Error |
|---|---|
| Padre desconocido o de otro workspace | `not_found` (sin revelar existencia) |
| Padre que no está en `candidate_ready` / sin intento candidato | `invalid_request` |
| Padre **sin ninguna afordancia**: ni output retenido ni ref encadenable | `invalid_request` |
| Media no editable como base (p. ej. una malla 3D) | `invalid_request` |
| Profundidad de cadena excedida (`MAX_EDIT_CHAIN_DEPTH` = 24) | `invalid_request` |
| `editFrom` malformado, o `editFrom` + `previousInteractionId` juntos | `invalid_request` |
| Set de referencias por encima del tope de la ruta | falla cerrado (`too_many_references`) — **nunca se trunca** |

### Cómo verificar

El manifest del intento es la evidencia; léelo con `getExperimentEvidence` y mira **cuatro campos**:

- `editMode` — `stateful` \| `reference`. Declara qué mecanismo se usó. Un cambio de paradigma es evidencia, **nunca silencioso**.
- `outputsRetained` — `true` sólo si el ingest persistió los bytes. **Si sale `false` en un run con proveedor real, falta `GLOBE_LAB_INPUT_BUCKET` o el grant `storage.objectCreator`.**
- `providerRunSurface` — dónde vive el ref (p. ej. `gemini-api`).
- `providerRunChainable` — si el **adapter** certificó ese ref como encadenable. El dominio lee este booleano y nunca aprende vocabulario de proveedor.

Suite: `pnpm check` (typecheck + test; construye `contracts`/`domain`/`sdk` antes). Los casos de `editFrom` viven
en `packages/domain/src/model-lab.test.ts`.

### Troubleshooting

**Todo edit por referencia sale `invalid_request` en `prepare`.** Lo primero a mirar es
`GLOBE_LAB_INPUT_BUCKET`: sin bucket no hay `OutputIngestPort`, los intentos previos quedaron con
`outputsRetained: false` y el padre no ofrece afordancia. Ojo: los candidatos generados **antes** de configurar el
bucket no se vuelven refinables retroactivamente — hay que regenerar el padre con la retención ya activa.

**Con `GLOBE_LAB_PROVIDER=fake` no puedo editar nada.** Es correcto: el path fake es deterministic y storage-free,
no retiene outputs. Para ejercitar edit real usa `composite`.

**El edit stateful degrada a `reference` sin que yo lo pida.** Es el comportamiento correcto cuando el proveedor
ejecutante **no** es el que emitió la sesión (un handle sólo significa algo para quien lo emitió). Si esperabas
stateful sobre el mismo proveedor, revisa `providerRunChainable` en el manifest del padre: si es `false`, el
adapter no certificó ese ref (p. ej. un id keyless de Vertex, que existe pero no es editable en ninguna superficie)
— para el carril stateful de Omni hace falta `GLOBE_LAB_OMNI_EDITABLE=true`, con el costo keyless que implica.
Un `providerRunSurface=gemini-api` junto a `chainable=false` es incoherente y fue un defecto real: no lo aceptes.

**`provider_incomplete` vs `provider_failed`.** No son lo mismo y piden respuestas opuestas: `provider_incomplete`
= el request fue aceptado y el modelo declinó o fue filtrado → **reformula el brief**; `provider_failed` = el
request fue rechazado → **arregla el request**. Confundirlos manda a buscar un bug de payload que no existe.

---

## 7-ter. Evaluation Harness — evaluar un golden brief (TASK-1458)

El **Evaluation Harness** (SPEC-003, `EFEONCE_GLOBE_EVALUATION_HARNESS_V1.md`) es la segunda capability de negocio
(`globe.lab.evaluation.run`): **consume** el Model Lab para volver un intento en evidencia repetible y comparable
**por contrato de fidelidad**. No reimplementa nada del Lab — corre el brief por `runModelLabExperiment`.

**Correr una evaluación:** por SDK, `client.evaluateGoldenBrief({ fixtureId, rubricId })` (es un command → lleva
`idempotencyKey`). El fixture y la rúbrica deben ser del **mismo contrato de fidelidad** (si no → `invalid_request`);
un fixture/rúbrica inexistente → `not_found`. Depende del kill switch del Lab: con `GLOBE_LAB_ENABLED` OFF, la eval
falla cerrado (el experimento no corre).

**Fixtures y rúbricas** (dato versionado): `client.listGoldenBriefs()`. Hoy hay tres golden briefs —
`rrss-key-visual-still` (image/`flexible-style`), `product-motion-loop` (video/`flexible-style`),
`glitch-microphone-foley` (audio/`audio-foley`) — todos con derechos declarados (`license`/`consent`/`permittedUse`).
Agregar un brief o un contrato de fidelidad es **dato**, no toca el motor.

**Leer un report:** `client.getEvaluationReport(reportId)` — scopeado al workspace del caller (cross-workspace →
`not_found`). El report es **versionado** (`fixtureVersion` + `rubricVersion`) y separa dos cosas:
`objectiveResults` (checks automáticos deterministas sobre el manifest: output presente, dentro del cap, lineage de
inputs intacto, ruta estable, outcome candidato) de `humanCriteria` (preguntas de oficio, **nunca auto-respondidas**).

**El verdict NUNCA es un "passed" creativo:** sólo `objective_fail` (algún check objetivo falló) u
`objective_pass_pending_human` (checks objetivos OK → **pendiente de revisión humana obligatoria**). El harness no
declara un modelo globalmente mejor. Cada report declara sus **limitaciones** (proveedor fake → sólo técnico; muestra
única → no significativa). El mismo fixture+rúbrica sobre el fake determinístico es **reproducible**.

**Agregar una ruta real:** igual que el Lab — cuando el `LabRunner` use un `CreativeProviderAdapter` real, los reports
dejan de declarar la limitación "proveedor fake" y miden fidelidad real; el juicio de los `humanCriteria` sigue siendo
humano (la surface `ui` está `policy-blocked` hasta que exista el flujo de revisión).

---

## 8. Referencias técnicas

Código fuente (SoT del contrato mientras no exista un ADR dedicado):

- `packages/contracts/src/index.ts` — vocabulario, sobres, resultados, errores, superficies y estados de coverage.
- `packages/domain/src/index.ts` — `CapabilityRegistry`, `deriveTrustedContext`, mapeo de errores, fixtures del spine (`createGlobeSpineRegistry`).
- `apps/studio-web/src/dispatch.ts` — parseo de sobres, `runDispatch`, sink de auditoría, `buildCoverageManifest`.
- `apps/studio-web/src/app.ts` — endpoints `/v1/*`, `resolveDispatchPrincipal` (planos web/api), `internalServicePrincipal`, respuestas canónicas.
- `apps/studio-web/src/main.ts` — servidor Node HTTP que envuelve `createStudioApp` (`node dist/main.js`, `PORT` default 8080).
- `packages/sdk/src/index.ts` — `GlobeClient`, `createCallbackAuth`, `GlobeSdkError`, mapeo de status → código.
- `packages/provider-contract/src/index.ts` — `CreativeProviderAdapter` (el port que un handler debe usar, no un vendor SDK).
- `apps/creative-runner/src/main.ts` — bootstrap del runner (Cloud Run Job) que ejecuta los adapters.

Tests como ejemplos de uso:

- `apps/studio-web/src/conformance.test.ts` — paridad cross-surface + harness manifest-driven.
- `apps/studio-web/src/dispatch.test.ts` — despacho, coverage, denegaciones, auditoría.
- `packages/domain/src/index.test.ts` — `deriveTrustedContext`, spoofing negativo, transiciones de run.

Arquitectura y gates:

- `docs/architecture/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md` — **spec técnica canónica del spine** (SPEC-001 en `DECISIONS_INDEX.md`): modelo trusted context vs untrusted payload, coverage, dispatch, conformance, contrato de extensión, invariantes duros y scoring 4-pilar. Es el documento al que este runbook sirve de manual operativo.
- `docs/documentation/efeonce-globe-api-contract-spine.md` — explicación funcional en lenguaje simple (para producto/operación).
- `docs/architecture/PLATFORM_FOUNDATION_V1.md` — contexto de sistema y contenedores de Globe.
- `docs/operations/EPIC_028_PARALLEL_EXECUTION_PLAN_V1.md` — TASK-1481 (contract spine) y **Lab execution gate** / **Production promotion gate**: qué debe estar listo antes de la primera llamada facturable a proveedor (TASK-1457) y antes de promover una ruta a Producción.
- `docs/operations/TASK_1454_INTERNAL_SMOKE_RUNBOOK.md` — runbook hermano de los planos de identidad (WIF, callback OAuth humano, posturas de rollback).
