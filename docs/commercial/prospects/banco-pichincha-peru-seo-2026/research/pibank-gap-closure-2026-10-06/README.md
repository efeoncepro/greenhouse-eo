# Pibank · Cobertura competitiva y baseline de enlaces

06-10-2026, hora Chile; últimas consultas UTC 07-10. Investigación local por `pnpm dataforseo`, Perú 2604/es, org Efeonce autorizada. Se concilió el costo incierto antes de nuevas compras; no se usó transporte alternativo ni se repitió el request abortado.

## Cobertura cerrada dentro de filtros

| Banco | Nuevos registros retornados / total del filtro | Alcance |
|---|---:|---|
| Interbank | 342/342 | Dominio interbank.pe, URLs de cuentas/ahorro/depósitos/inversión y keywords de ahorro/cuenta/rendimiento |
| Scotiabank | 314/314 | Mismos criterios, scotiabank.com.pe |
| BBVA | 423/423 | Mismos criterios, bbva.pe. Consulta nueva más selectiva, distinta del POST histórico abortado |
| BCP | Sin compra adicional | Captura previa preservada, filtro más amplio de cuenta/ahorro/depósito/transferencia; no afirmar filtros idénticos con los otros bancos |

La consolidación de 2.555 observaciones guardadas deja **2.278 registros únicos banco/keyword normalizada/URL y 1.594 keywords distintas**. Si un registro se repite se conserva la consulta más reciente; URLs diferentes siguen separadas. El número de keywords no es público único y el inventario no es un censo de todas las consultas bancarias.

Los [19 representantes](plan-busquedas.csv) mantienen su volumen estimado y fecha de fuente original. Se actualizan sus evidencias de posiciones desde las capturas adicionales. Canastas mensuales: directa3.740, condicional3.330, marca rival18.300 y educación/asistencia5.680. No sumar variantes ni carriles como usuarios o tráfico propio; posición Labs es snapshot de proveedor, no comprobación SERP en vivo. [Observaciones con URL/fechas/ID](capturas-competidores.csv), [resultados y recibos](resultados.json), [script local](consolidar.py).

## Conciliación y costos

El portal confirmó el task **10061922-1987-0381-0000-51045e53a5b8**, BBVA offset500/limit1000, completado con **USD0,132**. Su botón de resultado estaba deshabilitado: esas1.000 filas no se inventan ni se incluyen en el dataset. [Recibo de conciliación](conciliacion-bbva.json). La nueva consulta BBVA incorpora filtro de keyword y agota423 resultados, sin repetir el POST previo.

Cinco nuevas consultas: Interbank USD0,05304; Scotiabank USD0,04968; BBVA USD0,06276; summary de backlinks USD0,024036; detalle USD0,024036. **Nuevo costo USD0,213552**. Ledger ampliado confirmado **USD1,491372**; sumando investigación previa reutilizada de USD0,07714, exposición conservadora **USD1,568512**, bajo el techo operativo USD2. No quedan costos desconocidos. Los previews son gratuitos y los costos reales proceden de tasks completados, no sólo de estimaciones.

## Baseline de autoridad

[Summary y detalle](baseline-backlinks.json): DataForSEO Domain Rank **8/100**, summary **dos backlinks / un dominio referente**; detalle **un enlace seguido activo** desde afluenta.pe hacia la home, visto por el índice el29-09. La [página referente](https://afluenta.pe/pibank-peru-cuenta-de-ahorros-digital-beneficios-trea-y-como-abrirla/) se abrió y contiene enlace hacia Pibank; la lectura web no certifica por sí sola su atributo seguido. Summary y detalle son observaciones distintas y sus conteos no se fuerzan a coincidir.

No es Moz Domain Authority, Brand Authority ni Ahrefs Domain Rating. No es prueba de todos los enlaces existentes: el índice puede no cubrir aún las notas de lanzamiento. El score spam entrante5 y del target0 son campos distintos. No recomendar disavow a partir de ese único enlace ni inferir una relación comercial con su propietario. Baseline del programa a renovar al inicio; coberturas previas no se adjudican al retainer.

## Uso en la propuesta

El [calendario](../../reconstruccion-2027/CALENDARIO-INTEGRADO-2027.md) lleva apertura M1 y calculadora/fondeo M2 antes de las comparaciones y PR M3/M5/M8/M11. El Excel incorpora las19 familias y el alcance SEO/GEO+PR, conservando el modelo de requisitos desde una meta. Las nuevas capturas mejoran cobertura y priorización; no generan un forecast de aperturas sin baseline propia y conversiones observadas.
