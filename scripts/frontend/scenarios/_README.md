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
- `manifest.json` — scenario meta + timings + frame paths
- `flipbook.gif` — opt (con `--gif`)
- `stdout.log`

## Reglas duras

- **NUNCA** mezclar `mutating` con `safeForCapture: false` (validation rompe)
- **NUNCA** scenarios sin steps `mark` (no producirán frames útiles)
- **NUNCA** scenarios que requieren `--env=production` sin pasar Triple Gate (env var + flag + capability)
