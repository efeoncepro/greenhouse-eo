# GREENHOUSE_TASK_STATUS_LIFECYCLE_V1

> **Status**: Accepted
> **Date**: 2026-05-17
> **Authors**: sesión deep-dive CEO + arch-architect + greenhouse-ico + notion-platform skills (Bomba 1 detectada y resuelta)
> **Scope**: Delivery / ICO / Notion / cross-tenant operativo
> **Extiende**: `GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md`
> **Es precondición de**: `GREENHOUSE_RPA_V2_STRANGLER_MIGRATION_V1.md` + TASK-908 + TASK-901 + TASK-910 + futuras TASK-902/903/904

---

## Delta 2026-05-18 — Flow operativo real + timestamp canonical obligatorio per transición

Post validación PoC RpA V2 contra Demo teamspace (sesión 2026-05-18), se documentan 2 invariantes operativos adicionales que el ADR no explicitaba:

### 1. Flow operativo canonical real (correcciones in-place)

El equipo NO vuelve a `En curso` entre rondas de revisión. Las correcciones se trabajan **dentro del status `Cambios solicitados`**:

```
[ronda 1] En curso → Listo para revisión → Cambios solicitados
[ronda 2]                                        → Listo para revisión → Cambios solicitados
[ronda 3]                                                                      → Listo para revisión → Cambios solicitados
[final]                                                                                                      → Listo para revisión → Aprobado
```

`En curso` solo aparece UNA VEZ al inicio (primera ejecución pre-primera-review). Después, el equipo trabaja los cambios sin cambiar el status.

**Implicación para semántica de estados** (extiende §3 del ADR):

| Estado canonical | Significado original | Significado operativo real |
|---|---|---|
| `En curso` | "Trabajo activo en ejecución" | **Solo primera ejecución** pre-primer-review |
| `Cambios solicitados` | "Revisor pidió cambios" | "Cambios pedidos + equipo trabajando los cambios" (incluye work-in-progress de revisión) |

→ Esto NO cambia los 11 estados canonical ni la transición target de RpA. La regla canonical `Listo para revisión → Cambios solicitados` es robusta a cualquier estado pre-`Listo para revisión` — funciona idéntico viniendo de `En curso` o de `Cambios solicitados` previo.

**Implicación para métricas downstream (CRÍTICO para futuras TASKs)**:

| Métrica futura | Cómo se ve afectada |
|---|---|
| **Cycle Time canonical** | `Cambios solicitados` debe contar como "trabajo activo" igual que `En curso` — NO como "en revisión congelado" |
| **Time-in-status** | El tiempo total en `Cambios solicitados` puede ser engañoso (incluye work + waiting for next review) — métrica derivada debe distinguir |
| **Throughput / Pipeline Velocity** | No afectadas — basadas en transitions terminales (`→ Aprobado`) |
| **RpA / FTR** | No afectadas — regla canonical es robusta a flow real |

### 2. Timestamp canonical obligatorio per transición

`greenhouse_delivery.task_status_transitions` (TASK-908 owned) **debe capturar timestamp canonical de cada transición** — es load-bearing para todas las métricas temporales (Cycle Time, Time-in-Status, Lead Time, etc.).

Schema canonical reforzado:

```sql
CREATE TABLE greenhouse_delivery.task_status_transitions (
  transition_id UUID PRIMARY KEY,
  task_source_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  from_status TEXT NOT NULL,                   -- canonical (uno de los 11)
  to_status TEXT NOT NULL,                     -- canonical (uno de los 11)
  transitioned_at TIMESTAMPTZ NOT NULL,        -- ★ CANONICAL del webhook event.timestamp
  transitioned_by TEXT,                        -- Notion user_id que hizo el cambio
  source_event_id TEXT UNIQUE,                 -- dedup canonical
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW() -- Greenhouse-side processing time
);

CREATE INDEX ts_task_id_time_idx
  ON greenhouse_delivery.task_status_transitions (task_source_id, transitioned_at DESC);
```

**Diferencia entre los 2 timestamps** (ambos obligatorios per row):

| Campo | Source | Uso canonical |
|---|---|---|
| `transitioned_at` | `event.timestamp` del webhook Notion (canonical) | Source of truth para métricas temporales (Cycle Time, Time-in-Status, lag analysis) |
| `captured_at` | `NOW()` cuando Greenhouse persiste | Observability del lag webhook → Greenhouse (debug delivery delays) |

**Implicación operativa**:
- Vía webhook canonical (TASK-908): `transitioned_at = event.timestamp` (accurate al segundo)
- Vía polling (PoC sandbox): `transitioned_at = page.last_edited_time` (proxy, no exacto del status change) — limitación documentada
- Vía backfill histórico: `transitioned_at` reconstruido best-effort, marcar con flag `is_backfilled=TRUE` (opcional V1.1)

**Queries canonical habilitadas por timestamp obligatorio**:

```sql
-- Time-in-status per task (windowed)
SELECT
  task_source_id,
  to_status,
  transitioned_at AS started_at,
  LEAD(transitioned_at) OVER (
    PARTITION BY task_source_id ORDER BY transitioned_at
  ) AS ended_at,
  EXTRACT(EPOCH FROM (
    LEAD(transitioned_at) OVER (PARTITION BY task_source_id ORDER BY transitioned_at)
    - transitioned_at
  ))/3600 AS hours_in_status
FROM greenhouse_delivery.task_status_transitions
WHERE task_source_id = ?
ORDER BY transitioned_at;

-- Cycle Time canonical per task (start to Aprobado)
SELECT
  task_source_id,
  MIN(transitioned_at) FILTER (WHERE from_status = 'Sin empezar') AS started_at,
  MAX(transitioned_at) FILTER (WHERE to_status = 'Aprobado') AS approved_at
FROM greenhouse_delivery.task_status_transitions
GROUP BY task_source_id;
```

**Hard rule adicional canonical**:

- **NUNCA** persistir una transition row sin `transitioned_at` populado. Es load-bearing para Cycle Time canonical (TASK derivada futura) + Time-in-Status (futuro).

### Validación PoC empírica (sesión 2026-05-18)

PoC RpA V2 ejecutado contra Demo teamspace capturó 6 polls con 5 transitions reales, validando:
- ✅ Regla canonical `Listo para revisión → Cambios solicitados` cuenta correcto (RpA = 2 esperado, RpA = 2 detectado)
- ✅ Timestamps disponibles vía Notion `last_edited_time` (~accurate como proxy del status change)
- ✅ Flow real operativo (correcciones in-place) funciona idéntico al flow sintético
- ⚠️ Polling pierde transitions intermedias entre snapshots — confirma necesidad de webhook canonical (TASK-908)

Detalle completo en commit del PoC + transitions log persistido (`.poc-snapshots/demo-transitions-log.json`, gitignored).

---

## 0. TL;DR canonical

**Todos los teamspaces Notion de Greenhouse usan los mismos 11 estados canonical universales en una property llamada `Estado`.** Sin variantes per cliente. Sin per-tenant mapping. Sin adapter layer.

Vocabulary canónico: `Sin empezar`, `Brief listo`, `En curso`, `Listo para revisión`, `Cambios solicitados`, `Aprobado`, `Pendiente aprobación interna`, `En pausa`, `Bloqueado`, `Cancelado`, `Archivado`.

**Evento canonical "1 corrección" para RpA/FTR**: transición `Listo para revisión → Cambios solicitados`. Funciona idéntico en todos los tenants.

**Implicación operativa**: cliente nuevo se onboardea clonando el template canonical Notion — cero customización del vocabulary de status. Operadores cross-tenant hablan el mismo idioma.

---

## 1. Contexto y motivación

### Bomba silenciosa detectada (2026-05-17)

Auditoría manual de schemas Notion reveló drift estructural cross-tenant:

| Aspecto | Efeonce hoy | Sky Airline hoy |
|---|---|---|
| Property name | `Estado` | `Estado 1` (typo histórico) |
| Estado "revisión rechazada" | `Cambios Solicitados` | `En feedback` |
| Estado "aprobada" | `Listo` | `Aprobado` |
| Estado "cancelada" | `Cancelada` | _(no existe)_ |
| Estado "out of scope" | `Archivadas` | `Archivado` |
| Estados Efeonce-only | `Listo para diseñar`, `Pendiente Dir. Arte`, `Detenido` | _(no existen)_ |
| Estados Sky-only | `Tomado` (era tag de "responsable cliente Sky" mal puesto como status) | _(N/A)_ |

**Consecuencia**: cualquier helper que asumiera un solo vocabulary (o property name) cross-tenant rompería estructuralmente. El ADR `GREENHOUSE_RPA_V2_STRANGLER_MIGRATION_V1.md` firmado horas antes asumía la transición canonical `Listo para revisión → En Feedback` que **solo existe en Sky**.

### 2 paths considerados

**Path A — Per-tenant mapping config (adapter layer)**
- Notion mantiene vocabulary divergente per cliente
- Greenhouse tiene `tenant-status-mapping.ts` que traduce a canonical interno
- Compute Greenhouse opera con canonical, Notion display preserva local

**Path B — Templates Notion unificados (este ADR)**
- Todos los teamspaces Notion usan los mismos 11 estados canonical universales
- Cero adapter layer
- Cliente nuevo = clone del template canonical, sin customización vocabulary

### Decisión canonical: Path B

Razones:
1. **Single source of truth** sin adapter layer = menos código, menos bugs, menos drift posible
2. **Operadores cross-tenant hablan mismo idioma** — onboarding más rápido + comunicación cross-team más clara
3. **Cliente nuevo = clone template** — escalable a N clientes sin código nuevo ni config nueva
4. **Métricas auto-comparables** — no hay "RpA Sky" vs "RpA Efeonce" — hay un solo RpA con misma semántica
5. **El "costo"** (rename de status existentes en Notion + reasignar tasks legacy) es **one-time** y barato (operador-side, Notion UI)

Path A se rechaza porque: optimiza la flexibilidad per cliente, pero esa flexibilidad NO es feature operativa (es ruido histórico). Mantener vocabulary divergente forever para preservar legacy es worse-of-both-worlds.

---

## 2. Lifecycle canonical — 11 estados universales

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                       │
│  TO DO (queued)                                                      │
│    1. Sin empezar      — task creada, sin brief ni asignación clara  │
│    2. Brief listo      — brief/spec aprobada, queued for execution   │
│                                                                       │
│  IN PROGRESS (active)                                                │
│    3. En curso         — trabajo activo en ejecución                 │
│    4. Listo para revisión — entregada al revisor (cliente/aprobador) │
│    5. Cambios solicitados — revisor pidió cambios ★ CORRECCIÓN ★    │
│                                                                       │
│  BLOCKED (paused)                                                    │
│    7. Pendiente aprobación interna — esperando aprobador interno     │
│    8. En pausa         — pausa por decisión interna (no externa)     │
│    9. Bloqueado        — bloqueada por dependencia externa           │
│                                                                       │
│  DONE (terminal)                                                     │
│    6. Aprobado         — aceptada como final, entrega completa       │
│    10. Cancelado       — terminada explícitamente sin entrega        │
│    11. Archivado       — sacada de scope sin entrega final           │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

### Tabla canonical de estados

| # | Estado canonical | Grupo Notion | Color recomendado | Semántica universal |
|---|---|---|---|---|
| 1 | `Sin empezar` | to_do | gray | Task creada, sin brief listo ni asignación arrancada |
| 2 | `Brief listo` | to_do | purple | Brief/spec aprobada, queued para ejecución |
| 3 | `En curso` | in_progress | blue | Trabajo activo en ejecución |
| 4 | `Listo para revisión` | in_progress | yellow | Entregada al revisor (cliente o aprobador) |
| 5 | `Cambios solicitados` | in_progress | orange | **Revisor pidió cambios — define evento "1 corrección"** |
| 6 | `Aprobado` | done | green | Aceptada como final, entrega completa |
| 7 | `Pendiente aprobación interna` | to_do | purple | Esperando aprobador interno (Lead, Manager, Dir. Arte) |
| 8 | `En pausa` | to_do | brown | Pausada por decisión interna (no por external) |
| 9 | `Bloqueado` | to_do | red | Bloqueada por dependencia externa (cliente, proveedor, terceros) |
| 10 | `Cancelado` | done | red | Terminada explícitamente sin entrega final |
| 11 | `Archivado` | done | gray | Sacada de scope sin entrega final |

### Property name canonical

**`Estado`** (singular, capitalizado) en **todos los teamspaces**. Sin sufijos numéricos (`Estado 1` se rechaza — era typo histórico Sky).

---

## 3. Reglas semánticas canonical

### 3.1 Distinción `Bloqueado` vs `Pendiente aprobación interna` vs `En pausa`

| Estado | Cuándo usar | Owner para desbloquear |
|---|---|---|
| `Bloqueado` | Dependencia **externa** al equipo Greenhouse/Cliente (proveedor caído, ToS de terceros, asset no llegó) | Externo |
| `Pendiente aprobación interna` | Esperando **aprobador específico interno** (Dir. Arte, Lead, Manager, Stakeholder) | Persona interna identificable |
| `En pausa` | **Decisión interna de pausar** sin dependencia específica (deprioritizada, esperando timing, hold sin escalation) | Quien la pausó |

**Por qué importa**: cada uno tiene **escalation path distinto**. `Bloqueado` puede requerir intervención de Lead. `Pendiente aprobación interna` requiere ping a la persona específica. `En pausa` no requiere acción — es business decision.

### 3.2 Distinción `Sin empezar` vs `Brief listo`

| Estado | Cuándo usar | Implica |
|---|---|---|
| `Sin empezar` | Task creada pero brief incompleto o asignación incierta | Trabajo de **briefing** pendiente |
| `Brief listo` | Brief aprobado + scope claro, sólo falta empezar ejecución | Trabajo de **ejecución** pendiente |

**Por qué importa**: cycle time canonical descuenta el tiempo en `Sin empezar` (es brief delay, no work delay). Sólo cuenta desde `Brief listo` o `En curso` adelante.

### 3.3 Distinción `Cancelado` vs `Archivado`

| Estado | Cuándo usar | Cuenta en métricas? |
|---|---|---|
| `Cancelado` | Decisión activa de terminar sin entrega (cliente canceló scope, deprioritizada definitivamente) | **NO** (excluida del denominador) |
| `Archivado` | Sacada de scope por housekeeping (duplicada, fuera de scope, obsolete) | **NO** (excluida del denominador) |

Ambos son terminales sin entrega — la distinción es semántica (cancel = decisión activa; archivado = housekeeping). Cycle time + completion rate + throughput excluyen ambos del denominador.

### 3.4 Estados intermedios "blocked" NO interrumpen el conteo de corrección

Si una tarea pasa por:
```
Listo para revisión → En pausa → Listo para revisión → Cambios solicitados
```

**Eso cuenta como 1 corrección** (la transición `Listo para revisión → Cambios solicitados` final). La pausa intermedia no la duplica ni la cancela.

Pero:
```
Listo para revisión → Cambios solicitados → En curso → Listo para revisión → Cambios solicitados
```

**Cuenta como 2 correcciones** (dos transiciones canonical).

---

## 4. Evento canonical "1 corrección"

**Definición canonical universal** (cierra la premisa rota del ADR RpA V2):

> **1 corrección = 1 transición `Listo para revisión → Cambios solicitados`** en la status history canonical de la tarea.

**RpA per-task** = `count(transitions WHERE from_status = 'Listo para revisión' AND to_status = 'Cambios solicitados')`.

**Funciona idéntico en todos los tenants** (Efeonce, Sky, Demo, futuros) porque todos comparten los mismos 11 estados canonical.

**Forward-compat**: si emerge una fuente alternativa de "rounds" (Frame.io rounds, workflow comments, etc.), se compone con esta vía policy declarativa — pero el evento canonical primario es la transición observable de status.

---

## 5. Migration Notion (operador-side)

### Cleanup pendiente per teamspace

| Teamspace | Acción de cleanup canonical |
|---|---|
| **Efeonce** | Rename `Cancelada` → `Cancelado`; rename `Archivadas` → `Archivado`; rename `Listo` → `Aprobado`; rename `Cambios Solicitados` → `Cambios solicitados`; rename `Listo para diseñar` → `Brief listo`; rename `Pendiente Dir. Arte` → `Pendiente aprobación interna`; rename `Detenido` → `En pausa` |
| **Sky Airline** | Rename property `Estado 1` → `Estado`; rename `En feedback` → `Cambios solicitados`; agregar 4 estados nuevos (`Brief listo`, `Pendiente aprobación interna`, `En pausa`, `Cancelado`); eliminar `Tomado` (no es status, es responsable — usar campo `Responsable`); fusionar `Pendiente` → `Sin empezar` |
| **Demo Greenhouse** | Re-clonar del template canonical Efeonce post-cleanup, O aplicar mismo cleanup que Efeonce |

### Responsable

**Operador** (CEO) ejecuta el cleanup directamente en Notion app. No requiere migration script Greenhouse-side porque el status es source en Notion (no en PG).

**Coordinación con stakeholders**:
- Operadores Sky (Constanza, Adriana) notificados del rename `En feedback → Cambios solicitados`
- Equipo Delivery interno notificado del rename Efeonce
- Equipo Sky reasigna tareas que hoy están en `Tomado` → moverlas a `En curso` o `Sin empezar` antes de eliminar `Tomado`

### Order canonical de migration

1. **Crear template canonical** en Demo Greenhouse (TASK-910 sandbox) con los 11 estados — sirve de reference
2. **Migrate Efeonce** (más fácil — solo renames, no agregar estados)
3. **Migrate Sky** (más trabajo — agregar 4 estados nuevos + eliminar `Tomado` + rename property)
4. **Verify post-migration** — sample queries Notion confirman los 11 estados existen en ambos teamspaces

---

## 6. Implicaciones canonical (qué se simplifica)

### Vs. Path A (adapter layer)

| Aspecto | Path A (rechazado) | Path B canonical (este ADR) |
|---|---|---|
| Adapter layer Greenhouse | Sí (`tenant-status-mapping.ts`) | **No** |
| Property name resolver | `getPropertyNameForTenant(tenantId)` | Constant `'Estado'` |
| Schema `task_status_transitions` | 2 columnas (`raw_status` + `canonical_status`) | 1 columna (`status` = canonical = raw) |
| Reliability signal `unmapped_status_drift` | Sí (complejo per-tenant) | **No necesario** (Notion = canonical) |
| Onboarding nuevo cliente | Crear mapping config + adapter | Clone template Notion |
| Mantenibilidad | Adapter sincronizado per cliente | Cero |

### Impacto en ADR RpA V2

El ADR `GREENHOUSE_RPA_V2_STRANGLER_MIGRATION_V1.md` se actualiza con Delta:
- Premisa canonical: lifecycle universal (este ADR) — referenciar antes de cualquier compute
- Schema `task_status_transitions` simplificado (sin columnas `canonical_*`)
- `countCorrectionTransitions` consume `from_status = 'Listo para revisión' AND to_status = 'Cambios solicitados'` directo
- Cero adapter layer

### Impacto en TASK-908

- Slice nuevo `S-1` (pre-foundation): coordinar cleanup Notion en Efeonce + Sky + Demo según §5
- Schema `task_status_transitions` sigue simple (no agregar columnas canonical)
- Helper `countCorrectionTransitions` queda más simple

### Impacto en TASK-910

- Demo teamspace ya existe clonado de Efeonce
- Re-clonar post-cleanup canonical, o aplicar mismo cleanup
- Sirve como **reference template** para clientes nuevos futuros

---

## 7. Hard rules canonical

1. **NUNCA** introducir un estado nuevo en Notion fuera de los 11 canonical sin pasar por update de este ADR + bump version.
2. **NUNCA** usar property name distinto de `Estado` para status de task en ningún teamspace Greenhouse-managed.
3. **NUNCA** introducir variant de spelling (`Cambios Solicitados` vs `Cambios solicitados`) — el canonical es el documentado en §2.
4. **NUNCA** usar status como tag de "responsable" o "tipo de trabajo" o "prioridad" — esas dimensiones viven en otros campos.
5. **NUNCA** computar métrica ICO que dependa del status sin haber verificado que los 11 canonical están sincronizados en el teamspace consultado.
6. **SIEMPRE** que un cliente nuevo emerja, clonar el template canonical Notion (Demo Greenhouse) sin customizar vocabulary de status.
7. **SIEMPRE** que emerja necesidad operativa de granularidad extra (sub-status, tags), proponer un campo nuevo (no extender el enum canonical).
8. **SIEMPRE** que el cleanup Notion se ejecute en un teamspace, verificar via Notion MCP que los 11 estados están presentes + property se llama `Estado` + status no canónicos están eliminados.

---

## 8. Decisiones canonical 2026-05-18 (ex Open Questions cerradas)

Sesión live 2026-05-18 cerró las 3 open questions deferred del ADR. Status pasa a "Decisiones canonical aprobadas".

### 8.1 ✅ Reliability signal canonical `notion.task.status_drift_from_canonical` — V1 (desde TASK-908)

**Decisión canonical**: signal incluido **desde V1 en TASK-908** (no V1.1 diferido).

- **Kind**: drift
- **Severity**: warning si emerge estado non-canonical en algún teamspace, steady=0
- **Reader**: compara enum values actuales de cada teamspace Notion vs los 11 canonical hardcoded en Greenhouse
- **Disparador esperado** (probabilidad media en operación real):
  - Operador HR/Delivery agrega estado nuevo por necesidad operativa real (e.g. emerge "Pendiente legal review")
  - Cliente nuevo onboardea con vocabulary distinto sin clonar template canonical
  - Drift accidental (test, basura) que queda en producción

**Razón de incluir en V1**: el costo de drift silencioso post-flip productivo (puede mover RpA real sin que nos enteremos) supera el ~30 min extra de dev en TASK-908. Defense in depth canonical.

**Implementation hint para TASK-908**:
```typescript
// src/lib/reliability/queries/notion-task-status-drift-from-canonical.ts (TBD)
const CANONICAL_STATUSES = [
  'Sin empezar', 'Brief listo', 'En curso', 'Listo para revisión',
  'Cambios solicitados', 'Aprobado', 'Pendiente aprobación interna',
  'En pausa', 'Bloqueado', 'Cancelado', 'Archivado'
] as const

// Per teamspace: fetch data source schema via Notion API → compare options vs CANONICAL_STATUSES
// Si emerge un name fuera del set → signal warning con detalle (teamspace + non-canonical option name + first observed timestamp)
```

### 8.2 ✅ Localización i18n — deferred indefinidamente (NO V1, NO planificar V2)

**Decisión canonical**: vocabulary canonical permanece es-CL universal. Si emerge cliente real que requiera status en inglés (u otro idioma), ese momento será el trigger para diseñar layer de i18n separada (Notion display per idioma, canonical interno sigue siendo es-CL).

**Razón**: YAGNI. Diseñar i18n sin caso real es overengineering.

**Trigger para revisitar**: primer cliente que pida status en idioma distinto. NO antes.

### 8.3 ✅ `Brief listo` — coexiste con `Sin empezar` en V1, revisar adoption a 90 días post-migration

**Decisión canonical**: ambos estados quedan disponibles en el canonical desde V1. `Sin empezar` para tasks con brief incompleto, `Brief listo` para tasks con brief aprobado + queued.

**Revisión a 90 días post-migration completa**: si operadores en práctica no usan `Brief listo` (queda 0 tasks asignadas sostenido), V1.1 puede eliminarlo del canonical. Pero precipitar la eliminación pre-migración es prematuro.

**Trigger para revisitar**: 90 días post-Sky + Efeonce + Demo migration completos (cleanup canonical). Check via Notion query: ¿cuántas tasks tienen `Brief listo`? Si sostenido < 5% del total operativo → considerar eliminarlo en V1.1.

---

## 9. Cross-refs canonical

- **ADRs predecesores**:
  - `GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md` — boundary canonical
  - `GREENHOUSE_METRIC_SPEC_PATTERN_V1.md` — spec V1 pattern

- **ADRs sucesores (afectados)**:
  - `GREENHOUSE_RPA_V2_STRANGLER_MIGRATION_V1.md` — Delta canonical aplicado (esto cierra Bomba 1)
  - Futuros: TASK-902 (OTD), TASK-903 (FTR), TASK-904 (Cumplimiento), TASK-905+ (Cycle Time, Throughput, Pipeline Velocity, etc.)

- **Tasks implementación**:
  - TASK-908 — foundation status transitions (`task_status_transitions` schema simplificado por este ADR)
  - TASK-901 — RpA V2 strangler (premisa corregida por este ADR)
  - TASK-910 — Demo teamspace (template canonical post-cleanup)
  - Nueva TASK derivada (pendiente crear): `TASK-9XX-notion-status-canonical-template-migration` para tracking operativo del cleanup

- **Skills canonical (actualizadas por este ADR)**:
  - `~/.claude/skills/greenhouse-ico/conceptual-framework/boundary-notion-os-vs-greenhouse-engine.md`
  - `~/.claude/skills/notion-platform/greenhouse-runtime/property-allowlist.md`

---

## 10. Aprobación y registro

- **Decisión canonical aprobada**: 2026-05-17 por CEO Greenhouse (Julio Reyes Rangel)
- **Bug class fuente**: Bomba 1 detectada sesión live 2026-05-17 (status divergence cross-tenant)
- **Skills invocadas pre-decisión**: `arch-architect` Greenhouse overlay + `greenhouse-ico` + `notion-platform`
- **Registrado en**: `docs/architecture/DECISIONS_INDEX.md` entry #69
- **Próxima revisión**: post cleanup Notion ejecutado en Efeonce + Sky + Demo (verificación de los 11 estados sincronizados)

---

**End of ADR**
