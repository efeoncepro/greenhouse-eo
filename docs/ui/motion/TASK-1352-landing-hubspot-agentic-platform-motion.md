# TASK-1352 — Landing HubSpot — Motion Contract

> **Reescrito desde cero el 2026-07-13.** La sección firma **ya no es el "stack agéntico" abstracto**
> (motion pesado, art direction bloqueante, alto riesgo de "AI slop") sino **el mapa dolor → Hub (R3)**:
> un artefacto **funcional**. El motion se vuelve **más simple, más barato y más honesto**.
> Fuente: **[PDR-006 reescrito](../../public-site/decisions/PDR-006-landing-hubspot-agentic-platform-posicionamiento.md)**
> + wireframe + flow.

## Meta

- Status: `draft`
- Owner task: `TASK-1352`
- Surface: **`efeoncepro.com/servicios/hubspot/`** (público, WordPress/Ohio; **301 desde
  `/servicios-contratar-hubspot/`** — [PDR-013](../../public-site/decisions/PDR-013-hub-hubspot-pillar-cluster-arquitectura.md))
- 🎯 **Este motion contract es el del pillar y es la BASE del hub.** Los 4 clusters (TASK-1401…1404) heredan
  esta escala, este easing y este contrato de `reduced-motion`. **Un hub que anima distinto en cada página no
  es un hub: es cinco páginas sueltas.**
- Motion primitive: **CSS + IntersectionObserver**. 🔴 **NO** los wrappers de motion del portal
  (`motionCss`/`MOTION_EASE` son del portal Greenhouse, no del sitio público).
- Tier: **restraint**. Una sola pieza con carácter (el mapa). Todo lo demás es reveal sobrio.

## Motion Brief

**El motion sirve al argumento, no lo decora.** La página existe para **quitar riesgo**; una animación
exuberante hace exactamente lo contrario: **le dice al comprador enterprise que estás vendiendo, no ayudando.**

**La única interacción con carácter es el mapa (R3)** — y su motion no es adorno: **es feedback de una
decisión** (*"elegí mi dolor y me respondiste"*). Ese es el momento emocional de la página.

🔴 **Regla dura:** si una animación no comunica un cambio de estado o una relación causal, **no va**.

## Motion Inventory

| # | Elemento | Motion | Duración | Justificación |
|---|---|---|---|---|
| 1 | **Hero (R1)** | Fade + rise sutil (16px) | 400ms | Entrada. Nada más |
| 2 | **Reveals por región** | Fade + rise (12px) al entrar en viewport | 300ms | Ritmo de lectura, no espectáculo |
| 3 | 🎯 **El mapa (R3) — expandir un dolor** | **Height auto + fade del contenido revelado** | **200ms** | **Feedback de decisión.** El único motion que *significa* algo |
| 4 | 🎯 **El mapa (R3) — colapsar el anterior** | Height + fade out | 150ms | Deja claro que **es una elección**, no una acumulación |
| 5 | **Hover/focus de los 7 dolores** | Micro-lift 2px + cambio de borde | 150ms | Afordancia: *"esto se puede tocar"* |
| 6 | **La cifra del waiver (R6)** | 🔴 **NINGUNO.** Es texto estático | — | 🔴 **Un contador animado renderiza `00` sin JS, y los crawlers de IA no lo ejecutan.** La cifra **tiene que estar en el HTML servido** |
| 7 | **CTAs** | Color + micro-lift + focus ring | 150ms | Estándar |
| 8 | **FAQ `<details>`** | Nativo del navegador | — | No reinventar |

🔴 **Prohibido:** hero-video autoplay · parallax · loops que distraen · contadores animados en cifras citables ·
"AI slop" (partículas, glows, gradientes animados sin significado).

## Microinteraction States — el mapa (R3)

| Estado | Visual | Motion |
|---|---|---|
| `idle` | Los 7 dolores listados. Ninguno expandido *(o el primero, por defecto)* | — |
| `hover` / `focus` | Micro-lift 2px, borde de acento, cursor pointer | 150ms ease-out |
| `expanded` | El dolor elegido muestra su **Hub + qué resuelve + a dónde lleva** | Height auto + fade in, **200ms** |
| `collapsing` | El anterior se cierra | Height + fade out, **150ms** |
| 🔴 `sin JS` | **TODOS expandidos, siempre.** Sin motion | **Estado por defecto del HTML** |
| 🔴 `reduced-motion` | **Todos expandidos y estáticos.** Sin height transitions, sin reveals | Ver contrato abajo |

> 🎯 **Que el `no-JS` y el `reduced-motion` converjan en "todo visible" no es casualidad: es la decisión.**
> El contenido nunca depende del motion. El motion solo **enriquece** una página que ya funciona entera.

## Transition Specs

```
Escala de duración:   75 · 150 · 200 · 300 · 400 ms
Easing:               ease-out  cubic-bezier(0.2, 0, 0, 1)
Stagger:              hero (60ms entre elementos) · los 7 dolores (40ms al revelar la lista)
Propiedades animadas: 🔴 SOLO opacity y transform  (compositor-only)
                      Excepción única: height del mapa (necesaria; acotada a un contenedor chico)
```

🔴 **NUNCA** animar `width`, `top`, `left`, `margin` ni `box-shadow` → layout thrash.

## Primitive & Token Mapping

- **Sitio público, no portal.** Los tokens de motion del portal (`motionCss`, `MOTION_EASE`) **NO aplican acá**.
- Se declara la escala arriba como **CSS custom properties page-scoped**
  (`--gh-hs-dur-fast: 150ms`, `--gh-hs-ease: cubic-bezier(0.2,0,0,1)`, …).
- **Sin librerías de animación.** CSS + IntersectionObserver. **Cero GSAP, cero Framer.**
- 🔴 **No tocar el header/footer/wrapper globales** por un problema de motion local.

## Reduced Motion Contract

```css
@media (prefers-reduced-motion: reduce) {
  /* 1. Sin reveals: todo visible desde el inicio */
  /* 2. El mapa (R3): los 7 dolores EXPANDIDOS y estáticos */
  /* 3. Sin height transitions, sin fades, sin micro-lifts */
  /* 4. El focus ring SÍ se mantiene (es accesibilidad, no decoración) */
}
```

🔴 **Bajo `reduced-motion` no se pierde ni una palabra de contenido.** El mapa se convierte en lo que
siempre fue por debajo: **una lista completa de los 7 dolores y sus Hubs.**

## Accessibility & Feedback

- **Focus ring visible** (contraste AA) en los 7 controles del mapa, CTAs, `<summary>` y campos.
- `aria-expanded` en cada control del mapa; el panel revelado es su `aria-controls`.
- 🔴 **El motion nunca es el único indicador de estado.** El dolor expandido se distingue también por
  **texto + posición + borde**, no solo por la animación.
- El feedback del submit (éxito/error) lo maneja el renderer del form (TASK-1320) — **no se replica acá**.

## Performance Guardrails

| Guardrail | Umbral | Por qué |
|---|---|---|
| **LCP** | **< 2,5 s** | El hero es texto + una imagen. **No hay video ni canvas** |
| **INP** | **< 200 ms** | El mapa es CSS + un listener. Trivial |
| **CLS** | **< 0,1** | 🔴 El mapa **reserva su altura**: expandir **no empuja** el resto de la página |
| Peso del motion | **~0 KB de JS de librería** | CSS + IntersectionObserver nativo |

> 🎯 **Esta es una de las ganancias de haber matado el "stack agéntico":** aquella sección firma amenazaba
> LCP/INP con SVG animado o una island, y su art direction bloqueaba `UI ready`.
> **El mapa cuesta prácticamente cero y hace más.**

## GVC / Micro Evidence

- **Capturas requeridas:** el mapa en **2+ estados** (un dolor expandido → otro expandido) · hero ·
  **reduced-motion (todo expandido, estático)** · before/after.
- **Assertions:**
  - El mapa se expande/colapsa en default; **queda expandido y estático** bajo `prefers-reduced-motion`.
  - 🔴 **Sin JS: los 7 dolores visibles** (assertion compartida con el flow).
  - 🔴 **La cifra del waiver NO es un contador animado** — está en el HTML servido.
  - CLS < 0,1 al expandir un dolor (no empuja layout).
  - Focus ring visible al navegar el mapa por teclado.

## Design Decision Log

- **Decisión:** motion **tier restraint**. Una sola pieza con carácter — **el mapa (R3)** — y su animación
  **significa algo**: es el feedback de una decisión del usuario.
- **Alternativas descartadas:**
  - *Sección firma "stack agéntico" animada (SVG/island)* — **motion pesado sin significado**, riesgo real de
    "AI slop", amenaza a CWV, y **su art direction bloqueaba `UI ready`**. **El mapa hace el mismo
    show-don't-tell, cuesta cero y además sirve.**
  - *Contadores animados en las cifras* — 🔴 **rompen la citabilidad por motores de respuesta** (renderizan
    `00` sin JS). Es exactamente el bug que tiene la página viva.
  - *GSAP / Framer* — innecesario. CSS + IntersectionObserver alcanza.
- **Por qué:** la página existe para **quitar riesgo**. Una animación exuberante le dice al comprador enterprise
  *"te estoy vendiendo"*. **El restraint ES el mensaje.**

## Acceptance Checklist

- [ ] Motion tier **restraint**: solo el mapa tiene carácter; el resto son reveals sobrios.
- [ ] 🔴 **Ninguna cifra citable es un contador animado.**
- [ ] `prefers-reduced-motion` → **todo el contenido visible y estático**, sin pérdida.
- [ ] **Sin JS → los 7 dolores visibles.**
- [ ] Solo se animan `opacity` y `transform` *(única excepción: la altura del mapa, acotada)*.
- [ ] CWV: LCP < 2,5 s · INP < 200 ms · **CLS < 0,1 al expandir**.
- [ ] Cero librerías de animación. Sin tocar header/footer globales.
- [ ] GVC: el mapa en 2+ estados + reduced-motion + before/after, capturado **y mirado**.
