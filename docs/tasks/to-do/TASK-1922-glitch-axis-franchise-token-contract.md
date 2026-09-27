# TASK-1922 — Glitch en AXIS: token de franquicia, archivos oficiales y contrato

## Delta 2026-09-27

- **Guttery:** el operador confirmó la licencia para web y video (2026-09-27, segunda respuesta). La Open Question de Guttery queda resuelta; la task registra la referencia del contrato de licencia y sella la fuente.

Decisiones del operador (Julio Reyes) registradas en el [Delta 2026-09-27 del ADR de Glitch](../../architecture/GLITCH_GRAPHIC_LINE_DECISION_V1.md#delta-2026-09-27--decisiones-del-operador):

- **Aprobados la manzana como esfera de Glitch y el verde `#6ec207` como acento de franquicia** (Open Question 1
  resuelta). El token `glitchLine` ya no está bloqueado por esa aprobación; publicar (Slice 7) sigue exigiendo la
  autorización explícita del operador del push a `main` de AXIS y del tag.
- **Glitch es línea de servicio Growth** (Open Question 2 resuelta): el eslogan de la contraportada queda «Empower your
  Growth», como ya estaba.
- **Aprobado el alta de los 5 glifos Plastilina** (guardar, compartir, recomendar, comentar, deslizar) en
  `PLASTILINA_GLYPHS` (Open Question 3 resuelta en su parte principal): el gate del Slice 3 queda liberado. Si llevan
  versión en volumen sigue sin respuesta.
- **Numeración resuelta:** la próxima edición es la **#17** y la serie sigue la del blog y del pipeline editorial; los
  «#11»–«#14» del canvas son ejemplos de diseño. Deja de ser un conflicto fuera de alcance.
- **Siguen abiertas:** el mnemónico (Open Question 4: el operador pide evaluarlo y aprobarlo en una evaluación
  dedicada; mientras tanto el motion se publica sin punto de sincronía), y el paso del flujo de composición a `Accepted` (Open Question
  6: sin respuesta). El contenido del lower third (TASK-1924) está en definición con el operador.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-031`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `creative|brand|platform`
- Blocked by: `autorización explícita del operador del push a main de AXIS y del tag para PUBLICAR (Slice 7); la manzana y el verde quedaron aprobados el 2026-09-27; los slices locales en AXIS pueden avanzar sin push`
- Branch: `Greenhouse develop; AXIS main (commits locales; push a main sólo con CI verde y autorización explícita del operador); sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Los valores de la sub-línea de Glitch viven hoy como propuesta hardcodeada en el Lab de AXIS
(`apps/lab/src/data/glitch.ts`). Esta task los vuelve fuente de verdad en AXIS: el token de franquicia `glitchLine` en
`@efeoncepro/axis-tokens`, los archivos oficiales (wordmark, manzana y los 5 glifos Plastilina de Glitch) y el contrato
`efeonce.glitch-line` 0.1.0 (candidate) con resolver, validador, ejemplos y `pnpm glitch:resolve`. El Lab pasa a leer
el token, AXIS publica un release y Greenhouse fija la versión. Es la base que bloquea a TASK-1923 (Composer) y
TASK-1924 (movimiento).

## Why This Task Exists

El ADR `GLITCH_GRAPHIC_LINE_DECISION_V1` fija el objetivo del flujo de composición: «que ningún agente reinterprete la
línea»; los agentes llenan datos y nunca eligen coordenadas, colores ni plantilla. Hoy eso no es posible porque:

- No hay fuente de verdad versionada: el verde `#6ec207`, el navy `#022a4e`, las medidas de la cabecera, la regla de
  los bytes, la proporción de la manzana y las zonas seguras del reel viven en tres copias (la norma de Greenhouse, el
  archivo del Lab y el canvas), y la norma misma dice que al publicarse los tokens «deja de guardar números».
- Las reglas duras de Glitch (una esfera por pieza, verde nunca como texto sobre claro, nada sobre la cara del host ni
  sobre la interfaz de la app, rotación de portadas, contraste de pesos del titular, sin burbuja URL) sólo existen en
  prosa: nada las verifica antes de un render.
- El Artifact Composer (TASK-1923) y HyperFrames (TASK-1924) no pueden leer valores sin copiarlos a mano, que es
  exactamente la reinterpretación que el flujo quiere evitar.
- La manzana, el wordmark y los 5 glifos Plastilina de Glitch no están en los paquetes oficiales: se usan desde
  `public/branding/glitch/` de Greenhouse, desde un `path` pegado en el Lab y desde `ai-generations/`.

## Goal

- `@efeoncepro/axis-tokens` exporta `glitchLine` (color, tipografía, cabecera, bytes, manzana, zonas seguras por
  formato y motion), con lo heredado de La órbita **referenciado** desde `efeonceGraphicLine`, nunca copiado, y con
  pruebas de contraste como el resto de los tokens.
- `@efeoncepro/axis-brand-assets` sella el wordmark de Glitch (claro/oscuro) y la manzana; `PLASTILINA_GLYPHS` de
  `@efeoncepro/axis-graphic-line` suma los 5 glifos de Glitch con el método AXIS; Guttery entra sólo con licencia
  confirmada.
- `@efeoncepro/axis-ui-contracts` exporta el contrato `efeonce.glitch-line` 0.1.0 (candidate) con validador y
  resolver deterministas, ejemplos válidos e inválidos y `pnpm glitch:resolve`.
- El Lab `/references/glitch/` y su JSON leen el token y el contrato; ningún valor de Glitch queda hardcodeado.
- AXIS publica el release y Greenhouse fija las versiones nuevas sin mover un píxel de los catálogos existentes.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GLITCH_GRAPHIC_LINE_DECISION_V1.md` (decisión aceptada §1–§6; flujo **Proposed**; «Encaje
  verificado en el Artifact Composer»; «Trabajo a crear» filas a y e)
- `docs/architecture/EFEONCE_GRAPHIC_LINE_ORBIT_DECISION_V1.md` (la línea madre: lo heredado no se redefine)
- `docs/architecture/GREENHOUSE_GLITCH_AGENTIC_EDITORIAL_PIPELINE_DECISION_V1.md` (EPIC-031; TASK-1442 será la fuente
  futura del manifiesto de edición)
- `docs/architecture/GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md` (el consumidor principal, en TASK-1923)
- AXIS (repo hermano `/Users/jreye/Documents/axis-design-system`, remoto `efeoncepro/axis-design-system`):
  `docs/architecture/GRAPHIC_LINE_ORBIT_COMPOSITION_DECISION_V1.md`, `docs/architecture/SURFACE_COMPOSITION_DECISION_V1.md`,
  `docs/architecture/ICONOGRAPHY_DECISION_V1.md`, `docs/agent-composition/glitch.md`,
  `docs/agent-composition/iconography.md`

Reglas obligatorias:

- **Alcance sólo Glitch.** Nada de `glitchLine`, del contrato ni de los archivos nuevos se referencia desde
  `efeonceGraphicLine`, `efeonce.graphic-line-orbit` ni `efeonce.surface-composition`. Una prueba lo verifica.
- **AXIS es dueño de los valores.** Greenhouse no guarda números de Glitch una vez publicado el token; la norma pasa a
  citar el token.
- **Lo heredado se referencia, no se copia**: fondo `#001a33`, curvas y principios de motion, anatomía de la lente,
  familias Bricolage/Poppins y la regla de contraste del acento salen de `efeonceGraphicLine`/`axisTypography` por
  referencia en el código del token.
- **El estado de cada pieza viaja en el contrato** (`aprobada` / `propuesta` / `exploracion`, espejo del Lab y de la
  norma §9): el resolver falla cerrado ante una pieza no aprobada, igual que `recipe-not-approved` en
  `efeonce.surface-composition`. Esta task **no cambia** ningún estado de aprobación.
- **Nunca** publicar el token ni el contrato sin la aprobación explícita del operador de la manzana como esfera y el
  verde como acento (Open Question 1; **otorgada el 2026-09-27**, ver Delta) y sin su autorización del push y del tag.
  Hasta publicar, `glitchLine.status` no pasa de `candidate`.
- **Cross-repo**: la regla de push de AXIS es parte del contrato de esta task (ver `Out-of-band coordination`).

## Normative Docs

- `docs/operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md` (norma de la sub-línea; valores de referencia
  hasta que exista el token)
- `.claude/skills/efeonce-graphic-line/references/glitch.md` (y su espejo `.codex/`)
- `docs/operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md` (consumo de los paquetes privados en Greenhouse)
- `docs/operations/brand-sonic/EFEONCE_SONIC_IDENTITY_V1.md` (Glitch pendiente ahí: condiciona el punto de sincronía
  con el mnemónico)
- `docs/public-site/decisions/PDR-020-canales-propios-sistema-editorial.md` §6 (Glitch es franquicia, nunca marca
  social nueva)
- Canvas de referencia visual (privado): `https://claude.ai/artifact/N3Yg5cyz2zXa36SwtWVHYS` y los renders en AXIS
  `apps/lab/public/media/glitch/*.webp`

## Dependencies & Impact

### Depends on

- Aprobación del operador de la manzana como esfera y el verde como acento de franquicia (gate de publicación):
  **otorgada el 2026-09-27**.
- Aprobación del operador del alta de los 5 glifos Plastilina (gate del Slice 3): **otorgada el 2026-09-27**.
- Licencia de Guttery para web y video (gate del Slice 4; sin ella, el slice queda bloqueado con fallback documentado):
  **por confirmar con el operador (2026-09-27)**.
- AXIS en `main` `cf77452` (v0.6.0: `axis-tokens` 0.3.8, `axis-ui-contracts` 0.3.7, `axis-brand-assets` 0.3.4,
  `axis-graphic-line` 0.6.0, `axis-ui-registry` 0.3.1), las mismas versiones que fija Greenhouse hoy en `package.json`.
- `efeonceGraphicLine` (`packages/tokens/src/tokens.ts`, incluido `motion`, `lens` e `icons.volume`) y el patrón de
  contrato de `packages/contracts/src/surface-composition.ts` y `graphic-line.ts`.

### Blocks / Impacts

- **TASK-1923** (catálogos de Glitch en el Artifact Composer): bloqueada; su extensión `glitch` del brand pack lee
  `glitchLine`, y sus validadores semánticos reusan las reglas de `efeonce.glitch-line`.
- **TASK-1924** (overlays y apertura/cierre con HyperFrames): bloqueada; lee `glitchLine.motion` y las zonas seguras
  del reel.
- TASK-1442 (dominio/API de ediciones de EPIC-031): impacto indirecto; el manifiesto de edición futuro deberá
  producir un intent válido para `efeonce.glitch-line`.
- TASK-1337 (bloque Gutenberg del callout): sin impacto directo; el callout v2 queda fuera de esta task.
- AXIS Lab `https://axis.efeonce.org/references/glitch/` y su JSON: cambian de fuente (token), no de contenido.
- Skill `efeonce-graphic-line` (referencia `glitch.md`) y norma de Glitch en Greenhouse: pasan a citar el token.

### Files owned

AXIS (`/Users/jreye/Documents/axis-design-system`):

- `packages/tokens/src/tokens.ts` (bloque `glitchLine` y su export) y `packages/tokens/src/index.ts`
- `packages/tokens/src/tokens.test.ts` (pruebas de `glitchLine`)
- `packages/tokens/package.json` (versión)
- `packages/brand-assets/assets/glitch-*.svg` (nombres finales `[verificar]` convención `*-logo-positive|negative`)
- `packages/brand-assets/src/manifest.ts` (generado por `pnpm --filter @efeoncepro/axis-brand-assets seal`) y
  `packages/brand-assets/src/index.test.ts`, `packages/brand-assets/package.json`
- `packages/graphic-line/src/icons-plastilina-data.ts`, `packages/graphic-line/src/icons.test.ts`,
  `packages/graphic-line/package.json`
- `packages/brand-assets/assets/volume/{guardar,compartir,recomendar,comentar,deslizar}.png` y
  `packages/brand-assets/src/volume-manifest.ts` (sólo si el Slice 3 genera volúmenes; ver Detailed Spec)
- `packages/contracts/src/glitch-line.ts`, `packages/contracts/src/glitch-line.test.ts`,
  `packages/contracts/src/index.ts` (re-export), `packages/contracts/package.json`
- `docs/agent-composition/glitch-line-intent.schema.json`, `docs/agent-composition/glitch.md`
- `docs/examples/glitch/**`
- `scripts/resolve-glitch-line.mjs` y el script `glitch:resolve` en `package.json` raíz
- `apps/lab/src/data/glitch.ts`, `apps/lab/src/pages/references/glitch.astro`,
  `apps/lab/src/pages/references/glitch.json.ts`, `apps/lab/src/test/unit/glitch.test.ts`,
  `apps/lab/src/test/e2e/lab.spec.ts` (sólo el bloque de Glitch), `apps/lab/src/test/unit/iconography.test.ts`
  (conteo de glifos)
- `docs/architecture/` de AXIS: delta en `ICONOGRAPHY_DECISION_V1.md` y ADR nuevo o delta para `glitchLine` `[verificar]`
- `DESIGN.md` de AXIS si `pnpm design:check` lo exige al agregar tokens

Greenhouse (`/Users/jreye/Documents/greenhouse-eo`):

- `package.json` y `pnpm-lock.yaml` (bump de los paquetes AXIS)
- `docs/operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md` (delta: los valores pasan al token)
- `docs/architecture/GLITCH_GRAPHIC_LINE_DECISION_V1.md` (delta: fila a/e hechas; corregir que el Lab ya está en `main`)
- `.claude/skills/efeonce-graphic-line/references/glitch.md` y su espejo `.codex/skills/efeonce-graphic-line/references/glitch.md`

## Current Repo State

### Already exists

- AXIS `main` en `cf77452` (tag `v0.6.0`). El commit del Lab de Glitch `d5846e8` **ya está en `origin/main`** y, por
  lo tanto, publicado en `axis.efeonce.org`: el ADR y el inventario todavía dicen «rama `feat/glitch-line`, sin push»
  (drift a corregir en el Slice 8). La rama local `feat/glitch-line` sigue existiendo.
- `apps/lab/src/data/glitch.ts` (144 líneas): `glitchPalette` (fondo, acento, navy, texto, secundario como HEX
  literales), `glitchApple` (`d` del path + `viewBox: '539 0 118 154'`), `glitchElements` (cabecera, pesos, manzana,
  puntos, bytes, Guttery, secciones, iconografía en prosa con medidas), estados por pieza (`aprobada`/`propuesta`/
  `exploracion`), `glitchRotation`, `glitchNever`, `glitchFlow`, `glitchPending`, `glitchAgentPrompt`.
- `apps/lab/src/pages/references/glitch.astro` y `glitch.json.ts` (schema `axis.glitch-line.v1`, `franchise: 'glitch'`;
  ya importa `efeonceGraphicLine` de `@efeoncepro/axis-tokens`); `docs/agent-composition/glitch.md` (36 líneas).
- Pruebas: `apps/lab/src/test/unit/glitch.test.ts` (alcance, portadas aprobadas, propuestas, imágenes con alt, acento y
  navy como valores propuestos) y el test e2e de Glitch en `apps/lab/src/test/e2e/lab.spec.ts` (línea ~1622).
- Tokens: `efeonceGraphicLine` (`packages/tokens/src/tokens.ts:1341`) con `motion` (curvas `arrive/transform/exit`,
  overshoot, pulse, settle, wave, halo, letters, motionBlur), `surfaces`, `icons` (incluido `icons.volume`); pruebas de
  contraste con un helper `contrast` en `packages/tokens/src/tokens.test.ts`.
- Contratos: `packages/contracts/src/{graphic-line.ts,surface-composition.ts,email-signature.ts}` con el patrón
  `DesignPatternContract` (`id`, `version`, `lifecycle: 'candidate'`), `validate*Intent`, `resolve*Intent`, issues
  con código estable y versiones aceptadas; schemas en `docs/agent-composition/*.schema.json`; ejemplos en
  `docs/examples/{graphic-line,surfaces,...}`; comandos `orbit:resolve`, `surface:resolve`, `signature:resolve`,
  `collaboration:resolve` (`pnpm --filter @efeoncepro/axis-ui-contracts build && node scripts/resolve-*.mjs`).
- Iconografía: `PLASTILINA_GLYPHS` vive en `packages/graphic-line/src/icons-plastilina-data.ts` (paquete
  `@efeoncepro/axis-graphic-line`, **no** en brand-assets); el set está en 36 Trazo + 43 Plastilina y hay tres pruebas
  que fijan el conteo (`icons.test.ts:10`, `apps/lab/.../iconography.test.ts:26`). Comandos `icons:vectorize`,
  `icons:check`, `icons:volume` (`scripts/icons.mjs`, `scripts/icons-volume.mjs`).
- Brand assets: SVG sellados por `packages/brand-assets/scripts/seal.mjs` en `src/manifest.ts` (logos de productos
  Globe, Reach y Wave con variantes `positive`/`negative`); volúmenes Plastilina sellados en `volume-manifest.ts` con
  prueba de huérfanos.
- Release: `.github/workflows/release-packages.yml` publica en GitHub Packages al empujar un tag `v*.*.*`; el tag debe
  nombrar la versión de al menos un paquete y publica todo paquete cuya versión no exista aún. Un push a `main` de AXIS
  despliega `axis.efeonce.org` (proyecto Vercel `axis-design-system-lab`, README de AXIS).
- Greenhouse: wordmark en `public/branding/glitch/glitch-{light,dark}.svg`; los 5 glifos elegidos en
  `ai-generations/2026-09-26_glitch-iconos/elegidos/{guardar,compartir,recomendar,comentar,deslizar}.json` (pasan
  `icons:check`, área 537–560 u²); AXIS fijado en `package.json` (tokens 0.3.8, ui-contracts 0.3.7, brand-assets 0.3.4,
  graphic-line 0.6.0, ui-registry 0.3.1).

### Gap

- No existe `glitchLine` en `@efeoncepro/axis-tokens`; los valores de Glitch son literales del Lab.
- No existe el contrato `efeonce.glitch-line`, ni schema, ni ejemplos, ni `pnpm glitch:resolve`: ninguna regla de
  Glitch se verifica antes de un render.
- El wordmark de Glitch y la manzana no están sellados en `@efeoncepro/axis-brand-assets`.
- Los 5 glifos de Glitch no están en `PLASTILINA_GLYPHS` (y no tienen volumen).
- Guttery no tiene licencia confirmada ni rol tipográfico registrado.
- No hay valores de zonas seguras por formato ni de motion propios de Glitch (entradas/salidas de overlays, curva de
  los bytes, punto de sincronía con el mnemónico).
- Greenhouse no consume ninguna de estas piezas.

## Modular Placement Contract

- Topology impact: `ui-package`
- Current home: `repo hermano efeoncepro/axis-design-system: packages/tokens, packages/contracts (@efeoncepro/axis-ui-contracts), packages/brand-assets, packages/graphic-line y apps/lab; en Greenhouse sólo package.json, pnpm-lock.yaml y docs`
- Future candidate home: `ui-package`
- Boundary: `AXIS expone glitchLine (tokens), efeonce.glitch-line (validateGlitchLineIntent / resolveGlitchLineIntent) y los assets sellados; consumidores autorizados: el Lab de AXIS, TASK-1923 (extensión glitch del brand pack y validadores del catálogo) y TASK-1924 (HyperFrames). Ningún consumidor de La órbita lee glitchLine`
- Server/browser split: `los tokens y el contrato son datos y funciones puras isomórficas; los assets son archivos estáticos; el render ocurre en el consumidor (Composer en el Job artifact-worker, HyperFrames local)`
- Build impact: `none en Greenhouse más allá del bump de dependencias ya presentes; en AXIS, nuevas pruebas en los paquetes y en el Lab`
- Extraction blocker: `none — AXIS ya es un repositorio y paquetes separados`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-lite`
- Impacto principal: `integration`
- Source of truth afectado: token `glitchLine` de `@efeoncepro/axis-tokens` y contrato `efeonce.glitch-line` de
  `@efeoncepro/axis-ui-contracts` pasan a ser la fuente de verdad de los valores y reglas de Glitch; la norma de
  Greenhouse y el Lab pasan a ser derivados
- Consumidores afectados: Lab de AXIS (`/references/glitch/` y `/references/glitch.json`); en TASK-1923 el brand pack
  y los catálogos del Artifact Composer; en TASK-1924 las composiciones HyperFrames; agentes vía el JSON del Lab
- Runtime target: `local`

### Contract surface

- Contrato existente a respetar: `DesignPatternContract` (`packages/contracts/src/index.ts`), patrón de
  `surface-composition.ts` (versiones aceptadas, issues con código estable, falla cerrado ante receta no aprobada),
  `efeonceGraphicLine` (no se modifica), schema JSON del Lab `axis.glitch-line.v1`
- Contrato nuevo o modificado:
  - `glitchLine` (export de `@efeoncepro/axis-tokens`, tipo `GlitchLine`) `[verificar]` nombre final frente a la
    convención `efeonce*` de los exports de marca; decidirlo en Discovery y registrarlo en el ADR de AXIS
  - `AXIS_GLITCH_LINE_CONTRACT` (`id: 'efeonce.glitch-line'`, `version: '0.1.0'`, `lifecycle: 'candidate'`),
    `validateGlitchLineIntent`, `resolveGlitchLineIntent`, `AXIS_GLITCH_LINE_ISSUE_CODES`
  - `docs/agent-composition/glitch-line-intent.schema.json`
  - `pnpm glitch:resolve -- --intent <intent.json> [--out <manifest.json>]`
  - JSON del Lab: campos aditivos `tokens` y `contract` (el schema sigue `axis.glitch-line.v1`)
- Backward compatibility: `compatible` — todo es aditivo; `efeonceGraphicLine`, `efeonce.graphic-line-orbit` y
  `efeonce.surface-composition` no cambian, y los catálogos de Greenhouse no mueven un píxel (lo prueba el visual gate)
- Full API parity: el resolver es el primitive; sus consumidores son el CLI `glitch:resolve`, el Lab, TASK-1923 y
  TASK-1924. La ruta gobernada en Greenhouse (command/API/MCP) queda para TASK-1921/TASK-1923, igual que en TASK-1919

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna; no hay base de datos
- Invariantes que no se pueden romper:
  - `glitchLine` referencia desde `efeonceGraphicLine` lo heredado (fondo, curvas de motion, lente, familias, regla de
    contraste): una prueba compara identidad de valor, no un literal duplicado.
  - Ningún valor de `efeonceGraphicLine` ni de sus contratos referencia `glitchLine` (aislamiento de franquicia).
  - Un intent sin `franchise: 'glitch'` falla con issue; nunca se resuelve como pieza de Efeonce.
  - Un intent con más de una esfera (manzana + lente o dos manzanas) falla.
  - El verde nunca resuelve como texto, borde ni separador sobre superficie clara.
  - Ningún overlay declarado cae sobre la zona de la cara del host ni sobre la franja de interfaz de la app del formato.
  - La plantilla de portada nunca repite la de la semana anterior (el intent trae `previousCoverTemplate` como dato).
  - El titular exige contraste de pesos (entrada ligera + remate pesado condensado); todo en el peso pesado falla.
  - La burbuja URL no se resuelve nunca en Glitch.
  - Una pieza en estado `propuesta` o `exploracion` falla cerrado con `piece-not-approved`; no hay fallback a otra.
  - Mismo intent + misma versión ⇒ mismo manifiesto, byte a byte (sin fechas ni aleatoriedad).
- Write-target allowlist: `no aplica — sin escrituras a base; las salidas son paquetes publicados y archivos del Lab`
- Tenant/space boundary: `sin datos de tenant — marca propia de Efeonce (franquicia Glitch)`
- Idempotency/concurrency: resolver puro; el release es idempotente (el workflow salta versiones ya publicadas)
- Audit/outbox/history: sin outbox; la historia es el git de AXIS, el tag y la nota de release

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `glitchLine.status: 'candidate'` y contrato `lifecycle: 'candidate'`; publicación sólo tras el gate
  del operador
- Backfill plan: sin backfill; el Lab se migra en el Slice 6 dentro del mismo release
- Rollback path: fijar en Greenhouse la versión anterior de AXIS (`package.json` + lock); en AXIS, revertir los commits
  y publicar un patch; las versiones publicadas en GitHub Packages no se borran
- External coordination: operador (aprobaciones de manzana/verde, glifos, Guttery, push a `main` de AXIS y tag)

### Security and access

- Auth/access gate: paquetes privados de GitHub Packages con el acceso vigente (runbook de consumo de AXIS); sin
  capability nueva en Greenhouse
- Sensitive data posture: sin datos sensibles; la licencia de Guttery es un dato contractual, se registra su referencia,
  nunca el documento
- Error contract: el validador devuelve issues `{ code, path, message }` con código estable y mensaje en es-CL; el CLI
  sale con código distinto de cero y lista los issues; nunca stack trace crudo como único mensaje
- Abuse/rate-limit posture: sin exposición de red

### Runtime evidence

- Local checks: `pnpm build`, `pnpm typecheck`, `pnpm test`, `pnpm lint` y `pnpm design:check` en AXIS;
  `pnpm glitch:resolve` sobre cada ejemplo; `pnpm icons:check` sobre los 5 glifos; `pnpm --dir apps/lab test` y
  `pnpm --dir apps/lab test:e2e` (bloque Glitch)
- DB/runtime checks: sin base de datos
- Integration checks: CI de AXIS verde en `main`; run de `release-packages.yml` verde con las versiones nuevas
  publicadas; `https://axis.efeonce.org/references/glitch.json` sirve `tokens` y `contract`; en Greenhouse
  `pnpm install --frozen-lockfile`, `pnpm typecheck`, una importación de `glitchLine` y del resolver desde un test focal
  `[verificar]` ubicación, y `pnpm composer:visual-gate --catalog=graphic-line` a cero píxeles
- Reliability signals/logs: sin señal; los gates son la vigilancia
- Production verification sequence: ver `Rollout Plan & Risk Matrix`

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] *(No aplica: la task no crea tablas ni escribe en base de datos.)* Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR: es un control de frontera deliberado, no un inventario que se actualiza solo.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] *(No aplica: no toca datos sensibles; los errores del validador son issues con código estable.)* Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

Todos los slices 1–7 se commitean en AXIS `main` **localmente**; nada se empuja hasta el Slice 7. Cada slice deja
`pnpm build && pnpm typecheck && pnpm test` verde en AXIS.

### Slice 1 — Token `glitchLine`: color, tipografía, cabecera, bytes y manzana

- Bloque `glitchLine` en `packages/tokens/src/tokens.ts`, exportado desde `packages/tokens/src/index.ts`, con
  `status: 'candidate'`, `franchise: 'glitch'` y `scope` (hereda / exclusivo / nunca, desde `glitchScope` del Lab).
- `color`: `ground` = referencia a `efeonceGraphicLine.color.dark` (`#001a33`); `accent` `#6ec207`; `navy` `#022a4e`;
  `text` `#e6edf3` y `textStrong` `#ffffff`; `sub` `#9fb3c8`; `line` `#1d3a57`; `onLight` (el navy como tinta sobre
  claro) y la regla `accentOnLight: 'never-text-border-separator'`.
- `type`: roles `headlineEntry` (Bricolage 300, `wdth` 100, 0,72 em), `headlineClose` (Bricolage 800 condensada,
  `font-stretch: 78%`, `wdth` 78), `tracking` +0,01 em en titulares, `label` (Poppins 600 versalitas espaciadas),
  `body`/`subtitle` (Poppins), `narrator` (Guttery, en el acento, rotación −3° a −5°) con `licenseStatus` explícito;
  las familias por referencia a los tokens tipográficos existentes `[verificar]` `axisTypography`/`axisAdvertising`.
- `masthead`: wordmark 290 px de ancho en 1080; «EDICIÓN» Poppins 600 16 px tracking 0,24 em; «#N» Bricolage 92 px
  («#» 300 blanco, número 800 condensado en el acento); una fila centrada en vertical; `rule: 'none'` (sin línea).
- `bytes`: tamaño de celda, borde por el que se desarma (`bottom` | `side`), duotono `#001a33 → #cfe4fa` sobre navy
  apagado, `neverOverFace: true`, la manzana en bytes a 8 bits por celda; valores de celda `[verificar]` contra las
  láminas aprobadas del canvas.
- `apple`: `viewBox` `539 0 118 154` (proporción 118:154), tamaño relativo al cuerpo del titular que cierra, halo
  (referencia a `efeonceGraphicLine` halo), `perPiece: 1`; el `path` vive en brand-assets (Slice 3), el token lo
  referencia por id.
- Pruebas en `packages/tokens/src/tokens.test.ts`: identidad de lo heredado; contraste texto/sub/acento sobre `ground`
  ≥ 4,5:1 donde son texto; verde sobre blanco < 3:1 queda codificado como prohibido; aislamiento (ningún valor de
  `efeonceGraphicLine` referencia `glitchLine`).

### Slice 2 — Token `glitchLine`: zonas seguras por formato y motion

- `safeZones` por formato, en px del lienzo:
  - `linkedin-4x5` (1080 × 1350): cabecera, foto de la lámina interior (176–626), franja «EL MICRÓFONO SE ABRE»,
    bloque de titular/Drop, avance n/8, pie «Desliza» y firma `[verificar]` todas las medidas contra las láminas
    aprobadas.
  - `landscape-16x9` (1920 × 1080): cabecera, zona de texto y firma para banners y vlog `[verificar]` contra los renders
    `blog-banner-*` y `vlog-*`.
  - `reel-9x16` (1080 × 1920): interfaz de la app arriba 0–220 y abajo desde 1500, botones desde x 940, cabecera
    240–440, texto 1150–1480, cara del host como zona prohibida declarada por el intent (no fija).
- `motion`: entradas y salidas de overlays (duración, curva por referencia a `efeonceGraphicLine.motion.curves`
  `arrive`/`exit`), curva y cadencia de la falla en bytes (desarmar/armar), los tres puntos (dos + el tercero en bytes;
  en el cierre, el tercero se resuelve en la manzana), `reducedMotion` y el punto de sincronía con el mnemónico
  **sólo si el operador lo decidió** (Open Question 4); si no, el campo no se publica y TASK-1924 hereda el bloqueo.
- Pruebas: cada zona cabe en su lienzo; las zonas de interfaz y de texto del reel no se solapan; ninguna duración de
  motion es literal fuera del token.

### Slice 3 — Archivos oficiales: wordmark, manzana y 5 glifos Plastilina (gate: aprobación de los glifos, liberado el 2026-09-27)

- Wordmark de Glitch claro y oscuro en `packages/brand-assets/assets/` desde `public/branding/glitch/glitch-{light,dark}.svg`
  de Greenhouse `[verificar]` cuál es cuál y la convención de nombre (`glitch-logo-positive|negative` como
  Globe/Reach/Wave); la manzana como SVG propio extraído del path oficial del wordmark (caja 539,0,118,154), sin
  redibujar; sellado con `pnpm --filter @efeoncepro/axis-brand-assets seal`; pruebas de sello y de huérfanos.
- Alta de `guardar`, `compartir`, `recomendar`, `comentar`, `deslizar` en `PLASTILINA_GLYPHS`
  (`packages/graphic-line/src/icons-plastilina-data.ts`) desde los JSON elegidos, con `pnpm icons:check` verde por
  glifo; si alguna clave ya existe en el catálogo (p. ej. `like`, `compartir`) se resuelve por concepto, una clave por
  concepto, sin duplicar; conteos de `icons.test.ts` y `iconography.test.ts` actualizados.
- Volumen: generar las 5 versiones en volumen con `pnpm icons:volume` si la política D24 lo exige para todo Plastilina
  `[verificar]` (la prueba de brand-assets exige ≥ 18, no paridad); si no se generan, dejarlo declarado en la guía.
- Delta en `docs/architecture/ICONOGRAPHY_DECISION_V1.md` y `docs/agent-composition/iconography.md` de AXIS.

### Slice 4 — Guttery (gate: licencia confirmada para web y video)

- Con licencia confirmada: rol `narrator` activo en el token, referencia de la licencia (sin el documento) y el
  binario sólo donde la convención de AXIS lo permita (los tokens no llevan binarios de fuentes; el sellado de la fuente
  para el render lo hace la extensión `glitch` del brand pack en TASK-1923) `[verificar]` si brand-assets acepta fuentes.
- Sin licencia: el slice queda **bloqueado**; el token publica `narrator.licenseStatus: 'pending'` y un fallback
  documentado (las muletillas en Poppins 600 itálica en el acento, con la misma rotación) `[verificar]` el fallback con el
  operador; el validador emite un issue de advertencia cuando un intent pide Guttery sin licencia.

### Slice 5 — Contrato `efeonce.glitch-line` 0.1.0 (candidate)

- `packages/contracts/src/glitch-line.ts`: `AXIS_GLITCH_LINE_CONTRACT`, tipos del intent (franquicia, formato, pieza,
  estado, plantilla de portada, `previousCoverTemplate`, titular con entrada/remate, esferas declaradas, overlays con
  su caja, zona de cara del host, superficie clara/oscura, pide burbuja URL sí/no), `validateGlitchLineIntent`,
  `resolveGlitchLineIntent` (manifiesto: valores del token resueltos por pieza y formato, zonas, estado y contrato).
- Códigos de issue estables (nombres finales en Discovery): `franchise-required`, `version-unsupported`,
  `format-invalid`, `piece-invalid`, `piece-not-approved`, `sphere-count-exceeded`, `accent-text-on-light`,
  `overlay-over-host-face`, `overlay-over-app-ui`, `cover-template-repeated`, `headline-weight-contrast-missing`,
  `url-bubble-not-applicable`, `bytes-over-face`, `narrator-font-unlicensed`.
- Re-export en `packages/contracts/src/index.ts`; `glitch-line.test.ts` con un caso por issue y el determinismo.
- `docs/agent-composition/glitch-line-intent.schema.json`; `docs/examples/glitch/` con intents y manifiestos válidos
  (portada A, B y C, lámina interior, noticia 1, contraportada, overlay del reel) e inválidos (dos esferas, portada
  repetida, verde como texto sobre claro, overlay sobre la cara, pieza propuesta).
- `scripts/resolve-glitch-line.mjs` y `"glitch:resolve": "pnpm --filter @efeoncepro/axis-ui-contracts build && node scripts/resolve-glitch-line.mjs"`
  en el `package.json` raíz, al estilo de `orbit:resolve`/`surface:resolve`.
- `docs/agent-composition/glitch.md` reescrita para agentes: intent → `glitch:resolve` → manifiesto; nunca valores
  a mano.

### Slice 6 — El Lab lee el token y el contrato

- `apps/lab/src/data/glitch.ts`: `glitchPalette`, `glitchApple`, medidas de `glitchElements` y la regla de rotación
  salen de `glitchLine` y de brand-assets; quedan en el archivo sólo el texto editorial y la lista de piezas con su
  estado y sus imágenes. `glitchPending` se actualiza con lo que siga pendiente.
- `glitch.astro` muestra el origen (token/contrato y versión); `glitch.json.ts` agrega `tokens` (el bloque
  `glitchLine`) y `contract` (`id`, `version`, `lifecycle`, códigos de issue), manteniendo `schema: 'axis.glitch-line.v1'`.
- `glitch.test.ts`: los valores vienen del token (no hay HEX literal de Glitch en `data/glitch.ts`); los estados no
  cambian. `lab.spec.ts`: el JSON trae `contract.id === 'efeonce.glitch-line'` y sin scroll horizontal.

### Slice 7 — Release de AXIS (gate: aprobación del operador de la manzana y el verde, otorgada el 2026-09-27, y del push)

- Versiones: `axis-tokens` 0.3.8 → 0.4.0, `axis-ui-contracts` 0.3.7 → 0.4.0 `[verificar]` minor o patch según la
  política de AXIS, `axis-brand-assets` 0.3.4 → 0.3.5, `axis-graphic-line` 0.6.0 → 0.7.0 (como D26 llevó a 0.6.0);
  `[verificar]` al ejecutar que ninguna otra sesión publicó esas versiones antes.
- Nota de release y deltas de ADR en AXIS; `glitchLine.status` pasa a lo que el operador apruebe (si aprueba el token
  de franquicia, sigue `candidate` como contrato pero sale de «exploración» en el Lab).
- Con autorización explícita del operador: push a `main` (despliega el Lab), esperar CI verde, tag `vX.Y.Z` que nombre
  la versión de al menos un paquete, push del tag y run de `release-packages.yml` verde.

### Slice 8 — Consumo en Greenhouse y documentación

- Bump de los paquetes AXIS en `package.json` + `pnpm-lock.yaml` (patrón de `016d0a183` y `8d817f29e`); `pnpm install
  --frozen-lockfile`, `pnpm typecheck`, test focal que importa `glitchLine` y `resolveGlitchLineIntent` `[verificar]`
  ubicación del test; `pnpm composer:visual-gate --catalog=graphic-line` a cero píxeles.
- Delta en `GLITCH_GRAPHIC_LINE_V1.md` (los valores pasan al token; la norma deja de guardar números), delta en
  `GLITCH_GRAPHIC_LINE_DECISION_V1.md` (filas a y e hechas; el Lab ya estaba en `main` desde `d5846e8`), referencia
  `glitch.md` de la skill `efeonce-graphic-line` y su espejo `.codex/` (`pnpm skills:mirrors`).
- Delta en TASK-1923 y TASK-1924 con los nombres finales del token, del contrato y de los assets.

## Out of Scope

- Catálogos, plantillas, brand pack, selector de rotación y validadores del Artifact Composer: **TASK-1923**.
- Movimiento, overlays animados, render con alfa y HyperFrames: **TASK-1924** (esta task sólo publica los valores de
  motion).
- Callout Glitch v2 y el bloque de WordPress `efeoncepro/glitch-drop` (TASK-1337 y su sucesora, si el operador lo aprueba).
- Cualquier pieza, token o regla de Efeonce o de La órbita: `efeonceGraphicLine`, `efeonce.graphic-line-orbit` y
  `efeonce.surface-composition` no se tocan.
- Cambiar estados de aprobación de piezas (lente, blog, vlog, reel, tarjetas finales siguen en propuesta).
- La pieza sonora de Glitch y el mnemónico (identidad sonora).
- El dominio de ediciones (TASK-1442). La numeración ya no es un conflicto: el operador resolvió el 2026-09-27 que la
  próxima edición es la #17 (la serie del blog y del pipeline editorial).
- Ruta productiva gobernada en Greenhouse (command, API, MCP): TASK-1921/TASK-1923.

## Detailed Spec

**Forma propuesta del token** (valores de la norma §2 y del Lab; nombres finales en Discovery):

```ts
export const glitchLine = {
  status: 'candidate',
  franchise: 'glitch',
  inheritsFrom: 'efeonceGraphicLine',
  color: { ground: efeonceGraphicLine.color.dark, accent: '#6ec207', navy: '#022a4e', text: '#e6edf3',
           textStrong: '#ffffff', sub: '#9fb3c8', line: '#1d3a57', accentOnLight: 'never-text-border-separator' },
  type: { headlineEntry: {…}, headlineClose: {…}, label: {…}, body: {…}, narrator: { family: 'Guttery', licenseStatus: 'pending', rotationDeg: [-5, -3] } },
  masthead: { wordmarkWidthPx: 290, canvasWidthPx: 1080, editionLabel: {…}, editionNumber: {…}, rule: 'none' },
  bytes: { cellPx: '[verificar]', edges: ['bottom', 'side'], duotone: ['#001a33', '#cfe4fa'], neverOverFace: true, appleBitsPerCell: 8 },
  apple: { assetId: 'glitch-apple', viewBox: [539, 0, 118, 154], perPiece: 1, halo: efeonceGraphicLine.halo /* [verificar] ruta */ },
  safeZones: { 'linkedin-4x5': {…}, 'landscape-16x9': {…}, 'reel-9x16': { appUiTop: [0, 220], appUiBottomFrom: 1500, buttonsFromX: 940, masthead: [240, 440], text: [1150, 1480] } },
  motion: { overlayIn: {…, curve: efeonceGraphicLine.motion.curves.arrive }, overlayOut: {…, curve: efeonceGraphicLine.motion.curves.exit }, bytes: {…}, dots: {…}, mnemonicSync: /* sólo si se decidió */ },
  pieces: { /* id → status: aprobada | propuesta | exploracion, formato y viewport */ },
  coverRotation: { templates: ['A', 'B', 'C'], rule: 'never-same-as-previous-week', chooseBy: { strongPhoto: 'A', standalonePov: 'B', severalEqualNews: 'C' } }
} as const
```

**Contrato**: mismo esqueleto que `surface-composition.ts` (constante del contrato, versiones aceptadas, issues con
`code`/`path`/`message`, `validate*` que acumula issues y `resolve*` que corta si hay alguno). La regla de rotación se
valida con dato del intent (`previousCoverTemplate`): el validador no consulta ninguna base. La esfera se cuenta desde
lo que el intent declara (manzana, lente de La órbita); la lente de Glitch usa la anatomía de `efeonceGraphicLine.lens`
y, si está, el POV no cierra con manzana.

**Estados de pieza** (espejo del Lab al 2026-09-27): aprobadas `portada-a`, `portada-b`, `portada-c`, `interior`,
`interior-noticia-1`, `contraportada`; propuestas `interior-lente`, `blog-banner-{a,b,c}`, maqueta del post,
`vlog-*`, `reel-*`, tarjetas finales; exploración: historia 9:16 y carrusel panorámico. El resolver resuelve sólo
aprobadas; una opción `allowProposal` para el Lab `[verificar]` si hace falta mostrar propuestas sin romper la regla.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 5 → Slice 6 → Slice 7 → Slice 8.
- Slice 3 puede correr en paralelo con 1–2 una vez aprobados los glifos; Slice 5 lo necesita para declarar la manzana
  por id.
- Slice 4 corre cuando exista respuesta sobre la licencia; si sigue sin licencia, el Slice 7 publica con
  `licenseStatus: 'pending'`.
- Slice 7 MUST NOT correr sin la aprobación del operador de la manzana y el verde (Open Question 1, otorgada el
  2026-09-27) y sin su autorización del push: publicar es irreversible en GitHub Packages.
- Slice 8 MUST esperar el run verde de `release-packages.yml`: Greenhouse fija versiones exactas y no puede instalar lo
  que no existe.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El push a `main` de AXIS despliega el Lab con un estado a medio hacer | Lab `axis.efeonce.org` (Vercel) | medium | commits locales hasta el Slice 7; push sólo con CI verde local y autorización | deploy del Lab con error o JSON sin `contract` |
| Un tag publica versiones rotas que Greenhouse no puede des-fijar | GitHub Packages | low | el workflow re-corre build, typecheck y tests antes de publicar; tag sólo tras CI verde | run de `release-packages.yml` rojo |
| Un rasgo de Glitch se filtra a La órbita (p. ej. el verde en un token de Efeonce) | marca / AXIS | low | prueba de aislamiento en tokens y contratos; revisión del diff de `efeonceGraphicLine` (debe ser vacío) | test de aislamiento rojo |
| Valores de zonas seguras o bytes que no coinciden con las láminas aprobadas | marca | medium | medir contra los renders del canvas y del Lab; marcar `[verificar]` hasta medir; el operador revisa el Lab antes del push | revisión del operador |
| Colisión de clave de glifo (p. ej. `compartir`, `like`) con el catálogo actual | iconografía | medium | una clave por concepto; `icons:check` y pruebas de conteo | `icons.test.ts` rojo |
| Guttery publicado sin licencia | legal / marca | low | slice bloqueado sin licencia; issue `narrator-font-unlicensed` | issue del validador |
| Otra sesión publica versiones de AXIS o edita `tokens.ts` en paralelo | checkout de AXIS | medium | `git fetch` y `git log origin/main` antes de versionar; re-verificar versiones libres en el Slice 7 | conflicto al empujar |
| El bump rompe los catálogos de La órbita en Greenhouse | Artifact Composer | low | cambios aditivos; `pnpm composer:visual-gate --catalog=graphic-line` a cero píxeles antes de commitear | visual gate rojo |

### Feature flags / cutover

Sin flag: son paquetes versionados y el cambio es aditivo. El «cutover» es el bump de versión en Greenhouse; ningún
consumidor lee `glitchLine` hasta TASK-1923/TASK-1924. El control de publicación es el gate del operador (manzana y
verde) y `glitchLine.status`/`lifecycle: 'candidate'`.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1–2 | revertir el commit local del token en AXIS | minutos | si |
| Slice 3 | revertir assets, sellos y glifos; recalcular el manifiesto con `seal` | minutos | si |
| Slice 4 | revertir el rol `narrator` o volver a `licenseStatus: 'pending'` | minutos | si |
| Slice 5 | revertir `glitch-line.ts`, schema, ejemplos y script | minutos | si |
| Slice 6 | revertir los archivos del Lab; si ya se empujó, push del revert despliega la versión previa | minutos | si |
| Slice 7 | las versiones publicadas no se borran: publicar un patch que revierta y avisar a los consumidores | horas | parcial |
| Slice 8 | fijar en Greenhouse las versiones anteriores de AXIS (`package.json` + lock) y revertir los deltas de docs | minutos | si |

### Production verification sequence

1. AXIS local: `pnpm build && pnpm typecheck && pnpm test && pnpm lint && pnpm design:check`.
2. `pnpm glitch:resolve` con cada ejemplo válido (sale 0) y con cada inválido (sale distinto de 0 con el issue esperado).
3. `pnpm icons:check` sobre los 5 glifos; `pnpm --dir apps/lab test` y `pnpm --dir apps/lab test:e2e` (bloque Glitch).
4. El operador revisa el Lab local (`/references/glitch/`) y autoriza el push (manzana y verde ya aprobados el
   2026-09-27).
5. Push a `main` de AXIS → CI verde → el Lab desplegado sirve `/references/glitch.json` con `tokens` y `contract`.
6. Tag → `release-packages.yml` verde → versiones visibles en GitHub Packages.
7. Greenhouse: bump, `pnpm install --frozen-lockfile`, `pnpm typecheck`, test focal, visual gate de `graphic-line` a
   cero píxeles, `pnpm local:check`.

### Out-of-band coordination required

- **Operador (Julio Reyes):** aprobación de la manzana como esfera y el verde como acento (otorgada el 2026-09-27);
  aprobación del alta de los 5 glifos (otorgada el 2026-09-27); confirmación de la licencia de Guttery (por confirmar);
  autorización explícita del push a `main` de AXIS y del tag.
- **Regla de push a `main` de AXIS:** un push a `main` despliega `axis.efeonce.org` y un tag publica paquetes que los
  consumidores fijan por versión exacta. Antes de empujar: CI verde local, `git log origin/main..HEAD` revisado, el
  último deploy del Lab en verde y autorización del operador en chat. Nunca `--no-verify`; nunca empujar commits ajenos
  que estén en el `main` local sin revisarlos (cross-repo action safety de `CLAUDE.md`).
- Sesiones paralelas que trabajen en AXIS (iconografía, superficies): coordinar versiones antes del Slice 7.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `@efeoncepro/axis-tokens` exporta `glitchLine` con `color`, `type`, `masthead`, `bytes`, `apple`, `safeZones`,
      `motion`, `pieces` y `coverRotation`.
- [ ] El fondo, las curvas de motion, la lente y las familias de `glitchLine` son referencias a `efeonceGraphicLine` /
      tokens tipográficos (prueba de identidad de valor, sin literales duplicados).
- [ ] Ningún valor de `efeonceGraphicLine`, `efeonce.graphic-line-orbit` ni `efeonce.surface-composition` referencia
      `glitchLine` ni sus assets, y el diff de esos bloques en esta task es vacío.
- [ ] Las pruebas de contraste de `glitchLine` pasan: texto y secundario ≥ 4,5:1 sobre el fondo; el verde sobre blanco
      queda codificado como prohibido para texto, borde y separador.
- [ ] Las zonas del reel 9:16 declaran interfaz 0–220 arriba, desde 1500 abajo, botones desde x 940, cabecera 240–440 y
      texto 1150–1480, y ninguna zona se sale de su lienzo.
- [ ] El wordmark de Glitch (claro y oscuro) y la manzana están sellados en `@efeoncepro/axis-brand-assets` y sus
      pruebas de sello y huérfanos pasan.
- [ ] Los 5 glifos de Glitch están en `PLASTILINA_GLYPHS`, cada uno pasa `pnpm icons:check` y los conteos de las
      pruebas reflejan el set nuevo.
- [ ] Guttery tiene rol y licencia confirmada, **o** el slice quedó bloqueado con `licenseStatus: 'pending'`, fallback
      documentado e issue `narrator-font-unlicensed`.
- [ ] `@efeoncepro/axis-ui-contracts` exporta `efeonce.glitch-line` 0.1.0 `candidate` con `validateGlitchLineIntent` y
      `resolveGlitchLineIntent`, y hay una prueba por cada código de issue.
- [ ] Un intent sin `franchise: 'glitch'`, con dos esferas, con verde como texto sobre claro, con un overlay sobre la
      cara del host o sobre la interfaz de la app, con la misma portada que la semana anterior, con el titular todo en
      el peso pesado o con burbuja URL falla con su issue.
- [ ] Una pieza `propuesta` o `exploracion` falla con `piece-not-approved`.
- [ ] Dos resoluciones del mismo intent producen manifiestos idénticos byte a byte.
- [ ] `pnpm glitch:resolve` resuelve cada ejemplo válido de `docs/examples/glitch/` y rechaza cada inválido con código
      de salida distinto de cero.
- [ ] `apps/lab/src/data/glitch.ts` no contiene ningún HEX ni medida de Glitch; el Lab y `glitch.json` leen el token y
      el JSON expone `tokens` y `contract`.
- [ ] Pruebas unitarias y e2e del Lab (bloque Glitch) en verde.
- [ ] La publicación ocurrió sólo después de la aprobación explícita del operador de la manzana y el verde, registrada
      en el ADR de Glitch con fecha.
- [ ] CI de AXIS verde en `main` y run de `release-packages.yml` verde con las versiones nuevas publicadas.
- [ ] Greenhouse fija las versiones nuevas, `pnpm install --frozen-lockfile` y `pnpm typecheck` pasan, y
      `pnpm composer:visual-gate --catalog=graphic-line` queda a cero píxeles.
- [ ] Norma, ADR de Glitch y referencia `glitch.md` de la skill (con espejo `.codex/`) citan el token; el drift «Lab sin
      push» quedó corregido.

## Verification

- AXIS: `pnpm build`, `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm design:check`, `pnpm glitch:resolve`,
  `pnpm icons:check`, `pnpm --dir apps/lab test`, `pnpm --dir apps/lab test:e2e`
- Greenhouse: `pnpm install --frozen-lockfile`, `pnpm typecheck`, test focal de importación,
  `pnpm composer:visual-gate --catalog=graphic-line`, `pnpm local:check`, `pnpm skills:mirrors`,
  `pnpm task:lint --task TASK-1922`
- Manual: revisión del operador del Lab `/references/glitch/` antes del push

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] TASK-1923 y TASK-1924 recibieron un `## Delta` con los nombres finales del token, del contrato, de los códigos de
      issue y de los assets
- [ ] la referencia `glitch.md` de la skill `efeonce-graphic-line` quedó actualizada y espejada
- [ ] el ADR de Glitch registra con fecha las aprobaciones del operador que habilitaron la publicación

## Follow-ups

- TASK-1923: catálogos de Glitch en el Artifact Composer (consumen `glitchLine` y reusan las reglas del contrato).
- TASK-1924: movimiento con HyperFrames (consume `glitchLine.motion` y las zonas del reel).
- Punto de sincronía con el mnemónico cuando la identidad sonora decida la pieza de Glitch.
- Promover `efeonce.glitch-line` de `candidate` a `stable` tras la primera edición compuesta con el contrato.
- Callout v2 en el bloque WordPress si el operador lo aprueba.

## Open Questions

1. ~~**Gate de publicación:** ¿apruebas la manzana como esfera de Glitch y el verde `#6ec207` como acento de franquicia
   (hoy en exploración)? Sin esta aprobación el token y el contrato no se publican (Slice 7).~~ **Resuelta el
   2026-09-27:** aprobados ambos. Publicar sigue exigiendo la autorización del push y del tag.
2. ~~**Línea de servicio de Glitch:** ¿Growth (recomendada) o Brand? Afecta el eslogan de la contraportada («Empower your
   Growth», con «Growth» en blanco/acento) y lo que el token declara para esa pieza.~~ **Resuelta el 2026-09-27:**
   Growth; el eslogan queda «Empower your Growth».
3. ~~**Glifos Plastilina:** ¿apruebas el alta de `guardar`, `compartir`, `recomendar`, `comentar` y `deslizar` en
   `PLASTILINA_GLYPHS`?~~ **Resuelta el 2026-09-27:** alta aprobada; el Slice 3 queda liberado. **Sigue abierto:** ¿deben
   llevar versión en volumen?
4. **Mnemónico (abierta):** el operador pidió **evaluarlo y aprobarlo** en una evaluación dedicada (2026-09-27). Hasta
   entonces el motion se publica sin punto de sincronía y TASK-1924 espera esa evaluación.
5. **Guttery (resuelta 2026-09-27):** el operador confirmó la licencia para web y video («En gutery tenemos
   licencia»). El Slice 4 registra la referencia del contrato de licencia y sella la fuente; el fallback no aplica.
6. **Flujo de composición del ADR (abierta):** sigue `Proposed`, sin respuesta del operador. ¿Lo aceptas junto con esta
   task, o esta task avanza sólo como fuente de valores y el flujo se acepta al abrir TASK-1923?
7. **Nombre del export:** `glitchLine` (top-level) vs una rama bajo la línea de Efeonce; se recomienda top-level para
   que ningún consumidor de La órbita lo reciba por accidente.
