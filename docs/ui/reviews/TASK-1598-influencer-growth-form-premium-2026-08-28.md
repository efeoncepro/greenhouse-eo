# TASK-1598 — Growth Form premium review — 2026-08-28

Canonical reusable pattern: [Growth Form — Editorial Premium Brief Style V1](../GROWTH_FORM_EDITORIAL_PREMIUM_BRIEF_STYLE_V1.md).

## Verdict

`PASS` — average `4.68/5`; every dimension ≥4, critical dimensions ≥4.5. Runtime reviewed after the governed
Elementor save at 1440, 890 and 390 px. Form submission was not exercised with PII; empty-submit validation produced
six local errors and an accessible focused summary without a POST to the Growth Forms API.

## Evidence

- Full landing gate: `.captures/task1598-influencer-fidelity-2026-08-29T02-22-01-382Z/`.
- Focused form captures: `.captures/task1598-form-premium-live-2026-08-29T0206Z/`.
- Live URL: `https://efeoncepro.com/servicios/agencia-de-influencers/`.
- Viewports: `1536×911`, `1440×1000`, `890×911`, `390×844`; reduced motion separately verified.

## Scorecard

| Dimension                   | Score | Evidence                                                                                              |
| --------------------------- | ----: | ----------------------------------------------------------------------------------------------------- |
| Hierarchy                   |   4.8 | Eyebrow → title → context → trust → fields → full-width submit reads immediately.                     |
| Proportions/composition     |   4.7 | Dominant single card balances the sticky editorial intro; 28 px desktop / 22 px mobile radius.        |
| Spacing/rhythm              |   4.7 | 20–24 px field rhythm, tight label proximity and clear section breaks.                                |
| Information density         |   4.4 | Seven governed groups remain long on mobile, but progressive spacing and helpers keep scanning clear. |
| Depth/surface model         |   4.7 | One principal paper, restrained shadow and one justified legal sub-surface.                           |
| Surface economy             |   4.7 | No card soup; the governed meeting CTA remains a separate alternative below the form.                 |
| Visual impact               |   4.6 | Thin blue→green signature edge, restrained radial tint and confident white-on-Midnight contrast.      |
| Typography                  |   4.7 | Poppins only for the host title; Geist for controls; minimum 16 px input text.                        |
| Color/contrast              |   4.7 | Neutral controls, blue functional state, green only as supporting brand accent; focus uses 3 px ring. |
| Iconography                 |   4.8 | Six semantic line icons plus trust/time icons; no decorative disks or mixed families.                 |
| Responsive transformation   |   4.7 | Related pairs on wide containers, single column at 890/390, full-width action and no overflow.        |
| Motion/microinteractions    |   4.5 | Focus, hover and submit lift are causal and disabled under reduced motion.                            |
| Source fidelity             |   4.7 | Preserves Claude Design composition, brand roles and conversion hierarchy while upgrading form craft. |
| Generic-template resistance |   4.8 | Editorial chrome and creator-specific cues avoid a generic SaaS/contact-form treatment.               |

## Functional/a11y checks

- `<greenhouse-form>` registers and mounts seven groups plus submit; host fallback disappears after mount.
- Six visible labels keep explicit input association; icons are decorative and never replace text.
- Inputs are 56 px high with 16 px text; keyboard focus has a 3 px outline plus border/shadow change.
- Empty submit creates six inline errors and focuses the accessible summary; no Growth Forms submission occurs.
- Consent remains an actual checkbox with visible text and the human-readable privacy link `Consulta nuestra Política de privacidad`.
- Los selects usan combobox/listbox renderer-owned con `aria-expanded`, `aria-controls`, teclado completo y overlay;
  no dependen del popup nativo del sistema operativo.
- Growth CTA opens the native `discovery` scheduler dialog; no HubSpot URL is exposed and no booking was created.
- `scrollWidth === clientWidth` at every gated viewport; reduced-motion reaches the same final state.

## Remaining risk

The form remains intentionally long because the published contract collects the minimum operational brief. Further
shortening requires a new governed form version and commercial validation, not a visual-only WordPress change.

## Refinement addendum · 2026-08-29

El icono de `activationType` pasó de sparkle decorativo a megáfono semántico. El campo `objective` conserva label y
textarea a ancho completo, pero ubica helper y contador en una sola fila inmediatamente posterior: 8 px de separación,
alineación superior compartida y contador anclado al borde derecho. El gate live verifica ambas decisiones en
1536/1440/890/390; no se alteraron campos, validación, consentimiento, destino o tracking. Evidencia:
`.captures/task1598-influencer-fidelity-2026-08-29T11-00-28-401Z/`.

## Dock addendum · 2026-08-29

El dock fija la jerarquía de conversión sin repetir el peso de la barra global: superficie Midnight contenida, borde
fino, safe-area y targets de 48 px. Reunión conserva fill verde; brief usa contorno e icono `arrow-up-right`. La
captura live confirma clipping cero y composición compacta en escritorio y móvil:
`.captures/task1598-influencer-fidelity-2026-08-29T11-08-21-257Z/`.

## Semantic select addendum · 2026-08-29

`market` y `activationType` usan el variant `diagnostic_premium` publicado como Growth Form v2. Las opciones
incorporan 11 marcas semánticas coherentes, check separado y targets ≥46 px. CL/CO/MX/PE evolucionaron de siglas a
SVG circulares locales de `circle-flags`, visibles en la lista y en el valor seleccionado, con centrado vertical
explícito, outline nítido y sin sombra difusa; región/ubicación y los
tipos de activación conservan pictogramas tonales. El renderer mantiene valor, teclado, ARIA, overlay y submit; la
landing sólo aporta piel iconográfica. El submit usa `primary` azul Efeonce con blanco, sin introducir teal. El gate
live abre y selecciona ambos listbox en 1536/1440/1414/890/390, verifica flags, stacking, contraste, clipping y
reduced motion. Evidencia: `.captures/task1598-influencer-fidelity-2026-08-29T12-26-32-586Z/`.

## Typography hierarchy addendum · 2026-08-29

El encabezado reemplaza sparkle por documento y normaliza el sistema tipográfico completo: overline Geist 600/12 px,
título Poppins 700 con line-height 1.2, explicación/trust Geist 400 con line-height ≥1.5, labels y submit Geist 600,
ayudas/contador Geist 400 e inputs de 16 px. Se retiró el peso 650. El gate mide familias, tamaños, pesos, alturas de
línea e icono en cinco viewports, incluida la medida reportada de 1414 px. Evidencia:
`.captures/task1598-influencer-fidelity-2026-08-29T11-40-22-681Z/`.
