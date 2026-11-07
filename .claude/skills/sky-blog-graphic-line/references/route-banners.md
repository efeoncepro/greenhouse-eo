# Banner de ruta

> Contrato: `contracts/sky-blog-recipes.json → recipes.ruta.*, ruta`. Compositor: `compose/route-banner.mjs`.
> Origen: kickoff SEO del 2026-11-02 (`ai-generations/2026-10-31_kickoff-seo-sky/canvas/project/25-banners.dc.html`
> y `26-banners-reglas.dc.html`), presentado como «ejemplos de estilo, por aprobar con Marca SKY».

## 1. Qué es

El banner acompaña al viajero hasta la ruta. Va al cierre de la parte práctica, antes de las preguntas frecuentes;
máximo dos menciones de ruta por artículo. No cuenta dentro de las 3 editoriales.

| Opción | Composición |
|---|---|
| **A · `ruta.color`** | Morado SKY con resplandor arriba a la derecha, logo, **ruta «{Origen} → {Destino}» en Metric Black (primer elemento de lectura)**, titular secundario en Metric Bold `purple/100`, ruta dibujada (arco punteado con hueco bajo el avión, puntos verdes, jet visto desde arriba orientado por la tangente, códigos IATA) y botón blanco «Ver vuelos a {ciudad} →». Sin etiqueta inferior desde el 2026-11-05 |
| **B · `ruta.foto`** | Mitad color con logo, ruta «{Origen} → {Destino}», titular secundario y botón; mitad foto de la serie del artículo (misma luz que la portada) con etiqueta IATA en chip blanco. **El titular nunca va sobre la foto** |

Formatos: `ruta` 1408×400 y `ruta-movil` 1080×1080, WebP < 150 KB, con ALT.

## 2. El job

```json
{
  "recipe": "ruta.color", "format": "ruta", "slug": "ruta-color-lim-tbp",
  "titular": "Vuela a Tumbes y descubre Zorritos",
  "origen": { "iata": "LIM", "ciudad": "Lima" }, "destino": { "iata": "TBP", "ciudad": "Tumbes" },
  "ruta": { "verificadaEl": "2026-11-02", "fuente": "skyairline.com, búsqueda del día" },
  "alt": "Banner de SKY: vuela de Lima a Tumbes y descubre Zorritos"
}
```

Opción B agrega `"photo": { "file": "../salidas/<foto-aprobada>.webp", "focal": [u, v] }` (sólo desde `projects/sky/`).

**El job no lleva** CTA, etiqueta, colores, fuentes ni coordenadas: el compositor falla si aparecen. El CTA es siempre
«Ver vuelos a {destino.ciudad}». En `ruta.color` escritorio, el CTA va centrado bajo la ruta dibujada
(`cta.align = "route"` en el contrato), sin pasar el margen derecho. Lo pidió Melkin el 2026-11-05; el compositor
reporta `layout.ctaAxis` y la prueba lo exige.

## 3. Lo que falla cerrado

- Copy prohibido en titular, ALT o ciudades: `$`, CLP, USD, S/, precio, oferta, imperdible, descuento, `%`, «Está bueno
  SKY», «desde N», gratis, «mejor que», «más barato».
- IATA que no sean 3 letras mayúsculas; origen = destino.
- Sin `ruta.verificadaEl` (AAAA-MM-DD) y `ruta.fuente`; fecha futura. Más de 7 días desde la verificación = aviso:
  verificar de nuevo el día que se publica.
- Titular de más de 6 palabras (A y B, desde el 2026-11-05) o que no cabe en sus 2 líneas (todos los formatos).
  **No se achica la letra: se acorta el titular.**
- Ruta «Origen → Destino» que no cabe en 2 líneas o en el ancho del formato: el compositor pide usar la receta A o el
  formato móvil. Caso: «Santiago → Río de Janeiro» (Paraty) no cabe en B escritorio; ese formato pasó a A y el móvil
  conserva la foto. Se probó achicar la letra y se revirtió (regla aprobada por Julio el 2026-11-05).
- Titular que choca con la ruta dibujada (móvil A) o con el CTA (B); CTA que no cabe en la mitad de color (B escritorio,
  ciudad muy larga).
- Falta de Metric local: no hay fuente de reemplazo.

## 4. Componer

```bash
cd /Users/jreye/Documents/creative-workbench
node brands/sky-airline/blog/scripts/componer-ruta.mjs projects/sky/<pieza>/jobs/ruta-color.json --out projects/sky/<pieza>/runs
```

Escribe `runs/<uuid>/{<slug>.webp, job.json, qa.json}`. `qa.json` registra copy final, ruta, fuentes efectivas
(PostScript), paleta resuelta, hash de la foto y `approval: pending-human-and-pixel-review`.

## 5. Valores y pendientes de Marca SKY

| Elemento | Valor actual | Pendiente |
|---|---|---|
| Fondo | `purple/500` #78028a | — |
| Resplandor | `purple/400` #9207a9 | El kickoff usó #9b1fae, que no existe en los tokens |
| Puntos de ruta | `green/400` #26de00 | El logo del catálogo deck de Greenhouse usa #00e400: ¿cuál es el oficial? |
| Titular (segundo nivel) | `purple/100` #f1bafc | — |
| Avión | `blog/assets/plane-topview.svg`: jet moderno visto desde arriba (alas en flecha, winglets, dos motores), relleno blanco | No es asset oficial del pack: validar con Marca SKY |
| Tipografía | Metric Black (ruta), Bold (titular, IATA, CTA) | El kickoff mostró Assistant (tema del blog). Si Marca pide Assistant, se cambia en el contrato y el compositor |
| Logo | `sky-logo-on-photo.svg` (blanco + verde), oficial | — |
| Geometría | Kickoff escalado ×1,333 (escritorio) y ×2,571 (móvil); B móvil es nuevo (foto arriba 40 %) | Validación de Diseño |

## 6. Lote de noviembre 2026

44 artículos × 2 formatos = 88 banners (`projects/sky/blog-lote-2026-11/jobs/<id>-ruta.json` y `<id>-ruta-movil.json`),
todos bajo 150 KB, compuestos en `runs/banners/<uuid>/`. Cinco artículos van con foto (receta B): cena chilena, retablo,
Sauce y Yanahuara en los dos formatos, y Paraty sólo en móvil; el resto en receta A. La foto de B sale de la serie
aprobada del artículo (`photo.file` relativo al job y siempre dentro de `projects/sky/`).

- **Fuente de la ruta en el lote:** el catálogo de Notion «Precios y Rutas SKY», sólo filas 🟢 Activa para el mercado del
  lector, consultado el 2026-11-05. `ruta.fuente` lo dice y pide volver a verificar en skyairline.com el día de
  publicación (el compositor avisa a los 7 días).
- **Bloqueados (10):** 8 por ruta no 🟢 Activa para su mercado (Cajamarca, Carnaval de Cajamarca, Chiclayo, Cumbemayo,
  Talara y la noticia de Talara en Perú; Lima en 3 días en Chile; Cancún, con SCL → CUN 🔴 Archivada) y 2 notas de
  puntualidad sin dato por ruta que sostenga una venta. El motivo queda en `specs/MANIFEST.json`; no se compone ni se
  enlaza hasta que Paid / Ad Ops catalogue la ruta.
- **Titular:** lo trae la spec (`banner_titular` del MANIFEST), no el H1.

## 7. Ejemplos de calibración

`projects/sky/blog-linea-grafica/jobs/` (rutas **no verificadas**: son los ejemplos del kickoff). A Lima–Tumbes y B
Santiago–Lima con la portada de Lima; 20–148 KB.
