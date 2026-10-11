# Catálogo local V3: selección y mantenimiento

[Superficie V3 implementada y frontera comercial](../../../docs/documentation/finance/cotizador-v3-superficie-implementada.md). Este conjunto conserva su versión/caso original; las fuentes y la policy operativa sucesora se seleccionan explícitamente y no alteran resultados congelados.

Baseline [review-v1](catalog.review-v1.json):32 perfiles históricos,26 recursos originales (25 tools más fee genéricoETG-017),
fees por perfil, kits y policies de simulación. No habilitado comercialmente ni conectado a V2/DB/API.

- [Manual para Codex/Claude](../../../docs/manual-de-uso/finance/catalogo-v3-seleccion-y-actualizacion.md).
- [Contrato de mantenimiento](../../../docs/documentation/finance/cotizador-v3-mantenimiento-catalogo.md).
- [Diseñador CO→CL](examples/designer-co-cl.json), [demanda Pibank PE/CL](examples/pibank-demand-pe-cl.json).
- [Alza ilustrativa](examples/illustrative-increase.json), [briefs de impacto](examples/update-impact-briefs.json).
- [Quote congelada](examples/designer.quote.artifact.json), [evidencia de ejecución](examples/verification.json).

Agentes consultan registros y kits, preparan brief sin costos inline, resuelven y cotizan. Inputs presupuestarios
de un expediente no son catálogo. Fuentes/hashes, vigencia, unidades y supuestos conservan trazabilidad.
Mantenimiento crea versión nueva mediante preview/apply; requiere seleccionar `--catalog` para usarla.
Desde el 2026-10-11 el catálogo operativo vigente no vive aquí ni se nombra a mano: lo nombra el puntero
[`../v3-operating/current.json`](../v3-operating/current.json) y se usa con `--current`. Esta baseline review-v1
sigue siendo lo que la CLI lee cuando no pasas `--catalog` ni `--current`, y no es el catálogo para cotizar hoy.
No ejecutar el Excel, no modificar baseline in-place, no inventar costos ausentes o interpretar historical como vigente.

Las licencias usan precio completo del paquete histórico: permisos de compartir/plan/seat count aún pendientes.
Talent Assurance/operación/setup `trial-*` son placeholders visibles del ensayo previo, no costos medidos.
*Nota 2026-10-11:* eso describe esta baseline. En el catálogo operativo, desde v9, `trial-setup` está retirado y la
puesta en marcha son dos provisiones estimadas por persona; el paquete de Adobe se registra como se factura, por
licencia. Ese catálogo agrega además la clase de registro `engagement_factor` (la razón de precio de cada forma de
engagement), que esta baseline no tiene.
[Detalle](../v3-operating/README.md#delta-2026-10-11--catálogo-v9-y-policies-v7-y-v8-forma-del-engagement-puesta-en-marcha-adobe-y-lecturas).

[Antecedentes actuales declarados por el operador](../v3-pilot/economics/resource-inputs/README.md): Higgsfield, Magnific, Adobe y plataforma Vercel/GCP. Registro local para normalizar; aún no reemplaza valores de esta baseline ni asigna usuarios/costos por servicio automáticamente.

QA local: [auditoría TASK-2019](../../../docs/audits/commercial/2026-10-09-pricing-v3-catalog-selection-maintenance.md); 74 pruebas y CLI real.
