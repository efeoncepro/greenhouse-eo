---
name: greenhouse-gvc-playwright
description: Robust Playwright handling for Greenhouse Visual Capture (GVC), ad-hoc Playwright, and public WordPress/Elementor landing verification — how to observe before authoring and avoid fumbling selectors, waits, readiness, computed styles or captures. Invoke whenever you write or debug a `.scenario.ts`, run `pnpm fe:capture`, work on public-site/WordPress landings, drop to ad-hoc Playwright, or a capture comes back wrong (skeleton/login captured, selector timeout, flaky, clipped, "no encuentro el selector", Turbopack Compiling…). Distills the proven techniques from microsoft/webwright's `local_browser.py` (aria-tree observation, user-facing locators, layered timeouts, graceful degrade) + the Greenhouse-specific GVC/public-site gotchas. Triggers: "GVC", "fe:capture", "scenario", "Playwright", "WordPress landing", "public site", "Elementor", "selector", "readiness", "captura", "aria snapshot", "computed style", "no encuentro el selector", "captura sale mal", "skeleton", "clipSelector", "networkidle".
type: reference
---

# Greenhouse GVC + Playwright — robust handling

**Para qué:** dejar de fumblear Playwright en GVC. Tú (Claude) y Codex repetidamente **autoramos a ciegas**: escribimos selectores adivinados en un `.scenario.ts` sin ver la página, corremos `fe:capture`, miramos el PNG, descubrimos que el selector no resolvía / capturó un skeleton / clippeó por el sidebar fixed, editamos, re-corremos. Esta skill mata ese loop.

**Origen:** técnicas destiladas de `microsoft/webwright` `src/webwright/environments/local_browser.py` (Apache-2.0, Microsoft; SOTA en Mind2Web 86.7%) — el *craft* probado, **NO** su runtime de ejecución de código libre. GVC se queda determinístico y gobernado; solo le agregamos ojos en el loop de autoría.

**Plugin Webwright local:** en el entorno Codex de Julio está instalado `webwright@webwright-local` (marketplace adaptador `~/.codex/plugins/webwright-marketplace`, plugin cache `~/.codex/plugins/cache/webwright-local/webwright/0.1.0`) con runtime Python + Playwright Firefox/Chromium verificado. Si un turno nuevo expone la skill/plugin `webwright` o `@webwright`, úsalo para exploración compleja, descubrimiento de selectores, flujos largos o scripts reproducibles de observación. Al cerrar trabajo Greenhouse, traduce lo aprendido a GVC/scenario/gate durable; no reemplaza `pnpm fe:capture`, `pnpm public-website:*` ni la verificación desktop/mobile.

---

## Regla #1 — Observa ANTES de autorar (aria snapshot). No adivines selectores.

GVC (Capa 1, TASK-1097) escribe en **cada `mark`** un snapshot del **árbol de accesibilidad** de la región capturada:
- `manifest.frames[].ariaSnapshotPath` → `frames/<NN>-<label>.aria.txt`

Ese archivo es **lo que tienes que leer** en vez de mirar el PNG y adivinar. Ejemplo real (`/coming-soon`):

```
- main:
  - heading "Falta poco para abrir" [level=1]
  - timer "49 Días, 15 Horas..."
  - button "Notifícame"
  - button "¿Prefieres otro correo?"
  - img "Efeonce"
```

Con eso escribes `getByRole('button', { name: 'Notifícame' })` **contra lo que existe de verdad**, no `[class*="MuiButton"]:nth-child(3)` adivinado.

**Loop canónico de autoría:**
1. **Throwaway capture primero** si nunca viste la ruta: `pnpm fe:capture --route=/finance/cash-out --env=staging --hold=2000`.
2. **Lee el `.aria.txt`** del run (`.captures/<ISO>/01-desktop/frames/*.aria.txt`) → ahí están los roles + nombres reales.
3. **Escribe el scenario** con `getByRole`/`getByText` + `readiness` (abajo).
4. `pnpm fe:capture <scenario>` → lee el dossier (`fe:capture:review`) → itera.

---

## Locators — user-facing > CSS (Webwright + Playwright moderno)

| Prefiere | Evita |
|---|---|
| `getByRole('tab', { name: 'Conciliados' })` | `[role="tab"]:nth-child(2)` |
| `getByRole('button', { name: 'Registrar pago' })` | `[class*="MuiButton-contained"]` |
| `getByText('Sin resultados')` | `.empty-state > p` |
| `[data-capture="timeline"]` (marker estable explícito) | offsets de scroll frágiles |

- `nth-child`/clases MUI cambian con el render → frágiles. Roles + nombres accesibles son estables (y los lees del `.aria.txt`).
- Para **regiones de captura**, los markers `data-capture="<seccion>"` son explícitos y estables — preferilos sobre offsets de scroll.

En el DSL de GVC los `step.selector` aceptan cualquier locator CSS/role; usa selectores de rol (`[role="..."][aria-label="..."]`) o data-markers. Para ad-hoc Playwright, usa `page.getByRole(...)` directo.

---

## Waits / readiness — NUNCA `networkidle`

`networkidle` **falsea-bloquea** con Next/Turbopack (HMR + chunks + requests persistentes siguen vivos aunque la UI esté lista). GVC ya migró a `domcontentloaded` + readiness DSL.

- **Navegación**: `goto(url, { waitUntil: 'domcontentloaded' })` (Webwright hace exactamente esto).
- **Readiness real** (DSL del scenario), para no capturar login/loading/error:
  ```ts
  readiness: {
    selector: '[data-gvc-ready="mi-feature"]',           // algo que SOLO existe cuando la data está
    absentSelectors: ['.MuiSkeleton-root', '[data-testid="login-card"]', '[data-loading="true"]'],
    waitForFonts: true,
    postReadyDelayMs: 150,
    timeout: 8000
  },
  assertions: [
    { kind: 'noLoginRedirect', reason: 'ruta autenticada' },
    { kind: 'noErrorBoundary', reason: 'la evidencia no debe ser un error de app' }
  ]
  ```
- **Timeouts en capas** (modelo de Webwright — separa nav / operación / observación): navegación ~30s, espera de selector ~5-10s, observación ~5s. No uses un timeout único gigante: enmascara el fallo real.

---

## Graceful degrade (Webwright) — una observación opcional NUNCA rompe la captura

Webwright envuelve cada componente de observación (url/title/aria/screenshot) en su propio try/except. GVC ya lo hace (`failure-taxonomy.ts`, y el aria snapshot es best-effort). **Para ad-hoc Playwright: haz lo mismo** — envuelve inspecciones opcionales en try/catch; nunca dejes que un `aria`/screenshot tumbe el flujo principal.

---

## Gotchas de GVC que repetidamente nos pegan

- **`fullPage` + sidebar `position:fixed` → ilegible** (el sidebar se repite/encima). Para detalle, **scrollea al selector y captura con `clipSelector`** sobre un `data-capture`:
  ```ts
  { kind: 'scroll', selector: '[data-capture="timeline"]', scrollBlock: 'center' },
  { kind: 'mark', label: 'timeline', clipSelector: '[data-capture="timeline"]' }
  ```
- **Capturó skeleton/login en vez de contenido** → faltó `readiness.absentSelectors` (MuiSkeleton-root, login-card, data-loading).
- **Turbopack `Compiling…`** → readiness DSL, no `networkidle`. Si `localhost` queda compilando, sigue la secuencia Turbopack canónica de CLAUDE.md antes de `pnpm clean`.
- **Auth**: no re-fumbles el setup. GVC resuelve agent-auth en `scripts/frontend/lib/auth.ts`; para ad-hoc, `node scripts/playwright-auth-setup.mjs` genera `.auth/storageState.json` (personas: superadmin / collaborator / client — usa la de menor privilegio que represente el caso).
- **Staging tras SSO**: `pnpm fe:capture ... --env=staging` ya inyecta el bypass; ad-hoc curl/Playwright a `.vercel.app` requiere header `x-vercel-protection-bypass`.
- **Steps mutating** (`fill`/`press`/`click` que dispara Server Action): requieren `mutating: true` + `safeForCapture: true`. **⚠️ Crean entidades reales en staging.** Read-only por default.
- **Labels de `mark`**: `kebab-case`, únicos por scenario (la validación rompe build si duplicas), empezar con `initial-*`.

---

## Cuándo caer a ad-hoc Playwright (y cómo)

El DSL de GVC cubre captura/scroll/interacción/baseline. Cae a Playwright ad-hoc **solo** cuando necesitas console/network/API payloads o una interacción que el DSL no soporta. Reglas:
- Guarda artifacts bajo `.captures/` y **documenta por qué no bastó GVC**.
- Si el flujo es repetible, **promovelo a scenario** (`scripts/frontend/scenarios/`) — el artefacto durable es el DSL determinístico, no un `.mjs` huérfano.
- Reúsa `lib/auth.ts` + `lib/browser.ts` (auth + lifecycle ya resueltos); no reinventes el setup.

## Canaries de navegador para consumidores AXIS

Los canaries de consumidor AXIS son opt-in y deben ser reproducibles en CI y en local:

- Declara `playwright-core` como dependencia del canary; no uses `playwright` si el canary no necesita
  descargar browsers.
- Lanza el navegador con `chromium.launch({ channel: 'chrome' })`, usando el Chrome instalado por el runner;
  no hardcodees `/Applications/...`, rutas del perfil del desarrollador ni ejecutables locales.
- Mantén el canary read-only salvo que el contrato requiera una mutación explícita. Comprueba la superficie
  real del consumidor, no una página o mock que el propio canary invente.
- Guarda evidencia mínima y no sensible: target SHA, versión de paquetes, URL, assertions, errores de
  consola/red y resultado. Nunca incluyas cookies, headers de autorización, tokens ni valores de Secret
  Manager en artifacts o logs.
- Si el canary falla, conserva el artifact de diagnóstico, detén la promoción y usa el deployment anterior
  conocido como rollback target. Verifica salud y smoke después de restaurar tráfico; rollback no significa
  solo cambiar tráfico, también exige conservar el digest y la configuración de build que permite repetirlo.

## Public WordPress / Elementor landing mode

Cuando el target es `efeoncepro.com` u otra landing pública WordPress/Elementor, **también aplica Webwright**, aunque no exista una ruta local Greenhouse ni un scenario GVC previo.

Reglas:

- **Observa antes de tocar:** primero inspecciona DOM/render real con Playwright (`domcontentloaded`, no `networkidle` como única verdad), roles/texto/selector estable, screenshots y computed styles. No hagas cambios Elementor basados solo en memoria o en un PNG del operador.
- **Computed style es el contrato:** para typography/layout bugs, lee `getComputedStyle()` en desktop y mobile 390. La cascada Ohio/Elementor puede hacer que el CSS correcto exista en el HTML pero no gane en runtime.
- **Promueve probes repetibles a comando durable:** si un bug puede volver, no lo dejes como `tmp/*.mjs`; crea un script repo-level o scenario que falle. Ejemplo vigente: `pnpm public-website:verify-aeo-form-typography`.
- **Webwright cuando aporte:** si la landing requiere exploración multi-step, estados interactivos, o una auditoría de varias secciones, puedes arrancar con `@webwright`/skill Webwright para producir un script y screenshots de observación. Luego cristaliza el contrato en GVC, Playwright repo-level o un comando `public-website:*` antes de cerrar.
- **No adoptes code-as-action de Webwright:** el agente no debe ejecutar código libre como superficie runtime de producto. Se importan las técnicas de observación, locators, layered timeouts y graceful degrade; las mutaciones siguen por el carril gobernado (`Document::save()`, backups, cache purge, Playwright verification).
- **Scope público:** para landings WordPress, captura evidencia desktop + mobile 390, overflow (`scrollWidth - clientWidth`), y los estados relevantes (forms, accordions, reduced-motion) antes de cerrar.

---

## El límite (por qué NO copiamos Webwright entero)

Webwright **ejecuta Python que el modelo escribe libremente** contra el browser. En Greenhouse eso violaría Full API Parity (la UI/agente es cliente de commands/readers gobernados, no una superficie scripteable), tenant safety y determinismo de baselines. Tomamos las **técnicas** (aria observation, user-facing locators, layered timeouts, graceful degrade) dentro del DSL gobernado; el code-as-action en runtime **no**.

**Explore mode (TASK-1098, ya shipped):** el loop de Regla #1 ahora tiene comandos dedicados:
- `pnpm fe:capture:explore --route=/x --env=staging [--ready=<sel>] [--probe='role=button[name="X"]']` — observa la página viva (read-only) y persiste `.captures/_explore/<slug>/{session.json,aria.txt,snapshot.png}`: candidatos con `getByRole(...)` sugerido + **uniqueness validada** (¿resuelve a 1 nodo?) + markers `data-capture`/`data-gvc-ready` + probes. Es el `spawn→inspect→discard` de Webwright aplicado a la autoría.
- `pnpm fe:capture:promote --route=/x --name=<scenario> [--mark='<sel>']` — cristaliza la sesión en un `.scenario.ts` válido (readiness auto desde marker/heading único + marks). Revisas y `pnpm fe:capture <scenario>`.

⚠️ **Readiness auto puede ser flaky:** si la ruta no tiene markers `data-gvc-ready`/`data-capture`, promote ancla la readiness a un heading único — y si ese heading tiene copy dinámico (rota/cambia), la readiness falla al capturar. **Revisa la readiness del scenario generado** y prefiere un marker estable.

**Coreografía / microinteracciones (TASK-1099):** explore/promote SÍ cubren motion:
- `pnpm fe:capture:explore --route=/x --interaction 'hover:<selector>'` (repetible; `hover`|`focus`|`click` — read-only, NUNCA fill/press) — performa la acción y **mide los timings reales** del feedback por pixel-diff (TASK-1100): muestrea el clip del target y deriva `feedback`/`settled` (cualquier motion: CSS/framer-motion/GSAP). `--interaction-window=<ms>` (default 1000) para animaciones largas. Si no hay cambio visible → reporta honesto (`measuredTimings:false`).
- `promote` auto-emite un step **`interaction` (V2)** por cada interacción observada con los `atMs` **medidos** (frames + keyboardEquivalent + `reducedMotion: 'capture'`); ajustas `intent`.
- También puedes autorar el step `interaction` a mano o usar `pnpm fe:capture:micro`.

---

## Comandos canónicos

```bash
pnpm fe:capture:explore --route=/x --env=staging   # observa la página viva ANTES de autorar (TASK-1098)
pnpm fe:capture:explore --route=/x --interaction 'hover:[role="tab"]'   # observa una microinteracción (TASK-1099)
pnpm fe:capture:promote --route=/x --name=<scenario>  # cristaliza la sesión en un .scenario.ts válido (+ interaction steps)
pnpm fe:capture <scenario> --env=staging        # captura (lee el .aria.txt del run)
pnpm fe:capture --route=/x --env=staging --hold=2000   # throwaway para observar antes de autorar
pnpm fe:capture:micro <scenario> --env=staging  # microinteractions / coreografía (DSL interaction V2)
pnpm fe:capture:review <scenario|capture-dir>   # dossier Apto/Revisar/Iterar (self-reflection gate)
pnpm fe:capture:diff <prev> <curr>              # before/after (mockup→runtime)
pnpm fe:capture:health                          # salud local del helper
```

**Spec GVC**: `docs/architecture/GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md` · DSL: `scripts/frontend/scenarios/_README.md` · Capa 1 aria: TASK-1097.
