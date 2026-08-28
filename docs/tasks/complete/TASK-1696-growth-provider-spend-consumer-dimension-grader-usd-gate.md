# TASK-1696 — Growth: gasto de proveedor con dimensión de consumidor y gate de dinero per-org del grader

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P0`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `migration`
- Epic: `EPIC-022`
- Status real: `code complete, rollout pendiente`
- Rank: `TBD`
- Domain: `growth`
- Blocked by: `none`
- Branch: `Greenhouse develop; local-first, sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Delta 2026-08-15 (2) — cifras corregidas por verificación adversarial

Una verificación adversarial contra PG real corrigió las cifras que esta task heredó del bloque
económico de la auditoría fuente. **Causa raíz única:** se consultó
`greenhouse_growth.provider_observations` sin filtrar el tráfico de prueba — 102 observaciones de
adapters `fake-*` con costo CERO y 28 de 45 runs con `run_kind='smoke'` quedaron en los
denominadores. **La necesidad de esta task queda CONFIRMADA y reforzada** — sólo cambian los
números que la dimensionan.

| Afirmación original | Estado | Valor verificado (PG, 2026-08-15) |
|---|---|---|
| "20 runs `full` × USD 0,8813 = USD 17,60/mes sin que nada lo mire" | ❌ sub-dimensiona el hueco | El peor caso **exigible** bajo el gate vigente es **USD 40,00/mes/org** (`contractedRunsPerMonth = 20`, `flags.ts:294`, × el techo de policy de USD 2,00 por run que sí es exigible). Con el **máximo observado** de USD 1,4565/run: **USD 29,13/mes/org**. El USD 17,60 es un promedio de 3 runs, no un tope. |
| "~USD 3/mes de grader por cliente" y "el 15% del presupuesto" | ❌ **inventadas** | Medido: **USD 0,7025 histórico total** para la org cliente (`org-32333527…`, 3 runs) y **CERO desde 2026-07-17** — el último run del grader en toda la base es de esa fecha. El grader **está dormido**; no hay un "~USD 3/mes" que comparar contra USD 50. |
| — | ✅ hallazgo nuevo que refuerza la task | **El 87,5% de los dólares del grader no tiene organización atribuida**: USD 8,2432 de USD 9,4222 en runs con `organization_id IS NULL` (81,2% si se excluyen los `smoke`; 40 de 45 runs por conteo). Es exactamente el hueco que esta task cierra. |
| "242 de 767 observaciones `skipped`/`failed` (32%); `google_ai_overview` en 71% (84/119)" | ⚠️ diluido por los fakes | Excluyendo `model LIKE 'fake-%'`: **239 de 665 = 35,9%**, y `google_ai_overview` **84 de 107 = 78,5%**. El problema es **peor** que lo reportado. |

## Delta 2026-08-27 — ejecución: dos defectos del contrato, corregidos contra PG real

La implementación encontró **dos defectos en el contrato de esta misma spec**, los dos ejercitando
el SQL productivo contra PostgreSQL y ninguno visible leyéndolo. Ambos están corregidos y ambos
cambian lo que la spec pedía:

1. **La clave única de 4 columnas no sostenía las columnas de honestidad.** Con
   `(organization_id, family, spend_date, consumer)`, un dólar `estimated` colisiona con la fila
   `invoiced` del mismo día/familia/consumidor y entra por el `DO UPDATE`, que suma el monto pero
   **no toca `cost_basis`**: el dólar estimado queda guardado bajo la etiqueta de facturado, sin
   error y sin rastro. Es exactamente la mentira que las dos columnas existen para impedir — la
   declaración no sirve si la clave la deja colapsar. La clave pasó a SEIS columnas
   `(… , consumer, cost_basis, price_table_version)` con `NULLS NOT DISTINCT` (PostgreSQL 15+), que
   es lo que permite incluir `price_table_version` sin que las filas facturadas (versión NULL)
   dejen de acumular. Migración forward-fix `20260828020728716`; la anterior no se editó.

2. **`invoicedUsedUsd + estimatedUsedUsd` habría contado el mismo gasto dos veces.**
   `estimateObservationCostUsd` devuelve, para `google_ai_overview`, el costo REAL que DataForSEO
   cobró (`usage.dataforseo_cost_usd`), así que `grader_runs.estimated_cost_usd` ya contiene los
   dólares que desde esta task entran al ledger como facturados. Es el mismo bug class contra el
   que advierte la migración fundacional del ledger. `resolveAeoBudget` resta la porción DataForSEO
   de cada run. Verificado contra PG: USD 7,2419 bruto − USD 0,112 = USD 7,1299 de LLM.

**Desvío deliberado del plan (Slice 3).** La spec pedía extender `postDataForSeoSerpLiveAdvanced`
con `organizationId` + `consumer`. La skill `dataforseo-operator` lo congela ("no agregar parámetros
acá; los consumers nuevos usan `postDataForSeoTask`"). En vez de engordar el wrapper se migró su
**único** consumer productivo —el adapter de AI Mode— al transporte canónico. El wrapper queda
congelado y documentado como puerta que NO atribuye, con guard que rompe el build si otro módulo
compra por ahí (`dataforseo-legacy-wrapper-guard.test.ts`).

**Trampa de runtime que la spec no nombraba.** `postDataForSeoTask` LANZA si viene `organizationId`
y el runtime no registró el contador de gasto (guard de TASK-1300). Sólo lo registraba el entrypoint
del ops-worker, pero el grader **también corre inline en Vercel**
(`/api/admin/growth/ai-visibility/runs` → `runGraderDiagnostic` → `executeGraderRun`). El `catch`
del adapter habría convertido ese throw en observación `failed`: AI Mode muerto justo para los
perfiles de cliente que esta task existe para atribuir, sin que ningún test lo notara. El adapter
registra el contador por import de efecto.

**Nombres de flags:** se usó el prefijo canónico del dominio (`GROWTH_AI_VISIBILITY_BUDGET_GATE_*`,
`GROWTH_AI_VISIBILITY_*_MONTHLY_BUDGET_USD`) en vez del `GROWTH_AEO_*` de la spec. Los ~20 flags del
dominio usan ese prefijo; abrir un segundo prefijo para el mismo dominio hace que los greps fallen.

**Kind de la señal de sobregiro:** `cost_guard`, no `budget` — ese kind no existe en
`ReliabilitySignalKind`.

**Criterio de aceptación no observable hoy, y por qué:** "una corrida real `light` sobre un perfil
CON organización dejó fila `('aeo','serp','invoiced')`". **Cero** de las 42 observaciones de AI Mode
que compraron en toda la vida de la base pertenecen a un run cuyo perfil tenga organización — la
atribución no puede producir filas hasta que se provoque esa corrida. No invalida la plomería (20 de
46 runs SÍ tienen perfil con organización); es un paso de rollout, no de código. La señal de drift
ya lo reporta honesto: 7 observaciones de agosto compraron desde perfiles públicos (`warning`) y
**0** de drift atribuible.

**Punto ciego del gate de flags, anotado y no cerrado:** `pnpm flags:audit` no ve los flags nuevos —
su regex busca `process.env.X_ENABLED` literal y todo `ai-visibility/flags.ts` los lee por constante
(`env[FLAG]`), así que reporta "0 sin registrar" sin haberlos mirado. Se registraron a mano en el
ledger. Merece su propia task: el gate da un verde que no midió.

## Summary

El ledger `seo_provider_spend_daily` está declarado como **fuente única de presupuesto** y hoy no
ve un dólar del gasto que el grader AEO le hace a DataForSEO: sus observaciones de AI Mode se
compran por un camino que nunca pasa `organizationId`, y el registro de gasto sólo ocurre si viene.
Esta task le da al ledger la dimensión que le falta —**quién consumió**, `seo` o `aeo`— sin abrir un
segundo ledger, agrega las dos columnas de honestidad que impiden mezclar dólares facturados con
dólares estimados, y le da al grader el gate de dinero per-org que hoy no tiene. El gate **nace en
shadow**: calcula, registra y emite señal, pero no bloquea.

## Why This Task Exists

Es el §1.2 de la auditoría `docs/audits/platform/2026-08-15-growth-seo-aeo-module-opportunity-audit.md`
y tiene consecuencia medida, no teórica.

**Hecho 1 — el grader compra fuera del ledger.** `postDataForSeoSerpLiveAdvanced`
(`src/lib/ai/dataforseo.ts:303-313`) es el contrato histórico del AEO y su firma acepta exactamente
tres campos: `endpoint`, `tasks`, `timeoutMs`. Delega en `postDataForSeoTask` sin `organizationId`, y
el registro del gasto está condicionado a que venga (`src/lib/ai/dataforseo.ts:259`:
`if (cost !== null && cost > 0 && input.organizationId && spendRecorder)`). Resultado medido en la
base: la familia `serp` del ledger tiene 308 llamadas —exactamente los días de rank capture— y las
**35 observaciones AI Mode del grader (USD 0,0920) no aparecen en ninguna fila**.

El registry lo dice con todas las letras y lo declara como limitación viva, no como diseño:
`DATAFORSEO_FAMILIES.serp.requiresOrganization` está en `false`
(`src/lib/ai/dataforseo-families.ts:41-45`) con el comentario *"Consecuencia viva: el gasto AEO de
perfiles ligados a un cliente no entra en el presupuesto de ese cliente"*. El dato existe:
`grader_profiles.organization_id` (`migrations/20260626121608544_task-1243-grader-profile-organization-binding.sql`)
es nullable —un perfil público de prospecto no tiene org, uno de cliente sí— y el `run-engine` ya
tiene el `profile` cargado cuando construye el contexto del adapter
(`src/lib/growth/ai-visibility/run-engine.ts:245-250`). Lo que falta es que
`createProviderAdapterContext` (`src/lib/growth/ai-visibility/providers/types.ts:57-71`) lo
transporte.

**Hecho 2 — no existe presupuesto en dólares por organización para el grader.**
`resolveAeoEntitlement` (`src/lib/growth/ai-visibility/entitlement.ts`) cuenta **runs/mes**
(`allowanceCap`/`allowanceUsed`) y su único tope en USD es un backstop **global y sólo del tier
`trial`**: `globalTrialUsed × resolveProviderPolicy('light').costCeilingUsdPerRun`
(`entitlement.ts:169-175`). Es decir: cuenta corridas de trial y las multiplica por el techo del
modo `light`. Una organización **`contracted`** no tiene ningún gate de dinero: su único límite es un
conteo de corridas (`contractedRunsPerMonth = 20`, `src/lib/growth/ai-visibility/flags.ts:294`), y
un conteo de corridas no acota dólares. El peor caso **exigible** hoy son **20 runs × el techo por
run del modo `full` (USD 2,00) = USD 40,00/mes/org sin que nada lo mire**; contra el run `full` más
caro realmente observado (USD 1,4565, providers reales) son **USD 29,13/mes/org**. El espejo del
lado SEO existe y
funciona: `resolveSeoEntitlement` (`src/lib/growth/seo/entitlement.ts:212-300`) resuelve
`budgetCapUsd` / `budgetUsedUsd` / `budgetRemainingUsd` por tier y bloquea con
`blockedReason: 'budget_exhausted'`.

**Hecho 3 — la asimetría de fondo.** El lado comprado tiene un ledger que escribe **el transporte**
en cada llamada cobrada (por eso una captura nueva no puede gastar sin quedar contabilizada). El
lado construido tiene un **estimador** que escribe el mismo código que gasta. Mezclar los dos tipos
de dólar en una misma columna sin decir cuál es cuál es una mentira silenciosa: nadie podría
responder después "¿esto lo facturó el proveedor o lo estimamos nosotros con una tabla de precios
referencial?". De ahí que `cost_basis` y `price_table_version` sean **obligatorias**, no un extra.

**Hecho 4 — más de un tercio de la matriz del grader no produce evidencia y no está en ningún
tablero.** Excluyendo el tráfico de prueba (`model LIKE 'fake-%'`, 102 observaciones de costo cero):
**239 de 665 observaciones terminan `skipped` o `failed` (35,9%)**, y `google_ai_overview` está en
**78,5%** (84/107). Es la superficie que esta task acaba de instrumentar económicamente, y su
rendimiento no se ve en `/admin/operations`.

## Goal

- `seo_provider_spend_daily` distingue **quién consumió** cada dólar (`consumer`: `seo` | `aeo`)
  dentro de su clave única, con backfill `'seo'` para todo lo ya escrito, y **sigue siendo el único
  ledger** — lo que se separa es el resolver de presupuesto, nunca la tabla.
- Cada fila declara **de qué tipo es su dólar** (`cost_basis`: `invoiced` | `estimated`) y, cuando
  es estimado, **con qué tabla de precios** (`price_table_version`), acoplados por CHECK.
- El gasto DataForSEO del grader queda atribuido a la organización del perfil cuando existe, y
  cuando no existe queda **contado como no atribuible**, nunca invisible.
- `resolveAeoBudget(organizationId)` existe como espejo de la mitad de presupuesto de
  `resolveSeoEntitlement`, reporta las dos monedas por separado (facturado vs estimado) y **no
  bloquea** hasta que un ciclo completo en shadow diga qué tope es correcto.
- Dos señales de reliability con steady=0/tablero: `growth.dataforseo.spend_ledger_drift` y
  `growth.ai_visibility.observation_yield`.

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
  gobernanza DataForSEO, §9 entitlements, §13.1 riesgo de costo, §17.3 reglas de extracción)
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md` (patrón flag default-OFF + shadow + flip;
  patrón capability⇒grant+coverage)
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/agent-invariants/SQL_DATE_MATH_AGENT_INVARIANTS.md`
- `.claude/rules/growth-seo.md` y `.claude/rules/migrations.md` (invariantes auto-load)

Reglas obligatorias:

- **NUNCA abrir un segundo ledger de gasto de proveedor.** Una factura, una tabla. Sumar el
  `provider_cost` de las snapshot tables al presupuesto contaría el mismo gasto dos veces y agotaría
  los presupuestos a la mitad, en silencio (razón canónica en
  `migrations/20260805194114467_task-1300-seo-provider-spend-daily.sql:18-22`).
- **NUNCA el ledger mezcla dólares facturados con dólares estimados sin declararlo.** `cost_basis`
  es NOT NULL y `price_table_version` está acoplado a él por CHECK: una fila `estimated` sin versión
  de tabla de precios no puede existir, y una `invoiced` no puede inventar una.
- **NUNCA un JOIN, VIEW o FK entre tablas `seo_*` y `grader_*`.** El cruce es en memoria por
  `organization_id`; el ledger es la excepción explícita porque **ya es** una tabla compartida por
  transporte, no un cruce de dominio (`growth-seo.md` §boundary 1.1).
- **NUNCA el costo se registra en el caller.** Lo escribe el TRANSPORTE
  (`src/lib/ai/dataforseo.ts:257-270`). Esta task extiende el transporte, no le agrega un writer al
  adapter del grader.
- **NUNCA un fallo al contabilizar invalida un resultado que el proveedor ya cobró.** El catch
  observado del transporte se conserva tal cual.
- **NUNCA prender el enforce sin un ciclo completo en shadow.** El camino público del lead magnet
  comparte el motor del grader; un tope mal calibrado corta captación real.
- **NUNCA la clave del UPSERT y el CHECK/UNIQUE de la base pueden divergir.** El
  `ON CONFLICT (...)` de `SEO_PROVIDER_SPEND_UPSERT_SQL` y la constraint de la migración viajan en
  el mismo commit, con test de paridad (mismo patrón que
  `src/lib/ai/__tests__/dataforseo-family-check-parity.test.ts`).

## Normative Docs

- `docs/audits/platform/2026-08-15-growth-seo-aeo-module-opportunity-audit.md` (§1.2 defecto fuente,
  §1.4 rendimiento de observaciones, §2.1 y §2.2 economía medida) — **fuente de contenido de esta
  task**
- `docs/architecture/GREENHOUSE_AI_VISIBILITY_GRADER_CALIBRATION_V1.md` (§5.bis: el N≥3 que la
  calibración exige no cabe en el techo de USD 2 del modo `full` — contexto de por qué el tope
  correcto todavía no se conoce)
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` (los dos flags nuevos se registran en el mismo PR)
- `docs/tasks/complete/TASK-1300-*.md` y `docs/tasks/complete/TASK-1301-*.md` [verificar nombre
  exacto del archivo] — origen del ledger y del chokepoint de entitlement SEO

## Dependencies & Impact

### Depends on

- `greenhouse_growth.seo_provider_spend_daily` (`migrations/20260805194114467_task-1300-seo-provider-spend-daily.sql`) — tabla a migrar
- `greenhouse_growth.grader_profiles.organization_id` (`migrations/20260626121608544_task-1243-grader-profile-organization-binding.sql`) — nullable, es el ancla de atribución
- `greenhouse_growth.grader_runs` + `greenhouse_growth.provider_observations` (`migrations/20260624125140219_task-1226-greenhouse-growth-schema.sql`, provider CHECK ampliado en `migrations/20260627131500000_task-1265-google-ai-overview-provider-checks.sql`)
- `src/lib/ai/dataforseo.ts` (transporte + hook `setDataForSeoSpendRecorder`) y `src/lib/ai/dataforseo-families.ts` (registry de familias)
- `src/lib/growth/seo/provider-spend.ts` (writer + fragmento canónico del gasto mensual)
- `src/lib/growth/seo/entitlement.ts` (espejo a replicar en su mitad de presupuesto)

### Blocks / Impacts

- **`TASK-1651`** (LLM SoV foundation sobre DataForSEO AI Optimization): cualquier familia o
  consumer nuevo del grader nace con `consumer='aeo'` y presupuesto propio. Si 1651 aterriza antes,
  hereda el punto ciego completo.
- **`TASK-1652`** (AI Mode request correctness): toca el mismo adapter
  `google-ai-overview-adapter.ts`. Coordinar orden — esta task le agrega `organizationId` al camino
  de llamada.
- **`TASK-1270`** (recurring SoV re-grade, `in-progress`): al reactivar la cadencia, el gasto pasa a
  ser recurrente. Sin este gate, el re-grade recurrente es gasto per-org sin tope.
- **`TASK-1246`** (public launch readiness, `in-progress`): el camino público comparte el motor; el
  gate en enforce sin calibrar es un riesgo directo sobre esa superficie.
- **`EPIC-022`**: cierra la brecha "el margen de Berel sigue sin medirse pese a que el costo variable
  por org se conoce al dólar" (§8 de la auditoría).

### Files owned

- `migrations/<timestamp>_task-1696-seo-provider-spend-consumer-dimension.sql`
- `src/lib/growth/seo/provider-spend.ts`
- `src/lib/ai/dataforseo.ts`
- `src/lib/ai/dataforseo-families.ts`
- `src/lib/growth/ai-visibility/budget.ts` (nuevo — `resolveAeoBudget`)
- `src/lib/growth/ai-visibility/flags.ts`
- `src/lib/growth/ai-visibility/providers/types.ts`
- `src/lib/growth/ai-visibility/providers/google-ai-overview-adapter.ts`
- `src/lib/growth/ai-visibility/run-engine.ts`
- `src/lib/reliability/queries/growth-dataforseo-spend-ledger-drift.ts` (nuevo)
- `src/lib/reliability/queries/growth-ai-visibility-observation-yield.ts` (nuevo)
- `src/lib/reliability/signals.ts` · `src/lib/reliability/registry.ts`
- `src/lib/ai/__tests__/dataforseo-*.test.ts` · `src/lib/growth/seo/__tests__/*` · `src/lib/growth/ai-visibility/__tests__/*`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` · `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`

## Current Repo State

### Already exists

- **Ledger completo y probado.** `greenhouse_growth.seo_provider_spend_daily` con UNIQUE
  `(organization_id, family, spend_date)`, CHECK de `family` sobre las 5 familias, GRANTs sin
  DELETE, anti pre-up-marker guard y guard de tipo `DATE` para `spend_date`
  (`migrations/20260805194114467_task-1300-seo-provider-spend-daily.sql`).
- **Writer atómico.** `recordSeoProviderSpend` + `SEO_PROVIDER_SPEND_UPSERT_SQL` con incrementos
  `col = col + EXCLUDED.col` (`src/lib/growth/seo/provider-spend.ts:37-71`), y el fragmento
  canónico del gasto mensual `buildSeoProviderSpendMonthlySumSql(placeholder)`
  (`:57-61`), que toma el placeholder por parámetro justamente para no fijar `$1`.
- **Read de atribución.** `readSeoProviderSpendByFamily(organizationId)`
  (`src/lib/growth/seo/provider-spend.ts:85-109`).
- **Registro en el transporte.** `src/lib/ai/dataforseo.ts:257-270` — el costo se registra en el
  transporte y un fallo del recorder se observa sin invalidar el resultado pagado.
- **Registry declarativo de familias** con `requiresOrganization` por familia y el comentario que
  documenta la deuda de `serp` (`src/lib/ai/dataforseo-families.ts:40-66`), más el test de paridad
  TS↔CHECK (`src/lib/ai/__tests__/dataforseo-family-check-parity.test.ts`).
- **Espejo SEO completo del gate de presupuesto:** `resolveSeoEntitlement` con
  `budgetCapUsd`/`budgetUsedUsd`/`budgetRemainingUsd` y `blockedReason: 'budget_exhausted'`
  (`src/lib/growth/seo/entitlement.ts:212-300`).
- **Entitlement AEO** con tiers y allowance de runs (`src/lib/growth/ai-visibility/entitlement.ts`),
  y `resolveProviderPolicy(mode).costCeilingUsdPerRun` como techo por run
  (`src/lib/growth/ai-visibility/policy.ts` [verificar path exacto del export]).
- **Señales de growth ya cableadas al rollup `growth`** del control plane
  (`src/lib/reliability/registry.ts:588-611`), con convención de id `growth.ai_visibility.*` y
  `seo.*` verificada en `src/lib/reliability/queries/`.

### Gap

- `seo_provider_spend_daily` **no tiene dimensión de consumidor**: no se puede responder "cuánto de
  este dólar fue del grader" ni excluirlo del presupuesto SEO.
- `seo_provider_spend_daily` **no distingue el tipo de dólar**: no hay `cost_basis` ni
  `price_table_version`, así que si mañana un dólar estimado entra a la tabla nadie lo sabrá.
- `postDataForSeoSerpLiveAdvanced` **no acepta ni propaga** `organizationId` ni `consumer`
  (`src/lib/ai/dataforseo.ts:303-313`) — y su docstring dice explícitamente *"No agregar parámetros
  acá"*, así que la extensión debe ser deliberada y documentada, no un parámetro más.
- `ProviderAdapterContext` **no transporta la organización**
  (`src/lib/growth/ai-visibility/providers/types.ts:57-71`), aunque el `run-engine` ya tiene el
  `profile` con `organizationId` en la mano (`run-engine.ts:245`).
- **No existe `resolveAeoBudget`.** Ninguna función del dominio AEO responde "cuántos USD lleva
  gastados esta organización este mes y cuál es su tope".
- **No existe ninguna señal** que compare observaciones de `google_ai_overview` de un período contra
  llamadas cobradas del ledger, ni que reporte el rendimiento (`succeeded` / total) de la matriz de
  observaciones.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: transporte compartido en `src/lib/ai/dataforseo*.ts`; writer y fragmento de
  presupuesto en `src/lib/growth/seo/provider-spend.ts`; resolver nuevo en
  `src/lib/growth/ai-visibility/budget.ts`. Se ejecuta en Vercel (runs de portal, lanes de lectura)
  y en el ops-worker (crons de captura y re-grade).
- Future candidate home: `domain-package`
- Boundary: el contrato canónico de escritura del gasto es **el transporte**
  (`postDataForSeoTask` + el hook `setDataForSeoSpendRecorder` → `recordSeoProviderSpend`); el
  contrato canónico de lectura del presupuesto es `buildSeoProviderSpendMonthlySumSql` (SEO) y
  `resolveAeoBudget` (AEO). Consumers autorizados: `enforceSeoRunEntitlement`, el chokepoint del
  grader, las dos queries de reliability y el read de atribución por consumer. Ningún consumer suma
  gasto con SQL propio.
- Server/browser split: cada archivo tocado lleva `import 'server-only'`. El secreto DataForSEO, el
  cliente Postgres y los resolvers de presupuesto nunca cruzan al browser; la UI recibe DTOs ya
  compuestos por el server component.
- Build impact: none — sin dependencia nueva, sin input de filesystem, sin entrypoint global.
- Extraction blocker: el ledger es **compartido por dos dominios** (SEO y AEO) porque una factura de
  proveedor es una sola. Extraer `growth/ai-visibility` a paquete propio exigiría que el ledger
  quede del lado del transporte compartido o detrás de un contrato de escritura. Se declara acá para
  que la Wave de extracción no lo descubra tarde; esta task **no** lo resuelve.

El `Future candidate home: domain-package` aplica a `growth/seo` y `growth/ai-visibility`. El
transporte DataForSEO (`src/lib/ai/dataforseo*.ts`) es la excepción y se queda `remain-shared`: es
infraestructura de proveedor, no dominio.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `migration`
- Source of truth afectado: `greenhouse_growth.seo_provider_spend_daily` (clave única + dos columnas
  de honestidad) · el transporte `src/lib/ai/dataforseo.ts` como único escritor del gasto ·
  `greenhouse_growth.grader_runs.estimated_cost_usd` como fuente **estimada** del lado construido
  (sólo lectura).
- Consumidores afectados: `enforceSeoRunEntitlement` (gate SEO), el chokepoint de runs del grader,
  `readSeoProviderSpendByFamily`, el lane ecosystem y MCP de lectura de gasto, `/admin/operations`
  (dos señales nuevas), el cron `ops-seo-rank-capture` y el cron de re-grade en ops-worker.
- Runtime target: `production` (Vercel) + `worker` (Cloud Run ops-worker). **Es multi-runtime: los
  dos flags se leen en ambos.**

### Contract surface

- Contrato existente a respetar:
  - `SEO_PROVIDER_SPEND_UPSERT_SQL` y `buildSeoProviderSpendMonthlySumSql` en
    `src/lib/growth/seo/provider-spend.ts`
  - `DataForSeoFamilyDefinition` / `DATAFORSEO_FAMILIES` en `src/lib/ai/dataforseo-families.ts`
  - la firma histórica de `postDataForSeoSerpLiveAdvanced` (`src/lib/ai/dataforseo.ts:303-313`)
  - `AeoEntitlement` en `src/lib/growth/ai-visibility/entitlement.ts` (esta task **no** le agrega
    campos de dinero: el presupuesto es un resolver aparte, ver §Detailed Spec)
- Contrato nuevo o modificado:
  - Columna `consumer TEXT NOT NULL DEFAULT 'seo'` con CHECK cerrado `('seo','aeo')`, **dentro de la
    clave única** `(organization_id, family, spend_date, consumer)`.
  - Columnas `cost_basis TEXT NOT NULL DEFAULT 'invoiced'` CHECK `('invoiced','estimated')` y
    `price_table_version TEXT NULL`, acopladas por CHECK.
  - `RecordSeoProviderSpendInput` gana `consumer` (requerido) y `costBasis`/`priceTableVersion`
    (con default `invoiced`/`NULL`).
  - `postDataForSeoSerpLiveAdvanced` acepta y propaga `organizationId?: string | null` y
    `consumer: 'seo' | 'aeo'`.
  - `ProviderAdapterContext` gana `organizationId: string | null`.
  - `resolveAeoBudget(organizationId, env?)` → `AeoBudgetState` (nuevo, `src/lib/growth/ai-visibility/budget.ts`).
  - `readSeoProviderSpendByConsumer(organizationId)` → read de atribución con corte por consumer y
    por `cost_basis`, expuesto en el lane ecosystem + tool MCP en el MISMO PR (mandato de
    `.claude/rules/growth-seo.md`; lectura bajo `efeonce.mcp.read`, sin scope nuevo en Entra).
- Backward compatibility: `gated` para el gate (flags default OFF) y `compatible` para el schema —
  las tres columnas nacen con DEFAULT y el backfill es una reescritura del valor por defecto sobre
  filas existentes. La firma de `postDataForSeoSerpLiveAdvanced` cambia de forma **breaking a nivel
  de tipos** (`consumer` requerido) y eso es deliberado: un caller nuevo no puede olvidarse de
  declarar quién gasta.
- Full API parity: el gasto y el presupuesto se leen por reader canónico, nunca por SQL de pantalla;
  `resolveAeoBudget` es un primitive server-side que el chokepoint, Nexa, el lane ecosystem y MCP
  consumen igual. No se construye nada Nexa-específico.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.seo_provider_spend_daily` (migración) ·
  `greenhouse_growth.grader_runs` (lectura de `estimated_cost_usd` y `organization_id`) ·
  `greenhouse_growth.grader_profiles` (lectura de `organization_id`) ·
  `greenhouse_growth.provider_observations` (lectura para el rendimiento).
- Invariantes que no se pueden romper:
  - **Una factura, una tabla.** No se crea un `aeo_provider_spend_daily`. Lo que se separa es el
    resolver de presupuesto, no el ledger.
  - **`consumer` es parte de la identidad de la fila**, no un atributo: dos consumidores el mismo
    día sobre la misma familia son **dos filas**, jamás un total mezclado.
  - **`cost_basis='invoiced'` ⇒ `price_table_version IS NULL`** y
    **`cost_basis='estimated'` ⇒ `price_table_version IS NOT NULL`**, por CHECK. Declaración y
    procedencia del número existen o faltan juntas (mismo acoplamiento que
    `intent_declared_by`/`intent_declared_at` en `seo_keyword_set_members`).
  - **El presupuesto SEO sólo suma `consumer='seo'`.** El filtro entra en
    `buildSeoProviderSpendMonthlySumSql` **en el mismo PR que la migración**: con el backfill
    aplicado y sin el filtro, la primera llamada AEO atribuida empezaría a comerse el presupuesto
    del cliente SEO sin que nada falle.
  - **El gasto no atribuible no desaparece.** Cuando el perfil del grader no tiene organización
    (prospecto público), no hay fila —el ledger tiene FK a `organizations`— pero la llamada se
    cuenta en la señal de drift como no atribuible. Nunca se inventa una organización.
  - **`serp.requiresOrganization` sigue en `false`.** Ponerlo en `true` rompería el grader público,
    que es un caso legítimo sin organización. El tipo no puede exigir lo que el dominio permite que
    falte.
  - **Nunca se registra gasto cero.** `recordSeoProviderSpend` ignora costos no finitos o ≤ 0
    (`provider-spend.ts:64`): una fila de cero se leería después como "se llamó y salió gratis".
  - **El ledger es acumulativo y sin DELETE** (GRANTs de la 1300): la migración no puede otorgar
    DELETE a `greenhouse_runtime`/`greenhouse_app`.
- Tenant/space boundary: `organization_id` con FK a `greenhouse_core.organizations`; en el lado AEO
  se deriva **server-side** de `grader_profiles.organization_id`, nunca del caller ni del payload
  del run.
- Idempotency/concurrency: se conserva el UPSERT con incrementos atómicos en SQL
  (`col = col + EXCLUDED.col`) — read-modify-write perdería llamadas con varias instancias de
  ops-worker. El `ON CONFLICT` pasa a `(organization_id, family, spend_date, consumer)` y su
  paridad con la constraint queda cubierta por test.
- Audit/outbox/history: el ledger **es** el registro acumulativo; no se agrega outbox (no hay
  consumer reactivo). Las dos señales de reliability son el plano de observación.

### Migration, backfill and rollout

- Migration posture: `additive` + `backfill` (de valores por defecto, no de hechos nuevos) +
  **recreación de la constraint UNIQUE**, que es el único paso con filo.
- Default state: `flag OFF` para las dos etapas del gate (`shadow` y `enforce`). El schema y la
  atribución del gasto entran **sin flag** — no bloquean nada, sólo hacen visible lo que ya ocurre.
- Backfill plan: `UPDATE ... SET consumer='seo', cost_basis='invoiced'` es innecesario si las
  columnas nacen con DEFAULT (PostgreSQL 16 materializa el default sin reescribir la tabla). El
  backfill explícito se limita a **verificar** con un `DO $$ ... RAISE EXCEPTION` que no quedó
  ninguna fila con `consumer IS NULL` ni `cost_basis IS NULL` antes de aplicar el `NOT NULL`.
- Rollback path: `reverse migration` para el schema (drop de las tres columnas + restauración de la
  UNIQUE original) — reversible mientras no exista ninguna fila `consumer='aeo'`; después del primer
  gasto AEO atribuido, revertir **pierde la dimensión** y el rollback correcto es dejar el schema y
  apagar los flags. Para el gate: `flag off` en los dos runtimes.
- External coordination: dos env vars nuevas en **Vercel (Production + Preview/develop) y en Cloud
  Run ops-worker**, con el flag declarado en `services/ops-worker/deploy.sh` (los `deploy.sh` usan
  `--set-env-vars` destructivo) **además** de `gcloud run services update --update-env-vars` para
  efecto inmediato. Fila en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` en el mismo PR.

### Security and access

- Auth/access gate: los resolvers son server-only y se invocan desde chokepoints ya autenticados; el
  read de atribución por consumer entra por el lane ecosystem con el token del consumer y scope
  `efeonce.mcp.read` (lectura), sin scope nuevo. La capability fina del lane app se resuelve con
  `can()`, nunca con `roleCodes.includes(...)`.
- Sensitive data posture: sin PII. Son montos de gasto por organización — dato comercial sensible,
  así que **no** se expone en superficies de cliente ni en el payload público del grader.
- Error contract: `canonicalErrorResponse(code, ...)` en cualquier borde HTTP nuevo; nada de prosa en
  inglés cruda. El transporte conserva su posture: `captureWithDomain(error, 'growth', ...)` y
  seguir, jamás invalidar un resultado ya cobrado por un fallo de contabilidad.
- Abuse/rate-limit posture: el breaker por familia de `dataForSeoBreaker` se conserva sin cambios; el
  gate de dinero es una segunda capa, no un reemplazo. En shadow no hay superficie de abuso nueva.

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/ai src/lib/growth/seo src/lib/growth/ai-visibility src/lib/reliability`
- DB/runtime checks: `pnpm pg:connect:migrate` + verificación por `information_schema` /
  `pg_constraint` de las tres columnas, del CHECK acoplado y de la UNIQUE nueva. Script de sanity
  live `scripts/growth/_sanity-provider-spend-consumer.ts` que ejercita **el mismo**
  `SEO_PROVIDER_SPEND_UPSERT_SQL` productivo contra PostgreSQL (patrón del sanity ya existente de
  la 1300) con `commit + try/finally`, nunca `BEGIN/ROLLBACK` cross-pool.
- Integration checks: una corrida real `light` del grader sobre un perfil **con organización** y otra
  sobre un perfil **sin organización**, verificando en la base que la primera dejó fila
  `consumer='aeo'` / `cost_basis='invoiced'` y la segunda no dejó fila pero sí quedó contada como no
  atribuible en la señal de drift.
- Reliability signals/logs: `growth.dataforseo.spend_ledger_drift` y
  `growth.ai_visibility.observation_yield` visibles en `/admin/operations` bajo el rollup `growth`.
- Production verification sequence: ver `### Production verification sequence` en Zone 3.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] **Lógica en el primitive, no en la UI.** `resolveAeoBudget` y el filtro por `consumer` viven en
      `src/lib/**`; ninguna pantalla suma gasto.
- [ ] **Modelada como aggregate/recurso/command.** El gasto es un recurso acumulativo con clave
      `(org, family, date, consumer)`; el presupuesto es un resolver, no un click-handler.
- [ ] **Read** expuesto como reader canónico (`readSeoProviderSpendByConsumer`, `resolveAeoBudget`);
      no hay write nuevo de negocio — el único write es el del transporte, que ya tiene idempotencia
      atómica, observabilidad y errores sanitizados.
- [ ] **Capability + grant en el MISMO PR** si el read de atribución se gatea con una capability
      nueva; si reusa una existente del dominio growth, declararlo explícito en el plan y no crear
      una capability redundante.
- [ ] **Camino programático declarado:** lane ecosystem
      `/api/platform/ecosystem/growth/seo/provider-spend` + tool MCP de lectura en el mismo PR.
- [ ] **Write apto para `propose → confirm → execute`:** N/A — esta task no introduce un write de
      negocio operable por agente. El único write es contable y lo hace el transporte.
- [ ] **Un primitive, muchos consumers:** cero lógica de presupuesto duplicada entre el chokepoint,
      las señales y los lanes.
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

### Slice 1 — Migración: dimensión de consumidor y columnas de honestidad

- Migración `task-1696-seo-provider-spend-consumer-dimension` creada con `pnpm migrate:create`
  (nunca a mano; markers `-- Up Migration` / `-- Down Migration` literales).
- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS consumer TEXT NOT NULL DEFAULT 'seo'` con
  `CHECK (consumer IN ('seo','aeo'))`.
- `ADD COLUMN IF NOT EXISTS cost_basis TEXT NOT NULL DEFAULT 'invoiced'` con
  `CHECK (cost_basis IN ('invoiced','estimated'))`.
- `ADD COLUMN IF NOT EXISTS price_table_version TEXT` + CHECK acoplado:
  `CHECK ((cost_basis = 'estimated') = (price_table_version IS NOT NULL))`.
- Reemplazo de la UNIQUE: `DROP CONSTRAINT seo_provider_spend_daily_unique` →
  `ADD CONSTRAINT seo_provider_spend_daily_unique UNIQUE (organization_id, family, spend_date, consumer)`.
- Índice de lectura del gate por consumer:
  `seo_provider_spend_daily_org_consumer_date_idx (organization_id, consumer, spend_date DESC)`.
- Bloque `DO $$ ... RAISE EXCEPTION` anti pre-up-marker que aborta si falta cualquiera de: las tres
  columnas, el CHECK acoplado, la UNIQUE nueva de 4 columnas, o si quedó alguna fila con
  `consumer IS NULL`/`cost_basis IS NULL`.
- GRANTs re-declarados **sin DELETE** para `greenhouse_runtime` y `greenhouse_app`.
- Down migration: sólo `DROP CONSTRAINT` + `DROP COLUMN` + restauración de la UNIQUE original.
- Test de paridad vocabulario TS ↔ CHECK de `consumer` y de `cost_basis`, molde
  `src/lib/ai/__tests__/dataforseo-family-check-parity.test.ts`.

### Slice 2 — Writer y fragmento de presupuesto: el filtro `consumer='seo'` en el mismo commit

- `RecordSeoProviderSpendInput` gana `consumer: DataForSeoSpendConsumer` (requerido),
  `costBasis?: 'invoiced' | 'estimated'` (default `'invoiced'`) y `priceTableVersion?: string | null`.
- `SEO_PROVIDER_SPEND_UPSERT_SQL` inserta las tres columnas y su `ON CONFLICT` pasa a
  `(organization_id, family, spend_date, consumer)`.
- 🔴 `buildSeoProviderSpendMonthlySumSql` agrega `AND sp.consumer = 'seo'` **en este mismo commit**.
  Con el backfill aplicado y sin el filtro, el primer dólar AEO atribuido se descuenta del
  presupuesto SEO del cliente sin que nada falle.
- `readSeoProviderSpendByConsumer(organizationId)`: gasto del mes agrupado por
  `(consumer, family, cost_basis)`, con las dos monedas separadas.
- Test que rompe el build si el `ON CONFLICT` del SQL productivo y la constraint de la migración
  divergen.

### Slice 3 — Transporte y propagación: el grader deja de comprar fuera del ledger

- `postDataForSeoTask` acepta `consumer` y lo pasa al `spendRecorder`.
- `postDataForSeoSerpLiveAdvanced` acepta `organizationId?: string | null` y `consumer` y los
  propaga. Se actualiza su docstring: deja de decir "No agregar parámetros acá" y explica por qué
  estos dos sí (son la identidad del gasto, no una opción de la llamada).
- `ProviderAdapterContext` + `createProviderAdapterContext` ganan `organizationId: string | null`;
  `run-engine.ts:245` lo pasa desde `profile.organizationId`.
- `google-ai-overview-adapter.ts:220` llama con `organizationId: context.organizationId` y
  `consumer: 'aeo'`.
- Los otros cuatro adapters (openai, anthropic, perplexity, gemini) **no cambian**: no compran a
  DataForSEO; su costo es estimado y vive en `grader_runs.estimated_cost_usd`.
- El comentario de deuda de `DATAFORSEO_FAMILIES.serp` (`dataforseo-families.ts:41-45`) se reescribe
  con el estado real: la atribución existe, `requiresOrganization` sigue en `false` **porque el
  grader público es un caso legítimo sin organización**, y esa es la razón, no una limitación.

### Slice 4 — `resolveAeoBudget`: el espejo de la mitad de presupuesto

- `src/lib/growth/ai-visibility/budget.ts` con `resolveAeoBudget(organizationId, env?)` →
  `AeoBudgetState`:
  ```ts
  interface AeoBudgetState {
    organizationId: string
    tier: AeoTier | null
    budgetCapUsd: number
    invoicedUsedUsd: number   // ledger, consumer='aeo', cost_basis='invoiced'
    estimatedUsedUsd: number  // grader_runs.estimated_cost_usd del mes
    budgetUsedUsd: number     // suma declarada, nunca una cifra opaca
    budgetRemainingUsd: number
    periodResetAt: string
    wouldBlock: boolean       // en shadow: lo que HABRÍA pasado
    enforced: boolean         // ¿el flag de enforce está prendido?
  }
  ```
- Los topes por tier salen de env-knobs espejo de los SEO
  (`GROWTH_AEO_CONTRACTED_MONTHLY_BUDGET_USD`, `..._PILOT_...`, `..._TRIAL_...`), resueltos en
  `ai-visibility/flags.ts` junto al resto del `AeoAllowanceConfig`. **No son flags**: son knobs de
  configuración y no van al ledger de flags.
- `resolveAeoEntitlement` **no cambia**: el presupuesto es un resolver aparte. Un `AeoEntitlement`
  que además hablara de dinero acoplaría dos decisiones con ciclos de vida distintos (cupo mensual
  de runs vs gasto acumulado), y el lado SEO ya demostró que el gate se lee mejor cuando el gasto
  tiene su propio fragmento reutilizable.
- El chokepoint del grader llama `resolveAeoBudget` y, con `GROWTH_AEO_BUDGET_GATE_ENFORCED=false`,
  **registra y sigue**.

### Slice 5 — Las dos señales

- `growth.dataforseo.spend_ledger_drift` (kind `data_quality`, steady = 0): compara, por período,
  las observaciones `google_ai_overview` de `provider_observations` contra las llamadas registradas
  con `consumer='aeo'` en el ledger. Toda observación de AI Mode que existió y no dejó llamada
  cobrada contabilizada es drift. Severidad: `ok` en 0 · `warning` con drift atribuible a perfiles
  sin organización · `error` con drift sobre perfiles **que sí tienen** organización (eso es un bug
  del camino de atribución, no una ausencia legítima).
- `growth.ai_visibility.observation_yield` (kind `data_quality`): rendimiento
  `succeeded / total` de `provider_observations` en ventana móvil, **con corte por provider** —
  el número global (68%) esconde que `google_ai_overview` está en 29%. Umbrales declarados en la
  spec del signal, con el baseline medido 2026-08-15 como punto de partida honesto, no como meta.
- 🔴 `seo.provider.cost_over_budget` (kind `budget`, steady = 0) — **la señal que nueve tasks ya
  citan como construida y que no existe.** Alerta cuando el gasto acumulado del período se acerca al
  presupuesto de la organización, **antes** de que el gate empiece a rechazar corridas con
  `budget_exhausted`. Hoy el sobregiro sólo se manifiesta como corridas que fallan, sin aviso previo.
  Entra en esta task y no en una propia porque **necesita la dimensión de consumidor de Slice 1 para
  ser correcta**: una alarma que sólo ve el gasto `seo` sub-reportaría exactamente el 87,5% del
  gasto del grader que esta task acaba de atribuir. Umbral declarado en la spec del signal, no
  hardcodeado; severidad `warning` al acercarse, `error` al agotar.
- Las tres registradas en `src/lib/reliability/signals.ts` y visibles bajo el rollup `growth`
  (`registry.ts`), con `filesOwned` actualizado.
- Fecha canónica en SQL: `(CURRENT_DATE - X)::int` para días entre fechas; **jamás**
  `EXTRACT(EPOCH FROM (date - date))`.

### Slice 6 — Shadow, flags multi-runtime y cierre documental

- `GROWTH_AEO_BUDGET_GATE_ENABLED` (default OFF): computa `resolveAeoBudget` en el chokepoint y
  alimenta la señal. No bloquea.
- `GROWTH_AEO_BUDGET_GATE_ENFORCED` (default OFF): sólo con **las dos** en ON el gate bloquea con
  `blockedReason: 'budget_exhausted'`.
- 🔴 Ambos se leen en **Vercel** (runs de portal / camino público) **y en ops-worker** (re-grade
  recurrente). Se declaran en `services/ops-worker/deploy.sh` y se aplican con
  `gcloud run services update --update-env-vars`; hacer sólo lo segundo los borra en el próximo
  deploy, en silencio.
- Filas en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`, incluida la sección
  "§ Pendientes de acción" mientras `ENFORCED` siga apagado.
- Deltas en `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` (§6/§9: el ledger tiene consumidor y el
  presupuesto SEO lo filtra) y en `GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` (el
  gasto DataForSEO del grader está atribuido; existe presupuesto per-org en shadow).
- Doc funcional + manual proporcionales: qué significa cada corte del gasto y cómo leer las dos
  señales cuando alertan.

## Out of Scope

- **No se toca el estimador de tokens.** Ni la tabla de precios referencial, ni cómo se calcula
  `estimated_cost_usd`, ni los `costCeilingUsdPerRun` por modo. `resolveAeoBudget` **lee** ese número;
  no lo redefine.
- **No se cambia ningún techo.** Ni los USD 50/mes del tier `contracted` SEO, ni los runs/mes del
  AEO, ni el techo de 200 keywords por target, ni el techo de USD 2 del modo `full`. Los knobs de
  presupuesto AEO nacen con valores que **no bloquean a nadie hoy**; calibrarlos es la salida del
  ciclo en shadow.
- **No se crea un segundo ledger.** Nada de `aeo_provider_spend_daily` ni de sumar el `provider_cost`
  de las snapshot tables.
- **No se cambia la cadencia del AI Overview** (correrlo todos los días en todas las keywords es otra
  decisión, con su propia task).
- **No se resuelve el re-grade apagado** (§1.4 de la auditoría, trampa multi-runtime del flip del
  2026-06-30): es higiene de rollout, no de esta task.
- **No se persiste el top-N del SERP** (`TASK-1699`) ni se toca `parseSerpRankObservation`.
- **No se toca el deep import cross-dominio** (`TASK-1697`).
- **No hay superficie visible nueva.** Las dos señales aparecen en `/admin/operations` por el
  registry existente; no se diseña pantalla.

## Detailed Spec

### Por qué la dimensión va en el ledger y el presupuesto va en dos resolvers

Son dos preguntas distintas que la auditoría dejó pegadas:

1. *"¿Cuánto le pagamos a DataForSEO por esta organización?"* → **una sola respuesta**, porque es
   **una sola factura**. Ahí no puede haber dos tablas: dos tablas es dos verdades y una
   reconciliación manual que nadie va a hacer.
2. *"¿Cuánto puede gastar esta organización en SEO / en AEO?"* → **dos respuestas**, porque son dos
   servicios con dos entitlements, dos cadencias y dos tiers.

De ahí la forma: `consumer` entra en la clave de la tabla (dimensión del hecho) y el presupuesto se
parte en dos resolvers que leen la misma tabla con distinto filtro. Es exactamente el veredicto §5.1
de la auditoría: *"Entitlement / gate de gasto — no compartir el resolver; sí la FORMA"*.

### Por qué `cost_basis` y `price_table_version` son obligatorias

Hoy todas las filas del ledger son dólares **facturados**: los escribe el transporte leyendo
`json.cost` de la respuesta del proveedor. El día que un dólar **estimado** entre a esta tabla —y va
a entrar, porque el análisis de contenido y el gasto de tokens tienen presupuesto per-org pendiente—
sin estas columnas nadie podrá distinguirlos. Un total que suma USD facturados y USD estimados y se
presenta como un número solo **no es un dato degradado: es un dato falso**, y encima defendible ante
un cliente sólo hasta que pregunte.

El CHECK acoplado `(cost_basis = 'estimated') = (price_table_version IS NOT NULL)` es lo que impide
la degradación por acreción: un writer futuro no puede declarar "estimado" y omitir con qué tabla lo
estimó, ni declarar "facturado" e inventar una versión.

### La atribución cuando no hay organización

`grader_profiles.organization_id` es nullable a propósito: el grader corre sobre prospectos públicos
que no son clientes. El ledger tiene FK a `greenhouse_core.organizations`, así que **no hay fila
posible** para ese gasto — y forzar una organización sintética sería peor que el hueco.

La postura honesta: ese gasto **no entra al ledger** y **sí entra a la señal**. La señal de drift
distingue las dos causas y las trata distinto (`warning` para la ausencia legítima, `error` para el
bug de atribución), de modo que "no está en el ledger" nunca signifique "no ocurrió".

El presupuesto del camino público sigue defendido por donde ya lo estaba:
`public-intake/abuse-guard.ts` (budget diario público) y el backstop global del tier `trial`. Esta
task no lo altera.

### Por qué el gate nace en shadow

No sabemos cuál es el tope correcto, y los datos disponibles son **demasiado pocos y demasiado
sesgados** para elegirlo hoy. Lo que está medido de verdad:

- Lado comprado: **USD 1,7525 en el ledger** (2026-08-06→15, 4 familias) para 2 orgs; la proyección
  mensual del cliente real es ~USD 4,51 contra USD 50 autorizados.
- Lado grader, org cliente: **USD 0,7025 histórico total** y **cero desde 2026-07-17**. El grader
  **está dormido** — no hay consumo corriente que dimensione un tope.
- Lado grader, global: **USD 9,4222 de vida completa en 45 runs**, de los cuales **87,5% no tiene
  organización atribuida** (USD 8,2432). O sea: el numerador de cualquier tope per-org que se
  calcule hoy con estos datos sería, en su mayor parte, gasto que ni siquiera sabemos de quién es.
- Techo por run del modo `full`: USD 2,00. Promedio de los 3 runs `full` medidos: USD 0,8812.
  Máximo real observado: **USD 1,4565** (73% del techo, y terminó `partial`).

Un tope elegido con eso sería un número inventado con consecuencia real: **el camino público del
lead magnet comparte el motor**, así que un gate mal calibrado no degrada un dashboard interno,
corta captación. Y la calibración pide N≥3 para las dimensiones intermitentes (`TASK-1704`), lo que
sube el consumo por medición sin que sepamos todavía en qué forma (runs separados vs pasadas
intra-run).

Por eso la secuencia es: schema y atribución primero (hacer visible), un ciclo mensual completo
midiendo `wouldBlock` sin bloquear, y recién entonces una decisión de producto sobre el tope con
datos propios. El patrón es el canónico #6 del repo: flag default-OFF → shadow → flip.

### Forma de la señal de drift

```
período = mes calendario en curso
observaciones_aio = COUNT(*) FROM provider_observations o
                    JOIN grader_runs r ON r.run_id = o.run_id
                    WHERE o.provider = 'google_ai_overview'
                      AND o.status IN ('succeeded','failed','rate_limited')   -- 'skipped' no compró
                      AND o.created_at >= date_trunc('month', CURRENT_DATE)
llamadas_ledger   = SUM(call_count) FROM seo_provider_spend_daily
                    WHERE consumer = 'aeo' AND family = 'serp'
                      AND spend_date >= date_trunc('month', CURRENT_DATE)::date
drift             = observaciones_aio - llamadas_ledger
```

Corte por si el perfil del run tiene o no `organization_id`, para separar `warning` de `error`.
Nota de exactitud: `cost` es del **batch**, no de la tarea (límite conocido del transporte,
`dataforseo-families.ts:70-73`), así que la comparación es **de conteo de llamadas**, no de
observaciones-a-dólares. Declararlo en el docstring de la query evita que alguien la "corrija" mal.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- **Slice 1 (migración) → Slice 2 (writer + filtro)**: el filtro `consumer='seo'` no puede existir
  antes de la columna, y el `ON CONFLICT` de 4 columnas no puede existir antes de la UNIQUE de 4
  columnas. Aplicar el código antes de la migración rompe **toda** escritura de gasto.
- **Slice 2 debe ser UN SOLO commit**: `ON CONFLICT` nuevo + filtro `consumer='seo'` +
  `readSeoProviderSpendByConsumer`. Partirlo deja una ventana en que el gasto AEO —cuando llegue—
  se descuenta del presupuesto SEO.
- **Slice 2 → Slice 3**: el transporte no puede propagar `consumer` a un writer que todavía no lo
  acepta.
- **Slice 3 → Slice 5**: la señal de drift necesita que existan filas `consumer='aeo'` para medir
  algo distinto de "todo es drift".
- **Slice 4 puede correr en paralelo con Slice 5** una vez cerrado Slice 2 (lee la tabla ya
  migrada).
- **Slice 6 (enforce) NO se ejecuta en este ciclo.** Es la puerta que queda abierta y documentada;
  el flip exige un ciclo mensual completo de shadow y decisión explícita del operador.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El `ON CONFLICT` del código y la UNIQUE de la base divergen → el UPSERT deja de acumular e inserta filas duplicadas; el presupuesto se subcuenta y nadie ve un error | migration + cost_guard | medium | Migración y writer en el mismo PR + test de paridad `ON CONFLICT` ↔ `pg_constraint` que rompe el build | `growth.dataforseo.spend_ledger_drift`; además el gasto del mes cae de golpe en `readSeoProviderSpendByConsumer` |
| Se aplica el backfill sin el filtro `consumer='seo'` → el gasto del grader empieza a comerse el presupuesto del cliente SEO **sin fallar** | finance/cost_guard | medium | Slice 2 es un único commit; test que afirma que el fragmento canónico contiene el filtro | `seo.rank.capture_lag` subiría si el gate SEO empieza a bloquear captura por presupuesto agotado |
| Drop/recreate de la UNIQUE con escrituras concurrentes del cron de rank capture → error de escritura durante la ventana | migration | low | Aplicar la migración fuera de la ventana del cron `ops-seo-rank-capture` (0 5 * * * CLT); el transporte ya observa y sigue ante fallo del recorder, así que ninguna llamada pagada se pierde | Sentry `dataforseo_spend_recorder` |
| `organizationId` se propaga mal y el gasto del grader se atribuye a la organización **equivocada** | finance/identity | low | La organización se deriva **sólo** server-side de `grader_profiles.organization_id`, nunca del payload del run; test de propagación desde `run-engine` hasta el recorder | `growth.dataforseo.spend_ledger_drift` en corte por organización |
| Se pone `serp.requiresOrganization = true` "para cerrar la deuda" → el grader público deja de poder comprar | growth/public | medium | Regla dura declarada + comentario reescrito en el registry + test que afirma `false` con la razón | Fallo inmediato del camino público en smoke |
| El gate pasa a enforce sin calibrar → corta el camino público del lead magnet | growth/public | medium | Dos flags separados (`ENABLED` shadow / `ENFORCED` bloqueo), ambos default OFF; un ciclo mensual completo antes del flip | `growth.ai_visibility.public_intake_blocked` (existente) |
| El flag se prende sólo en Vercel y el re-grade del ops-worker queda sin gate (o al revés) | cross-runtime | high | Mapa de lectura (`grep -rn "<FLAG>" src/ services/`) en el plan; declaración en `deploy.sh` **y** `--update-env-vars`; fila en el ledger con el runtime | Verificación en la revisión activa de Cloud Run como paso de la secuencia |
| Volumen: la señal de rendimiento cuenta sobre `provider_observations` completa y se degrada con el histórico | reliability | low | Ventana móvil acotada + índice existente `provider_observations_created_idx` | Latencia de `/admin/operations` |

### Feature flags / cutover

- `GROWTH_AEO_BUDGET_GATE_ENABLED` — default `false`. En `true`: `resolveAeoBudget` se computa en el
  chokepoint, se registra `wouldBlock` y alimenta la señal. **No bloquea.** Runtimes: Vercel +
  ops-worker.
- `GROWTH_AEO_BUDGET_GATE_ENFORCED` — default `false`. Subordinado al anterior. En `true`, y sólo con
  el anterior en `true`, el chokepoint bloquea con `blockedReason: 'budget_exhausted'`. Runtimes:
  Vercel + ops-worker.
- Sin flag: la migración, la atribución del gasto y las dos señales. Son aditivas y sólo hacen
  visible lo que ya ocurre; ponerlas detrás de flag retrasaría justamente la visibilidad que la task
  existe para dar.
- Los knobs `GROWTH_AEO_*_MONTHLY_BUDGET_USD` **no son flags** y no van al ledger de flags (mismo
  criterio que los `GROWTH_SEO_*_PER_MONTH`, declarado en `src/lib/growth/seo/flags.ts:23`).
- Revert: env vars a `false` en los dos runtimes + redeploy Vercel + `gcloud run services update`.
  Tiempo estimado: < 10 min.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | `pnpm migrate:down` (drop de 3 columnas + restauración de la UNIQUE original). **Sólo mientras no exista ninguna fila `consumer='aeo'`**; después el rollback correcto es conservar el schema y revertir el código | ~5 min | parcial |
| Slice 2 | `revert PR` — el writer y el fragmento vuelven a la forma de 3 columnas. Exige que Slice 1 siga aplicado o revertido **junto**, nunca desfasados | ~10 min | si |
| Slice 3 | `revert PR` — el adapter vuelve a llamar sin `organizationId`. Efecto: se reabre el punto ciego, no se rompe nada | ~5 min | si |
| Slice 4 | `revert PR` o `GROWTH_AEO_BUDGET_GATE_ENABLED=false`. El resolver es read-only | < 5 min | si |
| Slice 5 | `revert PR` — quitar las dos entradas de `signals.ts`. Sin efecto runtime fuera del tablero | ~5 min | si |
| Slice 6 | Flags a `false` en Vercel + ops-worker + redeploy/update | < 10 min | si |

### Production verification sequence

1. `pnpm migrate:up` en la base compartida **fuera de la ventana 05:00 CLT** del cron de rank
   capture. Verificar con `information_schema.columns` y `pg_constraint`: las 3 columnas, el CHECK
   acoplado, la UNIQUE de 4 columnas y el índice nuevo.
2. Consulta de solo lectura: `SELECT consumer, cost_basis, COUNT(*) FROM ... GROUP BY 1,2` — todas
   las filas históricas deben salir `('seo','invoiced')`. Si aparece cualquier otra combinación,
   **stop & escalate**.
3. Ejecutar `scripts/growth/_sanity-provider-spend-consumer.ts` contra PostgreSQL vía proxy:
   ejercita el `SEO_PROVIDER_SPEND_UPSERT_SQL` productivo con `consumer='seo'` y con
   `consumer='aeo'`, verifica que acumulan en filas distintas, y limpia con `try/finally`.
4. Desplegar el código (Slices 2–3) y correr el cron `ops-seo-rank-capture` en su ciclo normal.
   Verificar que la fila `('seo','serp')` del día siguió acumulando y que el `call_count` cuadra con
   las keywords seguidas.
5. Correr un grader `light` sobre un perfil **con** organización. Verificar en la base la fila
   `consumer='aeo'`, `family='serp'`, `cost_basis='invoiced'`, `price_table_version IS NULL`.
6. Correr un grader `light` sobre un perfil **sin** organización. Verificar que **no** hay fila nueva
   y que la señal de drift lo reporta como no atribuible (`warning`), no como error.
7. Verificar `resolveSeoEntitlement` de la organización del paso 5: `budgetUsedUsd` **no** subió por
   el gasto AEO. Es la prueba directa de que el filtro `consumer='seo'` está vivo.
8. Prender `GROWTH_AEO_BUDGET_GATE_ENABLED=true` en Vercel **y** en ops-worker (declarado en
   `deploy.sh` + `--update-env-vars`). Verificar en la **revisión activa** de Cloud Run que la var
   está presente.
9. Ejercitar un run de portal y confirmar en logs/señal que `wouldBlock` se registró y que el run
   **no** fue bloqueado.
10. Observar las dos señales durante **un mes calendario completo** en `/admin/operations`. Al
    cierre, llevar al operador el `wouldBlock` acumulado por tier con propuesta de tope. **El flip a
    `ENFORCED` es una decisión suya, no un paso de esta task.**

### Out-of-band coordination required

- Dos env vars nuevas en **Vercel** (Production, Preview/develop y el Custom Environment de staging)
  y en **Cloud Run ops-worker**.
- `services/ops-worker/deploy.sh` actualizado en el mismo PR: sus `--set-env-vars` son destructivos y
  borran cualquier var agregada fuera de banda.
- Ninguna coordinación con proveedor externo: DataForSEO no cambia, sólo cambia cómo contabilizamos
  lo que ya le compramos.
- Aviso al operador antes del paso 10: el tope de presupuesto AEO es una decisión comercial (afecta
  qué puede consumir un cliente `contracted`), no una constante técnica.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] `greenhouse_growth.seo_provider_spend_daily` tiene `consumer`, `cost_basis` y
      `price_table_version`, con la UNIQUE `(organization_id, family, spend_date, consumer)` y el
      CHECK acoplado `(cost_basis = 'estimated') = (price_table_version IS NOT NULL)`, verificados
      contra `pg_constraint` en la base real.
- [x] Toda fila preexistente quedó en `consumer='seo'` y `cost_basis='invoiced'`, comprobado por
      consulta agrupada; ninguna quedó NULL.
- [x] No existe una segunda tabla de gasto de proveedor en el repo ni en la base.
- [x] `SEO_PROVIDER_SPEND_UPSERT_SQL` hace `ON CONFLICT (organization_id, family, spend_date, consumer)`
      y un test rompe el build si esa lista diverge de la constraint de la migración.
- [x] `buildSeoProviderSpendMonthlySumSql` filtra `consumer = 'seo'`, y el commit que lo introduce es
      el mismo que introduce el `ON CONFLICT` nuevo.
- [x] **[Resuelto distinto — ver Delta 2026-08-27]** el wrapper queda CONGELADO y el adapter migró a `postDataForSeoTask`, que acepta y propaga `organizationId` y `consumer`; un test
      verifica que un `consumer='aeo'` con organización deja fila con ese consumer.
- [x] `ProviderAdapterContext` transporta `organizationId` derivado **sólo** de
      `grader_profiles.organization_id`; existe un test que falla si el valor puede venir del payload
      del run.
- [x] `DATAFORSEO_FAMILIES.serp.requiresOrganization` sigue en `false`, con la razón escrita en el
      registry y afirmada por test.
- [ ] **[NO OBSERVABLE HOY — paso de rollout, ver Delta 2026-08-27]** Una corrida real `light` sobre un perfil con organización dejó una fila
      `('aeo','serp','invoiced')` en la base, y la corrida equivalente sobre un perfil sin
      organización no dejó fila y quedó reportada por la señal de drift como no atribuible.
- [x] **[verificado con el sanity live en vez de la corrida real]** `resolveSeoEntitlement` de la organización del paso anterior **no** movió su `budgetUsedUsd`.
- [x] `resolveAeoBudget(organizationId)` devuelve `invoicedUsedUsd` y `estimatedUsedUsd` por
      separado, además del total, y nunca presenta una cifra única sin decir de qué está compuesta.
- [x] `resolveAeoEntitlement` conserva su contrato: no ganó campos de dinero.
- [x] `growth.dataforseo.spend_ledger_drift` existe, tiene steady = 0, distingue drift atribuible de
      no atribuible y es visible en `/admin/operations` bajo el rollup `growth`.
- [x] `growth.ai_visibility.observation_yield` existe, corta por provider y es visible en el mismo
      tablero.
- [x] **[flag renombrado a `GROWTH_AI_VISIBILITY_BUDGET_GATE_ENFORCED`, ver Delta]** Con el enforce en `false`, un run que superaría el tope **se ejecuta** y deja
      registro de `wouldBlock`; existe un test que lo afirma.
- [ ] **[PENDIENTE DE ROLLOUT]** declarados en `services/ops-worker/deploy.sh` y en el ledger; falta declararlos en Vercel y verificar en
      la revisión activa de Cloud Run, y tienen fila en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`.
- [x] `pnpm flags:audit --strict --no-vercel` pasa (⚠️ no VE estos flags: regex `process.env.X_ENABLED` vs lectura por constante — ver Delta) y `pnpm docs:closure-check` pasa.
- [x] Ninguna query nueva usa `EXTRACT(EPOCH FROM (date - date))`; el lint
      `greenhouse/no-extract-epoch-from-date-subtraction` queda verde.
- [x] `readSeoProviderSpendByConsumer` está expuesto en el lane ecosystem (sólo bindings `internal`) y como tool MCP `get_seo_provider_spend` en el mismo
      PR, bajo `efeonce.mcp.read`, sin scope nuevo en Entra.
- [x] `pnpm task:lint --task TASK-1696` reporta `template=1 errors=0`.

## Verification

- `pnpm vitest run src/lib/ai src/lib/growth/seo src/lib/growth/ai-visibility src/lib/reliability`
- `pnpm local:check`
- `pnpm migrate:status` + verificación por `information_schema` / `pg_constraint`
- `node --import tsx scripts/growth/_sanity-provider-spend-consumer.ts` contra el proxy de Cloud SQL
- `pnpm flags:audit --strict --no-vercel`
- `pnpm test` (suite completa) + `pnpm build` (producción) como gate de cierre, **con autorización
  explícita del operador antes de correr el build** (consume ~30 GB de memoria).
- `pnpm task:lint --task TASK-1696` y `pnpm ops:lint --changed`
- `pnpm docs:closure-check`
- Pasos 1–9 de `### Production verification sequence` con evidencia real registrada en el cierre; el
  paso 10 queda abierto por diseño (un mes de observación).

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] `TASK-1651` recibe un `## Delta`: toda capability nueva sobre AI Optimization nace con
      `consumer='aeo'` y presupuesto propio; criterio agregado a su `## Acceptance Criteria`.
- [ ] `TASK-1652` recibe un `## Delta` sobre la firma nueva de `postDataForSeoSerpLiveAdvanced`
      (`organizationId` + `consumer`) para evitar un conflicto en `google-ai-overview-adapter.ts`.
- [ ] `TASK-1270` recibe un `## Delta`: al reactivar el re-grade recurrente, el flag del gate debe
      estar declarado también en el ops-worker.
- [ ] `TASK-1246` recibe un `## Delta` declarando que el gate está en shadow y que el flip a enforce
      es una decisión que toca el camino público.
- [ ] El cierre documenta el `wouldBlock` acumulado del ciclo de shadow con la propuesta de tope por
      tier, o declara explícitamente que el ciclo sigue abierto (`code complete, rollout pendiente`).

## Follow-ups

- **Calibrar y prender el enforce**: task derivada con el dato del ciclo de shadow. Debe decidir el
  tope por tier, y si el techo del modo `full` (USD 2) se mueve para que el N≥3 que la calibración
  exige quepa.
- **Presupuesto de tokens per-org**: el gasto construido (LLM) sigue sin gate por organización. Es la
  precondición que la auditoría §6 pone para el análisis de contenido a escala de sitio. Cuando
  aterrice, sus filas entran al mismo ledger con `cost_basis='estimated'` y su
  `price_table_version` — las columnas ya estarán.
- **Margen por cliente**: con el costo variable per-org al dólar y la dimensión de consumidor, el
  margen de Berel es computable. Es la brecha §8 de la auditoría contra `EPIC-022`.
- **Cadencia del AI Overview**: correrlo en todas las keywords todos los días no es señal diaria.
  Task propia de economía de captura.
- **`serp.requiresOrganization`**: evaluar si conviene un tercer estado
  (`optional_with_reason`) que obligue al caller a declarar *por qué* no hay organización, en vez de
  permitir el silencio.

## Delta 2026-08-26

**Esta task adopta `seo.provider.cost_over_budget`, que nueve tasks dan por construida y no existe.**

Barrido verificado: `grep -rIn "cost_over_budget" src services migrations scripts` devuelve **cero**.
La señal aparece en la columna de mitigación de la tabla de riesgos de `TASK-1300`, `1301`, `1302`,
`1303`, `1304`, `1308`, `1309`, `1651` y `1664` — ocho de ellas ya `complete` — y el riesgo que dice
mitigar es siempre el mismo y es el #1 del módulo: *«Costo DataForSEO desbocado»*.

La atribución es **circular**: 1300 dice que la materializa 1303, 1301 dice que la materializa 1303,
1304 dice que la agrega 1303 — y 1303 dice que sus datos *«alimentan `seo.provider.cost_over_budget`
(TASK-1301/1300)»*. Cada una cerró apuntando a la otra. Peor: `TASK-1664` **ya lo había detectado por
escrito** (*«La señal … citada por la spec no existe en código»*) y aun así cerró volviendo a citarla
en su propia tabla de riesgos.

**Matiz que evita sobredimensionarlo:** el control duro sí existe. `enforceSeoRunEntitlement` bloquea
antes de gastar y dos callers re-consultan el gate dentro del bucle, así que el sobregiro intra-batch
está cubierto. Lo que falta es la **detección temprana**, y por eso entra como señal y no como gate.

**Por qué acá y no en una task nueva:** la alarma necesita la dimensión `consumer` de Slice 1 para no
sub-reportar el gasto del grader, y esta task ya toca `signals.ts` en Slice 5. Crearle una task propia
la haría depender de ésta para ser correcta, que es la definición de un slice mal extraído.

Al cerrar esta task, corregir la tabla de riesgos de las nueve que la citan: hasta hoy declaran una
mitigación que no existía.

Origen: `docs/audits/platform/2026-08-26-openseo-competitive-teardown-growth-seo-aeo.md` §3.10.

## Open Questions

- ¿El gasto DataForSEO de un perfil de grader **público** (sin organización) debería registrarse
  contra una organización interna de Efeonce —somos nuestro propio cliente, `EO-ORG-0007`— en vez de
  quedar fuera del ledger? Sería contabilidad más completa, pero mezcla gasto de captación con gasto
  de servicio a cliente. La task resuelve por dejarlo fuera del ledger y visible en la señal;
  revisar cuando exista el modelo de costo de captación.
- ¿`resolveAeoBudget` debe contar el gasto estimado de **todos** los runs del mes, o sólo de los de
  `run_source LIKE 'portal_%'` (como hace el allowance de `resolveAeoEntitlement`)? Contar los
  `smoke` inflaría el consumo de la organización con gasto de plataforma. La task propone excluir
  `smoke` y declararlo en el docstring; confirmar con el operador.
- ¿La señal de rendimiento debe medir sobre `provider_observations` o sobre el par
  `(prompt, provider)` esperado del run? Lo segundo detecta también las combinaciones que **nunca se
  intentaron**; lo primero es más barato. La task propone lo primero y lo declara como límite.
