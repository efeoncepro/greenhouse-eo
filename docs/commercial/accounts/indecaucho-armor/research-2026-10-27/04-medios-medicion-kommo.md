# ARMOR EPPS: medios pagados, escenarios de inversión y medición con Kommo

Piloto de 90 días con LinkedIn Ads y Google Ads en Perú, Ecuador y Colombia.

| Campo | Valor |
| --- | --- |
| Corte | **27/10/2026**. Todas las fuentes web y los datos de Semrush se consultaron ese día. |
| Autor | Agente de investigación (estrategia de performance B2B) para Julio Reyes / Efeonce. |
| Uso | Insumo interno para la propuesta del piloto. No es una propuesta aprobada, un compromiso de resultados ni asesoría legal. |
| Método | (1) Semrush MCP `keyword_research` (`phrase_these`, bases `ec`, `pe`, `co`, 70 consultas de palabras clave) para volumen y CPC de búsqueda. (2) Búsqueda y lectura web de fuentes primarias (ayuda de LinkedIn, Microsoft Learn/LinkedIn API, ayuda de Google Ads, ayuda y documentación para desarrolladores de Kommo, textos legales) y de benchmarks de terceros (Huble, ZenABM, Web Tonic, LocaliQ). (3) Aritmética de escenarios con supuestos explícitos. |
| Cobertura | Benchmarks de LinkedIn por formato y región, CPC de búsqueda por país, conversión de búsqueda, Performance Max y Demand Gen, integraciones de Kommo, retorno de conversiones a Google y LinkedIn, y privacidad en EC/PE/CO. |
| Límites | No hubo acceso a Campaign Manager, Google Ads, Keyword Planner, Kommo, GA4 ni datos de ARMOR. **No existe un benchmark público confiable de LinkedIn para EPP industrial en estos tres países.** Las cifras de LatAm son pocas y de terceros. Semrush estima volumen y CPC y suele subestimar mercados chicos (CPC `0` significa que no hay dato suficiente, no que el clic sea gratis). Las fuentes de terceros son de agencias o proveedores, con metodología propia y sin revisión independiente. La investigación legal es orientadora y debe validarla un abogado local. |
| Convención | **HECHO VERIFICADO**: leído en la fuente citada. **DATO DE TERCERO**: benchmark publicado por una agencia o proveedor; se leyó la cifra, no se auditó su metodología. **SUPUESTO**: decisión de planificación de Efeonce, que debe validarse en la plataforma o con datos de ARMOR. |

> Advertencia: ninguna cifra de este documento es una garantía de resultados. Los rangos sirven para dimensionar
> el presupuesto y fijar metas de aprendizaje. El forecast de Campaign Manager y Keyword Planner con la cuenta real
> reemplaza estos supuestos en la semana 0.

---

## 0. Resumen ejecutivo

1. **La búsqueda en Google está limitada por la demanda, no por el presupuesto.** Con los volúmenes de Semrush, el
   techo de clics B2B pertinentes es de unos **170/mes en Ecuador**, **700/mes en Colombia** y **725/mes en Perú**
   (SUPUESTO de 50 % de cuota de impresiones y 6 % de CTR). Por encima de ~USD 150–350/mes por país, gastar más en
   Search no compra más búsquedas, sólo encarece el clic. Es el canal de **mayor intención** y conviene tenerlo
   siempre encendido en EC y CO, pero no puede llevar el piloto.
2. **LinkedIn es el canal que escala para llegar a Compras y SSO**, a un costo mayor. Planificamos con un CPL de
   Lead Gen Form de **~USD 62 (rango 28–143)** en EC/CO. Es coherente con el rango LATAM de USD 60–90 (DATO DE
   TERCERO) y con el de manufactura (USD 84–125, global).
3. **Perú queda como alcance y consideración.** Paradójicamente, tiene **~7 veces más búsqueda respiratoria que
   Ecuador** (8.860 vs 1.300 búsquedas/mes en los términos medidos). Es una señal útil para el plan 2027: una
   campaña "radar" pequeña mide la demanda y construye audiencias sin prometer atención comercial que todavía no
   existe.
4. **Escenarios de medios a 90 días: USD 9.000 / 18.000 / 30.000.** Recomendamos el **medio (USD 18.000)** como
   base, con compuertas para escalar o recortar. La estimación central es ~150 leads de LinkedIn más ~157
   conversaciones de búsqueda en 90 días, de las que ~100 serían calificables. La línea base orgánica declarada es
   de 4–5 leads/mes.
5. **La medición es el riesgo principal, no los medios.** El tracking nativo de UTM de Kommo para WhatsApp **sólo
   funciona con anuncios Click-to-WhatsApp de Meta**, que quedan fuera de alcance. Para Google y LinkedIn hay que
   capturar `utm_*`, `gclid` y `li_fat_id` en una landing y escribirlos en el lead de Kommo con
   `crm_plugin.setMeta` (API documentada del Website Chat Button) o con un microformulario previo al chat. Las
   conversiones calificadas y ganadas vuelven a Google (importación offline por GCLID) y a LinkedIn (Conversions API
   vía Zapier, socio oficial).

---

## 1. Benchmarks de medios

### 1.1 LinkedIn Ads: reglas de plataforma (fuente primaria)

| Dato | Valor | Tipo | Fuente |
| --- | --- | --- | --- |
| Presupuesto diario mínimo por campaña | USD 10, para cualquier formato | HECHO VERIFICADO (página de LinkedIn, vía resumen de búsqueda) | [LinkedIn – maximize your budget](https://business.linkedin.com/advertise/ads/best-practices/maximize-your-budget); [LinkedIn Help a422101](https://www.linkedin.com/help/lms/answer/a422101) |
| Presupuesto total mínimo de una campaña nueva | USD 100. Tras el lanzamiento: USD 10 × días programados | HECHO VERIFICADO (idem) | idem |
| Presupuesto sugerido por Campaign Manager | USD 25/día a anunciantes nuevos; 50–100 a existentes | HECHO VERIFICADO (idem) | idem |
| Audiencia mínima | **300 miembros** por ad set | HECHO VERIFICADO | [LinkedIn Help a423690 – Target audience size best practices](https://www.linkedin.com/help/lms/answer/a423690) |
| Audiencia recomendada | ≥50.000 "para generar resultados"; **≥300.000** para Sponsored Content y Sponsored Messaging; 60.000–400.000 para text ads | HECHO VERIFICADO | idem |
| Audiencia recomendada para Message Ads | >15.000 | HECHO VERIFICADO (página de producto) | [LinkedIn – Audience](https://business.linkedin.com/advertise/ads/audience) |
| Hidden fields en Lead Gen Forms | Sirven para reporte y test, son estáticos o dinámicos (cuenta, campaña, anuncio) y no capturan datos del miembro | HECHO VERIFICADO (extracto) | [LinkedIn Help a421421 – Lead Gen Form hidden fields](https://www.linkedin.com/help/lms/answer/a421421/) |

**Implicancia (SUPUESTO).** En Ecuador es probable que una audiencia acotada a SSO + Compras + industrias objetivo
quede por debajo de 50.000 miembros y muy por debajo de los 300.000 que LinkedIn sugiere para Sponsored Content.
Es una sugerencia, no un bloqueo: la campaña corre con 300 miembros o más. A cambio, la frecuencia sube rápido, la
fatiga creativa llega antes y el CPM puede ser mayor. El tamaño real debe medirse en el forecast de Campaign
Manager durante la semana 0.

### 1.2 LinkedIn Ads: costo y rendimiento por formato

Ninguna fuente pública da una tabla completa por formato **para LatAm**. Por eso combinamos datos globales por
formato con datos regionales agregados.

**Global por formato (DATO DE TERCERO: ZenABM 2026, 211 empresas B2B, 161.256 anuncios, USD 5,5 M, 29 países;
medianas; publicado el 16/02/2026; empresa autora que vende producto; sin tamaños de muestra por formato)**:
[zenabm.com](https://zenabm.com/blog/linkedin-ads-benchmarks-2026.md)

| Formato | CTR | CPC | CPM | Nota |
| --- | --- | --- | --- | --- |
| Thought Leader Ads | 2,68 % | USD 2,29 | USD 49,37 | Mejor costo por clic. Según ZenABM recibe sólo 7–10 % del presupuesto típico. |
| Single Image | 0,42 % | USD 13,23 | USD 59,15 | |
| Video | 0,24 % | USD 15,61 | USD 38,94 | |
| Carousel | 0,32 % | USD 13,30 | USD 45,28 | |
| Document Ads | 0,43 % | n/d | n/d | |
| Event Ads | 0,55 % | n/d | n/d | |
| Conversation/Message Ads | no cubierto | | | Ver la fila de Conversation Ads más abajo. |

Por país, ZenABM sólo publica EE. UU. (CTR 0,52 %, CPC USD 8,99, CPM USD 62,67), Reino Unido y Países Bajos. No hay
desglose LatAm por país.

**LATAM vs. Norteamérica (DATO DE TERCERO: Huble, "LinkedIn Ads benchmarks for 2025", publicado el 24/02/2025 con
campañas propias de 2024, todas de lead gen; montos en libras esterlinas; LATAM = sólo países de Sudamérica; sin
tamaño de muestra ni CPM)**: [huble.com](https://www.huble.com/blog/linkedin-ads-benchmarks)

| Formato (2024) | NA CTR | LATAM CTR | NA CPC | LATAM CPC | NA conv. | LATAM conv. | NA CPA | LATAM CPA |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Single Image | 0,35 % | 0,68 % | £4,34 | **£1,62** | 1,70 % | 3,31 % | £355,94 | **£150,43** |
| Carousel | 0,37 % | 0,74 % | £13,43 | £4,00 | – | – | – | – |
| Video | 0,24 % | 0,23 % | £7,02 | £38,93 | 1,56 % | – | £2.003 | – |
| Sponsored total | 0,58 % | 0,63 % | £2,60 | £1,67 | 1,70 % | 3,31 % | £372,23 | £150,17 |

- **Derivado (SUPUESTO aritmético):** el CPM implícito de LATAM en Single Image es CPC × CTR × 1000 = £1,62 × 0,68 % ×
  1000 ≈ **£11** (≈ USD 14 si se asume 1 GBP ≈ 1,30 USD; el tipo de cambio no se verificó). Es un orden de magnitud,
  no un dato publicado.
- **Señal relevante:** en LATAM, el video tuvo un CPC muy alto y 1,34 % de finalización frente a 56,67 % en NA.
  Huble no lo explica. **No usaremos video como formato de conversión en el piloto.**

**Rangos regionales de CPL (DATO DE TERCERO sin fuente declarada):** ZenABM lista LATAM USD 60–90, NA USD 200–250,
Europa USD 120–150 y APAC USD 80–120 ([zenabm.com](https://zenabm.com/blog/linkedin-ads-benchmarks-2026.md)). El
artículo no indica de dónde salen.

**Manufactura (DATO DE TERCERO: Web Tonic, 31/07/2026, actualizado el 09/10/2026; agrega a otras fuentes)**:
[webtonic.io](https://www.webtonic.io/blog/manufacturing-linkedin-ads-statistics)

| Métrica | Valor | Fuente citada por Web Tonic |
| --- | --- | --- |
| CPC | USD 4,80–7,90 | Ryze AI (874 campañas B2B, USD 47 M) |
| CPC | USD 4,00–7,00; mediana USD 5,75 | AdLibrary; MetadataONE |
| CPM | USD 27–40 | AdLibrary |
| CTR | 0,52–0,78 % | sin fuente nombrada |
| CPL | USD 84–125, mediana ~100 | Ryze AI |
| CPL con oferta gated | mediana USD 50 | MetadataONE |
| Conversión del Lead Gen Form | 10–18 % de los clics (mediana 13 %); dato conservador de agencia: 6–10 % | "común a los benchmark sets" |
| Lead de formulario → SQL | **25–40 %** (landing: 40–55 %) | sin fuente nombrada |
| Costo por lead calificado | USD 400–1.200 | papaverAI |

**Conversation / Message Ads (DATO DE TERCERO, cifras de agencias 2024–2026 que no coinciden entre sí):**
apertura ~50–60 %, CTR ~3 % (rango 2–5 %), costo por envío USD 0,50–2,00, CPL USD 98 frente a USD 201 de los
anuncios tradicionales (Singlegrain, 2024).
[nav43](https://nav43.com/blog/linkedin-conversation-ads-benchmarks-the-complete-2025-guide-to-costs-high-converting-flows/) ·
[Singlegrain](https://www.singlegrain.com/lead-generation/linkedin-conversation-ads-strategy/) ·
[Shopify](https://www.shopify.com/blog/linkedin-conversation-ads)

**Costos LatAm vs. EE. UU.:** no hay un dato oficial de LinkedIn. Las fuentes de terceros coinciden en que LatAm
cuesta menos por clic: Huble mide un CPC LATAM ~2,7 veces más bajo en Single Image, y otras fuentes dicen "LatAm a
menudo bajo USD 5" ([factors.ai](https://www.factors.ai/blog/linkedin-ads-cost),
[upgrowth](https://upgrowth.in/linkedin-advertising-cost/)). **SUPUESTO:** con la segmentación estrecha que
necesita ARMOR (función + cargo + industria + tamaño) el CPM se acerca al de manufactura global, no al promedio
LatAm.

**Tamaño de mercado LinkedIn (DATO DE TERCERO, NapoleonCat 2025; población total, no audiencia objetivo):**
Colombia ~16,0 M, Perú ~11,0 M, Ecuador ~5,3 M.
[EC](https://napoleoncat.com/stats/linkedin-users-in-ecuador/2025/05) ·
[PE](https://napoleoncat.com/stats/linkedin-users-in-peru/2025/02) ·
[CO](https://stats.napoleoncat.com/linkedin-users-in-colombia/2025/06/)

### 1.3 Supuestos de planificación para LinkedIn (EC/CO, objetivo Lead Gen)

| Parámetro | Pesimista | **Central** | Optimista | Base del supuesto |
| --- | --- | --- | --- | --- |
| CPM | USD 35 | **USD 28** | USD 20 | Entre el CPM implícito LATAM (~USD 14) y el de manufactura global (USD 27–40), sesgado hacia arriba por la segmentación estrecha. |
| CTR (Single Image + Document, sin TLA) | 0,35 % | **0,45 %** | 0,60 % | Global 0,42–0,43 %; LATAM 0,68 % (Huble). |
| Clic → envío de Lead Gen Form | 7 % | **10 %** | 12 % | Agencias: 6–18 %, mediana 10–13 %. Bajamos el piso porque pediremos teléfono y empresa. |
| **Leads por cada USD 1.000** | **7,0** | **16,1** | **36,0** | Cálculo: (1000/CPM) × 1000 × CTR × conv. |
| **CPL implícito** | **USD 143** | **USD 62** | **USD 28** | El central queda dentro del rango LATAM USD 60–90. |
| Lead → calificado (pasa a inspección o prueba) | 25 % | **30 %** | 40 % | Form → SQL 25–40 % (Web Tonic). **Debe reemplazarse por la tasa real de Kommo.** |

### 1.4 Google Ads: CPC de búsqueda por país (Semrush, 27/10/2026)

**HECHO VERIFICADO: salida de Semrush `phrase_these`.** Volumen = búsquedas mensuales promedio estimadas. CPC en
USD. "Comp." = densidad competitiva 0–1 (proxy de cuántos anunciantes pujan). CPC 0 = sin dato.
Fuente: [Semrush Keyword Overview](https://www.semrush.com/analytics/keywordoverview/) (bases `ec`, `pe`, `co`).

| Keyword | EC vol | EC CPC | PE vol | PE CPC | CO vol | CO CPC |
| --- | --- | --- | --- | --- | --- | --- |
| máscara full face | 110 | 0,18 | 170 | 0,20 | 480 | 0,15 |
| máscara full face 3m | 30 | 0,18 | 50 | 0,08 | 320 | 0,08 |
| filtros para respirador | – | – | 170 | 0 | 20 | 0 |
| filtros 3m | 50 | 0,14 | 480 | 0,18 | 390 | 0,11 |
| máscara media cara | 140 | 0 | 210 | 0 | 390 | 0,11 |
| respirador media cara | 20 | 0 | 880 | 0,10 | 390 | 0,10 |
| respirador cara completa | 20 | 0 | 90 | 0,27 | 20 | 0 |
| protección respiratoria | 110 | 0 | 390 | 0,23 | 140 | 0,26 |
| filtro 6003 | 20 | 0 | 880 | 0 | 390 | 0,16 |
| filtro 2097 | 110 | 0 | 1.600 | 0,22 | 590 | 0,13 |
| respirador 3m | 20 | 0,18 | 1.900 | 0,08 | 720 | 0,08 |
| filtros para máscara 3m | 20 | 0,09 | 140 | 0 | 210 | 0,05 |
| filtros para vapores orgánicos | – | – | 140 | 0,06 | 50 | 0 |
| máscara antigás / de gas | 140 / 320 | 0 / 0 | 480 / 880 | 0,05 / 0,21 | 210 / 320 | 0,08 / 0,08 |
| máscara para pintar | 140 | 0 | 320 | 0,11 | 260 | 0,05 |
| equipos de protección personal | 1.300 | 0,32 | 2.400 | 0,28 | 880 | 0,37 |
| elementos de protección personal | – | – | – | – | 4.400 | 0,43 |
| epp | 2.900 | 0,41 | 12.100 | 0,35 | 12.100 | 0,43 |
| venta de epp | 20 | 0,26 | 480 | 0,32 | 260 | 0,54 |
| proveedores de epp | 20 | 0,31 | 110 | 0,48 | 20 | 0,63 |
| equipos de seguridad industrial | 140 | 0,27 | 90 | 0,30 | 70 | 0,49 |
| seguridad industrial (muy amplio) | 2.400 | 0,53 | 2.400 | 0,47 | 2.400 | 0,53 |
| guantes anticorte (fuera del foco respiratorio) | 390 | 0,10 | 2.900 | 0,18 | 1.900 | 0,14 |

**Lectura:**

- **Los CPC son muy bajos, entre USD 0,05 y 0,63.** Los términos genéricos de proveedor y EPP son los más caros.
  Semrush no publica la puja de la parte alta de la página. **SUPUESTO:** planificamos con un CPC real de **USD 0,55
  (rango 0,35–1,00)**, entre 1,5 y 3 veces el dato de Semrush, para cubrir pujas por posición alta, términos sin
  dato y la competencia de distribuidores.
- **Hay mucha búsqueda por códigos y marca de 3M** (2097, 6003, respirador 3m), sobre todo en Perú y Colombia. Ver
  la sección 2.3 sobre marcas y compatibilidad.
- **Parte de la demanda es de consumo** (máscara para pintar, máscara de gas). Exige negativas y una calificación
  firme.
- **No hay anunciantes visibles en Semrush:** `phrase_adwords` devolvió `no_data` para "equipos de protección
  personal" (EC), "elementos de protección personal" (CO) y "respirador 3m" (PE). Eso **no prueba ausencia de pauta**:
  la cobertura de Semrush para anuncios en estos mercados es limitada.
- **Techo de demanda (SUPUESTO aritmético):** pool de búsquedas B2B pertinentes (respiratorio + genéricos de EPP,
  sin "seguridad industrial" ni guantes) × 50 % de cuota de impresiones × 6 % de CTR:

| País | Pool respiratorio | Pool genérico EPP | Total/mes | Clics techo/mes | Costo techo/mes (CPC 0,55) |
| --- | --- | --- | --- | --- | --- |
| Ecuador | 1.300 | 4.490 | 5.790 | **~174** | ~USD 96 |
| Colombia | 4.980 | 18.340 | 23.320 | **~700** | ~USD 385 |
| Perú | 8.860 | 15.300 | 24.160 | **~725** | ~USD 399 |

"epp" (12.100 en CO y PE) incluye mucha búsqueda informativa y de estudiantes, así que el techo **calificable** es
menor. Por el otro lado, Semrush puede subestimar el volumen de mercados chicos. **Validar en Keyword Planner con la
cuenta de ARMOR durante la semana 0.**

### 1.5 Google Ads: conversión y tipos de campaña

| Dato | Valor | Tipo | Fuente |
| --- | --- | --- | --- |
| Industrial & Commercial (search) | CPC USD 5,87 · CTR 6,57 % · **CVR 8,20 %** · CPL USD 75,19 | DATO DE TERCERO (LocaliQ 2026, actualizado el 01/06/2026; miles de campañas de clientes en Google y Microsoft; geografía no declarada, presumiblemente EE. UU.) | [LocaliQ](https://localiq.com/blog/search-advertising-benchmarks/) |
| Business Services | CPC USD 5,87 · CTR 6,10 % · CVR 4,85 % · CPL USD 93,69 | idem | idem |
| Promedio de todas las industrias | CPC USD 5,42 · CTR 6,64 % · CVR 8,18 % · CPL USD 66,69 | idem | idem |

Los CPC de LocaliQ (EE. UU.) son unas 10 veces los de Semrush para EC/PE/CO. **Sólo usamos de LocaliQ el CTR y la
tasa de conversión** como referencia de comportamiento. **SUPUESTO para ARMOR:** la "conversión" de búsqueda es
iniciar una conversación por WhatsApp o enviar el microformulario: 3 % pesimista, **6 % central**, 9 % optimista.
Debajo del 8,2 % de EE. UU. porque una parte de la demanda es de consumo y el contacto exige seleccionar país y
aceptar la política de datos.

**Performance Max (PMax) para B2B: no en el piloto.**

- *A favor (DATO DE TERCERO):* llega a todo el inventario de Google y puede aprender de conversiones offline si se
  le dan etapas de CRM (MQL/SQL/venta) como objetivo
  ([TechWyse](https://www.techwyse.com/news/platform-updates/google-performance-max-pay-per-lead-goals-lsa)).
- *En contra (DATO DE TERCERO):* sin señal de calidad desde el CRM tiende a optimizar formularios baratos; un caso de
  agencia reporta que el 68 % de los leads nunca respondió. Además canibaliza la marca y gasta en ubicaciones de
  baja intención. Un estudio de Adalysis (3.300 campañas, citado por NAV43) encontró que Search convierte mejor
  cuando ambos compiten por los mismos términos
  ([NAV43](https://nav43.com/blog/when-not-to-use-performance-max-for-lead-generation-the-decision-framework-most-advertisers-are-missing/),
  [Lunio](https://www.lunio.ai/blog/performance-max-for-b2b-lead-gen)).
- *Decisión (SUPUESTO):* con volúmenes chicos y sin conversiones offline cargadas todavía, PMax aprendería del ruido.
  Se reevalúa cuando Kommo devuelva conversiones calificadas de forma estable.

**Demand Gen (YouTube, Discover, Gmail, Display): sólo como remarketing, en el escenario alto.** Sirve para llegar
antes de la búsqueda y alimentar remarketing. Su impacto en pipeline B2B es difícil de medir
([Bootstrap Creative](https://bootstrapcreative.com/what-are-demand-gen-google-ads/),
[NAV43](https://nav43.com/blog/google-demand-gen-vs-performance-max-a-funnel-strategy-for-b2b-brands/)).

**Message assets de WhatsApp en Search:** existen en beta para Search y PMax. Exigen buen historial de políticas,
vertical elegible y verificación del anunciante ([Google Ads Help 14888522](https://support.google.com/google-ads/answer/14888522)).
**No pudimos confirmar si están disponibles en EC, PE y CO.** Se prueba en la semana 0. Si están, se usan como
complemento: no traen gclid a la landing, así que la atribución en Kommo es más débil.

---

## 2. Diseño recomendado del piloto de 90 días

### 2.1 Estructura por país y objetivo

| País | Rol | LinkedIn | Google | Conversión principal |
| --- | --- | --- | --- | --- |
| **Ecuador** | Leads. Mercado actual y sede. | Lead Gen (Document Ads gated + Single Image) + Thought Leader Ads de asesores técnicos + Conversation Ads desde la fase 2 | Search de alta intención, con presupuesto topado por demanda | Lead calificado → inspección o prueba agendada |
| **Colombia** | Leads. Coordinar con el canal (DANAMO). | Igual que Ecuador | Search; mayor pool que Ecuador | Igual que Ecuador, con regla de derivación al distribuidor acordada antes del lanzamiento |
| **Perú** | Visibilidad y consideración antes de entrar en 2027 | Alcance/engagement: TLA + Single Image/Document sin formulario, con remarketing | "Radar" opcional (escenarios medio y alto): pocos términos técnicos para medir demanda y construir audiencias, sin campaña de leads | Alcance en la audiencia objetivo, engagement, crecimiento de seguidores, visitas a la landing de Perú y suscripción a "aviso de llegada 2027" (si ARMOR lo aprueba) |

**Regla de canal (SUPUESTO por validar con ARMOR):** antes de lanzar, ARMOR define qué leads atiende directo y
cuáles deriva a un distribuidor. En Colombia la web enlaza a DANAMO. Sin esa regla, el piloto genera leads que nadie
es dueño de atender.

### 2.2 Segmentación de LinkedIn

- **Funciones y cargos (en español, con variantes por país):**
  - **SSO/HSE:** Ecuador usa "Seguridad y Salud Ocupacional (SSO)"; Colombia, "SST / SG-SST"; Perú, "SST / SSOMA".
    Cargos: Jefe/Coordinador/Supervisor SSO, SST, HSE, HSEQ o SSOMA; Ingeniero de Seguridad Industrial;
    Prevencionista de riesgos; Médico ocupacional (secundario).
  - **Compras:** Jefe/Analista de Compras, Comprador, Abastecimiento, Procurement, Supply Chain (función LinkedIn
    "Purchasing").
  - **Influenciadores técnicos (fase 2):** Jefe de Planta, Mantenimiento, Producción.
- **Industrias** (priorizar con ARMOR según riesgo respiratorio): minería; petróleo y gas; construcción; manufactura
  química; pinturas y recubrimientos; agroindustria (fumigación, agroquímicos; en Ecuador, banano y flores);
  alimentos y bebidas; farmacéutica; utilities y saneamiento; metalmecánica y soldadura.
- **Tamaño de empresa:** 51+ empleados para SSO; 201+ para Compras, donde el comprador está más especializado.
  SUPUESTO por validar.
- **ABM:** subir una lista de empresas objetivo por país (CSV de company list), construida con ARMOR: clientes
  potenciales por sector y cuentas de distribuidores a desarrollar. Crear un ad set separado para comparar con la
  segmentación por atributos. Cada lista debe superar 300 miembros emparejados.
- **Exclusiones:** empleados de ARMOR e Indecaucho, competidores, estudiantes y nivel "Entry/Training". En
  remarketing, excluir a quien ya envió el formulario.
- **Remarketing (Matched Audiences):** visitantes de la landing (Insight Tag), quienes vieron 50 % o más de un
  video, quienes abrieron un Lead Gen Form y no lo enviaron, y quienes interactuaron con la página.

### 2.3 Estructura de Google Search (EC y CO; Perú en modo radar)

| Grupo de anuncios | Ejemplos de keywords (frase/exacta al inicio) | Landing | Nota |
| --- | --- | --- | --- |
| 1. Protección respiratoria reutilizable | máscara full face / cara completa / media cara, respirador reutilizable, protección respiratoria | Familia respiratoria + CTA de asesoría | Núcleo |
| 2. Filtros y cartuchos por contaminante | filtros vapores orgánicos, filtro gases ácidos, filtro partículas, cartuchos para respirador | Selector o guía de filtros | Alta intención técnica |
| 3. Equivalencias y compatibilidad | filtro 6003, filtro 2097, filtros 3m, respirador 3m | Página de equivalencias **sólo si ARMOR valida técnicamente la compatibilidad** | Ver la política de marcas abajo |
| 4. Por industria o riesgo | máscara para fumigar, protección respiratoria minería, epp minería, pintura industrial | Landing por sector | Segmentar por sector prioritario |
| 5. Proveedor B2B | proveedores de epp, venta de epp, distribuidor epp, epp + ciudad | Landing B2B con "cotiza / visita técnica" | Mayor CPC, mayor intención comercial |
| 6. Marca | armor epp, armor máscara, indecaucho | Home ARMOR | Protección barata de la marca |

**Política de marcas de Google (HECHO VERIFICADO):** Google Ads no restringe usar marcas de terceros **como
keywords**. Restringe la marca **en el texto del anuncio** cuando lo usa un competidor directo o de forma confusa.
Hay una excepción para landings dedicadas a "componentes, repuestos o productos compatibles", siempre que muestren
información comercial y sean claras sobre la relación con la marca
([Google Ads policy 6118](https://support.google.com/adspolicy/answer/6118)).
**Recomendación (SUPUESTO):** pujar por los códigos y responder con "Filtros ARMOR para vapores orgánicos: asesoría
técnica y prueba en planta", sin "3M" en el anuncio. Una página de equivalencias requiere validación técnica y
legal de ARMOR: una afirmación de compatibilidad errónea en EPP es un riesgo de seguridad, no sólo de marketing.

- **Negativas iniciales:** gratis, pdf, qué es, significado, curso, tesis, trabajo/empleo, mercado libre, amazon,
  disfraz, halloween, airsoft, juguete, y uso doméstico (pintar casa) según se lea el reporte de términos.
- **Puja:** Maximizar clics con CPC máximo durante el aprendizaje. Pasar a Maximizar conversiones o CPA objetivo
  sólo cuando las conversiones (idealmente calificadas, importadas desde Kommo) tengan volumen suficiente.
- **Segmentación geográfica:** "presencia" (no "interés") en el país, con ajustes por ciudad industrial. Horario
  laboral si el equipo sólo atiende WhatsApp en ese horario.

### 2.4 Fases

| Semana | Fase | Qué se hace | Criterio de salida |
| --- | --- | --- | --- |
| 0–2 | **Preparación** (sin gasto o mínimo) | Tracking (sección 4), campos y etapas en Kommo, landings por país y oferta, consentimiento, forecast de audiencias en Campaign Manager, Keyword Planner, creatividades y la guía técnica, regla de canal | Lead de prueba de punta a punta: anuncio → landing → WhatsApp/form → lead en Kommo con UTM/gclid/li_fat_id → cambio de etapa → conversión visible en Google y LinkedIn |
| 3–6 | **Aprendizaje** | 2–3 ofertas × 2 formatos por país; Search en frase/exacta; TLA con 1–2 asesores | Al menos 100 clics por variante en LinkedIn; reporte de términos depurado; tasa de calificación inicial en Kommo |
| 7–10 | **Optimización** | Apagar perdedores; reasignar a la oferta con mejor costo por lead **calificado**; Conversation Ads a quienes interactuaron (oferta: visita técnica o prueba de ajuste); remarketing; primera carga de conversiones offline | Costo por lead calificado bajo la meta acordada; ≥X inspecciones agendadas (X lo define ARMOR con su capacidad) |
| 11–13 | **Escala y decisión** | Subir presupuesto en lo que funciona (+20–30 % por paso); lectura final y propuesta de presupuesto anual | Informe: costo por lead calificado, inspecciones, pipeline y ventas ganadas atribuidas, con su límite de atribución |

**Aviso de ciclo (SUPUESTO):** el ciclo de venta B2B con inspección y prueba puede pasar de 90 días. Lo más probable
es que el piloto **muestre inspecciones y oportunidades, no necesariamente ventas cerradas**. Las ventas se siguen
midiendo después del piloto: LinkedIn atribuye leads hasta 365 días si se configura así (sección 4).

### 2.5 Ofertas y creatividades que encajan con el proceso de ARMOR

El proceso real de ARMOR (asesor que inspecciona y prueba antes de cerrar) **es la oferta**. La pauta debe llevar a
esa conversación, no a un catálogo.

| Oferta | Formato | Etapa | País | Nota |
| --- | --- | --- | --- | --- |
| **Guía técnica de selección de protección respiratoria** (contaminante → filtro → pieza facial, cambio de filtros, errores comunes) | Document Ad con Lead Gen Form (gated tras 2–3 páginas) | Lead | EC, CO; sin formulario en PE | Los contenidos y claims los valida el especialista de ARMOR. Existen fichas y certificados reutilizables. |
| **Selector de filtros por contaminante** | Landing interactiva + Search (grupo 2) | Lead / consideración | Todos | Requiere desarrollo; puede empezar como tabla o checklist en la fase 1 |
| **Prueba de ajuste (fit test) / prueba en planta con asesor** | Single Image + Conversation Ad + Search | Lead caliente | EC, CO | Es la "inspección/prueba" que ya hacen. Medirla como etapa en Kommo. |
| **Visita técnica / diagnóstico respiratorio del área** | Conversation Ads y TLA | Lead caliente | EC, CO | Sólo con capacidad confirmada de asesores por ciudad |
| **Muestra para evaluación** | Lead Gen Form con calificación (empresa, # trabajadores expuestos) | Lead | EC, CO | Sólo si la política comercial de ARMOR lo permite |
| **Asesores técnicos como voz** | Thought Leader Ads (posts de asesores reales) | Alcance y clic barato | Todos | Benchmark global CTR 2,68 % / CPC USD 2,29. Requiere aprobación del autor. |
| **Lanzamientos y casos** (AR410/AR420, posventa) | Single Image / Carousel; video sólo para alcance | Consideración | PE sobre todo | Reutilizar activos existentes (ver la auditoría de demanda digital del 26/10) |

---

## 3. Escenarios de inversión en medios (90 días)

Sólo inversión en medios, en USD. **No incluye** honorarios de agencia, producción, desarrollo de landings e
integraciones, ni impuestos locales sobre servicios digitales (por validar con Finanzas de ARMOR).

### 3.1 Distribución por país y canal (USD por mes; total a 90 días)

| Escenario | Ecuador | Colombia | Perú | **Total/mes** | **Total 90 días** |
| --- | --- | --- | --- | --- | --- |
| **Bajo** | LI 1.050 + GS 150 = 1.200 | LI 1.050 + GS 350 = 1.400 | LI 400 + GS 0 = 400 | **3.000** | **9.000** |
| **Medio (recomendado)** | LI 2.050 + GS 200 = 2.250 | LI 2.100 + GS 450 = 2.550 | LI 1.050 + GS 150 = 1.200 | **6.000** | **18.000** |
| **Alto** | LI 3.200 + GS 300 + DG 300 = 3.800 | LI 3.300 + GS 600 + DG 300 = 4.200 | LI 1.700 + GS 300 = 2.000 | **10.000** | **30.000** |

LI = LinkedIn · GS = Google Search · DG = Google Demand Gen (sólo remarketing).

**Reglas de distribución (SUPUESTOS):**

- **Search se dimensiona al techo de demanda** (sección 1.4), con margen por posible subestimación de Semrush. Lo que
  Search no gaste se reasigna a LinkedIn cada semana.
- **LinkedIn en EC/CO: 75 % a Lead Gen y 25 % a alcance, TLA y remarketing.** Este 25 % no se cuenta como leads.
- **Mínimo operativo de LinkedIn:** USD 10/día por campaña (USD 300/mes). En el escenario bajo, cada país admite sólo
  unas 3 campañas simultáneas. El medio permite probar 2–3 ofertas × 2 formatos por país.
- **Perú bajo (USD 400/mes)** es apenas 1 campaña de alcance. Sirve para estar presente, no para aprender mucho.

### 3.2 Aritmética de LinkedIn Lead Gen (EC + CO)

Fórmula: leads = (gasto LGF / CPM) × 1000 × CTR × conversión del formulario. Parámetros de la sección 1.3: leads por
USD 1.000 = 7,0 / **16,1** / 36,0.

| Escenario | Gasto LI EC+CO 90 d | Gasto LGF (75 %) | Impresiones LGF (central, CPM 28) | Clics (central) | **Leads LGF: pesim. / central / optim.** | Leads calificados (25 % / 30 % / 40 %) |
| --- | --- | --- | --- | --- | --- | --- |
| Bajo | 6.300 | 4.725 | ~168.750 | ~760 | **33 / 76 / 170** | 8 / 23 / 68 |
| Medio | 12.450 | 9.338 | ~333.500 | ~1.500 | **65 / 150 / 336** | 16 / 45 / 134 |
| Alto* | 19.500 | 14.625 | ~522.300 | ~2.350 | **82 / 188 / 421** | 21 / 56 / 168 |

\* **Escenario alto ajustado ×0,8 por saturación (SUPUESTO).** Si la audiencia de Ecuador ronda las decenas de miles,
USD 3.200/mes a CPM 28 son ~114.000 impresiones/mes, varias por miembro. La frecuencia y la fatiga bajan el
rendimiento marginal. Cifras sin ajuste: 102 / 235 / 527.

El escenario optimista supone CPL ~USD 28. Está por debajo de todo benchmark publicado y debe leerse como techo, no
como meta.

### 3.3 Aritmética de Google Search (EC + CO; limitada por demanda)

- Techo de clics a 90 días (central): (174 + 700) × 3 ≈ **2.622 clics**.
- **Central:** CPC USD 0,55 × 2.622 ≈ USD 1.442. Con eso, el presupuesto del escenario bajo (USD 1.500 a 90 días) ya
  alcanza el techo. **Más presupuesto no compra más búsquedas.**
- **Pesimista:** cuota de impresiones 35 %, CTR 5 %, CPC USD 1,00, conversión 3 %.
- **Optimista:** volumen real 1,5 veces Semrush, cuota 60 %, CTR 7 %, CPC USD 0,35, conversión 9 %.

| Escenario | GS EC+CO 90 d | **Conversaciones/formularios: pesim. / central / optim.** | Calificables (20 % / 35 % / 50 %) |
| --- | --- | --- | --- |
| Bajo | 1.500 | **45 / 157 / 386** | 9 / 55 / 193 |
| Medio | 1.950 | **46 / 157 / 495** | 9 / 55 / 248 |
| Alto | 2.700 | **46 / 157 / 495** | 9 / 55 / 248 |

La tasa "calificable" de búsqueda (20–50 %) es menor que su intención aparente porque incluye consumo, estudiantes y
clientes de posventa. SUPUESTO por reemplazar con el dato de Kommo.

**Perú, radar de Search (medio y alto):** USD 450 / 900 a 90 días → ~820 / ~1.640 clics a CPC central. Se mide
volumen, términos y CTR, y se construyen listas de remarketing. No se piden leads.

### 3.4 Alcance en Perú (LinkedIn)

| Escenario | Gasto LI Perú 90 d | Impresiones (CPM 35 / **28** / 20) |
| --- | --- | --- |
| Bajo | 1.200 | 34.300 / **42.900** / 60.000 |
| Medio | 3.150 | 90.000 / **112.500** / 157.500 |
| Alto | 5.100 | 145.700 / **182.100** / 255.000 |

KPIs de Perú: alcance único en la audiencia objetivo y frecuencia (Campaign Manager), engagement rate, seguidores
nuevos atribuidos a pauta, visitas a la landing y, si se activa, inscripción a "aviso de llegada 2027".

### 3.5 Consolidado (estimación central, con rango; no es garantía)

| Escenario | Medios 90 d | Leads LI (EC+CO) | Conversaciones Search (EC+CO) | **Contactos totales** | **Calificables** (pesim. / central / optim.) | Costo por calificable (central) |
| --- | --- | --- | --- | --- | --- | --- |
| Bajo | USD 9.000 | 76 | 157 | ~233 | 17 / **78** / 261 | ~USD 115 |
| **Medio** | **USD 18.000** | 150 | 157 | ~307 | 25 / **100** / 382 | ~USD 180 |
| Alto | USD 30.000 | 188 | 157 | ~345 | 30 / **111** / 416 | ~USD 270 |

El costo por calificable incluye la inversión de Perú (alcance) y el 25 % de alcance en EC/CO.

**Referencia:** la línea base declarada es de 4–5 leads/mes orgánicos, unos 12–15 en 90 días. Su tasa de calificación
la conoce Kommo y no se nos entregó.

**Recomendación: el escenario medio.**

1. Es el mínimo que permite **aprender**: 2–3 ofertas × formatos × 2 países con presupuesto suficiente por variante.
   El bajo deja una o dos campañas por país.
2. Search ya está saturado desde el escenario bajo. El margen extra va a LinkedIn, que es donde está la audiencia de
   Compras y SSO que no busca.
3. El alto agrega volumen con rendimiento marginal decreciente y riesgo de saturar Ecuador. Conviene **llegar a él
   por compuerta**: escalar en la fase 3 sólo si el costo por calificable de la fase 2 está bajo la meta y los
   asesores tienen capacidad para más inspecciones.

**Inspecciones y ventas: falta el dato.** Para pasar de "calificable" a inspección y a venta hace falta la tasa
histórica de Kommo (lead → inspección → prueba → ganado, con motivos de pérdida). No inventamos esas tasas.
Ejemplo de la fórmula, no estimación: si 40 % de los calificables llega a inspección y 25 % de las inspecciones se
gana, el escenario medio central daría ~100 × 0,40 × 0,25 ≈ 10 ventas. **Pedir a ARMOR la exportación de Kommo de los
últimos 12 meses (etapas, fechas, origen, ganado/perdido y motivo, sin datos personales) para calibrar.**

### 3.6 Cómo convertir el piloto en presupuesto anual

Al día 90 hay costo real por lead calificado y por inspección, por país y canal. El presupuesto anual se calcula
hacia atrás: meta de inspecciones (capacidad de los asesores) ÷ (calificables → inspección) × costo por calificable,
más una reserva de 15–20 % para pruebas y la entrada a Perú en 2027. Sin el piloto, cualquier número anual sería una
extrapolación de benchmarks.

---

## 4. Medición con Kommo

### 4.1 Qué hay hoy y qué falta

- **Hoy:** el sitio no tiene formularios. El contacto es un chat de WhatsApp en la web, con selección de país
  (Ecuador o Colombia) y de ventas o postventa, y aceptación de la política de datos. Kommo es el CRM, y cada lead
  se califica y se marca como ganado o perdido, con motivo.
- **Falta:** el origen publicitario del lead. No sabemos qué herramienta implementa ese chat; si no es el Website
  Chat Button de Kommo, se debe identificar en la semana 0.

### 4.2 Capacidades: nativo, terceros o manual

| Necesidad | ¿Cómo? | Tipo | Evidencia |
| --- | --- | --- | --- |
| Recibir WhatsApp en Kommo | Integración oficial WhatsApp Business (Cloud API). Kommo es Meta Partner. | **Nativo** | [Kommo – WhatsApp Business](https://www.kommo.com/integrations/whatsapp/); [Kommo – Cloud API](https://kommo.com/support/kb/whatsapp-cloud-api-how-to-connect) |
| UTM automáticas en leads de WhatsApp | **Sólo** anuncios Click-to-WhatsApp de **Meta**, con WhatsApp y cuenta publicitaria en el mismo portafolio de Meta. "Third-party integrations won't work". Kommo indica que vincular UTM con conversiones del CRM "aún no está soportado". | **Nativo, pero no aplica** (Meta fuera de alcance) | [Kommo – Track WhatsApp ad campaigns with UTMs](https://support.kommo.com/docs/track-whatsapp-ad-campaigns-with-utms.md) |
| UTM, gclid y li_fat_id desde una landing hacia el lead | Website Chat Button de Kommo + `crm_plugin.setMeta({ lead: { custom_fields: [...] } })` desde el front. Kommo documenta que sirve para "collect data from the website (e.g., UTM tags) and transfer it to the lead". | **Nativo con desarrollo ligero** (JS + campos personalizados) | [Kommo Developers – API Website Chat Button](https://developers.kommo.com/docs/api-crm-plugin) |
| Microformulario previo al chat con campos ocultos | Formulario de la landing (Kommo o del sitio) → lead en Kommo vía API, webhook o Zapier, con campos ocultos | Nativo/API o tercero | No confirmamos si los web forms de Kommo capturan UTM solos: **probar en la semana 0** |
| Enlace wa.me con código de referencia | Mensaje precargado "Hola, consulta REF-XXXX". Una automatización de Kommo (Salesbot) o un servicio propio lee el código y completa los campos de origen. | **Desarrollo a medida** (no documentado por Kommo) | Patrón descrito por terceros ([Landbot](https://landbot.io/blog/how-to-track-conversions-whatsapp-lead-generation)) |
| LinkedIn Lead Gen Forms → Kommo | Integración nativa: crea el lead y mapea campos. Cada usuario necesita su cuenta de LinkedIn con permisos. Agregar campos al formulario obliga a remapear. Desde Kommo no se puede escribir al lead por LinkedIn. **No documenta si trae campaña o anuncio.** | **Nativo** | [Kommo – Connect LinkedIn Lead Gen Forms](https://support.kommo.com/docs/connect-linkedin-lead-gen-forms-to-kommo.md) |
| Saber la campaña de un lead de LGF | Un formulario por país y oferta (el formulario identifica el origen) + hidden fields estáticos | Configuración | [LinkedIn Help a421421](https://www.linkedin.com/help/lms/answer/a421421/) |
| Disparador cuando cambia la etapa en Kommo | Zapier: app Kommo con trigger instantáneo "Lead Status Changed". Un hilo de 2023 reportó datos vacíos. Make: "Watch Events" (por sondeo) o webhooks de Kommo. | **Terceros** | [Zapier – Kommo](https://zapier.com/apps/kommo/integrations/paths); [Kommo – Make](https://www.kommo.com/support/integrations/make-formerly-integromat-how-to-use/); [Zapier community](https://community.zapier.com/troubleshooting-99/trigger-leads-status-change-in-kommo-empty-leads-30277) |
| Conversiones offline a Google Ads | Importación por **GCLID**: exige auto-tagging, capturar el gclid y subir en ≤90 días desde el clic. **Enhanced Conversions for Leads** requiere un tag que capture el email o teléfono hasheado **en la web**, o GCLID si no hay tag. Cargas vía Data Manager, API o Zapier. Las cargas por la Google Ads API migran a la Data Manager API desde el 15/06/2026. **No encontramos un conector nativo de Kommo.** | Terceros (Zapier) o **manual** (archivo o Sheets programado) | [Google – GCLID offline](https://support.google.com/google-ads/answer/7012522); [Google – ECL](https://support.google.com/google-ads/answer/15713840?hl=en); [Google – Offline import](https://support.google.com/google-ads/answer/2998031) |
| Conversiones offline a LinkedIn | **Conversions API**: requiere SHA256_EMAIL, `li_fat_id`, nombre+apellido, IP, el URN del lead de LGF u otros identificadores (al menos uno). Recomienda email + li_fat_id. Ventana: hasta 90 días desde el evento + 90 de atribución. Para LEAD, QUALIFIED_LEAD, MQL y SQL, ventana de 180 o 365 días (MQL/SQL desde la versión 202608). Zapier es socio oficial. El `li_fat_id` se agrega a la URL con el "enhanced conversion tracking" del Insight Tag. | Terceros (Zapier o Make) o API directa (1–2 semanas según LinkedIn) | [LinkedIn Conversions FAQ (Microsoft Learn, 16/09/2026)](https://learn.microsoft.com/en-us/linkedin/marketing/conversions/conversions-faq); [Zapier – LinkedIn Conversions](https://zapier.com/es/l/linkedin-conversions-integration) |
| Leads de LGF a la Conversions API | El URN `urn:li:leadGenFormResponse:{id}` es un identificador válido. Hay que conservar el ID de la respuesta en Kommo; **no verificamos si la integración nativa lo guarda.** | Por verificar | idem |

### 4.3 Arquitectura mínima viable (recomendada)

```text
Anuncio (LinkedIn / Google, UTM estándar)        LinkedIn Lead Gen Form
        │  auto-tagging gclid · li_fat_id                │  1 formulario por país+oferta
        ▼                                                ▼
Landing por país/oferta en armorepps.com        Integración nativa LinkedIn → Kommo
  · GTM + GA4 + Insight Tag (enhanced conv.)              │ (campo "origen" = formulario)
  · Banner de consentimiento (cookies/tags)               │
  · Script: guarda utm_*, gclid, li_fat_id (1st-party)    │
  · CTA A: "Hablar con un asesor" → Website Chat Button   │
    de Kommo (WhatsApp) + setMeta → campos del lead       │
  · CTA B: microformulario "Agenda prueba/visita técnica" │
    (empresa, cargo, país, email, WhatsApp, consentimiento)│
        ▼                                                ▼
                 KOMMO (pipeline común por país)
  Campos: utm_source/medium/campaign/content/term, gclid, li_fat_id,
  país, línea (ventas/postventa), canal_origen, oferta, id_respuesta_LGF
  Etapas: Nuevo → Contactado → Calificado → Inspección/prueba agendada →
          Prueba realizada → Cotización → Ganado / Perdido (+ motivo)
        │  trigger "Lead Status Changed" (Zapier) o carga semanal manual
        ├──► Google Ads: conversiones offline por GCLID (Calificado, Inspección, Ganado)
        └──► LinkedIn Conversions API (QUALIFIED_LEAD / SQL / PURCHASE)
                 ▼
Tablero semanal (Looker Studio o hoja): export de Kommo + Google Ads + Campaign Manager
```

**Por qué así (SUPUESTOS de diseño):**

- **El chat directo de WhatsApp desde el anuncio pierde el origen.** El chat de Kommo con `setMeta` lo conserva sin
  agregar fricción al usuario.
- **El microformulario es la vía de mayor calidad de datos:** el email y el teléfono habilitan Enhanced Conversions
  for Leads y el match de la Conversions API. Se ofrece como CTA de alto compromiso ("Agenda una prueba de
  ajuste"), sin reemplazar WhatsApp.
- **Arrancar con carga manual semanal** de conversiones (archivo para Google y Zapier o archivo para LinkedIn) evita
  depender de una integración antes de validar el flujo. Se automatiza en la fase 2 si funciona.
- **Gobierno de datos:** usar nombres UTM estandarizados (en Kommo cada nombre de parámetro distinto crea un campo
  nuevo) y una sola persona responsable de las etapas en Kommo. Definir "Calificado" por escrito: empresa real con
  necesidad respiratoria, en un país atendido, con un responsable identificado.

**Pendientes de la semana 0 (bloqueantes):**

1. Qué widget implementa el chat actual. Si no es Kommo, ver cómo llevar la sesión.
2. El plan de Kommo y si permite campos personalizados, Salesbot y webhooks.
3. Quién tiene acceso admin a Google Ads, Campaign Manager, GTM y el Business portfolio de Meta (WhatsApp).
4. Si el auto-tagging y el `li_fat_id` sobreviven a las redirecciones del sitio.
5. Prueba de punta a punta con un lead real de prueba.

### 4.4 KPIs del embudo (definiciones)

| Etapa | KPI | Definición | Fuente |
| --- | --- | --- | --- |
| Exposición | Impresiones, alcance, frecuencia, CPM | Por país, plataforma y campaña. Alcance y frecuencia, de Campaign Manager. | Plataformas |
| Interés | Clics, CTR, CPC | Clic al destino (landing o formulario). Excluye reacciones sociales en LinkedIn. | Plataformas |
| Contacto | **Conversaciones WhatsApp iniciadas** | Conversación nueva en Kommo con primer mensaje del usuario y campo de origen pagado | Kommo |
| Contacto | **Formularios enviados** (LGF + microformulario) | Envíos únicos por persona y oferta, sin duplicados | Kommo / LinkedIn |
| Calidad | **Lead calificado** | Cumple la definición escrita (empresa, necesidad respiratoria, país atendido, responsable). Lo marca el asesor en ≤5 días hábiles. | Kommo |
| Avance | **Inspección o prueba agendada** | Fecha confirmada con la empresa (fit test, prueba o visita) | Kommo |
| Avance | Prueba realizada | La prueba ocurrió y quedó registrada | Kommo |
| Avance | Cotización emitida | Monto y fecha | Kommo |
| Resultado | **Venta ganada / perdida + motivo** | Estado final con motivo de la lista cerrada que ya usa ARMOR | Kommo |
| Eficiencia | Costo por contacto, **costo por calificado**, **costo por inspección**, costo por venta | Inversión del canal ÷ eventos atribuidos a ese canal (último origen pagado conocido) | Cálculo |
| Velocidad | Tiempo a primera respuesta; días lead → inspección | Mediana por país | Kommo |
| Perú | Alcance único en la audiencia, engagement rate, visitas a la landing, lista "aviso 2027" | Ver la sección 3.4 | Plataformas / GA4 |

**Atribución:** último origen pagado conocido en Kommo. Además se registran las conversiones que cada plataforma
atribuye por su cuenta (LinkedIn también cuenta view-through). No se suman entre sí: se reportan por separado.

---

## 5. Privacidad y consentimiento (orientación; no es asesoría legal)

Aplica a la captura en landings, chats y formularios, al uso de cookies y tags publicitarios, a la carga de datos
hasheados a Google y LinkedIn y a la entrega de leads a distribuidores. **Debe validarlo un abogado local de cada
país antes del lanzamiento.**

### Ecuador: LOPDP

- **Norma:** Ley Orgánica de Protección de Datos Personales, Registro Oficial Suplemento 459, 26/05/2021
  ([FAOLEX, copia con paginación oficial](https://faolex.fao.org/docs/pdf/ecu213345.pdf)). Reglamento: Decreto
  Ejecutivo 904, noviembre de 2023 ([ESPOL, texto](https://www.dspace.espol.edu.ec/bitstream/123456789/58917/1/REGLAMENTO%20GENERAL%20DE%20LA%20LEY%20ORG%C3%81NICA%20DE%20PROTECCI%C3%93N%20DE%20DATOS%20PERSONALES.pdf);
  [EY](https://www.ey.com/content/dam/ey-unified-site/ey-com/es-ec/technical/tax/documents/ey-legal-alert-nov1-reglamento-lopdp.pdf)).
- **Sanciones (fuentes secundarias coincidentes):** al sector privado, 0,1–0,7 % del volumen de negocio del ejercicio
  anterior para infracciones leves y 0,7–1 % para graves. La Superintendencia emitió un reglamento de cálculo de
  multas ([GlobalSuite](https://www.globalsuitesolutions.com/es/cuatro-meses-para-empresas-y-organismos-publicos-ecuatorianos-y-lopdp/);
  [Lexis](https://www.lexis.com.ec/noticias/superintendencia-de-proteccion-de-datos-personales-expide-reglamento-para-calculo-de-multas-por-infracciones-a-la-ley-de-proteccion-de-datos)).
  El número de artículo no se verificó contra el texto oficial.
- **Transferencias:** la Superintendencia emitió una norma general de transferencias nacionales e internacionales en
  2026. Según análisis de terceros, los flujos a países de la CAN (Perú y Colombia) se reconocen con nivel adecuado
  ([LexLatin](https://lexlatin.com/entrevistas/ecuador-regula-transferencias-datos-personales-riesgo-fuga-datos);
  [Lexis](https://www.lexis.com.ec/noticias/registro-oficial-del-dia-superintendencia-expide-norma-general-sobre-transferencias-nacionales-e-internacionales-de-datos-personales)).
  Hay discrepancia de fechas entre fuentes: verificar.
- **Práctica:** consentimiento libre, específico, informado e inequívoco, con casilla no premarcada. Informar las
  finalidades: contacto comercial, asesoría o inspección, y medición publicitaria. Informar la comunicación de datos
  a distribuidores y a Google y LinkedIn como encargados o terceros. Permitir el ejercicio de derechos.

### Perú: Ley 29733 y nuevo reglamento

- **Norma:** Ley 29733 + Reglamento aprobado por **D.S. 016-2024-JUS**, publicado el 30/11/2024 y vigente unos 120 días
  después, a fines de marzo de 2025; las fuentes difieren entre el 29, 30 y 31/03
  ([gob.pe – ANPD](https://www.gob.pe/institucion/anpd/normas-legales/6554453-16-2024-jus);
  [CMS](https://cms.law/en/per/publication/nuevo-reglamento-de-proteccion-de-datos-personales);
  [EY Perú](https://www.ey.com/es_pe/insights/law/proteccion-datos-personales-peru-nuevo-reglamento)).
  gob.pe devolvió error al leerlo directo; la vigencia proviene de fuentes secundarias.
- **Puntos clave (fuentes secundarias):**
  - El reglamento **admite el primer contacto para obtener el consentimiento con fines publicitarios y de
    prospección**.
  - Se aplica a empresas extranjeras que ofrezcan bienes o servicios a personas en Perú o elaboren perfiles de ellas.
    **Una campaña de visibilidad dirigida a Perú cae dentro del ámbito.**
  - Oficial de datos personales con plazos escalonados; notificación de incidentes; directiva de diciembre de 2025
    sobre el oficial de datos y la metodología de multas
    ([LexLatin](https://lexlatin.com/reportajes/proteccion-datos-personales-peru-empresas-oficial-cumplimiento-reforma)).
- **Práctica:** si en Perú se captura un "aviso 2027", consentimiento expreso para comunicaciones comerciales. Evaluar
  con un abogado la inscripción del banco de datos ante la autoridad (Registro Nacional de Protección de Datos
  Personales) y el flujo transfronterizo (datos alojados en Kommo, Google y LinkedIn).

### Colombia: Ley 1581 de 2012

- **Norma:** Ley 1581 de 2012. La autorización debe ser **previa, expresa e informada**
  ([Función Pública – Ley 1581](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=49981)). Decreto
  reglamentario compilado en el Decreto 1074 de 2015.
- **RNBD:** la inscripción en el Registro Nacional de Bases de Datos de la SIC es obligatoria para sociedades con
  activos totales superiores a 100.000 UVT (Decreto 090 de 2018). Exige actualización anual y cambios sustanciales
  ([Brigard Urrutia](https://www.bu.com.co/es/insights/noticias/empresas-bajo-la-lupa-de-la-sic-para-el-registro-de-bases-de-datos);
  [Decreto 090](https://www.saludcapital.gov.co/Normo/tic/decreto_0090_de_2018.pdf)). Verificar qué entidad es el
  responsable en Colombia: ¿Indecaucho o DANAMO?
- **Ley 2300 de 2023 ("Dejen de fregar"):** limita horarios y frecuencia de contacto, con un parágrafo sobre mensajes
  publicitarios por SMS, apps, correo y llamadas. Su alcance principal son las entidades vigiladas por la
  Superintendencia Financiera y la cobranza
  ([Función Pública – Ley 2300](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=213990)). **No
  confirmamos que aplique a un fabricante de EPP.** Como buena práctica, igual conviene respetar horario hábil en
  los seguimientos por WhatsApp.
- **Práctica:** casilla de autorización con enlace a la política de tratamiento de Colombia. Si el lead se deriva a
  DANAMO, informarlo como transmisión o transferencia a un tercero identificado.

### Común a los tres países (SUPUESTOS operativos)

1. **Política de privacidad por país**, enlazada desde la landing, el chat y el Lead Gen Form. LinkedIn pide la URL de
   política de privacidad en el formulario (verificar en Campaign Manager; no se consultó en esta corrida). Agregar
   una casilla de consentimiento personalizada en el LGF.
2. **Banner de consentimiento** para GA4, Insight Tag y Google tags, con rechazo tan fácil como aceptar. Sin
   consentimiento no se guardan `gclid` ni `li_fat_id` en cookies; el lead puede entrar igual, sin atribución.
3. **Carga a Google y LinkedIn:** sólo datos hasheados (SHA-256, email en minúsculas) y declarada en la política
   (medición y optimización publicitaria). Es un flujo internacional de datos hacia los proveedores.
4. **WhatsApp:** las conversaciones iniciadas por el usuario permiten responder. Para enviar plantillas de marketing
   después hace falta opt-in explícito. Separar ventas de postventa como ya hacen.
5. **Minimización:** no pedir datos sensibles. No guardar en Kommo información de salud de trabajadores de las
   pruebas de ajuste más allá de lo necesario para la propuesta comercial.
6. Antes de producir textos legales, conviene pasar por la skill `legal-privacy-ip-operator` y por un abogado local.

---

## 6. Qué pedir a ARMOR para cerrar la propuesta

1. **Exportación de Kommo de los últimos 12 meses**, anonimizada: fecha, país, línea, origen si existe, etapas con
   fechas, ganado/perdido y motivo, y monto si se puede. Sirve para calibrar las tasas lead → calificado →
   inspección → venta y el ticket.
2. **Capacidad de asesores** por país y ciudad (inspecciones por semana) y SLA de respuesta en WhatsApp.
3. **Regla de canal** (directo vs. distribuidor) por país y tipo de cliente. Rol de DANAMO en Colombia.
4. **Validación técnica** de claims, equivalencias y compatibilidades, y política de muestras.
5. **Accesos:** Kommo (admin), sitio y GTM, Business portfolio de Meta (WhatsApp), Google Ads y Campaign Manager
   (o creación a nombre de ARMOR), página de LinkedIn.
6. **Lista ABM** de empresas objetivo por país y sector.
7. **Ticket promedio y margen de contribución.** Sin ellos no se puede calcular un CPA objetivo ni el retorno.

---

## Fuentes (consultadas el 27/10/2026)

**Datos propios de herramienta**

- Semrush MCP, `keyword_research` → `phrase_these` (bases `ec`, `pe`, `co`) y `phrase_adwords` (`no_data`):
  https://www.semrush.com/analytics/keywordoverview/

**LinkedIn (primarias)**

- Target audience size best practices: https://www.linkedin.com/help/lms/answer/a423690
- Presupuesto y buenas prácticas: https://business.linkedin.com/advertise/ads/best-practices/maximize-your-budget · https://www.linkedin.com/help/lms/answer/a422101
- Audiencias: https://business.linkedin.com/advertise/ads/audience
- Lead Gen Form hidden fields: https://www.linkedin.com/help/lms/answer/a421421/
- Conversions FAQ (Microsoft Learn, ms.date 16/09/2026): https://learn.microsoft.com/en-us/linkedin/marketing/conversions/conversions-faq

**LinkedIn (benchmarks de terceros)**

- ZenABM, LinkedIn Ads Benchmarks 2026: https://zenabm.com/blog/linkedin-ads-benchmarks-2026.md
- Huble, LinkedIn Ads benchmarks for 2025 (datos 2024): https://www.huble.com/blog/linkedin-ads-benchmarks
- Web Tonic, Manufacturing LinkedIn Ads Benchmarks (2026): https://www.webtonic.io/blog/manufacturing-linkedin-ads-statistics
- NAV43, Conversation Ads 2025: https://nav43.com/blog/linkedin-conversation-ads-benchmarks-the-complete-2025-guide-to-costs-high-converting-flows/
- Singlegrain, Conversation Ads: https://www.singlegrain.com/lead-generation/linkedin-conversation-ads-strategy/
- Shopify, Conversation Ads: https://www.shopify.com/blog/linkedin-conversation-ads
- Factors.ai, LinkedIn ads cost: https://www.factors.ai/blog/linkedin-ads-cost
- Upgrowth, LinkedIn advertising cost: https://upgrowth.in/linkedin-advertising-cost/
- NapoleonCat (usuarios LinkedIn): https://napoleoncat.com/stats/linkedin-users-in-ecuador/2025/05 · https://napoleoncat.com/stats/linkedin-users-in-peru/2025/02 · https://stats.napoleoncat.com/linkedin-users-in-colombia/2025/06/

**Google Ads**

- LocaliQ, Search Advertising Benchmarks 2026: https://localiq.com/blog/search-advertising-benchmarks/
- Política de marcas: https://support.google.com/adspolicy/answer/6118
- Message assets: https://support.google.com/google-ads/answer/14888522
- Enhanced conversions for leads: https://support.google.com/google-ads/answer/15713840?hl=en
- Offline conversion imports: https://support.google.com/google-ads/answer/2998031
- Conversiones offline por GCLID: https://support.google.com/google-ads/answer/7012522
- PMax B2B (terceros): https://nav43.com/blog/when-not-to-use-performance-max-for-lead-generation-the-decision-framework-most-advertisers-are-missing/ · https://www.lunio.ai/blog/performance-max-for-b2b-lead-gen · https://www.techwyse.com/news/platform-updates/google-performance-max-pay-per-lead-goals-lsa
- Demand Gen B2B (terceros): https://bootstrapcreative.com/what-are-demand-gen-google-ads/ · https://nav43.com/blog/google-demand-gen-vs-performance-max-a-funnel-strategy-for-b2b-brands/

**Kommo e integraciones**

- Track WhatsApp ad campaigns with UTMs: https://support.kommo.com/docs/track-whatsapp-ad-campaigns-with-utms.md
- API Website Chat Button (`setMeta`): https://developers.kommo.com/docs/api-crm-plugin
- LinkedIn Lead Gen Forms → Kommo: https://support.kommo.com/docs/connect-linkedin-lead-gen-forms-to-kommo.md
- WhatsApp Business: https://www.kommo.com/integrations/whatsapp/ · https://kommo.com/support/kb/whatsapp-cloud-api-how-to-connect
- Make con Kommo: https://www.kommo.com/support/integrations/make-formerly-integromat-how-to-use/
- Zapier, app Kommo: https://zapier.com/apps/kommo/integrations/paths · hilo de comunidad: https://community.zapier.com/troubleshooting-99/trigger-leads-status-change-in-kommo-empty-leads-30277
- Zapier, LinkedIn Conversions: https://zapier.com/es/l/linkedin-conversions-integration
- Landbot, UTMs en WhatsApp (patrón de terceros): https://landbot.io/blog/how-to-track-conversions-whatsapp-lead-generation

**Privacidad**

- Ecuador LOPDP (FAOLEX): https://faolex.fao.org/docs/pdf/ecu213345.pdf
- Ecuador, Reglamento (ESPOL): https://www.dspace.espol.edu.ec/bitstream/123456789/58917/1/REGLAMENTO%20GENERAL%20DE%20LA%20LEY%20ORG%C3%81NICA%20DE%20PROTECCI%C3%93N%20DE%20DATOS%20PERSONALES.pdf
- EY Ecuador, alerta del reglamento: https://www.ey.com/content/dam/ey-unified-site/ey-com/es-ec/technical/tax/documents/ey-legal-alert-nov1-reglamento-lopdp.pdf
- Multas LOPDP: https://www.globalsuitesolutions.com/es/cuatro-meses-para-empresas-y-organismos-publicos-ecuatorianos-y-lopdp/ · https://www.lexis.com.ec/noticias/superintendencia-de-proteccion-de-datos-personales-expide-reglamento-para-calculo-de-multas-por-infracciones-a-la-ley-de-proteccion-de-datos
- Transferencias Ecuador: https://lexlatin.com/entrevistas/ecuador-regula-transferencias-datos-personales-riesgo-fuga-datos · https://www.lexis.com.ec/noticias/registro-oficial-del-dia-superintendencia-expide-norma-general-sobre-transferencias-nacionales-e-internacionales-de-datos-personales
- Perú D.S. 016-2024-JUS: https://www.gob.pe/institucion/anpd/normas-legales/6554453-16-2024-jus · https://cms.law/en/per/publication/nuevo-reglamento-de-proteccion-de-datos-personales · https://www.ey.com/es_pe/insights/law/proteccion-datos-personales-peru-nuevo-reglamento · https://lexlatin.com/reportajes/proteccion-datos-personales-peru-empresas-oficial-cumplimiento-reforma
- Colombia Ley 1581: https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=49981
- Colombia RNBD: https://www.bu.com.co/es/insights/noticias/empresas-bajo-la-lupa-de-la-sic-para-el-registro-de-bases-de-datos · https://www.saludcapital.gov.co/Normo/tic/decreto_0090_de_2018.pdf
- Colombia Ley 2300 de 2023: https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=213990

**Contexto interno de la cuenta**

- Auditoría de demanda digital del 26/10/2026: `../2026-10-26-digital-demand-audit.md`
- Notas posteriores a la reunión: `../POSTREUNION.md`
