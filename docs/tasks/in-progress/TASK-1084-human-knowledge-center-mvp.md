# TASK-1084 — Human Knowledge Center MVP

## Delta 2026-06-12 — Garantía de sinergia: expande la Knowledge conversacional, no crea otra Knowledge

Codex implementó el runtime `/knowledge` como **Knowledge Workbench humano** complementario a la experiencia conversacional existente. La regla de producto queda explícita: `/knowledge` sirve para buscar, navegar, leer y auditar guías publicadas; cuando el usuario quiere seguir conversando, la experiencia sube al **mismo Nexa flotante** y comparte la misma evidencia. No nace un segundo chat ni una segunda Knowledge paralela.

Garantías aplicadas en código:

- El input principal usa la primitive compartida `NexaComposer kind='knowledgeAsk'` como búsqueda humana, no un input local ni un runtime conversacional nuevo.
- La UI consume solo los contratos app de `TASK-1083`: `documents`, `search?mode=human`, `documents/:id` y `feedback`; no consulta tablas ni helpers server-only desde la view.
- El inspector adapta el resultado de búsqueda `knowledge-search.v1` o el detalle de documento a `ConversationalEvidencePacket` (`nexa-evidence.v1`) y renderiza `NexaEvidencePanel`, el mismo renderer usado por Nexa Chat / AnswerSurface.
- `NexaContextScope` declara el contexto de la guía seleccionada y el CTA **Continuar con Nexa** dispara `NEXA_FLOATING_OPEN_EVENT`, abriendo el Nexa flotante existente sin importar el componente dentro del Workbench.
- Las cards técnicas del trace no se duplican en el Workbench: quedan como evidencia compartida compacta y acción de continuidad hacia Nexa.

Estado real: code-complete local, con migración seed para `plataforma.knowledge`, nav interna y scenario GVC `knowledge-workbench`. Queda pendiente commit/push y aplicar/deployar la migración en el ambiente objetivo antes de declarar la capacidad operativamente completa.

Evidencia:

- ESLint focal: `pnpm exec eslint src/views/greenhouse/knowledge/KnowledgeCenterView.tsx src/lib/copy/knowledge.ts src/components/greenhouse/NexaFloatingButton.tsx src/lib/nexa/floating-events.ts --max-warnings=0`
- Typecheck: `pnpm exec tsc --noEmit --pretty false`
- GVC desktop/mobile: `.captures/2026-06-12T17-38-24_knowledge-workbench`

## Delta 2026-06-12 — Toma Codex: Knowledge Workbench runtime

Codex toma la task después de confirmar que los blockers declarados ya están resueltos: `TASK-1081` y `TASK-1083` están `complete`, y los contratos app de Knowledge existen (`documents`, `search`, `documents/:id`, `feedback`). Se corrige el lifecycle a `in-progress` y `Blocked by: none`.

Visual target aprobado por el operador: **opción 1 — Knowledge Workbench** (`/Users/jreye/.codex/generated_images/019eb8d6-d806-7630-b501-83c1a9642d45/ig_0980ee85b51a9a06016a2c3caedf6c81919d2dcc0509a12e21.png`). El runtime debe ser `/knowledge`: search humano con `NexaComposer kind='knowledgeAsk'`, rutas de aprendizaje, lista/list-detail de documentos, inspector con metadata/freshness/source y feedback. No se construye chat nuevo ni se toca tablas directas.

## Delta 2026-06-12 — usar la primitive `NexaComposer` (no input custom) + borde con 1085

Codex canonizó la primitive **`NexaComposer`** (Primitive + Variants + Kinds, commit `78346c636`): variants `chat`/`command`, kinds `floatingChat`/`knowledgeAsk`/`globalCommand`, runtime-agnóstica (enchufa `@assistant-ui/react` por fuera vía `asChild`). Implicaciones duras para el runtime de 1084:

1. **La barra de comando/búsqueda usa `NexaComposer` kind `knowledgeAsk` (variant `command`)** — NO un `CustomTextField` custom ni el del mockup. Es la regla primitive-lookup del Figma Implementation Contract: existe la primitive → se usa/expande, no se forkea.
2. **En 1084 el composer dispara BÚSQUEDA modo `human`**: submit → `GET /api/platform/app/knowledge/search?mode=human` → render de browse / read-detail. **NO** cablear el runtime conversacional `@assistant-ui/react` (la variant `chat` + Nexa respondiendo con citas es **TASK-1085**). 1084 usa el composer como input de búsqueda gobernada, no como chat.
3. **El toggle 3-modos del mockup (Humano/Nexa/MCP)**: en el MVP humano **solo "Humano" está vivo**. "Nexa" = TASK-1085, "MCP" = TASK-1086. No prometer Nexa/MCP en 1084 (mostrarlos disabled/"próximamente" o no mostrarlos).
4. **`@assistant-ui/react` NO es dependencia de 1084.** El composer es runtime-agnóstico; 1084 lo consume como input controlado que dispara `searchKnowledge`. El runtime conversacional entra recién en 1085 (y merece su ADR ahí).

## Delta 2026-06-12 — TASK-1083 completa: el contrato existe (gap cerrado)

Los 4 contratos que el blueprint de promoción (`TASK-1090-answer-trace-promotion-spec.md`) declaró faltantes ya existen — incluido el **read-detail** que era el gap real:

- `GET /api/platform/app/knowledge/documents` (browse/list, access-guarded)
- `GET /api/platform/app/knowledge/search?mode=human` (packet `knowledge-search.v1`)
- `GET /api/platform/app/knowledge/documents/:id` (read-detail: versión vigente + secciones por `heading_path`; anti-oracle `notFound`) — alimenta el Manual reader
- `POST /api/platform/app/knowledge/feedback` (enum canónico `knowledge_feedback`)

El runtime de 1084 cablea **contra estos contratos**, nunca las tablas (lint `greenhouse/no-direct-knowledge-chunk-query`). El reader filtra modo `human` (ve `agent_excluded`, distinto de Nexa). `Blocked by` (TASK-1081, TASK-1083) satisfecho.

## Delta 2026-06-11

Naming/ruta/audiencia **cerrados por TASK-1080**:

- Surface humana = **Knowledge**, ruta única **`/knowledge`** (se descartan `/learn` y `/academy`). Ya no hace falta "confirmar nombre con operador".
- Gating: viewCode **`plataforma.knowledge`** (routeGroup `internal`) + capability `knowledge.document.read`. MVP **solo interno** (defensive redirect si `tenantType==='client'`).
- Estados a mostrar: `publication_status` (lifecycle, con badge `stale`/`deprecated`) + `agentic_policy` ortogonal (un doc puede ser `agent_excluded`).
- Ruta de aprendizaje inicial: **"Operación Greenhouse — Primeros pasos"** (docs #1, #3, #6, #7, #9, #10 del corpus piloto; ver arquitectura Delta tabla C).
- **Corpus ya ingerido (TASK-1082, 2026-06-11):** hay contenido real en `greenhouse_knowledge` en dev (11 docs publicados + 263 chunks) — el Knowledge Center se construye contra datos reales, no fixtures. Esta task SÍ siembra el viewCode `plataforma.knowledge` + la migración seed (gobernanza TASK-827) + la página `/knowledge`, que TASK-1081 difirió a aquí.

## Delta 2026-06-11 — Product Design prototype: Answer Trace Studio

Se construyó un mockup runtime local como base visual para el Human Knowledge Center: `/knowledge/mockup/answer-trace`. Es un **prototipo de diseño** con mock data tipado; no implementa todavía `/knowledge`, `plataforma.knowledge`, access real, API Platform ni datos productivos. La implementación final de esta task debe usarlo como norte UX, no como bypass de las dependencias de `TASK-1083`.

Archivos creados:

- `src/app/(dashboard)/knowledge/mockup/answer-trace/page.tsx`
- `src/views/greenhouse/knowledge/mockup/answer-trace/KnowledgeAnswerTraceMockupView.tsx`
- `src/views/greenhouse/knowledge/mockup/answer-trace/data.ts`
- `src/lib/copy/knowledge.ts`
- `design-qa.md`

Decisiones UX/UI capturadas:

- First fold orientado a una pregunta real: command bar, modo `Humano | Nexa | MCP`, trace rail, respuesta verificable y panel de prueba/trazabilidad.
- La pantalla prioriza **"respuesta con evidencia"** sobre dump documental: fuentes, packet y evals viven en tabs; la ruta de aprendizaje y lector humano quedan como soporte operativo.
- Estados de confianza/freshness y gap honesto son visibles (`No consulté datos actuales...`) para entrenar expectativas humanas y agentic.
- Feedback humano queda presente como acción de mejora, pero sin persistencia real todavía.
- Desktop usa split answer/proof; mobile apila trace steps para evitar clipping horizontal.
- Decisión de componentización: route-local con primitives existentes (`GreenhouseBreadcrumbs`, `GreenhouseButton`, `GreenhouseChip`, `GreenhouseStatusDot`, Vuexy/MUI). No nace primitive nueva; promover solo si otros surfaces repiten el patrón Answer Trace.

Evidencia GVC/Product Design QA:

- Desktop final: `.captures/2026-06-11T23-31-10_inline-knowledge-mockup-answer-trace/frames/01-snapshot.png`
- Mobile final: `.captures/2026-06-11T23-31-11_inline-knowledge-mockup-answer-trace/frames/01-snapshot.png`
- Comparación source visual vs implementación: `.captures/2026-06-11T23-31-10_inline-knowledge-mockup-answer-trace/comparison-source-vs-implementation.png`
- `design-qa.md` quedó con `final result: passed`.
- Validado con `pnpm exec tsc --noEmit --pretty false`, ESLint focal, `pnpm design:lint` y GVC desktop/mobile.

## Delta 2026-06-11 — Full API Parity hardening (pre-execution)

Revisado con arch-architect bajo el lente **Full API Parity** (decisión #16: la UI es cliente de un contrato gobernado, no la fuente de verdad). El Knowledge Center es el *consumidor* de la API de TASK-1083 — debe nacer como cliente estricto del contrato, **nunca** tocar `knowledge_chunks`/`knowledge_documents` directo ni llamar al `store` server-only desde una ruta ad-hoc. 5 ajustes:

1. **Secuencia / dependencia dura.** El *shell* (ruta `/knowledge`, nav, view, copy, scaffolding de learning paths, estados empty/degraded) puede construirse ya, pero **tipado contra `knowledge-search.v1`** (TASK-1083), no contra las tablas. El *wireo de datos reales* (browse/search/read/feedback) queda **bloqueado por TASK-1083** — no se mergea consumiendo tablas directo "mientras tanto". `Blocked by` pasa a `TASK-1081, TASK-1083`.

2. **La UI NO toca el corpus directo (Full API Parity #2).** Las operaciones consumen contratos, no SQL ni el `store`:
   - browse/list → `GET /api/platform/app/knowledge/documents` (TASK-1083 #1)
   - search → contrato `knowledge-search.v1`, **modo humano** (TASK-1083 #2)
   - feedback → `POST /api/platform/app/knowledge/feedback` (TASK-1083 #5), con el **enum canónico de `knowledge_feedback`** (TASK-1081 CHECK), nunca un kind inventado en JSX
   - La lint rule `greenhouse/no-direct-knowledge-chunk-query` (TASK-1083 #2) cubre también `src/views/greenhouse/knowledge/**`.

3. **Gap real — endpoint de read-detail.** "browse/search/read" no tiene contrato para *leer el documento publicado completo* (search devuelve chunks; browse devuelve lista). Falta `GET /api/platform/app/knowledge/documents/[id]` (versión publicada vigente + metadata, access-filtered server-side). **Pertenece al reader SSOT de TASK-1083** (ahí viven todos los query paths) → se declara como dependencia; NO se improvisa una query de detalle dentro de la view.

4. **viewCode seed governance como criterio duro (TASK-827).** Sembrar `plataforma.knowledge` en `VIEW_REGISTRY` (TS) **y** la migración seed en el MISMO PR, + ruta alcanzable por nav (TASK-982). Sube de prosa a Acceptance Criteria.

5. **Reader lane-agnóstico (Full API Parity #4).** La UI es lane `app` (interno): pasa el `subject` de sesión al contrato y el filtrado por audiencia/sensibilidad/`agentic_policy` lo hace el server (anti-tamper). El redirect defensivo `tenantType==='client'` se mantiene como segunda capa, no como el control primario.

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `in-progress`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Visual target aprobado; implementación runtime en curso`
- Rank: `TBD`
- Domain: `platform|content|ui|identity`
- Blocked by: `none`
- Branch: `develop` (excepción operativa: continuidad del programa Knowledge en checkout compartido)
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construir el MVP humano de Knowledge Platform: una surface interna para navegar, buscar y leer conocimiento publicado con rutas de aprendizaje, status/freshness, fuentes, feedback y enlaces contextuales básicos. No debe parecer un dump de Notion.

## Why This Task Exists

La capa humana es tan importante como Nexa: si solo hay RAG, las personas no aprenden ni pueden corregir fuentes. Greenhouse necesita un centro de conocimiento legible y operativo para transformar documentación en memoria de producto.

## Goal

- Crear la primera surface interna de Knowledge Center.
- Mostrar documentos publicados con metadata de owner, freshness, source y status.
- Capturar feedback humano y enlazar manuales/contextual help.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_KNOWLEDGE_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/ui-platform/PRIMITIVES.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`
- `DESIGN.md`

Reglas obligatorias:

- UI visible requiere skills UI aplicables y GVC.
- Debe usar view/capability model definido por `TASK-1080`.
- No crear copies reusables hardcodeadas en JSX.
- La surface es interna en MVP salvo decisión contraria.

## Normative Docs

- `docs/tasks/to-do/TASK-1080-knowledge-platform-acceptance-pilot-taxonomy.md`
- `docs/tasks/to-do/TASK-1081-knowledge-core-schema-source-registry.md`
- `docs/tasks/to-do/TASK-1083-knowledge-search-api-golden-questions.md`

## Dependencies & Impact

### Depends on

- `TASK-1081` para documentos/versiones (shell tipado contra el contrato).
- `TASK-1083` para **todo** query path real (browse, search, read-detail, feedback). No es condicional: la UI consume el contrato `knowledge-search.v1` + endpoints, nunca las tablas (Full API Parity #2).

### Blocks / Impacts

- Alimenta contextual help y feedback para `TASK-1085`.

### Files owned

- `src/app/(dashboard)/knowledge/**`
- `src/views/greenhouse/knowledge/**`
- `src/lib/copy/knowledge.ts`
- `scripts/frontend/scenarios/*knowledge*.ts`
- `docs/documentation/plataforma/knowledge-platform.md`
- `docs/manual-de-uso/plataforma/knowledge-platform.md`

## Current Repo State

### Already exists

- Ruta decidida por TASK-1080: **`/knowledge`** (se descartan `/learn` y `/academy`).
- No hay surface Knowledge Center runtime.

### Gap

- Humanos no tienen una superficie Greenhouse para aprender, buscar o corregir conocimiento publicado.

<!-- ZONE 2 — PLAN MODE: lo llena el agente que toma la task -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Internal browse/search/read

- Route interna decidida por `TASK-1080`.
- Listado/search, filtros por tipo/ruta/audience/status y vista detalle — **todo vía los endpoints/contrato de TASK-1083** (browse `GET …/documents`, search `knowledge-search.v1` modo humano, read-detail `GET …/documents/[id]`). Cero acceso directo a `knowledge_chunks`/`knowledge_documents` desde la view.
- Metadata visible: owner, last reviewed, freshness, source, status.

### Slice 2 — Learning paths + contextual help hooks

- Mostrar rutas de aprendizaje iniciales.
- Definir helper/link contract para que features apunten a manuales publicados.
- Empty/degraded states legibles.

### Slice 3 — Human feedback

- Feedback `useful`, `not_useful`, `stale`, `missing_doc`, `wrong_source` (enum canónico del CHECK de `knowledge_feedback`, TASK-1081 — no inventar kinds).
- Persistir vía el contrato compartido `POST /api/platform/app/knowledge/feedback` (TASK-1083 #5), NO con una ruta ad-hoc que llame al `store` server-only ni con SQL directo.

## Out of Scope

- Client-facing knowledge center, rich authoring UI, Notion editing, Nexa answer generation.

## Detailed Spec

Usar composición enterprise densa y escaneable. La primera pantalla debe ser el producto usable, no landing. Para documentos stale/deprecated, la UI debe mostrar warning honesto sin ocultar la fuente.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (browse/read) -> Slice 2 (learning/contextual help) -> Slice 3 (feedback). GVC en cada slice visible.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| UI se vuelve dump de Notion | content/ui | medium | learning paths + metadata + doc types | feedback negativo |
| Cliente ve docs internos | identity | medium | route/view internal-only + defensive redirect | access test falla |

### Feature flags / cutover

- MVP internal-only behind view/capability. No cliente-facing.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | quitar nav/view route | <10 min | sí |
| 2 | ocultar learning path/context links | <10 min | sí |
| 3 | ocultar feedback UI | <10 min | sí |

### Production verification sequence

1. Access check interno vs cliente.
2. GVC desktop/mobile.
3. Search/read smoke con corpus piloto.
4. Feedback smoke.

### Out-of-band coordination required

- Nombre/ruta ya cerrados por `TASK-1080` (**Knowledge** / `/knowledge`). Sin coordinación pendiente en este punto.

<!-- ZONE 4 — ACCEPTANCE & CLOSURE -->

## Acceptance Criteria

- [ ] Surface interna permite browse/search/read de docs publicados.
- [ ] **La UI consume SOLO los endpoints/contrato de TASK-1083** (browse + `knowledge-search.v1` modo humano + read-detail + feedback); cero query directa a `knowledge_chunks`/`knowledge_documents` (Full API Parity #2; lint rule activa cubre `src/views/greenhouse/knowledge/**`).
- [ ] Status, source, owner, last reviewed y freshness son visibles.
- [ ] Rutas de aprendizaje iniciales existen.
- [ ] Feedback humano queda persistido vía `POST …/knowledge/feedback` con el enum canónico de `knowledge_feedback`.
- [ ] viewCode `plataforma.knowledge` sembrado en `VIEW_REGISTRY` (TS) **+ migración seed en el mismo PR** (gobernanza TASK-827) **+ ruta alcanzable por nav** (TASK-982).
- [ ] GVC desktop/mobile revisado.
- [ ] Documentación funcional y manual de uso quedan actualizadas.

## Verification

- `pnpm local:check:ui`
- `pnpm fe:capture` para route Knowledge Center
- tests focales de access/feedback
- `pnpm task:lint --task TASK-1084`
- `pnpm docs:closure-check --staged`

## Closing Protocol

- [ ] `Lifecycle` sincronizado con carpeta.
- [ ] `docs/tasks/README.md` actualizado.
- [ ] `Handoff.md` actualizado con route/access/GVC evidence.
- [ ] `changelog.md` actualizado.
- [ ] Chequeo de impacto sobre contextual help y Nexa.

## Follow-ups

- Client-facing version si el MVP interno funciona.
