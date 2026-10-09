# Pricing V3 — flujo operativo local para agentes

- Status: `Accepted` local, por pedido del operador de completar pendientes, 2026-10-09.
- Owner: Commercial/Finance + Platform; Operations posee asignación y evidencia de acceso.
- Work unit: [TASK-2022](../tasks/complete/TASK-2022-pricing-v3-operational-agent-workflow.md).
- Reversibility: two-way; opt-in, sin cambio al canon/API/DB ni catálogos anteriores.
- Estado: completo local; validación económica y promoción canónica conservan fronteras propias.

## Decisión y dominio reusable

El agente interpreta lenguaje, identifica alcance y completa inputs. El dominio descubre y valida candidatos,
compone recursos, reparte costos y calcula con Decimal. CLI carga JSON y serializa; no llama LLM ni contiene
fórmulas comerciales. UI, API y MCP futuros consumirán las mismas primitives mediante adaptadores gobernados.
No hace falta conservar Excel en el flujo de cálculo: éste permanece como antecedente trazable.

| Responsabilidad | Fuente vigente |
| --- | --- |
| Aritmética comercial: costo, markup/margen, ajustes, descuento, FX y redondeo | `src/lib/finance/pricing-v3/calculate.ts` y `schemas.ts` |
| Catálogo monetario, resolución de perfiles/variantes y calendario | `src/lib/finance/pricing-v3/catalog/` |
| Selección de recursos por trabajo y atribución a snapshots | `resources/composition.ts` y `composition-contracts.ts` |
| Presupuesto discreto de créditos y caducidad | `resources/credit-budget.ts` |
| Discovery, scaffold, portfolio y plan | `resources/operating.ts` |
| Preparación comercial y preview allowlisted | `resources/readiness.ts` |
| Digests, artefactos, replay y mantenimiento local | `adapters/`; filesystem y hashing fuera de la aritmética |
| Primer consumer local | `scripts/commercial/pricing-v3.ts` |

Estas rutas son relativas a la raíz del repositorio. No incorporan DB, Next.js, identidad remota, Excel ni SDK
al núcleo; su extracción futura conserva contratos y pruebas. No se crea otro pricing engine por consumer.

## Contrato de entradas y selección

El expediente aporta demanda: país del talento, mercado de oferta, perfil exacto, variante/seniority/tier,
headcount, plazo y calendario de dedicación/actividad. Los valores y reglas salen de catálogos versionados.
No usar montos del expediente como tarifa general ni aumentar especialidad salarial porque una tarea requiera
una herramienta. Escalas de consultor permanecen separadas; el costo mensual del Excel no acredita un salario
vigente localizado. Costo del talento y factor del mercado de oferta son ejes independientes; un costo ya
localizado no recibe un segundo factor salarial. Fee genérico, tools y provisiones no se convierten en salario.

El catálogo operativo cubre los 32 perfiles históricos mediante reglas de revisión. Los 26 recursos originales
son 25 herramientas más un fee genérico de plataforma (`ETG-017`), conservado fuera del catálogo de tools para
no duplicarlo. La sucesora añade recursos declarados y variantes públicas explícitas. Las reglas sirven para
preparar, no certifican suficiencia técnica del equipo ni una receta comercial validada.

Notion y Microsoft 365 son base interna para todos. Perfil y tareas seleccionan otras herramientas; por ejemplo,
redacción SEO requiere SEMrush, mientras que la redacción sola no exige Adobe. IA, ChatGPT, Claude, Higgsfield y
Magnific se eligen con motivo según trabajo. Planes múltiples exigen `priceId`; no se toma el más barato por
defecto. Precio/fuente se resuelve en la fecha de quote y congela sus términos para el horizonte; un alza
posterior requiere revisión o nueva quote, no cambio automático del artifact. Cada recurso/asignación/
presupuesto debe cubrir todos los períodos activos. Inputs sobrantes,
ambiguos, faltantes o incompatibles producen `needs_input`, sin total completo ni precios inline del agente.

## Acceso, capacidad y reparto

Seat nominativo conserva usuario, cantidad entera y capacidad contratada. No se reduce por FTE ni se comparte
entre personas por prorratear costo. Cantidad por seat corresponde a usuarios únicos; paquete nominativo exige
capacidad suficiente dentro de sus seats incluidos, y Team exige mínimo de contrato explícito.

Portfolio declara unidades por recurso/período y cuenta, junto con unidades internas y no asignadas. Todas suman
al denominador; la cuota deriva con Decimal. La reconciliación muestra unidades, costo mensual completo,
atribución a cuentas, parte interna, no asignada y residual de precisión. Sin catálogo/fecha o precio vigente
puede verificarse capacidad, pero la reconciliación monetaria permanece `null`. No se fija un porcentaje por
defecto ni se oculta capacidad libre como costo de un cliente. Un seat individual requiere asignación por
usuario; no se admite diluirlo en un pool entre usuarios distintos.

El operador autorizó capacidad declarada porque aún no existe distribución real. Los ejemplos son simulaciones,
no su cartera. El reparto interno del compositor pondera usuarios únicos de las funciones consumidoras; no
infiere horas reales de cada función. Sobreasignación, duplicados y conflicto entre reparto manual y portfolio
bloquean preparación. Planear costo no reserva inventario ni prueba permisos del proveedor.

`clientProvidedTools` cubre una herramienta específica por líneas y período, con motivo y evidencia confirmada
que abarca toda la ventana de actividad. Sólo esa cobertura tiene costo Efeonce cero declarado. No sustituye
Notion/Microsoft 365 internos ni créditos de proveedor. Cobertura parcial preserva costo de los demás usuarios;
entradas no usadas o duplicadas se rechazan. No implica acceso gratuito para toda la cartera.

## Fuentes, bundles y presupuesto IA

Factura, declaración del operador, referencia pública e histórico conservan procedencias distintas. Factura
acredita importe facturado, no pago; referencia pública no prueba contrato Efeonce, país de facturación o acceso.
La policy sucesora y [manifest de evidencia](../../data/pricing/v3-operating/evidence-2026-10-09.json) conservan:

- Adobe: USD 180 mensuales cubre el paquete de 3 CC Teams + 3 Express, confirmado por operador. No añadir Express
  separado. USD 306 es escenario condicional del alza de 70%; fecha de renovación desconocida, sin activación automática.
- Notion: factura del período 21 de septiembre–21 de octubre de 2026, con nueve Business a USD 24 por seat y USD 30
  por créditos. Componentes separados; vigencia efectiva hasta el 20 de octubre inclusive y pago no verificado.
- Vercel/GCP y suscripciones IA: declaraciones del operador, sin inventar asignaciones o contratos actuales.
  Vercel es intervalo declarado, no un punto arbitrario; elegir escenario explícito para calcular.
- Planes públicos: variantes consultadas en fuentes oficiales, separadas de gasto real, contrato y mínimos.
- EUR→USD: FX referencial fechado y elegido explícitamente, sin inventar tasa contractual o futura.

Los importes y ventanas ejecutables viven en los JSON, no en copias de tablas en otros documentos. Cambiar fuente
o fecha requiere sucesor y revisión; la existencia de la variante no prueba disponibilidad después de su ventana.

Demanda de créditos se agrega por proveedor/mes antes de seleccionar packs. Suscripción atribuida deriva de
créditos normales asignados sobre créditos incluidos; disponibilidad se declara, no se infiere del plan. La compra
incremental cubre el déficit con paquetes enteros, remanente y caja visibles. `cashCommitment` del kernel es
compromiso modelado atribuible, no factura ni compra incremental; la caja incremental separada del compositor
cubre sólo recargas de créditos declaradas, sin inferir compra de seats. Caducidad de crédito y vigencia de
promoción/precio son distintas. Magnific requiere suscripción activa; los créditos extra no se equiparan a piezas,
horas ni créditos comerciales. No reutilizar remanente entre cuentas/períodos ni autorizar compras por un cálculo.

## Cálculo, preparación comercial y salida

`compose quote` congela catálogo monetario, policy, créditos, demanda, selección y resultado. Explain y replay
usan ese artifact, sin consultar versiones actuales ni recalcular en el agente. Versiones additive sin nuevos
defaults mantienen los digests previos; no se actualizan artifacts existentes.

`compose assess` devuelve brechas con campo/owner: costo humano localizado, provisiones medidas, acceso/seats,
planes reales, denominadores simulados, impuestos/entidad, alcance y aprobación comercial. Siempre conserva
`binding=false` y `requires_review`; cálculo completo no aprueba tarifa. Objetivo 40% y piso 35% son propuestas
de TASK-2017, no política aprobada ni sustitución de guardrails de otra práctica.

`compose preview` proyecta sólo moneda, neto por período/unidad comercial, impuestos/totales disponibles y estado
de simulación. En `role_capacity` conserva los conceptos comerciales; en `managed_service` agrega fee del período
más implementación inicial y mantiene roles como costeo interno. Su allowlist excluye costos, rates, país del
talento, margen, slots e identificadores/proveedores internos. No emite oferta, crea quote remota, envía ni valida
SOW, contratación laboral, SLA, suficiencia de delivery o precio competitivo.

## Mantenimiento y frontera canónica

El [ADR de mantenimiento](GREENHOUSE_PRICING_V3_CATALOG_MAINTENANCE_DECISION_V1.md) conserva change-sets monetarios.
Policy/créditos usan replacement íntegro versionado, `baseDigest`, digests del contexto y `previewDigest` con
impactos before/after sobre demandas declaradas. Schema/referencias y evidencia se validan; no heredar confirmación
de factura o captura al modificar precio, moneda, unidad o packs. Apply escribe sucesor en ruta nueva sin activar,
conserva padre/artifacts y no concede aprobación comercial.

[TASK-2017](../tasks/in-progress/TASK-2017-pricing-v3-colombia-chile-economics.md) conserva las brechas económicas;
[operational-gaps.json](../../data/pricing/v3-operating/operational-gaps.json) enumera sus owners. No volver a pedir
al operador salarios que ya indicó no tener. Datos desconocidos siguen pendientes; nunca se completan con cero.

Quote API Parity y TASK-1211/1212 conservan la autoridad productiva V2. Promoción V3 requiere unidad propia,
contraste V2/V3, auth/tenancy/audiencias, snapshots/lifecycle y cutover/rollback. UI/API/MCP no pueden eludir esos
commands/readers ni ampliar permisos externos por inferencia. La documentación prepara la integración, no la despliega.

## Evidencia y rutas de operación

- [Manual para agentes](../manual-de-uso/finance/operar-cotizador-v3-con-agentes.md).
- [Datos, casos y fuentes](../../data/pricing/v3-operating/README.md).
- [Promoción al canon](../documentation/finance/cotizador-v3-promocion-canonica.md).
- [QA TASK-2022](../audits/commercial/2026-10-09-pricing-v3-operating-workflow.md): 213 pruebas V2/V3, 26 operaciones
  CLI y replay de artifacts anteriores, más tipos/lint y guardas de mantenimiento/redacción. Esta evidencia es local.
