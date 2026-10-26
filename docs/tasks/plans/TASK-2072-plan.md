# TASK-2072 — Plan backend cloud

Continuidad backend autorizada2026-10-26; diseño Claude Design. Plan aprobado para código y pruebas;
provision/rollout conservan gates. Base7ca5fd3. Autorización humana posterior2026-10-26 para publicar
backend en main: PR2, commit a87852e. El release excluye doce paths visuales2071 y mantiene flagsOFF;
recursos/migracionescloud/worker/canary siguen pendientes.

Extensión autorizada posterior: cerrar únicamente infraestructura/migraciones/worker y detenerse antes
de Auth/correo/UI. Dos subagentes: bucket+SA/IAM y build+Job; root DB/secret/configuración/handoff.
Resultado: bucket/IAM/CORS,7migraciones25tablas,rolsecretworker,imagen+Job yunaejecuciónvacíaPASS.
Sin scheduler, sin flags appON, sin redeploy web. Configuración GCS preparada para próximo deploy.
Canary real de identidad+medios y disparo automático del Job conservan bloque posterior.

1. Root registra task/ADR y ejecuta hook --subagents; load-bearing interfaces acordadas.
2. Agentmedia_cloud_backend: MediaStorage local/GCS, subida directa efímera, verify complete fueraSQL,
   generation física y entrega verificada por SHA antesHEAD/304. Owner server/media salvoprocessor.
3. Agentmedia_worker_release: manifest/lock mínimo, esbuild, Docker/decoder/smoke aislado; processor propio.
4. Agentmedia_backend_qa: cluster efímero y restore SQL+storage, two-tenantHTTP/CLI, corrupción/revoke/down-up.
5. Root: migración generation aditiva, perfil worker metadata+pool/rol/secretref dedicados, DTO/route getTransfer/CLI,
   integración de paquetes y guía API para Claude Design. Ninguna edición JSX/layout/motion.
6. Consolidar pruebas SDK/PG/HTTP, artifacts workerprod sin devdependencies, verify runtime, tasklint y skill mirrors.
7. Preparar recursos/costes/IAM/env y canary sólo cuando config/consumer/readbacks estén resueltos;
   conservar flagsOFF hasta entonces, no afirmar cloud completo por una prueba local.

Recuperación2070 es prerequisito de confianza; sus recursos no se destruyen al construir el adapter.
Código e informes por paths exactos; preservar WIP comercial Greenhouse. No stashes/reset/force.
