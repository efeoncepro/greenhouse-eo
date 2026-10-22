# Handoff

## 2026-10-22 — Navegación global (EPIC-055): TASK-2040 publicada, TASK-2041 a medio camino

**TASK-2040 completa:** AXIS v0.7.7 (tokens 0.6.8, contracts 0.7.7, registry 0.7.4, primitives 0.7.0), con la
instalación privada verificada. Antes del tag, la sesión «Rediseño de Menú» actuó como contralora de fidelidad con el
canvas v68 y se corrigieron sus diferencias. Sigue de contralora en 2041 y 2042: mostrarle lo visible antes de cada
cierre.

**TASK-2041:**
- Slices 1 a 3 en `efeonce-public-site-runtime` `main` (`13cb164` … `b0dd479`), **sin push**. Plugin `eo-site-nav`:
  servicio de guardado, `wp eo-nav`, REST `eo/v1/site-nav` y Recursos dinámicos.
- Verificado con `tests/playground/run-eo-site-nav.sh` (47 checks + WP-CLI real) y la paridad del validador.
- 51 fotos subidas y verificadas en `site-nav/v1/` (autorizado por el operador).

- **Plugin desplegado y activo en producción** (0.1.0, sin documento; el sitio sigue con Ohio). Carril:
  `build-site-nav-plugin-package.cjs` + `deploy-site-nav-plugin-package.php`. Respaldo:
  `/tmp/eo-site-nav-before-20261022-210707.tar`. Rollback: `wp plugin deactivate eo-site-nav`.

**Pendiente, con autorización del operador:**
- `apply` del documento inicial en vivo.
- Verificar la purga de Kinsta desde PHP.
- Diseño del admin (Slice 5).

`main` local del runtime trae WIP ajeno: no tocarlo.

## 2026-10-22 — Redes Efeonce: love brand y canales v2

Estrategia social y editorial registrada: [PDR-020 rev. 2.0](docs/public-site/decisions/PDR-020-canales-propios-sistema-editorial.md)
y [love brand y comunidad](docs/strategy/EFEONCE_LOVE_BRAND_AND_COMMUNITY_STRATEGY_V1.md). Plan nov 2026–Q1 2027 y piezas
en el lienzo privado `claude.ai/artifact/MWoecLSspdKw8ZRXKzPBBd`; nada programado en Metricool. Pendientes: medición
del puente («¿cómo nos conociste?» + fuente de primer contacto, requiere task), baseline nov–dic, piezas de Instagram,
Año Nuevo (MET-2338 archivada) y Navidad rehecha desde cero. fal sin saldo (A −0,29 / B −0,35 USD al 22-oct).
Barrido por subagentes aplicado a context, public-site (PDR-003/004/005/018/019), operations, documentación funcional
(nuevo `docs/documentation/social/sistema-de-canales-y-love-brand.md`), manuales y 34 archivos de skills con espejo
`.codex` (salvo `commercial-expert`, cuya copia Codex es otra versión). Contradicciones para decidir el operador:
jerarquía Glitch↔Manzanitas en PDR-003/018, naming Think/Manzanitas, redirección `/servicios/hubspot/` vs PDR-013,
reutilizar imágenes del carrusel en LinkedIn (manual de seasonalities vs PDR-020 §4.4), canal del reel/vlog de Glitch,
story de Manzanitas y pódcast, presentador de los tutoriales de YouTube. **Resueltas el mismo día** (PDR-020, delta punto
12) y aplicadas a docs, skills y Notion (`Twitter 🐦` retirado del Calendario). La 302 de `/servicios/hubspot/` →
`/servicios-contratar-hubspot/` quedó **aplicada y verificada en vivo** (Yoast, respaldo `_gh_hubspot_302_before_20261022`).
Con caché la redirección no conserva UTM: los posts enlazan directo a la landing.

## 2026-10-22 — Kibernum: Growth Colombia, contacto y dos canales

Contact `256968083769` / Company `53955357196` / Primary verificados; seis segmentos del contacto
(180/181/182/183/151/156) y Company 187 comprobados. Apollo: 1 crédito.
Correo 22/10 00:56 Santiago con firma gráfica/CCO y brochure 360° completo; Outlook y EMAIL `119266980893`
SENT verificados. InMail distinto enviado (1 crédito); nota `119264638728` releída. Esperar respuesta, sin Lead,
Deal ni secuencia nuevos. [Evidencia y continuidad](docs/commercial/prospecting-agent/runs/2026-10-22-0056-kibernum-growth-colombia.md).

## 2026-10-21 — Correos de Julio: firma gráfica siempre

Mandato permanente: firma gráfica oficial en todo correo, incluidos respuestas, reenvíos y seguimientos manuales, programados o por secuencias. Texto plano deja de ser alternativa; si la herramienta no conserva la firma, mantener pendiente. [Política vigente](docs/operations/EFEONCE_OUTLOOK_AGENT_SEND_POLICY_V1.md). Routers y referencias de skills alineados; no se enviaron correos ni se modificaron secuencias por registrar esta regla.

## 2026-10-21 — Agencia Creativa: outreach y secuencias izipay

Ana Paula: InMail verificado, sin Contact; Andrés/Odoo: correo y Contact verificados, sin nuevo seguimiento.
izipay: cuatro contactos/Primary y correos registrados; Iris, Ariana y Diego con dos seguimientos cada uno
(27/29/30Oct y 3/5/6Nov, Perú). Laura rebotó: secuencia creada, cero inscritos, no reintentar.
Iris conserva correo inferido y excepción expresa; Programado no es enviado. Owner Julio / Commercial.
[Registro, IDs y pendientes](docs/commercial/follow-up-agent/runs/2026-10-21-agencia-creativa-izipay.md).
[Capacidad local corregida](docs/operations/EFEONCE_LOCAL_PRODUCTION_CAPABILITY_V1.md); docs/skills espejo, sin nuevo envío.

## 2026-10-21 — ANAM: voz activa, soporte y respuesta recibida

Hallazgos y [correspondencia completa](docs/audits/ANAM_EMMA_VOICE_SOPORTE_Y_CORRESPONDENCIA_2026-10-21.md):
correo de Julio enviado 18:20 con firma gráfica/CCO, Outlook y HubSpot EMAIL119253278227/SENT verificados.
María Paz respondió 18:28 preguntando cómo habilitar recepción/disponibilidad; duda operativa de soporte,
pendiente de contestar. Base oficial de instrucciones en el registro. Sin cambios en Emma.
Solo ajustes menores; IVR, derivación por ejecutivo, separación funcional o migración de canales requieren
evaluar viabilidad/alcance y eventual cotización. Espejos del caso actualizados; Kortex permanece hibernado.

Base del 19/10: 600 con Emma primero, voz Lina, IA24/7 y humanos L–V09:00–18:00Santiago; sin menú IVR.
Llamada real41s: ticket/transcripción y primera respuesta verificados; grabación disponible; handoff y buzón pendientes.
Correo a Oscar/María Paz enviado con firma gráfica/CCO, EMAIL118930883467 SENT en Efeonce.
Caso y skills espejo actualizados; [manual reutilizable](docs/manual-de-uso/hubspot/configurar-customer-agent-llamadas.md)
y [evidencia/pendientes](docs/audits/ANAM_CUSTOMER_AGENT_VOICE_SETUP_2026-10-19.md). Kortex hibernado.

## 2026-10-20 — Blog etapa 1: candidato local en develop

Implementación y preview autorizadas, publicación no autorizada. Runtime aislado en
`../efeonce-public-site-runtime-develop` (`develop`); Greenhouse en `develop`. Consultas dinámicas,
Glitch, temas, objetivos, recursos y formulario aprobado. Opción 2 de Product Design elegida e implementada: portada navy y arte protagonista; [QA](scripts/public-website/blog-phase1/design-qa.md). [Contrato, evidencia y pendientes](scripts/public-website/blog-phase1/README.md).
No push, CMS write, merge, release, GTM ni envío real. Etapa 2 y validación productiva pendientes.
Anotaciones del operador atendidas: cabecera limpia, temas centrados, categorías editoriales explícitas, recursos visuales y cierre Glitch protagonista. Runtime `a10c85e`;27 checks y capturas completas1440/390 en `.captures/2026-10-20-blog-annotations/`. Aceptación visual final pendiente; contrato Forms intacto.
Segunda ronda (`3d9ee81` runtime): sin «Por Efeonce», temas con arte editorial propio y formulario integrado en el navy de Glitch. Evidencia `.captures/2026-10-20-blog-annotations-v2/`;27 checks, contraste/validación negativa local. Todo en develop, sin push/publicación; aceptación visual pendiente.

## 2026-10-20 — Blog: preview en develop; publicación detenida

Operador detuvo el release y pidió conservar el trabajo en develop y revisar diseño. No merge/release a main ni cutover WordPress.
HubSpot Glitch creado y GTM Web7 ya publicado antes del stop; Forms review y CF7 live. No envío real.
No retomar publicación sin nueva autorización. [Vista previa y estado](docs/audits/public-site/2026-10-20-blog-growth-form-preparation.md).

## 2026-10-20 — Partnerships: contactos, habilitación y expediente Nexsys

Adobe `.com`/AM17480390 Registered: Code of Conduct100%, Certified recibido; aprobación pendiente.
Nexsys: 12PDF enviados19:14Chile a Francisco, CC Jean/Javiera/Constanza, firma gráfica/CCO; Outlook y EMAIL118974219069 SENT verificados. Formulario sin firma para revisión; crédito/Marketplace/capacitación pendientes.
Google `.org`: Cloud/Workspace indirecto activo/Ingram, handshake completo; respuesta comercial y formación pendientes.
Microsoft `.com` 20/10: Verified, Authorized e Indirect Reseller Active; correo a Geraldine/CC Camila enviado17:21 con captura/firma, EMAIL119142026297 SENT. Respuesta comercial LOL pendiente; AWS SmartHub/Partner Central por verificar.
[Registro y auditorías](docs/operations/EFEONCE_PARTNERSHIP_REGISTRY_V1.md) · [manual y controles](docs/manual-de-uso/comercial/operar-partnerships-y-distribuidores.md).
[Directorio](docs/operations/EFEONCE_PARTNER_CONTACT_DIRECTORY_V1.md):27 personas,8 buzones, fuentes/rebotes; índice nominal en cuatro skills Codex/Claude. Antes de contactar, leer ficha e hilo; sin nuevos envíos en la consolidación del directorio.

## 2026-10-18 — Indecaucho: Katia contactada y un seguimiento programado

Company59393386572/Contact255985568411/Primary/segmento180 verificados. Dos puentes Apollo investigados,
sin correo utilizable ni alta;2 créditos. Primer Outlook21:06Chile con firma gráfica/CCO; EMAIL118844303672 SENT.
Secuencia316810121: Programado1/Error0, único22Oct09:30Quito=11:30Chile, firma y deck360 íntegro;
respuesta a cualquier email o reunión desinscribe. No duplicar, contactar puentes ni reinscribir.
[Expediente y siguiente paso](docs/commercial/follow-up-agent/runs/2026-10-18-indecaucho-katia-hubspot.md).

## 2026-10-18/19 — Grader: transporte medido y release completado

GET live confirma Think→Forms portátil, versión8 y política Ads publicada. Fachada histórica
completada con contexto visitante, CORS y recibo sólo tras persistencia; duplicados sin reenvío.
PR257 promueve todo develop81f6ba525 a main2559e9242, árboles idénticos. Vercel4He READY;
Grader y clasificación auditada servidos, canarios negativos y smoke productivo PASS.
Manifest released; orquestador39190761785, CI/Deep/smoke PASS, health200 y watchdog6/6 drift0.
Sin leads ficticios, replay, nuevo GTM ni otra corrección Web.
Cierre documental19/10: arquitectura, funcionales, manuales, índices, TASK-2034 y skills espejo conciliados;
primera recepción/atribución real sigue pendiente. Checkout principal develop, WIP ajeno preservado.
[Release](docs/audits/releases/2026-10-18-grader-commercial-measurement-production-release.md).
[Contrato y verificación](docs/architecture/GROWTH_GRADER_COMMERCIAL_MEASUREMENT_V1.md).
Discovery LinkedIn19/10: documentación oficial revisada con tres agentes; [propuesta y pendientes](docs/architecture/GREENHOUSE_LINKEDIN_ADS_MEASUREMENT_ARCHITECTURE_V1.md).
InsightTag/CAPI/dedupe/HubSpot documentados; cuenta/Partner ID/acceso no verificados, sin instalar ni enviar.
Adquisición19/10: [taxonomía conceptual aceptada](docs/architecture/EFEONCE_COMMERCIAL_ACQUISITION_TAXONOMY_DECISION_V1.md);293 Deals leídos,168 candidatos/125 revisión.
Plan propio sin aplicar; consumers incompletos/workflows403. Sin cambio CRM, schema, fuentes nativas o histórico.
UI19/10: legacy con Insignia/seis colores; selección única ofrece punto/insignia. API pública revisada no expone esos ajustes.
[Contrato visual y QA](docs/manual-de-uso/hubspot/normalizar-origen-canales-adquisicion.md#presentación-humana-estilos-colores-y-alcance-de-la-api) documentado en ADR/funcional/skills espejo; estilos nuevos propuestos, cero writes.

## 2026-10-18 — Ads publicado en todos los formularios comerciales validados

API22:57Z:13 Forms comerciales y Discovery con Ads;12 altas adicionales, Grader comercial confirmado
por Julio y Contacto general fueraAds. Lead Gen Web corregido por command/store Forms a quote_request,
con key/slug/versión/destinos preservados y GET público verificado. Políticas por CAS/revisión/GET;
Meta/UPD previos preservados. Sin GTM, puja, campaña o nuevo deploy. Nuevo API de clasificación sólo
implementado localmente; corrección aplicada vía CLI canónica.53 tests/ESLint/tsc PASS.
Primera recepción/atribución y ruta histórica propia Grader sin certificar; no fabricar leads/replays.
[Publicación y evidencia](docs/audits/growth/2026-10-18-commercial-forms-policy-publication.md),
[manual de corrección](docs/manual-de-uso/growth/corregir-clasificacion-comercial.md) e [historial](Handoff.archive.md).

## 2026-10-18 — Medición: cierre documental y alcance comercial

Arquitectura/ADRs, runtime/tracking, manuales OAuth/CLI/Ads, índices y cuatro pares de skills
Codex/Claude conciliados con el cierre publicado: Web6/Server10, EC ON, ER5 READY del mainEC y
tracing HubSpot/Meta configurados. Primera identidad/recibo/recepción/atribución sigue sin verificar.
Nueva cobertura solicitada **sólo forms comerciales**: catálogo16forms+1agenda, sóloPerformance/Discovery
Ads activos;12 propuestas DRY_RUN sin aplicar. Lead Gen Web sigue lead_magnet; Grader/Contacto
requieren revisar intención. Sin inscripción automática ni nuevos eventos/acciones/puja/deploy/GTM.
[Inventario y siguiente paso](docs/audits/growth/2026-10-18-commercial-forms-measurement-coverage.md),
[activación](docs/audits/growth/2026-10-18-google-ads-activation.md) e [historial](Handoff.archive.md).

## 2026-10-18 — Activación Ads y trazabilidad de conversiones

Cuenta6862539491: EC ON, GTMWeb6/Server10 publicados, bridge compatible WordPress/Think y policies
Performance/Discovery rev2. HubSpot marker/config y captura Meta activos. Flag Production true;
companion ER5 READY del mismo mainEC liberado, alias exacto, health200 y watchdogok6/6 sin drift.
Canarios admin/public/negativos PASS, consentimiento hosts12/12 y SDKlive4/4 sin envíos comerciales.
Primera ocurrencia, identidad nativa y recepción/atribución siguen pendientes: cero nuevas ocurrencias
20:35–20:44Z. TASK-2034 parcial. Sin replay ni cambio de campañas/OAuth/IAM. WIP ajeno preservado.
[Auditoría/evidencia](docs/audits/growth/2026-10-18-google-ads-activation.md),
[arquitectura](docs/architecture/GREENHOUSE_GOOGLE_ADS_MEASUREMENT_ARCHITECTURE_V1.md),
[tiempos](docs/operations/PRODUCTION_RELEASE_TIMING_LEDGER.md) e [historial](Handoff.archive.md).

## 2026-10-18 — Release completo de develop a producción

Todo el candidato develop `77763331c` promovido a main `ec317c928` por PR #256: 1.583 archivos,
árbol completo idéntico, sin exclusiones ni WIP ajeno. Orquestador `39159325900` SUCCESS;
manifest `ec317c928fff-33c067f4-bc76-4a21-a5e0-a37a99ac726b` **released**, health HTTP 200,
watchdog ok (6/6, drift 0, datos faltantes 0). CI/Deep/smoke verdes y canarios del contrato PASS.
Excepción auditada de batch autorizada por Julio; los demás gates pasaron. Dos expansiones SQL
aditivas aplicadas y verificadas; sin replay manual ni certificación de entrega a proveedores.
Ads **OFF**, GTM sin publicar: hosts/Preview/políticas por fuente/EC conservan su rollout pendiente.
[Auditoría y límites](docs/audits/releases/2026-10-18-full-develop-production-release.md),
[tiempos](docs/operations/PRODUCTION_RELEASE_TIMING_LEDGER.md) y [historial](Handoff.archive.md).

## 2026-10-18 — Shared deal HubSpot: liderazgo Partner

Automatización del radar actualizada y leída de vuelta: control adjudicación/contrato/fechas previo a recomendar, créditos o Deal; adjudicada=descartar, evidencia pendiente=HOLD. MismoID/09:00Santiago/permisos. [Evidencia](docs/commercial/prospecting-agent/runs/2026-10-18-1128-control-adjudicacion-automatizacion.md).

**RECTIFICACIÓN:** Esenttia5600218590 ya adjudicadaDACARTEC(firma10Oct/inicio15Oct). Julio cerróDeal10:32; sinsync. No pendiente de admisión/POI; llamada nativa anulada. Mala calificación del agente. [Cierre corregido](docs/commercial/prospecting-agent/runs/2026-10-18-1036-esenttia-adjudicada-rectificacion.md).

Julio pidió aprender el flujo; [procedimiento](docs/manual-de-uso/hubspot/convertir-negocio-compartido.md) y skills actualizados. Esenttia66218288550 convertido10:08GMT-3 con liderazgoPartner, fecha local31/12/2026 y declaración confirmadas. TarjetaHubSpot muestra30/12: agente debe conciliar, sin falsear cierre local. Admisión/POI pendientes; no repetir consulta ni contactar automáticamente. [Evidencia](docs/commercial/prospecting-agent/runs/2026-10-18-1002-esenttia-shared-deal.md).

## 2026-10-18 — Footer público compatible sin cambio visual

Publicado en WordPress el ajuste mínimo de `widget_block[34]`: el bootstrap ya localiza
`data-eo-footer-partners="v2"` y asciende a `#colophon`, sin `:has()` en `querySelector`. Snapshot/rollback
independiente `eo_footer_compat_20261018`; cache WordPress/Kinsta purgada y readback PASS. Home y
`/servicios-contratar-hubspot/` verificadas a 1440/390: layout intacto, cero overflow, nueve partners,
un Careers, newsletter presente y cero errores de consola. La alerta de cPanel puede permanecer visible hasta
su siguiente corrida; no silenciarla manualmente. [Evidencia](docs/audits/public-site/2026-10-14-footer-composition-v2.md#compatibilidad-del-bootstrap-2026-10-18).

## 2026-10-17 — Google Ads: acceso API de lectura probado y arquitectura adoptada

Checkpoint18/10:499 tests y32 escenarios Chromium aislados PASS; API cuenta686/drafts verificada.
[Paquete previo al release](docs/operations/releases/google-ads-2026-10-18/README.md) con propuestas,
assets/hashes y rollback. Hosts/protocolo real/EC/CI pendientes; release general BLOCK. Sin activación.

Revisión18/10:1.445 archivos de89d70ec13 inventariados; CI/build PASS; Deep corregido localmente, revalidación remota pendiente.
Schema HubSpot/Meta autorizado y aplicado, worker existente recuperado200; dos submissions
delivered al ledger sin destinos directos. [Auditoría](docs/audits/releases/2026-10-18-candidate-89d70ec13-review.md).
Sin deploy/GTM; hosts/EC/Preview y autorización del lote pendientes.

OAuth `jreyes@efeoncepro.com` verificado; Cloud siempre `julio.reyes@efeonce.org` / `efeonce-group`.
API v26 PASS para **`6862539491`**, vía `login-customer-id: 9531478329` (directo 403); CLP,
America/Santiago, owner de conversiones propio. Cuenta nueva según operador; tracking
`NOT_CONVERSION_TRACKED`, dos acciones GA4 `HIDDEN` no primarias; campañas/goals consultados sin filas.
[Auditoría](docs/audits/growth/2026-10-17-google-ads-api-discovery.md),
[ADR](docs/architecture/GREENHOUSE_GOOGLE_ADS_INTEGRATION_DECISION_V1.md),
[arquitectura](docs/architecture/GREENHOUSE_GOOGLE_ADS_MEASUREMENT_ARCHITECTURE_V1.md) y
[manual](docs/manual-de-uso/growth/conectar-google-ads-con-agentes.md).
Unidad posterior autorizada y alcance ampliado por el operador: **CLI local de lectura y gestión**
`pnpm google-ads`, diez create/update por plan/hash/validateOnly/journal/readback. Campañas/grupos PAUSED;
sin activación, eliminación, creatividades o ingesta. Lecturas reales del catálogo PASS; ninguna mutación Ads.
OAuth del proyecto guardado como **Efeonce** con sus páginas públicas. Mismos clients/callbacks/scopes;
grant Ads propio en Secret Manager `efeonce-google-ads-agent-oauth`, con principal verificado en Google.
Regresión real GA4/GSC Efeonce y auth health/providers PASS; **verificación Google de marca/scopes pendiente**.
[Cierre operativo](docs/audits/growth/2026-10-17-google-ads-cli-oauth-implementation.md).
Pendiente Growth/Platform: conexión de producto por organización/API/MCP, pruebas proveedor de escrituras
con payload real autorizado, y luego captura/consentimiento/binding/rollout de conversiones. Sin publish GTM,
CRM writes, acciones/campañas nuevas, migraciones, cambios IAM o deploy. Credenciales/recibos fuera de Git.

Delta posterior autorizado — **Ads online Forms/Meetings implementado localmente** (TASK-2034).
Dos acciones WEBPAGE secundarias creadas y verificadas en6862539491: lead7852486523/agenda7852487186,
ONE_PER_CLICK, valor0CLP de medición. No campañas/pujas ni conversiones enviadas.
GTM API: Web workspace8 y Server12 con tags nativos Ads/Linker y exclusión bridge del forwarder18;
ambos quick_preview compilerError=false, live Web5/Server9. Flag Ads nuevo default OFF; policies intactas.
[Contrato y activación](docs/manual-de-uso/growth/activar-conversiones-google-ads.md) ·
[evidencia y gates pendientes](docs/audits/growth/2026-10-17-google-ads-online-conversions.md).
Código con recibo postcommit, consent granular/GPC, IDs30d, EC web reservado y dedupe; Meta/UPD separados.
Tag Assistant Web negativo PASS; EC OFF; términos de clientes aceptados y guardados por instrucción expresa posterior (UI reabierta).
Faltan QA funcional positivo/EC, release coordinado backend/bundles/bridge WP/Think,
confirmación/publicación GTM y opt-in policy/flag, y primera ocurrencia real. No declarar medición activa.

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
