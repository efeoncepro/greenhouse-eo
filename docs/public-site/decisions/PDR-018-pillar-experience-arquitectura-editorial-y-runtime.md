# PDR-018 — Pillar + Cluster Experience: arquitectura editorial, conversión y runtime

> **Tipo:** Product Decision Record (arquitectura editorial + placement de superficie + gobernanza).
> **Estado:** Accepted — 2026-07-16 (operador).
> **Skills:** `content-marketing-studio`, `seo-aeo`, `efeonce-public-site-wordpress`,
> `growth-marketing-cro`.
> **Deriva de:** [PDR-003](PDR-003-layering-ecosistema-digital-efeonce.md) (Think como producto de demand gen),
> [PDR-014](PDR-014-creative-workflows-territorio-editorial-pillar-cluster.md) (primer caso editorial),
> [PDR-017](PDR-017-content-engineering-territorio-editorial.md) (doctrina de experiencia) y
> [Astro Runtime Strategy](../../architecture/GREENHOUSE_PUBLIC_SITE_ASTRO_RUNTIME_STRATEGY_DECISION_V1.md)
> (WordPress como origen editorial y Astro en el dominio principal como frontend objetivo).
> **Frontera:** decide qué es una Pillar, cómo se relaciona con su cluster y cómo elegir superficie/runtime.
> No autoriza migraciones, nuevas rutas, Elementor writes, custom blocks, deploy ni publicación.

## 0. La decisión, en una línea

**Una Pillar de Efeonce nace como una Pillar Experience: hogar durable de un territorio de conocimiento que
permite aprender, explorar y decidir; pertenece al producto editorial Think cuando su trabajo es autoridad y
demand generation, pero su canonical no se asigna automáticamente al subdominio `think.efeoncepro.com`.**

El CMS, el post type y el page builder son decisiones de implementación. Una `page` de WordPress no se convierte
en Pillar por llamarse página, y un `post` no deja de ser Pillar si posee la función, arquitectura y gobernanza
correctas.

## 1. Qué sigue vigente del modelo histórico

El modelo Pillar/Cluster conserva valor porque organiza un tema como red, no como feed cronológico:

- una pieza ancla cubre el mapa amplio y posee la definición canónica;
- los satélites resuelven preguntas o trabajos independientes con mayor profundidad;
- los enlaces contextuales y bidireccionales hacen explícita la relación semántica;
- el cluster se mantiene y mide como sistema, no como acumulación de keywords.

Las formas históricas siguen siendo útiles como materiales, no como arquitectura completa:

| Modelo | Qué conserva | Qué no basta en 2026 |
|---|---|---|
| **10X Content Pillar** | Fuente propia abierta, profunda y valiosa | Longitud, exhaustividad o diseño por sí solos no producen utilidad ni diferenciación |
| **Resource Pillar** | Biblioteca curada y bookmarkable | Una lista de enlaces no orienta por intención ni reduce incertidumbre |
| **Topic Cluster Hub** | Mapa amplio + satélites + enlaces internos | El hub no debe ser una taxonomía decorativa ni una colección de cards manuales |
| **Service/Category Pillar** | Ordena una categoría comercial y reparte a ofertas específicas | No reemplaza una Pillar editorial de autoridad; tiene otro JTBD y otra presión de conversión |

`10X` queda como ambición de **valor diferencial**, no como instrucción de escribir diez veces más. La vara actual
es aportar información original, evidencia, claridad, experiencia real, navegación útil y capacidad de completar
un trabajo.

## 2. Definición canónica

> **Pillar Experience es el hogar canónico y durable de un territorio de conocimiento: una fuente completa para
> personas y agentes, una interfaz para explorar relaciones y, cuando el trabajo lo exige, una ayuda para tomar
> una decisión explicable.**

Opera en tres capas:

1. **Aprender.** Definición, tesis, modelos, evidencia, fuentes, autoría, límites y fecha de actualización.
2. **Explorar.** Rutas por intención, mapa del cluster, enlaces contextuales y profundidad elegible.
3. **Decidir.** Comparadores, frameworks, autoevaluaciones o siguientes pasos sólo cuando reducen una fricción
   real; no toda Pillar necesita interacción.

La Pillar debe seguir siendo útil si JavaScript falla y si todavía no existe ningún nodo del cluster publicado.

### Cluster Experience

> **Cluster Experience es el sistema navegable de experiencias conectadas que permite avanzar alrededor de un
> territorio: aprender, aplicar, evaluar, verificar y decidir, dentro o fuera de las superficies propias.**

La Pillar es el hogar; el cluster es el grafo; un **cluster node** es cada destino autónomo; la **Cluster
Experience** es el recorrido que emerge entre esos nodos. Es una red federada: la Pillar conserva la definición y
el hogar canónicos, mientras los nodos pueden vivir en una superficie propia o ser nativos de una plataforma. El
formato, el host y el ownership no deciden por sí solos la pertenencia. Un nodo puede ser:

| Trabajo | Tipos de nodo posibles |
|---|---|
| **Aprender** | artículo, guía, glosario, video, podcast, carrusel explicativo |
| **Aplicar** | template, checklist, worksheet, generador |
| **Evaluar** | diagnóstico, grader, calculadora, autoevaluación, encuesta con devolución útil |
| **Verificar** | caso, benchmark, dataset, research, entrevista o video con evidencia |
| **Decidir** | comparador, matriz, configurador, webinar, siguiente paso comercial |

Un nodo pertenece al cluster sólo si resuelve un JTBD del territorio, entrega valor autónomo, mantiene una relación
explícita con la Pillar u otro nodo y puede gobernarse con owner, identificador o URL estable, estado, freshness y
medición. Reels, posts, carruseles, pins, videos, Shorts y newsletters pueden ser **platform-native cluster nodes**
de primera clase si cumplen ese contrato; no necesitan una copia en el dominio propio ni se degradan a promoción
por vivir en una plataforma. Una pieza que sólo anuncia, resume o conduce hacia otra sin completar un trabajo sigue
siendo activación. Una tool no entra por ser interactiva y una landing comercial no entra por compartir keywords.
Servicios y productos pueden ser destinos adyacentes de handoff sin convertirse automáticamente en nodos
editoriales.

### Roles multidimensionales, no silos de formato

`cluster node` y `activation node` no son clases mutuamente excluyentes. Son roles que una misma pieza puede
cumplir en momentos distintos. Un carrusel puede activar reconocimiento, responder una búsqueda dentro de
LinkedIn, explicar un modelo de forma autónoma y orientar hacia un comparador. Un reel que sólo dice "lee la
Pillar" puede cumplir únicamente activación.

Cada pieza se clasifica en dimensiones independientes:

- **trabajo y rol:** reconocimiento, comprensión, aplicación, diagnóstico, evidencia, decisión, activación o
  handoff;
- **superficie:** `owned` o `platform-native`;
- **plataforma:** web, newsletter, Instagram, TikTok, X, YouTube, Pinterest, LinkedIn u otra superficie gobernada;
- **ownership:** propio, compartido o alquilado;
- **descubrimiento:** external search, platform search, recommendation, navegación directa o relación editorial;
- **durabilidad:** evergreen, refreshable, campaign-bound o efímero;
- **progreso:** cambio observable que produce y siguiente nodo pertinente.

Esta taxonomía evita dos errores: tratar toda publicación social como nodo por defecto y reducir todo contenido de
plataforma a distribución descartable.

## 3. Placement: Think no equivale al subdominio Think

Hay tres conceptos distintos que el canon anterior mezclaba:

| Concepto | Trabajo | Estado vigente |
|---|---|---|
| **Think, producto de contenido** | Demand generation, nurturing, autoridad, blog, newsletter, tools y lead magnets | Es la capa editorial descrita por PDR-003 |
| **Marketing con Manzanitas** | Marca editorial flagship dentro de Think | Publica artículos, Pillars y series como Glitch |
| **`think.efeoncepro.com`** | Runtime Astro actual para experiencias enfocadas, tools, reportes y muestras | No es el destino automático de toda guía o Pillar |

Por tanto:

- una Pillar editorial pertenece conceptualmente a Think/Marketing con Manzanitas;
- eso no obliga a mover su canonical a `think.efeoncepro.com`;
- el dominio principal `efeoncepro.com` puede renderizar contenido de Think sin convertirlo en una landing
  comercial;
- WordPress puede seguir siendo origen editorial y canonical temporal mientras el frontend público continúe en
  Kinsta;
- el target aceptado es Astro en el dominio principal, renderizando contenido de WordPress cuando el blog y las
  Pillars alcancen paridad;
- `think.efeoncepro.com` se reserva por defecto para tools, diagnósticos, reportes y experiencias cuya identidad o
  contrato justifique una superficie separada.

La decisión de canonical se toma por intención, route ownership, continuidad SEO, capacidad de render y costo de
migración. **Nunca por el nombre del editor ni por una preferencia visual.**

### Reglas por tipo de Pillar

| Tipo de trabajo | Producto/superficie | Canonical por defecto actual |
|---|---|---|
| Autoridad editorial / thought leadership | Think → Marketing con Manzanitas | `efeoncepro.com` en WordPress hasta decisión de hub/cutover; Astro apex como target |
| Hub de recursos editoriales | Think → Marketing con Manzanitas | Igual que contenido editorial; no asumir subdominio |
| Categoría o servicio comercial | Sitio principal / demand capture | `efeoncepro.com/servicios/...` |
| Tool, grader, reporte o muestra enfocada | Think runtime especializado | `think.efeoncepro.com/...` cuando su PDR/ADR lo autorice |

## 4. Arquitectura de la experiencia

Una Pillar Experience puede adaptar el orden a la intención, pero debe resolver estas funciones:

1. **Entrada editorial:** H1 literal, promesa, definición corta, autoría y freshness.
2. **Orientación:** tabla de contenidos y/o rutas por trabajo; no obligar a leer linealmente.
3. **Núcleo canónico:** explicación completa, semántica y citable.
4. **Modelo de comprensión:** tabla, diagrama, disclosure o explicador mínimo que aclare una relación difícil.
5. **Mapa del cluster:** nodos publicados organizados por trabajo, pregunta, etapa o JTBD.
6. **Profundización contextual:** enlaces reales desde la sección donde otro nodo resuelve el siguiente nivel.
7. **Evidencia y límites:** fuentes, casos, método, qué se sabe y qué no.
8. **Preguntas frecuentes:** sólo preguntas visibles y sustantivas, desde una fuente compartida con schema.
9. **Siguiente paso:** suscripción, recurso, tool o conversación como continuidad de la utilidad entregada.

No todas las funciones necesitan ser bloques visuales separados. El layout no debe convertirse en una sucesión de
cards ni en una landing de efectos.

## 5. Enlaces: más que una lista, nunca menos que anchors reales

Los nodos se descubren mediante una combinación de:

- enlaces contextuales con anchor text descriptivo;
- rutas editoriales como `entender`, `diseñar`, `operar`, `medir` o `gobernar`;
- módulos de siguiente lectura donde exista una continuidad real;
- un mapa del cluster que muestre cobertura publicada y no invente destinos vacíos;
- enlaces de retorno desde cada nodo a la definición canónica;
- enlaces laterales sólo cuando resuelven una relación útil.

Cards, mapas y filtros son capas de presentación. Cada destino debe seguir siendo un `<a href>` rastreable y
usable con teclado. No reemplazar la arquitectura de enlaces por eventos JavaScript.

## 6. Registry del cluster

El mapa no se mantiene duplicado a mano en Elementor, Gutenberg, schema y documentos. Debe existir una fuente
estructurada capaz de alimentar render, validación, analytics y schema.

Contrato mínimo conceptual por nodo:

```text
id · pillar_id · node_type · title · canonical_url · status · intent · jtbd · stage
summary · outcome · format · order · relationships · published_at · updated_at
primary_job · entry_state · desired_progress · progress_event · next_best_nodes
conversion_level · commercial_handoff · surface · platform · ownership · node_role
search_intent · query_set · indexing_eligibility · discovery_surfaces · measurement_sources
derived_from · canonical_parent · durability · next_best_node
```

Reglas:

- sólo `published` aparece como destino navegable público;
- `planned` puede existir en roadmap, pero no como enlace vacío;
- las relaciones Pillar↔nodo y laterales se validan en ambas direcciones;
- title, URL, estado y schema no se reescriben manualmente por cada renderer;
- `canonical_url` identifica la URL pública que posee la pieza cuando existe; `canonical_parent` expresa linaje y
  pertenencia, pero no declara una canonical SEO cruzada ni exige duplicar la pieza en el sitio;
- artículos, casos, templates, tools y nodos platform-native comparten el contrato, pero conservan schema,
  runtime, permisos y gates apropiados a su naturaleza;
- `indexing_eligibility` describe condiciones conocidas de elegibilidad, no garantiza indexación ni aparición;
- `measurement_sources` declara qué sistemas pueden observar cada plano sin fusionar métricas incompatibles;
- el registry puede materializarse inicialmente en Content Factory/WordPress y evolucionar sin cambiar el
  contrato editorial.

### Conversión como progresión

Conversión no significa sólo formulario, reunión o compra. En una Cluster Experience es un cambio observable de
estado que acerca a la persona a comprender, decidir o actuar:

| Momento | Cambio que produce |
|---|---|
| **Reconocimiento** | de tensión difusa a problema nombrado |
| **Comprensión** | de información a modelo mental útil |
| **Orientación** | de lectura genérica a ruta pertinente |
| **Aplicación** | de entender a usar un método o recurso |
| **Diagnóstico** | de intuición a estado y brecha explicables |
| **Evidencia** | de interés a confianza informada |
| **Decisión** | de alternativas abiertas a elección defendible |
| **Handoff** | de autoservicio útil a ayuda humana contextualizada |

Cada nodo tiene una conversión natural. Un artículo puede convertir hacia comprensión; un template hacia
aplicación; un caso hacia confianza; una tool hacia diagnóstico; una Pillar hacia orientación; y un servicio hacia
conversación. El compromiso solicitado debe crecer con el valor entregado. No usar el mismo CTA en todo el cluster,
ni pedir datos antes de devolver utilidad proporcional.

La medición sigue la progresión entre momentos y no confunde una interacción con progreso. Opera en tres planos:

1. **External search:** aparición y rendimiento de URLs propias o contenido de plataforma dentro de Google Search,
   Discover y News. Search Console Platform Properties soporta Instagram, TikTok, X y YouTube con rollout gradual,
   y reporta clics, impresiones, CTR y posición por contenido cuando está disponible.
2. **Platform search/recommendation:** búsquedas, términos, impresiones, recomendaciones, guardados y consumo dentro
   de cada plataforma mediante sus analytics nativos. Search Console no reemplaza este plano.
3. **Downstream progress:** progreso posterior gobernado por Efeonce, como visitar otro nodo, usar una tool,
   suscribirse, completar un diagnóstico o iniciar un handoff contextualizado.

Instagram puede permitir que posts y reels públicos elegibles de cuentas profesionales aparezcan en buscadores;
TikTok ofrece Creator Search Insights; YouTube gobierna búsqueda y expone analytics de descubrimiento; Pinterest
opera como superficie de búsqueda/descubrimiento visual con Trends y analytics; LinkedIn ofrece Search Appearances
y analytics de posts, pero al 2026-07-16 no figura entre las Platform Properties soportadas por Search Console.
Estas capacidades son contingentes a elegibilidad, configuración, país, cuenta y cambios de plataforma; deben
verificarse al operar, no convertirse en promesa de indexación.

Growth/CRO gobierna hipótesis, instrumentación, consentimiento y atribución; Content Engineering gobierna la
relación entre conocimiento, trabajo y siguiente paso. Impresiones externas, descubrimiento dentro de plataforma y
progreso downstream se reportan separados antes de construir cualquier lectura agregada.

## 7. Authoring, Elementor y frontend

### Fuente de verdad

La fuente canónica debe seguir siendo estructurada, portable y gobernable. En el runtime actual:

- Gutenberg + Content Factory son el rail preferido para el cuerpo editorial;
- WordPress conserva autoría, revisiones, media, taxonomía y metadata;
- schema se deriva del mismo modelo visible;
- el frontend futuro puede consumir esa fuente de forma headless.

### Papel de Elementor

Elementor puede servir como **shell de composición** o template de transición cuando aporta navegación, ritmo,
responsive y módulos dinámicos. No es la arquitectura ni debe convertirse en una segunda fuente de contenido.

Permitido con gobernanza:

- template dedicado de Pillar que renderice el contenido canónico;
- navegación, bandas editoriales y mapa dinámico del cluster;
- widgets reutilizables que consuman el registry;
- page-level composition validada en desktop/mobile.

No permitido como modelo escalable:

- copiar el cuerpo completo a `_elementor_data`;
- mantener nodos o schema card por card;
- crear una Page duplicada que compita con el post canónico;
- depender de CSS/JS local frágil para semántica, enlaces o contenido crítico;
- convertir Elementor en requisito del frontend objetivo Astro.

## 8. Schema y representación computable

El schema describe la experiencia visible y nace de su misma fuente:

- `Article` o subtipo apropiado para el cuerpo editorial, aunque el CMS use `post` o `page`;
- `WebPage` y, cuando corresponda semánticamente, `CollectionPage` para el hogar del territorio;
- `ItemList` para el conjunto publicado de nodos, aunque sean heterogéneos;
- `BreadcrumbList` para la posición en la arquitectura;
- `Person` y `Organization` para autoría y publisher;
- `FAQPage` sólo cuando existe FAQ visible y elegible, sincronizada desde el mismo modelo.

`CollectionPage` e `ItemList` mejoran la representación semántica, pero no se prometen como rich result. Cada
implementación debe validar output, canonical, sitemap y compatibilidad con Yoast o el renderer objetivo. El mapa
visible puede enlazar nodos platform-native y representarlos en el `ItemList` cuando sea semánticamente correcto;
eso no transfiere su canonical a la Pillar ni garantiza indexación. Schema nunca se usa para declarar piezas que no
aparecen en la experiencia visible.

## 9. Decisiones para los casos vigentes

### Creative Workflows

- Sigue siendo canonical en `https://efeoncepro.com/creative/creative-workflows/`.
- Su post type `post` no invalida su función de Pillar.
- Hoy es una **Document Pillar** sólida y puede evolucionar progresivamente a Pillar Experience.
- No se crea una Page Elementor paralela ni se migra a Think por preferencia de diseño.
- El primer enriquecimiento reusable es el mapa dinámico del cluster cuando existan nodos publicados.

### Content Engineering

- Debe nacer como Pillar Experience y demostrar la doctrina que enseña.
- Pertenece al producto editorial Think/Marketing con Manzanitas.
- Su host, slug y renderer permanecen abiertos hasta resolver research, IA del content hub y route ownership.
- `think.efeoncepro.com` no es el default.
- Si nace antes del cutover Astro, puede usar WordPress como origen/canonical privado y público sólo después de
  resolver URL, template, schema, preview y migrabilidad.

## 10. Alternativas descartadas

- **Toda Pillar debe ser una WordPress Page.** Confunde post type con función editorial y puede perder autoría,
  taxonomía, URL o workflow sin aportar valor por sí solo.
- **Toda Pillar debe vivir en `think.efeoncepro.com`.** Confunde producto de contenido con runtime y fragmenta
  autoridad antes de una decisión de hub/cutover.
- **Toda Pillar debe construirse en Elementor.** Mejora composición puntual, pero introduce lock-in y duplicidad
  si gobierna cuerpo, relaciones y schema.
- **Dejar la Pillar como post largo + lista de links.** Conserva información, pero no resuelve exploración,
  orientación ni mantenimiento del cluster.
- **Crear una app para cada Pillar.** Convierte contenido en producto sin evidencia y multiplica deuda de runtime.

## 11. Consecuencias

- La decisión de formato se separa de la decisión de CMS/runtime.
- Think queda definido como producto editorial y `think.efeoncepro.com` como una implementación especializada.
- Creative Workflows puede evolucionar sin migración ni duplicado.
- Content Engineering obtiene un contrato de experiencia antes de elegir renderer.
- El cluster deja de limitarse a artículos satélite y pasa a admitir nodos editoriales, aplicables, diagnósticos y
  de evidencia bajo un contrato común, incluidos nodos platform-native gobernados.
- El content hub necesita una decisión de IA/route ownership antes de asignar nuevas Pillars a un host definitivo.
- Content Factory deberá poder representar relaciones de cluster antes de automatizar mapas dinámicos; este PDR no
  autoriza todavía esa extensión.

## 12. Reglas duras

- **NUNCA** decidir que una pieza es Pillar sólo por ser `page`, larga o visualmente rica.
- **NUNCA** asumir que Think como producto obliga el subdominio `think.efeoncepro.com`.
- **NUNCA** publicar dos canonicals indexables para el mismo territorio.
- **NUNCA** reemplazar enlaces HTML descriptivos por navegación JS-only.
- **NUNCA** mantener manualmente contenido visible, cluster registry y schema como tres verdades.
- **NUNCA** incluir una tool, landing o recurso en el cluster sólo por compartir tema o keyword.
- **NUNCA** asumir que toda pieza social es sólo distribución ni que toda pieza publicada en una plataforma merece
  ser cluster node.
- **NUNCA** mezclar external search, búsqueda/recomendación de plataforma y downstream progress como si fueran una
  sola métrica de alcance o conversión.
- **NUNCA** tratar clic, apertura o captura de datos como conversión sin progreso y valor devuelto.
- **SIEMPRE** ubicar primero el JTBD en demand gen, demand capture o experiencia; luego elegir host/runtime.
- **SIEMPRE** asignar a cada nodo un trabajo, progreso esperado y siguiente paso proporcional.
- **SIEMPRE** preservar contenido completo, semántica, accesibilidad, autoría, evidencia, freshness y rollback.
- **SIEMPRE** mantener Content Factory en privado y exigir autorización humana explícita para publicar.

## 13. Reabrir la decisión cuando

- se cierre la IA y marca definitiva del content hub;
- Astro alcance paridad de blog/Pillar y exista fecha de cutover;
- `think.efeoncepro.com` cambie explícitamente de tool hub a frontend editorial general;
- el registry de cluster necesite persistencia o ownership técnico propio;
- datos de uso demuestren que una arquitectura más simple resuelve mejor el trabajo.

## 14. Fuentes y contratos relacionados

- [HubSpot — Guide to Topic Clusters & Pillar Pages (modelo histórico 10X/Resource Pillar)](https://cdn2.hubspot.net/hubfs/98635/Guide%20to%20Topic%20Clusters%20%26%20Pillar%20Pages%20-%20Optimize%203.0.pdf)
- [HubSpot — Topic clusters: the next evolution of SEO](https://blog.hubspot.com/marketing/topic-clusters-seo)
- [HubSpot — Pillar page examples](https://blog.hubspot.com/marketing/pillar-page-examples)
- [Ahrefs — Content pillars](https://ahrefs.com/blog/content-pillars/)
- [Google — Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- [Google — Link best practices](https://developers.google.com/search/docs/crawling-indexing/links-crawlable)
- [Google Search Console — About platform properties](https://support.google.com/webmasters/answer/17148418?hl=en-GB)
- [Google Search Console — Add a website or platform property](https://support.google.com/webmasters/answer/34592?hl=en)
- [Meta — Search engine indexing of public professional Instagram content](https://www.facebook.com/help/147542625391305)
- [TikTok — Creator Search Insights](https://support.tiktok.com/en/using-tiktok/growing-your-audience/creator-search-insights)
- [YouTube — How YouTube search works](https://support.google.com/youtube/answer/16090438)
- [YouTube — Understand your content performance](https://support.google.com/youtube/answer/12220281)
- [Pinterest — Trends](https://help.pinterest.com/en/business/article/pinterest-trends)
- [Pinterest — Pin performance and distribution](https://help.pinterest.com/en/business/article/pin-performance-and-distribution)
- [LinkedIn — Search Appearances analytics](https://www.linkedin.com/help/linkedin/answer/a7473929)
- [LinkedIn — Post analytics](https://www.linkedin.com/help/linkedin/answer/a525196)
- [Elementor — Posts and custom post types](https://elementor.com/help/does-elementor-work-with-posts-and-custom-post-types/)
- [Route Ownership Matrix](../../operations/public-site-route-ownership-matrix-20260616.md)
- [WordPress Blog/Content Hub Audit](../../audits/public-site/2026-07-09-wordpress-blog-content-hub-search.md)
