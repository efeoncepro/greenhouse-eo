# SKY: modelo operativo, servicios, sincronización y altas

Fecha: 2026-10-27. Estado: discovery; propuesta sin implementación ni decisión arquitectónica aceptada.

## 1. Conclusión y alcance

SKY debe conservar una Organization comercial y disponer de dos Spaces operativos para Diseño y Blog SEO/AEO. El servicio/engagement ya existe en el modelo; no hace falta inventar otra entidad de negocio `Account` o duplicar la Organization para representar departamentos. La separación requiere resolver el puente técnico `client_id`, el alta de un segundo Space y la autoridad de sus bindings **antes** de habilitarlo. Crear una fila de Space y mover el servicio hoy no asegura que sobreviva a la siguiente sincronización.

La decisión del puente tiene dos alternativas reales: mantener un client compartido con contexto de Space explícito en los consumidores, o permitir un client técnico por Space bajo la misma identidad comercial y financiera mediante una primitive nueva. Ninguna está implementada como operación segura completa. Este anexo no da por aceptada una de ellas; compara sus implicaciones para que la decisión de Identity/Finance no se esconda dentro de una migración de servicios. En ambos casos, HubSpot debe seguir siendo dueño de los hechos comerciales y Greenhouse dueño del routing operativo.

La recomendación incremental común a ambas alternativas es:

1. Mantener intacto el Space actual y sus fuentes/historia; no reclasificar en bloque los 123 proyectos.
2. Introducir un contrato explícito de Service→Space, con autoridad y versión, que todos los escritores respeten.
3. Preparar y revisar un plan de alta de Space SEO, source bindings, personas y rutas, sin reutilizar el wizard de clientización actual.
4. Habilitar el segundo Space sólo después de resolver el puente de identidad, el routing de fuentes y los lectores que asumirían un destino único.
5. Verificar un ciclo completo de sync/replay/cron y regresión de Diseño antes de declarar separación operativa.

Este discovery no creó Space, client, fuentes Notion, corridas AEO, secretos, tareas, ADRs ni despliegues. No hubo escritura en HubSpot/Notion. El informe Blog/SEO/AEO conserva como requisito **GA4 + GSC + corridas del motor AEO**, con scope honesto de URLs del blog. Sus contratos analíticos se desarrollan en los anexos de Insights, no se sustituyen por los indicadores de delivery.

## 2. Qué permite el canon y qué muestra el runtime

### 2.1 Modelo vigente

- Organization es la cuenta canónica; Space es un child operativo con configuración, binding Notion, capabilities, readiness y scope de delivery. Space 360 es una vista, no otra entidad. El onboarding parte de Organization y actúa sobre Space: `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md:83–93`.
- Organization conserva el lifecycle comercial y `commercial_party_id`; el canon actual llama a `clients` extensión financiera y declara `instantiateClientForParty` como su escritor de nacimiento: mismo documento, `3–14`. Esto es una restricción **vigente que una alternativa de client técnico adicional tendría que modificar explícitamente**, no una razón para copiar organizaciones o perfiles financieros.
- LegalEntity, Organization y Space son capas distintas: mismo documento, `57–67`. Departamentos/stakeholders diferentes no acreditan una contraparte legal diferente.
- Account Complete 360 resuelve el grafo Organization→Spaces→clients: mismo documento, `1443–1462`; el reader agrega IDs DISTINCT, `src/lib/account-360/resolve-scope.ts:10–40`. Es una lectura federada, no una nueva identidad de cuenta.
- Engagement y Project son distintos: `docs/business-models/EFEONCE_ENGAGEMENT_PROJECT_OPERATING_MODEL_V1.md:41–79`. Una Organization puede tener compromisos simultáneos; los proyectos que ejecutan trabajo comercial deben declarar engagement primario. El runtime ya extiende `services` con `engagement_kind` y términos: `migrations/20260506200742463_task-801-engagement-primitive-services-extension.sql:18–38`.

Por tanto, la jerarquía de negocio recomendada es Organization SKY → Spaces Diseño/SEO → servicios/engagements → proyectos/tareas. Los permisos y los detalles del puente técnico deben hacer real esa jerarquía; el naming de la interfaz no basta.

### 2.2 Readback real, sólo SELECT

Recibos locales ignorados:

- `.captures/insights-sky-scope-2026-10-27/operating-accounts-readback.json`: Organization, Space, servicios y conteos del estado inicial.
- `.captures/sky-multi-account-discovery-2026-10-27/model-source-readback.json`: ampliación del 2026-10-27T15:18:19.621Z; source metadata, cohorte de proyectos, índices de clients y casos lifecycle. Sin tokens ni contenido de tareas.

| Objeto | Estado observado | Implicación |
|---|---|---|
| Organization | `org-b9977f96-f7ef-4afb-bb26-7355d78c981f` | Una identidad comercial existente |
| Space actual | `spc-ae463d9f-b404-438b-bd5c-bd117d45c3b9`, `EO-SPC-0011`, activo | Conservar su identidad e historia; no usarlo como plantilla destructiva |
| client actual | `hubspot-company-30825221458` | Es un ID técnico; no es el valor numérico de HubSpot Company |
| HubSpot Company | `30825221458` | Mantener un mismo owner comercial para los departamentos |
| Diseño | `SVC-HS-551519372424`, activo, pipeline activo | Ya existe servicio independiente |
| Blog SEO/AEO | `SVC-HS-591725750952`, activo, pipeline onboarding, mismo Space | No requiere crear un duplicado del servicio; requiere routing explícito |
| Otro servicio activo | `svc-7bec41af-0aa8-4bec-a5ea-be92a9d7bdeb`, Paid Social Care, piloto/onboarding | No descartarlo ni moverlo por heurística del nombre; su owner necesita decisión separada |
| Servicios legacy | Dos filas inactivas `legacy_seed_archived` | No reactivarlas durante el split |
| Proyectos | 123 activos, mismo Space/client, `module_id` nulo | El dato actual no prueba atribución individual a Diseño/SEO |
| Source de proyectos | Los 123 tienen `23039c2f-efe7-8116-8a83-000b758078f8` | Una sola fuente actual, no una partición por servicio |
| Service→Notion project | Los servicios relevantes no tienen `notion_project_id` | No hay asociación exacta utilizable para clasificar automáticamente esos proyectos |
| Casos lifecycle | Cero filas para SKY en la consulta | No hay caso observado que represente el alta SEO |

La fecha comercial de inicio observada de SEO es 2026-09-24; una fecha de operación planificada como 1 de noviembre no autoriza a reasignar automáticamente todos los proyectos posteriores ni a reescribir la fecha comercial. Deben coexistir fecha comercial, fecha de activación operativa y vigencia de bindings.

La fuente actual `sns-ae31c37d-d697-4092-af83-a55aab729765` está habilitada y vinculada sólo al Space existente: proyectos `23039c2f-efe7-8116-8a83-000b758078f8`, tareas `23039c2f-efe7-81f8-af2d-000b67594d18`, sprints `27c39c2f-efe7-8043-8a5d-000b16376e2c`; reviews/workspace nulos. `last_synced_at` observado: 2026-10-27T06:03:26.754Z. Este timestamp acredita actividad de la fuente, no completitud, calidad ni separación por servicio.

## 3. Decisiones de identidad que no se pueden esconder en el alta

| Alternativa | Beneficio | Trabajo indispensable / límite | Evaluación |
|---|---|---|---|
| Dos Organizations SKY | Aislamiento aparente inmediato para lectores por org | Duplica identidad comercial, contexto, conexiones, permisos y riesgo financiero; rompe la lectura del mismo cliente interno | Rechazada para este caso salvo evidencia de entidades/contrapartes realmente distintas y decisión comercial/legal explícita |
| Una org, dos Spaces, un client compartido | Conserva el canon actual de client financiero único; no crea otro perfil de cobro | Cada lector por client debe intersectar Space autorizado; session joins y resoluciones `LIMIT 1` no pueden seguir suponiendo un Space. Un `activeSpace` de UX solo no da seguridad | Viable con la unidad de Identity/Access y lectores corregidos **antes** del alta |
| Una org, dos Spaces, client técnico distinto por Space | Mantiene el puente client→Space unívoco en muchos lectores legacy y fuentes; reduce algunos cambios inmediatos de queries client-only | Nuevo comando de child client, rol explícito operativo vs financiero, un solo financial owner/profile, session principal único, branding/counters/reportes sin duplicación. Contradice el nacimiento financiero único actual si se implementa copiando el wizard | Viable como transición explícita si ADR/Identity/Finance definen el contrato; no usar `instantiateClientForParty` dos veces ni clonar Finance |
| Una org, un Space, dos servicios y sólo filtros de report | Menor cambio inicial de UI | No separa stakeholders, accesos, fuentes, readiness ni administración operativa. TASK-1960/report-per-service por sí solo no resuelve la frontera solicitada | Puede preparar informes, pero insuficiente para las dos cuentas operativas |
| Nueva entidad Account/engagement paralela | Nueva etiqueta parece encajar | Ya existen Organization/Space/services; crea identidad y lifecycle redundantes | No recomendada |

La selección del puente corresponde a la decisión transversal de Identity/Finance, con medición de consumidores afectados. Este anexo recomienda **no crear el nuevo Space mientras quede ambiguo el client bridge efectivo**. Sin embargo, sí se puede ejecutar antes la unidad de contrato Service→Space y preview de alta, porque son necesarios en ambas opciones.

Incluso dos clients técnicos con el mismo HubSpot Company no arreglan el routing por compañía: una Company tendrá dos clients/Spaces y la consulta seguirá ambigua. La separación de ese problema es independiente de la opción elegida.

Si existiera otra entidad legal de SKY con contratación/facturación distintas, se debe resolver su LegalEntity/commercial party y su relación organizacional con evidencia; no deducirlo del departamento, dominio de email o nombre del servicio.

## 4. Por qué un cambio manual se desharía

### 4.1 Los cuatro carriles comerciales no comparten un resolver operativo seguro

El intake documenta webhook asíncrono/síncrono, sweep y backfill que convergen por `hubspot_service_id`: `docs/architecture/GREENHOUSE_HUBSPOT_SERVICES_INTAKE_V1.md:138–149`. La UPSERT compartida evita duplicar el servicio, pero no preserva el destino correcto:

| Carril | Resolución actual | Falla al haber dos Spaces |
|---|---|---|
| Sweep/cron | `src/lib/services/service-sync.ts:111–137`; compañía→org/clients→Space con `LIMIT 1` | Elige uno sin identidad del servicio; `198–240` reutiliza ese mismo Space para todos los servicios de la compañía |
| Proyección asíncrona webhook | `src/lib/sync/projections/hubspot-services-intake.ts:54–60,220–244` | JOIN client→Space `LIMIT 1`; vuelve a aportar el destino incorrecto |
| Handler síncrono/standalone | `src/lib/webhooks/handlers/hubspot-services.ts:145–165` | Misma selección por compañía, no por binding del servicio |
| Backfill manual | `scripts/services/backfill-from-hubspot.ts:69–86,203–223` | Resuelve un Space por client y aplica todos los servicios; `--apply` no equivale a un plan de reasignación revisable |

`src/lib/services/upsert-service-from-hubspot.ts:144–148` actualiza `space_id`, `organization_id` y `hubspot_company_id` en cada conflicto. Por eso mover SEO manualmente no es estable. El helper necesita recibir/validar un binding resuelto por el dueño operativo, no confiar en cualquier Space que el adaptador encontró primero.

También hay un error de namespace a corregir en la misma frontera: `service-sync.ts:173–175` y el backfill `148–160` envían `hubspotCompanyId: space.client_id`. En SKY esto puede transportar `hubspot-company-30825221458` donde se espera `30825221458`. El contrato debe distinguir IDs externos de IDs de puente, sin hacer parsing implícito del prefijo.

### 4.2 Autoridad y retención propuestas

Reglas del resolver único propuesto, nombre ilustrativo `resolveServiceOperatingScope`:

1. Resolver identidad por `hubspot_service_id` exacto; no por nombre, línea, modalidad o orden de consulta.
2. Para servicio existente con binding Greenhouse válido, conservar el Space durante el refresh de campos comerciales. Validar que Space y servicio pertenecen a la misma Organization esperada.
3. Para servicio nuevo, usar binding explícito revisado o una política de bootstrap que sólo admita un candidato inequívoco. Con dos candidatos, devolver `operating_scope_unresolved`; no elegir primero, oldest, default o el que tenga más proyectos.
4. Una asociación HubSpot Company que cambia de Organization constituye conflicto de ownership. No conservar un destino extranjero ni reparentar automáticamente historia. Registrar una propuesta de traslado para resolución autorizada.
5. Los campos comerciales siguen refrescándose desde HubSpot según contrato, pero el routing local no se borra porque HubSpot no lo incluya. Un futuro `ef_space_id` sólo sería autoritativo tras contrato explícito; su presencia hoy no debe ampliar permisos.
6. Actualizar versión/etiqueta comercial no cambia el binding operativo. Un traslado de servicio es otro comando, con `expectedCurrentSpaceId` y versión, actor, razón y vigencia.
7. Mantener el manejo de echo: la proyección `hubspot-services-intake.ts:160–194` reconoce `ef_greenhouse_service_id`, vincula el ID externo y evita duplicar el servicio. El nuevo resolver debe respetar ese caso y verificar que el echo no introduzca ownership ajeno.
8. Errores por servicio tienen recibo individual reintentable. El consumer actual sólo lanza si fallan todos (`257–265`); un lote parcialmente correcto no debe ocultar un servicio ambiguo como sincronización completa.

La vieja intención de refrescar `space_id` al cambiar la asociación de compañía no se elimina sin reemplazo: debe transformarse en reparenting gobernado. Congelar para siempre cualquier valor existente también conservaría datos incorrectos.

### 4.3 Matriz de ownership de campos

Esta matriz distingue comportamiento actual de la separación propuesta. No supone que todos los NULL externos tengan la misma semántica.

| Campo/grupo | Autoridad actual y a conservar | Regla propuesta frente a sync/replay |
|---|---|---|
| `service_id`, `hubspot_service_id` | Identidad local estable + external key UNIQUE; echo local reconocido | No regenerar/cambiar por traslado de Space; impedir que un external ID tome un servicio ajeno |
| Company/Deal externos (`hubspot_company_id`, `hubspot_deal_id`) | Asociaciones HubSpot, re-fetch canónico | Refrescar asociación comprobada; cambio de Company entre owners abre conflicto, no cambia automáticamente org/Space/historia |
| `name`, línea, servicio específico, modalidad, país, billing frequency | Campos comerciales del intake HubSpot | Se actualizan por el mapper/normalizador vigente; no convertirlos en heurística de routing |
| `pipeline_stage`, `status`, `active` del **servicio** | Mapper canónico de lifecycle HubSpot | Preservar unknown→unmapped y controles actuales; el `active` del servicio no activa por sí solo Space, fuente, usuario ni Organization |
| `engagement_kind` | Cascade actual con provenance | HubSpot válido gana; NULL preserva PG existente; valor inválido no pisa PG y marca clasificación pendiente (`src/lib/services/engagement-kind-cascade.ts:73–112`). No reemplazar esta excepción por “todo HubSpot gana” |
| `start_date`, `target_end_date`, costos, pagos, moneda | Intake comercial HubSpot con normalización vigente | No reescribir al día de corte operativo ni usar fechas para atribuir proyectos; cambios comerciales no migran ownership |
| `notion_project_id` del servicio | Hoy refrescado por UPSERT inbound (`upsert-service-from-hubspot.ts:164`) | Mantenerlo como puntero comercial/source según contrato; no autorizar fuente/Space ni reemplazar nueva relación Project↔Service. Validar consistencia y registrar conflicto si apunta a proyecto de otro Space |
| `organization_id`, `space_id` operativos del servicio | Hoy derivados del lookup por Company y reescritos: es la brecha | Greenhouse owner explícito con expected version; la ausencia/NULL en provider no borra binding. Cambio sólo por comando de vinculación/traslado |
| Space nombre/tipo/readiness/activo | Greenhouse Client Portal | Sin override por renovación del servicio o nombre en HubSpot; lifecycle operativo independiente |
| SourceDBs/secret ref/sync flag | Greenhouse Integrations + aprobación del owner de Space | Se retienen en refresh comercial; rebind/rotación/enable son operaciones distintas y versionadas |
| Project/Task Space/client/source | Delivery/source binding canónico | Ingestión valida owner de origen y no reparenta por último registro procesado; un traslado explícito conserva provenance histórica |
| `hubspot_last_synced_at`, sync status | Telemetría del adaptador | Registrar intento/resultado por servicio, incluyendo conflicto; timestamp fresco no acredita routing correcto |

### 4.4 Atomicidad real, no nominal

La UPSERT se ejecuta por el pool (`upsert-service-from-hubspot.ts:263–288`) y después publica eventos sin pasar un cliente de transacción (`295–315,333–352`). `src/lib/postgres/client.ts:409–415` ejecuta `pool.query`; `src/lib/sync/publish-event.ts:35–44` requiere cliente explícito para compartir transacción. El requisito es una misma transacción para binding/version + servicio + audit + outbox, no sólo que ambos usen PostgreSQL.

La unidad propuesta debe impedir estado modificado sin evento y evento con binding no confirmado, además de deduplicar replay. El evento conserva source/binding version y owner efectivos al ocurrir; un consumidor no puede reemplazarlos sin más por el routing actual para reatribuir hechos históricos. Reread verifica legitimidad/version y estado operativo, con política explícita de replay, no convierte “latest” en dueño retroactivo. No hace falta reescribir todo el subsistema de sync para conseguir esa transacción en la frontera afectada.

## 5. Alta y lifecycle: el wizard actual es peligroso para este caso

`src/lib/client-lifecycle/commands/provision-client-from-wizard.ts:250–267` declara “un Cliente = un Space”, busca el más antiguo por client y reutiliza su ID. Luego escribe Notion intent en ese Space (`303–307`) y Teams anchor (`310–324`). Usarlo para “añadir la cuenta SEO” puede modificar las fuentes/canales del Space de Diseño.

El nacimiento financiero también está acoplado: `instantiate-client-for-party.ts:88–94` rechaza otra clientización de la misma Organization, y `148–168` inserta `greenhouse_finance.client_profiles`. Capturar esa excepción o inventar otro org para pasar el guard sería incorrecto.

Hace falta un comando de **alta de Space operativo de Organization existente**. Según el puente elegido, recibe el client financiero existente o invoca una primitive nueva de child client operativo con `financialOwnerClientId`/relación equivalente validada. La elección del almacenamiento requiere ADR; no se propone una columna como si ya estuviera disponible. El nuevo comando:

- No promueve otra vez el lifecycle comercial ni crea otro perfil Finance.
- No busca `oldest Space`; trabaja sobre ID nuevo reservado/determinista por operationId y deja el Space existente como exclusión protegida.
- Vincula sólo servicios enumerados por ID, con expectativa de origen; no todos los de la compañía.
- Crea fuentes/canales/configuración como recursos de ese Space, sin compartir mutablemente la configuración de Diseño.
- Deja el nuevo Space en estado de preparación y sync deshabilitado hasta superar sus gates; “creado” no es “operando”.
- Registra caso/checklist de alta **por Space/servicio**, separado del caso de clientización inicial. El contrato actual de `provision-client-lifecycle.ts:73–103` devuelve un caso activo por `(organization, kind)`; no puede representar dos onboardings simultáneos con distintos responsables sin extensión.
- Conserva los servicios inactivos y el piloto observado, sin activar/desactivar por pertenecer a SKY.

Superficies localizadas: `/api/agency/spaces` y `/api/agency/spaces/[id]` sólo exportan GET (`src/app/api/agency/spaces/route.ts:8–17`, `[id]/route.ts:8–25`). La puerta POST existente es `/api/admin/clients/lifecycle/provision`, documentada como clientización org+Finance+caso (`src/app/api/admin/clients/lifecycle/provision/route.ts:17–23`), no una ruta child-Space independiente. En el inventario leído no se encontró capability canónica de alta de segundo Space con plan/CAS/paridad; se propone crearla, no simularla llamando al wizard antiguo.

**No insertar todavía el segundo Space, ni siquiera inactivo, antes de U1 y de auditar los lectores con supuesto de un Space.** El lookup `service-sync.ts:117–121` no filtra `active`, de modo que una fila inactiva ya puede cambiar el resultado de `LIMIT 1`. Inactivo es un estado del nuevo flujo, no una barrera para escritores legacy. Tras corregir esos carriles, el estadio preparado debe ser **inactivo para operación/selección y con sync FALSE**, representado con campos/estado que el schema y lectores admitan, hasta completar los gates. No se prescribe un enum `prepared` sin verificar CHECKs. “Space SEO registrado pero inactivo” y “wizard legacy bloqueado para reutilizar fuentes de Diseño” son condiciones simultáneas: dejarlo inactivo no corrige por sí solo el wizard. El Teams group-chat route hoy exige exactamente un Space activo por client/org y puede responder `space_ambiguous` (`src/app/api/admin/clients/[organizationId]/lifecycle/teams/chat/route.ts:43–58`); debe recibir target explícito para el child onboarding, sin fallback.

La cancelación de un engagement actualmente produce una notificación administrativa y seguimiento manual, no un offboarding global automático: `src/lib/sync/projections/engagement-cancelled.ts:38–88`. El lifecycle propuesto debe cerrar sólo SEO y sus recursos exclusivos. Organization/Design y fuentes compartidas necesarias no se desactivan; distinguir pausa del servicio, cierre del Space, retiro de permiso, cierre comercial y churn de Organization.

## 6. Notion: fuente, token y proyecto requieren identidades independientes

### 6.1 El source actual no se puede duplicar en otro Space

El esquema de fuentes tiene una configuración por Space: `scripts/setup-postgres-space-notion-sources.sql:23–47`; el reader exacto por Space es correcto (`src/lib/space-notion/space-notion-store.ts:22–29`). En cambio, la búsqueda por client devuelve sólo una (`33–45`), y governance usa el Space activo más antiguo (`src/lib/space-notion/notion-governance.ts:831–846`). Todos los comandos multicuenta deben recibir Space explícito y comprobar Organization/autorización; no heredar esos fallbacks.

La normalización de Notion propaga Space/client desde la fuente (`src/lib/sync/sync-notion-conformed.ts:1162–1215`), pero mapas de proyecto usan sólo `project_source_id` (`1231–1239`). El proyector activo hace conflicto por Notion ID y **reescribe** ownership: `src/lib/sync/project-notion-delivery-to-postgres.ts:295–299` en proyectos y `476–487` en tareas. Por ello, registrar la misma DB/página como dos fuentes operativas no genera copias independientes; puede reatribuir la historia según el orden de procesamiento.

Opciones legítimas para SEO, a decidir tras inspeccionar la topología editorial real:

- DBs de ejecución distintas, con un único owner operativo cada una; es la ruta más clara cuando los departamentos ya producen separadamente.
- Si comparten DB física, un contrato de partición por propiedad/relation estable, exhaustiva, sin solapamientos y validado antes de ingesta. El runtime actual no demuestra ese routing por fila; configurarlo como si ya existiera es inseguro.
- Un Content Hub editorial puede ser fuente de producción/aprobaciones sin obligarlo a simular proyectos/tareas/sprints. Si la fuente no cumple el schema de delivery, declarar su rol editorial y no prometer indicadores ICO por importar cualquier DB.

No se consultó ni cambió contenido vivo de Notion en este subdiscovery. Tener IDs configurados no acredita que el servicio SEO tenga ya una fuente compatible.

### 6.2 Token y schema: configuración existente no significa rollout completo

`src/lib/client-onboarding/notion-connect-store.ts:89–117` valida visibilidad de DBs con el token y crea una versión en un secreto derivado sólo de `clientSlug`. Reutilizar slug `sky` con otro token puede rotar un secreto que usa Diseño. El alta debe reservar secret identity de Space/source (o un credential compartido expresamente de Organization) y registrar consumidores antes de rotar; nunca poner token en plan, audit, hash o receipt.

El formulario exige tres DBs, incluido sprints (`95–96`), aunque el reader/pipeline admite sprints opcional. No crear una DB ficticia para satisfacer el wizard. Validar rol de fuente, schema fingerprint, property IDs y recursos visibles; adaptar el contrato al workflow real.

`writeSpaceNotionSourcesFromIntent` crea con sync FALSE, pero su `ON CONFLICT(space_id)` reemplaza DBs y secret ref (`170–193`) sin forzar FALSE en una fuente existente. Para el nuevo Space se exige inserción nueva; un rebind de source existente requiere preview propio, control de versión y pausa/rehidratación verificables. El SAVEPOINT (`197–210`) permite continuar el alta si falla la fuente: ese resultado debe ser estado incompleto, no éxito operativo.

`src/lib/ico-engine/enable-client-ico-sync.ts:105–118` todavía permite seleccionar oldest Space por client; con dos Spaces el comando debe exigir el exacto. Su flag+outbox sí comparte transacción (`143–181`), patrón útil a conservar.

### 6.3 Proyección BQ y robot externo: dos brechas concretas

1. `src/lib/sync/projections/space-notion-source-ico-sync-bq.ts:60–68` lee configuración PG correcta, pero el MERGE `84–106` hace MATCH por Space y actualiza sólo sync_enabled/updated_at. Reconfigurar DB/client no se propaga íntegramente a una fila existente. El comando de rebind debe tener evento/proyección versionada adecuada y comprobar readback de todos los IDs, no sólo del flag.
2. En el repo hermano, código local `/Users/jreye/Documents/notion-bigquery/main.py:189–205` carga BQ sin secret ref; `259–305` carga además PG para fuentes con secret ref y flag ON. `308–316` concatena listas **sin deduplicar por Space/source**. Si el nuevo Space aparece en ambos registros, puede correrse dos veces: el registro BQ usa token global y el registro PG usa token específico (`243–255`). El merge debe ser determinista, una configuración efectiva por Space/source, PG con autoridad explicitada y conflictos rechazados. No basta activar el flag.

El código hermano ya soporta token por Space, flag default OFF (`82–94`) y salto de ese Space si falla la resolución del secreto (`1952–1969`), conservando los otros. Eso es capacidad local comprobada, **no prueba de revisión desplegada ni de flag productivo**. Su carga PG fallida degrada a legacy (`303–305`); para la cuenta SEO se necesita readiness source-specific, para que la salud general de Diseño no oculte SEO ausente. El POST exige todavía NOTION_TOKEN global (`1914–1916`); no inferir independencia completa del credential legacy.

### 6.4 Eventos y writeback no siguen automáticamente el nuevo registry

Greenhouse conserva un registry productivo fijo Efeonce/SKY con sólo dos data source IDs (`src/lib/notion-metrics/notion-productive-workspaces.ts:23–54`). Los consumers de status y due date lo usan (`src/lib/sync/projections/notion-status-transition-capture.ts:202`, `notion-due-date-change-capture.ts:286`); una nueva Tasks DB SEO no entra sólo por crear Space/source. Además `fetchPageStatus` usa NOTION_TOKEN global (`src/lib/space-notion/notion-client.ts:148–169`).

La ampliación debe resolver dataSource→source→Space/credential autorizado, manteniendo demo fuera, re-fetch, HMAC, allowlist y echo prevention. No añadir simplemente otro alias 'sky' si después los eventos pierden el Space. El polling podría funcionar y el histórico de transiciones quedar incompleto: verificar ambos carriles por separado. Los consumidores de writeback/readers deben usar el mismo binding efectivo; un token configurado para ingestión no prueba que todos lo usen.

## 7. Contrato de datos propuesto, dueño y límites

Los nombres nuevos siguientes son ilustrativos; no son tablas/columnas existentes ni DDL aprobado.

| Hecho | Lugar/identidad propuestos | Dueño / regla |
|---|---|---|
| Cliente comercial SKY | Organization + commercial_party_id existentes | Commercial Party; identidad única y lifecycle comercial |
| Facturación | Perfil/owner financiero canónico existente | Finance; no duplicarlo por departamento |
| Unidad operativa | Space existente Diseño + nuevo SEO | Client Portal/Organization; identidad durable independiente de renovación de servicio |
| Puente legacy | client compartido + memberships, o child client operativo con financial owner | Identity + Finance, decisión previa al alta; no otro business Account |
| Compromiso comercial | services(service_id), hubspot_service_id UNIQUE, engagement_kind/términos | HubSpot para los campos de intake; Greenhouse conserva excepciones locales gobernadas |
| Destino actual de servicio | services.space_id validado por owner operativo | Greenhouse; ningún adapter puede sobrescribirlo por lookup de compañía |
| Provenance/vigencia del destino | Binding history/version (tabla de dominio o extensión explícita) | Service/Space owner; actor, origin, reason, expected previous, effectiveFrom/To; eventos append-only |
| Proyecto operativo | projects + notion_project_id + sourceDB únicos efectivos | Delivery; mantener Space histórico, reparent sólo por comando explícito |
| Project↔Service | Asociación separada con primario/vigencia/evidencia, no module_id | Delivery/Engagement; un service tiene muchos proyectos; no inferir por fecha/nombre |
| Tipo de módulo | service_modules/module_id | Catálogo de composición; NO service_id de una contratación |
| Source Notion | space_notion_sources + versión/rol/ownership | Integrations/Space; un owner operativo efectivo por DB/página salvo partición probada |
| Credential | Secret Manager ref, consumidores/versión efectiva | Security/Integrations; sin valor secreto en receipts; rotación no borra bindings |
| Operación de alta | Provisioning operation/plan + lifecycle case scoped | Client Lifecycle; plan inmutable, idem, fases y receipt por efecto |
| Identidad fuente externa | HubSpot numeric Company/service IDs y Notion database/dataSource/page IDs separados | Adapter específico; nunca extraer unos del ID técnico de otro |
| Informe blog | Request/bindings sellados GA4+GSC+AEO, report scope separado de delivery | Owners de cada fuente + Insights; no derivar filtro analítico de service_modules |

`projects.module_id` y `tasks.module_id` referencian `service_modules(module_id)`, no `services(service_id)` (`scripts/setup-postgres-source-sync.sql:130–134,181–187`; FK corroborada también por el subdiscovery de datos). **No escribir `SVC-HS-591725750952` en module_id**. El tipo/oferta del catálogo y la instancia comercial deben permanecer distintos. Tampoco `services.notion_project_id`, un puntero singular y nulo hoy, reemplaza por sí solo la relación de muchos proyectos y su historia de vigencia.

El binding actual puede seguir en services.space_id para no crear dos fuentes de verdad: history registra sus cambios y el resolver lee una única autoridad vigente. Si se escoge tabla de bindings como autoridad, el campo existente pasa a proyección con reconciliación explícita; no permitir dos writers independientes.

## 8. Comando, preview, auditoría y recuperación

### 8.1 Preview revisable

Entradas mínimas: Organization exacta, intención de nuevo Space, alternativa de client bridge decidida, IDs de servicios que se vinculan, versiones/orígenes esperados, configuración de fuentes por rol sin token, actor y motivo. Resolver permisos en servidor; los IDs enviados intersectan acceso, nunca lo amplían.

El preview debe devolver:

- Estado actual y cambios propuestos con IDs; exclusiones explícitas de Space/source/client financieros de Diseño.
- Conflictos de compañía/org, memberships, sourceDB repetida, child lifecycle, servicio con ownership diferente, estado comercial incompatible y schema no soportado.
- IDs reservados/operación, fingerprint de inventario y versiones que condicionan apply; slots de secretos pendientes con metadatos, sin secreto.
- Recursos internos que pueden confirmarse en una transacción frente a efectos externos que seguirán en fases.
- Qué queda no listo: access, credential, ingestion, status history, índices analíticos, GA4/GSC/AEO, pruebas de delivery; cada gate con owner y evidencia.

Existe un patrón útil de ejecución atómica y fingerprint, no una capability de provisioning ya disponible: `src/lib/client-portal/enablement/commands.ts:53–114` autoriza, bloquea Organization, valida stale plan y preserva recibo idempotente. Reusar infraestructura apropiada, sin llamar “alta segura” al enablement de módulos.

### 8.2 Apply y replay

1. Autorizar nuevamente contra el target; localizar operation/idempotency key antes de generar IDs o leer “latest” para decidir otro destino.
2. Misma key + misma intención devuelve el receipt/operación original aunque inventario externo haya cambiado; no crea otro Space ni rota otro secreto. Misma key + intención diferente, conflicto.
3. Nueva key con preview viejo falla por fingerprint/version; no autoelige un Space alternativo. Mostrar el conflicto permite preparar otro preview.
4. Bloquear Organization y recursos afectados en orden estable; verificar política de bridge, servicios, source uniqueness, acceso y expected versions.
5. En una tx PG: nuevo Space/puente permitido, bindings de servicios, metadata de fuente deshabilitada, child case/checklist, audit y outbox. No crear Finance profile adicional ni promover Organization por segunda vez.
6. Efectos externos con operation steps durables y dedupe por recurso/version. No se puede prometer atomicidad distribuida entre PG, Secret Manager, Notion y BQ. Si se provisiona secreto antes del commit, registrar ownership y limpieza segura del huérfano; no rotar un secreto preexistente compartido.
7. Consumidores reread por ID+versión y rechazan eventos antiguos que intentarían reinstalar binding previo. El receipt informa `prepared`, `registered`, `projected`, `verified`, `enabled` de cada paso, no un booleano global engañoso.
8. Recovery sólo reanuda pasos faltantes de la misma operación. No recalcula por Company→first Space, no usa wizard, no backfill general y no reenvía notificaciones por cada replay.

Rollback de binding es un comando compare-and-swap: sólo restaura si la versión/current value siguen siendo los escritos por esa operación y no hay dependencias nuevas incompatibles. Si otro operador cambió routing/fuente o ya entraron nuevos datos, deja conflicto revisable; nunca `UPDATE ... SET` desde snapshot completo que pise cambios comerciales posteriores. Conserva el evento original y añade evento compensatorio con versión siguiente, actor y motivo; no borra audit/outbox. Restaurar routing no traslada automáticamente proyectos ya materializados ni rota de vuelta un secreto compartido; cada efecto requiere su compensación segura y evidencia.

Auditoría mínima: actor/principal real, Organization/Space/service IDs, versión previa/nueva, fuente de autoridad, operación/causation/correlation ID, motivo, timestamp, resultado y cambios redactados. No payload completo del proveedor, personas, token o billing sensible en el receipt compartible.

### 8.3 Paridad

Debe existir una sola capability canónica para preview/apply/read-status/recover y traslado/rebind explícito; UI, API interna/ecosystem, CLI y MCP la llaman o declaran una exclusión con razón según el canon de paridad. El manifest actual sí incluye enablement y búsqueda de servicios (`src/mcp/greenhouse/tool-manifest.ts:74–78,186`), lo que no demuestra que exista alta de Space multicuenta.

El wizard actual puede conservarse para primera clientización, pero debe rechazar o redirigir claramente la intención de “nuevo Space de cliente existente” antes de tocar sources. Las APIs de create/update/deactivate servicio no deben proporcionar una vía lateral para eludir el binding owner y las expectativas de versión. La validación tiene que estar en dominio, no sólo en formulario/MCP.

## 9. Unidad incremental y rollout

### U0 — Decisiones load-bearing y contrato

Acordar client bridge con Identity/Finance; autoridad Service→Space; relación Project↔Service; rol/fuente editorial de SEO; unicidad/partición de fuentes; y alcance de child lifecycle. Proponer ADR(s) proporcionales antes de schema/shared access changes. No hace falta un nuevo modelo de negocio ni bloquear por toda la evolución de report-per-service.

### U1 — Retención de routing en los cuatro escritores

Introducir resolver/guards/provenance y transacción correcta, con SKY aún en su Space actual. Todas las entradas usan la misma decisión. Mantener compatibilidad one-Space controlada; organizaciones ambiguas no se enrutan por `LIMIT 1`. Certificar echo, cambios de Company, idempotencia y recuperación. Esta unidad reduce riesgo antes de crear otro Space.

### U2 — Lectores, identity bridge y plan de alta

Aplicar la opción de puente elegida y los gates de acceso/lectura, con regresiones de sesiones y agregaciones. Crear capacidad de preview y child provisioning, sin ejecutar la operación real todavía. Ensayar con fixtures/sintético autorizado; no convertir un preview en estado vivo.

### U3 — Fuente SEO y cross-runtime

Confirmar topología Notion con responsables, token/permisos, schema y métricas que realmente soporta; corregir binding propagation BQ y merge determinista del robot. Resolver webhook registry/token. No forzar que SEO use la DB histórica de Diseño. Una fuente editorial sin delivery schema puede seguir siendo válida para producción, con ICO explícitamente no aplicable hasta contrato propio.

### U4 — Alta controlada y verificación real

Tras autorización de implementación/operación separada del discovery, aplicar el plan con Space SEO preparado, vincular el servicio exacto y dejar ingestion sin activar. Leer PG/eventos/proyecciones, validar accesos y ausencia de cambios en Diseño. Habilitar sólo el source SEO explícito cuando sus gates pasen; no sincronizar toda la organización para probarlo. Una corrida de sync o AEO real no está autorizada por este documento.

### U5 — Primer ciclo y readiness

Probar replay de webhook y cron/sweep/backfill dry-run; verificar persistencia de service binding tras sincronización. Si hay delivery SEO, comprobar proyectos/tareas/transiciones por su fuente; si no lo hay, reportar esa limitación. Verificar obligatoriamente GA4, GSC y hechos de corridas AEO del blog en el flujo de Insights antes del informe requerido. El cierre del alta exige evidencia por Space y fuente, además de regresión de Diseño.

Rollout multiproceso: versión compatible primero en Vercel y workers que escriben servicios/fuentes, incluyendo el robot hermano donde aplique; después habilitar bindings nuevos. Un worker viejo que sigue haciendo Company→first Space puede deshacer el split. No afirmar rollback arbitrario seguro: después del segundo Space, volver a ese binario requiere pausar esos escritores/operaciones o conservar guards compatibles. El rollback de datos es compensación dirigida con historial, no borrar Space ni mover en masa los proyectos.

## 10. Criterios de aceptación y pruebas concretas

Los siguientes son propuestos, no ejecutados en este discovery.

| # | Caso | Resultado exigido |
|---|---|---|
| 1 | Organization SKY con dos departamentos | Sigue existiendo una identidad/commercial_party; no otra Company por departamento |
| 2 | Preview de alta SEO | IDs y exclusiones legibles; cero mutaciones/secret rotation |
| 3 | Wizard antiguo recibe intención de segundo Space | Rechaza/redirige antes de cambiar Notion/Teams del Space existente |
| 4 | Apply a partir de fingerprint stale | Conflicto sin crear recursos ni reinterpretar destino |
| 5 | Retry misma key/intención tras cambio de inventario | Misma operation/Space/receipt, sin duplicado ni secreto adicional |
| 6 | Misma key con servicio/destino distintos | Conflicto idempotente |
| 7 | Dos applies concurrentes para el mismo alta/binding | Un ganador o recibo compartido; no Spaces/client bridges duplicados |
| 8 | Sweep HubSpot tras vincular SEO a nuevo Space | Diseño conserva su Space; SEO conserva el suyo; campos comerciales se refrescan |
| 9 | Webhook async, sync y standalone | Todos obtienen mismo binding exacto; ninguno usa primero/oldest |
| 10 | Backfill dry-run/apply acotado | Mismo plan de routing; dry-run escribe cero; apply no remapea todos los servicios por compañía |
| 11 | Servicio nuevo con Company de dos Spaces sin binding | `operating_scope_unresolved`, recibo pendiente; no destino arbitrario |
| 12 | Company reassociation real a otra org | Conflicto de ownership/reparenting, sin mover datos ni ampliar permisos |
| 13 | Echo `ef_greenhouse_service_id` | No duplica servicio y no altera destino local válido |
| 14 | HubSpot numeric ID y client técnico | Persistidos/validados en namespaces correctos; `hubspot-company-*` no aceptado como ID externo |
| 15 | Refresh comercial sin campo de routing | Preserva binding local/provenance; no clear implícito |
| 16 | Tx falla antes de commit | Servicio/binding/audit/outbox no quedan parciales; retry correcto |
| 17 | Lote con un servicio ambiguo y otro correcto | Correcto progresa; ambiguo queda visible/reintentable, no lote falsamente completo |
| 18 | Fuente Notion repetida entre dos Spaces | Bloqueada antes de activar salvo partición explícita validada; no reatribución por orden |
| 19 | Source rebind sobre Space de Diseño desde alta SEO | Rechazado por expected-new-source/ownership; DBs y secretRef de Diseño intactos |
| 20 | Nuevo source con sprint no aplicable | Contrato permite rol válido sin DB ficticia; readiness diferencia editorial/delivery |
| 21 | Token SEO inválido/no visible | Gate de SEO falla; no fallback al token de otro Space; Diseño sigue operando |
| 22 | Reusar slug/secreto de Diseño con token SEO | Detectado como rotación compartida; no se cambia silenciosamente |
| 23 | Mismo Space cargado desde PG y BQ del robot | Una configuración efectiva; nunca primer pase con global token y segundo scoped |
| 24 | Reconfiguración de DB/source version | Readback BQ refleja IDs y versión correctos, no sólo sync flag |
| 25 | Worker/evento atrasado del binding anterior | No revierte Space/service/source ni activa configuración obsoleta |
| 26 | Nueva Tasks DB SEO | Polling y status/due events resuelven su Space/token; demo sigue excluido |
| 27 | Project↔Service | Relación exacta por ID/vigencia; no SVC en module_id ni atribución por nombre/fecha |
| 28 | Regresión de historia Diseño | Mismos IDs, Space/client efectivos y source de los 123 proyectos, salvo traslados individuales explícitos; conteos/métricas baseline reproducibles |
| 29 | Nuevo client técnico si se elige esa opción | Sin duplicate Finance profile/commercial identity; readers/counters no doblan SKY; session identity no se duplica |
| 30 | Shared client si se elige esa opción | Queries client-only y session joins no mezclan Spaces; permisos se intersectan y no dependen sólo del selector UI |
| 31 | Cancelar/pausar SEO | Sólo su engagement/acceso/source exclusivo afectado; Diseño/Organization/financial owner permanecen correctos |
| 32 | API/MCP/CLI intentan saltar preview o usar Space ajeno | Mismos guards de dominio, no vía lateral; audit de principal real |
| 33 | Salud general robot verde pero fuente SEO omitida | SEO permanece no listo con causa; no inferir cobertura del éxito de Diseño |
| 34 | Primer informe Blog/SEO/AEO | GA4+GSC+aeo_engine presentes y vinculados al scope blog; allowPartial no acredita listo si falta uno |
| 35 | Rollback a writer viejo con dos Spaces | Gate operativo bloquea/promueve versión compatible; no resurrección de Company→first Space |

Validación recomendada: tests de resolver puros, integración PG con rollback/concurrencia, contract tests de los cuatro adaptadores, fixture cross-runtime PG/BQ duplicate, y readbacks acotados de las fuentes activadas. No añadir pruebas que sólo repitan la implementación; estos casos comprueban invariantes y fallos que hoy serían silenciosos.

## 11. Riesgos, decisiones pendientes y fuentes de deriva

| Riesgo / decisión | Dueño | Cierre necesario |
|---|---|---|
| Shared client vs child client operativo | Identity/Finance/Client Portal | ADR con alternativa elegida, principal único, financial owner y consumers/client counters verificados |
| Routing local vs asociación comercial externa | Services/HubSpot bridge | Resolver y reparent command en todos los escritores; ningún fallback ambiguo |
| SourceDB compartida/páginas repetidas | Delivery/Notion | Owner único o partición probada antes de ingesta |
| Alta por org colisiona con alta por Space | Client Lifecycle | Child case scoped sin reutilizar caso/recursos de clientización inicial |
| Robot externo local vs revisión productiva | Integrations/Ops | Revision/flag/config readback, dedupe de registry y prueba source-specific |
| BQ sólo actualiza sync flag | Sync projections | Propagación versionada y readback completo del binding |
| Nuevos eventos SEO omitidos | Notion metrics/Delivery | Registry/token por source/Space; polling no suple retrospectivamente eventos perdidos sin método explícito |
| Historia del Space actual sin engagement | Delivery/Data | Mantener baseline; no hacer atribución masiva por fechas; plan individual si realmente se requiere |
| Piloto adicional SKY | Owner comercial/operativo | Clasificar explícitamente; no arrastrarlo con la decisión SEO |
| Readiness de Insights vs delivery | Growth/Insights | Tres fuentes obligatorias y scopes sellados; no equiparar ICO con SEO/AEO |
| Drift documental | Arquitectura/Docs | Actualizar canon dueño tras decisión, no convertir este anexo en SSOT permanente |

Datos pendientes que este readback no acredita: decisión client bridge y sus consumidores completos; roster/roles exactos de stakeholders; owner y clasificación del piloto; topología real de DBs/páginas editoriales SEO; relación proyecto↔engagement por evidencia; credenciales/consumidores que comparten secreto; revisión y flags desplegados del robot y workers; capacidad del schema para estado operativo preparado/inactivo; recursos Teams/SharePoint que deban ser propios o compartidos; fecha operativa aceptada. Ninguno se rellena por nombre o por elegir la primera fila. La falta de esos datos no impide desarrollar el resolver seguro/preview, pero bloquea el apply real dependiente.

Hay contradicciones que deben resolverse al implementar: el canon admite Space child mientras el wizard comenta un client=un Space; docs de intake describen convergencia idempotente pero no preservación de routing; comentarios de provisioning dicen esperar soporte perSpace mientras el repo hermano ya lo contiene gated; los registries BQ/PG no se fusionan con precedencia. Arquitectura vigente + código/schema/runtime verificados prevalecen; no copiar comentarios antiguos como evidencia de rollout.

Este documento aporta el contrato y los puntos de corte para planificar unidades formales. No marca criterios como cumplidos, no aprueba ADR y no habilita escrituras operativas.
