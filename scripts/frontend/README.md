# Greenhouse Visual Capture

CLI canónico para capturar visuales, pantallas largas y microinteractions de cualquier ruta del portal usando Playwright + agent auth.

Nombre operacional: **Greenhouse Visual Capture** (`GVC`). Comando principal: `pnpm fe:capture`.

Reemplaza el patrón "cada agente escribe su `_cap.mjs` ad-hoc".

## Uso rápido

```bash
# Scenario predefinido (recomendado)
pnpm fe:capture offboarding-queue-microinteractions --env=staging

# Captura simple de una ruta (sin scenario)
pnpm fe:capture --route=/hr/offboarding --env=staging --hold=3000

# Con GIF (requiere ffmpeg instalado)
pnpm fe:capture offboarding-queue-microinteractions --env=staging --gif

# Lupa de microinteracción: frames secuenciales de un selector
pnpm fe:capture:micro --route=/design-system/nexa-brand --selector='[data-capture="nexa-floating-trigger"]' --env=local --duration=5000 --fps=24 --gif

# Headed para debug visual
pnpm fe:capture offboarding-queue-microinteractions --env=staging --headed
```

Output: `.captures/<ISO>_<scenario>/` (gitignored).

Desde V1.4, cada run también genera `index.html` y manifest enriquecido con readiness, assertions ligeros, findings de calidad de frame, failure taxonomy y segmentos de microinteractions cuando el scenario los declara.

Desde V1.5 (TASK-1018), GVC es **contrato de implementación mockup→runtime** con gates opt-in por scenario (warning-first): baseline visual diff, layout integrity, console/hydration/network strict, trace on failure, keyboard/focus/reduced-motion, performance budgets y enterprise rubric + resumen ejecutivo. Ver "Contract gates V1.5" abajo.

Ver doc completa: [docs/manual-de-uso/plataforma/captura-visual-playwright.md](../../docs/manual-de-uso/plataforma/captura-visual-playwright.md).
Arquitectura: [docs/architecture/GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md](../../docs/architecture/GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md).

## Hook operativo para agentes

Toda verificación visual de UI Greenhouse debe pasar primero por este helper:

- `pnpm fe:capture <scenario> --env=staging` si existe un scenario.
- `pnpm fe:capture --route=/path --env=staging --hold=3000` para evidencia rápida sin scenario.
- `pnpm fe:capture:review <scenario|capture-dir>` cuando la captura alimenta una revisión UI/UX.
- `pnpm fe:capture:diff <prev> <curr>` para comparar before/after.
- `pnpm fe:capture:health` para revisar salud local del pipeline de capturas.
- `pnpm fe:capture:micro --route=/path --selector='[data-capture="x"]'` para inspeccionar motion/frames de un selector concreto sin aplicar determinismo de baseline.

Para pantallas con scroll, no uses offsets frágiles como primera opción. Escribe un scenario con:

- `scroll` por `selector` y `scrollBlock` / `scrollInline`.
- `mark` con `clipSelector` para secciones.
- `mark` con `fullPage: true` para pantalla completa.
- `scrollTo: 'top' | 'bottom'` para anclas de documento.

Convención recomendada: `data-capture="<nombre-seccion>"` en wrappers que deban capturarse de forma repetible.

Para evidencia confiable en rutas importantes, preferí además:

- `readiness` para esperar una señal estable de página lista.
- `assertions` para bloquear capturas de login, error boundary o loading dominante.
- `interaction` para microinteractions con frames relativos e intención explícita.
- `viewports` para desktop/tablet/mobile en un solo scenario.
- `baseline` para comparar mockup aprobado contra runtime final con `fe:capture:diff`.

Playwright ad-hoc queda como complemento para consola/red/API payloads o pasos que el DSL no soporte. Si se usa, guardar artifacts bajo `.captures/` y documentar por qué no bastó `fe:capture`. Si el flujo se repetirá, agregar o actualizar un scenario en `scripts/frontend/scenarios/`.

## Estructura

```
scripts/frontend/
├── capture.ts                 # CLI entrypoint (tsx)
├── micro.ts                   # sampler de microinteracciones selector-scoped
├── gc.ts                      # purga por antigüedad/tamaño/per-scenario + auto-poda
├── index-cmd.ts               # fe:capture:index — regenera índice navegable
├── README.md                  # este archivo
├── lib/
│   ├── capture-paths.ts       # scenarioFromDirName + dirs reservados (concepts)
│   ├── capture-index.ts       # taxonomía derivada: INDEX.md + index.json
│   ├── env.ts                 # 3 envs: local | staging | dev-agent | production
│   ├── auth.ts                # delega a scripts/playwright-auth-setup.mjs
│   ├── browser.ts             # chromium + viewport + bypass + recordVideo
│   ├── scenario.ts            # DSL tipado + runner de steps
│   ├── recorder.ts            # ciclo webm + frames marker-based + manifest
│   ├── manifest.ts            # CaptureManifest writer
│   ├── quality.ts             # frame quality findings
│   ├── report.ts              # index.html + resumen ejecutivo
│   ├── failure-taxonomy.ts    # FINDING_CODES SSOT + classifyCaptureFailure
│   ├── visual-diff.ts         # pixelmatch + masks (Slice 1)
│   ├── baseline-contract.ts   # home durable + promoción + diff (Slice 1)
│   ├── capture-masks.ts       # maskRects + determinismo (Slice 1)
│   ├── layout-integrity.ts    # quality.layout (Slice 2)
│   ├── runtime-collector.ts   # quality.runtime (Slice 3)
│   ├── keyboard-gate.ts       # quality.keyboard (Slice 5)
│   ├── perf-budget.ts         # quality.performance (Slice 6)
│   ├── enterprise-rubric.ts   # quality.enterpriseRubric (Slice 7)
│   ├── gif.ts                 # ffmpeg compose (opcional)
│   ├── audit.ts               # JSONL append
│   └── safety.ts              # prod gate triple + secret mask + determinism
├── baselines/                 # home durable de mockups aprobados (committeado)
└── scenarios/
    ├── _README.md             # cómo escribir un scenario
    ├── gvc-contract-gates.scenario.ts   # regresión gates V1.5
    └── gvc-keyboard-focus.scenario.ts   # regresión keyboard gate
```

## Contract gates V1.5 (TASK-1018)

Todos opt-in por scenario, aditivos, warning-first (severidad `error` solo si el scenario la declara). Codes en `lib/failure-taxonomy.ts` (`FINDING_CODES`).

### Baseline visual diff (mockup → runtime)

```ts
baseline: {
  surfaceId: 'agency.organizations.list',      // home durable keyed por surfaceId
  requiredFrameLabels: ['first-fold'],
  maskSelectors: ['[data-relative-time]'],     // datos dinámicos enmascarados
  maxDiffRatio: 0.05                           // explícito ⇒ exceeded = error
}
```

Flujo: capturá el mockup aprobado → `pnpm fe:capture:diff --promote <capture-dir>` (materializa `scripts/frontend/baselines/<surfaceId>/`) → commiteá → el runtime con el mismo `surfaceId` corre el diff automáticamente. Sin baseline durable degrada honesto a `baseline_stale` (warning). El diff corre bajo captura determinista (animaciones off, caret oculto, reduced-motion, fonts settled) que GVC aplica solo cuando hay `baseline.surfaceId`.

### Otros gates (`quality.*`)

```ts
quality: {
  layout: { enabled: true, minTargetSize: 24 },                 // overflow/overlap/target/clip
  runtime: { failOnConsoleError: true, failOnHydrationWarning: true }, // console/page/hydration/4xx-5xx
  keyboard: { enabled: true, reducedMotionCheck: true,          // foco + ring + estado + reduced-motion
    probes: [{ name: 'open-menu', keys: ['Tab','Enter'], expectedVisibleSelector: '[role="menu"]' }] },
  performance: { enabled: true, severity: 'warning', maxDomNodes: 6000 }, // DOM/requests/transfer/FCP
  enterpriseRubric: { enabled: true }                           // placeholders/empty-tokens/primary/saturation
}
```

`trace.zip` se guarda automáticamente en cada captura fallida (`exitCode=1`) — abrir con `pnpm exec playwright show-trace <dir>/trace.zip`. El `index.html` y el `review-dossier.md` muestran un **resumen ejecutivo** (`Apto para implementar` / `Revisar` / `Requiere iteración`) + verdict del rubric.

## Crear un scenario nuevo

Ver `scenarios/_README.md` para el DSL completo.

## Garbage collection

```bash
pnpm fe:capture:gc                         # dry-run, lista qué borraría (>30d)
pnpm fe:capture:gc --apply                 # ejecuta
pnpm fe:capture:gc --apply --days=7        # threshold custom
pnpm fe:capture:gc --max-gb=15 --keep=20   # dry-run por tamaño, protege lo más reciente
pnpm fe:capture:gc --per-scenario=1 --apply  # conserva 1 evidencia por scenario,
                                             # purga las iteraciones anteriores
```

El ruido real de `.captures/` no son los `tmp-*` sino re-correr el MISMO scenario
decenas de veces iterando. `--per-scenario=N` conserva las N corridas más recientes
de cada scenario (= la evidencia final de esa superficie) y purga las iteraciones
viejas, sin importar la edad. `--grace-days=N` (default 2) nunca toca runs de una
sesión en curso.

**Auto-poda**: cada captura exitosa auto-limita su scenario a 3 corridas. Opt-out con
`GVC_NO_AUTOPRUNE=1`; tamaño con `GVC_KEEP_PER_SCENARIO=N`. Por eso `.captures/` ya no
se vuelve a acumular solo.

## Índice navegable (taxonomía trazable)

`.captures/` es plano, pero un índice DERIVADO (regenerable, nunca driftea) deja
ubicar qué está iterando un agente y cuál es la evidencia final de cada superficie.

```bash
pnpm fe:capture:index          # regenera .captures/INDEX.md + index.json
pnpm fe:capture:index --json   # modelo JSON a stdout (para agentes)
```

- `.captures/INDEX.md` → navegación humana: 🔴 **iterando ahora** (newest < 2h),
  agrupación **por work-item**, y tabla de **todas las superficies** con su evidencia.
- `.captures/index.json` → mismo modelo para consumo programático de agentes.
- Se **auto-regenera** tras cada captura y tras cada `fe:capture:gc --apply`.

**Tag de trazabilidad** (opcional): `pnpm fe:capture <scenario> --task=TASK-1053`
marca la corrida con su work-item; el índice agrupa por TASK-### en una sección propia.

Dimensiones (ortogonales): superficie (scenario) · work-item (`--task`) ·
lifecycle (evidencia vs iteración) · actividad (en curso) · tiempo.

### Conceptos IA (`.captures/concepts/`)

`.captures/` tiene dos *kinds*: capturas GVC (`<timestamp>_<scenario>/`) y **conceptos**
de IA del `product-design-loop`. El CLI los rutea solo:

```bash
pnpm ai:image --concept <loop> [--task TASK-###] --batch concepts.json
```

→ `.captures/concepts/<loop>/` + `manifest.json` trazable. Los conceptos están
**protegidos del GC** (curados, no efímeros — un `gc --apply` nunca los borra) y el
índice los muestra en su propia sección "🎨 Conceptos IA" agrupados por loop.
