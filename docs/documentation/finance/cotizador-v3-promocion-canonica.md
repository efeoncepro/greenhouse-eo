# Promover V3 al cotizador canónico

2026-10-09, handoff preparado bajoTASK-2022; **no es autorización de cutover ni implementación remota**.
[Full API Parity vigente](../../architecture/GREENHOUSE_QUOTE_API_PARITY_DECISION_V1.md),
[prototipo](../../../data/pricing/v3-operating/README.md), [superficie funcional implementada](cotizador-v3-superficie-implementada.md).

El canon ya tiene read/compute y autoría/emisión separados. Se promueve el motor debajo de estos primitives;
CLI/UI/MCP usan el mismo contrato. No crear otra API de cotizaciones ni duplicar autoridad por consumer.

| Capacidad                     | Primitive/superficie vigente verificada                                                                                                            | Adaptación V3 a definir                                                                                                            |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Simular por servicio o líneas | `src/lib/finance/pricing/simulate-quote-pricing.ts`, schema `simulate-input-schema.ts`, API `src/app/api/finance/quotes/pricing/simulate/route.ts` | Resolver catálogo/policy/portfolio autorizados en servidor; reutilizar kernel puro, traducir resultado y versionarlo               |
| Descubrir servicios           | `src/lib/commercial/service-catalog-expand.ts` y reader `src/lib/commercial/service-catalog-search.ts` (`searchServiceCatalog`) de TASK-1211       | Mantener identidadSKU/catálogo aprobados; mapear requisitos de recursos sin convertir reglas review-only en ofertas                |
| Audiencia/costos visibles     | `src/lib/finance/pricing/pricing-output-redaction.ts`                                                                                              | Audiencia sale de identidad/permisos; proyecciónV3 local no sustituye redacción canónica ni autoriza acceso interno                |
| Autorar/emitir                | `src/lib/commercial/submit-quote-from-builder.ts` (`submitQuoteFromBuilder`) de TASK-1212, idempotente/atómico                                     | Snapshot versionadoV3 y persistencia; reutilizar permisos, aprobación, lifecycle y auditoría                                       |
| Mantenimiento                 | Catálogo canónico/admin + snapshots                                                                                                                | Migración de registros aprobados, revisions y vigencias; no importar histórico o facturas como tarifas comerciales automáticamente |
| Consumers                     | UI/Nexa/MCP/API Platform bajoTASK-1211/1212                                                                                                        | Conformance por consumer, mismo cálculo; write externo conserva frontera de autoridad propia                                       |

## Orden de trabajo propuesto

1. **Cierre económico** — Finance/People/Operations: salarios locales, coberturas laborales, costosAssurance/operación,
   planes/seats, inventario/capacidad, factor de talento/mercado, pricing/impuestos/SOW con evidencias.
   Usar el piso vigente de cada práctica:40%/35% de `assess` son propuesta genérica, no sustituyen 45% creativo aprobado.
2. **Equivalencia y decisión** — Platform/Finance: comparar V2/V3 con datos aprobados y golden cases; registrar cada
   divergencia (markup vs margen, periodicidad, reparto, FX, redondeo, setup/caja). Aceptar contrato/migración por ADR.
3. **Reader/compute server-side** — sin cambiar emisor de quotes: tenant/account autorizados, fuentes/snapshots,
   schema único, audiencias, simulación, explain y errores. Denial paths y no filtrar costos al cliente/público.
4. **Consumers** — CLIHTTP/UI/MCP consumen esos readers; paridad de contrato/errores/cifras, sin fórmulas propias.
5. **Autoría/persistencia** — command existente y lifecycle: maker-checker, idempotencia, snapshot, revisión y eventos.
   Cotizaciones previas conservan su versión del motor; no recalcular contratos activos en background.
6. **Rollout** — pruebas con tenancy/denial/idempotencia, comparación en entorno autorizado, release gobernado,
   observabilidad/canary, rollback aV2 para nuevas quotes y readback. No invocar despliegue por este documento.

Definition of done futura: paridad real por consumer; evidencia económica aprobada; V2/V3 reconciliados;
seguridad/redacción/lifecycle/migración/snapshots certificados; promoción gobernada y readback. La CLI local
no acredita ninguno de los permisos remotos ni ese rollout. Cada unidad formal sigueAGENTS/task-hook cuando el
operador pida ejecutar un TASK específico.

## Contratos locales que la adaptación debe conservar

- Request/brief, policy de selección, catálogo de créditos, portfolio y demanda mantienen schemas/versiones separados; descubrir no confirma seats comprados ni autoriza acceso.
- Cliente/proveedor/usuario se resuelve desde autoridad server-side. `accountId`, `assigneeIds` y evidencia cliente locales no son permisos remotos ni una reserva de capacidad.
- Snapshot debe preservar catálogo, policy, créditos, demanda, fuentes y métodoDecimal/redondeo/FX, incluyendo caja incremental y remanentes. La identidad local `calculationId` no es una `quotation_id`.
- Contratos nominativos/bundles, mínimo de equipo, mes/anual/setup, cobertura cliente, factor talento/mercado, saldo interno/sin asignar y escenarios condicionales deben seguir explícitos. No importar Adobe 306 como alza efectiva ni el rangoVercel como factura exacta.
- Preview de simulación y export comercial conservan gates distintos. La proyección local de `managed_service` no debe revelar equipo/horas/costo al comprador, pero tampoco certifica SOW, aprobación o emisión.
- Preview/apply de mantenimiento necesitan command/audit y optimistic locking equivalentes en servidor; los archivos `wx`/0600 y digests locales no resuelven autoridad, concurrencia multiusuario o auditoría empresarial por sí solos.
- Mantener fixtures y replays previos. Verificación local 213 tests/26 smokes respalda el prototipo; no acredita paridad remota, tenancy, idempotencia ni rollout.
