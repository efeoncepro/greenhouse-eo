# TASK-730 — Payroll E2E Smoke Lane (calculate → approve → close)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `TASK-729` (necesita el subsystem para reportar resultado del lane via `smoke_lane_runs`)
- Branch: `task/TASK-730-payroll-e2e-smoke-lane`

## Summary

Agrega smoke lane E2E para Payroll que ejercita el ciclo completo
(crear período test → calcular → aprobar → cerrar → exported) en preview/staging contra un
período de prueba aislado. Reporta el resultado a `greenhouse_sync.smoke_lane_runs` con
`lane_key='payroll.web'`, consumido por TASK-729 como freshness signal del subsystem
"Payroll Data Quality". Cierra el gap detectado en la auditoría: el módulo Payroll tiene
solo 1 smoke spec básico (`hr-payroll.spec.ts` que sólo verifica GET) y cero validación
end-to-end del journey crítico antes del cierre real de cada nómina.

## Why This Task Exists

Payroll mueve plata real, pero su CI no garantiza que el flujo end-to-end funcione antes de
cada deploy. Si una migración rompe `buildPayrollEntry` o un cambio rompe la state machine,
solo se detecta el día del cierre en producción.

Comparativa con Finance: tiene 4 smoke specs (cotizaciones, egresos, clientes, banco) +
warm-up registrado en `smoke_lane_runs`. Payroll tiene 1 GET smoke. Es un gap claro de
cobertura para un módulo de criticidad equivalente o superior.

**Garantía dura**: el smoke lane corre **solo en preview/staging**, contra un período de
prueba (`year=2026, month=12, tenant=test`) que no toca datos reales. Cero contacto con la
nómina activa.

## Goal

- Playwright spec que ejecuta el journey: crear período test → calcular → aprobar → cerrar.
- Verificar invariantes post-cada-step: `entries.count > 0`, `gross_total > 0`,
  `net_total > 0`, `net_total ≤ gross_total`, sin valores negativos.
- Reportar resultado a `greenhouse_sync.smoke_lane_runs` con `lane_key='payroll.web'`.
- Hook en CI que correr la lane en cada deploy a preview/staging.
- Lane consumida por subsystem "Payroll Data Quality" como signal de freshness.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` — contrato del lifecycle
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` — patrón smoke lane
- `CLAUDE.md` sección "Smoke lane runs vía `greenhouse_sync.smoke_lane_runs`" — patrón canónico

Reglas obligatorias:

- **No tocar datos reales**: usar período test con `year=2026, month=12` (futuro lejano,
  marca explícita de test) y tenant test (`agent@greenhouse.efeonce.org` con flag de test).
- **Cleanup post-run**: cada lane crea su período aislado y lo elimina al final
  (down step explícito), o usa migration de truncate para rows con `metadata_json->'_test' = true`.
- **No dependencia con datos reales**: el período test no debe leer KPIs, asistencia,
  ni compensaciones reales. Stubear vía mock data en setup.
- Reportar resultado al outbox vía `pnpm sync:smoke-lane payroll.web` (ya existe el
  endpoint canónico).
- Failure no bloquea deploy si está en preview, pero sí si la lane está en staging
  pre-promote a production.

## Normative Docs

- `tests/e2e/smoke/hr-payroll.spec.ts` — el smoke básico actual (referencia)
- `tests/e2e/smoke/finance-cotizaciones.spec.ts` u otros Finance smokes — patrón a replicar
- `scripts/playwright-auth-setup.mjs` — agent auth para Playwright
- [src/lib/sync/smoke-lane.ts](src/lib/sync/smoke-lane.ts) o equivalente — publisher canónico

## Dependencies & Impact

### Depends on

- **TASK-729**: el subsystem "Payroll Data Quality" debe existir para consumir el lane como signal.
- Agent Auth funcional (`AGENT_AUTH_SECRET`, usuario `agent@greenhouse.efeonce.org`).
- `payroll_period.created` / `calculated` / `approved` / `exported` lifecycle estable
  (ya está, post TASK-410).
- `smoke_lane_runs` table con `lane_key` column.

### Blocks / Impacts

- TASK-731 (Pre-Close Validator): consume el lane como freshness signal para validar que
  el último flujo E2E pasó antes del cierre real.
- Futura TASK de "auto-promote desde projected" puede reusar el harness de período test.

### Files owned

- `tests/e2e/smoke/payroll-journey.spec.ts` (nueva spec end-to-end)
- `tests/e2e/fixtures/payroll-test-period.ts` (helper de creación de período test)
- `.github/workflows/playwright-smoke.yml` (extender para incluir el nuevo spec)
- `scripts/sync/publish-smoke-lane.ts` (extender si no soporta `payroll.web`)

## Current Repo State

### Already exists

- Playwright suite con smoke specs activas (4 de Finance, 1 básico de HR).
- Agent Auth flow probado y documentado.
- `greenhouse_sync.smoke_lane_runs` table con publisher canónico vía
  `pnpm sync:smoke-lane <lane-key>`.
- State machine de payroll completa: `draft → calculated → approved → exported`.
- API endpoints: POST create, POST calculate, POST approve, POST close.

### Gap

- Cero E2E que ejercite el journey completo.
- `lane_key='payroll.web'` no registrado en `smoke_lane_runs`.
- No hay harness de período test reusable.
- No hay signal de freshness del módulo en el dashboard.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE (vacío al crear)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Test period harness

- `tests/e2e/fixtures/payroll-test-period.ts` con helpers:
  - `createTestPeriod({ year=2026, month=12 })` — POST a `/api/hr/payroll/periods` con
    flag `_test=true` en metadata.
  - `seedTestCompensations({ memberIds, periodDate })` — crea `compensation_versions`
    temporales con flag de test.
  - `seedTestKpis({ periodId, members })` — KPI snapshot mínimo viable.
  - `cleanupTestPeriod({ periodId })` — DELETE cascada de período test + compensations
    + entries + KPIs.

### Slice 2 — Journey spec end-to-end

- `tests/e2e/smoke/payroll-journey.spec.ts`:
  ```ts
  test('payroll journey: create → calculate → approve → close', async ({ request }) => {
    // 1. Setup: create test period
    const period = await createTestPeriod({ year: 2026, month: 12 })
    expect(period.status).toBe('draft')

    // 2. Calculate
    const calc = await request.post(`/api/hr/payroll/periods/${period.id}/calculate`)
    expect(calc.ok()).toBe(true)
    const calcData = await calc.json()
    expect(calcData.entriesCount).toBeGreaterThan(0)
    expect(calcData.totals.grossClp).toBeGreaterThan(0)
    expect(calcData.totals.netClp).toBeGreaterThan(0)
    expect(calcData.totals.netClp).toBeLessThanOrEqual(calcData.totals.grossClp)

    // 3. Approve
    const approve = await request.post(`/api/hr/payroll/periods/${period.id}/approve`)
    expect(approve.ok()).toBe(true)
    expect((await approve.json()).status).toBe('approved')

    // 4. Close
    const close = await request.post(`/api/hr/payroll/periods/${period.id}/close`)
    expect(close.ok()).toBe(true)
    expect((await close.json()).status).toBe('exported')

    // 5. Verify entries persisted with v1 immutability
    const entries = await request.get(`/api/hr/payroll/periods/${period.id}/entries`)
    const entriesData = await entries.json()
    expect(entriesData.items.every(e => e.version === 1 && e.isActive)).toBe(true)
    expect(entriesData.items.every(e => e.netTotal >= 0 && e.grossTotal >= 0)).toBe(true)

    // Cleanup
    await cleanupTestPeriod({ periodId: period.id })
  })
  ```

### Slice 3 — Smoke lane registration

- Extender `pnpm sync:smoke-lane` para soportar `lane_key='payroll.web'`.
- En CI, después del Playwright run, ejecutar:
  ```bash
  pnpm sync:smoke-lane payroll.web --status=success --duration=$DURATION
  ```
- Resultado se persiste en `greenhouse_sync.smoke_lane_runs` con `lane_key='payroll.web'`,
  `git_sha`, `branch`, `run_id`, `status`, `duration_ms`.

### Slice 4 — CI hook

- Extender `.github/workflows/playwright-smoke.yml`:
  ```yaml
  - name: Run payroll journey smoke
    run: pnpm playwright test tests/e2e/smoke/payroll-journey.spec.ts
  - name: Publish smoke lane result
    if: always()
    run: pnpm sync:smoke-lane payroll.web --status=${{ job.status }}
  ```

### Slice 5 — Freshness signal en subsystem

- Agregar al subsystem "Payroll Data Quality" (TASK-729) un detector adicional:
  `payroll_smoke_lane_freshness` que lee la última row de `smoke_lane_runs WHERE
  lane_key='payroll.web'`.
- Severity: `warning` si `> 24h`, `critical` si `> 72h` o último status fue `failure`.

### Slice 6 — Tests + docs

- Verificar que el harness funciona en local (Playwright + Cloud SQL Proxy).
- Documentar el lane en `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`.
- Doc funcional `docs/documentation/hr/` actualizado.

## Out of Scope

- Smoke lane de `/my/payroll` (vista personal) → ya cubierto por `hr-payroll.spec.ts` básico.
- Test de reliquidation (TASK-410) end-to-end → futura task derivada.
- Tests de promoción projected → official → futura task.
- Tests de PREVIRED sync → ya cubierto por integraciones específicas.

## Detailed Spec

### Aislamiento de datos test

El período test usa:
- `year = 2026, month = 12` (mes elegido para no colisionar nunca con período real activo).
- `metadata_json = { _test: true, created_by: 'smoke-lane-payroll', smoke_run_id: <CI run id> }`.
- Tenant: `agent@greenhouse.efeonce.org` (ya existe, ver Agent Auth doc en CLAUDE.md).
- Test compensations: 3 miembros sintéticos con datos mínimos viables.

**Cleanup obligatorio**: después de cada run, ejecutar:
```sql
DELETE FROM greenhouse_payroll.payroll_entries
  WHERE period_id IN (SELECT period_id FROM greenhouse_payroll.payroll_periods WHERE metadata_json->>'_test' = 'true');
DELETE FROM greenhouse_payroll.payroll_periods WHERE metadata_json->>'_test' = 'true';
DELETE FROM greenhouse_payroll.compensation_versions WHERE metadata_json->>'_test' = 'true';
```

Si el cleanup falla (Playwright crashea mid-test), un cron diario `payroll-test-cleanup`
limpia rows orphan con `_test=true AND created_at < NOW() - INTERVAL '24 hours'`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `tests/e2e/smoke/payroll-journey.spec.ts` corre verde en local + CI.
- [ ] Journey completo `create → calculate → approve → close → exported` se ejecuta en < 60s.
- [ ] Período test se crea aislado y se limpia post-run.
- [ ] Si cleanup falla, cron `payroll-test-cleanup` limpia rows orphan con `_test=true`.
- [ ] `lane_key='payroll.web'` registrado en `smoke_lane_runs` después de cada run.
- [ ] Subsystem "Payroll Data Quality" muestra signal `payroll_smoke_lane_freshness` con
      severity correcto.
- [ ] Failure del lane en preview no bloquea deploy; failure en staging sí.
- [ ] Cero contaminación de datos reales (audit post-CI confirma `_test=true` en todos los
      rows creados).

## Verification

- `pnpm playwright test tests/e2e/smoke/payroll-journey.spec.ts` (local con proxy)
- `pnpm sync:smoke-lane payroll.web --status=success` manual
- `pnpm lint`
- Validación manual: ejecutar lane en preview, verificar `/admin/ops-health` muestra
  freshness actualizada.
- Verificar que el período test queda completamente limpio (`SELECT * FROM greenhouse_payroll.payroll_periods WHERE year=2026 AND month=12` retorna 0 rows post-cleanup).

## Closing Protocol

- [ ] `Lifecycle` sincronizado + carpeta correcta
- [ ] `docs/tasks/README.md` y `docs/tasks/TASK_ID_REGISTRY.md` actualizados
- [ ] `Handoff.md` con learnings de cleanup
- [ ] `changelog.md` actualizado
- [ ] Chequeo de impacto cruzado sobre TASK-729 (consume el lane) y TASK-731

## Follow-ups

- Test de reliquidation E2E (período exported → reopen → recalculate → close) — task derivada.
- Test de promoción projected → official — task derivada.
- Smoke lane de `/my/payroll` (cliente final) — task derivada si el actual no es suficiente.
- Performance benchmarks (calcular nómina de N=50 personas en < X segundos) — separable.

## Open Questions

- ¿Cron de cleanup `payroll-test-cleanup` debe correr cada cuánto? Default 24h, ajustable.
- ¿El lane debe ejercer el flujo de reliquidación también, o queda para una task derivada?
  Por simplicidad inicial: queda fuera de scope.
- ¿Debemos versionar el harness para soportar evolución del schema de payroll? Por ahora
  asume schema actual.
