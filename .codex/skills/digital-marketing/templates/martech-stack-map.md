# Martech Stack Map

> Inventario y auditoría del stack. Menos y mejor integrado > más shiny tools. Ver `08`.

## Inventario
| Categoría | Tool | Dueño | Costo/año | ¿Usada? | Integra con | Solapamiento |
|---|---|---|---|---|---|---|
| CRM | | | | | | |
| MAP / email | | | | | | |
| CDP / datos | | | | | | |
| Ads / paid | | | | | | |
| Social / scheduling | | | | | | |
| Analytics / tag mgmt | | | | | | |
| ABM orchestration | | | | | | |
| Attribution | | | | | | |

## Arquitectura
- **Modelo:** suite integrada / best-of-breed componible / warehouse-native
- **Fuente de verdad (data warehouse):** ______ (en Greenhouse: PG + BigQuery)
- **CDP:** embebido / standalone / componible sobre warehouse

## First-party data
- **Captura (forms/zero-party/enriquecimiento):** ______
- **Consentimiento (Consent Mode v2 / base legal Ley 21.719):** ______
- **Activación (a ads/email):** ______

## Costura con Growth+CRO (medición)
- **UTM taxonomy (owner):** ______
- **Tag management (GTM/consent):** ______
- **Atribución/tracking plan:** cedido a `growth-marketing-cro`

## Acciones
- [ ] Consolidar solapamientos / retirar tools sin uso
- [ ] Cerrar integraciones rotas (una fuente de verdad)
- [ ] Reporting por canal reconciliado en warehouse
