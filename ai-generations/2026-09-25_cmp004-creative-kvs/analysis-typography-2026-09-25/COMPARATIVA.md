# CMP-004 — Comparación de lectura y proximidad

Fecha: 2026-09-25. Candidatas de análisis, no aprobación final. Comando sin modificaciones.

Las imágenes se muestran a 390 px. El titular conserva su tamaño en el máster; su frase se reúne y la separación al botón pasa de 34 a 25 px. Los nuevos apoyos son propuestas.

[Análisis y propuesta de evolución](../../../docs/audits/social/2026-09-25-cmp004-typography-grouping-review.md) · [Plan reproducible](cuatro-candidatas.json) · [Mediciones](mediciones.json)

## C01

| Original R01 | Candidata |
| --- | --- |
| ![Original C01](../out/preview-390/CMP004-C01-KV-45.png) | ![Candidata C01](out/preview-390/C01-frase-completa-compacta.png) |

[Abrir candidata a tamaño completo](out/C01-frase-completa-compacta.png)

## C02

| Original R01 | Candidata |
| --- | --- |
| ![Original C02](../out/preview-390/CMP004-C02-KV-45.png) | ![Candidata C02](out/preview-390/C02-frase-completa-compacta.png) |

[Abrir candidata a tamaño completo](out/C02-frase-completa-compacta.png)

## C03

| Original R01 | Candidata |
| --- | --- |
| ![Original C03](../out/preview-390/CMP004-C03-KV-45.png) | ![Candidata C03](out/preview-390/C03-frase-completa-compacta.png) |

[Abrir candidata a tamaño completo](out/C03-frase-completa-compacta.png)

## C04

| Original R01 | Candidata |
| --- | --- |
| ![Original C04](../out/preview-390/CMP004-C04-KV-45.png) | ![Candidata C04](out/preview-390/C04-frase-completa-compacta.png) |

[Abrir candidata a tamaño completo](out/C04-frase-completa-compacta.png)

## Resultado de verificación

Las cuatro candidatas pasan `foto:cta:gate --reproducir` (exit 0); el gate reprodujo archivos idénticos. Se revisaron las cuatro previsualizaciones. Esto no certifica otros ratios ni sustituye aprobación creativa.

El plan exploratorio de cinco piezas repite un plate y expone una limitación de caché del gate; no usarlo como evidencia de certificación. El plan de entrega de esta comparación es `cuatro-candidatas.json`.

El intento de 23 px falló la relación de ritmo; su evidencia se conserva en `evidencia-gap23/`. El valor 25 px es específico de estos ejemplos. El comando aún fuerza una receta condensada y un apoyo pequeño: pendientes de la evolución propuesta.
