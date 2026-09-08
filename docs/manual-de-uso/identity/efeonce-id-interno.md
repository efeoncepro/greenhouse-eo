# Acceso corporativo a Efeonce ID

TASK-1836 habilita el acceso del equipo Efeonce al MCP mediante Efeonce ID para una cohorte interna
controlada. El canary corporativo real ya verificó emisión, lectura y revocación; eso no abre el acceso a
cualquier colaborador. No basta con que el correo pertenezca a Efeonce ni con tener una cuenta del portal.

El administrador enrola la identidad corporativa existente y concede permisos concretos con vigencia.
Después, la persona inicia sesión corporativa y aprueba los permisos del cliente MCP que desea conectar.
Cada cliente necesita su consentimiento; iniciar sesión en uno no autoriza a otro. Las acciones sensibles
pueden pedir un factor adicional. La baja de la relación o la revocación del permiso retira el acceso.

La pertenencia de Efeonce como organización propia no requiere registrarla como cliente comercial.
Durante la transición se conserva el acceso Entra existente. La UI de TASK-1835 ya sirve el acceso; las matrices amplias de
clientes reales siguen en TASK-1832 y los acceptance criteria de TASK-1836.

Administradores: seguir [el runbook](../../operations/EFEONCE_INTERNAL_AUTH_ROLLOUT_RUNBOOK_V1.md)
para enrolamiento, permisos, revocación y rollback. No resolver errores creando otra persona por correo.

## Entrar y conectar una aplicación

1. Abre [Efeonce ID](https://auth.efeonce.org/login) y elige **Continuar con Microsoft**. Es el mismo
   botón existente en el diseño de Claude; antes sólo aparecía cuando una app iniciaba OAuth.
2. Completa la autenticación corporativa de Microsoft. El acceso directo vuelve a `/auth/session`,
   donde la sesión se confirma y puedes cerrarla. Tener sesión no concede permisos MCP ni conecta una app.
3. Para conectar una aplicación, inicia la conexión desde esa aplicación. Efeonce ID conserva el retorno
   OAuth, comprueba tu acceso y solicita el consentimiento correspondiente; después vuelve al cliente.
4. Si una acción exige mayor seguridad, completa el factor local admitido (TOTP/passkey con verificación
   de usuario). Microsoft por sí solo no se interpreta como segundo factor nativo en esta versión.

La visibilidad del botón y su inicio de Microsoft se verificaron en el host público a 1440 y 390 px tras
`21aa12608`. La nueva prueba humana completa desde `/login` directo hasta la confirmación de sesión
sigue pendiente; el canary MCP anterior entró desde OAuth. La ruta local `/start` usada en pruebas era
un helper temporal de verificación, no una pantalla del producto ni una URL para usuarios.

Si el botón falta, soporte debe comprobar el flag interno y la revisión servida antes de pedirte
repetir el acceso. Si falla el callback, vuelve a iniciar desde la aplicación o desde `/login`; no
reutilices la URL de callback ni compartas códigos/cookies. El error público es deliberadamente genérico;
soporte dispone de clasificaciones auditadas sin tokens ni claims crudos.

## Elegir organizaciones desde la misma conexión

TASK-1844 certificó el contexto interno v2 el 2026-09-08 para una identidad. Con él, cada lectura SEO indica su
organización y revalida permisos actuales. Una cuenta nueva cubierta por esos permisos aparece al actualizar
`efeonce.organizations.list`; no requiere otro consentimiento ni otra conexión. Un alta de persona sí requiere
enrollment y ampliación de cohorte gobernada. Pasar una conexión v1 a v2 exige autorizarla de nuevo una vez.

Sigue [el manual multiorganización](usar-mcp-interno-multiorganizacion.md) para conectar Codex/Claude, paginar
el listado y diagnosticar denegaciones o `no_entitlement`. Los nombres locales usados en las pruebas no son
obligatorios. Claude hospedado y Desktop comparten el conector remoto. La recuperación tras rollback OFF
puede exigir login otra vez en Claude Code; ese caso no equivale a incorporar una organización.

## Ampliar el acceso al equipo y a clientes

La asignación inicial de Entra a un solo usuario es una cohorte de verificación, no un límite del producto.
Para incorporar más colaboradores, el administrador asigna la misma aplicación corporativa en Entra,
enrola cada identidad canónica elegible y concede permisos personales con vigencia. No requiere otra
aplicación ni cambios de código. En esta fase la administración de enrolamiento/permisos es programática
mediante el command/API del runbook; no se afirma que exista una pantalla administrativa completa.

Los clientes usan el recorrido externo de Efeonce ID y su propia organización, bindings y permisos.
No se les asigna la aplicación corporativa ni se los convierte en empleados de Efeonce. Compartir emisor
no comparte autoridad: la organización o el dominio de correo por sí solos no conceden acceso MCP.
La cohorte inicial v2 ya cuenta con la matriz de TASK-1844; ampliar a otras personas requiere su elegibilidad, consentimiento y verificación proporcional, además de medir latencia y errores del reader según el runbook multiorganización.


## Integridad del acceso corporativo

La pertenencia interna y la membresía cliente siguen recorridos distintos. El diagnóstico
`internal_population` rechaza una identidad corporativa en el recorrido externo; no significa que
la persona carezca de identidad ni justifica crearle una invitación cliente. El acceso corporativo
requiere su sesión y contexto propios, con permisos personales que tengan vencimiento.

La recuperación de un acceso cliente no puede reemplazar el vínculo corporativo activo. Si soporte
encuentra relaciones mezcladas o evidencia auditora incompleta, debe detener la ampliación y aplicar el rollback de la cohorte afectada según el incidente, y
seguir la [regularización gobernada](../../operations/EFEONCE_INTERNAL_AUTH_ROLLOUT_RUNBOOK_V1.md).
Esa reparación conserva permisos y vigencia; no es un mecanismo para conceder o renovar acceso.
