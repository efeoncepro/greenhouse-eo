# TASK-1849 — flujo Insights

Diseño inicial, sin runtime. Contrato API de TASK-1845/1846/1848; UI no decide autorización.

## Surface Inventory

Biblioteca → Encargo → Edición/revisión → Compartir/envío/programación; ruta separada Shared Web por grant.

Tres entradas: cliente autenticado desde Inicio/Mis servicios/SEO/Delivery (EPIC-046), colaborador
interno desde su gestión de cuentas autorizadas y destinatario por token. Comparten componentes de
biblioteca/detalle cuando aplica; shared no incluye navegación privada. La org cliente se deriva de
sesión; la selección interna sólo ofrece targets autorizados, revalidados por servidor.

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
10. Cliente elige una plantilla/servicio/período/formato elegible → preflight → generación gobernada →
    estado propio redactado → revisión con owner si policy lo exige → edición emitida/descarga permitida.
    Sin autoridad de generación la biblioteca conserva lectura; no hay botón que falle después de prometer acceso.
11. Colaborador autorizado prepara/revisa/emite sobre la misma edición/historial; un draft interno no se
    muestra al cliente. Cambiar cuenta o audiencia exige nueva validación, no sólo cambiar filtros visuales.
12. Regresar al servicio conserva período/contexto autorizado. Sharing/envío/programación sólo aparecen
    según acciones del reader; generar no habilita automáticamente esos verbos.

## Focus and Recovery

Entrada desde email/in-app/Teamsbot: deep link a edición concreta → login si falta sesión → restaurar
destino interno permitido → revalidar cuenta/módulo/acción → detalle. Cuenta incorrecta, revocación o
retiro muestran estado seguro; nunca un informe de la cuenta activa por sustitución silenciosa. Un GET
de preview/scanner no marca leído ni ejecuta commands. SharedGrant usa el flujo separado del punto 9.
Preferencias apuntan a TASK-693; Insights no construye otro centro de notificaciones.

Sidecar canónico en desktop, temporal en compacto; Escape cierra sólo reversible y devuelve foco al invocador.
Error inline persistente; ninguna pérdida de encargo por refetch. Botón deshabilitado sólo durante request;
reintento backend idempotente. Teclado recorre capítulos y controles de gráficos con tabla equivalente.

## GVC Scenario Plan

Crear por UI/API/MCP y encontrar la misma edición; partial target; denied; revoke/expiry; send failed; cancel;
dirty close; teclado, 1440 y 390px, reduced motion. Capturar estados y scroll-width; quality profile premium.
Añadir cliente read-only/generador, interno con target permitido/denegado, intento de audiencia interna,
draft oculto, contexto desde servicio y retorno, más token sin biblioteca. Todos con fixtures, no clientes de prueba.
Añadir entrada por los tres canales con/sin sesión, retorno tras login y objeto retirado; preview de
correo HTML/plain text en desktop/móvil con resumen útil y CTA exacto. Lectura no equivale a acción resuelta.

## Design Decision Log

Un flujo por objeto/versión evita tres builders. Compartir se separa de emitir/enviar. Sin retorno silencioso al
último período ni ampliación de alcance desde shared. UI ready no hasta mapping y escenarios materializados.
