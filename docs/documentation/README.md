# Greenhouse EO — Documentacion de Plataforma

Documentacion funcional de Greenhouse en lenguaje simple. Cada documento explica como funciona un modulo o dominio del portal sin jerga tecnica, pero incluye enlaces a la documentacion de arquitectura para quien necesite el detalle tecnico.

## Indice por dominio

### Identidad y acceso

- [Como funciona el sistema de identidades](identity/como-funciona-identidad.md) — roles, permisos, supervisoria, responsabilidades operativas, candados de seguridad

### Admin Center

_Pendiente de documentar._

### Finanzas

_Pendiente de documentar._

### HR y Nomina

_Pendiente de documentar._

### Personas

_Pendiente de documentar._

### Agencia y Operaciones

_Pendiente de documentar._

### Delivery

_Pendiente de documentar._

### Herramientas IA

_Pendiente de documentar._

### Portal Cliente

_Pendiente de documentar._

---

## Documentacion tecnica (arquitectura)

Para detalle tecnico, schemas, contratos y decisiones de diseno, ver `docs/architecture/`:

| Documento | Dominio | Que cubre |
|-----------|---------|-----------|
| [GREENHOUSE_ARCHITECTURE_V1.md](../architecture/GREENHOUSE_ARCHITECTURE_V1.md) | Global | Arquitectura maestra del portal |
| [GREENHOUSE_IDENTITY_ACCESS_V2.md](../architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md) | Identidad | Auth, sesion, RBAC, route groups, scopes, audit |
| [GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md](../architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md) | Identidad | 4 planos de roles y jerarquias, taxonomia de roles |
| [GREENHOUSE_EVENT_CATALOG_V1.md](../architecture/GREENHOUSE_EVENT_CATALOG_V1.md) | Plataforma | Catalogo de eventos outbox, publishers, consumers |
| [GREENHOUSE_360_OBJECT_MODEL_V1.md](../architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md) | Global | Modelo canonico 360: Cliente, Colaborador, Persona, Space |
| [GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md](../architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md) | Datos | Estrategia PostgreSQL + BigQuery |
| [GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md](../architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md) | HR | Contrato completo de Payroll |
| [GREENHOUSE_FINANCE_ARCHITECTURE_V1.md](../architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md) | Finanzas | P&L engine, dual-store, outbox, allocations |
| [GREENHOUSE_UI_PLATFORM_V1.md](../architecture/GREENHOUSE_UI_PLATFORM_V1.md) | UI | Stack UI, librerias, patrones de componentes |
| [GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md](../architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md) | Identidad | Modelo person-org: poblaciones, grafos, session context |
