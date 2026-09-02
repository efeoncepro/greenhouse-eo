# Radar del protocolo — estado a 2026-09-02

> **Esta página caduca.** Es la única de la skill que se lee con fecha en la mano. Antes de tomar
> una decisión cara sobre el protocolo, **verifica**: `https://modelcontextprotocol.io/sitemap.xml`
> y luego la página con sufijo `.md`. Si esta página y el spec discrepan, **gana el spec** y esta
> página se corrige en el mismo trabajo.
>
> Disparador de revisión: cualquier revisión nueva del protocolo, o cada 3 meses, lo que ocurra
> primero. Última verificación directa contra la fuente: **2026-09-02**.

## La revisión vigente rompió el modelo mental de 2025

La revisión **`2026-07-28` es Current** (verificado en `/specification/versioning`;
`LATEST_PROTOCOL_VERSION = "2026-07-28"` en el schema). No refinó MCP: lo rehízo.

| Ya no existe | Qué hay en su lugar |
|---|---|
| `initialize` / handshake | Protocolo **stateless**. Cada request declara `io.modelcontextprotocol/protocolVersion` y `clientCapabilities` en `_meta`; en HTTP va también el header `MCP-Protocol-Version` |
| Sesiones (`Mcp-Session-Id`) | **Handles** acuñados por el servidor y pasados como argumento ordinario. El spec trae una sección *Stateful Tools* enseñándolo |
| Peticiones iniciadas por el servidor | **MRTR**: el servidor devuelve `InputRequiredResult` con `inputRequests` + `requestState` opaco, y el **cliente reintenta** con `inputResponses` y un id JSON-RPC **nuevo** |
| `resources/subscribe`, `ping`, `logging/setLevel` | RPC único `subscriptions/listen` con opt-in por tipo |
| Resumibilidad SSE (`Last-Event-ID`) | Extensión **Tasks** (`tasks/get` por polling) |

Además: **`server/discover` es un RPC obligatorio**; todo resultado lleva `resultType`
(`complete` \| `input_required`); el caché es obligatorio (`ttlMs` + `cacheScope`) en los `*/list`;
y los códigos de error se renumeraron (`-32020..-32099` reservados para MCP).

## 🔴 Pero el spec va ADELANTE de todos los clientes

No se localizó ningún cliente que declare `2026-07-28`. La consecuencia para un autor de servidor
es grande y contraintuitiva:

**Estar en el carril handshake HOY no es deuda: es lo correcto.** Lo que sí hay que hacer es
**declarar en qué era estás parado a propósito** (el spec formaliza un modelo Modern / Legacy /
Dual con matriz de compatibilidad normativa), y no confundir "el spec lo permite" con "algún
cliente lo hace".

⚠️ *Esa afirmación es de AUSENCIA sobre todo el mercado.* Se comprobó que la página de MCP de VS
Code no declara versión de protocolo. No se auditó cliente por cliente. Trátala como probable, no
como hecho, y si la decisión depende de ella, verifica el cliente concreto que te importa.

## Deprecados, con reloj

Registro oficial en `/specification/2026-07-28/deprecated`. Retiro más temprano de los cuatro
primeros: **primera revisión publicada en o después de 2027-07-28**.

| Deprecado | Camino de migración |
|---|---|
| **Roots** | Directorios o archivos por parámetro de tool, URI de recurso o configuración |
| **Sampling** | Integrarse directo con la API del proveedor LLM |
| **Logging** | `stderr` en stdio; **OpenTelemetry** para observabilidad |
| **Dynamic Client Registration (RFC 7591)** | **Client ID Metadata Documents (CIMD)** |
| `includeContext: thisServer/allServers` | Omitir el campo o `"none"` |
| Transporte HTTP+SSE | Streamable HTTP |

Uno de los criterios de deprecación es literalmente *"adopción despreciable frente a su costo de
mantenimiento"*. **MCP ahora tiene maquinaria para matar letra muerta, y la usó.**

## Qué está vivo, qué es letra muerta

- **Elicitation SOBREVIVIÓ y se extendió** (modos form y URL) — es la primitiva de cliente mejor
  soportada. Contraintuitivo: mucha gente apuesta lo contrario.
- **`completion/complete` es la letra muerta real**: sin clientes con soporte documentado, y
  nadie lo ha deprecado.
- **Resources existen en todas partes, pero cerca de la mitad de los frameworks grandes no exponen
  un `resources/read` que el MODELO pueda llamar.** Son fiables como contexto adjuntado por el
  host, no como algo que el modelo tire.
- `resource_link` (devolver una referencia en vez del payload) está en el spec y es **raro** en la
  práctica: es un diferenciador, no una norma.

## Cosas del spec que casi nadie aplica y te van a morder

- **Los nombres de tool son únicos POR SERVIDOR.** El spec dice que los agregadores y proxies
  **SHOULD** desambiguar, típicamente prefijando, y que `serverInfo.name` **no** sirve para eso.
  Si construyes un gateway que federa, el prefijo es tuyo y es obligación, no estilo.
- **`tools/list` MUST NOT variar por conexión**, pero **MAY** variar por la **autorización** de la
  request. Filtrar la superficie por scope está explícitamente bendecido; filtrarla por estado de
  conexión, no.
- **Orden determinístico SHOULD**, y la razón es el cache de prompt del cliente.
- **`isError: true` es para lo que el modelo puede corregir** (validación de input, errores de
  negocio, fallos de API). El error JSON-RPC es para lo que no (tool desconocida, request
  malformada). El spec le dice al cliente que los errores de protocolo **puede** ocultárselos al
  modelo: mandar por ahí algo corregible es condenar al agente a no poder arreglarlo.
- **`x-mcp-header`**: propiedades del `inputSchema` que se espejan a headers `Mcp-Param-*` para que
  intermediarios ruteen sin parsear el cuerpo. ⚠️ **NUNCA** marcar así parámetros sensibles.

## Extensiones y ecosistema

- **MCP Apps** (`io.modelcontextprotocol/ui`, SEP-1865, Final) es la extensión con adopción real.
- **Skills sobre MCP (SEP-2640)**: **PR abierto, no mergeado** (creado 2026-04-23, movido
  2026-08-29). El wire format se reescribió dos veces en 2026, y los consumidores conocidos
  **toman snapshot al instalar; ninguno lee el manual en runtime**.
  🔴 **Recomendación:** escribe el CONTENIDO en el formato estable de Agent Skills (frontmatter
  `name` + `description`) y sirve el manual por una tool + un recurso. Implementar los métodos
  `skills/*` te ata a un formato en movimiento. Un URI `skill://` detrás de una tool ordinaria
  **no** es SEP-2640 — el discriminador es si implementas `skills/*`.
  Y **no prometas** "actualizo el manual y los agentes lo recogen": hoy ningún cliente lo hace.
- **El registro oficial** es sólo metadata, está en preview, versiones inmutables + un `status`
  mutable, y **no soporta servidores privados**.
- **La matriz oficial de soporte por cliente MURIÓ** (archivada, delistada). Lo que la reemplazó
  cubre tres extensiones, no las primitivas núcleo. **Determinar qué soporta un cliente es hoy un
  ejercicio manual por vendor.** SEP-1814 propone reconstruirla y está sin sponsor.
- **La negociación de capacidades NO expresa aquello en lo que los clientes difieren**, y el
  atajo de la comunidad —ramificar por `clientInfo`— está explícitamente desaconsejado por el
  spec. Es una contradicción abierta, no un problema resuelto.
