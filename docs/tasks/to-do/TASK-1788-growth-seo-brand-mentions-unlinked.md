# TASK-1788 — Growth SEO: menciones de marca sin enlace (la señal que pesa 3× y no medimos)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
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
- Epic: `EPIC-022`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El oficio sostiene que **las menciones de marca pesan ~3× más que los backlinks para visibilidad en
motores de IA**. Acabamos de construir el detalle nominal del perfil de enlaces (`TASK-1777`) y del
otro lado no hay nada: cero código para menciones sin enlace. Esta task abre esa dimensión ampliando
el allowlist a la familia `content_analysis` de DataForSEO —que trae menciones con sentiment— por el
proceso gobernado del ADR de `EPIC-022`.

## Why This Task Exists

Off-page moderno **no es sólo links**. Un artículo que nombra a la marca sin enlazarla alimenta igual
la entidad y aparece igual en el corpus que los motores de respuesta recuperan. Medir sólo lo
enlazable es medir la parte del fenómeno que era fácil de medir en 2015.

La asimetría actual del módulo lo hace visible: para **enlaces** tenemos snapshot semanal agregado,
drill-down nominal condicionado al delta, anchors y perfil de toxicidad. Para **menciones** tenemos
cero. Y por doctrina propia, la segunda pesa más que la primera en el eje donde Efeonce diferencia.

Hay además un puente con el motor AEO que hoy no existe: una marca citada por un LLM suele estar
citada porque **aparece mencionada en fuentes que el motor recupera**. Sin la serie de menciones, la
pregunta *"¿por qué me cita/no me cita?"* sólo se puede responder con hipótesis.

⚠️ **Esta task amplía el allowlist**, lo que la hace estructuralmente más cara que sus vecinas: exige
familia nueva + migración del CHECK del ledger de gasto + entitlement, por el proceso del ADR. Eso es
deliberado — el candado existe justamente para que una familia nueva sea una decisión y no un `fetch`.

## Goal

- Familia `content_analysis` incorporada al allowlist por el **proceso gobernado completo** (registry
  + CHECK del spend ledger + delta de arquitectura + consumer con entitlement), nunca aflojando el candado.
- Serie append-only de menciones por organización: volumen, dominios que mencionan, sentiment y
  **si la mención enlaza o no** — que es la distinción entera de esta task.
- Presupuesto acotado y visible: la captura entra al mismo ledger, con su dimensión de familia.
- Reader en los tres lanes, con lente `◑` y `as-of`, y sin afirmar causalidad con las citas del grader.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` — **§6 (governance DataForSEO: el proceso de ampliación del allowlist es el corazón de esta task)**, §4.2, §5, §1.1 (boundary SEO↔AEO), §7.
- `docs/architecture/DECISIONS_INDEX.md` — el ADR de `EPIC-022`, decisión #4 (allowlist cerrado). Si la ampliación cambia la decisión, va delta de ADR.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `CLAUDE.md §"Database — Migration markers"`

Reglas obligatorias:

- 🔴 **NUNCA** aflojar `normalizeEndpoint` ni aceptar un prefijo libre del caller. La familia se agrega al registry declarativo, con prefijo fijo y `requiresOrganization: true`.
- 🔴 **La migración del CHECK de `seo_provider_spend_daily` va en el MISMO PR** que el cambio del registry TS: el test `dataforseo-family-check-parity.test.ts` rompe el build si divergen.
- **NUNCA** afirmar que una mención causó una cita del LLM. Son dos series; correlacionarlas es lectura, atribuir es una afirmación que el dato no sostiene.
- **NUNCA** cruzar `seo_*` con `grader_*` por SQL.
- **NUNCA** capturar sin `enforceSeoRunEntitlement` y sin que el transporte registre el gasto.

## Normative Docs

- `.claude/skills/seo-aeo/modules/05_OFFPAGE_AUTHORITY.md` — el oficio: menciones, digital PR, brand SERP, Reddit/UGC.
- `.claude/skills/dataforseo-operator/SKILL.md` §`Ampliar el allowlist` — los 5 pasos del proceso, todos en el mismo PR.
- `.claude/skills/dataforseo-operator/references/06-resto-catalogo.md` — Content Analysis: endpoints, costo (~USD 0,06/1.000 filas) y evaluación como candidata #2.
- `docs/tasks/to-do/TASK-1651-growth-seo-dataforseo-ai-optimization-llm-sov-foundation.md` — **el precedente vivo de una ampliación gobernada**; copiar su forma, no reinventarla.

## Dependencies & Impact

### Depends on

- `src/lib/ai/dataforseo-families.ts` — el registry declarativo que gana la familia.
- `src/lib/ai/__tests__/dataforseo-family-check-parity.test.ts` — el guard que obliga a la migración en el mismo PR.
- `greenhouse_growth.seo_provider_spend_daily` — su CHECK se amplía.
- `src/lib/growth/seo/entitlement.ts` — chokepoint de presupuesto.
- `services/ops-worker/server.ts` — runtime que puede gastar.

### Blocks / Impacts

- **`TASK-1651`** — también amplía el allowlist (familia `ai_optimization`). 🔴 **Coordinar: si ambas
  tocan `DATAFORSEO_FAMILIES` y el CHECK a la vez, van a conflictuar.** Declarar el orden en Discovery;
  la que entre segunda rebasa. No hay solape de consumer: 1651 mide menciones **en LLMs**, ésta
  menciones **en la web abierta**.
- **`TASK-1777`** (detalle de enlaces) — la contraparte enlazada. El reader de esta task debe poder
  contrastar "mencionan y enlazan" vs "mencionan y no enlazan", que es el hueco accionable de digital PR.
- **El motor AEO** — gana contexto para "por qué me citan"; sin cruzar el boundary.

### Files owned

- `src/lib/ai/dataforseo-families.ts` (aditivo)
- `migrations/<timestamp>_task-1788-content-analysis-family-and-mentions.sql`
- `src/lib/growth/seo/mentions/{capture.ts,persist.ts,reader.ts}`
- `src/lib/growth/seo/mentions/__tests__/*.test.ts`
- `services/ops-worker/server.ts` · `services/ops-worker/deploy.sh` (aditivos)
- `src/app/api/platform/ecosystem/growth/seo/brand-mentions/route.ts`
- `src/mcp/greenhouse/{tools.ts,server.ts,http-client.ts}` (aditivo)
- `docs/manual-de-uso/growth/operar-menciones-de-marca.md`

## Current Repo State

### Already exists

- Allowlist de 5 familias con `normalizeEndpoint` table-driven y breaker por familia.
- **El proceso de ampliación documentado y con precedente**: `TASK-1651` lo aplica para `ai_optimization`.
- `dataforseo-family-check-parity.test.ts`: el guard que impide que TS y el CHECK de DB diverjan.
- Ledger de gasto por `organization_id × family × spend_date`, con `get_seo_provider_spend` ya federada (`TASK-1696`).
- Patrón completo de captura semanal con gate, pre-check de frescura y degradación honesta (`TASK-1777`).

### Gap

- `grep -riE "menciones|brand_mention" src/lib/growth/` → **cero**.
- Ninguna task del backlog cubre menciones en la web abierta; `content_analysis` sólo aparece **nombrada** en `TASK-1651` como candidata adyacente, sin dueño.
- El módulo mide el eje enlazado con detalle nominal y el no-enlazado con nada.

## Modular Placement Contract

- Topology impact: `worker`
- Current home: `src/lib/growth/seo/mentions/**`, capturado por el `ops-worker`
- Future candidate home: `domain-package`
- Boundary: primitives `captureBrandMentions` y `readBrandMentions`; consumers autorizados son el worker (escritura), `api/platform/**` y la tool MCP (lectura)
- Server/browser split: transporte, secreto y stores server-only
- Build impact: `none` — reusa el transporte canónico
- Extraction blocker: el registry de familias vive en `src/lib/ai/`, compartido con el AEO: mover el dominio SEO exigiría resolver esa frontera

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `DATAFORSEO_FAMILIES` (registry), CHECK de `seo_provider_spend_daily`, tabla nueva `greenhouse_growth.seo_brand_mentions`
- Consumidores afectados: `ops-worker`, `api/platform/ecosystem`, MCP, Nexa
- Runtime target: `worker` + `production`

### Contract surface

- Contrato existente a respetar: `postDataForSeoTask` + `normalizeEndpoint`; `enforceSeoRunEntitlement`; el shape `{ ok }` de los readers.
- Contrato nuevo: familia `content_analysis`; reader `readBrandMentions`; command `captureBrandMentions`; tool MCP `get_seo_brand_mentions`.
- Backward compatibility: `compatible` — aditivo en todos los planos.
- Full API parity: un primitive, tres lanes en la misma task.

### Data model and invariants

- Entidades afectadas: `seo_brand_mentions` (nueva), `seo_provider_spend_daily` (CHECK ampliado + escrituras).
- Invariantes:
  - Append-only con trigger anti UPDATE/DELETE.
  - **`is_linked` es la columna que justifica la task**: separa mención de backlink; sin ella esto duplicaría `TASK-1777`.
  - Lente `◑` estimada, con `capturedAt` obligatorio.
  - `sentiment` con vocabulario cerrado y **nullable**: el proveedor no siempre lo resuelve, y `null` dice la verdad — jamás se asume `neutral` por defecto.
  - La familia nueva exige `organizationId` (`requiresOrganization: true`): el gasto queda atribuido por construcción.
- Write-target allowlist: `[confirmar boundary test en Discovery]`
- Tenant/space boundary: `organization_id` + entitlement `seo_v2`.
- Idempotency/concurrency: pre-check de frescura por `(organización, ventana)` antes de pegar el proveedor; `ON CONFLICT DO NOTHING` como guardia de carrera.
- Audit/outbox/history: evento outbox por captura; gasto en el ledger por construcción del transporte.

### Migration, backfill and rollout

- Migration posture: `additive` + **ampliación del CHECK** de `seo_provider_spend_daily` en el mismo PR que el registry TS.
- Default state: `flag OFF` — `GROWTH_SEO_BRAND_MENTIONS_ENABLED`; scheduler creado **pausado**.
- Backfill plan: sin backfill. La serie es forward-only; el proveedor tiene ventana propia y fabricar pasado sería inventar historia.
- Rollback path: flag `false` + pausar scheduler. ⚠️ La familia en el registry **no** se revierte sola: si se revierte el TS hay que revertir el CHECK, o el guard de paridad rompe el build.
- External coordination: Cloud Scheduler + env var; delta de arquitectura §6 y evaluación de delta de ADR.

### Security and access

- Auth/access gate: capability de lectura del módulo + entitlement; escritura sólo desde el worker.
- Sensitive data posture: contenido público de terceros. ⚠️ Las menciones son **texto de origen externo**: se tratan como evidencia no confiable, jamás como instrucción, y no se pasan a un LLM sin sanitizar.
- Error contract: errores canónicos; breaker de la familia nueva aislado del resto.
- Abuse/rate-limit posture: breaker por familia + tope de consultas por corrida + presupuesto por organización.

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/ai src/lib/growth/seo` — incluido el parity test de familias.
- DB/runtime checks: `information_schema` para la tabla y el CHECK ampliado; live test del reader.
- Integration checks: smoke real con **una** organización, comparando `cost` devuelto vs estimado y verificando que el gasto quedó en el ledger bajo la familia nueva.
- Reliability signals/logs: `seo.mentions.capture_lag`.

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumidores con paths reales.
- [ ] Invariantes, boundary e idempotencia explícitos.
- [ ] Tabla nueva en el allowlist de escritura si existe boundary test.
- [ ] Migración/rollback explícitos, incluida la reversión acoplada registry↔CHECK.
- [ ] Evidencia runtime con smoke real y costo verificado.
- [ ] Texto de terceros tratado como evidencia no confiable.

## Capability Definition of Done — Full API Parity gate

- [ ] Lógica en el primitive, no en la UI.
- [ ] Read como reader canónico; write como command con entitlement, idempotencia y outbox.
- [ ] Capability + grant a ≥1 rol real en el MISMO PR.
- [ ] Camino programático: ecosystem + MCP en esta task.
- [ ] Write apto para `propose → confirm → execute`.
- [ ] Parity check = SÍ.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Ampliación gobernada del allowlist (los 5 pasos, un solo PR)

- Familia `content_analysis` en `DATAFORSEO_FAMILIES` con prefijo `/v3/content_analysis/` y `requiresOrganization: true`.
- Migración que amplía el CHECK de `seo_provider_spend_daily`, **en el mismo PR**.
- Delta en §6 de la arquitectura; evaluar si toca delta de ADR.
- Verificar contra los límites del transporte: si algún endpoint necesario es GET-por-path, **el transporte es POST-only** y eso se resuelve antes, no después.

### Slice 2 — Tabla + captura

- Migración aditiva de `seo_brand_mentions` con `is_linked`, `sentiment` nullable bajo CHECK, append-only y bloque DO anti pre-up-marker.
- `captureBrandMentions` con gate de entitlement, pre-check de frescura y tope por corrida.
- Endpoint en `ops-worker` + scheduler **pausado** + flag.

### Slice 3 — Reader + lanes

- `readBrandMentions` con corte por `is_linked`, para responder *"quién me menciona y no me enlaza"* — el hueco accionable de digital PR.
- Route ecosystem + tool MCP + capability con grant en el mismo PR.

### Slice 4 — Evidencia, señal y cierre

- Smoke real con una organización, costo verificado contra el estimado.
- Signal `seo.mentions.capture_lag`; runbook; deltas de arquitectura; ledger de flags.

## Out of Scope

- **Menciones dentro de respuestas de LLM** — es `TASK-1651` (familia `ai_optimization`, LLM Mentions). Ejes distintos: web abierta vs corpus de motores.
- **Afirmar que una mención causó una cita.** Correlación, no causalidad.
- **Digital PR / outreach.** Esta task mide; contactar es trabajo de delivery.
- **Superficie visible** — task `ui-ux` posterior.
- **Reviews y GBP** (`business_data`) — sigue fuera del allowlist por decisión declarada.
- **Aflojar el candado del allowlist.** El proceso se respeta completo o no se hace.

## Detailed Spec

### 1. `is_linked` es la columna que justifica la task entera

Sin ella, esta serie sería un duplicado peor de `TASK-1777`. Con ella responde la pregunta que hoy
nadie puede responder: **quién habla de la marca y no la enlaza**. Ese conjunto es la lista de
objetivos de digital PR mejor calificada que existe — ya te nombran, sólo falta el enlace — y no
requiere ninguna prospección.

### 2. Por qué esta task es `backend-critical` aunque parezca una captura más

Porque amplía el allowlist. El candado de familias es la defensa que impide que un bug de composición
se convierta en una llamada a un endpoint no previsto (riesgo §13.3 de la arquitectura). Tocarlo exige
el proceso completo, y el guard de paridad TS↔CHECK convierte en error de build cualquier atajo.

### 3. `sentiment` nullable, y por qué no se asume `neutral`

El proveedor no siempre resuelve sentiment. Escribir `neutral` por defecto inventa una clasificación
que nadie hizo e infla el conteo de menciones neutras — el mismo error que el `intent` de
`seo_keyword_set_members` evita siendo nullable sin backfill. `null` dice la verdad y obliga al reader
a tratarlo explícito.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- 🔴 Slice 1 es indivisible: registry TS + CHECK de DB + delta de arquitectura **en el mismo PR**. Partirlo rompe el build por el parity test, que es exactamente su función.
- Slice 2 → Slice 3 → Slice 4.
- Flag y scheduler se prenden en Slice 4, tras el smoke real.
- 🔴 Coordinar con `TASK-1651` antes de empezar: ambas tocan `DATAFORSEO_FAMILIES` y el mismo CHECK.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Conflicto con `TASK-1651` sobre el registry y el CHECK | integración | **high** | Declarar orden en Discovery; la segunda rebasa; ambas usan el mismo proceso | Merge conflict en `dataforseo-families.ts` |
| Se amplía el allowlist sin la migración del CHECK y el build queda rojo o, peor, divergen | data quality | medium | El parity test existe para esto; Slice 1 indivisible | `dataforseo-family-check-parity.test.ts` en rojo |
| La captura gasta más de lo previsto por consultar sin tope | provider budget | medium | Tope por corrida, gate de entitlement con estimado del batch, smoke con una org antes de la cartera | Alza en el ledger para la familia nueva |
| Texto de terceros llega a un LLM sin sanitizar | seguridad | medium | Tratado como evidencia no confiable por contrato; sin paso a LLM en esta task | Revisión de imports en el PR |
| Se presenta la correlación mención↔cita como causa | credibilidad | medium | Contrato sin campo de atribución; declarado en `Out of Scope` | Informe que afirma causalidad |
| Un endpoint necesario es GET-por-path y el transporte es POST-only | integración | medium | Verificado en Slice 1 antes de construir | Respuesta 404/405 del proveedor |

### Feature flags / cutover

`GROWTH_SEO_BRAND_MENTIONS_ENABLED` (default `false`), subordinado a `GROWTH_SEO_ENABLED`, leído
**sólo en el ops-worker**. Declarar en `deploy.sh` **y** aplicar con `--update-env-vars`. Fila en el
ledger. ⚠️ El flag apaga la captura, **no** revierte la familia del allowlist: eso exige revertir TS y
CHECK juntos.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert del PR completo (TS **y** migración juntos, o el parity test rompe) | < 20 min | sí |
| Slice 2 | Flag `false` + pausar scheduler; `migrate:down` de la tabla | < 15 min | sí |
| Slice 3 | Revert de rutas + retirar tool del MCP | < 10 min | sí |
| Slice 4 | Retirar la señal | < 5 min | sí |

### Production verification sequence

1. `migrate:up` + verificar por `information_schema` la tabla, su CHECK de `sentiment` y el CHECK ampliado del ledger.
2. `pnpm vitest run src/lib/ai` — el parity test de familias debe pasar.
3. Deploy del worker con flag `false`; crons vigentes verdes.
4. Flag `true` en la revisión activa; capturar **una** organización; comparar `cost` vs estimado.
5. Verificar que el gasto quedó en `seo_provider_spend_daily` bajo la familia nueva.
6. Re-capturar dentro de la ventana de frescura: coste USD 0.
7. Despausar el scheduler.

### Out-of-band coordination required

- Coordinación explícita con `TASK-1651` sobre el orden de ampliación del allowlist.
- Cloud Scheduler + env var en el Cloud Run del ops-worker.
- Confirmar con el operador el tope de gasto por corrida antes del primer ciclo de cartera.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] La familia `content_analysis` está en el registry con prefijo fijo y `requiresOrganization: true`; `normalizeEndpoint` sigue rechazando prefijos libres.
- [ ] El CHECK de `seo_provider_spend_daily` se amplió **en el mismo PR** y el parity test pasa.
- [ ] `seo_brand_mentions` es append-only, con `is_linked` y `sentiment` nullable bajo CHECK cerrado.
- [ ] Una mención sin sentiment resuelto se guarda `null`, **nunca** `neutral`.
- [ ] `readBrandMentions` puede responder "quién menciona y no enlaza".
- [ ] El smoke real registró el gasto en el ledger bajo la familia nueva y el `cost` coincide con el estimado dentro del margen declarado.
- [ ] Re-capturar dentro de la ventana de frescura cuesta USD 0.
- [ ] No existe JOIN, VIEW ni FK entre esta tabla y `grader_*`.
- [ ] El contrato no tiene campo de atribución causal.
- [ ] El texto de terceros se trata como evidencia no confiable y no se pasa a ningún LLM en esta task.
- [ ] El flag tiene fila en el ledger y `pnpm docs:closure-check` pasa.

## Verification

- `pnpm local:check`
- `pnpm vitest run src/lib/ai src/lib/growth/seo`
- `pnpm test` (gate de cierre)
- `pnpm migrate:status` + verificación por `information_schema`
- Smoke real contra DataForSEO con una organización

## Closing Protocol

- [ ] `Lifecycle` sincronizado con el estado real
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] impacto cruzado sobre `TASK-1651`, `TASK-1777` y el motor AEO
- [ ] delta en `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §6 (familia nueva) y §3
- [ ] evaluado si corresponde delta de ADR sobre la decisión #4 de `EPIC-022`
- [ ] runbook creado

## Follow-ups

- Lectura compuesta menciones × citas del grader (en memoria, respetando §1.1).
- Cruce menciones × backlinks para la lista priorizada de digital PR.
- Evaluar Reddit/UGC como fuente específica, que el oficio destaca para visibilidad IA.

## Open Questions

- ¿Qué endpoints concretos de `content_analysis` se integran en V1? El Slice 1 los fija tras verificar los límites del transporte.
- ¿Cuál es el tope de gasto por corrida? Decisión del operador antes del primer ciclo de cartera.
- ¿Esta task o `TASK-1651` amplía el allowlist primero? Decisión de secuencia, no técnica.
