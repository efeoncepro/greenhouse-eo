# El dominio `growth` en Greenhouse — boundary

> Fuente de verdad: `docs/architecture/GREENHOUSE_GROWTH_DOMAIN_ARCHITECTURE_V1.md`
> (Status: *Accepted direction — domain to be created by future tasks*, 2026-06-24).
> Código residente hoy: `src/lib/growth/**`.

## Resumen canónico (verbatim del charter)

```text
growth owns acquisition intelligence and pre-pipeline diagnostic motions;
commercial owns qualified revenue motion after handoff.
```

## Qué OWNS el dominio growth

- Atraer o calificar demanda **antes** de que exista una oportunidad de revenue aceptada.
- Producir evidencia diagnóstica que usa ventas/estrategia/servicios productizados.
- Medir y mejorar **superficies de adquisición**.
- Hacer **handoff de intención calificada** a HubSpot/commercial.
- Retener historia de adquisición reusable para inteligencia de cuenta futura.

Identificadores canónicos: dominio `Growth`, module key `growth`, schema
`greenhouse_growth`. Capabilities residentes iniciales: AI Visibility Grader +
Public Forms Engine.

## Qué NO owns (hand-offs duros)

| No es de growth | Dueño |
|---|---|
| Deal lifecycle, quotes, contratos, quote-to-cash, expansión/renewal | `commercial` (→ skill `commercial-expert`) |
| Hosting del sitio público, CMS, deploy, ownership de rutas | `public_site` |
| Producción de contenido | `Verk` |
| Implementación/advisory de CRM | `Kortex` |
| Reliability/tooling general de plataforma | `platform` |
| Infra de proveedores de IA compartida | (compartido; salvo específico de una capability growth) |
| SEO/AEO técnico, schema, "ser citado por IA" | skill `seo-aeo` |

## Cómo lo usa esta skill

Esta skill de Growth Marketing + CRO es el **conocimiento y método** para operar el
dominio `growth`: diagnosticar el funnel de adquisición pre-pipeline, modelar el loop
del lead magnet, optimizar las superficies de conversión (landings, forms) y medirlas.
Cuando el trabajo cruza a `commercial` (calificar → cerrar) o a `seo-aeo` (visibilidad
técnica), **nómbralo y encadena** a la skill dueña; no reimplementes su lógica.

## Regla anti-drift

Si vas a construir algo de adquisición/lead-magnet/experimento/atribución pre-pipeline,
va en `growth` (`src/lib/growth/**`, schema `greenhouse_growth`), **no** en `commercial`
ni en un bucket vago de "marketing". Antes de crear runtime, carga el charter y las
skills `arch-architect` + `greenhouse-backend`.
