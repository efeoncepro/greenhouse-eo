# Pibank Perú · Oportunidad y cobertura para reconstruir el caso 2027

**Reauditoría 06-10-2026 · Cuenta Soles · Perú/español · Sin compras nuevas.**

La objeción de Julio es válida: **la tabla de 10/50/147 cuentas no justifica por sí sola un programa anual completo**. Modela un carril selectivo de adquisición con hipótesis, mientras el alcance propuesto incluye confianza, evaluación, apertura, activación, operación y AEO. El denominador de cinco representantes no puede presentarse como toda la oportunidad. Tampoco se corrige la brecha sumando 4.855 keywords o aumentando tasas de captura hasta sostener el alcance.

La recomendación es reconstruir la decisión con **cobertura de oportunidades, economía inversa y módulos de contribución separados**, conservando la medición pendiente. La evidencia pública sí permite preparar una propuesta competitiva y concreta; todavía no permite afirmar el retorno del programa completo ni una cantidad mayor de fondeadas.

## 1. Qué falló y qué se conserva

| Fallo | Consecuencia | Corrección |
|---|---|---|
| Cinco consultas curadas como insumo de toda la narrativa | Se confunde muestra con oportunidad del programa | Mantenerlas como una sensibilidad acotada; presentar familias de decisión y frentes que no modelan |
| Capacidad anual antes de demostrar condiciones económicas | El lector ve mucho trabajo frente a pocas cuentas modeladas | Mostrar inversión/capacidad candidata y resultado requerido para sostenerla, sin precio inventado; revisar módulos y economía |
| Filtro automático de keywords tratado como universo compatible | Excluye búsquedas útiles y admite marcas extranjeras/productos ajenos | Reauditar todas las filas, con finalistas manuales y familias condicionales explícitas |
| Marca y asistencia separadas pero sin propuesta de valoración | Su valor comercial queda invisible o se usa como excusa sin datos | Definir denominadores de conversión, fondeo, saldo y servicio que el banco pueda validar; no monetizarlos aún |
| Conteo de outputs como argumento de valor | Muchas FAQ/paquetes parecen justificar inversión por actividad | Vincular cada intervención con una fricción, activo existente, dependencia y resultado observable |

El research anterior conserva respuestas válidas, fuentes, costos y paginación. Las estimaciones son de mercado, no GSC. El panel de 3.690, sus históricos y su hash quedan intactos como versión anterior; no se reescriben para hacer que el caso parezca más favorable. Los documentos/modelos previos siguen siendo evidencia de preparación, no aprobación económica.

## 2. Reauditoría completa, amplitud y límites

Se reprocesaron **4.855 keywords exactas** del dataset existente, 19 capturas SERP y el panel de competidores. Cada keyword recibe familia, dictamen de modelabilidad, motivo, volumen/estado, fecha y fuente en [auditoria-keywords.csv](auditoria-keywords.csv). Se combinaron reglas de descarte con selección manual de intenciones; este trabajo no equivale a validar individualmente la SERP de todas las filas. Las filas sin revisión suficiente quedan excluidas de producción automática.

El agrupamiento contiene **32 familias de oportunidad** en [oportunidades-curadas.csv](oportunidades-curadas.csv), incluyendo necesidades de programa sin demanda medida. También se exportan **3.886 familias core/exactas del proveedor**, cada una con dictamen y sus IDs, en [familias-proveedor.csv](familias-proveedor.csv). Un core textual puede mezclar decisiones; esos casos requieren división. No se usa MAX como universo único ni se suman cores como personas/TAM.

| Carril de clasificación | Keywords asignadas | Qué permite afirmar |
|---|---:|---|
| Directo, finalistas compatibles | 82 | Cobertura candidata de categoría/rendimiento/costo/comparación/apertura/requisitos; no audiencia total |
| Condicional | 910 | Necesidad de revisión de intención/producto/SERP; incluye evaluación de alternativas rivales |
| Educación/asistencia | 323 | Decisiones y comprensión próximas al ahorro; no aperturas adicionales por defecto |
| Servicio/operación | 324 | Transferencias/CCI/acceso; suele atender usuarios existentes y otras entidades |
| Marca propia | 7 | Semillas/histórico; demanda postlanzamiento N/D |
| Benchmark/navegación de otras entidades | 1.576 | Contexto competitivo y soporte ajeno; no adquisición directa |
| USD futuro | 189 | Backlog condicionado a oferta; no producto actual |
| Excluidas/pendientes de revisión | 1.444 | No producir ni modelar automáticamente |

**Estos conteos son inventario, no búsquedas ni tamaño de mercado.** Los 82 candidatos directos tampoco son TAM. Las 910 condicionales incluyen formulaciones locales, extranjeras no detectadas por reglas o necesidades transaccionales que aún requieren revisión. Ni el volumen de estas filas ni el de los representantes se agrega como un nuevo forecast.

El filtro previo tuvo errores materiales de intención: dejó fuera `en que banco puedo ahorrar mi dinero y ganar intereses` (390 estimadas/mes) y `donde puedo ahorrar mi dinero y ganar intereses en perú` (110). A la vez aceptó euros, bancos no peruanos, consultas de soporte y otras funciones. Se recuperan las decisiones útiles con condición de SERP, sin sumar las dos frases como usuarios distintos. `cuentas de fondeo` (260) queda fuera de activación: el término no acredita fondeo de una cuenta de ahorro y puede referirse a trading. Detracciones, impuestos empresariales, CTS, retiro AFP, transferencias internacionales, menores y tarjetas no se convierten en oportunidad Cuenta Soles.

## 3. Adquisición: mapa más amplio, sin suma artificial

| Familia | Representante y estimación mensual | Evidencia / modelabilidad |
|---|---|---|
| Categoría de ahorro líquido | cuenta de ahorros · 2.900 | Oferta compatible y SERP genérica observada; muestra para sensibilidad |
| Rendimiento de ahorro | interés de cuenta de ahorro · 210 | Producto/FAQ existentes; con intereses/tasa/rendimiento solapan |
| Costos de mantenimiento | cuenta sin mantenimiento · 50 | Producto y SERP compatibles; no añadir gratis/cero como otra audiencia |
| Comparación de cuentas Perú | mejores cuentas de ahorro Perú · 320 | SERP comparativa; fuentes por producto y saldo/tramo |
| Apertura | abrir cuenta de ahorros · 210 | Procedimiento existente; crear/online/apertura solapan |
| Requisitos y monto | requisitos para abrir cuenta · 50 | Compatible con elegibilidad publicada; posible solapamiento con apertura; SERP específica pendiente |
| Banco que paga intereses | consulta explícita Perú · 40 | **Condicional**: genérica 480 no se suma; las SERP observadas mezclan plazo fijo |
| Dónde colocar ahorro con interés | consulta explícita Perú · 110 | **Condicional**: recuperada del ruido; no tiene SERP exacta medida |
| Alto rendimiento Perú | cuentas de alto rendimiento Perú · 390 | Condicional por mezcla geográfica/producto; no usar genérica 1.600 como adquirible |
| Digital/ahorro digital | cuenta digital · 1.300 | Condicional: puede buscar tarjeta/pagos; ahorro digital 210 no se suma automáticamente |
| Evaluación de ahorro rival | Cuenta Súper Tasa Interbank · 1.900 | Oferta rival verificada y competencia observada; cross-shopping posible, no captación adjudicada |

La selección utiliza claridad de intención y localización, no la frase de mayor volumen. Por eso una representante de 40/110 puede ser preferible a una de 480/390 más amplia. El CSV conserva fuentes y fechas de actualización por representante, principalmente septiembre 2026; las historias previas no se convierten en crecimiento 2027.

**No se descarta toda marca competidora.** Interés, comisiones, condiciones, liquidez o comparación de una cuenta rival pueden ser evaluación de un ahorrador que considere mover fondos. Se conservan **608 keywords candidatas de consideración de alternativas** dentro del carril condicional, sin asumir que todas sean comparaciones o transferencia potencial. El corpus diferencia ese carril de login, teléfono, claves y soporte ajeno. Comparadores/SBS también pueden resolver evaluación. Hace falta analizar la SERP y el producto de cada finalista antes de incorporarlo a una sensibilidad de adquisición. El volumen de marca rival no se añade al de consultas genéricas; navegar a un producto rival no prueba disponibilidad para cambiarse.

**Lectura comercial:** la muestra de 3.690 es estrecha respecto del mapa de decisiones, pero este corpus tampoco demuestra una gran bolsa independiente de demanda directa adicional. La ampliación más importante es cobertura del recorrido y consideración condicional. La propuesta debe explicar esa amplitud con evidencia y comprobar su escala económica con datos, sin reclamar una audiencia que no está medida.

## 4. El programa completo tiene cuatro fuentes de contribución

### A. Descubrimiento y evaluación no marca

Mejorar categoría/producto y comparación para que el ahorrador evalúe la Cuenta Soles con condiciones claras. La muestra SERP identifica brechas: Pibank no apareció en las 17 capturas genéricas dentro del depth orgánico capturado; no implica ausencia global. Competidores y comparadores aparecen según la decisión. Se puede preparar un mapa de cobertura y un programa de mejoras; captura incremental y conversiones siguen ilustrativas.

### B. Conversión de tráfico elegible, incluida marca

La SERP propia móvil muestra primero una FAQ en posición orgánica 5; desktop muestra privacidad en posición 2. Esta muestra apunta a revisar la ruta producto/identidad y presentación de resultados; no demuestra pérdida monetaria. Mejorar claridad de condiciones, calculadora, confianza y enlace a registro puede apoyar usuarios que llegan por lanzamiento, paid, referencias, marca o búsquedas genéricas.

**Baseline requerido:** sesiones elegibles por canal/landing, inicio y completado de solicitud, reglas de duplicados y abandono, periodo y cambios concurrentes. `pibank` 140 del proveedor es un histórico de una marca internacional: no mide demanda actual de lanzamiento Perú. No proyectar esa cifra ni trasladar la línea base Pichincha.

### C. Activación y calidad del saldo

CCI, tiempos y transferencias son fricciones relevantes para ingresar/retirar fondos. El corpus estima `qué es CCI` 4.400, transferencia bancaria 1.000 y demora interbancaria 2.400; **no se suman** con CCI 9.900 ni se convierten en aperturas. Sirven a múltiples entidades y muchos usuarios ya tienen cuenta. Primer fondeo Pibank carece de volumen específico medido; el contenido operacional permite preparar una intervención y un criterio de medición.

**Baseline requerido:** cuentas abiertas sin fondeo, días al primer fondeo, motivos operacionales, origen externo/interno y saldos por ventana. Valor financiero por saldo y tiempo lo define Finance/Tesorería. Retención puede tener valor sin generar otra apertura; trasladar fondos de Pichincha no equivale automáticamente a fondeo externo incremental del grupo.

### D. Confianza, servicio y representación en IA

TREA (2.900), FSD (1.600), definición de cuenta (590) y simulación de ahorro (40) muestran necesidades verificables. TREA/qué es TREA y variantes de FSD se solapan. La calculadora y FAQ ya existen: la intervención es claridad, coherencia y acceso a la información, antes de producir otra URL.

Seguridad/app/OTP/cierre son servicio: medir resolución, incidencia y autoservicio cuando haya datos. No inventar costo evitado de contactos, tickets o riesgo reputacional. AEO busca representación/citas exactas por superficie, pero no hay baseline controlada de respuestas Pibank. Los 16 bloques rotulados AI Overview y el catálogo de endpoints no son una serie de menciones/citas ni una demanda independiente. AEO permanece un componente medible de presencia y calidad, separado de cuentas y tráfico hasta observar un recorrido verificable.

## 5. Cobertura del corpus existente y encaje de producto

Se leyeron las **51 respuestas FAQ** del censo público previo del mismo día, además del plan técnico y las fuentes de producto/identidad. [cobertura-corpus-publico.csv](cobertura-corpus-publico.csv) conserva URL, H1, status, fecha, hash y familia; no copia respuestas completas. Apertura, requisitos, costos, cálculo, operaciones, horarios, seguridad y cierre ya están cubiertos. La existencia de respuestas no demuestra que sean encontrables, completas o eficaces; tampoco autoriza crear 51 contenidos nuevos.

Se recomprobó la [Cuenta Soles](https://pibank.pe/cuenta-soles-pibank/): ahorro digital y transferencias locales, sin débito/pagos/efectivo; condiciones/documentos vigentes requieren revisión bancaria. La página ya tiene calculadora, FAQs y un siguiente paso a registro. La [identidad](https://pibank.pe/quienes-somos/) vincula Pibank con Banco Pichincha Perú. Las FAQ de requisitos añaden elegibilidad peruana, residencia/DNI y obligaciones tributarias; no proponer segmentos extranjeros/menores por tener volumen. Todas son condiciones al corte, no promesas para 2027. El endpoint genérico `/faq/` no fue accesible vía herramienta; el censo por URLs individuales permanece la evidencia.

Frentes sustentados: coherencia entidad/producto; actualización YMYL de condiciones; rutas de comparación y apertura; calculadora y enlaces a fuentes; secuencia primer fondeo; aclaración de diferencias entre límites/horarios; arquitectura FAQ y duplicados ya observados; continuidad web/registro/app; medición y autoridad por decisión. El acceso privado, aprobación bancaria, implementación y efectos quedan separados. No inferir canibalización desde cuerpos duplicados sin GSC/rutas.

## 6. Cómo reconstruir la decisión y evitar doble conteo

1. **Oferta candidata por módulos, con horizonte anual:** base/entidad/producto; adquisición y comparación; conversión/activación; confianza/servicio; AEO/medición. Dimensionar prioridades y capacidad por fricción y alcance real, con revisiones trimestrales. Un año es tiempo de ejecución/aprendizaje; no una garantía de maduración o retorno.
2. **Economía inversa junto a sensibilidad:** dado un costo completo candidato y contribución neta por cuenta/saldo validada, calcular qué resultado incremental haría viable la inversión. Compararlo con tráfico elegible, ventanas y demanda defendible. Si los supuestos no sostienen la escala, ajustar capacidad/módulos o interpretación de contribución; no alterar la captura para obtener el número deseado.
3. **Baselines específicos antes de monetizar el programa:** canal y tráfico elegible, apertura/fondeo/cohortes, costo financiero y costo de servicio. Preparar hipótesis y umbrales; lo faltante queda N/D. La propuesta puede estar completa para revisar aunque todavía no tenga ROI confirmado.
4. **Una reconciliación de cohortes:** adquisición nueva se cuenta una vez hasta fondeo. Lift de conversión se aplica sólo a tráfico de referencia elegible que no esté contabilizado como adquisición incremental. Lift de activación se calcula sobre aperturas de referencia no ya contadas. Permanencia se valora por tiempo/saldo y no se vuelve a sumar como nueva cuenta. Marca y no marca se concilian; SEO y AEO no son dos poblaciones añadibles.
5. **Evidencia y operación:** outputs aceptados/implementados, cobertura y señales por intención, aprendizaje y causas concurrentes. GSC es primera parte cuando exista acceso; proveedor no lo rellena. Reportar contribución atribuida e incrementalidad con distinto grado de evidencia.

La conclusión es **PASS para reconstruir una propuesta competitiva, no PASS económico del alcance anual anterior**. Puede defenderse una intervención integrada por problemas y un horizonte de evaluación; su escala/inversión aún debe contrastarse con capacidad, tráfico elegible, fondeo y valoración. La nueva amplitud del mapa no autoriza un forecast mayor ni una promesa de 1% de las 15.200 cuentas.

**Entrega:** CSV de oportunidades, auditoría de todas las keywords, dictamen de familias proveedor y cobertura de corpus; [validacion-demanda.json](validacion-demanda.json). Research/modelos/PDF anteriores preservados. Costo adicional de proveedor cero; la solicitud BBVA abortada y su costo desconocido siguen en el ledger anterior. Sin compras, publicación, CRM, Notion o comunicaciones externas.
