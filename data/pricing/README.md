# Pricing local para agentes

[Superficie V3 implementada y frontera comercial](../../docs/documentation/finance/cotizador-v3-superficie-implementada.md). Este conjunto conserva su versión/caso original; las fuentes y la policy operativa sucesora se seleccionan explícitamente y no alteran resultados congelados.

[Flujo operativo V3 completo local](v3-operating/README.md): discovery/plan,32 perfiles, recursos por trabajo, reparto de capacidad, mantenimiento con impacto, evaluación y preview; costos/asignaciones reales e integración canónica pendientes.

**Versiones vigentes (2026-10-11).** El catálogo, la policy de recursos y el catálogo de créditos vigentes los nombra
un puntero, [`v3-operating/current.json`](v3-operating/current.json), verificado por versión y digest. Para cotizar
con lo vigente pasa `--current` en vez de escribir rutas de versión; para verlo, `pnpm --silent pricing:v3 current show`.
Sin `--current` la CLI se comporta como antes (baseline histórica `v3-catalog/catalog.review-v1.json` si no pasas
`--catalog`). Los costos por persona de esos catálogos son el costo objetivo decidido por el operador, no la nómina
actual.

**Forma del engagement y lecturas (2026-10-11).** El brief puede declarar la forma del compromiso en `engagementForm`
(`on_going`, `on_demand`), aparte de `engagementCode`; On-Demand lleva una razón de precio que vive en el catálogo.
Sobre un artefacto congelado hay cuatro lecturas que derivan y nunca forman un precio: `compose split`,
`compose schedule`, `compose cash` y `compose commitments`. Detalle y cifras medidas:
[último delta del flujo operativo](v3-operating/README.md#delta-2026-10-11--catálogo-v9-y-policies-v7-y-v8-forma-del-engagement-puesta-en-marcha-adobe-y-lecturas).

- [Prototipo del motor del cotizador V3](../../docs/documentation/finance/cotizador-cli-modelo-propuesto.md): dirección confirmada; CLI como primer consumidor, motor reutilizable y futura integración al cotizador canónico con Full API Parity. País del talento y mercado separados, fee genérico, tiers y herramientas por perfil. Contrato definido abajo; parámetros comerciales e integración canónica pendientes; primera vertical local implementada bajo ADR.
- [Contrato y pruebas/convergencia V3](../../docs/documentation/finance/cotizador-v3-contrato-y-validacion.md): bloques 2 y 3 definidos; baseline inicial de código, casos y gates de integración. Parámetros comerciales pendientes; alcance implementado y extensiones se distinguen en el manual V3.
- [Catálogo piloto V3](v3-pilot/README.md) y [tabla de parámetros](../../docs/documentation/finance/cotizador-v3-parametros-piloto.md): escalas HubSpot separadas, confirmación del significado del costo mensual, kits propuestos y controles históricos independientes; sin habilitación comercial.
- [Análisis hoja por hoja del Excel](../../docs/audits/commercial/2026-10-09-pricing-workbook-logic-analysis.md): antecedente funcional y pendientes; la evolución hacia V3 se define en el modelo anterior.
- [Manual V3 ejecutable](../../docs/manual-de-uso/finance/cotizar-v3-por-cli.md): `pnpm --silent pricing:v3`, snapshots explícitos y pruebas del núcleo/CLI.
- [Manual CLI histórica](../../docs/manual-de-uso/finance/consultar-excel-pricing-por-cli.md).
- `efeonce-pricing-model-v1.xlsx`: libro original intacto.
- `seed/`: CSVs históricos existentes; no se modifican por la CLI.
- `extracted/workbook-v1.json`: proyección completa con valores, fórmulas, celdas y hash del libro.
- `examples/`: supuestos hipotéticos editables para escenarios; no salarios ni tarifas aprobadas.

```bash
pnpm --silent pricing:workbook search --query HubSpot
pnpm --silent pricing:workbook estimate --input data/pricing/examples/crm-capacity-plan.json
pnpm --silent pricing:workbook compare --input data/pricing/examples/crm-capacity-plan.json --margins 0.35,0.40,0.45
```

Consulta, auditoría y cálculo local sin UI/DB. Costos reales pueden declararse por JSON con fecha/fuente.
No importar esta proyección como catálogo comercial vigente ni exponer costos internos a clientes/público.

## Selección y mantenimiento V3

[Catálogo local versionado](v3-catalog/README.md): brief → selección → cálculo → explicación; actualizaciones con fecha efectiva, impacto y conflicto de base. Histórico/simulación, no tarifas vigentes.

[Reglas económicas y provisiones propuestas](v3-pilot/economics/commercial-policy-proposal/README.md): avance TASK-2017, sin tarifa aprobada.

[Licencias y plataforma declaradas por el operador](v3-pilot/economics/resource-inputs/README.md): montos actuales, créditos, renovación Adobe y reparto pendiente; antecedente para actualizar catálogo, no import automático.

[Presupuesto IA por CLI](v3-resources/README.md): suscripción atribuida y paquetes extra enteros, remanente y vencimiento; revisión obligatoria. Binding al quote por el compositor siguiente; datos de reparto reales pendientes.

[Composición por demanda](v3-composition/README.md): base común, herramientas por perfil/tarea y presupuestos IA integrados; CLI compose/explain/replay, tres casos de simulación.
