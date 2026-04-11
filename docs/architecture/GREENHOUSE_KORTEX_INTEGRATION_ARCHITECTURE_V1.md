# Greenhouse -> Kortex Integration Architecture V1

> **Tipo de documento:** Anexo de arquitectura sobre sister-platform contract
> **Version:** 1.0
> **Creado:** 2026-04-11
> **Ultima actualizacion:** 2026-04-11
> **Contrato marco:** `GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md`
> **Docs relacionados:** `GREENHOUSE_REPO_ECOSYSTEM_V1.md`, `GREENHOUSE_KORTEX_VISUAL_PRESET_V1.md`, `GREENHOUSE_SISTER_PLATFORM_BINDINGS_RUNTIME_V1.md`, `TASK-039`, `TASK-040`

---

## Delta 2026-04-11 — Primer bridge Kortex ya tiene policy ejecutable Greenhouse-side

- `TASK-377` ya baja este anexo a una policy operativa concreta.
- Decisión de primera ola:
  - el primer consumer Kortex vive en `operator console / server-side services`
  - el bridge sigue siendo `read-only`
  - el control plane inicial se apoya en `context`, `catalog/capabilities` y `readiness`
  - el payload operativo inicial prioriza:
    - `delivery / ICO`
    - `project health`
    - `organization / space summaries`
  - `sprints` entra como capa secundaria
  - `assigned team / capacity` entra como resumen posterior, no como payload estrella inicial
- Guardrail nuevo:
  - para esta lane, `TASK-039` se usa como visión de producto
  - la baseline técnica vigente es `TASK-040`
- Nota de realidad:
  - `docs/architecture/schema-snapshot-baseline.sql` todavía no incluye las tablas sister-platform nuevas
  - la fuente viva del runtime actual es:
    - `TASK-375`
    - `TASK-376`
    - migraciones
    - `src/types/db.d.ts`

## Estado de implementación actual

La foundation reusable para Kortex ya existe del lado Greenhouse desde `TASK-375` y `TASK-376`:

- tabla `greenhouse_core.sister_platform_bindings`
- tabla `greenhouse_core.sister_platform_consumers`
- tabla `greenhouse_core.sister_platform_request_logs`
- soporte de `sister_platform_key = 'kortex'`
- lifecycle `draft`, `active`, `suspended`, `deprecated`
- soporte de scopes `organization`, `client`, `space` e `internal`
- lectura administrativa en `/admin/integrations`
- lane read-only endurecido en `/api/integrations/v1/sister-platforms/*`

Esto no significa que el bridge Kortex esté completo. Significa que ya existe el contrato persistente y resoluble sobre el cual `TASK-376` y `TASK-377` pueden apoyarse sin inventar mappings ad hoc.

---

## 1. Objetivo

Formalizar como `Kortex` debe integrarse **con** Greenhouse sin convertirse en modulo del portal ni arrastrar a Greenhouse dentro de su runtime.

La idea central es:

> Kortex consume contexto operativo de Greenhouse para enriquecer CRM intelligence, agent reasoning y operator workflows, pero Greenhouse no hospeda ni absorbe el producto Kortex.

---

## 2. Rol de Kortex dentro del ecosistema

Segun la documentacion operativa ya existente del ecosistema:

- Greenhouse es el portal y la capa de experiencia Greenhouse
- Kortex es una plataforma separada para:
  - agent orchestration
  - HubSpot runtime
  - CRM intelligence
  - deployment control plane
  - connector health y lifecycle operacional

Por lo tanto:

- Kortex no es una capability interna de Greenhouse
- Greenhouse no es el backend transaccional de Kortex
- la relacion correcta es `peer system + operational intelligence bridge`

---

## 3. Ownership split

### 3.1 Greenhouse owns

- client portal UX Greenhouse
- Agency / HR / Finance / People / Admin
- team capacity y assigned team signals
- delivery / ICO / operational health del servicio
- tenant context del portal
- contracts API y readers de la operacion Greenhouse

### 3.2 Kortex owns

- HubSpot OAuth installation lifecycle
- HubSpot runtime and deployment state
- CRM audit, strategy, implementation and governance flows
- operator console de Kortex
- Kortex agent orchestration
- Kortex transactional state y BigQuery analytics propios

### 3.3 Shared institutional layer

Kortex si puede heredar desde Greenhouse:

- visual preset institucional
- copy shared institucional cuando la capa verbal quede formalizada
- patrones shell compatibles

Kortex no hereda:

- navegacion Greenhouse
- nomenclatura de modulos Greenhouse
- assets o labels product-specific del portal

---

## 4. Que problema resuelve esta integracion

Kortex necesita una forma confiable de responder preguntas como:

- la operacion creativa del cliente esta sana o tensionada
- hay capacidad y delivery health para sostener un upsell o una recomendacion CRM
- el portfolio operativo del cliente esta listo para una iniciativa nueva
- que talking points operativos deben acompanar una QBR o una recomendacion de CRM

Esas respuestas no deben inferirse desde HubSpot ni desde heuristicas propias de Kortex si la truth operativa ya vive en Greenhouse.

---

## 5. Patrón de integracion recomendado

### 5.1 Principio

Greenhouse debe actuar para Kortex como:

- provider de contexto operativo
- provider de señales delivery/capacity/assigned-team
- provider read-only para agentes y operator console

Kortex debe actuar frente a Greenhouse como:

- consumer read-only de ese contexto
- producer de recomendaciones CRM y lifecycle insights
- owner de sus propias mutaciones y runtime HubSpot

### 5.2 Carriles recomendados

| Carril | Rol en Kortex | Rol en Greenhouse |
| --- | --- | --- |
| Visual preset | Consumer | Institutional contract owner actual |
| Copy shared | Consumer futuro | Contract source cuando cierre `TASK-265` |
| Read API | Consumer server-to-server | Provider |
| MCP read-only | Agent consumer | Provider downstream de la API |
| Deep links | Consumer y source segun flow | Consumer y source segun flow |
| Analytical exchange | Consumer/producer opcional | Consumer/producer opcional |

---

## 6. Runtime boundary

### 6.1 Decisión

Kortex y Greenhouse no deben compartir por defecto:

- proyecto GCP
- Cloud SQL
- Secret Manager
- service accounts runtime

### 6.2 Consecuencia

La integracion Kortex -> Greenhouse debe hacerse por contratos de red, auth e identidad, no por acceso lateral a internals.

### 6.3 Excepcion no aprobada por defecto

No se aprueba por defecto:

- que Kortex lea directamente Postgres de Greenhouse
- que Greenhouse resuelva instalaciones HubSpot desde la DB de Kortex

---

## 7. Identity and tenancy mapping for Kortex

### 7.1 Principio

Kortex no debe inferir a que tenant de Greenhouse corresponde un portal HubSpot desde nombres visibles o coincidencia comercial.

### 7.2 IDs Greenhouse relevantes

- `clientId`
- `organizationId`
- `spaceId`
- `tenantType`

### 7.3 IDs Kortex relevantes

Segun el data model actual de Kortex:

- `client_id`
- `portal_id`
- `hubspot_portal_id`
- `installation_id` o install state equivalente

### 7.4 Binding minimo Kortex -> Greenhouse

La integracion durable debe poder resolver, como minimo:

- que `client_id` de Kortex corresponde a que `organizationId` o `clientId` de Greenhouse
- si el bridge es organization-level o space-level
- que `portal_id` / `hubspot_portal_id` de Kortex consume contexto de que scope Greenhouse
- quien aprobo ese binding
- estado del binding: `draft`, `active`, `suspended`, `deprecated`

### 7.5 Regla de scope

No toda lectura de Kortex debe ser space-level.

Se admiten tres niveles:

- `client` / `organization` scope
- `space` scope
- `internal multi-tenant` scope para Efeonce interno

Kortex no debe asumir uno solo de esos niveles para todos los casos.

---

## 8. Read surfaces que Kortex deberia consumir

### 8.1 Prioridad 1 — Greenhouse read API

Primera surface recomendada para Kortex:

- API read-only de Greenhouse
- auth explicita
- tenancy explicita
- response shapes estables

Casos de uso:

- scorecards operativos
- context panel del operator console
- preflight para recomendaciones CRM

### 8.2 Prioridad 2 — Greenhouse MCP

Segunda surface recomendada:

- MCP read-only para Kortex agents
- montado sobre la read API, no sobre BigQuery directo ni queries ad hoc

Casos de uso:

- CRM Advisor
- QBR talking points
- contextual enrichment de strategy chat

### 8.3 Prioridad 3 — Analytical exchange

Solo cuando haga falta:

- benchmark cross-platform
- joins historicos
- reporting analitico

No como sustituto del contrato transaccional o de lectura operativa.

---

## 9. Greenhouse-side capabilities relevantes para Kortex

### 9.1 Ya formalizadas o encaminadas

- visual preset reusable:
  - `GREENHOUSE_KORTEX_VISUAL_PRESET_V1.md`
- copy/shared verbal contract:
  - `TASK-265`
- data node / API / MCP:
  - `TASK-039`
  - `TASK-040`

### 9.2 Contexto operativo de alto valor para Kortex

Greenhouse deberia poder exponer a Kortex, de forma progresiva:

- KPIs agregados de la operacion creativa
- proyectos activos y su health resumida
- estado de sprints/ciclos
- assigned team portfolio cliente-safe
- capacidad y salud resumida del equipo asignado
- alertas de continuidad o riesgo cuando existan contracts maduros

### 9.3 Regla

Kortex no debe inventar estas señales en su propio runtime cuando Greenhouse ya sea source of truth de ellas.

---

## 10. Allowed and disallowed actions

### 10.1 Allowed

Kortex puede:

- leer contexto operativo de Greenhouse
- usarlo para recomendaciones y analisis
- mostrarlo en su operator console o agent outputs
- enlazar al portal Greenhouse para handoff humano

### 10.2 Disallowed by default

Kortex no puede por defecto:

- mutar datos Greenhouse
- activar flows Greenhouse como si fuera actor interno del portal
- asumir permisos multi-tenant sin surface interna explicita
- hacer scraping de UI o lecturas indirectas cuando existe o debe existir contrato API

### 10.3 Future writes

Si en el futuro se habilitan writes Kortex -> Greenhouse:

- deben vivir en API explicita
- deben quedar auditadas
- deben tener approval model humano o service-level governance

---

## 11. Deep links and operator handoff

### 11.1 Permitido

Deep links entre Kortex y Greenhouse si:

- la plataforma destino mantiene ownership de la UX
- el contexto se pasa por IDs estables

### 11.2 Casos recomendados

- desde Kortex hacia una cuenta, organizacion o space en Greenhouse
- desde Greenhouse hacia Kortex connectors / audit / lifecycle surfaces

### 11.3 Regla

Deep linking es handoff, no embedding.

---

## 12. Security and governance

### 12.1 Auth models esperados

Kortex debe consumir Greenhouse por dos vias:

- auth server-to-server para operator console y services
- auth read-only tipo MCP/API key para agentes, cuando aplique

### 12.2 Tenant safety

Un portal HubSpot o `portal_id` de Kortex nunca debe abrir lecturas Greenhouse fuera del binding explicitamente aprobado.

### 12.3 Auditability

Greenhouse debe poder registrar:

- que consumer de Kortex leyo
- que tenant o scope pidio
- que surface uso
- cuando lo hizo

---

## 13. Fases recomendadas

### Fase 0 — Contrato

- contrato marco de sister platforms
- anexo Kortex
- visual preset
- copy contract en backlog

### Fase 1 — Identity and binding

- binding explicito entre tenancy Greenhouse y tenancy Kortex
- governance del bridge

### Fase 2 — Read API

- read surface estable para sister platforms
- auth y logging institucional

### Fase 3 — MCP

- MCP read-only sobre la read API
- onboarding de agentes Kortex

### Fase 4 — Deep links and analytics

- deep links operativos
- analytical exchange selectivo

---

## 14. Non-goals

- convertir a Kortex en modulo de Greenhouse
- compartir DB o secretos entre ambos
- copiar componentes de producto Greenhouse a Kortex
- acoplar el roadmap de Kortex al shell Greenhouse

---

## 15. Decision resumida

1. Kortex es sister platform activa del ecosistema.
2. Greenhouse y Kortex se integran como peer systems.
3. Greenhouse provee operational intelligence; Kortex la consume.
4. La primera integracion debe ser read-only.
5. Todo bridge Kortex -> Greenhouse requiere tenancy binding explicito.
6. El visual preset compartido no convierte a Kortex en extension del portal.

---

## 16. Primer consumer profile

### 16.1 Primera ola aprobada

El primer consumer Kortex aprobado para este bridge es:

- `operator console`
- servicios server-to-server que preparan contexto para esa consola

Quedan fuera de esta primera ola:

- agentes MCP
- chat contextual directo
- consumers multi-tenant internos sin scope explicito

### 16.2 Auth model

El consumer inicial debe usar:

- `greenhouse_core.sister_platform_consumers`
- `consumer_type = 'sister_platform'`
- credencial dedicada por consumer
- request logging y rate limiting del lane endurecido

No se aprueba para esta ola:

- reutilizar el token generico de integrations
- leer Greenhouse con credenciales de usuario final
- bypassar el lane endurecido desde BigQuery o PostgreSQL

### 16.3 Binding model recomendado

El binding inicial recomendado para Kortex es:

- `external_scope_type = 'portal'`
- `external_scope_id = <hubspot_portal_id o portal_id canonico de Kortex>`

Y como metadata complementaria, cuando aplique:

- `installation_id`
- `client_id` de Kortex
- IDs auxiliares de workspace/control plane

Rationale:

- el `portal` representa mejor la identidad CRM estable del cliente
- evita acoplar el bridge al lifecycle de instalación puntual
- permite conservar `installation_id` como metadata u objeto aguas afuera sin volverlo la raíz del binding

### 16.4 Greenhouse scope allowlist inicial

La allowlist inicial recomendada para el consumer Kortex es:

- `client`
- `space`

`organization` queda permitida solo por excepción explícita cuando el caso de uso real necesita consolidación cross-space del mismo account object.

`internal` no entra en la primera ola.

### 16.5 Observabilidad mínima

Todo consumer Kortex debe dejar visible:

- `consumer_name`
- `allowed_greenhouse_scope_types`
- `last_used_at`
- `binding_status`
- `last_verified_at`
- `route_key`
- `response_status`

---

## 17. Primer capability intake

### 17.1 Control plane obligatorio

Antes de cualquier payload de negocio, Kortex debe consumir:

1. `GET /api/integrations/v1/sister-platforms/context`
2. `GET /api/integrations/v1/sister-platforms/catalog/capabilities`
3. `GET /api/integrations/v1/sister-platforms/readiness`

Estas rutas no son el producto del bridge; son el guardrail operativo del bridge.

### 17.2 Payload inicial recomendado

La primera ola de contexto operativo que Greenhouse debe priorizar para Kortex es:

1. `delivery / ICO scorecard`
   - OTD
   - RpA
   - FTR
   - cycle time
   - throughput
   - stuck assets
   - trust / quality posture cuando exista shape estable
2. `project health summary`
   - proyectos activos
   - carga de revisión
   - progreso y presión operativa
   - rollup por `space` o `organization` según binding
3. `organization / space operational summary`
   - contexto ejecutivo resumido para operator console y CRM recommendation preflight

### 17.3 Payload secundario aprobado

Después del payload inicial, puede entrar:

- estado de sprints/ciclos
- sprint activo
- historia corta de ciclos

`burndown` y drilldowns profundos no son requisito de la primera ola.

### 17.4 Payload posterior

La siguiente capa aprobable, pero no prioritaria, es:

- resumen `assigned team`
- resumen de `capacity coverage`
- team health resumida

La regla aquí es conservar el bridge en modo:

- `summary-first`
- `client-safe`
- `read-only`

### 17.5 Payload diferido

Se difiere fuera de esta task:

- `Revenue Enabled` como payload central
- narrativa advisory dependiente de heurísticas on-read
- writes Kortex -> Greenhouse
- MCP read-only
- embeddings visuales o UX cross-app

---

## 18. Split de implementación

### 18.1 Greenhouse-side

Greenhouse debe implementar y gobernar:

- binding canónico
- consumer auth
- request logging
- read lane endurecido
- payloads operativos estables que reusen serving y readers ya maduros

Follow-ons Greenhouse-side naturales:

1. declarar el primer consumer Kortex real en runtime
2. sembrar bindings activos para tenants piloto
3. abrir payloads read-only específicos sobre el lane sister-platform reutilizando:
   - `delivery / ICO`
   - `project health`
   - `organization / space summary`
   - `sprint summary`

### 18.2 Kortex-side

Kortex debe implementar y gobernar:

- almacenamiento/configuración de su consumer credential
- resolución de `portal_id` / `hubspot_portal_id` que alimenta el binding
- operator console composition
- CRM reasoning y recomendaciones
- deep links y handoff UX hacia Greenhouse

No pertenece a Greenhouse:

- renderizar la experiencia Kortex
- mutaciones de HubSpot runtime
- analytics o state transaccional propios de Kortex

---

## 19. Secuencia bilateral recomendada

1. Greenhouse declara consumer + bindings piloto.
2. Kortex valida `context` y `readiness`.
3. Greenhouse expone el primer payload `delivery / ICO + project health`.
4. Kortex lo consume en operator console como contexto read-only.
5. Greenhouse agrega `sprint summary`.
6. Greenhouse evalúa `assigned team / capacity summary` solo cuando el shape sister-platform-safe esté realmente estable.

---

## 20. Criterio de cierre para TASK-377

`TASK-377` queda correctamente cerrada cuando:

- existe consumer profile inicial de Kortex
- queda priorizado el capability intake por madurez real
- queda explícito el split Greenhouse-side vs Kortex-side
- el handoff multi-repo puede abrir follow-ons sin rediseñar el contrato base
