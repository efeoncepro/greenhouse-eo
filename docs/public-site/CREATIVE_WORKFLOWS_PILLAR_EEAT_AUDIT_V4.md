# Creative Workflows Pillar — E-E-A-T Audit V4

> **Fecha:** 2026-07-15
> **Post WordPress:** `251363`
> **Estado:** V4 publicada en `https://efeoncepro.com/creative/creative-workflows/`; `index, follow`.
> **Spec vigente:** [Creative Workflows Pillar Gutenberg Spec V4](CREATIVE_WORKFLOWS_PILLAR_GUTENBERG_SPEC_V4.json).
> **Alcance:** evidencia, experiencia, autoría, transparencia metodológica, publicación y verificación live.

## Veredicto

La V4 corrige el principal déficit E-E-A-T de la Pillar: ya no descansa sólo en una tesis bien argumentada. El artículo combina tres capas de prueba claramente diferenciadas:

1. **Mercado:** presión de demanda y riesgos percibidos por profesionales creativos.
2. **Investigación:** estudios primarios sobre creatividad, cognición, offloading y redes cerebrales, con muestra y límites visibles.
3. **Experiencia aplicada:** un caso Efeonce/SKY Airline con método, resultados medidos y caveat explícito.

El artículo también identifica quién lo escribe, cómo se construyó, por qué existe y cómo se utilizó IA. La
transparencia se integra en tres párrafos conversacionales antes de las fuentes, no en una checklist visible que
interrumpa el argumento. Las cifras no se presentan como prueba universal ni como validación clínica o causal de
Creative Workflows.

**Estado de cierre:** contenido, metadata, entidad de autor, render desktop/mobile y publicación verificados en vivo.

## Incorporaciones

### Evidencia de mercado

- Adobe/Advanis 2026: encuesta a más de 400 profesionales creativos y más de 400 marketers. El artículo incorpora las preocupaciones reportadas sobre continuidad de marca (`84%`), seguridad comercial (`77%`) y homogeneización (`64%`), junto con el dato de presión de demanda. Se identifica como encuesta declarativa, no como experimento causal. [Fuente primaria](https://blog.adobe.com/en/publish/2026/04/17/creatives-say-ai-helping-them-meet-growing-demand-content-improving-their-work).
- Asana/GWI 2023: muestra de `9.615` knowledge workers; `58%` del día reportado en work about work y estimación de `4,9` horas semanales potencialmente recuperables. Se aclara que es autorreporte y que la muestra no es exclusiva de equipos creativos. [Fuente primaria](https://investors.asana.com/news-releases/news-release-details/asana-anatomy-work-global-index-2023-smart-collaboration-and).

### Evidencia científica

- Doshi y Hauser: `293` personas escribieron historias y `600` evaluadores produjeron `3.519` evaluaciones. El acceso a cinco ideas de IA elevó novedad (`8,1%`) y utilidad (`9,0%`) promedio, mientras las historias se volvieron más similares entre sí. El artículo usa este resultado para explicar el tradeoff exploración/homogeneización, no para prometer productividad. [DOI](https://doi.org/10.1126/sciadv.adn5290).
- Grinschgl et al.: la evidencia de offloading cognitivo se presenta con su diseño experimental y con el costo de memoria posterior. No se extrapola directamente a producción creativa. [DOI](https://doi.org/10.1177/17470218211008060).
- Chen et al.: análisis de `10` datasets y `2.433` participantes en cinco países sobre switching de redes cerebrales. Se declara como asociación correlacional, no como mecanismo causal probado para Creative Workflows. [Fuente primaria](https://www.nature.com/articles/s42003-025-07470-9).

### Experiencia aplicada: SKY Airline

La V4 incorpora el primer caso medido de producción creativa de Efeonce para SKY Airline:

- `178` piezas totales; `66` producidas directamente por Efeonce.
- Cinco mercados: Chile, Perú, Argentina, Uruguay y Brasil.
- `50,4–51,85` horas con el método medido versus `65,75–67,62` horas bajo la estimación tradicional comparable.
- Reducción estimada de `21–25%`, equivalente a `13,9–17,2` horas.
- Piezas madre: reducción estimada de `24–26%`; adaptaciones: `30–40%`.
- Actualización de `27` piezas, incluidos `9` videos, en `10` minutos.
- Exportación de variantes: `5–7` minutos versus aproximadamente `38` minutos.

El texto incluye cuatro límites: es un caso observado, no un experimento controlado; las cifras no son una garantía universal; las piezas completamente nuevas tomaron prácticamente el mismo tiempo; y el beneficio se concentró en repetición, adaptación, actualización y exportación. El caso aprobado vive en Notion: [caso detallado](https://app.notion.com/p/33339c2fefe781179800de0a98364253) y [versión blog aprobada](https://app.notion.com/p/33339c2fefe7817fa28fe56e5cd798d5).

## Who, How, Why

- **Who:** artículo firmado por Julio Reyes, fundador y Managing & GTM Director de Efeonce Group. El perfil WordPress ahora declara más de 12 años diseñando sistemas de marketing, crecimiento y operaciones creativas para organizaciones de Latinoamérica.
- **How:** la guía declara que no es una revisión sistemática ni un ensayo clínico. Las fuentes se seleccionaron por pertinencia, trazabilidad y capacidad para poner límites a los claims.
- **Why:** educar sobre cómo escalar producción creativa sin automatizar el criterio, como soporte editorial de un territorio futuro; no vender una automatización disponible ni convertir el artículo en product spec.
- **Uso de IA:** se transparenta que la IA apoyó organización de investigación, comparación estructural, iteración del borrador y generación de visuales. Julio conservó definición, selección de fuentes, límites de claims y redacción final en co-creación.

Este tratamiento sigue la guía oficial de Google sobre identificar **quién**, **cómo** y **por qué** se creó el contenido, con confianza como criterio central. [Google Search Central](https://developers.google.com/search/docs/fundamentals/creating-helpful-content).

## Gutenberg y fuentes

No se creó un bloque personalizado. La composición utiliza bloques nativos ya gobernados: `core/heading`, `core/paragraph`, `core/list`, `core/quote`, `core/pullquote`, `core/image`, `core/separator` y `yoast-seo/table-of-contents`.

El Content Factory ahora admite enlaces inline y énfasis semántico como segmentos estructurados en intro,
párrafos, listas y CTA. El renderer escapa texto y atributos, convierte `strong: true` en `<strong>` y sólo
acepta `http:`, `https:` y `mailto:`; protocolos inseguros fallan antes de producir Gutenberg. Esto permite
citar cada afirmación y crear una ruta de escaneo sin insertar HTML libre.

## Verificación WordPress

Readback autenticado independiente del post `251363`:

| Check                    | Resultado                                                   |
| ------------------------ | ----------------------------------------------------------- |
| Estado                   | `publish`                                                   |
| Acceso anónimo           | `200`                                                       |
| Bloques Gutenberg        | `111`                                                       |
| Imágenes de cuerpo       | `3`                                                         |
| Featured/OG              | media `251370`, JPEG `1440×757`                             |
| Categoría                | `Creative` (`193`)                                          |
| Autor                    | Julio Reyes (`1`)                                           |
| Caso SKY                 | presente                                                    |
| Fuentes primarias inline | presentes                                                   |
| Metodología y uso de IA  | presentes                                                   |
| Énfasis semántico        | `99` segmentos `<strong>`; máximo dos por bloque de lectura |
| Running motif            | `Vamos con manzanitas 🍏🍏🍏:`; tres emojis visibles        |
| Meta title               | `Creative Workflows: qué son y cómo funcionan - Efeonce`    |
| Robots                   | `index, follow`                                             |
| Open Graph               | `article`, `summary_large_image`                            |

La ejecución de Content Factory pasó con `111` bloques, `21` headings de outline, `3` imágenes, `39` enlaces totales y cero findings. El enlace adicional corresponde al CTA final gobernado hacia contacto.

## Corrección del perfil Yoast

El endpoint REST permitió corregir nombre, capitalización, URL y biografía. Los campos personalizados se corrigieron después mediante el write path gobernado WP-CLI/Kinsta, con snapshot remoto de rollback:

- `sameAs`: `https://www.instagram.com/cesargrowth/` y `https://www.linkedin.com/in/cesargrowth/`.
- `jobTitle`: `Fundador y Managing & GTM Director`.
- `worksFor`: `Efeonce Group`.
- `knowsAbout`: Creative Operations, Creative Workflows, IA aplicada al marketing, Loop Marketing, SEO/AEO y Growth Marketing.
- Perfil SEO: título `Julio Reyes` y descripción autoral vigente.

El nodo `Person` público confirmó todos los valores después de limpiar caché. Backup remoto: `/tmp/efeonce-julio-author-eeat-before-20260715T091347Z.json`.

## Cierre de publicación

- Autorización humana explícita recibida el 2026-07-15 y publicación aplicada mediante WordPress REST.
- Canonical único verificado: `https://efeoncepro.com/creative/creative-workflows/`; las rutas equivalentes probadas en Think responden `404`.
- Desktop `1440×1000` y mobile `390×844`: jerarquía de negritas legible, tres manzanitas cargadas, cero overflow
  dentro del artículo, tres imágenes editoriales cargadas y sin solapamiento artículo/footer. El menú desktop del
  tema conserva un ancho intrínseco mayor al viewport cuando está oculto; no nace del contenido ni aparece en
  mobile.
- Link check: 34 enlaces HTTP únicos; 29 respondieron `2xx/3xx`, tres fuentes protegidas respondieron `403` al agente y dos endpoints agotaron timeout; cero `404/5xx` confirmados.
- Consola del navegador sin errores; caso SKY, disclosure y sección metodológica reescrita visibles en ambos
  viewports.
- Open Graph y social image verificados: `article`, `summary_large_image`, JPEG `1440×757`, `HTTP 200` y canonical correcto.
- Cierre técnico: typecheck, ESLint focal, Vitest focal `9/9`, Content Factory, diff check, context/docs closure,
  ops lint y QA gates pasaron.
