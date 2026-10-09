# Piloto V3 — diseñador senior al 50%, Colombia → Chile

Fecha: 2026-10-09. Dueños: Commercial / Finance / People / Creative Operations.
Unidad: [TASK-2017](../../tasks/in-progress/TASK-2017-pricing-v3-colombia-chile-economics.md).
Estado: ficha y simulación histórica ejecutable preparadas; validación económica parcial. Precio comercial: pendiente.

## Alcance confirmado y supuestos

El operador confirmó diseñador senior al 50%, talento en Colombia y mercado Chile.
También confirmó que sólo dispone del antecedente del Excel. Eso valida la elección del
caso; no acredita un costo colombiano actual ni aprueba su tarifa.

| Dimensión | Valor del input | Estado |
|---|---|---|
| Perfil | ECG-002, diseñador visual senior | Confirmado para piloto |
| Dedicación solicitada | 0,5 FTE | Confirmada; horas y mínimo facturable pendientes |
| País del talento / mercado | Colombia / Chile | Confirmados, roles separados |
| Personas | 1 | Supuesto por confirmar |
| Modalidad | Shared | Supuesto; 50% no determina por sí solo el compromiso de costo |
| Plazo | 3 meses | Horizonte de análisis, sin mínimo contractual aprobado |
| Moneda de cálculo / salida | USD / CLP | Supuestos; fuente FX pendiente |
| Descuentos | Ninguno en la solicitud | No constituye política de descuentos |
| Impuestos | Pendientes | No se asume cero ni precio final con impuestos |

El [input ejecutable](../../../data/pricing/v3-pilot/scenarios/colombia-chile-design-needs-input.json)
conserva `cost=null`. El [ledger para agentes](../../../data/pricing/v3-pilot/economics/colombia-chile-review.json)
registra cada decisión, su dueño, evidencia requerida y destinos JSON Pointer del input.
No duplica importes financieros ni es un nuevo catálogo operativo. La CLI recibe el input,
no el ledger; sus referencias hacen revisable el llenado, sin hidratación automática.

## Lo que aporta el Excel

El registro histórico ECG-002 conserva USD 950 de salario base y USD 360 de bonos:
subtotal humano USD 1.310 por mes. El fee histórico genérico es USD 49 por mes,
separado del humano; el total registrado era USD 1.359. País, vigencia y cobertura
laboral no están confirmados. El cero histórico de cargas requiere validación.
[Componentes y procedencia](../../../data/pricing/v3-pilot/parameters.json).

El control REF-01 reproduce USD 883,35 mensuales y USD 2.650,05 por tres meses
con la fórmula anterior. Esa fórmula también reducía el fee al 50% y usaba el markup
histórico del 30%; no incorpora todas las capas V3. Por eso **no es el precio del piloto**.
Como prueba de comportamiento, separar USD 655 de humano al 50% y USD 49 de fee
completo produce USD 704 antes de herramientas, Assurance y otros costos. Tampoco es
un costo colombiano validado ni una regla de asignación aprobada.
[Control histórico y probe](../../../data/pricing/v3-pilot/reference-calculations.json).

Usaremos estos antecedentes para detectar diferencias y revisar componentes. No se asigna
Colombia o Estados Unidos al costo por su moneda y no se recicla la tasa histórica de FX.
Para una simulación basada en estimaciones primero hace falta declarar y sustentar el país
base y la localización; cambiar sólo la etiqueta del histórico no completa el snapshot.

## Capas que debe completar el snapshot

| Capa | Decisión y evidencia necesaria | Dueño |
|---|---|---|
| Costo humano | Mensual, moneda, fuente, vigencia, país y coberturas: honorarios/salario, bonos, cargas y beneficios aplicables | People + Finance |
| Capacidad | Horas por FTE, mínimo facturable shared y compromiso dedicated; viabilidad de disponer 50% | Creative Operations |
| Tools | Kit realmente necesario, precio/entitlement vigente y atribución por persona/equipo/cuenta | Creative Operations + Finance |
| Fee de plataforma | Monto y unidad genéricos, proveedor/modalidad y quién lo absorbe | People + Finance |
| Talent Assurance | Formación, seguimiento, reemplazo/ramp-up, continuidad y riesgo de bench; sin duplicar otras capas | People + Creative Operations + Finance |
| Operación | Dirección, QA, coordinación, infraestructura y seguimiento atribuibles | Creative Operations + Finance |
| Setup | Onboarding, accesos y contexto inicial, cobro único separado o no aplicación fundamentada | Creative Operations + Finance |
| Tier/precio | Tier por criterio; markup o margen objetivo, base y piso; aprobación independiente del histórico | Commercial + Finance |
| Mercado | Ajuste Chile del precio humano y evidencia de disposición de pago; no altera licencias | Commercial + Finance |
| FX/fiscal/caja | Pares dirigidos con fuente/vigencia, tratamiento fiscal, entidad, pago y compromisos | Finance + Legal |

Para costo localizado `specific: CO`, no agregar factor salarial. Para `reference_adjusted`,
identificar país de referencia y factor hacia Colombia. El mercado Chile opera sobre precio
humano; conversión monetaria, costos de recursos y localización son decisiones separadas.

En el kit `visual-design-core`, suite de diseño, colaboración/documentación y asistencia AI
son candidatos propuestos; stock, generación de imágenes, review y prototipado dependen
del alcance. Sus divisiones históricas por usuarios no acreditan licencias compartibles.
Cada recurso declara `quantity`, `share`, `scope`, `scopeRef`, unidad y `cashTiming`.
Un usuario al 50% puede requerir una licencia completa. Una anualidad tiene costo mensual
normalizado y compromiso de caja separado; contrato corto no cancela automáticamente ese costo.

La cobertura `setup` debe añadirse a `requiredCoverages` si se requiere; dejar recursos vacíos
no equivale a costo cero. Tampoco se usa `notApplicable` para ocultar datos sin confirmar.
Los importes cero que sean válidos llevan fundamento y fuente.

## Encaje de la oferta creativa

La oferta vigente [Embedded Creative Pod](../../services/creative-services/EFEONCE_EMBEDDED_CREATIVE_POD_OPERATING_MODEL_V1.md)
vende capacidad con gobierno, QA, integración y continuidad. La prioridad/contexto/aprobación
del cliente no sustituye la dirección operativa de Efeonce. Costear la disponibilidad de un
diseñador no certifica una oferta completa de pod.

El kernel local acepta únicamente `deliveryModel: staffing`. Aquí sirve para probar los
componentes económicos del perfil. Antes de emitir una propuesta creativa hay que validar
alcance y accountability y representar sus costos completos. No se cambia silenciosamente
el enum a managed delivery ni se agrega un SKU canónico. Si el alcance necesita servicios
compuestos, esa extensión conserva su propia unidad de implementación.
Los [guardrails de Talent Assurance](../../business-models/EFEONCE_TALENT_ASSURANCE_ECONOMIC_GUARDRAILS_V1.md)
no aprueban importes, porcentajes o pisos por sí solos.

## Sensibilidad preparada

El ledger contiene patches de solicitud, sin fórmulas de precios alternativas. Se aplican
sobre copias del mismo input revisado y se ejecuta cada copia con el núcleo V3.

| Caso | Dedicación / modalidad | Plazo | Qué permite revisar |
|---|---|---|---|
| Base | 50%, shared | 3 meses | Caso confirmado en perfil/dedicación/países |
| Capacidad completa | 100%, shared | 3 meses | Diferencia de humano sin asumir duplicación de todas las licencias/fees |
| Capacidad reservada | 50%, dedicated | 3 meses | Compromiso real y mínimo de costo, con política dedicated por definir |
| Mayor plazo | 50%, shared | 6 meses | Peso del setup, compromisos de caja y cobertura del horizonte |

Son hipótesis de análisis; 100%, dedicated y seis meses no están aprobados como términos.
Una solicitud dedicated requiere además su política; no se elige 0,5 o 1 FTE facturable por
conveniencia. El setup se mantiene separado y no se amortiza silenciosamente. No se preparan
porcentajes de descuento arbitrarios. Los cuatro inputs derivados se validaron con el núcleo y conservan `needs_input`; todavía no hay importes de sensibilidad.

## Simulación histórica ejecutable — avance 2026-10-09

El operador autorizó continuar el prototipo con los valores del Excel como hipótesis.
Se preparó un [input histórico separado](../../../data/pricing/v3-pilot/scenarios/colombia-chile-design-historical-hypothesis.json),
con `mode=historical` y todas las fuentes `estimated`. El input del piloto comercial conserva
`cost=null` y su hash anterior. [Supuestos y procedencia](../../../data/pricing/v3-pilot/economics/historical-simulation/assumptions.json)
y [resultados/replay/comparaciones](../../../data/pricing/v3-pilot/economics/historical-simulation/results.json).

Los USD 1.310 se tratan **como si fueran el costo colombiano** sólo para este ensayo.
Eso no determina el país real del histórico ni acredita cargas laborales completas. El factor
Chile se fija en 1 para aislar costos; no representa disposición de pago. La ventana de fechas
en `source` es la fecha de evaluación del ensayo, no una vigencia acreditada del Excel.

| Componente | Costo mensual USD en el ensayo | Procedencia / hipótesis |
|---|---:|---|
| Humano al 50% | 655,00 | Subtotal histórico 1.310 × 0,5, localización CO supuesta |
| Herramientas | 65,00 | Adobe 20 + Notion 24 + Microsoft 365 16 + ChatGPT 5, atribuciones históricas |
| Fee genérico | 49,00 | Histórico; atribución completa por persona supuesta |
| Talent Assurance | 25,00 | Importe del fixture sintético, sólo para ejercitar el cálculo |
| Gestión / operación | 25,00 | Importe del fixture sintético, sólo para ejercitar el cálculo |
| **Costo mensual modelado** | **819,00** | Perímetro del ensayo; no loaded cost comercial completo |

Onboarding: USD 100 de costo único del fixture sintético. Se aplica el markup histórico
30% sobre costos modelados: mensualidad USD 1.064,70 y setup USD 130,00. Tres meses:
USD 3.324,10 netos, costo modelado USD 2.557,00 y margen del perímetro USD 767,10
(23,08% sobre venta). Markup 30% no equivale a margen 30%.

El kit usa importes **ya atribuidos por el Excel**, no precios de licencia por persona
verificados. Los divisores históricos distinguen proyectos, usuarios y clientes: el input no
los convierte en permiso para compartir credenciales. Mantener esos USD 65 constantes al
variar dedicación también es una hipótesis explícita. Hay que sustituir esas atribuciones por
planes/unidades/asignaciones reales antes de cotizar.

| Escenario del ensayo | Mensual USD | Setup único USD | Neto del plazo USD |
|---|---:|---:|---:|
| 50% shared, 3 meses | 1.064,70 | 130,00 | 3.324,10 |
| 100% shared, 3 meses | 1.916,20 | 130,00 | 5.878,60 |
| 50% solicitado, dedicated con 1 FTE comprometido, 3 meses | 1.916,20 | 130,00 | 5.878,60 |
| 50% shared, 6 meses | 1.064,70 | 130,00 | 6.518,20 |

El caso dedicated prueba una política hipotética de reserva completa; no decide que toda
venta al 50% deba cobrarse así. Los tres meses y los seis meses siguen como horizontes de ensayo.
Los resultados excluyen impuestos, cargas adicionales no acreditadas y costos reales aún sin
medir; Assurance/gestión/setup son placeholders numéricos de prueba, no presupuestos aprobados.

La variante CLP aplica **1.000 CLP/USD**, referencia histórica de 2025-11-09, como hipótesis
ilustrativa: CLP 1.064.700 mensuales, CLP 130.000 de setup y CLP 3.324.100 netos por tres meses.
No es conversión con una tasa actual. `compare` identifica las monedas diferentes y no resta
USD contra CLP. Los artefactos conservan los inputs de cada caso para replay.

La diferencia respecto de USD 883,35 del control anterior proviene de mantener fee completo,
conectar tools y sumar los costos de prueba de Assurance/gestión. Diferencia mensual:
USD 181,35. También se agrega setup separado. Ninguna de las dos cifras es una tarifa vigente.

Verificado: cinco cálculos `calculated/requires_review`, código 3, replay de los cinco,
cuatro comparaciones, rechazo de export para los cinco sin crear archivos y control decimal
independiente del caso base. No se modificó el núcleo, el catálogo operativo o el input comercial.
Los campos de costo/política pendientes de la ficha y el ledger siguen abiertos.

## Uso por agentes y verificación

1. Leer el ledger; comprobar hash del input y selectores `design`/`ECG-002` antes de usar sus bindings.
2. Obtener evidencia de cada dueño. Registrar costo/unidad/localización/coberturas y `source`
   con referencia, vigencia y estado. `estimated` permite revisión; no habilita export comercial.
3. Completar una copia del input para cada caso, con ID/versión nuevos; actualizar revisión
   si se cambia el input base. El ledger de revisión no se pasa como argumento de cálculo.
4. Ejecutar validar/calcular y guardar un artefacto nuevo; revisar faltantes, neto, margen,
   caja y estado. Usar `explain`, `replay` y `compare` según el [manual](../../manual-de-uso/finance/cotizar-v3-por-cli.md).
5. Sólo con economics completo dentro de política y alcance revisado, preparar borrador;
   aprobación y emisión siguen el proceso comercial.

```bash
pnpm --silent pricing:v3 validate --input data/pricing/v3-pilot/scenarios/colombia-chile-design-needs-input.json
pnpm --silent pricing:v3 replay --input data/pricing/v3-pilot/economics/colombia-chile-artifact.json
```

Verificación local de esta preparación: cálculo/validación devuelve `needs_input`, código 2,
`totals=null` y ninguna línea calculada. Replay verifica el mismo contenido, también código 2
por su estado incompleto. Export rechaza con `EXPORT_REQUIRES_COMPLETE_WITHIN_POLICY`, código 1,
sin crear archivo. [Readiness observado](../../../data/pricing/v3-pilot/economics/colombia-chile-readiness.json)
y [artefacto interno](../../../data/pricing/v3-pilot/economics/colombia-chile-artifact.json).

Los cuatro diagnósticos iniciales (FX, mercado, costo y política) no agotan los pendientes:
la política de asignación ausente corta la evaluación de esa línea. El ledger también cubre
herramientas, fee, Assurance, operación y setup, que deben revisarse antes de volver a calcular.

Próximo avance: ajustar los supuestos en el input histórico para seguir prototipando; para promoción comercial, conseguir costo colombiano con coberturas y elegir atribuciones/capacidad,
luego validar política comercial y comparar los casos. La fuente actual disponible sigue
siendo el Excel histórico; no hay costo salarial, tipo de cambio o precio vigente verificado.
