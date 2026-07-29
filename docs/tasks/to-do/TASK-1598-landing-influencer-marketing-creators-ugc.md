# TASK-1598 — Landing pública Influencer Marketing, Creators & UGC

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `motion`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1598-landing-influencer-marketing-creators-ugc.md`
- Flow: `docs/ui/flows/TASK-1598-landing-influencer-marketing-creators-ugc-flow.md`
- Motion: `docs/ui/motion/TASK-1598-landing-influencer-marketing-creators-ugc-motion.md`
- Backend impact: `none` (reuso de Growth Forms, Growth CTA y Meetings)
- Epic: `EPIC-019`
- Domain: `public-site|growth|media-distribution`
- Blocked by: validación de keyword/slug, form contract, casos/prueba y capacidad de brief
- Branch: `task/TASK-1598`

## Summary

Construir una landing pública que convierta Creator Influence & Content en demanda calificada. La página debe explicar
que Efeonce conecta fit de audiencia, contenido de creators/UGC, derechos, amplificación y aprendizaje; no vender una
lista de influencers ni prometer resultados no controlables.

Working route: `/servicios/influencer-marketing`. El slug, canonical y keyword principal son hipótesis y deben
validarse antes de publicar para Chile, Colombia, México y Perú.

## Goal

- Capturar demanda comercial de influencer marketing, creators y UGC.
- Convertir intención alta en reunión e intención media en un brief gobernado.
- Hacer visible la diferencia entre Influencer Marketing, UGC, Partnership y Whitelisting.
- Probar el método con evidencia, rights matrix, ejemplos autorizados y medición, no con hype.
- Instrumentar el funnel landing → brief/reunión → oportunidad con los contratos existentes.

## Architecture alignment

Leer y respetar:

- `docs/public-site/decisions/PDR-016-landing-influencer-marketing-creators-ugc-posicionamiento.md`
- `docs/business-models/media-distribution/CREATOR_INFLUENCE_CONTENT_OPERATING_CONTROL_PACK_V1.md`
- `docs/business-models/media-distribution/CREATOR_INFLUENCE_CONTENT_RIGHTS_AND_USAGE_INTEGRITY_PACK_V1.md`
- `docs/services/media-distribution/CREATOR_INFLUENCE_CONTENT_SERVICE_V1.md`
- `docs/context/09_marca-agencia.md`, `docs/context/13_icp-buyer-personas-jtbd.md`, `docs/public-site/README.md`
- `docs/public-site/CREATOR_INFLUENCE_CONTENT_LANDING_SEO_AEO_BRIEF_V1.md`

Rules:

- Liderar Efeonce; no presentar Globe o Reach como marcas independientes.
- Separar audiencia, contenido, derechos, paid usage, whitelisting, exclusividad, fees y media.
- No reconstruir Growth Forms, Growth CTA, Meetings, HubSpot ni tracking.
- No usar cifras de mercado, performance o fees sin fuente, fecha y condición.
- Tuteo neutro; nunca voseo.
- El brief debe preguntar lo necesario para calificar sin convertir la landing en un formulario de procurement.

## Scope

### Slice 1 — Discovery y demanda

- Validar keyword, slug, mercados y canibalización.
- Ejecutar el brief SEO/AEO: SERP por `cl`, `co`, `mx`, `pe`, query fan-out, entidades, competidores y contrato técnico de indexación.
- Confirmar buyer, JTBD, objeciones y términos de búsqueda.
- Confirmar casos, assets, testimonios y ejemplos de método publicables.
- Decidir si la landing necesita un satélite editorial en Think; queda fuera de esta task.

### Slice 2 — Mensaje y conversión

- Copywriting: one thing, headline, proof, objections, FAQ y CTA.
- CRO: primera pantalla, jerarquía de acciones, fricción, trust, progressive disclosure y experiment backlog.
- Digital marketing: canal mix inicial, UTMs y mensajes por paid/organic/referral.
- Form: definir `creator-influence-brief` o nombre equivalente, campos, consentimiento, success card y destino.
- Redactar answer capsules de 40–60 palabras bajo H2/H3 con preguntas reales; no prometer rich results ni datos no verificados.

### Slice 3 — Dirección visual y wireframe

- Producir 2–3 direcciones visuales y seleccionar una.
- Mostrar el sistema `fit → contenido → derechos → distribución → aprendizaje` como experiencia.
- Usar una sección firma de assets/rights/content, sin muro genérico de cards.
- Consultar Modern Web Guidance para form, dialogs/accordions, performance y a11y; extraer intención, no copiar código.

### Slice 4 — Build público

- Implementar en WordPress/Ohio con scope page-specific según `efeonce-public-site-wordpress`.
- Reusar `<greenhouse-form>`, `<greenhouse-cta>` y `open_meeting_scheduler` cuando los contratos estén listos.
- Añadir JSON-LD `Service`, `Organization`, `FAQPage` y `BreadcrumbList` sólo con datos aprobados.
- Mantener el contenido crítico en HTML inicial, canonical autorreferente sólo tras validar slug, `index/follow` después del QA y sitemap/lastmod honestos.
- Implementar enlaces internos desde `/servicios`, `/servicios/redes-sociales/` y `/agencia-creativa/` sólo con destinos vigentes y roles no canibalizantes.
- Registrar landing reference, route ownership y tracking plan.

### Slice 5 — QA y promoción

- Capturar 1440px, 390px, teclado, reduced motion y estados del form.
- Verificar CWV, overflow, focus, schema, canonical/noindex/indexación y UTMs.
- Publicar inicialmente con estado controlado/noindex si el contrato de prueba o form aún no está validado.
- Promover sólo después de evidence review, no sólo al terminar el markup.

## Funnel and measurement

Primary conversion: `gh_meeting_booking_confirmed` server-confirmed. Secondary: submission aceptada del form de brief.
Micro-events: CTA viewed/clicked, form started, form field error, form submitted, meeting step reached, FAQ opened.

Antes de crear eventos nuevos, cargar `docs/reference/measurement-gtm-ga4/04-greenhouse-gh-event-convention.md` y
`TRACKING-PLAN.md`; reusar la familia vigente `gh_form_*`, `gh_cta_*` y `gh_meeting_*`. No mandar PII, fees, claims,
creator names ni brief completo al dataLayer.

North Star de la landing: **briefs o reuniones calificadas por visita**, no clicks o impresiones aisladas.
Guardrails: form completion rate, meeting booking rate, lead quality, spam rate, bounce/engaged visit, CWV y cero
leaks de PII.

## SEO/AEO launch contract

La página debe nacer lista para búsqueda antes de promoverse:

- title, meta description, H1, OG/Twitter metadata y excerpt alineados con la intención validada;
- HTML inicial con la propuesta, respuestas, ofertas, derechos, FAQ y CTAs; no contenido crítico sólo después de JS;
- H2/H3 como preguntas reales y answer capsules visibles de 40–60 palabras cuando la respuesta lo requiera;
- `Service` de la oferta, `Organization` de Efeonce y `BreadcrumbList` coherentes; `FAQPage` sólo si el FAQ es visible y
  válido, sin prometer que Google mostrará un rich result;
- canonical autorreferente, `index, follow`, sitemap/lastmod, robots y enlace desde `/servicios` sólo al pasar QA;
- enlaces internos con roles diferenciados respecto de `/servicios/redes-sociales/` y `/agencia-creativa/`;
- imágenes rastreables con ALT, dimensiones, caption/contexto y fallback estático;
- validación de entidad, marca, mercados y claims; ningún schema o copy debe introducir Greenhouse, Globe o Reach como
  prestadores independientes;
- verificación de URL renderizada, Rich Results/Schema validator, indexación y CWV antes del cutover.

El seguimiento de prompts IA, citation share y exactitud es un follow-up editorial/measurement posterior; no se construye
un panel nuevo ni se convierte en dependencia de esta landing.

## Acceptance criteria

- [ ] Keyword, slug, canonical y mercados validados.
- [ ] SERP, intent map, query fan-out, entidades, competidores y arquitectura de contenido documentados.
- [ ] Landing explica las cinco capas y diferencia Influencer, UGC, Partnership y Whitelisting.
- [ ] H1 y primera pantalla tienen una promesa específica y CTA dual claro.
- [ ] Sólo se usan casos/assets/pruebas autorizados o rotulados como ilustrativos.
- [ ] Form de brief gobernado, con consentimiento, Turnstile/política aplicable, success/error y destino definidos.
- [ ] Meetings y CTA reusan contratos existentes y emiten medición server-confirmed.
- [ ] Tracking Plan actualizado; eventos sin PII y UTMs consistentes.
- [ ] JSON-LD válido y copy citable sin promesas no demostradas.
- [ ] HTML crítico rastreable sin depender de interacción JS; schema sólo marca contenido visible.
- [ ] Enlaces internos, sitemap, canonical y robots quedan verificados; no se promete FAQ rich result.
- [ ] GVC desktop/mobile/reduced-motion/keyboard sin overflow ni errores de consola.
- [ ] Performance móvil y estados degradados verificados.
- [ ] Landing registry y referencia espejo `.codex`/`.claude` actualizados.
- [ ] Promoción/canonical/indexación aprobada por el owner del sitio público.

## Out of scope

- Construir marketplace o base pública de influencers.
- Contratos legales finales o country overlays; viven en Legal/IP y requieren abogado local.
- Crear un nuevo motor de forms, CTA, scheduler, CRM, dashboard o pipeline.
- Prometer una auditoría/brief que delivery no pueda ejecutar.
- Crear la guía editorial Think en esta task.

## Verification

- `pnpm task:lint --task TASK-1598`
- `pnpm ui:wireframe-check --task TASK-1598`
- `pnpm ui:flow-check --task TASK-1598`
- `pnpm ui:motion-check --task TASK-1598`
- `pnpm docs:closure-check`
- SEO/AEO: revisar [Landing SEO/AEO Brief V1](../../public-site/CREATOR_INFLUENCE_CONTENT_LANDING_SEO_AEO_BRIEF_V1.md), validar SERP/keyword por mercado y verificar el contrato técnico antes de publicar.
- Captura GVC pública 1440/390 + reduced-motion + teclado.
- Smoke de form/meeting separado de la revisión visual; no crear bookings reales sin aprobación.

## Follow-ups

- Crear primer caso público con permiso y evidencia.
- Validar una campaña piloto como proof asset.
- Diseñar el satélite editorial de Think si la demanda informacional lo justifica.
- Crear versión localizada por mercado sólo después de evidencia de demanda y delivery.
- Crear un registro periódico de prompts IA para medir presencia, citas y exactitud después del lanzamiento; no forma parte del runtime de esta landing.
