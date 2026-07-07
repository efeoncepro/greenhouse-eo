> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-07-07 por Claude
> **Ultima actualizacion:** 2026-07-07 por Claude
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
