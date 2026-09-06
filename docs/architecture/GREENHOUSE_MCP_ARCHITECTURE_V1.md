# Greenhouse MCP Architecture V1

> **Tipo de documento:** Spec de arquitectura
> **Version:** 1.2
> **Creado:** 2026-04-25
> **Ultima actualizacion:** 2026-05-01
> **Scope:** MCP server oficial de Greenhouse para agentes y LLMs
> **Docs relacionados:** `GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`, `GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`, `GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md`, `GREENHOUSE_SISTER_PLATFORM_BINDINGS_RUNTIME_V1.md`, `GREENHOUSE_OPS_REGISTRY_ARCHITECTURE_V1.md`, `TASK-040`, `TASK-616`

---

## 1. Objetivo

Formalizar la arquitectura canónica del **MCP server** de Greenhouse como adapter downstream de la `API platform`.

La idea central es esta:

> Greenhouse no debe construir MCP como un acceso directo y desordenado al codebase, a SQL o a rutas ad hoc. Debe construirlo como un server montado sobre contratos API estables, tenancy-safe y observables.

El MCP debe servir para:

- agentes internos controlados
- operator consoles de plataformas hermanas
- copilots y LLMs compatibles con MCP
- futuros flujos de automatización grounded sobre contratos canónicos

---

## 2. Posición canónica

El MCP de Greenhouse es un **server**.

No es:

- una colección informal de scripts
- acceso directo a tablas
- acceso directo a helpers del repo sin contrato
- un bypass de la `API platform`

Sí es:

- un runtime oficial que expone tools, resources y prompts para agentes
- un adapter downstream de `api/platform/*`
- una superficie machine-to-machine con reglas de auth, tenancy, observabilidad y write safety

En términos prácticos:

- `API platform` define el contrato HTTP base
- `MCP server` traduce ese contrato a primitives útiles para agentes

---

## 3. Secuencia correcta

La secuencia canónica de Greenhouse es:

1. resource adapters
2. `api/platform/*`
3. webhooks / event delivery convergidos
4. MCP server downstream

Regla dura:

> MCP no debe adelantarse a una API estable.

`TASK-040` y `TASK-616` ya dejan fijada esa secuencia.

---

## 4. Qué problema resuelve

Sin un MCP server formal, Greenhouse corre estos riesgos:

- tools acopladas a rutas legacy o helpers internos
- agentes que saltan tenancy safety
- surface inconsistente entre HTTP API y MCP
- writes sin idempotencia ni auditoría
- duplicación de lógica entre API y agent tooling

El MCP existe para evitar eso y exponer una capa de agent tooling gobernada.

---

## 5. Principios rectores

### 5.1 API-first

Toda tool MCP debe montarse sobre `api/platform/*` o sobre adapters shared equivalentes, no sobre rutas ad hoc del portal.

### 5.2 Read-first

La primera generación del MCP debe ser predominantemente read-only.

### 5.3 Tenant safety is mandatory

Ninguna tool MCP debe resolver tenancy por heurística, labels visibles o nombres comerciales.

### 5.4 Write safety

Los writes via MCP deben ser:

- explícitos
- auditables
- idempotentes
- scope-aware

### 5.5 No hidden superpowers

Una tool MCP no debe tener más alcance del que tendría un consumer autorizado de la platform API correspondiente.

### 5.6 Observability by default

Toda operación MCP debe dejar trazabilidad suficiente para soporte y auditoría.

---

## 6. Modelo de capas

### 6.1 Platform API

Fuente de verdad contractual para resources y commands.

### 6.2 MCP mapping layer

Capa que mapea:

- resources HTTP
- command endpoints
- webhook/event views cuando aplique

hacia:

- tools
- resources
- prompts

### 6.3 MCP server runtime

Proceso/server que expone el protocolo MCP a los clientes compatibles.

### 6.4 Agent clients

Claude, Codex, operator consoles y otros LLMs/agents que consumen el MCP server.

---

## 7. Superficies MCP

El MCP server de Greenhouse puede exponer tres familias:

### 7.1 Tools

Acciones invocables por agentes.

Ejemplos futuros:

- buscar organizaciones
- leer integration readiness
- listar capabilities por tenant
- consultar bindings
- ejecutar commands write-safe autorizados

### 7.2 Resources

Lecturas direccionables o documentos de contexto para agentes.

Ejemplos futuros:

- contexto de tenant
- detalles de organización
- estado operativo de integraciones
- artifacts derivados del `Ops Registry`

### 7.3 Prompts

Prompts o plantillas de interacción oficiales cuando el caso lo justifique.

No son obligatorios en V1.

---

## 8. Scope inicial recomendado

El primer MCP de Greenhouse debe ser deliberadamente pequeño.

### 8.1 V1 read-only base

Montado sobre:

- `GET /api/platform/ecosystem/context`
- `GET /api/platform/ecosystem/organizations`
- `GET /api/platform/ecosystem/organizations/:id`
- `GET /api/platform/ecosystem/capabilities`
- `GET /api/platform/ecosystem/integration-readiness`
- `GET /api/platform/ecosystem/health`
- `GET /api/platform/ecosystem/event-types`
- `GET /api/platform/ecosystem/webhook-subscriptions`
- `GET /api/platform/ecosystem/webhook-subscriptions/:id`
- `GET /api/platform/ecosystem/webhook-deliveries`
- `GET /api/platform/ecosystem/webhook-deliveries/:id`

### 8.2 Resources iniciales

- `context`
- `organization`
- `capabilities`
- `integration-readiness`
- `platform-health`
- `event-control-plane` (read-only)

### 8.3 Tools iniciales

- `get_context`
- `list_organizations`
- `get_organization`
- `list_capabilities`
- `get_integration_readiness`
- `get_platform_health`
- `list_event_types`
- `list_webhook_subscriptions`
- `get_webhook_subscription`
- `list_webhook_deliveries`
- `get_webhook_delivery`

Estos nombres son ilustrativos; el contrato final puede refinarse.

Regla vigente del runtime:

- `health` y event control plane pueden exponerse por MCP mientras se mantengan read-only.
- `create/update subscription` y `retry delivery` no entran al mismo corte solo por existir en HTTP; necesitan una historia explícita de write safety, idempotencia y auditoría para MCP.

---

## 9. Qué no debe hacer el primer MCP

- no leer SQL directo como fuente primaria
- no montar writes amplios desde el día 1
- no duplicar lógica de negocio que ya vive en `api-platform`
- no exponer tools que salten bindings o tenancy
- no mezclar en la misma iteración:
  - foundation REST
  - webhook convergence
  - MCP writes complejos

---

## 10. Autenticación y autorización

El MCP server no debe inventar un auth model paralelo si puede reutilizar el de la plataforma.

### 10.1 Regla base

El MCP debe autenticarse contra Greenhouse usando consumers y scopes compatibles con la `API platform`.

### 10.2 Scope

Toda operación MCP debe ejecutarse dentro de un scope resuelto:

- `organization`
- `client`
- `space`
- `internal`

### 10.3 Binding-aware resolution

Cuando el caller venga desde ecosystem o sister-platform context, el MCP debe respetar bindings activos y allowlists de scope.

El binding externo de persona/organización (identidad de cliente, `TASK-1631`, 2026-09-04) se resuelve por
`GET /api/platform/ecosystem/identity/binding` con `(environment, subject)` y devuelve memberships, grants y
`grantsVersion` (resource `src/lib/api-platform/resources/ecosystem-identity-binding.ts`, reader
`resolveExternalAccess` en `src/lib/identity/external-access/**`). Ese lane lo autoriza el binding sister-platform
`internal` del gateway (`efeonce-mcp-gateway`); cualquier otro binding recibe `404` anti-oráculo. El gateway compara
`grantsVersion` por igualdad contra el claim `gv` del token (`TASK-1831`) (actualizado 2026-09-04, TASK-1631).

### 10.4 Internal MCP

Si existe una surface interna de MCP para operadores o agentes del propio equipo, debe seguir usando auth controlada y trazable; nunca acceso implícito total.

---

## 11. Write policy

El MCP write plane debe ser minimalista y explícito.

### 11.1 Regla

Todo write vía MCP debe mapear a un command endpoint canónico o a un command handler equivalente ya gobernado.

### 11.2 Requisitos

- `Idempotency-Key`
- auditoría
- actor principal identificable
- scope resuelto
- error taxonomy machine-readable

### 11.3 Patrones permitidos

- commands explícitos
- cambios parciales bien modelados
- operaciones operativas con rollback o retry razonable

### 11.4 Patrones no permitidos

- writes genéricos sin command semantics
- edición libre de cualquier campo por conveniencia del agente
- bypass de aprobaciones, governance o policy checks

---

## 12. Observabilidad

El MCP server debe ser observable como parte de la platform API, no como runtime opaco.

### 12.1 Mínimos por operación

- request/tool invocation ID
- actor o consumer principal
- scope resuelto
- tool o resource invocado
- outcome
- duration
- backend provenance
- degraded flag cuando aplique

### 12.2 Relación con platform logs

Cuando una operación MCP delegue en `api/platform/*`, debe ser posible correlacionar la invocación MCP con los logs y request IDs del carril HTTP subyacente.

---

## 13. Relación con webhooks y event delivery

El MCP no reemplaza webhooks ni event delivery.

La relación correcta es:

- REST / command API
  - consultar y accionar
- webhooks / event delivery
  - reaccionar a cambios
- MCP
  - exponer esas capacidades a agentes de forma usable

Si más adelante se exponen tools sobre deliveries o subscriptions, deben montarse sobre el control plane convergido de webhooks, no sobre tablas directas.

---

## 14. Relación con skills de agentes

El MCP server y los skills de agentes son complementarios, pero no son la misma cosa.

### 14.1 Distinción canónica

- `MCP server`
  - expone capacidades ejecutables
  - tools
  - resources
  - prompts
- `Skills`
  - enseñan a los agentes cómo usar esas capacidades correctamente
  - entregan workflow
  - guardrails
  - nomenclatura
  - criterios de decisión

En términos simples:

- `MCP` responde **qué puede hacer** un agente en Greenhouse
- `skills` responden **cómo debería hacerlo**

### 14.2 Qué debería vivir en MCP

El MCP debería exponer:

- tools para consultar o ejecutar commands permitidos
- resources para leer contexto estructurado
- prompts oficiales cuando un flujo lo justifique

Ejemplos:

- leer contexto de tenant
- listar organizaciones
- consultar readiness
- operar `Ops Registry`
- ejecutar commands write-safe autorizados

### 14.3 Qué debería vivir en skills

Los skills deberían enseñar:

- cómo elegir la tool correcta
- en qué orden invocar tools
- cómo interpretar outputs
- qué guardrails aplicar antes de escribir
- cómo respetar nomenclatura y policies de Greenhouse
- cuándo escalar, cuándo pedir confirmación y cuándo no

Ejemplos:

- skill de operador comercial Greenhouse
- skill de `Ops Registry`
- skill de administración interna
- skill de integraciones/sister-platforms

### 14.4 Regla de diseño

Greenhouse no debe meter dentro del MCP behavior que en realidad pertenece a skills.

Eso significa:

- no codificar en el server toda la estrategia conversacional del agente
- no convertir prompts de comportamiento en lógica de tool
- no duplicar guardrails tanto en MCP como en skills sin necesidad

La separación correcta es:

- MCP = capability layer
- skills = behavior layer

### 14.5 Integración recomendada

La relación correcta entre ambos es esta:

1. la `API platform` expone contratos HTTP estables
2. el `MCP server` expone esos contratos como tools/resources/prompts
3. los `skills` enseñan a los agentes cómo usar ese MCP de forma correcta y segura

### 14.6 Implicación operativa

Si Greenhouse quiere que agentes externos o internos “sepan manipular Greenhouse” de forma confiable, no basta con publicar tools MCP.

También necesita:

- skills especializados
- nomenclatura compartida
- playbooks por dominio
- reglas de write safety

### 14.7 Regla canónica nueva

MCP y skills deben diseñarse juntos, pero mantenerse separados:

- el MCP no reemplaza a los skills
- los skills no reemplazan al MCP
- el comportamiento correcto de agentes Greenhouse requiere ambos

---

## 15. Ubicación técnica objetivo

La ubicación objetivo del runtime MCP debería ser algo como:

- `src/mcp/greenhouse/**`

o, si el dominio queda separado por capability:

- `src/mcp/api-platform/**`
- `src/mcp/ops-registry/**`

La regla importante no es el nombre exacto de la carpeta, sino esta:

> el MCP debe tener un runtime propio y explícito; no vivir desperdigado entre helpers de dominio sin boundary claro.

---

## 16. Roadmap recomendado

### Fase 1 — Read MCP

- montar MCP read-only sobre `api/platform/ecosystem/*`
- resources y tools mínimos
- sin writes

### Fase 2 — Control plane convergence

- exponer surfaces maduras de webhooks/event delivery como resources o tools
- unificar observabilidad y auth

### Fase 3 — Write-safe MCP

- commands explícitos
- idempotencia
- auditoría
- scopes duros

### Fase 4 — Domain expansion

- `Ops Registry`
- domain tools maduras
- adapters más ricos para operator workflows

---

## 17. Cierre de diseño pendiente ya resuelto

Para que el MCP de Greenhouse no quede como “server con tools sueltas”, esta spec deja resueltas las decisiones operativas que faltaban.

### 17.1 Tool taxonomy canónica

La taxonomía oficial queda así:

- `tool`
  - acción invocable, bounded y con input explícito
- `resource`
  - lectura direccionable, estable y reusable por agentes
- `prompt`
  - plantilla oficial opcional para flujos repetibles

Reglas:

- una query parametrizada frecuente puede ser `tool`, no `resource`
- un documento o contexto estable debe ser `resource`
- el MCP no debe esconder comandos complejos detrás de `prompt`

### 17.2 Tamaño correcto de tools

Las tools deben quedar en un punto medio:

- no tan granulares que obliguen al agente a encadenar veinte llamadas triviales
- no tan amplias que mezclen lectura, decisión y mutación en una sola operación opaca

Patrón recomendado:

- una tool por intención operativa clara
- inputs pequeños y explícitos
- outputs estructurados y previsibles

### 17.3 Trust boundaries y prompt injection

El MCP debe tratar todo contenido libre proveniente del dominio como dato no confiable para fines de control.

Eso implica:

- separar claramente metadata estructurada de texto libre
- no usar contenido libre de usuarios o terceros para cambiar scopes, tool routing o permisos
- etiquetar, cuando haga falta, qué partes del payload son:
  - `trusted-system-data`
  - `untrusted-user-content`

Regla:

- un agent workflow no debe escalar privilegios ni cambiar comportamiento crítico por instrucciones embebidas en contenido de negocio

### 17.4 Write classes y confirmación humana

Las mutaciones vía MCP deben clasificarse en tres clases:

- `read-only`
  - sin confirmación
- `write-safe`
  - permitidas si el scope, auth y command contract lo autorizan
- `high-impact`
  - requieren confirmación humana o policy gate adicional

Ejemplos de `high-impact`:

- desactivar bindings
- rotar secretos
- suspender consumers
- borrar artifacts operativos

### 17.5 Rate limits y cuotas

El MCP debe heredar o complementar la disciplina de rate limits de la platform API.

Mínimos esperados:

- cuota por actor o consumer
- cuota por tenant/scope cuando aplique
- límites especiales por tool sensible o costosa
- trazabilidad de rechazos por saturación

### 17.6 Audit trail canónico

Toda operación MCP debe poder reconstruirse después.

Mínimos:

- actor principal
- scope resuelto
- tool/resource invocado
- inputs relevantes redaccionados cuando contengan secretos
- request IDs correlacionados con `api/platform/*`
- resultado final

### 17.7 Skills strategy base

Greenhouse debería planificar al menos dos capas de skills:

- `platform/operator skills`
  - enseñan a usar `context`, `organizations`, `capabilities`, `readiness`, `webhook control plane`
- `domain skills`
  - enseñan workflows de dominios concretos como `Ops Registry`, comercial o integraciones

Regla:

- un skill no debe duplicar el contrato MCP
- un skill sí debe explicar cuándo usar cada tool, en qué orden y con qué guardrails

### 17.8 Regla canónica nueva

El éxito del MCP no se medirá solo por “tener server”, sino por cumplir seis disciplinas simultáneas:

- taxonomy clara
- tools ergonómicas
- trust boundaries
- write classes
- quotas
- audit trail

---

## 18. Reglas canónicas nuevas

Desde 2026-04-25 Greenhouse debe operar con estas reglas para MCP:

1. MCP se documenta en arquitectura propia; no solo como nota lateral dentro de la API platform.
2. MCP es un **server** oficial, no una colección ad hoc de tools sueltas.
3. Toda capability MCP nueva debe montarse sobre la `API platform` o sobre adapters shared equivalentes.
4. MCP es read-only por defecto.
5. Los writes vía MCP requieren command semantics, idempotencia y auditoría.
6. MCP no debe preceder a la estabilización de `api/platform/*`.
7. Skills y MCP deben diseñarse en conjunto, pero como capas separadas: capability layer vs behavior layer.

---

## 19. Delta 2026-04-25 — Nace la arquitectura canónica de MCP

Se crea `GREENHOUSE_MCP_ARCHITECTURE_V1.md` para formalizar el MCP de Greenhouse como server downstream de la platform API.

Decisiones explícitas:

- el objetivo MCP ya no debe tratarse como un “algún día agregamos tools”
- MCP queda formalizado como una capability con runtime propio
- su orden correcto sigue siendo downstream de REST + event delivery convergidos
- el primer scope recomendado sigue siendo read-only sobre `api/platform/ecosystem/*`

## 20. Delta 2026-04-25 — MCP y skills quedan formalizados como capas complementarias

Se explicita que Greenhouse no debe tratar los skills como sustituto de MCP ni MCP como sustituto de skills.

La separación correcta queda así:

- `MCP server` = capability layer
- `skills` = behavior layer

Esto deja base para que agentes externos o internos puedan manipular Greenhouse con tools reales y además con workflow, guardrails y nomenclatura correctos.

## 21. Delta 2026-05-01 — Remote Gateway V1 privado

`TASK-741` agrega el gateway remoto oficial para el MCP read-only de Greenhouse:

- URL canónica: `GET/POST/DELETE /api/mcp/greenhouse`
- transporte oficial: `WebStandardStreamableHTTPServerTransport` del SDK MCP
- modo V1: `stateless` y `enableJsonResponse`, apto para App Router/Vercel sin estado de sesión en memoria
- auth V1: privado service-to-service con `Authorization: Bearer <GREENHOUSE_MCP_REMOTE_GATEWAY_TOKEN>`
- downstream: el gateway usa el consumer/scope server-side `GREENHOUSE_MCP_*` y sigue llamando solo `api/platform/ecosystem/*`

Reglas nuevas:

- el gateway remoto no redefine tools ni schemas; reutiliza `createGreenhouseMcpServer()`
- `pnpm mcp:greenhouse` sigue siendo el transporte local `stdio`
- `TASK-659` sigue siendo la dueña de OAuth, hosted auth multiusuario, refresh/revocation y user-delegated scopes
- si falta `GREENHOUSE_MCP_REMOTE_GATEWAY_TOKEN`, el endpoint remoto queda deshabilitado
- el body máximo del gateway remoto se controla con `GREENHOUSE_MCP_REMOTE_MAX_BODY_BYTES` para evitar payloads no acotados

## 22. Delta 2026-08-31 — El inventario de tools es un manifiesto (TASK-1780)

Hasta acá el catálogo de tools existía dos veces: los `registerTool` de `src/mcp/greenhouse/server.ts`
y una copia a mano en el repo del gateway. Ninguna estaba declarada dueña, y el resultado medible fue
que el espejo se editó a mano dos veces en dos semanas mientras el servidor se anunciaba
`greenhouse-read-only` registrando **siete** tools que escriben, cuatro de ellas comprometiendo gasto
del proveedor.

**Fuente única.** `src/mcp/greenhouse/tool-manifest.ts` declara las 43 tools con dos banderas
**ortogonales** —`writes` y `spendsProviderBudget`—. Fusionarlas en un solo `readOnly` es el error que
este delta cierra: hoy todo lo que gasta también escribe, pero una tool futura podría comprar datos sin
mutar estado propio y el cliente MCP necesita saberlo igual.

**Consumidores.** (1) `server.ts` registra **recorriendo el manifiesto**: una tool definida sin entrada,
o una entrada sin definición, hace fallar la construcción del servidor nombrándola. (2) El `name` y las
`instructions` se **derivan** del manifiesto, así que el cartel no puede volver a contradecir lo que el
servidor hace. (3) El guard de paridad del gateway, vía artefacto generado.

**Cómo viaja al gateway.** `pnpm mcp:manifest:generate` emite
`src/mcp/greenhouse/tool-manifest.generated.json` —manifiesto ⨝ `inputKeys` obtenidos por
**introspección** del servidor real, más `manifestHash`—; el gateway lo trae con
`pnpm greenhouse:manifest:sync`. Es una copia, pero **generada**: el hash se verifica en los dos lados y
`pnpm mcp:manifest:check` (gate en `ci.yml`) falla si el artefacto committeado difiere del registro vivo.
La restricción que decidió la forma: el CI del gateway **no debe depender de un deployment vivo** para un
gate de merge, lo que descartó publicar el inventario por HTTP.

**Frontera intacta.** El manifiesto **no tiene campo de federación**: Greenhouse declara qué EXISTE, el
gateway sigue decidiendo qué CRUZA con revisión humana por tool. Y como el gateway federa resolviendo
contra rutas HTTP del lane, una capacidad puede estar federada **sin existir** como tool interna: ese caso
se declara (`GREENHOUSE_GATEWAY_NATIVE_TOOLS`), nunca queda ausente en silencio. Caso vivo:
`get_seo_provider_spend`.

## 23. Delta 2026-09-02 — El manual de uso viaja por el protocolo (TASK-1804)

§14 fijó la separación: MCP = capability layer, skills = behavior layer. Lo que faltaba era un
**canal** para que la capa de comportamiento llegara al consumidor MCP sin pagar contexto en cada
request. Hasta acá todo lo que un agente sabía sobre cómo operar las 43 tools cabía en las
`instructions` del handshake (viajan en cada request) o se metía dentro de la `description` de una
tool (caso vivo: el contrato del `proposalRef` dentro de `get_seo_competitor_candidates`), y
`.claude/skills/**` no es publicable.

**Manifiesto de manuales.** `src/mcp/greenhouse/skill-manifest.ts` declara los manuales (`name`,
`audience`, `sourcePath`, `appliesTo` validado contra el manifiesto de tools). Es puro; el reader
canónico `skill-catalog.ts` construye el catálogo desde `docs/mcp/skills/**`, toma `name` +
`description` del frontmatter de cada `SKILL.md` (formato Agent Skills / SEP-2640, para no
reescribir el día que el SDK implemente `skills/list`) y **falla la construcción del servidor** ante
cualquier drift manifiesto↔filesystem, en las dos direcciones. Publicar es un acto explícito.

**Un primitive, tres consumidores.** La tool `get_greenhouse_skill` (domain `platform`, lectura
pura; sin `name` devuelve el catálogo, con `name` el manual como TEXTO), el recurso
`skill://efeonce/<name>/SKILL.md` y la lane `GET /api/platform/ecosystem/mcp/skills[/{name}]`. La
tool y el recurso del MCP interno piden el cuerpo a la lane —el servidor sigue siendo downstream
de `api/platform/ecosystem/*`— y el gateway federado (`efeonce-mcp`, provider `greenhouse-skills`)
también delega en la lane: cero contenido embebido, byte-idéntico en todos.

**Gating por binding, anti-oráculo.** `audience: internal` sólo para bindings de scope `internal`;
para cualquier otro, el manual no aparece en el catálogo y su detalle es `404` (nunca `403`).
`audience: client` queda reservado hasta que existan tokens que porten grants emitidos (el grant por organización
y persona ya existe vía `TASK-1631`, 2026-09-04; el token lo emiten `TASK-1831`/`TASK-1832`) (actualizado 2026-09-04, TASK-1631).
Ningún manual publica contenido interno: lo
controla un test de fuga sobre `docs/mcp/skills/**`, no una revisión.

**Las `instructions` rutean en vez de contener.** `buildGreenhouseMcpServerIdentity` recibe
también el manifiesto de manuales: el párrafo de gasto conserva la afirmación y la enumeración
derivada de las tools que comprometen presupuesto, pero el procedimiento vive en
`seo-spend-discipline` y sólo se rutea a él si ese manual gobierna a TODAS las que gastan (la
derivación es real: sin la tool en el inventario o con un gastador sin cobertura, el texto inline
se conserva).

**Federación.** `get_greenhouse_skill` viaja en el artefacto (44 tools) y el gateway la deriva
igual que las SEO. Como el guard de paridad está anclado al dominio SEO, el gateway gana
`EXPECTED_GREENHOUSE_PLATFORM_TOOLS` + `computeFederatedNonSeoToolFindings`: toda tool no-SEO de
Greenhouse que el gateway registre se declara con razón, y toda declarada está registrada, existe
en el manifiesto, lleva `annotations` coherentes, no diverge en schema y deriva su descripción.
Las 15 tools de plataforma fuera del alcance federado siguen siendo una decisión de frontera, no
drift.

**Runtime.** Los manuales viajan en el bundle como artefacto generado
(`src/mcp/greenhouse/skill-catalog.generated.json`, `pnpm mcp:skills:generate` / `pnpm mcp:skills:check`
en `local:check` y CI), no como filesystem input: la primera versión usó `outputFileTracingIncludes` y
Vercel rechazó el build (la ruta dejó de agruparse y la función sola pesó 397 MB). El runtime re-verifica
hashes y manifiesto al cargar. El smoke compara la cuenta EXACTA del catálogo. Sin flag (aditivo,
lectura pura), sin Entra (scope base), sin persistencia.

Invariantes operativos: `agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md` §8.

## 24. Delta 2026-09-06 — TASK-1837: tools delegadas de Efeonce ID en el gateway (PR #3, mergeado)

§10.3 dejó al gateway resolviendo el binding de una persona externa por `(environment, subject)`. TASK-1837
agrega, sobre esa misma forma, la **autoridad delegada** del administrador designado del cliente: la lane
`GET|POST /api/platform/ecosystem/identity/invitations` (consumer `internal` del gateway; flag
`EXTERNAL_INVITATION_DELEGATED_AUTHORITY_ENABLED` OFF ⇒ `404` anti-oráculo) y su federación en `efeonce-mcp`,
que entró por el **PR #3** (<https://github.com/efeoncepro/efeonce-mcp/pull/3>), **mergeado a `main` como
`65ae1d5`** una vez que el scope viajó a `main` de Greenhouse (release `b3e324cb5c8d`) y los dos flags quedaron
`true` en Production. Con el flag delegado apagado las tools responden `policy_blocked`; con él prendido, quien no
es administrador designado recibe `forbidden`.

- **Son tools PROPIAS del gateway, no federadas desde el manifiesto de Greenhouse.** §22 dejó
  `src/mcp/greenhouse/tool-manifest.ts` como fuente única de lo que EXISTE adentro; estas dos no están ahí porque
  no existen como tool interna: el provider `greenhouse-identity` resuelve contra la ruta HTTP del lane, igual que
  `get_seo_provider_spend`. La frontera se sostiene: el manifiesto sigue sin campo de federación y el gateway sigue
  decidiendo qué cruza. Consecuencia medida: la superficie del servidor construido pasó de **37 a 39 tools** con el
  `manifestHash` de Greenhouse IDÉNTICO — el punto ciego que cerró el gate de superficie del PR #4 (ver
  `agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md` §9). Versión del gateway: **`1.1.0`** (aditivo).
- **Tools:** `identity.invitations.list` (lectura; scope base `efeonce.mcp.read`) e `identity.invitation.create`
  (escritura; scope `efeonce.mcp.identity.write`, challenge `403 insufficient_scope` con el scope;
  `scopes_supported` lo anuncia sólo con el provider ecosystem prendido — ver la asimetría medida entre la lista
  cualificada y la del emisor nativo en el runbook, §`Deploy del gateway`). Provider
  `src/providers/greenhouse-identity.ts` del gateway: adapter sobre la lane con la misma config/consumer que el
  provider SEO.
- **Scope:** `efeonce.mcp.identity.write` es una clase de blast-radius propia («administrar a las personas de mi
  organización»), declarada en paridad en `src/lib/auth-server/oauth/scopes.ts` de Greenhouse
  (`EFEONCE_MCP_WRITE_SCOPES`: consentimiento explícito + step-up; nunca en el mínimo publicado). El scope dice si
  el cliente puede pedir esa clase de acción; la autoridad real la decide Greenhouse por la membership
  `designatedAdmin` (`resolveDelegatedAuthority`). Un scope por clase, nunca por capability (§18).
- **Policy:** sólo issuer nativo (`auth.efeonce.org`) y población `native-external`; el gateway manda
  `environment` + `subject` del token nativo y resuelve la **`organizationId` por membership** de la persona (la
  lane acepta `organizationId` o `bindingId`, exactamente uno; ambos ⇒ deben coincidir). Descarta cualquier campo
  `token` que pudiera venir del upstream y traduce errores sólo por clase: 404 ⇒ `policy_blocked`, 403 ⇒
  `forbidden`, 400/409/422 ⇒ `invalid_request`, 429 ⇒ `rate_limited`, 5xx ⇒ `upstream_unavailable`.
- **Lo que existe en Greenhouse pero NO está federado todavía:** los verbos delegados de reenviar (= rotar) y
  revocar — `POST /api/platform/ecosystem/identity/invitations/[invitationId]/{resend,revoke}` (command harness +
  `Idempotency-Key`; routeKeys `platform.ecosystem.identity.invitations.{resend,revoke}`;
  `resendDelegatedExternalInvitation` / `revokeDelegatedExternalInvitation`, nunca a sí mismo). Su federación es
  follow-up del PR #3 o de `TASK-1838` (consola del administrador del cliente, que consume los mismos commands).
- **Verificación:** la lane se ejercitó en staging con el token del consumer `efeonce-mcp-gateway-greenhouse-token`
  (lista propia 200, binding ajeno 403, auto-elevación 422, invitación delegada 201 con correo real); desde el
  gateway, con el JWT de la persona, se repite tras el merge. Evidencia:
  `docs/audits/2026-09-06-task-1837-external-invitation-delivery-evidence.md`. Invariantes:
  `agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md` §TASK-1837.
