# Acceso corporativo a Efeonce ID

TASK-1836 prepara el acceso del equipo Efeonce al MCP mediante Efeonce ID. La activación operativa
está pendiente: no basta con que el correo pertenezca a Efeonce ni con tener una cuenta del portal.

El administrador enrola la identidad corporativa existente y concede permisos concretos con vigencia.
Después, la persona inicia sesión corporativa y aprueba los permisos del cliente MCP que desea conectar.
Cada cliente necesita su consentimiento; iniciar sesión en uno no autoriza a otro. Las acciones sensibles
pueden pedir un factor adicional. La baja de la relación o la revocación del permiso retira el acceso.

La pertenencia de Efeonce como organización propia no requiere registrarla como cliente comercial.
Durante la transición se conserva el acceso Entra existente. La pantalla de entrada y las pruebas en
clientes reales se completan con TASK-1835 y TASK-1832.

Administradores: seguir [el runbook](../../operations/EFEONCE_INTERNAL_AUTH_ROLLOUT_RUNBOOK_V1.md)
para enrolamiento, permisos, revocación y rollback. No resolver errores creando otra persona por correo.

## Ampliar el acceso al equipo y a clientes

La asignación inicial de Entra a un solo usuario es una cohorte de verificación, no un límite del producto.
Para incorporar más colaboradores, el administrador asigna la misma aplicación corporativa en Entra,
enrola cada identidad canónica elegible y concede permisos personales con vigencia. No requiere otra
aplicación ni cambios de código. En esta fase la administración de enrolamiento/permisos es programática
mediante el command/API del runbook; no se afirma que exista una pantalla administrativa completa.

Los clientes usan el recorrido externo de Efeonce ID y su propia organización, bindings y permisos.
No se les asigna la aplicación corporativa ni se los convierte en empleados de Efeonce. Compartir emisor
no comparte autoridad: la organización o el dominio de correo por sí solos no conceden acceso MCP.
La ampliación real espera consumers compatibles, el canary de la cohorte y la prueba de revocación.
