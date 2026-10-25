# Refresh — «SEO y AEO» (borrador V1)

> **Estado:** investigación (2026-10-25). Borrador del artículo pendiente de dos decisiones de Julio: URL y panel propio.
> **URL actual:** https://efeoncepro.com/loop-marketing/seo-aeo-optimizacion-ia-2025/ (post `248463`, categoría principal
> Loop Marketing; también en AEO). Propuesta: `/aeo/seo-y-aeo/` con 301.
> **Autor / voz:** Julio Reyes · voz Julio, doctrina como «En Efeonce…».
> **Propuesta aprobada:** [`BLOG_REFRESH_TANDA_1_PROPUESTA_V1.md`](BLOG_REFRESH_TANDA_1_PROPUESTA_V1.md) §3.
> **Respaldo del post vivo:** `tmp/aeo-248463-before.json` (contenido, metas, términos; `post_modified_gmt` 2026-03-06 21:27:09).

## 1. Por qué se reescribe

| Señal | Dato | Fuente |
|---|---|---|
| Impresiones (90 días) | 141, antes 1.051 (−87 %) | Search Console, 2026-07-26 → 2026-10-23 vs. ventana anterior |
| Clics | 0, antes 1 | Search Console |
| Posición | 21,5, antes 12,6 | Search Console |
| Visitas desde IA (12 meses) | 18 (Perplexity 14, ChatGPT 3, Gemini 1): la más alta del blog | GA4 486264460 |
| Palabras | 3.261 | post vivo |

**Consultas (medido).** Casi todo son búsquedas largas con forma de pregunta generada por IA: «aeo estrategias sin
equipo de marketing grande», «software para estrategia aeo», «optimización para motores de ia», «importancia del aeo para
empresas b2b», «comparar estrategias de aeo vs seo tradicional», «consultor aeo». La de más impresiones en la ventana
anterior fue «aeo answer engine optimization estrategias para pequeños equipos…» (144, posición 8,9). Lectura (inferida):
el artículo lo encuentran asistentes que arman búsquedas de fondo; la intención es «cómo hago AEO con un equipo chico,
qué cambia frente al SEO y cómo lo mido».

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

«aeo» solo es ambiguo: en México y España también es Operador Económico Autorizado (aduanas). No es la consulta foco.
«qué es geo» en México es sobre todo geografía o geolocalización (inferido). Foco: SEO + AEO como intención compuesta,
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

## 3. Decisiones pendientes (Julio)

1. **URL:** `/aeo/seo-y-aeo/` con categoría principal AEO y 301, o conservar la actual.
2. **Panel propio:** 10 preguntas B2B en español de Chile en ChatGPT, Perplexity, Gemini y Google (AI Overviews/AI Mode),
   con fecha; si no se corre, la sección no se publica.
