# TASK-1589 — Efeonce UI Package Foundation

## Status

- Lifecycle: `in-progress`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `standard`
- UI impact: `primitive`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `optional`
- Status real: `V1.1 EJECUTADA — foundation publicada, distribución migrada y release verificado; queda abierta únicamente la sustitución del token temporal por una identidad de máquina antes del rollout externo`. La versión `0.1.5` fue publicada y consumida por Greenhouse y Globe con gates verdes; el `NPM_RC` del Lab fue retirado y probado sin credencial; el secreto vigente tiene una versión activa en `efeonce-group`; los cinco consumidores de Cloud Build fueron migrados; el release productivo `30502476429` terminó en `success`; canaries y rollback fueron verificados. El PAT legacy fue revocado y el secreto legacy de `efeonce-globe` fue eliminado. El token temporal de migración permanece activo como medida interina.
- Rank: `TBD`
- Domain: `ui-platform|cross-runtime`
- Blocked by: `TASK-1588`
- Branch: `task/TASK-1589-efeonce-ui-package-foundation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crear el foundation portable de AXIS —tokens, contracts y registry— en `../axis-design-system`.
La capa portable no puede importar MUI, Vuexy, Next, browser globals ni lógica de producto.

## Delta 2026-07-29 — V1.1: endurecimiento de distribución y gobierno

La foundation quedó publicada y operativa, pero su **distribución** no tenía gobierno: el repo AXIS
publicaba sin CI, `isPromotable()` existía y no lo corría nadie, el credencial vencía en silencio y el
SSOT de tokens no estaba declarado. Decisión arquitectónica completa (con scoring 4-pilar, hard rules y
open questions) en `docs/architecture/EFEONCE_SHARED_PRODUCT_UI_PLATFORM_DECISION_V1.md`
§ Delta 2026-07-29. Runbook operativo actualizado en
`docs/operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md` § Delta 2026-07-29.

### Implementado y verificado

En `../axis-design-system`:

- `.github/workflows/ci.yml` — **nuevo**. Build + typecheck + test en PR y push a `main`. Antes no
  existía CI de PR: el único workflow publicaba en tags, así que un `main` roto se publicaba.
- `packages/contracts/src/index.test.ts` — el gate **descubre** los contratos exportados por forma en vez
  de listarlos, así que un contrato nuevo entra al gate por existir. Verifica `isPromotable()`, unicidad
  de `id`, lifecycle dentro de la unión, y que el gate sea *load-bearing* (quitar la evidencia debe
  volverlo no-promocionable). 1 test → 6.
- `.github/workflows/release-packages.yml` — corre los mismos gates antes de publicar y **verifica
  coherencia tag↔versión** de los tres paquetes. Nada comprobaba esa afirmación: taguear `v0.2.0` sobre un
  árbol en `0.1.4` publicaba `0.1.4`.
- `packages/tokens/src/tokens.ts` — `warning` y `danger` corregidos al SSOT de TASK-1053; SSOT declarado en
  el encabezado. Bump de los tres paquetes a `0.1.5`.

En Greenhouse:

- `src/@core/theme/axis-package-drift.test.ts` — **nuevo**. Extiende el patrón canónico
  *SSOT + derivación + señal de drift* de `axis-semantic-drift.test.ts`. Declara qué valor de Greenhouse
  posee cada rol de AXIS y falla si divergen. Incluye la excepción **autolimpiante** del drift medido:
  afirma que el drift SIGUE existiendo, así que instalar `0.1.5` la rompe y obliga a borrarla.
- `scripts/ci/axis-package-credential-expiry-gate.mjs` + `.github/workflows/axis-credential-expiry.yml` —
  **nuevos**. Miden la expiración real que reporta GitHub, no una fecha escrita en un doc. Semanal, aviso
  a 21 días, falla a 7. Se omite solo mientras el secreto siga en el proyecto legacy.

### Ejecutado el 2026-07-29

- **CI del repo AXIS vivo.** Primera corrida verde (`30487680371`); anotó que las actions v4 targetean
  Node 20 deprecado, así que se alinearon al canon del ecosistema (checkout@v5 · setup-node@v5 ·
  action-setup@v6) y la segunda corrida quedó limpia.
- **`0.1.5` publicada** (`30487828729`) con los gates corriendo ANTES de los tres `publish`, incluido el
  de coherencia tag↔versión estrenado en este release.
- **Greenhouse y Globe consumen `0.1.5`.** Greenhouse: 49/49 tests de theme, typecheck limpio. Globe:
  typecheck, build de `studio-client` y los dos canarios (composer + axis-pilot) verdes.
- **La excepción autolimpiante funcionó como se diseñó:** al instalar `0.1.5` sus dos asserts fallaron
  —`expected '#ffb703' to be '#d59800'`— forzando su borrado. El workaround no sobrevivió a su causa.
- **`NPM_RC` del Lab retirado** de Production y Preview; el proyecto quedó sin ninguna variable.
  Verificado de forma determinista, no por redeploy: con `node_modules` borrado y sin credencial alguna
  (`NPM_CONFIG_USERCONFIG=/dev/null`), `pnpm install --frozen-lockfile` resolvió en 247 ms y el build
  emitió `dist/` completo.
- **Contenedor del secreto creado en `efeonce-group`** con `secretAccessor` para las dos identidades de
  build y readback verificado. **Cero versiones**: inerte, sin riesgo, y el legacy sigue sirviendo a los
  builds sin cambio de runtime.

### Delta 2026-07-29 (b) — la evidencia del piloto AXIS pasa de local a CI (`ISSUE-128`)

El `axis-pilot-canary` figuraba como evidencia automatizada del piloto, pero **nunca había corrido en CI**:
resolvía Playwright con un fallback a una ruta absoluta del disco de un desarrollador, así que moría con
`ERR_MODULE_NOT_FOUND` en cualquier runner. El CI de Globe llevaba 9 commits en `failure` por esa causa,
compartida con otros tres canaries. Detrás había un segundo fallo, sólo visible tras arreglar el primero:
un aserto huérfano pineaba el catálogo en `1.4.0` cuando ya estaba en `1.5.0`.

Resuelto en `efeonce-globe@498ffce` con `playwright-core` (nunca descarga browsers) + `channel: 'chrome'`
sobre el Chrome preinstalado del runner — el mismo patrón que `playwright.yml` de Greenhouse. **La
disyuntiva de costo que parecía necesaria se disolvió: gates reales con cero descarga de browser.**

Evidencia: run `30499520419` `success`, primer verde en 10 commits, con `composer canary OK` y
`AXIS pilot canary OK` en el log del runner — corrieron, no se saltearon. Detalle completo en
`docs/issues/resolved/ISSUE-128-globe-canaries-absolute-path-ci-failure.md`.

### Pendiente — antes del rollout externo

1. Crear la identidad de máquina con `read:packages` únicamente y su dueño de rotación.
2. Publicar su token en el secreto vigente sin incluir el valor en documentación, chat ni logs.
3. Rotar el secreto manteniendo el contrato `axis-packages-read-token`.
4. Verificar builds y detector de expiración antes del rollout externo.

### Acceptance criteria (V1.1)

- [x] El repo AXIS falla el PR si build, typecheck o test fallan.
- [x] `release-packages.yml` no publica sin gates verdes ni con tag incoherente.
- [x] `isPromotable()` corre sobre cada contrato exportado y el gate es load-bearing.
- [x] Existe un gate que detecta drift entre los tokens publicados y el SSOT de Greenhouse.
- [x] Existe un detector de expiración que mide la realidad, no un registro.
- [x] Cada gate nuevo ejercitado en las dos direcciones (verde y rojo deliberado).
- [x] `0.1.5` publicada y consumida por ambos productos; excepción autolimpiante borrada por su diseño.
- [x] `NPM_RC` del Lab retirado, probado con install + build sin ninguna credencial.
- [x] Contenedor del secreto creado en `efeonce-group` con IAM a las dos identidades de build.
- [ ] Identidad de máquina creada, con dueño y fecha de rotación documentados.
- [x] Token temporal publicado en `efeonce-group`; los 5 consumidores migrados y verdes; secreto legacy eliminado
  y PAT legacy revocado después de la verificación productiva.
- [x] Los 4 puntos del runbook quedaron verificados en el release productivo `30502476429`, incluidos canaries,
  digest y rollback.

### Rollback

Ningún paso muta estado durable: sin migraciones, sin backfills, sin transiciones de máquina de estados.
El PAT temporal actual sigue activo hasta `2026-08-28`, así que el credencial nuevo se puede revertir sin tocar
código de producto. Los consumidores fijan versión exacta en el lockfile: un fallo de distribución no
cambia ningún bundle. Los gates nuevos son aditivos — borrarlos restaura el estado previo.
**Regla dura satisfecha:** el binding legacy se retiró únicamente después de que ambos consumidores pasaran sus
builds y el release productivo quedara verificado.

## Architecture Alignment

- `docs/architecture/EFEONCE_SHARED_PRODUCT_UI_PLATFORM_DECISION_V1.md`
- `docs/architecture/ui-platform/README.md`
- `docs/architecture/ui-platform/PRIMITIVES.md`
- `docs/tasks/TASK_PROCESS.md`

## Modular Placement Contract

- Topology impact: `ui-package`
- Current home: `../axis-design-system/packages/{tokens,contracts,registry}`
- Future candidate home: `ui-package`
- Boundary: tokens/contracts/registry; adapters y composiciones quedan fuera
- Server/browser split: build-time package; sin secretos ni side effects de browser
- Build impact: workspace package build/typecheck/test y publicación privada posterior
- Extraction blocker: inventario de primitives MUI todavía no separado por contrato

## Acceptance Criteria

- [x] Tokens semanticamente nombrados con provenance y CSS exportable. — `@efeoncepro/axis-tokens` publicado en `0.1.2`.
- [x] Contracts incluyen anatomy, states, a11y, responsive, motion, owner y evidence. — `@efeoncepro/axis-ui-contracts` publicado en `0.1.2`.
- [x] Registry valida lifecycle, consumers y evidence. — `@efeoncepro/axis-ui-registry` publicado en `0.1.2`.
- [x] La capa portable no importa MUI/Vuexy. — build/test del repositorio `efeoncepro/axis-design-system` verificados.
- [x] Build, typecheck y tests locales verdes. — foundation y Lab verificados; publicación privada y consumo del Lab preparados.

## Rollout / Rollback

- Foundation publicada como package privado `0.1.5`; los adapters de consumidores permanecen fuera de esta task.
- Rollback: fijar consumidores a la versión previa o retirar el consumo del package; no se elimina ningún runtime existente.

## Delivery evidence — 2026-07-28

The foundation was originally published as `0.1.2` for this task. AXIS subsequently
published `0.1.5` with the consumer-governed status/progress contracts used by
`TASK-1591`; the original version evidence below remains historical.

- Repositorio privado: `efeoncepro/axis-design-system`.
- Packages privados publicados: `@efeoncepro/axis-tokens`, `@efeoncepro/axis-ui-contracts` y `@efeoncepro/axis-ui-registry`, `0.1.2`.
- Lab: `https://axis-design-system-lab.vercel.app`.
- Consumers Greenhouse/Globe con acceso `Read` en GitHub Packages; auth operativa documentada en
  `docs/operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md`.
- La integración runtime de adapters es scope explícito de `TASK-1591`, no evidencia de cierre de esta foundation.
