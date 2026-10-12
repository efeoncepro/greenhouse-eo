# Ejecutar desde una sesión de Claude

Qué cambia cuando el método corre en Claude con conectores. Este módulo no concede permisos: investigación,
créditos, CRM, enrollment y envío conservan su autorización separada, igual que en el resto de la skill.

Verificado el **2026-10-12** leyendo las descripciones de los tools del conector Apollo de esa sesión, sin
ejecutar ninguno. Un conector cambia sin aviso: relee la descripción del tool antes de llamarlo y confía en
ella por encima de esta tabla.

## Antes de usar un conector

Los conectores se cargan al iniciar la sesión y pueden faltar o pedir autorización. Comprueba que el tool
existe; si no está, dilo y sigue por lo que sí se puede hacer (fuentes públicas, dossier, hilo vigente).
Que un tool esté disponible no autoriza a usarlo.

## Apollo: qué gasta y qué no

| Paso | Tool | Qué dice su descripción | Uso en este método |
| --- | --- | --- | --- |
| Identificar una empresa | `apollo_organizations_lookup` | Descubrimiento sin costo; devuelve candidatos superficiales (id, nombre, dominio) | Primera opción para resolver la entidad |
| Buscar empresas con detalle | `apollo_mixed_companies_search` | 1 crédito por consulta que devuelve resultados; exige un mensaje de confirmación literal al usuario | Sólo si el pedido necesita ese detalle y hay aprobación de créditos |
| Enriquecer una empresa | `apollo_organizations_enrich` | 1 crédito si la encuentra; exige confirmación con el total | Igual; confirmar el total del lote antes de empezar |
| Buscar personas | `apollo_mixed_people_api_search` | No devuelve correo ni teléfono; el apellido puede venir enmascarado | Sirve para la shortlist de roles. Un resultado no es un contacto accionable |
| Obtener el correo | `apollo_people_match`, `apollo_people_bulk_match` (hasta 10 por llamada) | Enriquecimiento; correos personales apagados por defecto | Requiere aprobación de créditos con finalidad y alcance. Guardar la dirección exacta, su estado, fecha y costo |
| Waterfall o teléfono | parámetros `run_waterfall_email`, `run_waterfall_phone`, `reveal_phone_number` | Asíncronos, costo variable según plan; el resultado sólo se recupera con `apollo_webhook_result_show`, y antes hay que consultar la capacidad en `apollo_users_api_profile` | No iniciar si el tool de resultado no está. Aceptado no es obtenido: reconciliar el resultado antes de darlo por hecho |
| Saldo | `apollo_usage_stats_credit_usage_stats` | Lectura del uso de créditos del equipo | Antes y después de un lote aprobado |

Las respuestas que consumen créditos pueden traer un bloque `mcp_credits` con costo estimado, gasto real y
saldo: muéstraselo al operador. La descripción leída no fija un número de créditos para el match estándar de
personas; toma el costo de ese bloque y del saldo, no de memoria.

Para veinte o más personas rumbo a enriquecimiento, el conector pide decidirlo antes y usar una colección
persistente en vez de encadenar lotes en la conversación. Ese volumen ya es una ola: revisa capacidad y
aprobación en [capacity-and-economics](capacity-and-economics.md) antes de plantearlo.

## HubSpot y Outlook

El carril de HubSpot (CLI, MCP o in-app) lo decide el [manual de carriles](../../../../docs/operations/HUBSPOT_AGENT_CLI_MCP_OPERATOR_V1.md)
junto con la skill de HubSpot; lee el objeto antes de proponer el cambio y reléelo después de escribir.
Borrador y envío por Outlook siguen la [política vigente](../../../../docs/operations/EFEONCE_OUTLOOK_AGENT_SEND_POLICY_V1.md).
Un borrador creado no es un envío.

## Radar personal

`hubspot-saas-prospecting`, con sus IDs HSP, matriz, reporte diario y scheduler, vive en la instalación
personal de Codex. Desde Claude no está: entrega la cuenta con este método y deja su incorporación al radar
como pendiente del operador, sin inventar un ID ni un reporte.
