# changelog.md

> Ventana reciente de cambios internos reales. El historial completo y verificable se consulta en
> [docs/changelog/internal/README.md](docs/changelog/internal/README.md). No cargar snapshots completos al
> inicio ni usar una entrada histórica como contrato vigente sin contrastarla.
>
> Techo operativo: 60 entradas, 2.000 líneas y ~60.000 tokens. Rotación:
> `pnpm docs:context-rotate --apply`.

## 2026-10-18 — Release completo de develop y cierre de recibos

[Historial interno](docs/changelog/internal/README.md).

- PR #256 incorpora los 1.583 archivos del candidato develop a main `ec317c928`, sin exclusiones.
- Orquestador `39159325900` SUCCESS; manifest released, salud HTTP 200 y watchdog ok 6/6, sin drift ni datos faltantes.
- Migraciones aditivas de recibos HubSpot/Meta verificadas; código Forms/Meetings desplegado y canarios PASS. Ads sigue OFF y GTM sin publicar.
- [Evidencia y rollback](docs/audits/releases/2026-10-18-full-develop-production-release.md); WIP ajeno preservado y cierre documentado sólo sobre los cambios propios.

## 2026-10-17 — Google Ads: arquitectura y prueba API de lectura

- Checkpoint18/10:499 tests y32 escenarios Chromium/API PASS; [paquete previo al release](docs/operations/releases/google-ads-2026-10-18/README.md), propuestas/hashes/rollback. Sin publicación ni deploy; hosts/protocolo real/EC/CI y alcance general pendientes.

- Revisión18/10:1.445 archivos de89d70ec13 auditados; CI/build PASS; Deep corregido localmente, revalidación remota pendiente. Reparación SQL HubSpot/Meta autorizada, versionada y verificada; dispatcher existente200 y dos submissions delivered al ledger sin destinos directos. [Auditoría](docs/audits/releases/2026-10-18-candidate-89d70ec13-review.md). Sin deploy ni publicación GTM.

- [ADR adoptado](docs/architecture/GREENHOUSE_GOOGLE_ADS_INTEGRATION_DECISION_V1.md) y
  [arquitectura](docs/architecture/GREENHOUSE_GOOGLE_ADS_MEASUREMENT_ARCHITECTURE_V1.md): OAuth/binding,
  GTM web/server, identidad comercial, consentimiento, HubSpot/Data Manager, reporting y rollout.
- [Probe API v26](docs/audits/growth/2026-10-17-google-ads-api-discovery.md) PASS para `6862539491`
  vía manager `9531478329`; dos acciones GA4 ocultas, tracking inactivo y cuenta nueva. Doce consultas,
  ninguna mutación; conexión y sender de producto pendientes. Funcional y manual documentados.
- Ratificación del operador: OAuth de producción **Efeonce** y CLI de consulta obligatoria en la primera
  unidad de lectura; catálogo y aceptación documentados. Rebranding y CLI pendientes de implementación.
- Unidad posterior: `pnpm google-ads` local implementada, con gestión ampliada por el operador. Lecturas
  reales PASS, planes create/update cerrados, validateOnly, hash, journal durable y readback por campo.
  Marca Efeonce guardada y grant Ads en secreto propio; regresión GA4/GSC y auth PASS. Ninguna escritura
  publicitaria ejecutada; verificación Google y conexión de producto pendientes.
  [Evidencia](docs/audits/growth/2026-10-17-google-ads-cli-oauth-implementation.md).

- Delta online: backend y renderers Forms/Meetings con recibo Ads postcommit, consentimiento explícito,
  capture de IDs y EC reservado. Dos acciones secundarias creadas/verificadas; workspaces Web8/Server12
  compilan por API. Sin publish/deploy/flag ON ni conversiones enviadas.
  [Evidencia](docs/audits/growth/2026-10-17-google-ads-online-conversions.md).
- Por instrucción posterior, términos de datos de clientes Ads aceptados/guardados y panel reabierto
  verificado en6862539491. EC OFF; sin publicación GTM ni promoción a main.

## 2026-10-17 — CLI local Meta para agentes

- `pnpm --silent meta`, contrato `meta-agent.v2`: lecturas existentes, catálogo SDK25, consultas por campo
  y métricas orgánicas; Ads nuevos PAUSED y publicación/respuestas propias con plan/hash/receipt privado,
  envío único y verificación GET. Resultado ambiguo sin reenvío; sin activación, DM ni nuevo sender CAPI.
- [Funcional](docs/documentation/growth/meta-agent-cli.md), [manual](docs/manual-de-uso/growth/consultar-meta-con-agentes.md)
  y [ADR vigente](docs/architecture/GREENHOUSE_META_AGENT_WRITE_CLI_DECISION_V1.md); foundation preservada.
  105 tests/5 archivos, TS strict y lint global PASS; código completo y lecturas/probes reales,
  POST públicos no certificados en vivo. Paginación social por fechas y reanudación IG verificadas.
  Sin integración productiva, MCP, deploy o ampliación IAM.
- [Rastreo Forms → medición → HubSpot](docs/architecture/GREENHOUSE_META_LEAD_TRACE_CLI_DECISION_V1.md):
  `leads find/trace` con selector privado y UUID, conexión/store canónicos READ ONLY; ACK local,
  historial HubSpot y contacto separados. Readback de un envío existente y sus IDs locales, sin mutación;
  HubSpot correlacionado, procesamiento Meta desconocido. Total actual: 172 tests/9 archivos, TS strict y
  lint propios PASS. Sin PII, descifrado, redispatch o CRM writes.
  [Último Performance releído](docs/audits/growth/2026-10-17-performance-latest-lead-trace.md): HubSpot recibido, ACK y un Lead servidor en Meta; sin fallos observados, identidad individual/atribución pendientes.
- [Recibos nativos HubSpot](docs/architecture/GREENHOUSE_HUBSPOT_FORM_RECEIPT_DECISION_V1.md): marcador
  server-side, historial exacto, ID persistido por CAS y recuperación GET independiente del POST.
  Código local probado; SQL parqueado, provisión/mapping y release pendientes. Históricos conservan
  correlación. [Meta individual](docs/documentation/growth/meta-individual-event-verification.md): sin
  GET por `event_id`; captura del recibo CAPI implementada localmente en el delta siguiente, sin reenviar eventos.
  [Cierre local](docs/audits/growth/2026-10-17-native-hubspot-receipt-closure.md): 262 tests/14 archivos,
  TS strict y lint PASS; SQL ejercitado en PostgreSQL aislado, lecturas reales sin mutaciones.
- [Recibo CAPI por evento/intento](docs/architecture/GREENHOUSE_META_EVENT_RECEIPT_DECISION_V1.md): sender
  fijado instrumentado localmente, header backend saneado, historial de hasta cinco observaciones
  en CAS de finalización y `meta.receipt` en CLI READ ONLY. No agrega sender ni retries por telemetría.
  Opción del template default OFF y SQL parqueado. Por orden del operador: commit sin activar/desplegar.
  [Cierre local](docs/audits/growth/2026-10-17-meta-event-receipt-local-closure.md): 402 tests Vitest +36 Node,
  TS/lint y SQL aislado PASS; sin nuevos eventos ni cambios externos.

- [Revisión final local](docs/audits/growth/2026-10-17-meta-cli-final-review.md): paginación malformada
  queda parcial, agregación HubSpot por ocurrencia/IDs por destino, fecha SQL protegida y validación
  de estados/historial de recibos. 426 Vitest +36 Node, TS/lint y SQL aislado PASS; skills espejadas
  y manuales actualizados. Sin push, activación, migraciones compartidas, eventos ni deploy.

## 2026-10-17 — Landing Performance Marketing en producción (TASK-1865)

- `/servicios/performance-marketing/` (page `251997`) publicada desde el canvas aprobado con el carril source-led de
  Medios: compilador, paquete scoped `performance-elementor-release.v1`, publicador, Ohio, SEO y migración de la legacy.
- Legacy `/servicio-gestion-campanas-publicitarias/` privada con 301; menú reapuntado; formulario propio
  `efeonce-performance-diagnostic` con destino HubSpot directo.
- Documentación sincronizada: funcional, manual, PRIMITIVES, contrato de forms, TRACKING-PLAN, servicios, PDRs,
  briefs y skill del sitio público (lecciones del carril de release).
- Cierre: TASK-1865 `complete`; políticas de medición Meta publicadas para Performance, Medios y HubSpot scope y primer
  `Lead` de servidor recibido por Meta desde el 14/10.

## 2026-10-17 — BytePlus: retratos activos y pruebas completadas en la cuenta correcta

- [Manual](docs/manual-de-uso/creative-studio/byteplus-directo.md) y [ledger por cuenta](docs/operations/creative-production/BYTEPLUS_VIRTUAL_PORTRAIT_LEDGER_V1.md)
  fijan Google SSO `jreyes@efeoncepro.com` / **3004839361**; la cuenta histórica incorrecta queda excluida de operación.
- KYC aprobado y carta aceptada por mandato de Julio; Entry Free activo. Chrome resuelto con permiso de archivos
  habilitado por Julio: **12 assets Active en 6 grupos**, sólo los PNG autorizados. Antonio primero; referencia y
  primer cuadro exitosos, luego el resto en orden. Videos, recibos y metadatos fuera del repo; IDs y cupos en el ledger.
- Documentación técnica, funcional, manual y skills Codex/Claude sincronizadas: verificar Active por respuesta y
  GroupId, conservar evidencia sin secretos, evitar cargas/tareas duplicadas y separar Entry gratuito del consumo API.
  Sin compras, cambio de plan, credenciales ni promoción a Globe; factura de inferencia aún sin conciliar.

## 2026-10-17 — Brochures aprobados, sin recortes ni validaciones adicionales

- Ratificación expresa de Julio: [uso comercial íntegro](docs/operations/EFEONCE_APPROVED_BROCHURES_POLICY_V1.md).
- LEEME, canon, manual y skills Codex/Claude/radar dejan de imponer pendientes históricos. Una autorización
  de envío no autoriza modificar el material; la copia Aloja de 38 láminas no se reutiliza.

## 2026-10-16 — Landing HubSpot v2 por los 4 resultados, con dock móvil y agenda nativa

- Landing pública [`/servicios-contratar-hubspot/`](https://efeoncepro.com/servicios-contratar-hubspot/) (página
  `244079`) rediseñada: 14 widgets compilados del canvas, HubSpot presentado como Agentic Customer Platform, SEO con
  frase clave «partner hubspot» (Semrush CL/MX/CO), OG propia y Service + FAQPage.
- Dock móvil con «Agendar reunión» (CTA gobernado `hubspot-discovery-meeting`, scheduler nativo) e «Ir al formulario».
- Renderer CTA 1.3.1: la cabecera del scheduler ya no se parte en móvil (pendiente de release a producción).

## 2026-10-16 — Agencia de Medios: brochure canonizado y landing publicada

- Landing pública [`/servicios/agencia-de-medios/`](https://efeoncepro.com/servicios/agencia-de-medios/) (página
  `251981`, menú Soluciones → Crecimiento Multicanal): 16 widgets compilados del canvas, header/footer de Ohio, SEO con
  frase clave «agencia de medios» (Semrush), OG propia y formulario `efeonce-media-diagnostic` con destino HubSpot.
- Brochure «Agencia de Medios» (65 láminas, PDF `c4697c7a…`) con logotipos oficiales de terceros y sin promesa de
  rebates. Canon: [norma](docs/operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md) (deltas 2026-10-16),
  [PDR-025](docs/public-site/decisions/PDR-025-landing-agencia-de-medios-posicionamiento.md) y
  [material comercial de medios](docs/services/media-distribution/README.md).

## 2026-10-16 — GTM: drift vigilado en web y servidor

- `pnpm gtm:snapshot` versiona también el container servidor (sGTM/Meta CAPI) y tapa secretos con huella sha256;
  `gtm-drift.yml` compara a diario ambos containers live contra git y falla ante drift. El publish por script
  reescribe los snapshots. [ADR, delta 2026-10-16](docs/architecture/GREENHOUSE_MEASUREMENT_TAGGING_DEPLOYMENT_DECISION_V1.md).

## 2026-10-16 — Contacto: Nexa canónica, voz mexicana y medición Meta

- Hero de `/contacto/` con el rostro canónico de Nexa (inpaint Sunburst + anclas), voz «Escucha a Nexa» nueva
  (ElevenLabs Lucía es-MX, −16 LUFS), OG v3 en adjunto nuevo y cache-busting `?ver=filemtime` en hero/audio del widget.
- Política Meta + Google UPD publicada para `efeonce-contacto`; GA4 `generate_lead` verificado. Bible de Nexa: voz
  mexicana por decisión del operador. [Landing](.claude/skills/efeonce-public-site-wordpress/references/landings/contacto.md).

## 2026-10-16 — Brochure oficial «Agencia de Marketing 360°»

- Aprobado como brochure oficial de la agencia: versión completa (84 láminas) y corta (26), con índice linkeable,
  Channel & Commerce dentro de Brand y casos Berel y Sky compuestos con piezas reales. Registrado en la
  [norma](docs/operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md), la documentación funcional y el manual.

## 2026-10-16 — Seguimiento web y evidencia reutilizable

- [Fabricio / Toyota del Bajío](docs/commercial/follow-up-agent/runs/2026-10-16-fabricio-web-hubspot.md):
  envío inicial verificado y tres seguimientos HubSpot Programado con salida por respuesta a cualquier correo.
- Prospección y adapter HubSpot Codex/Claude precisan versión de brochure, cuerpo/calendario de inscripción,
  límites de firma y conciliación BCC_TO_CRM. Manual, funcional y registro actualizados; sin nuevas acciones externas.

## 2026-10-15 — SKY: cobertura de auditoría y skills SEO

- [Matriz de siete frentes abiertos](docs/services/sky-blog-seo/COBERTURA_Y_PENDIENTES_AUDITORIA_2026-10-15.md),
  informe, marco de cuenta y plan distinguen diagnóstico base entregado, auditoría integral parcial y lote preparado.
- Skills `sky-blog-seo`/`seo-aeo` espejadas y modelo de informes conservan cobertura/denominadores y baseline real;
  GSC anterior no disponible no bloquea profundizar. Actualización documental, sin cambios al sitio ni nuevas compras.

## 2026-10-15 — OmniHuman: contrato API y routing de producción

- [Manual](docs/manual-de-uso/creative-studio/omnihuman-2-api.md),
  [funcional](docs/documentation/creative-studio/omnihuman.md) y
  [auditoría](docs/audits/creative-studio/OMNIHUMAN_2_API_RESEARCH_2026-10-15.md) separan Vision AI de ModelArk,
  AK/SK de IAM Bearer, capacidad publicada de acceso efectivo y permisos de imagen/voz.
- Skills de imagen, motion, audio, derechos y flota canalizadas al contrato; sin activación, inferencia,
  implementación CLI o promoción Globe. API300s y ficha UI120s quedan registrados por superficie.

## 2026-10-15 — Convención comercial de nombres

- Adoptada la [convención de negocios y leads](docs/operations/EFEONCE_CRM_RECORD_NAMING_POLICY_V1.md)
  aprobada por Julio, con routing en skills Codex/Claude, captura CRM, licitaciones y prospección.
- Primera aplicación: Gana66065702426; renombrado con readback. Nuevas altas autorizadas usan la regla;
  histórico pendiente de lote. Sin schema, workflows, envíos ni migración masiva.

Medición14/10: todo develop publicado en main9690efad (PR255/orquestador38591329633), Server9 estricto y watchdog6/6/drift0. API/panel/CLI para agentes comparten políticas y comandos; alta nueva por datos recibida en Meta Test Events con nueve claves sin otro build/redeploy/GTM. Consentimiento y Forms→HubSpot Forms→CRM preservados; fixtures archivados. [Release y límites](docs/audits/releases/2026-10-14-scalable-measurement-agent-first-release.md); [auditoría integral docs/skills](docs/audits/measurement/MEASUREMENT_DOCUMENTATION_CLOSURE_2026-10-14.md). Tráfico comercial/EMQ y resto de TASK-2035 pendientes.

Footer 14/10: composición V2 publicada, «Explora», newsletter/empleo independientes y partners gris. [QA y reversión](docs/audits/public-site/2026-10-14-footer-composition-v2.md).

## 2026-10-13 — Meta CAPI y consentimiento publicados

- Diseño de consentimiento La órbita autorizado y adoptado mediante adapter de presentación sobre HubSpot;
  [rollout WP/Think](docs/audits/measurement/CONSENT_UI_ROLLOUT_2026-10-13.md). Categorías y persistencia nativas, sin cambios de matching.
- Rotación Vercel autorizada14/10: anterior revocada/403, nueva CLI/API200; fuentes locales0600, GitHub y wrappers corregidos. [Recibo](docs/audits/measurement/VERCEL_CREDENTIAL_ROTATION_2026-10-14.json); sin workflow/deploy de prueba.
- Auditoría documental 14/10 con tres subagentes: contrato/recibo, capa [funcional](docs/documentation/growth/medicion-gtm-ga4.md#cookies-y-preferencias-del-visitante), [manual operativo](docs/manual-de-uso/growth/operar-consentimiento-cookies-publico.md) y skills; límites de QA y pendiente de seguridad explícitos.

- [ADR](docs/architecture/GREENHOUSE_META_CAPI_SERVER_GTM_DECISION_V1.md),
  [contrato HubSpot](docs/reference/measurement-gtm-ga4/09-hubspot-consent.md) y
  [auditoría](docs/audits/measurement/META_CAPI_RECOVERY_2026-10-13.md): mismo GTM Server en
  `efeonce-group`, min 0/max 1; **server live6/web live5**, Meta v25 y forwarding GA4.
- Banner español opt-in/GPC y routing activos WP/Think. PageView por destino, default denied,
  URL limpia, UUID sender compatible, Lead accepted form/confirmed meeting; sin nuevo sender.
- Meta Test Events Processed/Server y diez negativos sin salidas; navegación real ambos hosts
  completó Meta/GA4. Lead QA accidental previo documentado y gate UUID corregido.
- 16 tests bridge y 30 renderer PASS; renderer con contexto released PR254. Think promovido y WP
  plugin scoped 1.0.3 con preferencias inline junto a enlaces legales, sin franja adicional. Próximos leads/replay reales pendientes.
  Recuperación previa documentada; matching posterior abajo. Sin nuevo proyecto/suscripción.
- [Matching](docs/audits/measurement/META_LEAD_MATCHING_2026-10-13.md) activado tras
  [release completo PR254](docs/audits/releases/2026-10-13-full-develop-matching-release.md):
  main d692ab51dc48, orquestador38483437158/manifest released, CI20.100 PASS y build/Deep/smoke.
  SQL aplicada, GTM6 retira legacyLead12/17, GA4 Client boundary preservada. Ops00775-fnh
  y GitHub vars Meta/Google/retención true; captura Vercel true + redeploy READY/alias.
- GA4 UPD/ack y siete audiencias90d, secretos pinned/identidad real resueltos dentro del worker;
  Test Events em/ph/fn/ln, negativos live y cola/leaseCAS/retención PASS. Watchdog ok6/6 drift0.
  Primera conversión comercial consentida post-flip sin observar; TASK-2034 parcial, sin datos
  sintéticos de negocio. Incidente mindicador separado sigue abierto, excepción auditada.

- Auditoría integral con tres subagentes: [inventario y cierre](docs/audits/measurement/MEASUREMENT_DOCUMENTATION_CLOSURE_2026-10-13.md), [runtime10](docs/reference/measurement-gtm-ga4/10-growth-lead-matching-runtime.md).
  ADR/Forms/Meetings/host/skills y referencias sincronizados; historial preservado. [Configuración escalable](docs/architecture/GREENHOUSE_GROWTH_MEASUREMENT_CONFIGURATION_PROPOSAL_V1.md) **propuesta sin GO, no implementada**. Commit documental, sin publicación/release adicional.

## 2026-10-13 — Radar comercial con registro por corrida

- Automatización existente convertida a tarea nueva diaria en greenhouse-eo, conservando 09:00 Santiago.
- [Contrato y ledger](docs/commercial/prospecting-agent/README.md): búsquedas saneadas en repo, datos privados separados,
  cinco líneas × cuatro mercados; nuevas convocatorias para postular dentro de la misma semana calendario.
- INTURSA y Alfin registradas bajo autorización; cuatro contactos verificados vía Apollo. Históricos tratados como
  prospección futura. No Deals, notas ni envíos nuevos. Próxima ejecución programada todavía no observada.

## 2026-10-13 — Prospección personalizada: Outlook y seguimiento HubSpot

- 15/10: [Socopur](docs/commercial/tenders/socopur-agencia-marketing-digital-2027/research/seguimiento-2026-10-15-INTERNO.md), seguimiento puntual autorizado a Katherine con firma gráfica/PDF y EMAIL `118603198768` SENT asociado. Dossier y registros conciliados; Prospecting/HubSpot Codex-Claude precisan decisión por historial de cuenta, aporte nuevo y verificación de reply/adjunto/CRM. Sin admisión, secuencia o nuevo permiso futuro.

- 14/10: Prospección Codex/Claude incorpora la [estructura de correo robusto aprobada por Julio](.codex/skills/efeonce-b2b-prospecting/references/message-and-contextual-proof.md#correo-comercial-robusto-de-julio): contexto, encaje, aportes, enfoque sectorial, forma de trabajo, brochure explicado e invitación; profundidad adaptable, firma por la vía pedida y permiso de envío separado.
- [Política y ruta gráfica](docs/operations/EFEONCE_OUTLOOK_AGENT_SEND_POLICY_V1.md): contexto individual,
  empatía, motivo para elegir Efeonce, brochure explicado y firma instalada en Outlook web; Enviados,
  adjuntos y EMAIL de HubSpot comprobados por separado. Criterio enlazado desde las skills espejo de HubSpot.
- [Registro de seis envíos](docs/commercial/follow-up-agent/runs/2026-10-13-outreach-personalizado.md),
  estado focalizado y continuidad de WIN actualizados; Rafael excluido y salvedad de Paula conservada.
  No renueva el corte global del pipeline ni concede autonomía recurrente de envío.
- Mandato posterior: [seis secuencias HubSpot, 18 seguimientos](docs/commercial/follow-up-agent/runs/2026-10-13-secuencia-hubspot.md)
  para 16/22/29 octubre en horas locales laborales. Inscripciones `Programado`, firma global Julio y
  parada por respuesta verificados. Apollo inactivo, cero inscritos. Preferencia y alcance documentados.
- [Módulo de secuencias en Prospecting](.codex/skills/efeonce-b2b-prospecting/references/hubspot-follow-up-sequences.md),
  routing, cadencia/mensaje/respuesta/entregabilidad, template, manual y adapter HubSpot espejados.
  Fixtures v9 P51–P55 cubren plataforma, autorización, programación, personalización y evidencia; sin nueva ejecución externa.
- [Política de seguimiento a largo plazo](docs/operations/EFEONCE_LONG_TERM_PROSPECT_FOLLOWUP_POLICY_V1.md) aprobada: proveedor vigente, revisión interna a seis meses sin hito, nutrición con permiso y reactivación autorizada. Skills espejo/fixtures v11 y seguimiento existentes actualizados; tareas comerciales en HubSpot por corrección de Julio. Fabrimetal: TASK 118419088700 para 13/04/2027 09:00 Chile, duplicado Notion Cancelado y nota CRM conciliada, sin envío.

## 2026-10-12 — Propuesta de campaña creativa: playbook y skills

- [Playbook de punta a punta](docs/operations/proposals/CREATIVE_CAMPAIGN_PROPOSAL_PLAYBOOK_V1.md) (caso fuente Sika N.º 1164): cinco piezas, secuencia,
  reglas del operador por pieza, trampas medidas y lista de control. Fila nueva en el router de `CLAUDE.md` y `AGENTS.md`.
- La oferta económica que ve el comprador va con la [plantilla A4](docs/commercial/templates/cotizacion-a4/README.md), desglosada por componente de valor
  (evolución gráfica → concepto → entregables); `economica:build` (Excel) sólo si las bases exigen planilla. Skills de licitaciones, práctica creativa y pricing actualizadas.
- `deck-studio`: referencia nueva de propuesta técnica de campaña creativa (segunda persona, nada defensivo, cumplimiento con las palabras de la ficha).
- `motion-design-studio` y `audio-studio`: workflow del reel de muestra (cuadros fijos → Seedance 2.5 → capa de motion de la campaña → montaje) y sus modos de falla.
- `efeonce-graphic-line`, `astro` y `docs/think`: página suelta de video de muestra con el reproductor de AXIS.

## 2026-10-12 — BytePlus: conexión directa de imagen, capas, video y Seed Speech

- [CLI y manual](docs/manual-de-uso/creative-studio/byteplus-directo.md): catálogo de 21 entradas, secretos
  separados en Secret Manager, recibos sin URLs firmadas y recuperación por task ID sin retry de generación.
- Layerize Pro/Flash conserva el contrato de capas/máscaras; BytePlus es default para los modelos del fabricante
  en las guías del operador. [ADR](docs/architecture/creative-studio/EFEONCE_BYTEPLUS_DIRECT_MEDIA_CLI_DECISION_V1.md)
  y [canary real](docs/audits/creative-studio/BYTEPLUS_DIRECT_CONNECTION_2026-10-12.md). Sin promoción de Globe,
  deploy ni compra/clonación de voces.
- [Precios API Seedance 2.5](docs/audits/creative-studio/BYTEPLUS_DIRECT_PRICING_COMPARISON_2026-10-12.md):
  30 s 1080p, BytePlus US$17,06 frente a Fal/Higgsfield base US$34,12; descuento final HF sin confirmar.
- [Nexa cine, Pro directo vs Sunburst max](docs/audits/ai-tooling/2026-10-12-nexa-seedream5-pro-vs-sunburst.md):
  una salida nativa por motor, mismos brief/referencias; Pro útil para variantes, Sunburst más fiel a la acción.
  Espera HTTP de imágenes BytePlus 600 s, sin retry; primer timeout con consumo sin confirmar. Sin publicación.
- [Cuatro iconos Flare max/Pro standard](docs/audits/ai-tooling/2026-10-12-iconos-flare-vs-seedream5-pro.md):
  ocho PNG nativos 2048², mismos prompts; Flare conserva mejor mate/detalle, Pro US$0,081 por icono con
  material a revisar. Comparación interna, fondo opaco; sin adopción de glifos ni cambio de UI.
  Segunda tanda clay 3D: ambos mantienen mate, Pro modelado más artesanal y Flare formas más regulares;
  ocho originales nuevos, prompts/recibos/costos guardados sin sustituir los anteriores.
- [Iconos nuevos Efeonce mate uniforme](docs/audits/ai-tooling/2026-10-12-efeonce-iconos-mate-uniforme.md):
  binoculares, metrónomo, sello e imán, bases planas aprobadas; prueba Flare/Pro con originales y alfa derivado.
  Ajuste adicional Pro y avisos geométricos documentados. Operador seleccionó Flare para esta ronda;
  comparación preservada, sin publicación del catálogo ni cambio del default global.

## 2026-10-12 — Medios: composición integral y operación programática acompañada

- [Modelo de línea §1.1](docs/business-models/media-distribution/MEDIA_DISTRIBUTION_BUSINESS_MODEL_V1.md#11-oferta-integral-como-agencia-de-medios):
  estrategia, compra/operación, creatividad, medición y gestión de inversión bajo Efeonce; taxonomía/estados conservados.
- Modelo programático V1.5 y pricing V1.4: ruta DSP directa acompañada en evaluación, RACI/gate, calibración y fee
  incremental en cuenta integral; tarifa aprobada sin cambio, medios/externos separados y sin doble cobro.
- [Evidencia HubSpot 12-10](docs/audits/commercial/BASIS_DISCOVERY_AND_MEDIA_OFFER_2026-10-12.md): transcripción completa,
  demo 21-10 registrada; ejemplos de fees no son cotización ni crédito. Catálogos, ADR/índices, manual/contexto y
  skills Codex/Claude sincronizados. Sólo documentación: sin contrato, compra, integración, envío o publicación.

## 2026-10-12 — Insights: el informe SEO puede medir sólo el contenido que Efeonce trabaja

- Nuevo en `greenhouse_growth`: `seo_content_scope_versions`, el alcance de contenido de una organización (reglas de
  ruta, versiones append-only). Aplicada a la base compartida. Berel tiene su alcance v1: `/articulos`, `/tutoriales`,
  `/inspiracion` y dos guías de la raíz.
- Comando nuevo `pnpm seo:content-scope`: muestra lo que un alcance mediría y las páginas que deja fuera; con
  `--apply` lo fija.
- Con alcance, el capítulo de búsqueda de Efeonce Insights mide sólo esas páginas, lo dice en la portada blanca, deja
  el sitio completo como contexto y saca el tráfico estimado del dominio a los límites. Sin alcance, el informe no
  cambia.
- Cambian para toda organización: la línea de clics por semana dibuja sólo semanas completas (los últimos días del
  mes ya no aparecen como una caída) y tres textos de Analytics pierden «al sitio» («Visitas orgánicas», «Visitas
  desde buscadores», «Visitas orgánicas, con y sin interacción»).
- Una página con un nombre más largo que la columna del informe ya no hace fallar el render: se abrevia por el
  comienzo y el final de su ruta.
- Berel: logos oficiales cargados en la organización (el anterior era una imagen generada con IA) y portada fijada en
  blanca. `scripts/insights/preview-edition.ts` acepta `--cover=light|dark`.
- **Desplegado** en Vercel staging y en el `ops-worker` (`d9a1c6a2d`). **Vercel Production sin release**: las
  ediciones creadas desde el portal de producción siguen midiendo el sitio completo de Berel (`TASK-2033`).

## 2026-10-12 — Cotizador V3: el registro de cotizaciones existe en la base

- Nuevo en `greenhouse_commercial`: las tablas `quoter_*` (catálogo por huella, puntero de versiones vigentes,
  cotizaciones con versiones inmutables, estados, destinataria, número y excepciones bajo el piso). Aplicadas a la
  base compartida; el catálogo del repo quedó importado (24 documentos) y su puntero reflejado. Ninguna API ni
  pantalla las usa todavía (`TASK-2026`, `TASK-2027`).
- Comando nuevo `pnpm quoter:import plan | documents | pointer`: hay que correrlo cada vez que el catálogo del repo
  cambie. Carril de pruebas nuevo `pnpm quoter:test:local` (PostgreSQL 16 local).
- Seis capacidades nuevas `commercial.quoter.*`. La primera cotización real emitida será `EO-QTE-15001`.
- [Modelo de datos](docs/architecture/GREENHOUSE_QUOTER_V3_DATA_MODEL_V1.md) ·
  [manual del importador](docs/manual-de-uso/finance/importar-catalogo-v3-a-la-plataforma.md). `TASK-2025`.

## 2026-10-12 — Growth: el regrade AEO respeta el contrato y la captura de rankings tiene segunda pasada

- El regrade recurrente fallaba todos los días desde el 3 de octubre con los 6 mercados secundarios de Sky: tenían
  cadencia prendida y el contrato no los declaraba. Ahora un solo predicado decide la cobertura para quien ejecuta,
  quien reclama y quien habilita; `assignAeoTier` acepta `marketsIncluded` y existe `pnpm growth:aeo-contracted-markets`.
  Sky quedó con AR, BR, CL, CO, PE, US y UY declarados (confirmación del operador). [ISSUE-181](docs/issues/open/ISSUE-181-aeo-regrade-claims-markets-outside-contract.md)
- La captura diaria de rankings perdía keywords cuando DataForSEO tardaba más de 35 s y el resumen decía
  `degraded=0 failed=0`. Se agrega la segunda pasada `ops-seo-rank-capture-retry` a las 07:00 (cuesta cero con el día
  completo) y el log avisa los parciales. Rige tras el próximo deploy del `ops-worker`. [ISSUE-182](docs/issues/open/ISSUE-182-seo-rank-capture-partial-days-silent.md)

## 2026-10-12 — AXIS: lo que depende de `axis-brand-assets` 0.4.25 queda regenerado

- El pin subió de 0.4.15 a 0.4.25 el 2026-10-06 sin regenerar sus dependientes y `pnpm test` mostraba tres fallas.
  Ahora los tokens de Manzanitas registran la versión instalada, el vocabulario de canales de Insights tiene las 22
  plataformas de AXIS (se suman Facebook, Threads y X, con su isotipo en el PDF, el deck y Think) y los cuatro lockups
  del PDF del AI Visibility Report llevan el dibujo vigente, con la terminación concéntrica del anillo.
- En las tablas del PDF y del deck, una fuente citada de facebook.com muestra el isotipo de Facebook en vez del de
  Meta, y los dominios de Threads y X también tienen el suyo. Rige para lo que se renderice después del próximo
  release. El informe web no cambia: no recibe canal por dominio citado.

## 2026-10-12 — HubSpot: los segmentos de industria leen la empresa, y Bancos queda dentro de Finanzas

- El operador vio que los contactos del segmento de bancos casi no aparecían en el de finanzas. El de bancos
  (188) enumeraba 14 empresas por ID y el de finanzas (153) leía una industria llenada a mano en cada contacto:
  sólo 9 de 28 coincidían. Ahora los segmentos de contactos 151–155 leen la industria de la empresa principal
  y 188 se define como banca en Chile. Trece empresas corregidas; membresía real igual a la simulada en los
  seis segmentos. 188 pasa de 28 a 26: Consorcio sale por estar clasificada como seguros, pendiente de decisión.
  Con la misma regla se creó Seguros Chile (195), contenido en Finanzas, tras prospectar BICE Vida.
- La skill de prospección suma el módulo `segments-by-attribute` y el escenario P50; el adaptador de HubSpot,
  la regla vigente y el lector de membresía que funciona con OAuth de usuario.
  [Decisión](docs/architecture/GREENHOUSE_HUBSPOT_PROSPECT_PROPERTY_SEGMENTATION_DECISION_V1.md) ·
  [snapshot](docs/operations/HUBSPOT_INDUSTRY_SEGMENTS_2026-10-12.json).

## 2026-10-12 — Cotizador V3: la CLI lee y escribe a través de un puerto de almacenamiento

- `TASK-2024` (fase 1 de `EPIC-053`): fuentes, puntero y artefactos de `pnpm pricing:v3` pasan por
  `PricingV3Storage`, con un adaptador de archivos (el modo local de siempre) y uno en memoria. Ninguna salida,
  código de salida, error ni archivo de la CLI cambió: lo prueba una línea base de 107 comandos capturada antes
  del cambio. Quien cambie a propósito lo que un comando responde debe volver a capturarla y revisar el diff.
  `pnpm pricing:v3:test` suma esa línea base, una batería de conformidad sobre los 48 artefactos congelados y una
  guarda de imports del motor. [Contrato](docs/architecture/GREENHOUSE_PRICING_V3_STORAGE_PORT_V1.md).

## 2026-10-12 — Prospección B2B: respuesta proporcional tras un diferencial ciego bajo Claude

- Diez escenarios con y sin la skill, calificados a ciegas: la skill evita el alta de contactos sin correo,
  pero respondía 74 % más largo. Se agrega proporcionalidad al método, veinte decisiones que cierran
  ambigüedades (D2 y D6 aprobadas por el operador; D3 modificada: registrar contactos cubre crear la Company
  verificada), módulo de sesión Claude y evals v7 con 49 escenarios. En HubSpot: fecha de investigación =
  verificación, encaje de adyacentes por función propia y Lead sólo tras interacción real; apagada en el
  portal la automatización que creaba un Lead por cada contacto en etapa `Lead` (2.222 de 2.251). Tras corregir: 20 de 20 sin fallos críticos y ruido de 1,55 a 0,60.
  [Evidencia y límites](docs/audits/commercial/2026-10-12-prospecting-claude-blind-differential.md).
  Sin runtime, créditos, CRM ni envíos.

## 2026-10-12 — SEO/AEO: referencia de categoría y representación fiel

- [Método de categoría](docs/operations/SEO_AEO_CATEGORY_LEADERSHIP_OPERATING_MODEL_V1.md) aceptado:
  descubrimiento non-brand, representación y consideración con pruebas, sin garantizar liderazgo.
  ADR/index, manual/plan, contexto, modelo SV360 y cuatro skills Codex/Claude alineados; oferta, prueba,
  briefs y revisión distinguen entregas controlables, resultados observados y negocio. Se corrigen
  promesas históricas de citación/recovery paid. [Cierre](docs/audits/seo/2026-10-12-category-leadership-docs-skills.md).
  Sin cambios de runtime, scoring, precios o publicación.

## 2026-10-11 — Cotizador V3: factores por país

- Prospección: cinco recorridos operativos aprobados (señal→acción, entrada por situación, cadencia coordinada, respuestas y entregabilidad) con plantillas, Commercial, espejos y escenarios v5. [Verificación](docs/audits/commercial/2026-10-11-prospecting-routes-deliverability-update.md). Sin acciones externas ni cambio de permisos.

- [Inventario HubSpot](docs/audits/commercial/hubspot-properties-2026-10-11/README.md): 1.126 definiciones activas completas, CSV/JSON y guía por fase de Contact/Company/Deal/Lead, revisados por tres subagentes. Routing HubSpot/Prospecting/Commercial y contexto histórico conciliados; requiredness UI/etapa y Lead write siguen sin certificar. Sólo documentación y lectura de portal.
  Skill actualizada por aprobación posterior: familias de campos y plan por objeto/fase con completar/conservar/pendiente/sistema, evidencia y requisitos por carril; plantillas de handoff/changeset Codex/Claude incorporan el plan. Sin nuevas escrituras CRM.

- Prospección: adapter operativo HubSpot (Agent CLI/API por capability, roles globales vs iniciativa, cambios mínimos/readback), capacity/costo, discovery/proof y aprendizaje por iniciativa. Plantillas/mirrors y routing Commercial/HubSpot sincronizados; fixtures ampliados a 30 conservando los anteriores. [Verificación](docs/audits/commercial/2026-10-11-prospecting-operational-modules-update.md). Método aprobado, sin software nuevo, acciones SaaS o automatizaciones.

- ABM/ABS incorporado a prospección: módulo por demanda, coordinación Digital Marketing/Commercial, inversión por cuenta y mapas por iniciativa, consenso, costo total y medición; plantillas/espejos y escenarios ampliados a 26. [Verificación](docs/audits/commercial/2026-10-11-abm-abs-skill-update.md). Método aprobado; piloto, gastos, CRM y envío conservan su propia autoridad.

- [Prospección B2B](.codex/skills/efeonce-b2b-prospecting/SKILL.md): núcleo Codex/Claude compartido, módulos por recorrido, plantillas y evaluación offline; companion Commercial Codex, routing y adapter personal compatibles con HSP/radar. Sales opcional por fase. Buying group: base de 2–3 adicionales ampliable por roles/riesgos y suficiencia por fase; personas únicas y funciones separadas, sin comité completo antes del primer acercamiento. [Actualización](docs/audits/commercial/2026-10-11-buying-group-skill-update.md). [Decisión](docs/architecture/EFEONCE_B2B_PROSPECTING_SKILL_DECISION_V1.md); sin nuevas automatizaciones, CRM, créditos o envíos.

- Prospección B2B: investigar al objetivo y buscar inicialmente 2–3 adicionales relevantes con datos accionables, ampliando por funciones críticas de la oportunidad/fase; no crear Contact/Lead sin correo corporativo individual verificado. Sin correo del objetivo, preservar su señal en investigación o nota de empresa y continuar por personas adyacentes. Brechas y relaciones hipotéticas se declaran; la regla no cambia registros históricos, filtros ni autorizaciones de envío. [Decisión](docs/architecture/GREENHOUSE_HUBSPOT_PROSPECT_PROPERTY_SEGMENTATION_DECISION_V1.md#delta-2026-10-11--contactos-accionables-y-cobertura-de-la-cuenta-b2b), manual, modelo funcional y skills Codex/Claude sincronizados.

- Cotizador: se documentó la auditoría del cotizador actual del portal (dominio, base de datos e interfaz) y se aprobó el plan para llevar el cotizador V3 a la plataforma, en el orden API, CLI sobre la API, MCP e interfaz, con su decisión de arquitectura, una épica y ocho tareas. Es documentación: ningún comportamiento cambió.
- Cotizador V3 local, tras una segunda prueba a ciegas: un precio mensual todo incluido se acuerda por periodo y el documento lo imprime así, la evidencia de cada asignación de herramienta se declara, la revisión de una cotización agrupa los pendientes por mes y entrega el total bajo el piso, el esqueleto sólo propone precios utilizables y el documento admite una persona de contacto. La skill y el manual quedaron con una sola regla por tema y un caso más (persona continua a precio mensual).
- Cotizador V3 local, tras tres negocios reales más: un precio por todo el trabajo (`agreed_total`) con IVA exacto, la forma de venta de cada oferta como dato del catálogo (v11), evidencia de la dedicación en la cotización congelada, revisión contra el piso de la propia oferta, diagnósticos con su causa y un documento que imprime precio de programa o proyecto y cuotas con IVA. La skill y el manual se reescribieron como procedimiento por tipo de negocio.
- Cotizador V3 local, tras el primer caso real: los asientos de una herramienta se declaran como se compran (varios planes en un mes, asiento ocioso, asiento compartido), los meses iguales se declaran una vez (`periodIds`), el documento imprime opcionales con precio desde sus propias cotizaciones y líneas bonificadas con valor de referencia, y `--out` sólo guarda una cotización calculada; un opcional que amplía la cotización principal se calcula como incremento (`compose increment`). La plantilla A4 suma el bloque de opcionales y la línea de cortesía, y mantiene los totales junto a su tabla. Las cotizaciones congeladas no cambian.
- Cotizador V3 local: `compose document` produce el documento de cotización para el cliente con la [plantilla A4](docs/commercial/templates/cotizacion-a4/README.md) desde una cotización congelada; las cifras salen sólo de la cotización. La plantilla suma una versión 2 con varias líneas con precio, paginación de la sección de precios, IVA declarado, calendario de pagos y costos pagados directo por el cliente; la versión 1 queda idéntica. El documento es un borrador, no una cotización emitida.
- Cotizador V3 local, contrato 1.4.0: una cotización puede llevar costos de terceros refacturados (productora, talento, imprenta, pauta, licencias), cada uno en su propia fila con la regla de precio de su categoría, y una reserva de contingencia para trabajo de alcance fijo que entra como costo. El resumen muestra el margen del trabajo propio junto al total, y la vista del cliente lista cada costo de terceros aparte y, fuera de todo total, lo que el cliente paga directo. Los factores por país quedan como valores de política confirmados. [Manual](docs/manual-de-uso/finance/operar-cotizador-v3-con-agentes.md) · [decisión](docs/architecture/GREENHOUSE_PRICING_V3_ENGINE_1_1_COMMERCIAL_ADJUSTMENTS_DECISION_V1.md).
- [Prospección bancaria](docs/commercial/prospects/bancos-chile-2026-10/README.md): ACTIVE 188 con 28 personas de 14 bancos, por fecha de investigación, correo y empresa principal. Membresía completa sin faltantes/extras; propiedades y calidad de canal documentadas, manual y skills Codex/Claude sincronizados. Sin outreach ni cambios de esquema.

- Cotizador V3 local: la forma del compromiso es un dato propio de la cotización (On-Going u On-Demand, con 10 % más de precio y el mismo piso), la puesta en marcha se costea (incorporación por persona y reclutamiento opcional) y las herramientas declaran cuánto tiempo hay que seguir pagando una licencia y cuándo renueva su contrato. Adobe, Microsoft 365 y Notion quedan según sus facturas; Adobe se cotiza sin su descuento. Cuatro lecturas nuevas de una cotización ya calculada: persona y kit de herramientas, calendario de cobro, caja del encargo y compromisos con proveedores. [Manual](docs/manual-de-uso/finance/operar-cotizador-v3-con-agentes.md) · [decisión del contrato 1.3.0](docs/architecture/GREENHOUSE_PRICING_V3_ENGINE_1_1_COMMERCIAL_ADJUSTMENTS_DECISION_V1.md).
- Cotizador V3 local, catálogo v7: la venta de una persona por dedicación (staff augmentation) pasa del recargo histórico sin piso a margen objetivo por nivel (30 %, 35 % o 40 %) con piso de 25 %, decididos por el CEO. El cotizador marca la línea que queda bajo ese piso. El piso de 45 % de los servicios gestionados no cambia. [Decisión](docs/architecture/GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md).
- Cotizador V3 local: un puntero (`data/pricing/v3-operating/current.json`) nombra el catálogo, la política y el catálogo de créditos vigentes, y `--current` los carga verificados; los comandos dejan de nombrar versiones a mano. El precio unitario de una herramienta deja de vencer y lleva una fecha de revisión que avisa sin bloquear (policy v6). El resumen informa avisos de la corrida (`runNotices`) y qué datos estimados concentran el costo (`estimateExposure`). El costo de personas queda declarado como costo objetivo, no nómina. Documentación, manuales y skills actualizados. [Manual](docs/manual-de-uso/finance/operar-cotizador-v3-con-agentes.md) · [decisión del puntero](docs/architecture/GREENHOUSE_PRICING_V3_CATALOG_MAINTENANCE_DECISION_V1.md).
- Cotizador V3 local, motor 1.2: el país del cliente ajusta el precio de la parte humana y el país de la persona ajusta el costo; en los mercados con factor menor que 1 el piso de margen se lee sobre el precio del mercado base, y el margen real se informa siempre. Catálogo v5 con los sueldos del Excel declarados como referencia de Chile, factores de talento y de mercado, y España como país. Los contratos anteriores no cambian. [Decisión](docs/architecture/GREENHOUSE_PRICING_V3_ENGINE_1_1_COMMERCIAL_ADJUSTMENTS_DECISION_V1.md).

## 2026-10-10 — Brochure de servicios web y Product Design 360 aprobados

- Cotizador V3 local, motor 1.1: el precio pactado se declara directo y el motor calcula el descuento o el recargo; los precios se redondean hacia arriba por moneda según el catálogo, sin dejar una línea bajo su piso por redondeo. El contrato anterior no cambia y cada cotización guardada se sigue verificando con el motor que la firmó. Catálogo v4 con redondeo, tipos de cambio de cotización y sueldos confirmados. [Decisión](docs/architecture/GREENHOUSE_PRICING_V3_ENGINE_1_1_COMMERCIAL_ADJUSTMENTS_DECISION_V1.md).

- Cotizador V3 local: la CLI reporta cada rechazo con su código desde un registro cerrado (`src/lib/finance/pricing-v3/errors.ts`), `compose prepare|quote` y `replay` imprimen un resumen derivado en vez del resultado completo, y `assess` informa las líneas que el motor marcó bajo el piso de su política. Sin cambios en kernel, códigos de salida ni artefactos congelados. [Delta del ADR](docs/architecture/GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md). El precio acordado de SKY social care queda registrado como [excepción al piso de 45 %](docs/commercial/prospects/sky-social-care-2027/pricing/EXCEPCION-PISO-2026-10-10.md).

- Brochure [«Marketing de Contenidos»](ai-generations/2026-10-09_deck-contenidos/deck/LEEME.md) (línea Brand, 57 láminas + ruta corta de 21) aprobado y canonizado: fuente del canvas, PDF rasterizado, patrón «franjas de foto» y láminas a mano registradas en la [norma §4.6](docs/operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md); deltas 2026-10-10 en los modelos de [Social Media](docs/business-models/creative-services/EFEONCE_SOCIAL_MEDIA_BUSINESS_MODEL_V1.md) y [Media & Distribution](docs/business-models/media-distribution/MEDIA_DISTRIBUTION_BUSINESS_MODEL_V1.md), con las diferencias entre el deck y el modelo como decisiones abiertas.

- [Product Design 360](docs/architecture/EFEONCE_PRODUCT_DESIGN_360_DECISION_V1.md): aprobada entera por el operador; ADR `Accepted`, [modelo](docs/business-models/product-design-360/PRODUCT_DESIGN_360_BUSINESS_MODEL_V1.md) `Approved`, Wave con seis familias en portfolio, catálogo de servicios, context pack e índice de decisiones; G1–G6 pasan a validación posterior. Sin precios nuevos.

- Brochure [«Servicios web y digitales»](ai-generations/2026-10-09_deck-web-nexa-spark/deck/LEEME.md) (línea Engine, 29 láminas) aprobado y canonizado: fuente del canvas, PDF rasterizado y render; `deck-studio`, [manual](docs/manual-de-uso/creative/componer-deck-con-recetas.md), doc funcional, norma §4.6 y [collateral de Wave](docs/services/wave/README.md). Pendientes de contenido antes de enviarlo a prospectos.

## 2026-10-09 — Capacidad CRM regional y Talent Assurance aprobados

- [Publicidad programática aprobada](docs/architecture/EFEONCE_PROGRAMMATIC_DUAL_PROVIDER_DECISION_V1.md): modelo V1.4, pricing V1.3, ficha y manual con tarifario USD y cobro estándar; setup único, fee fijo, externos al costo, margen mínimo/objetivo 45%/55%, honorarios a 30 días y liquidación a 15. Catálogo/registry y evidencia sincronizados. PDF previo desactualizado; contratación externa y costos observados por campaña. Sin integración/runtime ni facturas/cotizaciones emitidas.

- Cotizador V3: tres subagentes consolidaron arquitectura, modelos, manuales, contratos y skills Codex/Claude contra el código; routers e índices llevan a la [superficie completa](docs/documentation/finance/cotizador-v3-superficie-implementada.md). [Cobertura y cierre](docs/audits/commercial/2026-10-09-pricing-v3-docs-skills-consolidation.md); simulación local, datos económicos y promoción canónica conservan su revisión pendiente.

- [Pibank](docs/commercial/prospects/banco-pichincha-peru-seo-2026/README.md): propuesta técnica v13 (49 láminas) y cotización USD/PEN enviadas a Jesús Vargas Serpa; compromiso inicial de seis meses y renovación trimestral sobre el plan anual de US$79.200; deal en Presentación de soluciones. [Deck v13](docs/commercial/prospects/banco-pichincha-peru-seo-2026/reconstruccion-2027/deck-propuesta/README.md), [región de filtros SVG](docs/architecture/GREENHOUSE_BRAND_SURFACE_COMPOSITION_V1.md) en `method-surround-cycle` y [manual: `content-stack` y empalme](docs/manual-de-uso/creative/componer-deck-con-recetas.md).

- Pricing V3: [operación para agentes](docs/manual-de-uso/finance/operar-cotizador-v3-con-agentes.md),32perfiles, herramientas por trabajo, reparto reconciliado, costosAdobe/Notion con fuentes, mantenimiento con impacto, evaluación y preview redactado. TASK-2022 completa local;213 testsV2/V3 y26operacionesCLI verificados; economíaTASK-2017 parcial e integración canónica pendiente.

- Pricing V3: [composición por demanda](docs/manual-de-uso/finance/componer-cotizacion-v3-con-herramientas.md), base/roles/tareas, seats/pools y créditos integrados al quote; explain/replay congelados, tres casos y revisión obligatoria. TASK-2021 local; sin inventario live ni tarifa comercial aprobada.

- Pricing V3: [presupuesto IA por CLI](docs/manual-de-uso/finance/presupuestar-creditos-ia-v3.md), suscripción y paquetes extra discretos, caja/remanente/vencimiento; TASK-2020 local, sin compra ni binding automático a quotes.

- Pricing V3: [licencias/plataforma declaradas](data/pricing/v3-pilot/economics/resource-inputs/README.md) registradas con créditos, moneda, renovación Adobe y propuesta de reparto; asignaciones/normalización pendientes, sin cambiar catálogo histórico ni quotes.

- Pricing V3: [policy/provisiones propuestas](docs/business-models/EFEONCE_CAPACITY_PRICING_INTEGRITY_PACK_V1.md), seis sensibilidades CLI y fuentes oficiales; TASK-2017 parcial.

- Pricing V3: [selección y mantenimiento local](docs/manual-de-uso/finance/catalogo-v3-seleccion-y-actualizacion.md), 32 perfiles históricos, kits, calendario, desglose y versiones con preview/apply. TASK-2019; tarifas vigentes y promoción runtime pendientes.

- [Pricing V3 local](docs/manual-de-uso/finance/cotizar-v3-por-cli.md): núcleo decimal separado, CLI, snapshots/replay y borrador redactado. 49 pruebas V3 y 23 históricas; tipos/lint focal verdes. [Ficha Colombia→Chile](docs/documentation/finance/cotizador-v3-piloto-colombia-chile.md) preparada: diseñador senior 50%, ledger/readiness y cinco simulaciones históricas y [equipo Pibank Perú/Chile](docs/documentation/finance/cotizador-v3-prueba-pibank.md) con costo reconciliado y margen 40% de prueba; revisión y export bloqueado; costos/políticas pendientes; sin integración canónica o tarifas aprobadas. [Evidencia](docs/audits/commercial/2026-10-09-pricing-v3-local-prototype.md).

- [CLI de pricing](docs/manual-de-uso/finance/consultar-excel-pricing-por-cli.md): Excel extraído con hash/celdas/fórmulas; búsqueda, auditoría, costos declarados, equipos y comparación de márgenes sin UI/DB. Escenarios hipotéticos; Excel/seeds y motor vigente intactos.

- [Dirección regional aceptada](docs/architecture/EFEONCE_REGIONAL_CRM_CAPACITY_SERVICE_DECISION_V1.md), [servicio](docs/services/revenue-operations-crm/CRM_SPECIALIST_CAPACITY_SERVICE_V1.md), modelo y activación documentados: modalidades, buying group, economics, formación, continuidad y matriz contractual. Talent Assurance, arquitectura objetivo y guardrails pasan a aceptados por aprobación del operador; policy e implementación pendientes. Índices, task/epic, documentación funcional/manual y skills espejo conciliados. Sin nuevo runtime, precios, contratos ni envíos.

## 2026-10-08 — Cotizaciones documentales multimoneda y entrega Pibank

- [Plantilla A4](docs/commercial/templates/cotizacion-a4/MULTIMONEDA.md): presentación ISO, precisión decimal, FX explícito con fecha/fuente y tratamiento fiscal independiente. [Cotización Pibank](docs/commercial/prospects/banco-pichincha-peru-seo-2026/reconstruccion-2027/cotizacion-detallada-2026-10-08/README.md): USD/PEN de 19 páginas y archivos en raíz de carpeta comercial, con copia por hash y procedencia registrada. Tres subagentes actualizaron docs/skills y auditaron aislamiento; sin cambios al cotizador Greenhouse, envío o CRM.

## 2026-10-08 — Seguimiento comercial recurrente

- [Outreach manual](docs/commercial/follow-up-agent/runs/2026-10-08-outreach-manual.md): tres correos conciliados en Outlook, tres notas HubSpot en seis contactos, tareas Notion reutilizadas/creada con borradores y cadencia finita. Skills Codex/Claude documentan evidencia, hilo único y avance por envío real. Sin secuencias ni emails enviados por el agente.

- [Plantilla documental A4 para licitaciones](docs/commercial/templates/cotizacion-a4/README.md): HTML aprobado con slots/JSON, cálculo CLP de neto/IVA/total y PDF de cuatro páginas. Subagentes actualizaron docs y cinco pares de skills; routers distinguen preparación rápida de oferta y cotizador Greenhouse con registros/aprobación propios. Sin cambios runtime; paquete UTEM intacto.

- [Política aceptada](docs/operations/EFEONCE_OUTLOOK_AGENT_SEND_POLICY_V1.md): firma oficial completa + CCO `48713323@bcc.hubspot.com` en nuevos correos, respuestas y reenvíos autorizados; conector con firma en texto u Outlook UI con firma gráfica, ambas aprobadas. Prueba por conector verificada en Enviados; registro CRM sin verificar. Routers, manuales y skills sincronizados.

- [UTEM presentada](docs/commercial/tenders/utem-seo-aeo-2026/PRESENTACION-2026-10-08.md): Julio confirmó envío en Mercado Público; programa de tres meses por CLP4,8M netos /5,712M total. HubSpot Presentación de soluciones e importe neto verificados dos veces; Notion Enviada. Expediente, registros y skills Codex/Claude sincronizados. Costos/capacidad/panel y fuente Sky siguen como verificaciones internas pendientes; seguimiento de evaluación/resultado.

- [Consolidación comercial y skills](docs/audits/commercial/2026-10-08-licitaciones-crm-continuidad-docs-skills.md): revisión LicitaLAB amplia, altas Diego/Emily y segmentos con evidencia; UTEM con originales/anexos firmados y datos corporativos confirmados. Tres subagentes sincronizaron documentos, seguimiento y 11 pares de skills. Manuales corrigen contacto previo, firma autorizada, leads y reutilización. Sin nuevos envíos ni postulación.

- [Contrato y registro](docs/commercial/follow-up-agent/README.md): heartbeat Codex activo L–V 09:00/16:00 Chile, revisión de 251 registros y 41 abiertos, proyecto comercial con 23 tareas y tres borradores de texto en Notion. ADR de autonomía acotada; sin cambios CRM ni envíos. Outlook devolvió 403 al guardar borrador; primera corrida programada aún no observada.

## 2026-10-07 — Prospecting Agent: voz de Julio y enlace de reunión

- [Manual](docs/manual-de-uso/hubspot/ajustar-voz-prospecting-agent.md), ADR, snapshot exacto y skills Codex/Claude: contexto, una capacidad, invitación con agenda y alternativa de respuesta; guardar/aprobar/readback. Configuración de 7.969 caracteres verificada en HubSpot: añade enlace institucional en la primera mención de Efeonce y conserva agenda; QA del último borrador pendiente, sin envío.

## 2026-10-07 — Firma Efeonce en HubSpot: instalación por HTML

- [Manual](docs/manual-de-uso/creative/usar-linea-grafica-efeonce.md#instalar-la-firma-en-hubspot) y skills HubSpot/línea gráfica (Codex y Claude): recuperar HTML aprobado, comprobar imágenes y pegar código fuente en HTML; fallo observado del pegado en Simple. Firma de Julio guardada y preview verificada; recepción no probada.

## 2026-10-07 — Rooms y AXIS: experiencias y reproductor compartido

- Studio: Fachada común para reproducción, galerías inertes y visor de grupos; worker existente suma timeline WebVTT/sprite. Paquete publicado, tests/build y QA local; Studio main `da2a02a`, migración y CORS verificados en staging/producción. [Decisión](docs/architecture/marketing-studio/EFEONCE_STUDIO_AXIS_VIDEO_DECISION_V1.md). Rollout completo: web/worker, backfill 7/7 y reproducción/miniaturas verificados en producción.

**AXIS Video: publicación, adopción Think y documentación vigente (2026-10-07)**

- Lab: Presentación/Superficie/Línea reutilizan `Field` + `Select` aprobado mediante `LabSelect.astro`; regla explícita en skill AXIS principal/consumo/primitives y gate contra nuevos selectores nativos. Excepciones heredadas inventariadas, sin copiar el dropdown ni publicar otra versión npm.

- Cinema/Editorial/Review publicados en primitives 0.6.5; AXIS y Think main desplegados. Think usa registry privado + lockfile. [Distribución y QA](docs/operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md).
- Adapters Think/WordPress ampliados: modelo completo, callbacks cliente y ciclo de vida; muestras con subtítulos, diez miniaturas, cuatro capítulos y 12 cues. Bundle WordPress desde package publicado con hashes; sigue sin activación. Paridad documentada; 0.6.5 distribuye corrección de órbita oculta al coexistir con estilos de botones.
- CI AXIS proporcional en main: documentación rápida, suites por impacto y reuso verificable por SHA/digest para releases; sin nueva versión por documentación.
- Manuales y skills espejo separan contrato vigente de historia; controles integrados/contextuales, adapters y responsabilidades del consumidor documentados. Imagen azul intermitente abierta; WordPress preparado sin activación. Sin afirmar certificación física/AT/streaming.

- Decisión explícita del operador: `efeonce-graphic-line` gobierna estética, tipografía, componentes, iconografía y motion de Rooms; Bricolage editorial/Poppins funcional, AXIS como distribución técnica. [Dossier](docs/architecture/rooms/README.md) y [EPIC-052](docs/epics/to-do/EPIC-052-efeonce-rooms-sales-enablement-platform.md) corregidos, incluida autoría/consola; arte cliente intacto y sin narrativa pregunta/respuesta obligatoria.
- [Política de stack Rooms](docs/architecture/rooms/EFEONCE_ROOMS_STACK_BASELINE_V1.md): últimas estables compatibles, baseline fechado y gate R01 para TS7/tooling, plugins ESLint10, Node LTS y consumidor AXIS. ADR/arquitectura/epic enlazados; sin instalación ni build conjunto verificado.
- Alcance precisado por el operador: perfiles creativo y SEO/AEO de primera clase, combinables. Modelo de bloques/evidencia, continuidad nativa X-ray, experiencia y criterios de EPIC-052 actualizados; creatividad es el primer recorrido, no el límite de V1. Sin migración de Think/X-ray ni runtime nuevo.
- ADR de marca con addendum, manuales, criterios/aplicación/QA y skill Codex/Claude sincronizados. Corrección documental; sin cambios de paquetes, implementación, publicación ni despliegue.

## 2026-10-06 — Nano Banana 2.1 en CLI local

- `pnpm ai:nano` usa `gemini-nano-banana-2.1` directo por Google `global`: generación/edición/fusión, sesiones privadas, contexto video/PDF, búsqueda web/imagen, 1K–4K, 14 ratios y thinking. Expone `generateContent`, `streamGenerateContent` y `countTokens`; Batch/Interactions remoto/máscaras no implementados.
- 29 tests nuevos, TypeScript y canaries reales 1K + edición/stream/búsqueda 2K PASS; [evidencia y límites](docs/audits/ai-tooling/2026-10-06-nano-banana-2-1-cli.md). Manual, ADR embebido y skills espejo sincronizados. Sin push/deploy; runtime y Globe independientes.
- Nexa cine 4K/`high`, ocho referencias: V2 5504×3072, reservas 4/4 y revisión `APROBABLE`; [prueba y comparación con NX7d/Sunburst](docs/audits/ai-tooling/2026-10-06-nexa-cine-nano-banana-2-1-vs-sunburst.md). Preferencia cinematográfica por Sunburst en estas imágenes; Nano destaca en resolución/reservas. No es A/B controlado. Canon, manuales y skills espejo actualizados; OpenAI/GPT Image 2 sigue default de `ai:image`, sin publicar la prueba.

## 2026-10-06 — Pibank: caso de negocio, modelo y propuesta SEO/AEO

- Conciliación 07-10: [técnica/resumen/oferta](docs/audits/commercial/2026-10-07-pibank-conciliacion-paquete.md) regenerados juntos, diagnóstico recuperado y gradual como alcance principal. 30 checks/12 páginas; precios/modelos intactos. Aporte y margen pendientes.

- Oferta reforzada: AEO 24 preguntas/144 observaciones desde M2; PR gradual M3/M8 y refuerzos M6/M11; acuerdos de revisión y sensibilidad económica, con fee conservado. Modelo evolutivo sin cuota FAQ; PDF/Excel/Claude sincronizados. Híbrido 07-10: [base US$4.500 y activaciones](docs/audits/commercial/2026-10-07-pibank-oferta-hibrida.md), catálogo, calendario, selector y PDF; hasta 5 artículos/mes incluidos; ruta recomendada US$79.200, integral US$89.200. Sesiones sustituidas por refuerzos PR; técnico/schema explícitos en base. Fee US$8.000 anterior sustituido; investigación/embudo intactos.

- Conexión 07-10: [demanda, plan y costo](docs/audits/commercial/2026-10-07-pibank-conexion-demanda-plan.md), investigación/embudo originales intactos; anexo con 19 familias, capacidad y fee propuesto US$8.000/mes. Aporte global y aprobación económica pendientes.

- Integración 07-10 v0.7: [hub, pilar, tools, comunidad, PR y eficiencia SEO–SEM](docs/audits/commercial/2026-10-07-pibank-integracion-crecimiento-v0.7.md), alcance candidato/calendario/matriz y brief para Claude. PDFs6/2p revisados; SEM sólo análisis/recomendaciones. Modelo v0.6 intacto como referencia previa; aporte y costeo ampliados pendientes. Sin envío. [Revisión v0.6.1 anterior](docs/audits/commercial/2026-10-07-pibank-fuentes-para-deck.md).

- Aprendizajes del caso incorporados al método/manual/lectura funcional y skills de SEO/AEO, negocio, cliente, pricing, licitaciones, DataForSEO, reportes/decks, growth y PR; continuidad v0.6 corregida, historia preservada. [Mapa y verificación](docs/audits/commercial/2026-10-06-pibank-aprendizajes-docs-skills.md). Preparación revisable, sin nuevos forecasts, precios, gasto o publicación.

- Cierre v0.6: apertura M1, calculadora/fondeo M2, PR M3/M5/M8/M11; modelo integra1.216h y13costos por función,29pruebas nativas. Capturas competitivas ampliadas, costo BBVA conciliado y baseline de backlinks. PDFs revisados; precio/roster y datos bancarios pendientes. [Cierre de brechas](docs/commercial/prospects/banco-pichincha-peru-seo-2026/reconstruccion-2027/CIERRE-DE-BRECHAS-2027.md). Sin envío ni contacto a medios.

- PR editorial añadido al plan y propuesta: cuatro campañas, 48 propuestas individuales y vocería; objetivos de cobertura/enlaces sin garantía. Capacidad candidata combinada 1.216h; Excel conserva base SEO/GEO. PDFs y deck actualizados, [evidencia PR](docs/audits/commercial/2026-10-06-pibank-pr-autoridad.md). Sin contacto a medios, gastos nuevos de datos ni publicación.
- Exploración de demanda capturada por BCP/Interbank/Scotiabank y peer adicional BBVA: 1.476 observaciones / 1.286 consultas, 19 familias, volúmenes con procedencia y [plan de conquista anual](docs/commercial/prospects/banco-pichincha-peru-seo-2026/research/pibank-competitor-capture-2026-10-06/ANALISIS-Y-PLAN.md). Reutilización de capturas del mismo día y verificación pública; USD 0 adicional. Cobertura de dominios incompleta y ampliación preparada en preview, pendiente de conciliación de request BBVA abortado/costo desconocido. Proxies no son mercado, visitantes ni forecast; PDFs/XLSX permanecen sin nuevos resultados inventados.
- Reunión completa leída por MCP: mandato Pibank 2027, preparación histórica de Banco Pichincha diferenciada y supuesto US$38m trazable al operador. Expediente, método, manual, documentación funcional y cuatro skills Codex/Claude actualizados.
- [Evidencia y validación](docs/audits/commercial/2026-10-06-pibank-business-case-documentation.md). Reconstrucción v0.4: [propuesta cliente y modelo inverso](docs/commercial/prospects/banco-pichincha-peru-seo-2026/reconstruccion-2027/README.md); aperturas/fondeo separados, alcance enfocado de doce meses y escenario de lanzamiento. Tabla anterior retirada del uso cliente; historia y QA preservadas. M1 entrega; revisiones trimestrales según maduración. Inversión/valoración bancaria pendientes; sin envío, publicación ni cambios en CRM/runtime.

## 2026-10-06 — Prospección HubSpot: cohortes y abordaje personalizados

- Admisión 07/10: [Sika México LIC-1169 Q4 Home Center](docs/commercial/tenders/sika-mexico-campana-q4-home-center-1169/README.md), brief completo y Deal `65827529551`/nota asociados a empresa/contacto existentes. 34 tiendas, dos frentes, escenarios; presupuesto y responsable pendientes. Segmentos 174/176/177 verificados sin cambiar atributos; bucket automático Core Pipeline tras Strategic Bets propuesto. Registro local OneDrive; sin oferta enviada. Continuidad en chat Q4 enlazada; método CRM y skills Codex/Claude aclaran reutilización, contacto sin autoridad confirmada y lectura individual frente a totales.

- Continuidad de segmentos: [modelo funcional y catálogo exacto](docs/documentation/hubspot-as-a-service/prospeccion-segmentos-activos.md), manual con preview/MCP/diagnóstico, decisión y routers actualizados; skills HubSpot espejadas. Nueva lectura verifica 34 definiciones y 19 conjuntos, sin nuevas escrituras CRM.
- Alta autorizada [Sika México LIC-1164](docs/commercial/tenders/sika-mexico-campana-creativa-1164/README.md): empresa México, contacto y deal asociados con nota; Primary corregida tras automatización por dominio. Cohorte 81/81, 19 ACTIVE; 63 individuales y 51 creativos, nuevo 177 Química y materiales con una empresa. Conjuntos exactos y registro OneDrive; sin propuesta enviada.
- Corte inicial histórico: portal `48713323`, 15 segmentos globales conservados y 18 nuevos activos, con pertenencia obligatoria al lote antes de industria, país, tamaño o cargo. Lectura completa confirma conjuntos exactos y cero registros ajenos. 80 cuentas investigadas, 79 contactos nuevos; 61 individuales con email para preparación, no aprobación de envío.
- Runbook Agent CLI/MCP, manual de cohortes, método de intención y skills HubSpot/licitaciones espejadas: `IN_LIST(list = ...)`, fit ≠ solicitud ≠ vigencia, persona ≠ buzón compartido, correo disponible ≠ envío validado. [Auditoría, pendientes y estrategia](docs/audits/commercial/2026-10-06-prospeccion-segmentacion-hubspot.md). El corte inicial no creó schemas ni envió outreach. Corrección posterior: cuatro definiciones creadas por Agent CLI, 160 registros con propiedades y 18 ACTIVE migrados en el mismo ID; incorporación automática verificada (62 individuales, Retail 11, roles 32, creativo 50, CRM 26), 15 reglas globales preservadas. Regla en skills: alta completa sólo con propiedades y membresía efectiva. [Decisión](docs/architecture/GREENHOUSE_HUBSPOT_PROSPECT_PROPERTY_SEGMENTATION_DECISION_V1.md).

## 2026-10-05 — Contractors: integridad de envíos y pagos (ISSUE-179, TASK-2009/2010)

- Correcciones comunes de fechas, monto acordado, adjuntos por período/owner y reintentos atómicos; órdenes y cascade coherentes, sin parciales contractor. Revisiones adicionales cubren concurrencia, snapshot de tarifa y precisión de cantidades.
- 333 pruebas focales, TypeScript/lint/build/workers y PostgreSQL local aislado PASS; suite global 18.014 PASS, un fallo ajeno de SVG AXIS y 48 skipped. [Auditoría](docs/audits/payroll/CONTRACTOR_FLOW_PRE_RELEASE_AUDIT_2026-10-05.md). Release, canary y recovery pendientes; sin push, deploy ni operaciones financieras reales.

## 2026-10-05 — Efeonce Factory: su marca y la aplicación en Notion

- Aprobada la ruta A: «Factory» en Poppins Bold con la órbita en su «o», esfera en Growth, la F en órbita como símbolo; terminaciones del anillo concéntricas a la esfera (única diferencia con la familia). ADR [`EFEONCE_FACTORY_MARK_DECISION_V1.md`](docs/architecture/EFEONCE_FACTORY_MARK_DECISION_V1.md).
- `scripts/brand/build-factory-logos.mjs` genera 18 SVG; sellados en `axis-brand-assets` 0.4.22 (axis-design-system `dd82e11`, sin push ni publicar).
- Portadas de Notion (Teamspace, Proyectos, Tareas, Sprints), avatar del teamspace y anuncio 16:9 sobre un estudio fuera de foco hecho con `pnpm foto:generar`; fichas en `ai-generations/2026-10-05_factory-notion-bokeh/` (las PNG no van a git).

## 2026-10-05 — TASK-2002: calendario más rápido y sistema de motion v3.6 (local)

- Studio `7e081d0` + `11ec7fa` sin push. Medido en producción: navegación congelada 0,36–1,4 s y RSC del mes 226 KB (la bandeja lateral pesaba ~150 KB). Lecturas en paralelo, catálogo en memoria, bandeja recortada (8 + «Ver las N restantes»), estado pendiente visible, hoja provisional y prefetch de períodos vecinos; local: render −30/−45 % y mes vecino sin petición.
- Motion desde `axisMotion` aprobado en el canvas «v3.6»: View Transitions de mes y vista, FLIP al filtrar, entradas y salidas con origen, arrastrar para cerrar, check/halo/aviso con Deshacer; alternativa reducida por momento. [Contrato](docs/ui/motion/TASK-2002-marketing-studio-activations-calendar-motion.md). Deploy con señal del operador.

## 2026-10-05 — Efeonce Factory: vía comercial On-Demand

- Decisión explícita del operador: Factory convierte capacidad disponible en encargos con margen y caja adicional;
  vía transversal: web, contenido, audiovisual, medios y más; campaña y kit son ejemplos opcionales.
  Entradas: licitaciones públicas/privadas, prospección fría y paid media; costo, conversión y cobro por entrada.
  [ADR aceptado](docs/architecture/EFEONCE_FACTORY_COMMERCIAL_ROUTE_DECISION_V1.md), modelo de negocio/fichas e
  índices/contexto/skills Codex–Claude conectados. Economics y capacidad por encargo pendientes; sin runtime o envío.
- [HubSpot verificado](docs/commercial/tenders/FACTORY_HUBSPOT_CHANGESET_2026-10-05.md): cinco nuevas en preparación,
  veinte vencidas a perdido; registros/forecast actualizados. Corrección del operador: tres Factory On-Demand,
  ISP diseño y UNAP bajo Efeonce por operación continua. Modelo V1.3/delta aceptado. UNAP sin amount; deriva de bucket anotada.
- Priorización corregida a fit, sin cupo por horas libres; 14 fichas adicionales revisadas y ocho borradores técnicos específicos, con matrices y economía pendiente. [Cola y fuentes](docs/commercial/tenders/LICITALAB_PRIORITY_QUEUE_2026-10-05.md). Sin nuevas altas CRM ni ofertas presentadas en este corte.

## 2026-10-05 — ADR: Creative Studio, vista creativa de las mismas campañas de Studio

- Decisión del operador: Studio tiene dos vistas sobre un solo aggregate, Marketing Studio y Creative Studio (diseñador, director de arte, brand manager); la vista no autoriza y el switch conserva el foco. ADR `docs/architecture/marketing-studio/EFEONCE_STUDIO_CREATIVE_VIEW_DECISION_V1.md`, validado contra Studio `5d962c4`; roadmap de 7 slices, sin tasks ni runtime.
- Creative Studio abarca la vista creativa y a Globe como su motor (no excluyentes; se juntan después); Globe queda registrado como hibernado según el operador. Actualizados índice de decisiones, arquitectura de Studio, EPIC-049, contexto 03/00, routers `CLAUDE.md`/`AGENTS.md` y skills `efeonce-marketing-studio`/`greenhouse-globe` (ambos espejos).

## 2026-10-05 — TASK-2002: filtros, formulario, fecha y hora (v3.4/v3.5) y ventana de escritura temporal

- Studio `c767283`…`5d962c4` en producción: filtros en español con menú propio (lista estable, conteo del período, cero elegible, plataformas con y sin cuenta, banderas de los cinco mercados), formulario con el mismo menú y selectores de fecha, hora e inicio/fin (puntos por día de la cuenta, hora ocupada con aviso, flight de la campaña). AXIS 0.4.21 suma el isotipo de X. Ventana de escritura en modo open para Efeonce hasta 2026-10-12T10:00Z (decisión del operador; vuelve sola a solo lectura). [Task](docs/tasks/in-progress/TASK-2002-marketing-studio-activations-calendar-ui.md).

## 2026-10-05 — títulos de pestaña del portal (local)

- Título general `Efeonce | Greenhouse`; acceso, proyectos y resumen de finanzas usan Efeonce primero y etiquetas ES/EN. Copy centralizado, sin plantilla global que duplique marcas. ESLint y TypeScript PASS. Commit y push a `develop` autorizados; despliegue no verificado. [Detalle](docs/audits/ui/2026-10-05-portal-metadata.md).

## 2026-10-05 — identidad del menú y footer de Greenhouse (local)

- Por decisión del operador, Efeonce firma el menú (logo expandido, isotipo colapsado); Greenhouse pasa al footer vertical/horizontal, con variante clara/oscura. Assets existentes, texto alternativo corregido y canon de marca actualizado. Commit y push a `develop` autorizados; despliegue no verificado. [Evidencia](docs/audits/ui/2026-10-05-portal-brand-chrome.md).

## 2026-10-05 — TASK-2002: hojas de email y página web en producción

- Studio `3048f96` (Vercel `kc4tcvuod`): la hoja de un email muestra remitente, asunto y preheader literales con su conteo, audiencia, vista previa Escritorio/Móvil/Bandeja y evidencia programado/enviado/después del envío; la de una página web, vista previa y lista de destino, formulario conectado, URL en línea y publicación. Construidas sobre el contrato de Codex (`1f2a0ef`); null se muestra «Sin dato en la fuente» hasta que se publique el lado Greenhouse. [Task](docs/tasks/in-progress/TASK-2002-marketing-studio-activations-calendar-ui.md).

## 2026-10-05 — TASK-2007: producto y Growth CTA AXIS aprobados

Select/Combobox con opciones enriquecidas y grupos, recuperación remota y reset cancelable; feedback, disclosure, dialog y complementary con foco diferenciado; selección múltiple, tabs/paginación, fechas/rango y archivo nativos. Catálogo distingue releases observadas de exports locales. Composición `/references/product/`, pruebas y coste de bundle documentados en el repo AXIS. AXIS `447ea0c` enviado a main: Growth CTA portable, banners editorial/de marca, anillo superior, esfera al cierre, pesos Bricolage400/700 y agenda modal/inferior aprobados. CTA40/40 + final4/4; producto/Forms200 PASS + 4/4 tras corregir puerto del harness. Skills espejo y consumo sincronizados. Publicación de exports y adopción pendientes. [Task](docs/tasks/in-progress/TASK-2007-axis-product-primitives.md).

## 2026-10-05 — TASK-2002: calendario de activaciones v3 en producción (sólo lectura)

- Studio `main` `d0ec7e0`: `studio.efeonce.org/calendar` sigue la dirección v3 aprobada en Mes, Semana, Día, Línea de tiempo, Paid, Hoja, Popover del día, estados, filtros móvil y preview por formato, con barra inferior propia de evidencia de ejecución. Diálogos de escritura (planificar, editar, reprogramar, cancelar, vincular, crear desde ejecución) verificados en local; en producción no se montan hasta que exista login (TASK-1898). [Task](docs/tasks/in-progress/TASK-2002-marketing-studio-activations-calendar-ui.md).

## 2026-10-05 — TASK-2001: lectores de hojas email y landing

- Local: API 1.9.0 amplía ActivationDto con email literal/límites/audiencias/métricas y web con destinos/Growth Forms validado. UI intacta, null ausente, sin series ni SQL entre productos. Postgres/check/build/CLI PASS; rollout pendiente. [Contrato y evidencia](docs/audits/marketing-studio/TASK-2001-activation-reader-sheets-2026-10-05.md).

## 2026-10-04 — TASK-2002/2004: calendario de activaciones (lectura) e isotipos de plataforma en AXIS

- Studio (local): el calendario pasa a ser de activaciones — vistas Mes, Semana, Día, Línea de tiempo y Pauta, filtros por dimensión en la URL, hoja con evidencia y tracking URL, bandeja «Ejecución sin activación», móvil y teclado. Las escrituras se muestran bloqueadas con su razón hasta que exista autoridad de escritura.
- AXIS: `@efeoncepro/axis-brand-assets` 0.4.20 publica negativos de Instagram, LinkedIn, Meta, ChatGPT, TikTok y Threads, isotipos de Facebook y Threads y los logos de herramientas; `axis-tokens` 0.5.1.

## 2026-10-04 — TASK-2001: conexiones owned locales

- Resend/HubSpot con puerto Greenhouse autorizado por binding y evidencia completa/parcial; WordPress público paginado y cacheado. Marketing Cloud separado sin lector. API 1.8.0/catálogo aditivo, 288+7 Studio con PG, build y CLI/GVC básico PASS; navegación móvil en QA. Sin push ni rollout nuevo. [Evidencia](docs/audits/marketing-studio/TASK-2001-owned-connections-2026-10-04.md).

## 2026-10-04 — TASK-2001: rollout de activaciones de Studio

- Studio `aa6fa07` desplegado, API 1.7.0; cinco migraciones staging/prod, seis planes CL con evidencia legacy y eventos persona. Descubrimiento real62/replay0 cambios, scheduler OIDC, CLI y44 thumbs PASS. Email multiproveedor, owned y MCP delegado pendientes. [Evidencia](docs/audits/marketing-studio/TASK-2001-release-2026-10-04.md).

## 2026-10-04 — TASK-1899 retirada por el operador

- Implementación local de escritura MCP revertida en Greenhouse y Studio; sin cambios de runtime desplegados. Se retira como requisito previo al desarrollo de Studio; futura federación pendiente de nueva decisión.

## 2026-10-04 — AXIS: recursos, agentes, tipografía y botones

- [Entradas especializadas y Growth Forms](docs/audits/2026-10-04-axis-specialized-inputs.md): AXIS `a0c6130`/`6fff346` subido; teléfono/correo/URL/documentos/decimales, 245 países con búsqueda y filas alineadas. Adapter Greenhouse opt-in y skills Codex/Claude sincronizadas. Primitives 0.5.0 pendiente de publicación; sin cambio de pins ni activación en hosts.

- Colores y ramps de La órbita, siete compactos y diez familias de formularios distribuidos desde AXIS; foco continuo, iconos de apoyo y selectores enriquecidos. Docs y skills Codex/Claude sincronizados con tres subagentes. [Estado de publicación, instalación y límites](docs/audits/2026-10-04-axis-forms-release.md). Adopción y pins consumidores separados.

- Familia portable de botones: contexto heredado, radio/toolbar, menús controlados y top layer modal; 52 recorridos en cuatro perfiles y 32 referencias visuales. Lab desplegado; VoiceOver/NVDA manual y zoom nativo pendientes. La adopción mantiene sus pins. [Release y evidencia](docs/audits/2026-10-04-axis-buttons-release.md).

- Iconos AEO/SEO/Autoridad, logos propios y terceros, búsqueda, navegación, capacidades para agentes y Bricolage editorial centralizados en AXIS. `aee99d2` pushed y Lab desplegado; `graphic-line@0.17.0` publicado, nueva API `/logos` pendiente de release. Docs y skills Codex/Claude reconciliados sin cambiar pins consumidores. [Cierre, evidencias y alcance](docs/audits/2026-10-04-axis-documentation-closure.md).

## 2026-10-04 — Marketing Studio: catálogo en producción y CLI HTTP local

- Delta TASK-2001: email con Resend (volumen principal), HubSpot, Marketing Cloud Engagement y Next; contrato común, adapters separados y evidencia/completitud por envío. Registrado en task/ADR/plan; implementación pendiente, el QA anterior no certifica esta ampliación.

- Studio separa plan y ejecución: ocho estados, cuentas/mercado/hora local, versiones exactas, tracking congelada, calendario/avisos/eventos, blog por CMS cliente y draft Notion sólo como referencia. Backfill preserva posts y exige revisión personal. API/MCP parity y CLI HTTP verificados con PostgreSQL real; flags OFF, sin push. [QA, commits y pendientes de runtime](docs/audits/marketing-studio/TASK-2001-local-verification.md).

- Cierre documental con tres subagentes: arquitectura/operación/skills y routers reconciliados; estado local/desplegado separado, MCP futuro no bloquea API/CLI/UI. [Mapa completo y gates](docs/audits/marketing-studio/2026-10-04-session-documentation-closure.md).

- CLI HTTP local `pnpm studio`: descubrimiento de 59 operaciones de negocio, cargas verificadas, dryRun/If-Match/idempotencia y credenciales privadas. [Manual](docs/manual-de-uso/marketing-studio/operar-por-cli-api.md) · [QA](docs/audits/marketing-studio/2026-10-04-studio-api-cli.md).

- TASK-1905: catálogo versionado, 52 canales, validación transaccional, backfill revisable, audiencias/ICP y API 1.6.0/59 tools desplegados en Studio (`74073de`). [Release y límites](docs/audits/marketing-studio/TASK-1905-release-2026-10-04.md); backfill humano, ICP y federación pendientes.

- [TASK-1998](docs/tasks/complete/TASK-1998-marketing-studio-video-playback-rendition.md): derivado `playback` (MP4 H.264, lado corto ≤ 720 px, faststart) en el worker con backfill por el barrido (6/6 videos de producción), `302` a URL firmada V4 (GCS atiende `Range`; ningún video pasa por Vercel), `Asset.playback`, API 1.5.0.
- [TASK-1999](docs/tasks/complete/TASK-1999-marketing-studio-video-player-ui.md): reproductor nativo en el panel de la pieza (feed y story, sin autoplay); el tablero muestra todas las piezas de un formato (la versión con intro para Instagram era invisible) y la duración.

## 2026-10-04 — AI Visibility Report: hero, ancho y hover

- Hero con demostración interactiva y pausa directa; shell/escena acotados en pantallas amplias. Think `6aab907`/`56a300a` publicados y verificados en producción a 1710/2560 px. Hover primario azul profundo `06449ca` validado y comprometido sólo local, pendiente de push.
- [TASK-1966 y evidencia](docs/tasks/complete/TASK-1966-ai-visibility-report-landing-la-orbita.md): docs funcionales, motion, wireframe y skill espejo alineados. Contrato Marca primero sin activar; producción conserva Entrega primero. Sin envío real ni cambios de backend/PDF.

## 2026-10-04 — Discovery de población cliente SEO

- TASK-1690: [discovery](docs/audits/seo/2026-10-04-task-1690-discovery.md) de contratos, fixtures y UX con tres subagentes; decisión GSC clics/CTR y rank independiente, cobertura/null/cero y cola canónica documentados. Estado `Diseno`; selección visual e implementación pendientes. Baseline: 53 tests PASS. Sin código ni cambios runtime.
