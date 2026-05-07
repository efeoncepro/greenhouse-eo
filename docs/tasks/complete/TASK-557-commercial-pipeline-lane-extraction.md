# TASK-557 — Commercial Pipeline Lane Extraction

## Delta 2026-05-07 — Architectural review (skills `arch-architect` + `greenhouse-finance-accounting-operator`)

- TASK-555 (foundation) y TASK-556 (surface adoption) cerraron 2026-05-07: `routeGroup commercial`, namespace `comercial.*` y `comercial.pipeline` (con `routePath:/finance/intelligence`) ya viven en `view-access-catalog.ts`. El sidebar `Comercial` (TASK-554) NO incluye Pipeline todavía.
- La spec original dejaba 3 ambigüedades materiales (Opción A sidebar-only / B page nueva / C URL nueva). Quedó canonizada **Opción B — page nueva sobre subruta legacy + tab embed compat + guard dual** por respetar §6.1 del `COMMERCIAL_FINANCE_DOMAIN_BOUNDARY_V1` (URLs legacy se preservan) y por dar entrypoint primario real bajo dominio comercial.
- TASK-557.1 (legacy quotes cleanup) queda promovida a **soft prerequisite**: el reader `revenue-pipeline-reader.ts:199-227` filtra `is_expired` + `pipeline_stage`, pero NO `legacy_status` / `legacy_excluded`. Si TASK-557.1 no cierra antes, esta task debe agregar el filtro defensivo en la query del reader como compat temporal documentada.
- Frontera contable explícita: pipeline reporta forecast (`amount × probability`), NO revenue reconocido. ASC 606 / IFRS 15 — un quote/deal no es revenue hasta cumplir los 5 steps. Mantener Pipeline lejos del título "Inteligencia financiera" / "Economía operativa" es parte del scope.

## Delta 2026-05-07 — Implementation decisions (Codex)

- Branch operativo: `develop` por instruccion explicita del usuario; no se creo branch `task/TASK-557-commercial-pipeline-lane-extraction`.
- Drift corregido: `greenhouse_core.view_registry.route_path` tambien persistia `comercial.pipeline -> /finance/intelligence`. Para que Admin Center/governance apunten al entrypoint primario real, se agrego migracion de datos `20260507115027833_task-557-commercial-pipeline-route-path.sql` que actualiza el routePath a `/finance/intelligence/pipeline`.
- Drift de TASK-557.1: `legacy_excluded` no existe aun en schema/types/migrations. TASK-557 aplica solo el filtro defensivo posible en runtime actual: `q.legacy_status IS NULL`. La columna/flag `legacy_excluded` queda scope de TASK-557.1.
- Drift de notifications: las dos ocurrencias reales en `src/lib/sync/projections/notifications.ts` son eventos financieros (`leave_request.payroll_impact_detected` y `accounting.margin_alert.triggered`), no eventos de pipeline. No se movieron a `/finance/intelligence/pipeline` para evitar enviar alertas de margen/costo al lane comercial incorrecto.
- Fix post-screenshot: el sidebar usaba `canSeeAnyView(['comercial.pipeline', 'finanzas.inteligencia'], true)`, pero ese fallback no se aplica cuando `authorizedViews` no esta vacio. Para usuarios con snapshots previos a `comercial.pipeline`, el item se ocultaba aunque tuvieran `routeGroup=commercial|finance|admin`. La page y el sidebar ahora aceptan ese fallback transicional explícitamente.

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Bajo` (~1 día — 6 slices acotados, con migracion de datos routePath y sin nueva API)
- Type: `implementation`
- Epic: `EPIC-002`
- Status real: `Cerrada`
- Rank: `TBD`
- Domain: `crm`
- Blocked by: `TASK-555` (✅ complete) + `TASK-557.1` (⚠️ soft prerequisite — ver Detailed Spec §6)
- Branch: `develop` (por instruccion explicita del usuario)
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Extraer `Pipeline comercial` del wrap `Finance > Intelligence` y darle una page propia bajo subruta legacy `/finance/intelligence/pipeline`, con guard dual (`comercial.pipeline OR finanzas.inteligencia`), entry en sidebar `Comercial`, y embed compat del tab Pipeline en `FinanceIntelligenceView` durante la ventana de coexistencia, manteniendo deep links existentes intactos.

## Why This Task Exists

El pipeline ya es funcionalmente comercial: mezcla deals, contratos standalone y pre-sales. Mantenerlo como sub-tab dentro del wrap "Economía operativa" — que combina cierre de período + rentabilidad por cliente (ambos contables) — induce a stakeholders a leer el pipeline como "lo que voy a facturar" cuando es "lo que estimo que voy a vender". Es un anti-patrón contable: forecast (FP&A bajo dominio Comercial) ≠ revenue reconocido (ASC 606 / IFRS 15 bajo dominio Finance).

Tras TASK-554/555/556, el dominio `Comercial` ya tiene sidebar, routeGroup, namespace y framing — falta darle a Pipeline un entrypoint comercial primario real, no un sidebar entry cosmético hacia el wrap financiero.

## Goal

- entrypoint comercial primario para `Pipeline comercial` con page propia bajo subruta legacy
- desacoplarlo de `Finance > Intelligence` como surface owner sin romper deep links
- mantener readers, APIs y schemas intactos en este corte (compat URL §6.1 del boundary spec)
- defender la frontera contable forecast vs revenue reconocido

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_FINANCE_DOMAIN_BOUNDARY_V1.md` (especialmente §3.2, §5.1, §6.1, §7.2)
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md` (guard pattern + view-code resolution)

Reglas obligatorias:

- `Pipeline comercial` pertenece a `Comercial`
- la primera separación NO mueve URLs `/finance/...` a `/commercial/...` (§6.1 boundary spec)
- no mezclar en esta task una reescritura de `Economía` o `Finance Intelligence`
- no crear roles `sales` / `sales_lead` / `commercial_admin` (§11 boundary spec)

## Normative Docs

- `docs/documentation/finance/pipeline-comercial.md`
- `docs/tasks/complete/TASK-457-ui-revenue-pipeline-hybrid.md`
- `docs/tasks/complete/TASK-554-commercial-domain-navigation-separation.md`
- `docs/tasks/complete/TASK-555-commercial-access-model-foundation.md`
- `docs/tasks/complete/TASK-556-commercial-surface-adoption-over-legacy-finance-paths.md`

## Dependencies & Impact

### Depends on

- `TASK-554` (✅ complete — sidebar `Comercial` top-level)
- `TASK-555` (✅ complete — `routeGroup commercial`, `comercial.pipeline` viewCode)
- `TASK-556` (✅ complete — owner-domain comercial sobre paths legacy)
- `TASK-557.1` (⚠️ soft prerequisite — ver §6)
- `src/app/(dashboard)/finance/intelligence/page.tsx`
- `src/views/greenhouse/finance/CommercialIntelligenceView.tsx`
- `src/views/greenhouse/finance/FinanceIntelligenceView.tsx`
- `src/components/layout/vertical/VerticalMenu.tsx`
- `src/lib/admin/view-access-catalog.ts` (`comercial.pipeline` ya registrada — sólo lectura)
- `src/lib/sync/projections/notifications.ts` (action URLs del pipeline)

### Blocks / Impacts

- futuros accesos directos y dashboards ejecutivos que quieran abrir pipeline desde `Comercial`
- follow-up opcional de URL normalization a `/commercial/pipeline` (§6.3 boundary spec)
- consume `src/lib/commercial-intelligence/revenue-pipeline-reader.ts` (no se modifica salvo filtro defensivo §6 si TASK-557.1 no cierra antes)

### Files owned

- `src/app/(dashboard)/finance/intelligence/pipeline/page.tsx` **(NEW)**
- `src/app/(dashboard)/finance/intelligence/page.tsx`
- `src/views/greenhouse/finance/FinanceIntelligenceView.tsx`
- `src/views/greenhouse/finance/CommercialIntelligenceView.tsx`
- `src/components/layout/vertical/VerticalMenu.tsx`
- `src/config/greenhouse-nomenclature.ts` (entry sidebar Comercial)
- `src/lib/sync/projections/notifications.ts`
- `docs/documentation/finance/pipeline-comercial.md`
- `docs/documentation/comercial/surfaces-comerciales-sobre-rutas-finance.md`

## Current Repo State

### Already exists

- pipeline híbrido materializado y funcional (TASK-457)
- classifier y grain ya son comerciales (TASK-457 + TASK-456 + TASK-454)
- `comercial.pipeline` registrada en `view-access-catalog.ts:213-219` con `routePath:/finance/intelligence` y `routeGroup:commercial` (TASK-555)
- sidebar `Comercial` top-level con Quotes/Contracts/MSA/Products (TASK-554)
- `FinanceIntelligenceView` envuelve Pipeline como sub-tab `quotations` (TabPanel value='quotations' → `<CommercialIntelligenceView />`)

### Gap

- `/finance/intelligence/page.tsx` gatea con `finanzas.inteligencia` + `routeGroup:finance` — usuario commercial-only sin route_group=finance NO accede aunque `comercial.pipeline` exista
- no existe page commercial-owned para Pipeline; sólo el embed dentro del wrap "Economía operativa"
- sidebar `Comercial` NO tiene entry "Pipeline"
- `notifications.ts:629/654` apunta a `/finance/intelligence` (genérico) en vez de la page Pipeline específica
- el framing visible sigue siendo "Economía operativa" → confusión forecast vs revenue reconocido (frontera contable)
- el reader `revenue-pipeline-reader.ts:199-227` no excluye quotes con `legacy_status NOT NULL` (gap operativo cubierto por TASK-557.1)

## Architectural Decision (canonized)

### Opción elegida: B — Page nueva + sidebar entry + tab embed compat + guard dual

| Pieza | Decisión |
| --- | --- |
| Nueva page | `src/app/(dashboard)/finance/intelligence/pipeline/page.tsx` (subruta legacy, NO `/commercial/pipeline`) |
| Page renderiza | `<CommercialIntelligenceView />` directo (sin wrap `FinanceIntelligenceView`) |
| Guard de la page nueva | `hasAuthorizedViewCode({viewCode:'comercial.pipeline', fallback: routeGroups.includes('commercial') OR includes('finance') OR roleCodes.includes(EFEONCE_ADMIN)})` — patrón canónico de TASK-555 §7.2 |
| Sidebar entry comercial | "Pipeline" como **primer item** del bloque Comercial (orden §5.1 boundary spec) → `/finance/intelligence/pipeline` con `canSeeAnyView(['comercial.pipeline','finanzas.inteligencia'], true)` |
| Tab Pipeline en `FinanceIntelligenceView` | **mantiene** durante ventana coexistencia; subtitle "Vista compartida — owner Comercial" + link inline "Abrir vista comercial dedicada" → page nueva; NO es default tab (default sigue 'closure') |
| Notifications projection | `notifications.ts:629/654` actualizado a `/finance/intelligence/pipeline` (notifs son contextuales al pipeline, no al wrap) |
| URL legacy `/finance/intelligence` | sin cambio; sigue mostrando 4 tabs incluido Pipeline embed (sin redirect ni breaking change) |

### Alternatives rejected

| Opción | Por qué rechazada |
| --- | --- |
| **A — Sidebar entry hacia `/finance/intelligence?tab=pipeline`** + ampliar guard de page actual | Cumple la letra ("hay entrypoint comercial") pero no el espíritu — la vista sigue viviendo dentro del wrap "Economía operativa" financiera. El framing real no se desacopla. Si emergen Rentabilidad o Renovaciones como sub-tabs commercial-only, no tienen lane. |
| **C — Page `/commercial/pipeline`** (URL nueva en namespace comercial) | Rompe §6.1 y §11 del boundary spec — URLs legacy se preservan en este corte; URL normalization queda como follow-up opcional (§6.3). Aumenta blast radius (middleware, redirects, telemetría, tests E2E que asumen `/finance/intelligence`). |

### Patrones canónicos extendidos

| Patrón | Antecedente | Cómo aplica |
| --- | --- | --- |
| Compat dual-namespace (`comercial.* OR finanzas.*` durante transición) | TASK-555 §7.2 + `VerticalMenu.tsx:347` | Page nueva gatea con OR; sidebar entry idem |
| URLs legacy preservadas en primera separación | §6.1 boundary spec | Path nuevo es **subruta legacy** `/finance/intelligence/pipeline`, NO `/commercial/pipeline` |
| Sidebar entry con view-code check + canSeeAnyView | TASK-554 patrón existente | Idéntico shape al ya canonizado para Cotizaciones/Contratos/MSA/Products |
| Page con `requireServerSession` + `hasAuthorizedViewCode` + `redirect(portalHomePath)` | `intelligence/page.tsx:17-32` | Replicar exacto, cambiando viewCode + fallback array |
| Compat temporal con condición de retiro explícita | `Solution Quality Operating Model V1` | Tab embed retira sólo cuando (a) `notifications.ts` apunte al path nuevo, (b) audit muestre 0 deep-links externos, (c) ventana ≥ 30 días |

## Scope

### Slice 1 — Page comercial nueva (~1.5h)

- Crear `src/app/(dashboard)/finance/intelligence/pipeline/page.tsx`.
- Patrón canónico: `requireServerSession` (o helper equivalente al usado en `intelligence/page.tsx:17-32`) + `hasAuthorizedViewCode({viewCode:'comercial.pipeline', fallback: routeGroups.includes('commercial') || routeGroups.includes('finance') || roleCodes.includes(ROLE_CODES.EFEONCE_ADMIN)})`.
- Page renderiza `<CommercialIntelligenceView />` directo (sin wrap `FinanceIntelligenceView`).
- Metadata: `title: 'Pipeline comercial — Greenhouse'`.
- Wrap visual mínimo: header con `Typography variant='h5'` "Pipeline comercial" + subtitle "Forecast comercial · deals, contratos standalone y pre-sales" — invocar **siempre** la skill `greenhouse-ux-writing` ANTES de escribir el copy final.

### Slice 2 — Sidebar entry comercial (~30min)

- En `VerticalMenu.tsx:333-355`, agregar como **primer item** del array `children` del bloque Comercial:
  - `{ label: nl(GH_COMMERCIAL_NAV.pipeline), href: '/finance/intelligence/pipeline', icon: 'tabler-stack-2' }`
- Filter: `canSeeAnyView(['comercial.pipeline', 'finanzas.inteligencia'], true)` — guard dual respeta TASK-555 §7.2.
- Agregar `pipeline` a `GH_COMMERCIAL_NAV` en `greenhouse-nomenclature.ts` con label canónico (skill `greenhouse-ux-writing`).
- Verificar orden canónico §5.1 boundary spec: Pipeline → Cotizaciones → Contratos → MSA → Products.

### Slice 3 — Convivencia en `FinanceIntelligenceView` (~45min)

- Cambiar microcopy del tab `quotations` con el aviso "Vista compartida — owner Comercial" (skill `greenhouse-ux-writing`).
- Agregar dentro del `TabPanel value='quotations'` un link inline o Alert collapsible: "Esta vista pertenece a Comercial. Abrir lane dedicada → `/finance/intelligence/pipeline`".
- Mantener default tab `closure` (sin cambio). Tab Pipeline NO se promueve, sólo se mantiene como compat.
- Documentar la condición de retiro del tab embed en `pipeline-comercial.md`.

### Slice 4 — Update notifications projection action URL (~15min)

- `src/lib/sync/projections/notifications.ts:629` y `:654` → `/finance/intelligence/pipeline`.
- Actualizar tests `src/lib/sync/projections/notifications.test.ts:159,172` (assertions del action URL).
- Justificación: las notificaciones son contextuales al pipeline (deal stage change, quote about to expire), NO a Economía operativa. La page comercial nueva tiene guard correcto para usuarios commercial-only.

### Slice 5 — Doc funcional + spec deltas (~30min)

- Actualizar `docs/documentation/finance/pipeline-comercial.md`:
  - header con TASK-557 delta + path canónico nuevo
  - sección "Cómo se accede" con dos entrypoints: page comercial dedicada (canónica) + tab embed en Economía operativa (compat)
  - condición de retiro del embed
  - frontera contable: forecast (FP&A) vs revenue reconocido (ASC 606)
- Mover una copia/link en `docs/documentation/comercial/surfaces-comerciales-sobre-rutas-finance.md` referenciando la nueva lane.
- Si el doc original vive bajo `docs/documentation/finance/`, decidir si se mueve a `docs/documentation/comercial/` o se mantiene con cross-link. Recomendado: cross-link en este corte (preservar deep links a docs).

### Slice 6 — Cross-impact con TASK-557.1 (~15min decisión + opcional 30min filtro defensivo)

- Verificar si TASK-557.1 ya cerró al momento de tomar TASK-557.
- Si TASK-557.1 cerró: cero acción adicional.
- Si TASK-557.1 NO cerró: agregar filtro defensivo en `revenue-pipeline-reader.ts` `buildStandaloneWhere` con `q.legacy_status IS NULL` (compat temporal documentada en código + en el delta de la task). Marcar el filtro como tag `// TASK-557 defensive filter — retire when TASK-557.1 closes` para retirarlo posteriormente.
- Documentar la decisión en el cierre de TASK-557.

## Out of Scope

- mover rutas a `/commercial/...` (queda como follow-up opcional §6.3 boundary spec)
- reescribir los readers del pipeline más allá del filtro defensivo Slice 6
- rehacer `Finance > Intelligence` ni `Economía operativa` completas
- mover todas las APIs a `/api/commercial/...` (compat URL preservada)
- crear roles `sales` / `sales_lead` / `commercial_admin`
- tocar startup policy o `portalHomePath`
- agregar redirect 308 desde `/finance/intelligence?tab=quotations` → page nueva (preservar deep links exactos)
- materializar Rentabilidad y Renovaciones como sub-tabs commercial-only separados (sigue todo bajo `CommercialIntelligenceView` como antes)

## Detailed Spec

### 1. Page nueva — guard contract canónico

```typescript
// src/app/(dashboard)/finance/intelligence/pipeline/page.tsx
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import CommercialIntelligenceView from '@views/greenhouse/finance/CommercialIntelligenceView'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import { ROLE_CODES } from '@/config/role-codes'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Pipeline comercial — Greenhouse'
}

const PipelinePage = async () => {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  // Guard dual-namespace per TASK-555 §7.2 (compat transitional)
  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'comercial.pipeline',
    fallback:
      tenant.routeGroups.includes('commercial') ||
      tenant.routeGroups.includes('finance') ||
      tenant.roleCodes.includes(ROLE_CODES.EFEONCE_ADMIN)
  })

  // Compat: aceptar también el viewCode legacy mientras el path siga bajo /finance/...
  const hasLegacyAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'finanzas.inteligencia',
    fallback: false
  })

  if (!hasAccess && !hasLegacyAccess) {
    redirect(tenant.portalHomePath)
  }

  return <CommercialIntelligenceView />
}

export default PipelinePage
```

Notas:

- Header visual + subtitle van dentro de la page o como wrap mínimo (no reusar `FinanceIntelligenceView` porque arrastra los 4 tabs y el wrap "Economía operativa").
- `canCloseCostIntelligencePeriod` y `canReopenCostIntelligencePeriod` NO se propagan — son específicos de cierre de período financiero. Su ausencia es feature, no bug: defiende la separación.

### 2. Sidebar entry — patrón canónico de TASK-554

```typescript
// src/components/layout/vertical/VerticalMenu.tsx (dentro del bloque Comercial ~line 333-355)
{
  label: nl(GH_COMMERCIAL_NAV.pipeline),
  href: '/finance/intelligence/pipeline',
  icon: 'tabler-stack-2'
},
// ...resto del bloque (Cotizaciones, Contratos, MSA, Products)

// En el .filter():
if (item.href === '/finance/intelligence/pipeline')
  return canSeeAnyView(['comercial.pipeline', 'finanzas.inteligencia'], true)
```

### 3. Embed compat en `FinanceIntelligenceView`

- Tab `quotations` se mantiene con label `GH_PIPELINE_COMMERCIAL.outerTabLabel` ("Pipeline comercial").
- Subtitle nuevo (skill `greenhouse-ux-writing`): "Vista compartida — owner Comercial".
- Dentro del `TabPanel value='quotations'`: `Alert` informativo (collapsible si se prefiere) que explique la coexistencia + link a la lane dedicada. Texto sugerido (sujeto a skill UX-writing): "Esta vista la opera Comercial. Para forecast y pipeline detallado, abre la lane dedicada."
- NO cambiar default tab: sigue `closure`.

### 4. Notifications projection

- `notifications.ts:629/654` → `/finance/intelligence/pipeline` (no `/finance/intelligence`).
- Test esperado: `notifications.test.ts:172` debe assertear `actionUrl: '/finance/intelligence/pipeline'`.
- Test esperado: `notifications.test.ts:159` (declaración de view-code asociada al ack del notification — verificar el shape exacto y mantener consistencia con `comercial.pipeline`).

### 5. Frontera contable explícita

Documentar en `pipeline-comercial.md`:

> El Pipeline reporta **forecast** comercial (deals + quotes en negociación, ponderados por probabilidad). NO es revenue contable.
>
> Bajo ASC 606 / IFRS 15, un quote o deal NO constituye revenue hasta cumplir los 5 steps:
> 1. contrato enforceable con el cliente
> 2. obligaciones de desempeño identificadas
> 3. transaction price determinado
> 4. allocation a las obligaciones
> 5. recognition cuando (point-in-time) o como (over-time) se satisfacen
>
> Pipeline ponderado (`amount × probability`) es técnica de FP&A, no contabilidad financiera. La distinción es material para forecast vs revenue.
>
> Revenue reconocido vive en `Economía operativa` (cierre de período + P&L) y se materializa vía VIEWs canónicas TASK-708/709.

### 6. Soft prerequisite TASK-557.1

El reader `src/lib/commercial-intelligence/revenue-pipeline-reader.ts:199-227` filtra:

- `(q.hubspot_deal_id IS NULL OR (d.is_closed = TRUE AND d.is_won = TRUE))`
- `qps.is_expired = FALSE`
- `qps.pipeline_stage NOT IN ('rejected', 'expired')`

NO filtra `legacy_status NOT NULL` ni `legacy_excluded = TRUE`. Si una quote legacy con `legacy_status='draft_pre_canonical'` aparece en `quotation_pipeline_snapshots`, se renderiza en la lane comercial — exactamente lo que TASK-557.1 declara como riesgo bloqueante.

Decisión:

- **Path 1 (preferido)**: tomar TASK-557.1 antes y cerrarla.
- **Path 2 (fallback)**: agregar filtro defensivo en `buildStandaloneWhere` con `q.legacy_status IS NULL AND COALESCE(q.legacy_excluded, FALSE) = FALSE`. Tag `// TASK-557 defensive filter — retire when TASK-557.1 closes`. Documentar en el delta de cierre de TASK-557.

### 7. 4-Pillar Score

#### Safety
- **What can go wrong**: usuario commercial-only sin `routeGroup=finance` no accede a Pipeline si la page nueva omite el fallback `finanzas.inteligencia`. Usuario finance-only se confunde si el tab Pipeline desaparece de Economía operativa.
- **Gates**: viewCode `comercial.pipeline` (existente) + fallback `finanzas.inteligencia` durante coexistencia + sidebar entry sólo si `canSeeAnyView`.
- **Blast radius**: una surface UI; ninguna mutación de datos; cero blast cross-tenant.
- **Verified by**: tests existentes en `view-access-catalog.test.ts:39` (cubre `comercial.pipeline`) + smoke E2E manual con usuario commercial-only y finance-only.
- **Residual risk**: si un usuario tiene sólo `routeGroup=finance` SIN `routeGroup=commercial` y la page nueva sólo gateara con `comercial.pipeline`, perdería acceso. Mitigación: guard OR durante ventana de transición + audit de roles afectados antes del flip.

#### Robustness
- **Idempotency**: trivial — no hay write paths. Refresh de page idempotente.
- **Atomicity**: N/A.
- **Race protection**: N/A (read-only surface).
- **Constraint coverage**: la única invariante a proteger es "view registry y route_group sincronizados". TASK-555 ya cubre esto (migration `20260507065816822`).
- **Verified by**: `pnpm test src/lib/admin/view-access-catalog.test.ts src/lib/admin/internal-role-visibility.test.ts` + `pnpm tsc --noEmit`.

#### Resilience
- **Retry policy**: N/A.
- **Dead letter**: N/A.
- **Reliability signal**: no se necesita uno nuevo (read-only surface UI; ningún async path). Si emergiera "view-code orphan" (route apunta a viewCode que no existe en registry) sería un meta-signal del access plane, no de esta task.
- **Audit trail**: cambio de UI; trazabilidad por `git log` + Handoff.md + delta en `pipeline-comercial.md`.
- **Recovery procedure**: rollback atomic per-PR — revertir page nueva, sidebar entry, `notifications.ts`. Cero data side effect.

#### Scalability
- **Hot path Big-O**: idéntico a `/finance/intelligence` actual (las queries no cambian).
- **Index coverage**: heredado de TASK-457/351/456.
- **Async paths**: heredados — projections reactivas ya existen.
- **Cost at 10x**: lineal con la base actual; ninguna nueva query.
- **Pagination**: N/A.

## Acceptance Criteria

- [x] Existe page comercial nueva en `/finance/intelligence/pipeline` que monta `<CommercialIntelligenceView />` sin wrap financiero
- [x] La page nueva usa guard dual `comercial.pipeline OR finanzas.inteligencia` con fallback explícito por routeGroups + EFEONCE_ADMIN
- [x] Sidebar `Comercial` tiene entry "Pipeline" como primer item del bloque, apuntando a la page nueva, con `canSeeAnyView(['comercial.pipeline','finanzas.inteligencia'])`
- [x] Tab `quotations` en `FinanceIntelligenceView` mantiene compat embed con subtitle "Vista compartida — owner Comercial" + link inline a la lane dedicada
- [x] `notifications.ts:629/654` revisado; no se cambió porque el runtime real contiene eventos financieros, no pipeline. Drift documentado.
- [x] Doc funcional `pipeline-comercial.md` documenta los dos entrypoints (page dedicada + tab compat) y la condición de retiro del embed
- [x] Doc funcional declara la frontera contable forecast (FP&A) vs revenue reconocido (ASC 606 / IFRS 15)
- [x] Cross-impact con TASK-557.1 documentado: filtro defensivo agregado con tag de retiro sobre `legacy_status`; `legacy_excluded` queda para TASK-557.1
- [x] Deep links existentes (`/finance/intelligence`) siguen funcionando sin redirect ni cambio
- [x] Microcopy de page nueva, sidebar entry y subtitle del tab compat fueron validados con `greenhouse-ux-content-accessibility` (skill disponible equivalente a `greenhouse-ux-writing`)

## Hard Rules (anti-regression)

- **NUNCA** crear `/commercial/pipeline` mientras §6.1 del boundary spec esté vigente. URLs legacy se preservan en el primer corte.
- **NUNCA** dejar la page nueva con guard único `comercial.pipeline` sin fallback `finanzas.inteligencia` durante la ventana de coexistencia. Rompe acceso a usuarios finance-only que dependen del deep link.
- **NUNCA** quitar el tab "Pipeline comercial" del wrap `FinanceIntelligenceView` en este corte. Genera deep-link breakage. Su retiro es follow-up condicionado a (a) audit de deep links externos, (b) `notifications.ts` actualizado, (c) ventana ≥ 30 días post-deploy.
- **NUNCA** mostrar Pipeline bajo el título "Inteligencia financiera" / "Economía operativa" en la page nueva. Frontera contable: pipeline = forecast (FP&A), no revenue reconocido (ASC 606 / IFRS 15).
- **NUNCA** omitir la skill `greenhouse-ux-writing` antes de cambiar microcopy de tab/sección/sidebar/subtitle.
- **NUNCA** aplicar el filtro defensivo del Slice 6 sin tag `// TASK-557 defensive filter — retire when TASK-557.1 closes` y sin documentar la condición de retiro en el cierre.
- **SIEMPRE** mantener la coexistencia documentada como compat temporal con condición de retiro explícita (per `Solution Quality Operating Model V1`).

## Open Questions

1. ¿Cuándo se retira el tab embed de `FinanceIntelligenceView`? — propuesto: cuando (a) `notifications.ts` apunta al path nuevo, (b) audit muestra 0 deep-links externos a `/finance/intelligence?tab=quotations`, (c) ventana ≥ 30 días post-deploy. Decisión final puede quedar para follow-up task.
2. ¿La page nueva renderiza el view completo (3 sub-tabs Pipeline/Rentabilidad/Renovaciones) o sólo Pipeline? — propuesto: completo. Las 3 sub-tabs ya son comerciales por owner-domain (`pipeline-comercial.md` lo confirma). Confirmar antes de implementar Slice 1.
3. ¿El doc `pipeline-comercial.md` se mueve a `docs/documentation/comercial/` o se mantiene con cross-link? — propuesto: cross-link en este corte (preservar deep links a docs).
4. ¿TASK-557.1 se toma antes o se aplica filtro defensivo? — decisión operativa al momento de tomar TASK-557. Ambos paths documentados.

## Verification

Comandos requeridos:

- `pnpm lint`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm test src/lib/admin/view-access-catalog.test.ts src/lib/admin/internal-role-visibility.test.ts src/lib/sync/projections/notifications.test.ts src/config/greenhouse-navigation-copy.test.ts`
- `pnpm design:lint`
- `pnpm build` — confirmar que `/finance/intelligence/pipeline` aparece en route table

Resultado 2026-05-07:

- `pnpm pg:doctor` OK
- `pnpm pg:connect:migrate` OK; aplicó `20260507115027833_task-557-commercial-pipeline-route-path.sql` y regeneró tipos sin diff pendiente
- `pnpm exec tsc --noEmit --pretty false` OK
- `pnpm test src/lib/admin/view-access-catalog.test.ts src/lib/admin/internal-role-visibility.test.ts src/config/greenhouse-navigation-copy.test.ts` OK (3 files / 35 tests)
- `pnpm test src/lib/sync/projections/notifications.test.ts` OK (1 file / 5 tests)
- `pnpm design:lint` OK (0 errors / 0 warnings)
- `pnpm lint` OK
- `pnpm build` OK; route table incluye `/finance/intelligence/pipeline`

Smoke manual:

- login con usuario `efeonce_admin` → sidebar Comercial muestra entry Pipeline → click abre page comercial dedicada → 3 sub-tabs renderizadas
- login con usuario `finance_admin` → ambos entrypoints funcionan (page nueva + tab embed)
- login con usuario commercial-only (si existe role) → page comercial accesible; tab embed accesible (compat); page legacy `/finance/intelligence` accesible vía guard dual
- deep link directo a `/finance/intelligence?tab=quotations` → sigue funcionando, muestra tab Pipeline embed con copy "Vista compartida — owner Comercial"
- notification con action URL del pipeline → abre la page comercial dedicada

## Closing Protocol

- [x] `Lifecycle` del markdown sincronizado con el estado real (`in-progress` al tomar, `complete` al cerrar)
- [x] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [x] `docs/tasks/README.md` sincronizado con el cierre
- [x] `Handoff.md` actualizado con: page nueva, sidebar entry, decisión sobre TASK-557.1 path 1 vs 2, microcopy validada
- [x] `changelog.md` actualizado si cambió comportamiento, estructura o protocolo visible
- [x] chequeo de impacto cruzado sobre otras tasks afectadas — especialmente TASK-557.1 y futuras URL normalization
- [x] explicitada la compat temporal del tab embed en `FinanceIntelligenceView` con condición de retiro
- [x] explicitada la decisión sobre TASK-557.1 (filtro defensivo aplicado con tag)
- [x] microcopy validada por skill `greenhouse-ux-content-accessibility`

## Follow-ups

- task futura opcional de URL normalization a `/commercial/pipeline` (§6.3 boundary spec) — sólo si tras estabilización sigue teniendo valor
- task de retiro del tab embed en `FinanceIntelligenceView` cuando se cumplan las condiciones de §Open Questions #1
- audit de deep links externos a `/finance/intelligence?tab=quotations` (Slack archives, docs, dashboards Looker, alertas Sentry) antes del retiro
- evaluar si TASK-557.1 debe hard-blockear esta task formalmente en `docs/tasks/README.md` o si el path 2 (filtro defensivo) basta
