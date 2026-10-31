# Refresh — «ICP B2B: cómo definir tu cliente ideal» (borrador V3)

> **Estado:** **publicado 2026-10-25** (aprobado por Julio Reyes). Ver §5c «Registro de publicación».
> **URL (se conserva):** https://efeoncepro.com/growth/cliente-ideal-b2b-icp-buyer-persona-ipp-jtbd/ (post `249108`)
> **Autor / voz:** Julio Reyes · voz Julio, doctrina como «En Efeonce…».
> **Creado:** 2026-10-25 · **Fuente editable:** [`ICP_B2B_REFRESH_GUTENBERG_SPEC_V1.json`](ICP_B2B_REFRESH_GUTENBERG_SPEC_V1.json)
> (validación `pass` sin hallazgos; 74 bloques, ~2.500 palabras, 2 infografías).
> **Propuesta aprobada:** [`BLOG_REFRESH_TANDA_1_PROPUESTA_V1.md`](BLOG_REFRESH_TANDA_1_PROPUESTA_V1.md) §2.

## 1. Por qué se reescribe

| Señal | Dato | Fuente |
|---|---|---|
| Rendimiento | 1.330 impresiones en 90 días (−29 %), posición 12,6 (antes 9,5), 5 clics | Search Console, 2026-07-26 → 10-23 vs. ventana previa |
| Snippet | «icp b2b»: posición 6,7, 193 impresiones, 0 clics | Search Console |
| Intención sin atender | «icp b2b ejemplos» (8,5), «plantilla icp» (13), «buyer persona vs icp» (12,1) | Search Console |
| Lectura | Interacción 22 %, duración media 32 s (antes 118 s) | GA4 |
| Definición tardía | El ICP se define recién tras ~560 palabras, y primero en negativo | Lectura completa |
| Ejemplo contradictorio | El «ejemplo de ICP» es una persona («Edward») | Lectura completa |
| Sin ejemplos ni plantilla | Ni cuentas de ejemplo ni plantilla de ICP | Lectura completa |
| Cifras | Trustmary (agregador, enlace con `utm_source=chatgpt.com`) distorsionada; Gartner 6–10 sin enlace (página retirada) | Verificación de fuentes |
| IPP | Presentado como término estándar; desalineado con el *champion test* de la casa | `efeonce-customer-model-operator` |
| Forma | 21 «👉», TL;DR y dos cierres repetidos, cero imágenes, title ≠ H1 | Versión publicada |

## 2. Metadata propuesta

| Campo | Actual | Propuesto |
|---|---|---|
| Title (SEO) | Cliente ideal B2B: cómo definir ICP, Buyer Persona, IPP y JTBD | ICP B2B: qué es, ejemplos y plantilla para tu cliente ideal \| Efeonce |
| Meta description | Define tu cliente ideal en B2B con ICP, Buyer Persona, IPP y Jobs to Be Done… | Qué es un ICP en B2B, en qué se diferencia del buyer persona, tres ejemplos redactados y una plantilla con los campos que sirven para descartar cuentas. |
| H1 | 5 pasos para definir a tu cliente ideal: ICP, Buyer Persona, IPP y Jobs to Be Done | ICP B2B: cómo definir tu cliente ideal, con ejemplos y plantilla |
| Slug | `/growth/cliente-ideal-b2b-icp-buyer-persona-ipp-jtbd/` | Sin cambio (el post de topic clusters lo enlaza) |

## 3. Fuentes verificadas (2026-10-25)

- **Gartner, comunicado del 7 de mayo de 2025:** encuesta a 632 compradores B2B (agosto–septiembre de 2024); grupos de
  compra de 5 a 16 personas de hasta cuatro áreas; consenso → 2,5 veces más probabilidad de un negocio de calidad;
  contenido pensado para el grupo ayuda al consenso (+20 %) y el individual lo dificulta (−59 %). Leído en el navegador
  (curl recibe 403 por bloqueo de bots). Reemplaza el «6 a 10» de una página de Gartner que ya no existe.
- **HBR (2016), Christensen, Hall, Dillon y Duncan:** «Know Your Customers’ Jobs to Be Done».
- **Strategyn:** Outcome-Driven Innovation (Ulwick).
- **HubSpot KB, ABM:** propiedades «Ideal Customer Profile Tier» y «Target account» (empresa) y «Buying role» (contacto).
- **Doctrina de la casa:** roles del grupo de compra y *champion test* de `efeonce-customer-model-operator`
  (`references/customer-model-method.md` §4).

## 4. Decisiones abiertas para Julio

- **ICP real de Efeonce como ejemplo:** no se incluyó. Los tres ejemplos son ilustrativos y van marcados así. La
  doctrina interna (piso de 50 personas, gate económico) queda fuera del artículo salvo que la apruebes.

## 5. Copia privada para revisión

- **Post privado `252093`**, autor Julio Reyes, slug `icp-b2b-revision-2026-10`; canonical y Yoast apuntan a la URL
  real; anónimo `404`. Ver con sesión: https://efeoncepro.com/wp-admin/post.php?post=252093&action=edit
- **El post publicado `249108` no se tocó.**
- **V2 (2026-10-25 10:52 UTC):** enlaces internos sumados a pedido de Julio (artículo «cómo transformar tu CRM» y
  mención de HubSpot en Efeonce en la sección de HubSpot). Escritura con guardas; respaldo de la V1:
  `_gh_icp_review_252093_v1_20261025_105242`; hash `27603fcb…`.
- **QA:** contenido guardado = generado; índice con 13 anclas, ninguna rota; 2 tablas que caben a 390 px; 7 preguntas
  frecuentes con el estilo Efeonce; 3 menciones de servicio (HubSpot, AI Visibility Report, inbound); 13 enlaces
  externos e internos, todos 200 (Gartner sólo en navegador).
- **Para publicar** (con tu visto bueno): escribir título, extracto, contenido y Yoast en `249108` con guardas y
  respaldo, como en RUT e inbound; después pasar `252093` a la papelera.

## 5b. Infografías y portada (2026-10-25, aprobadas por Julio)

- **Infografías de cuerpo** (`ai-generations/2026-10-25_icp-infografias/`, builder `build.mjs`): «Cuatro preguntas sobre
  una misma cuenta» (ICP como tarjeta, grupo de compra en baldosas, órbita de La órbita sobre el IPP, job con contraste
  de pesos de Bricolage) y «Un buen ICP sirve para descartar» (cuatro grillas de 30 que se vacían; las tres finales en el
  acento Growth; proporciones ilustrativas). Cada una en escritorio/móvil × claro/oscuro; texto contorneado; tokens de
  `@efeoncepro/axis-tokens`, `orbitSvg` y `resolveIcon`; `auditIconGroup` ok. Auditor editorial: 8/8 `PASS`, ~20–22 KB
  Brotli.
- **Media Library:** adjuntos `252095`–`252102` (`uploads/2026/10/icp-*.svg`), `image/svg+xml`, 200, Brotli, caché
  anual, sha256 = local. Fallback: escritorio claro (`252096`, `252100`); `<picture>` con móvil oscuro, móvil claro y
  escritorio oscuro.
- **Integración:** copia privada V3 (11:21 UTC, respaldo de la V2 `_gh_icp_review_252093_v2_20261025_112155`, hash
  `c68d5316…`). Verificado en navegador: 1440 claro → escritorio claro; 390 oscuro → móvil oscuro; proporción reservada =
  natural en los dos; sin desborde. Límite conocido: el modo oscuro del sitio con el interruptor del tema (no el del
  sistema) muestra la variante clara, igual que en Web Agéntica.
- **Decisiones de Julio en esta ronda:** logo y burbuja URL en el pie (la imagen se comparte sola); rótulo de figura en
  vez de encabezado; los elementos de interfaz se quedan; acabado premium; Bricolage con contraste de pesos. Registradas
  en la skill `efeonce-graphic-line` (`ledger.md`, 2026-10-25).
- **Portada:** ficha `MCB-ICP1-169` (Hum, growth), «¿Para qué sirve un ICP? Decir no.», JPEG
  `icp-b2b-cliente-ideal-2026.jpg`; simulación de subida sobre `249108` `ok: true`. Se sube con la publicación. Para la
  próxima portada, Julio pide cambiar la fórmula (persona + vidrio ya se repite).

## 5c. Registro de publicación (2026-10-25 11:29 UTC)

- **Post:** WordPress `249108`, misma URL, autor Julio Reyes (user `1`), categoría Growth (`80`), etiquetas sin cambios.
- **Escrito** con `tmp/post-refresh-apply.php`: título, contenido (V3, 74 bloques, 2 infografías), extracto, title y
  descripción de Yoast, palabra clave «icp b2b» (antes «cliente ideal B2B»), tiempo de lectura 13 min y el título y la
  descripción Open Graph (seguían con la versión de febrero). Guardas: estado, slug, autor, `post_modified_gmt`
  (`2026-02-13 20:59:19`), hash previo y título Yoast; 13 comprobaciones en `true`; hash guardado `c68d5316…`.
- **Portada** (11:30 UTC): adjunto `252105`, `uploads/2026/02/icp-b2b-cliente-ideal-2026.jpg` (2400 × 1260, sha256
  `67246507…`), destacada e imagen OG; respaldo `_gh_cover_refresh_249108_20261025_113007` (destacada previa `249142`).
  `blog-post-cover-apply.php` ahora acepta `expectedOg: 0` (post sin OG propia).
- **Respaldo del contenido:** local `tmp/cliente-ideal-b2b-icp-post-249108-before-v1-20261025T112923Z.json` y opción
  `_gh_post_refresh_249108_20261025_112953`.
- **Rollback:** `pnpm public-website:wpcli -- --eval-file ./tmp/post-refresh-rollback.php --input-file ./tmp/icp-249108-rollback-input.json --wp-user 12`;
  la portada, con la opción `_gh_cover_refresh_249108_20261025_113007` (manual de portadas, «Volver atrás»).
- **QA en vivo (anónimo):** `200`; title, descripción, canonical e `index, follow`; un H1; `og:title`/`og:description`
  nuevos; `og:image` = portada nueva con `og:image:alt` y `twitter:image:alt`; `BlogPosting` con `headline` y
  `dateModified` nuevos, `Person` Julio Reyes, `FAQPage` con 7 preguntas, breadcrumb Portada › Growth › título; índice
  con 13 anclas sin rotas; 2 infografías con alt, leyenda y 3 `<source>` cada una (390 claro → móvil claro; 1440 con
  sistema oscuro → escritorio oscuro; proporción = natural); 2 tablas que caben a 390 px; 7 preguntas con el estilo
  Efeonce; 3 menciones; 13 enlaces con 200 (Gartner bloquea curl, verificado en navegador); sin rastro de Trustmary,
  `utm_source=chatgpt` ni la portada anterior; sin desborde; consola sin errores. `blog-home verify --browser` en verde.
- **Copia `252093`:** en la papelera; anónimo `404`.
- **Observaciones:** el schema saca `keywords` de las etiquetas (b2b, buyer persona, ipp, jobs to be done, marketing b2b),
  sin «icp»; Yoast no emite `twitter:description` en este post (X usa la de Open Graph). El tema muestra su propio tiempo de
  lectura, no el de Yoast.
- ✅ **Modo oscuro, decidido (2026-10-25 11:53 UTC):** el sitio no sigue el modo oscuro del sistema (lo decide su
  interruptor), pero el `<picture>` sí, así que con el sistema en oscuro la infografía salía oscura sobre la página
  clara. El operador decidió dejar sólo las versiones claras: el `<picture>` quedó con móvil claro y escritorio claro.
  Se republicó sólo `post_content` (snapshot `_gh_post_republish_249108_20261025_115301`, FAQ idéntico); los adjuntos
  oscuros siguen en la biblioteca, sin uso.
- **Tabla Efeonce (2026-10-25 12:12 UTC):** las dos tablas pasaron de `stripes` a `efeonce` con el plugin 0.6.0
  (snapshot `_gh_post_republish_249108_20261025_121213`). Registro en `BLOG_EDITORIAL_BLOCK_STYLES_V1.md` §0.6.0.

## 6. Borrador del artículo

### ICP B2B: cómo definir tu cliente ideal, con ejemplos y plantilla

*Actualizado el [fecha de publicación] · Julio Reyes*

Casi todos los equipos B2B tienen un documento que se llama «cliente ideal». Lo hicieron en un taller, tiene una persona con nombre y foto de stock, y nadie lo abrió desde entonces.

El problema no es que el documento esté mal. Es que responde una pregunta distinta a la que importa. **Un ICP no sirve para describir a tu mejor cliente: sirve para decidir a qué empresas no vas a perseguir.**

En esta guía parto por esa definición, la comparo con el buyer persona y después la llevo a algo que puedes usar: tres ejemplos redactados, una plantilla y cómo dejarlo en tu CRM.

#### ¿Qué es un ICP en B2B?

**El ICP (Ideal Customer Profile, o perfil de cliente ideal) es la descripción del tipo de empresa que puede comprarte, sacarle valor a lo que vendes y quedarse contigo el tiempo suficiente para que la relación sea rentable.** Describe cuentas, no personas: industria, tamaño, madurez, el problema que tienen y lo que las hace comprar ahora.

Un buen ICP se reconoce porque te deja decir que no. Si cualquier empresa «mediana y en crecimiento» calza, todavía no tienes un ICP: tienes una aspiración.

- **Es**: un filtro con criterios que alguien de tu equipo puede verificar en una cuenta concreta.
- **No es**: «empresas B2B medianas», ni la lista de las marcas que te gustaría tener en tu portafolio.
- **Sale de**: tus mejores y tus peores clientes, no del deseo de dónde te gustaría vender.

#### ICP vs. buyer persona: cuál es la diferencia

El ICP elige la empresa; el buyer persona describe a las personas que deciden dentro de ella. Se necesitan los dos, pero responden preguntas distintas y viven en lugares distintos del CRM:

|   | ICP | Buyer persona |
|---|---|---|
| Describe | Una empresa | Un rol dentro de la empresa |
| Pregunta que responde | ¿Vale la pena perseguir esta cuenta? | ¿Cómo le hablo a quien decide? |
| Se construye con | Datos de la cuenta: industria, tamaño, stack, resultados de clientes actuales | Entrevistas, llamadas de venta, objeciones reales |
| Lo usa más | Ventas y quien prioriza la prospección | Marketing y quien escribe el contenido |
| Vive en el CRM como | Propiedad de la empresa | Propiedad del contacto |
| Error típico | Describir una persona y llamarla ICP | Hablarle bien a la persona correcta de la empresa equivocada |

> **ICP sin buyer persona es frío. Buyer persona sin ICP es disperso.**

#### Ejemplos de ICP B2B

Tres ejemplos redactados como los escribiría un equipo comercial. Son ilustrativos, no clientes reales, y cada uno tiene lo que más se olvida: qué hace que la cuenta compre ahora y a quién descartas.

**Ejemplo 1 · Software de gestión de personas que vende a otras empresas.**

- **Cuenta**: empresas de 200 a 2.000 trabajadores en Chile, Perú y Colombia, con un área de personas de cinco o más y procesos de remuneraciones y vacaciones en planillas.
- **Qué la hace comprar ahora**: la dotación creció más de 20 % en un año, hubo una fusión o cambió el gerente de personas.
- **Señales que se pueden verificar**: vacantes de analistas de personas, anuncios de expansión, el gerente nuevo en LinkedIn.
- **Anti-ICP**: menos de 100 trabajadores (la planilla todavía alcanza) o filiales que usan el sistema que impone su casa matriz.

**Ejemplo 2 · Fabricante de insumos industriales que vende a través de distribuidores.**

- **Cuenta**: distribuidores regionales con tres o más sucursales, una línea de productos complementaria y cobertura en zonas donde el fabricante no llega directo.
- **Qué la hace comprar ahora**: el distribuidor perdió la marca de un competidor o va a abrir una sucursal.
- **Señales que se pueden verificar**: cambios en su catálogo, avisos de nuevas sucursales, rotación de su equipo de ventas.
- **Anti-ICP**: distribuidores que compiten sólo por precio con producto importado y no invierten en vender.

**Ejemplo 3 · Consultora de ciberseguridad.**

- **Cuenta**: empresas reguladas, como financieras o de salud, de 300 o más personas, sin un responsable de seguridad a tiempo completo o con un equipo de una o dos personas.
- **Qué la hace comprar ahora**: una auditoría con observaciones, un incidente en su industria o una exigencia regulatoria nueva.
- **Señales que se pueden verificar**: vacantes de seguridad abiertas por meses, licitaciones, cambios en el directorio.
- **Anti-ICP**: empresas que buscan sólo marcar el casillero de cumplimiento al menor precio.

Fíjate en que ninguno describe a una persona. Los tres dicen qué tipo de empresa es, qué cambió en ella y cómo lo sabrías sin preguntarle.

#### Plantilla de ICP

Copia esta tabla en tu documento de ventas y llénala con tu equipo. La columna de ejemplo usa el primer caso.

| Campo | Qué escribir | Ejemplo |
|---|---|---|
| Segmento | Industria o tipo de negocio | Empresas con área de personas propia |
| Tamaño | Banda de trabajadores, con fuente | 200 a 2.000 trabajadores |
| Geografía | Países o regiones donde puedes entregar | Chile, Perú y Colombia |
| Madurez | Qué procesos y herramientas tienen hoy | Remuneraciones en planillas |
| Problema | Qué les duele y cuánto les cuesta no resolverlo | Errores en liquidaciones, horas de cierre |
| Trigger | Qué cambia para que compren ahora | Crecimiento de dotación, fusión |
| Señales | Cómo lo verificas y dónde | Vacantes, prensa, LinkedIn |
| Capacidad de compra | Si tienen presupuesto y quién lo libera | Gerencia de personas con presupuesto propio |
| Grupo de compra | Qué roles participan en la decisión | Personas, finanzas, TI |
| Anti-ICP | A quién descartas y por qué | Menos de 100 trabajadores |
| Evidencia | Qué clientes actuales respaldan esta definición | Los cinco clientes con más renovación |
| Revisión | Quién la mantiene y cuándo se vuelve a mirar | Gerente comercial, cada seis meses |

Después, puntúa cada cuenta de 0 a 3 en cuatro criterios: problema, trigger, capacidad de compra y acceso a quienes deciden. Las que suman poco no se descartan para siempre: pasan a contenido y se vuelven a mirar cuando aparece un trigger.

#### Cómo definir tu ICP en cinco pasos

1. Haz la lista de tus clientes actuales y márcalos: los que compraron rápido, renovaron y fueron rentables, y los que costaron más de lo que dejaron.
2. Busca qué tienen en común los primeros y no tienen los segundos: tamaño, industria, madurez, el problema con que llegaron.
3. Identifica qué pasó justo antes de que compraran. Ese es tu trigger, y suele valer más que cualquier dato firmográfico.
4. Escribe el anti-ICP con la misma precisión: qué cuentas se ven atractivas y terminan mal.
5. Contrasta la definición con ventas y con quien entrega el servicio, y ponle fecha de revisión.

Si no tienes clientes suficientes para comparar, parte con una hipótesis explícita y trátala como tal: anota qué la respaldaría y qué la desmentiría, y revísala con las primeras diez oportunidades.

#### Buyer personas y grupo de compra: quién decide

Con el ICP sabes qué empresa perseguir. Dentro de ella, rara vez decide una sola persona: según una [encuesta de Gartner a 632 compradores B2B](https://www.gartner.com/en/newsroom/press-releases/2025-05-07-gartner-sales-survey-finds-74-percent-of-b2b-buyer-teams-demonstrate-unhealthy-conflict-during-the-decision-process) publicada en mayo de 2025, los grupos de compra van de 5 a 16 personas, de hasta cuatro áreas distintas.

Por eso el buyer persona útil se construye desde el rol que cumple cada persona en la decisión, no desde su edad o sus hobbies:

- **Quien tiene el problema**: responde por él y lo vive todos los días.
- **Quien evalúa**: define los requisitos y compara opciones.
- **Quien libera el presupuesto**: puede aprobar, postergar o vetar la compra.
- **Quien puede bloquear**: finanzas, legal, compras o TI, por riesgo o por política.

El mismo estudio trae un dato que cambia cómo se escribe el contenido: los grupos que llegaron a consenso fueron 2,5 veces más propensos a reportar un buen negocio, y el contenido pensado para el grupo ayudó a ese consenso, mientras que el pensado sólo para una persona lo dificultó. **Un buyer persona sirve para entender a cada persona, pero el mensaje tiene que funcionarle al grupo.**

#### A quién convencer primero: el champion (lo que en Efeonce llamamos IPP)

Con cinco o más personas en la decisión, no puedes hablarles a todas al mismo tiempo. En Efeonce llamamos IPP (Ideal Prospect Person) a la persona que conviene convencer primero, porque si ella avanza, el proceso avanza. En la literatura de ventas se le dice champion.

El IPP no siempre es el cargo más alto y casi nunca es quien firma. Lo reconoces por lo que hace dentro de su empresa, no por su título:

- te presenta a las personas del grupo de compra que todavía no conoces;
- te cuenta los criterios y los riesgos con que los van a evaluar;
- arma el caso interno o te pide los datos para armarlo;
- anticipa las objeciones del comité y organiza el siguiente paso.

Interés, simpatía o muchas reuniones no bastan. Si la persona que te parece el IPP no hace ninguna de estas cosas, todavía no lo es.

#### Jobs to Be Done: por qué compra

El ICP dice qué empresa, el buyer persona dice quién decide y el IPP dice por dónde entrar. Falta el porqué. Ahí entra Jobs to Be Done, la idea que Clayton Christensen y sus coautores explicaron en [Harvard Business Review en 2016](https://hbr.org/2016/09/know-your-customers-jobs-to-be-done): las personas no compran productos, los «contratan» para lograr un progreso en una situación concreta, y los «despiden» si no lo logran.

Tony Ulwick lo llevó a un método más operativo, [Outcome-Driven Innovation](https://strategyn.com/jobs-to-be-done/), que mide qué resultados espera quien hace ese trabajo. Para un ICP B2B basta con algo más simple: escribir el trabajo de la cuenta en una frase.

Con el primer ejemplo de arriba:

> **Cuando la empresa crece más rápido que su área de personas, quiero sacar las remuneraciones de las planillas para cerrar cada mes sin errores ni horas extra.**

El job te dice qué prometer y contra qué te comparan: contra la planilla, contra contratar a otra persona o contra no hacer nada. Si tu contenido no habla de ese progreso, compite sólo por funcionalidades.

#### Cómo llevar tu ICP a HubSpot

Un ICP que no está en el CRM no se usa, y un CRM sin criterios de cuenta termina siendo una agenda de contactos (de eso va [cómo transformar tu CRM en un motor de crecimiento](https://efeoncepro.com/hubspot/5-pasos-para-transformar-tu-crm-en-motor-de-crecimiento/)). HubSpot ya trae propiedades para esto en su [configuración de account-based marketing](https://knowledge.hubspot.com/branding/get-started-with-account-based-marketing-in-hubspot):

- **En la empresa**: «Ideal Customer Profile Tier», con tres niveles de cercanía al ICP, y «Target account» para marcar las cuentas que vas a trabajar. Suma una propiedad propia para el motivo de anti-ICP.
- **En el contacto**: «Buying role», el rol de cada persona en la decisión. Ahí marcas a quien libera el presupuesto, a quien decide y a tu champion o IPP.
- **En el negocio**: el trigger que abrió la oportunidad y el job que quieren resolver, como propiedades de texto o selección.

Con eso puedes separar el encaje de la cuenta del interés que muestra, y ver qué cuentas de nivel 1 todavía no tienen a nadie del grupo de compra identificado. Si estás ordenando el CRM, sigue con [cómo armar un pipeline de ventas](https://efeoncepro.com/hubspot/crea-un-pipeline-de-ventas-que-convierte-guia-paso-a-paso/). Y si prefieres configurarlo con nosotros, así trabajamos [HubSpot en Efeonce](https://efeoncepro.com/servicios-contratar-hubspot/).

#### Checklist: ¿tienes bien definido a tu cliente ideal?

- Tu ICP describe empresas, no personas.
- Puedes nombrar tres cuentas que no son ICP y explicar por qué.
- Sabes qué trigger hace que una cuenta compre ahora.
- Tienes identificados los roles del grupo de compra, no sólo un decisor.
- Sabes quién es el IPP en tus oportunidades abiertas.
- Puedes escribir el job de la cuenta en una frase.
- El ICP está en tu CRM y tiene fecha de revisión.

Si tu ICP está claro, el siguiente paso es el contenido que lo atrae. En [qué es el inbound marketing](https://efeoncepro.com/inbound/que-es-inbound-marketing/) y en [topic clusters y contenido pilar](https://efeoncepro.com/inbound/seo-inbound-marketing/) está cómo ordenarlo; y si trabajas con Loop Marketing de HubSpot, la etapa de definición parte justamente por aquí: [Express, la voz de marca en Loop Marketing](https://efeoncepro.com/loop-marketing/express-voz-marca-ia-loop-marketing/).

#### Preguntas frecuentes sobre el ICP

**¿Qué es un ICP en marketing?**

Es el perfil del tipo de empresa a la que marketing debería atraer: la que puede comprar, sacarle valor a lo que vendes y quedarse. Marketing lo usa para decidir dónde invertir y qué cuentas no perseguir.

**¿Qué es un ICP en ventas?**

Es el mismo perfil, usado para priorizar la prospección y calificar oportunidades: una cuenta que calza con el ICP y tiene un trigger reciente merece tiempo de ventas; una que no calza, no.

**¿Cuál es la diferencia entre ICP y buyer persona?**

El ICP describe una empresa; el buyer persona describe un rol dentro de esa empresa. El primero decide a qué cuenta perseguir y el segundo, cómo hablarle a quien decide.

**¿Cuántos ICP puede tener una empresa?**

Tantos como líneas de negocio con un comprador distinto, pero cada uno con sus propios criterios y su anti-ICP. Si tienes cinco ICP para una sola oferta, probablemente tienes uno mal definido.

**¿Qué es un anti-ICP?**

Es la descripción de las cuentas que se ven atractivas pero terminan mal: compran poco, se van pronto o cuestan más de lo que dejan. Escribirlo es lo que hace que el ICP sirva para descartar.

**¿Qué es un IPP?**

Es el nombre que usamos en Efeonce para la persona del grupo de compra que conviene convencer primero, lo que en ventas se llama champion. Se reconoce por lo que hace dentro de su empresa, no por su cargo.

**¿Cada cuánto se revisa el ICP?**

Al menos dos veces al año, y siempre que cambie la oferta, el precio o el mercado. Si las oportunidades que calzan con el ICP dejan de cerrar, no esperes la fecha.

#### En resumen

El ICP elige la empresa, el buyer persona describe a quienes deciden, el IPP te dice por dónde entrar y el job explica por qué compran. Ordenados sobre una misma cuenta, dejan de ser documentos y se vuelven criterios para decidir dónde poner el tiempo de marketing y de ventas.

- Si quieres seguir esta conversación, lee [Glitch](https://efeoncepro.com/category/glitch/): cada lunes, una idea sobre IA, marketing y negocios.
- Revisa cómo te describen hoy los asistentes de IA con el [Efeonce AI Visibility Report](https://think.efeoncepro.com/brand-visibility), gratuito.
- Y si quieres definir tu ICP y llevarlo a tu CRM con un equipo que lo hace todos los días, conoce nuestro [servicio de inbound marketing](https://efeoncepro.com/agencia-inbound-marketing/).

#### Fuentes y nota de actualización

- Gartner (2025). [Gartner Sales Survey Finds 74% of B2B Buyer Teams Demonstrate “Unhealthy Conflict” During the Decision Process](https://www.gartner.com/en/newsroom/press-releases/2025-05-07-gartner-sales-survey-finds-74-percent-of-b2b-buyer-teams-demonstrate-unhealthy-conflict-during-the-decision-process).
- Christensen, C., Hall, T., Dillon, K. y Duncan, D. (2016). [Know Your Customers’ “Jobs to Be Done”](https://hbr.org/2016/09/know-your-customers-jobs-to-be-done). Harvard Business Review.
- Strategyn. [Jobs-to-be-Done y Outcome-Driven Innovation](https://strategyn.com/jobs-to-be-done/).
- HubSpot. [Set up account-based marketing in HubSpot](https://knowledge.hubspot.com/branding/get-started-with-account-based-marketing-in-hubspot).

Este artículo se publicó en febrero de 2026 con el título «5 pasos para definir a tu cliente ideal» y se reescribió en octubre de 2026: se puso la definición del ICP al inicio, se sumaron tres ejemplos de ICP, una plantilla y cómo llevarlo a HubSpot; se reemplazó un dato de un agregador por el estudio de Gartner de 2025 y se aclaró que IPP es el nombre que usamos en Efeonce para el champion. Lo desarrolló Julio Reyes con apoyo de IA en investigación, estructura y edición; Julio definió la tesis y aprobó la versión final.
