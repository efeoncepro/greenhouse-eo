---
name: greenhouse-gvc-playwright
description: Robust Playwright handling for Greenhouse Visual Capture (GVC), ad-hoc Playwright, and public WordPress/Elementor landing verification — how to observe before authoring and avoid fumbling selectors, waits, readiness, computed styles or captures. Invoke whenever you write or debug a `.scenario.ts`, run `pnpm fe:capture`, work on public-site/WordPress landings, drop to ad-hoc Playwright, or a capture comes back wrong (skeleton/login captured, selector timeout, flaky, clipped, "no encuentro el selector", Turbopack Compiling…). Distills the proven techniques from microsoft/webwright's `local_browser.py` (aria-tree observation, user-facing locators, layered timeouts, graceful degrade) + the Greenhouse-specific GVC/public-site gotchas. Triggers: "GVC", "fe:capture", "scenario", "Playwright", "WordPress landing", "public site", "Elementor", "selector", "readiness", "captura", "aria snapshot", "computed style", "no encuentro el selector", "captura sale mal", "skeleton", "clipSelector", "networkidle", "fullPage", "charts vacíos", "cards vacías en la captura", "qualityProfile", "qualityFindings", "runtimeSummary", "pageErrorCount", "visual_timeout", "layout_element_overflow", "storageState expirado", "grabó login", "has-text", "keyboard_focus_ring_missing", "focus trap", "startSelector", "requireVisibleFocusRing", "quality.keyboard", "sonda de teclado", "pdfViewerEnabled", "el assert nunca pasa", "clic en el botón equivocado".
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
| `[data-capture="cv-open-trigger"]` (control que el step acciona) | `button:has-text("Ver")` — **matchea por SUBSTRING** |

- `nth-child`/clases MUI cambian con el render → frágiles. Roles + nombres accesibles son estables (y los lees del `.aria.txt`).
- Para **regiones de captura**, los markers `data-capture="<seccion>"` son explícitos y estables — prefiérelos sobre offsets de scroll.
- **`has-text` matchea por substring, y te muerde con palabras que se contienen.** `button:has-text("Ver")` también matchea **"Volver"**. En TASK-1715 el step accionaba el trigger del visor de CV; en el viewport móvil resolvió al botón de retroceso, el tab se reseteó y el scenario "falló" por una razón que no era el producto — dos corridas para entenderlo, porque el frame muestra una pantalla plausible, sólo que la equivocada. Un control que el scenario **acciona** lleva su propio `data-capture` y el selector va contra ese atributo; el texto visible además es copy y cambia (ver el bullet de TASK-1310 abajo). Si de verdad necesitas texto, ánclalo con rol + nombre accesible exacto (`getByRole('button', { name: 'Ver' })`, que matchea el nombre completo), nunca `has-text` suelto.

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

## Regla #2 — `fullPage` ROMPE los charts (TASK-1306)

**Si la superficie tiene gráficos, NO uses `fullPage`.** Para hacer el stitch, Playwright **redimensiona el viewport**; todo chart que mide su contenedor re-mide y queda en **tamaño 0**:

- **Recharts `ResponsiveContainer`** — los sparklines de `MetricTrendCard` (`width='100%'` + `overflowX:'clip'`).
- **ApexCharts** — las curvas de evolución, mismo mecanismo.

**La evidencia sale con las cards VACÍAS** (marco + título + número presentes, área del gráfico en blanco) mientras el browser muestra la pantalla perfecta. Es la trampa más cara del set porque **no se lee como defecto de captura**: se lee como dato faltante o reader degradado, y te vas a depurar un bug de producto que **no existe**.

Cobertura canónica — frame del viewport real (no toca el viewport) + un clip por región:

```ts
// desktop
{ kind: 'mark', label: 'default', note: 'Cockpit poblado en viewport real' },
{ kind: 'mark', label: 'kpis',    clipSelector: '[data-capture="seo-overview-kpis"]' },
{ kind: 'mark', label: 'sidebar', clipSelector: '[data-capture="seo-overview-sidebar"]' }

// mobile — scroll + un mark por zona, NUNCA un fullPage del stack
{ kind: 'mark', label: 'mobile-top' },
{ kind: 'scroll', selector: '[data-capture="seo-overview-sidebar"]' },
{ kind: 'sleep', ms: 600 },
{ kind: 'mark', label: 'mobile-sidebar' }
```

Plantillas vivas (con el porqué comentado dentro): `scripts/frontend/scenarios/growth-seo-overview.scenario.ts` y `growth-seo-overview-mobile.scenario.ts`.

`fullPage` queda solo para "ver el largo total" de una pantalla **sin charts y sin sidebar fijo**.

---

## Regla #3 — El PNG NO es el gate. Lee el manifest.

Declara `qualityProfile: 'standard'` en el scenario (`resolveCaptureQualityProfile` enciende axe + layout integrity `minTargetSize:24` + runtime collectors + assets + performance + enterprise rubric; warning-first, `failOnPageError:true`; `premium` los vuelve bloqueantes).

En TASK-1306, sobre una pantalla que **a ojo estaba impecable**, destapó: **8 excepciones de runtime por corrida**, violaciones axe reales (`aria-required-children`, `aria-valid-attr-value`), overflow horizontal y targets < 24px.

**Dónde leerlo — en `manifest.json`, NO en el log de consola:**

| Campo | Qué te da |
|---|---|
| `qualityFindings[]` | `severity` · `category` · `code` (SSOT `lib/failure-taxonomy.ts`) · **`selector`** · `message`. El `selector` es lo que te lleva al nodo; stdout solo cuenta cuántos hubo. |
| `runtimeSummary.pageErrorCount` + `pageErrorSamples[]` | Excepciones de página. **`> 0` con la UI renderizando bien = el caso que ningún screenshot revela.** |
| `runtimeSummary.consoleErrorSamples` / `hydrationWarningSamples` / `httpFailureSamples` | Consola, hidratación, 4xx/5xx (saneados + truncados). |

```bash
jq '.qualityFindings, .runtimeSummary' .captures/<run>/manifest.json
```

**Nunca cierres una verificación mirando el PNG cuando el scenario declara `qualityProfile`.**

---

## Regla #4 — Las sondas de calidad corren DESPUÉS de todos los steps (TASK-1715)

`runKeyboardGate` y el enterprise rubric se ejecutan **una vez, sobre el estado final** de la página, cuando el timeline de `steps` ya terminó (`scripts/frontend/lib/recorder.ts`, "runs after the timeline"). El corolario es duro: **el estado en el que dejas la UI en el último step es el estado que las sondas miden.**

**Deja la UI en reposo antes del cierre.** Un scenario que abre un `Dialog` en el último step no mide el control que te importa: mide el modal. En TASK-1715 la sonda de teclado arrancaba en un `startSelector` que quedaba **detrás** del modal; el focus trap de MUI interceptó el `Tab` y la sonda terminó midiendo un **centinela del trap** — un nodo que no es un control — y reportó `keyboard_focus_ring_missing` sobre él. El hallazgo era real como medición y completamente inútil como señal. Cierra diálogos y drawers como último step:

```ts
{ kind: 'click', selector: '[data-capture="cv-open-trigger"]' },
{ kind: 'mark', label: 'cv-dialog' },
{ kind: 'press', key: 'Escape' },        // reposo antes de las sondas
{ kind: 'mark', label: 'cv-dialog-closed' }   // y de paso, la restauración de foco
```

`Escape` **no** requiere `mutating: true`: el gate distingue teclas que NAVEGAN (`Escape`, `Tab`, flechas) de las que ACTIVAN (`Enter`, `Space`), y sólo gatea las segundas (`isNonActivatingKey`, `scripts/frontend/lib/scenario.ts`). No marques `mutating: true` para poder cerrar un modal — eso desactiva el gate para siempre en ese archivo y la próxima edición gana `fill` y click-mutante gratis.

**El `startSelector` se elige para que el siguiente tab-stop siga siendo un control DE ESTA TASK.** En TASK-1715 la sonda arrancaba en el último enlace de un grupo, así que el `Tab` caía en el **chrome global de Vuexy**, cuya falta de anillo de foco es deuda preexistente documentada (TASK-1686, TASK-355). El gate reportaba un fallo que la task no había causado ni podía arreglar: ruido puro, y peor, ruido que empuja a "arreglar" código ajeno para poner el gate en verde. **Un gate mide lo que la task construye, no lo que hereda.** Retrocede el `startSelector` un stop, o acota la sonda al primer control propio. Si de verdad hace falta medir chrome heredado, va con `requireVisibleFocusRing: false` **y razón escrita en el scenario** — precedente vivo con el comentario completo: `scripts/frontend/scenarios/client-portal-menu-with-module.scenario.ts`.

---

## Regla #5 — Un assert atado a una capacidad del navegador mide el HARNESS, no el producto (TASK-1715)

El Chromium headless del harness reporta **`navigator.pdfViewerEnabled === false`**: no embebe PDF, igual que un navegador móvil. Un assert que exigía un `iframe` con el PDF renderizado nunca podía pasar — no porque el producto fallara, sino porque el entorno de captura no tiene esa capacidad. El gate estaba midiendo una propiedad del navegador que lo ejecuta.

La regla es general y portátil, más allá del PDF: **si un assert depende de una capacidad del navegador, deja de ser un gate del producto.** Aplica igual a códecs de video, `SharedArrayBuffer`, WebGL, Web Bluetooth, `print()`, plugins nativos, DRM. Asserta la superficie que el producto **sí** controla:

```ts
// ✗ mide la capacidad del harness
{ kind: 'assert', selector: 'iframe[type="application/pdf"]', reason: 'el CV se ve' }

// ✓ mide lo que el producto decide
{ kind: 'assert', selector: '[data-capture="cv-viewer-dialog"]', reason: 'el diálogo abre' },
{ kind: 'assert', selector: '[data-capture="cv-download-fallback"]', reason: 'degradación honesta cuando el visor no embebe' }
```

Ese segundo assert además es el que **de verdad** te interesa: que el producto detecte la ausencia de la capacidad y ofrezca la salida honesta es comportamiento propio y verificable. Sanidad rápida cuando sospechas del entorno: `pnpm fe:capture:explore --route=/x --probe='…'` y lee lo que reporta el navegador vivo antes de escribir el assert.

---

## Falsos positivos conocidos (no los persigas)

- **`layout_element_overflow` sobre la tabla `sr-only` de `MetricTrendCard`** — es el fallback accesible de la serie, renderizado con `visuallyHidden` de MUI, que **posiciona el elemento fuera del viewport a propósito** (`position:absolute` + `width:1px` + `whiteSpace:nowrap`): exactamente la firma que busca el guard. Triage antes de tocar nada:
  1. ¿El `selector` resuelve a un nodo `visuallyHidden` / `.sr-only` / `clip-path: inset(50%)`? → falso positivo.
  2. ¿Hay `layout_horizontal_overflow` de página? Si `scrollWidth == clientWidth`, la página no se arrastra.
  3. ¿Se **ve** algo cortado en el frame? Un overflow real siempre se ve.

  El componente ya se defiende del riesgo verdadero (ancestro `position: relative` para que la tabla no escape y su `nowrap` no empuje el `scrollWidth` — clase TASK-742 / ISSUE-015). Quitar el `sr-only` rompe accesibilidad.

---

## Gotchas de GVC que repetidamente nos pegan

- **`fullPage` + sidebar `position:fixed` → ilegible** (el sidebar se repite/encima). Para detalle, **scrollea al selector y captura con `clipSelector`** sobre un `data-capture`:
  ```ts
  { kind: 'scroll', selector: '[data-capture="timeline"]', scrollBlock: 'center' },
  { kind: 'mark', label: 'timeline', clipSelector: '[data-capture="timeline"]' }
  ```
- **`fullPage` + charts → cards vacías.** Ver Regla #2. Distinto síntoma del anterior (aquel sale *ilegible*, éste sale *vacío*) y peor de diagnosticar.
- **Capturó skeleton/login en vez de contenido** → faltó `readiness.absentSelectors` (MuiSkeleton-root, login-card, data-loading).
- **`failureCategory: 'visual_timeout'` en `--env=local` = compilación de Turbopack, no un bug.** `page.goto` corta a 60s; el **primer** hit a una ruta nueva en `pnpm dev` la compila on-demand y puede pasarlo (medido en TASK-1306: **64s la primera vez, 0.1s la segunda**, misma ruta sin cambiar una línea). **Calienta la ruta antes de capturar:**
  ```bash
  curl -s -o /dev/null -w '%{http_code} %{time_total}s\n' 'http://localhost:3000/mi/ruta'
  pnpm fe:capture <scenario> --env=local
  ```
  Es complementario a la readiness DSL: la readiness resuelve el *estado de la UI* una vez que llegó el documento; esto resuelve que el documento llegue dentro del techo de navegación. Si el segundo intento tarda igual, ahí sí es real → secuencia Turbopack canónica de CLAUDE.md antes de `pnpm clean`.
- **Turbopack `Compiling…`** → readiness DSL, no `networkidle`. Si `localhost` queda compilando, sigue la secuencia Turbopack canónica de CLAUDE.md antes de `pnpm clean`.
- **La sesión del GVC expira.** `.auth/storageState.json` caduca y el síntoma engaña: la captura **"funciona"** pero grabó `/login`; en un script propio de Playwright con ese storageState, el síntoma es que **no encuentra los selectores**. Regenerar:
  ```bash
  AGENT_AUTH_EMAIL=agent@greenhouse.efeonce.org node scripts/playwright-auth-setup.mjs
  ```
  ⚠️ El script **EXIGE** `AGENT_AUTH_EMAIL` — **no tiene default** (aborta con `ERROR: AGENT_AUTH_EMAIL is required.`). Para que la expiración falle loud en vez de producir evidencia falsa, declara siempre `assertions: [{ kind: 'noLoginRedirect' }]` + `readiness.absentSelectors: ['[data-testid="login-card"]']`.
- **Auth**: no re-fumbles el setup. GVC resuelve agent-auth en `scripts/frontend/lib/auth.ts`; para ad-hoc, `node scripts/playwright-auth-setup.mjs` genera `.auth/storageState.json` (personas: superadmin / collaborator / client — usa la de menor privilegio que represente el caso).
- **Superficie gateada por organización: la persona tiene que ser DE esa organización.** Una persona cliente genérica no la atraviesa — recibe la card de bloqueo, la captura muere en el marker y el gate reporta BLOCK como si fuera defecto de producto (mismo diagnóstico falso que capturar con sesión de operador). Declara la identidad en el scenario (`requiresStorageState: '.auth/storageState.<persona>.json'`) y emítela con el email correcto:
  ```bash
  AGENT_AUTH_EMAIL=<persona-de-esa-org> AGENT_AUTH_STORAGE_PATH=.auth/storageState.<persona>.json \
    node scripts/playwright-auth-setup.mjs
  ```
  🔴 **Dónde encontrar esa persona:** el mapeo usuario↔organización **NO** está en `greenhouse_core.client_users` (enlaza por `client_id`) ni en `clients`/`organizations` — ninguna expone la FK de la otra. Vive en **`greenhouse_serving.session_360`**, que es donde el runtime mismo lo resuelve (`src/lib/tenant/identity-store.ts`):
  ```sql
  SELECT email, organization_id, tenant_type, active FROM greenhouse_serving.session_360
   WHERE organization_id = '<org>';
  ```
  Buscarlo en las otras tablas cuesta media hora y termina en `column does not exist` (medido, 2026-08-13). Sonda lista: `scripts/growth/_sanity-seo-client-population.ts`.
- **Un `startSelector`/`selector` atado a una copy se rompe cuando la copy mejora.** Un scenario que busca `button:has-text("Descargar informe")` muere con timeout el día que una auditoría manda renombrar ese botón — y el síntoma (captura fallida) no se parece a la causa (cambió un string). **Ata los steps a `[data-capture="…"]`**, que es un contrato explícito, y agrega el marker al componente si no existe. Caso fuente: TASK-1310, el trigger de impresión del informe. Y con `has-text` el riesgo no es sólo que la copy cambie: **matchea por substring** y engancha palabras que se contienen (`"Ver"` → `"Volver"`, TASK-1715) — ver la tabla de Locators.
- **La sonda de teclado reporta un hallazgo sobre un nodo que no es un control** (un centinela de focus trap), o sobre el chrome global de Vuexy → no es defecto de la task: dejaste un diálogo abierto en el último step, o el `startSelector` está mal elegido. Las sondas corren **después** de todos los steps. Ver Regla #4.
- **Un assert que nunca pasa aunque el producto se vea bien** → puede estar atado a una capacidad que el Chromium headless no tiene (`navigator.pdfViewerEnabled === false`, códecs, WebGL). Ver Regla #5.
- **Staging tras SSO**: `pnpm fe:capture ... --env=staging` ya inyecta el bypass; ad-hoc curl/Playwright a `.vercel.app` requiere header `x-vercel-protection-bypass`.
- **Steps mutating** (`fill`/`press`/`click` que dispara Server Action): requieren `mutating: true` + `safeForCapture: true`. **⚠️ Crean entidades reales en staging.** Read-only por default.
- **Labels de `mark`**: `kebab-case`, únicos por scenario (la validación rompe build si duplicas), empezar con `initial-*`.

---

## Cuándo caer a ad-hoc Playwright (y cómo)

El DSL de GVC cubre captura/scroll/interacción/baseline. Cae a Playwright ad-hoc **solo** cuando necesitas console/network/API payloads o una interacción que el DSL no soporta. Reglas:
- Guarda artifacts bajo `.captures/` y **documenta por qué no bastó GVC**.
- Si el flujo es repetible, **promuévelo a scenario** (`scripts/frontend/scenarios/`) — el artefacto durable es el DSL determinístico, no un `.mjs` huérfano.
- Reúsa `lib/auth.ts` + `lib/browser.ts` (auth + lifecycle ya resueltos); no reinventes el setup.

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
