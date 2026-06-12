# GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1

Nombre canonico de producto interno: **Greenhouse Visual Capture** (`GVC`).

`GVC` es la herramienta operacional de captura visual del portal Greenhouse. Su interfaz CLI sigue siendo `pnpm fe:capture`; el nombre existe para que agentes, documentacion, handoffs y reviews hablen de la misma primitive sin reducirla a "un helper".

## Status

- Estado: `accepted`
- Version: `1.6`
- Fecha V1.0: `2026-05-12 mañana` — Slice 0-3 (CLI + scenario + recorder + docs)
- Fecha V1.1: `2026-05-12 tarde` — Delta OQ-1..OQ-6 (upload, device, diff, capability, reliability, ui-review scaffolding)
- Fecha V1.2: `2026-05-29` — Hook operativo para verificación visual UI obligatoria vía `pnpm fe:capture` y comandos relacionados
- Fecha V1.3: `2026-05-30` — Greenhouse Visual Capture named tool + scroll/captura full-page resiliente para pantallas largas
- Fecha V1.4: `2026-05-30` — evidence hardening: readiness/assertions, quality findings, report HTML, multi-viewport, microinteraction V2 y baseline mockup→runtime
- Fecha V1.5: `2026-06-07` — mockup→runtime contract gates (TASK-1018): baseline visual diff (pixelmatch + masks + home durable), layout integrity, console/hydration/network strict, trace on failure, keyboard/focus/reduced-motion, performance budgets, enterprise rubric + resumen ejecutivo
- Fecha V1.6: `2026-06-12` — local/Turbopack reliability: navegación `domcontentloaded` + readiness visual declarativa; `networkidle` deja de ser señal canónica para evidencia GVC.
- Owner: `Claude / Greenhouse frontend tooling`
- Relacionado con:
  - `scripts/frontend/` (implementación canónica)
  - `scripts/playwright-auth-setup.mjs` (primitiva de auth reusada)
  - `docs/manual-de-uso/plataforma/captura-visual-playwright.md`
  - `docs/documentation/plataforma/captura-visual.md`
  - `docs/operations/GREENHOUSE_UI_DELIVERY_LOOP_V1.md`
  - `CLAUDE.md` sección "Tooling disponible"
  - `AGENTS.md` sección "Tooling disponible"

## Pregunta

¿Cómo evitamos que cada agente / desarrollador reinvente Playwright cada vez que necesita capturar visuales o microinteractions de una ruta del portal?

## Decision

**Adoptar Greenhouse Visual Capture (`pnpm fe:capture`) como herramienta canónica única**, con scenarios declarativos tipados bajo `scripts/frontend/scenarios/<name>.scenario.ts`.

Reemplaza el patrón de `_cap.mjs` ad-hoc que se observó 6 veces en una sola sesión durante la auditoría visual de `/hr/offboarding` (mayo 2026). Cada ad-hoc reimplementa: autenticación, header bypass, viewport, recording, screenshot, output path — con drift inevitable.

Spec arquitectónica diseñada vía `arch-architect` skill con 4-pillar scoring (Safety, Robustness, Resilience, Scalability) y 5-layer defense-in-depth Safety. Verificado E2E contra staging en su primera versión (commit `1f03f019`).

## Delta 2026-05-29 — Visual UI Verification Hook

`pnpm fe:capture` queda elevado de helper recomendado a **hook operativo obligatorio** para evidencia visual de UI:

- Cualquier cambio o diagnóstico que toque UI visible, microinteractions, responsive, screenshots, secuencias de frames, design QA o revisión visual debe intentar primero `pnpm fe:capture` o `pnpm fe:capture:review`.
- Si existe scenario, se usa el scenario. Si no existe, se usa `--route` para evidencia rápida y se crea un scenario cuando el flujo sea repetible o tenga interacciones.
- `pnpm fe:capture:diff` es el camino canónico para before/after.
- `pnpm fe:capture:health` sirve para verificar salud local del pipeline de capturas cuando una revisión depende de varios runs.
- Playwright ad-hoc queda permitido solo como complemento para consola, network, payloads API, auth local especial o interacciones no soportadas por el DSL. Ese bypass debe quedar explicado y sus artifacts deben vivir bajo `.captures/`.
- Si el helper falla por env faltante, se documenta el bloqueo exacto y se intenta `--env=local` cuando aplique; no se sustituye silenciosamente por screenshots manuales.

Este delta sincroniza `AGENTS.md`, `CLAUDE.md`, `project_context.md`, la skill Codex `greenhouse-browser-diagnostics`, el UI delivery loop, los manuales de captura, `scripts/frontend/README.md` y el método histórico en `docs/ui/`.

## Delta 2026-05-30 — Greenhouse Visual Capture y scroll resiliente

La herramienta queda nombrada como **Greenhouse Visual Capture** (`GVC`) y el DSL deja de depender de offsets de scroll frágiles para pantallas largas.

Capacidades nuevas:

- `scroll` puede apuntar a un `selector` estable y usar `scrollBlock` / `scrollInline` como `scrollIntoView`.
- `scroll` puede moverse al inicio o final del documento con `scrollTo: 'top' | 'bottom'`.
- `scrollY` sigue existiendo, pero pasa a ser un ajuste relativo complementario, no el patrón recomendado para encontrar secciones.
- `mark` acepta `fullPage: true` para auditar pantallas completas con scroll.
- `mark` acepta `clipSelector` para capturar una sección específica sin depender del viewport completo.
- El validador rechaza combinaciones ambiguas como `fullPage + clipSelector`, opciones de captura en steps que no sean `mark`, y opciones de scroll en steps que no sean `scroll`.

Convención de estabilidad:

- Cuando una sección de UI deba ser capturada repetidamente, agregar un atributo estable `data-capture="<nombre-seccion>"` en el wrapper de la sección.
- Preferir selectors semánticos (`data-capture`, landmarks, roles) sobre selectors posicionales (`:nth-child`) para que la captura sobreviva a cambios de copy, spacing o densidad.
- Crear un scenario cuando el flujo se repetirá, validará scroll, usará interacciones, o alimentará una revisión de UI. El modo `--route` queda para evidencia rápida de primer fold.

Scenarios de regresión de la capacidad V1.3:

- `contractor-admin-workbench`: valida `/hr/contractors/mockup` con scroll por selector y `clipSelector`.
- `offboarding-fullpage-capture`: valida `/hr/offboarding/mockup` con `fullPage`.
- `sample-sprints-scroll-anchors`: valida `/agency/sample-sprints/mockup` con `scrollTo: 'bottom'` y regreso a top.

## Delta 2026-05-30 — Evidence hardening V1.4

GVC deja de ser solo un grabador y pasa a producir evidencia visual con guardrails explícitos:

- `readiness`: espera selector(es) estables, ausencia de loading/login, `document.fonts.ready` y delay post-ready antes de capturar.
- `assertions`: guards ligeros (`visible`, `notVisible`, `noLoginRedirect`, `noErrorBoundary`, `noCriticalToast`) para evitar evidencia falsa. No reemplazan Playwright E2E.
- `interaction`: step V2 para microinteractions con intención, acción, frames relativos, segmento lógico en manifest y evidencia keyboard/focus opcional.
- `qualityFindings`: análisis automático de frames para detectar login, error boundary, loading visible o frames sospechosamente vacíos.
- `viewports`: variantes declarativas por scenario; una corrida puede producir sub-runs desktop/tablet/mobile sin duplicar archivos.
- `index.html`: cada captura genera reporte HTML estático con metadata, readiness, assertions, findings, interactions y frames.
- `failureCategory`: audit/manifest clasifican fallos como `auth_redirect`, `selector_timeout`, `app_error`, `visual_timeout`, `frame_quality`, `assertion_failed` o `helper_error`.
- `baseline`: metadata `surfaceId`, `baselineName`, `approvedMockupCaptureDir` para flujos mockup aprobado → runtime.

Scenarios de regresión V1.4:

- `gvc-readiness-assertions-report`: readiness + assertions + report HTML.
- `offboarding-queue-microinteractions-v2`: interaction step con frames before/during/after y keyboard evidence.
- `gvc-multi-viewport`: variantes desktop/tablet/mobile en un solo scenario.
- `contractor-admin-runtime-baseline`: caso vivo TASK-796 mockup→runtime sobre `/hr/contractors`.

## Delta 2026-06-12 — Readiness visual sobre `networkidle` (V1.6)

GVC deja de usar `networkidle` como condición de navegación. En Next/Turbopack, HMR, chunk loading y requests persistentes pueden mantener actividad de red aunque la UI ya esté lista; esperar silencio de red convierte capturas válidas en timeouts falsos y empuja a reiniciar el servidor como workaround.

Contrato actualizado:

- `page.goto` usa `waitUntil: 'domcontentloaded'` para llegar al documento sin bloquearse por actividad de red persistente.
- La readiness real vive en el DSL: `scenario.readiness` para scenarios versionados y `--ready='[data-capture="..."]'` para capturas inline.
- Las capturas inline agregan guards ligeros por defecto contra login, loading dominante y skeletons, y esperan fuentes antes del primer frame.
- `pnpm fe:capture:health` y reinicios de servidor quedan como diagnóstico/recuperación cuando el proceso local está unhealthy, no como mecanismo primario para resolver evidencia visual.

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
pnpm fe:capture:review <scenario-or-capture-dir> --env=staging
pnpm fe:capture:diff .captures/<prev> .captures/<curr>
pnpm fe:capture:health
pnpm fe:capture:micro --route=/path --selector='[data-capture="x"]' --env=local --duration=5000 --fps=24
pnpm fe:capture:gc [--apply] [--days=N] [--max-gb=N] [--keep=N]
```

Flags soportadas:
- `--env` ∈ `local | staging | dev-agent | production` (default `staging`)
- `--route` — inline mode, sin scenario file
- `--hold` — ms a esperar post-mount en inline mode
- `--gif` — composeGif via ffmpeg (warn + skip si no disponible)
- `--headed` — abre browser visible (debug)
- `--prod` — production gate flag (parte del Triple Gate)

`fe:capture:micro` es el sampler selector-scoped para motion fino: captura PNGs secuenciales a FPS controlado, `recording.webm`, `contact-sheet.png`, `manifest.json`, `index.html` y `micro.gif` opcional. No aplica determinismo de baseline porque se usa para observar motion real.

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
    { kind: 'mark',  label, note?, fullPage?, clipSelector? },
    { kind: 'hover', selector, timeout? },
    { kind: 'click', selector, timeout? },
    { kind: 'scroll', scrollY?, selector?, scrollBlock?, scrollInline?, scrollTo? },
    { kind: 'sleep', ms },
    { kind: 'fill',  selector, value },        // requiere mutating
    { kind: 'press', selector?, key }          // requiere mutating
  ]
}
```

Patrones recomendados para pantallas largas:

```ts
steps: [
  { kind: 'wait', selector: 'h4', timeout: 5000 },
  { kind: 'mark', label: 'first-fold' },
  { kind: 'scroll', selector: '[data-capture="timeline"]', scrollBlock: 'center' },
  { kind: 'mark', label: 'timeline-section', clipSelector: '[data-capture="timeline"]' },
  { kind: 'scroll', scrollTo: 'bottom' },
  { kind: 'mark', label: 'full-page-audit', fullPage: true }
]
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
  readiness?: { status: 'passed' | 'failed' | 'skipped'; durationMs: number; error?: string }
  assertions?: Array<{ kind: string; status: 'passed' | 'failed'; selector?: string; reason?: string; message?: string }>
  qualityFindings?: Array<{ severity: 'info' | 'warning' | 'error'; category: string; code: string; message: string }>
  interactions?: Array<{ name: string; intent: string; actionKind: string; startMs: number; endMs: number; frameLabels: string[] }>
  failureCategory?: 'auth_redirect' | 'selector_timeout' | 'app_error' | 'visual_timeout' | 'frame_quality' | 'assertion_failed' | 'helper_error'
  reportHtml?: string
  variants?: Array<{ name: string; viewport: { width: number; height: number }; outputDir: string; manifestPath: string; exitCode: 0 | 1 }>
  baseline?: { surfaceId?: string; baselineName?: string; approvedMockupCaptureDir?: string }
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
├── micro.ts                # sampler selector-scoped para motion fino
├── gc.ts                   # garbage collector por antigüedad/tamaño
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
- **NUNCA** cerrar una verificación visual de UI con screenshots ad-hoc si `pnpm fe:capture` podía producir la evidencia.
- **NUNCA** usar Playwright ad-hoc como path visual primario sin explicar por qué `fe:capture`/scenario DSL no bastó.
- **NUNCA** scenarios con `mutating: true` sin `safeForCapture: true` explícito.
- **NUNCA** invocar `tsx scripts/frontend/capture.ts` directo — usar `pnpm fe:capture` para que tsx resuelva paths correctamente.
- **NUNCA** usar `scrollY` como unica forma de llegar a una sección estable si existe un selector posible.
- **NUNCA** combinar `fullPage` y `clipSelector` en el mismo `mark`.
- **NUNCA** usar `mark fullPage` para LEER el detalle de una sección cuando la pantalla tiene un sidebar `position: fixed` — el stitch de fullPage repite el elemento fijo a cada altura de scroll y el escalado vuelve el texto ilegible (TASK-1006, 2026-06-04). Para leer detalle/copy: `data-capture` en la sección + `scroll selector` + `mark clipSelector` (crisp, resolución real). `fullPage` es para "ver el largo total", no para auditar detalle.
- **NUNCA** committear `.captures/` ni `.auth/` — ambos en `.gitignore`.
- **NUNCA** loggear bypass secret a stdout / manifest / audit / stderr.
- **NUNCA** recording sin `applySecretMask` activo (incluso si el scenario no toca password inputs — defense-in-depth).
- **SIEMPRE** output bajo `<repo>/.captures/<ISO>_<scenario>/`.
- **SIEMPRE** preferir `pnpm fe:capture:review` cuando la captura alimenta una auditoría UI/UX o skill review.
- **SIEMPRE** crear/actualizar scenario si el flujo visual será reusable por otro agente.
- **SIEMPRE** preferir `data-capture="<seccion>"` para anclas de captura repetibles en mockups o componentes donde no afecte producto.
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
| **3** | Documentación: manual de uso + architecture spec + documentation funcional + ADR | ✅ Completo `de1f15dc` |
| **V1.1** | OQ-1..OQ-6 — upload, device flag, diff, capability, reliability local, ui-review scaffolding | ✅ Completo (este delta) |

## V1.1 entregado (Delta 2026-05-12)

| Item | Comando | Implementación |
|---|---|---|
| **OQ-1** GCS upload opt-in | `pnpm fe:capture <s> --env=staging --upload=<bucket>` | `lib/upload.ts` delega a `gcloud storage cp` subprocess (zero new deps). Genera signed URL del manifest válido 7d. |
| **OQ-2** Mobile viewport | `pnpm fe:capture <s> --device="iPhone 13"` | `lib/browser.ts` consume Playwright `devices[name]` preset; override viewport + userAgent + DPR automático. |
| **OQ-3** Visual diff | `pnpm fe:capture:diff <prev> <curr>` | `diff.ts` produce stdout summary + `diff-vs-<prev>.html` side-by-side report. Detección por label match + byte-delta threshold 1%. Zero new deps. |
| **OQ-4** Reliability local | `pnpm fe:capture:health [--last=N] [--json]` | `lib/reliability.ts` + `health.ts` leen `.captures/audit.jsonl`, computan failure rate + last failure + mean duration. Thresholds canónicos `warning ≥10%` / `error ≥25%`. V1.2: PG-backed `greenhouse_serving.frontend_capture_runs` cuando CI consuma el tool. |
| **OQ-5** ui-review integration | `pnpm fe:capture:review <s>` | `review.ts` corre fe:capture + genera `review-dossier.md` con 13-row checklist + frame refs + canon Geist+Poppins. Skill `greenhouse-ui-review` actualizada con sección "Recipe: capture-driven review" que documenta el flow. V1.2: invocación directa Anthropic SDK. |
| **OQ-6** Capability completa | `GREENHOUSE_CAPTURE_ACTOR_CAPABILITY=platform.frontend.capture_prod` | Capability declarada en `src/config/entitlements-catalog.ts` + migration `20260512091119820_seed-frontend-capture-prod-capability.sql` con seed idempotente + anti pre-up-marker guard + downgrade-only revert. Triple Gate completo: env var + CLI flag + actor capability declaration. |

### Triple Gate canónico (V1.1 completo)

Production captures (`--env=production`) requieren TODOS:

```text
1. GREENHOUSE_CAPTURE_ALLOW_PROD=true     (env var, .env.local)
2. --prod                                   (CLI flag explícito)
3. GREENHOUSE_CAPTURE_ACTOR_CAPABILITY=platform.frontend.capture_prod
                                            (actor declara que la posee + audit log lo registra)
```

V1.2: el check #3 migrará a validación PG real vía `can()` lookup runtime contra el subject del operador.

## V1.2 backlog

- **OQ-3.1** Pixel-perfect visual regression (agregar `pixelmatch` dep opt-in para diff perceptual)
- **OQ-4.1** Tabla PG `greenhouse_serving.frontend_capture_runs` + reader canónico para reliability signal vía `getReliabilityOverview`
- **OQ-5.1** Anthropic SDK orchestration directa en `pnpm fe:capture:review` (sin copy-paste manual)
- **OQ-6.1** Validación PG real del Triple Gate #3 vía `can(subject, 'platform.frontend.capture_prod', 'read', 'all')` cuando emerja necesidad real
- **OQ-7** Multi-browser support (Firefox, WebKit) además de Chromium
- **OQ-8** Stagger entrance animations en scenarios (probar la animación de mount inicial)

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

## Delta 2026-06-04 — Artefacto `fullPage` con sidebar fijo (aprendizaje GVC, TASK-1006)

Durante el loop GVC de TASK-1006 (verificar el resumen Confirmar del wizard de alta) un `mark fullPage` salió **ilegible**: el portal tiene el sidebar de navegación en `position: fixed`, y el stitch de `fullPage` lo **repinta a cada altura de scroll**, superponiéndolo sobre el contenido; además el escalado de una página alta achica el texto al punto de no poder leer copy ni valores.

**Regla práctica canonizada:** `fullPage` sirve para **ver el largo/estructura total** de una pantalla, NO para **leer detalle** (copy, valores, jerarquía fina). Para auditar una sección puntual:

```ts
{ kind: 'scroll', selector: '[data-capture="mi-seccion"]', scrollBlock: 'center' },
{ kind: 'mark', label: 'mi-seccion', clipSelector: '[data-capture="mi-seccion"]' }
```

Esto produce una captura crisp a resolución real, sin el artefacto del elemento fijo. Si la sección no tiene un selector estable, agregar un `data-capture` (envoltura `Box data-capture="…"` version-agnostic) — preferido sobre offsets o `fullPage` para leer detalle. Reflejado en la Hard rule correspondiente + en el manual de uso ("Problemas comunes").

## Delta 2026-06-07 — Mockup→runtime contract gates V1.5 (TASK-1018)

GVC deja de ser solo evidencia y se vuelve **contrato operacional de implementación UI**. Todos los gates son **aditivos + opt-in por scenario + warning-first** (severidad `error` solo cuando el scenario la declara). `manifest.schemaVersion` se mantiene en `1` (campos aditivos). Los finding codes nuevos viven como SSOT en `scripts/frontend/lib/failure-taxonomy.ts` (`FINDING_CODES`).

### 1. Baseline visual contract (Slice 1)

- **Motor de diff**: `pixelmatch` + `pngjs` (devDependencies). Offline file-to-file con masks rectangulares por región. `includeAA=false` → menos flaky por antialiasing.
- **Home durable** (SSOT del mockup aprobado): `scripts/frontend/baselines/<surfaceId>/<viewport>__<frameLabel>.png` + sidecar `.mask.json`. Committeable, keyed por `surfaceId` → contrato cross-máquina/cross-agente (vs `.captures/` que es gitignored + purgado >30d).
- **Promoción manual explícita**: `pnpm fe:capture:diff --promote <capture-dir>`.
- **`scenario.baseline`** extendido: `surfaceId`, `requiredFrameLabels`, `maskSelectors`, `maxDiffRatio`, `maxChangedPixels`, `requiredRegions`.
- **Determinismo** (prerequisito del diff): cuando el scenario declara `baseline.surfaceId`, GVC aplica animaciones off + caret oculto + `prefers-reduced-motion: reduce` + fonts settled + `deviceScaleFactor` fijo. Un `maxDiffRatio` sobre captura no-normalizada se considera inválido.
- Codes: `baseline_missing`, `baseline_stale` (degradación honesta cuando el home durable falta), `frame_label_missing`, `visual_diff_exceeded`, `visual_diff_dimension_mismatch`, `visual_diff_failed`, `required_region_missing`, `mask_selector_missing`.
- `maskRects` se resuelven en capture-time desde `maskSelectors` y se persisten por frame; el diff aplica la unión baseline+runtime.

### 2. Layout integrity (`quality.layout`, Slice 2)

Scan en un solo `page.evaluate` por frame: overflow horizontal de página/elemento, target interactivo < `minTargetSize` (default 24px, piso WCAG 2.2 AA 2.5.8), texto cortado, regiones scrollables sin label, cards MUI anidadas. Opciones `includeSelector`/`ignoreSelectors`/`allowHorizontalScrollSelectors`/`failOnViolations`.

### 3. Console / hydration / network strict (`quality.runtime`, Slice 3)

Collectors sobre toda la vida de la página: `console.error`, `pageerror`, hydration (best-effort por pattern → `warning` salvo `failOnHydrationWarning`), responses 4xx/5xx de document/xhr/fetch. Mensajes saneados (bearer/jwt/cookie/email/hex) + truncados. `runtimeSummary` siempre en el manifest; findings solo opt-in con `ignoreUrlPatterns`/`ignoreConsolePatterns`.

### 4. Trace on failure (Slice 4)

`context.tracing` retain-on-failure: `trace.zip` se guarda solo cuando `exitCode=1`; en éxito se descarta. `outputs.trace` en manifest + link en el report. Abrir con `pnpm exec playwright show-trace <dir>/trace.zip`.

### 5. Keyboard / focus / reduced-motion (`quality.keyboard`, Slice 5)

Probes declarativas (Tab/Enter/Space/Escape/Arrows) sobre la página viva: `expectedFocusSelector`, focus ring visible (outline/box-shadow), estado esperado (`expectedVisibleSelector`/`expectedHiddenSelector`) y re-corrida bajo reduced-motion que marca `keyboard_reduced_motion_feedback_lost` si el feedback depende de animación. Frames before/after por probe.

### 6. Performance budgets (`quality.performance`, Slice 6)

Snapshot liviano via Resource/Paint Timing + DOM count (sin Lighthouse): `domNodes`, `requestCount`, `transferBytes`, FCP, DCL, JS heap. Budgets por scenario; warning-first (`severity: 'error'` opt-in). `performanceSummary` en manifest + panel en el report.

### 7. Data honesty + enterprise rubric (`quality.enterpriseRubric`, Slice 7)

Heurísticas advisory: placeholders (lorem/tbd/mock/fake/todo), ratio de tokens vacíos (—/0/N/A → fake-green), >1 botón primario por header, saturación de chips semánticos, `data-capture` declarado faltante. Verdict `pass|warning|blocked` + **resumen ejecutivo** (`Apto para implementar` / `Revisar` / `Requiere iteración`) en `index.html` y `review-dossier.md`. Es apoyo al review humano, no juicio estético absoluto.

### Esbuild keepNames + page.evaluate (aprendizaje live)

tsx/esbuild `keepNames` envuelve arrow-consts nombradas dentro de `page.evaluate` con un helper `__name()` que NO existe en el contexto del browser → `ReferenceError`. Mitigación canónica: (a) usar function declarations dentro de `page.evaluate`, (b) shim passthrough `globalThis.__name` vía `context.addInitScript` en `browser.ts` (defense-in-depth para cualquier evaluate futuro).

### Scenarios de regresión

- `gvc-contract-gates` — baseline + layout + runtime + performance + enterpriseRubric + accessibility.
- `gvc-keyboard-focus` — keyboard/focus gate.

### Verificación live (2026-06-07, `--env=local`)

`stale → promote → match (0px)` end-to-end; hydration warning detectado; layout/perf/rubric/keyboard funcionando; `fe:capture:review` (resumen ejecutivo + baseline diff + rubric) y `fe:capture:health` (tolerante a manifests mixtos) verdes.
