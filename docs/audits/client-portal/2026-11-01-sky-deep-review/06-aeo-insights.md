# SKY — motor AEO, edición y distribución (objetivo 6/6)

Fecha: 2026-11-01. Base leída: `985f84d3c`; checkout compartido, sólo este informe fue escrito por este agente.
Método: skills `efeonce-insights`/program ledger y `seo-aeo`, ADR operativo Proposed y revisión crítica previa;
lectura de commands, stores, reducers, worker y contratos. Sin DB, credenciales, corridas de proveedor, render,
envío o cambios de runtime. Estado documentado de tasks/flags no se presenta como readback productivo actual.

## Dictamen

El sistema tiene buenas defensas de edición, emisión humana y entrega durable. Pero **ninguno de los puentes
A′/B convierte el informe actual de SKY en un informe exclusivo del Blog**. El encargo/edición/schedule están
ligados a Organization; el módulo AEO mezcla resultados del motor nativo y tráfico GA4 desde asistentes.
Se necesita identidad de medición y de cuenta operativa persistida, además de un gate de fuentes por ventana.

El hallazgo más importante: `allowPartial=false` NO exige GA4 + GSC + corrida nativa AEO del periodo actual.
La validación requiere algún fact no-referencia por módulo, aunque ese fact sea GA4 etiquetado AEO o corresponda
al periodo de comparación. Esto no significa emisión automática: revisión humana, outputs y client-fit siguen
siendo barreras reales. Significa que esas barreras no certifican la tríada solicitada por Julio.

## 1. Motor nativo → reporte → adapter: tres semánticas diferentes de dominio

Cadena real: `client/command.ts:54–68` → `store.ts:426–440` → `report/command.ts:55–125` →
`report/builder.ts:651–716` → `efeonce-insights/adapters/aeo-adapter.ts:28–201`.
Las tres primeras rutas están bajo `src/lib/growth/ai-visibility/`; la última, bajo `src/lib/`.

| Operación | Contrato actual | Consecuencia para Blog |
| --- | --- | --- |
| `buildCitation` | Prioriza `domain` declarado por provider; conserva URL original (`observation.ts:75–96`) | Un dominio blog con URL redirect no acredita una URL final del Blog; conservar procedencia y estado de resolución |
| Normalización de presencia/sourceType | Matching same-site/subdominios (`normalization/normalizer.ts:105–113,219–227`; `source-type-classifier.ts:24–40`) | Señal válida de marca/sitio, insuficiente como pertenencia a Blog |
| Citation share propio | Igualdad de `citationDomains` normalizados con subjectDomain (`report/builder.ts:296–304`) | No es el mismo reducer que el breakdown; no afirmar que TODOS los KPIs colapsan subdominios |
| Breakdown de fuentes | Agrupa dominio registrable, sólo observaciones succeeded (`report/citation-breakdown.ts:63–83,119–128`) | Blog y web principal se convierten en `skyairline.com`; pierde la distinción necesaria |
| Fact `citation_share` | Respuestas con citas propias / respuestas con citas (`aeo-adapter.ts:164–167`) | No equivale a número de URLs únicas ni a porcentaje de citas que son Blog |
| Mentions/score/SoV | Marca, competidores y panel de la Organization | No etiquetarlos como desempeño del Blog por cambiar el título del informe |

**Reproducción local ejecutada:** se cargaron los módulos TS reales `observation.ts` y
`report/citation-breakdown.ts` mediante transpile + VM, permitiendo sólo imports locales y `node:crypto`.
Dos citas succeeded, una `www.skyairline.com/flights` y otra `blog.skyairline.com/viajar`, con subjectDomain Blog,
producen una sola fila `skyairline.com`, `count=2`, `own_domain=2`. Una tercera cita en observación failed no se cuenta.
`buildCitation({url:'https://redirect.invalid/abc',domain:'blog.skyairline.com'})` conserva ese redirect y dominio.
No hubo resolución de red; la prueba caracteriza el reducer real, no demuestra contaminación de una edición viva.

Reutilizar las observaciones crudas como origen, sin mutarlas. Crear en el producer una proyección URL-scoped:
URL declarada, host observado, destino verificado si existe, motivo de inclusión/exclusión/desconocido y versión
del clasificador. Un redirect desconocido no es ausencia de cita Blog ni éxito Blog. No resolver redirects durante
el render ni inferir destino a partir del título de una respuesta. Mención SKY sin URL no es cita al Blog.

## 2. Panel, run y comparación: la ventana sí existe; el binding fino falta

El adapter usa un run terminado dentro de la ventana y rechaza `insufficient_data`/`review_required`
(`aeo-adapter.ts:37–64`). El store filtra estados reportables y mercado principal actual (o market null),
ordena por finalización y toma el más reciente (`store.ts:432–439`). No usa siempre el último global.
Sin embargo, no recibe Service, Space, profile, mercado o panel explícito del encargo. Si hay varios perfiles/runs
de SKY dentro del mismo periodo, el último elegible puede pertenecer a otro propósito. Cambiar el mercado primario
también cambia qué run es elegible en una nueva colección; la edición ya sellada no cambia por ello.

El run guarda `promptSetId/promptSetVersion` y las observaciones guardan modelo
(`store.ts:121–122,187–188,209`; `contracts.ts:188`). El reporte lleva mercado, providers solicitados/intentados/
respondidos, geo nativo o prompt-only, versiones de score/pack y cantidad de prompts
(`report/builder.ts:450–487`; `report/contracts.ts:218–228`). Hay procedencia útil que conservar.
Pero el adapter reduce método a scoreVersion/promptPackVersion y referencia a org/fecha/score, sin runId explícito
(`aeo-adapter.ts:70–83,201`). No sella huella de panel/modelos/mercado/PromptSet en el contrato de fuente utilizado.

La comparación del adapter colecciona ambas ventanas y conecta hechos por `metricId`
(`aeo-adapter.ts:210–216`). No consulta la comparabilidad del trend del reporte ni exige mismo panel/mercado/modelos.
El reporte nativo sí contiene un mecanismo propio de comparación previa (`report/command.ts:72–87`);
no inferir que el enlace de facts de Insights hereda automáticamente ese control.

Otro límite temporal: el reporte usa `run.matchingSnapshot` para marca/sitio/competidores si existe; para runs
anteriores sin snapshot recurre al perfil vivo (`report/command.ts:89–102`). No editar el website del perfil
histórico para convertirlo en Blog: puede reinterpretar esos runs al volver a leerlos.

Contrato mínimo recomendado: `runId`, profile/mercado/idioma, scopeVersion, prompt IDs o hash del panel,
PromptSet/version si existe, motores/modelos, score/normalization versions, fecha de corrida y planned/attempted/
succeeded/failed/unknown. Denominadores distintos declarados: panel planificado para cobertura; respuestas
evaluables para la tasa; respuestas con citas para citation share. Filtrar citas no elimina preguntas sin éxito
ni convierte las fallidas en ceros. Una comparación no comparable queda sin delta o con serie separada.

## 3. Tríada de fuentes: un módulo lleno no equivale a requisito cumplido

Cadena: create → `commands/generation.ts:68–94` colecciona/sella → `:129–151` valida → revisión → issue.
Los adapters reúnen facts actuales y comparativos en el mismo snapshot; `generation.ts:140` sólo pregunta
`fact.module === module && !isReferenceFact(fact)`.

Contraejemplos concretos en código:

1. Sin run nativo actual, AEO devuelve rejection; con editorialV2, `aeo-adapter.ts:218–228` agrega `ga4AiFacts`.
   Incluso GA4 OK con cero filas emite `ai_sessions=0`, module AEO (`ga4-site-facts.ts:166–175`).
   El módulo deja de estar vacío aunque no se haya medido visibilidad con el motor.
2. Sin facts del periodo actual, facts de comparación del mismo módulo satisfacen el predicado de presencia.
   No hay filtro por ventana en ese predicado; la validación editorial podría rechazar otro problema, pero
   no existe aquí un requisito independiente de fuente actual.
3. `allowPartial=true` permite además módulos enteros vacíos. Eso es una política genérica existente, no un
   permiso para omitir fuentes obligatorias del encargo Blog.
4. El reader GA4 del capítulo AEO se llama **sin `landingMatch`** (`aeo-adapter.ts:221–223`). Aunque el adapter
   SEO tenga contentScope Berel, los AI referrals del capítulo AEO continúan consultando la propiedad completa.

La corrección debe separar `producer` de `module` editorial. Para este servicio se requiere recibo válido de
GA4, GSC y AEO nativo sobre scope/ventana requeridos; cero observado es válido, no_data/unknown no satisfacen.
Exigirlo antes de marcar la edición completa y antes de emitir; permitir preview interno incompleto con su
estado explícito. Un número de fuentes o la etiqueta AEO no son certificados de disponibilidad de la tríada.

## 4. Binding, idempotencia y recurrencia

`InsightRequestV1` contiene org/projectIds/modules; su `scope` es catálogo de chips de portada, NO URL/Space/Service
(`contracts/request.ts:60–77`). El validador reconstruye campos admitidos (`commands/validate-request.ts:133–150`):
añadir arbitrariamente serviceId en JSON no lo convierte en contrato. `create-edition.ts:81–117` inserta report
y edición por org; no fija el propietario departamental. TASK-1960 posee ese trabajo pendiente, no un dominio nuevo.

Idempotencia real: auth vigente → request validado/hash → búsqueda `(org,key)` → compara hash → devuelve edición
existente (`create-edition.ts:55–75`). No vuelve a generarla. Sin embargo `reportId` es argumento del command,
no parte del request hash. La misma key/request con otro reportId de la misma org devuelve el primer reporte.
Es comportamiento actual a cubrir al añadir scope: nunca devolver una edición de Diseño por reutilizar key en SEO.

El retry debe distinguir devolver lo existente de crear nuevo: localizar la key histórica, validar autoridad
vigente sobre SU scope y comparar intención persistida, sin reinterpretarla con el mapping de hoy.
La recuperación de failed vuelve a la fase fallida (`commands/lifecycle.ts:135–142`); si era collecting,
colecciona fuentes actuales del periodo. Por eso el binding de cuenta/servicio/scope debe congelarse antes de
coleccionar, y la decisión sobre run exacto/cutoff debe quedar en la evidencia; no depender de configuración viva.

Recurrencia alcanzable: `services/ops-worker/server.ts:2663` llama `runInsightSchedulesTick`.
Sí revalida usuario activo interno y capabilities/módulo vigentes (`schedules/tick.ts:65–119`), pausa si revocado,
acota catch-up y deduplica ocurrencia por schedule/version/periodo (`:128–148,220–240`). No hereda la cookie del creador.
El target durable es `schedule.organizationId` + template (`schedules/commands.ts:102–107`), sin cuenta/servicio.
Cada ocurrencia crea edición/render y **nunca emite ni envía** (`tick.ts:143–185`). Debe preservar esa separación.

## 5. Emisión y entrega: defensas reales, destinatarios todavía org-scoped

Issue exige capability, ready_for_review, snapshot/plan sellados, outputs válidos y client-fit; issuedHash liga
encargo/evidencia/plan/outputs (`commands/lifecycle.ts:44–85`). No implica validación científica de cada fuente.
Render, sello y acceso están desarrollados en los informes 01/03; no sustituirlos por infraestructura nueva.

Delivery command exige actor autorizado, audiencia client, edición issued y recipients nominales, nunca emails
libres; congela hash de versión emitida, destinatarios, modalidad y contenido (`delivery/commands.ts:191–243`).
Dispatcher alcanzable por `src/lib/sync/projections/insights-delivery-dispatch.ts:32` reconsulta usuario activo,
org y email antes de enviar (`delivery/dispatch.ts:316–340`). El SQL acepta cualquier cliente activo de esa org
o interno (`delivery/store.ts:86–106`), no grants del Space/Service de la edición. Revocar sólo acceso SEO dejando
usuario activo en SKY no queda representado en esta comprobación, en A′ ni en B.

El dispatcher no vuelve a cargar la autoridad del aprobador como sí hace schedule; opera el intent previamente
autorizado. Hay que decidir si esa autorización durable sobrevive revocación y cómo cancelarla; no asumir que
invalidar una sesión cancela intents pendientes. Revalida intent/edición/destinatarios al inicio del batch,
no una barrera transaccional única hasta el transporte; revocación/cancelación concurrentes requieren prueba y
semántica explícita del punto irreversible. No prometer revocación de adjuntos ya aceptados.

Defensas a conservar: claim por destinatario, ledger por intento, grant digest-only creado junto a email intent,
resultado ambiguo sin retry ciego (`dispatch.ts:133–170,199–211`); retry sólo fallidos definitivos, con auth actual
(`delivery/commands.ts:365–436,439–455`). Share público sigue siendo bearer: acceso token no identifica departamento.
Para aislamiento estricto de stakeholders usar entrega autenticada por cuenta; si se permiten enlaces transferibles,
declararlo como política, no como control de membership. Un bearer ya descargado no se puede recuperar.

## 6. Pruebas de integración propuestas — no ejecutadas

Fixtures A′/B iguales: SKY D/S, otra org control, grants separados, dos profiles AEO, dos mercados, dos runs por
periodo, prompts persistidos, fuentes GA4/GSC sintéticas, transport stub con ledger local. No llamadas proveedor.

| Caso | Esperado y evidencia |
| --- | --- |
| A1: raíz+Blog+redirect+fallida | Proyección Blog cuenta sólo URL verificable; desconocido separado, panel intacto; preservar reducer global existente |
| A2: mismo periodo, dos perfiles/mercados | Binding elige run exacto autorizado; no último indiscriminado; cambio primary no modifica edición existente |
| A3: comparación con panel/modelo/mercado distinto | No delta comparable; método/huella y razón visibles; mismo panel sí compara |
| A4: sin run actual, GA4 AI OK=0; allowPartial=false | Gate requerido rechaza ausencia AEO nativo, aunque módulo editorial tenga fact válido |
| A5: sólo evidencia comparativa / falta GSC actual | No se declara tríada actual completa; preview puede mostrar límites sin habilitar issue como reporte completo |
| A6: scope SEO activo + AEO referrals multi-host | Tanto hechos SEO como AI referrals usan población Blog; scope ausente no vuelve a whole-site silencioso |
| A7: misma key, reportId/Space distintos; mapping cambia | Reuse sólo intención idéntica y autoridad sobre edición original; conflicto/denegación al cambiar target; sin edición extra |
| A8: schedule autorizado, grant quitado, dos ticks | Pausa según autoridad departamental; una ocurrencia; jamás issue/send; target no depende de cookie activa |
| A9: entrega pendiente, recipient pierde SEO pero sigue Diseño | Deniega nuevo despacho SEO; conserva ledger; probar también revocación concurrente y cancelación antes del claim |
| A10: proveedor aceptó y hubo timeout; retiro y retry | Reconciliar antes de reenviar; ningún duplicado; retirar revoca enlaces; original/hash intactos; adjunto enviado no se finge revocable |

Sólo la reproducción pura del reducer/normalizador se ejecutó. El análisis de gates proviene del código;
no se ejecutó el pipeline ni se acreditó una emisión defectuosa real.

## 7. Cambio mínimo, A′/B y rollback

Los cambios de este frente son comunes a A′ y B: binding report/edition/schedule/delivery, autoridad por cuenta,
contrato de fuente/ventana, proyección AEO URL-scoped, selección explícita de run/panel y comparación controlada.
No resuelven Finance ni el acceso client-only; no se puede elegir bridge a partir de este frente.

Puede avanzar antes del split real: proyección pura de citas, contrato y pruebas de obligatoriedad/cobertura,
fixtures representativas, preview interno con evidencia sellada sintética. La apertura de biblioteca/exports y
distribución necesita contexto completo end-to-end; crear otro client legacy no aísla los stores org-scoped.

Rollback: deshabilitar generación/schedules nuevos según scope, cancelar pendientes no enviados, preservar
ediciones/IDs/hash/intents y reconciliar ambiguos; no reasignar ediciones SEO a Diseño ni reescribir snapshots.
Mantener lectores compatibles para historia sellada y política explícita de shares existentes. Owners: dominio
AEO para métricas; TASK-2033 para contenido; TASK-1960 para servicio; infraestructura 1848 para distribución.
ADR sigue Proposed. Sin estimación ni afirmación de rollout hasta pruebas sobre commands/stores reales aislados.
