# Imágenes del artículo Efeonce / Google

Versión 2, producida el 2026-10-25 a partir del anuncio aprobado del 19-10. Dirección: impacto cinematográfico azul, símbolos tridimensionales de Gemini y Google Cloud y profundidad de campo. **Las cuatro imágenes finales son completamente sin texto ni wordmarks**, por instrucción del operador: títulos, bajadas y firmas visibles pertenecen a la UI.

## Entrega

| Archivo | Medidas | Papel |
|---|---|---|
| export/efeonce-google-cloud-partner-portada-og.jpg | 2400 × 1260 | Portada destacada, OG, X, schema y relacionados |
| export/efeonce-google-cloud-partner-plate.png | 2560 × 1440 | Base sin texto para tarjetas; foco recomendado 84% 30% |
| export/efeonce-google-cloud-partner-hero.webp | 2400 × 1200 | Hero listo y reservado; no activar en el banner principal |
| export/efeonce-google-cloud-partner-apertura.webp | 1600 × 900 | Apertura visible en el cuerpo del artículo |

Cada archivo tiene su `.alt.txt`. `manifest.json` registra dimensiones, pesos, hashes y procedencia. Los originales generados se preservan en `fuentes/`. Las exploraciones descartadas con texto permanecen únicamente en `fuentes/descartes-con-texto-v1/`, fuera del paquete final.

## Revisión

- `qa/revision-paquete.jpg`: portada completa, recorte cuadrado, hero y simulaciones de tarjetas.
- Las tarjetas son simulaciones locales de encuadre y superposición, no capturas de WordPress. La de 304 × 540 representa el ancho estrecho del riel; hoy Novedades no aparece automáticamente allí.
- Ambos símbolos protagonistas completos dentro del recorte cuadrado central x=570–1830 sobre 2400 px.
- Contraste tipográfico de imagen: no aplica, porque las imágenes finales no llevan texto. Las simulaciones prueban la convivencia con un título HTML superpuesto.
- Revisados visualmente portada completa, recorte cuadrado y tarjeta móvil. La lectura de producción en el sitio se verifica cuando se monte el artículo.

## Método y derechos

- Imagegen integrado para las dos adaptaciones de ambiente raster; fuente de estilo: pieza de partnership aprobada.
- La iteración con wordmarks fue retirada del export. No se usa ningún texto, wordmark ni firma incrustada en las imágenes finales.
- Tipografía de las láminas de revisión y tarjetas simuladas: Poppins del banco AXIS. Sólo es contexto de QA y no se rasteriza en los archivos de producción.
- Se mantiene el alcance del anuncio aprobado. No contiene insignia de nivel ni certificado de Google. No hay personas, testimonios o ceremonia representados.
- Contenido visual asistido por IA; no se afirma exclusividad de la imagen ni indemnidad.

## Reproducción

Desde la raíz de greenhouse-eo:

`node outputs/google-cloud-partner-blog-2026-10-25/imagenes/componer.cjs`

Reutiliza las dos bases ya guardadas; no genera de nuevo ni incurre en llamadas al modelo. Regenera sólo esta entrega local. Logos y archivos de fuente mantienen su ownership y licencias originales.

## Estado

Producción local terminada y lista para revisión visual del operador. Sin subida de medios, sin modificación de WordPress y sin activación del hero. La publicación y el montaje del artículo pertenecen a la fase siguiente.

Prompts finales: `fuentes/prompts-textless-v2.json`. `prompts.md` conserva el historial de las primeras dos bases; la versión 2 prevalece en portada y apertura.
