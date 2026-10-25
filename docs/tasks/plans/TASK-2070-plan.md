# TASK-2070 — Plan de imágenes privadas y procedencia

Estado: aprobado por raíz para implementación LOCAL R05A parcial; hook --subagents PASS, tasklint0errors/1warning índice compartido; cero cambios runtime al redactar.
Base observada: Rooms20f9fe9. La candidata remota/canary de identidad queda fija y no depende del WIP local.

## Discovery y criterio de corte

Los manifest y SQL V2 fuerzan synthetic; todos los assetRefs permanecen unresolved y el renderer sólo
muestra un estado pendiente. R05A debe resolver bytes y procedencia, no eliminar un error de coverage.
Primer resultado: una imagen privada publicada y leída con autorización por API/CLI, lista para UI R07/R08.
PNG/JPEG/WebP estáticos; PDF/audio/video/tiles/originaldownload quedan para siguiente unidad.

## Decisiones y gate previo

- ADR `EFEONCE_ROOMS_PRIVATE_IMAGE_MEDIA_AND_PROVENANCE_DECISION_V1.md` debe ser aceptado antes de código.
- Raíz ejecuta/valida hook2070 con --subagents autorizado; plan y ownership deben quedar confirmados.
- No package/lock/node_modules hasta liberación de raíz: bootstrap del canary usa snapshot20f9fe9.
- Migración local sobre DB Rooms propia, con backup/down-upclon antes de aplicar; no cloud provision ni deploy/push; cloud-production falla cerrado para medios, sin filesystem efímero Vercel.
- Fijar DTO con UI antes de implementar rutas. Reader y scopes/grants son server-resolved, no UI calculados.

## Fase 1 — V3 y modelo durable

1. Schemas V3 opt-in: real/synthetic+procedencia declarada; autor/fecha server-only, legacy inmutable.
2. Migración CLI aditiva para uploads/assets/versions/renditions/jobs/edition_assets y constraints V3.
3. Capability/operation registry y SQL constraints/grants alineados. Reusar content.edit y rooms.read con
   resource correcto; ninguna elevación client→operator ni permisos a originales.
4. Congelar DTO: state/metadata/problema/acciones; input no trae ready ni ruta física; transfer descriptor efímero.
5. Pruebas puro/PG de compatibilidad, identidad/procedencia y denegaciones antes de mover bytes.

## Fase 2 — upload y procesamiento local

1. Local private storage adapter con namespace generado, archivo temporal, límites y commit atómico.
2. initiate/getStatus/complete/cancel; revocación/expiry/CAS; transacción registra intención, I/O fuera del lock.
3. Worker Sharp en entrypoint independiente: sha256 + inspect + preview/thumb, nunca cambio a original.
4. Lease/fencing/retry/cancel y garbage de cuarentena sin borrar generaciones referenciadas.
5. Resolver dependencias oficiales exactas una vez descongelado node_modules; no importar decoder a Next.
6. Adapter cloud conserva frontera explícita; pruebas locales no acreditan bucket/worker cloud desplegados.

## Fase 3 — autoría y lectura privada

1. content.attachAsset bajo revision; import/readback conserva cada item y estados unresolved/failed.
2. PreviewAudience del draft por content.edit y proyector compartido; no simular identidad externa.
3. Publish reconsulta ready+scope y congela rendition/generation/hash; agregar edition_assets de forma atómica.
4. GET/HEAD/Range same-origin de derivados bajo sesión/grants frescos y membership en snapshot; no-store,
   backpressure y tamaño derivado acotado; no Next optimizer ni URL bearer persistida.
5. HTTP/CLI registran las mismas operaciones y transfieren bytes reales; no declarar MCP implementado.

## Fase 4 — gates y handoff consumidor

- Pruebas 2tenants/2marcas, MIME spoof/checksum/oversize/truncated, EXIF/alpha/ratios/imagen larga.
- Retry/cancel/lease expirado/concurrencia/replay sin duplicar bytes; publish no puede adelantarse al worker.
- Guest nunca obtiene draft/otroasset/original; revoked/expired/archived niega nuevos requests/Range.
- Full legacy tests/lint/types/build y QA independiente. Consumer UI usa exactamente los DTOs congelados.
- Down/up en clon, restore hashes/generaciones/ACL y pérdida de objeto observada como fallo, sin inventar ready.
- Docs/manuales y task reflejan local vs cloud; no cierre del pipeline desplegado sin su evidencia específica.

## Subagent strategy

Fork autorizado por usuario, coordinado por raíz. Dominio/Media posee schemas, SQL, worker, storage y publish;
UI posee sólo editor/visor en task dependiente; QA independiente tests medios/PG/restore y amenazas.
HTTP/CLI los toma raíz o Media según disponibilidad, acordando archivos antes de editar. Shared checkout,
no commits ni cambios de dependencias hasta aviso de raíz, sin pushes/deploy. No tocar Auth issuer.

## Riesgos, rollback y señales

OFF niega nuevas operaciones de medios sin tocar OIDC/OTP ni lectura textual V1/V2. Parar worker/claims
no borra originales ni jobs/audit; resultado tardío queda fenced. Down sólo clon desechable. Revert de
código debe conservar reader para cualquier snapshot V3 ya publicado; no revertir a build que lo desconozca.
Medir bytes/píxeles/CPU/tiempo/retries/queue-age/egress y estados; jamás dump de objetos, emails o transfer URLs.

## Handoff y release

Backend local listo no significa release. Raíz coordina aceptación de límites, permisos cloud, IAM/storage,
registro de costes y canary de medios tras terminar el de identidad. UI comprueba mismaimagen/crop/legibilidad,
mobile/teclado y viewer/preview; versión de renderer fija, sin badges sintéticos para material declarado real.
