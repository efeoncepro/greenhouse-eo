# Performance Marketing Landing — SEO/AEO Brief V1

> **Estado:** hipótesis validada con una fuente (Semrush). La segunda fuente y la decisión de URL se cierran en el
> Slice 1 de `TASK-1865`.
> **Fecha:** 2026-09-11
> **Owner:** Media & Distribution + Public Site
> **Posicionamiento:** [PDR-022](decisions/PDR-022-landing-performance-marketing-posicionamiento.md)
> **Wireframe y copy:** [`TASK-1865` wireframe](../ui/wireframes/TASK-1865-landing-performance-marketing.md)
> **Evidencia:** [market update 2026-09-10 §1](../audits/commercial/PERFORMANCE_MEDIA_CHANNELS_PARTNERS_PRICING_RESEARCH_2026-09-10.md)

## 1. Demanda

Fuente: Semrush `cl`, `mx` y `co`, 2026-09-10; volumen promedio de 12 meses.

| Término | Vol. CL | KD | Intención | Rol en la página |
|---|---:|---:|---|---|
| agencia de performance marketing | 480* | 13 | comercial | Title, eyebrow y H1 |
| agencia performance marketing | 590* | 11 | informacional | Title y cápsula de agencia |
| performance marketing | 140 | 29 | informacional | H1 y cápsula de definición |
| paid media | 480 | 18 | informacional (SERP de empleo y formación) | Meta description y cuerpo; nunca slug |
| agencia google ads / agencia de google ads | 50* / 20 | 28 / 0 | informacional | H3 de canal y FAQ de auditoría |
| publicidad en linkedin | 20 | 0 | — | H3 de canal y FAQ B2B |
| publicidad programática | 20 | 0 | — | H3 de canal y FAQ |
| agencia de marketing b2b | 390* | 9 | comercial | Motion B; spoke propia evaluada aparte |

\* promedios con picos; mes típico estimado 130–270 para performance y ~175 para B2B.

**Efeonce hoy:** cero keywords del cluster en CL, MX y CO. La legacy `/servicio-gestion-campanas-publicitarias/` es
indexable desde 2023 y no rankea ninguna.

**Validación pendiente (Slice 1):** segunda fuente con Keyword Planner o Search Console; backlinks y tráfico orgánico de
la legacy; promover los términos al tracking del gateway SEO de Efeonce (gasto recurrente, decisión aparte).

## 2. SERP y oportunidad

- "agencia de performance marketing" (CL): páginas de servicio chilenas, dos rankings auto-publicados de Muller y Pérez,
  blogs y empleos; **sin AI Overview**.
- "agencia google ads" (CL): calidad floja, dominios españoles y resultados que no calzan con la búsqueda; sin AI
  Overview.
- "paid media" (CL): empleo y formación, con AI Overview: no sirve como slug ni como H1.
- Nexbu aparece en casi todas con una página por servicio; Milimetrix tiene página propia de paid media.

La SERP es ganable con una página de servicio sustantiva, cápsulas citables y una entidad clara.

## 3. Intención y query fan-out

| Pregunta real | Dónde se responde |
|---|---|
| ¿Qué es el performance marketing? | R2, cápsula 1 + FAQ 1 |
| ¿Qué hace una agencia de performance marketing? | R2, cápsula 2 + FAQ 2 |
| ¿Cuánto cobra una agencia de performance marketing o de Google Ads? | FAQ 3 (modelo, sin tarifa) |
| ¿Cuánto hay que invertir como mínimo? | FAQ 4 |
| ¿Las cuentas quedan a mi nombre? | R11 + FAQ 5 |
| ¿Hacen auditoría de Google Ads? | FAQ 7 |
| ¿Trabajan LinkedIn Ads para B2B? | R8 + FAQ 8 |
| ¿Compran programmatic? | R8 + FAQ 9 |
| ¿Se puede anunciar en ChatGPT en Chile? | R8 + FAQ 10 |
| ¿Qué cambia con la Ley 21.719 para la publicidad? | R4 + FAQ 11 |
| ¿Garantizan resultados? | R11 + FAQ 12 |

## 4. Cápsulas

- Primera oración responde la pregunta literal; 40 a 60 palabras; bajo un H2 o un `<summary>` con la pregunta.
- Las cápsulas de R2 y las respuestas 1 y 2 del FAQ son el mismo texto, para que `FAQPage` marque exactamente lo visible.
- La cápsula de ChatGPT Ads y la de la Ley 21.719 llevan fecha. Son las de mayor potencial de citación en español porque
  casi ninguna página las responde; también son las que más rápido envejecen.

## 5. Metadata

| Campo | Valor |
|---|---|
| Title | `Agencia de performance marketing en Chile \| Efeonce` |
| Meta description | `Performance marketing que optimiza hacia ventas reales en Google, Meta, TikTok y LinkedIn, con tus cuentas a tu nombre y fee separado de tu inversión.` |
| H1 | `Performance marketing que aprende de tus ventas, no de tus clics.` |
| Slug | `/servicios/performance-marketing/` (working) |
| Canonical | Autorreferente, sólo al promover |
| Robots | `noindex` en la candidata; `index, follow` al promover |
| OG/Twitter | Título y descripción del copy ledger; imagen social 1200×630 con el circuito de la señal, sin cifras ni logos |

## 6. Schema

- `Service`: `name` "Performance marketing", `serviceType` "Performance marketing y paid media", `provider` hacia la
  entidad `Organization` de Efeonce que ya emite Yoast, `areaServed` Chile, México, Colombia, Perú y Estados Unidos,
  `description` con la cápsula de agencia. Sin `offers` ni precios.
- `FAQPage`: las doce preguntas visibles, con las respuestas exactas del HTML.
- Sin duplicar la entidad `Organization` ni el `WebPage` de Yoast. El marker `_eo_performance_enabled=1` activa sólo el
  schema de esta página.

## 7. Migración de la URL legacy

| Paso | Cuándo | Cómo |
|---|---|---|
| Inventario de enlaces internos a la legacy | Slice 1 | Búsqueda en contenido de WordPress, menús y widgets |
| Backlinks y tráfico de la legacy | Slice 1 | Semrush backlinks + Search Console de la URL |
| 301 legacy → nueva | Slice 6, en la misma ventana que la promoción | API de redirects de Yoast SEO Premium; verificar colisiones con y sin barra final |
| Menú y enlaces internos | Slice 6 | Reapuntar el ítem `Performance Marketing`; actualizar los enlaces del inventario |
| Legacy fuera del sitemap y `private` | Slice 6 | Estado `private`, sin borrar |
| Verificación | Slice 6 | `public-website:verify-performance-legacy-redirect` + Search Console (inspección de ambas URLs) |

Si el Slice 1 encuentra equidad relevante en la legacy, la alternativa es reconstruir sobre la misma URL; en ambos casos
queda una sola URL indexable para el servicio.

## 8. Enlaces internos

| Desde | Hacia | Anchor sugerido |
|---|---|---|
| Hub `/servicios/` | Esta landing | Performance marketing |
| Menú `Performance Marketing` | Esta landing | — |
| Trade Marketing (`TASK-1860`, `#digital`) | `#canales` | Cómo gestionamos paid media y retail media |
| Influencer Marketing (amplificación) | `#canales` | Performance marketing |
| SEO y AEO | Esta landing | Performance marketing |
| HubSpot (B2B) | `#como-trabajamos` | Pauta conectada a tu CRM |
| Esta landing, R8 | SEO, AEO, Influencer Marketing, HubSpot | Por función, no "clic aquí" |

## 9. Seguimiento AEO

Panel de prompts por mercado, fuera del lanzamiento: "mejor agencia de performance marketing en Chile", "qué es el
performance marketing", "cuánto cobra una agencia de Google Ads", "se puede anunciar en ChatGPT en Chile", "agencia de
LinkedIn Ads B2B", "qué cambia la ley 21.719 para la publicidad digital". Registrar si la respuesta cita a Efeonce, qué
fuente usa y si la descripción es correcta.

## 10. Reglas de mantenimiento

- R4 y la cápsula de ChatGPT Ads se revisan cada trimestre y cada vez que cambie la disponibilidad de ChatGPT Ads o una
  norma citada; un bloque que pierde vigencia se retira.
- Tras cualquier guardado en Elementor, correr el gate de fidelidad y después el gate SEO.
- Ningún claim nuevo de partner, resultado o precio entra sin pasar por la regla de claims de la decisión de oferta.
