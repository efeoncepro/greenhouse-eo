# TASK-1900 — Semáforos ICO: una sola fuente (el registro), sin umbrales escritos a mano

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `reader`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `delivery`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees ni rama por task`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Seis lugares del portal pintan el semáforo de OTD% o RpA con umbrales escritos a mano; tres no coinciden con
`ICO_METRIC_REGISTRY`, la fuente que el operador fijó como única el 2026-09-25. Esta task los migra a
`getThresholdZone` + `THRESHOLD_ZONE_COLOR` del registro y agrega una guarda para que no vuelvan. **No toca el bono**:
sus umbrales viven aparte, en `greenhouse_payroll.payroll_bonus_config`, y siguen intactos.

## Why This Task Exists

Al revisar TASK-1888 (Efeonce Insights) aparecieron cuatro versiones distintas de los umbrales de OTD%, FTR% y RpA:
registro, specs V1, contrato de métricas y glosario. El operador decidió el 2026-09-25 que **manda el registro**
(OTD 90/70, FTR 80/60, RpA 1,5/2,5), que el bono OTD vigente es 94 % y que los semáforos escritos a mano deben leer del
registro. La documentación ya se alineó (glosario, contrato, specs V1 con Delta, invariantes ICO, skill
`greenhouse-ico`); falta el código.

Inventario verificado en código el 2026-09-25:

| Lugar | Hoy | Registro | ¿Cambia algo visible? |
|---|---|---|---|
| `src/lib/person-360/get-person-ico-profile.ts:137-148` (`computeHealth`) | OTD verde ≥80, amarillo ≥50; RpA 1,5 / 2,5 | OTD 90 / 70 | Sí: OTD 80–89 pasa de verde a amarillo; 50–69 de amarillo a rojo |
| `src/views/greenhouse/people/tabs/PersonHrProfileTab.tsx:405` (tile OTD) | verde ≥89, si no amarillo | 90 / 70, tres colores | Sí: 89 pasa a amarillo; <70 pasa a rojo |
| `src/lib/capability-queries/helpers.ts:395-398` (tono «RpA operativo») | ≤2 éxito, ≤3 atención | 1,5 / 2,5 | Sí: 1,5–2 pasa a atención; 2,5–3 a error |
| `src/components/agency/space-health.ts:6-12` | RpA 1,5 / 2,5; OTD 90 / 70 | igual | No (sólo cambia la fuente) |
| `src/lib/nexa/nexa-tools.ts:330, 414, 1385` | OTD ≥90 éxito, si no atención | 90 | No (binario; toma el mínimo óptimo del registro) |
| `src/lib/copy/agency.ts:24` (`rpa_semaphore`) | 1,5 / 2,5 | igual | No (sólo cambia la fuente) |

## Goal

- Ningún semáforo de OTD%, FTR% o RpA fuera del registro y de la configuración del bono tiene números escritos a mano.
- Los tres lugares que divergían muestran la zona del registro.
- Una guarda automática impide reintroducir literales.
- El cálculo y la configuración del bono no cambian.

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
- `docs/architecture/metrics/ICO_DELIVERY_METRICS_AGENT_INVARIANTS.md` — § «Umbrales ICO — una sola fuente por propósito»
- `docs/architecture/GREENHOUSE_PAYROLL_BONUS_CALCULATION_V1.md` — Delta 2026-09-25 (bono separado del semáforo)

Reglas obligatorias:

- Semáforo = `ICO_METRIC_REGISTRY` vía `getThresholdZone(metric, value)` y `THRESHOLD_ZONE_COLOR`
  (`src/lib/ico-engine/metric-registry.ts:592-612`). Bordes: mayor-es-mejor `≥ optimal.min` óptimo, `≥ attention.min`
  atención; menor-es-mejor `≤ optimal.max` óptimo, `≤ attention.max` atención.
- **NUNCA** tocar `src/lib/payroll/bonus-proration.ts`, `src/lib/payroll/bonus-config.ts`,
  `greenhouse_payroll.payroll_bonus_config` ni `calculateOtdBonus` / `calculateRpaBonus`.
- Un valor nulo se sigue tratando como hoy en cada lugar (no inventar zona para un dato ausente).
- Copy de zonas desde `src/lib/copy/*`; nada de strings nuevos inline.

## Normative Docs

- Skill `greenhouse-ico` (hard rule «Umbrales: una fuente por propósito»).
- `docs/context/06_glosario-metricas.md` § C (umbrales, ya alineados al registro).

## Dependencies & Impact

### Depends on

- `ICO_METRIC_REGISTRY` y `getThresholdZone` existentes (`src/lib/ico-engine/metric-registry.ts`).

### Blocks / Impacts

- `TASK-1883` (severidad de insights ICO por umbral de negocio): debe consumir el mismo registro; esta task no la bloquea.
- `TASK-1170` (corte del bono OTD): sin impacto; el bono no se toca.
- Vistas People / HR / Agency / Nexa que muestran los semáforos listados.

### Files owned

- `src/lib/person-360/get-person-ico-profile.ts`
- `src/views/greenhouse/people/tabs/PersonHrProfileTab.tsx`
- `src/lib/capability-queries/helpers.ts`
- `src/components/agency/space-health.ts`
- `src/lib/nexa/nexa-tools.ts`
- `src/lib/copy/agency.ts`
- Guarda nueva (test) bajo `src/lib/ico-engine/`

## Current Repo State

### Already exists

- `getThresholdZone`, `THRESHOLD_ZONE_COLOR` y `getMetricById` en `metric-registry.ts`; importables desde componentes
  cliente (ya los usa `src/views/greenhouse/my/MyPerformanceView.tsx`).
- Consumidores que ya leen del registro: `MyPerformanceView`, `PersonActivityTab`, `SpaceIcoScorecard`, `IcoGlobalKpis`,
  `NexaInsightsBlock`, `NexaInsightsTimeline`, `person-intelligence/store.ts`, `ico-engine/read-metrics.ts`,
  Efeonce Insights (`adapters/ico-adapter.ts`).
- Documentación alineada el 2026-09-25 (glosario, contrato, FTR_V1/RPA_V1/OTD_V1 con Delta, invariantes, skill).

### Gap

- Seis lugares con literales (tabla de «Why»), tres de ellos divergentes.
- Ninguna guarda contra literales nuevos.
- `UI impact: none` a propósito: no cambia layout, copy, interacción ni componentes; cambia la fuente del umbral y, por
  lo tanto, el color de algunos valores en tres pantallas (tabla de «Why»). No hay superficie nueva que diseñar.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/ico-engine/metric-registry.ts` (fuente) y los seis consumidores listados.
- Future candidate home: `remain-shared`
- Boundary: `ICO_METRIC_REGISTRY` + `getThresholdZone` como única fuente del semáforo; bono fuera de alcance.
- Server/browser split: el registro ya es importable en cliente; sin stores ni secretos.
- Build impact: `none`
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-lite`
- Impacto principal: `reader`
- Source of truth afectado: `ICO_METRIC_REGISTRY` (sin cambios de valores).
- Consumidores afectados: DTO de salud de `get-person-ico-profile` (campo de salud), tono de capability queries, tools de
  Nexa y vistas People/Agency.
- Runtime target: `staging` y `production` (Vercel).

### Contract surface

- Contrato existente a respetar: forma de los DTOs (valores de salud `green|yellow|red`, tonos `success|warning|error`).
- Contrato nuevo o modificado: ninguno; cambia el umbral que decide el valor, no la forma.
- Backward compatibility: `compatible` (mismos enums; cambia la clasificación de algunos valores).
- Full API parity: sin capability nueva; los readers existentes devuelven la zona del registro a UI, API y Nexa por igual.

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna.
- Invariantes que no se pueden romper:
  - El bono no cambia: cero diffs en `src/lib/payroll/**` y en `payroll_bonus_config`.
  - Un valor nulo conserva el tratamiento actual de cada lugar.
  - El registro es la única fuente del semáforo.
- Write-target allowlist: N/A — sin escrituras.
- Tenant/space boundary: sin cambios.
- Idempotency/concurrency: sin cambios (funciones puras).
- Audit/outbox/history: ninguno; cambio de lectura.

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: activo al desplegar (sin flag; cambio de clasificación visual acotado y reversible).
- Backfill plan: ninguno.
- Rollback path: revert PR + redeploy.
- External coordination: avisar a People/HR que el color de salud ICO de algunas personas cambia (OTD 80–89 %).

### Security and access

- Auth/access gate: sin cambios.
- Sensitive data posture: métricas de desempeño por persona (ya expuestas hoy con los mismos permisos).
- Error contract: sin cambios.
- Abuse/rate-limit posture: no aplica: funciones puras de clasificación.

### Runtime evidence

- Local checks: tests de cada helper con tabla antes/después; guarda de literales; `pnpm vitest run src/lib/payroll` verde.
- DB/runtime checks: ninguno.
- Integration checks: revisión visual de las tres pantallas que cambian en staging.
- Reliability signals/logs: ninguno nuevo.
- Production verification sequence: ver `## Rollout Plan & Risk Matrix`.

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumidores nombrados con rutas reales.
- [ ] Invariantes explícitas, incluido «el bono no cambia».
- [ ] Postura sin migración y rollback por revert.
- [ ] Evidencia de tests y de revisión visual listada.

## Capability Definition of Done — Full API Parity gate

N/A — no capability: cambia la fuente de un umbral de lectura; no hay acción de negocio nueva ni modificada.

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

### Slice 1 — Los tres lugares que divergen

- `computeHealth` (person-360): OTD y RpA vía `getThresholdZone`; la regla compuesta se conserva (verde si ambos
  óptimos, amarillo si ambos ≤ atención, rojo si no; RpA nulo mantiene el tratamiento actual).
- Tile OTD de `PersonHrProfileTab`: color = `THRESHOLD_ZONE_COLOR[getThresholdZone(otd)]` (tres colores).
- Tono «RpA operativo» de capability queries: zona del registro.
- Tests con tabla antes/después por lugar.

### Slice 2 — Los tres lugares que ya coinciden

- `space-health.ts`, `nexa-tools.ts` (tres puntos) y `copy/agency.ts` (`rpa_semaphore`) pasan a leer del registro sin
  cambiar lo que muestran (tests que fijan la igualdad).

### Slice 3 — Guarda

- Test que falla si aparece una comparación numérica de OTD/FTR/RpA con literal fuera de `metric-registry.ts`,
  `src/lib/payroll/**` y los tests, con allowlist explícita y razonada.

## Out of Scope

- Cambiar valores del registro o de la configuración del bono.
- Semáforos del bono en `src/views/greenhouse/payroll/helpers.ts` (`otdSemaphore` 94/70, `rpaSemaphore` 3): muestran
  bandas de pago, deben leer la configuración del bono, no el registro. Follow-up con `greenhouse-payroll-auditor`.
- Severidad de insights ICO (`TASK-1883`).
- Umbrales de otras métricas ICO (cycle time, stuck, etc.).

## Detailed Spec

Antes/después esperado en los lugares que cambian:

| Valor | `computeHealth` hoy → después | Tile OTD RRHH hoy → después | Tono RpA hoy → después |
|---|---|---|---|
| OTD 92 %, RpA 1,2 | green → green | success → success | — |
| OTD 85 %, RpA 1,2 | green → yellow | warning → warning | — |
| OTD 89 % | según RpA → yellow | success → warning | — |
| OTD 60 % | yellow → red | warning → error | — |
| RpA 1,8 | yellow → yellow | — | success → warning |
| RpA 2,8 | red → red | — | warning → error |

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3 (la guarda al final, cuando ya no quedan literales fuera de la allowlist).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Se toca el bono por error | payroll | low | invariante + `pnpm vitest run src/lib/payroll` + revisión de diff sin cambios en `src/lib/payroll/**` | tests de payroll |
| Personas ven su salud ICO bajar de verde a amarillo sin aviso | UI People/HR | medium | aviso previo a People/HR con la tabla antes/después | consultas de People |
| Un valor nulo pasa a clasificarse | UI | low | tests de nulos por lugar | tests |

### Feature flags / cutover

- sin flag — additive, immediate cutover: cambio acotado de clasificación, reversible por revert.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR + redeploy | < 15 min | si |
| Slice 2 | revert PR + redeploy | < 15 min | si |
| Slice 3 | revert del test | inmediato | si |

### Production verification sequence

1. Local: tests por lugar + guarda + `pnpm vitest run src/lib/payroll` verde.
2. Staging: revisar las tres pantallas que cambian con una persona de OTD entre 80 y 89 %.
3. Producción vía release control plane; aviso a People/HR antes.

### Out-of-band coordination required

- Aviso a People/HR: el color de salud ICO cambia para OTD entre 80 y 89 % y en la ficha de RRHH para 89 %.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Los seis lugares leen el umbral de `ICO_METRIC_REGISTRY` (`getThresholdZone` / `THRESHOLD_ZONE_COLOR`).
- [ ] La tabla antes/después de «Detailed Spec» está cubierta por tests.
- [ ] Los nulos conservan el tratamiento actual (tests).
- [ ] La guarda falla ante un literal nuevo fuera de la allowlist (test que lo demuestra).
- [ ] Cero cambios en `src/lib/payroll/**`, `bonus-config.ts`, `bonus-proration.ts` y `payroll_bonus_config`;
  `pnpm vitest run src/lib/payroll` verde.
- [ ] Aviso a People/HR registrado antes del release.

## Verification

- `pnpm local:check`
- Tests focales de los seis lugares + guarda
- `pnpm vitest run src/lib/payroll src/lib/person-360 src/lib/ico-engine`
- `pnpm task:lint --task TASK-1900`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Invariantes ICO y skill `greenhouse-ico`: quitar la nota «literales pendientes de migrar».

## Follow-ups

- Semáforos del bono en `src/views/greenhouse/payroll/helpers.ts` leyendo `payroll_bonus_config` en vez de 94/70/3
  escritos a mano (hoy coinciden con la fila vigente; divergen si la configuración cambia). Con `greenhouse-payroll-auditor`.

## Open Questions

- Ninguna bloqueante. Las decisiones de negocio (registro manda; bono OTD vigente 94 %) las tomó el operador el
  2026-09-25.
