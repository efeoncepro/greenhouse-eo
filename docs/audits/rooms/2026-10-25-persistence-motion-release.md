# Rooms — persistencia, motion y primer release · 2026-10-25

## Alcance y autoridad

Goal explícito de continuar EPIC-052, con subagentes. El operador pidió View Transitions, botones/badges oficiales de La órbita y después autorizó repo GitHub y Vercel; integrar Efeonce ID sólo si estaba preparado. TASK-2059 conserva UI/aceptación visual; TASK-2060 cierra exclusivamente persistencia local; TASK-2061 posee el release de demo sintética. No se declara terminado EPIC-052 ni aceptado el diseño por el operador.

## Runtime y verificación local

Repo privado: https://github.com/efeoncepro/efeonce-rooms, branch main. Commits `e9383503783664a65a954e4ed29323e3d0e3c1a2` (persistencia/transports/AXIS/motion) y `0453852fb371030bccc273abb93f6224697eec53` (contraste y readiness). Push y SHA remoto comprobados. Staging acotado; ningún `.local`, `.auth`, `.vercel`, `.npmrc` ni `.env` sensible tracked. El tracing Next excluye datos locales; inspección de manifests `.nft.json`: cero rutas locales/credenciales incluidas.

- `pnpm test`: 40 PASS, cero skips: 26 dominio (incluye nueve con PostgreSQL), 12 transporte unitario, un HTTP/PG y un CLI/HTTP. Prueba autoridad persistida, tenant/grant/expiración, replay/revocación, conflicto, rollback atómico y payloads de audiencia.
- Lint, tres negativos reales y typecheck/build de producción PASS. No ignorar errores ni bypass de peers.
- PostgreSQL 18.6 local independiente en 55432: migración down/up, comandos, lectura, restart y dump/restore a DB desechable. Recovery compara hashes/conteos: 25 salas, 18 drafts, 11 ediciones, 64 receipts/audit/outbox al momento de la prueba. Dump y DB de ensayo retirados; no se transfieren a Vercel.
- E2E inicial de este corte: 41 PASS + tres duplicados API omitidos en proyectos de viewport;16 escenarios motion/authority repetidos tras mejorar readiness;8 escenarios de contraste tras corrección y24 de motion/burst/foco tras último ajuste. GVC final4tamaños/68frames, cero findings/runtimeerrors. Evidencia en el dossier visual de TASK-2059; no se suma todo como una sola suite.

## UI y correcciones verificables

ViewTransition estable React19.3.1/Next16.4.3, sin flags experimentales: capítulos y paginación de piezas comparten transición sólo dentro de la misma sala/autoridad. Probe en navegador observa cinco calls/ready y cinco animaciones reales `::view-transition` desktop; reduced motion o API ausente producen cero snapshots. Cambio de persona usa navegación de documento y no conserva snapshots internos. Dialog conserva foco/Escape; entrada progresiva por desplazamiento con texto opaco.

Button, Badge y CountBadge publicados por AXIS0.7.15; tokens0.6.10, marca0.4.30. Logo oficial sin redibujar, ratio intrínseco corregido. GVC detectó un selector `.detail-caption span` que recoloreaba el label interno del botón y un fade que reducía contraste durante apertura: se acotó a `.detail-source > span` y se dejó opaco el texto del diálogo. No se alteraron los tokens de marca para ocultar el defecto.

## Identidad: condición aún no satisfecha

Readback público del issuer `https://auth.efeonce.org/.well-known/openid-configuration`: HTTP200, scopes `efeonce.mcp.read`, `efeonce.mcp.globe.read`, `efeonce.mcp.hiring.read`; no scope `openid` para relying party Rooms. Source y TASK-1834 no acreditan emisión first-party/id_token ni registro Rooms. TASK-1898 conserva la misma dependencia para Studio. Metadata de algoritmo no prueba emisión. `resolvePrincipal` sigue fail-closed; no se aceptan tokens MCP ni persona demo como sesión Rooms.

## Release Vercel

Proyecto `prj_9iaZv8FXdhvtC68r30OS3H4o3iJo`, team `efeonce-7670142f` (`team_gmNiF4YCHmc1wqsHUTCvqjmN`). CLI autenticada confirmó cuenta/team; el conector MCP no tenía permiso suficiente, por lo que se usó CLI con la misma cuenta de equipo. Framework nextjs, Node gestionado24.x, install `pnpm install --frozen-lockfile`, build `pnpm build`, región de Functions gru1. Región de build observada iad1.

NPM_RC sensitive configurado desde el secret oficial `axis-packages-read-token` por entorno, nunca desde una credencial personal. Temporal0600 eliminado, valores no incluidos en evidencia. Preview instaló410 paquetes, lockfile/supply-chain PASS, pnpm12.15.0, Next16.4.3, brand sync4copias exactas, build22s Ready. Ninguna DB cloud ni migración activada.

Primer intento `dpl_FiKq8Eo5BiESbW9FVbkU9CrXcZZd`: Vercel convirtió el primer deploy sin target explícito a production; falló401 registry porque el secreto estaba sólo en preview. Se retiró, sin publicar app funcional. Segundo intento con target explícito preview `dpl_FvEsVJKHburHS3XsBx78xnisbQCS`, URL `https://efeonce-rooms-h7qv1ya4j-efeonce-7670142f.vercel.app`: Ready. API real comprobada401, private/no-store, VaryCookie/Authorization y correlación; ruta sirve desde gru1. Preview conserva protección Vercel.

Primer candidato corregido: producción preparada con `--prod --skip-domain`, después del fix de contraste y secreto de build configurado en production. Sólo se promueve tras readback y smoke del mismo deployment. IDs/URL/evidencia final se registran debajo cuando termine.

## Retirada y rollback

Primer release no tiene deployment productivo anterior aceptado. Se verificó CLI `vercel remove <deploymentId> --yes --scope efeonce-7670142f` contra el intento fallido propio: retiro exitoso y posterior inspect no lo encuentra. En caso de fallo del primer release, retirar exclusivamente el ID publicado, verificar la URL ya no sirve la demo y conservar repo/proyecto; no usar nombre del proyecto como argumento porque eliminaría todos sus deployments. En releases posteriores preferir `vercel rollback <deployment-validado>`; la promoción reanuda asignación automática. No hay datos de negocio cloud que revertir.

## Pendiente del programa

Identidad real (TASK-1834 y adopción Rooms), DB/medios privados cloud, editor UI conectado, upload/derivados multimedia, sesión de presentación, colaboración/evaluación, métricas, MCP y piloto autorizado. La API/CLI durable ya existe pero exige identidad real antes de uso externo. UI visible actual consume sólo fixtures públicas sintéticas.

## Delta de validación antes de promover

La prueba de interacción rápida detectó foco fuera del diálogo al deshabilitar «Anterior» en la primera pieza. Se corrigió en el consumidor: offsets por estado vigente y recuperación de foco sólo si el control originario queda deshabilitado, hacia otro control habilitado del mismo visor. No se roba foco cuando la persona lo movió. Regresión persistente añadida; build/lint/typecheck PASS y24 pruebas enfocadas PASS (normal/reduced/noAPI, cuatro tamaños, ambos extremos de galería, Escape, foco en control habilitado y cero unhandled rejections). Commit `bd4b802` registra la corrección.

GitHub quedó conectado al proyecto (org efeoncepro, repo efeonce-rooms, rama production main). `autoAssignCustomDomains=false` leído tras PATCH para que el próximo push no sustituya la URL pública durante QA. Se promueve explícitamente el deployment del SHA validado.

## Gates documentales

Task lint2059/2060/2061 y epic lint052: cero errores/cero warnings. `pnpm ops:lint --changed`: cero errores;14 warnings de child-parity en épicas ajenas preexistentes, no modificadas. Closure del conjunto Rooms: cero warnings; context/handoff/changelog strict: cero errores/cero warnings. `git diff --check` PASS. Sólo se versionan paths propios del corte; Greenhouse no se empuja por la autorización de publicar el repo Rooms.

## Promoción efectiva

Candidato definitivo generado por integración GitHub: SHA `bd4b802acbbe1db1b0089c9dc0d558c67c41d111`, deployment `dpl_8vJ75Cbn1q75JNe7FEa7LkUccigc`, URL `https://efeonce-rooms-7rmb7rftw-efeonce-7670142f.vercel.app`, Ready/production/Node24.x/Functionsgru1 confirmados. QA remoto candidato PASS desktop/móvil: fuentes/hero, hoverAXIS/axe, capítulos, galería, burst, foco/Escape, ViewTransitions reales/reduced/noAPI, tres personas, cliente denegado y cero JS/console/unhandled. HTTP7checks PASS, incluidos GET/POST reales401 con spoof. Evidencia `docs/ui/reviews/TASK-2059-rooms-first-experience/motion-axis/cloud-candidate/summary.json`.

Promoción por ID exacto exit0, sin rebuild. API de alias confirma `efeonce-rooms.vercel.app` apunta al mismo deployment; target production Ready y SHA coincidente. URL pública https://efeonce-rooms.vercel.app/demo devuelve200 sin bypass ni redirect. `autoAssignCustomDomains` continúa false tras promover: nuevos pushes construyen candidatos, la asignación requiere promoción. Consulta de logs remotos nivel error del candidato no devuelve resultados.

Postpromoción pública sin bypass PASS: HTTP5checks (tres personas, cliente workspace403 y API real401spoof con código unauthenticated); browser desktop/móvil200 sin redirect, hero/logo cargados, pieza íntegra, Escape retorna foco y cero console/pageerrors. `motion-axis/cloud-production/summary.json` y capturas. API alias independiente confirma mismo ID/SHA.
