# Auditoría del cotizador actual de Greenhouse — 2026-10-12

> **Fecha de corte:** 2026-10-12 (datos medidos cerca de las 08:10 UTC).
> **Alcance:** el cotizador que hoy vive en el portal: motor de precios (`src/lib/finance/pricing/**`), dominio comercial (`src/lib/commercial/**`), API (`src/app/api/finance/quotes/**`), esquema y datos (`greenhouse_commercial.*` y el gemelo legado `greenhouse_finance.quotes*`), pantallas, PDF y página pública. **No** audita el motor nuevo «Pricing V3» (`src/lib/finance/pricing-v3/**`, `pnpm pricing:v3`).
> **Tipo:** auditoría de código, esquema, datos vivos (solo lectura) e interfaz. Sin cambios de runtime, de datos ni de configuración.
> **Estado:** auditado. Este documento no diseña el reemplazo; eso le corresponde al plan que lo cite.
> **Anexos:** [A · Dominio, motor y API](2026-10-12-cotizador-actual-anexo-a-dominio-api.md) · [B · Base de datos](2026-10-12-cotizador-actual-anexo-b-base-de-datos.md) · [C · Interfaz y documento al cliente](2026-10-12-cotizador-actual-anexo-c-interfaz.md).

## 1. Veredicto

El cotizador actual no se usa para cotizar, y su cálculo y su control no son confiables; lo que sí vale la pena conservar es su capa de gobierno. De las 110 cotizaciones que existen, 64 son espejos de HubSpot, 16 son documentos de Nubox y 30 tienen origen manual (el constructor del portal o scripts de prueba); ninguna de esas 30 parece una cotización comercial real —son pruebas rotuladas o borradores vacíos— y la última es de junio de 2026. Nunca se usó una aprobación, un enlace compartido, una aceptación ni una segunda versión. El cálculo tiene defectos graves verificados en código: pierde los meses al guardar, deja emitir con margen negativo sin pedir aprobación e infla el margen cuando hay líneas manuales; y el control se puede saltar por tres puertas de escritura. No hay historia real que migrar. La lista, las versiones, las aprobaciones, los términos, la auditoría y el enlace público firmado son la parte rescatable, siempre que se corrijan.

Tres consecuencias prácticas para quien decide:

1. **Cambiar el motor no basta.** El número que queda guardado, que viaja a HubSpot y que se imprime no lo produce el motor de precios: lo recalcula una segunda etapa más antigua (hallazgo C-01). Un motor nuevo conectado solo detrás del constructor deja intactas esa etapa y dos puertas de escritura que aceptan precios del que llama.
2. **No hay nada que migrar, pero sí mucho que respetar.** De una cotización guardada cuelgan HubSpot, contratos, ingresos, espejos de Nubox y un token público atado al total (sección 6).
3. **El gobierno existe pero nunca se probó con datos.** Aprobaciones, versiones, enlaces y aceptación tienen cero filas de uso real. Su comportamiento con una segunda versión o con una aprobación de verdad es desconocido.

## 2. Cómo se hizo y qué no se pudo determinar

Tres auditorías independientes, todas de solo lectura, el mismo día:

| Frente | Qué se hizo | Detalle |
| --- | --- | --- |
| Dominio, motor y API | Lectura de código; tres comportamientos ejecutados con números sintéticos sobre funciones puras (sin base de datos); corrida focal de tests del motor, del comando de autoría y del constructor (verde) | [Anexo A](2026-10-12-cotizador-actual-anexo-a-dominio-api.md) |
| Base de datos | Consultas `SELECT` y de catálogo con el usuario de runtime, cada sesión en modo solo lectura y con límite de tiempo. Sin DDL ni DML. Solo agregados | [Anexo B](2026-10-12-cotizador-actual-anexo-b-base-de-datos.md), con el SQL exacto |
| Interfaz | Lectura de código; capturas de staging en escritorio (1440 px) y teléfono (390 px) navegando sin guardar nada; lectura de un PDF de muestra renderizado localmente; render de un ejemplo de la plantilla A4 | [Anexo C](2026-10-12-cotizador-actual-anexo-c-interfaz.md) |

Después, esta consolidación volvió a abrir las citas `archivo:línea` de los tres informes antes de escribir cada hallazgo como verificado (sección 9) y reconcilió las diferencias entre informes (sección 8).

Cada hallazgo lleva una marca:

- **Verificado**: leído en el código en la línea citada, o medido con una consulta.
- **Verificado por ejecución**: además se corrió con números sintéticos.
- **Inferido**: se deduce de lo anterior, pero no se observó.

Hay una sola instancia de Cloud SQL para desarrollo, staging y producción. Por eso los conteos son «todo lo que hay», no una muestra.

**Lo que no se pudo determinar:**

- Nada que requiera escribir: guardar, emitir, pedir o decidir una aprobación, crear una versión, compartir, enviar correo y convertir a factura no se ejercieron en la aplicación.
- La página pública en vivo: no existe ningún enlace compartido y crear uno es una escritura. Sus fallas salen del código.
- El comportamiento con una segunda versión: no existe ninguna en los datos.
- Los valores reales de flags y secretos por ambiente, y si el worker de re-precio masivo está programado.
- Por qué falla el worker de costos, por qué el espejo de HubSpot dejó de crear filas nuevas en la tabla canónica y si los eventos del outbox se purgan (sección 7).
- Contraste de color, orden de foco y lector de pantalla.

## 3. Uso real, en números

Fuente: consultas del [Anexo B](2026-10-12-cotizador-actual-anexo-b-base-de-datos.md) (identificadores `Q1`, `M5`, `N2`, `R1`…).

| Origen de la cotización | Cantidad | Estados | Creadas entre |
| --- | ---: | --- | --- |
| Espejo de HubSpot | 64 | 49 emitidas, 15 borradores | 2026-04-07 y 2026-06-22 |
| Documento de Nubox | 16 | 16 emitidas | 2026-03-19 y 2026-09-23 |
| Portal (`source_system = 'manual'`) | 30 | 24 borradores, 3 convertidas, 2 expiradas, 1 emitida | 2026-04-19 y 2026-06-22 |
| **Total** | **110** | | |

Sobre las 30 del portal:

- 23 las creó la persona técnica de pruebas (agente) y 7 una sola persona interna, en cinco días de abril. Dos autores en total.
- 20 llevan una marca de prueba en el texto; las otras 10 no tienen líneas y su total es cero.
- Las 3 «convertidas» son fixtures de una prueba de cierre: las inserta por SQL directo `scripts/commercial/task-1206-q2c-close-smoke.ts:90-109`, ya en estado emitido, sin pasar por el constructor.
- Solo 10 tienen líneas: 13 líneas en total. Una sola línea guarda la entrada con la que el motor podría recalcularla.
- Todas están en CLP. Las monedas distintas de CLP solo existen en espejos de HubSpot.

Funciones de gobierno, medidas sobre las 110:

| Función | Uso |
| --- | --- |
| Segunda versión de una cotización | 0 (las 110 están en versión 1) |
| Pasos de aprobación | 0 filas; los estados «en aprobación» y «rechazada» nunca se usaron |
| Enlaces compartidos / vistas / aceptaciones | 0 / 0 / 0 |
| Plantillas guardadas | 0 |
| Ajustes manuales de costo | 0 |
| PDF generados y guardados | 1 |
| Filas de auditoría | 20, para 110 cotizaciones |
| Ingresos enlazados a una cotización | 3, los tres de prueba y pendientes |
| Última edición humana registrada en la auditoría del catálogo de precios | 2026-04-22 |

Actividad en el bus de eventos: cerca de 160.000 eventos «sincronizado» para 110 cotizaciones, contra menos de 30 eventos de negocio en seis meses.

## 4. Hallazgos

**Severidad.** *Alta*: produce un precio, un margen o un control equivocado en una cotización real, o expone algo que no debe. *Media*: cuesta confianza o tiempo, o deja un riesgo latente. *Baja*: deuda.

Como hoy nadie cotiza aquí, casi ninguna consecuencia se materializó. Se describen como lo que pasaría con la primera cotización real.

### 4.1 Cálculo

| ID | Sev. | Qué pasa | Consecuencia para el negocio | Evidencia |
| --- | --- | --- | --- | --- |
| C-01 | Alta | Hay dos cálculos en serie. El motor calcula; al guardar, cada línea se reduce a cantidad × precio unitario y una etapa más antigua vuelve a totalizar. El total del motor no se guarda. | El número de registro —el que ve HubSpot, el PDF, la aprobación y la factura— no es el que el motor mostró. Cualquier motor nuevo hereda esto si no cambia también el guardado. | Verificado. `src/lib/finance/pricing/quote-builder-line-items.ts:249-318`; `src/lib/finance/pricing/quotation-pricing-orchestrator.ts:291-342` |
| C-02 | Alta | Los meses se pierden al guardar una línea de rol o de persona. La pantalla guarda los meses aparte y deja la cantidad en 1; el motor cobra precio × meses; lo guardado es 1 × precio mensual. | Una dedicación de 4 meses a 1.000 se muestra como 4.000 mientras editas y se guarda, se envía y se imprime como 1.000. | Verificado por ejecución. `src/views/greenhouse/finance/workspace/QuoteLineItemsEditor.tsx:1287-1310`; `pricing-engine-v2.ts:390-392`; `quote-builder-line-items.ts:295-301`; `line-item-totals.ts:39`. Efecto en datos: inferido |
| C-03 | Alta | Una línea manual se guarda sin costo. En el motor su costo es igual a su precio (margen cero); al guardar el costo queda vacío y cuenta como cero. | El margen guardado se infla. Una línea manual tapa a una línea que pierde plata: en la prueba, una línea a −20 % más una manual dio 80 % de margen guardado. El control de piso usa esa cifra. | Verificado por ejecución. `pricing-engine-v2.ts:828-866`; `quote-builder-line-items.ts:301`; `costing-engine.ts:100-112`; `line-item-totals.ts:98` |
| C-04 | Media | En monedas distintas de USD, el precio de un rol sale de una lista de precios por moneda, pero el margen y el cumplimiento de nivel se calculan sobre el precio teórico en USD. | El margen que ves antes de guardar no es el del precio que cobras, y difiere del que queda guardado. | Verificado. `pricing-engine-v2.ts:402-426`, `:430-439`, `:1249-1261` |
| C-05 | Media | Valores por defecto silenciosos se convierten en precio: margen 35 % si falta la política (y siempre para personas), recargo 15 % en herramientas, 160 horas, factor 1,00 si el modelo comercial o el país no existen, tipo de cambio 1 si falta, objetivo y piso 25 % / 15 %. | Un catálogo incompleto no detiene la cotización: la cotiza con supuestos. Se emiten avisos, pero ningún camino del servidor bloquea por ellos, aunque la documentación funcional dice que los críticos bloquean el envío. | Verificado. `pricing-engine-v2.ts:362`, `:365`, `:561`, `:719`, `:1060-1061`, `:109-145`; `currency-converter.ts:189`; `pricing-config-store.ts:17-18`; `docs/documentation/finance/cotizador.md:396` |
| C-06 | Media | Editar y guardar vuelve a calcular con la fecha de hoy. La vista previa usa la fecha original, pero lo que se envía al guardar no la lleva y el servidor usa hoy. | La misma cotización puede cambiar de precio entre dos guardados sin que nadie toque nada, porque márgenes, factores, tipo de cambio y costos dependen de la fecha. | Verificado. `QuoteBuilderShell.tsx:1821-1845` y `:963`; `src/lib/commercial/submit-quote-from-builder.ts:198` |
| C-07 | Media | El costo base es una semilla de abril. Todas las tablas con vigencia tienen una sola fecha; 28 de 31 costos de rol son «semilla de catálogo»; ninguno viene de nómina. El worker de costos falló en 176 de sus 178 corridas. La tabla de costos modelados está vacía, así que el motor lee la semilla directamente. | Los precios descansan en costos que nadie revisó desde abril de 2026. Los precios en seis monedas comparten fecha: cinco son conversiones congeladas de ese día. | Verificado. Consultas `C1`, `C3c`, `T2`, `X4` (Anexo B); `src/lib/commercial-cost-basis/role-modeled-cost-basis.ts:382-470` |
| C-08 | Media | Redondeo y unidades inconsistentes. El dinero se redondea a dos decimales en punto flotante en cada paso, también en CLP y en UF. El motor expresa márgenes como fracción; lo guardado, como porcentaje. | Diferencias de centavos entre pantallas y documentos, y un error de escala esperando a quien cruce los dos mundos (ya ocurre en la interfaz, U-01). | Verificado. `pricing-engine-v2.ts:47`, `:52-64`; `line-item-totals.ts:36-81`; consultas `C4`, `Z5` |
| C-09 | Baja | Sigue alcanzable un motor de costos anterior para líneas sin entrada del motor actual; usa una tabla de tarifas que está vacía y, para entregables, toma el precio de lista del producto como costo. Los recargos internos automáticos están muertos en la práctica. | Líneas de plantilla o de una versión clonada pueden quedar sin costo o con un costo que en realidad es un precio. | Verificado. `costing-engine.ts:279-336`; `addon-resolver.ts:45-85`; `role_rate_cards` con 0 filas |

### 4.2 Control y aprobación

| ID | Sev. | Qué pasa | Consecuencia para el negocio | Evidencia |
| --- | --- | --- | --- | --- |
| G-01 | Alta | Una cotización con margen negativo se emite sin aprobación. El margen bajo el piso pide aprobación; el margen bajo cero genera una alerta de error que nadie lee al emitir. | El peor caso se salta el control que el caso leve sí activa. | Verificado por ejecución. `src/lib/finance/pricing/margin-health.ts:36-53`, `:91`; `src/lib/commercial/quotation-issue-command.ts:193` |
| G-02 | Alta | Tres puertas escriben precios; solo una recalcula en el servidor. Las otras dos aceptan del que llama el precio unitario, el costo y su desglose. Además, quien cotiza puede fijar su propio piso y objetivo de margen, y cambiar el estado a «emitida» o «convertida» sin compuerta, sin fecha de emisión, sin auditoría y sin evento. | El control de margen se puede anular declarando otro piso u otro costo. El costo manual, que debería ser solo de finanzas, entra por una puerta lateral. Es una brecha interna, no una exposición externa. | Verificado. `src/app/api/finance/quotes/route.ts:522-560`; `src/app/api/finance/quotes/[id]/lines/route.ts:226-265`; `src/app/api/finance/quotes/[id]/route.ts:216-222`, `:295-301`, `:313-314`; `submit-quote-from-builder-schema.ts:78-79` |
| G-03 | Alta | Un documento emitido se puede cambiar en sitio. No hay control de estado al editar por el comando, al reemplazar líneas, al actualizar, al recalcular ni al crear versión; actualizar recalcula por defecto. En la base de datos nada lo impide: no hay disparadores y el usuario de runtime puede modificar y borrar todo. | Lo que el cliente recibió puede dejar de coincidir con lo guardado, sin rastro. La pantalla sí bloquea la edición de emitidas, pero es una barrera de interfaz, no del servidor. | Verificado. `submit-quote-from-builder.ts:564-855`; `[id]/route.ts:492`; `versions-store.ts:152-180`; consulta `G4`; `triggers.txt` (Anexo B) |
| G-04 | Media | Las políticas de aprobación por monto y por descuento no se alcanzan solas. La evaluación de políticas solo corre cuando el margen ya está bajo el piso. | Una cotización grande o con mucho descuento, con margen sano, se emite sin pasar por nadie aunque exista la política. | Verificado. `quotation-issue-command.ts:193-215`; `approval-evaluator.ts:92-131` |
| G-05 | Media | Las políticas sembradas exigen el rol `finance`, que no existe como rol (existen `finance_admin` y `finance_analyst`). El paso solo lo puede decidir un administrador general; a un administrador de finanzas la pantalla le ofrece decidir y el servidor lo rechaza. | El «requiere aprobación de Finanzas» no lo puede cumplir Finanzas. Nunca se notó porque nunca hubo un paso de aprobación. | Verificado en código; que las 3 políticas vivas sean las sembradas es inferido. `migrations/20260417140553325_task-348-quotation-governance-runtime.sql:243-248`; `approval-steps-store.ts:283-289`; `src/app/api/finance/quotes/[id]/approve/route.ts:142-146`; `src/config/role-codes.ts`; consulta `F4` |
| G-06 | Media | Dos callejones sin salida. Tras un rechazo, volver a emitir la misma versión encuentra los pasos viejos y no reabre nada: la cotización queda rechazada para siempre. Y si ninguna política calza, el comando responde «en aprobación» sin haber cambiado el estado. | Una cotización rechazada solo se destraba creando otra versión, cosa que nadie ha hecho nunca. | Verificado. `approval-steps-store.ts:121-139`, `:229`; `quotation-issue-command.ts:230-243`. El segundo caso es poco probable hoy: la política de piso está sembrada |
| G-07 | Media | No hay regla de «quien hace no aprueba». La decisión solo comprueba el rol. | Quien pidió la aprobación puede concedérsela si tiene el rol. | Verificado. `approval-steps-store.ts:283-289` |
| G-08 | Media | El costo se puede leer desde la simulación. La entrada acepta fijar el margen de una línea; con margen cero el precio devuelto es el costo cargado. El carril de ecosistema no pide capacidad y atiende a clientes; una línea de persona acepta cualquier identificador de colaborador. El filtro para clientes deja pasar recargos, factor de cambio y la entrada completa de cada línea. | Un consumidor con acceso al carril puede deducir el costo cargado de un rol o de una persona. Las herramientas de Nexa y de MCP no están afectadas: solo aceptan un código de servicio. | Verificado. `simulate-input-schema.ts:26`, `:36`; `pricing-engine-v2.ts:66-92`, `:561-568`; `src/lib/api-platform/resources/ecosystem-quotation.ts:23-26`, `:47-74`; `pricing-output-redaction.ts:80-108` |

### 4.3 Modelo de datos

| ID | Sev. | Qué pasa | Consecuencia para el negocio | Evidencia |
| --- | --- | --- | --- | --- |
| M-01 | Alta | Una tabla guarda tres cosas distintas: el espejo de HubSpot, documentos tributarios de Nubox y la cotización propia. Cien columnas cuyo significado depende del origen; un mismo «emitida» significa cosas distintas según de dónde vino. | Cualquier total, embudo o indicador que no filtre por origen mezcla ventas, documentos tributarios y pruebas (ya pasa en la lista, U-06). | Verificado. Consultas `Q1`, `Q2`; `quotation-canonical-store.ts:963` |
| M-02 | Alta | Una versión no es una foto fiel y el precio no se puede reproducir. La versión guarda el arreglo de líneas y cuatro totales; moneda, tipo de cambio, impuesto, términos y vigencia quedan en la fila mutable. Crear una versión no copia la entrada del motor. Editar no refresca la foto. Ninguna fila guarda fecha de catálogo, nivel de margen, factor ni versión de motor. | No puedes reconstruir por qué una cotización costó lo que costó, ni demostrar qué se le ofreció al cliente en una versión anterior. | Verificado. `versions-store.ts:224-289`; `submit-quote-from-builder.ts:829`; consultas `J6`, `J8`, `N5` (36 de 100 fotos vacías) |
| M-03 | Media | El número de cotización no es único ni secuencial. Se genera al azar en dos lugares con dos generadores distintos, sin reintento, y dos puertas aceptan un número dado por quien llama. El número de contrato se deriva del de cotización por reemplazo de prefijo. | Una colisión es improbable hoy, pero nada la impide y se propagaría al contrato. | Verificado. `submit-quote-from-builder.ts:93-100`; `quotes/route.ts:217-223`, `:386`; `[id]/route.ts:293`; `contract-lifecycle.ts:99`; sin `UNIQUE` ni secuencia (Anexo B §1.1) |
| M-04 | Media | La historia es mutable y se borra en cascada. Borrar una cotización borra versiones, líneas, auditoría, pasos de aprobación, términos y fotos de servicio. La auditoría no registra creación ni ediciones. | No hay rastro de quién cambió qué. En el mismo esquema, tablas más nuevas sí tienen protección de solo-agregar; aquí no se aplicó. | Verificado. Consultas `G4`, `J9`; restricciones (Anexo B §3.4) |
| M-05 | Media | Faltan amarres básicos: estado contra sus fechas (44 emitidas sin fecha de emisión), línea contra su versión (4 líneas cuelgan), cotización contra su negocio de HubSpot (45 de 64 cuelgan), enlaces y PDF contra la cotización, moneda extranjera contra su tipo de cambio. La organización, el cliente y el espacio son opcionales. | Datos inconsistentes que ya existen, y una lista que esconde lo que no tiene organización (U-06). | Verificado. Consultas `N2`, `N6`, `O1`, `Z2` |
| M-06 | Media | Dinero con dos escalas en una misma columna: la tasa de impuesto está como porcentaje en 9 filas y como fracción en 74. Márgenes en fracción en unas tablas y en puntos porcentuales en otras. La moneda de la línea es opcional. Siete precisiones distintas para montos. | Cualquier cálculo que lea esas columnas sin saber la escala se equivoca por un factor de cien. | Verificado. Consultas `Z4`, `C4`, `Z5`, `T0`, `L2` |
| M-07 | Baja | Cinco ejes de «modelo» superpuestos (dos idénticos en las 110 filas, uno con un solo valor). 20 columnas de cotización y 17 de línea nunca se escribieron. Once tablas con cero filas desde abril. | Complejidad sin uso que cualquier reemplazo debe decidir si arrastra. | Verificado. Consultas `Q5`, `Z3`, `colstats` |
| M-08 | Baja | El modelo de monedas está partido: el motor y la base aceptan seis; el tipo que se guarda y el recálculo, tres (CLP, USD, UF). El impuesto es solo chileno. | Una cotización en COP, MXN o PEN no se puede recalcular. | Verificado. `contracts.ts:10`, `:202`; `quotation-pricing-orchestrator.ts:849-859` |
| M-09 | Baja | La arquitectura documentada nombra cinco tablas que no existen. | Quien lea el documento de arquitectura planifica sobre un esquema que no es. | Verificado. Anexo B §1.5 |

### 4.4 Integraciones

| ID | Sev. | Qué pasa | Consecuencia para el negocio | Evidencia |
| --- | --- | --- | --- | --- |
| I-01 | Alta | Los borradores se empujan a HubSpot como cotizaciones publicadas. La proyección de salida se dispara al crear y al actualizar, y crea la cotización en HubSpot con publicación inmediata y estado «sin aprobación requerida». No hay flag en ese camino. | Un borrador, o una prueba, aparece en el CRM como una cotización vigente del negocio. En los datos hay 7 envíos y una cotización de prueba del portal con identificador de HubSpot. | Verificado en código; efecto observado parcialmente. `quotation-hubspot-outbound.ts:22-30`; `push-canonical-quote.ts:129-142`; `hubspot-quote-sync.ts:93`, `:445`; consultas `G1`, `M5` |
| I-02 | Media | El espejo de HubSpot dejó de crear filas nuevas en la tabla canónica después del 2026-06-22, aunque sigue refrescando las 64 que ya tiene. La tabla legada va 8 cotizaciones adelante. | Las cotizaciones recientes hechas en HubSpot no aparecen en el portal. La causa no se determinó. | Verificado. Consultas `Y1`, `Y2`, `X2`, `O1` |
| I-03 | Media | El gemelo legado sigue siendo la tabla de aterrizaje de HubSpot y Nubox, y solo tiene llave primaria. El espejo reescribe las 64 cotizaciones y emite un evento por cada una en cada corrida, haya cambio o no. | Ruido: unas 160.000 notificaciones para 110 documentos. Dos tablas que hay que mantener de acuerdo. | Verificado. Consultas `G1`, `X3`; Anexo B §3.3 |
| I-04 | Media | Las referencias a negocios de HubSpot son texto libre y 45 de 64 no apuntan a ningún negocio guardado. Hay tres lugares que responden «qué negocio es». | El embudo por negocio no se puede cruzar con confianza. | Verificado. Consulta `O1` |
| I-05 | Baja | El cierre de cotización a factura solo corrió sobre fixtures. Los tres ingresos resultantes son de prueba y siguen pendientes en el libro financiero compartido. | Datos de prueba en el mismo libro que los reales. | Verificado. Consultas `Z1`, `F1b`; `scripts/commercial/task-1206-q2c-close-smoke.ts:90-109` |
| I-06 | Baja | El catálogo de productos que se envía a HubSpot tiene 41 de 77 productos en estado «endpoint no desplegado». La acción de Nexa para crear cotizaciones está apagada en todos los ambientes. | Una línea de catálogo sin producto enlazado en HubSpot hace fallar el envío de esa cotización. | Verificado. Consulta `T3`; `hubspot-quote-sync.ts:404`; `src/lib/nexa/flags.ts:73` |

### 4.5 Interfaz

| ID | Sev. | Qué pasa | Consecuencia para el negocio | Evidencia |
| --- | --- | --- | --- | --- |
| U-01 | Alta | El margen que se muestra en escritorio está mal. El motor entrega una fracción y la pantalla la redondea y le pone «%»: todo margen desde 50 % se ve como «1 %» y todo lo demás como «0 %». | Quien cotiza decide con un número falso. En un mismo cuadro de teléfono se ve «Margen 1 %» en un panel y «50,0 % · Óptimo» en otro, para la misma cotización. | Verificado en código y en captura. `QuoteBuilderShell.tsx:608-612` |
| U-02 | Alta | Un campo obligatorio está escondido. Sin descripción no se guarda, pero ese campo solo existe en el paso 3, dentro de un acordeón cerrado. «Guardar borrador» está activo desde el paso 1 y falla nombrando un campo que no está en pantalla. | La primera experiencia de quien intenta cotizar es un error que no entiende. | Verificado. `QuoteBuilderShell.tsx:1623-1626`, `:2491-2512`, `:3185` |
| U-03 | Alta | Abrir una cotización para editarla y guardar borra la duración del contrato y devuelve la frecuencia de cobro a mensual. La página de edición carga ambos vacíos, la pantalla siempre los envía y el servidor toma el vacío como valor nuevo. | Corregir un error de tipeo cambia condiciones comerciales sin avisar. | Verificado en código, no ejercido. `src/app/(dashboard)/finance/quotes/[id]/edit/page.tsx:231`, `:234`; `QuoteBuilderShell.tsx:1834-1835`; `submit-quote-from-builder.ts:617-618` |
| U-04 | Alta | Cuatro de los seis trabajos de cotización no se pueden expresar: un servicio mensual con precio todo incluido, un proyecto con calendario de pagos, un negocio con costos de terceros y una cotización con opcionales. Solo «persona por dedicación» y «otra moneda» se logran, con fricción. | La persona termina el trabajo fuera de la herramienta. Coincide con el uso medido. | Verificado en código y capturas. Tabla completa en [Anexo C §2](2026-10-12-cotizador-actual-anexo-c-interfaz.md) |
| U-05 | Media | El detalle no es confiable fuera de CLP: líneas e impuesto con formato CLP, y tres totales distintos en una misma pantalla. La tarjeta de salud afirma un margen que no conoce: «Óptimo 100 %» en un espejo sin costos, «Crítico 0 %» en un borrador vacío. | Una pantalla de revisión que no sirve para revisar. | Verificado en captura y código. `QuoteDetailView.tsx:1144`, `:1185` |
| U-06 | Media | La lista encabeza con totales que mezclan todo (orígenes, estados, documentos de Nubox, pruebas) y con un margen promedio sin ponderar. Además esconde toda cotización sin organización: hoy, 9 borradores. No tiene filtro «en aprobación» ni estado de error; una carga fallida se ve como lista vacía. | El «embudo total» de la pantalla no es un embudo. Y hay cotizaciones que existen y nadie puede ver. | Verificado. `QuotesListView.tsx:868-893`, `:175-183`, `:819-821`; `src/lib/finance/quotation-canonical-store.ts:303` |
| U-07 | Media | No hay cola de aprobaciones: se aprueba solo dentro de una cotización, y hay que avisarle al aprobador cuál abrir. «Emitir» no envía nada al cliente —aunque marca la fecha de envío—; enviar es una segunda acción aparte que exige un contacto de la organización. | El flujo depende de avisos por fuera. Nadie llegó nunca al segundo paso. | Verificado. `QuoteDetailView.tsx:540-575`; `quotation-issuance.ts:59-62`; `QuoteShareDrawer.tsx:241-249` |
| U-08 | Media | El menú muestra «Cotizaciones» bajo Comercial, pero la ruta vive bajo el contenedor de Finanzas, que solo acepta vistas de finanzas. | Una persona solo comercial vería la entrada y caería en «sin acceso». | Verificado en código; impacto inferido (no se probó con ese usuario). `VerticalMenu.tsx:372`, `:386`; `src/app/(dashboard)/finance/layout.tsx` |
| U-09 | Baja | Reglas de negocio calculadas en el navegador: IVA fijo de 19 % en la vista previa sea cual sea el país, indicadores de la lista, umbrales de color, permisos derivados de la sesión. Cerca de 2.100 líneas de interfaz que ninguna pantalla usa. Cuatro componentes de más de 1.300 líneas. Jerga interna en inglés dentro del propio archivo de textos, un voseo y cadenas sin tildes fuera de la capa de textos. No es usable en teléfono. | Deuda. Nada de esto explica por qué se cotiza en otra parte, pero encarece cualquier arreglo. | Verificado. Detalle en [Anexo C §3](2026-10-12-cotizador-actual-anexo-c-interfaz.md) |

### 4.6 Documento que ve el cliente

| ID | Sev. | Qué pasa | Consecuencia para el negocio | Evidencia |
| --- | --- | --- | --- | --- |
| D-01 | Alta | El botón «Descargar PDF» de la página pública no puede funcionar para un cliente: apunta a una ruta que exige sesión interna. No existe una ruta de PDF por token. | El cliente hace clic y recibe «no autorizado». | Verificado en código; no visto en vivo. `src/app/public/quote/[quotationId]/[versionNumber]/[token]/page.tsx:63`; `src/app/api/finance/quotes/[id]/pdf/route.ts:29-33` |
| D-02 | Alta | El enlace público no mira el estado y la aceptación no tiene efecto. Se puede aceptar un borrador, una expirada o una rechazada. Aceptar solo estampa columnas: no cambia el estado, así que la lista la sigue mostrando como «emitida». No hay límite de intentos. | Una aceptación del cliente no mueve nada en el proceso y podría recaer sobre un documento que no está vigente. | Verificado. `src/lib/finance/quote-share/accept-quote.ts:59-91`, `:101`; `load-quote-for-public-view.ts:146-212` |
| D-03 | Alta | El token del enlace está atado al total guardado de la versión vigente. Si el total cambia un centavo, el enlace y el QR impreso dejan de validar. Un enlace a una versión anterior deja de validar en cuanto la versión nueva tiene otro total, así que el aviso «hay una versión más nueva» no se alcanza. | Recalcular una cotización ya compartida rompe el enlace que tiene el cliente (ver también la sección 6). | Verificado. `src/lib/finance/pdf/qr-verification.ts:42-55`, `:114-123`; `load-quote-for-public-view.ts:191-212` |
| D-04 | Media | El PDF actual ocupa cinco páginas para dos líneas, cuatro casi vacías. La numeración de secciones salta. Lleva lenguaje interno («Pricing por bundle y línea», «BUSINESS LINE», códigos internos por línea), una misma fecha en dos formatos, y el bloque de firma imprime el RUT de la empresa en la fila personal de quien vende. El cliente aparece solo con su nombre. | El documento no tiene el nivel de lo que se envía hoy por fuera. | Verificado en la muestra y en código. `src/lib/finance/pdf/quotation-pdf-document.tsx:58`; `PublicQuoteView.tsx:262`, `:291` |
| D-05 | Media | El documento no puede decir lo que la plantilla A4 elegida sí dice: alcance en prosa, calendario de trabajo, calendario de pagos, costos que el cliente paga directo, opcionales fuera del total, líneas de cortesía, persona de contacto. La página de calendario de inversión existe pero nada la alimenta. | La plantilla A4, a su vez, no tiene número y versión por página, QR de verificación, firmas, términos gobernados, vista en línea ni aceptación. Ninguno de los dos documentos tiene todo. | Verificado. Comparación completa en [Anexo C §4](2026-10-12-cotizador-actual-anexo-c-interfaz.md); `load-quote-for-pdf-internal.ts:320` |

## 5. Qué vale la pena conservar

Estos veredictos vienen de los tres informes. «Conservar» significa conservar la capacidad, no necesariamente el código tal como está.

| Pieza | Veredicto | Por qué |
| --- | --- | --- |
| Lista de cotizaciones con panel de vista previa | Conservar y corregir | Es la única pantalla usable hoy. Corregir totales, búsqueda por título, filtro de aprobación, estado de error, lo oculto sin organización |
| Pestañas de versiones, aprobaciones, términos, auditoría y cadena documental | Conservar | Es el gobierno que el motor nuevo no tiene. Agregar una cola de aprobaciones |
| Comando de autoría (`submitQuoteFromBuilder`) | Conservar | Contrato validado, capacidad comprobada dentro del comando, precio recalculado en el servidor, precios de catálogo no modificables |
| Emisión | Conservar | Controles de estado explícitos, compuerta de tipo de cambio, foto de tipo de cambio, auditoría y eventos en una sola transacción |
| Enlace público firmado, alias corto, seguimiento de vistas, aceptación | Conservar el mecanismo, rehacer el documento | Corregir la descarga, que la aceptación cambie el estado y que no acepte borradores ni expiradas |
| Cajón de compartir | Conservar y corregir | Enlace, correo con PDF y revocación son las piezas correctas |
| Garantías del PDF: número, versión, QR, firmas, términos gobernados, pie legal, nota de tipo de cambio | Conservar; descartar la maquetación de cinco páginas | La plantilla A4 no las trae |
| Búsqueda de organización con adopción desde HubSpot, selector de contacto y de negocio con creación en línea | Conservar | Lo mejor del constructor |
| Catálogo con vigencia por fecha, dinero en `numeric`, foto de impuesto con regla de coherencia, llaves foráneas desde finanzas y contratos | Conservar | Bien modelado, aunque la vigencia nunca se ejerció |
| Asistente de tres pasos y editor de líneas | Corregir a fondo o reemplazar | No expresan cuatro de seis trabajos, esconden un campo obligatorio, muestran un margen falso y pierden datos al editar |
| Panel de «addons» | Descartar como está | Nombra recargos internos con una palabra que el cliente lee como extras opcionales |
| Página del tablero de compartidos | Descartar la página, conservar el dato | Huérfana: ninguna pantalla enlaza a ella |
| Código muerto de interfaz (unas 2.100 líneas) y puerta `/api/finance/quotes/hubspot` (responde 410) | Descartar | Nada lo usa |

## 6. Restricciones que cualquier reemplazo debe respetar

Hechos, no diseño. Todo lo que sigue cuelga de una cotización guardada.

1. **El contrato guardado.** Cabecera y líneas tienen columnas que otros leen tal cual: totales, margen en porcentaje, piso y objetivo, ingresos recurrentes, total en CLP, impuesto; por línea, cantidad, unidad, precio y costo unitarios, subtotales, descuento, recurrencia. Lectores: HubSpot, página pública y PDF, cierre a factura, aprobación, proyecciones de embudo y rentabilidad. Lista completa en [Anexo A, F-02](2026-10-12-cotizador-actual-anexo-a-dominio-api.md).
2. **Las tres puertas de escritura legadas.** `POST /api/finance/quotes`, `POST /api/finance/quotes/[id]/lines` y `PUT /api/finance/quotes/[id]` siguen vivas y sin flag. Cambiar el motor detrás del constructor no las cubre. Hay además scripts que insertan por SQL directo.
3. **El token público atado al total.** Cambiar la regla de redondeo basta para invalidar enlaces y QR. Hoy hay cero enlaces, así que el costo de cambiarlo es nulo *ahora*.
4. **HubSpot.** Identificadores de cotización y de negocio en la cabecera, de línea y de producto en las líneas. El envío exige al menos una línea, frecuencia de cobro coherente con la recurrencia, producto enlazado para líneas de catálogo y una tasa de impuesto que calce con un grupo de HubSpot. Hoy se dispara también para borradores.
5. **Espejos que no son cotizaciones propias.** 64 filas de HubSpot y 16 documentos de Nubox viven en la misma tabla, sin entrada de motor. No deben recalcularse ni reinterpretarse. El gemelo legado es su tabla de aterrizaje.
6. **Contratos e ingresos.** 25 contratos nacen de una cotización; una tabla de enlace impide borrar la cotización; el ingreso apunta a la cotización y viceversa; órdenes de compra y hojas de entrada de servicio llevan su identificador. El número de contrato se deriva del de cotización.
7. **Identidad y versión.** El identificador de cotización lo referencian otras 11 tablas. El par cotización–versión es la llave de líneas, pasos de aprobación, PDF, enlaces, vistas y auditoría.
8. **Estados y listas cerradas en la base.** Seis estados, seis monedas, cuatro tipos de línea, cuatro unidades, tres códigos de impuesto. «Enviada» y «aprobada» ya no existen como estado: quedaron fundidas en «emitida».
9. **Proyecciones de servicio.** El embudo de cotizaciones (72 filas, refrescadas el día de la medición) y el de negocios leen estado, modelos, total en CLP, margen y fechas del ciclo.
10. **Impuesto.** Solo Chile, con foto por cabecera y por línea y una regla de coherencia en la base.
11. **Catálogo compartido con HubSpot.** El catálogo de productos se materializa desde roles, herramientas, recargos y servicios, y se envía a HubSpot. Reemplazar esas tablas cambia lo que HubSpot recibe.
12. **Lo que no es restricción.** No hay cotizaciones reales del portal que preservar: 30 pruebas o borradores vacíos, 13 líneas con precio del motor, una sola entrada recalculable.

## 7. Preguntas abiertas

1. ¿Por qué el espejo de HubSpot dejó de crear filas canónicas nuevas tras el 2026-06-22, mientras la tabla legada siguió recibiendo cotizaciones (3 desde agosto)?
2. ¿Por qué falla el worker de costos casi todos los días desde abril, y de dónde salen entonces las fotos de costo con fecha de hoy que cubren 11 personas y 2 roles?
3. ¿Se purgan los eventos del outbox? Si no, el constructor no emite «creada» de forma confiable: hay 3 eventos para 30 cotizaciones.
4. ¿Cómo se comporta una segunda versión —copia de líneas, foto, PDF, enlace—? No existe ninguna.
5. ¿Los envíos a HubSpot de borradores y pruebas dejaron cotizaciones publicadas en el CRM que haya que limpiar?
6. ¿Están programados el re-precio masivo y la proyección de salida a HubSpot en producción? ¿Qué valores reales tienen los flags? El registro de flags se contradice a sí mismo sobre dos de ellos.
7. ¿Una persona con acceso solo comercial cae de verdad en «sin acceso» al abrir Cotizaciones?
8. ¿La pérdida de datos al editar (U-03) ocurre tal como se lee? Tres puntos de código coinciden; falta ejercerlo.
9. ¿Qué impuesto corresponde a un cliente extranjero? El servidor solo conoce códigos chilenos y por defecto aplica IVA 19 %.
10. ¿La heurística de «es una prueba» clasificó mal alguna cotización real? Es textual. El grupo de la persona interna son 7 cotizaciones, todas rotuladas como prueba.
11. ¿Existen copias de estas tablas en BigQuery con otra historia? No se examinaron.

## 8. Diferencias entre los tres informes y cómo se resolvieron

| Diferencia | Resolución |
| --- | --- |
| La interfaz vio **101** cotizaciones en la lista; la base tiene **110**. | **Resuelta en código.** El lector de la lista filtra por organización (`quotation-canonical-store.ts:303`) y 9 cotizaciones no tienen organización. 110 − 9 = 101. |
| «**21** creadas en Greenhouse» (interfaz) contra «**30** del constructor» (base). | **Resuelta.** Las 9 ocultas son todas borradores del portal: cada celda origen × estado de la lista coincide con la base salvo borradores del portal (15 contra 24). Que sean exactamente las 9 sin organización es inferido, por aritmética. |
| «30 del constructor». | **Matizada.** Al menos 3 de las 30 no pasaron por el constructor: las inserta por SQL un script de prueba. Lo exacto es «30 con origen `manual`». |
| El dominio dejó como pregunta si el número de cotización es único. | **Resuelta por la base:** no hay `UNIQUE` ni secuencia. |
| El dominio dijo que el número se genera «en dos copias» de 6 caracteres hexadecimales. | **Corregida:** son dos generadores distintos; uno hexadecimal desde un UUID, otro base 36 desde `Math.random`. |
| El dominio dijo que el re-precio masivo por defecto toca cotizaciones «enviadas» y «aprobadas» (documentos emitidos). | **Corregida a la baja.** Esos dos estados no pueden existir: la base los prohíbe. Con ese criterio el worker solo alcanza borradores y pendientes. Los otros dos criterios (por identificadores y por periodo) sí carecen de filtro de estado (`quote-reprice-bulk.ts:45-63`). |
| El dominio listó «enviada» y «aprobada» como estados convertibles. | **Aclarada:** el código los nombra, la base no los admite. Solo «emitida» es alcanzable. |
| El dominio dijo que la documentación funcional afirma lo contrario sobre la fecha al editar. | **Matizada:** la documentación es correcta para la vista previa; lo que diverge es el recálculo al guardar (C-06). |
| El dominio dejó como dato desconocido si existe una política de «margen bajo el piso». | **Resuelta en el repositorio:** está sembrada por migración. La base muestra 3 políticas con los mismos roles requeridos. Que sean las mismas es inferido. |
| La interfaz dijo que aprueba un administrador general o de finanzas; el dominio, que se comprueba el rol del paso; la base, que el rol guardado es `finance`. | **Resuelta, y es un hallazgo nuevo (G-05):** `finance` no es un rol. |
| La interfaz preguntó cómo trata el motor una línea con precio y sin costo. | **Resuelta por el dominio** (C-03). |
| El dominio no pudo determinar si los eventos llegan a HubSpot. | **Resuelta en parte por la base:** hay 7 envíos registrados (el último en junio) y 5 fallos. Sigue abierto si quedaron publicadas (pregunta 5). |
| La interfaz citó `submit-quote-from-builder.ts:425-428` para la pérdida de datos al editar. | **Corregida:** esas líneas son del camino de creación. El camino de edición está en `:617-618`. La conclusión se mantiene. |
| El texto de «no puedes aprobar tus propias propuestas» parece contradecir G-07. | **Aclarada:** ese texto es de la cola de cambios del catálogo de precios, otra función (`ApprovalsQueueView.tsx:144`). En cotizaciones no hay tal regla. |
| El origen del costo de un rol: «foto modelada» (dominio) contra «tabla de fotos modeladas vacía» (base). | **Resuelta en código:** con la tabla vacía, el lector cae al supuesto del catálogo sembrado (C-07). |

## 9. Citas verificadas

Antes de escribir un hallazgo como verificado se abrió la línea citada. Se revisaron cerca de 160 referencias de línea en unos 55 archivos, que cubren todos los hallazgos de severidad alta y media de este documento.

Correcciones aplicadas:

| Cita original | Corrección |
| --- | --- |
| `[id]/route.ts:310-311` (piso y objetivo de margen) | `:313-314` |
| `[id]/route.ts:214-221` (estados aceptados) | `:216-222` |
| `submit-quote-from-builder.ts:425-428` (pérdida al editar) | `:617-618` |
| `quotation-pdf-document.tsx:60` (fecha en formato ISO) | `:58` |
| `hubspot-quote-sync.ts:444` | `:445` |
| `pdf/route.ts:30-34` | `:29-33` |

Afirmaciones debilitadas o reformuladas: el alcance del re-precio masivo sobre documentos emitidos, el generador del número, la contradicción con la documentación funcional sobre la fecha, y el primer callejón de aprobación (sección 8). Ninguna cita resultó inexistente.

No se reabrieron una por una las consultas de la base (no hubo conexión en esta consolidación): sus cifras se toman del informe de datos, que adjunta el SQL exacto.

## 10. Referencias

- Plantilla A4 elegida: `docs/commercial/templates/cotizacion-a4/README.md`.
- Mapa de promoción del motor nuevo: `docs/documentation/finance/cotizador-v3-promocion-canonica.md`. No menciona la segunda etapa de cálculo, las puertas legadas, el token atado al total ni la pérdida de meses.
- Documentación funcional del cotizador actual: `docs/documentation/finance/cotizador.md`.
- Arquitectura: `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`.
- Auditorías anteriores relacionadas: [Quote-to-Cash 2026-06-20](COMMERCIAL_QUOTE_TO_CASH_DEEP_AUDIT_2026-06-20.md), [costos y cotización 2026-08-02](../finance/GREENHOUSE_FINANCE_COST_QUOTING_AUDIT_2026-08-02.md), [cotizaciones legadas 2026-05-07](../finance/TASK-557.1_LEGACY_QUOTES_AUDIT_2026-05-07.md).
- Trabajo abierto que toca lo mismo: `TASK-622` (aprobación multinivel), `TASK-628` (enmiendas), `TASK-623` (precios por volumen), `TASK-562`, `TASK-552`, `TASK-576`, `TASK-499`, `TASK-1206`, `TASK-1222`, `TASK-2017`.
