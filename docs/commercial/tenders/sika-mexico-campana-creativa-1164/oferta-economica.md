# Oferta económica

## Campaña creativa de lanzamientos «Innovar es hacerlo posible»

**Cliente:** Sika Mexicana, S.A. de C.V. (RFC SME7811306Z7, dato de facturación de la ficha Wherex)
**Licitación:** N.º 1164 · Wherex
**Oferente:** Efeonce Group SpA
**Fecha:** octubre de 2026
**Vigencia:** 60 días calendario desde el cierre de la licitación

**Estado:** borrador para revisión del operador (12/10/2026). No presentada en Wherex. Documento vigente: [PDF de cuatro páginas](cotizacion/v2/cotizacion.pdf), compuesto con la [plantilla A4 de Efeonce](../../templates/cotizacion-a4/README.md) (versión de varias líneas) desde [`cotizacion/cotizacion.json`](cotizacion/cotizacion.json): `node scripts/documents/render-cotizacion-a4.mjs --data <json> --out <carpeta nueva>`. Revisión del 12/10: las cuatro páginas del PDF, montos por extracción de texto, fuentes incrustadas. Copia en OneDrive: `Efeonce-Propuesta-Economica-Sika-1164.pdf`.

Versiones descartadas el mismo día por indicación del operador: una planilla Excel (`economica:build`; la oferta va con el render de Efeonce) y un desglose por pieza suelta (v1; «más que cotizar por pieza se cobra el refresh de marca, la conceptualización creativa y luego los entregables»).

## Valor de un lanzamiento tipo

| Componente | Qué incluye | Valor (MXN, neto) |
|---|---|---:|
| Evolución gráfica de la campaña | Línea gráfica fortalecida y ordenada como sistema: firma, sello de lanzamiento, reglas gráficas. | 16.000 |
| Conceptualización creativa y Master Graphic | Concepto del lanzamiento, titular y pieza madre. | 14.000 |
| Adaptaciones para redes sociales | 5 publicaciones estáticas y 6 historias (3 Instagram, 3 Facebook). | 11.000 |
| Reel de hasta 30 segundos | Con locución, música y adaptación para TikTok. | 14.000 |
| Punto de venta e impresos | Diseño de póster tabloide, cenefa, colgante y anuncio tamaño carta. | 9.000 |
| **Total por lanzamiento tipo** | | **64.000** |

Estrategia y concepto: 30.000. Entregables: 34.000.

## Lo que pide Sika (ficha y Centro de mensajes de Wherex, leídos el 12/10/2026)

- La ficha tiene **un solo servicio** a ofertar («Adaptación y desarrollo de materiales para campaña de productos de lanzamiento», cantidad 1), con **un monto total**; el selector de moneda incluye MXN y el total «NO considera IVA». Pide «propuesta económica con desglose de costos».
- Respuestas del 05/10 (20:04 y 20:09): cotizar un **lanzamiento tipo** con 5 posts estáticos, 1 reel para Instagram, 3 historias por red social, 1 póster tabloide, 1 cenefa, 1 colgante y 1 anuncio carta.
- Respuesta del 06/10 (12:22): la económica contempla «el desarrollo del Master Graphic y las adaptaciones indicadas en el brief»; un tarifario de referencia para piezas extraordinarias es opcional. Se espera «fortalecer, refinar y evolucionar visualmente la propuesta existente».
- Respuestas del 09/10: historias en Instagram y Facebook; el reel contempla su adaptación para TikTok; la volumetría es una referencia para comparar ofertas; para punto de venta piden sólo el diseño, no la impresión; condiciones de contratación y pago se revisan con quienes avancen; **esperan una propuesta de SLA por niveles de complejidad de los entregables**.

## Condiciones comerciales del documento

- Valores en pesos mexicanos (MXN), netos. El documento muestra «IVA: No aplica» y el total igual al neto (`taxStatus: not_applicable`).
- Una factura por lanzamiento, con la entrega del conjunto final; las condiciones de pago se acuerdan al formalizar el servicio.
- Si formatos o cantidades cambian, el valor de los entregables se ajusta sobre el desglose.
- Diez días hábiles desde la recepción del brief, la ficha técnica y los renders.

## Supuestos por confirmar antes de presentar

1. **Reparto de los 64.000.** Lo hizo el agente a mano. La base del precio (cotizador, supuestos y piso) está en [`research/2026-10-07-propuesta-tecnica-INTERNO.md`](research/2026-10-07-propuesta-tecnica-INTERNO.md) y no se entrega.
2. **Evolución gráfica en cada lanzamiento.** El documento la cobra como parte del lanzamiento tipo, no como pago único. Si fuera único, los lanzamientos siguientes quedarían en 48.000; el efecto sobre el margen está en el registro interno.
3. **IVA.** «No aplica» supone factura de exportación de servicios desde Chile. Finance decide; se cambia `vatRate`/`taxStatus` en el JSON y se vuelve a emitir.
4. **Validez (60 días).** Propuesta por el agente.
5. **Tarifario de piezas extraordinarias.** Sika lo admite como opcional; no se incluyó.
6. **Plazos.** El deck técnico propone diez días hábiles por lanzamiento y, desde el 12/10, tiempos por nivel de complejidad (lámina 15); ninguno tiene visto bueno de operaciones.
