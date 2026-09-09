# Efeonce Insights — Architecture V1

> Status: **Diseño para implementación**, 2026-09-08. Dirección aprobada; nada de este documento acredita
> código, migraciones, configuración ni runtime nuevos. Owner: Platform + Client Experience.
> [ADR](EFEONCE_INSIGHTS_PLATFORM_DECISION_V1.md) · [EPIC-045](../epics/to-do/EPIC-045-efeonce-insights-multiformat-intelligence.md).

## 1. Producto y alcance inicial

**Efeonce Insights** convierte evidencia del cliente en una entrega ejecutiva y operativa que puede leerse,
presentarse, compartirse y recuperarse después. Greenhouse conserva biblioteca, encargo, permisos y operación.

- Tres salidas: `deck_pdf` horizontal 16:9; `report_pdf` A4 vertical; `web` responsive.
- Módulos iniciales: SEO, AEO e ICO/delivery (RpA y OTD); combinables en una misma edición.
- Período explícito, zona horaria, comparación, proyectos, audiencia, idioma y profundidad.
- Branding Efeonce obligatorio; logo del cliente opcional y autorizado, con pack/asset versionado.
- ID estable de reporte, versiones inmutables, revisión editorial, enlaces y entrega por correo.
- API, UI y MCP equivalentes; generación asíncrona y programación recurrente gobernada.
- Dos recorridos autenticados de primera clase: autogestión del cliente y gestión de colaboradores
  internos autorizados; el acceso compartido por token es un tercer recorrido limitado a una edición.
- Quedan fuera PPTX/DOCX editables, diseñador libre de slides, métricas nuevas, refresh facturable implícito,
  BI ad hoc, distribución masiva, cambios de fórmula, extracción de repositorio y migración general del Grader.

Efeonce Insights es la biblioteca de entregas; no sustituye el historial de insights de Nexa ni su
`NexaInsightsBlock`. Los hallazgos de Nexa pueden aportar evidencia autorizada mediante un adapter futuro.

## 2. Evidencia actual y reutilización

Inspección local del 2026-09-08; disponibilidad productiva se verifica al ejecutar cada task.

| Pieza existente | Qué se reutiliza | Brecha / dueño |
|---|---|---|
| `src/lib/artifact-composer/` | Selector, slots, validadores, manifest y brand packs | Nuevos catálogos analíticos; TASK-1847 |
| `src/lib/commercial/tenders/proposals/render-jobs.ts` + `services/artifact-worker/main.ts` | Enqueue/outbox, dispatcher, verificación de manifest y assets | Hoy atados a Proposal; adapter Insights sin romper Proposal; TASK-1846 |
| `src/lib/growth/ai-visibility/report/{command,snapshot,short-link}.ts` | Readers, snapshot público, patrón de enlace revocable | Un enlace activo por reporte no satisface múltiples grants; TASK-1848 |
| `src/components/growth/{seo,ai-visibility}/report-artifact/` | Modelos y proyecciones de audiencia existentes | Adaptación semántica, nunca scores vacíos inventados para encajar; TASK-1845 |
| `src/lib/ico-engine/read-metrics.ts` | Métricas canónicas de espacios | Evidencia de ventana y granularidad; TASK-1845 |
| `src/lib/email/delivery.ts`, `types.ts`, `context-resolver.ts` | Entrega, clasificación, dedupe/contexto | Nuevo caso Insights; TASK-1848. Presentación visual del correo: TASK-1849 |
| `src/mcp/greenhouse/tool-manifest.ts` | Inventario federable | Entradas por capability en sus tasks backend, no otra API de reportes |

`TASK-1672` conserva el artefacto especializado de auditoría técnica SEO y `TASK-1673` su entrypoint de
sharing/envío. Adoptan Insights como consumidoras; no duplican motor, snapshot, tokens ni sender. Su gate
de hallazgos de sitio y restricciones de audiencia permanece. `TASK-1644` conserva VisualProfile; co-branding
de Insights usa el brand pack actual y no introduce un segundo registry de skins. EPIC-018 conserva los
dashboards de desempeño; Insights sólo produce entregas congeladas.

## 3. Ownership y topología

Ubicaciones **nuevas propuestas**, no existentes: `src/lib/insights/`, `src/views/greenhouse/insights/`,
`src/components/insights/`, `src/lib/copy/insights.ts`, catálogos `insights-deck` y `insights-report` dentro
del Composer. No crear `apps/*`, `packages/*`, repo, servicio ni pool antes de una decisión independiente.

```mermaid
flowchart TD
  Clients[UI / Product API / MCP] --> Commands[Insights commands y readers]
  Commands --> Policy[Autorizacion y validacion]
  Policy --> Adapters[SEO / AEO / ICO adapters]
  Adapters --> Evidence[Snapshot de evidencia]
  Evidence --> Plan[Plan editorial y ChartSpec]
  Plan --> Outbox[Jobs durables + outbox]
  Outbox --> Worker[Artifact Worker / Composer]
  Worker --> Outputs[Assets privados y validacion]
  Outputs --> Edition[Edicion emitida]
  Edition --> Web[Vista web por grant]
  Edition --> Delivery[Correo centralizado]
```

Los módulos gobiernan hechos y permisos; Insights gobierna edición y distribución; Composer gobierna
composición; Platform gobierna job/asset; Email gobierna transporte. API/MCP/UI no consultan fuentes por su cuenta.

## 4. Modelo de dominio

Nombres lógicos propuestos; TASK-1845 materializa schema/DDL con helpers canónicos y migraciones additive.

| Entidad | Identidad y autoridad | Invariantes |
|---|---|---|
| InsightReport | ID opaco + código legible único, p.ej. `EO-INS-2026-000123`; organización y propósito | Código no es secreto; unicidad atómica, sin `MAX+1`; org inmutable |
| InsightEdition | reportId + versión + encargo + audience | Sólo edición emitida es compartible; editar/corregir crea versión, no muta la emitida |
| EvidenceSnapshot | Hechos mínimos, fuentes y hashes de evidencia | Inmutable al sellar; sólo datos autorizados; sin PII operativa innecesaria |
| EditorialPlan | Secciones, claims, ChartSpec, acciones, referencias | Congela datos y texto final; versiona modelo/prompt si hubo IA, sin chain-of-thought |
| RenderRun / Output | edición + target + manifestHash + assetId | Estado y error por salida; retries sin duplicar archivos finales |
| ShareGrant | edición + hash de token + expiración + downloadPolicy | Muchos por edición, revocación individual; no autoriza biblioteca ni queries libres |
| DeliveryIntent | edición + destinatarios + outputs + autorización | Cada destinatario tiene estado; referencia `email_deliveries`, no segundo transporte |
| InsightSchedule | encargo relativo + zona + frecuencia + autoridad | Resolución de período por ocurrencia; inactive por defecto; generación y envío separados |

Materializar relaciones dentro del dominio con integridad de organización en todas las referencias. Ownership
de nuevos stores: TASK-1845 núcleo; TASK-1846 renders/outputs; TASK-1848 grants/delivery/schedules. Los catálogos
globales tienen ownership explícito de plataforma; logos del cliente quedan ligados a su org y versión.

### Ciclos de vida independientes

- Edición: `draft → collecting → composing → validating → ready_for_review → issued`; `failed` recuperable
  por fase y `withdrawn` para retirada de acceso. Emitir exige los outputs solicitados validados.
- Render por target: `queued → running → succeeded | failed | cancelled`. Lease vencido permite recuperación
  con fencing; un worker antiguo no puede finalizar encima del nuevo.
- Share: `active → revoked | expired`; no se reactiva un token revocado.
- Delivery: `pending → accepted → delivered | bounced | failed`; aceptación HTTP no es entrega ni lectura.
- Schedule: `draft → active → paused | retired`; cambio de audiencia/destinatarios invalida autorización anterior.

UI muestra progreso por fase; no inventa porcentajes. Un PDF listo y otro fallido se muestran separados,
sin emitir una entrega completa ficticia. El usuario puede solicitar una nueva edición con otro output set.

## 5. Contrato de datos y ventana temporal

`InsightRequestV1` propuesto: `organizationId`, `projectIds`, `modules[]`, `period{start,endExclusive,timeZone}`,
`comparison`, `audience`, `locale`, `depth`, `outputs[]`, `brand{efeoncePackVersion,clientBrandRef?}` y
`idempotencyKey`. El actor proviene de la autoridad autenticada; nunca del payload.

Ventanas `[start,end)` se resuelven en zona IANA y se almacenan también en UTC. La UI puede mostrar fechas
inclusivas. Comparación anterior conserva regla de calendario explícita: mes anterior, año anterior o rango
custom; nunca asume que un mes tiene 30 días. Período abierto se etiqueta parcial. El `asOf` de cada fuente
se conserva; el corte del conjunto no implica que todas las fuentes se hayan actualizado al mismo instante.

Cada `ModuleReportAdapterV1` declara:

- version, módulo, capacidades, dimensiones/filtros permitidos y granularidades/ventanas disponibles;
- reader canónico y política de audiencia; queries parametrizadas y sin SQL elegido por un agente;
- hechos: metricId, valor/null, unidad, numerador/denominador cuando aplica, población, fuente, método/version;
- cobertura, freshness, observación/estimación y `evidenceRef`; razones de ausencia o incomparabilidad;
- secciones sugeridas y pares de hechos comparables; ningún componente visual propio ni llamada directa a provider.

**SEO:** consume series/readers existentes; posiciones, tráfico, visibilidad y ETV mantienen su metodología.
No mezcla fórmulas ETV; auditoría técnica hereda gates de TASK-1672. **AEO:** distingue snapshot puntual de
serie comparable por engine/prompt pack/modelo/metodología; no inventa histórico desde el último score.
`review_required`/`insufficient_data` se respetan. **ICO:** RpA y OTD salen del dueño; se mantienen supresión,
cohorte, denominador, período y regla de entrega. Nunca promedia promedios ni porcentajes sin pesos válidos.

Si un reader no sirve una ventana exacta, el adaptador declara `unsupported_window`; puede ofrecer granularidad
compatible explícita, nunca usar el dato actual como histórico. Datos incompletos de un módulo requerido
bloquean la emisión por defecto. Una política explícita `allow_partial` puede emitir omisiones visibles,
pero nunca salta los gates de seguridad, validez del instrumento o auditoría técnica.

## 6. Plan editorial, gráficos y salidas

El plan contiene resumen ejecutivo, capítulos de módulos, hallazgos con evidencia, acciones con owner sólo
si existe, límites y metodología. Cada cifra en texto/gráfico/tabla referencia el mismo hecho; una validación
rechaza discrepancias. La IA recibe exclusivamente evidencia allowlisted, con límites de tokens, costo,
timeout y máximo de reparaciones; sin herramientas de escritura/envío. Fallback determinista produce una
lectura factual cuando no hay modelo, sin inventar explicación. Aprobación ligada al hash final de edición.

`ChartSpecV1` propuesto define relación, series, dimensiones, unidades, escalas, base, etiquetas, referencias
y equivalente tabular. Familias iniciales obligatorias: barras simples/agrupadas/apiladas, líneas, circular/donut
y dispersión. Histogramas, box plots y heatmaps quedan como extensión compatible, no condicionan el primer cierre.
Barras con origen cero; pie/donut sólo partes no superpuestas de un mismo total; dispersión requiere observaciones
pareadas; no causalidad automática; gaps reales no se interpolan silenciosamente; sin 3D ni doble eje engañoso.

- **Deck:** 16:9, relato ejecutivo, una conclusión principal por lámina, gráficos/etiquetas legibles,
  portada con ID/período/versión y contraportada institucional. Pie según norma de decks.
- **Informe vertical:** A4, retícula editorial propia, portada/resumen/índice real para documentos largos,
  capítulos, tablas repetidas y anexos; control de viudas, cortes y continuaciones. URL bubble/contacto/folios
  según norma de informes. Índice, enlaces y texto seleccionable se verifican en el PDF final.
- **Web:** navegación por capítulos, tablas equivalentes, tooltips/selección accesibles, responsive y downloads.
  Sólo filtra el dataset congelado incluido; cambiar período o consultar otro módulo requiere nueva edición
  y autoridad. No replica el PDF como imagen ni convierte el snapshot en un dashboard vivo.

Composer resuelve intención `contentType` a plantilla; autoría no elige CSS ni geometría. La paginación vertical
se resuelve mediante un plan de páginas determinista del catálogo; si un límite genuino exige extender el motor,
TASK-1846 incorpora únicamente la primitive domain-free, y TASK-1847 conserva layout y resolvers. No hay fork.
Versionar y fijar brand pack, fuentes, catálogo, plan y renderer. Fidelidad semántica/visual es obligatoria;
igualdad de bytes PDF sólo si el renderer normaliza metadatos y el benchmark la demuestra.

## 7. API, MCP y autorización

Superficie **propuesta**, naming final de rutas/capabilities se registra durante implementación:

| Operación canónica | API / MCP | Dueña |
|---|---|---|
| list/get/catalog/validateRequest/createEdition/revise/issue | Thin adapters App/Ecosystem; listado paginado y estados compactos | TASK-1845 |
| requestOutputs/getRun/retryOutput/cancelRun | Requests asíncronos, sin esperar Chromium | TASK-1846 |
| createShare/revokeShare/getShare/withdrawEdition | Writes gobernados; token sólo al emitir enlace autorizado | TASK-1848 |
| requestDelivery/getDelivery/createSchedule/pauseSchedule | Autorización exacta por destinatario, modalidad y recurrencia | TASK-1848 |
| resolveSharedEdition/downloadSharedOutput | Token de lectura limitado, sin OAuth ni discovery de módulos | TASK-1848 |

API responde `202` con `reportId/editionId/runId` para trabajo asíncrono. Repetir la misma idempotency key y
payload devuelve el mismo recurso; diferente payload con misma key devuelve conflicto. Todas las escrituras
usan command + audit/outbox; todos los readers verifican scope. Errores sanitizados por causa: forbidden,
invalid_window, unsupported_window, insufficient_data, method_mismatch, not_ready, quota_exceeded,
manifest_drift, expired/revoked/not_found y delivery_failed; integración con errores canónicos, no raw errors.

Views, entitlement Insights y grants de módulos son planos distintos. Revalidar actor/org/módulos al crear,
ejecutar, emitir y distribuir. MCP hereda consentimiento efectivo; base-only read no autoriza create, issue
ni send. Nuevas tools se registran en el manifest Greenhouse, se sincronizan en el gateway por su workflow y
se prueban allow/deny/revocación. TASK-1844 completó la base de selección multiorganización interna; su
adapter inicial sólo delega `growth.seo.observation.read`, por lo que **no autoriza capabilities Insights**.
Insights debe incorporar su contrato y policy de target propios al federarse, reutilizando ese reader y
sin reimplementar OAuth. No bloquea el primer flujo uniorganización ni acredita sus writes.

### 7.1 Contrato de audiencias autenticadas — integración EPIC-046

Decisión del operador 2026-09-09. [EPIC-046](../epics/to-do/EPIC-046-client-services-visibility-and-self-service.md)
integra Insights como capacidad del portal cliente y del trabajo del equipo, no sólo como enlace a un PDF.
El actor autenticado y la audiencia del artefacto son dimensiones distintas: un colaborador puede crear
una edición para cliente, pero eso no autoriza incluir su evidencia interna en esa edición.

| Recorrido | Acciones previstas | Frontera obligatoria |
|---|---|---|
| Cliente autenticado | Biblioteca propia, elegir servicio/período/formato, solicitar/generar ediciones de plantillas permitidas, consultar progreso/historial y descargar salidas autorizadas | Organización desde sesión; módulos, proyectos, plantillas, formatos y cupos permitidos; sin selector libre de otras cuentas ni editor de evidencia/fórmulas |
| Colaborador interno autorizado | Gestionar las cuentas a su cargo, preparar/revisar/emitir ediciones, recuperar jobs, compartir, entregar y programar según capability | Ser interno no concede todas las cuentas ni todos los verbos; target y permisos se revalidan en cada command |
| Destinatario de enlace | Leer/descargar la edición emitida permitida | El ShareGrant no abre biblioteca, crea ediciones, envía correo ni actúa como identidad del cliente |

La autogestión no queda reducida a descarga: el cliente puede iniciar generación gobernada con datos ya
disponibles y ver su resultado. `createEdition` no equivale a `issue`: si la policy exige revisión,
queda `ready_for_review` con owner; emitir siempre requiere autoridad explícita. Sólo se habilitan
plantillas y proyecciones cliente seguras. Ningún caller puede pedir `audience=internal` para ampliar acceso.
Un borrador de trabajo interno no aparece al cliente por compartir organización; éste ve sus solicitudes
con estado redactado y las ediciones que la policy autoriza. Reutilizar edición o output exige coincidencia
de audiencia/proyección y autoridad: nunca deduplicar por org/período omitiendo esos ejes.

Descargar, crear/revocar enlace, emitir, enviar desde Efeonce y programar son permisos independientes.
Un cliente puede compartir mediante grant sólo si tiene esa capability explícita y edición elegible;
no adquiere envío corporativo ni programación por generar un informe. Si se habilita una recurrencia
cliente, tiene alcance propio y autorización revalidada por ocurrencia, sin refresh facturable implícito.

TASK-1845 posee catálogo elegible, projection/autoridad, autoría y estados; TASK-1846 revalida la
autoridad en ejecución y no reutiliza outputs de otra audiencia; TASK-1848 posee distribución/recurrencia;
TASK-1849 compone ambos recorridos y shared con componentes comunes y acciones devueltas por el servidor.
El menú cliente usa el primitive module-driven vigente, con un destino Insights canónico y accesos
contextuales desde Inicio/Mis servicios/SEO/Delivery, sin builders o bibliotecas duplicadas por módulo.

Berel combina SEO y marketing de contenidos; Sky usa diseño digital/ICO. Los adapters consumen los
readers de los dominios productores, jamás importan del BFF `client-portal`. Si P02 de EPIC-046 descubre
un campo reusable, lo añade en su dominio dueño y ambos consumers lo usan. AEO sólo se incorpora cuando
el alcance y permisos lo habiliten. Dashboard actual e informe congelado comparten fórmula/fuente, pero
pueden tener distinto corte; mostrar fecha/período explica la diferencia, no forzar igualdad fuera del snapshot.

## 8. Acceso web compartido

Tokens opacos aleatorios de al menos 128 bits de entropía; persistir digest, nunca bearer recuperable.
Mostrar URL secreta sólo al crear; después regenerar significa un grant nuevo. La entrega autorizada que
necesite retry conserva el secreto únicamente cifrado y efímero dentro del carril sensible canónico, con
retención mínima; no lo copia en outbox genérico, logs, analytics ni errores. Resolver asset y auth en servidor.

Ruta propuesta `/insights/shared/<token>`: excluir de indexación, `Referrer-Policy: no-referrer`, CSP sin
terceros ni tracking de enlace del proveedor email, redacción del path en observabilidad y
`Cache-Control: private, no-store`. Revocación se comprueba en cada lectura y descarga; no entregar una URL
de storage duradera que permita saltársela. Download por proxy autorizado o mecanismo equivalente con prueba
de revocación, no bucket público. Lo descargado antes no es revocable.

El grant queda ligado a organización/edición/audiencia/outputs, con expiración configurable obligatoria
(default de diseño 30 días, máximo inicial 90; configurables por policy, no por token arbitrario del caller).
Retirada de edición, organización suspendida o revocación de autorización de distribución del módulo corta
acceso incluso con token válido. No requiere sesión individual del visitante. Revalidación en revocación
concurrente tiene punto de autorización antes de servir bytes; una respuesta ya en vuelo no se puede retirar.

Access logs mínimos y retención explícita: distinguir requests de robots/prefetch cuando sea posible; nunca
afirmar persona, lectura o engagement a partir de un hit. Rate limits por origen/grant sin usar token crudo.
Unknown/revoked/expired muestran recuperación segura sin revelar nombre del cliente a un visitante inválido.

## 9. Correo y recurrencia

`DeliveryIntent` congela edición, lista de destinatarios validada, asunto, modalidad y autorización. Enlace
por defecto al portal autenticado para sus usuarios; ShareGrant explícito para distribución compartida.
PDF adjunto opt-in con consecuencia de irrevocabilidad visible. Resolver remitente/contexto por
`src/lib/email/`; nuevo EmailType/seed disabled, sensibilidad según payload y footer canónico. Todo correo
con ShareGrant es token-sensitive; un deep link autenticado no necesita bearer. Cliente puede
copiar enlace/descargar; envío desde Efeonce exige capability interna separada, sin open relay a direcciones libres.

Intent/outbox antes del efecto externo; dedupe por intent + destinatario + versión + modalidad. Ante timeout
ambiguo consultar ledger/proveedor antes de reenviar; retries limitados, resultado por destinatario y
webhooks idempotentes. Reusar email_deliveries/reconciliación y kill switches. Envío no genera otra edición.

Recurrencia usa scheduler/dispatcher existentes, sin cron nuevo por cliente. Schedule define ventana relativa,
zona, días de consolidación, módulos, output set, política de revisión y autoridad durable. Ocurrencia única por
scheduleVersion + período; dos ticks no duplican. Caída se recupera por política explícita de catch-up acotado
(una ocurrencia pendiente por defecto), no tormenta histórica. Revocar autoridad pausa el schedule. Default:
genera borrador para revisión; autoemisión/envío exige autorización previa explícita, acotada y revocable.

### 9.1 Activación y retorno al portal — EPIC-046

Decisión de producto del operador, 2026-09-09: Insights debe llegar por correo con valor útil y deep links;
notificaciones por email, in-app y Teamsbot acompañan el servicio desde esta fase. La app móvil y su
adapter push quedan para una fase posterior. Este contrato describe el resultado exigido, no un envío
habilitado ni la disponibilidad actual del Hub.

**Recorrido:** hecho relevante → destinatario autorizado → aviso útil → destino exacto del portal →
acción/consulta → seguimiento. No enviar recordatorios genéricos para inflar visitas. El correo muestra
un resumen suficiente para comprender el hallazgo: período, fuente/corte, puntos principales y próximo
paso. Su CTA lleva a la edición o pendiente concreto; no obliga a entrar sólo para descubrir qué ocurrió.

| Momento verificable | Destinatario y canales | Destino / condición |
|---|---|---|
| Edición emitida y elegible para el cliente | Destinatarios validados; email de Insights + in-app; Teamsbot si el destino está habilitado | Edición exacta, con resumen de resultados y CTA al portal. No notificar un draft como informe disponible |
| Pieza lista para revisión o información requerida | Responsable real de revisión/brief; in-app + email accionable; Teamsbot según preferencias y disponibilidad | Pieza, revisión o solicitud concreta; conserva el proveedor dueño cuando la acción ocurre fuera |
| Solicitud recibida, respuesta o cambio material de estado | Solicitante y responsables autorizados; in-app, email según tipo/importancia | Detalle e historial. Acuse no significa aceptación ni entrega |
| Informe pendiente de revisión interna o fallo de entrega | Colaborador responsable; in-app + Teamsbot y email según policy | Revisión/recuperación interna; no exponer diagnóstico ni borrador al cliente |
| Resumen periódico de progreso y pendientes | Suscriptores elegibles; email e in-app, Teamsbot configurado | Insights/ciclo del servicio. Cadencia por cuenta y zona, pendiente de validar; sin resumen vacío ni reenvío de la misma edición |

Estos momentos son semántica de producto, **no nombres nuevos de eventos ya registrados**. Cada dueña
mapea el hecho al catálogo/outbox existente, o propone el evento faltante, antes de implementarlo.
Berel prioriza SEO, avances editoriales y revisiones; Sky, diseño digital, entregables y feedback.
No incluir AEO por inferencia ni alertas de umbral sin método y configuración verificados.

**Deep links y autoridad.** El destino se construye con el origen de entorno y rutas canónicas resueltas
en servidor. Conserva edición/servicio/objeto y período al completar login. El retorno sólo acepta destinos
internos permitidos; no hay open redirect. La sesión revalida organización, pertenencia, módulo y acción:
el enlace no concede acceso ni cambia de cuenta silenciosamente. Otra cuenta, permiso revocado o edición
retirada llevan a un estado seguro sin exponer el objeto. GET, preview del correo y escáneres no aprueban,
no marcan leído ni ejecutan commands. Un enlace ShareGrant sigue el contrato separado de §8 y nunca abre
la biblioteca privada. No incluir bearer/PII en analytics ni resolver tracking mediante tokens de acceso.

**Canales y preferencias.** El hecho tiene correlación común y resultado independiente por destinatario
y canal. Reutilizar Notification Hub y los adapters canónicos: email por `sendEmail()` y
`greenhouse_notifications.email_deliveries`; in-app por el servicio existente; Teamsbot por su dispatcher.
El destinatario es la persona/usuario canónico con contexto de organización, no obligatoriamente un
`member_id` laboral: no crear colaboradores ficticios para notificar a clientes. La audiencia y el
contenido se calculan con permisos y responsabilidad; los defaults por rol no confieren acceso.

Teamsbot entra ahora para colaboradores y destinos cliente realmente habilitados. P01 verifica tenant,
instalación, identidad y conversación autorizada por cuenta; no se asume que Berel o Sky pueden recibirlo.
Un canal compartido requiere audiencia permitida y payload mínimo; no publicar allí informes privados o
datos internos. Destino ausente queda como no disponible y conserva email/in-app según policy. La
habilitación externa necesaria queda con owner y evidencia, sin convertirse en bypass de aislamiento.

Preferencias por categoría/canal, zona horaria, horario de silencio, agrupación y límite de recordatorios.
Separar avisos operativos de suscripciones opcionales: resumen periódico opcional exige preferencia/baja
funcional; no habilitarlo antes de TASK-1774 y la policy de EPIC-042 cuando corresponda. Un cambio material
puede justificar aviso; un comentario menor puede entrar al digest. Revalidar objeto/responsable antes de
recordar y detener pendientes resueltos. Leer un aviso no equivale a resolver la revisión. No sustituir
automáticamente un canal silenciado por otro sin preferencia/policy que lo permita.

**Ownership y entrega incremental.** TASK-1848 posee eventos/intents de distribución Insights, recurrencia
y enlace autorizado; TASK-1849 su correo/preview y recorrido visible. P06 emite hechos de solicitudes;
P05 conserva revisión con su dueña. TASK-690/691/692 poseen Hub, shadow y cutover; TASK-693 preferencias y
experiencia de notificaciones; TASK-303 audiencia; TASK-387 digest; TASK-694 medición avanzada. EPIC-046
coordina estas dependencias, sin crear otro Hub ni sender. Los contratos legacy de esas tasks se reconcilian
con identidad/schema vigentes antes de ejecutar. TASK-1759 conserva la migración del self-webhook.

Antes del cutover del Hub, los eventos nuevos se integran en la projection reactiva existente y los
servicios canónicos con un único owner de envío por evento/canal; no crear otra projection, self-webhook
ni scheduler por cuenta. Si falta una garantía mínima, resolverla en la dueña antes de habilitar esa
cohorte. La transición al Hub conserva correlación/dedupe y preferencias y demuestra ausencia de doble
envío. La primera entrega cliente requiere email + in-app verificables; Teamsbot se certifica por destino.
El programa no se cierra sin registrar y resolver su matriz de canales, excepciones y responsables.

**Medición y cierre.** Distinguir evento elegible, intento, aceptación del proveedor, entrega, entrada
autenticada y acción completada. Cohortes por cuenta/categoría/canal con período y denominador explícitos;
medir consulta útil de Insights, retorno y resolución, además de fallos, rebotes y bajas. Aperturas/píxeles
o clicks de escáner no prueban adopción humana. TASK-694 conserva métricas avanzadas; cada primer flujo
ya exige correlación y evidencia de entrega → sesión autorizada → consulta/acción, con fixture técnico y
piloto cliente autorizados por separado. Retry, doble tick, revocación, pendiente resuelto y fallo parcial
de canal forman parte de la verificación. Un canal exitoso no convierte los otros en entregados.

## 10. Fiabilidad, calidad y gates

Contratos objetivo para validar, **no SLOs medidos**: ack de enqueue p95 ≤2 s bajo fixture de prueba; cancelación
impide nuevo trabajo; 2 workers concurrentes producen un output final; revocación niega la siguiente lectura
sin cache de contenido. Benchmark inicial: 15/25 slides, 10/30 páginas A4 y web con 4 familias gráficas, dos
organizaciones sintéticas, 3 runs por caso y una ráfaga de 5 jobs. Medir p50/p95, RSS máximo, tamaño, costo,
queue age y efecto sobre Proposal. TASK-1846 fija presupuesto operativo con esa evidencia antes del rollout.

Configurar límites de período, proyectos, series, filas, páginas, tamaño, concurrencia y costo; exceso produce
rechazo accionable o anexo explícito, nunca truncado silencioso. Retries sólo de errores transitorios; fallos
de método/layout/permiso no se reintentan sin corrección. Dead letter, replay y reconciliación de outputs
huérfanos son parte del worker. Persistencia y eventos atómicos; leases con fencing, cancelación y límites por org.

Validación por capa: fórmulas/fuentes → snapshot → texto/ChartSpec → geometría → PDF/web → acceso → entrega.
Fixtures cubren cero/null, negativos, etiquetas largas, falta de histórico, zonas/DST, cohortes y métodos distintos,
fallo de un módulo/target, redacción interna, revocación y duplicación. PDFs: revisar todas las páginas,
fuentes/texto seleccionable, índice/enlaces, pies, tablas y escala de grises. Web: desktop+390px, teclado,
reduced motion, contraste y `scrollWidth === clientWidth`. No afirmar PDF/UA sin certificación propia.

Retención: snapshots/outputs según policy de cliente y clase de datos; access logs separados. Expirar enlaces
no borra evidencia; eliminación autorizada genera tombstone/audit sin retener PII por el argumento de inmutabilidad.
Definir duración efectiva y cleanup verificable en TASK-1845/1848 antes de primera emisión externa.

## 11. Plan compacto y rollout

| Unidad nueva | Entrega y ownership | Dependencia |
|---|---|---|
| TASK-1845 | Dominio, snapshots, adaptadores SEO/AEO/ICO, plan editorial, API/MCP y permisos | Ninguna task abierta obligatoria; verificar readers y gates |
| TASK-1846 | Render durable multi-consumer, outputs, assets y recuperación sobre Artifact Worker | TASK-1845 |
| TASK-1847 | Biblioteca ChartSpec y catálogos deck/A4 premium; contratos visuales | TASK-1845; integra worker tras TASK-1846 |
| TASK-1848 | Sharing por token, correo, recurrencia y contratos programáticos | TASK-1845, TASK-1846 |
| TASK-1849 | Biblioteca/encargo/revisión en portal, vista web compartida y presentación email | TASK-1845/1846/1847/1848 |

Cinco nuevas unidades; cada una tiene slices, pruebas y rollout propios. TASK-1672/1673 son dos integraciones
especializadas ya en backlog: se coordinan, no se cuentan como nuevas ni se borran. No bloquean un informe
SEO de desempeño sin auditoría técnica; esa sección sólo se habilita cuando sus gates reales estén satisfechos.
El programa completo exige sus adapters si se ofrece dicha sección. No declarar auditoría técnica disponible
por haber terminado las cinco foundations.

Secuencia: foundation → worker y catálogo → distribución → experiencia integrada. Trabajo visual puede
prepararse con fixtures después del contrato foundation; no autoriza agentes paralelos ni editores simultáneos.
Cada task exige /goal y hook antes de implementación; hoy sólo se registra planificación en `develop`.

Gates propuestos independientes: generation, issuance, sharing, delivery y schedules, default OFF. Registrar
env/DB policy canónicos y cada runtime consumidor, no confundir `NODE_ENV` con staging. Promoción: fixtures
locales → integración interna staging → pruebas sintéticas de tenant/recovery/paridad → sign-off y piloto
cliente consentido → ampliación. No reutilizar el canary de identidad como cliente de prueba de Insights.
Rollback por lane: detener nuevos jobs; pausar emisión; revocar grants; detener delivery/schedules; conservar
historia. No borrar migraciones con datos ni reemitir adjuntos. Ensayar compatibilidad Proposal y rollback.

## 12. Fuentes y decisiones de ejecución pendientes

Canon: ADR Insights; Composer/render pipeline; Full API Parity; PostgreSQL tooling/access; entitlements;
MCP router/gateway; EMAIL_CATALOG; Report Brand Delivery; Executive Report Deck Method; UI premium standard.

Pendiente de ejecución: límites medidos/costo, retención por clase, DDL exacto, library de charts server-safe
tras prueba hermética/licencia y mapa final de primitives/rutas. No son preguntas que impidan registrar el
programa: tienen dueña y gate explícitos. La selección de library no se hace por moda ni impone proveedor nuevo.

## 13. Habilitación de agentes: skill operativa y distribución

Requisito agregado por el operador el 2026-09-08: una vez construida y verificada la capacidad, cualquier
agente autorizado que llegue por MCP o harness debe poder descubrir cómo usarla correctamente sin depender
de esta conversación. Es parte del cierre de las cinco tasks, no un follow-up opcional ni una sexta task.

**Skill propuesta `efeonce-insights`.** TASK-1845 es dueña del contenido operativo canónico y de su conexión
al catálogo MCP; TASK-1848 aporta distribución/recurrencia; TASK-1849 certifica el recorrido completo y la
instalación/descubrimiento desde harness. Preparar el contenido al implementar cada command; publicar sólo
instrucciones verificadas y compatibles con la superficie disponible. Una skill no concede permisos.

- Manual servido: `docs/mcp/skills/efeonce-insights/SKILL.md` (ruta nueva propuesta), registrado en
  `src/mcp/greenhouse/skill-manifest.ts` con `appliesTo` ligado a tools reales y audience autorizada.
  Reusar el catálogo, `get_greenhouse_skill` y los recursos existentes; no un segundo distribuidor.
- Harness: skill local en `.codex/skills/efeonce-insights/` y `.claude/skills/efeonce-insights/` (propuestas),
  con mirrors y routing explícito. Compartir una fuente de instrucciones operativas mediante generación o
  sincronización comprobable; un wrapper local no depende de un archivo inaccesible fuera del repo.
- El manual MCP es autosuficiente para operación remota: no requiere shell, rutas locales, secretos,
  acceso directo a PG ni leer skills privadas. Su audiencia sigue la policy efectiva de catálogo/tool;
  habilitarlo para clientes requiere verificación propia, nunca publicar instrucciones internas a todos.
- Las descripciones de tools disparan la carga del manual antes de acciones relevantes. Harness y MCP
  reciben entradas compactas y detalle bajo demanda; conectar un cliente no garantiza que cargue una skill.
  Verificar discovery, lectura y uso, no sólo que el archivo exista.

Contenido mínimo: cuándo usar Insights y elegir deck/A4/web; discovery de módulos y ventanas; scope de
organización y permisos; ejemplos de encargo simple y multimódulo; comparaciones, cobertura y límites de
SEO/AEO/ICO; selección honesta de gráficos; narrativa y revisión; branding; IDs/versiones; seguimiento
asíncrono, idempotencia, cancelación y recuperación parcial; emisión, tokens, descargas, correo y schedules;
estados de entrega, costos/cuotas, diagnóstico de errores y referencias de evidencia. Diferenciar acciones
permitidas, aprobación necesaria y capacidades todavía no disponibles. Ejemplos sanitizados, sin datos
reales de clientes ni tokens reutilizables.

**Evaluación obligatoria con agente sin historial:** descubrir/cargar la skill y crear una edición válida;
seleccionar ventana/comparación y formato; resolver falta de histórico; recuperar un output fallido sin
regenerar el exitoso; identificar que read no autoriza send; negar otro tenant; revocar enlace; diferenciar
accepted de delivered y generación de emisión. Ejecutar por MCP servido y harness local en perfiles de
prueba, con fixtures sintéticos y evidencia de las llamadas y sus resultados. No contar una respuesta textual
correcta como prueba de que se ejecutó la operación.

Versionar manual con los contratos y catálogos que enseña. Cada cambio de tool/schema/error/permiso actualiza
su receta y sus evaluaciones en el mismo cambio; checks de manifest/referencias/mirrors y canary servido
impiden publicar documentación de capacidades inexistentes. Report Studio, Deck Studio y las skills de
módulo aportan oficio; la skill Insights enseña a operar el producto sin duplicar sus fórmulas ni sus contratos.
