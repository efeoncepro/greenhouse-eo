# TASK-1406 — Simulador de precios HubSpot — Motion Contract

> Enhancement sobre **TASK-1401**, cuyo motion contract dice, literalmente:
> **"Ninguna cifra de esta página se anima. Nunca. Ni una."**
>
> 🎯 **Este documento existe para hacer UNA distinción — y es la más fina de todo el hub.**
> Si se entiende mal en cualquiera de las dos direcciones, se rompe algo: o se pierde la citabilidad, o se pierde
> el momento que justifica la task entera.

## Meta

- Status: `draft`
- Owner task: `TASK-1406`
- Surface: bloque `#simulador` en `efeoncepro.com/servicios/hubspot/precios/` (WordPress/Ohio)
- Motion primitive: **CSS.** 🔴 **Cero librerías, cero GSAP, cero Motion, cero charts.**
- Tier: **restraint** — con **una excepción precisa y una sola**.

## Motion Brief

### 🎯 La distinción: contador ≠ transición de estado

TASK-1401 prohíbe **contadores**. Este bloque **hace que un número cambie**. **No es una contradicción**, y la
diferencia no es semántica: **es de dónde arranca el número.**

|  | **Contador (🔴 PROHIBIDO)** | **Transición de estado (✅ PERMITIDA)** |
|---|---|---|
| **Cuándo ocurre** | Al cargar la página / al entrar en viewport | **Cuando el usuario mueve un control** |
| **Valor inicial** | 🔴 **`0`** | ✅ **Su valor real, servido en el HTML** |
| **Sin JavaScript** | 🔴 **Renderiza `00`** → el crawler no ve nada → **se pierde la citación** | ✅ **Renderiza el número correcto** → el crawler lee un caso completo |
| **Job (de los 7)** | Ninguno. **Es decoración que pide asombro** | ✅ **State transition + Feedback** |
| **Qué comunica** | *"mira qué número tan impresionante"* | *"tu cambio se aplicó, y esto cambió"* |

> 🔴 **La regla operativa, y es un test:**
> **Haz `fetch` de la página sin JavaScript. Si ves el número correcto → está bien. Si ves `0` o vacío → está mal.**
>
> 🎯 **Esa única prueba resuelve toda la ambigüedad de este documento.**

**Y hay un caso donde la animación no solo es válida: es el producto.**

Cuando el usuario activa *"con Efeonce"* y **la línea del onboarding pasa de `USD 3.000` a `USD 0`**, esa
transición **es la task entera**. Es *feedback* + *causalidad*: **el usuario hizo algo y el costo desapareció.**
Animarla no la decora — **la hace legible**. Si el número simplemente se reemplaza sin transición, el ojo puede
no registrar que cambió, y **el momento se pierde.**

🎯 **Es el único motion del hub que vende algo. Y lo vende porque el hecho es verdadero.**

## Motion Inventory

| # | Elemento | Motion | Duración | Job | Justificación |
|---|---|---|---|---|---|
| 1 | **El bloque (entrada)** | Fade + rise 12 px | **300 ms** | Jerarquía | El reveal sobrio del hub. Nada más |
| 2 | 🔴 **El desglose al cargar** | **NINGUNO** | — | — | 🔴 **Ya está calculado y servido.** No entra: **está** |
| 3 | **Un número al recalcular** | **Cross-fade + micro-rise (4 px)** | **150 ms** | **State transition** | 🎯 **Confirma que el cambio se aplicó.** El valor **no cuenta desde 0**: se **reemplaza** |
| 4 | 🎯 **La línea del onboarding → `USD 0`** *(EL MOMENTO)* | **Cross-fade + el `0` entra con un micro-scale (0.96 → 1) + el badge `−31%` aparece** | **200 ms** *(el número)* + **150 ms** *(el badge, con 80 ms de delay)* | **Feedback + Causalidad** | 🎯 **La única animación del hub que vende — y vende un hecho verdadero.** El delay del badge hace que se lea *"pasó a cero… **porque somos partner**"* |
| 5 | 🎯 **El salto de banda** *(2.000 → 2.001)* | El total cambia (150 ms) **+ la nota de advertencia entra** (fade, 150 ms) | **150 ms** | **Feedback** | 🎯 **La trampa, demostrada.** La nota **tiene que notarse**: es el argumento |
| 6 | **La nota de créditos** *(al agregar un 2.º Hub)* | Fade in | **150 ms** | Feedback | *"Los créditos siguen siendo los mismos"* — **el invariante, visible** |
| 7 | **Controles (hover/focus)** | Color + focus ring | **150 ms** | Feedback | Estándar |
| 8 | **El total, al cargar** | 🔴 **NINGUNO** | — | — | 🔴 **Servido. Estático. Citable.** |

🔴 **Prohibido:** **count-up desde `0`** · number tickers · odómetros · barras que crecen · charts ·
confetti al ver el waiver *(sería exactamente el gesto que le dice al CFO que le estamos vendiendo)* ·
cualquier animación **al cargar** sobre una cifra.

## Microinteraction States — la línea del waiver (el momento)

| Estado | Visual | Motion |
|---|---|---|
| `idle` (comprando directo) | `Onboarding obligatorio de HubSpot ......... USD 3.000` | — |
| `activando` | El usuario marca *"con Efeonce"* | — |
| 🎯 `transición` | El `3.000` **se desvanece**; el `0` **entra con micro-scale 0.96 → 1** | **200 ms** `emphasized` |
| 🎯 `badge` | Aparece **`−31% en el año 1`** | **150 ms**, con **80 ms de delay** |
| `resuelto` | `Onboarding ......... USD 0` · `Año 1: USD 9.600` | Estático |
| 🔴 `sin JS` | **La banda del waiver está en el HTML, resuelta**, con su `0` y su `31%` | **Ninguno.** 🎯 **El crawler lee el waiver aplicado** |
| 🔴 `reduced-motion` | **El número se reemplaza sin transición.** El badge aparece sin fade | Sin pérdida de información |

> 🎯 **Los 80 ms de delay del badge son la única decisión de "craft" de todo este contrato, y son deliberados.**
> Sin delay, el `0` y el `−31%` aparecen juntos y se leen como **un dato**.
> Con delay, se leen como **una consecuencia**: *"pasó a cero… **porque trabajas con un partner certificado**"*.
> **Es la diferencia entre informar y explicar** — y cuesta 80 milisegundos.

## Transition Specs

```
Escala de duración:   150 · 200 · 300 ms          (heredada del hub)
Easing:               emphasized  cubic-bezier(0.2, 0, 0, 1)
Stagger:              🎯 el badge del waiver: 80 ms DESPUÉS del número (y nada más)
Propiedades animadas: 🔴 SOLO opacity y transform  (compositor-only)
                      🔴 NUNCA width/height — el desglose RESERVA su altura
```

🔴 **El desglose tiene altura reservada.** Cambiar de Hub o cruzar una banda **no debe empujar la página**.
🎯 **Un simulador que hace saltar el layout cada vez que tocas algo no se siente "vivo": se siente roto** —
y en una página cuyo argumento es la seriedad, eso cuesta caro.

## Primitive & Token Mapping

- **Sitio público, no portal.** Tokens del portal (`motionCss`, `MOTION_EASE`) **NO aplican**.
- **Las mismas CSS custom properties que el pillar y que TASK-1401** (`--gh-hs-dur-fast: 150ms` ·
  `--gh-hs-ease: cubic-bezier(0.2,0,0,1)`). 🎯 **El simulador no introduce vocabulario nuevo.**
- **Cero librerías.** CSS + un listener por control. **~0 KB de JS de librería.**
- 🔴 **No tocar el header/footer/wrapper globales.**

## Reduced Motion Contract

```css
@media (prefers-reduced-motion: reduce) {
  /* 1. Sin reveal de entrada del bloque */
  /* 2. Los números se REEMPLAZAN sin cross-fade (el valor nuevo aparece de una) */
  /* 3. El 0 del waiver aparece sin micro-scale; el badge, sin fade ni delay */
  /* 4. El focus ring SÍ se mantiene */
}
```

🔴 **Bajo `reduced-motion` no se pierde ni un número, ni el waiver, ni la nota de la banda, ni la de créditos.**
🎯 **El momento del waiver sigue ocurriendo — simplemente ocurre de golpe.** *(Y `aria-live` lo anuncia igual,
así que para un usuario de lector de pantalla la experiencia **nunca dependió del motion**.)*

## Accessibility & Feedback

- 🔴 **`aria-live="polite"` en el contenedor del total.** **El motion NO es el único indicador de que el número
  cambió** (WCAG 1.4.13): el lector de pantalla lo anuncia.
  🎯 **Ese `aria-live` es lo que hace que el motion sea legítimo:** si la animación fuera el único canal, el
  simulador no existiría para un usuario ciego.
- 🔴 **El `USD 0` del waiver va escrito, con su porcentaje.** **Nunca solo por color** (verde = gratis es
  intuitivo **y deja fuera al usuario daltónico del momento central de la página**).
- **Focus ring visible** (AA) en todos los controles y en el CTA.
- La nota del salto de banda **es texto**, no solo un cambio de color del total.

## Performance Guardrails

| Guardrail | Umbral | Por qué |
|---|---|---|
| **LCP** | **< 2,0 s** | El LCP sigue siendo **texto** (el H1 + el TL;DR de TASK-1401). **El simulador está abajo del fold** |
| **INP** | 🎯 **< 100 ms** | **El recálculo es una función pura sobre un objeto ya en memoria.** Si supera 100 ms, **alguien metió un fetch por interacción** |
| **CLS** | 🔴 **< 0,05, y en la práctica 0** | **El desglose reserva su altura.** Cambiar de Hub **no empuja nada** |
| Peso del JS | **~0 KB de librería** | CSS + listeners nativos + el estimador puro (que ya viaja con el catálogo) |
| 🎯 **Spinner** | 🔴 **CERO** | **No hay latencia que ocultar.** *(Un spinner acá es la prueba de que alguien hizo un round-trip innecesario.)* |

## GVC / Micro Evidence

- **Capturas requeridas:** el bloque en su **default** · 🎯 **la línea del waiver antes y después** ·
  **el salto de banda** · **los créditos con 2 Hubs** · **reduced-motion** · **sin-JS** · **390 px**.
- **Assertions:**
  - 🔴 **`fetch` sin JS → el número correcto está en el HTML** *(no `0`, no vacío)*. **Es LA assertion.**
  - 🔴 **Ningún elemento numérico arranca en `0` y sube al cargar.**
  - 🔴 **Ningún elemento anima `width` o `height`.**
  - **CLS < 0,05** al cambiar de Hub / cruzar banda / activar el waiver.
  - **INP < 100 ms** en el recálculo *(y **cero requests de red** al mover un control)*.
  - Bajo `prefers-reduced-motion`: **los números cambian sin transición, sin pérdida**.
  - `aria-live` presente y anunciando · el `0` del waiver **escrito, no solo en color**.
  - **Cero librerías de animación** en el bundle de la página.

## Design Decision Log

- 🎯 **Decisión: contador ≠ transición de estado, y la prueba es una sola.** El hub prohíbe contadores porque
  **renderizan `00` sin JS y borran la cifra para el crawler**. Un número que **cambia porque el usuario movió un
  control** arranca de su valor real, servido, y **transiciona**. **Test: `fetch` sin JS. ¿Ves el número? Bien.
  ¿Ves `0`? Mal.** *(Esta distinción es la razón de ser de este documento: sin ella, un implementador razonable
  hace un count-up y rompe el activo del hub sin darse cuenta.)*
- 🎯 **Decisión: la transición del waiver (3.000 → 0) es el único motion del hub que "vende" — y es legítimo,
  porque el hecho es verdadero.** No estamos animando una promesa: estamos animando **un cargo que efectivamente
  desaparece del contrato**. **Alternativa descartada:** *reemplazar el número sin transición* — el ojo puede no
  registrar el cambio, **y el momento que justifica la task entera se pierde**.
- 🎯 **Decisión: 80 ms de delay en el badge `−31%`.** Sin delay, el `0` y el porcentaje se leen como **un dato**.
  Con delay, se leen como **una consecuencia**. **Es la diferencia entre informar y explicar, y cuesta 80
  milisegundos.** *(Es la única decisión de craft puro de este contrato, y está declarada como tal.)*
- 🔴 **Decisión: cero confetti, cero celebración.** La tentación es real —*"¡ahorraste USD 3.000!"*— y sería
  **exactamente el gesto que le dice al CFO que le estamos vendiendo**. **El número solo. El número basta.**
- **Decisión: el desglose reserva su altura.** Un simulador que hace saltar el layout **no se siente vivo: se
  siente roto** — y en una página cuyo argumento es la seriedad, eso cuesta caro.
- **Decisión: INP < 100 ms como detector.** El recálculo es una función pura sobre un objeto en memoria.
  **Si supera 100 ms, alguien metió un fetch por interacción** — y el guardrail lo caza antes que el review.

## Acceptance Checklist

- [ ] 🔴 **`fetch` sin JS → el número correcto está en el HTML.** *(La assertion que resuelve todo.)*
- [ ] 🔴 **Ningún count-up.** Ningún número arranca en `0` al cargar.
- [ ] 🎯 **La transición del waiver existe** (3.000 → 0, con micro-scale) **y el badge `−31%` entra 80 ms después**.
- [ ] 🎯 **El salto de banda y la nota de créditos son perceptibles** (y son **texto**, no solo color).
- [ ] Solo se animan `opacity` y `transform`. **Ningún `width`/`height`.**
- [ ] `prefers-reduced-motion` → **los números cambian sin transición, sin pérdida**.
- [ ] `aria-live="polite"` anuncia el cambio. El `USD 0` va **escrito**.
- [ ] CWV: LCP < 2,0 s · **INP < 100 ms** *(cero requests al recalcular)* · **CLS < 0,05**.
- [ ] **Cero librerías de animación. Cero spinner. Cero confetti.**
- [ ] GVC: waiver antes/después + salto de banda + reduced-motion + sin-JS, capturado **y mirado**.
