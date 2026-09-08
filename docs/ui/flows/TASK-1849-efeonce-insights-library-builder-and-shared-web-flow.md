# TASK-1849 — flujo Insights

Diseño inicial, sin runtime. Contrato API de TASK-1845/1846/1848; UI no decide autorización.

## Surface Inventory

Biblioteca → Encargo → Edición/revisión → Compartir/envío/programación; ruta separada Shared Web por grant.

## State and Transition Contract

1. Biblioteca filtra cliente/período/módulo; Crear abre encargo conservando contexto.
2. Validar solicita preflight; error mantiene valores y foco. Crear devuelve IDs y fase, no archivo ficticio.
3. Detalle actualiza estado con reader; output fallido ofrece retry soportado. Cancelar requiere confirmación.
4. Editar narrativa produce nueva versión; dirty state pide guardar/descartar al salir.
5. Emitir confirma edición/hash/output set exactos; una edición no emitida no crea links ni correo.
6. Compartir crea link una vez y permite copia; revocar enlace individual requiere confirmación y readback.
7. Enviar muestra destinatarios/modalidad; adjunto explica irrevocabilidad; éxito dice accepted hasta readback delivered.
8. Programar declara período/zona/autoridad; default borrador. Pausar afecta nuevas ocurrencias.
9. Shared recibe token → validación → contenido allowlisted o unavailable sin identidad; downloads revalidan grant.

## Focus and Recovery

Sidecar canónico en desktop, temporal en compacto; Escape cierra sólo reversible y devuelve foco al invocador.
Error inline persistente; ninguna pérdida de encargo por refetch. Botón deshabilitado sólo durante request;
reintento backend idempotente. Teclado recorre capítulos y controles de gráficos con tabla equivalente.

## GVC Scenario Plan

Crear por UI/API/MCP y encontrar la misma edición; partial target; denied; revoke/expiry; send failed; cancel;
dirty close; teclado, 1440 y 390px, reduced motion. Capturar estados y scroll-width; quality profile premium.

## Design Decision Log

Un flujo por objeto/versión evita tres builders. Compartir se separa de emitir/enviar. Sin retorno silencioso al
último período ni ampliación de alcance desde shared. UI ready no hasta mapping y escenarios materializados.
