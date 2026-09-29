# TASK-1936 — Registro Marketing con Manzanitas en AXIS: token, archivos, contrato, gráficos y Lab

## Delta 2026-09-29

- Follow-ups atendidos — cerrados por trabajo en `TASK-1939` y en la sesión del 2026-09-29: los pins de AXIS en
  Greenhouse (`44f8db3f0`: `axis-tokens` 0.3.28, `axis-ui-contracts` 0.3.28, `axis-graphic-line` 0.10.1,
  `axis-brand-assets` 0.4.1) y el catálogo `manzanitas` del Artifact Composer con `pnpm manzanitas:compose`
  (`1050036e8`, `TASK-1939`, in-progress hasta la aprobación visual del operador). La skill ya documenta el comando.
- El operador decidió 7 de las 10 pendientes del registro el 2026-09-29 (publicadas en AXIS `v0.3.28`, contrato 0.2.0);
  siguen abiertas la 5 (copy de cierre de la story), la 6 (cine con personas del equipo) y la 7 (Trazo `republicar` y
  `enviar`).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
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
- Epic: `none`
- Status real: `Publicado en AXIS 2026-09-28 (main 6a1a912; tags v0.3.26 y v0.3.27, CI y release verdes); Lab en vivo; Greenhouse aún no fija versiones (follow-up)`
- Rank: `TBD`
- Domain: `creative|brand|platform`
- Blocked by: `none`
- Branch: `Greenhouse develop (sólo docs); AXIS rama propia desde main cuando el checkout compartido se libere; push a main y tag sólo con autorización explícita del operador; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

> **Perfil inferido (ajustable):** `backend-data` con `Backend impact: integration`, igual que TASK-1922 (Glitch en
> AXIS), porque la task crea fuente de verdad versionada en el repo hermano `efeoncepro/axis-design-system` (token,
> archivos sellados, contrato con resolver y módulo de gráficos) que consumen agentes, el Lab y, después, el Artifact
> Composer de Greenhouse. Rigor `backend-lite`: sin base de datos, sin endpoint, sin datos sensibles.
>
> **`UI impact: none` (con razón):** no hay ruta, componente, copy ni interacción del portal Greenhouse. La página
> `/references/manzanitas/` vive en el Lab de AXIS (`axis.efeonce.org`), el sitio de referencia del sistema de diseño,
> con sus propias pruebas unitarias y e2e (Playwright) y la revisión del operador antes del push; los contratos
> `docs/ui/**` (wireframe, flow, motion) y el GVC gobiernan la UI de Greenhouse y no aplican acá. Es el mismo criterio
> que TASK-1922 aplicó a `/references/glitch/` y TASK-1923 al Lab.
>
> **Prioridad P2 inferida (ajustable):** la línea quedó aprobada el 2026-09-28 y las piezas se pueden producir hoy desde
> el canvas v39; nada está roto, pero cada pieza copia valores a mano y ninguna regla del registro se verifica antes de
> un render.

## Delta 2026-09-28 — cerrada

- Ejecutada completa en AXIS (rama `feat/manzanitas-register` → `main`) con autorización explícita del operador («Ejecuta todo tu plan entonces», «Coordinate con las peer session y avanza con todo», «Empuja todo junto» y, para el parche, «Publícalo»). Publicado: `v0.3.26` (`axis-tokens` 0.3.26 `manzanitasRegister`, `axis-ui-contracts` 0.3.24 `efeonce.manzanitas-register` 0.1.0, `axis-brand-assets` 0.4.1 `AXIS_MANZANITAS_ASSETS`, `axis-graphic-line` 0.10.0 `/charts`) y el parche `v0.3.27` (`axis-ui-contracts` 0.3.27, contrato 0.1.1: el carrusel empieza con su portada y termina con su contraportada; lo descubrió el criterio «Lente en la portada»). En el mismo push salió el release de Glitch `v0.3.25`, coordinado con su sesión. Lab: https://axis.efeonce.org/references/manzanitas/.
- Decisión de ejecución que cambia un criterio: la paridad con el canvas es **geométrica** (ADR de AXIS), no de píxeles; el criterio del script de paridad en píxeles queda sin tildar por eso.
- Nombres finales: `channels` → `canvases`, `close` → `slogan` + `backCover`.

## Summary

El registro Marketing con Manzanitas (MCM) quedó aprobado el 2026-09-28 como **registro complementario de La órbita**
(no una línea nueva ni un reemplazo), pero sus valores y reglas viven sólo en el canvas v39, en la norma de Greenhouse y
en la skill. Esta task los vuelve fuente de verdad en AXIS: el token top-level `manzanitasRegister`, los archivos
oficiales del logo de MCM sellados aparte, el contrato `efeonce.manzanitas-register` 0.1.0 (`candidate`) con resolver que
falla cerrado, un módulo `charts` con las 9 recetas de gráficos calculadas desde el dato y la página del Lab que lo
documenta. Termina con el release de AXIS; los pins en Greenhouse y el catálogo del Artifact Composer son tasks aparte.

## Why This Task Exists

- **No hay fuente de verdad versionada.** Las medidas del registro (cabecera en x 80 / y 72, «Desliza» en 1033 y 985,
  firma en y 1202, manzana 3,8 veces en la contraportada, la geometría de los 9 gráficos y de las 3 láminas de texto
  denso) viven en el canvas «Marketing con Manzanitas · Línea v1» (v39), en la norma y en la referencia de la skill. Un
  agente o un renderer tiene que copiarlas a mano, que es justo la reinterpretación que AXIS existe para evitar.
- **Las reglas duras sólo existen en prosa.** El acento de la línea del TEMA con un solo selector, una esfera por pieza,
  el acento nunca como superficie ni en texto de menos de 24 px, el eslogan sólo en el cierre, nada que simule un botón,
  «nunca dos láminas con foto seguidas», «el dato con fuente y el cierre, siempre en Pizarra», barras que salen de su
  número, cifras con fuente y datos de muestra marcados: nada lo verifica antes de un render.
- **Los gráficos se calculan hoy dentro del canvas.** La aprobación dice que «se calculan desde su dato»; esa lógica
  tiene que vivir en un paquete que cualquier consumidor use igual, con la medida reutilizando `measureSvg` de AXIS (el
  canvas ya se verificó contra él en 5 valores).
- **El riesgo de mezcla es real.** MCM y Glitch son hermanos que no se mezclan (manzana en contorno con tres puntos vs.
  manzana llena, acento de la línea vs. verde `#6ec207`). Sin aislamiento probado en tokens, archivos y contratos, un
  consumidor de La órbita o de Glitch podría recibir elementos de MCM por accidente.

## Goal

- `@efeoncepro/axis-tokens` exporta `manzanitasRegister`, que **referencia** (no copia) lo que hereda de La órbita y
  prueba su aislamiento contra `glitchLine` y contra `efeonceGraphicLine`.
- `@efeoncepro/axis-brand-assets` sella los archivos de MCM en `assets/manzanitas/` como `MANZANITAS_ASSET_SEALS` y los
  declara en `AXIS_MANZANITAS_ASSETS`, fuera de `AXIS_BRAND_ASSETS`, con el grupo manzana + tres puntos coloreable por
  atributo.
- `@efeoncepro/axis-ui-contracts` exporta `efeonce.manzanitas-register` 0.1.0 `candidate` con validador, resolver que
  falla cerrado, códigos de issue con mensaje es-CL, `pnpm manzanitas:resolve` y ejemplos válidos e inválidos.
- `@efeoncepro/axis-graphic-line` expone el módulo `charts` con las 9 recetas (dato → SVG + manifiesto) y sus chequeos,
  con paridad medida contra el canvas v39.
- El Lab publica `/references/manzanitas/` y `/references/manzanitas.json` leyendo el token y el contrato, con el
  selector «Línea del tema» y los gráficos en vivo desde datos.
- AXIS publica el release con autorización del operador, sin mover un valor de La órbita ni de Glitch.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/MANZANITAS_REGISTER_DECISION_V1.md` (ADR de Greenhouse del registro; lo redacta otra sesión de
  la flota el 2026-09-28 — confirmar que exista y leerlo completo antes del Slice 0)
- `docs/architecture/EFEONCE_GRAPHIC_LINE_ORBIT_DECISION_V1.md` (La órbita, la línea madre: manda en lo que el
  registro no dice)
- `docs/architecture/GLITCH_GRAPHIC_LINE_DECISION_V1.md` (precedente y hermana que no se mezcla)
- `docs/architecture/GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md` (consumidor futuro, fuera de alcance)
- AXIS (repo hermano `/Users/jreye/Documents/axis-design-system`, remoto `efeoncepro/axis-design-system`):
  `docs/architecture/GLITCH_LINE_TOKEN_CONTRACT_DECISION_V1.md` (el molde de esta task),
  `docs/architecture/GRAPHIC_LINE_ORBIT_COMPOSITION_DECISION_V1.md`, `docs/architecture/SURFACE_COMPOSITION_DECISION_V1.md`,
  `docs/architecture/ICONOGRAPHY_DECISION_V1.md` (D28 `swipe` Trazo, D29 `mano` Plastilina),
  `docs/agent-composition/graphic-line-orbit.md`, `docs/agent-composition/glitch.md`

Reglas obligatorias:

- **Complementa, no reemplaza.** El registro suma reglas, estilos y piezas propias sólo para piezas de MCM. El diff de
  `efeonceGraphicLine`, `efeonce.graphic-line-orbit` y `efeonce.surface-composition` en esta task es **vacío**.
- **Aislamiento en ambos sentidos.** Nada de `manzanitasRegister`, del contrato ni de los archivos de MCM se referencia
  desde `efeonceGraphicLine`, sus contratos, `glitchLine` ni `efeonce.glitch-line`; y `manzanitasRegister` nunca
  referencia a `glitchLine`. Pruebas en tokens, contratos y brand-assets lo verifican.
- **Hermano de Glitch, sin elementos cruzados.** MCM nunca usa la manzana llena, el verde `#6ec207`, la falla en bytes,
  Guttery ni la cabecera «EDICIÓN #N»; Glitch nunca usa la manzana en contorno con tres puntos ni el acento de la línea.
- **Lo heredado se referencia, nunca se copia:** `lines` (acentos `accentOnLight`/`accentOnDark`), superficies
  (`color.dark`, `color.paper`, `color.navy`), tipografía (`type.answer`, `type.question`, `type.text`), la medida
  (`trajectory.measure`), `accentContrast`, `slogan`, `motion.layout.sloganOfLogo`/`sloganGapOfFont`, `signature`,
  `lens` e `icons.voiceByLine`. Una prueba compara identidad de valor.
- **AXIS es dueño de los valores.** Los HEX y medidas del inventario y la norma son mediciones del canvas v39 para
  construir el token; ningún consumidor los transcribe.
- **«Registro» tiene dos sentidos.** El registro Manzanitas es un registro de marca editorial; dentro de él las fotos
  usan el registro **fotográfico** cine de Efeonce. El ADR, el token y el Lab lo aclaran siempre que aparezcan juntos.
- **La task no resuelve decisiones abiertas** (Open Questions 1–8, inventario §3). Ningún slice decide por omisión: si
  un valor depende de una pendiente, se publica en `pendingDecisions` o la regla falla cerrado (ver Detailed Spec).
- **La task no cambia estados de aprobación** de ninguna pieza.
- **Cross-repo:** la regla de push de AXIS es parte del contrato (ver `Out-of-band coordination required`).

## Normative Docs

- `docs/operations/brand-graphic-line/manzanitas/MANZANITAS_REGISTER_V1.md` (norma del registro; la redacta otra
  sesión de la flota el 2026-09-28 — valores de referencia hasta que exista el token)
- `.claude/skills/efeonce-graphic-line/references/manzanitas.md` y su espejo `.codex/` (redacción paralela)
- `docs/operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md` (norma de La órbita)
- `docs/operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md` (para el aislamiento)
- `docs/operations/social/MARKETING_CON_MANZANITAS_BRAND_RESOURCE_LIBRARY.md` (los 9 SVG oficiales en OneDrive
  `Alineación/5. Contenidos/13- Branding/SVG`, con su color y `viewBox` medidos)
- `docs/operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md` (consumo de los paquetes privados; para los
  follow-ups)
- `docs/public-site/decisions/PDR-020-canales-propios-sistema-editorial.md` (MCM como marca editorial del blog)
- Canvas aprobado (privado): «Marketing con Manzanitas · Línea v1», `https://claude.ai/artifact/JxyMSQhwKuty6T6Kdhd4dG`,
  **versión 39** (tableros `Grafico-1…9`, `Texto-1…3`, `Graficos-resumen`, `Graficos-lineas`, `Formatos`,
  `Cierre-acciones`, `CW-*`, `Escena-*`, `Lente-interior`, `Story-cierre`, `Podcast-1x1`, `YouTube-cierre`)
- DS «Efeonce — La órbita» (privado): `https://claude.ai/artifact/2ubRm8vTLamJukRCXR1xpc` (componentes
  `EfeonceOrbit.Voice`, `Measure`, `Lens`, `Slogan`)
- Documentación funcional y manual de uso del registro que escribe la flota el 2026-09-28 (confirmar rutas en
  Discovery)

## Dependencies & Impact

### Depends on

- Aprobación del operador de la línea completa sobre el canvas v39 («queda aprobada toda la línea gráfica»,
  2026-09-28): **otorgada**. Cubre formatos Pizarra/Escena/Lente/Recreo, cabecera y firma, contraportada A, acentos por
  línea, los 9 gráficos y las 3 láminas de texto denso.
- ADR y norma de Greenhouse del registro (rutas arriba): deben existir antes del Slice 0, porque el ADR de AXIS los cita.
- AXIS `origin/main` en `5b3056f` (tag `v0.3.24`): `axis-tokens` 0.3.24, `axis-ui-contracts` 0.3.22,
  `axis-brand-assets` 0.4.0, `axis-graphic-line` 0.9.0, `axis-ui-registry` 0.3.1.
- **Checkout de AXIS libre.** Hoy lo usa la sesión de Insights en la rama `docs/insights-lab` con cambios sin commitear
  (`README.md`, `apps/lab/src/components/Layout.astro`, `apps/lab/src/pages/references/graphic-line.astro`,
  `apps/lab/src/test/e2e/lab.spec.ts`, `docs/ARCHITECTURE.md`, `docs/agent-composition/README.md` y la página nueva de
  Insights), y la rama local `docs/glitch-flash-composer` tiene 2 commits sin empujar (`540810d`, `a7ff714`). La rama de
  esta task nace desde `main` cuando el checkout se libere; nunca en un worktree ni un clon aparte.
- Primitives de AXIS que se reutilizan: `efeonceGraphicLine` (`packages/tokens/src/tokens.ts:3414`), `glitchLine`
  (`tokens.ts:3912`, sólo para las pruebas de aislamiento), `measureSvg` (`packages/graphic-line/src/compose.ts:93`), la
  voz de la respuesta (`packages/graphic-line/src/answer.ts`), `resolveIcon`/`iconVoiceForLine`
  (`packages/graphic-line/src/icons.ts`), el sellado (`packages/brand-assets/scripts/seal.mjs`) y el molde de contrato
  `packages/contracts/src/glitch-line.ts` + `scripts/resolve-glitch-line.mjs`.
- Dirección de dependencias verificada: `axis-ui-contracts` depende sólo de `axis-tokens`; `axis-graphic-line` depende de
  `axis-tokens`, `axis-brand-assets` y `axis-ui-contracts`. Por eso el contrato va antes que los gráficos.
- SVG oficiales de MCM en OneDrive (usan `<style>`: los fills se inlinean como atributos antes de sellar).

### Blocks / Impacts

- Follow-ups de Greenhouse (tasks aparte, sin ID todavía): subir los pins de AXIS en `package.json`, catálogo
  `manzanitas` del Artifact Composer para componer carruseles desde datos, y que la skill `efeonce-graphic-line` consuma
  el paquete.
- `TASK-1921` (ruta productiva de piezas de marca): impacto indirecto; recibirá el catálogo de MCM en su follow-up, no
  en esta task.
- `TASK-1926` (registro cine en `foto:*`): las Escena y Lente de MCM usan ese registro fotográfico; sin cambio acá.
- `TASK-1918` (lente de la línea gráfica): la Lente de MCM usa `efeonceGraphicLine.lens` sin redefinirla.
- `TASK-1802` (content hub del blog): el nombre visible Think / Marketing con Manzanitas sigue pendiente allá; esta task
  no lo decide.
- `TASK-1922`/`TASK-1923`/`TASK-1924` (Glitch): no se tocan; las pruebas de aislamiento las protegen.
- Lab público `axis.efeonce.org`: página y entrada de navegación nuevas.
- ADR, norma y referencia de la skill en Greenhouse: al cierre citan el token y el contrato publicados.

### Files owned

AXIS (`/Users/jreye/Documents/axis-design-system`):

- `docs/architecture/MANZANITAS_REGISTER_TOKEN_CONTRACT_DECISION_V1.md` (nuevo)
- `packages/tokens/src/tokens.ts` (sólo el bloque `manzanitasRegister`, su tipo `ManzanitasRegister` y el export),
  `packages/tokens/src/index.ts` (re-export), `packages/tokens/src/tokens.test.ts` (pruebas del registro),
  `packages/tokens/package.json` (versión)
- `packages/brand-assets/assets/manzanitas/*.svg` (nombres finales en Discovery, convención `*-logo-positive|negative`
  como Glitch), `packages/brand-assets/scripts/seal.mjs` (sellado aparte de `assets/manzanitas`),
  `packages/brand-assets/src/manzanitas-manifest.ts` (generado), `packages/brand-assets/src/index.ts` (bloque
  `AXIS_MANZANITAS_ASSETS`), `packages/brand-assets/src/index.test.ts`, `packages/brand-assets/package.json`
- `packages/contracts/src/manzanitas-register.ts`, `packages/contracts/src/manzanitas-register.test.ts`,
  `packages/contracts/src/index.ts` (re-export), `packages/contracts/package.json`
- `docs/agent-composition/manzanitas-register-intent.schema.json`, `docs/agent-composition/manzanitas.md`,
  `docs/agent-composition/README.md` (sólo la entrada del registro)
- `docs/examples/manzanitas/**` (intents y manifiestos válidos, inválidos, `invalid-expected-issues.json` y las
  referencias del canvas para la paridad de gráficos)
- `scripts/resolve-manzanitas-register.mjs` y el script `manzanitas:resolve` en el `package.json` raíz
- `packages/graphic-line/src/charts.ts`, `packages/graphic-line/src/charts.test.ts`, `packages/graphic-line/package.json`
  (export `./charts` y versión), `packages/graphic-line/README.md` (fila del módulo), el script de paridad de gráficos
  en `scripts/` (nombre en Discovery)
- `apps/lab/src/pages/references/manzanitas.astro`, `apps/lab/src/pages/references/manzanitas.json.ts`,
  `apps/lab/src/data/manzanitas.ts`, `apps/lab/src/styles/manzanitas.css`, `apps/lab/public/media/manzanitas/**`,
  `apps/lab/src/test/unit/manzanitas.test.ts`, `apps/lab/src/test/e2e/lab.spec.ts` (sólo el bloque de Manzanitas),
  `apps/lab/src/components/Layout.astro` (sólo la entrada de navegación)

Greenhouse (`/Users/jreye/Documents/greenhouse-eo`), sólo al cierre y sólo como delta:

- `docs/architecture/MANZANITAS_REGISTER_DECISION_V1.md` y
  `docs/operations/brand-graphic-line/manzanitas/MANZANITAS_REGISTER_V1.md` (delta con versiones publicadas y nombres
  finales; la norma pasa a citar el token)
- `.claude/skills/efeonce-graphic-line/references/manzanitas.md` y su espejo `.codex/` (delta de nombres, sin cambiar
  cómo la skill produce piezas: eso es follow-up)

## Current Repo State

### Already exists

- AXIS `origin/main` = `5b3056f` (tag `v0.3.24`, «release(glitch): axis-tokens 0.3.24 y axis-ui-contracts 0.3.22 —
  Glitch Flash»); el `HEAD` del checkout coincide con `origin/main` y los cambios de Insights están sin commitear.
- `efeonceGraphicLine` (`status: 'canonical'`) con `color` (`dark` `#001a33`, `paper` `#f7f8f6`, `navy` `#023c70`,
  `halo` `#72ded8`), `lines` (growth, brand, engine, voice, revenue-hubspot, revenue-salesforce con `accentOnDark` y
  `accentOnLight`), `trajectory.measure`, `accentContrast` (`graphicMin: 3`, `largeTextMinPx: 24`,
  `accentInSmallText: false`), `signature`, `slogan`, `motion.layout.sloganOfLogo: 0.64` y `sloganGapOfFont: 1.35`,
  `type.answer` (Bricolage Grotesque 760, `-0.035em`), `type.question` (Poppins 300), `type.text` (Poppins 400/500),
  `lens` e `icons.voiceByLine` (`voice: null`).
- El gris `#c9d2dc` existe como `before` de la receta de deck `decision-chart` (`tokens.ts:2920`).
- `glitchLine` es top-level con `status: 'candidate'`, `inheritsFrom: 'efeonceGraphicLine'`, `scope` y pruebas de
  identidad en `packages/tokens/src/tokens.test.ts:530`; su `color.navy` es `#022a4e`, el mismo valor que la tinta del
  logo de MCM (misma cadena, distinto dueño: MCM no puede referenciar a Glitch).
- Brand-assets: `AXIS_BRAND_ASSETS` (familia `efeonce`, `globe`, `wave`, `reach`, `insights`), `AXIS_GLITCH_ASSETS`
  sellados aparte en `src/glitch-manifest.ts` desde `assets/glitch/` por `scripts/seal.mjs`, con prueba de sello,
  huérfanos y «nunca parte de la familia» (`src/index.test.ts:84`).
- Contratos: `packages/contracts/src/{graphic-line,surface-composition,email-signature,glitch-line}.ts`; `glitch-line.ts`
  (461 líneas) trae constante del contrato, versiones aceptadas, códigos con mensaje es-CL, validador que acumula y
  resolver que falla cerrado; ejemplos en `docs/examples/glitch/` con `invalid-expected-issues.json`; schema en
  `docs/agent-composition/glitch-line-intent.schema.json`; script `glitch:resolve` (`--input`, `--out`).
- Graphic-line 0.9.0: `measureSvg` (valor 0..1, fuente obligatoria, `measure-source-required`,
  `measure-value-out-of-range`), `runAdapterChecks`, voz de la respuesta en `answer.ts`, iconografía con `swipe`
  (Trazo, D28) y `mano` (Plastilina, D29); subpaths `./react`, `./element`, `./motion`, `./icons`.
- Lab: `/references/glitch/` + `glitch.json.ts` (schema `axis.glitch-line.v1`), `apps/lab/src/data/glitch.ts`, pruebas
  `apps/lab/src/test/unit/glitch.test.ts` y el bloque e2e de `lab.spec.ts:1624`; navegación en
  `apps/lab/src/components/Layout.astro`. `sharp` 0.35.3 está en el `package.json` raíz (lo usa
  `scripts/generate-orbit-assets.mjs`).
- Release: `.github/workflows/release-packages.yml` publica en GitHub Packages al empujar un tag `v*.*.*` que nombra la
  versión de al menos un paquete; un push a `main` despliega el Lab.
- Greenhouse fija hoy `axis-tokens` 0.3.24, `axis-ui-contracts` 0.3.22, `axis-brand-assets` 0.3.5,
  `axis-graphic-line` 0.7.0 y `axis-ui-registry` 0.3.1.

### Gap

- No existe `manzanitasRegister`: los valores del registro son literales del canvas, la norma y la skill.
- No existe el contrato `efeonce.manzanitas-register`, ni schema, ni ejemplos, ni `pnpm manzanitas:resolve`.
- Los archivos de MCM no están en ningún paquete: sólo en OneDrive, con `<style>` y sin el grupo manzana + puntos
  identificable para recibir el acento.
- No hay módulo de gráficos en AXIS: la lógica «dato → gráfico» vive dentro del canvas.
- No hay página del Lab ni JSON para agentes.
- Nada del registro se verifica antes de un render.

## Modular Placement Contract

- Topology impact: `ui-package`
- Current home: `repo hermano efeoncepro/axis-design-system: packages/tokens, packages/brand-assets, packages/contracts (@efeoncepro/axis-ui-contracts), packages/graphic-line y apps/lab; en Greenhouse sólo docs`
- Future candidate home: `ui-package`
- Boundary: `AXIS expone manzanitasRegister (tokens), AXIS_MANZANITAS_ASSETS (brand-assets), efeonce.manzanitas-register con validateManzanitasRegisterIntent y resolveManzanitasRegisterIntent (contracts) y el subpath @efeoncepro/axis-graphic-line/charts; consumidores autorizados: el Lab de AXIS, agentes por el JSON del Lab y, en follow-ups, el catálogo manzanitas del Artifact Composer y la skill efeonce-graphic-line. Ningún consumidor de La órbita ni de Glitch lo recibe`
- Server/browser split: `tokens, contrato y recetas son datos y funciones puras isomórficas; los assets son archivos estáticos; el Lab los usa en build y en el cliente sólo para el selector de línea; el render final ocurre en el consumidor`
- Build impact: `none en Greenhouse; en AXIS, un subpath nuevo en axis-graphic-line, pruebas nuevas en cuatro paquetes y una página del Lab`
- Extraction blocker: `none — AXIS ya es un repositorio con paquetes publicados por separado`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-lite`
- Impacto principal: `integration`
- Source of truth afectado: token `manzanitasRegister` (`@efeoncepro/axis-tokens`), archivos `AXIS_MANZANITAS_ASSETS`
  (`@efeoncepro/axis-brand-assets`), contrato `efeonce.manzanitas-register` (`@efeoncepro/axis-ui-contracts`) y recetas
  `charts` (`@efeoncepro/axis-graphic-line`) pasan a ser la fuente de verdad del registro; la norma de Greenhouse, la
  skill y el Lab pasan a ser derivados
- Consumidores afectados: Lab de AXIS (`/references/manzanitas/` y `/references/manzanitas.json`), agentes vía el JSON;
  en follow-ups, el Artifact Composer y la skill
- Runtime target: `local`

### Contract surface

- Contrato existente a respetar: `DesignPatternContract` (`packages/contracts/src/index.ts`), el esqueleto de
  `glitch-line.ts` (versiones aceptadas, issues `{ code, path, message }` con mensaje es-CL, validador que acumula,
  resolver que corta), `measureSvg` (no se modifica), `efeonceGraphicLine` y `glitchLine` (no se modifican)
- Contrato nuevo o modificado:
  - `manzanitasRegister` (export de `@efeoncepro/axis-tokens`, tipo `ManzanitasRegister`)
  - `MANZANITAS_ASSET_SEALS`, `AXIS_MANZANITAS_ASSETS`, `findManzanitasAsset`, `manzanitasAssetUrl`
  - `AXIS_MANZANITAS_REGISTER_CONTRACT` (`id: 'efeonce.manzanitas-register'`, `version: '0.1.0'`,
    `lifecycle: 'candidate'`), `validateManzanitasRegisterIntent`, `resolveManzanitasRegisterIntent`,
    `AXIS_MANZANITAS_REGISTER_ISSUE_CODES`, `AXIS_MANZANITAS_REGISTER_ISSUE_MESSAGES`; manifiesto
    `axis.manzanitas-register-composition.v1` (nombres finales en Discovery, registrados en el ADR)
  - subpath `@efeoncepro/axis-graphic-line/charts` con las 9 recetas y sus chequeos
  - `docs/agent-composition/manzanitas-register-intent.schema.json`
  - `pnpm manzanitas:resolve -- --input <intent.json> [--out <manifest.json>]`
  - JSON del Lab con schema `axis.manzanitas-register.v1`
- Backward compatibility: `compatible` — aditivo; ningún export existente cambia de forma ni de valor
- Full API parity: el resolver es el primitive; sus consumidores son el CLI `manzanitas:resolve`, el Lab, las recetas
  `charts` y, en follow-ups, el Artifact Composer y la skill. La ruta gobernada en Greenhouse (command/API/MCP) queda para
  el follow-up del catálogo sobre `TASK-1921`, igual que en `TASK-1922`

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna; no hay base de datos
- Invariantes que no se pueden romper:
  - `manzanitasRegister` referencia desde `efeonceGraphicLine` lo heredado (prueba de identidad de valor, sin literales
    duplicados de La órbita).
  - Ningún valor de `efeonceGraphicLine`, `glitchLine` ni de sus contratos referencia al registro, y el registro no
    referencia a `glitchLine`.
  - El acento de toda pieza sale de la **línea del tema** (una por pieza, un solo selector): manzana, tres puntos, arco,
    esfera, barra o cifra destacada, palabra del eslogan y voz del ícono «Desliza». Nunca un color fijo ni el de otra
    línea; el texto del logo queda en su tinta (`#022a4e` sobre papel, blanco sobre navy).
  - El acento nunca es superficie y nunca va en texto de menos de 24 px; en gráfico y texto grande mide ≥ 3:1 contra su
    fondo.
  - Una esfera por pieza y una órbita por pieza; ningún texto cruza la órbita.
  - El eslogan sólo cierra (cierre del carrusel, story de cierre, cierre del video); nunca en portada, blog, miniatura ni
    pódcast.
  - «Desliza» nunca en la última lámina ni en la story; siempre en su sitio fijo y en reposo.
  - En un carrusel: nunca dos láminas con foto seguidas; el dato con fuente y el cierre siempre en Pizarra; la lámina
    que sigue a una foto retoma la voz; todas las fotos comparten registro fotográfico y luz.
  - Un gráfico sin fuente no resuelve, salvo el Venn (concepto sin dato); un dato de muestra lleva la marca «Ejemplo
    ilustrativo · Fuente: …».
  - Partes de un todo: hasta 3 partes, en barra al 100 %; nunca una dona de partes.
  - Nada simula un botón en la contraportada; una sola conversión.
  - Una pieza que no está `approved` falla cerrado; no hay fallback a otra pieza.
  - Mismo intent + misma versión ⇒ mismo manifiesto, byte a byte (sin fechas ni aleatoriedad).
- Write-target allowlist: `no aplica — sin escrituras a base; las salidas son paquetes publicados y archivos del Lab`
- Tenant/space boundary: `sin datos de tenant — marca editorial propia de Efeonce`
- Idempotency/concurrency: resolver y recetas puros; el release es idempotente (el workflow salta versiones ya publicadas)
- Audit/outbox/history: sin outbox; la historia es el git de AXIS, el tag y la nota de release

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `manzanitasRegister.status: 'candidate'` y contrato `lifecycle: 'candidate'`
- Backfill plan: sin backfill
- Rollback path: en AXIS, revertir los commits y publicar un patch; las versiones publicadas en GitHub Packages no se
  borran; Greenhouse no fija estas versiones en esta task
- External coordination: operador (autorización del push a `main` de AXIS y del tag); sesiones de Insights y Glitch que
  comparten el checkout y los releases de AXIS

### Security and access

- Auth/access gate: paquetes privados de GitHub Packages con el acceso vigente; sin capability nueva en Greenhouse
- Sensitive data posture: sin datos sensibles; ningún ejemplo ni referencia del Lab usa personas reales del equipo
  (la estratega de la Escena interior es una persona por rol, generada)
- Error contract: el validador devuelve issues `{ code, path, message }` con código estable y mensaje en es-CL; el CLI
  sale con código distinto de cero y lista los issues; nunca un stack trace crudo como único mensaje
- Abuse/rate-limit posture: sin exposición de red

### Runtime evidence

- Local checks: `pnpm build`, `pnpm typecheck`, `pnpm test`, `pnpm lint` y `pnpm design:check` en AXIS;
  `pnpm manzanitas:resolve` sobre cada ejemplo; el script de paridad de gráficos; `pnpm --dir apps/lab test` y
  `pnpm --dir apps/lab test:e2e` (bloque Manzanitas)
- DB/runtime checks: sin base de datos
- Integration checks: CI de AXIS verde en `main`; run de `release-packages.yml` verde con las versiones nuevas publicadas;
  `https://axis.efeonce.org/references/manzanitas.json` sirve `tokens`, `contract` y `assets`
- Reliability signals/logs: sin señal; los gates son la vigilancia
- Production verification sequence: ver `Rollout Plan & Risk Matrix`

### Acceptance criteria additions

- [x] Source of truth, contract surface and consumers are named with real paths or objects.
- [x] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [x] *(No aplica: la task no crea tablas ni escribe en base de datos.)* Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR.
- [x] Migration/backfill/rollback posture is explicit and proportional to risk.
- [x] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [x] *(No aplica: no toca datos sensibles; los errores del validador son issues con código estable.)* Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

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

Los slices 0–5 se commitean en la rama de trabajo de AXIS **localmente**; nada se empuja hasta el Slice 6. Cada slice
deja `pnpm build && pnpm typecheck && pnpm test` verde en AXIS.

> **Orden ajustado respecto del brief:** el contrato va antes que los gráficos (Slice 3 y Slice 4) porque
> `axis-graphic-line` depende de `axis-ui-contracts` y nunca al revés (verificado en los `package.json` de ambos). Las
> recetas pintan lo que el contrato ya validó y resolvió, como hace `composeGraphicLine` con `efeonce.graphic-line-orbit`.

### Slice 0 — Gobierno: ADR de AXIS

- `docs/architecture/MANZANITAS_REGISTER_TOKEN_CONTRACT_DECISION_V1.md` (Status `Accepted` al commitear, con referencia
  al ADR y la norma de Greenhouse y a esta task), con el molde de `GLITCH_LINE_TOKEN_CONTRACT_DECISION_V1.md`:
  1. Export top-level `manzanitasRegister`, no rama de `efeonceGraphicLine`: ningún consumidor de La órbita lo recibe por
     accidente; hereda por referencia (prueba de identidad) y se aísla de `glitchLine` en ambos sentidos.
  2. Qué es un «registro» acá (complementa La órbita; distinto de los registros fotográficos) y la frontera con Glitch.
  3. Archivos en `assets/manzanitas/`, sellados como `MANZANITAS_ASSET_SEALS`, declarados en `AXIS_MANZANITAS_ASSETS`,
     fuera de `AXIS_BRAND_ASSETS`; colores como atributos, nunca `<style>`; geometría original sin redibujar.
  4. Contrato `efeonce.manzanitas-register` 0.1.0 `candidate`: resolver que falla cerrado y regla de pendientes (una
     regla que depende de una decisión abierta no se resuelve por omisión).
  5. Módulo `charts` en `axis-graphic-line`: genérico por línea, aprobado sólo para MCM (pendiente 8), publicado en el
     subpath `./charts` y fuera del export raíz de La órbita.
  6. Decisiones de Discovery que el ADR fija antes del Slice 1: nombres finales (export, ids de pieza, códigos), dónde
     vive la geometría de los gráficos (token vs. receta) y el umbral de la paridad de píxeles del Slice 4.
- Entrada del registro en `docs/agent-composition/README.md`.

### Slice 1 — Token `manzanitasRegister`

- Bloque `manzanitasRegister` en `packages/tokens/src/tokens.ts` y re-export (valor y tipo) en
  `packages/tokens/src/index.ts`, con `status: 'candidate'`, `register: 'marketing-con-manzanitas'`,
  `complements: 'efeonceGraphicLine'`, `approvedOn: '2026-09-28'`, la referencia al canvas v39 y `scope` (hereda /
  exclusivo / nunca).
- **Herencia por referencia:** `lines`, superficies (`color.dark`, `color.paper`, texto `color.navy`; el `darkBg` de
  `lines[]` no aplica, como en los íconos D21), `type.answer`/`question`/`text`, `trajectory.measure`, `accentContrast`,
  `slogan`, `motion.layout.sloganOfLogo`/`sloganGapOfFont`, `signature`, `lens` e `icons.voiceByLine`.
- **Contenido propio** (valores del inventario, medidos en el canvas v39; ver Detailed Spec): acento por línea del tema
  con un solo selector; cabecera (logo arriba a la izquierda, 200 × 90 en x 80 / y 72 del carrusel, los otros tamaños por
  formato, los 4 trazos de acento de 25, sin manzana en la portada Pizarra y la contraportada, pódcast a 420 px);
  formatos Pizarra / Escena / Lente / Recreo con sus reglas; story, blog, YouTube y pódcast; «Desliza»; firma en y 1202;
  cierre (logo 400 px, eslogan ≥ 24 px, bloque hasta y 1253); contraportada A; gráficos (gramática común y geometría de
  los 9); texto denso (3); `pieces` con su estado y `pendingDecisions` (las de la norma §13).
- Pruebas en `packages/tokens/src/tokens.test.ts`: identidad de cada valor heredado; aislamiento (ningún valor de
  `efeonceGraphicLine` ni de `glitchLine` es el registro o una parte de él, y el registro no contiene ninguna referencia
  a `glitchLine`); contraste de cada `accentOnLight` sobre papel y `accentOnDark` sobre navy ≥ 3:1; ninguna pieza de
  `pieces` está `approved` si su `id` figura en `pendingDecisions` como bloqueante.

### Slice 2 — Archivos oficiales en `assets/manzanitas/`

- Desde los SVG oficiales de OneDrive (inventario de la biblioteca de recursos): el logo completo positivo (tinta
  `#022a4e`) y negativo (blanco), el logo sin manzana («Marketing con Manzanitas» solo) positivo y negativo, y la
  manzana en contorno con sus tres puntos. Confirmar en Discovery qué archivo de OneDrive es la manzana en contorno con
  tres puntos antes de elegirlo.
- `<style>` → atributos `fill`, sin tocar la geometría (los `d` quedan idénticos a los originales). En el logo completo,
  los 4 últimos trazos de 25 (la manzana y los tres puntos) quedan identificados como grupo de acento con un atributo
  estable (nombre en Discovery) que el consumidor colorea con el acento de la línea; los 21 trazos del texto conservan su
  tinta.
- Sellado aparte en `packages/brand-assets/scripts/seal.mjs` → `src/manzanitas-manifest.ts` (`MANZANITAS_ASSET_SEALS`);
  `AXIS_MANZANITAS_ASSETS`, `findManzanitasAsset` y `manzanitasAssetUrl` en `src/index.ts`, con `register:
  'marketing-con-manzanitas'`, `kind`, `surface`, `variant` y `accentGroup`.
- Pruebas en `src/index.test.ts`: sellos correctos, sin huérfanos en `assets/manzanitas`, ningún archivo en
  `AXIS_BRAND_ASSETS` ni en `AXIS_GLITCH_ASSETS`, ningún `<style>` en `assets/manzanitas`, exactamente 4 trazos en el
  grupo de acento del logo completo y ninguno en el logo sin manzana.

### Slice 3 — Contrato `efeonce.manzanitas-register` 0.1.0 (candidate)

- `packages/contracts/src/manzanitas-register.ts` con el esqueleto de `glitch-line.ts`: constante del contrato, versiones
  aceptadas (`['0.1.0']`), tipos del intent (ver Detailed Spec: una pieza suelta o un carrusel ordenado de láminas, con
  canal, línea del tema, superficie, formato, rol, voz, gráfico con su dato y fuente, foto con registro fotográfico y
  luz, «Desliza», eslogan y firma), `validateManzanitasRegisterIntent` (acumula issues) y
  `resolveManzanitasRegisterIntent` (falla cerrado; el manifiesto trae los valores del token resueltos por pieza, el
  acento de la línea, las posiciones fijas y, para los gráficos, el dato normalizado, el destacado y la respuesta
  numérica calculada del dato).
- Códigos de issue estables con mensaje es-CL (propuesta en Detailed Spec; nombres finales en el ADR), un caso de prueba
  por código y la prueba de determinismo en `manzanitas-register.test.ts`; re-export en `packages/contracts/src/index.ts`.
- `docs/agent-composition/manzanitas-register-intent.schema.json` y `docs/agent-composition/manzanitas.md` (intent →
  `manzanitas:resolve` → manifiesto; nunca valores a mano; qué hereda de La órbita y qué no se mezcla con Glitch).
- `scripts/resolve-manzanitas-register.mjs` y
  `"manzanitas:resolve": "pnpm --filter @efeoncepro/axis-ui-contracts build && node scripts/resolve-manzanitas-register.mjs"`
  en el `package.json` raíz, al estilo de `glitch:resolve`.
- `docs/examples/manzanitas/`: intents y manifiestos válidos e inválidos (lista en Detailed Spec) y
  `invalid-expected-issues.json`.
- **Gate de la pendiente 2:** la regla «nunca más de tres Pizarras seguidas» sobre carruseles con gráficos se implementa
  según la decisión del operador o, si sigue abierta, con la conducta de falla cerrada descrita en Detailed Spec.

### Slice 4 — Módulo `charts` en `@efeoncepro/axis-graphic-line`

- `packages/graphic-line/src/charts.ts` y export `./charts` en `packages/graphic-line/package.json` (el export raíz
  `index.ts` no lo re-exporta, para que La órbita no lo reciba); fila del módulo en `packages/graphic-line/README.md`.
- Las 9 recetas (Medida en la órbita, Ranking, Antes y después, Tendencia, Partes de un todo, De cada 100, Venn de tres,
  Matriz 2 × 2, Embudo): reciben el gráfico resuelto por el contrato (o el dato, que validan con el contrato) y devuelven
  `{ svg, manifest }` con largos, posiciones, esfera, destacado y respuesta calculados; la Medida reutiliza `measureSvg`
  (valor ÷ 100) sin redibujar su geometría.
- Chequeos del módulo (resultado `{ check, ok, detail }` como `runAdapterChecks`): barras desde su número y desde cero,
  un solo acento y sólo donde está la idea, una esfera por pieza (en Medida y Tendencia la esfera es el dato y no hay
  voz), cifra con fuente, dato de muestra marcado, hasta 3 partes, sin dona de partes, ningún círculo suelto (conteo en
  cuadrados, Venn en discos sin anillo), texto en acento ≥ 24 px y acento ≥ 3:1 contra su fondo.
- **Paridad contra el canvas v39:** exportar cada tablero `Grafico-1…9` a PNG 1080 × 1350 con los datos de muestra del
  canvas y guardarlo en `docs/examples/manzanitas/charts/`; el script de paridad rasteriza cada receta con `sharp` y la
  compara contra su referencia al umbral fijado en el ADR (Slice 0), y además compara la geometría numérica (largos,
  posiciones y radios) contra la del canvas. La Medida repite la verificación del canvas en 0,05 / 0,38 / 0,62 / 0,9 / 1.
- Pruebas en `charts.test.ts`: una por receta, una por chequeo y los bordes (Medida en 0 y 100, Ranking con líder = tu
  marca, Embudo con dos pasos de igual conversión — la regla de desempate se decide en Discovery y queda en el ADR).

### Slice 5 — Lab `/references/manzanitas/` y `manzanitas.json`

- `apps/lab/src/pages/references/manzanitas.astro`, `apps/lab/src/data/manzanitas.ts` (sólo texto editorial y la lista
  de referencias con su estado; ningún HEX ni medida del registro), `apps/lab/src/styles/manzanitas.css` si hace falta y
  referencias del canvas en `apps/lab/public/media/manzanitas/` (con alt).
- Secciones: alcance («complementa, no reemplaza» La órbita; hermano de Glitch que no se mezcla; qué es «registro» acá),
  acentos por línea con el selector «Línea del tema», cabecera y firma, formatos y Recreo, «Desliza», contraportada,
  gráficos en vivo desde datos, texto denso, nunca, para agentes (intent → `manzanitas:resolve`) y pendiente.
- **Selector «Línea del tema» en vivo:** uno solo por página; al cambiarlo cambian a la vez la manzana y sus tres puntos,
  el gráfico, la palabra del eslogan y la voz del ícono «Desliza» (Brand = Plastilina `mano`; Growth, Engine y Revenue =
  Trazo `swipe`; Voice = Trazo provisional rotulado como pendiente). Los gráficos se generan con las recetas del Slice 4
  desde los datos de muestra, con la marca «Ejemplo ilustrativo».
- `apps/lab/src/pages/references/manzanitas.json.ts` (schema `axis.manzanitas-register.v1`): `register`, `tokens`
  (el bloque `manzanitasRegister`), `contract` (`id`, `version`, `lifecycle`, códigos de issue), `assets`, `charts`
  (recetas y su dato de entrada) y `pendingDecisions`.
- Entrada «Manzanitas» en la navegación de `apps/lab/src/components/Layout.astro` (coordinada con la sesión de Insights,
  que modifica ese archivo).
- `apps/lab/src/test/unit/manzanitas.test.ts` (los valores vienen del token; no hay HEX literal del registro en
  `data/manzanitas.ts`; cada referencia tiene alt) y bloque e2e en `lab.spec.ts` (el selector cambia los cinco elementos
  a la vez, el enlace de navegación tiene `aria-current`, el JSON trae `contract.id === 'efeonce.manzanitas-register'` y
  no hay scroll horizontal a 390 px).

### Slice 6 — Release de AXIS (gate: autorización explícita del operador)

- Versiones: re-verificar al ejecutar las próximas libres después de los releases de Insights y de Glitch en curso
  (hoy: `axis-tokens` 0.3.24, `axis-ui-contracts` 0.3.22, `axis-brand-assets` 0.4.0, `axis-graphic-line` 0.9.0; el
  subpath nuevo de graphic-line pide minor). Nota de release y delta del ADR de AXIS con las versiones.
- `pnpm build && pnpm typecheck && pnpm test && pnpm lint && pnpm design:check` verdes en la rama.
- Con autorización explícita del operador en chat: integrar a `main` (sin empujar commits ajenos), push, esperar CI
  verde, tag `vX.Y.Z` que nombre la versión de al menos un paquete, push del tag y run de `release-packages.yml` verde.
- Delta en el ADR, la norma y la referencia de la skill de Greenhouse con las versiones y nombres publicados (sin
  cambiar pins ni cómo la skill produce piezas).

## Out of Scope

- Subir los pins de AXIS en el `package.json` de Greenhouse (follow-up).
- El catálogo `manzanitas` del Artifact Composer y la ruta productiva gobernada (follow-up sobre `TASK-1921`).
- Que la skill `efeonce-graphic-line` consuma el paquete para producir piezas (follow-up).
- Resolver cualquiera de las decisiones abiertas de la norma §13 (Open Questions).
- Cambiar `efeonceGraphicLine`, `efeonce.graphic-line-orbit`, `efeonce.surface-composition`, `glitchLine` o
  `efeonce.glitch-line`, o pasar las recetas de gráficos a La órbita (pendiente 8).
- Cambiar estados de aprobación de piezas.
- Producir fotos para Escena o Lente (pipeline `foto:*`, `TASK-1926`), publicar posts o medir en Metricool.
- Modificar los originales de OneDrive.
- El nombre visible Think / Marketing con Manzanitas del blog (`TASK-1802`).
- Motion del registro (reel, video, cierre animado): el cierre del video hereda el lenguaje de La órbita; si el
  registro necesita valores propios, es otra task.

## Detailed Spec

### Forma propuesta del token

Valores del inventario de hechos (2026-09-28), medidos en el canvas v39; nombres finales en Discovery (ADR).

```ts
export const manzanitasRegister = {
  status: 'candidate',
  register: 'marketing-con-manzanitas',
  kind: 'editorial-register',          // complementa La órbita; no es una línea nueva
  complements: 'efeonceGraphicLine',
  approvedOn: '2026-09-28',
  source: { canvas: 'JxyMSQhwKuty6T6Kdhd4dG', version: 39 },
  photographyRegister: 'cine',        // registro FOTOGRÁFICO de Efeonce dentro del registro de marca
  lines: efeonceGraphicLine.lines,    // referencia
  accent: { by: 'topic-line', selectors: 1, appliesTo: ['apple', 'dots', 'arc', 'sphere', 'bar', 'highlight-figure', 'slogan-word', 'swipe-icon-voice'],
            never: ['surface', 'fixed-color', 'other-line', 'text-under-min'], contrast: efeonceGraphicLine.accentContrast },
  surfaces: { navy: efeonceGraphicLine.color.dark, paper: efeonceGraphicLine.color.paper, textOnPaper: efeonceGraphicLine.color.navy, lineDarkBg: 'not-applicable' },
  type: { answer: efeonceGraphicLine.type.answer, question: efeonceGraphicLine.type.question, text: efeonceGraphicLine.type.text },
  masthead: { anchor: 'top-start', logoInk: { onPaper: '#022a4e', onNavy: '#ffffff' }, accentPaths: { of: 25, last: 4 },
              carousel4x5: { x: 80, y: 72, w: 200, h: 90 }, sizesByFormat: { /* 160 × 72, 180 × 81, 240 × 108: medir a qué formato va cada uno */ },
              withoutAppleOn: ['cover-pizarra', 'back-cover'], podcastPx: 420, appleSilhouette: 'complete' },
  formats: { pizarra: {…}, escena: {…}, lente: {…}, recreo: {…} },
  channels: { carousel: {…}, story: {…}, blog: {…}, youtube: {…}, podcast: {…} },
  swipe: { x: 936, yCover: 1033, yInterior: 985, sizePx: 64, marginEndPx: 80, state: 'rest', glyphs: { stroke: 'swipe', plastilina: 'mano' },
           voiceByLine: efeonceGraphicLine.icons.voiceByLine, provisional: { voice: 'stroke' }, never: ['last-slide', 'story', 'signature-row', 'beside-top-voice', 'over-subject'] },
  signature: { inherits: efeonceGraphicLine.signature, logoY: 1202, logoPx: { w: 216, h: 51 }, bottomGapPx: 97, sameHeightOn: ['pizarra', 'escena', 'lente'] },
  close: { logoPx: 400, sloganMinPx: 24, blockEndsY: 1253, layout: { sloganOfLogo: …, sloganGapOfFont: … } /* referencias */, sloganOnlyOn: ['carousel-close', 'story-close', 'video-close'] },
  backCover: { variant: 'A', appleScale: 3.8, crop: ['top', 'end'], airBelowApplePx: 100, airAboveLogoPx: 120, conversions: 1, simulatedButtons: false,
               phone390: { answerPx: 69, subPx: 11, logoPx: 144, sloganPx: 9 } },
  charts: { canvas: { w: 1080, h: 1350 }, grammar: {…}, recipes: { measure: {…}, ranking: {…}, 'before-after': {…}, trend: {…}, parts: {…},
            'per-hundred': {…}, 'venn-3': {…}, 'matrix-2x2': {…}, funnel: {…} } },
  denseText: { 'concept-three-points': {…}, 'comparison-two-columns': {…}, 'step-by-step': {…} },
  pieces: { /* id → { status: 'approved' | 'study' | 'test' | 'rejected', approvedOn?, format, channel } */ },
  pendingDecisions: [ /* las de la norma §13, con el slice o la regla que afectan */ ]
} as const
```

Notas: el gris `#c9d2dc` de lo que no destaca es el `before` de la receta de deck `decision-chart`: se referencia desde
esa receta si el ADR lo permite sin acoplar el registro a `surfaces.deck` (decisión de Discovery). La tinta `#022a4e` del
logo es la misma cadena que `glitchLine.color.navy`, pero sale del asset de MCM y **no** se referencia a Glitch.

### Gramática de gráficos y las 9 recetas

Común: Pizarra (papel o navy), 1080 × 1350, cabecera, «Desliza» en 985 y firma en 1202; un acento sólo donde está la
idea, el resto en navy `#023c70` y gris `#c9d2dc` (sobre navy, `rgba(207, 228, 250, 0.22)` y texto suave `#cfe4fa`);
rótulos de 24–26 px, cifras en Bricolage 760; las siete recetas con voz cierran con la voz (respuesta 150 px, pregunta
45 px, en y 842, ancho 820) y la fuente en y 1068; Medida y Tendencia llevan sólo la pregunta arriba (Poppins 300, 44 px,
y 222). Las respuestas en palabras son texto editable; las numéricas salen del dato.

| Receta | Pregunta | Dato | Destacado | Respuesta | Superficie |
|---|---|---|---|---|---|
| Medida en la órbita | ¿Qué parte del total? | `valor` 0–100 | esfera en valor × 360° desde las 12, estela 50° y marca de partida (`measureSvg`); cifra Bricolage 230 px (170 al 100 %) + rótulo 32 px dentro del anillo r 300, centro 540/680 | sin voz | navy |
| Ranking | ¿Quién va primero y cuánto nos separa? | `[{ label, v, rol: 'lider' \| 'tu' }]` | barras de 44 px, máx. 760; líder navy, tu marca en el acento, resto gris; cifras Bricolage 40 | «N veces» = líder ÷ tu marca, redondeado | papel |
| Antes y después | ¿Cuánto cambió? | `{ antes, despues }` (índice, antes = 100) | columnas de 240 px, alto máx. 400, base y 740; llave en el acento con la diferencia (Bricolage 96) | en palabras | papel |
| Tendencia | ¿Hacia dónde va? | 12 valores mensuales | sin rejilla; línea blanca 90 % con trazo 7,62; último tramo como estela en el acento hasta la esfera r 16,66; último valor Bricolage 110, primero 40; meses 24 px | sin voz | navy |
| Partes de un todo | ¿De qué está hecho? | hasta 3 `[{ label, v, tono: navy \| gris \| acento }]` | barra al 100 % de 220 px, 6 px entre partes; leyenda en 3 columnas (cifra Bricolage 72 + rótulo 26) | «1 de N» = total ÷ parte destacada | papel |
| De cada 100 | ¿Cuántos de cada 100? | `valor` 0–100 | 10 × 10 cuadrados redondeados de 44 px con 10 px, llenos en el acento por filas; clave «sin clic / con clic» | «N de 100» | navy |
| Venn de tres | ¿Dónde se cruzan tres cosas? | concepto, sin dato ni fuente | tres discos r 190 en navy al 12 % (multiplicar), centro triple en el acento; rótulos fuera (26 px) | en palabras | papel |
| Matriz 2 × 2 | ¿Qué hago primero? | `[{ label, esfuerzo 0..1, impacto 0..1, foco? }]` | ejes al centro; «Hazlo ya» en el acento (Bricolage 40); píldoras de 26 px; la de `foco` con fondo en el acento y texto `#001a33` en negrita | en palabras | navy |
| Embudo | ¿Dónde se pierde? | `[{ label, v }]` en orden | barras centradas (máx. 760, alto 70); columna «Pasa» (Bricolage 48); el paso con peor conversión en el acento | en palabras | papel |

Geometría de la Medida (de `measureSvg`, verificada en el canvas): anillo `#72ded8` al 16 %, trazo 2,38; arco 3,81;
esfera r 8,33; marca de partida al 60 %. Texto denso: la voz arriba (y 216, respuesta 130 px) y el texto debajo;
«Concepto y tres puntos» (papel; párrafo 32 px; cifra 56 en el acento, título 30/600, cuerpo 28), «Comparación en dos
columnas» (navy; encabezados Bricolage 60, el segundo en el acento; 4 filas con rótulo 24/600 suave y celdas 30; remate
28) y «Paso a paso» (papel; 4 pasos: cifra 56 en el acento, título 30, cuerpo 28).

### Intent y códigos de issue (propuesta)

```ts
type AxisManzanitasRegisterIntent = {
  contract: 'efeonce.manzanitas-register'
  version: '0.1.0'
  register: 'marketing-con-manzanitas'
  channel: 'carousel' | 'story' | 'blog' | 'youtube' | 'podcast'   // ids finales en Discovery
  topicLine: AxisGraphicLineServiceLine                             // de efeonceGraphicLine.lines
  slides: Array<{
    piece: string                         // id de manzanitasRegister.pieces
    format: 'pizarra' | 'escena' | 'lente'
    surface: 'paper' | 'navy'
    role: 'cover' | 'interior' | 'data' | 'close' | 'back-cover'
    voice?: { question: string, answer: string, sub?: string }
    chart?: { recipe: string, value?: number, data?: unknown, source?: string, illustrative?: boolean }
    denseText?: { template: string, content: unknown }
    photo?: { photographyRegister: 'cine', lightId: string }
    swipe?: boolean
    slogan?: boolean
    declaredSpheres?: number
    declaredOrbits?: number
  }>
}
```

Códigos propuestos (nombres finales en el ADR; cada uno con mensaje es-CL y un caso de prueba): `register-required`,
`version-unsupported`, `channel-invalid`, `topic-line-required`, `topic-line-invalid`, `piece-invalid`,
`piece-not-approved`, `format-invalid`, `surface-invalid`, `accent-line-mismatch` (acento fijo o de otra línea),
`accent-as-surface`, `accent-text-too-small`, `sphere-count-exceeded`, `orbit-count-exceeded`, `slogan-not-allowed`,
`swipe-not-allowed` (última lámina o story), `masthead-apple-not-allowed` (portada Pizarra y contraportada),
`photo-slides-adjacent`, `pizarra-run-exceeded`, `data-slide-not-pizarra`, `close-slide-not-pizarra`,
`voice-missing-after-photo`, `photo-register-mismatch`, `lens-on-cover`, `lens-with-other-orbit`, `chart-recipe-invalid`,
`chart-data-invalid`, `chart-parts-exceeded`, `chart-source-required`, `chart-illustrative-unmarked`,
`chart-voice-not-allowed` (Medida y Tendencia), `back-cover-conversions-exceeded`, `simulated-button-not-allowed`,
`glitch-element-not-allowed` (manzana llena, verde `#6ec207`, bytes, «EDICIÓN #N») y `pending-decision` (la pieza o la
regla depende de una decisión abierta).

Las metas de mezcla del Recreo («≈ 2 de 7» con portada Pizarra y «≈ 3 de 7» con portada Escena) son aproximaciones: el
token las publica como guía y el validador sólo aplica las reglas absolutas («nunca…», «siempre…»). Propuesta a
confirmar en el ADR.

Ejemplos válidos en `docs/examples/manzanitas/`: portada Pizarra Engine, portada Escena Brand, interior Lente, cada uno de
los 9 gráficos, las 3 láminas de texto denso, contraportada A Engine («¿Te nombra la IA? Pregúntale.» + «En los
comentarios: cuéntanos si te nombró.») y Brand (Creative Workflows), y un carrusel Recreo de 7 láminas. Inválidos: manzana
en color fijo, dos láminas con foto seguidas, dato sin fuente, dato de muestra sin marca, eslogan en la portada,
«Desliza» en la última lámina, Lente en la portada, cuatro partes en Partes de un todo, texto en acento de menos de
24 px, voz en la Medida, y un elemento de Glitch en una pieza de MCM.

### Decisiones abiertas × slice (no se resuelven acá)

| # | Pendiente (inventario §3) | Slice | ¿Bloquea? | Cómo avanza sin decidir |
|---|---|---|---|---|
| 1 | Voz del ícono «Desliza» en la línea Voice | S1, S5 | no | el token referencia `voiceByLine` (`voice: null`) y publica el Trazo como `provisional` («mientras, Trazo», operador) con la entrada en `pendingDecisions`; el Lab lo rotula pendiente |
| 2 | ¿Los gráficos cuentan para «nunca más de tres Pizarras seguidas»? | S3 | **sí, esa regla** | con decisión, se implementa; sin ella, el validador aplica la regla donde no depende de la lectura y rechaza con `pending-decision` la secuencia cuya validez cambia según la respuesta (propuesta a confirmar con el operador al abrir el S3); nunca aplica la recomendación «sí» por su cuenta |
| 3 | Portada Pizarra con la mano en respuesta (dos esferas) | S1, S3 | no | la pieza queda en `study`; el resolver la rechaza (`piece-not-approved` / `sphere-count-exceeded`) |
| 4 | Zona segura de la story (firma 1620–1671 en la franja de interfaz) | S1, S3 | sí, la story Escena | el token publica la medida y las dos opciones sólo en `pendingDecisions`; la story Escena no resuelve (`pending-decision`) |
| 5 | Copy de cierre de la story («Guárdala» genérico) | S3, S5 | no | el copy no vive en el token; el ejemplo lo marca provisional |
| 6 | Registro cine con personas del equipo en redes | S1, S5 | no | ningún ejemplo ni referencia usa personas reales del equipo; la nota queda en `pendingDecisions` |
| 7 | Trazo `republicar` y `enviar` en borrador | S1, S3 | no | no entran al catálogo; MCM no los necesita (nada simula un botón) |
| 8 | ¿Las recetas de gráficos pasan a La órbita? | S0, S4 | no | módulo genérico por línea, aprobado sólo para MCM, en el subpath `./charts` fuera del export raíz; el contrato de La órbita no los acepta |

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 0 → Slice 1 → Slice 3 → Slice 4 → Slice 5 → Slice 6.
- Slice 2 puede correr en paralelo con el Slice 1 una vez cerrado el Slice 0; el Slice 3 lo necesita para declarar los
  archivos por id.
- El Slice 3 MUST NOT fijar la regla de las tres Pizarras sin la decisión del operador (pendiente 2) o sin la conducta de
  falla cerrada documentada en el ADR.
- El Slice 4 MUST esperar al Slice 3: las recetas pintan lo que el contrato resolvió (dirección de dependencias de AXIS).
- El Slice 6 MUST NOT correr sin la autorización explícita del operador del push y del tag: publicar en GitHub Packages
  no se deshace, y el push despliega el Lab público.
- El Slice 6 MUST secuenciarse después de los releases de Insights y de Glitch que estén en curso: nunca dos sesiones
  versionando los mismos paquetes a la vez.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El push a `main` de AXIS despliega el Lab a medio hacer | Lab `axis.efeonce.org` (Vercel) | medium | commits locales en rama propia hasta el Slice 6; push sólo con CI verde local y autorización | deploy del Lab con error o JSON sin `contract` |
| Un tag publica versiones rotas que no se pueden borrar | GitHub Packages | low | el workflow re-corre build, typecheck y tests antes de publicar; tag sólo tras CI verde | run de `release-packages.yml` rojo |
| Un rasgo de MCM se filtra a La órbita o a Glitch, o uno de Glitch entra a MCM | marca / AXIS | low | pruebas de aislamiento en tokens, contratos y brand-assets; diff de `efeonceGraphicLine` y `glitchLine` vacío; `glitch-element-not-allowed` | test de aislamiento rojo |
| Colisión con la sesión de Insights en `Layout.astro`, `README.md`, `docs/ARCHITECTURE.md` o `docs/agent-composition/README.md` | checkout compartido de AXIS | high | empezar sólo con el checkout libre; `git fetch` y `git log origin/main` antes de cada slice; tocar sólo las entradas propias | conflicto al integrar |
| Versión de paquete ya tomada por otro release | AXIS release | medium | re-verificar versiones libres en el Slice 6 contra `origin/main` y los tags | conflicto de versión al publicar |
| Recolorear el SVG altera la geometría o colorea trazos del texto | brand-assets | medium | `d` idénticos a los originales (prueba); exactamente 4 trazos en el grupo de acento | prueba de sello o de grupo roja |
| La paridad de píxeles falla por rasterización de fuentes, no por geometría | graphic-line | medium | comparar la geometría numérica además de los píxeles; umbral fijado en el ADR antes de medir | script de paridad rojo |
| Una medida del token no coincide con el canvas v39 | marca | medium | medir contra el canvas y las referencias exportadas; el operador revisa el Lab antes del push | revisión del operador |
| Una regla que depende de una pendiente se decide por omisión en el código | contrato | medium | tabla «Decisiones abiertas × slice»; `pending-decision` falla cerrado; revisión del ADR | caso de prueba de la pendiente |
| El gris de lo que no destaca mide 1,44:1 sobre papel | accesibilidad de los gráficos | medium | no se cambia el valor aprobado; rótulo y cifra van en navy (10,47:1); se registra como Open Question para el operador | revisión del operador |

### Feature flags / cutover

Sin flag: son paquetes versionados y el cambio es aditivo. El control de publicación es la autorización del operador y
`status`/`lifecycle: 'candidate'`. Ningún consumidor de Greenhouse lee el registro hasta los follow-ups (pins, catálogo,
skill).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 0 | revertir el commit local del ADR | minutos | si |
| Slice 1 | revertir el commit local del token | minutos | si |
| Slice 2 | revertir assets y sellos; re-sellar con `pnpm --filter @efeoncepro/axis-brand-assets seal` | minutos | si |
| Slice 3 | revertir contrato, schema, ejemplos y script | minutos | si |
| Slice 4 | revertir `charts.ts`, el export `./charts`, referencias y script de paridad | minutos | si |
| Slice 5 | revertir los archivos del Lab; si ya se empujó, el push del revert despliega la versión previa | minutos | si |
| Slice 6 | las versiones publicadas no se borran: publicar un patch que revierta y avisar a los consumidores | horas | parcial |

### Production verification sequence

1. AXIS local, en la rama: `pnpm build && pnpm typecheck && pnpm test && pnpm lint && pnpm design:check`.
2. `pnpm manzanitas:resolve -- --input <ejemplo>` con cada válido (sale 0) y cada inválido (sale distinto de 0 con el
   issue esperado de `invalid-expected-issues.json`).
3. Script de paridad de gráficos contra las 9 referencias del canvas v39, al umbral del ADR.
4. `pnpm --dir apps/lab test` y `pnpm --dir apps/lab test:e2e` (bloque Manzanitas).
5. El operador revisa el Lab local (`/references/manzanitas/`) y autoriza el push y el tag.
6. Integrar a `main` → push → CI verde → el Lab desplegado sirve `/references/manzanitas.json` con `tokens`, `contract` y
   `assets`.
7. Tag → `release-packages.yml` verde → versiones visibles en GitHub Packages.
8. Greenhouse: deltas de docs con versiones y nombres publicados; `pnpm docs:closure-check`.

### Out-of-band coordination required

- **Operador (Julio Reyes):** decisión de la pendiente 2 antes del Slice 3 (o aceptación de la conducta de falla
  cerrada), revisión del Lab local y autorización explícita del push a `main` de AXIS y del tag.
- **Regla de push a `main` de AXIS:** un push a `main` despliega `axis.efeonce.org` y un tag publica paquetes que los
  consumidores fijan por versión exacta. Antes de empujar: CI verde local, `git log origin/main..HEAD` revisado (sólo
  commits de esta task), el último deploy del Lab en verde y autorización del operador en chat. Nunca `--no-verify`;
  nunca empujar commits ajenos (la rama local `docs/glitch-flash-composer` y los cambios de Insights son de otras
  sesiones).
- **Sesiones paralelas en AXIS (Insights, Glitch):** esperar a que el checkout se libere para crear la rama y secuenciar
  los releases para no chocar versiones.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Existe `docs/architecture/MANZANITAS_REGISTER_TOKEN_CONTRACT_DECISION_V1.md` en AXIS, cita el ADR y la norma de
      Greenhouse y fija los nombres finales, la ubicación de la geometría de gráficos y el umbral de paridad. — *Evidencia: ADR en AXIS `main`; el umbral de paridad quedó como paridad geométrica.*
- [x] `@efeoncepro/axis-tokens` exporta `manzanitasRegister` (valor y tipo) con `status: 'candidate'`, `accent`,
      `surfaces`, `type`, `masthead`, `formats`, `channels`, `swipe`, `signature`, `close`, `backCover`, `charts`,
      `denseText`, `pieces` y `pendingDecisions` (nombres finales del ADR). — *Evidencia: `axis-tokens` 0.3.26; los nombres finales son `canvases` (por `channels`) y `slogan` + `backCover` (por `close`), registrados en el ADR de AXIS.*
- [x] Cada valor heredado de La órbita es una referencia a `efeonceGraphicLine` (prueba de identidad de valor) y no hay
      literales duplicados de La órbita en el bloque. — *Evidencia: prueba de identidad en `tokens.test.ts`.*
- [x] Ningún valor de `efeonceGraphicLine` ni de `glitchLine` referencia al registro, el registro no referencia a
      `glitchLine`, y el diff de ambos bloques en esta task es vacío. — *Evidencia: prueba de aislamiento; el diff del token en `d18b201` es sólo inserción (334 líneas, 0 borradas).*
- [x] Cada `accentOnLight` sobre papel y cada `accentOnDark` sobre navy miden ≥ 3:1 en la prueba del token. — *Evidencia: prueba de contraste en `tokens.test.ts`.*
- [x] `pendingDecisions` contiene las pendientes de la norma §13 y ninguna pieza afectada por una pendiente
      bloqueante figura como `approved`. — *Evidencia: 10 pendientes; `story-escena` y `cover-pizarra-swipe-response` quedan en `study`.*
- [x] `assets/manzanitas/` está sellado en `MANZANITAS_ASSET_SEALS` y declarado en `AXIS_MANZANITAS_ASSETS`; ningún
      archivo aparece en `AXIS_BRAND_ASSETS` ni en `AXIS_GLITCH_ASSETS`; no hay `<style>` en esos SVG; los `d` son
      idénticos a los originales; el logo completo tiene exactamente 4 trazos en el grupo de acento. — *Evidencia: pruebas de `brand-assets` (13/13); `seal` sin diff; los `d` de los cinco SVG son idénticos y en el mismo orden que los originales de OneDrive (verificado el 2026-09-28).*
- [x] `@efeoncepro/axis-ui-contracts` exporta `efeonce.manzanitas-register` 0.1.0 `candidate` con validador y resolver,
      y hay una prueba por cada código de issue. — *Evidencia: 0.1.0 en 0.3.24 y 0.1.1 en 0.3.27; una prueba por cada uno de los 45 códigos.*
- [x] Un intent con la manzana en color fijo, dos láminas con foto seguidas, un dato sin fuente, un dato de muestra sin
      marca, el eslogan en la portada, «Desliza» en la última lámina, Lente en la portada, cuatro partes, texto en
      acento de menos de 24 px, voz en la Medida o un elemento de Glitch falla con su issue. — *Evidencia: cada caso tiene su código en la prueba del contrato. «Lente en la portada» no fallaba en 0.1.0 y se corrigió en 0.1.1 (`cover-not-first`, ejemplo `invalid-lente-en-portada`).*
- [x] Una pieza que no está `approved` falla con `piece-not-approved` (o `pending-decision` si depende de una pendiente). — *Evidencia: `close-generic` da `piece-not-approved` y `story-escena` da `pending-decision`.*
- [x] La regla de las tres Pizarras sigue la decisión del operador sobre la pendiente 2, o falla cerrado con
      `pending-decision` en las secuencias ambiguas, sin aplicar la recomendación por su cuenta. — *Evidencia: la pendiente 2 sigue abierta, así que la secuencia ambigua devuelve `pending-decision` (con prueba).*
- [x] Dos resoluciones del mismo intent producen manifiestos idénticos byte a byte. — *Evidencia: prueba de determinismo.*
- [x] `pnpm manzanitas:resolve` resuelve cada ejemplo válido de `docs/examples/manzanitas/` con salida 0 y rechaza cada
      inválido con salida distinta de cero y el issue de `invalid-expected-issues.json`. — *Evidencia: 9 válidos salen con 0 y 8 inválidos con 1, con los issues de `invalid-expected-issues.json`.*
- [x] `@efeoncepro/axis-graphic-line/charts` expone las 9 recetas; el export raíz no las re-exporta. — *Evidencia: `axis-graphic-line` 0.10.0; hay una prueba de que la raíz no las exporta.*
- [x] Cada receta devuelve `{ svg, manifest }` con largos, posiciones, esfera y destacado calculados del dato, y las
      respuestas «N veces», «1 de N» y «N de 100» salen del dato. — *Evidencia: `charts.test.ts` y la prueba del contrato (4 veces, 1 de 8, 58 de 100, 1 vez).*
- [x] La Medida usa `measureSvg` y coincide con el canvas en 0,05 / 0,38 / 0,62 / 0,9 / 1. — *Evidencia: la esfera coincide con `measureSvg` en 5, 38, 62, 90 y 100 %; el canvas pinta su medida con `measureSvg` (norma §9.4).*
- [x] Los chequeos del módulo (barras desde su número y desde cero, un acento, una esfera, fuente, marca de ejemplo,
      ≤ 3 partes, sin dona de partes, sin círculo suelto, texto en acento ≥ 24 px, acento ≥ 3:1) tienen prueba y pasan
      en las 9 recetas. — *Evidencia: `runManzanitasChartChecks` pasa en las 9 recetas; hay casos negativos para acento bajo 24 px, círculo suelto y segunda esfera.*
- [ ] El script de paridad pasa en las 9 recetas contra las referencias del canvas v39 al umbral del ADR, en píxeles y
      en geometría numérica. — *Sin tildar: el ADR de AXIS reemplazó la paridad en píxeles por paridad geométrica (anchos del ranking `[760, 512, 198, 116, 66]`, embudo, tendencia, partes y matriz en `charts.test.ts`), porque el canvas maqueta el texto en HTML y el paquete pinta SVG.*
- [x] `/references/manzanitas/` publica las secciones del Slice 5 y `apps/lab/src/data/manzanitas.ts` no contiene
      ningún HEX ni medida del registro. — *Evidencia: página en vivo; la prueba unitaria no encuentra HEX en `data/manzanitas.ts` ni en `manzanitas.css`.*
- [x] En el Lab, cambiar «Línea del tema» cambia a la vez la manzana y sus puntos, el gráfico, la palabra del eslogan y
      la voz del ícono «Desliza» (prueba e2e), con Voice rotulada como pendiente. — *Evidencia: e2e en escritorio y móvil (manzana, acento del gráfico, eslogan, voz de «Desliza»); Voice queda rotulada como «provisional» y Salesforce como pendiente.*
- [x] `/references/manzanitas.json` (schema `axis.manzanitas-register.v1`) trae `register`, `tokens`, `contract` con
      `id === 'efeonce.manzanitas-register'`, `assets`, `charts` y `pendingDecisions`. — *Evidencia: el JSON en vivo trae `pendingDecisions` (10).*
- [x] La navegación del Lab tiene la entrada «Manzanitas» con `aria-current` en su página y no hay scroll horizontal a
      390 px. — *Evidencia: e2e (`aria-current`, sin scroll horizontal en iPhone 13 de 390 px).*
- [x] La publicación ocurrió sólo después de la autorización explícita del operador del push y del tag, registrada con
      fecha en el ADR de AXIS. — *Evidencia: deltas del ADR de AXIS del 2026-09-28.*
- [x] CI de AXIS verde en `main` y run de `release-packages.yml` verde con las versiones nuevas publicadas. — *Evidencia: CI de `main` en verde; `release-packages.yml` verde en `v0.3.25`, `v0.3.26` y `v0.3.27`.*
- [x] El ADR, la norma y la referencia de la skill en Greenhouse (con espejo `.codex/`) citan las versiones y los nombres
      publicados. — *Evidencia: deltas del 2026-09-28 en el ADR, la norma §14, `references/manzanitas.md` §10.3 y la skill `axis-design-system`, con espejo en `.codex/`.*

## Verification

- AXIS: `pnpm build`, `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm design:check`, `pnpm manzanitas:resolve`, el
  script de paridad de gráficos, `pnpm --filter @efeoncepro/axis-brand-assets seal` (sin diff tras sellar),
  `pnpm --dir apps/lab test`, `pnpm --dir apps/lab test:e2e`
- Greenhouse: `pnpm task:lint --task TASK-1936`, `pnpm ops:lint --changed`, `pnpm skills:mirrors` (si cambia la
  referencia de la skill), `pnpm docs:closure-check`
- Manual: revisión del operador del Lab local `/references/manzanitas/` antes del push

## Closing Protocol

- [x] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [x] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [x] `docs/tasks/README.md` quedo sincronizado con el cierre
- [x] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [x] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [x] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas — *ninguna task activa depende del registro; las que nombran Manzanitas (TASK-1802, TASK-1370, TASK-899) tratan naming y voz.*

- [ ] los follow-ups (pins de AXIS en Greenhouse, catálogo `manzanitas` del Artifact Composer, consumo desde la skill)
      quedaron registrados como tasks con ID propio y con los nombres finales del token, del contrato y de los assets — *Sin tildar: no se reservaron IDs; quedan listados en «Follow-ups», con los nombres finales ya publicados. La sesión de Glitch se ofreció a fijar las versiones en Greenhouse.*
- [x] el ADR de AXIS registra con fecha la autorización del operador que habilitó la publicación
- [x] cada pendiente del inventario §3 que el operador haya decidido durante la task quedó registrada en el ADR de
      Greenhouse y retirada de `pendingDecisions` en el mismo release — *ninguna pendiente se decidió durante la task; las diez siguen en `pendingDecisions`.*

## Follow-ups

- Subir los pins de AXIS en Greenhouse (`package.json` + `pnpm-lock.yaml`) con test focal de importación.
- Catálogo `manzanitas` del Artifact Composer para componer carruseles desde datos, sobre la ruta de `TASK-1921`.
- Que la skill `efeonce-graphic-line` consuma el paquete en vez de copiar valores.
- Promover `efeonce.manzanitas-register` de `candidate` a `stable` tras el primer carrusel compuesto con el contrato.
- Si el operador aprueba la pendiente 8, llevar las recetas a La órbita en una task propia.

## Open Questions

Las decisiones abiertas del registro (norma `MANZANITAS_REGISTER_V1.md` §13, 2026-09-28) siguen del operador; esta task no las resuelve:

1. La voz del ícono «Desliza» en la línea Voice (`voiceByLine.voice` vacío; mientras, Trazo).
2. Si los gráficos cuentan para «nunca más de tres Pizarras seguidas» (recomendación: sí). **Bloquea esa regla del
   Slice 3.**
3. La portada Pizarra con la mano en respuesta (dos esferas): ¿excepción registrada o vuelve a reposo?
4. La zona segura de la story (la firma de la Escena story, 1620–1671, cae en la franja de interfaz; franja desde y 1580
   o el 87 % de AXIS). **Bloquea la story Escena.**
5. El copy de cierre de la story (hoy «Guárdala» genérico).
6. El registro cine con personas del equipo en redes (la estratega de la Escena interior es una persona por rol,
   generada).
7. Los Trazo candidatos `republicar` y `enviar` siguen en borrador.
8. Si las recetas de gráficos pasan a La órbita para piezas de Efeonce (hoy aprobadas sólo para MCM).

Preguntas nuevas detectadas al planificar (para Discovery o para el operador):

9. `efeonceGraphicLine.lines` trae seis líneas (Revenue en HubSpot **y** en Salesforce); el inventario mide cinco
   acentos (Revenue HubSpot). Al heredar `lines` por referencia, el selector ofrece las seis: ¿se valida Revenue ·
   Salesforce en el canvas antes de publicarlo o se rotula como no revisado?
10. El gris `#c9d2dc` de lo que no destaca mide 1,44:1 sobre papel (medido con la fórmula WCAG). El valor está aprobado
    y rótulos y cifras van en navy; ¿se acepta así o se registra como pendiente de accesibilidad?
11. ~~Cobertura de la aprobación para story, blog, YouTube y pódcast~~ — **resuelta**: la aprobación del 2026-09-28
    («queda aprobada toda la línea gráfica») cubre todo el canvas v39, y esos canales ya estaban aprobados ese mismo día
    («Ok aprueba todas esas», fila del ledger «firma, cabecera, canales y eslogan»). Siguen abiertos sólo la zona segura
    y el copy de cierre de la story (4 y 5).
12. El navy `#022a4e` del texto del logo de MCM viene del archivo oficial y `glitchLine.scope.exclusive` lo declara del
    wordmark de Glitch (`navy-wordmark`): ¿tinta compartida de la familia o el logo de MCM pasa al navy de Efeonce
    (`#023c70`)? **Toca el Slice 1 (token) y el Slice 2 (assets)**; mientras, va el del archivo oficial.
