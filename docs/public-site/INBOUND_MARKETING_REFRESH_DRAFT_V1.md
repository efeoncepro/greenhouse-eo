# Refresh — ¿Qué es el inbound marketing? (borrador V1)

> **Estado:** **publicado 2026-10-24** (aprobado por Julio Reyes). Ver §8 «Registro de publicación».
> **URL (se conserva):** https://efeoncepro.com/inbound/que-es-inbound-marketing/
> **Autor / voz:** Julio Reyes (byline existente) · voz Julio, con doctrina marcada como «En Efeonce…».
> **Creado:** 2026-10-24 · **Base:** auditoría de la versión publicada el 2024-07-21 (última edición 2024-08-13).
> **Siguiente paso tras aprobación:** construir la `GutenbergArticleSpec` y actualizar el post privado según
> [`AGENTIC_BLOGPOST_END_TO_END_RUNBOOK_V1.md`](../operations/public-site-content-factory/AGENTIC_BLOGPOST_END_TO_END_RUNBOOK_V1.md)
> (Fases 5–9), con backup previo y QA en vivo.

---

## 1. Por qué se reescribe

| Señal | Dato | Fuente |
|---|---|---|
| Demanda real | «inbound marketing»: 590/mes Chile · 2.400 México · 3.600 España. «qué es inbound marketing»: 70 · 320 · 590 | Semrush, consulta 2026-10-24 |
| Posición actual | 40–50 en las búsquedas principales; ~17 clics en 12 meses sobre ~16.000 impresiones | Search Console, oct 2025–oct 2026 |
| Audiencia que la ve | España, Colombia y México por sobre Chile | Search Console, últimos 90 días |
| Quién gana | HubSpot, Salesforce, Pipedrive, Wikipedia, Universidad Europea, IEB, UC; con respuesta de IA en la SERP | Semrush, SERP Chile |
| Vigencia | Sección «Inbound Marketing al 2024»; modelo Atraer–Convertir–Cerrar–Deleitar (previo a 2018); sin mención de flywheel, Loop Marketing ni búsqueda con IA | Versión publicada |
| Errores | «estrategia **figital**» en H1 y og:title; «efoques» en un pie; una imagen sin `alt`; title con «?:» | Versión publicada |
| Claims débiles | «3 veces más leads a menos de la mitad del costo», «hasta 10 veces más efectivo», «+90% retención / +250% compra», «72% usa IA» | Sin fuente primaria verificable |

**Gran idea de la nueva versión:** el inbound sigue siendo la idea correcta —ayudar antes de vender—, pero
«que te encuentren» ya no termina en una visita: cada vez más, termina en una respuesta. El inbound de 2026
se mide también por si eres la fuente que esa respuesta usa.

## 2. Metadata propuesta

| Campo | Actual | Propuesto |
|---|---|---|
| Title (SEO) | ¿Qué es Inbound Marketing?: Impacto en tu estrategia y Beneficios | Qué es el inbound marketing y cómo funciona en 2026 \| Efeonce |
| Meta description | Descubre cómo el Inbound Marketing puede transformar tu estrategia digital con tácticas efectivas, herramientas clave y ejemplos prácticos. | El inbound marketing atrae clientes con contenido útil en vez de interrumpirlos. Cómo funciona hoy, qué cambió con la búsqueda con IA, ejemplos y pasos para aplicarlo. |
| H1 | Inbound Marketing: Qué es y cómo transforma tu estrategia figital | Qué es el inbound marketing y cómo funciona en 2026 |
| og:title | Inbound Marketing: Qué es y cómo transforma tu estrategia figital | Inbound marketing en 2026: qué es y qué cambió con la IA |
| og:description | — | Del embudo al flywheel y al loop: qué es el inbound marketing, cómo se aplica hoy y por qué ya no basta con atraer visitas. |
| Slug | `/inbound/que-es-inbound-marketing/` | Sin cambio (conserva historial; sin redirección) |
| Fecha | Publicado 2024-07-21 · modificado 2024-08-13 | Conservar publicación; `dateModified` real al publicar + «Actualizado el …» visible |
| Schema | `Article`/`BlogPosting` + `Person` (Julio Reyes) | Mantener; actualizar `headline`, `description`, `dateModified`. FAQ visible al final; marcar `FAQPage` sólo si el sitio ya lo emite (Google no muestra ese resultado enriquecido para este tipo de sitio) |

---

## 3. Borrador del artículo

# Qué es el inbound marketing y cómo funciona en 2026

*Actualizado el [fecha de publicación] · Julio Reyes*

Haz la prueba: busca en Google «qué es inbound marketing». Antes de cualquier enlace, probablemente aparece
una respuesta armada por la IA de Google, con la definición lista. Lees dos líneas y cierras la pestaña.

Ahí hay algo que no calza. El inbound marketing nació con una promesa muy concreta: **que te encuentren**.
Que, en vez de perseguir a tu cliente con publicidad, tu cliente llegue a ti porque buscó algo y tu contenido
le respondió. Pero si la respuesta ya está en el buscador, ¿a dónde llega ese cliente?

Mi lectura es que el inbound no murió. Cambió el lugar donde ocurre. Vamos por partes.

## ¿Qué es el inbound marketing?

**El inbound marketing es una forma de atraer clientes ofreciéndoles contenido y experiencias útiles en el
momento en que buscan resolver algo, en lugar de interrumpirlos con publicidad.** Su lógica es ayudar primero
y vender después: ganarte la atención con valor, convertirla en una relación y acompañar a esa persona hasta
que decida comprar, y también después.

El término lo popularizaron Brian Halligan y Dharmesh Shah, fundadores de HubSpot, en su libro *Inbound
Marketing: Get Found Using Google, Social Media, and Blogs* (Wiley, 2009). La idea partía de una observación
simple: la gente había aprendido a ignorar el correo masivo, los avisos y las llamadas en frío, y había
empezado a buscar por su cuenta antes de hablar con un vendedor.

Dicho de otro modo: el inbound no es una táctica ni un canal. Es un orden de prioridades. Primero entender qué
necesita tu cliente ideal; después crear lo que lo ayuda; recién al final, pedirle algo.

## Inbound vs. outbound: no se trata de elegir uno

El outbound es el marketing que sale a buscar: publicidad, prospección en frío, ferias, medios pagados. El
inbound es el que se deja encontrar. La diferencia práctica está en quién inicia la conversación.

| | Inbound | Outbound |
|---|---|---|
| Quién inicia | El cliente, cuando busca o pregunta | La marca, cuando decide salir a hablar |
| Qué ofrece | Respuestas, guías, herramientas, ejemplos | Mensajes, ofertas, recordación |
| Cómo crece | Se acumula: el contenido sigue trabajando | Se detiene cuando se detiene la inversión |
| Riesgo típico | Lento al inicio | Caro y fácil de ignorar |

La pregunta «¿dejo de hacer publicidad?» suele estar mal planteada. Google describió en *Decoding Decisions:
The Messy Middle of Purchase Behavior* (2020) que las personas no avanzan en línea recta hacia la compra: se
mueven en bucle entre **explorar** opciones y **evaluarlas**, una y otra vez, hasta decidir.

[Imagen existente: «Messy Middle — Google — Ilustración Efeonce»]

En ese ir y venir, el inbound y el outbound hacen trabajos distintos. La publicidad te pone en la lista de
opciones cuando alguien todavía no te conoce. El contenido te ayuda a ganar la evaluación: comparativas,
casos, respuestas honestas a las objeciones. En Efeonce lo pensamos así: **la publicidad compra la primera
mirada; el contenido gana la decisión.** Una estrategia madura combina las dos con un mismo mensaje.

Si quieres profundizar en cómo se combinan, aquí lo explicamos con SEM y PPC:
[Inbound marketing y paid media](https://efeoncepro.com/marketing-digital/inbound-marketing-paid-media/).

## Cómo funciona: del embudo al flywheel y al loop

El inbound se ha explicado con tres modelos distintos. Conviene conocerlos porque cada uno corrige un problema
del anterior.

**1. El embudo (Atraer, Convertir, Cerrar, Deleitar).** Es el modelo clásico: atraes visitantes con contenido,
los conviertes en contactos con una oferta de valor, los cierras como clientes y luego los deleitas. Su
problema es que trata al cliente como el final del proceso.

**2. El flywheel (Atraer, Interactuar, Deleitar).** En su keynote de INBOUND 2018, Brian Halligan propuso
«retirar el embudo» y reemplazarlo por un volante de inercia: los clientes satisfechos no son el final, son la
fuerza que impulsa el siguiente giro, porque recomiendan, vuelven y atraen a otros.

**3. El loop (Express, Tailor, Amplify, Evolve).** En INBOUND 2025, HubSpot presentó Loop Marketing como su
marco para la era de la IA. Son cuatro etapas que se repiten:

- **Express:** definir con claridad quién eres, tu punto de vista y tu voz, para que todo lo que produzcas
  (también con IA) suene a tu marca.
- **Tailor:** adaptar el mensaje a cada persona y contexto usando datos.
- **Amplify:** distribuir en todos los lugares donde tu cliente busca, incluidas las respuestas de IA.
- **Evolve:** medir, aprender y ajustar rápido.

Vamos con manzanitas 🍏🍏🍏: el embudo es un tobogán, entras arriba y sales abajo. El flywheel es una rueda
que gira más rápido mientras más clientes contentos la empujan. El loop es esa misma rueda, pero con un
volante: en cada vuelta miras el camino y corriges la dirección.

El loop no reemplaza la idea del inbound; la vuelve operativa para un entorno donde los canales cambian
cada trimestre. Lo explicamos en detalle en
[¿Qué es Loop Marketing?](https://efeoncepro.com/loop-marketing/que-es-loop-marketing/) y en
[Cómo aplicar Loop Marketing](https://efeoncepro.com/loop-marketing/como-aplicar-loop-marketing/).

## Qué cambió con la búsqueda con IA

Este es el cambio más grande desde que se inventó el inbound, y vale la pena mirarlo con números.

- Según el estudio de SparkToro con datos de clickstream de Datos (2024), **el 58,5% de las búsquedas en
  Google en Estados Unidos y el 59,7% en la Unión Europea terminaron sin un clic** a ningún sitio.
- Un estudio de Pew Research Center (2025) sobre 900 adultos en Estados Unidos encontró que, cuando la
  búsqueda mostraba un resumen generado con IA, **las personas hicieron clic en un resultado en el 8% de las
  visitas, frente al 15% cuando no había resumen**. Sólo en cerca del 1% de las visitas hicieron clic en una
  de las fuentes citadas dentro del resumen.

Una aclaración honesta: ambos estudios miden Estados Unidos y Europa. Hasta donde pudimos revisar, no hay una
medición pública equivalente para Latinoamérica, así que la cifra exacta puede ser distinta aquí. La dirección, en cambio, es
la misma en cualquier buscador que responda directamente.

¿Qué significa para el inbound? Tres cosas:

1. **Ya no basta con atraer visitas.** Una parte creciente de tu audiencia te va a «leer» a través de la
   respuesta de un buscador o de un asistente como ChatGPT, Gemini o Perplexity, sin entrar a tu sitio.
2. **Ser la fuente importa tanto como rankear.** Si la IA arma la respuesta, la pregunta es si usa tu
   contenido, te cita y menciona tu marca. A eso se le llama AEO (Answer Engine Optimization). Lo explicamos
   en [El 80% de lo que cita la IA no existe en Google](https://efeoncepro.com/aeo/donde-cita-la-ia/).
3. **El contenido tiene que ser fácil de citar.** Respuestas directas al inicio de cada sección, datos con
   fuente, definiciones claras y una postura propia. Lo genérico se resume; lo distintivo se cita.

Hasta aquí podemos decir algo con seguridad: el inbound que sólo se mide en visitas al blog va a mostrar
números cada vez más bajos, aunque esté funcionando. La medición también tiene que cambiar.

## Cómo implementar una estrategia de inbound marketing paso a paso

1. **Define a quién quieres atraer.** No «empresas medianas»: el perfil exacto de cliente ideal, quién
   decide, qué problema tiene y qué intenta lograr. Aquí está el método completo:
   [Cliente ideal B2B: ICP, buyer persona, IPP y JTBD](https://efeoncepro.com/growth/cliente-ideal-b2b-icp-buyer-persona-ipp-jtbd/).
2. **Escucha cómo pregunta.** Revisa qué busca en Google, qué le pregunta a la IA, qué le preguntan a tu
   equipo comercial. Las preguntas reales son tu pauta editorial.
3. **Fija tu punto de vista.** Antes de producir, decide qué piensas tú distinto del resto. Sin eso, tu
   contenido se parece al de todos y la IA no tiene razón para citarte.
4. **Crea contenido que responda y que se pueda citar.** Guías, comparativas, herramientas, casos. Respuesta
   directa primero, profundidad después. Más ideas en
   [Cómo generar más leads con marketing de contenidos](https://efeoncepro.com/inbound/genera-leads-con-marketing-de-contenidos/).
5. **Hazte encontrar en todas partes.** SEO para Google, AEO para las respuestas de IA, redes y newsletter
   para quienes ya te siguen, y pauta para acelerar. Ver
   [El impacto del SEO en inbound](https://efeoncepro.com/inbound/seo-inbound-marketing/).
6. **Convierte con algo de valor real.** Una herramienta, una plantilla, un diagnóstico o una suscripción.
   Conecta cada formulario a tu CRM para que nada se pierda.
7. **Mide todo el ciclo y ajusta.** Visitas, sí, pero también menciones y citas en IA, contactos de calidad,
   oportunidades y ventas. Revisa cada mes qué funcionó y corrige.

## Ejemplos de inbound marketing

Estos son ejemplos de tácticas, no casos de clientes:

- **Una empresa de software B2B** publica una guía comparativa honesta entre su producto y las alternativas,
  incluyendo cuándo no conviene elegirlo. Gana la etapa de evaluación del Messy Middle.
- **Una empresa industrial** ofrece una calculadora en su sitio para estimar materiales o costos. La
  herramienta responde una pregunta frecuente y captura contactos con intención real.
- **Una consultora o un servicio profesional** envía un newsletter con una idea útil por edición. Construye
  confianza durante los meses que tarda una decisión de compra B2B.
- **Una marca de consumo** responde en su blog y en video las preguntas que sus clientes hacen antes de
  comprar. Esas respuestas son las que después aparecen en Google y en los asistentes de IA.

En Efeonce aplicamos lo mismo con lo nuestro: publicamos *Glitch*, nuestro newsletter, y dejamos en
[Efeonce Think](https://think.efeoncepro.com/) herramientas gratuitas para medir visibilidad.

## Herramientas para hacer inbound marketing

- **CRM y automatización:** HubSpot (la plataforma de quienes crearon la metodología) o Salesforce, para
  conectar contenido, formularios, correos y ventas.
- **Analítica:** Google Analytics 4 y Google Search Console, para saber qué atrae y qué convierte.
- **SEO e investigación:** Semrush o similares, para entender qué busca tu cliente y cómo compites.
- **Visibilidad en IA:** un panel de preguntas que tu cliente le haría a ChatGPT, Gemini o Perplexity,
  revisado cada mes, para saber si tu marca aparece y cómo la describen.

La herramienta no hace la estrategia. Primero el orden de prioridades del inbound; después, el software.

## Preguntas frecuentes

### ¿El inbound marketing está muerto?

No. Lo que perdió fuerza es la versión que sólo buscaba visitas al blog. La idea central —ayudar antes de
vender— importa más cuando las respuestas las arma una IA, porque sólo cita a quien realmente ayuda.

### ¿Cuál es la diferencia entre inbound marketing y Loop Marketing?

El inbound es la filosofía: atraer con valor en vez de interrumpir. Loop Marketing es el marco operativo que
HubSpot presentó en 2025 para aplicar esa filosofía con IA, en cuatro etapas: Express, Tailor, Amplify y
Evolve.

### ¿Cuánto tarda el inbound marketing en dar resultados?

Depende del punto de partida, la competencia y la constancia. Es una estrategia que se acumula: piensa en
meses, no en semanas, y mide avances intermedios (posiciones, menciones, contactos) antes que ventas.

### ¿El inbound marketing sirve para B2B y B2C?

Sí. En B2B suele pesar más porque las decisiones son largas y con varias personas involucradas; en B2C,
porque el cliente investiga y compara antes de comprar.

### ¿Necesito HubSpot para hacer inbound marketing?

No es obligatorio, pero necesitas algún CRM que conecte tu contenido y tus formularios con ventas. Sin esa
conexión no sabes qué contenido genera negocio.

## En resumen

El inbound marketing sigue siendo atraer con valor en vez de interrumpir. Lo que cambió es el camino: tu
cliente ya no sólo llega a tu sitio, también te encuentra dentro de una respuesta. Por eso el inbound de hoy
se construye con un punto de vista propio, contenido que se puede citar y una medición que mira el ciclo
completo.

[Bloque 1 — Suscripción a Glitch] Si quieres seguir esta conversación, cada edición de *Glitch* trae una idea
sobre marketing, búsqueda e IA. Suscríbete aquí.

[Bloque 2 — Herramienta] Revisa cómo te ven hoy los buscadores y la IA con las herramientas gratuitas de
[Efeonce Think](https://think.efeoncepro.com/).

[Bloque 3 — Diagnóstico] Y si quieres armar o revisar tu estrategia, conoce cómo trabajamos como
[agencia de inbound marketing](https://efeoncepro.com/agencia-inbound-marketing/).

### Fuentes

- Halligan, B. y Shah, D. (2009). *Inbound Marketing: Get Found Using Google, Social Media, and Blogs*. Wiley.
- Google / Think with Google (2020). *Decoding Decisions: The Messy Middle of Purchase Behavior*.
- HubSpot. *Loop Marketing*. https://www.hubspot.com/loop
- HubSpot Blog. *Loop marketing strategy*. https://blog.hubspot.com/marketing/loop-marketing-strategy
- SparkToro (2024). *Zero-Click Search Study* (datos de Datos, EE. UU. y UE).
- Pew Research Center (2025). Estudio sobre resúmenes de IA en Google y clics en enlaces (900 adultos en EE. UU.).

---

## 4. Qué se elimina o se mueve

| Sección actual | Decisión | Motivo |
|---|---|---|
| ¿Por qué es importante? (antes de la definición) | Se integra en la intro | La definición debe estar en el primer H2 |
| Historia completa + «Inbound Marketing al 2024» | Se reduce a un párrafo de origen | Fecha vencida; diluye la intención «qué es» |
| Atraer, Convertir, Cerrar, Deleitar | Se conserva como modelo 1 de 3 | Ahora explicado como el modelo clásico, no el vigente |
| Growth Driven Design (2 secciones) | Sale del artículo | Es otro tema; si se quiere, nota propia enlazada |
| Estadísticas sin fuente primaria | Se eliminan | Ver claim ledger |
| Messy Middle + ilustración propia | Se conserva | Es lo más diferenciador; arreglar «efoques» y el `alt` vacío |
| Cita de Brian Halligan (entrevista en INBOUND) | Se elimina salvo fuente exacta | No hay enlace a la entrevista original |
| «Lo que nos diferencia» (bloque comercial) | Se reemplaza por las 3 invitaciones en orden | Orden canónico: Glitch → herramienta → diagnóstico |

## 5. Claim ledger

| ID | Claim | Tipo | Fuente | Clase | Estado |
|---|---|---|---|---|---|
| C1 | Halligan y Shah popularizaron el término; libro Wiley 2009 | fact | Wiley 2009; [Wikipedia — Brian Halligan](https://en.wikipedia.org/wiki/Brian_Halligan) | primaria (libro) + secundaria | verified (año de acuñación 2005 **no** se usa: fuente débil) |
| C2 | Messy Middle: explorar/evaluar en bucle (Google, 2020) | fact | Think with Google 2020 (ya citado en la versión actual) | primaria | verified — confirmar URL vigente al construir la spec |
| C3 | INBOUND 2018: Halligan propone retirar el embudo por el flywheel | fact | [HubSpot — our flywheel](https://blog.hubspot.com/marketing/our-flywheel); recaps [Niswey](https://niswey.com/blog/inbound-2018-the-brian-dharmesh-keynote), [CMSWire](https://www.cmswire.com/digital-marketing/takeaways-from-hubspot-inbound-2018/) | primaria + secundaria | verified |
| C4 | Loop Marketing (INBOUND 2025): Express, Tailor, Amplify, Evolve | fact | [hubspot.com/loop](https://www.hubspot.com/loop); [HubSpot Blog](https://blog.hubspot.com/marketing/loop-marketing-strategy) | primaria | verified |
| C5 | 58,5% EE. UU. / 59,7% UE de búsquedas en Google sin clic | measurement | SparkToro 2024 con datos de Datos; [Search Engine Land](https://searchengineland.com/google-search-zero-click-study-2024-443869) | primaria + secundaria | verified — enlazar el post original de SparkToro en la spec |
| C6 | 8% vs 15% de clics con/sin resumen IA; ~1% clic en fuentes del resumen; 900 adultos EE. UU. | measurement | Pew Research Center 2025; [TheWrap](https://www.thewrap.com/ai-summaries-google-article-clicks-half/), [The Decoder](https://the-decoder.com/pew-finds-that-only-1-percent-of-users-click-a-source-link-directly-from-googles-ai-overviews/) | primaria + secundaria | verified — enlazar el informe de Pew; no citar fecha exacta de recolección (fuentes difieren) |
| C7 | «La publicidad compra la primera mirada; el contenido gana la decisión» | efeonce_doctrine | — | doctrina | proposed — requiere OK de Julio |
| C8 | Efeonce publica Glitch y herramientas gratuitas en Think | fact | efeoncepro.com/glitch; think.efeoncepro.com (200 al 2026-10-24) | interna pública | verified |
| R1 | «3 veces más leads, menos de la mitad del costo» (Protocol 80) | — | Sin fuente primaria | — | rejected |
| R2 | «Hasta 10 veces más efectivo» (estadísticas 2023) | — | Sin fuente | — | rejected |
| R3 | «+90% retención, +250% compra» (Shortlist) | — | Sin fuente primaria | — | rejected |
| R4 | «72% de marketers usa IA para personalización» (HubSpot) | — | Sin informe enlazado; dato 2024 | — | stale |

## 6. Pendientes antes de publicar

1. Lectura del autor (voz, doctrina C7, motivo 🍏🍏🍏).
2. URLs primarias de Pew, SparkToro y Think with Google en la spec.
3. Confirmar URL/bloque de suscripción a Glitch que usa el blog.
4. `alt` de la ilustración Messy Middle y de la imagen que hoy no tiene.
5. Spec Gutenberg + dry-run + backup + actualización del post + QA en vivo (title, canonical, schema, enlaces).

## 7. Cómo se mide

- **Grupo de búsquedas:** inbound marketing · qué es inbound marketing (y variantes) · inbound marketing
  ejemplos · inbound vs outbound · inbound vs loop marketing · inbound marketing 2026.
- **Search Console:** posición e impresiones ponderadas por impresiones para ese grupo, línea base = los 90 días
  previos a la publicación; revisar a las 4, 8 y 12 semanas.
- **Meta a 12 semanas:** entrar a las dos primeras páginas en variantes específicas (ejemplos, 2026, vs loop) y
  subir la búsqueda principal desde la posición ~45 hacia el top 20. Es una hipótesis, no una promesa.
- **IA:** panel de 5–10 preguntas en ChatGPT, Gemini y Perplexity; registrar si citan o mencionan a Efeonce.
- **GA4:** sesiones con interacción en la URL y clics hacia Glitch, Think y la página de agencia.

## 8. Registro de publicación (2026-10-24)

- **Post:** WordPress `244765`, misma URL, autor Julio Reyes (user `1`), categoría `96` y etiquetas sin cambios.
- **Fuente editable:** [`INBOUND_MARKETING_REFRESH_GUTENBERG_SPEC_V1.json`](INBOUND_MARKETING_REFRESH_GUTENBERG_SPEC_V1.json);
  validación Content Factory `pass`, 0 hallazgos, 60 bloques.
- **Escrito:** `post_title`, `post_content`, `post_excerpt`, `_yoast_wpseo_title`, `_yoast_wpseo_metadesc` y
  tiempo de lectura (10 min). Se conservan imagen destacada y OG (`244847`, texto aún válido).
- **Dos escrituras con guardas** (hash + `post_modified_gmt` + título Yoast): la segunda redujo las ilustraciones
  SVG de 1.112 px a 520 px de ancho. Contenido guardado = payload salvo `🍏` → `&#x1f34f;` (equivalencia probada).
- **Respaldo:** local `tmp/que-es-inbound-marketing-post-244765-before-v1-20261024T081621Z.json` (gitignored) y
  opciones de servidor `_gh_inbound_refresh_20261024_081739` (estado original) y
  `_gh_inbound_refresh_v2_20261024_081923` (primera versión). WordPress además guarda revisiones.
- **Rollback:** `pnpm public-website:wpcli -- --eval-file ./tmp/inb-244765-rollback.php --wp-user 12`
  (el script local apunta a `_gh_inbound_refresh_20261024_081739`; restaura título, contenido, extracto y meta Yoast del estado original y purga caché).
- **QA en vivo (anónimo):** 200; title, descripción, canonical y `index, follow` correctos; `BlogPosting` con
  `headline` y `dateModified` nuevos, `Person` Julio Reyes, `FAQPage` con 5 preguntas; 1 H1; índice con 10 anclas
  válidas; 20 enlaces del artículo responden 200; sin desborde horizontal a 1440 px ni a 375 px; consola sin errores.
- **Pendiente:** suscripción a Glitch se enlaza al archivo `/category/glitch/` porque el formulario de suscripción
  del blog aún no está publicado; reemplazarlo cuando exista. Observar Search Console a las 4, 8 y 12 semanas (§7).

## 9. Mapa de enlaces internos (V2 de la spec, 2026-10-24 — pendiente de publicar)

Pedido del autor: conectar el artículo con el blog y las landings (en especial SEO y AEO). Las landings van como
**mención de servicio** AXIS `efeonce.mention` (pill + isotipo, color de la línea del menú: Engine para SEO/AEO/web,
Voice para performance/medios, Brand para contenido/redes/influencers, Revenue para HubSpot, Growth para el AI
Visibility Report); los artículos, como enlace normal. Content Factory emite la mención desde 2026-10-24
(`mention` en el segmento de texto; sólo https en efeoncepro.com/efeonce.org).

| Sección | Enlace nuevo |
|---|---|
| Qué es | cliente ideal → `/growth/cliente-ideal-b2b-icp-buyer-persona-ipp-jtbd/` |
| Inbound vs outbound | mención performance marketing · mención marketing de contenidos |
| Flywheel | `/inbound/como-alinear-marketing-con-experiencia-del-cliente/` |
| Loop | `/loop-marketing/express-voz-marca-ia-loop-marketing/` · `/loop-marketing/ejecutar-loop-marketing-hubspot/` |
| Búsqueda con IA | mención AEO (`/aeo-2/`) · `/loop-marketing/seo-aeo-optimizacion-ia-2025/` · `/aeo/web-agentica-agentes-ia/` |
| Pasos | `/inbound/estrategia-de-contenidos/` · menciones posicionamiento SEO y AEO · `/aeo/surround-discovery-seo-google-video-marketplace/` · `/design/diseno-web/sitios-web-que-generan-resultados/` · `/hubspot/como-rastrear-formularios-hubspot-en-ga4-paso-a-paso/` |
| Herramientas | mención HubSpot · `/hubspot/5-pasos-para-transformar-tu-crm-en-motor-de-crecimiento/` · mención Efeonce AI Visibility Report |
| FAQ HubSpot | `/hubspot/crea-un-pipeline-de-ventas-que-convierte-guia-paso-a-paso/` |
| Cierre | la herramienta pasa de Think genérico al Efeonce AI Visibility Report |

Total: 26 enlaces únicos + 8 menciones; todos 200 al 2026-10-24; validación `pass`, 0 hallazgos, 61 bloques.

## 10. Publicación de la V2 con enlaces (2026-10-24 08:53 UTC)

- Escritura con guardas (`tmp/post-refresh-apply.php`): `saved`, `post_modified_gmt` `2026-10-24 08:53:23`.
  Respaldo del estado previo en la opción `_gh_post_refresh_244765_20261024_085323`.
- QA anónimo: 200, title/descripción/canonical/`index, follow`, `BlogPosting` con `dateModified` nuevo, `FAQPage` 5,
  8 menciones pintadas (`axis-mention.css` cargado), índice de 10 anclas válidas, 37 enlaces del artículo con 200,
  sin desborde a 1440 px, consola sin errores.
- Rollback a la V1 de la mañana: `tmp/post-refresh-rollback.php` con input `{"id":244765,"option":"_gh_post_refresh_244765_20261024_085323"}`.
- Pendiente: portada e imagen social siguen en el formato antiguo (se rehacen en la línea gráfica «La órbita»).

## Portada e imagen social nuevas (2026-10-24)

Imagen destacada y Open Graph reemplazadas por la portada de Marketing con Manzanitas centrada para el recorte móvil
(adjunto `252065`, `wp-content/uploads/2024/07/que-es-inbound-marketing-portada-2026.jpg`, 2400 × 1260). Verificado en vivo: `og:image` y la imagen principal del
schema apuntan al archivo nuevo, 200 `image/jpeg`; las tarjetas del blog (recorte cuadrado) muestran la cabecera, la
respuesta y la firma. Proceso, revisión, rollback y pendientes:
[`ai-generations/2026-10-24_portadas-blog/LEEME.md`](../../ai-generations/2026-10-24_portadas-blog/LEEME.md).
