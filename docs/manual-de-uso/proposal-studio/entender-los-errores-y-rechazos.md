# Entender los errores y rechazos del Proposal Studio

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-07-12 por Claude
> **Ultima actualizacion:** 2026-07-12 por Claude
> **Modulo:** Comercial — Proposal Studio + Artifact Renderer (`TASK-1392` / `TASK-1391`)
> **Documentacion tecnica:** [GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md)

## Para qué sirve

Este sistema **rechaza mucho, y a propósito**. Una oferta es un documento contractual que evalúa un
comité: un archivo inadmisible, una cifra sin fuente o un costo interno filtrado no son "warnings" — son
la diferencia entre ganar y quedar fuera. Por eso todos los gates **fallan cerrado**: ante la duda, no
producen nada.

Este manual traduce cada rechazo: qué significa, **por qué el sistema lo bloquea**, qué hacer y si
alcanza con reintentar o hay que rehacer el artefacto.

## Antes de empezar

Hay **dos momentos** distintos en los que algo puede fallar, y se diagnostican distinto:

| | **Al pedir el render** (enqueue) | **Durante el render** (worker) |
|---|---|---|
| Dónde ocurre | Vercel / el command `requestProposalRender` | Cloud Run Job `artifact-worker` |
| Qué queda registrado | **Nada**: no se crea ningún job | Una fila en `proposal_render_jobs` con `state = failed` o `dead_letter` y un `failure_code` |
| Cómo lo ves | La respuesta HTTP (`422`, `409`, `403`…) | `GET …/render-jobs/{renderJobId}` → campos `failureCode` y `failureDetail` |
| Cómo se arregla | Corriges el input y vuelves a pedir | Reintentas (si es reintentable) o corriges y pides un render **nuevo** |

Para leer el estado de un job:

```bash
pnpm staging:request "/api/commercial/proposals/prop-…/render-jobs/prnd-…?ownerOrgId=org-2df565fb-…"
```

O por SQL:

```sql
SELECT state, failure_code, failure_detail, attempts, max_attempts
  FROM greenhouse_commercial.proposal_render_jobs
 WHERE render_job_id = 'prnd-…';
```

## Paso a paso — cómo diagnosticar cualquier rechazo

1. **¿Se creó un job?** Si la API devolvió error y no tienes `renderJobId`, es un rechazo **de enqueue**
   → tabla 1. Si tienes un job con `state = failed`/`dead_letter`, es un fallo **de render** → tabla 2.
2. **Lee el `failureDetail`.** No es decorativo: dice exactamente qué lámina, qué archivo, qué requisito
   o qué hash.
3. **Mira si es reintentable** (columna "¿Reintentar sirve?" de la tabla 2). Si no lo es, reintentar
   devuelve `409 proposal_render_conflict`: el mismo manifest produce el mismo rechazo. Hay que corregir
   y **encolar un render nuevo** (el manifest de un job es inmutable).
4. **Si el fallo es del ciclo de la propuesta** (transiciones, cotización, permisos) → tabla 3.

---

## Tabla 1 — Rechazos AL ENCOLAR (no se crea ningún job)

| Código interno | HTTP | Qué significa en simple | Por qué el sistema lo rechaza | Qué hacer |
|---|---|---|---|---|
| `flag_disabled` | `422 proposal_render_rejected` | El pipeline de render está apagado en este ambiente. | El render productivo está cerrado por diseño donde no se autorizó (hoy: Vercel Production no tiene la variable). No se encola trabajo que nadie va a ejecutar. | Usa el CLI (`pnpm deck:compose`) para iterar, o encola desde staging. Abrir producción exige sign-off del operador. Ver [operar-el-artifact-worker.md](operar-el-artifact-worker.md). |
| `audience_violation` | `422 proposal_render_rejected` | Pediste un artefacto para el comprador (`client_facing`) siendo un script/agente, no una persona. | Enviar algo al comprador es una **decisión humana**. La base de datos también lo exige: un job `client_facing` sin `member_id` no se puede insertar. | Que lo pida una persona con capability `commercial.proposal.render`. |
| *(evidencia interna citada)* | `422 proposal_invalid_input` | El deck cita una evidencia **`internal`** —o una que no existe en la proyección permitida— y el artefacto es `client_facing`. | **Una sola** evidencia interna basta para rechazar **todo el artefacto**. Ahí viven el diagnóstico y el squad blueprint con el **loaded cost**: ese número es tu **piso de negociación**. Si viaja dentro del PDF, le entregas al comprador el punto exacto hasta donde puedes bajar. No se omite la cita: se cae el render. | Saca el dato interno del plan del deck. **Nunca** cambies la etiqueta de la evidencia a `client_facing` para destrabarlo. |
| `accessibility_unsupported` | `422 proposal_render_rejected` | Las bases exigen accesibilidad (PDF/UA, Section 508, EAA, WCAG) y este motor no puede cumplirla. | Chromium imprime PDF **sin etiquetar**: el archivo sería formalmente inadmisible. **Mejor no ofertar que entregar algo que van a rechazar.** La detección es conservadora a propósito (prefiere un falso positivo que una persona revisa). | Si el requisito es real: este renderer no sirve para esa licitación, hay que producir el PDF por otra vía. Si es un falso positivo (la palabra "accesible" aparecía por otra razón), corrige el `label`/`value` del requisito para que refleje el literal exacto de las bases. |
| `deadline_expired` | `422 proposal_render_rejected` | El deadline de la propuesta ya venció. | Renderizar para un proceso cerrado es quemar CPU. | Si el deadline estaba mal cargado, ese dato es inmutable en la práctica: crea la propuesta correcta. Si el proceso realmente cerró, no hay nada que renderizar. |
| `semantic_rejected` | `422 proposal_render_rejected` | El manifest trae un validador que **no está en `pass`**. | Un reporte de validación fallido no se encola: el manifest ya sabe que el artefacto está mal. | Corrige el plan y vuelve a resolverlo con `resolvePlan`. |
| *(manifest inválido)* | `422 proposal_invalid_input` | El manifest no es `manifestVersion 1`, no trae catálogo sellado o no trae láminas. | No es un `ResolvedCompositionManifest`: sin hashes de catálogo no hay render reproducible. | Genera el manifest con `resolvePlan` (es la única fábrica válida). No lo escribas a mano. |
| *(idempotencia)* | `200` con `"idempotent": true` | **No es un error.** Ya existe un job con el mismo `ownerOrgId` + `proposalId` + `manifestHash` + `artifactPurpose`. | Reintentar no debe producir un segundo PDF. | Si querías otro artefacto, cambia el plan (cambia el hash) o el `artifactPurpose`. |

---

## Tabla 2 — `failure_code` de un job (el render falló o fue rechazado)

Los 12 códigos posibles de `proposal_render_jobs.failure_code`.

| `failure_code` | Qué significa en simple | Por qué el sistema lo rechaza | ¿Reintentar sirve? | Qué hacer |
|---|---|---|---|---|
| `audience_violation` | El artefacto contiene o cita material interno y va dirigido al comprador. | El loaded cost / piso de negociación **no cruza la mesa**. Nunca. | ❌ **No.** El mismo manifest daría el mismo rechazo. | Corrige el plan (saca el dato interno) y **encola un render nuevo**. |
| `accessibility_unsupported` | El RFP exige PDF accesible y el motor no lo produce. | Un PDF sin etiquetar es inadmisible: entregarlo es perder el proceso en la mesa de apertura. | ❌ **No.** | Producir el archivo por otra vía, o corregir el requisito si era un falso positivo. |
| `semantic_rejected` | El contenido de una lámina rompió una regla del catálogo: un slot desconocido, un campo que el sistema no supo llenar, un texto que **no se puede truncar**. | El renderer **nunca trunca** copy ni rellena con un valor por defecto silencioso: una lámina cortada a la mitad o con un dato inventado es peor que ninguna lámina. | ❌ **No.** Es el plan, no el ambiente. | Corrige el plan (acorta el texto, completa el slot, revisa el `contentType`) y encola un render nuevo. Los mensajes de este tipo están detallados en [componer-deck-de-licitacion.md](../comercial/componer-deck-de-licitacion.md). |
| `size_rejected` | El PDF pesa más del máximo, o tiene más páginas del máximo que fija el RFP. | Si el portal rechaza el archivo por peso, **la oferta queda fuera del proceso**. No es un detalle estético. | ❌ **No.** El mismo plan pesa lo mismo. | Reduce el deck (menos láminas, imágenes más livianas) y encola un render nuevo. El límite sale del requisito-set: si no declaraste ninguno, el default es **20 MB**. |
| `geometry_rejected` | El contenido **no cabe** en el lienzo real de la lámina. | "Pasó el máximo de caracteres" **no significa "cabe"**: el juez es el layout renderizado. El sistema mide la lámina real y falla cerrado antes de amputar una palabra en silencio. | ❌ **No.** | Acorta el contenido de esa lámina, o divídela en dos. Encola un render nuevo. |
| `manifest_drift` | El catálogo cambió (una plantilla, el brand pack, un contrato) entre el momento en que encolaste y el momento en que el worker ejecutó. El manifest re-resuelto **no coincide** con el hash sellado. | El artefacto que saldría **no es el que aprobaste**. Un PDF distinto al validado no se publica. | ❌ **No.** El hash sellado del job no cambia. | Vuelve a resolver el plan (`resolvePlan`) contra el catálogo vigente y **encola un render nuevo**: tendrá un hash nuevo. |
| `font_fallback_detected` | Una lámina se dibujó con una tipografía distinta a la del brand pack (el navegador cayó a una fuente sustituta). | Un deck con la fuente equivocada no es "casi igual": es una entrega fuera de marca, y suele delatar que el font pack no cargó. | ⚠️ Sí, técnicamente. | Reintentar **sólo** tiene sentido si sospechas de una causa ambiental. Si se repite, es un problema del catálogo/imagen del worker: escala (ver [operar-el-artifact-worker.md](operar-el-artifact-worker.md)). |
| `missing_asset` | Una imagen de una lámina no se pudo resolver. | Una lámina con un hueco donde debía ir un logo o un gráfico no se entrega. | ⚠️ Sí, técnicamente. | Revisa el `failureDetail`: dice qué archivo. Si es una ruta que no existe en el catálogo, es un bug del catálogo (no del plan) — ya pasó una vez: dos plantillas tenían horneada la ruta absoluta del Mac del autor (`ISSUE-121`). Si el detalle apunta a un asset de tu plan, corrígelo y encola un render nuevo. |
| `blank_slide` | Una lámina salió **prácticamente en blanco** (el detector de tinta no encontró contenido suficiente). | Una lámina vacía dentro de una oferta es un error visible que el comité sí nota. | ⚠️ Sí, técnicamente. | Casi siempre es contenido faltante en el plan o una plantilla mal alimentada. Revisa esa lámina y encola un render nuevo. |
| `render_error` | Fallo genérico del motor de render (no clasificado en los anteriores). | Es la red de seguridad: cualquier excepción no clasificada cae acá, y el job queda en fallo, nunca "medio completado". | ✅ **Sí.** | Reintenta una vez. Si se repite, el error está en Sentry (`domain=commercial`, `source=artifact_worker`): escala. |
| `timeout` | El job **venció esperando en la cola**: su deadline pasó antes de que el dispatcher lo despachara. | Un deadline vencido no compite por la cola. El dispatcher lo cierra de forma gobernada (y lo loguea) en vez de descartarlo en silencio. | ⚠️ Sí, pero **no sirve de nada** si el deadline ya pasó. | Si el deadline venció de verdad, el proceso se perdió. Si el job quedó atascado por un dispatcher caído, primero arregla eso (señal `artifact.render.queue.starvation`). |
| `dispatch_error` | El dispatcher no pudo lanzar la ejecución de Cloud Run (fallo de la Jobs API / permisos / infraestructura). | El job no se pierde: queda marcado con el error de infraestructura en lugar de quedar colgado. | ✅ **Sí**, una vez resuelto el problema de infraestructura. | Es un problema de plataforma, no de tu oferta. Ver [operar-el-artifact-worker.md](operar-el-artifact-worker.md) (el caso clásico fue un permiso IAM faltante — `ISSUE-121`). |

### Cuándo un job cae a `dead_letter`

Un job pasa a `dead_letter` (terminal, requiere una persona) cuando:

- **su `failure_code` no es reintentable** (los 6 marcados ❌ arriba), **o**
- **agotó sus intentos**: `attempts >= max_attempts` (por defecto **3**).

Un job en `dead_letter` **no se "arregla" reintentando**. Se corrige la causa y se pide un render nuevo.
La señal `artifact.render.dead_letter` (estado sano = 0) los cuenta en los últimos 7 días.

### Reintentar un job

```bash
pnpm staging:request POST "/api/commercial/proposals/prop-…/render-jobs/prnd-…/retry" '{"ownerOrgId":"org-2df565fb-…"}'
```

El retry:

- sólo acepta jobs en `failed` o `dead_letter` (cualquier otro estado → `409 proposal_render_conflict`);
- **rechaza los `failure_code` no reintentables** → `409 proposal_render_conflict` con el motivo;
- **reusa el mismo manifest sellado**: nunca renderiza un plan distinto. Si tu plan cambió, el retry es
  el camino equivocado — pide un render nuevo.

---

## Tabla 3 — Errores del ciclo de la propuesta (no del render)

| Código HTTP | Qué significa | Por qué | Qué hacer |
|---|---|---|---|
| `403 proposal_not_entitled` | La organización no tiene el módulo `proposal_studio_v1` activo. | La capability **se contrata por organización**, no se hereda por rol. Default OFF en todos los ambientes. | Verifica `greenhouse_client_portal.module_assignments`. La activación es una decisión humana. |
| `403 forbidden` | Tu rol no tiene la capability, o eres un usuario `client_*`. | Los `client_*` **nunca** operan propuestas (defensa en profundidad: aunque un grant mal escrito les diera la capability, esta puerta no se abre). | `efeonce_admin` / `efeonce_account` operan el ciclo completo. `efeonce_operations` **sólo lee propuestas** (y no puede ni leer jobs de render). |
| `403 proposal_human_gate_required` | Intentaste cruzar un **gate humano** sin ser una persona. | Los 3 gates (`fit_review → producing`, `fit_review → declined`, `ready_to_submit → submitted`) exigen `actor member`. Un agente propone; el humano confirma. | Que la transición la ejecute una persona con capability `commercial.proposal.gate`. |
| `409 proposal_invalid_transition` | El salto de estado no existe en la matriz. | El ciclo es secuencial y los terminales (`declined`/`won`/`lost`) no se reabren. | Consulta la matriz en [crear-y-operar-una-propuesta.md](crear-y-operar-una-propuesta.md). |
| `409 proposal_quote_gate_failed` | El GO no pasa el gate de margen. | **Nunca un GO sin margen sobre loaded cost.** Sin cotización, sin margen conocido, con margen ≤ 0 o bajo el piso declarado → no hay bid. No se aprueba por omisión. | Vincula o corrige la cotización en el cotizador. |
| `422 proposal_invalid_input` | Un campo falta o rompe una regla del dominio. | Los mensajes al cliente son genéricos **a propósito**: el detalle técnico va a Sentry, nunca a la respuesta (un error de propuesta puede llevar contenido de RFP o costos). | Revisa las reglas del paso correspondiente. Los casos frecuentes: dos fuentes de evidencia (o ninguna), `weight` en un requisito que no puntúa, `deadlineAssumption` sin `ambiguous`, `publicOpportunityId` con un `origin` que no es `public_tender`. |
| `404 proposal_not_found` | La propuesta no existe **o no es de tu organización**. | Todos los readers son org-scoped: una propuesta de otra org sencillamente no existe para ti. | Verifica el `ownerOrgId`. |

## Qué no hacer

- **Nunca cambies el `audience` de una evidencia para que pase el gate.** Es la clase de "arreglo" que
  gana el render y pierde la negociación.
- **Nunca reintentes un `dead_letter` esperando que "esta vez sí".** Si el código no es reintentable, el
  sistema te lo va a negar; y si lo fuerzas por otra vía, renderizará exactamente lo mismo.
- **Nunca trates un `size_rejected` o un `accessibility_unsupported` como un capricho del sistema.** Son
  los dos motivos más comunes por los que una oferta queda **fuera del proceso** en la mesa de apertura.
- **Nunca "silencies" un `geometry_rejected` achicando la fuente o editando la plantilla a mano.** El
  layout es el juez. Si no cabe, es que hay demasiado contenido en esa lámina.
- **Nunca borres filas de `proposal_render_jobs` para "limpiar" los fallos.** Son evidencia operacional:
  la tabla es append-only y los triggers rechazan el `DELETE`. El historial de intentos fallidos es parte
  de la trazabilidad del artefacto.

## Problemas comunes

| Síntoma | Diagnóstico |
|---|---|
| El error HTTP no me dice nada concreto | Es deliberado: la respuesta al cliente nunca lleva stack, SQL, contenido de RFP ni costos. El detalle vive en `failureDetail` del job, en los logs del worker y en Sentry (`domain=commercial`). |
| Un job dice `failed` pero la ejecución de Cloud Run terminó "bien" (exit 0) | Correcto. Los fallos **gobernados** salen con exit 0 y dejan el código en `failure_code`. Un exit distinto de 0 sería un fallo **no gobernado** (un bug del worker) y aparece en Sentry con `source=artifact_worker`. |
| Encolé, no falló nada, y el job sigue en `queued` | No es un error de tu oferta: es la cola. Ver [operar-el-artifact-worker.md](operar-el-artifact-worker.md). |
| El mismo plan renderizó ayer y hoy da `manifest_drift` | Alguien cambió el catálogo (plantilla, brand pack, contrato). Es exactamente lo que el drift check existe para atrapar. Re-resuelve el plan y encola de nuevo. |

## Referencias tecnicas

- Códigos de fallo (enum + no reintentables): `src/lib/commercial/tenders/proposals/render-jobs.ts`
- Errores tipados del dominio: `src/lib/commercial/tenders/proposals/errors.ts`
- Traducción a HTTP: `src/lib/commercial/tenders/proposals/http.ts` + `src/lib/api/canonical-error-response.ts`
- Gates de calidad del motor: `src/lib/artifact-composer/quality-gates.ts` (`missing_asset`, `font_fallback_detected`, `blank_slide`) y `render.ts` (`SlideGeometryError`, `SlotFillError`)
- Gate de audience: `src/lib/commercial/tenders/proposals/render-projection.ts`
- Constraints del RFP: `src/lib/commercial/tenders/proposals/render-constraints.ts`
- Incidente fundacional (5 bugs del primer deploy): [`ISSUE-121`](../../issues/resolved/ISSUE-121-artifact-worker-first-deploy-bug-class.md)
