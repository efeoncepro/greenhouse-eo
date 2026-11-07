# El mundo del Rey del Gas

> Kit v01 del 2026-11-02, todavía sin revisión del equipo ni del cliente. Corrida:
> `ai-generations/2026-11-02_motogas-rdg-mundo/` (briefs, crudos, recortes, vectores y hojas).
> Entregable: `PERS/Rey del Gas - Mundo (kit)/v01/` (`PERS` = `…/Motogas/Produccion Grafica/1. Recursos Graficos/Personajes`).

## 1. La idea

El Rey del Gas no es un logo con un personaje pegado: es un **rey con reino**. Los locales son castillos, el
horario es «Su Majestad atiende», la lista de precios es un edicto, la mesa de ayuda son las audiencias reales y el
frío es el villano. Cada pieza se compone **por capas** con estos elementos sobre un escenario real.

Sistema híbrido, con dos técnicas que nunca se mezclan dentro de un mismo elemento:

| Capa | Técnica | Para qué |
|---|---|---|
| Personajes (el Rey y su corte) | **2D vectorial** de 4 colores, mismo trazo que la hoja del Rey | Quien habla y actúa |
| Objetos y arquitectura del reino | **3D satinado** tipo juguete de diseñador (como Gasfield): rojo, oro cepillado, crema, terciopelo | El mundo físico que da profundidad |
| Escenario | Foto/render realista (teatro real con telón rojo y focos dorados) | El suelo «real» donde todo se integra |

La integración (estilo *¿Quién engañó a Roger Rabbit?*) sale de la composición, no del modelo: sombra de contacto bajo
cada personaje, luz de escena en *soft-light* recortada por la silueta, objetos cercanos grandes y desenfocados,
lejanos pequeños y nítidos, grano de película encima de todo.

## 2. Inventario v01

**3D satinado (17)** — `3D satinado (PNG transparente)/motogas-rdg-mundo-3d-<id>-v01.png`

| Grupo | Ids | Uso típico |
|---|---|---|
| Reino | `palacio`, `castillo-rojo` (Lo Prado), `castillo-naranjo` (Cerro Navia), `camino-real`, `mapa-reino`, `torre-reloj` | Ubicación, bienvenida, horario |
| Corte | `trono`, `cetro`, `sello`, `pergamino`, `tesoro`, `escudo`, `trompeta` | Edictos (lista), anuncios, promos |
| Calor de hogar | `llama`, `olla`, `tetera`, `estufa` | Invierno, cocina, temporada |

El rojo del castillo de Lo Prado y el naranjo de Cerro Navia siguen el color de cada local en la lista de precios.

**Corte 2D (8)** — `Corte 2D (SVG)/` y `Corte 2D (PNG transparente)/`, `motogas-rdg-mundo-2d-<id>-v01`

| Id | Personaje | Cilindro | Rasgo |
|---|---|---|---|
| `rey-trono` | El Rey sentado en su trono | 15 kg | Pose de bienvenida y horario |
| `rey-capa` | El Rey con capa de armiño | 15 kg | Edictos, anuncios |
| `paje` | El Paje | 5 kg | Boina amarilla con pluma, cojín |
| `escudero` | El Escudero | 11 kg | Yelmo y escudo amarillo |
| `guardia` | La Guardia Real | 15 kg | Casco con penacho, lanza |
| `gigante` | El Gigante bonachón | 45 kg | Caja de regalo |
| `heraldo` | El Heraldo | — | Trompeta con estandarte (mesa de ayuda) |
| `frio` | El Frío (villano) | nube | Único con celeste y azul; sin rojo ni amarillo |

Los tamaños de cilindro (5, 11, 15, 45 kg) son los formatos reales que vende el local: la corte también es catálogo.

**Escenario y pieza hero** — `Escenarios/motogas-rdg-mundo-escenario-teatro-4x5-v01.png` (centro vacío, 18 % superior
libre para el logo) y `Pieza hero/motogas-rdg-bienvenidos-al-reino-4x5-v01.png`.

## 3. Mapa de piezas

El mundo quedó aprobado por el operador el 2026-11-02. **v1 (sobre el teatro) fue rechazada**: «todo es un teatro y
ahí estás pegando todo sin integrar nada… amplía más el mundo», y además las sombras, los tamaños y el texto no se
veían modernos. **v2 vigente:** cada pieza vive en **su propio lugar del reino**, generado entero (canvas
`ReinoRDG_1_Horario`, `ReinoRDG_2_Ubicacion`, `ReinoRDG_3_MesaAyuda`; fondos en
`ai-generations/2026-11-02_motogas-rdg-mundo/lugares/final/`, generador `tools/piezas-v2.py`).

| Pieza | Lugar | Personajes |
|---|---|---|
| Horario «Su Majestad atiende.» | La plaza: trono sobre tarima, torre del reloj (marca las 10:00), palacio al fondo | Rey en el trono + Paje |
| Ubicación «Ven al Reino.» | El camino real entre el castillo rojo (Lo Prado) y el naranjo (Cerro Navia), palacio en la colina | Rey con capa sobre la alfombra |
| Mesa de ayuda «Audiencias reales.» | La puerta del palacio con escalinata | Heraldo en primer plano (pisa la tarjeta) + Rey en la puerta |
| Lista del jueves (pendiente) | El edicto: Rey con capa y pergamino | — |
| Invierno (pendiente) | El Rey contra El Frío, con estufa, olla o llama | — |

**Sistema tipográfico v2** (Poppins): logo negro arriba a la izquierda (230 px, opacidad 0,9) · titular de dos
líneas alineado a la izquierda sobre el cielo, 108 px, peso 800, interletra −0,055 em, interlínea 0,9, primera línea
en tinta `#2A0B08` y segunda en rojo `#D8261C` cerrando con punto · bajada corta de una línea, 25 px, peso 500 ·
**datos en una tarjeta blanca** abajo (márgenes 40, radio 30, sombra suave): ícono en cuadro redondeado de color,
etiqueta de 15 px en versalitas del color del local y valor de 32–40 px en tinta, con un pie de 14 px (locales y
legal). Nada de placas crema con doble borde dorado ni subtítulos espaciados en mostaza: era lo que se leía antiguo.

## 4. Cómo generar un elemento nuevo

1. **Objeto 3D:** `briefs/rdg-mundo-3d-satinado.txt` completo + una línea `Object:`; siempre sobre gris `#808080`,
   sin texto, sin números, sin logos. `pnpm ai:image --openai-key personal --model gpt-image-2.5-sunburst --quality xhigh
   --size 1024x1024 --prompt-file <brief> --out <ruta>`.
2. **Personaje 2D:** `briefs/rdg-corte-2d.txt` + una línea `NEW CHARACTER`, en modo edición con la referencia del Rey
   (`PERS/_Referencias para generar/Rey del Gas/`). Ningún personaje de la corte lleva corona; solo el Rey.
3. **Recorte:**
   - 3D sólido: `pnpm ai:image:rmbg`.
   - 3D con crema, vapor o llama translúcida: `node scripts/recorte-fondo-plano.cjs in.png out.png [--tol 26]`
     (el recortador automático borra esas partes).
4. **Vector 2D:** `node scripts/vectorize.cjs` con la paleta del Rey; un color fuera de la paleta se declara con
   `--extra 'nombre:r,g,b;…'` (El Frío: `--extra 'celeste:143,216,247;azul:30,90,168'`). Revisar el reporte de
   distribución de colores: un color que no debería estar es un píxel mal asignado.
5. **QA:** mirar cada recorte sobre fondo oscuro (halos, partes borradas) antes de entregarlo.

## 5. Cómo se arma una pieza (v2: el personaje vive en un lugar)

1. **El lugar, generado entero** con `briefs/rdg-lugar-estilo.txt` + la escena, en modo edición con los objetos 3D
   del kit como referencia de estilo (`--image` repetible), `gpt-image-2.5-sunburst` `xhigh` `1600x2000`. La escena
   deja vacío el sitio de cada personaje (el trono vacío, el centro del camino) y declara cielo arriba y suelo calmo
   abajo. Luz de atardecer desde arriba a la izquierda: las sombras caen a la derecha.
2. **Poner los 2D** a la escala del lugar (`scripts/rdg-poner-personajes.cjs`): el Rey sentado mide ~0,84 del alto
   del trono y su base cae 0,27 de ese alto sobre las patas; el Paje ~0,6 del Rey.
3. **Integrar** (`briefs/rdg-integrar-2d.txt`, edición del compuesto al mismo tamaño): el modelo sólo agrega la sombra
   proyectada y de contacto de cada personaje con la luz del lugar. **Después se vuelven a poner los vectores
   originales encima** (no se confía en cómo los redibujó el modelo).
4. **Ampliar el cielo** si el titular no cabe (`briefs/rdg-ampliar-cielo.txt`): lienzo 1920×2400 con la escena abajo al
   centro y bandas grises arriba y a los costados, edición a 1920×2400. Se usa **la salida entera del modelo**:
   reponer el original encima deja un rectángulo visible porque el modelo re-tiñe el cielo
   (`scripts/rdg-reponer-original.cjs` quedó como intento fallido documentado).
5. **Hornear la luz en los personajes** (`scripts/rdg-hornear-personajes.cjs`): degradado en *soft-light* recortado
   por la silueta, cálido arriba a la izquierda y sombra abajo a la derecha. Deja cada personaje suelto para ponerlo
   por encima del texto cuando hace falta (el Heraldo sobre la tarjeta).
6. **La pieza** en HTML: fondo horneado + tipografía v2 + grano al 14 %.

## 6. Lecciones

- **El teatro fue el error de base:** un solo fondo genérico para todo obliga a pegar cada elemento encima, y ninguna
  sombra dibujada a mano lo arregla. Cada pieza necesita un lugar propio del reino, generado con los objetos dentro.
- Las sombras de los personajes 2D las pone el modelo con la luz real del lugar; las elipses borrosas a mano se leen
  pegadas.

- El estilo cómic fue rechazado varias veces: el impacto sale de la profundidad y el material satinado, no del
  rayado, las onomatopeyas ni los fondos de puntos.
- Un personaje solo sobre un fondo plano se ve «pegado». Necesita suelo, sombra, luz compartida y algo con qué
  interactuar.
- Ningún objeto entra sin propósito narrativo (caso: monedas de adorno en una pieza de horario).
- Una explosión hacia la pantalla se arma con capas a distintas profundidades, no con un único plate generado.
