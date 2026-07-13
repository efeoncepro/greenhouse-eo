# TASK-1402 — `/servicios/hubspot/cuando-no-usar-hubspot/` — Motion Contract

> Cluster 2 de 4 del hub HubSpot. **Hereda el motion contract del pillar (TASK-1352)**: misma escala, mismo
> easing, mismo contrato de `reduced-motion`.
>
> 🎯 **Es la página con MENOS motion de todo el sitio público. A propósito.**
> Aquí el motion no se recorta por performance: **se recorta porque cada animación le resta credibilidad al
> argumento.**

## Meta

- Status: `draft`
- Owner task: `TASK-1402`
- Surface: `efeoncepro.com/servicios/hubspot/cuando-no-usar-hubspot/` (público, WordPress/Ohio)
- Motion primitive: **CSS puro.** 🎯 **Ni siquiera IntersectionObserver, si se puede evitar.**
  🔴 **NO** los wrappers del portal (`motionCss` / `MOTION_EASE` son del portal, no del sitio público).
  **Cero GSAP, cero Motion, cero librerías. Idealmente, cero JavaScript.**
- Tier: **restraint severo — el piso del hub.** **Ninguna pieza con carácter. Ninguna.**

## Motion Brief

**Esta página dice: "no te vamos a vender." Si se mueve como una página que vende, no le cree nadie.**

El lector es un **escéptico profesional** — RevOps, IT, seguridad — cuyo trabajo literal es **detectar cuándo
le están vendiendo algo**. Llegó buscando una fuente sin incentivo. Y entonces:

- una **animación de entrada dramática** le dice *"esto es una landing"*;
- un **reveal por scroll** de los límites le dice *"te estoy dosificando el contenido"*;
- un **acordeón** le dice *"te hago trabajar para ver lo que dije que te iba a mostrar"*;
- un **contador** le dice *"quiero que este número te impresione"*.

**Cada uno de esos gestos le confirma que somos lo que vino a evitar.**

🔴 **La regla dura, y es la más severa del hub:**

> ## En esta página, el motion es un pasivo, no un activo.
> **Nada se anima si no es feedback de una acción del usuario.**
> Sin reveals. Sin entradas. Sin contadores. Sin acordeones. **Sin nada.**

**El único motion que sobrevive es el que confirma que el navegador te escuchó** (hover, focus). Todo lo demás
se corta — **no por performance, sino por argumento.**

🎯 **Y hay una razón técnica que apunta al mismo lugar:** el consumidor principal de esta página **es un LLM**,
y **un límite que aparece con un reveal es un límite que el crawler nunca ve.** La estética y la estrategia
llegan a la misma conclusión, lo cual es una buena señal de que la conclusión es correcta.

## Motion Inventory

| # | Elemento | Motion | Duración | Job (de los 7) | Justificación |
|---|---|---|---|---|---|
| 1 | **Hero (R1)** | 🎯 **NINGUNO.** Aparece con la página | — | — | 🎯 **Una entrada animada en esta página es una mentira de tono.** El H1 dice *"Cuándo NO usar HubSpot"* — **no necesita ayuda para entrar** |
| 2 | **Reveals por región** | 🔴 **NINGUNO** | — | — | 🔴 **Dosificar el contenido por scroll es lo contrario de lo que la página promete.** Y **los borra para el crawler** |
| 3 | 🎯 **La tabla de los 8 límites (R4)** | **NINGUNO** al aparecer. **Hover de fila** (fondo sutil) para no perder la línea | **150 ms** | Feedback | El hover **resuelve un problema real de lectura** de una tabla de 8×3. **No decora: funciona** |
| 4 | **Los enlaces de fuente** | Subrayado + color al hover/focus | **150 ms** | Feedback | 🎯 **Son la prueba de la página.** Tienen que verse **inequívocamente clicables** |
| 5 | **CTA suave (R8)** | Color + focus ring. 🔴 **Sin micro-lift** | **150 ms** | Feedback | 🎯 **Ni siquiera el CTA se levanta.** Un botón que "salta" pide ser clicado — **y este no pide nada** |
| 6 | **Cifras y límites** | 🔴 **NINGUNO. Texto plano, servido.** | — | — | 🔴 Un contador renderiza `00` sin JS **y le pide asombro a un dato que solo quiere ser verificado** |
| 7 | **Acordeones / disclosure** | 🔴 **NO EXISTEN** | — | — | 🔴 **Ningún límite se esconde detrás de un clic.** Ni siquiera con `<details>`: **acá todo está abierto** |

🔴 **Prohibido, y con más fuerza que en cualquier otra página del hub:** reveals por scroll · entradas animadas ·
contadores · acordeones sobre los límites · parallax · hero-video · gradientes animados · sticky bars ·
exit-intent · **cualquier cosa que se mueva sin que el usuario la haya tocado.**

> 🎯 **Nota sobre el FAQ:** el pillar y `/precios/` usan `<details>/<summary>`. **Acá no.**
> En una página de preguntas frecuentes, el disclosure es cortesía. **En una página de límites, es ocultamiento** —
> y contradice la promesa. **Los ocho límites están abiertos, siempre, los ocho.**

## Microinteraction States

| Elemento | Estado | Visual | Motion |
|---|---|---|---|
| **Fila de tabla (R4)** | `hover` | Fondo tonal sutil | 150 ms `emphasized` |
| **Fila de tabla (R4)** | `focus` (teclado) | **Mismo tratamiento que hover** | 🔴 **El teclado no es ciudadano de segunda** |
| **Enlace de fuente** | `hover` / `focus` | Subrayado + color + icono de externo | 150 ms |
| **Enlace de fuente** | `visited` | 🎯 **Estado visitado visible** | — · 🎯 *"Ya fui a comprobar este"* **es información útil** para quien audita ocho fuentes |
| **CTA suave** | `hover` | Color. 🔴 **Sin lift, sin escala** | 150 ms |
| **CTA suave** | `focus-visible` | Ring 2 px, offset 2 px, ≥3:1 | Instantáneo |
| **Wrapper de tabla (390 px)** | scrolleable | Gradiente de borde que indica que hay más | **Estático** (CSS, no animación) |
| 🔴 **Todo lo demás** | **todos** | **Visible desde el primer byte** | **Ninguno** |
| 🔴 `sin JS` | — | **Idéntico al estado normal** | 🎯 **La página no distingue: es la misma** |
| 🔴 `reduced-motion` | — | **Prácticamente idéntico** | Ver contrato abajo |

> 🎯 **El logro de esta página:** `default`, `sin JS` y `reduced-motion` **son casi el mismo estado.**
> No hay degradación porque **no hay nada de qué degradar.** Es la forma más honesta posible de construir una
> página — y resulta que también es la más rápida y la más citable. **Cuando eso pasa, es que la decisión era
> correcta por más de una razón.**

## Transition Specs

```
Escala de duración:   150 ms  (y no hace falta más — no hay entradas ni salidas)
                      La escala completa del hub (75·150·200·300·400) se declara igual,
                      por coherencia de tokens, aunque acá SOLO se use 150.
Easing:               emphasized  cubic-bezier(0.2, 0, 0, 1)
Stagger:              🔴 NINGUNO. No hay nada que escalonar.
Propiedades animadas: 🔴 SOLO background-color y outline-color, en hover/focus.
                      🔴 Ni siquiera opacity ni transform — porque NADA entra ni sale.
```

🔴 **NUNCA** `transition: all`. **NUNCA** animar layout.

## Primitive & Token Mapping

- **Sitio público, no portal.** Tokens del portal (`motionCss`, `MOTION_EASE`) **NO aplican**.
- 🎯 **Se declaran las mismas CSS custom properties que el pillar** (`--gh-hs-dur-fast: 150ms`,
  `--gh-hs-ease: cubic-bezier(0.2,0,0,1)`) **aunque solo se use una.**
  **Un hub coherente declara el mismo vocabulario en las cinco páginas, aunque una lo use menos.**
- **Cero librerías. Cero IntersectionObserver. Idealmente, cero JavaScript de motion.**
- 🔴 **No tocar el header/footer/wrapper globales.**

## Reduced Motion Contract

```css
@media (prefers-reduced-motion: reduce) {
  /* Prácticamente no hay nada que apagar — ese es el punto. */
  /* 1. Los hovers de fila y de enlace se vuelven instantáneos (0 ms) */
  /* 2. El focus ring SÍ se mantiene (es accesibilidad, no decoración) */
  /* 3. scroll-behavior: auto */
}
```

🎯 **Bajo `reduced-motion` esta página es idéntica.** No se pierde ni una palabra, ni un límite, ni una fuente.
**Es la prueba de que el contenido nunca dependió del motion — porque nunca hubo motion del que depender.**

## Accessibility & Feedback

- **Focus ring visible** (contraste AA, ≥3:1) en: los **8 enlaces de fuente**, el CTA, y **el wrapper
  scrolleable de la tabla** (`tabindex="0"`).
- 🎯 **El estado `visited` de los enlaces de fuente se mantiene visible.** No es un detalle estético: quien
  audita ocho fuentes **necesita saber cuáles ya comprobó**. Es feedback real.
- 🔴 **Los enlaces externos se anuncian como externos** — icono + `aria-label`/texto, **no solo por color**
  (WCAG 1.4.1: el color nunca es el único portador de información).
- 🔴 **Ninguna información se transmite por movimiento.** En esta página es trivialmente cierto: **no hay
  movimiento.**
- 🔴 **Sin feedback de submit**, porque **no hay submit**. No hay form.

## Performance Guardrails

| Guardrail | Umbral | Por qué |
|---|---|---|
| **LCP** | 🎯 **< 1,5 s — el más estricto del sitio** | **La página es texto y una tabla.** Sin imágenes, sin video, sin widgets, sin form, sin librerías. **Si el LCP pasa de 1,5 s, alguien metió algo que la task prohíbe** |
| **INP** | **< 100 ms** | Solo hay hovers. **No hay ni un listener de scroll** |
| **CLS** | 🎯 **0** | **Nada entra, nada se revela, nada carga tarde.** Debería ser exactamente cero |
| Peso del JS | 🎯 **~0 KB — idealmente literal** | **La página objetivo no ejecuta JavaScript propio en absoluto** |
| 🎯 **HTML servido** | **Los 8 límites, sus 3 columnas, sus 8 fuentes** | **El guardrail que importa.** Todo lo demás es secundario |

> 🎯 **Esta debería ser la página más rápida de efeoncepro.com, y por un margen amplio.**
> El CWV acá **no es una métrica de UX: es un detector de violaciones del contrato.** Si sube, alguien metió un
> widget, un contador o un reveal — y hay que sacarlo.

## GVC / Micro Evidence

- **Capturas requeridas:** hero · 🎯 **la tabla de los 8 límites completa** · **R5 (seguridad)** ·
  **R6 (contrapeso)** · **reduced-motion (idéntica)** · **tarjetas en 390 px** · **hover + focus de una fila**.
- **Assertions:**
  - 🔴 **Nada entra con animación.** Ningún elemento arranca en `opacity: 0` / `translateY(...)`.
  - 🔴 **Ningún acordeón sobre los límites.** Ningún `<details>` que contenga un límite. Ningún `[hidden]`.
  - 🔴 **Sin JS: la página es idéntica** a la página con JS. *(Assertion de comparación literal.)*
  - Bajo `prefers-reduced-motion`: **idéntica**.
  - 🎯 **CLS = 0** en la carga completa.
  - **LCP < 1,5 s** y el elemento LCP **es texto**.
  - **No existe ningún `<form>`, sticky bar, pop-up ni exit-intent** en el DOM.
  - Focus ring visible al tabular los 8 enlaces de fuente; `visited` distinguible.
  - Los enlaces externos se anuncian **no solo por color**.

## Design Decision Log

- 🎯 **Decisión: el motion es un pasivo en esta página, no un activo.** Es el único caso del repo donde una
  animación **le resta al argumento**, no le suma. El lector es un escéptico profesional cuyo trabajo es
  **detectar cuándo le venden**: un reveal, una entrada o un contador **le confirman que somos lo que vino a
  evitar**. **Alternativa descartada:** *reveals por scroll estándar del hub* — es el default de las otras
  páginas y acá **contradice el texto de la propia página**.
- 🎯 **Decisión: los ocho límites están abiertos. Cero acordeón, ni siquiera `<details>`.** En un FAQ, el
  disclosure es cortesía. **En una página de límites, es ocultamiento** — y es exactamente la acusación que la
  página le hace al resto del mercado. Además, **un límite plegado es un límite que el LLM no ve** — y la
  citación es el activo. **Estética y estrategia coinciden.**
- 🎯 **Decisión: el CTA no se levanta al hover.** Un micro-lift **pide ser clicado**. Este CTA **no pide nada**:
  es una invitación que se puede ignorar sin costo, y su motion tiene que decir lo mismo que su copy.
  *(Es el detalle más pequeño de este documento y probablemente el más fiel a la tesis.)*
- **Decisión: el hover de fila y el `visited` de los enlaces se quedan.** No decoran: **resuelven problemas
  reales** — no perder la línea en una tabla de 8×3, y saber cuáles fuentes ya auditaste. Mapean a *Feedback*.
  **Todo lo que no mapea a uno de los 7 jobs, se cortó.**
- **Decisión: CWV como detector de violaciones.** Sin imágenes, sin JS, sin form: **debe ser la página más
  rápida del sitio.** Si no lo es, el contrato se rompió — y el guardrail lo caza antes que el review humano.

## Acceptance Checklist

- [ ] 🔴 **Nada entra con animación.** Sin reveals, sin entradas, sin stagger.
- [ ] 🔴 **Ningún límite detrás de un acordeón, un `<details>` o un `[hidden]`.** Los 8, abiertos.
- [ ] 🔴 **Ninguna cifra animada.** Cero contadores.
- [ ] 🎯 **La página con JS y sin JS son idénticas.** Bajo `reduced-motion`, también.
- [ ] El CTA **no tiene micro-lift**. No pide ser clicado.
- [ ] Solo se animan `background-color` y `outline-color`, en hover/focus. Sin `transition: all`.
- [ ] CWV: **LCP < 1,5 s (texto)** · INP < 100 ms · 🎯 **CLS = 0**.
- [ ] **~0 KB de JS.** Cero librerías. Sin tocar header/footer globales.
- [ ] Focus ring en los 8 enlaces de fuente + `visited` distinguible + externos anunciados sin depender del color.
- [ ] Los tokens de motion tienen **los mismos nombres y valores que el pillar** (coherencia del hub).
- [ ] GVC: tabla + reduced-motion + 390 px + hover/focus de fila, capturado **y mirado**.
