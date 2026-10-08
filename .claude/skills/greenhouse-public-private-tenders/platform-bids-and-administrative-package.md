# Licitaciones por plataforma, expediente y anexos

Criterios operativos confirmados por el operador el 2026-10-08. Aplican al trabajo comercial autorizado;
no sustituyen las bases de cada proceso ni convierten una preparación en presentación.

## Plataforma y contacto con el comprador

- **Regla general**, no excepción UTEM: Wherex, Mercado Público y oportunidades consultadas en LicitaLAB
  se trabajan como procesos por plataforma. Revisar bases, preparar la oferta y presentar por el canal que
  corresponda. LicitaLAB es discovery/consulta de contratación pública conectado con Mercado Público;
  no presumir que sustituye la plataforma oficial de presentación. Wherex conserva su carril privado.
- No exigir contacto previo, email del comprador ni respuesta a un correo como condición automática de
  preparación o calificación del proceso. El comprador puede contactar después si le interesa la oferta.
  Tener un correo de facturación o de administración no acredita interlocución técnica ni autoridad de compra.
- Usar las consultas/foro cuando existan y estén vigentes; leer respuestas que puedan cambiar requisitos.
  Si no hay canal disponible, registrar la limitación y continuar con los supuestos expresamente acordados
  con el operador. No mantener un bloqueo imposible de resolver sólo por falta de contacto o aclaración.
- Distinguir una ambigüedad de alcance/precio de un requisito excluyente incumplido: los supuestos no
  permiten declarar cumplimiento falso. Conservar su fuente y efecto en precio, entregables y condiciones.
- Compra Ágil **no se reclasifica como trato directo** por una etiqueta agrupada del MCP/proveedor.
  La modalidad tampoco demuestra por sí sola ponderaciones, adjudicación al menor precio o IVA incluido/neto.
  Mostrar neto, IVA y total; una orientación económica del operador es un supuesto, no una cláusula del comprador.
- Preparar, completar, firmar, cargar un borrador y presentar son estados distintos. Para presentar se requiere
  la autorización que cubra el envío y después evidencia del comprobante/estado real de plataforma.

## Descubrimiento amplio y evaluación

Cuando el operador pide todas las oportunidades, usar el universo `all`, no sólo `recommended`. Declarar
fecha, vistas, filtros, paginación/límite, categorías cubiertas y tramos que no pudieron revisarse. Un límite
local o un `--match` sobre filas recolectadas nunca prueba cobertura total.

Mantener todas las categorías pedidas durante el barrido: CRM y relacionados, diseño/servicios creativos,
diseño web, SEO/AEO y licencias Claude/OpenAI cuando estén en el alcance autorizado. Diseño web es una
categoría adicional, no reemplaza las anteriores. No descartar licencias por la palabra «licencia»: revisar SKU,
tier, cantidad, plazo, elegibilidad de suministro, términos del proveedor, impuestos/FX, soporte y margen.
Un lote mixto requiere revisar adjudicación por líneas; no atribuir todo su presupuesto a la licencia de interés.
Una candidata comercial no amplía por sí sola el catálogo ni acredita autorización para revender.

Si el usuario ya pidió análisis profundo de todas las categorías, esa instrucción autoriza la investigación;
no imponer otra confirmación de candidatas antes de leer bases. Los writes CRM y la presentación conservan
su propio alcance autorizado. Entregar priorizadas, condicionadas y descartadas con motivos y evidencia.

## Originales, RAG y comprobación

- Inventariar todos los adjuntos antes de afirmar completitud. El texto RAG/`ask-docs` y una ficha impresa
  son evidencia auxiliar; no son los originales ni prueban lectura íntegra o revisión visual.
- Descargar los originales desde la ficha autenticada de la modalidad correcta, conservando los bytes.
  En Compra Ágil se observó `/search/agile/<código>` (UTEM, 2026-10-08); un enlace genérico
  `/search/details/<código>` que redirige a login no demuestra ausencia de adjuntos. Revalidar la ruta en UI.
- Separar originales, extracciones, análisis y documentos completados. Registrar nombre, origen, fecha,
  tamaño y validación de lectura; discrepancias de metadata se documentan, no se corrigen alterando el original.
- Verificar PDF legible y páginas; DOCX como ZIP válido y contenido completo. Al completar anexos, revisar
  texto, opciones marcadas, tablas, nombres, fechas y consistencia DOCX/PDF. Inspeccionar visualmente todas
  las páginas finales: firma visible y ubicada correctamente, sin recortes, vacíos o texto desbordado.
- Distinguir «verificado en disco» de «sincronizado a OneDrive»; el primero no prueba el segundo.

## Carpeta comercial y datos reutilizables

OneDrive: `Licitaciones/<Empresa o institución>/<N. Nombre del proceso>/`. Verificar el correlativo y conservar
licitaciones anteriores. Ejemplo: `UTEM/1. Agencia SEO-AEO`; usar guion cuando `/` sería separador de carpetas.
El código oficial queda en el expediente y sus referencias. Cada proceso nuevo tiene su carpeta independiente.
La carpeta OneDrive complementa el workspace canónico del repo; enlazar ambos sin mezclar clientes/procesos.

Fuente de datos confirmados: [EFEONCE_DATOS_PARA_LICITACIONES.md](../../../docs/commercial/EFEONCE_DATOS_PARA_LICITACIONES.md).
No copiar cuentas bancarias, teléfonos personales, RUT del representante ni imagen de firma a la skill.
Conservar fecha y autoridad de cada dato. Habilitación declarada por el operador no equivale a certificado o
readback live; ausencia de conflictos/deudas y modalidad de equipo/subcontratación se limitan al proceso indicado.

## Deck y técnica en Compra Ágil SEO/AEO (2026-10-08, UTEM)

- El deck **acompaña** a la oferta técnica; no la reemplaza. La técnica en Markdown sigue siendo la fuente y el deck
  se genera desde ella, nunca al revés.
- Si el deck agrega datos (revisión pública de búsqueda, equipo nominal, experiencia), la técnica se alinea en la
  misma pasada: UTEM pasó a v1.1 con §2.2 revisión pública, §8 equipo, §8.1 experiencia y fuentes nuevas.
- El archivo de handoff interno (`CLAUDE-HANDOFF-INTERNO.md`) puede quedar copiado en la carpeta de entrega de
  OneDrive: **no** forma parte del set que se carga. Revisar la lista de archivos antes de cada carga.

## Completar y firmar anexos

1. Leer el original, identificar anexos aplicables a persona jurídica y reunir datos desde la fuente anterior.
2. Confirmar hechos sólo cuando falten o haya conflicto; no volver a preguntar lo ya confirmado para ese proceso.
3. Una autorización específica de usar la firma existente permite insertar su imagen en los documentos cubiertos,
   una vez confirmados los hechos declarados. No requiere repetir el permiso en cada derivado Word/PDF del mismo
   paquete. No falsificar hechos ni asumir autorización general para futuros documentos.
4. La imagen de firma no acredita firma electrónica avanzada ni cumple por inferencia requisitos de certificación.
   Si las bases exigen otra modalidad, registrar y resolver ese requisito real.
5. Preservar originales, archivar borradores previos y generar editables/PDF finales con QA. Registrar autorización,
   hechos confirmados, versión y ruta del resultado, sin copiar el recurso privado de firma al repo.
6. Firmado no significa presentado: actualizar estado sólo con evidencia de cada acción.

## Seguimiento y continuidad

Leer [follow-up-agent/README.md](../../../docs/commercial/follow-up-agent/README.md) y su registro antes de
crear otra automatización o tarea. Alertas, borradores de correo, tareas Notion y MD de continuidad no prueban
que el correo se envió o que la oferta fue presentada. Mantener deadlines oficiales y acciones internas separados;
actualizar tareas existentes por ID cuando el alcance lo permita, conservando autor, fuente y siguiente acción.
