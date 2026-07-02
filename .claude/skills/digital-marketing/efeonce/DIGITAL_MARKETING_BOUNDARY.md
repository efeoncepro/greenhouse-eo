# Boundary: Digital Marketing vs skills vecinas

> La costura que hace a estas skills **complementarias sin solaparse**. Regla de una frase:
> **Digital Marketing TRAE y ENGANCHA a la audiencia por canales; Growth+CRO la CONVIERTE,
> ACTIVA, RETIENE y MIDE como sistema.**

## La costura crítica: DM ↔ growth-marketing-cro

| Terreno compartido | `digital-marketing` (esta skill) posee | `growth-marketing-cro` posee |
|---|---|---|
| **Email** | craft de canal: newsletters, campañas, nurture/drip, segmentación, MAP | lifecycle/behavioral triggers, retención, deliverability detallada |
| **Medición** | reporting por canal, taxonomía UTM, tag management | arquitectura de atribución, MMM, incrementality, tracking plan |
| **Landing pages** | pauta/creatividad que trae el tráfico + coordina la landing | **optimización de conversión** (CRO) de esa landing |
| **Contenido** | estrategia/producción/**distribución** de content marketing | content **loop** como motor de growth |
| **Canales** | ejecución del canal (cuentas, creativos, bidding, calendario) | channel-market fit + economía (CAC/payback) |
| **Activación** | traer al usuario al producto/registro | aha moment, TTV, onboarding, PQL |
| **Experimentación** | testear creativos/hooks/mensajes dentro del canal | diseño estadístico (MDE, sample size, significancia, guardrails) |

**Regla de precedencia:** si la pregunta es **cómo convertir, experimentar (con rigor
estadístico), activar, retener, atribuir cross-canal o modelar loops/PLG** → es
`growth-marketing-cro`. Si es **cómo traer, enganchar, crear demanda y ejecutar por canal** →
es esta skill. En medio (siempre en marketing), **nómbralo y encadena**.

## Boundary con las demás skills

| Tema | Dueño | Por qué no es de esta skill |
|---|---|---|
| SEO técnico, schema/JSON-LD, AEO/GEO por-motor, entidad, "ser citado por IA" | **`seo-aeo`** (Codex) | Dominio técnico propio; DM usa el contenido como *canal*, no reimplementa su táctica. |
| Pricing, packaging, quote-to-cash, pipeline, RevOps de venta | **`commercial-expert`** (Claude) | Post-conversión / revenue calificado. DM trae demanda; commercial la cierra. |
| Doctrina ASaaS, posicionamiento de marca, modelo de negocio, GTM strategy | **`efeonce-agency`** | Estrategia de negocio; DM la *expresa* en campañas, no la define. |
| Publishing WP/Astro, AI Content Factory (ejecución), landing en el CMS | **`efeonce-public-site-wordpress`** | Runtime de publicación; DM decide *qué/cuándo publicar*. |
| Plantillas y entrega de email runtime | **`greenhouse-email`** (Claude) + `src/lib/email/**` | Infra transaccional/broadcast; DM decide *la campaña y el segmento*. |
| Copy/UX-writing visible final, accesibilidad | **`greenhouse-ux-content-accessibility`** (Codex) + `src/lib/copy/` | Wording/a11y; DM decide el *ángulo/mensaje*. |
| Logos de medios de pago (isotipos) | **`greenhouse-digital-brand-asset-designer`** | Solo payment-instrument logos; NO marca general de marketing. |

## Cómo encadenar (patrón)

1. Diagnostica aquí (objetivo → audiencia/mensaje → canal-mix → creatividad).
2. Para *convertir/medir* el tráfico que generas → `growth-marketing-cro`.
3. Para *ejecutar* en el sitio/email/copy → las skills de runtime del repo.
4. Para *cerrar* el lead → `commercial-expert`.

Nunca reimplementes la lógica de la skill dueña; referénciala y pásale el control.
