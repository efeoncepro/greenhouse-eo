# DDSoft · Micrositio web · 08/10/2026

Estado: cotización documental preparada y PDF revisado. No enviada, firmada, aceptada ni registrada como Quote en Greenhouse. HubSpot se consultó en modo lectura; no se creó ni modificó un negocio.

## Oferta preparada

- [PDF de cuatro páginas A4](cotizacion/v1/cotizacion.pdf).
- [HTML autónomo para PDF](cotizacion/v1/cotizacion.html).
- [Fuente editable de datos](cotizacion/cotizacion.json) y [manifiesto](cotizacion/v1/manifest.json).
- Precio total del proyecto indicado directamente por Julio: **CLP1.200.000 netos + IVA228.000 = CLP1.428.000**.
- Una página en español con 4 a 5 secciones; diseño de plantilla personalizado en Figma; WordPress + Elementor; un formulario y una conexión a Excel o a un panel externo existente.
- Incluye adaptación móvil, SEO/configuración inicial, GA4 con permisos, pruebas completas, publicación, transferencia, capacitación y 30 días de corrección de defectos.

Copia local guardada en OneDrive: `Alineación/4. Comercial/Licitaciones/DDSoft/1. Micrositio web 2026/01. Cotizacion`, con PDF y HTML titulados `DDSoft - Cotizacion Micrositio Web`, datos, logo, manifiesto y evidencias QA. Hash del PDF copiado verificado; sincronización remota no auditada.

QA de esta versión: cuatro páginas del PDF exportado inspeccionadas visualmente; contenido, montos y fases reconciliados mediante extracción de texto; A4 vertical y fuentes incrustadas comprobados. El cronograma a tres columnas se comprobó con extracción `raw`; `layout` intercala sus columnas. El HTML pasó reserva de encabezado/pie y desborde móvil a390px. No equivale a certificación PDF/UA.

Se reutiliza la plantilla A4 por continuidad explícita del pedido de Julio. Es un documento comercial local para esta nueva oferta privada; no se declara una licitación pública ni se sustituye el [cotizador Greenhouse](../../../documentation/finance/cotizador.md).

## Datos y fuentes verificados

Lectura MCP HubSpot 08/10/2026: identidad Julio Reyes, usuario/owner75788512, portal48713323. Resultados completos: una Company, un Contact asociado y dos Deals por búsqueda DDSoft. No hay notas asociadas al Deal de landing en la búsqueda realizada; no se infiere ausencia de otros antecedentes.

| Fuente | Hecho utilizado |
| --- | --- |
| [Company DDSoft · 27775583337](https://app.hubspot.com/contacts/48713323/record/0-2/27775583337?utm_source=app_12360546_mcp&utm_medium=ai_agent&utm_campaign=search) | Nombre DDSoft, dominio/website ddsoft.cl, Providencia, Chile. |
| [Jorge Zepeda · 87929193794](https://app.hubspot.com/contacts/48713323/record/0-1/87929193794?utm_source=app_12360546_mcp&utm_medium=ai_agent&utm_campaign=search) | Project Manager, asociado a DDSoft. Se utiliza como atención del documento; no se presume autoridad contractual. |
| [DDSoft – Landing Page · 42986790504](https://app.hubspot.com/contacts/48713323/record/0-3/42986790504?utm_source=app_12360546_mcp&utm_medium=ai_agent&utm_campaign=search) | closedwon, amount1071000 CLP. Antecedente histórico, no es el nuevo precio ni se reutiliza para esta oferta. |
| [DDSoft – Dubai Perfumes · 35183790736](https://app.hubspot.com/contacts/48713323/record/0-3/35183790736?utm_source=app_12360546_mcp&utm_medium=ai_agent&utm_campaign=search) | closedlost, amount14.33 CLF. No forma parte del alcance cotizado. |
| [Snapshot financiero del repo](../../../operations/runbooks/TASK-708b-evidence-pre-apply-20260428.json) | Razón social histórica: DDSOFT asesorías y gestión de proyectos SpA. |
| [Contexto histórico preservado](../../../operations/agent-context-history/2026-07-19/project_context.legacy.md) · línea4554 | RUT76.613.599-4, de enriquecimiento previo de organización desde Nubox. No se encontró un campo RUT/razón social en el inventario actual de Company HubSpot; no se presenta como nueva validación tributaria. |
| Paquete oficial DDSoft, OneDrive · `Workspace/Portafolio/03 DDSoft/Branding/PNG/logo-color.png` | Logo existente copiado sin modificación a `cotizacion/assets/logo-ddsoft.png`. El manifiesto señala el dominio oficial como referencia de identidad; el archivo no se descargó desde el sitio. |
| Propuesta histórica `Alineación/4. Comercial/Licitaciones/DDSoft/DDSoft - 2707 - Soluciones Web.pdf` | Antecedente de relación y trabajo web. Sus precios y opciones no se trasladan a esta nueva propuesta. |
| Instrucción directa de Julio en este chat | Figma + WordPress/Elementor, 4 a 5 secciones, formulario, destino Excel/panel y CLP1,2M más IVA. |

## Decisiones propuestas y dependencias

“Microscopio web” se interpreta como micrositio. Se prepara una sola página con 4 a 5 secciones, no cinco páginas independientes. Estructura de secciones propuesta; el contenido y marca definitivos se acuerdan con DDSoft, sin presumir un rediseño completo de ddsoft.cl ni inventar el cliente final.

Plazo de cuatro semanas, pago50/50, hasta8campos, dos rondas de diseño, una revisión funcional, capacitación60minutos, soporte correctivo30días y vigencia hasta07/11 son condiciones propuestas por Efeonce para hacer la oferta concreta; no se atribuyen a un acuerdo previo de DDSoft.

Un destino de captura: tabla Excel en OneDrive/SharePoint con permisos o panel externo existente con API/webhook. DDSoft define el destino antes del inicio. El presupuesto no contempla construir un panel nuevo ni sincronización bidireccional; la conexión se validará antes de implementar. Las cuentas, licencias, correo, dominio y hosting necesarios son del cliente, con costos externos expresamente separados del precio de servicio.

La aceptación técnica prevista exige: diseño aprobado, 4–5secciones editables, navegación móvil/escritorio, envío válido guardado y recibido en el destino elegido, campos inválidos rechazados, aviso por correo, eventos de medición y entrega de Figma/accesos/guía. Son verificaciones futuras de la implementación, no pruebas ya ejecutadas del micrositio.

## Reproducción y conservación

Generador: `node scripts/documents/render-cotizacion-a4.mjs --data docs/commercial/prospects/ddsoft-micrositio-2026/cotizacion/cotizacion.json --out <carpeta-nueva>`.

Cada cambio requiere una salida nueva y volver a revisar las cuatro páginas del PDF. La cotización UTEM y sus manifiestos permanecen intactos. El precio fue fijado por el operador; no se simula costeo, margen validado, aprobación persistida ni emisión financiera. No contiene firma ni acredita envío.
