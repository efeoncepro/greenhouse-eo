# Pibank · Conciliación del paquete tras revisión de Claude

07-10-2026 · Preparación local, sin envío ni cambio de precio o investigación.

## Corrección

La técnica y el resumen exportados conservaban el alcance anterior mientras la oferta híbrida tenía la revisión más reciente. Las fuentes incluían instrucciones internas y describían principalmente la alternativa integral. El diagnóstico público había perdido presencia. Se corrigieron las tres fuentes cliente y sus PDFs como un paquete: gradual US$79.200, base US$4.500/mes, integral alternativa US$89.200. Se recuperan el diagnóstico fechado y sus límites; se corrigen README y anexo para Claude. Los anteriores se preservaron fuera de la carpeta para enviar.

[Conciliación interna](../../commercial/prospects/banco-pichincha-peru-seo-2026/reconstruccion-2027/CONCILIACION-COMERCIAL-Y-APORTE.md): gradual 2.654h e integral 2.924h antes de reserva, comparadas con sus propios precios. Márgenes centrales 26,9% y 29,9%; base 17,3%. La referencia 40% no se cumple. No se aprobó menor margen ni se cambiaron costos para alcanzarlo.

Aporte prospectivo y ejercicio desde lanzamiento siguen pendientes de datos bancarios. Se dejan entregables, método, responsables propuestos y texto de solicitud sin enviar. Las 39–195 cuentas con fondos son sensibilidad parcial del panel; no forecast de captación incremental, mínimo ni techo del programa. No se presume que el tráfico existente compense el resto.

## Verificación

- Técnica 5 páginas, resumen 2 y oferta 5: las doce páginas del PDF final inspeccionadas; fuentes cargadas, sin desbordes ni imágenes rotas.
- [30 comprobaciones de coherencia](2026-10-07-pibank-conciliacion-paquete-checks.json): lectura de PDF, precios, unidad, alcance, diagnóstico, ausencia de notas internas/alcance retirado y cinco hashes de investigación/modelos preservados.
- El renderer reconstruye siempre los tres PDFs, incluso con el antiguo flag `--hybrid-only`; rechaza notas internas antes de exportar. La validación del paquete tiene que ejecutarse sobre el directorio de salida antes de copiarlo.
- Archivos actuales en `01-Para-enviar/propuesta-tecnica-2027`, copias internas y paquete Claude sincronizados. ZIP de 84 archivos más manifiesto verificado por hash/CRC. Históricos identificados por carpeta.
- Excel, tarifas, inputs y cálculos de investigación no se recalcularon; se conservan los 56 checks/109 fórmulas del modelo híbrido como evidencia anterior, no tests nuevos de este turno.

No se certificó PDF/UA, Excel Desktop ni datos bancarios. No se enviaron mensajes, no hubo gasto de proveedor, contratación, implementación bancaria, commit o push en esta revisión. El paquete es consistente para revisión; no se declara cerrado el caso de negocio ni aceptada su rentabilidad.
