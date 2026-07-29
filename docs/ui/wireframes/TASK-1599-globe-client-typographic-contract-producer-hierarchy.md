# TASK-1599 — Contrato tipográfico del payload cliente + jerarquía del Producer

> **Tipo de documento:** registro de wireframe de una superficie YA ENTREGADA y verificada en vivo.
> **Creado:** 2026-07-29 por Claude (operador del control plane).
> **Superficie:** `https://globe.efeoncepro.com/producer` — payload cliente `apps/studio-client` del repo
> hermano `efeonce-globe`.
> **Frontera de propiedad:** este documento registra **las correcciones que TASK-1599 entregó** sobre el
> Producer. **No es el contrato del composer** — ése sigue siendo de `TASK-1552`
> (`docs/ui/wireframes/TASK-1552-globe-producer-composer-focused-creation.md`), ni el del feed, de
> `TASK-1559`. Cuando este registro y esos contratos hablen de la misma región, mandan ellos para la
> forma futura; este documento manda para el estado medido al 2026-07-29.

---

## Visual direction mode

`source-led` — la dirección visual no se re-decidió en esta sesión. La fuente es
`docs/ui/GLOBE_PRODUCER_COMPOSER_STYLE_REFERENCE_V1.md`, escrita para traducir sin reinterpretar, más el
SSOT de tokens (`apps/studio-client/src/tokens/tokens.ts`) que ADR-016 declara única fuente de valores.
Lo que esta task hizo fue **cerrar la distancia entre lo que el contrato pedía y lo que el navegador
renderizaba** — no proponer una dirección nueva.

## Product Design asset

No hay asset nuevo. El material durable de referencia es
`docs/ui/GLOBE_PRODUCER_COMPOSER_STYLE_REFERENCE_V1.md` (valores exactos medidos del composer) y el
SSOT de tokens del payload. La evidencia visual de esta task es la **revisión en vivo del deploy real**
a 1440px con sesión de operador, no un mockup.

## Desktop Target

Ancho de revisión: **1440px**, que es donde se ejercitó cada corrección contra el deploy real.

Regiones, de arriba hacia abajo:

| Región | Qué contiene | Qué cambió en esta task |
|---|---|---|
| `ProducerHeader` | Marca, identidad, **tres KPI de crédito** (disponible · gastado · restante) y el donut de consumo | Los tres KPI pedían Geist@700, un corte que no se carga → el navegador lo sintetizaba. Pasan al par familia×peso realmente disponible. Los números ganan `tabular-nums`. El donut redondea con `Math.floor` |
| Panel de créditos | Superficie desplegable anclada al disparador del header (`<details>`) | **La causa raíz de los tres síntomas visibles**: el panel llevaba `max-w-full`; sobre un elemento `absolute` esa medida resuelve contra el bloque contenedor —el propio `<details>`, o sea el ancho del disparador—, no contra el viewport. El número largo no era el problema |
| `ProducerComposer` | Campo de prompt, acciones, controles avanzados, riel del flujo | Cerrada la regresión propia: bajar las acciones del prompt al flujo desbordó el cuerpo y un renglón quedaba cortado a media letra contra el riel translúcido. Token nuevo `--rail-scrim` |
| `ComposerToolDock` | Herramientas del composer | Rótulos que se usaban como prosa vuelven al token de rótulo correcto |
| `ProducerFeed` | Tarjetas de generación, incluida la destacada | `Listo` y `Completada` dejan de tratarse como sinónimos: son **dos ejes distintos** del contrato |

## Mobile Target

**Fuera del alcance de esta task, declarado.** Las correcciones se ejercitaron a 1440px sobre el deploy
real. Los canarios del composer (163 asertos) y del motor (8) sí corren en los anchos que ya cubrían
—1440/390/320— y quedaron verdes, así que ninguna corrección **rompió** el comportamiento compacto; pero
esta task **no reclama** haber revisado visualmente 390px. Quien tome la revisión compacta del Producer
la hace bajo `TASK-1552` (composer) y `TASK-1559` (feed), que son sus dueñas.

## Action Hierarchy

La jerarquía del Producer, tal como quedó, ordenada por peso visual descendente:

1. **El campo de prompt** — el objeto de la pantalla. Conserva su glow tokenizado y es el único elemento
   con tratamiento de foco propio.
2. **La acción de generar** — única acción primaria; es la que gasta.
3. **Las acciones del prompt**, bajadas al flujo en esta sesión. Ese descenso es lo que produjo la
   regresión que el tercer commit cerró: al integrarse al flujo, el cuerpo desbordó y el último renglón
   quedó cortado contra el riel translúcido. Se resolvió con el token `--rail-scrim`, no moviéndolas de
   vuelta.
4. **Los tres KPI de crédito del header** — informativos, no accionables. Su peso venía inflado por un
   700 sintetizado; al pedir el corte real bajan al escalón que les corresponde.
5. **El estado de cada tarjeta del feed** — metadata, nunca acción.

## Visual Fidelity Mapping

| Intención del contrato | Lo que el navegador hacía antes | Lo que hace ahora |
|---|---|---|
| Geist en su corte fuerte para el número de crédito | Cortes cargados: Poppins 700 · Geist 400 · Geist 600. Se pedía Geist@700 → **síntesis**: el navegador engrosa artificialmente el trazo. Ningún gate fallaba | El sitio de uso pide un par familia×peso que existe. Un gate nuevo apareja familia y peso **en el sitio de uso**, no en la declaración |
| `font-normal` / `font-medium` como utilidades | Escritas, pero el theme no las podía generar: **no emitían CSS**. Silencio total | Un segundo gate rechaza toda utilidad de fuente que el theme no pueda generar |
| Cifras que se comparan entre sí | Ancho de dígito variable: las cifras bailaban al actualizarse | `tabular-nums` en siete números vivos |
| Porcentaje del donut coherente con el gasto | `round` decía `100 %` junto a `Gastado 166` | `Math.floor` — el 100 % sólo aparece cuando de verdad no queda nada |
| Rótulo ≠ prosa | Tokens de rótulo usados como texto corrido | Cada uno vuelve a su token |

## Copy Ledger

Todo el copy visible del payload cliente vive en `apps/studio-client/src/copy/index.ts`. Cambios de esta
task:

| Antes | Después | Razón |
|---|---|---|
| `stateCompleted` (huérfana) | **eliminada** | `Listo` y `Completada` no eran dos palabras para lo mismo: son dos ejes del contrato — `coarseProgress` (¿terminó de trabajar?) y `state` (¿en qué estado quedó?). Al separarlos, la clave quedó sin ningún consumidor y borrarla es la corrección, no una pérdida |
| Rótulos usados como prosa | Reasignados a su token de rótulo | Un rótulo y un párrafo no comparten escalón tipográfico |

## State Copy

Estados de la superficie tal como quedaron. Ninguno se inventó en esta task: se registran porque la
corrección de `Listo` vs `Completada` los toca.

| Estado | Copy visible | Comportamiento de recuperación |
|---|---|---|
| ready | Estado derivado de `state`; el eje de avance lo dice `coarseProgress` | Ninguna acción requerida |
| loading | Marca de generación del payload cliente, con su contraparte para movimiento reducido | Se resuelve solo al llegar el resultado |
| empty | Feed sin generaciones: la tarjeta destacada no se pinta | El composer queda como única llamada a la acción |
| partial | El feed muestra lo recuperado; lo que falta no se falsea | Recarga del feed |
| error | La tarjeta declara el fallo con su razón; nunca un cero silencioso | Reintento desde la tarjeta |
| denied | La capability bloqueada se muestra **con razón visible**, nunca `disabled` mudo | La razón nombra qué falta; el operador escala |

## Accessibility Contract

- Los tres KPI de crédito son texto, no imagen: la corrección del corte los deja legibles sin síntesis,
  que era un defecto de legibilidad real, no un capricho.
- `tabular-nums` es también accesibilidad de lectura: cifras que se comparan no deben desplazarse
  lateralmente al actualizarse.
- La plomería de anuncios en vivo del payload no se tocó en esta sesión. Sigue siendo la del port
  (9 regiones), tal como la fijó la regla de reconciliación de cinco clases de `TASK-1552`.
- Ninguna capability bloqueada quedó como `disabled` mudo: la razón viaja en texto. Esa invariante venía
  de `TASK-1555` y se conserva.

## Implementation Mapping

| Elemento | Archivo (`efeonce-globe`) |
|---|---|
| KPI de crédito y donut del header | `apps/studio-client/src/ProducerHeader.tsx` |
| Panel de créditos (`max-w-full` sobre `absolute`) | `apps/studio-client/src/ProducerHeader.tsx` |
| Formato de cifras de crédito (primitive nueva) | `apps/studio-client/src/format/credits.ts` + su test |
| Riel del flujo y desborde del cuerpo | `apps/studio-client/src/composer/ProducerComposer.tsx` |
| Rótulos del dock | `apps/studio-client/src/composer/ComposerToolDock.tsx` |
| `Listo` vs `Completada` | `apps/studio-client/src/feed/ProducerFeed.tsx` |
| Primitives compartidas | `apps/studio-client/src/primitives/index.tsx` |
| Superficies desplegables | `apps/studio-client/src/dialogs/*` |
| Reglas `.pf__*` de la hoja | `apps/studio-client/src/styles/tailwind.css` |
| Token `--rail-scrim` | `apps/studio-client/src/tokens/tokens.ts` |
| Copy | `apps/studio-client/src/copy/index.ts` |
| Los dos gates nuevos | `apps/studio-client/src/gates/design-contract.test.ts` |

## GVC Scenario Plan

**No aplica, y la razón es de frontera, no de omisión.** GVC (`pnpm fe:capture`) es el harness visual de
Greenhouse: corre contra el portal Next.js con `agent-session` de NextAuth. El payload cliente de Globe
es otro runtime, en otro repo, detrás del front door de Globe — GVC no lo alcanza y forzar un escenario
sería fabricar evidencia.

La verificación visual equivalente que Globe sí tiene, y que esta task usó:

- **Canario del composer** — 163 asertos sobre valores computados en navegador, verde.
- **Canario del motor** — 8 asertos, verde.
- **Revisión humana en vivo** sobre `https://globe.efeoncepro.com/producer` con sesión real a 1440px,
  contra la revisión desplegada `globe-studio-internal-00100-9kq`.

Por eso `UI ready` queda en `no`: el semáforo está definido contra un harness que no cubre esta
superficie. Declararlo `yes` exigiría escribir un plan GVC que nadie puede correr — exactamente el
documento-para-pasar-el-gate que está prohibido.

## Design Decision Log

**Decisión 1 — aparear familia×peso en el sitio de uso, no en la declaración.**
Alternativa considerada: listar los cortes cargados y validar la declaración de `@font-face`. Se
descartó porque el defecto no está en qué se carga sino en **quién pide qué**: trece sitios pedían un
corte inexistente con la declaración perfectamente sana. Riesgo abierto: el gate escanea `className`, así
que un peso que llega **por herencia del HTML** le es estructuralmente invisible.

**Decisión 2 — rechazar la utilidad que el theme no puede generar.**
Alternativa: aceptarlas y agregar los pasos al theme. Se descartó porque agregar un escalón al SSOT es
una decisión de diseño, no un arreglo de compilación; y una utilidad que no emite CSS es indistinguible
de un olvido. Que falle es la señal correcta.

**Decisión 3 — arreglar el panel de créditos en el contenedor, no en el número.**
Los tres síntomas (recorte, ancho absurdo, quiebre del número) parecían tres bugs. Eran uno:
`max-w-full` sobre un elemento `absolute` resuelve contra el bloque contenedor. Alternativa descartada:
truncar el número. Habría escondido el bug dejando el contenedor mal.

**Decisión 4 — borrar `stateCompleted` en vez de renombrarla.**
Al reconocer que `coarseProgress` y `state` son ejes distintos, la clave quedó sin consumidor.
Conservarla "por si acaso" habría dejado el sinónimo listo para que el próximo agente lo reintroduzca.

**Decisión 5 — `--rail-scrim` como token, no como valor local.**
La regla dura de ADR-016: ningún valor de diseño literal en `className`. El velo del riel es un valor de
diseño; nace en el SSOT o no nace.

**Riesgo abierto principal:** el preflight de Tailwind no se emite, así que la regla del navegador
`b, strong { font-weight: bolder }` pide el corte fuerte **por herencia, sin que ninguna clase lo diga**.
Apareció tres veces el mismo día y ningún gate que escanee `className` puede verlo. Sin dueño.

## Visual verification

- Revisión humana en vivo del deploy real (`globe-studio-internal-00100-9kq`, imagen `b9112a80985d`) a
  1440px con sesión de operador.
- Canario del composer 163/163 · canario del motor 8/8 · `node --test` 129/129 · build 0 · eslint 0.
- **Deuda visual conocida y medida, no cerrada:** el H9 del feed. El 45 % vacío de la tarjeta destacada
  es alto fijo en la hoja más un pie `absolute`; y el `…` del título **no es CSS** —
  `DISPLAY_TITLE_MAX_LENGTH = 96` recorta por conteo de caracteres en
  `packages/domain/src/producer-live-feed.ts`, antes de que exista layout, así que ningún ancho lo
  arregla. Queda abierto y documentado en la task.
- Sin scorecard: el harness de scorecard es de Greenhouse y no alcanza este runtime (misma razón que GVC).
