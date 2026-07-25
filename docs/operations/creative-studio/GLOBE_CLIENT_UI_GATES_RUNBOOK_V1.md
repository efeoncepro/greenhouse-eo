# Runbook — Gates de UI del payload cliente de Globe

> **Alcance:** `apps/studio-client` en `efeonce-globe` (ADR-014 / `TASK-1556`). El procedimiento es
> **cross-repo**: los gates corren en Globe, pero el driver de browser vive en Greenhouse porque
> Playwright y Chromium viven acá. Ningún otro runbook cruza esa frontera.
>
> **No aplica** al payload legacy (`producer-ui.ts`, `public-share-ui.ts`, `ui.ts`): son templates de
> string y por eso mismo no se pueden lintear — es la razón por la que ADR-014 existe.

## Los seis gates y qué atrapa cada uno

| Gate | Atrapa | Dónde vive |
|---|---|---|
| Color literal | `#hex`, `rgb()`, `hsl()`, `oklch()` fuera del SSOT | `src/gates/design-contract.test.ts` |
| Motion literal | duraciones y `cubic-bezier()` fuera del SSOT | idem |
| Copy literal | texto en JSX y en `aria-label`/`title`/`placeholder`/`alt` | idem |
| a11y | ARIA inválido, controles sin etiqueta, `onClick` sin teclado | `eslint.config.js` (`jsx-a11y`) |
| Rules of React | hooks condicionales, dependencias faltantes | `eslint.config.js` (`react-hooks`) |
| Smoke de browser | el bundle carga bajo la CSP estricta, hidrata y no tira | `scripts/seam-smoke-server.mjs` + driver en Greenhouse |

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
```

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

Restaurá y confirmá verde. Las seis se verificaron así al crearlas (`TASK-1556` Slice 3).

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
