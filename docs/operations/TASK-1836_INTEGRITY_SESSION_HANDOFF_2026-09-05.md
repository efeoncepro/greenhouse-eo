# TASK-1836 — traspaso y revisión independiente

Fecha: 2026-09-05. Estado: **implementación incompleta; piloto interno detenido**.
El operador pidió una nueva task de Codex con revisión inicial independiente. Continúa la misma
[TASK-1836](../tasks/in-progress/TASK-1836-efeonce-id-internal-workforce-mcp-authorization.md), sin crear otro ID funcional.
La sesión anterior y sus tres subagentes quedan sin editar. Claude confirmó que no modifica el módulo.

## Autorización y método

El operador aprobó el objetivo, ejecución, subagentes, correcciones robustas documentadas y rollout.
No volver a pedir esas autorizaciones. Trabajar en el checkout compartido
`/Users/jreye/Documents/greenhouse-eo`, develop; prohibidos worktrees, clones y cambio de rama.
Gateway relacionado: `/Users/jreye/Documents/efeonce-mcp`; revisar su estado antes de editar.
Primero leer AGENTS, project_context, Handoff, task, ADR, skills MCP/arquitectura/QA y canon de base.
Ejecutar el task hook antes de implementar. Revisar independientemente el WIP: este documento transmite
evidencia histórica, no reemplaza código, schema ni runtime actuales.

## Fallos reconocidos y tres correcciones pendientes

El escritor interno original omitió audit/outbox externos canónicos, contrario a la invariante vigente.
La revisión previa no detectó esa integración incompleta. La migración también se creó manualmente.
No hay evidencia que permita atribuir estos errores a exceso de contexto: hubo fallos de lectura y
verificación. Cambiar de sesión reduce arrastre, pero no sustituye controles.

1. El resolver externo excluye población interna y registra `unbound`. La separación de autorización
   es correcta, la clasificación operativa no: contamina `unbound_dispatch_attempt`. Diseñar un outcome
   explícito, por ejemplo `internal_population`, conservando denegación. Revisar tipos, CHECK de
   `external_access_resolution_log`, reader, auditoría, señales y tests con el mismo sujeto real de fixture.
   **Consumidor obligatorio:** el enum cerrado de `src/auth/binding-resolver.ts` en el gateway debe aceptar
   el outcome; de otro modo interpreta la respuesta como malformada. No introducir fallback de autoridad.
2. Agregar detector permanente `identity.external_binding.mixed_population` con steady 0 y pruebas
   conductuales SQL. La comprobación única de la migración no basta. Evaluar binding interno con
   invitaciones/grants externos, enrollment sobre binding externo y coherencia de links; definir primero
   los predicados en ADR. No comparar simplemente dos resolvers cuyas poblaciones son distintas.
3. `migrations/20260905201500000_task-1836-authority-populations.sql` se creó manualmente y **no se aplicó**.
   Regenerar usando `pnpm migrate:create`, preservar SQL y verificar equivalencia antes de retirar el
   archivo no aplicado; actualizar referencias y tests. No renombrar el timestamp a mano.
   Regla: `GREENHOUSE_DATABASE_TOOLING_V1.md` § reglas de migraciones y CLAUDE.md (buscar `migrate:create`).
   Documentar también en TASK-1836 por qué Down es forward-only.

## WIP que debe auditarse

Decisión A: `external-access/authority-transactions.ts` concentra primitives transaccionales compartidas;
el command interno compone audit canónico, outbox y grants_version en su transacción. Binding tiene
population external/internal, persistida e inmutable. No fingir invitations ni convertir organización propia
en active_client. Enrollment/workforce internos y membership linked externa tienen políticas explícitas.
ADR: `EFEONCE_INTERNAL_NATIVE_AUTHORITY_DECISION_V1.md`, delta de integridad.

Nuevos helpers y tests en external-access; commands/store/types/resolver modificados; reconcile.ts y CLI
`scripts/identity/reconcile-internal-authority.ts`; script package `identity:internal-access:reconcile`.
Reconciliación propuesta con timestamps actuales, reason y referencias a audit original; idempotente,
sin inventar historia ni renovar autoridad. Añade eventos y audit canónicos. No ejecutada.
Señal `unaudited_write` implementada con metadata estricta y pruebas; baseline PG anterior: 2.
Documentos WIP: ADR, invariantes, regla Claude, catálogo eventos, reliability, runbook, flag/timing ledgers,
TASK-1836, Handoff y changelog. La explicación actual de resolución por población debe corregirse para
incluir el problema de clasificación: no basta declarar esperada la diferencia de resultados.

HEAD leído al traspaso: `c58d155835bc2014e6ef4683b5051b370b1e7bc4` (documentación TASK-1831, otra sesión),
precedido por `1c75e89f1`. La reparación de integridad permanece sin commit ni push.
Preservar WIP ajeno: skills Berel en ambos espejos, project_context y hunk Berel del changelog.
No usar git add global. Revisar status/diffs y staging por rutas/hunks propios.

## Últimas observaciones runtime de la sesión anterior — revalidar

- PR 223 released: main `a68662508b1d928bbb1b6d048215a970ff008d21`, run `33982717767`,
  manifest `a68662508b1d-750f5ab8-31c7-418d-a33c-9ea5b6871c1b`, sin override, watchdog 5/5.
  Vercel Production `dpl_J8KpRZzN8AMG6PYBJuzeUjPXpSbn` READY. Smoke de esa ejecución era staging,
  no evidencia del nuevo production. Publicó OIDC/CSRF, no esta reparación de integridad.
- Emisor `auth-server-00013-jhz`, SHA 1c75, internal auth **false** en servicio y GitHub. Mantener OFF
  hasta reparación verificada y secuencia canary autorizada. OAuth/person auth preparados.
- Gateway `00032-qm5`, SHA `dd04f470415b7234cbda77df8c6b380c6d5e811e`; reader/gateway/GC preparados.
- Piloto binding `xob-139e3fe2-f897-4eff-83c6-39c29193d934`, grant
  `xcg-a6de7627-f57f-4686-9d70-ef850b62a526`, org EO-ORG-0007
  (`org-2df565fb-98aa-42f7-b324-ea9a2209017f`), actor `user-efeonce-admin-julio-reyes`.
  Perfil `identity-greenhouse-auth-client-user-user-efeonce-admin-julio-reyes`.
  Grant growth.seo.observation.read vence 2026-09-12T15:00Z; gv2 antes de reparación.
  Audit externo 0, eventos externos 0, tokens emitidos 0 para binding. Audit interno sí existe.
- Login humano anterior completó Microsoft/MFA y falló callback upstream_rejected sin emitir token.
  PR223 corrigió scopes y validación de reloj y añadió diagnóstico; no se probó la causa exacta del fallo.
  Ningún canary humano MCP exitoso aún. No usar la pestaña localhost19035 como evidencia.
- No se aplicó migración, reconciliación ni nuevo grant durante esta corrección.

## Evidencia y límites de validación

- Unidad integrada: 146 passed / 17 archivos; `/tmp/task1836-integrity-unit.log`.
- Unidad focal primitives/commands/reconcile: 48 passed; ESLint propios y diff-check pasaron.
- Typecheck global pasó: `/tmp/task1836-integrity-types-final.log`.
- Signals: 9 unit + 1 live passed; baseline real unaudited_write=2 (no reparación).
- Migración: 13 live passed con SQL real remapeado a pg_temp y rollback, **antes** de añadir
  SET LOCAL search_path y guard final de postcondiciones. El SQL actual no está validado por ese resultado.
- Commands live 1/1 pasó; extensión posterior de comparación entre resolvers **no corrió** porque
  proxy15432 no escuchaba. Revisar su expectativa unbound al agregar nuevo outcome.
- Worker build/deps, qa:gates, task lint y docs closure pasaron antes de últimas ediciones; repetir
  los afectados. Context strict final pendiente. No asumir evidencia verde del WIP final.
- Live sólo `pnpm test:live`, serializados, sin source de .env.local. Status de conexión usa proxy
  temporal y puede apagarlo al salir: coordinar lifecycle canónico, no correr status concurrente con live.
- `pnpm pg:connect:status` anterior fue dry-run: su texto Migrations complete no significa aplicado.

## Secuencia de continuidad

1. Revisión independiente de contratos y diff completo; matriz regla → implementación → prueba.
2. Resolver las tres observaciones y consumidor gateway; revisar límites de población, revocación,
   concurrencia, inmutabilidad, idempotencia, audit/outbox y política de reparación.
3. Pruebas focales y SQL live final, smoke externo, lint/typecheck/gates proporcionales.
4. Preparar y ejecutar migración/reconciliación con runner canónico y autorización existente, readback
   audit/outbox/gv y señales steady0; nunca activar emisor sólo porque tests pasaron.
5. Commit enfocado, push/release con skill y control plane, verificación runtime. No promover WIP ajeno.
6. Canary humano real: login, consentimiento, MCP permitido, organización ajena denegada, refresh,
   revocación y rechazo posterior. Documentar evidencia donde se lee en la task y cerrar sólo al cumplir.

Helpers temporales existentes para inspeccionar antes de usar: `/tmp/task1836-pilot-readback.ts`,
`/tmp/task1836-unaudited-readback.ts`, `/tmp/task1836-release-readback.ts`,
`/tmp/task1836-native-canary.mjs`, `/tmp/task1836-pilot.ts`, `/tmp/task1836-callback-audit.ts`.
No imprimir secretos, tokens, claims, URLs OAuth ni cookies. Su existencia no garantiza vigencia.
