# Performance media — canales, partners, precios y demanda: market update 2026-09-10

> **Fecha de corte:** 2026-09-10
> **Tipo:** investigación comercial fechada (complementa la de 2026-07-26; no la reemplaza)
> **Estado:** evidencia para validación; no autoriza claims, precios públicos ni venta general
> **Owner:** Efeonce Strategy + Commercial + Media & Distribution
> **Consumidores:** [decisión de oferta](../../architecture/EFEONCE_PERFORMANCE_COMMERCE_DISTRIBUTION_DECISION_V1.md) ·
> [ficha](../../services/media-distribution/PERFORMANCE_COMMERCE_DISTRIBUTION_SERVICE_V1.md) ·
> [pricing pack](../../business-models/media-distribution/PERFORMANCE_COMMERCE_PRICING_INTEGRITY_PACK_V1.md) ·
> [PDR-022](../../public-site/decisions/PDR-022-landing-performance-marketing-posicionamiento.md)

**Convenciones.** `[V]` verificado en la fuente enlazada; `[V-prov]` fuente oficial del proveedor, cuyas cifras de
desempeño son claims propios; `[V-sec]` blog o proveedor que es juez y parte, útil como ejemplo y no como estadística;
`[INF]` inferencia. "No encontrado" significa que se buscó y no hay fuente confiable: no se estima. Tipo de cambio:
USD 1 = CLP 925,97 (dólar observado 2026-09-10, [SII](https://www.sii.cl/valores_y_fechas/dolar/dolar2026.htm)).

## 1. Demanda de búsqueda en Chile

Fuente: Semrush, bases `cl`, `mx` y `co`, consultada 2026-09-10; volumen = promedio de 12 meses. Varios términos
"agencia…" tienen tendencia con picos: el promedio infla el mes típico. El gateway SEO de Efeonce no tenía estos
términos trackeados (`found=false`), por lo que no aportó datos.

| Término | Vol. CL | KD | Intención | MX / CO |
|---|---:|---:|---|---|
| agencia performance marketing | 590* | 11 | informacional | 20 / — |
| agencia de performance marketing | 480* | 13 | comercial | 10 / 10 |
| performance marketing | 140 | 29 | informacional | 260 / 170 |
| paid media | 480 | 18 | informacional (SERP de empleo y formación) | 480 / 320 |
| agencia google ads | 50* | 28 | informacional | 170 / 40 |
| agencia de google ads | 20 | 0 | — | 260 / 260 |
| agencia facebook ads | 30 | 0 | — | 30 / 30 |
| publicidad en linkedin | 20 | 0 | — | 110 / 40 |
| publicidad programática | 20 | 0 | — | 50 / 50 |
| agencia de marketing b2b | 390* | 9 | informacional con SERP comercial | 20 / 210 |
| agencia de medios digitales | 30 | 32 | comercial | 110 / 30 |
| agencia de marketing digital (referencia) | 590 | 14 | comercial | 2.400 / 1.300 |

\* picos: `[INF]` el mes típico de "agencia (de) performance marketing" ronda 130–270 y el de "agencia de marketing b2b"
~175.

**Corrección a PDR-008.** PDR-008 midió "performance marketing" (140, informacional) y no las dos variantes comerciales
"agencia (de) performance marketing" (480 y 590, KD 11–13). Además citó ~2.400/mes para "agencia de marketing digital":
Semrush `cl` da hoy 590; 2.400 es el valor de `mx`.

**SERP.** "agencia de performance marketing" (CL): páginas de servicio chilenas, dos rankings auto-publicados de Muller
y Pérez, blogs y empleos; sin AI Overview. "agencia google ads" (CL): calidad floja, dominios españoles, ranking de
Muller y Pérez; sin AI Overview. "agencia de marketing b2b" (CL): comercial, con AI Overview. Nexbu aparece en casi todas
con una página por servicio. `[V]` Semrush `phrase_organic`.

**Efeonce hoy.** Cero keywords en paid media, performance, ads, medios o B2B en CL, MX o CO; lo que rankea es inbound y
marca. `[V]` Semrush `domain_organic`.

## 2. Plataformas — estado 2026

| Plataforma | Qué cambió | Fuente |
|---|---|---|
| Google | AI Max for Search en beta abierta desde 2025-05-27. Desde septiembre de 2026 no se crean campañas nuevas con Dynamic Search Ads, assets creados automáticamente ni broad match a nivel de campaña; la migración automática de DSA a AI Max se postergó a febrero de 2027 | `[V-prov]` [Google Ads blog](https://blog.google/products/ads-commerce/dsa-upgrade-to-ai-max-2026/), [Ads Developers](https://ads-developers.googleblog.com/2025/05/google-ads-ai-max-for-search-campaigns-open-beta.html) |
| Google PMax | reporte por canal; hasta 10.000 negativas por campaña que sólo filtran Search y Shopping; exclusión de audiencias propias en 2026 | `[V-prov]` [soporte](https://support.google.com/google-ads/answer/16260130); `[V-sec]` [Search Engine Land](https://searchengineland.com/google-ads-expands-negative-keyword-limits-pmax-453154) |
| Meta | estructura Advantage+ unificada desde 2025-05-29; APIs legacy bloqueadas desde 2026-05-19. **Atribución desde 2026-03-03:** click-through cuenta sólo clics en el link; likes, shares y saves pasan a "engage-through" de 1 día | `[V-sec]` [ppc.land](https://ppc.land/meta-deprecates-legacy-campaign-apis-for-advantage-structure/), [Search Engine Land](https://searchengineland.com/meta-introduces-click-and-engage-through-attribution-updates-470629) |
| Meta / WhatsApp | anuncios en Status y canales promocionados anunciados en 2025-06 | `[V-prov]` [Meta](https://about.fb.com/news/2025/06/helping-you-find-more-channels-businesses-on-whatsapp/) |
| TikTok | Smart+ modular, Symphony, GMV Max (2025-10). TikTok Shop: Brasil y México lanzados; **Chile sin fecha oficial** a 2026-08 | `[V-prov]` [TikTok newsroom](https://newsroom.tiktok.com/en-us/tiktok-announces-new-automation-updates-for-advertisers); `[V-sec]` [DF](https://www.df.cl/senal-df/tiktok-shop-el-e-commerce-del-gigante-chino-que-se-acerca-a-chile) |
| LinkedIn | Conversions API vigente; campañas CTV en Marketing API; BrandLink sólo por invitación. CPC de LATAM: no hay cifra confiable | `[V-prov]` [LinkedIn help](https://www.linkedin.com/help/lms/answer/a1655394), [Microsoft Learn](https://learn.microsoft.com/en-us/linkedin/marketing/integrations/recent-changes) |
| Retail media LATAM | +44,5% en 2025 a USD 2.640 M (eMarketer citado por Mercado Ads; Mercado Ads declara ~60%). En Chile operan Mercado Ads, Walmart Connect, Cencosud Media, Fmedia (Falabella), Sodimac Media y Ripley Media | `[V-sec]` [ANDA](https://anda.cl/mercado-ads-reunio-a-lideres-de-la-industria-marcas-y-agencias-del-pais-para-presentar-su-propuesta-de-negocio-integral-para-este-2026/), [ANDA Retail Media Summit](https://anda.cl/retail-media-summit-chile-2026/) |
| Mercado Chile | inversión publicitaria en medios ~CLP 1,07 billones en 2026 | `[V]` [AMDD](https://www.amddchile.com/aam-proyecta-que-la-inversion-publicitaria-en-medios-alcanzaria-107-billones-en-chile-durante-2026/) |

**Regulación.** La Ley 21.719 de protección de datos personales se publicó el 2024-12-13 y entra en plena vigencia el
**2026-12-01**: agencia de protección de datos, derechos ARCO, notificación de brechas y multas. `[V-sec]`
[Thomson Reuters](https://www.thomsonreuters.cl/es-cl/soluciones-juridicas/biblioteca-contenido-legal/ley-21719-y-la-reconstruccion-del-derecho-chileno-de-proteccion-de-datos-personales),
[Gobierno Digital](https://wikiguias.digital.gob.cl/datos-personales/guia-practica-implementacion-nueva-ley-datos-personales).
Afecta directamente el envío de datos first-party a plataformas (Customer Match, Conversions API, conversiones offline).
La interpretación para cada cliente es de Legal.

## 3. Programas de partners

| Programa | Requisitos verificados | Fuente |
|---|---|---|
| **Google Partners** | optimization score ≥70% en la cuenta de administrador; USD 10.000 de gasto en 90 días sumando cuentas gestionadas; ≥50% de strategists certificados y una certificación por área de producto con ≥USD 500 en 90 días. **Premier** = top 3% de empresas del país, evaluado anualmente; puede no estar disponible en todos los países | `[V-prov]` [Google Ads help](https://support.google.com/google-ads/answer/9702452) |
| Google Premier en Chile | 26 agencias (tercero) | `[V-sec]` [Canal Cero](https://canalcero.com/blog/google-partner-premier-chile/) |
| **Meta Business Partners** | negocio verificado obligatorio para el badge; especialidades agencia y comercio. **Umbrales de gasto no publicados**; terceros se contradicen | `[V-prov]` [Meta](https://www.facebook.com/business/marketing-partners/become-a-partner/fmp-product-policies) |
| **TikTok** | Agency Incubator, Business Center y Marketing Partners visibles. Channel Sales Partner Program sólo Norteamérica y Europa. Agency Advantage sólo en terceros | `[V-prov]` [TikTok agencies](https://ads.tiktok.com/business/en/industries/agencies), [Channel Sales](https://ads.tiktok.com/business/en-US/blog/channel-sales-partners) |
| **LinkedIn Marketing Partners** | el directorio incluye agencias (Campaign Management, Lead Generation, B2B Attribution, etc.); requisitos de ingreso no publicados | `[V-prov]` [LinkedIn](https://business.linkedin.com/marketing-solutions/marketing-partners/find-a-partner) |
| **Microsoft Advertising** | tiers Partner, Select y Elite; umbrales no encontrados | `[V-prov]` [Microsoft](https://about.ads.microsoft.com/en/blog/post/february-2026/celebrating-a-year-of-achievement-and-excellence-microsoft-advertising-partner-program-2026) |
| **Amazon Ads** | partner status actualizado en EE.UU., Canadá, México, UE, Australia y Japón; **Chile no aparece** | `[V-prov]` [Amazon Ads](https://advertising.amazon.com/resources/whats-new/partner-status-update) |
| **Mercado Ads** | Agency Partner Program para mercados hispanos: capacitación, visibilidad ante sellers, contenido; ingreso por validación. Requisitos de inversión no encontrados | `[V-sec]` extractos de partners.mercadolibre.com.ar (403 al abrir) |

## 4. Programmatic vía partner

| Hecho | Fuente |
|---|---|
| MiQ compró el negocio LATAM de Adsmovil (2026-03-25); 12 mercados, Chile incluido; programmatic omnicanal, commerce media, DOOH, CTV | `[V]` [MiQ](https://www.wearemiq.com/latam/resources/news/miq-acquires-adsmovil) |
| TenX se presenta como partner de DV360 con presencia en CL, MX, CO y PE | `[V-sec]` [TenX](https://www.tenx.lat) |
| El DSP de Microsoft (ex Xandr) dejó de operar compra el 2026-02-28 | `[V]` [Digiday](https://digiday.com/media-buying/microsoft-advertising-is-closing-the-xandr-dsp/) |
| Take rate de The Trade Desk ~20%; trading desk 10–20% adicional; costo apilado 20–35% y más de 40% con porcentajes acumulados | `[V-sec]` [mediaplanningtool](https://www.mediaplanningtool.com/the-trade-desk/pricing), [Clearcode](https://clearcode.cc/blog/what-is-an-agency-trading-desk/), [mrktcorrect](https://mrktcorrect.com/blog/programmatic-advertising-agency-cost) |
| ANA 2023: 36 centavos de cada dólar que entra al DSP llegan al consumidor; 29% en costos de transacción y 35% en pérdida de productividad (no visibles, tráfico inválido, MFA) | `[V]` [estudio ANA](https://www.adslot.com/wp-content/uploads/2023/12/ana-programmatic-media-supply-chain-transparency-study.pdf) |
| ANA Q2 2025: USD 26.800 M desperdiciados; los PMP concentran ~88% del gasto | `[V]` [ANA](https://www.ana.net/content/show/id/pr-2025-08-programmatictrans) |
| Compra "principal" con markups de 30–90% documentada en estudio ANA de rebates | `[V]` [AdExchanger](https://www.adexchanger.com/agencies/ana-study-details-widespread-agency-rebate-practices/) |
| CTV en Chile: LG Ad Solutions vía EXTE; Mercado Ads con alianzas CTV (Disney+, Roku); planes con anuncios de Disney+, HBO Max y Netflix existen. Compra programática de ese inventario y mínimos: no encontrado | `[V-sec]` [Pulso Capital](https://pulsocapital.com/exte-fortalece-su-crecimiento-en-latinoamerica-con-lg-ad-solutions/), [ANDA](https://anda.cl/mercado-ads-reunio-a-lideres-de-la-industria-marcas-y-agencias-del-pais-para-presentar-su-propuesta-de-negocio-integral-para-este-2026/) |

Mínimos y fees de trading desks en Chile: **no encontrado** — se piden por escrito a cada candidato.

## 5. Precios de mercado

### Modelos

| Modelo | Rango | Fuente |
|---|---|---|
| % de la inversión | 10–20%, decreciente con la escala | `[V]` [AgencyAnalytics](https://agencyanalytics.com/blog/ppc-pricing) |
| Fee fijo | USD 500–2.000 cuentas chicas y medianas; >USD 5.000 complejas | `[V]` AgencyAnalytics |
| Híbrido | base + % sobre umbral (ej. USD 1.000 o 15%, lo mayor) | `[V-sec]` [ppc.io](https://ppc.io/blog/ppc-pricing) |
| Performance puro | descrito como impracticable por volatilidad | `[V]` AgencyAnalytics |
| Retainers de agencias digitales | 91% ofrece retainer; el más común < USD 5 mil/mes; margen neto promedio 13% (n=1.452) | `[V]` [Promethean 2025](https://prometheanresearch.com/2025-digital-agency-industry-report/) |
| Anunciantes grandes | 82% usa fees; las comisiones sobreviven más en medios (19%) | `[V]` [ANA](https://www.ana.net/content/show/id/20256) |
| Auditoría senior | USD 1.000–5.000 | `[V-sec]` [Conner Crowe](https://connercrowe.com/google-ads-audit-cost/) |
| Setup server-side + CAPI | USD 2.000–5.000; complejo USD 6.000–14.400 | `[V-sec]` [Cometly](https://www.cometly.com/post/server-side-tracking-cost), [TrackingFixes](https://trackingfixes.com/server-side-tracking-cost/) |
| LinkedIn: mínimo práctico | USD 50–100/día por campaña (USD 1.500–3.000/mes) | `[V-sec]` [Stackmatix](https://www.stackmatix.com/blog/linkedin-ads-minimum-daily-budget-2026) |
| Agencias B2B de LinkedIn | USD 1.500–5.000/mes un canal; USD 5.000–15.000 multicanal; 6–20% de inversión | `[V-sec]` [SaaS Hero](https://www.saashero.net/competitor/compare-linkedin-agency-pricing-models/) |

### Chile y LATAM (fee mensual de gestión)

| Actor / tramo | Precio publicado | Fuente |
|---|---|---|
| Kroki (Google Ads) | CLP 100–250 mil + IVA según pauta | `[V]` [kroki.cl](https://kroki.cl/google-ads-precios-chile/) |
| Freelance un canal | CLP 400–700 mil | `[V-sec]` [Alan Melnick](https://www.alanmelnick.com/blog/consultor-paid-media) |
| Bigbuda | desde CLP 450 mil (Google Ads); 790 mil (360) | `[V]` [bigbuda.cl](https://bigbuda.cl/insights/mejores-agencias-performance-marketing-chile) |
| Muller y Pérez | plan de entrada CLP 950 mil; performance "desde 1.490.000" | `[V]` [mulleryperez.cl](https://www.mulleryperez.cl/servicios/performance-marketing) |
| Relevant | USD 1.000–2.000 hasta >USD 10.000 | `[V]` [relevantmkt.com](https://relevantmkt.com/marketing-digital-chile/) |
| Tramo corporativo | desde CLP 1,5 M + producción; holdings no publican | `[V-sec]` [Marketboost](https://agenciamarketboost.com/precios-agencia-marketing-digital-chile) |
| Referentes globales "growth como sistema" | Tinuiti USD 10–25 mil por canal; Power Digital USD 10–25 mil; NoGood >USD 20 mil | `[V-sec]` [groas](https://www.groas.com/post/tinuiti-pricing-review-2026-what-they-charge-groas-alternative), [Omniscient](https://beomniscient.com/blog/growth-marketing-agency/) |

`[INF]` En Chile domina el fee fijo con tramos por inversión. El techo publicado ronda CLP 1,5 M/mes; por encima,
nadie publica. Los competidores con foco B2B (Loup, Nexbu, Cebra, Rompecabeza) no publican precio.

### Competidores Chile

| Agencia | Posicionamiento | Precio público | Badges declarados | Foco |
|---|---|---|---|---|
| Muller y Pérez | performance orientado a CAC; rankings auto-publicados | sí | capacidad en Google/Meta/TikTok/LinkedIn, sin badge verificable | B2B + B2C |
| Bigbuda | CRO-first | sí | Google Partner, HubSpot | mixto |
| Loup | reporta leads y reuniones | no | Google Partner | B2B e industrial |
| Milimetrix | SEO + AEO + paid, origen e-commerce | no | ninguno visible | B2C/retail |
| Moov (Metrix/VOU) | holding; VOU "AI-powered growth partner" | no | Metrix Google Premier | enterprise |
| Cebra | growth + software | no | HubSpot Elite | B2B |
| Nexbu | demand gen B2B + tecnología | no | Google Ads certificado | B2B |
| Rompecabeza | creatividad + performance | no | Google Partner, Meta | B2B |

Fuentes: sitios de cada agencia, consultados 2026-09-10 (enlaces en el informe del agente, conservados en la sesión).
Los claims de competidores (ROAS, inversión gestionada) no son verificables.

## 6. Costo de talento en Chile (bruto mensual)

| Rol | CLP/mes | Fuente |
|---|---|---|
| Especialista marketing digital (proxy paid media specialist) | p25 1,95 M · p50 2,20 M · p75 2,64 M | `[V]` [Robert Half 2026](https://www.roberthalf.com/cl/es/vacantes-detalles/jefe-de-marketing-digital) |
| Jefe marketing digital (proxy paid media lead) | 2,84 M · 3,20 M · 3,84 M | `[V]` Robert Half 2026 |
| Performance Marketing Manager | ≈4,86 M (n=48, 2026-04) | `[V]` [TalentUp](https://talentup.io/es/salary/Performance%20Marketing%20Manager/Chile) |
| Programmatic trader | no encontrado | — |

Catálogo interno Greenhouse (`data/pricing/seed/sellable-roles-pricing.csv`, USD/mes FTE, costo total): Paid Media
Manager 3.149 · Media Buyer 1.849 · Data Analyst 2.049 · Analista GA4/GTM/Looker 1.849 · CRO Specialist 2.049. El
catálogo **no tiene rol de Performance Lead/Strategist**.

## 7. Capacidad

Típico 4–8 cuentas por account manager; 20–30 cuentas pyme con reporting templatizado `[V-sec]`
[Sakas](https://sakasandcompany.com/how-many-accounts/). Con USD 1–3 M/mes de inversión, una agencia promedia 15,2
personas `[V-sec]` [State of PPC 2024 vía Reboot](https://www.rebootonline.com/ppc-statistics/); `[INF]` ≈ USD
65–200 mil/mes gestionados por persona.

## 8. Implicaciones para Efeonce — todas `[INF]`

1. El fee de entrada no compite en el tramo de un canal (CLP 100 mil–1,5 M): el sistema que Efeonce vende cuesta más de
   servir que un paquete de ejecución.
2. Existe hueco de precio entre el techo local publicado (~USD 1.600) y los globales (USD 10–25 mil): ahí se ancla la
   operación gestionada.
3. Tres eventos de mercado crean urgencia en el segundo semestre de 2026: el cambio de atribución de Meta (marzo), la
   migración forzada a AI Max (septiembre 2026 / febrero 2027) y la vigencia de la Ley 21.719 (diciembre). Los tres
   caen en la señal: son la mejor puerta para el Diagnostic.
4. El motion B2B tiene espacio de anclaje: los competidores B2B locales no publican precio y ninguno vende la conexión
   con la etapa del CRM como producto.
5. Programmatic se compra vía partner con cláusula de transparencia; MiQ (Adsmovil) y TenX son candidatos a evaluar.
6. Mercado Ads es el programa de plataforma de mayor retorno para commerce en Chile; Amazon Ads no aplica.
7. Google Partner es alcanzable y funciona como piso de credibilidad; Premier no es objetivo planificable.

## 9. Brechas abiertas

Umbrales oficiales del badge de Meta y de programas de agencia de TikTok en Chile; disponibilidad de Google Premier en
Chile; mínimos y fees de trading desks en Chile; compra programática de inventario de streaming en Chile; CPC de
LinkedIn por país; sueldos de programmatic trader; fees de redes de retail media. Los conectores Similarweb, Ahrefs y
Supermetrics no estaban autorizados en la sesión.
