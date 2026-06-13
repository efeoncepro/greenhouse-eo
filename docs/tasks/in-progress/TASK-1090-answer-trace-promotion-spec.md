# TASK-1090 — Answer Trace mockup → runtime: Knowledge lenses promotion

## Status

Lifecycle: in-progress
Priority: P1
Effort: Medio
Type: implementation
Domain: platform|content|ui|nexa|knowledge
Branch: develop (operator override; no branch switch in shared worktree)
Owner: Codex UI

> **Renombrada 2026-06-12:** nació por error con el ID `TASK-1084` (colisión con el `TASK-1084` canónico = Human Knowledge Center MVP, registrado y bloqueado por TASK-1081). Conserva el ID 1090.
> **Corrección 2026-06-12:** deja de ser solo un blueprint repartidor. Pasa a ser la **spec de reconciliación/promoción** que debe convertir `/knowledge` en la promoción runtime del mockup aprobado `answer-trace`.
> **Corrección Product Design 2026-06-12:** después de comparar con GVC `/knowledge` y `/knowledge/mockup/answer-trace`, la promoción ya no significa reemplazar toda la experiencia humana por Answer Trace. La decisión vigente es: `/knowledge` mantiene **Humano** como default documental, y Answer Trace se integra como el modo **Nexa** dentro de la misma ruta.
> **Tipo:** spec de ejecución (product-design + arquitectura). Companion de `TASK-1084-human-knowledge-center-mvp.md`.
> **Creado:** 2026-06-11 — synth de skills `arch-architect` + `greenhouse-ux` + `state-design` + `greenhouse-ux-writing`.
> **Mockup fuente:** `src/app/(dashboard)/knowledge/mockup/answer-trace/` (aprobado, GVC desktop+mobile, `design-qa.md` passed).
> **Contrato de datos:** `knowledge-search.v1` + endpoints de **TASK-1083** (la UI es cliente del contrato, nunca toca las tablas — Full API Parity #2).

Este documento gobierna cómo reconciliar el mockup `answer-trace` con `/knowledge` runtime. NO es un permiso para bypassear TASK-1083: el mockup es el norte UX del **modo Nexa**, pero todo runtime usa contratos reales.

---

## Delta 2026-06-12c — Decisión Product Design: una ruta, tres lentes

GVC comparó las dos surfaces vigentes:

- `/knowledge` (`knowledge-workbench`) pasa como experiencia humana/documental: búsqueda, rutas, guías, detalle, vigencia y feedback. Riesgo detectado: la caja superior dice "Pregúntale a Nexa" aunque el comportamiento real es búsqueda humana.
- `/knowledge/mockup/answer-trace` (`knowledge-answer-trace`) pasa como experiencia conversacional: pregunta como burbuja, Nexa responde, evidence/proof panel y composer descendido. GVC no reportó findings de calidad en el mockup.

Decisión:

- `/knowledge` sigue siendo la ruta productiva única.
- El default al entrar es **Humano**: centro documental para explorar, buscar y leer Knowledge.
- **Nexa** usa la coreografía de Answer Trace dentro de `/knowledge`, no como ruta productiva separada.
- **MCP** es lente técnica/complementaria: paquete, URI/resource y trazabilidad para agentes, solo con contratos reales.
- Los botones `Humano | Nexa | MCP` dejan de ser ornamentales y se vuelven un switch real de experiencia.

Rationale:

- El usuario humano que entra a Knowledge puede no querer conversar; puede querer leer una guía, revisar vigencia o navegar rutas.
- Answer Trace es más fuerte cuando hay intención de pregunta/respuesta, no como biblioteca default.
- Una sola ruta evita duplicidad de producto, pero tres lentes evitan mezclar jobs incompatibles en una misma composición.

Implicación de implementación:

- En modo Humano, la caja debe decir "Buscar guías en Knowledge" y actualizar la exploración documental.
- En modo Nexa, la caja debe decir "Pregúntale a Nexa" y activar la experiencia Answer Trace.
- En modo MCP, la UI debe mostrar contratos/resource/evidence de forma honesta; si un dato no existe en contrato real, se degrada sin mock.

---

## Delta 2026-06-12d — Implementación Codex: coherencia Humano/Nexa/MCP sin perder AnswerSurface

Se implementó el primer slice runtime de `TASK-1090` sobre `/knowledge`:

- `/knowledge` ahora tiene un selector persistente **Humano | Nexa | MCP** arriba de la surface. El selector es el marco común de la experiencia; cada lente cambia el contenido, no la navegación mental del usuario.
- **Humano** conserva la experiencia documental de `TASK-1084`: búsqueda de guías, rutas, lista, inspector, evidencia compartida y feedback.
- **Nexa** consume `NexaKnowledgeAnswerSurface` como Answer Trace real dentro de `/knowledge`: pregunta como burbuja, avatar de Nexa después de la pregunta, respuesta con fuentes, composer glow descendido y proof panel `Fuentes | Cómo llegó | Paquete | Revisión`.
- **MCP** consume el mismo evidence packet/resource URI sin mockear datos técnicos.
- `NexaKnowledgeAnswerSurface` sumó `showModeSelector?: boolean` con default `true`. El mockup `/knowledge/mockup/answer-trace` no cambia; `/knowledge` lo usa en `false` porque el shell de Knowledge gobierna el selector común.
- `NexaEvidencePanel` y `NexaKnowledgeAnswerSurface` recibieron hardening responsive (`minmax(0, 1fr)`, `minInlineSize: 0`, wrapping/truncation controlado) para evitar clipping en mobile con fuentes largas.
- Se agregó `knowledge-lenses.scenario.ts` como GVC canónico del flujo conectado: Humano default → Nexa pregunta → MCP packet.

Evidencia:

- `pnpm fe:capture knowledge-lenses --env=local` → `.captures/2026-06-12T18-50-06_knowledge-lenses` (desktop/mobile OK).
- `pnpm fe:capture knowledge-answer-trace --env=local` → `.captures/2026-06-12T18-50-07_knowledge-answer-trace` (mockup baseline OK).
- `pnpm exec eslint src/views/greenhouse/knowledge/KnowledgeCenterView.tsx src/components/greenhouse/primitives/NexaKnowledgeAnswerSurface.tsx src/components/greenhouse/primitives/NexaEvidencePanel.tsx scripts/frontend/scenarios/knowledge-lenses.scenario.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm exec vitest run src/components/greenhouse/primitives/__tests__/NexaKnowledgeAnswerSurface.test.tsx`

Guardrail multi-agente: se preservó WIP ajeno en `src/config/nexa-models.ts` y `.playwright-mcp/`; no se hizo stash/clean/restore amplio.

---

## Delta 2026-06-12e — Corrección UX: Nexa debe conservar el patrón Google AI Mode

Feedback del operador: la primera integración hizo que el lente Nexa se sintiera demasiado absorbido por el Workbench de Knowledge y cambió la experiencia aprobada de AnswerSurface.

Contrato corregido:

- En **idle**, Nexa muestra solo el composer glow/entrada conversacional. No hay respuesta, proof panel ni trace rail antes de que exista una pregunta.
- Al preguntar, la pregunta sube como burbuja, Nexa aparece después con identidad/avatar, la respuesta se despliega hacia abajo y el composer glow baja debajo de la respuesta para follow-up.
- Las cards superiores de intento/retrieval no interrumpen la conversación; la trazabilidad vive dentro del proof panel.
- `/knowledge/mockup/answer-trace` sigue como baseline visual de la AnswerSurface y `/knowledge` debe consumir esa coreografía, no reimaginarla como una card documental.

Implementación:

- `NexaKnowledgeAnswerSurface` ahora protege el estado idle limpio: `conversationStarted=false` renderiza solo el composer superior y estado ligero.
- `NexaKnowledgeAnswerSurface.showTraceRail` queda opt-in y default `false`; la información de trace se mantiene en `NexaEvidencePanel`/proof panel.
- El scenario `knowledge-answer-trace` valida primero el idle composer y solo después del submit captura conversation lane + proof panel.

Evidencia:

- `pnpm fe:capture knowledge-answer-trace --env=local` → `.captures/2026-06-12T19-42-37_knowledge-answer-trace`.
- `pnpm fe:capture knowledge-lenses --env=local` → `.captures/2026-06-12T19-42-38_knowledge-lenses`.

---

## Delta 2026-06-12 — Corrección de reconciliación: Answer Trace gobierna el modo Nexa de `/knowledge`

La primera implementación de `TASK-1084` aterrizó `/knowledge` como un **Knowledge Workbench** funcional: browse/search/read/feedback, access/nav/viewCode, adapters de evidencia y GVC. Eso es útil como sustrato, pero **no debe canonizarse como la experiencia final**.

La experiencia más trabajada y aprobada del programa para **Nexa** es `/knowledge/mockup/answer-trace`. Por eso, `TASK-1090` debe reconciliar el rumbo:

- `/knowledge/mockup/answer-trace` queda como **source visual aprobado** y baseline GVC.
- `/knowledge` es la **ruta productiva única**; cuando se promueva Answer Trace, no nace otra ruta ni otra Knowledge.
- Answer Trace no reemplaza el modo Humano: se convierte en la lente **Nexa** dentro de `/knowledge`.
- El Workbench actual de `TASK-1084` se reutiliza como **infraestructura funcional**: endpoints, estados, reader, feedback, evidence adapter y access.
- El layout dominante del modo **Nexa** debe recomponerse desde Answer Trace por copy-and-patch, no crear un chat paralelo.
- La salida final debe sentirse como **Knowledge con lentes reales**: Humano documental default, Nexa conversacional y MCP técnico.

Estado real que cambia el plan original:

- `TASK-1083` ya entrega `documents`, `search?mode=human`, `documents/:id` y `feedback`.
- `TASK-1085` ya entrega Nexa retrieval con citas detrás de flag.
- `TASK-1086` ya entrega el lane MCP/ecosystem read-only sobre el mismo SSOT de Knowledge.
- `TASK-1093` ya entrega `ConversationalEvidencePacket` (`nexa-evidence.v1`) y `NexaEvidencePanel`.
- `NexaKnowledgeAnswerSurface` ya existe como composition primitive de Answer Trace.

División de ownership del programa:

- **Claude**: backend, contratos, readers, retrieval, MCP/resources, QA backend y señales runtime.
- **Codex**: UI, promoción visual, composición runtime, microinteracciones, UX writing, GVC y reconciliación del mockup aprobado con `/knowledge`.

Por lo tanto, ya no es correcto decir simplemente "answer-trace espera a 1085/1086". Lo correcto es: `TASK-1090` promueve la coreografía Answer Trace como lente **Nexa** de `/knowledge`, usando las piezas reales disponibles entregadas por el backend de Claude, y degrada honestamente cualquier lente que el ambiente activo todavía no pueda resolver. Codex **no reimplementa backend** en esta task; si una respuesta/API falla, se documenta el drift y se coordina con el owner backend.

---

## 0. Decisión de alcance corregida — `TASK-1090` integra Answer Trace como modo Nexa de `/knowledge`

El mockup sigue abarcando el programa completo, pero el punto de integración ya no es repartirlo y olvidarlo: `TASK-1090` debe convertirlo en la composición principal del modo **Nexa** dentro de `/knowledge`.

| Panel del mockup | Dueño | Por qué |
|---|---|---|
| Shell visual, caja glow, pregunta como burbuja, respuesta/evidencia y composer descendido | **TASK-1090** | Es la promoción del mockup aprobado como modo Nexa de `/knowledge`. |
| Manual reader, learning path rail, contextual help hooks y feedback | **TASK-1084 como sustrato; TASK-1090 recompone** | Ya hay implementación funcional; permanece en el modo Humano y puede aparecer como soporte bajo Nexa/MCP cuando aporte contexto. |
| Browse/search humano contra contratos app | **TASK-1084 como sustrato; TASK-1090 recompone** | Alimenta el modo Humano; no debe tener copy de "pregúntale a Nexa" si su comportamiento es search documental. |
| Respuesta verificable, fuentes y evidence panel | **TASK-1085 + TASK-1093; TASK-1090 integra** | Ya existen retrieval/evidence primitives; usar `NexaKnowledgeAnswerSurface` + `NexaEvidencePanel`, sin inventar renderer paralelo. |
| Packet / Evals / MCP lens | **TASK-1086 backend + TASK-1090 UI** | Codex solo compone la lente visual con contratos reales. Si el ambiente no puede resolver algo, disabled/degraded honesto; nunca mock. |

**Regla dura corregida:** `/knowledge` no debe quedar como un Workbench independiente con tabs decorativas, ni como un chat que borra la experiencia humana. Debe ser una ruta con lentes reales: **Humano** para Knowledge documental, **Nexa** para Answer Trace conversacional y **MCP** para consumo técnico/agéntico. Lo que no tenga backend real se degrada de forma explícita; no se rellena con mock data.

---

## 1. Contrato que la UI necesita de TASK-1083 (lo que falta)

La UI runtime NO consulta `knowledge_chunks`/`knowledge_documents` ni el `store` server-only. Consume estos contratos (los declara/owna TASK-1083, reader lane-agnóstico que recibe `subject`):

| # | Contrato | Alimenta | Estado |
|---|---|---|---|
| 1 | `GET /api/platform/app/knowledge/documents` (browse/list, filtros tipo/ruta/audience/status) → `{ items, total, page, pageSize }` con `owner, last_reviewed, freshness, publication_status, agentic_policy, source` | Listado + filtros del Knowledge Center (1084) | **Falta — TASK-1083 #1** |
| 2 | `GET /api/platform/app/knowledge/documents/[id]` (read-detail: versión publicada vigente + secciones por `heading_path` + metadata + document-health flags) | **Manual reader** (1084) | **GAP REAL — no existe; pertenece al reader SSOT de 1083** |
| 3 | `knowledge-search.v1` (reader, **modo humano**): query → chunks rankeados con `citation_anchor` + `ts_rank` confidence | Caja de búsqueda (1084) + sources de la respuesta (1085) | **Falta — TASK-1083 #2/#3** |
| 4 | `POST /api/platform/app/knowledge/feedback` con **enum canónico** de `knowledge_feedback` | Panel de feedback (1084) | **Falta — TASK-1083 #5** |
| 5 | answer/trace + `KnowledgeRetrievalPacket` + evals | Respuesta verificable + Packet + Evals | **Base disponible vía TASK-1085/1093; TASK-1090 integra en `/knowledge`** |

El read-detail (#2) es el hallazgo: "browse/search/read" no tenía contrato para **leer el documento completo** (search devuelve chunks; browse devuelve lista). Sin él, el manual reader no tiene de dónde sacar el cuerpo. → agregar a TASK-1083.

> Nota de actualización 2026-06-12: esta tabla mantiene la historia del gap original. En el runtime actual los endpoints app de `TASK-1083` ya existen. Si alguna fila sigue marcada como "Falta", el agente que ejecute `TASK-1090` debe contrastar contra código real y actualizar la tabla antes de implementar, no obedecer estado stale.

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
- Densidad: el mockup fusiona ~8 paneles; al promoverlo no se deben apilar todos con igual peso. Answer Trace gobierna el primer plano del lente **Nexa**; reader + learning + feedback viven como rails/paneles secundarios o en el lente **Humano**.

---

## 5. Mecánica mockup → runtime (copy-and-patch + GVC baseline)

1. **Promover el shell de Answer Trace a `/knowledge`**: partir del JSX aprobado en `src/views/greenhouse/knowledge/mockup/answer-trace/KnowledgeAnswerTraceMockupView.tsx` por copy-and-patch hacia `src/views/greenhouse/knowledge/` (sin `/mockup`). La paridad visual manda; solo cambian data source, estados y acciones reales.
2. **Reubicar el Workbench existente como soporte**: conservar readers/API wiring/feedback/adapters de la implementación de `TASK-1084`, pero moverlos a rails/paneles/slots dentro de Answer Trace. No dejar un segundo layout dominante.
3. **`data.ts` → contrato real**: todo mock tipado se reemplaza por `documents`, `search?mode=human`, `documents/:id`, `feedback`, `knowledge-search.v1` y `nexa-evidence.v1`. Si un dato del mock no existe en contrato real, se degrada con copy honesto o se documenta como follow-up, no se inventa.
4. **Answer surface canónica**: usar `NexaKnowledgeAnswerSurface` / `NexaEvidencePanel` / `NexaComposer` existentes. No crear `KnowledgeAnswerPanel`, `TraceCard2`, `OverviewCard` ni otro renderer paralelo.
5. **GVC baseline**: promover el frame aprobado del mockup como baseline (`surfaceId=knowledge-answer-trace`) y correr diff contra `/knowledge`. **Cada estado nuevo** (loading/empty/degraded/stale/deprecated/agent_excluded) necesita evidencia GVC propia.
6. **viewCode governance (TASK-827)**: `plataforma.knowledge` en `VIEW_REGISTRY` (TS) **+ migración seed en el mismo PR** + ruta alcanzable por nav (TASK-982). Sin esto el fallback heurístico emite ruido Sentry.

---

## 6. Plan de slices (orden duro)

| Slice | Task | Contenido | Gate |
|---|---|---|---|
| **0** | 1083 | Contrato: browse + **read-detail** + `knowledge-search.v1` (modo humano) + feedback + lint `no-direct-knowledge-chunk-query` | API tipada + tests |
| **1** | 1084 | Sustrato `/knowledge`: viewCode seed + nav + guard + redirect defensivo; browse/list/read/feedback contra contrato | Ya iniciado; no canonizar layout como final |
| **2** | 1090 | Recompose `/knowledge` desde Answer Trace mockup: first fold, caja glow, pregunta/respuesta/evidencia, composer descendido | GVC diff mockup → runtime |
| **3** | 1090 | Integrar sustrato 1084 como rails/paneles: manual reader, learning paths, feedback, freshness/agent_excluded | GVC desktop/mobile + estados |
| **4** | 1090 UI sobre 1085/1093 backend | Evidence real: `knowledge-search.v1` → `nexa-evidence.v1` → `NexaEvidencePanel`; fallback honesto si no hay respuesta generada | Smoke con search real |
| **5** | 1090 UI sobre 1086 backend | Lens MCP/packet visual solo con contrato real; si el ambiente no responde, disabled/degraded con copy claro | Sin mock packet |

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
- [ ] `/knowledge` usa una estructura común de lentes: Humano documental default, Nexa con Answer Trace y MCP técnico. El Workbench/listado queda como el lente Humano, no como experiencia paralela.
- [ ] `/knowledge/mockup/answer-trace` permanece como baseline/lab o queda claramente marcado como referencia, nunca como ruta productiva alternativa.
- [ ] Codex no reimplementa backend ni crea endpoints nuevos en esta task; consume lo entregado por Claude y documenta cualquier drift real.

---

## 8. Hard rules

- **NUNCA** cablear `data.ts` del mockup directo a runtime — pasa por el contrato 1083.
- **NUNCA** canonizar un Workbench paralelo si el mockup Answer Trace sigue siendo el source aprobado para Nexa. La promoción correcta es una sola ruta `/knowledge` con lentes reales y Answer Trace como lente **Nexa**.
- **NUNCA** rellenar Answer Trace con mock data en `/knowledge`; si falta una pieza real, disabled/degraded honesto o follow-up.
- **NUNCA** reabrir backend dentro de `TASK-1090` salvo bug mínimo bloqueante acordado con el owner; esta task es UI promotion sobre contratos ya entregados por Claude.
- **NUNCA** shippear el reader sin los banners stale/deprecated/agent_excluded — un doc obsoleto sin warning es deuda de confianza.
- **NUNCA** pintar un check verde de "salud del documento" cuando la señal no se pudo resolver.
- **NUNCA** modificar el mockup bajo `/mockup/` — es la referencia aprobada + escenario GVC. El runtime vive fuera de `/mockup/` e **iguala** visualmente.
- **SIEMPRE** cada estado nuevo (no presente en el mockup) pasa por el loop product-design (`state-design`/`greenhouse-ux`) + GVC antes de pintarse.
