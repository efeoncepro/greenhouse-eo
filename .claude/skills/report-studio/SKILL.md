---
name: report-studio
description: Planifica, redacta, diseña, produce y verifica informes ejecutivos, de auditoría, desempeño o investigación para lectura autónoma. Úsala para crear o mejorar reportes completos, especialmente HTML como insumo de PDF o documentos recurrentes con evidencia y continuidad; no sustituye el análisis especializado ni convierte un informe en una presentación o dashboard.
---

# Report Studio

Convierte evidencia verificable en un informe que permite **entender el resultado, evaluar sus límites y decidir el siguiente paso**. Gobierna el documento completo, desde el encargo hasta el archivo final. El conocimiento sectorial y los datos pertenecen a sus fuentes y skills de dominio.

## Activación y resultado

Aplica a informes de gestión, resultados de servicio, auditorías, evaluación, investigación y diagnóstico. También a la mejora editorial o visual de un informe existente. Si sólo se pide resumir una cifra o corregir una frase, actúa proporcionalmente; no generes un expediente completo.

El entregable es el formato pedido por el usuario, no la tecnología intermedia. Si pidió PDF con HTML de insumo, entrega un **PDF revisado** y conserva su fuente. Si pidió Word editable, conserva semántica Word; no conviertas páginas en imágenes. Si pidió un dashboard, usa el flujo de producto y aporta aquí sólo el contrato de evidencia.

**No implica autorización** para publicar, enviar correos, subir documentos a terceros ni hacer nuevas compras de datos. Preparar y guardar localmente es distinto de distribuir. No conviertas una carencia de datos en una solicitud rutinaria de permiso: avanza con lo disponible y pregunta sólo por un dato imprescindible.

## Fuentes y módulos

Carga según la decisión pendiente, no todo el paquete por defecto:

| Necesidad | Recurso |
|---|---|
| Encargo, arquitectura de lectura y resumen ejecutivo | [Brief y narrativa](references/brief-and-narrative.md) |
| Cifras, comparabilidad, afirmaciones, recurrencia y acciones | [Contrato de evidencia](references/evidence-and-continuity.md) |
| Elección de gráficos y lenguaje visual cuantitativo | [Visualización de datos](references/data-visualization.md) |
| Retícula A4, tipografía, tablas, fichas, marcas y navegación | [Diseño editorial](references/editorial-design.md) |
| HTML→PDF, Word, fuentes, enlaces, impresión y accesibilidad | [Producción y PDF](references/pdf-production.md) |
| Cierre, evaluación independiente y condiciones de bloqueo | [QA y entrega](references/quality-and-delivery.md) |
| Todo informe emitido por Efeonce | [Overlay Efeonce](references/efeonce-overlay.md) |
| Procedencia de recomendaciones y límites de estándares | [Fuentes de mercado](SOURCES.md) |

Plantillas operativas: [brief](templates/report-brief.md), [ledger de evidencia](templates/evidence-ledger.csv), [plan de acciones](templates/action-register.csv), [revisión](templates/review.md) y [manifiesto de PDF](templates/pdf-check.json). Son formatos adaptables, no formularios que deban aparecer en el informe del cliente.

## Flujo de trabajo

### 1. Reconstruir y delimitar

Identifica lector, decisión, emisor, período, corte de comprobación, formato final y grado de conocimiento. Reconoce archivos existentes, auditorías anteriores, tareas y cambios ya autorizados. No reabras decisiones acordadas por una compactación. Escribe un brief corto con supuestos razonables cuando el encargo ya los resuelva.

En informes recurrentes, lee los informes anteriores completos y conserva IDs de hallazgo. Antes de recomendar, distingue trabajo ejecutado, trabajo contratado pendiente, propuesta de alcance nuevo y dependencia externa. Cuando somos la agencia autora/publicadora, rendimos cuentas de nuestra gestión.

### 2. Fijar el contrato de evidencia

Prepara el ledger antes de diseñar: fuente, período, población, unidad, denominador, método, fecha de extracción, incertidumbre y responsable. Separa observado, calculado, estimado y propuesto. Un score sin pertinencia del instrumento puede ser un resultado técnico pero no una medida válida de negocio.

Valida relaciones aritméticas y comparabilidad. Ausente no es cero, producción no es resultado comercial y correlación no acredita causalidad. No grafiques dos fuentes como un embudo si no comparten población y trazabilidad. Conserva una fuente de datos y deriva sus apariciones en texto, gráfico y tabla.

### 3. Diseñar la lectura

Presenta en este orden lógico: resultado y significado → evidencia relevante → límites que afectan la decisión → acciones y cierre → detalle y método. Adapta el orden a auditoría, desempeño o investigación; no impongas una plantilla de marketing a una investigación técnica.

El resumen debe contestar qué cambió, por qué importa, qué sabemos y qué haremos. Las frases de acción declaran responsable, dependencia y evidencia de cierre; una fecha sólo si existe o está acordada. No sustituyas esto con un listado de recomendaciones genéricas.

### 4. Elegir la dirección visual

Parte de marca, assets y fuentes reales. Compara 2–3 direcciones sólo cuando no exista una dirección aprobada. En una mejora acotada, conserva la composición y corrige el defecto observado. Define tamaño físico, retícula, márgenes del pie, jerarquía y densidad antes de maquetar todo.

Prueba primero una apertura, una página densa y una ficha de acción. Los gráficos deben responder una pregunta; las imágenes deben explicar o aportar evidencia. No generes fotografía ni iconografía decorativa para llenar espacio. Usa una familia real de iconos y registra su procedencia.

### 5. Componer y exportar

Usa la ruta apropiada de [producción](references/pdf-production.md). Mantén texto seleccionable y recursos reproducibles. Un archivo largo necesita navegación documental: índice real, marcadores, secciones y folios. Reserva el pie antes de paginar; repite cabeceras y no reduzcas todo el cuerpo para lograr un número de páginas arbitrario.

En Efeonce aplica el overlay desde el inicio: URL bubble oficial, contacto y logos. No entregues el HTML como sustituto del PDF acordado.

### 6. Verificar e iterar

Verifica el **archivo exportado** con [QA](references/quality-and-delivery.md). Usa `scripts/check_pdf.py` con un manifiesto adaptado si el destino es PDF. La salida automatizada es un preflight, no una certificación visual ni PDF/UA.

Inspecciona todas las páginas. Revisa las más densas a tamaño de lectura, y valida contenido, pies y navegación en todas. Encarga revisión independiente cuando lo pida el usuario o el informe lo justifique y esté autorizada. Un hallazgo accionable exige corregir, regenerar y revisar la región afectada; si cambia la paginación, vuelve a comprobar índice y páginas completas.

### 7. Cerrar con estado preciso

Entrega el archivo final y un resumen breve de cambios relevantes. Conserva fuente editable, datos reproducibles o su referencia, fuentes de assets y evidencia de QA. Distingue generado, revisado, guardado en un sistema, publicado y enviado. No afirmes accesibilidad certificada por tener tags ni éxito de entrega por recibir un 2xx.

## Lo que bloquea una entrega

- Afirmaciones materiales sin fuente o comparaciones inválidas que alteran la conclusión.
- Faltan secciones solicitadas, evidencia histórica o campos del informe anterior sin decisión explícita.
- Logo, contacto o período incorrectos; en Efeonce, pie institucional ausente.
- Texto cortado, tablas ilegibles, índice falso, fuentes sustituidas o recursos que no aparecen en el PDF.
- Resultado parcial presentado como completo o certificado.

No bloquees por preferencias menores que no afectan lectura, fidelidad ni exactitud. Documenta el alcance real de la verificación; no inventes puntajes para aprobar la propia composición.

## Compatibilidad y mantenimiento

La skill funciona en Claude y Codex con `name` y `description` comunes. Los archivos compartidos se espejan; sólo `agents/openai.yaml` es local a Codex. La configuración institucional vive en sus dueños, no en una copia de datos dentro de esta skill. Verifica herramientas/documentación cambiante antes de depender de una versión. Los ejemplos son pruebas, no reglas de un cliente para todos.

## Metodología de deck ejecutivo mensual

Para resumir una auditoría o informe en un deck para directorio, cargar `docs/operations/EFEONCE_EXECUTIVE_REPORT_DECK_METHOD_V1.md`: continuidad de evidencia, producción mensual frente a acumulada, On-time con denominadores, narrativa ejecutiva, selección visual antes de implementación, marcas/pie/contraportada, HTML como insumo del PDF A4 y verificación del archivo final. El caso Berel conserva sus decisiones y límites; las cifras no se reutilizan entre meses.
