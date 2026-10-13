# Incorporación de publicaciones Metricool al calendario de Studio

Fecha: 2026-10-07. Operador: Julio Reyes, autorización en conversación para cargar las publicaciones y usar la CLI administrativa. La verificación inicial de las 09:32 UTC (06:32 America/Santiago) acreditó vínculos y evidencia, pero no fichas completas: la revisión posterior del operador detectó copys sin asociar. Ver la corrección abajo.

## Revisión posterior: copys y completitud

El operador señaló copys ausentes y pidió comparar modelos para Seasonalities antes de elegir.
La UI de ACT-000026 mostraba «Sin copy vinculado a esta activación» y la API confirmaba `copyId=null`, aunque
`execution.records[].bodyText` contenía el texto. 25 de las 26 nuevas activaciones tenían ese defecto; sólo Los Sparks
tenía un copy vinculado. La comprobación inicial comparaba el texto del proveedor, no el copy del plan: fue insuficiente.

Corrección verificada a las 11:31 UTC (08:31 America/Santiago): 23 variantes literales nuevas mediante el catálogo gobernado de OneDrive y su importador,
dos mediante `createCopyVariant` para CMP-006, y asociaciones por `updateActivation`. Sin reescritura, nueva programación,
aprobación creativa ni cambio de campaña. El import acotado conserva los campos de campaña y títulos/orden de conceptos
mediante registry obtenido de lectura viva; no importa assets, versiones, anuncios, audiencias, flights ni posts.
Se conserva backup del catálogo antes de ampliarlo con las 23 variantes.

Readback final: 26/26 copys del plan coinciden literalmente con la evidencia; 25 asociaciones corregidas, cero nuevas activaciones,
29 publicaciones en calendario y 31 registros históricos sin vincular. Se conservaron fechas, cuentas, versiones, estados y evidencia.
La UI de ACT-000007 y ACT-000026 muestra copy completo, conteo y botón Copiar; esta última mostraba antes el vacío.
[Verificación estructurada](2026-10-07-metricool-copy-completion-checks.json).

Otros límites verificados, separados del copy:

- Los 26 tienen miniatura y preview según API; los 12 de CMP-002 conservan versiones legacy sin SHA-256.
- Los canales `organic_social_instagram` y `organic_social_linkedin`, catálogo v1, devuelven arrays vacíos de
  placements, formatos y límites de copy. No inventar claves ni límites para rellenar esos campos.
- Las 26 piezas conservan aviso de aprobación; dos planes de Día de Muertos siguen draft y la evidencia scheduled.
- CMP-006 no tiene brief estructurado; audiencia y servicio están vacíos. No inferir estrategia desde haber programado un video.
- Siete textos contienen enlaces; el destino/tracking estructurado de las 26 activaciones sigue vacío. No se reescribieron enlaces.
- Las tres activaciones SKY previas también carecen de copy vinculado; no pertenecen a las 26 creadas y no se modifican aquí.

La [comparación de modelos](2026-10-07-seasonalities-model-comparison.md) sigue propuesta, sin elección ni reorganización.

## Alcance y diagnóstico

Consulta de Efeonce Group (`3961547`) y Julio Reyes (`5105024`), desde el 07/10 hasta el cierre de 2026. Metricool devuelve 29 publicaciones concretas con ID: 3 ya vinculadas a CMP-003 y 26 sin activación. Las entradas de autolista sin ID ni contenido no se cuentan como publicaciones concretas. Studio detectó las 26: no faltaba discovery. La bandeja tenía 57 registros sin vincular, 26 PENDING y 31 históricos PUBLISHED.

El calendario consume activaciones, no crea planes desde toda observación. Se usa `createActivationFromExecution`, conservando la evidencia y creando plan + vínculo en una transacción, con revisión e idempotencia. No se invocan escrituras de Metricool.

## Autoridad y procedimiento

- API productiva 1.9.0, 75 tools / 80 operaciones; lectura y simulaciones por `pnpm studio`.
- CMP-002 carecía de slug de tracking. La API rechazó `setCampaignTrackingSlug` con `approval_requires_person`. El operador autorizó expresamente el carril administrativo. Se registró `cmp-002-tu-ia-no-conoce-tu-negocio` mediante `pnpm studio:write`, dry-run y apply; el prefijo CMP es obligatorio por contrato. No se reescriben enlaces ni UTMs de Metricool.
- La CLI HTTP exige credencial para apply incluso durante la ventana web abierta; el cliente de cargas tiene `studio:assets:write`, no `studio:write`. Las creaciones de campaña/concepto/activación usan la CLI administrativa autorizada y los mismos commands del dominio, no SQL ad hoc. El cliente de cargas sólo se usa para el ingreso del video.
- CLI administrativa desde Studio `3829a8bc95c0dca7077d7afaae8dd05bdd933143`, contra la base de Studio producción, configuración canónica y pool máximo 1 por proceso. CLI/ADC renovadas con el runner gobernado; sin ampliar IAM, crear credenciales ni cambiar flags de servidores.

## Asociación y procedencia

- 23 publicaciones de CMP-001/CMP-002: asociación por ID exacto del [manifiesto original](../../../ai-generations/2026-09-24_cmp001-cmp002-organic-social/metricool-posts.json), texto literal, URL del medio y ruta de la pieza. SHA-256 contrastado donde Studio lo conserva; las versiones legacy de CMP-002 tienen ruta/procedencia, pero no hash ni original almacenado. Una preview CMP002-02 devolvió HTTP 200.
- 1 publicación de Los Sparks: `387560873`, CMP-001, `CMP001-08-video-16x9` v1 y `copy-08-linkedin-a`; [registro de distribución](../../operations/social/2026-10-03-sparks-aeo-spot-animado-production-method.md).
- Mercado CL para las 24 activaciones de campañas existentes, consistente con el backfill operativo previo; es asignación de planificación, no segmentación geográfica demostrada por Metricool.
- 2 publicaciones de Día de Muertos: `375165858` y `375165897`. Nueva campaña Studio-owned `CMP-006`, concepto `CMP006-01`, pieza `CMP006-01-video-9x16` v1, mercado MX por la ocasión. Cuenta y zona conservadas: America/Santiago, 02/11 a las 11:00 y 18:00.
- Fuente de Día de Muertos: OneDrive `Alineación/5. Contenidos/Seasonalities/Día de Muertos/2026/Hay abrazos que encendemos/Video/Seedance 2.5 v02/PROGRAMACION.md` y MP4 final v02. Hash local, ambos medios de Metricool y versión almacenada coinciden: `10af4326669aa691f4fda05f90e6eb7def0552eef6cbb7cf19b183c53cf08696`. 11.558.707 bytes, 1080×1920, playback disponible por reader.
- Ingreso por `pnpm studio upload`, API/GCS/confirmación HTTP 201, licencia declarada `ai_generated`, referencia Seedance 2.5. No hay generación ni nueva aprobación creativa. Studio asignó `pending_review`; crear plan en estado planned bloquea con `asset_version_not_plannable`. Se usa el estado soportado `draft`, que conserva revisión pendiente y permite representar la ejecución ya programada. No se ejecuta `approveAssetVersion`.

## Límites que se conservan

Las piezas legacy mantienen sus avisos de aprobación y catálogo. La campaña CMP-002 conserva su autorización de medios original; incorporar evidencia no la modifica. Día de Muertos mantiene dos planes draft y su versión pendiente de revisión; la evidencia del proveedor es scheduled. No se alteran las 31 observaciones históricas sin vincular. Programado no significa publicado.

Canon: [arquitectura de activaciones](../../architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md) y [SSOT/ingest](../../architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_SSOT_AND_INGEST_DECISION_V1.md). No hay cambio de arquitectura, código, schema, deploy o permisos.

## Verificación final

Readback independiente con `pnpm studio call studio.calendar.get` (01/10/2026–01/01/2027, sin filtros de mercado/cuenta), `studio.execution.unlinked.list` y readers de campaña/pieza. Ambas listas tienen `nextCursor: null`.

- 26 activaciones nuevas, `ACT-000007` a `ACT-000032`: 12 CMP-001, 12 CMP-002, 2 CMP-006.
- 29 publicaciones programadas representadas en el calendario, incluidas las 3 de SKY preservadas con su revisión original. No quedan publicaciones PENDING en la bandeja sin vincular.
- 26/26 IDs del proveedor presentes exactamente una vez; recordId, cuenta, red, fecha, texto literal y mediaRefs idénticos a la lectura anterior. Campaña, mercado, pieza/versión y estado del plan corresponden al cuerpo validado. Las 26 devuelven execution.status=scheduled.
- 24 planes planned y 2 draft (Día de Muertos: ACT-000016 y ACT-000018). Los drafts mantienen pending_review de la versión; no hay aprobación implícita.
- 31 registros históricos siguen sin vincular con sus fechas/textos/vínculo intactos. La operación no los interpreta como pendientes ni los borra.
- Video ingresado con SHA-256 verificado, original disponible y playback disponible por reader. No se certificó aquí el render visual del calendario.

[Recibo estructurado con cada ID, campaña, pieza, hora y hash del texto](2026-10-07-metricool-calendar-reconciliation-checks.json).

Documentación: dossier, runtime handoff y lecciones/ledger espejo de la skill. Sin cambio de arquitectura, manual general, lifecycle de tasks, Handoff compartido ni project_context: se operaron commands existentes. Sin commit, push o deploy. Validación documental: mirrors PASS; cierre documental sin errores, con avisos heurísticos de revisar registro/contexto por editar skills; no se añadió ni cambió una skill de entrada.
