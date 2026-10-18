# Cobertura Ads de formularios comerciales — 18/10/2026

**Alcance confirmado por el operador: sólo formularios comerciales que generan leads.** No se amplía
Ads a ebooks, postulaciones, newsletter, soporte o fixtures. Discovery conserva su conversión de reserva
confirmada. Performance y Discovery son nombres de fuentes del sitio, no tipos de campaña Google Ads.

## Estado construido y publicado

El [release completo](../releases/2026-10-18-full-develop-production-release.md) promovió todo el candidato
develop a main `ec317c928fffcb919d71bdb62821b80280af2347`. La [activación posterior](2026-10-18-google-ads-activation.md)
verificó GTM Web6/Server10, EC ON y dos políticas Ads publicadas: Performance y Discovery. WordPress/Think
sirven el bridge compatible. El companion Vercel ER5 quedó READY con alias/SHA exactos, health200,
canarios y watchdog6/6 sin drift. HubSpot tiene marcador/campo/mapping configurados para Performance;
Server10 incorpora captura de recibos en el sender Meta existente. No se certificaron primera ocurrencia
bajo la activación, identidad nativa HubSpot, recibo Graph individual, recepción positiva Ads o atribución.

La CLI Ads de lectura y gestión por planes y el OAuth Efeonce conservan su evidencia del
[17/10](2026-10-17-google-ads-cli-oauth-implementation.md). La CLI no es de sólo lectura; la autorización
OAuth `adwords` tampoco tiene variante read-only. Una capacidad de gestión no acredita todos sus writes
reales ni autoriza otras cuentas. Ads: `jreyes@efeoncepro.com`, anunciante6862539491; Cloud siempre
`julio.reyes@efeonce.org`/efeonce-group. El MCC9531478329 sólo es la ruta de acceso.

## Inventario y preparación sin aplicación

GET autenticado del catálogo, leído18/10 a21:43:19Z: **16 formularios y una agenda**, doce políticas
actualmente publicadas. Sólo un formulario y la agenda tienen `config.googleAds`. La elegibilidad técnica
marca13 formularios; doce ampliaciones pasaron `validate`/dryRun y siguen **sin draft/review/publish**.
Se compararon las propuestas con las versiones/cabezas del catálogo nuevo: no hubo cambio de esos bindings.

| Fuente | Estado Ads | Trabajo pendiente |
| --- | --- | --- |
| Performance | Publicado | Primera ocurrencia/recepción/atribución |
| Discovery, agenda | Publicado | Primera reserva/recepción/atribución |
| Diagnóstico AEO, cotización web, diagnóstico SEO, auditoría social, alcance HubSpot, diagnóstico creativo y diagnóstico de medios | Propuestas validadas | Revisar y publicar Ads, preservando Meta/UPD existentes |
| Brief Creators/UGC, Content Marketing e Inbound | Propuestas validadas | Revisar y publicar; propuestas Ads-only, sin agregar Meta/UPD por inferencia |
| Contacto Efeonce | Propuesta técnicamente validada | Revisar intención comercial: un contacto puede incluir soporte u otros motivos |
| AI Visibility Grader | Propuesta técnicamente validada | `diagnostic_intake` elegible, pero el propósito declara lead magnet; resolver intención comercial antes de publicar |
| Lead Gen - Web | Sin Ads; no elegible técnicamente | El propósito declara captación comercial de diseño web y `form_kind` sigue `lead_magnet`; corregir por el writer canónico |
| Dos ebooks | Sin Ads | Fuera del alcance confirmado; no crear acciones de descarga para este pedido |

La definición activa de careers y cinco fixtures application existen fuera del catálogo de esos dos
orígenes/surfaces. No se suman a cobertura comercial ni se archivan/modifican en esta corrida documental.
Las12 validaciones no son12 decisiones comerciales finales: intención mixta o un propósito de lead magnet
requieren revisión, aunque `googleAdsEligible=true`. No reclasificar una fuente sólo para eludir el gate.

El detalle saneado está en [JSON de cobertura](2026-10-18-commercial-forms-measurement-coverage.evidence.json).
Comandos, sesiones y recibos privados quedan ignorados en `.auth/`; no se copian credenciales ni datos de leads.

## Cómo ampliar con el contrato existente

1. Redescubrir fuente, versión, surface/origin y cabeza publicada; revisar intención y campos tipados.
2. Conservar destinos/mappings previos. Para fuentes sin política, seleccionar Ads explícitamente; no
   añadir Meta/UPD por defecto. Mantener EC sujeto al consentimiento de la ocurrencia.
3. Resolver Lead Gen - Web por el dominio Forms. La API actual de authoring reutiliza la definición
   existente y no corrige su tipo; crear otra draft con `formKind` distinto no lo cambia. No inventar
   un endpoint, parche por slug, SQL directo desde un consumer ni ampliar todos los `lead_magnet`.
4. Elegir activationAt de ejecución, validar, draft → review → publish con CAS/idempotencia y GET
   independiente. Las propuestas conservadas son preparación; releerlas y elegir el corte antes de aplicar.
5. Usar la acción existente «Solicitud comercial aceptada» y los tags publicados. Un alta compatible
   por datos no requiere tag individual, cambio de campañas o nuevo deploy/GTM. Corregir/ampliar un contrato
   de código sí necesita su release gobernado y sus pruebas; no se disfraza como cambio de datos.
6. Observar casos reales consentidos. UUID estable/dedupe, entrega HubSpot, Meta, Google UPD y Ads son
   evidencias separadas; no fabricar submissions, bookings, GCLID ni replay para cerrar la tarea.

El canal Ads sigue navegador → GTM Web → sGTM; no existe retry backend Ads ni sender Data Manager
implementado. Cerrar/bloquear el navegador puede impedir entrega. Los hitos CRM de lead calificado,
oportunidad y negocio ganado, valores/ajustes y conexión multiorganización/API/MCP de producto siguen
pendientes. Las dos acciones actuales son secundarias; observar conversiones no cambia por sí solo la
configuración efectiva de puja. No confundirlas con el `generate_lead` genérico de GA4.

## Cierre documental y continuidad

Esta corrida actualiza arquitectura/ADR, documentación funcional, manuales, tracking/runtime, skills
Codex/Claude y lifecycle; **no publica las12 propuestas ni corrige datos de Lead Gen - Web**. El control
futuro al publicar un formulario y la inscripción automática de políticas son propuestas, no capacidades
construidas. La aceptación completa permanece abierta en TASK-2034; TASK-2035 conserva su roadmap aparte.

Fuentes canónicas: [arquitectura Ads](../../architecture/GREENHOUSE_GOOGLE_ADS_MEASUREMENT_ARCHITECTURE_V1.md),
[ADR Ads](../../architecture/GREENHOUSE_GOOGLE_ADS_INTEGRATION_DECISION_V1.md),
[políticas](../../architecture/GREENHOUSE_GROWTH_MEASUREMENT_POLICY_DECISION_V1.md),
[Forms](../../architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md),
[manual Ads](../../manual-de-uso/growth/activar-conversiones-google-ads.md) y
[operación por API/CLI](../../manual-de-uso/growth/configurar-medicion-conversiones.md).
