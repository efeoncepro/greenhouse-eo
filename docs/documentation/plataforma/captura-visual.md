# Captura Visual con Playwright

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-05-12 por Claude (round 4 deep audit / sesión de microinteractions)
> **Ultima actualizacion:** 2026-05-12 por Claude
> **Documentacion tecnica:** [GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md](../../architecture/GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md)
> **Manual operativo:** [captura-visual-playwright.md](../../manual-de-uso/plataforma/captura-visual-playwright.md)

## Qué es

Greenhouse incluye una herramienta para **grabar lo que pasa en una pantalla del portal** sin que tengas que abrir el browser y hacer screenshot manual. Sirve para revisar visualmente cómo se ve y cómo se comporta una ruta — incluyendo las animaciones, los hover, los cambios de estado y las transiciones.

La idea: en vez de que cada persona escriba código nuevo cada vez que necesita ver "¿cómo se ve esta página en staging?", hay UN comando único.

## Para qué sirve

| Caso | Comando |
|---|---|
| "¿Cómo se ve esta página en staging?" | `pnpm fe:capture --route=/finance/cash-out --env=staging` |
| "Quiero validar que la animación del filtro funciona" | `pnpm fe:capture offboarding-queue-microinteractions --env=staging` |
| "Necesito un GIF para adjuntar al PR review" | mismo comando + `--gif` |
| "Quiero ver el browser mientras corre" | mismo comando + `--headed` |

## Qué entrega

Una carpeta nueva en `.captures/` con:

- **Un video** (`.webm`) del lifecycle completo
- **Stills PNG** en momentos clave (por ejemplo: "antes del hover", "durante el hover", "después del click")
- **Un GIF** opcional (loop reproducible en cualquier visor)
- **Un manifest JSON** con metadata (qué ruta, qué env, cuándo, cuánto duró)

Todo eso queda fuera del repo (gitignored). Si querés compartirlo, lo adjuntás manualmente.

## Por qué existe

Antes, cada persona que necesitaba ver una pantalla escribía su propio script de Playwright. En una sesión se observaron 6 versiones distintas — todas con leves diferencias, todas reinventando lo mismo (autenticación, headers, viewport, recording). Eso es deuda silenciosa.

La herramienta consolida ese patrón en una sola CLI canónica que:

- Reusa la autenticación de agente que ya existe (no reinventa cookies).
- Usa los storage states canónicos por entorno (`.auth/storageState.<env>.json`).
- Aplica el bypass de Vercel SSO automáticamente para staging.
- Tiene 5 capas de seguridad: bloquea production por default, enmascara passwords, valida que el output no escape de `.captures/`, registra cada captura en un audit log.

## Cómo se compone

3 piezas:

1. **CLI (`pnpm fe:capture`)** — el comando que invocás.
2. **Scenarios declarativos** (archivos `.scenario.ts`) — describís los pasos (hover, click, mark) en TypeScript tipado.
3. **Output estructurado** (`.captures/<timestamp>_<scenario>/`) — siempre la misma forma para que un visor / agente sepa qué buscar.

## Niveles de uso

### Nivel 1 — Captura simple (sin código)

Si solo necesitás un screenshot + un breve video de una ruta:

```bash
pnpm fe:capture --route=/hr/offboarding --env=staging --hold=3000
```

`--hold` controla cuántos ms espera post-mount antes de la screenshot.

### Nivel 2 — Scenario con interacciones

Si necesitás validar microinteractions (hover, click, transitions), escribís un scenario:

```ts
import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'mi-feature',
  route: '/finance/cash-out',
  viewport: { width: 1440, height: 900 },
  steps: [
    { kind: 'wait', selector: 'h4', timeout: 5000 },
    { kind: 'mark', label: 'initial' },
    { kind: 'hover', selector: '[role="tab"]:nth-child(2)' },
    { kind: 'mark', label: 'tab-hover' }
  ]
}
```

Y lo corrés: `pnpm fe:capture mi-feature --env=staging`.

### Nivel 3 — Captura con mutaciones (escritura)

Por default un scenario es read-only. Si necesitás llenar un formulario y submitir (lo cual crea una entidad real en staging), tenés que declararlo explícitamente:

```ts
mutating: true,
safeForCapture: true,  // confirmación explícita
```

Esta doble confirmación previene que alguien grabe un screenshot y termine creando 50 casos de offboarding en staging accidentalmente.

## Salvaguardas

| Riesgo | Cómo se previene |
|---|---|
| Captura accidental contra production | Triple gate: env var + flag + capability futuro |
| Cookie de agent expirada (a 24h) | Detección automática + refresh proactivo si <1h restante |
| Password / secret en el recording | CSS blur + transparent + text-shadow sobre password inputs |
| Outputs commiteados al repo | `.captures/` está en `.gitignore` |
| Capturas viejas acumulando GBs | `pnpm fe:capture:gc --apply` purga >30 días |
| Scenarios mutating ejecutándose sin querer | Doble flag (`mutating: true` + `safeForCapture: true`) requerido |
| Agente reinventa la autenticación | El helper delega siempre a `scripts/playwright-auth-setup.mjs` |

## Quién lo usa

- **Desarrolladores frontend**: para validar visualmente cambios antes de PR.
- **Agentes (Claude, Codex, Cursor)**: como parte de su flujo de auditoría visual.
- **QA**: para reproducir bugs visuales y adjuntar artifacts.
- **Diseñadores**: para revisar implementaciones contra mockups Figma.

## Quién NO lo usa

- **Production users**: nunca tienen acceso al CLI. Es interno.
- **Tests de CI** que necesitan assertions: para eso están los Playwright Tests bajo `tests/e2e/`. Este helper produce artifacts, no aserta nada.
- **Visual regression diffing**: fuera de scope V1. Otra herramienta lo hará en V2.

## Cómo extender

- **Nuevo scenario**: agregar `scripts/frontend/scenarios/<name>.scenario.ts`. Ver guía completa en `scripts/frontend/scenarios/_README.md`.
- **Nuevo tipo de step**: extender `CaptureScenarioStep` en `scripts/frontend/lib/scenario.ts` + agregar caso en `runStep`.
- **Mobile viewport**: pasar a `--device=iPhone13` (no implementado V1; en backlog OQ-2).
- **Visual regression**: en backlog OQ-3.

> Detalle técnico: [GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md](../../architecture/GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md) describe el contrato completo, los tipos del DSL, las 5 capas de defense-in-depth, y el roadmap V1.1+.
