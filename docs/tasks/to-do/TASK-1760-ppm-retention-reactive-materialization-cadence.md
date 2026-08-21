# TASK-1760 — Cablear la materialización reactiva de PPM y retenciones

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Bajo`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `sync`
- Epic: `EPIC-041`
- Status real: `Causa raiz verificada contra runtime el 2026-08-21; correccion no iniciada`
- Rank: `1`
- Domain: `finance`
- Blocked by: `none`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Las posiciones mensuales de PPM y retenciones no se recalculan desde el `2026-06-20` porque nunca se cableó un disparador: no existe projection reactiva, ni cron de Vercel, ni job de Cloud Scheduler que llame al materializador. El motor de cálculo ya existe y funciona — las 19 filas de PPM y las 2 de retenciones son un backfill manual único de `TASK-1204`. Esta task registra las projections que faltan, replicando el patrón de IVA, y corrige la señal de drift que hoy es ciega a un período sin fila.

## Why This Task Exists

`TASK-1204` re-materializó PPM y retenciones el `2026-06-20` y declaró por escrito que *"la re-materialización corre por ops-worker/cron o endpoint admin existente; sin nueva capability"* (`docs/tasks/complete/TASK-1204-*.md:147` `[verificar línea]`). Ese cron nunca existió: la afirmación describía la cadencia del **IVA**, no la de PPM.

La asimetría está medida:

| | IVA | PPM / Retenciones |
| --- | --- | --- |
| Projection reactiva | `vatMonthlyPositionProjection` (`src/lib/sync/projections/vat-monthly-position.ts`), registrada en `src/lib/sync/projections/index.ts:170` | ninguna — `grep -rn "ppm" src/lib/sync/projections/` devuelve cero |
| Disparadores | 6 eventos `finance.income.*` / `finance.expense.*` | ninguno |
| Job de Cloud Scheduler | — | ninguno entre los 57 de `services/ops-worker/deploy.sh` |
| Cron de Vercel | — | ninguno entre los 8 de `vercel.json` |
| Última materialización | `2026-08` el `2026-08-21` | `2026-06` el `2026-06-20`, congelado |

Los únicos callers de `materializePpmForPeriod` son su propio wrapper `materializeAllAvailablePpmPeriods` (`src/lib/finance/ppm-ledger.ts:195`) y su test: **ningún caller de runtime**. La ruta `src/app/api/finance/ppm/monthly-position/route.ts` es read-only pura — lee y nunca materializa.

Consecuencia medida el `2026-08-21`: julio y agosto tienen documentos reales con base imponible (`CLP 5.800.000` cada mes) y **cero posición PPM**. A la tasa vigente de `0,125%` son `CLP 7.250` por mes sin calcular. El monto es menor; el hueco es estructural y crece un mes por mes.

Y la señal que debería detectarlo **no puede, por construcción**: `src/lib/reliability/queries/ppm-position-drift.ts:46` parte `FROM ppm_monthly_positions p LEFT JOIN recomputed r`, es decir desde las posiciones que existen. Un período con documentos y sin fila nunca entra en el `FROM`. La señal reporta 8 posiciones con base stale y los 2 períodos huérfanos le son invisibles. Es la misma clase de ceguera que gobierna `EPIC-041`: la ausencia no se distingue del cero.

## Goal

- PPM y retenciones se recalculan solos cuando entra un documento, igual que el IVA, sin intervención manual.
- Los períodos `2026-07` y `2026-08` quedan materializados con su base real.
- La señal de drift de PPM detecta un período con documentos y sin posición, no sólo una posición con base obsoleta.
- La projection nueva no hereda el defecto de atribución de período que arrastra la de IVA.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`

Reglas obligatorias:

- SIEMPRE invocar la skill `greenhouse-finance-accounting-operator` antes de tocar `src/lib/finance/**` o cualquier flujo fiscal.
- NUNCA copiar la resolución de período de la projection de IVA sin corregirla: `getVatLedgerScopeFromPayload` cae al mes corriente cuando el payload no trae período, y el payload de `finance.expense.nubox_synced` no lo trae. Copiar el patrón, no el defecto.
- NUNCA materializar un período fiscal ya declarado al SII sin decisión humana explícita. Recalcular un período cerrado cambia una cifra que un tercero ya recibió.
- NUNCA corregir la señal de drift ampliando su tolerancia: el arreglo es que vea los períodos ausentes, no que deje de reportar los presentes.
- NUNCA ejecutar `UPDATE` manual sobre `ppm_monthly_positions` ni `retention_monthly_positions`; la única vía de escritura es el materializador canónico.

## Normative Docs

- `docs/epics/to-do/EPIC-041-reliability-remediation-verified-findings.md` — programa dueño; esta task es su punto 1 del orden de ejecución.
- `docs/tasks/in-progress/TASK-1186-greenhouse-fiscal-positions-expansion.md` — umbrella que coordina PPM y retenciones como sub-capacidades y declara que los hijos aportan sus propios files.
- `docs/tasks/to-do/TASK-1203-f29-officialization-ppm-retention-signoff.md` — dueña de la oficialización del F29 y de la validación contable. Esta task le entrega la cadencia; NO decide qué línea es oficial.
- `docs/tasks/complete/TASK-1204-*.md` `[verificar nombre exacto]` — origen del backfill del 2026-06-20 y de la suposición de cadencia que no se cumplió.
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` — `PPM_POSITION_ENABLED` y `RETENTION_POSITION_ENABLED` están `true` en Production, verificado el 2026-08-21.

## Dependencies & Impact

### Depends on

- `materializePpmForPeriod` y `materializeAllAvailablePpmPeriods` (`src/lib/finance/ppm-ledger.ts`)
- El materializador equivalente de retenciones (`src/lib/finance/retention-ledger.ts`)
- `greenhouse_finance.ppm_monthly_positions`, `greenhouse_finance.retention_monthly_positions`
- Registro de projections (`src/lib/sync/projections/index.ts`) y `ProjectionDefinition` (`src/lib/sync/projection-registry.ts`)
- Lane reactiva que drene el dominio `finance` en `services/ops-worker/deploy.sh`

### Blocks / Impacts

- `TASK-1203` — depende de que exista cadencia antes de oficializar líneas del F29.
- `TASK-1186` — cierra dos de sus cuatro sub-capacidades en su dimensión operativa.
- `EPIC-041` — punto 1 de su orden de ejecución.
- Consumidores del F29 consolidado (`src/lib/finance/f29-consolidated.ts`) y de los readers de PPM/retenciones.

### Files owned

- `src/lib/sync/projections/ppm-monthly-position.ts` (nuevo)
- `src/lib/sync/projections/retention-monthly-position.ts` (nuevo)
- `src/lib/sync/projections/index.ts`
- `src/lib/reliability/queries/ppm-position-drift.ts`
- `src/lib/reliability/queries/retention-position-drift.ts`
- `src/lib/finance/ppm-ledger.ts` (solo si la resolución de período lo exige)

## Current Repo State

### Already exists

- Materializadores funcionando: produjeron 19 posiciones de PPM y 2 de retenciones el 2026-06-20 sin error.
- Patrón canónico completo y vivo en `src/lib/sync/projections/vat-monthly-position.ts`: `triggerEvents`, `extractScope`, `refresh`, y publicación del evento `*_period_materialized` al terminar.
- Tablas destino con sus columnas y su `rate_source`; `ppm_rate_config` con la tasa correcta `0.00125` confirmada por el operador el 2026-08-21.
- Señales de drift registradas para ambas líneas.
- Contrato consolidado `getF29ConsolidatedMonthlyPosition` que ya degrada honestamente devolviendo `null` cuando no hay posición materializada.
- Flags `PPM_POSITION_ENABLED` y `RETENTION_POSITION_ENABLED` en `true` en Production.

### Gap

- No existe `ProjectionDefinition` para PPM ni para retenciones; nada llama al materializador en runtime.
- `2026-07` y `2026-08` sin posición, con base imponible real de `CLP 5.800.000` por mes.
- La señal de drift de PPM no puede detectar un período ausente porque parte desde las posiciones existentes.
- El reader de drift de retenciones no filtra `is_annulled`, mientras el materializador sí lo hace (`src/lib/finance/retention-ledger.ts:171`), lo que produce un falso positivo permanente sobre un documento anulado y reemitido.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/sync/projections/**` y `src/lib/finance/**`, ejecutados por el Cloud Run `ops-worker` en su lane reactiva de finanzas.
- Future candidate home: `domain-package`
- Boundary: el materializador canónico es la única escritura autorizada a las tablas de posiciones; la projection sólo decide cuándo invocarlo y con qué período.
- Server/browser split: `server-only`; sin superficie de browser.
- Build impact: `none`
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `sync`
- Source of truth afectado: `greenhouse_finance.income` y `greenhouse_finance.expense` como origen; `ppm_monthly_positions` y `retention_monthly_positions` como materialización derivada.
- Consumidores afectados: contrato F29 consolidado, readers de PPM/retenciones, señales de drift, y el contador como consumidor humano final.
- Runtime target: `worker`

### Contract surface

- Contrato existente a respetar: `ProjectionDefinition`, el patrón de `vat-monthly-position.ts`, y el contrato de degradación honesta de `f29-consolidated.ts`.
- Contrato nuevo o modificado: dos `ProjectionDefinition` nuevas; corrección del SQL de las dos señales de drift.
- Backward compatibility: `compatible` — no cambia la forma de ninguna tabla ni de ningún reader; sólo hace que se pueblen solas.
- Full API parity: la materialización queda como efecto de dominio gobernado por el outbox, invocable por cualquier runtime que drene la lane, sin depender de que alguien abra una pantalla.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_finance.ppm_monthly_positions`, `greenhouse_finance.retention_monthly_positions` (escritura); `income`, `expense` (lectura).
- Invariantes que no se pueden romper:
  - El scope fiscal es la entidad legal (`legal_entity_organization_id`), NUNCA `space_id`. El F29 se declara por RUT.
  - La materialización es idempotente por (entidad, período): recalcular converge al mismo estado.
  - Un período sin documentos elegibles produce una posición en cero explícita o ninguna fila, pero jamás una cifra inventada.
  - `rate_source` refleja el origen real de la tasa aplicada; nunca se estampa una etiqueta de confirmación que no ocurrió.
  - Un período ya declarado al SII no se recalcula sin decisión humana registrada.
- Write-target allowlist: no se introducen tablas nuevas.
- Tenant/space boundary: derivado de `getOperatingEntityIdentity()` / `legal_entity_organization_id`, igual que el foundation de `TASK-725`.
- Idempotency/concurrency: idempotente por período; el consumer reactivo colapsa eventos por scope, así que N documentos del mismo mes producen una sola materialización.
- Audit/outbox/history: cada materialización publica su evento `*_period_materialized` y queda registrada en `outbox_reactive_log` y `handler_health`, igual que el IVA. `materialization_reason` conserva el disparador.

### Migration, backfill and rollout

- Migration posture: `none` — no cambia schema.
- Default state: `enabled` en staging para verificar; en Production la decisión de encender la cadencia se toma con el sign-off de `TASK-1203` si el operador lo exige. Declarar la elección en el plan.
- Backfill plan: materializar `2026-07` y `2026-08` explícitamente tras verificar la projection en staging. Los períodos anteriores NO se tocan sin decisión contable: varios ya fueron declarados.
- Rollback path: quitar la projection del registry y revertir el PR. Las posiciones ya materializadas quedan; son derivadas y reconstruibles.
- External coordination: avisar al contador antes de materializar julio y agosto, para que sepa que esas cifras aparecerán por primera vez y no las lea como un cambio de criterio.

### Security and access

- Auth/access gate: la projection corre con la identidad del worker; no expone superficie HTTP nueva.
- Sensitive data posture: datos fiscales de la entidad legal. No loggear bases imponibles ni montos por documento en salidas compartidas.
- Error contract: los errores se propagan al consumer reactivo, que los clasifica y registra; no cruzan a superficie cliente.
- Abuse/rate-limit posture: no aplica — el único disparador es el outbox, ya acotado por la lane.

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/finance src/lib/sync`, `pnpm local:check`.
- DB/runtime checks: `SELECT` a ambas tablas confirmando filas para `2026-07` y `2026-08` con base distinta de cero; `handler_health` mostrando los handlers nuevos con `last_success_at` reciente.
- Integration checks: no aplica — sin provider externo.
- Reliability signals/logs: `finance.ppm.position_drift` y `finance.retention.position_drift` tras la corrección.
- Production verification sequence: ver `Rollout Plan & Risk Matrix`.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

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

### Slice 1 — Resolver la atribución de período sin heredar el defecto del IVA

- Determinar de dónde sale el período para PPM y retenciones. El payload de `finance.expense.nubox_synced` es `{document_status, nubox_purchase_id}`: no trae período ni fecha.
- Decidir la fuente: leer la fecha del documento desde la tabla usando el id del payload, o enriquecer el evento en su publisher. Declarar la decisión con su razón.
- Entregable: una función de resolución de período que devuelve el período del DOCUMENTO, no el mes corriente, con test que fija ambos casos.

### Slice 2 — Projection de PPM

- Crear `src/lib/sync/projections/ppm-monthly-position.ts` siguiendo la forma de `vat-monthly-position.ts`, usando la resolución del Slice 1 y llamando al materializador existente.
- Registrarla en `src/lib/sync/projections/index.ts`.
- Declarar `requiredTablePrivileges` y un `maxRetries` >= 2.
- Entregable: PPM se recalcula solo cuando entra un documento.

### Slice 3 — Projection de retenciones

- Mismo patrón para retenciones, con sus disparadores propios.
- Entregable: retenciones se recalculan solas.

### Slice 4 — Que la señal vea los períodos ausentes

- Reescribir `ppm-position-drift.ts` para que parta desde los períodos con documentos elegibles y haga `LEFT JOIN` contra las posiciones, no al revés. Un período con base y sin fila debe reportarse.
- Aplicar el mismo criterio a la señal de retenciones y, en el mismo PR, agregarle el filtro `is_annulled` que el materializador ya tiene y el reader no, para eliminar el falso positivo permanente.
- Entregable: ambas señales detectan ausencia y dejan de reportar un documento anulado.

### Slice 5 — Materializar julio y agosto

- Con la cadencia verificada en staging, materializar `2026-07` y `2026-08` en Production.
- Verificar que la base coincide con los documentos reales y que `rate_source` refleja la tasa vigente.
- Entregable: el F29 de julio y agosto deja de mostrar cero sobre base real.

## Out of Scope

- Decidir qué línea del F29 es oficial y cuál queda en shadow, y el sign-off contable. Es de `TASK-1203`.
- Cambiar la tasa PPM. Está correcta (`0,125%`, confirmada por el operador el 2026-08-21); lo obsoleto es el campo `notes` de `ppm_rate_config`, que se corrige por migración gobernada en su propia task.
- Re-materializar períodos anteriores a `2026-07`. Varios ya fueron declarados y recalcularlos cambia cifras que un tercero recibió.
- Renta Anual F22 y los tax profiles multi-país, que son las otras dos sub-capacidades de `TASK-1186`.
- Arreglar el defecto de atribución de período de la projection de IVA. Esta task no lo hereda, pero corregir el IVA ya materializado es trabajo propio con su propio riesgo.
- La deuda de 186 gastos sin distribución. Otro carril.

## Detailed Spec

### La asimetría, en una figura

```
  finance.income.* / finance.expense.*
              │
              ├──────────────▶ vatMonthlyPositionProjection ──▶ materializeVatLedgerForPeriod
              │                (registrada, 6 triggers)          → IVA al día
              │
              └──────X         (no existe)                    ──▶ materializePpmForPeriod
                                                                  → PPM congelado en 2026-06-20
```

El motor de la derecha existe y funciona. Falta la pieza del medio.

### Por qué el Slice 1 va antes que el 2

La projection de IVA resuelve el período así: intenta leerlo del payload y, si no está, usa el mes corriente. Como el payload de Nubox no trae período, **toda sincronización re-materializa el mes actual**. Eso ya produjo un hueco real: un gasto de julio que llegó el 1 de agosto, 9 horas después de materializar julio, dejó ese período incompleto para siempre.

Si PPM copia esa resolución tal cual, hereda exactamente el mismo defecto — y en una línea que se declara al SII. Por eso la resolución de período se arregla primero y las projections se construyen encima.

### Consultas de confirmación previa

```sql
-- Períodos con documentos y sin posición PPM (lo que la señal actual no ve)
SELECT date_part('year', i.invoice_date)::int  AS anio,
       date_part('month', i.invoice_date)::int AS mes,
       COUNT(*)                                AS docs,
       SUM(i.total_amount_clp)                 AS base_clp
  FROM greenhouse_finance.income i
 WHERE i.invoice_date >= DATE '2026-07-01'
 GROUP BY 1, 2
 ORDER BY 1, 2;

-- Estado de la materialización
SELECT 'ppm' AS linea, COUNT(*), MAX(period_id), MAX(materialized_at)
  FROM greenhouse_finance.ppm_monthly_positions
 UNION ALL
SELECT 'retention', COUNT(*), MAX(period_id), MAX(materialized_at)
  FROM greenhouse_finance.retention_monthly_positions;
```

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (período) -> Slice 2 (PPM) -> Slice 3 (retenciones) -> Slice 5 (materializar julio/agosto).
- Slice 4 (señales) puede correr en paralelo desde que Slice 1 cerró; no bloquea a los demás.
- Slice 5 NUNCA antes de verificar los Slices 2 y 3 en staging: materializar en Production con una resolución de período equivocada escribe una cifra fiscal errónea, y este dominio no admite "lo arreglamos después".
- Slice 1 DEBE cerrar con test antes de que exista una sola projection. Sin él, las dos projections nacen con el defecto del IVA.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| La projection hereda la atribución al mes corriente y escribe la base de un mes en otro | finance | high | Slice 1 obligatorio antes del 2, con test de ambos casos | `finance.ppm.position_drift` tras el Slice 4 |
| Se re-materializa un período ya declarado al SII y cambia una cifra entregada | finance | medium | Alcance acotado a `2026-07` y `2026-08`; los anteriores fuera de scope por contrato | revisión humana del listado de períodos antes del apply |
| La cadencia nueva recalcula en cada documento y el contador ve la cifra moverse durante el mes | finance | medium | Es el comportamiento correcto y el mismo del IVA; avisar al contador antes de encender | ninguna — es esperado, se comunica |
| El materializador falla en Production por un caso de dato que el backfill de junio no tenía | finance | medium | `maxRetries` >= 2 y verificación en staging con datos reales antes del flip | `handler_health` de los handlers nuevos |
| Corregir la señal de drift la vuelve ruidosa por períodos históricos sin posición | ops | medium | Acotar la ventana de la señal a los períodos operativamente vigentes y declararlo en el reader | conteo de la señal antes/después |
| La lane de finanzas no drena los eventos y la projection queda registrada pero inerte | cloud | low | Verificar `handler_health` tras el primer documento; el flag y la lane viven en el `ops-worker`, no en Vercel | `last_success_at` de los handlers nuevos |

### Feature flags / cutover

No se introduce un flag nuevo. `PPM_POSITION_ENABLED` y `RETENTION_POSITION_ENABLED` ya existen, están en `true` en Production (verificado el 2026-08-21) y gobiernan si la línea se presenta como oficial o en shadow — son de presentación, no de cadencia. La cadencia se activa registrando la projection, y su corte gradual es el propio despliegue.

Si el operador prefiere un corte más conservador, la alternativa es registrar las projections y verificar en staging antes de mergear a Production, en vez de agregar un flag que después habría que retirar.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert del PR | <5 min | si |
| Slice 2 | quitar la projection del registry y revertir | <10 min | si |
| Slice 3 | idéntico al Slice 2 | <10 min | si |
| Slice 4 | revert del PR; las señales vuelven a su ceguera actual | <5 min | si |
| Slice 5 | las posiciones son materialización derivada y reconstruible; se puede borrar el rango de períodos escrito por este slice y volver a materializar. Requiere decisión humana por ser dato fiscal | <30 min | si, con aprobación |

### Production verification sequence

1. Ejecutar las dos consultas de confirmación y guardar la salida como estado previo.
2. Merge del Slice 1 y verificar el test de resolución de período.
3. Merge de los Slices 2 y 3. En staging, ingresar o simular un documento y verificar que la posición del período de ESE documento se recalcula, no la del mes corriente.
4. Verificar `handler_health` de los handlers nuevos: `last_success_at` reciente y `consecutive_failures` en cero.
5. Merge del Slice 4 y confirmar que la señal reporta los períodos ausentes y deja de reportar el documento anulado.
6. Avisar al contador. Materializar `2026-07` y `2026-08` en Production (Slice 5).
7. Verificar que la base de cada período coincide con la suma de sus documentos y que `rate_source` es el correcto.
8. Observar 7 días: los handlers estables y la señal de drift en cero para los períodos vigentes.

### Out-of-band coordination required

Requiere aviso al contador antes del Slice 5: las cifras de PPM y retenciones de julio y agosto aparecerán por primera vez, y conviene que sepa que es una materialización que faltaba y no un cambio de criterio de cálculo. No requiere coordinación con GCP, secretos ni providers externos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe una función de resolución de período que devuelve el período del documento y no el mes corriente, con test que fija el caso "payload sin período" y el caso "documento retroactivo".
- [ ] `src/lib/sync/projections/ppm-monthly-position.ts` existe, está registrada en el índice de projections y declara `requiredTablePrivileges` y `maxRetries` >= 2.
- [ ] Existe la projection equivalente de retenciones, registrada.
- [ ] En staging, un documento nuevo provoca la materialización del período de ESE documento, verificado por consulta a la tabla.
- [ ] `handler_health` muestra los handlers nuevos con `last_success_at` no nulo y `consecutive_failures` en cero.
- [ ] `ppm-position-drift.ts` reporta un período con documentos elegibles y sin posición; la consulta lo demuestra con `2026-07` antes del Slice 5.
- [ ] El reader de drift de retenciones filtra `is_annulled` y el falso positivo del documento anulado desapareció.
- [ ] `2026-07` y `2026-08` tienen posición de PPM y de retenciones con base distinta de cero, coincidente con la suma de sus documentos.
- [ ] Ningún período anterior a `2026-07` fue re-materializado.
- [ ] El contador fue avisado antes del Slice 5 y quedó registrado en `Handoff.md`.
- [ ] `TASK-1186` y `TASK-1203` recibieron `Delta` indicando que la cadencia quedó cubierta por esta task.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm vitest run src/lib/finance src/lib/sync`
- `pnpm test` como gate de cierre antes de mover el archivo a `complete/`
- `pnpm build` como gate de cierre, con autorización previa del operador por el costo de memoria
- Verificación manual contra PostgreSQL vía `pnpm pg:connect:shell` con las dos consultas de confirmación

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] La evidencia de la materialización de julio y agosto quedó en `Handoff.md`, con la base de cada período.

## Follow-ups

- Corregir el campo `notes` de `ppm_rate_config` por migración gobernada: sigue describiendo la tasa como placeholder pendiente de validación contable, cuando el operador confirmó el 2026-08-21 que `0,125%` es la tasa real. Esa nota obsoleta ya produjo una falsa alarma de P0.
- Evaluar si la projection de IVA debe corregir su atribución de período y, en tal caso, qué hacer con los períodos ya materializados con el mes equivocado.
- Auditar si otras posiciones fiscales futuras (F22, multi-país de `TASK-1186`) nacerían con la misma ausencia de cadencia.

## Open Questions

1. **De dónde sale el período.** Leer la fecha del documento desde la tabla usando el id del payload es más simple pero agrega una consulta por evento; enriquecer el evento en su publisher es más limpio pero toca el contrato del evento y a sus otros consumidores. Decidir en Discovery con evidencia de cuántos consumidores tiene ese evento hoy.
2. **Ventana de la señal corregida.** Al hacer que detecte períodos ausentes, ¿desde cuándo? Reportar todos los meses históricos sin posición la volvería ruidosa e inútil. Definir la ventana operativa vigente con criterio contable, no técnico.
3. **Encendido en Production.** ¿Se registra la projection y se deja correr, o el operador prefiere verificar en staging y mergear después? Ambas son defendibles; la segunda es más lenta y más segura.
