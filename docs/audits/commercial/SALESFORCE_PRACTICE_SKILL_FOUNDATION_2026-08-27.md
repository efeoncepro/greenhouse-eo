# Salesforce Practice Skill Foundation — 2026-08-27

> **Objeto:** fundar skills para operar y vender Salesforce CRM, Marketing Cloud Engagement y Marketing Cloud Next.
> **Estado:** research oficial + evidencia interna; estado contractual Efeonce pendiente de readback.
> **No autoriza:** org writes, contratos, licencias, deal registration, claims externos o publicación de ofertas.

## Decisiones

1. Se crean tres skills separadas porque CRM core, Engagement y Next tienen identidades, APIs, entitlements,
   deployment y riesgos distintos.
2. Cada skill incluye `operate` y `sell`; Engagement/Next incluyen además coexistencia.
3. No se usa `partner` en el nombre. El partnership histórico no demuestra estado actual ni Cloud Reseller.
4. Marketing Cloud Engagement es el nombre vigente del runtime anterior; no se rotula `legacy` ni en EOL.
5. Marketing Cloud Next es GA y trabaja junto a productos existentes; una migración requiere inventario y decisión
   por capability, no un supuesto rip-and-replace.

## Evidence ledger

| Claim                                                                                             | Evidencia                                           | As-of                           | Confianza                                      |
| ------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------- | ---------------------------------------------- |
| Salesforce Well-Architected organiza salud como Trusted, Easy y Adaptable                         | Salesforce Architects                               | 2026-08-27                      | alta                                           |
| Marketing Cloud Next es nativo en Salesforce Platform, GA y funciona junto a productos existentes | Salesforce News                                     | 2025-06 / verificado 2026-08-27 | alta                                           |
| Engagement+ preserva Engagement y agrega Growth/Advanced de Next                                  | Salesforce pricing/FAQ                              | 2026-08-27                      | alta                                           |
| Salesforce declara que Engagement no tiene planes EOL/EOS/EOR                                     | Salesforce pricing/FAQ                              | 2026-08-27                      | alta                                           |
| Consulting Partner y Cloud Reseller requieren tracks/autorizaciones separados                     | Salesforce Help + evidencia interna de programa     | 2026-08-27                      | alta para separación; estado Efeonce pendiente |
| Efeonce fue aceptada históricamente como Provisional Consulting Partner                           | correo Salesforce 2025-03-11 registrado en LIC-6533 | 2025-03                         | media actual; requiere portal vigente          |
| Efeonce no tiene certificaciones Salesforce verificadas en el corte interno                       | matriz LIC-6533 + declaración del operador          | 2026-08                         | media; refrescar antes de cada propuesta       |

## Riesgos que las skills deben bloquear

- vender reventa por tener Consulting Partner;
- usar certificaciones, badges o casos no verificados;
- decir “Marketing Cloud” sin producto/edición;
- tratar Engagement y Next como un solo runtime o API;
- prometer migración automática o features preview;
- habilitar campañas, journeys, flows, agents, cargas, permisos o deletes sin confirmación y readback;
- diseñar marketing antes de identidad, consentimiento, deliverability, source of truth y owner operativo;
- guardar pricing público como quote para Chile.

## Fuentes oficiales

- [Salesforce Well-Architected](https://architect.salesforce.com/docs/architect/well-architected/guide/overview)
- [Marketing Cloud Next announcement](https://www.salesforce.com/news/stories/marketing-cloud-next-announcement/)
- [Marketing Cloud Engagement pricing and Engagement+ FAQ](https://www.salesforce.com/marketing/engagement/pricing/)
- [Sales Cloud](https://www.salesforce.com/sales/cloud/)
- [Marketing Cloud Engagement developer guide](https://developer.salesforce.com/docs/marketing/marketing-cloud/guide/get-started-index)
- [Marketing Cloud Next developer guide](https://developer.salesforce.com/docs/marketing/marketing-cloud-growth/guide/mc-getting-started.html)
- [Salesforce consultant certifications](https://trailhead.salesforce.com/en/credentials/consultantoverview)
- [Salesforce credential verification](https://trailhead.salesforce.com/en/credentials/verification)
