# TASK-1789 — Growth SEO: content decay — la capacidad que el doc promete y el runtime no tiene

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
- Backend impact: `reader`
- Epic: `EPIC-022`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El §3 de la arquitectura del módulo lista *"Content decay / canibalización — GSC query×page real +
cálculo propio"* como capacidad. **La canibalización existe; el decay no.** Esta task cierra esa
brecha con un reader derivado que detecta páginas que pierden tracción sostenidamente sobre la serie
GSC que ya materializamos — **sin captura nueva y sin gasto de proveedor**.

## Why This Task Exists

Hay dos razones y la segunda importa más que la primera.

**La operativa:** el contenido no se publica y se olvida, se mantiene. La frescura es factor de
ranking en motores de IA y el decay es la señal que dice **qué actualizar primero**. Sin ella, la
decisión editorial se toma por intuición o por lo que el cliente recuerda, y las páginas que
silenciosamente perdieron la mitad de sus impresiones en seis meses no aparecen en ninguna lista.

**La estructural, que es la que la hace P2 y no P3:** el documento de arquitectura **afirma** que la
capacidad existe. Cualquiera que lea §3 —un agente, un miembro nuevo, el propio operador armando una
propuesta— concluye que el módulo detecta decay. Es exactamente la clase de defecto que este módulo
persiguió todo el 2026-08-27: un documento que promete más de lo que el runtime hace. La corrección
tiene dos salidas legítimas —construirlo o retirarlo del doc— y esta task elige la primera porque el
insumo ya está pagado.

**Por qué es barato:** `seo_gsc_daily` ya materializa query×page por día, con espejo BQ e histórico
mayor a 16 meses. El decay es **cálculo sobre datos propios**: cero llamadas al proveedor, cero costo
marginal.

## Goal

- Reader derivado que identifica páginas en decaimiento sostenido sobre la serie GSC propia, con
  ventanas comparables y umbral configurable.
- Distinguir **decay** de **estacionalidad** y de **caída del mercado** — sin esa distinción la señal
  es ruido que hace perder tiempo editorial.
- Lente `●` medida (es GSC), con `as-of`, y **sin ranking propio**: devuelve hechos y factores, no un
  orden de prioridad que después alguien tenga que discutir.
- Expuesto en los tres lanes, sin captura ni gasto nuevo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` — **§3 (la capacidad declarada que esta task materializa)**, §4.2 (`seo_gsc_daily` + espejo BQ + split de lectura por cobertura, no por rango fijo), §5 (lente `●`), §7.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `CLAUDE.md §"SQL embebido — type alignment + live testing"` y §`SQL Signal Reader Schema Validation Gate` — **crítico acá**: el cálculo es SQL con ventanas y aritmética de fechas, justo el terreno del bug class de `TASK-893`.

Reglas obligatorias:

- 🔴 **NUNCA** `EXTRACT(EPOCH FROM (X - Y))` cuando alguno es `DATE`: en PG `date - date = integer`. Usar `(X - Y)::int` o castear ambos a `::timestamptz`.
- **NUNCA** llamar al proveedor: esta task calcula sobre datos propios. Si alguien necesita contexto de mercado, es otro reader.
- **NUNCA** declarar decay sin descartar estacionalidad y caída general del mercado (ver `Detailed Spec §2`).
- **NUNCA** devolver un ranking propio de prioridad: hechos y factores, como `readKeywordGap` de `TASK-1662`.
- **NUNCA** confiar en `db.d.ts` para el tipo de `capture_date`: es `DATE` en PG y el codegen lo infiere `Timestamp`.

## Normative Docs

- `.claude/skills/seo-aeo/modules/02_SEO_CONTENT.md` — el oficio: decay, canibalización, los dos carriles y las trampas de lectura de GSC (piso mínimo de impresiones, doble conteo por sitelinks, curva de CTR propia, largo de la serie).
- `.claude/skills/seo-aeo/modules/07_MEASUREMENT.md` — frescura real de GSC (no hay D-1) y posición ponderada por impresiones.
- `docs/architecture/agent-invariants/SQL_DATE_MATH_AGENT_INVARIANTS.md` — el bug class de aritmética de fechas.

## Dependencies & Impact

### Depends on

- `greenhouse_growth.seo_gsc_daily` — la serie caliente (ventana ~180d).
- `greenhouse_growth_analytics.seo_gsc_history` — el histórico BQ, necesario para ventanas largas.
- `src/lib/growth/seo/performance/read-performance.ts` — **el split de lectura por cobertura ya resuelto**: reusarlo, no reimplementarlo.
- `src/lib/growth/seo/keyword-opportunities-reader.ts` — donde vive la canibalización, la otra mitad de §3.

### Blocks / Impacts

- **`TASK-1700`** (cola priorizada de trabajo) — el decay es un insumo natural de esa cola. Esta task **no** ordena; produce los factores que 1700 consume. Declarar el contrato con ella en Discovery.
- **`TASK-1662`** — mismo patrón de "reader derivado sin orden propio"; copiar su forma.
- **`TASK-1667`/`1668`** (editorial work item / loop de QA) — consumidores naturales del decay como disparador de actualización.

### Files owned

- `src/lib/growth/seo/decay/{detect.ts,reader.ts}`
- `src/lib/growth/seo/decay/__tests__/*.test.ts`
- `src/lib/growth/seo/decay/read-decay.live.test.ts`
- `src/app/api/platform/ecosystem/growth/seo/content-decay/route.ts`
- `src/mcp/greenhouse/{tools.ts,server.ts,http-client.ts}` (aditivo)
- `docs/manual-de-uso/growth/operar-deteccion-de-decay.md`

## Current Repo State

### Already exists

- `seo_gsc_daily` materializada a diario (query×page×día), con espejo BQ `seo_gsc_history` particionado y backfill resumible del pasado.
- **Split de lectura por cobertura ya resuelto** en `readSeoPerformance`: si el primer día de PG llega después del inicio de la ventana pedida, la lectura completa va a BQ. Un corte por N días fijos mentiría en ambas direcciones — y esta task hereda esa solución en vez de repetir el error.
- Canibalización implementada (`keyword-opportunities-reader.ts`): la otra mitad de la promesa de §3.
- Patrón de reader derivado sin ranking propio (`TASK-1662`).

### Gap

- `grep -ri "decay" src/lib/growth/` → **cero**. El único match del backlog es una task de *treasury*, falso positivo.
- §3 de la arquitectura declara la capacidad. El runtime no la tiene.
- Sin decay, la lista de "qué actualizar" no existe y la decisión editorial es intuición.

## Modular Placement Contract

- Topology impact: `api`
- Current home: `src/lib/growth/seo/decay/**`, servido desde el portal Next.js
- Future candidate home: `domain-package`
- Boundary: primitives `detectContentDecay` (puro) y `readContentDecay` (IO); consumers autorizados son `api/platform/**`, la tool MCP y `TASK-1700`
- Server/browser split: cálculo y acceso a datos server-only
- Build impact: `none` — sin dependencia nueva
- Extraction blocker: `none` — lee tablas del propio dominio

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `reader`
- Source of truth afectado: ninguno nuevo — deriva de `seo_gsc_daily` y su espejo BQ
- Consumidores afectados: `api/platform/ecosystem`, MCP, Nexa, `TASK-1700`
- Runtime target: `production`

### Contract surface

- Contrato existente a respetar: `readSeoPerformance` y su split de cobertura; el shape `{ ok }` de los readers.
- Contrato nuevo: `readContentDecay`; tool MCP `get_seo_content_decay`.
- Backward compatibility: `compatible` — sólo agrega.
- Full API parity: reader canónico consumible por UI, Nexa y MCP.

### Data model and invariants

- Entidades afectadas: **ninguna nueva y ninguna migración.** Es lectura derivada.
- Invariantes:
  - Lente `measured` siempre: la fuente es GSC.
  - **Piso mínimo de impresiones** antes de declarar decay: una página que pasó de 4 a 2 impresiones no está decayendo, es ruido.
  - Ventanas **comparables**: mismo largo, y descartando los últimos días que GSC aún no consolidó (~48 h de retraso).
  - Estacionalidad y caída de mercado se reportan como **factores**, no se ocultan en el veredicto.
  - Sin ranking propio: hechos + factores, el orden lo decide el consumer.
  - `null` cuando no hay serie suficiente; **jamás** 0 ni "no hay decay".
- Write-target allowlist: `N/A` — no escribe.
- Tenant/space boundary: `organization_id` + entitlement `seo_v2`, heredado de los readers que reusa.
- Idempotency/concurrency: `N/A` — sólo lectura.
- Audit/outbox/history: sin evento.

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `enabled with rationale` — un reader derivado sin gasto ni escritura no necesita flag; su peor caso es devolver una lista vacía.
- Backfill plan: `N/A`.
- Rollback path: revert del PR.
- External coordination: redeploy del gateway para federar la tool.

### Security and access

- Auth/access gate: heredado; capability de lectura del módulo.
- Sensitive data posture: sin PII; son URLs y métricas agregadas del propio cliente.
- Error contract: `insufficient_history` como estado explícito cuando la serie no alcanza.
- Abuse/rate-limit posture: la lectura puede ser pesada sobre BQ; acotar ventana máxima y reusar el split de cobertura en vez de escanear todo.

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/growth/seo`.
- DB/runtime checks: 🔴 **live test obligatorio contra PG real** — el cálculo es SQL con ventanas y aritmética de fechas, y los mocks ejercitan el TS, no el SQL. `capture_date` es `DATE`, `*_at` es `TIMESTAMPTZ`, y `runGreenhousePostgresQuery` devuelve **array pelado**.
- Integration checks: correr sobre un cliente con >6 meses de serie y otro recién conectado; el segundo debe devolver `insufficient_history`.
- Reliability signals/logs: sin señal nueva.

### Acceptance criteria additions

- [ ] Source of truth y consumidores con paths reales.
- [ ] Invariantes explícitos, incluido el piso de impresiones.
- [ ] Sin migración, justificado.
- [ ] Evidencia runtime con live test contra PG real.
- [ ] Sin PII.

## Capability Definition of Done — Full API Parity gate

- [ ] Cálculo en el primitive, no en la UI ni en el prompt de Nexa.
- [ ] Reader canónico; sin escrituras.
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

### Slice 1 — El detector, puro y testeado

- `detectContentDecay(series, config)`: función pura sobre series ya cargadas, sin IO.
- Config: largo de ventana, piso mínimo de impresiones, umbral de caída, días de consolidación a descartar.
- Tests de tabla con los casos que importan: decay real · ruido de baja base · estacionalidad · caída del mercado · serie insuficiente.

### Slice 2 — El reader, sobre el split de cobertura ya resuelto

- `readContentDecay({ organizationId, range })` reusando `readSeoPerformance` para el split PG/BQ.
- 🔴 Live test contra PG real antes de mergear: el SQL con ventanas no se valida con mocks.
- `insufficient_history` como estado explícito.

### Slice 3 — Factores, no veredicto

- Cada página en decay viaja con sus **factores**: ¿cayó también el mercado para esas queries? ¿es
  estacional contra el mismo período del año anterior? ¿perdió posición o perdió CTR a posición
  estable?
- Esa última distinción es la más accionable: **CTR que cae con posición estable casi siempre se
  explica en la SERP**, no en la página — y el módulo ya marca `aiOverview` en la serie de rank, así
  que el factor se puede nombrar.

### Slice 4 — Lanes + cierre

- Route ecosystem + tool MCP + capability con grant en el mismo PR.
- Delta en §3 de la arquitectura declarando que la capacidad **ya existe** (cerrar la brecha doc↔runtime).
- Runbook, `Handoff.md`, `changelog.md`.

## Out of Scope

- **Ordenar el trabajo editorial.** Esta task produce hechos y factores; la cola priorizada es `TASK-1700`.
- **Actualizar el contenido.** Detectar ≠ arreglar; la producción es del Content Factory.
- **Decay de dominios ajenos.** Requiere serie de mercado, no GSC; sería otra task con costo de proveedor.
- **Superficie visible** — task `ui-ux` posterior.
- **Canibalización** — ya existe en `keyword-opportunities-reader.ts`.
- **Cualquier llamada al proveedor.** Si el cálculo "necesita" DataForSEO, el diseño se salió del alcance.

## Detailed Spec

### 1. Las trampas de leer GSC, que el oficio ya documenta

El módulo `02_SEO_CONTENT` del oficio nombra cuatro y las cuatro aplican acá:

- **Piso mínimo de impresiones.** Sin él, toda página de cola larga "decae" cada semana.
- **Doble conteo por sitelinks**, que infla impresiones de la home y simula caídas cuando desaparecen.
- **Curva de CTR propia**, no la de la industria: comparar contra un benchmark externo produce falsos positivos sistemáticos.
- **Largo de la serie**: GSC consolida con ~48 h de retraso y **no hay D-1**. Incluir los últimos días sin consolidar simula decay en toda la cartera, todos los días.

Esa última es la que más rápido rompe la confianza: un reporte que dice "todo está cayendo" cada
lunes se deja de leer en dos semanas.

### 2. Decay vs estacionalidad vs mercado

Tres causas producen la misma curva descendente y exigen tres respuestas distintas:

| Causa | Cómo se distingue | Qué se hace |
|---|---|---|
| **Decay real** | Cae contra ventana comparable **y** contra el mismo período del año anterior | Actualizar la página |
| **Estacionalidad** | Cae ahora pero cayó igual el año pasado | Nada; es el ciclo |
| **Caída de mercado** | Cae el volumen de las queries, no la posición | No es problema de la página |

Sin esta separación, la lista de decay manda al equipo editorial a reescribir páginas que están bien.
Por eso los factores viajan **junto al hecho** y el reader no emite veredicto.

### 3. El caso que más vale: CTR cae con posición estable

Es la señal de que la SERP cambió —típicamente un AI Overview capturando el click— y no la página. El
módulo ya marca `aiOverview` dentro de la serie de rank (`Delta 2026-08-07`, `TASK-1307`), así que
este factor **se puede nombrar con dato propio** en vez de conjeturarlo. Es además el puente natural
SEO↔AEO del módulo, y se compone en memoria sin tocar el boundary §1.1.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (detector puro) → Slice 2 (reader con IO). El detector se testea sin base antes de tocar SQL.
- 🔴 Slice 2 no cierra sin **live test contra PG real**: es SQL con ventanas y aritmética de fechas, el terreno exacto del bug class de `TASK-893`.
- Slice 3 después de Slice 2.
- Slice 4 al final.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Incluir los días sin consolidar de GSC y reportar decay en toda la cartera cada día | credibilidad | **high** | Descartar los días de consolidación por configuración; test del caso | Un reporte que dice "todo cae" cada semana |
| Falsos positivos de cola larga por no aplicar piso de impresiones | credibilidad | **high** | Piso mínimo configurable y obligatorio; test de baja base | Lista de decay dominada por páginas irrelevantes |
| Confundir estacionalidad con decay y mandar a reescribir contenido sano | operación | medium | Comparación interanual como factor obligatorio | Equipo editorial reescribiendo páginas que se recuperan solas |
| `EXTRACT(EPOCH FROM (date - date))` revienta en runtime | runtime | medium | Invariante declarado + lint rule `no-extract-epoch-from-date-subtraction` + live test | Error PG en el primer uso real |
| Escaneo pesado sobre BQ por ventana sin acotar | costo | medium | Reusar el split de cobertura; ventana máxima acotada | Costo de consulta BQ |
| El reader emite un ranking y `TASK-1700` emite otro distinto | contrato | medium | Regla dura: hechos y factores, sin orden propio; mismo patrón que `TASK-1662` | Dos prioridades distintas para la misma página |

### Feature flags / cutover

Sin flag — reader derivado, sin escritura ni gasto. Su peor caso es devolver una lista vacía, que es
el comportamiento actual. Gatearlo agregaría una palanca que nadie necesitaría mover.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert PR — función pura | < 5 min | sí |
| Slice 2 | Revert PR — sólo lectura, sin estado | < 10 min | sí |
| Slice 3 | Revert PR | < 10 min | sí |
| Slice 4 | Revert de rutas + retirar tool del MCP | < 10 min | sí |

### Production verification sequence

1. Live test contra PG real verde.
2. Deploy; correr sobre un cliente con **más de 6 meses** de serie y revisar la lista a mano con un especialista: ¿son páginas que efectivamente decayeron?
3. Correr sobre un cliente recién conectado: `insufficient_history`, no lista vacía.
4. Verificar que los últimos días sin consolidar **no** aparecen como decay.
5. Redeploy del gateway y canary de la tool.

### Out-of-band coordination required

- Redeploy del gateway para federar la tool.
- Revisión con un especialista SEO de la primera lista real: la calibración de umbrales es juicio de oficio, no de código.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `detectContentDecay` es puro y tiene tests de tabla para decay real, ruido de baja base, estacionalidad, caída de mercado y serie insuficiente.
- [ ] Los días que GSC aún no consolidó se descartan; probado con test.
- [ ] Existe piso mínimo de impresiones y es configurable.
- [ ] Cada página en decay viaja con sus **factores**, incluido "CTR cae con posición estable".
- [ ] El reader **no** devuelve ranking propio de prioridad.
- [ ] Una organización sin serie suficiente devuelve `insufficient_history`, nunca lista vacía.
- [ ] Existe live test contra PG real y pasó.
- [ ] Ninguna consulta usa `EXTRACT(EPOCH FROM (date - date))`.
- [ ] Cero llamadas al proveedor: el gasto en `seo_provider_spend_daily` no se mueve.
- [ ] El §3 de la arquitectura quedó actualizado: la capacidad declarada ahora existe.
- [ ] La tool MCP responde por el lane ecosystem con canary verde.

## Verification

- `pnpm local:check`
- `pnpm vitest run src/lib/growth/seo`
- `pnpm test` (gate de cierre)
- Live test contra PG real vía proxy
- Revisión de la primera lista real con un especialista

## Closing Protocol

- [ ] `Lifecycle` sincronizado con el estado real
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] impacto cruzado sobre `TASK-1700`, `TASK-1667`, `TASK-1668` y `TASK-1662`
- [ ] delta en `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §3 cerrando la brecha doc↔runtime
- [ ] runbook creado

## Follow-ups

- Decay de dominios ajenos usando serie de mercado, si el negocio lo justifica (tiene costo de proveedor).
- Alimentar la cola priorizada de `TASK-1700` con estos factores.
- Evaluar si el factor "CTR cae con posición estable + AIO presente" merece su propia señal de reliability.

## Open Questions

- ¿Cuál es el largo de ventana canónico: 28 días contra 28, o 90 contra 90? Propuesta: configurable con default de 28 y calibración con especialista.
- ¿El piso mínimo de impresiones es absoluto o percentil de la propia cartera del cliente? El percentil se adapta mejor a clientes chicos.
