# TASK-2014 — Adoptar los paquetes AXIS publicados y retirar la copia generada del informe AI Visibility

## Delta 2026-10-20 — la adopción trae la portada de propuesta sin pregunta

- AXIS `axis-tokens` 0.6.6 y `axis-ui-contracts` 0.7.6 (tag `v0.7.6`, commit `9e72d38`) suman `cover-proposal` ·
  `orbit-decision`: la portada de propuesta en la voz de decisión, sin pregunta (TASK-2012, Slice 2). Al adoptar, el
  builder `coverProposal` de `src/lib/brand-surfaces/recipes/frame.ts` necesita su plantilla (sin el nodo de la pregunta,
  titular en el lugar de la pregunta) o el compositor responde `recipe-without-template`. Hasta entonces la portada de
  Assetplan es una lámina a mano. — por TASK-2012

## Delta 2026-10-12 — los dependientes del pin 0.4.25 ya están regenerados

- El pin actual (`axis-brand-assets` 0.4.25) quedó sin deriva: tokens de Manzanitas, vocabulario de canales de Insights
  (22 plataformas) y los cuatro lockups del PDF del AI Visibility Report, re-sellados con la terminación concéntrica.
  Esta task parte de un árbol verde, no de tres tests rojos.
- Al subir a 0.4.29, la pasada de regresión incluye las tres regeneraciones propias de `axis-brand-assets`:
  `pnpm manzanitas:tokens`, `pnpm exec tsx scripts/build-pdf-brand-assets.ts --ai-visibility-report` y los tests de deriva
  de canales (`contracts/channels.test.ts`, `src/config/insights-channel-isotypes.test.ts`). Un lockup re-sellado es un
  cambio visible en un PDF en producción: se mira el antes y el después. — por trabajo de deriva del pin AXIS
  (commit `7877dfe89`)

## Delta 2026-10-09 — `axis-brand-assets` 0.4.28 (Wave, Reach y Globe, ruta H3)

- La adopción suma `@efeoncepro/axis-brand-assets` **0.4.28** (AXIS `7c96680` + `5346761`; tag `v0.4.28` publicado), que lleva a Wave, Reach y Globe a la
  familia por la ruta H3 ([ADR](../../architecture/brand/EFEONCE_PRODUCT_FAMILY_H3_DECISION_V1.md)): reemplaza los bytes
  de `{wave,reach,globe}-{logo,isotype}-{positive,negative}` y agrega 21 archivos (`-lockup-*`, la variante `white` y
  `{reach,globe}-isotype-small-*`). Antes de fijarla, confirmar la versión en el registro.
- **Versión a adoptar: 0.4.29** (AXIS `74bb2e7`, tag `v0.4.29`): trae todo lo anterior y además fragmenta el
  índice de búsqueda del Lab, con lo que Rooms, Creative Studio y las piezas nuevas de Wave, Reach y Globe pasan a la
  página «Logotipos» y a la búsqueda global (`AXIS_LOGO_EXCLUSIONS` ya no las lista).
- Sobre oscuro, los isotipos van **todo en blanco** (decisión del operador del 2026-10-09): `{wave,reach,globe}-isotype-negative`
  y `{reach,globe}-isotype-small-negative` son idénticos a su `-white`. El color sobre oscuro queda sólo en `-logo-negative`
  y `-lockup-negative`. Quien hoy muestre un isotipo de producto en color sobre oscuro verá el cambio al adoptar.
- Quien consuma `wave-logo-*`, `reach-logo-*` o `globe-logo-*` recibe el logotipo **sin «by efeonce»**; junto a Efeonce
  corresponde el `-lockup-*`. Hoy ningún código de Greenhouse importa esos ids del paquete (barrido del 2026-10-09): la
  UI y los PDF usan copias locales de `public/branding/SVG/` (`src/components/greenhouse/brand-assets.ts`,
  `scripts/build-pdf-brand-assets.ts`), con el dibujo anterior y fuera de la guarda de deriva
  `src/config/efeonce-brand-assets.test.ts`. Reemplazarlas es una decisión aparte de este pin.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `none`
- Status real: `Diseño — creada 2026-10-08 a pedido del operador; release AXIS v0.4.27 publicado el mismo día (readback OK)`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Greenhouse fija un juego viejo de AXIS (`axis-tokens` 0.3.41, `axis-ui-contracts` 0.3.40, `axis-graphic-line` 0.11.0,
`axis-ui-registry` 0.3.1, `axis-brand-assets` 0.4.25). Esta task lo sube a las versiones publicadas en el release
`v0.4.27` con una pasada de regresión completa y, con eso, retira la copia generada que hoy usa el PDF del informe
AI Visibility en producción (seguimiento de TASK-1938).

## Why This Task Exists

- El PDF del AI Visibility Report (TASK-1938, en producción desde 2026-10-04) lee su anatomía editorial de
  `src/components/growth/ai-visibility/report-artifact/pdf/ai-visibility-layout.generated.json`, una proyección hecha a
  mano desde un checkout local de AXIS que nunca se publicó. El 2026-10-08 esos valores se publicaron en
  `@efeoncepro/axis-tokens` 0.6.2 (AXIS `dd22aa4`) con el mismo digest (`484a0729…`), pero Greenhouse no puede
  importarlos sin subir `axis-tokens` de 0.3.41 a 0.6.2: no se puede tomar una parte del paquete.
- Ese salto cruza las líneas 0.4, 0.5 y 0.6 de tokens y 0.4–0.7 de contracts, y arrastra `axis-graphic-line` y
  `axis-ui-registry` (dependencias entre paquetes AXIS). Afecta el tema del portal, las superficies de marca, el
  Artifact Composer (gate visual a cero píxeles), los correos y el PDF: no es un cambio de JSON.
- Mientras la copia exista, cualquier ajuste aprobado en AXIS no llega a Greenhouse sin regenerarla a mano, y nada
  detecta la deriva.
- TASK-1944 (módulos de correo) también necesita un `axis-tokens` más nuevo; esta task le resuelve el pin.

## Goal

- Greenhouse fija exacto el juego publicado en `v0.4.27` y todo lo que consume AXIS pasa sus gates sin cambios
  visuales no aprobados.
- El PDF del informe importa `aiVisibilityReport.palette.barTrack/dataReference`, `type.editorial` y `layout` desde
  `@efeoncepro/axis-tokens` y la copia generada desaparece.
- Las roturas de API entre versiones quedan resueltas en el owner canónico de cada consumidor, no con parches locales.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/EFEONCE_SHARED_PRODUCT_UI_PLATFORM_DECISION_V1.md` (AXIS como plataforma compartida)
- `docs/architecture/agent-invariants/DESIGN_TOKENS_BRAND_AGENT_INVARIANTS.md`
- `docs/architecture/agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md` (Artifact Composer, gate visual)
- `docs/architecture/agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md` (runtimes Cloud Run y deps de workers)
- `docs/architecture/GREENHOUSE_WORKER_BUILD_CONTRACT_V1.md`

Reglas obligatorias:

- Versiones exactas, nunca rangos ni `file:` hacia el checkout hermano de AXIS; lockfile commiteado.
- Ningún valor de diseño se transcribe a mano: todo sale del paquete (Figma/AXIS = fuente; Greenhouse consume).
- `pnpm composer:visual-gate` a **cero píxeles**; un rebaseline sólo en una sección sin sellar de `BASELINE_DELTAS.md`
  y con aprobación del operador si el cambio es visible.
- Los paquetes que usan los workers (`artifact-worker`, `ops-worker`) siguen las reglas de deps de runtime
  (`pnpm worker:runtime-deps-gate`, `pnpm worker:build-contract-gate`).

## Normative Docs

- `docs/tasks/in-progress/TASK-1938-ai-visibility-report-pdf-la-orbita.md`
- `docs/tasks/to-do/TASK-1944-efeonce-email-modules-adoption.md`
- `docs/operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md` [verificar]
- AXIS `docs/agent-composition/ai-visibility-report.md` (sección «Anatomía editorial completa (TASK-1938) — `axis-tokens` 0.6.2»)
- AXIS `README.md`, tabla de paquetes (cambios por versión entre las fijadas hoy y las nuevas)

## Dependencies & Impact

### Depends on

- Release AXIS `v0.4.27` **publicado el 2026-10-08** (tag sobre `99bf77c`, run 37858201188): publicó `axis-tokens`
  0.6.2, `axis-ui-contracts` 0.7.1, `axis-brand-assets` 0.4.27 y `axis-ui-primitives` 0.6.7; omitió por ya publicadas
  `axis-graphic-line` 0.17.0 y `axis-ui-registry` 0.7.2, que son las versiones del mismo juego. Readback en GitHub
  Packages verificado ese día.

### Blocks / Impacts

- TASK-1938: su seguimiento (retirar la copia generada) se cierra aquí.
- TASK-1944: queda desbloqueado el pin de `axis-tokens`/`axis-ui-contracts` que necesitan los módulos de correo.
- Superficies que importan AXIS: tema del portal (`src/@core/theme`), `src/lib/brand-surfaces/**`,
  `src/lib/artifact-composer/catalogs/**` (graphic-line-deck/-stills/-overlays/-shared, glitch, manzanitas),
  `src/lib/glitch-composition/**`, `src/config/**`, scripts de marca (`scripts/brand/**`, `scripts/brand-surfaces/**`)
  y el PDF del informe (`src/components/growth/ai-visibility/report-artifact/pdf/**`).

### Files owned

- `package.json`, `pnpm-lock.yaml` (sólo los pins `@efeoncepro/axis-*`)
- `src/components/growth/ai-visibility/report-artifact/pdf/report-pdf-tokens.ts`
- `src/components/growth/ai-visibility/report-artifact/pdf/ai-visibility-layout.generated.json` (se elimina)
- `src/components/growth/ai-visibility/report-artifact/__tests__/report-pdf-assets.test.ts`
- Los consumidores AXIS que requieran ajuste por cambio de API, cada uno en su owner canónico

## Current Repo State

### Already exists

- Pins actuales en `package.json`: `@efeoncepro/axis-brand-assets` 0.4.25, `axis-graphic-line` 0.11.0,
  `axis-tokens` 0.3.41, `axis-ui-contracts` 0.3.40, `axis-ui-registry` 0.3.1; registro `@efeoncepro` en `.npmrc`.
- 111 archivos de `src`/`scripts` importan `@efeoncepro/axis-tokens` y 33 `@efeoncepro/axis-ui-contracts`
  (medido 2026-10-08).
- `report-pdf-tokens.ts` importa `./ai-visibility-layout.generated.json` y expone `ReportPdfEditorial` y la paleta
  extendida desde `layoutProjection.extension`; el contenido es idéntico a `aiVisibilityReport` de `axis-tokens` 0.6.2
  (digest `484a0729…`, verificado 2026-10-08).
- Gates: `pnpm composer:visual-gate`, `pnpm ui:visual-gate`, `pnpm worker:build-contract-gate`, suite Vitest.

### Gap

- Ningún consumidor usa las versiones publicadas; la copia generada no tiene detector de deriva contra AXIS.
- No hay inventario de qué cambió entre tokens 0.3.41 → 0.6.2 y contracts 0.3.40 → 0.7.1 que afecte a Greenhouse.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `package.json` del monorepo; consumidores en `src/@core/theme`, `src/lib/brand-surfaces`, `src/lib/artifact-composer`, `src/components/growth/ai-visibility` y scripts de marca; runtime Vercel + `artifact-worker` + `ops-worker`
- Future candidate home: `remain-shared`
- Boundary: AXIS es la fuente; Greenhouse sólo consume exports publicados (cada futuro deployable fijará su propio juego AXIS). Ningún consumidor reexporta ni copia valores
- Server/browser split: el tema y las superficies de marca corren en ambos; el PDF y el Composer corren server-side (workers)
- Build impact: dependencia global del monorepo; el salto puede cambiar el peso del bundle porque `tokens/dist/tokens.js` de AXIS limita el tree-shaking
- Extraction blocker: `none`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE (lo completa el agente que toma la task)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Inventario de cambios y readback

- Confirmar el readback de las versiones destino (incluidas `axis-graphic-line` 0.17.0 y `axis-ui-registry` 0.7.2)
  al momento de tomar la task.
- Inventario de exports eliminados, renombrados o con valor distinto entre el juego fijado y el destino, cruzado con
  los imports reales de Greenhouse; resultado en el plan de la task.

### Slice 2 — Subida de pins y adaptación de consumidores

- Pins exactos nuevos y lockfile.
- Cada rotura de tipo o de valor se resuelve en su owner canónico; los cambios de valor visibles se listan para el
  operador antes de aceptarlos.
- `pnpm typecheck` y `pnpm lint` verdes.

### Slice 3 — Regresión completa

- Suite completa (`pnpm test`), `pnpm composer:visual-gate` a cero píxeles, `pnpm ui:visual-gate`, gates de workers y
  `pnpm build` (con autorización del operador: consume mucha memoria en el equipo local).
- Composición real con `pnpm brand:compose` de al menos una pieza por catálogo afectado y comparación con la anterior.

### Slice 4 — Retiro de la copia generada del informe

- `report-pdf-tokens.ts` importa desde `@efeoncepro/axis-tokens`; se elimina `ai-visibility-layout.generated.json`.
- Prueba que fije el digest de la extensión (`484a0729…`) contra el paquete instalado, para detectar cambios futuros.
- PDF regenerado con un informe real y comparado con el anterior (sin diferencias visibles).

## Out of Scope

- Adoptar componentes o contratos nuevos de AXIS (video player, formularios, chips, etc.).
- Cambiar el diseño del PDF del informe o de cualquier superficie.
- Los módulos de correo de TASK-1944 (sólo se le deja resuelto el pin).
- Publicar o modificar paquetes AXIS; si aparece un defecto en AXIS, se arregla allá con su propio release.

## Detailed Spec

- Import del informe: `import { aiVisibilityReport } from '@efeoncepro/axis-tokens'` (entrypoint raíz, sin subpath).
  Mapeo uno a uno: `layoutProjection.extension.palette` → `aiVisibilityReport.palette.{barTrack,dataReference}`;
  `.type.editorial` → `aiVisibilityReport.type.editorial`; `.layout` → `aiVisibilityReport.layout`.
- El contrato `efeonce.ai-visibility-report` 0.1.0 no cambia su salida en `axis-ui-contracts` 0.7.1 (el intent
  devuelve sólo los cuatro roles base de `type`).
- Fuentes del cambio en AXIS: `dd22aa4` (anatomía publicada), `99bf77c` (primitives 0.6.7), `1dfb95c`/`f249e82`
  (marca de Rooms en brand-assets 0.4.27).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3 → Slice 4. El retiro de la copia (Slice 4) nunca antes de que la regresión (Slice 3)
  esté verde: hasta entonces el PDF sigue leyendo la copia, que es idéntica en valores.
- No se promueve a `main` sin Slice 3 completo y sin la verificación del PDF real.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un token cambió de valor entre 0.3.41 y 0.6.2 y altera el tema del portal | UI | medium | Inventario del Slice 1; `ui:visual-gate`; cambios visibles listados al operador | diferencias en `ui:visual-gate` |
| Deck/stills del Composer cambian un píxel | release | medium | `composer:visual-gate` a cero; rebaseline sólo aprobado | gate rojo |
| Export renombrado rompe un consumidor en runtime pero no en tipos | UI / worker | low | typecheck + suite completa + composición real por catálogo | errores en `artifact-worker`/Sentry |
| El worker empaqueta una versión distinta a la de Vercel | release | low | `worker:runtime-deps-gate` y `worker:build-contract-gate`; deploy de ambos workers en el release | `worker_revision_drift` |
| El PDF del informe cambia al retirar la copia | UI | low | digest fijado en prueba; PDF real comparado antes/después | diferencia en la comparación |
| Bundle del portal crece por tokens monolíticos | UI | medium | medir tamaño antes/después en el build | aumento en el reporte del build |

### Feature flags / cutover

Sin flag: es un cambio de dependencias, no de comportamiento; el corte es el deploy. La reversión es volver a los
pins anteriores.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | nada que revertir (inventario) | — | sí |
| Slice 2 | revertir el commit de pins + lockfile | < 10 min | sí |
| Slice 3 | sin cambios propios (gates) | — | sí |
| Slice 4 | revertir el commit (restaura la copia generada) | < 10 min | sí |
| Producción | release de rollback por el control plane (Vercel + workers) | < 30 min | sí |

### Production verification sequence

1. Local: todos los gates del Slice 3 verdes y PDF real comparado.
2. `develop` (staging): portal, una composición del Composer por el `artifact-worker` y descarga del PDF de un informe
   real por la ruta pública de staging.
3. Release a producción por el control plane (skill `greenhouse-production-release`) con deploy de Vercel,
   `artifact-worker` y `ops-worker`.
4. Producción: descarga del PDF de un informe real vigente (HTTP 200, 6 páginas, sin diferencias visibles) y una
   composición del Composer.

### Out-of-band coordination required

- Release AXIS `v0.4.27` publicado antes de empezar (lo dispara el operador o la sesión que lo lleva).
- Aprobación del operador para cualquier cambio visible que traiga el salto de versión.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `package.json` fija exacto `axis-tokens` 0.6.2, `axis-ui-contracts` 0.7.1, `axis-brand-assets` 0.4.27, `axis-graphic-line` 0.17.0 y `axis-ui-registry` 0.7.2 (o versiones posteriores del mismo juego, justificadas), con lockfile commiteado.
- [ ] El inventario de cambios entre versiones está en el plan, con cada consumidor afectado y su resolución.
- [ ] `pnpm typecheck`, `pnpm lint` y `pnpm test` (suite completa) verdes.
- [ ] `pnpm composer:visual-gate` a cero píxeles sin rebaseline, o con rebaseline aprobado por el operador y registrado en `BASELINE_DELTAS.md`.
- [ ] `pnpm worker:runtime-deps-gate` y `pnpm worker:build-contract-gate` verdes.
- [ ] `report-pdf-tokens.ts` importa `aiVisibilityReport` desde `@efeoncepro/axis-tokens` y `ai-visibility-layout.generated.json` ya no existe.
- [ ] Una prueba fija el digest `484a0729…` de la extensión contra el paquete instalado.
- [ ] El PDF de un informe real regenerado no tiene diferencias visibles con el anterior (evidencia en la task).
- [ ] TASK-1938 y TASK-1944 tienen su delta con el estado resultante.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm composer:visual-gate`
- `pnpm ui:visual-gate`
- `pnpm worker:runtime-deps-gate` y `pnpm worker:build-contract-gate`
- `pnpm build` (con autorización del operador)
- PDF real del informe y una composición por catálogo afectado

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] el seguimiento de TASK-1938 queda cerrado y TASK-1944 refleja el pin resuelto

## Follow-ups

- Si el inventario muestra cambios visibles que el operador no aprueba, abrir la corrección en AXIS con su propio
  release antes de cerrar esta task.

## Open Questions

- Ninguna al crear la task: las versiones de `axis-graphic-line` (0.17.0) y `axis-ui-registry` (0.7.2) del juego
  `v0.4.27` quedaron confirmadas por el propio release.
