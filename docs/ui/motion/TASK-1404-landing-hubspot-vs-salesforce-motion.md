# TASK-1404 — `/servicios/hubspot/hubspot-vs-salesforce/` — Motion Contract

> Cluster 4 de 4 del hub HubSpot. **Hereda el motion contract del pillar (TASK-1352)**: misma escala, mismo
> easing, mismo contrato de `reduced-motion`.
>
> 🎯 **El riesgo de motion acá tiene nombre: el registro "versus".** Una página que compara dos productos
> **pide a gritos** un tratamiento de combate — barras que crecen, cifras que suben, dos columnas que entran
> desde los lados. 🔴 **Todo eso está prohibido, y no por gusto: es lo que convierte un informe en un folleto de
> guerra — y un folleto de guerra no le sirve a un comité.**

## Meta

- Status: `draft`
- Owner task: `TASK-1404`
- Surface: `efeoncepro.com/servicios/hubspot/hubspot-vs-salesforce/` (público, WordPress/Ohio)
- Motion primitive: **CSS + IntersectionObserver.** 🔴 **NO** los wrappers del portal.
  **Cero GSAP, cero Motion, cero librerías, cero charts animados.**
- Tier: **restraint.** **Ninguna pieza con carácter.** *(Como `/precios/` y `/cuando-no-usar-hubspot/`: las tres
  páginas "de evidencia" del hub comparten la misma severidad.)*

## Motion Brief

**Esta página se ve como un informe. Porque lo es.**

El lector es un **comité que va a auditar cada número** — y que **va a mostrarle esta página a su directorio**.
Su modo mental es *escrutinio*, no *descubrimiento*. En ese modo:

- una **barra que crece** hasta 611k **no informa: dramatiza** — y le dice al CFO *"te estoy vendiendo"*;
- un **contador** que sube hasta el 17% le **pide asombro a un dato que solo quiere ser verificado**;
- dos **columnas entrando desde los lados** convierten un análisis en **un ring de boxeo**;
- y cualquiera de las tres **le regala al AE de Salesforce la frase**: *"mira el show que te montaron"*.

🔴 **La regla dura:**

> ## Ninguna cifra de esta página se anima. Ninguna comparación se "escenifica".
> **El TCO es una tabla. No un gráfico animado. No un chart. Una tabla.**
> Si un `fetch` sin JavaScript no ve el número **y sus supuestos**, la página no cumple.

Y hay una segunda razón, específica de esta página y **más grave que la estética**:
🔴 **una animación que hace que un número aparezca antes que sus supuestos es, literalmente, la manipulación que
la página denuncia.** Si la barra de "611k" crece antes de que el lector haya leído *"30 usuarios, lista sin
descuento"*, **estamos haciendo exactamente lo que criticamos de los otros partners.**

**El motion, acá, es un riesgo de integridad — no solo de gusto.**

## Motion Inventory

| # | Elemento | Motion | Duración | Job (de los 7) | Justificación |
|---|---|---|---|---|---|
| 1 | **Hero (R1)** | Fade + rise (16 px) | **400 ms** | Jerarquía | Entrada sobria. **Sin logos, sin "vs" animado** |
| 2 | **Reveals por región** | Fade + rise (12 px) al entrar en viewport | **300 ms** | Jerarquía | Ritmo de lectura. **El contenido ya está en el HTML** |
| 3 | 🔴 **El TCO (R3)** | **NINGUNO.** Tabla estática | — | — | 🔴 **Nada de barras que crecen, charts, o números que suben.** 🎯 **Y jamás el número antes que sus supuestos** |
| 4 | 🔴 **La frase del admin (R3)** | **NINGUNO.** Texto | — | — | 🔴 Es **la frase más importante de la página**. Aparece con la región, **no después de un "efecto"** |
| 5 | 🔴 **R4 y R5** (dónde gana cada uno) | 🔴 **Entran JUNTAS, con el mismo reveal, en el mismo instante** | **300 ms** | Jerarquía | 🎯 **Si "dónde gana Salesforce" entra después, con menos gracia o con menos peso, la honestidad era decorativa.** **El motion tiene que ser tan simétrico como el layout** |
| 6 | **Filas de la tabla** | Hover (fondo sutil) | **150 ms** | Feedback | Ayuda a leer una tabla comparativa. **No decora: funciona** |
| 7 | **CTAs** | Color + micro-lift (2 px) + focus ring | **150 ms** | Feedback | Estándar del hub |
| 8 | **FAQ `<details>`** | Nativo | — | State transition | No reinventar |
| 9 | **Anchor scroll a `#tco`** | `scroll-behavior: smooth` + **focus** al H2 | — | Wayfinding | 🔴 **Focus, no solo scroll** |

🔴 **Prohibido, literal:** barras que crecen · charts animados · contadores · números que suben ·
columnas que entran desde los lados · transiciones "versus" · flip cards · toggles de comparación con animación ·
🔴 **cualquier motion que haga aparecer una cifra ANTES que sus supuestos.**

## Microinteraction States — la simetría de R4 / R5

| Estado | R4 (*dónde gana Salesforce*) | R5 (*dónde gana HubSpot*) |
|---|---|---|
| `idle` | En el DOM, con el mismo peso tipográfico | Idem |
| `entering` | Fade + rise 12 px · **300 ms** | 🔴 **Exactamente lo mismo, al mismo tiempo** |
| `hover` (filas) | Fondo tonal sutil · 150 ms | Idem |
| 🔴 **Stagger entre las dos** | 🔴 **CERO.** No hay orden. **Entran juntas** | 🔴 **CERO** |
| 🔴 `sin JS` | **Ambas visibles** | **Ambas visibles** |
| 🔴 `reduced-motion` | **Ambas visibles, estáticas** | **Ambas visibles, estáticas** |

> 🎯 **Esto parece un detalle y es el corazón del contrato.** Si R5 (donde ganamos nosotros) entra **primero**,
> o con un stagger más vistoso, o con un fondo más cálido, **el lector lo percibe aunque no sepa nombrarlo** —
> y todo lo que la página construyó con el Magic Quadrant **se desarma en un gesto.**
>
> **La simetría del motion es la prueba de que la simetría del contenido era en serio.**
> Y hay una **assertion GVC que la verifica**, porque *"confiamos en que quedó parejo"* **no es un contrato.**

## Transition Specs

```
Escala de duración:   150 · 300 · 400 ms                    (heredada del pillar)
Easing:               emphasized  cubic-bezier(0.2, 0, 0, 1)
Stagger:              hero (60 ms).
                      🔴 ENTRE R4 y R5: CERO. Entran juntas, sin orden.
Propiedades animadas: 🔴 SOLO opacity y transform  (compositor-only)
                      🔴 Ninguna excepción. Sin width (las barras viven ahí). Sin height.
```

🔴 **NUNCA** animar `width` — **es literalmente cómo se construye una barra comparativa que crece**, y es lo
primero que un diseñador va a intentar en esta página. **No.**
🔴 **NUNCA** `transition: all`.

## Primitive & Token Mapping

- **Sitio público, no portal.** Tokens del portal (`motionCss`, `MOTION_EASE`) **NO aplican**.
- **Las mismas CSS custom properties que el pillar**, con los mismos valores
  (`--gh-hs-dur-fast: 150ms` · `--gh-hs-dur-base: 300ms` · `--gh-hs-ease: cubic-bezier(0.2,0,0,1)`).
- **Sin librerías. Sin librería de charts.** 🔴 **Si aparece un `<canvas>` o un ECharts/Apex en esta página,
  el contrato se rompió** *(y además sería la primera vez que el sitio público importa una librería de charts —
  una señal fuerte de que algo se salió del carril)*.
- 🔴 **No tocar el header/footer/wrapper globales.**

## Reduced Motion Contract

```css
@media (prefers-reduced-motion: reduce) {
  /* 1. Sin reveals: todas las regiones visibles desde el inicio */
  /* 2. R4 y R5: ambas visibles y estáticas (la simetría se preserva trivialmente) */
  /* 3. El hover de fila se vuelve instantáneo */
  /* 4. El focus ring SÍ se mantiene */
  /* 5. scroll-behavior: auto (el focus al destino se mantiene) */
}
```

🔴 **Bajo `reduced-motion` no se pierde ni una cifra, ni un supuesto, ni la frase del admin.**
🎯 **La página ya era, por debajo, exactamente lo que se ve: un informe.**

## Accessibility & Feedback

- **Focus ring visible** (contraste AA, ≥3:1) en CTAs, `<summary>`, enlaces, campos y **el wrapper scrolleable
  de la tabla del TCO**.
- 🔴 **El ganador de cada fila comparativa va escrito, no solo por color.** Verde/rojo es el patrón por defecto
  de toda tabla comparativa **y deja al usuario daltónico fuera del argumento central** (WCAG 1.4.1).
  🎯 **En una página cuyo producto es la exactitud, un dato que solo existe en un color es un dato perdido.**
- 🔴 **Los supuestos del TCO están en el `<caption>`** — un lector de pantalla los recibe **antes** que los
  números. 🎯 **Es la misma regla que la de motion, en otra capa: el número nunca llega antes que su contexto.**
- 🔴 **Ninguna información se transmite por movimiento** (WCAG 1.4.13).
- El feedback del submit lo maneja el renderer del form (TASK-1320).

## Performance Guardrails

| Guardrail | Umbral | Por qué |
|---|---|---|
| **LCP** | **< 2,0 s** | El hero es texto. Sin logos, sin imágenes, sin charts |
| **INP** | **< 200 ms** | Un IntersectionObserver y un `<details>` |
| **CLS** | **< 0,05** | 🔴 Nada crece, nada se revela con cambio de tamaño |
| Peso del motion | **~0 KB de JS de librería** | CSS + IntersectionObserver |
| 🎯 **Librerías de charts** | 🔴 **0** | **Si aparece una, el contrato se rompió.** El TCO **es una tabla** |

> 🎯 **Test del revisor:** si al abrir la página la primera reacción es *"qué bien se ve la comparación"*,
> **hay que preguntarse qué se animó.** La reacción objetivo es **"esto parece un informe serio"**.
> 🔴 **Y el test decisivo: ¿puede el AE de Salesforce decir "mira el show que te montaron"?**
> **Si sí, sobra motion.**

## GVC / Micro Evidence

- **Capturas requeridas:** hero · **R2 (Gartner)** · 🎯 **el TCO completo con supuestos y la frase del admin** ·
  🎯 **R4 y R5 lado a lado (verificar simetría)** · **reduced-motion** · **tarjetas en 390 px** · hover de fila.
- **Assertions:**
  - 🔴 **Ninguna cifra es un contador** — ningún elemento numérico arranca en `0` y sube.
  - 🔴 **No existe ninguna barra que crezca** — **ningún elemento anima `width` o `height`.**
  - 🔴 **No existe `<canvas>` ni ninguna librería de charts** en la página.
  - 🎯 **R4 y R5 entran al mismo tiempo, con el mismo `transition-delay` y el mismo `font-size` de encabezado**
    *(la simetría, verificada — no asumida)*.
  - 🔴 **Sin JS:** el TCO, sus supuestos, la frase del admin y R4 están en el HTML servido.
  - Bajo `prefers-reduced-motion`: **todo visible y estático**, sin pérdida.
  - **CLS < 0,05** · **LCP < 2,0 s** (elemento LCP = texto).
  - **El ganador de cada fila está escrito**, no solo por color.
  - Solo se animan `opacity` y `transform` (auditable en DevTools → Layers).

## Design Decision Log

- 🎯 **Decisión: el motion acá es un riesgo de integridad, no de gusto.** Es el único caso del hub donde una
  animación puede volverse **la manipulación que la página denuncia**: si el número "611k" aparece con un efecto
  **antes de que el lector haya leído los supuestos**, estamos haciendo exactamente lo que le criticamos a los
  otros partners. **El orden de aparición es un compromiso ético, no una preferencia de timing.**
- 🔴 **Decisión: el TCO es una tabla, no un gráfico.** **Alternativa descartada:** *barras comparativas animadas*
  — es lo primero que haría cualquier diseñador, **se ve espectacular**, y (a) dramatiza en vez de informar,
  (b) anima `width` (layout thrash), (c) **borra el número para el crawler**, y (d) **le regala al AE de
  Salesforce la línea *"mira el show que te montaron"***. **Cuatro razones independientes apuntando al mismo
  lado: la decisión estaba tomada.**
- 🎯 **Decisión: R4 y R5 entran juntas, con stagger CERO — y hay una assertion que lo verifica.** Si la sección
  *"dónde gana Salesforce"* entra después, o con menos gracia, **el lector percibe el sesgo aunque no sepa
  nombrarlo**, y todo lo que la página construyó con el Magic Quadrant **se desarma en un gesto**.
  🎯 **La simetría del motion es la prueba de que la simetría del contenido era en serio.**
  *(Es la decisión más pequeña de este documento y probablemente la más fiel a la tesis del hub.)*
- 🔴 **Decisión: prohibido animar `width`.** No es una regla genérica de performance: **es que animar `width` es
  literalmente cómo se construye la barra comparativa que esta página no puede tener.**
- **Decisión: cero librerías de charts.** Si aparece un `<canvas>` o un ECharts en el sitio público, **es la
  señal más fuerte de que algo se salió del carril** — el sitio público nunca ha necesitado uno.
- **Decisión: el test del revisor es la pregunta del AE de Salesforce.** *"¿Puede decir 'mira el show que te
  montaron'?"* **Si sí, sobra motion.** Los umbrales numéricos no atrapan una barra bonita; **esa pregunta, sí.**

## Acceptance Checklist

- [ ] 🔴 **Ninguna cifra animada. Ninguna barra que crece. Ningún chart.** El TCO es una **tabla**.
- [ ] 🔴 **Ningún elemento anima `width` o `height`.** Solo `opacity` y `transform`.
- [ ] 🎯 **R4 y R5 entran juntas** (stagger cero) **con el mismo peso tipográfico** *(assertion verificada)*.
- [ ] 🔴 **Ninguna cifra aparece antes que sus supuestos** — ni visualmente, ni en el DOM, ni para el lector de
      pantalla (`<caption>`).
- [ ] 🔴 **Sin JS:** TCO + supuestos + frase del admin + R4 en el HTML servido.
- [ ] `prefers-reduced-motion` → **todo visible y estático**, sin pérdida.
- [ ] **Cero librerías** (de animación **y** de charts). **~0 KB.** Sin tocar header/footer globales.
- [ ] CWV: LCP < 2,0 s (texto) · INP < 200 ms · **CLS < 0,05**.
- [ ] El ganador de cada fila va **escrito**, no solo por color. Focus ring en toda la cadena de tabulación.
- [ ] Los tokens de motion tienen **los mismos nombres y valores que el pillar**.
- [ ] 🎯 **Test del AE:** al mirar la página, **no puede decir "mira el show que te montaron"**.
- [ ] GVC: TCO + R4/R5 lado a lado + reduced-motion, capturado **y mirado**.
