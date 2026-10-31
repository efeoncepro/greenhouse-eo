# SKY · Identidad, acceso y contexto de dos cuentas operativas

Fecha: 2026-10-27. Estado: discovery técnico, con alternativas y propuesta; no ADR Accepted, código ni rollout.
Subagente: `url_scope_contract`, frente Identity/Access/Session del discovery integral.

## 1. Dictamen y alcance

Se conserva **una Organization SKY, una identidad longitudinal por persona y la historia de Diseño**. Dos Spaces
representan las cuentas operativas: Diseño histórico y Blog SEO/AEO. El acceso a una cuenta no se deriva de pertenecer
a SKY, del correo de la persona ni de que la organización tenga contratado el módulo.

La recomendación es una transición con **un puente `client` operativo por Space**, si se establece previamente su
relación explícita con el único cliente comercial/financiero existente. Es una adaptación del registro legacy que ya
usan múltiples consumers, no una segunda empresa, Account de negocio o principal de autenticación. Esta opción reduce
el riesgo de que readers todavía filtrados sólo por `clientId` mezclen los datos de Diseño y SEO. Sigue necesitando
contexto activo autorizado para personas con ambas cuentas y scope en los consumers organizacionales.

La opción de un único `clientId` compartido y contexto Space explícito es semánticamente limpia, pero exige convertir
todos los consumers críticos que hoy usan client como frontera antes de abrir SEO. Es una alternativa real, no descartada:
si el inventario final demuestra que esa conversión es más acotada que separar client operativo y comercial, debe
reconsiderarse la elección. **No hay una alternativa segura de sólo crear otra fila Space o sólo separar dos informes.**

Los tres frentes de medición del primer informe SEO —GA4, GSC y corridas del motor AEO— permanecen obligatorios.
El aislamiento de stakeholders es un contrato de autorización adicional; un filtro correcto de URLs no lo demuestra.
No exige nuevo issuer OAuth, cambios en flags de Auth/Rooms, duplicar la Company de HubSpot o trasladar la historia.

## 2. Fuentes y método

Se releen el preflight `project_context.md`/`Handoff.md`, skills `software-architect-2026` y el router de `efeonce-auth`
para conservar fronteras de principal/issuer, invariantes `IDENTITY_WORKFORCE_AGENT_INVARIANTS.md` y
`ORG_CLIENT_AGENT_INVARIANTS.md`, y la nota antecedente
[06: cuentas operativas bajo una Organization](../../insights/2026-10-27-sky-blog-discovery/06-operating-accounts-under-one-organization.md).

Evidencia reutilizada:

- `.captures/insights-sky-scope-2026-10-27/operating-accounts-readback.json`: una Organization, un Space histórico,
  servicios Diseño/Blog en él, 123 proyectos y definición viva de sesión; no contiene personas.
- `.captures/sky-multi-account-discovery-2026-10-27/identity-schema-readback.json`: SELECT de constraints/índices
  de tablas de identidad y comprobaciones estructurales de `session_360`. No se consultaron filas de personas.
- Fuentes de código con referencias `ruta:línea` del checkout inspeccionado. Los números pueden cambiar al implementar.

No se invocaron APIs de onboarding, invitación, sesiones, shares, delivery o consentimiento; varias escriben audit,
tokens o eventos aunque su nombre parezca una consulta. Tampoco se corrieron tests live ni se aplicó DDL.

## 3. Hechos verificados: identidad comercial, puentes y cardinalidades

### 3.1 Lo que el schema permite y lo que el command autoriza son distintos

| Hecho | Evidencia | Implicación |
| --- | --- | --- |
| `clients` tiene PK `client_id` y UNIQUE `public_id`. `hubspot_company_id` sólo tiene índice normal, no UNIQUE. | Recibo de schema vivo; `idx_clients_hubspot_company_id`. | No afirmar que DB impide técnicamente dos clients con la misma Company. Eso no los autoriza comercialmente. |
| `organizations.hubspot_company_id` también tiene índice normal en el schema inspeccionado. | Recibo de schema vivo. | La unicidad comercial debe conservarse por contrato/commands, no inferirse del índice. |
| `spaces.client_id` no es UNIQUE; puede ser NULL. | Recibo de schema vivo; definición histórica `scripts/setup-postgres-account-360-m0.sql:162–181`. | DB admite puentes compartidos, pero sesión/consumers no quedan correctos automáticamente. |
| `person_memberships` tiene FK separadas a profile, organization y space, sin UNIQUE por persona+Space y sin FK compuesta que pruebe Space∈Organization. | Recibo de schema vivo. | La futura resolución debe validar pertenencia y no confiar en dos FKs independientes. No hay prueba de inconsistencia actual. |
| `client_users` tiene índices únicos de OID Microsoft y Google subject; email lower es índice no único. | Recibo de schema vivo. | No crear otro usuario del mismo humano para resolver el cambio de cuenta; auto-merge por correo tampoco es una solución. |

El UNIQUE que describe `hubspot-companies-intake.ts:57` corresponde al UPSERT de **`greenhouse_crm.companies`**:
`src/lib/hubspot/sync-company-by-id.ts:188–214`, no a `greenhouse_core.clients`.

`instantiateClientForParty` valida `organizationHasClient` y lanza `OrganizationAlreadyHasClientError` si ya hay uno
(`src/lib/commercial/party/commands/instantiate-client-for-party.ts:88–91`). Su operación crea además perfil financiero
(`:148–172`); no sirve para crear un puente operativo sin materializar otra alta financiera.
`organizationHasClient` consulta perfiles financieros o el match de Company (`party-store.ts:89–114`).

**Consecuencia:** un child operativo requiere un command distinto o una extensión explícita del agregado con modo
operativo, no saltarse la validación con un INSERT suelto ni llamar dos veces al alta de cliente comercial.

### 3.2 Estado SKY que se conserva

El Space histórico y `client_id=hubspot-company-30825221458` no se reemplazan ni se renombran como identificadores.
Mantienen su historia y referencias. Un nombre de presentación «SKY · Diseño» sería una modificación trazable aparte.
El servicio Blog cambia de vínculo sólo mediante una operación canónica con preview y readback cuando el nuevo contexto
esté preparado. Los 123 proyectos no se reclasifican todos como Diseño sólo por este conteo.

## 4. Comparación de alternativas

| Alternativa | Ventaja material | Coste / riesgo real | Condiciones para considerarla segura |
| --- | --- | --- | --- |
| A. Segundo Space con otro client mediante `instantiateClientForParty` | Sesión cliente→Space podría ser unívoca. | Command rechaza org ya instanciada; además crea perfil financiero y confunde departamentos con altas comerciales. | No recomendada. No se retira un guard canónico por conveniencia. |
| A'. Puente client operativo hijo por Space, con owner comercial común | Preserva la frontera client-only de gran parte del delivery, equipo y provisioning legacy; Diseño mantiene IDs. | Introducir relación comercial/operativa explícita; adaptar counters y sync; impedir duplicación de finanzas; una persona en ambos sigue necesitando selección. | Command específico atómico y auditado, clasificación child, finance owner único, active context y filtros org-scoped. **Opción preferida condicionada**. |
| B. Un único client compartido + autorización/selección explícitas de Space | No crea otro client ni modifica el concepto comercial. Una persona tiene un principal y varias memberships. | `session_360` duplica filas; readers client-only, asignaciones y scopes históricos se mezclan si no se convierten; mayor cobertura obligatoria antes de apertura. | Cambiar resolución de sesión y convertir todos los readers/client writers alcanzables desde los dos Spaces. |
| B'. Nuevo Space sin `client_id`, relación comercial resuelta por org | Evita duplicar el JOIN actual por client; expresa Space como hijo organizacional. | Consumers heredados exigen client; no crea por sí solo un contexto accesible ni aislado; fallbacks a primer client vuelven ambigüedad. | Mismos contratos operativos que B, y adapters explícitos para legacy. No tratar NULL como «usar el Space de Diseño». |
| C. Mantener un Space y separar sólo por Service | Menor cambio inicial; suficiente para algunos informes internos. | No separa backlog, equipo, navegación, sesiones o permisos; los servicios comparten el tenant operativo. | No satisface las dos cuentas independientes solicitadas. Puede ser sólo una etapa interna de medición. |
| D. Duplicar Organization / Company / usuario | Muchos filtros existentes separarían por identidad nueva. | Fragmenta relación, consolidados, principal y contabilidad; sincronización e identidad duplicadas. | Fuera del requerimiento. No usar como sustituto de la autorización operativa. |

### 4.1 Por qué A' es preferible a B para una transición con historia

El factor no es una supuesta duración. A' deja intacta la población de cada reader que ya consulta por client:
Diseño conserva el suyo y SEO recibe uno nuevo. B exige demostrar que **todos** esos consumers agregan Space, y
un único olvido permite datos cruzados dentro del mismo client. A' no arregla Insights, Account 360 ni las fuentes
de medición organizacionales; esos readers deben incorporar scope operativo en ambas opciones.

El frente de routing confirma esa superficie legacy: `src/lib/space-notion/space-notion-store.ts:33–45` resuelve
por client con LIMIT 1; `src/lib/space-notion/notion-governance.ts:831–846` y
`src/lib/ico-engine/enable-client-ico-sync.ts:105–118` seleccionan el Space activo más antiguo.
La identidad distinta de client ayuda a mantener un bridge unívoco en esos seams. No elimina la ambigüedad del
resolver por Company ni la identidad única de proyectos de Notion: copiar un mismo origen a dos Spaces puede
reatribuirlo en vez de duplicarlo. Esos writers y su transición se desarrollan en el anexo de routing/operación.

A' no es una decisión gratis: si los writers actuales siguen interpretando cualquier client como otra cuenta
facturable o el sync vuelve a elegir el primero por Company, no puede activarse. Antes del ADR se requiere el
inventario de consumers comerciales/financieros del discovery integral. A' se recomienda como puente operativo,
**nunca como permiso para duplicar la cartera de clientes**.

## 5. Riesgos de sesión y provisioning que no cubre un Space nuevo

### 5.1 `session_360` no es hoy un selector de cuentas

La vista viva inspeccionada une `spc.client_id=u.client_id`, agrupa por `spc.space_id` y no consulta memberships.
Su forma coincide con `migrations/20260601194051024_task-987-session-route-groups-lifecycle-fix.sql:99–108`.
`getSessionFromPostgresByUserId` toma `SELECT * ... WHERE user_id=$1 LIMIT 1` sin selector
(`src/lib/tenant/identity-store.ts:284–291`). Con B, dos Spaces activos con ese client pueden producir dos filas;
el LIMIT no elige una cuenta autorizada. A' preserva el bridge unívoco para el login legacy, pero el actor con acceso
a ambos sigue teniendo una sola columna `client_users.client_id` y necesita contexto operativo separado.

La solución propuesta separa **principal autenticado** de **cuenta operativa seleccionada**. No cambia el usuario
de origen al cambiar de cuenta, no actualiza `client_users.client_id` en cada click y no introduce otro issuer.
La sesión puede conservar un default/home bridge para compatibilidad; la autorización de cada request usa el
contexto operativo resuelto, no un `LIMIT 1` sobre todos sus Spaces.

### 5.2 El JWT existente no puede ser la única autoridad

`src/lib/auth.ts:74–109` copia `tenant.clientId`, roles, scopes, `spaceId` y organización al token. Refresca access
claims cada cinco minutos (`:70`, `:788–799`) desde la misma resolución de tenant. Un selector que cambie sólo el
JWT/estado React se puede deshacer en ese refresh. Una revocación tampoco debe esperar esos cinco minutos para
autorizar nuevos datos del Space retirado.

`getTenantContext` sólo proyecta la sesión (`src/lib/tenant/get-tenant-context.ts:65–99`). El request de una cuenta
debe resolver/revalidar su membership actual y policy versión servidor; el claim sirve para identificar el actor
y proponer preferencia, no para conceder la cuenta. App sessions también persisten client/Space/Organization
(`src/lib/api-platform/core/app-sessions.ts:164–193`) y requieren la misma comprobación al usar/refrescar contexto.

### 5.3 Invitación y membership actual no conceden la cuenta correcta

- `inviteClientPortalUser` reutiliza usuario por email con `onExisting='ensure'` y sólo agrega roles globales
  (`src/lib/client-onboarding/invite-client-portal-user.ts:105–155`). No garantiza membership ni autorización del Space pedido.
- La automatización `ensure-client-membership.ts:18–36` comprueba pm contra Space por organización y toma un Space
  por client con LIMIT 1. Una membership en la organización puede impedir crear la del segundo Space.
- `membershipExists(profile,org)` no incluye Space (`account-360/organization-store.ts:742–752`); el upsert de contacto
  genérico lo usa y crea relación organizacional, no necesariamente un permiso de portal (`:830–847`).
- El provisioning administrativo de miembros detecta un mismo contacto canónico en otro client como conflicto
  (`src/lib/admin/tenant-member-provisioning.ts:735–743`). A' necesita reconocer «mismo principal, segunda relación
  operativa autorizada», sin mover su tenant original ni duplicarlo. El conflicto entre organizaciones distintas se conserva.
- `getPersonMemberships` deriva un primer client de la org cuando la relación no tiene Space (`organization-store.ts:944–948`).
  Esa comodidad de presentación no prueba acceso al Space correspondiente y no se reutiliza como autorización.

Una membership `client_contact`, `billing` o `partner` activa es una relación factual. No convertir automáticamente
todas las relaciones de una persona en grants de acceso. El command de alta operativa debe materializar permiso de
portal explícito sobre una membership del tipo/policy correcto y conservar su audit. Los roles globales no sustituyen
esa relación y ganar un rol no abre otra cuenta.

## 6. Contrato de contexto propuesto

Es un DTO de autorización nuevo o una extensión de seams existentes, no una entidad Account nueva. Forma ilustrativa:

```ts
type AuthorizedOperatingContext =
  | {
      kind: 'space'
      organizationId: string
      spaceId: string
      operatingClientId: string
      commercialClientId: string
      membershipId: string
      authorizationVersion: string
      allowedServiceIds: string[]
    }
  | {
      kind: 'organization_consolidated'
      organizationId: string
      allowedSpaceIds: string[]
      commercialClientId: string
      authorizationVersion: string
    }
```

El actor/principal y sus capabilities se transportan aparte. `operatingClientId` es el bridge para consumers
legacy de esa cuenta; `commercialClientId` es el propietario de la relación financiera. No deben intercambiarse
en una variable genérica `clientId` ni usarse para generar cuentas o duplicar costes.

### 6.1 Primitive única propuesta

Un resolver del dominio de acceso recibe actor autenticado, selector no confiable y operación/capability requerida:

1. Deriva principal y tenancy autenticados; nunca del body. Carga Spaces y memberships/grants elegibles para esa persona.
2. Comprueba Organization activa, Space activo y pertenencia Space→Organization. Para A', comprueba también
   bridge operativo→Space y owner comercial. Una FK separada a cada objeto no basta para esta correspondencia.
3. Intersecta: producto/módulo contratado por Organization, servicio/contexto operativo habilitado, permiso personal
   vigente y capability/acción. Ningún elemento amplía al siguiente por inferencia.
4. Si hay selector explícito, exige que esté dentro de la intersección. Sin selector: sólo autoelige cuando hay un
   único contexto elegible o una preferencia explícita todavía autorizada. Con más de uno, exige seleccionar; no LIMIT 1.
5. Construye DTO autorizado con versión de policy y devuelve al consumer el scope exacto, no todas las memberships.
6. El modo consolidado requiere permiso explícito para esa organización y sus facetas. No lo concede
   `space_id=NULL`, el cargo de ejecutivo ni pertenecer al mismo dominio de correo.

Cada request valida el target de sus objetos: tener acceso al Space SEO no permite descargar una edición Diseño
por conocer su ID. Si un objeto carece de vínculo operativo comprobable, queda legacy/restricted para sus lectores
autorizados históricos; no se le asigna el Space activo del caller.

### 6.2 Reutilizar capabilities y gobernanza existentes

`TenantEntitlementSubject` contiene identidad/roles/scopes de proyecto/campaña, pero no Organization ni Space
(`src/lib/entitlements/types.ts:14–27`). Se recomienda mantener el scope de datos como contrato explícito distinto
del capability subject. `own` no significa «todos los datos de la Organization».

Ya existen `role_entitlement_defaults` y `user_entitlement_overrides` por Space. El reader
`src/lib/entitlements/effective-reader.ts:37–77` consulta los hechos de actor/Spaces pedidos, sin cache cross-request,
y usa el merger canónico de `effective.ts:47–120`. Su existencia no significa que Insights lo consuma: `authz.ts`
actual usa `can(subject,...)` base y el módulo organizacional.

El resolver nuevo puede componer esos permisos efectivos con la membership. Respetar revocaciones exactas por
capability/action/scope; no inventar un wildcard deny. Para vistas `cliente.*`, conservar la regla de módulos y
vetos **por persona**, sin volver a vetos per-rol que contradigan el canon. Las operaciones sensibles revalidan
contra estado vigente aunque el menú o JWT tenga cache. La capability `client_portal.workspace` ya declara
`defaultScope:'space'` (`src/config/entitlements-catalog.ts:788–791`), pero todavía hay que asociarla al Space concreto.

### 6.3 Selección con dos pestañas

El selector de cuenta propone un contexto, no cambia permisos. Cada URL/request mantiene una referencia al Space
y la revalida; una preferencia global de navegador sólo afecta el próximo landing. Si dos pestañas están en Diseño
y SEO, cambiar una no debe reenviar la operación de la otra al contexto nuevo por compartir un cookie mutable.
Los comandos incluyen scope esperado del recurso y rechazan discrepancias. No se guarda en la URL un token de
autoridad. El cambio de cuenta limpia caches/UI del contexto anterior y aborta o descarta respuestas tardías.

## 7. Vistas, rows y cachés: tres controles diferentes

### 7.1 El módulo contratado es un techo organizacional

`module-resolver.ts:147–160` consulta assignments por `organization_id` y su cache se indexa por organización
(`:95–125`). `resolve-client-portal-visibility.ts:45–63` combina ese techo con revokes por persona; no recibe Space.
`person-view-revocations.ts:49–54` sólo devuelve view codes. Estos primitives evitan vistas no autorizadas, pero
no distinguen dos bibliotecas del mismo módulo Insights.

No hace falta duplicar la venta del producto para crear SEO. Se necesita la proyección «módulo de esta cuenta»
derivada de su servicio/habilitación e intersección de acceso. Si un módulo es compartido por ambas cuentas, su
vista puede aparecer en ambas, siempre con datos filtrados. Ocultar un menú no reemplaza la autorización API.

### 7.2 Cache keys que cambian de significado

| Cache / dato | Estado actual | Requisito de transición |
| --- | --- | --- |
| Assignment de módulos | Cache por Organization, TTL 60 s | Puede seguir siendo el techo comercial. No reutilizarlo como respuesta operativa por Space sin key correspondiente. |
| Revokes de vistas | Por userId, TTL 60 s | Mantener semántica personal; para acceso a datos usar policy vigente/grant version, no esperar cache de menú. |
| Access claims JWT | Refresh 5 min | No usar como única prueba de membership vigente ni pisar active context al refrescar el principal. |
| Facetas Account Complete 360 | `getCachedAccountFacet(orgId,facet)` y set equivalentes (`account-complete-360.ts:176/198`) | Mantener consolidado separado; una respuesta filtrada necesita key por scope/proyección/policy. Nunca guardar fragmento SEO en cache global org ni devolver global a una cuenta. |
| Estado React/SWR/query | No se hizo inventario exhaustivo de stores UI | Keys deben incluir cuenta/proyección; limpiar al cambiar y comprobar que respuestas de otro scope no se aplican. |
| Grants API / OAuth | Pueden durar más que una pestaña | Revalidar binding y authority vigentes por llamada; cuenta seleccionada no amplía el token. |

Una respuesta con field redaction diferente por rol/persona tampoco puede compartir una key de datos sin esa
clase de proyección. Preferir no cachear el primer corte de autorización fina antes que reutilizar caches globales
con supuestos incorrectos. No presentar el TTL de un cache de menú como SLA de revocación de datos.

## 8. Propagación API, MCP e Insights

### 8.1 Seams existentes que evitan otro sistema de acceso

App auth ya conserva `tenant.spaceId` y Organization (`src/lib/api-platform/core/app-auth.ts:92–93`); el contexto
ecosystem conserva `binding.spaceId` (`core/context.ts:42–46`). API idempotency contempla Space (`core/idempotency.ts:189–192`).

Sin embargo `app-insights-scope.ts:19–37` devuelve organización y subject; `ecosystem-insights-scope.ts:35–47`
también reduce su binding a organización y construye un sujeto cliente sintético. El dato de Space presente en
el core se pierde en ese adapter. Reutilizar esos seams y propagar la intersección autorizada; no crear otro OAuth
issuer, nuevos bearer secretos o un acceso especial del gateway a la DB.

Un binding org-scoped anterior no puede interpretarse automáticamente como acceso a todos los Spaces nuevos.
Se conserva su finalidad legacy autorizada o queda limitado a su conjunto explícito hasta ampliar consentimiento
y autoridad por el cauce correspondiente. El servidor rechaza un selector de Space ajeno aunque coincida la org.
Un caller interno con capacidad general conserva las operaciones permitidas por su rol, pero el nuevo consolidado
se decide explícitamente y no se expone a un stakeholder por un bypass de UI interno.

La autoridad por Space no termina en Insights. Los endpoints de módulo GA4/GSC/SEO y el reporte AEO genérico que
elige el último run por Organization también deben intersectar el contexto operativo o denegar esa superficie
cuando no soporten su proyección. Una persona SEO no puede saltar del informe acotado a un endpoint de AEO general
y obtener scores globales sólo porque tenga el módulo de la misma Organization. El lector dueño puede reutilizar
la evidencia general para la proyección autorizada; su existencia no concede acceso al run/report completo.

### 8.2 Insights necesita scope operativo en cada acceso

Estado actual: `assertInsightsAccess` comprueba Organization/capability/audience (`authz.ts:120–147`), y los lectores
listan reportes/ediciones por Organization (`readers/index.ts:35–83`). No hay comprobación de Space/Servicio en ese contrato.

Cambios necesarios:

- Persistir owner operativo del reporte y binding inmutable de cada edición; ubicar las ediciones legacy mediante
  evidencia histórica explícita, sin inferir por título ni cambiar sus snapshots.
- Listas filtran primero por conjunto operativo autorizado, antes de conteo/paginación. Conteos y catálogos también
  pueden revelar la existencia de otra cuenta; el filtro no se limita a ocultar cards después de la consulta.
- Detalle/evidencia/plan/render/output/download/revise/recover/share validan objeto→owner→scope autorizado. Un
  `editionId` o `outputId` no es autorización y no debe permitir saltarse el listado.
- La audiencia `client` sigue siendo necesaria, pero no distingue departamentos. Dos reportes de audiencia cliente
  pueden pertenecer a Spaces distintos. Los gates existentes de emisión humana no se relajan.
- Catálogo y capacidad de crear se calculan para la cuenta, no sólo para la Organization. En SEO se exige el binding
  GA4+GSC+motor AEO/host; en Diseño no se añade ese requisito como default organizacional.
- Las salidas históricas de Diseño conservan sus hashes/assets/versión. Su ownership de acceso se puede materializar
  en una relación externa auditada si la tabla sellada no admite UPDATE; no modificar la evidencia para etiquetarla.

La identidad de un comando nuevo debe incluir el contexto operativo efectivo normalizado —organización, Space y
Servicio cuando aplique— antes de resolver configuración mutable. La idempotencia legacy sin ese contexto conserva
su hash. Si la unicidad sigue siendo `(organization_id,key)`, reutilizar key desde otro Space debe producir conflicto
seguro sin revelar el ID ajeno, nunca devolver la edición de la otra cuenta por el mero lookup de key. El command
revalida que el objeto idempotente pertenece al scope autorizado antes de responder.

### 8.3 Shares y envíos

`sharing/public.ts:115–142` autoriza un bearer a una edición emitida; no comprueba persona o departamento. Sirve para
distribución por posesión, no demuestra aislamiento de identidad. Para la experiencia estricta de stakeholders,
el default recomendado es `portal_link` autenticado al Space. Un `share_link` requiere decisión explícita sobre
quién lo puede crear y para qué edición; su destinatario puede reenviarlo mientras esté vigente.

El resolver de destinatarios comprueba usuarios activos del mismo Organization o internos
(`delivery/store.ts:86–106`), no su acceso al Space de la edición. Debe comprobar elegibilidad por cuenta y revalidarla
al despachar, reintentar y reconciliar, conservando idempotencia. «Mismo SKY» no permite enviar Diseño a SEO.
Un adjunto ya enviado no se recupera mediante revocación; las modalidades mantienen sus advertencias y aprobación.
No generar duplicados para «probar» esta transición y no reenviar entregas previas.

## 9. Propuesta de persistencia y comandos; no SQL listo para aplicar

### 9.1 Para la opción A' preferida

Definir en el canon un vínculo inequívoco entre client operativo hijo, Space y cliente comercial owner; su forma
puede ser extensión de `clients` con tipo/parent owner o una relación de bridge gobernada. Debe ser única por
Space y no reasignarse por un sync de Company. **No decidir el schema sólo por cuál columna resulta más cómoda.**
Se requieren invariant y writer que garanticen:

- un child operativo pertenece al mismo Organization/party del owner comercial;
- no crea otro `client_profile`, contraparte legal, saldo ni conteo comercial;
- no se duplica el HubSpot Company ID como identidad de una segunda empresa; si el child requiere referencia a
  Company, se resuelve a través del owner o un campo con semántica explícita, sin que el sync lo promueva como otro cliente;
- el puente Diseño existente conserva su identidad y representa el default legacy; el child SEO tiene identificador
  opaco propio y no sustituye PKs de la historia;
- sync de servicios usa mapping por servicio y contexto persistido, no primero por org/Company;
- readers financieros/comerciales resuelven el owner real; consumers operativos resuelven su bridge del Space.

Command propuesto de provisioning operativo: valida Organization/owner/estado esperado, serializa por agregado,
crea child+Space+bindings como una unidad idempotente y audita/outbox; no envía invitaciones ni migra proyectos por
efecto secundario. La concesión a personas es otro command o paso explícito con permisos y readback propios.
El scope y la idempotency key incluyen Organization+Space/request, no sólo Company, para no fusionar ambas altas.

### 9.2 Membresías y autorización operativa

Reutilizar `person_memberships` para identidad relacional; fijar qué membership puede portar acceso al portal y
qué extension/grant representa su habilitación. Si la relación existente no distingue contacto de acceso, agregar
una extensión gobernada por membership en lugar de asumir que `active=true` equivale a permiso. La tabla exacta
se decide con Identity; ninguna nueva fila se necesita para representar otra persona.

Definir unicidad de membership/grant vigente por principal+Space+tipo/policy tras diagnosticar duplicados existentes.
Agregar correspondencia compuesta Space→Organization si no existe, sin borrar relaciones históricas. Un grant a
Organization sin Space queda factual/global sólo cuando su policy lo declare; no es un wildcard automático.
Los guards no hacen auto-merge por email ni reactivan usuarios/sesiones por una membership nueva.

### 9.3 Datos legacy y lookup sin contexto

Para un cliente con un único Space y sin activación de multi-cuenta, preservar el contrato actual. Al habilitar
multi-cuenta, evitar que consumers sin contexto puedan responder con scope amplio: deben resolver una cuenta
autorizada explícita o rechazar. Los datos sin clasificación operativa no se muestran a SEO para «evitar vacío».

La migration de ownership de reportes es aditiva y de acceso, con mapa auditado externo cuando corresponda. No
cambia JSON sellado, hash o datos de medición. Las FKs/constraints nuevas se expanden antes del código, se validan
contra el schema vivo y conservan grants least-privilege. No relajar la protección de passwords, OID, source links
ni triggers de snapshots por esta tarea.

## 10. Transición y rollback

| Paso | Evidencia necesaria antes de seguir |
| --- | --- |
| 0. Baseline Diseño | Recibo de IDs/ownership/snapshots/roles ya autorizados, sin publicar personas en docs. Verificar sesión única. |
| 1. Expand de schema y primitives | Old/new fixtures; no habilitar otra cuenta por crear columnas. |
| 2. Actualizar consumers | Web pages, App API, ecosystem/MCP, background, outputs y cache keys usan el mismo scope. |
| 3. Preparar contexto SEO sin exposición | Bridge/Space/service binding y fuentes listos, acceso de stakeholders todavía no concedido. |
| 4. Asignación autorizada | Conceder sólo los Spaces debidos; verificar denegación cruzada, no sólo acceso positivo. |
| 5. Primera experiencia | Actor Diseño conserva historia; actor SEO obtiene GA4/GSC/AEO; actor multi-cuenta cambia sin mezclar estado. |
| 6. Operación | Grants, notificaciones, expediciones y métricas están ligados a su cuenta; monitorear señales de discrepancia. |

Un rollback que quite filtros o cambie el selector a «todos SKY» es inseguro. Pausar la nueva superficie/cuenta SEO
manteniendo su aislamiento y la historia de Diseño es preferible a ampliar permisos. Si datos/grants multi-cuenta
ya existen, un binario viejo que sólo conoce Organization/client puede no ser un destino de rollback seguro.
Se necesita piso de versión y routing/gate por capability; no basta deshabilitar un menú.

No borrar child/Space/memberships auditadas para volver a una versión anterior. Revocar/deshabilitar por command
y preservar trazabilidad. Si A' se revierte a B, el contrato de mapeo conserva IDs y exige migración probada de los
readers; no fusionar client IDs con SQL. Una caída del resolver produce contexto no disponible/deny, nunca herencia
de la cuenta Diseño para mantener la pantalla funcionando.

El bootstrap de permisos legacy debe conceder sólo lo ya autorizado para Diseño y bajo evidencia; no dar ambas
cuentas a todo el directorio SKY. Sesiones/grants anteriores requieren revalidación controlada antes de la apertura,
sin invalidar innecesariamente todas las sesiones de otros clientes o despertar Auth/Rooms.

## 11. Matriz de amenazas y aceptación

| ID | Ataque / estímulo | Respuesta exigida |
| --- | --- | --- |
| A01 | Persona SEO cambia Space ID en URL, query, body o header a Diseño | Denegación uniforme; no lista, conteo, título, evidencia ni salida de Diseño. |
| A02 | Persona Diseño usa `editionId`/`outputId` de SEO conocido | Validar owner del objeto; no sirve aunque ambos sean client audience y misma Organization. |
| A03 | Pertenencia factual a SKY sin grant Space | No abre ninguna cuenta por inferencia; contacto/billing no es portal grant. |
| A04 | Persona accede legítimamente a ambas cuentas | Un principal, selección explícita y datos del contexto activo; no combinar métricas automáticamente. |
| A05 | Cambia cuenta en una pestaña mientras otra envía comando | Cada comando conserva target/contexto esperado y su versión; no se ejecuta sobre la otra cuenta. |
| A06 | JWT viejo conserva Space ya revocado | Resolver actual deniega nuevos datos; el refresh a cinco minutos no es la única defensa. |
| A07 | Permiso de vista retirado por persona | Menú/page coherentes; row authorization mantiene protección por objeto aun si el menú está stale. |
| A08 | Se añade rol ejecutivo global a un usuario SEO | No obtiene Diseño ni consolidado sin grant explícito de ese scope. |
| A09 | `space_id=NULL` en membership o fallo del resolver | No significa todo Organization; no fallback a primer Space. |
| A10 | Un Space pertenece a otra Organization pero se envían IDs cruzados | Comprobar relación y denegar; dos FKs independientes no suplen la validación. |
| A11 | Respuesta Diseño llega tarde después de cambiar a SEO | UI descarta por contexto; query cache no la instala en SEO. |
| A12 | Cache Account 360 global se solicita desde cuenta SEO | No devolver global como parcial; clave/proyección/scope explícitos o deny. |
| A13 | Binding MCP tiene Space Diseño; caller pide SEO mismaorg | Intersección conserva Diseño, sin widening por org compartida. |
| A14 | Binding org legacy previo al segundo Space | No adquiere el Space nuevo automáticamente; conjunto autorizado documentado. |
| A15 | Onboarding reusa un usuario existente por email | Conserva principal y home; añade sólo relación operativa autorizada sin conceder otro client por rol global. |
| A16 | Sync de HubSpot/servicios reejecutado | No crea Company/client comercial nuevo ni mueve el servicio al primer Space. |
| A17 | Se entrega informe Diseño a destinatario SEO activo en SKY | Resolver por cuenta lo rechaza antes de enqueue y revalida antes del envío/retry. |
| A18 | Link bearer reenviado a otra persona | No afirmar aislamiento por identidad; sólo habilitar esa modalidad cuando su policy lo permite. Portal autenticado para acceso estricto. |
| A19 | Se cambia activo/inactivo el owner o la membership | Rutas/API/worker convergen al deny; no un cache que mantenga grants sin versión. |
| A20 | Cuenta SEO nueva no tiene historia de ICO | Ausencia/nuevo servicio; nunca copia de Diseño para rellenar. |
| A21 | Request scoped sin filtro en una dependencia | Se rechaza/queda no disponible para multi-cuenta; no respuesta org-wide silenciosa. |
| A22 | Rollback a código previo después de crear child/grants | Prueba de incompatibilidad bloquea activación; mantener apagada la superficie nueva sin ampliar permisos. |
| A23 | Provisioning A' reintentado | Mismo bridge/Space, cero perfiles financieros nuevos, cero duplicación del principal y de concesiones. |
| A24 | Histórico Diseño leído tras promoción | Mismos IDs, snapshots/assets y población; permisos previamente autorizados conservados. |
| A25 | Rol interno amplio visita cuenta | Se mantienen las capabilities legítimas; el consolidado y facetas sensibles se evalúan explícitamente, sin trasladar bypass visual a un grant externo. |
| A26 | Persona SEO llama directamente al reporte AEO general o endpoint GA4/GSC fuera de Insights | Misma intersección de cuenta y proyección de fuente; no obtiene scores globales ni datos fuera de blog como bypass. |
| A27 | Misma key idempotente usada desde Diseño y SEO | No responde objeto de la otra cuenta; conflicto/denegación seguro, sin revelar sus IDs ni modificar hash de requests legacy. |

Las pruebas deben cubrir lista/detalle/exportación/descarga, conteos, errores, pagination y cachés además del login.
Usar fixtures sintéticos con 2 Spaces/3 actores (Diseño, SEO, ambos) y un actor de consolidado separado, no duplicar
personas reales ni probar revocaciones alterando usuarios actuales de SKY. Los tests de acceso real sólo se ejecutan
cuando exista una cohorte autorizada y sin envíos automáticos.

## 12. Señales operativas y criterios de cierre

Se proponen señales de contexto ambiguo, objeto fuera de scope, bridge/commercial-owner inconsistente, grant
revocado aún usado, response cache con scope equivocado y service binding movido por sync. Son nuevas propuestas;
no se afirman registradas o desplegadas. Payloads mínimos con IDs opacos y correlation, sin correos, tokens o PII.

Debe poder demostrarse:

- una sesión/principal por persona y contexto operativo inequívoco por request;
- cero expansión por misma Organization, clientId, rol agregado o menú;
- filtros equivalentes en UI/API/MCP/background y propagación del Space del core a los dominios;
- historia y acceso de Diseño conservados, SEO habilitado únicamente en su población autorizada;
- contabilidad, Company y conteos comerciales sin duplicación bajo A';
- revocación verificada dentro del presupuesto acordado, con origen/versionado de grants comprobables;
- rollback con aislamiento preservado, separado de disponibilidad de la nueva cuenta.

## 13. Decisiones pendientes y handoff

1. Ratificar A' frente a B con el inventario integral de consumers y el contrato de owner financiero. El schema
   permite más de una forma; el ADR debe explicar la semántica operacional y comercial, no sólo la FK elegida.
2. Fijar cómo se materializa portal access sobre membership y cómo se/versionan grants por Space. Reusar governance
   existente sin convertir relaciones de contacto en autorización.
3. Fijar default/home legacy vs active context por request y protección multitab. No cambiar la persona autenticada.
4. Incorporar Space a todos los readers org-scoped relevantes, especialmente Insights/Account 360/shares/delivery;
   decidir qué enlaces admiten bearer y cuáles requieren identidad.
5. Reconciliar provisioning administrativo de contactos multi-cuenta y sync de servicios antes de dar de alta SEO.
6. Acordar budget de revocación y política de caches; el TTL actual de cinco minutos no es evidencia suficiente.
7. Completar inventory UI/store/query keys y consumers externos del bridge. Este subencargo no afirma un barrido
   exhaustivo de todos los endpoints de Greenhouse.

No se ejecutó provisioning, invitaciones, cambios de permisos, setup de integración, publicación o despliegue.
El diagnóstico distingue riesgo de apertura de segunda cuenta de una fuga actual comprobada: SKY todavía tiene
un solo Space en el readback. El diseño se considera listo para decisiones, no listo para operar ni implementado.
