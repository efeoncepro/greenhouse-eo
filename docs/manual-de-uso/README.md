# Greenhouse EO — Manual de Uso

Esta carpeta guarda guias practicas para usar capacidades concretas del portal Greenhouse.

La diferencia con otras capas de documentacion:

- `docs/architecture/` explica contratos tecnicos, schemas, APIs y decisiones para agentes/desarrolladores.
- `docs/documentation/` explica como funciona un modulo y sus reglas de negocio.
- `docs/manual-de-uso/` explica como usar una capacidad paso a paso en el portal, que permisos necesitas, que no debes tocar y como resolver problemas comunes.

## Indice por categoria

### Comercial

- [Catálogo HubSpot as a Service](../services/hubspot-as-a-service/README.md) — alcance y frontera de los dos servicios operables que este manual soporta.
- [Operar ANAM HubSpot Managed Service](hubspot-as-a-service/operar-anam-hubspot-managed-service.md) — rutina diaria/semanal/mensual para Customer Agent, calidad por owner, Growth, Services, automatización, pilotos y preparación read-only de billing.
- [Componer el deck de una licitacion](comercial/componer-deck-de-licitacion.md) — `pnpm deck:compose <plan.json>`: escribir el plan, componer, revisar las laminas y entregar. Que significan `too_long` (el renderer NO trunca), `missing_evidence_ref` (una cifra sin fuente no se compone) y el aviso de peso del PDF (si el portal rechaza el archivo, la oferta queda fuera del proceso).
- [Autorar una lámina con el chapter-author](comercial/autorar-lamina-con-chapter-author.md) — generar las láminas de diagnóstico desde un run real del Grader con el agente (propose → confirmación humana → render): prerrequisitos (proxy PG, flag, key), el script canónico, cómo entran los hechos externos del operador (siempre con fuente), qué significa cada rechazo (no son bugs: es el diseño anti-fabricación) y qué no hacer.

### Finanzas

- [Registrar ingresos, egresos, pagos y ordenes de pago](finance/registrar-ingresos-egresos-y-ordenes-de-pago.md) — guia operador end-to-end para crear documentos de ingreso/egreso, registrar cobros/pagos reales, decidir pago directo vs orden de pago, aprobar/enviar/marcar pagado y conciliar.
- [Caja, cobros, pagos y liquidaciones](finance/caja-cobros-pagos-y-liquidaciones.md) — operacion de caja real: registrar cobros/pagos, asignar instrumentos, entender `amount` vs `amountClp`, transferencias internas y settlement legs.
- [Conciliacion bancaria operativa](finance/conciliacion-bancaria-operacion.md) — crear periodos, importar cartolas, revisar candidatos, usar auto-match/AI suggestions, hacer match/unmatch/exclude y cerrar solo cuando el banco cuadra.
- [Instrumentos de pago y Banco](finance/instrumentos-de-pago-y-banco.md) — administrar cuentas, tarjetas, fintechs, processors y cuentas internas; diferencia entre instrumento, processor y source account; manejo de datos sensibles y saldos materializados.
- [Distribucion de costos para P&L operativo](finance/distribucion-costos-pnl.md) — como revisar, materializar y cerrar períodos sin inflar overhead de clientes con payroll, regulatorio, financiero o treasury transit.
- [Sugerencias asistidas de conciliacion](finance/sugerencias-asistidas-conciliacion.md) — como generar, revisar, aceptar o descartar sugerencias AI sin alterar saldos automaticamente.
- [Saldos bancarios FX drift](finance/saldos-bancarios-fx-drift-remediation.md) — como diagnosticar, auditar y remediar drift FX de saldos bancarios usando el control plane canonico sin SQL/backfills ad hoc.
- [Monedas indexadas UF/CLF — rollout y operacion](finance/monedas-indexadas-uf-clf-rollout.md) — como prender los flags CLF, verificar la proyeccion de una OC de cliente en UF a income CLP + plano native UF, leer las señales indexed-unit y que NO hacer (UF nunca es caja).
- [Finance Movement Feed](../documentation/finance/finance-movement-feed.md) — contrato reusable para mostrar movimientos financieros sin duplicar tablas, hardcodes de logos ni calculos de saldo en UI.
- [Pagos a Contractors (Finanzas)](finance/pagos-a-contractors.md) — flujo completo desde envio aprobado hasta payable, readiness, `ready_for_finance`, corrida mensual, orden de pago, aprobacion, mark-paid, conciliacion y comprobante; incluye crear desde envio/off-cycle, cancelar, waiver, override y las diferencias entre HR, payable, obligacion financiera, orden y banco.

### Comercial

- **[Proposal Studio — de un RFP al PDF (empieza acá)](proposal-studio/rfp-a-pdf-el-dia-a-dia.md)** — el manual del día a día: te llegó un RFP y quieres el PDF en la mano. Admisibilidad → registrar la propuesta → RFP y evidencia → plan del deck → render gobernado → revisar → subir. Incluye los prompts exactos para pedirle cada paso a un agente, qué información SOLO puedes dar tú, cómo se revisa y confirma, y el caso guía SKY completo. ⚠️ La creación/gates se opera desde el repo (Nexa gated por flag, TASK-1399); para VER estado y DESCARGAR versiones ya hay UI: Administración → Propuestas (TASK-1413).
- [Armar el workspace de una licitación/propuesta (el "DSR interno")](comercial/armar-el-workspace-de-un-deal.md) — cómo arrancar un deal con `pnpm tender:new <slug>`: la carpeta canónica (bases/ · research/ · oferta-tecnica.md · deck-plan.json · artifact-manifest.json · anexos/), qué va en cada una, el discriminador de audiencia (interno nunca cruza), el ledger de evidencia, el manifiesto de piezas vivas (por enlace, nunca captura) y el flujo carpeta → oferta → deck → Proposal.
- [Propuestas en el portal — ver estado y descargar versiones](comercial/descargar-propuestas-portal.md) — la página `/admin/commercial/proposals`: tabla con estados y deadlines, panel con historial de versiones por artefacto (Vigente/Interno) y descarga del archivo real; qué significan las señales y por qué un 403 en un documento interno es lo esperado.
- [Proposal Studio — índice del dominio](proposal-studio/README.md) — qué manual leer según lo que necesites hacer.
- [Crear y operar una propuesta](proposal-studio/crear-y-operar-una-propuesta.md) — el objeto de negocio: crear, estados y sus compuertas humanas, adjuntar el RFP, registrar evidencia con su audiencia (interno vs. cliente), declarar requisitos y vincular la cotización con su gate de margen.
- [Generar el deck de una propuesta](proposal-studio/generar-el-deck-de-una-propuesta.md) — de `plan.json` al PDF: los dos caminos (exploratorio `pnpm deck:compose` vs. productivo `requestProposalRender`), qué pasa en cada etapa (cola → dispatcher → worker → asset store) y cómo obtener el archivo.
- [Entender los errores y rechazos](proposal-studio/entender-los-errores-y-rechazos.md) — la tabla completa: qué significa cada rechazo en lenguaje simple, por qué el sistema lo bloquea (la razón de negocio), qué hacer, y si se reintenta o exige un plan nuevo.
- [Operar el artifact-worker](proposal-studio/operar-el-artifact-worker.md) — cola, ejecuciones, logs, señales, reintentos, cómo apagar todo (el flag es multi-runtime) y qué no hacer nunca.
- [Operar Quote-to-Cash Comercial](comercial/operar-quote-to-cash-comercial.md) — como revisar una oportunidad, elegir party/deal/productos, construir una cotizacion, manejar aprobaciones, emitir, sincronizar HubSpot y entender cuando pasa a contrato/Finance.
- [Pipeline comercial](comercial/pipeline-comercial.md) — como usar la lane dedicada de forecast comercial sin confundirla con revenue reconocido ni cierre financiero.
- [Sample Sprints](comercial/sample-sprints.md) — como declarar, aprobar, registrar progreso y cerrar outcomes de pilotos/trials/POCs/discovery.
- [Construir una licitación paso a paso](comercial/construir-una-licitacion.md) — runbook para armar una propuesta de licitación (pública/privada, RFP/RFQ) end-to-end: leer bases, admisibilidad, bid/no-bid, alcance, squad, precio, redacción, económica y presentación human-in-control.
- [Usar la Radiografía AEO en venta y educación](comercial/usar-radiografia-aeo-en-venta.md) — manual comercial para usar la muestra como educación, demo en vivo, evidencia en licitaciones, follow-up del Grader y herramienta de sales enablement SEO/AEO.

### Growth

- [Alta de una surface Growth Form (checklist end-to-end)](growth/alta-surface-growth-form-checklist.md) — publicar un Growth Form en un host/dominio nuevo sin que se rompa en producción: separa Tier 1 (config-only: publicar → surface+origin/CORS → destino HubSpot → embed → smoke) de Tier 2 (`tokenized_report`/async: consumer reactivo + CORS de status/report + degradación de dato de dominio). Cubre los 2 gaps que recurren (hostname de Turnstile por host + smoke real end-to-end) y troubleshooting. Caso fuente TASK-1327.
- [Correr el AI Visibility Grader (smoke + endpoint)](growth/ai-visibility-grader-smoke.md) — como ejecutar una corrida del grader (fake sin secretos / proveedor real uno por vez), interpretar estados (`skipped`/`partial`/`costGuard`), usar el endpoint interno, operar el worker async y verificar/revertir el re-grade recurrente por Scheduler (TASK-1270).
- [Vista operador AEO — cockpit, plan y cross-sell](growth/vista-operador-aeo.md) — cómo operar el programa AEO desde Growth: cockpit `/growth/aeo` (score/tier/último run + targets por motion), registrar el avance del Plan AEO por foco (motivo obligatorio al bloquear/descartar), correr diagnósticos sobre clientes/prospectos (puerta operador) y enviar el informe abriendo un Lead con consent gate. Facet "AEO" en Account 360. TASK-1276.
- [Operar el motor de CTAs](growth/operar-motor-cta.md) — operación diaria desde `/growth/ctas` (inventario, publicar/pausar con freno de emergencia, preview de variantes), autoría por API, registrar surfaces con embed key (secreto una sola vez), incrustar el CTA en un host (Think/WordPress), medición GTM/GA4 live, estados, qué no hacer y troubleshooting. TASK-1339 + TASK-1340; skill `greenhouse-growth-ctas`.
- [Configurar un Growth CTA con scheduler nativo](growth/configurar-cta-scheduler-nativo.md) — registrar surface/scheduler key, validar binding y origin, probar continuidad dialog/full-screen, recuperación native-only, booking controlado, medición y rollback sin enlaces HubSpot.
- [Enviar informe AEO + crear Lead (cross-sell del operador)](growth/enviar-informe-aeo-crear-lead.md) — cómo el operador envía el informe AEO + abre un **Lead** de HubSpot (objeto `leads`, **no un Deal**): prerrequisitos (informe publicado + consentimiento para prospectos), regla de no-cold-send, estados, qué no hacer, troubleshooting (`consent_required`/`report_unavailable`/`disabled`) y los pasos de rollout (provisionar `aeo_check_result` + flag + smoke). TASK-1279.
- [Conectar Google Search Console a una marca](growth/conectar-search-console.md) — paso a paso para conectar la propiedad de Search Console de un cliente (modelo operador-mediado: conectas tu cuenta una vez, eliges la propiedad del desplegable), estados, qué no hacer, problemas comunes (org_internal, "no pudimos obtener tus propiedades", grant `secretAccessor`) y verificación.

### Identidad y acceso

- [Operar Identity, Access y Admin Center](identity/operar-identity-access-admin-center.md) — guia para crear/revisar usuarios, roles, vistas, permission sets, SCIM, reconciliacion y diagnostico de acceso sin aplicar bypasses inseguros.
- [SCIM con Microsoft Entra](identity/scim-entra-provisioning.md) — como verificar provisioning, usar `provisionOnDemand`, interpretar `countEscrowed` y evitar fixes manuales inseguros sobre usuarios o mappings.
- [Organization Workspace Projection — operación](identity/organization-workspace-projection.md) — como supervisar las 2 nuevas reliability signals (`facet_view_drift`, `unresolved_relations`), interpretar las 5 relaciones canónicas subject↔organización, las 11 capabilities `organization.*` y la disciplina TS↔DB para agregar capabilities nuevas.

### Portal Cliente

- [Operar Portal Cliente y Customer Experience](client-portal/operar-portal-cliente-customer-experience.md) — guia operador para activar/pausar modulos, diagnosticar rutas cliente, distinguir vista/modulo/capability y resolver estados normal, zero-state, not assigned, degraded y error.
- [Menu dinamico y empty states — operacion](client-portal/menu-dinamico-y-empty-states.md) — como activar/pausar/dar de baja modulos para clientes, verificar que esta viendo cada cliente, diagnosticar empty states reportados, atender warnings Sentry `role_view_fallback_used` (regla canonica view registry governance), validar visualmente con mockup `/cliente-portal-mockup`, troubleshooting de los 5 estados canonicos del 5-state contract.

### Admin Center

- [Operar Admin Center](admin-center/operar-admin-center.md) — guia transversal para operar acceso, tenants, permission sets, integraciones, email delivery, AI Tools, pricing catalog, SLAs, calendario y responsabilidades sin saltarse capabilities ni audit.

### HR y Nomina

- [Operar el Hiring Desk](hr/operar-hiring-desk.md) — demanda de talento, pipeline de postulaciones, Application 360, asignación de assessments por postulación, revisión/corrección, decisión estructurada, handoff y publicación de vacantes.
- [Activar colaborador desde Hiring](hr/activar-colaborador-desde-hiring.md) — el bridge que convierte un handoff aprobado en colaborador: reclamar el caso, crear/enlazar la ficha sin duplicar identidad, abrir onboarding y cerrar con evidencia; bloqueos y señal de atascos.
- [Operar el Hiring Handoff](hr/operar-hiring-handoff.md) — qué pasa cuando decides una postulación como seleccionada: aprobar/preparar/completar/cancelar el handoff, estados y bloqueos, evidencia de cierre, señales de operaciones y backfill/smoke.
- [Operar Workforce, Payroll y Contractors end-to-end](hr/operar-workforce-payroll-contractors-end-to-end.md) — guia operador para decidir el camino correcto entre Workforce Activation, nomina mensual, honorarios, contractors, employee-to-contractor, finiquitos y pagos en Finance sin duplicar obligaciones.
- [Habilitar colaborador en Workforce Activation](hr/habilitar-colaborador-workforce.md) — como resolver blockers de readiness desde `/hr/workforce/activation` antes de completar ficha.
- [Completar ficha laboral de un colaborador](hr/completar-ficha-laboral.md) — como cerrar el workflow workforce intake desde la UI; desde TASK-874 el cierre consulta readiness automático y bloquea fichas incompletas.
- [Offboarding](hr/offboarding.md) — como abrir, revisar y avanzar casos canonicos de salida sin confundirlos con desactivacion de acceso ni finiquito.
- [Checklists de Onboarding y Offboarding](hr/onboarding-offboarding-checklists.md) — como crear checklists operativos, completar tareas y no confundirlos con el caso formal de salida.
- [Usar Lifecycle / Onboarding y Offboarding](hr/onboarding-y-offboarding.md) — overview HR, editor de plantillas, tareas propias y card lifecycle en People 360.
- [Finiquitos Chile](hr/finiquitos.md) — como calcular, revisar, aprobar y cancelar un final settlement Chile dependiente desde un caso de offboarding aprobado.
- [Periodos de nomina](hr/periodos-de-nomina.md) — como crear, editar y calcular periodos sin adivinar la version tributaria Chile; cuando Greenhouse la resuelve solo y cuando un override manual si aplica.
- [Descargar y reconciliar la nomina mensual](hr/descargar-y-reconciliar-nomina.md) — paso a paso para descargar recibos individuales, PDF reporte mensual y Excel; donde leer los totales para reconciliar contra Previred (cotizaciones) y F29 (retencion SII honorarios) sin manipular el archivo.
- [Exportar Previred y LRE](hr/payroll-compliance-exports-chile.md) — como descargar los artefactos compliance Chile desde periodos cerrados, permisos requeridos y cuidados de upload externo manual.
- [Contratistas — Self-Service y revision HR](hr/contratistas.md) — como un contratista sube boleta/factura + evidencia, envia entregas y responde observaciones; y como HR revisa soportes, aprueba/observa/rechaza y deriva el caso a Finanzas sin confundir aprobar con crear payable o pagar.

### Personas

- [Operar Mi Espacio y Self-Service](personas/operar-mi-espacio-self-service.md) — guia para que una persona revise su perfil, performance, recibos, payment profile, permisos, onboarding, documentos legales y contractor self-service sin acceder a datos de otras personas.

### Agencia y Operaciones

- [Operar Agency, Delivery y Account 360](agency/operar-agency-delivery-account-360.md) — como leer Account 360, Delivery, ICO, economics, sample sprints y service attribution con degradacion honesta por faceta.
- [Monitorear Costos Cloud con FinOps](operations/monitorear-costos-cloud-finops.md) — como revisar gasto GCP, interpretar proyecciones y drivers, usar alertas tempranas y ejecutar diagnosticos seguros sin depender solo de la consola de Google Cloud.
- [Operar Integraciones y Sync](operations/operar-integraciones-y-sync.md) — como revisar health/freshness, disparar sync manual, pausar/reanudar conectores, diagnosticar webhooks y no romper la cadena raw/conformed/projection.
- [Operar el pipeline RpA V2 demo](operations/pipeline-rpa-v2-demo.md) — verificar que un cambio de estado en una tarea demo se captura y se refleja en la propiedad `RpA` de Notion; interpretar señales de confiabilidad; troubleshooting de captura y writeback.
- [Activar ICO de un cliente y verificar el estado](operations/activar-ico-cliente.md) — como hacer que un cliente nuevo aparezca en ICO sin tocar codigo: activar el sync con `POST /api/delivery/ico/enable-sync` (permisos requeridos, idempotencia, respuesta), verificar la etapa real con `GET /api/delivery/ico/sync-status`, interpretar la escalera de `stage`, que hacer ante cada error/estado y por que nunca se activa el teamspace demo.

### Plataforma

- [Operar layout Ohio + Elementor en el Public Site](public-site/wordpress-ohio-elementor-layout.md) — runbook para diagnosticar, corregir y revertir desfases de contenedor/sidebar en `efeoncepro.com` WordPress/Kinsta, incluyendo `/blog` y el fix page-scoped de Ohio `.light-typo`.
- [Operar Public Site y Content Factory](public-site/operar-public-site-content-factory.md) — crear y publicar un articulo con `ideate → co-crear → author → validate → private → approve → publish → verify`; Content Factory termina en privado y la transición pública requiere decisión humana, snapshot, rollback y QA live.
- [Producir infografías editoriales](public-site/producir-infografias-editoriales.md) — contrato → arquetipo → SVG source/delivery → QA de archivo/columna → Media Library → `<picture>`/SEO; separa body SVG de featured/OG raster y fija la firma footer-only Efeonce.
- [Knowledge Platform (foundation)](plataforma/knowledge-platform.md) — operar la base del Knowledge Platform: aplicar la migración del schema `greenhouse_knowledge`, usar los helpers server-only de `src/lib/knowledge/` (registrar fuente, crear/publicar documento con chunks, transicionar lifecycle, feedback), qué significan los estados y qué no hacer.
- [MCP Greenhouse Read-Only](plataforma/mcp-greenhouse-read-only.md) — cómo levantar el MCP local `stdio` o conectarse al gateway remoto HTTP privado, qué variables necesita, qué tools read-only existen hoy, qué límites de scope respeta y qué follow-ups siguen fuera de alcance.
- [Operar Kortex Command Adapter](plataforma/kortex-command-adapter.md) — como ejecutar comandos Kortex gobernados desde Greenhouse con `Idempotency-Key`, binding preflight, dry-run obligatorio y live execute apagado por defecto.
- [Operar Comunicaciones y Notificaciones](plataforma/operar-comunicaciones-notificaciones.md) — revisar email delivery, previews, kill switches, preferencias, in-app notifications, Resend webhooks y Teams Bot sin enviar mensajes fuera de trazabilidad.
- [Validar el contrato visual DESIGN.md](plataforma/validar-contrato-visual-design-md.md) — paso a paso para validar localmente con `pnpm design:lint`, comparar versiones con `pnpm design:diff`, agregar tokens nuevos siguiendo el patrón canónico (sin atajos prohibidos), resolver warnings comunes, y verificar que el CI gate aprobó tu PR.
- [Usar microcopy shared](plataforma/microcopy-shared-dictionary.md) — como usar `getMicrocopy` y `buildStatusMap` para botones, estados, meses, empty states y aria-labels sin duplicar strings ni romper el futuro i18n.
- [Verificar idioma del portal](plataforma/i18n-runtime.md) — como forzar `gh_locale=en-US`/`es-CL` para QA del runtime i18n sin cambiar URLs privadas ni APIs.
- [Formatear fechas, montos y numeros](plataforma/formateo-locale-aware.md) — como usar `@/lib/format` para UI, PDFs, Excel y emails sin reintroducir `Intl.*` o `toLocale*` directo; incluye caso Brasil.
- [Organization Workspace — rollout y operación](plataforma/organizaciones-workspace-rollout.md) — cómo activar progresivamente el nuevo workspace de organizaciones (TASK-612) en `/agency/organizations/[id]` por usuario → rol → global, supervisar las 2 reliability signals, revertir instantáneo per-user, y diagnosticar issues comunes.
- [Skills de Product Design](plataforma/skills-product-design.md) — qué cambió cuando se incorporó la suite de 17 skills (a11y, motion, performance, forms, state, dataviz, IA, frontend-architect, design-system-governance), cuándo se invoca cada una, cómo se componen, cuándo correr `greenhouse-ui-review` antes de commit y cómo extender el sistema sin romperlo.
- [Activar y desactivar el Modo Mantenimiento](plataforma/modo-mantenimiento.md) — paso a paso para poner el portal detrás de la página `/maintenance` durante una mantención planificada: setear `MAINTENANCE_MODE=true` (+ `MAINTENANCE_BYPASS_SECRET`) + redeploy, verificar con `?gh_bypass`, apagar, qué significan el 503/cookie/mensajes rotativos, qué no hacer y troubleshooting.
- [Greenhouse Visual Capture](plataforma/captura-visual-playwright.md) — `pnpm fe:capture` para grabar `.webm` + frames PNG marker-based + GIF opcional de cualquier ruta del portal. Reemplaza el patrón de `_cap.mjs` ad-hoc. Scenario DSL declarativo, agent auth canónico, scroll robusto, captura full-page/por sección, 5 capas defense-in-depth Safety, GC de artifacts.
- [Operar UI Platform y Design System](plataforma/operar-ui-platform-design-system.md) — runbook para diseñar/implementar superficies con primitives, tokens, Composition Shell, Adaptive Card Density, GVC, design-system catalog y gobernanza Figma.
- [Production Release Orchestrator + slash command `/release`](plataforma/release-orchestrator.md) — cómo promover `develop → main` por el control plane: disparar el orquestador, aprobar el environment Production, leer estados (`released`/`degraded`/`aborted`), prender flags pendientes del ledger; incluye el atajo **`/release`** de Claude Code (modos release/rollback/watchdog/drift/break-glass) y su equivalente skill en Codex. No tratar un `push:main` como release completo.

### Herramientas IA

- [Operar AI Tooling, Content y Assets](ai-tooling/operar-ai-tooling-content-assets.md) — administrar catalogo de herramientas IA, licencias, wallets, credit ledger y generacion interna de imagenes/animaciones sin confundirlo con facturacion ni publicacion del Public Site.
- [Operar pilotos de Creative Workflow](ai-tooling/operar-pilotos-creative-workflow.md) — seleccionar motor por contrato de fidelidad, ejecutar una prueba controlada y revisar evidencia; incluye la condición para probar previs 3D exportada como referencia de video, sin tratarla como un render 3D.
- [Producir un set con Layout Design & Finishing](ai-tooling/producir-layout-design-y-finishing.md) — diseñar
  grillas por ratio, terminar clean plates con Seedream/GPT y componer copy/marca de forma determinística.

### Creative Studio (Efeonce Globe — plataforma hermana)

- [Operar y extender el Contract Spine de Efeonce Globe](creative-studio/efeonce-globe-api-contract-spine.md) — puente desde Greenhouse hacia el runbook operativo de la plataforma hermana: quién opera qué, el flujo para agregar una capability al `CapabilityRegistry`, cómo verificar (`pnpm check`/`build` en `efeonce-globe`), la semántica de estados/errores y las reglas duras. El detalle paso a paso vive en el repo `efeonce-globe`; invocá la skill `greenhouse-globe`.
- [Correr un experimento en el Model Lab de Efeonce Globe](creative-studio/efeonce-globe-model-lab.md) — puente desde Greenhouse hacia el runbook §7-bis de Globe: cómo se prepara, ejecuta y audita un experimento (capacidad, ruta, insumos por huella, tope de gasto), la habilitación con el flag apagado por defecto, la semántica de estados (`candidate_ready` ≠ aprobado) y errores (`policy_blocked`/`day_cap_exceeded`/…), y las reglas duras (nunca subir el archivo crudo, nunca llamar al proveedor por fuera del runner). Hoy con proveedor de ensayo; el detalle vive en `efeonce-globe`; invocá la skill `greenhouse-globe`.
- [Elegir y operar los proveedores reales del Model Lab (Vertex · Fal · Composite)](creative-studio/efeonce-globe-model-lab-providers.md) — cómo se selecciona el motor con `GLOBE_LAB_PROVIDER` (`fake` por defecto → `vertex`/`fal`/`composite`), qué capacidad rutea a qué modelo, cómo se habilita Vertex sin llaves (ADC/WIF) y Fal con la llave propia de Globe, y las reglas duras (slug ByteDance sin prefijo `fal-ai/`, verificar un slug con `POST {}`, nunca usar la llave de Greenhouse, nunca llamar al proveedor por fuera del runner). Detalle canónico en `efeonce-globe`; invocá la skill `greenhouse-globe`.
- [Auditar un experimento con el Evaluation Harness](creative-studio/efeonce-globe-evaluation-harness.md) — cómo se corre un golden brief por el harness y se lee su veredicto: los checks objetivos que pasan/fallan, por qué el veredicto nunca dice "aprobado" solo (`objective_pass_pending_human`) y cómo esa salida alimenta la matriz de recomendación entre motores. El juicio creativo lo pone la persona, no el harness. Detalle canónico en `efeonce-globe`; invocá la skill `greenhouse-globe`.
- [Operar descarga y acciones de piezas del Creative Producer](creative-studio/operar-retrieval-assets-globe.md) — prender, verificar y diagnosticar el lado de salida (`TASK-1503`): las tres variables (`GLOBE_PRODUCER_ASSETS_ENABLED` default OFF, `GLOBE_PRODUCER_GRANT_SECRET` **obligatoria**, TTL del pase), la migración `0003`, el canary con sus tres negativos obligatorios (cross-workspace, hash que solo fue referencia de entrada, pase vencido) y el mapa de señales. Ojo: la config de los servicios Cloud Run vive en Terraform desde `TASK-1508` — un `gcloud --update-env-vars` muere en el próximo apply. Invocá la skill `greenhouse-globe`.
- [Leer y ampliar el catálogo de rutas del Creative Producer](creative-studio/efeonce-globe-producer-catalog.md) — cómo leer el catálogo gobernado por SDK/HTTP (`listProducerRoutes`/`getProducerRoute`, filtros por capability/modalidad, vista de naming según autoridad) y cómo agregar/ajustar una ruta **como dato** (invariantes que los drift guards abortan: routeId único, modality-match, nunca un slug de proveedor). Los consumers in-process usan los helpers, nunca re-dispatch. Invocá la skill `greenhouse-globe`.
- [Operar las capabilities nuevas del Creative Producer](creative-studio/operar-capabilities-producer-globe.md) — cómo operar y verificar las cuatro capacidades que sumó `TASK-1504` (video por keyframes, control de movimiento, cambio de voz y traducción de audio) más el registro de presets de voz: qué ruta usa cada motor, cómo se declara un preset, por qué un modo de entrada mal declarado se rechaza **antes** de reservar crédito y qué queda pendiente para el canario facturable (kill switch OFF, `GLOBE_LAB_PROVIDER=fake`, gate humano). Aún no desplegado ni verificado en runtime. Invoca la skill `greenhouse-globe`.
- [Operar la persistencia durable de Efeonce Globe](creative-studio/operar-persistencia-globe.md) — cómo correr las migraciones de `globe-pg` (idempotentes, registradas en `globe._migrations`), qué hace durable a un servicio (las tres `GLOBE_POSTGRES_*`; si falta una arranca en memoria), el bootstrap de roles de una sola vez y el drift-trap de `maxScale` tras `deploy-internal.yml`. Nunca contraseñas en runtime, nunca base compartida con Greenhouse. Invoca la skill `greenhouse-globe`.
- [Operar modos y responsabilidades de Globe](creative-studio/operar-modos-responsabilidad-globe.md) — verificar el schema/runtime de responsabilidades con el verifier no mutante, correr el smoke internal-only (`smoke-private-api.mjs`) y cambiar una asignación por SDK/API con `idempotencyKey` + `expectedVersion`. Una asignación describe accountability, no otorga permisos; nunca escribir directo en `responsibility_assignment_versions`. Invoca la skill `greenhouse-globe`.
- [Operar el front door interno de Efeonce Globe](creative-studio/operar-front-door-globe.md) — verificar que `globe.efeoncepro.com` está sano (HTTP 301 → HTTPS 200 + certificado `ACTIVE`), correr el smoke de federación humana (las tres piernas del SSO), mover el allowlist de redirect URIs con `pnpm sister-platform:redirect` y su probe completo contra el broker, diagnosticar un certificado en `FAILED_NOT_VISIBLE`, endurecer/restaurar el ingress, el drift-trap de `maxScale` de `deploy-internal.yml` y el rollback por slice. Internal-only: no es Production ni acceso externo. Invoca la skill `greenhouse-globe`.

## Plantilla recomendada

```md
# [Nombre de la capacidad]

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** YYYY-MM-DD por [agente/persona]
> **Ultima actualizacion:** YYYY-MM-DD por [agente/persona]
> **Modulo:** [dominio/modulo]
> **Ruta en portal:** `/ruta`
> **Documentacion relacionada:** [links]

## Para que sirve

## Antes de empezar

## Paso a paso

## Que significan los estados

## Que no hacer

## Problemas comunes

## Referencias tecnicas
```

## Regla para agentes

Todo dominio, modulo, funcionalidad, feature, workflow, integration, tool, API o surface que una persona o agente deba operar, configurar, validar o diagnosticar debe tener manual de uso o runbook en esta carpeta.

- Si existe, actualizarlo.
- Si no existe, crearlo o dejar una excepcion explicita con owner y condicion de retiro en la task/handoff.
- Si la feature es pequena pero cambia una pantalla ya documentada, agregar un delta corto en el manual existente.

El manual debe quedar orientado al usuario-operador: claro, accionable y sin depender de leer codigo. No reemplaza la documentacion funcional (`docs/documentation/`) ni la tecnica (`docs/architecture/`, `docs/api/`, ADRs); las tres capas son obligatorias para cerrar una capacidad Greenhouse.
