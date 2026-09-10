# ASO Landing — SEO/AEO Brief V1

> **Superficie:** landing pública de ASO · working slug `/servicios/aso/`
> **Owner task:** `TASK-1862` · **PDR:** [PDR-023](decisions/PDR-023-landing-aso-posicionamiento.md)
> **Mercados:** Chile (`cl`), México (`mx`), Colombia (`co`) y Perú (`pe`)
> **Fecha:** 2026-09-10 · **Datos as-of:** 2026-09 (Semrush, base de agosto 2026)
> **Confianza general:** media-baja — una sola fuente de volumen. El snapshot de DataForSEO Labs en
> Greenhouse (`get_seo_keyword_market_data`) no tiene estos términos: `found=false`, nunca capturados; desconocido, no cero. El Slice 1 de la task triangula antes de fijar canonical.

## 1. Diagnóstico

La disciplina casi no se busca en español, y el término que sí tiene volumen es ambiguo. Esta página no puede
ganarse la vida con tráfico orgánico: su valor está en ser el destino de expansión de SEO/AEO y la referencia
citable en español. El brief optimiza para **claridad, desambiguación y citabilidad**, no para volumen.

### Volumen por término (Semrush, as-of 2026-09)

| Término | CL | MX | CO | PE | Lectura |
|---|---:|---:|---:|---:|---|
| `aso` | 480 | 3.600 | 1.600 | 720 | **Ambiguo.** SERP dominado por otras intenciones (ver abajo) |
| `app store optimization` | 20 | 20 | 20 | 20 | La disciplina; volumen marginal |
| `aso app` | 20 | 20 | 30 | 20 | Marginal |
| `que es aso` | 20 | 90 | — | — | SERP casi totalmente médico |
| `aso marketing` | — | 20 | 20 | — | Marginal |
| `aso seo` | 10 | 10 | — | — | Marginal; confirma la asociación con SEO |
| `marketing de apps` | — | 20 | 20 | 20 | Marginal |
| `agencia aso` | — | 10 | 10 | — | **Modificador comercial sin demanda** |
| `posicionamiento de apps` · `posicionamiento de aplicaciones` · `posicionamiento en app store` · `posicionamiento en google play` · `optimizacion de apps` | 0 | 0 | 0 | — | Sin demanda |
| `app store` | 12.100 | 90.500 | — | — | Navegacional (usuarios); no perseguir |
| `google play console` · `app store connect` | 1.900 · 390 | 6.600 · 1.600 | — | — | Navegacional de desarrolladores; vocabulario del operador, no target |

Referencia fuera de mercado: `app store optimization` en EE. UU. 2.400/mes (CPC USD 25,86), Reino Unido 390,
Brasil 320, España 260. Es la señal para una futura spoke `en-US`, no para esta página.

### SERP de `aso` (Semrush, as-of 2026-09)

- **México:** ADO (buses), Wikipedia del álbum *Aso* (Misia), blog de Telefónica *qué es ASO*, dos páginas de
  hospitales sobre el examen ASO, SoundCloud, Rocketlab (*ASO: qué es*), Spotify, ASO Worldwide en LinkedIn,
  un PDF técnico, Pickaso (*guía ASO*) y la acción ASO en Yahoo Finance.
- **Chile:** ASO Ingeniería, hospitales y MedlinePlus (examen ASO), Telefónica, Bionet (examen), Rocketlab,
  Instagram, Spotify.
- **`que es aso` (MX):** MedlinePlus, hospitales, laboratorios; Rocketlab en el décimo lugar.

**Lectura:** la intención "App Store Optimization" es minoritaria y la sirven blogs de vendors. Competir por
`aso` a secas atraería tráfico médico y musical. La página se desambigua para quien sí busca la disciplina y para
los asistentes que la citan.

### Consecuencia estratégica

1. **Desambiguar en title, H1, meta y primer párrafo** con `apps`, `App Store` y `Google Play`.
2. **Ganar la cápsula en español**: definición, diferencia con el SEO y qué cambió con la IA, respondidas mejor que
   los blogs de vendors, visibles arriba.
3. **Ser el nodo del trío de Visibilidad**: enlaces por función a SEO y AEO, y desde ellos en fase C.
4. **Medir por presencia en asistentes y por conversión**, no por sesiones orgánicas.
5. **Guardar el inglés para después**: la demanda real de la categoría está en `en-US`.

## 2. Keyword e intent

### Seed set y rol

| Rol | Términos | Dónde vive en la página |
|---|---|---|
| Primario de categoría | `aso` + desambiguación (`apps`, `App Store`, `Google Play`) | Title, H1, meta, primer párrafo, URL |
| Definicional | `que es aso`, `app store optimization`, `aso app` | Cápsula de definición (R2) y FAQ 1 |
| Relación | `aso seo`, `aso marketing` | Cápsula "en qué se parece al SEO" (R2), R4 y FAQ 2 |
| Vocabulario del operador | ficha, metadata, capturas, fichas personalizadas, experimentos, reseñas, App Store Connect, Play Console, Apple Ads | R6, R7 y FAQ |
| Excluido | `app store`, `google play console`, `app store connect` como targets; `aso` en su sentido médico o musical | No se persiguen |

### Clasificación de intención

| Intención | Señal | Tratamiento |
|---|---|---|
| Definicional | Blogs de vendors, Telefónica | Cápsula de 40–60 palabras visible arriba; no convertir la página en guía |
| Ajena (médica, marcas, música) | Hospitales, ADO, Spotify | Desambiguación en title y meta; la página no la persigue |
| Comercial | Casi inexistente en español | Oferta, medición honesta, CTA dual |
| Expansión (cliente SEO/AEO con app) | Llega por enlace interno o envío 1:1 | Sección "tres lugares" y enlaces por función |

## 3. Query fan-out y answer map

Cada pregunta real se responde con una cápsula visible y autocontenida bajo un H2 o H3 con la pregunta literal.

| Pregunta / sub-consulta | Sección | Intención de la cápsula (a validar con copywriting) |
|---|---|---|
| ¿Qué es el ASO? | R2 + FAQ 1 | Hacer que una app aparezca en las búsquedas de las tiendas y se instale al llegar a su ficha; se trabaja metadata, creativos, reseñas y fichas alternativas; se mide con las consolas |
| ¿En qué se diferencia el ASO del SEO? | R2 + FAQ 2 | Mismo oficio, otra superficie, con reglas, campos y medición propios |
| ¿Qué cambió en las tiendas con la IA? | R3 | Interpretan la ficha, responden y recomiendan; parte de eso aún no llega a LATAM |
| ¿Por dónde empiezo en Latinoamérica: App Store o Google Play? | R3 | Android pesa entre 66% y 82% del tráfico web móvil en CL/MX/CO/PE; dato con fuente y límite |
| ¿Cómo se mide el ASO? | R7 | Con App Store Connect y Play Console, leyendo tres advertencias |
| ¿ChatGPT recomienda apps? | FAQ 5 | Sí; no existe forma de medir instalaciones que vengan de ahí |
| ¿El ASO sirve si ya invierto en Apple Ads? | FAQ 4 | Sí; las fichas alternativas se usan en campañas; los anuncios se gestionan aparte |
| ¿Se puede garantizar el primer lugar? | FAQ 6 + R8 | No |

Las cápsulas son contenido visible y no una promesa de rich result.

## 4. Entidad y E-E-A-T

- **Proveedor:** Efeonce, siempre por su `@id` canónico de `Organization`. La extensión interna no aparece como
  proveedor ni como marca.
- **Método visible:** la sección de medición explica qué reporta cada consola y qué no; la experiencia se
  demuestra en el detalle, no en adjetivos.
- **Honestidad verificable:** lo que no se promete, para quién no es y la disponibilidad real de las funciones de IA.
- **Sin casos todavía:** sin `Review`, `AggregateRating` ni testimonios. Cuando exista un caso autorizado, entra
  con su evidencia.
- **Datos fechados:** la cuota Android con fuente (StatCounter), mes y límite visibles.
- **Marcas de terceros:** App Store, Google Play, Apple, Google, ChatGPT, Gemini y Perplexity se nombran en texto
  como referencia; sin badges de descarga ni logo de Apple.

## 5. Technical SEO contract

| Elemento | Contrato |
|---|---|
| URL | `/servicios/aso/`, hija de `/servicios/` (página `251077`) — **hipótesis hasta Slice 1** |
| Title | Hipótesis: `ASO para apps en App Store y Google Play \| Efeonce` — 50 caracteres; desambigua |
| Meta description | Hipótesis: `ASO conectado a tu SEO y AEO: que tu app se encuentre y se entienda igual en App Store, Google Play, Google y los asistentes de IA.` — ~131 caracteres; verificar conteo |
| H1 | Contiene `ASO` y `app`; uno solo por página |
| HTML inicial | Definición, qué cambió, tres lugares, firma con sus listas, servicios, medición, límites, FAQ y CTAs en el HTML servido |
| Canonical | Autorreferente sólo en fase C y después de validar el slug |
| Robots | Fase A: sin URL pública. Fase B: `noindex, follow`. Fase C: `index, follow` |
| Sitemap | Sólo en fase C, con `lastmod` honesto |
| Schema | Yoast conserva `WebPage`, `BreadcrumbList`, `WebSite` y `Organization`. La página añade sólo `Service` —provider por `@id`, `areaServed` CL/MX/CO/PE, `serviceType` "App Store Optimization", catálogo con las líneas visibles— y `FAQPage` con respuestas visibles. Nunca duplicar entidades de Yoast |
| Open Graph / Twitter | Title, description e imagen social dedicada 1200×630, sin marcas de terceros |
| hreflang | Preparado para una futura `en-US`; no se declara hasta que exista |
| Imágenes | ALT descriptivo, dimensiones explícitas, formato moderno, sin texto crítico sólo en imagen |
| Performance | LCP móvil del hero sin video; ilustración optimizada; CLS 0 en la carga del form |

## 6. Internal linking

| Desde | Hacia | Rol | Fase |
|---|---|---|---|
| Esta landing · R4 "tres lugares" | `/servicios/posicionamiento-seo/` | Google: la web de la app y la ficha indexada | B y C |
| Esta landing · R4 "tres lugares" | `/aeo-2/` (luego `/servicios/aeo`) | Motores de IA: cómo recomiendan apps | B y C |
| Esta landing · FAQ 2 y 5 | SEO y AEO | Relación y límites | B y C |
| Esta landing · conversión | `/contacto/` | Respaldo sin JavaScript o sin scheduler | A, B y C |
| Landing SEO · puente SEO→AEO | Esta landing | "¿Tu marca tiene app?" | **Sólo C** |
| Landing AEO · FAQ nueva | Esta landing | "¿También trabajan la visibilidad de apps?" | **Sólo C** |
| Menú `Visibilidad` · hub `/servicios/` | Esta landing | Navegación | **Sólo C** |

Cada enlace nombra el destino por su función, nunca "clic aquí".

## 7. AEO / GEO — medición

Es el objetivo principal de la página, así que el registro arranca en fase C:

- panel de prompts por intención —definicional (*qué es el ASO*), relación (*ASO vs SEO*), comercial (*quién hace
  ASO en Chile/México*)— en ChatGPT, Gemini y Perplexity, por mercado;
- presencia, cita y exactitud de la descripción de Efeonce en esas respuestas, con fecha;
- indexación efectiva confirmada en Search Console, sin afirmarla antes.

## 8. RICE inicial

| Iniciativa | Alcance | Impacto | Confianza | Esfuerzo | Lectura |
|---|---|---|---|---|---|
| Landing con cápsulas y trío de Visibilidad | Bajo (orgánico) · Alto (expansión) | Alto | Media | Alto | Esta task |
| Guía editorial en español "qué es el ASO" en Think | Bajo | Medio | Baja | Medio | Follow-up sólo si la presencia en asistentes lo justifica |
| Spoke `en-US` (`app store optimization`, 2.400/mes) | Alto | Alto | Media | Alto | Fase posterior con localización real |

## 9. Criterio de promoción a fase C

La página pasa a `index, follow` sólo cuando:

1. la extensión está en `Commercially approved`;
2. el slug y el title están validados con una segunda fuente;
3. el HTML inicial contiene todo el contenido crítico;
4. el schema valida y sólo marca contenido visible;
5. canonical, robots, sitemap, menú, hub y los enlaces desde SEO y AEO están verificados en vivo;
6. el form monta, valida y acepta envíos, y el CTA abre el scheduler nativo o degrada a `/contacto/`;
7. los gates de fidelidad y SEO de esta página y los gates de SEO y AEO pasan después del último guardado;
8. el owner aprueba la promoción.
