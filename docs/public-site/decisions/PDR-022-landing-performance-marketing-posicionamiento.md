# PDR-022 — Posicionamiento de la landing Performance Marketing

> **Tipo:** Product Decision Record de posicionamiento y conversión del sitio público.
> **Estado:** Draft for validation · 2026-09-10
> **Ejecución:** [TASK-1865](../../tasks/to-do/TASK-1865-landing-performance-marketing.md) (ui-ux · flow · UI ready no)
> **Enmienda a:** [PDR-008](PDR-008-landing-agencia-marketing-digital-posicionamiento.md), sólo en su conclusión
> "performance es capability listada, no cabecera"
> **Oferta:** [Performance & Commerce Distribution — ficha](../../services/media-distribution/PERFORMANCE_COMMERCE_DISTRIBUTION_SERVICE_V1.md)
> **Evidencia:** [market update 2026-09-10 §1](../../audits/commercial/PERFORMANCE_MEDIA_CHANNELS_PARTNERS_PRICING_RESEARCH_2026-09-10.md)
> **Skills de ejecución:** `efeonce-public-site-wordpress`, `seo-aeo`, `copywriting`, `growth-marketing-cro`,
> `greenhouse-growth-forms`, `greenhouse-growth-ctas`, `greenhouse-growth-meetings`, `digital-marketing`,
> `greenhouse-ai-design-studio`.

## Delta 2026-09-11 — existe una página legacy de Performance

Al crear la task apareció una página que este PDR no consideraba: `242862`, `/servicio-gestion-campanas-publicitarias/`,
publicada desde 2023, indexable y en el menú como `Performance Marketing`. En producción muestra contadores en cero y
afirma "Somos Google Partners y Meta Business Partners", estados que el Partnership Registry no tiene verificados; no
rankea ninguna keyword del cluster.

Decisión: la landing nace en `/servicios/performance-marketing/` y la legacy pasa a 301 en la misma ventana de promoción,
con el ítem de menú reapuntado y la legacy en `private`. El Slice 1 de `TASK-1865` puede revertir esa elección si los
backlinks de la legacy lo justifican; en ambos casos queda una sola URL indexable. La página se construye desde cero y la
legacy no se parcha mientras tanto (decisión del owner, 2026-09-11). Brief SEO/AEO:
[PERFORMANCE_LANDING_SEO_AEO_BRIEF_V1](../PERFORMANCE_LANDING_SEO_AEO_BRIEF_V1.md).

## Contexto

PDR-008 dejó performance marketing como capability listada dentro de la página de agencia porque "el cluster
performance es ≤480 e informacional". Ese dato midió la variante informacional ("performance marketing", 140/mes) y no
las dos comerciales:

| Término (Chile) | Volumen | KD | SERP |
|---|---:|---:|---|
| agencia de performance marketing | 480* | 13 | páginas de servicio, rankings auto-publicados, blogs; sin AI Overview |
| agencia performance marketing | 590* | 11 | ídem |
| agencia de marketing b2b | 390* | 9 | comercial, con AI Overview |

\* promedios con picos; mes típico estimado 130–270 para performance y ~175 para B2B. Fuente: Semrush `cl`, 2026-09-10.

Es el mismo orden de volumen que "agencia de inbound marketing" (880), donde Efeonce ya compite. Efeonce hoy **no
rankea ninguna keyword** de paid media, performance, ads o B2B en Chile, México ni Colombia. La SERP es ganable: rivales
con páginas flojas, dominios españoles y dos rankings auto-publicados de Muller y Pérez.

Desde 2026-09-10 la oferta tiene ficha, decisión y pricing propios, con dos motions (Demand & Commerce y B2B Pipeline).
La landing ya tiene qué vender.

## Decisión

1. **Una spoke de demand capture:** working slug `/servicios/performance-marketing`, siguiendo el patrón "slug de
   categoría, keyword en title y H1" (PDR-002). No se usa `/paid-media`: su SERP es de empleo y formación.
2. **La Home** (ex `/agencia`, plegada por PDR-010) conserva performance como capability listada y enlaza a esta spoke.
3. **Sin spokes por canal.** Google Ads, Meta, LinkedIn, TikTok, programmatic y retail media son secciones de la spoke,
   no páginas. Motivo: sin volumen de agencia en Chile (LinkedIn 20, programmatic 20, TikTok sin dato) y la oferta vende
   canal como cobertura. "Agencia de Google Ads" tiene 260/mes en México y Colombia: candidata a spoke sólo en una fase
   LATAM con hreflang.
4. **El motion B2B se presenta como sección de esta spoke en V1.** Una spoke propia para "agencia de marketing b2b"
   (KD 9) se evalúa después, junto con la página de inbound y la landing de HubSpot (PDR-006), para no canibalizar.

## Posicionamiento

### One thing (hipótesis para el copy ledger)

> **Tu inversión publicitaria aprende de las ventas y oportunidades reales, no de los clics.**

### Promesa

Una operación de performance que alimenta a los algoritmos con la señal de negocio correcta, prueba creatividad con
método y deja el aprendizaje documentado. No gestionamos una plataforma: hacemos que todas trabajen hacia el mismo
resultado. No garantizamos ROAS, CAC ni pipeline.

### Estructura *no es X, es Y*

No es "otra agencia de Google y Meta Ads". Es la operación que conecta tu pauta con tus ventas y tu CRM.

### Diferenciación demostrable

La página muestra, no afirma:

```text
señal → operación → creatividad → gobierno → aprendizaje
```

- **Commerce:** optimizamos hacia venta y margen, con retail media leído junto al resto del mix.
- **B2B:** la pauta aprende de la etapa del CRM. Operamos HubSpot y Salesforce; la conexión con el CRM es parte del
  servicio, no un proyecto aparte con otro proveedor.

### Momento 2026

Una sección con los tres cambios que afectan la señal de casi todos los anunciantes —atribución de Meta, retiro de
Dynamic Search Ads hacia AI Max y vigencia de la Ley 21.719 el 2026-12-01— como razón para pedir el Diagnostic ahora.
El copy no da asesoría legal: dice que el Diagnostic inventaría los flujos de datos para que Legal los revise.

## Arquitectura de la página

1. Hero: H1 + one thing + CTA primario.
2. El problema: la automatización optimiza lo que le das.
3. Dos formas de trabajar: Demand & Commerce · B2B Pipeline.
4. Cómo operamos: los cinco módulos en lenguaje de comprador.
5. Canales que operamos (H2 por canal, cada uno con qué hacemos y cuándo lo recomendamos).
6. Momento 2026.
7. Cómo empezamos: Diagnostic → Sprint → Managed.
8. Prueba.
9. FAQ.
10. CTA final.

## SEO / AEO

- **Title:** "Agencia de performance marketing en Chile | Efeonce" (ajustar largo en ejecución).
- **H1:** "Agencia de performance marketing" + reencuadre *no es X, es Y*.
- **Meta description y H2 secundario:** "paid media", "Google Ads y Meta Ads".
- **H2 por canal:** Google Ads, Meta Ads, LinkedIn Ads para B2B, TikTok Ads, programmatic, retail media y anuncios en
  ChatGPT. Este último dice con honestidad dónde existe (México, Brasil y otros 50 países) y que en Chile todavía no;
  es la sección con más potencial de citación en respuestas de IA porque casi nadie la tiene en español.
- **FAQ:** qué hace una agencia de performance marketing · cuánto cuesta y cómo se cobra (modelo, sin tarifa) · si hacen
  auditoría de Google Ads · si trabajan LinkedIn Ads para B2B · cómo compran programmatic · si hacen anuncios en ChatGPT
  y en qué países existen · si hacen anuncios en X · qué cambia con la Ley 21.719
  para la publicidad digital (respuesta orientativa, no legal).
- **Schema:** `Service` con `provider` Efeonce, `FAQPage`, enlace a la entidad `Organization`.
- **Enlaces internos:** Home, landing HubSpot, Influencer Marketing (amplificación), Redes Sociales, SEO/AEO.
- **"growth marketing"** sólo en FAQ o meta: riesgo de voz ya señalado por PDR-008.
- **Tracking:** promover estos términos al tracking del gateway SEO de Efeonce (gasto recurrente, decisión aparte).

## Conversión

CTA primario: **Agenda una reunión** vía la superficie gobernada de Meetings. CTA secundario: **Pide un diagnóstico**
vía `<greenhouse-form>`, capturando motion (commerce/B2B), canales activos, inversión mensual por tramos, mercados y si
tiene CRM con etapas. Sin pedir un brief extenso.

## Prueba y honestidad

- Casos sólo con autorización y evidencia. Bresler (+180% ventas digitales, integración de creatividad y performance)
  está registrado como caso citable en el context pack; confirmar la autorización y la fuente del dato antes de
  publicarlo.
- No publicar precios ni porcentajes: las bandas son internas y `hypothesis_only`.
- No publicar badges de partner no verificados.
- No prometer ROAS, CAC, leads ni pipeline.

## No-goals

- No crear páginas por plataforma.
- No construir form, CTA, scheduler, CRM ni tracking nuevos.
- No convertir la página en guía de "qué es performance marketing".
- No implementar hasta tener copy ledger, dirección visual, form contract y tracking plan aprobados.

## Consecuencias

- PDR-008 queda enmendado sólo en el nivel de spoke; su decisión para la Home se mantiene.
- Requiere una TASK ui-ux con wireframe, flow y contrato de form antes de implementar.
- La publicación queda condicionada a caso autorizado o prueba de método, medición y evidencia GVC.

## Validaciones pendientes

1. Confirmar los picos de volumen con Keyword Planner o Search Console antes de fijar el slug.
2. Canibalización con `/servicios/redes-sociales` (pauta social) y con la landing de influencers (amplificación).
3. Caso autorizado y su evidencia.
4. Nombre, campos y destino del form de diagnóstico.
5. Link canónico de Meetings y UTMs.
6. Seguimiento AEO posterior: prompts, fuentes y competidores por mercado.
