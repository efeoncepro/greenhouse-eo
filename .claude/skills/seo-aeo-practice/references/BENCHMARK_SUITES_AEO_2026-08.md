# BENCHMARK — Suites SEO y pure-plays AEO frente a nuestro motor

> **Tipo:** referencia de inteligencia competitiva verificada. **Es el archivo principal de un set de cuatro.**
> **Levantado:** 2026-08-15. Fuentes primarias vía fetch directo a páginas de producto/precio y una llamada directa a la API oficial de Semrush.
> **Ampliado el mismo día** con cinco lanes que llegaron después: enterprise, cobertura es-LATAM, consolidación del mercado, métodos y reproducibilidad. El archivo se **reestructuró y se partió** por volumen.
> **Caduca: 2026-11-15** (un trimestre). Este mercado se reescribe cada trimestre — en el último año Adobe compró Semrush, Sitecore compró Scrunch, Profound llegó a unicornio, Semrush abrió 17 mercados LATAM y Ahrefs publicó Brand Radar.
> **Motivo de existencia:** en una sesión de trabajo se afirmaron **dos ventajas competitivas falsas**. Este documento existe para que eso no vuelva a pasar. **Hoy la lista de afirmaciones prohibidas va en catorce.**

---

## § 0. Cómo leer esto

### 0.1 Los cuatro archivos

| § | Contenido | Archivo |
|---|---|---|
| **0** | Cómo leer esto · convención de confianza | **este** |
| **1** | **Consolidación del mercado** — M&A, valuaciones, quién sobrevive | **este** |
| **2** | **Los cuatro métodos** · la guerra metodológica · **construir vs comprar** | [`BENCHMARK_METODOS_TRANSPARENCIA_2026-08.md`](BENCHMARK_METODOS_TRANSPARENCIA_2026-08.md) |
| **3** | **Pure-plays** — fichas + long tail + 🔦 Cloudflare | [`BENCHMARK_VENDORS_PUREPLAYS_2026-08.md`](BENCHMARK_VENDORS_PUREPLAYS_2026-08.md) |
| **4** | **Incumbentes** — Semrush, Ahrefs, Sistrix, Similarweb, Botify, Moz, Yext + enterprise | [`BENCHMARK_VENDORS_INCUMBENTES_2026-08.md`](BENCHMARK_VENDORS_INCUMBENTES_2026-08.md) |
| **5** | **Transparencia metodológica** — el censo de 72 vendors | [`BENCHMARK_METODOS_TRANSPARENCIA_2026-08.md`](BENCHMARK_METODOS_TRANSPARENCIA_2026-08.md) |
| **6** | 🔴 **Reproducibilidad** — *la sección más importante del set* | [`BENCHMARK_METODOS_TRANSPARENCIA_2026-08.md`](BENCHMARK_METODOS_TRANSPARENCIA_2026-08.md) |
| **7** | **Precios** | [`BENCHMARK_PRECIOS_LATAM_2026-08.md`](BENCHMARK_PRECIOS_LATAM_2026-08.md) |
| **8** | **LatAm y español** | [`BENCHMARK_PRECIOS_LATAM_2026-08.md`](BENCHMARK_PRECIOS_LATAM_2026-08.md) |
| **9** | 🔴 **Lo que este benchmark descubrió sobre NOSOTROS** | **este** |
| **10** | 🔴 **Lo que NO podemos decir (F-01…F-14) y lo que SÍ (S-01…S-11)** | **este** |
| **11** | **Errores que circulan y hay que desmentir** | **este** |
| **12** | **Huecos** | **este** |

### 0.2 🔴 Regla dura de uso

> **Antes de decirle a un prospecto qué hacemos nosotros que la herramienta no hace, se lee la § 10.**

| Situación | Qué se lee |
|---|---|
| *"me compro Semrush y lo hago yo"* | § 10 completa, después `modules/07_DISPLACEMENT.md` § 2 |
| Vas a escribir una diapositiva con un diferenciador técnico | § 10 entera. **Nada fuera de S-01…S-11 se escribe.** |
| Te preguntan por precio de la competencia | § 7 |
| Te preguntan si medimos "ChatGPT" | § 10, **F-04** |
| 🔴 Vas a citar cobertura LATAM o "medimos desde Chile/México" | **§ 8 completa**, después **F-09, F-11** |
| El prospecto evalúa Conductor, BrightEdge o seoClarity | § 4.8 |
| Vas a hablar de la curva de CTR propia | **F-12 antes que S-01**, y **S-09** para la versión precisa |
| Vas a prometer robustez, estabilidad o reproducibilidad | 🔴 **§ 6 y después § 9** |
| Vas a citar una cifra de mercado que viste en un blog | **§ 11** — hay fabricaciones demostradas |
| El cliente tiene el sitio detrás de Cloudflare | 🔦 **§ 3.13 — cambia el default el 2026-09-15** |

### 0.3 Convención de confianza

🔴 **Es la distinción más importante del set. Casi todo lo que sabemos de la competencia es lo que ella dice de sí misma.**

| Marca | Significado |
|---|---|
| `[V]` | **Claim del vendor.** Verificado como *dicho*, **NO** como *cierto*. Frente a un cliente se cita *"ellos declaran que…"*, **nunca** *"ellos hacen…"* |
| `[I]` | **Corroborado independientemente.** ⚠️ Con el asterisco de § 5.2: en esta categoría "independiente" casi siempre significa "por un competidor" |
| `[C]` | **Fuentes en conflicto.** Se registran ambas, **no se resuelve** |
| `no verificado` | **No se pudo establecer, y NO se rellenó.** Un hueco declarado vale más que una respuesta inventada |

**Marcas heredadas** del primer levantamiento, que siguen apareciendo en tablas: ✅ = verificado en fuente primaria *(que para un claim de producto sigue siendo `[V]`)* · ⚠️ = declaración del vendor o caveat · ❌ = no verificado / no publicado.

**Que un proveedor liste nueve motores no prueba que los mida bien. Tampoco prueba lo contrario.**

---

## § 1. La categoría se consolidó en 2026

### 1.1 M&A

| Operación | Monto | Fecha | Marca |
|---|---|---|---|
| 🔴 **Adobe compró Semrush** | **~US$1,9–2,0B**, **US$12,00/acción en efectivo** | Acuerdo **2025-11-18**, **cerrado 2026-04-28** | `[I]` |
| **Sitecore compró Scrunch AI** | **~US$225M** (Bloomberg; **Sitecore no lo confirma**) | Anunciado **2026-06-03** | `[C]` |

⚠️ **Dirección del trato de Adobe, porque circula al revés: Adobe compró Semrush, no Semrush a Adobe.** El **2026-06-17** lanzó **"Adobe Brand Visibility"**, uniendo Semrush con Adobe LLM Optimizer.

Scrunch tenía **US$15M Serie A y 500+ marcas** al momento de la compra `[I]`.

### 1.2 Capital

| Vendor | Ronda | Total | Marca |
|---|---|---|---|
| 🦄 **Profound** | **US$96M Serie C a US$1.000M** (Lightspeed, **2026-02-24**); antes US$35M Serie B (Sequoia, ago-2025) | — | `[I]` |
| **Bluefish AI** | US$43M Serie B (Threshold + NEA, ago-2025) | **US$68M** | `[I]` |
| **Brandlight** | US$30M Serie A (Pelion, **2026-02-12**) | **US$35,75M** | `[I]` |
| **Peec AI** | US$21M Serie A (Singular, **2025-11-17**) — **US$4M+ ARR, 1.300+ marcas** | **US$29M** | `[I]` |
| **Evertune** | US$15M Serie A (Felicis, ago-2025) | **US$19M** | `[I]` |
| **Otterly.ai** | 🔴 **Bootstrapped, US$0** — ~US$770K ARR, **7 personas** | US$0 | estimación Latka, **no auditada** `[C]` |

### 1.3 🔴 Cómo se lee esto comercialmente

**Tres lecturas, y ninguna es "hay que asustarse":**

1. **La categoría dejó de ser un experimento.** Cuando Adobe paga ~US$2B y Sitecore ~US$225M, la pregunta del cliente ya no es *"¿esto es real?"* sino *"¿quién me lo mide?"*. **Eso nos favorece: valida la categoría sin obligarnos a ser el medidor.**
2. **El capital NO compró método.** 🔴 **Bluefish levantó US$68M y su metodología completa es una frase; Brandlight US$35,75M y la suya también.** **No hay correlación entre financiamiento y transparencia** — y eso es exactamente el argumento de **S-03** y **S-10**.
3. ⚠️ **La continuidad del proveedor es criterio de compra.** **Otterly son 7 personas sin capital externo**; **Scrunch acaba de ser absorbida**. Se dice **sin ensañamiento** y recordando que **nosotros somos más chicos que Otterly**: no es un ataque, es un eje que el comité va a evaluar igual.

---

## § 9. Lo que este benchmark descubrió sobre NOSOTROS

> 🔴 **La sección más valiosa del set, y la que menos gusta leer.** El encargo era mirar a la competencia; **los hallazgos de mayor consecuencia no son sobre ellos.**
> 🔴 **Nada de esta sección es material comercial.** Es la lista de lo que hay que arreglar antes de que un evaluador técnico lo encuentre primero.

### N-01 🔴 Ninguno de nuestros cuatro adapters pasa ubicación geográfica — y reportamos el resultado como visibilidad de un mercado

**Verificado en código.** Ninguno de los cuatro adapters propios de `answer_engines` manda parámetro de ubicación:

```
src/lib/growth/ai-visibility/providers/openai-adapter.ts       → sin user_location
src/lib/growth/ai-visibility/providers/anthropic-adapter.ts    → sin ubicación
src/lib/growth/ai-visibility/providers/gemini-adapter.ts       → sin ubicación
src/lib/growth/ai-visibility/providers/perplexity-adapter.ts   → sin user_location
```

**Y aun así le reportamos a un cliente mexicano su visibilidad *en México*.**

🔴 **No es cosmético, y ahora hay número externo:** **97% de los sitios estadounidenses sin mención contra 51% de los de Ciudad del Cabo en la misma pregunta** `[I]` (§ 6.1). **La ubicación es la variable que más mueve el resultado.** Y **no se arregla con un proxy**: el modelo base no ve la IP, y con búsqueda web la ubicación es **un parámetro explícito** (§ 8.6).

⚠️ **Y duele más con contexto:** **Knowatoa, a US$59/mes, tiene idioma y ubicación configurables a nivel de cuenta, sitio Y pregunta.**

**Estado:** `ISSUE-158` (`docs/issues/open/ISSUE-158-grader-adapters-query-llms-without-geographic-location.md`), abierto **2026-08-15**, detectado **verificando este benchmark**. Familia: `ISSUE-152` · `TASK-1652`.

🔴 **Consecuencia inmediata: F-09 y F-11 quedan bloqueadas.** Mientras `ISSUE-158` esté abierta **no se habla de cobertura geográfica en ninguna dirección** — ni para reclamarla, ni para reprochársela a un competidor.

### N-02 🔴 Corremos N=1 mientras el estado del arte declarado es N=100 — y nuestra propia calibración pidió N≥3

| | Muestreo |
|---|---|
| **Evertune** | **100 por prompt** — 10.000 respuestas por categoría, **margen ±1 punto** |
| **Profound** | **1×/día**, con experimento de varianza publicado |
| **Nuestra calibración** (pedido interno, **no implementado**) | **N≥3**, con reporte `consistente`/`intermitente`/`ausente` y confianza, *"NO un punto único"* |
| **Nuestro motor** | 🔴 **N=1** |

**No estamos detrás del líder: estamos detrás de nuestro propio requisito escrito** (`GREENHOUSE_AI_VISIBILITY_GRADER_CALIBRATION_V1.md` § 5.bis).

🔴 **Y ahora hay evidencia externa de cuánto cuesta:** **56,9% de los dominios da un resultado distinto al re-medirse, con oscilación promedio de 30,8 puntos** `[I]`; **el 52% de las marcas en primer lugar cambia en el mismo prompt** `[I]` (§ 6.1).

⚠️ **Ojo con un consuelo falso:** el experimento de Profound dice que *"once a day already lands within about 2 percentage points of a 10×-a-day reading"*. **No nos cubre** — compara **dos cadencias, ambas repetidas**. **N=1 no es "una vez al día": es una corrida por medición.**

🔴 **Regla hasta que se implemente:** ningún material comercial afirma robustez, estabilidad ni reproducibilidad **de la medición**. Lo que sí tenemos es reproducibilidad **del cómputo** (**S-02**), y son cosas distintas.

### N-03 🔴 Medimos Perplexity, que en MX y CL no está en el top-5 de asistentes

**El mix de motores está optimizado para un mercado que no es el nuestro** (§ 8.5). Para LATAM, **ChatGPT + Gemini cubren casi todo lo observable**; **Perplexity es cobertura estadounidense**.

🎯 **No dice "saquemos Perplexity". Dice que el mix es una decisión de mercado y hoy no está tomada como tal** — se heredó del vocabulario anglosajón de la categoría.

⚠️ **Y no confundir con F-03:** contar motores sigue sin ser ventaja. Lo que cambia acá **no es cuántos, es cuáles**.

### N-04 🔴 No publicamos nuestra rúbrica — y HubSpot publica la suya, gratis

**HubSpot publica la única rúbrica completa del mercado**: Sentiment 40 + Presence Quality 20 + Brand Recognition 20 + Share of Voice 10 + Market Competition 10, con *"deterministic scoring with schema validation"*, **gratis, sin cuenta y con español de primera clase**.

**Nosotros publicamos siete dimensiones y pesos** — pero **no una rúbrica auditable al mismo nivel, ni intervalo de confianza** (que no tenemos, N-02).

🔴 **Es table stakes que no cumplimos, contra un producto gratuito, en nuestro idioma.** Y es incómodo porque **S-03 —la transparencia— es nuestro diferenciador más sólido**: hoy lo sostenemos comparándonos con quienes no publican nada, **no con quien publica mejor que nosotros**.

### N-05 🔦 El 2026-09-15 Cloudflare cambia el default y va a mover la visibilidad de clientes que no hicieron nada

**Desde esa fecha, los dominios nuevos bloquean por defecto los bots de Training y Agent en páginas con publicidad** (§ 3.13). 🔴 **El scoring de ningún vendor lo contempla — el nuestro tampoco.**

**Tres consecuencias:**

1. Un cliente puede **perder visibilidad sin cambiar nada de su sitio**.
2. 🔴 **Cualquier serie histórica que cruce esa fecha tiene un quiebre estructural de configuración de CDN, no de mercado.** **Incluidas las nuestras.**
3. 🎯 **Podemos avisarlo ANTES de que pase — hoy, 2026-08-15, todavía estamos a tiempo.** Es exactamente la clase de aviso que construye la credibilidad que la práctica dice vender, **y no cuesta nada**.

### N-06 🎯 El costo crudo de recolección dice dónde está nuestro valor — y no lo estamos contando

**10.000 respuestas/mes cuestan del orden de US$12–40 en recolección cruda** con DataForSEO (§ 2.4). **Cloudflare regala el eje de logs. HubSpot regala el score.**

> ### 🔴 Nuestro valor no puede estar en recolectar. Está en **curar el set, versionarlo y guardar la evidencia**.

🎯 **Y eso es exactamente lo que ya hacemos** —`prompt_pack_version`, `provider_policy_version`, `score_version`, `provider_observation`, el ciclo de revisión humana— **y no lo estamos contando así.** Es el único de los seis hallazgos que es **buena noticia**: el arreglo es de relato, no de código.

### Cómo se leen los seis juntos

**N-01 a N-03 dicen lo mismo: el motor está construido para una categoría descrita en inglés y para EE. UU., y lo vendemos en Chile y México.** **N-04 y N-05 son deuda de producto barata de saldar.** **N-06 es el activo que ya tenemos.**

🔴 **Regla de cierre:** **hasta que N-01 y N-02 tengan fix verificado, la venta se apoya en S-05, S-07 y S-10** —el límite declarado, el plan que la herramienta no da, y la transparencia— **y no en la calidad de la medición.**

---

## § 10. Lo que NO podemos decir · Lo que SÍ podemos decir

### 10.A Lo que NO podemos decir

> Cada entrada es una afirmación **prohibida** en material comercial, propuesta, diapositiva o conversación de venta, con el dato que la refuta.

#### F-01 🔴 *"Ninguna herramienta puede proyectar clics desde Search Console"* — **FALSO**

**Athena HQ** lista **GSC y GA4** entre sus integraciones nativas; **Profound** también tiene los dos. **seoClarity** comercializa *"SEO Forecasting"*. Conectar GSC es **table stakes**, no una frontera tecnológica. **Basta un contraejemplo para matar un "ninguna", y hay varios.**
**Lo que sí resiste está en S-09, y es mucho más chico y mucho más preciso.**

#### F-02 🔴 *"Las suites no miden el eje AEO con motor propio"* — **FALSO, y de forma aplastante**

**Semrush** trae seguimiento de prompts **incluido en el plan base** con **cadencia diaria** (50/100/200 por día según tramo). **Ahrefs Brand Radar** cubre 6 superficies. **Conductor, BrightEdge, seoClarity, Sistrix, Botify, Similarweb, Moz y Yext** tienen todos producto AEO nombrado.
**El error de fondo fue temporal: hace un año era cierto. Un dato de este mercado con más de dos trimestres es un pasivo, no un activo.**

#### F-03 🔴 *"Nuestros 5 motores son una ventaja de cobertura"* — **FALSO: estamos en la mitad de la tabla**

Goodie 11, Evertune 9–11, Profound 8–10, Athena 8–9, Otterly 7, Ahrefs 6, Peec 6, **nosotros 5**, Scrunch 5–6, HubSpot 3.
⚠️ **Y el conteo mismo no es confiable** (§ 3.0): Rankscale duplica cuenta mezclando modelos con productos, y dos lanes del mismo día dieron números distintos para los mismos vendors `[C]`.
**Contar motores es una carrera que ya perdimos y que además no importa. Lo que importa es cuáles (N-03).**

#### F-04 🔴 *"Medimos ChatGPT"* — **IMPRECISO, y nuestra propia arquitectura lo dice**

Medimos la **API de OpenAI con búsqueda web**, que **no es** el producto de consumo: *"do not assume ChatGPT consumer UI parity"* y *"Provider APIs are treated as measurable approximations of answer-engine behavior"* (`GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` § 8.2.1).

🔴 **Y ahora es peor que antes, porque hay consenso de mercado en contra:** **todos los vendors que explican su método coinciden en que la API no representa lo que ve el usuario** (§ 2.3) — Semrush *"not via any APIs of LLMs"*, Ahrefs *"publicly available web interfaces"*, Sistrix *"Crawling statt APIs"*. **La interfaz devuelve citaciones, enlaces y shopping que la API no reproduce.** Somos **método B** en los cuatro adapters propios.
**Agravante:** DataForSEO vende **LLM Scraper desde US$0,0012/página**: **la opción existe y no la usamos.**
**Se dice:** *"observamos el motor de OpenAI con búsqueda web activa"*.

#### F-05 🔴 *"Nuestro scoring determinista versionado de 7 dimensiones es diferenciador"* — **FALSO en la forma, y "determinista" se usa mal**

**(a)** La forma es común: **HubSpot es gratis y publica una rúbrica ponderada de 5 dimensiones sobre 100** (N-04). Difiere **la elección** de dimensiones, no su existencia.
**(b)** Nuestro scorer es una función pura: **eso hace reproducible el cómputo, no la medición** — la evidencia de entrada no es estable, y corremos **N=1** (N-02).
🔴 **Y el piso es físico:** por **invariancia de lote**, la salida varía **incluso a temperatura cero** (§ 6.2). **Nadie puede prometer determinismo de medición, nosotros tampoco.**

#### F-06 🔴 *"Nuestros pesos están calibrados"* — **FALSO, y lo dice nuestro propio código**

`scoring/config.ts`: los pesos son *"HIPÓTESIS calibrada"* y el spike *"NO los recalibró"*. El golden set son **8 casos**, *"estadísticamente demasiado chico"*; recalibrar sería *"overfitting puro"*.
**Se puede decir** que son explícitos, versionados y publicables. **No** que estén validados ni respaldados empíricamente.

#### F-07 🔴 *"El prompt set autorado y congelado es superior"* — **NO SOSTENIBLE; el mercado argumenta lo contrario**

**Ahrefs:** *"Powered by search-backed prompts, not synthetic ones"*, sobre 466M+ prompts mensuales `[V]`. **Evertune:** *"EverPanel, over 150 million real conversations"*. **Semrush:** **317M+ prompts reales de clickstream** — y **llama "sintético" a su propio motor de prompts generados**, que es literalmente lo que hacemos nosotros.
**Lo que sí resiste:** congelar y versionar hace **comparables las corridas en el tiempo**. Es ventaja de **comparabilidad**, no de **representatividad**.
🎯 **Y ahí sí hay un contraste real y ganable: Peec recalcula los históricos hacia atrás al cambiar un alias** (§ 3.5). **Nosotros no.**

#### F-08 🔴 *"Nosotros conectamos los datos propios del cliente y las herramientas de AEO no"* — **FALSO**

**Athena HQ** conecta GSC + GA4 + Shopify. **Profound** conecta **GA4 + GSC + logs de Cloudflare, Vercel, AWS, Akamai, Fastly, Netlify, GCP y WordPress** — más superficie de datos propios que la nuestra. **Gauge** conecta GA4 + GSC + Semrush. **Botify** parte de GSC. 🔦 **Y Cloudflare regala el eje de logs.**

#### F-09 🔴 *"Las herramientas no cubren LATAM"* — **NO SOSTENIBLE**

**Otterly** enumera **65+ países** con MX/CL/CO/AR/PE. **Evertune** declara 100+ países **con servidores en el país**. **Conductor** publica tabla país×idioma×motor. **Similarweb** publica matriz de ~249 países. **Semrush** nombró Chile en un release.
🔴 **Y el "nadie declara desde dónde consulta" ya no es cierto:** **2 de 14 sí** (Profound, Evertune).
⚠️ **Lo que sigue siendo cierto:** la geolocalización depende de **pasar el parámetro**, no de la IP. **Es la pregunta incómoda para un competidor — y la que hoy fallamos nosotros. Hasta cerrar `ISSUE-158`, no se usa.**

#### F-10 🔴 *"Medir esto es caro / difícil / requiere un motor propio"* — **FALSO**

**Gratis en HubSpot** (con rúbrica publicada y español de primera clase). 🔦 **Gratis en Cloudflare** para el eje de crawlers y tráfico referido. **US$29/mes con cadencia diaria en Otterly.** **US$0,0006 por consulta en DataForSEO**, o **US$0,0012/página** por la interfaz real. **Bright Data regala 5.000 registros/mes.**
🔴 **Y el número exacto:** **US$12–40 por 10.000 respuestas/mes.** **Todo argumento que dependa de la dificultad o el costo de obtener el número está muerto.**

#### F-11 🔴 *"Cubrir LATAM nos diferencia"* — **NO SOSTENIBLE, y hay contraejemplos verificables**

**Cuatro herramientas nombran los cinco mercados** (Evertune, Peec, Otterly, Semrush); **Otterly publica lista enumerable de 65+ países**; **Evertune declara ruteo por servidor en el país**; **Conductor y Similarweb publican tablas verificables antes de comprar**. **Nosotros no publicamos nada equivalente.**
**Se dice, y es más chico y más cierto:** *"autoramos el set de prompts en el idioma y el mercado del cliente, con revisión humana"* (**S-06**). **Autoría en el mercado ≠ cobertura de mercado.**
⚠️ **Y mientras `ISSUE-158` esté abierta, es la afirmación exacta que un evaluador desarma en una pregunta.**

#### F-12 🔴 *"La curva de CTR propia del cliente nos diferencia"* — **FALSO: dos vendors la leen del GSC del cliente**

**seoClarity:** *"Google Search Console (GSC) is the only source of valid CTR data in the world for any company"*, con la curva del GSC del cliente **segmentada mobile/desktop/brand/non-brand** `[V]`.
**Sistrix:** su **`CTR Potenziale` lee «Deine CTR» del GSC del cliente** `[V]`.
- ✅ **Buena noticia:** nuestra decisión (**TASK-1700**) coincide con la del enterprise que mejor argumenta el punto.
- 🔴 **Mala:** **no es exclusiva.** Se cae todo "el único", "nadie más", "a diferencia del mercado".
- ⚠️ **Matiz vivo:** seoClarity también ofrece un "CTR Index" genérico y **su default no está verificado** (H-01).
**La versión que SÍ resiste, y es mucho más precisa, está en S-09.**

#### F-13 🔴 *"Medir con motor propio nos diferencia"* — **FALSO**

**Semrush, Ahrefs, Botify y Sistrix también consultan los motores ellos mismos** — y **varios lo declaran explícitamente diciendo que NO usan la API del LLM**: Semrush *"not via any APIs of LLMs"*, Ahrefs *"the free, publicly available web interfaces"*, Sistrix *"Crawling statt APIs"* `[V]`.
🔴 **La ironía completa:** ellos scrapean la interfaz real y **nosotros consultamos la API** — el eje donde creíamos diferenciarnos es el eje donde varios están **metodológicamente por delante** (F-04, § 2.2).

#### F-14 🔴 *"Nuestro score se puede comparar con el de otra herramienta"* — **FALSO, y es un error de categoría**

**Dos hallazgos independientes lo prueban:**

1. **Semrush, en su propio Index: en Gemini el solapamiento entre marcas mencionadas y dominios citados baja hasta el 30%.** 👉 **Mención y citación son casi productos distintos, y cualquier score que los fusione lo esconde.**
2. **Evertune mide bajo conciencia no asistida** (la marca **no** se nombra en el prompt): eso es **recordación de marca**, no conteo de citaciones. **No es el mismo objeto que un score de menciones.**

🔴 **Nunca poner nuestro score al lado del de otra herramienta como si midieran lo mismo** — ni para ganar la comparación ni para explicar una diferencia. **Se explica que miden objetos distintos.** *(Y es una pregunta abierta de diseño para nuestro propio score: ver N-04.)*

---

### 10.B Lo que SÍ podemos decir

> Redactado como frase usable. **Nada de esta sección afirma exclusividad**, salvo **S-09**, que es un negativo y viene con su propia advertencia. Registro formal (usted/institucional) para material client-facing.

**S-01 — La curva de CTR.**
> *"La proyección de clics se calcula con la curva de CTR observada en la propia serie de Search Console de su dominio, no con una tabla de CTR de industria. Eso incorpora automáticamente cuánto están deprimiendo el CTR los AI Overviews en su sitio y su vertical."*
Verificable (`readOrgCtrCurve`). 🔴 **Sin adjetivos de exclusividad — F-12.**

**S-02 — Trazabilidad del score.**
> *"Cada corrida guarda la versión del set de prompts, el conjunto de motores consultados, la versión de la política de proveedores y la versión del score. Un puntaje publicado se puede explicar y recomputar: si cambió, sabemos si cambió por los pesos, por los prompts o por el mix de motores."*
Verificable: `grader_runs.requested_providers` + `prompt_pack_version` + `provider_policy_version` + `grader_scores.score_version`.
🎯 **Y ahora tiene un contraejemplo de mercado que lo hace valer: Peec recalcula los históricos hacia atrás al cambiar un alias.**

**S-03 — Transparencia del método.**
> *"Publicamos las siete dimensiones, sus pesos y el método. Puede auditar por qué su puntaje es el que es."*
🔴 **Sigue siendo el diferenciador más sólido**, pero con **dos precisiones que hay que hacer o se rompe en la repregunta:**
- **Conductor y seoClarity declaran su *método de captura*** (API vs scraping). **Declarar cómo consultas no es publicar cómo puntúas.**
- 🔴 **HubSpot publica una rúbrica mejor que la nuestra, gratis** (N-04). **No decir "somos los más transparentes".**
**Frase segura:** *"la mayoría de las herramientas de esta categoría no publica cómo calcula su puntaje — algunas declaran cómo consultan al motor, que es otra cosa"* — con `as-of 2026-08-15`. **La versión con números está en S-10.**

**S-04 — Evidencia cruda.**
> *"Cada hallazgo viene con el texto de la respuesta que lo originó. No le entregamos un número: le entregamos lo que el motor dijo de su marca, palabra por palabra."*
Verificable (`provider_observation`). **Contraejemplos nombrados: Conductor da acceso al texto completo y a las fan-out queries; ZipTie entrega capturas de pantalla; Peec traza cada métrica al chat guardado.**
🎯 **Lo que sí gana fuerza:** el criterio independiente pone *"No raw answer access"* como **red flag #1**. **Entregar el texto crudo no nos distingue, pero descalifica a quien no lo hace. Es pregunta para el competidor, no medalla nuestra.**

**S-05 — Honestidad del alcance.** *(Vende en esta categoría; no resta.)*
> *"Observamos los motores por sus APIs con búsqueda web activa. Es una aproximación medible del comportamiento del motor, no una réplica exacta de lo que ve un usuario en la aplicación de consumo. Se lo decimos antes de que lo pregunte, y está escrito en el informe."*
🔴 **Con el consenso de § 2.3 en la mano, esta frase pasó de ser prudente a ser obligatoria.**

**S-06 — Idioma y mercado.**
> *"El set de prompts se autora en el idioma y el mercado del cliente —es-CL, es-LATAM— pasa por revisión humana y recién ahí se congela y se versiona. Las corridas siguientes son comparables contra ese mismo set."*
🔴 **Frontera dura:** es **autoría en el idioma y el mercado**, **NO cobertura geográfica de la consulta** (N-01). **Nunca dejar que se lea como "medimos desde México".**

**S-07 — El argumento que de verdad gana.**
> *"El puntaje es un commodity: HubSpot lo regala con su rúbrica publicada, Cloudflare regala el análisis de crawlers, y hay herramientas que dan el score por 29 dólares al mes con actualización diaria. Le recomiendo que use una. Lo que no le da ninguna es el plan, ni quién lo ejecuta."*
🔴 **Es el único terreno donde la evidencia nos deja pisar firme**, y este benchmark lo refuerza con precio de piso (cero), de techo (US$50.000/año) y de costo crudo (US$12–40 por 10.000 respuestas). Refuerza `modules/07_DISPLACEMENT.md` § 2.

**S-08 — Urgencia en LATAM.**
> *"En Chile y Colombia `chatgpt.com` es el sexto sitio más visitado del país, y en México el octavo — por encima de donde está en Estados Unidos, que es el décimo. En Chile está sobre Emol, Mercado Libre y BioBioChile. Esto no es una tendencia importada que va a llegar: acá la penetración ya es mayor."*
Similarweb top-websites, datos julio 2026, act. 2026-08-01 `[I]`. ⚠️ **Es tráfico de sitio, no uso declarado de IA** — no convertirlo en "el X% de los chilenos usa IA" (§ 11).

**S-09 — 🎯 La versión precisa de la curva de CTR, y la única exclusividad que quedó en pie.**
> *"Nadie proyecta el alza de clics de un CAMBIO DE POSICIÓN usando la curva de CTR del propio Search Console del cliente. Las dos mitades existen en el mercado y no se juntan."*

**Por qué se sostiene:**
- **Sistrix** tiene la curva real del cliente, pero modela **optimización de snippet a posición constante**.
- **Ahrefs, Semrush y la `Trafficschätzung` de Sistrix** modelan **CTR-por-posición**, pero sobre **datos propios del proveedor**.

🔴 **Advertencia dura, y no es opcional: es un NEGATIVO — la clase de afirmación más fácil de equivocar y la que ya nos costó dos veces.** **Exige re-verificación a la fecha antes de cada uso comercial**, y se dice con `as-of`. **Si no puedes re-verificarla ese día, usa S-01 a secas.**

**S-10 — La transparencia, con números.**
> *"De 72 herramientas relevadas, sólo 6 publican una metodología verificable, y 34 afirman exactitud sin publicar tamaño de muestra ni fórmula. De ocho auditadas, dos publican intervalos de confianza. Y no existe ninguna evaluación de exactitud hecha por un tercero sin producto competidor — tampoco de nosotros."*
🔴 **La última cláusula no es opcional.** Es lo que convierte el dato en credibilidad en vez de en marketing. **Cerca del 70% del mercado vende una métrica inauditable.**

**S-11 — El eje que casi nadie tiene.**
> *"El tráfico que efectivamente llega a un sitio desde los asistentes es un eje distinto de la aparición dentro de las respuestas. Hoy sólo Similarweb lo mide entre las herramientas de visibilidad."*
🎯 **Si lo sumáramos, no estaríamos igualando a nadie: estaríamos entrando a una categoría casi vacía.** ⚠️ **Se dice como observación de mercado, NO como capacidad nuestra: hoy no lo tenemos.**

---

## § 11. Errores que circulan y hay que desmentir

> 🔴 **Esta sección existe porque la categoría está contaminada.** Todo lo de acá **se encontró publicado** y **es falso o no verificable**. **Filtrarlo en cualquier scan competitivo.**

### 11.1 Errores de bases de datos de inversión

| Circula | Realidad |
|---|---|
| *"Evertune fue adquirida por Impact Tech"* — **Tracxn y PitchBook** | 🔴 **Falso.** La fuente primaria describe una **alianza** con **inversión estratégica no divulgada** |
| *"Semrush adquirió Otterly"* | 🔴 **Falso.** Otterly **publicó una app en el Semrush App Center** |
| *"Daydream levantó un seed de US$50M"* | 🔴 **Es otra empresa.** Ese seed es de **Daydream de moda/comercio** (`daydream.co`, Julie Bornstein). La **agencia SEO** es `withdaydream.com` y levantó **US$15M Serie A**. ⚠️ **Y Daydream no es herramienta de monitoreo: es una agencia** |
| *"Semrush compró Adobe"* | 🔴 **Al revés: Adobe compró Semrush** (§ 1.1) |
| *"Sitecore confirmó US$225M por Scrunch"* | ⚠️ **El monto es de Bloomberg; Sitecore no lo confirma** `[C]` |

⚠️ **Dominio equivocado:** **Bluefish AI es `bluefishai.com`**. **`bluefish.ai` es un dominio parkeado en venta.**

### 11.2 🚩 Precios fabricados en granjas de contenido

**Casos demostrados:** un tier de seoClarity de *"~US$750/mes"* que **no existe** (mínimo real US$2.500), y *"BrightEdge: 2 Plans from US$1.000–US$12.500/month"* cuando **BrightEdge no publica planes**.

🔴 **Excluir de cualquier scan:** `costbench.com` · `checkthat.ai` · `crawlraven.com` · `authoritytech.io` · `saleshive.com` · `searchatlas.com` · `stackmatix.com` · `itqlick.com` · `saasworthy.com`.

⚠️ **Nota de coherencia:** `authoritytech.io` está en esa lista **y** es la fuente secundaria de una cita usada en F-05. Se mantiene **sólo** porque el argumento que sostiene (ruido entre muestras repetidas) **está respaldado independientemente** (§ 6.1). **No usarla como fuente única de ninguna cifra.**

⚠️ **Y para precios de terceros:** usar **el widget de Vendr, NO su prosa generada por IA**, que se autocontradice.

### 11.3 Cifras sin fuente que NO se usan

| Cifra | Por qué |
|---|---|
| *"México: 87,2% de internautas usó IA (GWI)"* | **La fuente devuelve 403** y **no está en DataReportal** |
| *"LATAM = 14% de las visitas globales a plataformas de IA"* | **Sin atribución** |

### 11.4 ⚠️ Cifras que el propio vendor contradice — citar siempre con superficie y fecha

- **Ahrefs**, el mismo día, en sus propias superficies: **466M / 405M / 271M** prompts `[C]`. Y **Brand Radar a US$398 / US$699 / US$199** `[C]`.
- **Brandlight**: **100+ / 33 idiomas y 140 países** entre sus propias páginas `[C]`.
- **BrightEdge**: **3 / 5 / 7 motores** según qué página mires `[C]`.
- **Profound**: *"150+ regiones / 30+ idiomas"* en marketing vs. **1 región / 1 idioma** en la pricing page hasta Enterprise. 👉 **Creerle a la pricing page.**

### 11.5 ⚠️ Contaminación por PR sindicado en LatAm

Artículos **casi idénticos** sobre *"las 5 agencias que dominan la visibilidad en IA en la región"*, **republicados literal** en medios mexicanos no relacionados —`noroeste.com.mx`, `elcontribuyente.mx`, `diario21.com.mx`— **arrastrando hasta la errata del original**.

🔴 **Es distribución pagada, y es en sí misma una táctica AEO.** Dos consecuencias: **filtrarla** en todo scan competitivo *(un competidor "citado en 3 medios" puede ser uno que pagó un cable)*, y 🎯 **usarla como dato**: en la región ya se está comprando presencia sindicada para alimentar a los motores.

---

## § 12. Huecos de investigación

| ID | Hueco | Por qué importa | Cómo se cierra |
|---|---|---|---|
| **H-01** | 🟡 **Parcial, en contra nuestra.** ¿Quién deriva la curva de CTR del GSC del cliente? **seoClarity y Sistrix sí.** Abierto: **¿es el default de seoClarity o sólo una opción frente a su "CTR Index"?** | Decide si podemos decir *"nosotros lo hacemos por defecto"* | Trial o demo con pregunta directa |
| **H-02** | GSC + proyección de clics en Semrush, Ahrefs, Moz y Sistrix | Sostiene o tumba **S-09** | URLs correctas de los help centers. **Falta presupuesto de WebSearch** |
| ~~H-03~~ | ✅ **CERRADO** — precios enterprise de terceros | — | § 4.8 (f) |
| **H-04** | 🟡 **Parcial.** Método de captura: **Conductor (API), seoClarity (UI), Semrush, Ahrefs, Botify, Sistrix, Peec, Rankscale declarados.** Abierto: **Athena, Goodie, Scrunch, Brandlight, Bluefish, BrightEdge, Moz, Yext** | Determina si su medición se parece más que la nuestra a la del usuario | Demo comercial. **La evasiva también es un dato.** Para Conductor, repreguntar por **"ChatGPT (Crawl)"** |
| **H-05** | 🟡 **Parcial.** Evidencia cruda: **Conductor, ZipTie y Peec sí.** Falta el resto | Sostiene o tumba **S-04** | Trials de Otterly (US$29) y Athena (gratis). **Costo casi nulo — hacerlo** |
| **H-06** | Cifras de precio de Peec AI | Tabla incompleta | Re-fetch con render de JS, o demo |
| **H-07** | Goodie y Yext sin metodología; **Moz sin verificar** | Celdas vacías | Reejecutar los lanes |
| **H-08** | 🔴 **Nuestro N=1** | La deuda más cara del set | **Abrir TASK.** Ver **N-02** |
| ~~H-09~~ | ✅ **CERRADO** — adopción MX/CL vía Similarweb | — | § 8.4 y 8.5. ⚠️ El *"% de internautas que usó IA"* **sigue sin fuente** |
| **H-10** | 🔴 **Nuestra geolocalización — `ISSUE-158`** | **Bloquea F-09 y F-11 en las dos direcciones** | `ISSUE-158` + `TASK-1652`. Ver **N-01** |
| **H-11** | 🔴 **Nuestro mix de motores para LATAM** | Medimos Perplexity; no priorizamos Gemini | Decisión de producto, no de copy. Ver **N-03** |
| **H-12** | **LLMPulse — la fuente devolvió 403** | Una herramienta del scan sin levantar | Reintentar el fetch o fuente secundaria marcada |
| **H-13** | **Cobertura AEO de seoClarity y BrightEdge en español/LatAm** | Conductor publica tabla; **estos dos no están verificados en ninguna dirección** | **No afirmar nada** hasta verificar |
| **H-14** | 🎯 🔴 **El test controlado del delta por ubicación — que NADIE ha publicado** | **Cero tests publicados** que corran el mismo prompt desde IP mexicana vs. estadounidense con el delta. **Hueco de todo el sector** | 🔴 **Podríamos publicarlo nosotros.** Mismo set con y sin `user_location`, delta con método. **Encaja con la tesis de transparencia como producto y sería el primer dato original de la categoría en español.** ⚠️ **Depende de cerrar H-10: hoy no tenemos con qué correr el brazo "con ubicación"** |
| **H-15** | **BrightEdge y Similarweb sin evaluar en un lane** (404 + presupuesto agotado) | Similarweb sí se cubrió en otro lane (§ 4.5); **BrightEdge queda flojo** | Reejecutar el lane de a uno |
| **H-16** | ⚠️ 🔴 **Moz completo y tres detalles de Ahrefs, NO verificados** — en especial (a) el **negativo** *"Moz no conecta GSC en absoluto"*, (b) los **tres precios de Brand Radar**, (c) la regla de **8 checks por query en Claude** | **Un negativo sin verificar es la clase de error que ya nos costó dos veces** | Verificación manual. 🔴 **Nada de esto se cita a un cliente hasta entonces** |
| **H-17** | 🎯 **Origen de la curva "Expected CTR" de Sistrix — no documentado** | **La pregunta más valiosa que queda abierta**: decide si S-09 sobrevive | Preguntarlo en una demo de Sistrix |
| **H-18** | Fecha de la adquisición de Datos por Semrush | Contexto de § 1.1 | Fuente primaria |
| **H-19** | Batch de YC y monto levantado por Athena HQ | Ficha incompleta | Fuente primaria |
| **H-20** | Financiamiento de Goodie AI | Ficha incompleta | Fuente primaria |
| **H-21** | 🔴 **Método de Scrunch (Sitecore) — no declarado en ningún lado** | **Un activo de US$225M sin método publicado** | RFI o demo. **La ausencia ya es el hallazgo** |

### Nota de método

**Primer levantamiento:** cuatro lanes paralelos **agotaron el presupuesto de búsquedas web (200/200) sin devolver informe**; lo verificado salió de **fetch directo a páginas primarias** y **una llamada a la API oficial de Semrush**.

**Segundo:** llegaron los lanes de **enterprise** y **es-LATAM**. **Tercero:** **consolidación de mercado, métodos, transparencia y reproducibilidad** — y obligaron a **partir el documento en cuatro archivos**.

🔴 **Las dos lecciones que se conservan:**

1. **Lanzar los lanes de a uno, no cuatro en paralelo.**
2. 🎯 **El lane que más valor devolvió no fue ninguno de los de la competencia, sino el que obligó a mirar nuestro propio código** (§ 9).
