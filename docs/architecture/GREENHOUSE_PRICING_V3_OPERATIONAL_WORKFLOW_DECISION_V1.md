# Pricing V3 — flujo operativo local para agentes

- Status: `Accepted` local, por pedido del operador de completar pendientes, 2026-10-09.
- Owner: Commercial/Finance + Platform. Work unit: TASK-2022.
- Reversibility: two-way; opt-in, sin cambio al canon/API/DB ni catálogo anterior.

El dominio ofrece discovery/plan de recursos, reparto de cartera declarada, evaluación de preparación económica
y preview redactado. CLI es consumer; interpreta JSON estructurado, no llama LLM ni inventa decisiones desde texto.
Codex/Claude interpreta lenguaje, consulta candidatos y completa datos; kernel existente calcula una sola vez.

Policy sucesora cubre perfiles históricos usando reglas de revisión trazables. Adobe180USD corresponde al paquete
3CC Teams+3Express, confirmado por operador. Una tarea cubierta por ese paquete no añade Express separado.
306USD es escenario de renovación70%, no precio automático hasta conocer fecha/base contractual.

Portfolio local declara unidades por recurso/mes y por cuenta, parte interna y capacidad no asignada. Todas suman
al denominador; share deriva con Decimal. Seat nominativo conserva usuarios/capacidad y no es licencia compartida.
La dedicación del trabajo puede informar unidades declaradas pero no reduce cantidad de seats por sí sola.
Sobreasignación, duplicación, cuota desconocida o permiso de acceso desconocido bloquean preparación completa.

Recursos del cliente pueden cubrir herramientas específicas con evidencia de acceso/continuidad por línea;
Notion/M365 internos obligatorios no se sustituyen. Cobertura cliente equivale a costoEfeonce0 declarado, no licencia
gratuita para toda la cartera. Ninguna compra/asignación real ocurre en planificación.

Precios públicos, facturas, operador e históricos conservan procedencia separada. Sólo se selecciona una variante
explícita; no convertir aviso de factura en importe pagado ni promoción pública en contratoEfeonce. Fuentes no
verificadas permanecen pendientes. FX es referencia fechada, no contractual; no inventar tasa actual.

Evaluación comercial no aprueba: detecta costos/planes históricos, trialprovisions, localizedcost desconocido,
planes públicos, denominadores simulados, márgenes propuestos, impuestos/entidad/SOW pendientes. Preview sólo
proyecta neto/periodo/unidad comercial y estado simulation; managed_service agrupa feeexterno y mantiene personas
como costeo interno. Nunca filtra costos, tasas internas, país de talento, margen, slots o proveedores internos.

Artifacts previos se conservan y replay se verifica. Nuevos contratos additive; ningún defaultnuevo cambia su
digest. API/UI/MCP canónicos requieren unidad de promoción propia: auth/tenancy/audiencias, snapshots/lifecycle,
contrasteV2/V3 y cutover/rollback. No crear endpoint o UI que eluda esa autoridad.

Mantenimiento de policy/créditos: replacement íntegro versionado, baseDigest y previewDigest con impactos sobre
demandas; schema/referencias/evidencia vigentes y no heredar confirmación de una factura al modificar precio.
Apply escribe sucesor nuevo sin activar, conserva padre/artifacts y no implica aprobación comercial. Adapter
posee hashing/FS, dominio conserva fórmulas. Manual operativo y mapa de promoción son el handoff de TASK-2022.
