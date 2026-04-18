# ISSUE-052 — CI `test:coverage` flake: HrLeaveView backfill dialog times out

## Ambiente

CI (GitHub Actions) — el workflow `CI > Lint, test and build`, step `Coverage`.

## Detectado

2026-04-17 — PR #63 (TASK-446) falla en CI. Auditoría posterior muestra que `develop` tiene los últimos 5 commits con la misma falla (runs `24550667620`, `24550905750`, `24550969181`, `24555918188`, `24559856272`), incluyendo cierres docs-only que no tocan código.

## Síntoma

```
FAIL  src/views/greenhouse/hr-core/HrLeaveView.test.tsx > HrLeaveView
  > opens the backfill dialog from a balance row and posts the selected member and leave type

Error: Test timed out in 5000ms.
If this is a long-running test, pass a timeout value as the last argument or configure it
globally with "testTimeout".

Uncaught Exception
ReferenceError: window is not defined
  at performWorkOnRootViaSchedulerTask (react-dom-client.development.js:18936)
```

Localmente el test pasa con `pnpm test` (sin coverage). Solo falla con `pnpm test:coverage` o en el runner de CI que usa ese comando.

## Causa raíz

- `vitest.config.ts` no declaraba `testTimeout`, usando el default de Vitest de **5000ms**.
- El test de HR leave backfill ejecuta una cadena realista de 8 interacciones: render → click tab → click "Ver detalle" → `findByRole('dialog')` → click "Registrar días ya tomados" → llenar 4 campos → click "Registrar" → `waitFor` sobre payload POST.
- La instrumentación `v8` de `pnpm test:coverage` agrega overhead significativo (5–10x) a cada ciclo de reconciliación de React. En el GitHub runner con recursos compartidos, la cadena excede 5000ms.
- Al timeout, `afterEach(() => cleanup())` desmonta el árbol mientras React aún tiene trabajo pendiente → `ReferenceError: window is not defined` durante el flush final del scheduler.
- El error `window is not defined` es síntoma, no causa: es el jsdom environment desmontándose antes de que React termine su render work.

## Impacto

- **CI de `develop` en rojo 5 commits consecutivos** (tanto commits de código como docs-only). Ningún PR posterior podía pasar gate sin override.
- **Throughput de merges bloqueado** para todo agente/humano que dependa de CI verde.
- **Señal de calidad degradada:** el equipo pierde visibilidad de fallas reales porque "CI rojo" se normaliza como ruido.

## Solución

Ampliar `testTimeout` y `hookTimeout` globales en `vitest.config.ts` de 5s → **15s**. Razones:

- El trabajo del test no es buggy, simplemente el budget de 5s era demasiado apretado para coverage mode en runners compartidos.
- 15s sigue siendo lo suficientemente corto para detectar tests genuinamente colgados (infinite loops, hung fetch mocks).
- Fix global vs. per-test: beneficia a todo el suite sin tocar código de HR (que es de otro dominio, TASK-415/ISSUE-049).
- Agrega `hookTimeout` también para cubrir `beforeEach`/`afterEach` con imports async o setup pesado.

```ts
// vitest.config.ts
test: {
  // ...
  testTimeout: 15000,
  hookTimeout: 15000,
  // ...
}
```

No se modifica ningún test. Enfoque no-invasivo y anclado al config global.

## Verificación

- Local: `pnpm test:coverage` debe terminar sin timeouts.
- CI: siguiente run del workflow `Lint, test and build` sobre PR #64 (este fix) debe pasar `Coverage` step.
- Gate de regresión: commits subsecuentes en `develop` deben retomar CI verde consistente.

## Estado

resolved

## Relacionado

- **Fix PR:** #64 — `fix/ci-coverage-test-timeout` → `develop`
- **Gating PR:** #63 (TASK-446 Nexa Insights root cause narrative surfacing) — bloqueada por este flake; se rebaseará sobre `develop` verde y se mergeará después de este fix.
- **Runs afectados** (antes del fix):
  - `24550667620` — feat: rescope agency campaigns api
  - `24550905750` — feat: close agency campaigns api rescope
  - `24550969181` — docs(tasks): align client portal tasks with entitlements
  - `24555918188` — fix: harden nexa project label resolution (TASK-440)
  - `24559856272` — docs: close TASK-343 quotation program umbrella
  - `24561762409` — TASK-446 PR #63 initial run
- **Tests afectados observados:**
  - `src/views/greenhouse/hr-core/HrLeaveView.test.tsx:352` — "opens the backfill dialog"
  - `src/views/greenhouse/hr-core/HrLeaveView.test.tsx:612` — "shows enriched identity avatars" (falla intermitente en `24559856272`, probable mismo patrón)

## Follow-ups opcionales (no parte de este fix)

- HR team puede revisar `HrLeaveView.test.tsx` para migrar de `fireEvent` a `userEvent` (más realista y típicamente más estable bajo instrumentación).
- Considerar instrumentación coverage más liviana (`istanbul` en vez de `v8`) si la overhead vuelve a ser problemática — trade-off con precisión de métricas.
