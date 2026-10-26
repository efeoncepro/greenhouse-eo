# Rooms — entorno local y conectores para Claude Design26Oct2026

Entrega local preparada y comprobada. Runtime `codex/rooms-design-integration@2cddc98`; producción
permanece en main e4b2e890. Sin push, deploy, merge Auth, cambio de flags remoto ni nuevo correo.
[Reporte saneado](2026-10-26-local-design-integration.json) y
[manual de arranque/SDK](../../manual-de-uso/rooms/integrar-claude-design-local.md).

## Entregado

- Next3216, issuer fixture19338 y cluster PG18 propio55433 con ocho migraciones. Medios/caché/credenciales
  separados de producción y de los tests55432. Dos organizaciones y grants sintéticos por perfil/recurso.
- Launcher admin/operator/adminB y guest RoomA con cookies HttpOnly. Internos recorren /login→issuer→
  callback→/rooms por el consumer canónico. Guest es sesión fixture offline, sin proof OTP/correo/Microsoft.
- Supervisor con worker finito local cada2s, sin sweep; up/status/stop preservan datos y sólo controlan
  recursos propios. Stop confirma puertos libres+PG detenido. Guardcloud/host/dotenv/symlink y PGsystemID.
- Cliente `src/client` tipado: readers, commands, revisión/idempotencia explícita, errores saneados,
  timeout/abort, SHA y PUT seguro. Type-only DTOs del servidor borrados del bundle; sin runtime server,
  PG, crypto Node ni fixtures en navegador. Mismas primitives HTTP/CLI del backend; no negocio paralelo en UI.

## Pruebas y correcciones

`pnpm verify` final PASS:250tests,0fallos/0skip,lint negativo/lint/types/build. Incluye10tests de cliente,
5del entorno/protocolo fixture y1guardNext local más234backend previos. Playwright53PASS/3skip, sin
cambios JSX/CSS ni aceptación visual nueva. `integration:check`:18comprobaciones API/SDK en ChromePASS.

Flujo comprobado: operador edita pero no publica404; admin autenticado y acotado a su organización;
CAS antiguo409; misma intención conserva uploadId/replayed; PUT local→complete→worker WebP→attach→
coverage/preview→publicación inmutable→lectura privada guest. Guest no ve borrador/workspace/otrotenant404;
cookie HttpOnly y acceso anónimo401. Borrador reabierto para continuar; ediciones previas conservadas.

La prueba real encontró y corrigió dos errores del tooling nuevo: fixture omitía `iss` y el callback la
rechazaba correctamente; quedó alineada sin relajar el consumer. El PUT usaba fetch nativo con receiver
incorrecto; se fijó binding global y se añadió regresión, verificada de nuevo sin wrapper de fetch en navegador.
No existe fallback de identidad ni nueva ruta privilegiada en el runtime.

## Límites y continuidad

La interfaz definitiva permanece con Claude Design: conectar su código al mismo origen y comprobar su
recorrido/render/copy/estados/accesibilidad. El launcher es tooling sintético, no diseño de producto aceptado.
Perfil local no prueba otro canary GCS/CORS ni issuerconformance; restore completo del esquema cloud8 y
activación general siguen pendientes. La recepción/revocación real del único canary anterior no se repite.

Auth PR263/264 siguen OPEN con HEAD5e1fc2554/aabd6d78d, sin merge. No se modificó código Auth en Greenhouse
ni configuración de sus workflows, Cloud Run o proveedores. Los SDKs no contienen bearer/cookie de app
ni almacenan URLs firmadas; Next puede regenerar tipos locales, excluidos del commit.

## Gobernanza y verificación documental

ADR incremental del entorno y TASK-2072, guía Claude Design, dossier/manual y skills Rooms actualizados;
Handoff/changelog sincronizados. No nuevas migraciones, capabilities, eventos o APIs productivas.
Tasklint sin errores/advertencias y skills espejo idénticas; contexto estricto sin errores/advertencias.
Closure focal sin errores: avisos revisados, project_context ya enlaza el dossier vigente, la skill existente
no cambia de registro y TASK-2072 conserva su lifecycle in-progress. Cambios comerciales ajenos preservados. No release a main ni publicación implícita por dejar el entorno local listo.
