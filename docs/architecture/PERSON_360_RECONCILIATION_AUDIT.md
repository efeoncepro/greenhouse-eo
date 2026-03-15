# Person 360 Reconciliation Audit — 2026-03-15

## Resumen ejecutivo

Auditoria de cobertura de `identity_profile_id` como ancla canonica de persona en Greenhouse. Ejecutada contra Postgres runtime con `scripts/audit-person-360-coverage.ts`.

## Cobertura general

| Entidad | Total | Con identity_profile_id | Cobertura |
|---------|-------|------------------------|-----------|
| Identity Profiles | 38 | — | — |
| Members (team) | 7 | 7 | **100%** |
| Client Users | 39 | 37 | **94.9%** |
| CRM Contacts | 63 | 29 | **46.0%** |

### Relaciones cruzadas

| Metrica | Valor |
|---------|-------|
| Users con member vinculado | 7 |
| Internal users total | 8 |
| Internal users con member | 7 (87.5%) |
| Contacts con profile vinculado | 29 |
| Contacts con user vinculado | 29 |
| Contacts con owner_member | 63 (100%) |
| Contacts con owner_user | 61 (96.8%) |

## Cobertura de facetas por profile

| Faceta | Profiles con faceta | % de 38 |
|--------|-------------------|---------|
| Solo member | 7 | 18.4% |
| Solo user | 37 | 97.4% |
| Solo CRM contact | 29 | 76.3% |
| Member + User | 7 | 18.4% |
| Member + Contact | 0 | 0% |
| User + Contact | 29 | 76.3% |
| Las tres facetas | 0 | 0% |
| Sin ninguna faceta | 1 | 2.6% |

## Gaps identificados

| Gap | Cantidad | Impacto |
|-----|----------|---------|
| Members sin profile | 0 | Resuelto |
| Users sin profile | 2 | Bajo — cuentas test/demo |
| Contacts sin profile | 34 | Medio — contactos CRM sin vincular |
| Internal users sin member | 1 | Bajo — pendiente de vincular |
| Profiles sin faceta | 1 | Bajo — profile huerfano |

### Users sin identity_profile_id (2)

1. `user-greenhouse-client-test` — Cliente Prueba Greenhouse (cliente.prueba@efeoncepro.com)
2. `user-greenhouse-demo-client-executive` — Greenhouse Demo Executive (client.portal@efeonce.com)

Ambos son cuentas de prueba/demo. No requieren accion.

### Contacts sin identity_profile_id (34)

La mayoria son contactos CRM de clientes (ssilva.cl, gobiernosantiago.cl, ecoriles.cl) que no tienen cuenta de usuario en el portal. Es esperado — no todos los contactos CRM son usuarios del portal.

## Conclusion

La reconciliacion member-user esta en excelente estado (100% members tienen profile, 94.9% users). Los gaps son cuentas test y contactos CRM externos. **La plataforma esta lista para crear la vista `person_360`.**
