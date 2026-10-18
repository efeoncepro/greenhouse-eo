# TASK-2035 — Medición Growth escalable, CRO, retargeting y suscripciones

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `umbrella`
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Status real: `Corrida acotada configuración/CAPI/agent-first publicada14/10: TASK-2036/2037 completas, PR255/main9690efad, Server9, watchdog6/6; CRO/abandono/newsletter/CRM y tráfico real permanecen pendientes.`
- Rank: `Now`
- Domain: `data|growth|crm`
- Blocked by: `none`
- Branch: `develop; checkout compartido, sin worktrees`

## Summary

Coordinar el cierre completo de la medición Growth de Efeonce: configuración publicada por
formulario/calendario sin releases por cada alta, embudo CRO, retargeting de no convertidos,
suscripción real al blog y señales de calidad desde HubSpot. Conserva GA4/Meta, consentimiento,
matching y runtimes existentes; reúne dependencias y evidencia sin duplicar tasks dueñas.

## Why This Task Exists

El matching previo al contrato publicado14/10 usaba seis slugs fijos en backend y Client sGTM, un scheduler/surface fijo y
cuatro nombres de contacto. Al registrar este paraguas, habilitar matching aún
requería código y publicación GTM; ese gap quedó resuelto en TASK-2036/2037. La telemetría de inicio/intento/error existe parcialmente sin
cableado completo; los pasos, agenda y blog tienen dueños previos. El mapping genérico accepted
→ generate_lead tampoco distingue una suscripción editorial de una consulta comercial.
El operador pidió registrar **todo** lo pendiente de esta conversación, no sólo subscribe.

Esta es una task paraguas de coordinación, no una implementación híbrida monolítica. Sus campos
UI/Backend impact describen el artefacto directo documental; el resultado incluye backend y UI,
que deberán tener unidades dependientes con sus addenda y ownership antes de ejecutar código.
El registro no implementa la propuesta ni autoriza un publish, envío, campaña o nuevo gasto.

## Corrida autorizada 2026-10-14

El operador confirmó «Limitar ahora a configuración escalable y CAPI». Se completaron slices0/1
más verificación y release aplicables; el resto del alcance integral permanece en este paraguas
sin iniciarse. [Plan concreto](../plans/TASK-2035-plan.md), commit29b47e574: checkpoint P1 aprobado por «Apruebo el plan; ejecuta».
El operador aprobó explícitamente el plan, cumpliendo TASK_PROCESS §Phase3.
La reparación CAPI pertenece a TASK-2034; ba9b8c9cc y la ampliación policy/agentes quedaron
incluidas en PR255/main9690efad, Server9. Ver el cierre publicado y sus límites.

## Goal

- Incorporar fuentes compatibles publicando datos y políticas, sin código ni publish GTM por cada alta.
- Medir de exposición a conversión, diagnosticar fricción y recuperar intención con audiencias consentidas.
- Separar consultas comerciales, reservas, suscriptores y resultados CRM sin duplicar conversiones.
- Cerrar por evidencia real de cada runtime/host/proveedor, conservando límites de autorización.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_MEETINGS_SCHEDULER_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_TRACKING_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_META_CAPI_SERVER_GTM_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_MEASUREMENT_CONFIGURATION_PROPOSAL_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/ui-platform/README.md`

La decisión Meta CAPI vigente y Forms/Meetings siguen siendo dueñas de sus fronteras. Antes de
schema/policy/auth o ampliación de eventos, formalizar el amendment/ADR correspondiente y su
mecanismo de envelope autenticado/versionado; la propuesta no se declara Accepted al crear esta task.
No adelantar extracción a Studio, crear otro SSOT, ni crear proyecto, servicio o cron nuevos.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/reference/measurement-gtm-ga4/04-greenhouse-gh-event-convention.md`
- `docs/reference/measurement-gtm-ga4/09-hubspot-consent.md`
- `docs/reference/measurement-gtm-ga4/10-growth-lead-matching-runtime.md`
- `docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md`
- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`
- `.codex/skills/greenhouse-task-planner/SKILL.md`
- `.codex/skills/greenhouse-gtm-ga4-operator/SKILL.md`
- `.codex/skills/greenhouse-growth-forms/SKILL.md`
- `.codex/skills/greenhouse-growth-meetings/SKILL.md`
- `.codex/skills/hubspot-as-a-service/SKILL.md`
- `.codex/skills/greenhouse-ai-design-studio/SKILL.md`
- `.codex/skills/greenhouse-production-release/SKILL.md`
- `.codex/skills/greenhouse-secret-hygiene/SKILL.md`

## Dependencies & Impact

### Depends on

| Dueño existente | Responsabilidad que conserva / condición de integración |
| --- | --- |
| `docs/tasks/in-progress/TASK-2034-growth-lead-matching-meta-google.md` | Matching publicado; primera conversión comercial consentida post-flip y recepción aún pendientes. No reimplementar su cola. |
| `docs/tasks/to-do/TASK-1359-growth-forms-multistep-funnel-instrumentation.md` | Pasos genéricos de Forms y campos de error; integrar, no crear otra instrumentación por paso. |
| `docs/tasks/in-progress/TASK-1509-growth-meetings-scheduler-server-adapter.md` | Confirmación/ledger/provider y prueba de booking/replay real. |
| `docs/tasks/in-progress/TASK-1510-native-meeting-scheduler-portable-experience.md` | Renderer, disponibilidad, estados, funnel/publish y graduación de surfaces de agenda. |
| `docs/tasks/to-do/TASK-1885-meeting-booking-campaign-attribution.md` | Atribución de campañas de reservas y reader por origen; sin backfill inventado. |
| `docs/tasks/to-do/TASK-1802-content-hub-blog-navegacion-formatos.md` | Formulario real de suscripción y placement del blog, con lista/consentimiento/receipt; no duplicar el rediseño del hub. |
| `docs/tasks/to-do/TASK-1866-careers-funnel-ga4-gtm-measurement.md` | Careers separado de generate_lead; prueba de no regresión al modificar routing por finalidad. No habilitar publicidad en postulaciones. |

Dependencias por slice: se puede planificar foundation mientras los recibos finales anteriores
siguen pendientes; éstos bloquean su cierre correspondiente, no todo el trabajo de diseño.
Ninguna task existente cubre el conjunto policy/config + CRO + audiencias + outcomes + cierre
cross-runtime; ésta lo coordina. El barrido fue por dominio y superficie, no sólo por título.

### Blocks / Impacts

- Nuevos formularios/calendarios que requieran matching sin releases repetidos.
- Cockpits Forms/Meetings y API de configuración, sitio WordPress y Think/Astro.
- GTM Web/Server, propiedad GA4 `486264460`, Meta Pixel `708931297255942`, Google Ads vinculado.
- HubSpot como verdad de suscripción, calificación y negocio; campañas sólo tras activación autorizada.

### Files owned

- `docs/tasks/in-progress/TASK-2035-growth-measurement-scalable-cro-retargeting-subscriptions.md`
- `docs/architecture/GREENHOUSE_GROWTH_MEASUREMENT_CONFIGURATION_PROPOSAL_V1.md` — brief/decisiones del programa hasta su formalización.
- `docs/tasks/TASK_ID_REGISTRY.md`, `docs/tasks/README.md`, `Handoff.md` — sólo filas/punteros de este programa.

El paraguas no reclama implementación directa en los archivos de las tasks anteriores. Las
unidades nuevas necesarias (foundation policy/API, consumer UI y adapters/audiencias/outcomes)
se identificarán antes de código, con IDs nuevos sólo donde el barrido confirme un gap real.
El panel UI exige task ui-ux dependiente de la foundation: wireframe, flow, decisión de primitives,
UI ready no hasta mapping/GVC/decision log, copy y estados bajo las skills UI vigentes.

## Current Repo State

### Already exists

- `src/lib/growth/forms/{contracts,commands,store}.ts`, versiones/publicación y form_kind `subscribe`.
- `src/growth-forms-renderer/{renderer,telemetry}.ts`, inicio, intento, validación/rechazo y acciones de éxito.
- `src/lib/growth/meetings/{contracts,command,store}.ts` y `src/growth-meeting-renderer/`.
- `src/lib/growth/measurement/`, `src/growth-measurement-context/`, worker y ledgers cifrados ya publicados.
- `scripts/measurement/sgtm-lead-client.js` y `src/lib/growth/measurement/payload.ts` con scope fijo.
- `scripts/measurement/hubspot-consent-bridge.js` y adapter La órbita publicados en ambos hosts.
- GA4 generate_lead key event `ONCE_PER_EVENT`, comprobado por UI/API el 14/10/2026; Web live5 con accepted y booking_confirmed, seis señales CTA, sin tags específicos Forms started/submitted/rejected.
- GA4 form_start aparece en eventos recientes; no asumir que el automático cubre todos los custom elements.
- Server live6, matching activado y siete audiencias comerciales de TASK-2034; esto no acredita nuevas audiencias de abandono ni serving.

### Gap

- Política server-only por identidad estable/versión/surface; mapeo de campos y lifecycle administrable.
- Autoridad autenticada en sGTM sin segunda lista de slugs, con invalidación/revocación y compatibilidad.
- Instrumentación/tagging CRO completos y sin duplicar enhanced measurement ni CTA/Forms.
- Audiencias de abandono, exclusiones y recepción Meta de señales de intención aún no construidas.
- Suscripción confirmada por finalidad, dedupe y clasificación distinta de generate_lead.
- Señales CRM calificadas/convertidas y correlación autorizada aún por diseñar/verificar.
- Cierre de evidencias previas pendientes; no confundir QA de UI (intercepta transporte) con entrega publicitaria.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `docs/tasks/` y `docs/architecture/`; coordinación sobre los runtimes Forms/Meetings/measurement y ops-worker ya existentes
- Future candidate home: `remain-shared`
- Boundary: paraguas documental; commands/readers del dominio fuente autorizan y adapters de destino consumen contratos versionados
- Server/browser split: sólo DTO/telemetría permitida en browser; políticas autorizantes, contactos, hashes, secretos y escritura detrás de comandos server-only
- Build impact: none en este registro; las unidades de renderer/worker declararán inputs y compatibilidad antes de cambiar bundles
- Extraction blocker: transacciones Forms/Meetings, autoridad de consentimiento y frontera autenticada de sGTM; no mover dominio a otro runtime por esta task

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical` para las unidades de ejecución dependientes; el paraguas sólo coordina.
- Impacto principal: `integration` en los descendientes, sin mutación runtime en este registro.
- Source of truth afectado: definiciones/versiones Forms, scheduler/binding, aceptación/booking persistidos y estado real de suscripción/negocio en HubSpot.
- Consumidores afectados: API/UI/agentes, renderers públicos, worker, GTM, GA4, Meta y Google Ads.
- Runtime target: `production` sólo tras gates de cada unidad.

### Contract surface

- Existente: comandos Forms/Meetings, contexto publicitario, preparación/enqueue y Client sGTM actuales.
- Nuevo/modificado: policy publicada por fuente, mapping por finalidad y envelope autenticado/versionado; schema/rutas exactos se deciden en foundation, no existen por registrarlos aquí.
- Backward compatibility: `gated`; defaults OFF para fuentes nuevas, seed equivalente a cobertura autorizada actual.
- Full API parity: un command/reader para editar/validar/publicar/desactivar, con permisos finos, actor/scope e idempotencia; UI/agentes/API consumen esa misma autoridad. MCP requiere contrato/permisos/gateway/canary, no se expone por inferencia.

### Data model and invariants

- Tablas existentes: greenhouse_growth.measurement_conversion/measurement_delivery y records Forms/Meetings; almacenamiento definitivo de policy pendiente de decisión canónica.
- Un ID durable por ocurrencia/retry; el browser no puede autoautorizar matching ni falsificar aceptación comercial.
- Analítica, publicidad y suscripción editorial independientes; unknown/denied/GPC bloquean el destino aplicable, no la aceptación de negocio.
- No PII, hashes de contacto, valores escritos, tokens ni URLs privadas en dataLayer/GA4 params/logs; los microeventos no recolectan identidades parciales.
- Write-target allowlist: unidades con tablas nuevas deben ampliar el boundary test existente cuando corresponda y justificar cada destino en el mismo PR.
- Tenant/space boundary: autorización canónica por actor/organización/surface; ningún POST público amplía su alcance, ningún default habilita clientes/hosts ajenos.
- Idempotency/concurrency: snapshot de versión autorizado, aceptación y enqueue con frontera transaccional, retry estable y revocación definida también sobre la cola pendiente.
- Audit/outbox/history: actor/versión/acción, recibos por destino y errores sanitizados; sin segunda verdad de negocio ni logs de payloads sensibles.

### Migration, backfill and rollout

- Migration posture: `additive`; la foundation detalla tabla/seed/grants/rollback antes de apply.
- Default state: nuevas fuentes/destinos OFF; preservar switches capture/meta/google/retención existentes.
- Backfill plan: no reconstruir consentimiento ni conversiones históricas; seed sólo equivalencia actual, con dry-run/readback.
- Rollback path: desactivar política/versionar configuración y volver a contratos compatibles; no borrar ciphertext vigente ni habilitar dos senders.
- External coordination: Preview/publish GTM, settings/audiencias, HubSpot tipo de suscripción y releases/hosts con diff y permisos vigentes.

### Security and access

- Auth/access gate: capability/scope efectivo y envelope server-to-server; microeventos browser no heredan backend_verified ni su fuerza probatoria.
- Sensitive data posture: conservar cifrado/retención del matching actual; CRM tardío necesita contrato propio de correlación/retención, no reutilizar material ya purgado ni extenderlo silenciosamente.
- Error contract: clases cerradas/seguras, sin body ni valores de campos; unknown schema/purpose/origin falla cerrado para publicidad.
- Abuse/rate-limit posture: límites/replay/dedupe; QA, spam y bots excluidos de cohortes comerciales donde puedan identificarse sin inventar certeza.

### Runtime evidence

- Local checks: tests de política/mapping/consentimiento, allowlists y dedupe; parsers de ambos lados con contratos compatibles e incompatibles.
- DB/runtime checks: seed/dry-run/readback, revocación/cache/cola/retries y rol runtime.
- Integration checks: Preview/contratos y Meta Test Events; GA4 receipt y key events/audiencias; HubSpot estado de suscripción/negocio.
- Reliability signals/logs: aceptación/entrega/provider, errores de contrato y drift por versión/destino; nombres definidos en implementación, nunca inventados como ya existentes.
- Production verification sequence: release completo, contrato compatible en destinos, config acotada y readback; primera conversión real separada de fixtures.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->



<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 0 — Contrato, ownership y planificación de ejecución

- Convertir el brief aprobado en matriz finalidad/evento/destino/consentimiento/autoridad/evidencia.
- Asignar cada pendiente a su task dueña; crear dependientes sólo para foundation/API, consumer UI u otro gap no cubierto. Mantener un único cierre de programa aquí.
- Formalizar ADR/amendment de policy, autoridad sGTM, revocación/cola/cache y nuevas finalidades antes de schema/código. Separar backend-data de consumer ui-ux.

### Slice 1 — Configuración escalable de Forms y Meetings

- Política server-only por form_key estable + versión/surface/orígenes, y equivalente scheduler/binding; rename no revoca ni amplía accidentalmente la autorización.
- Destinos independientes, propósito comercial/editorial explícito, mapping a email/teléfono E.164/nombre/apellido sólo desde campos declarados/tipados y normalizados.
- Draft → validación/review → publish → desactivación con auditoría; tipos incompatibles bloquean publicación. No usar analytics_policy_json browser-safe como autorización publicitaria.
- Backend consume snapshot validado; sGTM acepta una prueba autenticada/versionada de scope sin enumerar cada slug. Reemplazar las dos allowlists sólo tras compatibilidad, no retirar commercial_scope sin sustituto.
- Resolver policyVersion/retries/revocación/cache/TTL/fail-closed y mínimos de clasificación. Ampliar catálogo sólo publicando datos dentro del contrato y hosts aprobados.
- API y cockpit sobre los mismos primitives, con Full API Parity y permisos efectivos; UI dependiente con wireframe/flow/GVC y capacidad de revisar bloqueos por fuente/destino.

### Slice 2 — Embudo de CRO reutilizable

- Formulario visible, listo/utilizable y fallo de carga distinguibles: definir exposición real/umbral, dedupe y emisor host cuando falla el bundle. No llamar visible a la mera inserción en DOM.
- Inicio real, intento, validación, captcha/rechazo, aceptación y éxito conservan semánticas distintas. Reusar gh_form_* y evitar duplicar form_start/form_submit automáticos.
- Pasos vistos/completados/atrás y field_key/step_index por TASK-1359; claves gobernadas, nunca valores ni un eventName por campo/paso/formulario.
- Agenda: inicio/pasos, sin disponibilidad, error/conflicto/timeout y confirmación por TASK-1509/1510; no tratar falta de horarios como abandono voluntario ni outcome ambiguo como fracaso seguro.
- Completar exposición CTA → clic → apertura del form/agenda, por placement, reusando greenhouse_cta_*; clic en teléfono/WhatsApp, si existe, es intento de contacto y no conversación confirmada.
- Acciones posteriores al lead: éxito mostrado, clic de descarga/acceso efectivo a recurso o informe y CTA a reunión; no equiparar clic/redirect con descarga o lectura efectiva.
- Parámetros permitidos: identidad/versión/finalidad/surface/placement, paso/categoría segura de error y tiempos en rangos. Usar dimensiones de dispositivo/canal de GA4 en lugar de duplicarlas sin razón.
- Variante y experimento sólo cuando haya asignación/exposición real; sin motor A/B nuevo ni experimentos ficticios. Contrato opcional probado con fixtures y cobertura de versiones.
- GA4 recibe funnel diagnóstico completo; Meta sólo intención comercial/editorial autorizada útil (por ejemplo FormStarted, FormSubmitAttempt, MeetingStarted, nombres propuestos a formalizar), por CAPI/server existente. Nunca etiquetar estos microeventos como Lead/backend_verified o key event final.

### Slice 3 — Audiencias de abandono y retargeting

- Cohortes por servicio/formulario: inició sin convertir; intentó sin aceptación; inició agenda sin booking confirmado. Ventanas iniciales propuestas 7/14/30 días, configurables y justificadas con volumen.
- Excluir conversiones posteriores y suscriptores existentes cuando la campaña busque nuevas altas; documentar delay de procesamiento/provider y cancelación/reingreso según política.
- Inferir abandono mediante secuencia/inclusión/exclusión y ventana; no depender de unload, cierre de pestaña o un timeout como prueba de negocio.
- Diagnosticar errores en GA4; no enviar indiscriminadamente errores/captcha/spam a Meta ni recolectar correo/teléfono antes de la aceptación para recuperar una persona.
- Crear/leer de vuelta audiencias separadamente de habilitar eventos; Meta no recibe las audiencias GA4 por el vínculo Google Ads. Verificar rutas de datos e identificación consentida por plataforma.
- Ads: separar configuración, población, exportación, elegibilidad por volumen y serving. No prometer alcanzar a todos ni lanzar campañas/presupuesto al crear audiencias.

### Slice 4 — Suscripción editorial real y mapeo por finalidad

- TASK-1802 conserva construir/publicar el formulario del blog; definir tipo/lista de suscripción HubSpot, UX/receipt y single versus double opt-in antes del alta real.
- Propuesta GA4 gh_newsletter_subscribed como key event editorial; Meta NewsletterSubscribed custom vía CAPI con consentimiento. Validar nombres/semántica oficiales antes de congelar mapping; sign_up sólo para alta real de cuenta, Subscribe estándar Meta no se elige por coincidencia verbal.
- Solicitud recibida y suscripción activa son hechos diferentes; con double opt-in la conversión final nace de confirmación server/provider, no del primer POST ni de visitar una thank-you page.
- Idempotencia por transición de estado: reenvío/retry/correo ya suscrito no suma nueva alta; decidir expresamente reactivación tras baja.
- Routing genérico por propósito: comercial → generate_lead/Lead; suscripción → evento editorial; aplicación/Careers permanece en su dueño TASK-1866. Ningún alta dispara dos resultados finales por una sola transición.
- Permiso de newsletter, analítica y publicidad independientes; suscribirse funciona aunque publicidad esté denegada. Contacto existente en CRM no equivale a estar suscrito.
- Audiencia de suscriptores propia; objetivo editorial separado, secundario por defecto frente a captación comercial en Google Ads. No inventar ingreso/value ni ampliar suscripciones del contacto.

### Slice 5 — Calidad de negocio desde HubSpot

- qualify_lead y close_convert_lead GA4 propuestos desde transiciones reales/calificadas en HubSpot, no desde clic, email abierto o criterio inferido del agente.
- Definir con el operador la condición comercial y mapping Meta compatible para calificado/convertido, validando soporte/semántica antes de emitir. No llamar Purchase sin compra real/valor válido.
- IDs estables, correlación/campaña y consentimiento verificables sin user_id fabricado, contacto en dimensiones ni reutilización de material de matching purgado a 48 h.
- Tests de reintento, cambios/reversiones de etapa y reconfirmación sin duplicados; separar nomenclatura, configuración provider y recepción/atribución observada.

### Slice 6 — Reporting, publicación inicial y cierre real

- Exploraciones/reportes GA4 por formulario/servicio, dispositivo, canal y variante; conversión, abandono por paso, errores, tiempo por rangos, disponibilidad y progresión a calidad comercial.
- Backend aceptado, espejo browser, delivery y provider son planos distintos; reconciliar pérdidas conocidas sin alterar la verdad del negocio.
- Un release inicial completo develop → main y publicación inicial GTM gobernados. Después demostrar alta de una fuente compatible por datos sin nuevo commit/redeploy/publish GTM; nuevos hosts/eventos/destinos/contratos pueden requerir otro cambio técnico.
- Verificar WP/Think visitante nuevo, aceptar/rechazar/revocar/GPC, microeventos autorizados, lead/subscription/booking y negativos, sin contaminación de CRM ni conversiones sintéticas ordinarias.
- Completar recibos pendientes de TASK-2034/1509/1510 y atribución TASK-1885 donde corresponda; fixtures/QA de UI que intercepta transporte no prueban entrega real.
- Actualizar contrato/event catalog, Tracking Plan, snapshots, flags, docs funcionales/manuales, skills y espejos existentes, recibos y rollback; observar CI/deploy/aliases/provider por separado.

## Out of Scope

- Otro proyecto Cloud, servicio/cron/sender, CMP, nueva cuenta GA4 o infraestructura publicitaria paralela.
- Reimplementar hub editorial, scheduler, pasos Forms o Careers que ya tienen dueño; sólo coordinar sus gaps del programa.
- Campañas, presupuestos, envíos a suscriptores o canaries que creen negocio falso sin su autorización específica.
- Contactos parciales capturados mientras escriben, audiences de postulaciones/surveys o publicidad sin consentimiento.
- Promoción de toda señal a conversión, imports indiscriminados como objetivos primarios Ads o cifras comerciales inventadas.
- Backfill sin consentimiento, expansión silenciosa de retención, extracción de dominio a Studio o nuevo motor de experimentación.
- Incidencia mindicador/TLS separada; la credencial Vercel expuesta ya fue rotada/revocada, no es un pendiente de este programa.

## Detailed Spec

El Scope es el brief completo de entregables; la ubicación de policy/schema/API, el envelope y las
unidades ejecutables se fijan en la foundation con ADR/checkpoint. No se declara implementado un
campo, endpoint o contrato sólo por describirlo en esta task. Esta task no rellena Zone 2 ni
aprueba un plan técnico por anticipado.

## Rollout Plan & Risk Matrix

Impact-only del paraguas: la ejecución la gobiernan sus tasks dueñas/dependientes. Mantener
estados separados por código, configuración publicada, consentimiento, ack, recepción y serving.

### Slice ordering hard rule

- Contrato/ownership y foundation server-only → command/API y DTO compatible → consumer UI/renderer → worker/Client sGTM compatible → seed equivalente → ampliación por datos.
- El contrato de clasificación por finalidad debe estar activo antes de publicar el formulario del blog; no permitir que herede generate_lead.
- Microeventos de intención autorizados/verificados → audiencias/exclusiones → comprobar elegibilidad; activar campañas es otra acción.
- Señales CRM sólo tras reglas de negocio/correlación/consentimiento y transición real verificadas.
- Release inicial completo y publicación destino compatibles preceden altas nuevas; retirar listas fijas al final, nunca con workers incompatibles sirviendo policies nuevas.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
| --- | --- | --- | --- | --- |
| Scope forjado por browser o policy ajena | API/sGTM | high | Autorización server-only, envelope, tenant/surface y deny tests | Rechazo seguro por versión/scope; diseñar señal en foundation |
| Doble conversión o newsletter como Lead | GA4/Meta/Ads | high | Routing por finalidad y único evento final por transición | Reconciliación por propósito/event_id |
| Worker antiguo o cache obsoleta entrega política revocada | Worker/cola/sGTM | medium | Contrato compatible, invalidación/revocación/retry definidos | Drift de policyVersion/contrato y entrega bloqueada |
| PII/URLs sensibles en CRO o importación CRM | Browser/providers | high | Allowlist, logs saneados, política de consentimiento/retención | Tests negativos y revisión de payload sin secretos |
| Audiencia no poblada o no elegible se presenta como activa | Ads/reporting | medium | Readback y estados de población/export/serving separados | Estado explícito de cada proveedor |
| QA crea leads/suscripciones/reservas ordinarios | HubSpot/Meta/GA4 | medium | Fixtures locales/interceptados y modo de prueba provider autorizado | Reconciliación de QA y cero negocio sintético ordinario |

### Feature flags / cutover

Conservar los cuatro switches actuales de captura/Meta/Google/retención y los de dominio. La
foundation define el mecanismo de versión/activación de políticas y las condiciones exactas
antes de implementarlo. Nuevos destinos/fuentes OFF; seed sólo los seis Forms y pareja Meetings
actuales. Nunca convertir todo el catálogo en elegible por default ni insertar consentimiento retrospectivo.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
| --- | --- | --- | --- |
| Policy/API/consumer | Desactivar nueva policy y restaurar versión compatible; no rollback destructivo de datos | Medir en staging antes de producción | sí |
| GTM/microeventos | Restaurar versión publicada previa con mapping compatible; preservar Lead existente y remitente único | Medir en Preview/staging | sí, los eventos ya recibidos permanecen |
| Audiencias/objetivos | Desactivar uso/export/objetivo de la nueva cohorte con readback | Según propagación del provider | parcial |
| Suscripción/CRM | Pausar emisión nueva; conservar verdad de suscripción, baja o negocio y su auditoría | Definir por adapter | parcial, no deshacer negocio para corregir medición |

### Production verification sequence

1. Cada task ejecutable completa plan/checkpoint y tests focales; consumer UI cumple wireframe/flow/GVC.
2. Staging: migración aditiva/seed dry-run, contratos allow/deny, scope, consentimiento/GPC, cache/revocación y retries; rollback probado.
3. Preview GTM Web/Server y Google/Meta settings con diff; aprobación de publicación conforme a su skill y registro de targets previos.
4. Release completo develop → main por greenhouse-production-release; no cherry-pick parcial ni build local pesado innecesario. Leer CI/orquestador/manifest, revisiones worker/Vercel y aliases.
5. Configuración/seed equivalentes y cutover compatible, después alta por datos de fuente nueva; ningún alta publica código/GTM.
6. Recepción proporcional por destino y primera conversión real consentida; canary controlado sólo con autorización y destino test real, sin fabricar negocio.
7. Monitorear pérdidas/errores/cola/retención, población/elegibilidad de audiencias y rollback; registrar lo no observado sin tildarlo.

### Out-of-band coordination required

GTM publish, settings/imports/audiencias Meta/GA4/Ads y HubSpot suscripción/transiciones se
preparan con diff/preview/readback y se operan bajo sus permisos/checkpoints vigentes. Registro
de task no autoriza publicaciones, alta real de suscriptores, mensajes/campañas, gasto o cambio
de IAM. No usar la automatización para pedir a otros agentes/usuarios una autorización inexistente.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Alcance de la corrida confirmado por el operador14/10: configuración escalable y CAPI; goal activo y plan registrado, resto del paraguas pendiente.

- [x] Existe mapa exhaustivo de gaps, unidades dueñas y dependencias; no se duplican TASK-1359/1509/1510/1802/1885/1866/2034 ni se ocultan pendientes sin dueño. — evidencia TASK-2036/2037 y release9690efad (ver auditoría final).
- [x] Foundation backend-data y consumer ui-ux quedan separados en unidades ejecutables; perfiles/addenda/ownership y wireframe/flow/GVC están presentes antes de código UI. — evidencia TASK-2036/2037 y release9690efad (ver auditoría final).
- [x] ADR/amendment define SSOT, policy/schema, envelope, compatibilidad, revocación/cache/cola, acceso/idempotencia/auditoría y errores sanitizados antes de implementar. — evidencia TASK-2036/2037 y release9690efad (ver auditoría final).
- [x] API y UI editan/validan/publican/desactivan la misma política con capability/scope efectivo y Full API Parity; casos de tenant/surface ajeno rechazan. — evidencia TASK-2036/2037 y release9690efad (ver auditoría final).
- [x] Una nueva fuente autorizada se habilita sólo publicando datos y mapping; evidencia muestra cero cambios de código/redeploy/publish GTM por esa alta compatible. — evidencia TASK-2036/2037 y release9690efad (ver auditoría final).
- [x] form_key estable sobrevive rename; versión/surface/origin o campos incompatibles impiden matching sin romper aceptación de negocio. — evidencia TASK-2036/2037 y release9690efad (ver auditoría final).
- [x] Seed mantiene exactamente seis Forms y pareja Meetings autorizados; fuentes nuevas/destinos OFF y fallos desconocidos cerrados, sin ampliar hosts/clientes. — evidencia TASK-2036/2037 y release9690efad (ver auditoría final).
- [x] No quedan dos allowlists por slug ni browser con autoridad publicitaria; sGTM rechaza envelope/versión/scope/consentimiento inválidos y distingue microevento de hecho backend. — evidencia TASK-2036/2037 y release9690efad (ver auditoría final).
- [ ] Exposición real, readiness/fallo de carga, inicio, intento, errores/captcha/rechazo, aceptación y éxito quedan observables sin doble conteo ni valores de campos.
- [ ] TASK-1359 entrega pasos y errores por clave; agenda distingue falta de disponibilidad, conflicto, timeout y booking confirmado, con tagging verificado.
- [ ] CTA visto/clic/apertura y postconversión/download/acceso/informe usan señales existentes; clic/redirect no se reporta como consumo efectivo.
- [ ] Parámetros versión/finalidad/servicio/surface/placement/paso/error/tiempo son cerrados; variantes/experimentos sólo se emiten con contexto real válido, sin engine A/B nuevo.
- [ ] GA4 recibe el funnel diagnóstico; Meta sólo intención seleccionada por CAPI/servidor y consentimiento, sin convertir microeventos en Lead o key events.
- [ ] Las tres familias de abandono tienen cohortes por servicio/formulario, ventanas definidas y exclusión de conversiones posteriores, sin depender de unload.
- [ ] Audiencias Google/Meta tienen readback de definición y estados separados de población/export/elegibilidad/serving; no se promete cobertura universal ni se activan campañas por inferencia.
- [ ] TASK-1802 entrega formulario de blog real gobernado, destino/tipo de suscripción y receipt, con single/double opt-in definido antes del alta real.
- [ ] Suscripción activa genera una sola conversión editorial; solicitud pendiente, visita thank-you, retry o correo ya suscrito no la generan y no disparan generate_lead/Lead.
- [ ] Newsletter, analítica y publicidad son elecciones independientes; funciona suscripción con publicidad denegada y ningún dato parcial se usa para matching.
- [ ] gh_newsletter_subscribed/NewsletterSubscribed tienen mapping validado, key event editorial y objetivo Ads separado/secundario, sin revenue inventado ni alcance comercial automático.
- [ ] qualify_lead/close_convert_lead y equivalente Meta validado nacen de reglas/transiciones HubSpot confirmadas con correlación/consentimiento/retención propia, sin usar material purgado ni duplicar retries.
- [ ] Reportes GA4 permiten comparar conversión/abandono/fricción por fuente/canal/dispositivo y calidad CRM, diferenciando verdad backend, espejo browser y entrega provider.
- [ ] Local/staging/DB/Preview/runtime y negativos cubren consent denied/unknown/GPC/revoke, scope, reintentos/cache/revocación y regresión comercial/editorial/Careers; ningún QA contamina negocio ordinario.
- [ ] El release inicial es todo develop → main; CI/orquestador/manifest/revisiones/aliases, publicación GTM y rollback compatible tienen recibos independientes.
- [ ] Se completan o mantienen visiblemente abiertos los recibos reales pendientes de TASK-2034/1509/1510/1885; no se cierra por interceptar transporte ni por Processed/HTTP200 solamente.
- [ ] Tracking Plan, catálogo de eventos, snapshots, flags, docs funcionales/manuales, skills y espejos existentes reflejan lo desplegado y las limitaciones; no nueva infraestructura/costo sin decisión separada.

## Verification

Registro del paraguas: revisión documental y de ownership; no ejecutar build/tests de la feature
para crear esta task. Las evidencias técnicas son obligatorias en sus unidades de implementación.

- `pnpm task:lint --task TASK-2035`: scanned=1 template=1 legacy=0, sin errores ni warnings.
- `node scripts/check-documentation-closure.mjs --staged` con el scope documental propio.
- `pnpm docs:context-check:strict` tras la última edición de roots.
- Revisar que los enlaces/paths y el mapa de dueños existen, y que las decisiones abiertas no se presentan como capacidades activas.
- Cierre final: revisar recibos de cada acceptance y de sus dependientes; las pruebas técnicas están especificadas en Backend/Data Contract y Production verification sequence.

## Closing Protocol

- [ ] Lifecycle, carpeta, índice y registry coinciden con el avance real del programa; registrar checkboxes con evidencia, no sólo prosa.
- [ ] Handoff y changelog se sincronizan cuando cambie runtime/protocolo, con enlaces a recibos y pendientes.
- [ ] Cada task dueña conserva su propia aceptación; este paraguas no cierra hijas por inferencia.
- [ ] Docs funcionales, manuales, arquitectura/ADR y skills/espejos pertinentes acompañan la capacidad verificada.
- [ ] No quedan pendientes de rollout/consentimiento/recepción real etiquetados como completos.

## Follow-ups

Las unidades foundation/API, consumer UI y adapters/audiencias/outcomes se registran al planificar
con un nuevo barrido; no se reservan IDs adicionales en esta creación. Reusar las tasks dueñas
citadas y adjuntar sus deltas/criterios antes de tomar superficies compartidas. No se abre otra
épica ni se altera la naturaleza/política de otros productos.

## Open Questions

- Ubicación física/versionado de policy, mecanismo del envelope y tratamiento de revocación en cola/cache: resolver en foundation y ADR, antes de mutaciones.
- UX exacta del panel y operaciones programáticas/MCP: consumer UI y API contract, sin navegación nueva inventada por esta task.
- Tipo/lista/idioma/frecuencia editorial HubSpot y single/double opt-in: resolver con TASK-1802, sin enviar correos al decidirlo.
- Ventanas 7/14/30 días, regla de exclusión/reingreso y objetivos por campaña: validar con volumen elegible; campaña no incluida en este registro.
- Definición comercial de calificado/convertido y correlación permitida a largo plazo: decide el operador con reglas HubSpot y privacidad, sin inferir desde una etapa ambigua.
- Nombres Meta nuevos y campos admitidos/objetivos: verificar documentación primaria y Preview antes de publicar; son propuestas en este brief.


### Cierre de la corrida acotada14/10

[release y evidencia](../../audits/releases/2026-10-14-scalable-measurement-agent-first-release.md). Sólo los criterios de configuración/CAPI/cliente agente se completan. El resto de la umbrella conserva sus checkboxes abiertos y dueñas existentes.
