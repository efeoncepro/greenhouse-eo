# Cotizador V3: contrato operativo para agentes

Referencia load-on-demand compartida Codex/Claude. Estado verificado 2026-10-09: prototipo local opt-in;
catálogo, kernel Decimal, mantenimiento, créditos, composición y flujo operativo implementados. El canon de
cotizaciones Greenhouse conserva autoridad, permisos y lifecycle. Esta referencia interpreta sus contratos;
los schemas y primitives de `src/lib/finance/pricing-v3/` calculan.

## Entrada y fuentes dueñas

- [Manual operativo](../../../../docs/manual-de-uso/finance/operar-cotizador-v3-con-agentes.md): secuencia completa y comandos.
- [Data operativa](../../../../data/pricing/v3-operating/README.md): catálogo monetario/policy sucesores, casos y evidencias.
- [Selección y actualización monetaria](../../../../docs/manual-de-uso/finance/catalogo-v3-seleccion-y-actualizacion.md).
- [Composición](../../../../docs/manual-de-uso/finance/componer-cotizacion-v3-con-herramientas.md) y
  [créditos](../../../../docs/manual-de-uso/finance/presupuestar-creditos-ia-v3.md).
- [Mantenimiento](../../../../docs/documentation/finance/cotizador-v3-mantenimiento-catalogo.md): owners, vigencia y cadencia.
- [ADR operativo](../../../../docs/architecture/GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md) y
  [promoción futura](../../../../docs/documentation/finance/cotizador-v3-promocion-canonica.md).

Para interpretar un pedido, identificar unidad comercial, variante/seniority/tier, país del talento, mercado del
cliente, dedicación, headcount, duración, tareas, moneda y fecha. Una vacante CRM es señal de necesidad; no acredita
intención de contratar proveedor. Talent Assurance aceptado no aprueba cada salario, fee ni garantía comercial.

El expediente aporta demanda/alcance y evidencias: no reemplaza valores centrales de tools, factores, salario,
provisiones o FX con montos arbitrarios. Excel y `pricing:workbook` sirven para investigación histórica;
V3 no depende de leer el archivo al cotizar. Las escalas de Consultor HubSpot siguen separadas. Una tarea SEO en
Copywriter añade SEMrush cuando corresponde, sin cambiarlo al costo de SEO Specialist.

## Secuencia verificable por CLI

Desde la raíz, seleccionar las tres versiones explícitamente:

```bash
pricing_catalog=data/pricing/v3-operating/catalog.review-v2.json
pricing_policy=data/pricing/v3-operating/resources.review-v2.json
pricing_credits=data/pricing/v3-resources/ai-credits.review-v1.json

pnpm --silent pricing:v3 catalog search --catalog "$pricing_catalog" --query consultor
pnpm --silent pricing:v3 resources inspect --catalog "$pricing_catalog" \
  --policy "$pricing_policy" --credits "$pricing_credits" --date 2026-10-09
pnpm --silent pricing:v3 compose scaffold --catalog "$pricing_catalog" \
  --policy "$pricing_policy" --input pedido.json
pnpm --silent pricing:v3 resources portfolio --catalog "$pricing_catalog" \
  --policy "$pricing_policy" --date 2026-10-09 --input cartera.json
pnpm --silent pricing:v3 compose plan --catalog "$pricing_catalog" \
  --policy "$pricing_policy" --credits "$pricing_credits" --input plan.json --out demanda-nueva.json
pnpm --silent pricing:v3 compose quote --catalog "$pricing_catalog" \
  --policy "$pricing_policy" --credits "$pricing_credits" --input demanda-nueva.json --out artefacto-nuevo.json
pnpm --silent pricing:v3 explain --input artefacto-nuevo.json
pnpm --silent pricing:v3 replay --input artefacto-nuevo.json
pnpm --silent pricing:v3 compose assess --input artefacto-nuevo.json
pnpm --silent pricing:v3 compose preview --input artefacto-nuevo.json --format markdown --out preview-nuevo.md
```

`scaffold` produce demanda editable y preguntas; `plan` combina demanda y portfolio sin superponer una misma
asignación manual. `prepare` diagnostica; `quote` congela entradas y resultado. No llamar a quote con las preguntas
sin resolver para presentar un precio completo. `calculate` es el kernel de bajo nivel con snapshot explícito;
`prepare|quote` fuera de `compose` sigue disponible para casos de catálogo sin composición avanzada.

Códigos: **0** operación técnica verificada, **2** `needs_input`, **3** preparado/calculado en revisión, **1** rechazo
por input/conflicto/overwrite/export bloqueado. Replay de composición puede devolver3. Leer JSON y estado;
no encadenar con `&&` asumiendo que una simulación calculada devuelve0. Salidas nuevas son archivos exclusivos
`wx`, modo0600; no sobrescribir padres, fixtures o artifacts. `export` comercial continúa bloqueado.

## Contratos de selección y recursos

`pricing-v3-composition-demand/1` contiene `commercialUnit`, `brief`, `work`, `serviceToolIds`, `allocations`,
`creditBudgets`, `fxRecordIds` y opcional `clientProvidedTools`. `work` declara IDs estables, tareas, selección IA
con motivo y consumo por proveedor/mes. `planned-*` son slots, nunca personas asignadas o seats reales.
`pricing-v3-resource-policy/1` enlaza perfiles/tareas/tools; `access` diferencia `named`, `shared`, `credits`.
32 reglas de perfil son recetas iniciales para revisión, no una cobertura universal del trabajo solicitado.

Base Notion/Microsoft365 obligatoria para todos. SEMrush se añade al trabajo SEO; Adobe a diseño/video que lo
requiere. ChatGPT, Claude, Higgsfield, Magnific y demás IA se eligen por necesidad y motivo; no sumarlos todos a
cada rol. WordPress, stock, publicación social, datos y automatización usan tareas explícitas del alcance.
Elegir `priceId`/frecuencia; plan múltiple o costo desconocido produce pregunta, nunca el plan más barato o cero.

Una licencia nominativa mantiene cantidad entera, usuarios, capacidad y mínimos contractuales. Dedicación50%
no significa licencia50%. Un costo compartido no autoriza compartir login. `basis=seat` no se transforma en pool;
paquetes nominativos pueden distribuir costo respetando capacidad contractual. Adobe actual reportado:
**USD180/mes por paquete de3CC Teams +3Express**, capacidad3CC; impedir contar Express otra vez. El escenario de
renovación es306USD (+70%), condicional hasta conocer fecha; no activarlo automáticamente.

El estado de cada fuente importa: factura acredita facturado, no pago; operador acredita declaración; tarifa
pública no acredita el plan Efeonce; histórico no acredita salario vigente. Notion factura período21sep–21oct2026:
9usuarios Business×24USD y30USD por3000créditos, componentes separados. No distribuir créditosNotion como otra
licencia obligatoria ni considerar que cada usuario recibe todo ese presupuesto. M365/SEMrush/Claude/ChatGPT
públicos preservan fuente y ventana interna de revisión; renovar evidencias vencidas antes de una nueva selección.
No grabar PDFs privados, tarjetas, domicilios o URLs firmadas en datos/docs.

`clientProvidedTools` exige herramienta/mes/líneas/motivo y fuente confirmada con ventana suficiente. Sólo omite
el costo Efeonce de líneas cubiertas y registra `client-provided`. No sustituye Notion/M365 ni tools de créditos.
No presume acceso de partner, permiso de revender licencia ni saldo real del cliente.

## Capacidad y costos compartidos

`pricing-v3-resource-portfolio/1` declara versión, modo, recurso/plan/mes, cantidad, unidad del driver,
`totalUnits`, `accounts[].units`, `internalUnits`, `unallocatedUnits`, motivo y capacidad contractual cuando aplica.
Cliente + interno + sin asignar = total exactamente. Cuota de cuenta = unidades de cuenta / total; residual
Decimal visible. GCP264USD/mes y Vercel60–100USD/mes son declaraciones: seleccionar escenario explícito del rango,
hasta medir consumo/factura. No inventar denominador ni número de clientes. No cargar capacidad interna o sin
asignar al cliente por omisión. El portfolio opera pools/paquetes; los seats individuales se declaran en demanda.

Ejemplo hipotético Adobe180/capacidad160: cliente40→45USD, interno80→90, sin asignar40→45; no es reparto real ni
porcentaje por defecto. Dentro de una cuenta, attributions noIA se distribuyen por usuarios únicos y créditos por
consumo. No presentar esos pesos como una fórmula de horas que el código no implementa. Portfolio no consulta,
reserva ni controla inventario/concurrencia live. Debe existir declaración de capacidad antes del compromiso.

## Créditos y provisiones

`pricing-v3-credit-catalog/1` + `pricing-v3-credit-budget/1`: cada proveedor usa unidad/currency/plan/packs propios.
Higgsfield base reportada139USD/3000créditos; Magnific40EUR/45000créditos. Presupuesto mensual distingue
`subscriptionCreditsAllocated`, `subscriptionCreditsAvailable`, consumo requerido, `purchaseDate`, `useBy`,
plan activo y repetición de packs permitida. No inventar crédito remanente ni fungibilidad entre proveedores.
El planner minimiza caja de packs discretos para cubrir déficit; atribuye costo base proporcional a créditos
presupuestados y **costo completo del pack extra**, muestra sobrantes/validez. Costo atribuido y nueva caja son
cifras separadas. Higgsfield extra90días; Magnific3años con suscripción activa según captura conservada, pendiente
reconfirmar condiciones/precios cuando corresponda. No habilitar recarga automática ni comprar paquetes.

Notion AI credits son componente explícito separado; no equivalen automáticamente a los créditos Higgsfield,
Magnific o Studio Credits de Globe. Las capturas no autorizan crear equivalencia monetaria de Studio Credits.

Provisiones Assurance/operación/onboarding deben costear actividades reales, no porcentaje residual para cuadrar
precio. `trial-*` de la baseline son placeholders no medidos. Fee genérico de plataforma del Excel (ETG-017) queda
separado de tools y sin marcaDeel; verificar coberturas laborales/EOR para evitar duplicar cargas/plataforma.
El salario declarado10400USD mensual del Consultor HubSpot conserva origen histórico, no costo local vigente.

## Precio, evidencia, redacción y mantenimiento

Kernel Decimal separa factor de talento (costo/localización) del factor de mercado (precio/disposición de pago).
No multiplicar todo indiscriminadamente: humanPrice aplica policy y mercado; recursos tienen sus propias reglas.
`markup`: costo×(1+tasa); `target_margin`: costo/(1−tasa). Margen real=(neto−costo)/neto. No llamar margen a markup,
ni confundir descuento, IVA, FX, setup y costo mensual. FX exige par/dirección/fecha/fuente explícitos; EUR no se
convierte por tasa mental. Redondeo y reconciliación pertenecen al kernel, no al agente o consumer.

`commercialUnit=role_capacity` describe capacidad; `managed_service` conserva funciones/personas como costo
interno y preview agrega fee por periodo más implementación. No vende horas automáticamente ni valida SOW,
entregables, aceptación, límites, responsabilidades, resultados garantizados o renovación del servicio.
`assess` añade gaps por salario/coberturas, provisiones, acceso/capacidad, usuario, impuestos/entidad, alcance y
aprobación. Siempre `requires_review`, `binding=false`. Sus40%/35% son propuestas **no aprobadas**; nunca sustituyen
el piso vigente de una práctica (Creative Studio mantiene45% aprobado) ni decisiones por caso.

`explain` usa el artefacto interno congelado y expone componentes/fuentes: no se entrega al cliente tal cual.
`preview` es proyección allowlist JSON/Markdown sin stack de costos/márgenes/providers/IDs internos/país del talento;
permanece simulación local no vinculante. Replay primero verifica digest y equivalencia con motor registrado;
ninguna de esas operaciones emite cotización, maker-checker, CRMwrite, factura, contrato o mensaje.

Mantenimiento monetario usa change-set `add/replace/retire`, fuente/vigencia/actor/motivo, `baseDigest`,
`nextVersion`; `catalog preview` con impacto de briefs y `catalog apply --confirm previewDigest --out sucesor.json`.
Policy/packs usan `pricing-v3-resource-change/1` con `kind=policy|credits`, baseDigest, motivo y `replacement`
**completo válido**. `resources inspect --credits` devuelve digests; `resources preview|apply` recibe las tres bases
explicitamente y `--impact` array de demandas. Confirmación ata catálogo/policy/créditos (`contextDigests`), base,
sucesor, motivo e impactos; cambiar cualquiera invalida preview. Un costo confirmado cambiado no puede heredar
la fuente anterior; packs modificados exigen nueva evidencia. Apply escribe sucesor local, no activa defaults ni
repricea cotizaciones previas. Cada quote nueva selecciona versión explícita; las anteriores conservan replay.
Mantenimiento no es contrato de indexación al cliente ni monitor automático.

Rollback local: volver a escoger las versiones anteriores para pedidos nuevos; conservar sucesores/artefactos
como evidencia. Sin `--catalog`, la CLI mantiene baseline predeterminada histórica: no suponer que ahora usa el
sucesor operativo. Promoción API/UI/MCP requiere ADR/cutover, datos aprobados, adapters canónicos, permisos,
tenancy, audiencias, snapshots/lifecycle/idempotencia, prueba de paridad, rollout/readback y rollback propios.
No crear fórmulas o autoridad independientes en cada consumer ni dar por desplegado el prototipo local.

## Mapa de implementación y evidencia reusable

| Responsabilidad | Fuente vigente |
| --- | --- |
| Kernel puro, markup/margen, factores, coberturas, FX, rounding | `src/lib/finance/pricing-v3/calculate.ts`, `schemas.ts` |
| Registros/brief/resolución/quote/explicación | `src/lib/finance/pricing-v3/catalog/{contracts,catalog,resolve,quote,explain}.ts` |
| Demanda/policy y atribuciones | `src/lib/finance/pricing-v3/resources/{composition-contracts,composition}.ts` |
| Packs/costo base/caja/caducidad | `src/lib/finance/pricing-v3/resources/credit-budget.ts` |
| Discovery/scaffold/portfolio/plan | `src/lib/finance/pricing-v3/resources/operating.ts` |
| Gaps económicos y proyección comercial redactada | `src/lib/finance/pricing-v3/resources/readiness.ts` |
| Snapshots/digests/IO/mantenimiento local | `src/lib/finance/pricing-v3/adapters/{local-snapshot,catalog-local,resource-composition,resource-maintenance}.ts` |
| Adapter CLI, flags, exit y escritura exclusiva | `scripts/commercial/pricing-v3.ts` |
| Regresiones y negativos | `src/lib/finance/pricing-v3/__tests__/`, `pnpm pricing:v3:test` |

Versionar y conservar originales: `data/pricing/v3-catalog/` y `v3-composition/` son fixtures previas; sucesores y
casos operativos están en `v3-operating/`, créditos en `v3-resources/`. No convertir fixtures, synthetic access o
`portfolio.example.json` en default de cartera. `historical-resource-index.json` conserva26filas del Excel:
25tools y fee de plataforma; tools registradas no equivalen a todos los planes/precios actuales confirmados.
`operational-gaps.json` conserva owner/acción de costos salariales, provisiones, asignación/acceso, licencia,
margen, impuestos y SOW. Cerrar esos gaps con evidencia; no inferirlos del número de pruebas o de un commit.

Las fuentes y cambios locales no acreditan adopción API/UI/MCP, sincronización remota, aprobación económica,
inventario, persistencia o emisión. Si se cambia la arquitectura o un contrato, actualizar su dueño en docs,
sincronizar este router/referencia y mirrors y correr los gates proporcionales; evitar duplicar spec en skills.
