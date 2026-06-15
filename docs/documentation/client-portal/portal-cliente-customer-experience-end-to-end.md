# Portal Cliente y Customer Experience end-to-end

> **Tipo de documento:** Documentacion funcional
> **Version:** 1.0
> **Creado:** 2026-06-15 por Codex
> **Modulo:** Portal Cliente / Customer Experience
> **Rutas principales:** `/home`, `/analytics`, `/campaigns`, `/updates`, `/notifications`, `/settings`, `/knowledge`, `/api/client-portal/*`, `/api/admin/client-portal/*`
> **Arquitectura relacionada:** `docs/architecture/GREENHOUSE_CLIENT_PORTAL_ARCHITECTURE_V1.md`, `docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md`, `docs/architecture/GREENHOUSE_CLIENT_ONBOARDING_PROVISIONING_V1.md`, `docs/architecture/MULTITENANT_ARCHITECTURE.md`

## Estado de verificacion

Este documento fue reconciliado el 2026-06-15 contra codigo, arquitectura, schema/migrations y DB viva con datos agregados sin PII. La conexion Postgres respondio desde `greenhouse_app` con usuario runtime `greenhouse_app` a las 2026-06-15 10:50 UTC. Evidencia revisada: `src/lib/client-portal/**`, rutas `src/app/api/client-portal/**`, rutas admin `src/app/api/admin/client-portal/**`, migraciones `greenhouse_client_portal.*` y specs citadas arriba.

Snapshot DB agregado del ambiente consultado:

- `greenhouse_client_portal.modules`: 10 modulos activos (`effective_to IS NULL`).
- `greenhouse_client_portal.module_assignments`: 0 asignaciones activas por estado en este ambiente.
- `greenhouse_client_portal.module_assignment_events`: 0 eventos.

Interpretacion: el catalogo runtime existe y esta sembrado; este ambiente no muestra asignaciones cliente activas en el momento de la consulta.

## Que es

Portal Cliente es la capa BFF y de experiencia cliente de Greenhouse. No es el dueno de payroll, finance, delivery, knowledge ni account data; compone esas capacidades para un usuario cliente autenticado, con tenant y organizacion resueltos desde sesion.

La regla central es: un cliente ve una experiencia adaptada por rol, vistas asignadas, modulos activados y estado real de datos. Si falta un modulo o una fuente esta degradada, el portal debe mostrar un estado honesto en vez de inventar datos.

## Modelo mental

- **Usuario cliente:** persona externa con route group `client` y rol de vista como `client_executive`, `client_manager` o `client_specialist`.
- **Organizacion cliente:** scope operativo que delimita lo que el usuario puede ver. Las APIs no deben aceptar IDs arbitrarios que permitan mirar otra cuenta.
- **Vista cliente:** entrada de `view_registry` como `cliente.pulse`, `cliente.analytics`, `cliente.campanas`, `cliente.notificaciones` o `cliente.modulos`.
- **Modulo cliente:** capacidad vendible o activable en `greenhouse_client_portal.modules`, con `module_key`, `applicability_scope`, `view_codes`, `capabilities`, `data_sources` y `pricing_kind`.
- **Asignacion de modulo:** fila en `greenhouse_client_portal.module_assignments` que conecta una organizacion con un modulo, estado y metadata.
- **Evento de asignacion:** log append-only en `greenhouse_client_portal.module_assignment_events` para auditoria.
- **Resolver server-side:** capa canonica que decide menu, estados y acceso con base en sesion, asignaciones, vistas y data readiness.

## Que hace automatico Greenhouse

- Resuelve el tenant/organizacion del usuario desde la sesion antes de leer datos.
- Construye el menu cliente desde vistas y modulos disponibles, no desde una lista estatica por business line.
- Aplica page guards resolver-based en las rutas cliente para evitar que una URL directa salte el contrato de acceso.
- Cachea resoluciones del portal por proceso cuando aplica, y las invalida al cambiar asignaciones.
- Distingue estados visuales: normal, zero-state recien activado, not assigned, degraded parcial y error completo.
- Registra eventos cuando se habilita, pausa o deshabilita un modulo desde Admin Center.
- En `enable-module`, valida si el `applicability_scope` del modulo calza con las business lines de la organizacion. Si no calza, exige override con razon.
- Usa Sentry/domain capture `client_portal` para fallas de APIs del dominio.

## Que hace el operador

- Decide comercial u operativamente si un cliente debe tener un modulo activado.
- Habilita, pausa o deshabilita modulos desde las superficies admin del portal cliente.
- Escribe una razon cuando activa un modulo fuera de su aplicabilidad natural.
- Diagnostica reportes de "no veo X" revisando usuario, rol, vista, asignacion de modulo y estado de datos.
- No debe insertar filas manualmente en DB para "hacer aparecer" una ruta. La ruta debe quedar gobernada por role/view/capability/module assignment.

## Superficies principales

- **Home cliente (`/home`):** entrada canonica del portal, con resumen de cuenta, accesos y componentes habilitados.
- **Analytics:** vista cliente para metricas disponibles; debe degradar si la fuente no esta lista.
- **Campaigns/Campanas:** lectura de campanas o iniciativas conectadas al cliente.
- **Updates:** canal de actualizaciones. Arquitectura previa lo marca como placeholder o parcial segun estado del runtime.
- **Notifications:** notificaciones in-app del cliente.
- **Settings:** configuracion visible para el cliente. No debe reemplazar Admin Center.
- **Knowledge:** acceso a conocimiento permitido para ese scope, cuando aplica.
- **Admin Client Portal:** catalogo y asignaciones de modulos, pensado para operadores internos.

## Estados del contrato visual

- **Normal:** el modulo esta asignado, la vista existe, el usuario tiene acceso y hay datos o una pantalla operable.
- **Zero-state:** el modulo fue activado pero aun no hay datos. Se debe explicar proximo paso, no ocultar el modulo.
- **Not assigned:** el cliente no compro o no tiene asignado el modulo. El portal debe mostrar limite claro, no error tecnico.
- **Degraded:** parte de la data source falla o esta atrasada; se muestra lo disponible y la faceta degradada.
- **Error completo:** el portal no puede resolver el modulo o la data minima; se muestra estado de falla y se captura en observabilidad.

## Flujo: habilitar un modulo cliente

1. El operador elige organizacion y modulo en Admin Center.
2. Greenhouse lee el modulo activo desde `greenhouse_client_portal.modules`.
3. Greenhouse valida aplicabilidad contra business lines de la organizacion.
4. Si hay mismatch, el operador debe usar override y registrar una razon suficiente.
5. Greenhouse inserta o actualiza la asignacion en `module_assignments`.
6. Greenhouse registra evento en `module_assignment_events`.
7. Greenhouse invalida cache del resolver.
8. El cliente ve el menu y el estado correcto en su proxima carga.

## Flujo: el cliente entra a una ruta directa

1. La sesion resuelve tenant, usuario, organizacion y route group cliente.
2. El guard de la ruta pregunta al resolver de Portal Cliente si la vista/modulo esta disponible.
3. Si el usuario tiene acceso, se renderiza la pantalla con datos del scope permitido.
4. Si falta asignacion, se muestra not assigned.
5. Si la fuente esta vacia o inicial, se muestra zero-state.
6. Si la fuente falla parcialmente, se muestra degraded.
7. Si hay error real de autorizacion, no se filtra data ni se degrada como si fuera vacio.

## Fronteras importantes

- Portal Cliente no es source of truth de contratos, pagos, payroll, delivery ni HubSpot.
- `module_assignments` no reemplaza `role_view_assignments`: una cosa compra/activa capacidad para una organizacion; la otra gobierna si un rol/usuario puede ver una vista.
- Un rol cliente no debe convertirse en permiso admin.
- Empty state no es permiso: puede haber acceso correcto y cero datos.
- Degraded no es error total: se debe mostrar la parte sana y declarar la fuente afectada.
- Un cliente no debe poder pasar otro `organizationId` por query para ver datos de otra cuenta.

## Preguntas que Nexa debe responder bien

- "Que ve un cliente ejecutivo versus un manager?"
- "Como se activa un modulo del Portal Cliente?"
- "Por que un cliente no ve Analytics?"
- "Que significa not assigned?"
- "Que significa degraded en una vista cliente?"
- "Un zero-state es un error?"
- "Puede un cliente cambiar sus propios modulos?"
- "Cual es la diferencia entre vista, modulo y capability?"

## Referencias de codigo y DB

- `src/lib/client-portal/**`
- `src/lib/client-portal/commands/enable-module.ts`
- `src/app/api/client-portal/modules/route.ts`
- `src/app/api/client-portal/account-summary/route.ts`
- `src/app/api/admin/client-portal/**`
- `migrations/20260512184739712_task-824-client-portal-ddl.sql`
- Tablas: `greenhouse_client_portal.modules`, `greenhouse_client_portal.module_assignments`, `greenhouse_client_portal.module_assignment_events`, `greenhouse_core.view_registry`, `greenhouse_core.role_view_assignments`
