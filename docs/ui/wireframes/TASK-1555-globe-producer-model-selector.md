# Wireframe — Globe Producer Model Selector (TASK-1555)

> **Contrato de diseño** del selector de modelo del Producer. Robusto y aterrizado, NO stub. El implementador
> construye la superficie DESDE acá sin re-decidir arquitectura.
>
> **Dirección visual ELEGIDA (design-studio Step 1-2):** [`docs/ui/visual-directions/TASK-1555-globe-producer-model-selector-direction.md`](../visual-directions/TASK-1555-globe-producer-model-selector-direction.md) — Dirección A "Galería de láminas" (poster-first).
> **Base aprobada del Producer:** [`docs/ui/visual-directions/TASK-1505-globe-creative-producer-approved-direction.md`](../visual-directions/TASK-1505-globe-creative-producer-approved-direction.md)
> **Superficie hermana (jerarquía del composer):** [`docs/ui/wireframes/TASK-1552-globe-producer-composer-focused-creation.md`](TASK-1552-globe-producer-composer-focused-creation.md)
> **Dato (SoT):** reader `globe.producer.fleet.list` (TASK-1554) — rutas con `availability` + `recommendedDefaults`.
> **Copy (SoT):** `efeonce-globe/apps/studio-web/src/producer-copy.ts` (`composer.route`, `routePending`, `routeDisclosure`).

## Contrato de dirección visual

- Visual direction mode: source-led
- Product Design asset: docs/ui/visual-directions/TASK-1555-globe-producer-model-selector-direction.md

`source-led` y no `repo-native-benchmark` porque la forma vigente **no se derivó de un benchmark ni de una
maqueta**: se derivó de una fuente del propio producto —la dirección aprobada del Producer (TASK-1505)— y de
una **medición**: la galería costaba 515 px de fold y el desplegable 121 px. El operador rechazó la primera al
verla, y esa evidencia es la fuente.

## Desktop Target — 1440×1000

- La región **cerrada** ocupa una línea (**121 px** con su título y su helper), no una grilla. Es el
  presupuesto de fold de este bloque: recuperarlo fue la razón del cambio de forma.
- El trigger es de ancho completo dentro de la columna del composer, con el isotipo a la izquierda, el nombre
  en fuerte, la versión y el estado en secundario, y el chevron a la derecha.
- **Abierta**, la lista se despliega inmediatamente debajo del trigger y **no** flota sobre el feed: es parte
  del flujo del panel, así que empuja el contenido siguiente en vez de taparlo.
- **Un solo momento visual dominante en la pantalla, y no es éste.** El prompt manda; el selector es un
  control denso y reconocible. Premium por restricción, no por despliegue.
- Sin card-on-card: la región cede su chrome para que el control sea la única superficie.

## Mobile Target — 390×844 (y 320)

- Columna única; el trigger y cada opción ocupan el ancho disponible.
- **Targets: 48 px el trigger, 44 px cada opción**, incluidas las no ejecutables.
- La versión y el estado envuelven bajo el nombre en vez de truncarse: el estado es el dato que decide, y
  truncarlo deja al operador sin la información por la que abrió la lista.
- **Con el menú abierto**, `scrollWidth === clientWidth` a 390 **y a 320**. A 320 es donde primero desborda,
  por eso el ancho está en la matriz de verificación y no como una comprobación extra.

## Action Hierarchy

1. **Primaria — elegir un modelo `available`.** Es la única acción ejecutable de la región. Click o Enter.
2. **Secundaria — abrir y cerrar la lista.** Enter sobre el trigger; `Space` alterna. El estado colapsado es
   el default porque la decisión ya está tomada la mayor parte del tiempo.
3. **Informativa — leer por qué un modelo NO se puede usar.** No es una acción, y aun así ocupa lugar en la
   jerarquía a propósito: es alcanzable por teclado y su razón está en texto. Un modelo escondido es un
   modelo que el operador nunca sabrá que existe.
4. **Ninguna acción destructiva ni irreversible** vive en esta región. Elegir un modelo invalida el estimado
   vigente —lo maneja `TASK-1532`— pero no gasta crédito ni dispara nada.

⛔ **La región no compite con el CTA.** El único botón primario del composer es `Generar`; este control nunca
adopta tratamiento de acción primaria aunque esté seleccionado.

## 0. Delta 2026-07-25 — el control es un desplegable, no una galería

> **Esta sección manda sobre el layout descrito abajo.** El resto del contrato (estados, data
> mapping, a11y, no-slug) sigue vigente sin cambios.

- **Control:** desplegable compacto (`details`/`summary` + `role="listbox"`), no una grilla de
  láminas. Razón y evidencia en la [dirección visual §Decisión revisada](../visual-directions/TASK-1555-globe-producer-model-selector-direction.md).
- **Fila de modelo:** `[isotipo real] Nombre · versión — estado` (+ `✦ Recomendado`, `✓` si elegido).
  El isotipo viene de un set curado y licenciado; **NUNCA** transcrito a mano.
- **Título de la región:** `Modelo`. "Ruta" es vocabulario de ruteo del backend y no aparece en la
  cara del producto (también salieron "Ruta seleccionada" de la barra de ejecución y "Curada ·
  modelo real").
- **Alcance de la lista:** toda la flota de la **modalidad activa**, no sólo lo que el modo activo
  puede correr. Un modelo que necesita otro modo se muestra con lo que necesita
  ("Necesita cuadros" / "Necesita referencias") y, si ese modo tiene chip, **elegirlo cambia el
  modo**. Esconderlo detrás de un chip que hay que adivinar hace que el operador nunca sepa que
  existe — que es justo lo que la task venía a resolver.
- **Nunca un affordance falso:** un modelo con `minReferences ≥ 1` (Gemini Omni) o que exige
  keyframes (Veo) **no** se ofrece como ejecutable en un modo sólo-prompt; reventaría en
  `assertInputModeSatisfied` después de reservar crédito.
- **Barra de ejecución:** `data-compact-route` refleja el modelo elegido (antes era un placeholder
  estático que prometía una selección que nunca mostraba).
- **Markers `data-capture` vigentes:** `producer-model-picker`, `producer-model-trigger`,
  `producer-model-list`, `producer-model-option`, `producer-model-recommended`
  (reemplazan `producer-model-grid` / `producer-model-card`).

## 1. Qué reemplaza

Hoy la región "Ruta, modelo y formato" del composer es un **placeholder estático**
(`efeonce-globe/apps/studio-web/src/producer-ui.ts`, `data-producer-static-route` — botón `aria-disabled` con
"El catálogo publicará aquí sus límites válidos"). Este selector la reemplaza por una **galería de modelos
data-driven, availability-aware**, que escala a toda la flota sin hand-edits por modelo.

## 2. Regiones (dentro del composer, región `producer-route`)

> ⚠️ **Actualizado 2026-07-27 contra el runtime.** El diagrama anterior dibujaba la grilla de láminas que el
> operador rechazó. Éste es el control que existe, medido en
> `ProducerComposer.tsx:1128-1194`.

```
Modelo
┌──────────────────────────────────────────────────────────────┐
│ [◧] Seedream                                              ⌄  │  ← trigger (summary), 48px
│     5 Pro · Recomendado                                      │
└──────────────────────────────────────────────────────────────┘
   ▼ abre por click o por Enter
┌──────────────────────────────────────────────────────────────┐  role="listbox"
│ [◧] Seedream        5 Pro · Disponible    ✦ Recomendado   ✓ │  44px
│ [◆] Nano Banana     2 · Disponible                          │  44px
│ [◉] GPT Image       2 · Próximamente                        │  44px  aria-disabled
│ [KL] Kandinsky Lab  3 · No disponible por una dependencia…  │  44px  aria-disabled + monograma
└──────────────────────────────────────────────────────────────┘
   helper: routeDisclosure (modelo real visible; datos de proveedor nunca)
```

El trigger colapsado ocupa **una línea**, no una grilla: la región pasó de 515 px a 121 px y con eso el prompt
recuperó el fold. Ésa es la razón de existir del cambio de forma, no una preferencia estética.

- El selector vive en la región `producer-route` del composer; NO es una superficie flotante nueva (extiende el
  patrón existente de Globe Producer, no crea uno paralelo).
- Sólo se muestran los modelos de la **capacidad de la modalidad activa** (Imagen → `image-generate`, etc.),
  filtrando el reader por `capability`/`modality`.
- Orden: el `recommendedDefault` primero (marcado ✦), luego `available`, luego `gated`, luego `blocked`.

## 3. Anatomía de una opción de la lista

| Elemento | Fuente | Nota |
|---|---|---|
| Marca de la casa | nombre público → mapa de isotipos | **tres niveles: isotipo real 16×16 → glyph → monograma.** Un modelo sin isotipo bundleado recibe **sus iniciales**, *«rather than an invented logo»* — NUNCA un logo dibujado de memoria |
| Nombre + versión | `route.model` (`{name, version}`) | público (ADR-003); NUNCA slug |
| Estado | `route.availability` | `available` \| `gated` \| `blocked` |
| Razón (si no disponible) | `route.gateReason` → copy | `not_promoted` → "Próximamente"; `provider_verifier_pending` → "Requiere habilitación del proveedor". **Va en TEXTO, no sólo en un atributo**: con motion apagado el texto es el único canal que queda |
| Marca recomendado | `recommendedDefaults[capability] === routeId` | ✦ "Recomendado", una sola vez |
| Selección | click / Enter | sólo si `available` |
| Alto mínimo | — | **44 px**, incluidas las no ejecutables: siguen enfocándose para que su razón se anuncie |

- **NUNCA** se muestra el slug del proveedor, costo vendor ni margen (el reader ya no los expone; la UI tampoco los infiere).

## State Copy

Copy visible y comportamiento de recuperación por estado. **Todos obligatorios.**

| Estado | Copy visible | Comportamiento / recuperación |
|---|---|---|
| ready | `Seedream · 5 Pro · Disponible` + `✦ Recomendado` en el recomendado | La opción es elegible; al elegirla el trigger la nombra y alimenta `referenceRoute`. Una sola selección a la vez |
| loading | Trigger con el modelo vigente; la lista no se abre vacía | Mientras resuelve `fleet.list` no se muestra "0 modelos" en falso; el estado previo se conserva |
| empty | `modelsEmpty` — mensaje breve dentro de la lista | La capacidad no tiene rutas. No se dibuja una pared vacía dominante ni un control ejecutable falso |
| partial | La lista muestra lo que hay, con `gated`/`blocked` visibles y su razón | Una flota parcialmente disponible **se muestra completa**: esconder lo no ejecutable hace que el operador nunca sepa que existe, que es lo que esta task venía a resolver |
| error | Mensaje canónico + reintento contextual | No depender sólo de toast. El modelo elegido no se pierde |
| denied | Estado honesto sin error crudo | Si falta la capability del reader, la región lo declara y **no** ofrece un control ejecutable. Recuperación: pedir el grant, no reintentar |

### Estados adicionales de esta superficie

- **available:** opción elegible; una sola seleccionada a la vez.
- **selected:** la ruta elegida se refleja en el resumen compacto del composer (`data-compact-route`) + alimenta el run (`referenceRoute`).
- **gated (`not_promoted`):** opción legible pero **no ejecutable**, con "Próximamente" — honesta, no un control falso.
- **blocked (external gate):** opción no ejecutable con la razón (ej. "Requiere habilitación del proveedor").
- **`aria-disabled`, NUNCA `disabled`:** una opción no ejecutable tiene que seguir siendo alcanzable para que se anuncie **su razón**. `disabled` esconde justamente lo único que explica por qué está en la lista.
- **recommended preselect:** si no hay selección previa y el `recommendedDefault` está `available`, queda preseleccionado; si NO está `available`, no se preselecciona una ruta ejecutable (se respeta el estado real).
- **mobile / 390px y 320px:** la lista es de ancho completo; targets 44px; sin overflow horizontal **con el menú abierto**, que es cuando desborda.
- **keyboard/focus:** el trigger abre con **Enter** (activación nativa del `summary`) y `Space` alterna; `Tab` entra a la lista; foco visible con anillo propio en cada opción.
- **reduced motion:** cambios de estado sin transición espacial; significado por texto/estado.

## 5. Copy (es-CL) — extender `producer-copy.ts`

Reusar: `composer.route` ("Ruta y modelo"), `composer.routeDisclosure`. **Nuevos ids** (agregar a `producer-copy.ts`, no hardcodear en JSX):
- `composer.modelAvailable`: "Disponible"
- `composer.modelRecommended`: "Recomendado"
- `composer.modelGated`: "Próximamente"
- `composer.modelBlockedProviderVerifier`: "Requiere habilitación del proveedor"
- `composer.modelSelectAria`: "Elegir el modelo {model}" (aria-label por tarjeta)

## 6. Data mapping (Full API Parity — cero lógica de negocio en el browser)

- Reader: `globe.producer.fleet.list` (TASK-1554), vía el mismo BFF same-origin del Producer; el browser sólo consume el proyectado.
- `routes[]` → tarjetas (filtradas por la modalidad activa). `availability` decide el estado; `gateReason` decide la razón; `recommendedDefaults` decide el ✦.
- Selección → `referenceRoute` del run (contrato existente de estimate/prepare/generate; sin endpoint/command nuevo).
- La disponibilidad es **server-authoritative**: la UI nunca computa promoción/ceiling; sólo renderiza `availability`.

## 7. Primitive decision

- `extend` — la región `producer-route` del composer + el patrón de disclosure de Globe Producer. **NO** crear un design system nuevo ni una primitive Greenhouse (Globe tiene su propio registry/CSS). Sin card-on-card: el desplegable **cede** el chrome de la región para ser la única superficie.

## 8. Accesibilidad

- `details`/`summary` como disclosure + `role="listbox"` con `role="option"` por fila; `aria-selected` en la elegida.
- `gated`/`blocked` = **`aria-disabled`**, nunca `disabled`, con la razón **en texto visible** además del `aria-label`; nunca un botón habilitado sin evidencia de disponibilidad.
- Contraste AA; **anillo de foco visible** en cada opción; targets **44 px** en todas, incluidas las no ejecutables.
- El trigger abre por **Enter**; `Space` alterna.

## GVC Scenario Plan

> ⚠️ **Reescrito 2026-07-27.** La versión anterior apuntaba al fixture del **payload legacy** y declaraba
> markers de la galería rechazada (`producer-model-grid`, `producer-model-card`) que **no existen**.

- **Escenario:** `../efeonce-globe/apps/studio-client/scripts/producer-composer-canary.mjs` (servidor con
  fixture) + `producer-composer-browser-canary.mjs` (asertos), sobre `/producer` con bundle, shell, CSP y
  `producerStyles` reales. **Quality profile: premium.**
- **Viewports:** `1440×1000` **desktop**, `390×844` mobile y `320×844`, más una pasada con
  `prefers-reduced-motion: reduce`.
- **Desktop evidence:** `.captures/task-1552-composer/model-selector-1440.png`.
- **390px mobile evidence:** `.captures/task-1552-composer/model-selector-390.png` (+ `-reduce`).
- **Fixture:** flota de **4 rutas**, una por estado — `available` + recomendado, `available` de otra casa,
  `gated` y `blocked` **sin isotipo** (monograma). Con una sola ruta no había ningún estado que probar.
- **Markers `data-capture` medidos contra el runtime:** `producer-model-picker`, `producer-model-trigger`,
  `producer-model-list`, `producer-model-option`, `producer-model-recommended`.
- **Aserciones:** apertura por teclado; `Tab` entra a la lista; anillo de foco visible; 4 opciones con
  `gated`=1 y `blocked`=1; `aria-disabled` sin `disabled`; razón en texto; recomendado una sola vez; 44 px;
  sin modelos de otra modalidad; cero slug/costo/margen ni `routeId` en el DOM.
- **Scroll-width evidence:** `scrollWidth === clientWidth` **con el menú abierto** a 1440 / 390 / 320, más
  contención del rect de la lista dentro del viewport.
- **Review dossier:** `docs/ui/reviews/TASK-1555-globe-producer-model-selector.scorecard.json` — `PASS`,
  `average=4.54`, `floor=4.2`.
- **Baseline decision / surface ID:** `globe.creative-producer-surface`. El baseline son las capturas de
  arriba, tomadas **con la hoja del legacy inyectada**; las anteriores al 2026-07-27 16:30 no lo son —
  el canary servía la superficie sin estilos y sus asertos daban verde igual.

## 10. Nota de dirección visual

> ⚠️ **Corregido 2026-07-27.** Este párrafo decía que el momento visual dominante era «la galería de modelos
> como decisión creativa, no un dropdown técnico». **Es exactamente lo que el operador rechazó al verlo.**

El desplegable hereda la dirección aprobada del Producer (TASK-1505), y su premium es **por restricción**:
elegir modelo **no** es el momento dominante del composer — lo es el prompt. El impacto lo aporta el roster
reconocible por **isotipo real** sobre el lenguaje oscuro del Producer, no un despliegue decorativo. La
galería costaba 515 px de fold para una decisión que la mayoría de las veces se toma una vez.

---

> Las cinco secciones siguientes se autoraron el **2026-07-27**, al cerrar la task. No existían porque el
> wireframe se escribió para la **galería** y esa forma murió antes de completarse. Se escriben ahora contra el
> runtime medido, no contra la intención original — el próximo que toque esta región es el Slice 1 de
> `TASK-1552`, que decide **dónde vive** el bloque, y necesita saber qué es invariante y qué no.

## Visual Fidelity Mapping

Valores medidos en browser sobre el runtime (`ProducerComposer.tsx:1128-1194` + `producerStyles`), no estimados.

| Elemento | Valor medido | Token / origen | Invariante |
|---|---|---|---|
| Trigger colapsado | alto **48 px** | patrón de disclosure del composer | ≥44 px. Es el único control visible cuando la lista está cerrada |
| Fila de opción | alto **44 px** | — | **Piso duro.** Aplica también a `gated`/`blocked`: se enfocan para anunciar su razón |
| Marco del isotipo | **1,85 rem**, radio `.5rem`, borde `var(--line)`, fondo `rgba(255,255,255,.06)` | `--line` del SSOT | El marco es constante; lo que cambia adentro es el isotipo |
| Isotipo | `<img width=16 height=16>`, `filter: brightness(0) invert(1)`, opacidad `.94` | `/assets/models/*.svg` | Monocromo por filtro, **nunca** un SVG recoloreado a mano |
| Monograma (fallback) | iniciales de las 2 primeras palabras, o `AI` | — | Sustituye al isotipo ausente; **nunca** un logo dibujado |
| Alto de la región cerrada | **121 px** (era 515 px con la galería) | — | El presupuesto de fold de esta región. Crecer de nuevo revierte la razón del cambio |
| Anillo de foco | `outline: solid 2px` | `--focus` del SSOT | Un solo valor de foco para todo el producto |

⛔ **Cero HEX, ms o px literales al reimplementar**: todo sale del SSOT de tokens
(`apps/studio-client/src/tokens/tokens.ts`), y desde ADR-016 el gate de diseño lo rechaza también escrito como
utilidad (`text-[#hex]`, `p-[13px]`).

## Copy Ledger

Todo string visible sale de la capa de copy (`apps/studio-client/src/copy/index.ts`, namespace
`producerComposer`). **Ninguno se escribe en el JSX.**

| Id | Texto es-CL | Dónde aparece |
|---|---|---|
| `modelsLabel` | "Modelos" | `aria-label` del `listbox` |
| `modelRecommended` | "Recomendado" | flag ✦ y sufijo del trigger |
| `modelAvailable` | "Disponible" | estado de una opción elegible |
| `modelGated` | "Próximamente" | estado `gated` — honesto, no un "pronto" vago |
| `modelBlocked` | razón del gate externo | estado `blocked`; el texto viene del `gateReason`, no se inventa |
| `modelsEmpty` | mensaje breve | la capacidad no tiene rutas |
| `modelChangeAria` | "Cambiar modelo. Actual: {model}" | `aria-label` del trigger |
| `modelSelectAria` | "Elegir el modelo {model}" | `aria-label` de una opción elegible |
| `modelUnavailableAria` | "{model}. {reason}" | `aria-label` de una opción no ejecutable — **la razón viaja en el aria además del texto** |
| `routeDisclosure` | helper de la región | modelo real visible; datos de proveedor nunca |

⛔ **El slug del proveedor NO es copy y no aparece en el DOM.** El isotipo identifica la casa; el nombre
público es el del modelo (`Seedream 5 Pro`).

## Accessibility Contract

| Requisito | Cómo se cumple | Verificado |
|---|---|---|
| Apertura por teclado | `summary` nativo: **Enter** abre, `Space` alterna | ✅ canary, Playwright |
| Alcance del menú | `Tab` desde el trigger entra a la primera opción | ✅ canary |
| Foco visible | anillo propio (`outline` 2 px) en la opción enfocada | ✅ canary |
| Semántica de lista | `role="listbox"` + `role="option"` + `aria-selected` en la elegida | ✅ runtime |
| No ejecutable | **`aria-disabled`, NUNCA `disabled`** | ✅ canary: 2 con aria, 0 con disabled |
| Razón perceptible | en **texto visible** además del `aria-label` | ✅ canary |
| Target táctil | ≥44 px en **toda** opción | ✅ canary |
| Sin overflow | `scrollWidth === clientWidth` con el menú **abierto** a 1440/390/320 | ✅ canary |
| Reduced motion | el estado se comunica por texto; ninguna transición porta significado | ✅ pasada dedicada |

**La regla que más se rompe y por qué no se rompe acá:** deshabilitar con `disabled` un modelo no disponible
lo saca del orden de foco, y con eso desaparece **su razón** — que es lo único que explica por qué está en la
lista. Por eso el contrato exige `aria-disabled` y el canary lo afirma contando ambos atributos.

## Implementation Mapping

| Qué | Dónde | Nota |
|---|---|---|
| Superficie | `apps/studio-client/src/surfaces/producer/composer/ProducerComposer.tsx:1128-1194` | dentro de la región `producer-route`; **no** es una ruta ni una superficie flotante nueva |
| Marca del modelo | `ModelMark` en el mismo archivo (`:88-95`) | tres niveles: isotipo → glyph → monograma |
| Assets | `apps/studio-web/public/models/*.svg` | simple-icons v16.27.0, CC0-1.0, **copiados sin modificar** |
| Dato | reader `globe.producer.fleet.list` (TASK-1554) vía el BFF same-origin | el browser sólo consume el proyectado |
| Selección | `changeRoute(routeId)` → `referenceRoute` del run | contrato existente; **sin endpoint ni command nuevo** |
| Copy | `apps/studio-client/src/copy/index.ts`, namespace `producerComposer` | |
| Evidencia | `apps/studio-client/scripts/producer-composer-{canary,browser-canary}.mjs` | registrados en el script `test` del paquete |

⚠️ **Ownership compartido:** este archivo lo edita también `TASK-1552`. La región `producer-model-*` es
**baseline congelado** para ella: decide **dónde vive** el bloque, nunca su forma interna.

## Design Decision Log

**Decisión: desplegable compacto, no galería de láminas.**

- **Alternativas consideradas:** (1) galería de láminas poster-first — *implementada y rechazada por el
  operador al verla*; (2) `<select>` nativo; (3) el desplegable con isotipo que quedó.
- **Por qué se descartó la galería:** costaba **515 px** de fold para una decisión que se toma una vez y
  empujaba el prompt —la entrada dominante del Producer— fuera de la primera pantalla. El desplegable la dejó
  en **121 px**. No fue preferencia estética: fue presupuesto de fold.
- **Por qué no un `<select>` nativo:** pierde las tres cosas que hacen reconocible al roster — la marca del
  proveedor, la versión y el flag de recomendado — y no puede mostrar una razón por opción.
- **Por qué el monograma y no un logo dibujado:** un logo de tercero transcrito a mano es inexacto y es un
  problema de marca ajena. El código lo dice explícito: *«rather than an invented logo»*.
- **Por qué la lista muestra la flota completa** y no sólo lo ejecutable: esconder lo no disponible hace que
  el operador nunca sepa que existe, que es justo lo que esta task venía a resolver.
- **Riesgo abierto:** ejecutar un 2.º modelo del mismo proveedor da `route_binding_missing` hasta que cierre
  **`TASK-1553`** — el compiler ancla a `estimate.model`. Hasta entonces esas opciones se muestran **no
  ejecutables con su razón**, nunca ocultas ni falsamente habilitadas.
