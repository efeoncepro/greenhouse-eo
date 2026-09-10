# Channel & Commerce — catálogo de servicios

> **Línea de negocio:** Channel & Commerce (en mercado: **trade marketing**)
> **Marca contractual:** Efeonce
> **Estado:** `Proposed`, con `re-scope` pendiente tras el [benchmark chileno 2026-09-10](../../audits/commercial/CHANNEL_COMMERCE_CHILE_MARKET_BENCHMARK_2026-09-10.md) — habilita prospección exploratoria y diagnósticos cotizados caso a caso
> **Mercado inicial:** Chile
> **Última actualización:** 2026-09-10
> **Modelo económico:** [`CHANNEL_COMMERCE_BUSINESS_MODEL_V1`](../../business-models/channel-commerce/CHANNEL_COMMERCE_BUSINESS_MODEL_V1.md)

## Propósito

Channel & Commerce gobierna la inversión de canal de una marca que vende a través de terceros: qué se ejecuta en
el punto de venta, cuánto cuesta, qué retorno produce y dónde reasignar el próximo peso.

**No es una agencia de terreno.** El resultado que se vende es una decisión de canal con evidencia, y la capacidad
de intervenir donde esa evidencia lo justifica. No se vende cobertura por cabeza, no se vende hora de mercaderista
y no se vende material impreso.

## Estado y límites

`Proposed` significa: se puede conversar, diagnosticar y cotizar caso a caso. **No** se puede publicar precio,
comprometer cobertura, prometer tiempos de respuesta, contratar capacidad de terreno ni firmar recurrente hasta
cerrar los gates G1 a G6 del business model.

Claims prohibidos hasta tener evidencia propia fechada: incremento de venta o sell-out atribuido a la línea;
porcentajes de ahorro frente a la agencia del cliente; cobertura nacional; y "Perfect Store" como resultado
garantizado — es un marco de scoring, no una promesa.

## Mapa de la oferta

```text
DIAGNÓSTICO           →  RECURRENTE              →  INTERVENCIÓN          →  EXPANSIÓN
Channel Execution        Cobertura Auditada         Managed Field Pod        Digital Shelf
Trade Investment Audit                              Activación Medida        Channel Content
                                                    Field Orchestration      Promotion & Incrementality
                                                                             Eventos de Canal
```

---

## 1 · Channel Execution Diagnostic

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

## 2 · Trade Investment Audit

**Promesa.** Sabes cuánto vale realmente tu inversión de canal y cuál de sus componentes no tiene retorno
demostrable.

**Por qué existe separado del anterior.** Este entra por el bolsillo, no por la tienda. Es el mismo wedge con el
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

## 3 · Cobertura Auditada  ·  *núcleo recurrente*

**Promesa.** Cada ciclo recibes el estado de ejecución de tu canal por punto de venta y la lista priorizada de
intervención.

**Job.** "Cuando invierto en canal y no sé qué pasó en la tienda, quiero ver dónde está roto y en qué orden
arreglarlo."

**Alcance incluido.** Plan de cobertura por ciclo; ejecución de misiones de auditoría; control de calidad y
verificación de evidencia; scoring normalizado por punto de venta y cadena; detección de quiebres, precio,
material y cumplimiento de planograma; observación de competencia en sala; reporte con priorización;
y la sesión de lectura del ciclo.

**Opcional.** Ampliación de cobertura; frecuencia mayor; SKUs adicionales; observación ampliada de competencia.

**Excluido.** Intervención en tienda (es el servicio 4); material POP; mercadería; negociación con cadenas;
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

## 4 · Managed Field Pod  ·  *se ofrece desde fase 1; con capacidad propia sólo tras los gates*

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

**Dependencias duras.** Requiere el servicio 3 activo o data de ejecución equivalente provista por el cliente. Sin
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

## 5 · Field Orchestration

**Promesa.** Tus proveedores de terreno dejan de reportar cada uno a su manera y empiezan a compararse contra el
mismo estándar.

**Para quién.** Marcas que ya tienen dos o más agencias de terreno por país, canal o categoría, y ninguna lectura
consolidada.

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

## 6 · Digital Shelf & AI Shopper Visibility  ·  *composición con Wave*

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

## 7 · Activación de Marca Medida  ·  *BTL con evidencia*

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

**Opcional.** Captura de contenido durante la activación (ver servicio 8); extensión a más cadenas; repetición por
ola.

**Excluido de Efeonce.** Montaje, stands, mobiliario, bodega, transporte y permisos: van como **pass-through de
proveedor**, no como servicio propio. Producto y material de sampling los provee el cliente. No se promete
número de contactos ni incremento de venta.

**Misma capacidad, misma figura legal.** Quien activa en sala es la misma figura de terreno del servicio 4 y está
sujeta al mismo boundary: Efeonce dirige, supervisa y capacita a su propio personal. Nunca se cotiza por
anfitriona/día.

**Métricas.** Cobertura de activación efectiva; tasa de captura por interacción; delta de venta activadas vs.
control (con el denominador declarado); costo por interacción capturada.

**Packaging (hipótesis).** Ola de activación por tiendas × días de presencia, dentro de la capacidad gobernada.
Nunca por persona/día.

---

## 8 · Channel Content & Asset System  ·  *composición con Creative Services*

**Promesa.** El material de canal deja de ser un acto heroico por campaña.

**Alcance incluido.** Sistema de producción de piezas de canal: material POP digital, fichas y catálogos,
contenido de PDP, kits para distribuidores, adaptaciones por cadena y por formato.

**Ownership.** Creative Services (Creative Velocity · Run & Gun · Globe). Se vende como **capacidad gobernada**,
nunca por pieza.

**Captura en activación.** Cuando hay una activación en curso (servicio 7), la capacidad de captura de Efeonce
—Run & Gun Studio— convierte esa activación en material reutilizable para social, retail media y creator, con
derechos definidos desde el brief. El BTL tradicional produce fotos de reporte; acá la misma salida produce
activos. La activación deja de ser un costo que se agota el día del evento.

**Excluido de Efeonce.** Impresión, bodegaje y logística de material físico. Va como pass-through de proveedor.

---

## 9 · Promotion & Incentive Design + Incrementality

**Promesa.** Sabes si la promoción vendió de más o simplemente adelantó y canibalizó margen.

**Alcance incluido.** Diseño de mecánicas promocionales e incentivos al canal y a la fuerza de venta; definición
del marco de lectura antes de ejecutar; y evaluación de incrementalidad con el diseño de medición acordado
previamente.

**Excluido.** Financiar la promoción; ejecutar el pago de incentivos; garantizar incrementalidad.

**Condición dura.** El marco de medición se define **antes** de ejecutar la promoción. Una promoción sin diseño de
medición previo no se puede evaluar después; se declara así y no se vende la evaluación.

**Madurez.** Servicio avanzado. Requiere que el cliente ya tenga cobertura auditada o data de sell-out confiable.

---

## 10 · Retail Media & Commerce Operations  ·  *owner: Media & Distribution*

Ya existe en el catálogo de [Media & Distribution](../media-distribution/README.md) dentro de Performance &
Commerce. **No se reimplementa acá.** Channel & Commerce lo nombra porque es el destino natural de expansión
cuando el cliente invierte en retail media sin lectura de ejecución física, y porque en Chile la categoría está
creciendo con Walmart Connect, Cencosud Media, Fmedia, Sodimac Media, Ripley Media y Mercado Ads.

La propuesta compuesta declara owner, RACI y facturación por línea.

---

## 11 · Eventos y Encuentros de Canal  ·  *BTL hacia el canal, no hacia el shopper*  ·  *condicionado*

**Promesa.** La convención de distribuidores o el lanzamiento a la fuerza de venta deja de ser un gasto anual sin
seguimiento y pasa a tener objetivo, medición y continuidad.

**Por qué es distinto del servicio 7.** El público no es el shopper: son distribuidores, mayoristas, vendedores y
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
- Producción física de eventos: montaje, venue, mobiliario, catering, logística y permisos.
- Activaciones cuyo único entregable sea un número de contactos.
- Precio como porcentaje del trade spend gestionado.
- Garantía de venta, sell-out, share o rotación.

## Referencias

- Modelo económico: [`CHANNEL_COMMERCE_BUSINESS_MODEL_V1`](../../business-models/channel-commerce/CHANNEL_COMMERCE_BUSINESS_MODEL_V1.md)
- Guardrail de capacidad humana: [`EFEONCE_TALENT_ASSURANCE_ECONOMIC_GUARDRAILS_V1`](../../business-models/EFEONCE_TALENT_ASSURANCE_ECONOMIC_GUARDRAILS_V1.md)
- Precedente de pod gobernado: [`EFEONCE_EMBEDDED_CREATIVE_POD_OPERATING_MODEL_V1`](../creative-services/EFEONCE_EMBEDDED_CREATIVE_POD_OPERATING_MODEL_V1.md)
- Capa de partners y providers: [`EFEONCE_PARTNER_PROVIDER_LAYER_OPERATING_MODEL_V1`](../../business-models/EFEONCE_PARTNER_PROVIDER_LAYER_OPERATING_MODEL_V1.md)
- Foco comercial: [`EFEONCE_COMMERCIAL_FOCUS_AND_BEACHHEADS_V1`](../../strategy/EFEONCE_COMMERCIAL_FOCUS_AND_BEACHHEADS_V1.md)
