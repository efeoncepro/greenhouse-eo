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

## Oferta económica documental rápida A4

Para avanzar en una licitación/Compra Ágil urgente con alcance y precio aprobados, usar el [manual de la plantilla A4](../../../docs/commercial/templates/cotizacion-a4/README.md). La salida puede integrar formalmente el paquete presentado; no es una quote persistida de Greenhouse.

Desde el 12/10/2026 (corrección del operador, Sika 1164) esta plantilla es la vía **por defecto** de la económica que ve el comprador, urgente o no; el Excel de `pnpm economica:build` queda para cuando las bases exigen una planilla. Criterio, desglose de una oferta creativa y lo que no se inventa: `propuesta-tecnica-economica.md` → «Oferta económica».

La plantilla tiene dos versiones de datos: la 1, un único precio en cuatro páginas (`ejemplo.json`); la 2, varias líneas con precio y una sección de inversión que pagina según su contenido (`ejemplo-lineas.json`, `ejemplo-lineas-terceros.json`). Si el precio viene de una cotización del Cotizador V3, los datos versión 2 los emite `pricing:v3 compose document` desde la cotización congelada y no se digitan ni se editan: seguir el [contrato operativo V3](../efeonce-pricing-operator/references/cotizador-v3-agent-workflow.md#6-el-documento-para-el-cliente) y retomar aquí en el paso 3. Desde V3 el documento puede imprimir además servicios opcionales (un bloque aparte, fuera del neto y del total; cada opción es su propia cotización, pasada con `--option`, o la cotización de la base con el opcional adentro, pasada con `--increment`, cuando sólo amplía a personas que ya están en ella) y una línea de cortesía («Bonificado», con su valor de referencia): en el paso 3, revisar que el total no incluya las opciones y que la cortesía no sume. Un precio de programa cotizado en V3 se declara como `agreed_total` y se imprime como una sola línea «1 programa» con `combine` (sin valor unitario, por el total del plazo); el documento lleva hitos de pago sólo si las bases los fijan, y declara lo que las bases exigen (plazo de ejecución, vigencia, forma de pago) como lo piden. Los pasos 1 y 2 son para un precio aprobado fuera de V3.

1. Copiar `ejemplo.json` al expediente; adaptar cliente, proceso, alcance, plazo, vigencia y condiciones aprobadas. Usar `status: draft`, quitar la etiqueta de ejemplo y conservar la autoridad comercial en el expediente.
2. Ingresar en `net` el precio neto **del servicio completo**, con tasa de IVA confirmada. La referencia mensual opcional no define cuotas ni cobro mensual.
3. Generar HTML/PDF con el comando del manual en una carpeta nueva o vacía. Revisar todas las páginas del PDF y sus montos; el manifiesto conserva la revisión manual pendiente hasta registrar su evidencia.
4. Incorporar únicamente los entregables aprobados al paquete de presentación; datos JSON, capturas QA y manifiesto son internos. Firmar/presentar sólo dentro de la autorización vigente y guardar el comprobante después.

Esta ruta no crea `quoteId`, no costea ni valida margen, no aprueba precios ni ejecuta maker-checker, no registra CRM/facturación y no envía. Una petición de operar catálogo/engine/Quote Builder/snapshots de Greenhouse sigue [Cotizador](../../../docs/documentation/finance/cotizador.md) y [Pricing Comercial](../../../docs/documentation/finance/pricing-comercial.md) y el runtime verificado; no se redirige a la plantilla. Conservar los archivos firmados/presentados; una continuidad documental no los regenera.

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
7. **Firma con el PNG guardado del operador (GRD-1552, 30/10/2026):** la declaración de conflicto de intereses se
   firmó con `Alineación/4. Comercial/Legales/firma/PNG/Firma-Julio.png` sólo porque Julio lo autorizó en el chat.
   `export_pdf` del MCP de Word se colgó sobre una ruta de OneDrive: no depender de él cerca del cierre. Si el
   casillero acepta .docx, subir el .docx firmado (así se hizo); si exige PDF, convertir por otra vía con tiempo.

### Oferente extranjero: identidad tributaria y legal (operador, 20/10/2026)

Si las bases piden RUT/NIT y Cámara de Comercio del país del comprador (Colombia, en el caso) y Efeonce oferta
desde Chile, se cargan en esos campos los equivalentes chilenos de Efeonce Group SpA (77.357.182-1):
**e-RUT**, **certificado de vigencia** y **certificado de estatuto actualizado** (Registro de Empresas y
Sociedades). Fuente: OneDrive `Alineación/4. Comercial/Legales/Documentos Efeonce/`.

- Elegir la emisión más reciente leyendo «Fecha de Emisión del Certificado» con `pdftotext`, no por el nombre
  del archivo: el nombre no garantiza la fecha.
- Es una práctica confirmada por el operador, no una equivalencia declarada por el comprador. Si las bases
  exigen registro local como requisito excluyente, se trata como requisito real (consulta o bloqueo).
- Repetido en GRD-1552 (30/10/2026), decisión del operador: «Cámara de Comercio» = certificado de vigencia
  (≤ 30 días) + estatuto actualizado en un solo PDF; «RUT completo» = e-RUT. Se cargaron tal cual, sin nota
  aclaratoria adicional.

### Experiencia certificada: sólo evidencia real (Gana GRD-1541, 20/10/2026)

El comprador pidió «Experiencia certificada publicidad programática (2)». Ningún partner entregó certificados
(ni Basis ni Real Audiences enviaron; Real Audiences tiene casos en su web, sin métricas por NDA). Se cargaron
referencias reales de clientes de Efeonce aunque no son de programática: carta firmada de SKY Airline (agencia
creativa 2025, mercados incluida Colombia) y certificado de recibo conforme del Gobierno de Santiago (EP9,
enero de 2026). El Anexo J de la licitación Agencia Digital de Réditos (oct-2025) se descartó: es una
autodeclaración de Efeonce y estaba desactualizada.

- 🔴 Nunca inventar experiencia, clientes, nombres ni certificaciones, ni reetiquetar un caso como de otra disciplina.
- En una oferta conjunta, los clientes del partner se presentan como «clientes de la alianza Efeonce · <partner>»,
  nunca como experiencia propia de Efeonce sola, y sólo con la evidencia que el partner entregó.
- Una autodeclaración vieja no es un certificado. Si lo que hay no calza exacto con lo pedido, se carga lo real y
  se informa al operador el riesgo de puntaje o admisibilidad; no se rellena el hueco.
- **Contrato de cliente como certificado (GRD-1552, 30/10/2026):** preferir una carta de referencia formal cuando
  existe (SKY). Si se usa un contrato firmado con cláusula de confidencialidad (Pinturas Berel, cláusula Sexta,
  5 años), subir sólo la página de identificación/objeto y la de firmas (allí, páginas 1 y 8) y excluir las de
  precios (página 2). Es decisión del operador, no del agente; ambas evidencias se unieron en un solo PDF para el
  casillero «2 certificados de contratos».

## Postular en Wherex: runbook medido (Gana / Grupo Réditos GRD-1541, oferta 7543223, 20/10/2026)

Enviada el 20/10/2026 a las 12:09 (Santiago). Expediente:
[gana-programatica-colombia-1541-2026](../../../docs/commercial/tenders/gana-programatica-colombia-1541-2026/README.md).
La interfaz cambia entre licitaciones; esto dice dónde mirar, no es contrato del portal. Complementa la anatomía
medida en Sika 1164 (`wherex-radar-chrome-playwright.md`).

**Navegador.** El navegador del panel de la app (Claude Browser) no sirve para postular: el paso «1. Servicio
licitado» no dibujó el formulario y no tiene herramienta para adjuntar archivos. Se usa **Claude in Chrome** con
la sesión del operador: el operador inicia sesión y el agente nunca escribe contraseñas. La sesión de un
navegador no pasa al otro.

**Paso 1 «Servicio licitado».**
- Entrar por `?tab=information` y pulsar «Siguiente»: la URL directa `?tab=products` deja el `ui-view` vacío;
  navegando con «Siguiente» queda `?tab=products#!/index` y la tabla carga.
- «Ofertar» abre «Nueva Oferta»: Código/SKU (opcional), nombre o descripción corta, cantidad ofrecida, precio
  unitario sin IVA, moneda (COP por defecto en el caso), comentarios y archivos por línea. «Crear oferta» guarda
  la línea en el borrador; no envía. «Total Oferta» no considera IVA.

**Paso 2 «Condiciones y archivos adjuntos».**
- Condiciones: precio incluye entrega (Sí/Otro), plazo de pago (aceptar los 30 días del cliente u «Otro»),
  validez en días corridos y comentario general. Ninguna se acepta sin aprobación (Comercial/Finance).
- «Archivos requeridos por el comprador»: cada obligatorio admite **un** archivo. Si uno pide dos documentos
  (p. ej. «Experiencia certificada (2)»), unirlos en un PDF con `pdfunite`. Opcionales en Administrativos,
  Técnicos y Económicos. Peso máximo por archivo: 20 MB.
- Los inputs de los obligatorios son `input[type=file]` ocultos (ng-file-upload), en el mismo orden que las
  filas. Para cargarlos con `file_upload` se les puso `aria-label` por JS y, **tras cada carga**, se comprobó que
  la fila correcta quedara en verde «Archivo cargado». Los opcionales entran por `#admFilesInput`,
  `#tecFilesInput` y `#ecoFilesInput`. Wherex renombra los caracteres no permitidos: registrar el nombre final.
- **Condiciones por JS, no por ref de `find` (GRD-1552, 30/10/2026):** un clic con una ref vieja de `find` sobre un
  radio sacó la página al inicio de Wherex y se perdieron radios y comentario (los archivos cargados persistieron).
  Marcar cada radio con `label[for]` + `.click()` y llenar el textarea con el setter nativo de `value` + evento
  `input`; leer de vuelta el estado y recién entonces pulsar «Siguiente», que es lo que guarda las condiciones.

**Paso 3 «Resumen y enviar oferta».** Muestra condiciones, conteo de archivos, la línea y el total, la comisión
de Wherex si se adjudica (en el caso $72.000 = 1,75 UF), la casilla «He leído y acepto» (bases del comprador y
términos de Wherex) y «Enviar Propuesta». Antes de marcar y enviar, mostrar ese resumen al operador y obtener
su OK explícito en el chat: aceptar términos y enviar son el acto de presentación. Tras enviar: estado
«Enviada» y «Oferta enviada por … el …». Para editar hay que «Retirar oferta» y reenviar antes del cierre.
- La comisión se informa al operador **por separado y con su cifra** antes de pedir el OK: escala con el monto
  (GRD-1541: 1,75 UF; GRD-1552: COP 2.144.048 = 52 UF).
- Los conteos de «Opcionales» del resumen suman los obligatorios agrupados por categoría (en GRD-1552:
  Cámara + RUT en administrativos, certificados en técnicos, económica en económicos). No son archivos de más ni
  duplicados: no retirar nada por ese número.

**Hora de cierre.** En el caso la UI mostró «20/10/2026 18:00» sin zona mientras la invitación decía 14:00 hora
de Colombia; en Sika 1164 la UI mostró hora de Santiago. No persistir en el CRM una hora dudosa: registrar
ambas fuentes como «por conciliar» y postular temprano.

## Paquete Wherex de Grupo Réditos: composición y armado (Agencia Digital 2027 GRD-1552, 29/10/2026)

Segunda oferta a Grupo Réditos por Wherex (después de GRD-1541). Armado el 28–29/10/2026; al cierre de la sesión
nada estaba subido, firmado ni enviado por el agente. Carpeta: OneDrive `Licitaciones/Grupo Reditos/13. Agencia
Digital 2027/02 - Para subir a Wherex/`.

- **Composición del paquete** (numerados 01–07): 01 propuesta técnica PDF
  · 02 propuesta económica PDF, modulable · 03 RFP Excel del comprador diligenciado · 04 declaración de conflicto
  de intereses (Word) · 05 Cámara de Comercio = certificado de vigencia ≤ 30 días + estatuto (Registro de Empresas y
  Sociedades de Chile; ver «Oferente extranjero») · 06 e-RUT · 07 dos certificaciones de experiencia (SKY Airline +
  Gobierno de Santiago).
- **Documentos legales: reutilizar los del último paquete del mismo comprador** si siguen vigentes. Los 05–07
  salieron de `12. Programmatic/` (GRD-1541); la vigencia tenía 11 días al cierre, dentro del límite de 30. Medir la
  fecha de emisión al cierre de la licitación nueva, no la del paquete anterior.
- **Declaración de conflicto de intereses:** se llena con python-docx (nombre y cargo del representante, razón
  social y RUT de la empresa, lugar, fecha y respuesta). Llena no es firmada: queda en el checklist como pendiente
  de firma del representante.
- **RFP Excel:** por cada requisito, «CUMPLE» + «Páginas … de la propuesta en PDF» + observación (una observación
  puede quedar vacía por decisión del operador). Se edita a nivel XML: openpyxl borra las validaciones
  `x14:dataValidation` al guardar (detalle en `propuesta-tecnica-economica.md` → «RFP en Excel del comprador»). Las
  páginas citadas salen del PDF final; si el deck se renumera, se rehacen.
- **Checklist interno fuera de la carpeta de subida:** `CHECKLIST WHEREX GRD-1552 (INTERNO).md` vive en la carpeta
  del proceso, no en `02 - Para subir a Wherex/`. Así la carpeta de carga contiene sólo lo que se sube.
- **Versión cliente de la técnica:** antes de exportar se barren códigos de fuente internos (`[E01]`, «Fuente E02»),
  cajas «Por confirmar» / «pendiente» / «por adjuntar», sellos «Borrador» y frases defensivas; se retiran los anexos
  de fuentes internas y se verifica con `pdftotext` sobre el PDF final completo (detalle en `deck-studio` →
  «Reglas generales para decks de licitación»).
- **Económica modulable:** un total mensual y anual antes de impuestos, desglosado en componentes de valor (equipo
  dedicado, creatividad y producción, estrategia y cuenta, social listening, analítica) cuyo peso sigue el costo
  interno (el equipo ≈ 49 % del costo mensual pesa ≈ 49 % del precio; el resto se repartió por alcance). Ajustar un
  componente no cambia los demás. Se declara lo que queda a cargo del comprador (medios, plataforma y consumo de
  Email/SMS). **Nunca se publican costos ni márgenes:** el peso interno ordena el desglose, no se imprime.
  **Formato: plantilla A4** (`node scripts/documents/render-cotizacion-a4.mjs`, versión 2, una línea por componente ×
  12 meses con valor unitario mensual), nunca una lámina del deck: en GRD-1552 se armó primero como lámina 1920×1080 y
  hubo que rehacerla. Comprador extranjero en Wherex: `vatRate: null` + `taxStatus: "not_applicable"` (precedente Sika
  1164); con líneas mensuales visibles, `pricing.monthly: null` evita una página casi vacía.
- **Riesgos que se informan, no se tapan:** permiso de un aliado para aparecer y usar logos de sus clientes,
  requisito marcado «CUMPLE» por decisión del operador sin evidencia documental, contraparte legal del comprador sin
  fijar, costo completo no validado por Finance y fechas de fundación que difieren entre deck y estatuto. Quedan en
  el checklist y en el reporte al operador.

**Envío 30/10/2026 (verificado en Wherex).** Oferta 7578948 enviada por Julio Reyes a las 16:52, operada por el
agente con Claude in Chrome en la sesión de Julio y con su OK explícito antes de aceptar términos y enviar; estado
«Enviada»; comprobante en `13. Agencia Digital 2027/`. Línea: 12 meses × COP 38.000.000 sin IVA = COP 456.000.000,
pago 30 días aceptado. Cambio respecto del armado del 29/10: el 07 quedó como carta de SKY + páginas 1 y 8 del
contrato Berel (no Gobierno de Santiago); la declaración se subió como .docx firmado. Lecciones en «Completar y firmar anexos»,
«Oferente extranjero», «Experiencia certificada» y «Postular en Wherex».

## Seguimiento y continuidad

Leer [follow-up-agent/README.md](../../../docs/commercial/follow-up-agent/README.md) y su registro antes de
crear otra automatización o tarea. Alertas, borradores de correo, tareas Notion y MD de continuidad no prueban
que el correo se envió o que la oferta fue presentada. Mantener deadlines oficiales y acciones internas separados;
actualizar tareas existentes por ID cuando el alcance lo permita, conservando autor, fuente y siguiente acción.

## Después de presentar: evidencia, importe y continuidad

- La confirmación del operador acompañada por una captura inequívoca de la plataforma y el código permite registrar **presentada**. Conservar la imagen original, ruta y hash; indicar la fecha confirmada y qué no muestra la captura (hora exacta, montos, inventario o ID independiente de recepción), sin inventarlo ni exigir repetir el envío.
- En el formulario, ingresar el precio completo en la unidad monetaria requerida. Verificar el resumen calculado de neto, IVA y total antes de enviar: un separador puede transformar 4.800.000 en 4.800. Despacho cero cuando el servicio no tiene despacho; cantidad uno no convierte el programa completo en cuota mensual.
- El precio final aprobado sustituye las orientaciones anteriores. El presupuesto comprador queda separado. No tomar el techo como precio objetivo ni afirmar ser la oferta más barata sin conocer competidores.
- Tras el mandato de actualizar CRM, verificar identidad/portal, el Deal existente y el ID live de etapa. Registrar el importe neto del programa completo, moneda, IVA/total y plazo; no usar el equivalente mensual como valor total. Releer el Deal y comprobar estabilidad después de automatizaciones.
- Sincronizar el expediente, manifiestos, ambos registros CRM, tarea existente y cola de seguimiento. Cerrar la preparación/presentación con su evidencia; el siguiente paso es evaluación/resultado. Costos, margen, capacidad u otros antecedentes sin validar conservan esa condición, sin simular que se revisaron ni reabrir una presentación ya ejecutada.
- Conservar los bytes/hashes del paquete presentado. Una actualización de continuidad no autoriza regenerar PDFs, reemplazar adjuntos, reenviar, firmar ni crear otra postulación. LicitaLAB sigue siendo discovery; el comprobante es de la plataforma de envío.

Caso verificado: [UTEM 5251-1060-COT26, presentada por Julio el 08/10/2026](../../../docs/commercial/tenders/utem-seo-aeo-2026/PRESENTACION-2026-10-08.md). Su precio y estado son evidencia fechada, no una tarifa ni regla permanente.
