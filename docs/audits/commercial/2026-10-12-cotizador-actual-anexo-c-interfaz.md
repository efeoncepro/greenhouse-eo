# Anexo C — Interfaz, PDF y página pública

> **Pertenece a:** [Auditoría del cotizador actual de Greenhouse — 2026-10-12](2026-10-12-cotizador-actual-auditoria.md).
> **Fecha de corte:** 2026-10-12. Rama `develop`.
> **Método:** solo lectura. Cada hallazgo va marcado como **verificado** (visto en una captura o leído en código) o **inferido**.
> **Sobre las capturas:** se tomaron en staging y quedaron en una carpeta local que no se versiona, porque pueden mostrar datos de clientes. Aquí no se enlazan ni se copian: se describe lo que mostró cada cuadro. En staging no se creó, guardó, emitió, compartió ni aprobó nada: las capturas son navegación más estado de formulario en el navegador que nunca se guardó.

Las notas marcadas **«Corrección de la consolidación»** son ajustes hechos al cruzar este informe con los otros dos y al reabrir cada cita.

## 0. Cómo se hizo

- Lectura de código: rutas, vistas, componentes, textos, PDF, compartir y ayudantes de acceso (rutas más abajo).
- Capturas de staging con `pnpm fe:capture` y la sesión de agente, en escritorio (1440 px) y en teléfono (390 px):
  - la lista, en escritorio y teléfono;
  - el constructor vacío, en escritorio y teléfono;
  - el constructor recorrido de punta a punta sin guardar, ocho cuadros por tamaño;
  - el detalle de un borrador creado en Greenhouse, en escritorio y teléfono;
  - la edición de ese mismo borrador, en escritorio y teléfono;
  - el detalle de una cotización emitida en USD sincronizada desde HubSpot;
  - el tablero de compartidos.
- PDF actual: se leyó una muestra de 5 páginas renderizada el 2026-10-11 con `scripts/render-test-pdf.ts` desde el código vigente. No se pidió un PDF a staging porque esa ruta escribe una fila de auditoría y guarda un asset.
- Plantilla A4: se renderizó el ejemplo `ejemplo-lineas.json` de `docs/commercial/templates/cotizacion-a4/` (4 páginas).
- La lista de staging se leyó con `pnpm staging:request /api/finance/quotes` (GET) para elegir identificadores y contar por origen.

## 1. Inventario

| # | Pantalla | Ruta | Quién llega | Qué puede hacer una persona | API |
| --- | --- | --- | --- | --- | --- |
| 1 | Lista de cotizaciones («Cotizaciones») | `/finance/quotes` — `src/app/(dashboard)/finance/quotes/page.tsx:11`, vista `src/views/greenhouse/finance/QuotesListView.tsx` (1.500 líneas) | Menú: Comercial → Cotizaciones (`src/components/layout/vertical/VerticalMenu.tsx:372,386`, códigos de vista `comercial.cotizaciones` o `finanzas.cotizaciones`). La página no tiene guarda propia; la protege el contenedor de finanzas (`src/app/(dashboard)/finance/layout.tsx`) | Filtrar por grupo de estado y por origen, buscar por número / cliente / origen / estado, ordenar por fecha, abrir un panel lateral de vista previa, saltar a detalle / editar / emitir / compartir / facturar / PDF / HubSpot, iniciar una cotización | `GET /api/finance/quotes` (vía `useQuotesList`) |
| 2 | Nueva cotización (asistente de 3 pasos: Contexto / Alcance / Economía) | `/finance/quotes/new` — `…/quotes/new/page.tsx:26-73`, armazón `src/views/greenhouse/finance/workspace/QuoteBuilderShell.tsx` (3.400 líneas) | `canAccessFinanceQuotes` (`src/lib/finance/quotation-access.ts`); el desglose de costos solo con `canViewCostStack` | Elegir organización (buscar y adoptar desde HubSpot), contacto, negocio de HubSpot (o crear uno), línea de negocio, modelo comercial, factor país, moneda, duración, vigencia; agregar líneas desde catálogo / servicio empaquetado / plantilla guardada / manual; ver el precio en vivo; guardar borrador; guardar y emitir | `GET /api/commercial/parties/search`, `POST /api/commercial/parties/adopt`, `GET /api/commercial/organizations/[id]/contacts`, `…/deals`, `GET /api/finance/quotes/pricing/config`, `POST /api/finance/quotes/pricing/simulate`, `POST /api/finance/quotes/from-service`, `POST /api/finance/quotes/author` (`QuoteBuilderShell.tsx:1821`) |
| 3 | Editar cotización (el mismo asistente) | `/finance/quotes/[id]/edit` — `…/[id]/edit/page.tsx:67-253` | Igual que 2; solo `draft` y `approval_rejected` son editables; si no, redirige al detalle (`edit/page.tsx:88-90`) | Igual que 2, con la organización bloqueada | Igual que 2, más `…/lines/[lineItemId]/cost-override` |
| 4 | Detalle, 6 pestañas (General, Cadena documental, Versiones, Aprobaciones, Términos, Auditoría) | `/finance/quotes/[id]` — `…/[id]/page.tsx`, vista `src/views/greenhouse/finance/QuoteDetailView.tsx` (1.363 líneas) | Contenedor de finanzas; los botones de editar y emitir aparecen cuando `canManageFinanceQuotes`, calculado en el navegador desde `/api/auth/session` (`QuoteDetailView.tsx:171-202`); aprobar exige `efeonce_admin` o `finance_admin` (`quotation-access.ts`) | Leer salud de margen, tipo de cambio, totales y líneas; PDF; compartir; editar; guardar como plantilla; emitir; pedir aprobación; decidir una aprobación; crear una versión; elegir términos; leer la auditoría; convertir a factura; seguir OC / HES / ingreso | `GET /api/finance/quotes/[id]`, `…/lines`, `…/health`, `…/fx-snapshot`, `…/versions` (GET/POST), `…/approve` (GET/POST), `…/terms` (GET/PUT), `…/audit`, `…/document-chain`, `…/issue`, `…/convert-to-invoice`, `…/save-as-template`, `…/pdf` |
| 5 | Diálogo de emisión («Emitir cotización») | dentro de 4 — `workspace/QuoteSendDialog.tsx` | como 4 | Confirmar la emisión, con una compuerta de preparación del tipo de cambio | `POST …/issue` |
| 6 | Cajón de compartir («Compartir») | dentro de 4 — `src/views/greenhouse/finance/QuoteShareDrawer.tsx` (706 líneas) | capacidad `commercial.quotation` / `export` (`src/app/api/finance/quotes/[id]/share/route.ts:113-116`) | Crear un enlace corto, copiarlo, enviarlo por correo a contactos de la organización (más una dirección externa), adjuntar el PDF, revocar | `…/share` (GET/POST), `…/share/contacts`, `…/share/[shortCode]/pdf-size`, `…/send-email`, `…/resend-email`, `DELETE …/share/[shortCode]` |
| 7 | Tablero de compartidos | `/finance/quotes/share-dashboard` — `QuoteShareDashboardView.tsx` (320 líneas) | Contenedor de finanzas. **Ninguna vista enlaza a esta página** (el manifiesto de alcanzabilidad declara «inline-link», `src/lib/navigation/route-reachability-manifest.ts:156-163`; una búsqueda de `share-dashboard` en `src` solo encuentra el manifiesto) | Ver enlaces compartidos, abiertos, aceptados, pendientes | `GET /api/finance/quotes/share/dashboard` |
| 8 | Página pública de la cotización (la ve el cliente) | `/public/quote/[quotationId]/[versionNumber]/[token]` — `src/app/public/quote/…/page.tsx`, vista `public-quote/PublicQuoteView.tsx` (423) + `styles.module.css` (863) | Cualquiera con el enlace firmado o con el alias corto `/q/[code]` | Leer la propuesta, desplegar alcance y términos, descargar el PDF, aceptar con nombre y cargo | `POST /api/public/quote/…/accept`; el botón de PDF apunta a la ruta autenticada `/api/finance/quotes/[id]/pdf` |
| 9 | PDF | `GET /api/finance/quotes/[id]/pdf` — `src/lib/finance/pdf/quotation-pdf-document.tsx` + `sections/*` | `requireCommercialTenantContext` (`pdf/route.ts:29-33`) | Abrir en línea o descargar | — |
| 10 | Cajones y diálogos dentro del constructor | `SellableItemPickerDrawer` (catálogo: Roles, Personas, Herramientas, Overhead, Servicios), `QuoteTemplatePickerDrawer`, `CreateDealDrawer`, `CostOverrideDialog`, `QuoteShortcutPalette`, ventana de ajuste (FTE, tipo de contratación) | como 2 | — | `GET /api/finance/quotes/pricing/lookup`, creación de negocio, ajuste de costo |

No se encontró ninguna ruta `mockup` de cotizaciones bajo `src/app` (**verificado** por búsqueda). Las únicas maquetas son HTML estático en `docs/research/mockups/quote-pdf-*.html` y `quote-shareable-web-mockup.html`.

Código de interfaz muerto (**verificado** buscando uso en JSX e importaciones):

- `workspace/QuoteCreateDrawer.tsx` (809 líneas): nada lo renderiza ni lo importa.
- `workspace/QuoteBuilderActions.tsx` (191) y `workspace/QuoteTotalsFooter.tsx` (227): solo los usa el cajón muerto; un ayudante del pie (`formatOutputMoney`) todavía lo importa `AddonSuggestionsPanel.tsx:15`.
- `components/greenhouse/pricing/QuoteContextStrip.tsx` (909): el componente nunca se renderiza; solo se importa un tipo (`QuoteBuilderShell.tsx:63`).
- `components/greenhouse/pricing/CurrencySwitcher.tsx`: solo lo usa la barra de acciones muerta.
- La rama `onSubmit` del armazón, con una segunda pasada de cálculo de precio en el navegador (`QuoteBuilderShell.tsx:1752-1819`): las páginas nunca pasan `onSubmit`.

Cerca de 2.100 líneas de interfaz que ninguna pantalla usa.

### Quién lo usa de verdad (evidencia de los datos que muestran las pantallas)

- **Verificado** (lista de staging, 101 cotizaciones): 64 vienen de HubSpot, 16 de Nubox y 21 se crearon en Greenhouse. De esas 21: 15 borradores, 1 emitida, 2 expiradas y 3 «convertidas» que son fixtures de prueba con nombre `ZZZ-Q2C-SMOKE-*`. Las más recientes creadas en Greenhouse son de junio de 2026 y son artefactos de prueba (la que se abrió lleva el título de verificación de una tarea, cero líneas y total 0). Las 21 están en versión 1.
- **Verificado** (cuadro del tablero de compartidos): compartidas 0, vistas 0, aceptadas 0, pendientes 0, sin abrir 0.
- **Inferido:** hay una sola instancia de Cloud SQL para desarrollo, staging y producción, así que esta es también la foto de producción. La interfaz es un visor de cotizaciones hechas en otra parte, no el lugar donde se hacen.

> **Corrección de la consolidación.** La lista muestra 101 y la base tiene 110: el lector de la lista filtra por organización (`src/lib/finance/quotation-canonical-store.ts:303`) y 9 cotizaciones no la tienen. Por eso aquí se cuentan 21 creadas en Greenhouse y la base cuenta 30. Las 9 que faltan son borradores del portal. Es, además, un defecto de la lista: hay cotizaciones que existen y no se pueden ver.

## 2. El trabajo, paso a paso

Camino común a todos los trabajos (**verificado** en los ocho cuadros del recorrido del constructor): Nueva cotización → abrir el campo de organización, escribir al menos 2 caracteres, elegir → «Continuar al alcance» → agregar líneas → «Revisar economía» → abrir la sección plegada «Detalle y notas» y escribir una descripción → «Guardar y emitir». Mínimo 9 interacciones para una línea.

Dos trampas afectan a todos los trabajos:

- **Un campo obligatorio está escondido.** `validate()` rechaza cualquier guardado sin descripción (`QuoteBuilderShell.tsx:1623-1626`, mensaje «Agrega una descripción breve del alcance.»), pero el campo de descripción solo existe en el paso 3, dentro de un acordeón que arranca cerrado (`:2491-2512`, renderizado solo en `:3185`). «Guardar borrador» está activo desde el paso 1 (**verificado** en el cuadro del constructor vacío) y falla con un mensaje sobre un campo que no está en pantalla. El paso de revisión dice «Listo para emisión» con ese campo vacío (**verificado** en el cuadro de revisión de economía).
- **El margen que se muestra en escritorio está mal.** El motor devuelve el margen como fracción (`src/lib/finance/pricing/pricing-engine-v2.ts:1249-1259`, comparado contra `0.25`), y el panel lateral de escritorio y la ficha de revisión imprimen `Math.round(marginPct) + '%'` (`QuoteBuilderShell.tsx:608-612`, usado en `:741` y `:3141`). Todo margen desde 50 % se imprime «1 %» y todo lo demás «0 %». **Verificado** en un cuadro: en teléfono, el cuadro de revisión de economía muestra «Margen 1 %» en la ficha de revisión y «Margen · 50,0 % · Óptimo» en la barra inferior, para la misma cotización. En escritorio solo se ve el número equivocado.

| Trabajo | ¿Se puede hacer hoy? | Pasos | Dónde la persona se traba o sale de la herramienta |
| --- | --- | --- | --- |
| **Una persona por dedicación** | Sí, con fricción | Camino común + cajón de catálogo → pestaña «Personas» → elegir → «Agregar» → cantidad = meses → ícono pequeño de controles → FTE y tipo de contratación → aplicar. Unas 13 interacciones | La dedicación está detrás de un ícono sin rótulo (`QuoteLineItemsEditor.tsx:1542-1550`, ventana `:1671-1745`). La descripción de la línea no se puede editar en el constructor (ningún campo escribe `description`; solo se imprime, `:623-625`), pero el PDF la imprime. El margen en escritorio es el número equivocado. «1 meses» (**verificado** en captura). La pestaña Personas no se abrió en una captura (**inferido** de `mapSelectionToLine`, `:287-386`) |
| **Un servicio gestionado mensual** | En parte | Camino común + «Servicio empaquetado» → elegir un código de servicio → el servicio se expande en el servidor a sus líneas componentes (`QuoteBuilderShell.tsx:1556-1602`) | El cliente ve roles y herramientas, no una tarifa mensual: no hay forma de presentar un precio todo incluido por mes. La frecuencia de cobro no tiene ningún control: el estado existe (`:998-1000`) pero solo lo fija elegir una plantilla (`:1544-1554`); por defecto es mensual. No hay concepto de cargo de puesta en marcha salvo una línea manual. No hay referencia mensual en el PDF |
| **Un proyecto único** | En parte | Camino común + líneas manuales o de catálogo con unidad «Proyecto» | Se guarda como modelo de precio «project» con frecuencia de cobro «monthly», y ninguno de los dos se puede cambiar en pantalla (`:994-1000`, valores por defecto en `:814-824`). Sin calendario de pagos ni hitos: el PDF tiene una página de cronograma que solo se renderiza cuando hay hitos (`src/lib/finance/pdf/flags.ts`), y el cargador nunca los entrega (`src/lib/finance/quote-share/load-quote-for-pdf-internal.ts` no tiene `milestones`). La persona escribe el calendario fuera de la herramienta |
| **Un negocio con costos de terceros** | No, no de forma honesta | «Línea manual» → nombre, cantidad, unidad, precio unitario | Una línea manual no tiene campo de costo (`makeBlankManualLine`, `QuoteLineItemsEditor.tsx:388-405`; campos en `:1190`, `:1343`, `:1446`). El costo solo se puede ajustar después de guardar la cotización, por línea guardada, y solo por quien puede ver el desglose de costos (`:1555-1574`, `CostOverrideDialog.tsx:166-237`). No se puede elegir el tipo de línea, así que toda línea manual es un «entregable». No existe el concepto de un costo que el cliente paga directo al proveedor. El margen de una cotización así no es confiable |
| **Una cotización con opcionales** | No | — | Los «addons» de esta pantalla son recargos internos que sugiere el motor; marcar uno lo vuelve una línea normal que suma al total (`QuoteBuilderShell.tsx:1467-1526`). No hay línea que se ofrezca al cliente fuera del total, ni línea de cortesía, ni agrupación. Una búsqueda de «optional / opcional» en el constructor no encuentra nada relacionado (**verificado**) |
| **Otra moneda, con impuesto** | Moneda sí, impuesto no | Paso 1 → «Moneda» (CLP, USD, CLF, COP, MXN, PEN; `QuoteBuilderShell.tsx:200-207`) | El impuesto no tiene control. El constructor siempre previsualiza IVA chileno de 19 % en el navegador (`:2020-2030`, `previewChileTaxAmounts(…, 'cl_vat_19')`), sea cual sea la moneda o el país del cliente; el comentario dice que el servidor resuelve la tasa real al emitir. Después de guardar, la pantalla de detalle no es confiable para una cotización que no está en CLP: líneas, subtotal e impuesto se formatean como CLP (`QuoteDetailView.tsx:1144,1155,1171,1179`), la fila de total imprime la conversión a CLP (`:1185`), y una misma pantalla muestra tres totales distintos —un «precio total» en dólares, un «total (USD)» con otra cifra y un «monto total» en cero— más el aviso de que no tiene foto de tipo de cambio y se congelará al emitirla, en una cotización ya marcada «Emitida» (**verificado** en la captura del detalle de la cotización en USD) |

> **Corrección de la consolidación (línea manual sin costo).** El Anexo A lo confirma (F-12): en el motor una línea manual tiene costo igual a precio; al guardarla el costo queda vacío y cuenta como cero, así que el margen guardado se infla.

Revisar, aprobar, enviar, leer:

- **Revisar:** pantalla de detalle. Lo primero que se ve es la tarjeta de margen y la de tipo de cambio; cliente, líneas y totales quedan abajo (**verificado** en los dos cuadros de detalle).
- **Aprobar:** solo dentro de la pestaña «Aprobaciones» de una cotización. No hay cola de cotizaciones esperando aprobación, y la lista no tiene filtro «En aprobación»: esas cotizaciones se cuentan bajo «Borrador» (`QuotesListView.tsx:175-183`). A quien aprueba hay que decirle cuál abrir. (La pestaña no se capturó; **verificado** en código.)
- **Enviar:** «Emitir» cambia el estado; no envía nada (`QuoteDetailView.tsx:540-575`). Enviar es una segunda acción aparte: Compartir → generar enlace → «Enviar por email», que exige al menos un contacto de la organización incluso para enviar a una dirección externa (`QuoteShareDrawer.tsx:241-249`). En los datos, nadie lo hizo nunca.
- **Editar y volver a guardar pierde datos** (**verificado** en código; no se ejerció porque requiere una escritura): la página de edición carga toda cotización con `contractDurationMonths: null` y la frecuencia de cobro forzada a mensual (`edit/page.tsx:231,234`); el armazón siempre envía ambos (`QuoteBuilderShell.tsx:1834-1835`); el comando del servidor toma un `null` enviado como el valor nuevo (`src/lib/commercial/submit-quote-from-builder.ts:617-618`). Abrir una cotización para corregir una letra y guardar borra su duración de contrato y reinicia su frecuencia de cobro.

> **Corrección de la consolidación.** El informe original citaba `submit-quote-from-builder.ts:425-428`, que es el camino de creación. El camino de edición es `:617-618`. La conclusión no cambia. Además: emitir también estampa `sent_at` en la base (`src/lib/commercial/quotation-issuance.ts:59-62`), aunque no se envíe nada.

## 3. Calidad

Estándar de la casa usado: `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md` y `docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md` (un momento dominante por pantalla, sin empapelado de tarjetas, textos desde la capa de textos, reglas de negocio en el servidor, usable a 390 px).

### Jerarquía y densidad

- **Verificado** — Lista: un libro limpio con panel lateral de vista previa; la mejor superficie del conjunto. Pero encabeza con totales de dinero que mezclan todo: el «total del embudo» suma cada cotización de cada origen y estado, incluidos documentos de Nubox, convertidas, expiradas y fixtures de prueba (`QuotesListView.tsx:868-893`). El «margen promedio … dentro de objetivo» es un promedio sin ponderar de las pocas cotizaciones que tienen margen, mientras la columna de margen muestra «—» en casi todas las filas.
- **Verificado** — Las filas de la lista se identifican solo por número; las de HubSpot se leen como una cadena larga de dígitos. El título que la persona le dio a la cotización (su descripción) no se muestra ni se puede buscar (`:839-846`).
- **Verificado** — Constructor: los totales aparecen tres veces en el paso 3 (panel lateral, fichas de «Economía calculada» y, en teléfono, una tercera barra). «Pricing: Listo para simular al agregar ítems» sigue en pantalla después de calculado el precio. «2 addons · Sin calcular» queda en la escalera de totales como si faltara algo.
- **Verificado** — El encabezado del constructor cuenta «0 de 6 campos» y dice «Sigue: agrega un contacto», pero solo son obligatorios la organización, una línea y la descripción escondida (`:2161-2179` contra `:1623-1652`). Dos sistemas de avance (los 6 campos y los 3 pasos) contradicen a la etiqueta «Listo para emisión».
- **Verificado** — Detalle: cinco botones de igual peso en el encabezado (PDF, Compartir, Editar, Guardar como template, Emitir). Un borrador con cero líneas y total 0 se muestra como «Crítico — margen bajo el piso autorizado 0.0%» con «Solicitar aprobación»: una cotización vacía no es un estado vacío. Una cotización sincronizada desde HubSpot sin datos de costo se muestra como «Óptimo — 100.0%»: la tarjeta de salud afirma un margen que no conoce.
- **Verificado** — El encabezado de edición corta su propio título y repite el número en una etiqueta debajo.

### Formularios y validación

- La descripción obligatoria escondida (arriba). **Verificado**.
- Sin control de frecuencia de cobro, modelo de precio, impuesto, condiciones de pago ni fecha de cotización; `quoteDate` es hoy, en silencio (`QuoteBuilderShell.tsx:963`). **Verificado**.
- Líneas: sin control de descuento (el tipo tiene `discountType` / `discountValue`, pero ningún campo los fija), sin descripción, sin tipo de línea, sin reordenar, duplicar ni agrupar. **Verificado** (`QuoteLineItemsEditor.tsx`: las únicas llamadas a `updateLine` son etiqueta, cantidad / periodos, unidad, precio unitario, FTE y tipo de contratación).
- Elegir una plantilla solo muestra «Template seleccionado. Los ítems del template se crearán al guardar.» (`QuoteBuilderShell.tsx:3336-3340`): la persona no puede ver ni cotizar las líneas antes de guardar. **Verificado** en código.
- El campo de búsqueda del estado sin líneas es un botón con aspecto de campo («Buscar catálogo, servicio o template» + «Abrir catálogo»). **Verificado** en la captura de edición.
- La detección de cambios sin guardar solo compara líneas (`:2106-2108`); cambiar el contexto del cliente, la moneda, la duración o la descripción no marca la cotización como cambiada, y «Cancelar» sale sin preguntar (`:1897-1899`). **Verificado** en código.

### Estados

- Lista: esqueleto de carga, sí; **sin estado de error**: la vista solo lee `isPending` (`QuotesListView.tsx:819-821`); una carga fallida se renderiza como lista vacía (**inferido** del código).
- Detalle: existen los estados de carga y de «no se pudo cargar». Existen errores por pestaña.
- Constructor: los errores de precio se anclan a la línea culpable cuando el mensaje contiene un SKU (`QuoteBuilderShell.tsx:1355-1387`); es una buena idea, pero depende de analizar un texto de error con una expresión regular.
- Tablero de compartidos: cada ficha muestra «0 (+0%)» o «0 (-0%)» en verde o rojo cuando no hay datos. **Verificado**.

### Respuesta después de una acción

- Avisos al guardar, emitir y adoptar. Emitir desde el constructor redirige al detalle. Razonable.
- El cajón de compartir usa el `window.confirm` nativo del navegador para revocar y `window.prompt` como respaldo de copia (`QuoteShareDrawer.tsx:212-216,336`). **Verificado**.
- La aceptación pública se registra como `accepted_at` en la cotización pero no cambia su estado (`src/lib/finance/quote-share/accept-quote.ts:74-83`); el filtro «Aceptada» de la lista lee el estado, así que una cotización aceptada seguiría apareciendo como «Emitida». La aceptación solo se ve en el tablero huérfano. El camino de aceptación comprueba la versión, no el estado ni el vencimiento. **Verificado** en código.

### Textos

- El espanglish está en el propio archivo canónico de textos (`src/lib/copy/pricing.ts`): «Business line» / «Sin BL» (`:458-459`), «addons» (`:530-531`), «Pricing» (`:563`), «Pricing y vigencia» (`:139`), «templates», «overhead», «Tier fit» (`:203`), «Deal Desk», «Deal HubSpot», «On-Going», «Chile Corporate», «motor de pricing v2» (`:622`). **Verificado** en capturas y código. A una persona comercial se le pide «fijar el modelo económico antes de enviar ítems al motor de pricing».
- Cadenas fijas fuera de la capa de textos y sin tildes en la vista de detalle: «cotizacion», «Descripcion», «Fecha de emision», «dias», «items» (`QuoteDetailView.tsx:285,811,813,995,1023,1038,1082,1094,1105`). **Verificado**.
- Un voseo en el mismo archivo de textos, en el mensaje que impide aprobar propuestas propias (`pricing.ts:1024`). **Verificado**. Ese texto pertenece a la cola de cambios del catálogo de precios, no a las cotizaciones.
- «1 meses». **Verificado**.
- Jerga interna que llega al documento del cliente (sección 4).

### Accesibilidad básica

- Bien: grupos de campos con leyenda, `aria-current` en los pasos, mensajes en vivo en la búsqueda de organización, botones de ícono rotulados, una paleta de atajos de teclado. **Verificado** en código.
- Débil: confirmación y solicitud nativas; verde / ámbar / rojo como único portador de varios estados; el control de dedicación es un ícono sin rótulo para quien ve (sí tiene `aria-label`). `⌘/Ctrl+Enter` y `⌘/Ctrl+Shift+Enter` guardan o emiten desde cualquier parte, incluso mientras se escribe en un campo (`QuoteBuilderShell.tsx:1916-1935`). **Verificado** en código. No se midieron contraste ni orden de foco.

### Adaptación a 390 px

- **Verificado** — Lista: la primera pantalla y media son encabezado, etiquetas y cinco fichas de indicadores; no se ve ninguna fila. La tabla conserva sus siete columnas: los nombres de cliente se parten letra por letra, la columna de margen queda cortada, y estado, origen y acciones quedan fuera de pantalla.
- **Verificado** — Constructor: la primera pantalla es título, avance, Cancelar y Guardar; el formulario empieza debajo. La fila de línea pierde el precio unitario. Un botón flotante redondo y oscuro aparece en el borde derecho de los cuadros de teléfono; no se pudo identificar.
- **Verificado** — Detalle: cinco botones en varias filas y después la tarjeta de margen.
- El constructor es una herramienta de escritorio; nada de esto explica por qué se cotiza en otra parte, pero no es usable en un teléfono.

### Señales de rendimiento

- Cuatro componentes de cliente gigantes: `QuoteBuilderShell.tsx` 3.400 líneas, `QuoteLineItemsEditor.tsx` 1.816, `QuotesListView.tsx` 1.500, `QuoteDetailView.tsx` 1.363. **Verificado**.
- El detalle se renderiza entero en el navegador: sesión, cotización, líneas, salud y tipo de cambio son cinco solicitudes después del montaje (`QuoteDetailView.tsx:171-175,279-282,453,492`), y una más por pestaña. **Verificado**.
- La lista carga todas las cotizaciones y filtra, ordena, pagina y agrega en el navegador. Aceptable con 101 filas.
- Las páginas de nueva y de edición cargan 200 organizaciones en el servidor para un selector que al crear busca en remoto y al editar está bloqueado (`new/page.tsx:39`, `edit/page.tsx:95`; `QuoteBuilderShell.tsx:1030,2557`). **Verificado**.
- Bien: el precio siempre lo calcula el servidor (`/pricing/simulate`), y guardar vuelve a simular en el servidor (`:1746-1751`). El navegador no es la fuente del precio.

> **Corrección de la consolidación.** Lo anterior vale para el camino que usa esta interfaz (`/author`). Existen otras dos puertas de escritura que sí aceptan el precio de quien llama ([Anexo A, F-03](2026-10-12-cotizador-actual-anexo-a-dominio-api.md)); ninguna pantalla las usa hoy.

### Reglas de negocio calculadas en el navegador

**Verificado:** vista previa del IVA a un 19 % fijo (`QuoteBuilderShell.tsx:2025-2030`); indicadores de la lista y margen promedio (`QuotesListView.tsx:868-893`); umbrales de color del margen (`:185-191`); aritmética del descuento de línea (`QuoteLineItemsEditor.tsx:229-281`); el «6 campos» de avance (`QuoteBuilderShell.tsx:2161`); el permiso para editar y para aprobar derivado de la sesión en el navegador (`QuoteDetailView.tsx:188-197`; el servidor igual lo hace cumplir); días de vencimiento (`:161-168`); un identificador de portal de HubSpot fijo en dos vistas (`QuoteDetailView.tsx:921`, `QuotesListView.tsx:975-979`).

> **Corrección de la consolidación (quién puede aprobar).** La pantalla ofrece decidir a `efeonce_admin` y a `finance_admin`. El servidor, en cambio, compara contra el rol que pide cada paso, y las políticas sembradas piden `finance`, que no es un rol. En la práctica solo `efeonce_admin` podría decidir ([Anexo A, F-11](2026-10-12-cotizador-actual-anexo-a-dominio-api.md)).

### Acceso y navegación

- **Verificado** en código, impacto **inferido:** el menú muestra Cotizaciones a quien tenga `comercial.cotizaciones`, pero el contenedor de finanzas que envuelve la ruta solo acepta códigos de vista `finanzas.*`, el grupo de rutas de finanzas o administrador (`src/app/(dashboard)/finance/layout.tsx`). Una persona solo comercial vería la entrada y caería en `/401`. No se pudo probar con un usuario así.
- **Verificado:** la miga de pan del constructor dice «Finanzas › Cotizaciones» mientras el menú lo ubica bajo Comercial, y el menú no marca ningún elemento activo dentro del constructor.
- **Verificado:** el tablero de compartidos no tiene enlace desde ninguna parte.

## 4. Lo que ve el cliente

### PDF actual (`src/lib/finance/pdf/**`)

Visto en la muestra local renderizada el 2026-10-11 (**verificado**) y leído en código.

Qué muestra: portada (marca Efeonce más la submarca, número y versión, título tomado de la primera frase de la descripción, «Preparada para», «Preparada por» con nombre, cargo y correo, total con impuesto, vigencia, cantidad de líneas, etiqueta de confidencialidad); página de alcance (una tarjeta por línea); tabla de precios (descripción, cantidad, unidad, precio unitario, subtotal; subtotal neto, descuento, impuesto, total; una nota de tipo de cambio cuando corresponde); página de términos (de la biblioteca de términos); página de firmas (bloques del cliente y de Efeonce, verificación por QR cuando el secreto de firma está configurado); pie legal con razón social, RUT, dirección y «Página N de M».

Problemas, todos **verificados** en la muestra o en código:

- Cinco páginas A4 para una cotización de dos líneas; cuatro están casi vacías.
- Los números de sección saltan (03, 04, 06, 07) porque las secciones opcionales se omiten pero los números son fijos.
- La página de alcance repite cada línea dos veces dentro de su propia tarjeta y lleva texto de relleno que no aplica: «Cada bundle agrupa los componentes… Los componentes opcionales se marcan como tales.»
- Lenguaje interno en un documento del cliente: «Pricing por bundle y línea», «BUSINESS LINE», códigos SKU en cada línea y, en la página pública, «Pricing por línea» y la unidad impresa como el valor crudo o el literal `unit` (`PublicQuoteView.tsx:262,291`).
- La vigencia se imprime en formato ISO en la portada y en formato local dos líneas más abajo (`quotation-pdf-document.tsx:58`).
- El bloque de firma imprime el RUT de la empresa en la fila «RUT» personal de quien vende.
- El bloque del cliente solo tiene un nombre: sin RUT, sin persona de contacto, sin logo.
- La página de cronograma de inversión nunca se renderiza porque nada entrega hitos; la submarca está fija en `efeonce` (`load-quote-for-pdf-internal.ts:320`); las secciones «enterprise» dependen de un umbral de monto (`flags.ts`).
- El título es lo que la persona haya escrito en el campo de descripción escondido, cortado en el primer punto.

### Página pública (`src/views/greenhouse/finance/public-quote/**`)

No se vio en vivo: no existe ningún enlace en los datos y crear uno es una escritura. Leída en código (**verificado**); el comportamiento es **inferido**.

- Muestra: encabezado con marca y número, bloque principal («Propuesta Comercial», título, preparada para / por), aviso de vigencia o de expirada, advertencia cuando existe una versión más nueva, 01 Resumen (total, vigencia, líneas, moneda), 02 Alcance (tarjetas plegables), 03 Detalle comercial (tabla y totales, nota de tipo de cambio), 04 Términos (plegable), y acciones: descargar PDF y aceptar con nombre y cargo.
- **El botón de PDF no puede funcionar para un cliente:** enlaza a `/api/finance/quotes/[id]/pdf?download=1` (`page.tsx:63`), que exige una sesión interna (`pdf/route.ts:29-33`). No hay una ruta de PDF por token bajo `/api/public/quote`. Un cliente que hace clic en «Descargar PDF» recibe «Unauthorized».
- La aceptación no actualiza el estado de la cotización y no está condicionada por estado ni por vencimiento (sección 3).
- Sus páginas de error fijan colores, tamaños y una fuente de sistema en línea (`page.tsx:76-154`), fuera del sistema de diseño.
- Tiene su propia hoja de estilos de 863 líneas: un segundo lenguaje visual junto al del PDF y al de la plantilla A4.

> **Corrección de la consolidación.** La advertencia de «versión más nueva» no se alcanza en la práctica: el token se calcula con el total de la versión vigente, así que un enlace a una versión anterior deja de validar en cuanto el total cambia ([Anexo A, F-04](2026-10-12-cotizador-actual-anexo-a-dominio-api.md)).

### Contra la plantilla A4 elegida

Ejemplo renderizado desde `docs/commercial/templates/cotizacion-a4/ejemplo-lineas.json`. Contrato de la plantilla: `docs/commercial/templates/cotizacion-a4/README.md`.

| Capacidad | PDF actual / página pública | Plantilla A4 (v2) |
| --- | --- | --- |
| Largo para una cotización chica | 5 páginas, casi vacías | 4 páginas densas; la sección de precio pagina según el contenido |
| Alcance como relato (qué incluye, en prosa) | No: una tarjeta por línea | Sí: hasta 7 filas de alcance con título y texto |
| Calendario de trabajo / fases | No | Sí: 1 a 3 fases |
| Tabla de precios | Descripción, cantidad, unidad, precio unitario, subtotal | Concepto con detalle, cantidad con unidad («3 meses», «pago único»), valor unitario, valor neto, encabezados de grupo |
| Referencia mensual | No | Opcional |
| Calendario de pagos con impuesto por hito | La página existe, nunca se alimenta | Sí, con sumas comprobadas a la unidad |
| Costos que el cliente paga directo | No | Sí, bloque aparte, con su propia moneda |
| Opcionales fuera del total | No | Sí |
| Línea de cortesía con valor de referencia | No | Sí |
| Impuesto: pendiente / no aplica / monto declarado | Etiqueta y marca de exento desde una foto del servidor | `vatRate`, `taxStatus`, `taxAmount`, `taxPeriods` |
| Bloque del cliente | Solo nombre | Nombre, RUT, logo, persona de contacto («Atención:») |
| Condiciones | Biblioteca de términos, numeradas | Hasta 6 condiciones escritas para el negocio |
| Sumas exactas exigidas | No en la capa del documento | Sí, en la unidad menor; rechaza campos desconocidos |
| **Número y versión de cotización en cada página** | **Sí** | Solo una `reference` de texto libre |
| **Cotización persistida, versiones, auditoría** | **Sí** | No: archivos locales y un manifiesto |
| **Verificación por QR / enlace firmado** | **Sí** (cuando el secreto está configurado) | No |
| **Bloque de firmas** | **Sí** | No («no incorpora firmas») |
| **Términos desde una biblioteca gobernada** | **Sí** | No: texto libre |
| **Vista en línea, seguimiento de vistas, botón de aceptar** | **Sí** | No |
| **Nota de tipo de cambio para una moneda convertida** | **Sí** | Contrato multimoneda aparte (`MULTIMONEDA.md`); la v2 es de una sola moneda |
| **«Página N de M», confidencialidad, pie de entidad legal** | **Sí** | Folio y pie con dirección; sin marca de confidencialidad |
| **Bloque de quien vende** | **Sí** | Responsable del proveedor, correo, teléfono |
| **Submarca** | Presente, fija en código | No |

Lo que el documento actual tiene y la plantilla no: número, versión, QR de verificación, firmas, términos legales gobernados, aceptación en línea y seguimiento, nota de tipo de cambio, confidencialidad. Lo que la plantilla tiene y el constructor hoy ni siquiera puede capturar: alcance en prosa, calendario, calendario de pagos, opcionales, líneas de cortesía, costos pagados por el cliente, persona de contacto, texto de detalle por línea, grupos, condiciones por negocio.

## 5. Conservar, corregir, descartar

| Superficie | Veredicto | Por qué |
| --- | --- | --- |
| Lista de cotizaciones | **Conservar y corregir** | El libro con panel de vista previa funciona y es la única pantalla que se puede usar tal como está. Corregir: totales que mezclan orígenes y estados, búsqueda por título, filtro «En aprobación», estado de error, vista de teléfono, enlace a la actividad de compartidos, cotizaciones sin organización que no aparecen |
| Armazón del asistente (3 pasos, avance, panel «Deal Desk») | **Corregir a fondo o reemplazar** | No expresa cuatro de los seis trabajos, esconde un campo obligatorio, muestra un margen equivocado en escritorio y pierde datos al editar. Vale la pena conservar: la búsqueda de organización con adopción desde HubSpot, los selectores de contacto y de negocio con creación en línea, la simulación de precio en el servidor con errores anclados a la línea, y guardar y emitir en un solo comando |
| Editor de líneas | **Corregir a fondo o reemplazar** | Sin descripción, descuento, tipo, agrupación, línea opcional ni de cortesía, y sin costo en la línea manual. El cajón de catálogo con sus cinco pestañas vale la pena |
| Panel de «addons» | **Descartar como está** | Nombra recargos internos con una palabra que el cliente lee como extras opcionales, y muestra «Sin calcular» en los totales |
| Selector de plantillas / guardar como plantilla | **Conservar y corregir** | La idea es útil; hoy las líneas de la plantilla son invisibles hasta guardar |
| Detalle — pestaña General | **Corregir** | Formato de moneda equivocado, tres totales, margen afirmado cuando se desconoce, cotización vacía mostrada como crítica, margen antes que contenido |
| Detalle — Versiones, Aprobaciones, Términos, Auditoría, Cadena documental | **Conservar** | Es el gobierno que el motor nuevo no tiene: versiones, pasos de aprobación, términos gobernados, rastro de auditoría, vínculo con OC / HES / factura. Agregar una cola de aprobaciones |
| Diálogo de emisión | **Conservar** | Chico y claro; la palabra «Emitir» no debería confundirse con enviar |
| Cajón de compartir | **Conservar y corregir** | Enlace, correo con PDF y revocación son las piezas correctas. Reemplazar la confirmación y la solicitud nativas; relajar «necesita un contacto de la organización» |
| Página del tablero de compartidos | **Descartar la página, conservar el dato** | Huérfana, vacía, con porcentajes sin sentido. Su información pertenece a la lista y al detalle |
| Página pública | **Conservar el mecanismo, rehacer el documento** | El enlace firmado, el alias corto, el seguimiento de vistas y la aceptación tienen valor. Corregir la descarga del PDF, hacer que la aceptación cambie el estado, dejar de aceptar cotizaciones expiradas o en borrador, y alinear la página con el diseño A4 |
| Maquetación del PDF | **Descartar la maquetación, conservar las garantías del documento** | Reemplazar la maquetación de cinco páginas por la plantilla A4; traer número, versión, QR de verificación, firmas, términos gobernados, pie legal y nota de tipo de cambio |
| `QuoteCreateDrawer`, `QuoteBuilderActions`, `QuoteContextStrip` (componente), `CurrencySwitcher`, la rama `onSubmit` | **Descartar** | Código muerto, cerca de 2.100 líneas |
| `QuoteTotalsFooter` | **Descartar, mover su único ayudante** | Solo se usa `formatOutputMoney` |
| Archivo de textos `src/lib/copy/pricing.ts` | **Corregir** | Reemplazar los términos internos en inglés por las palabras que usa una persona comercial; llevar a él las cadenas fijas de la vista de detalle |

## 6. Lo que no se pudo determinar

- Guardar, emitir, pedir y decidir una aprobación, crear una versión, compartir, enviar correo y convertir a factura en la aplicación en marcha: todo son escrituras y no se ejercieron.
- La página pública en vivo: no existe ningún enlace y crear uno es una escritura. Sus fallas de arriba salen del código.
- Un PDF de una cotización real de staging: la ruta escribe una fila de auditoría y un asset. Se leyó una muestra local renderizada el día anterior; no tiene QR porque el secreto de firma no está configurado en local.
- Las pestañas de catálogo Personas, Herramientas, Overhead y Servicios, el selector de plantillas con datos, el desglose de costos y las cinco pestañas secundarias del detalle: leídos en código, no capturados.
- Si una persona solo comercial cae de verdad en `/401` (hace falta un usuario así).
- Si la pérdida de datos al editar y guardar ocurre exactamente como se lee en el código (hace falta una escritura); los tres puntos de código coinciden.
- Qué impuesto aplica el servidor al emitir para un cliente extranjero: el Anexo A muestra que el servidor solo conoce códigos chilenos y por defecto aplica `cl_vat_19`; cuál debería aplicar es una pregunta de negocio.
- El botón flotante oscuro del borde derecho en los cuadros de teléfono.
- No se midieron contraste de color, orden de foco ni comportamiento con lector de pantalla.
