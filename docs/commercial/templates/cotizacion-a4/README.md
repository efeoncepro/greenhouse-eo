# Oferta económica documental para licitación · Plantilla A4

Plantilla reutilizable solicitada por Julio el 08/10/2026, derivada del diseño aprobado de la cotización UTEM. Cuatro páginas: portada, alcance/calendario, inversión y condiciones. La cotización presentada a UTEM conserva sus archivos originales; esta plantilla tiene datos de ejemplo sin validez comercial.

## Elegir la vía según el pedido

Esta plantilla sirve para **preparar rápidamente la oferta económica en HTML/PDF de una licitación o Compra Ágil**, a partir de un precio, alcance y condiciones aprobados por el operador. La oferta resultante puede ser el documento formal que se presenta al comprador. La leyenda «Sin validez comercial» pertenece únicamente al ejemplo y se reemplaza al preparar la oferta real.

Es una vía documental local creada para avanzar con la presentación de UTEM. No crea una cotización persistida en Greenhouse ni sustituye su sistema de cotizaciones. Las operaciones habituales de catálogo, costing, pricing engine, builder, aprobaciones y ciclo financiero siguen el [canon de Finance](../../../architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md) y el [cotizador operativo](../../../documentation/finance/cotizador.md). El [programa histórico de pricing comercial](../../../documentation/finance/pricing-comercial.md) conserva su diseño, sin reemplazar ese canon vigente. Para operar esas capacidades, verificar primero su estado actual, permisos y comandos; una descripción de programa o roadmap no acredita disponibilidad runtime.

| Necesidad | Plantilla A4 de licitación | Sistema de cotizaciones Greenhouse |
| --- | --- | --- |
| Preparar la oferta económica que pide el proceso | Usa los datos aprobados y compone cuatro páginas HTML/PDF. | Usar su flujo cuando el pedido incluya una cotización del sistema. |
| Determinar el precio o validar costos y margen | Recibe el precio; sólo calcula neto, impuestos, total y referencia mensual. | Catálogo, costing, pricing engine y sus reglas pertenecen a este dominio. |
| Identificar el documento | `reference` es la referencia documental o el código del proceso. | Un `quoteId` corresponde a un registro del sistema; no se inventa desde el JSON. |
| Aprobar la oferta | La aprobación del operador se documenta en el expediente. `status: draft` es el estado de preparación del archivo. | Los estados y aprobaciones persistidos se operan mediante el flujo del sistema. |
| Registrar o enviar | Guarda archivos locales. Presentación al comprador y cambios CRM se ejecutan y verifican por separado cuando están autorizados. | Persistencia, asociaciones y sincronizaciones se rigen por sus contratos y runtime vigente. |
| Facturar, cobrar o registrar revenue | Las condiciones de pago se muestran en el documento; no se ejecutan operaciones financieras. | Emisión de factura, cobro y ledger siguen los flujos de Finance. |

En el sistema, el [command de autoría/emisión](../../../../src/lib/commercial/submit-quote-from-builder.ts) y el [orquestador de pricing](../../../../src/lib/finance/pricing/quotation-pricing-orchestrator.ts) operan la cotización persistida. Si el trabajo incluye Proposal Studio, su [gate de Quote y margen](../../../../src/lib/commercial/tenders/proposals/quote-gate.ts) necesita una Quote real y margen conocido para evaluar `GO`; un PDF aprobado por el operador no satisface ese gate ni los approvals o el flujo quote-to-cash. No colocar el nombre del archivo, la referencia del proceso o el JSON en `quote_id`/`quotation_id`.

Ejemplos de ruteo para agentes:

- «Ya aprobamos el precio; arma el PDF para esta Compra Ágil con la plantilla que usamos en UTEM»: seguir este README.
- «Crea una cotización en Greenhouse para el cliente/deal y calcula el margen»: cargar el dominio de cotizaciones y Finance; no producir sólo este PDF como cierre del pedido.
- «Arma la oferta y regístrala también en Greenhouse»: preparar el documento y operar el registro como dos acciones con evidencias propias. El renderer no efectúa el registro.

## Archivos de la plantilla

- [Vista previa HTML](vista-previa/cotizacion.html), autónoma y lista para imprimir.
- [Vista previa PDF](vista-previa/cotizacion.pdf), cuatro páginas A4 verificadas.
- [Datos de ejemplo](ejemplo.json): copiar y editar para una nueva cotización.
- [HTML con slots](template.html) y [estilos](template.css): fuente del diseño.
- [Generador](../../../../scripts/documents/render-cotizacion-a4.mjs): resuelve slots, incrusta recursos y exporta HTML/PDF.

## Uso rápido

Desde la raíz de `greenhouse-eo`:

1. Leer las bases del proceso y el expediente vigente. Confirmar qué precio total, alcance, plazo, IVA y condiciones aprobó el operador; esta plantilla no decide esos valores. Si falta una decisión comercial, preparar el resto y resolverla antes de dejar la oferta lista para presentar.
2. Copiar los datos al expediente de la **nueva** propuesta. No reutilizar como salida una carpeta de UTEM ni un paquete ya presentado.

```sh
mkdir -p docs/commercial/tenders/nuevo-proceso/cotizacion
cp docs/commercial/templates/cotizacion-a4/ejemplo.json docs/commercial/tenders/nuevo-proceso/cotizacion/cotizacion.json
```

3. Editar el JSON completo: fecha, referencia, proveedor/responsable, comprador y logo, portada, servicio, alcance, calendario, precio, tasa de IVA y condiciones. El ejemplo contiene entregables SEO/AEO, cantidades, textos de tres meses y CLP4.800.000 **ilustrativos**; no son defaults comerciales ni compromisos para otra licitación. Cambiar `status` de `example` a `draft`, reemplazar las etiquetas de ejemplo por las de la oferta real y quitar «Sin validez comercial» de todos los textos que la conserven. Indicar vigencia y forma de pago aplicables.
4. Generar en una carpeta nueva o vacía. Reemplazar `nuevo-proceso` por el expediente real:

```sh
node scripts/documents/render-cotizacion-a4.mjs --data docs/commercial/tenders/nuevo-proceso/cotizacion/cotizacion.json --out docs/commercial/tenders/nuevo-proceso/cotizacion/v1
```

La carpeta de salida debe ser nueva o estar vacía. Se generan `cotizacion.html`, `cotizacion.pdf`, `datos.json`, `manifest.json` y capturas en `qa/`. Si hay logo del cliente, se conserva también junto al snapshot de datos. Las salidas HTML/PDF incluyen imágenes y fuentes; abren sin conexión. La generación requiere Node, Playwright y las dependencias de marca instaladas en este repo.

5. Revisar las cuatro páginas del **PDF exportado**, además del HTML: legibilidad, folios, encabezado/pie, cortes, logo, textos de ejemplo remanentes y coherencia de alcance, precio, IVA y total. Comprobar extracción de texto y fuentes incrustadas. Los PNG de `qa/` son capturas del navegador; no sustituyen la inspección del PDF. Si falla la reserva A4, acortar o repaginar el contenido preservando el alcance aprobado, sin omitir obligaciones para hacerlo caber.
6. Guardar en el expediente el JSON fuente, HTML/PDF, manifiesto, revisión realizada y la referencia a la aprobación comercial. El manifiesto nace con `visualReview` y `pdfTextAndPageAudit` pendientes; registrar sus resultados sólo después de revisar esa versión. Conservar las versiones que se presenten al comprador y su evidencia de envío. Una presentación o actualización CRM requiere su propia ejecución y verificación; generar HTML/PDF no acredita envío, aceptación, aprobación persistida, facturación ni cobro.

`status: draft` permite producir el documento real para revisión/presentación y no equivale al estado de aprobación de Greenhouse. Los flags `submitted` y `signed`, si se incorporan al JSON del expediente, impiden regenerarlo cuando son verdaderos. La ausencia de esos flags no autoriza sobrescribir un documento presentado: una corrección requiere un nuevo mandato y una nueva versión. El archivo generado empieza con `submitted: false` y `signed: false`; no incorpora firmas.

## Datos y slots

Los atributos `data-slot` permiten localizar los campos en el HTML generado. La edición rápida se realiza sobre el JSON para mantener coherentes los datos repetidos; los marcadores `{{campo}}` del HTML fuente son resueltos por el generador, no por el navegador.

| Campo JSON | Contenido |
| --- | --- |
| `version`, `status` | `1`; `example` o `draft`. Un documento firmado/presentado no se regenera. |
| `date`, `reference` | Fecha `YYYY-MM-DD`; número de cotización o proceso. |
| `supplier` | Razón social, identificación fiscal con etiqueta, responsable, correo y teléfono. |
| `buyer` | Nombre, unidad, identificación fiscal con etiqueta y logo oficial opcional. |
| `cover` | Etiqueta, título de hasta tres líneas y bajada. |
| `service` | Nombre y detalle del servicio completo. Una unidad por cotización. |
| `scope` | Título, introducción y hasta siete componentes con título/texto. |
| `schedule` | Título, nota de inicio y entre una y tres fases con etiqueta/título/texto. |
| `currency`, `locale`, `net` | Moneda ISO 4217 del precio base; locale opcional (`es-CL`, `es-PE`); neto **total** con los decimales propios de la moneda (CLP: 0; USD/PEN: 2). Número o string decimal sin separadores. |
| `vatRate`, `pricing.taxLabel` | Tasa explícita (`0.19` = 19 %), `0` si corresponde y está confirmado, o `null` para impuestos/total facturable por confirmar. Etiqueta opcional (`IVA`, `IGV`, `Impuestos`); elegirla no asigna una tasa. |
| `presentation` | Opcional: moneda/locale de salida y snapshot FX explícito. Ver [contrato multimoneda](MULTIMONEDA.md). |
| `pricing` | Título, introducción, resumen de portada y aclaración tributaria. |
| `pricing.monthly` | Opcional: `{ "months": 3, "note": "…" }`; `null` elimina la referencia mensual. |
| `conditions` | Título y hasta seis condiciones comerciales con título/texto. Incluir vigencia y forma de pago aplicables. |

Los títulos aceptan texto o arrays de líneas. Los campos contienen texto plano, escapado al componer; no admiten HTML. El título de cada componente/condición y su texto tienen slots individuales (`scope.rows.0.title`, `conditions.rows.0.text`, etc.). El logo opcional se declara así; su ruta se resuelve desde el JSON:

```json
"logo": {
  "path": "assets/logo-cliente.svg",
  "source": "https://sitio-oficial-del-cliente.cl/logo.svg"
}
```

Usar un archivo oficial ya descargado. La fuente se registra en el manifiesto. Si `logo` es `null`, aparece el nombre del cliente sin inventar una identidad gráfica. El ejemplo contiene datos corporativos públicos de Efeonce confirmados en [Datos para licitaciones](../../EFEONCE_DATOS_PARA_LICITACIONES.md); verificar responsable e identificación antes de emitir otra oferta.

## Multimoneda

La plantilla admite presentación de monedas ISO mediante `Intl`, con símbolos, separadores y decimales locales. Permite precios nativos en CLP, USD o PEN y equivalencias con un snapshot FX explícito, fechado y con fuente. No consulta tasas al generar ni reescribe el precio base. Uso, campos y límites: [MULTIMONEDA.md](MULTIMONEDA.md). Ejemplo nativo en soles: [ejemplo-pen.json](ejemplo-pen.json); conversión explícita USD → PEN: [ejemplo-usd-pen.json](ejemplo-usd-pen.json). El soporte documental no amplía monedas/providers ni readiness de Finance o del pricing engine.

## Cálculo, marca y revisión

`amount.net`, `amount.vat` y `amount.total` se calculan desde el precio completo: impuestos redondeados a la unidad menor de la moneda de salida y total = neto + impuestos. Con `vatRate: null`, impuesto y total facturable quedan por confirmar. La moneda no decide el tratamiento tributario. Nunca se ingresa el monto mensual en `net` salvo que el servicio cotizado sea efectivamente de un mes. El equivalente mensual es referencial, redondeado para su visualización; no define cuotas ni fechas de cobro. En casos no divisibles, la suma de referencias redondeadas puede diferir del total.

La marca procede de `@efeoncepro/axis-tokens`, `axis-brand-assets` y `axis-graphic-line`: Engine, Poppins/Bricolage, logo oficial, órbita de portada, divisor y burbuja URL horneada. El pie institucional se lee de `src/lib/artifact-composer/catalogs/deck-axis/back-cover-full.slots.json`; no se copia en el JSON comercial. Esta plantilla es un artefacto documental local, sin cambios al Composer ni al runtime de cotizaciones.

El generador comprueba reserva de encabezado/pie, desborde horizontal, carga de fuentes/imágenes y ancho móvil. Si el contenido supera las cuatro hojas, falla con el folio afectado: editar/paginar el texto, sin recortarlo ni reducir automáticamente la tipografía. Tras cambiar datos, revisar **todas las páginas del PDF final**, extracción de texto, fuentes y montos. Cada manifiesto nuevo mantiene esa revisión manual como pendiente.

Referencia verificada: [registro de revisión](VERIFICACION.md). Uso y frontera con Greenhouse: [continuidad de agentes](../../../audits/commercial/2026-10-08-plantilla-cotizacion-licitacion-routing.md). Pruebas del cálculo, validación y escape:

```sh
node --test scripts/documents/document-money.test.mjs scripts/documents/render-cotizacion-a4.test.mjs
```
