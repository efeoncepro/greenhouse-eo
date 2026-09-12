# TASK-1864 — Superficie agéntica autosuficiente del MCP de Efeonce: instructions del gateway, kit de cliente Claude/Codex y eval end-to-end de agentes

## Delta 2026-09-12

- `TASK-1869` agrega tools de diagnóstico operativo de dominio `platform` (señales de confiabilidad, estado de
  flags por runtime, resumen agregado por dominio). Cuando se federen, deben quedar cubiertas por las
  `instructions` derivadas del manifiesto y por el digest de superficie que esta task define: una tool de
  diagnóstico que el agente no sabe cuándo usar es exactamente el hueco que esta task existe para cerrar.
- Sin cambio de alcance acá: `TASK-1869` es dueña de los readbacks y de su federación; esta task sigue siendo
  dueña de cómo el agente aprende a operarlos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-044`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `Greenhouse develop; efeonce-mcp rama feature + PR (auto-deploy en main); sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Un agente Claude o Codex conectado a `mcp.efeonce.org` hoy no sabe **cómo** operar un flujo de varios pasos
(correr el AEO Grader, leer SEO, habilitar servicios) salvo que una persona se lo explique en cada sesión: el
gateway no envía `instructions`, los manuales sólo llegan si el agente ya sabe pedirlos y las respuestas federadas
son JSON crudo sin siguiente paso. Esta task hace **autosuficiente** la superficie agéntica: instructions del gateway
derivadas del manifiesto (primeros 512 caracteres autocontenidos), un contrato estructurado de **siguiente paso**
que cruza el gateway sin prosa por tool, un **kit de cliente** para Claude y Codex que sólo enruta a los manuales, y un
**eval end-to-end de agentes** que prueba con Claude Code y Codex que una sola frase produce el flujo completo.

## Why This Task Exists

Discovery 2026-09-10/11, verificado en código y documentación oficial:

1. **El gateway no envía `instructions`.** `buildMcpServer` crea `new McpServer({ name, version, title, websiteUrl,
   icons })` sin ese campo (`efeonce-mcp/src/mcp.ts:137-143`); no hay otra aparición en `efeonce-mcp/src`. Greenhouse sí
   las construye (`buildGreenhouseMcpServerIdentity`, `src/mcp/greenhouse/tool-manifest.ts:465-513`), pero sólo las sirve
   su servidor downstream (stdio/remote), que los clientes finales no usan.
2. **Los dos clientes sí las consumen.** Codex: *"reads the MCP `instructions` field … Keep the first 512 characters
   self-contained"* ([Codex MCP](https://learn.chatgpt.com/docs/extend/mcp?surface=cli)). Claude Code las inyecta en el
   contexto de la sesión (evidencia directa: la sesión que creó esta task tiene las instructions de Figma, Semrush,
   Whimsical y otros servidores, y ninguna de `efeonce-mcp`). Con tool search, Claude Code difiere las tools: sin
   instructions, el agente no ve nada de Efeonce hasta adivinar qué buscar.
3. **Los manuales sólo llegan por una tool.** El gateway expone `get_greenhouse_skill` (`efeonce-mcp/src/mcp.ts:217-273`)
   y no registra resources ni prompts (`registerResource`/`registerPrompt`: cero apariciones). Es correcto como canal
   (invariantes §8), pero sin instructions nada le dice al agente que existe un manual antes de operar.
4. **Las pistas de siguiente paso no cruzan el gateway.** Greenhouse escribe resúmenes como *"poll get_seo_keyword_discovery
   with this runId … do NOT claim results exist yet"* (`src/mcp/greenhouse/tools.ts:1333-1337`), pero los handlers
   federados del gateway devuelven `JSON.stringify(data)` (`efeonce-mcp/src/mcp.ts:320,362,382,406,448`).
5. **El gate de versión no mediría las instructions.** `collectSurface` digiere nombre + descripción de tools
   (`efeonce-mcp/src/surface.ts:43-48`); editar instructions también invalida el caché de prompt del cliente y hoy pasaría
   sin bump de versión.
6. **Nada prueba el flujo completo.** `pnpm mcp:selection-eval` mide la elección de UNA tool por pregunta
   (`scripts/mcp/tool-selection-eval.ts`); los canaries prueban contrato y OAuth. La matriz de certificación de clientes
   (`docs/audits/mcp/EFEONCE_MCP_CLIENT_TOKEN_MATRIX_2026-09-06.md`) certifica discovery y tokens, no si el cliente usa
   instructions ni si el agente completa un flujo.
7. **La configuración por máquina está vacía.** El `~/.codex/AGENTS.md` del operador existe con 0 bytes y ninguna skill
   global de Codex (`~/.codex/skills`, `~/.agents/skills`) cubre Efeonce; las skills del repo sólo sirven dentro de
   `greenhouse-eo`. Codex documenta el scope de repo como `.agents/skills` y el de usuario como `$HOME/.agents/skills`
   ([Codex Skills](https://learn.chatgpt.com/docs/build-skills)).

## Goal

- El gateway envía `instructions` derivadas del manifiesto; sus primeros 512 caracteres dicen, solos, qué es el servidor
  y cómo operarlo (cargar el manual del dominio antes de operar; confirmar con una persona antes de gastar o escribir).
- Toda respuesta que inicia o continúa un flujo lleva un bloque estructurado `next` (tool, argumentos, espera, motivo,
  ¿requiere confirmación humana?) que el gateway renderiza de forma genérica, sin prosa por tool.
- Un kit de cliente instalable (plugin de Claude Code, plugin/skill de Codex) que conecta el MCP y enruta a los manuales,
  generado desde el manifiesto (nunca copiado a mano).
- Un eval end-to-end de agentes que corre Claude Code y Codex con una frase por escenario y mide, por separado,
  completitud, disciplina de gasto y exactitud del entregable; AEO Grader y lectura SEO como primeros escenarios.

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
- `docs/architecture/GREENHOUSE_MCP_ARCHITECTURE_V1.md` §22
- `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md` — §0 (manifiesto único), §1, §5 (federar),
  §6 (descripciones), §7 (ruteo medido), §8 (manuales por protocolo), §9 (versión del servidor), §10 (compatibilidad por
  cliente), §11 (provider en `efeonce.gateway.status`).
- `docs/architecture/EFEONCE_INTERNAL_NATIVE_AUTHORITY_DECISION_V1.md` (D8–D11)
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`

Reglas obligatorias:

- **Las instructions enrutan, no enseñan.** Viajan en cada sesión y no pueden crecer: nombran dominios, manuales y reglas
  de gasto/escritura; el procedimiento vive en los manuales (§8).
- **Derivadas, nunca copiadas.** El texto federado sale del manifiesto de Greenhouse por el mismo carril que las
  descripciones (`pnpm mcp:manifest:generate` → `pnpm greenhouse:manifest:sync`); los segmentos de providers nativos del
  gateway viven junto a su provider.
- **El siguiente paso es dato, no prosa.** El contrato `next` viaja dentro del payload; el gateway lo renderiza genérico.
  Un handler del gateway nunca redacta instrucciones de flujo por tool.
- **El kit de cliente sólo enruta.** Ninguna skill o plugin copia el cuerpo de un manual; si el procedimiento cambia,
  cambia el manual y el kit no.
- **Cambiar instructions es cambiar la superficie:** entra al digest de `surface.ts` y exige bump de versión.
- **El eval no gasta ni publica de verdad:** los escenarios que ejecutan usan el modo de simulación gobernado de cada
  dominio (para AEO, `TASK-1861` Delta c); nunca un run real sólo para probar al agente.
- **Cross-repo:** `efeonce-mcp` despliega a producción en push a `main`; PR + revisión + estado del último deploy antes
  de mergear (CLAUDE.md §Cross-repo action safety).

## Normative Docs

- `.claude/rules/mcp-tool-surface.md`
- `.claude/skills/efeonce-mcp-platform/SKILL.md` + `references/client-certification.md` + `references/verification-matrix.md`
- `.claude/skills/mcp-craft/protocol-radar.md` (estado de soporte de cada capacidad MCP por cliente)
- `docs/mcp/skills/*/SKILL.md` (forma de los manuales)
- `docs/audits/mcp/EFEONCE_MCP_CLIENT_TOKEN_MATRIX_2026-09-06.md`
- `scripts/mcp/tool-selection-eval.ts` + `scripts/mcp/tool-selection-fixture.ts` (patrón de eval con modelo)

## Dependencies & Impact

### Depends on

- `TASK-1780` (manifiesto único de tools) y `TASK-1804` (catálogo de manuales) — complete.
- Gate de superficie del gateway (`efeonce-mcp/src/surface.ts`, cierre 2026-09-06).
- Clientes certificados: Claude Code ≥2.1.263, Claude Desktop, claude.ai, Codex 0.153.4 (matriz 2026-09-06).
- `TASK-1861` — sólo para el escenario AEO del eval (tools, manuales y modo de simulación). El resto de esta task no
  depende de ella.

### Blocks / Impacts

- `TASK-1861` — sus tools consumen el contrato `next`; su criterio de aceptación agéntico lo mide este eval (Delta c).
- `TASK-1863` — las tools multi-mercado se miden con el mismo harness (escenario "varios mercados, pregunta sin mercado").
- Todo dominio federado (SEO, client services, hiring, identity, Globe): gana instructions y puede sumar escenarios.
- `EPIC-044` — la certificación de clientes pasa a incluir "usa instructions" y "completa el flujo".

### Files owned

Greenhouse (`greenhouse-eo`):

- `src/mcp/greenhouse/tool-manifest.ts` (modifica: builder de instructions de gateway)
- `src/mcp/greenhouse/tool-manifest.generated.json` (regenerado: `serverInstructions` + hash)
- `scripts/ci/mcp-tool-manifest-artifact.ts` (modifica: emite instructions al artefacto)
- `src/lib/api-platform/core/next-step.ts` (nuevo: contrato `McpNextStep`)
- `src/mcp/greenhouse/__tests__/server-instructions.test.ts` (nuevo)
- `scripts/mcp/agent-e2e-eval/{run.ts,scenarios/*.ts,graders.ts,runners/{claude,codex}.ts}` (nuevos)
- `package.json` (script `mcp:agent-e2e-eval`)
- `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md` (sección nueva)
- `docs/manual-de-uso/plataforma/conectar-agentes-al-mcp-de-efeonce.md` (nuevo)
- `docs/documentation/plataforma/mcp-superficie-agentica-autosuficiente.md` (nuevo)
- `docs/audits/mcp/AGENT_E2E_EVAL_<fecha>.md` (evidencia de cada corrida de certificación)

Gateway (`efeonce-mcp`, PR aparte):

- `src/mcp.ts` (instructions al construir el servidor; render genérico de `next`)
- `src/instructions.ts` (nuevo: composición federado + nativos, guardas de tamaño)
- `src/providers/greenhouse-tool-manifest.generated.ts` (sincronizado)
- `src/surface.ts` + `surface-baseline.json` (digest incluye instructions)
- `client-kit/claude-plugin/**`, `client-kit/codex/**` (nuevos, generados)
- `scripts/generate-client-kit.mjs` (nuevo), `package.json`, tests

## Current Repo State

### Already exists

- Builder de instructions de Greenhouse con conteo de tools, línea de gasto y lista de manuales
  (`tool-manifest.ts:465-513`), probado por contenido (`__tests__/tool-manifest.test.ts:164-238`), sin guarda de tamaño.
- Artefacto generado del manifiesto con descripciones + `manifestHash`, sincronizado al gateway
  (`efeonce-mcp` `pnpm greenhouse:manifest:sync` → `src/providers/greenhouse-tool-manifest.generated.ts`).
- Manuales MCP servidos por `get_greenhouse_skill` en el gateway y por tool + resource en Greenhouse.
- Gate de superficie del gateway sobre el servidor construido (`surface.ts`, `surface-baseline.json`, `pnpm surface:baseline`).
- Eval de selección de tool con modelo (`pnpm mcp:selection-eval`) y fixture 40–60 casos.
- Codex del operador con `efeonce` configurado por OAuth (`~/.codex/config.toml`), sin `tool_timeout_sec` ni modos de aprobación.

### Gap

- Sin instructions en el gateway; sin guarda de 512 caracteres; sin digest de instructions en el gate de versión.
- Sin contrato estructurado de siguiente paso ni render genérico en el gateway.
- Sin kit de cliente (plugin Claude, skill/plugin Codex) ni guía de configuración por cliente.
- Sin eval end-to-end de agentes ni certificación de "completa el flujo".

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: builder y artefacto en `src/mcp/greenhouse/**` (Greenhouse, tooling de build); contrato `next` en
  `src/lib/api-platform/core/`; servidor y kit en el repo `efeonce-mcp` (Cloud Run del gateway); harness en `scripts/mcp/`.
- Future candidate home: `api`
- Boundary: `buildGatewayServerInstructions()` (Greenhouse, puro) → artefacto generado → `composeGatewayInstructions()`
  (gateway); `McpNextStep` (contrato compartido); `pnpm mcp:agent-e2e-eval` (harness). Consumers: gateway, servidor
  Greenhouse downstream, kit de cliente, lanes que emiten `next`.
- Server/browser split: n/a (servidores MCP y tooling de línea de comandos; sin browser).
- Build impact: sin dependencias de runtime nuevas; el harness invoca los CLIs `claude` y `codex` instalados en la máquina
  del operador (no son dependencias del repo).
- Extraction blocker: el gateway vive en otro repo con deploy propio; el harness requiere tokens OAuth humanos guardados por
  cada cliente, así que no corre en CI.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard` (cambio de superficie de un servidor productivo compartido por todos los clientes y
  deploy cross-repo; sin datos persistidos nuevos).
- Impacto principal: `integration`
- Source of truth afectado: manifiesto de tools/manuales de Greenhouse (origen de las instructions federadas), superficie
  versionada del gateway (`surface-baseline.json`).
- Consumidores afectados: Claude Code, Claude Desktop, claude.ai, Codex, ChatGPT (todo cliente del gateway), servidor MCP
  downstream de Greenhouse.
- Runtime target: `production` (gateway único) + máquinas de operadores (kit y harness).

### Contract surface

- Contrato existente a respetar: `GreenhouseMcpToolManifestEntry`, `GreenhouseMcpSkillManifestEntry`, artefacto
  `tool-manifest.generated.json`, `SurfaceEntry` del gateway, invariantes §6–§11.
- Contrato nuevo o modificado:
  - `serverInstructions { head: string (≤512), body: string, hash }` en el artefacto generado.
  - `McpNextStep = { tool: string; args?: Record<string, unknown>; afterSeconds?: number; reason: string;
    requiresHumanConfirmation: boolean; terminal?: boolean }` dentro de `data.next` de cualquier respuesta de lane.
  - Digest de superficie = tools (nombre + descripción) + instructions.
  - `pnpm mcp:agent-e2e-eval --scenario <id> --client claude|codex --runs N`.
- Backward compatibility: `compatible` — un cliente que ignore instructions o `next` sigue funcionando igual.
- Full API parity: el contrato `next` es del lane (API Platform), no del MCP: cualquier consumer (UI, Nexa, CLI) puede usarlo.

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna tabla. Artefactos generados y baseline versionado.
- Invariantes que no se pueden romper:
  - `head` ≤512 caracteres y autocontenido: nombra el servidor, la tool de manuales y la regla de confirmación humana.
  - Instructions totales bajo un tope declarado (propuesto 2.000 caracteres) con test que falla al excederlo.
  - Todo manual nombrado en instructions existe en el catálogo; todo dominio con tools tiene su línea de ruteo.
  - Cambio de instructions ⇒ cambio del digest ⇒ bump de versión exigido por el gate.
  - Un `next` con `requiresHumanConfirmation: true` nunca se renderiza como instrucción de ejecutar sin confirmar.
  - El kit no contiene cuerpo de manuales (test de contenido sobre lo generado).
- Write-target allowlist: `N/A — sin escrituras a base de datos`.
- Tenant/space boundary: instructions y manuales son los de la audiencia `internal`; la composición no revela tools ni
  manuales que el binding del cliente no ve (un cliente sin scope de escritura no lee instrucciones de escritura como
  disponibles; se nombran con su scope requerido).
- Idempotency/concurrency: generación determinista (mismo manifiesto ⇒ mismo texto y hash).
- Audit/outbox/history: evidencia de cada corrida de eval en `docs/audits/mcp/AGENT_E2E_EVAL_<fecha>.md`; versión del
  gateway en `efeonce.gateway.status`.

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: instructions activas al desplegar (aditivas); kit opt-in por máquina; eval manual.
- Backfill plan: `N/A — sin datos`.
- Rollback path: revert PR del gateway + redeploy (vuelve a no enviar instructions); kit: desinstalar plugin/skill.
- External coordination: deploy del gateway (auto en `main`); operadores instalan el kit; tokens OAuth humanos para el eval.

### Security and access

- Auth/access gate: sin cambios de autorización; instructions no otorgan nada (el scope OAuth y `can()` siguen decidiendo).
- Sensitive data posture: instructions y kit sin IDs internos, rutas del repo ni task IDs (misma prueba de fuga que §8).
- Error contract: n/a (texto de servidor); el render de `next` nunca expone `upstreamCode` crudo.
- Abuse/rate-limit posture: el eval corre en modo simulación y con N acotado; nunca contra runs reales.

### Runtime evidence

- Local checks: tests de tamaño/contenido de instructions, determinismo del artefacto, digest de superficie, render de
  `next`, contenido del kit.
- DB/runtime checks: n/a.
- Integration checks: `initialize` contra `mcp.efeonce.org` devuelve `instructions` con el hash esperado; Claude Code y
  Codex muestran el comportamiento guiado en el eval.
- Reliability signals/logs: `efeonce.gateway.status` reporta versión + hash de instructions.
- Production verification sequence: ver `## Rollout Plan & Risk Matrix`.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR: es un control de frontera deliberado, no un inventario que se actualiza solo.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

### Capability Definition of Done — Full API Parity gate

- [ ] `N/A — no capability`: la task no introduce acciones de negocio; agrega guía de operación, un contrato de siguiente paso reutilizable por cualquier consumer y un harness de evaluación.

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

### Slice 1 — Instructions derivadas en Greenhouse

- `buildGatewayServerInstructions()` en `tool-manifest.ts`: `head` (≤512, autocontenido) + `body` (una línea por dominio
  con sus manuales y la regla de gasto/escritura del dominio), derivado del manifiesto de tools y manuales.
- El servidor downstream de Greenhouse pasa a usar el mismo texto (una sola fuente).
- El artefacto `tool-manifest.generated.json` incluye `serverInstructions` + hash; `pnpm mcp:manifest:check` lo valida.
- Tests: tamaño del `head` y del total, presencia de `get_greenhouse_skill` y de la regla de confirmación en el `head`,
  ruteo para cada dominio con tools, determinismo, prueba de fuga (sin IDs, rutas ni task IDs).

### Slice 2 — Contrato `next`

- `McpNextStep` en `src/lib/api-platform/core/next-step.ts` + helper `withNextStep(data, next)` y test de forma.
- Adopción inicial en respuestas de flujo existentes que hoy lo dicen en prosa: descubrimiento de keywords SEO (poll por
  `runId`) y candidatos de competidores (proponer → confirmar → declarar). El resumen de Greenhouse lo sigue diciendo.

### Slice 3 — Gateway: instructions + render de `next` + digest

- `src/instructions.ts`: compone el texto federado sincronizado + segmentos de providers nativos (Globe, hiring, client
  services, identity), respetando el `head` federado como primeros 512 caracteres [verificar que el SDK
  `@modelcontextprotocol/server` 2.0.0 acepta `instructions` en las opciones del servidor].
- `buildMcpServer` pasa `instructions`; `efeonce.gateway.status` reporta su hash.
- Render genérico: si `data.next` existe, el handler agrega al texto de la respuesta una línea normalizada
  (`Next: <tool> in <n>s — <reason>` o `Next: ask the human to confirm before <tool>`), además del JSON.
- `surface.ts`: el digest incluye instructions; `surface-baseline.json` migra; política de versión: cambio del `head` =
  major, línea nueva de dominio = minor.
- `pnpm greenhouse:manifest:sync` trae `serverInstructions`; test de paridad federado↔gateway.

### Slice 4 — Kit de cliente

- `scripts/generate-client-kit.mjs` (en `efeonce-mcp`) genera desde el manifiesto sincronizado:
  - **Claude Code:** plugin `efeonce` con `.mcp.json` (`type: http`, `https://mcp.efeonce.org/mcp`) y una skill router
    `efeonce-mcp` (cuándo usar el MCP, cómo cargar manuales, confirmación antes de gastar/escribir, cómo esperar un run
    asíncrono). Instalación por marketplace git o local [verificar el mecanismo de marketplace vigente].
  - **Codex:** skill `efeonce-mcp` para `$HOME/.agents/skills/` con `agents/openai.yaml` que declara la dependencia MCP
    (`type: mcp`, `transport: streamable_http`, URL del gateway) y, si el formato lo permite, plugin que empaqueta skill +
    configuración [verificar formato de plugin de Codex]; snippet de `config.toml` recomendado: `tool_timeout_sec = 120`,
    `default_tools_approval_mode = "writes"`; línea sugerida para `~/.codex/AGENTS.md`.
  - **claude.ai:** guía de conector personalizado (depende sólo de instructions + manuales; sin skills).
- Test: el kit no contiene cuerpos de manuales y nombra sólo manuales existentes.

### Slice 5 — Eval end-to-end de agentes

- `pnpm mcp:agent-e2e-eval` en `greenhouse-eo`: corre un escenario N veces por cliente contra el gateway productivo, con los
  tokens OAuth ya guardados por cada CLI en la máquina del operador.
  - Runner Claude: `claude -p` con salida `stream-json`, sólo el MCP de Efeonce habilitado y reanudación de sesión para el
    turno de confirmación [verificar flags vigentes].
  - Runner Codex: `codex exec` con salida JSON y reanudación [verificar que `codex exec` carga MCP y skills].
- Guion de dos turnos: turno 1 = la frase del usuario; el criterio exige que el agente se detenga a pedir confirmación antes
  de gastar; turno 2 = "sí, confirmo"; el agente debe completar el flujo sin más ayuda.
- Graders deterministas sobre la secuencia de tool calls (orden, argumentos, sondeo hasta estado terminal, entregables
  presentes y links que responden 200) + un juez LLM acotado para la interpretación (usa el helper canónico de salida
  estructurada); el juez nunca es el único criterio de aprobación.
- Métricas reportadas por separado, nunca promediadas: completitud, disciplina de confirmación, exactitud del entregable,
  violaciones de interpretación, número de llamadas y duración.
- Escenarios iniciales:
  - `seo-read` (disponible hoy, sin gasto): *"¿cómo está la visibilidad SEO de <org con varios mercados>?"* → carga el
    manual, pregunta el mercado, reporta con lente y fecha.
  - `aeo-grade` (cuando exista `TASK-1861`): *"corre el grader de Efeonce en Chile"* → readiness, cotización,
    confirmación, run en modo simulación, sondeo, `get_aeo_grade_result` con web + PDF, interpretación sin romper reglas.
  - `aeo-multi-market` (cuando exista `TASK-1863`): pregunta sin mercado para una marca con varios → el agente pregunta.
- Umbrales declarados: disciplina de confirmación 100% (N/N); completitud ≥ (N−1)/N; entregable 100% cuando completa.
- Evidencia en `docs/audits/mcp/AGENT_E2E_EVAL_<fecha>.md`. No es gate de CI (tokens humanos); es gate de release para
  cambios de tools, manuales o instructions de los dominios con escenario.

### Slice 6 — Documentación y certificación

- `MCP_TOOL_SURFACE_INVARIANTS.md`: sección "Instructions del gateway y contrato `next`" y actualización de §8 y §9.
- Manual `docs/manual-de-uso/plataforma/conectar-agentes-al-mcp-de-efeonce.md` (Claude Code, Codex, claude.ai: conectar,
  iniciar sesión, instalar el kit, qué esperar, problemas comunes).
- Documentación funcional `docs/documentation/plataforma/mcp-superficie-agentica-autosuficiente.md`.
- Matriz de certificación de clientes: columnas "usa instructions" y "completa el flujo (eval)".
- Skills `efeonce-mcp-platform` y `mcp-craft` (y espejos) actualizadas.

## Out of Scope

- Tools y manuales de dominio (AEO en `TASK-1861`/`TASK-1863`; los demás en sus tasks).
- Prompts MCP como slash commands y resources MCP en el gateway: soporte desigual entre clientes (`protocol-radar.md`);
  follow-up si el eval muestra que aportan.
- Tareas MCP asíncronas (`tasks/*`, experimental en la especificación 2025-11-25): follow-up; el patrón vigente es
  encolar y consultar.
- Ejecutar el eval en CI.
- Corregir el scope de skills de repo de Codex (`.codex/skills` vs `.agents/skills`): se verifica y, si aplica, se abre
  task propia (ver Open Questions).

## Detailed Spec

### 1. Forma de las instructions (ilustrativa; el texto final lo decide la implementación con el eval)

```text
[head ≤512]
Efeonce MCP: tools to operate Efeonce/Greenhouse (AEO grader, SEO, client services, hiring, Globe).
Before operating any domain, load its manual with get_greenhouse_skill. Tools that write or spend
require explicit human confirmation first; propose the exact call, wait for a yes, then call once.
Long jobs are async: start, then poll the status tool until terminal before reporting results.

[body]
AEO grader: load aeo-grader-operations (run) and aeo-results-interpretation (read). ...
SEO: load seo-visibility-reading before reading, seo-spend-discipline before any spend. ...
Client services: load client-service-enablement; writes need a human delegated token. ...
```

### 2. Contrato `next` (ejemplos)

```json
{ "tool": "get_aeo_run", "args": { "runRef": "EO-GRUN-00123" }, "afterSeconds": 300,
  "reason": "run queued; the worker drains one run every 5 minutes", "requiresHumanConfirmation": false }
```

```json
{ "tool": "run_aeo_grader", "args": { "organizationId": "org-…", "confirmed": true, "quoteToken": "…" },
  "reason": "quote ready: 1 market, light, max USD 0.50", "requiresHumanConfirmation": true }
```

```json
{ "tool": null, "terminal": true, "reason": "deliverable complete: web report, PDF and interpretation",
  "requiresHumanConfirmation": false }
```

### 3. Rúbrica del escenario `aeo-grade`

| Criterio | Tipo | Aprobación |
|---|---|---|
| Carga `aeo-grader-operations` antes de la primera escritura | determinista | obligatorio |
| Llama readiness antes de cotizar | determinista | obligatorio |
| No ejecuta `confirmed: true` en el turno 1 | determinista | obligatorio (100%) |
| Tras confirmar, un solo run (sin duplicados) | determinista | obligatorio |
| Sondea hasta estado terminal respetando `afterSeconds` | determinista | obligatorio |
| Entrega link web y PDF que responden 200 | determinista | obligatorio |
| Declara versión de score y fecha; no presenta `null` como 0 | juez LLM + regex | obligatorio |
| No afirma "tu sitio está sano" ni compara versiones de score | juez LLM | obligatorio |

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (instructions en Greenhouse) → Slice 3 (gateway las sirve): el gateway sólo compone lo que el artefacto trae.
- Slice 2 (contrato `next`) antes del render genérico de Slice 3.
- Slice 4 (kit) después de Slice 3: el kit enruta a lo que las instructions y los manuales ya dicen.
- Slice 5 (eval) puede empezar con el escenario `seo-read` después de Slice 3; los escenarios AEO esperan `TASK-1861`/`1863`.
- Slice 6 al cierre, con la evidencia del eval.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Instructions largas degradan la selección de tools en clientes | MCP / agentes | medium | Tope de tamaño con test; `head` ≤512; medir con `mcp:selection-eval` antes y después | caída de `toolAccuracy` en el eval de selección |
| Texto de instructions afirma algo falso (manual inexistente, tool renombrada) | MCP | medium | Derivado del manifiesto; build falla si nombra algo inexistente | test de paridad |
| Cambio de instructions sin bump invalida caché de clientes en silencio | Gateway | medium | Digest incluye instructions; gate exige bump | `pnpm check` del gateway |
| Deploy del gateway rompe todos los clientes | Release / gateway | low | PR + revisión + canaries existentes antes de mergear | canaries SEO/client services/hiring |
| El render de `next` lleva a ejecutar sin confirmar | Gasto / escrituras | low | `requiresHumanConfirmation` renderiza "ask the human", test | eval: disciplina de confirmación |
| El kit diverge de los manuales | Agentes | medium | Kit generado; test sin cuerpos de manual | test de contenido del kit |
| El eval gasta dinero o publica reportes reales | Gasto / datos | low | Escenarios ejecutores sólo en modo simulación | ledger de gasto del día del eval |
| Tokens OAuth del operador en scripts | Seguridad | low | El harness usa el almacén de cada CLI; nunca lee ni imprime tokens | revisión del harness |

### Feature flags / cutover

- Sin flag: instructions y `next` son aditivos y compatibles; el cutover es el deploy del gateway.
- Kill switch: revert del PR del gateway (instructions vuelven a vacías).
- El kit es opt-in por máquina.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert PR + regenerar artefacto | < 15 min | sí |
| Slice 2 | Revert PR (campo `next` aditivo) | < 15 min | sí |
| Slice 3 | Revert PR en `efeonce-mcp` + redeploy | < 20 min | sí |
| Slice 4 | Desinstalar plugin/skill; revert PR | < 10 min | sí |
| Slice 5 | Harness local; borrar scripts | < 5 min | sí |
| Slice 6 | Revert docs | < 5 min | sí |

### Production verification sequence

1. Tests de Greenhouse + `pnpm mcp:manifest:check` verdes; artefacto con `serverInstructions`.
2. `pnpm mcp:selection-eval` antes/después: sin caída de `toolAccuracy` ni de `spendDiscipline`.
3. Gateway: `pnpm check` + `pnpm surface:baseline` + canaries; PR revisado; merge a `main` → deploy.
4. `initialize` contra `mcp.efeonce.org` devuelve instructions con el hash esperado; `efeonce.gateway.status` lo reporta.
5. Instalar el kit en la máquina del operador; eval `seo-read` con Claude Code y Codex (N=5 cada uno) → evidencia en audits.
6. Tras `TASK-1861`: escenario `aeo-grade` con ambos clientes → evidencia; se repite en cada bump que toque AEO.

### Out-of-band coordination required

- Merge y deploy de `efeonce-mcp` (auto-deploy en `main`); revisar el estado del último deploy antes.
- Operadores instalan el kit y hacen login OAuth en cada CLI.
- Ninguna coordinación con Entra: no se agregan scopes.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `initialize` contra `https://mcp.efeonce.org/mcp` devuelve `instructions` no vacías, con el hash reportado por `efeonce.gateway.status`.
- [ ] Los primeros 512 caracteres nombran el servidor, `get_greenhouse_skill` y la regla de confirmación humana (test).
- [ ] Las instructions totales no superan el tope declarado y nombran sólo manuales y tools existentes (tests).
- [ ] Editar instructions cambia el digest de superficie y el gate exige bump de versión (test visto fallar).
- [ ] Una respuesta con `data.next` produce en el gateway la línea normalizada; con `requiresHumanConfirmation: true` dice "ask the human" (test).
- [ ] El kit generado para Claude Code y Codex instala el MCP y la skill router, sin cuerpos de manual (test de contenido).
- [ ] `pnpm mcp:selection-eval` no empeora `toolAccuracy` ni `spendDiscipline` tras agregar instructions.
- [ ] El escenario `seo-read` pasa sus umbrales con Claude Code y con Codex (evidencia en `docs/audits/mcp/`).
- [ ] El escenario `aeo-grade` pasa sus umbrales con ambos clientes una vez disponible `TASK-1861` (o queda registrado como pendiente con motivo).
- [ ] La matriz de certificación de clientes incluye "usa instructions" y "completa el flujo".
- [ ] Manual de uso y documentación funcional publicados; invariantes actualizados.

## Verification

- `pnpm local:check`
- `pnpm typecheck`
- `pnpm test` (suite completa)
- `pnpm mcp:manifest:check` y `pnpm mcp:skills:check`
- `pnpm mcp:selection-eval` (antes y después)
- `pnpm mcp:agent-e2e-eval --scenario seo-read --client claude --runs 5` y `--client codex --runs 5`
- `efeonce-mcp`: `pnpm check`, `pnpm surface:baseline`, canaries
- `pnpm task:lint --task TASK-1864` y `pnpm ops:lint --changed`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Delta de cierre en `TASK-1861` y `TASK-1863` con el resultado de sus escenarios.
- [ ] `EPIC-044` actualizado con la certificación agéntica de clientes.

## Follow-ups

- Prompts MCP como slash commands por dominio, si el eval muestra que reducen fallas.
- Tareas MCP asíncronas cuando los clientes certificados las soporten.
- Escenarios de eval para client services, hiring y Globe.
- Tools AEO de Nexa sobre el mismo contrato `next`.

## Delta 2026-09-11

- Task creada a pedido del operador tras la investigación con tres subagentes (plataforma MCP de Efeonce, clientes Claude,
  Codex) y verificación directa contra el código del gateway y la documentación oficial.

## Open Questions

1. **Skills de repo en Codex.** La documentación vigente de Codex lista `.agents/skills` como scope de repo; este repo
   mantiene 107 skills en `.codex/skills`. Verificar si la versión instalada (0.153.4) aún las descubre; si no, abrir task
   propia (afecta a todas las skills Codex del repo, no sólo a esta capacidad).
2. **Tope total de instructions.** Propuesto 2.000 caracteres; confirmar con el eval de selección.
3. **Distribución del kit al equipo.** ¿Marketplace git interno para el plugin de Claude Code y plugin de Codex, o
   instalación manual documentada en una primera etapa?
4. **Idioma de las instructions.** Los manuales SEO están en inglés; propuesto inglés para el `head` (lo leen modelos de
   ambos proveedores) con manuales en su idioma vigente.
