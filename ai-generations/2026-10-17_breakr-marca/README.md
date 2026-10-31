# BREAKR: marca ficticia de la bebida de «¿Para cuándo?»

Corrida del 2026-10-17. La bebida ficticia del anuncio Efeonce × BytePlus ahora tiene marca: **BREAKR**, con el
lema «Break the wait.» (ES «Rompe la espera.», PT «Quebre a espera.»). La marca se aprobó en el canvas, página
«Marca de la bebida · BREAKR».

## Qué hay aquí

| Carpeta | Contenido |
|---|---|
| `activos/` | Logotipo, lata vectorial y key visual en 4:5, 9:16 y 16:9 (render determinístico desde `brand_assets.py`) |
| `lata/breakr-lata-v1.png` | **Referencia única del producto**: lata fotorrealista, editada desde la lata aprobada del film |
| `planos/final/` | Los 12 planos de plates-v5 que muestran la lata o la campaña, ya con BREAKR |
| `planos/prompts/` | Prompt de cada edición (plano 10 tiene además `10-lata-fix.txt`) |
| `log/` | Salida de cada generación |

## Cómo se hizo

- Motor: `pnpm ai:image --model gpt-image-2.5-sunburst --quality high`, editando cada plano con su propio tamaño
  (4:5). Imagen 1 = el plano (estructura), imagen 2 = la lata BREAKR, imagen 3 = el key visual cuando hay pantalla o valla.
- Planos editados: 09, 10, 11a, 11b, 12, 13, 14, 15, 16, 17 y 18. **El 00 es el mismo archivo que el 11b** (el
  gancho es el final congelado), así que `final/00-gancho-congelado.png` es una copia del 11b.
- QA: cada lata y pantalla se revisó ampliada letra por letra. El plano 10 salió con «REAKR» (la B quedó fuera
  de la lata) y se corrigió con una segunda edición sobre la salida (`10-lata-breakr-v2.png`).
- Costo: 14 ediciones, ≈ 22 000 tokens de salida (≈ USD 0,67) más la entrada de imágenes; total ≈ USD 1.

## Pendiente de mirar

- En el 17, el afiche de la pared quedó más nítido que en el plano original (antes estaba fuera de foco).
- El texto chico «ORANGE BREAK» se lee bien en los planos cercanos; en las latas en vuelo es una textura, como
  corresponde al desenfoque de movimiento.
- Los planos que no muestran la lata (01–08, 19) no cambian.
