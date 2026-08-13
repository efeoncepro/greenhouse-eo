# TASK-1690 — Growth SEO: la superficie cliente sirve a la población, no al tenant con historia

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
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
- Status real: `Sin empezar` — hallazgo medido en el cierre de TASK-1310
- Rank: `TBD`
- Domain: `growth`
- Blocked by: `none`
- Branch: `develop`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

La superficie cliente del módulo SEO (`/growth/seo`, TASK-1310) decide si hay datos con **una** fuente
y calcula su KPI principal con **otra**: `readSeoOverviewConnection` resuelve `connected` mirando
`seo_gsc_daily`, y el Resumen deriva posición media, keywords y top-10 desde `readRankEvolution`, que
lee `seo_rank_snapshots`. Cuando una organización tiene Search Console conectado pero la captura de
rank todavía no corre, la página **no** cae en su empty state: renderiza el dashboard completo con el
KPI en "sin dato" y el Quadrant poblado debajo. Esta task hace explícita la cobertura por fuente en el
contrato del reader y le da a cada estado de la población un fixture determinista con su test.

## Why This Task Exists

Ese estado no es un borde: **es el día 1 de todo cliente nuevo.** Conectar Search Console es un OAuth
barato y va primero; la captura de rank cuesta por keyword y arranca después de decidir cuáles seguir
(`trackKeywords`, TASK-1308, con techo gobernado). Entre una cosa y la otra pasan días o semanas, y en
esa ventana el cliente ve su panel contradiciéndose.

No se detectó antes porque **la superficie tiene una sola organización cliente** y esa organización
tiene las dos fuentes pobladas. Con N=1 ningún dato real puede producir el estado; sin fixture, ningún
gate puede mirarlo. Medición del 2026-08-13:

| Organización | GSC | Rank snapshots | Keywords seguidas |
|---|---|---|---|
| Grupo Berel (cliente) | 10 días | 28 días · 31 keywords | 31 |
| Efeonce (interna, no renderiza la superficie cliente) | 7 días | **ninguno** | **0** |

El caso "GSC sí / rank no" ya existe en la base — en la organización que por ser tenant interno nunca
abre esta superficie. El primer cliente que lo estrene lo va a estrenar en producción.

## Goal

- Exponer la cobertura **por fuente** en el contrato de `readSeoClientSurface`, de modo que un consumer
  no pueda mostrar "sin dato" sin saber **qué** dato falta.
- Cubrir los estados reales de la población con fixtures deterministas + tests, no con un único caso feliz.
- Dejar un guard que impida que la puerta de entrada (`connection.state`) y el KPI principal vuelvan a
  decidirse con fuentes distintas sin declararlo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` — §7 (readers), §10.2 (cliente curado,
  honesto, mono-Space), §10.5 (estados / medido ● vs estimado ◑ / sin GSC), §11 (packaging).
- `.claude/rules/growth-seo.md` — boundary §1.1 SEO↔AEO y degradación honesta (`no_seo_data`/
  `no_aeo_data`, sin ceros fantasma).
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md` — §"Gates do not read; they measure".

Reglas obligatorias:

- **NUNCA** convertir una ausencia en `0`. Una fuente que no midió se declara, no se rellena.
- **NUNCA** promediar ni mezclar la señal medida de Search Console con la de seguimiento de posición:
  son fuentes distintas con ventanas distintas y la superficie ya las separa (● medido / ◑ estimado).
- **NUNCA** fusionar SEO y AEO en un número (boundary §1.1). Esta task no toca el quadrant.
- El fixture es **infraestructura de verificación**, no un segundo runtime: vive junto al existente y
  sólo lo consumen las rutas `/mockup` autenticadas.

## Normative Docs

- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md`
- `docs/tasks/complete/TASK-1310-growth-seo-client-dashboard-report-artifact.md` (Delta 2026-08-12)

## Dependencies & Impact

### Depends on

- `TASK-1310` — la superficie cliente y su arnés de fixture (`/growth/seo/mockup`). **Complete.**
- `TASK-1305` / `TASK-1303` — `readSeoAeoGap` y `readRankEvolution`. **Complete.**

### Blocks / Impacts

- Cualquier alta de cliente nuevo en el módulo: hoy su primer día es el estado no verificado.
- Consumer UI de la decisión (cómo se rinde la ausencia declarada) — follow-up `ui-ux`, ver Follow-ups.

### Files owned

- `src/lib/growth/seo/client/read-seo-client-surface.ts`
- `src/lib/growth/seo/client/mock-surface.ts`
- `src/app/(dashboard)/growth/seo/mockup/page.tsx` + `report/mockup/page.tsx` (selector `?fixture=`)
- `scripts/frontend/scenarios/growth-seo-client-mockup*.scenario.ts`
- tests nuevos en `src/lib/growth/seo/client/`

## Current Repo State

### Already exists

- `readSeoClientSurface(organizationId)` compone `readSeoOverviewConnection` + `resolveActiveSeoTargetId`
  + `readRankEvolution` + `readSeoAeoGap` con `Promise.allSettled` y expone `rankReaderFailed`/`gapReaderFailed`.
- `readSeoOverviewConnection` resuelve `connected | not_connected | no_snapshots` **desde `seo_gsc_daily`**.
- `SEO_CLIENT_MOCK_SURFACE`: un único fixture poblado, consumido por las dos rutas `/mockup`.
- Estados de página ya implementados para `not_connected`, `no_snapshots` y doble fallo de readers.

### Gap

- El contrato no distingue "no hay conexión" de "hay conexión y no hay captura de rank": ambos llegan a
  la vista como ausencia genérica, y el consumer no tiene con qué nombrar la fuente faltante.
- No existe fixture para: onboarding (GSC sí / rank no), muestra escasa, sin AEO, fallo parcial de un
  reader, ni locked. El arnés sólo puede exhibir el caso feliz.
- `resolveActiveSeoTarget` hace `ORDER BY created_at DESC LIMIT 1`: hoy nadie tiene dos targets, así que
  es correcto por suerte, no por diseño. Fuera de alcance acá; ver Follow-ups.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/growth/seo/client/**` dentro del portal Greenhouse.
- Future candidate home: `portal`
- Boundary: `readSeoClientSurface` sigue siendo un **adapter de composición**, no una fuente de verdad
  nueva: no consulta tablas por su cuenta ni recalcula lo que sus readers ya resuelven.
- Server/browser split: readers y resolución de tenant server-only; el fixture es data plana browser-safe
  sin DB, secretos ni SDK de proveedor.
- Build impact: ninguno — sin dependencias nuevas.
- Extraction blocker: `none`.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `reader` (contrato de composición; sin nueva fuente de verdad)
- Source of truth afectado: ninguno nuevo. `seo_gsc_daily` y `seo_rank_snapshots` siguen siendo dueños
  de su señal.
- Consumidores afectados: superficie cliente SEO (dashboard + report artifact) y sus rutas `/mockup`.
- Runtime target: `local|staging`

### Contract surface

- Contrato existente a respetar: `SeoClientSurfaceRead` y los `*Result` de los readers (`ok:false` +
  `errorCode`), que ya degradan honestamente.
- Contrato nuevo: la cobertura **por fuente** se hace explícita en `SeoClientSurfaceRead` (p. ej.
  `coverage: { search Console: 'measured' | 'absent', rankTracking: 'measured' | 'sparse' | 'absent' }`
  — nombre final a decidir en Discovery). Aditivo: los campos actuales no cambian de forma.
- Backward compatibility: `applicable` — sólo se agregan campos; ningún consumer existente rompe.
- Full API parity: el mismo reader sirve UI, Nexa y el lane ecosystem; la cobertura viaja en el DTO,
  no se recalcula por consumer.

### Data model and invariants

- Entidades/tablas afectadas: ninguna nueva. Sin migración.
- Invariantes que no se pueden romper:
  - Una fuente ausente **NUNCA** se rinde como `0` ni se promedia con otra.
  - La decisión de entrada (`connection.state`) y el KPI principal **NUNCA** vuelven a depender de
    fuentes distintas sin que el DTO lo declare.
  - El fixture **NUNCA** entra al carril productivo: sólo las rutas `/mockup` autenticadas lo consumen.
- Tenant/space boundary: sin cambios — mono-Space por `organizationId`, gate per-org intacto.
- Idempotency/concurrency: N/A (read-only).
- Audit/outbox/history: N/A (reads).

### Migration, backfill and rollout

- Migration posture: `none`.
- Default state: sin flag nuevo; el contrato aditivo viaja con el release.
- Backfill plan: none.
- Rollback path: revert del PR.
- External coordination: ninguna.

### Security and access

- Auth/access gate: sin cambios (sesión cliente + `module_assignment` + capability por ruta).
- Sensitive data posture: el fixture usa dominios y keywords de ejemplo, **nunca** datos de un cliente real.
- Error contract: los `errorCode` existentes se preservan; la cobertura es información adicional, no un
  error nuevo.
- Abuse/rate-limit posture: N/A.

### Runtime evidence

- Tests focales del reader con las combinaciones de la población.
- Captura GVC por fixture (desktop + 390px) con `qualityFindings` vacío.
- Verificación contra PG real de que la organización con GSC y sin rank produce el estado esperado
  (sonda `scripts/growth/_sanity-seo-client-population.ts`).

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumers nombrados con rutas reales.
- [ ] Invariantes explícitos: ausencia ≠ 0; fuentes no se promedian; fixture fuera del carril productivo.
- [ ] Migration/backfill/rollback posture explícita (`none` / revert).
- [ ] Runtime evidence listada (tests + GVC por fixture + verificación contra PG).
- [ ] Sensitive posture: fixtures con datos de ejemplo, nunca de un cliente real.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE (no llenar al crear)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — La cobertura por fuente entra al contrato

- `SeoClientSurfaceRead` expone la cobertura de cada fuente (Search Console vs seguimiento de posición)
  como dato explícito, derivado de lo que los readers ya devuelven. Sin consultas nuevas.
- Tests del reader para las combinaciones reales: ambas fuentes, sólo GSC, sólo rank, ninguna, y fallo
  parcial de un reader.

### Slice 2 — Familia de fixtures y su selector

- `mock-surface.ts` pasa de un caso a un conjunto: `populated`, `onboarding` (GSC sí / rank no),
  `sparse`, `no-aeo`, `partial`, `locked`.
- Las rutas `/mockup` aceptan `?fixture=<id>` (default `populated`), sin cambiar su guard actual
  (`requireServerSession`).
- Un scenario GVC por estado, con su marker.

### Slice 3 — El guard que impide la reincidencia

- Test que falla si la decisión de entrada y el KPI principal se derivan de fuentes distintas sin que la
  cobertura lo declare. Es el detector del bug class, no un assert del caso puntual.

## Out of Scope

- Rediseño visible de cómo se rinde la ausencia declarada → follow-up `ui-ux` (ver Follow-ups).
- Multi-target por organización (`resolveActiveSeoTarget` con `LIMIT 1`) → follow-up propio.
- Cualquier cambio a `readSeoAeoGap`, al quadrant o al boundary SEO↔AEO.
- Decidir qué keywords seguir para una organización (eso es `trackKeywords`, con su techo de gasto).

## Detailed Spec

El principio es el del módulo: **medido ● / estimado ◑ / ausente declarado**, nunca un cero fantasma ni
una fuente hablando por otra. Hoy la superficie ya lo cumple *dentro* de cada panel; lo que falta es que
el DTO diga **cuál** fuente falta, para que ningún consumer tenga que adivinarlo — y que el arnés de
verificación pueda exhibir cada estado de la población, no sólo el del tenant que tiene todo.

La decisión de fondo que Discovery debe cerrar y declarar en el decision log: cuando hay GSC y no hay
rank, ¿el Resumen deriva su posición media de GSC (que la mide) o declara que el seguimiento de posición
todavía no arrancó? Las dos son honestas; la primera da más valor el día 1, la segunda es más literal
sobre la promesa del retainer. **No inventar una tercera** que mezcle ambas fuentes en un número.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 (contrato) → Slice 2 (fixtures) → Slice 3 (guard). El contrato va primero porque los fixtures
tipan contra él; el guard va último porque fija la conclusión que los dos anteriores establecen.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El fixture se cuela al carril productivo | privacidad/datos | baja | sólo lo importan las rutas `/mockup`; test de frontera | code review + grep de import |
| Elegir "derivar de GSC" y que el número no coincida con el del cockpit operador | data quality | media | una sola derivación compartida; declarar la fuente junto al número | test de paridad operador↔cliente |
| La cobertura se agrega al DTO y ningún consumer la usa | producto | media | el follow-up UI queda declarado y enlazado desde esta task | revisión al cierre |
| Fixture con datos de un cliente real | privacidad | baja | dominios y keywords de ejemplo, revisados en review | code review |

### Feature flags / cutover

Sin flag nuevo: el cambio es aditivo al DTO y no altera el comportamiento de una organización con ambas
fuentes pobladas. El gate de exposición sigue siendo `GROWTH_SEO_ENABLED` + `module_assignment` per-org.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert del PR (campos aditivos) | <5 min | si |
| Slice 2 | revert de fixtures y selector | <5 min | si |
| Slice 3 | revert del test | <5 min | si |

### Production verification sequence

1. Local: los seis fixtures capturan desktop + 390px con `qualityFindings` vacío.
2. Local: la sonda de población confirma que la organización con GSC y sin rank produce el estado esperado.
3. Staging: sesión de cliente real de la organización contratada — la superficie con ambas fuentes no
   cambia respecto de hoy (no-regresión del caso feliz).
4. Producción: sin verificación adicional propia; viaja con el release del módulo.

### Out-of-band coordination required

Ninguna.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `SeoClientSurfaceRead` declara la cobertura de cada fuente; ningún consumer necesita inferir qué falta.
- [ ] Existen fixtures para `populated`, `onboarding`, `sparse`, `no-aeo`, `partial` y `locked`, y las
      rutas `/mockup` los seleccionan por `?fixture=`.
- [ ] Cada fixture tiene captura GVC desktop + 390px con `qualityFindings` vacío, **mirada**, no sólo su JSON.
- [ ] Tests del reader cubren las cinco combinaciones de fuentes, incluido el fallo parcial.
- [ ] Existe un guard que falla si la decisión de entrada y el KPI principal se derivan de fuentes
      distintas sin declararlo.
- [ ] Ninguna ausencia se rinde como `0` ni dos fuentes se promedian en un número.
- [ ] El caso feliz (organización con ambas fuentes) no cambia: no-regresión verificada con sesión de
      cliente real.
- [ ] La decisión sobre el origen del Resumen cuando falta rank queda escrita con su rationale.

## Verification

- `pnpm vitest run src/lib/growth/seo/client`
- `pnpm fe:capture growth-seo-client-mockup --env=local` (por fixture)
- `pnpm local:check`
- `pnpm task:lint --task TASK-1690`
- `pnpm docs:closure-check`

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress`/`complete`)
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] EPIC-022 sincronizado

## Follow-ups

- **Consumer UI de la ausencia declarada** (`ui-ux`): cómo el Resumen rinde "el seguimiento de posición
  todavía no arrancó" sin leerse como error ni como cero. Bloqueado por esta task.
- **Multi-target por organización**: `resolveActiveSeoTarget` toma el más reciente con `LIMIT 1`. Hoy
  ninguna organización tiene dos, así que es correcto por suerte. Cuando exista la segunda, la superficie
  debe declarar qué dominio muestra o dejar elegir.

## Open Questions

1. Cuando hay GSC y no hay rank, ¿el Resumen deriva su posición media de Search Console o declara que el
   seguimiento no arrancó? Propuesta: **declarar**, porque el retainer promete seguimiento de posición y
   sustituirlo en silencio por otra fuente vuelve a mezclar señales — pero la decisión es de producto y
   debe quedar escrita con su rationale, no inferida por quien tome la task.
2. ¿El estado `locked` merece fixture propio o basta con la ruta real sin `module_assignment`? Propuesta:
   fixture, para que el teaser sea revisable sin tocar entitlements de una organización real.
