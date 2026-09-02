# Home y landings: metadatos, schema y evidencia

Aprendizajes de la Home Efeonce, 2026-08-30. Método reutilizable; los IDs, hashes, textos y snapshots
del caso viven en `docs/audits/public-site/2026-08-30-home-seo-aeo.md`, no son defaults para otra página.
Carga esta referencia junto a `modules/01_SEO_TECHNICAL.md`; para escribir en WordPress carga también
`efeonce-public-site-wordpress` y su referencia de mutación. Auditar no autoriza publicar.

## 1. Diagnosticar antes de agregar

- Declara URL, intención, motor objetivo, muestra y alcance: una Home y sus enlaces inmediatos no son
  un crawl completo ni una auditoría de backlinks. No inventes volumen, lift o scores de priorización.
- Lee HTML público sin sesión, cabeceras, redirects, robots y sitemap. Compara con lo persistido en CMS:
  un campo vacío puede heredar un valor; un campo correcto puede seguir sirviendo una caché antigua.
- Inventaría title, description, canonical, robots, OG, Twitter y todos los bloques JSON-LD reales.
  No busques `@type` dentro de payloads escapados ni deduzcas ausencia por un único regex.
- Separa metadatos de página de identidad global, theme/header/footer y otras landings. Hallazgos fuera
  de alcance van a un backlog con evidencia; no cambies esos planos por una corrección local.

## 2. Redacción sin forzar la página

H1, título SEO y título social cumplen roles distintos. Pueden diferir manteniendo identidad e intención:
H1 expresivo, SEO claro sobre la categoría/oferta, social útil fuera del contexto de la web.
Corrige títulos como «Home» y descripciones heredadas cuando no representan el contenido actual.
No reescribas un título que ya funciona sólo para satisfacer un semáforo o una longitud rígida.
La descripción resume capacidades verificables y una diferencia relevante; evita listas de keywords,
promesas de rendimiento y repetir el H1 por obligación. Google puede generar otros títulos/snippets.

## 3. Un dueño por entidad, no más schema por defecto

1. Identifica al productor del grafo (en la Home, Yoast). Conserva IDs estables y relaciones
   `WebPage.isPartOf`, `WebPage.about`, `WebSite.publisher`, imagen y breadcrumb cuando correspondan.
   No pegues otra Organization desde Elementor ni crees entidades paralelas para completar un checklist.
2. Un grafo de página/sitio/organización puede ser suficiente para una portada de agencia. Añade tipos
   sólo cuando describan contenido real y exista un consumidor/objetivo justificado. Un servicio específico
   puede tener su propia landing; no convertir automáticamente toda la agencia en un Service genérico.
3. Confirma razón social, logos, perfiles, contactos y hechos corporativos con su dueño. JSON válido no
   certifica esos datos. No inventes LocalBusiness, ratings, reseñas, productos u ofertas; los dashboards
   ilustrativos y testimonios sin respaldo no son fuentes de AggregateRating.
4. Un showreel en modal no exige VideoObject. Verifica metadatos reales, accesibilidad del video y
   propósito de la página antes de decidir; una Home no equivale a una watch page elegible en Google.
   Esto no es una prohibición universal de describir videos secundarios.
5. FAQ visible en HTML y abrible por la persona conserva valor aunque no tenga rich result.
   Google retiró FAQ rich results el 7 de mayo de 2026; FAQPage sigue siendo un tipo de Schema.org.
   No agregues ese marcado por una promesa de resultado enriquecido ni borres FAQ útiles por el retiro.
6. Google no exige schema especial de IA ni llms.txt. No extrapoles esta regla a todos los consumidores;
   un archivo para otro sistema necesita caso de uso y mantenimiento, no una promesa SEO.

## 4. Persistencia WordPress/Elementor

- Para cambios autorizados, usa campos nativos del plugin SEO. En Yoast, inspecciona los seis campos
  de title/metadesc/opengraph-title/opengraph-description/twitter-title/twitter-description, con prefijo
  `_yoast_wpseo_`; no fuerces todos si la herencia ya sirve el resultado correcto.
- Snapshot previo con existencia y valor de cada meta, identidad/status/portada y configuración protegida.
  Para contenido o medios Elementor: ownership/hash + widget/control exacto, `Document::save(elements, settings)`,
  comparación del árbol decodificado y preservación de Ohio, thumbnail y demás páginas.
- Reconstruye indexables afectados y limpia/purga caché por el carril autorizado cuando corresponda.
  Relee persistencia y HTML público. No despliegues todo un plugin para cambiar metadatos.
- Rollback exige lectura de drift y restaura sólo campos modificados, eliminando overrides antes inexistentes.
  Un writer de checkpoint con hash previo no es idempotente ni se reejecuta tras una respuesta incierta.

## 5. Evidencia y cierre

- Comprueba valores y unicidad de metadatos; canonical/robots coherentes con sitemap y redirects.
- Parsea JSON-LD, valida IDs/referencias y compara valores con el contenido/fuente. Distingue
  sintaxis, semántica, elegibilidad de una feature y resultados efectivos. Registra si ejecutaste o no
  Rich Results Test, Schema.org Validator y GSC; un parser local no sustituye esas herramientas.
- Verifica H1/encabezados, FAQ/contenido en HTML, anchors, destinos relevantes y recursos HTTPS.
  HTTP 200 no descarta soft-404. ALT describe la imagen; copias decorativas pueden usar ALT vacío.
- Prueba render anónimo y responsive cuando cambie la presentación. Una barra WP autenticada puede
  contaminar el overflow: informa contexto y medidas, no certifiques móvil anónimo desde esa sesión.
  Falta de width/height no prueba CLS si CSS reserva espacio; mide antes de diagnosticar.
- Indexabilidad técnica no prueba indexación; ésta requiere observación GSC. CWV requiere datos de campo;
  lab, Lighthouse, capturas y velocidad percibida son evidencias distintas. AEO necesita consultas repetibles
  por motor/fecha/fuentes, no garantías de citas por tener schema.
- Entrega qué cambió, qué se verificó y qué queda abierto. Conserva snapshots/recovery y enlaza el audit.
  Un checker de contrato de una Home no debe imponer sus textos/tipos exactos a todas las páginas.

## Fuentes primarias

Reverificadas el 2026-08-30; revisar disponibilidad de features antes del próximo entregable.

- [Títulos](https://developers.google.com/search/docs/appearance/title-link) y
  [snippets](https://developers.google.com/search/docs/appearance/snippet).
- [Organization](https://developers.google.com/search/docs/appearance/structured-data/organization).
- [AI features](https://developers.google.com/search/docs/appearance/ai-features).
- [Actualizaciones: FAQ y llms.txt](https://developers.google.com/search/updates).

