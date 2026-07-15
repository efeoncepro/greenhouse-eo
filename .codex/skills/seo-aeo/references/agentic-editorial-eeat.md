# Editorial agentica: SEO/AEO + E-E-A-T

Referencia operativa para investigar, redactar, auditar y publicar blogposts,
pillars y guias que deban rankear, ser recuperables/citables y sostener sus
claims. Nace del aprendizaje de Creative Workflows, pero el contrato es
reutilizable y no copia sus decisiones particulares.

## Indice

1. Frontera de skills y entregables
2. Research dossier
3. Contrato editorial y metadata
4. Evidencia, claims y fuentes
5. Who, How, Why y uso de IA
6. Entidad de autor y schema
7. Estados de publicacion e indexacion
8. Enlaces, duplicados y CTA
9. Verificacion live
10. Gate de publicacion
11. Plantilla de auditoria

## 1. Frontera de skills y entregables

Esta referencia pertenece a **`seo-aeo`**, la skill del oficio editorial:
intent/SERP, arquitectura de contenido, metadata, citabilidad, E-E-A-T,
structured data, indexacion y verificacion tecnica.

**`seo-aeo-practice` es comercial.** Gobierna oferta, pricing, prospeccion,
propuestas, objeciones, sales enablement y retencion. No decide que evidencia
alcanza para publicar, no reescribe caveats y no convierte una observacion en
promesa. Si un articulo tambien habilita ventas, `seo-aeo` conserva autoridad
sobre verdad editorial; `seo-aeo-practice` solo gobierna su uso comercial.

Entregables minimos del ciclo:

1. Research dossier fechado.
2. Contrato de H1, metadata, slug, taxonomia, canonical y robots.
3. Claim ledger con fuente, muestra, metodo y limites.
4. Spec o borrador privado con readback independiente.
5. Gate humano de publicacion.
6. Auditoria live del HTML/render final.

No incluir secretos, cookies, tokens, credenciales, URLs firmadas, headers de
autenticacion ni payloads con PII en dossiers, auditorias o evidencia.

## 2. Research dossier

El dossier **informa** una decision editorial; no autoriza publicacion por si
solo. Debe declarar fecha de corte, autor del research, mercado, idioma,
motores consultados, herramientas disponibles y limitaciones.

### Pregunta y audiencia

Registrar:

- pregunta de publicacion que la pieza debe resolver;
- audiencia y job-to-be-done;
- entidad principal y variantes de lenguaje;
- intencion candidata: informacional, comercial, transaccional o navegacional;
- aporte original esperado frente al corpus existente;
- frontera: que producto, resultado o disponibilidad **no** afirma la pieza.

### Muestra intent/SERP

Documentar una muestra reproducible, no una impresion informal:

| Campo | Registro minimo |
|---|---|
| Query | Cadena exacta consultada |
| Fecha/hora | Corte del hallazgo |
| Motor | Google, Bing o answer engine observado |
| Mercado/idioma | Pais, locale e idioma |
| Contexto | Desktop/mobile; sesion anonima si aplica |
| Intent dominante | Que trabajo parecen resolver los resultados |
| Tipos de resultado | Guias, producto, video, local, foro, noticias, etc. |
| Entidades/fuentes | Dominios y actores que dominan la muestra |
| Ambiguedad | Intenciones que compiten por la misma expresion |
| Implicacion | Formato, angulo y lenguaje recomendados |

Una muestra SERP permite leer intent y competencia visible; **no entrega
volumen, dificultad ni demanda panregional**. Si no existe acceso a GSC,
Semrush u otra fuente medible, escribir `volumen no medido` o `dato no
disponible`. Nunca inventar rangos ni convertir una SERP local en forecast.

Si hay datos de volumen, conservar herramienta, base geografica, fecha,
unidad, filtros y export/readback. Separar medicion real de estimacion.

### Contenido existente

Antes de fijar el angulo:

- revisar GSC, sitemap y busqueda interna del dominio;
- detectar canibalizacion o URLs que ya resuelven la misma intencion;
- mapear enlaces internos publicados que pueden sostener la pieza;
- identificar si otra superficie, por ejemplo WordPress o Think, ya aloja una
  version equivalente;
- decidir si crear, actualizar, consolidar o no publicar.

### Decision de research

El dossier termina con una decision explicita:

- `proceed`: evidencia e intent suficientes para borrador privado;
- `conditional`: se puede redactar, pero faltan datos o permisos antes de
  publicar/indexar;
- `stop`: intent, duplicidad, evidencia o riesgo hacen improcedente la pieza.

## 3. Contrato editorial y metadata

Cada campo tiene un trabajo distinto. Deben estar alineados, no ser copias
mecanicas.

| Campo | Contrato |
|---|---|
| H1 | Promesa editorial completa y legible para personas; un solo H1 visible |
| Meta title | Responde al intent principal y diferencia la entidad/marca; debe ser textual y funcionalmente distinto del H1, normalmente mas corto y directo |
| Excerpt | Resumen autocontenido del CMS/feed; explica que recibe el lector sin clickbait |
| Meta description | Snippet persuasivo y fiel; no agrega resultados ni capacidades ausentes |
| Slug | Corto, estable, minusculas y guiones; evita fechas o relleno salvo necesidad real |
| Categoria | Territorio editorial gobernado que ordena URL, breadcrumb y `articleSection` |
| Tags | Solo entidades/filtros mantenidos por la taxonomia; no crear sinonimos redundantes ni tags de una sola pieza |
| Canonical | Una URL HTTPS absoluta y preferida; self-canonical en la URL dueña |
| Robots | Estado efectivo coherente con borrador o publicacion |

Reglas:

- H1 y meta title deben tener redacciones distintas aunque compartan entidad
  principal. El H1 sostiene tesis y voz; el meta title prioriza claridad de
  intent y contexto de marca.
- Excerpt y meta description pueden partir de la misma idea, pero se auditan
  por separado. No asumir que el CMS sincroniza ambos.
- No duplicar el H1 dentro del cuerpo si el tema/CMS ya renderiza el titulo.
- Fijar slug y canonical antes de indexar. Si una URL publicada cambia, definir
  redirect y actualizar enlaces internos, sitemap, schema y social metadata.
- Usar una categoria primaria coherente. Agregar tags solo si existe una regla
  de uso y paginas de archivo utiles; `Uncategorized` no es una decision.
- El canonical es una señal, no permiso para mantener dos copias publicas sin
  control. Redirect o retirar la duplicada es mas claro cuando no debe existir.

## 4. Evidencia, claims y fuentes

### Clases de afirmacion

Etiquetar mentalmente y en el ledger cada claim:

| Clase | Que es | Como se escribe |
|---|---|---|
| Evidencia | Hallazgo verificable de una fuente o medicion propia | Con fuente, muestra, metodo, periodo y limites |
| Inferencia | Interpretacion razonada a partir de evidencia | Como conclusion o implicacion, no como dato observado |
| Doctrina | Definicion, framework o postura propia | Atribuida: `En Efeonce...`, nunca presentada como consenso externo |
| Caso observado | Experiencia aplicada bajo condiciones concretas | Con permiso, baseline, periodo, muestra, metodo y caveats |

No usar ciencia para decorar doctrina. Una asociacion no demuestra causalidad;
prevalencia entre corpus no equivale a lift de una tactica; una encuesta
declarativa no es un experimento; un caso no prueba universalidad.

### Fuentes primarias inline

- Enlazar la fuente primaria junto al claim que sostiene, no solo en una
  bibliografia final.
- Preferir paper/DOI, documentacion oficial, dataset, filing o medicion propia
  gobernada. Una nota secundaria sirve para discovery o contexto, no reemplaza
  la primaria disponible.
- Comprobar que titulo, autores, fecha y URL corresponden al hallazgo citado.
- Parafrasear con fidelidad y respetar derechos de autor; no copiar pasajes
  extensos.
- Si una fuente cambia, es retirada o no puede verificarse, rebajar/eliminar el
  claim o marcarlo pendiente. No rellenar el hueco con memoria del agente.

### Claim ledger minimo

| Campo | Contenido |
|---|---|
| ID | Identificador estable del claim |
| Claim propuesto | Frase exacta o idea que entraria al articulo |
| Clase | Evidencia, inferencia, doctrina o caso observado |
| Fuente primaria | Titulo, autor/entidad, URL/DOI |
| Fecha/corte | Publicacion y fecha de acceso/medicion |
| Metodo | Encuesta, experimento, observacion, logs, benchmark, etc. |
| Muestra/unidad | `n`, corpus, mercados, paginas, piezas o eventos |
| Baseline/comparador | Contra que se calcula el resultado |
| Resultado | Valor y unidad, idealmente rango cuando corresponde |
| Limites | Generalizacion, sesgo, correlacion, cobertura y datos faltantes |
| Redaccion permitida | La formulacion maxima que la evidencia sostiene |
| Redaccion prohibida | Causalidad, garantia o extrapolacion no sostenida |
| Permiso | Publico, interno, cliente aprobado, anonimizado o bloqueado |
| Estado | Verificado, condicionado, rechazado o desactualizado |

Un claim cuantitativo sin muestra, metodo, unidad o periodo no pasa el gate.
Cuando alguno no aplica, registrar `n/a` y explicar por que; no dejar el campo
ambiguo.

### Caso cliente

Un caso entra solo con autorizacion verificable para ese uso y alcance. Registrar:

- cliente nombrado o anonimizado segun permiso;
- periodo, universo y unidad observada;
- baseline/comparador y metodo de calculo;
- resultado exacto o rango, sin redondeo oportunista;
- que mejoro, que no mejoro y donde se concentro el efecto;
- variables no controladas y por que no es experimento causal;
- caveat visible: no es garantia universal;
- owner y evidencia del permiso, sin publicar datos privados del permiso.

Si falta permiso, anonimizar de forma irreversible o excluir. Nunca inferir
consentimiento porque el trabajo ya sea conocido internamente.

## 5. Who, How, Why y uso de IA

La transparencia debe ser visible para personas, no solo estar en schema.

### Who

- byline con nombre real del autor o entidad responsable;
- credenciales pertinentes al tema, sin inflar expertise;
- revisor experto cuando el riesgo lo requiera;
- fecha de publicacion y fecha de actualizacion reales;
- enlace a un perfil de autor consistente.

### How

Explicar brevemente como se construyo la pieza: alcance del research, criterios
de seleccion de fuentes, medicion propia, revision y limites. No llamarla
`revision sistematica`, `estudio` o `experimento` si el metodo no lo fue.

### Why

Declarar por que existe y para quien. Diferenciar educacion, categoria,
documentacion, opinion o conversion. Un articulo que prepara un producto futuro
no debe anunciar disponibilidad ni convertirse accidentalmente en product spec.

### Disclosure de IA

Declarar el uso material de IA cuando aplique: research asistido, organizacion,
comparacion, borrador, edicion, traduccion o imagenes. Identificar que decisiones
retuvo la persona: pregunta, fuentes, interpretacion, limites, redaccion final,
permisos y autorizacion de publicacion.

Evitar tanto `hecho por IA` sin contexto como `revision humana` vacia. El
disclosure debe permitir entender la division real del trabajo.

## 6. Entidad de autor y schema

### Author entity `Person`

El autor visible y el autor estructurado deben ser la misma entidad. Auditar el
nodo global, porque un perfil incorrecto contamina todas las piezas.

| Propiedad | Regla |
|---|---|
| `@type` | `Person` para una persona; `Organization` solo para autoria institucional real |
| `name` | Solo el nombre, sin cargo, prefijos editoriales ni publisher |
| `url` | Perfil canonico del autor o pagina que lo identifica |
| `sameAs` | Perfiles publicos reales y verificados; eliminar URLs rotas, ajenas u obsoletas |
| `jobTitle` | Cargo actual y comprobado, separado de `name` |
| `worksFor` | `Organization` vigente; no conservar empleadores historicos como actuales |
| `knowsAbout` | Temas demostrables y pertinentes, no una lista aspiracional de keywords |

No inventar valores para completar schema. Corregir el source of truth del
perfil y verificar el nodo renderizado despues de cache/CDN; no parchear solo un
articulo si el error es global.

### `Article` / `BlogPosting`

Usar el tipo que corresponda al contenido visible e incluir, cuando apliquen:

- `headline` coherente con el titulo visible;
- `description` fiel a la pieza;
- `mainEntityOfPage` y URL canonical;
- `author` enlazado a `Person` u `Organization` real;
- `publisher` como `Organization` separada del autor;
- `datePublished` y `dateModified` ISO 8601 reales;
- imagen representativa accesible (`image`, `primaryImageOfPage` o equivalente);
- `articleSection`, `inLanguage` y breadcrumb coherentes con la UI;
- entidades solo si son visibles o sustentadas por el contenido.

Validar JSON-LD parseable y el grafo final, no solo el objeto de la spec. No
prometer rich results. `FAQPage` solo si preguntas y respuestas son visibles y
la feature sigue siendo pertinente al publicar.

### Open Graph y Twitter/X

Verificar en HTML renderizado:

- `og:type=article`, locale, title, description, canonical URL y site name;
- imagen editorial dedicada, accesible por HTTP, con MIME y dimensiones reales;
- URL absoluta de imagen, sin dependencia accidental del fallback de Home;
- `twitter:card=summary_large_image` y metadata coherente;
- preview con el mismo estado editorial y sin titulo/descripcion obsoletos.

La imagen cercana a `1.91:1` es una opcion robusta para previews amplios, pero
se deben validar requisitos actuales del canal y el preview real.

## 7. Estados de publicacion e indexacion

### Borrador privado

Estado esperado:

- CMS en `draft`/`private`, sin publicacion automatica;
- acceso anonimo `404`, `401/403` gobernado o preview no descubrible;
- si una preview publica responde `200`, `noindex` debe estar visible al crawler;
- no bloquear por `robots.txt` una URL que depende de `noindex`, porque el bot
  necesita rastrearla para leer la directiva;
- readback autenticado de contenido, metadata, media, autor y schema;
- canonical publico aun pendiente si el ownership WordPress/Think no esta
  resuelto.

Estado honesto: `private content complete; publication pending`.

### Publicacion indexable

Solo tras autorizacion humana explicita:

- CMS `publish` y acceso anonimo `200`;
- robots efectivos `index, follow` si la pieza debe competir organicamente;
- self-canonical absoluto y consistente con sitemap, enlaces y schema;
- caches/CDN purgados o invalidados por el camino gobernado cuando aplique;
- fecha, autor, fuentes, disclosure y CTA visibles;
- copia duplicada retirada, redirigida o mantenida no indexable;
- verificacion live posterior al write.

`publish` no significa `indexed`. Tras publicar, el estado correcto es
`published and index eligible`; confirmar indexacion por Search Console/URL
Inspection o evidencia equivalente antes de decir `indexed`.

## 8. Enlaces, duplicados y CTA

### Link health sin falsos positivos

Clasificar cada URL con evidencia:

| Clase | Interpretacion |
|---|---|
| `healthy` | `2xx` o redirect esperado que termina en destino correcto |
| `redirect-review` | Redirecciona, pero hay que revisar cadena, canonical o destino |
| `blocked-unverified` | `403`/challenge que parece proteccion anti-bot; no llamarlo roto sin verificacion adicional |
| `timeout-unverified` | Agoto timeout; reintentar y probar navegador/otra red antes de concluir |
| `broken-confirmed` | `404/410`, dominio inexistente o fallo persistente confirmado por mas de un metodo |
| `unsafe` | Protocolo, destino, tracking o contenido no permitido |

Un `403` puede significar anti-bot, autenticacion real o bloqueo geografico. Un
timeout puede ser transitorio. Registrar metodo, timestamp, redirect chain y
resultado; abrir manualmente las fuentes criticas. Reportar `no verificado`, no
`roto`, mientras la evidencia no lo demuestre.

### WordPress/Think y otras copias

- Elegir un unico runtime publico/canonical por pieza.
- Buscar slug, titulo y fragmentos distintivos en WordPress, Think, staging,
  feeds y rutas historicas.
- La superficie no dueña debe responder `404/410`, redirigir a la canonical o
  permanecer no indexable con contrato explicito.
- Canonical, OG URL, schema, sitemap y enlaces internos deben apuntar al mismo
  owner.
- No publicar una copia para distribucion si syndication no esta disenada y
  verificada.

### CTA y UTM

- El CTA aparece despues de resolver el intent y no convierte la pieza en una
  promesa comercial.
- Destino y copy deben corresponder al siguiente paso real.
- Usar UTMs gobernadas y estables, por ejemplo `utm_source`, `utm_medium`,
  `utm_campaign` y `utm_content` cuando exista taxonomia.
- No poner nombre, email, telefono, empresa, account ID, client ID, token ni
  otro PII/secreto en query strings, UTMs, URLs, logs o `dataLayer`.
- Verificar URL final, redirect, analytics y ausencia de PII en navegador.

## 9. Verificacion live

No cerrar con la respuesta de escritura del CMS. Hacer readback independiente
y auditar el HTML/render que reciben personas y crawlers.

### Readback tecnico

- estado CMS, autor, fecha, slug, categoria/tags y featured media;
- H1, excerpt, meta title y meta description finales;
- canonical y robots en HTML/headers;
- JSON-LD parseable y entidad de autor correcta;
- OG/Twitter y social image con `200`, MIME y dimensiones esperadas;
- sitemap/feed cuando aplique;
- acceso anonimo y autenticado segun estado.

### Render desktop y mobile

- un H1, outline y TOC/anchors validos;
- contenido, caso, caveats, fuentes y disclosure visibles;
- imagenes cargadas, ALT pertinente y sin placeholders;
- tablas/listas legibles, sin overflow horizontal ni solapamientos;
- CTA operativo;
- consola sin errores relevantes;
- canonical URL visible coincide con la direccion cargada.

### Verificacion externa

- link health con las clases anteriores;
- rutas duplicadas WordPress/Think y variantes del slug;
- schema validator/Rich Results Test cuando corresponda;
- preview social real o inspector equivalente;
- analytics/UTM sin PII;
- Search Console despues de publicar, sin afirmar indexacion antes de verla.

Guardar fecha, entorno, viewport, URL y resultados. Una captura visual no
reemplaza inspeccionar HTML, headers, schema y `scrollWidth`.

## 10. Gate de publicacion

Todo item bloqueante debe estar resuelto o tener excepcion humana documentada.

- [ ] Dossier fechado con pregunta, audiencia, intent y muestra SERP.
- [ ] Volumen/dificultad medidos con fuente o declarados no disponibles; cero
      cifras inventadas.
- [ ] Aporte original y frontera de claims definidos.
- [ ] H1 y meta title textual y funcionalmente distintos, alineados al mismo intent.
- [ ] Excerpt y meta description revisados por separado.
- [ ] Slug estable, categoria gobernada y tags no redundantes.
- [ ] Canonical unico decidido; duplicados WordPress/Think resueltos.
- [ ] Borrador privado/noindex verificado antes de autorizacion.
- [ ] Claim ledger completo; fuentes primarias inline.
- [ ] Evidencia, inferencia, doctrina y casos se distinguen visiblemente.
- [ ] Claims cuantitativos incluyen muestra, metodo, periodo, baseline y limites.
- [ ] Caso cliente tiene permiso, caveats y datos no sensibles.
- [ ] Who, How, Why y disclosure de IA son honestos y visibles.
- [ ] Autor/fecha visibles y nodo `Person` verificado (`sameAs`, `jobTitle`,
      `worksFor`, `knowsAbout`).
- [ ] `Article`/`BlogPosting`, breadcrumb y fechas coinciden con el contenido.
- [ ] OG/Twitter e imagen social pasan readback.
- [ ] Enlaces revisados sin etiquetar `403` anti-bot o timeout como rotos sin
      corroboracion.
- [ ] CTA y UTMs funcionan y no contienen PII ni secretos.
- [ ] Autorizacion humana de publicacion registrada.
- [ ] Tras publicar: anonimo `200`, `index, follow`, self-canonical y render
      desktop/mobile verificados live.
- [ ] Estado se reporta como `index eligible` hasta confirmar indexacion real.

## 11. Plantilla de auditoria

Copiar y completar. No borrar filas fallidas: convertirlas en finding con
owner y evidencia.

```markdown
# [Pieza] - Auditoria editorial SEO/AEO + E-E-A-T

> Fecha/corte: YYYY-MM-DD HH:mm TZ
> Auditor: [nombre/agente]
> URL/CMS ID: [canonical o borrador]
> Entorno: private | staging | production
> Estado observado: draft | private | publish
> Veredicto: PASS | CONDITIONAL PASS | BLOCK
> Estado honesto: [private complete / publication pending / published and index eligible / indexed verified]

## 1. Alcance y decision

- Pregunta de publicacion:
- Audiencia/job-to-be-done:
- Entidad e intent:
- Aporte original:
- Fuera de alcance/no claims:
- Decision: proceed | conditional | stop

## 2. Research dossier

| Query | Fecha | Motor | Mercado/idioma | Intent/SERP | Implicacion |
|---|---|---|---|---|---|
| | | | | | |

- Fuente de volumen/dificultad o `no disponible`:
- GSC/contenido existente/canibalizacion:
- Limitaciones del research:

## 3. Contrato editorial

| Campo | Esperado | Readback CMS | Live HTML | Estado |
|---|---|---|---|---|
| H1 | | | | |
| Meta title | | | | |
| Excerpt | | | | |
| Meta description | | | | |
| Slug | | | | |
| Categoria/tags | | | | |
| Canonical | | | | |
| Robots | | | | |

## 4. Claims y fuentes

| ID | Clase | Claim | Fuente primaria | Metodo/muestra | Baseline/periodo | Limites | Estado |
|---|---|---|---|---|---|---|---|
| | | | | | | | |

- Evidencia vs inferencia vs doctrina visibles:
- Fuentes primarias inline:
- Caso cliente, permiso y caveats:
- Claims eliminados o rebajados:

## 5. Who, How, Why

| Check | Evidencia | Estado |
|---|---|---|
| Who/byline/credenciales | | |
| How/metodo/limites | | |
| Why/audiencia/proposito | | |
| Disclosure IA/division del trabajo | | |
| Fecha de publicacion/actualizacion | | |

## 6. Entidad y schema

| Check | Valor observado | Estado |
|---|---|---|
| `Article`/`BlogPosting` | | |
| `Person.name`/`url` | | |
| `sameAs` | | |
| `jobTitle` | | |
| `worksFor` | | |
| `knowsAbout` | | |
| `datePublished`/`dateModified` | | |
| publisher/image/articleSection/inLanguage | | |
| breadcrumb/FAQ si aplica | | |

## 7. Social y media

| Check | Valor observado | Estado |
|---|---|---|
| OG type/title/description/url | | |
| OG image HTTP/MIME/dimensiones | | |
| Twitter/X card | | |
| Imagenes de cuerpo/ALT | | |

## 8. Publicacion y duplicados

| Check | Evidencia | Estado |
|---|---|---|
| Acceso anonimo/autenticado | | |
| Private/noindex o publish/index | | |
| Self-canonical/sitemap/internal links | | |
| WordPress/Think/otras copias | | |
| Autorizacion humana | | |

## 9. Link health

| URL | Metodo/fecha | HTTP/redirect | Clase | Nota/accion |
|---|---|---|---|---|
| | | | healthy / redirect-review / blocked-unverified / timeout-unverified / broken-confirmed / unsafe | |

## 10. CTA, analytics y privacidad

- CTA/destino:
- UTMs observadas:
- Redirect y analytics:
- PII/secrets en URL, dataLayer o logs: none | finding

## 11. Render live

| Viewport | H1/TOC | Media | Overflow/solapamiento | Consola | Estado |
|---|---|---|---|---|---|
| Desktop | | | | | |
| Mobile | | | | | |

## 12. Findings

| Severidad | Finding | Evidencia | Owner | Bloquea publicacion | Accion |
|---|---|---|---|---|---|
| | | | | yes/no | |

## 13. Cierre

- Veredicto final:
- Evidencia de readback/live:
- Riesgo residual:
- Proximo control (Search Console/refresh/link recheck):
- Estado que se puede afirmar:
```

## Fuentes normativas a reverificar

Antes de cambiar reglas de indexacion o schema, revisar las versiones vigentes
de estas fuentes primarias:

- Google Search Central, people-first y Who/How/Why:
  `https://developers.google.com/search/docs/fundamentals/creating-helpful-content`
- Google Search Central, `Article` y author markup:
  `https://developers.google.com/search/docs/appearance/structured-data/article`
- Google Search Central, canonicalization:
  `https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls`
- Google Search Central, `noindex`:
  `https://developers.google.com/search/docs/crawling-indexing/block-indexing`

Estas fuentes definen compatibilidad con Google, no garantizan ranking,
citacion, rich results ni indexacion inmediata.
