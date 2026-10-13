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
- GTM enciende **Google Analytics 4** automáticamente: páginas vistas, sesiones, scroll, clicks salientes, etc. No hay que configurar métrica por métrica.
- Cuando alguien **completa un formulario válido** (cualquier Growth Form), se registra una **conversión `generate_lead`**, con un dato `form_slug` que dice **cuál** formulario fue (AEO, grader, redes sociales…).
- Un **formulario nuevo queda medido solo**, sin trabajo extra — se distingue por su nombre. Lo mismo un **host nuevo** del ecosistema: nace con el tag de medición (es un mandato).

## Qué NO mide

- Formularios que **no son del motor de Greenhouse** (HubSpot nativo, Contact Form 7) — esos son otro sistema.
- Si el visitante **rechaza las cookies de analítica**, el evento igual se envía pero Google lo modela en agregado (no aparece como fila individual en reportes).

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

Estado: GTM servidor live 5/web live 5 publicados; consentimiento HubSpot por categorías
 y transporte activos en ambos hosts. Positivos PageView/Lead procesados como Server en Meta
Test Events; navegación real completó tags Meta/GA4. [Manual](../../manual-de-uso/growth/operar-meta-capi-servidor.md)
y [consentimiento](../../reference/measurement-gtm-ga4/09-hubspot-consent.md).

La recuperación reusa el evento GA4 de los formularios: se produce tras aceptación real
y se transporta al servidor GTM para convertirlo en Lead de Meta. No requiere otro evento
de submit ni un emisor backend nuevo. [Estado actual](../../audits/measurement/META_CAPI_RECOVERY_2026-10-13.md):
publicación y transporte verificados. La siguiente conversión comercial y replay real
quedan por observar; no se crearon formularios ni reservas de prueba.

Para remarketing de leads queda pendiente el enriquecimiento: email/teléfono y nombres
disponibles en hash compatible con Meta, junto con el origen comercial del Lead. Se deben
preparar desde el backend con consentimiento publicitario y enviarse sólo al servidor GTM,
sin pasar por Google Analytics ni dataLayer. La recuperación de transporte no incluyó esos
campos. El [contrato de ampliación](../../reference/measurement-gtm-ga4/08-meta-conversions-api-server-side.md#41-lead-utilizable-para-remarketing--requisito-confirmado-2026-10-13)
está definido; implementación y configuración de audiencias siguen pendientes.


## Matching de Leads — estado 2026-10-13

GA4 correcto486264460 ya tiene UPD/ack activados y siete audiencias comerciales90d
creadas/releídas, incluido scheduler confirmado. Link Ads existente conservado.
Implementación local de consentimiento publicitario en POST, hashing por proveedor y cola
cifrada probada; Meta Preview/Test Events mostró datos de coincidencia desde ambos hosts.
**La automatización de matching real todavía no está desplegada.** Release acotado, SQL,
refs y cutover pendientes. Contrato: [08 §4.2](../../reference/measurement-gtm-ga4/08-meta-conversions-api-server-side.md#42-implementación-de-matching-y-google-upd--2026-10-13).
No enviar hashes en parámetros GA4: UPD usa user_data top-level MP sin events adicionales.
