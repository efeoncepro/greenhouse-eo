# Cotizar con el prototipo V3 por CLI

- Estado: prototipo local ejecutable de TASK-2016; tarifas operativas e integración canónica pendientes.
- Motor: `pricing-v3-local/1.0.0`. Contrato: `1.0.0`. Artefacto: `pricing-v3-local-artifact/1`.
- Decisión: [ADR local](../../architecture/GREENHOUSE_PRICING_V3_LOCAL_PROTOTYPE_DECISION_V1.md).
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

Elegir nombres nuevos al repetir: archivos con `wx`, sin sobreescritura, permisos `0600`. `--out` es un artefacto local interno o borrador; no un ID remoto. JSON va a stdout; errores técnicos sanitizados a stderr. Para otra carpeta, invocar `node_modules/.bin/tsx` y el script con rutas absolutas del checkout; las rutas de inputs/outputs siguen el cwd del caller. El catálogo integrado se resuelve respecto del script.

Control independiente del fixture: humano mensual `1000 ×0,5 ×0,8=400`; herramientas/fee/Assurance/operación `100+50+25+25=200`. Precio humano `400 ×1,5 ×1,2=720`, otros `200 ×1,5=300`. Tres meses más setup `100 ×1,5`: 3210 USD; descuento 321, neto 2889, costo normalizado 1900 y margen 989. Caja atribuida 2800 porque la licencia anual se paga al inicio. Son números sintéticos; no una tarifa Colombia→Chile. Impuestos pendientes producen `tax=null`, `grandTotal=null`.

## Datos y reglas ejecutadas

- Solicitud estricta: campos desconocidos, números monetarios en lugar de cadenas, fechas inválidas y dedicaciones conflictivas son errores. Decimal exacto, precisión 80, redondeo HALF_UP al final de cada línea.
- Snapshot versionado: perfiles y variantes, costos humanos mensuales con cobertura/país/vigencia, políticas de asignación/precio, factores de talento/mercado, recursos, registro de monedas y FX dirigidos. No carga Excel, DB o variables de entorno.
- Costo `specific`: coincide con país del talento y no recibe otro factor salarial. `reference_adjusted`: exige factor explícito país de referencia→país talento. Mercado ajusta solo el precio humano. La conversión es independiente; no deriva FX inverso o cruzado automáticamente.
- Asignación `shared`: máximo entre FTE solicitado y mínimo facturable explícito. `dedicated`: FTE comprometido explícito, suficiente para la dedicación solicitada. Horas usan `hoursPerFteMonth` del snapshot; no adopta 180 horas históricas por default.
- Recursos: licencias, fee genérico, Assurance, operación y setup con costo/unidad/cobertura. `quantity` es entero positivo; `share` es fracción explícita de atribución. No escala por FTE automáticamente. Usuario/equipo/cuenta se identifica con `scopeRef`, sin nombres personales. Licencias de usuarios distintos no se deduplican por nombre.
- `covers` evita duplicaciones. En este contrato local, costo humano admite solo coberturas `human_*`; si un costo cargado mezcla fees/licencias exige descomponerlos como recursos (`NON_HUMAN_LOADED_COST_REQUIRES_SPLIT`), para no prorratearlos ni aplicarles un factor humano por accidente. Asignaciones del mismo scope/coverage/periodo no pueden sumar shares mayores que uno. Coberturas requeridas se revisan por periodo; una exclusión requiere motivo, y no puede coexistir con costo para la misma cobertura.
- Una licencia anual normaliza costo mensual `/12`; `cashTiming=start` reconoce compromiso atribuido completo en el primer periodo activo. No implica cancelar la suscripción al terminar un contrato corto. Setup `unit=once` aparece una vez, separado de mensualidad.
- `periodIds` permite recursos variables en meses explícitos. Si el neto mensual varía, `uniformMonthlyNet=null`. Costos humanos/políticas permanecen constantes en el horizonte de este contrato local; cambios salariales por mes son una extensión pendiente.
- Política de perfil/tier: `markup` o `target_margin`, con base `all_costs` o `human`. Mercado no recarga las licencias. Un descuento global, identificado y con líneas elegibles, se reparte por mayor resto; empates por ID estable. No se admiten ajustes múltiples/cíclicos ni fórmulas arbitrarias.
- Margen final se calcula después del descuento con costos completos. Piso incumplido devuelve revisión, sin elevar precios automáticamente. Costos estimados o modo histórico exigen revisión; costos/FX vencidos o pendientes requieren datos.
- Impuestos: pendiente, no aplica con fundamento, o tasa exclusiva con fuente/política. No infiere impuestos por país ni ejecuta cálculo fiscal externo.

Los valores internos de componentes permanecen en `calculationCurrency` sin redondeo intermedio; líneas/totales se presentan en `outputCurrency`. `trace.outputFx` conserva la conversión. `cashCommitment` total suma obligaciones atribuibles; no es caja libre, factura del proveedor completa ni costo normalizado adicional para sumar.

## Estados y reproducción

| Resultado | Exit | Interpretación |
| --- | ---: | --- |
| `calculated / within_policy` | 0 | Cálculo completo; puede preparar borrador local, sin aprobarlo |
| `needs_input` o `invalid` | 2 | Ver diagnósticos; sin precio/margen total ni líneas facturables |
| `calculated / requires_review` | 3 | Precio calculado retenido para revisión interna |
| Fallo técnico/adaptador/exportación bloqueada | 1 | stderr sanitizado; no usar como resultado exitoso |

`validate` evalúa contrato y readiness usando el mismo núcleo, sin guardar archivo. `calculate --out` guarda también resultados incompletos semánticamente válidos para explicar los pendientes. Una entrada que no cumple el schema no genera artefacto. `explain` y `replay` verifican hash/versión/contenido y recalculan con el motor exacto disponible, sin catálogo actual. Una versión no soportada o una modificación devuelve `REPLAY_MISMATCH`. El timestamp queda fuera del digest.

`compare` es interno: muestra ambas evidencias, cambios de alcance/configuración/moneda y diferencias de totales cuando moneda y resultados completos permiten aritmética. No resta monedas diferentes. Comparar alcances distintos no afirma equivalencia comercial.

La proyección cliente usa allowlist. Excluye costos, márgenes, factores, fuentes privadas, justificaciones internas de exclusión, políticas, traces y diagnósticos; mantiene alcance, calendario/neto e impuestos pendientes. El ejemplo conserva una advertencia de datos sintéticos. No es permiso para exponer artefactos internos; futuras audiencias se autorizan en el servidor canónico, nunca con un flag del caller.

## Primer caso comercial y límites abiertos

El [caso diseñador senior compartido Colombia→Chile](../../../data/pricing/v3-pilot/scenarios/colombia-chile-design-needs-input.json) prioriza la combinación confirmada por el operador. El perfil/dedicación/duración son un escenario editable de validación, no un pedido comercial aprobado. Devuelve `needs_input`: costo colombiano vigente y sus coberturas, capacidad, kits, fees/Assurance/operación, política de precio/mercado y FX faltan. No localiza el histórico del Excel ni aplica tasas sintéticas.

Esta vertical no implementa aún reader del catálogo canónico, autorización remota, cambios salariales por periodo, overrides en `request`, consumo AI medido, fees porcentuales sobre ingresos, rounding comercial adicional, setups amortizados, ajustes encadenados ni servicios compuestos. Esos campos no se aceptan silenciosamente. [Contrato objetivo y convergencia](../../documentation/finance/cotizador-v3-contrato-y-validacion.md) conserva esas extensiones y los gates productivos; [parámetros piloto](../../documentation/finance/cotizador-v3-parametros-piloto.md) conserva decisiones económicas pendientes.

Verificación: `pnpm pricing:v3:test`, `pnpm pricing:workbook:test`, lint focal y `pnpm typecheck`. Evidencia y límite del lint global en el [cierre local](../../audits/commercial/2026-10-09-pricing-v3-local-prototype.md).
