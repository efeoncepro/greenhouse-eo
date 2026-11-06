# Glitch Flash — Images 2.6

Estado real al 2026-11-05: **borrador editorial y preview multimedia locales; sin escritura ni publicación en WordPress**. No hay aprobación del texto final ni excepción `press` aprobada. No se programaron redes, envíos ni campañas.

## Resultado revisable

- [Artículo](./articulo.md): aproximadamente 3.000 palabras, 11 secciones, cuatro Glitch Drops y un Destacado. Voz propuesta para Julio, sin inventar experiencias personales.
- Preview local: `ai-generations/2026-11-05_glitch-flash-images-2-6/revision.html`. Siete recursos visuales, incluidos antes/después, GIF y SVG; dos videos Vimeo oficiales. Incluye imagen del anuncio y ejemplos de la guía, distinguidos en sus créditos.
- [Spec Gutenberg](./article-spec.json): texto estructurado con índice, dos tablas, Drop nativo, Destacado y lista de pasos. Las ranuras de medios se representan temporalmente con enlaces reales, **no con IDs inventados**.
- [Plan de medios](./media-plan.json): fuente, crédito, ALT, dimensiones e inserción por sección. Los archivos originales están en `ai-generations/2026-11-05_glitch-flash-images-2-6/media/`.
- [Investigación y claims](./research.md): fuentes oficiales, condiciones, discrepancias y límites de atribución.

Tesis propuesta: el valor del lanzamiento se evalúa en las correcciones y en el camino hasta una pieza aprobada. Es interpretación editorial pendiente de Julio; no una conclusión de un ensayo experimental. No se invocaron modelos generativos ni se hicieron pruebas pagadas para este artículo. Los canarios previos de otro carril no se incorporaron como experiencia del autor.

## Verificación realizada

- Lanzamiento oficial 4/11/2026, nombres exactos, acceso, precios, controles y límites contrastados con fuentes primarias.
- Revisión por subagentes de investigación, recursos multimedia y voz editorial.
- `pnpm public-website:ssh-check`: OK. Readback exclusivo: autor 1 = Julio Reyes; categoría Glitch = 183; búsqueda en todos los estados con `2.6` sin candidatos. Esto no sustituye una búsqueda por manifest/slug antes de crear el post.
- Content Factory dry run: **PASS**, 81 bloques; índice de 11 H2, cuatro Drops sin redundancia detectada. Información esperada `blogpost_media_slot_recommended`: el spec aún no contiene attachments porque los medios no se subieron. No confundir PASS estructural con artículo listo para publicar.
- Preview a 1440 y 390 px: un H1, cuatro Drops, siete imágenes cargadas, dos iframes, índice con destinos válidos; ancho de documento igual al viewport en ambos tamaños. Capturas en `output/playwright/glitch-images26-review/`.
- Video de montaje Vimeo: el agente de medios verificó reproducción (7 s, tiempo avanzando, readyState 4, sin error). La comparación de latencia es material oficial a **8×**, señalado en caption y texto.
- Enlaces por HTTP: 11 destinos con 200; OpenAI anuncio 2.6/2.5 y Help devolvieron 403 al cliente de terminal, pero su contenido se consultó mediante herramienta web. No se clasifican esos 403 como enlaces rotos. Resultados en `ai-generations/2026-11-05_glitch-flash-images-2-6/link-check.json`.
- La comprobación del preview local no es QA del tema Ohio ni readback de un post privado/publicado.

## Siguiente fase, tras aprobación editorial

Manifest estable propuesto: `greenhouse-cf-glitch-flash-images-2-6`; slug `glitch-flash-images-2-6`; categoría y primaria Glitch. El spec conserva `noindex` para revisión; revisar su política al publicar.

1. Julio revisa tesis, texto, primera persona, CTA, disclosure y selección de fuentes. Aprobar el uso editorial de recursos oficiales con crédito para este Flash si no se aporta una licencia de reutilización.
2. Componer la portada y el banner interno con `pnpm glitch:compose` y su manifest Flash, sin número. Candidato visual: poster oficial del montaje; titular propuesto `Images 2.6` / `la prueba empieza en la segunda corrección`. Registrar la excepción `press` sólo después de la decisión real del operador; nunca completar una aprobación por inferencia.
3. Antes de escribir, repetir búsqueda por manifest, slug, título y variantes de canonical, incluido Think. Verificar autor y términos efectivos. La URL candidata no se presenta como una página existente.
4. Subir archivos aprobados mediante el wrapper; leer IDs, MIME, URL y dimensiones. Insertar imágenes reales en las posiciones de `media-plan.json`, validar de nuevo y crear un único post **privado** con el manifest estable y autor verificado.
5. Vimeo: el preview local usa iframes oficiales. El ArticleSpec actual sólo admite YouTube; su alternativa soportada es imagen vinculada al reproductor y botón. Antes de prometer Vimeo incrustado en el post, comprobar la vía nativa gobernada. No instalar plugins ni introducir HTML libre para sortear el contrato. Si se requiere ampliar el builder, tratarlo como trabajo separado con el alcance y la verificación correspondientes.
6. Snapshot antes de enriquecer/revisar; categoría, primaria, portada, Yoast, ALT y créditos; preview privado real a 1440/390 y QA de medios, TOC, autor y overflow.
7. Con autorización de publicación de la versión final: fecha real de publicación, snapshot y rollback a privado, purga gobernada y readback anónimo de contenido, robots, canonical, OG, schema y sitemap.

La preview es una maqueta editorial de revisión, no una portada oficial compuesta ni una réplica del runtime Ohio. La autorización para crear un privado no implica publicar.

## Reproducir localmente

```sh
node docs/public-site/glitch-flash-images-2-6/build-review.mjs
pnpm public-website:content-factory:run -- --spec docs/public-site/glitch-flash-images-2-6/article-spec.json --out ai-generations/2026-11-05_glitch-flash-images-2-6/validated-draft.json
python3 -m http.server 8793 --bind 127.0.0.1 --directory ai-generations/2026-11-05_glitch-flash-images-2-6
```

Abrir `http://127.0.0.1:8793/revision.html`. Los archivos de medios y fuentes tipográficas son locales; la reproducción de Vimeo necesita conexión. No se modificaron runtime, plugins, configuración, árbol de otros trabajos ni historial de Git.
