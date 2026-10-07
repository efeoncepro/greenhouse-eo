# Caso de negocio SEO/AEO — método de preparación V1

Fecha: 2026-10-06. Uso interno. Owner: Comercial / práctica SEO-AEO, con Finance para valoración económica.
Estado: **método propuesto, documentado para aplicar a oportunidades**. No aprueba una oferta, packaging,
precios, garantías, contratos ni un nuevo runtime. La solicitud del operador autoriza actualizar documentación
y preparar el caso; una hipótesis de una cuenta no se convierte por eso en política corporativa.

## 1. Propósito y autoridad

Preparar una decisión de inversión defendible: qué problema de adquisición puede resolver SEO/AEO,
qué contribución podría producir, cuánto cuesta ejecutarlo y qué condiciones hacen viable esa contribución.
El caso sirve al interlocutor que lo presentará ante gerencia; la propuesta técnica explica la ejecución.

Este documento posee el método de modelado comercial, no los datos de clientes ni el contrato técnico de
Greenhouse. La documentación funcional explica [cómo se utiliza](../documentation/comercial/caso-negocio-seo-aeo.md)
y el manual contiene [el procedimiento](../manual-de-uso/comercial/construir-caso-negocio-seo-aeo.md).
Los tres artefactos documentan una práctica de preparación; no crean una capacidad de software. Por eso
la capa metodológica está en `docs/commercial/`, sin un ADR de runtime ni una ficha de servicio nueva.

Fuentes y límites relacionados:

- [Demostración contextual](EFEONCE_VENTA_CON_DEMOSTRACION_CONTEXTUAL_V1.md): cómo hacer visible el criterio
  y la ejecución antes de la contratación; no prueba rentabilidad de un programa.
- [Modelos de negocio](../business-models/README.md): autoridad de modelos durables de ofertas;
  propuestas, costos y precios por cliente permanecen en sus expedientes y dueños.
- [Contexto comercial](../context/08_estrategia-comercial.md): selección y profundización de oportunidades.
- [Think](../think/README.md): contrato de demostraciones SEO/AEO; publicar una demo no prueba desempeño.
- Aplicación vigente de oportunidad: [caso Pibank 2027](prospects/banco-pichincha-peru-seo-2026/BUSINESS-CASE-2027.md)
  y [reunión de origen](prospects/banco-pichincha-peru-seo-2026/MEETING-2026-10-06.md). Los números y
  el estado de esa cuenta viven allí; no se copian a skills o métodos generales.

## 2. La decisión y la unidad de éxito

Antes de modelar, declarar producto, mercado, dominio, audiencia, objetivo, moneda, periodo de la meta,
duración del programa y decisión solicitada. Separar periodo contractual y horizonte de evaluación.
Un programa de seis meses no adquiere doce meses de resultados por una fórmula anual; una eventual
continuidad o valor posterior debe mostrarse como horizonte separado y condicionado.

Diseñar la duración según implementación, publicación, aprendizaje y maduración necesarios; no comprimir un
programa sostenido en un piloto sólo para facilitar la venta. El primer mes verifica accesos, calidad de datos,
responsables y entregables. Las revisiones de resultado respetan el tiempo desde implementación y la edad de
cada cohorte; una falta de ROI temprano no demuestra inviabilidad SEO. Una decisión de doce meses por cliente
no se convierte en duración mínima corporativa ni garantiza resultados.

Elegir un outcome de negocio con definición observable. En banca de ahorro, distinguir apertura,
cuenta fondeada, cliente nuevo, saldo mantenido y fondos externos nuevos. En otros sectores, adaptar el
resultado al negocio: lead aceptado, oportunidad, compra o renovación. Tráfico y citas explican el mecanismo;
no sustituyen el outcome. Una solicitud iniciada tampoco equivale a una apertura.

Registrar el buying group como hipótesis cuando no está confirmado: interlocutor, decisor económico,
usuarios, Finanzas, Tecnología, cumplimiento y Compras. Cargo o asistencia a reunión no prueba autoridad
ni presupuesto. La propuesta debe permitir que cada rol evalúe resultado, esfuerzo y condiciones.

## 3. Registro de evidencia y supuestos

Cada variable o claim que mueve el modelo debe tener un ID y estos campos:

| Campo | Qué registrar |
|---|---|
| Definición y unidad | Resultado contado, moneda, porcentaje, población y periodo |
| Naturaleza | Dato observado, declaración atribuida, inferencia, hipótesis o ejemplo aritmético |
| Fuente | URL, documento, transcripción o agregado autorizado, con sección/fecha identificable |
| Cobertura y fecha | País, marca, producto, canal, muestra, ventana y fecha de consulta |
| Confianza y fundamento | Alta/media/baja por adecuación de evidencia; no una probabilidad inventada |
| Estado | Validado, provisional, pendiente o rechazado |
| Uso | Escenario, celda/fórmula o claim donde interviene |
| Validación | Owner, método y condición para reemplazar el supuesto |

Una declaración atribuida no es una medición; una inferencia aritmética consistente no confirma moneda,
periodo ni definición de una meta. Los casos comparables conservan permiso, contexto y denominador.
No trasladar resultados de otra marca, dominio o mercado a la oportunidad sin justificar comparabilidad.
Los porcentajes de conversión sin datos se usan para sensibilidad ilustrativa, nunca como benchmark real.

Cuando el operador no tiene más información, avanzar con fuentes públicas y supuestos provisionales
explícitos. Pedir datos privados puede refinar el caso, pero no bloquea la preparación. No presentar acceso
a analítica, CRM o datos bancarios como concedido; si se obtienen, preferir agregados autorizados.

## 4. Investigación de demanda y capacidad de ejecución

Agrupar consultas por decisiones del cliente: comparación, confianza, comprensión del producto,
operación y activación. Investigar primero la marca/dominio reales de la oportunidad, con condiciones
del producto y fuentes oficiales actuales. La investigación pública puede establecer identidad y recorrido;
no demuestra que la medición del embudo funciona.

Por cluster registrar demanda estimada, método/proveedor, ventana, marca/no marca, competencia,
página existente, intención, presencia por superficie y siguiente paso. Volumen de búsquedas no equivale
a usuarios únicos ni a clientes elegibles. Agrupar duplicados y explicitar solapamiento; no sumar cada
variación de consulta ni cada motor como una población nueva.

La demanda debe contrastarse con capacidad de implementación: cambios existentes, contenido nuevo,
fuentes externas, accesos, revisión del banco y fricciones de contratación. La elegibilidad técnica, los
datos estructurados o una pieza de calidad no garantizan ranking, indexación o cita.

Ampliar cobertura con semillas, variantes, consultas relacionadas y fuentes competidoras, conservando
paginación y límites. Separar adquisición directa, educación/soporte, marca y productos futuros. Auditar el
corpus existente para decidir mejorar/consolidar/crear; ni sumar todo volumen ni tomar un MAX por grupo
sin justificar su método representa por sí solo el mercado. Versionar el universo usado en cada modelo.

Conservar tres capas: capturas originales del proveedor, familias curadas por intención/producto y panel
modelable con representantes y exclusiones razonadas. Una fila banco/consulta/URL, una consulta única
y una familia son unidades distintas; sus conteos describen cobertura, no demanda adquirible. Registrar
solapamiento entre familias, elegibilidad geográfica y productos disponibles. Una serie histórica puede
informar estacionalidad; no demuestra crecimiento futuro ni el baseline del prospecto.

Separar métricas del proveedor de mediciones propias. Rank, enlaces y dominios requieren nombre de
métrica, escala, fecha y cobertura; no renombrarlos como autoridad de otra herramienta. Un enlace observado
antes del programa no es un resultado ganado. Conservar solicitudes, páginas recuperadas y costos de
investigación por separado: costo reconciliado no implica datos recuperados, ni justifica repetir compras.

## 5. Dos modelos que se contrastan

### 5.1. Desde la meta hacia la necesidad de visitas

Estimar qué escala de contribución tendría sentido para el comprador. Una banda de participación en
su meta es una prueba de escala; no es una cuota de SEO/AEO prometida.

```text
outcome_objetivo = meta_del_outcome_definido × participación_explorada
si outcome = apertura: aperturas_necesarias = outcome_objetivo
si outcome = cuenta_fondeada: aperturas_necesarias = outcome_objetivo ÷ tasa_fondeo
visitas_necesarias = aperturas_necesarias ÷ tasa_apertura
cuentas_fondeadas_objetivo = aperturas_necesarias × tasa_fondeo
saldo_equivalente = cuentas_fondeadas_objetivo × ticket_definido
```

Si la meta se expresa en saldo, `cuentas = saldo ÷ ticket` sólo es válido cuando el ticket representa
el mismo concepto de saldo y periodo. Depósito inicial y saldo retenido no son intercambiables.
No dividir por cero o por tasas desconocidas: devolver pendiente y mostrar sensibilidad.

### 5.2. Desde la demanda hacia el resultado

Modelar por mes y cluster, con supuestos de alcance y conversiones que correspondan al mismo embudo:

```text
visitas_calificadas_m = demanda_alcanzable_m × tasa_captura_visitas_m
aperturas_m = visitas_calificadas_m × tasa_apertura_m
cuentas_fondeadas_m = aperturas_m × tasa_fondeo_m
```

La tasa de captura sintetiza supuestos verificables de alcance y clic; no aplicar otro CTR al resultado
si ya está incluido. La fórmula sirve a la adquisición por consultas. Las visitas de otros recorridos sólo
se incorporan cuando hay evidencia y una regla de deduplicación.

La curva mensual recoge implementación, descubrimiento, estacionalidad y maduración. Un promedio
mensual equivalente puede ayudar a explicar escala, pero no reemplaza esa curva. Si la necesidad de
visitas del modelo de meta supera la demanda defendible, auditar primero la cobertura y elegibilidad del
panel; después ajustar contribución o alcance. No aumentar volúmenes o tasas para sostener una propuesta.

## 6. Dos trayectorias y atribución

Modelar una referencia de continuidad de la operación y una trayectoria con programa, con las mismas
condiciones externas declaradas: marca, campañas, producto, tasa y estacionalidad. No asumir referencia
cero para una marca que crecería por otros factores. Si falta base para defender estas trayectorias,
presentar requisitos inversos y sensibilidades; dejar la estimación incremental pendiente.

```text
resultado_incremental_m = resultado_con_programa_m − resultado_referencia_m
```

Separar aporte por visitas adicionales y por conversión mejorada para evitar adjudicar dos veces el
mismo crecimiento. Presentar atribución observada y estimación de incrementalidad como conceptos
distintos. Las reglas de asignación deben reconciliar una conversión única con el resultado real del
sistema del cliente; un recorrido IA → búsqueda → directo no genera tres cuentas.

Definir diccionario de eventos y denominadores: visita elegible, clic, registro, apertura validada y primer
fondeo, con reglas de rechazo, duplicación y ventanas. Sesión, persona y cuenta no son intercambiables.
Reconciliar agregados del cliente con los orígenes observables y declarar cobertura/discrepancias. Si el
recorrido se corta entre web y onboarding, reportar sus etapas separadas; no convertir clics en aperturas.
El cliente conserva identificadores personales; un corte de medición no autoriza unir datos privados.

La comparación conserva ventanas, madurez de cohortes y factores concurrentes del producto/campañas.
Una variación antes/después no demuestra causalidad. Sin contrafactual defendible, informar resultados
observados por origen y asociación, sin presentarlos como efecto incremental comprobado.

La presencia en IA se observa con consultas, motores, fecha, repetición, exactitud y citas identificadas.
Una mención o cita no se multiplica por una tasa de apertura para fabricar conversiones. Referrals
medidos pueden incorporarse al embudo; asistencia no observable queda como limitación.

## 7. Cohortes, saldo y dinero externo

En captación de ahorro, seguir cohortes por mes de primer fondeo y edad, con tiempo hasta fondear,
saldo promedio mantenido y permanencia. Una cuenta en el mes seis aporta menos meses dentro del
semestre que una cuenta en el mes dos.

Fijar la ventana de primer fondeo desde la apertura y reportar aparte cohortes inmaduras y fondeos tardíos.
Cada punto de permanencia utiliza sólo cohortes con esa edad: no completar meses aún no observados con
ceros ni compararlos con cohortes maduras. El origen externo se asigna a la cohorte al fondear; no cambia
por aplicar el porcentaje de otra cohorte o del mes actual. Explicitar cualquier regla distinta.

```text
saldo_c,m = cuentas_fondeadas_c × saldo_promedio_mantenido_por_cuenta_original_c,m
saldo_total_m = suma(saldo_c,m de cohortes c activas en m)
```

La definición anterior incluye ceros/abandono en el promedio por cuenta original. Si se usa promedio
de cuentas activas, multiplicar también por supervivencia; no aplicar retención de nuevo a un saldo que
ya la incluye. Separar saldo al cierre, saldo promedio del periodo y entradas brutas de dinero: sumar
saldos mensuales no es captación neta nueva.

Distinguir cliente nuevo para la marca, nuevo para el grupo y cuenta nueva de cliente existente.
Separar traslado interno de dinero externo nuevo. Un traslado puede tener valor para el producto,
pero no constituye automáticamente fondeo incremental del grupo. Si su origen es desconocido,
mostrar proporción externa como sensibilidad; no asumir que todo viene de competidores.

## 8. Valor económico, costo y recuperación

El saldo captado es fondeo, no ingreso ni beneficio. Finance del cliente valida un único método de
valoración apropiado: contribución económica del fondeo o beneficio frente a financiación alternativa,
según su modelo. No sumar FTP, margen o ahorro de financiación cuando representan el mismo beneficio.
La tasa recibida por el ahorrador tampoco es el margen ganado por el banco.

Incluir costos del programa y dependencias: servicio, implementación, contenido, herramientas,
proveedores, revisión y otros costos marginales validados. No inventar precio, margen bancario ni CAC
actual. Finance/Comercial Efeonce validan capacidad, cost-to-serve, margen y términos por separado.

Costear todos los roles que ejecutan el alcance, incluidas comunicaciones/PR cuando corresponda, con
horas por mes, reserva identificada y costo cargado validado por rol. Añadir herramientas, investigación,
terceros y otros costos sin duplicar conceptos ya incluidos. El costo interno blended se deriva
ponderando horas y costos cargados por función; no sustituye costos faltantes. La inversión del cliente y el costo interno del proveedor son magnitudes
separadas. Un input vacío queda pendiente; cero requiere fundamento y un costo negativo es inválido.

```text
costo_por_cuenta_incremental_fondeada = costo_total ÷ cuentas_incrementales_fondeadas
valor_incremental_H = suma(valor_económico_validado_por_cohorte dentro de H)
ROI_H = (valor_incremental_H − costo_total_H) ÷ costo_total_H
```

Si el outcome incremental es cero o negativo, reportar que no hay un CAC positivo interpretable.
Sin valoración bancaria, dejar ROI pendiente y mostrar el valor mínimo por cuenta para recuperar la
inversión. `cuentas_equilibrio = costo ÷ valor_por_cuenta` sólo aplica a un valor con la misma mezcla
y horizonte; para cohortes distintas resolver equilibrio mediante la suma de contribuciones.
Payback es el primer mes en que contribución acumulada cubre costos acumulados, si ocurre dentro
del horizonte. No extenderlo silenciosamente ni confundir captación con recuperación de la inversión.

## 9. Escenarios y sensibilidad

Construir conservador, base y favorable cuando haya evidencia suficiente, con condiciones coherentes
de implementación, demanda, apertura, fondeo y permanencia. Sin esa base, presentar requisitos inversos
y umbrales de inversión como sensibilidades, sin llamarlos forecast. El escenario base no es el promedio aritmético ni una promesa;
identificar qué evidencia lo hace defendible. No mejorar todas las variables a la vez sin sustento.

Sensibilidades mínimas: retraso de implementación, visitas alcanzables, apertura, fondeo, saldo,
permanencia, proporción de dinero externo y cambios del producto/competencia. Mostrar qué
variable cambia la decisión y qué información conviene obtener después. Un número sin fuente
puede servir como ejemplo aritmético rotulado; no completar casillas para hacer que la inversión gane.

El contrafactual desde el lanzamiento se presenta como ejercicio ilustrativo: ventana, capacidad que
habría sido necesaria, referencia y supuestos visibles. Con información actual insuficiente no se
declaran pérdidas históricas, aperturas dejadas de captar ni efecto causal demostrado.

### Cobertura del modelo y decisión de inversión

Contrastar la población modelada con el alcance vendido antes de presentar una contribución anual. Un panel de pocas consultas no estima automáticamente todo el programa; tampoco es válido descartar un resultado bajo por ser comercialmente incómodo. Conservarlo como prueba del subconjunto que mide, revisar cobertura e intención y actualizar únicamente con evidencia. Separar adquisición genérica, marca, mejora de conversión, asistencia y permanencia; ningún carril sin baseline recibe conversiones o valor económico por defecto.

El modelo inverso traduce una banda de contribución en tráfico, conversión, saldo y valor necesarios; no transforma esa banda en forecast ni en cuota acordada. La propuesta dirigida al comprador declara beneficios, intervención, entregables y medición; costeo, calificación y notas de preparación quedan en anexos internos. Precio y capacidad deben caber entre el costo completo y el valor que el cliente pueda sustentar, sin usar duración o tamaño de cuenta como justificación de inversión.

## 10. Propuesta técnica y paquete de decisión

Conectar cada prioridad con resultado esperado, responsable, entregable, dependencia, aprobación,
fecha y aceptación. Un primer mes de diagnóstico/medición puede validar o recalibrar el modelo;
no es un trámite ni certifica por sí solo capacidad operativa o promesa de captación.

Dimensionar capacidad desde lotes y actividades por rol/mes. Un plan anual no se obtiene duplicando el
semestre; reserva, releases, revisión, mantenimiento y maduración tienen curvas diferentes. Separar capacidad
candidata, roster confirmado, costo monetario y fee. Si se reduce inversión, declarar qué velocidad/frentes
cambian, conservando los criterios de medición y el tiempo necesario para observar el trabajo implementado.

Mantener un calendario único que concilie lotes, dependencias, capacidad y narrativa de todos los
artefactos. Separar contenido sustancial, FAQ y paquete técnico para no contar la misma entrega varias
veces. Si hay PR, la secuencia es fuente/revisión → recurso publicado y verificado → dossier/vocería →
mensaje y destino aprobados → gestión → comprobación. PR puede reutilizar recursos; no los vuelve
entregas editoriales nuevas ni garantiza publicación, enlace o ventas. Registrar referencias originales,
sindicación y cobertura previa por separado; no sumar contactos, dominios y enlaces como una métrica.

La implementación conjunta distingue quién prepara, quién aprueba, quién publica y quién acepta.
Confirmar acceso autorizado, entorno, validación y reversión; si implementa un tercero, entregar spec y
verificar su implementación antes de marcarla ejecutada. Para cada dependencia fijar owner funcional,
plazo propuesto, aceptación y alternativa ante bloqueo. Los tiempos y rondas se acuerdan por oportunidad;
un retraso cambia calendario y efecto esperado, y queda registrado. Una responsabilidad propuesta no
confirma personas, disponibilidad ni consentimiento del cliente.

Paquete propuesto: resumen ejecutivo, presentación para comité, modelo editable con ledger de
supuestos y anexo técnico con una demostración contextual pertinente. La muestra permite evaluar
ejecución; las cifras proyectadas pertenecen al modelo. Compromisos de calidad, ejecución y cadencia
se separan de objetivos comerciales compartidos y de factores externos.

Antes de ofrecer envío o publicación, revisar fuentes actuales de claims de producto, números,
alcance y permisos de ejemplos. Preparación local no equivale a oferta enviada, aceptación o contrato.

### Verificación y continuidad de versiones

Recalcular el workbook en un motor identificado y verificar fórmulas y valores guardados del archivo final,
no sólo la aritmética de un script auxiliar. Usar controles independientes y proporcionales: unidades,
costos por rol frente a calendario, inputs vacíos/cero/negativos, límites del horizonte, cohortes tardías,
denominadores y sensibilidad que cambie efectivamente el resultado. Registrar pruebas, motor y límites;
un recálculo en un motor no prueba compatibilidad con todos los editores ni validación del cliente.

Conciliar cifras, fechas, alcance y condiciones entre modelo, resumen, propuesta y presentación. Inspeccionar
visualmente los archivos finales recalculados/exportados y su legibilidad; un control de overflow no sustituye
esa inspección. Conservar fuentes, ledger y manifiesto con versión, fecha y hashes. Archivar la versión
anterior y marcar cuál está vigente o retirada de uso cliente, sin borrar la evidencia ni seguir citándola
como actual. QA local, envío autorizado y aceptación del cliente tienen evidencias y estados distintos.

## 11. Fuentes primarias consultadas y alcance

Consulta pública: **2026-10-06**. Las fuentes deben refrescarse al preparar claims para entrega.

| Fuente | Qué respalda | Qué no prueba |
|---|---|---|
| [Google: AI features and your website](https://developers.google.com/search/docs/appearance/ai-features) | Fundamentos SEO aplicables a AI Overviews/AI Mode, ausencia de requisitos técnicos adicionales y de garantía de aparición | No establece conversión, ranking de un cliente ni reglas de todos los motores de IA |
| [Pibank: Quiénes somos](https://pibank.pe/quienes-somos/) | Identidad declarada y pertenencia a Banco Pichincha Perú | No verifica meta comercial, presupuesto o autoridad del comprador |
| [Pibank: Cuenta Soles](https://pibank.pe/cuenta-soles-pibank/) | Producto de ahorro digital, contenido existente y limitación de medios de pago | No confirma producto en dólares disponible ni embudo/conversiones |
| [Pibank: sitio principal](https://pibank.pe/) | Recorrido público hacia registro y uso posterior mediante app | No certifica instrumentación, fondeo o implementación end-to-end |

Las fuentes Pibank ilustran esta aplicación del método; no convierten un producto bancario en
plantilla universal de SEO/AEO. Condiciones y tasas observadas son temporales y se conservan en
el expediente cuando se utilizan. Google sólo respalda afirmaciones sobre sus propias superficies.
