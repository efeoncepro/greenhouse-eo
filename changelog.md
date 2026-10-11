# changelog.md

> Ventana reciente de cambios internos reales. El historial completo y verificable se consulta en
> [docs/changelog/internal/README.md](docs/changelog/internal/README.md). No cargar snapshots completos al
> inicio ni usar una entrada histórica como contrato vigente sin contrastarla.
>
> Techo operativo: 60 entradas, 2.000 líneas y ~60.000 tokens. Rotación:
> `pnpm docs:context-rotate --apply`.

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

## 2026-10-04 — Build de fuentes independiente de Google Fonts

- ISSUE-178: Geist/Poppins y Bricolage del login pasan a `next/font/local`, WOFF2 con origen/licencia/hash fijados. El build comprueba los archivos y bloquea la reintroducción de loaders remotos; roles y variables CSS preservados. Build completo, 90 tests y GVC en tres tamaños PASS; staging READY y fuentes/login/sesión verificados; producción sin promover.

## 2026-10-04 — AI Visibility Report: hero, ancho y hover

- Hero con demostración interactiva y pausa directa; shell/escena acotados en pantallas amplias. Think `6aab907`/`56a300a` publicados y verificados en producción a 1710/2560 px. Hover primario azul profundo `06449ca` validado y comprometido sólo local, pendiente de push.
- [TASK-1966 y evidencia](docs/tasks/complete/TASK-1966-ai-visibility-report-landing-la-orbita.md): docs funcionales, motion, wireframe y skill espejo alineados. Contrato Marca primero sin activar; producción conserva Entrega primero. Sin envío real ni cambios de backend/PDF.

## 2026-10-04 — Discovery de población cliente SEO

- TASK-1690: [discovery](docs/audits/seo/2026-10-04-task-1690-discovery.md) de contratos, fixtures y UX con tres subagentes; decisión GSC clics/CTR y rank independiente, cobertura/null/cero y cola canónica documentados. Estado `Diseno`; selección visual e implementación pendientes. Baseline: 53 tests PASS. Sin código ni cambios runtime.

## 2026-10-04 — Ownership editorial y de informes SEO

- El flujo editorial pertenece a Marketing Studio: TASK-1667/1669 → EPIC-049; TASK-1668 conserva medición/outcomes en EPIC-022. La auditoría técnica y su distribución especializada pertenecen a Insights: TASK-1672/1673 → EPIC-045, reusando renderer y transporte existentes.
- [Mapa vigente y tareas pendientes](docs/audits/seo/2026-10-04-epic-022-ownership-and-remaining-work.md), arquitectura, criterios e índices reconciliados. GA4 TASK-1284 y referrals TASK-1787 distinguen código/evidencia histórica existente de sus pendientes reales. TASK-1284 pasa a in-progress con evidencia fechada y pendientes explícitos. Sin código, tareas nuevas, cierre de implementación ni cambio de runtime.

## 2026-10-04 — SEO: reconciliación documental de EPIC-022

- Censo de 84 hijas (43 complete, 3 en curso, 38 to-do), estados TASK-1655/1670/1671/1672/1805 e índices conciliados. Flag de hallazgos y selectores Improved ETV revalidados en worker activo; pendientes conductuales conservados.
- [Evidencia y límites](docs/audits/seo/2026-10-04-epic-022-documentation-reconciliation.md). Sin cierres de tasks, cambio de configuración, calls pagadas, backfill ni emisión de informes.

## 2026-10-04 — Spot «Los Sparks»: Studio, Metricool y naming «Efeonce | AEO»

- Spot cargado en Marketing Studio como CMP001-08 de CMP-001 (orgánico) y programado en Metricool: IG lun 05-oct 14:00 (portada 4:5), LinkedIn jue 08-oct 11:00; media re-alojada con SHA-256 idéntico.
- Operador: la marca es Efeonce y el servicio «Efeonce | AEO» (con barra). Regla en el [ADR de naming](docs/architecture/EFEONCE_AEO_BRAND_NAMING_DECISION_V1.md), skills de copy/AEO/social y `docs/context/`; recetas de Studio y Metricool documentadas.

## 2026-10-04 — Insights: reconciliación de estado y revisión de cierre

- EPIC-045 sincronizado a `in-progress`; 24 hijas (7 complete, 6 en curso, 11 to-do). Contratos TASK-1957/1962 desplegados, modelo vigente 1.4 y ocho flags Production exactos ON. Índices, arquitectura y skill espejo actualizados; historial conservado.
- [Auditoría](docs/audits/insights/2026-10-04-epic-045-closure-review.md): 116 pruebas PASS; sin planes post-release en la lectura acotada. TASK-1962 candidata a cierre tras verificación productiva; las seis hijas en curso conservan sus pendientes. Sin cierres de tasks, cambios runtime ni envíos.

## 2026-10-03 — Efeonce Insights: figuras nuevas en producción y cierre de TASK-1974

- Release `36a73e7b7e19`: el planificador elige la figura por la pregunta; PDF y deck tienen página de cifras, cascada,
  waffle, dona y barras apiladas; tarjeta con isotipo del canal; Think `0c5701a`; AXIS `v0.3.42`.
- Verificación con GA4 real de Berel: apiladas y dona correctas. Dos correcciones: una parte que redondea a 0 % se lee
  «<1 %» y la cifra queda unida a «%»/«pp» con espacio duro en los slots del PDF y el deck. El blanco del disco de canal
  pasa al rol `channelDisc`. TASK-1974 complete; TASK-1975 espera la revisión del operador.

## 2026-10-03 — AI Visibility Report PDF: refresh local

- TASK-1938: mismo motor y snapshot; seis páginas Engine con órbita, logos oficiales y cierres de cliente/prospecto, en ES/EN/PT-BR. Texto largo conserva contenido con continuación; fuentes registradas de forma aditiva. Las RRSS oficiales se muestran completas a su escala y el eslogan mantiene sus tres pesos.
- [Dossier](docs/ui/reviews/TASK-1938-ai-visibility-report-pdf-la-orbita/README.md): diez PDFs auditados, 24 comparaciones color/gris, 108 pruebas focales, TypeScript y build PASS. Fallo de metadata Manzanitas corregido en un commit separado; siete tests y sincronización PASS. Code complete local; rollout, revisión del adjunto real y paridad web/print pendientes. Sin push ni envío real.

## 2026-10-03 — Elenco 2D de Efeonce canonizado

- [Canon](docs/operations/brand-characters/EFEONCE_2D_CAST_V1.md): Tomás, Camila, Renata y Mateo, ficticios y
  dibujados, representan al grupo de compra del cliente y supervisan a los Sparks; estilo «vector con volumen» con
  sello Efeonce (línea de luz azul + objeto azul).
- Hojas de giro y expresiones en `ai-generations/_identidad-elenco-2d/`, selladas en el lock (catálogo `ELENCO_2D`,
  rol `ilustracion-2d`, 560 assets) y publicadas en el canon. GPT Image 2.5 Sunburst, ≈ USD 0,78.
- Primer uso: spot animado Sparks × Efeonce AEO aprobado (49,6 s). Método transversal de video y workflow del spot 2D
  documentados: [método](docs/operations/creative-production/VIDEO_PRODUCTION_AND_POSTPRODUCTION_V1.md),
  [retrospectiva](docs/operations/social/2026-10-03-sparks-aeo-spot-animado-production-method.md),
  [funcional](docs/documentation/creative/spot-animado-2d.md), [manual](docs/manual-de-uso/creative/producir-spot-animado.md);
  `motion-design-studio`, `audio-studio`, guía de modelos, SPARKS_V1 e identidad sonora al día.

## 2026-10-03 — Video con IA: taxonomía, producto e interfaces y pipelines por plan (EPIC-051)

- [Taxonomía de video](docs/architecture/GREENHOUSE_AI_VIDEO_PRODUCTION_TAXONOMY_V1.md) por fase, tipo, look,
  dificultad y fidelidad, neutral de motor y con «propio primero, proveedor como puente»; [anexo de producto e
  interfaces con personas](docs/architecture/GREENHOUSE_AI_VIDEO_PRODUCT_AND_INTERFACE_V1.md); matriz operación × motor
  y presupuestos por toma en la guía (§4.3, §7.4).
- [ADR-025 aceptada](docs/architecture/creative-studio/EFEONCE_VIDEO_PRODUCTION_PIPELINE_ARCHITECTURE_V1.md): plan
  declarativo por toma, ejecutores y compuertas; ningún video generativo con referencias sin aprobar.
- EPIC-051 con TASK-1979…1989 (runner TASK-1989); capas funcional y manual; sin runtime ni gasto.

## 2026-10-03 — Decisiones de marca convertidas en capacidad de ejecución escalable

- [Dirección estratégica aceptada](docs/architecture/EFEONCE_BRAND_DECISIONS_SCALABLE_EXECUTION_DECISION_V1.md): hacer operables, automatizables y escalables
  decisiones creativas para acelerar salida al mercado preservando calidad, consistencia e identidad; recorrido
  completo o tramo delimitado. Visión, modelo corporativo, oferta, método y skills/routing enlazados; validación
  económica/comercial permanece por oferta. Cambio documental local, sin alterar runtime ni publicar.

## 2026-10-03 — Elenco de marca, vistas puestas elegidas por el comando y Nexa con expresiones reales

- Elenco ficticio en `ELENCO` (Hum, Karo, Sophia, Isabella, Antonio) con su biblia; grupos de 3 a 5 entre elenco, Nexa
  y Julio (sin elenco obligatorio). Julio: 37 con canas prematuras en su bloque.
- `foto:prompt` elige la vista puesta por silueta, giro (45°/70°, frente y espalda), cámara baja y oclusión, e imprime
  las alternativas; 126 vistas puestas nuevas en bomber, softshell, polo, hoodie y gorra; el macro viaja con la prenda.
- `foto:isotipo` compone por detrás de los oclusores, con pliegues y escorzo; `canon-sync` baja del canon GCP lo
  sellado que falta o está viejo; `pnpm foto:rostro` mide la proporción del rostro.
- Nexa: la expresión va detrás del ancla frontal (la pose sale de la escena), ancla v2 con la proporción del canon y 25
  expresiones casi de frente aprobadas. Exploración archivada (> 1,3 GB liberados).

## 2026-10-03 — Técnicas de edición sobre el pipeline de inpainting (TASK-1973)

- Nuevo `pnpm ai:layers` (Seedream Layerize sobre cualquier imagen: capas con nombre, máscara por elemento y clean plate
  = base + las demás capas; la base se cobra como una capa) y `pnpm ai:inpaint erase|move|place|background|expand` +
  `--zone-resolution`. `place` incorpora un elemento de una foto en otra y el modelo sólo hace el acabado.
- Canario real (≈ USD 0,90): la sombra proyectada se mide contra el plate y nunca se toma la de un vecino; borrar con
  el plate y Sunburst por instrucción borran limpio (Flare con máscara y Flux Fill dibujaron otra taza; el residuo se mide contra el fondo);
  `expand` usa Flux Fill por defecto (Flare reencuadra, Sunburst copia el relleno en espejo). Herramienta out-of-band.
- Slice 2 (`foto:expandir` sobre el núcleo) pasa a TASK-1925; BFL FLUX Tools (Outpainting, Erase) queda como follow-up.

## 2026-10-02 — Login V4 premium y novedades del login (TASK-1963, TASK-1964)

- Novedades del login gobernadas: tabla `greenhouse_core.login_announcements` (migración aplicada en la instancia
  compartida), reader `listActiveLoginAnnouncements` (hasta 3 publicadas y vigentes por prioridad), `GET
  /api/public/login-announcements` y API admin con `login_announcements.manage`. Vigentes: Engine, Brand y Growth.
- `/login` pasa al V4 premium en develop/staging: formulario sobre papel con Efeonce como marca principal, escenario con
  fotos producidas, lente reconstruida al canon de AXIS y anclada al sujeto, voz con anillo y esfera, transición «La
  lente te lleva adentro» y mejoras de contraste en avisos y alertas. No está en producción; `pnpm test` completo pendiente.
- Canon de foto y skills: la referencia de cara del equipo pasa al avatar con la bomber; personajes de casting con retrato ancla (piel v3) antes de la escena; casebook cine (fallas 14–20, `LG1`/`LG2e` como recetas), registro cine (excepción del login), guía de modelos, regla `brand-photography` y `efeonce-graphic-line` (lecciones, ledger, aplicación §A12) actualizados.
- Docs: [funcional](docs/documentation/identity/novedades-del-login.md) y [manual](docs/manual-de-uso/identity/administrar-novedades-del-login.md).

## 2026-10-02 — Inpainting de imagen y video en los CLIs (TASK-1965)

- Nuevos `pnpm ai:mask` (máscara canónica con fuentes, operaciones y guardas de cobertura) y `pnpm ai:inpaint image|video`:
  recorte con contexto, generación por adaptador (OpenAI, `fal:flux-pro-fill`, Seedream edit; video `fal:flux3-edit`),
  recomposición obligatoria y verificación del archivo en delta máximo 0, dry-run, caché por hash y manifiesto.
- Medido: Sunburst con máscara devuelve un panel negro plano (3 de 3) → default Flare con máscara y Sunburst sin máscara
  con corrección de color en anillo; modo boceto y referencias (como el Markup de ChatGPT). `ai:image --mask` avisa que
  no recompone. Canario en `ai-generations/2026-10-02_task-1965-canary/`. Herramienta out-of-band: no toca runtime.
- Cerrada el 2026-10-03: en producción con el release `fe261ca27`; siguiente paso, TASK-1973 (expandir, capas, borrar, fondo y detalle).

## 2026-10-02 — Marketing Studio: commands del catálogo verificados en staging (TASK-1894, Entregable B)

- Studio suma escrituras gobernadas del catálogo: máquinas de estado (revisión, creativo, medios, lanzamiento),
  campaña, brief literal, conceptos, piezas, derechos, copy byte a byte, anuncios, flight, líneas de presupuesto
  (sólo `proposed`; aprobar crea la `approved`) y posts planificados (Studio nunca publica). Las aprobaciones son T2:
  sólo una persona por la CLI `pnpm studio:write … --apply --confirm`; por API, 403 `confirmation_required` hasta
  TASK-1899.
- Autoridad por campaña (`source_of_truth`): escribir en una campaña de OneDrive responde 409
  `campaign_not_studio_owned`; el importador salta las campañas `studio`. API 1.4.0, 44 tools, permisos proyectados y
  `ETag`. Migración `1790967435017` aplicada en staging y producción (aditiva); sandbox `CMP-900` en staging.
- **No está en producción:** Studio `a8c7886` sin empujar a `main`; Greenhouse `9d0d698d4` (capabilities
  `marketing_studio.asset.write` y `.campaign.write`) sólo en `develop`; gateway con filtro de sólo lecturas preparado
  sin sincronizar. Entregable C diferido.

## 2026-10-02 — CMP-004 completa: 44 piezas aprobadas, horizontales 1,91:1 y grilla de Studio corregida

- Las 11 horizontales 1,91:1 (LinkedIn 1200×628 y Meta horizontal) se hacen desde la escena 1:1 aprobada:
  `pnpm foto:expandir` gana `--lienzo`, `--ancla`, `--fundido` y `--reponer no` (`2ff39fe96`); la escena va a la
  derecha al 80 % del alto y el modelo extiende sólo la columna de texto. Concepto reducido aprobado por el operador:
  la bajada va en el titular del anuncio (CDR-012, `ec9e8a00d`). `foto:cta:gate --reproducir` exit 0 en las 11.
- Entregadas en canvas, OneDrive Finales (`CONTROL-DE-PIEZAS` 44 filas), Marketing Studio y AXIS Lab (`25f1b40`).
  En Studio se subieron con `--ratio 191x100` (la API exige `^\d+x\d+$`) y se aprobaron: 44 piezas, 0 pendientes.
- La grilla de piezas de Studio tenía columnas fijas y escondía las 1,91:1 cargadas y aprobadas; ahora muestra las
  proporciones presentes en la campaña y rotula `191x100` como «1,91:1» (Studio `23e5787`, verificado en el navegador).
  Commits de este repo sin push.

## 2026-10-02 — Marketing Studio: puerta de ingreso de originales en producción (TASK-1894, Entregable A)

- Studio 1.3.0 recibe finales por una sola puerta: `studio.asset.upload.request` (URL firmada V4 directo al bucket)
  y `studio.asset.version.create` (confirmación; el worker recalcula sha256, tamaño, tipo y proporción antes de crear
  la versión en `pending_review`). Kernel de commands con autoridad, `riskTier`, idempotencia y `dryRun`; CLI
  `pnpm studio:upload` (cliente de API `studio:assets:write`) y CLI de operador `pnpm studio:review`.
- Migración `1790956839977_asset-ingest-door` aplicada en staging y producción; `STUDIO_UPLOADS_ENABLED` y
  `MEDIA_WORKER_UPLOAD_VERIFY_ENABLED` ON. 33 piezas de CMP-004 cargadas en producción, pendientes de revisión.
  Capability en Greenhouse y sync del gateway quedan pendientes.
  [Task](docs/tasks/in-progress/TASK-1894-marketing-studio-write-commands-authority-cutover.md).

## 2026-10-02 — Kortex profundamente hibernado y forecast GCP reconciliado

- Kortex queda reversible y sin compute productivo: Vercel pausado, Cloud Run internal/IAM/min0, Cloud Tasks
  pausado/vacío y SQL `STOPPED/NEVER`. Septiembre registró CLP 10.480,64 netos; el residual ~CLP 3.500/mes y el
  forecast consolidado CLP 237.068,14/mes (rango 230k–245k) siguen modelados hasta contar con ventanas completas
  post-corte. [Estado, método y evidencia](docs/audits/cloud-cost/CLOUD_COST_AND_KORTEX_HIBERNATION_2026-10-02.md).

## 2026-10-02 — CMP-004 reorientada por servicios y voz con el acento de la línea (CDR-012)

CMP-004 pasa de cuatro conceptos a un ad por servicio de Creative Services (S01–S08). Los ocho pilotos 4:5 se regeneraron con geometría nativa de ad (banda oscura continua arriba, objeto negro mate al pie para la firma) y pasan `foto:cta:gate --reproducir`. El compositor de CTA suma `graphicLine`: el anillo y la esfera de la voz toman el acento de la línea desde AXIS (sin el campo, growth, idéntico a antes; regresión 183/184 iguales, mutante `voz-acento-de-linea`). El CTA queda en contorno naranja tras comparar 40 composiciones.

## 2026-10-02 — Registro cine: siete decisiones del operador, segunda prueba ciega y barra de luz recalibrada (TASK-1926)

El operador aceptó siete decisiones (aros de Nexa dorados, destacado «Agents» intacto, escala vertical por encuadre, mirada al panel en la sección partida, vestuario por persona real o por rol, luces prácticas como bokeh frío en cine, una sección partida por deck vía el validador del plan); `foto:prompt` aplica en cine las tres de toma. Segunda prueba ciega: tres sesiones nuevas llegaron solas usando `cine-reviewer`. Un experimento de luz mostró que las fotos aprobadas también llevan luz suave de frente: la barra del revisor quedó calibrada contra el plate de la receta. Además: hoodie royal en cine, restos documentales fuera, `__revisar` en `foto:cine:nueva` y revisor más barato. Demás registros sin cambio.

## 2026-10-02 — El registro cine se opera sin consultor (TASK-1926, delta b)

Ninguna sesión llegaba sola a una foto cine aprobable. La ficha cine gana cinco campos propios (`llave`, `primerPlano`, `fondo`, `fenomeno`, `alcance`) que `foto:prompt` compila y avisa cuando faltan; `pnpm foto:cine:nueva` parte de una de las diez fotos aprobadas (`scripts/foto/cine-recetas.json`) y `foto:generar` no gasta con la escena de la receta; `pnpm foto:validar:cine` mide sombra y reserva vertical (calibrado: stickers, relleno y azul rey bajo luz azul no se separan en píxeles y los revisa el agente `cine-reviewer`); casebook, manual y punteros en canon, regla y skills. Los demás registros no cambian: `scripts/foto/regresion-prompt.mjs` compara todas las fichas en disco (0 no cine cambiadas). AXIS: sección «Registro cine» en el banco fotográfico (commit local).

## 2026-10-02 — Traje biónico de Nexa: kit, catálogo y escena cine con Sparks (TASK-1940)

El traje de ficción de Nexa deja de describirse a mano: kit de 10 vistas desde `NX5b` (aisladas, puestas en Nexa A, macro de la placa y lentes biónicos), entradas `traje-bionico-nexa` y `lentes-bionicos-nexa` en `foto:prompt` con la guarda `validarTrajeNexa` (sólo Nexa, sólo `"registro": "cine"`), marcas armadas en la referencia (isotipo incrustado en el pecho y logo completo serigrafiado en la espalda, con `foto:isotipo --marca logotipo`) y la escena aprobada `NX7d`, canonizada en el registro cine 1.7.

## 2026-10-01 — Sparks: los agentes de Efeonce como personajes del kit (TASK-1941)

Diseño elegido por el operador (el Spark de «Agents» alejado de Astro Bot: flota, chispa del Nexa Mark, órbita y tres ventanas de la nave). Spark base en 26 vistas + 4 escenas con Nexa, plantel de cinco con accesorio y gesto, entradas `spark-*` en `foto:prompt` con la guarda `validarRobots` (robots sólo como Sparks; nunca documental) y canon [`SPARKS_V1.md`](docs/operations/brand-characters/SPARKS_V1.md) con revisión de colisión del nombre. Kits en OneDrive `13- Branding/Sparks/`. Plantel aprobado; task cerrada.

## 2026-10-01 — La órbita: perfiles sociales de Efeonce aprobados y documentados

Portadas de LinkedIn (página y perfil personal), Facebook y YouTube, avatar de redes y nueve destacados de Instagram con su historia completa 9:16, aprobados por el operador; kit del equipo con «Tu portada de LinkedIn» y aviso 1:1. [Línea gráfica §10.1.1](docs/operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md#1011-perfiles-sociales-de-efeonce-aprobados-el-2026-10-01) · [manual de uso](docs/manual-de-uso/creative/usar-portadas-y-destacados-sociales-efeonce.md). Publicación en las redes pendiente.

## 2026-10-01 — Workbench: producción modular y Lab premium integral documentados

PR15 integra producción modular SKY e identidad Git; PR16/17 integran el Lab premium completo, superficies equilibradas, coreografía de scroll y menús de familias/tokens con teclado y fallback nativo. Snapshot v6 publicado inicialmente protegido; [acceso sin login autorizado y verificado](docs/operations/creative-production/WORKBENCH_LAB_ACCESS_STATE.md) para compartir el Lab. Skills espejo, [continuidad vigente](docs/operations/creative-production/WORKBENCH_CURRENT_STATE.md), funcional y manuales enlazan contratos/evidencia del repo Workbench. Base documental PR246 integrada en develop; contratos 0.2, Metric/onboarding/IA y Efeonce ID conservan sus pendientes independientes. Este cierre documental no cambia runtime ni CLIs de Greenhouse.

Colección candidata de 101 familias / 1.919 variantes nativas y 303 originales, selección exacta por kind/tamaño y página `/iconos/` enlazada desde Recursos. Código/docs Workbench en commit local `af6f5e2`; skills Codex/Claude y manuales/continuidad sincronizados. [Cierre y evidencia](docs/audits/creative-workbench/2026-10-01-sky-icons-documentation-closure.md). Sin push/deploy ni admisión nueva a jobs; CLIs Greenhouse intactas.

Corrección SKY local: contenido 1.5.0/destino 1.2.0, los 76 badges tarifarios LEFT, pie legal por función y relaciones de destino/promoción revisadas. Export v6 de 24 adaptaciones y 394 pruebas PASS; docs y ocho referencias de la skill sincronizadas con subagentes. [Cierre documental](docs/audits/creative-workbench/2026-10-01-sky-layout-feedback-closure.md). Aceptación visual pendiente; sin push/deploy ni cambios de motores Greenhouse.

## 2026-09-30 — Efeonce: demostración contextual como diferenciador comercial

El operador reconoce «hacer que el cliente experimente nuestra capacidad antes de comprarla» como diferenciador. [Metodología](docs/commercial/EFEONCE_VENTA_CON_DEMOSTRACION_CONTEXTUAL_V1.md) documenta Berel, SKY y Pichincha; canon de marca y estrategia, skills Agency/Brand/SEO con espejos y referencias actualizados. Intensidad, presupuestos y métricas siguen propuestas; no se promete conversión ni se cambia el pipeline.

## 2026-09-30 — AEO X-Ray: demo multipieza aceptada, publicada y documentada

- Think conserva y extiende el X-Ray original: landing y artículo por manifiesto, cuatro etapas, radiografía acoplada, oportunidad evidenciada, banners y derivados sociales/video, marcas oficiales, footer, iconografía, transiciones nativas, selector y telón de 1400 ms. Fix productivo de unidades CSS optimizadas `s`/`ms`; 44 checks de apertura pasaron también en producción.
- Think `be8d484`, deployment `dpl_7AEWYHEiiWWUyCiwrcTj1US1e3vB` READY con alias; entrega comercial autónoma `sample_` aceptada. Foundation Greenhouse/contrato AXIS preparados y probados; migración/grant/runtime compartido pendientes, sin promoción Greenhouse. [Dossier](docs/think/aeo-xray-implementation-dossier-2026-09-30.md), triple documentación, kit multicliente y skills espejo actualizados.
- HubSpot: deal 65352884246 → Presentación de soluciones por instrucción y readback; brochure alojado en HubSpot, correo previo a reunión redactado con enlaces X-Ray e Insights. Envío del correo no verificado.

## 2026-09-30 — Deck SEO/AEO (Search Visibility 360) aprobado y en el catálogo de recetas (TASK-1949)

- El operador aprobó el deck SEO/AEO de «La órbita» en tres documentos (completo 33, brochure 24, propuesta 29; cinco capítulos, línea Engine). Catálogo `efeonce.deck-slide-recipes.v1` a 100 recetas: seis nuevas sin plantilla todavía (`content-brand-family`, `content-service-mockups`, `content-report-formats`, `content-committee-deck`, `content-industries`, `content-markets`), `productMark` opcional (lockups de submarca), eyebrow de `proposal-cinematic-seo`/`-aeo` con `requiredUnless: productMark`, `section-cine-team.body` opcional y 27 usos aprobados; tres planes golden validados e intents de documento de ejemplo.
- Reglas: anotaciones fuera del deck, una sola sección partida, casos con imagen de ambiente puesta en escena y el logo del cliente compuesto, logos de clientes con autorización. Por decisión del operador, las cifras de los casos, su fuente, los formatos de Insights, las industrias y la cifra de Bresler quedan tal cual, sin marca de «provisional» («asumo la responsabilidad»). Norma §4.6, catálogo, manual, doc funcional, arquitectura y skills al día. Plantillas del Composer (Slice 2) y AXIS (Slice 3) en curso.

## 2026-09-30 — Keywords relevantes por URL en DataForSEO CLI 1.1.0 (TASK-1948)

- `site-keywords` y `quick keywords-for-site` aceptan dominio, subdominio o URL con tipo explícito. Conservan path/query y entregan relevancia con categorías, tendencias y métricas Ads en JSON/CSV; no declaran rankings. Paginación acotada, entitlement SEO, techo progresivo y checkpoint bloquean recompra silenciosa tras fallo o costo desconocido.
- [Manual](docs/manual-de-uso/growth/dataforseo-cli.md) y [auditoría](docs/audits/seo/2026-09-30-task-1948-site-keywords-cli-verification.md): 96 tests verdes, dry-runs y SemVer verificados; typecheck sin WIP ajeno pasa, global conserva 17 errores en deck HubSpot. Implementación local sin POST pagado, commit/push ni deploy.
- Validación posterior autorizada en Berel **MX**: 20 keywords en dos páginas, JSON/CSV coincidentes, scope `matched` y resume de ambas páginas sin recompra; USD 0,0284 reconciliados. Manual/ADR y skills DataForSEO, SEO/AEO y Berel incorporan selección editorial del ruido, mercado explícito y límites de `total_count` y atribución de dominios. La captura CL anterior queda separada del resultado mexicano aplicable al cliente.

## 2026-09-30 — Creative Workbench: rutas nativas selladas y `creative:status` por REST

- Delta documental posterior: skill `efeonce-creative-workbench` completa y espejada Codex/Claude,
  ADR de aislamiento, planes y evidencia SKY, TASK-1945/1946/1947 y TASK-1952 (Efeonce ID diferido).
  Routers y [continuidad fechada](.codex/skills/efeonce-creative-workbench/references/state-continuity.md)
  apuntan al harness activo en Workbench. Lotes PR 11 y contornos PR 12 integrados allí; referencias
  corregidas con `--native-previews`, corridas antiguas requieren una ejecución nueva. Sólo docs en
  Greenhouse: sin engines, auth nueva, sync total, broker deploy ni IA habilitada.
- `export-manifest.json` gana `native.paths` (harness propio del workbench) y `native.reserved` (gates, workflow
  `gates`, `CODEOWNERS`, `.workbench/**`). Lo nativo sale del plan; el sync lo **entrega** (lo suelta del sello sin
  borrarlo), sella la lista en `sync.lock.json → native` y aborta si una ruta del plan ya existe en el workbench sin
  estar sellada. Si `pnpm-lock.yaml` es nativo, no se regenera.
- El gate `managed-drift` de la plantilla lee `native` **sólo del sello**: `.workbench/native-ownership.json` (PR #3 del
  workbench, de Codex) deja de eximir. `creative:status` usa sólo REST, verifica la integridad del sello recalculando el
  plan de su commit, marca PRs que tocan lo gestionado y lista dependencias que faltan en el `package.json` nativo.
- Gate nuevo `native-policy` (reglas selladas para lo nativo): prueba el guardarraíl con sondas, exige denegaciones y
  hook en `settings.json` y rechaza código fuera del broker que llame a un proveedor de IA. Sobre el estado del PR #3
  sólo marca `tools/provider-doctor.ts` (llama a OpenAI directo con la llave de Secret Manager).
- Tras una revisión adversarial con subagentes (y una segunda revisión con acceso a GCP) se endureció todo: `native-policy`
  detecta además imports que llegan a los engines históricos, `import 'openai'`, `*_API_KEY`, `gcloud secrets` y Secret
  Manager; el guard corre al final y en una copia con sondas
  aleatorias, se detectan SDKs e imports del adaptador del broker, `disableAllHooks`, sellos sin commit, PRs que
  cambian el sello sin ser sync (CI compara contra la base) y rutas nativas no canónicas.
- Nota «En el Workbench»: el sync la inserta al inicio del `SKILL.md` de las 12 skills que mencionan `foto:*`, `ai:*`
  o `assets:pull`, con sus equivalencias en el harness (`marca:*`); la fuente de la skill no cambia (ADR §8.7).
- `creative:sync` y `creative:status` trabajan en un clon temporal del workbench: el checkout local (donde trabajan
  la persona o Codex) no se toca; `--in-place` es opt-in y se niega si no está limpio, en `main` y al día (§8.8).
- `control.json → clientesPorDefecto: "todos"`: por decisión del operador, todo el equipo produce para todas las
  marcas (ADR §8.6).
- Cierre de la revisión (tercera pasada): el guardarraíl debe bloquear también el push a `main` escondido (`/usr/bin/git`,
  `sh -c`, `$(…)`, `+main`, `xargs`, `remote.origin.push`, `--mirror`) y, en la plantilla, cualquier push estando en
  `main`; `native-policy` sigue imports con backticks y marca un archivo que nombra la ruta de un engine que llega al
  proveedor (se ejecuta sin import). `clients/brands.json` queda nativo con riesgo residual documentado (§8.5). Sobre el
  head `289a12e` del PR #3 la política nueva no da falsos positivos y sólo marca las seis formas de push que su guard
  todavía deja pasar: el sync de transición espera a que el PR #3 las porte.
- 37 pruebas del plano de control; sync simulado sobre `main` y sobre el PR #3: 11 rutas entregadas sin borrar y tests
  del harness de Codex iguales antes y después. Decisión: §8 de
  [EFEONCE_CREATIVE_WORKBENCH_DECISION_V1.md](docs/architecture/EFEONCE_CREATIVE_WORKBENCH_DECISION_V1.md).
