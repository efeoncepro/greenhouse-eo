# Handoff

## 2026-10-17 — Landing Performance Marketing publicada y legacy retirada (TASK-1865)

Live en https://efeoncepro.com/servicios/performance-marketing/ (página `251997`, OG `252002`): 10 widgets
`greenhouse_performance_*` compilados del canvas aprobado, Service + FAQPage (6), Growth Form
`efeonce-performance-diagnostic` (direct a «Lead Gen - Performance Marketing»). Legacy `242862` privada con 301 plano
en Yoast (3 cadenas repuntadas), ítem de menú `242915` reapuntado. QA en vivo 1440/390 sin overflow.
[Landing](.claude/skills/efeonce-public-site-wordpress/references/landings/performance-marketing.md) ·
[Task](docs/tasks/in-progress/TASK-1865-landing-performance-marketing.md).
Pendiente: envío real del form, GA4 `generate_lead`, Rich Results/GSC, GVC 1536/890, triple documentación, extraer el
núcleo común source-led (hoy clonado de Medios). Runtime: commit propio en `efeonce-public-site-runtime` (sin push).
Docs sincronizados (mismo día): funcional `docs/documentation/public-site/performance-marketing.md`, manual
`docs/manual-de-uso/public-site/operar-performance-marketing.md`, PRIMITIVES, contrato de forms, TRACKING-PLAN
(fila pendiente), servicios, PDR-022/021/025, briefs, EPIC-047, TASK-1860 (ancla `#plataformas`) y skill
`efeonce-public-site-wordpress` (lecciones del carril). El `?utm_` en el 301 lo conserva el mu-plugin passthrough, no Yoast.
**Cierre 2026-10-17 (tarde):** TASK-1865 `complete`. Envíos reales del operador: HubSpot `delivered`, GA4 `generate_lead`;
Meta sin Lead hasta publicar políticas de medición (Performance, Medios, HubSpot scope; 12/18 publicadas) y luego 1 `Lead`
Server en el dataset `708931297255942` (stats con ~1 h de retraso). Form deduplica 60 min por email: QA con alias `+`.
Search Console activo (el `invalid_grant` era del script: usar `getSearchConsoleConnection`); GA4 de Efeonce conectado
por primera vez hoy, Berel/Sky intactos. Follow-ups: archivar contacto `+meta` en HubSpot, pedir indexación en GSC.

## 2026-10-17 — Brochures aprobados: no recortar ni revalidar

Julio ratificó aprobación comercial completa: los brochures no necesitan nada más. [Regla vigente](docs/operations/EFEONCE_APPROVED_BROCHURES_POLICY_V1.md), cargada por Codex/Claude y radar personal.
El original de contenidos (57) está intacto; la copia Aloja (38), documento `357366114`, no está aprobada
ni se reutiliza. Corrección documental; no modifica PDF, documentos HubSpot ni envía correos.
[Antecedentes](docs/audits/commercial/2026-10-17-approved-brochures-correction.md).


Historial de sesiones: [Handoff.archive.md](Handoff.archive.md).

## 2026-10-17 — BytePlus: doce assets Active y ambas pruebas exitosas

Usar sólo Google SSO `jreyes@efeoncepro.com` → **3004839361**, root `jreyes`. Julio prohibió volver a usar
3003660328: sus 12 assets/6 grupos y KYC/Entry son históricos. Seedance 2.5, clave y tarjeta/Savings Plan están
en la cuenta correcta; recuperación completada sin compras. KYC enviado con autorización
expresa de Julio y **aprobado**, 17/10 16:57:32 UTC (13:57 Chile), verificado en consola y correo. Estado en el
[ledger](docs/operations/creative-production/BYTEPLUS_VIRTUAL_PORTRAIT_LEDGER_V1.md); [preflight obligatorio](docs/manual-de-uso/creative-studio/byteplus-directo.md#cuenta-obligatoria-antes-de-operar).
Julio confirmó mecanismos/plan de incidentes: cuestionario completo (1 y 2=YES, 3=uso interno).
Julio después ordenó «Firmala»: carta aceptada y correo verificado con su código; Entry activo 17:37 UTC,
Billing mode Free. Julio habilitó acceso a archivos de Chrome; lote completo en cuenta correcta: **12 Active / 6 grupos**,
38 assets/44 grupos disponibles. Antonio primero → referencia y primer cuadro `succeeded`, 480p/4s → resto en orden.
Estado Active confirmado en respuestas ListAssets, cotejando GroupId/pares; UI `warehoused`. MP4 y recibos en
`/Users/jreye/Documents/BytePlus-Asset-Service-2026-10-17/pruebas-antonio-cuenta-correcta-20261017T180127Z/`.
Corrección enviada a Cloris/Alejandro con firma gráfica y CCO: 17/10 13:22 UTC; Enviados y HubSpot SENT
`118790251018` verificados. Respuesta pendiente. WhatsApp entregado para copiar.
Por orden de Julio, documentación y skills Codex/Claude sincronizan cuenta, autorización y recuperación de retratos;
router y contexto enlazan el canon. ADR existente de media directa; sin cambio de integración ni promoción Globe.
Estado operativo: lote y pruebas completados, sin compras/cambio de plan ni push. Ledger registrado en `45315b12f`;
por orden posterior de Julio, cierre documental completo con subagentes y skills espejo. Factura de las dos generaciones
sin conciliar; aprobación creativa final y publicación no forman parte de estas pruebas. El ledger conserva el detalle
y las evidencias; no repetir cargas ni generaciones para validar documentación.

## 2026-10-16/17 — Landing HubSpot v2 publicada, dock móvil con agenda nativa y renderer CTA 1.3.1

Live en https://efeoncepro.com/servicios-contratar-hubspot/ (página `244079`, OG `251991`): 14 widgets
`greenhouse_hubspot_v2_*` por los 4 resultados de HubSpot, header/footer de Ohio, Service + FAQPage, Growth Form
`efeonce-hubspot-scope` (direct a HubSpot). Dos rondas de QA desktop/390 corregidas (reveals scroll-driven que terminan
en `entry`, comparación y tachado en móvil, fichas de agentes, cifras estáticas). Dock móvil: «Agendar reunión» = CTA
`hubspot-discovery-meeting` (scheduler nativo, surface propia `csur-56a96b52…`, publicador
`scripts/growth/publish-hubspot-meeting-cta.ts`, key 0600 en `.auth/`) + «Ir al formulario». Renderer CTA 1.3.1 corrige
la cabecera del scheduler en móvil (`font` shorthand con `inherit`), commit `e7db7f558`.
[Landing](.claude/skills/efeonce-public-site-wordpress/references/landings/hubspot-services.md) ·
[Auditoría](docs/audits/public-site/2026-10-16-hubspot-v2-publication.md).
Pendiente: release a producción del renderer 1.3.1 (hasta entonces el scheduler sigue partiendo «Cerrar agenda»),
envío real del form, Rich Results/GSC, +90 vs +120 empresas, readback Gold. Fal sin saldo en ambas cuentas (A −0,29,
B −0,35 USD); Higgsfield 3.690,6 créditos (Ultra).

## 2026-10-16 — Agencia de Medios: brochure canonizado y landing publicada

Live en https://efeoncepro.com/servicios/agencia-de-medios/ (página `251981`, menú `251987`, OG `251986`), verificada a
1440/390 sin overflow; widgets `greenhouse_medios_*` (repo del sitio `25135f7`, `874cf48`; respaldos
`/tmp/eo-medios-widgets-before-*` en Kinsta). Formulario `efeonce-media-diagnostic` (`hubspot_pillar`, direct, commit
`e7ae991f1`). Brochure con PDF vigente `c4697c7a…` en OneDrive. Rebates = margen de Efeonce, aplicado también a modelos
y packs de medios. [Landing](.claude/skills/efeonce-public-site-wordpress/references/landings/agencia-de-medios.md) ·
[PDR-025](docs/public-site/decisions/PDR-025-landing-agencia-de-medios-posicionamiento.md) ·
[LEEME](ai-generations/2026-10-13_brochure-agencia-medios/LEEME.md).
Pendiente: envío real del form (HubSpot + GA4 `generate_lead`), casilla de novedades sin suscripción HubSpot, Rich
Results/GSC. Operador 2026-10-16: rebates nunca al cliente (regla vigente en todo); «programática secundaria de
Medios» confirmada (PDR-025/022). Schema: cinco países + catálogo + `about`; sitio: Yoast «Efeonce», `og:locale`
`es_LA` (mu-plugin). Commits locales, sin push.

## 2026-10-16 — GTM: drift con mecanismo (web + servidor) y auditoría brand-visibility

`pnpm gtm:snapshot` versiona los dos containers (web `GTM-NGHPGRLZ` y servidor `GTM-K2X4ZTTK`, nuevo
`server-container-snapshot.json`) con secretos tapados como huella; `--check` falla con resumen por colección.
Workflow nuevo `gtm-drift.yml` diario 12:00 UTC (tooling), WIF directo a `greenhouse-gtm-publisher` con scope
readonly; `roles/iam.workloadIdentityUser` concedido al repo. Commits `e791942ea` y `5d28dda76` en develop, sin push.
Ambos containers sin drift al 16/10. Think: «Preferencias de cookies» sólo en host legal declarado (main `425a1de`).
[Snapshot y drift](docs/reference/measurement-gtm-ga4/README.md#snapshot-y-drift-de-los-dos-containers) ·
[qué hacer si falla](docs/manual-de-uso/growth/operar-meta-capi-servidor.md#si-falla-el-chequeo-diario-gtm-drift).
Pendiente: release a `main` para activar el cron (aún no ha corrido en GitHub); token Meta literal en el tag
servidor (decisión del operador: Secret Manager + Firestore Lookup después); form `ai-visibility-grader`
de think/brand-visibility sin envío real que pruebe la cadena Lead (0 filas en `measurement_conversion`).

## 2026-10-16 — Contacto: Nexa canónica, voz y medición

Live en `/contacto/` y verificado en navegador/CDN: hero con rostro canónico de Nexa, voz Lucía es-MX (26 s), OG
adjunto `251980` (v3), widget con `?ver=filemtime` en hero y audio. Backups en `/tmp/eo-contacto-widgets-before-*`
del servidor; snapshot OG `_gh_contacto_before_og_rotation_20261016_163140`. Política medición `89e531d8`
(Meta + Google UPD) publicada; recibos en `.auth/contacto-measurement/`. [Detalle](.claude/skills/efeonce-public-site-wordpress/references/landings/contacto.md).
Pendiente: envío real del form → GA4 DebugView + Meta Processed; key del MCP local ElevenLabs (tiene el ID, no `sk_`);
saldo fal `FAL_API_KEY_B`; `contact-landing.js` local sin desplegar no es de esta sesión. Commits locales, sin push.

## 2026-10-16 — Brochure oficial «Agencia de Marketing 360°» aprobado

Aprobado y canonizado: «este es el brochure oficial de la agencia 360° con todos nuestros servicios». Completo 84
láminas y corto 26, ambos con índice linkeable (órbita → portadas; lámina 5 → secciones) verificado. OneDrive
`4. Comercial/Brochures/2026/Agencia de Marketing 360/`; canvas https://claude.ai/artifact/Xy1LjqUHZRsJbtcTUP9jB3;
fuente y scripts en [LEEME](ai-generations/2026-10-12_brochure-efeonce-360/LEEME.md). Registrado en la norma
(delta 2026-10-16 b), funcional, manual y `docs/services/README.md`. Logos de clientes autorizados por el operador
(2026-10-16). Antes de enviarlo afuera: cifras ANAM y plazo Berel. Commits locales, sin push.

## 2026-10-16 — Fabricio: seguimiento web programado

[Caso y límites](docs/commercial/follow-up-agent/runs/2026-10-16-fabricio-web-hubspot.md): un envío inicial
Outlook SENT y tres pasos HubSpot Programado, secuencia `316561523`, 21/28 de octubre y 4 de noviembre a las 10:00 México.
Parada por respuesta a cualquier correo verificada; sin duplicar desde el heartbeat ni contactar puentes.
Brochure de 27 páginas identificado y firma oficial configurada; preview integrado sin render, entrega futura pendiente.
Método y adapter espejados Codex/Claude, registro focal actualizado; no renueva corte global ni permisos.

## 2026-10-15 — SKY: servicio SEO, skill y valor orgánico

[Entrega y evidencia](docs/audits/growth/2026-10-15-sky-seo-service-and-organic-value.md):
[marco de cuenta](docs/services/sky-blog-seo/README.md), skill espejo `sky-blog-seo`, método versionado,
collector/cálculo/CLI y Excel actualizado conservando GA4/GSC. Piloto septiembre: USD2.116,38 sobre3.824
clics valorados de28.718 (13,3157%); CPC Chile/Perú capturados15/10, proxy parcial sin extrapolación/ROI.
Compra5tasks USD0,2406, snapshots1.505 leídos después; sin tracking recurrente. Pruebas69, tsc8GB,
lint y espejos/contexto PASS; export leído y QA visual. Foundation local, sin panel/API/MCP/job, nueva edición
Insights, push/deploy o envío. WP autenticado/anexo/historia de migración pendientes; expectativa3meses
no es promesa de recuperación. [Manual](docs/manual-de-uso/growth/valorar-trafico-organico.md).

[Auditoría orgánica e inventario](docs/audits/growth/2026-10-15-sky-organic-channel-audit.md): PDF14p +
Excel1.697 posts; GA4−58,1% jul–ago→oct–nov2025, transición observada26–27sep. Sin atribución causal
completa/penalización probada. Azure público duplicado,14layouts,68CTA y21destinos404 conocidos requieren owner SKY;
remediación pendiente. DataForSEO12tasks USD0,491816. GSC anterior no disponible; logs/reporte previo pendientes; sin cambios al sitio.
Profundización sin GSC anterior: [complemento y evidencia](docs/audits/growth/2026-10-15-sky-organic-channel-audit.md#profundización-posterior-sin-propiedad-gsc-anterior).
Canales no caen uniformemente; no sostener fallo generalGA4 por agregados. Inicio orgánico−53,86% en28d;
regresiones archivadas y916redirects verificados. ComplementoPDF4p, coste adicional0; fuentes previas intactas.
Primer lote preparado: [plan y aceptación](docs/services/sky-blog-seo/PLAN_RECUPERACION_PRIMER_LOTE_2026-10-15.md),
20 URLs priorizadas / 10 iniciales (9 artículos + 1 decisión 404), fichas, PDF6p, Excel y manifiestos técnicos.
GSC4fases reconciliadas; detalle consulta-país cubre35,93% de32.800clics, países por artículo parciales.
Sin cambios CMS/infra; congelar baseline al implementar, registrar fecha real y revisar28/56d; accesos/validación SKY pendientes.
Estado corregido: diagnóstico base entregado y auditoría integral parcial. [Siete frentes y aceptación](docs/services/sky-blog-seo/COBERTURA_Y_PENDIENTES_AUDITORIA_2026-10-15.md).
Skills `sky-blog-seo`/`seo-aeo` Codex–Claude y modelo compartido separan cobertura, preparación, aplicación y resultado;
censo no equivale a revisión editorial; blog no acredita SEO completo de SKY. GSC anterior no bloquea profundizar.

## 2026-10-15 — OmniHuman 2.0: API investigada y agentes canalizados

[Manual API](docs/manual-de-uso/creative-studio/omnihuman-2-api.md),
[contrato](docs/architecture/creative-studio/BYTEPLUS_OMNIHUMAN_2_API_CONTRACT_V1.md) y
[auditoría](docs/audits/creative-studio/OMNIHUMAN_2_API_RESEARCH_2026-10-15.md): dos auth de Vision AI,
API4–300s frente a ficha UI120s, recuperación y derechos. Skills e índices enlazados. Modelo `Disabled` en
cuenta; CLI Ark/Speech sin OmniHuman. AI Creative Operations continúa con unidad de implementación si se pide:
activación, credencial mínima, consumidor, presupuesto y canario. Sin activación, gasto, código ni ruta Globe.

## 2026-10-15 — Convención de negocios y leads adoptada

[Política](docs/operations/EFEONCE_CRM_RECORD_NAMING_POLICY_V1.md) aceptada por Julio; skills Codex/Claude,
manuales y routers enlazados. Nuevas altas autorizadas: marca/cuenta, país, iniciativa/necesidad,
referencia/persona. Gana66065702426 renombrado y leído live; resto del histórico pendiente de lote,
sin cambios de schema, automatizaciones ni calificación. [Caso](docs/commercial/tenders/gana-programatica-colombia-1541-2026/README.md).

## 2026-10-15 — Correos comerciales y seguimiento puntual

Julio aprobó la [estructura en Prospección](.codex/skills/efeonce-b2b-prospecting/references/message-and-contextual-proof.md#correo-comercial-robusto-de-julio); referencia y routing espejados Codex/Claude, extensión adaptable por cuenta. Actualización documental local, sin nueva autorización de envío.

[Socopur 15/10](docs/commercial/tenders/socopur-agencia-marketing-digital-2027/research/seguimiento-2026-10-15-INTERNO.md): reply autorizado sólo a Katherine 07:13 Chile; firma gráfica/PDF y EMAIL `118603198768` SENT asociado verificados. Esperar respuesta sobre admisión; sin próximo envío. Método y registros actualizados, WIP ajeno preservado.

**Actualización posterior, 16:54:36 UTC:** [Katherine confirmó cierre](docs/commercial/tenders/socopur-agencia-marketing-digital-2027/research/cierre-y-aprendizajes-2026-10-15-INTERNO.md)
para nuevas postulaciones/propuestas de este período; resuelve la espera anterior. Credenciales guardadas
sin fecha/invitación ni adjudicación inferidas. [Guía del radar](docs/commercial/tenders/RADAR_EARLY_ENTRY_GUIDE.md)
y skills espejo actualizados: primera puerta, señales tempranas, solape72h y tiempos separados;
[verificación](docs/audits/commercial/2026-10-15-socopur-radar-docs-skills.md). Sólo docs del proyecto,
sin CRM/envíos/código ni cambios de automatización. Adopción real y causa de tardanza sin verificar.
Skill personal: dos playbooks de acción/frescura actualizados por aprobación puntual del entorno;
SKILL.md intacto, sin cambio de permisos persistentes o automatización. Bloqueo de escritura resuelto.
Corrección directa de Julio 15/10 17:51 UTC: detección 06/10/2026 sin hora/zona, un día calendario tras
cierre de interés 05/10, no 24 horas exactas. Radar horario/CRM del 10/10 posteriores, sin explicar esa tardanza.

## 2026-10-14 — Footer público: composición compacta

[Composición V2 publicada](docs/audits/public-site/2026-10-14-footer-composition-v2.md): «Explora», cuatro columnas, newsletter/empleo separados, partners gris y legales compactos. Desktop851→531px; QA1440/390/768/1920 y axe sin violaciones. CF7/delivery/Home preservados; rollback durable. Términos404 retirado, contenido aprobado pendiente.

## 2026-10-14 — LicitaLAB: radar público y conciliación CRM

[Expediente del corte](docs/commercial/tenders/licitalab-actualizacion-2026-10-14/README.md): 1.142 códigos únicos revisados por perfil y keywords; 72 candidatas con lectura dirigida. Catorce bajas administrativas de plazo verificadas en HubSpot, dos prórrogas y UTEM preservada. 30 Deals nuevos y 3 RFI en Company + nota, con doble readback; cada alta conserva calificación/GO pendientes. Índices CRM y seguimiento local conciliados; historia y WIP ajeno preservados. No envío ni postulación.

[Paquetes y pendientes](docs/commercial/tenders/licitalab-actualizacion-2026-10-14/PREPARACION-SUBDERE-TARAPACA.md): bases81/56p leídas, técnica/económica y anexos borradores en OneDrive canónico. Repo sólo trazabilidad liviana; sin binarios ni snapshots pesados. SUBDERE14.994MIVA candidato; Tarapacá cuatro unitarios/CPT5.355M, bolsa6.204Msin mínimos. Equipo, idoneidad, costo completo y subcontratación pendientes; sin GO, firmas ni envío.

## 2026-10-14 — Medición escalable, CAPI y agentes publicados

[Release completo](docs/audits/releases/2026-10-14-scalable-measurement-agent-first-release.md): PR255/main9690efad,
orquestador38591329633 success, manifest released; health200 y watchdog6/6/drift0. SQL/seed7,
API/panel/CLI agent-first y Server9 estricto (sólo template30) publicados. Nueva fuente por datos
recibida Meta Server/website/nueve claves sin otro build/redeploy/GTM; fixture archivada y
HTTP13 fuentes/siete policies. GVC1440/390 y12 estados PASS. Bridge WP/Think4bbd77… idéntico.
Primera conversión comercial/EMQ siguen pendientes; consentimiento, GA4 y CRM preservados.
Hook pesado omitido con autorización; sin build/tsc local. [Manual](docs/manual-de-uso/growth/configurar-medicion-conversiones.md).

[TASK-2035](docs/tasks/in-progress/TASK-2035-growth-measurement-scalable-cro-retargeting-subscriptions.md), in-progress: configuración/CAPI/cliente agente completados en TASK-2036/2037; CRO, abandono, newsletter y CRM permanecen sin iniciar, con dueñas existentes.

Diseño La órbita aprobado con «Vamos, ponla»: [rollout visual WP/Think](docs/audits/measurement/CONSENT_UI_ROLLOUT_2026-10-13.md).
Adapter sobre controles nativos HubSpot; sin nueva persistencia ni cambios en bridge/GTM/matching.
Auditoría documental 14/10 con tres subagentes: [funcional](docs/documentation/growth/medicion-gtm-ga4.md#cookies-y-preferencias-del-visitante), [manual](docs/manual-de-uso/growth/operar-consentimiento-cookies-publico.md) y skills al día.

Antecedente13/10: [release y recibos](docs/audits/releases/2026-10-13-full-develop-matching-release.md), PR254,
main d692ab51dc48, orquestador38483437158 success y manifest released; CI/Deep/build/smoke PASS.
GTM Server6/Web5, mismo hosting efeonce-group min0/max1. HubSpot categorías/GPC y banner
primera visita WP/Think; preferencias inline en pie legal, sin franja extra. PageView consentido activo.
Matching [TASK-2034](docs/tasks/in-progress/TASK-2034-growth-lead-matching-meta-google.md): SQL aplicada,
Client backend autenticado único Meta Lead, legacy12/17 retirados y espejo GA4 preservado.
Ops00775-fnh100%: Meta/Google/retención true, GitHub repo vars persistentes y secretos versión1
resueltos en canary200. Vercel captura true, dpl_BxU6V7EGpo5R3REbazWxhXLsrVZT READY/alias.
GA4 correcto486264460: UPD/ack, siete audiencias90d y linkAds9531478329. Meta Test Events
Processed/Server em/ph/fn/ln y clasificadores; cola/leaseCAS/retención y negativos live PASS.
Watchdog ok6/6 drift0. Primera aceptación/reserva comercial consentida post-flip sin observar;
no submissions/bookings/CRM sintéticos ni promesa de calidad/serving. Status task Parcial por esa prueba.
Incidente separado mindicador TLS/timeout sigue abierto, Sentry7790958718/7790964540; excepción
auditada no bloqueante, sin afirmar solución. Dossier incluye rollback, digests y límites.
Docs/skills espejo al día; cierre en develop, WIP ajeno preservado. Sin nuevo proyecto/cron para matching.

Auditoría integral con tres subagentes: [inventario y cierre](docs/audits/measurement/MEASUREMENT_DOCUMENTATION_CLOSURE_2026-10-13.md), [runtime10](docs/reference/measurement-gtm-ga4/10-growth-lead-matching-runtime.md).
ADR/Forms/Meetings/host/skills y referencias sincronizados; historial preservado. [Configuración escalable](docs/architecture/GREENHOUSE_GROWTH_MEASUREMENT_CONFIGURATION_PROPOSAL_V1.md): antecedente integrado a **TASK-2035** y supersedido por el ADR de policy; foundation, panel y agentes publicados en PR255. Auditoría posterior con tres subagentes: [cobertura y correcciones](docs/audits/measurement/MEASUREMENT_DOCUMENTATION_CLOSURE_2026-10-14.md).

El corte previo WP `cf7f10d1c` / Think `63e9fa7c7` quedó incluido en los pushes del rollout visual:
WP `8d6ff95` (plugin1.1.0, payload9archivos), Think `f7d8f36` y Vercel `dpl_3iSjewwoA1wxPqW4oG9FDugXzmZ5` Ready.
Panel/categorías/GPC verificados; QA intercepta transporte y no prueba nuevas recepciones Meta. [Rotación CLI 14/10](docs/audits/measurement/VERCEL_CREDENTIAL_ROTATION_2026-10-14.json): anterior revocada/403; nueva CLI/proyectos200, dos fuentes0600 y GitHub actualizados, wrappers retirados; vence14/10/2027. Sin nuevo workflow/deploy.

**Delta 17/10 — CLI local Meta para agentes: lectura y ampliación de operación.**

`pnpm --silent meta`, perfil Efeonce/Graph v25.0; [ADR vigente](docs/architecture/GREENHOUSE_META_AGENT_WRITE_CLI_DECISION_V1.md),
[manual](docs/manual-de-uso/growth/consultar-meta-con-agentes.md) y [funcional](docs/documentation/growth/meta-agent-cli.md).
El operador amplió a `meta-agent.v2`: catálogo SDK25 y métricas por campo, insights orgánicos, Ads nuevos
PAUSED y publicación/respuestas públicas acotadas con plan/hash/receipt privado, envío único y readback
GET. Preparar no publica; `unknown` no se reenvía. Sin activación, DM, IAM, nuevo CAPI, producto/MCP/deploy.
Foundation verificada: 34 tests/17 comandos de lectura, ESLint/TS PASS; readback17:10–17:12Chile en
`/Users/jreye/Documents/Meta-Efeonce-Connection/cli-verification-2026-10-17/` (`summary.json`, `final-stats.json`).
Stats server7d: dos páginas/36 filas; final1d: dos páginas/seis filas, exit0. Lead EMQ6,9/PageView3 son
agregados disponibles, no mejora causada por la CLI. V2: 105 tests/5 archivos, TS strict y lint global
PASS; código completo, POST públicos no certificados en vivo. Probes privados en
`/Users/jreye/Documents/Meta-Efeonce-Connection/cli-v2-verification-2026-10-17/`; fechas sociales: IG reach/day
una fila+cursor (exit6), reanudación misma consulta cero filas completas (exit0); Page engagement una
fila+cursor (exit6). Link observado v26.0, solicitud propia v25.0. Sin publicaciones/conversiones de prueba. [ADR inicial](docs/architecture/GREENHOUSE_META_AGENT_CLI_DECISION_V1.md).
Ampliación de rastreo [aceptada local](docs/architecture/GREENHOUSE_META_LEAD_TRACE_CLI_DECISION_V1.md):
`leads find/trace`, fuente/colas/ACK y HubSpot separados, selector privado/UUID, store canónico runtime
READ ONLY. Readback real fsub7d76a9ba/event474092ed: delivered, sGTM200, historialHubSpot correlated y
contacto por identidad; MetaProcessed/contactCreatedBySubmission unknown. `coverage.complete` cubre
observables, no todo procesamiento. Evidencia Documents/Meta-Efeonce-Connection/lead-trace-verification-2026-10-17/.
Sin PII exportada/descifrado/redispatch/CRM writes. Corte anterior: 172 tests/9 archivos, TS strict con
imports canónicos y ESLint propios PASS; source read/find y CLI full/source-only/evento verificados.
[Relectura del último Performance](docs/audits/growth/2026-10-17-performance-latest-lead-trace.md): sigue fsub7d76a9ba, HubSpot recibido y Meta contabiliza 1 Lead servidor; sin fallos de entrega observados, binding exacto/atribución pendientes.
Delta [ID nativo HubSpot](docs/architecture/GREENHOUSE_HUBSPOT_FORM_RECEIPT_DECISION_V1.md): código local, marcador por envío y recibo GET/CAS; SQL parqueado, propiedad/campo/mapping y release pendientes (Growth/Integrations). [Activación](docs/manual-de-uso/growth/guardar-identidad-nativa-hubspot.md); plan privado Documents/Meta-Efeonce-Connection/occurrence-marker-2026-10-17/. Históricos no adquieren prueba exacta. [Meta individual](docs/documentation/growth/meta-individual-event-verification.md): sin GET por UUID; [recibo CAPI](docs/architecture/GREENHOUSE_META_EVENT_RECEIPT_DECISION_V1.md) ahora implementado localmente (header saneado, CAS por intento, CLI). Operador: commit sin activar/desplegar; checkbox OFF, SQL parqueado, sin envíos/publicaciones.

## 2026-10-13 — Fabrimetal: continuidad de largo plazo

[Política aprobada](docs/operations/EFEONCE_LONG_TERM_PROSPECT_FOLLOWUP_POLICY_V1.md) y [caso](docs/commercial/follow-up-agent/runs/2026-10-13-fabrimetal-respuesta-parada.md): proveedor vigente,
comunicaciones detenidas y TASK HubSpot **118419088700**, **13/04/2027 09:00 Chile**, asignada a Julio/releída; duplicado Notion Cancelado.
Nutrición por email pendiente de permiso; recontacto requiere razón nueva y autorización. Skills espejo y
seguimiento conservan la cola futura aunque cambie el mes. Acuse puntual 13/10 enviado y EMAIL SENT verificado; cadencia detenida.

## 2026-10-13 — Radar comercial: tarea por corrida y registro semanal

[Contrato y registro](docs/commercial/prospecting-agent/README.md): mismo scheduler convertido a cron ACTIVE,
09:00 Santiago, tarea nueva por corrida en greenhouse-eo y consultas saneadas en repo. Nuevas convocatorias
para postular sólo de la semana calendario; cinco líneas × cuatro mercados. Históricos para credenciales.
INTURSA/Alfin: altas autorizadas de dos empresas y cuatro contactos; detalles privados y [reporte](docs/commercial/prospecting-agent/runs/2026-10-13-privadas.md).
Primera corrida futura aún no observada. Sin nuevos envíos ni Deals; no commit automático.

## 2026-10-13 — Sika N.º 1164: oferta presentada en Wherex

El operador presentó la oferta el 13/10 a las 08:56 (estado «Enviada», leído en el portal sin tocar campos): un servicio, MXN 64.000 netos, tres archivos
técnicos y uno económico; el video no se adjuntó (límite de 20 MB) y se ve por QR. [Registro](docs/commercial/tenders/sika-mexico-campana-creativa-1164/PRESENTACION-2026-10-13.md).
Sin verificar: versión de cada adjunto. HubSpot: deal en `presentationscheduled` (lo movió el operador), con MXN 64.000 y cierre 16/10 cargados a su pedido y releídos. Resultado pendiente; cierre 16/10 a las 16:00 de Ciudad de México.
Playbook, manual de Wherex y skills actualizados con el estado y con lo nuevo del portal (límite de adjuntos, condiciones, retirar para editar).

## 2026-10-13 — Outreach personalizado y seguimiento HubSpot

[Registro](docs/commercial/follow-up-agent/runs/2026-10-13-outreach-personalizado.md): Paula, Nicol, Fiorella,
Sergio, Hernán y Jesús; Outlook web, firma gráfica, brochure contextual y seis EMAIL `SENT` en HubSpot.
Rafael excluido; Paula conserva correo deducido sin verificación de entrega. Revisar hilos antes de
seguimiento. [Procedimiento reusable](docs/operations/EFEONCE_OUTLOOK_AGENT_SEND_POLICY_V1.md#prospección-personalizada--criterio-confirmado-el-13102026);
sin renovación del corte global del pipeline. Mandato posterior: [seis secuencias HubSpot](docs/commercial/follow-up-agent/runs/2026-10-13-secuencia-hubspot.md),
18 correos para 16/22/29 octubre; seis `Programado`, firma Julio y parada por respuesta verificados.
Apollo detenido: seis borradores inactivos, cero inscritos. No duplicar ni ampliar este lote autorizado.
Método incorporado a la [skill de prospección](.codex/skills/efeonce-b2b-prospecting/references/hubspot-follow-up-sequences.md)
y manual; espejos Codex/Claude y fixtures de secuencias. Actualización documental, sin nuevos envíos.
