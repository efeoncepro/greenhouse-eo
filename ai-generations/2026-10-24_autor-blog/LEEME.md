# Foto de autor del blog — Julio Reyes (2026-10-24)

Propuesta de foto para el perfil de autor del blog (byline, ficha al cierre del post, archivo de autor). **Todavía no
está aprobada ni subida a WordPress**: es la exploración que acompaña el canvas «Autor del blog Efeonce».

## Qué hay

| Archivo | Qué es |
|---|---|
| `julio-capa-reparada.png` | Capa de Julio sin fondo (1080², misma geometría que `2026-09-29_avatares-equipo/avatares/julio-capa.png`). **Usar ésta, no la del 2026-09-29.** |
| `julio-autor-<fondo>-1080.png` / `-500.png` | Avatar de autor, encuadre cerrado (ojos al 40 % del alto), sobre tres fondos: `azul-foto` (recomendado), `papel-halo`, `teal-growth` |
| `hoja-legibilidad.png` | Cada variante a 160/96/72/48/32 px sobre oscuro y sobre blanco |
| `reparar-capa.mjs` | Rehace la capa desde la foto fuente (`2026-09-29_avatares-equipo/extendido/julio-ext-ok.png`) |
| `componer-autor.mjs` | Encuadra la capa y la compone sobre los tres fondos (`node componer-autor.mjs <capa> <salida>`) |

## Por qué existe la capa reparada

La capa del 2026-09-29 tiene **huecos en la bomber** (vetas en la manga y el hombro del lado izquierdo del cuadro). Los
dejó el recorte de ese día; la foto fuente está limpia. Sobre el navy del avatar del equipo no se ven, pero sobre
cualquier fondo más claro aparecen. Afecta también a los avatares del equipo de Julio publicados ese día
(`avatares/julio.png`, `publicar/avatars/v1/*/julio-reyes.png`, `public/images/greenhouse/team/EO_Avatar-Julio-Reyes.png`):
hoy no se nota porque todos van sobre navy.

La reparación toma el cuerpo de la foto fuente con la silueta rellena (sin huecos), saca del contorno los píxeles claros
del ventanal, tiñe el filo con el color interior de la prenda y conserva la cabeza y el pelo de la capa original.

## Trampa medida

Con `sharp` 0.34.5, sobre máscaras de un canal, `erode()` **agranda** lo blanco y `dilate()` lo **achica** (cuadrado de
40×40: `erode(3)` → 2116 px, `dilate(3)` → 1156). `reparar-capa.mjs` usa `crecer`/`encoger` con el nombre de lo que hacen.
