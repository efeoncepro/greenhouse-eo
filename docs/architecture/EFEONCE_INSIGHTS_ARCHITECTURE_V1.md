# Efeonce Insights — Architecture V1

> Status: **Foundation implementada y en producción (TASK-1845, 2026-09-15; ver §14)** — generación habilitada en
> staging y producción, emisión e IA apagadas; render en producción (TASK-1846, §14.5); enlaces compartidos, correo
> y recurrencia en producción con flags OFF (TASK-1848, release `bda1cf2cd938`, §14.6); A4, UI y vista web en Think siguen pendientes
> (TASK-1847, TASK-1849, TASK-1875). Los §§1–13 describen el contrato; §14 registra qué existe en código y runtime, el
> rollout verificado, sus límites honestos y las invariantes que un agente debe respetar al tocar el dominio.
> Owner: Platform + Client Experience.
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
  Edition --> Share[Grant por token + InsightWebModelV1]
  Share --> Think[think.efeoncepro.com · render Astro tonto]
  Edition --> Delivery[Correo centralizado]
```

Los módulos gobiernan hechos y permisos; Insights gobierna edición y distribución; Composer gobierna
composición; Platform gobierna job/asset; Email gobierna transporte; **Think (`efeonce-think`) gobierna sólo la
presentación de la vista web compartida** (delta ADR 2026-09-15). API/MCP/UI no consultan fuentes por su cuenta.

## 4. Modelo de dominio

Nombres lógicos propuestos; TASK-1845 materializa schema/DDL con helpers canónicos y migraciones additive.

| Entidad | Identidad y autoridad | Invariantes |
|---|---|---|
| InsightReport | ID opaco + código legible único, p.ej. `EO-INS-2026-000123`; organización y propósito | Código no es secreto; unicidad atómica, sin `MAX+1`; org inmutable |
| InsightEdition | reportId + versión + encargo + audience | Sólo edición emitida es compartible; editar/corregir crea versión, no muta la emitida |
| EvidenceSnapshot | Hechos mínimos, fuentes y hashes de evidencia | Inmutable al sellar; sólo datos autorizados; sin PII operativa innecesaria |
| EditorialPlan | Secciones, claims, ChartSpec, acciones, referencias | Congela datos y texto final; versiona modelo/prompt si hubo IA, sin chain-of-thought |
| RenderRun / Output | edición + target + manifestHash + assetId | Estado y error por salida; retries sin duplicar archivos finales |
| ShareGrant | `insight_share_grants` (`ishr-…`): edición + `token_digest` sha256 + `expires_at` + `download_outputs` | Muchos por edición (cupo 20 activos), revocación individual; audiencia `client`; expiración obligatoria ≤ 90 días; inmutable salvo revocación única; no autoriza biblioteca ni queries libres |
| DeliveryIntent | `insight_delivery_intents` (`idlv-…`) + `insight_delivery_recipients` (`idlr-…`): edición + `edition_issued_hash` + modalidad + outputs + autorización | Contenido autorizado inmutable; cada destinatario tiene estado; idempotencia (org, key) + hash; transporte en `email_deliveries`, no segundo transporte |
| InsightSchedule | `insight_schedules` (`isch-…`) + `insight_schedule_occurrences` (`isco-…`): plantilla relativa + zona + cadencia + autoridad | Nace `draft`; ocurrencia única por (schedule, versión, período); V1 sólo genera borrador + render (`review_policy = 'draft_for_review'`) |

Materializar relaciones dentro del dominio con integridad de organización en todas las referencias. Ownership
de nuevos stores: TASK-1845 núcleo; TASK-1846 renders/outputs; TASK-1848 grants/delivery/schedules. Los catálogos
globales tienen ownership explícito de plataforma; logos del cliente quedan ligados a su org y versión.

### Ciclos de vida independientes

- Edición: `draft → collecting → composing → validating → ready_for_review → issued`; `failed` recuperable
  por fase y `withdrawn` para retirada de acceso. Emitir exige los outputs solicitados validados.
- Render por target: `queued → running → succeeded | failed | cancelled`. Lease vencido permite recuperación
  con fencing; un worker antiguo no puede finalizar encima del nuevo.
- Share: `active → revoked | expired`; un trigger impide reactivar, borrar o mutar el grant salvo la revocación
  única. Retirar la edición revoca todos sus grants vivos (`edition_withdrawn`) en la misma transacción.
- Delivery intent: `pending → dispatching → completed | partially_failed | failed`, o `cancelled`. Destinatario:
  `pending → claimed → accepted | failed | ambiguous`, además de `skipped` (con `skip_reason`) y `cancelled`.
  `ambiguous` no se reintenta: se reconcilia contra el ledger. El estado de transporte (`transportStatus`:
  `accepted`, `delivered`, `bounced`, `complained`, `suppressed`…) se lee de `email_deliveries`; aceptación
  HTTP no es entrega y nunca se afirma "leído".
- Schedule: `draft → active → paused | retired`; un retirado no se reactiva. Pausa con motivo `manual`,
  `authority_revoked`, `module_unavailable` o `repeated_failures`. Ocurrencia: `pending → generating →
  generated → render_requested`, o `failed | skipped`. V1 sólo admite la política `draft_for_review`: la
  ocurrencia deja la edición `ready_for_review`; autoemisión y autoenvío no existen.

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
  y autoridad. No replica el PDF como imagen ni convierte el snapshot en un dashboard vivo. **La vista
  compartida por token se renderiza en `think.efeoncepro.com` (Astro) desde `InsightWebModelV1`; la
  biblioteca autenticada del portal usa los mismos DTOs en Greenhouse** (§8, delta ADR 2026-09-15).

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
| requestOutputs/getRun/retryOutput/cancelRun | Requests asíncronos, sin esperar Chromium. **Registrado 2026-09-16:** `POST/GET …/insights/editions/{editionId}/render`, `GET …/insights/render-runs/{renderRunId}`, `POST …/render-runs/{renderRunId}/retry`, `POST …/render-runs/{renderRunId}/cancel` en los lanes app y ecosystem; tools MCP `request_insight_render`, `get_insight_render_run`, `retry_insight_render`, `cancel_insight_render`. Errores nuevos `render_disabled` (503) y `render_rejected` (422). | TASK-1846 |
| createShare/revokeShare/getShare/withdrawEdition | Writes gobernados; token sólo al emitir enlace autorizado. **Registrado 2026-09-18 (en producción con `INSIGHTS_SHARING_ENABLED` OFF, release `bda1cf2cd938`):** `POST/GET …/insights/editions/{editionId}/shares`, `POST …/insights/shares/{shareId}/revoke` en los lanes app y ecosystem (en ecosystem crear/revocar exige binding interno); tools MCP `create_insight_share`, `list_insight_shares`, `revoke_insight_share` (clase write: create/revoke). Capability `insights.share.manage`. Error `sharing_disabled` (503) | TASK-1848 |
| requestDelivery/getDelivery/createSchedule/pauseSchedule | Autorización exacta por destinatario, modalidad y recurrencia. **Registrado 2026-09-18 (en producción con flags OFF, release `bda1cf2cd938`).** Envío — app: `POST/GET …/editions/{editionId}/deliveries`, `GET …/deliveries/{deliveryId}`, `POST …/deliveries/{deliveryId}/cancel\|retry`, `POST …/delivery-recipients/{recipientId}/reconcile`; ecosystem: sólo los dos `GET`; MCP `list_insight_deliveries`, `get_insight_delivery`. Recurrencia — app: `POST/GET …/insights/schedules`, `GET …/schedules/{scheduleId}`, `POST …/schedules/{scheduleId}/activate\|pause\|retire`; ecosystem: sólo `GET`; MCP `list_insight_schedules`, `get_insight_schedule`. **Envío, cancelación, reintento, reconciliación y escrituras de recurrencia son sólo lane App (persona interna); ecosystem y MCP son de lectura.** La modalidad `portal_link` responde `not_ready` hasta que TASK-1849 construya la ruta de la edición en el portal. Capabilities `insights.delivery.send` e `insights.schedule.manage`. Errores `delivery_disabled` y `schedules_disabled` (503); `quota_exceeded` (429) | TASK-1848 |
| resolveSharedEdition/downloadSharedOutput | Token de lectura limitado, sin OAuth ni discovery de módulos. **Registrado 2026-09-18:** `GET /api/public/insights/shared/[token]` y `GET /api/public/insights/shared/[token]/outputs/[output]` (§8) | TASK-1848 |

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
Mostrar URL secreta sólo al crear; después regenerar significa un grant nuevo. **El bearer nunca se persiste,
ni cifrado** (decisión del operador 2026-09-18): en el envío por correo vive sólo en memoria; un fallo definitivo
revoca el grant y el reintento emite uno nuevo. No se copia en outbox, logs, analytics ni errores. Resolver asset
y auth en servidor.

**Contrato materializado (TASK-1848, code complete 2026-09-18; en producción con flag OFF desde el release `bda1cf2cd938`, §14.6).**

- **Token:** `isg_` + 32 bytes aleatorios base64url (256 bits), `src/lib/efeonce-insights/sharing/token.ts`; se
  guarda sólo el digest sha256 (`token_digest` UNIQUE). URL: `${INSIGHTS_SHARE_PUBLIC_BASE_URL ??
  'https://think.efeoncepro.com'}/insights/r/<token>`, devuelta una única vez al crear.
- **Respuesta:** `InsightSharedEditionResponseV1 {modelVersion, header, model, downloads, expiresAt}`, con
  `InsightWebModelV1` (`modelVersion 1.0`, `contracts/web-model.ts`): resumen, capítulos (claims, `ChartSpecV1` +
  tabla resuelta, tablas, límites), acciones sin `ownerRef`, metodología, referencias sin `evidenceRef` y hechos
  formateados por locale. Nunca `authoringMode`, `modelId`, prompts, historial ni ids de actor.
- **Semántica:** `404` = token desconocido, mal formado, expirado, flag OFF, org suspendida o módulo retirado
  (indistinguibles entre sí); `410` = revocado o edición retirada; `429` = rate limit; `503` sanitizado.
- **Rate limit** (`insight_share_rate_buckets`, ventana por minuto sobre sujeto hasheado, UPSERT atómico): por IP
  300 vistas / 60 descargas por minuto; por grant 60 / 20. Si la base no responde, **falla cerrado**.
- **Cabeceras:** `Cache-Control: private, no-store, max-age=0`, `Pragma: no-cache`, `Referrer-Policy: no-referrer`,
  `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-Robots-Tag: noindex, nofollow, noarchive`, CSP
  `default-src 'none'; frame-ancestors 'none'`.
- **Descarga:** proxy vía `downloadPrivateAsset({actorUserId: null, accessMetadata: {accessChannel:
  'insights_share_grant', shareGrantId}})` (firma ampliada a `string | null`), revalidando el grant justo antes
  de leer bytes.
- **Access log:** `insight_share_access_events`, append-only, sin token ni IP cruda (`subject_hash`, `client_hint`
  `unknown|robot|prefetch`, outcome `served|not_found|revoked|expired|withdrawn|unavailable|rate_limited`).
  Retención 180 días; los rate buckets se purgan pasado 1 día (lo hace el tick de schedules, aun con flag OFF).
- **Observabilidad:** `redact.ts` (patrones `insights_share_path` e `insights_share_token`) y
  `src/lib/observability/sentry-server-event-scrub.ts`, cableado en `sentry.server.config.ts` y
  `sentry.edge.config.ts` (`beforeSend` + `beforeSendTransaction`: URL, query string, transaction, breadcrumbs, spans).
- **Quién comparte:** capability `insights.share.manage`; EFEONCE_ADMIN y EFEONCE_ACCOUNT (tenant),
  CLIENT_EXECUTIVE (own). CLIENT_MANAGER no comparte. TTL 1–90 días (default 30).

**Deliberadamente distinto del Grader:** el enlace del Grader guarda el token en claro y se sirve con
`public, max-age=300` sin cabeceras anti-índice; no es modelo. El modelo es el token del talent pool (sólo digest)
más las cabeceras de `hiring/assessment/public-session/http.ts`.

**Dónde se renderiza (delta ADR 2026-09-15):** la vista compartida vive en el hub público `efeonce-think`
(`think.efeoncepro.com`; ruta propuesta `/insights/r/<token>`, hermana de `/brand-visibility/r/<token>` del
Grader). Greenhouse expone dos endpoints públicos sin sesión que TASK-1848 materializa: `resolveSharedEdition`
(`GET /api/public/insights/shared/[token]` → `InsightWebModelV1`, proyección client-facing versionada del plan
y el snapshot: capítulos, claims, `ChartSpecV1`, tablas, límites, metodología, referencias; nunca evidencia
interna, prompts ni ids de actor) y `downloadSharedOutput` (proxy de PDF con chequeo de revocación). Think hace
fetch **server-side por request** (el token no llega al browser, no hay pre-render ni cache), no re-deriva
cifras ni consulta productores, y responde `not_found`/`gone` con pantallas seguras sin nombre de cliente.
Contrato de marca: tokens AXIS en Tailwind (mismo mecanismo del Grader), sin MUI. Cambiar el modelo web es
bump de `modelVersion` con compatibilidad hacia atrás, como el `ReportArtifactModel` público del Grader.

Cabeceras y política, en Greenhouse y en Think: excluir de indexación, `Referrer-Policy: no-referrer`, CSP sin
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

**Materializado por TASK-1848 (code complete 2026-09-18; en producción con flags OFF desde el release `bda1cf2cd938`, §14.6).**

- **Modalidades vivas V1:** `share_link` y `attachment`. `portal_link` se rechaza `not_ready` hasta que TASK-1849
  construya la ruta de la edición en el portal (`INSIGHT_PORTAL_EDITION_ROUTE_AVAILABLE = false` en
  `delivery/contracts.ts`; al activarla se registra el deep link `insights_edition`).
- **Destinatarios:** sólo user ids de personas activas de la org (cliente) o internas activas; 1–50; nunca correos
  libres. Asunto 3–200, mensaje ≤ 2000. Capability `insights.delivery.send` (sin scope `own`: un cliente nunca
  envía); EFEONCE_ADMIN y EFEONCE_ACCOUNT.
- **Correo:** EmailTypes `insights_edition_delivery` (token-sensitive, sin adjuntos, sin replay genérico) e
  `insights_edition_delivery_attachment` (estándar, con PDF; exige `acknowledgeIrrevocableAttachment=true`).
  Dominio de correo `insights`, marca Efeonce. Ambos sembrados `enabled=false` en `email_type_config`, que falla
  abierto si falta la fila. Template funcional `src/emails/InsightsEditionDeliveryEmail.tsx` (presentación: 1849).
- **Despacho:** projection `insights_delivery_dispatch` (lane `ops-reactive-notifications`) →
  `dispatchInsightDeliveryIntent`: claim atómico, revalida edición/persona/buzón; `share_link` usa
  `claimTokenSensitiveEmailIntent`, que crea la fila de `email_deliveries` y el grant (`source='delivery'`) en la
  misma transacción (índice `uq_email_deliveries_token_intent_v3`).
- **Dedupe:** índice único parcial por (org, edición, issued_hash, modalidad, persona) mientras el destinatario
  está `pending|claimed|accepted|ambiguous`; el duplicado queda `skipped` (`duplicate_delivery`).
- **Correlación por intento:** `idlr-<uuid>` en el primero y `idlr-<uuid>:aN` en los reintentos (N = 2..5), porque
  el índice de la plataforma de correo es único por (tipo, source_event_id).
- **Ambiguo → reconciliar:** un resultado incierto deja al destinatario `ambiguous` y no se reintenta.
  `reconcileInsightDeliveryRecipient` lee el ledger del intento exacto: enviado/entregado/`resend_id` ⇒ `accepted`;
  sin fila o `failed` sin `dispatch_unknown` ⇒ `failed` y revoca el grant; `pending`/`dispatch_unknown` ⇒
  `unresolved` salvo `operatorDecision` + `reason` (≥ 10 caracteres). Reintento sólo de `failed`, máximo 5 intentos.
  Señal `insights.delivery.ambiguous` (steady 0; warning 1–3, error > 3; cuenta ambiguos + `claimed` > 30 min).
- **Recurrencia:** un solo Cloud Scheduler `ops-insights-schedules-tick` (`20 * * * *`) para todas las orgs →
  `ops-worker` `POST /insights/schedules/tick` (`runInsightSchedulesTick`). Revalida la autoridad con
  `session_360` y `assertInsightsAccess`; si falla, pausa. Períodos cerrados y consolidados (`window.ts`: mes
  calendario, semana ISO lunes-lunes, día civil de la zona) con fin posterior a la activación: sin ediciones
  retroactivas. Claim con reintento (máx 3); idempotencyKey `sched-<scheduleId>-v<version>-<periodStart>`; pide
  render de los outputs renderizables (hoy `deck_pdf`). Tres fallos seguidos ⇒ pausa `repeated_failures`.
  Máximo 10 schedules activos por org; `consolidation_days` 0–15 (default 3), `catch_up_limit` 1–3 (default 1).

### 9.1 Activación y retorno al portal — EPIC-046

Decisión de producto del operador, 2026-09-09: Insights debe llegar por correo con valor útil y deep links;
notificaciones por email, in-app y Teamsbot acompañan el servicio desde esta fase. La app móvil y su
adapter push quedan para una fase posterior. Este contrato describe el resultado exigido, no un envío
habilitado ni la disponibilidad actual del Hub.

**Gap vigente (2026-09-18): in-app y Teams no están implementados.** TASK-1848 entrega sólo correo.
`NotificationService.dispatch` (categoría `report_ready`) no permite restringir canales y dispararía su propio
correo genérico `notification`: doble envío sin dedupe. El resolver de Teams sólo resuelve members, así que para
clientes no está disponible. Dueños: TASK-690–693 (Hub y preferencias) y TASK-1849 (experiencia). Hasta que se
cierre, la "primera entrega cliente con email + in-app verificables" de este contrato sigue pendiente.

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
Definir duración efectiva y cleanup verificable en TASK-1845/1848 antes de primera emisión externa. TASK-1848
fija la de su dominio: access events de enlaces 180 días y rate buckets 1 día, purgados por el tick de schedules.

## 11. Plan compacto y rollout

| Unidad nueva | Entrega y ownership | Dependencia |
|---|---|---|
| TASK-1845 | Dominio, snapshots, adaptadores SEO/AEO/ICO, plan editorial, API/MCP y permisos | Ninguna task abierta obligatoria; verificar readers y gates |
| TASK-1846 | Render durable multi-consumer, outputs, assets y recuperación sobre Artifact Worker | TASK-1845 |
| TASK-1847 | Biblioteca ChartSpec y catálogos deck/A4 premium; contratos visuales | TASK-1845; integra worker tras TASK-1846 |
| TASK-1848 | Sharing por token (grants + `resolveSharedEdition`/`downloadSharedOutput` + `InsightWebModelV1`), correo, recurrencia y contratos programáticos | TASK-1845, TASK-1846 |
| TASK-1849 | Biblioteca/encargo/revisión en el portal Greenhouse y presentación email | TASK-1845/1846/1847/1848 |
| TASK-1875 | Vista web compartida por token **renderizada en `efeonce-think`** (`/insights/r/<token>`, render tonto de `InsightWebModelV1`, revocación por request, GVC del hub) | TASK-1848 |

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

## 14. Estado de implementación y rollout — TASK-1845 (2026-09-15)

> Registro exhaustivo de construcción y despliegue (inventario archivo por archivo, schema tabla por tabla, contratos, superficies, verificación y matriz «qué corre dónde»): [EFEONCE_INSIGHTS_IMPLEMENTATION_RECORD_V1.md](EFEONCE_INSIGHTS_IMPLEMENTATION_RECORD_V1.md). Esta sección es el resumen; ante duda, manda el registro.

Qué existe en código y en runtime, con la evidencia del rollout, qué límites tiene hoy y qué sigue diseñado.
Fuente de código: commits `e6e8a5dfe` (Slice 1), `a21e424fa` (Slice 2), `ca17c93da` (Slice 3) en `develop`;
release a producción el 2026-09-15 por el control plane (§14.2). TASK-1845 sigue `in-progress` por dos
evidencias pendientes (§14.3); el estado honesto es **code complete + en producción, cierre pendiente**.

### 14.1 Qué existe (código y runtime)

**Schema `greenhouse_insights`** (migración `20260915100154428_task-1845-insights-foundation.sql`, aplicada
el 2026-09-15 10:06Z en la única instancia Cloud SQL, compartida por dev/staging/prod, y verificada por readback):
`insight_reports` (código legible `EO-INS-000001` por secuencia `insight_report_code_seq` + función
`next_insight_report_code()` con `lpad(n, GREATEST(6, len))`, sin truncado), `insight_editions` (versión por
reporte bajo lock; `request_json` + `request_hash`; UNIQUE parcial `(organization_id, idempotency_key)`; ventana
en zona IANA y UTC; emitida sólo puede retirarse), `insight_edition_state_matrix` (14 transiciones, paridad con
`edition-state-machine.ts`), `insight_edition_transitions` (append-only; gate humano exige `member`/`client_user`
con `actor_user_id`), `insight_evidence_snapshots` (uno por edición; inmutable al sellar;
`facts/sources/rejections_json`), `insight_editorial_plans` (uno por edición sobre snapshot SELLADO; congelado con
hash; provenance IA), `insight_retention_classes` (3 clases, 1095 días). Triggers de inmutabilidad y no-delete.
Decisión del operador: prefijo `greenhouse_` como los otros 18 schemas; la marca vive en el código, el módulo
`insights_v1` y la skill.

**Dominio `src/lib/efeonce-insights/`** (path con marca; `insights` a secas colisiona con Nexa): contratos
browser-safe (`InsightRequestV1` `insight_request_v1`, `EvidenceFactV1`, `ChartSpecV1`, `EditorialPlanV1`),
ventanas (`window.ts`: `[start, endExclusive)` en zona IANA, DST en dos pasadas, mes anterior ≠ 30 días,
29-feb → 28-feb, máximo `MAX_INSIGHT_WINDOW_DAYS = 400`, sin inicio en el futuro), adapters `seo`/`aeo`/`ico`
sobre readers dueños (SEO: `readSeoOverviewKpisForWindow` nuevo en `src/lib/growth/seo/overview/read-overview-kpis.ts`
con la misma agregación; AEO: sólo un run cuyo `asOfDate` cae en la ventana; ICO: spaces por org, meses completos,
hereda supresión RpA y numerador/denominador OTD), registry con fixture, planner determinista + validación de
cifras + IA acotada (Gemini) tras flag con fallback determinista, authz de tres planos (`assertInsightsAccess`),
catálogo elegible, commands (`validate/create/revise/issue/withdraw/recover`) con generación por fases
`draft → collecting → composing → validating → ready_for_review` (fallo ⇒ `failed` con `failedPhase`) y readers
con proyección por audiencia (`readers/projection.ts`: el cliente ve evidencia/plan sólo de ediciones EMITIDAS;
el interno siempre). Idempotencia en el dominio: `(organization_id, idempotency_key)` + `request_hash`; misma
key + mismo payload ⇒ misma edición con `idempotent: true`; payload distinto ⇒ `409 idempotency_conflict`.
Puertos `InsightOutputsPort` (TASK-1846) e `InsightSharePort` (TASK-1848) declarados y sin conectar: **emitir
falla cerrado (`not_ready`) hasta que el render valide outputs**.

**Superficies:** lanes `app` y `ecosystem` con la misma tabla de errores
(`src/lib/api-platform/resources/{app-insights,ecosystem-insights,insights-errors}.ts`). Rutas
`platform/app/insights/{catalog, reports, reports/[id], editions, editions/[id], editions/[id]/{issue,revise,withdraw,recover}}`
y `platform/ecosystem/insights/{catalog, reports, reports/[id], editions, editions/[id], editions/[id]/{revise,recover}}`
(ecosystem NO emite ni retira; exige `externalScopeType`/`externalScopeId` + `organizationId` para bindings
internos). Detalle con `?include=evidence`. MCP interno (`src/mcp/greenhouse/`): dominio `insights`, tools
`get_insights_catalog`, `list_insight_editions`, `get_insight_edition`, `create_insight_edition` (`writes: true`;
ningún binding emite); manifest de 51 tools. Manual servido `efeonce-insights` (audiencia interna; test de fuga)
+ skill local espejada (`.claude/` = `.codex/`). Capabilities `insights.report.read`, `insights.edition.create`,
`insights.edition.review`, `insights.edition.issue` con grants en `src/lib/entitlements/runtime.ts`
(EFEONCE_ADMIN/EFEONCE_ACCOUNT las cuatro; EFEONCE_OPERATIONS read+create+review; roles cliente `report.read`;
CLIENT_EXECUTIVE/CLIENT_MANAGER además `edition.create`); catálogo `src/config/entitlements-catalog.ts` módulo
`insights`. Módulo per-ORG `insights_v1` (seed en la migración) asignado por `enableClientPortalModule`; script
operativo `scripts/insights/assign-insights-module.ts --org=<id> [--apply]` (dry-run por defecto). Scope de
escritura `efeonce.mcp.insights.write` en `EFEONCE_MCP_WRITE_SCOPES` (`src/lib/auth-server/oauth/scopes.ts`).

**Eventos y observabilidad:** 5 eventos `insights.*` en `src/lib/sync/event-catalog.ts` (incluye
`insights.edition.created`, `insights.evidence.sealed`, `insights.edition.issued`); dominio `insights` en
`captureWithDomain`; módulo `insights` en el registry de reliability con señales
`insights.editions.failed_recent` y `insights.editions.stuck_generation`
(`src/lib/reliability/queries/insights-edition-signals.ts`, steady 0); data source `insights` en el
reader-meta/parity del client portal.

**Federación en el gateway `efeonce-mcp`:** provider `greenhouse-insights` cabalga la configuración del provider
SEO (misma lane ecosystem y service identity, binding de scope `internal`); versión 1.4.0 → 1.5.0 (aditivo),
superficie 43 → 47 tools, 8 clases de scope (`read`, `globe.read`, `hiring.read`, `globe.credits.funding.ensure`,
`seo.write`, `identity.write`, `client_services.write`, `insights.write`). Las tres de lectura usan el scope base
`efeonce.mcp.read`; `create_insight_edition` exige la clase `efeonce.mcp.insights.write` y viaja con header de
idempotencia `insights-create-<key>`. Políticas de autoridad nativa: las 4 tools `unsupported`
(`insights_native_policy_missing`) ⇒ fail-closed para autoridad nativa/v2. Canary de lectura
`scripts/greenhouse-insights-canary.mjs` (catálogo/lista/edición + negativo; nunca crea). Scope
`efeonce.mcp.insights.write` creado en Entra el 2026-09-15 en la app recurso «Efeonce MCP Resource» (readback: 7
scopes, los 6 previos intactos); ningún cliente lo porta todavía.

**Flags** (default OFF; ledger `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`; leídos sólo en Vercel):
`INSIGHTS_GENERATION_ENABLED` (crear/revisar; sin él, `503 service_unavailable` / `generation_disabled`),
`INSIGHTS_ISSUANCE_ENABLED` (emitir), `INSIGHTS_AUTHORING_AI_ENABLED` (Gemini). Estado real por target en §14.2.

### 14.2 Rollout verificado (2026-09-15)

| Target | Generación | Emisión | IA | Evidencia |
|---|---|---|---|---|
| Staging (Vercel `staging`) | **ON** (~20:00Z; requirió `vercel redeploy` porque la deployment previa nació antes del env var) | OFF | OFF | `insights_v1` asignado a la org sintética Greenhouse Demo. Lane app: catálogo 200 (`seo`/`aeo` `module_not_assigned`, `ico` disponible); create `202` → `EO-INS-000012` `ready_for_review`; replay `200` `idempotent: true`; `409 idempotency_conflict` con `depth` distinto; el cliente ve `evidence`/`plan` `null` por diseño. Lane ecosystem: catálogo/lista/detalle con evidencia (snapshot sellado, plan congelado, 4 transiciones); create `202` → `EO-INS-000013`; org sin módulo ⇒ `404` anti-oracle. |
| Producción (Vercel `production`) | **ON** (`vercel env add` + `vercel redeploy` → deployment `greenhouse-h2030d3bz` Ready ~23:10Z; valor verificado con `vercel env pull`) | OFF | OFF | Release PR #236 → `main` `9c094688309d345b9780b563968ecd1c5c96afd4`, orquestador run 35032358217 (un intento, dos gates Production aprobados), manifest `9c094688309d-500ec9e7-3f22-4229-b152-e70a197ee1af` `released` 22:55:13Z; Vercel `greenhouse-e8i8fkqbd` READY; watchdog `ok`, 5/5 workers synced (ops-worker y auth-server retienen `0a05c8dc8267`, diff docs-only, skip legítimo). Canary por lane ecosystem: create `202` → `EO-INS-000014` `ready_for_review`; replay con la misma idempotency-key de lane devuelve la misma edición. |
| Preview | OFF | OFF | OFF | Sin canary. |
| Gateway `efeonce-mcp` | — | — | — | PR #12 → `main` `cad57b31d`; deploy 21:46Z (run 35027446001 success), revisión Cloud Run `efeonce-mcp-gateway-00053-dsk` al 100 %; PRM 200, `/health` 200, `/mcp` 401 sin token. |

Las mutaciones que el clasificador de permisos bloquea al agente Claude (Entra vía `az rest`, push/PR/merge/dispatch
en `efeonce-mcp`, `vercel env add`/`redeploy` en Production) las ejecutó Codex; el resto (push HTTPS, PR/merge en
greenhouse-eo, dispatch del orquestador, aprobación de gates, env/redeploy en staging) lo ejecutó Claude.

### 14.3 Límites honestos y pendientes

- **La evidencia del canary tiene 0 hechos.** La org sintética no tiene snapshots ICO en 2026-07/08: el snapshot
  sellado trae 4 rechazos `no_data` y el plan congelado declara los límites. Se ejercitó el camino "sin datos
  declarados", no el de un cliente con datos reales.
- **El cliente ve `evidence`/`plan` `null` hasta emitir.** Desde 2026-09-16 `InsightOutputsPort` está conectado
  (TASK-1846): `issue` ya no falla por "puerto sin conectar" sino por **outputs sin completar** (`not_ready` con
  `missing`/`pending`); `renderableOutputs` del catálogo declara `deck_pdf`. Ninguna edición se ha emitido aún:
  el render está **vivo en staging y en producción** desde 2026-09-16 (§14.5, delta de producción).
- **`create_insight_edition` por el gateway responde `insufficient_scope`** hasta que un consentimiento/grant
  gobernado otorgue `efeonce.mcp.insights.write` a un cliente; el cliente PKCE compartido no se tocó.
- `plan.limits` repite «ico: sin datos.» una vez por rechazo en el plan CONGELADO (fiel al snapshot); el render lo deduplica (TASK-1846, `render/plan-limits.ts`) sin tocar el plan ni su hash.
- Pendientes para mover TASK-1845 a `complete`: ensayo de `migrate:down` en la instancia compartida (conservando
  `pgmigrations.run_on` original y las ediciones intactas) y `tools/list` por una sesión MCP servida con token
  humano (evidencia de 47 tools + skill `efeonce-insights` desde un cliente real).
- Pendiente de otras unidades: render/outputs (TASK-1846), catálogos visuales (TASK-1847), share/delivery/schedules
  y resolver público `InsightWebModelV1` (TASK-1848), biblioteca/portal (TASK-1849), render en Think (TASK-1875).
  Pendientes de §12 resueltos aquí: DDL exacto, retención por clase (1095 días), mapa de primitives/rutas. Siguen
  pendientes: límites medidos/costo y library de charts (TASK-1847).

### 14.4 Invariantes operativos para agentes

- **NUNCA** derivar una ventana a mano: toda ventana es `[start, endExclusive)` en zona IANA resuelta por
  `window.ts` (DST, mes anterior ≠ 30 días, 29-feb, máximo 400 días, sin futuro). Una fuente que no sirve el
  grano declara `unsupported_window`; ausencia ≠ cero (rechazo con motivo).
- **NUNCA** crear una edición fuera de la idempotencia del dominio `(organization_id, idempotency_key)` +
  `request_hash`; misma key + payload distinto es `409 idempotency_conflict` por diseño, no un bug a rodear.
- **NUNCA** un adapter recalcula fórmulas ni lee tablas del productor: consume SOLO readers dueños
  (`growth/seo`, `growth/ai-visibility`, `ico-engine`), nunca `client-portal` (hoja del DAG) ni `probes/**`.
- **NUNCA** mutar `insight_evidence_snapshots` ni `insight_editorial_plans` sellados/congelados: corregir es
  `revise` (versión nueva); una emitida sólo se retira. Cambiar la matriz de estados exige migración + TS juntos.
- **NUNCA** cruzar un gate de flag desde un solo runtime ni asumir que un env var nuevo llega a una deployment
  ya construida: generación, emisión e IA son gates independientes que se prenden por target en Vercel y
  **requieren `vercel redeploy`**. `INSIGHTS_RENDER_ENABLED` (TASK-1846) se lee en **TRES runtimes** — Vercel
  (encolar, `requestInsightRender`), el artifact-worker Cloud Run Job (reclamar) y el `ops-worker` (dispatcher
  `/artifact-render/dispatch` que lanza el Job) — y debe estar ON en los tres; en Cloud Run el SoT es el
  `deploy.sh` de cada servicio (`--set-env-vars` destructivo). Job y ops-worker son únicos para staging y
  producción: la puerta de producto por ambiente es el encolado en Vercel. El ledger registra el estado.
- **NUNCA** responder `403` a una org sin módulo `insights_v1` ni a un cliente que apunta a otra org: es `404`
  anti-oracle (`assertInsightsAccess`); `audience=internal` nunca se concede a un cliente.
- **NUNCA** emitir desde una máquina ni saltar `InsightOutputsPort`: emitir es gate humano con
  `insights.edition.issue`, `INSIGHTS_ISSUANCE_ENABLED` y outputs validados. El puerto real (TASK-1846) valida
  SÓLO outputs `completed` con asset de la MISMA audiencia de la edición: un output interno jamás valida una
  edición de cliente; faltar uno es `not_ready` con `missing`.
- **NUNCA** encolar un output que el motor no puede producir (`INSIGHT_RENDERABLE_OUTPUTS`, hoy `deck_pdf`):
  se rechaza `render_rejected`, nunca "queda para después". **NUNCA** truncar una cifra o una afirmación para
  que quepa en un slot del catálogo: el mapper rechaza con causa; sólo un label/título se acorta con elipsis.
- **NUNCA** separar lease de fencing en el motor de render: el reclamo por lease vencido abre una ventana de
  doble finalización que hoy no existe y el fence token es el único candado (`InsightRenderFenceLostError`).
- **SIEMPRE** que se agregue una tool MCP interna, federarla en `efeonce-mcp` (provider + paridad + política de
  autoridad nativa + scope si escribe) y verificar el gateway construido; registrar una tool aquí no la publica.

### 14.5 Estado de TASK-1846 — render durable (complete 2026-09-16, en producción)

> Los párrafos siguientes describen el cierre del código; el estado de runtime vigente está en el **Delta
> 2026-09-16 — producción** al final de esta sección y prevalece sobre las menciones a "sin deploy", "flag OFF"
> o "pendiente en producción" de los bloques anteriores, que se conservan como historia del staging.

**Existe en código (develop):**
- Schema: `insight_render_runs` (solicitud por edición), `insight_outputs` (unidad reclamable por target, UNIQUE
  `(org, edición, output, audiencia)`), `insight_render_events` (append-only); columnas `lease_expires_at` +
  `fence_token` en `insight_outputs` **y** en `proposal_render_jobs` (additive; el reclamo de Proposal queda apagado).
- Motor: `services/artifact-worker` despacha por `RenderConsumer` (registry con Proposal e Insights); claim
  atómico con lease, reclamo de lease vencido, fencing en la finalización, cuota por org, retry sólo de fallidos,
  cancelación honesta, señal `insights.render.orphaned_output` (steady 0).
- Entrada/salida: `requestInsightRender` (+ retry/cancel, readers de runs) y `InsightOutputsPort` real conectado
  al barrel de commands. Lanes app/ecosystem y 4 tools MCP (manifiesto 55 tools). Eventos `insights.render.*`.
- Mapper V1 plan congelado → `deck-axis` (`render/deck-mapper.ts`); el catálogo A4 y los gráficos son TASK-1847.

**Verificado:** 5 live tests contra PostgreSQL real (fencing rechaza la finalización vieja sin escribir; retry no
duplica; cancelación no miente; SQL de señal y de encolado), 1006 unitarios, `composer:visual-gate` 61 frames a
cero píxeles (Proposal intacto), `pnpm test` completo y `pnpm build` de producción con estos cambios en el árbol.

**NO hecho / límites honestos:** target `web` y catálogo A4 (1847/1848); descarga autorizada del asset (1848); el render
corre en producción desde 2026-09-16 (ver delta de producción); el defecto visual del slot `unit` de `MetricsSplit` es anterior y afecta decks ya entregados (issue aparte).

#### Delta 2026-09-16 — runtime real, benchmark en Cloud Run y auditoría del actor

> Estado al escribir este bloque: vivo en staging, pendiente en producción. **Superado** por el delta de producción
> al final de la sección: hoy todo lo que sigue corre también en producción.

**Runtime de despacho (verificado en código y en staging).** El artifact-worker es un Cloud Run **Job**, no un
servicio que escucha la cola: lo lanza el dispatcher `src/lib/efeonce-insights/render/dispatch.ts`, invocado por
el `ops-worker` en `/artifact-render/dispatch` desde Cloud Scheduler `ops-artifact-render-dispatch` **cada 2
minutos**. El lanzador del Job es domain-free (`src/lib/render-dispatch/job-runner.ts`). En un mismo tick Proposal
tiene prioridad: si Proposal lanzó una ejecución, Insights espera al tick siguiente. El consumer Insights del Job
es `services/artifact-worker/consumers/insights.ts`. El Job quedó integrado al release control plane de producción;
su primer deploy productivo ocurrió en el release `917491fd02e4` del 2026-09-16 (change-gated). El bucket de assets del Job está fijo en `staging`
(`efeonce-group-greenhouse-private-assets-staging`); cada asset guarda `bucket_name` por fila, así que un cambio de
bucket no rompe la lectura de assets previos.

**Flag en tres runtimes — estado vivo 2026-09-16 (tras el release; staging y producción):**

| Runtime | Rol | Estado |
|---|---|---|
| Vercel `staging` | encolar (`requestInsightRender`) | ON |
| Vercel Production | encolar | ON desde 2026-09-16 (redeploy `greenhouse-d6l33zils`) |
| Cloud Run Job `artifact-worker` | reclamar y renderizar | ON (default `true` en `deploy.sh`) |
| Cloud Run `ops-worker` | dispatcher | ON desde la revisión `ops-worker-00690-xhl` (default `true` en `deploy.sh`) |

Hallazgo: antes del 2026-09-16 el `ops-worker` no tenía el flag. El canary de las 13:00Z se lanzó ejecutando el Job
a mano y ocultó la falta: los logs del dispatcher de las 13:02Z muestran `insightsQueued=0` con un output en cola.

**Lanes y MCP (código en `origin/develop`).** `POST …/insights/editions/{editionId}/render` (202, o 200 idempotente),
`GET …/render-runs/{id}`, `POST …/render-runs/{id}/retry|cancel`; errores `render_disabled` 503, `render_rejected`
422 (hoy sólo `deck_pdf` es renderizable; `report_pdf` → TASK-1847, `web` → TASK-1848) y 404 anti-oráculo. Cuatro
tools MCP (`request_insight_render`, `get_insight_render_run`, `retry_insight_render`, `cancel_insight_render`).
Gateway `efeonce-mcp`: PR #14 mergeado (`da8295a`), v1.6.0, 51 tools, escrituras con scope
`efeonce.mcp.insights.write`; **desplegado en producción el 2026-09-16** (revisión `efeonce-mcp-gateway-00054-n78`).

**Auditoría del actor.** Migración `20260916201127095_task-1846-insights-render-client-user-actor` (expand,
aplicada): runs y eventos aceptan `client_user`, y el actor humano viaja al run, al evento de encolado, al retry y
a la cancelación. Antes todo quedaba registrado como `system`.

**Benchmark en Cloud Run staging (2026-09-16, org sandbox `Greenhouse Demo`, persona `agent-client`).**

| Medición | Resultado |
|---|---|
| Ráfaga | 5 ediciones seo+ico, `deck_pdf`, encoladas 20:09:33–20:09:41Z; arranques 20:12:51, 20:14:49, 20:16:46, 20:18:45, 20:20:51; las 5 `completed` al primer intento |
| Render (started → finished) | 6,3–7,3 s; PDF ~330 KB |
| Edad en cola | 3m18s → 11m10s |
| **Throughput** | **1 output por tick de 2 min** (una ejecución por tick, Job `parallelism=1`): una ráfaga de N outputs tarda ≈ 2·N min |
| Arranque de la ejecución | 3,9 s en caliente; 42 s la primera tras un deploy; 154 s en frío (13:00Z) |
| Duración total de la tarea | 50–58 s (Chromium + claim + render + upload) |
| Retry real | Un output fallido con manifest sellado antes del fix: el dispatcher lo lanzó solo en el tick de 20:10, volvió a fallar honesto `render_error` (validación de slots `sectionItems`), intentos 1 → 2 de 3; los outputs completados no se tocaron |
| Cancelación real | Run encolado → `cancel` 200 → run y output `cancelled`, 0 intentos, nunca arrancó; `retry` sobre un cancelado responde 200 sin re-encolar (cancelado es terminal: se re-encarga) |
| Negativo de audiencia | Edición `internal` creada por superadmin; `agent-client` pide render → 404 y GET → 404; 0 outputs creados |
| Live tests | `pnpm test:live src/lib/efeonce-insights/render` 4/4 contra PostgreSQL real |

Benchmark **local** previo: 15 láminas 4,44–4,72 s (RSS 300–328 MB, PDF 5,4 MB); 25 láminas 7,07–7,42 s (RSS
355–365 MB, PDF 12,6 MB); ráfaga 5×15 en 23,3 s. No medido: A4 de 10/30 páginas (TASK-1847) ni la competencia de
cola con Proposal activo (por diseño Proposal gana el tick).

**Pendiente al escribir este bloque** (hecho en el delta siguiente): release, flag en Vercel Production, gateway y
canary productivo. Los huérfanos en `running` sin lease requieren decisión humana (señal
`insights.render.orphaned_output`, steady 0).

#### Delta 2026-09-16 — producción

- **Release:** PR #237 → `main` `917491fd02e4`, orquestador run `35154555317`, manifest
  `917491fd02e4-9231b87b-20da-43c3-abce-4348dccdda99` `released` 22:02:41Z en un intento (break-glass planificado:
  las migraciones Insights ya estaban aplicadas; `cloud_release`). **Primer deploy productivo del Cloud Run Job
  `artifact-worker`** vía `deploy-artifact-worker`, change-gated (sirve `f6551157e`: su árbol difiere del target sólo
  en `Handoff.md`/`project_context.md`). Watchdog `ok` 6/6 synced.
- **Flag:** `INSIGHTS_RENDER_ENABLED=true` en Vercel Production (leído con `vercel env pull`) + redeploy
  `greenhouse-d6l33zils` aliased a `greenhouse.efeoncepro.com`. Job y `ops-worker` ya lo tenían ON. Queda **ON en
  los tres runtimes lectores, en staging y producción** (tabla de arriba). `pnpm flags:audit --strict`: 0 flags ON
  en Production sin código en `main`, 0 con lector distinto.
- **Gateway:** `efeonce-mcp` v1.6.0 desplegado (run `35156353046`, revisión `efeonce-mcp-gateway-00054-n78` al 100 %,
  `/health` ok, 51 tools).
- **Canary productivo** (lane ecosystem con el token consumer del gateway, org sandbox `Greenhouse Demo`): create
  `202` (`insed-83c23534…`) → `POST …/render` `202` (run `irun-e275767b-a6a8-4587-9579-d9bbba713181`,
  `requestedByKind: member`) → el dispatcher del `ops-worker` lanzó el Job solo → `deck_pdf` `completed` al primer
  intento (render 22:14:46→22:14:52Z, asset `asset-acf726a0-3c02-4172-b0cd-1141468a8a97`); pedir `web` → `422
  render_rejected`. Canary del provider en `efeonce-mcp` (`scripts/greenhouse-insights-canary.mjs --render-run`):
  catalog (renderable=1), list, render run `completed` y deny `404` verdes.
- **Comportamiento conocido — doble ejecución en frío:** con el Job en frío (~2 min de arranque) el dispatcher lanzó
  **dos ejecuciones para un solo output** (ticks 22:12 y 22:14): la primera aún no había reclamado cuando llegó el
  tick siguiente, que vio el output todavía en cola. Una sola finalizó (claim atómico `FOR UPDATE SKIP LOCKED` +
  fencing) y la otra no encontró trabajo y terminó. Inocuo para la integridad; costo menor (una ejecución de Job
  vacía). No es un bug de doble finalización; si el costo importara, la corrección es que el dispatcher cuente las
  ejecuciones del Job aún en curso antes de lanzar otra.
- **Sigue fuera:** `INSIGHTS_ISSUANCE_ENABLED` OFF (paso de producto); `report_pdf` → TASK-1847; `web` → TASK-1848.

### 14.7 Estado de TASK-1847 — catálogos y gráficos (staging con canary real, 2026-09-22; sin producción)

**Qué existe y está probado** (424 tests verdes entre `efeonce-insights` y `artifact-composer`,
typecheck limpio, gates del worker OK):

- **Decisión de paginación:** `GREENHOUSE_ARTIFACT_VERTICAL_PAGINATION_DECISION_V1.md` (`Accepted`).
  El motor no pagina pero ya sabía medir: `measureSlideFit()` expone esa medición como consulta y
  `assertSlideFitsCanvas` pasa a consumirla. `paginateFlow()` es **puro** —recibe capacidades, no
  toca el navegador— y vive domain-free en el composer para que un segundo informe vertical
  (TASK-1672) pueda usarlo sin copiarlo.
- **Geometría de 15 familias** en `artifact-composer/chart-geometry.ts`, domain-free: barras
  (simple/agrupada/apilada), línea, circular/dona con techo de 3 porciones, dispersión, bullet,
  embudo, cascada, medidor, heatmap, waffle, Venn de dos conjuntos con áreas proporcionales reales
  y UpSet. Venn de tres NO se implementa: con tres conjuntos las áreas proporcionales exactas en
  general no existen, y uno que las aparente miente.
- **Marca:** `compile-catalog-tokens.ts` compila una vez para N catálogos. `deck-axis` recompila
  byte-idéntico.
- **Catálogos nuevos:** `insights-report` (A4 794×1123, 5 plantillas + molde compartido) e
  `insights-deck` (16:9, 4 composiciones + molde). Ambos con brand pack `axis`, sin HEX literal y
  con contraste WCAG AA verificado.
- **Copy:** `src/lib/copy/insights.ts` es SSOT y cierra un drift real — el planner y el mapper
  tenían títulos de módulo **distintos**, de modo que el plan sellado y su render se contradecían.
- **`report_pdf` admitido:** el catálogo se resuelve **por output** (era una constante única, y eso
  era lo que impedía una segunda salida), cada salida sella su propio manifest, el evento del run
  sella el hash del conjunto, y el worker registra los dos catálogos nuevos.

**Rollout a staging y canary con datos reales (2026-09-22).** Desplegado en `develop` (staging + Job
`artifact-worker`); **no en producción**. Canary interno y sin emitir sobre Berel (SEO+AEO) y Sky (ICO), con
`insights_v1` asignado a ambas orgs. Lo que encontró y quedó cerrado:

- **Validador de cifras** (`editorial/plan-validation.ts`, `format.ts`): una fecha ISO es un solo token, y la
  etiqueta LITERAL de un hecho referenciado se enmascara antes de leer cifras (sus números son identidad del hecho,
  no afirmación). La guarda no se relajó: una cifra fuera de la etiqueta, o la etiqueta de un hecho no referenciado,
  sigue rechazándose.
- **Texto del plan sin identificadores internos:** límites, metodología, títulos de gráfico y unidades salen de
  `GH_INSIGHTS` (`metrics`, `sources`, `units`); el `detail` del adapter y el reader quedan en el snapshot. AEO usa el
  copy es-CL del grader (`GH_GROWTH_AI_VISIBILITY`). Un conteo parte de un total se escribe «21 de 31».
- **ICO:** el adapter leía `otd` y el registro dueño lo llama `otd_pct` — OTD nunca llegó a un informe. Los ids leídos
  viven en `ICO_SNAPSHOT_METRIC_IDS`, cruzados por test con `ICO_METRIC_REGISTRY`; una métrica esperada ausente se
  narra como límite.
- **Figuras compartidas** (`render/figure-pages.ts` + `artifact-composer/bar-figure.ts`): formato canónico, barra
  nombrada por su métrica, comparación de períodos en pares con escala propia (`scaleGroup`), paginación sin partir
  pares ni recortar, guarda barra↔etiqueta con tolerancia de redondeo (media unidad del último decimal impreso) y
  tono con espacio de nombres propio (`tone-lead`/`tone-rest`: `lead` chocaba con el `.lead` tipográfico del molde y
  la barra destacada quedaba invisible).
- **Cutover de `deck_pdf` a `insights-deck`** (`render/insights-deck-mapper.ts`): `deck-axis` recortaba con «…»,
  duplicaba filas y callaba métricas. Toda afirmación del plan aparece en alguna lámina; nada se recorta. Lo ya
  encolado con `deck-axis` compone con su input sellado. Proposal sigue en `deck-axis`, intacto.
- **Rótulo de período** (`render/labels.ts`): desde la ventana civil medida («1–20 de septiembre de 2026»), no desde
  el mes de inicio, dentro del presupuesto de 28.

Vista previa local sobre datos reales (adapters → planner → validador → mapper → composer): Berel A4 15 páginas y
deck 13 láminas, Sky 7 y 5, cero violaciones. **Falta:** re-render en staging de ediciones revisadas (los planes ya
sellados conservan su texto), release a producción cuando haya consumidor, baseline visual (ISSUE-122), índice paginado
del A4 y el alcance del rechazo en el contrato de evidencia (hoy un rechazo de la ventana de comparación se lee como
si fuera de la actual).

**Límite honesto de las familias:** el planner determinista emite `bar` y `bar_grouped`. Las otras
13 tienen geometría probada con fixtures y **ningún productor**; no se ofrecen como disponibles.

### 14.6 Estado de TASK-1848 — sharing, correo y recurrencia (en producción con flags OFF, 2026-09-18)

> Los bloques «Construido» y «Pendiente» de abajo registran el estado al cerrar el código (commits locales, sin
> deploy). **Superados** por el delta de producción al final de esta sección; se conservan como historia.

**Construido (al escribir: commits locales en `develop`, sin push ni deploy):**
- Slice 1 — ShareGrant + reader público: token `isg_` con sólo digest, commands `createInsightShare` /
  `revokeInsightShare` / `readInsightShares`, retirada de edición que revoca grants y cancela envíos pendientes,
  `InsightWebModelV1`, `GET /api/public/insights/shared/[token]` (+ `/outputs/[output]`), cabeceras y rate limit
  de §8, scrub de Sentry. Eventos `insights.share.created|revoked`.
- Slice 2 — envío por correo: intents + destinatarios + eventos, dos EmailTypes, projection de despacho,
  reconciliación de ambiguos, reintento y cancelación (§9). Evento `insights.delivery.requested`; señal
  `insights.delivery.ambiguous` cableada en `get-reliability-overview`.
- Slice 3 — recurrencia: schedules + ocurrencias, `window.ts`, tick en `ops-worker` con Cloud Scheduler
  `ops-insights-schedules-tick` (`20 * * * *`). Eventos `insights.schedule.changed|occurrence_generated`.
- Lanes App/Ecosystem y MCP de §7: manifest 62 tools (antes 55), hash `9fc46c8d90d3`.

**Migraciones aplicadas** en la instancia Cloud SQL única (dev/staging/prod comparten base), con readback:
`20260918094614053_task-1848-insights-share-grants`, `20260918100238745_task-1848-insights-delivery-intents`,
`20260918100811735_…-skip-reason-edition`, `20260918101834425_task-1848-insights-schedules`.

**Flags y runtimes lectores:**

| Flag | Vercel | ops-worker |
|---|---|---|
| `INSIGHTS_SHARING_ENABLED` | crear enlace y reader público; default OFF | — |
| `INSIGHTS_DELIVERY_ENABLED` | crear intent; default OFF | despacho; default `true` en `deploy.sh` |
| `INSIGHTS_SCHEDULES_ENABLED` | escrituras de schedule; default OFF | tick; default `true` en `deploy.sh` |
| `INSIGHTS_GENERATION_ENABLED` | ya existente | ahora también se lee aquí; default `true` en `deploy.sh` |

Revocar, cancelar, pausar y retirar funcionan con el flag OFF. Kill switch adicional por EmailType en
`email_type_config` (ambos sembrados `enabled=false`). `INSIGHTS_AUTHORING_AI_ENABLED` no se declara en el worker.

**Verificado:** suites focales (último barrido 1147 tests), live tests `sharing`, `delivery` y `schedules` 3/3
contra PostgreSQL real (transacción revertida), `pnpm worker:runtime-deps-gate` y `pnpm mcp:manifest:check`.

**Pendiente al escribir este bloque (ver delta de producción):**
- `pnpm test` completo y `pnpm build` de producción sobre el último commit.
- Push a `develop`, flags en Vercel staging, deploy del `ops-worker` y del Cloud Scheduler, canary sintético.
- Federación de las tools en el gateway `efeonce-mcp` (fuera de esta sesión).
- TASK-1875 (Think): consumidor de `/insights/r/<token>`; sin él el enlace compartido no tiene pantalla pública.
- Producción y release quedan fuera de la frontera de esta sesión.
- Gaps de producto: `portal_link` (TASK-1849), in-app/Teams (TASK-690–693 / TASK-1849), presentación final del correo.

#### Delta 2026-09-18 — staging, producción y gateway

- **Staging:** `INSIGHTS_SHARING/DELIVERY/SCHEDULES/ISSUANCE_ENABLED=true` en Vercel staging; `ops-worker` con
  DELIVERY/SCHEDULES/GENERATION. Canary sintético completo en la org sandbox (`EO-INS-000015`); los dos correos
  reales llegaron al buzón autorizado del operador (evidencia humana: Resend no reporta `delivered`, ISSUE-160).
- **Producción:** release `bda1cf2cd938` (PR #238, orquestador `35349506106`, `released` 13:41Z, sin retry).
  **Flags OFF en producción** (sharing, delivery, schedules; emisión también OFF) hasta que exista el lector de Think
  (TASK-1875). Canary de contrato secuencial: crear enlace ⇒ `503 sharing_disabled`; lector público con token
  inexistente ⇒ 404; sin token ⇒ 401.
- **Gateway `efeonce-mcp` 1.7.0** (PR #16 `4c9d7c44`, deploy `35351850324`, revisión
  `efeonce-mcp-gateway-00055-gk6` al 100 %, front door 200/200/401): provider `greenhouse-insights` contrato
  `task-1848-v1`, superficie 51 → 58 tools. Crear/revocar enlace exigen `efeonce.mcp.insights.write` (ningún cliente
  la porta ⇒ fail-closed); las 5 lecturas van con el scope base. Enviar correo y programar no existen por MCP.
  Canary del provider contra producción verde (schedules 1, shares 3, deliveries 3).
- **Incidente durante el canary — ISSUE-174:** una ráfaga concurrente de 64 requests al lector público dejó 86–88
  conexiones ociosas en la instancia Cloud SQL compartida durante 5 min. Corrección: TASK-1876 (P1, to-do). Regla:
  nunca probar límites con ráfagas concurrentes contra la base compartida.
- **Sigue abierto:** lector web en Think (TASK-1875, ya desbloqueada: `InsightWebModelV1` y el resolver existen);
  `portal_link` `not_ready` (TASK-1849); in-app/Teams (TASK-690–693 / TASK-1849); recordatorios, preferencias y baja
  no existen en V1; TASK-1876. El encendido en producción espera a TASK-1875.
