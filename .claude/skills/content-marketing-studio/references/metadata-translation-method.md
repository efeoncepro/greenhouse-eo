# Método de traducción editorial de metadata

Usar este método al cerrar el paquete de publicación de artículos, casos, pilares y guías. Su objetivo es traducir una tesis técnica a un sistema de entrada comprensible sin perder precisión, inventar claims ni duplicar el mismo titular en todas las superficies.

## Índice

1. Principio
2. Intake
3. Flujo
4. Trabajo de cada campo
5. Gate de jerga
6. Taxonomía
7. Validación
8. Ejemplo abstracto

## 1. Principio

**La precisión técnica vive en el contenido; la metadata abre la puerta con el lenguaje del problema que el lector ya reconoce.**

No eliminar un término técnico por sistema. Decidir si el lector necesita conocerlo antes de interesarse. Si un concepto como `RevOps`, `AEO`, `MLOps` o `composable architecture` exige una definición previa y no es la consulta principal, explicarlo en el artículo en vez de convertirlo en peaje del slug, extracto o snippet.

La metadata no es una colección de copias del H1. Es un sistema de superficies alineadas alrededor de una sola tesis.

## 2. Intake mínimo

Registrar antes de redactar:

- tesis o *one thing* de la pieza;
- problema que el lector ya sabe nombrar;
- concepto técnico que la pieza enseña;
- entidad principal: marca, cliente, producto o disciplina;
- intent principal y consulta candidata;
- evidencia máxima que el contenido sostiene;
- categoría existente que es dueña del territorio;
- estado de la URL: nueva privada, publicada o migración.

Si no puede distinguirse `problema reconocido` de `concepto enseñado`, la metadata todavía no está lista.

## 3. Flujo

### Paso 1 — Separar precisión de fricción

Clasificar cada término:

| Clase | Pregunta | Acción habitual |
| --- | --- | --- |
| Lenguaje del problema | ¿El lector lo usaría antes de leernos? | Priorizar en slug, SEO title y snippet. |
| Entidad necesaria | ¿Distingue el caso o la fuente? | Conservar donde aporte contexto. |
| Término técnico conocido | ¿Es parte real del intent? | Usar si mejora precisión. |
| Término que requiere explicación | ¿Obliga a entender la solución antes del problema? | Enseñar en H1/cuerpo; omitir de superficies de baja paciencia. |
| Jerga interna | ¿Sólo tiene sentido dentro del equipo? | Excluir de metadata pública. |

### Paso 2 — Fijar una tesis y repartir trabajos

Redactar una frase de tesis. Después asignar a cada superficie un trabajo distinto; no producir variaciones por sustitución de sinónimos.

### Paso 3 — Resolver taxonomía antes de congelar el slug

En WordPress u otro CMS donde la categoría participa en el permalink, leer el slug junto a la ruta completa. Una palabra repetida puede ser aceptable si mejora claridad y estabilidad; eliminarla sólo cuando la URL completa mantiene el intent sin ambigüedad.

### Paso 4 — Redactar el set completo

Trabajar H1, SEO title, OG title, excerpt, meta description, OG description, slug, categoría y tags en una misma sesión. Evaluarlos como conjunto.

### Paso 5 — Leer en contextos reales

Simular al menos:

- resultado de búsqueda;
- tarjeta de LinkedIn/WhatsApp/X;
- archive card del CMS;
- breadcrumb y URL completa;
- cita o enlace compartido sin el cuerpo del artículo.

### Paso 6 — Congelar antes de indexar

Fijar slug, categoría primaria y canonical antes de publicar/indexar. Un cambio posterior exige redirect, enlaces internos, sitemap, schema, breadcrumb y social metadata.

## 4. Trabajo de cada campo

| Campo | Trabajo principal | Evitar |
| --- | --- | --- |
| H1 | Sostener la tesis completa y la voz editorial. | Reducirlo a una query robótica. |
| SEO title | Resolver intent y entidad con máxima claridad. | Repetir un H1 largo o esconder el tema en ingenio. |
| OG/Twitter title | Ganar la lectura cuando una persona comparte la pieza. | Keyword stuffing o título institucional sin tensión. |
| Excerpt | Explicar de forma autocontenida qué pasó y qué aprenderá el lector. | Copiar la meta description o cerrar con clickbait. |
| Meta description | Dar una razón fiel para hacer clic; declarar mecanismo o aprendizaje. | Agregar resultados, cifras o capacidades ausentes. |
| OG/Twitter description | Completar el ángulo social del título. | Duplicar mecánicamente el snippet. |
| Slug | Identificar el tema de forma corta, estable y legible. | Fechas prescindibles, conectores, campaña, jerga interna. |
| Categoría | Declarar el territorio editorial dueño de URL, breadcrumb y archivo. | Crear una categoría por pieza. |
| Tags | Mantener filtros o entidades con uso repetible y archivo útil. | Sinónimos SEO, términos de una sola pieza y taxonomía aspiracional. |

## 5. Gate de jerga

Para cada término técnico, responder:

1. ¿La audiencia lo busca o sólo nosotros lo usamos?
2. ¿Se entiende sin definición?
3. ¿Distingue la pieza de alternativas reales?
4. ¿Cabe sin desplazar el problema o beneficio?
5. ¿La pieza promete enseñarlo explícitamente?

Decisión:

- **4–5 respuestas positivas:** puede vivir en metadata principal.
- **2–3:** usarlo en H1 o cuerpo y probar una superficie social/SEO sin él.
- **0–1:** excluirlo de la puerta de entrada y explicarlo dentro.

No confundir `menos jerga` con `menos precisión`. La metadata puede decir `paneles confiables`, mientras el cuerpo explica que el trabajo corresponde a Revenue Operations y bajo qué definición.

## 6. Taxonomía gobernada

### Categoría

Elegir una categoría primaria existente cuando:

- posee el territorio editorial;
- produce un breadcrumb comprensible;
- su archivo agrupa piezas que un lector recorrería juntas;
- coincide con `articleSection` y la arquitectura de URL.

Crear una categoría sólo si existe compromiso de mantener un territorio con varias piezas, navegación y owner. Un concepto importante dentro de un artículo no se convierte automáticamente en categoría.

### Tags

Agregar un tag sólo si cumple las tres condiciones:

1. tendrá más de una pieza en un horizonte concreto;
2. su archivo tiene un trabajo de navegación o descubrimiento;
3. existe una regla que evita sinónimos, duplicados y variantes ortográficas.

Un set vacío es mejor que taxonomía de una sola pieza.

## 7. Validación

### Gate editorial

- Una sola tesis atraviesa todas las superficies.
- H1, SEO title y OG title cumplen trabajos distintos.
- Excerpt, meta description y OG description no son copias automáticas.
- Ningún campo promete más que el cuerpo.
- El lector entiende tema y utilidad sin conocer la jerga interna.
- La voz se conserva donde corresponde: H1/OG pueden tener más carácter; slug/SEO priorizan claridad.

### Gate SEO/runtime

- Longitudes se revisan como heurística, no como objetivo mecánico.
- Slug se evalúa dentro de la URL completa.
- Categoría y primaria Yoast coinciden.
- Canonical, robots y estado editorial son intencionales.
- OG/Twitter tienen readback independiente; no se asume que heredan del SEO title.
- Featured/social image no cae en un fallback global.
- Post privado permanece no indexable y sin exposición anónima.

### Gate de cambio

Antes de mutar un post existente:

1. tomar snapshot de post, taxonomía y metadata;
2. preparar rollback;
3. aplicar la mínima mutación;
4. comprobar autor, estado, slug, contenido y categorías sin drift;
5. hacer readback independiente y verificar acceso anónimo.

## 8. Ejemplo abstracto

Una organización pide `agente, KPI y dashboards`; el trabajo descubre una necesidad de Revenue Operations.

- **Problema reconocido:** los paneles no son confiables para decidir.
- **Concepto enseñado:** RevOps conecta procesos, datos, ventas y servicio.
- **Decisión:** usar `dashboards confiables` en slug/SEO; introducir y definir `RevOps` dentro del artículo.
- **Categoría:** la plataforma o territorio editorial existente que posee el caso.
- **Tags:** ninguno si `RevOps` todavía sería un archivo de una sola pieza.

La decisión no niega RevOps. Ordena la secuencia pedagógica: primero el problema que el lector reconoce; luego el vocabulario que le permite entenderlo mejor.
