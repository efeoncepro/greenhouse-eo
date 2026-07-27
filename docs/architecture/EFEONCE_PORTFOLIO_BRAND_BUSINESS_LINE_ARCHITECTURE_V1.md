# Efeonce Portfolio, Brand and Business Line Architecture V1

> **Status:** Accepted direction — taxonomy migration pending
> **Owner:** Efeonce Strategy + Commercial + Brand + Product
> **Scope:** Efeonce Group, business lines, practices, product brands, product services and Greenhouse commercial data
> **Date:** 2026-07-26

## 1. Decision

Efeonce is the umbrella/masterbrand and the primary commercial relationship. The portfolio is not organized as a
set of peer agencies. It is layered:

```text
Efeonce (umbrella/masterbrand)
└── Business line / practice
    └── Product brand or platform brand, when applicable
        └── Product service / offer
            └── Delivery model + engagement
```

The customer may recognize a product brand, but the commercial relationship, contract and accountability remain
with Efeonce unless an approved contract explicitly states otherwise.

## 2. Vocabulary

| Layer | Meaning | Example |
|---|---|---|
| **Masterbrand** | Umbrella brand and commercial relationship | Efeonce |
| **Business line / practice** | Durable capability that owns a customer problem, offer family, delivery and economics | Creative Services; Digital Services & Engineering; RevOps & CRM; Media & Distribution |
| **Product brand** | Named productized system or solution that enables or packages a business line | Globe; Wave; Reach; Kortex; Verk |
| **Platform brand** | Product/runtime that supports multiple lines or the customer relationship | Greenhouse |
| **Product service / offer** | Specific thing the customer buys, with scope, outcome, evidence and boundaries | RevOps Managed; Brand System; Search Visibility 360; Managed Media |
| **Delivery model** | How the offer is delivered and who owns the outcome | Productized Service; Managed Squad; Staff Augmentation; Implementation; Advisory |
| **Engagement** | Duration and commercial cadence | On-Going; On-Demand; Sample Sprint |

“Agencia creativa”, “agencia digital” and “agencia de medios” remain useful market language, but the canonical
portfolio taxonomy uses **Creative Services**, **Digital Services & Engineering**, and **Media & Distribution**
as business lines. They are not separate masterbrands or contractual agencies.

## 3. Current portfolio map

| Efeonce business line / practice | Product or platform brands that may enable it | Example offer families |
|---|---|---|
| **Creative Services** | Globe / Creative Studio; Greenhouse; ICO | brand systems, campaigns, content, copy, social, motion, audiovisual production, creative operations |
| **Digital Services & Engineering** | Wave; Greenhouse | Search Visibility 360, web experience, measurement, agent systems, automation and integrations |
| **RevOps & CRM** | Kortex; HubSpot; Greenhouse | CRM diagnostic, HubSpot implementation, RevOps Managed, Customer Agent, CRM Intelligence |
| **Media & Distribution** | Reach; Verk; Greenhouse | Distribution Strategy & Media Architecture; Performance & Commerce Distribution; Influence, Earned & Partnership Distribution |
| **Growth Strategy & Measurement** | Greenhouse; Verk; Wave; Kortex | growth strategy, revenue enablement, analytics, attribution and cross-line orchestration |

This map is a portfolio routing contract, not a claim that every listed brand is a separate legal entity, vendor or
provider. Product ownership, delivery ownership and contractual ownership must remain explicit per offer.

## 4. Brand and contract rules

1. Lead with **Efeonce** for the relationship, proposal, contract and account ownership.
2. Name a product brand when it improves comprehension, proof or differentiation; do not make the buyer assemble a
   fake supplier group from internal labels.
3. A product brand does not automatically own the whole business line. **Globe does not equal all Creative Services**;
   **Wave does not equal all Digital Services**; **Reach does not equal every distribution capability**.
4. A business line may sell offers without a product brand, and a product brand may support more than one line when
   its ownership and interfaces are declared.
5. Creative Studio / Globe is a productized production system and differentiator inside Creative Services; it is not
   the name of the whole creative agency practice.
6. Kortex is the product/capability for CRM intelligence and programmatic HubSpot delivery; HubSpot remains the
   external platform/provider, and Efeonce owns the service relationship.
7. Greenhouse is the operational/customer control plane and may be part of an offer without becoming the seller of
   every service.

## 5. Commercial data contract

Commercial records should preserve the layers instead of using a single “business unit” label:

```text
masterbrand = Efeonce
business_line = Creative Services | Digital Services & Engineering | RevOps & CRM | Media & Distribution | Growth Strategy & Measurement
product_brand = optional named product/platform
offer = concrete product service
delivery_model = governed delivery choice
engagement = On-Going | On-Demand | Sample Sprint
```

HubSpot and Greenhouse must use `business_line` for ownership/reporting, `product_brand` for solution attribution,
and `offer` for what was actually sold. Pipelines remain sales motions (`New Business`, `Expansion`, `HubSpot Shared
Selling`), not business lines.

## 6. Migration rule

Existing documents that call Globe, Wave, Reach or Efeonce Digital “the agency”, “the four brands” or peer contractual
providers must be corrected when they are current operating or commercial guidance. Historical records and runtime
identifiers may retain the old label when changing it would corrupt evidence; add a pointer to this decision instead.

Canonical sources that describe the portfolio should link here rather than restating a competing taxonomy.
