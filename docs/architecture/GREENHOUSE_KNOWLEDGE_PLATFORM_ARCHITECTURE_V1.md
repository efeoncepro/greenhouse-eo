# Greenhouse Knowledge Platform Architecture V1

> **Tipo de documento:** Architecture proposal
> **Status:** `Draft / proposed`
> **Creado:** 2026-06-11
> **Owner:** Platform / Nexa / Knowledge Operations
> **Relacionado:** `GREENHOUSE_KNOWLEDGE_PLATFORM_DECISION_V1.md`, `GREENHOUSE_NEXA_ARCHITECTURE_V1.md`, `GREENHOUSE_MCP_ARCHITECTURE_V1.md`, `GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`, `GREENHOUSE_STRUCTURED_CONTEXT_LAYER_V1.md`

## 1. Objetivo

Definir una arquitectura para conectar bases de conocimiento Notion a Greenhouse en dos capas:

- una **capa humana** para aprender a manejar Greenhouse;
- una **capa agéntica** para que Nexa y clientes MCP consulten conocimiento publicado, con permisos, citas y freshness.

La tesis:

> Notion es el espacio de autoría. Greenhouse es el runtime gobernado de conocimiento.

## 2. Problema

Greenhouse ya tiene conocimiento distribuido entre Notion, docs del repo, handoffs, tasks, arquitectura y experiencia operativa. Ese conocimiento todavía no vive como producto consultable:

- las personas aprenden por contexto disperso;
- Nexa depende de prompts, tools operativas y contexto puntual;
- Notion no distingue por sí solo qué conocimiento está publicado, vigente, sensible o permitido para cada usuario de Greenhouse;
- las respuestas de un agente necesitan citas, versionado y degradación honesta.

El riesgo no es solo técnico. Si el conocimiento operativo no queda acumulado, Greenhouse pierde parte del switching cost que debería construir como ASaaS.

## 3. North Star

La Knowledge Platform debe aumentar:

- **Switching cost sistémico:** cada manual, SOP y decisión publicada queda como memoria acumulada de operación.
- **Transparencia operativa:** las personas pueden aprender y resolver dudas sin depender de conversaciones privadas.
- **Revenue Enabled:** Nexa puede explicar cómo operar mejor Greenhouse y conectar procedimientos con outcomes, sin inventar.

## 4. Modelo De Capas

```text
Authoring Layer
  Notion pages / databases / teamspaces
  Repo docs selected for publication
  Future: PDFs, Google Docs, runbooks

Ingestion + Publication Layer
  Source registry
  Notion fetch
  Block/page normalization
  Classification
  Access policy mapping
  Versioned publication
  Quarantine

Knowledge Core
  Documents
  Versions
  Chunks
  Indexes
  Citations
  Feedback
  Freshness / sync runs

Consumption Layer
  Human Knowledge Center
  Nexa knowledge tools
  API Platform knowledge endpoints
  Greenhouse MCP knowledge resources
```

## 5. Bounded Context

Nombre propuesto:

- **Knowledge Platform**

Schema propuesto:

- `greenhouse_knowledge`

TypeScript root propuesto:

- `src/lib/knowledge/`

Rutas UI tentativas:

- `/knowledge`
- `/learn`
- `/academy`

La ruta final no queda decidida en este draft.

## 6. Source Model

### 6.1 Knowledge Sources

`knowledge_sources` representa un origen autorizado.

Campos conceptuales:

- `source_id`
- `source_system` (`notion`, `repo_docs`, future)
- `source_kind` (`notion_page_tree`, `notion_data_source`, `markdown_collection`)
- `tenant_scope_type`
- `tenant_scope_id`
- `audience` (`internal`, `client`, `mixed`)
- `owner_domain`
- `secret_ref` cuando aplique
- `sync_enabled`
- `publication_policy`
- `last_synced_at`
- `status`

### 6.2 Notion Boundary

Notion se usa para autoría y colaboración. Greenhouse usa la API de Notion para sync determinístico.

Reglas:

- usar Notion data sources / pages como fuente de extracción;
- snapshot antes de publicar;
- nunca depender de lectura Notion live para una respuesta Nexa en producción;
- no mezclar este pipeline con el pipeline operacional `Notion -> delivery metrics`;
- tokens se resuelven por Secret Manager o mecanismo equivalente, nunca en texto plano;
- Notion MCP queda reservado para asistencia interactiva de autoría, research, migración o edición, no para runtime primario de Nexa.

## 7. Knowledge Core

### 7.1 Documents

`knowledge_documents` representa el documento lógico.

Ejemplos:

- "Cómo usar Mi Desempeño"
- "Runbook de conexión Notion de cliente"
- "Guía de lectura de RpA"
- "Qué puede responder Nexa"

### 7.2 Document Versions

`knowledge_document_versions` representa una versión publicada.

Debe preservar:

- source URL / Notion page ID;
- checksum;
- author / publisher;
- publication status;
- created / edited timestamps del origen;
- normalized markdown o AST;
- sensitivity classification;
- freshness state.

### 7.3 Chunks

`knowledge_chunks` representa unidades de recuperación agéntica.

Cada chunk debe tener:

- `document_version_id`
- heading path
- body text normalizado
- audience
- allowed scopes
- sensitivity
- token estimate
- citation anchor
- source position

### 7.4 Indexes

Fase 1 puede partir con búsqueda full-text y filtros fuertes por metadata.

Embeddings quedan como fase posterior si el corpus lo justifica. Antes de elegir vector store hay que validar:

- si Postgres actual tendrá `pgvector` o extensión equivalente;
- si conviene BigQuery/Vertex/otro servicio;
- costos de embedding;
- política de retención;
- evaluación de calidad de retrieval.

## 8. Capa Humana

La capa humana es una superficie editorial de Greenhouse para aprender.

Capacidades:

- navegación por rol, módulo y proceso;
- búsqueda humana;
- rutas de aprendizaje;
- artículos con estado (`draft`, `published`, `deprecated`, `stale`);
- fuente y última actualización visibles;
- feedback humano;
- enlaces contextuales desde superficies del portal;
- separación interno / cliente cuando aplique.

Principio de UX:

> La capa humana enseña. No debe parecer un dump de Notion.

## 9. Capa Agéntica

La capa agéntica expone conocimiento a Nexa y MCP.

Tools / contracts tentativos:

- `knowledge_search`
- `knowledge_get_document`
- `knowledge_get_citations`
- `knowledge_resolve_runbook`
- `knowledge_answer_with_sources`

Reglas:

- read-only en V1;
- siempre scoped por usuario, tenant, route groups, capabilities y audiencia;
- respuestas con citas cuando usen conocimiento recuperado;
- si la fuente está stale, Nexa lo dice;
- si no hay fuente suficiente, Nexa no inventa;
- no recuperar chunks en cuarentena;
- no exponer secretos, PII no gobernada o compromisos legales/financieros no aprobados.

## 10. API Platform

La UI humana, Nexa y MCP deben consumir contratos API Platform o Product APIs gobernadas, no queries directas dispersas.

Endpoints candidatos:

```text
GET  /api/platform/app/knowledge/search
GET  /api/platform/app/knowledge/documents
GET  /api/platform/app/knowledge/documents/:id
POST /api/platform/app/knowledge/answer
GET  /api/platform/ecosystem/knowledge/resources
GET  /api/platform/ecosystem/knowledge/resources/:id
```

La forma final depende del audience:

- `app` para usuarios first-party autenticados;
- `ecosystem` para consumers server-to-server / MCP cuando corresponda.

## 11. MCP / webMCP

Greenhouse MCP debe exponer conocimiento como downstream de API Platform.

Recursos MCP candidatos:

- `greenhouse://knowledge/document/{id}`
- `greenhouse://knowledge/source/{id}`
- `greenhouse://knowledge/runbook/{slug}`

Tools MCP candidatos:

- `search_knowledge`
- `get_knowledge_document`
- `get_knowledge_citations`

No permitido:

- MCP leyendo SQL directo;
- MCP leyendo Notion directo como bypass;
- MCP inferiendo tenant por nombre del cliente;
- writes en V1.

## 12. Nexa Integration

Nexa debe incorporar una nueva familia de tools, separada de las tools operativas actuales.

Flujo esperado:

```text
User question
  -> Nexa classifies whether knowledge retrieval is needed
  -> calls knowledge_search with user context
  -> receives scoped chunks + citations + freshness
  -> answers with citations and honest gaps
```

Prompt rule:

- datos operativos actuales usan tools operativas;
- preguntas de cómo usar, qué significa, cómo se hace, runbooks y procedimientos usan Knowledge Platform;
- si ambos aplican, Nexa combina señal operacional + conocimiento publicado.

### 12.1 Context Contract

Nexa no debe cargar el corpus completo en el prompt ni depender de un bloque estático de knowledge inyectado en cada turno.

El contrato correcto es retrieval-on-demand:

```text
Nexa system prompt
  -> reglas estables de uso de knowledge

User turn
  -> intención / route context / user context
  -> knowledge_search()
  -> retrieval packet acotado
  -> respuesta con citas
```

Esto mantiene:

- bajo el costo de tokens;
- controlados los permisos;
- trazable la fuente;
- explícito el freshness;
- observable qué conocimiento fue usado.

### 12.2 Retrieval Trigger

Nexa debe llamar Knowledge Platform cuando la pregunta sea sobre:

- cómo usar Greenhouse;
- qué significa una métrica, estado, capability, módulo o proceso;
- qué pasos seguir en un runbook;
- troubleshooting operativo;
- política interna, guía de uso o onboarding;
- interpretación de datos operativos cuando necesite definiciones o reglas publicadas.

Nexa no debe llamar Knowledge Platform cuando:

- la pregunta requiere estado operacional actual y ya existe tool de dominio;
- el usuario pide una acción que requiere command semantics;
- la respuesta puede resolverse desde contexto runtime fresco ya provisto;
- el usuario pide algo fuera del scope publicado.

Cuando ambos planos aplican, Nexa debe combinar:

```text
operational tool result
  + knowledge retrieval packet
  -> respuesta grounded en datos actuales + regla publicada
```

### 12.3 Retrieval Packet Shape

`knowledge_search` debe devolver un paquete acotado, no documentos completos por defecto.

Shape conceptual:

```ts
interface KnowledgeRetrievalPacket {
  query: string
  generatedAt: string
  accessScope: {
    tenantType: string
    tenantId: string
    userId: string
    roleCodes: string[]
    routeGroups: string[]
    capabilities: string[]
  }
  confidence: 'high' | 'medium' | 'low' | 'none'
  freshness: 'current' | 'stale' | 'deprecated' | 'unknown'
  chunks: Array<{
    chunkId: string
    documentId: string
    documentVersionId: string
    title: string
    headingPath: string[]
    text: string
    sourceUrl: string | null
    humanUrl: string
    citationLabel: string
    updatedAt: string | null
    freshness: 'current' | 'stale' | 'deprecated' | 'unknown'
    sensitivity: 'client_safe' | 'internal' | 'restricted'
  }>
  deniedOrFilteredCount: number
  notes: string[]
}
```

Hard rules:

- `chunks[]` debe estar filtrado antes de llegar al LLM;
- el LLM nunca recibe chunks denegados para "decidir";
- `sourceUrl` puede apuntar a Notion solo si el usuario tiene acceso y el producto lo permite;
- `humanUrl` apunta a la surface Greenhouse canonical para lectura humana;
- `deniedOrFilteredCount` permite observabilidad sin filtrar contenido sensible;
- `confidence='none'` obliga respuesta de no-encontrado, no invención.

### 12.4 Answer Rules

Si Nexa usa Knowledge Platform:

- debe responder solo con contenido respaldado por el retrieval packet;
- debe citar documentos/secciones usados;
- debe declarar cuando la fuente está stale o deprecated;
- debe distinguir dato operativo actual vs regla/documentación publicada;
- debe pedir validación humana cuando la pregunta toca legal, payroll, finance, security o contractual commitments y la fuente no está marcada como aprobada para ese uso;
- debe decir "no encontré una guía publicada" cuando no hay evidencia suficiente.

Formato UI recomendado:

```text
Respuesta breve

Fuentes:
- <Título> · <Sección> · actualizado <fecha>
- <Título> · <Sección> · actualizado <fecha>
```

En el chat compacto, las fuentes pueden renderizarse como chips/accordion para no saturar la conversación.

### 12.5 Conflict Resolution

Jerarquía de confianza para conocimiento:

1. runtime verificado / código / schema / API contract;
2. arquitectura Greenhouse vigente y ADRs aceptados;
3. docs Knowledge Platform publicados y current;
4. Notion publicado pero stale;
5. handoff histórico, task antigua o documento deprecated.

Nexa no debe promediar fuentes contradictorias. Si recupera chunks con conflicto, debe:

- preferir la fuente de mayor jerarquía;
- mencionar que encontró una guía más antigua si es relevante;
- evitar dar instrucciones operativas basadas en fuentes deprecated;
- sugerir validación cuando el conflicto afecte acciones sensibles.

### 12.6 Prompt Boundary

El system prompt de Nexa debe contener reglas estables, no contenido de manual.

Ejemplo conceptual:

```text
Si la pregunta requiere conocimiento publicado de Greenhouse, usa knowledge_search.
No inventes reglas operativas.
Si usas chunks de knowledge, cita fuentes.
Si la fuente está stale/deprecated, dilo.
Si no hay fuente suficiente, responde con un gap honesto.
```

El contenido recuperado vive en el tool result del turno, no en prompts globales versionados a mano.

### 12.7 Feedback Loop

Cada respuesta de Nexa que use knowledge debería generar metadata auditable:

- query normalizada;
- chunk IDs usados;
- confidence;
- si hubo respuesta con fuentes;
- feedback del usuario (`useful`, `not_useful`, `wrong_source`, `stale`, `missing_doc`);
- link a documento humano para corrección.

Esto habilita mejorar el corpus sin inspeccionar conversaciones completas.

## 13. Access And Safety

La política de acceso debe ser Greenhouse-native.

Dimensiones:

- tenant;
- tenant type;
- route groups;
- capabilities;
- audience;
- document sensitivity;
- source owner domain;
- publication status.

Estados especiales:

- `quarantined`: no aparece en UI ni en retrieval;
- `internal_only`: jamás visible para cliente;
- `agent_excluded`: visible para humanos pero no para Nexa/MCP;
- `stale`: visible con warning, retrieval permitido solo si la respuesta lo declara;
- `deprecated`: visible como histórico, no recomendado por Nexa salvo pregunta explícita.

## 14. Observability

Signals iniciales:

- `knowledge.sync.stale_source`
- `knowledge.sync.failed_source`
- `knowledge.publication.quarantine_count`
- `knowledge.retrieval.no_answer_rate`
- `knowledge.retrieval.low_citation_rate`
- `knowledge.feedback.negative_rate`
- `knowledge.mcp.error_rate`
- `knowledge.nexa.no_source_answer_rate`
- `knowledge.nexa.stale_source_answer_rate`
- `knowledge.nexa.low_confidence_retrieval_rate`

Audit mínimo:

- sync runs;
- publication events;
- document version creation;
- quarantine decisions;
- agent retrieval events with chunk IDs, not full sensitive content;
- Nexa answer metadata for source usage, without storing full private prompts by default;
- feedback events.

## 15. Candidate Task Titles

Estos títulos se documentan para madurar el programa. **No existen archivos `TASK-###` todavía y no deben tratarse como backlog formal hasta que se creen con ID estable.**

1. **Knowledge Platform Architecture Acceptance + Source Taxonomy**
2. **Knowledge Source Registry + Notion Connector Discovery**
3. **Notion Knowledge Ingestion MVP: Snapshot, Normalize, Version**
4. **Human Knowledge Center: Greenhouse Academy / Manual**
5. **Nexa Knowledge Retrieval Tool With Citations**
6. **Greenhouse MCP Knowledge Resources V1**
7. **Knowledge Freshness, Feedback and Reliability Signals**
8. **Knowledge Access Policy + Quarantine Workflow**

## 16. Open Questions

- ¿La primera superficie humana se llama Knowledge, Academy, Manual o Learn?
- ¿Qué bases Notion son el piloto inicial?
- ¿El corpus inicial será solo interno o también cliente-facing?
- ¿Quién aprueba publicación desde Notion hacia Greenhouse?
- ¿Qué documentos quedan humanos-only y fuera de Nexa?
- ¿Qué fuente se usa para embeddings si se aceptan en una fase posterior?
- ¿Qué capabilities gobiernan lectura, publicación y administración?
- ¿Cómo se versionan cambios de documentos que afectan legal, finance o payroll?

## 17. References

- Notion MCP overview: https://developers.notion.com/guides/mcp/overview
- Notion MCP connection guide: https://developers.notion.com/guides/mcp/get-started-with-mcp
- Notion data source query reference: https://developers.notion.com/reference/query-a-data-source
- Notion data source object reference: https://developers.notion.com/reference/data-source
