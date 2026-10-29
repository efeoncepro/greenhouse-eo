# Rooms — backend local listo para integrar, 29-10-2026

Autorización: «termina todo lo que no requiere la UI». Claude Design conserva la interfaz; Auth sigue retenido en PR. Este corte no incluye push, deploy, flags remotos, clientes ni correos reales.

Runtime: `efeonce-rooms`, rama `codex/rooms-design-integration`, commit **3c7bcb50392bea9d408adf602c6da00583b87798**, árbol limpio. El ref local `main@e4b2e890` conserva el corte publicado de26Oct; no se revalidó el deployment remoto. [Resultado estructurado](2026-10-29-backend-local-completion.json).

## Entregas comprobadas

| Unidad | Resultado |
| --- | --- |
| R11 /2074 | Preguntas, respuestas append-only, resolución propia/interna y próximos pasos con anclas visibles y tiempos dentro de audio/video medido, cuotas, CAS, replay y auditoría/outbox atómicos. Actividad de acciones explícitas, sin cuerpos ni inferencia de atención. |
| R09 /2075 | Tours, notas propias incluso ante administrador, edición/tour fijados, TTL, control exclusivo, secuencia y ACK. Bloques excluidos rechazados también en replay/lectura. ACK no demuestra reproducción. |
| Invitación13 | Derechos nuevos sólo solicitados expresamente y fijados a edición inicial; lectura legada conserva su alcance. Receipts/notas/sesiones/ACK guest referencian la invitación/sesión, sin crear un principal interno. Revocación y pérdida de autoridad del emisor siguen vigentes. |
| R14 /2076 | Importación X-ray nativa con cobertura/pérdidas y metadata inmutable, CAS y fuente revalidada. Referencia HubSpot y handoff `pending` durables. Puertos externos OFF: no entrega ni sincronización. |
| R05B /2077 | Pipeline local V4 combina imagen+PDF/audio/video en la misma edición: PDF íntegro, MP3/AAC/Ogg con preview+peaks y MP4 H264/AAC faststart+poster. Bytes/hash/codec reales, sandbox, jobs/fencing, publicación y GET/HEAD/Range/304 privados. Originales no disponibles. |
| R13 /2078 | MCP stdio local con SDK2 exacto, sesión existente0600 y HTTP canónico. Lecturas por defecto; toolsets explícitos y cuatro annotations. Excluye credenciales, transferencias binarias y OAuth/federación remota. |
| Integración | API, CLI y SDK tipado comparten primitives. Bootstrap de13migraciones, tres actores sintéticos reconciliados, conservación de salas y multimedia opt-in con storage propio. |

V4 exige ubicar toda referencia no excluida en un bloque visible; ready sin ubicación no publica.
La audiencia omite metadata/referencias excluidas o huérfanas y ambos endpoints deniegan sus bytes.
V1–V3 publicados conservan sus contratos. Las pruebas ejecutan archivos en serie porque comparten
una base dedicada y sus colas globales de worker; no ejecutar suites simultáneas contra la misma base
con raíces de storage distintas.

La nueva interfaz no está entregada ni aceptada. Estas capacidades de backend no certifican toda la experiencia V1/EPIC-052 ni reemplazan las unidades de rollout, integraciones externas y aceptación del programa.

## Evidencia ejecutada

- **337/337 tests, cero fallos y cero skips**, lint, lint negativo, tipos y build PASS sobre PostgreSQL18 nuevo,13migraciones/43tablas. Node24.17.0, pins del lock.
- **18 comprobaciones Chrome/API/SDK** del circuito de imágenes y **23 del backend nuevo**: PDF1página/SHA/PUT/supervisor/publicación/bytes; preguntas/replay/conflicto, notas, tours, presentación, denegaciones y archivo. Son pruebas de API en navegador, no aceptación visual.
- **Recovery13 en PG16 y PG18:** dos tenants,43tablas,23objetos y14bindings físicos en ambos almacenes;dos salas V4 con los cuatro tipos de medios;12receipts guest/dos sesiones/cero identidades internalizadas. Dump/restore preserva filas, hashes, generaciones, ACL por DB/schema/tabla/columna, triggers y funciones. Replay, privacidad, revocación y job pendiente/fencing/segundo intento comprobados.
- Downgrade vacío **13→8→13** PASS; los cinco downs poblados9–13 rechazan pérdida y conservan fingerprint. Única normalización DDL: asociatividad AND del CHECK de grants validada contra gramática exacta y24capacidades. [PG16](2026-10-29-backend-recovery-pg16.json), [PG18](2026-10-29-backend-recovery-pg18.json).
- Los dos restores finales probaron fuentes idénticas y estables, incluidos los guards de perfil local, contenido excluido/huérfano y cobertura V4. Se ejecutaron antes del commit final: sus recibos conservan HEAD8702a6f/dirty=true y hashes contrastados byte por byte con el candidato limpio3c7bcb5.
- Recovery del corte8 de imágenes también pasó en PG16/18:26tablas,19objetos/12bindings, dispatch/lease/ACK y trabajo pendiente. Recibos originales sanitizados [PG16](2026-10-29-recovery8-pg16.json)/[PG18](2026-10-29-recovery8-pg18.json), publicados en el barrido documental posterior sin repetir el ensayo. No es un restore cloud.
- Worker de imágenes compilado y verificado mediante instalación productiva aislada sin paquetes web/dev:44inputs,8dependencias, dos WebP, bounds y shutdown PASS; cero cloud calls. No se construyó contenedor multimedia Linux.
- Decoder de imágenes probado con40MP y20MiB: caso observado máximo241,4MiB RSS/1.065ms en Darwin arm64; no representa peor caso universal, memoria total del worker ni coste cloud.

## Operación y cierre

`integration:up` conservó salas/borradores/ediciones al actualizar capacidades de sólo sus tres fixtures. Cambio de modo en vivo denegado antes de mutation; stop y `up --multimedia` PASS. SHA helper V4 y transporte CLI/SDK separados del límite20MiB de imágenes. [Manual](../../manual-de-uso/rooms/operar-backend-local.md).

Entorno de integración y QA detenido al finalizar; bases temporales y variables privadas retiradas, puertos propios libres. No se inició PostgreSQL normal55432. No se conservó storageState de navegador ni se publicó una credencial/URL de transferencia.

## Fronteras pendientes

- Integrar/aceptar la interfaz de Claude Design y completar su QA de experiencia.
- Certificar toolchain/sandbox/memoria dura y empaquetado multimedia Linux/cloud; Docker Desktop/daemon no están disponibles. V4 sigue sólo local y OFF salvo opt-in del entorno.
- Conectar fuentes/CRM reales y consumidor outbound bajo autoridad propia; MCP remoto conserva su federación/OAuth y transferencia compatibles pendientes.
- Decidir y verificar release, migraciones/grants productivos y activación humana/cohorte. Auth permanece retenido. No repetir el canary/correo único del26Oct.

## Cierre documental

Actualizados: cinco ADR, contrato/guías Claude Design, manual backend, EPIC-052, tasks2070/2074–2078,
índices/registro y skill Rooms en ambos espejos. Auth conserva su ledger dueño sin cambio: este corte
no modifica su servicio, protocolo o release. project_context ya apunta al dossier Rooms; no se amplía.
Verificados tasklint antes/después del move, epiclint52estricto y mirrors. Closure staged tiene dos
avisos revisados: project_context ya apunta al dossier y la skill existente ya está registrada; no
requiere otra entrada.31destinos locales nuevos resuelven;49referencias/ejemplos históricos rotos
de índices permanecen sin cambios. Context strict es el último gate antes del commit.
Estado: código local completo, rollout/certificación externa pendientes; no se cierra EPIC-052 ni TASK-2072 por estas pruebas.

Continuidad documental: [barrido completo de docs/skills](2026-10-29-docs-skills-full-reconciliation.md).
La aplicación probada sigue en3c7bcb5; de38af5 posterior sólo actualiza el contrato AGENTS del runtime.
