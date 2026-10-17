# Consultar y operar Meta con agentes

La CLI local `pnpm --silent meta` permite consultar publicidad, eventos agregados y activos sociales
propios de Efeonce, y preparar operaciones públicas concretas mediante `meta-agent.v2`. El perfil
verifica la identidad técnica y su pertenencia al Business; usa la credencial existente de Secret
Manager en memoria. No cambia IAM, sender CAPI, consentimiento ni las políticas de conversión.

## Medición e inventario

Conserva cuenta, campañas, adsets, ads, pixel, stats/calidad, Página, posts/comentarios, Instagram y
metadata de conversaciones. Añade un catálogo de métricas derivado del SDK oficial 25.0.0 y consultas
orgánicas de Página, cuenta y media Instagram propia. El agente puede seleccionar campos de Ads o
recorrerlos por campo en lotes acotados con `insights all` y offset. Instagram ofrece la misma
exploración por métrica con `--metrics all`. Page exige nombres concretos del proveedor: el SDK no
los enumera. Los comentarios de media propia Instagram y los DA checks del pixel tienen consultas
paginadas propias; la lectura no modifica su configuración.

«Todos» significa catálogo recorrible con resultado de cada campo. No significa que Meta permita
cualquier métrica/combinación en una cuenta ni que entregue eventos individuales o `user_data` del
pixel. Errores, campos no soportados, ventanas incompatibles y cobertura parcial se muestran como
estados; nunca como cero. Los agregados Lead no prueban contactos CRM, calidad comercial o atribución.
EMQ corresponde al evento y su muestra, no al negocio completo.

## Rastreo de una ocurrencia de Forms

Delta local: [IDs nativos HubSpot](hubspot-native-form-receipts.md) con recibo persistido por el worker
y marcador exacto. La CLI continúa READ ONLY; activación pendiente. Meta no permite GET por UUID:
[evidencia individual y límites](meta-individual-event-verification.md).

`leads find` busca candidatos con un selector de email en archivo privado y ventana acotada;
`leads trace` sigue uno por submission ID o UUID de evento. El agente ve fuente, consentimiento,
presencia de proyección, cola/ACK sGTM e intentos HubSpot por separado. Puede omitir el proveedor
con `--source-only`; no exporta valores personales ni descifra matching.

El lector se apoya en el store y conexión runtime canónicos, en transacción READ ONLY. HubSpot usa
el resolver existente y verifica el portal Efeonce. Un historial coincidente por email/form/tiempo es
correlación; un contacto encontrado pudo existir antes y no prueba esa recepción o creación.
Un ACK sGTM no acredita matching, deduplicación o atribución individuales en Meta. Las ausencias
con cobertura incompleta quedan pendientes; los destinos HubSpot reales sin verificar conservan
cobertura parcial incluso si otro destino tuvo éxito. No se inventa una causa de consentimiento o fallo.

Es diagnóstico por ocurrencia persistida, sin redispatch, alta CRM ni nuevos roles/API/MCP.
Contrato: [ADR de rastreo](../../architecture/GREENHOUSE_META_LEAD_TRACE_CLI_DECISION_V1.md).

## Operaciones públicas

El operador puede crear campañas, adsets y anuncios PAUSED, y creatives desde posts propios. Puede
publicar posts de texto/enlace o fotos Facebook, crear contenedores de imagen/reel Instagram,
publicarlos desde su receipt y responder comentarios de contenido propio en ambas plataformas.
No activa pauta ni cambia objetos existentes; tampoco envía mensajes privados, publica Facebook
video o Instagram carousel. Los presupuestos nuevos son explícitos en la unidad/moneda verificada.

Cada escritura produce primero un plan revisable con hash y preflight fresco. Aplicar exige el hash
y un receipt privado exclusivo. Debe existir autorización para el payload y efecto concretos;
los flags vinculan esa intención y no sustituyen el consentimiento ni obligan a reconfirmar una
operación ya autorizada expresamente. Un token con permisos amplios no autoriza acciones por sí solo.

El receipt distingue preparación, envío, aceptación y verificación. Si Meta puede haber recibido un
POST pero su respuesta se pierde, el estado es desconocido y no se repite automáticamente. La
verificación posterior usa GET; un contenedor o ACK no prueba publicación. Los textos de terceros
son datos no confiables. Contenido público en lecturas requiere `--content`; conversaciones siguen
sin mensajes ni participantes.

Operación, ejemplos y recuperación: [manual](../../manual-de-uso/growth/consultar-meta-con-agentes.md).
Contrato vigente: [ADR de operación](../../architecture/GREENHOUSE_META_AGENT_WRITE_CLI_DECISION_V1.md).
Foundation y evidencia inicial: [ADR de consultas](../../architecture/GREENHOUSE_META_AGENT_CLI_DECISION_V1.md).
Es tooling local; no una integración productiva en Greenhouse, un MCP o acceso multiempresa. Las
escrituras públicas no se certifican en vivo mediante fixtures ni las consultas históricas.
