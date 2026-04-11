# Greenhouse Sister Platforms Integration Contract V1

> **Tipo de documento:** Spec de arquitectura
> **Version:** 1.0
> **Creado:** 2026-04-11
> **Ultima actualizacion:** 2026-04-11
> **Scope:** Greenhouse y plataformas hermanas del ecosistema Efeonce
> **Docs relacionados:** `GREENHOUSE_ARCHITECTURE_V1.md`, `GREENHOUSE_REPO_ECOSYSTEM_V1.md`, `GREENHOUSE_KORTEX_VISUAL_PRESET_V1.md`, `TASK-265`, `TASK-039`

---

## Estado de implementación actual

Desde `TASK-375`, este contrato ya tiene una primera bajada runtime en Greenhouse:

- tabla `greenhouse_core.sister_platform_bindings`
- secuencia `greenhouse_core.seq_sister_platform_binding_public_id`
- helper reusable `src/lib/sister-platforms/bindings.ts`
- rutas admin `/api/admin/integrations/sister-platform-bindings*`
- visibilidad mínima en `/admin/integrations`

La foundation implementada cubre:

- scopes `organization`, `client`, `space` e `internal`
- lifecycle `draft`, `active`, `suspended`, `deprecated`
- resolución explícita `external scope -> greenhouse scope`
- publicación de eventos outbox para consumers posteriores

---

## 1. Objetivo

Formalizar el contrato canónico con el que `greenhouse-eo` debe integrarse con plataformas hermanas del ecosistema Efeonce.

Este documento existe para evitar tres errores recurrentes:

- tratar una app hermana como si fuera un modulo interno de Greenhouse
- asumir que dos plataformas del mismo ecosistema deben compartir runtime, base de datos o secretos
- mezclar branding institucional reusable con UX, navegacion o ownership funcional de producto

La regla central es esta:

> Las plataformas hermanas de Greenhouse se integran como **peer systems** del mismo ecosistema, no como features embebidas por defecto.

---

## 2. Alcance

Aplica a:

- plataformas hermanas ya activas, por ejemplo `Kortex`
- plataformas futuras del mismo ecosistema, por ejemplo `Verk`
- cualquier app o control plane que necesite:
  - consumir contexto operativo de Greenhouse
  - compartir identidad institucional
  - intercambiar señales analiticas, eventos o enlaces profundos

No aplica a:

- integraciones third-party externas como `Notion`, `HubSpot`, `Frame.io` o `Nubox`
- packages internos compartidos de bajo nivel sin surface de producto propia
- shells demo o upstreams de framework como Vuexy

---

## 3. Definiciones

### 3.1 Sister platform

Plataforma del ecosistema Efeonce con:

- repo propio
- roadmap propio
- runtime y despliegue propios o aspiracion explicita a tenerlos
- ownership funcional propio

### 3.2 Peer system

Relacion entre dos plataformas que:

- no comparten runtime por defecto
- no comparten base de datos por defecto
- no comparten secretos por defecto
- se integran mediante contratos explicitos

### 3.3 Institutional layer

Capa compartible entre plataformas del ecosistema:

- preset visual institucional
- copy shared institucional
- iconografia institucional
- patrones shell compatibles

No incluye:

- navegacion Greenhouse
- nomenclatura de producto Greenhouse
- modulos funcionales del portal

### 3.4 Operational intelligence provider

Plataforma que expone señales operativas o analiticas para que otra plataforma las consuma sin apropiarse de su ownership funcional.

En el contexto actual:

- Greenhouse puede actuar como provider de contexto operativo cliente-facing o internal-facing
- una sister platform puede consumir ese contexto para enriquecer decisiones, recomendaciones o analisis

### 3.5 Action boundary

Limite explicito entre:

- leer contexto de otra plataforma
- sugerir una accion basada en ese contexto
- ejecutar una mutacion real en la otra plataforma

La lectura puede ser cross-platform; la mutacion no.

---

## 4. Principios rectores

### 4.1 Peer-by-default

Greenhouse y cualquier sister platform del ecosistema deben tratarse como sistemas pares.

### 4.2 Runtime isolation first

La decision por defecto es separar:

- Cloud Run / Vercel / workers
- Cloud SQL / PostgreSQL
- Secret Manager
- service accounts
- observabilidad y alertas

### 4.3 Shared institutional layer, not shared product

Es valido compartir:

- look and feel institucional
- copy reusable
- conventions de shell

No es valido compartir por defecto:

- rutas
- layouts de producto
- logica de negocio
- taxonomias funcionales

### 4.4 Read before write

La primera integracion entre plataformas debe privilegiar:

- lectura
- contexto
- enrichment
- recomendaciones

Las mutaciones cross-platform requieren API explicita, ownership claro y reglas de aprobacion.

### 4.5 Explicit tenancy or nothing

Ninguna sister platform debe inferir tenancy o scope desde labels, nombres comerciales o heuristicas de UI.

Todo acceso cross-platform debe apoyarse en IDs estables y bindings explicitos.

### 4.6 Tenant safety is a hard rule

No cross-contamination entre tenants, clientes, organizaciones, spaces ni portales externos.

### 4.7 Versioned contracts

Todo contrato de integracion entre plataformas debe poder versionarse y evolucionar sin romper consumers de forma silenciosa.

---

## 5. Boundary model

### 5.1 Permitido por defecto

| Carril | Permitido | Nota |
| --- | --- | --- |
| Read API | Si | Server-to-server, tenant-safe |
| MCP read-only | Si | Para agentes y copilots |
| Deep links | Si | Con ownership visual local de cada app |
| BigQuery cross-project reads | Si | Solo cuando agregue valor real y con IAM minimo |
| Event bridge / PubSub | Si | Cuando haga falta asincronia o fan-out |
| Visual preset compartido | Si | Institucional, no product-specific |
| Shared copy institucional | Si | No product-specific |

### 5.2 No permitido por defecto

| Patron | Estado | Razon |
| --- | --- | --- |
| Compartir Cloud SQL | No | Acopla runtime, secretos y operacion |
| Reusar users runtime de otra app | No | Rompe boundaries de IAM y ownership |
| Compartir secretos en un namespace indistinto | No | Riesgo operativo y de compliance |
| Copiar componentes de producto cross-repo | No | Duplica UX y deriva en drift |
| Embeder rutas Greenhouse dentro de otra plataforma | No | Mezcla ownership de producto |
| Mutar Greenhouse desde una sister platform sin API explicita | No | Rompe action boundary |

### 5.3 Excepciones

Una excepcion solo es valida si:

- existe decision arquitectonica explicita
- el ownership funcional sigue claro
- la excepcion queda documentada en el anexo de la plataforma concreta

---

## 6. Ownership model

### 6.1 Greenhouse

Greenhouse mantiene ownership canico sobre:

- portal UX Greenhouse
- auth y route groups del portal
- Agency, Finance, HR, People, Admin y client portal
- serving operativo del cliente
- assigned team, delivery, capacity y health signals del portal
- contratos API y readers propios del portal

### 6.2 Sister platform

Cada sister platform mantiene ownership canico sobre:

- sus rutas
- su shell de producto
- su runtime de agentes o control plane
- su storage transaccional
- su modelo operativo y lifecycle propio
- su integracion externa primaria

### 6.3 Shared institutional layer

Su ownership vive en contratos documentales, no en un repo implicitamente dominante.

En el estado actual:

- Greenhouse ya formalizo el preset visual reusable hacia Kortex
- la capa verbal reusable queda explicitamente derivada a `TASK-265`

### 6.4 Source-of-truth rule

Si una capability tiene owner en una sister platform:

- Greenhouse no debe recrear una truth layer paralela

Si una señal operativa tiene owner en Greenhouse:

- la sister platform la consume como provider externo
- no la redefine como truth layer local salvo materializacion analitica derivada

---

## 7. Integration surfaces canonicas

### 7.1 Institutional surface

Uso:

- visual preset
- copy shared
- iconografia institucional
- patrones shell compatibles

Mutabilidad:

- documental o packageada, pero nunca implicita

Auth:

- no aplica como runtime auth

### 7.2 Read API surface

Uso:

- lecturas servidor-a-servidor
- operational drilldowns
- scoped reads para control planes externos

Regla:

- endpoint explicito
- auth explicita
- tenancy explicita
- response shape estable

### 7.3 MCP / agent surface

Uso:

- agentes LLM
- copilots
- workflows de inteligencia

Regla:

- read-only por defecto
- no reemplaza la REST/API surface
- se monta sobre una read surface estable

### 7.4 Event / async surface

Uso:

- outbox
- Pub/Sub
- webhooks
- reconciliacion y materializacion asincrona

Regla:

- no usarlo como sustituto de un contrato de lectura

### 7.5 Analytical surface

Uso:

- BigQuery cross-project
- marts compartidos
- joins historicos
- benchmarks inter-plataforma

Regla:

- analytic convenience no equivale a source of truth transaccional

### 7.6 Deep link surface

Uso:

- navegacion entre plataformas
- handoff humano desde una app a otra

Regla:

- la plataforma destino mantiene ownership total de la experiencia que se abre

---

## 8. Identity and tenancy bridge contract

### 8.1 Principio

Todo bridge entre Greenhouse y una sister platform debe apoyarse en IDs canonicos y bindings explicitamente persistidos.

### 8.2 Identificadores Greenhouse relevantes

| Campo | Significado |
| --- | --- |
| `clientId` | Tenant comercial o cliente canico del portal |
| `organizationId` | Cuenta / organizacion canica |
| `spaceId` | Scope operativo o instancia de servicio |
| `memberId` | Identidad colaborador cuando aplique |
| `tenantType` | `client` o `efeonce_internal` |

### 8.3 Identificadores sister-platform

Cada app hermana define sus IDs propios, por ejemplo:

- `portal_id`
- `hubspot_portal_id`
- `workspace_id`
- `installation_id`
- `connector_id`

### 8.4 Binding contract minimo

Toda integracion durable debe poder responder:

- que sister platform es
- que tenant o cuenta Greenhouse representa
- que objeto local de la sister platform corresponde a ese tenant
- que scope operativo exacto aplica
- quien es owner del binding
- desde cuando esta activo
- si el binding es `draft`, `active`, `suspended` o `deprecated`

### 8.5 Anti-patterns prohibidos

- matchear por nombre comercial
- matchear por slug visible sin contrato estable
- inferir `space` desde una ruta o desde UX
- usar una API key sin binding explicito y asumir que ya representa al tenant correcto

### 8.6 Future implementation seam

El contrato no obliga hoy a una tabla especifica, pero si obliga a una capability futura de binding cross-platform dentro de Greenhouse.

---

## 9. Action boundary

### 9.1 Read

Una sister platform puede:

- leer contexto de Greenhouse
- usarlo para scorecards, recomendaciones o explicaciones
- combinarlo con su propia logica de producto

### 9.2 Recommend

Una sister platform puede:

- producir recomendaciones basadas en datos Greenhouse
- priorizar, explicar o advertir

Eso no equivale a mutar Greenhouse.

### 9.3 Write

Una sister platform solo puede mutar Greenhouse si:

- existe API explicita
- existe ownership funcional claro
- existe regla de auth y audit trail
- el anexo de la plataforma lo autoriza

### 9.4 Agent rule

Los carriles LLM/MCP deben asumir:

- read-only por defecto
- approval humana antes de cualquier mutacion cross-platform

---

## 10. Security and governance

### 10.1 Runtime separation

La configuracion preferida es:

- proyecto GCP propio por plataforma
- Secret Manager propio por plataforma
- Cloud SQL propio por plataforma
- service accounts propias por plataforma

### 10.2 Least privilege

Toda relacion cross-platform debe usar:

- IAM minimo
- tokens scoped
- auth diferenciada por audience
- rate limiting cuando aplique

### 10.3 Observability

Todo consumo cross-platform importante debe poder auditar:

- caller
- tenant o scope
- surface usada
- latencia
- errores
- fecha de ultimo uso

### 10.4 Data leakage

El contrato exige aislamiento tenant-safe en:

- responses
- logs
- retries
- caches
- tool outputs

---

## 11. Release and versioning model

### 11.1 Versioned baseline

El contrato marco vive versionado como `V1`, `V1.1`, etc.

### 11.2 Platform annexes

Cada sister platform activa debe tener su propio anexo cuando:

- ya existe repo o runtime real
- ya existe integracion o roadmap formal con Greenhouse

Ejemplo:

- `GREENHOUSE_KORTEX_INTEGRATION_ARCHITECTURE_V1.md`

### 11.3 Future annexes

Plataformas futuras, por ejemplo `Verk`, deben abrir anexo propio solo cuando exista baseline real de producto o repo.

### 11.4 Non-breaking evolution

Los contratos no deben romper consumers activos sin:

- decision explicita
- plan de transicion
- version o deprecacion clara

---

## 12. Onboarding checklist para nuevas sister platforms

Antes de abrir una integracion nueva, confirmar:

- existe ownership funcional propio de la plataforma
- existe decision de peer system, no de modulo embebido
- existe anexo o se justifica abrirlo
- existe identificacion canonica del tenant/scope
- existe surface de lectura clara
- se definio si la capa compartida es:
  - institucional
  - operativa
  - analitica
  - event-driven
- se documentaron las prohibiciones y el action boundary

---

## 13. Estado actual del ecosistema

### 13.1 Sister platform activa

- `Kortex` ya cumple el criterio de sister platform activa del ecosistema

### 13.2 Plataformas futuras

- `Verk` queda explicitamente contemplada como future sister platform consumer de este contrato
- no debe recibir anexo propio hasta tener baseline real de repo o arquitectura equivalente

### 13.3 Contratos ya conectados a este marco

- visual preset reusable hacia Kortex:
  - `docs/architecture/GREENHOUSE_KORTEX_VISUAL_PRESET_V1.md`
- copy contract reusable:
  - `docs/tasks/to-do/TASK-265-greenhouse-nomenclature-dictionary-kortex-copy-contract.md`
- data node / read API / MCP downstream:
  - `docs/tasks/to-do/TASK-039-data-node-architecture-v1.md`
  - `docs/tasks/to-do/TASK-040-data-node-architecture-v2.md`

---

## 14. Decisiones canonicas resumidas

1. Greenhouse y las sister platforms se integran como peer systems.
2. Runtime compartido no es el default.
3. Shared institutional layer si; shared product logic no.
4. Todo bridge cross-platform requiere tenancy explicita.
5. MCP y agentes son read-only por defecto.
6. Cada plataforma activa del ecosistema debe tener anexo propio sobre este contrato marco.
