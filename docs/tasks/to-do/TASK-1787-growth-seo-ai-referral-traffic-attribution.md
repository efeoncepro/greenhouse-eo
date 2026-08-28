# TASK-1787 — Growth: el tráfico que llega DESDE los motores de IA (cerrar el bucle del AEO)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
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
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El módulo mide **si te citan** los motores de respuesta y **no mide si esa cita te trae gente**. No
hay una sola línea que lea los referrals de `chatgpt.com`, `perplexity.ai`, `gemini.google.com` o
`copilot.microsoft.com`. Esta task cierra la mitad de abajo del embudo AEO leyendo GA4 —que ya está
conectado— y materializando una serie propia de tráfico atribuible a IA, por organización y por
motor.

## Why This Task Exists

**La tesis del módulo es que el juego pasó de rankear #1 a ser la fuente citada.** Todo el motor AEO
existe para medir la primera mitad de esa frase. La segunda mitad —qué pasa *después* de la cita— no
se mide en ninguna parte.

Consecuencia comercial concreta: hoy podemos decirle a un cliente *"te citan en el 40% de los
prompts"* y no podemos decirle qué obtuvo por eso. Es el argumento que más le cuesta creer a un CFO,
y es justo el que no tenemos. Peor: tampoco podemos detectar el caso inverso —**citas que suben y
tráfico que no**— que es la señal de que la cita se está sirviendo sin click, exactamente el fenómeno
que la industria mide como *zero-click*.

**Por qué ahora y por qué barato.** El cliente GA4 ya existe (`src/lib/growth/ga4/`), la conexión por
service account está resuelta y el módulo ya materializa series diarias con el mismo patrón
(`seo_gsc_daily`). Esto no es una integración nueva: es una consulta de referrals sobre una fuente ya
conectada, materializada con un patrón que el repo ya sabe operar.

## Goal

- Serie diaria propia de sesiones/usuarios atribuibles a motores de IA, por organización y por motor,
  con la misma disciplina append-only del resto del módulo.
- Vocabulario **cerrado y versionado** de motores: un host nuevo no se cuela como "otros", entra por
  decisión.
- Lente `●` **medida** — es GA4, dato de primera parte del cliente — y por eso **nunca** se promedia
  con las estimaciones de mercado.
- Reader expuesto en los tres lanes, con degradación honesta cuando la organización no tiene GA4
  conectado (`no_ga4_connection`, un estado, no un cero).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` — §3 (capa medición), §4.2 (el patrón de `seo_gsc_daily`: serie diaria anclada a `organization_id`, trigger no-delete porque la fuente consolida tarde), §5 (contrato ●/◑), §1.1 (boundary SEO↔AEO: el cruce es en memoria, jamás JOIN/VIEW/FK).
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — el lado de las citas, que esta task complementa **sin** cruzar el boundary.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `CLAUDE.md §"Database — Migration markers"` y §`SQL embebido — type alignment + live testing`

Reglas obligatorias:

- 🔴 **NUNCA** JOIN, VIEW ni FK entre esta serie y las tablas `grader_*`. El cruce "citas vs tráfico" se compone **en memoria por `organization_id`**, como manda §1.1.
- **NUNCA** promediar esta serie (`●`) con estimaciones de mercado (`◑`).
- **NUNCA** clasificar un host desconocido como un motor conocido: entra a `other` y queda visible para decisión.
- **NUNCA** afirmar causalidad. Esta serie mide **correlación temporal** entre citas y tráfico; el contrato lo dice explícitamente.
- **SIEMPRE** trigger no-delete y no anti-UPDATE: GA4 consolida con retraso y el re-run del mismo día debe poder corregir.

## Normative Docs

- `.claude/skills/seo-aeo/modules/07_MEASUREMENT.md` — el oficio: GSC/GA4/BigQuery + SoV IA + **tráfico IA**.
- `.claude/skills/greenhouse-gtm-ga4-operator/SKILL.md` `[confirmar path]` — conexión GA4 por service account.
- `docs/manual-de-uso/growth/backfill-historico-gsc.md` — el patrón de backfill de una serie diaria, replicable acá.

## Dependencies & Impact

### Depends on

- `src/lib/growth/ga4/{api-client.ts,contracts.ts}` — el cliente GA4 ya existente.
- `greenhouse_growth.seo_gsc_daily` — **precedente de diseño** (serie diaria anclada a `organization_id`, trigger no-delete), no dependencia de código.
- `src/lib/growth/seo/gsc-daily-materializer.ts` + `gsc-history-bq-mirror.ts` — el patrón de materializador + espejo BQ a replicar.
- `services/ops-worker/server.ts` — el runtime del batch diario.

### Blocks / Impacts

- **El motor AEO** — gana su contraparte de resultado. Sin cruzar el boundary: composición en memoria.
- **`TASK-1785`** — esta serie es `●` medida y debe emitir su lente por el mismo campo; coordinar el tipo.
- **`TASK-1284`** (`growth-ga4-multitenant-connection-signal`) — es el carril de **conexión** GA4 multi-tenant; esta task **consume** esa conexión, no la construye. Declarar dependencia en Discovery y no duplicar el resolver de credenciales.

### Files owned

- `migrations/<timestamp>_task-1787-ai-referral-daily.sql`
- `src/lib/growth/seo/ai-referral/{engines.ts,materializer.ts,reader.ts,bq-mirror.ts}`
- `src/lib/growth/seo/ai-referral/__tests__/*.test.ts`
- `services/ops-worker/server.ts` (aditivo) · `services/ops-worker/deploy.sh` (aditivo)
- `src/app/api/platform/ecosystem/growth/seo/ai-referral/route.ts`
- `src/mcp/greenhouse/{tools.ts,server.ts,http-client.ts}` (aditivo)
- `docs/manual-de-uso/growth/operar-trafico-desde-motores-ia.md`

## Current Repo State

### Already exists

- Cliente GA4 (`src/lib/growth/ga4/api-client.ts`) y el carril de conexión multi-tenant (`TASK-1284`).
- Patrón completo de serie diaria: `seo_gsc_daily` + materializador + espejo BQ + backfill resumible + split de lectura por cobertura (PG caliente / BQ histórico).
- Motor AEO midiendo citas por motor, con `grader_*` y su boundary declarado.
- Patrón de cron diario en `ops-worker` con flag subordinado.

### Gap

- `grep -riE "chatgpt.com|perplexity.ai|ai_referral|ai_traffic" src/lib/growth/` → **cero**.
- Ninguna task del backlog cubre la superficie: el barrido por `referral`/`referrer` no devolvió nada.
- El módulo puede decir "te citan" y no "qué obtuviste", que es la mitad que paga la factura.

## Modular Placement Contract

- Topology impact: `worker`
- Current home: `src/lib/growth/seo/ai-referral/**`, materializado por el `ops-worker` y leído desde el portal
- Future candidate home: `domain-package`
- Boundary: primitives `materializeAiReferralDaily` y `readAiReferralTraffic`; consumers autorizados son el worker (escritura), `api/platform/**` y la tool MCP (lectura)
- Server/browser split: credenciales GA4 y stores server-only
- Build impact: `none` — reusa el cliente GA4 existente
- Extraction blocker: FK a la organización canónica, el mismo acople deliberado del resto de EPIC-022

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: tabla nueva `greenhouse_growth.seo_ai_referral_daily` + espejo BQ
- Consumidores afectados: `ops-worker`, `api/platform/ecosystem`, MCP, Nexa
- Runtime target: `worker` + `production`

### Contract surface

- Contrato existente a respetar: el cliente GA4 y el resolver de conexión de `TASK-1284`; el shape `{ ok }` de los readers.
- Contrato nuevo: reader `readAiReferralTraffic`; command `materializeAiReferralDaily`; tool MCP `get_seo_ai_referral_traffic`.
- Backward compatibility: `compatible` — todo aditivo.
- Full API parity: un primitive, tres lanes en la misma task.

### Data model and invariants

- Entidades afectadas: `greenhouse_growth.seo_ai_referral_daily` (nueva), `greenhouse_growth_analytics.seo_ai_referral_history` (espejo BQ).
- Invariantes:
  - **Anclada a `organization_id`**, no a `seo_target_id` — misma razón que `seo_gsc_daily`: GA4 entrega por propiedad, y el target tiene grano más fino (`location_code`+`language_code`) que GA4 no particiona.
  - UNIQUE `(organization_id, capture_date, engine)`.
  - **Trigger no-delete, NO anti-UPDATE**: GA4 consolida tarde y el re-run del mismo día corrige.
  - `engine` con **CHECK de vocabulario cerrado**; un host desconocido cae en `other` y queda contable, jamás se fuerza a un motor conocido.
  - Lente siempre `measured`: es dato de primera parte del cliente.
- Write-target allowlist: `[confirmar boundary test en Discovery]`
- Tenant/space boundary: `organization_id` + entitlement `seo_v2`; la credencial GA4 se resuelve por organización.
- Idempotency/concurrency: UPSERT por la clave única; re-correr un día es idempotente y corrige.
- Audit/outbox/history: evento outbox `seo.ai_referral.day_materialized`; espejo BQ como paso del batch (no outbox), igual que el carril GSC.

### Migration, backfill and rollout

- Migration posture: `additive` — tabla, índices, trigger, GRANT.
- Default state: `flag OFF` — `GROWTH_SEO_AI_REFERRAL_ENABLED`; scheduler creado **pausado**.
- Backfill plan: GA4 conserva histórico; backfill resumible **directo a BQ**, sin escribir PG — exactamente el patrón de `gsc-backfill.ts`, que existe para no meter el pasado en la tabla caliente.
- Rollback path: flag `false` + pausar el scheduler. Las filas quedan: son mediciones.
- External coordination: Cloud Scheduler nuevo + env var en `deploy.sh` y `--update-env-vars`.

### Security and access

- Auth/access gate: lectura por `organization_id` + entitlement; escritura sólo desde el worker.
- Sensitive data posture: **sin PII**. Se materializan agregados por día/motor; jamás identificadores de usuario ni `clientId` de GA4.
- Error contract: `no_ga4_connection` como estado explícito; errores canónicos.
- Abuse/rate-limit posture: cuotas de la GA4 Data API — respetar el batching y no consultar por día suelto en un loop.

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/growth/seo`.
- DB/runtime checks: `information_schema` para tabla/índice/trigger/CHECK; live test del reader contra PG real (`runGreenhousePostgresQuery` devuelve **array pelado**).
- Integration checks: materializar un día real de una organización **con** GA4 conectado y verificar que otra **sin** conexión devuelve `no_ga4_connection` y no cero.
- Reliability signals/logs: `seo.ai_referral.materialization_lag` (días sin materializar para orgs con GA4; steady = 0).

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumidores con paths reales.
- [ ] Invariantes, tenant boundary e idempotencia explícitos.
- [ ] Tabla nueva declarada en el allowlist de destinos de escritura si existe boundary test.
- [ ] Migración/backfill/rollback explícitos.
- [ ] Evidencia runtime listada, incluido el caso sin GA4.
- [ ] Cero PII y errores canónicos.

## Capability Definition of Done — Full API Parity gate

- [ ] Lógica en el primitive, no en la UI.
- [ ] Read como reader canónico; write como command idempotente con outbox.
- [ ] Capability + grant a ≥1 rol real en el MISMO PR.
- [ ] Camino programático: ecosystem + MCP en esta task.
- [ ] Un primitive, muchos consumers.
- [ ] Parity check = SÍ.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Vocabulario de motores, cerrado y versionado

- `engines.ts`: mapa host → motor, con vocabulario cerrado (`chatgpt`, `perplexity`, `gemini`,
  `copilot`, `claude`, `other`) y su CHECK en DB.
- 🔴 Un host desconocido va a `other` **con el host preservado** para poder decidir después. Nunca se
  asigna por parecido.
- Tests de tabla con los hosts y variantes reales conocidos.

### Slice 2 — Tabla + materializador diario

- Migración aditiva con clave única, trigger **no-delete**, índices y GRANT, más bloque DO anti pre-up-marker.
- `materializeAiReferralDaily`: consulta GA4 por organización, agrega por día y motor, UPSERT idempotente.
- Endpoint en `ops-worker` + scheduler diario **pausado** + flag.

### Slice 3 — Espejo BQ + backfill del pasado

- Mirror por día materializado, reportando `mirror_failed` en el outcome (nunca divergencia silenciosa).
- Runner de backfill resumible **directo a BQ**, con `--dry-run` por defecto.

### Slice 4 — Reader + lanes + capability

- `readAiReferralTraffic({ organizationId, range, engine? })` con `no_ga4_connection` explícito.
- Route ecosystem + tool MCP + capability con grant en el mismo PR.
- La descripción de la tool declara que la serie es `●` medida y **no comparable punto a punto** con las estimaciones de mercado.

### Slice 5 — Evidencia, señal y cierre

- Materialización real de un día para una organización con GA4; caso negativo verificado.
- Signal `seo.ai_referral.materialization_lag`.
- Delta en §3 y §4.2 de la arquitectura, runbook, `Handoff.md`, `changelog.md`, ledger de flags.

## Out of Scope

- **Afirmar causalidad entre cita y visita.** Esta task materializa dos series; correlacionarlas es lectura, y atribuir causa es una afirmación que el dato no sostiene.
- **Cruzar `seo_*` con `grader_*` en SQL.** Prohibido por §1.1; la composición es en memoria.
- **Construir la conexión GA4 multi-tenant** — es `TASK-1284`.
- **Superficie visible** — task `ui-ux` posterior.
- **Tráfico de IA en el sitio público de Efeonce** — pertenece a `EPIC-019`.
- **Detección de agentes/crawlers de IA en logs de servidor.** Es otra fuente (server logs, no GA4) y otra task.

## Detailed Spec

### 1. Por qué `other` con el host preservado es load-bearing

El panorama de motores cambia cada trimestre. Un vocabulario cerrado que no deje escapatoria obliga a
clasificar mal; uno abierto convierte cualquier referral en un "motor de IA" y contamina la serie.

La salida es `other` **conservando el host**: la fila es contable, la serie no se contamina, y cuando
un host aparece repetidamente alguien decide si merece su propio valor de enum. Es el mismo criterio
del `source` cerrado de `seo_keyword_set_members`: si el motor sólo entiende N valores, que el schema
los enumere y un valor nuevo entre **por decisión**, no por accidente.

### 2. Por qué se ancla a la organización y no al target

Idéntico razonamiento que `seo_gsc_daily`, ya aceptado en §4.2: GA4 entrega por **propiedad**, y
`seo_targets` tiene grano más fino (`location_code` + `language_code`) que GA4 no particiona. FKear al
target obligaría a asignar cada fila arbitrariamente a uno de varios targets posibles.

### 3. Correlación, no causalidad — y el contrato lo dice

El uso natural de esta serie es cruzarla con las citas del grader: *"subieron las citas y subió el
tráfico"*. Eso es **correlación temporal** y hay que decirlo así. Un cliente citado que no gana
tráfico puede estar sirviendo respuestas zero-click, que es información valiosa y **no** un fracaso
del trabajo. Presentar la correlación como causa sería el mismo pecado que promediar `●` con `◑`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (vocabulario) → Slice 2 (tabla, cuyo CHECK depende del vocabulario).
- Slice 3 y Slice 4 pueden correr en paralelo tras Slice 2.
- Slice 5 al final; el flag y el scheduler se prenden ahí, tras la materialización real.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un host nuevo se clasifica como motor conocido y contamina la serie | data quality | medium | `other` con host preservado; CHECK cerrado; tests de tabla | Salto inexplicable en un motor |
| La serie se cruza con `grader_*` por SQL y se rompe el boundary §1.1 | arquitectura | medium | Regla dura + revisión de imports; el cruce es en memoria | JOIN entre `seo_*` y `grader_*` en un PR |
| Se presenta la correlación como causalidad en un informe a cliente | credibilidad | **high** | El contrato y la descripción de la tool lo declaran; sin campo de "atribución" | Informe que afirma que la cita causó las visitas |
| Meter el histórico en la tabla caliente y repetir el problema de peso de `seo_gsc_daily` | runtime / costo | medium | Backfill **directo a BQ**, replicando `gsc-backfill.ts` | Crecimiento de la tabla PG |
| Cuotas de la GA4 Data API al materializar toda la cartera | integración | medium | Batching por organización; sin loop por día suelto | Errores de cuota en el worker |
| Una org sin GA4 devuelve 0 en vez de estado | credibilidad | medium | `no_ga4_connection` explícito y test del caso | Cliente viendo 0 visitas donde no hay medición |

### Feature flags / cutover

`GROWTH_SEO_AI_REFERRAL_ENABLED` (default `false`), subordinado a `GROWTH_SEO_ENABLED`, leído **sólo
en el ops-worker**. Declarar en `deploy.sh` **y** aplicar con `--update-env-vars`. Fila en el ledger.
Cutover: flag `true` + despausar el scheduler.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert PR — módulo puro | < 5 min | sí |
| Slice 2 | `migrate:down` + flag `false` + pausar scheduler | < 10 min | sí |
| Slice 3 | Revert PR; las filas BQ escritas quedan como mediciones | < 10 min | parcial |
| Slice 4 | Revert de rutas + retirar tool del MCP | < 10 min | sí |
| Slice 5 | Retirar la señal | < 5 min | sí |

### Production verification sequence

1. `migrate:up` + verificación por `information_schema` de tabla, CHECK de `engine` y trigger no-delete.
2. Deploy del worker con flag `false`; los crons vigentes siguen verdes.
3. Flag `true` en la revisión activa; materializar **un día** de una organización con GA4.
4. Re-materializar el mismo día: debe corregir, no duplicar (el trigger permite UPDATE a propósito).
5. Verificar una organización **sin** GA4: `no_ga4_connection`, no cero.
6. Despausar el scheduler; señal en 0 tras un ciclo.

### Out-of-band coordination required

- Cloud Scheduler nuevo + env var en el Cloud Run del ops-worker.
- Confirmar con `TASK-1284` el resolver de credenciales GA4 por organización, para no duplicarlo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `engine` tiene CHECK de vocabulario cerrado y un host desconocido cae en `other` **conservando el host**.
- [ ] La tabla se ancla a `organization_id`, con UNIQUE `(organization_id, capture_date, engine)` y trigger **no-delete** que permite UPDATE.
- [ ] Re-materializar el mismo día corrige el valor y no duplica filas.
- [ ] Una organización sin GA4 devuelve `no_ga4_connection`; **nunca** 0.
- [ ] La serie viaja con lente `measured` y el contrato declara que no es comparable punto a punto con las estimaciones de mercado.
- [ ] No existe ningún JOIN, VIEW ni FK entre esta tabla y `grader_*`.
- [ ] El contrato **no** tiene campo de atribución causal.
- [ ] El backfill escribe **sólo** a BigQuery y es resumible.
- [ ] Cero PII en la tabla: sólo agregados por día y motor.
- [ ] La tool MCP responde por el lane ecosystem con canary verde en staging.
- [ ] El flag tiene fila en el ledger y `pnpm docs:closure-check` pasa.

## Verification

- `pnpm local:check`
- `pnpm vitest run src/lib/growth/seo`
- `pnpm test` (gate de cierre)
- `pnpm migrate:status` + verificación por `information_schema`
- Live test del reader contra PG real
- Materialización real de un día + caso sin GA4

## Closing Protocol

- [ ] `Lifecycle` sincronizado con el estado real
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] impacto cruzado sobre `TASK-1284`, `TASK-1785` y el motor AEO
- [ ] delta en `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §3 y §4.2
- [ ] runbook creado

## Follow-ups

- Lectura compuesta citas × tráfico (en memoria, respetando §1.1) como task aparte.
- Detección de crawlers/agentes de IA en logs de servidor: otra fuente, otra task.
- Evaluar si el zero-click gap (citas altas con tráfico plano) merece su propia señal.

## Open Questions

- ¿Qué métrica de GA4 es la canónica: sesiones, usuarios activos o ambas? Propuesta: ambas, decidido en el contrato y no por el consumer.
- ¿Se materializa también la landing de entrada, o sólo el agregado por motor? El agregado primero; la landing multiplica filas y puede ser follow-up.
