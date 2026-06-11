# Manual — Knowledge Platform (foundation)

> **Tipo de documento:** Manual de uso / runbook
> **Versión:** 1.0
> **Creado:** 2026-06-11 por Claude (TASK-1081)
> **Última actualización:** 2026-06-11 por Claude (TASK-1081)
> **Documentación funcional:** [knowledge-platform.md](../../documentation/plataforma/knowledge-platform.md)
> **Documentación técnica:** [GREENHOUSE_KNOWLEDGE_PLATFORM_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_KNOWLEDGE_PLATFORM_ARCHITECTURE_V1.md)

## Para qué sirve

Operar la **foundation** de la Knowledge Platform: el schema `greenhouse_knowledge` y los helpers server-only de `src/lib/knowledge/`. En esta etapa (TASK-1081) **no hay UI ni API pública**; esto es para developers/agentes que construyen las tasks downstream (TASK-1082+) o que necesitan registrar/consultar conocimiento desde un script o un reactive consumer.

## Antes de empezar

- La foundation es **additive**: el schema y los helpers no los consume ningún flujo runtime todavía. Aplicar la migración no cambia ningún comportamiento existente.
- Todo el módulo `src/lib/knowledge/store.ts` es **server-only**. Se importa directo (`@/lib/knowledge/store`), nunca desde el barrel `@/lib/knowledge` (el barrel es puro: tipos, constantes, state-machine, validadores).

## Aplicar / verificar la base de datos

```bash
# Aplicar las migraciones pendientes (incluye el schema knowledge + las capabilities)
pnpm pg:connect:migrate

# Estado de migraciones
pnpm pg:connect:status
```

La migración `*_task-1081-knowledge-core-schema.sql` crea el schema y 6 tablas; la migración `*_task-1081-knowledge-capabilities-registry-seed.sql` siembra las 5 capabilities. Ambas traen un bloque `DO` de verificación que aborta si los objetos no quedaron creados.

## Operaciones desde código (helpers canónicos)

Todos viven en `@/lib/knowledge/store` (server-only). Cada command corre en una transacción y deja una fila de auditoría en `knowledge_publication_runs`.

```ts
import {
  registerKnowledgeSource,
  createKnowledgeDocument,
  publishKnowledgeDocumentVersion,
  transitionKnowledgeDocumentStatus,
  recordKnowledgeFeedback,
  getKnowledgeDocumentBySlug,
  listKnowledgeDocumentsByMetadata
} from '@/lib/knowledge/store'

// 1. Registrar una fuente autorizada
const source = await registerKnowledgeSource({
  sourceSystem: 'notion',
  sourceKind: 'notion_page_tree',
  name: 'Manuales internos',
  ownerDomain: 'platform',
  audience: 'internal'
})

// 2. Crear un documento (nace en 'draft')
const doc = await createKnowledgeDocument({
  sourceId: source.sourceId,
  slug: 'como-preguntar-a-nexa',
  title: 'Cómo preguntar a Nexa',
  documentType: 'how_to',
  ownerDomain: 'platform',
  agenticPolicy: 'agent_allowed' // o 'agent_excluded' para sacarlo de Nexa
})

// 3. Publicar una versión con chunks (transiciona el doc a 'published')
await publishKnowledgeDocumentVersion({
  documentId: doc.documentId,
  checksum: 'sha256:...',
  normalizedMarkdown: '# ...',
  chunks: [{ bodyText: '...', citationAnchor: 'intro' }]
})

// 4. Cambiar el lifecycle (cuarentena / viejo / descontinuado)
await transitionKnowledgeDocumentStatus(doc.documentId, 'quarantined', {
  actor: 'ops', reason: 'contenía un token'
})
```

## Qué significan los estados

- **`publication_status`** (etapa del documento): `draft` → `review` → `published` → `stale` (viejo, todavía visible con aviso) / `deprecated` (descontinuado). `quarantined` lo bloquea para todos.
- **`agentic_policy`** (compuerta de Nexa): `agent_allowed` o `agent_excluded`. Es **independiente** del estado: un documento publicado puede estar excluido de Nexa.
- Transiciones válidas: ver `KNOWLEDGE_PUBLICATION_TRANSITIONS` en `src/lib/knowledge/state-machine.ts`. El mismo matrix está enforced en un trigger de base de datos.

## Qué no hacer

- **No** importar `store.ts` desde un componente cliente (`'use client'`) — es server-only.
- **No** borrar filas de `knowledge_publication_runs` ni de `knowledge_feedback` — son append-only (un trigger lo bloquea). La cuarentena y el deprecate son transiciones, no borrados.
- **No** meter `agent_excluded` dentro del enum de `publication_status` — son dos dimensiones separadas a propósito.
- **No** guardar secretos/tokens en el `normalized_markdown` ni en los chunks. Si una fuente trae un secreto, el documento va a `quarantined`.
- **No** leer Notion en vivo desde este módulo — la ingesta (TASK-1082) hace snapshot primero.

## Problemas comunes

| Síntoma | Causa probable | Qué hacer |
| --- | --- | --- |
| `invalid publication_status transition X -> Y` | Transición no permitida por el matrix | Revisar `KNOWLEDGE_PUBLICATION_TRANSITIONS`; quizás necesitas pasar por un estado intermedio. |
| `knowledge_feedback is append-only` | Intento de UPDATE/DELETE sobre feedback | Es por diseño; el feedback no se edita ni borra. |
| Error de FK al borrar un documento | El documento tiene runs/versiones que lo referencian (RESTRICT) | No se borra; se descontinúa (`deprecated`) o se pone en cuarentena. |

## Referencias técnicas

- Schema: `migrations/*_task-1081-knowledge-core-schema.sql`
- Capabilities: `migrations/*_task-1081-knowledge-capabilities-registry-seed.sql` + `src/config/entitlements-catalog.ts` + `src/lib/entitlements/runtime.ts`
- Helpers: `src/lib/knowledge/`
- Arquitectura: [GREENHOUSE_KNOWLEDGE_PLATFORM_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_KNOWLEDGE_PLATFORM_ARCHITECTURE_V1.md)
