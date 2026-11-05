# Producir las imágenes de un lote del Blog SKY

> **Tipo de documento:** Manual de uso
> **Versión:** 1.0
> **Creado:** 2026-11-05 por Claude, a partir del lote de 54 artículos de esa fecha
> **Última actualización:** 2026-11-05 por Claude
> **Documentación técnica:** skill [`sky-blog-graphic-line`](../../../.claude/skills/sky-blog-graphic-line/SKILL.md) (flujo de lote en [`references/workflow.md`](../../../.claude/skills/sky-blog-graphic-line/references/workflow.md) §9) · [caso de noviembre 2026](../../services/sky-blog-seo/LOTE_NOVIEMBRE_2026_PRODUCCION_IMAGENES.md)

## Para qué sirve

Para producir, a partir de las specs de un lote editorial, las imágenes de varios artículos del Blog SKY: banners de
ruta, portadas (IMG 1) y escenas (IMG 2–3). Termina con los WebP listos para revisión, en el Creative Workbench. No
sube nada a Frame.io, Notion ni WordPress, y no aprueba: la aprobación es de Diseño y Marca SKY.

Este manual describe lo que se hizo el 2026-11-05. La expansión de portada (alejar la cámara) y la ampliación a
3840 px todavía no las valida Julio.

## Antes de empezar

- Carga la skill `sky-blog-graphic-line` y, para el Workbench, `efeonce-creative-workbench`
  (`references/state-continuity.md`). Las specs salen del lote editorial ([manual](correr-lote-editorial-blog-sky.md)).
- Ten la pieza del lote en el Workbench (`/Users/jreye/Documents/creative-workbench/projects/sky/<pieza>/`) con
  `specs/<id>.json` y `specs/MANIFEST.json`. Si una spec difiere del callout de Notion, manda Notion.
- Revisa qué no se produce: artículos sin aprobación de SKY, specs `Bloqueado`, imágenes marcadas «no regenerar» y
  banners bloqueados del MANIFEST.
- Credenciales: gcloud con acceso a Secret Manager de `efeonce-group` (clave OpenAI personal y token de Shutterstock
  `greenhouse-shutterstock-oauth-token`). No escribas ningún valor en archivos ni en el chat.
- Presupuesto: como referencia, un maestro max 3840×2160 estima ≈ USD 0,40 y una expansión o retoque ≈ USD 0,04–0,06.
  El lote del 2026-11-05 estimó ≈ USD 60 en total para 49 portadas y 93 escenas.
- Metric instalada en `clients/sky/.resources-local/` del Workbench (los banners no tienen fuente de reemplazo).

## Paso a paso

1. **Arma las entradas de prompt.** Una por imagen, en `plates/` de la pieza: portadas en `plates/portadas-*.json`,
   escenas en `plates/escenas-img23.json`. Cada entrada lleva registro, tipo, lugar, escena, hora, clima, primer plano y
   borde; las de registro E, además, quién fotografía y hacia dónde mira. Suma en `extra` el bloque de colorimetría
   Brandlift y el lente por tipo de `plates/brandlift.json` (Julio: «recuerda la colorimetría de SKY, bokeh y demás»).
2. **Consigue las referencias reales** de todo lugar identificable. Busca en Shutterstock; si no hay, en Wikimedia
   Commons. Arma hojas de contacto, **lee la descripción de cada candidato** y elige mirando. Licencia en lote y anota
   la procedencia en `refs-ledger/`. Si no hay una referencia del lugar real, la imagen queda bloqueada.
3. **Genera los prompts** con el builder de la línea (nunca a mano):
   `node projects/<pieza>/tools/imagenes/mkprompts.mjs <plates.json> <carpeta-prompts>` para portadas y
   `mkprompts23.mjs <plates> <carpeta-prompts> <refs23.json>` para escenas. Lee un prompt completo antes de pagar.
4. **Genera en tandas paralelas**, cada una con su log. Por imagen corre:

   ```bash
   cd /Users/jreye/Documents/greenhouse-eo
   gtimeout 900 pnpm -s ai:image --openai-key personal --prompt-file <prompt>.txt [--image <ref>.jpg] \
     --model gpt-image-2.5-sunburst --quality max --size 3840x2160 --format png --timeout 600000 \
     --out ai-generations/<fecha>_sky-blog-lote/<portadas|escenas>/maestros/<id>-maestro.png
   ```

   `run4.sh` (portadas) y `gen23.sh` (escenas) hacen ese bucle y saltan lo que ya existe. Revisa que el log diga
   «clave personal».
5. **Mira todo en hojas de contacto** y abre al 100 % las dudosas: manos, letreros, geografía contra la referencia.
6. **Mide cada portada** desde el Workbench:

   ```bash
   cd /Users/jreye/Documents/creative-workbench
   node brands/sky-airline/blog/scripts/medir-portada.mjs <maestro>.png --sujeto u0,v0,u1,v1 --focal 0.5,0.5 \
     --vista projects/sky/<pieza>/salidas/vistas
   ```

   La caja del sujeto **empieza en la coronilla** (pelo, sombrero), nunca en los hombros. Mira las vistas de escritorio
   y móvil, no sólo el veredicto.
7. **Si el sujeto quedó bajo o la mitad inferior quedó muy clara, aleja la cámara.** `zoomout.mjs` arma el lienzo y la
   máscara (con `ZOOM_TOP=0.18`), `ai:inpaint` con Flare completa el área nueva y se usa el candidato crudo ampliado a
   3840×2160 (`runzoom2.sh` hace los tres pasos). Si el título no se lee, repite pidiendo el suelo «en sombra profunda,
   mate». Vuelve a medir y compara con el maestro anterior: el modelo puede borrar o mover al sujeto.
8. **Borra toda letra legible** dentro de la foto con `pnpm ai:mask` + `pnpm ai:inpaint image` y Flare, anteponiendo
   `OPENAI_API_KEY_PROFILE=personal`. El prompt describe la superficie limpia y no menciona «logo». Si queda texto,
   haz un segundo paso.
9. **Copia el maestro aprobado** a `projects/sky/<pieza>/salidas/<articulo>/img<n>-maestro.png` y **exporta**:

   ```bash
   node brands/sky-airline/blog/scripts/exportar.mjs projects/sky/<pieza>/salidas/<articulo>/img1-maestro.png \
     --nombre <nombre-de-la-spec> --focal 0.5,0.5 --portada --out projects/sky/<pieza>/salidas/<articulo>/entrega
   ```

   Las escenas, sin `--portada`. La salida tiene que quedar bajo `projects/sky/<pieza>/`. Si no baja de 200 KB, exporta
   desde una copia del maestro con desenfoque leve (σ desde 0,6) y mírala al 100 %.
10. **Compón los banners de ruta**, uno por formato, desde los jobs de la pieza:

    ```bash
    node brands/sky-airline/blog/scripts/componer-ruta.mjs projects/sky/<pieza>/jobs/<id>-ruta.json \
      --out projects/sky/<pieza>/runs/banners
    ```

    La receta B (con foto) usa una foto de la serie del artículo. Si la ruta no cabe con foto, usa la receta A en ese
    formato: nunca achiques la letra.
11. **Registra y reporta**: commit en la rama del Workbench (sin push salvo indicación), expediente del lote con conteos,
    bloqueados, costos estimados por partida y observaciones para revisión humana, y lecciones nuevas en la skill.

Si se lo pides a un agente, una forma que funcionó:

```text
Con la skill sky-blog-graphic-line, produce las portadas, escenas y banners de ruta del lote
projects/sky/<pieza>/ desde sus specs. Motor gpt-image-2.5-sunburst con clave personal; referencias
reales de Shutterstock o Wikimedia con procedencia. No subas nada a Frame.io, Notion ni WordPress.
Antes de gastar, dime cuántas imágenes y el costo estimado.
```

## Qué significan los estados

| Estado | Significa |
| --- | --- |
| Generado | Existe el maestro 3840×2160; nadie lo ha revisado todavía |
| Medido | La portada pasó `medir-portada` (sujeto en la ventana y título legible). Medir no aprueba |
| Exportado | Están los WebP bajo el límite de peso en `salidas/<articulo>/entrega/` |
| Bloqueado | Falta una referencia real, la ruta no está 🟢 Activa o la spec lo dice: no se genera ni se compone |
| `pending-human-and-pixel-review` | Estado de todo lo que sale del Workbench hasta que Diseño y Marca SKY revisan |
| Aprobado / entregado | Sólo después de Frame.io, el cambio de estado en Notion y la entrega en OneDrive; ningún paso de este manual llega ahí |

## Qué no hacer

- No uses Nano Banana Pro (Julio: «no tiene buena calidad») ni cambies de motor sin medir y sin autorización.
- No generes un lugar identificable sin su referencia real, ni licencies una referencia sin leer su descripción.
- No generes avión, cabina, uniforme ni tripulación SKY; el avión sólo existe como ícono en el banner.
- No pongas «logo», «marca» ni «brand» en un prompt de `ai:inpaint`: el comando aborta.
- No corras `ai:inpaint` sin `OPENAI_API_KEY_PROFILE=personal`: paga la clave de empresa.
- No reduzcas la resolución para bajar de peso ni tapes un título ilegible con un velo.
- No achiques la letra de un banner; no escribas precios ni ofertas.
- No sumes los logs con globs que se solapan: el costo sale doble.
- No subas ni publiques nada sin la revisión humana.

## Problemas comunes

| Problema | Qué hacer |
| --- | --- |
| La portada pasa el gate pero la cabeza sale cortada en escritorio | La caja empezaba en los hombros. Declárala desde la coronilla y, si hace falta, repite la expansión con `ZOOM_TOP=0.18` |
| El gate de contraste falla aunque el sujeto esté arriba | La mitad inferior es muy clara. Repite la expansión con el suelo en sombra profunda y mate |
| La expansión deja uniones visibles | Usa el candidato crudo (`candidate-1-raw.png`) ampliado, no el recompuesto |
| Después de la expansión el sujeto ya no está | El crudo es una imagen rehecha. Descártalo y repite, o vuelve al maestro anterior y anótalo |
| `ai:inpaint` termina con FATAL «El prompt nombra "logo"» | Reescribe el prompt describiendo la superficie limpia sin esa palabra |
| `ai:inpaint` rechaza `--openai-key` | No existe en ese comando: usa `OPENAI_API_KEY_PROFILE=personal` delante |
| Quedó parte del texto tras el retoque | La máscara no cubría toda la banda: segundo paso sobre el resultado con una máscara más amplia |
| `exportar.mjs` falla en `toWebpUnder` | La foto tiene mucho detalle fino. Exporta desde una copia con desenfoque leve, subiendo σ por pasos |
| `exportar.mjs` dice que la salida va bajo `projects/sky/<pieza>/` | Cambia `--out` a una carpeta dentro de la pieza |
| Shutterstock responde con el tope de consultas | Son 100 por hora; espera la hora de la cabecera `RateLimit-Reset` y licencia en lote |
| Wikimedia devuelve error o archivos vacíos | Baja más despacio, con User-Agent identificado; pide la miniatura en un ancho estándar o el original |
| El buscador trae otro país con el mismo nombre | Lee la descripción y busca en Wikimedia el lugar real |
| `componer-ruta` dice que la ruta no cabe en el ancho | Usa la receta A en ese formato o acorta el titular; nunca achiques la letra |

## Referencias técnicas

- Línea gráfica, invariantes y flujo: [`sky-blog-graphic-line/SKILL.md`](../../../.claude/skills/sky-blog-graphic-line/SKILL.md).
- Lote paso a paso con scripts: [`references/workflow.md`](../../../.claude/skills/sky-blog-graphic-line/references/workflow.md) §9.
- Portada, expansión y exportación: [`references/hero-and-export.md`](../../../.claude/skills/sky-blog-graphic-line/references/hero-and-export.md).
- Referencias reales: [`references/sources.md`](../../../.claude/skills/sky-blog-graphic-line/references/sources.md) §5.
- Retoque de letras y revisión de un lote: [`references/qa-review.md`](../../../.claude/skills/sky-blog-graphic-line/references/qa-review.md).
- Banners de ruta: [`references/route-banners.md`](../../../.claude/skills/sky-blog-graphic-line/references/route-banners.md).
- Caso de noviembre 2026: [`LOTE_NOVIEMBRE_2026_PRODUCCION_IMAGENES.md`](../../services/sky-blog-seo/LOTE_NOVIEMBRE_2026_PRODUCCION_IMAGENES.md).
- Editar una zona con `ai:inpaint`: [manual](../ai-tooling/editar-una-zona-de-una-imagen.md). Clave OpenAI: [manual](../ai-tooling/alternar-clave-openai.md).
