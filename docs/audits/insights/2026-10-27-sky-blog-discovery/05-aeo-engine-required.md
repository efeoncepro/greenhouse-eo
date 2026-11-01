# Discovery 05 · Motor AEO obligatorio y medición de las URL del blog SKY

Fecha: 2026-10-27. Estado: discovery y propuesta; sin cambios de código/configuración ni ejecución de corridas.
Este anexo incorpora la corrección expresa del operador: **GA4, GSC y nuestras corridas del motor AEO son tres
fuentes obligatorias del informe SKY Blog/SEO/AEO**. No es válida una primera entrega que excluya una de ellas por
conveniencia de implementación. Las recomendaciones anteriores de SEO-only/GSC-only quedan superadas para este encargo.

## 1. Dictamen y ruta mínima viable

**Se puede reutilizar una corrida real existente para medir las citas a URL del blog, mediante una proyección
canónica nueva en el dueño Grader. No hace falta exigir una corrida dedicada o un PromptSet nuevo para empezar.**
Sí hace falta seleccionar y fijar la corrida exacta, comprobar su gate/cobertura, conservar el denominador del panel
que se ejecutó y aplicar el alcance a las URL citadas. Insights consume esa proyección: no lee observaciones crudas,
no filtra por su cuenta ni recalcula el score del Grader.

El panel actual de SKY pregunta por la marca/categoría aerolínea, reputación y decisión de compra. Puede aportar
evidencia real de citación del blog en ese panel; **no debe presentarse como una corrida diseñada para el plan editorial**.
Un panel editorial propio será una evolución útil cuando se decida y autorice, no un prerequisito artificial para
usar la evidencia existente. Ninguna corrida nueva ni gasto queda autorizado por este discovery.

La fuente `aeo_run` se acredita con una corrida elegible y sus mediciones del blog. Las visitas GA4 desde asistentes
son otra evidencia y **no la sustituyen**, aunque actualmente ambas produzcan hechos con `module:'aeo'`.

## 2. Verificación real de SKY, sólo lectura

Se hicieron SELECT acotados mediante `loadGreenhouseToolEnv` + perfil `runtime` + cliente PostgreSQL canónico
`src/lib/db`. Sin acceder a tokens ni imprimir secretos; no se iniciaron runs, autorías, aprobaciones ni re-score.
Los resultados siguientes son una comprobación nueva de metadata y evidencia existente del 27-10.
Se leyó también el reporte cliente canónico de los dos runs CL por su `runId`, sin normalizar ni volver a puntuar.
Recibo sin respuestas ni prompts completos: `.captures/insights-sky-scope-2026-10-27/aeo-discovery.json`.

| Elemento | Resultado comprobado | Qué demuestra / qué no |
| --- | --- | --- |
| Organización | `org-b9977f96-f7ef-4afb-bb26-7355d78c981f` | Mismo sujeto que GA4/GSC. |
| Perfil AEO | `gprf-dc5f82eb-a967-4bf2-9684-15419933120a`, `EO-GAVP-0015`, «Sky Airlines», activo | Es perfil de la organización; no es un perfil dedicado al blog. |
| Sitio del perfil | `https://skyairline.com`, mercado CL, locale es-CL | No debe interpretarse como selector exacto de URL del blog. |
| Corridas del perfil | 16; primera creada 29-06 y última 14-10 | Hay evidencia propia del motor. No se certificó equivalencia de los 16 paneles. |
| PromptSets | Cero filas del perfil | Los runs observados usan baseline del arquetipo, no un panel editorial autorado/activo. |
| Corrida CL de octubre | `EO-GRUN-00074`, `grun-63691446-9437-4621-9d87-1e7e8eae0b97`, terminada 03-10 11:20:32Z, succeeded | Candidata real para una ventana que incluya el 03-10, sujeto a proyección y validación de alcance. |
| Corrida CL de septiembre | `EO-GRUN-00065`, `grun-c30c2278-233c-469d-8274-fe4e814155f0`, terminada 28-09 10:43:34Z, succeeded | Candidata de comparación temporal, pero el panel no es idéntico al de octubre. |
| Matching snapshot de esas corridas | `brand.websiteUrl=https://skyairline.com` | El objeto ejecutado era la marca/sitio general; cambiar el perfil hoy no reescribe ese snapshot. |
| Observaciones CL octubre | 12 prompts × 5 proveedores, 60 observaciones succeeded, 634 citas registradas | Cobertura ejecutada del panel. Número de citas no equivale a respuestas ni a sesiones/usuarios. |
| Observaciones CL septiembre | 6 prompts × 4 proveedores, 24 observaciones succeeded, 246 citas registradas | El panel/cobertura cambió; no publicar delta simple de score o cita como mejora comparable sin control. |
| Citas directas al blog en CL octubre | 12 filas de cita cuyo `citation.url` tiene host `blog.skyairline.com` | Hay evidencia blog reutilizable. No son necesariamente 12 URLs únicas ni 12 respuestas distintas ni una cuota final. |
| Citas a la web principal en CL octubre | 30 filas con URL host `www.skyairline.com` en el corte agregado | Confirma que un resumen por sitio general mezclaría poblaciones. |
| Scores persistidos CL | `ai_visibility_score_v2`, completed; evidencia/coverage difieren entre los dos runs | No se convierten en un score del blog mediante filtrado de citas. |
| Gate del reader cliente, ambos runs CL | `ready`; ambos bloques `trend` devuelven `sin_historico` | Los reportes de marca son legibles y elegibles según el gate actual, no una medición URL de blog ya implementada. |

El reader actual devuelve `ownDomainShare=25` en octubre y `8,7` en septiembre para el sujeto raíz. **No son tasas de
citación del blog** y no se trasladan al nuevo tablero como tales. La presencia de citas directas del blog y el gate
ready acreditan que vale la pena adaptar esa evidencia existente; no obligan a repetir una corrida.

Los doce prompts de la corrida CL de octubre incluyen familias `category_discovery`, `product_discovery`, `comparison`,
`trust_reputation`, `purchase_readiness`, `risk_reputation`, `local_intent` y `message_recall`. Ejemplos comprobados:
«¿Cuáles son las mejores Aerolineas de pasajeros en Chile?» y «¿Vale la pena Sky Airlines? ¿Qué experiencia tienen sus
clientes?». Esta lectura acredita que el panel es de marca/categoría, no un panel sobre contenidos del blog.

Los dos runs CL tienen el mismo string `archetype-consumer_b2c.v1.market-v1.es-CL`, pero distintos prompts/proveedores.
Por tanto, **igualdad de `promptPackVersion` no acredita igualdad del instrumento ejecutado** en estos datos.

Se observaron también corridas recientes PE, BR, CO, AR, UY y US con snapshot del sitio general. Elegir latest de la
organización sin mercado puede cambiar de experimento. No se propone sumar países en una misma cuota por defecto.

## 3. Qué permite hoy el contrato dueño

### 3.1 Selección de corrida con pertenencia organizacional

`growth/ai-visibility/client/command.ts:33–39,51–68` admite `runId` exacto o `finishedWithin` y devuelve un
`ClientGraderReport` derivado del reader canónico. La pertenencia se resuelve por
`run.profile_id → grader_profiles.organization_id` (`store.ts:388–400`); un run ajeno da not_found.
No hace falta crear otro pipeline de lectura en Insights.

Limitaciones concretas:

- El input cliente no declara `profileId`, `marketId`, `promptSetId`, cohorte ni alcance URL.
- `getLatestClientGraderRunInWindow` filtra estados succeeded/partial y mercado principal del perfil
  (`store.ts:421–443`); no selecciona el panel Blog ni permite al caller elegir mercado.
- `getClientGraderRunById` comprueba pertenencia, pero no añade por sí solo el filtro de estados reportables
  (`:392–397`). La selección explícita nueva debe comprobar estado además de score/gate.
- El DTO cliente no expone `runId` en su shape (`report/contracts.ts:567–595`), aunque el resultado interno sí lo tiene.
  El adapter de Insights construye `evidenceRef` con org/asOf/scoreVersion (`aeo-adapter.ts:83`), no con la identidad
  completa del experimento. Hay que transportar el binding como metadata autorizada, sin exponer secretos ni raw text.

### 3.2 Evidencia de citas disponible y pérdida de detalle

Las observaciones conservan `citation.url`, `domain`, título opcional y tipo (`observation.ts:75–92`); el store conserva
el array en `provider_observations` y ofrece `getRunObservations` (`store.ts:657–672,691–696`). Esa evidencia permite
un cálculo dueño por host+ruta sobre las URLs ya registradas, sin volver a invocar un proveedor.

Los findings normalizados conservan **dominios**, no todas las URL (`normalization/normalizer.ts:219–227` y
`scoring/store.ts:21–39`). El DTO de reporte cliente expone agregados y no URLs crudas. En particular:

- `extractCitationDomain` conserva subdominio y quita `www` (`observation.ts:41–45`).
- `buildCitationInsight` cuenta respuestas cuyos `citationDomains` contienen el dominio del sujeto
  (`report/builder.ts:296–305`). Su `ownDomainShare` actual no es un selector URL host+ruta del blog.
- `buildCitationSourceBreakdown` reduce a dominio registrable (`report/citation-breakdown.ts:63–84,119–128`).
  Por eso `blog.skyairline.com` y la web principal terminan agregadas bajo `skyairline.com`.
- El normalizer de presencia usa `isSameSiteDomain` y **equipara raíz y subdominio a propósito**
  (`normalization/normalizer.ts:110–114`; `source-type-classifier.ts:30–43`). Cambiar `websiteUrl` a blog no vuelve
  host-exactas las menciones ni el score; romper esa regla alteraría la semántica de marca de otros consumidores.

La ampliación debe añadir una proyección distinta de evidencia URL, conservando los agregados actuales. No modificar
la fórmula global o el matching de marca para forzar una lectura del blog.

### 3.3 PromptSets y snapshot del instrumento

El motor ya fija `matchingSnapshot`, mercado, provider policy, prompts ejecutados y PromptSet id/version al crear la
corrida (`run-engine.ts:182–245`; `markets/contracts.ts:27–35`). Si hay set activo y flag elegible, usa ese set; si no,
usa baseline. Los prompts se recortan a `policy.maxPromptsPerRun`; el panel planeado no siempre es el ejecutado.

`getActivePromptSet` se resuelve por perfil/mercado (`prompt-set-store.ts:74–90`). El sistema admite hoy set activo por
mercado mediante los índices de `20260928094832901_task-1863-market-rollout.sql:80–84`. Los comentarios antiguos de
«un active por perfil» no describen toda la regla vigente. No hay un selector activo independiente por tema/servicio.

Se puede autorar un set manual o LLM, revisar y aprobar por commands con capability
`growth.ai_visibility.prompt_set.manage` (`prompt-set-command.ts:48–62,97–154,157–179`). Hay grounding SEO opcional con
provenance (`:80–87,132–138`). Esto ofrece un camino futuro a panel editorial; activarlo en el perfil actual puede
superseder el baseline del mercado para las demás corridas y necesita evaluar su impacto. No se hizo en el discovery.

## 4. Diseño recomendado: medir el blog dentro de una corrida propia

### 4.1 Proyección nueva en el dueño Grader, compatible con su reporte

Añadir un reader/proyección canónica estructuralmente semejante a `readClientGraderReport`, que reciba organización
autorizada, run exacto, scoreVersion cuando corresponda y referencia a un alcance URL del dueño SEO. El nombre final
requiere decisión; no se crea aquí un endpoint ni una tabla.

Responsabilidades de esa proyección:

1. Validar run→perfil→organización, estado, gate, mercado y relación con la ventana del informe.
2. Resolver el alcance por versión/digest y la cohorte **antes** de mirar resultados de citación. El mínimo puede ser
   todos los prompts ejecutados del run existente: cohorte explícita «panel de categoría/marca», no «panel editorial».
3. Leer observaciones y citas mediante el store dueño. Aplicar el matcher canónico de URL a `citation.url`; no usar
   dominio registrable o el matcher same-site de presencia como sustituto.
4. Calcular agregados, denominadores y calidad en Growth/Grader. Insights sólo adapta hechos ya interpretados.
5. Devolver DTO cliente minimizado: scopeRef/digest, run binding, cobertura, conteos/tasas por motor, URL públicas del
   host cuando sean necesarias, reason codes y metodología. Sin excerpts, prompts completos, raw provider payloads,
   punteros a storage, tokens ni costes internos.
6. Mantener separadas la proyección de URL y el reporte de marca actual; otros consumidores siguen usando su contrato.

Las URL visibles se limitan al host permitido y pasan por una proyección segura de esquema/host/path. No publicar
querystrings o fragmentos arbitrarios como parte de un listado de URLs: podrían contener tracking o datos sensibles.
La política de identidad/deduplicación de URL debe versionarse; no modificar slugs/case en silencio ni equiparar por título.

### 4.2 Identidad del binding AEO

El binding congelado de una edición debe registrar como mínimo:

- runId y profileId resueltos bajo la organización autorizada;
- mercado/locale efectivos del matchingSnapshot, no del perfil leído hoy;
- PromptSet id/version si existe; si es baseline, pack y digest de los prompts **realmente ejecutados**, sus IDs y
  pertenencia a la cohorte declarada;
- providers solicitados/intentados/respondidos, policy/version y superficies medibles;
- scoreVersion, versión de proyección/método de cita y gate del reporte usado;
- referencia/digest del alcance URL aplicado y fecha efectiva del run;
- controles de cobertura y, si hay comparación, binding exacto de la corrida comparada.

Una misma key/payload conserva esos bindings aunque aparezca una corrida nueva o cambie el perfil/PromptSet.
Recover collecting reutiliza run/cohorte/scope fijados; composing/render usan el snapshot sellado. No repetir latest
al generar cada formato ni usar el perfil vivo para reinterpretar una corrida con matchingSnapshot existente.

Los scores/findings del Grader son recomputables y se upsertean (`scoring/store.ts:58–82,127–143`). RunId+scoreVersion
no garantiza que su contenido nunca cambie por re-score. El snapshot de Insights debe sellar los hechos y método
efectivamente leídos; un receipt de observaciones/proyección/digest permite auditar ese corte. Tras sellado, un re-score
posterior no cambia la edición; una corrección produce nueva versión por `revise`.

### 4.3 No hace falta transformar la identidad de marca

Mantener el perfil SKY existente es viable para analizar citas al blog en el panel ya ejecutado. No renombrar SKY como
«Blog SKY», clonar un perfil o cambiar el website general sólo para obtener otra cifra. Una identidad de medición por
superficie/servicio puede añadirse al contrato cuando exista, sin confundirla con la entidad de marca.

`provisionGraderProfile` devuelve el perfil activo más reciente de la organización (`provision-profile.ts:82–112`), no
resuelve una superficie de blog. Crear otro perfil sin modificar ese resolver y los lectores latest podría volver la
selección ambigua o cambiarla silenciosamente. Es una alternativa de más impacto, no necesaria para reutilizar citas.

## 5. Matriz de métricas: resultado del blog y contexto del panel

| Métrica/evidencia | Población correcta | Uso obligatorio/propuesto en el informe | Qué no se puede afirmar |
| --- | --- | --- | --- |
| Respuestas que citan al menos una URL del blog | Observaciones elegibles de la cohorte y run fijados; una vez por prompt×provider | Resultado central AEO del blog, incluso si es cero medido | No son visitas ni búsquedas reales de usuarios. |
| Tasa de respuestas con cita al blog | Numerador anterior / respuestas evaluables de esa misma cohorte | Tasa principal, con numerador/denominador y cobertura visibles | No filtrar denominador a respuestas que mencionaron SKY o citaron el blog. |
| Citas/URLs del blog | Sólo URLs clasificables dentro del scope | Conteo de citas y URL únicas como métricas distintas; detalle acotado | Doce filas de cita no significan doce páginas o doce respuestas distintas. |
| Citas al blog entre respuestas con citas | Respuestas evaluables que contienen al menos una cita clasificable | Métrica secundaria condicional, claramente titulada | No confundir con tasa sobre todas las respuestas ni con el ownDomainShare actual. |
| Distribución por motor | Mismo run/cohorte, corte por provider y superficie | Comparación de presencia/cita del blog con cobertura de cada motor | Un proveedor fallido no equivale a cero presencia. |
| Menciones SKY, Share of Model, sentimiento | Marca dentro del panel declarado | Sólo contexto secundario de panel si ayuda a interpretar las citas; no sustituye hechos URL | No son score o sentimiento del blog. |
| Overall score y dimensiones actuales | Marca, categoría y fórmulas globales del Grader | Contexto etiquetado del panel como máximo; fuera del tablero principal del blog | No recalcularlos con las citas filtradas ni titularlos «score AEO del blog». |
| Share of Voice actual | Menciones de marca y competidores del mismo panel | Contexto explícito si hay panel de competidores elegible; conservar límites existentes | No representa share de citas/URL del blog ni cuota real de mercado. |
| Citation source breakdown registrable | Sitios/dominios registrables de todo el panel | Contexto general como máximo, o excluir si distrae; nuevo agregado host-exacto para resultado blog | `skyairline.com` no prueba que se citó blog.skyairline.com. |
| Readiness/probes de perfil raíz | Sitio efectivamente probado | No atribuir al blog; sólo incluir un diagnóstico técnico blog si probes acreditan ese host | El probe de raíz no certifica preparación del blog. |
| Tráfico desde asistentes en GA4 | Sesiones según contrato GA4 aplicado al blog | Fuente GA4, separada y adicional a AEO engine | No acredita que hubo una corrida, que una URL fue citada o que una cita causó esa visita. |

El informe debe mostrar resultados del blog en el panel y nombrar el instrumento. Los indicadores generales de marca,
si se conservan como contexto, no compiten como cifras del trabajo editorial y no satisfacen por sí solos el requisito
`aeo_run` acotado a URL. No se exige publicar un overall score del blog para incluir obligatoriamente el motor.

## 6. Denominadores, cero y citas que no se pueden clasificar

La selección de prompts se define por el panel/cohorte antes de medir. Filtrar primero «respuestas que citan el blog»
y calcular sobre ellas haría subir artificialmente el resultado. Para el mínimo con corrida general, el denominador
es el conjunto de respuestas elegibles del panel general declarado; no se inventa una cohorte editorial a posteriori.

Estados a diferenciar:

- **Evidencia válida y cero citas al blog:** puede ser un resultado real. Numerador cero con denominador positivo y
  URL/citas suficientemente clasificables; no rechazar el motor sólo porque el hallazgo sea desfavorable.
- **Respuesta válida sin citas:** conservarla en el denominador principal si el contrato del motor permite medir
  ausencia de citación. La tasa condicional entre respuestas con citas tiene denominador diferente y puede ser null.
- **Proveedor sin capacidad de devolver citas, fallo o respuesta no evaluable:** cobertura no evaluable/no muestreada,
  no cero automático de citas. Aplicar el contrato de la superficie/provider real.
- **URL de redirect o destino no resoluble:** registrar cobertura de cita no clasificable. `buildCitation` permite un
  dominio explícito distinto al URL host (`observation.ts:70–81`): se observaron redirects de Vertex. Conocer el dominio
  no prueba el path de destino. Un filtro por ruta requiere URL final probada; un host-only puede admitir evidencia
  de host explícito verificado bajo un contrato distinto, declarado y probado, nunca asumir la URL de destino.
- **Sin observaciones elegibles o sin run en la ventana requerida:** fuente ausente/no elegible, no tasa cero.

No seguir redirects mediante fetch ad hoc desde Insights. Si se necesita resolver el destino, la capacidad pertenece
al collector/normalizer dueño, con su seguridad de URL y provenance. Para reutilizar el run existente se puede usar la
parte directa clasificable y publicar su cobertura; evaluar si satisface el gate requerido antes de considerar otro run.

## 7. Selección temporal, comparación y cadencia

El adapter actual llama `readClientGraderReport({organizationId, finishedWithin})`
(`efeonce-insights/adapters/aeo-adapter.ts:35–37`), acepta sólo asOf dentro de la ventana y respeta gates
review_required/insufficient_data (`:56–67`). Se conservan esas garantías, añadiendo selector/binding explícitos.

El informe debe identificar la fecha de la corrida como corte puntual, no promedio mensual de visibilidad IA. Si la
ventana mensual no tiene corrida propia, una corrida externa a ella sólo puede entrar con una política de asOf explícita
y rotulada; no proyectarla como si hubiese ocurrido dentro del mes. Sin esa decisión, falta una fuente obligatoria.

Para comparación, exigir mismo alcance, mercado/locale, método de proyección y cohorte reproducible. Verificar además
digests de prompts ejecutados, brand/non-brand, mix de intent/familias y providers/superficies. Si difieren, publicar los
dos cortes con la limitación pertinente o restringir al panel común **mediante cálculo dueño declarado**, no fabricar un delta.

`getPreviousComparableScore` ya filtra perfil, scoreVersion, mercado/locale/provider policy y registra cambios de
competitor set (`scoring/store.ts:178–210`). `buildReportTrend` comprueba `promptPackVersion`
(`report/trend.ts:63–98`). Falta asegurar igualdad efectiva del instrumento cuando el mismo string de pack contiene
distinto número de prompts/proveedores, como los dos runs CL inspeccionados. El adapter de Insights enlaza facts de
ventanas sólo por metricId (`aeo-adapter.ts:210–216`), sin validar esa comparabilidad por su cuenta.

La recurrencia del informe no debe lanzar una corrida AEO por defecto. Puede consumir una corrida elegible ya creada
por la cadencia autorizada del motor; si falta, deja la edición requerida pendiente/failed con causa. Automatizar nuevas
corridas es una operación de presupuesto/entitlement separada del scheduler de Insights.

## 8. Gate obligatorio por fuente, no sólo por módulo

El requirement servidor del informe debe exigir las tres fuentes: `gsc`, `ga4` y `aeo_run`. Los nombres finales son
de contrato, no enums implementados aquí. La selección `modules:['seo','aeo']` no prueba que estén presentes:

- SEO incluye GA4; un SEO con sólo facts GA4 puede superar el actual gate de módulo aunque falte GSC.
- AEO incluye `ga4AiFacts` aunque no haya run del Grader; puede superar el gate de módulo sin `aeo_run`.
- `generation.ts:137–147` sólo comprueba si cada módulo tiene algún hecho no-reference; no comprueba estas fuentes.
- `allowPartial` y errores degradados no deben convertir la ausencia de una fuente requerida en un informe completo.

Cada fuente requerida debe tener receipt propio con identidad/versiones/selector, población aplicada, cobertura y estado
eligible. Para AEO se exige la corrida y su proyección del blog; un `score` global sin evidencia URL no satisface el scope.
El gate no exige un valor positivo ni un global score: un cero medido de citación puede ser plenamente elegible.

Los tres receipts deben validar antes de congelar y antes de emitir. El plan debe poder explicar las tres fuentes con
sus calendarios, sin equiparar clics GSC, sesiones GA4 y observaciones AEO. Si falta alguna, mostrar el bloqueo y el
trabajo necesario; no reducir el entregable solicitado a otro de menos fuentes sin nueva decisión del usuario.

## 9. Cambios concretos de implementación y límites

| Unidad | Home dueño | Trabajo necesario |
| --- | --- | --- |
| Proyección AEO por URL | `growth/ai-visibility/client`, `report`, contrato/DTO y tests | Run exacto tenant-safe, scopeRef, observaciones/citas, agregados/denominadores/calidad y metadata minimizada. |
| Selección/pinning | Reader dueño y binding de Insights | Mercado/perfil/run/cohorte explícitos; referencia estable actual/comparación y digest de instrumento. |
| Adapter AEO | `efeonce-insights/adapters/aeo-adapter.ts` | Consumir la proyección URL; no usar métricas root como mediciones blog; fuente engine diferenciada de GA4. |
| Gate de fuentes | `contracts/evidence`, orchestration/generation/validation/lifecycle | Requisito GSC+GA4+AEO engine no omitible y receipt por fuente. |
| Plan y salidas | Copy, planner, client-fit, PDF/deck/web | Panel/asOf/cobertura, blog exacto, cero real, límites y contexto de marca distinguido. |
| Evolución editorial opcional | PromptSet commands/review/run policy del motor | Panel relevante a contenido del blog, cohortes/versiones por mercado y alcance de uso. Sólo tras decidir/autorización. |

Cambiar el contrato/proyección compartido requiere identificar ADR y actualizar canon/paridad de API/MCP si se expone
selector nuevo. Reusar el reader propietario y DTO cliente; no abrir acceso de Insights a raw provider observations ni
crear una tabla de score paralelo. No cambiar el nombre de marca por la superficie medida.

## 10. Matriz de aceptación específica AEO

| Prueba | Resultado exigido |
| --- | --- |
| Run ajeno o perfil/mercado distinto al binding | not_found/conflicto seguro; no ampliar autoridad. |
| Dos runs de la org dentro del mes | Selector determinista fija run/cohorte; no cambia al aparecer otro. |
| Panel general con citas blog y web principal | Sólo URL blog en numerador/listado; denominador del panel completo declarado. |
| Mismo dominio registrable, hosts distintos | Blog y raíz no se fusionan en métricas URL; matching de marca legacy sigue intacto. |
| Citas duplicadas a la misma URL en una respuesta | Distintos conteos de citas, URL únicas y respuestas; sin inflar la tasa principal. |
| Panel válido y ninguna cita blog | Cero medido elegible, no ausencia ni bloqueo por resultado negativo. |
| Todos los providers fallan o no hay URLs evaluables | No cero; fuente no elegible o cobertura insuficiente según contrato. |
| Redirect con dominio explícito sin URL final | No inventar path; cobertura y razón. Host-only sólo por evidencia verificada y política explícita. |
| Brand score cambia al re-score posterior | Snapshot de Insights congelado no cambia; nueva corrección por revise. |
| Perfil vivo cambia de website | MatchingSnapshot/run binding siguen describiendo la corrida original. |
| Prompts6/proveedores4 vs prompts12/proveedores5 con mismo pack string | Comparabilidad se rechaza o se limita mediante método dueño explícito. |
| Fuente AEO run ausente pero GA4 AI presente | El informe de tres fuentes no alcanza estado listo. |
| GSC ausente pero SEO tiene GA4 | El informe de tres fuentes no alcanza estado listo. |
| `allowPartial=true` y falta cualquier fuente requerida | No bypass de requirement del informe. |
| Scope host correcto y score global alto | No titular el global como score del blog; las cifras principales conservan su población URL. |
| DTO cliente | No raw answer text, secretos, prompts completos, punteros internos ni URL fuera del host en detalle blog. |
| A4/deck/web | Misma corrida/cohorte/asOf/alcance; web público sólo tras client+issued y autorización correspondiente. |

## 11. Decisiones pendientes que realmente importan

1. Aceptar como primer instrumento una corrida general existente con proyección URL del blog y su panel rotulado.
   Es la ruta mínima recomendada; no prometer que ya es un panel editorial.
2. Elegir run/mercado/ventana actuales y comparables mediante el reader ampliado y su gate; no usar latest organizacional
   como selector suficiente. Los IDs comprobados son candidatos, no una selección aprobada o edición creada.
3. Fijar métrica principal/denominador de citas blog y cobertura de URL directas/redirecciones. La semántica pertenece al motor.
4. Formalizar requirement de las tres fuentes y el comportamiento ante fuente ausente/incomparable, sin recortar el encargo.
5. Decidir posteriormente si hace falta panel editorial propio por mercado; sólo entonces autorar/aprobar y ejecutar
   nuevas corridas con el command, presupuesto y review del motor.

Este discovery identifica evidencia existente reutilizable y trabajo concreto para incluir obligatoriamente AEO.
No prueba una corrida dedicada al blog, no afirma que sus doce citas directas sean una tasa ya calculada ni declara
listo el informe solicitado antes de conectar y validar las tres fuentes.
