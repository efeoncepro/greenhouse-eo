# Channel & Commerce — catálogo de servicios

> **Línea de negocio:** Channel & Commerce (en mercado: **trade marketing**)
> **Marca contractual:** Efeonce
> **Estado:** `Proposed` — habilita prospección exploratoria y diagnósticos cotizados caso a caso
> **Decisión de negocio 2026-09-10:** oferta completa desde el primer contrato, ejecución mixta gobernada y
> tecnología propia como destino de fase 3. Owner de línea: Julio Reyes (interino)
> **Mercado inicial:** Chile
> **Última actualización:** 2026-09-10
> **Decisión canónica:** [`EFEONCE_CHANNEL_COMMERCE_LINE_DECISION_V1`](../../architecture/EFEONCE_CHANNEL_COMMERCE_LINE_DECISION_V1.md) (`Accepted` 2026-09-10)
> **Modelo económico:** [`CHANNEL_COMMERCE_BUSINESS_MODEL_V1`](../../business-models/channel-commerce/CHANNEL_COMMERCE_BUSINESS_MODEL_V1.md)
> **Fases y capital:** [`roadmap`](../../business-models/channel-commerce/CHANNEL_COMMERCE_PHASED_ROADMAP_V1.md) · [`modelo de caja`](../../business-models/channel-commerce/CHANNEL_COMMERCE_CAPITAL_AND_CASH_MODEL_V1.md) · [`proveedores`](../../business-models/channel-commerce/CHANNEL_COMMERCE_SUPPLIER_REGISTRY_V1.md)
> **Evidencia de mercado:** [`benchmark chileno 2026-09-10`](../../audits/commercial/CHANNEL_COMMERCE_CHILE_MARKET_BENCHMARK_2026-09-10.md)

## Propósito

Channel & Commerce gobierna la inversión de canal de una marca que vende a través de terceros: qué se ejecuta en
el punto de venta, cuánto cuesta, qué retorno produce y dónde reasignar el próximo peso.

**No es una agencia de terreno.** El resultado que se vende es una decisión de canal con evidencia, y la capacidad
de intervenir donde esa evidencia lo justifica. No se vende cobertura por cabeza, no se vende hora de mercaderista
y no se vende material impreso.

## Estado y límites

**Qué es canónico y qué no.** La taxonomía de los 23 servicios —nombre, alcance, exclusiones, unidad de cobro y
boundaries con otras líneas— **es canon**: no se inventan servicios fuera de esta lista ni se renombran en una
propuesta. Lo que sigue bloqueado es la dimensión comercial.

`Proposed` significa: se puede conversar, diagnosticar y cotizar caso a caso. **No** se puede publicar precio,
comprometer cobertura, prometer tiempos de respuesta, contratar capacidad de terreno ni firmar recurrente hasta
cerrar los gates G1 a G6 del business model.

Claims prohibidos hasta tener evidencia propia fechada: incremento de venta o sell-out atribuido a la línea;
porcentajes de ahorro frente a la agencia del cliente; cobertura nacional; y "Perfect Store" como resultado
garantizado — es un marco de scoring, no una promesa.

## Managed Channel Operations — la modalidad operativa

**No es un servicio de la lista. Es la capa que envuelve toda la lista**, y es la razón por la que el cliente
contrata a Efeonce en vez de contratar directo al proveedor que pone las manos.

Sigue el patrón ya canonizado en Media & Distribution, donde Managed Media Operations tampoco es una solución
adicional sino la modalidad recurrente que gobierna las demás.

### Ejecutar no es operar

| | Qué significa | De quién es |
|---|---|---|
| **Ejecutar** | Poner las manos: recorrer la tienda, capturar, reponer, activar, montar | Propio **o** de un proveedor, según la fase y la capa |
| **Operar** | Planificar el ciclo, fijar el método y el estándar, dirigir, validar la calidad del dato, gobernar a los proveedores, leer el resultado, decidir y responder ante el cliente | **Siempre de Efeonce, en las tres fases** |

Un proveedor ejecuta una misión. Efeonce decide qué tiendas, con qué criterio, contra qué estándar, valida que la
evidencia sea real, interpreta el resultado, prioriza la intervención y responde si algo falla. Esa es la
diferencia entre operar y revender.

### Qué incluye operar

- **Plan del ciclo:** qué puntos de venta, con qué frecuencia, qué se mide y por qué.
- **Método y estándar:** el modelo de scoring, las reglas de negocio y el criterio de priorización — es IP de
  Efeonce y no cambia porque cambie el proveedor.
- **Dirección y supervisión:** instrucción, capacitación del estándar y resolución de excepciones.
- **Control de calidad:** validación de la evidencia, auditoría cruzada de muestras, rechazo y reproceso. **Nunca
  se publica al cliente un dato que Efeonce no validó.**
- **Gobierno de proveedores:** selección, back-to-back, medición de desempeño, reemplazo y continuidad.
- **Lectura y decisión:** el reporte, la lista priorizada, la recomendación del ciclo siguiente y la sesión con el
  cliente.
- **Accountability:** un solo responsable ante el cliente, pase lo que pase aguas abajo.

### Por qué esto es lo que se cobra

El fee de Efeonce remunera **la operación**, no la ejecución. La ejecución de terceros es pass-through documentado
y sin margen. Esa separación es la que hace defendible el precio: el cliente paga por el método, el estándar, la
validación, la decisión y la responsabilidad — no por un intermediario entre él y un proveedor que podría
contratar solo.

Si en alguna propuesta Efeonce no aporta plan, estándar, validación ni decisión, **esa propuesta no debería
existir**: es reventa, no es esta línea.

### Lo que cambia por fase y lo que no

```text
Cambia:     quién pone las manos en cada capa.
No cambia:  que Efeonce opera, decide y responde.
```

---

## Los veintitrés servicios

Agrupados como los nombra el mercado chileno —trade marketing y BTL— y no por nuestra taxonomía interna. La oferta
es completa desde el primer contrato: **Efeonce opera los veintitrés siempre**; lo que cambia por fase es quién
pone las manos en cada capa.

### Trade marketing — lo continuo, lo que pasa en la góndola todo el año  ·  13 servicios

| § | Servicio | Qué compra el cliente | Momento | Unidad |
|---|---|---|---|---|
| **T1** | **Diagnóstico de Ejecución de Canal** | Qué se puede medir, qué está roto y en qué orden intervenir | Entrada | Proyecto cerrado |
| **T2** | **Auditoría de Inversión de Canal** | Qué componente de su presupuesto de canal no tiene retorno demostrable | Entrada | Proyecto cerrado |
| **T3** | **Cobertura Auditada** | El estado por PDV y la **lista priorizada** de intervención, cada ciclo | Núcleo recurrente | PDV × ciclos |
| **T4** | **Equipo de Terreno Gestionado** | Que las tiendas críticas queden intervenidas, con evidencia antes/después | Intervención | Capacidad mensual |
| **T5** | **Orquestación de Terreno** | Que sus proveedores actuales se comparen contra el mismo estándar | Entrada alternativa | Proveedores × mercados |
| **T6** | **Anaquel Digital y Visibilidad en IA** | Cómo se ve su producto en cada ficha de retailer y si la IA lo recomienda | Expansión | Según owner |
| **T7** | **Retail Media y Commerce** | Operar su inversión en las redes de las cadenas, leída junto a la góndola | Expansión | Según owner |
| **T8** | **Diseño y Medición de Promociones** | Si la promoción vendió de más o canibalizó margen; incluye concursos y sorteos | Avanzado | Proyecto por ola |
| **T9** | **Estándar de Tienda Perfecta** | Definir qué significa "bien ejecutado" por canal y formato, antes de medir | Entrada consultiva | Proyecto cerrado |
| **T10** | **Arquitectura de Distribución y Cobertura** | Dónde está, dónde no está y qué vale cada punto que falta | Entrada o expansión | Proyecto por zona |
| **T11** | **Integración de Datos de Canal** | Sell-in, sell-out y ejecución leídos juntos en un solo lugar | Infraestructura | Implementación + operación |
| **T12** | **Capacitación de Fuerza de Venta del Canal** | Que quien vende su producto y no trabaja para él sepa venderlo | Expansión | Programa por ola |
| **T13** | **Gestión de Categoría** | Hablarle al retailer en el idioma de la categoría, no en el de su marca | Avanzado, condicionado | Proyecto por categoría |

### BTL — lo episódico, lo que pasa en momentos  ·  9 servicios

| § | Servicio | Qué compra el cliente | Dónde ocurre | Unidad |
|---|---|---|---|---|
| **B1** | **Activaciones en Sala Medidas** | Sampling, demo o degustación que se reporta en delta contra tiendas de control | En la tienda | Ola: tiendas × días |
| **B2** | **Promotoría e Impulso** | Venta asistida en sala que además reporta qué pasa en esa tienda | En la tienda | Turnos × salas |
| **B3** | **Visual Merchandising y Exhibiciones** | Que la exhibición se instale bien **y siga instalada** | En la tienda | Puntos × período |
| **B4** | **Roadshow y Tour de Marca** | Una gira leída plaza por plaza, no como total nacional | Multi-ciudad | Plazas × días |
| **B5** | **Street Marketing y Sampling Masivo** | Entrega masiva con registro de dónde, cuándo y a quién | Fuera de la tienda | Puntos × días |
| **B6** | **Pop-up y Espacios Efímeros** | Un espacio temporal con objetivo comercial y métrica desde el día uno | Espacio propio temporal | Proyecto por período |
| **B7** | **Activación de Patrocinios** | Que el patrocinio ya pagado produzca algo más que un logo | En el evento patrocinado | Proyecto por temporada |
| **B8** | **Ferias y Exposiciones** | Que la feria termine en pipeline y no en una caja de tarjetas | Feria del rubro | Proyecto + seguimiento |
| **B9** | **Encuentros de Canal** | Que la convención o el lanzamiento al canal tenga objetivo y seguimiento | Evento propio B2B | Proyecto cerrado |

### Transversal

| § | Servicio | Qué compra el cliente | Unidad |
|---|---|---|---|
| **X1** | **Contenido y Material de Canal** | Material a escala —fichas, catálogos, PDP, kits, adaptaciones por cadena— y el contenido derivado de cada activación | Capacidad gobernada |

> **El catálogo es amplio; la conversación no.** Veintitrés servicios son la capacidad de la línea, no la agenda
> de la primera reunión. Se entra por una puerta —T1, T2, T5, T9 o T10 según el trigger— y el resto aparece cuando
> el cliente lo pide o la evidencia lo justifica. Presentar el catálogo completo en la primera conversación
> dispersa y transmite que no se entendió el problema.

### Lo que hace distinta esta oferta BTL

El BTL del mercado se vende como **producción y presencia**. Acá se vende con tres cosas que casi nadie incluye:

1. **Diseño de medición antes de ejecutar.** Tiendas de control en B1, lectura por plaza en B4, métrica de éxito
   acordada antes de abrir en B6, seguimiento post-feria en B8. Definir cómo se va a leer **después** de ejecutar
   ya no sirve.
2. **La activación alimenta el dato del canal.** Quien activa, promociona o implementa ya está en la tienda: ese
   pase es materia prima de T3 sin costo adicional de captura. B3 es el caso más claro — verificar que la
   exhibición siga instalada sale gratis de la cobertura.
3. **Cada activación deja activos, no sólo fotos de reporte.** El contenido capturado (X1) se reutiliza en social,
   retail media y creator, con derechos definidos desde el brief.

**Lo que no cambia:** la producción física —montaje, mobiliario, estructuras, stands, bodega, transporte,
permisos y seguros— la contrata y responde Efeonce, pero **la ejecuta un proveedor** y se factura como
pass-through. No nos convertimos en productora.

### Cómo esta lista responde al mercado

| Lo que el comprador ya tiene | Qué le falta | Servicio |
|---|---|---|
| Una agencia de terreno con un tablero que describe | Que le digan **qué arreglar primero y por qué** | T3 |
| Una plataforma que detecta y prioriza | **Quién ejecuta la corrección y cierra el ciclo** | T4 |
| Activaciones que reportan contactos | Saber **si vendieron** | B1 |
| Exhibiciones pagadas por mes | Saber si **duraron el mes** | B3 |
| Un patrocinio caro y una activación pobre | Los derechos contratados **que no está usando** | B7 |
| Ferias con caja de tarjetas | Las **tres semanas siguientes** | B8 |
| Inversión en retail media creciendo | **Leerla junto con la góndola** de esa misma cadena | T6 y T7 |
| Varias agencias por canal o país | Un **estándar común** para compararlas | T5 |
| Un puntaje de ejecución que no lo deja decidir | Que el **estándar esté bien definido** antes de medir | T9 |
| Foco sólo en las tiendas donde ya está | Saber **dónde no está y qué vale** | T10 |
| Sell-in en el ERP y sell-out en planillas sueltas | Las tres verdades **leídas juntas** | T11 |
| Vendedores del distribuidor que no conocen el producto | Capacitación **medida contra control** | T12 |
| Negociar espacio marca por marca | Proponer **cómo se ordena la categoría** | T13 |

> **T6 y T7 son la razón de ser de la línea.** El [benchmark](../../audits/commercial/CHANNEL_COMMERCE_CHILE_MARKET_BENCHMARK_2026-09-10.md)
> y las [battlecards](../../audits/commercial/CHANNEL_COMMERCE_COMPETITIVE_BATTLECARDS_V1.md) confirman que ningún
> actor chileno —ni el software de ejecución ni las agencias de servicio— conecta la góndola con la inversión
> digital. El resto de la oferta te hace creíble y te da la relación; esto es por lo que te eligen.

## Qué se puede vender con el capital actual

Con CLP 40.000.000 asignados, el [modelo de caja](../../business-models/channel-commerce/CHANNEL_COMMERCE_CAPITAL_AND_CASH_MODEL_V1.md)
fija el límite: **una cuenta ancla a la vez**, con tope entre ~$6,5M y ~$31M de facturación mensual según la
estructura de pago que se negocie. La segunda cuenta entra sólo con dos ciclos consecutivos cobrados en plazo.

Consecuencia práctica al cotizar: los servicios de los bloques A, B y D consumen poco capital de trabajo. Los del
bloque C —donde hay proveedores y producción que se pagan antes de cobrar— son los que consumen caja. Un contrato
que combine C intensivo con pago a 90 días y sin factoring aprobado para ese deudor **no se toma**.

---

## T1 · Diagnóstico de Ejecución de Canal

**Promesa.** Al terminar sabes qué se puede medir de tu canal, qué está roto hoy en una muestra real y en qué
orden intervenir.

**Problema y owner.** El Trade Marketing Manager no tiene una foto de ejecución que no haya armado a mano. El
problem owner es el Gerente Comercial.

**Alcance incluido.** Mapa de arquitectura de canal (cadenas, distribuidores, canal tradicional, digital);
inventario de data existente y obtenible con su calidad; diseño del modelo de scoring; **muestra de auditoría
real** sobre un subconjunto de puntos de venta; hallazgos priorizados por impacto × costo de intervención;
roadmap con las tres primeras decisiones.

**Opcional.** Ampliar la muestra; incluir observación de competencia; incorporar lectura de digital shelf.

**Excluido.** Ejecución continua; intervención en tienda; integración de sistemas; negociación con cadenas;
cualquier proyección de venta.

**Entregables y aceptación.** Informe con la lista priorizada y el mapa de data. Se acepta cuando el cliente puede
tomar la decisión de reasignación sin pedir análisis adicional.

**Ciclo.** `intake → inventory → design → propose → approve → execute → verify → document → measure`

**Responsabilidades.** Efeonce: diseño, ejecución de la muestra, análisis. Cliente: acceso a puntos de venta,
autorización de cadenas cuando aplique, data de sell-in, surtido y precio objetivo.

**Dependencias y estados degradados.** Sin acceso a sala o sin data base, el diagnóstico se entrega **degradado y
declarado**: se reporta lo que no se pudo observar en vez de estimarlo.

**Métricas.** Cobertura efectiva de la muestra; integridad del dato; número de decisiones habilitadas.

**Continuidad.** Alcance cerrado, sin renovación automática. La fase siguiente se cotiza aparte y sin obligación
de compra.

**Packaging (hipótesis).** Proyecto cerrado por complejidad: mercados × cadenas × marcas × calidad de data. Sin
precio publicado.

---

## T2 · Auditoría de Inversión de Canal

**Promesa.** Sabes cuánto vale realmente tu inversión de canal y cuál de sus componentes no tiene retorno
demostrable.

**Por qué existe separado de T1.** Este entra por el bolsillo, no por la tienda. Es el mismo wedge con el
ángulo financiero, y su interlocutor natural es Comercial con Finance al lado. En organizaciones donde el trade
spend es una línea grande y opaca del P&L, este ángulo abre puertas que el diagnóstico de ejecución no abre.

**Alcance incluido.** Descomposición de la inversión de canal por tipo (descuentos, rebates, promociones,
material, personal de terreno, retail media); trazabilidad de cada componente; identificación de gasto sin
medición asociada; y diseño del marco de lectura para el ciclo siguiente.

**Excluido.** Auditoría contable; revisión de deducciones y disputas con cadenas; recomendación de negociación
comercial; cualquier cifra de retorno prometida.

**Aceptación.** El cliente puede defender o cuestionar cada componente de su inversión de canal con trazabilidad.

**Composición.** Requiere participación de `greenhouse-finance-accounting-operator` para el marco analítico. No
sustituye a Finance del cliente.

---

## T3 · Cobertura Auditada  ·  *núcleo recurrente*

**Promesa.** Cada ciclo recibes el estado de ejecución de tu canal por punto de venta y la lista priorizada de
intervención.

**Job.** "Cuando invierto en canal y no sé qué pasó en la tienda, quiero ver dónde está roto y en qué orden
arreglarlo."

**Alcance incluido.** Plan de cobertura por ciclo; ejecución de misiones de auditoría; control de calidad y
verificación de evidencia; scoring normalizado por punto de venta y cadena; detección de quiebres, precio,
material y cumplimiento de planograma; observación de competencia en sala; reporte con priorización;
y la sesión de lectura del ciclo.

**Opcional.** Ampliación de cobertura; frecuencia mayor; SKUs adicionales; observación ampliada de competencia.

**Excluido.** Intervención en tienda (es T4); material POP; mercadería; negociación con cadenas;
garantía de venta o sell-out.

**Entregables y aceptación.** Score por PDV y cadena con su denominador declarado, lista priorizada, evidencia
verificable. **Trust policy:** si la cobertura efectiva no supera el umbral del ciclo, se entrega degradado y
declarado; nunca se extrapola.

**Quién captura.** La captura puede ejecutarse con red propia o con un proveedor especializado bajo la capa de
partners. El [benchmark chileno](../../audits/commercial/CHANNEL_COMMERCE_CHILE_MARKET_BENCHMARK_2026-09-10.md)
recomienda **partner**: existen redes crowdsourced regionales con una década de operación, y construir una propia
sería competir por una capacidad contratable. Lo que Efeonce conserva en cualquier caso es el diseño del scoring,
la validación del dato, la traducción a decisión y la accountability ante el cliente.

**Responsabilidades.** Cuando la red es propia, Efeonce dirige, supervisa y capacita — indelegable. Cuando es de
un partner, Efeonce responde por el resultado y gobierna al proveedor. Cliente entrega surtido objetivo, precio
objetivo, planograma y autorizaciones.

**Métricas.** Cobertura efectiva; tasa de rechazo de misión; integridad del dato; tiempo de ciclo; adherencia a la
priorización.

**Continuidad.** On-Going por ciclos, con compromiso inicial suficiente para que el segundo ciclo sea comparable
con el primero. Un solo ciclo no produce tendencia.

**Packaging (hipótesis).** Puntos de venta auditados × ciclos. **Nunca** por hora ni por visita de persona.

---

## T4 · Equipo de Terreno Gestionado  ·  *se ofrece desde fase 1; con capacidad propia sólo tras los gates*

**Promesa.** Las tiendas que la auditoría marcó como críticas quedan intervenidas, con evidencia del antes y el
después.

**Qué compra el cliente.** Capacidad gobernada y accountability de delivery. **No** compra perfiles, ni horas, ni
dedicación. Sigue el precedente del [Embedded Managed Pod](../creative-services/EFEONCE_EMBEDDED_CREATIVE_POD_OPERATING_MODEL_V1.md)
de Creative Services.

**Boundary indelegable.** Efeonce dirige, supervisa y capacita a su propio personal. Si el cliente pasa a dirigir
el día a día, deja de ser subcontratación de servicios y se convierte en suministro de personal — figura que
Efeonce no presta. En Creative este boundary es económico; acá es **legal**.

**Alcance incluido.** Equipo dimensionado sobre la priorización; dirección y supervisión; capacitación; backup y
sucesión; evidencia fotográfica y de cumplimiento; cumplimiento documental laboral y previsional al día;
reporte de remediación.

**Excluido.** Reposición ilimitada; transporte y bodegaje de mercadería; tareas fuera del scope acordado;
cobertura garantizada antes de que exista red operativa; y cualquier instrucción directa del cliente al personal.

**Dependencias duras.** Requiere T3 activo o data de ejecución equivalente provista por el cliente. Sin
priorización, un pod es reposición ciega.

**Cómo se ejecuta según la fase.** El servicio **se ofrece desde el primer contrato**. En fase 1 lo ejecuta un
proveedor gobernado bajo compromiso back-to-back exigible, con Efeonce respondiendo ante el cliente por el
resultado. La capacidad propia entra en fase 2 y sólo cuando cumple las tres condiciones de internalización
—margen, data propietaria y control de calidad—. Ver [`CHANNEL_COMMERCE_PHASED_ROADMAP_V1`](../../business-models/channel-commerce/CHANNEL_COMMERCE_PHASED_ROADMAP_V1.md).

**Gates previos a ejecutarlo con personal propio.** Opinión legal escrita sobre la figura (G4); feasibility gate
completo de [Talent Assurance](../../business-models/EFEONCE_TALENT_ASSURANCE_ECONOMIC_GUARDRAILS_V1.md) con cost
snapshot fechado (G6); y evidencia de recruitability. Ofrecerlo vía proveedor no exige estos gates; **ejecutarlo
con gente propia, sí**.

**Packaging (hipótesis).** Capacidad mensual comprometida. Nunca cabeza/día.

---

## T5 · Orquestación de Terreno

**Promesa.** Tus proveedores de terreno dejan de reportar cada uno a su manera y empiezan a compararse contra el
mismo estándar.

**Para quién.** Marcas que ya tienen dos o más agencias de terreno por país, canal o categoría, y ninguna lectura
consolidada.

**No confundir con Managed Channel Operations.** Esta última es la modalidad con que Efeonce opera **sus propias**
capas y proveedores en cualquier servicio, y no se cotiza aparte. Field Orchestration es un servicio vendible
distinto: gobernar los proveedores **que el cliente ya tiene contratados**, sin desplazarlos.

**Alcance incluido.** Estandarización del modelo de scoring entre proveedores; consolidación de la data;
cadencia de gobierno; evaluación comparada de desempeño; recomendación de reasignación de cobertura y
presupuesto.

**Excluido.** Reemplazar a los proveedores; asumir su responsabilidad laboral; renegociar sus contratos.

**Economía.** Fee de gobierno de Efeonce. El costo de los proveedores es **pass-through sin margen**. Se rige por
[`EFEONCE_PARTNER_PROVIDER_LAYER_OPERATING_MODEL_V1`](../../business-models/EFEONCE_PARTNER_PROVIDER_LAYER_OPERATING_MODEL_V1.md).

**Por qué importa — y por qué subió de prioridad.** Es el servicio de mayor margen y menor riesgo operativo de la
línea, y el único que no requiere red propia. El benchmark chileno encontró que **ningún actor del mercado se
posiciona gobernando a otros: todos se posicionan ejecutando**. Es el espacio menos disputado del peer set.

---

## T6 · Anaquel Digital y Visibilidad en IA  ·  *composición con Wave*

**Promesa.** Sabes cómo se ve tu producto en el anaquel digital —y si los asistentes de IA lo recomiendan cuando
alguien pregunta por tu categoría.

**Por qué es el diferenciador de la línea.** La auditoría de anaquel físico la hacen varios. La lectura de si un
motor de IA cita o recomienda tu producto en el momento de compra no la hace nadie en trade marketing LATAM, y
Efeonce ya tiene el motor: Search Visibility 360 y el AI Visibility Grader.

**Alcance incluido.** Disponibilidad, precio y contenido en PDP de retailers y marketplaces; calidad de ficha de
producto; reviews; share of shelf digital; y visibilidad de la marca y sus productos en motores de respuesta IA.

**Ownership.** El motor y la metodología de visibilidad pertenecen a **Wave / Search Visibility 360**. Channel &
Commerce lo compone y lo traduce a decisión de canal. RACI explícito en cada propuesta.

---

## T7 · Retail Media y Commerce  ·  *owner: Media & Distribution*

Ya existe en el catálogo de [Media & Distribution](../media-distribution/README.md) dentro de Performance &
Commerce. **No se reimplementa acá.** Channel & Commerce lo nombra porque es el destino natural de expansión
cuando el cliente invierte en retail media sin lectura de ejecución física, y porque en Chile la categoría está
creciendo con Walmart Connect, Cencosud Media, Fmedia, Sodimac Media, Ripley Media y Mercado Ads.

La propuesta compuesta declara owner, RACI y facturación por línea.

---

## T8 · Diseño y Medición de Promociones

**Promesa.** Sabes si la promoción vendió de más o simplemente adelantó y canibalizó margen.

**Alcance incluido.** Diseño de mecánicas promocionales e incentivos al canal y a la fuerza de venta; **concursos
y sorteos al consumidor**, con la coordinación del cumplimiento formal que corresponda —bases, publicación y
transparencia, validadas con Legal y con la contraparte del cliente—; definición del marco de lectura antes de
ejecutar; y evaluación de incrementalidad con el diseño de medición acordado previamente.

**Excluido.** Financiar la promoción; ejecutar el pago de incentivos; garantizar incrementalidad.

**Condición dura.** El marco de medición se define **antes** de ejecutar la promoción. Una promoción sin diseño de
medición previo no se puede evaluar después; se declara así y no se vende la evaluación.

**Madurez.** Servicio avanzado. Requiere que el cliente ya tenga cobertura auditada o data de sell-out confiable.

---

## T9 · Estándar de Tienda Perfecta

**Promesa.** Definir qué significa "bien ejecutado" en tu categoría, por canal y por formato, antes de salir a
medir nada.

**Por qué va antes que T3.** Un puntaje de ejecución sin un estándar acordado es una opinión con decimales. Si no
está definido cuántos frentes corresponden en un supermercado versus un almacén de barrio, qué material va en cada
formato y qué surtido es obligatorio por cadena, no hay contra qué comparar.

**Alcance incluido.** Definición del estándar por canal, formato y cadena: surtido obligatorio y deseable, frentes,
ubicación, precio de referencia, material y exhibición adicional; ponderación de cada variable según su impacto en
venta; y el modelo de puntaje resultante, documentado y acordado con el cliente.

**Excluido.** Negociación del espacio con la cadena; imposición del estándar a terceros; y garantía de que el
estándar se cumpla — eso es lo que T3 mide y T4 corrige.

**Cuándo se vende solo.** Marcas que ya miden pero cuyo reporte no las deja decidir, porque el estándar nunca se
definió bien. Es una entrada consultiva de alto margen y bajo consumo de capital.

**Unidad (hipótesis).** Proyecto cerrado por categorías × canales × cadenas.

---

## T10 · Arquitectura de Distribución y Cobertura

**Promesa.** Dónde estás, dónde no estás y dónde deberías estar.

**El problema real.** La conversación de canal se concentra en las tiendas donde la marca ya está. La pregunta más
cara es la otra: cuántos puntos de venta de tu categoría existen en tu zona, en cuántos estás presente, y qué vale
cada uno de los que faltan. En canal tradicional eso casi nunca está mapeado.

**Alcance incluido.** Universo de puntos de venta relevantes por zona y tipo; cobertura actual versus potencial;
rendimiento comparado por distribuidor y por zona; identificación de brechas de cobertura y su valor estimado; y
recomendación de dónde abrir, dónde profundizar y dónde retirarse.

**Excluido.** Negociación con distribuidores; alta de nuevos puntos; logística; y cualquier promesa de crecimiento
de cobertura.

**Por qué encaja con lo demás.** El canal tradicional es el punto ciego declarado del mercado. Es el servicio que
más se apoya en la red de captura y el que más justifica un ciclo recurrente después.

**Unidad (hipótesis).** Proyecto por zona y categoría, con opción de actualización periódica.

---

## T11 · Integración de Datos de Canal

**Promesa.** Sell-in, sell-out y ejecución leídos juntos, en un solo lugar.

**El problema real.** El sell-in vive en el ERP, el sell-out llega en planillas de distribuidores y cadenas con
formatos distintos, y la ejecución vive en otro reporte. Nadie los cruza, y las tres verdades se contradicen entre
sí sin que se pueda determinar cuál está mal.

**Alcance incluido.** Levantamiento de las fuentes disponibles y su calidad real; normalización de formatos y
maestros de producto y cliente; consolidación en una lectura única; y el tablero de decisión que cruza las tres
capas más la inversión digital cuando existe.

**Excluido.** Reemplazar el ERP o el BI del cliente; obtener data que el distribuidor o la cadena no quiera
entregar —eso se declara como límite, no se promete—; y licencias de data de terceros.

**Ownership.** Wave · Measurement & Analytics. Channel & Commerce aporta el modelo de canal y el esquema de
scoring.

**Por qué importa más de lo que parece.** Es el puente entre la góndola y lo digital, y por lo tanto la
infraestructura de T6 y T7. Sin esto, la conexión física-digital se hace a mano cada ciclo.

**Unidad (hipótesis).** Implementación cerrada + operación recurrente.

---

## T12 · Capacitación de Fuerza de Venta del Canal

**Promesa.** Que quien vende tu producto y no trabaja para ti sepa venderlo.

**Cuándo aplica.** Distribución indirecta donde el vendedor del distribuidor, el reponedor de la cadena o el
dependiente del local decide qué recomendar. Categorías con especificación técnica, portafolio amplio o
diferenciación que no se ve en el envase.

**Alcance incluido.** Diagnóstico de brechas de conocimiento; diseño del contenido de capacitación; ejecución
presencial o remota; evaluación de aprendizaje; y medición de si el punto capacitado se comporta distinto del que
no lo fue.

**Excluido.** Incentivos monetarios al vendedor —eso es T8—; y responsabilidad sobre la relación laboral de
personas que no son de Efeonce ni del cliente.

**La diferencia.** La capacitación de canal se suele vender por asistentes. Acá se mide comparando el desempeño de
los puntos capacitados contra un grupo de control, igual que una activación.

**Unidad (hipótesis).** Programa por ola de capacitación.

---

## T13 · Gestión de Categoría  ·  *avanzado, condicionado*

**Promesa.** Hablarle al retailer en su idioma: el de la categoría completa, no el de tu marca.

**Cuándo aplica.** Marcas con posición relevante en su categoría que quieren pasar de negociar espacio a proponer
cómo se ordena el anaquel. Es la conversación que cambia la relación con la cadena.

**Alcance incluido.** Lectura del árbol de decisión del shopper en la categoría; análisis de surtido, espacio y
rentabilidad por segmento; propuesta de planograma y de rol de la categoría; y el argumento con el que la marca
sostiene esa propuesta ante el retailer.

**Excluido.** Representar a la marca ante la cadena; garantizar que el retailer adopte la propuesta; y cualquier
recomendación que favorezca a la marca en contra del desempeño de la categoría — eso destruye la credibilidad que
este servicio necesita.

**Condición dura.** Requiere data de categoría de calidad, sea del retailer o de panel licenciado. **Sin esa data
no se vende**, porque una propuesta de categoría basada sólo en la marca propia la desarma cualquier comprador de
la cadena en cinco minutos.

**Unidad (hipótesis).** Proyecto por categoría y cadena.

---

## B1 · Activaciones en Sala Medidas

**Promesa.** La activación deja de reportarse en contactos y pasa a reportarse en qué vendió la tienda activada
frente a la que no.

**Por qué existe.** El BTL tradicional entrega una planilla de contactos y un álbum de fotos. En 2026 una
activación sin mecanismo de captura de datos ni lectura de afluencia no produce información, produce ruido. La
diferencia de Efeonce no es activar mejor: es **activar y poder demostrar qué pasó**.

**Alcance incluido.** Diseño de la mecánica de activación, sampling o demostración; ejecución en punto de venta
por el pod de terreno; captura de datos en el momento (código trazable, encuesta corta, registro de interacción);
selección de tiendas activadas y **tiendas de control**; y lectura del ciclo comparando ambas.

**La pieza que nadie más entrega.** El diseño de control se define **antes** de activar. Sin tienda de control no
hay comparación posible y la activación vuelve a medirse en contactos. Este es el criterio de aceptación real del
servicio.

**Opcional.** Captura de contenido durante la activación (ver X1); extensión a más cadenas; repetición por
ola.

**Excluido de Efeonce.** Montaje, stands, mobiliario, bodega, transporte y permisos: van como **pass-through de
proveedor**, no como servicio propio. Producto y material de sampling los provee el cliente. No se promete
número de contactos ni incremento de venta.

**Misma capacidad, misma figura legal.** Quien activa en sala es la misma figura de terreno de T4 y está
sujeta al mismo boundary: Efeonce dirige, supervisa y capacita a su propio personal. Nunca se cotiza por
anfitriona/día.

**Métricas.** Cobertura de activación efectiva; tasa de captura por interacción; delta de venta activadas vs.
control (con el denominador declarado); costo por interacción capturada.

**Packaging (hipótesis).** Ola de activación por tiendas × días de presencia, dentro de la capacidad gobernada.
Nunca por persona/día.

---

## B2 · Promotoría e Impulso

**Promesa.** Personal de venta en sala que además de vender te dice qué está pasando en esa tienda.

**Cuándo aplica.** Categorías donde la venta asistida mueve la aguja: electro, belleza, telefonía, licores,
alimentos con demostración, cualquier producto que necesite explicación.

**Alcance incluido.** Selección y capacitación en producto y marca; presencia por turnos en las salas definidas;
registro de interacciones, objeciones frecuentes y motivos de no-compra; y **el reporte de sala como subproducto**:
quiebres, precio, competencia y estado del material, capturado por la misma persona que está vendiendo.

**Excluido.** Reposición sistemática (eso es T4); manejo de caja; y cualquier promesa de cuota de venta.

**Cómo se mide, que es la diferencia.** Conversión e interacciones por turno, no horas cubiertas. Cobrar por hora
de promotora premia la presencia; medir conversión premia el resultado. Se acuerda el denominador antes de partir.

**Por qué nos conviene.** Una persona en sala vendiendo es la fuente de dato más barata que existe: ya está ahí.
Alimenta T3 sin costo adicional de captura.

**Unidad (hipótesis).** Turnos × salas dentro de la capacidad gobernada. Nunca persona/día.

---

## B3 · Visual Merchandising y Exhibiciones Adicionales

**Promesa.** Tus exhibiciones adicionales se instalan bien y **siguen instaladas**.

**El problema real.** Una marca negocia y paga una cabecera, una isla o un exhibidor. Se instala el día uno con
foto de rigor. Nadie verifica qué pasó a los diez días — y con frecuencia el material se movió, se desarmó, se
llenó con producto de otra marca o simplemente desapareció. Se paga por un mes de exhibición y se obtienen días.

**Alcance incluido.** Implementación de exhibiciones, cabeceras, islas, exhibidores y material en sala; evidencia
fotográfica de instalación; **y verificación de permanencia durante el período contratado**, con alerta cuando la
exhibición se degrada o desaparece.

**Excluido.** Fabricación del mobiliario y del material; bodegaje y transporte. Va a proveedor como pass-through.
Tampoco negociamos el espacio con la cadena.

**Por qué sólo nosotros podemos ofrecerlo bien.** La verificación de permanencia sale gratis de la cobertura
auditada de T3: el auditor ya está pasando por esa tienda. Quien sólo hace instalación no vuelve, y quien sólo
audita no instala.

**Unidad (hipótesis).** Puntos implementados × período de verificación.

---

## B4 · Roadshow y Tour de Marca

**Promesa.** Una gira que no se evalúa por cuántas ciudades cubrió sino por qué funcionó en cada una.

**Cuándo aplica.** Lanzamientos nacionales, expansión a regiones, categorías que necesitan demostración
presencial, marcas entrando a un mercado nuevo.

**Alcance incluido.** Diseño del recorrido y del formato; coordinación de plazas y fechas; ejecución con equipo por
plaza; captura de datos homogénea en todas las ciudades; y **lectura comparada por plaza** — qué ciudad respondió,
cuál no, y qué se hace distinto en la siguiente ola.

**Excluido.** Producción de la estructura móvil, transporte, permisos municipales y seguros: proveedor.

**La diferencia.** El roadshow tradicional se reporta como un total nacional que promedia y esconde. Nosotros lo
reportamos por plaza, porque la decisión siguiente —dónde volver, dónde no— es por plaza.

**Unidad (hipótesis).** Plazas × días de activación.

---

## B5 · Street Marketing y Sampling Masivo

**Promesa.** Entrega masiva fuera de la tienda, con registro de dónde, cuándo y a quién.

**Cuándo aplica.** Lanzamientos, prueba de producto, categorías de consumo inmediato, ocupación de zonas de alto
flujo, respuesta a un movimiento de la competencia.

**Alcance incluido.** Diseño de la mecánica y de los puntos; ejecución con equipo; captura georreferenciada de la
entrega; encuesta corta de perfil e intención cuando aplique; y código trazable para conectar la muestra con una
compra posterior cuando el canal lo permite.

**Excluido.** Producción de las muestras; permisos de uso de espacio público; y cualquier proyección de conversión.

**La diferencia.** El sampling clásico reporta unidades entregadas. Nosotros reportamos dónde se entregaron, a qué
perfil y —cuando el código lo permite— qué pasó después.

**Unidad (hipótesis).** Puntos × días, o unidades entregadas con captura.

---

## B6 · Pop-up y Espacios Efímeros

**Promesa.** Un espacio temporal de marca con objetivo comercial definido y medición desde el día uno.

**Cuándo aplica.** Lanzamientos, temporadas altas, prueba de un formato de retail antes de comprometer un local,
marcas nativas digitales que quieren presencia física acotada.

**Alcance incluido.** Definición del objetivo —venta, prueba, captación o marca— y de la métrica que lo acredita;
diseño de la experiencia y del recorrido; operación durante el período; captura de tráfico, interacción y
conversión; y lectura de cierre con recomendación de repetir, ajustar o descartar.

**Excluido.** Arriendo del espacio, construcción, montaje, mobiliario, permisos y seguros: proveedor.

**Regla.** No se abre un pop-up sin métrica de éxito acordada antes. Un pop-up sin objetivo es una vitrina cara.

**Unidad (hipótesis).** Proyecto por período de operación.

---

## B7 · Activación de Patrocinios

**Promesa.** Que el patrocinio que ya pagaste produzca algo más que un logo en un cartel.

**El problema real.** Las marcas comprometen presupuestos grandes en patrocinios —deportivos, culturales,
festivales, eventos gremiales— y la activación llega tarde, improvisada y sin medición. El derecho se paga
completo y se usa a medias.

**Alcance incluido.** Lectura de los derechos que el contrato de patrocinio ya otorga y que están sin usar; diseño
del plan de activación; ejecución en el evento; captura de interacción y datos; contenido derivado para los
canales de la marca; y lectura del retorno del patrocinio, no sólo de la activación.

**Excluido.** Negociación o compra del patrocinio; producción de estructuras; derechos de imagen de terceros, que
se resuelven con Legal.

**La diferencia.** Empezar por el contrato. Casi siempre hay derechos contratados y no ejercidos —presencia,
menciones, accesos, data, contenido— que no cuestan un peso adicional.

**Unidad (hipótesis).** Proyecto por patrocinio y temporada.

---

## B8 · Ferias y Exposiciones

**Promesa.** Que la feria termine en pipeline y no en una caja de tarjetas.

**Cuándo aplica.** Ferias del rubro, exposiciones sectoriales y encuentros donde está el canal o el cliente final.

**Alcance incluido.** Objetivo y diseño de la presencia; guion de conversación y calificación en el stand; captura
digital de contactos con calificación en el momento; y **el seguimiento posterior**, que es donde casi todos
fallan: la secuencia de contacto, la entrega al equipo comercial y la medición de qué pasó con cada lead.

**Excluido.** Diseño y construcción del stand, montaje, arriendo del espacio y logística: proveedor.

**La diferencia.** El estándar del mercado entrega tarjetas y fotos. El valor está en las tres semanas siguientes,
y esa parte se conecta con el CRM del cliente vía RevOps cuando corresponde.

**Unidad (hipótesis).** Proyecto por feria, con opción de seguimiento por período.

---

## B9 · Encuentros de Canal  ·  *hacia el canal, no hacia el shopper*  ·  *condicionado*

**Promesa.** La convención de distribuidores o el lanzamiento a la fuerza de venta deja de ser un gasto anual sin
seguimiento y pasa a tener objetivo, medición y continuidad.

**Por qué es distinto de B1.** El público no es el shopper: son distribuidores, mayoristas, vendedores y
socios del canal. El comprador es el mismo Gerente Comercial, el volumen es menor y el margen es mejor, porque lo
que se paga es diseño, contenido y gobierno, no cobertura.

**Alcance incluido.** Objetivo y diseño del encuentro; contenido y narrativa; material de habilitación para el
canal; captura de compromisos y seguimiento posterior; medición de asistencia, participación y cumplimiento de
los compromisos tomados en el evento.

**Excluido.** Producción física del evento —venue, montaje, catering, audiovisual, logística— que va a proveedor
como pass-through. Efeonce no se convierte en productora de eventos.

**Condición para ofrecerlo.** Sólo sobre una cuenta con relación establecida. Es un servicio de expansión, nunca
de entrada: nadie contrata su convención anual con un proveedor que recién conoce.

**Composición.** Contenido y captura con Creative Services; medición y seguimiento con el modelo de canal.

---

## X1 · Contenido y Material de Canal  ·  *composición con Creative Services*

**Promesa.** El material de canal deja de ser un acto heroico por campaña.

**Alcance incluido.** Sistema de producción de piezas de canal: material POP digital, fichas y catálogos,
contenido de PDP, kits para distribuidores, adaptaciones por cadena y por formato.

**Ownership.** Creative Services (Creative Velocity · Run & Gun · Globe). Se vende como **capacidad gobernada**,
nunca por pieza.

**Captura en activación.** Cuando hay una activación en curso (B1), la capacidad de captura de Efeonce
—Run & Gun Studio— convierte esa activación en material reutilizable para social, retail media y creator, con
derechos definidos desde el brief. El BTL tradicional produce fotos de reporte; acá la misma salida produce
activos. La activación deja de ser un costo que se agota el día del evento.

**Excluido de Efeonce.** Impresión, bodegaje y logística de material físico. Va como pass-through de proveedor.

---

## Composición y fronteras

| Si el cliente pide… | Owner | Rol de Channel & Commerce |
|---|---|---|
| Inversión en retail media | Media & Distribution | Aporta la lectura de ejecución física |
| Visibilidad de producto en buscadores e IA | Wave | Traduce a decisión de canal |
| Producción física de una activación o evento | Proveedor externo | Contrata, gobierna y mide; el costo es pass-through |
| Producción de piezas | Creative Services | Aporta el requerimiento por cadena |
| Dashboards y data foundation | Wave · Measurement | Aporta el esquema de scoring |

Ninguna propuesta compuesta se emite sin owner nombrado y RACI por línea.

## Lo que esta línea nunca vende

- Reposición masiva con planilla propia cobrada por cabeza o por día.
- Suministro de personal bajo dirección diaria del cliente.
- Impresión, bodegaje y logística de material POP como servicio propio.
- Anfitrionas, promotoras o personal de activación cobrados por persona/día.
- Producción física: montaje, venue, mobiliario, estructuras móviles, stands, catering, logística y permisos.
- Arriendo de espacios comerciales ni construcción de locales.
- Activaciones cuyo único entregable sea un número de contactos.
- Precio como porcentaje del trade spend gestionado.
- Garantía de venta, sell-out, share o rotación.

## Referencias

- Modelo económico: [`CHANNEL_COMMERCE_BUSINESS_MODEL_V1`](../../business-models/channel-commerce/CHANNEL_COMMERCE_BUSINESS_MODEL_V1.md)
- Guardrail de capacidad humana: [`EFEONCE_TALENT_ASSURANCE_ECONOMIC_GUARDRAILS_V1`](../../business-models/EFEONCE_TALENT_ASSURANCE_ECONOMIC_GUARDRAILS_V1.md)
- Precedente de pod gobernado: [`EFEONCE_EMBEDDED_CREATIVE_POD_OPERATING_MODEL_V1`](../creative-services/EFEONCE_EMBEDDED_CREATIVE_POD_OPERATING_MODEL_V1.md)
- Capa de partners y providers: [`EFEONCE_PARTNER_PROVIDER_LAYER_OPERATING_MODEL_V1`](../../business-models/EFEONCE_PARTNER_PROVIDER_LAYER_OPERATING_MODEL_V1.md)
- Foco comercial: [`EFEONCE_COMMERCIAL_FOCUS_AND_BEACHHEADS_V1`](../../strategy/EFEONCE_COMMERCIAL_FOCUS_AND_BEACHHEADS_V1.md)
