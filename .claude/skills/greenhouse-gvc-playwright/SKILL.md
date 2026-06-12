---
name: greenhouse-gvc-playwright
description: Robust Playwright handling for Greenhouse Visual Capture (GVC) — how to author scenarios and ad-hoc Playwright WITHOUT fumbling selectors, waits, readiness or captures. Invoke whenever you write or debug a `.scenario.ts`, run `pnpm fe:capture`, drop to ad-hoc Playwright, or a capture comes back wrong (skeleton/login captured, selector timeout, flaky, clipped, "no encuentro el selector", Turbopack Compiling…). Distills the proven techniques from microsoft/webwright's `local_browser.py` (aria-tree observation, user-facing locators, layered timeouts, graceful degrade) + the Greenhouse-specific GVC gotchas. Triggers: "GVC", "fe:capture", "scenario", "Playwright", "selector", "readiness", "captura", "aria snapshot", "no encuentro el selector", "captura sale mal", "skeleton", "clipSelector", "networkidle".
type: reference
---

# Greenhouse GVC + Playwright — robust handling

**Para qué:** dejar de fumblear Playwright en GVC. Tú (Claude) y Codex repetidamente **autoramos a ciegas**: escribimos selectores adivinados en un `.scenario.ts` sin ver la página, corremos `fe:capture`, miramos el PNG, descubrimos que el selector no resolvía / capturó un skeleton / clippeó por el sidebar fixed, editamos, re-corremos. Esta skill mata ese loop.

**Origen:** técnicas destiladas de `microsoft/webwright` `src/webwright/environments/local_browser.py` (Apache-2.0, Microsoft; SOTA en Mind2Web 86.7%) — el *craft* probado, **NO** su runtime de ejecución de código libre. GVC se queda determinístico y gobernado; solo le agregamos ojos en el loop de autoría.

---

## Regla #1 — Observá ANTES de autorar (aria snapshot). No adivines selectores.

GVC (Capa 1, TASK-1097) escribe en **cada `mark`** un snapshot del **árbol de accesibilidad** de la región capturada:
- `manifest.frames[].ariaSnapshotPath` → `frames/<NN>-<label>.aria.txt`

Ese archivo es **lo que tenés que leer** en vez de mirar el PNG y adivinar. Ejemplo real (`/coming-soon`):

```
- main:
  - heading "Falta poco para abrir" [level=1]
  - timer "49 Días, 15 Horas..."
  - button "Notifícame"
  - button "¿Prefieres otro correo?"
  - img "Efeonce"
```

Con eso escribís `getByRole('button', { name: 'Notifícame' })` **contra lo que existe de verdad**, no `[class*="MuiButton"]:nth-child(3)` adivinado.

**Loop canónico de autoría:**
1. **Throwaway capture primero** si nunca viste la ruta: `pnpm fe:capture --route=/finance/cash-out --env=staging --hold=2000`.
2. **Leé el `.aria.txt`** del run (`.captures/<ISO>/01-desktop/frames/*.aria.txt`) → ahí están los roles + nombres reales.
3. **Escribí el scenario** con `getByRole`/`getByText` + `readiness` (abajo).
4. `pnpm fe:capture <scenario>` → leé el dossier (`fe:capture:review`) → iterá.

---

## Locators — user-facing > CSS (Webwright + Playwright moderno)

| Preferí | Evitá |
|---|---|
| `getByRole('tab', { name: 'Conciliados' })` | `[role="tab"]:nth-child(2)` |
| `getByRole('button', { name: 'Registrar pago' })` | `[class*="MuiButton-contained"]` |
| `getByText('Sin resultados')` | `.empty-state > p` |
| `[data-capture="timeline"]` (marker estable explícito) | offsets de scroll frágiles |

- `nth-child`/clases MUI cambian con el render → frágiles. Roles + nombres accesibles son estables (y los leés del `.aria.txt`).
- Para **regiones de captura**, los markers `data-capture="<seccion>"` son explícitos y estables — preferilos sobre offsets de scroll.

En el DSL de GVC los `step.selector` aceptan cualquier locator CSS/role; usá selectores de rol (`[role="..."][aria-label="..."]`) o data-markers. Para ad-hoc Playwright, usá `page.getByRole(...)` directo.

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
- **Timeouts en capas** (modelo de Webwright — separá nav / operación / observación): navegación ~30s, espera de selector ~5-10s, observación ~5s. No uses un timeout único gigante: enmascara el fallo real.

---

## Graceful degrade (Webwright) — una observación opcional NUNCA rompe la captura

Webwright envuelve cada componente de observación (url/title/aria/screenshot) en su propio try/except. GVC ya lo hace (`failure-taxonomy.ts`, y el aria snapshot es best-effort). **Para ad-hoc Playwright: hacé lo mismo** — envolvé inspecciones opcionales en try/catch; nunca dejes que un `aria`/screenshot tumbe el flujo principal.

---

## Gotchas de GVC que repetidamente nos pegan

- **`fullPage` + sidebar `position:fixed` → ilegible** (el sidebar se repite/encima). Para detalle, **scrolleá al selector y capturá con `clipSelector`** sobre un `data-capture`:
  ```ts
  { kind: 'scroll', selector: '[data-capture="timeline"]', scrollBlock: 'center' },
  { kind: 'mark', label: 'timeline', clipSelector: '[data-capture="timeline"]' }
  ```
- **Capturó skeleton/login en vez de contenido** → faltó `readiness.absentSelectors` (MuiSkeleton-root, login-card, data-loading).
- **Turbopack `Compiling…`** → readiness DSL, no `networkidle`. Si `localhost` queda compilando, seguí la secuencia Turbopack canónica de CLAUDE.md antes de `pnpm clean`.
- **Auth**: no re-fumbles el setup. GVC resuelve agent-auth en `scripts/frontend/lib/auth.ts`; para ad-hoc, `node scripts/playwright-auth-setup.mjs` genera `.auth/storageState.json` (personas: superadmin / collaborator / client — usá la de menor privilegio que represente el caso).
- **Staging tras SSO**: `pnpm fe:capture ... --env=staging` ya inyecta el bypass; ad-hoc curl/Playwright a `.vercel.app` requiere header `x-vercel-protection-bypass`.
- **Steps mutating** (`fill`/`press`/`click` que dispara Server Action): requieren `mutating: true` + `safeForCapture: true`. **⚠️ Crean entidades reales en staging.** Read-only por default.
- **Labels de `mark`**: `kebab-case`, únicos por scenario (la validación rompe build si duplicás), empezar con `initial-*`.

---

## Cuándo caer a ad-hoc Playwright (y cómo)

El DSL de GVC cubre captura/scroll/interacción/baseline. Caé a Playwright ad-hoc **solo** cuando necesitás console/network/API payloads o una interacción que el DSL no soporta. Reglas:
- Guardá artifacts bajo `.captures/` y **documentá por qué no bastó GVC**.
- Si el flujo es repetible, **promovelo a scenario** (`scripts/frontend/scenarios/`) — el artefacto durable es el DSL determinístico, no un `.mjs` huérfano.
- Reusá `lib/auth.ts` + `lib/browser.ts` (auth + lifecycle ya resueltos); no reinventes el setup.

---

## El límite (por qué NO copiamos Webwright entero)

Webwright **ejecuta Python que el modelo escribe libremente** contra el browser. En Greenhouse eso violaría Full API Parity (la UI/agente es cliente de commands/readers gobernados, no una superficie scripteable), tenant safety y determinismo de baselines. Tomamos las **técnicas** (aria observation, user-facing locators, layered timeouts, graceful degrade) dentro del DSL gobernado; el code-as-action en runtime **no**.

**Explore mode (TASK-1098, ya shipped):** el loop de Regla #1 ahora tiene comandos dedicados:
- `pnpm fe:capture:explore --route=/x --env=staging [--ready=<sel>] [--probe='role=button[name="X"]']` — observa la página viva (read-only) y persiste `.captures/_explore/<slug>/{session.json,aria.txt,snapshot.png}`: candidatos con `getByRole(...)` sugerido + **uniqueness validada** (¿resuelve a 1 nodo?) + markers `data-capture`/`data-gvc-ready` + probes. Es el `spawn→inspect→discard` de Webwright aplicado a la autoría.
- `pnpm fe:capture:promote --route=/x --name=<scenario> [--mark='<sel>']` — cristaliza la sesión en un `.scenario.ts` válido (readiness auto desde marker/heading único + marks). Revisás y `pnpm fe:capture <scenario>`.

**Coreografía / microinteracciones:** explore/promote generan un **baseline estático** de `mark`s. Para probar feedback de una acción (hover→feedback→settled, choreografía, motion) usá el step `interaction` (V2) del DSL o `pnpm fe:capture:micro` — promote NO los auto-genera.

---

## Comandos canónicos

```bash
pnpm fe:capture:explore --route=/x --env=staging   # observá la página viva ANTES de autorar (TASK-1098)
pnpm fe:capture:promote --route=/x --name=<scenario>  # cristaliza la sesión en un .scenario.ts válido
pnpm fe:capture <scenario> --env=staging        # captura (lee el .aria.txt del run)
pnpm fe:capture --route=/x --env=staging --hold=2000   # throwaway para observar antes de autorar
pnpm fe:capture:micro <scenario> --env=staging  # microinteractions / coreografía (DSL interaction V2)
pnpm fe:capture:review <scenario|capture-dir>   # dossier Apto/Revisar/Iterar (self-reflection gate)
pnpm fe:capture:diff <prev> <curr>              # before/after (mockup→runtime)
pnpm fe:capture:health                          # salud local del helper
```

**Spec GVC**: `docs/architecture/GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md` · DSL: `scripts/frontend/scenarios/_README.md` · Capa 1 aria: TASK-1097.
