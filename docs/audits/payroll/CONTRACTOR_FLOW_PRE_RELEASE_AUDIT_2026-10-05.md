# QA Release Audit - Flujo general de contractors

## Verdict

**CONDITIONAL PASS — implementación local; producción pendiente**

Closure state: A01–A09 corregidos localmente bajo TASK-2009/2010 por autorización «Corrígelos todos». Nueva revisión: R03–R06 corregidos y 333 regresiones PASS; prueba de locks en PostgreSQL local aislado PASS, además de diez casos runtime de sólo lectura y GVC premium desktop/mobile sin findings. Suite global posterior: 18.014 PASS / un FAIL ajeno de SVG AXIS / 48 skipped; build completo PASS. Release, canary integral y recuperación histórica siguen pendientes. Los resultados anteriores se conservan como historia, sin declarar producción recuperada.

## Scope

- Todos los contractors que usan los commands y superficies compartidas de envío, adjuntos, revisión, readiness, obligación y orden de pago. No es una reparación específica por nombre, correo, país o engagement.
- Código del checkout `b12ad97b4760fc209896b606e7f08c0457ba989a` más el fix local de ISSUE-179; contraste de solo lectura contra PostgreSQL runtime el 05/10/2026. No se afirma que toda esta revisión haya sido ejecutada contra endpoints del deploy productivo.
- Creación por entregable/hito/horas, tarifa acordada, moneda, pertenencia de assets/envíos, reintentos, períodos consecutivos, pagos fuera de corrida, cancelación y pago parcial. Suites existentes cubren además readiness internacional, FX/provider, cálculos, remittance y agrupación por moneda.
- Cambios propios: composer/validación de período de ISSUE-179, sus pruebas y documentación. Trabajo comercial/SEO ajeno en el checkout queda fuera del alcance.
- Cero escrituras reales de identidad, submissions, assets, cobros, pagos o eventos. Cero correos, commit, push, CI dispatch o deploy.

## Risk Classification

| Risk | Level | Why |
| --- | ---: | --- |
| Access / integrity of private evidence | Alto | El endpoint propio acepta identificadores de assets y submissions sin validar pertenencia. |
| Finance / payroll | Alto | Un pago puede perder su vínculo, bloquearse al cancelar o declararse completo siendo parcial. |
| Workflow / period correctness | Alto | Reintentos duplican envíos; una boleta anterior satisface readiness de períodos posteriores. |
| UI action routing | Medio | Acciones de consulta abren creación y pueden inducir envíos duplicados. |

## Injected Skills

- `greenhouse-payroll-auditor` + `greenhouse-finance-accounting-operator`: montos acordados, cobro, obligación, settlement y separación de funciones.
- `software-architect-2026` + `greenhouse-secret-hygiene`: contrato del command, acceso, consistencia y consultas sin exponer credenciales.
- `greenhouse-ai-design-studio`, `greenhouse-portal-ui-implementer`, `greenhouse-vuexy-ui-expert`, `greenhouse-ux-content-accessibility`: formulario real, estados y acciones.
- `greenhouse-browser-diagnostics`, `greenhouse-qa-release-auditor`, `greenhouse-documentation-governor`: evidencia proporcional, veredicto y handoff.
- `greenhouse-production-release`: frontera de publicación; no se ejecutó release.

## Evidence

| Gate | Result | Evidence |
| --- | --- | --- |
| Regresión existente y fix de período | PASS local | 262 pruebas unitarias, incluyendo las 188 del dominio contractor. Suites de órdenes, cascada/email y uploader. Se ejecutó únicamente el proyecto `unit`; ningún live test. |
| Reproducciones adversariales | 15 defect probes reproducidos | API con monto/moneda arbitrarios (3 tipos), reintento, referencias ajenas, unique-constraint, composer real (fallo intermedio, período siguiente y tres CTA), cancelación y falta de validación de saldo. **Que estos probes pasen confirma el comportamiento defectuoso; no es un gate de corrección.** |
| Código/schema de evidencia | Defecto confirmado | FK individual de submission + UNIQUE engagement/asset; ninguna constraint compuesta de pertenencia. Runtime sólo tiene triggers anti-UPDATE/DELETE. |
| Pagos runtime | Drift observado | Un payable de un engagement con orden `paid`, sin vínculo/estado consistente en contractor. Es EO-CPAY-0002, neto 174.193,55 CLP; no se volvió a pagar ni se corrigió el dato. |
| Alcance agregado runtime | Sin otros casos observados en esas consultas | 0 vínculos de evidencia entre engagements diferentes; 0 líneas parciales contractor en órdenes pagadas; 0 payables actualmente enlazados a órdenes canceladas. No demuestra ausencia de abuso ni cubre todos los escenarios históricos. |
| Lint / TypeScript / diff de ISSUE-179 | PASS local | Ver issue; sin cambio de schema/credenciales. |
| GVC fechas | PASS fixture local | Desktop/mobile y request ISO interceptado, en la evidencia de ISSUE-179. No es canary productivo de envío/pago. |
| Observabilidad del intento individual | Incompleto | Sin payload/log del intento concreto de Valentina; Vercel logs agotaron presupuesto y Sentry local carece de token. La atribución individual al defecto de fecha sigue como hipótesis. |
| QA mecánico del checkout | BLOCK ajeno | Closure blockers comerciales ya documentados; no se modifican para hacer verde la revisión. Los blockers propios de este informe bastan para impedir el release funcional. |

Logs, snapshots de los probes retirados y manifiesto agregado: `.captures/contractor-pre-release-audit/`. Primera corrida: 44 archivos / 276 tests PASS (262 ordinarios + 14 probes). Segunda corrida focal: 4 archivos / 15 probes PASS, incorporando apertura del período siguiente. Los harness temporales fueron retirados de `src/` para no convertir expectativas de bugs en tests verdes permanentes.

## Blockers

### A01 — Fechas localizadas llegan a un cast SQL (P1; corregido localmente)

`self-service-scenario.ts` entrega una etiqueta como `20 ago - 31 ago 2026`; el composer anterior la enviaba como `servicePeriodStart` y el command hacía `$5::date`. SELECT reproduce `22007`. Fix local usa fechas explícitas y valida fechas/rango antes de SQL. La API conserva compatibilidad con valores nullable históricos; no se infiere automáticamente un período nuevo.

Fuente y cierre pendiente: [ISSUE-179](../../issues/open/ISSUE-179-contractor-submission-localized-period-date.md).

### A02 — Monto y moneda editables por API self-service (P1; detectado en auditoría, corregido localmente)

`src/app/api/my/contractor/work-submissions/route.ts` transmite `body.grossAmount` y `body.currency` al writer. El writer sólo deriva el monto cuando el valor recibido es null. Un contractor con únicamente la capability propia puede presentar 900 USD contra un acuerdo de 1.000 CLP. Se reprodujo el forwarding para deliverable, milestone y timesheet, sin DB real. El guardrail de excesos no corrige una moneda cambiada ni un monto inferior arbitrario.

Corregir la frontera self-service: tomar moneda/tarifa del engagement; admitir únicamente los inputs de trabajo autorizados. Conservar el carril administrativo que necesita cantidades/montos explícitos para prorrateos gobernados. Verificar rate types por período y unitarios, sin recalcular dinero en la UI.

### A03 — Adjuntar no valida pertenencia del asset ni del envío (P1; detectado en auditoría, corregido localmente)

`src/app/api/my/contractor/attach-asset/route.ts` resuelve el engagement propio pero acepta IDs externos de asset/submission. `src/lib/contractor-engagements/invoice-assets.ts` verifica existencia/contexto del asset y existencia del engagement; no verifica ownership del asset ni que la submission pertenezca a ese engagement. `attachAssetToAggregate` comprueba escaneo, pero no autorización del actor. La FK existente sólo asegura que la submission existe. Los probes aceptaron un asset con owner/user distinto y una submission ajena.

Validar autorización de asset y pertenencia de submission en el command autorizado, con consistencia dentro de la transacción. Reutilizar la política canónica de storage (`canTenantAccessAsset`) donde corresponda; distinguir self-service y cargas autorizadas on-behalf. La consulta global no encontró links cruzados existentes; no se intentó explotar el defecto sobre personas reales.

### A04 — Guardado parcial y reintentos crean envíos adicionales (P1; detectado en auditoría, corregido localmente)

El composer primero crea **y presenta** un envío; después adjunta invoice y evidencia mediante requests separados. Si invoice funciona y evidencia falla, queda un envío presentado, la UI muestra error y el reintento crea otro. Re-adjuntar la misma invoice viola UNIQUE `(engagement_id, asset_id)` y vuelve como 500 genérico. Se reprodujo en el componente real: dos requests presentados, fallo intermedio, invoice repetida, ningún aviso de éxito.

Además, cerrar/reabrir el drawer tras un éxito conserva las fechas y assets anteriores: se reprodujo el segundo envío con el mismo período y asset. Resolver persistencia por intento, reanudación del draft y presentación posterior a adjuntos completos; adjuntar repetido debe tener resultado idempotente. Resetear el formulario de un nuevo período sin perder un draft incompleto.

### A05 — Un soporte anterior habilita períodos posteriores (P1; detectado en auditoría, corregido localmente)

El composer calcula `requiresInvoice`/`needsEvidence` a partir del éxito del engagement anterior. El nuevo envío puede presentarse sin elegir nuevos documentos, reproducido en UI. La invoice se adjunta sin `contractorWorkSubmissionId`. `assessPayableReadiness` en `src/lib/contractor-engagements/payables/store.ts` acepta cualquier invoice/tax XML de la lista completa del engagement, sin cotejar submission, invoice o período y sin consultar el estado actual del asset.

Vincular y validar el documento contra el cobro/período correspondiente; preservar el histórico. Un PDF de agosto no debe volver verdadero el gate documental de septiembre. Revalidar existencia/accesibilidad del soporte; no resolver quitando `requiresInvoice`.

### A06 — Orden creada fuera de corrida pierde la sincronización del contractor (P1; código corregido localmente; drift runtime pendiente)

La corrida mensual llama `markPayablePaymentOrderCreated`; `createPaymentOrderFromObligations` y `scripts/finance/contractor-payable-backdated-settlement.ts` no lo hacen. El script supone que la cascada escribe el back-link, pero la cascada `contractor-payable-paid-cascade.ts` **sólo busca** payables ya enlazados y en `payment_order_created`. EO-CPAY-0002 tiene obligación/orden paid y payable `obligation_created` con order ID null; por eso queda fuera y no habilita comprobante/email de paid.

Unificar el contrato de vinculación para todos los entrypoints de órdenes contractor y hacer reconciliable el drift. Recovery separado, idempotente y sin otro desembolso. Antes de corregir datos, revisar efectos downstream del evento paid, incluidos comprobante/email: ninguna reparación fue aplicada en esta auditoría.

### A07 — Cancelar una orden impide preparar su reemplazo (P1; detectado en auditoría, corregido localmente)

`cancelPaymentOrder` devuelve la obligación a generated y libera sus lines. No restituye el estado/vínculo contractor. El barrido mensual incluye esa obligación, pero `markPayablePaymentOrderCreated` rechaza una nueva orden cuando el payable conserva `payment_order_created` de la anterior; exige `obligation_created`. Probe reproduce 409 `payable_not_obligation_created`. Esto puede abortar el grupo completo de la corrida.

Definir y auditar la transición de cancelación/reasignación de vínculo, con verificación de que la orden anterior realmente es terminal y de que no hubo settlement. No permitir reemplazar órdenes vivas. Cero casos enlazados a órdenes canceladas en el readback agregado actual.

### A08 — Pago parcial puede cerrar toda la obligación y el payable (P1; detectado en auditoría, corregido localmente)

`createPaymentOrderFromObligations` permite `partialAmounts` inferiores al total. `mark-paid-atomic.ts` marca la obligación paid si no existen lines vivas, sin comparar la suma liquidada con su importe. La cascada contractor marca paid por vínculo/estado y `markPayablePaid` no comprueba saldo liquidado. Probe del writer confirma que actualiza paid sin leer obligación/lines. La combinación permite registrar un pago completo y comprobante de neto completo tras una orden parcial.

Validar importe liquidado acumulado y moneda en el owner Finance; conservar saldo parcial pendiente y emitir cierre/comprobante completo sólo al agotarlo. Si el dominio contractor no soporta parciales, rechazarlos explícitamente antes de crear la orden. El readback no encontró líneas parciales contractor pagadas actualmente; no se ejecutó un pago parcial real.

### A09 — CTA de consulta abre creación (P2; detectado en auditoría, corregido localmente)

`ContractorSelfServiceView.handlePrimaryAction` distingue sólo disputed; todas las otras ramas abren el composer. Probes del componente real: `Ver comprobante`, `Ver envío` y `Ver pendientes` abren `Preparar envío`. En closure, además, el writer prohíbe submissions nuevas.

Conectar cada acción a su destino real, reutilizando las vistas/drawers/links existentes. Ofrecer crear otro período mediante una acción explícita sólo cuando el engagement lo permita.

## Conditional Follow-Ups

1. Convertir estos hallazgos en unidades de reparación por owner: límite self-service/soportes, flujo transaccional de envío, y lifecycle Finance/cascadas. No mezclar una recuperación de datos con un refactor UI.
2. Identificar/proponer ADR para cambios de acceso, vínculo/settlement y contrato documental, contrastando primero el canon contractor, Finance y storage. La auditoría no modifica esas decisiones.
3. Reemplazar los probes de caracterización por regresiones que exijan el comportamiento correcto y fallen antes del fix. Mantener negativo probado, incluido rechazo de evidencia ajena y pago parcial/cancelado.
4. Canary integral con fixture autorizada: draft → upload/attach → submit → review → readiness → obligación → orden → cancel/retry o settlement → payable/recibo. Cualquier etapa que emita documentos/comunicaciones requiere alcance explícito y control de destinatario.
5. Revalidar despliegues de portal/worker, outbox y readback del dato corregido tras un release autorizado. Un lint/test/capture local no acredita recuperación productiva.

## False-Closure Traps Checked

- Tests verdes pero runtime faltante: sí; las reproducciones verdes confirman fallos, no aprobación de release.
- Captura UI ausente: existe GVC local para las fechas; aún falta canary integral de soporte/pago con fixes posteriores.
- Env/flag/redeploy/backfill: no se cambiaron; recuperación de drift y promoción siguen pendientes.
- Docs/task lifecycle: ISSUE-179 sigue open; informe y handoff registran la revisión general y los blockers.
- Sentry/observabilidad: intento individual sin payload; no se presenta su causa como confirmada.

## Final Call original — antes de remediación

No promover todavía. La reparación de fecha es común a todos los contractors, pero quedan fallos compartidos de autorización, documentos, reintentos y estado financiero. El único drift observado en los conteos actuales es el pago de agosto de Valentina; los demás hallazgos se confirmaron en código, schema o probes aislados. Corregir y verificar esas fronteras antes de autorizar un release; esta auditoría no pagó, publicó ni contactó a nadie.


## Remediación autorizada y verificación local — TASK-2009/2010

| Hallazgo | Corrección implementada | Evidencia de regresión |
| --- | --- | --- |
| A01 Fechas | Fechas ISO explícitas; validación antes de SQL y al editar borrador | `service-period.test.ts`, `store-period.test.ts`; GVC |
| A02 Monto/moneda | API propia no acepta dinero; command deriva tarifa, unidad y moneda | `self-service.test.ts`, `work-submissions/route.test.ts` |
| A03 Scope | Member/asset/submission/contexto comprobados; upload no puede forjar owner; vínculo repetido idempotente | `invoice-assets.test.ts`, `assets/private/route.test.ts` |
| A04 Reintentos | Clave estable + advisory lock; draft/adjuntos/submit en una transacción; volver al draft y limpiar al enviar | `self-service.test.ts`, `submission-flow.test.tsx` |
| A05 Período | Soporte del envío actual, fecha snapshot y asset attached; cambios de fecha invalidan soporte legado sin snapshot | PostgreSQL CTE 10 casos; mapper y tests de adjuntos |
| A06 Órdenes fuera de corrida | Generic creator vincula payable en la misma tx; cascade descubre por obligación y converge atómicamente | `create-contractor-order.test.ts`, cascade tests |
| A07 Cancel/retry | Reemplazo sólo con orden cancelada/fallida sin líneas pagadas y nueva orden de la misma obligación | `payment-lifecycle.test.ts` |
| A08 Parciales | Modelo contractor completo: rechaza parcial/zero y obligación parcialmente pagada; preview mensual no anuncia monto entero; settlement y paid exigen pago completo | Creator, monthly-run, mark-paid-atomic y lifecycle tests |
| A09 Consultas | Consulta enfoca sección existente; preparar otro período es explícito; responder observación usa el mismo envío | `submission-flow.test.tsx` |

Además: cantidad decimal de horas/días correcta; protección del borrador/prorrateo preparado por HR; error siempre visible; labels/chips con contraste, región de scroll nombrada y foco visible en formularios.

### Evidencia vigente

- 47 archivos / **321 tests PASS**, incluidas fronteras API, uploader, Finance, cascade y consumidor email con mocks (ningún correo real).
- **Lint focal, TypeScript global y build completo local PASS**; tsconfig restaurado por el wrapper. TS2322 en el fixture de tarifas del test UI corregido con unión literal; suite y typecheck repetidos PASS. Estado final, hashes y logs en `.captures/contractor-fix-qa/verification.json`; no equivalen a CI ni deployment.
- Falsificación de cuatro guards críticos: quitar idempotencia, scope del envío, rechazo de parciales o confirmación de paid vuelve rojas sus regresiones; código restaurado y suite completa verde. `.captures/contractor-fix-qa/falsification.json`.
- PostgreSQL real, sólo SELECT/CTE con filas ficticias, usando el SQL extraído del reader actual: diez casos correctos, incluidos deleted/pending/foreign/previous/period-edited. `.captures/contractor-fix-qa/read-only-sql.json`.
- GVC premium con componentes reales y respuestas interceptadas: `.captures/2026-10-05T21-01-45_contractor-integrity-local/`, desktop 1440×1000 y mobile 390×844, diez frames, foco/reduced motion, cero hallazgos y cero errores runtime. Dossier generado e imágenes de error, datos y foco inspeccionadas. Sin baseline diff activo; no se promociona un baseline nuevo.
- Fixture/DSL temporales archivados en `.captures/contractor-fix-qa/source/` y retirados de rutas del build. Preview financiero 21:06Z vuelve a confirmar **un** candidato; ningún apply.

### Gates de cierre y alcance

Task lint de TASK-2009/2010: cero errores/warnings. Documentation closure PASS. `qa:gates --changed --agent codex` permanece **BLOCK** por ocho gates de licitaciones ajenas del checkout compartido; no se modificaron ni eludieron. Su aviso de GVC está cubierto por la captura y revisión enlazadas; los avisos de runtime se mantienen pendientes. La revisión visual manual está en `.captures/contractor-fix-qa/ui-review.md`. No se declara el gate general verde.

### Cierre runtime pendiente

Portal y worker deben promoverse por el carril gobernado, con readback y canary integral aislado. El [plan concreto de recuperación](../../operations/CONTRACTOR_PAID_DRIFT_RECOVERY_2026-10-05.md) sólo vincula y cierra el cobro ya pagado; declara audit/outbox y posible comprobante/email. No se crea otra transferencia. Este trabajo no publicó, pagó, modificó identidades ni contactó a nadie.


## Revisión adicional de regresiones — solicitud del operador

La revisión detectó dos bordes en la implementación local y los corrigió antes de cualquier publicación:

- **R01 / A06 — cascade concurrente:** dos consumers pueden leer el mismo candidato antes de adquirir el lock. Si el primero ya lo dejó paid, el segundo devolvía un conflicto al registrar el vínculo. La misma orden ahora devuelve el registro paid sin transición ni evento adicional; otra orden continúa rechazada. El test falló antes del ajuste y pasó después.
- **R02 / A03 — identidad del vínculo de invoice:** repetir asset/submission/role con otra invoice devolvía éxito usando la fila vieja. La identidad idempotente exige también la misma invoice; cambiarla produce conflicto. El test falló antes y pasó después.

Compatibilidad demostrada: creación genérica de parciales payroll/manual/vendor sigue permitida; Finance conserva adjuntos on-behalf de provider invoices y su replay. No se cambiaron fórmulas de retención, schema ni UI en esta segunda pasada.

Evidencia final en `.captures/contractor-regression-review-2026-10-05/verification.json` y sus logs/hashes: **321 pruebas focales PASS**, TypeScript/lint/build completo PASS, contratos de build y dependencias runtime de los cinco workers PASS. La suite ampliada inicial pasó 2.367 pruebas/302 archivos; la suite global posterior terminó con 18.007 tests PASS, uno FAIL y 48 skipped (1.974 archivos PASS, uno FAIL, cuatro skipped). No se presenta como globalmente verde.

La única falla global es sincronía byte a byte de SVG de marca con `@efeoncepro/axis-brand-assets`; siete SVG del catálogo deck difieren del paquete instalado. Los siete archivos locales son byte a byte los de HEAD, y ni el test ni sus inputs dependen de contractors. Comparación read-only en `brand-baseline-comparison.json`; no se modifica ese trabajo ajeno para limpiar el reporte. Los ocho blockers de licitaciones del gate general también permanecen.

Veredicto: **CONDITIONAL PASS para el cambio propio**, sin otras regresiones detectadas en el alcance probado. Release coordinado, canary real y recuperación histórica siguen pendientes; ningún pago, email, push ni deploy fue ejecutado.

## Segunda revisión adicional — «vuelve a revisar tu trabajo»

La revisión volvió a probar concurrencia real, persistencia de snapshots, edición por HR y precisión del schema. Detectó y corrigió cuatro bordes adicionales en el código local:

| ID | Caso reproducido | Corrección y evidencia |
| --- | --- | --- |
| R03 / A04 | El command propio bloqueaba engagement con `FOR UPDATE` y esperaba submission; attach sostenía submission con `FOR SHARE` y su INSERT necesitaba FK key-share del engagement. PostgreSQL abortó attach con `40P01`. | `FOR NO KEY UPDATE` conserva exclusión de cambios de tarifa/estado y permite el key-share. Probe local de tres conexiones: ambos commands terminan y una edición concurrente del acuerdo sigue bloqueada hasta liberar el command propio. `lock-before.json` / `lock-after.json`. |
| R04 / A02 | Cambiar tarifa del acuerdo mientras el envío seguía draft actualizaba bruto/moneda pero dejaba el snapshot de tarifa anterior. | El coordinador propio pasa la tarifa bloqueada al writer compartido de borradores. API propia no acepta el snapshot del caller. Test rojo antes/verde después; al retirar sólo la persistencia del snapshot vuelve a fallar y el guard fue restaurado. |
| R05 / A05 | Cambiar fechas desde HR eludía la marca usada para invalidar soporte legacy sin snapshot de período. | El writer compartido marca todo cambio de fecha y conserva una marca previa aunque `metadataPatch` solicite `false`. Dos regresiones rojas antes/verdes después; aplica a HR y self-service. |
| R06 / A02 | Cantidad con más de cuatro decimales se redondeaba en `NUMERIC(18,4)` independientemente del importe. Ejemplo local: 1,123456 × 1.000 produce 1.123,46, pero la cantidad persistida 1,1235 implica 1.123,50. Una cantidad 0,00001 se guardaba cero con bruto positivo. | Self-service rechaza cantidades que el schema redondearía, antes de escribir, con error de dominio accionable; acepta hasta cuatro decimales. Dos casos rojos antes/verdes después y caso límite permitido. Confirmación en PostgreSQL aislado: `quantity-postgres.json`. |

El probe usa exclusivamente un cluster temporal local PostgreSQL 18.6 con Unix socket privado, sin listener TCP; crea tablas ficticias mínimas, termina conexiones, detiene el servidor y elimina el cluster. No usa credenciales ni modifica la base compartida. Los guards unitarios usan transporte/DB simulados, y se conserva esa distinción respecto del probe real.

**Verificación posterior a R06:** 47 archivos / 333 tests focales PASS; lint de los archivos ajustados PASS; build completo local (incluido TypeScript) PASS, con tsconfig restaurado; los cinco contratos de build/runtime dependencies de workers PASS. La suite global terminó con **18.014 PASS / un FAIL / 48 skipped**, en 1.974 archivos PASS / uno FAIL / cuatro skipped. El único fallo sigue siendo SVG AXIS: los siete inputs continúan idénticos a HEAD y distintos del paquete instalado, confirmado nuevamente. Comandos, hashes y pruebas antes/después en `.captures/contractor-review-2-2026-10-05/verification.json`. Gate general BLOCK por las mismas ocho licitaciones ajenas. No se presenta la suite global ni el rollout como verde.

No cambiaron los componentes UI en esta revisión; se conserva la evidencia GVC previa con fixtures locales y el canary integral real pendiente. Ningún commit, push, deploy, pago, email ni recovery de datos reales.
