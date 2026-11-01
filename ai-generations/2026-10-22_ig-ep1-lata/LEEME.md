# IG-01 · Ep. 1 «La lata que no cabía» — cuadros del storyboard (2026-10-22)

Serie de making-of del anuncio BREAKR (Efeonce × BytePlus) para Instagram. Regla del operador: ningún episodio muestra
el golpe de la ola sobre Paula antes del lanzamiento (planos 11b y 00 excluidos).

Cuadros finales del reel en `cuadros-1080x1920/` (ep1-f1 a ep1-f6). Se reconstruyen desde esta carpeta con
`mkdir -p b f && node base.cjs b && node render.mjs` (`base.cjs`: recorte 9:16, foco solo en el sujeto, resto
desenfocado y oscurecido, salida 1080×1920; `render.mjs`: texto con Bricolage y Poppins vía Playwright, y medición).
Medidas: zona segura de reel **orgánico** de Instagram (15 % arriba, 20 % abajo, columna de botones desde x=929;
`social-media-studio/modules/02_FORMATS_CRAFT.md`); los anuncios pagados piden 14 % y 35 %, no aplican aquí.
Cada texto se mide contra el cuadro sin texto: todos fuera de la lata y de Paula, contraste entre 5,2 y 10,3:1.

Fuentes, de solo lectura, con su huella sha256 (primeros 12) al 2026-10-22:

| Cuadro | Fuente | sha256 |
|---|---|---|
| f2 · chica | `2026-10-17_breakr-marca/planos/11a-ola-llega-breakr-v1.png` | 54c627c7058a |
| f1 y f3 · gigante | `2026-10-17_breakr-marca/planos/11a-ola-llega-v3.png` | f040810674b3 |
| f4 y f5 · justa | `2026-10-17_breakr-marca/planos/11a-ola-llega-v6.png` (misma cámara que chica y gigante) | 7a92f51a1d10 |
| f6 · antes | `2026-10-17_breakr-marca/planos/final/01-kickoff.png` | a97d24476ace |

`planos/final/11a-ola-llega.png` no se usa: es la toma re-escenificada con otra cámara (material del Ep. 2).
Regla de escala: `2026-10-16_byteplus-anuncio-para-cuando/v2-gpt/CONTINUIDAD.md` (15,7 cm contra ~23 cm de cabeza).
