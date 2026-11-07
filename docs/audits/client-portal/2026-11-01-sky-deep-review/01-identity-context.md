# SKY: revisión profunda de identidad y contexto departamental

Fecha: 2026-11-01. Base inspeccionada: `985f84d3c` más WIP documental existente; no se modificó código ni datos.
Responsabilidad: objetivo 1/6, identidad, autoridad y reachability de Insights y Account360.
Método: skill `software-architect-2026`, overlay Efeonce, invariantes Identity/Workforce y Org/Client;
contraste del ADR operativo y del critical-review con callsites y SQL actuales del repositorio.

## Dictamen

Organization → Spaces sigue siendo una dirección válida. **Ninguna variante entrega aislamiento departamental hoy.**
A′ conserva ventaja de compatibilidad para readers estrictamente por client, pero no corrige Insights ni Account360,
que autorizan/agregan por Organization. B evita otro client operativo pero necesita eliminar la selección implícita
del Space y trasladar el contexto a todos sus consumers. No elegir puente antes de probar grants y readers reales.

Hay dos precisiones importantes frente a la revisión anterior: el SQL actual de `session_360` selecciona un Space
mediante LATERAL ordenado, no genera necesariamente dos filas; y `ensureClientMembership` no tiene callers en `src`.
Además se confirmó una falla independiente del puente: un cliente same-org que NO es executive cae en la rama
default interna de Account360. Esto aumenta su acceso respecto del executive y alcanza CRM/AEO.

## 1. Evidencia nueva y límites

- Inspección estática, sin DB remota, credenciales, login real, emisión de tokens ni comprobación de despliegue.
- `scripts/setup-postgres-identity-v2.sql:184` es la única definición `CREATE OR REPLACE VIEW ...session_360`
  encontrada bajo `scripts`. No prueba qué revisión tiene instalada producción.
- Se ejecutó localmente la función real `authorizeAccountFacets`, transpilada con TypeScript y stub exclusivo
  de `server-only`, sin mocks de su lógica ni conexión a DB. Resultado reproducido abajo.
- No se afirma exfiltración observada: se demuestra un camino autorizado por el código hasta readers reales.
- El ADR permanece Proposed; la auditoría no autoriza provisioning, migración, envío ni apertura a SKY.

## 2. Cadena de entrada: login, invitación, sesión, request

| Tramo real | Comportamiento comprobado | Implicación A′ / B |
|---|---|---|
| Invitación lifecycle | `/api/admin/clients/[organizationId]/lifecycle/portal-users/invite/route.ts:79–103` resuelve Organization, usa `scope.clientIds[0]` y `onExisting: ensure` | A′ introduce varios candidatos; B conserva un client pero tampoco identifica Space. El body no decide el grant departamental. |
| Usuario existente | `client-onboarding/invite-client-portal-user.ts:105–155` busca email global, reutiliza user y agrega roles globales | Invitar a SEO no otorga un grant SEO; puede agregar autoridad global a alguien ya existente. No duplicar identidad para simular departamentos. |
| Entrega invitación | Mismo archivo `:266–277` exige `user.client_id === clientId` | Contraprueba: no cualquier persona existente puede recibir la invitación de otro client. A′ necesita flujo separado de grant, no otra invitación de cuenta. |
| Serving login | `tenant/identity-store.ts:284–292` consulta `session_360 WHERE user_id LIMIT 1` | La API devuelve un contexto singular, no una lista de grants seleccionables. |
| Contexto de Space | `setup-postgres-identity-v2.sql:220–239,260–295` prioriza bridge por `u.client_id`, después membership primaria | A′ sigue ligado al client original. B puede elegir el último Space actualizado; no es elección del stakeholder. |
| Flags y módulos | SQL `:253–259,302–303` toma flags de `u.client_id`; `identity-store.ts:193–195` carga módulos por ese client | Cambiar únicamente Space no recontextualiza permisos ni módulos. Con B, flags de client son comunes por construcción. |
| Cookie | `auth.ts:70,788–803`; `tenant/get-tenant-context.ts:53–105` | Claims se refrescan cada 5 minutos; contexto deriva de sesión, no de grant Space por request. |
| App bearer propio | `api-platform/core/app-auth.ts:109–129` → `app-sessions.ts:72–130` | Relee sesión persistida, expiración y usuario activo; es una protección real distinta de la cookie. Sigue devolviendo el contexto singular del usuario. |
| OAuth bearer | `app-auth.ts:131–158` resuelve OAuth/userinfo y carga tenant; conserva capabilities/bindings OAuth | No equiparar con un JWT propio sin controles. Tampoco hay traducción Space en el adapter Insights. Revisión completa del issuer/revocación OAuth queda fuera de este corte. |

Todas las rutas anteriores viven bajo `src/lib/` salvo las rutas HTTP (`src/app/`) y el SQL (`scripts/`).
`src/lib/my/ensure-client-membership.ts:18–55` no sirve como implementación de grants: join por Organization,
ID `pm-cu-${userId}` y conflicto ignorado. **Pero `rg ensureClientMembership src` sólo encuentra su definición**:
el comentario “called lazily on login” no demuestra reachability. No atribuirle contaminación actual de login.

El DDL de memberships (`scripts/setup-postgres-account-360-m0.sql:190–219`) permite múltiples filas por profile,
con Organization/Space opcionales, fechas, status y active. No es una tabla de grants por verbo: soportar dos
relaciones no equivale a soportar dos autoridades. La selección SQL de sesión citada sólo filtra `pm.active`;
no usar sin contrato adicional como comprobación de expiración/status del acceso departamental.

La vista actual es más determinista que la descrita previamente, pero no más explícita: el bridge se ordena por
`updated_at DESC`, después `created_at DESC`, luego ID. En B, actualizar metadata de SEO puede modificar el Space
por defecto de un usuario de Diseño. La membership primaria no gana frente a un bridge encontrado. En A′, conceder
una membership SEO tampoco desplaza el `client_id` de Diseño. La selección de contexto debe ser independiente
de la fecha de edición de una entidad.

## 3. Insights: controles que sí funcionan y frontera ausente

Camino de lectura real:
`src/app/api/platform/app/insights/reports/route.ts:7` → `runAppReadRoute` →
`src/lib/api-platform/resources/app-insights-read.ts:32–40` → `resolveScope` →
`src/lib/efeonce-insights/readers/index.ts:35–52` → `assertInsightsAccess` → stores por Organization.

`src/lib/efeonce-insights/authz.ts:120–148` aplica tres barreras reales:

1. Cliente sólo puede targetear su Organization; otra org devuelve not_found.
2. Capability propia por verbo; internos también deben tener capability tenant. Ser interno no concede todo.
3. Consulta vigente de `insights_v1` por Organization (`:95–111`), activo/pilot, sin fin y sin expiración.

La pérdida de Space en `app-insights-scope.ts:19–37` **no equivale a bypass cross-org**: el gate posterior
sí rechaza otro organizationId. El problema es más preciso: Diseño y SEO comparten el mismo organizationId.
No hay campo Space en `InsightsAccessInput`/grant (`authz.ts:73–87`) ni ReaderScope (`readers/index.ts:21–25`).
Dos clientIds A′ continúan produciendo la misma autoridad de org y consultando los mismos reports/editions.

Condiciones para lectura cruzada departamental: sesión cliente válida, Organization SKY, módulo Insights
vigente y un reporte/edición de audiencia client perteneciente a SKY. `entitlements/runtime.ts:3326–3333`
concede read a cualquier tenant cliente. Para crear, exige manager/executive (`:3335–3343`); para compartir,
executive (`:3345–3356`). Por tanto, no todos pueden escribir/compartir, pero los roles tampoco son por Space.

La audiencia constituye otra barrera útil: `readers/index.ts:61–83` fuerza client y valida visibilidad de detalle;
no es sinónimo de departamento. `readInsightReport` verifica Organization e ID, pero lista ediciones de todo ese
reporte en la organización. No inferir seguridad de URL porque el reporte tenga un título “SKY SEO”.

Writes y exports siguen el mismo límite:

- `commands/create-edition.ts:58` autoriza create; necesita sumar Space permitido y verificar pertenencia de report.
- `render/commands.ts:136–143` autoriza create y audiencia; retry/cancel revalidan vía `:262`.
- `render/readers.ts:75–86` revalida read; Space no participa en el contrato de salida.
- `sharing/commands.ts:116–145` requiere flag, capability share y edición compartible; persiste org+edition.
- Descarga pública `/api/public/insights/shared/[token]/outputs/[output]/route.ts:19–40` llama al proxy, no entrega URL
  del bucket. `sharing/public.ts:115–142` valida token, rate limit, org activa, módulo, audience client, estado issued,
  expiración y revocación del grant. Son protecciones reales; **no revalida membership del creador**.

Por ello retirar un grant departamental debe tener una política explícita sobre enlaces existentes. No asumir
que desactivar una membership revoca exports publicados. Un archivo ya descargado permanece fuera del sistema;
el rollback de acceso no deshace una distribución previa.

## 4. Account360: reachability demostrada, no sólo cache hipotética

`src/app/api/organization/[id]/360/route.ts:11–42` sólo exige tenant y transmite roles/tipo/org al resolver.
No exige internal. Es distinto de `/api/organizations/[id]/route.ts:9`, cuyo GET sí exige internal.

`src/lib/account-360/account-complete-360.ts:124–146` resuelve todos los Spaces/clients y luego autoriza facets.
El scope (`resolve-scope.ts:20–27`) incluye todos los Spaces activos de SKY, sin membership del actor.
El executive de SKY recibe identity/spaces/team/delivery/services de toda la organización por diseño de la matriz
(`facet-authorization.ts:100–118`). Ya eso impide usar el endpoint como vista departamental sin adaptación.

Hallazgo adicional reproducido: `facet-authorization.ts:100–146` no cierra la rama cliente same-org no executive.
Cliente manager/specialist cae al default interno; la función devolvió:

Precondición: `organizationId` presente e igual. `get-tenant-context.ts:93–95` lo conserva desde sesión y la ruta
360 lo transmite. Si es null cae en la rama cross-org (identity), por lo que no se afirma fallo para toda sesión.

| Entrada local real | Facets solicitados | Permitidos actuales |
|---|---|---|
| client_manager, same-org | identity, spaces, crm, aeo, finance | identity, spaces, crm, aeo |
| client_executive, same-org | mismos | identity, spaces |
| client_manager, otra org | mismos | identity |

CRM no tiene un segundo gate de actor: `facets/crm.ts:52–70` consulta compañía con hubspotCompanyId del scope.
AEO `facets/aeo.ts:16–29` obtiene el agregado operador y selecciona la org; su comentario remite al gate del
workspace, pero la ruta 360 directa no pasa por esa projection. Esta prueba no requiere activar dos Spaces.
El endpoint sigue negando Finance al manager; no se está afirmando acceso universal ni acceso cross-org a CRM.

La caché tampoco suplanta por sí sola los gates: `account-complete-360.ts:169–198` autoriza antes de consultar
cache; una facet denegada no se obtiene sólo por estar caliente. Sin embargo la clave es org/facet, y el dato es
agregado org. Añadir filtro de Space después sin cambiar contrato/clave produciría contaminación entre contextos.
Mantener esta vista como consolidado interno es válido; hacerla departamental exige endpoint/proyección explícita.

## 5. Revocación y dos pestañas

Cookie: si el refresh encuentra tenant inactivo/ausente, `auth.ts:797–803` sólo actualiza timestamp y conserva
claims previos; `getTenantContext` no comprueba active. En los caminos Insights/360 inspeccionados no existe otro
gate de usuario activo. Revocar sólo `person_memberships` tampoco impide el bridge derivado de client.
No presentar esto como una ventana máxima de cinco minutos: esa rama puede conservar claims en refrescos sucesivos,
hasta expiración/cierre u otra invalidación. Si se retira módulo Insights, su comprobación DB sí bloquea ese dominio.

App bearer propio sí deniega sesión revocada, vencida y usuario desactivado por request (`app-sessions.ts:98–126`).
No acredita aislamiento Space: usuario activo y membership SEO retirada continúan requiriendo comprobación nueva.

Dos pestañas deben portar contexto explícito por request, intersectado server-side con grants y con el propietario
del recurso. Un selector global que cambia cookie `activeSpace` no basta: un formulario viejo de Diseño enviado
después de seleccionar SEO no debe escribir en SEO. Expected Space/recurso/version deben concordar o fallar;
nunca reinterpretar silenciosamente una intención antigua usando el último contexto global.

## 6. Matriz de cambio mínimo

| Cambio | A′ (client por Space) | B (client compartido) | Clasificación |
|---|---|---|---|
| Principal único + grants explícitos por Space/rol, lifecycle y revocación | Necesario | Necesario | Obligatorio; memberships de relación no equivalen automáticamente a autoridad |
| Contexto por request, con org/Space/client coherentes; no confiar payload | Derivar client del Space autorizado | Fijar Space y conservar client | Obligatorio |
| Sesión y refresh eligen contexto válido; roles/flags/módulos resueltos coherentemente | Rehidratar por bridge seleccionado | Resolver por Space sin unión de módulos del client | Obligatorio |
| Invitación/grant y selectors | Dejar de usar clientIds[0]; grant a user existente | Selector Space y grant a user existente | Obligatorio |
| Insights ownership + authz + snapshots/jobs/share/export | A′ no ayuda a contratos sólo org | Mismo cambio | Obligatorio para exposición departamental |
| Account360 | Consolidado interno explícito + vista departamental | Igual | Obligatorio separar semánticas; no eliminar consolidado legítimo |
| Reparar fallback same-org no executive y cookie inactive | Sí | Sí | Defectos existentes; no depender de elección puente |
| Cache scoped / invalidación por versión autoridad | Para datos departamentales nuevos | Para todos los readers convertidos | Obligatorio donde el dato depende del scope; no todas las caches globales |
| Convertir todos los readers client-only | No todos; verificar suficientes por bridge | Todos los que deban distinguir Spaces | Diferencia real a cuantificar mediante inventario |
| Selector visual sofisticado / cambio completo del login | Opcional | Opcional | Puede empezar con selector simple y protocolo seguro |

## 7. Diez pruebas de integración propuestas, ejecutables en DB local aislada

Fixture: org SKY; Spaces D/S; persona U con un solo user/profile; grants UD/US independientes; manager UM;
otra org X; módulos activos; ediciones client ED/ES con outputs completados; sesiones cookie/App; clocks controlados.
Ejecutar por handlers reales y commands/stores reales, sin mockear `assertInsightsAccess` ni selectors SQL.

| Caso / entrada | Acción y expectativa contractual |
|---|---|
| 1. U sólo UD, dos Spaces activos | Login → GET reports/editions con contexto D: sólo D; pedir S/ES devuelve 404/403. A′ y B deben producir igualdad semántica. |
| 2. Misma U recibe US | Ejecutar grant canónico; no nuevo usuario/profile/email. Seleccionar S, refresh cookie y resolver App mantienen S; client/modules/flags coherentes. |
| 3. Metadata de S cambia updated_at | Repetir login/refresh de U cuyo default D está fijado. D no cambia; SQL actual B debe quedar demostrado como fallo de control. |
| 4. Invite de Organization con D/S | Handler obliga a elegir Space o target explícito; no selecciona array[0]. Usuario existente recibe grant idempotente, sin elevar roles en D. |
| 5. Manager same-org solicita CRM/AEO | GET /api/organization/SKY/360?facets=crm,aeo,finance: aplicar política cliente explícita y negar facets internas; probar executive y org X como controles. |
| 6. Contextos paralelos | Abrir formulario ED en pestaña D; seleccionar S en otra; POST render/issue/revise ED con expected D. Opera D autorizado o falla conflicto, nunca ES/S. |
| 7. Revocación US, usuario sigue activo | Repetir GET/detail/create/render/share con cookie vieja y App vivo; negar S inmediatamente según contrato, conservar D. Cache precalentada no cambia resultado. |
| 8. Desactivar U | Pasar reloj más de cinco minutos; repetir cookie/App contra Insights y 360. Ambos deniegan. La cookie actual se espera que revele el defecto descrito. |
| 9. Tamper y contexto omitido | Enviar org X, Space S sin grant, combinación org SKY/Space X, y omitir Space siendo multi-Space. Ningún fallback silencioso; no escrituras ni artefactos. |
| 10. Share/descarga y cache | Crear share ES con executive US; retirar US según política definida, revocar share y descargar: deniega antes del bucket. Calentar 360 D/S en ambos órdenes: nunca mezclar datos. |

Sólo la prueba pura de matriz se ejecutó en esta revisión. Las diez pruebas DB/HTTP son criterio de aceptación
propuesto, no resultados conseguidos. Conviene incluirlas en la próxima unidad común antes de comparar A′/B.

## 8. Migración, rollback y recomendación

Inventariar primero usuarios/grants, client-bridges, informes/ediciones/links existentes y valores de contexto.
No reclasificar una edición histórica sólo porque su org obtenga otro Space. Backfill con evidencia y política
explícita; lo ambiguo permanece interno/no distribuible hasta resolver, conservando trazabilidad de Diseño.

Expandir schema/adapters de forma compatible, probar shadow-read en DB local, luego comparar A′/B con el mismo
principal y las mismas intenciones HTTP. El rollback debe conservar IDs/grants y suspender el acceso nuevo;
no borrar el client A′ o Space S si tiene referencias. Revertir código mientras quedan cookies, jobs, cache o
shares del contrato nuevo requiere invalidación/versionado; “volver al selector viejo” puede reabrir agregados.

Siguiente paso recomendado: prototipo de autoridad/contexto común que ejerza invitation/grant, refresh cookie,
App bearer, dos pestañas e Insights/360 reales; corregir los dos defectos existentes como unidad separada según
el operating loop. Luego comparar coste de cambiar readers client-only en B frente a provision/comercial en A′.
La decisión no puede basarse en `LIMIT 1` ni en que A′ pase un fixture puro: en las superficies aquí auditadas,
los cambios más importantes son comunes a ambos puentes.
