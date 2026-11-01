# Por qué cambia la textura del agua en el impacto (2026-10-22, medido sin gastar)

Métrica: varianza del laplaciano (energía de detalle fino) en la zona del torso y la cabeza de Paula, cada 0,25 s.
Agua líquida con estelas ≈ 200–650; gotas de vidrio nítidas (estilo GPT Image) ≈ 2 000+.

| Clip | Cuadro final | 0 s → 4 s |
|---|---|---|
| Impacto v4 (Kling) | 00 | 518 452 415 396 398 402 351 342 466 **832 880 918 1021 1066 1020 1084** |
| Impacto v3 (Kling) | 00 | 580 375 255 211 232 217 213 216 474 **677 676 770 907 972 943 1004** |
| Impacto v2 (Kling) | 00 | 614 423 384 362 367 467 547 632 704 743 719 793 **937 1006 996 1067** |
| Impacto Kling desde 11a | ninguno | 536 284 270 249 140 144 186 256 286 311 332 352 369 378 385 380 |
| Impacto Seedance 2.0 | ninguno | 546 447 432 420 274 282 338 381 342 357 341 398 351 402 395 399 |
| POV v2 (Kling) | ninguno | 571 404 485 506 584 615 638 625 644 657 647 656 599 520 462 376 |
| Foto 00 (GPT Image) | — | 2 373 |

Conclusión: en los tres impactos con la foto 00 como cuadro final, el detalle del agua se triplica en los últimos
~2 s: Kling transforma su agua líquida en las gotas de vidrio de la foto. Sin cuadro final, la textura se mantiene
estable en los dos motores. Quitar el cuadro final resuelve el cambio de textura.

Riesgos sin cuadro final y cómo se cubren:
- El modelo decide el final: la lata flotó ~1 s en un intento previo de Kling sin cuadro final; Seedance 2.0 resolvió
  bien golpe, rebote y caída. Se prueban los dos en paralelo, en su calidad más barata.
- La portada: se congela el mejor cuadro del rebote (lata junto a la cabeza, Paula empapada), no necesariamente el
  último. Reemplaza al 00 sólo con aprobación.
- El corte POV → impacto: el POV termina con la lata casi en el pecho y el impacto empieza con la lata saliendo de la
  tapa. Se recorta el inicio del impacto para que el corte no repita el vuelo.
- La resolución: el elegido se escala a 1080p con el escalador de Higgsfield, conservando la misma toma.
