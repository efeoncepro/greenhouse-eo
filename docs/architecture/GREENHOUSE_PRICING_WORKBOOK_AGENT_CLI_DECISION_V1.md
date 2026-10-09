# Greenhouse Pricing Workbook Agent CLI Decision V1

- Status: `Accepted`
- Date: `2026-10-09`
- Owner: `Commercial / Finance / Agent tooling`
- Scope: `Excel histórico de pricing; extracción y consulta local para agentes`
- Reversibility: `two-way`
- Confidence: `high`
- Validated as of: `2026-10-09`

## Context

El operador solicitó extraer su Excel a una superficie accesible para agentes. El libro mezcla
supuestos, fórmulas, precios y reglas manuales. Sus porcentajes denominados margen son recargos
sobre costo. Ya existen seeds y un motor comercial gobernado; una nueva CLI no debe duplicar
su autoridad ni publicar costos internos.

## Decision

Crear una CLI local `pricing:workbook` sobre una extracción reproducible JSON del libro.
La solicitud del operador autoriza esta implementación reversible; no aprueba tarifas.
El Excel es la evidencia histórica; el JSON es una proyección con hash, no un nuevo catálogo.
Cada celda conserva hoja/coordenada, valor o resultado cacheado y fórmula cuando existe.
Los hijos de celdas combinadas conservan `mergedTo` y valor null, sin duplicar el valor del master.
Los escenarios explican aritmética USD con supuestos explícitos y estado `hypothesis_only`.

## Alternatives Considered

- Sólo CSV: ya existe, pero pierde fórmulas/procedencia y no distingue costos incompletos.
- Leer XLSX para cada consulta: innecesario; JSON permite inspección sin librerías de Excel.
- Importar directamente al catálogo: rechazado; necesita reconciliación y aprobación propias.
- Segundo motor de cotización: rechazado; el motor vigente conserva autoridad.

## Runtime Contract

- `scripts/commercial/pricing-workbook.mjs`: adapter CLI; JSON stdout, errores JSON stderr.
- `scripts/commercial/lib/pricing-workbook.mjs`: extractor/reader/audit y escenarios de evidencia.
- `data/pricing/extracted/workbook-v1.json`: extracción versionada, hash verificado antes de consulta.
- `data/pricing/efeonce-pricing-model-v1.xlsx`: fuente intacta; no se recalcula ni se guarda.
- Exportación sólo con comando explícito; no aplica DB ni modifica seeds. No se ejecutan fórmulas.
- Desconocidos conservan `null`; cero almacenado no demuestra costo actual ni gratuidad.
- Escenario exige margen fraccional, horas vendibles, modalidad y gastos declarados.
  Dedicado absorbe costo mensual completo; compartido exige asumir venta de capacidad restante.
- Contrato operativo externo vigente: [Quote API parity](GREENHOUSE_QUOTE_API_PARITY_DECISION_V1.md).
  Esta CLI no es un endpoint, herramienta MCP, catálogo aprobado ni cotización emitida.
- Colocación: scripts locales fuera del build; ExcelJS existente sólo en export; sin nuevos runtimes.

## Consequences

Los agentes pueden investigar el modelo con trazabilidad y detectar drift/incompletitud.
El resultado cacheado de Excel puede estar desactualizado; audit recalcula sólo las ecuaciones de
roles conocidas. Todos los costos son históricos hasta verificación independiente. La CLI contiene
datos internos y no debe distribuirse como API pública ni confundirse con una rate card.

## Revisit When

Se solicite importar al catálogo, conectar payroll/FX actuales, emitir cotizaciones, exponer API/MCP
o convertir el JSON en fuente comercial. Esos cambios requieren contrato gobernado y aprobación
proporcional; reutilizan el motor vigente.

## Evidence

- [Plan](../tasks/plans/TASK-2015-pricing-workbook-cli-plan.md)
- [Manual](../manual-de-uso/finance/consultar-excel-pricing-por-cli.md)

## Delta 2026-10-09 — alternativa de costeo operable sin UI

El operador aclaró que el motor existente no le ha servido y pidió una alternativa. La CLI no se
limita a consulta histórica: `estimate` compone roles y gastos, `compare` calcula distintos márgenes
y los JSON de trabajo pueden declarar costos que reemplazan al Excel, con fuente y fecha explícitas.
Es aritmética de costeo local sobre supuestos del operador, sin UI/DB. Los costos declarados no son
independientemente verificados. No persiste/importa al catálogo ni emite cotizaciones; el motor
del portal conserva su contrato para transacciones gobernadas. Tres capas documentales explican
esta alternativa usable y no supeditan el cálculo local a reparar la UI.

## Relación vigente con Cotizador V3

La consulta del libro conserva su alcance histórico. Para componer una cotización nueva se usa el
[núcleo V3](GREENHOUSE_PRICING_V3_LOCAL_PROTOTYPE_DECISION_V1.md) y su
[flujo operativo](GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md), completos localmente en TASK-2022.
V3 no lee XLSX ni la extracción para calcular: consume catálogos, policy y demanda estructurados versionados.
Los valores históricos conservan su procedencia; registrar el costo mensual de un consultor no fusiona sus
escalas ni acredita costo localizado vigente. El libro sigue intacto y sirve para investigar, no para operar
como base mutable del cotizador. La autoridad canónica de emisión continúa en Quote API Parity.
