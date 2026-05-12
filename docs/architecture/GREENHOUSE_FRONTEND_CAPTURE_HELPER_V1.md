# GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1

## Status

- Estado: `accepted`
- Fecha: `2026-05-12`
- Owner: `Claude / Greenhouse frontend tooling`
- Relacionado con:
  - `scripts/frontend/` (implementación canónica)
  - `scripts/playwright-auth-setup.mjs` (primitiva de auth reusada)
  - `docs/manual-de-uso/plataforma/captura-visual-playwright.md`
  - `docs/documentation/plataforma/captura-visual.md`
  - `CLAUDE.md` sección "Tooling disponible"
  - `AGENTS.md` sección "Tooling disponible"

## Pregunta

¿Cómo evitamos que cada agente / desarrollador reinvente Playwright cada vez que necesita capturar visuales o microinteractions de una ruta del portal?

## Decision

**Adoptar `pnpm fe:capture` como herramienta canónica única**, con scenarios declarativos tipados bajo `scripts/frontend/scenarios/<name>.scenario.ts`.

Reemplaza el patrón de `_cap.mjs` ad-hoc que se observó 6 veces en una sola sesión durante la auditoría visual de `/hr/offboarding` (mayo 2026). Cada ad-hoc reimplementa: autenticación, header bypass, viewport, recording, screenshot, output path — con drift inevitable.

Spec arquitectónica diseñada vía `arch-architect` skill con 4-pillar scoring (Safety, Robustness, Resilience, Scalability) y 5-layer defense-in-depth Safety. Verificado E2E contra staging en su primera versión (commit `1f03f019`).

## Por qué

### Problema

- Cada agente que necesita captura visual escribe su propio script.
- Cada script reinventa: auth (storage state), bypass header staging, viewport, recordVideo lifecycle, naming de output.
- Drift: 6 versiones distintas en 1 sesión, ninguna con safety gates ni audit trail.
- Outputs van a `/tmp/` (frágil), o peor: se cometen al repo accidentalmente.

### Restricciones canónicas que se deben respetar

- Agent auth canónico vía `scripts/playwright-auth-setup.mjs` (NUNCA reinventar — CLAUDE.md "Agent Auth").
- Vercel SSO bypass vía `x-vercel-protection-bypass` header en `.vercel.app` URLs.
- Storage states per-env en `.auth/storageState.<env>.json` (gitignored).
- No production captures sin Triple Gate (defensive default).

### Alternativas rechazadas

| Opción | Razón de descarte |
|---|---|
| Script ad-hoc por task | Ya pasó 6× en una sesión — costo claro de reinventar |
| Paquete npm separado | Premature abstraction; un solo repo consume |
| Playwright Test integration | Tests son asserts; captura necesita output flexible |
| Cypress / Puppeteer | Playwright ya es canónico (smoke E2E + auth setup) |
| Service worker / browser extension | Over-engineered, mantenimiento alto |
| Solo en CI | Devs necesitan capture local para iteración |
| GIF-only output (sin webm) | Pierde control granular; ffmpeg dependencia hard |

## Contrato canónico V1

### CLI

```
pnpm fe:capture <scenario-name> --env=staging
pnpm fe:capture --route=/path --env=staging --hold=3000
pnpm fe:capture <scenario-name> --env=staging --gif --headed --prod
pnpm fe:capture:gc [--apply] [--days=N]
```

Flags soportadas:
- `--env` ∈ `local | staging | dev-agent | production` (default `staging`)
- `--route` — inline mode, sin scenario file
- `--hold` — ms a esperar post-mount en inline mode
- `--gif` — composeGif via ffmpeg (warn + skip si no disponible)
- `--headed` — abre browser visible (debug)
- `--prod` — production gate flag (parte del Triple Gate)

### Scenario DSL

```ts
import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'kebab-case-name',                    // único, match ^[a-z0-9-]+$
  route: '/path',                              // debe empezar con /
  viewport: { width: 1440, height: 900 },
  initialHoldMs: 1500,                         // post-mount hydration wait
  finalHoldMs: 500,
  mutating: false,                             // default — solo hover/click no-mutating
  safeForCapture: false,                       // requerido si mutating=true
  extraMaskSelectors: ['[data-secret]'],       // CSS selectors a enmascarar
  steps: [
    { kind: 'wait',  selector, timeout? },
    { kind: 'mark',  label, note? },
    { kind: 'hover', selector, timeout? },
    { kind: 'click', selector, timeout? },
    { kind: 'scroll', scrollY },
    { kind: 'sleep', ms },
    { kind: 'fill',  selector, value },        // requiere mutating
    { kind: 'press', selector?, key }          // requiere mutating
  ]
}
```

### Output structure

```
.captures/<ISO>_<scenario>/
├── recording.webm         # video continuo del session
├── frames/
│   └── NN-<label>.png     # sync stills por step `mark`
├── flipbook.gif           # opt, con --gif y ffmpeg disponible
├── manifest.json          # CaptureManifest v1 (schemaVersion: 1)
└── stdout.log             # placeholder; full log requiere shell redirect
```

### Manifest schema

```ts
interface CaptureManifest {
  schemaVersion: 1
  scenarioName: string
  route: string
  env: CaptureEnv
  viewport: { width: number; height: number }
  startedAt: string         // ISO
  finishedAt: string        // ISO
  durationMs: number
  outputs: {
    recordingWebm: string | null
    framesDir: string
    flipbookGif: string | null
  }
  frames: Array<{
    index: number
    label: string
    path: string
    tMs: number             // ms desde startedAt
    note?: string
  }>
  exitCode: 0 | 1
  error?: { message: string; stepIndex: number }
}
```

### Audit log

`.captures/audit.jsonl` append-only. Una línea por run:

```json
{"timestamp":"2026-05-12T08:51:51.000Z","scenarioName":"...","route":"/hr/offboarding","env":"staging","outputDir":"<repo>/.captures/...","exitCode":0,"durationMs":6239,"actor":"user:jreye"}
```

## Topología de módulos

```
scripts/frontend/
├── capture.ts              # CLI entrypoint (tsx)
├── gc.ts                   # garbage collector >30d
├── README.md
├── lib/
│   ├── env.ts              # CaptureEnv + EnvConfig + resolveEnvConfig
│   ├── auth.ts             # ensureStorageStateFresh + refreshStorageState (delega a playwright-auth-setup.mjs)
│   ├── browser.ts          # launchCaptureSession + assertNotRedirectedToLogin
│   ├── scenario.ts         # CaptureScenario type + validateScenario + runStep
│   ├── recorder.ts         # runScenario lifecycle + marker-based frames
│   ├── manifest.ts         # CaptureManifest + writeManifest
│   ├── gif.ts              # composeGif (ffmpeg)
│   ├── audit.ts            # appendAudit + resolveActor
│   └── safety.ts           # enforceProductionGate + applySecretMask + assertSafeOutputPath
└── scenarios/
    ├── _README.md          # DSL guide
    └── <name>.scenario.ts  # 1 por feature/microinteraction set
```

## 5-layer defense-in-depth Safety

### Capa 1 — Production triple gate

```text
env === 'production' requires:
  ✓ GREENHOUSE_CAPTURE_ALLOW_PROD=true (env var, .env.local)
  ✓ --prod flag (CLI, defense-in-depth no-solo-env-var)
  ✓ Capability platform.frontend.capture_prod (futuro slice 2.1)
```

Si cualquiera falta, `enforceProductionGate` throw con mensaje claro listando los 3 requisitos.

### Capa 2 — Auth gate

Solo lee `.auth/storageState.<env>.json` (agent-session canónico). NUNCA user-personal storage. `ensureStorageStateFresh` valida cookie expiry y refresca proactivamente si <1h restante. Refresh delega a `playwright-auth-setup.mjs` — sin replicar la lógica de creación de cookie next-auth.

### Capa 3 — Output gate

`assertSafeOutputPath` verifica que el outputDir empiece con `<repo_root>/.captures/`. Bloquea escapes hacia repo root, dist/, public/, o paths absolutos fuera del proyecto.

`.captures/` está en `.gitignore` para que un commit accidental no exponga capturas.

### Capa 4 — Secret mask

`applySecretMask` aplica CSS `filter: blur(8px) + color: transparent + text-shadow` a:
- `input[type="password"]`
- `input[autocomplete="current-password"]`
- `input[autocomplete="new-password"]`
- `[data-capture-mask="true"]` (escape hatch para HTML custom)
- Selectores en `scenario.extraMaskSelectors[]`

stdout / manifest / audit NUNCA contienen el bypass secret ni emails personales (solo el `agentEmail` canónico que NO es secreto).

### Capa 5 — Audit log

Append-only JSONL en `.captures/audit.jsonl`. Cada run agrega: timestamp, route, env, scenario, outputDir, exitCode, durationMs, actor (resuelto vía `GITHUB_ACTOR > USER > 'unknown'`). gitignored — para forensic local/dev only.

## 4-pillar scoring

| Pilar | Score | Cómo |
|---|---|---|
| **Safety** | ✅ Strong | 5-layer defense-in-depth, prod triple-gated, secret mask, output gate, audit |
| **Robustness** | ✅ Strong | Step-level try/catch, partial output preservation, debug screenshot on failure, timeout 60s, validateScenario rompe scenarios inválidos pre-run |
| **Resilience** | ✅ Strong | Reusa primitivas existentes (no parallel auth), auto-refresh proactivo + reactivo, fail-loud con mensajes accionables (link a setup script) |
| **Scalability** | ✅ Strong | Scenarios son archivos N coexisten sin refactor, timestamps en path evitan clobber paralelos, browser per-run sin state shared, ffmpeg async no bloquea browser |

## Hard rules (anti-regresión)

- **NUNCA** ejecutar contra production sin Triple Gate completo (env var + flag + capability futuro).
- **NUNCA** reinventar agent-session. SIEMPRE delegar a `scripts/playwright-auth-setup.mjs`.
- **NUNCA** scenarios con `mutating: true` sin `safeForCapture: true` explícito.
- **NUNCA** invocar `tsx scripts/frontend/capture.ts` directo — usar `pnpm fe:capture` para que tsx resuelva paths correctamente.
- **NUNCA** committear `.captures/` ni `.auth/` — ambos en `.gitignore`.
- **NUNCA** loggear bypass secret a stdout / manifest / audit / stderr.
- **NUNCA** recording sin `applySecretMask` activo (incluso si el scenario no toca password inputs — defense-in-depth).
- **SIEMPRE** output bajo `<repo>/.captures/<ISO>_<scenario>/`.
- **SIEMPRE** timeout default 60s por step (configurable per step).
- **SIEMPRE** `headless: true` por default. `--headed` solo opt-in para debug local.
- **SIEMPRE** acompañar un scenario nuevo con `note` en cada `mark` explicando qué microinteraction valida.

## Dependencias técnicas

- ✅ `playwright` (ya dep) — core browser automation
- ✅ `tsx` (ya dep) — ejecuta `.scenario.ts` con TypeScript runtime
- ✅ `.env.local` con `AGENT_AUTH_SECRET` + `VERCEL_AUTOMATION_BYPASS_SECRET`
- ⚠️ `ffmpeg` system binary — opcional para `--gif`. macOS `brew install ffmpeg`. Sin ffmpeg → warn + skip, recording + frames intactos.
- ✅ `scripts/playwright-auth-setup.mjs` — primitiva canónica de auth reusada vía `spawnSync`

## Roadmap

| Slice | Scope | Status |
|---|---|---|
| **0** | CLI + auth + scenario parser + recorder + frames marker-based + manifest + 1 demo scenario | ✅ Completo `1f03f019` |
| **1** | GIF output, `--route` mode, `--headed` flag, audit log JSONL | ✅ Completo `1f03f019` |
| **2** | Prod triple gate, secret mask, stale-auth auto-refresh, `pnpm fe:capture:gc` | ✅ Completo `1f03f019` |
| **3** | Documentación: manual de uso + architecture spec + documentation funcional + ADR | ✅ Completo (este doc) |

## V1.1 backlog (no decidido en V1)

- **OQ-1** Auto-upload de captures a GCS bucket cuando un agente cierra una TASK — path estable queda definido para que un cron sweep lo levante después.
- **OQ-2** Mobile viewport (iPhone 13 simulator). V1 default 1440×900 desktop. Agregable como `--device=iPhone13`.
- **OQ-3** Visual regression diffing entre captures. Otra herramienta (`playwright-screenshots` + `pixelmatch`). Esta tool captura, no diffea.
- **OQ-4** Reliability signal `frontend.capture.failed` en Reliability Control Plane.
- **OQ-5** Integración con `greenhouse-ui-review` skill que corre captura + audit visual con LLM automático.
- **OQ-6** Capability `platform.frontend.capture_prod` real (completar Triple Gate). V1 solo tiene env var + flag.

## Verificación end-to-end

Comando ejecutado el 2026-05-12 contra staging real:

```bash
set -a; source .env.local; set +a
pnpm fe:capture offboarding-queue-microinteractions --env=staging
```

Output producido:

```
.captures/2026-05-12T08-51-51_offboarding-queue-microinteractions/
├── recording.webm      (931 KB)
├── frames/
│   ├── 01-initial-loaded.png
│   ├── 02-kpi-tile-hover.png
│   ├── 03-kpi-filter-active.png       ← muestra layoutId bar sliding + bg-tint warning + filter aplicado
│   ├── 04-kpi-back-to-all.png
│   ├── 05-row-hover.png
│   └── 06-inspector-cross-fade.png
├── manifest.json
└── stdout.log
```

6 frames generados en 6.2s. Manifest válido. webm reproducible. E2E OK.

## Referencias

- ADR canónico: `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`
- Implementación: `scripts/frontend/`
- Manual operativo: `docs/manual-de-uso/plataforma/captura-visual-playwright.md`
- Documentación funcional: `docs/documentation/plataforma/captura-visual.md`
- Agent auth canónico: CLAUDE.md sección "Agent Auth"
- Spec arquitectónica diseñada vía: `arch-architect` skill (`.claude/skills/arch-architect/SKILL.md`)
