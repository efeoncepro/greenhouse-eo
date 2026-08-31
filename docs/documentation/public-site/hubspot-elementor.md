# Landing HubSpot: funcionamiento

La página pública [Servicios HubSpot](https://efeoncepro.com/servicios-contratar-hubspot/) reproduce el
diseño del export aprobado, con las revisiones editoriales e iconográficas autorizadas. Header, navegación,
controles globales y footer pertenecen a Ohio. La entrada del menú se llama «Servicios HubSpot».

El visitante recorre situación inicial, capacidades, familias de resultados, sectores, licencias,
primer paso, método, caso real, FAQ y solicitud de reunión. Los paneles cambian al seleccionar sus
botones; admiten flechas, Inicio y Fin. Los enlaces comerciales conducen a la solicitud de alcance.
Las preguntas se abren con controles semánticos. El movimiento respeta reduced motion.
El timeline muestra el punto activo y las etapas anteriores sobre una línea de avance; no usa botones llenos.
El bloque inferior de partner tiene dos columnas (Gold y directorio), con badge ampliado; se apila en móvil.

El formulario pregunta situación y Hubs actuales, necesidades/plazo/equipo y finalmente contacto.
Retroceder conserva las opciones. Los errores aparecen al intentar continuar o enviar, sin indicar
recepción falsa. La API exige captcha y consentimiento. Las solicitudes aceptadas pertenecen a
Growth Forms de Greenhouse; esta página no activó una nueva integración directa con HubSpot.

La edición del cuerpo se realiza con once widgets nativos Elementor, no con código HTML pegado.
El formulario conserva un único dueño: sus campos y reglas se versionan en Growth Forms.
[Contrato técnico](../../architecture/public-site/HUBSPOT_ELEMENTOR_MODULES_V1.md).

## SEO y fuentes de prueba

Título interno y breadcrumb: «Servicios HubSpot»; el título SEO descriptivo y la metadescripción se conservan.
Open Graph/Twitter reflejan la oferta actual. El schema Service procede de los campos nativos y se conecta al
proveedor del grafo Yoast. El perfil de partner ahora es un enlace editable del módulo Caso.
HTTP redirige a HTTPS sin cambiar slug ni parámetros de campaña. Header/footer no cambiaron.
[Revisión completa, mediciones y pendientes](../../audits/public-site/2026-08-31-hubspot-seo-aeo.md).

## Iconografía oficial y caso ANAM

Marketing, Sales, Service, Content, Data y Revenue incluyen sus SVG oficiales de Brandfolder, sin
modificar colores ni proporciones. Los seis controles «Icono oficial» son Media nativos del widget Hubs.
El widget Caso incluye «Logo · ANAM» y su texto alternativo; en escritorio se alinea a la derecha del
encabezado y en móvil se apila. La nota identifica el caso ANAM por instrucción del operador.
No se modifican cifras, title, descripción SEO, header ni footer.
[Fuentes, publicación y rollback](../../audits/public-site/2026-08-31-hubspot-brand-assets.md).

Revisión posterior: Smart CRM y agentes suman sus isotipos. En agentes se usa el recurso actual «Agent Hub»
del proveedor, sin renombrar el contenido aprobado. El mismo Media de cada tarjeta gobierna el logo del
panel seleccionado. No se identificó un logo oficial de AEO; se usa el icono semántico de búsqueda descrito abajo. «Licencias y operación» incluye el
logo completo claro de HubSpot; el operador confirmó autorización.
[Fuentes y evidencia](../../audits/public-site/2026-08-31-hubspot-product-marks.md).

MCP reutiliza los tres PNG originales de ChatGPT, Claude y Gemini de la página AEO: controles Media
`brand_chatgpt_logo`, `brand_claude_logo`, `brand_gemini_logo`, compartidos entre tarjeta y panel.
Grupo compacto sobre discos claros, sin recolorear archivos ni cambiar copy. No se modificó AEO.
[Fuentes y rollback](../../audits/public-site/2026-08-31-hubspot-mcp-logos.md).

Revisión semántica: las cinco tarjetas restantes (AEO, Sales Workspace, Customer Success Workspace,
Marketing Studio, Enablement) incorporan iconos Tabler descriptivos en azul claro `#cddeeb` y cinco
Media `brand_*_semantic_icon`. Se comparten con su panel SSR; las marcas oficiales no se recolorean.
Las 14 tarjetas tienen identidad visual; AEO usa un símbolo de búsqueda, no un isotipo oficial atribuido
a HubSpot. [Mapa, fuentes y rollback](../../audits/public-site/2026-08-31-hubspot-semantic-icons.md).

## Redacción comercial

Licencias presenta contratación y consumo estimado, sin prometer igualdad de precios ni consumo exacto.
El caso ANAM conserva sus cifras aprobadas, pero el respaldo detallado de 56%/76% sigue pendiente según
la auditoría SEO; la edición del texto no es una nueva validación de resultados.
La reunión con un especialista aclara prioridades y siguientes pasos para preparar la propuesta.
Primer paso y FAQ mantienen la misma promesa. La edición es textual, sin cambios de diseño ni formulario.
[Copy, evidencia y rollback](../../audits/public-site/2026-08-31-hubspot-editorial-copy.md).

Industrias explica objetivos y puntos de partida por sector; Primer paso distingue la reunión gratuita del
Blueprint opcional de pago. El método detalla acciones, entregables y validación en sus cinco etapas.
[Revisión completa y rollback](../../audits/public-site/2026-08-31-hubspot-industry-method-copy.md).
La última comprobación pública del 2026-08-31 a las 11:27:34 UTC cubrió 60 estados en escritorio, tablet
y móvil, teclado y contenido sin JavaScript. El copy acumulado afecta siete módulos; los otros cuatro
conservan su contenido. Esta revisión no certifica una conversión real, una notificación ni entrega a HubSpot.
