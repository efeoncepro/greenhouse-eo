# Pibank · Cotización detallada del programa anual 2027

08/10/2026 · Propuesta documental para revisión · EO–PIBANK–2027–01.

Pedido: revisar el negocio Banco Pichincha/Pibank con todo su contexto y preparar una cotización de alto detalle. Se revisaron el expediente comercial actualizado, capacidades/precios y calendario, acuerdos de entrega, SEO técnico, editorial/AEO, comunidad/PR, complemento del correo del 07/10 y reunión de Notion. HubSpot se consultó en vivo. No se modificó CRM ni se envió la oferta.

## Documento y edición

- [PDF en soles · 19 páginas](pen-v3/Pibank-Cotizacion-detallada-2027-PEN.pdf) · [HTML PEN](pen-v3/Pibank-Cotizacion-detallada-2027-PEN.html).
- [PDF original USD · 19 páginas](v1/Pibank-Cotizacion-detallada-2027.pdf).
- [HTML autónomo con fuentes y marca embebidas](v1/Pibank-Cotizacion-detallada-2027.html).
- Las dos versiones están también **directamente en la raíz de la carpeta comercial Banco Pichincha**, junto al deck; [ubicaciones y hashes de entrega](entrega-raiz.json).
- [Datos y contenido editables](cotizacion.json); versión 2 multimoneda. `v1/datos.json` conserva el snapshot USD original; `pen-v3/datos.json` incluye moneda de presentación y FX.
- [Manifiesto, fuentes y QA](v1/manifest.json). Evidencia visual de las 19 páginas y texto extraído en `v1/qa/`.

`cotizacion.json` mantiene cantidades y precios unitarios, planes mensuales y bloques de contenido. El renderer local compone los totales desde los datos y rechaza inconsistencias anuales/mensuales. Para una revisión, editar los datos y generar una carpeta nueva:

```sh
node docs/commercial/prospects/banco-pichincha-peru-seo-2026/reconstruccion-2027/cotizacion-detallada-2026-10-08/render.mjs nueva-version-usd --currency USD
node docs/commercial/prospects/banco-pichincha-peru-seo-2026/reconstruccion-2027/cotizacion-detallada-2026-10-08/render.mjs nueva-version-pen --currency PEN --fx fx/usd-pen-2026-10-08.json
```

Inspeccionar el PDF nuevo antes de sustituir la copia de entrega. No regenerar una versión enviada o firmada. El renderer rechaza salidas ocupadas y datos presentados/firmados.

Es un renderer **local de este expediente multimoneda**, basado en la composición A4 y assets oficiales. Comparte el helper documental de la [plantilla rápida A4](../../../../templates/cotizacion-a4/MULTIMONEDA.md), que también admite monedas ISO y FX explícito. No opera el pricing engine/Quote Builder Greenhouse, no crea `quotation_id` ni acredita maker-checker, margen o aceptación comercial. No ejecutar `render-src/build-client-package.mjs` para esta cotización: ese builder reconstruye otros documentos del expediente, que se conservaron intactos.

## Conciliación económica y decisión de packaging

Oferta estructurada y específica para Pibank Perú: servicio gestionado On-Going por 12 meses, más proyectos/campañas On-Demand y módulos recurrentes activables. No se declara un Product Service certificado, equipo dedicado ni horas abiertas. La unidad comercial principal es el programa anual y las capacidades activadas; las cantidades delimitan sus entregables.

| Ruta | Base anual USD | Activaciones USD | Neto anual USD | Promedio mensual USD | Máximo presupuestado mensual USD |
|---|---:|---:|---:|---:|---:|
| Base | 54.000 | 0 | 54.000 | 4.500 | 4.500 |
| Gradual, principal | 54.000 | 25.200 | 79.200 | 6.600 | 7.700 |
| Integral, alternativa | 54.000 | 35.200 | 89.200 | 7.433,33 | 9.700 |

Se eligió la gradual porque es la recomendación expresa de la oferta vigente. La consulta opcional al operador sobre ruta principal no recibió respuesta durante la preparación. Se conservan los precios existentes, sin descuentos ni nueva autoridad comercial atribuida al documento. La base sola es referencia interna; sin activar hub requiere infraestructura editorial equivalente. No se presenta en el PDF como sustituto con el mismo alcance.

Gradual: hub 3.000; calculadora 1.200; comparador 4.000; comunidad 10 × 1.000; PR 2 × 2.000; refuerzos 2 × 500; mantenimiento 10 × 200. Activaciones = 25.200. Reserva primer semestre 42.500, segundo 36.700. Las distribuciones son presupuesto, no fecha definitiva de factura.

Capacidad gradual: hasta 5 artículos/actualizaciones sustanciales por mes, máximo 60 espacios; 8h CMS/mes sin duplicar carga editorial; panel 24 preguntas × 3 superficies, 72 observaciones en M1 y 144/mes desde M2, total 1.656; 10 newsletters, 40 adaptaciones y hasta 160h de comunidad; PR 6 ángulos/24 propuestas; refuerzos hasta 20 oportunidades/12 gestiones; mantenimiento hasta 4h/mes compartidas entre un máximo de 3 herramientas. Planificador sólo en alternativa integral.

## Versión en soles y continuidad multimoneda

La moneda base continúa siendo USD. La presentación PEN usa **1 USD = S/3.437**, serie BCRPData `PD04640PD` (Sistema bancario SBS, venta), observación del **06/10/2026**. Consulta oficial realizada el 08/10: el 07 y 08 figuran `n.d.`; no se declara una tasa del día 08. [Serie oficial](https://estadisticas.bcrp.gob.pe/estadisticas/series/diarias/resultados/PD04640PD/html). [Respuesta conservada](fx/bcrp-PD04640PD-2026-10-08.json) y [snapshot](fx/usd-pen-2026-10-08.json) con par, propósito, consulta, fecha y hash. Equivalencia referencial; moneda y tipo de cambio contractual por acordar.

| Concepto | USD base | Equivalencia PEN |
|---|---:|---:|
| Servicio continuo anual | 54,000.00 | 185,598.00 |
| Activaciones graduales | 25,200.00 | 86,612.40 |
| Gradual recomendada anual | 79,200.00 | **272,210.40** |
| Integral alternativa anual | 89,200.00 | **306,580.40** |
| Servicio base mensual | 4,500.00 | 15,466.50 |
| Promedio gradual mensual | 6,600.00 | 22,684.20 |
| Promedio integral mensual | 7,433.33 referencial | 25,548.37 |

El promedio integral se obtiene del anual antes de redondear, sin convertir el promedio USD redondeado. Unidades, proyectos, hitos 50/50, subtotales, meses y trimestres concilian en centavos. El renderer rechaza una tasa cuya conversión redondeada no concilie estas líneas; no altera importes para ocultar diferencias. Impuestos y total facturable siguen pendientes, sin asignar IVA/IGV por elegir PEN.

Los slots `{{money:4500}}` y `{{money:3000/2}}` convierten sólo precios de la oferta. `{{currency.name}}`, `{{currency.code}}` y `{{currency.fxNote}}` mantienen textos coherentes. La meta bancaria de captación y ticket medio permanece en USD porque no es un precio cotizado. Los datos guardados en `pen-v3/datos.json` permiten regenerar con `--data pen-v3/datos.json` y nueva salida sin reconsultar tasa. `--locale` controla separadores; no el tratamiento fiscal.

La presentación documental ISO no amplía `FinanceCurrency`, el registro de moneda, providers o readiness del pricing engine. La plantilla/renderer no operan esos dominios ni el CRM. Se conserva la entrega original USD de `v1`.

Verificación PEN: 19 páginas A4, fuentes embebidas, texto seleccionable, encabezados/pies y números revisados. Las 19 páginas rasterizadas fueron inspeccionadas; tras corregir tres signos de puntuación, 16 páginas quedaron idénticas por hash y se reinspeccionaron 4/10/19. HTML sin desborde a 390px; ninguna cifra USD de precio remanente ni costos internos. Manifiesto con conciliación monetaria y hashes del renderer/helper. QA en `pen-v3/qa/`. El renderer también se ejecutó con `--currency USD`: mantiene neto 79,200.00 y las 19 hojas; la entrega histórica USD se conserva.

## Fuentes comerciales y readback

| Fuente | Uso y estado observado |
|---|---|
| [Oferta económica vigente](../oferta-hibrida/OFERTA-PARA-PIBANK.md), [catálogo](../oferta-hibrida/capacidades-y-precios.csv), [activaciones](../oferta-hibrida/activaciones-mensuales.csv) | Autoridad de alcance y precios propuestos; matriz y totales derivados de CSV, sin usar costos internos para la cara cliente. |
| [Acuerdos](../oferta-hibrida/ACUERDOS-DE-ENTREGA.md), [técnica/PR](../oferta-hibrida/SEO-TECNICO-Y-AUTORIDAD.md), [AEO](../oferta-hibrida/AEO-Y-AUTORIDAD.md), [comunidad](../oferta-hibrida/COMUNIDAD-Y-RECORRIDO.md) | Cantidades, coordinación, aceptación, garantía y términos propuestos. |
| [Complemento 08/10](../complemento-2026-10-08/README.md) y [meta integrada](../meta-integrada-2026-10-08/README.md) | Correo del 07/10: USD, audiencia A/B 35–55, lectura retrospectiva desde enero 2026. Meta del sistema completo: 15.200 cuentas con fondos. |
| [Estimación actualizada 08/10](../estimacion-seo-aeo-2026-10-08/README.md) | Escenarios condicionales separados de entrega/garantía; no se trasladaron proyecciones parciales históricas ni números de captación a cuotas contractuales. |
| [Reunión Notion del 06/10](https://app.notion.com/p/3f139c2fefe7800393f3cca210f9ea51?pvs=204) | Resumen y transcripción consultados en vivo. La duración inicial 3–6 meses y los claims del discurso no gobiernan la nueva oferta anual ni prueban casos/métricas. |
| [Deal SEO/AEO · 65352884246](https://app.hubspot.com/contacts/48713323/record/0-3/65352884246) | Banco Pichincha Perú - Agencia SEO/AEO. Portal 48713323. Readback: `amount=126596.45`, `deal_currency_code=PEN`, `dealstage=1356915244` (Sample Sprint / Validación), pipeline default; último cambio 08/10 18:33:12 UTC. Importe previo de CRM, sin FX utilizado ni conversión a USD. |
| [Deal CRM · 65718071655](https://app.hubspot.com/contacts/48713323/record/0-3/65718071655) | Pibank Perú - HuBSpot CRM. Etapa appointmentscheduled, moneda PEN, sin amount. Negocio separado; no se incluye su implementación en la cotización SEO/AEO. |
| [Company · 58611603277](https://app.hubspot.com/contacts/48713323/record/0-2/58611603277) | Banco Pichincha Perú, Lima, pichincha.pe. No convertir nombre comercial en razón social/RUC verificados. |
| [Contact · 251530718551](https://app.hubspot.com/contacts/48713323/record/0-1/251530718551) | Jesús Vargas Serpa, Especialista Digital & Performance, `juan.vargas@pichincha.pe`. Se conserva nombre observado; el alias de correo no lo convierte en Juan. |
| [Nota asociada · 117582411583](https://app.hubspot.com/contacts/48713323/objects/0-46/views/all/list?filters=%5B%7B%22property%22%3A%22hs_object_id%22%2C%22operator%22%3A%22EQ%22%2C%22value%22%3A%22117582411583%22%7D%5D) | Follow-up de LinkedIn del 28/09; histórico previo a reunión del 06/10, sin usarlo como estado actual de ausencia de reunión. |

Los hashes de las diez fuentes principales están en el manifiesto. El [snapshot de procedencia](provenance-snapshot.json) conserva el readback contra la exportación PEN y permite generar sin depender de otros documentos no versionados en el checkout. El renderer verifica ese snapshot antes de escribir y declara `sourceEvidence.kind: recorded_readback`, fecha, hash y `liveSourcesRechecked: false`; no simula una lectura vigente de las fuentes al regenerar. Los precios y el contenido renderizados salen de `cotizacion.json`. La radiografía histórica Pichincha no se convirtió en medición Pibank. Los documentos anteriores, investigación y PDFs de otros trabajos permanecen intactos.

## Tributos y decisiones abiertas

Los documentos muestran valores netos en USD o PEN y dejan impuesto/total facturable como **pendiente**, no cero. La contratación con una entidad peruana no basta para concluir exportación exenta ni determina automáticamente IVA 19%. Se consultaron fuentes oficiales: [SII exportador de servicios](https://www.sii.cl/destacados/exportador_servicios/), [factura de exportación](https://www.sii.cl/preguntas_frecuentes/factura_electronica/001_003_6293.htm) y [Circular 50/2017](https://www.sii.cl/normativa_legislacion/circulares/2017/circu50.pdf). La calificación de esta operación no se verificó: confirmar entidad/RUC, documentador tributario, retenciones y condiciones con Finance/Legal. No se asumió una tasa tributaria peruana. La versión PEN utiliza el snapshot FX referencial descrito abajo, sin decidir la tasa contractual.

Estado de pricing: `hypothesis_only` como propuesta para revisión, con economics existentes de planificación y sin certificación de costo/margen en esta tarea. Antes de formalizar: Commercial confirma ruta/condiciones; Operations confirma equipo/capacidad; Finance valida costos reales, caja y pagos; Finance/Legal valida tratamiento fiscal y contratación. No se vuelve a abrir una aprobación previa ni se exige permiso adicional para preparar el documento solicitado.

## Verificación y carpeta comercial

- Aritmética validada contra catálogo/calendario: base 54.000, gradual 79.200, integral 89.200; unidades anuales enteras; cada subtotal mensual coincide con sus módulos.
- PDF final: 19 A4 verticales, fuentes embebidas y texto seleccionable; folios y contacto de pie en las 19 páginas.
- Revisión visual de todas las páginas rasterizadas. Sin recortes, solapamientos o tablas ilegibles. Tras dos ajustes de copy, 17 páginas idénticas por hash y 2 páginas re-inspeccionadas.
- HTML con todos los assets embebidos; fuentes/imágenes cargadas, ningún slot pendiente y sin desborde horizontal a 390px. QA de contenido detecta ausencia de costos internos y de IVA 19% asumido.
- Copia local principal: raíz de `OneDrive-EfeonceGroupSpA/Alineación/4. Comercial/Licitaciones/Banco Pichincha`, junto al deck. El [manifiesto de entrega en raíz](entrega-raiz.json) conserva la ruta exacta del sistema de archivos, SHA-256 y lectura independiente del destino para los cuatro archivos.

| Moneda | PDF en raíz de Banco Pichincha | HTML en raíz de Banco Pichincha | Fuente preservada |
|---|---|---|---|
| USD | `Pibank-Cotizacion-detallada-2027-USD.pdf` | `Pibank-Cotizacion-detallada-2027-USD.html` | `v1/` |
| PEN | `Pibank-Cotizacion-detallada-2027-PEN.pdf` | `Pibank-Cotizacion-detallada-2027-PEN.html` | `pen-v3/` |

Los nombres USD de la raíz incluyen el sufijo de moneda para distinguirlos de PEN; sus bytes coinciden con los originales de `v1/`. Readback de los cuatro destinos: hashes idénticos a las fuentes y a sus manifiestos; `pdfinfo` confirma 19 páginas en cada PDF. `localCopyVerified=true`; `remoteSyncAudited=false`. Esta verificación acredita la copia local, sin auditoría de sincronización remota.

Se preservan las copias versionadas bajo `Cotizacion detallada 2027/2026-10-08-v1` y `Cotizacion detallada 2027/2026-10-08-PEN-v1`, con datos editables y respaldo interno separado. [Verificación original USD](entrega-local.json) y [verificación PEN](entrega-local-pen.json). No se regeneró ni sobrescribió el contenido de esas versiones.

Preparación documental y copias locales verificadas; oferta sin enviar ni firmar, sin cambio de etapa/amount en HubSpot y sin `quotation_id` Greenhouse. La ubicación de entrega no implica aceptación comercial ni altera el snapshot FX o el tratamiento fiscal pendiente.

Para volver de datos PEN a presentación USD, usar `--data pen-v3/datos.json --currency USD` con nueva carpeta de salida; descarta sólo el FX de presentación que ya no aplica y mantiene el precio base. Este expediente acepta únicamente `reference_conversion`. Regenerar conserva datos/tasa, pero no promete igualdad binaria del PDF por fechas y versiones del exportador. Los hashes de implementación del manifiesto histórico describen el renderer al momento de su exportación, no futuras ediciones del script.

**Cierre documental/skills:** tres subagentes actualizaron entrega y skills Codex/Claude, y auditaron el commit. [Prueba de checkout aislado](verificacion-checkout-aislado.json): el renderer regeneró PEN y volvió a USD desde `pen-v3/datos.json`, con 19 A4 y conciliación completa en ambas, sin ninguno de los diez documentos externos. Se conserva la [entrega en raíz](entrega-raiz.json), sin cambiar los PDF/HTML ni afirmar envío o sincronización remota.
