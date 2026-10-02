# CMP-004 — CTA en el conjunto de la composición

Fecha: 2026-09-25. Exploración de color; no aprobada. Comando y gates sin modificar.

Se conserva la composición de la comparación tipográfica. Sólo cambian el color del borde del CTA, sus IDs y la justificación. Tinta y contorno usan el token existente `inkOnDark` (#ffffff).

La hipótesis para esta familia de fotos es distinguir la acción mediante luminancia y contorno, conservando los acentos de color en la escena. No establece el blanco como default para futuras campañas.

[Plan editable](neutros.json) · [Salida del gate](gate.log) · [Análisis del sistema](../../../docs/audits/social/2026-09-25-cmp004-typography-grouping-review.md)

## C01

Contorno neutro conectado al titular y a las superficies claras. El azul y lima permanecen en el sistema de marca demostrado; el CTA no añade un tercer acento naranja.

| Antes | Exploración neutra |
| --- | --- |
| ![CTA anterior C01](../analysis-typography-2026-09-25/out/preview-390/C01-frase-completa-compacta.png) | ![CTA neutro C01](out/preview-390/C01-CTA-neutro.png) |

[Abrir máster](out/C01-CTA-neutro.png)

## C02

Contorno neutro conectado al objeto y la arquitectura clara. Elimina el verde ajeno a una escena azul, blanca y con luz naranja localizada.

| Antes | Exploración neutra |
| --- | --- |
| ![CTA anterior C02](../analysis-typography-2026-09-25/out/preview-390/C02-frase-completa-compacta.png) | ![CTA neutro C02](out/preview-390/C02-CTA-neutro.png) |

[Abrir máster](out/C02-CTA-neutro.png)

## C03

Contorno neutro que permite conservar el ámbar en el perfume y la luz como protagonista. El CTA se distingue por luminancia y delimitación.

| Antes | Exploración neutra |
| --- | --- |
| ![CTA anterior C03](../analysis-typography-2026-09-25/out/preview-390/C03-frase-completa-compacta.png) | ![CTA neutro C03](out/preview-390/C03-CTA-neutro.png) |

[Abrir máster](out/C03-CTA-neutro.png)

## C04

Contorno neutro coherente con la familia editorial de campaña. El azul de las aplicaciones conserva su papel; la acción no introduce otro acento saturado.

| Antes | Exploración neutra |
| --- | --- |
| ![CTA anterior C04](../analysis-typography-2026-09-25/out/preview-390/C04-frase-completa-compacta.png) | ![CTA neutro C04](out/preview-390/C04-CTA-neutro.png) |

[Abrir máster](out/C04-CTA-neutro.png)

## Estado

Inspección visual de las cuatro piezas a 390 px. El comando produce las alternativas con tokens existentes. El gate tiene una lista fija de acentos (naranja, lima y naranja oscuro), que rechaza el contorno blanco por política. No se añadió una excepción ni se desactivó la regla. Consultar `gate.log` para el resultado completo.

La mejora del sistema requiere separar paleta autorizada, contraste sobre píxeles y decisión de armonía en la composición. La pertenencia a una lista de colores y un ratio de contraste no pueden certificar por sí solos esa armonía.
