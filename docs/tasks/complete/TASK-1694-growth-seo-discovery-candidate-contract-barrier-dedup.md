# TASK-1694 — Growth SEO: el contrato de candidatos de discovery decide con la barrera correcta, una fila por keyword y una política de inclusión declarada

## Delta 2026-08-28 — la mitad de gateway quedó `rollout pendiente`

Detectado al inventariar la superficie federada. La revisión productiva del gateway es
`efeonce-mcp-gateway-00024-8b8` (SHA `92e7197`). El commit que federa el contrato corregido de
`get_seo_keyword_discovery` — `807fb76` en `efeoncepro/efeonce-mcp` — **está local, sin push**
(`git rev-list --count origin/main..HEAD` = 1), por lo tanto sin desplegar.

Consecuencia: la task figura en `complete/`, pero **en producción el gateway sigue sirviendo el contrato
anterior**. El estado honesto de esa mitad es `code complete, rollout pendiente` hasta que `807fb76` se
pushee, el workflow "Deploy Cloud Run" quede `success` y una revisión nueva tome el 100% del tráfico.

No se pushea desde acá: el push queda a decisión del operador. Verificación de cierre —
`gcloud run services list --project efeonce-group --format='table(metadata.name,status.latestReadyRevisionName)' | grep mcp`
debe mostrar una revisión > `00024-8b8`.


<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Delta 2026-08-15 — sube a `P1`: es la barrera de entrada de la cola priorizada (`TASK-1700`)

Origen: `docs/audits/platform/2026-08-15-growth-seo-aeo-module-opportunity-audit.md` (§3.1 brecha S1 y
§5.2 "La cola priorizada: aggregate persistido, no reader en vivo").

Qué cambia y por qué:

- **`Blocks` += `TASK-1700` como BLOQUEO DURO.** La cola priorizada de trabajo SEO no es un reader en
  vivo: es un **aggregate persistido append-only** (`seo_work_queue_{snapshots,items}`) que
  **snapshotea** el conjunto de candidatos con su `priority_score` y su `score_breakdown_json`.
  Recomputar es una fila nueva, jamás un `UPDATE`. Consecuencia dura: lo que la cola persista con el
  contrato actual —**la misma keyword hasta cuatro veces**, cada copia con su propio score y su propio
  CTA de gasto, filtrada por una barrera que en es-LATAM no filtra nada (ISSUE-152)— **queda escrito y
  no se puede corregir después**. Un reader equivocado se arregla con un deploy; un snapshot
  equivocado ya viajó a un plan del día y, en cuanto un cliente lo vea, es irreversible por diseño (el
  propio ADR marca el `priority_score_version` como "lo único irreversible"). Por eso el colapso de
  duplicados y la barrera correcta van **antes**, no en paralelo.
- **Prioridad `P2` → `P1`.** No sube por tamaño ni por urgencia de superficie: sube porque es **la
  única defensa** contra que la cola persista duplicados puntuados con una barrera engañosa. Todo lo
  demás del programa de la cola es corregible hacia adelante; esto no.
- **Invariante nuevo** en `### Data model and invariants`: el colapso por `normalizedKeyword` define
  qué es "un candidato" **para la cola**, no sólo para el drawer — es la unidad de puntuación, de
  `evidence_ref` y de decisión, en los cuatro consumers.

Sin cambio de alcance ni de slices: los cinco slices ya especificados son exactamente lo que la cola
necesita que exista antes de su primer snapshot.

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `reader`
- Epic: `EPIC-022`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El contrato de lectura de candidatos de keyword discovery arrastra tres defectos que la UI de
`TASK-1665` esquivó por su cuenta y que, por Full API Parity, siguen vivos para Nexa, el lane
ecosystem y MCP: filtra por la dificultad cruda del proveedor que el propio dominio declaró
engañosa (ISSUE-152) y no ofrece la barrera de enlaces canónica; muestra la MISMA keyword dos
veces cuando dos métodos la encontraron, cada copia con su estado y su CTA de gasto; y compra
candidatos con dos semánticas de inclusión distintas según el endpoint, sin declararlo en ningún
lado. Esta task corrige el contrato en el reader y en el borde de adquisición, sin migración.

## Why This Task Exists

Los tres hallazgos salieron de la auditoría SEO/AEO del cierre de `TASK-1665` (2026-08-15) y
comparten una raíz: **la UI se protegió a sí misma y el contrato quedó atrás**. El workbench
excluyó `maxDifficulty` deliberadamente
(`src/views/greenhouse/admin/growth/seo/keywords/discovery/keyword-discovery-query.ts:8-13`),
pinta "Barrera de enlaces" en niveles y agrupa visualmente lo que puede; pero el reader
—`readKeywordDiscovery`, el primitive que consumen los cuatro carriles— sigue exponiendo el
filtro engañoso, sigue devolviendo una fila por procedencia y sigue heredando lo que el borde de
adquisición decidió comprar. Una decisión de producto que sólo vive en la vista no es una
decisión del dominio: es un parche por consumer, y el segundo consumer (el agente) hereda el
error completo.

Concretamente:

1. **La dificultad cruda sigue siendo decisional en el contrato.** `ReadKeywordDiscoveryInput`
   acepta `maxDifficulty` y el reader lo aplica sobre `candidate.difficulty`
   (`reader.ts:96-97`, `reader.ts:384-388`). La ruta GET lo expone
   (`route.ts:278`), el lane ecosystem lo expone (`ecosystem-growth-seo.ts:917`) y la tool MCP
   `get_seo_keyword_discovery` lo documenta y valida (`server.ts:467`, `server.ts:477`). El
   `keyword_difficulty` de DataForSEO tiene piso duro en su fórmula y colapsa a 0 en SERPs
   es-LATAM (ISSUE-152: `pintura` marca KD 0 con 135.000 búsquedas/mes en MX), así que un agente
   que pida `maxDifficulty=20` en es-LATAM recibe casi todo el conjunto, **incluidas keywords de
   barrera Alta**, creyendo que filtró por lo fácil. Es la decisión errada exacta que el issue
   documenta, servida por el contrato. Y la contrapartida canónica —`linkBarrier`, ya compuesto
   y devuelto en el DTO (`reader.ts:78`, `reader.ts:364`) y ya usado como desempate del orden
   (`reader.ts:423-429`)— **no es filtrable**.

2. **Duplicados cross-método y cero conciencia de canibalización.** El dedupe del runner es por
   `${method}:${normalized}` (`runner.ts:286`), respaldado por el constraint de procedencia
   `seo_keyword_discovery_candidates_provenance_unique (run_id, source_endpoint,
   normalized_keyword)` (`migrations/20260814140033339_task-1664-seo-keyword-discovery.sql:124`).
   La procedencia múltiple es un hecho legítimo que hay que conservar; el problema es que el
   **reader la sirve como filas de decisión distintas**: la misma keyword hallada por Sugerencias
   y por Relacionadas ocupa dos renglones, cada uno con su estado, su `latestAction` y su CTA de
   gasto recurrente. Encima, `coreKeyword` —el cluster que el proveedor ya resolvió sin costo
   extra y que el store de `TASK-1661` persiste (`keyword-market-data.ts:105`, `:341`)— se
   compone en el DTO (`reader.ts:363`) y se pinta como columna "Agrupador"
   (`src/lib/copy/growth.ts:2508`, `KeywordDiscoveryResults.tsx:327`) pero **no participa en
   ninguna decisión**. `alreadyTracked` es match exacto por keyword normalizada
   (`reader.ts:305-314`, `:366`), así que declarar objetivo "pintura para pisos" teniendo ya
   seguida "pintura pisos" —mismo core— pasa sin una sola advertencia. La doctrina SEO es
   inequívoca: dos targets sobre la misma intención se diluyen; la acción correcta es consolidar,
   no sumar una segunda apuesta con gasto recurrente propio.

3. **Dos semánticas de inclusión conviviendo sin declararse.** `callKeywordSuggestions`
   (`provider.ts:172`) y `callKeywordIdeas` (`provider.ts:217`) mandan
   `filters: [['keyword_info.search_volume', '>', 0]]`; `callRelatedKeywords` y
   `callKeywordsForSite` no filtran nada. Consecuencias: (a) el estado "Sin dato de mercado"
   (`src/lib/copy/growth.ts:2533`) casi sólo puede originarse en related/site, porque para
   suggestions/ideas la ausencia se descartó en el proveedor antes de existir —contradiciendo, en
   el borde de adquisición, la doctrina "ausencia ≠ 0" que el resto del pipeline defiende con
   tres estados explícitos (`runner.ts:387-416`); (b) en mercados es-LATAM de volumen ralo —el
   caso fuente de ISSUE-152— excluye justo el long-tail emergente; (c) la asimetría no está
   dicha en ningún helper, comentario ni copy. Es un trade-off defendible, pero hoy es un
   accidente del path del filtro, no una decisión.

## Goal

- El contrato de lectura filtra por la **barrera de enlaces canónica** (`maxLinkBarrier`), y
  `maxDifficulty` deja de decidir sin romper en silencio a los consumers que ya lo mandan.
- Un candidato = **una keyword normalizada** en la superficie de decisión, con la procedencia
  múltiple viajando como metadata en vez de duplicar filas de gasto.
- El reader declara el **conflicto de cluster** (`coreKeyword` ya seguido por el target) como
  señal propia, separada de `alreadyTracked`, para que ningún consumer proponga canibalizar.
- Los cuatro adapters de expansión comparten **una sola política de inclusión, declarada** en el
  contrato y persistida en el snapshot de la corrida.
- Los cuatro consumers (app, Nexa, lane ecosystem, MCP) ven el mismo contrato corregido en el
  MISMO PR, sin lógica duplicada por consumer.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` (§1.1 boundary SEO↔AEO, §6
  DataForSEO governance, §7 primitives canónicos, §9 entitlements, §17.3 reglas de extracción)
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` (lane ecosystem)
- `.claude/rules/growth-seo.md` (invariantes auto-load del dominio)

Reglas obligatorias:

- **NUNCA derivar la barrera de enlaces desde `keyword_difficulty`.** La derivación canónica es
  `deriveLinkBarrier()` sobre `avg_backlinks_info` (diversidad de dominios referentes + page
  rank, NUNCA el conteo de enlaces), y vive en `keyword-market-data.ts:143`. Ningún consumer
  reimplementa los umbrales.
- **`unknown` se pinta y se trata como "Sin dato", jamás como "Baja".** Un filtro de barrera no
  puede dejar pasar `unknown` por defecto: sería afirmar una oportunidad que nadie midió.
- **La métrica de mercado no se duplica.** El único SSOT del hecho `(keyword, país, idioma,
  as-of)` es `greenhouse_growth.seo_keyword_market_data` vía `readKeywordMarketData`; jamás SQL
  directo a esa tabla desde discovery (`reader.ts:272-277` ya lo respeta).
- **Descubrir no es seguir.** Ninguna pieza de esta task escribe `seo_keyword_set_members` ni
  dispara tracking; el conflicto de cluster es una SEÑAL, no una acción.
- **Boundary SEO↔AEO:** ningún JOIN/VIEW/FK nuevo entre tablas `seo_*` y `grader_*`.
- **§17.3 extraction-ready:** ninguna FK nueva desde `seo_*`, ningún import desde
  `src/lib/growth/seo/**` hacia otro dominio de Greenhouse salvo primitives transversales.
- **Todo cambio de contrato de un reader del dominio viaja a su tool MCP en el MISMO PR**
  (mandato 2026-08-05, lane ecosystem `TASK-1645`). Acá no es tool nueva: es el contrato de
  `get_seo_keyword_discovery`.
- **Un primitive, muchos consumers:** la corrección vive en `readKeywordDiscovery` /
  `provider.ts`, jamás en la vista, en la ruta ni en el adapter MCP.

## Normative Docs

- `docs/issues/resolved/ISSUE-152-seo-target-berel-mercado-chile-marca-mexicana.md` — la evidencia
  medida de por qué `keyword_difficulty` no es decisional en es-LATAM.
- `docs/tasks/complete/TASK-1664-growth-seo-keyword-discovery-seed-expansion.md` — spec del
  primitive: contrato V1 de cada endpoint, límites, costo, estados de corrida.
- `docs/tasks/complete/TASK-1661-growth-seo-keyword-market-data-capability.md` — contrato del
  store de mercado, tres estados (sin fila / NULL / 0) y frescura mensual.
- `docs/tasks/complete/TASK-1665-growth-seo-keyword-discovery-workbench.md` — el consumer UI que
  ya esquivó el hallazgo 1 y que consumirá lo que esta task agrega.
- `docs/manual-de-uso/growth/descubrir-keywords-seo.md` — manual vigente de la lente.
- `docs/documentation/growth/modulo-seo-search-visibility-360.md` — doc funcional del módulo.
- `.claude/skills/dataforseo-operator/SKILL.md` — skill mandatoria al tocar cualquier payload
  DataForSEO (Slice 4 cambia el payload de dos adapters Labs Live).

## Dependencies & Impact

### Depends on

- `TASK-1664` (`complete`) — primitive, provider adapters y reader que esta task corrige.
- `TASK-1661` (`complete`) — `greenhouse_growth.seo_keyword_market_data`, `readKeywordMarketData`,
  `deriveLinkBarrier` y `coreKeyword`; sin ese store no hay barrera ni cluster que leer.
- `ISSUE-152` (`resolved`) — la doctrina de barrera de enlaces que el contrato debe adoptar.
- `TASK-1665` (`complete`) — consumer UI vigente cuya tabla y drawer consumen el DTO.
- `greenhouse_growth.seo_keyword_set_members` + `seo_keyword_sets` — set seguido del target, ya
  leído por el reader para `alreadyTracked`.

### Blocks / Impacts

- 🔴 `TASK-1700` (cola priorizada de trabajo SEO) — **BLOQUEO DURO**. La cola es un aggregate
  persistido append-only: sus filas snapshotean el candidato con su `priority_score`,
  `priority_score_version` y `score_breakdown_json`, y recomputar es una fila nueva, nunca un
  `UPDATE`. Sin el colapso de duplicados y sin la barrera de enlaces como filtro canónico, el primer
  snapshot congela la misma keyword hasta cuatro veces —cada copia con su score y su CTA de gasto— y
  ordenada bajo una dificultad que en es-LATAM no discrimina (ISSUE-152). Eso no se corrige después:
  se corrige antes o queda en el historial. Esta task debe cerrar **antes** del primer slice de
  `TASK-1700`.
- `TASK-1660` (`to-do`) — la lente `Objetivos` declara keywords objetivo en lote; el conflicto de
  cluster es exactamente la advertencia que le falta antes de confirmar cupo.
- `TASK-1666` (`complete`) — `grounded-query-bridge.ts` selecciona candidatos por `candidateIds`
  contra el mismo reader: el colapso cambia qué es "un candidato" para la selección.
- `TASK-1667` (`to-do`) — el work item editorial nace de una decisión sobre un candidato; una
  keyword duplicada produciría dos briefs para la misma intención.
- Consumers MCP/Nexa del lane ecosystem (`get_seo_keyword_discovery`,
  `/api/platform/ecosystem/growth/seo/keyword-discovery`) — cambia el vocabulario de filtros y la
  cardinalidad de `candidates` / `totalCandidates`.
- `src/views/greenhouse/admin/growth/seo/keywords/discovery/**` — la UI no cambia en esta task,
  pero recibe menos filas y campos nuevos que todavía no pinta (follow-up declarado).

### Files owned

- `src/lib/growth/seo/keyword-discovery/reader.ts`
- `src/lib/growth/seo/keyword-discovery/provider.ts`
- `src/lib/growth/seo/keyword-discovery/contracts.ts`
- `src/lib/growth/seo/keyword-discovery/queue.ts`
- `src/lib/growth/seo/keyword-discovery/__tests__/reader.test.ts`
- `src/lib/growth/seo/keyword-discovery/__tests__/queue.test.ts`
- `src/lib/growth/seo/keyword-discovery/__tests__/runner.test.ts`
- `src/lib/growth/seo/__tests__/keyword-discovery-parity.test.ts`
- `src/app/api/admin/growth/seo/keyword-discovery/route.ts`
- `src/lib/api-platform/resources/ecosystem-growth-seo.ts`
- `src/mcp/greenhouse/server.ts`
- `src/mcp/greenhouse/http-client.ts`
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md`
- `docs/documentation/growth/modulo-seo-search-visibility-360.md`
- `docs/manual-de-uso/growth/descubrir-keywords-seo.md`

## Current Repo State

### Already exists

- `src/lib/growth/seo/keyword-discovery/reader.ts` — `readKeywordDiscovery`, DTO
  `SeoDiscoveryCandidateView` con `linkBarrier` ya compuesto, `coreKeyword`, `alreadyTracked`,
  `measuredGsc`, orden gobernado de 8 llaves con desempate por barrera y paginación por offset.
- `src/lib/growth/seo/keyword-market-data.ts` — `readKeywordMarketData` (devuelve
  `byKeyword` + `linkBarrierByKeyword` + `freshness`), `deriveLinkBarrier`, `normalizeMarketKeyword`,
  `coreKeyword` persistido en el store.
- `src/lib/growth/seo/contracts.ts:718` — `SeoLinkBarrierLevel = 'low' | 'medium' | 'high' | 'unknown'`.
- `src/lib/growth/seo/keyword-discovery/provider.ts` — los cuatro adapters de expansión +
  `callKeywordOverview`, con el gate `status_code === 20000` y el parser compartido.
- `src/lib/growth/seo/keyword-discovery/runner.ts` — dedupe por `${method}:${normalized}`, spend
  fence, tres estados del store de mercado, cierre transaccional con outbox.
- `migrations/20260814140033339_task-1664-seo-keyword-discovery.sql` — tablas `runs` /
  `candidates` / `actions` con el constraint de procedencia y su guard anti pre-up-marker.
- Los cuatro carriles ya cableados al MISMO primitive: ruta app (`route.ts`), lane ecosystem
  (`ecosystem-growth-seo.ts:877-930`), MCP (`server.ts:463`, `http-client.ts:337`), y el bridge
  AEO (`grounded-query-bridge.ts:210`).
- `src/lib/growth/seo/__tests__/keyword-discovery-parity.test.ts` — guard de paridad entre la
  ruta app y el primitive.

### Gap

- El reader no acepta ningún filtro de barrera de enlaces; `maxLinkBarrier` no existe.
- `maxDifficulty` se aplica tal cual y ningún consumer sabe que la cifra no es decisional en
  es-LATAM; la exclusión de la UI es un comentario en un archivo de vista, no un hecho del
  contrato.
- El reader no colapsa por `normalizedKeyword`: `totalCandidates` cuenta procedencias, no
  keywords, y la misma keyword puede ocupar hasta cuatro renglones de decisión.
- No existe ningún campo, señal ni check que relacione el `coreKeyword` de un candidato con el
  set seguido del target.
- No hay una constante, comentario ni campo que declare qué política de inclusión usó cada
  método; el filtro de volumen vive escondido dentro del payload de dos adapters.
- El snapshot `methods_json` de la corrida no registra la política con la que se compró, así que
  una corrida vieja no se puede interpretar después de un cambio de política.

## Modular Placement Contract

- Topology impact: `domain-package`
- Current home: `src/lib/growth/seo/keyword-discovery/**` dentro del monolito Next.js de
  greenhouse-eo, con consumers en la ruta app, el lane ecosystem y el adapter MCP.
- Future candidate home: `domain-package`
- Boundary: el contrato canónico es `readKeywordDiscovery` (reader) y los adapters de
  `provider.ts`; consumers autorizados son la ruta app `/api/admin/growth/seo/keyword-discovery`,
  el lane ecosystem `/api/platform/ecosystem/growth/seo/keyword-discovery`, la tool MCP
  `get_seo_keyword_discovery` y el bridge `grounded-query-bridge.ts`. Ninguno reimplementa
  filtros, colapso ni derivación de barrera.
- Server/browser split: el cambio completo vive server-side bajo `import 'server-only'`; el store
  Postgres, el cliente DataForSEO y el secreto del proveedor nunca cruzan al browser. La UI recibe
  sólo el DTO ya compuesto por el server component.
- Build impact: none — sin dependencia nueva, sin input de filesystem, sin entrypoint global.
- Extraction blocker: none nuevo. Se mantiene el único acople ya declarado en §17.2
  (`seo_targets.organization_id` → `greenhouse_core.organizations`); esta task no agrega FK ni
  import cross-dominio.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `reader`
- Source of truth afectado: `greenhouse_growth.seo_keyword_discovery_candidates` (procedencia,
  sin cambio de schema) + `greenhouse_growth.seo_keyword_market_data` (hecho de mercado, sólo
  lectura vía `readKeywordMarketData`) + el payload de los adapters Labs Live de `provider.ts`.
- Consumidores afectados: UI del workbench (`TASK-1665`), Nexa, lane ecosystem
  (`/api/platform/ecosystem/growth/seo/keyword-discovery`), tool MCP
  `get_seo_keyword_discovery`, bridge AEO `grounded-query-bridge.ts`.
- Runtime target: `production` (Vercel para los tres lanes de lectura) + `worker` (ops-worker
  para el runner que compra con el payload de Slice 4).

### Contract surface

- Contrato existente a respetar: `ReadKeywordDiscoveryInput` / `SeoDiscoveryCandidateView` /
  `ReadKeywordDiscoveryResult` en `src/lib/growth/seo/keyword-discovery/reader.ts`; el contrato V1
  de payloads Labs en `src/lib/growth/seo/keyword-discovery/provider.ts`; el schema zod de
  `get_seo_keyword_discovery` en `src/mcp/greenhouse/server.ts:463-490`.
- Contrato nuevo o modificado:
  - `ReadKeywordDiscoveryInput.maxLinkBarrier?: 'low' | 'medium' | 'high'` (nuevo) y
    `ReadKeywordDiscoveryInput.includeUnknownBarrier?: boolean` (nuevo, default `false`).
  - `ReadKeywordDiscoveryInput.maxDifficulty` pasa a **no-op declarado** (se acepta, no se
    aplica, se reporta en `meta.ignoredFilters`).
  - `ReadKeywordDiscoveryResult.ignoredFilters: Array<{ filter: string; reason: string;
    replacement: string | null }>` (nuevo, siempre presente, `[]` cuando no aplica).
  - `SeoDiscoveryCandidateView.candidateIds: string[]` y
    `SeoDiscoveryCandidateView.provenance: Array<{ candidateId; sourceEndpoint; sourceRank;
    seedKeywords; capturedAt }>` (nuevos).
  - `SeoDiscoveryCandidateView.clusterConflict: { status: 'conflict' | 'clear' | 'unknown';
    coreKeyword: string | null; trackedMembers: string[]; trackedMemberCount: number }` (nuevo).
  - `contracts.ts`: `SEO_DISCOVERY_LINK_BARRIER_FILTER_LEVELS` y
    `SEO_DISCOVERY_VOLUME_POLICY` (constante + tipo) para la política de inclusión declarada.
  - `provider.ts`: `callKeywordSuggestions` y `callKeywordIdeas` dejan de mandar
    `filters: [['keyword_info.search_volume', '>', 0]]`.
  - `queue.ts`: `methods_json` incorpora `volumePolicy` por método en el snapshot de la corrida.
- Backward compatibility: `gated` para el filtro (`maxDifficulty` se sigue aceptando y se declara
  ignorado, nunca 4xx) y `breaking` acotado para la cardinalidad (`candidates` y
  `totalCandidates` pasan a contar keywords distintas, no procedencias). Los campos escalares
  existentes del DTO (`candidateId`, `sourceEndpoint`, `sourceRank`, `seedKeywords`,
  `capturedAt`) se conservan apuntando a la procedencia representativa, así que ningún consumer
  actual rompe por campo faltante.
- Full API parity: el filtro, el colapso y la señal de cluster se resuelven UNA vez en
  `readKeywordDiscovery`. La ruta app, el lane ecosystem y la tool MCP sólo parsean query params y
  hacen passthrough; la UI no recalcula nada. La política de inclusión se resuelve una vez en
  `provider.ts` y se declara en el snapshot de la corrida.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.seo_keyword_discovery_candidates` (lectura
  + agrupación en memoria; **sin cambio de schema**),
  `greenhouse_growth.seo_keyword_discovery_runs` (`methods_json`, JSON aditivo),
  `greenhouse_growth.seo_keyword_market_data` (sólo lectura),
  `greenhouse_growth.seo_keyword_set_members` + `seo_keyword_sets` (sólo lectura),
  `greenhouse_growth.seo_gsc_daily` (sólo lectura, sin cambio).
- Invariantes que no se pueden romper:
  - La procedencia se conserva íntegra en la fila: el colapso es de PRESENTACIÓN, y el constraint
    `seo_keyword_discovery_candidates_provenance_unique (run_id, source_endpoint,
    normalized_keyword)` no se toca ni se relaja.
  - 🔴 **El colapso por `normalizedKeyword` define qué es "un candidato" PARA LA COLA, no sólo para
    el drawer.** La keyword normalizada —no la fila de procedencia— es la unidad que se puntúa, la
    que recibe una `evidence_ref` y la que un humano decide. Ningún consumer aguas abajo
    (`TASK-1700`, Nexa, MCP, lane ecosystem) puede tratar una procedencia como candidato propio: en
    un aggregate append-only eso persiste la misma decisión hasta cuatro veces, con cuatro scores y
    cuatro compromisos de gasto sobre una sola intención. La cardinalidad es contrato del reader, no
    convención de la UI.
  - `unknown` de barrera nunca satisface un filtro de barrera salvo `includeUnknownBarrier: true`
    explícito: "Sin dato" no es "Baja".
  - `alreadyTracked` (match exacto) y `clusterConflict` (misma intención) son señales SEPARADAS y
    no se fusionan ni se promedian: responden preguntas distintas.
  - `clusterConflict.status` es `unknown` —nunca `clear`— cuando el candidato no tiene
    `coreKeyword` o cuando el set seguido no tiene fila de mercado en ese mercado. Degradación
    honesta: la ausencia de dato no se presenta como ausencia de conflicto.
  - Ninguna pieza escribe tracking, ni cierra membresías, ni muta `intent`: descubrir no es
    seguir.
  - El reader no escribe: la señal de cluster se deriva al leer y nunca se persiste (persistirla
    la congelaría y envejecería sin aviso, mismo criterio que el gap de `TASK-1662`).
  - La barrera se lee de `linkBarrierByKeyword` del reader canónico del store; ningún umbral se
    reimplementa fuera de `deriveLinkBarrier`.
- Tenant/space boundary: sin cambio. El historial de corridas filtra siempre por
  `organization_id`; los candidatos por `run_id` + `organization_id`; un `runId` de otra org
  responde `run_not_found` (anti-oracle, `reader.ts:216-219`). El set seguido se lee por
  `seo_target_id` del run ya validado por org. El mercado del cluster es el
  `(locationCode, languageCode)` de la corrida, nunca uno del body.
- Idempotency/concurrency: el reader es de sólo lectura y no toma locks. El colapso y el orden
  deben ser **deterministas**: representante = procedencia de menor `sourceRank`, desempate por
  `candidateId` ascendente; `provenance` ordenada igual. Sin determinismo la paginación por
  offset (`reader.ts:437-438`) se vuelve inestable entre páginas.
- Audit/outbox/history: none con razón. Ningún cambio de estado ocurre acá; el outbox del dominio
  (`growth.seo.keyword_discovery.completed`) lo emite el runner al cerrar la corrida y no cambia.
  La política de inclusión queda auditada en `methods_json` del run, que es inmutable tras el
  cierre.

### Migration, backfill and rollout

- Migration posture: `none`. El colapso es en memoria y `methods_json` es JSON aditivo, así que no
  hay DDL. Un run viejo sin `volumePolicy` en el snapshot se interpreta como
  `positive_volume_only` para suggestions/ideas y `all` para related/site — el default de lectura
  debe reproducir la historia, no reescribirla.
- Default state: `enabled with rationale`. Sin flag nuevo: el módulo ya está gateado por
  `isSeoModuleEnabled()` + `isSeoKeywordDiscoveryEnabled()`
  (`src/lib/growth/seo/flags.ts`) y por el entitlement per-ORG `seo_v2`; agregar un flag por
  corrección de contrato dejaría dos verdades del mismo reader conviviendo, que es justo el
  problema que la task cierra.
- Backfill plan: none. Los candidatos ya persistidos siguen siendo válidos; lo que cambia es cómo
  se leen. Las corridas compradas con la política vieja NO se recompran.
- Rollback path: `revert PR`. Todo el cambio es código de lectura + payload de dos adapters; un
  revert restituye el comportamiento anterior sin tocar datos.
- External coordination: aprobación del operador para UNA corrida real de smoke con gasto de
  proveedor (orden de magnitud del smoke de `TASK-1664`: USD ~0,013). El gateway MCP federado
  necesita re-deploy para que la descripción/schema actualizados de
  `get_seo_keyword_discovery` lleguen a los clientes; el canary del lane es el verificador.

### Security and access

- Auth/access gate: sin cambio. Lectura exige sesión interna + capability
  `growth.seo.observation.read` (`route.ts:228`); encolar/decidir exige
  `growth.seo.target.configure`. El lane ecosystem entra por su binding de scope
  `efeonce.mcp.read`. Esta task **no crea capability ni scope nuevo**.
- Sensitive data posture: `no sensitive data`. Keywords y métricas de mercado; ninguna PII. Las
  seeds libres del operador siguen fuera de la URL y de los logs.
- Error contract: `canonicalErrorResponse` + el `ERROR_CODE_MAP` existente. Un `maxLinkBarrier`
  fuera del vocabulario cerrado se **ignora** (mismo criterio que `readEnumParam`,
  `route.ts:251-266`) y se reporta en `ignoredFilters`, jamás se finge aplicado. Nada del payload
  del proveedor, SQL ni endpoint cruza al cliente; los errores inesperados van por
  `captureWithDomain(error, 'growth', ...)`.
- Abuse/rate-limit posture: sin cambio en la lectura (techo `MAX_DISCOVERY_READ_LIMIT = 200`). En
  adquisición, los techos ya vigentes siguen mandando: `limit` por llamada
  (`MAX_DISCOVERY_RESULTS_PER_CALL = 100`), `MAX_DISCOVERY_CANDIDATES_PER_RUN = 500`,
  `MAX_DISCOVERY_PROVIDER_CALLS = 30`, spend fence cada 10 llamadas cobradas y
  `enforceSeoRunEntitlement` como chokepoint único.

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/growth/seo` (incluye reader, queue, runner, parity y
  bridge) + `pnpm local:check`.
- DB/runtime checks: query de sólo lectura contra PG por el proxy (`pnpm pg:connect:shell`) para
  (a) una corrida real con la misma `normalized_keyword` en dos `source_endpoint` distintos, que
  es el caso que el colapso debe fusionar, y (b) un target con dos keywords seguidas que compartan
  `core_keyword` en `seo_keyword_market_data`, que es el caso que `clusterConflict` debe marcar.
- Integration checks: una corrida real de discovery en un mercado es-LATAM ralo con la política
  nueva, comparando candidatos, filas compradas y costo real contra el smoke de `TASK-1664`;
  verificación del payload sin `filters` contra el proveedor (una llamada, `status_code 20000`).
- Reliability signals/logs: `sync.outbox.unpublished_lag` no aplica (no hay evento nuevo). Se
  observa la señal existente del dominio en `src/lib/reliability/queries/seo-keyword-discovery-health.ts`
  (corridas atascadas / fallidas) y el ledger de gasto del transporte DataForSEO para confirmar
  que la política nueva no mueve el costo por corrida fuera del rango esperado.
- Production verification sequence: ver `### Production verification sequence` en el Rollout Plan.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] **Lógica en el primitive, no en la UI.** El filtro de barrera, el colapso por keyword, la
      señal de cluster y la política de inclusión viven en
      `src/lib/growth/seo/keyword-discovery/{reader,provider,contracts,queue}.ts`.
- [ ] **Modelada como aggregate/recurso/command, no como click-handler:** la corrida sigue siendo
      el aggregate (`seo_target` + `runId`) y el candidato su proyección de lectura.
- [ ] **Read** expuesto como reader canónico `readKeywordDiscovery` con autorización fina
      (`growth.seo.observation.read`), errores canónicos y observabilidad por `captureWithDomain`.
      No hay write nuevo en esta task.
- [ ] **Capability + grant en el MISMO PR:** `N/A — no capability nueva`; se reutilizan
      `growth.seo.observation.read` y `growth.seo.target.configure`, ya granteadas.
- [ ] **Camino programático declarado:** ruta app + lane ecosystem
      `/api/platform/ecosystem/growth/seo/keyword-discovery` + tool MCP
      `get_seo_keyword_discovery`, los tres actualizados en el mismo PR.
- [ ] **Write apto para `propose → confirm → execute`:** `N/A — esta task no agrega write`. La
      promoción a tracking sigue siendo `track_seo_keywords`, con su disclosure de gasto.
- [ ] **Un primitive, muchos consumers:** cero lógica de filtro/colapso/cluster duplicada en UI,
      ruta, lane, MCP o bridge.
- [ ] **Parity check = SÍ:** el guard `keyword-discovery-parity.test.ts` cubre los filtros nuevos y
      la deprecación declarada.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Barrera de enlaces filtrable; `maxDifficulty` deja de decidir

- `contracts.ts`: `SEO_DISCOVERY_LINK_BARRIER_FILTER_LEVELS: readonly ['low','medium','high']`
  (vocabulario cerrado del filtro; `unknown` NO es un nivel filtrable, es la ausencia) + helper
  puro `isDiscoveryLinkBarrierFilterLevel`.
- `reader.ts`: `maxLinkBarrier` + `includeUnknownBarrier` en `ReadKeywordDiscoveryInput`, aplicados
  sobre el `linkBarrier` ya compuesto con el orden `low < medium < high` de `LINK_BARRIER_SORT`.
- `reader.ts`: `maxDifficulty` se acepta y **no se aplica**; el resultado incluye
  `ignoredFilters: [{ filter: 'maxDifficulty', reason: 'non_decisional_link_barrier_is_canonical',
  replacement: 'maxLinkBarrier' }]` sólo cuando el caller lo mandó.
- Tests focales en `__tests__/reader.test.ts`: barrera alta excluida por `maxLinkBarrier: 'medium'`;
  `unknown` fuera por default y dentro con `includeUnknownBarrier: true`; `maxDifficulty` no
  reduce filas y aparece declarado en `ignoredFilters`.

### Slice 2 — Un candidato por keyword, con procedencia múltiple como metadata

- `reader.ts`: agrupar los candidatos compuestos por `normalizedKeyword`; representante = menor
  `sourceRank`, desempate `candidateId` ascendente; `provenance[]` ordenada por el mismo criterio.
- DTO: `candidateIds: string[]` (todas las filas de procedencia, orden determinista) +
  `provenance[]`; los escalares existentes siguen apuntando al representante.
- `latestAction` = la acción más reciente entre TODAS las filas fusionadas; `alreadyTracked`,
  `matchesSeed` y `measuredGsc` se computan por keyword (ya lo son) y no cambian.
- `totalCandidates` y el cursor pasan a contar keywords distintas; documentar el cambio de
  semántica en el JSDoc del reader y en el contrato del lane ecosystem.
- Tests: dos filas (`keyword_suggestions` + `related_keywords`) de la misma keyword colapsan a una
  con `candidateIds.length === 2`; el filtro `sourceEndpoint` deja la procedencia restringida; el
  orden y la paginación siguen siendo deterministas entre dos llamadas idénticas.
- Verificar que `grounded-query-bridge.ts` (selección por `candidateIds`) sigue resolviendo los
  candidatos seleccionados tras el colapso, y ajustar su test si el shape lo requiere.

### Slice 3 — `clusterConflict`: la señal de canibalización contra el set seguido

- `reader.ts`: resolver el `coreKeyword` de las keywords vigentes del target reusando
  `readKeywordMarketData` sobre el set seguido, en el `(locationCode, languageCode)` de la
  corrida. Sin llamada al proveedor: es lectura del store de `TASK-1661`.
- Componer `clusterConflict` por candidato: `conflict` cuando el `coreKeyword` del candidato
  coincide con el de ≥1 keyword vigente distinta de la propia; `clear` cuando hay `coreKeyword` y
  ninguna coincidencia; `unknown` cuando falta el `coreKeyword` del candidato o el set seguido no
  tiene filas de mercado.
- `trackedMembers` acotado (máximo 5 nombres) + `trackedMemberCount` con el total, para que un
  consumer nunca tenga que adivinar cuántos son.
- Tests: conflicto detectado con keywords distintas y mismo core; `clear` con cores distintos;
  `unknown` sin dato de mercado del set seguido; `alreadyTracked=false` con `status='conflict'`
  convive sin fusionarse.

### Slice 4 — Una sola política de inclusión, declarada

- `contracts.ts`: `SeoDiscoveryVolumePolicy = 'all' | 'positive_volume_only'` +
  `SEO_DISCOVERY_DEFAULT_VOLUME_POLICY = 'all'`, con el razonamiento en el comentario del módulo.
- `provider.ts`: quitar `filters: [['keyword_info.search_volume', '>', 0]]` de
  `callKeywordSuggestions` y `callKeywordIdeas`, dejando los cuatro adapters con la misma
  semántica de inclusión.
- `queue.ts`: persistir `volumePolicy` por método dentro de `methods_json` al crear la corrida.
- `reader.ts`: exponer la política del run en `SeoDiscoveryRunView.methods[]` con el default de
  lectura que reproduce la historia (`positive_volume_only` para suggestions/ideas en runs sin el
  campo, `all` para related/site).
- Tests: el payload de los cuatro adapters no lleva `filters`; el snapshot del run guarda la
  política; un run viejo sin el campo se lee con el default histórico correcto.

### Slice 5 — Federación del contrato corregido y cierre documental

- `route.ts` (app) y `ecosystem-growth-seo.ts` (lane ecosystem): parsear `maxLinkBarrier` e
  `includeUnknownBarrier` con el vocabulario cerrado y hacer passthrough de `ignoredFilters`.
- `src/mcp/greenhouse/server.ts` + `http-client.ts`: agregar los filtros nuevos al schema zod,
  marcar `maxDifficulty` como `DEPRECATED — ignorado, usa maxLinkBarrier` en su `.describe()`
  (se mantiene opcional para no romper a un agente que ya lo aprendió) y reescribir la
  descripción de la tool para decir que un candidato es una keyword con procedencia múltiple y
  que `clusterConflict` advierte canibalización.
- `keyword-discovery-parity.test.ts`: cubrir los filtros nuevos y la deprecación declarada.
- Docs: delta en `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` (§7 primitives, con la decisión de
  deprecación y la política de inclusión), actualización de
  `docs/documentation/growth/modulo-seo-search-visibility-360.md` y de
  `docs/manual-de-uso/growth/descubrir-keywords-seo.md`.

## Out of Scope

- **Pintar nada en la UI.** El aviso de canibalización en el drawer, el chip de procedencia
  múltiple y el filtro de barrera en la lente `Descubrir` son un consumer `ui-ux` posterior, con
  su wireframe, su copy en `src/lib/copy/growth.ts` y su evidencia GVC. Esta task entrega el
  contrato; la superficie es follow-up (`Follow-ups`).
- **Borrar `maxDifficulty` del contrato.** La eliminación dura del parámetro es un follow-up con
  ventana de una release y verificación de que ningún consumer lo sigue mandando.
- **Cambiar el constraint de procedencia o el dedupe del runner.** El colapso es de lectura; la
  fila por procedencia se conserva.
- **Persistir el conflicto de cluster.** Se deriva al leer, siempre.
- **Consolidar keywords canibalizadas.** Detectar el conflicto no es resolverlo: cerrar una
  membresía es `untrackKeywords` y sigue siendo una decisión humana explícita.
- **Tocar el orden por defecto del reader** más allá de lo que exija el colapso determinista.
- **Cualquier cambio en `keyword_overview`, en el spend fence, en el entitlement o en el estado
  de la corrida.**
- **`keyword_difficulty` como dato:** se sigue capturando y mostrando en el DTO; lo que muere es
  su rol DECISIONAL como filtro.

## Detailed Spec

### Por qué `maxDifficulty` se declara no-op en vez de eliminarse

Tres consumers vivos lo aceptan hoy: la ruta app (`route.ts:278`), el lane ecosystem
(`ecosystem-growth-seo.ts:917`) y el schema zod de la tool MCP (`server.ts:477`), esta última ya
federada en el gateway. Eliminarlo del schema convertiría un parámetro aprendido en un error duro
para un agente que ya lo usa, y hacerlo en el mismo PR que cambia la cardinalidad de la respuesta
mezcla dos rupturas en una.

Seguir aplicándolo tampoco es opción: produce exactamente la decisión errada que ISSUE-152
documenta. Entre las dos formas de equivocarse, la elegida es la **fail-safe**: devolver MÁS filas
de las pedidas y **declararlo** (`ignoredFilters`) le da al caller la información para corregir;
devolver silenciosamente el subconjunto equivocado no. Por eso el parámetro se acepta, no se
aplica y se reporta, con la eliminación dura como follow-up gobernado.

### Forma del candidato colapsado

```ts
// Antes: una fila por (endpoint, keyword). Después: una fila por keyword.
interface SeoDiscoveryCandidateView {
  candidateId: string            // representante (menor sourceRank, desempate por id asc)
  candidateIds: string[]         // TODAS las filas de procedencia fusionadas
  provenance: Array<{
    candidateId: string
    sourceEndpoint: SeoDiscoveryMethod
    sourceRank: number | null
    seedKeywords: string[]
    capturedAt: string
  }>
  // …campos existentes sin cambio; los escalares de procedencia apuntan al representante
  clusterConflict: {
    status: 'conflict' | 'clear' | 'unknown'
    coreKeyword: string | null
    trackedMembers: string[]     // máximo 5
    trackedMemberCount: number
  }
}
```

`candidateIds` es lo que hace el colapso seguro: `recordKeywordDiscoveryAction` sigue escribiendo
por fila, y el bridge AEO sigue seleccionando por id — ambos necesitan poder alcanzar todas las
procedencias de la keyword que el operador decidió. `latestAction` se computa como la unión, así
que el reader sigue siendo la autoridad de "esta keyword ya se decidió" aunque la acción se haya
registrado sobre una sola de sus filas.

### Por qué la política de inclusión se unifica hacia `all`

DataForSEO cobra por fila devuelta y `limit` acota las filas devueltas, así que **el filtro
provider-side no baja el techo de costo de la llamada**: cambia qué filas se compran por el mismo
precio. En un mercado grueso da lo mismo; en uno ralo —el caso fuente de ISSUE-152— el filtro
gasta el `limit` descartando justo el long-tail emergente que discovery existe para encontrar. Y
el equivalente honesto ya existe aguas abajo: `minSearchVolume` en el contrato de lectura es un
filtro que el operador ve, elige y puede quitar.

Corolario operativo: el estado "Sin dato de mercado" pasa a ser alcanzable desde los cuatro
métodos, que es lo que el resto del pipeline ya afirma con sus tres estados. La política queda en
`methods_json` para que una corrida vieja siga siendo interpretable después del cambio.

### Cómo se resuelve el conflicto de cluster sin gastar

El set seguido del target ya se lee para `alreadyTracked` (`reader.ts:305-314`) y está acotado por
el techo gobernado `GROWTH_SEO_TRACKED_KEYWORDS_PER_TARGET` (default 200). Sobre esas keywords se
llama `readKeywordMarketData` en el mercado de la corrida —una lectura más del store de
`TASK-1661`, cero llamadas al proveedor— y se indexa `coreKeyword → keywords vigentes`. El
candidato hace lookup por su propio `coreKeyword`. Una keyword seguida sin fila de mercado no
produce `clear`: produce `unknown`, porque no saber si hay conflicto y saber que no lo hay son
hechos distintos.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (filtro de barrera + deprecación declarada) → Slice 2 (colapso por keyword) → Slice 3
  (`clusterConflict`) → Slice 4 (política de inclusión) → Slice 5 (federación + docs).
- Slice 3 depende de Slice 2: la señal de cluster se cuelga del candidato colapsado; computarla
  antes obligaría a recomputarla al fusionar.
- Slice 4 va DESPUÉS de 1–3: es el único que cambia qué se compra, y debe estrenarse con el
  contrato de lectura ya honesto — si no, el long-tail nuevo entra a una superficie que todavía
  duplica filas y filtra por la métrica equivocada.
- Slice 5 va último por definición: no se federa un contrato que todavía puede moverse.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un consumer MCP/Nexa asume que `totalCandidates` cuenta procedencias y reporta menos candidatos como "se perdieron datos" | lane ecosystem / MCP | medium | Declarar el cambio de semántica en la descripción de la tool y en el delta de arquitectura; `candidateIds` deja la cardinalidad vieja disponible | Canary del lane + reporte del operador tras la primera corrida leída por agente |
| Colapso no determinista rompe la paginación por offset (una keyword aparece en dos páginas o en ninguna) | UI / lane ecosystem | medium | Orden total explícito (menor `sourceRank`, desempate `candidateId` asc) + test que compara dos lecturas idénticas y la unión de páginas contra `totalCandidates` | Test focal en CI; diferencia entre suma de páginas y `totalCandidates` |
| `clusterConflict` marca falsos positivos por un `coreKeyword` demasiado genérico del proveedor y frena decisiones válidas | UI / Nexa | medium | La señal es advertencia, nunca bloqueo; `trackedMembers` nombra contra qué choca para que el humano juzgue; `unknown` explícito en vez de adivinar | Revisión manual de la primera corrida real con set seguido poblado |
| Quitar el filtro de volumen llena el `limit` de long-tail sin demanda y baja la calidad del inbox | DataForSEO / costo de corrida | medium | El orden gobernado del reader ya prioriza medido y volumen; `minSearchVolume` sigue disponible; smoke real comparando mezcla de candidatos y costo contra el de `TASK-1664` | Ledger de gasto del transporte + conteo de candidatos con `searchVolume = null` en la corrida de smoke |
| Un payload sin `filters` es rechazado por el endpoint Labs y la corrida cierra `failed` | DataForSEO | low | Verificar una llamada real (`status_code 20000`) antes de mergear Slice 4; el runner ya degrada honesto y nunca disfraza el error de lista vacía | `error_code = provider_error` en `seo_keyword_discovery_runs`; señal `seo-keyword-discovery-health` |
| La lectura extra del store de mercado para el set seguido agrega latencia perceptible al workbench | UI | low | Set acotado por el techo de 200 keywords/target; misma llamada batch ya usada para los candidatos | Tiempo de respuesta del server component de `/admin/growth/seo/keywords` |

### Feature flags / cutover

Sin flag nuevo — corrección de contrato, cutover inmediato. El dominio ya está gateado por
`isSeoModuleEnabled()` + `isSeoKeywordDiscoveryEnabled()` (`src/lib/growth/seo/flags.ts`, ambos ON
en Vercel y ops-worker desde el rollout de `TASK-1664`) y por el entitlement per-ORG `seo_v2`.
Introducir un flag por corrección dejaría dos verdades del mismo reader conviviendo —exactamente
el problema que la task cierra— y obligaría a mantener el filtro engañoso vivo detrás de un
default. Revert = revert del PR + redeploy.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert PR: el filtro nuevo es aditivo y `maxDifficulty` vuelve a aplicarse | <15 min (redeploy Vercel) | si |
| Slice 2 | Revert PR: el colapso es de lectura, los datos de procedencia nunca se tocaron | <15 min | si |
| Slice 3 | Revert PR: `clusterConflict` es derivado y no se persiste | <15 min | si |
| Slice 4 | Revert PR: los adapters vuelven a mandar `filters`; las corridas ya compradas conservan su `volumePolicy` en `methods_json` y siguen siendo interpretables | <15 min Vercel + redeploy ops-worker | si |
| Slice 5 | Revert PR + re-deploy del gateway MCP para restituir la descripción/schema anteriores | <30 min (depende del release del gateway) | si |

### Production verification sequence

1. `pnpm vitest run src/lib/growth/seo` verde + `pnpm local:check` verde en local.
2. Query de sólo lectura contra PG (proxy) que confirme el caso de fusión: una corrida real con la
   misma `normalized_keyword` bajo dos `source_endpoint` distintos.
3. Leer esa corrida por la ruta app en local y verificar: una sola fila para esa keyword,
   `candidateIds.length === 2`, `totalCandidates` coherente con las keywords distintas.
4. Leer la misma corrida con `maxDifficulty=20` y verificar que el conteo NO baja y que
   `ignoredFilters` la declara; leer con `maxLinkBarrier=medium` y verificar que las de barrera
   `high` y `unknown` quedan fuera.
5. Verificar `clusterConflict` contra un target con dos keywords vigentes que compartan
   `core_keyword`; confirmar `unknown` en un target sin filas de mercado.
6. Con autorización explícita del operador (gasto de proveedor): una corrida real en un mercado
   es-LATAM ralo con la política nueva. Comparar candidatos, filas compradas, costo real y mezcla
   de `searchVolume = null` contra el smoke de `TASK-1664`. Stop & escalate si el costo por
   corrida se sale del orden de magnitud esperado.
7. Deploy a staging; canary del lane ecosystem y de la tool MCP `get_seo_keyword_discovery` con
   los filtros nuevos; confirmar que `maxDifficulty` no rompe y viaja declarado.
8. Promoción a producción por el release control plane; observar la señal
   `seo-keyword-discovery-health` y el ledger de gasto durante la primera corrida productiva.

### Out-of-band coordination required

- **Aprobación de gasto** del operador para la corrida real de smoke del paso 6 (orden de
  magnitud USD ~0,013 según el smoke de `TASK-1664`).
- **Re-deploy del gateway MCP** para publicar la descripción y el schema actualizados de
  `get_seo_keyword_discovery`; viaja con el próximo release del gateway, igual que la federación
  de `TASK-1664`/`TASK-1666`.
- Nada más: sin secretos, sin env vars, sin webhooks, sin configuración de proveedor.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `ReadKeywordDiscoveryInput` acepta `maxLinkBarrier` con el vocabulario cerrado
      `low|medium|high` y filtra usando el `linkBarrier` derivado por `deriveLinkBarrier`.
- [ ] Un candidato con `linkBarrier: 'unknown'` NO pasa un filtro de barrera salvo
      `includeUnknownBarrier: true` explícito, y existe un test que lo prueba.
- [ ] `maxDifficulty` ya no reduce el conjunto de candidatos en ninguna ruta (app, lane
      ecosystem, MCP) y aparece en `ignoredFilters` con `replacement: 'maxLinkBarrier'` cuando el
      caller lo manda.
- [ ] Mandar `maxDifficulty` nunca devuelve error: se acepta, se ignora y se declara.
- [ ] Una keyword hallada por dos métodos distintos en la misma corrida devuelve UNA fila con
      `candidateIds.length === 2` y `provenance.length === 2`.
- [ ] `totalCandidates` cuenta keywords normalizadas distintas y la unión de todas las páginas
      del cursor coincide exactamente con ese total, sin repetidos ni faltantes.
- [ ] Dos lecturas idénticas del mismo run devuelven el mismo representante y el mismo orden
      (colapso determinista).
- [ ] El JSDoc del reader y el delta de arquitectura declaran que la unidad de decisión —y por lo
      tanto la unidad puntuable por `TASK-1700`— es la keyword normalizada, no la fila de
      procedencia.
- [ ] `latestAction` de un candidato colapsado refleja la acción más reciente registrada sobre
      cualquiera de sus `candidateIds`.
- [ ] `grounded-query-bridge.ts` sigue resolviendo una selección por `candidateIds` tras el
      colapso, con su test verde.
- [ ] `clusterConflict.status === 'conflict'` cuando el `coreKeyword` del candidato coincide con
      el de ≥1 keyword vigente del target distinta de la propia, con `trackedMembers` poblado.
- [ ] `clusterConflict.status === 'unknown'` (nunca `'clear'`) cuando falta el `coreKeyword` del
      candidato o el set seguido no tiene filas en `seo_keyword_market_data`.
- [ ] `clusterConflict` y `alreadyTracked` son campos separados y ninguno se deriva del otro.
- [ ] Calcular `clusterConflict` no genera ninguna llamada a DataForSEO (verificado por el ledger
      de gasto en la verificación runtime).
- [ ] Los cuatro adapters de expansión de `provider.ts` mandan la MISMA política de inclusión y
      ninguno lleva `filters` de `search_volume` hardcodeado.
- [ ] `methods_json` de una corrida nueva registra `volumePolicy` por método, y una corrida
      anterior sin el campo se lee con el default histórico correcto por método.
- [ ] La tool MCP `get_seo_keyword_discovery` expone `maxLinkBarrier` / `includeUnknownBarrier`,
      marca `maxDifficulty` como deprecado en su `.describe()` y describe el candidato como una
      keyword con procedencia múltiple.
- [ ] El lane ecosystem parsea los filtros nuevos y hace passthrough de `ignoredFilters`.
- [ ] `keyword-discovery-parity.test.ts` cubre los filtros nuevos y la deprecación declarada.
- [ ] Ninguna pieza de la task escribe `seo_keyword_set_members`, `seo_keyword_sets` ni dispara
      tracking.
- [ ] Sin migración, sin flag nuevo, sin capability nueva, sin scope OAuth nuevo.
- [ ] Delta registrado en `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` + doc funcional + manual
      actualizados.

## Verification

- `pnpm vitest run src/lib/growth/seo`
- `pnpm vitest run src/lib/api-platform src/mcp`
- `pnpm local:check`
- `pnpm test` (suite completa) + `pnpm build` como gate de cierre, con autorización del operador
  antes de correr el build de producción.
- `pnpm task:lint --task TASK-1694` y `pnpm ops:lint --changed`
- `pnpm docs:closure-check`
- Verificación runtime de los pasos 2–8 de `### Production verification sequence`, con la corrida
  real de smoke autorizada por el operador.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] `TASK-1660` recibe un `## Delta` con `clusterConflict` disponible como advertencia previa a
      declarar objetivos en lote, y el criterio agregado a su `## Acceptance Criteria`.
- [ ] `TASK-1667` recibe un `## Delta` sobre la cardinalidad nueva del candidato (una keyword, no
      una procedencia) para que no nazcan dos briefs de la misma intención.
- [ ] La corrida real de smoke queda documentada con costo, candidatos y mezcla de resultados en
      el registro de cierre de la task.

## Registro de cierre — 2026-08-28

**Estado: `code complete, rollout pendiente`.** Los cinco slices están implementados, verificados
contra PG real y documentados; falta la corrida real de smoke con gasto (no autorizada en esta
sesión) y el deploy del gateway MCP.

### Verificación runtime ejecutada (solo lectura, PG real vía proxy)

| Paso | Resultado |
|---|---|
| `maxDifficulty=20` sobre la corrida productiva | 10 → **10 candidatos** (NO reduce) + `ignoredFilters` lo declara con `replacement: maxLinkBarrier` |
| `maxLinkBarrier=medium` | 10 → **8** (excluye las 2 de barrera `high` que el filtro viejo dejaba pasar) |
| `clusterConflict` | **`conflict` real**: el candidato `pintura` choca con la ya seguida `pinturas` (core `pintures`) en `seot-berel-mx`; 9 restantes `clear` |
| Determinismo | Dos lecturas idénticas → mismo representante y mismo orden |
| Default histórico de `volumePolicy` | La corrida pre-1694 se lee `positive_volume_only` para `keyword_suggestions` |
| Gasto de proveedor por la señal de cluster | **Cero llamadas**: sólo dos lecturas del store de mercado |

### Hallazgos de la data real

- 🔴 **Defecto propio corregido gracias a la verificación runtime, no a los tests.** La primera
  implementación de `clusterConflict` trataba `core_keyword IS NULL` como "no se sabe" y dejaba 8
  de 10 candidatos en `unknown`, escondiendo colisiones reales. Medido sobre las 923 filas del
  store: **527 nulos, 396 apuntando a otra keyword, CERO autorreferentes** — el proveedor no emite
  el core cuando la keyword ya ES la canónica del clúster. El core efectivo pasó a ser
  `core_keyword ?? la keyword misma` y el único estado ciego es no tener fila de mercado.
- **764 de 923 filas del store tienen `keyword_difficulty = 0`** (83%): ISSUE-152 medido a escala,
  y la evidencia más dura de que `maxDifficulty` no discriminaba nada en es-LATAM.
- **334 de 923 filas no tienen perfil de enlaces** (36% → barrera `unknown`): por eso el default
  `includeUnknownBarrier: false` es una decisión con consecuencia real, no un detalle.
- **El caso de fusión todavía NO existe en datos reales.** Hay una sola corrida productiva (10
  candidatos, un solo método), así que ninguna keyword tiene procedencia múltiple hoy. El colapso
  es preventivo y llega antes del primer snapshot de `TASK-1700`, que es exactamente su razón de
  ser — pero conviene decirlo en vez de reportar una verificación que no ocurrió.
- **Cinco candidatos de la corrida comparten el core `pintura acrílica` ENTRE SÍ.** Es el caso que
  la `## Open Questions` dejó fuera de alcance (conflicto intra-corrida); la evidencia real
  refuerza que el follow-up vale, y su lugar natural sigue siendo la decisión en lote de
  `TASK-1660`.

### Pendientes de rollout

1. **Corrida real de smoke con gasto** (~USD 0,013) en un mercado es-LATAM ralo con la política
   `all`, comparando candidatos, filas compradas, costo y mezcla de `searchVolume = null` contra el
   smoke de `TASK-1664`. Requiere autorización explícita del operador.
2. **Deploy del gateway MCP** (`efeonce-mcp`): el commit local `807fb76` deja espejo de inventario,
   schema, descripción y canary al día, con sus 67 tests verdes. **Sin push** por acuerdo del
   operador; viaja con el próximo release del gateway.
3. Promoción a producción por el release control plane + observación de
   `seo-keyword-discovery-health` durante la primera corrida productiva.

### Desviación declarada respecto del criterio de aceptación

El criterio dice `unknown` (nunca `clear`) cuando "el set seguido no tiene filas de mercado". Se
implementó una distinción más fina, sostenida por la data: **un set seguido VACÍO devuelve `clear`**
—no hay nada contra qué canibalizar, y eso es un hecho positivo, no una ausencia de dato—, mientras
que un set con keywords y sin fila de mercado sí degrada a `unknown`. El propósito del invariante
("la ausencia de dato no se presenta como ausencia de conflicto") se conserva intacto.

## Follow-ups

- **Consumer UI (`ui-ux`)**: pintar en la lente `Descubrir` el aviso de canibalización en el
  drawer del candidato, el chip de procedencia múltiple y el filtro de barrera de enlaces, con
  wireframe bajo `docs/ui/wireframes/`, copy en `src/lib/copy/growth.ts` validado con
  `greenhouse-ux-writing` y evidencia GVC desktop + 390px.
- **Eliminación dura de `maxDifficulty`** del contrato de lectura, la ruta app, el lane ecosystem
  y el schema MCP, tras una release con la deprecación declarada y verificación de que ningún
  consumer lo sigue mandando.
- **Consolidación asistida**: convertir un `clusterConflict` en una propuesta gobernada
  (`propose → confirm → execute`) que cierre la membresía canibalizada vía `untrackKeywords`.
  Requiere decisión de producto: hoy detectar no es resolver, y resolver es cerrar una membresía
  con autor.
- Evaluar si `minSearchVolume` debería tener un default distinto de "sin filtro" en la lente,
  ahora que el long-tail sin volumen estimado entra por los cuatro métodos.

## Open Questions

- ¿`clusterConflict` debe considerar también los candidatos de la MISMA corrida entre sí (dos
  candidatos nuevos con el mismo `coreKeyword`), o sólo el choque contra el set ya seguido? La
  task resuelve lo segundo, que es donde hay gasto comprometido; lo primero es una advertencia de
  selección múltiple que probablemente pertenece a la superficie de decisión en lote
  (`TASK-1660`).
- ¿El techo de 5 nombres en `trackedMembers` es el correcto para un consumer agente, o conviene
  exponer la lista completa y dejar el recorte a la UI? Se elige 5 + total para no inflar la
  respuesta MCP; revisar si algún consumer necesita el detalle.
