# 09 · Informes de auditoría SEO/AEO para clientes

> Carga antes de redactar una auditoría inicial o recurrente y al incorporar un
> nuevo run del Grader. Este módulo aplica el oficio de la skill; el proceso
> compartido vive en `docs/operations/SEO_AEO_CLIENT_AUDIT_REPORTING_OPERATING_MODEL_V1.md`.
> El contexto específico del cliente vive en su skill y sus fuentes operativas.

## 1. Reconstruir la gestión antes de recomendar

Lee las auditorías anteriores completas, no sólo sus resúmenes. Conserva los ID
de hallazgo y registra por cada uno: evidencia anterior, evidencia actual y fecha,
estado actual, alcance pendiente, responsable y criterio de cierre. Usa los estados
corregido, parcial, persiste y no comparable del canon compartido; regresión y
hallazgo nuevo pueden añadirse como marcas de contexto. Falta de datos no equivale a resolución. Un rastreo menor no acredita mejora sobre un censo mayor.

Cruza el informe con el Content Hub, briefs, tareas de redacción, carga CMS,
aprobaciones, publicaciones y ajustes técnicos. Una etiqueta antigua no prueba
inactividad ni retraso del cliente; contrasta la página y las tareas relacionadas.
Separa autoría, publicación, verificación y responsabilidad técnica. No atribuyas
a la agencia cambios del proveedor web cuya ejecución no esté documentada.

## 2. Rendir cuentas desde nuestro rol

Cuando somos la agencia que redacta y publica, el informe habla de nuestra
gestión: qué hicimos, qué resultados medimos y qué nos queda corregir. No basta
con cambiar pronombres: revisa si cada recomendación desconoce trabajo existente
o transfiere una obligación propia al cliente. Reserva las nuevas propuestas
para ampliaciones reales; los pendientes de la gestión vigente se asumen.

| Evitar cuando se trata de nuestro trabajo | Redacción que asume el rol, sólo si está respaldada |
|---|---|
| «Se localizaron versiones de los artículos» | «Redactamos y publicamos las piezas del ciclo» |
| «Además de verificar la calidad de lo publicado» | «Corregiremos los enlaces y metadatos pendientes en los contenidos que publicamos» |
| «Comprobar que las especificaciones lleguen al CMS» | «Actualizaremos los campos del CMS y comprobaremos su presentación pública» |
| «Se recomienda iniciar un calendario editorial» si ya operamos uno | «El calendario vigente cubre estas categorías; proponemos ampliar la cobertura de…» |

No uses frases modelo para inventar acciones realizadas. Si sólo se redactó,
indica que falta publicar. Si encontramos defectos propios, explica el defecto,
su impacto y nuestra corrección pendiente sin esconderlo tras «validaciones».
Habla al cliente; excluye instrucciones al operador, comandos y notas internas.
La voz pública de la marca cliente no sustituye la voz de Efeonce en el informe.

## 3. Hacer comparables las fuentes

Para cada cifra fija propiedad/dominio, período, corte de extracción, filtros,
dimensiones, unidad, denominador y cobertura. Mantén las siguientes fronteras:

- **GSC:** total de propiedad, subconjunto query × URL y conjunto editorial son
  universos distintos. No rellenes el total con la suma de filas. Separa propiedad
  de dominio (puede incluir subdominios) de prefijo URL y filtros de búsqueda.
- **GA4:** sesiones, usuarios y eventos no se suman ni sustituyen entre sí.
  Un evento clave de navegación no prueba solicitud comercial, lead ni venta.
  Separa canales totales, Organic Search y referencias de motores IA.
- **DataForSEO:** documenta tarea, fecha, país, idioma, configuración y cobertura
  efectiva. Una muestra de rastreo no es censo; un score de salud no acredita la
  resolución individual. ETV es una estimación con metodología versionada; aplica
  `dataforseo-operator` y no mezcles fórmulas en una comparación.
- **Fechas:** el mes auditado y una comprobación posterior se presentan separados.
  Distingue CWV de campo, laboratorio y rastreo. Una foto posterior no reconstruye
  el estado de todo el mes ni permite atribuir causalidad a un ajuste sin fecha.
- **AEO:** impresiones en búsqueda generativa, citas en respuestas y sesiones por
  referencias IA son medidas diferentes. No fabriques un total de «visibilidad»
  sumándolas, ni una tendencia mensual con un único run.

## 4. Validar el Grader antes de adoptar sus conclusiones

1. Recupera el run exacto y conserva fecha, perfil, versión del prompt pack,
   motores/superficies, score original, cobertura y evidencia disponible.
2. Lee **las preguntas ejecutadas y sus respuestas**, no sólo la categoría del
   perfil o el resumen. Comprueba producto, intención comercial, geografía y
   competidores. Una vertical general como «manufactura» no representa por sí
   sola el mercado concreto de pinturas y recubrimientos.
3. Separa preguntas sin marca de preguntas que ya nombran o sugieren la marca y
   sus competidores. Una mención inducida permite evaluar caracterización o
   exactitud; no acredita descubrimiento espontáneo ni liderazgo competitivo.
4. Un score calculado correctamente puede resumir un panel inadecuado. Conserva
   el valor como resultado del run, limita su interpretación y no lo conviertas
   en benchmark válido de categoría. Rescata sólo observaciones respaldadas por
   respuestas pertinentes; no recalcules informalmente un «score corregido».
5. Contrasta probes técnicos con la respuesta real. HTTP 200, una URL existente
   o HTML genérico no prueban una API ni MCP. Verifica tipo y contenido esperado,
   comportamiento del protocolo y posible fallback/soft-404 con los mecanismos
   del dominio. No confundas presencia de un endpoint con capacidad utilizable.
6. No transfieras al cliente recomendaciones surgidas de preguntas impropias o
   falsos positivos. Si nuestra medición falló, asume la corrección del panel o
   probe y distingue esa tarea de un ajuste del sitio. La ausencia de API/MCP
   tampoco se convierte automáticamente en prioridad SEO/AEO sin caso de uso.

El informe explica qué permite concluir el run, qué no y qué corregiremos en
nuestra medición. No declara arreglado el Grader por documentar su defecto.

## 5. Revisar y cerrar el entregable completo

Revisa de principio a fin narrativa, títulos, tablas, anexos, resumen y plan de
acción de las propiedades de Notion. Cuando haya revisión paralela autorizada,
divide continuidad/contenido, medición/Grader y voz/responsabilidades; integra y
relee la versión completa después de resolver solapamientos.

Actualiza el registro correspondiente en la base acordada, conserva relaciones
históricas y evita duplicar la auditoría al corregirla. Guarda el Markdown en la
ruta acordada. Tras escribir, vuelve a leer **ambas versiones**: comprueba secciones,
tablas/celdas, métricas, IDs de hallazgo, enlaces, propiedades y los cambios
editoriales. Un éxito de escritura o un archivo local correcto no demuestra que
la versión de Notion quedó actualizada. Informa por separado cualquier destino
que no se pudo verificar; sólo declara completa la entrega verificada.

## Presentación y entrega institucional

Aplica `docs/operations/EFEONCE_REPORT_BRAND_DELIVERY_STANDARD_V1.md` al informe:
pie en cada página con URL bubble oficial, dirección y teléfono; logos Efeonce y
cliente; colores y tipografías verificados; gráficos cuando aclaran la evidencia.
Si se entrega en PDF, usa A4 y revisa visualmente el archivo exportado completo.
El HTML es el insumo editable, no la entrega final. Conserva detalle, fuentes y
limitaciones del informe al mejorar su composición.

Para crear o mejorar el informe completo, carga `report-studio`: narrativa, evidencia, gráficos, producción y QA del formato final. La práctica especializada conserva sus contratos y datos.
