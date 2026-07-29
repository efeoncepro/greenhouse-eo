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
- Status real: `V1.1 EN CURSO — foundation publicada y operativa; endurecimiento de distribución/gobierno abierto. Hecho y verificado en las dos direcciones (verde + rojo deliberado): CI de PR en el repo AXIS (antes NO existía: un main roto se publicaba), gate de contrato que DESCUBRE los contratos exportados en vez de listarlos, gate de coherencia tag↔versión, y gate de drift de tokens. HALLAZGO 1: el drift de tokens YA HABÍA OCURRIDO — 0.1.4 publica warning #d59800 y danger #c01d27, valores pre-TASK-1053; inerte porque ningún consumidor lee efeonceTokens.color, corregido en 0.1.5 con blast radius cero. HALLAZGO 2: los 11 workflows de Greenhouse y el CI de Globe usan GITHUB_TOKEN, NO el PAT — el PAT lo consume solo Cloud Build, así que al expirar el CI queda VERDE y solo fallan builds de worker: falla silenciosa por construcción. HALLAZGO 3: ningún src/lib/** ni services/** importa AXIS (vive solo en src/components/greenhouse/primitives) — el acoplamiento de los workers es ACCIDENTAL de instalación, no de runtime; la salida estructural es EPIC-026, no más plomería. HALLAZGO 4: el NPM_RC de Vercel del Lab NO SE USA (apps/lab consume por workspace:*) — credencial de larga vida sin consumidor, a retirar. PENDIENTE (requiere al operador): crear la identidad de máquina, publicar el secreto en efeonce-group, migrar los 5 consumidores, publicar 0.1.5 y ejecutar los 4 puntos de verificación del runbook`
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

### Implementado y verificado (local-first, sin push)

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

### Pendiente — requiere al operador (no ejecutable por un agente)

1. Crear la identidad de máquina con `read:packages` únicamente y su dueño de rotación.
2. Publicar el secreto en `efeonce-group` (`printf %s | gcloud secrets versions add`) + accessor a las dos
   identidades de build. **El valor del credencial nunca pasa por un agente ni por chat.**
3. Apuntar los 5 consumidores de Cloud Build al nuevo `versionName`; build verde en ambos productos.
4. Recién entonces: revocar el binding legacy en `efeonce-globe` y borrar el secreto viejo.
5. Taguear `v0.1.5` para publicar la corrección de tokens; actualizar la versión fijada en Greenhouse y
   Globe; borrar la excepción autolimpiante del gate de drift.
6. Retirar el `NPM_RC` de Vercel del Lab (no tiene consumidor) y redesplegar para confirmar.
7. Ejecutar los 4 puntos de verificación del runbook en pipeline real.

### Acceptance criteria (V1.1)

- [x] El repo AXIS falla el PR si build, typecheck o test fallan.
- [x] `release-packages.yml` no publica sin gates verdes ni con tag incoherente.
- [x] `isPromotable()` corre sobre cada contrato exportado y el gate es load-bearing.
- [x] Existe un gate que detecta drift entre los tokens publicados y el SSOT de Greenhouse.
- [x] Existe un detector de expiración que mide la realidad, no un registro.
- [x] Cada gate nuevo ejercitado en las dos direcciones (verde y rojo deliberado).
- [ ] Identidad de máquina creada, con dueño y fecha de rotación documentados.
- [ ] Secreto en `efeonce-group`; ambos consumidores verdes contra él **antes** de revocar el legacy.
- [ ] `0.1.5` publicada y consumida; excepción autolimpiante borrada.
- [ ] Los 4 puntos del runbook ejecutados en pipeline real.

### Rollback

Ningún paso muta estado durable: sin migraciones, sin backfills, sin transiciones de máquina de estados.
El PAT actual sigue válido hasta `2026-08-27`, así que el credencial nuevo se puede revertir sin tocar
código de producto. Los consumidores fijan versión exacta en el lockfile: un fallo de distribución no
cambia ningún bundle. Los gates nuevos son aditivos — borrarlos restaura el estado previo.
**Regla dura:** no revocar el binding legacy hasta que ambos consumidores pasen sus builds.

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

- Foundation publicada como package privado `0.1.2`; los adapters de consumidores permanecen fuera de esta task.
- Rollback: fijar consumidores a la versión previa o retirar el consumo del package; no se elimina ningún runtime existente.

## Delivery evidence — 2026-07-28

The foundation was originally published as `0.1.2` for this task. AXIS subsequently
published `0.1.4` with the consumer-governed status/progress contracts used by
`TASK-1591`; the original version evidence below remains historical.

- Repositorio privado: `efeoncepro/axis-design-system`.
- Packages privados publicados: `@efeoncepro/axis-tokens`, `@efeoncepro/axis-ui-contracts` y `@efeoncepro/axis-ui-registry`, `0.1.2`.
- Lab: `https://axis-design-system-lab.vercel.app`.
- Consumers Greenhouse/Globe con acceso `Read` en GitHub Packages; auth operativa documentada en
  `docs/operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md`.
- La integración runtime de adapters es scope explícito de `TASK-1591`, no evidencia de cierre de esta foundation.
