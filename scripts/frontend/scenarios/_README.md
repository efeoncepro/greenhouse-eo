# Scenarios — DSL de Greenhouse Visual Capture

Cada archivo `<name>.scenario.ts` exporta una constante `scenario` tipada como `CaptureScenario`.

Estos scenarios son el contrato repetible de **Greenhouse Visual Capture** (`GVC`, `pnpm fe:capture`). Si una verificación visual depende de interacciones, scroll, captura full-page o se va a repetir por otro agente, debe vivir aquí en vez de un script Playwright ad-hoc.

## Estructura mínima

```ts
import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'mi-feature-microinteractions',       // kebab-case
  route: '/finance/cash-out',
  viewport: { width: 1440, height: 900 },
  initialHoldMs: 1500,                        // espera post-mount
  steps: [
    { kind: 'wait', selector: 'h4', timeout: 5000 },
    { kind: 'mark', label: 'initial' },
    { kind: 'hover', selector: '[role="tab"]:nth-child(2)' },
    { kind: 'sleep', ms: 300 },
    { kind: 'mark', label: 'tab-hover' }
  ]
}
```

## Readiness y assertions

Para evitar capturas falsas de login, loading o error boundary, los scenarios importantes pueden declarar readiness y assertions:

```ts
readiness: {
  selector: '[data-gvc-ready="mi-feature"]',
  absentSelectors: ['[data-testid="login-card"]', '[data-loading="true"]', '.MuiSkeleton-root'],
  waitForFonts: true,
  postReadyDelayMs: 150,
  timeout: 8000
},
assertions: [
  { kind: 'noLoginRedirect', reason: 'ruta autenticada esperada' },
  { kind: 'noErrorBoundary', reason: 'la evidencia no debe ser un error de app' }
]
```

## Tipos de step

| `kind`  | Uso                                              | Campos              |
|---------|--------------------------------------------------|---------------------|
| `wait`  | Espera selector visible (timeout 5s default)    | `selector`, `timeout?` |
| `mark`  | Captura PNG sync + entry en manifest             | `label`, `note?`    |
| `hover` | Mouse over selector                              | `selector`, `timeout?` |
| `click` | Click selector. Si mutating-UI, requiere `mutating:true` + `safeForCapture:true` | `selector` |
| `scroll`| Scroll Y offset, destino absoluto o scroll robusto hacia selector | `scrollY?`, `scrollTo?`, `selector?`, `scrollBlock?`, `scrollInline?` |
| `fill`  | Type en input. **Requiere** `mutating:true`     | `selector`, `value` |
| `press` | Key sequence. **Requiere** `mutating:true`      | `selector?`, `key`  |
| `sleep` | Delay puro sin espera de selector                | `ms`                |
| `assert` | Assertion ligera en medio del timeline          | `assertion`         |
| `interaction` | Microinteraction V2 con intención + frames relativos | `interaction` |

## Microinteraction evidence V2

Usá `interaction` cuando la incertidumbre sea el feedback de una acción, no solo una captura estática:

```ts
{
  kind: 'interaction',
  interaction: {
    name: 'filter-hover',
    action: { kind: 'hover', selector: '[role="tab"]' },
    intent: 'Confirmar affordance del filtro antes de activarlo',
    frames: [
      { label: 'before', atMs: 0 },
      { label: 'feedback', atMs: 150 },
      { label: 'settled', atMs: 300 }
    ],
    keyboardEquivalent: {
      action: { kind: 'press', key: 'Tab' },
      expected: 'focus visible'
    },
    reducedMotion: 'capture'
  }
}
```

El manifest registra segmentos lógicos del video y `index.html` muestra los frames por interacción.

## Multi-viewport

Un scenario puede declarar viewports sin duplicar archivos:

```ts
viewports: [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 1024, height: 900 },
  { name: 'mobile', device: 'iPhone 13' }
]
```

El output crea subdirectorios por variante y un manifest raíz con `variants`.

## Baseline mockup -> runtime

Para tasks UI con mockup aprobado:

```ts
baseline: {
  surfaceId: 'hr.contractors',
  baselineName: 'contractor-admin-workbench-mockup',
  approvedMockupCaptureDir: '.captures/<approved-run>'
}
```

Capturá mockup y runtime, luego compará con `pnpm fe:capture:diff <mockup-run> <runtime-run>`.

### Contract gates V1.5 (TASK-1018)

El `baseline` ahora es un contrato verificable + hay gates `quality.*` opt-in (warning-first):

```ts
baseline: {
  surfaceId: 'agency.organizations.list',   // home durable: scripts/frontend/baselines/<surfaceId>/
  requiredFrameLabels: ['first-fold'],      // deben existir en la captura runtime
  maskSelectors: ['[data-relative-time]'],  // datos dinámicos enmascarados en el diff
  maxDiffRatio: 0.05,                        // explícito ⇒ visual_diff_exceeded = error
  requiredRegions: ['[data-capture="list"]'] // deben renderizar (live check)
},
quality: {
  layout: { enabled: true },                                    // overflow/target/clip/scroll/nested-cards
  runtime: { failOnConsoleError: true, failOnHydrationWarning: true }, // console/page/hydration/4xx-5xx
  keyboard: { enabled: true, reducedMotionCheck: true,
    probes: [{ name: 'open', keys: ['Tab','Enter'], expectedVisibleSelector: '[role="menu"]' }] },
  performance: { enabled: true, severity: 'warning', maxDomNodes: 6000 },
  enterpriseRubric: { enabled: true }
}
```

Workflow mockup→runtime canónico:

1. Capturá el mockup aprobado: `pnpm fe:capture <scenario> --env=local`.
2. Promové el baseline durable: `pnpm fe:capture:diff --promote .captures/<run>` → commiteá `scripts/frontend/baselines/<surfaceId>/`.
3. El scenario runtime declara el mismo `baseline.surfaceId` + thresholds; `fe:capture` corre el diff solo.
4. Sin baseline durable, el diff degrada honesto a `baseline_stale` (warning).

El diff corre bajo captura **determinista** (animaciones off, caret oculto, reduced-motion, fonts settled) que GVC aplica automáticamente cuando el scenario declara `baseline.surfaceId`. Enmascará datos dinámicos con `maskSelectors` para que el diff no sea flaky.

Regresión: `gvc-contract-gates` (baseline + layout + runtime + perf + rubric) y `gvc-keyboard-focus`.

### Capturas largas y secciones scrolleadas

Para evitar offsets fragiles en pantallas con scroll, preferir `scroll` por selector y luego capturar el panel con `clipSelector`:

```ts
{ kind: 'scroll', selector: '[data-capture="timeline"]', scrollBlock: 'center' },
{ kind: 'mark', label: 'timeline', clipSelector: '[data-capture="timeline"]' }
```

Para auditar una pantalla completa, usar `fullPage` en el mark:

```ts
{ kind: 'mark', label: 'full-page', fullPage: true }
```

Para ir al inicio o final sin depender de offsets:

```ts
{ kind: 'scroll', scrollTo: 'top' }
{ kind: 'scroll', scrollTo: 'bottom' }
```

## Convenciones de label

- `kebab-case-descriptive`
- Empezar con `initial-*` para el estado de mount
- Usar verbs en infinitivo o estado: `kpi-hover`, `filter-applied`, `inspector-swapped`
- Único por scenario (validación rompe build si duplicás)

## Steps mutating (escritura)

Por default los scenarios son read-only. Para que el runtime permita `fill`, `press`, o clicks que disparan Server Actions:

```ts
export const scenario: CaptureScenario = {
  name: 'create-case-flow',
  mutating: true,
  safeForCapture: true,   // confirmación explícita
  // ...
}
```

⚠️ **Esto creará entidades reales en staging.** Solo activar cuando es lo deseado.

## Ejecución

```bash
pnpm fe:capture <scenario-name> --env=staging
pnpm fe:capture <scenario-name> --env=staging --gif       # genera flipbook.gif
pnpm fe:capture <scenario-name> --env=staging --headed    # debug visual
```

## Output

`.captures/<ISO>_<scenario-name>/`:
- `recording.webm` — video continuo del lifecycle
- `frames/01-<label>.png`, `02-<label>.png`, ... — frames sync por `mark` step
- `frames/01-<label>.aria.txt`, ... — **árbol de accesibilidad** de la región capturada por cada `mark` (TASK-1097)
- `manifest.json` — scenario meta + timings + frame paths + `frames[].ariaSnapshotPath`
- `flipbook.gif` — opt (con `--gif`)
- `stdout.log`

## Observá antes de autorar (aria snapshot — TASK-1097)

No adivines selectores. Cada `mark` escribe `frames/<NN>-<label>.aria.txt` con el árbol de accesibilidad real (`manifest.frames[].ariaSnapshotPath`):

```
- main:
  - heading "Falta poco para abrir" [level=1]
  - button "Notifícame"
  - img "Efeonce"
```

Leé ese archivo y escribí `getByRole('button', { name: 'Notifícame' })` contra lo que existe — en vez de `[class*="MuiButton"]:nth-child(3)` adivinado. **Preferí user-facing locators** (`getByRole`/`getByText`/data-markers `[data-capture]`) sobre CSS/`nth-child` (frágil). Detalle: skill `greenhouse-gvc-playwright`.

### Explore → promote (TASK-1098)

En vez del throwaway manual, usá el modo explore:

```bash
pnpm fe:capture:explore --route=/finance/cash-out --env=staging   # observá la página viva (read-only)
pnpm fe:capture:promote --route=/finance/cash-out --name=mi-feature   # → scripts/frontend/scenarios/mi-feature.scenario.ts
pnpm fe:capture mi-feature --env=staging   # revisá selectores/marks y capturá
```

`explore` persiste `.captures/_explore/<slug>/{session.json, aria.txt, snapshot.png}` con los candidatos + su `getByRole(...)` sugerido + uniqueness validada + markers + probes (`--probe 'role=button[name="X"]'`). `promote` cristaliza la sesión en un `.scenario.ts` válido (readiness auto + marks). **Estático:** para microinteracciones/coreografía usá el step `interaction` (abajo) o `fe:capture:micro` — promote no los auto-genera.

## Reglas duras

- **NUNCA** mezclar `mutating` con `safeForCapture: false` (validation rompe)
- **NUNCA** scenarios sin steps `mark` (no producirán frames útiles)
- **NUNCA** scenarios que requieren `--env=production` sin pasar Triple Gate (env var + flag + capability)
