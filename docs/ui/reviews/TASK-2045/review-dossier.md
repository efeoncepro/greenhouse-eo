# TASK-2045 — Dossier de revisión visual: popup «Quiero ser partner»

> Revisado: 2026-10-23 por Claude (frames mirados). Superficie: renderers públicos `<greenhouse-cta>` (diálogo de
> `open_growth_form`) y `<greenhouse-form>`, fuera del portal. Referencia: canvas «Partners — Efeonce» v14.

## Cómo se obtuvo

- Harness local con los renderers reales (mismo código que se bundlea a `renderer-latest.js`), el contrato fixture
  `partnerApplicationContractFixture` + `CTA_FIXTURES.partnerDialog` y la piel
  `scripts/public-website/partners-source/partner-dialog-skin.css` (sólo tokens y hooks públicos).
- Canvas renderizado con el popup abierto. Medición por `getBoundingClientRect` con animaciones congeladas y capturas
  Playwright (`docs/ui/reviews/TASK-2045/*.png`).
- GVC del portal no aplica: la superficie no es una ruta `(dashboard)`. El gate `ui:visual-gate` exige un escenario
  GVC y queda BLOCK por esa razón (ver la task).

## Medidas a 1440 × 900 (relativas a la tarjeta)

| Elemento | Canvas | Renderer | Δ |
|---|---|---|---|
| Tarjeta | 640 × 728 | 640 × 728–729 | 0–1 |
| Título | y 81, h 46 | y 81, h 46 | 0 |
| Etiquetas (5) | y 238/332/427, h 20 | igual | 0 |
| Campos fila 1–2 | 265 × 49 en y 265 / 360 | igual | 0 |
| Textarea | 550 × 96 en y 454 | igual | 0 |
| Casilla | x 49, y 571, 18 × 18 | igual | 0 |
| Botón | y 633, 227 × 54 | y 633, 229 × 54 | 2 (ancho) |
| Cerrar (×) | 44 × 44 en (579, 17) | igual | 0 |

## 390 × 844

Hoja inferior (`data-sheet`), una columna (`half` colapsa), scroll interno de la tarjeta, `scrollWidth == 390`. Foco
inicial en «Nombre y apellido».

## Comportamiento verificado en el harness

Montaje al abrir (antes no existe `<greenhouse-form>`), foco al primer campo, scroll del documento bloqueado y
restaurado, Escape bloqueado durante el envío (`data-ghf-busy`), éxito con la órbita y sin encabezado del diálogo,
«Cerrar» (`ghf:dismiss`) cierra y devuelve el foco a «Quiero ser partner», telemetría `activation_mode: dialog`.

## Deuda conocida

- El foco programático del «Recibido» muestra el anillo de foco cuando el envío se dispara por teclado o script; se
  mantiene por accesibilidad.
- Safari antiguo sin `@starting-style`: abre y cierra sin animación (fallback declarado en el motion).
