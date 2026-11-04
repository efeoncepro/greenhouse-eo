# Responder un aviso de datos estructurados de Search Console

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** 2026-11-04 por Claude (aviso de rutas de exploración en la portada)
> **Ultima actualizacion:** 2026-11-04 por Claude
> **Documentacion tecnica:** [Home §Delta 2026-11-04 — `BreadcrumbList` de un solo elemento](../../architecture/public-site/HOME_INICIO_ELEMENTOR_MODULES_V1.md#delta-2026-11-04--breadcrumblist-de-un-solo-elemento) ·
> [identidad SEO del sitio y mu-plugins](../../../.claude/skills/efeonce-public-site-wordpress/references/runtime-and-discovery.md) ·
> [SEO técnico: datos estructurados](../../../.claude/skills/seo-aeo/modules/01_SEO_TECHNICAL.md)
> **Documentacion funcional:** [Home de Efeonce — Cómo la lee Google](../../documentation/public-site/home-efeonce-la-orbita.md#cómo-la-lee-google-datos-estructurados)

## Para qué sirve

Cuando Google Search Console manda un correo del tipo «Datos estructurados de *<tipo>* — Falta el campo "*X*"» (o
«Se han detectado problemas nuevos») para `efeoncepro.com`, este manual dice cómo confirmar qué páginas fallan de
verdad, cómo distinguir un error real de un caso válido, dónde corregirlo y cómo cerrar el aviso en Search Console.

Caso fuente: el 2026-11-04 llegaron tres correos iguales por «Rutas de exploración — Falta el campo "item" (en
"itemListElement")». Fallaba sólo la portada (1 de 113 URLs) y se corrigió con un mu-plugin.

## Antes de empezar

- **El correo no dice qué URL falla ni cuántas.** No toques nada hasta barrer el sitio completo: arreglar «a ojo» la
  página que se te ocurre deja las demás rotas, o rompe las que estaban bien.
- **Yoast es dueño del grafo.** El JSON-LD del sitio lo emite Yoast SEO; las landings y widgets no emiten el suyo. La
  corrección va casi siempre por un filtro de Yoast en un mu-plugin versionado del repo runtime, no editando páginas.
- **Varios correos iguales** suelen venir de varias propiedades de Search Console del mismo sitio (dominio y prefijo de
  URL). Es una inferencia razonable, no algo verificado; cada propiedad se valida por separado.
- Necesitas `python3` (viene en macOS). El barrido sólo lee páginas públicas: no escribe en el sitio.

## Paso a paso

1. **Lee el correo y anota el tipo y el campo.** Por ejemplo: tipo «Rutas de exploración» = `BreadcrumbList`; campo
   «item» dentro de «itemListElement».

2. **Barre todas las URLs del sitemap** extrayendo **sólo** los bloques `<script type="application/ld+json">` del HTML
   crudo. No des-escapes otros scripts de la página para buscar JSON-LD: inventan tipos que Google no ve. El script de
   abajo revisa rutas de exploración; para otro tipo, cambia el bloque que filtra `BreadcrumbList`.

   ```bash
   python3 -I - https://efeoncepro.com <<'EOF'
   import json, re, sys, urllib.request
   SITE = sys.argv[1]
   UA = {"User-Agent": "Mozilla/5.0 (barrido-schema)"}
   get = lambda u: urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=30).read().decode("utf-8", "replace")
   locs = lambda xml: re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", xml)
   urls = []
   for sm in locs(get(f"{SITE}/sitemap_index.xml")):
       urls += locs(get(sm))
   LD = re.compile(r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', re.S | re.I)
   def nodes(x):
       if isinstance(x, dict):
           yield x
           for v in x.values(): yield from nodes(v)
       elif isinstance(x, list):
           for v in x: yield from nodes(v)
   problemas = validos = 0
   for u in urls:
       try: html = get(u)
       except Exception as e: print("ERROR", u, e); continue
       for bloque in LD.findall(html):
           try: data = json.loads(bloque)
           except ValueError: print("JSON-INVALIDO", u); problemas += 1; continue
           for n in nodes(data):
               if n.get("@type") != "BreadcrumbList": continue
               items = n.get("itemListElement") or []
               for i, it in enumerate(items):
                   if "item" in it: continue
                   if len(items) > 1 and i == len(items) - 1: validos += 1; continue
                   problemas += 1
                   print("FALTA-ITEM", u, f"posicion={it.get('position')}", f"de={len(items)}", it.get("name"))
   print(f"urls={len(urls)} problemas={problemas} ultimos_sin_item_validos={validos}")
   EOF
   ```

   Resultado del 2026-11-04 después del fix: `urls=113 problemas=0 ultimos_sin_item_validos=111`. Antes del fix
   aparecía una sola línea `FALTA-ITEM https://efeoncepro.com/ posicion=1 de=1 Portada`.

3. **Clasifica cada hallazgo** con la tabla de la sección siguiente. Si todo sale válido, el aviso puede ser antiguo
   (Google ya volvió a rastrear) o venir de una URL fuera del sitemap: revisa en Search Console el informe del tipo
   (Mejoras → *<tipo>*) y abre los ejemplos que muestra.

4. **Confirma la causa en el HTML servido**, no en el editor: `curl -s https://efeoncepro.com/<ruta>` y busca el bloque
   `application/ld+json`. Anota la versión de Yoast (aparece en el comentario `<!-- This site is optimized with the
   Yoast SEO ... -->`).

5. **Corrige en el lugar dueño.** Si lo emite Yoast, la vía es un filtro de Yoast (`wpseo_schema_<pieza>`) en un
   mu-plugin del repo runtime `efeoncepro/efeonce-public-site-runtime`, acotado al caso que falla (que no toque los
   casos válidos). Se instala con un script de `scripts/public-website/` por `pnpm public-website:wpcli -- --eval-file
   ... --input-file ...`, con verificación de sha256, `wp cache flush` y `wp kinsta cache purge --all`. Patrón de
   referencia: `install-breadcrumb-single-item-mu-plugin.php` (ver la documentación técnica). Escribir en el sitio en
   vivo requiere la aprobación del operador.

6. **Verifica en vivo y vuelve a barrer.** Espera 1 a 2 minutos tras la purga de Kinsta, mira el bloque corregido en la
   URL afectada y repite el paso 2 completo: el contador `problemas` debe quedar en 0 y `ultimos_sin_item_validos` no
   debe cambiar (si cambió, la corrección tocó casos válidos).

7. **Cierra el aviso en Search Console.** En cada propiedad que avisó: Indexación/Mejoras → informe del tipo (por
   ejemplo «Rutas de exploración») → abre el problema → **Validar corrección**. Google tarda días en confirmar y avisa
   por correo. Opcional: probar la URL en la Prueba de resultados enriquecidos de Google y
   [solicitar su indexación](solicitar-indexacion-search-console.md) para que la vea antes.

## Qué significan las señales

| Caso en `itemListElement` | ¿Válido para Google? | Qué hacer |
| --- | --- | --- |
| Lista de 2 o más elementos; sólo el **último** sin `item` | Sí. El último es la página actual | Nada |
| Lista de **un solo** elemento sin `item` (la portada) | No. Es primero y último a la vez: error crítico | Completar `item` con la URL de la página |
| Elemento **intermedio** (ni el último) sin `item` | No | Corregir la ruta que arma Yoast para esa plantilla |
| `JSON-INVALIDO` | No: Google ignora el bloque entero | Buscar quién emite ese bloque (plugin, widget, tema) |
| `ERROR` al leer una URL | No dice nada del schema | Revisar la URL (redirección, 404, bloqueo) y repetir |

Estado del sitio al 2026-11-04: `problemas=0`; las 111 rutas con el último elemento sin `item` son válidas.

## Qué no hacer

- No corregir antes de barrer el sitemap completo.
- No agregar un `BreadcrumbList` propio desde widgets o plantillas: duplica el de Yoast y confunde a Google.
- No completar `item` en el último elemento de las rutas largas «por si acaso»: es válido sin él y un cambio global
  aumenta el riesgo sin beneficio.
- No editar archivos en Kinsta a mano ni dejar un mu-plugin fuera del repo runtime: sin versión no hay rollback.
- No des-escapar todo el HTML ni leer scripts que no sean `application/ld+json` para «encontrar» JSON-LD.
- No dar el aviso por cerrado sin «Validar corrección» en cada propiedad.

## Problemas comunes

| Síntoma | Causa probable | Qué hacer |
| --- | --- | --- |
| Llegaron 2 o 3 correos idénticos | Varias propiedades de GSC del mismo sitio (inferencia) | Validar la corrección en cada una |
| El barrido sale limpio pero GSC sigue mostrando el error | Google aún no vuelve a rastrear | «Validar corrección» y, si urge, solicitar la indexación de la URL |
| La corrección no se ve en vivo | Caché de Kinsta u opcache | Esperar 1 a 2 minutos más tras `wp kinsta cache purge --all` |
| Tras una actualización de Yoast vuelve el aviso | Yoast cambió la forma del nodo y el filtro dejó de calzar | Repetir el barrido, revisar el HTML servido y ajustar el mu-plugin |
| El barrido no encuentra el sitemap | Yoast cambió la ruta del índice | Abrir `https://efeoncepro.com/robots.txt` y usar la línea `Sitemap:` |

## Rollback del fix de la portada

Borrar `wp-content/mu-plugins/efeonce-breadcrumb-single-item.php` en Kinsta, luego `wp cache flush` y
`wp kinsta cache purge --all`. La portada vuelve a emitir el `ListItem` sin `item` (y el aviso volverá).

## Referencias técnicas

- Contrato del mu-plugin, instalación y evidencia:
  [Home §Delta 2026-11-04](../../architecture/public-site/HOME_INICIO_ELEMENTOR_MODULES_V1.md#delta-2026-11-04--breadcrumblist-de-un-solo-elemento).
- Instalador: [`install-breadcrumb-single-item-mu-plugin.php`](../../../scripts/public-website/install-breadcrumb-single-item-mu-plugin.php).
- Datos estructurados y breadcrumbs en la skill SEO:
  [`01_SEO_TECHNICAL.md`](../../../.claude/skills/seo-aeo/modules/01_SEO_TECHNICAL.md).
- Solicitar la indexación de una URL: [manual](solicitar-indexacion-search-console.md).
