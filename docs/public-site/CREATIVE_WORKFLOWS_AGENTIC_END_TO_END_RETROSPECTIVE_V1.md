# Creative Workflows: retrospectiva del primer blogpost agentic end to end

> **Fecha:** 2026-07-15
> **Estado:** cierre completo; post publicado y verificado
> **URL:** `https://efeoncepro.com/creative/creative-workflows/`
> **WordPress post:** `251363`
> **Autor humano:** Julio Reyes (`author_id=1`)
> **Runbook reusable:** [Agentic Blogpost End-to-End Runbook V1](../operations/public-site-content-factory/AGENTIC_BLOGPOST_END_TO_END_RUNBOOK_V1.md)
> **Frontera:** este documento conserva el caso y sus aprendizajes. No es una especificacion de Creative Studio ni autoriza implementacion de Creative Workflows.

## 1. Por que este caso importa

Creative Workflows fue el primer articulo de Efeonce llevado por un agente desde una conversacion inicial hasta
una URL publica verificada. El trabajo no consistio solo en redactar. Incluyo definicion de territorio,
arquitectura Pillar/satelites, investigacion, coautoria, voz personal, estructura Gutenberg, produccion visual,
Media Library, SEO/AEO, E-E-A-T, entidad de autor, publicacion, rollback, QA de navegador y cierre documental.

La conclusion principal no es que el agente deba reemplazar al autor. Es la contraria:

> El agente puede operar el sistema completo cuando la persona conserva tesis, criterio, fuentes, limites,
> permisos y la decision final de publicar.

Este caso tambien corrigio una simplificacion previa del Content Factory. El pipeline sigue terminando en
`private`; sin embargo, un agente puede ejecutar una transicion posterior a `publish` si recibe autorizacion
humana explicita y la operacion tiene snapshot, rollback automatico y verificacion live.

## 2. Resultado final

| Contrato         | Estado verificado                                                                |
| ---------------- | -------------------------------------------------------------------------------- |
| URL publica      | `https://efeoncepro.com/creative/creative-workflows/`                            |
| Estado WordPress | `publish`                                                                        |
| Acceso anonimo   | `HTTP 200`                                                                       |
| Robots           | `index, follow`                                                                  |
| Canonical        | una sola URL, igual al permalink publico                                         |
| H1               | propiedad del titulo WordPress; no existe H1 duplicado en `post_content`         |
| Gutenberg        | 111 bloques semanticos; cero findings de Content Factory                         |
| Outline          | 21 headings H2/H3; TOC Yoast con 21 destinos validos                             |
| Media            | tres imagenes de cuerpo; featured/OG JPEG `1440x757`                             |
| Links            | 39 enlaces en el articulo; 34 HTTP unicos                                        |
| Link health      | 29 `2xx/3xx`, tres `403` de proteccion, dos timeouts, cero `404/5xx` confirmados |
| Schema           | `Article` + entidad `Person` de Julio                                            |
| Social           | `og:type=article`, `summary_large_image`, imagen JPEG `HTTP 200`                 |
| CTA              | enlace gobernado a contacto con UTMs editoriales y sin PII                       |
| Duplicidad       | rutas equivalentes probadas en Think respondieron `404`                          |
| Browser QA       | desktop `1440x1000` y mobile `390x844`, sin overflow ni imagenes rotas           |

Titulo editorial:

`Creative Workflows: cómo escalar la creatividad sin automatizar el criterio`

Meta title, deliberadamente mas corto:

`Creative Workflows: qué son y cómo funcionan - Efeonce`

## 3. Evolucion V1 a V4

### V1: estructura gobernada y borrador privado

- PDR-014 definio el territorio y la frontera frente a Creative Studio.
- El brief maestro separo Pillar, 12 satelites y tres olas.
- El dossier de research documento SERP, claims y limites sin inventar volumenes.
- Content Factory creo el post `251363` con 75 bloques, manifest idempotente y autor `1`.
- El post quedo `private`; el `404` anonimo era el resultado correcto.
- La inspeccion profunda confirmo TOC, 20 headings, metadata y ausencia de `core/freeform` no vacio. El raw de
  `parse_blocks()` devolvio 149 nodos porque incluia 74 `core/freeform` vacios; el conteo gobernado correcto era 75.

**Aprendizaje:** un draft valido no es una pieza lista para publicar. Faltaban revision autoral, media, categoria,
links inline, canonical, metadata completa y evidencia aplicada.

### V2: reescritura editorial y voz de Julio

- La reescritura alcanzo aproximadamente 3.767 palabras y 98 bloques en dry-run.
- El hook paso de definicion abstracta a una tension conversacional reconocible.
- Se agrego un caso conductor y se redujo el tono de manual corporativo.
- Se preservaron `con manzanitas` y `te lo explico con manitas` como motivos personales de Julio, no como voz
  institucional de Efeonce. Una activación visible usa la firma exacta `🍏🍏🍏` antes de la puntuación.
- La auditoria editorial separo hook, argumento, ritmo, CTA, evidencia y claims.

**Aprendizaje:** capturar una voz no significa agregar modismos al final. Requiere observar como el autor
pregunta, contrasta, explica, baja abstracciones y decide que no quiere sonar como consultora o texto de IA.

### V3: sistema visual, WordPress y metadata social

- `La señal seleccionada` se definio como sistema visual con cuatro assets.
- GPT Image 2 produjo masters para hero, interfaz creativa, dos velocidades y seis momentos.
- Se generaron derivados WebP para web y un JPEG social compatible.
- WordPress registro media `251365-251368` y `251370` con ALT, caption y descripcion.
- La V3 integro tres imagenes de cuerpo y uso el hero como featured/OG sin duplicarlo dentro del articulo.
- Content Factory paso con 101 bloques y cero findings.
- Se resolvieron categoria `Creative`, excerpt, focus keyphrase, meta title separado del H1 y meta description.
- El post siguio `private`, `noindex, follow` y anonimo `404`.

**Aprendizaje:** la imagen editorial debe resolver una comprension concreta. El hero puede trabajar como
featured/OG sin repetirse en body cuando el tema no lo muestra dentro del single post. JPEG sigue siendo la
opcion social mas conservadora aunque WordPress conserve derivados WebP.

### V4: E-E-A-T, experiencia, autor y publicacion

- Se incorporaron fuentes primarias inline con muestra, metodo, resultado y limites.
- La evidencia de mercado se identifico como declarativa, no causal.
- La evidencia neurocientifica se uso sin convertir correlacion u offloading en prueba clinica del workflow.
- El caso SKY agrego experiencia propia: 178 piezas, cinco mercados y reduccion observada de `21-25%`, con
  periodo, metodo y caveats de caso no controlado.
- Se incorporaron autoría, metodología, límites y disclosure de uso de IA. La última pasada sustituyó la
  checklist Who/How/Why por tres párrafos conversacionales bajo `Antes de cerrar: qué sostiene esta guía y qué
no`, conservando la transparencia sin interrumpir el argumento.
- Los bloques Gutenberg nativos resultaron suficientes; no se creo un bloque custom para destacar evidencia.
- Content Factory incorporo rich text estructurado para links inline seguros y énfasis semántico en intro,
  párrafos, listas y CTA.
- La entidad Yoast de Julio se corrigio mediante REST para campos publicos y WP-CLI para user meta no expuesto.
- El CTA final, inicialmente texto sin link, se convirtio en un enlace gobernado.
- Tras autorizacion humana explicita se publico con snapshot y rollback guard.
- El cierre live verifico navegador, enlaces, media, schema, OG, canonical, robots y duplicidad.
- La pasada de lectura dejó `99` segmentos `<strong>` en 4.488 palabras visibles (`16,6%`), máximo dos por
  bloque; desktop `1440x1000` y mobile `390x844` confirmaron jerarquía legible, tres `🍏` cargadas y cero
  overflow dentro del artículo.

**Aprendizaje:** E-E-A-T no se agrega como una bibliografia decorativa. Debe cambiar la forma del claim, mostrar
limites y conectar identidad de autor, experiencia aplicada y trazabilidad tecnica.

## 4. Decisiones que se vuelven canon

### 4.1 Persona, agente y sistema

| Decision         | Persona            | Agente                           | Sistema determinista            |
| ---------------- | ------------------ | -------------------------------- | ------------------------------- |
| Tesis y posicion | decide             | cuestiona y estructura           | conserva artefactos             |
| Fuentes y claims | aprueba            | investiga, contrasta y clasifica | valida estructura/enlaces       |
| Voz              | reconoce y corrige | aprende de iteracion real        | enruta Julio vs Efeonce         |
| Visuales         | aprueba direccion  | diseña prompts, genera y audita  | manifiesta hashes/IDs/derivados |
| Gutenberg        | decide contenido   | compone la spec                  | genera bloques, anchors y TOC   |
| Publicacion      | autoriza           | ejecuta y verifica               | snapshot, rollback, readback    |

### 4.2 El articulo no es producto

- La Pillar educa, crea categoria y sostiene autoridad.
- Sus diagramas, modelos o templates conceptuales no son schemas, commands, providers ni acceptance criteria.
- Creative Studio solo puede materializar aprendizajes mediante RESEARCH-009, arquitectura vigente, EPIC-028 y
  una task formal en su repositorio.

### 4.3 Native Gutenberg primero

- Usar `core/heading`, `core/paragraph`, `core/list`, `core/quote`, `core/pullquote`, `core/image`,
  `core/separator` y `yoast-seo/table-of-contents` cuando cubren el trabajo.
- Crear un bloque custom solo si existe una funcion editorial repetible que los bloques nativos no puedan
  expresar.
- El titulo WordPress posee el H1; el body comienza en H2.
- Los headings se generan con anchors y el TOC se deriva del mismo outline.

### 4.4 Links como datos, no HTML libre

- Los links inline viven como segmentos `{ text, href? }` dentro de `GutenbergRichText`.
- El renderer escapa texto/atributos y admite solo `http:`, `https:` y `mailto:`.
- Protocolos inseguros fallan antes de producir Gutenberg.
- Parrafos, listas y CTA usan el mismo contrato.

### 4.5 Taxonomia y URLs

- La categoria importa porque el permalink usa `/%category%/%postname%/`.
- La URL canonica quedo en WordPress: `/creative/creative-workflows/`.
- No se agregaron tags redundantes; una taxonomia solo se crea si mejora navegacion o agrupacion editorial real.
- Think no puede servir una segunda copia indexable.
- Retaxonomizar un post publicado exige redirects/canonical, no un cambio cosmetico.

### 4.6 Titulo editorial y meta title cumplen trabajos distintos

- El H1 puede sostener la promesa completa y la voz autoral.
- El meta title debe ser mas corto, escaneable y compatible con SERP.
- El excerpt no reemplaza la meta description.
- Slug, title, excerpt, meta title, meta description y focus keyphrase se revisan como un conjunto, no como campos
  aislados.

### 4.7 Indexacion por estado

- Mientras el post esta privado: `noindex, follow` y `404` anonimo son correctos.
- Publicar implica cambiar a `index, follow` y verificar el HTML anonimo.
- Un `200` no demuestra indexabilidad si canonical o robots estan mal.
- `index, follow` y canonical correcto significan **elegible para indexacion**, no “indexado”. La indexacion
  efectiva requiere evidencia posterior de Search Console o del indice del motor.

### 4.8 Autor como entidad

El byline visible no basta. El preflight debe revisar:

- nombre y capitalizacion;
- URL de autor;
- biografia y experiencia pertinente;
- `sameAs` valido;
- `jobTitle`;
- `worksFor`;
- `knowsAbout`;
- nodo `Person` conectado al `Article`.

REST puede no exponer todos los user meta de Yoast. En ese caso, usar el write path WP-CLI/Kinsta sancionado con
snapshot, verificacion y rollback. Nunca documentar endpoints privados, llaves, tokens, passwords o JWTs que
puedan aparecer en diagnosticos de plugins.

### 4.9 Evidencia y E-E-A-T

Cada claim importante debe declarar, segun aplique:

- tipo de fuente;
- muestra;
- metodo;
- resultado;
- fecha;
- limitacion;
- si es evidencia, inferencia o doctrina Efeonce.

Un caso cliente necesita permiso, periodo, muestra, metodo y caveats. Una mejora observada no se convierte en
garantia universal. Una encuesta no se presenta como experimento y una correlacion no se presenta como causalidad.

### 4.10 Visuales como sistema editorial

- Definir primero el trabajo cognitivo de cada imagen.
- Mantener IDs de concepto, prompts, masters, derivados, hashes y decision de uso.
- Inspeccionar masters y exports a resolucion real.
- Revisar anatomia, texto accidental, logos, continuidad, crop, peso y legibilidad.
- No simular una captura de producto, experimento cientifico o evidencia de cliente.
- ALT explica la relacion relevante; caption no repite el ALT.
- Featured, body y OG son roles distintos aunque nazcan del mismo master.

### 4.11 Publicacion fail-closed

El publish no es el ultimo click. Es una transaccion con este contrato:

1. version concreta revisada;
2. autorizacion humana explicita;
3. snapshot completo pre-publicacion;
4. precondicion de estado `private|publish` conocida;
5. write por REST/WP-CLI sancionado;
6. readback autenticado;
7. request anonimo sin cache;
8. checks centrales;
9. rollback a `private` ante cualquier fallo;
10. evidencia final y cierre documental.

## 5. Incidentes y correcciones

| Hallazgo                                                     | Causa                                                          | Correccion                                                                        | Regla reusable                                                            |
| ------------------------------------------------------------ | -------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| CTA final era solo texto                                     | la spec original no soportaba link en CTA                      | `GutenbergRichText` se extendio a CTA y se agrego test                            | toda accion prometida debe tener destino verificable                      |
| Links de fuentes no podian vivir inline                      | spec solo aceptaba strings                                     | segmentos estructurados + allowlist de protocolos                                 | no insertar HTML libre para resolver rich text                            |
| El artículo no tenía ruta visual de escaneo                  | la spec no expresaba énfasis semántico                         | `strong?: boolean`, tests y pasada editorial completa                             | diseñar negritas después de cerrar prosa y revisar wrapping móvil         |
| Perfil Yoast contenia datos legados                          | REST no exponia todo el user meta                              | WP-CLI con snapshot, cache flush, readback y rollback                             | auditar `Person` antes de publicar contenido firmado                      |
| WebP no era la opcion social mas conservadora                | compatibilidad/crop social varia por plataforma                | JPEG `1440x757` como featured/OG; WebP conservado                                 | separar asset web de asset social                                         |
| Hero no aparecia en body                                     | comportamiento normal del tema Ohio                            | se mantuvo como featured/OG y se usaron tres visuales contextuales en body        | verificar render real antes de duplicar media                             |
| Algunas fuentes respondieron `403` o timeout                 | proteccion anti-bot o disponibilidad del origen                | se clasificaron aparte; cero `404/5xx` confirmados                                | no declarar link roto sin distinguir la clase de fallo                    |
| V3 privada seguia apareciendo como estado vigente en docs    | la documentacion no se sincronizo con la transicion publica    | se marco V3 como snapshot historico y V4 como canon                               | cada publish debe cerrar docs, no solo WordPress                          |
| La documentacion antigua decia “el agente nunca publica”     | confundia limite de Content Factory con limite de orquestacion | se separo `run --send` privado de publish posterior autorizado                    | el authoring no autopublica; el agente puede ejecutar una decision humana |
| WordPress reportaba 149 nodos frente a 75 bloques gobernados | `parse_blocks()` incluia 74 `core/freeform` vacios             | se separaron conteos raw, semantico y freeform no vacio                           | nunca comparar conteos sin declarar la semantica usada                    |
| La checklist metodológica rompía el ritmo                    | el control E-E-A-T se escribió como auditoría visible          | tres párrafos conversacionales con autoría, límites y disclosure                  | la transparencia pertenece al artículo; la checklist pertenece al gate    |
| El readback cambió los tres emojis                           | WordPress serializó `🍏` como entidades hexadecimales          | normalización limitada a `&#x1f34f;` y verificación DOM por `img.emoji[alt="🍏"]` | aceptar normalizaciones conocidas, nunca una igualdad semántica amplia    |
| La versión pública quedó temporalmente stale                 | caché Kinsta después del write REST                            | purge sancionado, retry público y rollback fail-closed                            | una respuesta REST correcta no prueba qué está leyendo el visitante       |
| Riesgo de exponer material sensible en diagnosticos          | algunos plugins/CLIs imprimen metadatos de autenticacion       | no persistir ni retransmitir outputs sensibles; redactar evidencia                | los logs crudos no son documentacion publicable                           |

## 6. Artefactos del caso

| Capa                            | Artefacto canonico                                                                                       |
| ------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Decision de territorio          | `docs/public-site/decisions/PDR-014-creative-workflows-territorio-editorial-pillar-cluster.md`           |
| Brief Pillar/cluster            | `docs/public-site/CREATIVE_WORKFLOWS_PILLAR_CLUSTER_BRIEF_V1.md`                                         |
| Research                        | `docs/public-site/CREATIVE_WORKFLOWS_PILLAR_RESEARCH_DOSSIER_V1.md`                                      |
| Spec inicial                    | `docs/public-site/CREATIVE_WORKFLOWS_PILLAR_GUTENBERG_SPEC_V1.json`                                      |
| Reescritura/autoria             | `docs/public-site/CREATIVE_WORKFLOWS_PILLAR_EDITORIAL_REWRITE_V2.md`                                     |
| Auditoria editorial             | `docs/public-site/CREATIVE_WORKFLOWS_PILLAR_EDITORIAL_AUDIT_V2.md`                                       |
| Spec visual anterior            | `docs/public-site/CREATIVE_WORKFLOWS_PILLAR_GUTENBERG_SPEC_V3.json`                                      |
| Sistema visual                  | `docs/public-site/CREATIVE_WORKFLOWS_PILLAR_VISUAL_SYSTEM_V1.md`                                         |
| Auditoria visual                | `docs/public-site/CREATIVE_WORKFLOWS_PILLAR_VISUAL_AUDIT_V1.md`                                          |
| Corrida de imagenes             | `ai-generations/2026-07-15_creative-workflows-pillar/`                                                   |
| Auditoria privada WordPress/SEO | `docs/public-site/CREATIVE_WORKFLOWS_PILLAR_WORDPRESS_SEO_AUDIT_V3.md`                                   |
| Spec publicada                  | `docs/public-site/CREATIVE_WORKFLOWS_PILLAR_GUTENBERG_SPEC_V4.json`                                      |
| Auditoria E-E-A-T/publicacion   | `docs/public-site/CREATIVE_WORKFLOWS_PILLAR_EEAT_AUDIT_V4.md`                                            |
| Inspeccion profunda inicial     | `docs/operations/public-site-content-factory/post-deep-inspection-251363-2026-07-15T05-25-14+00-00.json` |
| Primitive de authoring          | `src/lib/public-site/content-factory/article-authoring.ts`                                               |
| Tests                           | `src/lib/public-site/content-factory/__tests__/article-authoring.test.ts`                                |

Los snapshots operativos y scripts temporales de publicacion permanecen gitignored. Son evidencia de rollback de
esta ejecucion, no primitives reusables ni ejemplos para copiar con credenciales.

## 7. Que se canoniza en skills

| Skill                           | Memoria reusable                                                                                       |
| ------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `efeonce-public-site-wordpress` | WordPress/Content Factory, rich text semántico, media, metadata, author entity, publish gate y QA live |
| `seo-aeo`                       | intent, claims, E-E-A-T, canonical, schema, link health y auditoria de publicacion                     |
| `copywriting`                   | coautoria, voz Julio/Efeonce, hook, jerarquía de lectura, running motifs, CTA y disclosure             |
| `content-marketing-studio`      | sistema visual editorial, assets, manifests, QA y roles hero/body/OG                                   |

Las skills guardan procedimientos de carga frecuente. Este documento guarda el caso. El runbook une los dominios.

## 8. Residuos honestos y siguientes iteraciones

No bloquean el cierre del articulo, pero no deben perderse:

- El helper de publicacion usado en este caso fue especifico y temporal. Si la operacion se repite, debe nacer una
  capability durable con contrato de confirmacion, snapshot, rollback y checks configurables; no copiar el script
  temporal como si fuera plataforma.
- La spec V4 uso URLs reales provenientes de Media Library, fuentes verificadas y YouTube. Una capability
  durable debe sumar validacion runtime del JSON y sanitizacion/escaping explicito para fuentes de imagen y
  embeds, aunque los rich links de parrafos, listas y CTA ya tengan allowlist y tests.
- La investigacion de demanda regional no atribuyo volumenes no verificados. Puede profundizarse para priorizar
  satelites, no para reabrir retroactivamente el gate de esta Pillar.
- La publicacion debe observarse despues en Search Console, analitica, citacion AEO, lectura, CTA y preguntas reales.
- La ola 1 de satelites sigue pendiente y debe priorizarse por demanda/evidencia, no producirse en bloque.
- El territorio puede madurar desde Pillar y satelites hacia un ebook/workbook y, con iniciativa separada, una
  tool diagnostica. La progresion, sus gates y la separacion entre evidencia cientifica, aplicada y de producto
  viven en [Creative Workflows Knowledge-to-Product Ladder V1](CREATIVE_WORKFLOWS_KNOWLEDGE_TO_PRODUCT_LADDER_V1.md).
- Un refresh futuro debe trabajar sobre clone/draft y preservar la URL publicada; cambios de categoria requieren
  estrategia de redirect.
- La captura de navegador publica funciono con Playwright directo. Si este flujo escala, conviene una receta
  durable de captura Public Site que conserve desktop/mobile, consola, requests y `scrollWidth` como evidencia.
- El rendimiento de cuatro assets aprobados en primera pasada describe esta corrida; no es un benchmark de
  calidad, costo o yield esperado para futuras generaciones.

## 9. Definition of Done que alcanzo este caso

- [x] Tesis, audiencia, frontera de producto y arquitectura editorial documentadas.
- [x] Research y claim ledger trazables, sin volumenes o causalidad inventados.
- [x] Voz humana revisada y ownership autoral explicito.
- [x] Spec determinista, Gutenberg nativo, TOC y links seguros.
- [x] Media real con provenance, metadata e IDs WordPress.
- [x] Metadata SEO/AEO, canonical, robots, schema y Open Graph.
- [x] Entidad de autor corregida y verificada.
- [x] Draft privado, snapshots y rollback disponibles.
- [x] Autorizacion humana explicita antes de `publish`.
- [x] QA live desktop/mobile, links, media, consola y duplicidad.
- [x] Skills, docs, contexto, changelog y handoff sincronizados.
- [x] Frontera Creative Studio/EPIC-028 preservada.

El cierre correcto es: **publicado, operativo y documentado; aprendizaje convertido en sistema reusable**.
