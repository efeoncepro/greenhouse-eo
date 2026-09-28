# AXIS Private Package Consumption Runbook V1

## Purpose

This runbook describes how Greenhouse, Globe and future Efeonce products consume the
private AXIS packages without coupling runtimes or placing personal credentials in
source control.

## Current state — 2026-09-14

> **Actualizado 2026-09-28 (noche) — estado vigente:** Greenhouse fija `axis-tokens` `0.3.24` y `axis-ui-contracts`
> `0.3.22` (tag `v0.3.24` de AXIS, commit `5b3056f`: `glitchLine.editions` y contrato `efeonce.glitch-line` 0.2.0, el
> Glitch Flash), `axis-brand-assets` `0.3.5`, `axis-graphic-line` `0.7.0` y `axis-ui-registry` `0.3.1`. Instalado con
> credencial efímera (`gh auth token` en un userconfig temporal fuera del repo, borrado al terminar), autorizada por el
> operador para esta instalación. Gates: test del paquete Glitch, 102 tests del dominio, `composer:visual-gate
> --catalog=glitch` 26/26 a 0 px, lint 0 errores, typecheck 0. Ver **Delta 2026-09-28 (g)**: ese bump dejó el CI
> rojo por no recompilar los tokens de La órbita, y la regla de todo bump quedó ahí. La nota siguiente queda como historia.

> **Actualizado 2026-09-28 — superado por la nota de arriba:** Greenhouse fijaba `axis-tokens` `0.3.21` y `axis-ui-contracts` `0.3.19`
> (tag `v0.3.21` de AXIS, TASK-1928), `axis-brand-assets` `0.3.5`, `axis-graphic-line` `0.7.0` y `axis-ui-registry`
> `0.3.1`. Versiones leídas en `package.json` y en `node_modules`; el bump está en `origin/develop` (commit `88ce23831`).
> Ver **Delta 2026-09-28 (f)**; las notas siguientes quedan como historia.

> **Actualizado 2026-09-27 (cierre del día) — superado por la nota de arriba:** Greenhouse fijaba `axis-tokens` `0.3.14` y
> `axis-ui-contracts` `0.3.12` (tag `v0.3.14` de AXIS, TASK-1927), `axis-brand-assets` `0.3.5` y `axis-graphic-line`
> `0.7.0` (tag `v0.3.12`, TASK-1922) y `axis-ui-registry` `0.3.1`. Versiones leídas en `package.json` y en
> `node_modules`. El bump a `0.3.14` / `0.3.12` está en `develop` **local**; el push está pendiente. Ver
> **Delta 2026-09-27 (e)**; las notas siguientes quedan como historia.

> **Actualizado 2026-09-27 (noche) — superado por la nota de arriba:** el tag `v0.3.12` de AXIS (Glitch, TASK-1922)
> publicó `axis-tokens` `0.3.12`, `axis-ui-contracts` `0.3.10`, `axis-brand-assets` `0.3.5` y `axis-graphic-line`
> `0.7.0`, con `axis-ui-registry` `0.3.1`. Greenhouse fijó esas cinco versiones en el commit `4dfb147f7` de `develop`;
> `axis-tokens` y `axis-ui-contracts` subieron después. Ver **Delta 2026-09-27 (d)**.

> **Actualizado 2026-09-27 (tarde):** lo último publicado es `axis-tokens` `0.3.10` (tag `v0.3.10`), con
> `axis-ui-contracts` `0.3.8`, `axis-ui-registry` `0.3.1`, `axis-brand-assets` `0.3.4` y `axis-graphic-line` `0.6.0`
> (versiones leídas en GitHub Packages). Greenhouse fija `axis-tokens` `0.3.8`, `axis-ui-contracts` `0.3.7`,
> `axis-brand-assets` `0.3.4`, `axis-graphic-line` `0.6.0` y `axis-ui-registry` `0.3.1` (commits `016d0a183` y
> `f9bc73bb4`, los dos en `origin/develop`). Ver **Delta 2026-09-27 (c)**, con el impacto de subir a `0.3.10`; los
> párrafos siguientes quedan como historia.

> **Actualizado 2026-09-27:** publicados y **fijados en Greenhouse** `axis-tokens` `0.3.8` y `axis-ui-contracts`
> `0.3.7` (tag `v0.3.8`), `axis-brand-assets` `0.3.3` y `axis-graphic-line` `0.5.0` (tag `v0.5.0`), con
> `axis-ui-registry` `0.3.1`. Greenhouse **ya depende de `axis-graphic-line`** (mapper `src/lib/brand-surfaces`,
> TASK-1919). Ver **Delta 2026-09-27 (b)**; el párrafo siguiente queda como historia.

> **Actualizado 2026-09-26 (noche):** hay **cinco** paquetes privados. Publicados (tag `v0.3.6` del repo AXIS):
> `axis-tokens` `0.3.6`, `axis-ui-contracts` `0.3.5`, `axis-ui-registry` y `axis-brand-assets` `0.3.1`, y
> `axis-graphic-line` `0.4.0` (con el subpath nuevo `/icons`). Greenhouse fija en `develop` `axis-tokens` y
> `axis-ui-contracts` en `0.3.5` y `axis-ui-registry` y `axis-brand-assets` en `0.3.1`; no depende de
> `axis-graphic-line`. Ver **Delta 2026-09-26 (d)**, **(c)** y **(b)**; la lista de abajo conserva el estado del 14.

- Package repository: `efeoncepro/axis-design-system`.
- Agent-facing visual guide: [`DESIGN.md`](https://github.com/efeoncepro/axis-design-system/blob/main/DESIGN.md), generated from `packages/tokens` and checked with `pnpm design:check` in the AXIS repository. It is a projection for agents, not a second token source of truth.
- Lab runtime: `apps/lab` is Astro `7.1.6`, `output: 'static'`, public Vercel delivery, and builds to
  `apps/lab/dist`; its HTML reference consumes AXIS registry/tokens and does not import Greenhouse/Globe adapters.
- Private packages published at version `0.2.5` (the three packages converge on this version for the
  advertising composition release; they remain independently versioned):
  - `@efeoncepro/axis-tokens`
  - `@efeoncepro/axis-ui-contracts`
  - `@efeoncepro/axis-ui-registry`
- Lab: `https://axis-design-system-lab.vercel.app`.
- Greenhouse and Globe consume the packages in opt-in AXIS adapter fixtures under `TASK-1591`.
- Product promotion remains gated separately from the pilot.
- GitHub Actions read access is configured for `efeoncepro/greenhouse-eo` and
  `efeoncepro/efeonce-globe` on all three packages.
- Vercel `NPM_RC` on `axis-design-system-lab`: **retired 2026-07-29**. The Lab consumes AXIS through
  `workspace:*` links, so its build never authenticates against the registry — the variable had no
  consumer. Proven by installing and building with no credential at all. See the Delta below.
- GCP Secret Manager secret `axis-packages-read-token` now lives in `efeonce-group` and is the
  production build source for Greenhouse and Globe. The two Cloud Build service accounts have
  secret-level `roles/secretmanager.secretAccessor` on that secret only.
- ⚠️ **Superseded — la credencial de esta línea ya venció y provocó un incidente.** El PAT
  `read:packages` del operador publicado como **versión 1** (creada 2026-07-29T23:47:59) expiró el
  **2026-08-28** y dejó rotos los builds de Cloud Build. La credencial vigente es la **versión 2**
  (2026-08-29T13:44:17); la versión 1 quedó `disabled`. Ver **Delta 2026-08-29** más abajo: es el
  caso fuente y contiene el procedimiento de rotación.
- Sigue siendo el camino interino aprobado —un PAT del operador, **no** una cuenta GitHub de
  máquina—. Crear esa cuenta antes del rollout externo/cliente y rotar la versión de Secret Manager
  sin cambiar el contrato del consumidor.
- El PAT legacy que usaba el antiguo camino de Cloud Build de Globe fue revocado después de la
  verificación productiva; no confundir las dos credenciales.
- Local private-package installation for the TASK-1591 canary was verified with a temporary
  developer credential. CI/Cloud Build wiring is now implemented: GitHub Actions uses its scoped
  `GITHUB_TOKEN`, while Cloud Build reads `axis-packages-read-token` and mounts an ephemeral
  BuildKit secret for `pnpm install`.
- Cloud Build ejecutó el contrato **en real** el 2026-07-29 y 2026-07-30: los cuatro worker deploys
  de Greenhouse corrieron verdes contra `0.1.5`; el release productivo `30502476429` terminó en
  `success` sobre `41fa94846d0ca18a0f83529dc90cdc2da15a632d`, con health check productivo verde.
- El secreto legacy de `efeonce-globe` fue deshabilitado y eliminado después de verificar el release;
  el secreto activo es únicamente `projects/efeonce-group/secrets/axis-packages-read-token`.
- ✅ The Globe AXIS browser/accessibility/reduced-motion evidence is automated by
  `apps/studio-client/scripts/axis-pilot-canary.test.mjs` **y desde el 2026-07-29 corre en el CI de Globe**.
  Hasta entonces no corría: resolvía Playwright con un fallback a una ruta absoluta del disco de un
  desarrollador y moría con `ERR_MODULE_NOT_FOUND` en cualquier runner, dejando el CI de Globe rojo 9
  commits (`ISSUE-128`, resuelto en `efeonce-globe@498ffce` con `playwright-core` + `channel: 'chrome'`,
  sin descargar browsers). Evidencia: run `30499520419` `success` con `AXIS pilot canary OK` en el log.
  La evidencia del piloto pasa de **local** a **CI**.
- El rollback interno de `globe-studio-internal` y `globe-api-internal` fue ejercitado al 100%, verificado y
  restaurado correctamente durante la promoción productiva.

## Delta 2026-09-28 (g) — `v0.3.24` publicado y fijado: Glitch Flash; todo bump recompila los dos juegos de tokens

- **Publicado** el 2026-09-28 en el tag `v0.3.24` de AXIS (commit `5b3056f` en `main`, push autorizado por el
  operador; CI y «Release UI packages» en verde): `axis-tokens` `0.3.24` (`glitchLine.editions`: `weekly` y `flash`, más
  seis piezas `flash-*`) y `axis-ui-contracts` `0.3.22` (contrato `efeonce.glitch-line` 0.2.0, que acepta el Flash sin
  número; un intent 0.1.0 resuelve igual). `axis-ui-contracts` `0.3.22` depende de `axis-tokens` `0.3.24` exacto; el
  resto del set no cambia (`axis-brand-assets` `0.3.5`, `axis-graphic-line` `0.7.0`, `axis-ui-registry` `0.3.1`).
- **Fijado en Greenhouse** en `53002b352` (instalación con la credencial efímera del Delta (e), autorizada por el
  operador), con el test `src/config/axis-glitch-line-package.test.ts` (contrato 0.2.0, un Flash válido y uno rechazado).
- **El CI de `53002b352` falló:** `scripts/brand-surfaces/__tests__/graphic-line-tokens-sync.test.ts` (4 tests). El bump
  corrió `pnpm glitch:tokens`, pero no `pnpm brand:tokens`: los tokens de La órbita del Composer
  (`graphic-line-{deck,stills,overlays}/graphic-line-tokens.css` y `graphic-line-shared/graphic-line-tokens.json`) llevan
  el sello de la versión instalada de `axis-tokens` y quedaron atrasados aunque ningún valor cambió. Arreglo: `609353e83`
  (sólo el sello de versión).
- **Regla (reemplaza a la de «Después de cada bump» del Delta (f)):** todo bump de `@efeoncepro/axis-tokens` corre
  `pnpm brand:tokens` **y** `pnpm glitch:tokens`, después `pnpm brand:tokens --check` y `pnpm glitch:tokens --check`, y
  recién entonces se commitea. No importa qué parte del token cambió: los dos juegos compilados llevan el sello de versión.
- **Lección de permisos (sesiones de Claude Code):** los gates de AXIS se corren como comandos sueltos,
  `pnpm -C /Users/jreye/Documents/axis-design-system <script>` y `git -C /Users/jreye/Documents/axis-design-system <cmd>`.
  Un comando compuesto con `cd` y logs redirigidos a `/tmp` fue bloqueado por el clasificador de permisos en este
  release; los gates y el push los terminó Codex.
- **Consumo:** el Artifact Composer compone el Glitch Flash desde `24e4c72ee` (seis plantillas `flash-*`,
  `pnpm glitch:compose -- --manifest <flash.json>`; gate `--catalog=glitch` 32/32 a 0 px). Pendiente: la ruta productiva
  (TASK-1921) todavía planifica sólo la edición semanal, y tres medidas de la estela de bytes (ancho grande 150 px,
  separación compacta 8 px, separación del banner 10 px) siguen como medidas del canvas en `glitch.css` hasta que AXIS
  las tome en el token.

## Delta 2026-09-28 (f) — `v0.3.15` a `v0.3.21` publicados; Greenhouse fija `0.3.21` / `0.3.19` (TASK-1928)

- **Publicado** entre el 2026-09-27 y el 2026-09-28 en siete tags de `main` de AXIS, todos hechos por TASK-1928 (las
  plantillas de las recetas del deck que faltaban). Cada tag sube sólo `axis-tokens` y `axis-ui-contracts`;
  `axis-ui-registry` sigue en `0.3.1`, `axis-brand-assets` en `0.3.5` y `axis-graphic-line` en `0.7.0`. Todos son
  cambios aditivos de `efeonce.surface-composition` 0.1.2 (deltas (f)…(l) del ADR `SURFACE_COMPOSITION_DECISION_V1.md`
  de AXIS):

  | Tag | `axis-tokens` | `axis-ui-contracts` | Qué trae | Commit que lo fija en Greenhouse |
  | --- | --- | --- | --- | --- |
  | `v0.3.15` | `0.3.15` | `0.3.13` | Delta (f): la propuesta de servicio sobria (`proposal-service`) | `ab23fdd90` |
  | `v0.3.16` | `0.3.16` | `0.3.14` | Delta (g): la familia método | `2c7c67c5d` |
  | `v0.3.17` | `0.3.17` | `0.3.15` | Delta (h): cotización, próximos pasos y respiro | `39b9c7006` |
  | `v0.3.18` | `0.3.18` | `0.3.16` | Delta (i): la familia prueba | `82964f2b4` |
  | `v0.3.19` | `0.3.19` | `0.3.17` | Delta (j): secciones y quiénes somos (`section-cine` gana `about` y `purpose`) | `3def01768` |
  | `v0.3.20` | `0.3.20` | `0.3.18` | Delta (k): contenido y día a día (`content-day` gana `tools`, `live-progress` y `live-results`) | `c3c290e16` |
  | `v0.3.21` | `0.3.21` | `0.3.19` | Delta (l): `cover-brochure` gana la composición `document-selection` (la portada con la selección de Nexa) | `88ce23831` |

  Cambios de contrato de la serie: una composición puede declarar `progress: false`; `voice.maxWords` por receta;
  pasos sin íconos (`steps.icons: false`) y con mínimo (`steps.min`); colores por nombre de paleta. Los valores se
  leen del token; este runbook no los copia.
- **Serie completa consumida por TASK-1927 y TASK-1928:** `v0.3.11`, `v0.3.13` y `v0.3.14` (TASK-1927, Delta (e)),
  `v0.3.12` (TASK-1922, Glitch, Delta (d)) y `v0.3.15` a `v0.3.21` (este delta).
- **Transitivos** (leídos en `node_modules` el 2026-09-28): `axis-ui-contracts` `0.3.19` depende de `axis-tokens`
  `0.3.21` exacto. `axis-graphic-line` `0.7.0` sigue dependiendo de `axis-tokens` `0.3.12` y `axis-ui-contracts`
  `0.3.10`, y `axis-ui-registry` `0.3.1` de `axis-ui-contracts` `0.3.5`: el lockfile instala esas versiones sólo para
  esos transitivos.
- **Instalación local:** el patrón del Delta (e), sin cambios: `.npmrc` temporal con `${NODE_AUTH_TOKEN}` y
  `NODE_AUTH_TOKEN="$(gh auth token)"` dentro de un subshell; el token no se imprime, no se guarda y nunca va a CI,
  Cloud Build ni Secret Manager. El install de un bump va sin `--frozen-lockfile` (el lockfile cambia).
- **Probar antes de publicar:** el overlay local del Delta (e) — copiar `packages/tokens/dist` del checkout de AXIS sobre
  `node_modules/@efeoncepro/axis-tokens/dist`, componer y correr el gate, y reinstalar el paquete publicado al
  terminar. La copia es temporal: nunca se commitea ni reemplaza la versión fijada.
- **Después de cada bump:** `pnpm brand:tokens` y `pnpm brand:tokens --check` (catálogos de La órbita); `pnpm glitch:tokens`
  cuando el bump toca el token `glitchLine` (catálogo de Glitch). Luego los tests del mapper y
  `pnpm composer:visual-gate --catalog=graphic-line`.
- **Evidencia:** `pnpm composer:visual-gate --catalog=graphic-line`: 66 frames a 0 px; `--catalog=glitch`: 26 a 0 px;
  `pnpm test` completo y `pnpm build` verdes al cierre de TASK-1928; todo en `origin/develop`.
- **Consumo:** las 69 recetas del deck componen con `pnpm brand:compose`. Spec técnica:
  [`GREENHOUSE_BRAND_SURFACE_COMPOSITION_V1.md`](../architecture/GREENHOUSE_BRAND_SURFACE_COMPOSITION_V1.md). Pendiente:
  la ruta productiva (TASK-1921, en curso).

## Delta 2026-09-27 (e) — `v0.3.11`, `v0.3.13` y `v0.3.14` publicados; Greenhouse fija `0.3.14` / `0.3.12` (TASK-1927)

- **Publicado** el 2026-09-27 en tres tags de `main` de AXIS, todos hechos por TASK-1927. Cada uno sube sólo
  `axis-tokens` y `axis-ui-contracts`; `axis-ui-registry` sigue en `0.3.1`, `axis-brand-assets` en `0.3.5` y
  `axis-graphic-line` en `0.7.0`:

  | Tag | `axis-tokens` | `axis-ui-contracts` | Qué trae |
  | --- | --- | --- | --- |
  | `v0.3.11` | `0.3.11` | `0.3.9` | Deltas (b) y (c) de `efeonce.surface-composition` 0.1.2 |
  | `v0.3.13` | `0.3.13` | `0.3.11` | Delta (e): los tokens del marco (portadas y contraportadas) |
  | `v0.3.14` | `0.3.14` | `0.3.12` | Tipografía completa de las contraportadas: interlineado y tracking de la voz en `close-brochure`; interlineado del eslogan en las dos |

  El tag `v0.3.12`, que queda en medio, es de TASK-1922 (Glitch): ver Delta 2026-09-27 (d).
- **Tokens del delta (e)** (`v0.3.13`), todos bajo `efeonceGraphicLine.surfaces.deck.recipes.<receta>`: `column.top`,
  `column.body`, `column.closeOffsetsPx`, `axis` (el eje del amanecer), `orbitPaint` (`giant` y `rising`),
  `contact.style`, `clientLogo.box`, y en `section-split` `progress.startFromTopDeg` y `progress.sweep`. Los valores se
  leen del token; este runbook no los copia.
- **Por qué `axis-ui-contracts` se republica sin cambio de código:** las versiones `0.3.11` y `0.3.12` no cambian de
  código. El paquete fija la versión **exacta** de `axis-tokens` y los manifests se resuelven sobre esos tokens, así
  que un token nuevo sólo llega al resolver del consumidor con una versión de contratos que lo fije. Es la misma regla
  de transitivos del Delta 2026-09-27 (c).
- **Transitivos** (leídos en `node_modules`): `axis-ui-contracts` `0.3.12` depende de `axis-tokens` `0.3.14`.
  `axis-graphic-line` `0.7.0` sigue dependiendo de `axis-tokens` `0.3.12` y `axis-ui-contracts` `0.3.10`: Greenhouse
  instala esas versiones para ese transitivo y las fijadas para su propio código.
- **Greenhouse lo fija** (2026-09-27, TASK-1927, `develop` local; push pendiente): `axis-tokens` `0.3.14` y
  `axis-ui-contracts` `0.3.12`. Los otros tres paquetes no cambian. El contrato `efeonce.surface-composition` queda en
  `0.1.2` con sus deltas (b), (c) y (e); un intent `0.1.0` o `0.1.1` resuelve igual.
- **Evidencia:** `pnpm composer:visual-gate --catalog=graphic-line`: 32 frames a 0 px, con las altas y cambios
  declarados en `scripts/frontend/baselines/artifact-composer/BASELINE_DELTAS.md` (entradas 2026-09-27 (b), (c), (d) y
  (e)); `pnpm test` completo: 1.851 archivos en verde, 64 omitidos, 0 fallos; `pnpm build`: salida 0. Falta leer el
  veredicto de CI del SHA cuando se empuje.
- **Instalación local con credencial efímera:** el mismo patrón del Delta 2026-09-26 (b), con el token del `gh` CLI
  del operador en vez de uno pegado a mano. El operador lo autorizó **para esta task y sólo para instalar en su
  equipo**. El token se lee dentro del comando: no se imprime, no se guarda en un archivo y no queda en el historial.

  ```bash
  # En un subshell: al salir se borran el archivo y la variable.
  (
    npmrc="$(mktemp)"; trap 'rm -f "$npmrc"' EXIT
    printf '%s\n' '@efeoncepro:registry=https://npm.pkg.github.com' '//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}' > "$npmrc"
    NODE_AUTH_TOKEN="$(gh auth token)" NPM_CONFIG_USERCONFIG="$npmrc" pnpm install
  )
  ```

  El archivo temporal guarda el nombre de la variable, no el token. Al subir versiones el lockfile cambia, así que el
  install del bump va sin `--frozen-lockfile`; para reinstalar sin cambios se usa `pnpm install --frozen-lockfile`.
  Esto **no** relaja la regla dura del Delta 2026-08-29: el token de una sesión `gh` tiene más alcance que
  `read:packages` y nunca va a CI, Cloud Build ni Secret Manager. Una task nueva pide su propia autorización.
- **Lección — validar al consumidor contra el build local de AXIS antes de publicar:** antes de publicar tokens nuevos,
  se copia `packages/tokens/dist` del checkout de AXIS sobre `node_modules/@efeoncepro/axis-tokens/dist` de
  Greenhouse, se componen las piezas y se corre el gate visual; después se reinstala para volver al paquete publicado.
  Así TASK-1927 evitó una cuarta versión. La copia es temporal: nunca se commitea ni reemplaza la versión fijada.
- **Consumo:** `pnpm brand:compose` compone las recetas del deck con plantilla en el catálogo `graphic-line-deck` y,
  si el intent trae `pages`, un documento completo (brochure o propuesta) en un PDF. Uso:
  [manual](../manual-de-uso/creative/componer-por-superficie-con-axis.md). Pendiente: la ruta productiva (TASK-1921)
  y las 38 recetas restantes del deck (TASK-1928).

## Delta 2026-09-27 (d) — `v0.3.12` publicado y fijado: Glitch en AXIS (TASK-1922)

- **Publicado** el 2026-09-27 con el tag `v0.3.12` sobre el commit `29a40b5` de `main` de AXIS (push
  `47acc3d..29a40b5` y tag autorizados por el operador, Julio Reyes, ese día; CI run `36352781574` `success`;
  `release-packages.yml` run `36352864790` `success`). Sube cuatro paquetes; `axis-ui-registry` sigue en `0.3.1`:
  - `axis-tokens` `0.3.12`: token **`glitchLine`** (export de primer nivel, nunca rama de `efeonceGraphicLine`; estado
    `candidate`): color, tipo, cabecera, bytes, manzana, firma, íconos, formatos, zonas seguras, motion, piezas con
    estado y rotación de portada.
  - `axis-ui-contracts` `0.3.10`: contrato **`efeonce.glitch-line`** 0.1.0 `candidate` (`validateGlitchLineIntent`,
    `resolveGlitchLineIntent`, manifiesto `axis.glitch-line-composition.v1`, 23 códigos de issue estables; falla
    cerrado).
  - `axis-brand-assets` `0.3.5`: **`AXIS_GLITCH_ASSETS`** (`glitch-logo-positive`, `glitch-logo-negative`,
    `glitch-apple`), sellado aparte de `AXIS_BRAND_ASSETS`.
  - `axis-graphic-line` `0.7.0`: los 5 glifos Plastilina de Glitch (guardar, compartir, recomendar, comentar,
    deslizar) entran a `PLASTILINA_GLYPHS` (decisión D27): 36 Trazo + 48 Plastilina = 84, con 48 volúmenes.
- **Tramo intermedio del mismo día** (sin delta propio): el tag `v0.3.11` publicó `axis-tokens` `0.3.11` y
  `axis-ui-contracts` `0.3.9` (`efeonce.surface-composition` 0.1.2); Greenhouse lo fijó en el commit `0d8a2b025`
  (TASK-1927 Slice 1), que además sumó el rol `info` a `COMPATIBILITY_ROLES` del drift test.
- **Greenhouse lo fija** (commit `4dfb147f7` de `develop`, 2026-09-27): `axis-tokens` `0.3.12`, `axis-ui-contracts`
  `0.3.10`, `axis-brand-assets` `0.3.5`, `axis-graphic-line` `0.7.0` y `axis-ui-registry` `0.3.1`. Los tokens
  compilados de los catálogos `graphic-line-*` sólo cambian la versión de origen (`pnpm brand:tokens`).
- **Evidencia:** `pnpm typecheck` verde; test focal `src/config/axis-glitch-line-package.test.ts` (token, contrato y
  activos aislados de la familia); brand-surfaces + catálogos + drift 106/106; `pnpm composer:visual-gate
  --catalog=graphic-line`: los 24 frames del baseline a 0 px (idénticos por sha256).
- **Instalación local:** con un `NPM_CONFIG_USERCONFIG` efímero fuera del repo y el token del `gh` CLI del operador;
  el token **nunca** se escribió en un archivo del repo.
- **Consumo:** fuera del test focal, Greenhouse todavía no lee `glitchLine`. Los catálogos del Composer lo consumen en TASK-1923 y
  el taller (`efeonce-brand-workshop`, `tools/glitch-motion`) deja su espejo de paleta y manzana en TASK-1924.

## Delta 2026-09-27 (c) — `axis-tokens` 0.3.10 (tag `v0.3.10`): `color.info` y motion sin valores dobles; Greenhouse no lo fija

- **Publicado** el 2026-09-27 (14:03Z) con el tag anotado `v0.3.10` (commit `aa1a638` de `main` de AXIS; workflow
  `release-packages.yml`, run `36324516573`, `success`). Sólo sube `axis-tokens`; `axis-ui-contracts` `0.3.8`,
  `axis-ui-registry` `0.3.1`, `axis-brand-assets` `0.3.4` y `axis-graphic-line` `0.6.0` ya estaban en el registry y el
  run los saltó. Qué trae (commit `0a6da3b`):
  - `efeonceTokens.color.info` = `axisSemanticHex.info` (`#1f6fd4`), emitido como `--efeonce-color-info`. **La forma
    de `efeonceTokens.color` crece.**
  - `efeonceTokens.motion` pasa a ser alias de `axisMotion.duration`: `fast` 150ms, `standard` **200ms** y `slow`
    300ms. Antes el TS decía 220ms para `standard`; `tokens.css` ya decía 200ms porque la propiedad se emitía dos veces
    y ganaba la segunda. Ahora `emit-css.mjs` emite cada propiedad una sola vez y falla el build si recibe dos valores
    distintos.
- **Nombres CSS que no existen** (los usaba el Lab; corregidos en `ed97c0b` y `0a6da3b`): la escala de espaciado
  publicada es sólo `--efeonce-spacing-1|2|3|4|6|8` (0.25/0.5/0.75/1/1.5/2rem), sin `-5` ni `-7`; el rol de error es
  `--efeonce-color-danger` (no `--efeonce-color-error`), el borde es `--efeonce-color-border` (no `-border-strong`) y
  no hay `--efeonce-shadow-*`: `tokens.css` no publica sombras, la elevación va por los roles `axisElevation`. Un
  `var()` a un token inexistente no avisa: la declaración entera resuelve a su valor inicial, y en un shorthand se
  pierde también el valor válido. En AXIS lo vigila ahora `apps/lab/src/test/unit/design-tokens.test.ts` (falla con
  archivo:línea si una hoja del Lab usa un `var(--efeonce-*)` sin fallback que no existe); **ese gate cubre sólo el
  Lab**, no a los consumidores.
- **Tramos intermedios del mismo día** (sin delta propio): tag `v0.6.0` (commit `cf77452`) publicó
  `axis-graphic-line` `0.6.0` y `axis-brand-assets` `0.3.4`; tag `v0.3.9` (commit `ff0505a`) publicó `axis-tokens`
  `0.3.9` y `axis-ui-contracts` `0.3.8` con `efeonce.surface-composition` 0.1.2 (su adopción es TASK-1927).
- **Transitivos:** los paquetes declaran `axis-tokens` como `workspace:*`, y el publish lo fija a la versión exacta del
  momento. `axis-ui-contracts` `0.3.8` depende de `axis-tokens` `0.3.9`; `axis-graphic-line` `0.6.0`, de `axis-tokens`
  `0.3.8` y `axis-ui-contracts` `0.3.7` (se publicó antes que `0.3.9`; verificado en el registry y en el lockfile de
  Greenhouse). Ningún paquete publicado depende todavía de `axis-tokens` `0.3.10`: quien lo fije directo instala además
  la versión exacta que pida cada transitivo.
- **Greenhouse no lo fija** (`package.json` verificado el 2026-09-27; sin cambios de código). Impacto al subir
  `axis-tokens` a `0.3.10` o más:
  - `src/@core/theme/axis-package-drift.test.ts` exige que `Object.keys(efeonceTokens.color)` sea **exactamente** los
    roles de `COMPATIBILITY_ROLES` más los neutrales. Con `info`, falla: es el gate haciendo su trabajo (descubre roles
    nuevos en vez de listarlos). El bump agrega `info: axisSemanticHex.info` a `COMPATIBILITY_ROLES` en el mismo
    commit.
  - El test de motion sólo compara claves (`fast`, `slow`, `standard`), que no cambian. Ningún código de Greenhouse
    lee `efeonceTokens.motion` como valor (`rg`, 2026-09-27; el otro consumidor de `efeonceTokens`,
    `scripts/auth-server/styles.ts`, sólo lee `radius`).
  - Greenhouse no importa `tokens.css` ni usa ningún `var(--efeonce-*)` de AXIS (`rg`, 2026-09-27): los nombres
    inexistentes del Lab no le afectan.

## Delta 2026-09-27 (b) — `v0.3.8` publicado y fijado: `efeonce.surface-composition` 0.1.1 (TASK-1919)

- **Publicado** con el tag `v0.3.8`: `axis-tokens` `0.3.8` y `axis-ui-contracts` `0.3.7`. El contrato
  `efeonce.surface-composition` pasa a `0.1.1` (`candidate`, acepta intents `0.1.0`) y modela el contenido de las
  láminas aprobadas: `levels`, `note`, `panels`, `figures` con fuente, `nav`, `photo.focus`/`native`, título y marcos
  de hojas, `chapter`, `selection.box`, `shots`, `subtitles` y `selection.level`. `efeonceGraphicLine.surfaces` ya
  venía en `axis-tokens` `0.3.7` (contrato `0.1.0` en `axis-ui-contracts` `0.3.6`).
- **Greenhouse lo fija** (commit `016d0a183` de `develop`, 2026-09-27): `axis-tokens` `0.3.8`, `axis-ui-contracts`
  `0.3.7`, con `axis-brand-assets` `0.3.3` y `axis-graphic-line` `0.5.0` (subidos antes por la sesión de iconografía,
  commit `8d817f29e`, tag `v0.5.0`) y `axis-ui-registry` `0.3.1`. Los tokens compilados de los catálogos del composer
  sólo cambian la versión de origen en su encabezado (`pnpm brand:tokens --check` lo vigila).
- **Consumo nuevo:** `axis-graphic-line` es dependencia **directa** y se usa en código: `src/lib/brand-surfaces` pinta
  con `paintGraphicLine` y `resolveIcon`, y resuelve con `resolveSurfaceComposition` de `axis-ui-contracts`. Un bump
  de estos paquetes mueve píxeles de los catálogos `graphic-line-*`: correr
  `pnpm composer:visual-gate --catalog=graphic-line` y declarar en `BASELINE_DELTAS.md` si algo cambia.
- **Estado de runtime:** local en `develop` (sin push al cierre de esta nota); leer el veredicto de CI del SHA del bump
  cuando se empuje.

## Delta 2026-09-27 — Plastilina en volumen: `axis-tokens` 0.3.7 y `axis-brand-assets` 0.3.2, publicados (tag `v0.3.7`)

- **Publicado en GitHub Packages** con el tag `v0.3.7` (2026-09-27, release run `36292203529`, success, sobre el
  commit `c0020b6` de `main`; el volumen entró en `main` con `c18e3d3`): `axis-tokens` `0.3.7` suma
  `efeonceGraphicLine.icons.volume` y `axis-brand-assets` `0.3.2` suma los 18 PNG de `assets/volume/<glifo>.png`
  (sellados en `src/volume-manifest.ts`; API `AXIS_VOLUME_ICONS`, `findVolumeIcon`, `volumeIconUrl`). En el mismo tag
  salió `axis-ui-contracts` `0.3.6`; `axis-graphic-line` sigue en `0.4.0`. Es la decisión D24 (manual
  `docs/operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md` §14.1).
- **Coordinación:** la `0.3.7` de `axis-tokens` comparte versión con los cambios de superficies
  (`efeonceGraphicLine.surfaces`) de otra sesión; se publicó coordinada junto con ellos.
- **Greenhouse ya fija esas versiones** (commit `f3f93c926` de `develop`, 2026-09-27): `axis-tokens` `0.3.7`,
  `axis-ui-contracts` `0.3.6`, `axis-brand-assets` `0.3.2` y `axis-graphic-line` `0.4.0` como dependencia directa. El
  bump va en su propio commit y se lee el veredicto de CI de ese SHA. El Lab sigue sirviendo para descargar los PNG a
  mano.

## Delta 2026-09-26 (d) — iconografía de La órbita: `axis-tokens` 0.3.6 y `axis-graphic-line` 0.4.0

- **Publicado** (tag `v0.3.6` del repo AXIS, PR `efeoncepro/axis-design-system#3` mergeado; versiones verificadas en
  GitHub Packages el 2026-09-26 a las 23:57Z): `axis-tokens` `0.3.6` suma `efeonceGraphicLine.icons` y
  `axis-graphic-line` `0.4.0` suma el subpath **`/icons`** (`ICON_CATALOG` con 12 glifos de Trazo y 18 de
  Plastilina, `resolveIcon`, `auditIconGroup`, `skewedOrbitHeroSvg`). Es la iconografía canónica de la marca propia
  Efeonce (decisiones D16–D22; manual `docs/operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md` §14). En el
  repo de AXIS, `pnpm icons:export|check|vectorize`; página del Lab `https://axis.efeonce.org/references/iconography/`.
  `axis-ui-contracts` sigue en `0.3.5` y `axis-ui-registry` y `axis-brand-assets` en `0.3.1`.
- **Tramos intermedios del mismo día** (sin delta propio): tag `v0.3.4` publicó `axis-tokens` y `axis-ui-contracts`
  `0.3.4` (firma de correo de equipo); tag `v0.3.5` publicó `axis-tokens` y `axis-ui-contracts` `0.3.5`,
  `axis-ui-registry` y `axis-brand-assets` `0.3.1` y `axis-graphic-line` `0.3.2` (decisiones del operador sobre la
  línea). Greenhouse adoptó `0.3.5` en `develop` (commit `80f73da55`, todavía no en `main`).
- **Greenhouse todavía no consume `/icons`:** no fija `axis-graphic-line` ni subió `axis-tokens` a `0.3.6`. Adoptarlo
  es un bump explícito, con su propio commit y la lectura del veredicto de CI de ese SHA.
- **Acceso:** el acceso de GitHub Packages es **por paquete, no por versión**. Los repos que ya tenían
  `Manage Actions access → Read` en `axis-tokens` y `axis-graphic-line` lo conservan para `0.3.6` y `0.4.0` sin hacer
  nada. Un repositorio **nuevo** que quiera instalarlos necesita que se le otorgue `Read` en cada paquete:
  `https://github.com/orgs/efeoncepro/packages/npm/axis-graphic-line/settings` y
  `https://github.com/orgs/efeoncepro/packages/npm/axis-tokens/settings` (ver §Required GitHub package access).

## Delta 2026-09-26 (c) — `axis-tokens` 0.3.3 (movimiento de la órbita) y `axis-ui-contracts` 0.3.2

- **Publicado** (versionado independiente, tags `v0.3.2` y `v0.3.3` del repo AXIS): `axis-tokens` y
  `axis-ui-contracts` `0.3.2` suman la firma de correo v3.1 (tokens `efeonceGraphicLine.emailSignature` y contrato
  `efeonce.email-signature` 0.3.0); `axis-tokens` `0.3.3` suma `efeonceGraphicLine.motion`, el lenguaje de movimiento
  de la órbita (norma en `docs/operations/brand-graphic-line/EFEONCE_ORBIT_MOTION_LANGUAGE_V1.md`). `axis-ui-registry`
  y `axis-brand-assets` siguen en `0.3.0` y `axis-graphic-line` en `0.3.1`.
- **Greenhouse** fija `@efeoncepro/axis-tokens` en `0.3.3` en `develop` (commit `0fdd8f492`, todavía no en `main`):
  el render de las animaciones del logo (`scripts/creative/brand-motion/`) lee tiempos y proporciones del token.
  `axis-ui-contracts`, `axis-ui-registry` y `axis-brand-assets` siguen en `0.3.0`: Greenhouse todavía no usa el
  contrato `efeonce.email-signature`, así que no subió `axis-ui-contracts` a `0.3.2`.
- **Acceso:** los paquetes son los mismos cinco, ya con `Manage Actions access → Read` para los repos consumidores;
  una versión nueva de un paquete existente no necesita otorgar acceso de nuevo.

## Delta 2026-09-26 (b) — AXIS 0.3.0 y el paquete nuevo `axis-graphic-line`

- **Publicado** (versionado independiente): `@efeoncepro/axis-tokens`, `axis-ui-contracts`, `axis-ui-registry` y
  `axis-brand-assets` en `0.3.0`, y el paquete nuevo **`@efeoncepro/axis-graphic-line` `0.3.1`** (la órbita de la
  línea gráfica como código: SVG, recetas, motion, componente React y Web Component, todo desde los tokens).
- **Greenhouse** fija los cuatro primeros en `0.3.0` en `develop` (commit `a98751daa`, «adopt AXIS 0.3.0»); todavía no
  está en `main` y llega con el próximo release. Greenhouse **no depende** de `axis-graphic-line`: su adapter de la
  órbita (`scripts/creative/layout-compiler/graphic-line.mjs`) acepta el contrato `efeonce.graphic-line-orbit` 0.3.0 y
  pinta por su cuenta; `axis-advertising.mjs` exige `efeonce.collaboration-selection` 0.3.0.
- **Acceso desde Actions:** aplicando la regla que dejó el delta de abajo, `axis-graphic-line` recibió
  `Manage Actions access → Read` para los repos consumidores el 2026-09-26, **antes** de que un consumidor lo agregue
  como dependencia. Así el CI de un consumidor puede instalarlo con su `GITHUB_TOKEN`.
- **Instalación local con credencial efímera:** para instalar los paquetes privados en un equipo sin dejar el token en
  el repo, se usa el mismo patrón que el CI: un `.npmrc` temporal **fuera del repo** con el registry `@efeoncepro` y
  una credencial `read:packages`, pasado por `NPM_CONFIG_USERCONFIG` sólo para ese comando y borrado al terminar.

  ```bash
  # En un subshell: al salir se borran el archivo y la variable.
  (
    npmrc="$(mktemp)"; trap 'rm -f "$npmrc"' EXIT
    printf '%s\n' '@efeoncepro:registry=https://npm.pkg.github.com' '//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}' > "$npmrc"
    read -rs NODE_AUTH_TOKEN && export NODE_AUTH_TOKEN   # pega la credencial read:packages; no se muestra ni queda en el historial
    NPM_CONFIG_USERCONFIG="$npmrc" pnpm install --frozen-lockfile
  )
  ```

  El token nunca se escribe en un archivo versionado, no se imprime en la terminal ni en un log y no se pega en un
  chat. Aplican las reglas duras del Delta 2026-08-29 (nada de sustituirla por una credencial de scope amplio en
  infraestructura).

## Diagnóstico de descarga bloqueada por cuota (TASK-1863, 2026-09-28)

Un `ERR_PNPM_FETCH_403` puede deberse a permisos del paquete o a facturación; el código HTTP solo
no distingue las causas. En el rollout de TASK-1863, GitHub Packages respondió **Account has reached
its billing limit** al descargar `axis-graphic-line@0.7.0` desde Cloud Build. La credencial seguía siendo
válida; no se rotó ni se sustituyó por un token con mayor alcance.

1. Clasificar el mensaje sanitizado de la descarga autenticada; nunca imprimir el token ni `.npmrc`.
2. Si es cuota, el owner de facturación ajusta [Budgets and alerts de efeoncepro](https://github.com/organizations/efeoncepro/settings/billing/budgets).
   Cambiar el límite permite gasto adicional y requiere autorización del operador; no es una reparación automática del agente.
3. Verificar HTTP 200 en la descarga del paquete exacto con la credencial canónica; reintentar sólo
   el workflow fallido con el mismo SHA. No publicar commits paralelos para disparar el retry.
4. Verificar build, revisión, SHA, tráfico y salud del consumidor; la confirmación del cambio de cuota
   por sí sola no prueba un despliegue correcto.

El operador ajustó la cuota y la descarga dio 200. Ops-worker `36413423962`, intento 2, terminó success;
`ops-worker-00733-5s6` sirve `d86edb784` al 100%, salud 200. Main quedó en espera.
[Evidencia de recuperación](../audits/platform/2026-09-28-task-1863-verification.md#recuperación-final-de-cuota-y-cierre-de-staging-28-09-1131-utc).

## Delta 2026-09-26 — un paquete AXIS nuevo rompió el CI de develop durante horas

- AXIS 0.2.7 publicó por primera vez `@efeoncepro/axis-brand-assets` (07:45Z; los 19 SVG oficiales de logos,
  isotipos y burbujas de URL, sellados por SHA-256). Greenhouse lo adoptó una hora después (`30313912e`).
- El paquete nuevo sólo daba acceso a `axis-design-system`. Todos los `pnpm install --frozen-lockfile` del CI de
  `greenhouse-eo` fallaron con `ERR_PNPM_FETCH_403`, desde la corrida de `63ccc07fd` (08:24Z), y bloquearon el PR
  de release #243. El release de TASK-1888 salió desde una rama propia y no lo detectó.
- Causa: esta sección decía «los tres paquetes AXIS». La regla era por paquete y el paquete nuevo quedó fuera. Separar
  los assets en un paquete propio fue correcto: son archivos sellados, distintos de valores (tokens) y de lógica
  (contratos). El error fue de proceso: nadie dio el acceso al consumidor ni leyó el veredicto del CI después del push.
- Arreglo: `Manage Actions access → Read` para `greenhouse-eo` en el paquete. La regla ahora cubre todo paquete
  nuevo; ver §Required GitHub package access.

## Delta 2026-09-14 — composición publicitaria y selección colaborativa publicadas

El tag `v0.2.5` publicó `axisAdvertising.compositions.supportingTagline`,
`efeonce.advertising-typography@0.2.1` y `efeonce.collaboration-selection@0.2.0` en los tres paquetes. Evidencia:
commit AXIS `179aeb9e10ad6a017424ba534a1393afc1add766`, CI `34859611394` y release
`34859795624`, ambos `success`.

Greenhouse fija los tres paquetes en `0.2.5` e implementa un adapter nativo en el Campaign Layout Compiler. Sus
fixtures prueban Poppins real, copy arbitrario, fitting continuo, targets de texto/objeto, cursor local y
multiplayer acting/moving en 16:9 y 9:16. Globe y otros runtimes permanecen `pending adapter`; la publicación del
contrato no equivale a adopción. No se copia el adapter Astro/CSS del Lab.

## Delta 2026-08-29 — la credencial venció, bloqueó un release, y el detector SÍ había avisado

Caso fuente del modo de falla que este runbook venía anunciando desde el 2026-07-29 ("el día que
expire, todos los PR seguirán verdes y solo fallará un build de worker"). Ocurrió exactamente así.
Lo que **no** se anticipó es la segunda mitad: el detector funcionó, midió bien y avisó a tiempo —
y aun así nadie lo leyó.

### Qué pasó

- El secreto `projects/efeonce-group/secrets/axis-packages-read-token` **no guarda el token pelado**:
  guarda un **`.npmrc` completo** de tres líneas que el Dockerfile monta en `/root/.npmrc`.

  ```ini
  @jsr:registry=https://npm.jsr.io/
  @efeoncepro:registry=https://npm.pkg.github.com
  //npm.pkg.github.com/:_authToken=<TOKEN>
  ```

- La **versión 1** (creada 2026-07-29T23:47:59) llevaba un PAT **clásico** de GitHub con scope
  `read:packages` y la **expiración por defecto de 30 días** → venció el **2026-08-28**. Confirmado
  después contra la UI de GitHub: el token decía *"Expired yesterday"*, y había un **segundo** token
  AXIS ya vencido el **2026-08-27**.
- **Síntoma:** `ERR_PNPM_FETCH_401` sobre `@efeoncepro/axis-tokens` en Cloud Build, durante
  `pnpm install --frozen-lockfile`.
- **Radio: 3 de los 4 workers del control plane** — `ops-worker`, `commercial-cost-worker` e
  `ico-batch` montan ese `.npmrc` (también `artifact-worker`, que está fuera del control plane).
  `hubspot-greenhouse-integration` **no** lo usa. **Vercel no se ve afectado**: su build pasó verde.
  Eso es justo lo que vuelve engañoso mirar sólo el color del PR.
- Llevaba **~14 h roto y 3 deploys consecutivos fallidos** antes de detectarse. Se descubrió porque
  alguien estaba mirando un deploy.

### 🔴 El detector no falló: falló el enrutamiento de su señal

`.github/workflows/axis-credential-expiry.yml` **corrió, midió bien y avisó con la anticipación que
tenía prometida**:

```text
run 32856176785 · 2026-08-25T13:54Z · conclusion: failure
✖ El credencial AXIS expira el 2026-08-28 — quedan 3 días.
  Rotar YA: al expirar, GitHub Actions sigue verde y solo fallan los builds de worker.
```

Tres días de aviso, con la fecha exacta y la instrucción correcta. El incidente ocurrió igual.

**Por qué se perdió el aviso — y esto es lo replicable:** las dos corridas previas del mismo workflow
también estaban en rojo, **por una causa ajena a la credencial**:

| Run | Fecha | Conclusión | Causa |
|---|---|---|---|
| `30924196526` | 2026-08-04 | `failure` | `Unable to locate executable file: pnpm` (orden `setup-node`/pnpm) |
| `31501087312` | 2026-08-11 | `failure` | idéntica |
| `31700211413` | 2026-08-13 | `success` | corregida (`package-manager-cache: false`) |
| `32144377290` | 2026-08-18 | `success` | credencial aún fuera de la ventana |
| `32856176785` | 2026-08-25 | `failure` | **la alarma real: 3 días para vencer** |

Para cuando llegó el rojo que importaba, **el rojo ya era el color habitual de ese workflow**. Un
`failure` en un scheduled workflow no le llega a nadie por sí solo: no bloquea un PR, no abre un
issue, no manda un mensaje. Es una alarma sonando en una sala vacía.

**Regla:** un gate programado cuyo único canal de salida es el color de su propia corrida **no es una
alerta, es un registro**. Y un gate que acumula rojos por causas de infraestructura pierde su
capacidad de significar algo el día que se pone rojo de verdad. Un rojo ajeno al objeto medido debe
arreglarse *rápido*, no tolerarse: cada día que se deja, degrada la señal que sí importa.

### Resolución (2026-08-29)

1. El **operador** generó un PAT nuevo y lo cargó como **versión 2** del secreto
   (`createTime 2026-08-29T13:44:17`).
2. Tras eso, los 3 workers desplegaron en `success`.
3. La **versión 1 quedó `disabled`** el mismo día, por higiene. Estado verificado:

   ```text
   NAME  STATE     CREATED
   2     enabled   2026-08-29T13:44:17
   1     disabled  2026-07-29T23:47:59
   ```

### Cómo rotar — `scripts/secrets/rotate-axis-packages-token.sh`

La rotación **es acción del OPERADOR, no del agente** (ver reglas duras). El helper existe para que
esa acción sea de un solo paso y no se pueda arruinar en silencio.

```bash
# macOS — recomendado. El PAT va portapapeles → stdin → Secret Manager.
# No se muestra en pantalla, no queda en el historial, no toca un archivo.
pbpaste | ./scripts/secrets/rotate-axis-packages-token.sh

# Cualquier plataforma, interactivo: pega el PAT, Enter, Ctrl-D.
./scripts/secrets/rotate-axis-packages-token.sh
```

Lo que hace, y **por qué cada pieza está ahí**:

- **Lee el PAT por `stdin` y sólo por `stdin`.** Nunca como argumento —quedaría en `ps` y en el
  historial del shell—, nunca en un archivo temporal, nunca en un log.
- **Valida el token contra la API de GitHub ANTES de escribir la versión**
  (`GET /orgs/efeoncepro/packages?package_type=npm`). Un `.npmrc` malformado o un scope mal elegido
  fallan con **el mismo 401** que el token vencido; sin esta validación, descubrirlo cuesta un ciclo
  de build de ~4 min en vez de 2 segundos.
- **Compone el `.npmrc` completo**, que es la forma que el consumidor espera. Cargar el token pelado
  produce un secreto sintácticamente válido y funcionalmente muerto.

Después de rotar, verificar el estado de versiones y desactivar la anterior:

```bash
gcloud secrets versions list axis-packages-read-token --project efeonce-group \
  --format='table(name,state,createTime)'
gcloud secrets versions disable <VERSION_ANTERIOR> \
  --secret=axis-packages-read-token --project efeonce-group
```

### ⚠️ Reglas duras

- **La rotación es acción del OPERADOR.** Crear un PAT y manipular su valor es una operación de
  credencial: el agente **no la ejecuta**, aunque se lo pidan. Enuncia la regla y devuelve la acción.
- **NUNCA sustituir la credencial acotada por una de scope amplio** —por ejemplo el token de una
  sesión `gh`— para desbloquear un build. «Funciona», y deja en infraestructura productiva una
  credencial que puede mucho más que `read:packages`. Cambia un incidente de 30 minutos por una
  exposición permanente.
- **Un token expuesto en una captura o en un chat queda comprometido**, sin importar cuán nuevo sea.
  Se revoca y se genera otro. No hay versión de esto en que «total, es de sólo lectura».
- **NUNCA promover con un deploy de worker en rojo.** Los workers se despliegan por `workflow_call`
  dentro del orquestador, así que el release cierra `degraded` con `worker_revision_drift`; y si
  alguno queda change-gated y se salta, **el código entra a `main` SIN su worker desplegado**, sin
  error visible.
- **Diagnóstico: antes de culpar al diff, mirar el HISTORIAL del workflow.**

  ```bash
  gh run list --workflow=<workflow>-deploy.yml --limit 12
  ```

  Si los commits previos también fallan, es entorno o credencial, no tu cambio.

### Arreglo durable — PENDIENTE (no está hecho)

Un PAT estático de 30 días es una bomba de tiempo con fecha conocida: rotarlo sólo mueve la fecha.

**El arreglo real:** la App de GitHub del repo puede acuñar **tokens de instalación de 1 hora** bajo
demanda desde su private key. Eso elimina el vencimiento silencioso en vez de posponerlo.

**Hoy NO puede.** La App `greenhouse-release-watchdog` (`app_id=3665723`) tiene permisos
`actions:read`, `deployments:read`, `metadata:read` — **sin `packages`**. Concederlo es acción de un
**owner de la organización**, no de un agente ni del pipeline.

**Mínimo intermedio mientras tanto**, en este orden de valor:

1. **Un check de preflight que lo detecte ANTES de la promoción.** Es la corrección directa del
   modo de falla real de este incidente: no faltó medición, faltó que la medición apareciera donde
   alguien está obligado a mirar.
2. **Anotar la expiración en el secreto** (etiqueta de la versión). Es para el humano que corre
   `gcloud secrets versions list`; **no** es la fuente de verdad —el gate seguirá leyendo la
   expiración real que reporta GitHub en el header `github-authentication-token-expiration`, porque
   una fecha escrita a mano deriva y el header no.

> Nota de mantenimiento para quien toque el gate: el workflow inyecta **el payload completo del
> secreto** en `AXIS_PACKAGES_READ_TOKEN`, y ese payload es un `.npmrc` de tres líneas, no un token
> pelado. Con la forma actual el gate reportó la fecha correcta el 2026-08-25 (evidencia arriba). Si
> se cambia la forma del secreto o el modo de inyección, **volver a verificar que el gate sigue
> midiendo** — un gate que se vuelve ciego sale `0` igual que uno sano.

## Delta 2026-07-30 — el release admite versionado independiente y es idempotente

Los tres paquetes se versionan **de forma independiente**: `tokens` puede ir en `0.2.1` mientras
`contracts` y `registry` siguen en `0.1.5`. Bumpear los tres por un cambio de uno publicaría versiones sin
contenido. El contrato del tag es **"al menos un paquete está en esta versión"**, no "los tres coinciden".

El paso de publish **salta las versiones que ya están en el registry** en vez de fallar. Eso permite
re-taguear un commit ya publicado y usar el run como **verificación a posteriori** — que es lo que se hizo
con `v0.2.1` después de que `0.2.0`/`0.2.1` se publicaran a mano durante `TASK-1600`.

**NUNCA publicar a mano.** El pipeline es el que corre CI, el gate de contratos y la coherencia del tag; sin
él, una versión llega al registry sin que nadie haya verificado su contenido. Ocurrió el 2026-07-30 y el
síntoma fue inmediato: `0.2.0` salió sin los type aliases del adapter y hubo que publicar `0.2.1`.

## Delta 2026-07-29 — dónde vive el credencial, y dónde NO hace falta (TASK-1589 V1.1)

Decisión arquitectónica completa en
`docs/architecture/EFEONCE_SHARED_PRODUCT_UI_PLATFORM_DECISION_V1.md` § Delta 2026-07-29. Lo operativo:

**Hay dos planos de ejecución, y solo uno necesita un credencial durable.**

| Plano | Qué usa hoy | ¿Necesita secreto? |
|---|---|---|
| GitHub Actions — 11 workflows Greenhouse + `ci.yml` de Globe | `secrets.GITHUB_TOKEN` del runner | **No.** Efímero, por run. Ya es óptimo; no tocar |
| Cloud Build — 4 workers Greenhouse + Globe | Secret Manager | **Sí.** Único consumidor real del PAT |
| Vercel `NPM_RC` del Lab | *(nada — retirada 2026-07-29)* | **No.** El Lab usa `workspace:*`; la variable no tenía consumidor |

**Por qué esto importa para el diagnóstico:** el PAT **no está en el camino del PR**. El día que expire,
todos los PR seguirán verdes y solo fallará un build de worker, posiblemente semanas después y bajo
deadline. Es una falla silenciosa por construcción, y por eso existe el detector.

**Detector:** `.github/workflows/axis-credential-expiry.yml` (semanal, martes 13:00 UTC) corre
`scripts/ci/axis-package-credential-expiry-gate.mjs`. Lee la expiración **real que reporta GitHub** en el
header `github-authentication-token-expiration` — no una fecha escrita en este documento. Umbrales: aviso a
21 días, falla a 7. Mientras el secreto siga en el proyecto legacy, el workflow se omite solo y no hace
ruido; empieza a medir en cuanto exista en `efeonce-group`.

### ✅ `NPM_RC` de Vercel retirado — era un credencial sin consumidor (ejecutado 2026-07-29)

`apps/lab` consume AXIS por **`workspace:*`** (symlinks a `packages/`), verificado en `pnpm-lock.yaml`
(`version: link:../../packages/tokens`). El build del Lab **nunca resuelve nada contra
`npm.pkg.github.com`**, así que el `NPM_RC` que estaba en Production y Preview era un credencial de larga
vida almacenado **sin ningún consumidor**: superficie de exposición sin contrapartida.

**Retirado** de ambos entornos; el proyecto quedó sin ninguna variable de entorno.

**Verificación (determinista, más fuerte que un redeploy):** con `node_modules` borrado y **sin ninguna
credencial de registry** —`NPM_CONFIG_USERCONFIG=/dev/null`, sin `NPM_TOKEN` ni `NODE_AUTH_TOKEN`—
`pnpm install --frozen-lockfile` resolvió en 247 ms y `pnpm --filter @efeonce/axis-design-system-lab build`
emitió `dist/` completo. Si el Lab necesitara el registry, el install habría fallado con 401.

Reversible en un minuto: volver a crear la variable. No afecta a Greenhouse ni a Globe.

### Nuevo hogar del secreto: `efeonce-group` — activo desde 2026-07-29

**Estado:** el secreto `axis-packages-read-token` **ya existe y tiene una versión habilitada** en
`efeonce-group`, con las dos identidades de build como `secretAccessor`. Los consumidores ya apuntan
al control plane y el release productivo terminó correctamente.

El valor fue publicado mediante el flujo aprobado: un PAT temporal `read:packages` del operador. No se
creó una cuenta GitHub de máquina porque el operador eligió el camino temporal; esa sustitución queda
como trabajo previo al rollout externo.

Decisión del operador (2026-07-29). El secreto deja de vivir en `efeonce-globe` —un proyecto de
**producto**— y pasa al proyecto del **control plane**, que ya gobierna a Globe. No es simétrico al
anterior: `efeonce-group` no es un peer de Globe.

Secuencia obligatoria, en este orden:

```bash
# ✅ 1. HECHO 2026-07-29 — contenedor creado (no lleva valor)
gcloud secrets create axis-packages-read-token --project=efeonce-group \
  --replication-policy=automatic \
  --labels=owner=axis-design-system,purpose=private-package-read,task=task-1589

# ✅ 2. HECHO 2026-07-29 — se publicó el PAT temporal aprobado por el operador.
#       El valor nunca pasó por chat ni se imprimió en logs.
printf %s "$TOKEN" | gcloud secrets versions add axis-packages-read-token \
  --project=efeonce-group --data-file=-

# ✅ 3. HECHO 2026-07-29 — accessor SOLO sobre este secreto, readback verificado
for SA in 183008134038-compute@developer.gserviceaccount.com \
          818083690953-compute@developer.gserviceaccount.com; do
  gcloud secrets add-iam-policy-binding axis-packages-read-token \
    --project=efeonce-group --member="serviceAccount:${SA}" \
    --role=roles/secretmanager.secretAccessor
done

# ✅ 4. HECHO 2026-07-29 — consumidores migrados al nuevo secret resource.
# ✅ 5. HECHO 2026-07-30 — builds, canaries y release productivo verdes en ambos productos.
# ✅ 6. HECHO 2026-07-30 — versión legacy deshabilitada y secreto eliminado de `efeonce-globe`;
#       el PAT legacy también fue revocado en GitHub después de verificar el release productivo.
```

**NUNCA** revocar el binding legacy antes del paso 5. Revocar primero deja a Greenhouse sin poder
desplegar sus workers.

## Required GitHub package access

GitHub Packages requires authentication for private packages. For GitHub Actions,
`GITHUB_TOKEN` is sufficient only when the consuming repository has been granted read
access to the package. Configure this in each package's GitHub settings:

`Package settings → Manage Actions access → Add repository`

Add:

- `efeoncepro/greenhouse-eo`
- `efeoncepro/efeonce-globe`

Repeat for **every** AXIS package — today `axis-tokens`, `axis-ui-contracts`, `axis-ui-registry`,
`axis-brand-assets` and `axis-graphic-line` (granted 2026-09-26) — and for **every new package** the AXIS repo publishes. Access is per package: a new package
only grants its source repository (`axis-design-system`), and it does not inherit the consumers of the other AXIS
packages. Do not make the packages public as a shortcut.

Access is also **per package, not per version**: a repository that already has `Read` on a package keeps it for
every new version (for example `axis-tokens` `0.3.6` and `axis-graphic-line` `0.4.0`, 2026-09-26). A **new consumer
repository** needs the grant on each package it installs, at
`https://github.com/orgs/efeoncepro/packages/npm/<package>/settings` → `Manage Actions access` → add the repository
with `Read`.

🔴 **Publishing a NEW AXIS package is not done until each consumer repository can install it from Actions.** Grant
`Manage Actions access → Read` to `greenhouse-eo`, `efeonce-globe` and `efeonce-marketing-studio` (whichever will
depend on it) **before** any consumer adds the dependency. Then push the consumer change and read the CI verdict
of that exact SHA: laptops and Vercel use a personal `read:packages` token, so only the `GITHUB_TOKEN` of Actions
exposes a missing grant (`ERR_PNPM_FETCH_403` on `npm.pkg.github.com/download/@efeoncepro/<package>`).

## Consumer `.npmrc`

Do not commit a token. The build environment must provide the token through its secret
manager and materialize this configuration only for the install step:

```ini
@efeoncepro:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${AXIS_PACKAGES_READ_TOKEN}
```

For local development, use a developer-owned `~/.npmrc` or an ignored project-local
file. Never add the resolved token to git, a deployment artifact or a log.

⚠️ **El secreto de Secret Manager guarda este archivo YA RESUELTO, no el token.** Su contenido real
son tres líneas —incluye `@jsr:registry`— y se monta tal cual. Ver **Delta 2026-08-29** para la forma
exacta y el helper que la compone; cargar el token pelado produce un secreto válido y muerto.

## Vercel

⚠️ **This section does NOT apply to the AXIS Lab.** The Lab is a workspace member and resolves
AXIS through `workspace:*` links, so it needs no registry credential at all — its `NPM_RC` is
being retired (see the Delta above). What follows applies only to a Vercel project that consumes
the **published** packages from outside the AXIS workspace.

For such a Vercel consumer, configure the project environment variable `NPM_RC` with the
`.npmrc` contents and select only the required environments (`Preview` first, then
`Production` after a successful canary). Vercel must receive an organization-owned
PAT classic with `read:packages` only; do not use a personal deployment token.

After setting `NPM_RC`, trigger a new deployment. Environment changes do not affect
previous deployments.

## Cloud Build / Globe and Greenhouse workers

Store the read-only token in Secret Manager in the `efeonce-group`
project. Grant each build service account access to that one secret only. The build
step writes the `.npmrc` file to the ephemeral workspace, runs `pnpm install --frozen-lockfile`,
and removes the file before producing the artifact. The token must not be passed as a
Docker build argument or copied into the image.

Current secret reference:

```text
projects/efeonce-group/secrets/axis-packages-read-token
```

Current Globe build identity:

```text
818083690953-compute@developer.gserviceaccount.com
```

Greenhouse worker build identity:

```text
183008134038-compute@developer.gserviceaccount.com
```

The previous cross-project binding is retired. The `efeonce-globe` secret container was disabled and
deleted after production verification, and no runtime reference should be recreated there. Keep the
replacement in `efeonce-group`; do not recreate the coupling by placing it in a product project.

The Greenhouse deploy scripts for `ops-worker`, `commercial-cost-worker`,
`ico-batch-worker` and the staging-only `artifact-worker` use the same contract.
The service Dockerfiles mount the secret in both builder and runtime installs;
the single-stage artifact worker mounts it in its only `pnpm install`. BuildKit
secrets are scoped to one `RUN`; the token is never passed as a Docker build argument or
copied into the image.

The deployment workflow must prove:

1. ✅ **package installation succeeds** — verificado en pipeline real el 2026-07-29: los cuatro worker
   deploys de Greenhouse (`ops-worker`, `artifact-worker`, `ico-batch`, `commercial-cost-worker`) corrieron
   verdes contra AXIS `0.1.5`, con el credencial leído de Secret Manager y montado como secreto BuildKit.
   Es la primera ejecución real de este contrato, no un ensayo local.
2. ✅ **the resulting image does not contain `.npmrc` or the token** — BuildKit secret mounts are
   ephemeral and the production image/deploy contract completed without a credential artifact.
   `--mount=type=secret` no persiste el archivo en la capa *por diseño*, y el `trap 'rm -f .npmrc'` cubre el
   workspace de Cloud Build; pero **la comprobación empírica sobre la imagen publicada no existe**. Es una
   garantía del mecanismo, no evidencia. Falta un gate que inspeccione la imagen.
3. ✅ **the deployed revision matches the built commit** — cubierto por el contrato de TASK-851: los
   `deploy.sh` leen `GIT_SHA` de la revisión Cloud Run servida y abortan fail-loud ante mismatch contra
   `EXPECTED_SHA`. Verificado en los cuatro deploys de esta pasada.
4. ✅ **rollback restores the previous package version and image digest** — rollback exercise completed
   for Globe Studio and API internal services, with traffic restored to the new revisions. Worker
   Cloud Run deploys also passed their bounded Ready and commit-drift gates.

Until those checks have run successfully in the consumer pipeline and the deployed digest has been
verified, the AXIS adapters remain an opt-in canary and must not be described as a production-wide
rollout.

## Credential options

GitHub Packages currently supports a classic PAT for this registry. The preferred
operational model is a dedicated Efeonce machine account with `read:packages` only,
short expiration and documented rotation owner. Do not send the token through chat.

⚠️ Un PAT **clásico** creado sin tocar el selector de expiración toma el **default de 30 días**. Fue
la causa directa del incidente del 2026-08-28. **Procedimiento de rotación, reglas duras y el arreglo
durable pendiente: ver Delta 2026-08-29.** La rotación es acción del **operador**.

## Consumer integration sequence

1. Grant repository read access to all AXIS packages.
2. Configure the read-only token in Vercel and/or Secret Manager.
3. Add the scoped registry configuration without resolving the secret in source.
4. Add fixed package versions, starting at the verified pilot version `0.1.5`.
5. Implement one simple and one complex adapter under the consumer's native runtime.
6. Run desktop, 390 px, keyboard, reduced-motion, accessibility and visual-diff evidence.
7. Record the consumer and evidence in the AXIS registry.
8. Keep the pilot opt-in until rollback and a fresh install have passed.

## Rollback

Rollback means reverting the consumer package version or adapter flag. It does not mean
mutating the shared contract or deleting a package. Keep the last known-good package
version in the consumer lockfile and deployment evidence.

## Evidence and ownership

- Architecture: `docs/architecture/EFEONCE_SHARED_PRODUCT_UI_PLATFORM_DECISION_V1.md`.
- Umbrella: `TASK-1588`.
- Consumer pilot: `TASK-1591`.
- Package foundation: `TASK-1589`.
- Registry/Lab: `TASK-1590` and `TASK-1592`.
- Package repository: `../axis-design-system`.
