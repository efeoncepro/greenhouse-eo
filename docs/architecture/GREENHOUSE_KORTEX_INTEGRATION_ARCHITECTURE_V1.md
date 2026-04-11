# Greenhouse -> Kortex Integration Architecture V1

> **Tipo de documento:** Anexo de arquitectura sobre sister-platform contract
> **Version:** 1.0
> **Creado:** 2026-04-11
> **Ultima actualizacion:** 2026-04-11
> **Contrato marco:** `GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md`
> **Docs relacionados:** `GREENHOUSE_REPO_ECOSYSTEM_V1.md`, `GREENHOUSE_KORTEX_VISUAL_PRESET_V1.md`, `GREENHOUSE_SISTER_PLATFORM_BINDINGS_RUNTIME_V1.md`, `TASK-039`

---

## Estado de implementación actual

La foundation reusable para Kortex ya existe del lado Greenhouse desde `TASK-375`:

- tabla `greenhouse_core.sister_platform_bindings`
- soporte de `sister_platform_key = 'kortex'`
- lifecycle `draft`, `active`, `suspended`, `deprecated`
- soporte de scopes `organization`, `client`, `space` e `internal`
- lectura administrativa en `/admin/integrations`

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
