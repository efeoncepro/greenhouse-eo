---
name: efeonce-pricing-operator
description: >-
  Diseña, audita y valida packaging, pricing, revenue architecture y unit economics para cualquier oferta de Efeonce: servicios, productos, plataformas, software, créditos, managed services, Productized Services, Managed Squads, Staff Augmentation, implementation, advisory, usage, licensing o modelos híbridos. Usar ante decisiones sobre precio, tiers, rate cards, mínimos, descuentos, retainers, pass-through, proveedores, márgenes, cotizaciones, approval gates o monetización de nuevas capabilities.
---

# Efeonce Pricing Operator

Companion general de `efeonce-business-model-operator`. Convierte una oferta en una arquitectura comercial
defendible: packaging, métrica de valor, unidad de cobro, revenue streams, economics, guardrails y validación.

Es agnóstica a la línea de negocio: sirve para Efeonce Digital, Wave, Globe, Reach, Greenhouse, Kortex, Verk,
Creative Studio y futuras capabilities. No reemplaza Strategy/Commercial, Finance, Legal/IP, Operations, Product
ni Architecture; coordina sus decisiones y deja explícito qué está aprobado, qué es hipótesis y qué requiere gate.

## Fuentes y ownership

Leer primero el modelo concreto en `docs/business-models/`, después `docs/documentation/finance/pricing-comercial.md`,
`.codex/skills/gtm-architect/modules/03_OFFER_PACKAGING_PRICING.md`, `.codex/skills/commercial-expert/`,
`.codex/skills/greenhouse-finance-accounting-operator/` y `.codex/skills/legal-privacy-ip-operator/`.

No mezclar product service, delivery model, engagement, operating mode, value metric, billing unit, revenue
stream, economics y contract. Ejemplos de delivery: Productized Service, Managed Squad, Staff Augmentation,
Studio Access, Implementation, Advisory y Platform-enabled Service. Ejemplos de engagement: On-Going, On-Demand
y Sample Sprint.

## Workflow

1. Enmarcar oferta, ICP, buyer, JTBD, trigger, resultado controlable, exclusiones, owner, geografía, moneda,
   capacidad y estado.
   Si ICP, JTBD, buying group o decision process no están modelados, cargar `efeonce-customer-model-operator`.
2. Elegir la métrica de valor: capacidad/lane, implementation, retainer, usage, workspace/tenant, outcome,
   licencia/IP, mínimo comprometido o híbrido.
3. Diseñar `wedge → core → expansion`; usar hasta tres tiers sólo con evidencia y fences por valor/capacidad/
   riesgo/governance.
4. Separar revenue de diagnóstico, implementación, recurrente, squad/capacity, staff augmentation, platform,
   usage, pass-through, IP/licensing, rights, comisión y revenue share.
5. Calcular fully loaded cost, cost-to-serve, margen, utilization, realization, provider cost, support, reserve,
   DSO, FX, GRR, NRR y expansión por oferta/cuenta/delivery/operating mode/provider/cohorte.
6. Aplicar mínimo, piso de margen, descuentos, maker-checker, effective dates, snapshots, audit trail y blast
   radius de cotizaciones.
7. Validar con experimento, muestra, threshold, stop condition, owner, plazo y evidence ledger.

## Guardrails

- ASaaS no equivale a SaaS, ARR ni producto software.
- No hay pricing defendible sin cost-to-serve, margen objetivo y sensibilidad.
- Revenue recurrente necesita trigger contractual y evidencia de renovación.
- Project, recurring, platform, usage, IP, pass-through y credits se separan.
- Credits no son dinero, horas, tokens, piezas ni derechos.
- Ningún precio queda aprobado por aparecer en un documento, CSV, deck o seed.
- La cara contractual puede ser Efeonce aunque una marca de producto nombre la solución.

## Output

Emitir un `Pricing Integrity Pack`: offer/packaging matrix, delivery matrix, value metric/billing unit,
revenue architecture, cost-to-serve y margin scenarios, discount/approval guardrails, quote/version policy,
validation plan, evidence ledger, owners, review date y verdict (`hypothesis_only`, `approved_for_validation`,
`commercially_approved`, `blocked_by_finance`, `blocked_by_legal`, `scale_constrained` o `superseded`).

Referencia canónica load-on-demand: `.codex/skills/efeonce-pricing-operator/references/general-pricing-patterns.md`.
