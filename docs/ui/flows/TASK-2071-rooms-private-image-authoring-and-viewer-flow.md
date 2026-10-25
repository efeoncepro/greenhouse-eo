# TASK-2071 — Flujo de autoría y lectura de imagen privada

Contrato propuesto para consumidor 2070; no modifica candidata 20f9fe9.

## Entry and authority

Tus salas → Editar propuesta sólo con content.edit en borrador. Sin borrador, el command editions.reopen existente requiere su permiso; no crear uno automáticamente al leer. URLs edit/preview entran al allowlist de continuidad sólo por dueño backend. Guest nunca abre draft/preview; entrar por URL no concede autoridad.

## Main flow

1. Leer borrador, revision, coverage, permisos y disponibilidad/límites.
2. Elegir una imagen real con FileField; iniciar sesión por command autorizado.
3. Cargando refleja bytes transferidos. Al terminar transferencia, llamar complete y esperar estado server Verificando; no ready por una respuesta 200 de upload.
4. Ready muestra Lista para añadir. Attach al bloque con expectedRevision produce lectura nueva; hasta entonces no aparece en la propuesta guardada.
5. Editar título/alt/pie y guardar. No modificar original ni eliminar bloques ajenos.
6. Abrir Vista de lectura: misma proyección visual, etiqueta Borrador; preview no crea sesión guest.
7. Validar coverage; publicar sólo si DTO permite. La edición fija versiones; no sustituir bytes mientras invitado lee.
8. Guest ve imagen entera; abre inspector, usa zoom/reset/pan/teclado y vuelve al mismo punto.

## Recovery and continuity

| Trigger | Respuesta |
|---|---|
| Red perdida | conservar intención/command key y consultar status; no segunda carga automática |
| Upload inválido o muy grande | razón saneada y nueva selección explícita; lo rechazado nunca se adjunta |
| Verificación falló | retry individual sólo si permitido; no alterar etiqueta Lista a mano |
| Complete incierto | readback sesión/asset, misma key cuando corresponda |
| Attach 409 | conservar archivo listo+inputs, releer revisión y confirmar attach revisado con nueva intención |
| Permission expiró | cancelar nuevas acciones; quitar imagen/inspector, recovery de sesión sin mostrar datos privados |
| Salida con cambios | confirmar descartar/seguir; cancelar UI no afirma cancelación en servidor |
| Reemplazar imagen | nueva versión y attach; edición anterior sigue fijada |
| Reduced motion/sin View Transition | flujo funcional idéntico, foco/estado preservados |

## Protected delivery

Reader recibe sólo descriptores autorizados vinculados a la edición. Endpoint same-origin de 2070 revalida cada GET/HEAD/Range; no signedURL pública de lectura ni Next optimizer/cache. Backend controla CSP/rango/stream. No prometer retirar bytes ya recibidos/guardados. El cliente desmonta arte en revocación y no guarda descriptor de transferencia en storage.

## Focus and surfaces

Una sola inspección Dialog; Escape/cierre retornan a la pieza. Propiedades inline/tabs, sin modal anidado. Móvil cambia región, no zoom por hover. Al revisar cobertura el enlace activa el bloque/error correcto; estado del archivo no se pierde al ir a preview.

## GVC Scenario Plan

Escenario premium 2071 con flujo principal y negativos anteriores; autenticación local cuando el DSL no expresa transferencia. Capturas por fase sin secretos en URL/cookies/log; volver después de revocar no muestra el arte. Registrar pageshow.persisted sólo si se observa, no inferir BFCache.

## Design Decision Log

La carga no adjunta ni publica por sí sola: el autor conserva una decisión explícita después de verificar bytes. Las operaciones se pueden repetir para varias piezas sin reemplazar el inventario. Preview usa la proyección audiencia del mismo renderer y nunca convierte al autor en guest. Un conflicto conserva entradas locales, vuelve a leer revisión y exige una nueva intención antes de sobrescribir.
