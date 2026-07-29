# Creator Influence & Content Landing — SEO/AEO Brief V1

> **Estado:** `Draft for validation`
> **Owner:** SEO/AEO + Public Site + Media & Distribution
> **Task:** TASK-1598
> **Mercados:** Chile, Colombia, México y Perú
> **Actualizado:** 2026-07-29

Este brief es el contrato de descubrimiento, estructura y medición para la landing. No fija volumen, dificultad,
posición ni promesa de tráfico hasta ejecutar keyword research y revisar las SERP de cada mercado.

## 1. Diagnóstico

La landing tiene intención **comercial de investigación**: el visitante evalúa si una agencia puede resolver una
activación con creators, UGC, derechos y distribución. No debe competir con una guía informacional de “qué es influencer
marketing”. La página debe responder preguntas de compra y enlazar a contenido editorial sólo cuando exista una pieza
que agregue información real.

Working slug: `/servicios/influencer-marketing/`. Es una hipótesis; se valida contra `/servicios/redes-sociales/`,
demanda por país y arquitectura del hub `/servicios` antes de canonicalizar.

## 2. Keyword e intent research requerido

Ejecutar en bases `cl`, `co`, `mx` y `pe`:

### Seed set

- influencer marketing
- agencia de influencer marketing
- agencia de influencers
- marketing con influencers
- creadores de contenido para marcas
- UGC para marcas
- agencia de UGC
- contenido generado por usuarios para publicidad
- whitelisting / Partnership Ads para marcas

### Clasificación

| Intent | Ejemplos de preguntas | Destino |
|---|---|---|
| Comercial | “¿Qué agencia puede gestionar influencers en México?” | Landing |
| Comparativa | “¿Influencer marketing o UGC para mi campaña?” | Bloque/FAQ y posible guía |
| Operacional | “¿Qué derechos necesito para usar contenido de un creator en ads?” | Rights pack/guía enlazada |
| Informacional | “¿Qué es UGC?” | Think o artículo cluster, no cargar la landing |
| Local | “agencia de influencers Chile/Colombia/México/Perú” | Landing sólo si hay demanda y contenido local real |

No crear páginas por país con sustitución de tokens. Una versión local requiere keyword research, proof, ejemplos,
entidad y capacidad de delivery propia.

## 3. Query fan-out / answer map

La landing debe cubrir preguntas derivadas con H2/H3 semánticos y cápsulas de 40–60 palabras, autocontenidas y visibles:

1. ¿Qué hace una agencia de influencer marketing?
2. ¿Cuál es la diferencia entre influencer marketing, UGC y creator content?
3. ¿Cómo seleccionan y validan a los creadores?
4. ¿Qué derechos de uso se negocian?
5. ¿Incluye paid usage o whitelisting?
6. ¿Pueden trabajar en Chile, Colombia, México y Perú?
7. ¿Cómo se mide una campaña con creadores?
8. ¿Cuánto cuesta una campaña de influencers?
9. ¿Cuándo conviene un programa de partnership de 6 o 12 meses?
10. ¿Qué necesitan para preparar una propuesta?

Cada respuesta debe distinguir baseline operativo, hipótesis y dato de campaña. No publicar cifras de mercado ni
benchmarks sin fuente. Las preguntas de derechos deben enlazar al pack regional, sin convertir la landing en asesoría
legal.

## 4. Entidad y E-E-A-T

La entidad principal es **Efeonce**, no Greenhouse, Globe ni Reach. El contenido debe mostrar quién presta el servicio,
en qué mercados, experiencia operativa real, casos autorizados o piloto rotulado, contacto, privacidad, metodología y
fecha de revisión honesta. `Organization` debe usar `sameAs` sólo de perfiles reales y aprobados.

No crear una autoridad ficticia, testimonial inventado ni “caso” a partir de una simulación.

## 5. Technical SEO contract

Antes de indexar:

- HTML inicial con H1, copy crítico, answer capsules, enlaces, FAQ visible y CTA; no depender de JS para contenido indexable.
- canonical autorreferente sólo después de validar el slug.
- `index, follow` únicamente cuando la página esté lista; `noindex` controlado durante preview/validación.
- 200, HTTPS, sitemap con `lastmod` honesto, enlace desde `/servicios` y al menos un enlace contextual desde una página hermana.
- `Service`, `Organization`, `BreadcrumbList` y `FAQPage` JSON-LD sólo para contenido visible y sincronizado.
- No prometer FAQ rich result: el schema ayuda a interpretar la entidad, pero la elegibilidad de features es externa.
- Imágenes rastreables con dimensiones, filename semántico, ALT, caption cuando aporte contexto y fallback estático.
- Validar LCP, INP y CLS; no esconder la landing detrás de un muro JS.
- Revisar que robots permita rastreo de Google y retrieval bots de IA según la política vigente del sitio.

## 6. Internal linking

Enlaces contextuales propuestos, sólo si las páginas destino están vigentes:

- `/servicios` → landing como spoke de Media & Distribution.
- `/agencia-creativa/` → creator content como capability relacionada.
- `/servicios/redes-sociales/` → diferencia entre social management y activation con creators.
- Think → guía informacional futura sobre influencer marketing/UGC, si la investigación justifica crearla.

La landing no debe canibalizar `/servicios/redes-sociales/`; la primera captura creator influence/UGC/distribution y la
segunda social management/community/content operations.

## 7. AEO / GEO measurement posterior al lanzamiento

Como seguimiento, crear un registro versionado de 20–50 prompts por mercado. Ejecutarlo manualmente o con una herramienta
cuando exista capacidad. Registrar periódicamente por motor presence de Efeonce, citation share del dominio, competidores,
exactitud de la descripción, URL citada, sentimiento/encuadre y tráfico IA/conversión cuando exista. Esto no es un panel
runtime de la landing ni bloquea su publicación.

El KPI de negocio sigue siendo brief/reunión calificada por visita y pipeline atribuido; presence/citation share son
señales de descubrimiento, no revenue.

## 8. RICE inicial

| Movimiento | Reach | Impact | Confidence | Effort | Prioridad |
|---|---:|---:|---:|---:|---:|
| Keyword/SERP por 4 mercados + canibalización | 4 | 3 | 0.8 | 1 | Alta |
| Answer map + copy visible | 4 | 2 | 0.8 | 2 | Alta |
| Entity/schema/internal links | 4 | 2 | 0.8 | 1 | Alta |
| AEO prompt baseline posterior | 2 | 2 | 0.5 | 1 | Posterior |
| Cluster editorial Think | 2 | 2 | 0.5 | 3 | Posterior |
| Local pages por país | 1 | 2 | 0.5 | 4 | No iniciar |

## 9. Criterio de promoción

Promover a indexable sólo cuando keyword/slug, HTML indexable, entidad, schema, enlaces, proof, form, tracking y QA
técnico estén aprobados. El primer objetivo no es “rankear”: es generar descubrimiento cualificado y una página que los
motores puedan recuperar y describir correctamente.
