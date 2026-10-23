# Handoff

## 2026-10-23 — Mattis: propuesta Markdown y método conciliado

[Expediente GRD-1555](docs/commercial/tenders/mattis-branding-marketing-inmobiliario-1555/README.md): caso MD principal,
master de 23 bloques para Claude Design y anexos; copias en carpeta 14. Simulación COP 190.150.000 netos, no aprobada;
proyecto, elegibilidad, capacidad e impuestos pendientes. Sin envío ni nueva mutación CRM.
Tres subagentes conciliaron continuidad y skills; método/manuales/plantillas distinguen preparación MD, diseño y emisión,
y usan costo objetivo V3. [Auditoría y validación](docs/audits/commercial/2026-10-23-mattis-markdown-docs-skills.md).
Sin cambio runtime; commit local autorizado por Julio, sin push. Próximo paso: diseño con Claude Design y validación comercial antes de presentar.

## 2026-10-23 — Auditoría SEO del Blog SKY: informe listo, envío pendiente de Julio

Informe A4 de 23 páginas «Por qué cayó el tráfico y cómo recuperarlo» generado y revisado página por página
(`outputs/sky-blog-seo-audit-2026-10-23/informe/`; copia para adjuntar en OneDrive › Alineación › 1. Clientes
(Interno) › Sky - SEO-AEO › Auditoría SEO 2026-10). **Nada enviado a SKY:** los dos correos están en borrador en
[`caso-auditoria-2026-10/correos/`](docs/services/sky-blog-seo/caso-auditoria-2026-10/README.md) y salen por Outlook web
con firma gráfica y CCO HubSpot. Urgente para SKY: nueve artículos de Perú despublicados entre el 15 y el 23-10
(restaurables desde la papelera 30 días) y la propiedad GSC de `www.skyairline.com`, que vence entre nov-2026 y
ene-2027. El renderer ganó capacidades en `001683d83` (`pnpm report:compose`; regenerar con
`pnpm exec tsx scripts/seo/sky-blog-audit-report.ts`). El logo de SKY adjunto a la organización es generado por IA:
usar `ai-generations/2026-09-23_cmp003-sky-hangar/refs/sky-official.svg`. **Sin push.**

## 2026-10-23 — Medición del menú global y del dock de las landings (TASK-2042/2043)

GTM web `GTM-NGHPGRLZ` publicado en la versión 10: la 8 suma `gh_landing_dock_clicked`, la 9 los
`gh_site_nav_opened|line_viewed|clicked` y la 10 `target_label` y `target_url` en el clic del menú (hosts en runtime
`3801bc4` y `a27c37e`, desplegados). Scripts `scripts/gtm/build-landing-dock-events-workspace.ts` y
`build-site-nav-events-workspace.ts` (`--publish` versiona, publica y reescribe los snapshots). GA4 `486264460`: seis
dimensiones de evento (`target_type`, `target`, `target_label`, `target_url`, `panel`, `line`; 15/50). Servidor
`GTM-K2X4ZTTK` sin cambios. Ninguno es key event. Verificado en GA4 Tiempo real con una visita simulada que acepta
sólo analítica; trampas: el service worker (`context.on('request')`) y `HeadlessChrome` (lanzar con `--user-agent`).
**Sin push:** `a35bc5a9f`, `807180a8b`, `9c24746a5` y `dc18cf45d` en `develop`.
[LEARNINGS](docs/reference/measurement-gtm-ga4/LEARNINGS.md) ·
[TRACKING-PLAN](docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md#ctas).

## 2026-10-23 — Navegación global (EPIC-055): en producción en todo el sitio (TASK-2042)

Menú nuevo encendido en todo `efeoncepro.com` desde las 00:09 UTC por decisión del operador, sin piloto; `/blog/`
(#18456) conserva Ohio (lo lleva TASK-1802). Vuelta atrás: `set-site-nav-switch.php` con `{"mode":"off"}`. En el tema:
AXIS primitives 0.7.13 (runtime `aadfdc9`); documento del menú en la revisión 4; agendador nativo en vivo; Loop Marketing
→ Inbound (301). Edición: `pnpm public-website:site-nav` (las escrituras en producción piden el visto bueno del
operador). La sesión «Rediseño de Menú» sigue de contralora de fidelidad.

**Sin push:** los commits de Greenhouse `develop` y del runtime `main` de TASK-2041/2042 esperan la autorización del
operador. AXIS está publicado hasta v0.7.14.

**Pendiente:** Core Web Vitals contra la cabecera anterior (la medición GTM/GA4 quedó hecha: entrada de arriba), prueba de vuelta a `off` en producción y el admin de TASK-2041 (dirección B).

**Trampa al verificar en vivo:** con el panel del navegador oculto la página corre en segundo plano (sin
`requestAnimationFrame` ni eventos de scroll): el tono de la isla no se actualiza y el bloqueo de scroll del agendador
parece pegado. Verificar con un navegador en primer plano (Playwright headless sirve).
[TASK-2042](docs/tasks/in-progress/TASK-2042-site-nav-wordpress-rollout.md) ·
[manual](docs/manual-de-uso/public-site/operar-navegacion-global.md).

## 2026-10-23 — Dock de vidrio de las landings (TASK-2043, EPIC-055): en vivo en las siete

Primitive AXIS `efeonce.landing-dock` publicada (v0.7.12–v0.7.14: primitives 0.7.14, contracts 0.7.12, tokens 0.6.9,
registry 0.7.5) y plugin `eo-landing-dock` desplegado. Las siete landings (Inbound, HubSpot, Performance, Inicio, Redes
Sociales, SEO e Influencers) usan el dock en vivo, cada una con snapshot previo y aprobada en vivo por la sesión de
fidelidad «Rediseño de Menú». Vuelta atrás por landing: `pnpm public-website:landing-dock off <landing> --confirm`.
Decisiones del operador: presencia de hoy y un solo botón en teléfono para Influencers. Lecciones: la CI de AXIS
corre el carril de agentes para módulos nuevos; `release:packages` etiqueta el HEAD del checkout compartido (v0.7.13
quedó en un commit de otra sesión: nadie commitea en AXIS `main` mientras espera); la línea base en vivo debe incluir
el plugin. Follow-ups: retirar el código de los docks viejos (no antes del 2026-11-06) y puente de agendador
compartido; `gh_landing_dock_clicked` ya está en GTM y GA4. [Task](docs/tasks/complete/TASK-2043-landing-dock-glass-primitive.md) ·
[manual](docs/manual-de-uso/public-site/operar-dock-de-landings.md).

## 2026-10-22 — Fundación Luz: contacto y dos acercamientos verificados

Contact257217550764 / Company59806188192 / Primary y nota119334575454 leídos; dirección inferida admitida por
excepción expresa informada de Julio, sin etiquetarla verificada. InMail21:37Santiago (1crédito) y correo22:18:35
con firma gráfica/CCO/brochure original; Enviados y EMAIL119337620506SENT asociados verificados. Sin Apollo
ejecutado, Lead/Deal/secuencia ni membresías comprobadas. Esperar respuesta; entrega/lectura no acreditadas.
[Expediente y límites](docs/commercial/prospecting-agent/runs/2026-10-22-fundacion-luz-mariana.md). Docs/skills espejo
concilian la excepción vigente y separan atribución de enlaces por canal; no conceden nuevos permisos.

## 2026-10-22 — Cotizador local: perfiles y costos Réditos

Catálogo v13 / recursos v12 / créditos v1 activos en CLI; tres perfiles nuevos estimados y Awario público. [Costo y evidencia](docs/commercial/tenders/gana-loti-agencia-digital-2027-1552/research/COSTOS-RESTO-ALCANCE-CLI-2026-10-22.md). Propuesta detenida; sin importación DB, commit o push. Suite: 1.860 aprobadas, tres omitidas.
Decisión comercial posterior: rango COP 36–38M / USD 9.863,01–10.410,96 al mes; Deal66560488750 COP456M / USD124.931,51 (38M x12), leído de vuelta. [Base vigente](docs/commercial/tenders/gana-loti-agencia-digital-2027-1552/BRIEF-COMERCIAL-VIGENTE.md) gobierna futuros documentos. Precio final y propuesta detenidos; HOLD contractual conservado.
Análisis posterior con tres subagentes: [ruta y extras para elegir](docs/commercial/tenders/gana-loti-agencia-digital-2027-1552/research/ESTRATEGIA-DIFERENCIACION-2026-10-22.md); no ganador anterior confirmado. Extras no aprobados; sin nuevo CRM o propuesta.

Revisión completa posterior: [84 páginas y dirección reformulada](docs/commercial/tenders/gana-loti-agencia-digital-2027-1552/research/COMPARACION-PROPUESTA-ANTERIOR-Y-REFORMULACION-2026-10-22.md). La ruta anterior repetía integración, equipo y extras; elecciones creativas específicas por marca pendientes de materializar. Sin cambio de precio, CRM o propuesta.

Profundización: [GANA/LOTI y cuatro pares](docs/commercial/tenders/gana-loti-agencia-digital-2027-1552/research/INVESTIGACION-MARCAS-Y-DIRECCION-2026-10-22.md); cercanía/pedagogía ya existen. 97 consultas, fuentes y bloqueos registrados; LOTI sin UI/checkout verificados e informes recientes inaccesibles. Direcciones aún sin muestras creativas; sin cambios de costo/CRM/propuesta.

Mandato posterior: Julio autorizó preparar el MD. [Propuesta para Claude Design](docs/commercial/tenders/gana-loti-agencia-digital-2027-1552/PROPUESTA-GANA-LOTI-2027-PARA-CLAUDE-DESIGN.md) redactada: 28 bloques y anexos; técnica/económica separadas. Pausa de redacción superada, emisión/presentación aún pendientes. Sin deck/PDF/CRM/envíos.

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
