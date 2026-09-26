# TASK-1901 — Efeonce Insights: evidencia más rica para más familias de gráfico

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
- Backend impact: `reader`
- Epic: `EPIC-045`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `data`
- Blocked by: `none` (el contrato editorial v2 quedó completo y en producción el 2026-09-26)
- Branch: `Greenhouse develop; sin worktrees ni rama por task`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Los informes de Efeonce Insights salen casi con un solo tipo de gráfico porque los adapters resumen la evidencia en
un total por período, aunque la base guarda mucho más. Esta task hace que los dueños de cada dominio entreguen tres
evidencias que ya existen: la serie diaria de Search Console, las posiciones por keyword a lo largo del tiempo y el
historial de mediciones del grader de IA. Con eso el planner emite tendencia diaria, columnas por tramo de posición,
mapa de calor de keywords y medidor con período anterior. Todo sale de hechos citables, nada se inventa.

## Why This Task Exists

La matriz familia × evidencia de TASK-1888 (`editorial/family-evidence-matrix.ts`) marca 11 de 15 familias como
`no_evidence`. Una edición real mensual de Berel (EO-INS-000019, 2026-09-25) salió sólo con comparaciones y columnas.
La causa no es la falta de datos. Una consulta de sólo lectura a la base el mismo día mostró que existen:

- **Search Console diario:** `greenhouse_growth.seo_gsc_daily`, con 52 días, 1.585 páginas y 30.770 consultas para
  Berel. El adapter SEO (`adapters/seo-adapter.ts`) sólo entrega el total de la ventana.
- **Posiciones por keyword:** `greenhouse_growth.seo_rank_snapshots`, con 31 keywords en 68 fechas desde 2025-08-08.
  El adapter sólo entrega agregados (posición media, keywords en primera página).
- **Grader de IA:** `greenhouse_growth.grader_runs`, con 4 mediciones de 2026-06-29 a 2026-09-03. El adapter AEO lee
  sólo el último informe (`readClientGraderReport` sin `runId`), así que no hay período anterior ni serie.

La matriz lo documenta como deuda («Search Console sólo entrega totales del período»; «el adapter AEO lee sólo el
ÚLTIMO run del grader»), y el Follow-up de TASK-1888 lo deja explícito: evidencia nueva por dominio dueño cuando un
informe real la pida. El operador la pidió el 2026-09-25.

## Goal

- Una edición mensual SEO + AEO real compone con tendencia diaria, tramos de posición, mapa de calor de keywords y
  medidor del puntaje de IA, además de las comparaciones actuales, cuando los datos existen.
- Cada cifra nueva es un hecho del snapshot, con `method`, `source`, `coverage` y `evidenceRef`, leído del reader del
  dominio dueño; nada de eso lo calcula el render.
- La matriz familia × evidencia refleja lo que de verdad se produce, y ninguna familia aparece sin su evidencia.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md` (§5 ventana y contrato de datos, §14.8 TASK-1888, §14.9 TASK-1889)
- `docs/architecture/EFEONCE_INSIGHTS_PLATFORM_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `.claude/rules/efeonce-insights.md` (auto-load) y la skill `efeonce-insights`

Reglas obligatorias:

- Los adapters (`adapters/seo|aeo|ico`) consumen **sólo readers del dominio dueño**. Nunca leen tablas ajenas
  inline, nunca importan `@/lib/client-portal/*`. Si falta un reader, se agrega en el dominio dueño
  (`src/lib/growth/seo/**`, `src/lib/growth/ai-visibility/**`), no en Insights.
- Las ventanas son `[start, end)` en zona IANA y se resuelven en `window.ts`. Nunca se recalculan inline.
- Toda cifra de un gráfico es un hecho del snapshot. Una media móvil o un conteo por tramo es un hecho derivado **en el
  reader dueño**, con `method` que lo declara. El render nunca calcula esas cifras.
- El snapshot sellado y el plan congelado son inmutables. Esta task no reescribe ediciones existentes.
- La matriz familia × evidencia es la única autoridad sobre qué familia se produce por módulo.

## Normative Docs

- `docs/tasks/complete/TASK-1888-efeonce-insights-editorial-contract-v2.md` (contrato v2, lectura por figura, matriz)
- `docs/tasks/in-progress/TASK-1889-efeonce-insights-premium-catalogs.md` (páginas de figura y regla de familia del render)
- `docs/ui/reviews/TASK-1889-efeonce-insights-premium-catalogs/README.md` (qué revelaron las ediciones reales)

## Dependencies & Impact

### Depends on

- `TASK-1888`: contrato v2 (`ChartSpecV1` con `data`, `dimensionChannelIds`, `readings`, `essentials`), en develop.
- `TASK-1889`: render por familia (`src/lib/efeonce-insights/render/figure-slots.ts`, `hasFigurePage`), en develop.
- Tablas `greenhouse_growth.seo_gsc_daily`, `greenhouse_growth.seo_rank_snapshots` (vía `seo_targets`) y
  `greenhouse_growth.grader_runs`, verificadas con datos de Berel el 2026-09-25.

### Blocks / Impacts

- `TASK-1902`: páginas de medidor y mapa de calor, y la regla de columnas por tramo del render.
- `TASK-1849` (builder) y `TASK-1875` (web en Think): consumen las mismas ediciones; más familias no les cambian el
  contrato.

### Files owned

- `src/lib/efeonce-insights/adapters/seo-adapter.ts`
- `src/lib/efeonce-insights/adapters/aeo-adapter.ts`
- `src/lib/efeonce-insights/adapters/adapters.test.ts`
- `src/lib/efeonce-insights/editorial/family-evidence-matrix.ts`
- `src/lib/efeonce-insights/editorial/editorial-v2.ts` (productores nuevos de figura y lectura)
- `src/lib/efeonce-insights/contracts/chart-spec.ts` (campo aditivo `dimensionKind`)
- `src/lib/growth/seo/**` (readers nuevos o extendidos para serie diaria y tramos) `[verificar]` nombre exacto del reader
- `src/lib/growth/ai-visibility/**` (reader de historial de mediciones por ventana) `[verificar]`
- `docs/architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md` (delta de §5 y nueva subsección de §14)

## Current Repo State

### Already exists

- Adapter SEO con total de ventana desde `seo_gsc_daily` (`evidenceRef seo_gsc_daily:<org>:<start>_<end>`) y
  agregados de `seo_rank_snapshots` (`src/lib/efeonce-insights/adapters/seo-adapter.ts`).
- Reader de evolución de posiciones del dominio SEO: `readRankEvolution` y `RANK_EVOLUTION_HOT_WINDOW_DAYS = 180`
  (`src/lib/growth/seo/rank-evolution-reader.ts`).
- Adapter AEO sobre `readClientGraderReport({ organizationId })` (`src/lib/growth/ai-visibility/client/command.ts`),
  que devuelve sólo el último informe.
- Productores de línea (`lineCharts`, ≥ 3 meses) y de bullet ICO en `editorial/editorial-v2.ts`. Matriz en
  `editorial/family-evidence-matrix.ts`.
- Render de tendencia (hasta 3 series por rol, un hueco corta la línea) y de columnas en `render/figure-slots.ts` y
  `artifact-composer/catalogs/insights-shared/figure-svg.ts`.

### Gap

- No hay hechos diarios de Search Console. La línea exige ≥ 3 meses, y un informe mensual nunca la tiene.
- No hay hechos de keywords por tramo de posición ni por keyword × semana.
- No hay puntaje de IA de la ventana anterior. El medidor (`gauge`) exige `previousFactId` y queda sin productor.
- `ChartSpecV1` no distingue si las dimensiones son métricas, canales o tramos. El render decide columnas con
  `dimensionChannelIds`, y los tramos de posición no son canales.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/efeonce-insights/**` (adapters, editorial) y readers en `src/lib/growth/seo/**` y `src/lib/growth/ai-visibility/**`
- Future candidate home: `domain-package`
- Boundary: los readers del dominio Growth son la única fuente; Insights los consume por sus adapters, y el render sólo lee el plan congelado
- Server/browser split: readers y adapters son server-only (Postgres); los contratos de `contracts/chart-spec.ts` siguen browser-safe
- Build impact: none — sin SDK nuevo ni filesystem input
- Extraction blocker: los readers de Growth comparten el pool Postgres del portal

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `reader`
- Source of truth afectado: `greenhouse_growth.seo_gsc_daily`, `greenhouse_growth.seo_rank_snapshots`, `greenhouse_growth.grader_runs` (sólo lectura)
- Consumidores afectados: planner determinista y con IA de Insights, mappers del render (informe A4 y deck), web de Think
- Runtime target: `local|staging|production` (generación de ediciones en Vercel; render en el Job `artifact-worker`)

### Contract surface

- Contrato existente a respetar: `EvidenceFactV1` y `ChartSpecV1` (`src/lib/efeonce-insights/contracts/*`), `ModuleReportAdapterV1`
- Contrato nuevo o modificado: hechos nuevos por adapter (serie diaria, tramo × período, keyword × semana, puntaje por medición); campo aditivo `ChartSpecV1.dimensionKind?: 'metric' | 'channel' | 'bucket' | 'time'`; filas de la matriz que pasan a `producer_now`
- Backward compatibility: `compatible` — campos aditivos; un plan sellado sin `dimensionKind` compone igual que hoy
- Full API parity: los hechos nuevos viajan por el contrato de evidencia existente (API/MCP de Insights los exponen sin endpoint nuevo)

### Data model and invariants

- Entidades/tablas/views afectadas: las tres tablas de Growth, sólo lectura; `greenhouse_insights` (snapshot) sin cambio de schema
- Invariantes que no se pueden romper:
  - una cifra de gráfico es siempre un hecho con `evidenceRef`; una media móvil de 7 días o un conteo por tramo se declaran en `method` y los calcula el reader dueño;
  - un día sin dato es un hueco (`null`), nunca cero; la media móvil no rellena días faltantes;
  - un tramo de posición se cuenta sobre el **mismo conjunto de keywords** en los dos períodos, y si el conjunto cambió se declara en `coverage`;
  - el puntaje de IA «anterior» es el de la última medición **dentro** de la ventana de comparación; si no hay, el medidor no se produce;
  - la marca frente a sin marca queda fuera hasta que el operador decida la regla (Open Questions).
- Write-target allowlist: `N/A` — sólo lectura; esta task no escribe tablas
- Tenant/space boundary: todo reader filtra por `organization_id` resuelto por la autorización de Insights (módulo `insights_v1`); `seo_rank_snapshots` se une por `seo_targets.organization_id`
- Idempotency/concurrency: la recolección es pura sobre la ventana; misma ventana ⇒ mismos hechos (determinista para el `request_hash`)
- Audit/outbox/history: sin evento nuevo; el snapshot sellado es el registro

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: detrás de `INSIGHTS_EDITORIAL_V2_ENABLED` (TASK-1888). Con el flag OFF, el adapter v1 no cambia
- Backfill plan: sin backfill; las ediciones ya selladas no se tocan
- Rollback path: revert del commit; las ediciones nuevas vuelven a las familias actuales
- External coordination: ninguna; el operador revisa las ediciones reales antes de compartir

### Security and access

- Auth/access gate: los tres planos de Insights (`insights_v1` + capability `insights.*` + audiencia); ningún reader se expone fuera de ellos
- Sensitive data posture: consultas de Search Console pueden contener datos del cliente; nunca van al log ni a un error; las keywords van al documento sólo si el cliente es la audiencia
- Error contract: `captureWithDomain(err, 'insights', …)`; un reader que falla degrada la familia (rechazo con causa en `rejections`), no la edición
- Abuse/rate-limit posture: los readers limitan por ventana (máximo de días declarado en `window.ts`) y por keywords (tope declarado)

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/efeonce-insights src/lib/growth/seo src/lib/growth/ai-visibility`; `pnpm typecheck`
- DB/runtime checks: `scripts/insights/preview-edition.ts --editorial-v2 --plan-only` sobre Berel (EO-INS-000019) y una edición ICO de Sky, con el resumen de familias y hechos de referencia
- Integration checks: composición completa de informe y deck con `preview-edition.ts --editorial-v2`
- Reliability signals/logs: los rechazos por familia quedan en `rejections` del snapshot; sin signal nueva
- Production verification sequence: ver `## Rollout Plan & Risk Matrix`

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

### Slice 1 — Contrato: `dimensionKind` en `ChartSpecV1`

- Campo aditivo `dimensionKind?: 'metric' | 'channel' | 'bucket' | 'time'` con validación estructural.
- Los productores actuales lo declaran (comparación de métricas = `metric`, presencia por motor = `channel`).
- Test de compatibilidad: un spec sellado sin el campo valida y compone igual.

### Slice 2 — SEO: serie diaria de Search Console y línea diaria

- Reader dueño en `src/lib/growth/seo/**` que entrega clics e impresiones por día de la ventana y de la comparación, más la media móvil de 7 días declarada en `method`.
- Adapter SEO: hechos diarios con `dimension.day` y granularidad `day`.
- Productor de línea diaria en `editorial-v2.ts` (principal: media del período; detalle: diario; referencia: media del anterior), con su lectura por figura.

### Slice 3 — SEO: tramos de posición y keyword × semana

- Reader dueño sobre `readRankEvolution` [verificar]: conteo de keywords por tramo (1–3, 4–10, 11–20, 21–50) en el período y en el anterior, sobre el mismo conjunto; y posición por keyword × semana de la ventana (hasta el tope de keywords prioritarias).
- Productores: columnas por tramo (`bar_grouped`, `dimensionKind: 'bucket'`) y `heatmap` keyword × semana.

### Slice 4 — AEO: historial de mediciones del grader

- Reader dueño en `src/lib/growth/ai-visibility/**` que devuelve el puntaje de la última medición de la ventana y el de la ventana de comparación.
- Productor de `gauge` (valor, anterior y, si existe, meta) y de línea del puntaje cuando hay ≥ 3 mediciones.

### Slice 5 — Matriz, readings y verificación con datos reales

- La matriz marca `producer_now` sólo lo que los slices anteriores entregan, con la evidencia nombrada.
- Lectura por figura (`readings`) de cada familia nueva, con conclusión dentro de `PLAN_CONCLUSION_MAX_CHARS`.
- `preview-edition --editorial-v2 --plan-only` de Berel y Sky con el resumen de familias en la task.

## Out of Scope

- Plantillas del informe y del deck para medidor y mapa de calor, y la regla de columnas por tramo del render (TASK-1902).
- Composición marca frente a sin marca (necesita decisión del operador; ver Open Questions).
- Metas acordadas por cliente para SEO y AEO (función de producto nueva; Follow-up).
- Conjuntos por consulta del grader (Venn, UpSet) y embudo de CRM (Follow-up de TASK-1888).
- Reescribir ediciones ya selladas.

## Detailed Spec

Familias y evidencia que esta task habilita (la página vive en TASK-1889 o TASK-1902):

| Familia | Evidencia | Módulo | Página |
|---|---|---|---|
| `line` diaria | clics/impresiones por día + media 7 días (período y anterior) | SEO | ya existe (tendencia) |
| `bar_grouped` por tramo | keywords por tramo, período y anterior, mismo conjunto | SEO | columnas (regla `bucket` en TASK-1902) |
| `heatmap` | posición por keyword × semana | SEO | TASK-1902 |
| `gauge` | puntaje de IA de la ventana y de la comparación | AEO | TASK-1902 |
| `line` de puntaje | ≥ 3 mediciones en la ventana ampliada | AEO | ya existe (tendencia) |

Tramos por defecto: 1–3, 4–10, 11–20, 21–50; «primera página» = 1–10 como franja (`columnBand`), sólo si el plan la declara.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (contrato) → Slices 2, 3 y 4 (independientes entre sí) → Slice 5 (matriz y verificación).
- La matriz no marca `producer_now` una familia antes de que su reader y su productor estén en develop con tests.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Una familia nueva sin página rechaza la edición | render / worker | medium | `hasFigurePage` en el planner: sin página, sin figura ni esencial | rechazo `render_rejected` con causa |
| Media móvil o conteo calculados fuera del reader dueño | data | low | invariante + test que exige `method` y `evidenceRef` en cada hecho nuevo | validador del plan |
| Tramos comparados sobre conjuntos distintos de keywords | data | medium | mismo conjunto o `coverage` declarado; test con cambio de conjunto | lectura por figura lo dice |
| Consultas del cliente en logs | data / privacy | low | sin log de filas; errores por `captureWithDomain` sin payload | revisión de logs en la vista previa |
| Snapshot más pesado por series diarias | Postgres / Vercel | low | tope de días por ventana y de keywords | tiempo de generación en la vista previa |

### Feature flags / cutover

- Sin flag propio: todo va detrás de `INSIGHTS_EDITORIAL_V2_ENABLED` (TASK-1888, OFF). Con OFF, el contrato v1 no cambia.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert del commit; el campo es aditivo | < 15 min | si |
| Slices 2–4 | revert del commit del reader/productor; la matriz vuelve a `no_evidence` | < 15 min | si |
| Slice 5 | revert de la matriz | < 15 min | si |

### Production verification sequence

1. Local: `preview-edition --editorial-v2 --plan-only` y composición completa de Berel y Sky.
2. Staging: edición interna con el flag de TASK-1888 ON; revisión del operador.
3. Producción por el control plane junto con TASK-1888/1889; edición interna revisada antes de compartir con clientes.

### Out-of-band coordination required

- Decisión del operador sobre la regla de marca (Open Questions), sólo si se quiere la composición marca / sin marca.
- Ninguna coordinación externa más: los readers son internos y de sólo lectura.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `ChartSpecV1.dimensionKind` existe, es opcional y un spec sellado sin él valida y compone igual (test).
- [ ] El adapter SEO entrega hechos diarios de clics e impresiones y la media de 7 días declarada en `method`, leídos de un reader de `src/lib/growth/seo/**`; un día sin dato es `null` (test).
- [ ] El adapter SEO entrega keywords por tramo del período y del anterior sobre el mismo conjunto, y posición por keyword × semana (test con cambio de conjunto).
- [ ] El adapter AEO entrega el puntaje de la ventana y el de la comparación desde un reader de `src/lib/growth/ai-visibility/**`; sin medición en la comparación, no hay medidor (test).
- [ ] La matriz familia × evidencia marca `producer_now` sólo las familias con reader y productor en develop.
- [ ] Cada figura nueva tiene lectura por figura con conclusión ≤ `PLAN_CONCLUSION_MAX_CHARS`.
- [ ] `preview-edition --editorial-v2` de Berel compone informe y deck con al menos tendencia diaria y tramos de posición; el resumen de familias queda en la task.
- [ ] Source of truth, contract surface y consumidores quedan nombrados con paths reales; los invariantes y el límite de tenant quedan explícitos.
- [ ] Ningún reader nuevo escribe en la base ni loguea filas con consultas del cliente.

## Verification

- `pnpm typecheck`
- `pnpm vitest run src/lib/efeonce-insights src/lib/growth/seo src/lib/growth/ai-visibility`
- `pnpm test` (suite completa al cierre)
- `scripts/insights/preview-edition.ts --editorial-v2 [--plan-only]` con Berel y Sky
- `pnpm task:lint --task TASK-1901`, `pnpm docs:closure-check`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Skill `efeonce-insights` actualizada (ledger, contratos, operación, lecciones) y espejada a `.codex/`.
- [ ] Arquitectura de Insights con el delta de §5 y la subsección de §14 de esta task.

## Follow-ups

- Composición marca frente a sin marca, cuando el operador decida la regla.
- Metas acordadas por cliente y por mes para SEO y AEO (dónde se cargan, quién las aprueba), que habilitan metas fuera de ICO.
- Conjuntos por consulta del grader (Venn, UpSet) y embudo de CRM.

## Open Questions

- ¿Qué consulta de Search Console cuenta como «de marca»? Opciones: lista de términos de marca por organización, o el nombre de la organización y sus variantes. Sin esta decisión, la composición marca / sin marca queda fuera.
- ¿Las keywords del mapa de calor son todas las medidas o una lista de prioritarias acordada con el cliente? El canvas muestra 8 «prioritarias acordadas».
