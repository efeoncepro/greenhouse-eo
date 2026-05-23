# GREENHOUSE_ATTRIBUTABLE_LATENESS_V1 — Atraso imputable + Trazabilidad de reprogramación

| Campo | Valor |
|---|---|
| Status | Accepted (modelo; implementación por tasks derivadas) |
| Created | 2026-05-23 por sesión deep-dive OTD/freeze + skills ICO + arquitectura + Notion |
| Owner domain | `delivery \| ico \| integrations \| payroll \| reliability` |
| Scope | Cómputo de atraso (lateness) de tareas de delivery, su efecto en OTD%/bono, y la trazabilidad de reprogramaciones |
| Supersede | El freeze/thaw a medio construir en fórmulas Notion (`Días de retraso`, `frozenDays`/`elYp` roto) — ver ISSUE-081 |
| Cross-refs | ISSUE-081 · OTD_V1 · CYCLE_TIME_V1 · CT_SLO_PCT_V1 · CUMPLIMIENTO_V1 · TASK-908 · TASK-912 · GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1 · GREENHOUSE_METRIC_SPEC_PATTERN_V1 · GREENHOUSE_PAYROLL_BONUS_CALCULATION_V1 · GREENHOUSE_ICO_METRICS_PROGRESSIVE_MIGRATION_V1 |

---

## 1. Contexto / problema

Hoy "días de retraso" (y la clasificación OTD que de él deriva) **cuenta tiempo que no es imputable a la agencia**: cuando una tarea espera al cliente (`Listo para revisión`), está `Bloqueado`, o está `En pausa`, el reloj sigue corriendo. Como ese atraso alimenta `otd_pct → calculateOtdBonus`, **el bono penaliza al colaborador por demoras ajenas**. Está activo en producción (ISSUE-081).

Causa estructural: las fórmulas Notion son **stateless** — no recuerdan el historial de transiciones. El intento de freeze/thaw en Notion depende de campos manuales de un solo casillero + un acumulador (`elYp`) que **fue borrado** → `frozenDays` siempre 0 → el descuento nunca ocurre. Y `Bloqueado`/`En pausa` nunca se congelaron (devuelven 0 y rebotan). Detalle completo: ISSUE-081.

En paralelo existe un mecanismo de **reprogramación** (mover la fecha límite, guardar la original, contar `Días reprogramados`) que el operador usa para trazabilidad y mejora continua. Hoy es una resta-foto (vigente − original) sin historial, sin conteo de movidas y, sobre todo, **sin motivo**.

## 2. Decisión

**Modelar dos conceptos canónicos separados, cada uno con su propia fuente de eventos append-only, que NUNCA se fusionan en un solo número:**

1. **Atraso imputable** — días tarde vs la *fecha justa*, con el reloj **congelado** durante estados no imputables (`Listo para revisión`, `Bloqueado`, `En pausa`), multi-ciclo. Alimenta OTD% → bono.
2. **Trazabilidad de reprogramación** — historial de cambios de `due_date`: cuántas veces, cuándo, de→a, y **por qué**. Alimenta retro/mejora/severidad y define la *fecha justa*.

**La bisagra**: el **motivo** de cada reprogramación decide contra qué fecha se mide el atraso (cliente→fecha nueva; interno→fecha original).

### Alternativas rechazadas

- *Reconectar `elYp` / arreglar la fórmula Notion* — no resuelve multi-ciclo, ni `Bloqueado`/`En pausa`, ni el motivo, ni la doble fuente BQ. Tapa el agujero.
- *Un solo número que incluya freeze + reprogramación* — mezcla dimensiones ortogonales (anti-patrón lumping).
- *Computar en fórmulas Notion* — viola el boundary canónico (Notion = OS / Greenhouse = motor); Notion stateless ya demostró que no puede.
- *Workers de Notion para el compute* — Beta, pricing inestable, prohibido para path de bono (notion-platform hard rule #8).

## 3. Las dos fuentes de eventos

### 3.1 `task_status_transitions` — REUSA (TASK-908)
Captura cada cambio de estado con timestamp, append-only, multi-ciclo. Provee los intervalos en `{Listo para revisión, Bloqueado, En pausa}` para el freeze. No se crea nada nuevo — primitiva canónica existente. **Canonical primitive vs new: reuse.**

### 3.2 `task_due_date_changes` — NUEVO (sibling de TASK-912)
Log append-only de cambios de `due_date`. Mismo patrón de captura: webhook `page.properties_updated` filtrado por `Fecha límite` → re-fetch (nunca confiar el payload) → HMAC → echo-loop filter → persist. Campos:

```
task_source_id, workspace_id, changed_at,
previous_due_date, new_due_date, days_delta (derivado),
status_at_change,            -- estado al momento del cambio (insumo de inferencia de motivo)
reason_code,                 -- enum CHECK: client_requested | scope_change |
                             --             external_blocker | internal_not_prioritized | other
reason_source,               -- inferred | operator_confirmed
source_event_id (UNIQUE partial — idempotencia)
```

Reemplaza el casillero único `Fecha límite original` + `Días reprogramados`:
- fecha original = `previous_due_date` del primer evento; nº reprogramaciones = count; desplazamiento neto = vigente − original; **historial por movida** = los eventos.

Triggers anti-UPDATE/anti-DELETE (append-only). CHECK enum cerrado en `reason_code` y `reason_source`.

## 4. Atraso imputable — definición canónica

```
fecha_justa = fecha_original
            + Σ days_delta de reprogramaciones FORWARD con reason ∈ {client_requested, scope_change}

atraso_imputable = max(0,
      días_calendario(fin, fecha_justa)
    − tiempo en {Listo para revisión, Bloqueado, En pausa} posterior a fecha_justa)

  fin = completed_at  (o now() si abierta)
```

Mismo algoritmo de resta de intervalos que `calculateCycleTime` (CYCLE_TIME_V1 §4.1), con tres diferencias canónicas:
1. el reloj arranca en la **fecha (deadline)**, no en "En curso";
2. set de exclusión = los **3 estados de freeze** (Cycle Time solo excluye `Bloqueado`);
3. solo cuenta intervalos **posteriores** a la fecha justa.

> **Distinción canónica vs Cycle Time**: el tiempo en revisión del cliente se **EXCLUYE** del atraso (no penalizar a la agencia) pero se **INCLUYE** en Cycle Time (calendario real). `En pausa` se excluye del atraso pero NO de Cycle Time. Documentar siempre para no confundir los sets.

## 5. Anti-doble-descuento — partición disjunta de motivos

| Motivo de reprogramación | ¿Extiende `fecha_justa`? | ¿Lo maneja el freeze? |
|---|---|---|
| `client_requested` / `scope_change` | **Sí** (mueve la promesa) | No |
| `external_blocker` | No | Sí (estado `Bloqueado`) |
| (espera de revisión) | No | Sí (estado `Listo para revisión`) |
| (pausa) | No | Sí (estado `En pausa`) |
| `internal_not_prioritized` | No (slip de agencia) | No |

**Invariante**: las razones que extienden `fecha_justa` (cliente/scope) son **disjuntas** de los estados que congela el freeze. Por construcción, ningún wall-clock interval se cuenta en ambos. Reprogramar citando un bloqueo es higiene operativa pero **no cambia la atribución** — el freeze ya lo maneja.

## 6. Motivo: inferido + confirmado

- Greenhouse **infiere** el motivo desde `status_at_change` + transiciones recientes (¿estaba Bloqueado? ¿venía de Cambios solicitados? ¿llevaba rato En pausa/Sin empezar?).
- El operador **confirma o corrige** en Notion (select `Motivo de reprogramación`).
- **Para el bono solo se usa el motivo confirmado** (cambia contra qué fecha mide). Sin confirmar → default conservador + reliability signal `reschedules_pending_reason`. Honest degradation, nunca inventar.

## 7. OTD bucket reason-aware → bono

Recalcular los 4 buckets usando `fecha_justa` + freeze: `on_time` (atraso=0), `late_drop` (cerrada, atraso>0), `overdue` (abierta, pasó fecha_justa neto de freeze), `carry_over` (abierta, dentro de fecha_justa). Computado en Greenhouse (VIEW canónica + helper `calculateAttributableLateness`), feed a `otd_pct → calculateOtdBonus`, writeback a Notion. **No es input nuevo al bono — es corrección del existente** → estrangulador + sign-off HR.

## 8. Severidad (retro/management, NO bono)

Tiers ordinales transparentes (no score caja-negra), derivados de los dos logs:

| Tier | Patrón |
|---|---|
| 🟢 | a tiempo, sin reprogramar |
| 🟠 | reprogramada (cliente/scope) y a tiempo vs fecha justa, o slip chico |
| 🔴 | tarde vs original sin reprogramar, o reprogramada interna pero llegó |
| 🔴🔴 | reprogramada interna y aún tarde (te diste plazo y fallaste) |

Dimensiones acompañantes: nº reprogramaciones, desplazamiento total, mix de motivos. Fuera del bono — el bono ya se autorregula vía la regla motivo→fecha (no se castiga dos veces).

## 9. Naming (3 capas)

| Capa | Convención |
|---|---|
| Interno (PG/BQ/código) | explícito: `attributable_days_late`, `task_due_date_changes`, `fair_deadline`, `reschedule_reason` |
| Notion (visible al usuario) | **amigable, sin prefijo**: `Días de retraso`, `Días reprogramados`, `Reprogramaciones`, `Motivo de reprogramación` |
| Señal read-only | vía **permiso Notion + descripción**, no por el nombre; `[GH]` solo transitorio durante shadow |

Convención a canonizar para todas las propiedades `[GH] *` (ADR chico aparte — follow-up).

## 10. Boundary canónico (Notion = OS / Greenhouse = motor)

- **Notion captura**: cambios de estado, cambios de `due_date`, motivo confirmado por operador.
- **Greenhouse computa**: atraso imputable, fecha justa, buckets, severidad.
- **Greenhouse devuelve**: propiedades read-only (amigables) vía writeback. Cero compute en fórmulas Notion.

## 11. Scoring 5-pillar (ICO) + 4-pillar (arquitectura)

| Pilar | Veredicto |
|---|---|
| **Safety** | Toca el bono → estrangulador + shadow ≥30d + 8 stop-gates + sign-off HR. Motivo confirmado (no inferido) para decisiones que afectan plata. |
| **Robustness** | Multi-ciclo por event logs; invariante anti-doble-descuento por partición disjunta; degradación honesta (motivo unknown → conservador + signal). |
| **Resilience** | Feature-flag por fase; rollback <5min; fórmulas Notion legacy 90d en paralelo; reliability signals (shadow parity, reschedules pending reason, freeze/reschedule overlap). |
| **Scalability** | Event logs escalan; mismo patrón ya probado (TASK-908/912); soporta N tenants. |
| **Auditability** ⭐ | Cada valor de atraso reproducible desde los dos logs + motivo; snapshot por período. |

## 12. Migración (estrangulador — toca el bono)

1. **Foundation**: captura `task_due_date_changes` + inferencia de motivo + propiedad `Motivo de reprogramación` (sibling TASK-912). Backfill best-effort de la fecha original desde `Fecha límite original` existente.
2. **Compute en shadow**: `calculateAttributableLateness` + VIEW + bucket reason-aware, **shadow mode** (log + paridad vs `otd_pct` actual), reliability signal `shadow_paridad_otd_attributable`. Sin tocar el bono.
3. **Writeback** de las propiedades amigables a Notion (aún shadow para el bono).
4. **Cutover del OTD-bono** → fuente corregida. Requiere los 8 stop-gates + sign-off HR + ≥30d shadow verde + umbral de calidad de datos de motivo.
5. Backward compat 90d: fórmulas Notion legacy en paralelo.

## 13. Hard rules (anti-regresión)

- **NUNCA** fusionar atraso imputable y reprogramación en un solo número.
- **NUNCA** extender `fecha_justa` por motivos que ya maneja el freeze (Bloqueado/revisión/pausa) — doble descuento.
- **NUNCA** usar motivo inferido (sin confirmar) para una decisión que afecta el bono.
- **NUNCA** computar en fórmulas Notion — Greenhouse motor, Notion OS.
- **NUNCA** flipear la fuente del OTD-bono sin los 8 stop-gates + sign-off HR + shadow verde.
- **NUNCA** confiar el payload del webhook — siempre re-fetch.
- **NUNCA** `Sentry.captureException` directo — `captureWithDomain(err, 'integrations.notion' | 'delivery', ...)`.
- **SIEMPRE** `task_due_date_changes` append-only (anti-UPDATE/DELETE).
- **SIEMPRE** degradación honesta: sin datos → `unavailable`, nunca 0 silencioso.
- **SIEMPRE** documentar que el set de exclusión del atraso difiere del de Cycle Time.

## 14. Open questions (defaults V1 + lo que sigue abierto)

1. **`En pausa` incondicional**: V1 congela siempre (decisión del operador), + reliability/retro signal "tiempo significativo En pausa por motivo interno" como contrapeso honesto. Re-evaluar si emerge abuso.
2. **Histórico sin motivo** (reprogramaciones pre-captura): default `legacy_unknown` → medido vs **vigente** (no castigar retroactivo). Confirmar.
3. **¿Severidad llega a CVR/scorecard cliente** o es solo retro interno V1? → V1 solo retro interno; CVR es follow-up.
4. **Sky**: modelo nace tenant-agnóstico; falta verificar fórmulas Sky para confirmar set de estados + semántica (ver ISSUE-081 verificación).

## 15. Roadmap por tasks derivadas

- **TASK-921** — Captura `task_due_date_changes` + inferencia de motivo + propiedad Notion `Motivo de reprogramación` (foundation, sibling TASK-912).
- **TASK-922** — Helper `calculateAttributableLateness` + VIEW canónica + bucket OTD reason-aware en **shadow** + reliability signals.
- **Follow-ups (no creados aún — strangler, emergen cuando sean accionables)**: superficies de severidad/retro; cutover del OTD-bono (gated, sign-off HR); ADR chico de convención de naming `[GH]`; spec de métrica `ATTRIBUTABLE_LATENESS_V1.md` + Delta a `OTD_V1.md` (bucket reason-aware).
- Cierra/contribuye a **ISSUE-081**.
