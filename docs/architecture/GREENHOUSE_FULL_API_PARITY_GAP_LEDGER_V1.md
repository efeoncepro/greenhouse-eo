# Greenhouse Full API Parity — Gap Ledger V1

> **Tipo:** Ledger de deuda + contrato consultable (auditoría re-ejecutable)
> **Versión:** 1.0
> **Creado:** 2026-06-20 por Claude (TASK-1172)
> **Criterio:** [`GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`](GREENHOUSE_FULL_API_PARITY_DECISION_V1.md)
> **Reader:** `scripts/audit/full-api-parity-coverage.ts` (`pnpm tsx scripts/audit/full-api-parity-coverage.ts`)

## Para qué existe

La directiva CEO 2026-06-19 fijó el North Star: **Nexa debe operar TODO el portal**, con
Full API Parity como base. Para lo **nuevo** hay gate (Capability DoD en
`TASK_BACKEND_DATA_ADDENDUM.md`). Pero **lo existente** tiene cobertura despareja y deuda
silenciosa. Este ledger convierte esa deuda invisible en un **mapa medible, priorizado y
re-ejecutable**, y la mapea a la cobertura real de tools de Nexa.

**Read-only:** este documento + su reader NO cambian runtime. La remediación son tasks
derivadas priorizadas (ver §6).

## Metodología (verificar, no asumir)

El reader deriva todo de fuentes verificables del repo (sin PG → corre en CI):

1. **Inventario** = `ENTITLEMENT_CAPABILITY_CATALOG` (`src/config/entitlements-catalog.ts`),
   el catálogo canónico de capabilities de negocio. Unidad de medida = una entry del
   catálogo (estable y re-medible). 217 capabilities al 2026-06-20.
2. **Clasificación por consumer-reach** = para cada capability, `git grep` de su literal
   `'<key>'` en el repo, bucketeando referencias por superficie (api / lib / nexa / ui /
   test / cli), excluyendo los archivos definicionales del plano de gobernanza
   (`entitlements-catalog.ts`, `entitlements/runtime.ts`).
3. **Gobernanza de routes de mutación** = enumera `POST/PUT/PATCH/DELETE` bajo
   `src/app/api/**` y clasifica el estilo de auth en el boundary del route.
4. **Cobertura Nexa** = mapa curado de los 8 tools de `src/lib/nexa/nexa-tools.ts` a los
   dominios que operan.

> **El reader es triage, no veredicto.** Da la señal medible; la clasificación verificada
> de los casos de alto valor vive abajo (§5) y la verificación per-route es la tarea
> derivada. Re-correrlo mide el avance del programa en el tiempo.

## Taxonomía de clasificación

| Bucket | Significado | Lectura parity |
|---|---|---|
| ✅ `governed` | literal en `src/app/api` **y** en `src/lib` (o `nexa`) | command en lib + expuesto por API gobernada |
| 🟡 `api-inline` | literal solo en `src/app/api` (can-checked en route, sin reuso del literal en un primitive) | gobernado en el route; el primitive puede existir igual (lo llama sin re-chequear) — verificar |
| 🟡 `lib-only` | literal solo en `src/lib`, sin superficie API | primitive existe, pero consumers no-UI (MCP/app) no lo alcanzan por contrato |
| ⚠️ `ui-only` | literal solo en UI (`views`/`components`/page) | guard/lógica client-side sin contrato server |
| ⚠️ `declared-unwired` | sin consumer de producción (solo tests/def, o cableado por indirección no-literal) | capability declarada sin consumo verificable por literal |

## 1. Cobertura de capabilities (snapshot 2026-06-20)

Total capabilities: **217**

| Clasificación | Conteo | % |
|---|---:|---:|
| ✅ governed | 33 | 15% |
| 🟡 api-inline | 94 | 43% |
| 🟡 lib-only | 41 | 19% |
| ⚠️ ui-only | 1 | 0% |
| ⚠️ declared-unwired | 48 | 22% |

**Lectura:** solo **15%** de las capabilities tienen el patrón canónico completo
(primitive en `src/lib` + API gobernada que reusa el literal). El 43% `api-inline` está
gobernado en el route pero no reusa un primitive por literal (mayoría correcta: route →
command; minoría con lógica inline → verificar). El 19% `lib-only` tiene primitive pero
**sin superficie API** → MCP/app no lo alcanzan por contrato. El 22% `declared-unwired`
está declarado sin consumo verificable por literal.

### Por módulo (los de mayor deuda)

| Módulo | governed | api-inline | lib-only | ui-only | declared-unwired |
|---|---:|---:|---:|---:|---:|
| finance | 5 | 27 | 3 | 0 | 2 |
| commercial | 7 | 12 | 7 | 0 | 3 |
| hr | 8 | 11 | 4 | 0 | 6 |
| organization | 0 | 5 | **12** | 0 | 3 |
| client_portal | 0 | 6 | 1 | 0 | **13** |
| admin | 0 | 7 | 2 | 0 | 4 |
| platform | 0 | 2 | 0 | 0 | 7 |
| workforce | 9 | 1 | 3 | 0 | 0 |
| design_system | 0 | 11 | 0 | 0 | 0 |
| knowledge | 0 | 0 | 3 | 0 | 2 |

(Reportes completos por módulo: correr el reader.)

## 2. Operabilidad de Nexa (el gap North Star)

| Métrica | Valor |
|---|---|
| Capabilities con **lectura** cubierta por un tool de Nexa (por dominio) | **110 / 217 (51%)** |
| Capabilities **accionables** por Nexa (propose→confirm→execute) | **0 / 217 (0%)** |

**El gap North Star está en la ACCIÓN.** Nexa cubre lectura de 7 dominios (51% de las
capabilities por módulo), pero su único write gobernado es `mark_notifications_read`
(registry de Nexa TASK-1137, ni siquiera es una capability del catálogo de entitlements).
**Nexa hoy no puede ACCIONAR ninguna capability del catálogo** — aprobaciones, transiciones
de lifecycle, operaciones de finance/payroll, exports, recoveries: todas tienen contrato de
lectura pero ninguna está cableada al loop de acción gobernada de Nexa.

### Mapa de tools de Nexa (cobertura actual)

| Tool | Tipo | Dominio(s) | Capability(es) que toca |
|---|---|---|---|
| `check_payroll` | read | hr | nómina agregada (gate por route-group) |
| `explain_my_pay` | read (self) | hr | nómina propia del member |
| `get_otd` | read | agency / organization | OTD org / pulso global |
| `get_capacity` | read | people | capacidad equipo / personal |
| `pending_invoices` | read | finance | facturas pendientes/vencidas |
| `check_emails` | read | admin | salud delivery email |
| `search_knowledge` | read | knowledge | `knowledge.agentic.retrieve` ✅ |
| `propose_action` | **write** (gobernado) | — | `mark_notifications_read` (registry Nexa, no catálogo) |

## 3. Gobernanza de routes de mutación (snapshot 2026-06-20)

Total routes `POST/PUT/PATCH/DELETE` bajo `src/app/api/**`: **486**

| Auth class | Conteo | % | Lectura |
|---|---:|---:|---|
| capability-governed | 93 | 19% | `can(` (o `authorize*('cap.key')`) en el route |
| session-coarse | 343 | 71% | sesión/tenant/route-group **sin `can(` en el boundary** → cola de revisión |
| external | 23 | 5% | webhook/cron/agente/token (otro contrato) |
| unguarded-review | 27 | 6% | sin guard reconocible (mayoría platform-lane/cron/token) → revisar |

> ⚠️ **`session-coarse` NO es veredicto de deuda.** Cuenta routes sin `can(` **en el
> archivo del route**. El patrón canónico de Full API Parity empuja la lógica (y a veces el
> `can()`) al command en `src/lib/**` — esos routes están gobernados a nivel capability aunque
> el route solo tenga el tenant-gate. **Ejemplo verificado:** `enable-sync` tiene
> `requireInternalTenantContext` en el route + `can('delivery.ico.sync.enable')` en el command
> → `delivery.ico.sync.enable` clasifica ✅ `governed`. Esta cola requiere verificación
> per-route: capability en el command ⇒ OK; sin capability en ninguna capa ⇒ **deuda
> admin-coarse real** (ese subconjunto es el backlog de TASK-1177/1178).

## 4. Cómo re-medir

```bash
pnpm tsx scripts/audit/full-api-parity-coverage.ts            # reporte markdown
pnpm tsx scripts/audit/full-api-parity-coverage.ts --json     # JSON estructurado
pnpm tsx scripts/audit/full-api-parity-coverage.ts --out f.json
```

Idempotente: misma fuente → mismo mapa. Re-correrlo después de cada wave de remediación
mide el avance (sube `governed`, baja `session-coarse`/`declared-unwired`, sube
"accionables por Nexa").

## 5. Casos verificados (seed del ledger)

| # | Caso | Clasificación | Evidencia | Estado |
|---|---|---|---|---|
| 1 | Rollup ICO cliente hardcoded efeonce/sky | hardcoded (no-data-driven) | `src/lib/ico-engine/performance-report.ts:701`, `historical-reconciliation.ts:285` | **Sistémico cerrado por TASK-1171** (queda el hardcode de columnas como deuda menor) |
| 2 | `delivery.ico.sync.enable` (enable-sync) | ✅ governed | route `requireInternalTenantContext` + command `can(...)` | **OK** — el supuesto "admin-coarse" de la spec quedó desactualizado (lo cerró TASK-1171) |
| 3 | `organization.*` facets (account-360) | 🟡 lib-only (12 de 12) | `src/lib/organization-workspace/facet-capability-mapping.ts` | **Deuda:** projection server-only sin superficie API → MCP/app no la alcanzan por contrato |
| 4 | `client_portal.*` reads | ⚠️ declared-unwired (13) | solo en tests / cableado por facet-resolver, no por literal | **Verificar binding:** confirmar si el facet-resolver los consume por constante (OK) o están realmente sin cablear |
| 5 | Acción de negocio Nexa-operable | 0 capabilities accionables | `src/lib/nexa/nexa-tools.ts` (solo `mark_notifications_read`) | **Gap North Star principal** |

**Lección de método (de los casos 2 y 4):** la clasificación automática es una señal de
literal, no un veredicto. El `can()` puede vivir en el command (mejor patrón) y el cableado
puede ser por indirección. Por eso el reader marca explícitamente sus buckets como cola de
revisión, y la verificación per-capability/route es el trabajo de las tasks derivadas.

## 6. Backlog priorizado (valor-Nexa + riesgo + frecuencia)

Prioridad = qué tan lejos está del North Star (Nexa total operability) × frecuencia
operativa × riesgo de la deuda silenciosa.

| Rank | Gap | Valor-Nexa | Task derivada | Alimenta |
|---|---|---|---|---|
| 1 | **0% de capabilities accionables por Nexa** — extender el action registry de 1 a las top-N writes gobernadas de alta frecuencia (aprobaciones, lifecycle, notificaciones) | Crítico (es el North Star) | **TASK-1177** | Nexa runtime + TASK-1002 |
| 2 | **343 routes session-coarse** — verificar y backfillar `can()` donde el command no lo tenga (deuda admin-coarse real) | Alto (toda acción Nexa-operable necesita capability) | **TASK-1178** | TASK-658 (resource auth bridge) |
| 3 | **`organization.*` (12 lib-only) + `client_portal.*` (13 unwired)** — exponer facets de alto tráfico como read-surfaces gobernadas + verificar bindings | Alto (account-360 / portal cliente, alta frecuencia) | **TASK-1179** | TASK-650 (read surfaces program) |

(Niveles inferiores del backlog: `design_system` api-inline, `platform` declared-unwired,
`admin` declared-unwired — re-medir y enrutar en waves siguientes.)

## Related

- [`GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`](GREENHOUSE_FULL_API_PARITY_DECISION_V1.md) — criterio
- [`GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`](GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md) — lanes + Platform Health
- [`GREENHOUSE_NEXA_ARCHITECTURE_V1.md`](GREENHOUSE_NEXA_ARCHITECTURE_V1.md) + `agent-invariants/KNOWLEDGE_NEXA_AGENT_INVARIANTS.md` — action runtime
- `docs/tasks/to-do/TASK-1002-full-api-parity-first-wave-program.md` — programa que este ledger alimenta
- `docs/tasks/in-progress/TASK-1172-full-api-parity-gap-audit-existing-portal.md` — esta auditoría
