# TASK-1914 — Marketing Studio: registro de roles de agente y tarjetas de rol

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Delta 2026-09-26 — decisiones del operador

- **Grants de `marketing_studio.agent_role.manage`:** `efeonce_admin` y `efeonce_operations` (decisión de Julio Reyes,
  operador, 2026-09-26; roles verificados en `src/config/role-codes.ts`). Relajar un rol sigue siendo `T2` (`dryRun` →
  digest → confirmación) aunque la persona tenga la capability.

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
- Backend impact: `command`
- Epic: `EPIC-049`
- Status real: `Diseno — creada 2026-09-26 desde el ADR de operación híbrida con agentes (§4.2, §4.3, §4.7, §4.8); ningún slice empezado. Existen dos skills de rol interactivas (planificador de medios, SEO/AEO); faltan tres`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-1894 (kernel de commands, dryRun → digest) · TASK-1899 (escritura MCP, cliente de canje por capability). La aplicación de la lista blanca en el gateway para corridas delegadas espera la forma del token de EPIC-044 (ver TASK-1915); el catálogo de tipos de work item lo entrega TASK-1913`
- Branch: `efeonce-marketing-studio main (registro, compilador, guardas) · Greenhouse develop (capability, skills de rol, manual servido, docs) · efeonce-mcp rama + PR (guarda de lista blanca, sync y versión); sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crea en Studio el **registro declarativo y versionado de roles de agente**: cada tarjeta de rol es dato, no código,
y declara misión, tipos de work item que acepta, skills con versión, tools permitidas con su nivel (`T0`/`T1`
directo; `T2` sólo como propuesta), límites (costo por corrida y mensual, turnos, tokens, duración, presupuesto de
proveedor de datos en cero), runtime y modelo preferidos con alternativas, set de evaluación, modos habilitados y kill
switch. Un compilador determinista convierte la tarjeta en una especificación portable sin sintaxis de proveedor, que
cada adaptador de TASK-1915 traduce a Claude u OpenAI. La lista blanca de tools se aplica en dos capas: el runtime
sólo expone las tools del rol (TASK-1915) y **Studio y el gateway rechazan** cualquier tool fuera de la lista de la
corrida (esta task). Publica las tarjetas de los **cinco roles iniciales** (planificador de medios, SEO/AEO,
copywriter, QA creativo y de marca, analista de desempeño) y convierte las skills de rol existentes en la versión
interactiva de esas tarjetas; crea las tres skills de rol que faltan. Suma la política por organización (runtimes
admitidos, autorización de runtimes sin ZDR, techo mensual).

## Why This Task Exists

- Hoy los agentes son sesiones, no roles: cada persona arma el contexto a mano y no hay registro de qué puede hacer
  cada rol, con qué tools, con qué límite de costo y con qué evaluación (ADR híbrido §1).
- Sin una tarjeta portable, cada proveedor tendría su propia definición del rol y divergirían (ADR §3.5, opción A
  rechazada). Cambiar de Claude a OpenAI debe ser configuración, no migración.
- La seguridad no puede depender de que el modelo obedezca: la lista blanca tiene que aplicarse del lado de Studio y
  del gateway, no sólo en el runtime (ADR §4.2, §4.7).
- TASK-1913 (asignar a un rol), TASK-1915 (despachar corridas) y TASK-1916 (evaluar y medir por rol) necesitan un rol
  con versión estable sobre el cual operar.

## Goal

- Registro `agent_role` versionado con tarjetas validadas por esquema, sin sintaxis de proveedor.
- Compilador determinista tarjeta → especificación portable con `cardDigest`.
- Lista blanca aplicada en Studio (kernel) y en el gateway para corridas de agente; intentos fuera de lista registrados.
- Modos por rol, kill switch por rol y global, política por organización.
- Cinco tarjetas iniciales publicadas y cinco skills de rol interactivas alineadas con sus tarjetas por un test de
  deriva.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_HYBRID_AGENTS_DECISION_V1.md` (**gobernante**: §3.5,
  §4.2, §4.3, §4.7, §4.8, §7)
- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_STRATEGY_LAYER_DECISION_V1.md` (niveles de riesgo,
  paridad, un rol nunca gasta presupuesto de proveedor)
- `docs/architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md` y
  `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` (capability + grant en el mismo PR)
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`

Reglas obligatorias:

- **La tarjeta no contiene sintaxis de ningún proveedor.** El esquema rechaza claves de proveedor (`allowed_tools`,
  `require_approval`, `permission_policy`, `mcp_servers`, cabeceras beta, etc.); eso lo produce cada adaptador.
- **Una tool nueva del gateway no aparece sola en un rol:** entra a la tarjeta con versión nueva.
- **`T2` sólo como propuesta:** una tool `T2` en la tarjeta se permite únicamente con `dryRun`; la ejecución la
  confirma una persona fuera de la corrida.
- **Presupuesto de proveedor de datos en cero por defecto:** ningún rol rastrea palabras clave, declara competidores
  ni corre diagnósticos pagados; los propone como `T2` al command dueño en Greenhouse.
- **MCP de Efeonce como única vía en corridas de agente:** en modo segundo plano y programado la tarjeta sólo lista
  tools de `mcp.efeonce.org`. Los MCP de terceros (p. ej. el MCP oficial de Meta Ads que usa el planificador de
  medios en modo interactivo) sólo existen en modo interactivo, bajo la conexión propia de la persona, y nunca en la
  tarjeta de una corrida.
- **Endurecer es `T1`, relajar es `T2`:** crear o cambiar una tarjeta es `T1` con capability restringida; publicar
  una versión que sube un techo, habilitar un modo, apagar un kill switch o admitir un runtime sin ZDR es `T2`.
- **Ausencia ≠ cero:** un rol sin evaluación es «sin evaluar», nunca «aprobado».

## Normative Docs

- `.claude/skills/efeonce-agent-media-planner/**` y `.claude/skills/efeonce-agent-seo-aeo/**` (tarjetas interactivas
  existentes: `SKILL.md`, `references/tools-and-tiers.md`, `references/deliverable-template.md`, `agents/openai.yaml`).
- `.claude/skills/efeonce-campaign-planning/SKILL.md` (estrategia de campaña que los roles consumen).
- `.claude/skills/efeonce-marketing-studio/SKILL.md`, `.claude/skills/efeonce-mcp-platform/SKILL.md`, `mcp-craft`.
- `.claude/skills/copywriting/SKILL.md`, `.claude/skills/efeonce-advertising-creative/SKILL.md`,
  `.claude/skills/axis-design-system/SKILL.md`, `.claude/skills/digital-marketing/SKILL.md`, `.claude/skills/dataviz-design/SKILL.md` (oficios que las tres
  skills de rol nuevas orquestan sin repetir).

## Contrato editorial SEO reconciliado — 2026-10-04

El rol SEO/AEO es la foundation de la especialización advisory TASK-1669: tres perspectivas
de research/editorial/measurement se modelan como tarjetas/variantes/steps versionados dentro
de este registry. No registry propio en SEO/Nexa. Cards respetan orden/version/expiry de
TASK-1700 y no permiten provider/CMS/commands mutantes directos por una recomendación.
1669 especializa/evalúa el rol; no bloquea el catálogo genérico ni publica cards por documentación.

Canon: ADR de estrategia Studio §14. Esta precisión documental no implementa ni cierra esta task.

## Dependencies & Impact

### Depends on

- `TASK-1894`: kernel de commands (`Idempotency-Key`, `If-Match`, `dryRun` → `proposalDigest`).
- `TASK-1899`: escritura MCP con la persona como actor; receta de un cliente de canje por capability.
- `TASK-1913`: catálogo `work_item_type` (la tarjeta declara qué tipos acepta; hasta que exista, se valida contra la
  semilla v1 declarada en TASK-1913).
- `TASK-1905`: `riskTier` en el registro de operaciones (la tarjeta hereda el nivel de cada tool, nunca lo declara
  más bajo).

### Blocks / Impacts

- TASK-1669 especializa el rol SEO/AEO, sin bloquear el registry genérico.

- `TASK-1913` Slice 4: asignar a un rol exige tarjeta publicada, modo habilitado y kill switch apagado.
- `TASK-1915`: los adaptadores compilan la especificación portable; la guarda de lista blanca rechaza llamadas de
  corridas; el despachador lee techos y política por organización.
- `TASK-1916`: evals por versión de tarjeta; la compuerta de modos consulta el estado de evaluación.
- `TASK-1906`, `TASK-1907`, `TASK-1908`, `TASK-1909`, `TASK-1910`, `TASK-1911`: los roles operan sus tools (modelo de
  cliente, plan, SEO/AEO, procedencia y validadores, medición, aprendizajes) como cualquier cliente; cada tool nueva
  que esas tasks federen entra a una tarjeta sólo con versión nueva. El rol SEO/AEO nunca ejecuta el rastreo de
  TASK-1908 (es `T2` del command dueño en Greenhouse); el analista de desempeño lee el readback de TASK-1910, nunca las
  plataformas publicitarias directo.
- `TASK-1864` (U20, EPIC-044): el router generado de clientes Claude/Codex puede enrutar a las skills de rol; coordinar
  nombres.
- `TASK-1904` (U21): las skills de rol se distribuyen en el plugin de Codex/ChatGPT como skills de usuario.

### Files owned

- Repo Studio: `packages/database/migrations/<ts>_agent-roles.sql` [nuevo], `packages/database/seeds/agent-roles-v1/*.json` [nuevo], `packages/database/src/schema.ts`, `packages/contracts/src/agent-roles.ts` [nuevo], `packages/contracts/src/operations.ts`, `packages/contracts/src/semantics.ts`, `packages/domain/src/agent-roles/**` [nuevo: registro, esquema, compilador, guarda de lista blanca, política por organización], `apps/web/src/app/api/v1/agent-roles/**` [nuevo], `apps/web/src/app/api/v1/agent-policy/**` [nuevo], `packages/contracts/generated/tool-manifest.json` (regenerado)
- Greenhouse: `src/config/entitlements-catalog.ts`, `src/lib/entitlements/runtime.ts`, migración de seed de `capabilities_registry` [nuevo], `src/lib/sister-platforms/mcp-token-exchange.ts` (cliente de canje de la capability nueva), `.claude/skills/efeonce-agent-media-planner/**`, `.claude/skills/efeonce-agent-seo-aeo/**`, `.claude/skills/efeonce-agent-copywriter/**` [nuevo], `.claude/skills/efeonce-agent-creative-qa/**` [nuevo], `.claude/skills/efeonce-agent-performance-analyst/**` [nuevo] (+ espejos `.codex/skills/**`), `docs/mcp/skills/marketing-studio/SKILL.md` (sección «Roles de agente»), `docs/operations/agent-context-router.json` (disparadores de las skills nuevas)
- Gateway `efeonce-mcp`: `src/providers/marketing-studio*.ts` (guarda de lista blanca por corrida), contratos de canje, `package.json`, `surface-baseline.json`

## Current Repo State

### Already exists

- Skills de rol interactivas `efeonce-agent-media-planner` y `efeonce-agent-seo-aeo` (commit `07e0efdca`), con
  misión, flujo, tools y niveles, plantilla de entregable y `agents/openai.yaml`; ambas remiten al ADR híbrido.
- Skill `efeonce-campaign-planning` (commit `03671e3e3`).
- Registro de operaciones Studio (`packages/contracts/src/operations.ts`, inventario derivado del registro); el
  gateway deriva políticas del manifiesto (`efeonce-mcp/src/providers/marketing-studio*.ts`).
- Capabilities `marketing_studio.campaign.read` y `marketing_studio.asset.download` en
  `src/config/entitlements-catalog.ts` con grants en `src/lib/entitlements/runtime.ts`.

### Gap

- No existe registro de roles, tarjetas, compilador, modos, kill switch ni política por organización.
- No existen las skills de rol de copywriter, QA creativo y de marca ni analista de desempeño.
- Ni Studio ni el gateway saben distinguir una llamada de una corrida de agente ni aplican una lista por rol.
- Las skills de rol no declaran versión ni una tarjeta de la que sean la versión interactiva.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `efeonce-marketing-studio` (`packages/domain/src/agent-roles/**`, rutas `/api/v1`) + guarda en `efeonce-mcp` + capability y skills en Greenhouse
- Future candidate home: `remain-shared`
- Boundary: el esquema de tarjeta y el compilador no importan tipos de Studio (se promueven con el puerto del despachador si llega un segundo consumidor, ADR §8); consumidores autorizados: commands de TASK-1913, despachador de TASK-1915, evals de TASK-1916, gateway
- Server/browser split: registro, compilador y guardas corren en el servidor; ningún cliente de navegador compila tarjetas
- Build impact: `none`
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `command`
- Source of truth afectado: `studio.agent_role`, `studio.agent_role_version`, `studio.agent_role_mode`, `studio.agent_kill_switch`, `studio.agent_org_policy`, `studio.agent_tool_denial` (nuevas)
- Consumidores afectados: TASK-1913 (asignación), TASK-1915 (despachador y adaptadores), TASK-1916 (evals y métricas), gateway, skills de rol
- Runtime target: Studio staging/production; gateway; Greenhouse (capability)

### Contract surface

- Contrato existente a respetar: registro de operaciones con `riskTier`; forma común de command; digest de `T2`; manifiesto de tools con hash
- Contrato nuevo o modificado: esquema `AgentRoleCard` v1, `PortableAgentSpec` v1 (salida del compilador), guarda `assertToolAllowedForRun`, operaciones de Detailed Spec
- Backward compatibility: `compatible` (entidades nuevas; la guarda sólo actúa sobre llamadas que traen contexto de corrida)
- Full API parity: crear, editar, publicar, retirar, habilitar y deshabilitar modos, kill switch, política por organización y lecturas tienen command/reader, ruta y tool

### Data model and invariants

- Entidades/tablas/views afectadas: ver Detailed Spec §«Modelo»
- Invariantes que no se pueden romper:
  - una versión publicada de tarjeta es inmutable (trigger); cambiar = versión nueva
  - la tarjeta no declara una tool con nivel menor al del registro de operaciones; una tool inexistente en el manifiesto ⇒ `422 agent_role_unknown_tool`
  - una tarjeta con clave de sintaxis de proveedor ⇒ `422 agent_role_provider_syntax`
  - modo `background` o `scheduled` no se habilita sin evaluación aprobada vigente para al menos una combinación rol × runtime × modelo (TASK-1916); hasta que TASK-1916 exista, ⇒ `409 eval_required`
  - kill switch encendido (rol o global) ⇒ ninguna corrida nueva y rechazo de las llamadas de corridas en curso de ese rol
  - llamada con contexto de corrida a una tool fuera de la lista ⇒ `403 agent_tool_not_allowed` + fila en `agent_tool_denial`
  - un runtime sin ZDR sólo corre con datos de una organización que lo autorizó explícitamente
  - `data_provider_budget` en cero por defecto; subirlo es `T2`
- Write-target allowlist: N/A (Studio; declarado)
- Tenant/space boundary: tarjetas y kill switch son globales de Efeonce; `agent_org_policy` por `organization_id`; toda lectura respeta la organización del actor
- Idempotency/concurrency: `Idempotency-Key` en toda escritura; `If-Match` en borradores de tarjeta y política; publicar con `expectedRevision`
- Audit/outbox/history: `audit_event` por command; `agent_tool_denial` append-only; versiones de tarjeta nunca se borran

### Migration, backfill and rollout

- Migration posture: `additive` + `seed`
- Default state: `STUDIO_AGENT_ROLES_ENABLED=false`; guarda de lista blanca en modo `enforce` desde el primer día (no hay corridas antes de TASK-1915, así que no rompe nada); kill switch global encendido hasta TASK-1915
- Backfill plan: semilla de las cinco tarjetas v1 (dry-run → revisión humana → `--apply`), en borrador; publicarlas es un paso explícito de una persona
- Rollback path: flag OFF; kill switch global; revert PR; tablas quedan
- External coordination: release de Greenhouse (capability, grants, cliente de canje, skills y manual servido), sync y dispatch del gateway

### Security and access

- Auth/access gate: lecturas `marketing_studio.campaign.read`; gestión de roles, modos, kill switch y política con capability nueva `marketing_studio.agent_role.manage` (grants `efeonce_admin`, `efeonce_operations`, decididos por el operador el 2026-09-26; relajar sigue siendo `T2`); encender un kill switch lo puede hacer cualquier persona con `.agent_role.manage` sin digest
- Sensitive data posture: las tarjetas no contienen secretos ni PII; las instrucciones no incluyen credenciales; `agent_tool_denial` guarda nombre de tool y corrida, nunca argumentos
- Error contract: `agent_role_unknown_tool`, `agent_role_provider_syntax`, `agent_role_version_immutable`, `agent_role_not_published`, `agent_role_disabled`, `agent_mode_disabled`, `eval_required`, `agent_tool_not_allowed`, `agent_kill_switch_on`, `runtime_not_admitted`, `confirmation_required`
- Abuse/rate-limit posture: gestión de roles es de baja frecuencia; `agent_tool_denial` con tope de escritura por corrida para no amplificar un bucle

### Runtime evidence

- Local checks: esquema de tarjeta (válidas e inválidas), inmutabilidad, compilador determinista (mismo `cardDigest`), guarda de lista blanca con y sin contexto de corrida, reglas `T1`/`T2` por dirección del cambio, test de deriva skill ↔ tarjeta
- DB/runtime checks: migración con bloque `DO`; triggers verificados en staging
- Integration checks: en staging, una llamada con contexto de corrida simulada (token de prueba del gateway) a una tool fuera de la lista ⇒ `403` en el gateway **y** en Studio (probando cada capa por separado)
- Reliability signals/logs: filas de `agent_tool_denial` (TASK-1916 las convierte en señal con estado estable 0); `logEvent` de kill switch
- Production verification sequence: ver Rollout Plan

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR: es un control de frontera deliberado, no un inventario que se actualiza solo. (Studio: N/A declarado.)
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] Registro, compilador y guardas en `packages/domain` (y la guarda espejo en el gateway), no en una UI.
- [ ] Rol modelado como recurso versionado con commands.
- [ ] Capability `marketing_studio.agent_role.manage` en `capabilities_registry` + `entitlements-catalog.ts` + grant a ≥1 rol real en `runtime.ts` + cliente de canje, en el mismo PR (coverage test verde).
- [ ] Camino programático: `/api/v1` + tools federadas.
- [ ] Toda operación declara `riskTier`; relajar (subir techo, habilitar modo, apagar kill switch, admitir runtime sin ZDR) es `T2` con `dryRun` → digest.
- [ ] Un primitive, muchos consumers: UI futura, agentes y despachador sobre los mismos commands.
- [ ] Parity check = SÍ.

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

### Slice 1 — Modelo y esquema de tarjeta

- Migración `<ts>_agent-roles.sql` con las tablas de Detailed Spec §«Modelo», trigger de inmutabilidad sobre
  versiones publicadas, trigger append-only en `agent_tool_denial`, bloque `DO`.
- Esquema `AgentRoleCard` v1 (Zod en `packages/contracts/src/agent-roles.ts`) con la lista de claves de proveedor
  prohibidas y validación contra el manifiesto de tools vigente (nombre y `riskTier`).

### Slice 2 — Commands, readers, rutas y tools

- Commands `createAgentRole`, `upsertAgentRoleDraft`, `publishAgentRoleVersion` (compara con la versión publicada
  anterior: endurecer ⇒ `T1`; subir techos, sumar tools, subir presupuesto de proveedor de datos o sumar modos ⇒
  `T2`), `retireAgentRoleVersion`, `enableAgentRoleMode` (`T2`, consulta la compuerta de evaluación de TASK-1916),
  `disableAgentRoleMode` (`T1`), `setAgentKillSwitch` (encender `T1`, apagar `T2`; por rol o global),
  `upsertAgentOrgPolicy` (sumar runtime sin ZDR o subir techo ⇒ `T2`).
- Readers `listAgentRoles`, `getAgentRole` (versiones, modos, kill switch, estado de evaluación «sin evaluar» hasta
  TASK-1916), `getAgentOrgPolicy`, `listAgentToolDenials`.
- Rutas, registro con `riskTier`, manifiesto, paridad y leak test.

### Slice 3 — Compilador portable

- `compileRoleCard(card, manifest) → PortableAgentSpec` determinista: instrucciones ensambladas desde la misión y las
  skills referenciadas (por nombre y digest), lista de tools con nivel y modo `dryRunOnly` para `T2`, límites,
  preferencias de runtime, dominios web permitidos, `cardDigest` (sha256 del JSON canónico).
- Tests de oro: la misma tarjeta produce el mismo `cardDigest`; la especificación no contiene claves de proveedor;
  fakes de los cuatro adaptadores (los reales llegan con TASK-1915) aceptan la especificación.

### Slice 4 — Guarda de lista blanca en dos capas (lado Studio y gateway)

- Studio: hook del kernel `assertToolAllowedForRun` que, cuando la llamada trae contexto de corrida (claim de corrida
  en el token delegado o identidad de servicio de agente, forma definida con TASK-1915/EPIC-044), verifica tool,
  modo `dryRunOnly` para `T2` y kill switch; rechaza con `403 agent_tool_not_allowed` y registra la denegación.
- Gateway: la misma verificación antes de enrutar (filtra `tools/list` y rechaza `tools/call`) para tokens con
  contexto de corrida; política derivada del registro de Studio por lectura cacheada con TTL corto, nunca de una
  lista a mano. Sin contexto de corrida (persona en modo interactivo) no cambia nada.

### Slice 5 — Tarjetas iniciales y skills de rol

- Semillas v1 de las cinco tarjetas: `media_planner`, `seo_aeo`, `copywriter`, `creative_brand_qa`,
  `performance_analyst` (misión, tipos de work item, skills, tools con nivel, límites, preferencias de runtime sin
  decidir por defecto —eso lo decide TASK-1916—, set de evaluación «pendiente», modos: sólo `interactive`).
- Skills existentes `efeonce-agent-media-planner` y `efeonce-agent-seo-aeo`: frontmatter/sección «Tarjeta de rol»
  con `roleKey@version`; su `references/tools-and-tiers.md` pasa a generarse o validarse contra la tarjeta publicada
  (test de deriva). Los MCP de terceros quedan marcados «sólo interactivo».
- Skills nuevas (misma estructura: `SKILL.md`, `references/tools-and-tiers.md`, `references/deliverable-template.md`,
  `agents/openai.yaml`, espejo `.codex`): `efeonce-agent-copywriter` (copys por canal validados contra el catálogo,
  variantes, nunca reescribe un copy aceptado; orquesta `copywriting`), `efeonce-agent-creative-qa` (QA de pieza
  contra formato, derechos, marca y AXIS; informe `qa_report`; orquesta `efeonce-advertising-creative` y
  `axis-design-system`), `efeonce-agent-performance-analyst` (informe semanal con métricas citadas y «sin dato»;
  orquesta `digital-marketing` y `dataviz-design`). Cada una con disparadores en `docs/operations/agent-context-router.json`.
- Sección «Roles de agente» en el manual servido `docs/mcp/skills/marketing-studio/SKILL.md` (sin ids de task,
  rutas, org ids ni secretos).

### Slice 6 — Capability, canje y gateway

- Greenhouse: capability `marketing_studio.agent_role.manage` (registry + catálogo + grants a `efeonce_admin` y
  `efeonce_operations` + cliente de canje `efeonce-mcp-marketing-studio-agent-role-manage`, receta TASK-1899), release.
- Gateway: sync del manifiesto, guarda del Slice 4, bump de versión, dispatch, canary.

## Out of Scope

- Ejecutar corridas, adaptadores de proveedor, reserva de costo y programas: TASK-1915.
- Evals, calificación, métricas por rol y elección de runtime por defecto: TASK-1916.
- UI para editar tarjetas o ver roles: follow-up consumidor en TASK-1895/1912.
- Roles adicionales a los cinco iniciales: se agregan como dato con la misma tarjeta, sin task nueva salvo que traigan tools nuevas.
- Diseño del token de delegación de Efeonce ID (EPIC-044, ver TASK-1915).

## Detailed Spec

### Modelo

| Tabla | Columnas clave |
|---|---|
| `agent_role` | `role_key PK` (`media_planner`, …), `label_es`, `created_by`, `created_at` |
| `agent_role_version` | `(role_key, version_no) PK`, `status draft\|published\|superseded\|retired`, `card jsonb` (esquema `AgentRoleCard` v1), `card_digest`, `revision`, `published_by NULL`, `published_at NULL` |
| `agent_role_mode` | `(role_key, mode) PK` (`interactive`, `background`, `scheduled`), `enabled bool`, `changed_by`, `changed_at`, `eval_ref NULL` |
| `agent_kill_switch` | `scope PK` (`global` o `role:<key>`), `on bool`, `reason`, `changed_by`, `changed_at` |
| `agent_org_policy` | `organization_id PK`, `admitted_runtimes text[]`, `non_zdr_authorized_by NULL`, `non_zdr_authorized_at NULL`, `monthly_cost_cap_usd NULL`, `allow_internal_competitive_for_service bool DEFAULT false`, `revision` |
| `agent_tool_denial` | `denial_id PK`, `run_id NULL`, `role_key`, `role_version`, `tool_name`, `layer gateway\|studio`, `reason`, `at` |

### Esquema `AgentRoleCard` v1 (campos)

`mission` · `acceptedWorkItemTypes[]` · `skills[{name, digest}]` · `tools[{name, tier, dryRunOnly}]` ·
`limits{perRunCostCapUsd, monthlyRoleCapUsd, maxTurns, maxTokens, maxDurationSec, dataProviderBudgetUsd = 0}` ·
`runtimePreferences[{provider, runtime, model}]` (ordenadas; la efectiva se registra por corrida en TASK-1915) ·
`webDomainsAllowlist[]` · `evalSetRef{key, version} | null` · `modes[]` · `deliverableTemplateRef`.

### Operaciones y tools

| operationId | Método y ruta | Tool | Nivel |
|---|---|---|---|
| `listAgentRoles` | `GET /api/v1/agent-roles` | `studio.agent_roles.list` | T0 |
| `getAgentRole` | `GET /api/v1/agent-roles/{roleKey}` | `studio.agent_role.get` | T0 |
| `createAgentRole` | `POST /api/v1/agent-roles` | `studio.agent_role.create` | T1 (restringida) |
| `upsertAgentRoleDraft` | `PUT /api/v1/agent-roles/{roleKey}/drafts/{versionNo}` | `studio.agent_role.draft.upsert` | T1 (restringida) |
| `publishAgentRoleVersion` | `POST /api/v1/agent-roles/{roleKey}/versions/{versionNo}/publish` | `studio.agent_role.publish` | T1 si endurece · T2 si relaja |
| `retireAgentRoleVersion` | `POST …/versions/{versionNo}/retire` | `studio.agent_role.retire` | T1 (restringida) |
| `enableAgentRoleMode` · `disableAgentRoleMode` | `POST /api/v1/agent-roles/{roleKey}/modes/{mode}/enable` · `…/disable` | `studio.agent_role.mode.enable` · `studio.agent_role.mode.disable` | T2 · T1 |
| `setAgentKillSwitch` | `POST /api/v1/agent-policy/kill-switch` | `studio.agent_kill_switch.set` | T1 encender · T2 apagar |
| `getAgentOrgPolicy` · `upsertAgentOrgPolicy` | `GET/PUT /api/v1/agent-policy/organizations/{organizationId}` | `studio.agent_org_policy.get` · `studio.agent_org_policy.upsert` | T0 · T1 endurecer / T2 relajar |
| `listAgentToolDenials` | `GET /api/v1/agent-policy/tool-denials` | `studio.agent_tool_denials.list` | T0 (restringida) |

### Roles iniciales

| Rol | Skill interactiva | Estado de la skill | Tipos de work item |
|---|---|---|---|
| Planificador de medios | `efeonce-agent-media-planner` | existe (alinear con tarjeta) | `media_plan` |
| SEO/AEO | `efeonce-agent-seo-aeo` | existe (alinear con tarjeta) | `seo_aeo_brief` |
| Copywriter | `efeonce-agent-copywriter` | **por crear** | `channel_copy_set` |
| QA creativo y de marca | `efeonce-agent-creative-qa` | **por crear** | `creative_brand_qa` |
| Analista de desempeño | `efeonce-agent-performance-analyst` | **por crear** | `performance_readout` |

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- TASK-1894 y TASK-1899 en producción → Slice 1 → Slice 2 → Slice 3 → Slice 4 → Slice 5 (las skills pueden redactarse en paralelo desde el Slice 1, pero se alinean con la tarjeta publicada) → Slice 6.
- Kill switch global encendido y modos `background`/`scheduled` deshabilitados hasta que TASK-1915 y TASK-1916 estén en el mismo ambiente.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un agente inducido llama una tool fuera de su rol | seguridad | medium | guarda en Studio y en el gateway, independiente del runtime | `agent_tool_denial` > 0 |
| La tarjeta y la skill interactiva divergen | gobierno | high | test de deriva en `pnpm skills:mirrors`/CI; la tarjeta manda | test rojo |
| Relajar un rol sin revisión | gobierno | medium | reglas de dirección `T1`/`T2` en el command, no en la UI | `audit_event` de publicaciones `T2` |
| Guarda del gateway con política vieja | seguridad | low | TTL corto + Studio como segunda capa siempre activa | denegaciones sólo en capa `studio` |
| Sintaxis de proveedor filtrada a la tarjeta | portabilidad | low | esquema con claves prohibidas | `422 agent_role_provider_syntax` |

### Feature flags / cutover

- `STUDIO_AGENT_ROLES_ENABLED` (Vercel de Studio; default `false`); fila en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`.
- Kill switch global como dato (no env), encendido por defecto.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slices 1–3 | flag OFF; revert PR; tablas quedan | < 15 min | sí |
| Slice 4 | revert de la guarda del gateway + dispatch; la capa Studio queda | < 30 min | sí |
| Slice 5 | tarjetas quedan en borrador o se retiran; skills revert | < 15 min | sí |
| Slice 6 | revert de capability sólo si no hay grants usados; revert del sync | < 30 min | sí |

### Production verification sequence

1. Staging: publicar las cinco tarjetas; `cardDigest` estable entre dos compilaciones.
2. Staging: llamada con contexto de corrida de prueba a tool fuera de lista ⇒ `403` en gateway y en Studio por separado.
3. Staging: `enableAgentRoleMode(background)` ⇒ `409 eval_required` mientras no exista TASK-1916.
4. Production con flag OFF → ON tras releases de Greenhouse y gateway; publicar tarjetas con revisión del operador.

### Out-of-band coordination required

- Operador revisa y aprueba las cinco tarjetas v1 y las tres skills nuevas.
- Grants de `marketing_studio.agent_role.manage` decididos por el operador el 2026-09-26 (`efeonce_admin`, `efeonce_operations`); sin coordinación pendiente.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Especialización SEO/AEO1669 usa este registry/cardDigest y conserva prohibiciones/inputs/evaluaciones de sus tres perspectivas, sin registry paralelo.
- [ ] Card SEO exige lectura canónica de prioridad/evidencia y autoridad humana para acciones mutantes/coste, no ejecución de recomendaciones stale o arbitrarias.

- [ ] Las seis tablas existen en staging y production; una versión publicada no se puede modificar.
- [ ] Una tarjeta con clave de proveedor o con una tool inexistente responde `422`; una tool con nivel menor al del registro es rechazada.
- [ ] El compilador produce el mismo `cardDigest` para la misma tarjeta y la especificación no contiene claves de proveedor.
- [ ] Publicar una versión que sube un techo o suma tools exige `dryRun` → confirmación de una persona; endurecer es `T1`.
- [ ] Una llamada con contexto de corrida a una tool fuera de la lista responde `403 agent_tool_not_allowed` en el gateway y en Studio, y deja fila en `agent_tool_denial`.
- [ ] Kill switch encendido rechaza corridas nuevas y llamadas de corridas en curso de ese rol.
- [ ] Habilitar `background` o `scheduled` sin evaluación aprobada responde `409 eval_required`.
- [ ] Cinco tarjetas v1 publicadas; cinco skills de rol existen, espejadas en `.codex`, con test de deriva verde contra su tarjeta.
- [ ] Capability `marketing_studio.agent_role.manage` con grant a `efeonce_admin` y `efeonce_operations` y cliente de canje en producción; coverage test verde.
- [ ] Manual servido con la sección «Roles de agente»; leak test verde.

## Verification

- Studio: `pnpm check` + `pnpm build`.
- Greenhouse: `pnpm local:check`, `pnpm mcp:skills:generate` + `pnpm mcp:skills:check`, `pnpm skills:mirrors`, `pnpm task:lint --task TASK-1914`.
- Gateway: tests + `pnpm surface:baseline`.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Skill `efeonce-marketing-studio` actualizada (contrato de mantenimiento) y espejada.
- [ ] `EPIC-049` refleja el estado de esta task.

## Follow-ups

- UI de roles (tarjeta, versiones, modos, kill switch, denegaciones): consumidora en TASK-1895/1912; no se crea wireframe aquí.
- Roles adicionales (p. ej. community manager, estratega de marca) como dato cuando el uso lo pida.
- Distribución de las skills de rol en el plugin de Codex/ChatGPT (TASK-1904).

## Open Questions

- ¿Cómo carga el despachador las skills referenciadas por la tarjeta? Propuesta: publicarlas como manuales servidos del catálogo de Greenhouse y leerlas por `get_greenhouse_skill` al iniciar la corrida (MCP como única vía; digest de la versión en la tarjeta). Exige que las skills de rol pasen el leak test de manuales servidos. Alternativa: paquete generado dentro de la imagen del despachador. Decide el operador con TASK-1915.
- ¿La versión de una skill es su digest de contenido o un semver en el frontmatter? Propuesta: digest (no depende de disciplina humana).
