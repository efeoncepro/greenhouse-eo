# BENCHMARK — Suites SEO y pure-plays AEO frente a nuestro motor

> **Tipo:** referencia de inteligencia competitiva verificada.
> **Levantado:** 2026-08-15 por Claude (analista de IC), fuentes primarias vía fetch directo a páginas de producto/precio y una llamada directa a la API oficial de Semrush.
> **Ampliado:** 2026-08-15 con los dos lanes que faltaban — **enterprise** (§ 2.4) y **cobertura es-LATAM** (§ 2.5) — más la sección **§ 6, lo que este benchmark descubrió sobre nosotros**.
> **Caduca:** **2026-11-15** (un trimestre). Este mercado se reescribe cada trimestre — Semrush movió su AEO de add-on a plan base, Ahrefs publicó Brand Radar y Semrush abrió 17 mercados LATAM dentro del último año.
> **Motivo de existencia:** en una sesión de trabajo se afirmaron **dos ventajas competitivas falsas**. Este documento existe para que eso no vuelva a pasar.

---

## 1. Cómo se usa este documento

**Regla dura: antes de decirle a un prospecto qué hacemos nosotros que la herramienta no hace, se lee la § 4.**

| Situación | Qué se lee |
|---|---|
| El cliente dice *"me compro Semrush y lo hago yo"* | § 4 completa, después `modules/07_DISPLACEMENT.md` § 2 |
| Vas a escribir una diapositiva/propuesta con un diferenciador técnico | § 4 primero, § 5 después. **Nada fuera de § 5 se escribe.** |
| Te preguntan por precio de la competencia | § 3 · enterprise en § 2.4 |
| Te preguntan si medimos "ChatGPT" | § 4, afirmación **F-04** |
| 🔴 **Vas a citar cobertura LATAM o hablar de medir "desde Chile / desde México"** | **§ 2.5 completa**, después **§ 4, F-09 y F-11** |
| El prospecto está evaluando Conductor, BrightEdge o seoClarity | § 2.4 |
| Vas a hablar de la curva de CTR propia como diferenciador | **§ 4, F-12** antes que S-01 |
| Antes de prometer robustez de medición o cobertura de mercado | 🔴 **§ 6 — lo que este benchmark descubrió sobre nosotros** |

### Protocolo de marcado

| Marca | Significado |
|---|---|
| ✅ | **Verificado hoy** en fuente primaria (página del proveedor o llamada a su API), con URL y fecha |
| ⚠️ | **Declaración de marketing del proveedor** — verificada como *dicha*, NO como *cierta*. No hay evidencia independiente de que el producto haga lo que dice |
| ❌ | **No verificado / no publicado.** No se afirma en ninguna dirección |

🔴 **La distinción ⚠️ es la más importante del documento.** Casi todo lo que sabemos de la competencia es lo que ella dice de sí misma en su home. **Que un proveedor liste nueve motores no prueba que los mida bien.** Tampoco prueba lo contrario. Frente a un cliente, un ⚠️ se cita como *"ellos declaran que…"*, nunca como *"ellos hacen…"*.

---

## 2. Tabla comparativa de capacidades

### 2.1 Pure-plays AEO/GEO

| Herramienta | Motores declarados | Método publicado | Muestreo | Datos propios del cliente | Fuente (as-of 2026-08-15) |
|---|---|---|---|---|---|
| **Evertune** | **9** — ChatGPT, Claude, Perplexity, Gemini, AI Mode, AI Overviews, Copilot, DeepSeek, Meta AI ⚠️ | 🔴 **Sí, y es el más explícito del mercado**: *"samples each prompt 100 times across every AI model"* + *"EverPanel, our proprietary panel of over 150 million user prompts"* ⚠️ | 🔴 **N=100 por prompt** ⚠️ | ❌ no declarado | [evertune.ai](https://www.evertune.ai/) |
| **Profound** | **8** — Perplexity, ChatGPT, Claude, Gemini, Grok, Copilot, DeepSeek, Google AI Overviews ⚠️ | ❌ **No divulgado** en home ni pricing | ❌ | ✅ **Sí** — Google Analytics, GCP, Akamai, AWS, Cloudflare, Fastly, Netlify, Vercel, WordPress (para *Agent Analytics*) | [tryprofound.com](https://www.tryprofound.com/) · [/pricing](https://www.tryprofound.com/pricing) |
| **Athena HQ** | **8+** — ChatGPT, Perplexity, AI Overviews, AI Mode, Gemini, Claude, Copilot, Grok ⚠️ | ❌ No divulgado | ❌ | 🔴 **Sí — GA4 + Google Search Console + Shopify**, y salidas a Tableau/Power BI/Looker ✅ | [athenahq.ai](https://www.athenahq.ai/) |
| **Otterly.ai** | **4** base — ChatGPT, Google AI Overviews, Perplexity, Copilot; **AI Mode, Gemini y Claude son add-on pagado** ✅ | ❌ No divulgado | ❌ | ✅ *Agent Analytics* (eventos), conector Looker Studio, **API y MCP propios** | [otterly.ai/pricing](https://otterly.ai/pricing/) |
| **Peec AI** | **6** — ChatGPT, AI Mode, AI Overviews, Copilot, Perplexity, Gemini ✅ | ❌ No divulgado | ❌ | ❌ no declarado | [peec.ai](https://peec.ai/) · [/pricing](https://peec.ai/pricing) |
| **Scrunch** | **5** — ChatGPT, Perplexity, Claude, Gemini, Copilot ⚠️ | ❌ No divulgado | ❌ | ⚠️ rastreo de bots/agentes sobre el sitio; sin GSC/GA declarado | [scrunch.com](https://scrunch.com/) |
| **Goodie** | ❌ no levantado | ❌ | ❌ | ❌ | — (hueco, § 7) |

### 2.2 Suites generalistas

| Suite | ¿Mide AEO? | Motores | Cadencia | Empaque | Fuente |
|---|---|---|---|---|---|
| **Semrush** | 🔴 **SÍ — y viene incluido en el plan base, no es add-on** ✅ | *"Google Search, ChatGPT, Perplexity, Gemini & more"* ⚠️ | 🔴 **Diaria** ✅ | **50 prompts/día** en Starter · **100** en Pro+ · **200** en Advanced. Enterprise: *"Custom large-scale AI prompt tracking"* ✅ | [semrush.com/pricing](https://www.semrush.com/pricing/) |
| **Ahrefs** (Brand Radar) | ✅ Sí | **6 + 3 sociales** — AI Overviews & AI Mode, ChatGPT, Perplexity, Copilot, Gemini, Grok, + YouTube/TikTok/Reddit ⚠️ | ❌ no declarado en la página | Producto aparte: **$398/mo** (select platforms) / **$699/mo** (all platforms) ✅ | [ahrefs.com/brand-radar](https://ahrefs.com/brand-radar) |
| **Conductor** | ✅ Sí — *Conductor Intelligence* + *AgentStack* | *"ChatGPT, Gemini, Copilot, Claude, and traditional search"* ⚠️ · **tabla país × idioma × motor pública** → § 2.4 | ❌ | Enterprise, tiers sin cifras → § 2.4 | [conductor.com](https://www.conductor.com/) |
| **BrightEdge** | ✅ Sí — *AI Catalyst*, *Copilot*, *Autopilot*, *Data Cube X* | Google AI y ChatGPT ⚠️ · 🚩 **lista inconsistente entre sus propias páginas (3/5/7)** → § 2.4 | ❌ | Enterprise, precio no publicado → § 2.4 | [brightedge.com](https://www.brightedge.com/) |
| **seoClarity** | ✅ Sí — *Clarity ArcAI* | ❌ no especificados en la página | ❌ | ✅ **desde $2.500–$4.500/mes** → § 2.4 | [seoclarity.net](https://www.seoclarity.net/) |

| **Moz** | ❌ no verificado (moz.com bloquea el fetch) | ❌ | ❌ | ❌ | hueco, § 7 |
| **Sistrix** | ❌ no verificado | ❌ | ❌ | ❌ | hueco, § 7 |
| **SE Ranking** | ✅ Sí | ❌ no levantados acá | ❌ | ⚠️ **AEO limitado a 7 mercados: EE. UU., R. Unido, Canadá, Francia, Alemania, P. Bajos y España** — § 2.5 (e) | § 2.5 (e) |
| **Nightwatch** | ✅ Sí | ❌ no enumerados en su doc de AI/LLM | ❌ | ⚠️ **"107.000+ locations" es rank tracking clásico, NO cobertura AEO** — § 2.5 (e) | § 2.5 (e) |

🔴 **Las tres celdas de enterprise ya no son un hueco.** Método, forecast, precio de terceros y cobertura LATAM verificables en **§ 2.4**.

**Nota de contraste sobre seoClarity** — su *Clarity ArcAI* declara capacidades que nosotros **no** tenemos: *"Track AI search traffic and conversions"*, *"Know if AI bots access your pages"* y *"Detect hallucinations and errors in AI responses"* ⚠️ ([seoclarity.net](https://www.seoclarity.net/), 2026-08-15).

### 2.3 El motor multi-motor es un commodity comprable

🔴 **Este es el hallazgo estructural que más cambia el discurso.**

**DataForSEO vende la observación multi-motor como API de línea** ([dataforseo.com/apis/ai-optimization-api](https://dataforseo.com/apis/ai-optimization-api), 2026-08-15) ✅:

| Endpoint | Qué entrega | Precio |
|---|---|---|
| **LLM Responses API** | *"data from various LLMs in a single API"* — trabaja *"through official LLM APIs"* | **$0,0006 + cargos del LLM** por request |
| **LLM Mentions API** | *"source references, text snippets, mentions"* — citas y menciones estructuradas | **$0,10** por request |
| **LLM Scraper API** | *"access ChatGPT and Gemini response data in real time"* | variable por cola |
| **AI Keyword Data API** | volumen de búsqueda para IA | **$0,01** por tarea |

Cobertura: ChatGPT, Google AIO, Gemini, Claude, Perplexity.

🔴 **Y la cobertura NO es uniforme entre endpoints** — detalle en **§ 2.5 (f)**: **LLM Mentions es *"United States and English only"* para ChatGPT**, mientras **LLM Scraper tiene 215 ubicaciones (MX/CL/CO/AR/PE) y 43 idiomas**. **Somos clientes de DataForSEO: esta asimetría es nuestra, no sólo del mercado.**

**Consecuencias directas, sin adorno:**

1. **"Consultamos 5 motores" no es una barrera de entrada.** Cuesta fracciones de centavo por consulta y lo compra cualquiera con tarjeta.
2. **Nosotros ya somos cliente de esa commodity**: nuestro canal `google_ai_overview` corre sobre DataForSEO (`contracts.ts`, TASK-1265). El motor propio es propio en 4 de 5 canales, no en 5.
3. **Existe comercialmente un scraper de la superficie de consumo** de ChatGPT y Gemini. Es decir: la limitación que nosotros aceptamos —medir la API y no el producto de consumo— **no es una limitación del mercado, es una decisión nuestra**.

---

### 2.4 Enterprise: Conductor · BrightEdge · seoClarity

> Lane levantado el **2026-08-15**. Cierra el hueco **H-03** y buena parte de **H-04** para estos tres. Sustituye las tres celdas casi vacías de § 2.2.

| | **Conductor** | **BrightEdge** | **seoClarity** |
|---|---|---|---|
| **Forecast de clics** | ❌ **No existe el producto** | ✅ Curva **propietaria**, origen **no divulgado** ⚠️ | ✅ 🔴 **Curva de CTR tomada del GSC del propio cliente** — el único que lo documenta ✅ |
| **Método AEO** | **API oficial** — declarado ⚠️ | ❌ **No divulgado** | **UI scraping** — declarado ⚠️ |
| **Precio publicado** | Tiers sin cifras | ❌ Nada | ✅ Desde **$2.500–$4.500/mes** |
| **Español / LatAm en AEO** | 🔴 ✅ **Tabla país × idioma pública** (MX, CL, CO, PE, AR, ES) | ❌ No verificado | ❌ No verificado |

#### (a) 🔴 seoClarity documenta la curva de CTR del cliente — y la vende

Cita textual: *"Google Search Console (GSC) is the only source of valid CTR data in the world for any company"* ⚠️. Permite configurar la curva desde el GSC del cliente, **segmentada mobile/desktop/brand/non-brand**.

⚠️ **Matiz que hay que decir completo:** también ofrece un **"CTR Index" genérico**. La curva del GSC propio es una **opción**, no está verificado cuál es el default.

🔴 **Consecuencia directa para nosotros:** esto es exactamente comparable a nuestra decisión de curva propia (**TASK-1700**). Nuestra elección metodológica **coincide con la del vendor enterprise más riguroso del set** — lo cual valida la decisión y **mata la exclusividad al mismo tiempo**. Ver § 4, **F-12**.

#### (b) La guerra metodológica está publicada, y por eso es citable

Los dos se contradicen en su propia página:

- **Conductor:** API-first, *"avoids the risks... associated with less reliable scraping methods that other AI visibility trackers use"* ⚠️
- **seoClarity:** lo contrario, *"APIs do not show what real users actually see"* ⚠️

Ambos son marketing auto-interesado. **Su utilidad no es decidir quién tiene razón: es que cada uno articula la crítica del otro mejor que nosotros, y se puede citar contra sí mismo.** Frente a un prospecto que evalúa a uno de los dos, la pregunta es del otro.

#### (c) ⚠️ Dos grietas en el claim de Conductor — hallazgo propio de este relevamiento

1. En su tabla de compatibilidad existe un motor llamado literalmente **"ChatGPT (Crawl)"**.
2. Rastrea **Google AI Overviews, AI Mode y Copilot**, que **no tienen API pública oficial**, sin explicar cómo.

**Lectura defendible:** API-first donde hay API, automatización en el resto, **sin declararlo**. No se afirma que mientan; se afirma que el claim "API-first" no cubre lo que su propia tabla lista.

#### (d) Conductor es el único que permite verificar cobertura LATAM antes de comprar

Publica **tabla país × idioma × motor**, más de **160 países** ✅: **MX / CL / AR / ES con soporte pleno**; **CO y PE sin Claude Sonnet**; **VE parcial**.

🔴 Ninguna otra herramienta del documento —pure-play o suite— publica algo equivalente.

#### (e) BrightEdge es el menos transparente del set

- Método **no divulgado** en **5 páginas revisadas**.
- Lista de motores **inconsistente entre sus propias páginas**: **3 / 5 / 7** según dónde se mire.
- Su estimación de dificultad usa señales envejecidas — *"Twitter/Facebook shares and likes"* — **en una página viva en 2026** ⚠️.

#### (f) Precios de terceros — cómo se citan

Usar **el widget de Vendr**, **NO su prosa generada por IA**, que se autocontradice. Fuentes de terceros con vintage **feb–jul 2026**:

| Producto | Mediana reportada por terceros | Nota |
|---|---|---|
| **BrightEdge** | **$50.000/año** (n=46) | No publica planes |
| **Conductor** | **$49.510/año** | |
| **seoClarity** | **$33.969/año** | 🔴 **Converge con su propio tier publicado ($2.500–$4.500/mes) — la señal más sólida del set** |

🚩 **Fabricaciones demostradas en granjas de contenido.** Se encontró un tier de seoClarity de *"~$750/mes"* que **no existe** (mínimo real $2.500), y *"BrightEdge: 2 Plans from $1.000–$12.500/month"* cuando **BrightEdge no publica planes**.

🔴 **Excluir de cualquier scan competitivo:** `costbench.com` · `checkthat.ai` · `crawlraven.com` · `authoritytech.io` · `saleshive.com` · `searchatlas.com` · `stackmatix.com` · `itqlick.com` · `saasworthy.com`.

⚠️ **Nota de coherencia interna:** `authoritytech.io` está en esa lista de exclusión **y** es la fuente secundaria citada en § 4, F-05. Esa cita se mantiene sólo porque el argumento que sostiene (el ruido entre muestras repetidas) **está respaldado independientemente** por el muestreo N=100 que Evertune declara. **No usarla como fuente única de ninguna cifra.**

#### (g) Lo que ninguno de los tres hace

🔴 **Ninguno publica una metodología en sentido estricto** — ni tamaño de muestra, ni intervalos de confianza, ni protocolo de validación. **Publican *posiciones*.**

Y **no existe ningún test independiente riguroso** que verifique cómo miden los tres. La mejor crítica del sector disponible (metehan.ai, **2026-07-02**) da el marco: la **red flag #1 es *"No raw answer access"***, y un muestreo único es *"noise, not a measurement"* ⚠️.

🔴 **Doble filo, y hay que leerlo entero:** por ese criterio, **Conductor sí da acceso al texto completo de la respuesta y a las fan-out queries** ✅ — es decir, pasa la red flag #1. Y **nosotros corremos muestreo único** (§ 6). El marco que nos favorece en evidencia cruda nos condena en muestreo.

---

### 2.5 Cobertura es-LATAM

> Lane levantado el **2026-08-15**. Cierra el hueco **H-09** y reescribe **F-09**. 🔴 **Esta subsección es de lectura obligatoria antes de decir la palabra "LATAM" delante de un cliente.**

#### (a) El veredicto de cobertura

**Sólo 4 de 14 herramientas nombran los cinco mercados LATAM (MX / CL / CO / AR / PE) en documentación verificable:** **Evertune**, **Peec AI**, **Otterly.ai** y **Semrush** ✅.

Y —el dato más duro— **sólo 2 de 14 declaran desde dónde sale la consulta al LLM**:

| Herramienta | Qué declara |
|---|---|
| **Profound** | *"proxy networks across 80+ countries"* ⚠️ |
| **Evertune** | *"servers located in the selected country"* ⚠️ |

**Las otras 12 no lo dicen. Nosotros tampoco** (§ 6).

#### (b) 🔴 El dato que cambia el argumento comercial, y es contraintuitivo

**`chatgpt.com` está mejor rankeado en Chile, Colombia y México que en Estados Unidos.**

| País | Posición de `chatgpt.com` |
|---|---|
| **Chile** | **#6** |
| **Colombia** | **#6** |
| **México** | **#8** |
| **Estados Unidos** | **#10** |

Similarweb top-websites, datos de **julio 2026**, actualización **2026-08-01** ✅. En Chile está **por encima de Emol, Mercado Libre y BioBioChile**.

🎯 **Uso comercial:** mata de raíz la objeción *"eso es cosa de gringos, acá todavía no pasa"*. **No es que LATAM vaya atrás: en penetración de la superficie, va adelante.**

#### (c) 🔴 El dato que cambia qué motores conviene medir

En la categoría **"AI Chatbots and Tools"** de **México** y **Chile**, el orden es:

**ChatGPT → Gemini → Claude**

Y **Perplexity y Copilot NO aparecen en el top-5 de ninguno de los dos**, mientras que **globalmente sí** ✅.

**Consecuencias, sin adorno:**

1. Para LATAM, **cubrir bien ChatGPT + Gemini cubre casi todo el mercado observable**.
2. **Pagar por cobertura de Perplexity es pagar por cobertura estadounidense.**
3. 🔴 Eso incluye nuestro propio motor: **medimos Perplexity** (§ 6).

#### (d) 🔴 El problema técnico de geolocalización que casi nadie declara

La distinción que decide el caso:

| Modo | ¿Entra la ubicación? |
|---|---|
| **Modelo base, sin búsqueda web** | 🔴 **No tiene ninguna entrada de ubicación.** Correr la consulta desde una IP chilena **no cambia nada**, porque el modelo nunca ve la IP |
| **Con búsqueda web** | La ubicación es un **parámetro explícito que hay que pasar** — OpenAI `user_location` (`country` ISO-2, `city`, `region`, `timezone`); Perplexity `country` / `region` / `city` / coordenadas |

⚠️ **Ninguno de los dos documenta cuál es el default si no se especifica.**

🔴 **Consecuencia operativa:** *una herramienta que use la API y no pase la ubicación obtiene un resultado sin geografía, corra desde donde corra.* El proxy no salva a nadie. **Es la pregunta técnica que se le hace a un competidor** — y es exactamente la que nosotros fallamos (§ 6).

#### (e) Casos que hay que entender antes de citar a alguien

**SE Ranking** — declara español, pero su AEO cubre **7 mercados**: EE. UU., Reino Unido, Canadá, Francia, Alemania, Países Bajos y **España** ✅. **Una marca chilena o mexicana no puede trackearse en su propio mercado.**
⚠️ **Trampa de categoría:** su *otro* producto (**AI Overviews Tracker**) sí lista **200+ países**. **Citarlo como cobertura AEO es un error de categoría** — y es fácil de cometer leyendo su home.

**Nightwatch** — comercializa **"107.000+ locations"**, pero eso es **rank tracking clásico**. Su documentación de AI/LLM sólo dice *"Location & Language — Target the market relevant to your tracking goals"*, **sin enumerar países** ⚠️.

**Ahrefs** — 🎯 **el más honesto del set, y conviene citarlo con respeto:** *"Locale parameterization mirrors the ratio of queries by country and language in our keyword database"*, *"We don't estimate actual AI usage by country"*, *"Strongest in English"* ✅. Acepta `mx` / `ar` como parámetro; **no los sirve como mercado**. La diferencia entre *aceptar un parámetro* y *servir un mercado* es la que hay que saber hacer.

**Semrush** — 🔴 **LATAM entró el 2026-05-14**: 17 mercados nuevos, entre ellos **AR, CL, CO, PE, PA, UY** ✅. **Cualquier análisis de cobertura LATAM de Semrush anterior a esa fecha está obsoleto.**
⚠️ Ojo con la letra chica: los **"220+ countries"** aplican **sólo a Prompt Tracking**, no a los reportes respaldados por su base de prompts.

**Scrunch AI** — declaración de cobertura amplia (*"every country... any language"*) ⚠️, pero **el español no se nombra**. Y da **el caveat más honesto del sector**: sólo entrega resultados por país *"in AI platforms that support geolocated search"*, y advierte que *"English prompts for non-English markets often return English-centric sources."*

#### (f) DataForSEO — relevante porque somos su cliente

🔴 **La cobertura NO es uniforme entre endpoints.** Asumir que lo es es un error caro:

| Endpoint | Cobertura geográfica / idioma |
|---|---|
| **LLM Mentions** | 🔴 ***"United States and English only"*** para ChatGPT ✅ |
| **LLM Scraper** | **215 ubicaciones** — MX `2484`, CL `2152`, CO `2170`, AR `2032`, PE `2604` — y **43 idiomas** ✅ |
| **LLM Responses** | Tiene `web_search_country_iso_code`, pero **sin parámetro de idioma** ✅ |

#### (g) Ausencias que son hallazgo

Lo que **no existe** también es inteligencia competitiva:

1. 🔴 **No existe un solo estudio original con metodología declarada que mida visibilidad en IA en un mercado hispanohablante.**
2. 🔴 **Nadie distingue España de LATAM.** HubSpot titula literalmente *"5 claves AEO para LATAM y España"*, tratándolas como **un** mercado.
3. 🔴 **Cero tests controlados publicados** que corran el mismo prompt desde IP mexicana vs. estadounidense y publiquen el delta.

**Evidencia académica transferible** — ⚠️ **no es sobre español, y hay que decirlo al citarla**: arXiv **2606.23165**, **12 lenguas europeas**. Pasar de consulta en inglés al idioma local sube la cuota de recomendación **0,80 para campeones locales** vs **0,15 para multinacionales**.
🎯 **Cómo se cita sin mentir:** *"la evidencia publicada es sobre lenguas europeas, no sobre español; sugiere que el idioma de la consulta mueve fuerte la recomendación hacia marcas locales. No hay estudio equivalente en nuestro mercado — por eso lo medimos en vez de suponerlo."*

#### (h) ⚠️ Contaminación por PR sindicado — filtrarla en todo scan competitivo

Se detectaron **artículos casi idénticos** sobre *"las 5 agencias que dominan la visibilidad en IA en la región"*, **republicados literal** en medios mexicanos no relacionados: `noroeste.com.mx`, `elcontribuyente.mx`, `diario21.com.mx` — **arrastrando hasta la errata del original**.

🔴 **Es distribución pagada, y es en sí misma una táctica AEO.** Dos consecuencias:

1. **Filtrarla** en cualquier scan competitivo de la región. Un competidor "citado en 3 medios" puede ser un competidor que pagó un cable.
2. 🎯 **Es un dato vendible:** demuestra que en la región ya se está comprando presencia sindicada para alimentar a los motores.

#### (i) 🔴 Cifras que circulan y NO se deben usar

| Cifra | Por qué no |
|---|---|
| *"México: 87,2% de internautas usó IA (GWI)"* | **Fuente devuelve 403** y el dato **no está en DataReportal** |
| *"LATAM = 14% de las visitas globales a plataformas de IA"* | **Sin atribución** |

**Ninguna de las dos entra en material comercial, deck, propuesta ni conversación.**

---

## 3. Precios con `as-of`

Todos verificados el **2026-08-15** en la página de precios del proveedor.

| Producto | Entrada | Tramo con AEO real | Notas |
|---|---|---|---|
| **HubSpot AI Search Grader** | 🔴 **Gratis, sin cuenta** | gratis | 3 motores, score /100. [hubspot.com/ai-search-grader](https://www.hubspot.com/ai-search-grader) |
| **Otterly.ai** | 🔴 **$29/mo** (Lite) — 15 prompts, 4 motores, **diario** | $189/mo (100 prompts, API + MCP, Agent Analytics) | Premium $489/mo (400 prompts) · Enterprise desde $1.000/mo · anual −15% ($25/$160/$422) · Gemini/Claude/AI Mode son add-on $9–$29 |
| **Profound** | **$99/mo** anualizado (Starter) — **solo ChatGPT**, 50 prompts, 1 idioma, 1 región | **$399/mo** (Growth) — 3 motores, 100 prompts, 3 asientos | Enterprise custom: hasta 9 motores, idiomas/regiones custom. **Cadencia diaria en todos los tramos** |
| **Athena HQ** | Gratis (Essential, $25 de crédito) | **$295/mo** (Starter, 3.600 créditos) | Enterprise custom |
| **Semrush** | $117,33/mo anual (plan SEO) · Free $0 | **$165,17/mo anual** (Starter, $199 mensual) — **50 prompts IA/día incluidos** | Pro+ $248,17 (100/día) · Advanced $455,67 (200/día) |
| **Ahrefs Brand Radar** | **$398/mo** (select platforms) | **$699/mo** (all platforms, 2.500 checks/mo de prompts propios) | |
| **Peec AI** | ❌ cifras no renderizadas en el fetch | ❌ | 4 tramos anuales: Starter/Pro/Advanced/Enterprise |
| **seoClarity** | ✅ **$2.500/mes** publicado | **$2.500–$4.500/mes** | Único enterprise del trío que publica cifra. Terceros: **$33.969/año** — converge ✅ |
| **Conductor** | ❌ tiers sin cifras | ❌ | Terceros (Vendr, feb–jul 2026): **$49.510/año** ⚠️ |
| **BrightEdge** | ❌ no publica planes | ❌ | Terceros (Vendr, n=46): **$50.000/año** mediana ⚠️. 🚩 Toda cifra de "planes de BrightEdge" es fabricada — § 2.4 (f) |

🔴 **Lectura comercial:** el piso de mercado para medir visibilidad en IA **es cero** (HubSpot) y el piso *operable con cadencia diaria* **es $29/mes** (Otterly). Cualquier argumento que dependa de que "medir esto es caro o difícil" está muerto.

🎯 **Y ahora el techo también tiene número:** el enterprise reportado por terceros va de **$33.969/año** (seoClarity) a **$50.000/año** (BrightEdge) ⚠️. **En todo ese rango —de gratis a cincuenta mil al año— no hay un solo tramo donde el número sea el producto: está entero cubierto por herramientas. Refuerza S-07.**

---

## 4. Lo que NO podemos decir

> Cada fila es una afirmación **prohibida** en material comercial, propuesta, diapositiva o conversación de venta, con el dato que la refuta.

### F-01 🔴 *"Ninguna herramienta puede proyectar clics desde Search Console"* — **FALSO**

**Refutado por:** **Athena HQ** lista **Google Search Console** y **GA4** entre sus integraciones nativas ✅ ([athenahq.ai](https://www.athenahq.ai/), 2026-08-15). **seoClarity** comercializa **"SEO Forecasting"** como capacidad de plataforma ⚠️ ([seoclarity.net](https://www.seoclarity.net/), 2026-08-15).

Conectar GSC es **table stakes** en la categoría, no una frontera tecnológica. Una herramienta *pure-play de AEO* de $295/mes ya trae GSC nativo. Basta un contraejemplo para matar un "ninguna", y hay al menos dos.

**Lo que sí resiste, y es mucho más chico:** nosotros computamos la curva de CTR **desde la serie GSC de la propia organización** en vez de una tabla de industria (`readOrgCtrCurve`, `src/lib/growth/seo/keyword-opportunities-reader.ts`).

🔴 **Actualización 2026-08-15 — esto se achicó todavía más:** el hueco H-01 quedó **parcialmente cerrado y en contra nuestra**. **seoClarity documenta y vende exactamente la misma decisión** (§ 2.4 a). Ver **F-12**.

### F-02 🔴 *"Las suites no miden el eje AEO con motor propio"* — **FALSO, y de forma aplastante**

**Refutado por:** **Semrush trae seguimiento de prompts en IA incluido en el plan base**, con **cadencia diaria**: 50 prompts/día en Starter ($165,17/mo anual), 100 en Pro+, 200 en Advanced, sobre *"Google Search, ChatGPT, Perplexity, Gemini & more"* ✅ ([semrush.com/pricing](https://www.semrush.com/pricing/), 2026-08-15). **Ahrefs Brand Radar** cubre 6 superficies de IA ✅. **Conductor**, **BrightEdge** y **seoClarity** tienen los tres su producto AEO nombrado ✅.

**El error de fondo fue temporal:** hace un año esto era cierto. Hoy no. **Un dato de este mercado con más de dos trimestres es un pasivo, no un activo.**

### F-03 🔴 *"Nuestros 5 motores son una ventaja de cobertura"* — **FALSO: estamos en la mitad de la tabla**

Evertune declara 9, Profound 8, Athena HQ 8+, Ahrefs 6, Peec 6, nosotros 5, Scrunch 5, HubSpot 3.
Y § 2.3: la cobertura multi-motor se compra a **$0,0006 por consulta**. **Contar motores es una carrera que ya perdimos y que además no importa.**

### F-04 🔴 *"Medimos ChatGPT"* — **IMPRECISO, y nuestra propia arquitectura lo dice**

Medimos la **API de OpenAI con la herramienta de búsqueda web**, que **no es** el producto de consumo. Cita textual de nuestra propia spec: *"do not assume ChatGPT consumer UI parity"*, y *"Provider APIs are treated as measurable approximations of answer-engine behavior"* (`GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` § 8.2.1).

**Agravante:** DataForSEO vende un **LLM Scraper API** que accede *"ChatGPT and Gemini response data in real time"* ✅. Existe la opción de medir la superficie de consumo y nosotros no la usamos. **Decir "medimos ChatGPT" a secas es vendible pero es falso**, y es exactamente el tipo de afirmación por la que nuestro comprador ya tiene una cicatriz.

**Se dice:** *"observamos el motor de OpenAI con búsqueda web activa"*.

### F-05 🔴 *"Nuestro scoring determinista versionado de 7 dimensiones es diferenciador"* — **FALSO en la forma; y "determinista" se está usando mal**

**Dos problemas distintos, ambos graves:**

**(a) La forma es común.** El **AI Search Grader de HubSpot es gratis** y produce un compuesto ponderado sobre 100 con 5 dimensiones declaradas: Sentiment 40, Presence Quality 20, Brand Recognition 20, Share of Voice 10, Market Competition 10 ✅ ([hubspot.com/ai-search-grader](https://www.hubspot.com/ai-search-grader), 2026-08-15). Nuestro score es la misma especie de artefacto con otras 7 dimensiones. Lo que difiere es **la elección** de dimensiones (descubrimiento comercial vs. sentimiento), no su existencia.

**(b) "Determinista" no significa lo que suena.** Nuestro *scorer* es una función pura: mismo run + misma versión ⇒ mismo score. **Eso no hace reproducible la medición**, porque la evidencia de entrada no es estable. Y corremos **N=1**: no hay lógica de repetición en el motor.

🔴 **Nuestra propia calibración ya lo advirtió** y no se implementó: para señales intermitentes *"N≥3 — un solo run las pierde (1/3)"*, y el score debería reportar cada hallazgo como `consistente`/`intermitente`/`ausente` con confianza, *"NO un punto único"* (`GREENHOUSE_AI_VISIBILITY_GRADER_CALIBRATION_V1.md` § 5.bis).

**Mientras tanto, Evertune declara muestrear cada prompt 100 veces por modelo** ⚠️. Y la crítica independiente apunta justo ahí: *"citation rankings shift between repeated samples of the same query, even minutes apart"* y *"Many 'differences' between competing brands fall within statistical noise"* (⚠️ fuente secundaria, blog fechado 2026-04-13, [authoritytech.io](https://authoritytech.io/blog/ai-visibility-score-accuracy-measurement-reality-2026)).

**Conclusión incómoda: en muestreo estamos por debajo del estado del arte declarado, no por encima.**

### F-06 🔴 *"Nuestros pesos están calibrados"* — **FALSO, y lo dice nuestro propio código**

`scoring/config.ts`: los pesos son *"HIPÓTESIS calibrada"* y el spike *"NO los recalibró"*. La calibración documenta el porqué: el golden set son **8 casos**, *"estadísticamente demasiado chico"* para un split calibration/holdout — recalibrar sería *"overfitting puro"* (§ c, decisión **MANTENER V1**).

**Se puede decir** que los pesos son explícitos, versionados y publicables. **No se puede decir** que estén validados, calibrados ni respaldados empíricamente.

### F-07 🔴 *"El prompt set autorado y congelado es superior"* — **NO SOSTENIBLE; el mercado argumenta lo contrario**

**Ahrefs vende exactamente el argumento opuesto y con volumen detrás:** *"Powered by search-backed prompts, not synthetic ones"*, sobre **"466 M+ Total monthly prompts"** ⚠️ ([ahrefs.com/brand-radar](https://ahrefs.com/brand-radar), 2026-08-15). **Evertune** apoya su medición en *"EverPanel, our proprietary panel of over 150 million user prompts"* ⚠️.

En el vocabulario de Ahrefs, **nuestro prompt set autorado es literalmente "sintético"**. En representatividad —¿la gente realmente pregunta esto?— **un panel de prompts reales le gana a un set autorado por un LLM**, y ese es el eje donde ellos eligieron competir.

**Lo que sí resiste:** congelar y versionar el set hace **comparables las corridas en el tiempo**. Es una ventaja de *comparabilidad*, **no de representatividad**. Son cosas distintas y no se pueden intercambiar en una diapositiva.

### F-08 🔴 *"Nosotros conectamos los datos propios del cliente y las herramientas de AEO no"* — **FALSO**

**Athena HQ** conecta **GSC + GA4 + Shopify** ✅. **Profound** conecta **Google Analytics + Cloudflare, Vercel, AWS, Akamai, Fastly, Netlify, GCP y WordPress** para su *Agent Analytics* ✅ — eso es telemetría de servidor y CDN, **más superficie de datos propios que la que tenemos nosotros en el eje AEO**.

### F-09 🔴 *"Las herramientas no cubren LATAM"* — **NO SOSTENIBLE**

**Otterly** declara *"Multi-country support (50+)"* ✅. **Athena HQ** declara *"60+ countries and languages"* ⚠️. **Profound** vende idioma y región como dimensión explícita del plan (1 idioma / 1 región en Starter y Growth; custom en Enterprise) ✅. **Peec** declara *"across all countries"* ⚠️. **HubSpot** ofrece su grader con interfaz en español y campo de geografía ✅.

🔴 **Actualización 2026-08-15 (§ 2.5) — el "nadie lo declara" era casi cierto, y ya no basta con decirlo así:** **2 de 14 sí lo declaran** — **Profound** (*"proxy networks across 80+ countries"*) y **Evertune** (*"servers located in the selected country"*) ⚠️. Los otros 12 no.

**Lo que sí sigue siendo cierto, y ahora con precisión técnica:** la geolocalización real depende de **pasar el parámetro**, no de la IP (§ 2.5 d). Un proxy en el país correcto **no geolocaliza nada** si la llamada no lleva `user_location`. Es la pregunta incómoda que se le hace a un competidor — **y la que nosotros hoy fallamos** (§ 6). **Hasta cerrar `ISSUE-158`, este párrafo no se usa en venta: se usaría contra nosotros.**

### F-10 🔴 *"Medir esto es caro / difícil / requiere un motor propio"* — **FALSO**

Gratis en HubSpot. $29/mes con cadencia diaria en Otterly. $0,0006 por consulta en DataForSEO. **Todo argumento de venta que dependa de la dificultad técnica de obtener el número está muerto.**

### F-11 🔴 *"Cubrir LATAM nos diferencia"* — **NO SOSTENIBLE, y hay un contraejemplo verificable**

**Refutado por § 2.5 (a) y § 2.4 (d):** **4 de 14** herramientas nombran los cinco mercados LATAM en documentación verificable —**Evertune, Peec AI, Otterly.ai y Semrush**— y **Semrush abrió 17 mercados LATAM el 2026-05-14** (AR, CL, CO, PE, PA, UY) ✅.

🔴 **El contraejemplo que mata la frase:** **Conductor publica una tabla país × idioma × motor** con MX/CL/AR/ES en soporte pleno y CO/PE sin Claude Sonnet ✅. **Es el único que permite verificar la cobertura LATAM antes de comprar — y nosotros no publicamos nada equivalente.** Un prospecto que pida evidencia de cobertura tiene dónde encontrarla, y no es con nosotros.

**Se dice, y es más chico y más cierto:** *"autoramos el set de prompts en el idioma y el mercado del cliente, con revisión humana"* (**S-06**). Eso es **autoría en el mercado**, no **cobertura de mercado**. Son cosas distintas y no se pueden intercambiar en una diapositiva.

⚠️ **Y antes de tocar el tema:** hoy nuestras consultas **no llevan ubicación** (§ 6, **N-01**). Decir "cubrimos LATAM" mientras `ISSUE-158` esté abierto no es sólo insostenible: **es la afirmación exacta que un evaluador técnico puede desarmar en una pregunta.**

### F-12 🔴 *"La curva de CTR propia del cliente nos diferencia"* — **FALSO: el enterprise más riguroso la documenta y la vende**

**Refutado por § 2.4 (a):** **seoClarity** permite configurar la curva desde el **GSC del propio cliente**, segmentada **mobile/desktop/brand/non-brand**, y lo argumenta verbatim: *"Google Search Console (GSC) is the only source of valid CTR data in the world for any company"* ⚠️.

**Cómo se lee esto sin dramatizar y sin inflar:**

- ✅ **Buena noticia:** nuestra decisión metodológica **coincide con la del vendor enterprise que mejor argumenta el punto**. La decisión de **TASK-1700** está validada por el mercado.
- 🔴 **Mala noticia:** **no es exclusiva, y ahora está verificado que no lo es.** Se cae cualquier redacción con "el único", "nadie más" o "a diferencia del mercado".
- ⚠️ **Matiz honesto que hay que conservar:** seoClarity también ofrece un **"CTR Index" genérico** y **no está verificado cuál es su default**. Eso permite decir *"nosotros lo hacemos por defecto"* **sólo si antes se verifica el default de seoClarity** — hoy no está verificado (§ 7, **H-01**).

**S-01 sigue en pie** como descripción de lo que hacemos. **Lo que muere es el adjetivo.**

---

## 5. Lo que SÍ podemos decir

> Redactado como frase usable. **Nada de esta sección afirma exclusividad**, porque la exclusividad es justo lo que no pudimos verificar. Registro formal (usted/institucional) para material client-facing.

**S-01 — Sobre la curva de CTR (SEO).**
> *"La proyección de clics se calcula con la curva de CTR observada en la propia serie de Search Console de su dominio, no con una tabla de CTR de industria. Eso incorpora automáticamente cuánto están deprimiendo el CTR los AI Overviews en su sitio y su vertical."*
Verificable en código (`readOrgCtrCurve`). 🔴 **NO agregar "somos los únicos" — ahora está verificado que NO lo somos: seoClarity documenta y vende la misma decisión (§ 2.4 a, F-12).** La frase de arriba describe el método y **no reclama exclusividad**; se usa tal cual, sin adjetivos.

**S-02 — Sobre la trazabilidad del score.**
> *"Cada corrida guarda la versión del set de prompts, el conjunto de motores consultados, la versión de la política de proveedores y la versión del score. Un puntaje publicado se puede explicar y recomputar: si cambió, sabemos si cambió por los pesos, por los prompts o por el mix de motores."*
Verificable: `grader_runs.requested_providers` + `prompt_pack_version` + `provider_policy_version` + `grader_scores.score_version`.

**S-03 — Sobre la transparencia del método.**
> *"Publicamos las siete dimensiones, sus pesos y el método. Puede auditar por qué su puntaje es el que es."*
🔴 **Este es el diferenciador más sólido que quedó en pie**, y el lane enterprise lo **reforzó**: **ninguno de los tres enterprise publica una metodología en sentido estricto** — ni tamaño de muestra, ni intervalos de confianza, ni protocolo de validación. **Publican posiciones** (§ 2.4 g).
Las excepciones que sí publican algo: **HubSpot** (5 dimensiones y pesos) y **Evertune** (muestreo N=100 y panel).
⚠️ **Precisión que hay que hacer, o el argumento se rompe en la repregunta:** **Conductor y seoClarity sí declaran su *método de captura*** —API oficial y UI scraping respectivamente (§ 2.4 b)—. **Declarar el método de captura no es publicar la metodología del puntaje.** Son dos cosas y hay que nombrarlas separadas.
**Frase segura:** *"la mayoría de las herramientas de esta categoría no publica cómo calcula su puntaje — algunas declaran cómo consultan al motor, que es otra cosa"* — con `as-of 2026-08-15`.

**S-04 — Sobre la evidencia cruda.**
> *"Cada hallazgo viene con el texto de la respuesta que lo originó. No le entregamos un número: le entregamos lo que el motor dijo de su marca, palabra por palabra."*
Verificable (`provider_observation`). **No se puede decir que otros no lo hagan** — hueco H-05.
🔴 **Y ahora hay un contraejemplo nombrado: Conductor da acceso al texto completo de la respuesta y a las fan-out queries** ✅ (§ 2.4 g). La frase se sigue usando **como descripción**, nunca como exclusividad.
🎯 **Lo que sí gana fuerza:** el criterio independiente de la categoría pone *"No raw answer access"* como **red flag #1** ⚠️ (metehan.ai, 2026-07-02). **Entregar el texto crudo no nos distingue, pero nos deja del lado correcto de la única crítica seria publicada** — y descalifica a quien no lo entrega. **Es una pregunta para el competidor, no una medalla nuestra.**

**S-05 — Sobre la honestidad del alcance.** *(Esto vende en esta categoría, no resta.)*
> *"Observamos los motores por sus APIs con búsqueda web activa. Es una aproximación medible del comportamiento del motor, no una réplica exacta de lo que ve un usuario en la aplicación de consumo. Se lo decimos antes de que lo pregunte, y está escrito en el informe."*
Verificable: es literalmente el texto de nuestra arquitectura. Coherente con la tesis de la práctica: **frente a un comprador con cicatriz, declarar el límite es el activo.**

**S-06 — Sobre el idioma y el mercado.**
> *"El set de prompts se autora en el idioma y el mercado del cliente —es-CL, es-LATAM— pasa por revisión humana y recién ahí se congela y se versiona. Las corridas siguientes son comparables contra ese mismo set."*
Verificable: `prompt-packs/authoring/`, `review-gates/`, ciclo draft→revisión→aprobación→congelado.
🔴 **Frontera dura, y es fina:** esto es **autoría en el idioma y el mercado**. **NO es cobertura geográfica de la consulta** — hoy la consulta sale **sin ubicación** (§ 6, **N-01**, `ISSUE-158`). **Nunca dejar que S-06 se lea como "medimos desde México".** Si el cliente lo pregunta, la respuesta honesta es la de **S-05** aplicada a geografía: se declara el límite.

**S-08 — Sobre la urgencia en LATAM.** *(Nuevo con el lane es-LATAM, § 2.5 b.)*
> *"En Chile y Colombia `chatgpt.com` es el sexto sitio más visitado del país, y en México el octavo — por encima de donde está en Estados Unidos, que es el décimo. En Chile está sobre Emol, Mercado Libre y BioBioChile. Esto no es una tendencia importada que va a llegar: acá la penetración ya es mayor."*
Fuente: **Similarweb top-websites**, datos **julio 2026**, actualización **2026-08-01** ✅.
🎯 **Es el mejor dato de urgencia del documento para nuestro mercado real**, y es contraintuitivo, que es justo lo que lo hace memorable en una reunión. **Es un dato de tráfico de sitio, no de uso de IA** — no convertirlo en "el X% de los chilenos usa IA". Ese número **no lo tenemos** (§ 2.5 i).

**S-07 — El argumento que de verdad gana, y que ya está en la práctica.**
> *"El puntaje es un commodity: HubSpot lo regala y hay herramientas que lo dan por 29 dólares al mes con actualización diaria. Le recomiendo que use una. Lo que no le da ninguna es el plan, ni quién lo ejecuta."*
🔴 **Este benchmark refuerza `modules/07_DISPLACEMENT.md` § 2 en vez de contradecirlo, y ahora con cifras verificadas.** Es el único terreno donde la evidencia nos deja pisar firme.

---

## 6. Lo que este benchmark descubrió sobre NOSOTROS

> 🔴 **Ésta es la sección más valiosa del documento, y la que menos gusta leer.**
> El encargo era mirar a la competencia. Los tres hallazgos de mayor consecuencia **no son sobre ellos**.
> **Nada de esta sección es material comercial.** Es la lista de lo que hay que arreglar antes de que un evaluador técnico lo encuentre primero.

### N-01 🔴 Ninguno de nuestros cuatro adapters pasa ubicación geográfica — y reportamos el resultado como visibilidad de un mercado

**Verificado en código.** Ninguno de los cuatro adapters propios de `answer_engines` manda parámetro de ubicación:

```
src/lib/growth/ai-visibility/providers/openai-adapter.ts       → sin user_location
src/lib/growth/ai-visibility/providers/anthropic-adapter.ts    → sin ubicación
src/lib/growth/ai-visibility/providers/gemini-adapter.ts       → sin ubicación
src/lib/growth/ai-visibility/providers/perplexity-adapter.ts   → sin user_location
```

**Y aun así le reportamos a un cliente mexicano su visibilidad *en México*.**

🔴 **Por qué es grave y no cosmético (§ 2.5 d):** correr desde una IP mexicana **no arregla nada** —el modelo base no ve la IP, y con búsqueda web la ubicación es un **parámetro explícito** que hay que pasar—. Es decir: **no es un problema de infraestructura que se resuelva con un proxy; es una llamada a la que le falta un campo.**

**Estado:** `ISSUE-158` (`docs/issues/open/ISSUE-158-grader-adapters-query-llms-without-geographic-location.md`), abierto **2026-08-15**, detectado **verificando este benchmark**. Familia: `ISSUE-152` (Berel medido en el mercado equivocado) · `TASK-1652` (el adapter de AI Mode manda el market crudo donde el proveedor espera otra cosa).

🔴 **Consecuencia comercial inmediata, sin esperar el fix:** **F-09 y F-11 quedan bloqueadas.** Mientras `ISSUE-158` esté abierta, **no se habla de cobertura geográfica en ninguna dirección** — ni para reclamarla nosotros, ni para reprochársela a un competidor. **La pregunta que le haríamos a Profound nos la pueden hacer a nosotros y la perdemos.**

### N-02 🔴 Corremos N=1 mientras el estado del arte declarado es N=100 — y nuestra propia calibración pidió N≥3

| | Muestreo |
|---|---|
| **Evertune** (declarado) | *"samples each prompt 100 times across every AI model"* ⚠️ |
| **Nuestra calibración** (pedido interno, no implementado) | **N≥3** — *"un solo run las pierde (1/3)"*, con reporte `consistente`/`intermitente`/`ausente` y confianza, *"NO un punto único"* |
| **Nuestro motor** (real) | 🔴 **N=1** |

**No es que estemos detrás del líder: estamos detrás de nuestro propio requisito escrito.** Fuente interna: `GREENHOUSE_AI_VISIBILITY_GRADER_CALIBRATION_V1.md` § 5.bis. Duplica **F-05 (b)** y el hueco **H-08**, y se repite acá porque los tres hallazgos se leen juntos.

⚠️ **Y el criterio independiente lo nombra:** un muestreo único es *"noise, not a measurement"* (metehan.ai, 2026-07-02) ⚠️. **Es la frase con la que un competidor informado puede descalificar nuestro número entero.**

🔴 **Regla operativa hasta que se implemente:** ningún material comercial afirma robustez, estabilidad ni reproducibilidad **de la medición**. La reproducibilidad que sí tenemos es la del **cómputo** (S-02), y son cosas distintas (**F-05 b**).

### N-03 🔴 Medimos Perplexity, que en MX y CL no está en el top-5 de asistentes

**§ 2.5 (c):** en la categoría "AI Chatbots and Tools" de **México** y **Chile** el orden es **ChatGPT → Gemini → Claude**, y **Perplexity y Copilot no aparecen en el top-5 de ninguno de los dos** —mientras que globalmente sí— ✅.

**Nuestro mix de motores está optimizado para un mercado que no es el nuestro.** Para LATAM, **ChatGPT + Gemini cubren casi todo el mercado observable**; **la cobertura de Perplexity es cobertura estadounidense.**

🎯 **Lectura constructiva, y es la que importa:** esto **no** dice "saquemos Perplexity". Dice que **el mix de motores es una decisión de mercado y hoy no está tomada como tal** — se heredó del vocabulario anglosajón de la categoría. Un cliente mexicano paga por observar un motor que su mercado no usa, y **no observamos con prioridad el segundo motor que sí usa**.

⚠️ **Y no confundir con F-03:** contar motores sigue sin ser una ventaja. Lo que cambia acá **no es cuántos, es cuáles.**

### Cómo se leen los tres juntos

Los tres apuntan al mismo lugar: **el motor está construido para una categoría descrita en inglés y para EE. UU., y lo vendemos en Chile y México.** Ninguno se arregla con copy.

🔴 **Regla de cierre de esta sección:** **hasta que N-01 y N-02 tengan fix verificado, la venta se apoya en S-05 y S-07** —el límite declarado y el plan que la herramienta no da— **y no en la calidad de la medición.** Que es, además, lo que la tesis de la práctica ya decía.

---

## 7. Huecos de investigación y cómo cerrarlos

| ID | Hueco | Por qué importa | Cómo se cierra |
|---|---|---|---|
| **H-01** | 🟡 **Parcialmente cerrado, en contra nuestra.** ¿Alguna suite deriva la curva de CTR de la GSC del propio cliente? **Sí: seoClarity** (§ 2.4 a). **Queda abierto:** ¿es su *default* o sólo una opción frente a su "CTR Index" genérico? ¿Y las demás suites? | Ya no sostiene exclusividad (**F-12**). El default de seoClarity es lo único que decide si podemos decir *"nosotros lo hacemos por defecto"* | Trial de seoClarity o pregunta directa en demo. Para Semrush/Ahrefs sigue en pie: conectar GSC de `efeoncepro.com` y mirar si el CTR esperado varía por sitio. **1 día.** |
| **H-02** | Verificación exhaustiva de GSC + proyección de clics en Semrush, Ahrefs, Moz y Sistrix | `moz.com` bloquea el fetch; las páginas de GSC de Semrush y Ahrefs no se pudieron resolver (404 en las URLs probadas) | Buscar las URLs correctas de los help centers y volver a fetchear. **Falta presupuesto de WebSearch en esta sesión.** |
| ~~**H-03**~~ | ✅ **CERRADO 2026-08-15** — precios enterprise levantados de terceros: BrightEdge $50.000/año (n=46), Conductor $49.510/año, seoClarity $33.969/año + tier publicado $2.500–$4.500/mes | — | § 2.4 (f). Citar siempre como **reportado por terceros** ⚠️, vintage feb–jul 2026, y usar **el widget de Vendr, no su prosa IA** |
| **H-04** | 🟡 **Parcialmente cerrado.** ¿Consultan APIs o raspan la interfaz de consumo? **Conductor declara API oficial, seoClarity declara UI scraping** (§ 2.4 b). **Sigue abierto para los pure-plays** y para BrightEdge | Determina si su medición se parece más que la nuestra a lo que ve un usuario real | Preguntarlo en una demo comercial y registrar la respuesta. La evasiva también es un dato. Para Conductor, repreguntar por **"ChatGPT (Crawl)"** y por AI Overviews/AI Mode/Copilot, que no tienen API pública (§ 2.4 c) |
| **H-05** | ¿Quién muestra el texto crudo de la respuesta como evidencia? | Sostiene o tumba S-04 | Trials de Otterly ($29) y Athena HQ (tramo gratuito). **Costo casi nulo — hacerlo.** |
| **H-06** | Cifras de precio de Peec AI | Tabla incompleta | Re-fetch de `peec.ai/pricing` con render de JS, o pedir demo |
| **H-07** | Moz, Sistrix y Goodie sin levantar | Tres celdas vacías | Reejecutar los lanes de investigación |
| **H-08** | 🔴 **Nuestro propio N=1** | **No es un hueco de la competencia: es una deuda nuestra**, y la más cara del documento. Nuestra calibración pide N≥3 y el motor corre N=1 | Implementar muestreo con reporte `consistente`/`intermitente`/`ausente` + confianza. **Abrir TASK.** Hasta entonces, ningún material comercial habla de robustez de medición. Desarrollado en **§ 6, N-02** |
| ~~**H-09**~~ | ✅ **CERRADO 2026-08-15** — adopción en MX y CL levantada vía Similarweb (§ 2.5 b y c): `chatgpt.com` #6 CL / #6 CO / #8 MX vs #10 EE. UU.; y ChatGPT→Gemini→Claude sin Perplexity ni Copilot en el top-5 de MX y CL | — | ⚠️ **Es tráfico de sitio, no uso declarado de IA.** El dato de "% de internautas que usó IA" **sigue sin fuente citable** — ver § 2.5 (i) |
| **H-10** | 🔴 **Nuestra propia geolocalización — `ISSUE-158`** | **La deuda más urgente en venta**, porque bloquea F-09 y F-11 en las dos direcciones. Verificado en código: los 4 adapters consultan sin ubicación | Pasar `user_location` donde el proveedor lo soporta y declarar el límite donde no. Seguimiento en `ISSUE-158` + `TASK-1652`. Desarrollado en **§ 6, N-01** |
| **H-11** | 🔴 **Nuestro mix de motores para LATAM** | Medimos Perplexity, que en MX/CL no está en el top-5; y no priorizamos Gemini, que sí | Decidir el mix **por mercado**, con el dato de § 2.5 (c). **Es decisión de producto, no de copy.** Desarrollado en **§ 6, N-03** |
| **H-12** | **LLMPulse sin verificar** — la fuente devolvió **403** | Queda una herramienta del scan sin levantar | Reintentar el fetch o levantarla desde fuente secundaria marcada ⚠️ |
| **H-13** | **Cobertura AEO de seoClarity y BrightEdge en español/LatAm** | Conductor publica tabla país × idioma; **los otros dos no están verificados en ninguna dirección** | No afirmar nada sobre ellos hasta verificar. Trial o demo con pregunta directa por MX/CL |
| **H-14** | 🎯 **El test controlado del delta por ubicación — que NADIE ha publicado** | § 2.5 (g): **cero tests publicados** que corran el mismo prompt desde IP mexicana vs. estadounidense y publiquen el delta. **Es un hueco de todo el sector, no sólo nuestro** | 🔴 **Podríamos publicarlo nosotros.** Correr el mismo set con y sin `user_location` y publicar el delta con método. **Encaja exactamente con la tesis de § 0 —transparencia como producto— y sería el primer dato original de la categoría en español.** Depende de cerrar **H-10** primero: hoy no tenemos con qué correr el brazo "con ubicación" |

### Nota de método sobre esta sesión

Cuatro lanes de investigación paralelos (suites generalistas, enterprise, pure-plays, cobertura es-LATAM) **agotaron el presupuesto de búsquedas web de la sesión (200/200) sin devolver informe**. Todo lo verificado en la versión original de este documento proviene de **fetch directo a páginas primarias** y de **una llamada directa a la API oficial de Semrush**, hecho por el analista.

**Delta 2026-08-15:** los dos lanes que faltaban —**enterprise** y **es-LATAM**— llegaron después y están integrados como **§ 2.4** y **§ 2.5**. **La cobertura ya no es floja en ninguno de los dos.** Lo que queda flojo: **Moz, Sistrix, Goodie y LLMPulse** (H-07, H-12), y la verificación de GSC/forecast en las suites (H-02).

🔴 **La lección de método, que es la que hay que conservar:** al reejecutar, lanzar los lanes **de a uno** y no cuatro en paralelo — y **el lane que más valor devolvió no fue el de la competencia, sino el que obligó a mirar nuestro propio código** (§ 6).

### Observación primaria adicional

Llamada directa a la **API oficial de Semrush** (MCP, 2026-08-15): los toolkits expuestos —`overview_research`, `tracking_research`, `projects_research`— **no incluyen ningún reporte de visibilidad en IA**; `tracking_research` sólo cubre orgánico y pago de Google.

⚠️ **Esto NO prueba que Semrush no mida AEO** — sí lo mide, § 2.2 lo confirma con su propia página de precios. Prueba algo más estrecho y útil: **su capacidad AEO todavía no está expuesta en su API pública**, es decir es producto de interfaz. Para nosotros, cuyo contrato interno es Full API Parity, **ese sí es un eje donde podemos competir** — pero hay que verificarlo contra su documentación de API antes de decirlo en voz alta (hueco derivado de **H-02**).
