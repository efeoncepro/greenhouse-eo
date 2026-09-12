# Performance Marketing Landing — SEO/AEO Brief V1

> **Estado:** hipótesis validada con Semrush en cinco países. La segunda fuente y la decisión de URL se cierran en el
> Slice 1 de `TASK-1865`.
> **Fecha:** 2026-09-11 · **Revisión:** V1.1, demanda y léxico por país
> **Owner:** Media & Distribution + Public Site
> **Posicionamiento:** [PDR-022](decisions/PDR-022-landing-performance-marketing-posicionamiento.md)
> **Wireframe y copy:** [`TASK-1865` wireframe](../ui/wireframes/TASK-1865-landing-performance-marketing.md)
> **Evidencia:** [investigación de términos por país 2026-09-11](../audits/public-site/PERFORMANCE_LANDING_KEYWORD_RESEARCH_BY_COUNTRY_2026-09-11.md)
> y [market update 2026-09-10](../audits/commercial/PERFORMANCE_MEDIA_CHANNELS_PARTNERS_PRICING_RESEARCH_2026-09-10.md)

## 1. Demanda por país

Una sola página en español para Chile, Perú, México y Colombia; Estados Unidos va aparte (ver §8). Ningún término
funciona en los cuatro países:

| País | Cabeza de la categoría | Término comercial principal | Observación |
|---|---|---|---|
| Chile | performance marketing | agencia (de) performance marketing, ~1.070/mes, KD 11–13, sin AI Overview | Única base donde "performance" tiene demanda comercial |
| Perú | publicidad digital | publicidad digital 720 (KD 18); agencia de marketing digital 720 (KD 53, con AI Overview) | "performance" casi no existe (10); "trafficker digital" 720 |
| México | publicidad digital | agencia de publicidad digital 140; agencia (de) google ads 430 | "mercadotecnia digital" 1.900; "pauta" débil |
| Colombia | publicidad digital · pauta | agencia de publicidad digital 590; familia "pauta" ~940 (KD 7–11) | "agencia de marketing b2b" 210, KD 12 |

**Efeonce hoy:** cero keywords de publicidad, anuncios, pauta o performance en las cinco bases.

**Validación pendiente (Slice 1):** segunda fuente con Keyword Planner o Search Console; backlinks y tráfico de la legacy.

## 2. SERP y oportunidad

- Chile, "agencia de performance marketing": sin AI Overview; local pack de agencias; top 10 con páginas de servicio, un
  ranking de Muller y Pérez, blogs e Indeed. Ganable con una página de servicio sustantiva.
- "agencia de marketing digital" en los cuatro países: local pack y home de agencias; con AI Overview sólo en Perú. Queda
  para la Home, no para esta landing.
- "paid media": SERP de empleo y formación con AI Overview; nunca slug ni H1.

## 3. Léxico que la página tiene que cubrir

| Dónde | Términos | Por qué |
|---|---|---|
| Title | agencia de performance marketing · publicidad digital | Las dos cabezas: Chile y el resto |
| H1 | performance marketing | Término del posicionamiento y cabeza chilena |
| Línea de léxico de R2 | paid media · publicidad digital · pauta digital · campañas pagadas | Cada país nombra la categoría distinto |
| H3 de canales | Google Ads (SEM) · Meta Ads: Facebook e Instagram · TikTok Ads · LinkedIn Ads · Programmatic · Retail media y Mercado Ads · Anuncios en ChatGPT · X Ads | Nombres que se buscan; "anuncios en Facebook" 110–1.000 según país |
| Módulo de operación | media buyers y traffickers | Rol del operador en Chile (320) y Perú (720) |
| Sección B2B | marketing B2B | CL 390 y CO 210 para "agencia de marketing b2b", KD 9–12 |
| FAQ | qué es Google Ads y cómo funciona · qué es la pauta digital · cuánto hay que invertir en publicidad digital | Preguntas con volumen y AI Overview |

**No usar como objetivo:** "tiktok ads", "facebook ads", "meta ads" y "linkedin ads" sueltos (navegacionales hacia la
plataforma); "pauta" sola (Chile: Radio Pauta, pauta de cotejo); "trafficker" solo; "promoción google ads"; "campañas
sociales" y "anuncios sociales" (México: causas sociales); "medios pagados", "marketing de resultados" y "gestión de
campañas digitales" (sin demanda).

## 4. Intención y query fan-out

| Pregunta real | Dónde se responde |
|---|---|
| ¿Qué es el performance marketing? | R2, cápsula 1 + FAQ 1 |
| ¿Qué hace una agencia de performance marketing? | R2, cápsula 2 + FAQ 2 |
| ¿Cuánto cobra una agencia de performance marketing o de Google Ads? | FAQ 3 (modelo, sin tarifa) |
| ¿Cuánto hay que invertir en publicidad digital? | FAQ 4 |
| ¿Las cuentas quedan a mi nombre? | R11 + FAQ 5 |
| ¿Hacen auditoría de Google Ads? | FAQ 7 |
| ¿Trabajan LinkedIn Ads para B2B? | R8 + FAQ 8 |
| ¿Compran programmatic? | R8 + FAQ 9 |
| ¿Se puede anunciar en ChatGPT en Chile? | R8 + FAQ 10 |
| ¿Qué cambia con la Ley 21.719 para la publicidad? | R4 + FAQ 11 |
| ¿Garantizan resultados? | R11 + FAQ 12 |
| ¿Qué es Google Ads y cómo funciona? / ¿Qué es SEM? | FAQ 13 (CL 260 + 210, PE 320 + 170, CO 720, MX 320) |
| ¿Qué es la pauta digital? / ¿Qué es pautar? | FAQ 14 (CO 170 "qué es pautar", familia pauta ~940) |

## 5. Cápsulas

- Primera oración responde la pregunta literal; 40 a 60 palabras; bajo un H2 o un `<summary>` con la pregunta.
- Las cápsulas de R2 y las respuestas 1 y 2 del FAQ son el mismo texto, para que `FAQPage` marque exactamente lo visible.
- Las cápsulas de ChatGPT Ads y de la Ley 21.719 llevan fecha. ChatGPT Ads no tiene demanda en español medible: es
  diferenciador y contenido citable, no objetivo de keyword.

## 6. Metadata

| Campo | Valor |
|---|---|
| Title | `Agencia de performance marketing y publicidad digital \| Efeonce` |
| Meta description | `Agencia de performance marketing y publicidad digital: Google Ads, Meta, TikTok y LinkedIn optimizados hacia ventas reales, con tus cuentas a tu nombre.` |
| H1 | `Performance marketing que aprende de tus ventas, no de tus clics.` |
| Slug | `/servicios/performance-marketing/` (working) |
| Idioma | `es` para Latinoamérica, sin país en el title; mercados declarados en el cuerpo y en `areaServed` |
| Canonical | Autorreferente, sólo al promover |
| Robots | `noindex` en la candidata; `index, follow` al promover |
| OG/Twitter | Título y descripción del copy ledger; imagen social 1200×630 con el circuito de la señal, sin cifras ni logos |

El title deja de decir "en Chile": la página sirve a cuatro países y el país en el title le resta relevancia en los otros
tres.

## 7. Schema

- `Service`: `name` "Performance marketing", `serviceType` "Performance marketing y publicidad digital", `provider` hacia
  la entidad `Organization` de Efeonce que ya emite Yoast, `areaServed` Chile, México, Colombia, Perú y Estados Unidos,
  `description` con la cápsula de agencia. Sin `offers` ni precios.
- `FAQPage`: las catorce preguntas visibles, con las respuestas exactas del HTML.
- Sin duplicar la entidad `Organization` ni el `WebPage` de Yoast. El marker `_eo_performance_enabled=1` activa sólo el
  schema de esta página.

## 8. Estados Unidos

La demanda útil es en inglés: "ppc agency" 18.100, "google ads agency" 12.100, "ppc management" 12.100, "performance
marketing agency" 4.400, "paid media agency" 2.900 (CPC USD 88,80), "chatgpt ads" 6.600 y en alza. En español es residual
y cae durante el año. Esta página no la atiende: queda como follow-up una página `en-US` con hreflang, con un ángulo
posible de "hispanic / multicultural paid media" ("hispanic marketing agency" 260, sin AI Overview).

## 9. Migración de la URL legacy

| Paso | Cuándo | Cómo |
|---|---|---|
| Inventario de enlaces internos a la legacy | Slice 1 | Búsqueda en contenido de WordPress, menús y widgets |
| Backlinks y tráfico de la legacy | Slice 1 | Semrush backlinks + Search Console de la URL |
| 301 legacy → nueva | Slice 6, en la misma ventana que la promoción | API de redirects de Yoast SEO Premium; verificar colisiones con y sin barra final |
| Menú y enlaces internos | Slice 6 | Reapuntar el ítem `Performance Marketing`; actualizar los enlaces del inventario |
| Legacy fuera del sitemap y `private` | Slice 6 | Estado `private`, sin borrar |
| Verificación | Slice 6 | `public-website:verify-performance-legacy-redirect` + Search Console (inspección de ambas URLs) |

La página nueva se construye desde cero; de la legacy sólo se reutiliza la URL como origen del 301. Si el Slice 1
encuentra equidad relevante en la legacy, la alternativa es construir la página nueva sobre esa misma URL; en ambos casos
queda una sola URL indexable.

## 10. Enlaces internos

| Desde | Hacia | Anchor sugerido |
|---|---|---|
| Hub `/servicios/` | Esta landing | Performance marketing y publicidad digital |
| Menú `Performance Marketing` | Esta landing | — |
| Trade Marketing (`TASK-1860`, `#digital`) | `#canales` | Cómo gestionamos paid media y retail media |
| Influencer Marketing (amplificación) | `#canales` | Performance marketing |
| SEO y AEO | Esta landing | Performance marketing |
| HubSpot (B2B) | `#como-trabajamos` | Marketing B2B con pauta conectada a tu CRM |
| Esta landing, R8 | SEO, AEO, Influencer Marketing, HubSpot | Por función, no "clic aquí" |

## 11. Seguimiento AEO

Panel de prompts por mercado, fuera del lanzamiento: "mejor agencia de performance marketing en Chile", "agencia de
publicidad digital en Lima", "agencia de publicidad digital en Bogotá", "qué es la pauta digital", "qué es el
performance marketing", "cuánto cobra una agencia de Google Ads", "se puede anunciar en ChatGPT en Chile", "agencia de
LinkedIn Ads B2B", "qué cambia la ley 21.719 para la publicidad digital". Registrar si la respuesta cita a Efeonce, qué
fuente usa y si la descripción es correcta.

## 12. Reglas de mantenimiento

- R4 y la cápsula de ChatGPT Ads se revisan cada trimestre y cada vez que cambie la disponibilidad de ChatGPT Ads o una
  norma citada; un bloque que pierde vigencia se retira.
- La demanda por país se revisa cada seis meses con la misma lista de términos de la investigación.
- Tras cualquier guardado en Elementor, correr el gate de fidelidad y después el gate SEO.
- Ningún claim nuevo de partner, resultado o precio entra sin pasar por la regla de claims de la decisión de oferta.
