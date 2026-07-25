# Runbook — Gates de UI del payload cliente de Globe

> **Alcance:** `apps/studio-client` en `efeonce-globe` (ADR-014 / `TASK-1556`). El procedimiento es
> **cross-repo**: los gates corren en Globe, pero el driver de browser vive en Greenhouse porque
> Playwright y Chromium viven acá. Ningún otro runbook cruza esa frontera.
>
> **No aplica** al payload legacy (`producer-ui.ts`, `public-share-ui.ts`, `ui.ts`): son templates de
> string y por eso mismo no se pueden lintear — es la razón por la que ADR-014 existe.

## Los ocho gates y qué atrapa cada uno

| Gate | Atrapa | Dónde vive |
|---|---|---|
| Color literal | `#hex`, `rgb()`, `hsl()`, `oklch()` fuera del SSOT | `src/gates/design-contract.test.ts` |
| Motion literal | duraciones y `cubic-bezier()` fuera del SSOT | idem |
| Copy literal | texto en JSX y en `aria-label`/`title`/`placeholder`/`alt` | idem |
| Tipografía literal | `font-family`/`font-size`/`font-weight`/`line-height`/`letter-spacing` y el shorthand `font:` con valor que no sea `var(--token)` | idem (`TASK-1558`/`TASK-1561`) |
| Peso sin cut cargado | un token `--weight-*` sin `@font-face` — o sea **faux bold**, que renderiza, shippea y pasa todos los demás gates | idem (`TASK-1558`) |
| a11y | ARIA inválido, controles sin etiqueta, `onClick` sin teclado | `eslint.config.js` (`jsx-a11y`) |
| Rules of React | hooks condicionales, dependencias faltantes | `eslint.config.js` (`react-hooks`) |
| Smoke de browser | el bundle carga bajo la CSP estricta, hidrata y no tira | `scripts/seam-smoke-server.mjs` + driver en Greenhouse |
| Canary del share board | 6 estados × 3 anchos, fuga al DOM, overflow por panel, Reintentar fuera de estado, `role=alert` faltante | `scripts/share-board-canary.mjs` + `scripts/frontend/globe-share-board-canary.mjs` (`TASK-1558`) |

**Los tres gates de escaneo caminan `.ts`, `.tsx` y `.css`.** El `.css` entró en `TASK-1558` y no era
teórico: la primera superficie real necesita hojas de estilo, y hasta ese momento el escaneo sólo miraba
TS — o sea que un `.css` era el único lugar donde un hex, una duración o una fuente podían seguir
tipeándose a mano. Un gate que deja de aplicar en cuanto el payload gana su primer `.css` no es un gate.

**Por qué existen los tres primeros:** `producer-ui.ts` acumuló **184 hex crudos con 63 colores únicos**
evadiendo ~30 tokens semánticos. Nadie lo decidió; se acumuló porque nada podía impedirlo.

## Comandos

```bash
# En efeonce-globe
pnpm --filter @efeonce-globe/studio-client lint    # a11y + rules-of-hooks (error, no warning)
pnpm --filter @efeonce-globe/studio-client test    # lint + gates de color/motion/copy + tokens + bundle
pnpm check                                          # incluye lo anterior vía pnpm -r test

# Smoke de browser (dos terminales, cross-repo)
pnpm --filter @efeonce-globe/studio-client seam:smoke        # en efeonce-globe
node scripts/frontend/globe-client-seam-gate.mjs             # en greenhouse-eo

# Canary del share board (dos terminales, cross-repo) — TASK-1558
pnpm --filter @efeonce-globe/studio-client build             # en efeonce-globe
node apps/studio-client/scripts/share-board-canary.mjs       # en efeonce-globe
node scripts/frontend/globe-share-board-canary.mjs           # en greenhouse-eo
```

El canary del share board escribe capturas y `canary-report.json` en `.captures/globe-share-board/`
(gitignored). Dos detalles de método que no son opcionales:

- mide el `scrollWidth` **de los paneles**, no sólo del documento. Un contenedor con
  `overflow-y: auto` recibe `overflow-x: auto` gratis, así que el desborde scrollea adentro y el
  documento nunca se ensancha — que es cómo este producto shippeó overflow horizontal dos veces con el
  assert en verde;
- mide a **320px**, el piso de WCAG 1.4.10. La pasada a 390 no vio nada y la de 320 encontró que el chip
  "Sólo lectura" decidía el ancho de la página.

## Verificar que un gate MUERDE

Un gate que pasa no prueba nada. Antes de confiar en uno, rompelo a propósito y confirmá el rojo:

| Violación a introducir | Gate que debe fallar |
|---|---|
| `style={{ color: '#ff0000' }}` en un componente | color literal |
| `style={{ transition: 'opacity 240ms' }}` | motion literal |
| `<h1>Texto suelto</h1>` en vez de `{copy.heading}` | copy literal |
| `aria-label="Registrar"` literal | copy literal |
| `<div onClick={…}>` sin handler de teclado | `jsx-a11y` |
| `useState()` dentro de un `if` | `react-hooks` |
| `font-family:Poppins,sans-serif` en un template de estilo | tipografía |
| `font-size:0.9rem` (rem pelado, fuera de la escala) | tipografía |
| Agregar `'--weight-medium': '500'` al SSOT | peso sin `@font-face` |

Restaurá y confirmá verde. Las seis primeras se verificaron así al crearlas (`TASK-1556` Slice 3).

### Evidencia de la mordida — 2026-07-25 (`TASK-1561`)

Las tres reglas de tipografía nacieron en el trabajo de `TASK-1558` y se ejercitaron el 2026-07-25
sobre una **copia aislada** del árbol (la sesión dueña tenía el paquete abierto; morder el árbol vivo
le habría dejado el build en rojo a otra persona sin aviso).

Seis mordidas, y en cada una **exactamente una regla en rojo y las otras cuatro en verde**:

| Mordida | Regla que enrojeció | Colaterales |
|---|---|---|
| `color: '#ff0000'` | color literal | ninguna |
| `transition: 'opacity 250ms linear'` | motion literal | ninguna |
| `font-family:Poppins,sans-serif` | tipografía | ninguna |
| `font-size:0.9rem` | tipografía | ninguna |
| `<button aria-label="Cerrar">Guardar cambios</button>` | copy literal | ninguna |
| `'--weight-medium': '500'` en el SSOT | peso sin `@font-face` | ninguna |

Restaurar devolvió las cinco a verde.

**Por qué importa la columna "colaterales":** un gate falla de dos maneras, no de una. Puede ser
**inerte** —no atrapa lo que promete— o **sobre-amplio**, y ésa es la peor: enrojece código correcto,
alguien lo comenta para avanzar, y el gate deja de existir sin que nadie lo apague. Cero colaterales
en las seis descarta las dos a la vez. Un "pasa/no pasa" sin esa columna sólo descarta la primera.

**Y es la forma exacta en que este mismo programa se equivocó antes**, dos veces: el plugin de React
Compiler typechequeaba, buildeaba y **no corría** (lo delató comparar dos bundles, no leer el
marcador); y la primera versión de la regla de tipografía usaba un lookahead negativo `:\s*(?!var\()`
cuyo `\s*` retrocedía a ancho cero, así que inspeccionaba `" var("` en vez de `"var("` y reportaba
**toda línea correctamente tokenizada**. Una regla que enrojece código compliant se apaga sola.

## `LEGACY_TOKEN_DRIFT` — registrado, NO resuelto

`src/tokens/tokens.ts` declara el canónico **y** lo que cada superficie legacy tiene hoy. El drift más
serio: **el anillo de foco es de distinto color según la superficie** — ámbar en `launch`/`studio`/`error`,
azul en `producer`. Un usuario de teclado no debería reaprender cómo se ve "enfocado" al cambiar de pantalla.

**NUNCA** unifiques un valor del ledger por decreto: adoptarlo es **cambio visible** y pertenece al slice
de port de esa superficie, con alguien mirando el resultado. Una entrada desaparece cuando su superficie
porta; cuando el ledger queda vacío, la migración terminó.

## Reglas duras

- **NUNCA** corras el dev server de Vite con `--host` / `server.host`. 13 de los 19 advisories históricos
  de Vite son bypasses de `server.fs.deny` o lectura arbitraria del dev server, y **todos** exigen que sea
  alcanzable por red. `vite.config.ts` lo ata a `127.0.0.1`.
- **NUNCA** confíes en que una config de build corre porque el build pasa. La primera config del React
  Compiler anidaba las opciones bajo una clave inexistente: typechequeaba, buildeaba y **no corría**. Se
  detectó comparando bundles con y sin el preset, no leyendo un marcador.
- **NUNCA** agregues un `*.test.ts` sin registrarlo en el script `test` de su package: los scripts de Globe
  **enumeran los archivos a mano**, así que uno no registrado nunca corre y la suite queda verde por no
  haberlo mirado.
- El typecheck de `studio-client` corre **dos** tsconfig (browser y Node). `tsc -p tsconfig.json` solo no
  ve los tests: usá `pnpm --filter @efeonce-globe/studio-client typecheck`.
