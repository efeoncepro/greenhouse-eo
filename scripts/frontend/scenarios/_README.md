# Scenarios — DSL para captura visual

Cada archivo `<name>.scenario.ts` exporta una constante `scenario` tipada como `CaptureScenario`.

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

## Tipos de step

| `kind`  | Uso                                              | Campos              |
|---------|--------------------------------------------------|---------------------|
| `wait`  | Espera selector visible (timeout 5s default)    | `selector`, `timeout?` |
| `mark`  | Captura PNG sync + entry en manifest             | `label`, `note?`    |
| `hover` | Mouse over selector                              | `selector`, `timeout?` |
| `click` | Click selector. Si mutating-UI, requiere `mutating:true` + `safeForCapture:true` | `selector` |
| `scroll`| Scroll Y offset                                  | `scrollY` (px)      |
| `fill`  | Type en input. **Requiere** `mutating:true`     | `selector`, `value` |
| `press` | Key sequence. **Requiere** `mutating:true`      | `selector?`, `key`  |
| `sleep` | Delay puro sin espera de selector                | `ms`                |

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
