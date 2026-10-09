# Catálogo local V3: selección y mantenimiento

Baseline [review-v1](catalog.review-v1.json): 32 perfiles históricos, 26 referencias de proveedores,
fees por perfil, kits y policies de simulación. No habilitado comercialmente ni conectado a V2/DB/API.

- [Manual para Codex/Claude](../../../docs/manual-de-uso/finance/catalogo-v3-seleccion-y-actualizacion.md).
- [Contrato de mantenimiento](../../../docs/documentation/finance/cotizador-v3-mantenimiento-catalogo.md).
- [Diseñador CO→CL](examples/designer-co-cl.json), [demanda Pibank PE/CL](examples/pibank-demand-pe-cl.json).
- [Alza ilustrativa](examples/illustrative-increase.json), [briefs de impacto](examples/update-impact-briefs.json).
- [Quote congelada](examples/designer.quote.artifact.json), [evidencia de ejecución](examples/verification.json).

Agentes consultan registros y kits, preparan brief sin costos inline, resuelven y cotizan. Inputs presupuestarios
de un expediente no son catálogo. Fuentes/hashes, vigencia, unidades y supuestos conservan trazabilidad.
Mantenimiento crea versión nueva mediante preview/apply; requiere seleccionar `--catalog` para usarla.
No ejecutar el Excel, no modificar baseline in-place, no inventar costos ausentes o interpretar historical como vigente.

Las licencias usan precio completo del paquete histórico: permisos de compartir/plan/seat count aún pendientes.
Talent Assurance/operación/setup `trial-*` son placeholders visibles del ensayo previo, no costos medidos.

[Antecedentes actuales declarados por el operador](../v3-pilot/economics/resource-inputs/README.md): Higgsfield, Magnific, Adobe y plataforma Vercel/GCP. Registro local para normalizar; aún no reemplaza valores de esta baseline ni asigna usuarios/costos por servicio automáticamente.

QA local: [auditoría TASK-2019](../../../docs/audits/commercial/2026-10-09-pricing-v3-catalog-selection-maintenance.md); 74 pruebas y CLI real.
