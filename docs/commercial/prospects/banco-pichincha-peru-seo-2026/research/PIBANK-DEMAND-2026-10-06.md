# Pibank Perú · demanda y competencia · 06-10-2026

**Uso interno · Research v0.1 · Owner comercial: Julio Reyes.** Datos capturados por CLI DataForSEO v1.1.0 y fuentes públicas primarias. No constituye forecast de 2027 ni diagnóstico de conversiones bancarias.

## Lectura principal

Hay demanda genérica medible para ahorro, comparación y apertura. La muestra actual no sustenta atribuir a SEO una banda de 5% o 10% de las 15.200 cuentas. Esas bandas siguen siendo ejercicios de escala: deben contrastarse con demanda, captura de clics, relevancia, apertura/fondeo y maduración.

La investigación entrega **127 términos normalizados**, **113 con volumen estimado** y **14 sin fila del proveedor**. Para un modelo inicial, un agrupamiento editorial conservador de seis territorios de adquisición produce un **subtotal de 3.900 búsquedas mensuales**. Al incluir un territorio con intención geográfica mezclada, el subtotal bruto llega a **5.500**. Son proxies selectivos de esta muestra, no personas, TAM completo ni techo del mercado.

Una captura móvil de marca muestra el primer resultado de `pibank.pe` en **posición orgánica 5**, una FAQ. Las tres consultas genéricas con SERP completo no muestran `pibank.pe` dentro de la profundidad solicitada 20. Es evidencia de oportunidad por consulta/fecha, no ausencia de indexación ni pérdida histórica monetizada.

## 1. Método, gasto y cobertura

- Mercado **Perú, location_code 2604, language_code es**. Volúmenes Google Labs: estimación de promedio mensual basada en base Google Ads; no GSC ni usuarios.
- Keyword Overview: **36 términos solicitados, 22 filas devueltas**; HTTP 200 / task 20000. Coste real **US$0,01464**.
- Suggestions: seed `cuenta de ahorros`, primera página **100 términos ordenados por volumen** de **1.433 candidatos coincidentes**. Coste real **US$0,024**. Los 1.433 son keywords candidatas, no búsquedas; 1.333 no se descargaron.
- Unión por texto normalizado: 127 filas, 113 con volumen. Keywords ausentes quedan `null`, nunca cero. El proveedor trae `core_keyword`, conservado para detectar variantes; la normalización quita tildes y diferencias de mayúsculas, no convierte frases distintas en personas distintas.
- SERP: **cuatro capturas completas** sin filtro target, PE/es/móvil/profundidad 20; consultas de marca, comparación, alto rendimiento y apertura online.
- Ensayo inicial de SERP live con ocho tasks: sólo primera ejecutada; las siete restantes respondieron 40000 y coste cero porque el proveedor exige una task por request. Se conservó evidencia; no se recompró la primera.
- Siete consultas posteriores con `--target pibank.pe` respondieron 40102, sin filas útiles. Se conservan como cobertura fallida/no usable, no prueba autónoma de ranking cero. Tres consultas sin filtro recuperaron SERP completo. No se amplió gasto indiscriminadamente.
- **Coste observado total: US$0,07714**, incluido todo ensayo/recuperación. Registro por request/task en [source-ledger.json](pibank-demand-2026-10-06/source-ledger.json).

Labs usó el carril canónico `pnpm dataforseo`, consumidor `seo`, organización Efeonce de adquisición **EO-ORG-0007**, previamente documentada en el resolver de preventa. Cada request pasó el gate real `enforceSeoRunEntitlement` y tuvo estimación/ceiling CLI; no se provisionó ninguna organización ni se cargó a Pibank. SERP de prospecto sin org está permitido por contrato. La lectura MCP complementaria de entitlement pidió reautenticación; la CLI del operador sí ejecutó con sus guards. No se sorteó el gate.

Metodología oficial: [Keyword Overview](https://docs.dataforseo.com/v3/dataforseo_labs/google/keyword_overview/live/) y [Keyword Suggestions](https://docs.dataforseo.com/v3/dataforseo_labs/google/keyword_suggestions/live/). No se consumió ETV ni se calculó tráfico con una curva ajena de CTR.

## 2. Qué representa el subtotal de adquisición

| Grupo editorial | Representante | Búsquedas/mes estimadas | Uso en modelo |
|---|---|---:|---|
| G01 categoría | cuenta de ahorros | 2.900 | Base; intención amplia, aplicar relevancia |
| G03 comparación | mejor cuenta de ahorros peru | 320 | Base; decisiones de ahorro |
| G04 digital | cuenta de ahorros digital | 210 | Base; separar del ahorro meramente transaccional |
| G05 apertura | abrir cuenta de ahorros | 210 | Base; agrupa apertura/apertura online |
| G06 costos | cuenta de ahorros sin mantenimiento | 50 | Base; condiciones y alternativa |
| G07 rendimiento | cuenta de ahorros con intereses | 210 | Base; agrupa variantes de intereses |
| **Subtotal seleccionado** | **Seis grupos** | **3.900** | **Proxy selectivo, no demanda elegible validada** |
| G02 alto rendimiento | cuenta de ahorros de alto rendimiento | 1.600 | Fuera de default: SERP mezcla Perú y otros países |
| **Subtotal bruto ampliado** | **Siete grupos** | **5.500** | **Sensibilidad con filtro de relevancia explícito** |

Dentro de cada grupo usamos **el máximo volumen de un miembro**, no la suma. Esto es un ajuste editorial conservador para no inflar variantes, no deduplicación demostrada de audiencias. Entre grupos puede existir overlap residual. No afirmar que son 3.900 ahorradores distintos ni que todos están disponibles para Pibank.

El volumen 1.600 del alto rendimiento tiene resultados de República Dominicana, Estados Unidos, Costa Rica y Perú en la captura localizada. Por eso el default se reduce de 5.500 a 3.900, conservando el territorio como expansión a validar. No concluir que Google mide demanda internacional: la mezcla está en la intención/resultados encontrados en el mercado peruano.

## 3. Territorios separados del modelo de adquisición

| Territorio / término | Búsquedas/mes estimadas | Límite |
|---|---:|---|
| `pibank` | 140 | Snapshot actualizado 17-09; último mes agosto, anterior al lanzamiento Perú según reunión. Puede incluir evaluación internacional; no baseline postlaunch |
| `cuenta digital bcp` | 5.400 | Demanda de marca competidora; no sumarla como demanda genérica adquirible |
| `cuenta digital bbva` | 6.600 | Misma limitación |
| `cuenta super tasa interbank` | 1.900 | Misma limitación |
| Cuenta ahorro dólares, grupo | 210 | Producto Pibank previsto; excluir de default actual hasta confirmación |
| Cuenta ahorro/plazo, grupo | 390 | Sustituto con liquidez/condiciones diferentes; no vender plazo como Pibank disponible |
| Qué es una cuenta de ahorro, grupo | 590 | Educación; no asumir conversión igual a consulta transaccional |
| Corriente vs ahorro, grupo | 1.600 | Educación amplia con sinónimos; agrupamiento por máximo |
| Fondo de Seguro de Depósitos | 1.600 | Confianza/servicio; no todos buscan abrir cuenta |
| Qué es TREA | 880 | Educación/explicación; no convertirla automáticamente en captación |

Una ausencia de fila para `pibank peru`, `pibank tasa` u otras variantes no significa volumen cero ni falta de demanda. La base Labs se actualizó principalmente entre el **12 y 17 de septiembre de 2026** y los históricos más recientes devueltos corresponden a **agosto de 2026**. La historia de una marca en lanzamiento exige recalibración posterior; no extrapolar crecimiento 2027.

## 4. Visibilidad actual: panel SERP completo

| Consulta | Observación 06-10-2026 · PE/es/móvil | Lectura operacional |
|---|---|---|
| pibank peru | Primer `pibank.pe`: posición orgánica 5, FAQ. También FAQs posiciones 10/11 y privacidad 13. Redes, Pichincha y Colombia aparecen | Prioridad: identidad Perú, navegación al producto y coherencia de entidad |
| mejor cuenta de ahorros peru | `pibank.pe` no observado en profundidad 20. Aparecen comparadores, Scotiabank, Mibanco, BCP, SBS, Efectibank, Banbif y Falabella | Prioridad: cobertura editorial/autoridad y explicación del producto; no rankings prometidos |
| cuenta de ahorros de alto rendimiento | `pibank.pe` no observado. Resultados mixtos nacionales/extranjeros y documentos viejos | Filtrar intención/país antes de usar sus 1.600 búsquedas como oportunidad |
| abrir cuenta de ahorros online | `pibank.pe` no observado. Redes, medios y entidades de otros países | Cuidar intención local; landing/guía Perú específicas, no volumen internacional atribuible |

Las posiciones usan `rank_group` orgánico; no rank absoluto de todos los módulos. Profundidad 20 no siempre produce 20 filas orgánicas (17/18 en estas capturas). No se midieron ChatGPT, Perplexity, Gemini ni share of voice IA aquí. No inferir AI citations a partir de un SERP o del Grader antiguo Pichincha.

Resultados nominales, URLs y task ids: [serp-observations.json](pibank-demand-2026-10-06/serp-observations.json). Las URLs del proveedor son consultas públicas y enlaces de SERP; no se almacenaron tokens de acceso a demos o credenciales.

## 5. Competencia comercial y editorial: fuentes primarias

Comparar condiciones a un mismo saldo/periodo es más útil que comparar máximos de titulares. Esto es research para propuesta de servicios, no recomendación financiera al ahorrador.

| Actor / fuente oficial | Hecho relevante consultado 06-10 | Implicación para posicionamiento |
|---|---|---|
| [Pibank Cuenta Soles](https://pibank.pe/cuenta-soles-pibank/) | 5% TREA publicado desde primer sol, sin mínimo/mantenimiento; ahorro sin tarjeta ni pagos; calculadora/FAQ existentes | Explicar ahorro dedicado, disponibilidad, fondeo y condiciones. No crear otra calculadora sin evaluar la actual |
| [Interbank Súper Tasa](https://interbank.pe/cuentas/cuentas-ahorro/cuenta-super-tasa) | Escala de saldos; apertura S/10.000; máximo 4,5% desde S/200.000; tabla publica 0,5% para S/10.000–29.999,99 | Contrastar mismo ticket con condiciones revisadas, no máximo contra tasa plana |
| [Scotiabank cuentas](https://www.scotiabank.com.pe/Personas/ahorros/default?cliente=false) | Cuenta Digital para operación y Cuenta Power que anuncia hasta 4,60% TREA soles | Separar tarea transaccional de ahorro; verificar tarifario antes de equivalencia por ticket |
| [BCP abrir cuenta](https://www.viabcp.com/abrir-cuenta) | Varias cuentas según uso; algunas sin intereses, Premio con banda soles 0,25–1,00% | No generalizar a todo BCP; responder cómo complementar banco principal |
| [Efectibank ahorro digital](https://www.efectibank.pe/ahorros/cuenta-de-ahorros/) | 4,5% TREA soles publicado, sin mínimo/mantenimiento; app y tarjeta/pagos | Competencia digital relevante, más allá de grandes bancos; no transferir historia Efectiva a conversiones actuales |
| [Falabella cuentas](https://www.bancofalabella.pe/cuentas) | Ofertas con tareas y condiciones diferentes; promociones requieren fecha y elegibilidad | Excluir campaña agosto expirada; no usar una promesa promocional como precio permanente |

El comparador en SERP y la SBS son competidores de **respuesta**, aunque no sean competidores de producto. Estrategia de autoridad puede buscar aportar información exacta a esos entornos; no garantiza una mención/PR. Las páginas oficiales verifican identidad/producto, no cuotas de mercado ni conversiones.

Pibank pertenece a Banco Pichincha Perú; el modelo nació en España y también opera en Colombia/Estados Unidos según [identidad oficial](https://pibank.pe/quienes-somos/). La muestra de `pichincha.pe` de septiembre no sustituye el dominio nuevo, y experiencias de otros países no son baseline de Perú.

## 6. Traducción a modelo y propuesta

Usar el subtotal 3.900 como input editable y fechado de **universo seleccionado**, con factor de relevancia, cobertura alcanzada y participación de clics explícitos. No usarlo como techo matemático definitivo de toda la estrategia ni como tráfico previsto. Añadir otros grupos sólo cuando se investiguen y quede trazabilidad.

Separar seis mecanismos:

1. Protección de la navegación de marca Perú y representación correcta de producto.
2. Captación no-marca por comparación, condiciones y apertura.
3. Educación para confianza y decisión, con conversiones propias si llegan datos.
4. Mejoras del recorrido desde la visita hacia apertura y primer fondeo.
5. Authority/PR y distribución que pueden generar demanda o asistencia; no contarlas otra vez como SEO puro.
6. Expansión dólares y nuevos productos sólo cuando estén disponibles y documentados.

Para el escenario retrospectivo: las métricas Labs son anteriores al lanzamiento según la reunión y no incluyen embudo banco. Por tanto, un cálculo desde lanzamiento continúa siendo contrafactual ilustrativo. Conserva escenario de referencia y supuestos; no afirmar cuentas históricas perdidas.

La demanda medida puede hacer que la contribución inicial resulte menor que las bandas comerciales imaginadas. El caso gana credibilidad si deja esa escala visible y explica qué combinación de cobertura adicional, conversión y tiempo sería necesaria.

## Artefactos reproducibles

- [Inputs JSON](pibank-demand-2026-10-06/demand-inputs.json): metadata, grupos, keywords, ids, nulos, periodos y procedencia.
- [Inputs CSV](pibank-demand-2026-10-06/demand-inputs.csv): importación a modelo editable.
- [Fuentes y coste](pibank-demand-2026-10-06/source-ledger.json): coste por run, cobertura y fuentes públicas.
- [Panel SERP](pibank-demand-2026-10-06/serp-observations.json): lectura normalizada completa vs errores/no usable.
- [Normalizador](pibank-demand-2026-10-06/normalize-demand.py) y [resumen](pibank-demand-2026-10-06/summarize-evidence.py): regeneración local de derivados desde JSON ya capturados, sin gasto proveedor.

Datos de conversión, CAC real, fondeo, saldo, permanencia y valor financiero continúan `sin dato`. No hay forecast aprobado, escritura CRM, cambio del sitio del banco, envío ni publicación con este research.
