# TASK-1881 — Leadership Performance Flow

## Meta

Propuesta de flow, TASK-1881. No implementación. Entrada existente /people/[memberId]?tab=activity.

## Entry Points

Actividad de un perfil interno autorizado. Reader verifica sujeto + scopes en servidor antes de contenido. Query de período/cuenta validada; month actual sólo default cuando no se solicitó uno.

## Happy Path

Perfil → Actividad → Liderazgo operativo → período → resumen/cobertura → cuenta → evidencia en sidecar → tarea autorizada o volver.
Cambiar período cancela/rechaza respuesta anterior, cierra detalle de otra revisión y carga todos los bloques desde mismo DTO/revision.
Búsqueda/página cambian la lista, nunca el agregado completo autorizado. Filtro de cuenta indica filteredSubset cuando cambia alcance analítico; backend define ambos. Cambio de filtro reinicia cursor y conserva período/revisión.

## State Transitions

idle → loading → ready | empty | degraded | denied | error.
ready → period change → loading; última evidencia nunca se rotula como nuevo período.
ready → open evidence → evidence loading → evidence ready | denied | stale revision | error.
close/Escape → contexto/filtro/scroll conservados y foco al trigger.

## Membership and Pagination

ManifestVersion identifica la cartera de la revisión. Cuenta nueva aparece en siguiente lectura de ciclo, incluso pending_source; no añadir código ni un quinto slot. Alta durante fetch no mezcla manifest nuevo con resumen viejo. Baja/reasignación/revocación invalida caches y cierra sidecar, con foco seguro.
Cursor/order estables, resultados/metadata sólo del scope autorizado. Históricos conservan membresía del período. Deep link a cuenta fuera del período o permisos responde seguro; no fallback silencioso. Probar 51/201 cuentas y dos líderes; página visible nunca define denominador del score.

## Exceptions and Recovery

Binding ausente: explicación, sin score; contacto operativo por canales existentes.
Stale: fecha visible y último snapshot identificado, retry limitado.
401/403 o permiso revocado: ocultar detalle y datos cacheados, sin fallback a API individual menos restrictiva.
Revisión sustituida: ofrecer versión actual sin mezclar filas; historial sólo si autorizado.
Sin historial/denominador: no chart fabricado. Error parcial conserva sólo secciones del mismo snapshot válido.

## Navigation and Focus

Nav placement none; no entrada en sidebar/avatar. Deep links internos conservan member/período/cuenta/revision validada; URL nunca autoriza. Escape y close canónicos, foco al trigger; browser back conserva período y subvista. Los detalles son de lectura; los formularios autorizados tienen dirty state. Antes de cerrar/cambiar período con borrador, ofrecer continuar o descartar mediante confirmación canónica.

## Verification

GVC desktop/mobile + keyboard: entrada, cambio rápido de mes, drill-down, retorno, denied y stale. Afirmar contenido por período/IDs con fixtures, no sólo capturas.

## Acciones y revisión gobernadas — 2026-09-19

Caso → formulario de acción/corrección → validación → submitting → submitted | validation_error | conflict_revision | denied. Mostrar resultado sólo tras readback del command común de TASK-1880; no actualizar optimistamente la métrica. Idempotency key estable durante retry; respuesta incierta se consulta antes de reenviar.

Solicitud → reviewer distinto del autor → decisión motivada → revisión auditada del snapshot si aplica. No habilitar autoaprobación. Una acción ejecutada pasa a awaiting_verification, no directamente a éxito. Permisos se verifican en cada command, también con deep link; revocación elimina datos protegidos/borradores sensibles sin guardarlos en storage persistente.

Escape/back durante edición solicita confirmación antes de descartar; durante envío no implica cancelación server-side. Mantener estado de envío, resolver por readback y luego restaurar foco. Cambio de revisión exige recargar contexto; conservar sólo borrador permitido, nunca sobrescribir resultado nuevo. Cierre mensual/bono no son acciones de esta UI.
