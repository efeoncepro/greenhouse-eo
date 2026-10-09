# Cotizador Efeonce V3: prototipo del motor con primer consumidor CLI

[Superficie implementada](cotizador-v3-superficie-implementada.md) y [manual operativo actual](../../manual-de-uso/finance/operar-cotizador-v3-con-agentes.md). Las propuestas de interfaz de este documento se conservan como diseño; consultar allí los comandos y límites ejecutables.

- Fecha: 2026-10-09.
- Estado: dirección funcional confirmada; flujo local implementado hasta TASK-2022 con catálogo, composición, créditos, mantenimiento, portfolio, evaluación y preview. Parámetros operativos e integración canónica pendientes.
- Objetivo inmediato: pedir a Codex o Claude una cotización, ejecutar un cálculo determinista mediante CLI y preparar el documento con su resultado.
- Objetivo de evolución: validar el motor del cotizador V3 y después integrarlo al cotizador canónico, con Full API Parity y consumidores CLI, UI, API, Nexa y MCP sobre las mismas capacidades de dominio.
- Antecedente: [análisis hoja por hoja](../../audits/commercial/2026-10-09-pricing-workbook-logic-analysis.md).
- Contrato definido y plan de pruebas/convergencia: [bloques 2 y 3](cotizador-v3-contrato-y-validacion.md); contrato objetivo con primera vertical local ejecutable; parámetros comerciales del bloque 1 pendientes.
- Preparación del bloque 1: [catálogo y parámetros piloto](cotizador-v3-parametros-piloto.md), con variantes HubSpot separadas y controles históricos; datos operativos pendientes.

## Dirección confirmada por el operador

El Excel es el antecedente funcional, no una dependencia de ejecución del nuevo motor. Sus reglas funcionales sirven como antecedente; las notas incompletas requieren definición propia. El prototipo se desarrolla en paralelo al cotizador vigente para validar V3; la CLI es su primer consumidor. La independencia respecto del Excel y de la UI no define otro producto canónico permanente.

| Tema              | Aclaración directa del operador                                                                       | Consecuencia funcional                                                                                                |
| ----------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Fee de plataforma | Deel representa el fee de una plataforma de contratación/pagos; retirar la marca del concepto         | Componente genérico con proveedor opcional, no costo duplicado de herramienta                                         |
| Factor país       | El costo varía por país del talento y el precio/disposición a pagar varía por mercado donde se ofrece | Dos dimensiones independientes: costo por origen del talento y ajuste de venta por mercado de oferta, separadas de FX |
| Tier              | Distinguir perfiles commodity de perfiles más especializados/demandados                               | Clasificación comercial por perfil, separada de seniority, país y herramientas                                        |
| Herramientas      | Cada perfil requiere herramientas, suites de AI o licencias SaaS; falta conectarlas al costeo         | Relación perfil → kit de herramientas → costos de licencia/consumo asignados a la cotización                          |

El operador aprobó el resto del diseño y precisó las dos dimensiones de país. La aprobación comprende las relaciones funcionales de fee genérico, tiers y herramientas por perfil. No aprueba importes, factores, recargos nuevos ni la clasificación definitiva de todos los perfiles; tampoco implica iniciar implementación en esta fase de definición.

## Fee de plataforma de contratación y pagos

Nombre funcional propuesto: **Fee de plataforma de contratación y pagos**.

El proveedor, cuando exista, es un atributo. El modelo registra unidad de cobro (persona/mes, porcentaje con base identificada, fee fijo o setup), moneda, periodo y costo. Debe distinguir ausente/no aplica de costo desconocido.

Se contabiliza una sola vez en el costo correspondiente a la persona o al plan. Si el fee ya está incluido en el costo humano informado, no se agrega una segunda línea por la misma cobertura. Un fee por persona activa puede cobrarse completo aunque la persona trabaje part time. Su reparto entre cuentas se declara; no se presupone que la factura del proveedor escala con horas.

La sustitución del nombre Deel en el nuevo catálogo no implica renombrar ni recalcular el libro histórico durante esta fase.

## Dos dimensiones de país: talento y mercado de oferta

La precisión del operador resuelve la alternativa anterior entre factor de costo o factor de venta: el cotizador necesita **ambos, separados**.

| Dimensión              | Qué representa                                                            | Qué modifica                                                    |
| ---------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------- |
| País del talento       | Mercado de contratación/costo del perfil                                  | Costo humano de referencia o costo específico localizado        |
| País/mercado de oferta | Mercado donde se dispone y vende la capacidad, con su disposición a pagar | Precio comercial del perfil, sin alterar su costo registrado    |
| Moneda de cotización   | Unidad de presentación y cobro                                            | Conversión FX del precio, sin inferir ninguna dimensión de país |

El país de la entidad compradora puede aportar contexto, pero no sustituye automáticamente al mercado donde se ofrece la capacidad. Para una venta transfronteriza, ambos países se declaran o se resuelven desde información comercial confirmada.

Reglas funcionales:

- Cuando solo existe un costo de referencia global, el factor del país del talento construye un **costo humano estimado** localizado; conserva país base, factor, fecha y evidencia.
- Cuando existe un costo real o modelado específicamente para ese país, reemplaza la referencia. No se aplica el mismo factor de costo por segunda vez.
- El factor del mercado de oferta aplica el descuento/recargo comercial a la partida de perfil identificada. Su base y orden deben quedar explícitos; no se reutiliza el factor de costo como factor de venta.
- El ajuste comercial sigue siendo aplicable a un perfil con costo específico del país. Tener ese costo elimina la duplicación del ajuste de costo, no elimina la dimensión de mercado de venta.
- El margen real se calcula con el costo total y el precio después del ajuste comercial. Un descuento de mercado no reescribe ni disminuye ficticiamente costos.
- Los factores del perfil no se aplican automáticamente a suites SaaS, fees de proveedor o licencias globales. Cuando esos conceptos tengan tarifa regional propia, se utiliza esa tarifa.

Ejemplo sin importes: la misma capacidad de talento en Colombia, con iguales herramientas, dedicación y condiciones, mantiene su costo al ofrecerse a un mercado de Chile o EEUU. El precio puede variar por el factor de venta de cada mercado. Si cambia el país de contratación, se recalcula el componente de costo correspondiente.

La tabla del prototipo mezcla países con PYME, licitación y cliente estratégico. El nuevo modelo separa esas dimensiones. Factores y países elegibles requieren tablas validadas independientes; no se deducen del código de moneda ni de nacionalidad. También se necesita una base explícita para aplicar el ajuste a servicios compuestos.

**Pendientes de parametrización:** países base, factores de costo por perfil/país, factores de venta por perfil/tier/mercado, base de aplicación, bandas de ajuste y regla frente al margen mínimo. La estructura de dos dimensiones está aprobada; esos valores todavía no.

## Tiers de perfiles

El tier refleja diferenciación comercial: especialización, escasez, demanda y dificultad de sustitución. Seniority refleja experiencia/responsabilidad. Son dimensiones distintas: un perfil senior puede ser commodity y una capacidad especializada puede pertenecer a un tier alto sin ser IP propia de Efeonce.

La comparación del operador —Community Manager frente a consultoría HubSpot/Salesforce— define el criterio, no una asignación automática de todos los roles. Certificaciones, complejidad y demanda pueden documentar la clasificación; este diseño no afirma credenciales de personas concretas.

Recomendación: una sola clasificación vigente por perfil y una tabla independiente de política de precio por tier. La distinción de recargo sobre costo y margen sobre venta se conserva. Un nivel alto de especialización no se etiquetará automáticamente como IP propietaria.

**Pendiente:** nombres y número de niveles, asignación de perfiles, porcentaje/política de precio y regla para seleccionar valores dentro de bandas. Las dos tablas divergentes del prototipo no pasan a ser dos autoridades del nuevo cotizador.

## Herramientas conectadas a cada perfil

Relaciones propuestas:

```text
Perfil → requisitos de herramientas
Plan de herramientas → moneda, unidad, periodicidad y costo de proveedor
Asignación al trabajo → personas, cuentas, consumo o capacidad compartida
Cotización → costo de herramientas necesario para ese trabajo
```

Cada perfil tiene un kit predeterminado editable, con herramientas requeridas y opcionales. Por ejemplo, un diseñador puede necesitar suite de diseño, AI y revisión; un consultor CRM, acceso a entorno de trabajo/sandbox, automatización y AI. Son categorías ilustrativas. El operador confirmó [base común y selección por trabajo](cotizador-v3-seleccion-herramientas.md): Notion/Microsoft 365 para todos, SEMrush para redactor SEO, Adobe/IA según tarea y Claude Team como recurso a costear cuando se asigna. La [composición local](../../manual-de-uso/finance/componer-cotizacion-v3-con-herramientas.md) conecta esas reglas y costos al quote con asignaciones explícitas. Tarifas/planes actuales y repartos reales siguen pendientes; los kits históricos no se actualizan por esta declaración.

La relación pertenece al perfil, pero la licencia se asigna a una persona, un equipo o una cuenta. No toda repetición de un rol requiere comprar una licencia nueva; tampoco se presupone que una licencia de usuario se pueda compartir.

| Tipo de costo                       | Regla propuesta                                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------------------------------- |
| Licencia por usuario                | Número de usuarios/licencias necesarios × costo del plan por periodo                              |
| Licencia anual                      | Costo anual /12 para costeo mensual; mantener factura anual y compromiso de caja por separado     |
| Plataforma compartida               | Parte atribuible al trabajo según criterio declarado de cuentas, usuarios, capacidad o consumo    |
| Consumo AI/proveedor                | Consumo presupuestado × costo unitario; límites y sobreconsumo explícitos                         |
| Herramienta dedicada al cliente     | Costo específico del cliente, sin reparto hipotético                                              |
| Herramienta aportada por el cliente | Excluir del costo Efeonce solo cuando el acceso suficiente esté confirmado; conservar dependencia |

Para part time, una licencia por usuario no se reduce automáticamente al porcentaje de jornada. Una licencia compartida puede repartirse, pero el divisor y la capacidad remanente deben tener sustento. Una herramienta desconocida o sin plan/costo produce un dato pendiente, no cero.

Al combinar varios perfiles, resolver asignaciones por usuario/equipo/cuenta. Cobrar licencias independientes cuando corresponda y agregar recursos compartidos una sola vez. El criterio no es eliminar todas las herramientas repetidas por nombre.

Los kits definen necesidades, no un cargo genérico adicional sobre herramientas que ya se incluyeron. Un overhead fijo de herramientas del prototipo no se suma otra vez a sus costos detallados sin demostrar una cobertura distinta.

## Recorrido de cálculo propuesto

1. Resolver perfiles, cantidades de personas, dedicación, duración, país del talento y mercado de oferta.
2. Determinar costo humano disponible: dato específico del país o estimación desde referencia con factor declarado.
3. Agregar el fee de plataforma aplicable una vez.
4. Resolver kits y asignaciones de herramientas; normalizar periodicidad y estimar consumo explícito.
5. Incorporar otros costos de operación y reservas que se hayan definido para el servicio.
6. Aplicar política de precio elegida —tier y engagement donde corresponda— y calcular margen real sobre el costo total.
7. Aplicar el ajuste del mercado de oferta y otros ajustes comerciales explícitos sobre sus bases identificadas, recalcular margen y convertir con el FX identificado.
8. Entregar resultado estructurado, desglose interno, importe para el cliente, supuestos y faltantes.

El costeo debe incluir las herramientas necesarias antes de fijar un precio. No se suman tarifas de venta de perfiles/herramientas y otro recargo de servicio como si fueran costos internos. Para servicios compuestos se suma costo y se aplica la política del servicio una vez; el nivel de especialización de los perfiles puede informar la selección del tier de servicio, pero esa selección aún requiere regla.

## Experiencia propuesta para agentes

Ante “cotiza un diseñador senior part time en Chile”, el agente resuelve el perfil, pide o usa una dedicación configurada explícita y distingue si Chile es el país del talento, el mercado de oferta o ambos. No los iguala sin información confirmada. Obtiene el kit del perfil y resuelve la moneda aparte. Para componentes completos, la CLI calcula; para faltantes, devuelve campos específicos que el agente puede completar sin inventar costos.

El resultado diferencia costo humano, fee de plataforma, herramientas, otros costos, precio, margen, país del talento, mercado de oferta, ambos ajustes y FX. El documento comercial puede agruparlos en un fee de servicio; el desglose interno se conserva para poder explicar y actualizar el cálculo.

## Estado de diseño y relación con lo existente

- La [CLI existente](pricing-workbook-cli.md) conserva su comportamiento de consulta y escenarios; no implementa este modelo.
- El [ADR de esa CLI](../../architecture/GREENHOUSE_PRICING_WORKBOOK_AGENT_CLI_DECISION_V1.md) cubre la proyección histórica, no aprueba el nuevo catálogo o la semántica de este cotizador.
- La dirección confirmada por el operador es prototipar el motor de V3 y luego integrarlo para mejorar, cambiar o robustecer el cotizador canónico. La CLI es el primer consumidor; las reglas no pertenecen al comando de terminal.
- Primera vertical local implementada bajo [ADR del prototipo](../../architecture/GREENHOUSE_PRICING_V3_LOCAL_PROTOTYPE_DECISION_V1.md); [comandos vigentes y límites](../../manual-de-uso/finance/cotizar-v3-por-cli.md). La integración canónica queda pendiente. No se necesita reparar la UI para validar el prototipo.
- Sin cambios al Excel, payroll, DB, motor, contratos ni documentos comerciales emitidos durante esta propuesta.
- Próximas definiciones: tablas independientes de costo y venta por país/mercado, bases de aplicación y bandas de margen; política de tiers; kits por perfil; unidades y costos del fee de plataforma; capacidad part time; reservas y orden de los addons.

## Propuesta completa de V1 para revisión antes de construir

Esta sección conserva la interfaz objetivo. El [manual V3](../../manual-de-uso/finance/cotizar-v3-por-cli.md) describe los comandos realmente disponibles y sus límites; los ejemplos propuestos siguientes no agregan aprobación a parámetros pendientes.

### Cinco piezas del cotizador

1. **Catálogo del prototipo:** datos editables de perfiles, costos, herramientas, políticas y mercados, independientes del Excel y con un contrato que permita su futura integración. El Excel conserva su papel de antecedente; no se lee para calcular.
2. **Motor de cálculo V3:** funciones deterministas de costeo y precio, con validación de entradas y explicación de cada operación; reutilizables por el cotizador canónico.
3. **CLI como primer adaptador:** entrada y salida estructuradas para operar el motor sin UI. Traduce argumentos, carga datos mediante adaptadores e invoca el contrato; no contiene reglas de pricing.
4. **Instrucciones para Codex y Claude:** búsqueda de perfiles, resolución de datos faltantes, invocación de la CLI y preparación del documento usando el resultado calculado.
5. **Cotización local reproducible:** resultado congelado con versiones, supuestos y dos vistas, interna y comercial.

El catálogo inicial recuperará los conceptos completos del prototipo. Un precio histórico, una fila de plantilla o una nota desconectada no se convierten automáticamente en una tarifa vigente.

### Catálogos y relaciones

| Catálogo              | Contenido mínimo                                                                                                  |
| --------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Perfiles              | ID estable, nombre, aliases, familia, seniority, tier y requisitos del kit                                        |
| Costos humanos        | Perfil, país, moneda, periodo, componentes incluidos, jornada base, fuente, fecha y condición estimada/específica |
| Tiers y políticas     | Clasificación única; política explícita de markup o margen objetivo, separada de seniority                        |
| Países del talento    | Referencia base y factores de costo por perfil o grupo, con fecha y evidencia                                     |
| Mercados de oferta    | Factores comerciales por perfil/tier y mercado, base de aplicación y vigencia                                     |
| Herramientas y kits   | Plan, precio, moneda, periodicidad, unidad de cobro, requerido/opcional y asignación                              |
| Fees de plataforma    | Proveedor opcional, unidad, base del porcentaje cuando aplique, periodicidad y cobertura                          |
| Servicios compuestos  | Roles, dedicaciones, herramientas y política de precio del servicio                                               |
| Otros costos y addons | Cobertura, costo o cargo comercial, base, orden, periodicidad y condiciones                                       |
| FX                    | Par de monedas, dirección de conversión, tasa, fuente y fecha                                                     |

Todos los registros relevantes tienen versión y procedencia. Costo desconocido, costo cero confirmado y concepto que no aplica son estados distintos. Los valores monetarios usan moneda ISO explícita; la política de precisión y redondeo se define antes de implementar.

### Entrada de una cotización

Una cotización declara perfiles y número de personas, seniority, dedicación en horas o FTE, país del talento por perfil, mercado de oferta, modalidad comercial, duración, moneda de salida y herramientas aportadas por cada parte. Puede incluir un costo humano específico con fuente y fecha, y ajustes comerciales expresos.

La dedicación part time requiere una jornada base definida. No se transforma silenciosamente en 80, 90 u otra cantidad de horas. El tipo de asignación determina cuánto costo humano absorbe el trabajo:

- **Capacidad compartida:** atribución por capacidad efectiva y criterio documentado; la cobertura de la capacidad remanente debe ser explícita.
- **Capacidad dedicada:** costo de la capacidad comprometida para ese cliente; reducir horas de entrega no demuestra por sí solo que el costo se reduzca en igual proporción.

La regla de capacidad afecta costo humano. Herramientas y fees conservan sus propias unidades de cobro.

Ejemplo de pedido suficientemente definido, sin importes: «Cotiza un diseñador senior al 50%, talento en Colombia, ofrecido en Chile, por tres meses, en CLP; incluye su kit y Talent Assurance». El agente resuelve los IDs del catálogo y las políticas configuradas, muestra los supuestos que use y solicita únicamente los datos que falten para ese caso.

### Talent Assurance y otros componentes

Talent Assurance forma parte de la dirección comercial aprobada. El cotizador debe representar el costo de la cobertura comprometida —capacitación continua, seguimiento de calidad y continuidad/reemplazo según alcance— con su unidad y periodicidad. El alcance de la garantía y sus costos deben definirse; no se inventan porcentajes ni se promete disponibilidad ilimitada.

Su costo puede incorporarse al paquete y presentarse comercialmente como incluido. Esa presentación no elimina el costo interno. Si capacitación o continuidad ya están cubiertas en otra partida, se identifica la cobertura para evitar duplicación.

Overhead, gestión, setup, consumo AI, costos de transacción y descuentos tienen reglas independientes. Cada uno indica si es costo interno o ajuste de venta, sobre qué base opera y si ocurre una vez o periódicamente. Un costo trasladado no se convierte además en otro cargo sin una política explícita.

### Costeo, precio y control de margen

Para cada periodo, el motor obtiene:

```text
Costo total = talento atribuido + fee de plataforma + herramientas
              + operación + cobertura Talent Assurance + otras reservas definidas

Precio base por markup = costo de la base × (1 + markup)
Precio base por margen objetivo = costo de la base / (1 − margen objetivo)
```

Markup y margen objetivo son alternativas identificadas, no porcentajes intercambiables ni recargos que se acumulan. La política debe declarar qué costos cubre su base. Para Staffing, la propuesta es ajustar por mercado la partida comercial identificada del perfil; herramientas y fees mantienen su tratamiento explícito. Para servicios compuestos, la distribución de la base ajustable se debe definir antes de habilitar esa modalidad.

Después se aplican los ajustes comerciales autorizados sobre sus bases, se calcula `margen real = (precio neto − costo total) / precio neto` y se verifica el piso configurado. Con precio neto cero, el margen porcentual no está definido. Como propuesta, si el precio incumple el piso, el resultado requiere revisión y explica la diferencia; no modifica automáticamente el precio ni declara una excepción aprobada.

El resultado separa fee recurrente, setup único y total del periodo contratado. Un setup amortizado no se cobra también íntegro como cargo inicial. Para consumo variable se distingue presupuesto estimado de compromiso fijo. Impuestos y retenciones requieren una regla expresa; no se infieren únicamente del país.

FX convierte importes con par, tasa y fecha explícitos. Una conversión no sustituye los factores de costo o mercado. Una tasa ausente impide dar por completo el importe en la moneda solicitada; no se usa silenciosamente la del libro histórico.

### Interfaz CLI propuesta

Nombre y sintaxis sujetos al contrato técnico previo a implementación. Ejemplo de interfaz objetivo, todavía no disponible:

```text
cotizador catalog search --query "diseñador senior" --json
cotizador catalog show --id <perfil> --json
cotizador quote calculate --input solicitud.json --json
cotizador quote explain --input resultado.json --json
cotizador quote compare --inputs escenario-a.json escenario-b.json --json
cotizador quote export --input resultado.json --audience client --format markdown
```

La operación de cálculo devuelve JSON con esquema estable. Los diagnósticos de ejecución van por un canal separado y los códigos de salida distinguen éxito, entradas incompletas y error. El motor informa datos faltantes con rutas de campo concretas; el agente traduce esas rutas a preguntas comprensibles. No reemplaza un costo faltante por cero para completar una cotización.

La operación de explicación lee el resultado congelado; no recalcula con un catálogo más reciente. La comparación permite contrastar escenarios completos, por ejemplo distintos mercados, países de talento o dedicaciones, mostrando el impacto sobre costo, precio y margen.

### Salidas interna y comercial

| Vista interna                             | Vista comercial                                        |
| ----------------------------------------- | ------------------------------------------------------ |
| Costos por componente y cobertura         | Servicio, perfiles y capacidad comprometida            |
| País del talento y mercado de oferta      | Mercado de prestación y condiciones pertinentes        |
| Política de precio, ajustes y margen real | Fee por periodo, setup y total contratado              |
| Licencias, consumo y asignaciones         | Herramientas incluidas y aportes del cliente           |
| FX, fuentes y versiones del catálogo      | Moneda, impuestos definidos y vigencia de la propuesta |
| Faltantes, supuestos y controles          | Alcance de Talent Assurance, límites y exclusiones     |

La exportación comercial usa una lista explícita de campos permitidos. La información interna se conserva para revisión y no se copia por defecto al documento cliente. El formato inicial propuesto es JSON para agentes y Markdown para revisión; PDF/HTML pueden añadirse mediante las herramientas documentales existentes.

Cada resultado conserva la entrada resuelta, las versiones o hashes del catálogo/políticas, el FX empleado y el desglose de operaciones. Cambiar el catálogo produce resultados nuevos; no reescribe una cotización anterior. Calcular o exportar un archivo local no crea una cotización en el portal/HubSpot, no autoriza comercialmente sus importes ni envía el documento.

### Alcance de V1 y criterios de aceptación

La propuesta de V1 es un catálogo independiente, costeo y precio de Staffing/Staff Augmentation, kits de herramientas, fee genérico, Talent Assurance parametrizado, ambas dimensiones de país, conversión declarada, salida estructurada y exportación local. Servicios compuestos se habilitan cuando su base de ajuste y política estén completas; no bloquean la primera modalidad de Staffing.

El motor puede costear capacidad interna sin redefinir los paquetes públicos de otras prácticas. Por ejemplo, el costeo de diseño no sustituye las reglas comerciales de Product Design 360.

La verificación antes de considerar utilizable V1 debe demostrar:

- Cálculo independiente del archivo Excel y resultados reproducibles con versiones congeladas.
- Casos completos del prototipo reproducidos bajo una configuración histórica identificada, sin afirmar que son precios vigentes.
- Separación efectiva de costo del talento, mercado de oferta y FX; costo específico sin doble factor.
- Part time con licencias completas cuando corresponde; varias personas con licencias individuales y recursos compartidos sin duplicación.
- Normalización de costes anuales, fees y Talent Assurance contabilizados una vez, y setup separado de recurrencia.
- Ajustes y descuentos con margen recalculado y controles ante información faltante.
- Exportación cliente que conserve el alcance y los importes, excluyendo costo y margen internos.

Antes de construir se necesitan la decisión arquitectónica propuesta y los parámetros iniciales: costos vigentes, jornada/capacidad, clasificación y precio por tier, matrices separadas de país y mercado, kits y tarifas, fee de plataforma, cobertura/costo de Talent Assurance, addons, piso de margen, FX y redondeo. El diseño estructural está definido; la exactitud comercial depende de completar esas tablas.

## Propuesta de decisión arquitectónica: motor V3 reutilizable y transición al canon

- Estado: `Proposed` para el contrato técnico y la transición; dirección de producto confirmada por el operador el 2026-10-09.
- Owner propuesto: Commercial/Finance, con Platform para contratos y consumidores.
- Alcance: motor, catálogo, contratos, adaptadores y futura integración al cotizador canónico. No cambia runtime ni autoriza migración en esta etapa.
- Decisiones de referencia: [Quote API Parity](../../architecture/GREENHOUSE_QUOTE_API_PARITY_DECISION_V1.md), [Full API Parity](../../architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md) y [placement modular](../../operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md).

### Separación desde el prototipo

```text
Prototipo: CLI → contrato de aplicación → motor V3
                     ↑ datos resueltos por adaptadores de catálogo/FX

Destino: CLI / UI / API / Nexa / MCP
                     ↓
         capacidades canónicas y autorización
                     ↓
        motor V3 + catálogo/políticas canónicos
```

El motor recibe entradas validadas y snapshots explícitos de catálogo, políticas y FX. Devuelve costos, precio, explicación y faltantes. No depende de argumentos de terminal, Excel, Next.js, componentes UI, herramientas MCP ni archivos locales. Tampoco consulta proveedores o tipos de cambio durante una operación de cálculo; esa resolución pertenece a los adaptadores.

El contrato de entrada, salida y errores se versiona por separado del catálogo. Cambiar de archivos a un reader canónico no cambia la fórmula ni obliga a escribir otro motor. Las reglas de negocio se implementan una vez; cada consumidor traduce su transporte al contrato compartido. El núcleo conserva el detalle interno; la capa canónica aplica autorización y redacción antes de responder, según el contexto autenticado, no por una preferencia arbitraria del caller.

El prototipo puede ejecutar el contrato localmente con snapshots. Tras la integración, los consumidores operativos utilizan las capacidades canónicas y el catálogo autorizado. Una ejecución local reproducible para auditoría conserva sus snapshots y condición de simulación; no se convierte en una segunda autoridad de precios vigentes.

### Transición propuesta

| Etapa                              | Resultado                                                                                                                           |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Prototipo V3, primero Staffing     | Motor separado, catálogo del prototipo, CLI y casos reproducibles; validación de reglas y parámetros                                |
| Contraste con el cotizador vigente | Comparación de escenarios equivalentes, diferencias explicadas y evaluación de reemplazar, extender o integrar el motor actual      |
| Integración canónica               | Adaptadores de datos, compatibilidad, snapshots/lifecycle y migración controlada; versión del motor identificada en cada cálculo    |
| Adopción por consumidores          | CLI, UI, API, Nexa y MCP invocan la misma capacidad; coherencia de resultados con iguales entradas, políticas, versiones y permisos |

La futura extracción puede ser integración dentro del dominio o movimiento a un módulo/paquete aprobado. La dirección no exige un repositorio, microservicio o despliegue independiente; primero se fija la frontera reutilizable y después el placement técnico con evidencia.

Full API Parity comprende discovery, simulación, explicación/comparación y las operaciones de lifecycle que el cotizador canónico soporte, mediante capacidades compartidas. No implica igualdad de permisos para todos los consumidores: la decisión vigente separa simular de autorar/emitir y mantiene MCP externo en simulación. Esta propuesta no amplía esos permisos.

### Consecuencias y criterios de convergencia

- Se rechaza concentrar reglas en la CLI y copiarlas después a API, UI o MCP.
- Se acepta una etapa de prototipo paralelo para experimentar, con estado y versiones explícitos; el destino es un cotizador canónico con múltiples consumidores.
- Integrar requiere verificar el motor y los contratos actuales en código, comparar resultados, preservar cotizaciones históricas, definir cutover/rollback y validar cada consumidor. La documentación de API parity no prueba por sí sola que el runtime actual esté completo.
- La integración de simulación no supone completar emisión, aprobación, CRM, exportación remota ni quote-to-cash. Cada capacidad conserva su estado y evidencia propios.
- Criterio adicional de aceptación del prototipo: ejecutar los mismos casos invocando directamente el motor y mediante la CLI, con resultados equivalentes; ninguna regla depende del consumidor.

El [contrato del prototipo y plan de validación/convergencia](cotizador-v3-contrato-y-validacion.md) concreta los bloques 2 y 3, incluyendo defaults, estados, precisión numérica y gates. Revisar esta propuesta al formalizar ese contrato, al terminar la validación comercial o si un consumidor requiere una capacidad nueva. Antes de la integración, formalizar/indexar la decisión aceptada y su plan de transición conforme al operating model de ADRs.
