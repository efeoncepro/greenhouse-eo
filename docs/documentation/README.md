# Greenhouse EO — Documentacion Funcional del Portal

Documentacion oficial de la plataforma Greenhouse. Cada documento describe como opera un modulo o dominio del portal en terminos claros, orientados a entender el funcionamiento y las reglas de negocio. Para detalle tecnico (schemas, APIs, decisiones de diseno), cada seccion enlaza a su spec de arquitectura correspondiente.

## Indice por dominio

### Identidad y acceso

- [Sistema de Identidad, Roles y Acceso](identity/sistema-identidad-roles-acceso.md) — roles, permisos, supervisoria, responsabilidades operativas, candados de seguridad

### Admin Center

- [Commercial Parties](admin-center/commercial-parties.md) — tablero administrativo del lifecycle comercial: lista de parties, embudo, conflictos de sync, detalle por party, transiciones manuales y sweep operativo
- [Product Sync Conflicts](admin-center/product-catalog-sync.md) — surface administrativa para detectar drift entre Greenhouse y HubSpot Products, revisar diffs y aplicar resoluciones auditables
- [Catalogo de Productos — Full Sync HubSpot](admin-center/catalogo-productos-fullsync.md) — admin UI completo del product catalog con sync bidireccional de 16 campos contra HubSpot, drift detection 3-niveles inline, backfill masivo, reconcile semanal y governance de campos read-only
- [Sets de permisos](admin-center/sets-de-permisos.md) — Gobierno de acceso por conjuntos reutilizables de vistas
- [Preview de correos](admin-center/preview-de-correos.md) — Herramienta admin para ver y probar templates de email antes de enviar, con cambio de idioma, viewport movil/escritorio y envio de prueba

### Plataforma interna y calidad

- [Capa de Contexto Estructurado](plataforma/capa-contexto-estructurado.md) — memoria estructurada sidecar para payloads normalizados, auditoría, replay operativo y trabajo asistido por agentes sin reemplazar la verdad relacional
- [Mi Perfil](plataforma/mi-perfil.md) — vista personal del colaborador: datos de identidad, equipos, proyectos, colegas y actividad reciente
- [Sister Platform Bindings](plataforma/sister-platform-bindings.md) — enlace formal entre scopes externos de apps hermanas y scopes internos de Greenhouse
- [Sistema de Observabilidad de Tests](plataforma/sistema-observabilidad-de-tests.md) — inventario del suite, resultados, coverage, artifacts y como leer la ultima corrida sin abrir logs crudos
- [Sistema de Email Templates](plataforma/sistema-email-templates.md) — inventario de templates (react-email + Resend), design tokens, assets de marca, workflow Figma ↔ codigo

### Finanzas

- [Ciclo de Vida de Parties Comerciales — Del Prospecto al Cliente Activo](finance/ciclo-de-vida-party-comercial.md) — lifecycle canonico de `Organization` (`prospect → opportunity → active_client → inactive → churned`), comandos CQRS, history inmutable, mapeo HubSpot con env override, eventos outbox, permisos. Fase A shipped en TASK-535; desbloquea sync inbound y selector unificado en Quote Builder.
- [Sincronizacion de Facturas a HubSpot — Continuidad Quote-to-Cash](finance/sincronizacion-facturas-hubspot.md) — heredar anchors CRM desde la cotizacion hacia `income`, espejar como `invoice` HubSpot non-billable, trazabilidad por fila (5 estados de sync), idempotencia, eventos outbox, degraded paths explicitos. Shipped en TASK-524.
- [Crear Deal desde el Cotizador — Sin salir a HubSpot](finance/crear-deal-desde-quote-builder.md) — drawer inline en el Quote Builder para crear el deal en HubSpot + mirror en Greenhouse + promover la organization a `opportunity` automaticamente. Idempotencia, rate limit 20/min, threshold de aprobacion $50M CLP, graceful fallback cuando el Cloud Run no tiene la ruta deployada. Shipped en TASK-539 (Fase E del programa Party Lifecycle).
- [Quote-to-Cash Atómico — Coreografía sin Pasos Intermedios Rotos](finance/quote-to-cash-atomico.md) — comando `convertQuoteToCash` que compone quote → contract → client → party → deal-won en una sola transacción atómica con correlation ID. Idempotente, gate dual-approval $100M CLP, auto-promoter reactivo desde `commercial.deal.won` de HubSpot. Shipped en TASK-541 (Fase G del programa Party Lifecycle).
- [IVA Explícito en Cotizaciones — Neto, IVA y Total separados](finance/iva-explicito-cotizaciones.md) — cada cotización persiste un snapshot tributario inmutable (código, tasa, monto, label) al emitirse; el motor de pricing sigue calculando margen sobre neto; builder / PDF / detail muestran Neto / IVA / Total explícitos. Soporta IVA 19% Chile, exento y no afecto. Shipped en TASK-530 sobre la foundation TASK-529.
- [IVA en Compras — Crédito Fiscal vs Costo Efectivo](finance/iva-compras-recuperabilidad.md) — gastos y compras ahora separan IVA recuperable vs no recuperable, persisten buckets tributarios explícitos y exponen un `effectiveCostAmount` que evita inflar P&L y economics con crédito fiscal. Shipped en TASK-532.
- [Libro IVA Mensual — Débito, Crédito y Saldo Fiscal](finance/libro-iva-posicion-mensual.md) — materialización mensual por `space_id` del débito fiscal de ventas, crédito fiscal recuperable de compras, IVA no recuperable y saldo del periodo. Incluye recompute/backfill y exportación CSV desde Finance. Shipped en TASK-533.
- [Catálogo de productos — Sincronización automática desde fuentes internas](finance/catalogo-productos-sincronizacion.md) — materializer reactivo que convierte eventos de los 4 catálogos fuente (sellable_roles, tool_catalog, overhead_addons, service_pricing) en upserts idempotentes al `product_catalog` con snapshot inmutable + checksum SHA-256. Emite `commercial.product_catalog.{created,updated,archived,unarchived}` para downstream HubSpot (TASK-547) y drift detection (TASK-548). Sub-flags por source para rollout incremental. Shipped en TASK-546 (Fase B del programa Product Catalog Sync).
- [Cotizaciones multi-source](finance/cotizaciones-multi-source.md) — cotizaciones de Nubox y HubSpot unificadas, sync automatico, creacion outbound, mapeo de estados
- [Cotizaciones — Gobernanza, versiones, aprobaciones y templates](finance/cotizaciones-gobernanza.md) — runtime de gobernanza interna: versiones con diff, approval por excepción conectado al margin health, terms library con variables, templates reutilizables y audit inmutable
- [Contratos comerciales](finance/contratos-comerciales.md) — contratos/SOW como entidad canónica post-venta: relación con quotes, document chain, rentabilidad, renovaciones y lane `/finance/contracts`
- [Pricing Comercial — Catálogo, Motor y Builder de Cotizaciones](finance/pricing-comercial.md) — **programa en diseño** (TASK-463..468): catálogo canónico de roles/tools/overhead/services, engine v2 multi-moneda con tier compliance, builder con cost stack gated, admin self-service y aislamiento payroll
- [Cotizador — Builder full-page de cotizaciones](finance/cotizador.md) — pantalla canónica `/finance/quotes/new` y `/edit` con source selector (catálogo / servicio / template / manual), provenance chips, avisos del pricing engine, FX readiness y override de precio unitario
- [Monedas y Tipos de Cambio — Foundation Plataforma](finance/monedas-y-tipos-de-cambio.md) — matriz canónica de monedas por dominio, política FX por dominio, readiness contract (supported/stale/unsupported/unavailable), registro declarativo de monedas y runbook operativo
- [HES — Recepción y validación de servicio](finance/hes-recepcion-y-validacion.md) — hoja de entrada de servicio como respaldo recibido del cliente, estados visibles y herencia documental desde la OC
- [PDF de Cotización — Documento Enterprise](finance/pdf-cotizacion-enterprise.md) — PDF rediseñado nivel enterprise con 8 secciones modulares (5 always + 3 conditional), branding Efeonce + sub-brand identification, fonts DM Sans + Poppins, QR signed para verificación de autenticidad y endpoint público que valida contra DB. Adaptativo: 2-3 páginas para quotes chicas / 6-7 páginas para enterprise. Shipped en TASK-629.
- [Modulos de Caja — Cobros, Pagos, Banco, Cuenta Accionista y Posicion de Caja](finance/modulos-caja-cobros-pagos.md) — cobros (cash in), pagos (cash out), tesoreria por instrumento, cuenta corriente accionista y diferencia devengado vs caja

### HR y Nomina

- [Sistema de Permisos y Licencias](hr/sistema-permisos-leave.md) — tipos de permiso, medio dia (AM/PM), calculo de dias habiles, flujo de aprobacion, saldo y acumulacion
- [Jerarquía de Reporte y Supervisoría](hr/jerarquia-reporte-supervisoria.md) — gestion de supervisores, delegaciones temporales, historial y diferencias con departamentos
- [Reliquidacion de Nomina](hr/reliquidacion-de-nomina.md) — reapertura de periodos exportados, versionamiento de entradas (v1/v2), delta a finanzas, ventana de 45 dias, auditoria inmutable
- [Objetivos y OKRs](hr/objetivos-okrs.md) — ciclos de objetivos, goals en cascada (empresa, departamento, individual), key results medibles, elegibilidad por contrato, self-service y admin

### Personas

- [Person Complete 360](personas/person-complete-360.md) — datos completos de una persona: facetas, autorizacion, cache, endpoint unificado

### Agencia y Operaciones

- [Account Complete 360](agency/cuenta-completa-360.md) — datos completos de una cuenta u organizacion: facetas, autorizacion, endpoint unificado
- [Ops Worker — Crons Reactivos en Cloud Run](operations/ops-worker-reactive-crons.md) — servicio Cloud Run que procesa eventos reactivos del outbox, corridas scheduladas, ESM/CJS shim pattern, monitoreo en Ops Health
- [Commercial Cost Worker](operations/commercial-cost-worker.md) — worker Cloud Run dedicado para la base de costos comercial, su ledger de corridas por periodo/scope y la separacion respecto de `ops-worker`
- [Postura Cloud GCP](operations/postura-cloud-gcp.md) — estado auditado de Cloud Run, Secret Manager, Cloud SQL, PostgreSQL y BigQuery; qué está sano, qué sigue riesgoso y cómo leer la topología compartida actual
- [Acceso Programatico a Staging](operations/acceso-programatico-staging.md) — como agentes y CI acceden a Staging, bypass de SSO, comando `staging:request`, troubleshooting

### Delivery

- [Motor ICO — Metricas Operativas](delivery/motor-ico-metricas-operativas.md) — metricas operativas, materializacion diaria, cadena de fallback (Postgres/BQ/live), diagnostico
- [Nexa Insights — Digest semanal para liderazgo](delivery/nexa-insights-digest-semanal.md) — resumen semanal interno por email con top insights ICO-first, audiencias, schedule, links al portal y limites del corte actual
- [Nexa Insights — Bloque en Agency, Home y 360](delivery/nexa-insights-bloque-agency.md) — superficie dentro del portal con KPIs, lista de senales recientes y modo Historial (timeline cross-period). Explica el toggle, causa raiz colapsable y menciones clickeables

### Herramientas IA

- [Generador Visual de Assets con IA](ai-tooling/generador-visual-assets.md) — generacion de imagenes (Imagen 4) y animaciones SVG (Gemini) para enriquecer interfaces, banners de perfil por categoria

### Portal Cliente

_Pendiente de documentar._

---

## Documentacion tecnica (arquitectura)

Para detalle tecnico, schemas, contratos y decisiones de diseno, ver `docs/architecture/`:

| Documento                                                                                                  | Dominio            | Que cubre                                                         |
| ---------------------------------------------------------------------------------------------------------- | ------------------ | ----------------------------------------------------------------- |
| [GREENHOUSE_ARCHITECTURE_V1.md](../architecture/GREENHOUSE_ARCHITECTURE_V1.md)                             | Global             | Arquitectura maestra del portal                                   |
| [GREENHOUSE_IDENTITY_ACCESS_V2.md](../architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md)                       | Identidad          | Auth, sesion, RBAC, route groups, scopes, audit                   |
| [GREENHOUSE_SISTER_PLATFORM_BINDINGS_RUNTIME_V1.md](../architecture/GREENHOUSE_SISTER_PLATFORM_BINDINGS_RUNTIME_V1.md) | Plataforma / Ecosistema | Runtime canonico de bindings entre sister platforms y scopes Greenhouse |
| [GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md](../architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md) | Identidad          | 4 planos de roles y jerarquias, taxonomia de roles                |
| [GREENHOUSE_EVENT_CATALOG_V1.md](../architecture/GREENHOUSE_EVENT_CATALOG_V1.md)                           | Plataforma         | Catalogo de eventos outbox, publishers, consumers                 |
| [GREENHOUSE_360_OBJECT_MODEL_V1.md](../architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md)                     | Global             | Modelo canonico 360: Cliente, Colaborador, Persona, Space         |
| [GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md](../architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md) | Datos              | Estrategia PostgreSQL + BigQuery                                  |
| [GREENHOUSE_STRUCTURED_CONTEXT_LAYER_V1.md](../architecture/GREENHOUSE_STRUCTURED_CONTEXT_LAYER_V1.md)     | Plataforma / Datos | Capa sidecar de contexto estructurado, tipado y versionado        |
| [GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md](../architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md)       | HR                 | Contrato completo de Payroll                                      |
| [GREENHOUSE_FINANCE_ARCHITECTURE_V1.md](../architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md)             | Finanzas           | P&L engine, dual-store, outbox, allocations                       |
| [GREENHOUSE_UI_PLATFORM_V1.md](../architecture/GREENHOUSE_UI_PLATFORM_V1.md)                               | UI                 | Stack UI, librerias, patrones de componentes                      |
| [GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md](../architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md)   | Identidad          | Modelo person-org: poblaciones, grafos, session context           |
| [Greenhouse_ICO_Engine_v1.md](../architecture/Greenhouse_ICO_Engine_v1.md)                                 | Delivery           | ICO Engine: metricas, materializacion, Cloud Run, fallback chain  |
| [Contrato_Metricas_ICO_v1.md](../architecture/Contrato_Metricas_ICO_v1.md)                                 | Delivery           | Formulas canonicas de metricas ICO, umbrales, trust               |
| [12-testing-development.md](../architecture/12-testing-development.md)                                     | Plataforma interna | Flujo actual de testing, observabilidad del suite, artifacts y CI |
| [GREENHOUSE_STAGING_ACCESS_V1.md](../architecture/GREENHOUSE_STAGING_ACCESS_V1.md)                         | Plataforma         | Acceso programatico a Staging: SSO bypass, agent auth, script     |
| [GREENHOUSE_PERSON_COMPLETE_360_V1.md](../architecture/GREENHOUSE_PERSON_COMPLETE_360_V1.md)               | Personas           | Person Complete 360: resolver federado, facetas, auth, cache      |
| [GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md](../architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md)   | IA / Tooling       | Generador visual: Imagen 4, Gemini SVG, banners por categoria     |
