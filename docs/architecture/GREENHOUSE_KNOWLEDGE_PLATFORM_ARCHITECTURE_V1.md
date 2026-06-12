# Greenhouse Knowledge Platform Architecture V1

> **Tipo de documento:** Architecture proposal
> **Status:** `Accepted (direction) — runtime gated per task` (desde 2026-06-11, TASK-1080; ver `## Delta 2026-06-11 — Acceptance (TASK-1080)`)
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

### 8.1 Taxonomía Editorial

La capa humana debe tener tipos editoriales explícitos. El tipo del documento define estructura, expectativas de freshness y cómo Nexa puede usarlo.

Tipos iniciales:

- `manual`: explicación estable de una funcionalidad o dominio;
- `how_to`: pasos guiados para completar una tarea frecuente;
- `sop`: procedimiento operativo estándar con owner y condición de uso;
- `runbook`: respuesta a incidente, degradación, conexión externa o flujo sensible;
- `faq`: respuestas cortas a dudas recurrentes;
- `glossary`: definición canónica de términos, métricas, estados y nomenclatura;
- `troubleshooting`: diagnóstico guiado de errores conocidos;
- `policy`: regla interna, compliance, seguridad, finanzas, payroll o acceso;
- `onboarding_path`: secuencia de aprendizaje por rol o momento del journey.

Todo documento publicado debe declarar:

- owner;
- audience;
- sensitivity;
- review cadence;
- last reviewed date;
- source system;
- canonical human URL;
- si es permitido para agentic retrieval;
- qué capa documental cubre (`technical`, `functional`, `manual`) cuando aplique.

### 8.2 Rutas De Aprendizaje

La surface humana debe organizar el conocimiento por rutas, no solo por búsqueda.

Rutas candidatas:

- **Primeros pasos Greenhouse:** navegación, Home, Nexa, espacios principales.
- **Colaborador:** Mi desempeño, tareas, feedback, métricas ICO personales.
- **Manager / Operations:** Person 360, Agency 360, Space 360, performance operations.
- **Cliente:** lectura de reportes, onboarding, solicitudes y estados visibles.
- **Admin interno:** usuarios, roles, entitlements, integraciones, auditoría.
- **Finance / Payroll:** ciclos, evidencias, aprobaciones y degradaciones honestas.
- **Nexa:** cómo preguntar, qué puede hacer, límites, fuentes y escalamiento humano.
- **Integraciones:** Notion, HubSpot, Teams, Google, Azure, Vercel y webhooks cuando corresponda.

### 8.3 Ayuda Contextual

La Knowledge Platform debe alimentar ayuda dentro del producto.

Entrypoints:

- links "Aprender" desde headers de página;
- sidecar contextual para manuales cortos o SOPs;
- empty states con guía asociada;
- errores y estados degradados con troubleshooting relevante;
- tooltips ricos solo cuando la explicación sea breve;
- Nexa citando la guía humana equivalente en cada respuesta grounded.

Regla:

> Si una feature tiene una manual page publicada, la UI debe poder enlazarla desde el contexto donde se usa.

### 8.4 Publicación

Flujo editorial propuesto:

```text
Notion draft
  -> source classification
  -> editorial / domain review
  -> safety classification
  -> Greenhouse snapshot
  -> publish version
  -> index human + agentic layers
  -> monitor feedback / freshness
```

No todo lo que existe en Notion se publica. La publicación es una decisión explícita.

Estados mínimos:

- `draft`: existe en Notion o staging, no visible en runtime;
- `review`: listo para aprobación humana;
- `published`: visible según audience y access policy;
- `stale`: visible con warning y retrieval permitido con declaración;
- `deprecated`: histórico, no recomendado;
- `quarantined`: bloqueado para humanos y agentes hasta remediar;
- `agent_excluded`: visible para humanos, excluido de Nexa/MCP.

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

### 9.1 Readiness Agéntico

Un documento no queda listo para Nexa solo por estar escrito. Debe pasar gates de uso agéntico.

Checklist inicial:

- tiene owner y fecha de revisión;
- tiene audience y sensitivity correctos;
- no contiene secretos, tokens, credenciales, datos personales no gobernados ni instrucciones privadas;
- no contiene prompts o instrucciones que intenten controlar al agente fuera del contenido del documento;
- tiene headings estables para citas;
- tiene alcance claro: qué cubre y qué no cubre;
- declara si aplica a clientes, internos o ambos;
- si toca finance, payroll, legal, security o contractual commitments, tiene aprobación del dominio;
- tiene al menos una pregunta esperada o caso de uso para evals;
- tiene fallback humano o ruta de escalamiento cuando el documento no basta.

### 9.2 Evals Y Golden Questions

La capa agéntica necesita evaluación desde el inicio, aunque el MVP use full-text search.

Cada corpus piloto debe definir:

- golden questions por documento o ruta de aprendizaje;
- respuesta esperada de alto nivel;
- fuentes que deberían citarse;
- fuentes que no deberían aparecer;
- casos de no respuesta cuando no hay evidencia;
- casos de conflicto entre doc vigente y doc stale/deprecated;
- casos sensibles donde Nexa debe pedir validación humana.

Signals mínimos:

- precisión de retrieval;
- tasa de respuestas con fuente;
- tasa de fuente equivocada;
- tasa de no respuesta correcta;
- tasa de uso de fuente stale;
- feedback negativo por documento.

### 9.3 Sanitización Contra Prompt Injection

Todo contenido que entra desde Notion u otra fuente editable debe tratarse como dato no confiable.

La ingesta debe:

- normalizar bloques antes de chunking;
- eliminar o marcar instrucciones que intenten modificar el comportamiento de Nexa;
- separar contenido visible de metadata operacional;
- bloquear embeds o links no permitidos;
- detectar secretos y patrones sensibles;
- registrar razones de quarantine;
- impedir que instrucciones del documento sobrescriban system prompt, policy, access control o tool choice.

Regla:

> Los documentos pueden enseñar procesos. No pueden dar órdenes al runtime del agente.

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

### 12.8 Agentic Quality Loop

El ciclo de calidad de Nexa debe operar como producto:

```text
question
  -> retrieval packet
  -> answer with citations
  -> user feedback / implicit signal
  -> knowledge issue or doc update
  -> eval regression
  -> publish new version
```

Cuando una respuesta falle, el sistema debe poder distinguir:

- falta documento;
- documento existe pero no fue recuperado;
- documento recuperado era stale;
- documento correcto fue recuperado pero Nexa respondió mal;
- el usuario no tenía acceso a la fuente correcta;
- la pregunta pedía una acción operativa, no conocimiento.

## 13. Human + Agentic Readiness Checklist

Antes de ampliar el corpus, cada dominio publicado debe pasar una revisión de dos capas.

### 13.1 Capa Humana

- Existe una ruta humana para encontrar el contenido sin saber el título exacto.
- El documento está escrito para enseñar, no como notas internas crudas.
- Tiene owner, fecha de revisión, audiencia y sensibilidad.
- Tiene status visible y muestra si está stale o deprecated.
- Tiene enlaces desde la feature, error state o flujo donde se necesita.
- Distingue uso interno vs cliente cuando corresponde.
- Declara el siguiente paso o escalamiento humano.
- Cumple la doctrina de triple documentación cuando cubre una capacidad Greenhouse: técnica, funcional y manual/runbook.

### 13.2 Capa Agéntica

- El documento puede chunkearse con headings y citas estables.
- Está permitido para `knowledge_search` o marcado como `agent_excluded`.
- Los chunks quedan filtrados por access policy antes del LLM.
- Tiene evals mínimas o golden questions.
- Tiene reglas de no respuesta para huecos, conflictos y sensibilidad.
- Está protegido contra prompt injection y contenido no confiable.
- Sus respuestas esperadas pueden citar una fuente Greenhouse canonical.
- Su feedback puede convertirse en issue editorial sin exponer conversaciones completas.

### 13.3 Shared Governance

- Hay un source registry claro: qué Notion bases entran, con qué policy y owner.
- Hay approvers por dominio, especialmente finance, payroll, legal, security y access.
- Hay estrategia de naming para la surface humana (`Knowledge`, `Academy`, `Manual`, `Learn`).
- Hay decisión de búsqueda inicial: full-text, híbrida o vector posterior.
- Hay política de versionado para cambios sensibles.
- Hay métricas de adoption humana y calidad agéntica.
- Hay criterio para excluir documentos de Nexa aunque sean visibles para humanos.

## 14. MVP Recomendado

El primer corte debería ser interno, pequeño y evaluable.

Scope recomendado:

- 10 a 20 documentos de alto valor;
- solo audience interno;
- una o dos rutas humanas, no todo el portal;
- `knowledge_search` read-only con citas;
- full-text search con filtros fuertes por metadata;
- `agent_excluded`, `stale`, `deprecated` y `quarantined` desde V1;
- golden questions antes de conectar a Nexa en producción;
- feedback humano visible en la surface;
- no embeddings hasta medir calidad y volumen real del corpus.

Corpus inicial sugerido:

- manual de uso de Nexa;
- manual de Mi desempeño;
- glosario ICO;
- runbook de degradación honesta;
- guía de roles/access básicos;
- guía de conexión Notion;
- guía de diferencia entre Efeonce, Greenhouse y Nexa;
- guía de cómo interpretar fuentes/citas en respuestas de Nexa.

Anti-scope del MVP:

- ingerir todo Notion;
- permitir writes desde MCP;
- responder preguntas legales/financieras sensibles sin approval domain-specific;
- usar Notion MCP como runtime primario;
- prometer que Nexa sabe algo si no hay documento publicado.

## 15. Access And Safety

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

## 16. Observability

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

## 17. Candidate Task Titles

Estos títulos se documentan para madurar el programa. **No existen archivos `TASK-###` todavía y no deben tratarse como backlog formal hasta que se creen con ID estable.**

1. **Knowledge Platform Architecture Acceptance + Source Taxonomy**
2. **Knowledge Source Registry + Notion Connector Discovery**
3. **Notion Knowledge Ingestion MVP: Snapshot, Normalize, Version**
4. **Human Knowledge Center: Greenhouse Academy / Manual**
5. **Nexa Knowledge Retrieval Tool With Citations**
6. **Greenhouse MCP Knowledge Resources V1**
7. **Knowledge Freshness, Feedback and Reliability Signals**
8. **Knowledge Access Policy + Quarantine Workflow**
9. **Knowledge Human Learning Paths + Contextual Help**
10. **Nexa Knowledge Evals + Golden Questions**
11. **Knowledge Publication Workflow + Editorial Governance**
12. **Knowledge Prompt Injection Sanitizer + Quarantine Rules**

## 18. Open Questions

- ¿La primera superficie humana se llama Knowledge, Academy, Manual o Learn?
- ¿Qué bases Notion son el piloto inicial?
- ¿El corpus inicial será solo interno o también cliente-facing?
- ¿Quién aprueba publicación desde Notion hacia Greenhouse?
- ¿Qué documentos quedan humanos-only y fuera de Nexa?
- ¿Qué docs deben nacer como `agent_excluded` aunque sean visibles para humanos?
- ¿Qué búsqueda se usa primero: full-text, híbrida o vector?
- ¿Qué capabilities gobiernan lectura, publicación y administración?
- ¿Cómo se versionan cambios de documentos que afectan legal, finance o payroll?
- ¿Cuál es el set inicial de golden questions y quién lo aprueba?
- ¿Qué eventos de feedback generan tarea editorial vs ajuste de retrieval?
- ¿Cómo se conectan los manuales de uso existentes bajo `docs/manual-de-uso/` con el corpus publicado?

## 19. References

- Notion MCP overview: https://developers.notion.com/guides/mcp/overview
- Notion MCP connection guide: https://developers.notion.com/guides/mcp/get-started-with-mcp
- Notion data source query reference: https://developers.notion.com/reference/query-a-data-source
- Notion data source object reference: https://developers.notion.com/reference/data-source

## Delta 2026-06-11 — Acceptance (TASK-1080)

El ADR pasó a `Accepted (direction) — runtime gated per task`. Esta Delta fija la taxonomía piloto ejecutable. Las **Open Questions** §18 que aquí se resuelven quedan respondidas; el resto sigue diferido con owner (ver ADR `## Acceptance Decision`).

### A. Naming + acceso (resuelve §18 Q1, Q8)

- Surface humana: **Knowledge**, ruta `/knowledge`. Schema `greenhouse_knowledge`, TS root `src/lib/knowledge/`, viewCode `plataforma.knowledge` (routeGroup `internal`, solo roles internos — nunca `client_*`).
- Capabilities (módulo `knowledge`, granulares):

  | Capability | Acción | Quién (grant inicial) |
  | --- | --- | --- |
  | `knowledge.document.read` | read | route groups internos + `efeonce_admin` |
  | `knowledge.document.publish` | create/update | owner domain del doc + `efeonce_admin`; sensibles exigen approver de dominio |
  | `knowledge.source.admin` | admin | `efeonce_admin` |
  | `knowledge.agentic.retrieve` | execute | capability de sistema/agente (Nexa/MCP) |
  | `knowledge.feedback.submit` | create | cualquier usuario interno autenticado |

  Cada capability se siembra con grant en `runtime.ts` en el mismo PR que la crea (TASK-1081), bajo el guard `capability-grant-coverage.test.ts` (invariante TASK-873/935).

### B. Dos dimensiones ortogonales de estado (corrige §8.4 + §15)

`§8.4` listaba `agent_excluded` dentro del enum de lifecycle. Se separan (regla anti-enum-mixto):

- `publication_status` (lifecycle): `draft | review | published | stale | deprecated`. `quarantined` = bloqueo alcanzable desde cualquier estado; gana sobre todo (invisible humanos **y** agentes).
- `agentic_policy` (compuerta retrieval, ortogonal): `agent_allowed | agent_excluded`. `published + agent_excluded` = visible para humanos, fuera de Nexa/MCP.
- `sensitivity`: `internal | restricted` en el MVP (`client_safe` diferido a fase cliente). `internal_only` deja de ser un "estado" y se expresa como `audience=internal`.

### C. Corpus piloto MVP (resuelve §18 Q2, Q3, Q5, Q6) — 14 docs, internal-only

Mapeado a documentación existente (la ingesta real es TASK-1082; algunos requieren un manual nuevo derivado de la fuente). Todos `audience=internal`, `sensitivity=internal` salvo donde se indica.

| # | Documento | type | Fuente existente | owner_domain | approver | agentic_policy |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Qué es y cómo preguntar a Nexa | how_to | `documentation/plataforma/saludo-nexa-home.md` | platform/nexa | efeonce_admin | agent_allowed |
| 2 | Cómo interpretar fuentes y citas en respuestas de Nexa | how_to | nuevo (deriva de esta arquitectura §12.4) | platform/nexa | efeonce_admin | agent_allowed |
| 3 | Diferencia Efeonce / Greenhouse / Nexa | glossary | `context/03_ecosistema-producto.md`, `04_greenhouse-producto.md` | platform | efeonce_admin | agent_allowed |
| 4 | Glosario ICO (RpA, OTD, FTR, Cycle Time, CSC) | glossary | `context/07_ico.md`, `06_glosario-metricas.md` | delivery | efeonce_operations | agent_allowed |
| 5 | Motor ICO: métricas operativas | manual | `documentation/delivery/motor-ico-metricas-operativas.md` | delivery | efeonce_operations | agent_allowed |
| 6 | Roles y acceso básicos en Greenhouse | manual | `documentation/identity/sistema-identidad-roles-acceso.md` | identity | efeonce_admin | agent_allowed |
| 7 | Accesos rápidos (atajos) | how_to | `manual-de-uso/plataforma/accesos-rapidos.md` | platform | efeonce_admin | agent_allowed |
| 8 | Conexión Notion de un cliente | runbook | `manual-de-uso/operations/notion-bq-sync-operacion.md` | operations | efeonce_operations | agent_allowed |
| 9 | Reliability Control Plane: leer `/admin/operations` | manual | `documentation/plataforma/reliability-control-plane.md` | platform | efeonce_admin | agent_allowed |
| 10 | Degradación honesta: cómo leer estados degradados | policy | `documentation/plataforma/reliability-control-plane.md` (deriva) | platform | efeonce_admin | agent_allowed |
| 11 | Alta de cliente (onboarding) | how_to | `manual-de-uso/agency/alta-de-cliente.md` | commercial | efeonce_account | agent_allowed |
| 12 | MCP Greenhouse read-only: cómo usarlo | manual | `manual-de-uso/plataforma/mcp-greenhouse-read-only.md` | platform | efeonce_admin | agent_allowed |
| 13 | Períodos de nómina: cómo funcionan | manual | `manual-de-uso/hr/periodos-de-nomina.md` | payroll | hr_payroll | agent_allowed (¹) |
| 14 | Política interna de secretos y acceso sensible | policy | `CLAUDE.md` §Secret Manager Hygiene (deriva, `sensitivity=restricted`) | security | efeonce_admin | **agent_excluded** (²) |

- (¹) Toca payroll → `agent_allowed` solo tras revisión del approver `hr_payroll`/`hr_manager` (describe el flujo, no montos). Hasta esa firma nace `agent_excluded`.
- (²) Ejercita la compuerta desde V1: visible para humanos internos, nunca retornado por `knowledge_search`/MCP. `restricted`.

**Ruta de aprendizaje inicial** (una sola, no todo el portal): **"Operación Greenhouse — Primeros pasos"** = docs #1, #3, #6, #7, #9, #10 en secuencia.

### D. Owners + approvers por dominio (resuelve §18 Q4)

`ROLE_CODES` reales (no roles fantasma — invariante TASK-935):

| owner_domain | approver_role | ¿sensible? (requiere firma de dominio antes de `agent_allowed`) |
| --- | --- | --- |
| platform / nexa | `efeonce_admin` | no |
| delivery | `efeonce_operations` (+ `efeonce_admin`) | no |
| identity / access | `efeonce_admin` | sí (access) |
| security | `efeonce_admin` | sí |
| commercial | `efeonce_account` (+ `efeonce_admin`) | no |
| finance | `finance_admin` | sí |
| payroll / hr | `hr_payroll` / `hr_manager` | sí |
| legal | `efeonce_admin` + confirmación humana out-of-band (no existe rol `legal`) | sí |

### E. Búsqueda inicial (resuelve §18 Q7)

- V1: **full-text Postgres (FTS) + filtros fuertes por metadata** (`audience`, `sensitivity`, `publication_status`, `agentic_policy`, `owner_domain`). Postgres-first.
- Embeddings/vector: **diferidos**, fase aditiva tras medir calidad/volumen en TASK-1083. Substrato (`pgvector` vs Vertex/BQ) no se elige aquí.

### F. Secuencia de rollout

`TASK-1080 (esta) → 1081 (schema + capabilities) → 1082 (ingesta Notion MVP) → 1083 (search API + golden questions) → 1084 (Human Center) ∥ 1085 (Nexa) ∥ 1086 (MCP)`. Cada task downstream conserva su `Out of Scope` y su gate propio (flags default false). Esta aceptación **no** levanta esos gates.

### G. Open Questions §18 — disposición

| §18 | Disposición |
| --- | --- |
| Q1 naming | Resuelto: **Knowledge** `/knowledge` |
| Q2 corpus piloto | Resuelto: tabla C (14 docs) |
| Q3 audiencia | Resuelto: **solo interno** |
| Q4 approvers | Resuelto: tabla D |
| Q5 humanos-only / fuera de Nexa | Resuelto: `agentic_policy=agent_excluded` (doc #14; #13 hasta firma) |
| Q6 nacen `agent_excluded` | Resuelto: doc #14 (y #13 condicional) |
| Q7 búsqueda inicial | Resuelto: full-text + metadata; vector diferido |
| Q8 capabilities | Resuelto: tabla A |
| Q9 versionado legal/finance/payroll | Diferido → TASK-1081/1082 (publish workflow) |
| Q10 golden questions + approver | Diferido → TASK-1083 (por dominio del doc) |
| Q11 feedback → tarea editorial vs retrieval | Diferido → TASK-1085 (feedback loop §12.7) |
| Q12 link manuales `docs/manual-de-uso/` ↔ corpus | Resuelto en parte: tabla C los mapea; la ingesta canónica es TASK-1082 |

## Delta 2026-06-11 — Schema materializado (TASK-1081)

La foundation persistente ya está en el repo (additive, sin consumidores runtime hasta TASK-1082+).

### Materializado

- Migración `migrations/20260611200140700_task-1081-knowledge-core-schema.sql` — schema `greenhouse_knowledge` + 6 tablas.
- Migración `migrations/20260611201441449_task-1081-knowledge-capabilities-registry-seed.sql` — 5 capabilities en `capabilities_registry`.
- Runtime `src/lib/knowledge/` — barrel puro (`index.ts`) + `store.ts` server-only (patrón TASK-790/822).
- Capabilities: `src/config/entitlements-catalog.ts` (módulo `knowledge` + 5 caps) + grants en `src/lib/entitlements/runtime.ts` + `CaptureDomain 'knowledge'`.

### Tablas (`greenhouse_knowledge`)

| Tabla | Rol | Notas |
| --- | --- | --- |
| `knowledge_sources` | Origen autorizado | `source_system`/`source_kind`, `audience`, `sync_enabled`, `secret_ref`. public_id `EO-KSRC-*`. |
| `knowledge_documents` | Documento lógico | `publication_status` (lifecycle) **×** `agentic_policy` (compuerta) ortogonales; `document_type`, `sensitivity`, `slug` único, `current_version_id`. public_id `EO-KDOC-*`. |
| `knowledge_document_versions` | Snapshot publicado | `version_number` UNIQUE por doc, `checksum`, `normalized_markdown`, `version_status`. |
| `knowledge_chunks` | Unidad de retrieval | Denormaliza `audience`/`sensitivity`/`freshness`/`agentic_policy` para filtrado pre-LLM (TASK-1083); `heading_path[]`, `citation_anchor`, `token_estimate`, `allowed_scopes[]`. |
| `knowledge_publication_runs` | Audit (anti-DELETE) | `run_kind`/`status`, forensic. |
| `knowledge_feedback` | Feedback (append-only) | anti-UPDATE + anti-DELETE. |

### Dos dimensiones ortogonales (corrige el enum mezclado de §8.4)

- `publication_status`: `draft → review → published → stale → deprecated`; `quarantined` = bloqueo alcanzable desde cualquier estado (gana sobre todo). Transiciones enforced en trigger DB `knowledge_documents_validate_transition` **y** en `assertValidKnowledgePublicationTransition` (TS, mirror exacto).
- `agentic_policy`: `agent_allowed | agent_excluded`. Independiente del lifecycle.

### Refinamientos de la aceptación TASK-1080 (decisiones de ejecución)

- **viewCode `plataforma.knowledge` → diferido a TASK-1084.** Nace con la página `/knowledge` (TASK-827: viewCode + routePath + page + nav juntos). Sembrarlo ahora sería una ruta huérfana 404.
- **Full-text / tsvector / GIN → diferido a TASK-1083** (search API). La foundation indexa owner/kind/metadata (SCL learning §269: no GIN day-one). Los chunks guardan `body_text` plano.
- **Outbox events → diferidos.** Sin consumidores hasta TASK-1082+. El audit leg es `knowledge_publication_runs` (append-only). `event-catalog` NO se tocó.
- **Capabilities → sembradas aquí** (SSOT): catalog + registry + grants en el mismo PR (invariant TASK-873/935). Aún no `can()`-checked.
- **Boundary con SCL confirmado:** `greenhouse_knowledge` ≠ `greenhouse_context` (Structured Context Layer). SCL = sidecar JSONB de memoria de agente/replay; Knowledge = corpus de prosa + chunks editorial. Ver STRUCTURED_CONTEXT_LAYER_V1 §900-906.

### Verificación

Migración aplicada en dev compartida (anti pre-up-marker DO blocks OK). Tests: pure (state-machine + validators) + live PG (`store.live.test.ts`: publish, transition trigger, chunks denormalizados, feedback append-only) + `parity.live.test` (catalog⇆registry) verdes. tsc + eslint limpios.

## Delta 2026-06-11 — Ingesta MVP (TASK-1082)

Pipeline de ingesta source-agnostic que materializa el corpus piloto en `greenhouse_knowledge`. Connector `repo_docs` real; connector Notion **diferido a TASK-1088** (gated en secret).

### Decisión de fuente

El corpus piloto (tabla C) son **archivos markdown del repo** (11/12 existen). No hay teamspace Notion de knowledge ni secret. → se ingiere vía connector `repo_docs` (`source_system='repo_docs'`, `source_kind='markdown_collection'`). El connector Notion (block fetcher `GET /v1/blocks/{id}/children` + `blocks→markdown`) se construye en **TASK-1088** cuando el operador provisione el teamspace + secret `notion-integration-token-greenhouse-knowledge-*`.

### Módulos (`src/lib/knowledge/`)

| Pieza | Rol |
| --- | --- |
| `ingestion/connector.ts` | Interface `KnowledgeSourceConnector` (source-agnostic, puro): `list()` + `load()`. |
| `ingestion/pilot-corpus.ts` | Manifest declarativo de los 14 docs (gobernanza editorial, no inferida del contenido). `sourceFiles=null` = to-author (skipped). |
| `ingestion/repo-docs-connector.ts` | Connector `repo_docs` (lee markdown del repo, server-only). |
| `ingestion/markdown.ts` | Puro: `stripFrontmatter` + `chunkMarkdown` (heading_path + `citation_anchor` estable + token_estimate + soft-split) + `checksumMarkdown` (sha256). Sin deps externas. |
| `sanitization/detect.ts` | Puro: detecta **valores** de secretos + RUT + prompt-injection (no menciones de "secret" en prosa). |
| `ingestion/pipeline.ts` | Server-only: orquesta `list→load→normalize→sanitize→(quarantine\|publish+chunks)`. dry-run/apply, idempotente por checksum, get-or-create del source, run audit, `captureWithDomain('knowledge')`. |
| `ingestion/run-tracking.ts` | begin/complete sync run sobre `knowledge_publication_runs`. |

CLI: `scripts/knowledge/ingest.ts` (`--apply`). `quarantine` es **knowledge-native** (`publication_status='quarantined'` + `run_kind='quarantine'`), NO la tabla SCL.

### Reliability signals (módulo `knowledge`)

- `knowledge.publication.quarantine_count` (data_quality, warning>0, steady=0).
- `knowledge.sync.failed_source` (freshness, error>0, steady=0).

Nuevo módulo reliability `knowledge` (subsystem "Knowledge Platform") en el registry.

### Verificación live

`--apply` en dev: registró el source `repo_docs` piloto, publicó **11 docs** (10 `agent_allowed` + 1 `agent_excluded` `periodos-de-nomina`) + **263 chunks**; re-run **idempotente** (11 unchanged, 0 published); **0 quarantine** (sanitizer sin falsos positivos en el corpus real que menciona nombres de secrets). Signals = `ok`. 14 focal + 418 reliability tests verdes.

## Delta 2026-06-12 — Search API materializada (TASK-1083)

`knowledge_search` implementado como **contrato read-only sobre API Platform** que consumen por igual UI humana (TASK-1084), Nexa (TASK-1085) y MCP (TASK-1086). Decisiones materializadas:

### Substrato full-text (Postgres, vector diferido)

- Columna `body_tsv tsvector GENERATED` sobre `knowledge_chunks` vía función IMMUTABLE SSOT `greenhouse_knowledge.knowledge_chunk_tsv(heading, body)` — **weighted** (heading `'A'` > body `'B'`: un match en el encabezado rankea más) + config `'spanish'` + **accent-insensitive** (`unaccent`: `nómina ≡ nomina`) + GIN. La función encapsula el `to_tsvector('spanish', unaccent(...))` (que inline resuelve como STABLE y rompe la columna GENERATED) y es el único lugar donde vive la definición del índice. Migraciones `20260612072724451` + `20260612075236036`.
- **Retrieval model**: OR-ify (`websearch_to_tsquery` con `&`→`|`) para recall sobre preguntas naturales + `ts_rank` para ranking + **piso de relevancia 0.10** para rechazar matches incidentales (no-answer honesto). Umbrales tunables; el eval harness los valida.

### Reader SSOT, 2 modos (Full API Parity #2)

`searchKnowledge({ query, subject, mode })` (`src/lib/knowledge/search/search-knowledge.ts`) es el **único** punto de retrieval — lane-agnóstico (recibe `subject`, no `request`; TASK-1086 lo envuelve sin lógica nueva). Pre-LLM filtering en SQL, dos modos:

| modo | capability | `agent_excluded` | `restricted` | publication |
|---|---|---|---|---|
| `human` | `knowledge.document.read` | **visible** | visible (interno) | published/stale/deprecated |
| `agentic` | `knowledge.agentic.retrieve` | **NUNCA** | **NUNCA** | published/stale |

El filtrado lee el **documento vivo** (`kd`), no el chunk denormalizado (que puede lagear); filtra `current_version_id` (ignora chunks de versiones superseded); el contenido denegado **nunca entra al reader** (solo `deniedOrFilteredCount`). Packet versionado `KnowledgeRetrievalPacket` con `contractVersion: 'knowledge-search.v1'`; `confidence='none'` con 0 resultados (no-answer honesto).

### Endpoints app + lint rule

- `GET /api/platform/app/knowledge/search` (packet v1, modo→capability)
- `GET /api/platform/app/knowledge/documents` (browse/list, Full API Parity #1)
- `GET /api/platform/app/knowledge/documents/:id` (read-detail: versión vigente + secciones; anti-oracle `notFound` para draft/quarantined/audience ajena)
- `POST /api/platform/app/knowledge/feedback` (contrato compartido humano+Nexa, Full API Parity #5)
- Lint rule `greenhouse/no-direct-knowledge-chunk-query` (warn→error tras 1084/1085): bloquea `FROM/JOIN` de las tablas de **contenido** (`knowledge_chunks|document_versions`) fuera del data layer. Exime `src/lib/knowledge/**`, migrations, plugin, `db.d.ts`. No flaggea governance ops (`COUNT` de `knowledge_documents`).

### Quality gate = eval harness offline (Delta D)

10 **golden questions** (fixtures TS versionadas, `golden-questions.ts`) cubriendo fuente correcta (human+agentic), wrong-source guard, no-answer honesto y escalación sensible. Structural test en CI + eval harness live contra el corpus real. **No** runtime signal de search en V1 (el signal `low_citation_rate` mide respuestas de Nexa → es de TASK-1085).

### Verificación live

22/22 tests verdes contra el corpus TASK-1082 (263 chunks): human ve `periodos-de-nomina` (`agent_excluded`), agentic lo excluye + `deniedOrFilteredCount≥1`; browse 0 leak de draft/quarantined; read-detail 30 secciones; no-answer off-corpus → `confidence='none'`.

### Delta 2026-06-12b — `score` por chunk (Answer Trace contract)

El packet expone `KnowledgeRetrievalChunk.score` (el `ts_rank` redondeado) — aditivo dentro de `knowledge-search.v1` (read-only, backward-compatible). Es el **SSOT del número del trace**: la Answer Trace surface (TASK-1089) muestra "Score 0.96" por chunk y "Confianza 0.94" por fuente; sin este campo esos números serían fabricados. La confianza por fuente/overall se **deriva** del score (agregando por documento o el máximo), nunca se inventa un número paralelo. Distinta de la **confianza de respuesta** que genera Nexa al componer (TASK-1085). La tab "Evals" del trace es la salud del eval harness offline (golden questions), no un campo por-consulta. Habilita el wiring honesto 1089 (UI) → 1085 (retrieval) sin reshape.
