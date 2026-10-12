# Oferta económica

## Campaña creativa de lanzamientos «Innovar es hacerlo posible»

**Cliente:** Sika Mexicana
**Licitación:** N.º 1164 · Wherex
**Oferente:** Efeonce Group SpA
**Fecha:** octubre de 2026
**Vigencia:** 60 días calendario desde el cierre de la licitación

**Estado:** borrador para revisión del operador (12/10/2026). No presentada en Wherex. Documento: [PDF de cinco páginas](cotizacion/v1/cotizacion.pdf), compuesto con la [plantilla A4 de Efeonce](../../templates/cotizacion-a4/README.md) (versión de varias líneas) desde [`cotizacion/cotizacion.json`](cotizacion/cotizacion.json): `node scripts/documents/render-cotizacion-a4.mjs --data <json> --out <carpeta nueva>`. Revisión del 12/10: las cinco páginas del PDF, montos por extracción de texto, fuentes incrustadas. Copia en OneDrive: `Efeonce-Propuesta-Economica-Sika-1164.pdf`. Una primera versión en Excel (`economica:build`) se descartó el mismo día por indicación del operador: la oferta va con el render de Efeonce.

## Valor de un lanzamiento tipo

| Entregable | Qué incluye | Valor (MXN, sin IVA) |
|---|---|---:|
| Master Graphic | Pieza madre del lanzamiento: concepto, titular, sello de lanzamiento, firma de campaña y render oficial. Primera de las dos aprobaciones. | **14.200** |
| 5 publicaciones para redes sociales | Facebook e Instagram, derivadas del Master Graphic, con titular y texto de publicación. | 8.000 |
| 6 historias | Tres para Instagram y tres para Facebook. | 6.200 |
| Reel de hasta 30 segundos | Guion y storyboard, animación, titulares, locución en español de México y música con licencia. Con adaptación para TikTok. | 19.200 |
| Cartel tamaño tabloide | Punto de venta, listo para imprenta. | 4.600 |
| Cenefa de anaquel | Punto de venta, lista para imprenta. | 3.800 |
| Colgante | Punto de venta, listo para imprenta. | 4.200 |
| Anuncio tamaño carta | Medios impresos o punto de venta, listo para imprenta. | 3.800 |

## Resumen por bloque

| Bloque | Monto (MXN) |
|---|---:|
| Master Graphic | 14.200 |
| Adaptaciones digitales | 33.400 |
| Punto de venta e impresos | 16.400 |
| **Valor total por lanzamiento tipo** | **64.000** |

## Qué incluye el valor

- Dirección creativa, diseño, contenido y un Responsable de Cuenta.
- Dos aprobaciones (Master Graphic y conjunto final), con hasta dos rondas de ajuste consolidadas por pieza.
- Plazo de diez días hábiles desde la recepción del brief; el tiempo de revisión de Sika se agrega al calendario.
- Archivos finales en los formatos que Sika indique.
- Uso del sistema de campaña presentado en la propuesta (firma, sello de lanzamiento y reglas gráficas).

## Condiciones comerciales

- Valores en pesos mexicanos (MXN), netos. El documento muestra «IVA: No aplica» y el total igual al neto (`taxStatus: not_applicable`); los impuestos y las retenciones de cada parte, conforme a la normativa vigente.
- Una factura por lanzamiento, con la entrega del conjunto final. Pago a 30 días calendario desde la recepción de la factura.
- Los valores de las adaptaciones consideran el Master Graphic del mismo lanzamiento. Si formatos o cantidades cambian al inicio, el valor se ajusta sobre este desglose.

## Supuestos por confirmar antes de presentar

1. **Moneda.** Sika no ha respondido si cotiza en MXN o USD (respuesta del 09/10: «lo reviso»). La oferta va en MXN por decisión del operador.
2. **Impuestos y facturación.** El documento dice «IVA: No aplica», que supone una factura de exportación de servicios desde Chile. Si Finance define otra cosa, se cambia `vatRate`/`taxStatus` en el JSON y se vuelve a emitir. Falta el RFC de Sika Mexicana: bajo su razón social el documento dice «México».
3. **Forma de pago (30 días) y validez (60 días).** Propuestos por el agente; la ficha dice «pago por definir».
4. **Sistema de campaña.** El documento lo muestra como parte de cada lanzamiento, sin valor aparte.
5. **Varios lanzamientos.** No hay precio por volumen ni tarifa para el segundo lanzamiento.
