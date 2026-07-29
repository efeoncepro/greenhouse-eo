# ISSUE-128 — Los canaries de navegador de Globe dependían del disco de una persona (CI rojo 9 commits)

## Ambiente

`efeonce-globe` — CI (GitHub Actions, workflow `ci.yml`, step `pnpm check`).

## Detectado

2026-07-29, al pushear el bump de AXIS `0.1.5` a `main` de Globe (TASK-1589 V1.1). El CI falló, y al
revisar el historial se descubrió que **no era una regresión de ese push**: llevaba 9 commits consecutivos
en `failure`.

## Síntoma

`pnpm check` moría con:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module
  '/Users/jreye/Documents/greenhouse-eo/node_modules/@playwright/test/index.mjs'
  imported from .../apps/studio-client/scripts/tailwind-engine-canary.mjs
```

Últimos 10 runs de `ci.yml`: `failure` en `1fd584c`, `11a59fa`, `3e91993`, `494coa0`, `68a2cbe`,
`d009871`, `b9112a8`, `403d346`, `a487d33`. Último verde previo: `5d64c5d`.

En local todo pasaba. El primer rojo es exactamente `1fd584c` — *"ci: wire AXIS package auth and canary"*,
el commit que metió los canaries al CI.

## Causa raíz

Los cuatro canaries de navegador de `apps/studio-client/scripts/` resolvían Playwright con un fallback a
una **ruta absoluta del disco de un desarrollador**:

```js
const { chromium } = await import('playwright').catch(() =>
  import('/Users/jreye/Documents/greenhouse-eo/node_modules/@playwright/test/index.mjs'),
);
```

Y `playwright` **no estaba declarado en ningún `package.json`** de Globe. Consecuencia:

- En esa máquina: `import('playwright')` falla, el fallback resuelve contra el `node_modules` de **otro
  repo**, el canary corre y pasa.
- En cualquier runner: ambos imports fallan y el canary muere antes de abrir un browser.

El origen del acoplamiento está documentado: TASK-1556 decidió que *"el driver de Playwright vive en
Greenhouse porque Playwright vive acá"*. Esa frontera funciona para un script que un humano corre a mano;
**no es ejecutable en CI por construcción.**

Es la reaparición del bug class que `GLOBE_RUNTIME_HANDOFF.md` ya había nombrado el 2026-07-26: *"un falso
verde que sólo miente en la máquina de quien lo escribió"*. Entonces fue un `dist/` que sólo existía en
local; esta vez, un `node_modules` de otro repositorio.

### Segundo fallo, encontrado al correr `pnpm check` completo

Detrás del primero había un **aserto huérfano** independiente:
`apps/creative-runner/src/route-based-model-resolution.test.ts:68` pineaba `PRODUCER_CATALOG_VERSION` en
`1.4.0`, mientras el commit `e3a3ca1` ya lo había subido a `1.5.0`. Ese commit actualizó los asertos de las
rutas nuevas (`nanobanana-2-v1`, `vector-v1`, `upscale-v1`) y se olvidó el de la versión.

Sólo era visible después de arreglar el primero: `pnpm -r test` aborta en el primer paquete que falla.

## Impacto

- **CI de Globe inútil como gate durante 9 commits.** Todo lo mergeado en esa ventana entró sin
  verificación automatizada.
- Los cuatro canaries son los **gates de diseño de ADR-016** (motor de estilos, motion, composer y el
  piloto AXIS). Su razón de existir es morder en CI; no mordieron nunca.
- El `axis-pilot-canary` es la **evidencia del piloto AXIS** que exige
  `AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md`. Ese runbook afirmaba que la evidencia estaba
  automatizada; en la práctica sólo existía en una máquina.
- Ningún impacto en runtime productivo: es un fallo de verificación, no de producto.

## Solución aplicada

Commit `498ffce` en `efeonce-globe`:

1. **`playwright-core@1.59.1` como devDependency** de `apps/studio-client`. A diferencia de `playwright`,
   **nunca descarga browsers**.
2. Los cuatro canaries importan `playwright-core` directo, **sin fallback de ruta**.
3. `chromium.launch({ channel: 'chrome' })` — usa el **Chrome preinstalado del runner** en vez del chromium
   hermético. Es el mismo patrón que Greenhouse ya usa en `playwright.yml`: *"CI uses the system channel to
   avoid downloading Playwright's browser archive before every smoke run"*.
4. El aserto huérfano del catálogo corregido a `1.5.0`.

**La decisión de costo que parecía necesaria se disolvió.** La disyuntiva planteada era «gates reales pero
descargando un browser en cada run» vs «CI rápido con gates que no bloquean». Con `playwright-core` +
`channel: 'chrome'` no hay descarga: los canaries son gate real y el costo adicional de Actions es cero.
Los cuatro sólo usan `goto`, `evaluate`, `getComputedStyle`, `screenshot`, `setViewportSize`,
`waitForSelector` y `emulateMedia` — nada que requiera el chromium hermético.

## Verificación

Local, antes de pushear (`pnpm check` **completo**, que es lo que corre el CI):

```
pnpm check  → exit 0 · 11 paquetes · fail 0 · los tres canaries ejercitándose
pnpm build  → exit 0
grep -rn "/Users/jreye" apps/ scripts/  → sin resultados
```

CI real — run [30499520419](https://github.com/efeoncepro/efeonce-globe/actions/runs/30499520419),
`conclusion: success`, primer verde en 10 commits. Y los canaries **corrieron de verdad**, no se saltearon:

```
23:28:46  apps/studio-client test: ℹ pass 129
23:29:06  apps/studio-client test: composer canary OK
23:29:14  apps/studio-client test: AXIS pilot canary OK
```

Los ~20 s entre el fin de los tests unitarios y el OK del composer canary son el browser real
levantándose. Duración total del job: 4 m 14 s.

## Qué queda abierto

- **Un aserto que pinea una versión y hay que actualizar a mano en cada bump detecta "cambió", no "cambió
  mal".** Es de bajo valor y volverá a quedar huérfano. Vale reemplazarlo por una verificación de forma
  (que las rutas declaradas existan) en vez de un número.
- **Ningún gate impide reintroducir una ruta absoluta.** Un `grep` de `/Users/` o `/home/` en CI lo cerraría
  de forma barata. No se agregó en esta pasada.
- La frontera de TASK-1556 ("el driver de Playwright vive en Greenhouse") sigue vigente para el resto de los
  drivers cross-repo; sólo se corrigió el caso de estos cuatro canaries.

## Referencias

- Commit del fix: `efeonce-globe@498ffce`.
- Bug class previo: `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md` § 2026-07-26.
- Gate del piloto AXIS: `docs/operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md`.
- Task dueña de la evidencia AXIS: `TASK-1589` V1.1.
- Motor de estilos que estos canaries protegen: ADR-016
  (`docs/architecture/creative-studio/EFEONCE_GLOBE_CLIENT_STYLING_ENGINE_DECISION_V1.md`).
