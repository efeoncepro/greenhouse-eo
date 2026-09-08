# Acceso MCP interno a varias organizaciones

> **Tipo:** documentación funcional · **Actualización:** 2026-09-08, TASK-1844
> **Manual:** [Usar MCP interno multiorganización](../../manual-de-uso/identity/usar-mcp-interno-multiorganizacion.md)
> **Contrato técnico:** [Autoridad interna nativa, D8–D11](../../architecture/EFEONCE_INTERNAL_NATIVE_AUTHORITY_DECISION_V1.md#delta-task-1844--autoridad-interna-multiorganización-accepted)
> **Operación y rollout:** [Runbook TASK-1844](../../operations/TASK-1844_INTERNAL_MULTI_ORG_ROLLOUT.md)

Una persona del equipo conecta Codex o Claude a Efeonce MCP y puede trabajar con las organizaciones que
Greenhouse le permite consultar en ese momento. Mantiene una conexión por cliente MCP; no necesita una
conexión, un token ni un consentimiento adicional por cada organización.

## Disponibilidad y alcance

La certificación del 2026-09-08 cerró TASK-1844 para **una identidad interna**, con lectura SEO mediante
`growth.seo.observation.read` y scope base `efeonce.mcp.read`. Codex, Claude Code y Claude hospedado/Desktop
ejecutaron lecturas reales. Se verificaron renovación de tokens, denegaciones, revocación y rollback.
El [registro de QA](../../audits/mcp/TASK-1844_INTERNAL_MULTI_ORG_QA_2026-09-08.md) conserva versiones,
resultados y límites; es evidencia fechada, no un monitor del estado actual.

Después de retirar los datos de prueba, la identidad certificada podía listar 14 organizaciones. Ese número
es una observación del cierre, no una cuota ni una lista fija. El acceso sigue los permisos actuales.

Esta entrega no habilita a todo el equipo, no concede autoridad universal sobre Efeonce y no abre escrituras,
gasto, administración de acceso, Finance, Hiring o Globe por usar el mismo conector. La superficie del servidor
puede contener otras capacidades; su existencia no demuestra que esta conexión esté autorizada a usarlas.

## Qué decide el acceso

Greenhouse comprueba dos cosas diferentes en cada llamada: la autoridad de la persona que actúa y su permiso
sobre la organización elegida. La conexión conserva la identidad y el consentimiento del actor; la
organización objetivo se indica con `organizationId` en cada lectura.

Para resolver un objetivo, deben existir una organización y sus espacios activos, el vínculo canónico de
esos espacios con el cliente interno de Greenhouse, una identidad interna inequívoca y vigente, una relación
admitida con la organización y la capability de lectura efectiva. Se consideran los roles vigentes y los
overrides aprobados. Un nombre de empresa, un dominio de correo o el texto «administrador» no bastan.

| Relación de la persona | Resultado para organizaciones nuevas |
| --- | --- |
| Administrador interno con autoridad global y permisos efectivos suficientes | Puede abarcarlas sin asignación individual cuando cumplen las condiciones canónicas y todos sus espacios activos admiten la lectura. Un override de denegación puede impedirla. |
| Miembro interno asignado a la cuenta | Requiere asignación activa y vigente al cliente correspondiente y permisos efectivos en los espacios implicados. La incorporación de una organización no lo asigna automáticamente. |
| Interno sin relación o permisos suficientes | La organización no aparece como autorizada y su lectura se deniega. |
| Persona externa | Conserva su propio binding y grants; este acceso multiorganización interno no la incluye. |

La lectura es agregada por organización. **Tener acceso a un espacio no concede acceso a los demás:** deben
autorizarla todos los espacios activos que componen el objetivo. Una configuración parcial o ambigua se
deniega; no se completa escogiendo el primer espacio permitido.

## Qué ocurre al incorporar otra organización

El operador registra y activa la organización y sus relaciones canónicas, y asigna el equipo o los permisos
que correspondan. Cuando esos hechos están vigentes, el siguiente listado autorizado puede incluirla. La
persona continúa usando su conexión actual y el ID devuelto por ese listado.

No hay un directorio fijo de organizaciones dentro del token que haya que renovar para añadir una. Tampoco
se crea un scope OAuth por organización ni un grant externo ficticio por cada cuenta interna. La operación
diaria escala mediante las relaciones y los permisos que Greenhouse ya administra.

La lista de una conversación puede haber quedado desactualizada. Volver a llamar
`efeonce.organizations.list` obtiene una fotografía nueva. El listado admite páginas de hasta 50 resultados y
devuelve un cursor para continuar; no muestra un total global ni organizaciones ocultas. Cada lectura posterior
vuelve a verificar la autoridad, aunque el ID figurara en una página anterior.

## Cuándo se necesita autorizar de nuevo

| Cambio | Acción de la persona |
| --- | --- |
| Nueva organización cubierta por sus permisos | Actualizar el listado; usar la conexión existente. |
| Alta, cambio o retiro de acceso a una organización dentro del alcance consentido | Actualizar el listado; las llamadas posteriores usan los nuevos permisos. |
| Vencimiento normal de un access token | El cliente realiza la renovación estándar mientras familia, contexto y autoridad sigan vigentes y la sesión no esté revocada. Vencer la cookie del navegador no equivale a revocar esa familia. |
| Paso de una conexión interna v1 a v2 | Autorizar de nuevo una vez en cada cliente. Una renovación v1 no la convierte silenciosamente en v2. |
| Nuevo cliente MCP, autorización revocada, sesión que exige autenticación o nueva clase de acción | Completar el recorrido OAuth aplicable. Un consentimiento nuevo no reemplaza los permisos que deba conceder el operador. |
| Rollback OFF y posterior restauración | Seguir el diagnóstico del cliente. En el ensayo de TASK-1844, Codex se recuperó con su familia; Claude Code requirió login OAuth de nuevo. |

Un retiro selectivo impide las siguientes resoluciones de esa organización sin desconectar las demás. La
revocación de la autorización de la persona puede afectar toda la conexión. La certificación verificó
denegaciones dentro de 60 segundos; no promete cancelar retroactivamente una llamada que ya había sido
autorizada antes de la revocación.

## Acceso a una organización y módulo SEO son decisiones distintas

`get_seo_entitlement` permite conocer el estado del módulo de una organización autorizada. Una respuesta con
`ok: true`, `hasModule: false` y `blockedReason: no_entitlement` significa que se pudo consultar ese estado y
que el módulo SEO no está asignado. No es un error de login, no exige reconectar y no concede presupuesto.

`authorization_denied` indica que la llamada no está autorizada. Un ID ausente o inválido también se rechaza;
no se sustituye por la organización ancla de la persona. Si el cliente muestra «necesita autenticación», hay
que revisar la sesión/autorización y el estado del servicio antes de asumir que faltan permisos sobre una
organización. El [manual](../../manual-de-uso/identity/usar-mcp-interno-multiorganizacion.md#resolver-problemas)
separa esos casos.

## Incorporar personas y ampliar capacidad

Agregar una organización a una operación existente es distinto de incorporar a otra persona. Cada nuevo
usuario necesita identidad canónica, elegibilidad corporativa, enrollment y permisos vigentes; la activación
de su cohorte y el consentimiento por cliente se gobiernan con los runbooks internos. No basta copiar la
configuración de quien ya tiene acceso.

La arquitectura evita multiplicar conexiones por cuenta y revalida cada solicitud sin caché positiva de
permisos. Eso no acredita una capacidad ilimitada. Antes de ampliar la cohorte o el tráfico, operación debe
medir latencia y errores del reader y verificar su presupuesto y aislamiento según el runbook. La certificación
inicial no midió un p95 global ni convierte un harness de revocación en una señal continua.

## Relación con otros recorridos

- [Acceso corporativo a Efeonce ID](../../manual-de-uso/identity/efeonce-id-interno.md): sesión, enrollment y autorización de una aplicación.
- [Binding de identidad externa](binding-identidad-externa-mcp.md): acceso de clientes externos y canary sintético separado.
- [Search Visibility 360 por MCP](../growth/search-visibility-360-por-mcp.md): significado de los datos SEO; cada herramienta conserva sus propios permisos.
- [Uso diario y diagnóstico](../../manual-de-uso/identity/usar-mcp-interno-multiorganizacion.md): conexión inicial, selección de organización y recuperación.

Claude hospedado y Desktop compartieron el mismo conector remoto en la certificación; no constituyen dos
familias OAuth independientes. Se sustituyó únicamente la conexión hospedada del canary que el operador
autorizó. El resto de TASK-1832 conserva su ciclo de observación y retiro; este cierre no acredita siete días
ininterrumpidos de observación de aquella conexión hospedada.
