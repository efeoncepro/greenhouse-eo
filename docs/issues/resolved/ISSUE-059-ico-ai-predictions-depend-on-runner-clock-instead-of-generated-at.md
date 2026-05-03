# ISSUE-059 — ICO AI predictions depend on runner clock instead of generatedAt

## Ambiente

CI (`main` + `develop`) y runtime general del `ICO Engine`

## Detectado

2026-04-30, GitHub Actions `CI` sobre `main`

- Run rojo inicial: `25154300079`
- Commit afectado: `fd2dd75e`

## Síntoma

El pipeline `CI` de `main` fallaba en `src/lib/ico-engine/ai/ai-signals.test.ts`, caso `projects end-of-month OTD only for the active Santiago period`, con:

```text
AssertionError: expected 72 to be less than 72
```

El mismo fixture podía pasar o fallar según el día real del runner.

## Causa raíz

`buildAiPredictions()` en `src/lib/ico-engine/ai/predictor.ts` calculaba el `progressRatio` con `new Date()` en timezone `America/Santiago`, ignorando el `generatedAt` que ya recibía como input.

Eso acoplaba la predicción del mes activo al reloj del host en vez de al timestamp explícito de la corrida, rompiendo reproducibilidad para:

- tests y CI
- replays históricos
- materializaciones rerun del `ICO Engine`

Además, `src/lib/ico-engine/ai/materialize-ai-signals.ts` mezclaba dos contextos temporales en la misma corrida: uno para generar las predicciones y otro para hidratar actuals, ambos derivados del reloj vivo.

## Impacto

- CI roja en `main`, bloqueando la confianza del release.
- Contrato temporal frágil en el carril crítico `ICO -> Payroll -> Reliquidación`.
- Riesgo de que una misma foto histórica produjera salidas distintas en replays o reruns.

## Solución

Se estabilizó el contrato temporal del `ICO Engine`:

- Nuevo helper reusable: `src/lib/calendar/business-time.ts`
- `predictor.ts` ahora deriva el `progressRatio` desde `generatedAt`, no desde `new Date()`
- `materialize-ai-signals.ts` reutiliza el mismo contexto temporal explícito para hidratar actuals
- `ai-signals.test.ts` quedó endurecido con reloj falso para fijar la regresión y validar que manda `generatedAt`

Commits aplicados:

- `develop`: `2b43f113` — `fix: stabilize ico prediction time context`
- `main`: `eab7e05b` — `fix: stabilize ico prediction time context`

## Verificación

Validación local en checkout principal:

- `pnpm test` OK — `479` files, `2620` tests passed, `5` skipped
- `pnpm build` OK
- `pnpm exec eslint ...` OK en el slice tocado
- `pnpm exec tsc --noEmit` OK

Validación remota:

- `main` disparó nuevo `CI` sobre `eab7e05b` (`25162680976`)
- `develop` disparó nuevo `CI` sobre `2b43f113` (`25162656046`)

## Estado

resolved

## Relacionado

- `docs/audits/ico/ICO_ENGINE_AUDIT_2026-04-30.md`
- `docs/tasks/to-do/TASK-740-critical-metrics-change-safety-harness.md`
- `docs/tasks/to-do/TASK-732-payroll-ico-safety-gate-and-kpi-provenance.md`
- `docs/tasks/to-do/TASK-733-ico-locked-snapshot-immutability-and-reliquidation-reproducibility.md`
