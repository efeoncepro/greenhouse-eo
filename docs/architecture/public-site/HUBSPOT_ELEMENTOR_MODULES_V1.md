# HubSpot Elementor Modules V1

## Estado y autoridad

Publicado el 2026-08-30 por instrucción explícita del operador de implementar y publicar su export aprobado
Claude Design. Página WordPress `244079`, URL conservada: `https://efeoncepro.com/servicios-contratar-hubspot/`.
No se ejecutó migración a `/servicios/hubspot/`, ni se cambió Home, header o footer globales. El item
de menú `244116` conserva destino y posición; su etiqueta aprobada es «Servicios HubSpot».
El export aprobado de esta conversación prevalece sobre el rechazo de diseños anteriores en TASK-1352;
esto no declara completa la task ni sus otros entregables de investigación.

Última evidencia editorial: 2026-08-31, 11:27:34 UTC; hash Elementor
`cc9710c8adca07e54058c31e7edcecb0a80d78d2c95abf3e8042f3bddd2afe72`.
El [readback y recorrido anónimo](../../audits/public-site/2026-08-31-hubspot-industry-method-copy-evidence.json)
verifican la última revisión publicada, no un guard permanente: releer antes de una nueva escritura.

Fuente: `Documents/landing hubspot/HubSpot services offer/Landing HubSpot Pillar.dc.html`.
SHA-256: `f95b6254c2434b58a4d6855dded40dd3a38acb19b881e090e1928674ab8bb812`.
Original descomprimido sin modificación. Fuente de código desplegable:
`/Users/jreye/Documents/efeonce-public-site-runtime/wp-content/plugins/eo-elementor-widgets/`.

## Contrato de implementación

Extiende el patrón [Agency Elementor Modules](AGENCY_ELEMENTOR_MODULES_V1.md) y la decisión aceptada
[Growth Public Forms Engine](../GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_DECISION_V1.md), especialmente su
wrapper WordPress con renderer portable fijado por versión. No cambia fuente de verdad, API, schema,
permisos ni destinos compartidos: no requiere una nueva decisión de plataforma.

Once widgets nativos `greenhouse_hubspot_*`: hero, proof, hubs, atlas, sectors, licensing, assessment,
delivery, proof_ledger, faq, conversion. Cada uno tiene controles Elementor text/textarea/URL/Media,
colecciones editables cuando corresponde, ancla y controles de estilo/motion. 190 campos de texto raíz
verificados además de los repeaters; 23 paneles SSR (14 capacidades, 4 sectores y 5 etapas) y 6 FAQ. Cero widget HTML monolítico, DCLogic, sc-for o expresiones del export en runtime.

- `includes/hubspot/schemas/`: contenido/defaults/control schema `hubspotModule.v1`.
- `includes/hubspot/templates/`: HTML semántico servido por PHP, con escaping contextual.
- `includes/widgets/class-eo-hubspot-landing-{base,widgets}.php`: controles/registro/render.
- `assets/css/hubspot-{landing,elementor}.css`: estilo fuente y adaptación acotada a Ohio.
- `assets/js/hubspot-landing.js`: selección progresiva de 14 capacidades, 4 sectores y 5 etapas,
  enlaces internos, hover, teclado y cleanup idempotente. Contenido completo sin JavaScript.
- `assets/img/hubspot/`: badges oficiales, símbolo HubSpot e iconos SVG oficiales de seis Hubs, Smart CRM y Agent Hub.
- `scripts/public-website/hubspot-brand-assets.cjs`: adaptador aditivo del compilador; Hubs tiene 16 Media
  de identidad (8 oficiales, 3 motores de IA y 5 semánticos). ANAM usa Media/ALT
  `f033_imagen_anam`/`f034_alt_anam`, sin renumerar controles y reutilizando brand-logos.
- `scripts/public-website/hubspot-editorial-copy.{json,cjs}`: overlay editorial acumulativo de siete módulos,
  aplicado después del adapter de marcas. No modifica templates ni estilos.

Ohio mantiene el header/footer nativo. Metas de página: sin headline/breadcrumb antiguo, logo claro,
wrapper full width y margen lateral cero. Elementor guarda `post_featured_image` explícito: adjunto
`248703`, intacto. No usar un `get_settings()` sin esa comprobación para futuras escrituras.
Las URLs Media se guardan HTTPS también al ejecutar WP-CLI, donde `is_ssl()` puede ser falso.

## Formulario gobernado

`efeonce-hubspot-scope`, clave pública `bb220383-530e-4b3c-891f-bbdc75d7d112`,
surface `fhsf-efeonce-hubspot-scope`, versión publicada `fver-28caaab4-2676-4d6f-83ea-a6018a1071bd`.
Tres pasos: Tu situación, Qué necesitas, Tus datos. Doce campos con condiciones, selección múltiple,
correo corporativo, consentimiento y captcha. Publicado por authorDraftForm/reviewForm/publishForm,
sin SQL de edición de versiones publicadas. Destino `greenhouse_only`: no habilita entrega directa HubSpot.

La variante `hubspot_pillar` vive en `src/growth-forms-renderer/{renderer,styles}.ts`, no en el widget.
El host sólo proporciona tokens y tarjeta exterior. `assets/js/hubspot-forms.js` es un bundle portable
fijado a esos sources, construido por `build-hubspot-elementor-package.cjs` con hashes de origen.
Su publicación WordPress no equivale a desplegar el renderer general de Greenhouse/Vercel.
La corrección de `submitAttempted` al avanzar evita mostrar errores del paso anterior en un paso nuevo;
regresión cubierta por interacción real de renderer en jsdom.

La recepción sólo puede confirmarse después de `accepted` desde la API. No hay temporizador de éxito,
formulario paralelo ni write a HubSpot desde el navegador. Tracking usa los eventos canónicos sin PII;
no se ha certificado una conversión GA4 ni una notificación comercial mediante envío real.

## Entrega y mantenimiento

Compilación: `scripts/public-website/compile-hubspot-elementor-source.cjs` (sólo build-time).
Build y manifest: `scripts/public-website/build-hubspot-elementor-package.cjs <baseline-live>`.
Publicación: `deploy-hubspot-elementor-package.php` valida allowlist, SHA previo/nuevo, respalda archivos,
instala loader al final y purga cache. Nunca desplegar el checkout completo con WIP ajeno.
`publish-hubspot-elementor-page.php` usa Document::save con guard de hash, controles nativos y snapshot.
Las correcciones iniciales están registradas en finalize/normalize y no deben reejecutarse sin sus guards.

[Verificación fechada](../../audits/public-site/2026-08-30-hubspot-elementor-publication.md),
[guía funcional](../../documentation/public-site/hubspot-elementor.md) y
[manual/rollback](../../manual-de-uso/public-site/hubspot-elementor.md).

## SEO de la landing

Yoast conserva la propiedad del grafo. `includes/hubspot/seo.php`, registrado temprano desde el loader,
añade únicamente un `Service` conectado a la página y la organización existentes, usando título/descripción
nativos. El opt-in `_eo_hubspot_seo_enabled=1` limita filtros y HTTP→HTTPS a la página `244079`.
El hook de redirección debe existir antes de `template_redirect`; no cargarlo sólo durante render de widgets.
Los metadatos sociales/breadcrumb viven en Yoast; el cuerpo permanece en Elementor.

Las fuentes son dependencias de head, sin imports CSS anidados. La hoja Tabler completa se sirve localmente
para esta landing, con subset WOFF2 de sus 11 glifos y fallback original para otros iconos editados.
`proof-ledger.f032_destino` es el control URL del perfil oficial; se añade al final para no desplazar keys.
[Audit y evidencia](../../audits/public-site/2026-08-31-hubspot-seo-aeo.md).

Corrección visual autorizada 2026-08-31: timeline transparente con puntos/avance sincronizados al estado;
partner inferior con dos columnas y badge ampliado. Tres controles retirados, sin renumerar las claves restantes.
Compilador y renderer preservan esta revisión. [Detalle y rollback](../../audits/public-site/2026-08-31-hubspot-timeline-partner-fix.md).

### Identidad de producto en paneles · 2026-08-31

Los ocho iconos de producto se comparten entre tarjeta y panel SSR desde el mismo Media raíz. El renderer
propaga sólo los campos Media `brand_*` al render de repeaters Hubs; no sustituye texto de editor dos veces.
Cada plantilla conserva la identidad aunque se reordenen paneles. AEO y capacidades sin símbolo oficial
identificado usan iconos semánticos propios; no heredan ni se atribuyen un logo oficial de otro producto. Agent Hub es el recurso vigente de agentes en Brandfolder; el copy
«Breeze y agentes de IA» no cambió. Licencias añade Media/ALT `brand_hubspot_logo`/`brand_hubspot_alt`,
con wordmark claro oficial y autorización de uso confirmada por el operador.

MCP reutiliza los tres PNG originales de ChatGPT, Claude y Gemini de la página AEO: controles Media
`brand_chatgpt_logo`, `brand_claude_logo`, `brand_gemini_logo`, compartidos entre tarjeta y panel.
Grupo compacto sobre discos claros, sin recolorear archivos ni cambiar copy. No se modificó AEO.
[Fuentes y rollback](../../audits/public-site/2026-08-31-hubspot-mcp-logos.md).

Revisión semántica: las cinco tarjetas restantes (AEO, Sales Workspace, Customer Success Workspace,
Marketing Studio, Enablement) incorporan iconos Tabler descriptivos en azul claro `#cddeeb` y cinco
Media `brand_*_semantic_icon`. Se comparten con su panel SSR; las marcas oficiales no se recolorean.
Las 14 tarjetas tienen identidad visual; AEO usa un símbolo de búsqueda, no un isotipo oficial atribuido
a HubSpot. [Mapa, fuentes y rollback](../../audits/public-site/2026-08-31-hubspot-semantic-icons.md).

### Overlay editorial vigente

El JSON acumula `licensing`, `proof-ledger`, `conversion`, `assessment`, `faq`, `sectors` y `delivery`.
Incluye licencias, ANAM/partner, reunión, primer paso, FAQ, los cuatro sectores y las cinco etapas.
El export original sigue intacto. El adapter actualiza defaults y repeaters por `_layout`, no por posición;
las ediciones guardadas en Elementor prevalecen sobre defaults nuevos. Una revisión de copy requiere
sincronizar el overlay y los schemas, guardar sólo los campos autorizados mediante Document::save y
verificar el delta exacto del árbol. No recompilar ni desplegar todo el paquete para una edición textual.

La [primera revisión](../../audits/public-site/2026-08-31-hubspot-editorial-copy.md) eliminó jerga interna y
promesas absolutas de precios/consumo; la [última revisión](../../audits/public-site/2026-08-31-hubspot-industry-method-copy.md)
completó sectores, primer paso y método. Se conserva layout, Media, anclas, formulario, SEO y shell Ohio.
La altura natural y los saltos de línea pueden variar con el texto. El método empieza por «Revisar»;
Blueprint se explica como análisis opcional de pago y la operación continua depende de su contratación.
Las cifras ANAM aprobadas no reciben validación adicional por esta edición: su respaldo detallado sigue
como pendiente de evidencia en la auditoría SEO, sin inventar períodos, causalidad ni resultados adicionales.
