# Catálogo de servicios Efeonce

> **Propietario:** Efeonce Group SpA — RUT 77.357.182-1
> **Sitio:** <https://efeoncepro.com>
> **Estado:** categoría documental activa
> **Última actualización:** 2026-07-17

## Propósito

`docs/services/` define las capacidades que Efeonce entrega y opera como servicio para clientes. Una ficha de
servicio explica el resultado contratado, alcance, entregables, forma de trabajo, responsabilidades, evidencia,
límites y continuidad gestionada. La implementación de un cliente puede servir como referencia comprobada, pero
no convierte sus datos en datos de Greenhouse.

Esta categoría complementa las tres capas documentales obligatorias:

| Capa | Pregunta que responde |
|---|---|
| `docs/services/` | ¿Qué servicio ofrece y asume Efeonce, con qué resultado, alcance y gobierno? |
| `docs/architecture/` | ¿Cuál es el contrato técnico y qué no se debe romper? |
| `docs/documentation/` | ¿Cómo funciona la capacidad desde producto y operación? |
| `docs/manual-de-uso/` | ¿Cómo se ejecuta, verifica, diagnostica y escala? |

## Fronteras

- No es un tarifario. Precios, descuentos y condiciones comerciales pertenecen a propuestas y contratos.
- No es un catálogo de componentes de software ni reemplaza `service_modules` o `/agency/services`.
- No es el objeto nativo `Service` de HubSpot. Ese objeto representa una instancia contratada/entregada dentro
  del CRM del cliente.
- No duplica arquitectura, manuales, auditorías ni informes. Cada ficha enlaza sus fuentes canónicas.
- Una referencia de cliente sólo puede reutilizarse externamente con la autorización correspondiente.

## Modelo de una ficha

Cada servicio debe declarar como mínimo:

1. promesa y resultado esperado;
2. problema y comprador/owner operativo;
3. alcance incluido, opcional y excluido;
4. entregables y evidencia de aceptación;
5. ciclo `intake -> inventory -> design -> propose -> approve -> execute -> verify -> document -> measure`;
6. responsabilidades Efeonce/cliente/plataforma;
7. dependencias, riesgos y estados degradados;
8. métricas con definición, período, baseline y denominador;
9. continuidad, soporte, cadence y procedimiento de cambio;
10. arquitectura, documentación funcional, manual y casos de referencia.

## Familias disponibles

- [HubSpot as a Service](hubspot-as-a-service/README.md)

## Wave — cartera de servicios productizados

Wave es una marca de producto de Efeonce. El cliente contrata y se relaciona con Efeonce; Wave nombra la solución
que diseña, construye y opera la capa digital inteligente. El catálogo económico canónico está en
[`Wave Business Model V1`](../business-models/wave/WAVE_BUSINESS_MODEL_V1.md) y el boundary de ownership en
[`ADR Wave Portfolio Boundaries`](../architecture/EFEONCE_WAVE_PORTFOLIO_BOUNDARIES_DECISION_V1.md).

| Familia | Servicios productizados |
|---|---|
| **Search Visibility 360** | Search Visibility Diagnostic · AEO Readiness Sprint · SEO Foundation Sprint · Search Architecture & Entity Authority · Search Visibility Operating System · Search Recovery & Migration |
| **Web Experience 360** | Web Foundation Sprint · Conversion Website · Agent-Ready Website · Website Rebuild & Migration · Web Performance Operations |
| **Measurement & Analytics** | Measurement Audit · Tagging/Data Layer · GTM/GA4 Implementation · Dashboard & Attribution · Analytics Operations |
| **Agent Systems & Platforms** | Agent Strategy & Architecture · Custom Agent System · Managed Agent Deployment · Agent Integrations · Agent Evaluation & Operations |
| **Digital Automation & Integrations** | API/Workflow Sprint · Data Pipeline · Automation Build · Integration Operations |

La composición de un proyecto puede incorporar capacidades de RevOps & CRM/Kortex, Creative Services/Globe o
Media & Distribution/Reach según el resultado contratado y el RACI definido. Wave conserva el ownership de sus
familias de servicio.

### Delivery models de Wave

Las familias anteriores son product services; el modelo de delivery se cotiza y gobierna por separado. Wave puede
entregar mediante Productized Service, Managed Squad, Staff Augmentation, Implementation, Advisory o
Platform-enabled Service, con engagements On-Going, On-Demand o Sample Sprint. Un proyecto puede combinar Wave con
RevOps & CRM/Kortex, Creative Services/Globe, Media & Distribution/Reach o Greenhouse sin mezclar ownership.
