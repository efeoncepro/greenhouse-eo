# CRM Platform Positioning — Gartner + señal enterprise Chile

> **Fecha de corte:** 2026-08-27
> **Owner:** Strategy + Commercial + RevOps & CRM
> **Estado:** evidencia secundaria verificada; demanda local pendiente de cuantificación first-party
> **Decisión que habilita:** posicionar la práctica de Efeonce por problema y segmento, no por un único provider.

## Resumen ejecutivo

HubSpot conserva, en el último reporte disponible al corte, posición de **Leader** en el Gartner Magic Quadrant
for B2B Marketing Automation Platforms 2025, por quinto año consecutivo. Ese reconocimiento no describe su posición
en CRM de ventas: el Gartner Magic Quadrant for CRM Sales Platforms 2026 lo ubica como **Challenger**, después de
haber sido Niche Player en Sales Force Automation 2025. Zoho también aparece como Challenger en 2026, después de
haber sido Visionary en 2025.

No existe un único Magic Quadrant de “CRM”. Gartner separa, entre otros, B2B Marketing Automation, CRM Sales
Platforms y Multichannel Marketing Hubs. Salesforce compite con ofertas distintas en esas superficies. Marketing
Cloud es particularmente relevante para grandes organizaciones B2C con alto volumen, journeys, personalización y
orquestación multicanal; HubSpot no fue incluido en el Magic Quadrant for Multichannel Marketing Hubs 2025.

La evidencia pública de Enel Chile, Abastible y Colbún corrobora presencia enterprise de Salesforce en Chile, pero
no permite inferir market share ni demostrar por sí sola que HubSpot esté siendo desplazado en todo el mercado. La
hipótesis de desplazamiento enterprise se clasifica como **confianza media** hasta contrastarla con pipeline,
win/loss, demanda, margen y base instalada de Efeonce.

## Evidence ledger

| Claim                                                                              | Evidencia                                               | As-of                  | Confianza                                                                       |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------- |
| HubSpot es Leader en B2B Marketing Automation por quinto año consecutivo           | Gartner report `6970466` + confirmación HubSpot         | 2025-09-23             | alta                                                                            |
| El refresh 2026 de B2B Marketing Automation estaba programado para 2026-09-22      | calendario público Gartner                              | 2026-08-27             | media; fecha futura susceptible a cambio                                        |
| HubSpot es Challenger en CRM Sales Platforms 2026 y avanzó desde Niche Player 2025 | Gartner report `8230961`; síntesis comparativa CX Today | 2026-08-06             | alta para cuadrante; media para interpretación de cautions sin reprint completo |
| Zoho es Challenger en CRM Sales Platforms 2026 y venía de Visionary 2025           | misma evidencia                                         | 2026-08-06             | alta para cuadrante                                                             |
| Salesforce participa en B2B Marketing Automation y Multichannel Marketing Hubs     | Gartner reports `6970466` y `6975966`                   | 2025-09                | alta                                                                            |
| HubSpot no fue incluido en Multichannel Marketing Hubs 2025                        | lista de vendors de Gartner report `6975966`            | 2025-09-22             | alta                                                                            |
| Salesforce tiene presencia enterprise observable en Chile                          | casos publicados de Enel Chile, Abastible y Colbún      | verificados 2026-08-27 | media; fuentes del vendor, no market share independiente                        |
| Efeonce mantiene relaciones de partner con HubSpot y Salesforce                    | declaración del CEO en sesión 2026-08-27                | 2026-08-27             | media interna; requiere readback de portal/acuerdo antes de claim externo       |

## Fuentes abiertas

- [Gartner — B2B Marketing Automation Platforms 2025](https://www.gartner.com/en/documents/6970466)
- [Gartner — CRM Sales Platforms 2026](https://www.gartner.com/en/documents/8230961)
- [Gartner — Critical Capabilities for CRM Sales Platforms 2026](https://www.gartner.com/en/documents/8243193)
- [Gartner — Multichannel Marketing Hubs 2025](https://www.gartner.com/en/documents/6975966)
- [Gartner — Critical Capabilities for Multichannel Marketing Hubs 2025](https://www.gartner.com/en/documents/6976466)
- [HubSpot — Leader B2B Marketing Automation 2025](https://www.hubspot.com/company-news/hubspot-named-a-leader-in-the-2025-gartner-magic-quadrant)
- [CX Today — movimientos CRM Sales Platforms 2026](https://www.cxtoday.com/crm/gartner-magic-quadrant-crm-sales-platforms-2026/)
- [Salesforce — Enel Chile](https://www.salesforce.com/mx/customer-stories/enel/)
- [Salesforce — Abastible](https://www.salesforce.com/mx/customer-stories/abastible)
- [Salesforce — Colbún](https://www.salesforce.com/mx/customer-stories/colbun/)
- [HubSpot — integración con Salesforce](https://knowledge.hubspot.com/es/salesforce/install-the-hubspot-salesforce-integration)

## Interpretación para Efeonce

### HubSpot-first

Encaja mejor cuando el problema dominante es demand generation B2B, adopción rápida, alineación marketing-ventas,
operación con un equipo pequeño o mediano y time-to-value. Gartner B2B Marketing Automation es evidencia útil sólo
para ese mercado y nunca debe extrapolarse a CRM Sales o marketing B2C multicanal.

### Salesforce-first

Encaja mejor cuando existe una base Salesforce instalada o cuando el problema exige complejidad enterprise,
jerarquías/territorios, integración corporativa, alto volumen B2C, journeys multicanal o continuidad con Sales,
Service, Data y Marketing Cloud. La recomendación depende de capacidad certificada, economics y delivery verificable
de Efeonce; el logo de partner no reemplaza esos gates.

### Arquitectura híbrida

HubSpot Marketing Hub puede operar con Salesforce como CRM mediante la integración oficial. Este carril requiere
definir fuente de verdad y ownership de `lead/contact`, `account/company`, lifecycle, consentimiento, attribution,
deduplicación y sincronización. No se recomienda por defecto: se justifica cuando preserva una base Salesforce que no
conviene migrar y HubSpot resuelve un job de marketing B2B con menor fricción.

## Decisión comercial

La práctica se denomina **Revenue Operations & CRM**. El diagnóstico es provider-neutral y provider-transparent;
la implementación se especializa por carril. No se vende “HubSpot” o “Salesforce” como sustituto de la práctica.

Antes de cambiar inversión, headcount o foco de certificaciones, Efeonce debe medir al menos 24 meses de:

- pipeline, win/loss y motivos por provider;
- segmento, tamaño, B2B/B2C e industria;
- demanda espontánea y origen del deal;
- margen de implementación y operación recurrente;
- capacidad/certificaciones y dependencia de terceros;
- expansión, retención y cross-sell posterior.

El resultado puede aumentar o reducir el peso de cada carril. Este audit no autoriza por sí solo una migración de
clientes, publicación de claims de partnership ni cambios en programas de partner.
