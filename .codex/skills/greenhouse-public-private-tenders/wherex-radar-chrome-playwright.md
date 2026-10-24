# Radar de licitaciones Wherex con Playwright

Usa este companion cuando el operador pida revisar oportunidades en Wherex o decidir su fit con los servicios de Efeonce.

## Ejecución canónica

El runner local es el mecanismo reutilizable:

```bash
pnpm wherex:radar:setup
pnpm wherex:radar
```

El setup solicita correo y clave en una terminal interactiva sin mostrarlos. Los guarda sólo en
`.auth/wherex-auth-credentials.json` con permisos `0600`; Chrome usa el perfil aislado
`.auth/wherex-auth-profile`. Ambos permanecen ignorados por Git. Nunca copies esos archivos, cookies,
tokens, enlaces firmados ni secretos a logs, documentos, commits o chat.

Opciones seguras:

```bash
pnpm wherex:radar -- --check-only
pnpm wherex:radar -- --force-login
pnpm wherex:radar -- --max-pages 30
```

El reporte, incluidas fichas y textos de adjuntos, queda bajo `.auth/wherex-radar-reports/` con permisos
`0600`. No es un artefacto para versionar ni entregar a un cliente.

### Archivo puntual de originales autorizados

Para una candidata que el operador haya identificado y autorizado, el runner admite un modo acotado:

```bash
pnpm wherex:radar -- --tender-id <ID> --archive-originals "<carpeta-de-licitación-del-comprador>"
```

El modo abre sólo esa licitación en `Nueva` o `Editando`, pulsa su control visible **Descargar** y archiva el archivo
solamente si Wherex emite un evento nativo de descarga. Conserva el nombre de origen, evita sobrescrituras, valida un
tamaño mayor a cero y extrae texto para el reporte local protegido. Nunca intenta obtener enlaces firmados, leer el
visor PDF protegido ni usar una ruta indirecta: si Wherex abre sólo el visor, marca `manual-save-required` y se
requiere que el operador guarde el original desde Chrome.

## Qué hace el runner

1. Inicia Wherex en Chrome visible, con el perfil aislado.
2. Navega por Sourcing → Licitaciones y revisa **Nueva** y **Editando**. Una oportunidad abierta previamente puede estar en Editando; mirar sólo Nueva produce falsos negativos.
3. Recorre las páginas disponibles y abre cada ficha detectada.
4. Registra el texto de ficha y extrae temporalmente los adjuntos técnicos disponibles (PDF, DOCX, XLSX o PPTX). Los temporales se eliminan al terminar. Un adjunto que no se pueda interpretar queda marcado como `unreadable`; no se infiere su contenido.
5. Produce un reporte local evidence-first. El agente usa esa evidencia para la clasificación comercial.

## Límite de acciones

El runner es de lectura. No pulsa acciones como participar, descartar, enviar mensajes, cargar archivos,
presentar oferta o firmar. Esas acciones requieren una instrucción explícita y, para envío o firma,
autorización humana específica. Una autorización vigente que ya cubre la firma no se pide otra vez;
no amplía la autoridad a envío. Regla general de plataformas, consultas y expediente:
`platform-bids-and-administrative-package.md`.

## Criterio de salida

No afirmes que una licitación no tiene fit sólo por el título o la vista de listado. Lee ficha y adjuntos
pertinentes, y cita qué campo o documento sostiene la conclusión. Clasifica como `priorizar evaluación`,
`condicionada`, `HOLD`, `no-bid` o `sin evidencia suficiente`. `HOLD` es temporal y exige owner, siguiente gate y
deadline; `no-bid` es terminal para el proceso vigente. Un fit alto aún no es GO: valida admisibilidad, capacidad
de entrega y margen sobre loaded cost.

### Descripción y preguntas: evidencia obligatoria

Antes de clasificar una ficha o dimensionar su presupuesto, lee la **descripción/comentarios generales
completa**. El presupuesto, su periodicidad, pago, alcance real, exclusiones y condiciones comerciales pueden
vivir ahí y no en un campo estructurado de la plataforma.

Abre también el **Centro de mensajes → Preguntas** y revisa todas las preguntas y respuestas disponibles. Las
respuestas del comprador pueden acotar el máximo presupuestario, confirmar modalidad de pago, facturación,
inicio, cobertura geográfica, entregables incluidos o exclusiones; no se sustituyen por una inferencia desde el
brief. Distingue una respuesta del comprador de una pregunta de un proveedor, registra fecha y fuente, y resume
sólo el hecho operativo que cambie el bid/no-bid o el alcance.

El reporte automático conserva el texto que la ficha expone al abrirla, pero no se debe asumir que contiene un
Centro de mensajes que la interfaz muestra de forma diferida. Si no hay evidencia de preguntas en el reporte,
revísalas en la UI autenticada antes de cerrar el dictamen. Esta lectura sigue siendo read-only: no pulses
`Nueva pregunta`, no respondas ni envíes mensajes sin instrucción explícita y confirmación humana.

**El Centro de mensajes muestra las preguntas de todos los proveedores y sus respuestas, no sólo las propias.**
Léelo entero y vuelve a leerlo **antes de congelar cada documento** (técnica, anexos, económica): las respuestas
llegan en tandas (en el caso, el 05, el 06 y el 09/10). Caso fuente, licitación 1164 (medido el 12/10/2026): respuestas dadas a otros
proveedores definieron el alcance a cotizar, que la muestra de video podía ser storyboard o animatic, que para
punto de venta sólo se pedía el diseño, que la volumetría era una referencia para comparar ofertas y que las
condiciones de pago se revisarían con quienes avanzaran. Una de ellas pedía además una propuesta de SLA por
niveles de complejidad; se leyó el 12/10, con el deck técnico ya cerrado, y obligó a agregar una lámina y reexportar.
Cada requisito que nace en una respuesta se anota con fecha y hora y entra a la matriz de cumplimiento
(`propuesta-tecnica-economica.md`).

## Anatomía de la oferta en el portal (medido el 12/10/2026, licitación 1164)

La interfaz cambia entre licitaciones; esto es lo observado en una y sirve para saber dónde mirar, no como
contrato del portal.

- **Pasos:** «Información y preguntas» → «1. Servicio licitado» → «2. Condiciones y archivos adjuntos» →
  «3. Resumen y enviar oferta». El clic sobre el rótulo de un paso no navega; se avanza con «Siguiente »».
  Recorrerlos para leer, sin completar campos, no modificó nada: la licitación ya estaba en «Editando» antes.
  Si un paso exige completar o guardar algo para avanzar, detente y pide instrucción.
- **«1. Servicio licitado» puede traer un solo servicio** (cantidad 1) con **un monto total**, un **selector de
  moneda** (USD, EUR, MXN, CLP, PEN, COP; estaba en MXN) y la leyenda **«NO considera IVA»**. Consecuencias: la
  moneda de la oferta puede resolverse aquí aunque la pregunta no se haya respondido por mensaje; el monto es
  neto; y el desglose no cabe en el portal, vive en la oferta económica adjunta, cuyo total debe ser ese monto.
- **La pestaña «Información»** trae los datos de facturación del comprador (razón social, identificador fiscal y
  dirección) y las condiciones de pago, que en el caso decían «Por definir». Wherex rotula el identificador como
  «RUT» aunque el comprador sea de otro país (en el caso era un RFC mexicano): cópialo con su etiqueta real. De
  ahí sale `buyer.taxId` de la plantilla A4.
- **La hora de cierre se muestra en la hora local del usuario**, sin zona visible: 19:00 en Santiago era 16:00 en
  Ciudad de México. Se confirmó preguntando. Registra el cierre con las dos zonas y nunca asumas que la hora
  visible es la del comprador. No es una regla estable: en Gana GRD-1541 (20/10/2026) la UI mostró 18:00 sin zona
  y la invitación decía 14:00 hora de Colombia, y no se pudo conciliar. Con dos fuentes en conflicto, la hora
  queda «por conciliar», no se persiste en el CRM y se postula temprano.
- **Adjuntos (paso 2):** tres casilleros —administrativos, técnicos y económicos— y un límite de peso por archivo que
  configura cada comprador: en el caso, **20 MB** (leído el 13/10/2026). El reel pesaba 23 MB y no se adjuntó; se ve por el
  QR y el enlace del deck. Comprueba el límite antes de exportar los finales y ten lista la copia liviana.
- **Condiciones (paso 2):** «Precio de oferta incluye traslado al lugar solicitado por el cliente», «Plazo de pago» y
  «Comentario general». En el caso quedaron «Sí», «Sí, Por definir» y vacío.
- **El monto (paso 1):** con un solo servicio de cantidad 1, «Precio unitario» y «Total Oferta» son la misma cifra; el
  portal muestra además el nombre y el código del servicio del proveedor («Fee - Agencia Creativa (EF-10001)»).
- **Después de enviar:** el estado pasa a «Enviada» con autor, fecha y hora. Mientras la licitación siga publicada, editar
  exige «Retirar oferta» y reenviar: nunca lo pulses al leer. Tras el envío del operador, lee estado, monto, moneda y
  adjuntos y déjalos en un registro de presentación del expediente (`PRESENTACION-<fecha>.md`), con lo que no pudiste
  verificar (el portal trunca los nombres de archivo y no muestra su huella).

## De propuesta preparada a postulación en Wherex

Esta etapa empieza sólo cuando el operador instruye explícitamente preparar o presentar una oferta. La interfaz y
los requisitos varían por licitación: verifica los campos y adjuntos de la ficha vigente, no reutilices una lista
de otro proceso como si fuera una condición contractual. Regla del operador: presentar, cargar archivos o enviar
mensajes en Wherex sólo con su confirmación expresa **en ese momento**.

Runbook medido de una postulación completa (navegador, carga de obligatorios, resumen y envío; Gana GRD-1541,
20/10/2026): `platform-bids-and-administrative-package.md` → «Postular en Wherex». Lo esencial: se postula con
**Claude in Chrome** en la sesión del operador, no con el navegador del panel de la app (no dibuja el paso 1 ni
adjunta archivos), y al paso 1 se llega desde `?tab=information` con «Siguiente», no con la URL directa.

1. En **Servicio licitado**, mira primero la estructura que pide esa ficha: varios ítems con `Ofertar`, cantidad y
   precio unitario, o un solo servicio con un monto total. Completa sólo desde la cotización aprobada y en la
   moneda del selector. Revisa el total y su base fiscal; Wherex puede declarar que los valores no consideran
   IVA. Con un solo monto, compáralo con el total de la oferta económica adjunta: deben ser iguales. Nunca uses
   el máximo presupuestario como precio automático ni confundas un valor mensual con el total del contrato.
2. En **Condiciones y archivos adjuntos**, confirma entrega, plazo de pago, vigencia y comentario general. No
   aceptes ni sustituyas una condición comercial sin aprobación de Comercial/Finance. Carga cada documento
   obligatorio exactamente en su campo y respeta el límite de tamaño/formato; una cotización y una presentación
   no sustituyen anexos administrativos o técnicos cuando el comprador los exige.
3. En **Resumen y enviar oferta**, comprueba todos los ítems, condiciones, archivos obligatorios, totales, moneda,
   impuestos y warnings. Reconcílialos con la cotización aprobada y el expediente interno.
4. La aceptación de bases/términos y el botón `Enviar Propuesta` constituyen el acto de presentación. Requieren
   confirmación humana final y explícita en ese momento. Una instrucción de "preparar" o "subir borradores" no
   autoriza aceptar ni enviar.

Registra en el workspace interno los requisitos de la pantalla de cada bid y qué quedó preparado. Si falta
facturación transfronteriza, representación local, documento obligatorio, aprobación de precio o margen, el estado
correcto es `operativamente bloqueado` y no se fuerza un envío.

## De candidata a expediente y pipeline CRM

Cuando el operador identifique una o más candidatas, el radar no termina con el dictamen. Ejecuta esta
continuidad sólo para las oportunidades que el operador haya seleccionado; no crees masivamente empresas,
deals ni carpetas por todos los resultados del radar.

### 1. Expediente interno y adjuntos originales

1. Crea o reutiliza el workspace interno con `pnpm tender:new <slug>` bajo
   `docs/commercial/tenders/<slug>/`. Las bases normativas viven en `bases/`; investigación, diagnósticos
   y notas internas en `research/`. No confundas este workspace versionado con el archivo operativo de OneDrive.
2. Localiza la biblioteca local sincronizada de OneDrive del operador. La convención actual para licitaciones es
   `Alineación/4. Comercial/Licitaciones/<Comprador>/`. Primero busca una carpeta equivalente por nombre; crea
   sólo la carpeta del comprador que falte y sólo si existe al menos un adjunto que archivar.
3. Descarga o copia el archivo original a esa carpeta conservando el nombre de origen. Revisa que exista, tenga
   tamaño mayor a cero y sea legible antes de declararlo archivado. Registra en el expediente el nombre del archivo,
   tipo, fecha y el origen Wherex, pero nunca una URL firmada, cookie, token ni ruta temporal del navegador.
4. Extrae y lee el contenido de PDF, DOCX, XLSX o PPTX cuando el documento pueda afectar fit, admisibilidad,
   alcance, presupuesto, plazo, requisitos o riesgos. Un documento sin texto extraíble exige revisión visual o se
   clasifica como `unreadable`; no se rellena con supuestos.

Si la UI autorizada abre un adjunto en un visor que impide guardarlo de manera soportada, no intentes obtener la
URL firmada, inspeccionar el perfil de Chrome ni usar una ruta indirecta para saltar ese control. Declara el
bloqueo y pide un archivo local o una acción humana de guardado; cuando el archivo local exista, puedes archivarlo
y analizarlo. El runner `wherex:radar` sólo usa temporales y no sustituye la conservación deliberada del original.

### Sesión Chrome principal: descarga deliberada y reversible

Si el operador autoriza operar su sesión Chrome principal y Wherex abre el visor integrado, puede cambiar de manera
visible y reversible `chrome://settings/content/pdfDocuments` a **Descargar archivos PDF**. Eso permite que el enlace
visible de Wherex cree un archivo local para archivar y leer. El cambio afecta ese perfil: mientras esté activo, los
PDF no se abrirán en el visor; el operador puede restaurar **Abrir archivos PDF en Chrome** cuando lo necesite.

No asumas ni cambies esta preferencia sin autorización explícita. La descarga puede mostrar el diálogo nativo de
guardado: confirma que el archivo aparezca completo en `Descargas`, cópialo al expediente OneDrive de la licitación,
comprueba nombre/tamaño/apertura y recién entonces extráelo. Para una ficha con más de un adjunto, descarga y valida
cada original de forma individual; no declares que `Descargar todos` terminó sólo porque abrió un diálogo.

### 2. HubSpot: empresa, deal y asociación

Usa el MCP de HubSpot para el CRM; no deduzcas que un deal existe por una carpeta, por una ficha Wherex o por un
nombre parecido. Aplica además el contrato común de `crm-portfolio-operating-model.md`.

1. Llama primero a `hubspot_get_user_details` y confirma acceso de lectura y escritura para `COMPANY` y `DEAL`.
2. Busca empresas y deals por comprador, título y código de licitación; después consulta las asociaciones del deal
   con la empresa. Distingue un deal histórico/cerrado de la oportunidad vigente y no dupliques una asociación válida.
3. Consulta las propiedades y opciones reales antes de proponer un alta: HubSpot, no la memoria ni un documento,
   gobierna pipelines, etapas y valores permitidos.
4. Antes de escribir, preparar el conjunto exacto de cambios y aplicar la autorización vigente. Para una
   empresa inexistente, crear los datos mínimos autorizados y releer su ID antes de asociar. Si el lote aprobado
   ya identifica inequívocamente empresa, proceso y asociación, no pedir otra aprobación sólo porque el ID
   acaba de generarse. Resolver cualquier identidad ambigua antes del write correspondiente.
5. Crea sólo las propiedades necesarias y usa el owner/pipeline/stage vigentes. Para una licitación privada nueva,
   la clasificación comercial debe quedar trazable, sin inventar propiedades que no existan.
6. Relee el deal y busca la empresa asociada por ID. Repite el readback después de que hayan podido correr
   automatizaciones nativas. Reporta creado/verificado o el error real; no afirmes que el vínculo existe sólo
   porque el create respondió sin error. Si `pipeline_bucket`, `dealtype` o asociaciones derivan, refleja live,
   identifica la automatización y no corrijas silenciosamente.
7. Actualiza `docs/commercial/tenders/LICITATION_CRM_REGISTER.md` y, si existe Deal,
   `docs/commercial/CRM_DEAL_REGISTER.md` con el mismo `deal_id` y el estado del último readback.

Una autorización general no cubre cambios ajenos al alcance aprobado ni resuelve una identidad ambigua.
No inventar requisitos universales del MCP: respetar los controles efectivos de la tool. No actualizar registros
existentes para «hacerlos coincidir» fuera del alcance autorizado; conservar prestate y readback.

### 3. Entrega al operador

La entrega debe separar: (a) candidatas priorizadas/condicionadas/HOLD/no-bid con evidencia, (b) archivos originales
archivados y los que no existían o quedaron bloqueados, y (c) estado CRM de cada candidata (empresa, deal,
asociación y verificación). La lectura de un brief se resume con alcance, problema, requisitos, metas, calendario,
riesgos y siguiente gate; no reproduzcas el documento completo ni información confidencial innecesaria.

Para el manual dirigido al operador, consulta `docs/manual-de-uso/comercial/revisar-licitaciones-wherex-con-chrome.md`.
