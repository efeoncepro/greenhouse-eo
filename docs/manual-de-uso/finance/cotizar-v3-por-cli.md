# Cotizar con el prototipo V3 por CLI

- Estado: manual del núcleo/snapshot de TASK-2016, conservado como carril ejecutable. El [manual operativo actual](operar-cotizador-v3-con-agentes.md) cubre las extensiones hasta TASK-2022; tarifas operativas e integración canónica pendientes.
- Contratos y motores (conviven): `1.0.0` → `pricing-v3-local/1.0.0`, el que usan los ejemplos de este manual; `1.1.0` → `pricing-v3-local/1.1.0`, que agrega precio acordado, varios ajustes y redondeo comercial ([Contrato 1.1.0](#contrato-110)). Artefacto: `pricing-v3-local-artifact/1`.
- Decisión: [ADR local](../../architecture/GREENHOUSE_PRICING_V3_LOCAL_PROTOTYPE_DECISION_V1.md) y [motor 1.1](../../architecture/GREENHOUSE_PRICING_V3_ENGINE_1_1_COMMERCIAL_ADJUSTMENTS_DECISION_V1.md).
- Alcance: Staffing mensual, núcleo compartido con CLI delgada; no crea Quote en Greenhouse/HubSpot ni aprueba o envía propuestas.

## Flujo para Codex y Claude

1. Buscar el perfil. Si hay variantes, resolver por alcance; no elegir por costo más bajo. Consultor HubSpot estándar/premium son perfiles distintos.
2. Confirmar país del talento, mercado de oferta, moneda, dedicación, modalidad compartida/dedicada, headcount y duración. No inferirlos entre sí.
3. Preparar `{ request, snapshot }` según el [schema ejecutable](../../../src/lib/finance/pricing-v3/schemas.ts), usando el ejemplo como estructura. No copiar sus valores sintéticos como costos comerciales.
4. Validar/calcular. Inspeccionar `result.calculationStatus`, `reviewStatus`, `diagnostics` y código de salida; faltantes no son ceros.
5. Guardar el snapshot interno, explicar o comparar. Exportar borrador comercial solo con cálculo completo dentro de política. La aprobación y emisión siguen otro proceso.

```bash
pnpm --silent pricing:v3 help
pnpm --silent pricing:v3 catalog search --query 'Consultor HubSpot'
pnpm --silent pricing:v3 catalog show --query ECG-027
pnpm --silent pricing:v3 validate --input data/pricing/v3-pilot/scenarios/colombia-chile-design-needs-input.json
```

El catálogo busca candidatos dentro de [parámetros de revisión](../../../data/pricing/v3-pilot/parameters.json). `ambiguous` conserva todas las opciones; `candidate` no equivale a perfil operativo aprobado. Esta CLI interna puede mostrar referencias de costo: no entregar su salida de catálogo a clientes.

## Demostración completa, sin valores comerciales

El [fixture sintético Colombia→Chile](../../../data/pricing/v3-pilot/scenarios/synthetic-co-cl.json) tiene todos los registros para probar las reglas. Monedas, factores, horas, costos y tasas se suministran explícitamente; son ejemplos de prueba.

```bash
pnpm --silent pricing:v3 calculate --input data/pricing/v3-pilot/scenarios/synthetic-co-cl.json --out /tmp/v3-prueba.json
pnpm --silent pricing:v3 explain --input /tmp/v3-prueba.json
pnpm --silent pricing:v3 replay --input /tmp/v3-prueba.json
pnpm --silent pricing:v3 export --input /tmp/v3-prueba.json --out /tmp/v3-prueba.md
pnpm --silent pricing:v3 export --input /tmp/v3-prueba.json --format json --out /tmp/v3-prueba-cliente.json
pnpm --silent pricing:v3 compare --left /tmp/v3-prueba.json --right /tmp/v3-prueba.json
```

Elegir nombres nuevos al repetir: archivos con `wx`, sin sobreescritura, permisos `0600`. `--out` es un artefacto local interno o borrador; no un ID remoto. JSON va a stdout. Un rechazo sale con código 1, deja stdout vacío y escribe en stderr `{ "error": { "code", "message", "option"?, "issues"? }, "binding": false }`: `code` pertenece al [registro cerrado](../../../src/lib/finance/pricing-v3/errors.ts), `message` es un texto fijo, `option` nombra la opción a corregir e `issues` trae `path` y `rule` del documento rechazado; nunca viaja un valor, una ruta de archivo ni el mensaje de un parser. Repetir un `--out` existente devuelve `OUTPUT_EXISTS` con `option: "out"`. Para otra carpeta, invocar `node_modules/.bin/tsx` y el script con rutas absolutas del checkout; las rutas de inputs/outputs siguen el cwd del caller. El catálogo integrado se resuelve respecto del script.

Control independiente del fixture: humano mensual `1000 ×0,5 ×0,8=400`; herramientas/fee/Assurance/operación `100+50+25+25=200`. Precio humano `400 ×1,5 ×1,2=720`, otros `200 ×1,5=300`. Tres meses más setup `100 ×1,5`: 3210 USD; descuento 321, neto 2889, costo normalizado 1900 y margen 989. Caja atribuida 2800 porque la licencia anual se paga al inicio. Son números sintéticos; no una tarifa Colombia→Chile. Impuestos pendientes producen `tax=null`, `grandTotal=null`.

## Prototipar con el antecedente histórico

El [input del diseñador senior al 50%](../../../data/pricing/v3-pilot/scenarios/colombia-chile-design-historical-hypothesis.json)
conecta importes históricos y placeholders explícitos, según la [ficha y sus supuestos](../../documentation/finance/cotizador-v3-piloto-colombia-chile.md#simulación-histórica-ejecutable--avance-2026-10-09).
Está separado del input comercial incompleto; no hidrata el catálogo automáticamente.

```bash
pnpm --silent pricing:v3 calculate --input data/pricing/v3-pilot/scenarios/colombia-chile-design-historical-hypothesis.json
pnpm --silent pricing:v3 explain --input data/pricing/v3-pilot/economics/historical-simulation/shared-half-three.artifact.json
pnpm --silent pricing:v3 replay --input data/pricing/v3-pilot/economics/historical-simulation/shared-half-three.artifact.json
pnpm --silent pricing:v3 compare --left data/pricing/v3-pilot/economics/historical-simulation/shared-half-three.artifact.json --right data/pricing/v3-pilot/economics/historical-simulation/shared-full-three.artifact.json
```

Cálculo/explain/replay devuelven código 3 porque conservan `requires_review`, aunque la aritmética
está completa. Resultado base: USD 1.064,70/mes + USD 130 de setup, antes de impuestos, dentro
del perímetro hipotético documentado. Export sigue bloqueado. Para ajustes, editar una copia
del input y declarar la hipótesis en un nuevo manifest; guardar en un `--out` nuevo. No editar
artefactos sellados, ni convertir los supuestos a `confirmed` para superar revisión.
La fecha de source es ventana del ensayo; extenderla no confirma vigencia de costos.

## Prueba multirol Pibank

La [ficha Pibank](../../documentation/finance/cotizador-v3-prueba-pibank.md) vincula el alcance
vigente, países elegidos por el operador y provisiones históricas. El [input](../../../data/pricing/v3-pilot/scenarios/pibank-gradual-peru-chile.json)
prueba capacidad media anual con target_margin 40%, sin cambiar la propuesta existente.

```bash
pnpm --silent pricing:v3 calculate --input data/pricing/v3-pilot/scenarios/pibank-gradual-peru-chile.json
pnpm --silent pricing:v3 replay --input data/pricing/v3-pilot/economics/pibank/margin-40-hypothesis.artifact.json
```

Código 3 significa cálculo completo con revisión obligatoria. La variante cost-reconciliation
con markup 0 es un control de costo, no oferta. Promedios de FTE/precio no sustituyen el
calendario de proyectos, disponibilidad o facturación; export continúa bloqueado.

## Datos y reglas ejecutadas

- Solicitud estricta: campos desconocidos, números monetarios en lugar de cadenas, fechas inválidas y dedicaciones conflictivas son errores. Decimal exacto, precisión 80, redondeo HALF_UP al final de cada línea.
- Snapshot versionado: perfiles y variantes, costos humanos mensuales con cobertura/país/vigencia, políticas de asignación/precio, factores de talento/mercado, recursos, registro de monedas y FX dirigidos. No carga Excel, DB o variables de entorno.
- Costo `specific`: coincide con país del talento y no recibe otro factor salarial. `reference_adjusted`: exige factor explícito país de referencia→país talento. Mercado ajusta solo el precio humano. La conversión es independiente; no deriva FX inverso o cruzado automáticamente.
- Asignación `shared`: máximo entre FTE solicitado y mínimo facturable explícito. `dedicated`: FTE comprometido explícito, suficiente para la dedicación solicitada. Horas usan `hoursPerFteMonth` del snapshot; no adopta 180 horas históricas por default.
- Recursos: licencias, fee genérico, Assurance, operación y setup con costo/unidad/cobertura. `quantity` es entero positivo; `share` es fracción explícita de atribución. No escala por FTE automáticamente. Usuario/equipo/cuenta se identifica con `scopeRef`, sin nombres personales. Licencias de usuarios distintos no se deduplican por nombre.
- `covers` evita duplicaciones. En este contrato local, costo humano admite solo coberturas `human_*`; si un costo cargado mezcla fees/licencias exige descomponerlos como recursos (`NON_HUMAN_LOADED_COST_REQUIRES_SPLIT`), para no prorratearlos ni aplicarles un factor humano por accidente. Asignaciones del mismo scope/coverage/periodo no pueden sumar shares mayores que uno. Coberturas requeridas se revisan por periodo; una exclusión requiere motivo, y no puede coexistir con costo para la misma cobertura.
- Una licencia anual normaliza costo mensual `/12`; `cashTiming=start` reconoce compromiso atribuido completo en el primer periodo activo. No implica cancelar la suscripción al terminar un contrato corto. Setup `unit=once` aparece una vez, separado de mensualidad.
- `periodIds` permite recursos variables en meses explícitos. Si el neto mensual varía, `uniformMonthlyNet=null`. Costos humanos/políticas permanecen constantes en el horizonte de este contrato local; cambios salariales por mes son una extensión pendiente.
- Política de perfil/tier: `markup` o `target_margin`, con base `all_costs` o `human`. Mercado no recarga las licencias. En el contrato 1.0.0 se admite un único descuento por tasa, identificado y con líneas elegibles, que se reparte por mayor resto; empates por ID estable. El contrato 1.1.0 admite hasta 10 ajustes sobre filas distintas y un neto acordado ([Contrato 1.1.0](#contrato-110)). En ninguno hay ajustes encadenados/cíclicos ni fórmulas arbitrarias.
- Margen final se calcula sobre el neto final (después de redondeo comercial, descuento y recargo) con costos completos. Piso incumplido devuelve revisión; ningún contrato sube un precio para corregirlo. Costos estimados o modo histórico exigen revisión; costos/FX vencidos o pendientes requieren datos.
- Impuestos: pendiente, no aplica con fundamento, o tasa exclusiva con fuente/política. No infiere impuestos por país ni ejecuta cálculo fiscal externo.

Los valores internos de componentes permanecen en `calculationCurrency` sin redondeo intermedio; líneas/totales se presentan en `outputCurrency`. `trace.outputFx` conserva la conversión. `cashCommitment` total suma obligaciones atribuibles; no es caja libre, factura del proveedor completa ni costo normalizado adicional para sumar.

### Contrato 1.1.0

Quien llama declara la versión del contrato en `request.schemaVersion` y en `snapshot.schemaVersion`, la misma en ambos; el motor no la infiere ni la actualiza, y firma el resultado con `pricing-v3-local/1.1.0`. Con `1.0.0` todo lo anterior queda igual, byte a byte, y un campo del contrato nuevo devuelve `invalid` con `INVALID_INPUT`. Versiones distintas en request y snapshot devuelven `invalid` con `UNSUPPORTED_SCHEMA`. Con `1.1.0`:

- `request.adjustments` admite hasta 10 ajustes de dos clases. `discount`: rebaja por tasa sobre las filas mensuales y de implementación de sus líneas, como antes. `agreed_net`: `{ adjustmentId, kind, amount, billing, lineIds, reason }`, donde `amount` es el neto pactado por periodo, en la moneda de salida, para las filas de clase `billing` (`monthly` o `setup`) de esas líneas; el motor deriva `discount` si el pactado es menor que el precio o `uplift` si es mayor, y el neto de esas filas es exactamente `amount`.
- Cada fila facturable recibe a lo más un ajuste: dos que apunten a la misma fila son `OVERLAPPING_ADJUSTMENTS`. También dejan el resultado `invalid` (exit 2): `INVALID_AGREED_AMOUNT` (más decimales que la moneda), `AGREED_NET_WITHOUT_BASE` (sin filas a las que aplicarse) y `DUPLICATE_ID`. `reason` sigue siendo obligatorio y ningún ajuste aprueba nada.
- `snapshot.priceRounding` es opcional: `{ "multiple": "10000", "source": { … } }`, en la moneda de salida. Cada fila facturable con precio mayor que cero se sube al múltiplo siguiente antes de los ajustes; nunca se redondea hacia abajo, y una fila que cumplía su `minimumMargin` antes de redondear lo sigue cumpliendo. Un `multiple` que no sea múltiplo entero de la unidad mínima de la moneda es `INVALID_PRICE_ROUNDING`.
- Resultado, por fila y en totales: `undiscountedPrice` (ya incluye el redondeo), `roundingAdjustment`, `discount`, `uplift` y `net`, con `net = undiscountedPrice + uplift − discount`. En un resultado 1.0.0 `roundingAdjustment` y `uplift` no existen. La proyección cliente muestra sólo el neto final.

En los carriles de catálogo y composición la versión no se escribe a mano: la resolución emite 1.1.0 sólo cuando el brief trae un neto acordado o más de un ajuste, o el catálogo tiene una regla de redondeo vigente para la moneda de salida; en cualquier otro caso emite 1.0.0. Procedimiento para el operador: [Registrar el precio acordado](operar-cotizador-v3-con-agentes.md#registrar-el-precio-acordado) y [Cotizar en otra moneda](operar-cotizador-v3-con-agentes.md#cotizar-en-otra-moneda).

## Estados y reproducción

| Resultado                                                        | Exit | Interpretación                                                       |
| ---------------------------------------------------------------- | ---: | -------------------------------------------------------------------- |
| `calculated / within_policy`                                     |    0 | Cálculo completo; puede preparar borrador local, sin aprobarlo       |
| `needs_input` o `invalid`                                        |    2 | Ver diagnósticos; sin precio/margen total ni líneas facturables      |
| `calculated / requires_review`                                   |    3 | Precio calculado retenido para revisión interna                      |
| Rechazo: argumentos, archivos, conflicto o exportación bloqueada |    1 | stdout vacío; `error.code` en stderr; no usar como resultado exitoso |

Códigos de rechazo y su arreglo: [tabla del manual operativo](operar-cotizador-v3-con-agentes.md#qué-hacer-con-cada-error). En este carril, una solicitud `{ request, snapshot }` que no cumple el schema no es un rechazo: `calculate`/`validate` devuelven `invalid` con el diagnóstico `INVALID_INPUT` y código 2. `SCHEMA_INVALID` corresponde a un catálogo o una demanda de composición que no cumple su schema. `ADAPTER_FAILURE` ya no significa «revisa tus argumentos»: es una falla que la herramienta no clasificó y se reporta a quien la mantiene. Exportar un cálculo en revisión devuelve `EXPORT_REQUIRES_COMPLETE_WITHIN_POLICY`.

`validate` evalúa contrato y readiness usando el mismo núcleo, sin guardar archivo. `calculate --out` guarda también resultados incompletos semánticamente válidos para explicar los pendientes. Una entrada que no cumple el schema no genera artefacto. `explain` y `replay` verifican hash/versión/contenido y recalculan con el motor que firmó el artefacto (registro cerrado: `pricing-v3-local/1.0.0` y `pricing-v3-local/1.1.0`), sin catálogo actual. Una versión fuera del registro o una modificación devuelve `REPLAY_MISMATCH`. El timestamp queda fuera del digest.

`compare` es interno: muestra ambas evidencias, cambios de alcance/configuración/moneda y diferencias de totales cuando moneda y resultados completos permiten aritmética. No resta monedas diferentes. Comparar alcances distintos no afirma equivalencia comercial.

La proyección cliente usa allowlist. Excluye costos, márgenes, factores, fuentes privadas, justificaciones internas de exclusión, políticas, traces y diagnósticos; mantiene alcance, calendario/neto e impuestos pendientes. El ejemplo conserva una advertencia de datos sintéticos. No es permiso para exponer artefactos internos; futuras audiencias se autorizan en el servidor canónico, nunca con un flag del caller.

## Primer caso comercial y límites abiertos

El [caso diseñador senior compartido Colombia→Chile](../../../data/pricing/v3-pilot/scenarios/colombia-chile-design-needs-input.json) prioriza la combinación confirmada por el operador. El operador confirmó diseñador senior al 50%; headcount/plazo/modalidad/moneda siguen como supuestos de análisis. [Ficha y ledger de economics](../../documentation/finance/cotizador-v3-piloto-colombia-chile.md) conservan fuentes pendientes, encaje creativo y sensibilidad, sin tarifa aprobada. Devuelve `needs_input`: costo colombiano vigente y sus coberturas, capacidad, kits, fees/Assurance/operación, política de precio/mercado y FX faltan. No localiza el histórico del Excel ni aplica tasas sintéticas.

El núcleo de snapshot descrito aquí no implementa reader del catálogo canónico, autorización remota, cambios salariales por periodo, overrides en `request`, consumo AI medido, fees porcentuales sobre ingresos, setups amortizados ni ajustes encadenados. El redondeo comercial y el neto acordado existen sólo bajo el [contrato 1.1.0](#contrato-110). El flujo posterior `compose` sí agrega composición de costos para roles o unidad de servicio, con selección de tools y presupuesto IA; no certifica SOW o delivery comercial de servicios. Esos campos no se aceptan silenciosamente. [Contrato objetivo y convergencia](../../documentation/finance/cotizador-v3-contrato-y-validacion.md) conserva esas extensiones y los gates productivos; [parámetros piloto](../../documentation/finance/cotizador-v3-parametros-piloto.md) conserva decisiones económicas pendientes.

Verificación: `pnpm pricing:v3:test`, `pnpm pricing:workbook:test`, lint focal y `pnpm typecheck`. Evidencia y límite del lint global en el [cierre local](../../audits/commercial/2026-10-09-pricing-v3-local-prototype.md).

## Selección desde catálogo y mantenimiento

[Recorrido para agentes y actualización versionada](catalogo-v3-seleccion-y-actualizacion.md): `catalog`, `prepare`, `quote`, explicación/replay y preview/apply. Este flujo usa catálogos locales, sin montar snapshots a mano ni incorporar provisiones de un expediente. Los comandos de snapshot anteriores siguen disponibles.
