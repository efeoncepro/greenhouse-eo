# TASK-1403 — `/servicios/hubspot/agentes/` — Motion Contract

> Cluster 3 de 4 del hub HubSpot. **Hereda el motion contract del pillar (TASK-1352)**: misma escala, mismo
> easing, mismo contrato de `reduced-motion`.
>
> 🎯 **Esta es la página del hub con el mayor riesgo de motion — y no por complejidad técnica, sino por
> tentación.** Es una página sobre **agentes de IA**, y el vocabulario visual por defecto de "IA" en 2026
> (glows, partículas, pulsos, typing effects, gradientes que respiran) **es exactamente el "AI slop" que el
> contenido de la página denuncia.**

## Meta

- Status: `draft`
- Owner task: `TASK-1403`
- Surface: `efeoncepro.com/servicios/hubspot/agentes/` (público, WordPress/Ohio)
- Motion primitive: **CSS + IntersectionObserver.** 🔴 **NO** los wrappers del portal.
  **Cero GSAP, cero Motion, cero Lottie, cero Rive, cero canvas.**
- Tier: **restraint.** **Una sola pieza con carácter: el stepper del gobierno (R6)** — y su motion **significa
  algo**: es la secuencia *propone → confirma → ejecuta*, que **es el argumento de la página**.

## Motion Brief

**El contenido de esta página dice: *"la mayoría de lo que te venden como IA es humo."***
**Si la página se mueve como el humo que denuncia, se contradice a sí misma en el primer scroll.**

🔴 **La lista de lo prohibido acá es específica y no negociable**, porque es exactamente lo que un diseñador
haría por defecto en una página de IA:

| Prohibido | Por qué |
|---|---|
| **Glows / auroras / gradientes que respiran** | Es *el* tell del AI slop. Dice *"esto es magia"*. **La página dice lo contrario: esto es ingeniería con supervisión humana** |
| **Partículas / redes neuronales / nodos conectándose** | Cliché muerto. **No comunica nada.** Y a un CEO escéptico le grita "marketing" |
| **Typing effect / texto que se "escribe" solo** | 🎯 **El peor de todos:** simula que un agente está pensando. **Es teatro.** Y encima **rompe la citabilidad** — el crawler ve un `<span>` vacío |
| **Pulse / heartbeat en un ícono de "IA"** | Sugiere que algo está *vivo*. **Nada está vivo.** Hay tres agentes en GA y nueve en beta |
| **Contadores en el 56%** | 🔴 Renderiza `0%` sin JS. **Y le pide asombro a la única cifra que necesita ser creída** |
| **Robots animados / mascotas de IA** | No. |

🎯 **Lo único que se anima con carácter es el gobierno (R6)** — y no es decoración: **es el argumento hecho
movimiento.** Los tres pasos (*propone → confirma → ejecuta*) **aparecen en orden**, y esa secuencia **es
literalmente lo que la página está vendiendo**: que hay un humano en el medio, y que el orden importa.

> 🎯 **Es el único motion del hub que "explica" algo.** El resto solo da ritmo.
> Y aun así: 🔴 **sin JS, los tres pasos están todos visibles.** El motion **enriquece** el argumento, **no lo
> construye.**

## Motion Inventory

| # | Elemento | Motion | Duración | Job (de los 7) | Justificación |
|---|---|---|---|---|---|
| 1 | **Hero (R1)** | Fade + rise (16 px) | **400 ms** | Jerarquía | Entrada sobria. **Sin glow, sin gradiente animado** |
| 2 | **Reveals por región** | Fade + rise (12 px) al entrar en viewport | **300 ms** | Jerarquía | Ritmo de lectura. **El contenido ya está en el HTML** |
| 3 | 🎯 **La tabla GA/beta (R2)** | 🔴 **NINGUNO al aparecer.** Hover de fila | **150 ms** | Feedback | 🔴 **Es el dato más citable de la página. No se revela: se sirve.** El hover ayuda a leer 12 filas |
| 4 | 🎯 **El stepper del gobierno (R6)** *(LA PIEZA)* | **Los 3 pasos aparecen en secuencia** (fade + rise, stagger **80 ms**) al entrar en viewport | **300 ms** c/u | 🎯 **Causalidad + Wayfinding** | 🎯 **El único motion del hub que ES el argumento:** *propone → confirma → ejecuta*. **El orden es el mensaje** |
| 5 | **La cifra del caso (56%)** | 🔴 **NINGUNO. Texto plano, servido.** | — | — | 🔴 **Un contador le pide asombro a la cifra que más necesita ser CREÍDA.** Y renderiza `0%` sin JS |
| 6 | **CTAs** | Color + micro-lift (2 px) + focus ring | **150 ms** | Feedback | Estándar del hub |
| 7 | **FAQ `<details>`** | Nativo | — | State transition | No reinventar |
| 8 | **Anchor scroll a `#estado`** | `scroll-behavior: smooth` + **focus** al H2 | — | Wayfinding | 🔴 **Focus, no solo scroll** |

🔴 **Prohibido (lista literal, para que nadie la interprete):** `glow` · `aurora` · `particles` · `neural` ·
`typing` / `typewriter` · `pulse` / `heartbeat` · `shimmer` decorativo · gradientes animados · contadores ·
Lottie / Rive · canvas · **cualquier cosa que sugiera que un agente está "pensando".**

## Microinteraction States — el stepper del gobierno (R6)

| Estado | Visual | Motion |
|---|---|---|
| `idle` (fuera de viewport) | Los 3 pasos **ya están en el DOM** | — |
| `entering` | Paso 1 → paso 2 → paso 3, en orden | Fade + rise 12 px · **300 ms** c/u · **stagger 80 ms** |
| 🎯 **Por qué el stagger** | **El orden ES el contenido.** Un humano tiene que estar en el paso 2 **antes** de que exista el paso 3 | El motion **enseña la secuencia**, no la decora |
| `entered` | Los 3 visibles, estáticos | **No se repite al volver a scrollear** |
| 🔴 `sin JS` | **Los 3 pasos visibles, en orden, desde el primer byte** | **Ninguno.** El `<ol>` ya dice el orden |
| 🔴 `reduced-motion` | **Los 3 pasos visibles y estáticos** | **Sin stagger, sin fade** |

> 🎯 **Nótese que el argumento sobrevive sin el motion.** El orden vive en un **`<ol>` semántico** — el motion
> solo lo **subraya**. Si el stagger fuera la única forma de percibir la secuencia, **el lector de pantalla y el
> crawler perderían el argumento central de la página** — que es precisamente el error que este contrato existe
> para prevenir.

## Transition Specs

```
Escala de duración:   75 · 150 · 200 · 300 · 400 ms          (heredada del pillar)
Easing:               emphasized  cubic-bezier(0.2, 0, 0, 1)
Stagger:              hero (60 ms) · 🎯 stepper del gobierno (80 ms — el único stagger con SIGNIFICADO)
Propiedades animadas: 🔴 SOLO opacity y transform  (compositor-only)
                      🔴 Ninguna excepción
```

🔴 **NUNCA** animar `width`, `height`, `top`, `left`, `margin`, `filter: blur` (los "glows" viven ahí) ni
`box-shadow`. 🔴 **NUNCA** `transition: all`.

## Primitive & Token Mapping

- **Sitio público, no portal.** Tokens del portal (`motionCss`, `MOTION_EASE`) **NO aplican**.
- **Las mismas CSS custom properties que el pillar**, con los mismos valores
  (`--gh-hs-dur-fast: 150ms` · `--gh-hs-dur-base: 300ms` · `--gh-hs-ease: cubic-bezier(0.2,0,0,1)`).
  🎯 **Mismo vocabulario en las 5 páginas del hub.**
- **Sin librerías.** CSS + IntersectionObserver nativo. **~0 KB de JS de librería.**
- 🔴 **No tocar el header/footer/wrapper globales.**

## Reduced Motion Contract

```css
@media (prefers-reduced-motion: reduce) {
  /* 1. Sin reveals: todas las regiones visibles desde el inicio */
  /* 2. El stepper del gobierno: los 3 pasos VISIBLES y ESTÁTICOS, en orden (el <ol> ya lo dice) */
  /* 3. Sin fades, sin rises, sin stagger, sin micro-lifts */
  /* 4. El focus ring SÍ se mantiene */
  /* 5. scroll-behavior: auto (el focus al destino se mantiene) */
}
```

🔴 **Bajo `reduced-motion` no se pierde ni una palabra, ni una cifra, ni el orden del gobierno.**
🎯 **El argumento vive en el `<ol>`, no en la animación.** Esa es toda la diferencia entre un motion que
enriquece y uno del que el contenido depende.

## Accessibility & Feedback

- **Focus ring visible** (contraste AA, ≥3:1) en CTAs, `<summary>`, enlaces, campos y **el wrapper scrolleable
  de la tabla**.
- 🔴 **El estado GA/beta NO se comunica solo por color.** Va la palabra escrita (WCAG 1.4.1).
  🎯 **En una página cuyo argumento *es* ese dato, un badge de color sin texto no es un descuido de a11y:
  es perder el argumento con el usuario daltónico.**
- 🔴 **El orden del gobierno no se comunica solo por movimiento** (WCAG 1.4.13). Vive en un `<ol>`.
- 🔴 **El motion nunca es el único indicador de estado.**
- El feedback del submit lo maneja el renderer del form (TASK-1320) — **no se replica acá**.

## Performance Guardrails

| Guardrail | Umbral | Por qué |
|---|---|---|
| **LCP** | **< 2,0 s** | El hero es texto. 🔴 **Si hay una ilustración, tiene que ser ligera y `loading="eager"` solo si es el LCP** |
| **INP** | **< 200 ms** | Un IntersectionObserver y un `<details>`. Trivial |
| **CLS** | **< 0,05** | 🔴 El stepper **reserva su altura**: los 3 pasos **ocupan su espacio antes de aparecer**. **Un stagger que empuja layout es un CLS, no un motion** |
| Peso del motion | **~0 KB de JS de librería** | CSS + IntersectionObserver |
| 🎯 **Peso del "AI look"** | 🔴 **0 KB** | **Ni un canvas, ni un Lottie, ni una partícula.** Si aparece uno, el contrato se rompió |

> 🎯 **Guardrail conceptual, y es el que más importa acá:** si un revisor abre esta página y su primera reacción
> es *"qué futurista se ve"*, **fallamos.** La reacción objetivo es **"qué claro está"**.
> **La página sobre agentes de IA tiene que ser la menos "de IA" del sitio.**

## GVC / Micro Evidence

- **Capturas requeridas:** hero · 🎯 **la tabla GA/beta** · **el caso (R4)** · 🎯 **el stepper del gobierno en
  2 estados** (entrando → completo) · **reduced-motion (los 3 pasos visibles, estáticos)** · FAQ abierto ·
  **tarjetas en 390 px**.
- **Assertions:**
  - 🔴 **Ninguna cifra es un contador** — el `56` no arranca en `0`.
  - 🔴 **Sin JS: la tabla GA/beta, el 56% y los 3 pasos del gobierno están en el HTML servido.**
  - 🔴 **El stepper es un `<ol>`** — el orden existe semánticamente, no solo por el stagger.
  - Bajo `prefers-reduced-motion`: **los 3 pasos visibles y estáticos, en orden.**
  - 🔴 **CLS < 0,05** — el stagger **no empuja layout** (la altura está reservada).
  - 🔴 **No existe `filter: blur`, `canvas`, Lottie, Rive ni ninguna animación infinita** en la página.
  - 🔴 **Ningún elemento con animación de tipo `pulse` / `glow` / `typing`.**
  - Solo se animan `opacity` y `transform` (auditable en DevTools → Layers).
  - **El estado GA/beta está escrito en texto**, no solo por color.

## Design Decision Log

- 🎯 **Decisión: la página sobre IA es la menos "de IA" del sitio.** Es la decisión central de este contrato.
  El vocabulario visual por defecto de la IA en 2026 (glows, partículas, typing effects, pulsos) **es el "AI
  slop" que el propio contenido denuncia**. Usarlo sería **contradecirse en el lenguaje visual mientras se es
  honesto en el texto** — y el lector percibe la contradicción antes de leer una palabra.
  **Alternativa descartada:** *hero con una visualización animada de "agentes trabajando"* — es lo que haría
  cualquier agencia, se ve espectacular en el pitch, **y le confirma al CEO escéptico exactamente lo que vino a
  temer.**
- 🎯 **Decisión: el único motion con carácter es el stepper del gobierno (R6) — porque ES el argumento.**
  *Propone → confirma → ejecuta* es una **secuencia causal**, y el stagger la enseña. Mapea a *Causalidad*,
  no a *Personalidad*. **Es el único motion del hub que explica algo en vez de solo dar ritmo.**
- 🔴 **Decisión: y aun así, el argumento sobrevive sin el motion.** El orden vive en un `<ol>`; el stagger solo
  lo subraya. **Si el motion fuera la única forma de percibir la secuencia, el lector de pantalla y el crawler
  perderían el argumento central** — que es exactamente el error que este documento existe para prevenir.
  *(La prueba de que un motion está bien diseñado es que se pueda apagar sin perder nada.)*
- 🔴 **Decisión: cero contador en el 56%.** Es la cifra que **más necesita ser creída** de todo el hub.
  Un contador **le pide asombro a un dato que solo quiere ser verificado** — y encima renderiza `0%` sin JS,
  borrándolo justo para el LLM que queremos que lo cite.
- **Decisión: el CLS del stepper se resuelve reservando altura.** Un stagger que empuja layout **no es motion:
  es un bug con buena presentación.**
- **Decisión: el guardrail conceptual está escrito** (*"si se ve futurista, fallamos"*). Los umbrales numéricos
  no atrapan un glow bonito. **Un revisor humano sí — si sabe qué buscar.**

## Acceptance Checklist

- [ ] 🔴 **Cero glows, partículas, typing effects, pulses, gradientes animados, Lottie, Rive o canvas.**
- [ ] 🔴 **Ninguna cifra animada.** El 56% es texto servido.
- [ ] 🎯 **El stepper del gobierno (R6) es la única pieza con carácter**, y su stagger **enseña la secuencia**.
- [ ] 🔴 **El stepper es un `<ol>`**: el argumento sobrevive **sin JS y con `reduced-motion`**.
- [ ] `prefers-reduced-motion` → **todo visible y estático**, sin pérdida (los 3 pasos, en orden).
- [ ] Solo se animan `opacity` y `transform`. Sin `filter: blur`. Sin `transition: all`.
- [ ] CWV: LCP < 2,0 s · INP < 200 ms · **CLS < 0,05** (el stagger no empuja layout).
- [ ] Cero librerías de animación (~0 KB). Sin tocar header/footer globales.
- [ ] Los tokens de motion tienen **los mismos nombres y valores que el pillar**.
- [ ] El estado GA/beta va **escrito**, no solo por color. Focus ring visible en toda la cadena de tabulación.
- [ ] 🎯 **Test del revisor:** al abrir la página, la reacción es **"qué claro está"**, no *"qué futurista"*.
- [ ] GVC: tabla + caso + stepper en 2 estados + reduced-motion, capturado **y mirado**.
