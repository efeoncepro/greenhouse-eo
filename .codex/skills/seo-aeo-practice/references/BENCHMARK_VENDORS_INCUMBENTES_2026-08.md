# BENCHMARK AEO — § 4 Incumbentes: suites y enterprise

> **Archivo hermano de [`BENCHMARK_SUITES_AEO_2026-08.md`](BENCHMARK_SUITES_AEO_2026-08.md)** — índice, convención de confianza y uso comercial viven allá.
> **as-of 2026-08-15 · caduca 2026-11-15.**
> Los métodos A/B/C/D están definidos en [`BENCHMARK_METODOS_TRANSPARENCIA_2026-08.md`](BENCHMARK_METODOS_TRANSPARENCIA_2026-08.md) § 2.

---

## 4.0 Tabla base

| Suite | ¿Mide AEO? | Motores | Cadencia | Método (§ 2) | Marca |
|---|---|---|---|---|---|
| **Semrush** (ahora **Adobe**) | 🔴 **Sí, incluido en el plan base** | **5** self-serve · +Claude/DeepSeek/Grok en Enterprise | 🔴 **Diaria** (Prompt Tracking) | **C** declarado + ⚠️ mecanismo de prompts custom **no verificado** | `[V]` |
| **Ahrefs** (Brand Radar) | ✅ Sí | 6 + 3 sociales | **Mensual con ventana de 90 días**; custom prompts **diarios** | **A** declarado, con excepción **B** en Claude | `[V]` · los disclaimers `[I]` |
| **Sistrix** | ✅ Sí — **dos productos, dos métodos** | 3 modelos económicos (A) / crawling en vivo (B) | Precomputado / **diaria** | **B** en el corpus, **A** en Prompt Monitoring | `[V]` |
| **Similarweb** | ✅ Sí — **dos productos, dos ejes** | 7 (tráfico) / 4 (visibilidad) | ❌ | **C** en tráfico · ⚠️ **no declarado** en visibilidad | `[V]` |
| **Botify** | ✅ Sí | ⚠️ **5 en producto / 2 seleccionables en la doc** `[C]` | **Semanal** | **A** vía partners + **B** en Perplexity — **declarado** | `[V]` |
| **Moz** | ⚠️ Sí | 3 | **Semanal fija** | 🔴 **cero metodología publicada** | ⚠️ **borrador no verificado, § 4.4** |
| **Yext (Scout)** | ✅ Sí | amplios en el papel | ❌ | 🔴 **cero** | **caja negra** |
| **Conductor** | ✅ Sí | *"ChatGPT, Gemini, Copilot, Claude, and traditional search"* | ❌ | **API-first declarado** ⚠️ con grietas (§ 4.8) | `[V]` |
| **BrightEdge** | ✅ Sí | 🚩 **3 / 5 / 7 según qué página de ellos mires** `[C]` | ❌ | 🔴 **no divulgado en 5 páginas revisadas** | `[V]` |
| **seoClarity** | ✅ Sí — *Clarity ArcAI* | ❌ no especificados | ❌ | **UI scraping declarado** | `[V]` |

---

## 4.1 Semrush (ahora Adobe) — el más grande, y el que nombró Chile

🔴 **Adobe completó la compra:** ~**US$1,9–2,0B**, **US$12,00/acción en efectivo**. Acuerdo **2025-11-18**, **cerrado 2026-04-28** `[I]`. El **2026-06-17** lanzó **"Adobe Brand Visibility"**, uniendo Semrush con Adobe LLM Optimizer.

⚠️ **Dirección del trato, porque circula al revés: Adobe compró Semrush, no Semrush a Adobe.**

### Dos motores que conviven y NO son lo mismo

| Motor | Qué es | Refresco |
|---|---|---|
| **Prompt Database** | **317M+ prompts REALES de clickstream**, 117 bases regionales | **Diario** |
| **Brand Performance** | 🔴 **Prompts SINTÉTICOS generados por Semrush** | **Semanal** |

🎯 **Ese contraste es material de venta contra ellos mismos** — y también **contra nosotros**: Ahrefs y Semrush llaman "sintético" exactamente a lo que nosotros hacemos (**F-07**).

**El clickstream viene de Datos, *"A Semrush Company"*** (20Bn+ URLs/mes, 185 países). ⚠️ 🔴 **Pero `datos.live` NO menciona captura de prompts de LLM: la conexión Datos → prompt DB es una inferencia razonable, NO declarada por ninguna de las partes.** **`no verificado` — no darla por probada.** Fecha de la adquisición de Datos: **no verificada** (§ 12).

### 🇨🇱 Cobertura — el único que nombró Chile

🔴 **El 2026-05-14 expandió a 32 países con 17 nuevos, incluidos Argentina, Chile, Colombia, Panamá, Perú y Uruguay** `[I]`. **Es el único vendor que nombra Chile explícitamente en un release de AI visibility.**

⚠️ **Y la letra chica, que hay que decir junto:**

- **Volumes y Topics siguen limitados a 15 países, y Chile, Colombia y Perú NO están.**
- **Brand Performance** sí llega a **68.000+ combinaciones** de país/estado/región/ciudad + idioma.
- Los **"220+ countries"** aplican **sólo a Prompt Tracking**.
- 🔴 **Su AI Visibility Index es sólo EE. UU.** (126M prompts, ene–abr 2026): **no citarlo como evidencia de cobertura LatAm.**

### 🏆 El hallazgo de su propio Index, que sirve para toda la categoría

> **En Gemini, el solapamiento entre marcas mencionadas y dominios citados baja hasta el 30%.**

👉 **Mención y citación son casi productos distintos — y cualquier score que los fusione lo esconde.** 🔴 **Incluido el nuestro.** Es una pregunta de diseño que tenemos abierta y que este dato obliga a mirar.

### Precios

Reestructurados ~**may-2026** (desaparecen Pro / Guru / Business): **SEO US$139 · Starter US$199 · Pro+ US$299 · Advanced US$549** (lista mensual). Equivalentes anualizados del lane anterior: SEO **$117,33** · Starter **$165,17** · Pro+ **$248,17** · Advanced **$455,67**.
🔴 **Add-on standalone US$99/mes por dominio con 25 prompts custom.** **Free checker público 3/día sin registro.**
Cupos IA incluidos: **50 prompts/día** en Starter · **100** en Pro+ · **200** en Advanced.

### Observación primaria propia

Llamada directa a la **API oficial de Semrush** (MCP, 2026-08-15): los toolkits expuestos —`overview_research`, `tracking_research`, `projects_research`— **no incluyen ningún reporte de visibilidad en IA**.
⚠️ **Esto NO prueba que Semrush no mida AEO** — sí lo mide. Prueba algo más estrecho: **su capacidad AEO todavía no está expuesta en su API pública, es decir es producto de interfaz.** Para nosotros, cuyo contrato interno es **Full API Parity**, ése sí es un eje donde podemos competir — **pero hay que verificarlo contra su documentación de API antes de decirlo en voz alta** (§ 12).

---

## 4.2 Ahrefs — la metodología más transparente del estudio

> 🎯 **Y la admisión más importante del mercado sobre geografía.** Léelo entero antes de usar cualquier dato de cobertura de cualquier vendor.

**Método declarado:** *"All prompts run through the free, publicly available web interfaces"* `[V]`. Excepción: **Claude sí por API, 8 checks por query** — ⚠️ ese detalle **no verificado** (§ 12).

### 🔴 La admisión que cambia cómo se lee todo el mercado

> *"Strongest in English; non-English markets represented proportionally"*
> **"We don't estimate actual AI usage by country"**
> *"Locale parameterization mirrors the ratio of queries by country and language in our keyword database"*

👉 **El locale de Ahrefs es una proyección derivada de su base de keywords, NO uso medido de IA.**

🎯 **Y la lectura correcta es contraintuitiva: Ahrefs probablemente no es peor que sus pares — es el único lo bastante honesto para decirlo.**

> ### 🔴 Regla operativa: **asumir que los demás hacen algo parecido hasta que prueben lo contrario.**

**Eso convierte la honestidad de Ahrefs en la vara de la categoría**, y es exactamente el terreno donde nosotros decimos querer competir (**S-03**, **S-05**).

### Lo demás, sin adorno

- ⚠️ 🔴 **~76% de su volumen es AI Overviews** (**282M de ~466M**). Los chatbots reales suman **~70M (~15%)**: **es más un producto de tracking de AIO que de chatbots.**
- Corpus **fijo y compartido entre todos los clientes**, refresco **mensual con ventana de 90 días**; los custom prompts sí son configurables a diario.
- ⚠️ **Cifras inconsistentes entre sus propias superficies el mismo día: 466M / 405M / 271M** `[C]` — 🔴 **citar siempre con superficie y fecha.**
- Admite: *"Metrics are directional indicators, not exact traffic counts"* y 🔴 **no filtra enlaces alucinados, deliberadamente.**
- ⚠️ 🔴 **Usa el GSC de sus clientes para mejorar SU estimación de volumen** (*"without identifying your website"*): **el cliente paga y además alimenta el índice del vendor.** *(Es una pregunta de gobernanza de datos que a un comité enterprise le importa, y que nosotros podemos responder distinto.)*
- **Precio:** Brand Radar es add-on con **precios contradictorios el mismo día: US$398 / US$699 / US$199** `[C]`. **Entrada real al AEO: US$328/mes.**
- **Argumento contra el prompt set autorado:** *"Powered by search-backed prompts, not synthetic ones"*, sobre **"466 M+ Total monthly prompts"** `[V]` — ver **F-07**.

---

## 4.3 Sistrix — dos productos, dos métodos, y se reportan mal casi siempre

### (A) *AI Chatbot Research Tool*

Corpus **precomputado de 10 millones de prompts por idioma**, con **búsqueda inversa**. **5 idiomas, incluido español.** 🔴 **Sin targeting por país.**

> 🚩 **Corre sobre `gpt-4o-mini`, `gemini-2.0-flash-lite` y `DeepSeek v3` — modelos económicos, NO los flagship que usa el consumidor.**

🔴 **Nadie publicita esto, y es el ángulo más fuerte para cuestionar su representatividad.** *(Mismo patrón que el `Claude 3.5 Haiku` de Rankscale: el número dice "Gemini" y mide otra cosa.)*

### (B) *Prompt Monitoring*

**Crawling en vivo, diario**, con 🏅 **selector de idioma Y país por proyecto**. Su declaración de método: *"Im Gegensatz zu vielen anderen Tools nutzt SISTRIX automatisiertes Crawling statt APIs."* `[V]`

⚠️ 🔴 **El AEO está GRATIS en beta y no aparece en ninguna de sus dos pricing pages** → **no está contractualizado, riesgo alto de repricing.** **No recomendarlo a un cliente como base de un proceso recurrente.**

### 🇨🇱 Dato de oro para un pitch chileno

Publica **keywords monitoreados por país**:

| País | Keywords |
|---|---|
| **España** | **51.128.510** |
| **Chile** | **1.000.000** |

🔴 **Y Chile, Venezuela, Egipto, Malasia, Malta, Nigeria, Pakistán, Singapur, Ucrania y EAU están TODOS exactamente en 1.000.000** — o sea que **es un cupo mínimo, no profundidad real de mercado**.

> ### **España tiene 51× más cobertura que Chile en la misma herramienta.**

🎯 **Se usa así:** *"la herramienta que su equipo va a comparar contra nosotros trata a Chile como cupo mínimo. No es un juicio sobre la herramienta: es lo que pasa cuando un mercado chico se sirve desde un índice global."*

### Y el dato que nos toca

**`CTR Potenziale` de Sistrix lee «Deine CTR» del GSC del cliente** — ver **F-12** y **S-01** en el principal. ⚠️ **El origen de su curva "Expected CTR" NO está documentado**: es **la pregunta más valiosa que queda abierta para una demo** (§ 12).

---

## 4.4 ⚠️ Moz — BORRADOR NO VERIFICADO

> 🔴 **Toda esta sección viene de un relevamiento que NO se pudo re-verificar** (moz.com bloquea el fetcher y se agotó el presupuesto de búsqueda). **Se registra como borrador, NO como hallazgo. Nada de acá se cita a un cliente.**

🔴 **El claim más fuerte es también el más riesgoso, porque es un NEGATIVO:**

> ⚠️ *"Moz no conecta Google Search Console en absoluto"* — plausible (su módulo de tráfico corre sobre GA4), **pero NO publicable sin verificación manual.**

Lo demás, igualmente sin verificar: **3 motores** · cadencia **semanal fija** · 🔴 **cero metodología publicada** — *el único de los grandes que no publica ninguna* · **sin selector de idioma/país documentado** · **AEO desde US$99** (Standard).

🏅 **Diferenciador real y difícil de copiar (si se confirma):** **cruza cada dominio citado por la IA con su grafo de enlaces** (Domain Authority / Spam Score **de las fuentes**) y filtra *"páginas donde tu marca NO se menciona"* para outreach. **Nadie más hace eso.** 🎯 **Es la idea más interesante del relevamiento y merece verificarse** — cualifica las fuentes en vez de contarlas.

---

## 4.5 Similarweb — el único con el eje de tráfico DESDE la IA

⚠️ **Refuta la hipótesis fácil de que "es panel, no prompts": son dos productos con dos métodos.**

| Producto | Qué mide | Método | Motores |
|---|---|---|---|
| ***AI Traffic*** | 🏆 **El tráfico que llega DESDE los asistentes** | Clickstream (**C**) | **7** |
| ***AI Brand Visibility*** | La aparición **DENTRO** de las respuestas | ⚠️ 🔴 **nunca declarado** | **4** |

🔴 **`AI Traffic` es el único producto del mercado con ese eje.** **Es una categoría de dato distinta, no un competidor equivalente** — ver **S-11** en el principal.

⚠️ **En `AI Brand Visibility` la frase es deliberadamente ambigua:** *"real-user … combined with large-scale analysis of AI prompts and responses"*. **`no verificado`.**

### 🏆 Publica una matriz país × LLM de ~249 países

**Nadie más publica ese nivel de detalle.** Y ahí está el dato duro:

| Mercado | Cobertura |
|---|---|
| 🔴 **Chile** | **SIN cobertura de Gemini** |
| 🔴 **España** | **SIN cobertura de Gemini** |
| **México · Colombia · Argentina** | ✅ los cuatro motores |

⚠️ **Cruza esto con § 2.5 (c):** en Chile **Gemini es el segundo asistente más usado** — y el producto que publica la matriz más detallada **no lo cubre ahí**. **Es el mejor ejemplo disponible de que la cobertura declarada y el mercado real no coinciden.**

**Precios:** **US$99 / US$399**.

---

## 4.6 Botify — el más transparente de su grupo, y el que ignora el español

**Método declarado, verbatim:** *"We use vetted third-party web scraping partners… For Perplexity, we currently use only the Perplexity API"*, con justificación: *"captures the full context, including system prompts and user memory"* `[V]`.

**Prompts de primera parte:** GSC + People Also Ask + categorías del sitio + CSV. **Cadencia semanal.** **Sin panel, sin clickstream.**

⚠️ **Discrepancia:** la página de producto dice **5 motores**, la doc de campañas sólo ofrece **ChatGPT y Perplexity** seleccionables `[C]`.

⚠️ 🔴 **Debilidad de idioma AUTO-DECLARADA: no se especifica el idioma en el envío**, lo que **puede provocar desajuste entre idioma del prompt y de la respuesta**. 🔴 **Cero mención de español o LatAm.**

**Sin API**, y *"not currently planned"*.

---

## 4.7 Yext (Scout) — caja negra

> 🔴 **El más opaco de todos los relevados.**

Producto claro, motores amplios en el papel (incluye **Claude** y **mezcla superficies locales/mapas con LLMs**), y **cero** metodología, cadencia, geografía o idioma publicados. **Scout ni siquiera aparece en su documentación técnica.**

🎯 **Detalle revelador, y es citable:** en su propio blog, un ejecutivo dice *"We lack metrics, search volume, and data of really any kind"* y **recomienda al cliente armar su propio set de evaluación**. 👉 **Describen el problema sin describir su solución.**

🔴 **Tratarlo como caja negra hasta tener demo o RFI.**

---

## 4.8 Enterprise: Conductor · BrightEdge · seoClarity

| | **Conductor** | **BrightEdge** | **seoClarity** |
|---|---|---|---|
| **Forecast de clics** | ❌ **No existe el producto** | ✅ Curva **propietaria**, origen **no divulgado** | ✅ 🔴 **Curva de CTR del GSC del propio cliente** |
| **Método AEO** | **API oficial** declarado | 🔴 **No divulgado** | **UI scraping** declarado |
| **Precio publicado** | Tiers sin cifras | 🔴 Nada | ✅ **US$2.500–4.500/mes** |
| **Español / LatAm en AEO** | 🏆 **Tabla país × idioma pública** (MX, CL, CO, PE, AR, ES) | **no verificado** | **no verificado** |

### (a) 🔴 seoClarity documenta la curva de CTR del cliente — y la vende

> *"Google Search Console (GSC) is the only source of valid CTR data in the world for any company"* `[V]`

Permite configurar la curva desde el GSC del cliente, **segmentada mobile/desktop/brand/non-brand**.

⚠️ **Matiz que hay que decir completo:** también ofrece un **"CTR Index" genérico**. La curva del GSC propio es **una opción**; **cuál es el default: no verificado**.

🔴 Ver **F-12** y **S-01** en el principal — **y ahora son DOS los que leen el GSC del cliente** (seoClarity y Sistrix).

### (b) La guerra metodológica

**Conductor:** *"avoids the risks... associated with less reliable scraping methods that other AI visibility trackers use"* `[V]`.
**seoClarity:** *"APIs do not show what real users actually see"* `[V]`.
**Ambos auto-interesados — y por eso citables contra sí mismos.** Contexto completo en métodos § 2.3.

### (c) ⚠️ Dos grietas en el claim de Conductor — hallazgo propio

1. En su tabla de compatibilidad existe un motor llamado literalmente **"ChatGPT (Crawl)"**.
2. Rastrea **Google AI Overviews, AI Mode y Copilot**, que **no tienen API pública oficial**, sin explicar cómo.

**Lectura defendible:** API-first donde hay API, automatización en el resto, **sin declararlo**.

### (d) 🏆 El único que permite verificar cobertura LATAM antes de comprar

**Tabla país × idioma × motor**, **160+ países**: **MX / CL / AR / ES pleno**; **CO y PE sin Claude Sonnet**; **VE parcial**.

### (e) BrightEdge — el menos transparente

Método **no divulgado en 5 páginas revisadas** · lista de motores **inconsistente entre sus propias páginas (3/5/7)** `[C]` · su estimación de dificultad usa señales envejecidas — *"Twitter/Facebook shares and likes"* — **en una página viva en 2026**.

### (f) Precios de terceros

Usar **el widget de Vendr, NO su prosa generada por IA**, que se autocontradice. Vintage **feb–jul 2026**, marca `[V]` de terceros:

| Producto | Mediana reportada |
|---|---|
| **BrightEdge** | **US$50.000/año** (n=46) |
| **Conductor** | **US$49.510/año** |
| **seoClarity** | **US$33.969/año** — 🔴 **converge con su tier publicado: la señal más sólida del set** |

### (g) Lo que ninguno de los tres hace

🔴 **Ninguno publica metodología en sentido estricto** — ni tamaño de muestra, ni intervalos de confianza, ni protocolo de validación. **Publican posiciones.**

🔴 **Doble filo:** por el criterio independiente de la categoría (red flag #1 = *"No raw answer access"*), **Conductor SÍ da acceso al texto completo de la respuesta y a las fan-out queries** — pasa la red flag. **Nosotros pasamos ésa y fallamos la de muestreo.**

**Y aportó el mejor dato de reproducibilidad de intención de compra:** Conductor, 14.000 llamadas API — de diez marcas, **sólo cuatro aparecieron en ambas corridas** `[I]` (métodos § 6.1).
