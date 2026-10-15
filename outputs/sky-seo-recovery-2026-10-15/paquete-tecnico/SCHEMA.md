# Contrato de lectura v 1

Todos los manifiestos tienen `manifest_version:1`, `status:prepared_not_applied`, `executed_changes:0` e `items`. `manifest.schema.json` cubre los manifiestos de destinos, enlaces, layouts, CTA, metadata, Azure y acciones; `first-batch-actions` usa `action_id` en lugar de `source_url`. No es un formato para aplicar cambios.

`source_url`: URL afectada (en candidatos es el destino 404; en enlaces es el post fuente). `proposed_destination_url`: propuesta contextual nullable, nunca regla implícita. `proposed_action`: devolver_contenido/revision/corregir_enlace o instrucción específica. `dependency`: lista de decisiones/datos previos. `owner_proposed`: rol por confirmar, no asignación aceptada. `status`: estado particular que prevalece sobre cualquier resumen global.

Candidatos 404: `candidate_id`, `source_count` (artículos distintos que enlazan), `source_post_ids/urls`, `current_http_status`, `pre/post_ga4_sessions/views` nullable, `equivalence_confidence`, `evidence`, `preflight`, `rollback`. Todas las `redirect_destination_url` son null y `redirect_approved`false. Alta confianza para un enlace contextual no implica equivalencia histórica para 301.

CTA: `wp_id`, `shortcode_ids`, `tokens_before`, `placement_count`, `content_sha256`, destino histórico 4955 si aplica, bloqueo y dependencias. Definición histórica delID 4955 demostrada sólo en archivo del curso; no valida pertinencia de la misma oferta en cada post.

Layouts: `wp_id`, `post_type`, URL y señales actuales. Metadata: `wp_id`, URL, fuente de título/fechas, ausencia actual y `draft_meta_description` en nueve páginas del brief editorial y un curso adicional. JSON null de métricas es falta de dato, no cero.

Las evidencias son paths relativos a `.captures/sky-organic-audit-2026-10-15/`, salvo cuando se indica un fichero vecino del paquete. Los CSV serializan listas comoJSON. UTF-8, sin secretos.
