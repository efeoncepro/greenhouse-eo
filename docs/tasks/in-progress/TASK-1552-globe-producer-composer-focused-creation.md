# TASK-1552 — Globe Producer Composer Focused Creation

> ## 🛑 LEE ESTO ANTES DE TOCAR NADA
>
> **El plan cambió el 2026-07-27.** Si vas a implementar, en este orden:
>
> 1. **[`docs/ui/GLOBE_PRODUCER_COMPOSER_STYLE_REFERENCE_V1.md`](../../ui/GLOBE_PRODUCER_COMPOSER_STYLE_REFERENCE_V1.md)** — todos los valores, medidos. Escrito para **traducir, no interpretar**. Empieza acá.
> 2. **[ADR-016](../../architecture/creative-studio/EFEONCE_GLOBE_CLIENT_STYLING_ENGINE_DECISION_V1.md)** — el payload cliente usa **Tailwind v4**. El **Slice 0 de esta task está RETIRADO**.
> 3. ✅ **DESBLOQUEADA (2026-07-27). Slice 1 se puede tomar.** `TASK-1555` cerró (su región `producer-model-*` queda como baseline congelado: se decide dónde vive, no cómo se ve) y **el slice de Tailwind de `TASK-1485` YA ESTÁ** (2026-07-27, commits `804b7d7` + `91432ed`): motor instalado, theme generado desde el SSOT y los gates reescritos y verificados. Ver el Delta al pie.
> 4. En `efeonce-globe`, la rama `task/TASK-1552-slice0-internalizar-css` commit **`5edd2a3`** es **WIP congelado**: su mensaje dice qué conservar y qué revertir. **No lo tomes como entrega.** Ya fue limpiado en `804b7d7`; el commit se conserva sólo como referencia histórica de la copia de 151 KB.
>
> ⚠️ **No confíes en un `Status real` sin verificar el runtime.** Hoy pasó: `TASK-1555` declaraba `Diseño` con el código ya escrito, y eso desvió una sesión entera.

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1552-globe-producer-composer-focused-creation.md`
- Flow: `docs/ui/flows/TASK-1552-globe-producer-composer-focused-creation-flow.md`
- Motion: `docs/ui/motion/TASK-1552-globe-producer-composer-focused-creation-motion.md`
- Backend impact: `none`
- Epic: `EPIC-028`
- Status real: `TAILWIND LISTO, SUPERFICIE NO MIGRADA (2026-07-27): el motor de ADR-016 quedo instalado, gateado y verificado en efeonce-globe (804b7d7 + 91432ed) — theme generado desde el SSOT, 4 gates que muerden en className, canary de motor sobre valores computados. NINGUNA superficie migrada: el composer sigue con producerStyles y cero utilidades Tailwind. Unico bloqueo restante: cerrar TASK-1555. Baseline de diff capturado a 1440/390/320 CON la hoja del legacy. Historico: ADR-016 CAMBIO EL PLAN (2026-07-27): Slice 0 RETIRADO — el payload cliente migra a Tailwind v4 y una superficie reescrita no depende de la hoja legacy. BLOQUEADA por el slice de Tailwind en TASK-1485 y por cerrar TASK-1555. Diseno COMPLETO y documentado en docs/ui/GLOBE_PRODUCER_COMPOSER_STYLE_REFERENCE_V1.md (leer PRIMERO). Rama efeonce-globe task/TASK-1552-slice0-internalizar-css commit 5edd2a3 = WIP congelado con partes a revertir, ver su mensaje`
- Rank: `TBD`
- Domain: `creative|ui|product`
- Blocked by: `none`
- Branch: `task/TASK-1552-globe-producer-composer-focused-creation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Delta 2026-07-27 — ejecución Codex sobre el trabajo existente

La task se ejecuta sobre `develop` por instrucción explícita del operador; no se cambia de rama ni se usa
subagente. TASK-1555 condiciona únicamente la reubicación/rediseño de la región `producer-model-*`, no el
Slice 0 ni el hardening independiente del composer.

Aplicado en `efeonce-globe`: la hoja `producerStyles` se copió verbatim a
`apps/studio-client/src/surfaces/producer/composer/producer-composer.css`, el payload React dejó de recibir
`extraStyles: producerStyles` desde `studio-web`, y el fallback legacy conserva su fuente. Se agregaron los
markers `producer-composer`, `producer-advanced-settings` y `producer-generate-primary`, además de la primera
señal visual de `estimate stale`.

Estado de este corte: **Slice 0 implementado mecánicamente y canary local hidratado en `127.0.0.1:4324/producer`;
la paridad visual del movimiento verbatim ya puede medirse, pero el primer corte sigue mostrando la jerarquía
legacy (CTA bajo el fold y `advanced-controls` abierto). Tokenización de la hoja compat sigue siendo follow-up
de TASK-1560.**

Corrección posterior del mismo corte: la copia inicial había internalizado sólo reglas del panel y, al retirar
`extraStyles`, dejaba header/layout sin estilos. Se corrigió copiando los **147.479 B completos** de `producerStyles`
al payload React y agregando un guard scoped de contención. Medición canary actual: header 66 px; composer y riel
contenidos en 1440×1000, 390×844 y 320×844; `scrollWidth === clientWidth`; CTA visible; `advanced-controls` cerrado.
El estimate conserva el binding anterior y ahora pinta `data-estimate-state="stale"` con opacidad atenuada durante
el debounce. Esto mejora Slice 0/3 y la estabilidad del primer fold, pero no equivale aún al dock de herramientas
ni al cierre visual completo.

### Delta 2026-07-27 — primer corte del tool dock

Se retiró `advanced-controls` del markup React y se reemplazó por `producer-tool-dock[role=toolbar]` con tres
disclosures independientes: negativo, estilo/presets y seed. Cada herramienta conserva su estado/gate, icono
Tabler y target mínimo de 45 px; los paneles se abren sin overflow a 390/320 px. El selector y sus markers
`producer-model-*` no fueron tocados. La derivación completa desde el inventario server-side de capabilities y
la apertura en panel lateral siguen pendientes de contrato; el corte actual es una recomposición usable de las
herramientas ya existentes, no el cierre final de Slice 2.

### Delta 2026-07-27 — verificación registrada y auditoría de deuda CSS

El canary browser quedó registrado en `apps/studio-client/package.json`: el test levanta el servidor fixture,
ejecuta la matriz 1440×1000, 390×844, 320×844 y `prefers-reduced-motion`, y cierra el proceso al terminar.
La corrida vigente pasó build, 113 tests del client y todos los checks visuales.

El item Style del dock consulta `globe.producer.style.list` antes de mostrar su disponibilidad; el canary publica
esa capability y la prueba de browser volvió a pasar en las cuatro variantes.

La extracción/tokenización de `producer-composer.css` **no se da por hecha**: el artefacto de 34 KB descrito en
la revisión de Claude no está presente en este worktree. La hoja vigente sigue siendo una copia compat completa
de `producerStyles`, por lo que las excepciones de los gates de diseño/reduced-motion siguen siendo explícitas
y temporales, con `TASK-1560` como dueña de su retiro. No se debe interpretar el verde del gate como cobertura
de esos 147 KB mientras la hoja no sea sustituida por una extracción verificable.

## Delta 2026-07-25 — absorbe TASK-1564 (retirada) y la regla de reconciliación

Se creó `TASK-1564` ("Composer sobre el payload cliente") sin ver que esta task ya era la dueña del composer.
**`TASK-1564` queda retirada**; lo que aporta y pertenece acá:

**1. El composer se construye sobre el payload cliente** (`apps/studio-client`), no sobre el legacy — ADR-014
Slice 3. Hereda ya construido: transporte gobernado con epoch + idempotencia + refresh single-flight, resolver de
bytes con ciclo de vida de object URLs, SSOT de tokens y las primitives.

> ⚠️ **La ruta propia `/producer/compose` quedó DESCARTADA por la implementación** — ver el Delta medido más
> abajo. El composer **no tiene ruta propia**: vive dentro de `ProducerWorkspace` en `/producer`, y el gate es
> un flag, no una URL paralela.

**2. 🔴 La regla de reconciliación prototipo-vs-legacy — cinco clases, no una unión.** El prototipo aprobado tiene
riquezas que el legacy no tiene y viceversa; unir las dos listas es la respuesta equivocada porque **la autoridad
cambia según la clase**. Medido el 2026-07-25:

| Clase | Autoridad | Regla |
|---|---|---|
| forma, composición, motion, copy | **PROTOTIPO** | 11 `@keyframes` vs 0 en el legacy |
| invariantes de runtime (idempotencia, epoch, single-flight) | **LEGACY** | 7/19/9 menciones vs **0**: un HTML de fixtures no puede tenerlos |
| **plomería de accesibilidad** | **LEGACY** | contraintuitivo y medido: **9 `aria-live` vs 1**, 10 restauraciones de foco vs 0 |
| lo que el prototipo promete sin contrato | ninguna | deshabilitado **con su razón visible** |
| lo que el legacy muestra y **nunca despacha** | — | **no es riqueza: son promesas muertas** |

La última clase son **12 capabilities concretas** que el legacy gatea y jamás llama (`library.bulk.*`,
`experiment.evidence/list/tree`, `recipe.get`, `prompt.enhancement.accept/reject`, …), declaradas con su motivo en
`LEGACY_PARITY_EXCLUSIONS`. **Conclusión operativa: cuando alguien diga "el legacy tiene X y el nuevo no",
preguntar si X DESPACHA.**

**3. Retoque regional (inpaint) cae en la clase 4.** El prototipo lo desarrolla mucho (117 menciones), el legacy
tiene el diálogo pero el enmascarado es placeholder. Sin contrato de máscara → deshabilitado con su razón.

**4. El composer no necesita ningún scope OAuth nuevo.** Precisión sobre el enunciado original ("las 18
capabilities"): son **dos vocabularios distintos y no se cuentan juntos**. El composer despacha **14
capabilities** (`legacy-parity.ts`, `surface: 'composer'`), y la autoridad que las cubre son los **19 scopes**
de `PRODUCER_HUMAN_CAPABILITY_SCOPES` (`apps/studio-web/src/app.ts:241`), que sirven a **todas** las superficies
— no hay mapeo 1:1. Lo verificado y load-bearing es que **ninguna de las 14 exige un scope que hoy no se pida**:
los `globe.lab.*` los cubre `globe.lab.experiment.run`, los de ruta/flota `globe.producer.catalog.read`, las
voces `globe.voice.preset.manage` y el estimado `globe.credits.estimate`.

Importa porque agregar un scope es un rollout de 3 pasos cero-downtime **across dos repos**, y hacerlo de un
movimiento **tiró abajo todo el login de Globe** una vez. **Si la recomposición introduce una capability nueva,
verificar primero su `requiredCapability` contra esa lista ANTES de tocar el broker.**

**Docs de UI** (autorados para TASK-1564, **ya renombrados y migrados** a esta task — los paths `TASK-1564-*`
NO existen): wireframe `docs/ui/wireframes/TASK-1552-globe-producer-composer-focused-creation.md` (con el anexo
de geometría medida), flow del gasto con sus 4 compuertas
`docs/ui/flows/TASK-1552-globe-producer-composer-focused-creation-flow.md`, motion
`docs/ui/motion/TASK-1552-globe-producer-composer-focused-creation-motion.md`. Flow y motion son **compartidos
con `TASK-1532`** a propósito: el flujo del gasto es uno solo.

## Delta 2026-07-25 (tarde) — medido contra el runtime, no inferido

Verificado contra `efeonce-globe@main` y el árbol de trabajo. **El port 1:1 ya ocurrió**; lo que queda de esta
task es exactamente su alcance original: la **recomposición de jerarquía**, el motion y la evidencia.

| Qué | Estado medido | Consecuencia para esta task |
|---|---|---|
| `apps/studio-client/src/surfaces/producer/composer/ProducerComposer.tsx` | **existe, 45 KB**, con `producer-composer.css` | Slice 1 ya no parte de cero: parte del port |
| Ruta | `main.tsx`: `{ path: '/producer', Component: ProducerWorkspace }`; el comentario del archivo dice **«El composer NO tiene ruta propia: vive dentro de este [workspace]»**. `/producer/feed` sobrevive como ruta focalizada del strangler | **`/producer/compose` no existe y no se va a crear** |
| Gate de servido | `GLOBE_CLIENT_APP_ENABLED` **y** `GLOBE_CLIENT_PRODUCER_ENABLED`, ambos **cableados** en `infra/terraform/cloud_run_services.tf:136-137` | El cutover es un flip de flag, no una URL paralela. (El párrafo de `EPIC-028` que dice que `client_app_enabled` está sin cablear es **histórico**) |
| `GlobeGeneratingMark` | **YA EXISTE** (`primitives/GlobeGeneratingMark.tsx` + `globe-generating-mark.css`, 4 `@keyframes`) y **ya lo consume el composer** | El motion doc decía «nace en TASK-1565» (retirada). **Se consume, no se crea, y no hay deuda de isotipo estático** |
| `@keyframes` en el CSS del composer | **0** | El contrato de motion de esta superficie **está sin implementar**: la atenuación del estimado y las transiciones de popover son el trabajo de esta task |
| Ajustes avanzados | `<details className='advanced-controls' open>` — **abiertos por defecto** | Es el delta exacto que Slice 2 debe cerrar |
| Copy | namespace `producerComposer` **ya existe** en `apps/studio-client/src/copy/index.ts:132`; `apps/studio-web/src/producer-copy.ts` **sigue vivo** (14,5 KB) | La absorción por movimiento está **a medias**: quedan dos fuentes |
| `data-capture` presentes | 11 marcadores, pero **sólo `producer-output-shape` coincide** con los declarados en esta task | Los marcadores de la task estaban inventados; se alinean abajo contra el runtime |

**Regla que se desprende y hay que interiorizar:** el Delta de la mañana describía un plan (`/producer/compose`,
`producer-ui.ts` como owned, isotipo por construir). La tarde lo ejecutó de otra forma. **Un Delta describe el
día que se escribió; el runtime describe hoy** — antes de tomar esta task, `ls` sobre
`apps/studio-client/src/surfaces/producer/` y `grep` de la ruta en `main.tsx`, no memoria de este archivo.

## Delta 2026-07-27 — 🔴 el port no incluyó los estilos, y dos premisas estaban medidas sobre el archivo equivocado

Auditoría de diseño con `greenhouse-ai-design-studio`, medida contra `efeonce-globe@main`. **La regla del Delta
anterior se aplicó a este archivo y encontró tres cosas que lo invalidan parcialmente.**

### 1. 🔴 El composer React no tiene CSS propio: hereda la hoja del legacy VERBATIM

| Medición | Valor |
|---|---:|
| Clases distintas en `ProducerComposer.tsx` | **84** |
| Definidas en CSS de `studio-client` | **0** |
| Definidas **sólo** en `studio-web` (`producerStyles`) | **66** |
| Iconfont Tabler (asset servido aparte) | 18 |
| `producer-composer.css` | 2.202 B · **2 selectores** |
| `producerStyles` en `producer-ui.ts` | **147.543 B** |

No es descuido: `apps/studio-web/src/app.ts:2237-2256` lo hace a propósito y lo documenta — *«reutiliza la hoja
del legacy VERBATIM… Reescribir estas reglas en la capa nueva es lo que produjo la regresión del feed»*. La
decisión es defendible; **lo que falta es su dueño.**

**Consecuencia dura: la razón por la que esta task bloquea `TASK-1560` estaba mal enunciada.** Decía que el
legacy «sigue siendo la plantilla que el próximo agente copia» — razón cultural. La razón real es de runtime:
`producer-ui.ts` exporta la **única** hoja de estilos del composer nuevo. Borrarlo deja la superficie sin CSS.
Y como esta task declaraba ese archivo `NO owned` y `TASK-1560` es *retiro*, **nadie era dueño de migrar los
147 KB**. Lo cierra el **Slice 0** nuevo.

### 2. La premisa de motion de Slice 3 medía el stub de 2 KB

Este archivo afirmaba dos veces «**0 `@keyframes`** → el contrato de motion está sin implementar». La hoja que
la superficie **realmente aplica** tiene **16 `@keyframes`**, 20 `transition` y 2 `prefers-reduced-motion`,
incluido `budget-popover-in` — el popover que se creía faltante.

**La conclusión sobrevive, por otra razón:** `stale` aparece **0 veces** en la hoja real. La atenuación del
estimado —que el contrato de motion llama *«el motion más importante de la superficie»*— no existe. El TSX sí
ramifica `status.kind === 'stale'` (líneas 1222 y 1240): **el estado se decide y no se pinta.**

Es el anti-patrón que `EPIC-028` denuncia (*«el gate es el test de regresión del primer consumidor»*, el drift
guard que medía 12 de 38), reaparecido dentro de la task que lo documenta.

### 3. El gate de diseño no cubre la hoja que la superficie aplica

`design-contract.test.ts` camina `apps/studio-client/**`; la hoja real vive en `studio-web` y tiene **178 HEX
literales** y **3 ms literales**. El gate **documenta su propia frontera** (líneas 31-39) y asigna el ensanche a
`TASK-1560` Slice 2 — eso es buena gobernanza, no un agujero oculto. Pero mientras el estilo venga de ahí,
**esta task no puede reclamar cumplimiento del contrato de tokens: su verde es vacuo por construcción.**

### 3-bis. Evidencia visual: antes real vs. recomposición, misma hoja

Se montó el composer real (bundle + shell + `producerStyles`, igual que producción) y se prototipó la
recomposición **sobre la misma hoja**, para que la única variable fuera la composición.

| Medición | Antes (runtime real) | Recomposición |
|---|---:|---:|
| CTA `Generar` @1440×1000 | `y=1389` — **fuera del fold** | `y=921` — visible |
| Riel de estimado | `y=1332`, `position: relative` | `position: sticky` al pie |
| Alto del panel @1440 | 1249 px | 1000 px, sin scroll de página |
| Alto del documento @390 | **2.391 px** (2,8 pantallas) | 1.004 px |
| CTA @390 | `y=1460` — invisible | `y=806` — visible |
| `advanced-controls` | `open` | cerrado |
| Overflow horizontal | no | no |

**El riel NO está fijo hoy**, contra lo que el wireframe exige explícitamente (*«en angosto es lo único que no
puede quedar fuera de vista»*). Es un hallazgo nuevo: el gap lo describía como jerarquía, y además es geometría.

🔴 **Dos acoplamientos de la hoja legacy que muerden al recomponer** (encontrados al construirlo, no teóricos):

1. `.prompt-actions` está **posicionado en absoluto** dentro de `.prompt-field`. Al sacar el bloque de esa
   estructura, los botones flotan sobre el feed.
2. `.icon-pill` es **circular de tamaño fijo**: usado con label, recorta el texto.

Ambos son la misma clase de problema — **la hoja legacy tiene reglas acopladas a la estructura del legacy**, así
que mover markup sin mover CSS produce glitches que no son de diseño sino de herencia. Es evidencia adicional de
que **Slice 0 va antes que Slice 1**, y de que el diff visual a cero del Slice 0 tiene que medirse con el markup
actual, ANTES de recomponer.

### 4. Correcciones menores medidas

- `ProducerComposer.tsx` es de **69.378 B**, no 45 KB (+54 %; último commit `7cd0df3`, 2026-07-26). Re-medir
  antes de planificar.
- Los 9 tokens de motion que el contrato exige **existen los 9** en `tokens.ts`. Slice 3 no está bloqueado por
  `TASK-1523` en ese eje.
- Lo que este archivo declaraba con exactitud 1:1 contra el runtime y **se confirma**: los 11 `data-capture`,
  los 3 faltantes, `advanced-controls` `open` (línea 1010), `GlobeGeneratingMark` consumido, 3 `aria-live`.
- ⚠️ `pnpm task:lint`, `ui:wireframe-check` y `ui:readiness-check` son **el mismo binario**
  (`scripts/ci/task-lint.mjs`). Tres verdes son **una** pasada, no tres. Sólo `ui:quality` es distinto.
- ⚠️ La fuente visual (`~/Documents/Globe/…dc.html`) vive **fuera del repo**. El orquestador exige versionarla
  dentro. Mitigado por la geometría medida en el anexo del wireframe, no resuelto.

## Delta 2026-07-27 (2) — la estructura: núcleo por pregunta creativa + dock de herramientas

Feedback del operador sobre el primer prototipo, con tres correcciones que **cambian el diseño de la task**:

### 1. 🔴 «Ajustes avanzados» era un cajón de sastre — se retira como patrón

Colapsar todo bajo un `<details>` no resuelve el crecimiento: lo **aplaza**. Con `TASK-1530/1531` (prompt),
`TASK-1533/1534` (voz), `TASK-1572` (inpaint), `TASK-1536…1541` (efectividad) y `TASK-1494` (Style DNA)
apuntando a esta superficie, el acordeón se vuelve el próximo monstruo. Y peor: **«básico vs avanzado» es una
taxonomía del sistema, no del usuario** — un creativo no piensa «esto es avanzado».

**Estructura canónica: cinco bloques por pregunta creativa, y el núcleo NO crece.**

| # | Pregunta | Contiene |
|---|---|---|
| 1 | ¿Qué quiero? | prompt + `Mejorar con IA` + `Recientes` |
| 2 | **¿De qué parto?** | **referencias — visible, con slots** |
| 3 | ¿Cómo se ve? | dirección (muestras) + modelo |
| 4 | ¿En qué sale? | formato por uso + preview del lienzo |
| 5 | ¿Cuánto? | saldo + CTA |

**Lo que crece va a un `tool dock`**: una fila de iconos bajo el prompt; cada herramienta abre en **su propio
espacio**, no apilada en la columna. Sumar la herramienta #12 cuesta **un icono**, no 80 px de alto.

- **Regla de apertura:** popover anclado para lo chico (seed, negativo, cámara); panel lateral para lo que
  necesita ver la imagen (Style DNA, retoque, efectividad). *Si necesita lienzo, va al panel.*
- **El dock se deriva del catálogo/capabilities**, nunca de una lista hardcodeada — es el mismo invariante que
  el Scope ya exige para los campos por modalidad. Una capability nueva server-side aparece como herramienta
  sin tocar layout.
- Una herramienta sin contrato aparece **deshabilitada con su razón en `title`**, nunca oculta.

### 2. 🔴 Referencias NO es un ajuste: es una entrada

Estaba metida en el acordeón. Medido: **78 menciones de `reference`** en `ProducerComposer.tsx` — es de las
regiones más desarrolladas de la superficie. Para quien trabaja con imagen, **partir de una referencia es tan
primario como escribir el prompt**. Sube al bloque 2, con affordance explícita de subir imagen o video.

### 3. 🔴 La iconografía es funcional, no decorativa — su ausencia es REGRESIÓN

El composer real usa **23 iconos Tabler**: `ti-wand` ×3 (justo en «Mejorar»), `ti-sparkles`, `ti-photo-plus`,
`ti-photo-up`, `ti-dna-2`, `ti-history`, `ti-circle-minus`, `ti-lock-open`, `ti-bulb`, `ti-selector`, `ti-check`…
El primer prototipo los perdió al recomponer.

**El operador de esta superficie es creativo y lee visualmente**: el icono es velocidad de reconocimiento, no
adorno — la varita se reconoce antes de leer «Mejorar con IA». Y el dock **no funciona sin iconos**: son su
unidad. La fuente ya se sirve (`/assets/icons/tabler-icons.min.css` vía `assets.ts`), así que conservarlos no
agrega dependencia: **quitarlos sí resta**.

⚠️ **Criterio de aceptación nuevo:** ninguna acción, herramienta o encabezado de bloque queda sin su icono, y el
recuento de iconos de la superficie **no baja** respecto del baseline medido (23).

**Isotipo de casa en el selector de modelo.** Cada modelo se identifica por el isotipo real de su proveedor —
`bytedance.svg` (Seedream · Seedance · Seed Audio), `gemini.svg` (Nano Banana · Gemini · Veo), `openai.svg`
(GPT Image), `elevenlabs.svg` — servidos desde `apps/studio-web/public/models/` con el tratamiento vigente
(`<span class='model-mark'><img width=16 height=16>` + `filter: brightness(0) invert(1)`), y monograma como
fallback cuando no hay isotipo. Fuente: **simple-icons v16.27.0, CC0-1.0, copiados sin modificar**
(`public/models/README.md`). **NUNCA** transcribir a mano un logo de tercero ni inventar una variante. El
isotipo identifica la **casa**; el nombre público sigue siendo el modelo (`Seedream 5 Pro`), y el slug del
proveedor no aparece en el DOM.

### 4. Hallazgo de implementación: las clases del legacy ganan por especificidad

Al recomponer, `.control-title`, `.number-shape-field`, `.helper` y `.availability` de `producerStyles` pisaron
las reglas nuevas (títulos desalineados, input deformado). **Las clases nuevas necesitan namespace propio**
(`pc-*`) o el Slice 0 debe migrarlas de verdad. Tercer ejemplo del mismo acoplamiento — refuerza Slice 0 → Slice 1.

## Delta 2026-07-27 (3) — benchmark de mercado: el panel se reinterpreta, y las entidades salen al texto

Investigación con subagentes sobre 13 composers (jul 2026). Fuente primaria sólida en **Recraft, Krea, Adobe
Firefly e Ideogram**; Midjourney y Runway bloquean fetch directo (evidencia por snippets de sus propias docs);
Kling/Pika/Luma/Leonardo/Magnific sin doc pública de UI (evidencia secundaria, marcada).

### Los tres patrones que gobiernan

1. **El panel se reinterpreta, no crece** (Recraft): el modo se deriva de **qué hay seleccionado** — nada →
   generar, una imagen → editar, varias → esas pasan a ser referencias. Cero tabs, cero acordeones.
2. **Colapsar hacia el punto de acción** (Firefly, abril 2026): modelo, saldo de créditos y referencias
   **dentro de la barra del prompt**, explícitamente para retirar paneles satélite.
3. **Las entidades salen del panel al texto** (`@refs` — Runway Gen-4, Higgsfield Elements): nombres
   reutilizables invocados con `@` dentro del prompt. **Es la única estrategia que escala sin techo**: sumar 40
   personajes no agranda el panel ni un píxel.

> ⚠️ **Consecuencia para el `tool dock` del Delta (2):** el dock **contiene** bien, pero es un contenedor — con
> 20 herramientas hay 20 iconos. Los patrones 1 y 3 no contienen: **redistribuyen**. El dock se conserva para lo
> que es genuinamente una herramienta puntual; no es la respuesta completa al crecimiento.

### 🔴 `@menciones` — la pieza existe y el puente no tiene dueño

- `'mention'` **ya existe** como `RouteInputMode` en `packages/contracts/src/producer-catalog.ts:61`.
- `TASK-1580` va a crear los **Element** reutilizables… y **no menciona invocación por `@` en ninguna parte**.
- Ninguna task de UI la reclama.

Mismo patrón de hueco que el CSS del Slice 0: **dos tasks que asumen que la otra lo hace.** Necesita dueño
explícito — recomendación: slice de `TASK-1580` + su consumer de UI, no una task suelta.

### Implementado en esta pasada (verificado en browser)

| Mejora | Patrón fuente | Estado |
|---|---|---|
| **Metadata del modelo**: costo · velocidad · fortaleza (`10 cr · ~8 s · fotorrealismo`) | Krea — el benchmark de "transparent model selection" | ✅ |
| **Pin/lock de referencia** — distingue `Fijada` de `Solo esta vez` | Midjourney; casi nadie resuelve efímera vs sostenida | ✅ |
| **Elasticidad con FLIP** — el panel de herramienta abre inline y los hermanos se desplazan animando **`transform`**, nunca `height` | — | ✅ verificado: `getAnimations()` reporta `transform`; foco al panel; `Escape` cierra; `prefers-reduced-motion` salta la animación |

**La elasticidad NO viola la regla dura del contrato de motion.** Se mide la posición antes y después, y se anima
la diferencia con `transform` (FLIP). Visualmente se estira; el compositor no recalcula layout. Stack verificado:
React 19.2 + Vite 8, **cero librerías de animación** — se hace con `element.animate()` o `View Transitions`, sin
sumar dependencia.

⚠️ **Elástico donde hay continuidad** (abrir herramienta, sumar referencia: *lo mismo creció*). **Cross-fade donde
cambia el contenido** (Imagen→Video→Audio: los campos son **otros**, y estirar finge una continuidad que no
existe).

### Propuestas con impacto, sin dueño todavía

- **Modo borrador barato** (Luma Draft Mode): previsualizar en baja resolución y comprometer créditos completos
  sólo al render final. Para un producto cuyo centro es el gasto, es el patrón de mayor impacto del benchmark.
  Toca el contrato de estimate/créditos → `TASK-1532` + ledger.
- **Modo derivado del contexto** (Recraft) como evolución del progressive disclosure.

### Nota de implementación

La CSP estricta de Globe **necesita `script-src 'nonce-…'` explícito**: sin él cae a `default-src 'self'`, que
bloquea el inline **aunque lleve nonce**. Costó una iteración en el harness; el runtime real ya lo declara.

## Delta 2026-07-27 (4) — 🔴 el contrato de imagen no declara resolución, y el diseñador la necesita

Detectado por el operador al revisar la caja de Salida: *«esto lo opera un diseñador, ¿Estándar no sería 2K y
Alta 4K?»*. Verificado contra el contrato — el instinto señala un gap real, pero la respuesta no es renombrar.

**Lo medido:**

- Los valores reales de `quality` en el catálogo son **`standard` | `hd`**; algunas rutas traen `quality: []`
  (sin opción). **No existe 2K/4K en ninguna parte.**
- **`ImageRouteConstraintsV1` NO tiene campo de resolución** (`producer-catalog.ts:69-74`: sólo `quality`,
  `aspectRatio`, `count`). `VideoRouteConstraintsV1` **sí** declara `resolution` — la asimetría es real.

**Error propio corregido en la maqueta:** el preview del lienzo mostraba `1080 × 1350 px`, **un número
fabricado**: no venía del contrato. Para un director de arte eso es peor que no mostrar nada — decide encuadre,
tipografía y entrega contra una medida que la plataforma nunca prometió. Viola la regla que esta misma task
declara (*el navegador no calcula; catálogo/estimate son server-authoritative*). Retirado.

**Reglas que quedan para esta superficie:**

- **NUNCA** mostrar una medida en píxeles que el contrato no declare. Si la ruta no la da, se dice que no la da.
- La fila de acabado usa los valores **reales** del catálogo (`Estándar` / `HD`), y **se oculta** cuando la ruta
  trae `quality: []` — no se renderiza vacía ni con un default inventado.
- **Cuántas piezas** se refleja en el CTA y en el saldo al instante: es la variable que más multiplica el gasto y
  un multiplicador invisible es cómo se gasta de más.

**Gap escalado a su dueño (no es de esta task):** `ImageRouteConstraintsV1` debería declarar la resolución
resultante por combinación `quality × aspectRatio`, como ya hace video. Sin eso, un operador profesional no puede
decidir si una pieza sirve para el entregable. Dueño natural: **`TASK-1553`** (catálogo multi-modelo extensible)
o el dueño del contrato de catálogo. Mientras no exista, la UI lo declara como faltante en vez de rellenarlo.

## Delta 2026-07-27 (5) — ritmo vertical medido + las 4 regresiones que YA se cometieron

Prototipado en browser real. Se registran los valores y los modos de falla **para que no se repitan**: cada uno
costó una iteración y todos son reproducibles.

### Contrato de ritmo vertical (medido, no estimado)

| Relación | Valor | Nota |
|---|---:|---|
| Entre bloques del composer (`gap` del scroll) | **30 px** | a 17 px el operador lo reportó como *«todo muy apretado»* — **17 px es el piso que NO se debe usar** |
| Título de bloque → su contenido | **13,6 px** | a 8,8 px el título se lee pegado |
| Riel → último bloque | `padding-top` propio | sin él, el CTA se lee como parte del formulario |
| Chip de formato | `min-height: 54px` | a 46 px con dos líneas de copy el texto se ahoga |
| Control (`.opt`) | `min-height: 40px` | 34 px queda por debajo del target táctil |

⚠️ **Regla de método que originó esto:** se comprimió seis veces seguidas persiguiendo que todo entrara sin
scroll. **Era la prioridad equivocada** — el panel tiene scroll propio por diseño y el riel está anclado, así que
lo único que debe estar siempre visible es el gasto. **NUNCA sacrificar el ritmo vertical para evitar scroll
interno.**

### 🔴 Las 4 regresiones cometidas en el prototipo

1. **`max-height` en un chip con dos líneas → el contenido se sale.** Un glifo de proporción quedó 4 px por
   encima de su chip. **Nunca acotar la altura de un control cuyo contenido es variable**; usar `min-height`.
2. **`.estimate-rail > div` tiene CUATRO reglas en la hoja legacy, dos con `!important` forzando `display:grid`.**
   Cualquier `div` nuevo dentro del riel hereda la grilla y se desarma. Solución aplicada: **cambiar de elemento**
   (dejó de ser `div`), no pelear especificidad — una guerra de `!important` es deuda garantizada.
3. **Meter "Cuántas" dentro del riel lo hizo crecer a 3 filas y tapó el bloque de formato.** El riel es **sólo
   dinero**: saldo + CTA. Toda decisión de forma vive arriba, aunque multiplique el costo.
4. **Hardcodear `1 · 2 · 4` en cantidad.** El máximo lo declara la ruta (`count.min/max`) y varía: 7 rutas
   permiten 4, **4 rutas permiten sólo 1**. Regla derivada, implementada y verificada:
   - `max === 1` → **la fila no se renderiza** (la ruta no ofrece la decisión)
   - `max <= 4` → un chip por valor
   - `max > 4` → chips de atajo (`1 · 2 · 4 · max`) **+ campo para el valor exacto**, visualmente distinto del chip

   Es el tercer caso del mismo error (medida en píxeles · nombres de calidad · cantidad): **hardcodear en la UI
   lo que el catálogo declara.** El composer legacy ya lo hacía bien (`route.constraints.count` en su input); lo
   pobre era la presentación, no la fuente.

### 🔴 Bug de datos del catálogo (no es de UI)

Existe una ruta con **`count: { min: 4, max: 1 }`** — mínimo mayor que máximo. Ningún rango válido es posible y
rompe cualquier consumidor que confíe en él. Reportar al dueño del catálogo (**`TASK-1553`**); la UI debe
degradar a "sin opción" en vez de renderizar un control imposible.

### 🔴 Regresión 5 — renombrar clases también CORTA lo que sí se quería heredar

Se renombraron las clases nuevas con prefijo `pc-*` para escapar de las colisiones… y con eso el prompt
**perdió su glow**: `.prompt-field` del legacy trae `:hover` y `:focus-within` con borde encendido,
`box-shadow: 0 0 0 1.5px rgba(77,184,255,.55)` + halo proyectado, y `transition` de **220 ms** sobre
`border-color`, `box-shadow` y `background-color`. El operador lo detectó de inmediato.

**Las cuatro colisiones anteriores eran el legacy pisando lo nuevo. Ésta es la inversa:** renombrar te salva de
lo que estorba y te desconecta de lo que sirve. **Consecuencia dura para el Slice 0: es un movimiento consciente
regla por regla, NUNCA un renombrado masivo.** El inventario de las 84 clases debe marcar, para cada una, si se
hereda, se reescribe o se retira — y el glow es el ejemplo de que "se hereda" no es el caso raro.

⚠️ Al internalizar, **conservar el efecto y agregarle su corte de `prefers-reduced-motion`**, que el original no
declara.

### Lección de verificación

Se midió altura, `scrollWidth` y visibilidad del CTA — **y todo daba verde mientras el layout estaba roto**. La
métrica que faltaba es la de **contención**: para cada descendiente, comprobar que su rect esté dentro del rect
de su contenedor (arriba, abajo y a los lados). Sin eso, un `overflow: visible` deja hijos fuera sin que ninguna
métrica de página lo note. **Agregar esa aserción al canary de la superficie.**

## Delta 2026-07-27 (6) — el motor de ADR-016 está listo; la superficie NO está migrada

Ejecutados los pasos 1-4 del orden de ADR-016 en `efeonce-globe` (`804b7d7`, `91432ed`). **El paso 5 —migrar
por superficie— no empezó y sigue bloqueado por `TASK-1555`.**

### Lo que cambió para esta task

| Antes | Ahora |
|---|---|
| Bloqueada por `TASK-1485` **y** `TASK-1555` | Bloqueada **sólo** por `TASK-1555` |
| Slice 1 se escribiría en CSS | Slice 1 se escribe en **Tailwind**, con 4 gates que muerden en `className` |
| Sin baseline de diff verificable | Capturas a 1440/390/320 **con la hoja del legacy**, desde el canary |

### Estado medido de la rama, para que nadie lo asuma

- `producer-composer.css` volvió a **2.202 B**; `app.ts:2252` vuelve a pasar `extraStyles: producerStyles`.
- Se conservan los tres `data-capture` (`producer-composer`, `producer-advanced-settings`,
  `producer-generate-primary`), `data-estimate-state` y el estimado `stale`.
- **El tool dock se revirtió**: era Slice 2 adelantado al orden y su CSS vivía dentro de la copia. Se
  reescribe en Tailwind cuando toque.
- **Cero utilidades de Tailwind en `ProducerComposer.tsx`.** Las únicas seis en el CSS compilado son la sonda
  del seam que verifica el motor.

### 🔴 Dos hallazgos de runtime que cambian lo que esta task dice de sí misma

**1. El canary servía la superficie SIN estilos y daba TODO verde.** Contención, `scrollWidth`, recuento de
iconos y visibilidad del CTA dan lo mismo con o sin CSS. El canary se había escrito cuando la hoja vivía en el
bundle; al revertir, quedó midiendo una superficie desnuda. Corregido — ahora inyecta `producerStyles` como
producción.

> Es la MISMA lección que el Delta (5) ya registra («se midió altura, `scrollWidth` y visibilidad del CTA y
> todo daba verde mientras el layout estaba roto»), reaparecida un nivel más arriba: ahora el que estaba roto
> era el harness. **Se detectó mirando el render, no leyendo la salida.**

**2. `advanced-controls` no es «un disclosure abierto por defecto»: no es un disclosure.** La hoja del legacy
termina con `.advanced-controls > summary { display: none }` — medido en runtime: `display:none`, altura 0. El
`<details open>` **no tiene control para cerrarse**, ni con puntero ni con teclado.

El `## Gap` de esta task dice «`advanced-controls` está `open` por defecto — la progressive disclosure no
existe todavía». La medición dice algo más fuerte y más simple: **el markup es decorativo**. Refuerza la
decisión del Delta (2) de retirar el patrón, y agrega un argumento que no estaba: además de ser un cajón de
sastre, **hoy es inoperable por teclado**. El canary lo reporta como `KNOWN` en cada corrida.

### Lo que la implementación corrigió del propio ADR

El idiom de alias de la documentación de Tailwind (`@theme inline` con `var(--token)`) produce una
**referencia circular** cuando el nombre coincide a ambos lados — y en Globe casi todos coinciden, porque el
SSOT ya estaba escrito con los namespaces de Tailwind. Medido en browser: `text-xs` a 16px, `rounded-sm` a
0px, `font-display` en Times, **con el build verde**. El theme pasa a **generarse** desde el SSOT con valores.
Detalle completo en el Delta de [ADR-016](../../architecture/creative-studio/EFEONCE_GLOBE_CLIENT_STYLING_ENGINE_DECISION_V1.md).

⚠️ **Consecuencia para quien tome Slice 1:** el ritmo vertical medido (30 px entre bloques, 13,6 px
título→contenido) **no cae en la escala de 4 px de Tailwind**, y el gate rechaza `gap-[1.875rem]`. Hay que
decidir explícitamente: ajustar a `gap-8` (32 px) o subir el ritmo al SSOT como token. **No se puede postergar
en silencio** — que es exactamente para lo que se agregó ese cuarto gate.

## Summary

Recomponer el composer de Globe Producer para que una sola intención creativa domine el first fold: `prompt → dirección → output shape → generar`. Las capacidades avanzadas permanecen disponibles mediante progressive disclosure, sin duplicar el costo ni contradecir `TASK-1532`.

## Why This Task Exists

El composer actual intenta ser prompt editor, selector de modelos, panel de presets, laboratorio de seed, superficie de governance y panel de referencias simultáneamente. El resultado es una jerarquía débil, demasiados contenedores y una acción primaria poco concluyente. La solución es de composición y exposición progresiva, no de eliminación de capacidades.

## Goal

- Hacer del prompt la entrada dominante del Producer.
- Integrar Creative Prompt, Brief Direction y Creative Recipe en una única secuencia visible: intención →
  interpretación → receta/cámara → output shape → estimate → Generate.
- Presentar el output shape como intención de formato y no como una lista técnica: uso, ratio real, preview
  del lienzo y estrategia de generación nativa, conservación del origen o adaptación cuando corresponda.
- Reducir la competencia visual entre sugerencias, presets, referencias, seed, modelo y governance.
- Mantener Imagen, Video y Audio como modos de un solo producto con controles específicos por modalidad.
- Integrar el CTA y los estados de `TASK-1532` sin añadir una línea de costo duplicada ni ocultar créditos.
- Entregar una recomposición premium verificable en desktop 1440 px y mobile 390 px.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md`
- `docs/ui/visual-directions/TASK-1505-globe-creative-producer-approved-direction.md`
- `docs/tasks/in-progress/TASK-1505-globe-creative-producer-surface.md`
- `docs/tasks/to-do/TASK-1531-globe-creative-prompt-studio-experience.md`
- `docs/tasks/to-do/TASK-1532-globe-one-click-generate-automatic-estimate.md`
- `docs/tasks/to-do/TASK-1493-globe-structured-brief-composition.md`
- `docs/tasks/to-do/TASK-1499-globe-brief-direction-interpretation.md`
- `.codex/skills/greenhouse-ai-design-studio/SKILL.md`
- `.codex/skills/greenhouse-product-ui-architect/SKILL.md`

Reglas obligatorias:

- Reusar el lenguaje visual y el loop aprobado de Globe Producer, materializado en **componentes tipados del payload ADR-014** (esta task es el Slice 3 del strangler); no crear un sistema UI paralelo ni un cuarto bloque `:root` de tokens.
- El navegador no calcula costos, balance, policy, provenance ni provider metadata.
- El catálogo, estimate, prepare/generate, provenance y capabilities siguen siendo server-authoritative.
- El costo continúa visible en el CTA según `TASK-1532`; se elimina sólo la ceremonia de cálculo manual.
- Las capacidades aún gated aparecen con estados honestos y no como controles ejecutables falsos.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`
- **`docs/ui/GLOBE_PRODUCER_COMPOSER_STYLE_REFERENCE_V1.md`** — ⭐ **referencia consolidada de estilo**: cada
  región con su geometría, valores exactos, estados y comportamiento. Escrita para **traducir, no interpretar**;
  independiente del motor de estilos (sirve igual en CSS o Tailwind). **Empezar por acá al implementar.**
- `docs/ui/visual-directions/TASK-1552-globe-producer-composer-focused-creation.md`
- `docs/ui/wireframes/TASK-1552-globe-producer-composer-focused-creation.md`

## Dependencies & Impact

### Depends on

- `TASK-1485` ✅ **desbloqueado 2026-07-27** — motor de estilos del payload cliente (ADR-016). Tailwind v4
  instalado, theme generado desde el SSOT, 4 gates que muerden en `className` y canary de motor sobre valores
  computados (`efeonce-globe` `804b7d7` + `91432ed`). La recomposición se escribe en Tailwind.
- `TASK-1556` ✅ complete — foundation ADR-014: SSOT de tokens, capa de copy, primitives y shell del payload
  cliente. **Es de lo que esta superficie está hecha**; sin ella no hay dónde componer.
- `TASK-1505` — Producer surface y patrones existentes (dirección aprobada).
- `TASK-1532` — CTA único y estimate automático. **Flow y motion contract compartidos** con esta task.
- `TASK-1555` ✅ **complete 2026-07-27 — SLICE 1 DESBLOQUEADO.** Selector de modelo: dueño de la región
  `producer-model-*` **dentro del mismo archivo** (verificado: líneas 1128-1194). Cerrada con 11 asertos de
  browser sobre una flota de 4 modelos. **Su forma interna es baseline congelado**: Slice 1 decide **dónde
  vive** el bloque, nunca cómo se ve por dentro. El operador ya rechazó una versión galería del selector; recomponer el fold
  sobre una región en vuelo re-abre una decisión ya tomada. Al empezar Slice 1, el estado de los 5 markers
  `producer-model-*` es baseline congelado: se decide **dónde vive** el bloque, nunca su forma interna.
- `TASK-1523` — dueña del SSOT de motion del payload cliente (`GLOBE_CLIENT_MOTION_CONTRACT_V1.md`) y de
  `GlobeGeneratingMark`, que esta superficie **consume**.
- `TASK-1531` — Creative Prompt Studio, si su propuesta se integra en el composer.
- `TASK-1553` 🚧 in-progress — resolución de modelo por-ruta. No bloquea la jerarquía, pero define cuántas
  opciones tiene que absorber el selector dentro del fold.
- `TASK-1494` ✅ complete — Style DNA/Reference Intelligence, cuando la UI exponga esas affordances.

### Blocks / Impacts

- 🔴 **Bloquea `TASK-1560`** (retiro del payload legacy) **por acoplamiento de runtime, no por higiene**:
  `producer-ui.ts` exporta `producerStyles`, la **única** hoja de estilos que aplica el composer React (66 de
  sus 84 clases se definen sólo ahí; su CSS propio tiene 2 selectores). **Borrar ese archivo deja la superficie
  sin CSS.** El Slice 0 de esta task es la precondición material del retiro. La razón secundaria —que el legacy
  sigue siendo la plantilla que el próximo agente copia— es real pero no es la que bloquea.
- Mejora el first fold y la exposición de capacidades del Producer sin modificar contratos backend.
- Debe coordinar ownership de archivos con `TASK-1555` (misma superficie, mismo archivo), `TASK-1532` (CTA) y
  `TASK-1531` antes de implementación.
- No bloquea la librería, viewer ni las rutas de promoción; consume sus estados existentes.

### Files owned

- `../efeonce-globe/apps/studio-client/src/surfaces/producer/composer/ProducerComposer.tsx`
- `../efeonce-globe/apps/studio-client/src/surfaces/producer/composer/producer-composer.css`
- `../efeonce-globe/apps/studio-client/src/copy/index.ts` → namespace `producerComposer` (**sólo ese namespace**)
- `../efeonce-globe/apps/studio-web/src/app.ts` → **sólo** la rama del client app en `/producer`
  (líneas ~2237-2256): retirar `extraStyles: producerStyles` al cerrar Slice 0, conservando
  `extraStylesheets` de iconos. Ninguna otra línea de ese archivo
- `../efeonce-globe/apps/studio-client/scripts/producer-composer-canary.mjs` (**a crear**, junto a
  `producer-feed-canary.mjs` / `producer-motion-canary.mjs`)
- `docs/ui/visual-directions/TASK-1552-globe-producer-composer-focused-creation.md`
- `docs/ui/wireframes/TASK-1552-globe-producer-composer-focused-creation.md`

**NO owned — colisiones declaradas:**

- `apps/studio-web/src/producer-ui.ts` · `producer-controller.ts` · `producer-copy.ts` → **legacy, owned por
  `TASK-1560`** (retiro). Esta task no los edita; a lo sumo deja de depender de ellos.
- `apps/studio-web/scripts/producer-gvc-fixture.mjs` → fixture del **payload legacy**. Sirve como referencia de
  estados, no como el canary de esta superficie.
- La región `producer-model-*` **dentro de** `ProducerComposer.tsx` → **owned por `TASK-1555`** (selector de
  modelo, `in-progress`). **Las dos tasks editan el mismo archivo**: coordinar orden antes de tomar esta, o el
  rediseño de jerarquía pisa el desplegable recién aceptado por el operador.
- `apps/studio-client/src/primitives/GlobeGeneratingMark.tsx` + su CSS → contrato de motion owned por
  `TASK-1523`. Acá se **consume**.

## Current Repo State

### Already exists

- **El composer PORTADO al payload cliente**: `ProducerComposer.tsx` (45 KB) + `producer-composer.css`, montado
  en `/producer` dentro de `ProducerWorkspace`, hermano del feed. Conversión 1:1 desde el legacy —
  estructura, chips y copy—, deliberadamente **sin recrear**.
- Regiones ya montadas: prompt bar, reference tray, negative prompt, `advanced-controls`, style, seed,
  route/model (selector de `TASK-1555`), output shape y riel de estimado.
- Namespace de copy `producerComposer` en `apps/studio-client/src/copy/index.ts`.
- Transporte gobernado (epoch, idempotencia, refresh single-flight) y `composer-recipe.ts` con sus 17 tests
  (modelo de vigencia del estimado, dueña `TASK-1532`).
- Primitive `GlobeGeneratingMark` con sus 4 `@keyframes`, ya consumida por el composer y por el feed.
- 11 marcadores `data-capture` y 3 `aria-live` en la superficie.
- Estimate server-side y CTA contract de `TASK-1532`; Creative Prompt Studio propuesto en `TASK-1531`.

### Gap

- **La jerarquía sigue siendo la del legacy**: el port conservó el orden y la densidad de origen, que es
  exactamente el problema que esta task existe para resolver.
- `advanced-controls` está **`open` por defecto** — la progressive disclosure no existe todavía.
- La modalidad aparece duplicada dentro y fuera del composer.
- Sugerencias y presets forman una pared de chips sin jerarquía.
- Seed, modelo y governance compiten con la intención creativa.
- Referencias no disponibles pueden ocupar espacio dominante.
- 🔴 **El composer no tiene CSS propio**: 66 de sus 84 clases se definen sólo en `producerStyles`
  (`studio-web`, 147 KB), inyectada a propósito por `app.ts:2252`. Su archivo propio tiene **2 selectores**.
  Esto —no la higiene— es lo que bloquea `TASK-1560`. Lo cierra el Slice 0.
- **La atenuación del estimado no existe**: `stale` = 0 menciones en la hoja real, aunque el TSX ya decide ese
  estado. ⚠️ Corregido 2026-07-27: la afirmación anterior («cero `@keyframes` en el CSS del composer») medía el
  stub de 2 KB — la hoja real tiene **16**, incluida la del popover que se creía faltante.
- El gate `design-contract.test.ts` **no alcanza** la hoja real (178 HEX + 3 ms literales viven en
  `studio-web`): el verde de tokens de esta superficie es vacuo hasta el Slice 0.
- Faltan 3 de los marcadores `data-capture` que la evidencia necesita, y no existe canary de esta superficie.
- `producer-copy.ts` legacy sigue vivo en paralelo al namespace nuevo: dos fuentes de verdad.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `../efeonce-globe/apps/studio-client/src/surfaces/producer/composer` (payload cliente ADR-014),
  servido por `apps/studio-web` bajo `GLOBE_CLIENT_APP_ENABLED` + `GLOBE_CLIENT_PRODUCER_ENABLED`
- Future candidate home: `remain-shared`
- Boundary: UI consumer over existing Producer catalog, estimate, run, provenance and prompt contracts
- Server/browser split: browser owns presentation, disclosure and focus; Globe readers/commands own catalog, estimate, policy, access, provenance and generation
- Build impact: bundle Vite de `studio-client` (TSX/CSS/tests/canary) únicamente; no new dependency, package or runtime
- Extraction blocker: same-origin session/BFF, Producer state and current Globe pattern registry

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: operador creativo autenticado de Globe Producer.
- Momento del flujo: antes de generar una pieza Image, Video o Audio.
- Resultado perceptible esperado: entender qué crear, ajustar lo mínimo necesario y generar sin navegar un panel técnico.
- Fricción que debe reducir: densidad, duplicación, jerarquía débil y controles avanzados expuestos demasiado pronto.
- No-goals UX: ocultar capacidades, ocultar créditos, rediseñar todo el feed o convertir el composer en chat.

### Surface & system decision

- Surface: `/producer` → `ProducerWorkspace` → `composer/ProducerComposer.tsx`. **El composer no tiene ruta
  propia**; convive con el feed como hermano dentro del workspace.
- Composition Shell: `no aplica` — **y es regla dura, no conveniencia**: ADR-014 punto 8 / `TASK-1540` prohíben
  importar `CompositionShell`, primitives de Greenhouse, MUI o AXIS dentro de `apps/studio-client`. Globe
  materializa sus propios tokens y componentes.
- Primitive decision: `extend` — primitives del payload cliente
  (`apps/studio-client/src/primitives/index.tsx`: `Chip`, `Eyebrow`, `FactList`, `StateBlock`, `MediaStage`,
  `GlobeGeneratingMark`). **No crear primitive nueva en esta task**: una primitive con un solo consumer es una
  hipótesis, y se promueve sólo cuando una segunda superficie la consume **sin modificarla**.
- Adaptive density / The Seam: `aplica` — el composer debe recomponerse a 390 px sin compresión ni overflow.
- Floating/Sidecar/Dialog decision: conservar el lane existente; advanced settings pueden usar el patrón Globe vigente sólo si superan el fold.
- Copy source: `../efeonce-globe/apps/studio-client/src/copy/index.ts` — este slice **absorbe** `producer-copy.ts` **moviéndolo** (studio-web depende de studio-client: el copy viaja en esa dirección y nunca de vuelta). Duplicarlo abre dos fuentes de verdad cuyo drift es invisible hasta que una etiqueta queda vieja.
- Access impact: `entitlements` existentes; sin cambio de autorización.

### State inventory

- Default: prompt vacío, dirección compacta, output shape mínimo y ajustes avanzados cerrados.
- Loading: estados de estimate/prepare/run de `TASK-1532` dentro del mismo CTA.
- Empty: prompt vacío con orientación breve, sin pared de sugerencias.
- Error: mensaje canónico y recovery contextual.
- Degraded / partial: catálogo, references o capabilities no disponibles se muestran como gated/partial honestos.
- Permission denied: estado de capability sin raw error ni control ejecutable.
- Long content: prompt y labels envuelven sin romper el layout.
- Mobile / compact: columna única, CTA 44 px, disclosures usables y cero overflow.
- Keyboard / focus: focus visible; disclosure y CTA no roban foco; focus restore determinista.
- Reduced motion: estados y disclosure conservan significado sin transición espacial.

### Interaction contract

- Primary interaction: prompt → dirección/formato → CTA único `Generar`.
- Hover / focus / active: estados equivalentes en pointer, teclado y touch.
- Pending / disabled: sólo disabled por input/capability inválidos o command activo; estimate stale sigue resolviéndose por `TASK-1532`.
- Escape / click-away: no aplica al composer base; si advanced settings usan sheet, reutilizar contrato Globe existente.
- Focus restore: vuelve al control que abrió/cerró disclosure; el CTA conserva foco durante estimate/prepare/run.
- Latency feedback: reutiliza estados textuales de `TASK-1532`; no porcentajes inventados.
- Toast / alert behavior: errores persistentes en el bloque de ejecución; no depender sólo de toast.

### Motion & microinteractions

> ⚠️ **Corregido 2026-07-25.** Esta sección decía `Motion primitive: none`, y eso contradecía al contrato de
> motion que la propia task declara en Status. `Motion: none` en una task de superficie **es una alarma, no un
> default**: `TASK-1559` se autorizó así y el feed shippeó con 4 de 11 animaciones del diseño aprobado. El
> contrato manda; esta sección lo resume.

- Contrato gobernante: `docs/ui/motion/TASK-1552-...-motion.md`, aplicación del **SSOT**
  `docs/architecture/creative-studio/GLOBE_CLIENT_MOTION_CONTRACT_V1.md` (dueña `TASK-1523`).
- Motion primitive: **`GlobeGeneratingMark`, que se CONSUME** (ya existe, con sus 4 `@keyframes`); no se crea ni
  se reimplementa una segunda versión.
- El motion load-bearing de esta superficie es **la atenuación del estimado**: es la única señal de que el número
  en pantalla dejó de corresponder a lo que el botón va a ejecutar. Se dispara **sincrónica con el cambio de
  campo**, antes del debounce.
- Enter / exit: popover de ruta/estilo/voz con `--duration-overlay` / `--ease-enter`; anillo de foco con
  `--duration-short`.
- Layout morph: **ninguno**. El cambio del set de campos por capability es un salto deliberado — animar la altura
  de un formulario que cambia de contenido cuesta y no informa.
- Stagger: none.
- Timing / easing token: `--duration-none|short|overlay|breathe|flame|progress`, `--ease-enter|linear|pulse`.
  **Cero ms literales** — el gate de diseño de `studio-client` los rechaza como error.
- Reduced-motion fallback: `@media (prefers-reduced-motion: reduce)`, sin detección JS. ⚠️ **La atenuación del
  estimado NO se apaga**: se acorta la transición y el estado atenuado se conserva, porque no es decoración —
  es información sobre plata. El isotipo queda **en el DOM con la animación apagada**.
- Non-goal motion: parallax, loops, confetti, contadores animados en el riel de créditos, progreso ficticio o
  animaciones que retrasen control.

### Implementation mapping

- Route / surface: `/producer` (`main.tsx` → `ProducerWorkspace` → `composer/ProducerComposer.tsx`) en
  `../efeonce-globe/apps/studio-client`, servido por `studio-web` detrás de los dos flags.
- Primitive / variant / kind: primitives del payload cliente; sin variant nueva.
- Component candidates: las regiones ya montadas en `ProducerComposer.tsx` — prompt bar, reference tray,
  negative prompt, `advanced-controls`, style, seed, route/model, output shape, estimate rail — recompuestas;
  más los tokens del SSOT y `GlobeGeneratingMark`. El transporte gobernado (`governed-transport.ts`,
  `composer-recipe.ts`) se consume tal cual.
- Copy source: `apps/studio-client/src/copy/index.ts` → namespace `producerComposer` (ya existe). El
  `producer-copy.ts` legacy **se absorbe moviendo lo que falte**, nunca duplicando: dos fuentes de verdad cuyo
  drift es invisible hasta que una etiqueta queda vieja.
- Data reader / command: existing catalog, estimate, provenance, prepare/generate and prompt proposal contracts.
- API parity: no browser-side business logic; no endpoint/reader/command nuevo.
- Access / capability: current Globe capabilities/grants.
- States to implement: default, prompt entered, advanced open/closed, gated modality, no references, ready/stale estimate, estimating, preparing, running, invalid and error.

### GVC scenario plan

> ⚠️ **Corregido 2026-07-25.** El plan anterior apuntaba al fixture del **payload legacy**
> (`apps/studio-web/scripts/producer-gvc-fixture.mjs`) y a comandos `pnpm fe:capture`, que son de **Greenhouse**.
> Globe corre canaries propios en `apps/studio-client/scripts/` con Playwright. Y de los 6 marcadores
> declarados, **sólo 1 existía en el runtime**.

- Scenario file: `../efeonce-globe/apps/studio-client/scripts/producer-composer-canary.mjs` (**a crear**,
  siguiendo `producer-feed-canary.mjs` + `producer-motion-canary.mjs`; puerto propio, `CANARY_URL` override).
- Route: `http://127.0.0.1:<puerto>/producer` con el composer montado.
- Viewports: `1440×1000`, `390×844` **y `320`** — a 320 los campos de Salida pasan a una columna, y en el feed
  ya pasó que un chip decidiera el ancho de la página a 320 sin verse a 390.
- Quality profile: `premium`.
- Required steps: Image/Video/Audio, prompt, direction, output shape, advanced disclosure, no-reference route, stale estimate, one-click generate, keyboard and reduced motion.
- Required captures: first fold, advanced closed/open, modality variants, gated/invalid and ready/stale CTA.
- Required `data-capture` markers — **medidos contra el runtime**, no inventados:
  - ya existen y se conservan: `producer-prompt-bar`, `producer-reference-tray`, `producer-seed`,
    `producer-route`, `producer-output-shape`, `producer-estimate`;
  - existen y son de `TASK-1555` (no renombrar acá): `producer-model-picker`, `producer-model-trigger`,
    `producer-model-list`, `producer-model-option`, `producer-model-recommended`;
  - **a agregar por esta task**: `producer-composer` (raíz), `producer-advanced-settings` (el `<details>`),
    `producer-generate-primary` (el CTA).
- Assertions: exactly one primary CTA; no manual estimate button; no duplicated cost line; no dominant empty references panel; no provider slug/vendor cost/margin; no horizontal overflow.
- **Aserto de contención (nuevo, obligatorio):** para cada descendiente del panel con `width > 0`, su
  `getBoundingClientRect()` debe estar contenido en el del panel. Es la métrica que faltaba: altura, `scrollWidth`
  y visibilidad del CTA dieron verde **mientras el layout estaba roto**.
- **Aserto de ritmo:** `gap` efectivo entre bloques ≥ 28 px y `margin-bottom` de `.pc-title` ≥ 12 px.
- **Aserto de glow:** el `box-shadow` del campo de prompt **cambia** entre reposo y `:focus-within`.
- **Aserto de cantidad:** con `count.max === 1` la fila no existe en el DOM; con `max > 4` existe el campo exacto
  y su atributo `max` coincide con el de la ruta.
- Scroll-width checks: `document.documentElement.scrollWidth === document.documentElement.clientWidth` desktop and 390 px.
- Reduced-motion / focus evidence: disclosure, CTA state changes and keyboard navigation.
- Review dossier: `.captures/<run>/review/`.
- Baseline decision / surface ID: `globe.creative-producer-surface` after first-fold acceptance.

### Design decision log

- Decision: Focus + Context sidecar with progressive disclosure.
- Alternatives considered: technical compact composer; centered modal composer.
- Why this pattern: mantiene el loop aprobado de Producer y reduce competencia visual sin eliminar capacidades.
- Reuse / extend / new primitive: extend existing Globe Producer patterns; no parallel primitive/system.
- Open risks: coordinación de ownership con 1505/1531/1532 y composición de advanced settings en mobile.

### Visual verification

- GVC scenario: `task-1552-focused-composer`.
- Viewports: 1440×1000 and 390×844.
- Required captures: first fold, each modality, advanced disclosure, gated/invalid, CTA states.
- Required `data-capture` markers: all markers listed above.
- Scroll-width check: page and open surfaces must have no horizontal overflow.
- Accessibility/focus checks: labels, keyboard disclosure, visible focus, live states, reduced motion and 44 px targets.
- Before/after evidence: current Producer screenshot and focused-composer capture.
- Known visual debt: none accepted in first fold; gated capability styling may remain task-owned by backend/runtime owners.
- Visual scorecard: `docs/ui/reviews/TASK-1552-globe-producer-composer-focused-creation.scorecard.json`.
- Quality threshold: `average >= 4.5; floor >= 4; hierarchy/surface economy/visual impact/generic-template resistance >= 4.5`.

<!-- ZONE 2 — se completa al tomar la task -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

> **Punto de partida medido:** los slices operan sobre `ProducerComposer.tsx` **ya portado**, no sobre una
> superficie por construir. Ninguno reescribe el transporte, el modelo de vigencia del estimado ni el selector
> de modelo. ⚠️ **El port trajo el markup y la lógica, NO los estilos** (Delta 2026-07-27): por eso existe el
> Slice 0, y por eso ningún slice posterior puede declararse cerrado contra el gate de diseño sin él.

### ~~Slice 0 — Internalizar la hoja de estilos~~ · ⛔ RETIRADO 2026-07-27 (ADR-016)

> **Este slice ya no se ejecuta.** Existía para que el composer dejara de depender de `producerStyles` y así
> destrabar `TASK-1560`. [**ADR-016**](../../architecture/creative-studio/EFEONCE_GLOBE_CLIENT_STYLING_ENGINE_DECISION_V1.md)
> alcanza el mismo objetivo por otro camino: **una superficie reescrita en Tailwind tampoco depende de la hoja
> legacy.** Mover 272 reglas que se van a reescribir es trabajo desechable.
>
> El motor de estilos pasa a **`TASK-1485`** (dueño del Design System, confirmado por barrido de dominio).
> Esta task depende de que ese slice cierre antes de recomponer.
>
> **Lo que el trabajo del Slice 0 dejó y sí se conserva:** la copia verbatim de `producerStyles` que quedó en
> la rama es la **referencia de diff** perfecta para verificar que la reescritura no pierde nada. No se
> commitea como código; se conserva como baseline visual.

<details>
<summary>Contenido original del slice retirado (histórico)</summary>

### Slice 0 — Internalizar la hoja de estilos (precondición de `TASK-1560`)

**Decisión de método: mover verbatim ahora, tokenizar después.** Se evaluaron tres caminos y se descartan dos:

| Opción | Por qué no |
|---|---|
| Tokenizar los 178 HEX en el mismo movimiento | Apuesta la regresión visual que el comentario de `app.ts:2238-2244` dice que ya se pagó una vez en el feed. Mezcla un movimiento de archivos con un cambio de valores: si algo se ve distinto, no se sabe cuál de los dos fue |
| Dejarlo y ensanchar el gate en `TASK-1560` | Deja el bloqueo del retiro sin dueño, que es exactamente el hueco que este slice cierra |

- Mover a `apps/studio-client/src/surfaces/producer/composer/producer-composer.css` **las reglas que la
  superficie usa**, sin reescribirlas: mismos selectores, mismos valores, mismo orden. El criterio de corte son
  las 84 clases del TSX, no el juicio sobre qué "parece" del composer.
- Las reglas compartidas con feed/viewer que no son de esta superficie **no se mueven acá**: se declaran en el
  handoff como pendientes de sus dueñas (`TASK-1559`, viewer), para que `TASK-1560` sepa qué le queda.
- Resolver las 18 clases sin definición propia: las `ti-*` vienen de `/assets/icons/tabler-icons.min.css`
  (servida por `renderShell`) — declarar esa dependencia explícita. `sr-only` **sí se internaliza**: hoy sólo
  existe en el legacy y sin ella el texto para lectores de pantalla se vuelve visible.
- Al cierre del slice, `studio-web` deja de pasar `extraStyles: producerStyles` en la rama del client app
  (`app.ts:2252`); la hoja de iconos se conserva. **`producer-ui.ts` no se borra acá** — eso sigue siendo
  `TASK-1560`.
- Evidencia obligatoria: captura antes/después a 1440/390/320 con **diff visual a cero**. Un movimiento verbatim
  que cambia un píxel no fue verbatim.
- ⚠️ **La tokenización de los 178 HEX y los 3 ms NO es de este slice.** Nace como follow-up con dueño una vez
  que el gate de diseño alcance el archivo — recién ahí es medible.

</details>

### Slice 1 — First-fold composer hierarchy · **ahora se implementa en Tailwind (ADR-016)**

- Remove duplicated modality/title chrome inside the composer.
- Make prompt, direction and output shape the dominant creation path.
- Replace the suggestion chip wall with compact direction choices.
- Preserve the existing CTA and route/model semantics while reducing visual competition.
- Conservar el **riel de estimado fijo al pie**: es la información que decide el gasto y no puede perderse al
  scrollear.

### Slice 2 — Dock de herramientas y recomposición por modalidad

> ⚠️ **Reescrito 2026-07-27 (2).** La versión anterior decía «cerrar `advanced-controls` y agrupar bajo él model,
> seed, Style DNA, referencias y governance». Eso es el cajón de sastre que el Delta (2) retira: aplaza el
> crecimiento en vez de resolverlo, y mete **referencias** —una entrada— entre los ajustes.

- **Retirar `advanced-controls` como patrón.** El núcleo queda en los cinco bloques por pregunta creativa; lo que
  crece va al `tool dock`.
- Implementar el dock: fila de iconos, `role='toolbar'`, cada item ≥44 px, **derivado del catálogo/capabilities**
  y no de una lista hardcodeada. Apertura: popover para lo chico, panel lateral para lo que necesita lienzo.
- **Referencias sube al bloque 2** con affordance explícita de subir imagen o video y sus slots visibles.
- Render only modality-relevant controls for Image, Video and Audio. ⚠️ **El set de campos se deriva del
  catálogo, nunca de un `switch` sobre `capability` en el render**: una capability nueva server-side produciría
  un composer sin campos, en silencio.
- Keep unavailable references/capabilities honest without dominant empty panels; ninguna opción deshabilitada
  sin su razón visible (`title`), porque con motion apagado el texto es el único canal que queda.
- Ensure advanced settings remain keyboard-accessible and usable at 390 px; el `<details>` no puede ocultar bajo
  el foco (si el foco queda adentro al cerrar, moverlo antes a un ancla estable).

### Slice 3 — Execution states, motion and visual verification

- Integrate the `TASK-1532` CTA states without a second estimate button or duplicated cost line.
- **Motion — alcance corregido (Delta 2026-07-27).** No es «implementar el contrato desde cero»: la hoja real ya
  trae 16 `@keyframes` (incluido `budget-popover-in`) y 2 `prefers-reduced-motion`. Lo que falta de verdad:
  1. 🔴 **La atenuación del estimado.** `stale` = **0** menciones en la hoja; el TSX ya decide el estado
     (`status.kind === 'stale'`, líneas 1222/1240) y **no lo pinta**. Es el motion que el contrato llama el más
     importante de la superficie y es el único que no existe. Sincrónico con el cambio de campo, antes del
     debounce.
  2. El fallback de `prefers-reduced-motion` que **conserva** el estado atenuado (acorta la transición, no la
     apaga: es información sobre plata, no decoración).
  3. Decidir explícitamente, para las 16 heredadas, **internalizar vs. heredar** — el Slice 0 ya movió las de
     esta superficie; las que queden heredadas se declaran con su dueña.
  - Los 9 tokens exigidos (`--duration-none|short|overlay|breathe|flame|progress`, `--ease-enter|linear|pulse`)
    **existen los 9** en `tokens.ts`: no hay dependencia abierta con `TASK-1523` en este eje.
  - `GlobeGeneratingMark` se **consume**; nunca se reimplementa.
- Agregar los 3 marcadores faltantes (`producer-composer`, `producer-advanced-settings`,
  `producer-generate-primary`) sin renombrar los de `TASK-1555`.
- Crear `producer-composer-canary.mjs` y registrar sus tests en el script `test` del package.
- Capture, inspect and score desktop/mobile/320 first fold y estados clave.

## Out of Scope

- Changes to estimate, credit, balance, hard-cap, prepare, execute or spend contracts.
- Hiding credits or exposing vendor cost/margin.
- New API, reader, command, schema, migration, provider integration or capability.
- Full feed, viewer, collections, batch, review or share redesign.
- Crear el token SSOT / design system de Globe — entregado por `TASK-1556` Slices 2-3 (`apps/studio-client/src/{tokens/tokens.ts,copy/index.ts,gates/design-contract.test.ts}`, `eslint.config.js`); esta task lo consume. Tampoco crea primitives Greenhouse.
- Replacing the approved `TASK-1505` baseline; this task refines its composition.
- **Rediseñar el selector de modelo** (`producer-model-*`): es `TASK-1555`, ya vivo y **ya rechazado una vez en
  su versión galería**. Acá sólo se decide **dónde vive dentro de la jerarquía**, no su forma interna.
- **Autorar el contrato de motion del payload cliente** ni crear/modificar `GlobeGeneratingMark`: SSOT y
  primitive son de `TASK-1523`. Acá se aplican.
- **Borrar el payload legacy** (`producer-ui.ts` / `producer-controller.ts` / `producer-copy.ts`) ni ampliar la
  frontera del gate de diseño a `apps/studio-web`: es `TASK-1560` Slices 2 y 5. ⚠️ **Matiz del Slice 0:** esta
  task **sí** mueve a `studio-client` las reglas CSS que el composer usa y deja de consumir `producerStyles` en
  la rama del client app — pero **no borra el archivo**, que sigue sirviendo al payload legacy hasta el retiro.
- **Tokenizar** los 178 HEX / 3 ms literales de la hoja heredada: follow-up con dueño propio, medible recién
  cuando el gate de diseño alcance el archivo.
- **Crear la ruta `/producer/compose`** ni cualquier URL paralela del composer.
- **Prender los flags** `GLOBE_CLIENT_APP_ENABLED` / `GLOBE_CLIENT_PRODUCER_ENABLED` en un entorno vivo: el
  cutover es decisión de rollout con su propia verificación, no un efecto colateral de esta task.

## Detailed Spec

The selected direction is documented in `docs/ui/visual-directions/TASK-1552-globe-producer-composer-focused-creation.md` and the layout/state contract in `docs/ui/wireframes/TASK-1552-globe-producer-composer-focused-creation.md`.

The implementation must preserve the following product loop:

```text
prompt → direction → output shape → optional advanced settings → Generar · créditos → feed/viewer
```

The visible cost contract is owned by `TASK-1532`: the CTA shows `Generar · {credits} créditos` when current, otherwise transitions through the canonical estimating/preparing/running states. No separate estimate line or manual estimate action is introduced by this task.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- **Slice 0 MUST cerrar antes que Slice 1**, con diff visual a cero. Recomponer jerarquía sobre una hoja que
  vive en otro repo-path convierte cualquier regresión en indistinguible entre "el movimiento" y "el rediseño".
- **`TASK-1555` MUST estar cerrada antes de Slice 1** (misma superficie, mismo archivo, región ya aceptada por
  el operador).
- Slice 1 MUST establish the first-fold hierarchy before Slice 2 exposes advanced disclosures.
- Slice 2 MUST preserve modality/capability truth before Slice 3 captures evidence.
- Slice 3 MUST pass desktop/mobile visual review before the task is considered code complete.

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---:|---|---|
| Advanced settings disappear or become inaccessible | UI | medium | Preserve existing controls, keyboard tests and marker-based GVC | missing control in state inventory or failed focus capture |
| New composition contradicts approved Producer baseline | UI | medium | Source/direction review against TASK-1505 before implementation | scorecard fidelity or hierarchy below threshold |
| Cost is duplicated or hidden | UI | low | Reuse TASK-1532 CTA contract and explicit DOM assertion | extra cost line or missing credits in ready CTA |
| Gated capability appears executable | UI/runtime | medium | Server-backed capability states and fixture assertions | enabled control without positive capability evidence |

### Feature flags / cutover

**Sin flag nueva**, pero **no sin flag**: la superficie ya está gateada por `GLOBE_CLIENT_APP_ENABLED` +
`GLOBE_CLIENT_PRODUCER_ENABLED` (`infra/terraform/cloud_run_services.tf:136-137`). Ese par es el kill switch
real — apagarlo devuelve el payload legacy en `/producer` sin tocar código. Rollback preferente: revert del
cambio UI; rollback de emergencia: flip del flag **en Terraform** (`gcloud` sobre estos servicios es out-of-band
y muere en el próximo `tofu apply`, en silencio). No muta datos ni contratos.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---:|---|
| 0 | Revert del movimiento de CSS + restaurar `extraStyles: producerStyles` en `app.ts`; el legacy sigue intacto porque este slice no lo borra | <20 min | sí |
| 1 | Revert de render/CSS/copy del composer y restauración del bloque anterior | <30 min | sí |
| 2 | Desactivar disclosures mediante revert, manteniendo contratos y estados existentes | <30 min | sí |
| 3 | Revert markers/fixture/captures; no afecta runtime de generación | <15 min | sí |

### Production verification sequence

1. Ejecutar checks focales y validar task/wireframe/readiness.
2. Capturar fixture local en 1440×1000 y 390×844.
3. Revisar first fold, estados CTA, teclado, reduced motion y scroll width.
4. Verificar integración de `TASK-1532` sin estimate button duplicado.
5. Promover sólo después de scorecard premium y revisión humana del runtime internal-only.

### Out-of-band coordination required

N/A — repo-only task/documentation plus UI changes in the Globe runtime owned by the linked implementation task; no cloud, billing, provider or access mutation.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] Se mantiene `Execution profile: ui-ux`, `UI impact: flow`, `UI ready: no` hasta completar mapping, GVC plan y decision log; al pasar a `yes`, `pnpm task:lint --task TASK-1552` queda en cero findings.
- [ ] Existe `docs/ui/wireframes/TASK-1552-globe-producer-composer-focused-creation.md` y pasa `pnpm ui:wireframe-check --task TASK-1552`.
- [ ] **Slice 0 — CSS internalizado.** Ninguna clase del composer se resuelve sólo en `apps/studio-web`;
      `sr-only` está definida en `studio-client`; la rama del client app en `app.ts` ya no pasa
      `extraStyles: producerStyles`; y `producer-ui.ts` **sigue existiendo** para el payload legacy.
- [ ] **Slice 0 — diff visual a cero.** Antes/después a 1440/390/320 sin diferencia de píxeles. Un movimiento
      verbatim que cambia un píxel no fue verbatim y se revierte, no se justifica.
- [ ] `TASK-1555` está cerrada y sus 5 markers `producer-model-*` intactos antes del primer commit de Slice 1.
- [ ] **Ritmo vertical:** separación entre bloques **≥ 28 px** y título→contenido **≥ 12 px**, medidos en browser.
      17 px / 8,8 px son los valores que el operador reportó como «todo muy apretado» y quedan como piso prohibido.
- [ ] **El glow del prompt se conserva**: `:hover` y `:focus-within` encienden borde + halo
      `rgba(77,184,255,.55)` con transición de 220 ms sobre `border-color`, `box-shadow` y `background-color`,
      **más** el corte de `prefers-reduced-motion` que el original no declara.
- [ ] **Contención:** ningún descendiente del panel excede el rect de su contenedor (arriba, abajo, izquierda y
      derecha). Altura y `scrollWidth` en verde NO bastan — con ambos verdes hubo layouts rotos.
- [ ] **Cantidad derivada de la ruta**: `max === 1` no renderiza la fila; `max <= 4` un chip por valor;
      `max > 4` chips de atajo + campo exacto visualmente distinto. Ningún valor hardcodeado.
- [ ] **El riel es sólo dinero** (saldo + CTA). Ninguna decisión de forma vive ahí, aunque multiplique el costo.
- [ ] El composer tiene una sola jerarquía primaria: prompt → dirección/output shape → CTA Generate.
- [ ] No existe selector/título de modalidad duplicado dentro del composer.
- [ ] **No existe un contenedor `advanced-controls` ni equivalente cajón-de-sastre**; seed, Style DNA, negativo y
      retoque viven en el `tool dock` y abren en su propio espacio.
- [ ] **Referencias es visible en el núcleo** (bloque 2), con affordance de subir imagen o video, nunca dentro de
      un colapsable.
- [ ] **El dock se deriva del catálogo/capabilities**; una capability nueva server-side aparece como herramienta
      sin editar el layout. Una sin contrato aparece deshabilitada con su razón en `title`.
- [ ] **Iconografía preservada:** ninguna acción, herramienta o encabezado de bloque sin icono, y el recuento de
      iconos de la superficie no baja del baseline medido (**23**).
- [ ] Los presets se presentan como recetas visuales o puntos de partida; la UI no mantiene una taxonomía
      paralela de chips hardcoded.
- [ ] Imagen y video pueden revisar controles de cámara semánticos compatibles con su modalidad; audio no
      muestra controles de cámara.
- [ ] El selector de formato distingue generación nativa, conservar origen y adaptar; no ofrece ratios que la
      route no soporte ni promete que cambiar el ratio preserve automáticamente el encuadre.
- [ ] El formato muestra una preview proporcional y, cuando corresponde, safe zones o limitaciones de
      composición antes del estimate.
- [ ] Una receta modificada se identifica como personalizada y permite restaurar la receta base; los locks
      de cámara/look/sujeto se muestran con estado honesto y no se simulan si el contrato no está disponible.
- [ ] Imagen, Video y Audio muestran sólo los controles relevantes para su modalidad y no presentan capacidades gated como activas.
- [ ] El CTA reutiliza `TASK-1532`: no hay botón manual `Calcular costo`, no se duplica la línea de costo y el estimate vigente aparece dentro del CTA.
- [ ] El prompt, disclosures, CTA y estados son operables por teclado, tienen focus visible, targets táctiles de 44 px y equivalencia reduced-motion.
- [ ] GVC premium captura 1440×1000 y 390×844, con first fold, estados clave y evidencia revisada en dossier.
- [ ] `scrollWidth === clientWidth` en desktop y mobile, incluyendo disclosures abiertos.
- [ ] La evidencia visual alcanza el scorecard definido: promedio ≥4.5, ninguna dimensión <4, jerarquía/economía/impacto/resistencia a template ≥4.5.

### Criterios del GASTO — migrados de TASK-1564 (retirada), no negociables

Estos son los que hacen que el composer no gaste crédito sobre información falsa. El flow contract los desarrolla
con sus cuatro compuertas (`docs/ui/flows/TASK-1552-...-flow.md`).

- [ ] **G1 — estimado vigente.** `execute` **no está disponible** sin estimado que corresponda a la recipe en
      pantalla. No es una advertencia: es el botón deshabilitado. Sin esto, un operador ve "12 cr", cambia la
      cantidad a 4 y ejecuta creyendo que gasta 12.
- [ ] **G2 — grant.** Sin `lab.experiment.execute` el botón está deshabilitado **con su razón**, y el resto del
      composer **sigue usable** (se puede escribir y estimar). Ni bloquear toda la superficie ni dejar apretar
      para fallar después de escribir todo.
- [ ] **G3 — clave compartida.** La clave de idempotencia **nace en `prepare` y se reusa en `execute`**. Una
      clave nueva por intento convierte un reintento en gasto nuevo.
- [ ] **G4 — no re-apretable.** Mientras `prepare`/`execute` están en vuelo el botón está en pendiente.
      Verificado contando llamadas: **doble click produce UNA** llamada a `execute`.
- [ ] La vigencia se evalúa por los **dos ejes observables** (forma vía `recipeKey`, tiempo vía
      `estimateExpiresAt`); el tercero —cambio de tarifa— lo cubre el servidor invalidando el `approvalToken`.
      **Ya implementado** en `apps/studio-client/src/data/composer-recipe.ts` (17 tests, commit `feffd47`) — ver
      el Delta de `TASK-1532`, que es su dueña.
- [ ] El costo va **en el botón** además del riel (patrón medido de Higgsfield): son dos preguntas distintas.
- [ ] Un estimado stale **se conserva atenuado**, nunca en blanco — un riel vacío se lee como "no cuesta nada".
- [ ] `routeId` **no aparece en el DOM servido** en ninguno de los tres anchos, con el selector abierto.
- [ ] Un modelo no listo se muestra **deshabilitado con su motivo**, nunca oculto.
- [ ] Las cuatro razones de negación se distinguen, y "Reintentar" aparece **sólo donde puede funcionar**.
- [ ] Las afordancias sin contrato (inpaint, batch) van **deshabilitadas con su razón visible**.
- [ ] El prompt escrito **no se pierde ante ningún error**, incluida sesión expirada.
- [ ] Cambiar prompt, receta, cámara, referencia u output shape invalida el estimate vigente mediante la
      misma `recipeKey`/fingerprint canónica; la UI no calcula créditos ni recompone el costo localmente.
- [ ] Canary a 1440/390/**320**, sin overflow de página ni de panel, más pasada con `prefers-reduced-motion`.
- [ ] Scorecard visual: promedio ≥ 4.5, piso ≥ 4, fidelidad y resistencia a template ≥ 4.5.

## Verification

**En `greenhouse-eo`** (control plane documental):

- `pnpm task:lint --task TASK-1552`
- `pnpm ui:quality --task TASK-1552`

> ⚠️ **Corregido 2026-07-27:** `task:lint`, `ui:wireframe-check` y `ui:readiness-check` son **el mismo binario**
> (`scripts/ci/task-lint.mjs`, ver `package.json`). Listarlos como tres verificaciones daba una sensación de
> cobertura triple sobre **una** pasada. Sólo `ui:quality` corre un gate distinto
> (`scripts/ci/ui-quality-gate.mjs`). La cobertura visual real de esta superficie **no está en Greenhouse**:
> está en el canary de `studio-client`, abajo.

**En `../efeonce-globe`** (runtime — toolchain independiente; **NO** correr acá los comandos de Greenhouse):

- `pnpm check && pnpm build` (typecheck NodeNext strict + `node --test`)
- `node apps/studio-client/scripts/producer-composer-canary.mjs` en los dos modos de
  `prefers-reduced-motion`, y a 1440 / 390 / 320
- Gates de `studio-client`: `src/gates/design-contract.test.ts` (color/motion/tipografía/copy literal) +
  `src/gates/reduced-motion.test.ts`
- ⚠️ **Todo `*.test.ts` nuevo se agrega a mano al script `test` de `apps/studio-client/package.json`** — no hay
  glob ni descubrimiento: un test no registrado nunca corre y la suite queda verde por no haberlo mirado.
- Revisión manual desktop/mobile, teclado, reduced motion y no overflow (de página **y de panel**)

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real.
- [ ] El archivo vive en la carpeta correcta.
- [ ] `docs/tasks/README.md` quedó sincronizado con el cierre.
- [ ] `Handoff.md` quedó actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes.
- [ ] `changelog.md` quedó actualizado si cambió comportamiento, estructura o protocolo visible.
- [ ] Se ejecutó chequeo de impacto cruzado sobre TASK-1505, TASK-1531 y TASK-1532.
- [ ] Se archivó el dossier visual y scorecard premium.

## Follow-ups

- Si la evolución hacia `Creative Suite` requiere IA común entre Producer y Workbench, coordinar con `TASK-1523`.
- Si los advanced settings necesitan un patrón reusable de Globe, evaluar su ownership con `TASK-1485`.

## Open Questions

- Confirmar durante Discovery si el disclosure de ajustes avanzados puede permanecer inline en 390 px o debe usar el sheet existente de Globe; no bloquea la dirección, pero sí la implementación final.
