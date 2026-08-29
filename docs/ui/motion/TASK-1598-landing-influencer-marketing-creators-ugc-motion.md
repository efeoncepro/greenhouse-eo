# TASK-1598 — Landing Influencer Marketing — Motion Contract

## Meta

- Status: `implemented`
- Owner task: `TASK-1598`
- Motion: `microinteraction` + `scroll`; una sección firma acotada.
- Primitive: CSS/IntersectionObserver del sitio público; no wrappers del portal.

## Intent

La motion debe explicar trazabilidad y ritmo de contenido, no decorar un catálogo de influencers. El visitante debe
entender la transición `fit → contenido → derechos → distribución → aprendizaje`.

## Inventory

| Elemento | Comportamiento | Fallback |
|---|---|---|
| Hero | fade/rise breve | visible al cargar |
| Mecanismo | reveal por sección | visible al cargar |
| Ofertas | stagger corto | stack estático |
| Sección firma | versiones/rights/asset flow con movimiento acotado | storyboard estático |
| CTAs | hover/focus micro-lift | color + focus |
| FAQ | disclosure nativo | `<details>` operable |

## Guardrails

- Animar sólo `transform` y `opacity`.
- Pausar fuera de viewport.
- No autoplay de audio ni hero video pesado.
- En 390px reducir densidad y peso; preferir imágenes/posters si video afecta CWV.
- `prefers-reduced-motion` elimina reveals, drift y smooth scroll sin quitar significado.
- Focus, error y estado del form no dependen de motion.

## Evidence

Scenario `public-servicios-influencer-marketing`: first fold, sección firma en dos frames, hover/focus, FAQ, form y
reduced-motion en 1440/390. Validar `scrollWidth === clientWidth` y consola limpia.
