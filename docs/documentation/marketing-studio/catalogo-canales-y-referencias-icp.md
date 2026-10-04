# Catálogo de canales y referencias ICP en Marketing Studio

**Estado al 2026-10-04:** catálogo v1 publicado con 52 canales en staging y producción de Studio (`main` `74073de`, API 1.6.0). Web y worker operan con validación `warn` e ICP desactivado. El backfill histórico, la autoridad delegada para gobernar el catálogo y la federación MCP siguen pendientes. [Release y readback](../../audits/marketing-studio/TASK-1905-release-2026-10-04.md) · [Verificación local previa](../../audits/marketing-studio/TASK-1905-local-verification.md) · [Manual](../../manual-de-uso/marketing-studio/gobernar-catalogo-canales.md).

## Qué gobierna el catálogo

El catálogo versiona modalidad (`paid`, `organic`, `owned`, `earned`), familia, plataformas, placements, formatos, objetivos, límites de copy y política de tracking. Las especificaciones conservan su procedencia y fecha; una recomendación no adquiere carácter de límite duro por estar en el catálogo. Una versión se prepara como borrador y se publica explícitamente; publicar no revalida ni modifica campañas existentes. Una versión publicada es inmutable.

`channel_key` identifica el canal; mercado, cuenta, buying method y deal type son atributos de la ejecución. `content_source` pertenece a la pieza. Un perfil personal de LinkedIn no crea otro canal; UGC no es una modalidad. El criterio taxonómico vive en [Strategy Layer §15](../../architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_STRATEGY_LAYER_DECISION_V1.md#15-precisión-aceptada-2026-10-04--taxonomía-de-canales-y-activaciones).

Los alias son mapeos explícitos de un valor histórico a un canal. El backfill conserva el texto original y añade la clave canónica con su versión. No adivina equivalencias ni altera UTM históricas. Si quedan valores sin resolver, el proceso informa un resultado parcial. Una fila con versión y claves canónicas no vacías conserva su snapshot, incluso si sus alias cambian o un array sólo está parcialmente resuelto: completar o cambiar ese snapshot exige revalidación explícita. El mantenimiento global rechaza operadores restringidos a una organización.

## Plataformas, formatos y tracking

Los 52 registros son **canales**, no 52 plataformas distintas: combinan modalidad, familia y plataforma. Las cuatro modalidades son `paid`, `organic`, `owned` y `earned`; las doce familias son social, search, display, video, email, messaging, web_content, community, creators_influencers, pr_media, audio y ooh_dooh. `buyingPlatform` identifica dónde se compra; `appearancePlatforms` indica dónde aparece el contenido. Un canal de compra puede tener varias apariciones y placements.

Cada formato declara tipo de medio, ratios, duración, tamaño y tipos de archivo aplicables, con fuente y fecha de verificación. Los límites de copy distinguen máximo duro y recomendación, unidad y ámbito de formato/placement. Un límite de un formato no se presenta como límite de toda la plataforma; si falta el formato necesario, el resultado informa cobertura insuficiente.

Tracking se define por aparición y, cuando corresponde, placement: `utm_source`, `utm_medium`, plataforma de compra y clasificación esperada de GA4 o grupo personalizado. El auto-tagging de Google Ads se declara; un inventario ambiguo o un enlace externo que Studio no controla conserva valores nulos con razón explícita. No se inventa una fuente para completar una UTM. El catálogo guarda especificaciones; generar y congelar URLs de activaciones y reconciliarlas con su ejecución pertenece a TASK-2001/TASK-2002.

## Validación de escrituras

Los commands comparten el validador de catálogo y la transacción de escritura. Guardan la versión utilizada y findings asociados a entidad y revisión. La cobertura incluye copy, anuncios, publicaciones, presupuesto, briefs, audiencias y canales de derechos, incluidos los caminos de carga y la CLI heredada de derechos.

| `STUDIO_CHANNEL_VALIDATION_MODE` | Resultado |
| --- | --- |
| `off` | No consulta el catálogo ni produce findings; las claves canónicas y su versión quedan sin validar. |
| `warn` (default) | Permite guardar y devuelve/persiste findings. Un canal desconocido no se convierte en clave canónica. Sin catálogo publicado se informa la falta de validación. |
| `enforce` | Bloquea canal desconocido, catálogo no disponible y restricciones duras; no persiste la escritura fallida. Las recomendaciones permanecen advertencias. |

Un valor de flag inválido falla explícitamente. El modo `warn` no significa contenido aprobado. Los briefs conservan `channel_requested_keys` y sólo guardan claves reconocidas en `channel_keys`; los derechos conservan `rights_channels` y sus claves resueltas por separado. No hay normalización destructiva del literal.

Los commands aplican actor autorizado, ownership, revisión (`If-Match` cuando corresponde), idempotencia y dry-run mediante `runCommand`. El catálogo global no hereda permiso de escritura de una organización o de un rol enviado por el cliente. `marketing_studio.catalog.manage` permite únicamente `create` y `update` a roles efectivos admin y operations; account y designer no lo obtienen. La migración Greenhouse que registra la capability sigue pendiente de aplicar.

La revalidación de una campaña es una operación explícita: el reader de findings conserva el historial por revisión y avisa si está truncado; no presenta un finding antiguo como estado actual. `studio.campaign.channels.revalidate` ofrece dry-run y, al aplicar, actualiza sólo entidades sin errores obligatorios y reporta las bloqueadas. Publicar una versión nueva no dispara esta operación.

## Audiencias y customer model

La audiencia pertenece a una campaña y tiene revisión. Puede conservar una referencia pendiente explícita (`pendingNote`, con todos los IDs, versión y etapa nulos) o apuntar a un modelo real mediante versión y segmento/persona. Las referencias reales se comprueban contra el modelo autorizado de la organización, incluyendo coherencia de persona, buying role y bowtie stage. El consumidor no fabrica personas ni infiere el modelo desde copy.

`STUDIO_CUSTOMER_MODEL_ENABLED` está desactivado por defecto. El reader devuelve `disabled` mientras esté apagado; las escrituras que requieren una referencia real fallan con `customer_model_unavailable`. Activar el flag por sí solo tampoco provisiona un consumidor: el reader por defecto continúa devolviendo `unavailable` sin integración configurada. El adapter inyectable se preparó para el contrato de TASK-1906; su operación real depende de TASK-1906 y TASK-1892.

El adapter usa timeout de 5 s, caché por organización y versión (5 min éxito; 60 s fallo), limpia caché al desactivar y traduce un 404 upstream a `not_entitled` sin distinguir existencia y permiso. El reader comprueba visibilidad de la organización antes de consultar el upstream. No hay secreto, URL de consumidor ni infraestructura nueva inventada para suplir esa dependencia.

Cambiar la versión del customer model de una campaña reporta referencias de audiencias incompatibles; no las migra silenciosamente. Eliminar una audiencia referenciada por anuncios o brief falla con `audience_in_use`.

## Lectura, atención y mantenimiento

Los readers conservan la versión utilizada y señalan `validatedWithPreviousSpec` cuando existe un catálogo publicado posterior. Leer una campaña no la revalida. Los findings de la revisión vigente alimentan la atención; la salud agrega `channel_unmapped` contando registros, sin considerar un alias resuelto como desconocido.

El inventario productivo del release encontró **134 registros sin mapear** (50 copys, 72 anuncios, 4 audiencias, 2 líneas de presupuesto y 6 posts). Además, 5 líneas de presupuesto y 103 versiones de asset no tenían literal de canal. Son observaciones del 04/10, no un contador vivo ni una instrucción de asignación: ningún backfill se aplicó en producción. Operaciones debe revisar los literales ambiguos antes de mapearlos.

## API y MCP

API 1.6.0 publica 64 operaciones HTTP y 59 tools declaradas. La [CLI HTTP de Greenhouse](../../manual-de-uso/marketing-studio/operar-por-cli-api.md) descubre ese contrato en cada ejecución y conserva los mismos permisos remotos.

El registro de operaciones declara lecturas `T0`, escrituras `T1` y eliminaciones destructivas `T2`. Cada operación tiene tool o exclusión explícita; declaración de tool no prueba que el gateway la exponga. Eliminar audiencia y descartar borrador son `T2` y conservan el carril de operador CLI.

TASK-2003 implementa la identidad delegada y el carril de escrituras MCP en paralelo; no bloquea el desarrollo del producto, pero una escritura MCP no se da por federada ni operativa antes de verificar ese carril. TASK-1899 está retirada. El release de Studio del 04/10 no modificó ni desplegó el gateway o Greenhouse. Falta sincronizar desde el manifiesto generado en un checkout autorizado y verificar una sesión real.

Activaciones, URLs de tracking derivadas, calendario y observación de ejecución corresponden a TASK-2001/TASK-2002; no se atribuyen a esta implementación.
