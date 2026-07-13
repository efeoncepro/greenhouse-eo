# TASK-1401 — `/servicios/hubspot/precios/` — Motion Contract

> Cluster 1 de 4 del hub HubSpot. **Hereda el motion contract del pillar (TASK-1352):** misma escala, mismo
> easing, mismo contrato de `reduced-motion`. **Un hub que anima distinto en cada página no es un hub.**
>
> 🔴 **Esta página tiene la restricción de motion más dura del hub**, y no es estética: es **estratégica**.
> Su activo es **ser citada por LLMs**, y los LLMs no ejecutan JavaScript.
> **Cada animación que "revela" un número es un número que el crawler no ve.**

## Meta

- Status: `draft`
- Owner task: `TASK-1401`
- Surface: `efeoncepro.com/servicios/hubspot/precios/` (público, WordPress/Ohio)
- Motion primitive: **CSS + IntersectionObserver.** 🔴 **NO** los wrappers del portal (`motionCss` / `MOTION_EASE`
  son del portal Greenhouse, no del sitio público). **Cero GSAP, cero Motion, cero librerías.**
- Tier: **restraint — el más bajo del hub.** Aquí el motion **no tiene ninguna pieza con carácter**.
  La página es tipografía, tablas y números: **su "wow" es el dato, no la animación.**

## Motion Brief

**Una página de precios que se anima parece una página de precios que necesita distraerte.**

El comprador de esta página es un **CFO o un RevOps escaneando números**. Su modo mental es *auditoría*, no
*descubrimiento*. Un número que sube de `0` a `3.000` con un contador no le genera asombro: **le genera
desconfianza**, porque es exactamente lo que hace una landing que quiere venderle algo. Y encima, ese contador
**le roba la cifra al crawler**.

🔴 **La regla dura de esta página, y es absoluta:**

> ## Ninguna cifra de esta página se anima. Nunca. Ni una.
> Ni un contador. Ni un `count-up`. Ni un `reveal` que la mantenga en `opacity: 0` hasta el scroll.
> **Si un `fetch` sin JavaScript no ve el número, el número no existe.**

Esta no es una preferencia de estilo: **es el activo de la página**. El hub entero se apoya en que un LLM que
resuelve *"¿cuánto cuesta HubSpot?"* encuentre acá la respuesta completa. Un contador la borra.

**El motion que sí queda** hace exactamente un trabajo — **ritmo de lectura** — y nada más.

## Motion Inventory

| # | Elemento | Motion | Duración | Job (de los 7) | Justificación |
|---|---|---|---|---|---|
| 1 | **Hero (R1)** | Fade + rise (16 px) | **400 ms** | Jerarquía | Entrada. Nada más |
| 2 | **Reveals por región** | Fade + rise (12 px) al entrar en viewport | **300 ms** | Jerarquía | 🔴 **Con el contenido ya en el HTML** — el reveal anima `opacity`, **no crea el contenido** |
| 3 | 🔴 **Las cifras (R2, R6, R7, R8)** | **NINGUNO. CERO. Texto plano.** | — | — | 🔴 **Un contador renderiza `00` sin JS.** Es *el* bug que tiene la página vieja de HubSpot y **el que esta página existe para no cometer** |
| 4 | 🎯 **La tabla de créditos (R6)** | **NINGUNO** al aparecer. **Un hover de fila** (fondo sutil) para ayudar a leer | **150 ms** | Feedback | El hover **ayuda a rastrear la fila**, que es un problema real de lectura de tablas. **No decora: funciona** |
| 5 | **El diagrama de escalón (R5)** | **NINGUNO.** SVG/CSS estático | — | — | 🔴 Animar el escalón sería *"mira qué lindo el salto"*. **El salto no es lindo: es una advertencia** |
| 6 | **CTAs** | Color + micro-lift (2 px) + focus ring | **150 ms** | Feedback | Estándar del hub |
| 7 | **FAQ `<details>`** | **Nativo del navegador** | — | State transition | No reinventar. **Y su contenido vive en el DOM aunque esté cerrado** → citable |
| 8 | **Anchor scroll a `#creditos`** | `scroll-behavior: smooth` + **focus** al H2 | — | Wayfinding | 🔴 **Focus, no solo scroll** — si no, el usuario de teclado queda arriba |

🔴 **Prohibido:** contadores animados · hero-video · parallax · gradientes animados · number tickers · loops ·
`count-up` · scroll-jacking · "AI slop" (partículas, glows, shimmer decorativo).

## Microinteraction States

| Elemento | Estado | Visual | Motion |
|---|---|---|---|
| **CTA** | `idle` → `hover` | Micro-lift 2 px + color | 150 ms `emphasized` |
| **CTA** | `focus-visible` | Ring 2 px, offset 2 px, ≥3:1 | Instantáneo *(la a11y no se anima)* |
| **Fila de tabla (R6)** | `hover` | Fondo tonal sutil | 150 ms |
| **Fila de tabla (R6)** | `focus` (teclado) | **Mismo tratamiento que hover** | 🔴 **El teclado no es ciudadano de segunda** |
| **Wrapper de tabla (390 px)** | scrolleable | Sombra de borde que indica que hay más | **Estática** *(gradiente CSS, no animación)* |
| **`<summary>` FAQ** | `open` | Marcador nativo rota | Nativo |
| **Región** | entra en viewport | Fade + rise 12 px | 300 ms, una sola vez *(nunca al volver a scrollear)* |
| 🔴 **Cualquier cifra** | **todos** | **Texto. Siempre. Servido.** | **Ninguno** |
| 🔴 `sin JS` | — | **Todo visible, todo legible** | **Es el estado por defecto del HTML** |
| 🔴 `reduced-motion` | — | **Todo visible y estático** | Ver contrato abajo |

> 🎯 **Que `sin JS` y `reduced-motion` converjan en "todo visible" no es casualidad: es la decisión.**
> El contenido **nunca** depende del motion. El motion **solo enriquece** una página que ya funciona entera.
> Y en esta página en particular, **"funciona entera" es literalmente el modelo de negocio.**

## Transition Specs

```
Escala de duración:   75 · 150 · 200 · 300 · 400 ms        (heredada del pillar)
Easing:               emphasized  cubic-bezier(0.2, 0, 0, 1)   ← entradas
                      linear                                    ← nada acá (no hay loops)
Stagger:              hero (60 ms entre elementos). Las regiones NO staggerean entre sí
Propiedades animadas: 🔴 SOLO opacity y transform  (compositor-only)
                      🔴 NINGUNA excepción — esta página no tiene ni el height del mapa del pillar
```

🔴 **NUNCA** animar `width`, `height`, `top`, `left`, `margin` ni `box-shadow` → layout thrash.
🔴 **NUNCA** `transition: all`.

## Primitive & Token Mapping

- **Sitio público, no portal.** Los tokens de motion del portal (`motionCss`, `MOTION_EASE`) **NO aplican acá**.
- Escala declarada como **CSS custom properties page-scoped**, **con los mismos valores que el pillar**:
  `--gh-hs-dur-fast: 150ms` · `--gh-hs-dur-base: 300ms` · `--gh-hs-ease: cubic-bezier(0.2,0,0,1)`.
  🎯 **Mismos nombres, mismos valores en las 5 páginas del hub.** Un usuario que navega del pillar a precios
  **no debe sentir que cambió de sitio.**
- **Sin librerías de animación.** CSS + IntersectionObserver nativo. **~0 KB de JS.**
- 🔴 **No tocar el header/footer/wrapper globales** por un problema de motion local.

## Reduced Motion Contract

```css
@media (prefers-reduced-motion: reduce) {
  /* 1. Sin reveals: TODAS las regiones visibles desde el inicio */
  /* 2. Sin fades, sin rises, sin micro-lifts */
  /* 3. El hover de fila se mantiene (es ayuda de lectura, no decoración) — o se vuelve instantáneo */
  /* 4. El focus ring SÍ se mantiene (es accesibilidad, no decoración) */
  /* 5. scroll-behavior: auto  (el smooth scroll marea; el focus al destino se mantiene) */
}
```

🔴 **Bajo `reduced-motion` no se pierde ni una palabra ni una cifra.** La página ya era, por debajo, exactamente
lo que se ve: **texto y tablas.**

## Accessibility & Feedback

- **Focus ring visible** (contraste AA, ≥3:1) en CTAs, `<summary>`, enlaces, campos y **el wrapper scrolleable
  de las tablas** *(que es `tabindex="0"` — si no tiene ring, el usuario de teclado no sabe dónde está)*.
- 🔴 **El motion nunca es el único indicador de estado.** El hover de fila se acompaña de cursor y de contraste;
  el `<summary>` abierto se distingue por su marcador nativo, no por la animación.
- 🔴 **Ninguna información se transmite por movimiento** (WCAG 1.4.13). En una página de números, esto es
  literal: **el número está escrito.**
- El feedback del submit (éxito/error) lo maneja el renderer del form (TASK-1320) — **no se replica acá**.

## Performance Guardrails

| Guardrail | Umbral | Por qué |
|---|---|---|
| **LCP** | **< 2,0 s** *(más estricto que el pillar)* | 🎯 El LCP de esta página **es texto** (el H1 + el TL;DR). **No hay imagen de hero.** Si no baja de 2 s, algo se metió que no debía |
| **INP** | **< 200 ms** | Un listener de scroll y un `<details>`. Trivial |
| **CLS** | **< 0,05** *(más estricto que el pillar)* | 🔴 **No hay nada que pueda mover el layout**: sin contadores, sin lazy-swap, sin widgets. Las tablas tienen ancho fijo por columna |
| Peso del motion | **~0 KB de JS de librería** | CSS + IntersectionObserver nativo |
| 🎯 **Peso del HTML servido** | **completo, con todas las cifras** | **El guardrail más importante de la página.** Un HTML "liviano" que dejó los números en JS **es un HTML inútil** |

> 🎯 **Esta página debería ser la más rápida del sitio.** No tiene imágenes pesadas, ni video, ni widgets, ni
> librerías. **Si no lo es, es porque alguien le metió algo que la task prohíbe.** El CWV acá funciona como
> **detector de violaciones del contrato**, no solo como métrica.

## GVC / Micro Evidence

- **Capturas requeridas:** hero · 🎯 **la tabla de créditos (R6)** · FAQ abierto · **reduced-motion (todo visible,
  estático)** · **la tabla en 390 px con su scroll interno** · form montado.
- **Assertions:**
  - 🔴 **Ninguna cifra es un contador** — ningún elemento con texto numérico arranca en `0`/`00` y cambia.
  - 🔴 **Sin JS: todas las cifras están en el HTML servido** (assertion compartida con el flow).
  - Bajo `prefers-reduced-motion`: **todas las regiones visibles y estáticas**, sin pérdida de contenido.
  - **CLS < 0,05** en la carga completa (nada mueve el layout).
  - **LCP < 2,0 s** y el elemento LCP **es texto**, no una imagen.
  - Focus ring visible al tabular: CTAs → `<summary>` → **wrapper de tabla** → campos.
  - Solo se animan `opacity` y `transform` (auditable en DevTools → Layers).

## Design Decision Log

- 🔴 **Decisión: cero motion en las cifras. Es una regla, no una preferencia.** El activo de la página es **ser
  citada por motores de respuesta**, y **un contador renderiza `00` sin JavaScript**. **Alternativa descartada:**
  *contadores animados en el waiver y en los créditos* — es el patrón por defecto de toda landing de agencia,
  **se ve bien en el pitch y destruye el único canal que escala.** Es, además, **exactamente el bug que
  encontramos en la página viva de HubSpot en la auditoría** (los contadores mostraban `00 %` al `fetch` sin JS).
  **No lo vamos a repetir en la página que existe para corregirlo.**
- **Decisión: tier restraint, sin pieza de carácter.** El pillar tiene una (el mapa). **Esta no tiene ninguna, a
  propósito.** El lector está en modo auditoría: **el restraint no es ausencia de diseño, es la señal de que no
  le estamos vendiendo.** Es la traducción del argumento a motion.
- **Decisión: el hover de fila se queda** aunque sea "motion". No decora: **resuelve un problema real de lectura
  de tablas** (perder la fila al recorrerla con la vista). Mapea al job *Feedback*. Todo lo que no mapea a uno de
  los 7 jobs, se cortó.
- **Decisión: no animar el diagrama de escalón (R5).** Un escalón animado dice *"mira qué lindo el salto"*.
  **El salto no es lindo: es una advertencia de +USD 250/mes.** Animarlo lo convierte en decoración y le quita
  el filo al argumento.
- **Decisión: CWV como detector de violaciones.** Sin imágenes, sin video, sin widgets, sin librerías, esta
  página **debe** ser la más rápida del sitio. **Si el LCP sube, alguien metió algo prohibido** — y el guardrail
  lo caza antes que el review humano.

## Acceptance Checklist

- [ ] 🔴 **Ninguna cifra de la página está animada.** Cero contadores, cero `count-up`, cero number tickers.
- [ ] 🔴 **Sin JS: todas las cifras, la tabla de créditos y el waiver están en el HTML servido.**
- [ ] `prefers-reduced-motion` → **todo el contenido visible y estático**, sin pérdida.
- [ ] Solo se animan `opacity` y `transform`. **Ninguna excepción.** Sin `transition: all`.
- [ ] Motion tier **restraint**: cero piezas con carácter; el único motion "extra" es el hover de fila.
- [ ] CWV: **LCP < 2,0 s (elemento = texto)** · INP < 200 ms · **CLS < 0,05**.
- [ ] Cero librerías de animación (~0 KB). Sin tocar header/footer globales.
- [ ] Los tokens de motion tienen **los mismos nombres y valores que el pillar** (coherencia del hub).
- [ ] Focus ring visible, incluido el **wrapper scrolleable de las tablas**.
- [ ] GVC: tabla de créditos + reduced-motion + 390 px, capturado **y mirado**.
