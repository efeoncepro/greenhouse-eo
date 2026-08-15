# BENCHMARK AEO — § 2 Métodos · § 5 Transparencia · § 6 Reproducibilidad · Construir vs comprar

> **Archivo hermano de [`BENCHMARK_SUITES_AEO_2026-08.md`](BENCHMARK_SUITES_AEO_2026-08.md)** — índice, convención de confianza y uso comercial viven allá. **Este archivo no se cita solo: se lee después del § 0 del principal.**
> **as-of 2026-08-15 · caduca 2026-11-15.**
> 🔴 **Si sólo vas a leer una sección de todo el benchmark, que sea la § 6.** Es la que dice por qué el número que vende esta categoría —incluido el nuestro— es menos sólido de lo que aparenta.

---

## § 2. Sólo hay cuatro métodos, y casi nadie dice cuál usa

### 2.1 Los cuatro

| Método | Qué es | Quién lo usa **verificablemente** |
|---|---|---|
| **A. Automatización de la UI de consumidor** | Navegadores headless o reales sobre `chatgpt.com` y equivalentes. Captura **citaciones, enlaces y resultados de shopping** | Profound · Ahrefs · Peec (parcial) · Writesonic · ZipTie · Gauge · Sistrix · Botify (vía partners) |
| **B. API directa del modelo** | Barato y reproducible, **pero no es lo que ve el usuario** | Evertune (deliberado, para modelo base) · Otterly (**sólo Claude**, declarado) · Botify (**sólo Perplexity**) · revendedores de DataForSEO |
| **C. Panel de conversaciones licenciado / clickstream** | Conversaciones reales **compradas a terceros** | Profound (Prompt Volumes) · Semrush (Datos) · Evertune (EverPanel) |
| **D. Ingesta de logs / CDN de primera parte** | Crawlers de IA y tráfico referido **en tu propio sitio** | Profound · Peec · Otterly · Brandlight · Conductor · 🔦 **Cloudflare (gratis)** |

### 2.2 🔴 Por qué A vs B no es un detalle técnico

**La interfaz de consumidor devuelve citaciones, enlaces y resultados de shopping que la API no reproduce.** A la API le falta el **system prompt de consumidor** y el **comportamiento de navegación por defecto**.

👉 **Consecuencia dura:** un vendor que cotiza *"visibilidad en Claude"* midiendo `claude-3.5-haiku` por API **mide un objeto distinto al que ve un usuario de Claude**. No es una aproximación peor: es otra cosa. *(Caso concreto: Rankscale — § 3 en el archivo de pure-plays.)*

🔴 **Y aplica a nosotros sin atenuantes:** nuestros cuatro adapters propios son **método B** (§ 9, N-01 en el principal).

### 2.3 La guerra metodológica está declarada — y las citas son explotables porque son auto-interesadas

| Vendor | Cita verbatim | Marca |
|---|---|---|
| **Semrush** | *"Prompt responses are captured from real requests and not via any APIs of LLMs"* + *"We source billions of real prompts from AI search clickstream data"* | `[V]` |
| **Ahrefs** | *"All prompts run through the free, publicly available web interfaces"* — excepción declarada: **Claude sí por API, 8 checks por query** | `[V]` · el detalle de los 8 checks: **no verificado** (§ 12) |
| **Botify** | *"We use vetted third-party web scraping partners… For Perplexity, we currently use only the Perplexity API"*, y lo justifica: *"captures the full context, including system prompts and user memory"* | `[V]` |
| **Sistrix** | *"Im Gegensatz zu vielen anderen Tools nutzt SISTRIX automatisiertes Crawling statt APIs."* | `[V]` |
| **Conductor** | *"avoids the risks... associated with less reliable scraping methods that other AI visibility trackers use"* — **API-first** | `[V]` |
| **seoClarity** | Lo contrario: *"APIs do not show what real users actually see"* | `[V]` |

⚠️ **Tensión no resuelta en Semrush:** su Prompt Tracking corre **tus 25 prompts custom a diario** contra ChatGPT / AI Mode / Gemini, y **su KB no explica el mecanismo**. Declara no usar APIs de LLM para las respuestas capturadas, pero no dice cómo ejecuta los prompts custom. **`no verificado`.**

🎯 **La convergencia es el hallazgo, no la pelea.** Salvo Conductor, **todos los que SÍ explican su método coinciden en que la API del LLM no representa lo que ve el usuario.**

> ### Ése es el consenso técnico emergente de la categoría, y debería ser criterio de evaluación — también del nuestro.

### 2.4 🔴 Construir vs comprar: la capa de recolección es commodity y ya sabemos su precio

**Buena parte del mercado le compra al mismo puñado de proveedores.** DataForSEO, Bright Data, Oxylabs y SerpApi **revenden respuestas de IA**.

DataForSEO confirma **los dos carriles** en su propia página `[V]`:

| Carril | Producto | Precio |
|---|---|---|
| **B — API oficial** | LLM Responses, *"through official LLM APIs"* | **US$0,0006 + cargos del modelo** por request |
| **A — interfaz** | LLM Scraper, *"as they appear in supported interfaces"* | desde **US$0,0012/página** |
| — | LLM Mentions | **US$0,10** por request |
| — | AI Keyword Data | **US$0,01** por tarea |

**Bright Data regala 5.000 registros/mes.**

> ### 🔴 A esos precios, **10.000 respuestas/mes cuestan del orden de US$12–40 en recolección cruda.**

**Entonces, ¿qué venden los productos de US$189–800/mes por encima de eso?** Extracción de entidades · curaduría del set de prompts · almacenamiento de evidencia · dashboards · **y, en exactamente dos casos, un diseño estadístico defendible** (Evertune y Profound, § 6).

🔴 **Ésa es la línea real de hacer-o-comprar, y nos aplica a nosotros:** *nuestro valor no puede estar en recolectar.* Está en **curar, versionar y guardar evidencia** — que es lo que ya hacemos y no estamos contando (§ 9, N-06 en el principal).

⚠️ **Y la asimetría que nos toca como clientes:** la cobertura de DataForSEO **no es uniforme entre endpoints** — **LLM Mentions es *"United States and English only"* para ChatGPT**, mientras **LLM Scraper tiene 215 ubicaciones (MX `2484`, CL `2152`, CO `2170`, AR `2032`, PE `2604`) y 43 idiomas**, y **LLM Responses tiene `web_search_country_iso_code` pero ningún parámetro de idioma** `[V]`.

---

## § 5. Transparencia metodológica — el censo

### 5.1 🔴 Cerca del 70% del mercado vende una métrica inauditable

| Censo | Dato | Marca |
|---|---|---|
| Vendors relevados | **72** | `[I]` |
| Publican **metodología verificable** | 🔴 **6** | `[I]` |
| Afirman **cifras de exactitud sin publicar tamaño de muestra ni fórmula** | **34** | `[I]` |
| No afirman nada | 32 | `[I]` |
| De 8 vendors auditados, publican **intervalos de confianza** | 🔴 **2** | `[I]` |

> ### En un mercado donde **el número ES el producto**, cerca del 70% vende una métrica que nadie puede auditar.

### 5.2 ⚠️ El meta-hallazgo — y es un límite de este benchmark, no un detalle

🔴 **No existe ninguna evaluación de exactitud hecha por un tercero sin producto competidor.**

Toda la "evidencia independiente" que circula en la categoría viene de **rivales**: Writesonic, Profound, Trakkr, GetMint, EchoWi. **Eso incluye varias de las cifras de la § 6 de este mismo archivo.**

**Se dice así, completo:** *"la mejor evidencia disponible sobre la inestabilidad de estas mediciones la publican competidores entre sí; no hay auditor neutral en esta categoría — tampoco de nosotros."*

### 5.3 Tabla de transparencia

| Vendor | Corridas publicadas | API vs UI | Intervalo de confianza | Fórmula del score | Veredicto |
|---|---|---|---|---|---|
| **Evertune** | ✅ **100 por prompt** | ✅ **separados explícitamente** | ✅ **±1 punto** (±2 a nivel tópico) | ✅ publicada | 🏆 **Auditable** |
| **HubSpot** | ❌ | ❌ | ❌ | ✅ 🔴 **la única rúbrica publicada del mercado** — Sentiment 40 + Presence Quality 20 + Brand Recognition 20 + Share of Voice 10 + Market Competition 10, con *"deterministic scoring with schema validation"*. **Gratis, sin cuenta, y español de primera clase** | 🏆 **Auditable en scoring** |
| **Profound** | ✅ 1×/día **con experimento publicado** | ✅ UI declarada | ❌ | ❌ | Parcial |
| **Rankscale** | ✅ **derivables del crédito** | ✅ 🏅 **etiqueta cada superficie GUI vs endpoint** | ❌ | ❌ | Parcial |
| **Ahrefs** | ❌ | ✅ UI declarada | ❌ | ❌ | Parcial — **los disclaimers más honestos del mercado** |
| **Semrush** | ❌ | ✅ método sí | ❌ | 🔴 **score no** | Parcial |
| **Peec** | ❌ | ⚠️ UI declarada **y contradicha por canal** `[C]` | ❌ | ✅ sólo la de *Visibility* | Parcial |
| **Scrunch · Athena HQ · Goodie · Brandlight · Bluefish · SE Ranking · Nightwatch · Knowatoa · Trakkr · ZipTie · Conductor · seoClarity · Moz · Yext** | ❌ | ❌ | ❌ | ❌ | 🔴 **Inauditables** |

🔴 **Léelo en las dos direcciones.** Es el respaldo de **S-03** (la transparencia sí diferencia) **y** la vara contra la que fallamos: **nosotros publicamos siete dimensiones y pesos, pero no publicamos la rúbrica al modo de HubSpot, y no publicamos intervalo de confianza porque no lo tenemos** (§ 9 en el principal).

---

## § 6. Reproducibilidad — la sección más importante para nosotros

> Todo lo de acá está **medido de forma independiente, no por el vendor sobre sí mismo** — con la advertencia de la § 5.2: *"independiente" significa "por un competidor"*.

### 6.1 Los números

| Hallazgo | Dato | Marca |
|---|---|---|
| Dominios que dieron **resultado distinto al re-medirse** | 🔴 **56,9%**, con oscilación promedio de **30,8 puntos** (2.324 auditorías sobre 2.021 dominios, **14-may a 28-jul 2026**) | `[I]` |
| Writesonic, sobre **631.999 pares prompt-modelo** | 🔴 **"52% de las marcas en primer lugar cambian en el mismo prompt"** en ChatGPT. Y entre cuatro motores, **sólo el 3,8% de las fuentes aparece en los cuatro** | `[I]` |
| Conductor, **14.000 llamadas API** | Los prompts de **intención de compra** son los menos repetibles: de diez marcas, **sólo cuatro aparecieron en ambas corridas** | `[I]` |
| 🔴 **La ubicación sola mueve el resultado muchísimo** | **97% de los sitios estadounidenses sin mención** contra **51% de los de Ciudad del Cabo**, en la misma pregunta de categoría | `[I]` |

🔴 **Esa última fila es, literalmente, el argumento de `ISSUE-158`.** Es la evidencia externa de que consultar sin ubicación no es un detalle de configuración: **es la variable que más mueve el resultado**.

### 6.2 El piso es físico — invariancia de lote

**La carga del servidor cambia el tamaño del batch, así que la salida varía incluso a temperatura cero.** Y **ningún producto de chat de consumidor publica si implementa kernels batch-invariantes**.

👉 **No hay configuración del cliente ni prompt engineering que elimine esa varianza.** Sólo se puede **medir y reportar**, o **ignorar y fingir precisión**.

### 6.3 🔴 La conclusión citable

> ### Un vendor que corre cada prompt **una vez**, no publica intervalo de confianza y reporta visibilidad **con un decimal**, está reportando **ruido con falsa precisión**.

- **Profound** es el **único que publicó una descomposición de varianza**.
- **Evertune** es el **único que compra la reducción de ruido con 100 muestras**.

### 6.4 El experimento de frecuencia de Profound — el mejor dato público de la categoría

Profound publicó el **único experimento de frecuencia de corrida del mercado**: **1× vs 10× diario durante 14 días sobre 5.271 configuraciones** `[V]`:

- *"Once a day already lands within about 2 percentage points of a 10×-a-day reading"*
- **10 corridas bajan el ruido de citation share ~40%**
- Y el remate honesto: *"You can't measure your way past drift"*

⚠️ **Es auto-interesado** —justifica su propia elección de cadencia diaria— **pero es falsable y específico**, que es exactamente lo que le falta al resto. **Se cita reconociendo el sesgo.**

🔴 **Y léelo contra nosotros:** el experimento compara **1×/día contra 10×/día**. **Nuestro N=1 no es "1 vez al día": es una corrida por medición.** El experimento de Profound **no nos cubre** — mide la diferencia entre dos cadencias, ambas repetidas. Ver **§ 9, N-02** en el principal.
