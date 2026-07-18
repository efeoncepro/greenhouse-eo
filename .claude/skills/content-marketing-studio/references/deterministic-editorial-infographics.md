# Método de infografía editorial determinística

Usar este método cuando una pieza editorial necesite texto, cifras, escalas, conectores, taxonomías o firmas de
marca exactas. La cadena canónica es:

> **contrato editorial y de datos → SVG fuente → SVG de entrega y/o raster justificado → QA original y contextual → manifest → integración**

Es un método de producción y verificación, no un estilo. No obliga fondos, cards, paletas, gradientes, ratios ni
formas comunes entre artículos.

### Gramática visual y skin no son lo mismo

La **gramática** —jerarquía, encoding, superficies, solapamiento, ritmo, crop y responsive— debe poder funcionar
con cualquier tema. El **skin** —paleta, tipografía, materialidad y firma— se decide desde el brief, la marca y el
contexto editorial de cada pieza.

Una paleta de plataforma puede usarse como acento contextual cuando el artículo trata realmente de ella. Por
ejemplo, vino/lavanda/coral/naranja puede reconocer una historia sobre HubSpot; no se convierte por eso en
branding Efeonce ni en default para RevOps, CRM, charts o dashboards. Reutilizar el método nunca autoriza a
reutilizar automáticamente el skin del precedente.

## 1. Gate de selección

Preferir SVG determinístico cuando el significado dependa de:

- copy, cifras, fechas, denominadores o unidades exactas;
- ejes, escalas, gates, proporciones o relaciones espaciales verificables;
- diagramas de proceso, comparaciones, matrices o taxonomías citables;
- logos oficiales y jerarquía de marca controlada;
- variantes responsive o light/dark que no pueden resolverse con un crop;
- un source editable, auditable y regenerable.

Preferir generación de imagen o ilustración cuando el trabajo sea conceptual, atmosférico, narrativo o
fotográfico y no dependa de texto ni datos exactos. Se pueden combinar ambos métodos: base conceptual generada y
labels/branding determinísticos. No pedir a un modelo de imagen que rasterice cifras, ejes, claims o logos.

Si la pieza requiere encoding estadístico o visualización analítica compleja, `dataviz-design` gobierna el
encoding; este método gobierna su producción editorial, derivados y QA.

## 2. Contrato antes del SVG

Congelar primero:

- `conceptId`, slot, contexto exacto y trabajo editorial;
- `explanatoryDelta`: qué mecanismo, relación, decisión o frontera hace visible que el párrafo, lista o tabla
  adyacente no entrega con igual claridad;
- afirmación que debe entenderse en menos de diez segundos;
- datos, fuente, fecha de corte, denominadores, unidades y límites;
- qué no demuestra la pieza;
- ALT, caption y descripción preliminares;
- columna real del artículo y destinos derivados;
- política de firma de marca y activos oficiales;
- criterios de descarte.

Si `explanatoryDelta` sólo puede decir “resume”, “ilustra” o “decora” el contenido, no producir la infografía.
Riqueza no significa sumar cards, flechas o cifras: significa transformar evidencia en una comprensión nueva y
verificable. El manifest debe declarar este campo y el gate mecánico lo exige, pero la revisión humana sigue
decidiendo si el delta es real o una paráfrasis disfrazada.

### Gate obligatorio de entrega

No confiar en que el agente recuerde el precedente. Cada asset debe declarar un `deliveryContract` machine-readable:

```json
{
  "viewport": "art_directed | single_composition | crop_safe",
  "theme": "light_dark | single_theme",
  "canvas": "transparent | opaque",
  "skin": "efeonce_core | contextual_platform | contextual_client | campaign_specific",
  "rationale": "por qué estas decisiones corresponden al slot real"
}
```

- `art_directed` exige variantes desktop y móvil.
- `light_dark` exige variantes de ambos temas; si también hay art direction, exige las cuatro combinaciones.
- `transparent` exige alpha verificado en master y derivado, no sólo ausencia aparente de un rectángulo.
- `contextual_platform` y `contextual_client` sólo pueden usar señales cromáticas de esa entidad cuando el tema
  realmente trata de ella; no se convierten en branding Efeonce ni en default para el siguiente artículo.
- `campaign_specific` queda limitado a la campaña declarada. Reutilizar la gramática nunca autoriza heredar el skin.
- `single_composition`, `crop_safe`, `single_theme` u `opaque` son decisiones válidas, pero nunca defaults silenciosos.
- Al cerrar, ejecutar `pnpm content:visual-manifest:lint -- <manifest.json>` y conservar el resultado en QA.

El gate valida presencia y coherencia contractual. No reemplaza inspección visual sobre fondos reales ni QA del
`<picture>` dentro del theme.

Para una visual cuantitativa, verificar aritmética y escala antes de diseñar. No truncar ejes ni amplificar un
cambio pequeño para hacerlo más dramático. El sistema visual sirve a la conclusión; no la fabrica.

## 3. Diseñar el source SVG

El SVG fuente debe:

- declarar `width`, `height` y `viewBox` explícitos;
- incluir `role="img"`, `<title>` y `<desc>` útiles;
- usar texto determinístico, no texto convertido accidentalmente por un generador;
- mantener una jerarquía tipográfica clara y contraste suficiente;
- incorporar sólo logos oficiales, sin redibujarlos ni recolorearlos arbitrariamente;
- en infografías editoriales Efeonce de cuerpo, confinar toda firma de marca al footer: el header y el campo de
  datos no admiten logos, dominios ni watermarks; validar programáticamente que cada asset de marca descienda
  del grupo de footer;
- dejar conectores detrás del copy y evitar clipping/colisiones;
- conservar un fondo explícito cuando el master raster no deba ser transparente;
- usar nombres estables y versionados.

Los assets vinculados por ruta relativa son válidos en el source interno, pero el render debe esperar y comprobar
que cargaron. Si el SVG se publicará directamente, convertir sus dependencias en un paquete portable o integrarlas
de forma gobernada; no publicar un source que dependa de rutas locales.

## 4. Art direction: viewport y tema

No asumir que una sola composición funciona en todas las columnas.

1. Medir el ancho efectivo del contenido en desktop, tablet y móvil.
2. Proyectar altura y tamaño de texto en CSS pixels.
3. Crear composiciones distintas cuando el ratio horizontal vuelve ilegible el móvil o la vertical rompe el
   ritmo de desktop.
4. Crear variantes light/dark deliberadas; no invertir colores ni aplicar filtros CSS al master.
5. Mantener el mismo `conceptId`, datos, ALT y caption entre variantes.

La entrega web debe usar un solo `<picture>` gobernado: `media` para art direction, `srcset` para densidad y una
sola semántica accesible. No insertar dos `<img>` y ocultar uno con CSS.

### Escenas editoriales de producto

Cuando la pieza necesita “sentirse producto” sin ser una captura literal, se puede construir una escena con
superficies analíticas complementarias: una capa posterior entrega contexto/evolución y una frontal sintetiza la
decisión. El solapamiento debe preservar la evidencia importante; la profundidad se obtiene con posición,
contraste y sombra moderada, no con glassmorphism o perspectiva 3D por defecto.

Antes de reproducir una referencia web, inspeccionar sus assets originales —SVG, Lottie, CSS o raster— y medir
geometría, roles cromáticos, transparencia, responsive y motion. Si el original es vectorial y la pieza requiere
texto/gráficos exactos, producirla como SVG en lugar de pedir a un modelo que “imite el look”. El contrato
completo vive en `../../design-studio/modules/11_PRODUCT_STORY_SCENES.md`.

## 5. Render controlado a PNG master

Este paso es **condicional**. Ejecutarlo cuando el destino requiera raster, el SVG incorpore material raster o se
necesite un master para OG/social/compatibilidad. Una infografía vectorial segura y portable puede entregarse
directamente como SVG sin crear PNG/WebP rituales.

Renderizar el SVG en Chromium/Playwright —o el renderer canónico equivalente— usando un viewport igual a las
dimensiones intrínsecas del master.

Antes de capturar:

- esperar `document.fonts.ready` cuando haya webfonts;
- esperar o decodificar logos e imágenes vinculadas;
- confirmar que no existe un asset roto;
- dejar un margen de estabilización si el renderer aún repinta texto o recursos externos;
- capturar en sRGB sin reescalado.

El PNG resultante es el master raster. No capturar a partir de una miniatura, una imagen del chat ni otro
derivado. Registrar renderer, dimensiones, fecha y SHA-256.

## 6. Seleccionar la entrega web

Comparar el SVG optimizado y comprimido con el raster al ancho real. Elegir SVG directo cuando sea seguro,
autónomo, nítido y más liviano; elegir raster cuando el contenido o el runtime lo justifiquen. Para Efeonce,
cargar `../efeonce/EFEONCE_EDITORIAL_INFOGRAPHIC_SYSTEM.md` y ejecutar
`pnpm content:editorial-svg:audit -- <delivery.svg...>` sobre el delivery SVG.

### Vía SVG directa

Separar source editable y delivery portable. El delivery debe tener `viewBox`, dimensiones intrínsecas, cero
scripts/event handlers/`foreignObject`, cero referencias remotas y fuentes controladas. Convertir texto a
contornos cuando la fidelidad tipográfica sea crítica. Conservar ALT/caption en HTML cuando se sirve con `<img>`.

### Vía raster

Crear cada WebP directamente desde su PNG master, nunca desde otro WebP. Ejemplo cuando `cwebp` está disponible:

```bash
cwebp -quiet -q 88 -m 6 input-master-v1.png -o input-web-1600-v1.webp
```

La calidad es un punto de partida, no un número universal. Ajustarla por legibilidad, banding, halos, peso y
destino. Para line-art y texto, priorizar bordes limpios sobre una compresión agresiva.

Naming recomendado:

```text
{slug}-{concepto}-desktop-v1.svg
{slug}-{concepto}-desktop-master-v1.png
{slug}-{concepto}-desktop-web-1600-v1.webp
{slug}-{concepto}-v1.svg
{slug}-{concepto}-master-v1.png
{slug}-{concepto}-web-1200-v1.webp
```

Agregar `-dark-` antes de `master` o `web` para las variantes oscuras. No usar `final-final` ni sobrescribir una
versión publicada con significado visual distinto.

## 7. QA en dos planos

### A. Integridad del archivo

Inspeccionar el SVG de entrega y todo raster requerido a resolución original:

- copy, cifras, fechas y puntuación completos;
- ninguna colisión, clipping, asset roto o conector sobre texto;
- ejes, proporciones y gates fieles a los datos;
- logo correcto, visible, proporcionado y con zona de respeto;
- contraste light/dark y jerarquía equivalentes;
- ausencia de halos, banding o pérdida de nitidez después de rasterizar;
- dimensiones, MIME, peso y hashes reales.

### B. Experiencia contextual

Inspeccionar el master o derivado final al ancho real de la columna:

- legibilidad en desktop y móvil;
- altura y ritmo dentro del artículo;
- ausencia de scroll horizontal;
- convivencia con caption, tema y chrome del sitio;
- selección correcta de viewport y tema;
- ALT/caption presentes en el DOM después de integrar.

La previsualización no sustituye al delivery. Si una preview incrusta un SVG con assets locales, verificar que el
browser realmente los cargó. Para validar firma y compresión, montar el SVG/PNG/WebP final. Una
preview con un logo roto no es evidencia válida aunque el source esté correcto.

## 8. Manifest y provenance

Registrar por variante:

- ruta y SHA-256 del SVG source;
- ruta, hash, dimensiones, MIME, bytes raw/gzip/brotli y auditoría del delivery SVG cuando aplique;
- renderer y fuentes cuando aplique;
- ruta, hash, dimensiones, MIME y espacio de color del PNG master cuando exista;
- ruta, hash, dimensiones, MIME y bytes de cada raster requerido;
- comparación de peso y rationale de formato;
- relación viewport/tema;
- ALT, caption y descripción;
- activos de marca y licencia/provenance;
- estado de QA y hallazgos;
- Media ID/URL sólo después del upload y readback reales.

No inventar hashes, pesos, IDs ni URLs. Verificar que el manifest coincide con disco antes de cerrar.

## 9. Definition of Done

Una infografía está producida cuando:

- el contrato editorial y de datos está congelado;
- existen SVG source y delivery(s) requeridos por variante;
- los raster opcionales provienen del master correcto;
- delivery final y ancho real fueron inspeccionados;
- firma, texto, escala, tema y responsive pasaron QA;
- manifest, ALT, caption, derechos y provenance están completos.
- `explanatoryDelta` se cumple en la entrega final sin depender de la explicación del autor.

No está desplegada hasta que Media Library/CMS, `<picture>`, metadata, performance y QA live tengan readback. El
estado honesto entre ambos momentos es `producción visual completa; integración/publicación pendiente`.

## 10. Antipatrones

- Usar un generador de imágenes para cifras, ejes, labels o logos exactos.
- Diseñar primero y descubrir después que el dato o denominador era otro.
- Truncar una escala para dramatizar el resultado.
- Resolver móvil con crop o texto microscópico.
- Capturar antes de que fuentes y logos terminen de cargar.
- Aprobar desde una preview o thumbnail y no desde el delivery final.
- Convertir WebP desde otro derivado comprimido.
- Rasterizar por costumbre sin comparar un SVG directo seguro y comprimido.
- Mantener sólo el derivado y perder source, delivery o lineage.
- Convertir el lenguaje visual de un caso en regla universal para el blog.

## Precedente

`ANAM-V02` y `ANAM-V03` materializaron el pipeline responsive/light-dark. `ANAM-V6` extendió el método a una
escena editorial de producto: auditoría de SVG/Lottie de referencia, composición vectorial `4:3` dentro de un
master `16:9`, prueba del crop central `1:1`, gráficos y firma determinísticos. La paleta contextual HubSpot
pertenece sólo a ese artículo; la gramática y los gates son lo reutilizable.
