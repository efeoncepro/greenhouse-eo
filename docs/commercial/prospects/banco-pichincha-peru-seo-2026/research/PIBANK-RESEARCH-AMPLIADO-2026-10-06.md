# Pibank Perú · Investigación ampliada de demanda, competencia y AEO

**Corte 06-10-2026 · Preventa Efeonce · Versión acotada para propuesta anual.**
**Conclusión:** existe una oportunidad coherente alrededor de ahorro líquido en soles, comparación, rendimiento, apertura y confianza. El inventario ampliado mejora la elección de intervenciones; no acredita un TAM, cuota adquirible, forecast ni viabilidad económica. El modelo recibe un panel deliberadamente selectivo de **3.690 búsquedas estimadas/mes**, con educación, intención condicional y dólares separados. La línea base del canal propio y de asistentes permanece sin medir.

## Alcance, método y costo

Se operó la CLI canónica `pnpm dataforseo` v1.1.0, con la organización de adquisición Efeonce `EO-ORG-0007`, consumer SEO, entitlement existente, previews y límites por solicitud. El techo operativo de gasto fijado para esta ampliación fue US$2; no se provisionó acceso ni se atribuyó el costo a Pibank. Requests, estimates, respuestas, fechas y errores redactados están en el [ledger](pibank-expanded-2026-10-06/request-ledger.json) y en los archivos asociados. No se recurrió a la API cruda ni se consumieron campos ETV.

Los endpoints de Labs fueron `keyword_suggestions/live`, `related_keywords/live`, `ranked_keywords/live` y `serp_competitors/live`; se completó el contraste con SERP Google `organic/live/advanced`, mercado **Perú, location_code 2604, español**. Labs no aporta una segmentación por dispositivo; las capturas SERP sí distinguen desktop/mobile. El [contrato de endpoints](pibank-expanded-2026-10-06/endpoint-contracts.json) conserva documentación y disponibilidad. Las estimaciones de Labs son históricas del proveedor, con fecha de actualización por fila; no representan datos de Search Console.

Se registraron **52 solicitudes pagadas**, con **51 respuestas y US$1,14582 de costo observado**. La segunda página de rankings filtrados de BBVA abortó en CLI, con salida `This operation was aborted`, sin response/task ID/costo recuperable. Su estimate era US$0,132: el costo observado total queda **N/D**, y la exposición estimada subtotal + solicitud pendiente es US$1,27782, no una factura confirmada. Se detuvieron compras y retries; la tercera página y una consulta Overview adicional quedaron sin ejecutar y no entran como medición. Dos GET de preflight AEO reportaron costo cero. Reutilizar dos raws de keywords y cuatro SERP válidas anteriores tuvo costo incremental cero; el costo histórico anterior de US$0,07714 se conserva separado. Los siete errores SERP anteriores permanecen como errores, sin inventar resultados. [Cobertura y costos](pibank-expanded-2026-10-06/coverage-and-costs.json).

## Cobertura real y límites de agrupamiento

Suggestions cubre **10 semillas**, agotando el `total_count` de cada resultado, con paginación y cero duplicados exactos entre páginas de una misma semilla:

| Semilla | Keywords devueltas | Páginas medidas |
|---|---:|---:|
| cuenta de ahorros | 1.433 | 3, incluyendo 100 filas reutilizadas |
| cuenta digital | 769 | 2 |
| mejor banco para ahorrar | 41 | 1 |
| intereses cuenta de ahorros | 49 | 1 |
| transferencia bancaria | 460 | 2 |
| fondo de seguro de depósitos | 6 | 1 |
| cuenta en dólares | 499 | 2 |
| cómo ahorrar dinero | 299 | 1 |
| qué banco paga más intereses | 28 | 1 |
| bancos seguros Perú | 2 | 1 |

Related añade **11 semillas**, profundidad 3, límite 300. Nueve devolvieron todos sus resultados: 95/100/60/4/61/6/124/38/5 filas, según la semilla en los raws. `depositar dinero en cuenta` y `bancos seguros peru` devolvieron ausencia de datos, con total nulo; esto no prueba demanda cero.

Rankings cubre siete URLs oficiales específicas: Interbank Súper Tasa (24 filas), BBVA Digital (9), BCP apertura (1), Scotia Power (6), Scotia Digital (19), Efectibank ahorro (6) y Pibank Cuenta Soles (sin datos de la base). Para descubrir contenidos y FAQ se consultaron dominios con filtro sobre rutas `cuenta|ahorr|deposit|transfer`: BCP **917/917**, dos páginas; BBVA **500/1.544**, cobertura parcial por el aborto. Son resultados del filtro, no inventarios completos de bancos. La URL de Pibank sin datos no equivale a invisibilidad de Google ni a falta de indexación.

El dataset final contiene **4.855 keywords normalizadas exactas**: 3.696 con volumen positivo, 466 con cero reportado, 678 con volumen nulo y 15 sin volumen medido. Conserva keyword/ID, carril, elegibilidad candidata, geografía, idioma, unidad, fechas, historia, todas las fuentes y observaciones de rankings. [JSON completo](pibank-expanded-2026-10-06/keyword-dataset.json) · [CSV](pibank-expanded-2026-10-06/keyword-dataset.csv).

Las tres vistas sirven para propósitos distintos:

1. **Exacta:** normalización de acentos, mayúsculas y espacios; selección de `keyword_info` más reciente y preservación de observaciones. Deduplicar texto no elimina solapamiento de usuarios ni de intención.
2. **Familias:** `core_keyword` del proveedor cuando existe; representante exacto del core o formulación corta. No se usa MAX como único universo, ni se suman familias como techo del mercado. [Familias](pibank-expanded-2026-10-06/core-families.json).
3. **Panel manual:** representantes de decisiones compatibles, sin sumar singular/plural, formulaciones equivalentes o años. Es el único subtotal de este research que alimenta por defecto el modelo.

La clasificación automática conserva 459 candidatos directos, 100 condicionales, 710 educativos/asistidos, 2.076 de marca ajena, 7 de marca propia, 194 de dólares futuros, 186 de sustitutos/otros productos y 1.123 de ruido. Es un filtro de investigación, **no un universo elegible**: aún puede contener entidades extranjeras o frases ambiguas que deben revisarse antes de producir contenidos. `lane-summary.json` conserva sumas brutas como diagnóstico técnico; no deben usarse en el deck ni en el modelo. Conversiones sueltas de dólares/soles, consultas sin propósito financiero, menaje, tarjetas/pagos incompatibles y otros segmentos quedan fuera de la ruta editorial y del subtotal de adquisición.

## Inputs mensuales para el modelo anual

| Carril | Representantes | Proxy mensual | Uso |
|---|---|---:|---|
| Adquisición directa | cuenta de ahorros 2.900; mejores cuentas de ahorro Perú 320; abrir cuenta de ahorros 210; interés de cuenta de ahorro 210; cuenta sin mantenimiento 50 | **3.690** | Panel por defecto, sujeto a relevancia/captura/conversión ilustrativas |
| Condicional | cuenta digital 1.300; cuentas de alto rendimiento Perú 390 | **1.690** | Separado: intención transaccional y geografía necesitan validación |
| Educación/asistencia | FSD 1.600; qué es TREA 880; transferencia bancaria 1.000; cómo ahorrar dinero 590 | **4.070** | Apoyo a decisión/operación; no añadir cuentas fondeadas por defecto |
| Dólares futuros | cuenta en dólares 480 | **480** | Fuera del producto actual y del caso base |

Fuente exacta y criterio por representante: [monthly-demand-inputs.json](pibank-expanded-2026-10-06/monthly-demand-inputs.json) · [CSV](pibank-expanded-2026-10-06/monthly-demand-inputs.csv). Cada representante incorpora sus doce meses disponibles **septiembre 2025–agosto 2026**. La media de la suma histórica directa es **4.015**, distinta del proxy bucketed de 3.690; no debe reemplazarse uno por otro sin registrar el método. Cada carril tiene perfil mensual y factor histórico normalizado. Mapear ese patrón a 2027 es una sensibilidad ilustrativa, no una predicción estacional ni una tendencia de crecimiento. La sensibilidad plana es válida; no hay un crecimiento anual observado que autorice multiplicar demanda o duplicar 3.900. El snapshot incorporado al modelo se conserva sin modificación, SHA-256 `b97ddc71d2b707019e03fb50cbd16887139d85f0ee04ea10212a39a9d7e35e23`.

## SERP: dónde competir y qué corregir primero

Hay **19 capturas válidas**, 15 nuevas y cuatro reutilizadas, diez consultas distintas, depth solicitado 20; las filas orgánicas efectivamente devueltas varían. En las **17 capturas genéricas** no apareció `pibank.pe` dentro de los resultados orgánicos capturados. Esta evidencia es una brecha de la muestra, no cero visibilidad global. Las dos capturas propias difieren: móvil encuentra primero una FAQ de definición en posición orgánica 5 y otras FAQ/privacidad; desktop encuentra privacidad en posición orgánica 2. La página de producto no domina esas dos observaciones. Priorizar coherencia de entidad, producto, enlaces y presentación de resultados, sin diagnosticar una causa técnica sólo desde posiciones. [Capturas y preguntas](pibank-expanded-2026-10-06/serp-evidence.json).

El panel `serp_competitors` de nueve consultas devolvió 50 dominios. BCP, Interbank, comparadores, YouTube/Facebook, SBS y otros bancos aparecen según la consulta. Se conservan posiciones/cobertura del set, sin transformar el set en share of voice del mercado. [Matriz](pibank-expanded-2026-10-06/serp-competitor-matrix.json).

Las preguntas relacionadas muestran fricciones concretas: banca confiable para apertura online, cobro de mantenimiento, entidad que respalda Pibank y cobertura FSD. También revelan contaminación: la consulta de mayor interés deriva hacia plazo fijo, y alto rendimiento mezcla productos/geografías. Conviene mejorar producto/FAQ y preparar comparaciones de ahorro líquido; una página para cada keyword ampliada generaría duplicidad y sobrepromesas. Presencia de videos/comparadores sugiere necesidades de autoridad y explicación, sin garantizar cobertura editorial externa.

## Producto, competidores y revisión YMYL Perú

La [Cuenta Soles Pibank](https://pibank.pe/cuenta-soles-pibank/) publica 5% TREA desde el primer sol, sin mantenimiento ni saldo mínimo, y opera por transferencias: no trasladar expectativas de débito, pagos, cajeros, efectivo o sucursales. Ya existen producto, calculadora y FAQ. Pibank debe explicarse como marca de [Banco Pichincha Perú](https://pibank.pe/quienes-somos/), con condiciones propias y entidad legal verificable.

[BBVA Digital](https://www.bbva.pe/personas/productos/cuentas/ahorro/cuenta-digital.html) orienta parte de su propuesta a transacciones y publica TREA 0%. [Interbank Súper Tasa](https://interbank.pe/cuentas/cuentas-ahorro/cuenta-super-tasa) usa tramos: el máximo de 4,5% no debe asignarse al ticket S/10.000 automáticamente. [BCP apertura](https://www.viabcp.com/abrir-cuenta) es multiproducto. [Scotia Power](https://www.scotiabank.com.pe/Personas/Ahorros/Cuentas-Bancarias/cuenta-power) y [Scotia Digital](https://www.scotiabank.com.pe/Personas/Ahorros/Cuentas-Bancarias/cuenta-digital?cliente=false) tienen tareas/condiciones distintas. [Efectibank ahorro](https://www.efectibank.pe/ahorros/cuenta-de-ahorros/) publica 4,5% TREA y funciones de pagos/débito que cambian el encaje. Todos son snapshots de consulta; **ninguna tasa es promesa para 2027** ni se reutilizan campañas vencidas.

La comparación necesita moneda, saldo/tramo, cargos, liquidez, funciones, fecha efectiva y cartilla/tarifario equivalentes, siguiendo los [criterios SBS](https://www.sbs.gob.pe/usuarios/aprende-con-la-sbs/compara-y-elige). El [FSD](https://fsd.org.pe/cobertura/) publica S/123.000 para septiembre–noviembre 2026: aplica por depositante/institución miembro, no por marca independiente; verificar situación y periodo antes de cada publicación. No presentar TREA como margen bancario ni depósitos como ingreso.

Finanzas es un territorio YMYL. Se requiere trazabilidad de fuente, fecha, revisión bancaria y autoría institucional/persona verificable; no inventar credenciales. [Google: contenido útil y confianza](https://developers.google.com/search/docs/fundamentals/creating-helpful-content). El [ledger primario](pibank-expanded-2026-10-06/official-source-ledger.json) documenta 17 fuentes, sin extraer ni inventar una matriz SBS de tasas.

## AEO: capacidad comprobada y baseline pendiente

El [catálogo AEO](pibank-expanded-2026-10-06/aeo-capabilities.json) registra 60 rutas relevantes declaradas ejecutables por CLI, con método/path/documentación. Incluye familias de AI Keyword Data, LLM Mentions, ChatGPT LLM Responses/Scraper y SERP AI Mode. Declaración de catálogo no certifica cada combinación de mercado/modelo ni un benchmark operativo. **Sólo se ejecutaron dos preflights gratuitos:**

- LLM Mentions locations/languages confirma Perú/español para **Google**; no para ChatGPT Mentions en ese mercado. Sus 987.733 respuestas son cobertura del corpus del proveedor, no demanda ni menciones de Pibank.
- Models devuelve 49 modelos de ChatGPT LLM Responses y atributos de búsqueda web. Una respuesta API no representa por sí sola la interfaz de usuario ni el comportamiento de otros motores.

No se ejecutaron llamadas pagadas a LLM Responses, Scraper, AI Mode ni Mentions. Baseline Pibank AEO = **N/D**, nunca cero. Dieciséis capturas SERP contienen un bloque del proveedor rotulado AI Overview; varios bloques no incluyen contenido/citas. Se registran como features de SERP, sin inferir menciones, exactitud, citabilidad o respuestas de asistentes y sin prometer una medición AEO ya levantada.

[Google AI features](https://developers.google.com/search/docs/appearance/ai-features) mantiene las bases SEO sin schema/archivo especial obligatorio. El [informe generativo GSC](https://support.google.com/webmasters/answer/16984139?hl=es) puede aportar impresiones de AI Overviews/AI Mode cuando esté disponible para la propiedad: verificar cobertura y filtros. Sus datos ya están incluidos en Web; no sumarlos como tráfico adicional. La exportación puede convertir marcadores sin dato en cero: preservar contexto de interfaz. No se tiene acceso GSC ni se presupone paridad de API.

## Prioridad y siguiente trabajo

El [backlog priorizado](pibank-expanded-2026-10-06/clusters-priorizados.json) contiene diez grupos con evidencia, dependencia, decisión y aceptación. **P0:** identidad/producto, rendimiento/costos, apertura y continuidad, FSD/TREA, transferencias/primer fondeo. **P1:** comparación verificable, autoridad/gaps y validación del carril digital/alto rendimiento. **P2:** educación amplia y dólares, sujetos a propósito/capacidad/oferta. Mejorar/consolidar activos existentes precede a crear nuevas páginas.

M1 del programa anual valida accesos, definiciones, inventario, trazabilidad y baseline disponible, mientras ejecuta correcciones seguras aprobadas. M3/M6/M9/M12 revisan entregas, indexación, recorrido y cohortes con ventanas comparables; no se exige maduración SEO en treinta días. Elegir oportunidades por encaje, cercanía al fondeo, evidencia, brecha y costo/riesgo; nunca por volumen bruto o dificultad cero del proveedor. El SEO puede contribuir a captación, pero paid, tasa, marca, app y atención son causas concurrentes.

Antes de fee/retorno: costear capacidad real y definir cuenta, fondeo, moneda, periodo, saldo y atribución con el banco. CAC necesita inversión completa y cuentas incrementales válidas; ROI/payback necesita además valoración bancaria del saldo y tiempo activo. El panel no garantiza 1% de 15.200 ni sustenta elevar captura/conversión hasta justificar un precio. Research y propuesta quedan preparados para revisión, sin contratación, publicación o comunicaciones externas.
