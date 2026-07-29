# PDR-016 — Posicionamiento de la landing Influencer Marketing, Creators & UGC

> **Tipo:** Product Decision Record de posicionamiento y conversión del sitio público.
> **Estado:** Draft for validation · 2026-07-29
> **Ejecución propuesta:** TASK-1598 · EPIC-019
> **Skills:** `copywriting`, `growth-marketing-cro`, `greenhouse-growth-forms`, `greenhouse-growth-ctas`, `greenhouse-growth-meetings`, `digital-marketing`, `seo-aeo`, `efeonce-public-site-wordpress`, `greenhouse-ai-design-studio`, `greenhouse-ux-content-accessibility`, `modern-web-guidance`.

## Contexto

Efeonce ya tiene el modelo, servicio, pricing, derechos y control operativo de Creator Influence & Content, pero aún
no tiene una superficie pública que convierta esa capability en demanda. La landing debe capturar intención comercial
sin reducir el servicio a una lista de influencers, followers o publicaciones.

La keyword y el slug son hipótesis de trabajo. Antes de publicar deben validarse con demanda real para Chile, Colombia,
México y Perú, además de Search Console y datos de CRM. La página puede usar `/servicios/influencer-marketing` como
working slug, pero no debe fijarlo como canonical hasta cerrar esa validación.

El contrato SEO/AEO específico vive en el [Landing SEO/AEO Brief V1](../CREATOR_INFLUENCE_CONTENT_LANDING_SEO_AEO_BRIEF_V1.md): intent, query fan-out, cápsulas de respuesta, entidad Efeonce, schema, enlaces internos, rastreabilidad y panel de prompts.

## Decisión de posicionamiento

### One thing

> **Activamos las personas y el contenido correctos para que una marca gane relevancia, produzca mejores assets y aprenda qué puede escalar.**

### Promesa

Influencer marketing y creator content con fit de audiencia, vetting, derechos de uso, distribución gobernada y
medición por creador. No vendemos una base de datos ni garantizamos alcance, ventas o ROAS fuera de un método y un
tracking aceptados.

### Comprador

Marketing, brand, ecommerce, social o content lead de empresas mid-market y enterprise que necesitan relevancia,
contenido nativo, acceso a comunidades o amplificación, con procurement/legal involucrados cuando el programa crece.

### Diferenciación demostrable

La página debe mostrar, no sólo afirmar, cinco capas:

```text
fit → contenido → derechos → distribución → aprendizaje
```

El servicio se conecta con la línea Media & Distribution y con Creative/Content, pero la landing lidera la masterbrand
Efeonce. No presenta Globe o Reach como marcas independientes.

## Arquitectura de oferta

1. **Creator Intelligence:** scouting, vetting, shortlist y recomendación.
2. **Influencer Activation:** negociación, briefing, publicación y medición.
3. **Creator Content & UGC:** producción de assets y derechos para canales de marca y paid.
4. **Partnership Program:** roster, continuidad, aprendizaje y renovación.
5. **Amplification & Whitelisting:** paid usage y Partnership Ads con permisos separados.

Los fees de Efeonce, fees de talento, producción, derechos, media, impuestos y exclusividad se muestran como capas
distintas. La landing no publica precios sin un scope suficiente.

## Conversión y funnel

```text
demanda orgánica / paid / referral
        ↓
landing: problema + mecanismo + prueba + riesgos controlados
        ↓
brief de campaña (intención media) ──┐
                                      ├→ discovery/commercial qualification
reunión (intención alta) ────────────┘
        ↓
piloto gobernado → renovación / expansión
```

CTA primario: **Agenda una reunión** mediante el surface de Meetings gobernado. CTA secundario: **Cuéntanos tu
campaña** mediante `<greenhouse-form>`; el form debe capturar mercado, categoría, objetivo, plataformas, plazo,
creators/UGC, paid usage y presupuesto indicativo sin pedir un brief excesivo.

## Prueba y honestidad

- Usar casos y resultados sólo con autorización y evidencia.
- Si no hay casos específicos de creator marketing, demostrar el método con registros, rights matrix, ejemplos de
  entregables y un piloto simulado claramente rotulado.
- No prometer followers, publicaciones, alcance, ventas, ROAS o “influencers ideales” sin condiciones.
- No mostrar precios o porcentajes como tarifa pública; las bandas internas viven en los packs comerciales.

## No-goals

- No crear un marketplace o directorio público de influencers.
- No construir un form, CTA, scheduler, CRM o tracking nuevo en la landing.
- No incluir derechos perpetuos, multi-país, whitelisting, exclusividad o IA por defecto.
- No convertir la página en una guía SEO de “qué es influencer marketing”; Think puede educar y la landing captura demanda.
- No implementar el sitio hasta tener copy ledger, dirección visual, form contract y tracking plan aprobados.

## Consecuencias

- La landing será una spoke de demand-capture bajo `efeoncepro.com`.
- Requiere un form instance gobernado y un CTA/meeting surface con medición existente.
- La capacidad de entregar el CTA secundario debe existir antes del publish; si no, se reemplaza temporalmente por una
  reunión o un contacto honesto.
- La publicación queda condicionada a derechos, casos/prueba, medición, performance y evidencia GVC.

## Validaciones pendientes

1. Keyword/slug por mercado y riesgo de canibalización con `/servicios/redes-sociales`.
2. Casos públicos y assets de muestra autorizados.
3. Nombre, campos y destino del form de brief.
4. Link/surface canónico de Meetings y UTMs.
5. Datos de tracking disponibles para distinguir brief, reunión, oportunidad y campaña.
6. Seguimiento AEO posterior: registro de prompts IA, fuentes/competidores y exactitud por mercado; no bloquea el lanzamiento técnico.
