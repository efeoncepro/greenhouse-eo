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

El mundo quedó aprobado por el operador el 2026-11-02. Horario, Ubicación y Mesa de ayuda v01 están construidas (canvas
`ReinoRDG_1_Horario`, `ReinoRDG_2_Ubicacion`, `ReinoRDG_3_MesaAyuda`; generador
`ai-generations/2026-11-02_motogas-rdg-mundo/tools/corte-rdg.py`). Las tres comparten escenario, logo blanco arriba,
titular de tres palabras en crema, bajada en mostaza y una placa crema con borde dorado para los datos, que salen de
`locales.json` con respaldo. La placa se dibuja con `box-sizing:border-box` para que no toque el borde del lienzo.

| Pieza | Escena |
|---|---|
| Horario | «Su Majestad atiende»: el Rey en el trono + `torre-reloj`; los datos salen del registro |
| Ubicación | `camino-real` hacia `castillo-rojo` / `castillo-naranjo`, o `mapa-reino` con el pin |
| Mesa de ayuda | «Audiencias reales»: el `heraldo` anuncia los WhatsApp de los dos locales |
| Lista del jueves | El edicto: `rey-capa` con `pergamino`; los precios se componen como texto |
| Invierno | El Rey contra `frio`, con `estufa`, `olla` o `llama` como defensa |
| Promo | `tesoro` (las monedas solo en piezas de precio o promo, nunca de adorno) |

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

## 5. Composición por capas (receta de la pieza hero)

Generador: `ai-generations/2026-11-02_motogas-rdg-mundo/tools/reino-rdg.py` (canvas `ReinoRDG_Hero`). Orden de atrás
hacia adelante: escenario → castillos (lejos, chicos) → palacio → camino real → trono → Rey → corte → primer plano
desenfocado (tesoro, cetro, 7–8 px de desenfoque, cortados por el borde) → degradado superior + logo blanco → titular →
grano. Cada personaje lleva sombra de contacto elíptica y la capa de luz de escena en *soft-light* enmascarada con
su propia silueta.

## 6. Lecciones

- El estilo cómic fue rechazado varias veces: el impacto sale de la profundidad y el material satinado, no del
  rayado, las onomatopeyas ni los fondos de puntos.
- Un personaje solo sobre un fondo plano se ve «pegado». Necesita suelo, sombra, luz compartida y algo con qué
  interactuar.
- Ningún objeto entra sin propósito narrativo (caso: monedas de adorno en una pieza de horario).
- Una explosión hacia la pantalla se arma con capas a distintas profundidades, no con un único plate generado.
