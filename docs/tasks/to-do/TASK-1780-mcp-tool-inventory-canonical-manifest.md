# TASK-1780 — El inventario de tools MCP es un manifiesto, no dos listas

## Delta 2026-08-28 (segunda entrada del día) — el alcance NO-SEO es el punto ciego del guard

Al documentar la superficie operable del gateway para un operador
(`docs/operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md` §Superficie operable) apareció una brecha que esta
task debe cubrir y que hoy **nadie mide**: el guard de paridad es **SEO-only**.

`src/mcp/greenhouse/server.ts` declara 41 tools. 26 son SEO (federadas, vigiladas por el guard de
`TASK-1658`). Las **15 restantes no están federadas ni declaradas como exclusión**, y el guard no las
mira, así que no aparecen como drift:

`get_context`, `get_organization`, `list_organizations`, `get_platform_health`, `get_integration_readiness`,
`list_capabilities`, `list_event_types`, `search_knowledge`, `get_knowledge_document`, `search_services`,
`quote_price`, `get_webhook_subscription`, `list_webhook_subscriptions`, `get_webhook_delivery`,
`list_webhook_deliveries`.

**Por qué importa para esta task:** el manifiesto canónico no puede nacer SEO-only, o reproduce el mismo
punto ciego con mejor tecnología. Cada tool interna debe resolver a *federada* o *excluida con razón* —
incluidas las de otros dominios. Hoy un operador que conecta `mcp.efeonce.org` esperando el 360 de
Greenhouse encuentra sólo SEO, y **nada falla ni se lo advierte**: no es un bug, es alcance no declarado,
que es justo lo que un manifiesto existe para hacer visible.


## Delta 2026-08-28 (release a producción) — el espejo se volvió a editar a mano: de 21 a 27

El deploy del gateway `mcp.efeonce.org` (revisión `efeonce-mcp-gateway-00024-8b8`), coordinado con
el release `develop→main` `c983be7f18e68602404567a19ac8e7e0f157f742` (PR #208, run `33178544139`,
manifest `released`), subió el inventario federado de **21 a 27 tools SEO** — entran
`get_seo_provider_spend`, `get_seo_keyword_gap`, `declare_seo_competitors`,
`retire_seo_competitors`, `get_seo_serp_top_results` y `get_seo_competitor_candidates`.

**Por qué importa para esta task:** el espejo `GREENHOUSE_SEO_TOOL_INVENTORY` hubo que actualizarlo
**a mano por segunda vez en dos semanas** (3 → 8 → 6 tools nuevas). Es la evidencia recurrente de la
premisa: mientras el manifiesto canónico no exista, cada tool nueva paga un peaje manual en el repo
del gateway, y el guard sólo puede comparar contra lo que alguien recordó copiar. El registry
interno declara hoy **26 tools SEO** en `src/mcp/greenhouse/server.ts`; el gateway federa 27
(incluye `get_seo_provider_spend`, que consume el lane ecosystem directo). Cualquier cifra de
superficie que esta task cite debe releerse del código, nunca del cuerpo de una spec.

La «Evidencia de cierre» del Slice 3 sigue debiendo usar el caso sintético del test de regresión
—no un caso real—, como ya declaró el Delta 2026-08-27.

## Delta 2026-08-27 — TASK-1658 ejecutada: el caso vivo de las 3 tools ya no existe

- `TASK-1658` federó las **8** tools que estaban ausentes (el drift había crecido de 3 a 8) y dejó el
  guard del gateway **bidireccional**: `GREENHOUSE_SEO_TOOL_INVENTORY` (espejo committeado en
  `efeonce-mcp`, con claves de inputSchema + clase `writes`) + paridad de schema + annotations
  obligatorias, con introspección runtime del server.
- **La "Evidencia de cierre" del Slice 3 quedó stale**: al correr el guard hoy ya NO detecta tools
  invisibles (están federadas). La evidencia de esta task debe usar el caso sintético del test de
  regresión de `efeonce-mcp/test/greenhouse-seo-tool-parity.test.ts` (agregar una tool al manifiesto
  sin federar → rojo nombrándola), no el caso real ya corregido.
- El espejo del gateway es el dato que esta task reemplaza como fuente del guard (Slice 3): el shape
  que el guard consume hoy (`tool` + `inputKeys` + `writes`) es exactamente lo que el manifiesto
  canónico debe publicar como mínimo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
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
- Backend impact: `api`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Hoy existen **dos listas** de qué tools MCP expone Greenhouse —las que registra
`src/mcp/greenhouse/server.ts` y la copia a mano `EXPECTED_GREENHOUSE_SEO_TOOLS` del repo del
gateway— y **ninguna está declarada dueña**. Esta task extrae el inventario a un manifiesto
declarativo del que ambos lados derivan, y hace que las `instructions` del servidor se **deriven** de
él en vez de escribirse a mano.

## Why This Task Exists

**El defecto es de fuente única de verdad, no de carteles.** La consecuencia visible es que tres
tools vivas —`get_seo_overview_kpis`, `get_seo_performance`, `get_seo_performance_catalog`— no están
federadas al gateway **ni declaradas como exclusión**, que es lo que su propio contrato exige. El
guardia de paridad no puede verlo porque compara contra su propia lista: sabe lo que él registró,
nunca lo que Greenhouse tiene. **Una ausencia es indistinguible de una exclusión deliberada.**

**Y la misma raíz produce un segundo síntoma.** `src/mcp/greenhouse/server.ts:16-22` se declara
`name: 'greenhouse-read-only'` con instructions que dicen *«must not be used for writes»*, mientras
registra cuatro tools cuya descripción empieza con `THIS WRITES` — una de ellas comprometiendo
presupuesto de DataForSEO y otra gasto **recurrente**. Las instructions de un servidor MCP son
contrato hacia el cliente. Mientras se escriban a mano, van a volver a desalinearse: ya pasó, y el
manual repitió el error por su cuenta (`:205` dice cuatro escrituras, `:290` sigue diciendo *«las dos
excepciones»*).

**Por qué el inventario vive en Greenhouse y no en el gateway.** La regla dura del ADR es explícita:
*el gateway es un adaptador neutral — dueño del transporte, OAuth, discovery, routing y redacción; los
productos son dueños de la lógica de negocio, los datos, los entitlements y sus readers/commands
canónicos*. Qué capacidades expone Greenhouse es conocimiento de **producto**, no de transporte. Que
esa lista viva en el gateway lo convierte en autoridad sobre lo que Greenhouse ofrece — y es
justamente lo que causa el bug.

**Esta task no es una idea nueva:** es adoptar el follow-up que `TASK-1658` ya dejó escrito —
*«Evaluar si el inventario de tools debería publicarse como recurso del propio MCP de Greenhouse,
para que el guard consuma una fuente viva en vez de una lista espejo»*.

Origen: `docs/audits/platform/2026-08-26-openseo-competitive-teardown-growth-seo-aeo.md` §3.2 y §3.4.

## Goal

- Existe **un** inventario declarativo de las tools MCP de Greenhouse, y es la fuente de la que
  derivan tanto el registro del servidor como el guardia de paridad del gateway.
- El guardia puede distinguir *«esta tool no existe»* de *«existe y no la federamos, por esta razón»*.
- Las `instructions` del servidor declaran sus escrituras porque las **leen** del manifiesto, no
  porque alguien se acordó de actualizarlas.
- La frontera se conserva intacta: Greenhouse declara **qué existe**; el gateway sigue decidiendo
  **qué cruza**, con revisión humana por tool.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md`
- `docs/architecture/EFEONCE_MCP_AGENT_SKILL_ROUTER_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md`

Reglas obligatorias:

- 🔴 **El manifiesto declara qué EXISTE; el allowlist del gateway decide qué CRUZA.** Son dos
  autoridades distintas y esta task no las fusiona. La revisión humana por tool en la frontera
  pública (decisión de `TASK-1647`) se conserva íntegra: **nunca auto-federación**.
- El gateway sigue siendo adaptador neutral. Esta task **no** le da autoridad sobre el catálogo, se
  la quita: pasa de mantener una copia a consumir la fuente.
- `mcp.efeonce.org/mcp` sigue siendo el único recurso canónico público. Esta task **no** abre una
  segunda superficie ni toca OAuth.
- NUNCA describir como lectura una operación que compromete gasto del proveedor. El costo es efecto
  secundario aunque no mute estado propio.
- Ninguna tool cambia de nombre, schema, comportamiento ni estado de federación en esta task.

## Normative Docs

- `.claude/skills/efeonce-mcp-platform/SKILL.md` — el router del control plane
- `docs/manual-de-uso/plataforma/mcp-greenhouse-read-only.md` — el manual a corregir y renombrar
- `docs/audits/platform/2026-08-26-openseo-competitive-teardown-growth-seo-aeo.md` §3.2, §3.4, §3.12

## Dependencies & Impact

### Depends on

- `src/mcp/greenhouse/server.ts` — donde vive hoy la lista, por accidente histórico (existe)
- `src/mcp/greenhouse/tools.ts` — las definiciones de tool, que **no** se mueven (existe)
- `~/Documents/efeonce-mcp/src/providers/greenhouse-seo-tool-parity.ts` — la lista espejo a retirar

### Blocks / Impacts

- 🔴 **`TASK-1658` es la contraparte obligada.** Posee el guardia y la lista espejo. Su Slice 4
  (paridad de schema) y Slice 5 (annotations) **consumen** este manifiesto en vez de mantener la
  copia. Coordinar el orden: si 1658 cierra primero, su lista queda y esta task la reemplaza; si
  cierra esta primero, 1658 nace consumiendo la fuente.
- ⚠️ **`TASK-1694` posee `src/mcp/greenhouse/server.ts`.** Modifican también `TASK-1699`, `1775`,
  `1776`, `1777`, `1779` y `1655`, todas registrando tools de forma aditiva. Después de esta task
  esas tasks escriben en el **manifiesto**, no en el servidor — lo que reduce su colisión.
- El mandato del dominio (*«todo reader SEO/E-E-A-T futuro expone su MCP tool en el MISMO PR»*) pasa
  a apuntar al manifiesto.

### Files owned

- `src/mcp/greenhouse/tool-manifest.ts` (nuevo — el inventario declarativo)
- `src/mcp/greenhouse/server.ts` (modifica sin poseer — dueña `TASK-1694`)
- `src/mcp/greenhouse/__tests__/tool-manifest.test.ts` (nuevo)
- `~/Documents/efeonce-mcp/src/providers/greenhouse-seo-tool-parity.ts` (modifica — dueña `TASK-1658`)
- `docs/manual-de-uso/plataforma/mcp-greenhouse-tool-inventory.md` (renombrado)

## Current Repo State

### Already exists

- `src/mcp/greenhouse/server.ts` — 29 `registerTool`, 16 SEO, 4 con descripción `THIS WRITES`.
- `src/mcp/greenhouse/tools.ts` — las definiciones y el envelope de salida compartido.
- `~/Documents/efeonce-mcp/src/providers/greenhouse-seo-tool-parity.ts` —
  `EXPECTED_GREENHOUSE_SEO_TOOLS` con 13 entradas y `GREENHOUSE_SEO_TOOL_EXCLUSIONS` **vacío**,
  contradiciendo su propio comentario de cabecera.
- `~/Documents/efeonce-mcp/test/greenhouse-seo-tool-parity.test.ts` — el guardia, que compara nombres
  por regex contra el texto de su propio `src/mcp.ts`.

### Gap

- No existe fuente única: dos listas, ninguna declarada dueña.
- El guardia compara en una sola dirección y no puede detectar una ausencia.
- Las `instructions` y el `name` del servidor se escriben a mano y ya divergieron.
- El manual se contradice a sí mismo y su nombre de archivo afirma read-only.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/mcp/greenhouse/` en el portal, más el repo hermano `efeonce-mcp` como consumidor
- Future candidate home: `remain-shared`
- Boundary: el manifiesto es dato; sus consumidores son el registro del servidor y el guardia del gateway
- Server/browser split: `n/a` — el manifiesto y sus consumidores son server-only
- Build impact: `none`
- Extraction blocker: `el consumo cross-repo del manifiesto exige decidir su transporte, ver Open Questions`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `api`
- Source of truth afectado: `el inventario de tools MCP de Greenhouse`
- Consumidores afectados: `el servidor MCP interno, el guardia de paridad del gateway`
- Runtime target: `local + CI`

### Contract surface

- Contrato existente a respetar: `EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md` (frontera adaptador neutral), decisión de allowlist con revisión humana de `TASK-1647`
- Contrato nuevo o modificado: el manifiesto como fuente; el `name` y las `instructions` pasan a derivarse
- Backward compatibility: `compatible` — ninguna tool cambia de forma; ningún cliente rompe
- Full API parity: `un inventario, muchos consumidores — el mismo patrón que la task hace cumplir`

### Data model and invariants

- Entidades/tablas/views afectadas: `ninguna` — el manifiesto es código declarativo, no persistencia
- Invariantes que no se pueden romper:
  - Cada entrada declara si la tool **escribe** y si **compromete gasto del proveedor**. Son dos ejes distintos: `discover_seo_keywords` gasta y escribe; una tool podría gastar sin mutar estado propio.
  - El manifiesto NUNCA declara si una tool está federada: eso es autoridad del gateway.
  - Registrar una tool sin entrada en el manifiesto rompe el build.
- Write-target allowlist: `N/A — sin escrituras a base de datos`
- Tenant/space boundary: `sin cambios`
- Idempotency/concurrency: `N/A`
- Audit/outbox/history: `N/A`

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `enabled with rationale` — corregir una fuente de verdad duplicada no necesita flag
- Backfill plan: `N/A` — el manifiesto nace poblado con las 29 tools actuales
- Rollback path: `revert PR` en cada repo por separado
- External coordination: `coordinar el orden con TASK-1658, que posee el guardia`

### Security and access

- Auth/access gate: `sin cambios` — esta task no toca OAuth, scopes ni bindings
- Sensitive data posture: `no sensitive data` — el manifiesto declara nombres y clases, nunca secretos
- Error contract: `sin cambios`
- Abuse/rate-limit posture: `sin cambios`

### Runtime evidence

- Local checks: `pnpm local:check` + el test del manifiesto en ambos repos
- DB/runtime checks: `N/A`
- Integration checks: el guardia del gateway corre contra el manifiesto y **detecta las tres tools hoy invisibles**
- Reliability signals/logs: `ninguna`
- Production verification sequence: `N/A — sin cambio de runtime en producción`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — El manifiesto, y el servidor consumiéndolo

- `tool-manifest.ts`: una entrada por tool con su nombre, dominio, si **escribe**, si **compromete
  gasto del proveedor**, y una línea de propósito. Sin schemas ni handlers: esos siguen en `tools.ts`.
- `server.ts` registra **recorriendo el manifiesto**. Una tool registrada sin entrada rompe el build.
- Test que compara el manifiesto contra las tools efectivamente registradas, en las dos direcciones.

### Slice 2 — El cartel se deriva

- `name` e `instructions` se **construyen** desde el manifiesto: cuántas leen, cuáles escriben, cuáles
  gastan. Se conservan las afirmaciones que sí son ciertas: downstream del lane, scope externo fijo,
  request id preservados, sin inferencia de tenancy desde texto libre.
- `callReadTool` deja de llamarse como si todo fuera lectura.
- El manual se corrige, se renombra, y sus enlaces entrantes se actualizan.

### Slice 3 — El segundo consumidor: el guardia del gateway

- El guardia de `efeonce-mcp` deja de comparar contra `EXPECTED_GREENHOUSE_SEO_TOOLS` y compara contra
  el manifiesto de Greenhouse.
- El allowlist del gateway **sigue existiendo y sigue siendo suyo**: pasa de ser *«la lista de lo que
  hay»* a ser *«la lista de lo que dejamos cruzar»*, con su razón por entrada.
- El guardia falla si una tool del manifiesto no está ni federada ni excluida con razón escrita.
- **Evidencia de cierre:** al correrlo hoy, debe detectar las tres tools que hoy son invisibles.

## Out of Scope

- **El destino del servidor MCP interno.** Que nadie se conecte a él es cierto y es una decisión
  aparte, más chica, que el manifiesto vuelve barata en cualquier dirección. Mezclarla acá junta
  «arreglar la fuente de verdad» con «retirar una superficie», que tienen riesgos distintos.
- **Federar o excluir las tres tools detectadas.** Esta task hace que el guardia las **vea**; qué se
  hace con ellas es decisión de `TASK-1658` con revisión humana.
- **Cualquier cambio a una tool**: nombre, schema, comportamiento, annotations. Las annotations son
  el Slice 5 de `TASK-1658`.
- **OAuth, scopes, bindings y la superficie HTTP remota.** Nada de eso se toca.
- **Generalizar el manifiesto a los demás providers del gateway** (Globe, Hiring). Follow-up.

## Detailed Spec

La forma del manifiesto, en prosa: una lista de entradas, cada una con el nombre exacto de la tool, el
dominio al que pertenece, dos banderas ortogonales —`writes` y `spendsProviderBudget`— y una línea de
propósito legible. Deliberadamente **no** lleva schema, handler ni estado de federación: los dos
primeros ya viven en `tools.ts` y duplicarlos reintroduce el problema que esta task cierra; el tercero
es autoridad del gateway.

Las dos banderas son ortogonales a propósito. Mezclarlas en un solo campo `readOnly` es exactamente el
error de hoy: `discover_seo_keywords` escribe **y** gasta, pero una tool futura podría gastar sin
mutar nada nuestro, y el cliente MCP necesita saberlo igual.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2. El cartel no puede derivarse de un manifiesto que todavía no existe.
- Slice 1 → Slice 3. El guardia no puede consumir una fuente que todavía no existe.
- 🔴 **Slice 3 no es opcional ni diferible.** Un manifiesto con un solo consumidor no es una fuente
  de verdad: es una **tercera lista**, y deja el repo peor que antes. Mientras Slice 3 no cierre,
  esta task no está hecha.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Slice 3 se difiere y queda una tercera lista | N/A | **medium** | La regla de ordering lo declara bloqueante de cierre; el criterio de aceptación lo exige explícito | sin señal — por eso es regla, no chequeo |
| Conflicto de merge con `TASK-1694`, dueña de `server.ts` | N/A | medium | Coordinar el orden antes de tomarla; el diff es estructural y se rebasa mal — conviene no solaparlas | sin señal — emerge en el merge |
| El manifiesto se interpreta como autoridad de federación | N/A | low | Declarado como invariante y como Out of Scope; el manifiesto no tiene campo de federación por diseño | sin señal — emerge en revisión |
| El transporte cross-repo acopla el CI del gateway a un deployment vivo | N/A | medium | Ver Open Questions: la decisión de transporte es explícita y no se toma por omisión | el CI del gateway falla por red, no por drift |

### Feature flags / cutover

Sin flag — additive, immediate cutover. Unificar dos listas en una fuente no admite estado
intermedio: o hay una fuente o hay dos.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR; `server.ts` vuelve a registrar inline | <10 min | si |
| Slice 2 | revert PR; el cartel vuelve a ser prosa | <5 min | si |
| Slice 3 | revert PR en `efeonce-mcp`; el guardia vuelve a su lista espejo | <10 min | si |

### Production verification sequence

N/A — sin cambio de runtime en producción. La verificación es de CI: el guardia corre y detecta las
tres tools hoy invisibles. Esa detección **es** la prueba de que el manifiesto tiene dos consumidores
reales.

### Out-of-band coordination required

Coordinar con quien tenga `TASK-1658` y `TASK-1694`. No hay coordinación con sistemas externos: no se
toca Entra, ni Cloud Run, ni secretos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe un manifiesto declarativo con una entrada por tool registrada, y `server.ts` registra recorriéndolo.
- [ ] Registrar una tool sin entrada en el manifiesto rompe el build.
- [ ] Cada entrada declara `writes` y `spendsProviderBudget` como banderas separadas.
- [ ] El manifiesto NO tiene campo de federación: qué cruza al público sigue siendo autoridad del gateway.
- [ ] El `name` y las `instructions` se construyen desde el manifiesto y declaran las cuatro escrituras y el gasto.
- [ ] Las instructions conservan las afirmaciones verdaderas: downstream del lane, scope externo fijo, request id preservados, sin inferencia de tenancy.
- [ ] El guardia del gateway compara contra el manifiesto y ya no contra una lista espejo.
- [ ] 🔴 Corrido hoy, el guardia **detecta las tres tools que no están federadas ni excluidas**. Sin esa detección la task no está hecha.
- [ ] El allowlist del gateway sobrevive con su razón por entrada, y la revisión humana por tool se conserva.
- [ ] El manual ya no se contradice entre sus líneas 205 y 290, y su nombre no afirma read-only.
- [ ] Ninguna tool cambió de nombre, schema, comportamiento ni estado de federación.

## Verification

- `pnpm local:check` y `pnpm test src/mcp/greenhouse` en Greenhouse
- La suite del repo `efeonce-mcp`, con el guardia consumiendo el manifiesto
- Levantar `pnpm mcp:greenhouse` y leer las instructions derivadas con un cliente MCP real

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `TASK-1658` quedó actualizada: sus slices consumen el manifiesto en vez de la lista espejo
- [ ] el mandato del dominio quedó redirigido al manifiesto en la doc que lo declara
- [ ] los enlaces entrantes al manual renombrado quedaron actualizados

## Follow-ups

- Decidir el destino del servidor MCP interno: consumidor delgado del manifiesto, o retiro. El
  manifiesto vuelve barata cualquiera de las dos.
- Generalizar el manifiesto a los demás providers del gateway (Globe, Hiring), si el patrón resulta.
- Anotaciones `readOnlyHint` derivadas del manifiesto en el servidor interno, espejo de lo que
  `TASK-1658` hace en el gateway.

## Open Questions

- 🔴 **Cómo viaja el manifiesto al repo del gateway.** Dos candidatos, y la decisión no se toma por
  omisión: (a) **endpoint del lane** que lo publique, con el guardia corriendo como canary contra el
  deployment — encaja con el patrón de canary que el repo ya tiene, pero **un canary no es un gate de
  merge**; (b) **artefacto committeado** que el gateway consuma con verificación de hash — sirve como
  gate de CI sin depender de la red, pero una copia sin verificación reintroduce el espejo que esta
  task elimina. La restricción a respetar: el CI del gateway **no debe depender de un deployment vivo**
  para un gate de merge. Discovery decide con esa restricción nombrada.
- ¿El manifiesto cubre las 29 tools o sólo las federables? Nace con las 29 —es el inventario de lo que
  existe— pero conviene confirmarlo contra el criterio del guardia.
