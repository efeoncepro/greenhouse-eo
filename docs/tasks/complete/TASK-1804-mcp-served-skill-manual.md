# TASK-1804 — MCP: el manual de uso viaja por el protocolo, no en la nota del handshake

## Delta 2026-09-02 (follow-up) — el catálogo pasa de 3 a 6 manuales

Por instrucción del operador ("haz la 3 end-to-end") se agregaron tres manuales dentro del contrato
existente: `seo-discovery-to-tracking`, `seo-technical-health` y `seo-prospect-diagnostic`. Los
manuales sólo pueden gobernar tools del manifiesto de Greenhouse, así que hiring/Globe (nativas del
gateway) quedan fuera hasta que exista un contrato para tools externas. La `description` de
`get_greenhouse_skill` NO cambió (nombra el manual que cubre todo el gasto y remite al catálogo;
enumerar seis inflaría el contexto, lección de `TASK-1784`), por lo que el artefacto de tools y el
gateway no cambian: los manuales nuevos aparecen por el catálogo tras el siguiente release. El techo
"se revisa al pasar de 6" queda alcanzado exactamente: la próxima adición particiona por dominio.

## Delta 2026-09-02 (cierre) — released a producción

- Release `develop→main` llevado por otra sesión (`greenhouse-eo-ac`): PR #215 squash `375f56e24`,
  orquestador run `33683893124` completed/success (21:13Z→21:25Z), release_id
  `375f56e24187-546f452b-c60f-4617-9974-9c87760c3ab9`, manifest `released`, Vercel Production
  `greenhouse-j48cdjs2t`. El cuerpo del squash declaró esta lane + `get_greenhouse_skill` como canary
  de contrato obligatorio del release.
- **Canary de contrato contra producción (21:27:08Z→21:27:16Z, post-`released`):** lane con binding
  interno → catálogo 200 `count=3` exacto, ETag `"f2f570536e2abca50c37c88aa33a03a8"` + `If-None-Match`
  → 304; `seo-spend-discipline` 7352 B `73c4b40d2f3a…`, `seo-visibility-reading` 8400 B
  `e2a591c534b9…`, `competitor-loop` 6784 B `8921bc6ca7c2…` (iguales al artefacto); inexistente 404;
  sin token 401. Provider del gateway contra producción 5/5. Front door 200/200/401. Cero escrituras.
- El `ops-worker` cerró change-gated en `c4c838dea` (skip legítimo: `src/mcp/**` no está en el bundle
  del worker; el diff de árbol completo lo confirmó la sesión del release).
- Lo no ejercitado en runtime: `tools/call` por el front door OAuth (login Entra interactivo) y la
  negación con binding de cliente (sin consumer de cliente con token). Ambos cubiertos por tests.

## Delta 2026-09-02 — code complete, rollout pendiente

- **Slices 1–4 en código y tests verdes.** Greenhouse: `ec89014e4` (manifiesto + 3 manuales + tool +
  recurso + test de fuga), `12c0ea85d` (instructions rutean), `5a6ae57f4` (lane + tracing). Gateway
  `efeonce-mcp`: `c588a1b` **local, sin push** (provider `greenhouse-skills`, `get_greenhouse_skill`
  con annotations, `EXPECTED_GREENHOUSE_PLATFORM_TOOLS` + guard no-SEO, canary extendido).
- **Decisión de forma no cubierta por el spec:** la tool interna y el recurso `skill://` piden el
  cuerpo a la lane (como las otras 43 tools: el servidor sigue downstream de
  `api/platform/ecosystem/*` y el gating queda en un solo lugar); el guard de cobertura
  manifiesto↔filesystem corre igual al construir el servidor. Byte-identidad probada en test.
- **El guard SEO del gateway está anclado al dominio** y no veía una tool `platform`: se agregó
  `EXPECTED_GREENHOUSE_PLATFORM_TOOLS` + `computeFederatedNonSeoToolFindings` (bidireccional sobre el
  subconjunto no-SEO federado; no fuerza exclusiones para las 15 de plataforma fuera de alcance).
- **Runtime pendiente:** lane en staging/producción con binding real (cuenta exacta, negación,
  401) y deploy de Cloud Run del gateway + smoke en `mcp.efeonce.org`. `pnpm build` de producción
  no se corrió en local (cuelga la máquina; correr con autorización o dejar que lo pruebe Vercel).
- **Slice 5 (build fix, 2026-09-02 15:11Z):** el build de staging del SHA `eed9992d5` FALLÓ —
  *"The Vercel Function api/mcp/greenhouse is 397.29mb uncompressed (limit 250mb)"*. Causa
  verificada por descarte: el glob de `outputFileTracingIncludes` resuelve exactamente 3 archivos
  y `@vercel/nft` traza el bundle de la ruta en 2,6 MB; lo que rompe es que una ruta con includes
  propios deja de agruparse con las demás y la función sola (runtime de Next + deps) supera el
  techo. Cierre de la clase, no del caso: los manuales viajan como artefacto generado
  `src/mcp/greenhouse/skill-catalog.generated.json` (`pnpm mcp:skills:generate` /
  `pnpm mcp:skills:check` en `local:check` y CI; hashes re-verificados al cargar), cero `fs` en
  runtime, `outputFileTracingIncludes` retirado. El spec pedía «declarar el riesgo del bundling»;
  el riesgo se midió y se eliminó.
- **Slice 5b (2026-09-02 15:29Z):** el segundo build (`c4c838dea`, ya sin tracing) FALLÓ IGUAL
  (397,35 MB). Descartado nft (repro con la forma transpilada: 1 archivo); la causa que queda es el
  análisis estático de `fs` de Turbopack: `skill-catalog.ts` conservaba `readdirSync`/`readFileSync`
  sobre rutas derivadas de `process.cwd()` aunque el runtime ya no las ejecutara, y el módulo era
  alcanzable desde tres rutas. Todo `node:fs` se movió a `skill-catalog-fs.ts` (sólo generador y
  tests). Tres builds de staging fallidos en total; el operador recibió los correos de Vercel.
  **Build de staging `greenhouse-jr9hmjido` Ready con `4620875eb`** → causa confirmada.
- **Lane verificada en STAGING (2026-09-02, binding `internal` del consumer del gateway):** catálogo
  `count=3` exacto con los tres nombres, ETag + `If-None-Match` → 304, tres cuerpos byte-idénticos al
  artefacto (hashes `73c4b40d…`, `e2a591c5…`, `8921bc6c…`), `no-such-manual` → 404, sin token → 401.
  Canary del provider del gateway (`dist/providers/greenhouse-skills.js`) contra staging: 5/5 ✓. El
  camino de negación con binding de CLIENTE no se ejercitó en runtime (no existe un consumer con
  binding de cliente cuyo token esté disponible); queda cubierto por tests unitarios de la lane.
- ⚠️ El commit `4620875eb` arrastró archivos que otra sesión tenía en el índice compartido
  (`.claude/skills/mcp-craft/**`, `.codex/skills/mcp-craft/**`, `.claude/rules/mcp-tool-surface.md`,
  `scripts/skills/validate-mirrored-skills.mjs`); esa sesión lo registró en `bd112e66a`.
- **Gateway desplegado (decisión del operador: sólo `mcp.efeonce.org`, sin release a `main`):**
  `efeonce-mcp` `c588a1b` en `origin/main`, CI `33646464475` success, Deploy Cloud Run
  `33646625344` success, revisión `efeonce-mcp-gateway-00028-pmx`, front door
  `/.well-known/oauth-protected-resource` 200 · `/health` 200 · `POST /mcp` sin token 401. La tool
  queda registrada respondiendo `not_found` honesto hasta que la lane llegue a producción.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `api`
- Epic: `none`
- Status real: `complete — released a producción 2026-09-02 (release 375f56e24187-546f452b-c60f-4617-9974-9c87760c3ab9, target 375f56e24, run 33683893124); canary de contrato contra producción verde 21:27Z; gateway 00028-pmx sirviendo los manuales`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `Greenhouse develop; efeonce-mcp main; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Hoy todo lo que un agente sabe sobre cómo usar nuestras 43 tools MCP cabe en un párrafo: las
`instructions` del handshake, que viajan en cada request y por eso no pueden crecer. Esta task abre
un segundo canal — un manual curado que el agente carga **sólo cuando lo necesita** — usando el
patrón que Figma, Adobe, HubSpot y Higgsfield ya tienen en producción: una tool cuyo único trabajo
es entregar instrucciones. Empieza con tres manuales (disciplina de gasto, lectura de visibilidad,
ciclo de competidores) servidos internal-only, y deja el carril listo para `skill://` cuando el SDK
implemente SEP-2640.

## Why This Task Exists

El conocimiento de uso de la superficie MCP no tiene dónde vivir. Hoy se reparte entre tres lugares
y ninguno sirve:

1. **Las `instructions` del servidor** ([`buildGreenhouseMcpServerIdentity`](../../architecture/../../src/mcp/greenhouse/tool-manifest.ts)):
   están en contexto en cada request, así que cada línea que se agrega la pagan todas las llamadas.
   Ya cargan el cartel derivado de escrituras y gasto; no pueden además enseñar a operar el dominio.
2. **Las `description` de cada tool**: son el único texto garantizado en contexto, así que sirven
   para *disparar*, no para *enseñar*. Cuando se les mete el procedimiento completo —el caso vivo es
   `get_seo_competitor_candidates`, que lleva el contrato del `proposalRef` dentro de su descripción—
   se infla el prompt de todos los consumidores para un procedimiento que casi ninguno ejecuta.
3. **`.claude/skills/**`**: 110 skills escritas para un agente que opera *el repositorio*. No son
   publicables: la skill `efeonce-mcp-platform` sola contiene IDs de clientes Entra, nombres de
   secretos de Secret Manager, el org id real de un cliente y la razón competitiva por la que
   `get_seo_work_queue` está excluida de la federación.

La consecuencia concreta: un agente puede llamar `track_seo_keywords` o `declare_seo_competitors`
sin entender que **está comprometiendo gasto recurrente del proveedor** hasta que alguien lo retire.
Eso hoy no explota porque las 7 escrituras están fail-closed —ningún token del cliente público las
abre— pero la protección es la ausencia de un scope, no el entendimiento del agente. Cuando
`TASK-1631` habilite grants por tenant, el entendimiento pasa a ser la única defensa que queda.

La industria ya convergió a la solución y la spec la está formalizando: SEP-2640 sirve skills como
recursos MCP bajo `skill://`. Ninguno de nuestros dos SDKs lo implementa todavía (verificado por
grep: `@modelcontextprotocol/sdk@1.29.0` en Greenhouse y `@modelcontextprotocol/server@2.0.0` en el
gateway, cero hits de `skills/list` o `resources/directory/read`), así que el carril de hoy es una
tool — exactamente lo que hacen Adobe (`html_export_readiness_skill`), HubSpot (`tool_guidance`) y
Higgsfield (`get_workflow_instructions`), y lo que Figma expone como fallback de su `skill://index.json`.

## Goal

- Un manifiesto declarativo de manuales, hermano del de tools, donde publicar es un acto explícito.
- Tres manuales escritos para el consumidor MCP, servidos por tool y por recurso `skill://`.
- Las `instructions` del servidor achicadas: rutean al manual en vez de contenerlo.
- El manual disponible en `mcp.efeonce.org` con la misma disciplina de gating que el resto del lane.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md`
- `docs/architecture/GREENHOUSE_MCP_ARCHITECTURE_V1.md` (§22 Gateway)
- `docs/architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`

Reglas obligatorias:

- **El gateway es adaptador neutral.** No aloja el contenido de los manuales: los pide al lane
  canónico de Greenhouse. Un bundle estático en el gateway es una segunda fuente de verdad y
  reintroduce el drift que `TASK-1780` cerró para las tools.
- **El manifiesto es la fuente, no un comentario.** Manual declarado sin archivo, o archivo sin
  entrada, hace fallar la construcción del servidor — mismo contrato que
  `GREENHOUSE_MCP_TOOL_MANIFEST`.
- **La federación empieza en Greenhouse.** Orden: entrada en el manifiesto de Greenhouse →
  `pnpm mcp:manifest:generate` → `pnpm greenhouse:manifest:sync` en el gateway → adapter →
  `registerTool` con annotations → entrada `EXPECTED_*` con razón → canary. Nunca editar
  `greenhouse-tool-manifest.generated.ts` a mano.
- **Default disabled, read-only, fail-closed.** La tool es lectura pura: `writes: false`,
  `spendsProviderBudget: false`, `readOnlyHint: true`. Va sobre el scope existente
  `efeonce.mcp.read`; **cero cambios en Entra**.
- **Sin contenido interno.** Ningún manual publicado cita secretos, IDs de aplicación Entra,
  identificadores de organización reales, razones de exclusión competitiva ni rutas del repositorio
  privado.

## Normative Docs

- `docs/operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/tasks/complete/TASK-1780-mcp-tool-manifest-derived-identity.md` [verificar slug exacto] — el
  molde declarativo que esta task replica.
- SEP-2640 (Skills Extension) y el esquema `skill://`, para no cerrarle la puerta al carril estándar:
  <https://github.com/modelcontextprotocol/experimental-ext-skills>

## Dependencies & Impact

### Depends on

- `src/mcp/greenhouse/tool-manifest.ts` — el manifiesto de tools y `buildGreenhouseMcpServerIdentity`.
- `src/mcp/greenhouse/server.ts` — el recorrido del manifiesto y el `registerResource` existente de
  knowledge documents, que es el patrón a espejar.
- `scripts/ci/mcp-tool-manifest-artifact.ts` — el generador del artefacto que consume el gateway.
- `~/Documents/efeonce-mcp` → `src/mcp.ts`, `src/providers/`, `src/providers/greenhouse-seo-tool-parity.ts`.

### Blocks / Impacts

- `TASK-1784` (eval de ruteo entre tools que se parecen) — **complementaria, no solapada**: 1784
  mejora la `description` de cada tool, que está siempre en contexto y sirve para elegir; esta task
  agrega el manual bajo demanda, que sirve para operar. Esta task **no toca ninguna `description`
  existente**. Si 1784 cierra primero, su eval puede medir si tener manual mejora la selección.
- `TASK-1631` (identidad de cliente y entitlements B2B) — desbloquea `audience: client`, fuera de
  alcance acá.
- `TASK-1793` (cobertura documental del lane ecosystem) — **objetos distintos**: 1793 documenta el
  contrato HTTP de las rutas para humanos en `docs/api/**` y la arquitectura; esta task escribe
  material agent-facing servido por el protocolo. Cero archivos compartidos.

### Files owned

- `src/mcp/greenhouse/skill-manifest.ts` (nuevo)
- `src/mcp/greenhouse/server.ts` (modificado)
- `src/mcp/greenhouse/tool-manifest.ts` (modificado — entrada de la tool nueva)
- `src/mcp/greenhouse/__tests__/skill-manifest.test.ts` (nuevo) [verificar convención de nombre]
- `docs/mcp/skills/**` (nuevo — los SKILL.md publicables)
- `src/app/api/platform/ecosystem/mcp/skills/route.ts` (nuevo)
- `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md` (modificado — sección nueva)
- `~/Documents/efeonce-mcp/src/providers/greenhouse-skills.ts` (nuevo)
- `~/Documents/efeonce-mcp/src/mcp.ts` (modificado)

## Current Repo State

### Already exists

- `GREENHOUSE_MCP_TOOL_MANIFEST` con 43 tools tipadas y el contrato «entrada + definición o el
  servidor no construye» (`src/mcp/greenhouse/tool-manifest.ts`).
- `buildGreenhouseMcpServerIdentity` derivando `name` + `instructions` del inventario, con el cartel
  de escrituras y gasto ya calculado (mismo archivo, ~línea 447).
- `registerResource` con `ResourceTemplate` funcionando para knowledge documents
  (`src/mcp/greenhouse/server.ts`, ~línea 831) — el patrón exacto que necesita el carril `skill://`.
- El pipeline de artefacto y sincronización: `pnpm mcp:manifest:generate` / `pnpm mcp:manifest:check`
  acá, `pnpm greenhouse:manifest:sync` en el gateway, con hash verificado al cargar.
- El guard de paridad bidireccional del gateway, con `EXPECTED_*`, `GREENHOUSE_SEO_TOOL_EXCLUSIONS`
  y `GREENHOUSE_GATEWAY_NATIVE_TOOLS`.
- 110 skills internas en `.claude/skills/**` — fuente de oficio, **no** material publicable.

### Gap

- No existe manifiesto de manuales ni concepto de «contenido publicable por MCP».
- No existe ninguna tool ni recurso que entregue instrucciones; el único canal es `instructions`.
- No existe una lane ecosystem que sirva contenido agent-facing.
- El procedimiento del `proposalRef` y la disciplina de gasto viven dentro de descripciones de tools
  y de las `instructions`, pagando contexto en cada request.

## Modular Placement Contract

- Topology impact: `api`
- Current home: `src/mcp/greenhouse/**` + `src/app/api/platform/ecosystem/mcp/skills/` (runtime
  Next.js de Vercel) y el adapter en el repositorio `efeonce-mcp` (Cloud Run).
- Future candidate home: `remain-shared`
- Boundary: el manifiesto de manuales (`skill-manifest.ts`) es el primitive; consumidores
  autorizados son el servidor MCP interno, la lane ecosystem y —vía lane— el provider del gateway.
  Ningún consumidor lee los `.md` del filesystem por su cuenta.
- Server/browser split: server-only. El contenido se lee del filesystem del bundle del servidor;
  nunca llega al browser ni se importa desde componentes cliente.
- Build impact: los `.md` publicables son **filesystem input** del runtime de Vercel. Declararlo
  explícito: si el bundling no los incluye, la lane responde vacío en producción y verde en local.
- Extraction blocker: `none` — es lectura de contenido estático sin transacción ni datos de tenant.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `api`
- Source of truth afectado: `src/mcp/greenhouse/skill-manifest.ts` + los `.md` bajo `docs/mcp/skills/`
- Consumidores afectados: `MCP` (servidor interno y gateway), `external` (clientes MCP autenticados)
- Runtime target: `local`, `staging`, `production`

### Contract surface

- Contrato existente a respetar: `src/mcp/greenhouse/tool-manifest.ts`,
  `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md`, el contrato de lane ecosystem
  (`externalScopeType` + `externalScopeId` obligatorios).
- Contrato nuevo: tool `get_greenhouse_skill`, recursos `skill://efeonce/<name>/SKILL.md`, lane
  `GET /api/platform/ecosystem/mcp/skills` y `GET /api/platform/ecosystem/mcp/skills/{name}`.
- Backward compatibility: `compatible` — todo es aditivo. El único cambio a contrato vigente es el
  acortamiento de `instructions`, que es texto y no rompe ningún cliente.
- Full API parity: el manifiesto es el primitive server-side; la tool MCP, el recurso `skill://` y la
  lane son tres consumidores del mismo reader. Cero lógica duplicada por consumidor.

### Data model and invariants

- Entidades/tablas/views afectadas: `ninguna` — no hay persistencia. El contenido es estático y
  versionado en git.
- Invariantes que no se pueden romper:
  - Manual declarado sin archivo, o archivo bajo `docs/mcp/skills/` sin entrada en el manifiesto:
    la construcción del servidor falla. No hay publicación silenciosa.
  - Un manual `audience: internal` **nunca** se sirve a un binding con organización de cliente. La
    negativa es `404` anti-oráculo, nunca `403`: un 403 confirma que el manual existe.
  - Ningún manual publicado referencia secretos, IDs de aplicación Entra, identificadores de
    organización reales ni rutas del repositorio privado. Se verifica con un test, no con revisión.
  - El frontmatter de cada `.md` (`name`, `description`) es la fuente de la entrada del catálogo;
    transcribirlo al manifiesto reintroduce el drift que este contrato existe para evitar.
- Write-target allowlist: `N/A — la task no escribe en ninguna tabla.`
- Tenant/space boundary: derivada del binding del lane, igual que el resto del carril ecosystem. El
  contenido no es per-organización; lo que varía por binding es **qué subconjunto** se lista.
- Idempotency/concurrency: `N/A — lectura pura, sin efectos.`
- Audit/outbox/history: `none` — es lectura de documentación pública para el consumidor. El acceso
  queda en los logs del lane como cualquier otro `GET`.

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: los manuales nacen `audience: internal`. La lane se despliega antes que el provider
  del gateway, así que existe y responde antes de tener consumidor externo.
- Backfill plan: `N/A — no hay datos preexistentes.`
- Rollback path: `revert PR` para los slices 1–3. Para el slice 4, revertir el deploy del gateway a
  la revisión anterior de Cloud Run.
- External coordination: **cero cambios en Entra** — la tool viaja sobre `efeonce.mcp.read`. Sí
  requiere un deploy del gateway, que es la coordinación fuera del repositorio de Greenhouse.

### Security and access

- Auth/access gate: token de consumidor del lane ecosystem con su binding; en el gateway, el scope
  `efeonce.mcp.read` ya emitido.
- Sensitive data posture: `no sensitive data` **por construcción y verificado por test** — es
  precisamente el riesgo central de esta task, ver el test de fuga en el slice 1.
- Error contract: `canonicalErrorResponse` para la lane; `404` anti-oráculo para manual inexistente
  o no autorizado, sin distinguir entre ambos casos.
- Abuse/rate-limit posture: hereda el del lane ecosystem. El contenido es estático y cacheable;
  declarar `Cache-Control` explícito en la lane.

### Runtime evidence

- Local checks: `pnpm test src/mcp`, `pnpm mcp:manifest:check`, el test de fuga de contenido, y el
  servidor MCP levantado con `pnpm mcp:greenhouse` listando el catálogo.
- DB/runtime checks: `N/A — sin persistencia.`
- Integration checks: la lane ejercitada contra **staging** con `externalScopeType`/`externalScopeId`
  reales (recordar: la lane ecosystem **no se puede probar en localhost**, falla con `ENOENT` de
  `@opentelemetry/instrumentation` y ese `500` no dice nada sobre el endpoint nuevo). Después, el
  smoke autenticado del gateway.
- Reliability signals/logs: sin señal nueva. Un catálogo vacío en producción con manifiesto no vacío
  es el síntoma a vigilar (indica que los `.md` no entraron al bundle).
- Production verification sequence: ver `Rollout Plan & Risk Matrix`.

### Acceptance criteria additions

- [x] Source of truth, contract surface y consumidores nombrados con paths reales.
- [x] Invariantes, frontera de acceso y posture de idempotencia explícitos.
- [x] `N/A — no crea tablas`, declarado con razón, en vez de allowlist de escritura.
- [x] Posture de migración/rollback explícita y proporcional.
- [x] Evidencia runtime listada para todo lo que no sea documentación.
- [x] Sin fuga de datos internos, verificada por test y no por lectura humana.

## Capability Definition of Done — Full API Parity gate

- [x] Lógica en el primitive: la resolución catálogo/manual vive en `src/mcp/greenhouse/`, no dentro
      del route handler ni del adapter del gateway.
- [x] Modelada como reader canónico sobre el manifiesto, no como handler acoplado a la tool.
- [x] Read expuesto como reader + recurso; **no hay write**, así que el bloque de command semantics
      no aplica y se declara así.
- [x] Capability + grant: `N/A — no gatea por capability`. La autorización es el binding del lane y
      el scope de lectura ya existente. Declarado explícito para que no se lea como olvido.
- [x] Camino programático declarado: `api/platform/ecosystem` + MCP, en esta misma task.
- [x] `propose → confirm → execute`: `N/A — no hay write.`
- [x] Un primitive, muchos consumidores: tool interna, recurso `skill://`, lane y gateway leen el
      mismo manifiesto.
- [x] Parity check: sí — la capacidad nace con contrato gobernado y sin superficie UI equivalente.

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

### Slice 1 — Manifiesto, contenido y tool interna

- `src/mcp/greenhouse/skill-manifest.ts`: tipo `GreenhouseMcpSkillManifestEntry` con `name`,
  `description`, `audience` (`internal` | `client`), `sourcePath` y `appliesTo: string[]` (las tools
  que el manual gobierna, validadas contra `GREENHOUSE_MCP_TOOL_MANIFEST_BY_NAME`).
- Cobertura bidireccional: entrada sin archivo o archivo sin entrada ⇒ el servidor no construye.
  Espejar `computeGreenhouseMcpToolCoverage`.
- Tres manuales bajo `docs/mcp/skills/`: `seo-spend-discipline`, `seo-visibility-reading`,
  `competitor-loop`.
- Tool `get_greenhouse_skill({ name?: string })` en `server.ts` + su entrada en el manifiesto de
  tools (`domain: 'platform'`, `writes: false`, `spendsProviderBudget: false`).
- Recursos `skill://efeonce/<name>/SKILL.md` vía `registerResource`, espejando el registro de
  knowledge documents.
- **Test de fuga**: recorre todo `docs/mcp/skills/**` y falla si aparece un patrón de secreto, un
  UUID de aplicación Entra, un identificador `org-`, o una ruta `src/`. Este test es el control real
  del invariante; la revisión humana no lo es.

### Slice 2 — Las `instructions` rutean en vez de contener

- `buildGreenhouseMcpServerIdentity` recibe el manifiesto de manuales y deriva la línea de ruteo.
- El párrafo de gasto que hoy enumera las 4 tools que comprometen presupuesto se reduce a la
  afirmación + el puntero al manual. La enumeración sigue derivada del inventario, no escrita a mano.
- Actualizar los tests de identidad existentes.

### Slice 3 — Lane ecosystem

- `GET /api/platform/ecosystem/mcp/skills` (catálogo filtrado por binding) y
  `GET /api/platform/ecosystem/mcp/skills/{name}` (contenido).
- Gating: `audience: internal` sólo para bindings de scope `internal`; para cualquier otro, `404`
  anti-oráculo tanto en el listado (no aparece) como en el detalle (no existe).
- Errores canónicos y `Cache-Control` explícito.
- Ejercitar contra **staging** con binding real, incluyendo el camino de negación.

### Slice 4 — Federación al gateway

- `pnpm mcp:manifest:generate` acá → `pnpm greenhouse:manifest:sync` en `efeonce-mcp`.
- Provider `greenhouse-skills.ts` delegando a la lane. Sin contenido embebido.
- `registerTool` con `annotations.readOnlyHint: true` + entrada `EXPECTED_*` con razón en el guard
  de paridad.
- Deploy de Cloud Run y smoke autenticado en `mcp.efeonce.org`.

## Out of Scope

- **Reescribir las `description` de las tools existentes** — es `TASK-1784`. Esta task agrega un
  canal nuevo; no toca el texto que ya está en contexto. Si al escribir un manual aparece una
  descripción mejorable, se anota como follow-up para 1784, no se edita acá.
- **Documentar el contrato HTTP del lane para humanos** — es `TASK-1793`, sobre
  `GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` y `docs/api/**`. Objeto y archivos distintos.
- **Servir `.claude/skills/**` por MCP.** Nunca, ni filtrado. El contenido publicable se escribe
  aparte, con otra audiencia.
- **`audience: client` y acceso externo al manual** — depende de `TASK-1631`. El tipo se define en
  el slice 1 para que el gating exista desde el día uno, pero ningún manual nace con ese valor.
- **Implementar `skills/list` / `skills/get` de SEP-2640.** Ningún SDK lo soporta hoy. El carril
  `skill://` del slice 1 deja la puerta abierta sin comprometer la spec.
- **Recomendaciones derivadas de datos** (el plan diario es `TASK-1669`) y **memoria por
  organización** (`TASK-1779`). Un manual es contenido estático, igual para todos los consumidores.
- Cambios en Entra, scopes nuevos y cualquier escritura.

## Detailed Spec

El detalle de forma vive en el código que esta task espeja: `tool-manifest.ts` para el manifiesto y
su cobertura, `server.ts` (~831) para el `registerResource`, y el guard de paridad del gateway para
la entrada `EXPECTED_*`. No se duplica acá.

Lo que sí es decisión de esta task y no se deriva de nada existente:

**Qué va en cada manual.** Tres, elegidos porque los tres ya existen como conocimiento y hoy están
mal alojados:

| Manual | Qué enseña | De dónde sale hoy |
|---|---|---|
| `seo-spend-discipline` | Las 4 tools que comprometen presupuesto; que seguir una keyword o declarar un competidor es **compromiso diferido** que factura en cada ciclo hasta que alguien lo retire; que hay que proponer la lista exacta a un humano antes de llamar; que se lee el array de outcomes por ítem, nunca `data.ok` | El párrafo de gasto de las `instructions` |
| `seo-visibility-reading` | Cómo se encadenan los readers de visibilidad; qué significa `sin_dato` y por qué no es cero; que la serie SERP no es backfilleable, así que la ausencia de fechas viejas es estructural | Repartido entre descripciones de tools |
| `competitor-loop` | El ciclo proponer → confirmar → declarar: `get_seo_competitor_candidates` devuelve un `proposalRef` y `declare_seo_competitors` sólo se llama con ese `proposalRef` verbatim después de confirmación humana; una lista vacía con serie joven es el resultado esperado, no un error | La `description` de `get_seo_competitor_candidates` |

**Formato.** Frontmatter YAML con `name` y `description` — el mismo contrato de Agent Skills, para
que el día que el SDK implemente SEP-2640 el contenido ya sirva sin reescribirse. El manifiesto
**lee** ese frontmatter; no lo transcribe.

**Fraseo de disparo.** La `description` de la tool y la línea de las `instructions` usan el patrón
que Figma demostró que funciona: nombrar el prerrequisito explícito antes de la tool que gobierna
(«carga `seo-spend-discipline` antes de cualquier tool que comprometa presupuesto»). Es la única
palanca disponible, porque es el único texto garantizado en contexto.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (manifiesto + contenido + tool) → Slice 2 (instructions) — el ruteo no puede apuntar a un
  manual que no existe.
- Slice 1 → Slice 3 (lane) → Slice 4 (gateway). El gateway delega en la lane: federar antes de que
  la lane exista deja la tool registrada y muerta, que es justo el modo de falla que el invariante
  «una tool registrada no es una tool que funciona» describe.
- Slice 2 puede correr en paralelo con Slice 3.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un manual publica contenido interno (secreto, id de app Entra, org id, ruta privada) | MCP / seguridad | medium | Test de fuga sobre todo `docs/mcp/skills/**` en CI; contenido escrito de cero, nunca copiado de `.claude/skills/**` | El test falla en CI; no hay señal runtime — por eso el control es pre-merge |
| El manual se desactualiza y enseña un procedimiento que ya cambió | MCP | high | `appliesTo` valida contra el manifiesto de tools: si la tool que el manual gobierna desaparece o se renombra, la construcción falla | El servidor no construye |
| Los `.md` no entran al bundle de Vercel y la lane responde catálogo vacío en producción con verde en local | API | medium | Assert en el smoke de producción: el catálogo devuelve exactamente la cuenta del manifiesto, no «≥ 1» | Catálogo vacío con manifiesto no vacío |
| Un binding de cliente lista un manual `internal` | MCP / acceso | low | `404` anti-oráculo en listado y detalle; caso de negación ejercitado en el smoke del slice 3 | Aparición del manual en una respuesta con binding de cliente |
| El catálogo crece y vuelve a inflar el contexto que esta task vino a achicar | MCP | medium | El catálogo devuelve `name` + `description`, nunca cuerpos. Techo declarado: si supera ~12 manuales, se particiona por dominio antes de seguir agregando | Tamaño de la respuesta del catálogo |
| El gateway sirve contenido stale respecto de Greenhouse | MCP | low | El gateway no almacena contenido: delega en la lane en cada llamada | Divergencia entre la tool interna y la federada |

### Feature flags / cutover

Sin flag. El cambio es aditivo y de lectura pura: una tool nueva, recursos nuevos y una lane nueva,
ninguno consumido por nada existente. El único cambio a algo vigente es el texto de `instructions`,
cuyo revert es un `revert` de commit. Poner un flag acá sería ceremonia sin blast radius que
justifique el costo de un flag más en el ledger.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | `revert` del PR — la tool desaparece del manifiesto y del servidor | <10 min | sí |
| Slice 2 | `revert` del commit; las `instructions` vuelven al texto anterior, derivado igual | <5 min | sí |
| Slice 3 | `revert` + redeploy de Vercel; la lane deja de existir y responde 404 | <10 min | sí |
| Slice 4 | Redirigir tráfico a la revisión previa de Cloud Run del gateway | <5 min | sí |

### Production verification sequence

1. Merge de los slices 1–2 a `develop`; verificar `pnpm mcp:manifest:check` verde y el servidor
   levantando con el catálogo de 3 manuales.
2. Deploy del slice 3 a staging. Ejercitar la lane con `externalScopeType`/`externalScopeId`
   reales: catálogo completo con binding `internal`, catálogo sin los `internal` con binding de
   cliente, `404` en el detalle de un manual `internal` desde un binding de cliente, `401` sin token.
3. Promoción a producción por el control plane de release. Repetir los cuatro asserts contra
   producción, incluyendo la **cuenta exacta** del catálogo.
4. Deploy del gateway (slice 4). Smoke autenticado en `mcp.efeonce.org`: `initialize`, la tool en el
   listado, un manual recuperado completo, y la paridad interna ↔ federada.

### Out-of-band coordination required

Deploy de Cloud Run del gateway `efeonce-mcp` para el slice 4 — repositorio distinto, pipeline
distinto. **Cero cambios en Entra**: la tool viaja sobre `efeonce.mcp.read`, ya emitido. Sin
secretos nuevos, sin variables de entorno nuevas, sin coordinación con operadores.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] `skill-manifest.ts` existe y su cobertura es bidireccional: declarar sin archivo, o dejar un
      archivo sin declarar, hace fallar la construcción del servidor. Probado con un test que
      ejercita ambas direcciones.
- [x] Existen exactamente tres manuales bajo `docs/mcp/skills/`, con frontmatter `name` +
      `description`, y el manifiesto lee ese frontmatter en vez de transcribirlo.
- [x] El test de fuga recorre todo `docs/mcp/skills/**` y falla ante un patrón de secreto, un UUID
      de aplicación Entra, un identificador `org-` o una ruta `src/`.
- [x] `get_greenhouse_skill` está registrada, tiene entrada en `GREENHOUSE_MCP_TOOL_MANIFEST` con
      `writes: false` y `spendsProviderBudget: false`, y `pnpm mcp:manifest:check` pasa.
- [x] Los recursos `skill://efeonce/<name>/SKILL.md` resuelven y devuelven el mismo cuerpo que la tool.
- [x] Las `instructions` del servidor nombran el manual y ya no contienen el procedimiento de gasto;
      la enumeración de tools que comprometen presupuesto sigue derivada del inventario.
- [x] (staging 2026-09-02 ~15:45Z y PRODUCCIÓN 2026-09-02 21:27Z con el binding interno real del consumer del gateway: catálogo exacto, ETag/304, cuerpos byte-idénticos, 404 inexistente, 401 sin token. El camino de negación con binding de CLIENTE quedó cubierto por tests de la lane, no en runtime: no existe consumer de cliente con token disponible) La lane responde en **staging** y en **producción** con binding real: catálogo completo con
      binding `internal`, catálogo sin `internal` con binding de cliente, `404` en el detalle desde
      binding de cliente, `401` sin token.
- [x] (2026-09-02 21:27Z contra producción: `count=3` exacto y los tres nombres; provider del gateway 5/5) El smoke de producción compara la **cuenta exacta** del catálogo contra el manifiesto, no `≥ 1`.
- [x] El gateway federa la tool con `readOnlyHint: true`, tiene su entrada `EXPECTED_*` con razón, y
      el guard de paridad pasa.
- [x] (2026-09-02 ~22:05Z: `claude mcp login efeonce-mcp` bajo pty con la sesión Entra del operador → `✔ Connected`; un agente Claude Code en sesión nueva (`claude -p`, sólo `mcp__efeonce-mcp__get_greenhouse_skill` permitida) llamó `tools/call` por el front door OAuth de `mcp.efeonce.org`: catálogo de 3 manuales con sus nombres y el manual `seo-spend-discipline` completo, del que resumió correctamente las tres reglas y la semántica de `data.ok`. Los hashes que sirve el provider contra producción coinciden con el artefacto de la tool interna) Un manual recuperado por `mcp.efeonce.org` es byte-idéntico al que devuelve la tool interna.
- [x] `MCP_TOOL_SURFACE_INVARIANTS.md` documenta el contrato del manifiesto de manuales y la regla de
      no publicar contenido interno.
- [x] Cero cambios en Entra, cero scopes nuevos, cero escrituras.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test src/mcp`
- `pnpm mcp:manifest:check`
- `pnpm test` (suite completa) + `pnpm build` como gate de cierre
- Servidor MCP levantado con `pnpm mcp:greenhouse` y el catálogo listado a mano
- Lane ejercitada contra staging y producción con binding real, camino de negación incluido
- Smoke autenticado del gateway en `mcp.efeonce.org`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` quedó sincronizado con el cierre
- [ ] `Handoff.md` quedó actualizado
- [ ] `changelog.md` quedó actualizado
- [ ] se ejecutó chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `TASK-1784` recibió un `## Delta` si esta task cambió su baseline de conteo de tools
- [ ] los dos bundles de skill (`.claude/` y `.codex/`) quedaron byte-idénticos si se tocó
      `efeonce-mcp-platform`
- [ ] el estado de cierre dice `complete`, `code complete, rollout pendiente` u `operativamente
      bloqueado` sin eufemismos: si el gateway no se desplegó, no es `complete`

## Follow-ups

- Migrar al carril estándar `skills/list` + `resources/directory/read` cuando el SDK implemente
  SEP-2640. El contenido y el frontmatter ya quedan en el formato correcto.
- `audience: client` con manuales escritos para el consumidor externo, una vez que `TASK-1631`
  habilite grants por tenant.
- Manuales para los dominios no-SEO de la superficie (plataforma, webhooks, knowledge, commercial)
  si el patrón demuestra valor.
- Si el eval de `TASK-1784` mide selección de tools, medir el delta con y sin manual cargado.

## Open Questions

- ¿El catálogo debería listar también los manuales `internal` a un binding de cliente, marcados como
  no disponibles? Esta task asume que **no** —anti-oráculo estricto, consistente con
  `get_seo_provider_spend`— pero es una decisión de producto revisable si aparece un caso donde
  saber que el manual existe sea legítimo.
- El techo de ~12 manuales antes de particionar por dominio es una estimación, no una medición. Se
  revisa cuando el catálogo pase de 6.
