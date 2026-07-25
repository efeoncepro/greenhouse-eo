# Globe Client Payload — Contrato de Motion V1

> **Tipo de documento:** Contrato técnico (SSOT de motion del payload cliente de Globe)
> **Version:** 1.0
> **Creado:** 2026-07-25 por Claude (TASK-1559 corrección de contrato / ADR-014)
> **Ámbito:** `efeonce-globe/apps/studio-client/**` — feed, viewer, composer y toda superficie futura del payload cliente
> **ADR gobernante:** [ADR-014 — Globe Client Application Decision](EFEONCE_GLOBE_CLIENT_APPLICATION_DECISION_V1.md)

## Por qué existe este documento

`TASK-1559` se ejecutó con `Motion: none` en su contrato de UI. Fue un **error de autoría de la task**: el
diseño aprobado del Producer tiene **11 `@keyframes`, 12 animaciones en uso y 9 transiciones**, y el motion
nunca entró al scope de ningún slice porque el contrato decía que no había. La consecuencia fue medible: el
feed shippeó con 4 de 11 animaciones, y las 7 ausentes son justamente las que dan personalidad.

Y existe como documento **compartido** en vez de per-task por una razón concreta: la animación del isotipo
de Globe generando (`gBreathe` + `gHalo` + `gFlame` + `gSpark`) vive en el **feed** y en el **composer**. Un
contrato por task la definiría dos veces, y dos definiciones del mismo momento de marca divergen — es el
mismo argumento que hizo que el color viva en un SSOT y no en cada superficie.

## Fuente de los valores

**Medidos** de `~/Documents/Globe/Producer/Suite de IA Generativa Creativa/Globe Creative Producer.dc.html`
el 2026-07-25, no estimados. El easing del prototipo (`cubic-bezier(.2,.8,.2,1)`) **ya coincide** con
`--ease-enter` del SSOT de tokens, así que no hay conversión que decidir: es el mismo curve.

---

## 1. El motion de Globe tiene TRES capas, y se gobiernan distinto

Esta separación es la decisión de fondo del contrato. No todo el motion es igual, y tratarlo igual es cómo
se termina apagando lo que informa o dejando prendido lo que distrae.

| Capa | Qué comunica | Bajo `prefers-reduced-motion` |
|---|---|---|
| **Identidad** — el isotipo generando | «tu pieza se está haciendo ahora» | **se apaga la animación, NO el elemento**: el isotipo sigue visible y el estado sigue dicho por texto |
| **Estructura** — entradas, overlays, thumbnails | de dónde vino esto, qué acaba de aparecer | se reduce a `--duration-none` (aparece sin desplazarse) |
| **Ambiente** — aurora del fondo | atmósfera de marca, no información | **se apaga por completo** |

**Regla dura:** ninguna de las tres puede ser el **único** portador de un estado. El progreso de una
generación se dice con texto (`Generando`, `Enviando`, `Finalizando`) y el isotipo lo acompaña. Si el motion
se apaga y el usuario deja de saber qué está pasando, el motion estaba haciendo trabajo de copy.

---

## 2. Inventario canónico — las 11 animaciones, con sus valores medidos

### Capa identidad — el isotipo de Globe generando

Cuatro animaciones que corren **juntas** sobre el mismo elemento compuesto. Son un solo momento de marca,
no cuatro efectos: separarlas y usar una sola da un isotipo que se mueve raro.

| Nombre | Duración | Timing | Transform medido |
|---|---|---|---|
| `gBreathe` | **3.2s** infinite | `--ease-enter` | `0%,100%: translateY(2px) scale(.99)` → `50%: translateY(-6px) scale(1.035)` |
| `gHalo` | **3.2s** infinite | `--ease-enter` | `0%,100%: opacity .4 scale(.9)` → `50%: opacity .72 scale(1.08)` |
| `gFlame` | **.85s** infinite | `ease-in-out` | `0%,100%: scaleY(.78) scaleX(.94) opacity .82` → `50%: scaleY(1.18) scaleX(1.06) opacity 1` |
| `gSpark` | **1.5s / 1.8s / 2s (delay .9s) / 1.6s** infinite | `--ease-enter` | `0%: opacity 0, translate(-50%,0) scale(.5)` · `18%: opacity .95` · `100%: opacity 0, translate(calc(-50% + var(--sx)), -48px) scale(.15)` |

**Por qué `gBreathe` y `gHalo` comparten 3.2s:** están en fase, y desfasarlos hace que el halo persiga al
isotipo en vez de emanar de él. `gFlame` corre a .85s a propósito — el fuego es más rápido que la
respiración, y ahí está la sensación de que algo *trabaja* adentro.

**Por qué las 4 chispas tienen duraciones distintas y una tiene delay:** con la misma duración salen
sincronizadas y se leen como un pulso mecánico. Los cuatro valores no son arbitrarios: son
**deliberadamente no múltiplos** entre sí, así que el patrón no se repite de forma perceptible. `--sx`
desplaza cada chispa en horizontal, y es lo que hace que no suban en línea.

⚠️ **`gSpark` mueve `transform` y `opacity` únicamente.** Las cuatro chispas corriendo infinitamente son 4
elementos animados permanentes: si alguna toca una propiedad que dispare layout, el costo es constante y no
puntual.

### Capa estructura

| Nombre | Duración | Timing | Qué hace | Dónde |
|---|---|---|---|---|
| `candIn` | **.42s** `both` | `--ease-enter` | `opacity 0, scale(.965) translateY(8px)` → `none` | entrada de cada card del feed |
| `overlayIn` | **.2s** `both` | `--ease-enter` | fade puro | menús, popovers |
| `sheetIn` | **.3s** `both` | `--ease-enter` | `opacity 0, scale(.97) translateY(10px)` → `none` | sheets y diálogos |
| `skel` | **1.3s** infinite (barra de progreso: **1.15s**) | `linear` | `background-position 120% → -120%` | skeletons y barra de progreso |

**`candIn` tiene `both` y no es un detalle:** sin `both` la card parpadea en su estado final antes de
arrancar. Y **debe dispararse una sola vez por pieza**, no en cada reconciliación — el feed reanuda cada 4
segundos, así que una entrada que se re-dispara hace latir todo el feed cada 4s. El payload viejo resolvía
esto con un registro por firma (`feedCardRegistry`); el nuevo tiene que resolverlo con la misma intención:
la animación pertenece a la **primera aparición** de un `stableKey`, no al render.

**`skel` es `linear` a propósito.** Un shimmer con easing acelera y frena, y eso se lee como si el contenido
estuviera a punto de llegar y después no. Lo ambiente va lineal.

### Capa ambiente

| Nombre | Duración | Timing | Qué hace |
|---|---|---|---|
| `auroraA` | **24s** y **32s** infinite `alternate` | `--ease-enter` | `translate(0,0) scale(1)` → `translate(-6%,7%) scale(1.16)` |
| `auroraB` | **28s** infinite `alternate` | `--ease-enter` | `translate(0,0) scale(1)` → `translate(7%,-6%) scale(1.12)` |

Tres capas con **duraciones distintas y coprimas en la práctica** (24s / 28s / 32s): el patrón combinado no
se repite en una sesión de trabajo. `alternate` en vez de reiniciar, porque un reinicio produce un salto
visible cada 24 segundos.

### Capa onboarding

| Nombre | Duración | Timing | Qué hace |
|---|---|---|---|
| `coachPulse` | **2.2s** infinite | `--ease-enter` | pulsa el anillo del coach mark y sostiene el velo `0 0 0 9999px` |

---

## 3. Transiciones (no keyframes) — las microinteracciones

| Interacción | Propiedad | Duración | Nota |
|---|---|---|---|
| Hover de card | `transform` (lift 2px) + `border-color` + `box-shadow` | `--duration-short` | `:focus-within` **también**, no sólo `:hover` |
| Acciones de la card | `opacity` + `transform` | `--duration-short` | ver la regla de reduced-motion más abajo — es la importante |
| Barra de progreso | `width` | `.18s linear` | `linear` porque representa avance real, y un easing mentiría sobre la velocidad |
| Botón / chip | `background` + `color` | `--duration-short` | |

---

## 4. El contrato de `prefers-reduced-motion` — y la regla que casi se pierde

El prototipo apaga las decorativas y, además, hace algo que **no es obvio y es lo más importante del
bloque**:

```css
@media (prefers-reduced-motion: reduce) {
  .cardwrap .actions {
    transition: none;
    opacity: 1;
    transform: none;
    pointer-events: auto;
  }
}
```

**Las acciones que aparecen al hover se vuelven PERMANENTEMENTE visibles.** No es una simplificación de la
animación: es que un affordance revelado por movimiento, cuando el movimiento se apaga, **deja de existir**.
Alguien con `prefers-reduced-motion` no perdería una animación — perdería las cinco acciones de cada card.

Es la misma razón por la que las acciones del hero ya se renderizan siempre visibles: en touch y por teclado
un hover-only es inalcanzable.

### Tabla de comportamiento por capa

| Elemento | Con motion | Con `reduce` |
|---|---|---|
| isotipo generando (`gBreathe`/`gHalo`/`gFlame`/`gSpark`) | animado | **visible, quieto** — el estado lo dice el texto |
| aurora del fondo | 3 capas a la deriva | `animation: none` |
| entrada de card (`candIn`) | .42s | `--duration-none` |
| overlays y sheets | .2s / .3s | `--duration-none` |
| skeleton (`skel`) | shimmer 1.3s | `animation: none` — el skeleton queda como caja |
| barra de progreso | width .18s | sin transición; el valor salta |
| **acciones de la card** | aparecen al hover | **siempre visibles, `pointer-events: auto`** |
| hover lift | 2px en `--duration-short` | sin transición (el estado final sí aplica) |

---

## 5. Tokens que hay que agregar al SSOT

`apps/studio-client/src/tokens/tokens.ts` hoy tiene `--duration-none|short|medium` y `--ease-enter`. Este
contrato necesita:

| Token | Valor | Para |
|---|---|---|
| `--duration-long` | `420ms` | `candIn` |
| `--duration-overlay` | `200ms` | `overlayIn` |
| `--duration-sheet` | `300ms` | `sheetIn` |
| `--duration-breathe` | `3200ms` | `gBreathe` + `gHalo` (el mismo token para los dos **fija la fase**) |
| `--duration-flame` | `850ms` | `gFlame` |
| `--duration-skeleton` | `1300ms` | `skel` |
| `--duration-progress` | `180ms` | barra de progreso |
| `--ease-linear` | `linear` | shimmer y progreso — declarado como token para que el gate de motion no lo lea como literal |
| `--ease-pulse` | `ease-in-out` | `gFlame` |

⚠️ **`--duration-breathe` compartido no es ahorro de líneas: es el mecanismo que garantiza la fase.** Dos
tokens con el mismo valor se desincronizan la primera vez que alguien ajusta uno.

Las duraciones de ambiente (24s/28s/32s) y de chispas (1.5/1.8/2/1.6s) **no** se tokenizan: su valor exacto
es irrelevante y lo que importa es que sean **distintas entre sí**. Un token invitaría a unificarlas, que es
precisamente el defecto.

---

## 6. Cómo se verifica

El motion es lo que un screenshot no puede probar. Tres niveles:

1. **Gate de literales** — el gate de motion existente (`design-contract.test.ts`) ya prohíbe duraciones y
   curvas literales; las nuevas entran como tokens o el gate muerde.
2. **Gate de reduced-motion** — un test nuevo que recorra el CSS y exija: toda regla con `animation:` que no
   sea `--duration-none` debe tener su contraparte dentro de un bloque `prefers-reduced-motion: reduce`. Es
   la única forma de que la regla del punto 4 no se pierda en el próximo componente.
3. **Canary de interacción** — capturas en frames relativos (cerrado → hover → abierto) más una pasada con
   `prefers-reduced-motion` **emulado**, afirmando que las acciones de la card están visibles y que el
   isotipo sigue en el DOM.

---

## Reglas duras

- **NUNCA** el motion como único portador de un estado. Si apagarlo deja al usuario sin saber qué pasa, era
  copy disfrazado de animación.
- **NUNCA** un affordance revelado sólo por hover sin su contraparte de reduced-motion visible. Apagar el
  movimiento no puede borrar una acción.
- **NUNCA** animar propiedades que disparen layout (`width`/`height`/`top`/`left`/`margin`). La excepción es
  la barra de progreso, que anima `width` porque representa avance real y su costo está acotado a un
  elemento con `contain`.
- **NUNCA** re-disparar `candIn` en una reconciliación. La animación pertenece a la primera aparición de un
  `stableKey`; con el feed reanudando cada 4s, un re-disparo hace latir la pantalla completa.
- **NUNCA** desfasar `gBreathe` de `gHalo` (mismo token de duración) ni sincronizar las cuatro chispas.
- **NUNCA** apagar el **elemento** del isotipo bajo reduced-motion; se apaga su animación.
- **SIEMPRE** declarar duraciones y curvas como tokens del SSOT, incluido `linear`.
- **SIEMPRE** `:focus-within` junto a `:hover` en cualquier revelado.

## Open questions

- **El rig del isotipo.** El prototipo compone el isotipo con `<img>` + spans de halo/llama/chispas. En el
  payload cliente el isotipo tiene que ser una **primitive** (`GlobeGeneratingMark`), y queda por decidir si
  el SVG se inlinea (como `GrainLayer`, para no depender de `img-src`) o se sirve como asset del bundle.
- **Coach marks.** `coachPulse` pertenece a un onboarding que el payload cliente todavía no tiene. Se
  documenta el valor para no perderlo, pero no se implementa hasta que exista la superficie.
- **Aurora y costo.** Tres capas animadas permanentemente en una pestaña que puede quedar abierta todo el
  día. Hay que medir si conviene pausarla con `IntersectionObserver` o `document.visibilityState`.
