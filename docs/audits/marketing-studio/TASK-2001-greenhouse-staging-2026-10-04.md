# TASK-2001 — Greenhouse en develop/staging, 2026-10-04

## Alcance autorizado

El operador autorizó «Pasemos a develop primero». Push de Greenhouse solamente;
no promoción a main, push de Studio/gateway, activación owned, migraciones remotas ni envíos.
El lote inicial contenía 33 commits locales ya commiteados (Studio, CLI, documentación y
adapter opt-in AXIS). Los cambios sin commit se preservaron.

## Git y Vercel

- Código: `20f57c4cdc92f4ca88c84b859b2192f17caa86eb`, enviado a develop.
- Corrección documental: `f08029b0f1e13457bcf271b506e5cd3ed3b6f1b9`, enviada a develop.
- Vercel Staging READY: `dpl_7Ms4ikwChYfdXerim1jwSBux22hs`, SHA f08029b0f.
- Deployment: https://greenhouse-5r38gnpl7-efeonce-7670142f.vercel.app
- Alias confirmado: https://dev-greenhouse.efeoncepro.com y alias canónico staging.
- Deployment inicial de código también READY: `dpl_C5qGAuseaPbYEF9XzGKmS1JLhvxU`.
- main remoto leído: `7182af769e71bc1ad978aa8a3459337f77c20ce6`; no se promovió.

## Verificación

- Pre-push completo PASS: lint sin errores (26 warnings ajenos), TypeScript, mirrors,
  manifests MCP, reachability y gate de blobs. Focales 26/26; CLI 18/18; gates workers PASS.
- CI de código: PASS, run [37244791203](https://github.com/efeoncepro/greenhouse-eo/actions/runs/37244791203), completado 2026-10-05 00:05 UTC (04/10 en Santiago).
- Task Contract: 37244791211 PASS. Playwright E2E smoke: 37244791168 PASS.
- Los primeros gates documentales fallaron por exceder presupuestos: CLAUDE 10 tokens,
  project_context 42, Handoff 14. f08029b0f compactó sólo resúmenes de Studio y retuvo
  el detalle en su canon. Contexto sobre el index exacto: 0 errores/0 warnings; auditoría
  de pérdida de contenido: 0 huérfanos. Reruns 37245055824 y 37245055893 PASS.
- Canary en deployment exacto y dominio staging: `/api/auth/health` 200/ready,
  `/api/auth/session` 200 `{}`, puerto email con scope y sin credencial 401/missing_token.
  Scope faltante devuelve 400/missing_external_scope_type. No acredita lectura M2M autenticada.
- Config Vercel leída sin exponer valores: no existen variables con prefijo
  `GREENHOUSE_STUDIO_EMAIL_EVIDENCE`; el puerto conserva default OFF.

## Efectos automáticos de develop

Los workflows de develop alcanzan recursos compartidos de Cloud Run; no se debe afirmar
«producción no cambió» sólo porque main no se promovió. Los cinco terminaron success y
verificaron readiness por su workflow:

| Servicio/job | Run | Evidencia |
| --- | --- | --- |
| ops-worker | 37244791187 | ops-worker-00766-w7h, GIT_SHA 20f57c4cd, Ready=True |
| commercial-cost-worker | 37244791132 | commercial-cost-worker-00682-jg2, GIT_SHA 20f57c4cd, Ready=True |
| ico-batch-worker | 37244791218 | ico-batch-worker-00493-qnr, GIT_SHA 20f57c4cd, Ready=True |
| auth-server | 37244791210 | Ready=True, commit registrado 20f57c4cd |
| artifact-worker | 37244791158 | Ready=True, label git-sha 20f57c4cd |

## Límite y siguiente paso

Este pase publica el código de Greenhouse en staging. No completa el rollout owned de Studio.
Faltan consumer/binding y configuración M2M de staging para certificar el canary autenticado;
posteriormente el rollout coordinado productivo requiere aprobación. Studio y gateway no
se empujaron en este pase. Marketing Cloud sigue preparado y sin conexión.

Evidencia de cierre registrada en local. El último push de este pase es f08029b0f;
el commit concurrente posterior de documentación TASK-2002/2004 no se incluyó en otro push.
