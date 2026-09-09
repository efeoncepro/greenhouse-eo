# Usar MCP interno con varias organizaciones

> **Tipo:** manual de uso · **Actualización:** 2026-09-08, TASK-1844
> **Para:** personas internas enroladas y operadores que les dan soporte
> **Endpoint:** `https://mcp.efeonce.org/mcp`
> **Funcionamiento:** [Acceso MCP interno multiorganización](../../documentation/identity/acceso-mcp-interno-multiorganizacion.md)
> **Contrato técnico:** [Autoridad interna nativa](../../architecture/EFEONCE_INTERNAL_NATIVE_AUTHORITY_DECISION_V1.md#delta-task-1844--autoridad-interna-multiorganización-accepted)
> **Administración y rollback:** [Runbook TASK-1844](../../operations/TASK-1844_INTERNAL_MULTI_ORG_ROLLOUT.md)

Conecta una vez cada cliente MCP que uses. Después, elige una organización autorizada para cada consulta.
Si Greenhouse incorpora otra organización y tus permisos la cubren, actualiza el listado: no necesitas
reconectar, crear otra credencial ni volver a consentir por esa organización.

## Antes de empezar

Necesitas una identidad corporativa canónica, enrollment interno y permisos vigentes, y pertenecer a una
cohorte habilitada para v2. El cierre del 2026-09-08 certificó una identidad; no habilitó a todo el tenant.
Para incorporar a otra persona, el operador sigue el [runbook de acceso interno](../../operations/EFEONCE_INTERNAL_AUTH_ROLLOUT_RUNBOOK_V1.md)
y el [gate de ampliación multiorganización](../../operations/TASK-1844_INTERNAL_MULTI_ORG_ROLLOUT.md).

La conexión usa OAuth de Efeonce ID y el permiso base `efeonce.mcp.read`. En esta entrega sirve lectura SEO;
no autoriza escrituras ni gasto. No necesitas un token de consumer, un client secret ni copiar credenciales
de otra persona. El MCP privado de Greenhouse y sus variables de servicio tienen otro propósito.

## Conectar un cliente por primera vez

Revisa primero las conexiones existentes. Los nombres siguientes son los usados durante la certificación y
ejemplos de configuración local, no nombres obligatorios del protocolo. Si ya existe una conexión al mismo
endpoint, identifica su cuenta y propósito antes de crear otra o reemplazarla.

### Codex

En una terminal local, la sintaxis disponible en Codex `0.153.4` es:

```bash
codex mcp add efeonce --url https://mcp.efeonce.org/mcp
```

Completa el OAuth que inicie el cliente. Si la configuración ya existe y requiere autenticación:

```bash
codex mcp login efeonce --scopes efeonce.mcp.read
```

No repitas `add` sobre una configuración existente. Abre una sesión que cargue esa conexión y verifica una
llamada real con los pasos de uso diario. Un estado «conectado» no acredita acceso a una organización.

### Claude Code

Para un registro nuevo, la sintaxis disponible en Claude Code `2.1.263` es:

```bash
claude mcp add --transport http efeonce-internal https://mcp.efeonce.org/mcp -s user
claude mcp login efeonce-internal
```

Ejecuta `login` en una terminal interactiva y completa OAuth en el navegador. Si tu registro usa otro nombre,
sustituye `efeonce-internal` por ese nombre. La certificación también empleó una configuración restringida y
un puerto de callback propio; esos detalles de prueba no son un requisito para todo usuario.

### Claude hospedado y Desktop

En la administración de conectores de Claude, configura un conector remoto con la URL canónica y completa
la autenticación que abra Efeonce ID. El nombre usado en la certificación fue **Efeonce MCP**. Usa el conector
desde una conversación que lo tenga disponible y verifica una lectura real. Si una sesión conserva el catálogo
anterior, abre una conversación nueva antes de reconstruir la conexión.

Web y Desktop compartieron ese conector remoto y la familia OAuth. No los trates como credenciales
independientes. En TASK-1844, Claude hospedado no permitió dos conectores para la misma URL: el operador
autorizó reemplazar solamente su conexión del canary anterior. **Esa excepción no autoriza a retirar otros
canaries o conectores.** Si otro registro ocupa la URL, conserva su evidencia y solicita la decisión sobre
ese registro exacto antes de reemplazarlo.

### Completar Efeonce ID

1. Inicia la conexión desde el cliente MCP para conservar su retorno OAuth.
2. Usa el acceso corporativo de Microsoft que ofrece Efeonce ID y completa la autenticación solicitada.
3. Revisa la aplicación y el permiso de lectura. En v2, el consentimiento explica que el acceso a las
   organizaciones sigue tus permisos vigentes.
4. Vuelve al cliente y ejecuta el listado de organizaciones y una lectura autorizada.

La sesión corporativa del navegador puede evitar repetir Microsoft. No equivale a consentimiento para todos
los clientes. Si vienes de v1, necesitas una autorización v2 nueva una vez por cliente; renovar v1 no la eleva.
Nunca compartas URLs de callback, códigos, tokens, cookies o contraseñas en el chat o en un ticket.

## Uso diario

Puedes pedir al asistente:

> Usa Efeonce MCP para listar las organizaciones que tengo autorizadas. Consulta el listado completo y
> muéstrame los nombres e IDs para elegir. No ejecutes escrituras ni operaciones que gasten presupuesto.

La herramienta canónica es `efeonce.organizations.list`. Por ejemplo:

```json
{ "limit": 20 }
```

La respuesta devuelve `organizations` con `organizationId`, `organizationName` y `capabilities`, más
`nextAfterOrganizationId`. Si este último no es `null`, el asistente debe pasarlo como `afterOrganizationId`
en la página siguiente. El máximo es 50 por página; no es un máximo de organizaciones por persona. Si el ID
del cursor perdió autorización, reinicia el listado sin cursor. No inventes otro cursor ni explores IDs ocultos.

Después, indica la organización y solicita una consulta:

> Para la organización que elegí, usa su `organizationId` devuelto por el listado y consulta
> `get_seo_entitlement`. Explícame si tiene el módulo SEO y conserva sus estados de bloqueo tal como llegan.

Cada llamada que opera sobre una organización lleva **su `organizationId` explícito**. Usa el ID exacto
devuelto por discovery; no lo deduzcas del nombre, dominio, organización ancla del login o de una consulta
anterior a otra cuenta. Para comparar dos organizaciones, ejecuta una lectura independiente por cada ID.

Una lectura autorizada no garantiza que haya datos ni que el módulo esté contratado. Mantén separadas las
respuestas «sin módulo», «sin datos», «sin permiso» y «servicio no disponible». La lectura de datos existentes
no autoriza activar mediciones, seguir keywords, crear auditorías ni comprometer presupuesto.

## Cuando se suma una organización

El operador debe verificar en las superficies y commands canónicos de Greenhouse:

1. Organización activa y espacios activos ligados al cliente correspondiente.
2. Identidad interna única y vigente, con roles y permisos efectivos aplicables.
3. Relación de administración admitida o asignación vigente del miembro al cliente.
4. Permiso de lectura en plataforma y en **todos** los espacios activos de esa organización.

Un administrador interno puede cubrir una cuenta nueva por su autoridad global, siempre que las demás
condiciones y los permisos efectivos lo permitan. Un miembro asignado no recibe automáticamente todas las
cuentas nuevas: necesita la asignación correspondiente. Un espacio denegado impide la lectura agregada de la
organización, aunque otro espacio esté permitido.

Cuando la configuración esté vigente, pide de nuevo `efeonce.organizations.list` y usa el nuevo ID. No añadas
la organización a un token, a un scope OAuth, a la configuración del conector ni a la cohorte del issuer: esa
cohorte contiene **personas**, no cuentas. La organización puede ser consultable y seguir sin módulo SEO;
contratar o habilitar el módulo es una decisión distinta.

## Resolver problemas

| Lo que observas | Qué comprobar y hacer |
| --- | --- |
| La organización nueva no aparece | Actualiza el listado y recorre sus páginas. El operador verifica estado, espacios, vínculos, asignaciones, vigencia y permisos efectivos. Reconectar no concede lo que falta. |
| `ok: true`, `hasModule: false`, `blockedReason: no_entitlement` | Se pudo consultar el estado; falta el módulo SEO. No es un fallo de autenticación y no concede gasto. |
| `authorization_denied` o rechazo de una organización | Verifica el ID y la autoridad actual. Un ID ausente, inválido, retirado o sin permiso se deniega. No pruebes otros IDs para evadirlo. |
| Cursor rechazado después de un cambio de permisos | Repite `efeonce.organizations.list` sin `afterOrganizationId`. |
| Faltan tools o la sesión conserva un catálogo anterior | Revisa que usas la conexión interna v2 y una sesión que la cargue. Pide el catálogo servido; su tamaño depende de la autoridad. No amplíes scopes para igualar el inventario global. |
| Vence normalmente el access token | Permite la renovación estándar del cliente. Si sigue pidiendo autenticación, revisa la autorización/sesión y los gates antes de repetir OAuth. |
| «Needs authentication», «needs-auth», `invalid_token` o `invalid_grant` | Puede haber revocación, sesión no válida o gates apagados. Soporte confirma el servicio y el estado de autorización; después inicia login desde el cliente si corresponde. No reutilices callbacks. |
| Error de resolución DNS, timeout o reader no disponible | Verifica conectividad y salud con soporte. Una ronda sin llamadas reales no demuestra un problema de permisos ni justifica crear credenciales nuevas. |

La renovación requiere familia, contexto y autoridad vigentes, y sesión no revocada. El vencimiento de la
cookie del navegador no equivale por sí solo al retiro de una familia ya consentida.

Si se retiró el acceso solamente a una organización, las otras pueden seguir funcionando con la misma
conexión. Si se revocó toda la autorización, necesitarás recuperar la elegibilidad y autorizar nuevamente.
No uses la eliminación del conector como primer paso de diagnóstico.

### Recuperación después de rollback

El operador aplica el [runbook de rollback](../../operations/TASK-1844_INTERNAL_MULTI_ORG_ROLLOUT.md), verifica
la restauración de los servicios y conserva las conexiones que sigan siendo válidas. En el ensayo del
2026-09-08, Codex volvió a leer con su familia existente. Claude Code mantuvo `needs-auth` incluso tras
reiniciarlo; se recuperó con:

```bash
claude mcp login efeonce-internal
```

Completa OAuth en terminal interactiva y verifica una lectura real después. Este paso responde al rollback
OFF de la plataforma; **no se requiere cada vez que cambia el listado de organizaciones**.

## Evidencia y alcance de este manual

Los comandos de alta/login se contrastaron con la ayuda de los CLIs instalados. La certificación productiva
del 2026-09-08 se conserva en [QA](../../audits/mcp/TASK-1844_INTERNAL_MULTI_ORG_QA_2026-09-08.md),
[clientes definitivos](../../audits/mcp/TASK-1844_FINAL_CLIENTS_2026-09-08.json),
[rollback](../../audits/mcp/TASK-1844_ROLLBACK_RESTORE_2026-09-08.json) y
[retiro de fixtures](../../audits/mcp/TASK-1844_FIXTURES_RETIRED_2026-09-08.json).
Los registros de prueba están retirados; no reutilices sus IDs para uso diario. La cifra de 14 organizaciones
al cierre es histórica y debe refrescarse mediante discovery.

La ampliación a más personas o más tráfico requiere medir capacidad y latencia con el operador. Este manual
no ejecuta ese rollout ni convierte la certificación inicial en acceso general para el equipo o los clientes.
