# Trazo · candidatos IA, social y staff (2026-09-27)

Estado: **candidatos**, fuera del set. Esperan la aprobación del operador. No se tocó el repo de AXIS.

Método: guía `axis-design-system/docs/agent-composition/iconography.md` (§ Receta del Trazo, § Un glifo nuevo de
Trazo). Geometría propia en la grilla 24 (margen 2, trazo 1,5, remates redondos, sólo M/L/H/V/A/Z con arcos
circulares); nada copiado de Tabler ni de otra librería. Los 10 pasan `node scripts/icons.mjs check` con salida 0.

## Tabla

Aire = distancia entre el borde de la esfera (r 1,75) y el borde del trazo más cercano; mínimo 0,5.

| Clave | Label | Use | Modo | Dónde responde la esfera | Aire 1,5 | Aire 1,75 (20 px) |
| --- | --- | --- | --- | --- | --- | --- |
| `ia` | IA | Engine · inteligencia artificial, agentes | replace | el destello chico se vuelve la esfera (18,25; 5,75) | 5,38 | 5,25 |
| `composer` | Composer | Engine · asistentes de IA, prompts, AEO | replace | la flecha de enviar se vuelve la esfera (17; 14,5) | 1,50 | 1,38 |
| `buscador` | Buscador | Engine · buscadores, SEO, búsqueda en IA | replace | el final de la consulta se vuelve la esfera (16,75; 12) | 2,75 | 2,63 |
| `influencer` | Influencer | Voice · creadores de contenido, influencers | replace | la estrella se vuelve la esfera (18; 6,5) | 3,37 | 3,25 |
| `prensa` | Prensa | Voice · prensa, medios ganados, PR | replace | la foto de la noticia se vuelve la esfera (7,75; 12,75) | 1,75 | 1,63 |
| `social` | Social | Voice · redes sociales, comunidad | replace | la esquina del globo se abre y la esfera es la notificación (20,25; 4,75) | 0,76 | 0,64 |
| `multimedia` | Multimedia | Brand · medios mixtos, foto y video | replace | el sol de la foto se vuelve la esfera (12,75; 8) | 1,50 | 1,38 |
| `assets` | Assets | Brand · biblioteca de assets, archivos creativos | complete | en el centro de la tarjeta del frente (12; 15) | 3,50 | 3,38 |
| `staff-hoodie` | Staff (hoodie) | Área · staff augmentation, equipo en terreno | complete | en el pecho, donde iría la marca (12; 15,25) | 1,22 | 1,09 |
| `staff-gorra` | Staff (gorra) | Área · staff augmentation, equipo en terreno | complete | en el panel frontal, donde iría la marca (12,5; 12) | 1,15 | 1,02 |

Ninguno baja de 0,5 con el trazo de 20 px (el pendiente del aire a 20 px no los alcanza; el más justo es `social`).

## Qué es cada uno y de qué se distingue

- **ia:** destello de cuatro puntas con lados cóncavos (arcos circulares) y uno chico arriba a la derecha. Sin cerebro
  ni robot. Se distingue de `varita` y `estrella` (Plastilina) porque es de cuatro puntas y va en Trazo.
- **composer:** campo redondeado con dos líneas de texto y la flecha de enviar abajo a la derecha. Sin la píldora con
  «+» ni el botón negro redondo de ChatGPT, sin el brillo de Gemini. Se distingue de `web` y `crm` por la flecha.
- **buscador:** barra en píldora con una lupa chica y la consulta. Se distingue de `busqueda`, que es la lupa sola.
- **influencer:** persona con estrella de cinco puntas. Se distingue de `talent` (dos personas) en reposo.
- **prensa:** periódico con la hoja trasera, titular, foto y columnas. Se distingue de `informe` (documento con
  esquina doblada y barras) y de `medios` (megáfono).
- **social:** globo único con corazón; responde como notificación. Se distingue de `reunion` (dos globos, sin
  corazón). No se dibujó la variante de tres nodos: se lee como el ícono de «compartir».
- **multimedia:** foto (montaña y sol) con un botón de play superpuesto, que corta el marco.
- **assets:** tarjetas apiladas (la del frente y dos bordes detrás). Se distingue de `informe` porque no es un
  documento.
- **staff-hoodie:** hoodie de frente con capucha, cordones y mangas; sin logo, la esfera es la marca.
- **staff-gorra:** gorra de perfil con la copa asimétrica, costura, botón y visera; sin logo, la esfera es la marca.

## Dudas para el operador

1. **influencer en respuesta se parece a talent en respuesta.** Al responder, la estrella desaparece y queda persona +
   esfera arriba a la derecha, casi como `talent` (que conserva el hombro de la segunda persona). En reposo se
   distinguen bien, y en una fila responde uno solo, así que rara vez conviven respondiendo. Alternativas con aro de luz,
   probadas a ojo: el aro concéntrico a la cabeza se lee como **webcam** a 20 px (`control/_var/v1-halo.json`); el aro
   en pedestal, al lado de la persona, se lee como **una segunda persona de palitos**; el aro detrás y descentrado
   parece **un casco**. Por eso quedó la estrella. (`control/_var/v3-luna.json` quedó mal construido y no cuenta.)
2. **assets en reposo** puede leerse como bandeja, archivo o capas. Una foto en la tarjeta la haría más «creativa»,
   pero la confundiría con `multimedia`.
3. **staff-gorra a 20 px** puede leerse como paraguas por la costura y el botón. Sin la costura se leía como la tapa de
   una bandeja de servicio (cloché); la visera larga es lo que la hace gorra.
4. **social** tiene el aire más justo del grupo (0,76 / 0,64). La esfera reemplaza la esquina redondeada del globo,
   como una notificación. Es el mismo gesto que `automatizacion` (esfera en el corte de un trazo), pero sobre un
   rectángulo: no se lee como indicador de carga.
5. **Esfera al final de una línea:** `buscador` repite el gesto de `contrato` (la línea se acorta y la esfera la
   cierra). Es coherente con la familia, pero son dos de 37.
6. **Líneas en `use`:** `multimedia` y `assets` quedaron en Brand porque son producción creativa, aunque la voz
   dominante de Brand es Plastilina (`contenido` ya es Trazo de Brand). `influencer`, `prensa` y `social` quedaron en
   Voice, que sigue sin voz fija.
7. **Labels de staff:** «Staff (hoodie)» y «Staff (gorra)» son provisorios. Si ambos van al catálogo con el mismo uso,
   conviene decidir cuál es el canónico para staff augmentation y dejar el otro como variante.

## Archivos

- `<clave>.json` · los 10 glifos (formato de `docs/examples/iconography/stroke-glyph-keynote.json`).
- `control/<clave>/` · hojas de control de `icons:check` (160, 64, 32, 24 y 20 px, oscuro y papel) y SVG 48 px.
- `control/_familia-con-aprobados.png` · los 27 aprobados + los 10 candidatos, a 64, 24 y 20 px, en reposo y respuesta.
- `control/_candidatos.png` · sólo los 10.
- `control/_generador.mjs` · la geometría (se regeneran los JSON con `node control/_generador.mjs`).
- `control/_hoja-familia.mjs`, `control/_preview.mjs` y `control/_mejor-punto.mjs` · hojas y búsqueda del mejor
  punto de la esfera.
- `control/_var/` · variantes descartadas de influencer.

Alta, si se aprueba: agregar a `STROKE_GLYPHS` en `packages/graphic-line/src/icons-stroke-data.ts`, correr
`icons.test.ts` y publicar una versión del paquete (§ Un glifo nuevo de Trazo, paso 5).
