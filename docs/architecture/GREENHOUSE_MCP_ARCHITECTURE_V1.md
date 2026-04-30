# Greenhouse MCP Architecture V1

> **Tipo de documento:** Spec de arquitectura
> **Version:** 1.1
> **Creado:** 2026-04-25
> **Ultima actualizacion:** 2026-04-30
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
