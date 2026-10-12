# Handoff a CRM y Commercial

La fase de enrichment entrega evidencia y propuesta; las mutaciones pertenecen a HubSpot y requieren el
alcance autorizado. Sales enrichment no ejecuta CRM/outreach: cambiar de fase explícitamente con su owner.
Approval vigente para un lote se reutiliza; no pedir confirmación por segunda vez para sus mismos cambios.
Autorizar «registrar contactos» cubre crear el Contact y asociarlo a una Company que ya existe. Company nueva,
nota de Company, Lead o Deal son escrituras aparte: listarlas en el changeset y pedir su confirmación en esa
misma entrega, sin retener por ello el changeset de los contactos elegibles. Si no se sabe si la Company
existe, declararlo como dependencia a verificar al leer CRM, en una línea y sin desarrollar las dos ramas.

## Registro o reutilización autorizado

1. Leer [HubSpot](../../hubspot-as-a-service/SKILL.md), su [segmentación](../../hubspot-as-a-service/references/prospecting-segmentation.md)
   y su [diccionario/captura por objeto](../../hubspot-as-a-service/references/property-inventory.md),
   y [manual de carriles](../../../../docs/operations/HUBSPOT_AGENT_CLI_MCP_OPERATOR_V1.md). Verificar identidad,
   portal, transporte pedido y diccionario real. El portal Efeonce/Kortex no autoriza otro cliente.
2. Resolver Company, dominio/grupo y posibles Contact/Lead/Deal existentes; documentar IDs. Dedupe por email
   no resuelve un cambio de empleador. Una Company creada vía API puede no deduplicar por dominio.
3. Preparar changeset con valores, asociaciones, notas/fecha de investigación y evidencia. Las cohortes
   fechadas son históricas, sin nuevas asignaciones. Sólo nuevos contactos elegibles;
   objetivo sin correo queda en investigación o nota de Company autorizada. Registrar adyacentes no les atribuye
   la demanda del objetivo. Clasificación local no crea propiedades HubSpot por sí sola.
   Incluir plan por objeto/fase: campos pertinentes conocidos a completar, valores a conservar,
   desconocidos/conflictos pendientes y campos del sistema. Separar requisito operativo, del carril
   y UI/etapa; citar diccionario consultado y lectura actual. No reducir el registro al mínimo de alta
   cuando ya existe evidencia adicional accionable, ni rellenar vacíos sin ella.
4. Ejecutar los objetos/campos aprobados. No crear Deal, enrollment, schema/filtro, fusionar ni borrar porque
   parezca conveniente. Dry-run si existe. Ante respuesta de escritura ambigua, leer estado antes de reintentar.
5. Leer independientemente IDs, email/empresa, propiedades, asociaciones y Primary Company tras automatización.
   Verificar membresía efectiva si se pidió un segmento, no sólo presencia en una lista. Confirmar Lead automático
   antes de crear otro. Un Contact guardado o ACTIVE no demuestra entregabilidad ni calificación.

Correcciones de Primary Company requieren evidencia de empleo/entidad y autorización vigente; un dominio
distinto no implica que haya que cambiarla. Un Contact existente que cambió de empleador y no tiene correo nuevo
se conserva donde está: anotar el cambio como pendiente con fuente y fecha, sin mover Primary Company, sin
asociarlo a la Company nueva y sin usar el correo anterior para contactar; en la empresa nueva rige el gate
normal de correo individual verificado y atribuible. No conservar ni eliminar asociaciones históricas sin analizar su función.

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
fechas de investigación por objeto; no tratar lotes pendientes como nuevos ni asignar una cohorte antigua a todo el radar.

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
