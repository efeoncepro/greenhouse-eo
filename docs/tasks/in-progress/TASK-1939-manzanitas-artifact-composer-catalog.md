# TASK-1939 — Catálogo `manzanitas` del Artifact Composer: carruseles y piezas de Marketing con Manzanitas desde datos

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `command`
- Epic: `none`
- Status real: `Diseño cerrado; implementación en curso (sesión del 2026-09-29, pedido del operador «termina todo lo pendiente»)`
- Rank: `TBD`
- Domain: `content|creative|platform`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

> **Perfil (inferido, ajustable):** `standard` con `Backend impact: command`, igual que `TASK-1923` (catálogos de Glitch):
> un catálogo del motor más un comando local, sin base de datos, sin API y sin UI de Greenhouse. `UI impact: none`: las
> piezas son artefactos de marca (PDF y PNG), no pantallas del portal. Se completa el `## Backend/Data Contract` en rigor
> `backend-lite` porque el intent del contrato AXIS es un contrato de datos que comparten el CLI y, después, la ruta
> productiva de `TASK-1921`.

## Summary

El registro Marketing con Manzanitas (MCM) está publicado en AXIS (`TASK-1936`: token `manzanitasRegister`, contrato
`efeonce.manzanitas-register` 0.2.0, gráficos `@efeoncepro/axis-graphic-line/charts`, logos `AXIS_MANZANITAS_ASSETS`) y
Greenhouse ya fija esas versiones (`44f8db3f0`), pero las piezas se siguen armando a mano en el canvas v39. Esta task
agrega el catálogo `manzanitas` del Artifact Composer y el comando `pnpm manzanitas:compose`: un intent del contrato
(carrusel, story, blog, YouTube o pódcast) se compone en PDF y PNG con las 26 piezas aprobadas, con el acento de la línea
del tema, los gráficos calculados desde el dato y el gate visual a 0 px.

## Why This Task Exists

- Cada carrusel de MCM se arma copiando el canvas: nada impide mecánicamente una pieza fuera del registro, y los gráficos
  se rehacen a mano aunque AXIS ya los calcula.
- `TASK-1936` dejó como follow-up el catálogo del Composer; el contrato y los paquetes existen, pero no tienen consumidor
  productivo en Greenhouse (sólo el test de consumo `src/config/axis-manzanitas-register-package.test.ts`).
- Sin catálogo, las decisiones del operador del 2026-09-29 (gráficos que no cuentan para las tres Pizarras, mano en
  respuesta en la portada, zona segura de la story) no se aplican en ninguna pieza real.

## Goal

- `pnpm manzanitas:compose -- --intent <intent.json> --out <dir>` compone un carrusel (PDF + PNG) o una pieza suelta
  (PNG) desde un intent del contrato, y falla cerrado con los códigos del contrato cuando el intent no es válido.
- Las 26 piezas aprobadas de `manzanitasRegister.pieces` tienen plantilla, con el acento de la línea del tema en la
  manzana, los puntos, el arco, la cifra, el eslogan y «Desliza», sin HEX ni familias escritas a mano.
- `pnpm composer:visual-gate --catalog=manzanitas` congela las plantillas a 0 px y el operador aprueba a ojo los
  carruseles de ejemplo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md`
- `docs/architecture/MANZANITAS_REGISTER_DECISION_V1.md` (y el ADR de AXIS
  `docs/architecture/MANZANITAS_REGISTER_TOKEN_CONTRACT_DECISION_V1.md`)
- `docs/operations/brand-graphic-line/manzanitas/MANZANITAS_REGISTER_V1.md`
- `docs/tasks/complete/TASK-1923-glitch-artifact-composer-catalogs.md` (precedente: misma anatomía)
- `docs/operations/runbooks/composer-visual-gate.md`

Reglas obligatorias:

- Un catálogo es dato: no se toca un archivo del motor (`src/lib/artifact-composer/*.ts` fuera de `catalogs/`) salvo
  que el registro de gates lo exija; el catálogo sólo importa relativo, `node:*` o `playwright`
  (`__tests__/package-boundary.test.ts`).
- Los valores (color, tipo, medidas del registro) salen de `manzanitasRegister` compilado; el layout en px de cada
  plantilla vive en su `<style>` como en Glitch; nunca HEX, `rgb()` ni una familia literal en plantillas ni en el CSS.
- El autor nunca elige plantilla: el mapper decide el `contentType` por la pieza del intent.
- El registro complementa La órbita y nunca se mezcla con Glitch.

## Normative Docs

- `docs/manual-de-uso/creative/componer-piezas-de-marketing-con-manzanitas.md`
- `.claude/skills/efeonce-graphic-line/references/manzanitas.md`
- Canvas v39 «Marketing con Manzanitas · Línea v1» (https://claude.ai/artifact/JxyMSQhwKuty6T6Kdhd4dG): fuente visual de
  cada plantilla

## Dependencies & Impact

### Depends on

- `TASK-1936` (complete): paquetes AXIS publicados; Greenhouse fija `axis-tokens` 0.3.28, `axis-ui-contracts` 0.3.28,
  `axis-graphic-line` 0.10.1 y `axis-brand-assets` 0.4.1 (`44f8db3f0`)
- Motor del Artifact Composer (`src/lib/artifact-composer/**`) y brand pack `axis`
  (`src/lib/artifact-composer/brand-packs/axis/fonts.json`)

### Blocks / Impacts

- `TASK-1921` (in-progress, otra sesión): la ruta productiva puede sumar la familia `manzanitas` después; esta task no
  toca sus archivos
- Skill `efeonce-graphic-line` (`references/manzanitas.md`) y el manual de MCM: pasan de «componer en el canvas» a
  «componer con el comando»

### Files owned

- `src/lib/artifact-composer/catalogs/manzanitas/**`
- `src/lib/manzanitas-composition/**`
- `scripts/manzanitas/**`
- `scripts/artifact-composer/visual-gate.ts` (sólo el scope `manzanitas`)
- `scripts/artifact-composer/compile-brand-pack.ts` (sólo la entrada del catálogo)
- `src/lib/artifact-composer/brand-packs/axis/fonts.json` (sólo la extensión `manzanitas`)
- `scripts/frontend/baselines/artifact-composer/templates-manzanitas/**` y su sección de `BASELINE_DELTAS.md`
- `package.json` (scripts `manzanitas:tokens` y `manzanitas:compose`)

## Current Repo State

### Already exists

- Paquetes AXIS instalados con el registro, el contrato 0.2.0, `/charts` y los logos (`44f8db3f0`)
- Catálogos de Glitch como molde: `src/lib/artifact-composer/catalogs/glitch/**`, `src/lib/glitch-composition/**`,
  `scripts/glitch/**`
- La voz de La órbita en CSS (`catalogs/graphic-line-stills/graphic-line.css`: `.gl-question`, `.gl-ring`,
  `.gl-answer`, `.gl-sphere`) y la lente por CSS (`hero-lens.html`)

### Gap

- No hay catálogo, mapper, comando ni baseline para MCM; las piezas se hacen a mano en el canvas

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `src/lib/artifact-composer/catalogs/manzanitas` (catálogo), `src/lib/manzanitas-composition` (mapper
  puro), `scripts/manzanitas` (CLI local)
- Future candidate home: `worker`
- Boundary: el catálogo sólo lo importan scripts, tests y el worker; `src/**` sólo importa tipos de
  `@/lib/artifact-composer/pure`
- Server/browser split: `n/a` — render con Playwright en local o en `artifact-worker`, nunca en Vercel
- Build impact: `none` — sin dependencias nuevas; fuentes del brand pack existente
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-lite`
- Impacto principal: `command`
- Source of truth afectado: ninguno nuevo; consume el contrato `efeonce.manzanitas-register` y el token
  `manzanitasRegister` publicados
- Consumidores afectados: el CLI `pnpm manzanitas:compose`; después, la ruta productiva de `TASK-1921`
- Runtime target: `local`

### Contract surface

- Contrato existente a respetar: `ArtifactCatalog` (`src/lib/artifact-composer/catalog.ts`), contratos de slots
  (`contracts.ts`), `resolveManzanitasRegisterIntent` y el manifiesto `axis.manzanitas-register-composition.v1`
- Contrato nuevo o modificado: catálogos `manzanitas-carousel` (`pdf-merged`) y `manzanitas-stills` (`png-set`);
  `planManzanitasIntent(intent)`; comando `pnpm manzanitas:compose -- --intent <intent.json> --out <dir>`; tokens
  compilados `manzanitas-tokens.css` y `.json` con `pnpm manzanitas:tokens [--check]`
- Backward compatibility: `compatible` — aditivo
- Full API parity: el primitive es `planManzanitasIntent` + los catálogos; el CLI es su primer consumidor y la ruta
  productiva de `TASK-1921` el siguiente (fuera de alcance)

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna
- Invariantes que no se pueden romper:
  - Sólo se compone un intent que el contrato resuelve (`status: 'resolved'`); si no, el comando sale con los códigos.
  - Una plantilla por pieza aprobada; una pieza sin aprobar no compone (`manzanitas.piece-approval`).
  - El acento sale de la línea del tema; el texto del logo queda en su tinta; nada de Glitch en MCM.
  - Los gráficos se pintan con `manzanitasChartSvg` desde el dato y pasan `runManzanitasChartChecks`.
  - Mismo intent y mismas fotos ⇒ mismos bytes (procedencia sin reloj).
- Write-target allowlist: `no aplica — sin escrituras a base`
- Tenant/space boundary: `sin datos de tenant — marca editorial propia de Efeonce`
- Idempotency/concurrency: comando local y determinista
- Audit/outbox/history: `manzanitas.provenance.json` junto a la salida

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: catálogos `candidate`, sólo por CLI local
- Backfill plan: sin backfill
- Rollback path: revertir los commits; ningún consumidor productivo depende del catálogo
- External coordination: operador (aprobación visual de los carruseles compuestos)

### Security and access

- Auth/access gate: sin capability nueva; CLI local
- Sensitive data posture: sin personas reales del equipo en los ejemplos (pendiente `cine-team-people-social`)
- Error contract: el comando imprime `code` y mensaje es-CL del contrato o del validador y sale con código distinto de cero
- Abuse/rate-limit posture: sin exposición de red; el render bloquea la red

### Runtime evidence

- Local checks: `pnpm manzanitas:tokens --check`, `pnpm manzanitas:compose` sobre los ejemplos, `pnpm vitest run` de los
  dominios nuevos, `pnpm composer:visual-gate --catalog=manzanitas`, `pnpm local:check`
- DB/runtime checks: sin base de datos
- Integration checks: sin integración externa
- Reliability signals/logs: sin señal
- Production verification sequence: ver `Rollout Plan & Risk Matrix`

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] *(No aplica: la task no crea tablas ni escribe en base de datos.)* Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] *(No aplica: no toca datos sensibles.)* Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

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

### Slice 1 — Tokens compilados y archivos por línea

- `scripts/manzanitas/compile-tokens.ts` (`pnpm manzanitas:tokens [--check]`): `manzanitas-tokens.css` y `.json` desde
  `manzanitasRegister` (superficies, tinta, tipo de la voz, clases `.mcm-line-<key>` con el acento sobre papel y sobre
  navy); logos, wordmarks y manzana copiados byte a byte y precoloreados por línea; íconos «Desliza» por voz y tono desde
  `iconSvg`; logos de Efeonce
- Extensión de fuentes `manzanitas` (Bricolage variable + Poppins) en el brand pack y entrada en `composer:brand-pack`

### Slice 2 — Catálogo y plantillas

- `registry.json`, `manzanitas.css` (molde con variables), 26 plantillas `.html` + `.slots.json`, resolvers (línea,
  tono, asset por línea), validadores (pertenencia, aprobación) y el hook de gráficos con painter inyectado

### Slice 3 — Mapper y comando

- `src/lib/manzanitas-composition`: `planManzanitasIntent` (intent → contrato → plan por catálogo), órbitas del paso y de
  la lente como SVG calculado con `@efeoncepro/axis-graphic-line`, fotos por `asset-ref`
- `scripts/manzanitas/compose.ts` (`pnpm manzanitas:compose`) con el painter de gráficos y la procedencia

### Slice 4 — Gate visual, pruebas y aprobación

- Scope `manzanitas` en `composer:visual-gate`, baseline congelado con su sección en `BASELINE_DELTAS.md`
- Pruebas del catálogo, del mapper y de los tokens (drift)
- Carruseles de ejemplo compuestos y aprobados a ojo por el operador

### Slice 5 — Documentación

- Manual, doc funcional, ADR (delta), norma, skill (`references/manzanitas.md`, espejo `.codex/`), Handoff, changelog

## Out of Scope

- La familia `manzanitas` en la ruta productiva (`TASK-1921`, archivos de otra sesión)
- Animar piezas o publicar en redes
- Las tres pendientes abiertas (copy de cierre de la story, personas del equipo en cine, Trazo `republicar`/`enviar`)

## Detailed Spec

- **Catálogos:** una carpeta, dos catálogos: `manzanitas-carousel` (`pdf-merged`, el documento del carrusel) y
  `manzanitas-stills` (`png-set`: láminas sueltas, story, blog, YouTube y pódcast). Campo `catalogs` en el registry.
- **Plantillas:** una por pieza aprobada (26); los nueve gráficos comparten dos plantillas por superficie
  (`ChartPaper`, `ChartNavy`) y el hook pinta la receta.
- **Voz:** anatomía de `EfeonceOrbit.Voice` del canvas: pregunta Poppins 300 a respuesta × 38/128, anillo de 0,42 la
  pregunta en el acento, respuesta Bricolage 760 con `wdth 96`/`opsz 88` y la esfera como cierre del texto.
- **Gráficos:** slot `chart` `validation-only` con el dato; `createManzanitasCatalogs({ chartPainter })`; el painter vive
  en `scripts/manzanitas/` y llama `manzanitasChartSvg` con la línea y la superficie.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3 → Slice 4 → Slice 5. El baseline (Slice 4) sólo se congela cuando el operador aprobó los
  carruseles de ejemplo.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Una plantilla se aparta del canvas aprobado | UI (artefacto) | medium | comparar con el render del canvas v39 y aprobación del operador | gate visual a 0 px |
| El catálogo importa un paquete y rompe el límite del motor | tooling | low | painter inyectado; `package-boundary.test.ts` | test rojo |
| Drift entre el token y los tokens compilados | tooling | low | `pnpm manzanitas:tokens --check` y su test | test rojo |

### Feature flags / cutover

- Sin flag — additive, repo-only: sólo se usa por CLI local.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1–5 | revertir los commits (additive, repo-only) | minutos | si |

### Production verification sequence

- Additive, repo-only: sin runtime productivo. Verificación local: comando sobre los ejemplos, gate visual y aprobación
  del operador.

### Out-of-band coordination required

- Aprobación visual del operador de los carruseles de ejemplo antes de congelar el baseline.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `pnpm manzanitas:tokens --check` sale en 0 y su test de drift pasa; ningún HEX, `rgb()` ni familia literal en las
      plantillas ni en `manzanitas.css`.
- [ ] Las 26 piezas aprobadas de `manzanitasRegister.pieces` tienen plantilla y el test compara el registry con el token.
- [ ] `pnpm manzanitas:compose` compone los ejemplos válidos de AXIS (carrusel en PDF + PNG, story, blog, YouTube y
      pódcast) y rechaza uno inválido con el código del contrato.
- [ ] Cambiar la línea del tema cambia la manzana, los puntos, el arco, la cifra, el eslogan y «Desliza» en la salida.
- [ ] Los gráficos compuestos pasan `runManzanitasChartChecks`.
- [ ] `pnpm composer:visual-gate --catalog=manzanitas` sale en 0 con el baseline congelado y su sección sellada.
- [ ] El operador aprobó a ojo los carruseles de ejemplo.
- [ ] `pnpm local:check` y las pruebas de los dominios nuevos en verde.

## Verification

- `pnpm manzanitas:tokens --check`
- `pnpm vitest run src/lib/artifact-composer/catalogs/manzanitas src/lib/manzanitas-composition scripts/manzanitas`
- `pnpm composer:visual-gate --catalog=manzanitas`
- `pnpm local:check`
- Aprobación visual del operador

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] la skill y el manual dicen cómo componer con el comando

## Follow-ups

- Familia `manzanitas` en la ruta productiva (`TASK-1921`).
- Las tres pendientes abiertas del registro, cuando el operador las decida.
