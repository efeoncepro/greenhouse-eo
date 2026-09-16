# Efeonce Insights — Dominio de ediciones (deck, informe A4 y web)

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.2
> **Creado:** 2026-09-15 por Claude (TASK-1845)
> **Ultima actualizacion:** 2026-09-16 por Claude (TASK-1846, render durable code complete)
> **Documentacion tecnica:** [EFEONCE_INSIGHTS_ARCHITECTURE_V1.md](../../architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md) · [ADR](../../architecture/EFEONCE_INSIGHTS_PLATFORM_DECISION_V1.md) · EPIC-045

## Qué es

Efeonce Insights convierte la evidencia de un cliente (SEO, visibilidad en IA, entrega ICO) en una
**edición**: un informe congelado para un período, con versión, identidad legible (`EO-INS-000123`)
y las mismas cifras en deck, informe vertical y web. Greenhouse guarda la biblioteca, el encargo, los
permisos y el ciclo de vida; los módulos siguen siendo dueños de sus métricas.

La vista web que se comparte por enlace no vivirá en el portal: se mostrará en `think.efeoncepro.com`, el mismo
hub que hoy muestra el informe de visibilidad en IA. Greenhouse sigue siendo dueño del dato y del enlace; Think
sólo lo dibuja (decisión del 2026-09-15). La biblioteca para pedir y revisar informes sí queda en el portal.

Hoy (TASK-1845) existe el **núcleo**: crear un encargo, recolectar evidencia, redactar el plan y dejar
la edición lista para revisión. **Todavía no se renderiza ningún PDF ni vista web, no se comparte por
enlace ni se envía por correo** (unidades posteriores del programa). Y como emitir exige salidas
validadas, **hoy ninguna edición puede emitirse**: llega hasta `ready_for_review`.

## Cómo se comporta

| Paso | Qué pasa | Quién puede |
| --- | --- | --- |
| Catálogo | Dice qué módulos están disponibles para esa organización y por qué no cuando no lo están (módulo SEO/AEO sin asignar, sin spaces activos para ICO), salidas, audiencias y límites | Quien tenga `insights.report.read` sobre la org |
| Encargo | Módulos, período `[inicio, fin)` en su zona horaria, comparación (período anterior, año anterior, custom), audiencia, salidas, idioma, profundidad, clave de idempotencia | Interno con `insights.edition.create`; cliente sobre su propia organización (roles executive/manager) |
| Generación | `collecting` (cada módulo aporta hechos con unidad, población, cobertura, corte y método; lo ausente se declara, nunca es cero) → `composing` (plan determinista; IA opcional que sólo reescribe texto validado) → `validating` (cada cifra del plan referencia un hecho; un módulo sin evidencia bloquea salvo omisión explícita) → `ready_for_review` | Sistema, por fases; cada fase queda en el historial |
| Revisión y emisión | Emitir es un acto humano separado con `insights.edition.issue` y exige salidas validadas; corregir crea una versión nueva; una emitida sólo se retira | Admin/Account internos; el cliente no emite hoy |
| Lectura | El cliente ve sus ediciones con estado resumido (`in_progress`, `in_review`, `issued`, `needs_attention`) y la evidencia sólo de emitidas; el interno ve el ciclo completo y el historial | Según audiencia |

## Reglas que importan

- **Ausente no es cero.** Si una fuente no cubre la ventana (ETV e ICO sólo sirven meses completos; el
  grader AEO sólo si corrió dentro del período) la edición lo dice con su motivo.
- **Una edición emitida no cambia.** Snapshot y plan quedan sellados con hash; cualquier corrección
  es otra versión del mismo reporte.
- **La organización nunca viene del payload.** El cliente opera su propia cuenta; el interno declara la
  cuenta y el sistema la revalida en cada acción. Sin el módulo `insights_v1` asignado, la organización
  simplemente no existe para ese actor.
- **Misma clave de idempotencia + mismo encargo = misma edición.** Misma clave con encargo distinto se
  rechaza.
- **La IA no calcula ni emite.** Sólo puede reescribir frases; si cambia una cifra se descarta.

## Qué ve cada persona

| Quién | Qué puede hacer | Qué ve de una edición |
| --- | --- | --- |
| Cliente (roles executive/manager de su organización) | Ver el catálogo y sus ediciones; pedir una edición sobre su propia cuenta | Estado resumido (`in_progress`, `in_review`, `issued`, `needs_attention`, `withdrawn`). **La evidencia y el plan aparecen sólo cuando la edición está emitida**; antes vienen vacíos, y no es un error |
| Cliente (rol specialist) | Sólo lectura | Igual que arriba, sin poder pedir ediciones |
| Interno (Admin, Account) | Todo: catálogo, pedir, revisar, corregir, emitir, retirar, recuperar | Ciclo completo, evidencia sellada con hechos y rechazos, plan congelado con sus límites, historial de transiciones |
| Interno (Operations) | Catálogo, pedir, revisar y recuperar; **no emite** | Igual que Admin/Account en lectura |
| Agente por MCP | Catálogo, listar, leer y (con permiso de escritura) pedir; **nunca emite** | Lo que su vínculo con la organización permita |

Como emitir todavía no es posible, hoy un cliente que pide una edición la verá quedar en `in_review` sin
cifras visibles: eso es lo esperado hasta que exista el render (TASK-1846) y un interno la emita.

## Estado de disponibilidad (2026-09-16)

**Disponible en producción** desde el 2026-09-15 para las organizaciones que tengan el módulo `insights_v1`
asignado. Lo que está encendido y lo que no:

| Capacidad | Estado | Nota |
| --- | --- | --- |
| Pedir una edición y generarla hasta `ready_for_review` | **Encendida** en staging y producción | Flag `INSIGHTS_GENERATION_ENABLED=true` en Vercel (staging y producción); en Preview sigue apagada |
| Emitir una edición | Apagada y bloqueada | Flag `INSIGHTS_ISSUANCE_ENABLED` OFF; además exige que todos los outputs pedidos estén renderizados y validados (hoy ninguno lo está, porque el render no está desplegado) |
| Redacción asistida por IA | Apagada | Flag `INSIGHTS_AUTHORING_AI_ENABLED` OFF; el plan sale del redactor determinista |
| Pedir el render del **deck PDF** de una edición | Construido, **apagado** en todos los ambientes | Flag `INSIGHTS_RENDER_ENABLED` OFF y el worker de render sin desplegar (TASK-1846: `code complete, rollout pendiente`). Cuando se encienda, el deck se produce en segundo plano y se consulta por su `run` |
| Informe A4, vista web, enlace compartido, correo, recurrencia | No existen todavía | TASK-1847, 1848, 1849 y 1875 |
| Pedir una edición desde un agente externo por el gateway MCP | Lectura sí; escritura todavía no | Las cuatro herramientas están publicadas; crear exige un permiso de escritura que ningún cliente tiene aún (`insufficient_scope`) |

**Cómo se habilita una organización.** Un interno asigna el módulo `insights_v1` a la organización con el
script `scripts/insights/assign-insights-module.ts --org=<id>` (primero sin `--apply` para ver qué haría;
con `--apply` para asignarlo). Pasa por el mismo camino que cualquier módulo del portal cliente (con auditoría),
y es idempotente: si ya estaba, no duplica. Sin el módulo, la organización simplemente "no existe" para
Insights.

**Qué se probó.** En staging, una organización sintética con el módulo asignado pidió ediciones desde el portal
(`EO-INS-000012`) y desde un consumer del ecosistema (`EO-INS-000013`); repetir el mismo encargo devolvió la
misma edición; cambiar el encargo con la misma clave fue rechazado; una organización sin módulo respondió "no
encontrado". En producción se repitió el pedido por el ecosistema (`EO-INS-000014`). En los tres casos la
edición quedó `ready_for_review` **con evidencia de cero hechos**: la organización sintética no tenía datos
ICO en los meses pedidos, así que el snapshot declara cuatro rechazos "sin datos" y el plan lo dice en sus
límites. Es decir: se verificó que la ausencia se declara con honestidad, no todavía un informe con cifras
reales de un cliente.

**Qué falta para cerrar TASK-1845.** Dos evidencias operativas (ensayo de reversión de la migración en la base
compartida y una sesión MCP con un usuario humano que liste las herramientas publicadas). Hasta entonces la
task sigue `in-progress`, aunque la capacidad ya esté en producción.

> Detalle técnico: arquitectura §14 (estado, rollout, límites e invariantes); dominio `src/lib/efeonce-insights/**`; rutas
> `src/app/api/platform/{app,ecosystem}/insights/**`; migración
> `migrations/20260915100154428_task-1845-insights-foundation.sql`; script
> `scripts/insights/assign-insights-module.ts`; flags en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`.
