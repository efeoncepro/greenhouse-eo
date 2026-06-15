# TASK-1140 — Greenhouse operating manuals ingestion into Nexa Knowledge

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance|hr|payroll|workforce|contractor|commercial|agency|delivery|identity|admin|admin-center|personas|client-portal|integrations|sync|communications|notifications|public-site|ui-platform|ai-tooling|content|ai|nexa|knowledge`
- Blocked by: `none`
- Branch: `task/TASK-1140-finance-manuals-nexa-knowledge-ingestion`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Ingestar el paquete documental operativo de Greenhouse al corpus Knowledge/Nexa para que Nexa pueda responder preguntas sobre Finance, People/Workforce/Payroll/Contractors, Comercial/Quote-to-Cash, Agency/Delivery/Account 360, Identity/Access/Admin Center, My Space/Self-Service, Portal Cliente/Customer Experience, Integraciones/Sync, Comunicaciones/Notificaciones, AI Tooling/Content/Assets, Public Site/Content Factory y UI Platform/Design System con fuentes correctas y citas gobernadas.

Esta task NO crea nueva capacidad de negocio ni ejecuta acciones desde Nexa. Solo hace disponible el conocimiento documentado para respuestas grounded.

## Why This Task Exists

La revision local del 2026-06-15 mostro que Nexa ya tiene `search_knowledge`, pero las preguntas sobre dominios operativos pueden recuperar documentos generales o parciales con confianza alta. El gap no es solo de prompt: faltaba un paquete end-to-end listo para corpus y un set de golden questions que asegure que Nexa cite fuentes correctas cuando responde sobre caja/tesoreria, nomina, contractors, comercial, delivery, identidad, self-service, portal cliente, integraciones, comunicaciones, AI tooling, public site o plataforma UI.

## Goal

- Registrar los manuales/documentos operativos recientes en el corpus Knowledge gobernado.
- Asegurar que preguntas sobre Finance, People, Comercial, Agency, Identity, My Space, Portal Cliente, Integraciones/Sync, Comunicaciones/Notificaciones, AI Tooling, Public Site y UI Platform recuperen fuentes correctas.
- Agregar QA/evals de wrong-source por dominio antes de considerar activacion productiva.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/nexa-intelligence/README.md`
- `docs/architecture/nexa-intelligence/manifest.json`
- `docs/documentation/plataforma/knowledge-platform.md`
- `docs/documentation/plataforma/nexa-conversational-experience.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_V1.md`
- `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_WORKFORCE_PAYABLES_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_WORKFORCE_EXIT_PAYROLL_ELIGIBILITY_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_AGENCY_LAYER_V2.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_MY_PERFORMANCE_SELF_SERVICE_ACTIVITY_V1.md`
- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md`
- `docs/architecture/GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_EMAIL_CATALOG_V1.md`
- `docs/architecture/GREENHOUSE_NOTIFICATION_HUB_V1.md`
- `docs/architecture/GREENHOUSE_TEAMS_NOTIFICATIONS_V1.md`
- `docs/architecture/GREENHOUSE_TEAMS_BOT_INTERACTION_V1.md`
- `docs/architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md`
- `docs/architecture/GREENHOUSE_PORTAL_VIEWS_V1.md`
- `docs/architecture/MULTITENANT_ARCHITECTURE.md`
- `docs/architecture/GREENHOUSE_PUBLIC_WEBSITE_LANDING_CONTROL_PLANE_ARCHITECTURE_V1.md`
- `docs/architecture/ui-platform/README.md`

Reglas obligatorias:

- Nexa debe responder con grounding y citas; si falta evidencia, debe decirlo.
- No activar acciones financieras desde Nexa en esta task.
- No activar acciones HR/Payroll/Contractors desde Nexa en esta task.
- No activar acciones comerciales, administrativas, Public Site, identidad o UI Platform desde Nexa en esta task.
- No exponer datos sensibles de cuentas/perfiles de pago.
- No exponer datos personales, permisos de otros usuarios, secretos WordPress/Kinsta/GCP, Application Passwords, tokens, client secrets ni endpoints internos sensibles.
- No promover Knowledge production sin QA y decision explicita.
- Mantener separadas las capas documento, caja, banco, settlement, conciliacion, P&L y contabilidad legal.
- Clasificar worker antes de responder calculo o pago.
- No aplicar reglas Chile dependiente a honorarios, contractors, Deel/EOR o internacional.
- Mantener separado Contractor Engagement -> Contractor Payable -> Finance Payment Order.
- Mantener separado Comercial/Quote-to-Cash de Finance/caja: una cotizacion emitida o contrato no equivale a ingreso cobrado ni conciliado.
- Mantener separado Identity/Admin Center de bypass operativo: roles, vistas, entitlements y SCIM se gobiernan con auditoria.
- Mantener separado Portal Cliente de Admin Center: cliente ve modulos/vistas asignadas; operador gobierna asignaciones.
- Mantener separado sync triggered de sync completada: `triggered=true` no garantiza projection ni data quality.
- Mantener separado webhook recibido de fuente final procesada: el webhook es aviso/evidencia, no necesariamente estado final.
- Mantener separado email `sent` de `delivered` o leido.
- Mantener separado TeamBot de Nexa: TeamBot no es bot conversacional general.
- Mantener separado AI Tools catalog/credits de facturacion, caja o catalogo comercial.
- Mantener separado asset generation de aprobacion de marca o publicacion.
- Mantener separado Public Site read-only/draft-only de publicar o mutar produccion.
- Mantener separado UI Platform guidance de implementacion automatica: Nexa puede explicar primitives/GVC/tokens, pero no debe modificar UI en esta task.

## Normative Docs

- `docs/documentation/finance/operacion-finance-end-to-end.md`
- `docs/manual-de-uso/finance/registrar-ingresos-egresos-y-ordenes-de-pago.md`
- `docs/manual-de-uso/finance/caja-cobros-pagos-y-liquidaciones.md`
- `docs/manual-de-uso/finance/conciliacion-bancaria-operacion.md`
- `docs/manual-de-uso/finance/instrumentos-de-pago-y-banco.md`
- `docs/documentation/finance/modulos-caja-cobros-pagos.md`
- `docs/documentation/finance/ordenes-de-pago.md`
- `docs/manual-de-uso/finance/ordenes-de-pago.md`
- `docs/documentation/finance/pagos-a-contractors.md`
- `docs/manual-de-uso/finance/pagos-a-contractors.md`
- `docs/documentation/finance/conciliacion-bancaria.md`
- `docs/manual-de-uso/finance/sugerencias-asistidas-conciliacion.md`
- `docs/documentation/finance/distribucion-costos-pnl.md`
- `docs/manual-de-uso/finance/distribucion-costos-pnl.md`
- `docs/documentation/hr/people-workforce-payroll-contractors-end-to-end.md`
- `docs/manual-de-uso/hr/operar-workforce-payroll-contractors-end-to-end.md`
- `docs/documentation/hr/workforce-activation-readiness.md`
- `docs/manual-de-uso/hr/habilitar-colaborador-workforce.md`
- `docs/manual-de-uso/hr/completar-ficha-laboral.md`
- `docs/documentation/hr/periodos-de-nomina.md`
- `docs/manual-de-uso/hr/periodos-de-nomina.md`
- `docs/documentation/hr/recibos-y-reporte-mensual.md`
- `docs/manual-de-uso/hr/descargar-y-reconciliar-nomina.md`
- `docs/documentation/hr/payroll-compliance-exports-chile.md`
- `docs/manual-de-uso/hr/payroll-compliance-exports-chile.md`
- `docs/documentation/hr/reliquidacion-de-nomina.md`
- `docs/documentation/hr/ajustes-de-pago-en-nomina.md`
- `docs/manual-de-uso/hr/ajustar-pago-de-nomina.md`
- `docs/documentation/hr/finiquitos.md`
- `docs/manual-de-uso/hr/finiquitos.md`
- `docs/documentation/hr/offboarding.md`
- `docs/manual-de-uso/hr/offboarding.md`
- `docs/documentation/hr/contratistas-self-service.md`
- `docs/documentation/hr/contratistas-engagement-ciclo-de-vida.md`
- `docs/documentation/hr/contratistas-onboarding.md`
- `docs/manual-de-uso/hr/contratistas.md`
- `docs/documentation/hr/contratistas-flujo-de-pago-completo.md`
- `docs/documentation/comercial/quote-to-cash-comercial-end-to-end.md`
- `docs/manual-de-uso/comercial/operar-quote-to-cash-comercial.md`
- `docs/documentation/agency/agency-delivery-account-360-end-to-end.md`
- `docs/manual-de-uso/agency/operar-agency-delivery-account-360.md`
- `docs/documentation/identity/identity-access-admin-center-end-to-end.md`
- `docs/manual-de-uso/identity/operar-identity-access-admin-center.md`
- `docs/documentation/personas/my-space-self-service-end-to-end.md`
- `docs/manual-de-uso/personas/operar-mi-espacio-self-service.md`
- `docs/documentation/public-site/public-site-content-factory-end-to-end.md`
- `docs/manual-de-uso/public-site/operar-public-site-content-factory.md`
- `docs/documentation/plataforma/ui-platform-design-system-end-to-end.md`
- `docs/manual-de-uso/plataforma/operar-ui-platform-design-system.md`
- `docs/documentation/client-portal/portal-cliente-customer-experience-end-to-end.md`
- `docs/manual-de-uso/client-portal/operar-portal-cliente-customer-experience.md`
- `docs/documentation/client-portal/menu-dinamico-y-acceso-a-modulos.md`
- `docs/manual-de-uso/client-portal/menu-dinamico-y-empty-states.md`
- `docs/documentation/operations/integraciones-y-sync-end-to-end.md`
- `docs/manual-de-uso/operations/operar-integraciones-y-sync.md`
- `docs/documentation/operations/notion-bigquery-sync.md`
- `docs/manual-de-uso/operations/notion-bq-sync-operacion.md`
- `docs/documentation/plataforma/comunicaciones-notificaciones-end-to-end.md`
- `docs/manual-de-uso/plataforma/operar-comunicaciones-notificaciones.md`
- `docs/documentation/plataforma/sistema-email-templates.md`
- `docs/documentation/admin-center/preview-de-correos.md`
- `docs/documentation/ai-tooling/ai-tooling-content-assets-end-to-end.md`
- `docs/manual-de-uso/ai-tooling/operar-ai-tooling-content-assets.md`
- `docs/documentation/ai-tooling/generador-visual-assets.md`
- `docs/documentation/admin-center/admin-center-operacion-end-to-end.md`
- `docs/manual-de-uso/admin-center/operar-admin-center.md`
- `docs/documentation/admin-center/sets-de-permisos.md`

## Dependencies & Impact

### Depends on

- Knowledge foundation (`greenhouse_knowledge`) disponible en ambiente objetivo.
- Nexa Knowledge retrieval flags activos en ambiente de validacion.
- Corpus/manifest actual en `src/lib/knowledge/ingestion/pilot-corpus.ts` y/o `src/lib/knowledge/notion/notion-corpus.ts`.

### Blocks / Impacts

- Mejora futura de respuestas operativas multi-dominio en Nexa Chat.
- QA de answer quality por dominio finance/hr/payroll/contractor/commercial/agency/identity/personas/public-site/ui-platform.
- Futuras tasks de action runtime deben apoyarse en este conocimiento, pero no quedan desbloqueadas para ejecutar writes.

### Files owned

- `src/lib/knowledge/ingestion/pilot-corpus.ts`
- `src/lib/knowledge/notion/notion-corpus.ts`
- `src/lib/knowledge/**`
- `src/lib/nexa/**`
- `docs/documentation/finance/**`
- `docs/manual-de-uso/finance/**`
- `docs/documentation/hr/**`
- `docs/manual-de-uso/hr/**`
- `docs/documentation/comercial/**`
- `docs/manual-de-uso/comercial/**`
- `docs/documentation/agency/**`
- `docs/manual-de-uso/agency/**`
- `docs/documentation/identity/**`
- `docs/manual-de-uso/identity/**`
- `docs/documentation/personas/**`
- `docs/manual-de-uso/personas/**`
- `docs/documentation/client-portal/**`
- `docs/manual-de-uso/client-portal/**`
- `docs/documentation/operations/**`
- `docs/manual-de-uso/operations/**`
- `docs/documentation/ai-tooling/**`
- `docs/manual-de-uso/ai-tooling/**`
- `docs/documentation/admin-center/**`
- `docs/manual-de-uso/admin-center/**`
- `docs/documentation/public-site/**`
- `docs/manual-de-uso/public-site/**`
- `docs/documentation/plataforma/**`
- `docs/manual-de-uso/plataforma/**`
- `docs/tasks/to-do/TASK-1140-finance-manuals-nexa-knowledge-ingestion.md`

## Current Repo State

### Already exists

- Nexa Chat tiene tool `search_knowledge`.
- `NEXA_KNOWLEDGE_RETRIEVAL_ENABLED` esta activo en local/staging segun handoff vigente; produccion permanece gateada.
- Existen docs finance especializados para caja, ordenes, conciliacion, contractors, P&L y perfiles.
- El 2026-06-15 se agrego un documento funcional end-to-end reconciliado contra codigo/DB y manuales operador para ingresos/egresos/pagos/ordenes, caja/liquidaciones, conciliacion bancaria e instrumentos/Banco.
- Existen manuales HR/Payroll/Contractors individuales para Workforce Activation, periodos de nomina, exports, pagos, adjustments, finiquitos y contractors.
- El 2026-06-15 se agrego un documento funcional end-to-end y manual operador que conectan People/Workforce/Payroll/Contractors/Finance, reconciliados contra codigo y DB read-only.
- Existen docs especializados de Comercial, Agency/Delivery, Identity, My Space, Public Site y UI Platform, pero estaban fragmentados por feature o arquitectura.
- El 2026-06-15 se agregaron documentos funcionales end-to-end y manuales operador para Comercial/Quote-to-Cash, Agency/Delivery/Account 360, Identity/Access/Admin Center, My Space/Self-Service, Public Site/Content Factory y UI Platform/Design System, reconciliados contra codigo y DB read-only cuando el dominio tiene runtime relacional.
- Existen docs especializados de Portal Cliente, Integraciones/Sync, email/templates, Teams, AI Visual Assets y Admin Center, pero estaban fragmentados por feature o arquitectura.
- El 2026-06-15 se agregaron documentos funcionales end-to-end y manuales operador para Portal Cliente/Customer Experience, Integraciones/Sync, Comunicaciones/Notificaciones, AI Tooling/Content/Assets y Admin Center residual. Se reviso codigo/schema y DB viva agregada sin PII tras relanzar el flujo canonico de `gcloud auth login` + `gcloud auth application-default login`.
- Snapshot DB agregado usado por los documentos nuevos: Portal Cliente tiene 10 modulos activos y 0 asignaciones activas; Integrations tiene 7 integraciones activas (6 ready/1 warning), runs recientes y webhooks procesando; Comunicaciones tiene 53 email deliveries `sent` en 30 dias, 209 notificaciones in-app y 3 canales Teams Bot ready; AI Tooling tiene 34 tools activas y sin wallets/licencias/ledger cargados; Admin Center tiene 104 vistas activas, 442 grants, 0 overrides y 0 Service SLAs en este ambiente.

### Gap

- Los documentos Finance nuevos no estan registrados en el corpus Knowledge/Nexa.
- Los documentos People/Workforce/Payroll/Contractors nuevos no estan registrados en el corpus Knowledge/Nexa.
- Los documentos Comercial, Agency, Identity, My Space, Public Site y UI Platform nuevos no estan registrados en el corpus Knowledge/Nexa.
- Los documentos Portal Cliente, Integraciones/Sync, Comunicaciones/Notificaciones, AI Tooling/Content/Assets y Admin Center nuevos no estan registrados en el corpus Knowledge/Nexa.
- No existe set de golden questions Finance que bloquee wrong-source.
- No existe set de golden questions People/Payroll/Contractors que fuerce a Nexa a distinguir regimenes laborales.
- No existe set de golden questions Comercial/Agency/Identity/My Space/Public Site/UI Platform que fuerce respuestas con fuentes del dominio correcto.
- No existe set de golden questions Portal Cliente/Integraciones/Comunicaciones/AI Tooling/Admin Center que fuerce respuestas con fuentes del dominio correcto.
- Preguntas finance pueden recuperar docs generales de Greenhouse/Nexa con confianza alta.
- Preguntas contractor pueden recuperar solo Finance o solo HR y omitir la cadena completa.
- Preguntas comerciales pueden recuperar docs Finance legacy y confundir cotizacion/contrato con caja o ingreso reconocido.
- Preguntas de Agency/Account 360 pueden recuperar docs de cliente o delivery aislados y omitir degradacion por faceta.
- Preguntas de identidad pueden responder con conceptos generales de rol/permiso y no con el contrato real de view registry, entitlements, permission sets y SCIM.
- Preguntas de Public Site pueden omitir la postura read-only/draft-only y sugerir publicar o mutar WordPress sin guardrails.
- Preguntas de UI Platform pueden omitir Composition Shell, Primitive+Variants+Kinds, tokens, GVC o las restricciones contra imports directos.
- Preguntas de Portal Cliente pueden confundir modulo comprado/asignado con permiso de vista, o zero-state con error.
- Preguntas de Integraciones pueden confundir trigger manual con projection completada, o webhook recibido con dato final.
- Preguntas de Comunicaciones pueden confundir `sent` con `delivered` o TeamBot con Nexa conversacional.
- Preguntas de AI Tooling pueden confundir wallet/ledger de creditos con facturacion/caja o asset generation con publicacion.
- Preguntas de Admin Center pueden proponer SQL/bypass en vez de view registry, capability y audit.
- La sensibilidad de perfiles, cuentas e instrumentos ya quedo documentada; la ingestion debe conservar metadata/policy para no exponer datos sensibles.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Corpus registration

- Registrar los docs normativos Finance, People, Workforce, Payroll, Contractors, Comercial, Agency, Delivery, Identity, Admin Center, Personas/My Space, Portal Cliente, Integraciones/Sync, Comunicaciones/Notificaciones, AI Tooling/Content/Assets, Public Site y UI Platform en el corpus Knowledge correspondiente.
- Asignar metadata de dominio (`finance`, `hr`, `payroll`, `workforce`, `contractor`, `commercial`, `agency`, `delivery`, `identity`, `admin`, `personas`, `client-portal`, `integrations`, `sync`, `communications`, `notifications`, `ai-tooling`, `content`, `public-site`, `ui-platform`), tipo `documentation` o `manual`, sensitivity interna y policy `agent_allowed` solo para contenido operativo no sensible.
- Evitar duplicar documentos ya ingestado; si existe fuente previa, actualizarla en lugar de crear una entrada paralela.

### Slice 2 — Retrieval and answer QA

- Agregar golden questions en espanol para:
  - "como registro un ingreso";
  - "como registro un egreso";
  - "como registro un cobro";
  - "como registro un pago";
  - "cuando uso una orden de pago";
  - "que hace automatico Greenhouse en Finance";
  - "que hace el operador";
  - "como registro un instrumento bancario";
  - "como asigno un instrumento a un pago";
  - "cuando uso transferencia interna";
  - "como funciona conciliacion";
  - "como se pagan contractors";
  - "por que processor no es cuenta bancaria";
  - "como llega esto al P&L";
  - "como habilito un colaborador en Workforce Activation";
  - "que bloquea completar una ficha laboral";
  - "como creo y calculo un periodo de nomina";
  - "que hace automatico Greenhouse en payroll";
  - "que debe revisar el operador antes de aprobar nomina";
  - "como funciona honorarios";
  - "por que honorarios no tiene AFP/salud/cesantia";
  - "como funciona Deel/EOR o internacional";
  - "aprobar una entrega contractor paga automaticamente";
  - "como llega un contractor payable a Finance";
  - "como hago employee to contractor";
  - "cuando corresponde finiquito";
  - "marcar pagado es lo mismo que conciliar";
  - "como creo una cotizacion";
  - "draft, issued y expired significan lo mismo";
  - "cuando una cotizacion requiere aprobacion";
  - "HubSpot es el source of truth de productos";
  - "cotizacion emitida es ingreso cobrado";
  - "como leo Account 360";
  - "que significa una faceta degradada";
  - "que es ICO y que no es";
  - "service attribution es Service P&L completo";
  - "como opero sample sprints";
  - "rol, vista, entitlement y permission set son lo mismo";
  - "como doy acceso a una ruta";
  - "por que un usuario no ve una vista";
  - "como funciona SCIM con Entra";
  - "como veo mi recibo o mi perfil de pago";
  - "por que no puedo ver datos de otra persona desde My Space";
  - "como reviso performance self-service";
  - "como inspecciono un post del Public Site";
  - "que es refresh plan, patch plan y draft";
  - "puede Nexa publicar el sitio publico";
  - "que ve un cliente en Portal Cliente";
  - "como activo un modulo cliente";
  - "por que un cliente no ve Analytics";
  - "zero-state es un error";
  - "que significa degraded en Portal Cliente";
  - "como se si una integracion esta sana";
  - "que es raw conformed projection";
  - "puedo disparar una sync manual";
  - "triggered significa que la sync termino";
  - "un webhook recibido ya es dato final";
  - "como reviso si un email fallo";
  - "sent significa delivered";
  - "TeamBot puede conversar como Nexa";
  - "como apago un tipo de correo";
  - "como registro una herramienta IA";
  - "wallet de creditos IA es caja o factura";
  - "AI Tooling puede publicar en WordPress";
  - "que administra Admin Center";
  - "responsibility da permiso automaticamente";
  - "como construyo una pantalla nueva en Greenhouse";
  - "cuando uso Composition Shell";
  - "que significa Primitive + Variants + Kinds";
  - "cuando corro GVC";
  - "puedo copiar colores de Figma directo al JSX".
- Validar que `search_knowledge` recupera fuentes correctas por dominio y no docs generales.
- Agregar caso negativo: si la pregunta pide accion financiera, HR, Payroll, Comercial, Admin, Public Site o UI, Nexa debe explicar y no ejecutar.

### Slice 3 — Nexa response safety

- Ajustar prompts/evals solo si la ingestion no basta para evitar wrong-source.
- Asegurar que Nexa separa documento, caja, banco, settlement, conciliacion y P&L.
- Asegurar que Nexa separa Workforce Activation, Payroll, Contractor Engagement, Contractor Payable, Finance Payment Order, offboarding y finiquito.
- Asegurar que Nexa separa Comercial/Quote-to-Cash de Finance/caja y no convierte quote/contract en cobro.
- Asegurar que Nexa separa Account 360/Delivery/ICO de Service P&L cuando la proyeccion aun es parcial.
- Asegurar que Nexa separa Identity/Admin Center de bypass manual y no sugiere editar DB para dar acceso.
- Asegurar que Nexa separa My Space self-service de vistas admin y no acepta IDs arbitrarios de persona/miembro.
- Asegurar que Nexa separa Portal Cliente de Admin Center: modulo/asignacion/empty state no es lo mismo que rol/vista/capability.
- Asegurar que Nexa separa sync trigger, sync run, data quality, projection y webhook recibido.
- Asegurar que Nexa separa email `sent`, `delivered`, bounce/complaint y lectura humana.
- Asegurar que Nexa separa TeamBot de Nexa conversacional.
- Asegurar que Nexa separa AI Tools catalog, licencias, wallets, credit ledger, asset generation y Public Site Content Factory.
- Asegurar que Nexa separa Public Site read-only/draft-only de publish/cache/backups/productive writes.
- Asegurar que Nexa separa UI Platform guidance de implementacion automatica y no recomienda patrones prohibidos.
- Asegurar que Nexa no entrega datos sensibles de perfiles/cuentas ni instrucciones para bypass.

### Slice 4 — Staging validation and rollout note

- Ejecutar ingestion local/staging.
- Verificar respuestas desde `/api/home/nexa` o harness equivalente con flags de Knowledge activos.
- Documentar estado production: no activar prod sin decision humana si el corpus productivo esta gateado.

## Out of Scope

- Ejecutar pagos, crear ingresos/egresos u operar Finance desde Nexa.
- Calcular, aprobar, cerrar o pagar nomina desde Nexa.
- Crear/activar contractors, aprobar entregas, generar payables o cerrar finiquitos desde Nexa.
- Crear cotizaciones, aprobar descuentos, emitir contratos, sincronizar HubSpot o convertir Quote-to-Cash desde Nexa.
- Modificar roles, vistas, permission sets, SCIM mappings, usuarios o entitlements desde Nexa.
- Activar, pausar o deshabilitar modulos cliente desde Nexa.
- Pausar/reanudar integraciones, disparar syncs, reprocesar webhooks o ejecutar backfills desde Nexa.
- Enviar emails, mensajes Teams, anuncios, previews productivos o cambiar kill switches desde Nexa.
- Crear herramientas IA, recargar wallets, consumir creditos o generar assets desde Nexa.
- Ver datos personales de terceros desde My Space o saltarse el contexto de sesion.
- Publicar, cache clear, backup, draft write o mutar WordPress/Kinsta desde Nexa.
- Crear components, modificar JSX, promover primitives o ejecutar GVC desde Nexa como accion automatica.
- Construir `NexaActionProposal` o command bridge financiero.
- Cambiar modelos contables, schemas finance, formulas payroll, tax tables, compensation versions, contractor payables, pricing formulas, roles, view registry, Public Site runtime o UI platform contracts.
- Activar Knowledge production automaticamente.
- Crear UI nueva para cualquier dominio.

## Detailed Spec

Preguntas de QA minimas:

| Pregunta | Fuentes esperadas |
|---|---|
| "Nexa, como registro un ingreso en Finance?" | `registrar-ingresos-egresos-y-ordenes-de-pago.md`, `operacion-finance-end-to-end.md` |
| "Cuando uso una orden de pago en vez de registrar un pago directo?" | `registrar-ingresos-egresos-y-ordenes-de-pago.md`, `ordenes-de-pago.md` |
| "Que hace automatico Greenhouse al crear un egreso?" | `operacion-finance-end-to-end.md`, `registrar-ingresos-egresos-y-ordenes-de-pago.md` |
| "Como se pagan contractors?" | `pagos-a-contractors.md`, manual contractor, payment orders |
| "Como registro un cobro real?" | `caja-cobros-pagos-y-liquidaciones.md`, `registrar-ingresos-egresos-y-ordenes-de-pago.md` |
| "Como registro un instrumento bancario?" | `instrumentos-de-pago-y-banco.md`, `operacion-finance-end-to-end.md` |
| "Como funciona conciliacion?" | `conciliacion-bancaria-operacion.md`, `conciliacion-bancaria.md` |
| "Marcar pagada una orden significa conciliada?" | `operacion-finance-end-to-end.md`, `conciliacion-bancaria-operacion.md`, `sugerencias-asistidas-conciliacion.md` |
| "Deel es la cuenta que se rebaja?" | `instrumentos-de-pago-y-banco.md`, `operacion-finance-end-to-end.md`, `ordenes-de-pago.md` |
| "Nexa, como habilito un colaborador?" | `habilitar-colaborador-workforce.md`, `workforce-activation-readiness.md`, `people-workforce-payroll-contractors-end-to-end.md` |
| "Que significa que una ficha este bloqueada?" | `habilitar-colaborador-workforce.md`, `workforce-activation-readiness.md` |
| "Como calculo nomina mensual?" | `periodos-de-nomina.md`, `people-workforce-payroll-contractors-end-to-end.md` |
| "Que hace automatico Greenhouse al calcular payroll?" | `people-workforce-payroll-contractors-end-to-end.md`, `periodos-de-nomina.md` |
| "Honorarios tiene AFP y salud?" | `people-workforce-payroll-contractors-end-to-end.md`, `recibos-y-reporte-mensual.md` |
| "Aprobar una entrega paga al contractor?" | `contratistas.md`, `contratistas-flujo-de-pago-completo.md`, `pagos-a-contractors.md` |
| "Como paso un empleado a contractor?" | `contratistas-onboarding.md`, `people-workforce-payroll-contractors-end-to-end.md` |
| "Finiquito es payroll adjustment?" | `finiquitos.md`, `offboarding.md`, `people-workforce-payroll-contractors-end-to-end.md` |
| "Como creo una cotizacion comercial?" | `operar-quote-to-cash-comercial.md`, `quote-to-cash-comercial-end-to-end.md` |
| "Una cotizacion emitida ya es ingreso cobrado?" | `quote-to-cash-comercial-end-to-end.md`, `operacion-finance-end-to-end.md` |
| "HubSpot es el source of truth del catalogo?" | `quote-to-cash-comercial-end-to-end.md`, `catalogo-productos-sincronizacion.md` |
| "Como leo Account 360?" | `operar-agency-delivery-account-360.md`, `agency-delivery-account-360-end-to-end.md`, `cuenta-completa-360.md` |
| "Que significa una faceta degradada en Account 360?" | `agency-delivery-account-360-end-to-end.md`, `cuenta-completa-360.md` |
| "Service attribution es Service P&L completo?" | `agency-delivery-account-360-end-to-end.md` |
| "Como doy acceso a una vista?" | `operar-identity-access-admin-center.md`, `identity-access-admin-center-end-to-end.md`, `sets-de-permisos.md` |
| "Rol y permission set son lo mismo?" | `identity-access-admin-center-end-to-end.md`, `sistema-identidad-roles-acceso.md` |
| "Como funciona SCIM con Entra?" | `scim-entra-provisioning.md`, `identity-access-admin-center-end-to-end.md` |
| "Como veo mi recibo o actualizo mi perfil de pago?" | `operar-mi-espacio-self-service.md`, `my-space-self-service-end-to-end.md` |
| "Por que My Space no muestra datos de otra persona?" | `my-space-self-service-end-to-end.md`, `person-complete-360.md` |
| "Que ve un cliente en Portal Cliente?" | `portal-cliente-customer-experience-end-to-end.md`, `menu-dinamico-y-acceso-a-modulos.md` |
| "Como activo un modulo cliente?" | `operar-portal-cliente-customer-experience.md`, `menu-dinamico-y-empty-states.md` |
| "Por que un cliente no ve Analytics?" | `portal-cliente-customer-experience-end-to-end.md`, `operar-portal-cliente-customer-experience.md` |
| "Zero-state es un error?" | `portal-cliente-customer-experience-end-to-end.md`, `menu-dinamico-y-empty-states.md` |
| "Como se si una integracion esta sana?" | `integraciones-y-sync-end-to-end.md`, `operar-integraciones-y-sync.md` |
| "Triggered significa que la sync termino?" | `integraciones-y-sync-end-to-end.md`, `operar-integraciones-y-sync.md` |
| "Un webhook recibido ya es dato final?" | `integraciones-y-sync-end-to-end.md`, `captura-transiciones-notion-rpa-demo.md` |
| "Como reviso si un email fallo?" | `comunicaciones-notificaciones-end-to-end.md`, `operar-comunicaciones-notificaciones.md` |
| "Sent significa delivered?" | `comunicaciones-notificaciones-end-to-end.md`, `operar-comunicaciones-notificaciones.md` |
| "TeamBot puede conversar como Nexa?" | `comunicaciones-notificaciones-end-to-end.md`, `operar-comunicaciones-notificaciones.md` |
| "Como registro una herramienta IA?" | `ai-tooling-content-assets-end-to-end.md`, `operar-ai-tooling-content-assets.md` |
| "Wallet de creditos IA es caja o factura?" | `ai-tooling-content-assets-end-to-end.md`, `operar-ai-tooling-content-assets.md`, `operacion-finance-end-to-end.md` |
| "AI Tooling puede publicar en WordPress?" | `ai-tooling-content-assets-end-to-end.md`, `operar-ai-tooling-content-assets.md`, `public-site-content-factory-end-to-end.md` |
| "Que administra Admin Center?" | `admin-center-operacion-end-to-end.md`, `operar-admin-center.md`, `identity-access-admin-center-end-to-end.md` |
| "Responsibilities dan permisos?" | `admin-center-operacion-end-to-end.md`, `operar-admin-center.md` |
| "Como inspecciono un post del Public Site?" | `operar-public-site-content-factory.md`, `public-site-content-factory-end-to-end.md` |
| "Nexa puede publicar el sitio publico?" | `public-site-content-factory-end-to-end.md`, `operar-public-site-content-factory.md` |
| "Como construyo una pantalla nueva en Greenhouse?" | `operar-ui-platform-design-system.md`, `ui-platform-design-system-end-to-end.md` |
| "Cuando uso Composition Shell o una primitive?" | `operar-ui-platform-design-system.md`, `ui-platform-design-system-end-to-end.md` |
| "Puedo copiar colores de Figma directo?" | `ui-platform-design-system-end-to-end.md`, `operar-ui-platform-design-system.md` |

Respuesta esperada:

- breve;
- paso a paso cuando el usuario pregunta "como";
- con advertencias operativas cuando hay riesgo;
- con citas/sources finance;
- con citas/sources HR/Payroll/Contractors cuando la pregunta no sea solo Finance;
- con citas/sources del dominio correcto para Comercial, Agency, Identity, My Space, Public Site y UI Platform;
- con citas/sources del dominio correcto para Portal Cliente, Integraciones/Sync, Comunicaciones/Notificaciones, AI Tooling y Admin Center;
- sin inventar datos de runtime;
- sin prometer que Nexa puede ejecutar la accion.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (corpus registration) -> Slice 2 (retrieval QA) -> Slice 3 (prompt/safety only if needed) -> Slice 4 (staging validation).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Nexa responde Finance con fuentes generales no finance | knowledge/nexa | medium | golden questions + wrong-source checks | eval failure / qa report |
| Nexa mezcla contractor con payroll dependiente | payroll/contractor | medium | golden questions por regimen | eval failure |
| Nexa da consejo legal/tributario como definitivo | payroll/compliance | medium | safety answer policy | QA sensitive failure |
| Nexa recupera solo Finance para contractor HR | knowledge | medium | cross-domain expected sources | wrong-source |
| Nexa mezcla Comercial con Finance/caja | commercial/finance | medium | golden questions quote vs cash | wrong-source |
| Nexa responde Admin Center como bypass de DB | identity/security | medium | negative cases + safety policy | QA sensitive failure |
| Nexa sugiere publicar o mutar WordPress | public-site/release | medium | read-only/draft-only expected answer | QA sensitive failure |
| Nexa recomienda UI fuera del platform contract | ui-platform | medium | golden questions UI Platform | eval failure |
| Documento sensible expone datos de pago | finance/security | low | revisar metadata y redactar contenido sensible | manual review |
| Activacion prod accidental | release/knowledge | low | respetar flag prod OFF y rollout humano | env/config diff |
| Prompt change degrada respuestas no Finance | nexa | medium | snapshot/eval antes y despues si se toca prompt | qa matrix |

### Feature flags / cutover

- Usar flags existentes de Knowledge/Nexa; no introducir flag nuevo salvo que la estrategia de ingestion lo requiera.
- Production cutover queda fuera de esta task salvo aprobacion explicita.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | retirar docs del corpus/manifest y reingestar | <30 min | si |
| Slice 2 | revertir golden questions/evals | <15 min | si |
| Slice 3 | revertir prompt/config si se modifica | <30 min | si |
| Slice 4 | apagar flag Knowledge en ambiente validado o revertir ingestion | <30 min | si |

### Production verification sequence

1. Validar local con corpus actualizado.
2. Validar staging con preguntas golden.
3. Revisar respuestas manualmente con operador/owner Finance.
4. Confirmar que prod sigue sin cambios si no hay aprobacion.
5. Si se aprueba prod en task futura, ejecutar ingestion productiva y repetir golden questions.

### Out-of-band coordination required

- Owner Finance debe validar que respuestas no prometen comportamiento inexistente.
- Owner Nexa/Knowledge debe aprobar activation productiva si corresponde.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Los manuales/documentos Finance, People, Workforce, Payroll y Contractors normativos estan registrados en el corpus Knowledge.
- [ ] Los manuales/documentos Comercial, Agency/Delivery, Identity/Admin Center, My Space, Public Site y UI Platform normativos estan registrados en el corpus Knowledge.
- [ ] Los manuales/documentos Portal Cliente, Integraciones/Sync, Comunicaciones/Notificaciones, AI Tooling/Content/Assets y Admin Center residual normativos estan registrados en el corpus Knowledge.
- [ ] `search_knowledge` recupera fuentes Finance para preguntas Finance y fuentes HR/Payroll/Contractors para preguntas People.
- [ ] `search_knowledge` recupera fuentes Comercial/Agency/Identity/Personas/Public Site/UI Platform para preguntas de esos dominios.
- [ ] `search_knowledge` recupera fuentes Portal Cliente/Integraciones/Comunicaciones/AI Tooling/Admin Center para preguntas de esos dominios.
- [ ] Nexa responde preguntas de ingreso, egreso, cobro, pago directo, instrumento, Banco, transferencia interna, orden de pago, conciliacion, Workforce Activation, nomina, honorarios, Deel/internacional, contractors, employee-to-contractor, offboarding, finiquitos, quote-to-cash, Account 360, roles/vistas, My Space, Portal Cliente, Integraciones/Sync, Comunicaciones/Notificaciones, AI Tooling, Content Factory y UI Platform con citas correctas.
- [ ] Los casos wrong-source quedan cubiertos por eval/QA.
- [ ] Nexa no afirma que puede ejecutar acciones financieras, HR, Payroll, Contractors, Comerciales, Admin, Portal Cliente, Integraciones, Comunicaciones, AI Tooling, Public Site o UI Platform en esta task.
- [ ] Production queda explicitamente sin cambios o validada con aprobacion humana.

## Verification

- `pnpm ops:lint --changed`
- `pnpm docs:closure-check`
- QA local/staging de Knowledge/Nexa con preguntas golden
- Test/eval especifico que exista para Knowledge retrieval al momento de ejecucion

## Documentation Closure

- Actualizar `docs/tasks/README.md`.
- Actualizar `docs/tasks/TASK_ID_REGISTRY.md`.
- Si se cambia prompt o policy de Nexa, actualizar docs de Nexa Intelligence y changelog correspondiente.
- Si se ingesta prod, dejar evidencia en `Handoff.md`.

## closing protocol

- Ejecutar `pnpm ops:lint --changed`.
- Ejecutar `pnpm docs:closure-check`.
- Dejar evidencia de QA Knowledge/Nexa con preguntas golden.
- Si se activa staging o produccion, registrar ambiente, flags y resultado en `Handoff.md`.
- No mover la task a `complete` hasta que la ingestion este aplicada y validada en el ambiente objetivo aprobado.
