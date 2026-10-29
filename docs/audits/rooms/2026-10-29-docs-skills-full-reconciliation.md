# Rooms — conciliación completa de documentación y skills

Fecha:2026-10-29. Pedido directo del operador: actualizar con subagentes todos los documentos y skills
pertinentes a lo construido en este chat y hacer commit. Este barrido es documental, posterior al
[cierre técnico](2026-10-29-backend-local-completion.md) registrado en Greenhouse76f0a3211.

## Fuentes y límites de atribución

Aplicación Rooms comprobada:3c7bcb50392bea9d408adf602c6da00583b87798. HEAD posterior
de38af5e73ac4e653923c3e892ebba5eafb3139b sólo modifica AGENTS.md del runtime; el diff contra3c7bcb5
no cambia aplicación, migraciones, paquetes ni tests. No se repitió el gate runtime: las337pruebas,
Chrome18+23,13migraciones/43tablas y restore mixto PG16/18 pertenecen al ensayo técnico anterior.
Los recibos conservan su fecha, fuente, identidad sintética y límites, sin atribuirlos a un deploy nuevo.

Tres subagentes revisaron arquitectura, guías de consumidores y skills/frontera Auth. El integrador
revisó tasks/épica, routers, startup del runtime, referencias cruzadas y preservación de WIP compartido.

## Cobertura y correcciones

| Superficie | Documentación/skill dueña y conciliación |
| --- | --- |
| Stack y foundation | Baseline técnico registra pins MCP2 y toolchain multimedia; conserva la instalación/QA histórica de TS/Next/AXIS y separa prueba local del cloud publicado. |
| API/can/lifecycle/contenido | Arquitectura, API/acceso y ADR de producto distinguen contrato objetivo de inventario ejecutable HTTP/CLI/SDK/MCPstdio; V1–V3 conservados y V4 opt-in. |
| Medios | Autoría/preview de imagen+PDF/audio/video en la misma edición, hashes/generaciones/pins, referencia visible o exclusión explícita, entrega privada y anclas temporales medidas. Los ADR cloud/imágenes conservan su alcance26Oct. |
| Colaboración/presentación | Preguntas/respuestas/pasos/actividad, tours/notas propias/sesiones/control/ACK ya son backend local; no certifican playback, atención comercial ni UI. |
| Invitados/issuer | TASK-2066/2068 y skills Rooms/Auth reconocen derechos adicionales explícitos en edición inicial y receipts guest sin principal interno; issuer y release no cambian. No autogrants a invitaciones legadas. |
| Integraciones/MCP | X-ray nativo y CRMpending tienen puertos OFF. El router de la skill MCP remite al stdio local de Rooms y no lo declara provider/OAuth remoto. |
| Operación/recuperación | Guías corrigen entorno aislado ya construido, CLI con sesión existente, down de una migración y recovery13 ya probado; TASK-2069 separa recovery local8 de cloud/PITR/secretos pendientes. |
| Arranque y continuidad | AGENTS runtime remite al ledger/manual actuales, ownership Claude/Codex, hold Auth, suites seriadas y perfiles aislados. Router humano/machine-readable de Greenhouse carga esas fuentes; Handoff/changelog añaden puntero corto. |

El mapa coordinado Auth+Rooms ahora remite al backend posterior y al recibo de dos RP ya accesible;
la tabla original permanece fechada. Se publican los recibos sanitizados de recovery8 ya ejecutado:
[PG16](2026-10-29-recovery8-pg16.json) y [PG18](2026-10-29-recovery8-pg18.json),26tablas,
19objetos/12bindings, ACL/hashes/dispatch/fencing y trabajo pendiente. No son pruebas nuevas ni PITR cloud.

## Revisados sin cambio

- Los cinco ADR locales29Oct y el ADR de marca ya concuerdan con lo construido; DECISIONS_INDEX los registra.
- El contrato Claude Design y el manual backend completo ya contienen DTOs, comandos, límites y exclusiones.
- Las tasks cerradas2070/2074–2078 conservan su alcance local y evidencia; las tasks de UI y rollout siguen abiertas.
- project_context y CLAUDE ya enrutan al dossier/skills. Se conserva su tamaño y el WIP ajeno; no duplicar inventario.
- Feature Flag State Ledger mantiene el readback26Oct y el opt-in multimedia local. No hubo cambio de flags ni nueva lectura cloud.
- Las skills software-architect-2026, mcp-craft, Resend y AXIS conservan sus contratos transversales; no hubo cambio del proveedor de correo, prácticas MCP generales o valores visuales.
- Wireframes, flows, motion, capturas y auditorías antiguas son contratos/evidencia de sus cortes. No se produce ni acepta una nueva interfaz por actualizar estos documentos.
- Memorias personales y artefactos comerciales ajenos permanecen sin editar.

## Pendientes que siguen vigentes

Claude Design integra/acepta la nueva interfaz y su QA. Platform certifica multimedia Linux/cloud y
memoria dura; fuente/CRM reales, consumidor outbound y federación MCP remota requieren contratos y
certificación propios. Recovery cloud/PITR/secretos, permisos PUBLIC vecinos, capacidad/coste y rollout
conservan sus gates. Auth permanece retenido en PR. No nuevo canary, correo, push, merge, deploy ni
activación productiva por este barrido. Los entornos de QA/integración siguen detenidos.

## Cierre y verificación

Validación proporcional: revisión de fuentes/diffs, enlaces locales del delta, mirrors, tasklint focal,
epiclint52 y closure documental. Context/Handoff strict se ejecuta al final, después de la última edición.
El commit sólo incluye archivos/hunks propios. El código ya probado no se reconstruye para una edición
documental. Estado: documentación conciliada; código local completo, certificación externa y rollout pendientes.

Resultado del barrido:41 archivos Greenhouse y AGENTS runtime actualizado en de38af5. Mirrors,
tasklint2066/2068/2069/2071 y epiclint52estricto PASS. Enlaces:1175destinos locales revisados,
25nuevos y cero rotos introducidos;48referencias/ejemplos históricos de índices siguen sin cambios.
Closure staged emite tres avisos revisados: project_context ya enruta a los owners; las skills siguen
registradas con sus IDs existentes; CLAUDE ya apunta al dossier vigente y no requiere duplicar el
ajuste de punteros de AGENTS. No hubo cambio de contrato global de autenticación o publicación.
Context strict queda como último gate inmediatamente antes del commit, sin editar bitácoras después.
