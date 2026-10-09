# Contrato de mantenimiento del catálogo V3

Accepted para prototipo local, operador 2026-10-09. [ADR](../../architecture/GREENHOUSE_PRICING_V3_CATALOG_MAINTENANCE_DECISION_V1.md).
Código: `catalog/contracts.ts`, `catalog/catalog.ts`, `adapters/catalog-local.ts` bajo `src/lib/finance/pricing-v3`.
[Manual y ejemplos](../../manual-de-uso/finance/catalogo-v3-seleccion-y-actualizacion.md).

## Ownership y revisión

- Finance/Commercial mantiene costo humano, moneda/FX, fees, margen/markup y factores de mercado.
- Operations mantiene perfiles, kits, capacidad/asignación y costos de Talent Assurance/operación.
- Platform mantiene schemas, compatibilidad y consumers.

Revisar valores trimestralmente y ante nueva factura/plan, revisión salarial, cambio de proveedor, FX/política o país.
Cada revisión deja fecha, responsable y fuente por registro. Esta cadencia es contrato operativo; no crea un scheduler,
no consulta proveedores ni revisa precios automáticamente. Source confirmed exige respaldo concreto; histórico o
estimado continúa revisión. Confirmar significado de una celda no confirma costo/país/vigencia.

## Registro

`recordId` estable, `revision`, `kind`, `value`, `source` y `note`. Fuente tiene referencia, `effectiveFrom`,
`effectiveUntil`, `status=confirmed|estimated|pending`; ventanas son inclusivas y fechas ISO. Un cero necesita
`zeroReason` en componentes humanos para modo commercial_draft y justificación según contrato del motor; null/pending no se transforma en cero.

Kinds: profile, cost, resource, kit, allocation, pricing, talent_factor, market_factor, fx. Perfil no incorpora fee,
software ni margen dentro de salario. Cost conserva componentes/coberturas y país específico, referencia con factor
u origen desconocido; kits describen cómo asignar recursos. Datos de unidad/scope/moneda son parte del valor.
El catálogo declara países/monedas con precisión explícita y evidence/hashes de los antecedentes.

## Change-set

`schemaVersion=pricing-v3-catalog-change/1`, `changeId`, `baseDigest`, `nextVersion`, `actor`, `reason`, `changes`.
Una operación por recordId por cambio:

- `add`: id nuevo, revisión1; incluye registro completo.
- `replace`: misma identidad semántica/kind, revisión previa+1, registro completo con nueva referencia de fuente.
- `retire`: cierra vigencia, conserva el dato histórico; no incluye otro registro.

Cada operación declara `effectiveFrom`. Replace permite corrección del mismo día en una versión nueva; retire exige fecha posterior al inicio del registro anterior;
cierra su ventana al día anterior sin extender vigencia vencida; renovar un registro vencido conserva el gap como pendiente. No solapar intervalos, cambiar identidad a escondidas ni reutilizar un id retirado.
Una corrección del mismo día sustituye la fila en el sucesor; el padre y el valor completo anterior en audit conservan historia. No se modifica ninguna quote previa.
Para un país/moneda nuevos, `dimensions.countriesAdd` y `currenciesAdd` (código y precisión) amplían dimensiones;
los factores, costos y FX se agregan además como registros. No se infiere precisión ni un factor neutral operativo.

## Propose → inspect → apply

Preview valida base/schema/fechas/identidad, presenta diferencias y puede recalcular briefs antes/después.
Incluye su digest y la versión candidata. Apply reconstruye el mismo preview y exige digest idéntico,
incluidos briefs de impacto; una base cambiada devuelve `CATALOG_BASE_CONFLICT`, una propuesta/impacto cambiado
`CATALOG_PREVIEW_CONFLICT`. Confirm es control técnico de integridad, no aprobación comercial inferida.

El adapter escribe una **ruta nueva** `wx/0600`. No modifica el archivo padre ni selecciona automáticamente el
sucesor. Quote nueva indica `--catalog nueva-version.json`; baseline CLI conserva review-v1. La nueva versión
incluye audit con actor/motivo/baseDigest/previewDigest y cambios completos, también dimensiones nuevas.
Duplicar `changeId` en el sucesor se rechaza. Las versiones se retienen; rollback consiste en seleccionar el padre
para nuevas simulaciones, sin editar artefactos ni usar tarifas retiradas como vigentes.

## Invariantes de cotización

- Resolver selecciona valores por quoteDate; no aplica alzas futuras antes de su fecha.
- Quote congela catálogo íntegro, brief, selección, snapshots y resultados; replay no carga catálogo actual.
- Ningún mantenimiento cambia cotizaciones/contratos activos. Revisarlos requiere nueva quote explícita y aprobación propia.
- Historical/synthetic no se convierten en comerciales por correr apply. Cambiar estado comercial/promoción no forma parte del change-set.
- Valores/costos/precios no vienen de presupuestos del expediente: éste aporta necesidades/capacidad.
- Cambio de monto no hereda confirmación de fuente automáticamente: reemplazo exige referencia nueva y status explícito.
- No hay API/DB/CRM/permiso remoto agregado. Local FS access es autoridad de operador, no autenticación empresarial certificada.

## Evidencia

Tests: fechas futuras, add/replace/retire, identidad/vigencia/conflictos, quote vieja, fuentes, licencias completas,
compartidos, anualidades y calendarios. [Prueba real de CLI](../../../data/pricing/v3-catalog/examples/verification.json).
El incremento de ejemplo10% es ilustrativo; no orden salarial ni precio actual de Adobe.

## Planes, reglas y créditos por demanda

TASK-2022 amplía mantenimiento local con `resources preview|apply`: schema
`pricing-v3-resource-change/1`, kind`policy|credits`, baseDigest/reason/replacement completo y versión nueva.
[Flujo y comandos](../../manual-de-uso/finance/operar-cotizador-v3-con-agentes.md). Discovery expone el digest de
policy y, con `--credits`, el del catálogo de créditos. Preview presenta sucesor e impactos sobre demandas;
apply exige idéntico digest y escribe archivo nuevo, sin activarlo. Conservar change-set/preview como registro
del responsable/factura/fecha. Base o confirmación stale bloquean; precio confirmado cambiado necesita nueva
referencia y packs/costosIA cambian con evidencia nueva. Reglas review-only no se convierten en tarifas aprobadas.

La fecha de una renovación desconocida no se inventa. Adobe306 permanece como variante condicional explícita;
180 combinado no agrega Express por separado. Versionar por separado portfolio/capacidad y una nueva demanda.
Snapshots previos conservan policy/precios/créditos/FX; ninguna actualización recalcula una quote existente.
