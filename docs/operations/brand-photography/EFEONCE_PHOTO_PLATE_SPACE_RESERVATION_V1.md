# Reserva de espacio en la toma — Lenguaje Fotográfico Efeonce

> **Tipo de documento:** Especificación técnica (capa fotográfica)
> **Versión:** 1.0 · **Creado:** 2026-09-19 por Claude
> **Estado:** parte de la capa **fotográfica aprobada** el 2026-09-19. No cubre la composición gráfica
> (titulares, jerarquía, cursores), que **no está aprobada**: ver el aviso de
> [zonas de composición y formatos](EFEONCE_PHOTO_TEXT_SPACE_AND_FORMATS_V1.md).
> **Relacionado:** [maestro](EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md) · [firma](EFEONCE_PHOTO_SIGNATURE_FOREGROUND_V1.md) · [cámaras](EFEONCE_PHOTO_CAMERA_LENS_ANGLE_CATALOG_V1.md) · [prompts y pipeline](EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md)

Una foto de marca puede tener que alojar después texto, una caja de selección, cursores o un dato. **Eso se
decide en la toma, no al componer.** Este documento cubre sólo lo que el plate debe traer; cómo se compone
encima pertenece a `efeonce-advertising-creative` y a su ficha tipográfica.

## 1. Las cuatro reservas posibles

| Reserva | Cuándo se pide | Qué debe traer el plate |
|---|---|---|
| **Zona de texto** | la pieza llevará etiqueta, titular o dato | área **pareja, sin objetos** y con **tono declarado** (sombra profunda o muro claro) |
| **Objeto para enmarcar** | la pieza llevará caja de selección | un objeto **aislado y completo** (la obra en revisión, el resultado), con aire alrededor para la caja y las etiquetas de cursores |
| **Lecho de la firma** | siempre | el primer plano desenfocado planeado, con su tono declarado (ver doc de firma) |
| **Aire para cursores** | la pieza llevará cursores | espacio libre al costado del objeto: las etiquetas viven **fuera** de la caja y con dos colaboradores el aire se paga dos veces |

## 2. Reglas duras (todas verificadas en esta corrida)

1. **El tono se declara siempre.** «Calma» no basta: una pared de tono medio no deja leer ni texto blanco ni
   oscuro. Se pide «DEEP, warm, evenly toned shadow… dark enough for white text» o «plain, evenly lit, VERY LIGHT
   warm-white wall… light enough for dark text». Sin tono declarado, el plate falla **[medido: 1,3–4,3:1]**.
2. **Límite de sujetos.** En verticales: «All heads and hands stay BELOW 36% of the frame height». En 16:9:
   «All people and objects stay entirely inside the RIGHT 55%». Sin esto, el modelo sube las cabezas a la zona.
3. **Nombrar lo prohibido dentro de la zona:** «no windows, frames, prints, plants, light beams or bright spots».
4. **Formato nativo.** Se genera en el tamaño final (4:5 1152×1440, 9:16 1152×2048, 16:9 2048×1152). **NUNCA**
   se recorta un formato desde otro: el recorte se come la reserva.
5. **NUNCA un scrim.** Si la zona no da contraste, se **regenera el plate** o se mueve el texto. Oscurecer la foto
   está prohibido (decisión del operador: «es muy 2010, le resta limpieza»).
6. **Se mide antes de componer.** Sobre el plate limpio: nitidez de la zona (debe ser pareja) y contraste contra
   la tinta prevista (≥ 4,5:1). Si no pasa, el plate se rehace; no se parcha al componer.

## 3. Geometría por formato (punto de partida verificado)

| Formato | Zona de texto | Sujeto | Lecho de firma |
|---|---|---|---|
| 4:5 (feed) | 30% superior | 30–80% del alto | 18% inferior |
| 9:16 (Stories/Reels) | banda 10–32% del alto (bajo la barra de la red) | 35–75% del alto | 22% inferior |
| 16:9 (web, YouTube, LinkedIn) | 42% izquierdo | mitad derecha | 16% inferior |

Son puntos de partida medidos en esta corrida, **no una retícula aprobada**: la retícula definitiva debe salir de
una pieza compuesta y aprobada, no de estas pruebas.

## 4. Qué NO define este documento

- Tamaños, pesos, jerarquía, posición exacta del texto y de los cursores: eso es la capa gráfica, hoy **no
  aprobada**, y su canon es `efeonce-advertising-creative` (brief + ficha tipográfica + gate DO/DON'T).
- Cuándo una pieza lleva caja de selección: la caja tiene propósito (objeto con sentido o palabra con énfasis);
  si no lo hay, no va.

## 5. Evidencia

Plates y mediciones en `ai-generations/2026-09-19_lenguaje-fotografico-efeonce/rondas/texto/` (v1 sin tono
declarado = falla; v2 con tono y límite de cabezas = pasa) y `rondas/capas-v2/`. OneDrive:
`referencias/08-espacio-texto-y-formatos/`, con la hoja del primer intento fallido como material de aprendizaje.
