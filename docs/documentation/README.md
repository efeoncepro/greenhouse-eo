# Greenhouse EO — Documentacion Funcional del Portal

Documentacion oficial de la plataforma Greenhouse. Cada documento describe como opera un modulo o dominio del portal en terminos claros, orientados a entender el funcionamiento y las reglas de negocio. Para detalle tecnico (schemas, APIs, decisiones de diseno), cada seccion enlaza a su spec de arquitectura correspondiente.

## Indice por dominio

### Identidad y acceso

- [Sistema de Identidad, Roles y Acceso](identity/sistema-identidad-roles-acceso.md) — roles, permisos, supervisoria, responsabilidades operativas, candados de seguridad

### Admin Center

- [Sets de permisos](admin-center/sets-de-permisos.md) — Gobierno de acceso por conjuntos reutilizables de vistas
- [Preview de correos](admin-center/preview-de-correos.md) — Herramienta admin para ver y probar templates de email antes de enviar, con cambio de idioma, viewport movil/escritorio y envio de prueba

### Plataforma interna y calidad

- [Sistema de Observabilidad de Tests](plataforma/sistema-observabilidad-de-tests.md) — inventario del suite, resultados, coverage, artifacts y como leer la ultima corrida sin abrir logs crudos
- [Sistema de Email Templates](plataforma/sistema-email-templates.md) — inventario de templates (react-email + Resend), design tokens, assets de marca, workflow Figma ↔ codigo

### Finanzas

_Pendiente de documentar._

### HR y Nomina

_Pendiente de documentar._

### Personas

_Pendiente de documentar._

### Agencia y Operaciones

- [Ops Worker — Crons Reactivos en Cloud Run](operations/ops-worker-reactive-crons.md) — servicio Cloud Run que procesa eventos reactivos del outbox, corridas scheduladas, ESM/CJS shim pattern, monitoreo en Ops Health
- [Acceso Programatico a Staging](operations/acceso-programatico-staging.md) — como agentes y CI acceden a Staging, bypass de SSO, comando `staging:request`, troubleshooting

### Delivery

- [Motor ICO — Metricas Operativas](delivery/motor-ico-metricas-operativas.md) — metricas operativas, materializacion diaria, cadena de fallback (Postgres/BQ/live), diagnostico

### Herramientas IA

_Pendiente de documentar._

### Portal Cliente

_Pendiente de documentar._

---

## Documentacion tecnica (arquitectura)

Para detalle tecnico, schemas, contratos y decisiones de diseno, ver `docs/architecture/`:

| Documento                                                                                                  | Dominio            | Que cubre                                                         |
| ---------------------------------------------------------------------------------------------------------- | ------------------ | ----------------------------------------------------------------- |
| [GREENHOUSE_ARCHITECTURE_V1.md](../architecture/GREENHOUSE_ARCHITECTURE_V1.md)                             | Global             | Arquitectura maestra del portal                                   |
| [GREENHOUSE_IDENTITY_ACCESS_V2.md](../architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md)                       | Identidad          | Auth, sesion, RBAC, route groups, scopes, audit                   |
| [GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md](../architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md) | Identidad          | 4 planos de roles y jerarquias, taxonomia de roles                |
| [GREENHOUSE_EVENT_CATALOG_V1.md](../architecture/GREENHOUSE_EVENT_CATALOG_V1.md)                           | Plataforma         | Catalogo de eventos outbox, publishers, consumers                 |
| [GREENHOUSE_360_OBJECT_MODEL_V1.md](../architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md)                     | Global             | Modelo canonico 360: Cliente, Colaborador, Persona, Space         |
| [GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md](../architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md) | Datos              | Estrategia PostgreSQL + BigQuery                                  |
| [GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md](../architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md)       | HR                 | Contrato completo de Payroll                                      |
| [GREENHOUSE_FINANCE_ARCHITECTURE_V1.md](../architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md)             | Finanzas           | P&L engine, dual-store, outbox, allocations                       |
| [GREENHOUSE_UI_PLATFORM_V1.md](../architecture/GREENHOUSE_UI_PLATFORM_V1.md)                               | UI                 | Stack UI, librerias, patrones de componentes                      |
| [GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md](../architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md)   | Identidad          | Modelo person-org: poblaciones, grafos, session context           |
| [Greenhouse_ICO_Engine_v1.md](../architecture/Greenhouse_ICO_Engine_v1.md)                                 | Delivery           | ICO Engine: metricas, materializacion, Cloud Run, fallback chain  |
| [Contrato_Metricas_ICO_v1.md](../architecture/Contrato_Metricas_ICO_v1.md)                                 | Delivery           | Formulas canonicas de metricas ICO, umbrales, trust               |
| [12-testing-development.md](../architecture/12-testing-development.md)                                     | Plataforma interna | Flujo actual de testing, observabilidad del suite, artifacts y CI |
| [GREENHOUSE_STAGING_ACCESS_V1.md](../architecture/GREENHOUSE_STAGING_ACCESS_V1.md)                         | Plataforma         | Acceso programatico a Staging: SSO bypass, agent auth, script     |
