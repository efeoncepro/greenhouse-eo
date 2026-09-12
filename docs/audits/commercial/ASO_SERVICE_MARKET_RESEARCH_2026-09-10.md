# ASO complementario a Search Visibility 360: investigación de mercado

> **Fecha de corte:** 2026-09-10 · **Preparado para:** Efeonce (Chile, México, Colombia, Perú)
> **Método:** WebSearch + WebFetch sobre fuentes primarias (Apple, Google, OpenAI, StatCounter, DataForSEO) y secundarias (vendors, agencias, prensa). Nada se tomó de memoria.
> **Procedencia:** informe de un subagente de investigación. La sesión principal volvió a abrir la fuente
> original de las afirmaciones que sostienen la oferta y las confirmó: las definiciones de fuentes de App
> Store Connect (App Store Search incluye Apple Ads; Web Referrer solo cuenta Safari en iOS), las de Play
> Console (Search = marca; Explore incluye búsquedas de categoría; hay dimensión de término de búsqueda),
> las localizaciones de App Store (sin español de Chile; CL/CO/MX/PE usan es-MX), las App Store tags (solo
> EE. UU., metadata en_US), el 70%/65% de Apple Ads (2022), las guías 2.3.7 y 3.2.2 de Apple, las políticas
> de ratings/reseñas y de metadata de Google Play, y los Custom Store Listings (hasta 50, un país por listing).
> El texto exacto de la guía 5.6.3 de Apple y las cifras de vendors quedan como están marcadas abajo.
> **Consumidores:** [`SEARCH_APP_VISIBILITY_EXTENSION_V1.md`](../../business-models/search-visibility-360/SEARCH_APP_VISIBILITY_EXTENSION_V1.md) ·
> skills `seo-aeo` (módulo 10) y `seo-aeo-practice` (módulo 14).

## Protocolo de marcado

| Marca | Significado |
|---|---|
| ✅ | Fuente primaria verificada: documento o anuncio oficial de Apple, Google u OpenAI, o dato publicado por la fuente original con metodología. |
| ⚠️ | Secundaria: vendor, agencia, blog o prensa, o cifra en la que coinciden ≥2 fuentes no originales. **Sirve solo como orden de magnitud.** |
| ❌ | No hay dato público, o la cifra circula sin fuente original localizable. |

**Regla de lectura:** cuando un vendor de ASO interpreta un anuncio, lo marco como **[INTERPRETACIÓN VENDOR]** y lo separo del **[ANUNCIO OFICIAL]**. Los vendors venden herramientas; sus predicciones tienden al dramatismo.

**Dos precisiones de método:**
- Varias páginas se leyeron con un modelo que resume. Las citas textuales que aparecen aquí provienen de ese extracto. Si una cifra va a ir en una propuesta comercial, conviene volver a abrir la URL y comprobarla.
- Algunas páginas de vendors no muestran fecha de publicación; en esos casos lo indico.

---

## 1. Taxonomía de servicios ASO en 2026

### 1.1 Qué venden las agencias de referencia

| Agencia | Líneas de servicio declaradas | Empaquetado | Marca / fuente |
|---|---|---|---|
| **Phiture** (Berlín) | Keywords y metadata · creative + A/B testing (nativo Apple/Google o terceros) · auditoría y estrategia · localización · CRO · gestión continua. Herramientas propias: **Catchbase** (pujas de Apple Ads) y **PressPlay** (A/B testing en Google Play con IA generativa). No menciona web-to-app ni GEO en la página de ASO. | *"one-time audit, a specific project, or an ongoing retainer"* | ⚠️ autodescripción del vendor · https://phiture.com/app-store-optimization/ (sin fecha visible) |
| **Phiture** (ChatGPT) | Vende evaluar si el ChatGPT App Directory "is the right fit for your product" dentro de sus servicios de ASO y estrategia de tienda. | Consultoría | ⚠️ https://phiture.com/asostack/chat-gpt-app-directory/ (2026-03-04) |
| **yellowHEAD** | Keywords/metadata · CRO de ficha · A/B testing (screenshots, íconos, mensajes) · localización · monitoreo de ratings y reseñas · **in-app events** · actualizaciones estacionales · **CPP** · ASO técnico · estudio creativo propio (2D, 3D, UGC, video). | 4 paquetes: **ASO Ongoing**, **CRO Service**, **Holistic Organic Service (ASO+SEO)** y **ASO Consultancy** (auditoría one-off + formación). En su blog se presenta como agencia "ASO UA SEO/GEO Creative". | ⚠️ https://www.yellowhead.com/app-store-optimization/ (sin fecha) · https://www.yellowhead.com/blog/ask-play-gemini-google-io-2026-aso-strategy/ (2026-06-16) |
| **SplitMetrics Agency** | "ASO Turnkey" (nuevos mercados, rankings, A/B/n testing con su stack) · **Apple Ads totalmente gestionado** con "KPI-based approach" hacia ROAS · servicio multicanal (Apple Ads, Google, YouTube, Meta, TikTok). | Servicio gestionado; Apple Ads orientado a KPI | ⚠️ https://splitmetrics.com/agency/app-store-optimization/ (vía buscador; sin fecha) |
| **Moburst** | ASO dentro de su división "Organic Awareness", junto a **SEO, AEO/AI SEO, CRO y PR**. | A medida. El formulario ofrece rangos de presupuesto desde "Up to $50,000"; no publica tarifas. | ⚠️ https://www.moburst.com/app-store-optimization/ (sin fecha) |
| **Gummicube** | SaaS DATACUBE (autoservicio) + programas Enterprise con equipo de ASO gestionado; Splitcube para testing. | SaaS + servicio gestionado | ⚠️ https://www.gummicube.com/app-store-optimization-service/ (vía buscador) |

**Una distinción que el mercado sí hace:** existen listas de agencias especializadas solo en juegos (⚠️ https://appagent.com/blog/best-aso-agencies-mobile-games/). Es señal de que el ASO de juegos es otro oficio (ver §3).

### 1.2 Mapa de líneas de servicio y la palanca oficial que las respalda

| Línea | Palanca oficial (✅) | Fuente primaria |
|---|---|---|
| Auditoría | — (práctica de agencia) | — |
| Keyword research / metadata | Apple indexa **título, subtítulo, campo de keywords (100 caracteres) y categoría primaria**. *"Search results are based on a number of factors, including text relevance... as well as user behavior (downloads, ratings and reviews, and more)."* | ✅ https://developer.apple.com/app-store/search/ |
| Creative: ícono, screenshots, video | App Review 2.3.3: los screenshots deben mostrar la app en uso. **WWDC26:** nuevos visuales de marca/estacionales en cabecera de ficha, resultados de búsqueda y Apple Ads, además de un **Asset Library** ("Coming this fall"). | ✅ https://developer.apple.com/app-store/review/guidelines/ · ✅ https://developer.apple.com/wwdc26/guides/app-store/ (junio 2026) |
| **Custom Product Pages (Apple)** | Hasta **70 CPP**. Desde 2025 se les pueden **asignar keywords** y aparecen en búsqueda orgánica en lugar de la ficha por defecto. Deep link por CPP (iOS 18+). | ✅ https://developer.apple.com/news/?id=gf6mgrs6 (2025-10-29) · ✅ https://developer.apple.com/app-store/custom-product-pages/ |
| **Custom Store Listings (Google)** | Hasta **50 CSL**, segmentables por país, estado del usuario (churned/lapsed), comprador, pre-registro, **keywords de búsqueda** y tráfico de Google Ads. *Un país solo puede estar en un CSL a la vez.* | ✅ https://support.google.com/googleplay/android-developer/answer/9867158 |
| A/B testing Apple (**Product Page Optimization**) | Ícono, screenshots y previews · hasta **3 tratamientos** · hasta **90 días** · Apple recomienda esperar **≥90 % de confianza**. | ✅ https://developer.apple.com/app-store/product-page-optimization/ |
| A/B testing Google (**Store Listing Experiments**) | Ícono, feature graphic, screenshots y descripciones (localizados) · hasta **2 variantes** · 1 experimento de gráficos por defecto o hasta 5 localizados en paralelo · confianza y MDE configurables · se detienen solos a los **6 meses**. | ✅ https://support.google.com/googleplay/android-developer/answer/6227309 |
| Ratings & reviews | Rating resumen **por territorio**, reseteable al lanzar versión · prompt in-app **hasta 3 veces en 365 días** · responder reseñas · el rating aparece en ficha y en resultados de búsqueda. | ✅ https://developer.apple.com/app-store/ratings-and-reviews/ |
| Localización | Ver §5 (no existe es-CL en App Store Connect). | ✅ ver §5 |
| **In-app events / LiveOps** | Aparecen en ficha, **en resultados de búsqueda (indexados)** y en Today/Games/Apps · hasta **10 publicados** y 15 aprobados · duración máxima **31 días** + 14 días de promoción previa. | ✅ https://developer.apple.com/app-store/in-app-events/ |
| Apple Ads | Disponible en **Chile, Colombia, México y Perú**. | ✅ https://ads.apple.com/app-store/countries-and-regions |
| Google App Campaigns | En Play Console, las visitas desde Google Ads caen en "Ads and referrals"; impresiones y conversiones se ven en Google Ads. | ✅ https://support.google.com/googleplay/android-developer/answer/9859173 |
| Web-to-app / deep links | CPP con deep link (iOS 18+) ✅. En el **storefront de EE. UU.** Apple permite botones y links externos de compra desde el 2025-05-01 por orden judicial; **no aplica a CL/MX/CO/PE**. | ✅ https://developer.apple.com/news/?id=9txfddzf (2025-05-01) |
| Descubrimiento con IA | Ver §8. | — |

### 1.3 Cómo lo empaquetan

- **Auditoría one-off o consultoría:** Phiture, yellowHEAD (ASO Consultancy) ⚠️.
- **Proyecto o sprint** (lanzamiento, nuevo mercado): Phiture ("a specific project"), SplitMetrics ("ASO Turnkey… scale to new markets") ⚠️.
- **Retainer continuo:** es el modelo dominante en todas las fuentes. Admiral Media afirma: *"Monthly retainers are the most common ASO engagement structure"*, con compromiso típico de 3 a 6 meses ⚠️ (vendor, sin metodología).
- **Performance / KPI:** aparece en **Apple Ads gestionado** (SplitMetrics: "KPI-based approach"), no en el ASO orgánico puro. **❌ No encontré ninguna agencia que publique ASO orgánico cobrado por resultado.**

### 1.4 ¿Hay agencias que venden ASO junto a SEO/AEO? Sí, y así lo cruzan

- **yellowHEAD — "Holistic Organic Service (ASO+SEO)":** promete *"Increase your visibility across all traffic sources"* ⚠️.
- **Moburst:** ASO dentro del mismo paraguas que SEO, AEO/AI SEO, CRO y PR ⚠️.
- **Agencias SEO de LATAM** (SEO en México, JRizo): ofrecen ASO como línea separada junto a SEO. No publican precios ni un cruce metodológico explícito ⚠️. https://www.seoenmexico.com/posicionamiento-aso/ · https://www.jrizo.com/servicios-seo/agencia-aso/
- **Puente técnico SEO↔ASO que sí respalda la evidencia:** Ask Play "draws from both Play Store descriptions and app websites". **Ojo:** esta descripción viene de yellowHEAD y AppTweak ⚠️ (https://www.apptweak.com/en/aso-blog/google-i-o-2026-aso-updates, 2026-06-03). El post oficial de Google que leí dice que Ask Play entiende *"the full context of a user's question"*, pero no detalla que use el sitio web ✅/❌. Si se confirma, el contenido web del cliente (el oficio de Search Visibility 360) alimentaría directamente una superficie de la tienda. **Hay que verificarlo antes de venderlo.**

---

## 2. Precios

### 2.1 Retainers y auditorías ASO (global)

| Dato | Rango | Marca / fuente |
|---|---|---|
| Retainer entry | USD 500–2.000/mes (5–15 h/mes, keywords + metadata de 1 plataforma + reporte) | ⚠️ Admiral Media, 2026-03-23 · https://admiral.media/aso-agency-pricing/. Autor declarado "AI Infrastructure Specialist"; **"No third-party research citations"**. |
| Retainer mid | USD 2.000–5.000/mes (iOS + Android, A/B de screenshots e ícono, competencia) | ⚠️ ídem |
| Retainer premium | USD 5.000–10.000+/mes (creative completo, multi-mercado, integración con UA pagada) | ⚠️ ídem |
| Auditoría / paquete de lanzamiento | USD 2.000–15.000 one-off | ⚠️ ídem. AppAgent publica un rango similar (2.000–15.000), según resumen del buscador; su página devolvió 403 y no pude verificarla. |
| Consultoría por hora | USD 75–250/h; freelancers fuera de EE. UU./Europa Occidental USD 25–60/h | ⚠️ Admiral Media |
| Phiture | Proyecto mínimo **USD 25.000+** | ⚠️ AppFollow blog, vía buscador; no está en la web de Phiture |
| yellowHEAD | Proyecto mínimo USD 5.000+ · USD 100–149/h · "standard pricing starts at $7,000" | ⚠️ Clutch y blogs, vía buscador |
| Gummicube | Sin tarifa pública; estimaciones de Clutch de USD 25.000–60.000+ por engagement | ⚠️ secundaria |
| Moburst | Solo rangos de presupuesto en el formulario (desde "Up to $50,000") | ⚠️ |

**Lectura:** la banda de USD 2.000–10.000/mes coincide en ≥2 fuentes secundarias, así que sirve como orden de magnitud. Ninguna tiene metodología.

### 2.2 Precios en LATAM

**❌ No encontré ninguna agencia ASO en Chile, México, Colombia o Perú con precios públicos.** Las que aparecen (SEO en México, JRizo, Actualízatec, Marketinet) solo piden cotización.

### 2.3 Herramientas: precio de entrada

| Herramienta | Entrada | Marca / fuente |
|---|---|---|
| **AppTweak** | Essential USD 79/mes · Grow 299 · Grow Plus 549 · Enterprise a medida | ⚠️ Capterra y otros agregadores; no leí la página oficial de precios |
| **MobileAction** | ASO Lite USD 15/mes · Basic 69 · Pro 239 · Enterprise a medida | ⚠️ resumen de buscador que incluye el blog del propio vendor; no leí la página de precios |
| **Appfigures** | Free · pago desde USD 9,99/mes hasta 1.399,99/mes | ⚠️ agregadores |
| **AppFollow** | Free; los agregadores se contradicen (Essential 179 vs Growth 99/mes) | ⚠️ **inconsistente**, verificar directo |
| **Sensor Tower** | Sin precio público; contrato anual. Mediana estimada ~USD 75.000/año (rango observado 29.500–115.460) | ⚠️ Vendr y agregadores de compras · https://www.vendr.com/marketplace/sensor-tower |

### 2.4 DataForSEO App Data API (✅: es la página de precios del propio proveedor)

**Endpoints:** para Google Play y App Store existen **Searches** (ranking de apps por keyword en la tienda), **Info** (ficha de la app), **Reviews**, **List** (listas/colecciones) y **Listings** (búsqueda en la base de fichas).

| Endpoint | App Store (standard / priority) | Google Play (standard / priority) |
|---|---|---|
| Info | USD 0,0006 por resultado / 0,0012 | 0,0006 / 0,0012 |
| Reviews | 0,00075 por 25 reseñas / 0,0015 | 0,00075 por **150** reseñas / 0,0015 |
| Searches | 0,0012 por 100 ítems / 0,0024 | 0,0012 por **30** ítems / 0,0024 |
| List | 0,0012 por 100 ítems / 0,0024 | 0,0012 por 100 ítems / 0,0024 |
| Listings (live) | USD 0,10 por tarea + 0,001 por ítem | 0,10 + 0,001 |

Fuentes: ✅ https://dataforseo.com/pricing/app-data/app-store · ✅ https://dataforseo.com/pricing/app-data/google-play. Standard ≈ 45 min, priority ≈ 1 min.

**Cobertura de países:**
- ✅ La lista de ubicaciones de App Data **Apple** (CSV del 2026-09-01) incluye **Chile (2152), Colombia (2170), México (2484) y Perú (2604)**. El CSV tiene 86 filas, aunque la documentación dice "105 results"; hay una discrepancia menor. https://cdn.dataforseo.com/v3/locations/locations_app_data_apple_2026_09_01.csv
- ✅ **Limitación importante:** *App Listings Search* y la *App Store Listings Database* funcionan **solo en EE. UU. (2840)** en Apple y en Google Play: *"data is currently available only for the United States"*. https://docs.dataforseo.com/v3/app_data-apple-locations/ · https://docs.dataforseo.com/v3/app_data-google-app_listings-search-live/
- ❌/⚠️ **Google Play por país:** el CSV de ubicaciones de Google (117.315 filas, incluye ciudades) superó el límite de lectura. Que tenga país a nivel CL/MX/CO/PE es probable, pero **no lo verifiqué**.
- ⚠️ **DataForSEO Labs App Store API:** USD 0,012 por tarea + 0,00012 por ítem, según resumen del buscador. **No verifiqué qué devuelve**: si trae volumen de búsqueda de keywords de tienda o solo rankings. **No asumir que DataForSEO entrega volumen de búsqueda de App Store.**

---

## 3. Comprador

**❌ No encontré ninguna encuesta con metodología publicada sobre quién compra o es dueño del ASO.** Lo único disponible es secundario:
- ⚠️ *"Most teams start with ASO as a shared responsibility, where a UA manager or product marketer handles it"*, y en 2026 predomina el modelo híbrido (in-house + agencia). Fuente: blogs de agencias (Moburst, M+C Saatchi Performance), sin datos.

**Perfil probable del comprador (inferencia, no dato):**
- **Mobile growth lead o head of growth:** dueño natural cuando la app es canal principal (fintech, delivery, retail app-first).
- **UA manager:** compra ASO cuando Apple Ads encarece o necesita CPP para campañas. Apple afirma que las CPP suben la conversión; ver §4.
- **Product marketing:** lanzamientos, localización y mensajes de ficha.
- **CMO:** en empresas donde la app es un canal más (banca, telco, aerolínea); probablemente lo compra junto con SEO.

**Disparadores de compra (inferencia):** lanzamiento o relanzamiento de la app · expansión a un país nuevo · caída de rating o crisis de reseñas · alza del costo de UA pagado · novedades de plataforma: keywords en CPP (2025), CSL por keyword con un clic (I/O 2026), Personalized Collections (WWDC26) · primera inversión en Apple Ads.

**Verticales donde el orgánico de tienda pesa (evidencia parcial):**
- ⚠️ Sensor Tower (2021): en apps **no-juego**, la búsqueda generó *"70 percent of installs in 2020"* en App Store. En juegos pesan más los referrals (≈38 %) que la búsqueda (≈35 %). https://sensortower.com/blog/app-store-download-sources-report-2021. Es un modelo de terceros sin metodología publicada y con datos de 2020.
- ❌ **No encontré cifras públicas por vertical para LATAM.** AppsFlyer tiene un informe "State of App Marketing in Spanish LATAM – 2025" (32 mil millones de instalaciones, 6.000+ apps) con capítulos de finanzas, e-commerce y gaming, pero los datos están detrás de descarga. https://www.appsflyer.com/resources/reports/state-app-marketing-latam/
- **Inferencia:** fintech y banca, retail y e-commerce, delivery, viajes y aerolíneas, telco, salud y medios tienen alta demanda de búsqueda de marca y de categoría. Allí la ficha, el rating y los CPP/CSL deciden conversión.

**Cuándo NO tiene sentido:**

| Caso | Por qué | Base |
|---|---|---|
| **Juegos** | Otro oficio: referrals, creative-driven, LiveOps. Hay agencias especializadas solo en juegos. | ⚠️ Sensor Tower 2021 · ⚠️ AppAgent |
| **Apps B2B internas o de distribución institucional** | Se distribuyen por Apple Business Manager o MDM (la fuente aparece como "Institutional Purchase" o "Unavailable"). No hay búsqueda pública que optimizar. | ✅ definición de fuentes de Apple (§7) + inferencia |
| **Volumen muy bajo** | PPO y Store Listing Experiments necesitan tráfico para llegar a la confianza recomendada (Apple sugiere ≥90 %). Con poco tráfico no hay tests concluyentes y el retainer no se paga solo. | ✅ docs de PPO/Experiments + inferencia |
| **Casi todo es paid UA** | El ASO orgánico aporta poco. Los CPP y el creative siguen importando porque suben la conversión de Apple Ads, así que conviene venderlo como CRO de ficha para paid, no como SEO de tienda. | inferencia |

---

## 4. Benchmarks

### 4.1 Porcentaje de descargas desde búsqueda (el famoso "65–70 %")

| Afirmación | Qué dice exactamente | Marca |
|---|---|---|
| **70 %** | *"70% of App Store visitors use search to discover apps"* | ✅ Apple Ads · https://ads.apple.com/app-store · nota al pie: **"App Store, worldwide, 2022"** |
| **~65 %** | *"Almost 65% of downloads happen directly after a search"* | ✅ misma página, misma nota: **"App Store, worldwide, 2022"** |

**Advertencias:**
1. El dato es de **2022** y se sigue citando en 2026 como si fuera actual.
2. Lo publica **Apple Ads para vender anuncios**. Es fuente primaria, pero con interés comercial.
3. "Después de una búsqueda" **incluye búsqueda pagada** (Apple Ads).
4. Son **dos métricas distintas** (visitantes que usan búsqueda vs descargas tras búsqueda). El "65–70 %" las mezcla.

| Otras cifras | Marca |
|---|---|
| Sensor Tower: 59 % de descargas de App Store desde búsqueda (2020); 70 % en no-juegos | ⚠️ tercero, sin metodología, dato viejo · https://sensortower.com/blog/app-store-download-sources-report-2021 (marzo 2021) |
| **Google Play: % de instalaciones desde búsqueda** | ❌ **Google no publica una cifra equivalente.** Además, en Play Console "Google Play search" solo cuenta **búsquedas de marca o navegacionales**; las de categoría cuentan como "Explore" (ver §7). Comparar iOS vs Android es inválido. |
| Apple Ads: *"average conversion rate of over 60%"* (tap-through → install, top of search) | ✅ Apple Ads · periodo nov-2024 a oct-2025 · es conversión de anuncios, no orgánica |

### 4.2 Conversión de ficha por categoría

- ⚠️ **AppTweak (EE. UU., año 2025; publicado 2026-05-18, actualizado 2026-08-20):** conversión promedio (vista de ficha → descarga) **8,56 % en App Store** y **16,15 % en Google Play**. "Install rate" en iOS (desde resultados de búsqueda o browse) de 3,8 %. Fuente: su propia herramienta de benchmarks, **solo EE. UU.** https://www.apptweak.com/en/aso-blog/average-app-conversion-rate-per-category
  - Mi lectura de la tabla por categoría fue parcial y no validé los valores, así que no los reproduzco. Los agregadores dan rangos de "~4 % en juegos a ~32 % en música", también ⚠️.
- ✅ **La fuente correcta para cada cliente son los benchmarks nativos:**
  - **App Store Connect** tiene *peer group benchmarks* de conversion rate (descargas ÷ impresiones únicas), retención D1/D7/D28, crash rate y monetización. Los grupos se arman por categoría, modelo de negocio y tramo de descargas, con **privacidad diferencial**; los datos de uso vienen solo de usuarios que aceptaron compartirlos. https://developer.apple.com/help/app-store-connect-analytics/benchmarks/peer-group-benchmarks/
  - **Play Console** ofrece *"per country conversion benchmarks"*. https://play.google.com/console/about/acquisitionreporting/
  - **❌ No hay benchmarks públicos de conversión por categoría para CL/MX/CO/PE.**

### 4.3 Impacto del rating en la conversión

| Cifra | Marca |
|---|---|
| "De 3 a 4 estrellas = +89 % de conversión" | ❌ **Fuente original no localizada.** Se atribuye a Apptentive. Una fuente secundaria afirma que proviene de una **encuesta de 2015 a 350 personas en EE. UU.** (intención declarada, no comportamiento). No pude verificar ni eso. **No usar en propuestas.** |
| "De 2 a 3 estrellas = +340 %" | ❌ misma familia (MarTech citando a Apptentive); sin fuente original verificable |
| "4,7★ convierte 15–25 % mejor que 4,0★", "apps >4,5★ convierten tap-through ~50 % vs <3,5★ <30 %" | ❌ circulan en blogs sin fuente original localizable |
| **Lo que sí es primario:** Apple muestra el rating resumen **en la ficha y en resultados de búsqueda**, por territorio, y *"user behavior (… ratings and reviews…)"* es factor de ranking | ✅ https://developer.apple.com/app-store/ratings-and-reviews/ · https://developer.apple.com/app-store/search/ |

### 4.4 Impacto de las Custom Product Pages

- ✅ **Apple:** *"2.5 percentage point increase on average when referring people to a custom product page… a 156% increase compared to the 1.6% average conversion rate on default product pages."* https://developer.apple.com/app-store/custom-product-pages/
  - Es una afirmación oficial, pero **Apple no publica periodo, muestra ni definición exacta** de ese 1,6 % en la página. Sirve para citar "según Apple", **no como expectativa para un cliente**.
- ⚠️ MobileAction (informe de benchmarks de Apple Ads): la conversión de CPP en Apple Ads pasó de 55,87 % (2024) a 47,57 % (2025). Hay cifras contradictorias entre sus propios informes. https://www.mobileaction.co/report/apple-ads-2026-benchmark-report/ad-variations-using-custom-product-pages/
- ⚠️ Casos (CBS Sports +20 %, SoundCloud +58 %): testimonios de vendor.
- **❌ No hay datos públicos del impacto de CPP con keywords en búsqueda orgánica.** La función es de 2025.

---

## 5. LATAM

### 5.1 Cuota iOS vs Android, agosto 2026 (✅ StatCounter)

| País | Android | iOS | Fuente |
|---|---|---|---|
| Chile | 70,3 % | 29,68 % | https://gs.statcounter.com/os-market-share/mobile/chile |
| México | 66,03 % | 33,96 % | https://gs.statcounter.com/os-market-share/mobile/mexico |
| Colombia | 75,36 % | 24,64 % | https://gs.statcounter.com/os-market-share/mobile/colombia |
| Perú | 82,32 % | 17,67 % | https://gs.statcounter.com/os-market-share/mobile/peru |

**Caveat metodológico:** StatCounter mide la **cuota de páginas vistas en la web** por sistema operativo móvil. No mide parque instalado, descargas ni gasto. Aun así, el orden es claro: **Google Play pesa más en los cuatro países** (sobre todo Perú y Colombia), mientras que la mayoría de las novedades de descubrimiento con IA de Apple son solo EE. UU. (ver §8).

### 5.2 Agencias ASO en LATAM

⚠️ SEO en México (CDMX, Monterrey, Guadalajara y otras), JRizo (MX, PE, CO, CL), Actualízatec y Marketinet ofrecen ASO **como línea anexa a SEO**. **❌ Ninguna publica precios.** **❌ No identifiqué ninguna agencia LATAM de ASO de referencia** comparable a Phiture o yellowHEAD, ni ninguna que ofrezca ASO + AEO/GEO integrado en español. Es un posible espacio abierto, aunque es inferencia.

### 5.3 Storefront e idioma

**App Store:**
- ✅ App Store Connect ofrece **solo Spanish (Mexico) y Spanish (Spain)**. **No existe es-CL, es-CO ni es-PE.**
- ✅ **Spanish (Mexico) es el idioma por defecto** en Chile, Colombia, México, Perú y el resto de LATAM hispana. https://developer.apple.com/help/app-store-connect/reference/app-information/app-store-localizations/
- **Inferencia importante:** como la metadata va por localización y no por país, **la ficha de Chile y la de México comparten el mismo texto es-MX**. Para diferenciar chilenismos o keywords locales no alcanza la metadata. Habría que usar CPP (asignados a keywords, no a países) o creative, y conviene verificarlo en una cuenta real.
- ⚠️ **Indexación cruzada:** MobileAction (2026-04-15) afirma que en CL, MX, CO y PE se indexan **Spanish (Mexico) + English (UK)**, lo que duplicaría el espacio de keywords. **Ellos mismos aclaran:** *"Apple does not describe keyword indexing behavior… based on industry observation."* https://www.mobileaction.co/blog/app-store-cross-localization/

**Google Play:**
- ⚠️/✅ Play Console soporta **es-419 (Spanish Latin America), es-ES y es-US**. El dato viene de un resumen del buscador sobre la tabla oficial, que no leí directamente. https://support.google.com/googleplay/android-developer/table/4419860
- ✅ **Custom Store Listings por país** (hasta 50, un país por CSL) permiten diferenciar Chile de México en Play, cosa que el App Store no permite con metadata.

---

## 6. Riesgos y black-hat

### 6.1 Apple — App Review Guidelines (✅ https://developer.apple.com/app-store/review/guidelines/)

- **Introducción:** *"If we find that you have attempted to manipulate reviews, inflate your chart rankings with paid, incentivized, filtered, or fake feedback, or engage with third-party services to do so on your behalf, we will take steps to preserve the integrity of the App Store, which may include expelling you from the Apple Developer Program."* Esto alcanza explícitamente a las agencias que lo hagan "on your behalf".
- **2.3.7 — keyword stuffing:** *"don't try to pack any of your metadata with trademarked terms, popular app names, pricing information, or other irrelevant phrases just to game the system… Apple may modify inappropriate keywords at any time."*
- **2.3.3:** los screenshots deben mostrar la app en uso. Esto choca con la táctica de meter keywords en texto dentro de los screenshots; los nuevos visuales de marca de WWDC26 son un canal aparte.
- **3.2.2(x):** prohíbe *forzar* a calificar, reseñar o descargar otras apps para acceder a funcionalidad. **3.2.2(iii):** prohíbe inflar artificialmente impresiones o clics de anuncios. **3.2.2(vii):** prohíbe manipular el ranking en otros servicios.
- **5.6.3 Discovery Fraud:** *"Manipulating any element of the App Store customer experience such as charts, search, reviews, or referrals to your app erodes customer trust and is not permitted."* El texto vino por buscador citando la página oficial; mi lectura directa se truncó antes de §5.6, así que conviene verificar la redacción exacta.

### 6.2 Google Play (✅)

- **User Ratings, Reviews, and Installs:** *"Developers must not attempt to manipulate the placement of any apps on Google Play… inflating product ratings, reviews, or install counts by illegitimate means, such as fraudulent or incentivized reviews and ratings, or incentivizing users to install other apps as the app's main functionality."* Ejemplos: pedir rating a cambio de un incentivo (p. ej., un descuento), enviar ratings haciéndose pasar por usuarios, y reseñas con cupones, links o códigos. https://support.google.com/googleplay/android-developer/answer/9898684
- **Metadata:** título ≤30 caracteres · sin *"repetitive or unrelated keywords"* · sin "#1", "Best of Play", "Popular" ni premios en íconos o texto · sin precios ni promociones ("10% off", "free for limited time") en ícono, título o nombre del desarrollador · sin emojis ni MAYÚSCULAS salvo marca. https://support.google.com/googleplay/android-developer/answer/9898842
- La página de política **no detalla sanciones**. Históricamente Google habló de filtrar la app de los rankings o retirarla (⚠️ blog de 2017, visto solo vía buscador: https://android-developers.googleblog.com/2017/06/google-plays-policy-on-incentivized.html).

### 6.3 Escala real de la aplicación (✅ datos oficiales 2025)

| | Apple (newsroom, 2026-05-20) | Google (blog, 2026-02-19) |
|---|---|---|
| Ratings/reseñas fraudulentas bloqueadas | ~**195 millones** | **160 millones** de "spam ratings and reviews" (infladas y desinfladas) |
| Manipulación de búsqueda y charts | ~**7.800** apps bloqueadas de resultados de búsqueda + **11.500** de charts | Evitó una caída promedio de **0,5★** en apps atacadas por *review bombing* |
| Cuentas de desarrollador | **193.000** terminadas + 138.000 inscripciones rechazadas | **80.000+** cuentas baneadas |
| Otros | 2 millones+ envíos rechazados; ~59.000 apps removidas por *bait-and-switch* | 1,75 millones de apps que violaban políticas impedidas |

Fuentes: https://www.apple.com/newsroom/2026/05/the-app-store-stopped-over-2-point-2-billion-usd-in-fraudulent-transactions-in-2025/ · https://blog.google/security/keeping-google-play-android-app-ecosystem-safe-2025/

**Implicancia comercial:** las *install farms* y las reseñas compradas se detectan a escala de cientos de millones. El riesgo cae sobre la cuenta del **cliente** (expulsión del programa). Un contrato de ASO serio debería prohibir por escrito incentivos, compra de instalaciones o reseñas, y keyword stuffing.

---

## 7. Medición honesta

### 7.1 App Store Connect (✅ https://developer.apple.com/help/app-store-connect-analytics/acquisition/acquisition)

| Source type | Definición oficial | Consecuencia práctica |
|---|---|---|
| **App Store Search** | Vistas o descargas desde búsqueda, **incluye los anuncios de Apple Ads en resultados** | El "orgánico" de búsqueda mezcla pagado. Para aislarlo hay que restar Apple Ads, que se atribuye en su propia consola. |
| **App Store Browse** | Today, Games, Apps, etc. | Aquí caerían las Personalized Collections (inferencia) |
| **App Referrer** | Link desde una app, incluidas apps de Apple (Messages), **excepto Safari** | **Clave:** en iOS, un clic desde **Chrome** (u otro navegador) cuenta como App Referrer "Chrome", no como Web Referrer. Por inferencia, un clic desde la **app de ChatGPT** también caería aquí. |
| **Web Referrer** | Link desde un sitio **en Safari** (último URL de la cadena de redirecciones) | El SEO web → app solo se ve limpio si el usuario usa Safari |
| Institutional Purchase / App Clip / **Unavailable** | Unavailable incluye descargas con promo code, gift card o MDM | — |

**Métricas:** Unique Impressions · Unique Product Page Views · Total Downloads (primeras + redescargas) · **Conversion Rate = descargas ÷ impresiones únicas**. Es otra definición que la de AppTweak (vista de ficha → descarga): **no mezclar benchmarks**.

⚠️ En marzo de 2026 Apple renovó App Analytics con más de 100 métricas nuevas y **cohortes por fuente de descarga** (prensa: https://appleosophy.com/2026/03/25/apple-gives-app-store-connect-its-biggest-analytics-overhaul-yet/; no leí la nota oficial de Apple).

### 7.2 Play Console (✅ https://support.google.com/googleplay/android-developer/answer/9859173)

- **Google Play Search:** *"Users who visited your store listing by performing a search on Google Play **for your app's name or closely associated brand**"*. **Solo búsqueda navegacional o de marca.**
- **Google Play Explore:** navegación, más (desde el 20-feb-2023) las **búsquedas de categoría**, p. ej. "racing games" (⚠️ fecha vía fuentes secundarias). **Consecuencia:** el tráfico no-marca que el ASO busca capturar aparece en *Explore*, no en *Search*. Un reporte ingenuo subestima el efecto del ASO.
- **Ads and referrals:** incluye Google Ads. Impresiones y conversiones de Ads **no** se ven en Play Console.
- **Store listing visitors / acquisitions:** solo usuarios que no tenían la app en ningún dispositivo. Por eso las acquisitions son menores que las instalaciones totales.
- ✅ Desgloses por país, idioma, store listing (incluye CSL), estado de instalación, **términos de búsqueda** y campaña UTM, más **benchmarks de conversión por país**. https://play.google.com/console/about/acquisitionreporting/

### 7.3 Qué se puede atribuir de verdad y qué no

**Atribuible con rigor:**
- Cambios de ficha → conversión, **solo con experimentos nativos** (PPO de Apple / Store Listing Experiments de Google), que aleatorizan tráfico e informan confianza. ✅
- Rendimiento por CPP/CSL (cada uno se reporta por separado). ✅
- En Google Play: tráfico y conversión por **término de búsqueda**. ✅

**Atribuible solo con asterisco:**
- "Búsqueda orgánica iOS" = App Store Search − Apple Ads (dos consolas, métodos distintos).
- SEO web → app: solo Safari aparece como Web Referrer; Chrome y otras apps aparecen como App Referrer. Los links con parámetros de campaña de App Store Connect ayudan (inferencia; no verifiqué su doc).

**No atribuible (o no documentado):**
- **❌ Ranking de keyword → instalaciones en iOS:** en la documentación de fuentes de App Store Connect que revisé no existe una dimensión de término de búsqueda orgánico. Los rankings de keywords vienen de herramientas de terceros (DataForSEO, AppTweak), que son **estimaciones externas**.
- **❌ Descubrimiento con IA:** ni Apple ni Google tienen una fuente "AI/LLM". Google no anunció métricas de instalaciones desde Gemini o Ask Play en I/O 2026 (✅ ausencia verificada en el post oficial). Una recomendación de ChatGPT, si el usuario hace clic, caerá en App Referrer o Web Referrer (iOS) o en Ads/referrals (Play), mezclada con todo lo demás (inferencia).
- **❌ Efecto de Personalized Collections o App Store Tags:** Apple no documenta analítica específica (✅ ausencia en la guía de WWDC26).

---

## 8. AI app discovery

### 8.1 Qué anunciaron las plataformas [ANUNCIO OFICIAL]

**Apple:**
- ✅ **Keywords en CPP** y 70 CPP (2025-10-29): https://developer.apple.com/news/?id=gf6mgrs6
- ✅ **App Store Tags:** *"based on the App Store metadata… artificial intelligence, and human curation"*. Aparecen en resultados de búsqueda y en la ficha. El desarrollador solo puede **des-seleccionarlos**. **Solo EE. UU. y solo metadata en_US.** https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-tags
- ✅ **WWDC26 — Personalized Collections:** recomendaciones en las pestañas Apps, Games y **Search** *"along with a clear explanation for each app that shares why it's relevant"*. **"Available in select countries and regions for a limited number of apps."** El nombre "App Notes" para esas explicaciones viene de fuentes secundarias (Appbot, Phiture) ⚠️. Nuevos visuales de marca + Asset Library: "Coming this fall". App Intents para Siri, sin analítica de descubrimiento documentada. https://developer.apple.com/wwdc26/guides/app-store/

**Google (✅ post oficial del 2026-05-19, https://android-developers.googleblog.com/2026/05/io-2026-whats-new-in-google-play.html):**
- **Ask Play:** overlay conversacional con IA en la búsqueda de Play, más "Ask Play highlights" (resúmenes en resultados).
- **App discovery en la app Gemini** (Android y Web): *"connecting your apps and games to millions of Gemini users"*. Más adelante, deep links a contenido (450.000 películas y series, deportes).
- **Play Shorts:** feed vertical; por ahora solo EE. UU. y desarrolladores seleccionados.
- Listings pre-poblados por Gemini desde CSV o Sheets. **Clic en una keyword recomendada → genera un CSL para esa keyword, "ready to deploy with just one click".**
- **No hay métricas de instalaciones atribuidas a Gemini o Ask Play.** Ausencia verificada en el post.
- ⚠️ Rollout desde el 26-jun-2026. Según prensa, la mayoría de las funciones de IA de Play estaban limitadas a usuarios en inglés fuera del EEE (a mayo de 2026). **❌ No hay confirmación oficial de disponibilidad en español ni en CL/MX/CO/PE.**

**OpenAI:**
- ⚠️ App Directory en ChatGPT con envíos abiertos desde el 17 de diciembre de 2025. La página oficial devolvió 403; la fecha viene de VentureBeat y PocketGamer.
- ✅ Las guías de envío prohíben descripciones que *"manipulate how the model selects"* o *"interfere with fair discovery"*, y reservan *"directory placement or proactive suggestions"* para apps con alta utilidad. **No dicen nada sobre promover instalaciones de apps móviles.** https://developers.openai.com/apps-sdk/app-submission-guidelines
- Es un canal distinto: una "app en ChatGPT" (Apps SDK sobre MCP) **no es** la app nativa de iOS o Android.

### 8.2 Quién está productizando "GEO/AEO para apps"

| Actor | Oferta | Marca |
|---|---|---|
| **AppTweak — "AI Visibility for Apps"** (2026-04-07) | Mide cuánto aparece una app en recomendaciones de **ChatGPT, solo EE. UU.** | ⚠️ vendor · https://www.prnewswire.com/news-releases/apptweak-launches-first-platform-to-measure-and-optimize-app-discovery-in-ai-search-302736251.html |
| AppTweak — estudio de citas (2026-08-16) | En 125.000+ respuestas de ChatGPT a 9.000+ prompts (EE. UU., mayo 2026), las fichas de tienda son el **47,5 %** de las fuentes citadas (App Store 38 %, Google Play 9,5 %). Mide **citas, no instalaciones**. | ⚠️ vendor, metodología de clasificación no publicada · https://www.apptweak.com/en/aso-blog/optimize-app-store-listing-for-ai-search |
| **yellowHEAD** | Se presenta como "ASO UA SEO/GEO Creative"; Holistic Organic (ASO+SEO) | ⚠️ |
| **Phiture** | Asesoría sobre el ChatGPT App Directory | ⚠️ |
| **ASOitis** | "ASO + GEO agency for indie iOS apps (ChatGPT, Perplexity, Claude, Google AI Overviews)" | ⚠️ https://asoitis.com/ |
| **ASO Agent** | Herramienta que rastrea citas y recomendaciones de apps en ChatGPT, Perplexity y Gemini | ⚠️ https://asoagent.com/ |
| **Moburst** | AEO/AI SEO como servicio vecino a ASO | ⚠️ |

**[INTERPRETACIÓN VENDOR] vs [ANUNCIO OFICIAL]:**
- yellowHEAD (2026-06-16): *"AI-generated results push organic listings to the 4th screen for conversational queries"*; las keywords pasan a ser "AI relevance signals". → **Predicción del vendor**, no dato de Google.
- AppTweak (2026-06-03): *"traditional organic search results are going to be pushed down several screens… even top ranking apps will receive limited traffic"*. → **Predicción del vendor**, sin cifras.
- Lo único oficial es que las superficies existen. Google no publicó ningún impacto sobre el tráfico orgánico ni sobre las instalaciones.

### 8.3 ¿Hay datos de que las recomendaciones de IA generen instalaciones?

**❌ NO. No encontré ningún dato público, con metodología, que muestre que las recomendaciones de asistentes de IA (ChatGPT, Gemini, Ask Play, Siri o Personalized Collections) generen instalaciones de apps.**
- El estudio de AppTweak mide citas; su nota de prensa **no afirma** que generen instalaciones (verificado).
- Phiture no aporta datos de instalaciones ni de tráfico (verificado).
- Google no anunció métricas de instalación desde Gemini o Ask Play (verificado).
- Un desarrollador reportó públicamente que *no pudo atribuir ni una descarga* a búsqueda IA (⚠️ anecdótico, HackerNoon).
- Los datos de "tráfico referido por ChatGPT" (p. ej., SE Ranking: +36,7 % en mayo de 2026 sobre 101.574 sitios) son de **tráfico web**, no de instalaciones ⚠️.

**Implicancia para la oferta:** un servicio de "AI app discovery" hoy puede vender, con honestidad, **visibilidad y citabilidad medida** (share of voice en respuestas, consistencia ficha↔web, gestión de tags y CPP). **No puede prometer instalaciones incrementales atribuibles.**

---

## Lo que NO se pudo verificar

1. **Porcentaje de instalaciones desde búsqueda en Google Play:** Google no publica una cifra equivalente al 65/70 % de Apple, y su definición de "Search" (solo marca) impide comparar.
2. **Cifra actualizada de Apple:** el 65/70 % es de 2022. No hay dato oficial más reciente.
3. **Rating y conversión ("3→4★ = +89 %", "+340 %", "4,7 vs 4,0"):** no localicé la fuente original. Posible encuesta de 2015 con n=350 (intención, no comportamiento).
4. **Metodología del +2,5 pp / +156 % de las CPP:** Apple no la publica en la página.
5. **Impacto de CPP con keywords en búsqueda orgánica:** sin datos públicos.
6. **Benchmarks de conversión por categoría para CL/MX/CO/PE:** no hay datos públicos. Los de AppTweak son solo EE. UU.; mi extracción por categoría fue parcial.
7. **Precios de agencias ASO en LATAM:** ninguna publica tarifas.
8. **Precios oficiales de AppTweak, MobileAction, Appfigures y AppFollow:** tomados de agregadores. AppFollow tiene cifras contradictorias. Sensor Tower no tiene precio público.
9. **DataForSEO:** cobertura por país de Google Play (el CSV no se pudo leer); qué entrega exactamente Labs App Store API (¿volumen de búsqueda de tienda?); discrepancia de 86 vs 105 ubicaciones en Apple.
10. **Texto exacto de la guideline 5.6.3 de Apple:** obtenido vía buscador; mi lectura directa se truncó.
11. **Sanciones concretas de Google Play** por manipular ratings: la página de política no las detalla.
12. **Indexación de English (UK) en los storefronts LATAM:** es observación de la industria; Apple no la documenta.
13. **Disponibilidad de Ask Play, Gemini app discovery, Personalized Collections y App Store Tags en español y en CL/MX/CO/PE:** Tags es oficialmente solo EE. UU.; Collections "select countries"; Google sin confirmación para LATAM.
14. **Que Ask Play use el sitio web de la app como fuente:** lo afirman vendors; no lo vi en el post oficial de Google.
15. **Instalaciones generadas por recomendaciones de IA:** ❌ ningún dato público.
16. **Encuestas con metodología sobre quién compra ASO** y sus disparadores: no existen públicamente. La sección 3 es mayormente inferencia.
17. **Cifras de orgánico vs pagado por vertical en LATAM:** el informe de AppsFlyer existe, pero sus datos están detrás de descarga (no descargado).
18. **Página oficial de OpenAI** sobre envíos al App Directory (403): la fecha del 17-dic-2025 es secundaria.
19. **Existencia de reporte de términos de búsqueda orgánicos en App Store Connect:** no aparece en la documentación de fuentes que revisé, pero no hice una búsqueda exhaustiva en toda la ayuda.
