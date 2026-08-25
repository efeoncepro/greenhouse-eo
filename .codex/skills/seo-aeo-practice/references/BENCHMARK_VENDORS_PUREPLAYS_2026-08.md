# BENCHMARK AEO — § 3 Pure-plays AEO/GEO

> **Archivo hermano de [`BENCHMARK_SUITES_AEO_2026-08.md`](BENCHMARK_SUITES_AEO_2026-08.md)** — índice, convención de confianza y uso comercial viven allá.
> **as-of 2026-08-15 · caduca 2026-11-15.**
> Los métodos A/B/C/D que se citan acá están definidos en [`BENCHMARK_METODOS_TRANSPARENCIA_2026-08.md`](BENCHMARK_METODOS_TRANSPARENCIA_2026-08.md) § 2.

---

## 3.0 ⚠️ Antes de la tabla: el conteo de motores no es un dato confiable

**Dos lanes de relevamiento del mismo día dieron cuentas distintas para los mismos productos** `[C]`:

| Vendor | Lane 1 | Lane 2 |
|---|---|---|
| Profound | 8 | 10 |
| Evertune | 9 | 11 |
| Athena HQ | 8+ | hasta 9 |
| Scrunch | 5 | 6 |

**No se resuelve el conflicto: se registra.** Y hay una explicación estructural, que es el hallazgo real — **Rankscale duplica la cuenta** mezclando *modelos* con los *productos que los contienen*, y **nadie normaliza esa distinción**. Contar "ChatGPT + GPT-4o" como dos motores es defendible y también es inflado, según qué se esté midiendo.

🔴 **Uso operativo:** **nunca cites el número de motores de un competidor como dato duro**, ni el nuestro como comparación. Refuerza **F-03** (contar motores es una carrera que ya perdimos **y que además no importa**).

---

## 3.1 Tabla base

| Herramienta | Motores declarados | Método (§ 2) | Muestreo | Datos propios del cliente | Marca |
|---|---|---|---|---|---|
| **Evertune** | 9–11 `[C]` | **B deliberado** — separa modelo base de producto | 🏆 **100 por prompt** — *"samples each prompt 100 times across every AI model"* | ❌ no declarado | `[V]` + metodología `[I]` |
| **Profound** | 8–10 `[C]` | **A** (score) + **C** (Prompt Volumes) + **D** (Agent Analytics) | 1×/día, **con experimento publicado** | 🏆 **GA4 + GSC + logs CDN + panel + UI** — el único con los cinco | `[V]`, experimento `[V]` falsable |
| **Athena HQ** | 8–9 `[C]` | ❌ **no divulgado** | ❌ | ✅ **GSC + GA4** (junto con Profound, los únicos dos) + Shopify, salidas a Tableau/Power BI/Looker | `[V]` |
| **Otterly.ai** | **7** (4 base; Claude/Gemini/AI Mode add-on pago) | ⚠️ **vago** — lo único declarado es *"Claude (API)"* (**B** en ese canal); el resto **no verificado** | ❌ | ✅ Agent Analytics (**D**), Looker Studio, **API pública + MCP + Claude Skill** | `[V]` |
| **Peec AI** | 6 | **A declarado** — *"advanced UI scraping… exactly as real users do"*, ⚠️ **contradicho por canal**: su propia API mapea `perplexity-1` a **API de Perplexity** | ❌ | ❌ no declarado | `[C]` |
| **Rankscale** | "17+" ⚠️ **duplica la cuenta** | 🏅 **etiqueta cada superficie GUI vs endpoint de modelo** | 🏅 **derivable del crédito** · cadencia **horaria → mensual** | ❌ | `[V]` |
| **Scrunch** (ahora **Sitecore**) | 5–6 `[C]` | 🔴 **no declarado en ningún lado** | ❌ | ⚠️ rastreo de bots/agentes sobre el sitio | `[V]` |
| **Goodie AI** | **11** — el más amplio reclamado (incluye **Amazon Rufus**) | 🔴 **cero metodología** | ~30 respuestas/prompt/mes ≈ diario (**inferido de su pricing**) | ❌ | `[V]` |
| **Brandlight** | ❌ no levantado | 🔴 **una sola frase** (§ 3.9) | ❌ | ✅ logs (**D**) | `[V]` |
| **Bluefish AI** | ❌ no levantado | 🔴 *"millions of data points"* y nada más | ❌ | ❌ | `[V]` |

---

## 3.2 Profound — el mejor capitalizado con método declarado

**US$96M Serie C a valoración de US$1.000M** (Lightspeed, 2026-02-24) `[I]`.

🔴 **Tres carriles distintos que NO hay que confundir** — y que su propio marketing presenta juntos:

| Carril | Qué es | Método |
|---|---|---|
| **(A)** Score de visibilidad | **Navegadores headless sobre la UI** | A |
| **(B)** Prompt Volumes | 🔴 **Panel licenciado a terceros, NO propio** | C |
| **(C)** Agent Analytics | Ingesta de logs CDN | D |

⚠️ **Su propio blog admite el límite del carril B:** *"there's always the risk that your panel lacks representativeness"* `[V]`. **Es una admisión citable.**

🏆 **Publicó el único experimento de frecuencia de corrida del mercado** — 1× vs 10× diario, 14 días, **5.271 configuraciones**. Detalle y lectura en el archivo de métodos, § 6.4.

**Precios:** Starter **US$99** (🔴 **sólo ChatGPT, 1 idioma, 1 región**) · Growth **US$399** (3 motores, **1 idioma, 1 región**) · Enterprise a medida.

⚠️ **Dos advertencias de cobertura, y son graves para nosotros:**

1. **"150+ regiones / 30+ idiomas" es sólo Enterprise**, y **contradice su propia página de marketing**. 👉 **Creerle a la pricing page, no al home.**
2. 🔴 **El panel cubre US / CA / IT / BR / DE / AU / ES / KR / FR / UK — sin México, sin Chile, sin Colombia.** **Su diferenciador estrella no cubre LatAm hispano.**

---

## 3.3 Evertune — el outlier metodológico

> 🏆 **Si el método es la prioridad de la conversación, éste es el vendor que hay que leer.** Es el único que hace lo que nosotros decimos que valoramos.

**US$15M Serie A** (Felicis, ago-2025), total **US$19M** `[I]`.

🔴 **Es el único que separa MODELOS de PRODUCTOS**, y lo dice explícito:

> *"Base model data is what a model knows from training. Consumer app data is what it says after running a live web search."* `[V]`

**Metodología publicada** `[I]`:

| | |
|---|---|
| Diseño | **100 prompts únicos × 100 repeticiones = 10.000 respuestas por categoría** |
| Margen de error | **±1 punto** (±2 a nivel tópico) |
| Score | Probabilidad de inclusión **ponderada por posición**, 0–100 |
| Condición de medición | 🔴 **Conciencia no asistida** — la marca **NO se menciona en el prompt** |

👉 **Eso lo convierte en un instrumento de recordación de marca más que en un conteo de citaciones.** Es una elección legítima y **mide otra cosa** que un contador de menciones. **No son comparables entre sí, y casi nadie lo advierte.**

⚠️ **EverPanel:** *"over 150 million real conversations"* — 🔴 **cómo se obtienen NO está declarado**, **`no verificado`**. **Para un activo sensible a privacidad, eso es un hallazgo, no un detalle.** Es la pregunta que se le hace en una demo.

**Precio:** Pro **US$800/mes**, **sin trial**.

🥈 **Cobertura:** **35+ idiomas y 100+ países**, nombra **México, Chile, Colombia, Argentina** y más — y **declara el mecanismo**: *"Prompts run in the selected language via servers located in the selected country"*. 🔴 **Es ruteo geográfico real, no un selector de idioma.** Ver § 8 en el archivo de precios y LatAm.

---

## 3.4 Otterly.ai — bootstrapped, y el mejor mapa LatAm enumerable

Viena. 🔴 **Bootstrapped, US$0 levantado**, **~US$770K ARR**, **7 personas** (estimación Latka, **no auditada** `[C]`).

⚠️ **Riesgo de continuidad para compromisos multi-anuales** — y es un argumento que se usa **con cuidado y sin ensañamiento**: 7 personas sin capital externo es un proveedor que un comité de compras enterprise va a cuestionar. *(Y conviene recordar que nosotros somos más chicos que eso.)*

**Método: vago.** Lo único declarado es *"Claude (API)"*. El resto **`no verificado`**.

🏆 **65+ países con lista pública enumerable**, y nombra **México, Chile, Colombia, Argentina, Perú, Ecuador, Uruguay, Panamá, Guatemala, Honduras y El Salvador**. 🎯 **Es honesto sobre sus huecos** (declara que Chequia y Hong Kong no tienen ChatGPT) — **el tipo de honestidad que nosotros decimos vender**.

**Precios:** Lite **US$29** · Standard **US$189** · Premium **US$489** — 🏅 **miembros ilimitados en todos los tiers**. Anual −15%. Enterprise desde US$1.000/mo.

**Tiene API pública + servidor MCP + Claude Skill.** ⚠️ **Relevante para nuestro contrato de Full API Parity: un pure-play de US$189/mes ya expone MCP.**

---

## 3.5 Peec AI — el respaldo independiente más fuerte, y una contradicción

Berlín. **US$21M Serie A** (Singular, 2025-11-17), total **US$29M**, **US$4M+ ARR, 1.300+ marcas** `[I]`.

**Declara método A:** *"advanced UI scraping technology to interact with AI models exactly as real users do"* `[V]`.

🏆 **Y recibió el respaldo independiente más fuerte de cualquier vendor del estudio:** una revisión independiente lo llama *"the clearest positive example, every aggregate metric traces down to the stored chats"* `[I]`.

⚠️ **Pero el claim general es falso como está enunciado:** **su propia API mapea `perplexity-1` a la API de Perplexity** `[C]`. **Es mixto por canal, no UI puro.** *(Mismo patrón que Ahrefs y Botify: todos scrapean salvo un canal, y ese canal es el que no declaran en el titular.)*

🔴 **Descalificante para LatAm: en Gemini sólo puede consultar desde Estados Unidos**, y los planes topan en **1–3 países**.

**Publica la fórmula de Visibility** — *menciones ÷ respuestas × 100* — **el único pure-play que publica una**.

⚠️ **Históricos no inmutables:** cambiar un alias **recalcula hacia atrás**. 🔴 **Eso rompe la comparabilidad temporal**, que es justo lo que nosotros vendemos con el prompt set congelado (**S-06**). **Es una pregunta letal en una evaluación comparada — y una que nosotros sí respondemos bien.**

---

## 3.6 Rankscale — el que deja calcular tu propio tamaño de muestra

Viena.

🏅 **Etiqueta cada superficie como GUI o endpoint de modelo**, lo que **hace visible la distinción API/UI en vez de esconderla**. **Es el gesto de transparencia más barato del mercado y casi nadie lo hace.**

⚠️ **Dos peros que se cancelan con el elogio:**

1. Su **"17+ engines" duplica la cuenta** (modelos contra productos que los contienen).
2. 🔴 **Su endpoint de Claude es `Claude 3.5 Haiku`** — un modelo **viejo y pequeño**. **Su número de "Claude" no es lo que ve un usuario de Claude** (§ 2.2 del archivo de métodos).

🏅 **Es el único donde puedes calcular tu propio tamaño de muestra:** la unidad de crédito es una **"answer" = 1 motor × 1 pregunta × 1 ocasión**. **Cadencia configurable de horaria a mensual.**

**Precio:** Pro **US$99** (1.200 créditos ≈ **4.800 answers**), 🏅 **términos ilimitados y todos los motores en todo tier pago**. ⚠️ **Claude quema ~8× el crédito base.**

⚠️ Reclama **"240+ países"** — **un número mayor a la cantidad de estados soberanos**, o sea **señal de marketing**; **sin lista publicada**.

---

## 3.7 Athena HQ — YC, integraciones sí, método no

Hasta **9 motores**, 🔴 **método no divulgado**.

✅ Verificado con **GSC + GA4** — junto con Profound, **los únicos dos**. También Shopify y salidas a Tableau / Power BI / Looker.

**Precios:** tier gratis real con **US$25 de crédito** · Starter **US$295** · Enterprise a medida.
🔴 **Multi-región y multi-idioma son SÓLO Enterprise.**

⚠️ Batch de YC y monto levantado: **no verificado** (§ 12).

---

## 3.8 Goodie AI — la cobertura más amplia reclamada, cero método

**11 motores**, el más amplio reclamado — **incluye Amazon Rufus**. 🔴 **Cero metodología.**

De su pricing se infiere **~30 respuestas por prompt/mes ≈ diario**.

🔴 **Aritmética que lo descoloca:** **US$399 por 3 motores es caro contra Otterly US$189 por 7.**

Financiamiento: **no verificado**.

---

## 3.9 Scrunch AI (ahora Sitecore) — un activo de US$225M sin método declarado

**Sitecore lo compró por ~US$225M** (Bloomberg; **Sitecore no lo confirma** `[C]`), anunciado **2026-06-03**. Tenía **US$15M Serie A** y **500+ marcas** `[I]`.

🔴 **Cómo obtiene las respuestas NO está declarado en ningún lado** — ni en su sitio ni en el comunicado de adquisición. **Para un activo de US$225M, es un hueco notable**, y es un dato de venta: *el comprador estratégico tampoco lo publicó.*

⚠️ **Su Agent Experience Platform NO es medición.** Sirve *"a parallel, lightweight version of your site"* a los agentes: **es la cosa medida, no el instrumento.** **No mezclar las dos capacidades al compararlo.**

**Precios:** Starter **US$250** · Growth **US$417**. **Personas como dimensión** (distintivo real).
🔴 **Geografía: no mencionada en ningún lado.**

**Su caveat honesto** (levantado en el lane anterior): sólo entrega resultados por país *"in AI platforms that support geolocated search"*, y advierte que *"English prompts for non-English markets often return English-centric sources"* `[V]`. **El español no se nombra.**

---

## 3.10 Brandlight — US$35,75M y una sola frase de metodología

**US$30M Serie A** (Pelion, 2026-02-12), total **US$35,75M** `[I]`.

🔴 **Su metodología completa es una sola frase:**

> *"We ask major AI engines thousands of questions from different viewpoints."* `[V]`

**Para una empresa que le vende *medición* a CMOs de Fortune 500, es un hueco sustantivo.**

⚠️ **`/pricing` da 404** (verificado). Su cobertura de idiomas **se auto-contradice entre sus propias páginas**: **100+ / 33 idiomas y 140 países** `[C]`.

---

## 3.11 Bluefish AI — el mejor capitalizado y el menos documentado

**US$43M Serie B** (Threshold + NEA, ago-2025), total **US$68M** `[I]`.

🔴 *"Bluefish analyzes millions of data points"* **es la divulgación completa**. `/pricing` **404**.

⚠️ **No compite en nuestro eje:** está orientado a **comercio agéntico** (Amazon Rufus, Agentic Commerce Protocol), **no a SEO**.

🎯 **Pero su eje sí es diferenciado y vale conocerlo:** **exactitud / verificación de marca** — marcar menciones *"inaccurate or harmful"*. **Nadie más lidera con riesgo de desinformación**, y es un ángulo que a un comité legal le importa más que un score.

⚠️ **Ojo con el dominio:** es **`bluefishai.com`**. **`bluefish.ai` es un dominio parkeado en venta** (§ 11 en el principal).

---

## 3.12 Long tail — sólo los datos duros

| Herramienta | Precio | Dato que importa |
|---|---|---|
| **ZipTie** | **US$69** | Hace 🏅 **capturas de pantalla como evidencia**. ⚠️ 🔴 **Lista 14 países y EXCLUYE México, Chile y Colombia** — sólo España y Brasil |
| **Knowatoa** | **US$59** | 🏅 🔴 **La mejor arquitectura de localización del mercado: idioma y ubicación configurables a nivel de cuenta, sitio Y pregunta.** Un producto de US$59 resuelve lo que nosotros tenemos abierto en `ISSUE-158` |
| **Nightwatch** | **€79** | ~**30 corridas/prompt/mes** derivables de sus cupos. ⚠️ Sus **"107.000+ locations"** son **rank tracking clásico, NO cobertura AEO** — su doc de AI/LLM sólo dice *"Location & Language — Target the market relevant to your tracking goals"*, sin enumerar países |
| **Trakkr** | — | **8 motores en todos los planes** |
| **Gauge** | **US$599** | GA4 + GSC + Semrush |
| **Writesonic** | — | **10 motores**. Publicó el estudio de 631.999 pares prompt-modelo (§ 6 en métodos) |
| **AmIOnAI** | — | 🔴 **Sólo 2 motores y los prompts están OCULTOS al usuario** — **el más débil del relevamiento** |
| **SE Ranking** | — | ⚠️ **AEO limitado a 7 mercados**: EE. UU., R. Unido, Canadá, Francia, Alemania, P. Bajos y **España**. 🔴 **Una marca chilena o mexicana no puede trackearse en su propio mercado.** Su *otro* producto (AI Overviews Tracker) sí lista 200+ países — **citarlo como cobertura AEO es un error de categoría** |
| **HubSpot AI Search Grader** | 🔴 **Gratis, sin cuenta** | **La única rúbrica publicada del mercado** + **español de primera clase**. Detalle en métodos § 5.3 |

---

## 3.13 🔦 Cloudflare AI Crawl Control — el tapado del relevamiento

> 🔴 **Sección propia porque es accionable para clientes, y porque tiene fecha.**

**Cloudflare regala —gratis, en todos los planes incluido el Free— el análisis de crawlers de IA y tráfico referido que seoClarity, Conductor, Peec, Otterly y Profound cobran:**

- **Tres categorías de tráfico:** Search / Agent / Training
- **API GraphQL**
- **Top paths**

### 🔴 Y el 2026-09-15 cambia el default

**Desde el 2026-09-15, los dominios nuevos bloquean por defecto los bots de Training y Agent en páginas con publicidad.**

👉 **Eso va a mover mecánicamente la visibilidad en IA de sitios que nunca optaron por nada** — y 🔴 **el scoring de ningún vendor lo contempla**.

**Tres consecuencias, y la tercera es la que vale plata:**

1. **Un cliente puede perder visibilidad sin haber cambiado nada de su sitio.** Un score que baje después de esa fecha puede no ser un problema de contenido.
2. **Cualquier serie histórica que cruce el 2026-09-15 tiene un quiebre estructural** que no es del mercado ni del cliente: es de configuración de CDN. **Eso incluye nuestras propias series.**
3. 🎯 **Podemos avisarlo ANTES de que pase.** Es el tipo de aviso que construye la credibilidad que la práctica dice vender — y **hoy, 2026-08-15, todavía estamos a tiempo**. Ver **§ 9, N-05** en el principal.
