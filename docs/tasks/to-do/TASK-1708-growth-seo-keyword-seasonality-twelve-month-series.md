# TASK-1708 — Estacionalidad: persistir la serie de 12 meses que ya viene en `keyword_info`

## Delta 2026-08-27

- El transporte `postDataForSeoTask` ahora **exige** `consumer`: la captura de la serie declara
  `consumer: 'seo'` — cambiado por TASK-1696.
- El ledger ganó `consumer`, `cost_basis` y `price_table_version`, y su clave única pasó a seis
  columnas `NULLS NOT DISTINCT` — cambiado por TASK-1696. La verificación «el gasto no subió» sigue
  siendo válida, pero se lee por `(consumer, family, cost_basis)`, no por familia sola.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Bajo`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `migration`
- Epic: `EPIC-022`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|seo`
- Blocked by: `TASK-1699`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

DataForSEO entrega la serie mensual de 12 meses **dentro del mismo `keyword_info` que ya se compra y
ya se paga**. Hoy se lee `search_volume` y se guarda como **escalar plano**
(`src/lib/growth/seo/keyword-market-data.ts:334`, columna `search_volume INTEGER` de
`seo_keyword_market_data`); la serie se descarta en la frontera del proveedor.

Esta task la persiste. Costo incremental: **USD 0**. Misma doctrina que `TASK-1699`: no tires lo que
ya pagaste.

## Why This Task Exists

Sin la serie, dos preguntas del oficio quedan sin respuesta y una decisión se toma mal.

**Primera: "¿qué escribo en agosto para el pico de noviembre?"** No tiene respuesta posible con un
escalar. Es la pregunta que ordena un calendario editorial y hoy el módulo no la puede contestar.

**Segunda, y es la que cuesta plata: una keyword capturada en su valle se descarta para siempre por
"poco volumen".** El escalar que se guarda es el promedio del período que el proveedor reporta; en
un mercado estacional, capturar en el mes equivocado produce un número que subrepresenta la demanda
real, y el candidato queda descartado sin que nadie sepa que fue por el mes de captura.

**El dato ya está pagado.** El comentario de la propia migración lo dice: el append-only existe
porque *"el histórico de volumen queda como señal"* y *"es la única señal de estacionalidad que
tiene el módulo"* (`migrations/20260813171143226_task-1661-keyword-market-data.sql`). Pero ese
histórico se construye a razón de **una captura por mes** — reconstruir 12 meses de estacionalidad
así toma un año, cuando el proveedor los entrega completos en cada respuesta.

**Distinguir de `TASK-1655`, porque no son lo mismo y ninguna sustituye a la otra:**

| | `TASK-1655` — Historical Data Platform | Esta task |
|---|---|---|
| Qué es | **nuestro** histórico: GSC + rank capture | la **curva de demanda del mercado** |
| De dónde sale | lo que nosotros medimos, día a día | lo que el proveedor estima del mercado entero |
| Qué responde | "¿cómo nos fue?" | "¿cuándo busca la gente?" |
| Cobertura | sólo lo que ya rankeamos o seguimos | cualquier keyword, incluso una que nunca tocamos |

Una keyword que nunca seguimos no tiene histórico nuestro y **sí** tiene curva de mercado. Confundir
ambas llevaría a creer que 1655 ya cubre esto: no lo cubre.

## Goal

- La serie mensual de 12 meses que ya viene en `keyword_info` se persiste junto con la captura, sin
  una sola llamada extra al proveedor.
- El reader expone la curva y sus derivados (mes pico, mes valle, si la captura vigente cayó en
  valle) con `null` honesto cuando el proveedor no la entregó.
- La captura se entrega **sola** y rinde sola: alimenta un calendario editorial sin depender de nada
  más.
- La estacionalidad **como input del ordenamiento** queda declarada como contrato, y se conecta con
  la cola priorizada, no acá.

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
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` (§3 de dónde salen volumen y
  dificultad, §7 spend guard, §17)
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md`
- `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md`
- `.claude/rules/growth-seo.md`

Reglas obligatorias:

- **Skill mandatoria `dataforseo-operator`** al tocar cualquier llamada al proveedor.
- **`seo_keyword_market_data` es append-only y multi-productor.** El trigger
  `trg_seo_keyword_market_data_append_only` prohíbe UPDATE y DELETE. **NUNCA abrir un segundo
  almacén del mismo hecho estimado**: la serie viaja con la captura, en la misma tabla y la misma
  fila, no en una tabla paralela.
- **`NULL` ≠ `0` ≠ fila ausente.** Son tres estados distintos: fila ausente = nunca preguntamos ·
  serie `NULL` = preguntamos y el proveedor no la entregó · valor 0 en un mes = el proveedor dice
  demanda cero ese mes. Colapsarlos es el error que la propia migración documenta.
- **Cero costo incremental.** La serie viene inline en la respuesta ya pagada. Si algún camino
  exigiera una llamada extra, queda fuera de esta task.
- **La captura respeta el pre-check de FRESCURA, no de existencia.** `MARKET_DATA_FRESHNESS_DAYS=30`:
  repetir la corrida dentro del mismo ciclo debe costar CERO. Esta task no cambia esa disciplina.
- **Migraciones con marker `-- Up Migration` exacto** y bloque `DO $$ … RAISE EXCEPTION` de
  verificación post-DDL. Sin eso, la migración se registra como aplicada sin haber ejecutado el SQL.
- **Todo reader nuevo del dominio expone su MCP tool en el MISMO PR** (mandato del dominio). Si esta
  task sólo enriquece un reader existente, su tool se actualiza en el mismo PR.

## Normative Docs

- `docs/audits/platform/2026-08-15-growth-seo-aeo-module-opportunity-audit.md` (§3.1 S3, §2.1
  economía del stack)
- `docs/tasks/complete/TASK-1661-growth-seo-keyword-market-data-capability.md` (contrato de la
  tabla y de la captura mensual)
- `docs/tasks/in-progress/TASK-1655-growth-seo-historical-data-platform.md` (el histórico NUESTRO —
  eje distinto, no sustituto)
- `.claude/skills/dataforseo-operator/SKILL.md` y sus `references/`

## Dependencies & Impact

### Depends on

- `TASK-1699` — misma doctrina: no tires lo que ya pagaste. Comparte el criterio de persistir la
  capacidad ya comprada en vez de re-comprarla, y conviene que su contrato aterrice primero para no
  divergir en la forma de guardar payload ya pagado. `[verificar]` — al 2026-08-15 el archivo no
  existe todavía en `docs/tasks/`; confirmar durante Discovery y, si sigue ausente, esta task puede
  avanzar sola (su dependencia es de doctrina, no técnica).
- `src/lib/growth/seo/keyword-market-data.ts` — normalizador de la respuesta del proveedor
  (`keyword_info` en `:275`, `search_volume` en `:334`) y writer de la tabla (`:459`).
- `greenhouse_growth.seo_keyword_market_data` — tabla append-only existente
  (`migrations/20260813171143226_task-1661-keyword-market-data.sql:46`).
- `src/lib/growth/seo/keyword-market-data-batch.ts` — ciclo mensual en el ops-worker
  (`ops-seo-keyword-market-data`, flag `GROWTH_SEO_KEYWORD_MARKET_DATA_ENABLED`).

### Blocks / Impacts

- La cola priorizada del módulo (aggregate `seo_work_queue_*`): la estacionalidad como **input del
  ordenamiento** se conecta ahí, con su `priority_score_version`. Esta task entrega el dato; la cola
  decide qué hacer con él.
- `TASK-1662` y el discovery (`TASK-1664`) escriben en la MISMA tabla con el `keyword_info` que ya
  viene inline en SUS respuestas: si la serie se agrega como columna, esos productores también deben
  poblarla o dejarla `NULL` honesto. Se declara en el contrato.
- El calendario editorial (`TASK-1667`) gana su primer insumo de timing real.
- `TASK-1655` — **no se solapa**. Se documenta la frontera para que nadie las funda.

### Files owned

- `migrations/` — una migración aditiva
- `src/lib/growth/seo/keyword-market-data.ts`
- `src/lib/growth/seo/keyword-market-data-batch.ts`
- `src/lib/growth/seo/contracts.ts`
- `src/lib/growth/seo/__tests__/`
- `src/types/db.d.ts` (regenerado)
- `src/mcp/greenhouse/tools.ts` (actualización de la tool existente del reader)
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md`
- `docs/documentation/` y `docs/manual-de-uso/` — delta proporcional

## Current Repo State

### Already exists

- `src/lib/growth/seo/keyword-market-data.ts:275` — tipo del `keyword_info` de la respuesta, con
  `search_volume?: number | null`. La serie mensual **no está tipada** ahí.
- `:334` — `searchVolume: asNonNegativeInt(info.search_volume)`. Es exactamente el punto donde la
  serie se descarta.
- `:459` — INSERT con `search_volume, keyword_difficulty, competition, competition_level, cpc_usd, …`.
- `migrations/20260813171143226_task-1661-keyword-market-data.sql:46` — tabla con
  `search_volume INTEGER CHECK (… >= 0)`, `UNIQUE (normalized_keyword, location_code, language_code,
  capture_date)`, trigger append-only, y comentario explícito de que el append-only existe porque el
  histórico es *"la única señal de estacionalidad que tiene el módulo"*.
- Ciclo mensual en el ops-worker con pre-check de frescura (`MARKET_DATA_FRESHNESS_DAYS=30`) y el
  patrón de tres estados (fila ausente / NULL / 0) ya implementado y probado contra el proveedor.
- `deriveLinkBarrier()` sobre `avg_backlinks_info`, que ya demuestra el patrón de aprovechar campos
  que vienen gratis en la misma respuesta ya pagada.

### Gap

- La serie mensual de 12 meses no está tipada, no se normaliza y no se persiste.
- No hay columna para guardarla.
- No hay derivados (mes pico, mes valle, si la captura cayó en valle) en ningún reader.
- Ningún consumer puede responder "¿qué escribo en agosto para el pico de noviembre?".
- No está declarada la frontera con `TASK-1655`, así que el solape aparente es una trampa activa.

## Modular Placement Contract

- Topology impact: `worker`
- Current home: `src/lib/growth/seo/` en el portal, con el ciclo de captura corriendo en el
  ops-worker
- Future candidate home: `worker`
- Boundary: la serie viaja dentro del hecho de mercado ya existente. El writer canónico sigue siendo
  `keyword-market-data.ts` y el read sale por el reader de oportunidades ya existente; ningún
  consumer lee la columna directo
- Server/browser split: `server-only`. Transporte del proveedor, credenciales y escritura en
  Postgres jamás cruzan al browser; el reader entrega la curva ya serializada
- Build impact: none. Sin dependencias nuevas
- Extraction blocker: none. Es una columna aditiva en una tabla existente y una rama de
  normalización en un writer existente

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `migration`
- Source of truth afectado: `greenhouse_growth.seo_keyword_market_data` — hecho de mercado
  append-only, multi-productor
- Consumidores afectados: reader de oportunidades de keyword, UI de keywords, MCP read-only,
  ops-worker, y a futuro la cola priorizada
- Runtime target: `worker`, `staging`, `production`

### Contract surface

- Contrato existente a respetar: el writer de `keyword-market-data.ts` (pre-check de frescura,
  tres estados, `ON CONFLICT DO NOTHING`), el trigger append-only, y el contrato multi-productor de
  la tabla
- Contrato nuevo o modificado: columna `monthly_searches JSONB` (nullable) en
  `seo_keyword_market_data`; campos derivados en el tipo del reader
  (`seasonality: { series, peakMonth, troughMonth, capturedInTrough } | null`)
- Backward compatibility: `compatible`. Columna nullable con default NULL; los productores que
  todavía no la pueblan escriben `NULL` honesto y el reader responde `seasonality: null`
- Full API parity: la lógica vive en `src/lib/growth/seo/**`; el read sale por el reader canónico y
  su tool MCP se actualiza en el MISMO PR

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.seo_keyword_market_data`
- Invariantes que no se pueden romper:
  - `Append-only`: el trigger prohíbe UPDATE y DELETE. Una captura nueva es fila nueva; **la serie
    de una captura vieja no se "rellena" con un UPDATE**
  - `Un solo almacén`: la serie vive en la misma fila del hecho, jamás en una tabla paralela
  - `Tres estados`: fila ausente ≠ `monthly_searches NULL` ≠ un mes con valor 0
  - `Costo cero`: la serie viene inline en la respuesta ya pagada; ninguna llamada extra
  - `Frescura intacta`: el pre-check sigue siendo por frescura (30 días), no por existencia; repetir
    dentro del ciclo cuesta CERO
  - `Multi-productor honesto`: discovery y gap escriben la misma tabla; si su respuesta no trae la
    serie, escriben `NULL`, no un arreglo vacío
  - `Serie tipada`: el JSONB tiene forma declarada y validada en la frontera (12 entradas
    `{ year, month, searchVolume }`, orden y unicidad garantizados); no es un blob libre
- Tenant/space boundary: `captured_by_organization_id` ya existe en la tabla y se mantiene; la
  resolución del target pasa por `src/lib/growth/seo/resolve-target.ts`, **nunca** SQL inline con
  `ORDER BY created_at DESC LIMIT 1`
- Idempotency/concurrency: heredada — `UNIQUE (normalized_keyword, location_code, language_code,
  capture_date)` + `ON CONFLICT DO NOTHING`. Dos corridas el mismo día no duplican
- Audit/outbox/history: la propia tabla es el histórico (append-only). El evento de outbox del ciclo
  se mantiene; se puede enriquecer con el conteo de capturas que trajeron serie

### Migration, backfill and rollout

- Migration posture: `additive`. Una columna `JSONB` nullable + índice sólo si un reader lo exige
  (no anticipar). Marker `-- Up Migration` exacto y bloque `DO $$ … RAISE EXCEPTION` que aborta si
  la columna no quedó creada. `-- Down Migration` con **sólo** el `ALTER TABLE … DROP COLUMN`
- Default state: la persistencia de la serie nace **detrás del flag del ciclo ya existente**
  (`GROWTH_SEO_KEYWORD_MARKET_DATA_ENABLED`, ops-worker); no se introduce un flag nuevo salvo que la
  verificación muestre que hace falta aislar el cambio
- Backfill plan: **ninguno, y es una decisión.** Las capturas históricas no tienen la serie y
  rellenarlas exigiría (a) violar el append-only con UPDATE, o (b) re-comprar la captura. La serie
  aparece desde la primera captura posterior al despliegue, y eso es suficiente: la curva es de 12
  meses hacia atrás desde el día de captura, así que la **primera** captura ya trae el año completo
- Rollback path: `revert PR` + `pnpm migrate:down` (drop de columna aditiva, sin pérdida de datos
  preexistentes). Si ya hay filas con serie escrita, el drop las pierde: evaluar dejar la columna y
  sólo revertir el código
- External coordination: none más allá de verificar el flag del ciclo en el ops-worker

### Security and access

- Auth/access gate: el ciclo corre en el ops-worker con su service account; el read sale por el
  reader del dominio bajo la capability ya existente y el entitlement per-ORG `seo_v2`
- Sensitive data posture: `no sensitive data`. Estimaciones de mercado de un proveedor
- Error contract: `captureWithDomain` con dominio growth. Una serie malformada del proveedor degrada
  a `NULL` con motivo observable; **no** tumba la captura del resto de las métricas de esa keyword
- Abuse/rate-limit posture: sin cambio. No hay llamadas nuevas; el spend guard y el breaker de la
  familia `labs` siguen igual

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/growth/seo` con fixtures reales de respuesta de
  `keyword_overview` que incluyan y que omitan la serie
- DB/runtime checks: `pnpm pg:connect:migrate` (**no** `pg:connect:status`, que es dry-run) +
  verificación en `information_schema.columns` de que la columna existe; después,
  `pnpm db:generate-types`
- Integration checks: corrida real del ciclo mensual en staging contra el proveedor, verificando que
  la serie llega, se normaliza y se persiste, y que la fila de gasto en `seo_provider_spend_daily`
  **no subió**
- Reliability signals/logs: métrica de cobertura — proporción de capturas del ciclo que trajeron
  serie. Una caída abrupta indica cambio del proveedor
- Production verification sequence: ver abajo

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] **Lógica en el primitive, no en la UI.** Normalización y derivados en
      `src/lib/growth/seo/keyword-market-data.ts` y el reader; ningún componente calcula el mes pico.
- [ ] **Modelada como parte del hecho de mercado**, no como campo suelto de una pantalla.
- [ ] **Read expuesto por el reader canónico**; su tool MCP se actualiza en el MISMO PR.
- [ ] **Capability + grant**: reusa `seo_v2` y la capability del dominio; declararlo explícito.
- [ ] **Camino programático declarado:** reader canónico + tool MCP read-only existente.
- [ ] **Sin write de negocio nuevo**: el único write es la captura del ciclo, que ya existe.
      Declararlo, no omitirlo.
- [ ] **Un primitive, muchos consumers:** UI, MCP, ops-worker y la futura cola leen la MISMA serie.
- [ ] **Parity check = SÍ.**

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

### Slice 1 — Columna + captura de la serie

- Migración aditiva: `monthly_searches JSONB` nullable en `seo_keyword_market_data`, con marker
  `-- Up Migration` exacto y bloque `DO $$ … RAISE EXCEPTION` de verificación post-DDL.
- Tipado de la serie en la respuesta del proveedor y normalización en la frontera (12 entradas
  `{ year, month, searchVolume }`, orden garantizado, unicidad por `year+month`).
- El writer la persiste junto al resto de la captura, en la misma fila y la misma corrida.
- Serie ausente o malformada → `NULL` con motivo observable; el resto de las métricas de esa keyword
  se persisten igual.
- `pnpm db:generate-types` y tipos actualizados.

### Slice 2 — Derivados en el reader

- `seasonality: { series, peakMonth, troughMonth, capturedInTrough } | null` en el tipo del reader.
- `capturedInTrough` es el derivado que cierra el hueco caro: dice si la captura vigente cayó en el
  valle, para que un candidato no se descarte por el mes en que lo miramos.
- `null` honesto cuando no hay serie; jamás un arreglo vacío ni ceros.
- Tool MCP del reader actualizada en el MISMO PR.

### Slice 3 — Contrato de la estacionalidad como input del ordenamiento

- Documento del contrato: cómo la estacionalidad entra al `priority_score` **con lead time**, y por
  qué esa parte no se implementa acá.
- Delta en `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` con la frontera declarada frente a
  `TASK-1655`.
- Documentación funcional + manual proporcionales: qué responde la curva y qué no.

## Out of Scope

- **Modificar el `priority_score` o cualquier ordenamiento.** Se entrega el dato y el contrato; el
  multiplicador vive en la cola priorizada, con su `priority_score_version`. Ver `## Detailed Spec`.
- **Backfill de capturas históricas.** Exigiría violar el append-only o re-comprar. La primera
  captura posterior al despliegue ya trae los 12 meses.
- **Llamadas nuevas al proveedor.** Si la serie no viene inline en la respuesta ya pagada, esa vía
  queda fuera.
- **UI.** Ninguna pantalla nueva ni cambio visible; la curva se entrega por el reader y el MCP.
- **`historical_keyword_data` de DataForSEO** (precio no verificado, §3.3 de la auditoría). Otra
  task, otro presupuesto.
- **El histórico NUESTRO de GSC + rank** (`TASK-1655`). Eje distinto; acá no se toca.
- **Alertas de estacionalidad** ("se acerca tu pico"). El módulo es 100% pull hoy (brecha S7) y
  cambiar eso es otra decisión.

## Detailed Spec

### La captura se entrega sola; el ordenamiento va con la cola

Esta separación es deliberada y es lo que mantiene la task en Effort `Bajo`:

- **La captura rinde sola.** Con la serie persistida, un operador ya puede armar un calendario
  editorial: ve la curva, ve el pico, planifica. No necesita nada más.
- **La estacionalidad COMO INPUT DEL ORDENAMIENTO va con la cola**, y no por prolijidad: porque
  el contenido tarda **3 a 6 meses en rankear**. El score no se multiplica por el volumen del mes
  actual ni por el pico a secas: se multiplica por el **pico esperado MENOS el lead time**. Una
  keyword con pico en noviembre **sube en la cola en julio-agosto y baja en octubre** — en octubre ya
  es tarde para esa keyword y el esfuerzo rinde más en otra.

Meter ese multiplicador acá significaría escribir un componente de `priority_score` fuera del
aggregate que lo versiona, que es exactamente el defecto que la auditoría documenta en
`keyword-opportunities-reader.ts` (constantes de módulo `DEFAULT_TARGET_POSITION = 5`, percentil
0.75, piso de 10 impresiones — cambiar cualquiera mueve el ranking histórico sin dejar rastro).

### Frontera con TASK-1655, dicha para que nadie las funda

`TASK-1655` construye **nuestro** histórico: GSC + rank capture, mirror a BigQuery, backfill de 16
meses. Responde *"¿cómo nos fue?"*. Esta task persiste la **curva de demanda del mercado** que
estima el proveedor. Responde *"¿cuándo busca la gente?"*.

Son ortogonales y ninguna sustituye a la otra:

- Una keyword que nunca seguimos **no tiene** histórico nuestro y **sí tiene** curva de mercado.
- Una keyword donde subimos del puesto 40 al 12 tiene histórico nuestro riquísimo y su curva de
  mercado puede ser plana.
- Cruzar ambas es lo que permite decir *"subimos, pero el mercado bajó"* — que es la pregunta
  `historical_keyword_data` de §3.3, y es una tercera cosa.

### Los tres estados, aplicados a la serie

| Estado | Significa | Cómo se ve |
|---|---|---|
| fila ausente | nunca preguntamos por esa keyword | no hay captura |
| `monthly_searches` NULL | preguntamos y el proveedor no entregó la serie | `seasonality: null` |
| un mes con `searchVolume: 0` | el proveedor dice demanda cero ese mes | punto válido de la curva |

Colapsar el segundo en el tercero produciría curvas falsas con valles inventados, que es peor que no
tener curva.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (columna + captura) → Slice 2 (derivados en el reader) → Slice 3 (contrato + docs).
- **Slice 1 no se cierra sin verificar contra PG real que la columna existe.** La migración lleva su
  bloque `DO $$ … RAISE EXCEPTION`, y aun así se verifica con `information_schema.columns`: una
  migración con markers invertidos se registra como aplicada sin ejecutar el SQL, y el silencio de
  ese fallo es la clase de bug que ya costó tres tablas de governance nunca creadas.
- Slice 2 no puede shippear antes que Slice 1 esté aplicada en el ambiente correspondiente, porque
  el reader leería una columna inexistente.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Migración con markers invertidos: se registra aplicada sin crear la columna | migration / data | medium | Marker `-- Up Migration` exacto + bloque `DO $$ … RAISE EXCEPTION` + verificación contra `information_schema.columns` después de `pnpm migrate:up` | el reader falla al leer la columna |
| Alguien "rellena" series faltantes con UPDATE y rompe el append-only | data / histórico | medium | El trigger `trg_seo_keyword_market_data_append_only` lo impide en la base; se documenta que no hay backfill y por qué | error del trigger en logs |
| Serie malformada del proveedor tumba la captura completa de la keyword | integración / captura mensual | medium | Normalización tolerante: serie inválida → `NULL` con motivo observable, el resto de las métricas se persiste igual | caída de la métrica de cobertura de serie |
| Se implementa el multiplicador de estacionalidad acá, fuera del aggregate versionado | growth / ordenamiento | medium | Fuera de alcance explícito + contrato documentado en Slice 3; la cola es la dueña del `priority_score_version` | dos ordenamientos que discrepan |
| Se confunde con `TASK-1655` y alguien la cierra por duplicada | planificación | medium | Frontera declarada en la task, en el delta de arquitectura y en el Closing Protocol de ambas | task cerrada sin entregable |
| El flag del ciclo se toca en Vercel y el ciclo corre en el ops-worker | ops / rollout | low | El flag ya existe y ya está declarado como **ops-worker únicamente; en Vercel es inerte**; no se introduce flag nuevo | el ciclo no persiste serie tras el deploy |
| `pnpm migrate:down` en un ambiente con series ya escritas las pierde | data | low | Documentar que el rollback preferido es revertir el código y **dejar** la columna | pérdida de filas en verificación post-rollback |

### Feature flags / cutover

- **Sin flag nuevo.** El cambio viaja dentro del ciclo mensual que ya existe y ya está gobernado por
  `GROWTH_SEO_KEYWORD_MARKET_DATA_ENABLED`, declarado **ops-worker únicamente; en Vercel es inerte**.
- La columna es aditiva y nullable: desplegarla no cambia comportamiento hasta que corra el ciclo.
- Si la verificación en staging mostrara necesidad de aislar el cambio, se agrega un flag propio y
  se registra su fila en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` con runtime declarado; no se
  anticipa.
- Revert: `git revert` del código de normalización; la columna queda y se llena de nuevo en el
  siguiente ciclo cuando se re-aplique.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 — columna + captura | `git revert` del código; **dejar la columna** (aditiva, nullable, sin consumidores obligatorios). `pnpm migrate:down` sólo si no hay series escritas | <15 min | si |
| Slice 2 — derivados en el reader | `git revert`; el reader vuelve a no exponer `seasonality` | <10 min | si |
| Slice 3 — contrato + docs | `git revert` | <10 min | si |

### Production verification sequence

1. `pnpm migrate:up` en staging.
2. Verificar contra PG real (`pnpm pg:connect:shell`) que `monthly_searches` existe en
   `information_schema.columns` con el tipo esperado. **No** dar por buena la salida
   "Migrations complete!".
3. `pnpm db:generate-types` y `pnpm local:check` verdes.
4. Corrida real del ciclo mensual en staging: verificar que la serie llega, se normaliza y se
   persiste con 12 entradas ordenadas; verificar que una keyword sin serie escribió `NULL` y no un
   arreglo vacío.
5. Verificar en `seo_provider_spend_daily` que el gasto del ciclo **no subió**.
6. Verificar que el pre-check de frescura sigue funcionando: repetir la corrida el mismo día debe
   costar CERO y no duplicar filas.
7. Producción con el mismo orden, cooldown de 24 h.
8. Monitorear la cobertura de serie durante el primer ciclo completo.

### Out-of-band coordination required

- Ninguna. Es un cambio repo-only más una migración aditiva; el flag del ciclo ya existe y ya está
  prendido en el ops-worker.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `greenhouse_growth.seo_keyword_market_data` tiene `monthly_searches JSONB` nullable,
      verificada contra `information_schema.columns` en PG real, no sólo por la salida de
      `pnpm migrate:up`.
- [ ] La migración lleva el marker `-- Up Migration` exacto y un bloque `DO $$ … RAISE EXCEPTION`
      que aborta si la columna no quedó creada; la sección Down tiene **sólo** el `DROP COLUMN`.
- [ ] El ciclo mensual persiste la serie de 12 meses desde el `keyword_info` ya pagado, con
      **cero llamadas nuevas** al proveedor (verificado en `seo_provider_spend_daily`: el gasto no
      subió).
- [ ] La serie persistida tiene forma validada: 12 entradas `{ year, month, searchVolume }`,
      ordenadas y sin duplicados de `year+month`.
- [ ] Serie ausente o malformada → `monthly_searches NULL` con motivo observable, y el resto de las
      métricas de esa keyword se persiste igual. **Nunca** un arreglo vacío, nunca ceros inventados.
- [ ] El reader expone `seasonality: { series, peakMonth, troughMonth, capturedInTrough } | null`, y
      `capturedInTrough` responde si la captura vigente cayó en el valle.
- [ ] No se ejecuta ningún UPDATE sobre `seo_keyword_market_data`; el append-only queda intacto y no
      hay backfill.
- [ ] El pre-check de frescura sigue costando CERO al repetir la corrida dentro del mismo ciclo, y no
      duplica filas.
- [ ] La tool MCP del reader queda actualizada en el MISMO PR.
- [ ] La frontera con `TASK-1655` (histórico NUESTRO vs curva de demanda DEL MERCADO) queda
      declarada en el delta de arquitectura, y el contrato de la estacionalidad como input del
      ordenamiento —con lead time de 3 a 6 meses— queda documentado sin implementarse acá.

## Verification

- `pnpm local:check`
- `pnpm vitest run src/lib/growth/seo`
- `pnpm migrate:up` + verificación en `information_schema.columns` vía `pnpm pg:connect:shell`
- `pnpm db:generate-types`
- `pnpm test` (suite completa, gate de cierre)
- `pnpm build` (producción, gate de cierre — pedir autorización al operador antes de correrlo)
- Corrida real del ciclo mensual en staging con verificación de gasto sin variación
- `pnpm docs:closure-check`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] `TASK-1655` actualizada con la frontera declarada: histórico NUESTRO vs curva de demanda DEL
      MERCADO; ninguna sustituye a la otra.
- [ ] `TASK-1662` y `TASK-1664` notificadas: escriben la MISMA tabla y deben poblar
      `monthly_searches` desde su propio `keyword_info` inline, o dejar `NULL` honesto.

## Follow-ups

- Conectar la estacionalidad al `priority_score` **con lead time** dentro de la cola priorizada, con
  su `priority_score_version` propia. Una keyword con pico en noviembre sube en julio-agosto y baja
  en octubre.
- Calendario editorial que consuma la curva (`TASK-1667`).
- Evaluar `historical_keyword_data` (precio no verificado) para responder "¿bajé yo o bajó la
  demanda?", que es el cruce de esta curva con el histórico de `TASK-1655`.
- Alerta proactiva de estacionalidad ("se acerca tu pico"), que exige resolver antes la brecha S7:
  el módulo hoy es 100% pull.

## Open Questions

- ¿La serie se guarda como JSONB en la misma fila o como filas hijas en una tabla de detalle?
  Propuesta V1: **JSONB en la misma fila**, porque el hecho es la captura completa y partirlo abriría
  un segundo almacén del mismo hecho, que el dominio prohíbe. Si un reader futuro necesitara
  agregación SQL sobre meses, se evalúa con evidencia.
- ¿`capturedInTrough` usa un umbral relativo al promedio de la serie o al pico? Propuesta: relativo
  al promedio, con el umbral declarado como constante versionada junto al derivado.
