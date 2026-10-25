# Refresh — «SEO y AEO» (borrador V1)

> **Estado:** borrador V1 en copia privada `252114` (2026-10-25). URL decidida; panel propio descartado por Julio (si Efeonce no aparece, publicarlo perjudica).
> **Fuente editable:** [`SEO_AEO_REFRESH_GUTENBERG_SPEC_V1.json`](SEO_AEO_REFRESH_GUTENBERG_SPEC_V1.json) (validación `pass`, ~2.400 palabras).
> **URL actual:** https://efeoncepro.com/loop-marketing/seo-aeo-optimizacion-ia-2025/ (post `248463`, categoría principal
> Loop Marketing; también en AEO). **Decidido por Julio (2026-10-25):** `/aeo/seo-y-aeo/` con 301, aplicado junto con la
> publicación del contenido nuevo (§3).
> **Autor / voz:** Julio Reyes · voz Julio, doctrina como «En Efeonce…».
> **Propuesta aprobada:** [`BLOG_REFRESH_TANDA_1_PROPUESTA_V1.md`](BLOG_REFRESH_TANDA_1_PROPUESTA_V1.md) §3.
> **Respaldo del post vivo:** `tmp/aeo-248463-before.json` (contenido, metas, términos; `post_modified_gmt` 2026-03-06 21:27:09).

## 1. Por qué se reescribe

| Señal | Dato | Fuente |
|---|---|---|
| Impresiones (90 días) | 141, antes 1.051 (−87 %) | Search Console, 2026-07-26 → 2026-10-23 vs. ventana anterior |
| Clics | 0, antes 1 | Search Console |
| Posición | 21,5, antes 12,6 | Search Console (ver la advertencia de abajo) |
| Visitas desde IA (12 meses) | 18 (Perplexity 14, ChatGPT 3, Gemini 1): la más alta del blog | GA4 486264460 |
| Palabras | 3.261 | post vivo |

**Cómo leer estas cifras (auditoría con `seo-aeo` → `07_MEASUREMENT.md`).** Las 141 impresiones se reparten en 24
consultas y casi todas tienen menos de 10. Bajo el piso de impresiones, una posición no dice dónde rankea la página:
dice dónde apareció las pocas veces que la mostraron. La señal confiable es la caída de impresiones (−87 %) y los cero
clics, no el 21,5. La suma de la página ya viene sin sitelinks con `#ancla` (los quitó la lectura de Analytics).

**Consultas (medido).** Casi todo son búsquedas largas con forma de pregunta generada por IA: «aeo estrategias sin
equipo de marketing grande», «software para estrategia aeo», «optimización para motores de ia», «importancia del aeo para
empresas b2b», «comparar estrategias de aeo vs seo tradicional», «consultor aeo». La de más impresiones en la ventana
anterior fue «aeo answer engine optimization estrategias para pequeños equipos…» (144, posición 8,9). Lectura (inferida):
el artículo lo encuentran asistentes que arman búsquedas de fondo; la intención es «cómo hago AEO con un equipo chico,
qué cambia frente al SEO y cómo lo mido». Por qué se infiere: frases largas con operadores (`or`), años, «expertos» y una
en portugués («aeo vs seo: qual priorizar em 2025»), que una persona rara vez escribe así. No está verificado que sean
sub-consultas de AI Mode: Search Console no las distingue. Uso práctico: son el espacio de sub-preguntas al que tiene
que responder el artículo, y la mejor evidencia disponible (Ahrefs, §2 fila 15) dice que lo que más separa a una página
citada de una recuperada y no citada es que su título responda a esa sub-pregunta. Por eso los H2 van a ser esas
preguntas, en palabras de la persona.

**Volumen (Semrush, octubre de 2026).**

| Consulta | MX | CL | ES |
|---|---|---|---|
| aeo | 1.600 | 320 | 1.300 |
| qué es aeo | 40 | — | 170 |
| aeo seo / seo aeo | 20 / 20 | 20 / — | 140 / 40 |
| answer engine optimization | — | 30 | 170 |
| seo para ia | — | — | 480 |
| geo seo | 30 | — | 480 |
| qué es geo | 390 | 10 | 320 |
| cómo aparecer en chatgpt | — | — | 50 |

Estos volúmenes son estimaciones de Semrush; con cifras de 10 a 50 al mes la precisión es baja, y «—» significa que la
consulta no está en su base para ese país, no que valga cero. Chile sólo devolvió 4 de las 20 consultas.
«aeo» solo es ambiguo: en México y España también es Operador Económico Autorizado (aduanas). No es la consulta foco
(inferido; confirmarlo con la SERP antes de afirmarlo). «qué es geo» en México es sobre todo geografía o geolocalización
(inferido). Foco: SEO + AEO como intención compuesta,
«seo para ia», «qué es aeo», «aeo vs seo», «cómo aparecer en las respuestas de IA».

## 2. Registro de afirmaciones (verificado al 2026-10-25)

| # | Estado | Qué dice la fuente hoy | Fuente | Fecha |
|---|---|---|---|---|
| 1 | Verificado | Para salir como enlace en AI Overviews o AI Mode basta con estar indexado y poder mostrarse con snippet. No hay requisito técnico extra, schema especial ni archivo para IA. Se controla con `nosnippet`, `data-nosnippet`, `max-snippet` y `noindex`. El tráfico se cuenta en Search Console dentro de «Web», sin informe aparte | developers.google.com/search/docs/appearance/ai-features | act. 2025-12-10 |
| 1b | Verificado | Guía de optimización para IA de Google: el schema no es requisito para la búsqueda generativa; no hace falta trocear el contenido; pide ignorar los «hacks» de AEO/GEO | developers.google.com/search/docs/fundamentals/ai-optimization-guide | act. 2026-07-10 |
| 2 | Verificado | Google-Extended controla el uso para entrenar Gemini y para el grounding en Gemini Apps y Vertex AI; no afecta la inclusión en Google Search ni es señal de ranking | developers.google.com/search/docs/crawling-indexing/google-common-crawlers | act. 2026-10-15 |
| 3 | Verificado | OAI-SearchBot decide si apareces en la búsqueda de ChatGPT; GPTBot es entrenamiento, independiente; ChatGPT-User son visitas iniciadas por la persona, puede no respetar robots.txt; cambios en ~24 h | developers.openai.com/api/docs/bots | vigente |
| 4 | Verificado | PerplexityBot hace que aparezcas en Perplexity y no entrena; Perplexity-User actúa por pedido de la persona y en general ignora robots.txt | docs.perplexity.ai/guides/bots | vigente |
| 5 | Verificado | ClaudeBot (entrenamiento), Claude-User (visitas pedidas por la persona), Claude-SearchBot (calidad de búsqueda); los tres respetan robots.txt | support.claude.com/en/articles/8896518 | act. 2026-04-07 |
| 6 | Verificado / secundario | Copilot hace grounding enviando consultas a Bing. Bing Webmaster Tools tiene un informe AI Performance (preview desde 2026-02-10) con citas en Copilot y resúmenes de Bing; no indica ranking | learn.microsoft.com/microsoft-365/copilot/manage-public-web-access · blogs.bing.com/webmaster/February-2026/… | 2026-02-10 |
| 7 | Verificado | AI Mode disponible en Chile y en español (anuncio en español: 2025-09-23, fecha por fuente secundaria) | support.google.com/websearch/answer/16011537 | vigente |
| 8a | Verificado (Pew) / secundario (Comscore) | Pew: con resumen de IA, 8 % de las visitas hizo clic en un resultado; sin resumen, 15 %; 1 % en enlaces del resumen. 18 % de 68.879 búsquedas tuvo resumen. EE. UU., 900 adultos, marzo de 2025. Comscore: AI Overviews en 39,4 % de las búsquedas de escritorio en EE. UU., junio de 2026 (vía Search Engine Land) | pewresearch.org/short-reads/2025/07/22/… | 2025-07-22 · 2026-09 |
| 8b | Verificado (estudio del proveedor) | Ahrefs: con AI Overview, CTR de la posición 1 un 58 % menor; 300.000 keywords, escritorio, dic-2023 vs. dic-2025; correlación | ahrefs.com/blog/ai-overviews-reduce-clicks-update/ | 2026-02-04 |
| 9 | Verificado (proveedores) | Ahrefs, 15.000 prompts: 12 % de las URL citadas por IA rankea en el top 10 de Google para el mismo prompt (Perplexity 28,6 %, ChatGPT ~8 %). Semrush, 5.000 keywords: coincidencia de dominios con el top 10 >91 % en Perplexity, ~86 % en AI Overviews, ~54 % en AI Mode; ChatGPT la más baja. Sin dato primario ChatGPT↔Perplexity | ahrefs.com/blog/ai-search-overlap/ · semrush.com/blog/ai-mode-comparison-study | 2025-08-11 · 2025-07-21 |
| 10 | Verificado | Google Search ignora llms.txt; ningún motor grande declara usarlo | guía de optimización para IA (fila 1b) | 2026-07-10 |
| 11 | Verificado | FAQ rich results sólo para sitios de gobierno y salud desde 2023-08-08; HowTo dejó de mostrarse desde 2023-09-13. Google no dice que el schema mejore la inclusión en IA | developers.google.com/search/blog/2023/08/howto-faq-changes | 2023 |
| 12 | Verificado | Semrush: el visitante de búsqueda por IA vale en promedio 4,4 veces el orgánico tradicional, por tasa de conversión; promedio entre industrias, sin muestra publicada | semrush.com/blog/ai-search-seo-traffic-study/ | 2025-07-21 |
| 13 | Secundario / no existe | Neeva cerró su buscador el 2023-06-02. No hay acuerdo OpenAI–Reuters verificable (sí AP, Axel Springer, FT, News Corp, Axios, Washington Post, The Guardian, entre otros) | openai.com/index/partnering-with-axios-… · cnbc.com | — |
| 14 | No confiable | Modelos insignia de octubre de 2026: fuentes contradictorias. No nombrar modelos | — | — |

**Agregado en la auditoría con la skill `seo-aeo` (`SOURCES.md` §4, auditado 2026-07-14; reverificar la URL antes de
citar).**

| # | Estado | Qué dice | Uso en el artículo |
|---|---|---|---|
| 15 | Fuente de la skill | Ahrefs, 1,4 millones de prompts de ChatGPT: lo que más separa una página citada de una recuperada y no citada es la relevancia semántica del título frente a la sub-pregunta (0,656 vs. 0,484) y la claridad del slug (89,8 % vs. 81,1 %). La cápsula de respuesta no aparece entre los predictores | Es la palanca con mejor evidencia: H2 escritos como la pregunta que responde la sección. También respalda el slug corto `seo-y-aeo` |
| 16 | Fuente de la skill, sin control | Search Engine Land: el 72,4 % de las entradas citadas por ChatGPT tiene una cápsula de respuesta identificable, definida como 120–150 caracteres (20–25 palabras). Describe un patrón, no prueba que la cápsula cause la cita | Si el artículo recomienda la cápsula, va por mecanismo (el motor recupera pasajes) y con el largo de la fuente, no con una promesa de citas |
| 17 | Conflicto | La skill registra AI Overviews en ~48–50 % de las consultas (BrightEdge, marzo de 2026); Comscore mide 39,4 % de las búsquedas de escritorio en EE. UU. (junio de 2026). BrightEdge mide sobre conjuntos de palabras clave; Comscore, sobre búsquedas reales de un panel de personas | No se publica una sola cifra «de prevalencia». Si se usa una, va con su fuente, su método y su país. Ninguna es de Chile |
| 18 | No localizado | La skill afirma que sólo ~11 % de los dominios citados coincide entre ChatGPT y Perplexity (680 millones de citas), sin URL. La verificación del 2026-10-25 no encontró la fuente primaria | No se cita. Para decir que cada motor elige fuentes distintas basta con Ahrefs y Semrush (fila 9) |
| 19 | Fuente de la skill, con advertencias | Paper GEO (KDD 2024): citas de expertos +41 %, estadísticas +32 %. Mide un motor armado con GPT-3.5 y el top 5 de Google; la métrica es la proporción de palabras atribuidas, no las citas; el efecto cambia por dominio | Mejor no citarlo. Si se cita, van las tres advertencias |

**Matiz sobre «no hace falta trocear».** Google dice que, para su búsqueda, no hay que fragmentar el contenido ni usar
trucos de AEO. Eso no contradice cómo funcionan los motores: recuperan pasajes. La recomendación del artículo es escribir
secciones que se entiendan solas y respondan primero, porque así lee mejor una persona; nunca partir el texto en
fragmentos artificiales «para la IA».

**El artículo no puede afirmar:**

- Que existe un «schema para IA», que FAQ o HowTo te hacen aparecer en AI Overviews o que hace falta trocear el contenido.
- Que llms.txt sirve para Google o que lo usa oficialmente un motor grande.
- Que bloquear Google-Extended te saca de Search o de AI Overviews (para eso están `noindex` y `nosnippet`).
- Que bloquear GPTBot te saca de ChatGPT (lo decide OAI-SearchBot), ni que los agentes «-User» siempre respetan robots.txt.
- Que Search Console tiene un informe propio de AI Overviews o AI Mode.
- Que ChatGPT usa el índice de Bing o que IndexNow mejora la visibilidad en ChatGPT.
- Cifras de AI Overviews sin su alcance (EE. UU., escritorio, 2025–2026). No hay datos de Chile: no se inventan.
- Que la caída del CTR la causan probadamente los AI Overviews: es correlación.
- El 4,4x como cifra universal o B2B: se atribuye a Semrush, promedio entre industrias, proveedor interesado.
- Coincidencia alta entre lo que citan ChatGPT y Perplexity, ni «Perplexity usa el top 10 de Google».
- Un acuerdo OpenAI–Reuters, ni nombres de modelos «más recientes».
- El «~11 % de coincidencia entre ChatGPT y Perplexity» ni una prevalencia de AI Overviews sin método ni país (filas 17 y 18).
- Que la cápsula de respuesta o las tablas multiplican las citas: son prevalencias entre corpus, no efectos medidos.

## 3. Decisiones

1. ✅ **URL (Julio, 2026-10-25):** `/aeo/seo-y-aeo/`. Se aplica en el mismo paso que el contenido nuevo, no antes, para
   que Google vea un solo cambio:
   - categoría principal AEO y slug `seo-y-aeo` (la URL sigue a la categoría principal);
   - redirección 301 de la URL vieja a la nueva, verificada con `curl -I` y sin cadena;
   - enlaces internos al post viejo reescritos a la URL nueva (topic clusters y los que salgan del barrido);
   - sitemap y solicitud de indexación de la URL nueva; procedimiento en
     `efeonce-public-site-wordpress` → `references/taxonomy-permalink-migrations.md`.
2. ❌ **Panel propio: descartado por Julio (2026-10-25).** Efeonce todavía no aparece en esas respuestas y publicarlo
   perjudica más de lo que ayuda. En su lugar va el Growth CTA del Efeonce AEO Assessment (tono claro, lockup oficial),
   para que quien lee pida el informe de su marca. El método queda registrado por si se retoma: si se corre, con este método (`seo-aeo` → `07_MEASUREMENT.md` Parte B y
   `references/competitor-methodologies-2026-09.md` §1.7):
   - 10 preguntas B2B en español de Chile, versionadas y con fecha, en cuatro tipos (informativa, comparativa, de
     recomendación y de marca), con mayoría sin nombrar marcas; ChatGPT, Perplexity, Gemini y Google (AI Overviews o
     AI Mode), sin sesión iniciada y desde Chile;
   - cada pregunta se repite 3 veces por motor, porque las respuestas cambian entre corridas (decisión propia, no
     cifra de una fuente); una celda que falla 3 veces es «no medida», no «sin resultado»;
   - se registra, por respuesta: fuentes citadas, si efeoncepro.com aparece y si se menciona o se cita (no es lo mismo),
     cuántas de esas URL están en el top 10 de Google para la misma pregunta y cuánto coinciden las fuentes entre motores;
   - se publica como muestra fechada, nunca como cuota de mercado; 10 preguntas no alcanzan para un Share of Voice (la
     skill pide 20 a 50). Si no se corre, esa sección no se publica.

## 4. Borrador V1 (2026-10-25)

**Estructura (H2 como la pregunta que hace el comprador, por la evidencia de la fila 15):** ¿Qué es AEO? (glosario en
Recuadro: AEO, GEO, LLMO/LMO, AI Overviews, AI Mode) · ¿En qué se diferencia del SEO? (Tabla Efeonce + Destacado) ·
¿Cómo eligen sus fuentes los motores? (Pasos del recorrido + Ahrefs 12 % y Semrush por dominio) · ¿Qué mira cada motor?
(H3 Google, Gemini, ChatGPT, Perplexity, Copilot, Claude + tabla de robots) · ¿Qué cambiar en tu sitio? (Pasos de seis
hábitos + Recuadro de lo que no hace falta) · ¿Cómo empezar si tu equipo es pequeño? (Pasos + Growth CTA claro) ·
¿Cómo se mide? (Pew + fuentes de medición) · Preguntas frecuentes (6) · En resumen · Fuentes y nota de actualización.

**Correcciones contra el post de 2025:** fuera Google-Extended como palanca de visibilidad, el schema FAQ/HowTo «para la
IA», GPT-5 y Neeva, el convenio OpenAI–Reuters, las cinco citas de expertos sin fuente, los «tres caminos» que sumaban
130 % y el enlace al Grader que llevaba a Loop. Se conservan, corregidos, el glosario y las fichas por motor.

**Cifra corregida en la skill:** el «0,656 vs 0,484» de Ahrefs compara la sub-pregunta contra el título citado (0,656) y
la pregunta contra el no citado (0,484); el par comparable es pregunta→título citado 0,602 vs no citado 0,484. El
artículo usa el par comparable.

**Enlaces internos:** posicionamiento SEO (servicio), dónde cita la IA, topic clusters, descubrimiento más allá de
Google, web agéntica. El Growth CTA `blog-aeo-assessment` va al final de «¿Cómo empezar…?», presentado con una frase
de contexto.

**Infografía (2026-10-25):** «Cómo arma su respuesta un motor de IA», sólo en versión clara, en «¿Cómo eligen sus
fuentes…?» después de los Pasos que describe: la pregunta, las cuatro sub-preguntas, seis fuentes con dos elegidas y la
respuesta que cita la guía oficial y tu sitio (la órbita marca la cita de tu sitio). Adjuntos `252115` (escritorio
1600 × 930) y `252116` (móvil 900 × 2516), subidos con hash verificado; fuente y builder en
`ai-generations/2026-10-25_aeo-infografia/` (alt y pie en `media-meta.json`). Íconos auditados (`auditIconGroup` ok) y
sin texto cruzando la órbita.

**Copia privada `252114` actualizada (2026-10-25 14:15 UTC):** tenía la V1 (sin los enlaces naturales ni la
infografía); ahora tiene la V3 del spec. Respaldo `_gh_aeo_review_252114_v3_20261025_141519`. Los nueve enlaces internos
responden 200.

**Pendientes antes de publicar:** portada (fórmula nueva), revisión de Julio en `252114`, envío real del formulario del
CTA, barrido de enlaces internos a la URL vieja y la migración de URL con 301 (§3).
