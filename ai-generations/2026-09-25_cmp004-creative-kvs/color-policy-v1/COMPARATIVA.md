# CMP-004 — Política cromática aplicada

Cuatro candidatas 4:5 a 1152 × 1440. El método está implementado; la aprobación creativa de estas piezas está pendiente. La revisión de color no certifica el desarrollo completo de la campaña.

[Política central](../../../docs/campaigns/policies/CMP-004-color-v1.json) · [Plan editable](piezas.json) · [Gate por reproducción](gate.log) · [Pruebas negativas](integration-verification.json)

Se conserva titular y espaciado de la comparación tipográfica. La política optativa determina los tratamientos autorizados; el comando no elige ni cambia el color por su cuenta.

## C01 — editorial-outline

La escena ya combina azul y lima; un contorno neutro conecta con el titular sin agregar naranja.

Estrategia: `neutral`. Tratamiento: `outline`. Contraste del texto CTA: 16.08:1.

| Tratamiento anterior | Candidata contextual |
| --- | --- |
| ![Antes C01](../analysis-typography-2026-09-25/out/preview-390/C01-frase-completa-compacta.png) | ![Candidata C01](out/preview-390/C01-color-policy-v1.png) |

[Abrir máster C01](out/C01-color-policy-v1.png)

## C02 — scene-light-solid

El relleno claro retoma la arquitectura y el objeto blanco, con tinta azul relacionada con las pantallas; sustituye el verde ajeno.

Estrategia: `scene-related`. Tratamiento: `solid`. Contraste del texto CTA: 14.89:1.

| Tratamiento anterior | Candidata contextual |
| --- | --- |
| ![Antes C02](../analysis-typography-2026-09-25/out/preview-390/C02-frase-completa-compacta.png) | ![Candidata C02](out/preview-390/C02-color-policy-v1.png) |

[Abrir máster C02](out/C02-color-policy-v1.png)

## C03 — editorial-outline

El ámbar del perfume y la luz conserva el protagonismo; el contorno neutro identifica la acción sin repetir un acento cálido saturado.

Estrategia: `neutral`. Tratamiento: `outline`. Contraste del texto CTA: 15.8:1.

| Tratamiento anterior | Candidata contextual |
| --- | --- |
| ![Antes C03](../analysis-typography-2026-09-25/out/preview-390/C03-frase-completa-compacta.png) | ![Candidata C03](out/preview-390/C03-color-policy-v1.png) |

[Abrir máster C03](out/C03-color-policy-v1.png)

## C04 — scene-cool-outline

El contorno azul pálido se relaciona con las aplicaciones y superficies claras, con menos saturación que el azul de la escena.

Estrategia: `scene-related`. Tratamiento: `outline`. Contraste del texto CTA: 16.83:1.

| Tratamiento anterior | Candidata contextual |
| --- | --- |
| ![Antes C04](../analysis-typography-2026-09-25/out/preview-390/C04-frase-completa-compacta.png) | ![Candidata C04](out/preview-390/C04-color-policy-v1.png) |

[Abrir máster C04](out/C04-color-policy-v1.png)

## Evidencia técnica

- 39 pruebas unitarias dirigidas pasan.
- 14 verificaciones de integración pasan, incluidos rechazos esperados por política alterada, evidencia ausente/manipulada, color automático, contraste insuficiente y zona segura.
- 13 piezas legacy de tres planes conservan PNG y layout frente a HEAD: cuatro CMP-004, tres variantes de CTA y seis variantes en 9:16/16:9.
- Las cuatro candidatas pasan el gate por reproducción y fueron inspeccionadas a 390 px.

La variante de texto del caso de integración necesitó su reserva de corchetes y espaciado propio: una política válida no convierte un layout de contorno en uno válido de texto. No se alteró la guarda para hacer pasar esa prueba.

Estos resultados no constituyen certificación global de la CLI, aprobación visual del operador ni evidencia de rendimiento publicitario.
