# Agencia de Medios Landing — SEO/AEO Brief V1

> **Estado:** aplicado en producción. Página publicada e indexable el 2026-10-16.
> **Fecha:** 2026-10-16 · **Revisión:** V1.0
> **Owner:** Media & Distribution + Public Site
> **URL:** https://efeoncepro.com/servicios/agencia-de-medios/ (WordPress `251981`)
> **Posicionamiento:** [PDR-025](decisions/PDR-025-landing-agencia-de-medios-posicionamiento.md)
> **Convive con:** [Performance Landing SEO/AEO Brief V1](PERFORMANCE_LANDING_SEO_AEO_BRIEF_V1.md) (sin publicar)
> **Operación:** skill `efeonce-public-site-wordpress` → `references/landings/agencia-de-medios.md`
> **Fuente de la investigación:** Semrush, bases `cl`, `mx`, `co`, `pe` y `us`, 2026-10-16.

## 1. Demanda

| Término | Demanda | Uso en la página |
|---|---|---|
| agencia de medios | ≈400 búsquedas/mes sumando mercados, KD 0–39 | Frase clave: title, H1, slug, focus keyphrase, OG |
| compra de medios | CO 1 000 · MX 390 · CL 170 | Secundaria: cuerpo, FAQ y description |
| planificación de medios | MX 590 | Secundaria: title, cuerpo y FAQ |
| plan de medios | — | Secundaria: FAQ |
| publicidad programática | — | Secundaria: cuerpo |

Donde la tabla dice «—», la investigación registró el término como secundario sin una cifra que valga la pena fijar
acá; no inventar una.

## 2. SERP y oportunidad

- «agencia de medios chile»: con AI Overview, sin local pack; domina el gremio AAM y las home de agencias son
  delgadas. Una página de servicio sustantiva tiene espacio.
- **Frente a Performance:** en Chile, «agencia de medios» y «agencia de performance marketing» no comparten dominios en
  el top 10, y performance tiene 16 veces más volumen. Son intenciones distintas. Por eso «performance marketing»
  queda fuera del title, del H1 y del slug de esta página.
- La landing de Performance (PDR-022, `/servicios/performance-marketing/`) sigue sin publicar (404) y la legacy
  `/servicio-gestion-campanas-publicitarias/` sigue en el menú.

## 3. Léxico y no canibalización

| Dónde | Términos |
|---|---|
| Title y H1 | agencia de medios · planificación y compra |
| Description | medios pagados · search, social, video, TV conectada, audio, DOOH y retail media · ventas y CRM |
| Cuerpo | compra de medios · planificación de medios · publicidad programática · canales por nombre |
| FAQ | compra vs. planificación · plan de medios · TV conectada (CTV) · DOOH · retail media |

**No usar como objetivo en esta página:** «agencia de performance marketing», «performance marketing», «publicidad
digital» y «pauta digital» (dueña: Performance, PDR-022). La tabla de convivencia completa está en
[PDR-025 §Convivencia](decisions/PDR-025-landing-agencia-de-medios-posicionamiento.md#convivencia-con-performance-pdr-022).

## 4. Metadatos aplicados

Aplicados con `configure-medios-seo.php` (snapshot previo `_gh_medios_seo_before_20261016_183347`).

| Campo | Valor |
|---|---|
| Title | `Agencia de medios: planificación y compra \| Efeonce` |
| Meta description | `Planificamos, compramos y medimos tus medios pagados: search, social, video, TV conectada, audio, DOOH y retail media, conectados a tus ventas y tu CRM.` |
| Focus keyphrase | `agencia de medios` |
| H1 | `Agencia de medios que conecta tu inversión publicitaria con tus ventas.` + párrafo con los canales |
| Slug | `/servicios/agencia-de-medios/` |
| OG title | `Agencia de medios conectada a tus ventas \| Efeonce` |
| Twitter title | `Agencia de medios conectada a tus ventas` |
| Imagen social | 1200×630, adjunto `251986` (también imagen destacada); fuente `scripts/public-website/medios-source/og/og.html`, Isabella con la esfera, «¿Dónde invierto? Donde rinde» |
| Robots | `index, follow` |
| Canonical | autorreferente |

Basis, DV360 y The Trade Desk quedan fuera de las descripciones sociales hasta tener el inventario por mercado.

## 5. Schema

- Yoast emite `WebPage`, `WebSite` y `Organization`; no se duplican.
- El widget de FAQ (`greenhouse_medios_preguntas`) emite, desde las filas visibles:
  - `Service` `#service` con `provider` `https://efeoncepro.com/#organization` y `areaServed` Chile, Colombia, México
    y Perú; sin `offers` ni precios.
  - `FAQPage` `#faq` con las 11 preguntas, con las respuestas exactas del HTML.
- Una pregunta nueva en el FAQ entra al schema sin otro paso; no editar el JSON-LD a mano.

## 6. FAQ con demanda

El FAQ tiene 11 preguntas: seis vienen del canvas aprobado y cinco se agregaron por la investigación, porque tienen
demanda o responden la intención secundaria:

1. Diferencia entre compra y planificación de medios.
2. Qué es un plan de medios.
3. TV conectada (CTV).
4. DOOH.
5. Retail media.

Regla de cápsula: la primera oración responde la pregunta literal. La primera fila del FAQ abre por defecto.

## 7. Enlaces internos

- Menú principal: «Agencia de Medios» bajo Soluciones → Crecimiento Multicanal, junto a «Performance Marketing & Paid
  Ads» y «Content Marketing».
- Cuando Performance se publique: enlace cruzado por función entre ambas páginas (Medios → Performance para la
  operación de campañas; Performance → Medios para planificación, compra y programática).

## 8. Pendientes

1. **Rich Results Test** de la URL publicada (`Service` + `FAQPage`).
2. **Google Search Console:** inspección de la URL, cobertura y primeras queries; repetir cuando Performance se
   publique para detectar queries servidas por las dos páginas.
3. Primer envío real del formulario desde navegador y evento `generate_lead` en GA4 (pendiente de conversión, no de SEO;
   detalle en PDR-025).
4. Seguimiento AEO: prompts como «mejor agencia de medios en Chile», «qué es la compra de medios», «qué es un plan de
   medios» y «qué es la TV conectada», registrando si la respuesta cita a Efeonce y con qué fuente.

## 9. Reglas de mantenimiento

- Cualquier cambio de copy en el FAQ actualiza el schema solo; verificar con Rich Results Test después.
- Un claim nuevo de partner, resultado o precio pasa por la lista de claims de PDR-025.
- El cuerpo se cambia con un republicador con guarda de hash; el publicador sólo crea.
- Revisar la demanda cada seis meses con la misma lista de términos y las mismas bases.
