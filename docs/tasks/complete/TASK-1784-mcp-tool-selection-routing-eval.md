# TASK-1784 — MCP: ruteo de selección entre tools que se parecen, con eval que lo pruebe

## Delta 2026-08-31 — `TASK-1780` cerró: el censo dejó de ser un grep, y el hueco de esta task SUBIÓ de valor

`TASK-1780` está `complete`. Tres consecuencias directas para esta task:

🔴 **El baseline ya no se mide con una regex sobre `server.ts`.** El censo interno se lee de
`GREENHOUSE_MCP_TOOL_MANIFEST` (`src/mcp/greenhouse/tool-manifest.ts`), que es una lista tipada: el
riesgo de "total corto en silencio" que este archivo advertía **desaparece del lado interno**. La
advertencia se reescribe como *anclar el censo en el manifiesto, nunca en un grep de `registerTool`*.

⚠️ **Todas las cifras del cuerpo están vencidas.** Medido 2026-08-31 contra el manifiesto: **43 tools
registradas (28 SEO + 15 no-SEO)**, 7 escrituras, 4 que comprometen gasto del proveedor. El gateway
federa **28**. La progresión que esta task usa como argumento sigue: 16 → 20 → 21 → 26 → **28**, y
refuerza su tesis otra vez. Relee del código, nunca de acá.

✅ **El hueco que esta task ataca sigue ABIERTO, y ahora tiene dónde aterrizar.** El manifiesto lleva
`name`, `domain`, `writes`, `spendsProviderBudget` y `purpose` — la `description` agent-facing sigue
viviendo en `server.ts` y el guardia de paridad **no la compara**. O sea: el drift de descripciones no
lo cerró `TASK-1780`. La diferencia es que ahora la extensión natural es el artefacto generado + su
guardia consumidor, en vez de "editar el espejo".

⚠️ `MCP_TOOL_SURFACE_INVARIANTS.md` ya no hay que crearlo (lo creó `TASK-1785`) y además fue ampliado
por `TASK-1780` con el §0 del manifiesto. El invariante "el registry interno y el gateway NO son el
mismo conjunto" está ahí escrito con su caso verificado (`get_seo_provider_spend`): cítalo en vez de
reafirmarlo.

## Delta 2026-08-29 — `MCP_TOOL_SURFACE_INVARIANTS.md` ya existe (TASK-1785)

El companion que esta task declara como compartido fue **creado** por `TASK-1785`:
`docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md`. Aporta tu sección sobre él en
vez de crearlo.

Dos cosas de ahí que le sirven directo al eval de selección:

- 🔴 **Contar tools con un patrón de prefijos de verbo (`get_|run_|track_`) se come
  `declare_seo_competitors` y `retire_seo_competitors`**, y con una clase de caracteres sin dígitos
  se come `get_seo_visibility_360`. Las dos fallan **en silencio** y dan un total corto. Si el
  baseline del eval se mide sobre un inventario mal enumerado, el número de partida es falso.
- ⚠️ **El registry interno y el gateway NO son el mismo conjunto, y está bien**: el gateway federa
  contra rutas HTTP del lane, no contra nombres del MCP interno. Anclar el censo en la ruta.

Además, `get_seo_dual_lens_visibility` (TASK-1785) es una tool NUEVA que **convive** con
`get_seo_visibility_360` y con `get_seo_performance` sin reemplazarlas — o sea, entra al conjunto de
tools parecidas que esta task tiene que rutear. Su criterio de elección está declarado en su
descripción: se usa cuando la pregunta es *"dónde rankea este cliente"* y hay que presentar las dos
lentes sin mezclarlas.

## Delta 2026-08-28 (release a producción) — las cifras de superficie quedaron stale (otra vez)

El deploy del gateway `mcp.efeonce.org` (revisión `efeonce-mcp-gateway-00024-8b8`), coordinado con
el release `develop→main` `c983be7f18e68602404567a19ac8e7e0f157f742` (PR #208, run `33178544139`,
manifest `released`), federó 6 tools SEO nuevas: `get_seo_provider_spend`, `get_seo_keyword_gap`,
`declare_seo_competitors`, `retire_seo_competitors`, `get_seo_serp_top_results` y
`get_seo_competitor_candidates`.

**Cifras a releer del código, no de este archivo:**

- «20 tools SEO» (§Why This Task Exists y §Estado actual) → hoy el registry interno declara
  **26 tools SEO** en `src/mcp/greenhouse/server.ts`.
- «27 de 30 tools del gateway con annotations» → el gateway federa hoy **27 tools SEO**.
- «Pasó de 16 a 20 tools SEO» → la progresión real es 16 → 20 → 21 → 26 en semanas. El argumento de
  esta task («esto empeora solo porque la superficie crece») **se refuerza**, no se debilita.

Dos de las tools nuevas entran directo al problema que esta task ataca:
`get_seo_competitor_candidates` (propone competidores por recurrencia medida) y
`get_seo_keyword_gap` (qué rankea la competencia y el cliente no) contestan preguntas vecinas y
compiten por la misma intención con `get_seo_keyword_opportunities` y `discover_seo_keywords`.
Deben entrar al conjunto que recibe bloque de ruteo y al fixture del eval.

## Resultado 2026-09-02 — el eval refutó la hipótesis central, y ese es el entregable

Medido, no supuesto. Seis corridas, cada variante determinista (dos corridas idénticas por variante).

| Variante | Tool | Mercado | Gasto |
|---|---|---|---|
| Baseline (sin ruteo) | 94.5% | 98.2% | 100% |
| Bloques `Use when · Prefer X if · Do NOT use for` | 94.5% | 98.2% | 100% |
| + cláusula de mercado + claim acotado | 96.4% | 98.2% | 100% |
| + señales proxy + `items` requerido | 94.5% | 98.2% | 100% |
| **Sólo correcciones factuales (aplicada)** | **92.7%** | **100%** | 100% |

🔴 **Los bloques de ruteo NO mejoraron la selección de tool.** La banda no tiene dirección, y una
variante hizo regresar a `prepare_seo_grounded_queries`, una tool que nadie tocó: alargar siete
descripciones degrada la selección de sus **vecinas**. Es el riesgo que la matriz de esta task
anticipaba, medido en vez de supuesto. Se aplicó la variante **sin** bloques.

✅ **Lo que sí movió el número fue corregir dos afirmaciones falsas.** La cláusula de mercado decía
*"pass market when the organization has more than one"* —literalmente una instrucción de elegir—; el
modelo la obedecía justificándose con *"the operator is in Santiago"*, que es `ISSUE-152` en su
propio razonamiento. Y la lente dual abría con un *"úsala en vez de X"* sin acotar que ganaba por
posición sobre cualquier matiz posterior. **Mercado 98.2% → 100%.**

⚠️ **Tool 94.5% → 92.7%: se reporta como está y NO se declara mejora.** Su única regresión es
léxica —la pregunta dice *"rendimiento"* y la tool se llama `get_seo_performance`— y ninguna
descripción le gana al nombre de su propia tool. La palanca real sería el **naming**, prohibido por
esta task; la frontera queda medida y escrita.

🔴 **Hallazgo lateral, el más caro:** al hacer que el guard comparara `description`, aparecieron
**21 de 27 tools federadas ya divergentes** — sirviendo, entre otras, la instrucción que causa
`ISSUE-152`. Se cerró **derivando** el texto del artefacto en vez de copiarlo: un espejo a mano
vuelve a divergir, uno derivado no puede.

**Rollout — dos superficies, una desplegada:**

✅ **Gateway `mcp.efeonce.org` (repo `efeonce-mcp`, Cloud Run): DESPLEGADO** el 2026-09-02, revisión
`efeonce-mcp-gateway-00027-6pj` desde el commit `3d09e152`. Es la superficie pública, la que consumen
los clientes MCP externos, y la que servía la instrucción defectuosa: ya no.

✅ **Ruta `/api/mcp/greenhouse` (Vercel): NO APLICA — está deshabilitada.** Se afirmó antes que
«seguía sirviendo el texto viejo» y es **falso**: su token `GREENHOUSE_MCP_REMOTE_GATEWAY_TOKEN` no
existe en ningún environment de Vercel (`vercel env ls`) y la ruta responde `404 — "Greenhouse MCP
remote gateway is not configured."` (comprobado en vivo contra staging). El gateway era la ÚNICA
superficie MCP viva; no conviven dos textos.

`develop` empujado el 2026-09-02 (`0a68d92c`) con los 9 workflows en `success`, incluidos CI,
Playwright E2E smoke y los cuatro deploys de workers Cloud Run. Producción sigue pendiente del
release `develop→main`, que no cambia nada servido por MCP.

Detalle: `docs/architecture/GREENHOUSE_MCP_TOOL_SELECTION_EVAL_V1.md`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-022`
- Status real: `Completa — gateway mcp.efeonce.org desplegado (rev 00027-6pj); Greenhouse sin push y su ruta /api/mcp/greenhouse aún sirve el texto viejo`
- Rank: `TBD`
- Domain: `growth`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El módulo SEO expone **28 tools MCP** (medido 2026-08-31 contra el manifiesto), y **seis contestan alguna versión de la misma pregunta**:
`get_seo_visibility_360`, `get_seo_overview_kpis`, `get_seo_domain_overview`, `get_seo_performance`,
`get_seo_rank_evolution` y `get_seo_url_visibility`. Cada descripción explica **qué devuelve**;
ninguna dice **cuándo preferirla sobre la vecina**. Un modelo elige por semejanza semántica, y esas
seis se parecen. Esta task agrega un bloque de ruteo a las descripciones y —lo que la vuelve
verificable— **un eval de selección que mide si sirvió**.

🔴 **No se borra ni se fusiona ninguna tool.** El catálogo se conserva completo; lo que cambia es que
deje de ser un catálogo y pase a ser un mapa.

## Why This Task Exists

Las descripciones actuales son buenas: llevan el contrato de honestidad adentro (`lens=estimated`,
`capturedAt`, *"no_market_data means a state, not a zero"*) y las tools que gastan lo declaran en
mayúsculas en el call site. El problema no es la calidad de cada una **por separado**: es que fueron
escritas de a una, y la selección ocurre **entre todas a la vez**.

Un operador pregunta *"¿cómo va Berel este mes?"*. Hay al menos seis respuestas defendibles, cada una
con una lente y un alcance distintos: el compuesto SEO×AEO, los KPIs del recorte seguido, la foto de
mercado del dominio, la serie medida de GSC, la evolución de rank, o el detalle por página. El modelo
va a elegir una. Si elige la de mercado cuando el operador quería la medida, **la respuesta es
plausible y está mal**, y nadie lo nota — es el mismo modo de fallo que perseguimos todo el
2026-08-27: algo que responde con seguridad sobre una observación que no hizo.

Y hay un motivo por el que esto empeora solo: la superficie **crece**. Pasó de 16 a 20 tools SEO en
un día. Sin ruteo, cada tool nueva agrega ambigüedad a las que ya estaban.

**Por qué el eval no es opcional.** Sin medición previa, "mejoramos las descripciones" es
infalsificable: nadie puede decir si la selección mejoró, empeoró o quedó igual. El eval además puede
**refutar la premisa** — quizá la selección ya es buena y esta task no hace falta. Ese resultado
también es valioso y cuesta poco descubrirlo.

## Goal

- Baseline **medido** de precisión de selección —de tool **y de mercado**, por separado— sobre
  preguntas reales de operador en los cinco mercados productivos, antes de tocar una sola descripción.
- Bloque de ruteo (`Úsala cuando… · Prefiere X si… · NO la uses para…`) en las tools que compiten por
  la misma intención, sin borrar ni fusionar ninguna.
- Delta medido post-cambio y **gate de regresión**: la precisión de selección no puede bajar cuando
  se agregue la próxima tool.
- Paridad de descripciones entre el MCP interno y el gateway: si el ruteo es load-bearing, una
  descripción desincronizada sirve un mapa viejo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` — §5 (contrato de honestidad ●/◑: es
  justo lo que una selección equivocada rompe), §7 (Full API Parity: un primitive, muchos consumers).
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` — lane ecosystem y su contrato.
- `docs/architecture/agent-invariants/KNOWLEDGE_NEXA_AGENT_INVARIANTS.md` — Nexa es consumer de estas
  mismas tools; su calidad de respuesta depende de esta selección.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`

Reglas obligatorias:

- 🔴 **NUNCA borrar, fusionar ni renombrar una tool existente.** Decisión explícita del operador
  (2026-08-27). El ruteo se agrega; el catálogo no se recorta.
- **NUNCA** cambiar `inputSchema` ni `outputSchema` en esta task: es un cambio de descripción y de
  evaluación, no de contrato de datos.
- **NUNCA** declarar la mejora sin el número. El delta se reporta contra el baseline del Slice 1.
- **SIEMPRE** aplicar el cambio en los DOS lados (MCP interno + gateway) en el mismo PR; el guard de
  paridad de `TASK-1658` es el que debe impedir el drift.

## Normative Docs

- `.claude/skills/arch-architect/claude/tool-use.md` — diseño de superficie de tools.
- `.claude/skills/arch-architect/claude/eval.md` — forma canónica del eval y del gate de regresión.
- `docs/tasks/complete/TASK-1658-mcp-seo-federation-drift-parity-guard-blind-spot.md` — el guard de
  paridad que esta task debe extender de `inputSchema` a `description`.

## Dependencies & Impact

### Depends on

- `src/mcp/greenhouse/server.ts` — donde viven las descripciones del MCP interno.
- `~/Documents/efeonce-mcp/src/mcp.ts` + `src/providers/greenhouse-seo.ts` — el gateway, repo hermano.
- `TASK-1658` (`complete`) — guard de paridad de federación; esta task le agrega una dimensión.

### Blocks / Impacts

- **Nexa** — es consumer directo de estas tools; una selección mejor mejora su respuesta sin tocar su prompt.
- **`TASK-1785`** — la lente como campo estructural. Son complementarias y **no se solapan**: 1784
  mejora **cuál** tool se elige; 1785 impide que el resultado se mezcle mal **después** de elegirla.
  Pueden correr en paralelo.
- **Toda task futura que agregue una tool SEO** hereda el gate de regresión.

### Files owned

- `src/mcp/greenhouse/server.ts` (sólo campos `description`)
- `src/mcp/greenhouse/__tests__/tool-selection-eval.test.ts`
- `scripts/mcp/tool-selection-eval.ts`
- `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md` `[crear]`
- En el repo hermano `efeonce-mcp`: `src/mcp.ts`, `src/providers/greenhouse-seo.ts` y el guard de paridad

## Current Repo State

### Already exists

- 28 tools SEO declaradas en `src/mcp/greenhouse/tool-manifest.ts` (`server.ts` las registra recorriéndolo; ya no es el inventario), con `title`, `description`,
  `inputSchema` y `outputSchema` (`greenhouseMcpToolOutputSchema`).
- Descripciones semánticamente ricas con el contrato de honestidad embebido, y las que gastan
  declarando el costo en mayúsculas.
- 28 tools SEO federadas en el gateway con `annotations` (`readOnlyHint`/`destructiveHint`/`idempotentHint`/`openWorldHint`).
- Guard de paridad de `TASK-1658`, que compara `inputSchema` entre gateway y MCP interno.

### Gap

- Ninguna descripción contiene ruteo: no hay una sola línea del tipo *"prefiere X si necesitas la
  serie medida"*.
- No existe ningún eval de selección de tools en el repo — `grep` de `tool-selection` no devuelve nada.
- El guard de paridad compara `inputSchema` pero **no** `description`, así que hoy el gateway puede
  servir una descripción vieja sin que nada lo detecte. Si el ruteo vive en la descripción, ese drift
  pasa a ser load-bearing.

## Modular Placement Contract

- Topology impact: `api`
- Current home: `src/mcp/greenhouse/**` en el portal Next.js, con espejo en el repo hermano `efeonce-mcp`
- Future candidate home: `remain-shared`
- Boundary: superficie MCP del módulo SEO; consumers autorizados son Nexa, el gateway y los clientes MCP externos
- Server/browser split: la superficie MCP es server-only; nada de esto llega al browser
- Build impact: `none` — cambios de texto y un script de evaluación
- Extraction blocker: la superficie vive espejada en dos repos y el guard de paridad los acopla a propósito

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: las descripciones de tools en `src/mcp/greenhouse/server.ts` (el gateway es espejo)
- Consumidores afectados: Nexa, gateway MCP, clientes MCP externos
- Runtime target: `production`

### Contract surface

- Contrato existente a respetar: `inputSchema` y `outputSchema` de cada tool — **intactos**.
- Contrato nuevo o modificado: el campo `description` de las tools que compiten por la misma intención; el guard de paridad gana la dimensión `description`.
- Backward compatibility: `compatible` — ningún cliente rompe por una descripción más precisa.
- Full API parity: `N/A — no capability`. No se crea ni modifica una capacidad de negocio; se mejora la superficie de una que ya existe.

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna. Esta task **no toca DB**.
- Invariantes que no se pueden romper:
  - El catálogo no se recorta: cero tools borradas, fusionadas o renombradas.
  - `inputSchema`/`outputSchema` sin cambios.
  - Toda mejora declarada va acompañada de su delta contra el baseline.
  - La descripción del MCP interno y la del gateway son idénticas, y el guard lo prueba.
- Write-target allowlist: `N/A` — sin escrituras.
- Tenant/space boundary: `N/A` — la descripción no depende de la organización.
- Idempotency/concurrency: `N/A`.
- Audit/outbox/history: sin evento nuevo.

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `enabled with rationale` — una descripción mejor no necesita flag; su peor caso es que el eval no mejore, y eso se detecta antes de mergear.
- Backfill plan: `N/A`.
- Rollback path: revert del PR en ambos repos.
- External coordination: PR en el repo hermano `efeonce-mcp` + redeploy del gateway.

### Security and access

- Auth/access gate: sin cambios; las tools conservan su gate.
- Sensitive data posture: sin datos sensibles — es texto de catálogo.
- Error contract: sin cambios.
- Abuse/rate-limit posture: sin cambios. ⚠️ Ojo con un efecto lateral posible: un ruteo que empuje al agente hacia una tool que **gasta** aumentaría el gasto sin cambiar una línea de lógica. El eval debe incluir casos donde la respuesta correcta es **no** llamar a la tool cara.

### Runtime evidence

- Local checks: `pnpm vitest run src/mcp` + el runner del eval.
- DB/runtime checks: `N/A` — no toca PostgreSQL.
- Integration checks: canary del gateway en staging tras el redeploy, verificando que las descripciones servidas son las nuevas.
- Reliability signals/logs: ninguna señal nueva; el gate vive en CI.
- Production verification sequence: ver `Rollout Plan & Risk Matrix`.

### Acceptance criteria additions

- [x] Source of truth, contract surface y consumidores nombrados con paths reales.
- [x] Invariantes explícitos; `N/A` de DB y tenant justificados.
- [x] Sin tablas nuevas.
- [x] Postura de rollback explícita y proporcional.
- [x] Evidencia runtime listada (eval + canary del gateway). **Eval:** 6 corridas, baseline y delta registrados. **Gateway:** desplegado y verificado en el runtime vivo (revisión, postura, health, desafío 401, cadena commit→imagen→revisión).
- [x] Sin datos sensibles ni cambio de gate de acceso.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Baseline medido (va PRIMERO, y puede refutar la task)

- Fixture de **40–60 preguntas reales de operador** (`"¿cómo va Berel este mes?"`, `"¿qué keywords
  perdimos?"`, `"¿de qué tamaño es este competidor?"`, `"¿esta guía está funcionando?"`), cada una
  con la tool esperada, **el mercado esperado** y su justificación de una línea.
- 🔴 **Cobertura de los cinco mercados productivos, no sólo Chile:** `CL` · `MX` · `CO` · `PE` · `US`
  (mapa cerrado ISO-2 → `location_code` cerrado por `TASK-1652`). Las preguntas van en la variante
  que corresponde —**es-CL, es-MX, es-CO, es-PE y en-US**—, porque el registro cambia el vocabulario
  con el que se pide lo mismo: *"posicionamiento"* vs *"posicionamiento SEO"* vs *"rankings"*, y en
  en-US directamente otro léxico. Un fixture monolingüe mide la selección de un solo mercado y la
  declara general.
- Runner que, dado el catálogo actual de descripciones, mide precisión de selección.
- 🔴 **Si el baseline ya es alto, la task se cierra acá con el número como entregable.** Mejor
  descubrirlo con un fixture que con prosa.

### Slice 1b — La dimensión que no es "cuál tool", sino "cuál mercado"

- Casos donde la tool correcta es obvia y **el parámetro `market` es la trampa**: una organización con
  targets en más de un mercado, y una pregunta que no lo declara.
- 🔴 **Comportamiento esperado ante ambigüedad: preguntar o usar el mercado declarado del target —
  NUNCA elegir uno en silencio.** El fixture marca como fallo la elección silenciosa aunque acierte.
- Casos con nombre de marca que sugiere un país distinto al del target (ver `Detailed Spec §4`).
- Se mide por separado de la selección de tool: son dos precisiones distintas y colapsarlas esconde
  la peor.

### Slice 2 — Bloque de ruteo en las seis que compiten

- `get_seo_visibility_360` · `get_seo_overview_kpis` · `get_seo_domain_overview` ·
  `get_seo_performance` · `get_seo_rank_evolution` · `get_seo_url_visibility`.
- Formato fijo al final de cada `description`: `Use when: … · Prefer <tool> if: … · Do NOT use for: …`.
- El ruteo nombra explícitamente la **lente** como criterio de elección (medido vs estimado), que es
  la distinción que más caro sale confundir.

### Slice 3 — Delta medido + gate de regresión

- Re-correr el eval y reportar el delta contra el baseline.
- Convertirlo en gate de CI: agregar una tool SEO sin actualizar el fixture baja la precisión y
  rompe el build.

### Slice 4 — Paridad de descripciones

- Extender el guard de `TASK-1658` de `inputSchema` a `description`, para que una descripción vieja
  en el gateway sea un hallazgo.
- Aplicar el mismo texto en el repo hermano en el mismo PR lógico.

### Slice 5 — Cierre documental

- `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md` con la regla: toda tool nueva
  que compita por una intención existente nace con su bloque de ruteo y su caso en el fixture.
- `Handoff.md`, `changelog.md`, delta en la arquitectura del módulo SEO.

## Out of Scope

- **Borrar, fusionar o renombrar tools.** Prohibido por decisión del operador.
- **Cambiar `inputSchema`/`outputSchema`.** Es `TASK-1785` y otras.
- **Que la lente viaje como campo estructural** — es `TASK-1785`. Acá la lente sólo se usa como
  criterio de ruteo en prosa.
- **Tools no-SEO del gateway.** Si el patrón resulta, generalizarlo es follow-up.
- **Cambiar el prompt de Nexa.** Esta task mejora la superficie; el consumer no se toca.
- **Una tool de "descubrimiento" tipo Semrush** (`discovery → schema → execute`). Se evaluó y se
  descarta: obliga al agente a dos round-trips y le quita al catálogo la semántica que hoy es su
  ventaja. Si el eval del Slice 3 mostrara que el ruteo no alcanza, se reabre como decisión.

## Detailed Spec

### 1. Por qué el eval va primero y no al final

Si primero se escriben las descripciones y después se mide, ya no hay baseline: cualquier número que
salga es incomparable, y el sesgo del autor —que acaba de decidir cuál es la tool "correcta"— se
cuela en el fixture. Escribir el fixture **antes** de tocar el texto obliga a declarar la expectativa
sin saber si se cumple.

Y deja abierta la posibilidad más barata: que el baseline sea bueno y la task no haga falta. Es un
resultado legítimo y hay que poder aceptarlo.

### 2. Las seis que compiten, y por qué se parecen

| Tool | Lente | Sujeto | Contesta |
|---|---|---|---|
| `get_seo_visibility_360` | compuesta | organización | el cuadrante SEO × AEO |
| `get_seo_overview_kpis` | ● + ◑ | recorte seguido | KPIs del set que alguien decidió seguir |
| `get_seo_domain_overview` | ◑ | dominio | tamaño de mercado y trayectoria |
| `get_seo_performance` | ● | dominio propio | la serie medida por GSC |
| `get_seo_rank_evolution` | ◑ | keywords seguidas | posición exacta en el tiempo |
| `get_seo_url_visibility` | ◑ | página/subdominio | qué ranquea una URL |

Las seis son respuestas legítimas a *"¿cómo va?"*. La diferencia que más caro sale confundir es la
**lente**: contestar con `◑` estimado cuando el operador quería `●` medido produce una cifra
plausible y equivocada, presentada con la misma confianza.

### 3. Efecto lateral que el eval debe cubrir

Un ruteo mal escrito puede empujar al agente hacia una tool que **gasta** (`run_seo_prospect_diagnostic`,
`discover_seo_keywords`, `track_seo_keywords`). El fixture incluye casos cuya respuesta correcta es
**no llamar a la tool cara** —o pedir confirmación— para que la mejora de selección no se pague en
factura.

### 4. El error de mercado es más caro que el error de tool, y ya nos pasó

Elegir la tool equivocada da una respuesta con la lente equivocada: es malo y es visible. Elegir la
tool **correcta** con el mercado equivocado da una respuesta **perfectamente formada y sobre otro
país**: es peor, porque nada en la salida delata el error.

No es hipotético. `ISSUE-152` (2026-08-13): el target de **Berel —marca mexicana— estaba midiendo
Chile**, y acumuló **238 snapshots a lo largo de un año contra el SERP equivocado**. Se corrigió
creando `seot-berel-mx` con `location_code` 2484 y pausando el chileno, porque los snapshots son
append-only y mutar el país habría dejado un año de mediciones chilenas colgando de una fila que
**afirma** ser México.

Ese es exactamente el modo de fallo que un fixture monolingüe y mono-mercado no puede detectar. Por
eso el Slice 1b existe y se mide aparte: la precisión de selección de tool puede ser 100% mientras la
de mercado es 60%, y el promedio escondería justo la mitad cara.

Adyacente y con la misma raíz: el defecto (1) de `TASK-1652` era que el adapter pasaba el market
ISO-2 verbatim donde DataForSEO espera nombre completo o `location_code`. El mapa cerrado que esa
task dejó (`CL`/`MX`/`CO`/`PE`/`US`) es la fuente de verdad que este fixture debe respetar.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- 🔴 **Slice 1 va primero y puede terminar la task.** Escribir descripciones antes de medir destruye
  el baseline.
- Slice 1b va con Slice 1: el baseline debe incluir la precisión de mercado desde el principio, o el
  delta final no puede desagregarse.
- Slice 2 → Slice 3 (medir el delta exige el cambio aplicado).
- Slice 4 puede correr en paralelo con Slice 3.
- Slice 5 al final.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El fixture se escribe después de las descripciones y confirma el sesgo del autor | eval | **high** | Slice 1 primero, con la expectativa declarada antes de tocar texto | Delta sospechosamente perfecto |
| El ruteo empuja al agente hacia tools que gastan | provider budget | medium | Casos explícitos en el fixture donde lo correcto es NO llamar a la cara | Alza en `seo_provider_spend_daily` sin cambio de operación |
| El gateway queda con descripciones viejas y sirve un mapa desactualizado | MCP / paridad | medium | Slice 4 extiende el guard de 1658 a `description` | Hallazgo del guard de paridad |
| El eval se vuelve un test de regresión del catálogo del día que se escribió, y toda tool nueva lo "rompe" por hacer lo correcto | CI / mantenimiento | medium | La regla es actualizar el fixture al agregar una tool, y está escrita en el doc de invariantes. Si un cambio legítimo obliga a editar el gate, está mal el gate | Editar expectativas para poner el build en verde |
| El fixture cubre sólo Chile y declara general una precisión que no lo es; el error de mercado queda invisible | eval / credibilidad | **high** | Slice 1b con los cinco mercados productivos y medición separada de la precisión de mercado; precedente `ISSUE-152` citado en la spec | Precisión de tool alta con quejas de cliente sobre cifras que no reconoce |
| El agente elige un mercado en silencio cuando la organización tiene más de un target | growth / credibilidad | medium | El fixture marca la elección silenciosa como fallo aunque acierte; lo correcto es preguntar o usar el declarado | Respuestas sobre el país equivocado sin advertencia |
| Descripciones muy largas degradan la selección en vez de mejorarla | eval | low | El bloque de ruteo es de formato fijo y acotado; el Slice 3 lo mide | Delta negativo |

### Feature flags / cutover

Sin flag — additive, cutover inmediato. Una descripción no tiene modo "apagado" y su peor caso
(el eval no mejora) se detecta antes del merge, no en producción.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert PR — sólo agrega fixture y runner | < 5 min | sí |
| Slice 2 | Revert PR de las descripciones | < 10 min | sí |
| Slice 3 | Retirar el gate de CI | < 5 min | sí |
| Slice 4 | Revert en ambos repos + redeploy del gateway | < 20 min | sí |
| Slice 5 | Revert del doc | < 5 min | sí |

### Production verification sequence

1. Eval baseline verde y registrado con su número.
2. Merge de descripciones; eval post con delta reportado en el PR.
3. PR y redeploy del gateway; canary en staging confirmando que las descripciones servidas son las nuevas.
4. Una conversación real con Nexa sobre un cliente vivo, comprobando que elige la tool esperada para 3 preguntas del fixture.
5. Revisar `seo_provider_spend_daily` a 7 días: la mejora de selección no debe haber movido el gasto.

### Out-of-band coordination required

- PR en el repo hermano `efeonce-mcp` + redeploy del gateway.
- Coordinar con quien opere Nexa si el fixture revela que su prompt compensaba la ambigüedad.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Existe un fixture de 40–60 preguntas reales con su tool esperada, su **mercado esperado** y justificación.
- [x] El fixture cubre los **cinco mercados productivos** (`CL`, `MX`, `CO`, `PE`, `US`) en sus variantes es-CL/es-MX/es-CO/es-PE/en-US, y respeta el mapa cerrado ISO-2 → `location_code` de `TASK-1652`.
- [x] La precisión de **mercado** se mide y reporta **por separado** de la precisión de tool; no se promedian.
- [x] Ante una organización con más de un target y una pregunta sin mercado, elegir uno en silencio cuenta como **fallo** aunque acierte.
- [x] El baseline se midió y quedó registrado **antes** de modificar una sola descripción.
- [ ] ~~Las seis tools que compiten tienen bloque de ruteo con el formato fijo.~~ **NO se cumple, y es un resultado, no una omisión.** Se implementó el formato fijo en las SIETE (`get_seo_dual_lens_visibility` entró al racimo) y **se midió que no servía**: cuatro variantes dieron 92.7–96.4% de precisión de tool sin dirección, y los bloques largos DILUÍAN la cláusula de mercado que sí funcionaba (comparar B2 con C lo aísla). Se aplicó la variante sin bloques. El criterio se escribió suponiendo que el ruteo ayudaría; el eval existía justamente para poder refutarlo. Evidencia: `GREENHOUSE_MCP_TOOL_SELECTION_EVAL_V1.md` §5.
- [x] Cero tools borradas, fusionadas o renombradas.
- [x] `inputSchema` y `outputSchema` sin cambios, probado por test.
- [x] El delta post-cambio está reportado con número; si es negativo o nulo, la task lo dice y no declara mejora.
- [x] El fixture incluye casos cuya respuesta correcta es no llamar a una tool que gasta.
- [x] El guard de paridad compara `description` además de `inputSchema`.
- [x] Las descripciones del gateway y del MCP interno son idénticas tras el redeploy. **Desplegado 2026-09-02**: `mcp.efeonce.org` corre la revisión `efeonce-mcp-gateway-00027-6pj`, construida del commit `3d09e152` (cadena commit→imagen→revisión verificada en el log del deploy). Postura preservada (`internal-and-cloud-load-balancing` + invoker `allUsers`), `health=200`, `/mcp` desafía 401 sin token. En el commit desplegado: 27 tools derivan su descripción con `greenhouseToolDescription`, el manifiesto embebido lleva la cláusula corregida y hay **cero** ocurrencias de la instrucción vieja que causaba ISSUE-152. ⚠️ Leer `tools/list` servido exige login Entra interactivo (no automatizable): esa verificación de punta a punta queda para el operador con el smoke documentado.
- [x] `MCP_TOOL_SURFACE_INVARIANTS.md` declara que toda tool nueva nace con ruteo y con su caso en el fixture.

## Verification

- `pnpm local:check`
- `pnpm vitest run src/mcp`
- Runner del eval, antes y después
- `pnpm test` (suite completa, gate de cierre)
- Canary del gateway en staging
- Revisión de `seo_provider_spend_daily` a 7 días

## Closing Protocol

- [x] `Lifecycle` del markdown quedó sincronizado con el estado real
- [x] el archivo vive en la carpeta correcta
- [x] `docs/tasks/README.md` quedó sincronizado con el cierre
- [x] `Handoff.md` quedó actualizado
- [x] `changelog.md` quedó actualizado
- [x] se ejecutó chequeo de impacto cruzado sobre `TASK-1785`, `TASK-1658` y `TASK-1651`
- [x] delta en `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` sobre la superficie MCP
- [x] `MCP_TOOL_SURFACE_INVARIANTS.md` — ya existía (`TASK-1785`); se le aportó la §7

## Follow-ups

- Generalizar el ruteo y el eval a las tools no-SEO del gateway si el patrón resulta.
- Evaluar si el fixture puede alimentarse de preguntas reales de Nexa en producción, en vez de inventadas.

## Open Questions

- ¿Cuál es el umbral de precisión que declara éxito? Propuesta: fijarlo tras ver el baseline, nunca antes.
- ¿El fixture vive en el repo o se genera desde conversaciones reales de Nexa? Empezar en el repo y evaluar la segunda opción como follow-up.
