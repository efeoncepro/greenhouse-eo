> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-07-07 por Claude
> **Ultima actualizacion:** 2026-10-13
> **Documentacion tecnica:** [docs/reference/measurement-gtm-ga4/](../../reference/measurement-gtm-ga4/) · [Tracking Engine §19](../../architecture/GREENHOUSE_TRACKING_ENGINE_ARCHITECTURE_V1.md) · ADR [GREENHOUSE_MEASUREMENT_TAGGING_DEPLOYMENT_DECISION_V1](../../architecture/GREENHOUSE_MEASUREMENT_TAGGING_DEPLOYMENT_DECISION_V1.md)

# Medición del sitio público (GTM + GA4)

## Para qué sirve

Mide qué pasa en los sitios públicos de Efeonce (`efeoncepro.com` + `think.efeoncepro.com`): cuánta gente los visita, qué páginas ve, y cuándo alguien deja un lead (envía un formulario). Todo llega a **una sola propiedad de Google Analytics 4**, así que el negocio lo ve como un solo embudo: Think → sitio → conversión.

## Cómo funciona (simple)

- Cada sitio carga **Google Tag Manager** (el contenedor `GTM-NGHPGRLZ`).
- Con consentimiento de analítica, GTM enciende **Google Analytics 4** automáticamente: páginas vistas, sesiones, scroll, clicks salientes, etc. No hay que configurar métrica por métrica.
- Cuando alguien **completa un formulario válido** (cualquier Growth Form), se registra una **conversión `generate_lead`**, con un dato `form_slug` que dice **cuál** formulario fue (AEO, grader, redes sociales…).
- Un **formulario nuevo queda medido solo**, sin trabajo extra — se distingue por su nombre. Lo mismo un **host nuevo** del ecosistema: nace con el tag de medición (es un mandato).

## Qué NO mide

- Formularios que **no son del motor de Greenhouse** (HubSpot nativo, Contact Form 7) — esos son otro sistema.
- Si el visitante **rechaza las cookies de analítica**, el forwarding del servidor bloquea GA4. Sin consentimiento publicitario tampoco se entrega matching ni eventos a Meta.

## Quién lo opera

Los agentes arman el tagging al implementar cada capability (formulario, CTA, landing, host), siguiendo la skill `greenhouse-gtm-ga4-operator`. Hay una capa de verificación (`pnpm measurement:smoke`) que confirma que la medición sigue funcionando, y un registro (`TRACKING-PLAN.md`) de qué está medido.

> **Detalle técnico:** contrato, comandos, gotchas y coordenadas exactas en [`docs/reference/measurement-gtm-ga4/`](../../reference/measurement-gtm-ga4/) (empezar por `04` y `LEARNINGS.md`). Estrategia de despliegue en el [ADR](../../architecture/GREENHOUSE_MEASUREMENT_TAGGING_DEPLOYMENT_DECISION_V1.md). Skill operador: `greenhouse-gtm-ga4-operator`.

## Meta: medición desde servidor

El píxel Meta de navegador y la API de conversiones son carriles diferentes. Efeonce eligió
**GTM Server** para CAPI. Ya existe `Efeonce Server` con una etiqueta para el píxel
`708931297255942`; recuperación publicada y entrega Server validada en Test Events. No se instala CAPI agregando
sólo una etiqueta al contenedor web.

PageView refleja navegación consentida. Lead debe corresponder a un formulario comercial
aceptado por el servidor: quedan fuera clics, errores y postulaciones. Si también hay Pixel
en navegador, se correlacionan ambos eventos para contar una sola conversión.
Consentimiento denegado o desconocido bloquea el envío Meta. GA4 y el snapshot web no
comprueban entrega a Meta; se exige recepción con origen Server y lectura posterior.

Estado 2026-10-13: **GTM Server6/Web5 y matching activos**, tras release completo PR254.
HubSpot muestra el banner en la primera visita, con preferencias en el pie legal; publicidad
requiere aceptación explícita. [Manual](../../manual-de-uso/growth/operar-meta-capi-servidor.md)
y [consentimiento](../../reference/measurement-gtm-ga4/09-hubspot-consent.md).

El evento GA4 de aceptación conserva una sola conversión generate_lead. Para Meta, el backend
prepara email/nombre/teléfono validados en hash compatible y clasificadores comerciales sólo
cuando el formulario fue aceptado o la reunión confirmada, con publicidad consentida. Los
envía por la cola cifrada al GTM Server existente. El anterior envío Meta de Lead basado en
GA4 fue retirado para no duplicar. PageView sigue en el transporte consentido existente.

GA4 correcto486264460 tiene UPD/ack y siete audiencias90d (AEO, SEO, web, contacto, social,
reuniones y comerciales), con link Ads9531478329 y personalización activos. Google recibe
hashes por user_data MP top-level sin eventos adicionales, sólo con client_id real y ambos
consentimientos analytics+ads. Los hashes no entran en parámetros ordinarios ni dataLayer.
No se añaden otro proyecto, servicio o cron para matching.

La SQL está aplicada y captura/Meta/Google/retención están habilitados permanentemente;
canaries de cola, acceso, credenciales y Meta Test Events pasaron. **La primera conversión
comercial real con enriquecimiento después de activar queda por observar**, al igual que
volumen/calidad de coincidencia y elegibilidad de audiencias. No se fabrican contactos o
reservas para probar. [Evidencia y rollback](../../audits/releases/2026-10-13-full-develop-matching-release.md).
