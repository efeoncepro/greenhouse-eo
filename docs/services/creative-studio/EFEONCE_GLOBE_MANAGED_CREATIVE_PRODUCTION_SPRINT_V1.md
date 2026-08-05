# Efeonce Globe — Managed Creative Production Sprint V1

## Estado

- Estado comercial: `conditional-go` CEO para un primer cliente.
- Primer cliente design partner: `SKY Airline`.
- Producto: servicio comercial de Efeonce powered by Globe.
- Modalidad: `efeonce-managed`.
- Acceso del cliente al runtime Globe: `denied`.
- Alcance inicial: un cliente, un workflow, una ruta promovida y un periodo acotado.
- Workflow inicial: expansión gobernada del servicio `SKY Agencia Creativa`, usando producción visual, provenance,
  QA y memoria de Globe.
- Autoridad: decisión CEO registrada en [`TASK-1480`](../../tasks/in-progress/TASK-1480-globe-commercial-external-readiness-gate.md).

## Oferta

Efeonce vende capacidad creativa aprobada y entregables versionados; Globe es el motor gobernado de producción,
provenance, revisión y entrega. El cliente compra un resultado comercial gestionado, no créditos ni acceso directo a
la infraestructura.

El sprint cubre:

1. Brief y criterios de aceptación.
2. Selección de una ruta/modelo con rights packet y evidencia de coste.
3. Producción de una familia acotada de assets o variantes.
4. QA creativo, técnico y de derechos.
5. Revisión y aprobación del cliente.
6. Entrega de outputs, manifest/provenance y resumen de producción.

## Perfil de cliente inicial

- Enterprise marketing organization con sponsor y workflow real.
- Una unidad de negocio y una geografía.
- Inputs del cliente o inputs con derechos documentados.
- Capacidad de revisar y aprobar en una cadencia definida.
- No apto para: likeness sensible, claims regulados, datos personales innecesarios, volumen abierto o publicación
  automática sin revisión humana.

## Límites del primer sprint

| Dimensión | Límite inicial |
|---|---|
| Cliente | 1 design partner |
| Workflow | 1 campaña o familia de variantes |
| Ruta | 1 ruta/modelo con promoción y canary verificables |
| Operación | Efeonce ejecuta, reintenta, gobierna y entrega |
| Cliente | Brief, feedback y aprobación; no opera el runtime |
| Acceso | Usuarios Efeonce allowlisted; sin workspace externo directo |
| Comercial | SOW/orden + factura directa; sin checkout ni wallet |
| Riesgo | Budget cap, stop-loss y rollback owner definidos antes del primer run |

## Gates antes de aceptar trabajo

- `TASK-1480`: `conditional-go` aplicable al cliente, geografía, workflow y ruta.
- `TASK-1521`: ruta exacta con ejecución end-to-end, persistencia, retrieval/entrega, audit y owner operativo.
- `TASK-1535`: rights attestation, binding, canary y rollback route-specific.
- `TASK-1482`: presupuesto, reservation/settlement, hard cap y bloqueo antes de gasto no autorizado.
- Legal/Rights: inputs, outputs, proveedores, uso, portfolio/training y restricciones documentados en SOW.
- Data Protection: provider/model/endpoint/plan exactos, no-training/no-improvement, retención, región,
  subprocesadores, aislamiento, eliminación y AI Data Protection Pack cuando el material sea confidencial o restringido.
- Finance: precio aprobado, coste esperado, reserva de retry/refund, impuestos aplicables y margen bruto objetivo ≥45%.
- Delivery: brief, reviewer, aprobación, soporte y criterio de cierre nombrados.

## Secuencia operativa

```text
qualification → SOW/rights → preflight → estimate/budget hold → production
→ governance/QA → human review → client approval → secure delivery
→ settlement/report → retrospective → expansion decision
```

Ningún run de cliente comienza sin preflight, derechos, presupuesto y ruta aprobada. Un fallo de provider, rights,
coste, calidad o recuperación detiene el sprint y activa el runbook de rollback; no se reintenta a ciegas.

## Entregables y criterio de aceptación

- Assets finales en el formato acordado.
- Manifest con lineage, modelo/proveedor, versión, derechos y estado de aprobación.
- AI Data Protection Pack o referencia a la excepción documentada cuando la clasificación de datos lo requiera.
- Resumen de coste, retries, tiempos, incidencias y rework.
- Confirmación de entrega y archivo de evidencia.
- Aprobación humana del cliente o rechazo documentado.

El sprint se considera exitoso si entrega el workflow acordado, mantiene derechos y provenance completos, respeta el
budget cap, supera el margen mínimo aprobado y produce una decisión de segunda fase.

## Lo que no se promete

- Acceso SaaS o `client-operated`.
- Generación ilimitada, performance media o publicación automática.
- Disponibilidad de todas las modalidades o proveedores.
- Self-serve, marketplace, reseller, white-label o co-selling.
- Derechos sobre outputs que no estén expresamente incluidos en el SOW.

## Expansión

La expansión requiere una nueva decisión de alcance y evidencia: segundo workflow, segunda ruta, más usuarios,
operación co-operated, acceso de workspace o cualquier cambio de geografía/rights. Este sprint no crea por sí solo un
precedente de acceso general.
