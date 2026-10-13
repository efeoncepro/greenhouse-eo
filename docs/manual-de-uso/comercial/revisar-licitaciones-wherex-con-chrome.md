# Revisar licitaciones Wherex con Playwright

> Manual operativo para evaluar oportunidades privadas en Wherex mediante la CLI Playwright y un perfil de Chrome aislado.
>
> **Tipo de documento:** Manual de uso
> **Versión:** 1.1
> **Creado:** 2026-08-11
> **Última actualización:** 2026-10-12 por Claude (1.1: cómo es la oferta dentro del portal —pasos, servicio a cotizar, moneda, datos de facturación del comprador, hora de cierre— y relectura del Centro de mensajes antes de congelar cada documento; caso fuente: licitación 1164)

## Propósito

Este proceso permite revisar las licitaciones abiertas, leer sus fichas y bases, y determinar cuáles justifican una evaluación comercial de Efeonce. No crea ni presenta una oferta.

## Configuración de una sola vez

Desde la raíz del repositorio, ejecuta una vez:

```bash
pnpm wherex:radar:setup
```

El setup solicita correo y clave sin mostrarlos y los guarda exclusivamente en
`.auth/wherex-auth-credentials.json`, con permisos `0600`. El navegador conserva su sesión en
`.auth/wherex-auth-profile`; ambos directorios están ignorados por Git. No copies esos archivos, cookies,
tokens ni enlaces firmados a chat, documentos, commits o artefactos.

## Ejecutar el radar

```bash
pnpm wherex:radar
```

El runner abre Chrome visible con su perfil aislado. Puedes comprobar la configuración sin abrir Chrome con
`pnpm wherex:radar -- --check-only`, forzar una nueva sesión con `--force-login` o limitar la paginación con
`--max-pages 30`.

### Archivar un original de una candidata concreta

Cuando el operador autorice conservar adjuntos de una licitación ya identificada, usa el modo acotado y una carpeta
explícita de esa empresa:

```bash
pnpm wherex:radar -- --tender-id 1120 \
  --archive-originals "/Users/jreye/Library/CloudStorage/OneDrive-EfeonceGroupSpA/Alineación/4. Comercial/Licitaciones/Sika"
```

Este modo sigue siendo de lectura comercial: no participa, responde, carga ni presenta. Sólo pulsa el control visible
**Descargar** y guarda un archivo cuando Wherex emite una descarga nativa. Valida que no esté vacío, conserva el
nombre de origen sin sobrescribir un archivo existente y extrae el texto para el reporte protegido.

Si Wherex abre su visor PDF protegido, el comando lo registra como `manual-save-required` y se detiene para ese
adjunto. No intenta leer el visor, capturar enlaces firmados ni obtener el archivo por una vía indirecta. En esa rama,
el operador guarda el PDF desde Chrome y el agente retoma el archivo y análisis desde la copia local.

Cuando el operador autorice usar su perfil Chrome principal, se puede activar en
`chrome://settings/content/pdfDocuments` la opción **Descargar archivos PDF**. El cambio es visible y reversible,
pero afecta a todo ese perfil: los PDF se descargarán en vez de abrirse en el visor hasta restaurar **Abrir archivos
PDF en Chrome**. No se modifica sin autorización explícita. Descarga cada adjunto individual, espera que el archivo
aparezca completo en `Descargas`, y recién entonces cópialo al expediente de OneDrive y léelo; `Descargar todos` no
es evidencia suficiente si abre un diálogo nativo de guardado.

## Rutina de revisión

1. El runner entra a Wherex y navega por Sourcing → Licitaciones.
2. Revisa los estados **Nueva** y **Editando**, página por página. Una oportunidad ya abierta puede pasar a Editando aunque siga vigente; consultar sólo Nueva deja oportunidades fuera del radar.
3. De cada fila anota comprador, ID, título, estado, fecha y hora de cierre, categoría y una señal inicial del alcance.
4. Abre la ficha de toda oportunidad que parezca pertinente o ambigua. Lee la **descripción o comentarios generales completa**: no supongas que presupuesto, periodicidad, pago, exclusiones o alcance viven en un campo estructurado. El listado y el título son sólo screening.
5. Abre **Centro de mensajes → Preguntas** y revisa todas las preguntas y respuestas disponibles. Distingue lo que consultó un proveedor de lo que confirmó el comprador; registra la fecha y el hecho operativo que modifique presupuesto, pago, facturación, inicio, cobertura geográfica, entregables o exclusiones. Si el reporte del runner no trae esa evidencia, la revisión en la UI autenticada es obligatoria antes del dictamen. No pulses `Nueva pregunta`, no respondas ni envíes nada. El Centro de mensajes muestra las preguntas de **todos** los proveedores: las respuestas a otros también definen el alcance (ver «Releer antes de congelar cada documento»).
6. Lee las bases, brief, RFP, TDR y anexos técnicos cuando puedan cambiar el dictamen. El runner extrae temporalmente PDF, DOCX, XLSX y PPTX, elimina el temporal y marca un archivo no interpretable como `unreadable`. La ficha, sus aclaraciones y los adjuntos deben concordar; ante una diferencia, registra la fuente y fecha, y resuélvela antes de ofertar.
7. Contrasta el alcance con los servicios canónicos de Efeonce. Distingue lo que Efeonce puede entregar directamente de lo que requeriría partner, certificaciones, cobertura local, hardware, personal presencial u otra capacidad externa.
8. Entrega una recomendación y evidencia; no selecciones participar/no me interesa, no envíes consultas ni propuestas y no firmes ni subas documentos.

## Cómo clasificar el fit

| Resultado | Cuándo usarlo | Siguiente acción |
| --- | --- | --- |
| Priorizar evaluación | El alcance central coincide directamente con servicios de Efeonce y no aparece un bloqueo conocido. | Revisar admisibilidad, capacidad y margen. |
| Condicionada | Hay encaje parcial o depende de partner, certificación, presencia geográfica, capacidad o un dato que falta. | Resolver la condición antes de destinar horas de propuesta. |
| No-bid | El núcleo de la compra no pertenece a la oferta de Efeonce o hay un bloqueo material. | Registrar la razón y no invertir en propuesta. |
| Sin evidencia suficiente | La ficha o los adjuntos imprescindibles no están disponibles. | Solicitar o localizar la documentación faltante. |

Un buen fit no equivale a un GO. Antes de participar deben pasar tres puertas: admisibilidad, capacidad real de entrega y margen proyectado sobre loaded cost.

## Cuando una licitación pasa a candidata

No archives ni crees CRM para cada fila revisada. Esta etapa comienza sólo cuando el operador selecciona una
licitación como candidata para evaluación comercial.

### 1. Abrir el expediente interno y archivar los originales

1. Crea o reutiliza el workspace del repositorio con `pnpm tender:new <slug>`. Guarda las bases normativas en
   `bases/` y la investigación interna en `research/`; ese workspace no reemplaza el archivo operativo de OneDrive.
2. Busca la carpeta del comprador en la biblioteca sincronizada `Alineación/4. Comercial/Licitaciones/` de OneDrive. Dentro, reutiliza o crea el proceso numerado
   `<N>. <Nombre de la licitación>`; por ejemplo `UTEM/1. Agencia SEO-AEO`.
   Si no existe, créala sólo cuando haya al menos un adjunto original que guardar. Conserva el nombre del comprador
   para que el equipo pueda encontrar el expediente sin conocer el slug técnico.
3. Copia cada PDF, DOCX, XLSX o PPTX original con su nombre de origen. Comprueba que el archivo exista, tenga tamaño
   mayor a cero y se pueda abrir antes de informar que quedó archivado.
4. En el expediente versionado anota nombre, tipo y procedencia Wherex de cada base; nunca copies URL firmadas,
   cookies, tokens ni rutas temporales del navegador.

El radar automático lee adjuntos en un directorio temporal y los elimina al terminar. Para conservar un original,
debe existir una copia local legítima antes de moverla al archivo de OneDrive. Si el visor del navegador bloquea el
guardado mediante la automatización disponible, no intentes extraer enlaces firmados, inspeccionar el perfil del
navegador ni eludir el control. Solicita el archivo local o el guardado humano y continúa cuando exista una copia
verificable. Si una candidata no tiene adjuntos, informa ese hecho y no crees una carpeta vacía sólo por simetría.

### 2. Crear o verificar el pipeline en HubSpot

La carpeta de OneDrive y el workspace no prueban que exista un deal. HubSpot se revisa por MCP y conserva el
registro comercial canónico.

1. Obtén primero la identidad y los permisos con `hubspot_get_user_details`; requiere lectura y escritura de Company
   y Deal.
2. Busca independientemente empresa, deals y código de licitación. Revisa además las empresas asociadas a cada deal:
   un deal histórico cerrado o uno sin asociación no cubre automáticamente la licitación vigente.
3. Consulta las propiedades disponibles de HubSpot antes de preparar la creación. Pipeline, etapa, owner y opciones
   permitidas se toman del portal, no de una tabla copiada en este manual.
4. Si faltan registros, prepara propiedades, identidad y asociaciones para el alcance autorizado. Una señal sigue como lead hasta calificación; no crear un Deal calificado sólo por haber encontrado una licitación.
5. Obtén autorización cuando falte. Si ya se autorizó la empresa, el proceso y su asociación, resolver y verificar el ID no exige una segunda aprobación por sí solo. No extender ese permiso a otros objetos, etapas ni envíos.
6. Relee cada objeto y su asociación por ID. Reutiliza registros vigentes y conserva los Deals que el operador haya pedido dejar sin cambios. No dupliques segmentos activos: completa propiedades respaldadas y verifica membresía efectiva.

Polpaico ilustra la rama de reutilización: si el deal vigente y su empresa ya existen y están asociados, se reportan como verificados y no se duplican.

## Contacto y postulaciones por plataforma

La regla aplica a Wherex, Mercado Público y procesos descubiertos en LicitaLAB: el comprador puede contactar después de revisar la oferta. Si no existe interlocutor o canal de preguntas, documentar la limitación y continuar con las bases y supuestos acordados; no convertir una aclaración imposible en requisito previo automático. Consultar, firmar y enviar requieren su propio alcance autorizado. Método común: [construir una licitación](construir-una-licitacion.md).

## Preparar y presentar una oferta en Wherex

Esta sección aplica sólo cuando el operador instruye explícitamente preparar o presentar una oferta. La lectura del
radar no autoriza por sí misma completar formularios, aceptar bases ni enviar. Presentar, cargar archivos o enviar
mensajes en Wherex se hace sólo con la confirmación expresa del operador en ese momento.

### Cómo es la oferta dentro del portal

Lo que sigue se observó el 12/10/2026 en la licitación 1164. La pantalla puede variar entre procesos: úsalo para
saber dónde mirar y confirma cada dato en la ficha vigente.

| Qué buscas | Dónde está | Qué tener en cuenta |
| --- | --- | --- |
| Los pasos de la oferta | «Información y preguntas» → «1. Servicio licitado» → «2. Condiciones y archivos adjuntos» → «3. Resumen y enviar oferta» | El rótulo del paso no es un enlace: se avanza con «Siguiente »». Recorrerlos para leer no cambió nada; la licitación ya figuraba en «Editando». |
| El servicio a cotizar | «1. Servicio licitado» | Puede ser **un solo servicio** (cantidad 1) con **un monto total**, no una lista de ítems. El desglose va en la oferta económica adjunta y su total debe ser ese monto. |
| La moneda | Selector del mismo paso (USD, EUR, MXN, CLP, PEN, COP) | En el caso estaba en MXN. La pregunta sobre la moneda nunca se respondió por mensaje: el selector ya la resolvía. |
| Si el monto lleva impuesto | Leyenda «NO considera IVA» junto al total | El monto que se ingresa es neto. La oferta económica debe declarar la misma base. |
| Datos de facturación del comprador | Pestaña «Información» | Razón social, identificador fiscal y dirección. Wherex lo rotula «RUT» aunque sea de otro país (en el caso, un RFC mexicano). Es el dato que pide `buyer.taxId` en la plantilla de la oferta económica. |
| Condiciones de pago | Pestaña «Información» | En el caso decían «Por definir»; el comprador respondió que se revisan con quienes avancen. La oferta no propone un plazo. |
| Hora de cierre | Ficha | Wherex la muestra en **tu hora local**, sin indicar zona: 19:00 en Santiago era 16:00 en Ciudad de México. Anota las dos. |

El límite de peso de los adjuntos no quedó comprobado en ese caso (el video pesaba 23 MB y se dejó lista una copia
de 9 MB): revísalo en el paso 2 antes de exportar los archivos finales.

### Releer antes de congelar cada documento

Antes de dar por cerrada la propuesta técnica, cada anexo y la oferta económica, vuelve a leer la ficha y el
**Centro de mensajes completo**, incluidas las preguntas de otros proveedores y sus respuestas.

- En la licitación 1164, respuestas a otros proveedores definieron qué cotizar (un «lanzamiento tipo» con sus
  piezas y el desarrollo de la pieza madre), que la muestra de video podía ser un storyboard o animatic, que para
  punto de venta sólo se pedía el diseño y que la volumetría era una referencia para comparar ofertas.
- Una respuesta pedía una propuesta de SLA por niveles de complejidad. Se leyó el 12/10, con la propuesta técnica
  ya cerrada, y obligó a agregar una lámina y volver a exportar.
- Anota cada respuesta que cambie el alcance con su fecha y hora, y comprueba que la propuesta la cubre.

### Pasos

1. Confirma que existe una cotización aprobada, con moneda, impuestos, cantidad/unidad, vigencia y margen
   proyectado. Un presupuesto publicado es un tope o referencia, no un precio que se pueda ingresar sin revisión.
   Si las bases no exigen una planilla propia, la oferta económica que se adjunta es el PDF de la
   [plantilla A4 de Efeonce](../../commercial/templates/cotizacion-a4/README.md), no un Excel.
2. En **Servicio licitado**, mira qué estructura pide esa ficha: varios servicios con `Ofertar`, cantidad y precio
   unitario, o un solo servicio con un monto total. Completa desde la cotización aprobada, en la moneda del
   selector. Revisa que el total de Wherex coincida con el de la oferta económica y verifica si la plataforma
   declara valores con o sin IVA.
3. En **Condiciones y archivos adjuntos**, completa entrega, pago, vigencia y comentario general según la
   propuesta aprobada. Carga cada archivo obligatorio en su campo; revisa tipo y peso máximo. No confundas los
   adjuntos opcionales administrativos, técnicos o económicos con los documentos exigidos.
4. En **Resumen y enviar oferta**, compara servicio por servicio, moneda, total, impuestos, condiciones y número
   de adjuntos contra el expediente interno. Corrige warnings antes de continuar.
5. Pide confirmación humana final que identifique la licitación, total, moneda, archivos, términos a aceptar y el
   destinatario. Sólo con esa confirmación acepta bases/términos y pulsa `Enviar Propuesta`.
6. Conserva el comprobante o estado final que Wherex muestre y actualiza el expediente y el deal. Si la plataforma
   deja la propuesta en borrador, informa ese estado; no la declares enviada.

Si falta una vía de facturación válida para el país del comprador, un documento obligatorio, aprobación de precio,
margen o capacidad, detén el flujo como `operativamente bloqueado`. No se fuerza el envío para cumplir un plazo.

### 3. Leer y devolver los adjuntos

Para cada archivo normativo o brief leído, entrega una síntesis operable: objeto/alcance, situación actual,
requisitos, metas o criterios de evaluación, calendario y pago cuando exista, riesgos/bloqueos y siguiente gate.
Incluye por separado las aclaraciones relevantes que el comprador haya respondido en el Centro de mensajes; no
las confundas con una pregunta ni las dejes implícitas en la interpretación del brief.
No declares fit por el título ni transcribas íntegramente material confidencial. Si el archivo no es interpretable,
decláralo y pide revisión visual; no reemplaces su contenido con una conjetura.

## Formato de entrega

Entrega una tabla como esta y conserva la evidencia mínima que sustenta cada dictamen:

| Comprador / ID | Estado y cierre | Alcance leído | Dictamen | Evidencia, riesgos y siguiente acción |
| --- | --- | --- | --- | --- |
| Organización / código | Nueva o Editando · fecha y hora | Resumen de la ficha y adjuntos leídos | Priorizar, condicionada, no-bid o evidencia insuficiente | Campo/documento que lo prueba; condición o gate pendiente |

El reporte queda protegido en `.auth/wherex-radar-reports/` con permisos `0600`. No copies credenciales,
enlaces firmados de descarga ni información confidencial innecesaria a documentos versionados o al chat.

## Límites de seguridad y control humano

El runner opera en modo lectura. Puede leer la ficha y los adjuntos autorizados para fundar la recomendación, pero el operador conserva el control de toda acción con efecto comercial o contractual. Presentar una oferta, aceptar términos, responder mensajes, cargar archivos o firmar requiere autorización explícita del alcance concreto. Una autorización vigente no se pide de nuevo; el permiso de preparar o firmar no habilita enviar.

Al terminar, el perfil aislado conserva sólo su propia sesión; los archivos temporales de adjuntos se eliminan.

## Referencias

- [Construir una licitación paso a paso](construir-una-licitacion.md)
- [Plantilla A4 de la oferta económica](../../commercial/templates/cotizacion-a4/README.md)
- [Skill de licitaciones: ciclo y go/no-go](../../../.codex/skills/greenhouse-public-private-tenders/SKILL.md)
