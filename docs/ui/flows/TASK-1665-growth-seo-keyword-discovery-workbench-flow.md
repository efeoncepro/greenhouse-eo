# Flow — TASK-1665 · Keyword discovery: de seed a decisión gobernada

> **Tipo:** contrato de flujo para una lente async dentro de una ruta existente.
> **Task:** [TASK-1665](../../tasks/to-do/TASK-1665-growth-seo-keyword-discovery-workbench.md)
> **Wireframe:** [TASK-1665 wireframe](../wireframes/TASK-1665-growth-seo-keyword-discovery-workbench.md)
> **Dirección:** [TASK-1665 direction](../visual-directions/TASK-1665-growth-seo-keyword-discovery-workbench-direction.md)
> **Master flow:** [EPIC-022 Search Visibility 360](EPIC-022-search-visibility-360-UI-FLOW.md), nodo S3.

## Flow brief

- Actor principal: operador Efeonce de Growth.
- Actor secundario: Nexa/MCP sólo mediante el mismo command y, para writes, el loop
  `propose → confirm → execute`.
- Entry: `/admin/growth/seo/keywords` con Space/target ya resuelto y guard vigente.
- Pregunta: `¿Qué nuevas búsquedas investigo y qué hago con cada resultado?`.
- Exit exitoso: una corrida materializada y una decisión explícita por candidate.
- Non-goals: publicar contenido, activar prompts AEO, competir contra dominios, crear tracking implícito,
  ejecutar un cron invisible o llamar DataForSEO desde el browser.

## Surface map

| Nodo | Superficie | Rol | Primitive/recipe |
|---|---|---|---|
| S3 | `/admin/growth/seo/keywords` | contenedor y navegación | `SurfaceRecipe analyticsReport` |
| D1 | lente `Descubrir` | command builder | `WorkbenchHeader` + controls canónicos |
| D2 | status de corrida | feedback async | `GreenhouseChip`/status region |
| D3 | candidates | decisión y lectura | `DataTableShell` + compact cards |
| D4 | candidate drawer | provenance/action | drawer/sidecar canónico |
| O1 | `Objetivos` | resultado de declarar target | link a lente existente |
| P1 | `/admin/growth/seo/performance` | trayectoria | link con `?keywords=` |
| A1 | AEO prompt-set review | propuesta grounded | command de `TASK-1666`, sin activación automática |

## Actors and gates

| Actor | Puede ver | Puede ejecutar | Gate |
|---|---|---|---|
| Operador con read + configure | resultados, builder, actions | discovery y tracking | capability + `seo_v2` assignment |
| Operador sólo read | resultados y estado | no provider, no tracking | CTA/actions de gasto no se renderizan |
| Nexa interno | reader y propone command | sólo tras confirmación humana | binding interno + action loop |
| MCP read client | reader client-safe si assignment | no discovery write | `efeonce.mcp.read` |
| MCP interno | reader + propuesta | command write confirmado | `efeonce.mcp.seo.write` |
| Cliente portal | nada en V1 | nada | fuera de scope |

## Main journey — crear una corrida

```text
Keywords → Descubrir
  │
  ├─ server resuelve Space, target, flags, capabilities y última corrida
  │
  ├─ operador escribe seeds / elige fuente / método / alcance
  │       │
  │       ├─ input inválido → error inline, texto preservado
  │       └─ input válido → preview calls/rows/costo/cupo
  │                         │
  │                         ├─ budget/flag/permiso bloqueado → CTA disabled + razón
  │                         └─ confirma → queueKeywordDiscovery
  │                                      │
  │                                      ├─ duplicate → devuelve run existente, 0 provider calls
  │                                      ├─ queued → 202 + runId
  │                                      ├─ provider disabled → disabled, 0 calls
  │                                      └─ error canónico → aria-live + recovery
  │
  └─ reader polling/revalidation → queued → running → succeeded|partial|no_results|failed|budget_blocked
```

### Step 1 — Entry and context resolution

1. El operador entra por el tab `Descubrir` desde Keywords.
2. La page server valida el mismo viewCode/capability/assignment de S3.
3. `space`/target se valida server-side; un query param no autorizado cae al Space elegible canónico.
4. El ViewModel incluye flag, `canRead`, `canExecute`, market, latest run, seed sources disponibles,
   remaining budget/cap y copy freshness.
5. La UI monta el builder sólo con datos del ViewModel; no ejecuta un request para "ver si existe".

### Step 2 — Seed editing

1. El operador escribe una o más seeds, una por línea.
2. Se muestran counter y errores locales definidos en el wireframe.
3. La UI normaliza para preview sólo con el helper/DTO canónico; no inventa sinónimos ni corrige idioma.
4. El operador puede activar GSC/seguidas/dominio y métodos permitidos.
5. Cada cambio relevante actualiza preview por debounce; el costo visible no es una autorización: el
   command recalcula server-side antes de persistir.

### Step 3 — Preview and confirmation

La banda debe mostrar:

```text
Seeds válidas: 2 · métodos: 2 · llamadas: 4
Filas máximas solicitadas: 100
Costo estimado máximo: ◑ US$…
Cupo disponible: US$…
```

- `Confirmar` sólo se habilita si el server-derived VM dice `canExecute=true` y el client form es válido.
- Si el presupuesto cambia entre preview y submit, el command vuelve a bloquear; la UI muestra el nuevo
  valor y no reintenta automáticamente.
- Si una corrida GSC-only no consume Labs, el preview dice `$0 de proveedor` sin afirmar `sin costo
  total` de infraestructura.
- La confirmación no dice `Guardar`; dice `Descubrir keywords` para que el efecto sea concreto.

### Step 4 — Queue and status

`queueKeywordDiscovery` realiza una transacción con run `pending` + outbox. La UI:

- guarda `runId` en query state/URL sólo si el command confirmó persistencia;
- conserva resultados de la corrida anterior marcados `stale` mientras el nuevo run corre;
- no usa optimistic candidates;
- muestra `queued` y luego revalida el reader con intervalo gobernado o refresh explícito, nunca un
  loop agresivo por segundo.

Status contract:

| Evento | UI | aria-live | Recovery |
|---|---|---|---|
| `queued` | banda + run ID legible | `La corrida quedó en cola` | volver/navegar |
| `running` | etapa actual si existe | `La corrida está procesando…` | refresh |
| `succeeded` | candidates + costo real/as-of | `La corrida terminó con N candidatos` | decidir |
| `partial` | rows + fuente fallida | `La corrida terminó parcialmente` | revisar/nueva corrida |
| `no_results` | empty actionable | `La corrida terminó sin candidatos` | cambiar inputs |
| `budget_blocked` | costo ejecutado + stop reason | `La corrida se detuvo por cupo` | reducir alcance |
| `provider_error` | canonical error | `No pudimos completar la corrida` | retry explícito |

No se anuncia un porcentaje si el worker no entrega progreso confiable.

## Candidate decision journey

```text
Candidate row/card
  │
  ├─ abrir detalle → drawer con provenance/as-of/markers
  │       │
  │       ├─ Ver trayectoria → performance read-only
  │       ├─ Declarar objetivo → confirm → trackKeywords(intent=target)
  │       ├─ Seguir oportunidad → confirm → trackKeywords(intent=opportunity)
  │       ├─ Preparar grounded queries → confirm → TASK-1666 draft AEO
  │       └─ Descartar → action log append-only
  │
  └─ command result → row state + per-item outcome + focus restore
```

### Candidate detail ownership

El drawer no deriva scores ni cambia estado. Recibe `candidateViewModel` con:

- keyword/normalized keyword sólo para display/action;
- seed(s) y endpoint de origen;
- run ID, capturedAt, providerLastUpdatedAt;
- `searchVolume`, `keywordDifficulty`, `competition`, `intent`, `coreKeyword` con marker `◑`;
- GSC rank/page/capturedAt con marker `●` cuando existe;
- current tracking/target state;
- capabilities y actions permitidas.

Si falta una propiedad, el drawer muestra el estado semántico entregado (`Sin dato`, `Sin medición
propia`, `Sin agrupador`), nunca intenta consultar otro proveedor.

## Action flows

### A — Declarar objetivo

1. Click/Enter `Declarar objetivo`.
2. Drawer abre confirmación gobernada.
3. Copy muestra que entra al ciclo diario y puede generar costo recurrente.
4. Confirmación llama el mismo `trackKeywords` de `TASK-1659`/`1660` con intent `target`.
5. Button queda pending; se bloquea doble click.
6. Outcome por keyword:
   - `declared` → state `Objetivo`, link a Objetivos;
   - `already_target` → no-op explícito;
   - `capacity_exceeded`/`budget_blocked`/`forbidden` → permanece candidate y muestra razón;
   - mixed → resumen mixto + outcomes individuales.
7. Focus vuelve a la fila; `aria-live` anuncia el resultado.

### B — Seguir como oportunidad

Es el mismo flujo de A, con `intent='opportunity'` y copy de seguimiento recurrente. No se permite
usar un label genérico `Agregar` ni asumir que una oportunidad provider ya pertenece al set.

### C — Preparar grounded queries

1. Click/Enter abre confirmation con texto `crea un draft AEO; no activa el set`.
2. UI envía candidate IDs/selection al command de `TASK-1666`; no envía un prompt libre como autoridad.
3. Command valida org/target/candidate IDs y crea/propone draft usando el AEO lifecycle existente.
4. Resultado:
   - `draft_created` → state `Preparando AEO`, link a review AEO;
   - `baseline_fallback` → state `Draft base para revisión`, copy no promete grounding específico;
   - `prompt_authoring_disabled`/`forbidden` → candidate queda intacto, recovery explícito.
5. Nunca se llama `approveGraderPromptSet` desde esta UI en la misma acción.

### D — Descartar

1. Click/Enter `Descartar` registra action append-only.
2. No borra candidate ni run.
3. La fila queda filtrable por `Descartado` y puede recuperar contexto.

### E — Ver trayectoria

Link normal a `/admin/growth/seo/performance?keywords=<encoded>` con Space/target preservado. No
inicia provider run y no mezcla datos de mercado con series GSC.

## State machine

```text
closed
  ↓ route guard
open / empty
  ↓ valid builder
preview_ready
  ├─ disabled/forbidden/budget_blocked
  └─ confirm
       ↓
queued → running
  ├─ succeeded → results
  ├─ partial → partial_results
  ├─ no_results → empty_result
  ├─ budget_blocked → stopped_cost
  └─ provider_error → failed_result

results → candidate_detail
candidate_detail → action_confirm
action_confirm → action_pending → action_success|action_partial|action_error
```

Transitions not allowed:

- `empty → candidate` without a run reader result;
- `preview_ready → provider call` without command confirmation;
- `candidate → tracked` without `trackKeywords` outcome;
- `draft_created → active` in the same UI action;
- `running → succeeded` without persisted run status/candidates.

## Failure and recovery paths

| Failure | UI | Recovery |
|---|---|---|
| flag OFF | disabled state | esperar activación; no retry |
| no entitlement | read-only/denied | solicitar acceso; no CTA provider |
| invalid seed | inline error | corregir seed, preservar válidas |
| budget preview blocked | cost/cupo | reducir methods/limit; no retry automático |
| duplicate submit | run existente | navegar al run, cero costo adicional |
| worker delayed | queued/running honest | refresh/volver; no falso fracaso |
| partial | rows existentes + fuente fallida | nueva corrida explícita |
| no results | empty con explicación | cambiar seed/method/market |
| provider failure | canonical error, sin raw | retry explícito y nuevo run |
| stale latest | as-of visible | iniciar nueva corrida |
| action permission lost | button 403/hidden | mantener candidate, refrescar access |
| action mixed | per-row results | revisar sólo fallidas, no repetir todas |
| navigation away | run sigue server-side | URL runId compartible, volver conserva estado |

## Routing and URL contract

- Base path: `/admin/growth/seo/keywords`.
- Lens: `?view=discovery` sólo si el patrón existente de la page lo necesita; si la navegación hermana
  usa path/query vigente, reutilizarlo, no inventar `TabPanel` state. La URL canónica no cambia a una
  ruta `/discovery`.
- Context: `space` se propaga como en S1–S3 y se revalida server-side.
- Discovery query state: `discoveryRun`, `q`, `source`, `intent`, `state`, `minVolume`, `maxDifficulty`.
- Run ID no es autoridad: un run de otra org responde anti-oracle.
- Back desde drawer vuelve a la fila; back desde performance vuelve a la lista con filtros.
- Reload reevalúa guard/flag y mantiene sólo query params allowlisted; input de seed no persiste en URL
  ni logs.

## Focus, keyboard and motion

- Entry focus: heading de la lente o primer control del builder según patrón hermano.
- Tab order: seeds → sources → methods → market → limit → preview disclosure → CTA → run status →
  filters/results.
- `Escape`: cierra confirmation; luego drawer; luego filters drawer. Nunca borra seeds sin confirmación.
- Focus restore: al trigger de drawer/action; tras filtrar, permanece en filtro.
- `aria-live='polite'`: preview sólo tras cambio significativo; run transitions; per-action outcomes.
- Reduced motion: no stagger de rows, no spinner infinito, no chart entrance; status/pending conserva
  indicador estático accesible.

## API/data boundaries

- Reads: `readKeywordDiscovery` de TASK-1664.
- Queue: `queueKeywordDiscovery` de TASK-1664; route devuelve 202/runId.
- Tracking: `trackKeywords`/`untrackKeywords`; esta UI no escribe members.
- Grounded: command de TASK-1666; recibe candidate IDs, no raw table query.
- Optimistic update: prohibido para provider run y tracking; sólo puede actualizar estado visual pending
  después de respuesta command durable.
- Cache: run/candidates materializados; revalidación por run status, no provider call en render.
- Tenant: org/target/Space derivados server-side; no client portal in V1.

## GVC scenario contract

- Scenario: `scripts/frontend/scenarios/growth-seo-keyword-discovery.scenario.ts`.
- Desktop sequence: entry → Descubrir → builder vacío → builder valid with cost → queued → running →
  succeeded → drawer → action confirmation → mixed result.
- Mobile sequence: entry 390 → builder stacked → cost/CTA → status → candidate card → drawer → Escape
  focus restore → scroll-width assertion.
- Fixture modes: `empty`, `budget_blocked`, `queued`, `running`, `partial`, `succeeded`, `mixed_action`.
- Captures: `seo-keyword-discovery-builder`, `seo-keyword-discovery-cost`,
  `seo-keyword-discovery-status`, `seo-keyword-discovery-results`,
  `seo-keyword-discovery-candidate-drawer`.
- Required assertions: no login redirect, no error boundary, no provider request from browser, no
  raw-error text, `scrollWidth === clientWidth`, markers visible, keyboard restore, reduced motion.

## Design decision log

- One flow inside S3, not a new product surface: preserves context and route authority.
- Async status is explicit: Labs is Live but command is worker-backed to protect Vercel/latency.
- Actions are branch-specific: target, opportunity and grounded query have different costs/effects.
- `draft` is not `active`: bridge to AEO stops at existing review/approval lifecycle.
- Candidate facts remain immutable; dismiss/promote are actions, not destructive edits.

## Acceptance checklist

- [ ] The owning task declares this flow and wireframe.
- [ ] Entry/exit, route/query/back behavior and tenant guard are explicit.
- [ ] Seed/preview/queue/run/results/action journey is complete.
- [ ] All statuses, failure paths, recovery and mixed outcomes are explicit.
- [ ] Focus, keyboard, Escape, restore, aria-live and reduced motion are explicit.
- [ ] API/data boundaries name commands/readers and prohibit UI SQL/provider calls.
- [ ] Desktop/mobile transformations and GVC sequence are executable.
- [ ] No step leaves the implementer to decide whether a candidate auto-tracks or a draft auto-activates.
