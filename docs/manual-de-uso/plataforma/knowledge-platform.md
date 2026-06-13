# Manual — Knowledge Platform (foundation)

> **Tipo de documento:** Manual de uso / runbook
> **Versión:** 1.0
> **Creado:** 2026-06-11 por Claude (TASK-1081)
> **Última actualización:** 2026-06-12 por Codex (TASK-1090)
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

## Ingerir el corpus piloto (TASK-1082)

La ingesta toma los 15 documentos del corpus piloto (manifest `src/lib/knowledge/ingestion/pilot-corpus.ts`), los normaliza a chunks, los sanitiza y los publica en `greenhouse_knowledge`. Fuente actual: **archivos markdown del repo** (`repo_docs`). El connector Notion llega en TASK-1088.

Siempre correr **dry-run primero**, revisar los conteos, y solo después `--apply`:

```bash
# Cargar credenciales (ADC + PG) y correr dry-run (no escribe; lee para idempotencia)
set -a && source .env.local && set +a
npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/knowledge/ingest.ts

# Aplicar (registra el source, abre un sync run y publica versiones idempotentes)
npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/knowledge/ingest.ts --apply
```

El reporte muestra por documento: `PUBLISHED` (n chunks · v#), `SKIPPED_UNCHANGED` (mismo checksum), `QUARANTINED` (el sanitizer detectó secretos/PII/prompt-injection), `SKIPPED_UNAVAILABLE` (to-author / archivo faltante) o `FAILED`.

### Qué significan / qué cuidar

- **Idempotente:** re-correr `--apply` no duplica. Solo publica una versión nueva si el checksum del contenido cambió.
- **Cuarentena:** un documento flagged NO se chunkea ni se vuelve recuperable; queda `quarantined` con la razón en el run. Remediá la fuente (sacá el secreto) y re-ingerí.
- **Solo el source piloto:** `knowledge_sources.sync_enabled` está en `FALSE` por default; producción se mantiene deshabilitada hasta aprobación humana.
- **No** ingerir contenido con secretos/tokens reales — el sanitizer los pone en cuarentena, pero el principio es no meterlos.

> Observabilidad: dos reliability signals en `/admin/operations` (módulo Knowledge Platform): `knowledge.publication.quarantine_count` y `knowledge.sync.failed_source` (ambos steady=0).

## Referencias técnicas

- Schema: `migrations/*_task-1081-knowledge-core-schema.sql`
- Capabilities: `migrations/*_task-1081-knowledge-capabilities-registry-seed.sql` + `src/config/entitlements-catalog.ts` + `src/lib/entitlements/runtime.ts`
- Helpers: `src/lib/knowledge/` (ingesta en `src/lib/knowledge/ingestion/` + `src/lib/knowledge/sanitization/`)
- CLI de ingesta: `scripts/knowledge/ingest.ts`
- Arquitectura: [GREENHOUSE_KNOWLEDGE_PLATFORM_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_KNOWLEDGE_PLATFORM_ARCHITECTURE_V1.md)

## Revisar el mockup de respuesta trazable (TASK-1089)

Para validar la experiencia visual antes del wiring real:

```bash
pnpm dev
pnpm fe:capture knowledge-answer-trace --env=local
```

Ruta local: `/knowledge/mockup/answer-trace`.

Qué revisar:

- Antes de preguntar, la surface debe mostrar solo el composer glow de Nexa; no debe aparecer respuesta ni proof panel prematuro.
- La pregunta debe quedar visible como burbuja de usuario.
- Nexa debe responder debajo con fuentes y warning honesto cuando no consulta datos actuales.
- El composer glow debe quedar debajo de la respuesta para follow-up.
- El panel `Fuentes | Cómo llegó | Paquete | Revisión` debe seguir visible y legible.
- El scenario envía la pregunta con `Enter` para cubrir el flujo de teclado; los frames post-pregunta son full-page para evitar artefactos de recorte con headers sticky.

No usar este mockup como prueba de retrieval real: aún usa data mock tipada y no llama `searchKnowledge`.

Nota operativa para QA de Nexa: cuando una respuesta viene desde `search_knowledge`, las fuentes deben verse iguales en el chat y en Answer Trace porque ambas superficies consumen `NexaEvidencePanel`. Al reabrir un thread histórico, la evidence card debe reaparecer si el mensaje persistió `tool_invocations`; si no, el thread debe seguir legible como texto sin bloquear la conversación.

## Usar y validar Knowledge con lentes Humano / Nexa / MCP (TASK-1084 + TASK-1090)

Ruta local/runtime: `/knowledge`.

Qué debe pasar:

- La página muestra un selector persistente **Humano | Nexa | MCP**. Cambiar de lente no debe sentirse como navegar a otra herramienta.
- En **Humano**, la caja glow permite buscar guías publicadas en Knowledge; la lista permite seleccionar y leer una fuente sin abrir otra experiencia.
- En **Nexa**, la AnswerSurface empieza en modo AI Mode limpio: solo composer glow. Después de preguntar muestra pregunta como burbuja, avatar de Nexa después de la pregunta, respuesta con fuentes, proof panel y composer glow descendido para follow-up.
- En **MCP**, la página muestra URI/resource y paquete de evidencia para agentes, sin datos mock.
- El inspector muestra owner, fuente, vigencia, política IA y un bloque **Evidencia compartida con Nexa**.
- **Continuar con Nexa** abre el Nexa flotante existente; no debe montar un chat paralelo dentro del Workbench.
- El feedback de la guía se envía por el endpoint compartido de Knowledge.

Validación visual local:

```bash
pnpm dev
pnpm fe:capture knowledge-lenses --env=local
pnpm fe:capture knowledge-answer-trace --env=local
```

La captura `knowledge-lenses` valida la ruta productiva conectada: Humano default → Nexa pregunta → MCP packet. La captura `knowledge-answer-trace` protege el mockup baseline para asegurar que la AnswerSurface aprobada no se perdió.

Evidencia de implementación TASK-1090: `.captures/2026-06-12T18-50-06_knowledge-lenses` y `.captures/2026-06-12T18-50-07_knowledge-answer-trace`.

No validar el lente Humano como “Nexa respondió”: Humano es exploración documental. La respuesta conversacional vive en el lente Nexa y usa el mismo `NexaEvidencePanel` para que la transición se sienta continua.

## Nexa y el conocimiento (TASK-1085 — code complete local, detrás de flag)

Nexa puede responder dudas de proceso/política/definición **recuperando del corpus gobernado y citando** la fuente, pero está **detrás del flag `NEXA_KNOWLEDGE_RETRIEVAL_ENABLED` (default apagado)** — no está activo en producción todavía.

Cómo funciona cuando se active:

- Solo se ofrece a usuarios internos con el grant agéntico (no a clientes).
- Nexa busca en Knowledge antes de responder; cita la fuente (ej. "Manual de ICO [2]") y, si no encuentra documentación, lo dice con honestidad en vez de inventar.
- Si una fuente está desactualizada (`stale`/`deprecated`), Nexa lo declara en la respuesta.
- Nunca afirma tu estado operativo real (tu ICO, tu nómina): el conocimiento explica **cómo** funciona algo; para tu dato real, te remite al módulo operativo.

Estado de la experiencia:

- En código local, el thread de Nexa ya puede mostrar una tarjeta de **Prueba y trazabilidad** debajo de la respuesta cuando el tool `search_knowledge` devuelve un packet `knowledge-search.v1`.
- Esa tarjeta muestra confianza, vigencia, fragmentos usados, fuentes y acceso a la fuente; el feedback se envía al contrato compartido de Knowledge.
- No actives el flag sin coordinación: requiere el corpus piloto cargado (TASK-1082) y la firma del approver de dominio para temas sensibles (finance/payroll/legal/security).

Observabilidad (cuando esté activo): en Admin > Ops Health, módulo **Knowledge**, las señales `knowledge.nexa.no_source_answer_rate` (cuántas preguntas no encuentran documentación → huecos de cobertura), `knowledge.nexa.stale_source_retrievals` (respuestas apoyadas en docs vencidos → revisar/actualizar) y `knowledge.retrieval.low_citation_rate` (respuestas sin citas renderizables).

## Production readiness de Nexa Knowledge (TASK-1092)

Antes de activar `NEXA_KNOWLEDGE_RETRIEVAL_ENABLED` en producción, cada respuesta grounded de Nexa debe conservar trazabilidad visible:

- Si `search_knowledge` devuelve fragmentos (`chunks.length > 0`) con `confidence != 'none'`, Nexa debe usar marcadores inline `[n]` ligados al fragmento recuperado y cerrar con `Fuentes: [n] = citationLabel`.
- Si el modelo omite los marcadores, `NexaService` agrega un bloque determinístico `Fuentes:` derivado del packet `knowledge-search.v1`. Ese fallback no inventa dónde iba la cita en la frase; solo deja la evidencia visible.
- Si `confidence='none'` o no hay chunks, Nexa no fabrica fuentes ni procedimientos. Debe responder con gap honesto.
- En temas sensibles (finanzas, nómina, legal, seguridad o compromisos contractuales), la respuesta debe citar y pedir validación humana cuando corresponda.

La matriz QA canonizada se ejecuta así:

```bash
# Staging, con agent-session y bypass de Vercel
pnpm qa:nexa-knowledge -- --env=staging --json

# Local, si el servidor local fue levantado con el flag de Knowledge encendido
pnpm qa:nexa-knowledge -- --env=local --case=K1,K2,G1
```

Interpretación importante: la pregunta sobre **modo mantenimiento** fue un coverage-gap de manifest/ingesta, no de ranking. El manual existe en `docs/manual-de-uso/plataforma/modo-mantenimiento.md` y ahora está incluido en `src/lib/knowledge/ingestion/pilot-corpus.ts`; falta re-ingerir el corpus y correr QA K5 en staging para probar recuperación real.

Production sigue OFF hasta que la matriz staging pase post-deploy, se revisen las señales `knowledge.retrieval.low_citation_rate`, `knowledge.nexa.no_source_answer_rate` y `knowledge.nexa.stale_source_retrievals`, y el operador apruebe el flip.
