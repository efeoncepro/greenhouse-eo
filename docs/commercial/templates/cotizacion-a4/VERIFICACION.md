# Revisión de la plantilla · 08/10/2026

Revisión de `vista-previa/`, generado desde `ejemplo.json`. El ejemplo se identifica como «Sin validez comercial». No acredita una nueva oferta enviada.

- PDF final: cuatro páginas A4 verticales, todas rasterizadas e inspeccionadas. Encabezados, pie, folios, tabla, montos y condiciones legibles, sin recortes ni superposiciones.
- Texto extraíble comprobado en los cuatro folios, incluidos neto, IVA, total y equivalente mensual. Fuentes incrustadas y Unicode según `pdffonts`; PDF etiquetado, sin JavaScript.
- HTML móvil a 390 px: inspección visual y `scrollWidth = innerWidth = 390`. Imágenes decodificadas y fuentes cargadas.
- Cuatro pruebas Node PASS: aritmética/IVA, validación de datos/estados, resolución única de slots y escape de texto/mes opcional.
- Prueba de contenido extenso: el generador rechazó el desborde A4 sin crear archivos de salida.
- Reserva mínima del pie: 33,5 px; encabezado interior: 22,3 px. [Manifiesto](vista-previa/manifest.json) y [capturas](vista-previa/qa/).
- Cotización presentada a UTEM: HTML/PDF conservan los SHA-256 previos. Esta plantilla no altera su expediente ni el CRM.
- Paridad de skills, gobierno de contexto/handoff y cierre documental PASS al corte; diff sin errores de espacios.

SHA-256 del ejemplo revisado:

| Archivo | SHA-256 |
| --- | --- |
| `cotizacion.html` | `3b5b943e33bdea1e65fc38549821d1d96a9c643f8ced261025787923d21a430f` |
| `cotizacion.pdf` | `cfccae4b98f4f1b559698d2b91d696bbcc9853cbf36249c84e8e10fdacfd9c66` |

El generador deja futuras revisiones visuales y auditorías de PDF como pendientes: este resultado sólo aplica al ejemplo guardado.
