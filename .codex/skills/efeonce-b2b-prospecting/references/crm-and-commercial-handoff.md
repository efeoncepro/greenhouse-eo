# Handoff a CRM y Commercial

La fase de enrichment entrega evidencia y propuesta; las mutaciones pertenecen a HubSpot y requieren el
alcance autorizado. Sales enrichment no ejecuta CRM/outreach: cambiar de fase explícitamente con su owner.
Approval vigente para un lote se reutiliza; no pedir confirmación por segunda vez para sus mismos cambios.

## Registro o reutilización autorizado

1. Leer [HubSpot](../../hubspot-as-a-service/SKILL.md), su [segmentación](../../hubspot-as-a-service/references/prospecting-segmentation.md)
   y [manual de carriles](../../../../docs/operations/HUBSPOT_AGENT_CLI_MCP_OPERATOR_V1.md). Verificar identidad,
   portal, transporte pedido y diccionario real. El portal Efeonce/Kortex no autoriza otro cliente.
2. Resolver Company, dominio/grupo y posibles Contact/Lead/Deal existentes; documentar IDs. Dedupe por email
   no resuelve un cambio de empleador. Una Company creada vía API puede no deduplicar por dominio.
3. Preparar changeset con valores, asociaciones, notas/cohorte y evidencia. Sólo nuevos contactos elegibles;
   objetivo sin correo queda en investigación o nota de Company autorizada. Registrar adyacentes no les atribuye
   la demanda del objetivo. Clasificación local no crea propiedades HubSpot por sí sola.
4. Ejecutar los objetos/campos aprobados. No crear Deal, enrollment, schema/filtro, fusionar ni borrar porque
   parezca conveniente. Dry-run si existe. Ante respuesta de escritura ambigua, leer estado antes de reintentar.
5. Leer independientemente IDs, email/empresa, propiedades, asociaciones y Primary Company tras automatización.
   Verificar membresía efectiva si se pidió un segmento, no sólo presencia en una lista. Confirmar Lead automático
   antes de crear otro. Un Contact guardado o ACTIVE no demuestra entregabilidad ni calificación.

Correcciones de Primary Company requieren evidencia de empleo/entidad y autorización vigente; un dominio
distinto no implica que haya que cambiarla. No conservar ni eliminar asociaciones históricas sin analizar su función.

Para selección target, fit ICP, roles o mapas por iniciativa, cargar el
[adapter account-based de HubSpot](../../hubspot-as-a-service/references/account-based-prospecting.md).
Usa diccionario efectivo y cambios mínimos preservando multiselect; separa capability API/CLI/UI y
representación global vs iniciativa. Es guía operativa, no un wrapper nuevo ni CRUD demostrado del gráfico.

## Entregar una siguiente decisión

Usar [action-pack](../templates/action-pack.md): owner, cuenta/IDs, evidencia, relación por persona, necesidad,
rutas, borrador/prueba, vigencia, brechas, next step y autoridad. Commercial recibe discovery/qualification,
propuesta y negociación; el seguimiento existente recibe hilo, tarea y compromiso real. No crear otro scheduler.

Estados se informan separados: investigada, elegible, changeset preparado, aprobado, escrito, leído de vuelta,
borrador preparado, enviado, registrado; sólo afirmar los observados. Reutilizar aprobaciones/historia HSP y
cohortes actuales; no tratar lotes pendientes como nuevos ni asignar una cohorte antigua a todo el radar.

## Sales como apoyo disponible

Descubrimiento/identificación → Sales enrichment; destinatario identificado y enfoque/borrador → company
research; oportunidad activa → deal strategy; caso de valor → business case; llamada realizada → follow-up.
Releer índice/skill seleccionada y dependencias vigentes, preservando el contrato Efeonce. No copiar los módulos
del plugin, fijar su cache/version como instalación universal ni confundir placeholders con disponibilidad.
Si Sales no está instalado, continuar con owners locales y documentar el límite; no bloquear el trabajo por
la ausencia del plugin. Live state sólo por su fuente real; exports/fixtures cubren el alcance declarado.

Si una fase Sales exige Sales Intelligence y falta evidencia equivalente, su bloqueo aplica a esa fase
nativa: no sustituir discovery del provider por búsqueda web amplia o CUA. Entregar el avance local sustentado
y la dependencia pendiente. Crear, revisar o evaluar la skill con docs/fixtures no requiere ese conector.
