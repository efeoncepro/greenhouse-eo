# TASK-1090 — Answer Trace mockup → runtime: blueprint de promoción

> **Renombrada 2026-06-12:** nació por error con el ID `TASK-1084` (colisión con el `TASK-1084` canónico = Human Knowledge Center MVP, registrado y bloqueado por TASK-1081). Es un **blueprint cross-program** (no un MVP ejecutable): reparte los paneles del mockup `answer-trace` entre TASK-1084 (reader/browse/feedback), TASK-1085 (respuesta + packet) y TASK-1086 (MCP). Conserva el ID 1090.
> **Tipo:** spec de ejecución (product-design + arquitectura). Companion de `TASK-1084-human-knowledge-center-mvp.md`.
> **Creado:** 2026-06-11 — synth de skills `arch-architect` + `greenhouse-ux` + `state-design` + `greenhouse-ux-writing`.
> **Mockup fuente:** `src/app/(dashboard)/knowledge/mockup/answer-trace/` (aprobado, GVC desktop+mobile, `design-qa.md` passed).
> **Contrato de datos:** `knowledge-search.v1` + endpoints de **TASK-1083** (la UI es cliente del contrato, nunca toca las tablas — Full API Parity #2).

Este documento es la lista de **todo lo que falta** para cablear el mockup `answer-trace` a runtime. NO es un permiso para bypassear TASK-1083: el mockup es el norte UX; el wireo de datos reales está bloqueado por la API.

---

## 0. Decisión de alcance — el mockup abarca 3 tasks, no solo 1084

El mockup es un **north-star del programa completo**, no el MVP de 1084. Sus paneles se reparten así (cablear cada uno **en su task**, no todo de una):

| Panel del mockup | Dueño | Por qué |
|---|---|---|
| Manual reader (lector de documento + secciones + salud del doc) | **TASK-1084** | Es "read" del browse/search/read |
| Learning path rail + contextual help hooks | **TASK-1084** | Rutas de aprendizaje + enlaces a manuales |
| Feedback panel | **TASK-1084** | Feedback humano sobre el doc |
| Browse/search (command bar en modo lista) | **TASK-1084** | Listado + búsqueda de docs publicados |
| Command center 3-modos (Humano/Nexa/MCP) + trace rail + **Respuesta verificable** | **TASK-1085** | Requiere generación de respuesta de Nexa (1084 lo declara *out of scope*) |
| Proof/trace tabs (Fuentes / **Packet** / **Evals**) | **TASK-1085** | Citas + `KnowledgeRetrievalPacket` + eval harness |
| "Para agentes" (MCP URI + packet) | **TASK-1086** | Superficie de consumo MCP |

**Regla dura:** el runtime de **1084** extrae el *reader + learning + feedback + browse/search*. El *answer-trace* (respuesta + prueba + 3-modos + packet) **espera a 1085/1086**. Mezclarlos en `/knowledge` antes de que exista la generación de respuesta = pintar un happy-path sin backend.

---

## 1. Contrato que la UI necesita de TASK-1083 (lo que falta)

La UI runtime NO consulta `knowledge_chunks`/`knowledge_documents` ni el `store` server-only. Consume estos contratos (los declara/owna TASK-1083, reader lane-agnóstico que recibe `subject`):

| # | Contrato | Alimenta | Estado |
|---|---|---|---|
| 1 | `GET /api/platform/app/knowledge/documents` (browse/list, filtros tipo/ruta/audience/status) → `{ items, total, page, pageSize }` con `owner, last_reviewed, freshness, publication_status, agentic_policy, source` | Listado + filtros del Knowledge Center (1084) | **Falta — TASK-1083 #1** |
| 2 | `GET /api/platform/app/knowledge/documents/[id]` (read-detail: versión publicada vigente + secciones por `heading_path` + metadata + document-health flags) | **Manual reader** (1084) | **GAP REAL — no existe; pertenece al reader SSOT de 1083** |
| 3 | `knowledge-search.v1` (reader, **modo humano**): query → chunks rankeados con `citation_anchor` + `ts_rank` confidence | Caja de búsqueda (1084) + sources de la respuesta (1085) | **Falta — TASK-1083 #2/#3** |
| 4 | `POST /api/platform/app/knowledge/feedback` con **enum canónico** de `knowledge_feedback` | Panel de feedback (1084) | **Falta — TASK-1083 #5** |
| 5 | answer/trace + `KnowledgeRetrievalPacket` + evals | Respuesta verificable + Packet + Evals | **TASK-1085 (no 1084)** |

El read-detail (#2) es el hallazgo: "browse/search/read" no tenía contrato para **leer el documento completo** (search devuelve chunks; browse devuelve lista). Sin él, el manual reader no tiene de dónde sacar el cuerpo. → agregar a TASK-1083.

---

## 2. State matrix — lo que el happy-path del mockup NO tiene (state-design)

El mockup pinta solo el estado **Default**. Cada superficie runtime debe shippear sus 12 estados relevantes. Lo crítico que falta:

### Browse/list (1084)
| Estado | UI | Copy es-CL |
|---|---|---|
| Loading | **skeleton** de filas (no spinner; preserva layout, evita CLS) — `role=status aria-busy="true"` | "Cargando documentos…" |
| Empty (zero) | EmptyState 5-elementos: icon + título + descripción + CTA | "Aún no hay documentos publicados. Cuando se publique uno, aparece aquí." |
| Empty (filtered) | reconocimiento + recuperación | "No hay resultados para `<query>`. Revisá la ortografía o limpiá los filtros." + "Limpiar filtros" |
| Error (retriable) | qué pasó + reintentar | "No pudimos cargar los documentos. Probá de nuevo." + Reintentar |
| Degraded (search caído, browse OK) | per-slot honesto: la caja de búsqueda muestra "Búsqueda no disponible" pero la lista funciona | banner sin romper la página |

### Read-detail / Manual reader (1084) — el de mayor riesgo
| Estado | UI | Copy |
|---|---|---|
| Loading | skeleton de artículo (secciones + cuerpo) | "Cargando documento…" |
| Error (permanent 404/410) | el doc fue deprecado/removido | "Este documento ya no existe." + link al reemplazo / volver |
| **Stale** (`publication_status='stale'`) | **banner honesto** arriba del cuerpo (no ocultar la fuente) | "Última revisión hace `<X>` · puede estar desactualizado." |
| **Deprecated** | banner de obsolescencia + puntero al vigente | "Documento obsoleto. Ver versión vigente." |
| **agent_excluded** (ortogonal) | badge "No usado por Nexa" — visible a humanos, fuera de retrieval agéntico | chip `agent_excluded` |
| Readonly | todo el Knowledge Center es read-only (no authoring en MVP) — sin botones de edición | — |
| Document-health "no se pudo resolver" | **"Pendiente"** + tooltip, NUNCA un check verde mentiroso | honest-degradation: nunca pintar OK cuando la verdad es "no sé" |

### Feedback (1084)
| Estado | UI |
|---|---|
| Optimistic submit | `useOptimistic`: aplicar local con `pending`, reconciliar/rollback con toast "No se pudo registrar tu feedback." |
| Success | Alert `role=status`: "Feedback registrado. Lo usamos para mejorar la guía y las respuestas de Nexa." |

### Acceso (1084)
| Estado | UI |
|---|---|
| Locked / permanent (tenant cliente) | redirect defensivo + **anti-oracle**: `notFound()` (404), nunca 403 que filtre existencia. El gating primario es server-side (viewCode + capability); el redirect es 2ª capa. |

**Honest-degradation (la skill lo endorsa fuerte):** el Alert del mockup *"No consulté datos actuales — esta respuesta usa guías publicadas"* es excelente y traza el límite **conocimiento (guías) ≠ datos operativos en vivo**. Es concepto de **1085** (generación de respuesta). En 1084 (sin respuesta generada) el equivalente honesto son los banners de freshness/stale/deprecated del reader.

---

## 3. Copy & i18n (greenhouse-ux-writing)

1. **Enum de feedback canónico** (el mockup inventó `incorrect` + usó `not-useful` con guión). Mapear a `knowledge_feedback` CHECK (TASK-1081):

   | enum DB | label es-CL |
   |---|---|
   | `useful` | "Útil" |
   | `not_useful` | "No tan útil" |
   | `stale` | "Desactualizado" |
   | `missing_doc` | "Falta info" |
   | `wrong_source` | "Fuente incorrecta" |

   El `incorrect` del mockup se descompone en `stale` + `wrong_source`. **NUNCA** un kind inventado en JSX.

2. **Tokenizar strings hardcodeados** que quedaron en el JSX del mockup (toleradas en mockup, las flagea `greenhouse/no-untokenized-copy` en runtime): "Owner", "Última revisión", "Seleccionado porque", "Ruta:", "Fuentes (2)", "Ver más fuentes filtradas (1)", "Salud del documento", "Encabezados estables", "Sin secretos / PII", "Contextual help hooks", "MCP URI", "KnowledgeRetrievalPacket", títulos de sección del manual ("1. Propósito"…) y el cuerpo de prosa del manual (este último viene del read-detail real, no del copy module). Destino: `GH_KNOWLEDGE_COPY` (ya existe en `src/lib/copy/knowledge.ts`).

3. **"Knowledge" se mantiene** como nombre propio de la surface (cerrado por TASK-1080) — no se traduce. El resto del copy es es-CL tuteo.

---

## 4. Token / primitive / a11y compliance (greenhouse-ux)

**Lo que el mockup ya hace bien** (conservar): primitives Greenhouse (`GreenhouseBreadcrumbs/Button/Chip/StatusDot/NexaAnimatedMark`), `CustomTextField`, tokens (`customBorderRadius.*`, `palette.*`, `alpha()`), `data-capture` para GVC, aria + `role=status aria-live`, 1 solo botón primario por header, color nunca como único indicador (chips llevan label + tono).

**A verificar/ajustar en runtime:**

- `variant='surfaceHeroTitle'` (page title) — confirmar que es variante canónica del SoT tipográfico (TASK-1038); si no, el page-title de producto es `h4` (Poppins 20).
- Skeletons nuevos (estado loading) deben matchear el tamaño del contenido final (anti-CLS) + `role=status aria-busy`.
- Targets interactivos ≥ 24×24px; focus ring 2px / 3:1; heading hierarchy sin saltos.
- Densidad: el mockup fusiona ~8 paneles; al extraer 1084 (reader + learning + feedback + browse) la página queda más respirable — bien. No grapar el answer-trace de 1085 hasta que exista.

---

## 5. Mecánica mockup → runtime (copy-and-patch + GVC baseline)

1. **Extraer el shell runtime fuera de `/mockup/`**: `src/views/greenhouse/knowledge/` (sin `/mockup`) por **copy-and-patch** del JSX aprobado → paridad visual estructural; solo cambian *data* (contrato 1083) y *commit*.
2. **`data.ts` → contrato**: el mock tipado se reemplaza por los readers de 1083. Los tipos del mock (`SourceExcerpt`, `PacketRow`, etc.) sirven de borrador del shape del contrato — confirmar contra `knowledge-search.v1`.
3. **GVC baseline**: promover el frame aprobado del mockup como baseline (`pnpm fe:capture:diff --promote` con `surfaceId`); el runtime con el mismo `surfaceId` corre el diff solo. **Cada estado nuevo** (loading/empty/degraded/stale/deprecated/agent_excluded) necesita su propia evidencia GVC — no están en el mockup.
4. **viewCode governance (TASK-827)**: `plataforma.knowledge` en `VIEW_REGISTRY` (TS) **+ migración seed en el mismo PR** + ruta alcanzable por nav (TASK-982). Sin esto el fallback heurístico emite ruido Sentry.

---

## 6. Plan de slices (orden duro)

| Slice | Task | Contenido | Gate |
|---|---|---|---|
| **0** | 1083 | Contrato: browse + **read-detail** + `knowledge-search.v1` (modo humano) + feedback + lint `no-direct-knowledge-chunk-query` | API tipada + tests |
| **1** | 1084 | Shell `/knowledge`: viewCode seed + nav + guard + redirect defensivo; browse/list contra contrato; estados loading/empty/error/degraded | GVC desktop+mobile + baseline diff |
| **2** | 1084 | Read-detail (manual reader) contra `documents/[id]`; banners stale/deprecated/agent_excluded; document-health honesto; learning paths + contextual help hooks | GVC + estados |
| **3** | 1084 | Feedback contra `POST /feedback`, enum canónico, optimistic + rollback | GVC + smoke |
| **4+** | 1085 | Command center 3-modos + trace + respuesta verificable + Fuentes/Packet/Evals | (otra task) |
| **5+** | 1086 | "Para agentes": MCP URI + packet | (otra task) |

---

## 7. Acceptance del cableado (1084)

- [ ] La UI consume **solo** los endpoints/contrato de 1083; cero query directa a `knowledge_chunks`/`knowledge_documents` (lint activa cubre `src/views/greenhouse/knowledge/**`).
- [ ] Los 12 estados relevantes por superficie están diseñados (no solo Default): loading/empty-zero/empty-filtered/error/degraded en browse; stale/deprecated/agent_excluded/404/readonly en reader; optimistic/success/error en feedback.
- [ ] Honest-degradation: ningún slot pinta OK/verde cuando la verdad es "no se pudo resolver" → "Pendiente" + tooltip.
- [ ] Feedback usa el enum canónico de `knowledge_feedback`; cero kind inventado.
- [ ] Strings tokenizados en `GH_KNOWLEDGE_COPY`; `greenhouse/no-untokenized-copy` limpio.
- [ ] viewCode `plataforma.knowledge` + migración seed (mismo PR, TASK-827) + ruta alcanzable por nav (TASK-982).
- [ ] Acceso: tenant cliente → `notFound()` (anti-oracle), no 403.
- [ ] GVC desktop+mobile mirada por estado nuevo + baseline diff del happy-path.

---

## 8. Hard rules

- **NUNCA** cablear `data.ts` del mockup directo a runtime — pasa por el contrato 1083.
- **NUNCA** grapar el answer-trace (respuesta + packet + 3-modos) a `/knowledge` antes de TASK-1085 — es generación de respuesta de Nexa, *out of scope* de 1084.
- **NUNCA** shippear el reader sin los banners stale/deprecated/agent_excluded — un doc obsoleto sin warning es deuda de confianza.
- **NUNCA** pintar un check verde de "salud del documento" cuando la señal no se pudo resolver.
- **NUNCA** modificar el mockup bajo `/mockup/` — es la referencia aprobada + escenario GVC. El runtime vive fuera de `/mockup/` e **iguala** visualmente.
- **SIEMPRE** cada estado nuevo (no presente en el mockup) pasa por el loop product-design (`state-design`/`greenhouse-ux`) + GVC antes de pintarse.
