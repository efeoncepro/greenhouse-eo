# Método y procedencia

Corte 28-09-2026. Documentación interna para reproducir la lectura.

## DataForSEO

Ruta usada: cliente canónico `postDataForSeoTask` de `src/lib/ai/dataforseo.ts`, familia SERP, consumidor SEO/AEO según superficie. Mercado Perú, español, móvil, profundidad 20 en orgánico. No se utilizó una identidad de cliente inventada ni se atribuyó consumo a una organización ajena.

Archivos: `pichincha-serp-results.json` (primer batch: sólo una consulta exitosa; los errores no cuentan como ausencias), `pichincha-serp-results-2.json` (siete consultas exitosas), `pichincha-serp-results-3.json` (cuatro exitosas) y `pichincha-ai-mode-results.json` (cuatro exitosas). Total: doce consultas orgánicas distintas y cuatro AI Mode. Cada consulta usada debe tener statusCode/taskStatus 20000. Los archivos son resúmenes capturados de respuesta, no un volcado completo del proveedor.

`groupRank` es la posición orgánica dentro de su tipo; `rank` incluye otros elementos de SERP. Las posiciones del Prospect Case usan `groupRank`. No observado en top 20 no equivale a no indexado. No se levantaron volúmenes, GSC, GA4 ni conversiones. No convertir posiciones en ingresos perdidos.

AI Overviews de SERP y Google AI Mode son superficies distintas. Las respuestas repetidas o referencias duplicadas no representan share of market. Los snippets de terceros son evidencia de aparición, no autoridad para afirmar hechos financieros.

## Grader

La salida del Grader procede del worker y del snapshot público. No se puntúa, publica ni aprueba manualmente para agilizar el caso. Los proveedores API son una aproximación muestreada a motores de respuesta, no una réplica de sus productos de consumo. El pack estándar es de banca de personas, no un diseño exclusivo de ahorro. La pregunta de alternativas nombra BCP; ese anclaje afecta la lectura competitiva.

Se revisan preguntas, cobertura, estado del score, límites del texto capturado y posibles confusiones entre Pichincha Perú y entidades de otros países antes de entregar. Un bloqueo de acceso técnico es “sin dato” o “a validar”, no una carencia demostrada del banco.

## Personas y CRM

Capturas de LinkedIn: fuente directa del trigger. Perfil y publicaciones públicas: corroboración profesional. Apollo: descubrimiento de contacto; ZeroBounce: validación puntual de entregabilidad. Un correo inferido o una etiqueta de Apollo no prevalece sobre un resultado invalid. La autoridad comercial del cargo no se infiere del email ni de un agradecimiento en LinkedIn.

Company, Lead y asociaciones fueron leídos después de su escritura. No se crearon ingresos, acuerdos ni un comité ficticio. BICE/Security es experiencia declarada por Julio; la simulación sintética BICE encontrada en el repo no se usa como evidencia de resultados.
